import { TEAMS } from '../front/teams.js';
import { DRIVERS } from './grid.js';
import { trackRating, rankings, SLOTS } from './rd.js';

/*
 * The paddock press: a news feed written from what actually happens in the season (the way FC's news
 * centre covers your career), by a handful of (fictional) Formula 1 journalists, each with an outlet and
 * a beat:
 *
 *   race reports     every round: the winner, the podium, your result, the retirements, Safety Cars
 *   previews         the next round: what the circuit rewards and whose car suits it
 *   stewards         penalties that mattered (yours, and the big names')
 *   technical        upgrades: your new parts as they arrive, and rivals' cars taking a step
 *   transfers        the driver market: who's linked where, with how reliable the source is
 *   rumours          the paddock whispers: staff moves, budget worries, contract talks
 *   interviews       team principals after a result (yours and the rivals')
 *   features         the title fight, the season so far
 *
 * newsFeed(season, { gpName }) -> articles, newest first: { id, round, kind, title, standfirst, body
 * [paragraphs], by (journalist), team, track, slot (a part, for technical pieces), reliability (1-5,
 * rumours and transfers), hot }.
 */
export const OUTLETS = { pp: 'Paddock Post', gi: 'Grid Insider', aw: 'Apex Weekly', pw: 'The Pit Wall', ss: 'Slipstream', rd: 'Racecraft Daily' };
export const JOURNALISTS = [
  { id: 'em', name: 'Elena Marsh', outlet: 'pp', beat: 'Chief F1 correspondent' },
  { id: 'tb', name: 'Tom Brecken', outlet: 'gi', beat: 'Transfers and contracts' },
  { id: 'lf', name: 'Luca Ferrante', outlet: 'aw', beat: 'Technical editor' },
  { id: 'ho', name: 'Hannah Okoro', outlet: 'pw', beat: 'Race reporter' },
  { id: 'km', name: 'Kenji Mori', outlet: 'ss', beat: 'Interviews' },
  { id: 'rd', name: 'Rafael Duarte', outlet: 'rd', beat: 'Paddock whispers' },
];
const J = Object.fromEntries(JOURNALISTS.map((j) => [j.id, j]));
const rng = (seed) => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const pick = (R, a) => a[Math.floor(R() * a.length)];
const ord = (n) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
const teamOf = (id) => TEAMS.find((t) => t.id === id);
const surname = (n) => n.split(' ').slice(-1)[0];

export function newsFeed(s, { gpName = (id) => id, calendar = [] } = {}) {
  const out = [], me = s.manager?.name || 'Player', myTeam = teamOf(s.team), history = s.history ?? [];
  const pts = s.points ?? {};
  const driverTeam = (n) => (n === me ? myTeam : TEAMS.find((t) => t.drivers.some((d) => d.name === n)));
  const champ = () => Object.entries(pts).sort((a, b) => b[1] - a[1]);
  const add = (a) => out.push({ id: `${a.round}-${a.kind}-${out.length}`, ...a });

  // ---- The off-season: the first stories before round 1 ----
  const R0 = rng(s.manager?.name?.length * 7919 + (s.team?.length ?? 1) * 104729);
  add({ round: 0, kind: 'feature', by: J.em, team: s.team, title: `${me} takes charge at ${myTeam.name}`, standfirst: `A new team manager arrives at ${myTeam.base} with the 2026 rules turning the grid upside down.`,
    body: [`${myTeam.full} begin the new era with a new face in charge of the race team. ${me} inherits a car built around the 2026 regulations: active aerodynamics, a power unit split half and half between combustion and electrical power, and lighter, narrower cars.`,
      `"The rules are a reset for everyone," ${s.staff?.principal ?? myTeam.principal.name} told us at the launch. "Nobody knows yet who has got it right. The development race starts the moment the lights go out in Melbourne."`,
      `Insiders expect ${rankings(s.rd ?? { teams: {} }).length ? '' : ''}the early order to shuffle quickly as teams bring their first upgrades. Under the cost cap, every dollar spent on the car is a dollar that can't be spent on repairs.`] });
  if (s.rd) {
    const rk = rankings(s.rd);
    add({ round: 0, kind: 'tech', by: J.lf, team: rk[0].t.id, title: `Winter testing: ${rk[0].t.name} the team to beat`, standfirst: `The long runs point to ${rk[0].t.name}, with ${rk[1].t.name} and ${rk[2].t.name} close behind.`,
      body: [`Read the testing times with care, but the race simulations tell their own story. ${rk[0].t.name} looked the most complete package, quick in slow corners and gentle on its tyres.`,
        `${rk[1].t.name} were fastest through the high-speed sections, while ${rk[2].t.name} topped the speed traps. Further back, ${rk[rk.length - 1].t.name} have work to do: their long runs were the slowest of the eleven.`,
        `Where does that leave ${myTeam.name}? Our estimate puts them ${ord(rk.findIndex((r) => r.t.id === s.team) + 1)} on outright pace, with plenty of development still to come.`] });
  }
  for (let k = 0; k < 2; k++) out.push(rumour(R0, 0, k, s, me));

  // ---- Every round raced ----
  history.forEach((h, i) => {
    const round = (h.round ?? i) + 1, gp = gpName(h.track), R = rng(round * 2654435761 + h.track.length * 97);
    const res = h.R ?? [], win = res[0], p2 = res[1], p3 = res[2], mine = res.filter((r) => r[5] === s.team), my = res.find((r) => r[0] === me);
    const dnfs = res.filter((r) => r[3]).map((r) => surname(r[0]));
    const rc = h.rc;
    const scText = rc?.periods?.length ? ` The race was neutralised ${rc.periods.length > 1 ? `${rc.periods.length} times` : 'once'} (${rc.periods.map((p) => `${p.kind === 'SC' ? 'Safety Car' : 'VSC'}, lap ${p.from}`).join('; ')}).` : '';
    const wt = driverTeam(win?.[0]);
    if (win) add({ round, kind: 'report', by: J.ho, team: wt?.id, track: h.track, hot: true,
      title: pick(R, [`${surname(win[0])} wins the ${gp}`, `${surname(win[0])} masters ${gp.replace(' Grand Prix', '')}`, `${wt?.name ?? ''} victory for ${surname(win[0])} in ${gp.replace(' Grand Prix', '')}`]),
      standfirst: `${win[0]} beat ${p2?.[0] ?? '—'} and ${p3?.[0] ?? '—'}${win[2] > 3 ? ` from ${ord(win[2])} on the grid` : ''}.${my ? ` ${me} finished ${my[3] ? 'out of the race' : ord(my[1])}.` : ''}`,
      body: [`${win[0]} took the chequered flag in the ${gp}${win[2] === 1 ? ' from pole position' : `, having started ${ord(win[2])}`}. ${p2 ? `${p2[0]} came home second` : ''}${p3 ? ` with ${p3[0]} completing the podium` : ''}.${scText}`,
        dnfs.length ? `${dnfs.length} car${dnfs.length > 1 ? 's' : ''} failed to finish: ${dnfs.join(', ')}.` : 'Every car made it to the flag.',
        (my ? (my[3] ? `It was a race to forget for ${myTeam.name}: ${me} retired. ` : `For ${myTeam.name}, ${me} ${my[1] <= 3 ? 'stood on the podium in ' + ord(my[1]) : my[1] <= 10 ? 'scored points in ' + ord(my[1]) : 'finished ' + ord(my[1]) + ', outside the points'}${my[2] - my[1] > 2 ? `, a gain of ${my[2] - my[1]} places from the grid` : ''}. `) : '') + (mine.length > 1 ? `The team took ${mine.reduce((a, r) => a + (r[4] ?? 0), 0)} points from the weekend.` : '')] });
    // The stewards' decisions that mattered.
    const decs = (rc?.decisions ?? []).filter((d) => d.code && (mine.some((r) => r[0] === me) || d.pen !== 't5'));
    const myDec = (rc?.decisions ?? []).filter((d) => res.find((r) => r[0] === me) && d.id === `${s.team}-0`);
    if (myDec.length || decs.length > 2) add({ round, kind: 'stewards', by: J.em, team: myDec.length ? s.team : null, track: h.track,
      title: myDec.length ? `Stewards penalise ${me} in ${gp.replace(' Grand Prix', '')}` : `Busy day for the stewards in ${gp.replace(' Grand Prix', '')}`,
      standfirst: `${(rc?.decisions ?? []).length} penalties handed out${myDec.length ? `, including ${myDec.length > 1 ? 'two' : 'one'} for ${me}` : ''}.`,
      body: [(rc?.decisions ?? []).map((d) => `${d.code}: ${d.pen === 't5' ? 'five-second' : d.pen === 't10' ? 'ten-second' : d.pen === 'dt' ? 'drive-through' : 'disqualification'} penalty, ${d.reason.toLowerCase()} (lap ${d.lap}).`).join(' '),
        myDec.length ? `${myTeam.name} accepted the decision${R() < 0.4 ? ' but asked the stewards for clarification' : ''}. "We'll look at the footage and learn from it," said ${s.staff?.principal ?? myTeam.principal.name}.` : 'Race control will brief the drivers again before the next round.'] });
    // The team principal speaks.
    if (my) add({ round, kind: 'interview', by: J.km, team: s.team, track: h.track, person: { principal: true, team: s.team }, title: my[3] ? `${surname(s.staff?.principal ?? myTeam.principal.name)}: "We have to understand what went wrong"` : my[1] <= 3 ? `${surname(s.staff?.principal ?? myTeam.principal.name)} hails ${me}'s podium` : my[1] <= 10 ? `"Points are points": ${myTeam.name} take the positives` : `${myTeam.name} principal demands more after ${gp.replace(' Grand Prix', '')}`,
      standfirst: `${s.staff?.principal ?? myTeam.principal.name} on ${myTeam.name}'s weekend.`,
      body: [my[3] ? `"It's painful. The car had the pace, but we didn't see the flag and that costs us. We'll go through everything with the engineers before the next race."` : my[1] <= 3 ? `"A fantastic result for everyone at ${myTeam.base}. ${me} drove a mature race and the strategy was spot on. We know the others will bring upgrades, so we can't stand still."` : my[1] <= 10 ? `"We scored, which matters over a season. There's more in the car, particularly in the ${pick(R, ['slow corners', 'high-speed sections', 'long runs', 'traction zones'])}, and the factory is pushing hard on the next upgrade."` : `"Not good enough. We have to look at the car and at ourselves. The development programme has to deliver, and quickly."`,
        `Asked about the championship, ${surname(s.staff?.principal ?? myTeam.principal.name)} was ${my[1] <= 3 ? 'cautious' : 'realistic'}: "${my[1] <= 3 ? 'It\'s a long season. One race at a time.' : 'We\'re focused on ourselves. The table will take care of itself if we do our job.'}"`] });
    // Rumours and transfers between rounds.
    const nR = R() < 0.6 ? 2 : 1;
    for (let k = 0; k < nR; k++) out.push(rumour(R, round, k, s, me));
    // The title fight every few rounds.
    if (round % 4 === 0) {
      const c = champ();
      if (c.length > 1) add({ round, kind: 'feature', by: J.em, team: driverTeam(c[0][0])?.id, person: { name: c[0][0], team: driverTeam(c[0][0])?.id }, title: `${surname(c[0][0])} leads by ${c[0][1] - c[1][1]} after ${round} rounds`, standfirst: `The championship at the ${Math.round((round / 24) * 100)}% mark: who's in it, who isn't.`,
        body: [`${c[0][0]} heads the standings on ${c[0][1]} points, ${c[0][1] - c[1][1]} clear of ${c[1][0]}${c[2] ? ` with ${c[2][0]} a further ${c[1][1] - c[2][1]} behind` : ''}.`, `${me} sits ${ord(c.findIndex(([n]) => n === me) + 1)} on ${pts[me] ?? 0} points. With ${24 - round} rounds to go, ${c[0][1] - (pts[me] ?? 0) <= (24 - round) * 25 ? 'the title is mathematically still open.' : 'the title is beyond reach.'}`] });
    }
  });

  // ---- Technical: the player's new specs and rivals' big steps ----
  if (s.rd) {
    for (const sp of (s.rd.specs ?? []).filter((x) => x.n > 0)) {
      add({ round: sp.made, kind: 'tech', by: J.lf, team: s.team, slot: sp.slot, dir: sp.dir, n: sp.n, title: `${myTeam.name} bring ${sp.name}: a new ${SLOTS[sp.slot].name.toLowerCase()}`, standfirst: `${sp.label}: what it's for and what it should be worth.`,
        body: [`${myTeam.name}'s design office has signed off the ${sp.name} ${SLOTS[sp.slot].name.toLowerCase()}, a ${sp.label.toLowerCase()} concept. ${sp.validated ? `Track data has confirmed it: the team says it delivered ${Math.round(sp.factor * 100)}% of what the tunnel predicted.` : 'The team will run it in practice to correlate the track data with the wind tunnel.'}`,
          `Our reading: ${Object.entries(sp.validated ? sp.actual : sp.delta).filter(([, v]) => Math.abs(v) > 0.05).map(([k, v]) => `${v > 0 ? 'more' : 'less'} ${({ lowSpeed: 'low-speed grip', highSpeed: 'high-speed downforce', straight: 'top speed', power: 'power', tyre: 'tyre life', weight: 'weight saving', reliability: 'reliability' })[k]}`).join(', ') || 'a modest refinement'}.`] });
    }
    for (const t of TEAMS) {
      if (t.id === s.team) continue;
      const h = s.rd.teams[t.id]?.history ?? [];
      for (let k = 2; k < h.length; k++) if (h[k].rating - h[k - 1].rating > 0.45) {
        const R = rng(k * 31 + t.id.length * 7);
        const [slot, what] = pick(R, [['floor', 'floor'], ['frontWing', 'front wing'], ['sidepods', 'sidepod package'], ['rearWing', 'rear wing'], ['suspension', 'suspension layout']]);
        add({ round: h[k].round, kind: 'tech', by: J.lf, team: t.id, slot, dir: [R(), R()], n: k, title: `${t.name} take a step with a new ${what}`, standfirst: `A significant upgrade: the data suggests ${(h[k].rating - h[k - 1].rating) * 0.27 > 0.12 ? 'more than a tenth' : 'close to a tenth'} a lap.`,
          body: [`${t.name} arrived with a substantial upgrade package, and the timing screens suggest it worked. Our estimates put their gain at around ${((h[k].rating - h[k - 1].rating) * 0.27).toFixed(2)} seconds a lap at an average circuit.`, `Rivals will be studying the photos closely. "Everyone copies what works," one engineer told us. "The question is how fast you can make it."`] });
      }
    }
  }
  // ---- Upgrades that didn't work: ours (once the track data is in) and the rivals' (the paddock talks) ----
  if (s.rd) {
    const SLOTNAME = (slot) => SLOTS[slot]?.name.toLowerCase() ?? 'upgrade';
    for (const sp of (s.rd.specs ?? []).filter((x) => x.validated && x.factor < 0.15)) {
      const back = sp.factor < 0;
      add({ round: sp.made, kind: 'tech', by: J.lf, team: s.team, slot: sp.slot, dir: sp.dir, n: sp.n, title: back ? `${myTeam.name}'s ${sp.name} ${SLOTNAME(sp.slot)} backfires` : `${myTeam.name}'s new ${SLOTNAME(sp.slot)} finds nothing`,
        standfirst: back ? 'Slower than the part it replaced: back to the drawing board.' : 'The track data shows no gain at all.',
        body: [`The ${sp.name} ${SLOTNAME(sp.slot)}, a ${sp.label.toLowerCase()} concept, ${back ? `turned out slower than the part it replaced once it ran in practice: the team's own data puts it at ${Math.abs(Math.round(sp.factor * 100))}% worse than nothing against the tunnel's prediction.` : 'delivered next to nothing of what the wind tunnel promised.'}`,
          `${sp.reverted ? `${myTeam.name} have gone back to the ${sp.reverted}. ` : ''}"It happens to everyone," a senior engineer said. "The tunnel and the track don't always agree. You learn why, and you go again."`] });
    }
    for (const f of s.rd.flops ?? []) {
      const t = TEAMS.find((x) => x.id === f.team);
      if (!t || t.id === s.team) continue;
      const word = { deadend: 'abandoned', dud: 'shelved', backfire: 'pulled' }[f.kind];
      add({ round: f.round, kind: 'rumour', by: J.rd, team: t.id, reliability: f.kind === 'backfire' ? 4 : 3, title: `${t.name} ${word} their new ${SLOTNAME(f.slot)}`,
        standfirst: f.kind === 'deadend' ? 'A concept that never made it out of the wind tunnel.' : f.kind === 'backfire' ? 'Slower on track than the old part, sources say.' : 'Run in practice, then quietly put back in the truck.',
        body: [f.kind === 'deadend' ? `Paddock sources say ${t.name}'s ${f.label.toLowerCase()} ${SLOTNAME(f.slot)} hit a dead end in the wind tunnel and the project has been stopped before a single part was made.`
          : `${t.name} ran a new ${f.label.toLowerCase()} ${SLOTNAME(f.slot)} in practice and went back to the old one for qualifying. ${f.kind === 'backfire' ? 'The data, we hear, showed it losing time.' : 'It found nothing over the old part.'}`,
        `Reliability: ${'★'.repeat(f.kind === 'backfire' ? 4 : 3)}${'☆'.repeat(f.kind === 'backfire' ? 1 : 2)}.`] });
    }
  }
  // ---- The preview for the next round ----
  const next = calendar[s.round ?? 0];
  if (next && s.rd) {
    const id = next[0], R = rng((s.round + 1) * 7777);
    const rk = TEAMS.map((t) => ({ t, r: trackRating(s.rd, t.id, id) })).sort((a, b) => b.r - a.r), myPos = rk.findIndex((x) => x.t.id === s.team) + 1;
    add({ round: s.round ?? 0, kind: 'preview', by: J.ho, team: rk[0].t.id, track: id, hot: true, title: `${gpName(id)} preview: ${rk[0].t.name} the favourites`, standfirst: `What ${gpName(id).replace(' Grand Prix', '')} asks of a car, and who has it.`,
      body: [`Round ${(s.round ?? 0) + 1} takes the paddock to ${next[2] ?? gpName(id)}. On our numbers ${rk[0].t.name} have the best car for this track, ahead of ${rk[1].t.name} and ${rk[2].t.name}.`, `${myTeam.name} look like the ${ord(myPos)} quickest car here. ${myPos <= 3 ? 'A podium is a realistic target.' : myPos <= 7 ? 'Points should be on the cards, with a good qualifying.' : 'It will take a strong weekend to reach the points.'} ${pick(R, ['Tyre management could be decisive.', 'Track position will be everything.', 'Expect the strategists to be busy.', 'Watch the weather.'])}`] });
  }
  return out.sort((a, b) => b.round - a.round || (b.hot ? 1 : 0) - (a.hot ? 1 : 0));
}

/** A rumour or a transfer story (seeded, so it reads the same every time). */
function rumour(R, round, k, s, me) {
  const pts = s.points ?? {};
  const drivers = TEAMS.flatMap((t) => t.drivers.map((d, i) => ({ n: t.id === s.team && i === 0 ? me : d.name, t, r: DRIVERS[d.name] }))).filter((x) => x.n !== me);
  const top = ['mclaren', 'mercedes', 'redbull', 'ferrari'];
  const kind = R() < 0.55 ? 'transfer' : 'rumour';
  if (kind === 'transfer') {
    // A strong driver in a midfield car linked with a top team; or a struggling one under pressure.
    const mid = drivers.filter((x) => !top.includes(x.t.id)).sort((a, b) => (pts[b.n] ?? 0) + (b.r?.pace ?? 85) * 0.3 - (pts[a.n] ?? 0) - (a.r?.pace ?? 85) * 0.3);
    const d = mid[Math.floor(R() * Math.min(4, mid.length))] ?? drivers[0], to = teamOf(pick(R, top));
    const rel = 1 + Math.floor(R() * 5);
    return { id: `${round}-tr-${k}`, round, kind: 'transfer', by: J.tb, team: to.id, reliability: rel, person: { name: d.n, team: d.t.id },
      title: pick(R, [`${to.name} keeping tabs on ${surname(d.n)}`, `${surname(d.n)} in talks over a 2027 seat at ${to.name}`, `Agent spotted in ${to.name} hospitality as ${surname(d.n)} weighs options`]),
      standfirst: `${d.n} has impressed at ${d.t.name}. ${to.name} have noticed.`,
      body: [`Sources close to ${to.name} say the team has made contact with ${d.n}'s management ahead of the 2027 season. ${d.n} has ${pts[d.n] ?? 0} points this year in a car that isn't expected to fight at the front.`, `${d.t.name} insist the driver is under contract. "We're very happy with ${surname(d.n)} and so is ${surname(d.n)}," a spokesperson said. Our understanding is that a performance clause could change that.`, `Reliability of the story: ${'★'.repeat(rel)}${'☆'.repeat(5 - rel)}.`] };
  }
  const t = teamOf(pick(R, TEAMS.map((x) => x.id)));
  const rel = 1 + Math.floor(R() * 5);
  const pool = [
    [`${t.name} technical shake-up on the cards`, `A senior aerodynamicist is said to be on gardening leave, heading for a rival.`, `Whispers in the paddock suggest ${t.name} are restructuring their technical department after a difficult run. A senior aerodynamicist is understood to be on gardening leave, with a rival team waiting.`],
    [`${t.name} watching the cost cap closely`, `Crash damage has eaten into the budget, and upgrades may have to wait.`, `${t.name} are understood to be monitoring their spending closely after a costly run of repairs. One source suggests a planned upgrade could be delayed by two races to stay under the cap.`],
    [`${t.name} chasing a new title sponsor`, `Talks with a technology giant are said to be at an advanced stage.`, `${t.name} are in advanced talks with a major technology company over title sponsorship from next season, according to several people with knowledge of the negotiations.`],
    [`Is ${t.name}'s next floor a copy?`, `Rivals have raised questions about a familiar-looking design.`, `Photographs of ${t.name}'s latest floor have raised eyebrows along the pit lane. "It looks very familiar," said one rival engineer. Copying a concept is legal; copying drawings is not, and nobody is suggesting the latter.`],
  ];
  const [title, standfirst, body] = pick(R, pool);
  return { id: `${round}-ru-${k}`, round, kind: 'rumour', by: J.rd, team: t.id, reliability: rel, title, standfirst, body: [body, `Reliability: ${'★'.repeat(rel)}${'☆'.repeat(5 - rel)}.`] };
}
