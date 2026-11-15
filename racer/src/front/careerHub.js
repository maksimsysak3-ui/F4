import { TEAMS } from './teams.js';
import { DRIVERS } from '../game/grid.js';
import { ROLES } from '../game/staff.js';
import { rankings } from '../game/rd.js';
import { tables, seasonStats, openOffseason, signDriver, startNextSeason, driverRating, willing, FOCUS_INFO, START_YEAR, ME } from '../game/career.js';

/*
 * The Career tab of the season hub.
 *
 * During a season:   Career (the manager's record, reputation, contract, this season's objective),
 *                    Seasons (every season so far), Champions (the roll of honour).
 * When it's over:    the winter, one step after another: Season review (the champions, the final
 *                    tables, the season in numbers, the board's target), The board (the verdict, the
 *                    contract, offers from other teams), Driver market (the silly season, the free
 *                    agents, signing the team-mate), Staff (expiring contracts: renew or release),
 *                    Rules & car (the new regulations, the winter's development focus) and the start
 *                    of the next season.
 */
const CSS = `
#front .cr{display:grid;gap:14px;max-width:1400px;--line:#ffffff1c;--panel:linear-gradient(180deg,#ffffff0d,#ffffff05)}
#front .cr .row{display:grid;gap:14px}#front .cr .c2{grid-template-columns:1fr 1fr}#front .cr .c3{grid-template-columns:1fr 1fr 1fr}#front .cr .c21{grid-template-columns:2fr 1fr}
#front .cr .cc{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px 18px;min-width:0;box-shadow:0 10px 30px #0004;overflow:hidden}
#front .cr h3{margin:0 0 12px;font:700 12.5px var(--cond);letter-spacing:.18em;text-transform:uppercase;color:#ffffffa8;display:flex;justify-content:space-between;gap:10px}
#front .cr h3 em{font-style:normal;color:#fff;letter-spacing:.04em}
#front .cr .muted{color:#ffffff99;font-size:13.5px;line-height:1.5}
#front .cr .hero{display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center;padding:22px 24px;background:linear-gradient(110deg,color-mix(in srgb,var(--a) 60%,#000) 0%,#0006 75%);border:1px solid var(--line);border-radius:12px}
#front .cr .hero small{font:700 12px var(--cond);letter-spacing:.2em;text-transform:uppercase;color:#ffffffc0}
#front .cr .hero b{display:block;font:900 clamp(28px,3vw,44px)/1 var(--cond);text-transform:uppercase;margin:6px 0}
#front .cr .hero span{color:#ffffffd0;font-size:15px}
#front .cr .trophy{font:900 64px/1 var(--cond);color:#ffd21f;text-shadow:0 6px 24px #0009}
#front .cr .stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}
#front .cr .stats div{background:#0006;border:1px solid var(--line);border-radius:8px;padding:9px 11px}
#front .cr .stats small{display:block;font:700 10.5px var(--cond);letter-spacing:.14em;color:#ffffff90;text-transform:uppercase}
#front .cr .stats b{display:block;font:800 26px var(--cond);line-height:1.1}
#front .cr .rep{height:10px;border-radius:5px;background:#ffffff14;position:relative;margin:8px 0 4px}#front .cr .rep u{position:absolute;inset:0 auto 0 0;border-radius:5px;background:linear-gradient(90deg,#ff5a4a,#ffd21f 50%,#2fd673)}
#front .cr table{width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums}
#front .cr th{font:700 11px var(--cond);letter-spacing:.14em;text-transform:uppercase;color:#ffffff90;text-align:left;padding:6px 8px;border-bottom:1px solid #ffffff22}
#front .cr td{padding:7px 8px;border-bottom:1px solid #ffffff10}
#front .cr tr.me td{background:color-mix(in srgb,var(--a) 22%,transparent)}
#front .cr .crsw{display:inline-block;width:4px;height:14px;margin-right:8px;vertical-align:-2px;border-radius:2px}
#front .cr .ok{color:#2fd673;font-weight:800}#front .cr .bad{color:#ff6a5a;font-weight:800}#front .cr .gold{color:#ffd21f;font-weight:800}
#front .cr .steps{display:flex;gap:6px;flex-wrap:wrap}
#front .cr .steps button{background:#ffffff10;border:1px solid var(--line);color:#fff;border-radius:18px;padding:6px 14px;font:700 13px var(--cond);letter-spacing:.06em;cursor:pointer}
#front .cr .steps button.on{background:#fff;color:#111}#front .cr .steps button.done{border-color:#2fd67388}#front .cr .steps button:disabled{opacity:.35;cursor:default}
#front .cr .btn{background:#eef0f4;color:#14161c;border:0;border-radius:6px;font:800 13px var(--cond);letter-spacing:.08em;text-transform:uppercase;padding:9px 14px;cursor:pointer}
#front .cr .btn.acc{background:#fff;color:#111;box-shadow:0 0 0 2px var(--a)}#front .cr .btn:disabled{opacity:.4;cursor:default}#front .cr .btn.sm{padding:6px 10px;font-size:12px}
#front .cr .opts{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
#front .cr .opt{background:#0006;border:2px solid var(--line);border-radius:10px;padding:14px;cursor:pointer;text-align:left;color:#fff}
#front .cr .opt.on{border-color:var(--a);background:color-mix(in srgb,var(--a) 18%,#0008)}
#front .cr .opt b{display:block;font:800 19px var(--cond);text-transform:uppercase}#front .cr .opt small{display:block;color:#ffffffa0;margin-top:4px;font-size:13px;line-height:1.4}
#front .cr .feed{display:grid;gap:8px;max-height:420px;overflow:auto}
#front .cr .feed div{background:#0005;border-left:3px solid var(--a);padding:8px 10px;border-radius:4px}#front .cr .feed b{display:block;font:800 15px var(--cond)}#front .cr .feed small{color:#ffffffa8;font-size:12.5px}
#front .cr .seg{display:inline-flex;gap:4px}#front .cr .seg button{background:#ffffff12;border:1px solid var(--line);color:#fff;border-radius:5px;padding:4px 9px;font:700 12px var(--cond);cursor:pointer}#front .cr .seg button.on{background:#fff;color:#111}
@media (max-width:1100px){#front .cr .c2,#front .cr .c3,#front .cr .c21{grid-template-columns:1fr}}
`;
let styled = false;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const team = (id) => TEAMS.find((t) => t.id === id);
const sw = (id) => `<span class="crsw" style="background:${team(id)?.colours[0] ?? '#888'}"></span>`;
const ord = (n) => `${n}${[, 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10] ?? 'th'}`;
const P = (n) => (n ? `P${n}` : '—');
const WINTER = ['Season review', 'The board', 'Driver market', 'Staff', 'Rules & car', 'Next season'];
const SEASON = ['Career', 'Seasons', 'Champions'];

/** ctx: { season, sub, goSub(k), rerender(), save(), done() }. Returns { html, wire, pages }. */
export function careerPage(ctx) {
  if (!styled) { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); styled = true; }
  const s = ctx.season, me = s.manager?.name || 'Player', winter = s.phase === 'review' || s.phase === 'offseason';
  const pages = winter ? WINTER : SEASON;
  const sub = s.phase === 'review' ? 0 : Math.max(0, Math.min(pages.length - 1, ctx.sub ?? 0));   // (the winter opens from the review)
  const W = s.winter, C = s.career ?? { seasons: [], champions: [], rep: 50 };
  const wires = [];
  const nav = winter
    ? `<div class="steps">${WINTER.map((p, k) => `<button data-crsub="${k}" class="${k === sub ? 'on' : ''} ${k < sub ? 'done' : ''}" ${k > 0 && s.phase === 'review' ? 'disabled' : ''}>${k + 1}. ${p.replace('Next season', `Start ${s.year + 1}`)}</button>`).join('')}</div>`
    : `<div class="hub-sub">${SEASON.map((p, k) => `<button data-crsub="${k}" class="${k === sub ? 'on' : ''}">${p}</button>`).join('')}</div>`;
  const next = (label = 'Continue') => `<div style="display:flex;justify-content:flex-end"><button class="btn acc" data-crnext>${label} ›</button></div>`;
  wires.push((h) => h.querySelector('[data-crnext]')?.addEventListener('click', () => { if (s.phase === 'review') { openOffseason(s); ctx.save(); } ctx.goSub(sub + 1); }));
  let body = '';

  // ------------------------------------------------------------------------------ during the season
  const totals = () => {
    const all = [...C.seasons.map((x) => x.player), ...(winter ? [] : [{ ...seasonStats(s, me) }])];
    const sum = (k) => all.reduce((a, x) => a + (x?.[k] ?? 0), 0);
    return { seasons: C.seasons.length, races: sum('races'), wins: sum('wins'), podiums: sum('podiums'), poles: sum('poles'), pts: sum('pts'), dnfs: sum('dnfs'),
      dTitles: C.champions.filter((c) => c.driver === me).length, cTitles: C.seasons.filter((x) => x.constructors === x.team).length };
  };
  if (!winter && sub === 0) {
    const T = totals(), { teams } = tables(s), tpos = teams.findIndex((x) => x.team === s.team) + 1, obj = s.objective;
    const onTrack = obj ? (s.history?.length ? (tpos <= obj.target ? '<span class="ok">On target</span>' : `<span class="bad">${tpos - obj.target} place${tpos - obj.target > 1 ? 's' : ''} short</span>`) : '<span class="muted">The season hasn\'t started</span>') : '';
    body = `<div class="hero"><div><small>${esc(team(s.team)?.full)} · Team manager since ${C.started ?? START_YEAR}</small><b>${esc(me)}</b><span>${s.year} season · ${C.seasons.length ? `${C.seasons.length} season${C.seasons.length > 1 ? 's' : ''} completed` : 'Debut season'} · Contract: ${C.contract?.years ?? 1} season${(C.contract?.years ?? 1) === 1 ? '' : 's'} left</span></div><div class="trophy">${T.dTitles + T.cTitles ? '🏆'.repeat(Math.min(5, T.dTitles + T.cTitles)) : ''}</div></div>
      <div class="row c2"><div class="cc"><h3>This season's objective <em>${s.year}</em></h3><div style="font:800 22px var(--cond)">${esc(obj?.text ?? '—')}</div>
        <div class="muted" style="margin:6px 0 10px">The board expects P${obj?.expected ?? '—'} from the car. Now: P${tpos} in the constructors' · ${onTrack}</div>
        <h3 style="margin-top:14px">Reputation <em>${C.rep}/100</em></h3><div class="rep"><u style="width:${C.rep}%"></u></div>
        <div class="muted">${C.rep >= 75 ? 'One of the most respected managers in the paddock: the top teams are watching.' : C.rep >= 50 ? 'Solid. A good season puts you on the big teams\' lists.' : C.rep >= 30 ? 'Under scrutiny. Meet the board\'s target this year.' : 'On thin ice: another bad season and the board will act.'}</div></div>
        <div class="cc"><h3>Career</h3><div class="stats">${[['Seasons', T.seasons], ['Races', T.races], ['Wins', T.wins], ['Podiums', T.podiums], ['Poles', T.poles], ['Points', T.pts], ['Drivers\' titles', T.dTitles], ['Constructors\'', T.cTitles]].map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div></div></div>`;
  } else if (!winter && sub === 1) {
    body = `<div class="cc"><h3>Every season <em>${C.seasons.length}</em></h3>${C.seasons.length ? `<table><tr><th>Year</th><th>Team</th><th>Drivers'</th><th>Pts</th><th>Wins</th><th>Podiums</th><th>Constructors'</th><th>Objective</th><th>Champion</th></tr>${C.seasons.slice().reverse().map((x) => `<tr><td>${x.year}</td><td>${sw(x.team)}${esc(team(x.team)?.name)}</td><td>${P(x.player?.pos)}</td><td>${x.player?.pts ?? 0}</td><td>${x.player?.wins ?? 0}</td><td>${x.player?.podiums ?? 0}</td><td>${P(x.teamPos)}</td><td>${x.objective?.met ? '<span class="ok">Met</span>' : `<span class="bad">Missed (P${x.objective?.target})</span>`}</td><td>${sw(x.champion.team)}${esc(x.champion.name)}</td></tr>`).join('')}</table>` : '<div class="muted">Your first season is under way. Finish it and it goes into the record.</div>'}</div>`;
  } else if (!winter && sub === 2) {
    body = `<div class="cc"><h3>Roll of champions</h3>${C.champions.length ? `<table><tr><th>Year</th><th>Drivers' champion</th><th>Constructors' champions</th></tr>${C.champions.slice().reverse().map((c) => `<tr class="${c.driver === me || c.constructors === s.team ? 'me' : ''}"><td>${c.year}</td><td>${sw(c.team)}${esc(c.driver)}${c.driver === me ? ' <span class="gold">★</span>' : ''}</td><td>${sw(c.constructors)}${esc(team(c.constructors)?.full)}</td></tr>`).join('')}</table>` : '<div class="muted">No champions crowned yet in your career.</div>'}</div>`;
  }

  // ---------------------------------------------------------------------------------- the winter
  else if (winter && sub === 0) {
    const e = W?.entry ?? C.seasons.at(-1);
    if (!e) body = '<div class="cc muted">No season to review.</div>';
    else {
      const mine = e.player, mate = e.mate, champMe = e.champion.name === me, tc = e.constructors === s.team;
      body = `<div class="hero"><div><small>${e.year} Formula One World Championship</small><b>${esc(e.champion.name)} is world champion</b><span>${esc(team(e.champion.team)?.full)} · ${e.champion.pts} points · Constructors' title: ${esc(team(e.constructors)?.full)}</span></div><div class="trophy">🏆</div></div>
        ${champMe || tc ? `<div class="cc" style="border-color:#ffd21f"><div class="gold" style="font:900 26px var(--cond);text-transform:uppercase">${champMe ? 'You are the world champion!' : ''} ${tc ? `${esc(team(s.team).name)} are constructors' champions!` : ''}</div></div>` : ''}
        <div class="row c3">
          <div class="cc"><h3>Your season <em>${P(mine.pos)} · ${mine.pts} pts</em></h3><div class="stats">${[['Wins', mine.wins], ['Podiums', mine.podiums], ['Poles', mine.poles], ['Best', P(mine.best)], ['Avg finish', mine.avg ? mine.avg.toFixed(1) : '—'], ['DNFs', mine.dnfs]].map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>
            ${mate ? `<div class="muted" style="margin-top:10px">Team-mate ${esc(mate.name)}: ${mate.pts} pts, best ${P(mate.best)}${mate.wins ? `, ${mate.wins} win${mate.wins > 1 ? 's' : ''}` : ''}. ${mine.pts >= mate.pts ? '<span class="ok">You beat your team-mate.</span>' : '<span class="bad">Your team-mate finished ahead.</span>'}</div>` : ''}</div>
          <div class="cc"><h3>The board's target <em>${e.objective.met ? '<span class="ok">Met</span>' : '<span class="bad">Missed</span>'}</em></h3><div style="font:800 20px var(--cond)">${esc(e.objective.text)}</div>
            <div class="muted" style="margin:8px 0">Finished ${ord(e.teamPos)} with ${e.teamPts} points (expected ${ord(e.objective.expected)}).</div>
            <h3 style="margin-top:12px">Reputation <em>${C.rep}/100 <span class="${W?.repDelta >= 0 ? 'ok' : 'bad'}">${W?.repDelta >= 0 ? '+' : ''}${W?.repDelta ?? 0}</span></em></h3><div class="rep"><u style="width:${C.rep}%"></u></div></div>
          <div class="cc"><h3>Prize money</h3><div style="font:900 40px var(--cond)">$${e.prize}M</div><div class="muted">For ${ord(e.teamPos)} in the constructors'. Part of it goes into next year's facilities budget.</div></div></div>
        <div class="row c2"><div class="cc"><h3>Drivers' championship</h3><table>${e.drivers.map((d, k) => `<tr class="${d[0] === me ? 'me' : ''}"><td>${k + 1}</td><td>${sw(d[1])}${esc(d[0])}</td><td>${esc(team(d[1])?.name)}</td><td style="text-align:right">${d[2]}</td></tr>`).join('')}</table></div>
          <div class="cc"><h3>Constructors' championship</h3><table>${e.teams.map((t, k) => `<tr class="${t[0] === s.team ? 'me' : ''}"><td>${k + 1}</td><td>${sw(t[0])}${esc(team(t[0])?.full)}</td><td style="text-align:right">${t[1]}</td></tr>`).join('')}</table></div></div>
        ${next('Into the off-season')}`;
    }
  } else if (winter && sub === 1) {
    const B = W.board, cur = team(s.team);
    const verdict = B.sacked ? `<span class="bad">The board has let you go.</span> Missing the target by that much, with your reputation where it is, cost you the job. You'll have to start again elsewhere.`
      : B.contractLeft > 0 ? `<span class="ok">The board is behind you.</span> Your contract runs for ${B.contractLeft} more season${B.contractLeft > 1 ? 's' : ''}.`
        : B.renewal ? `Your contract is up. <span class="ok">${esc(cur.name)} want you to stay</span>, and other teams have called.` : `Your contract is up and <span class="bad">${esc(cur.name)} won't renew it</span>. Choose your next team.`;
    const opt = (id, years, label) => { const t = team(id), rank = rankings(s.rd ?? { teams: {} }).findIndex((x) => x.t.id === id) + 1; return `<button class="opt ${B.choice === id ? 'on' : ''}" data-crteam="${id}" data-yrs="${years}"><span class="crsw" style="background:${t.colours[0]};width:100%;height:5px;display:block;margin:0 0 10px"></span><b>${esc(t.name)}</b><small>${esc(label)}</small><small>Car: ${rank ? ord(rank) + ' fastest' : '—'} · Last season ${ord((W.entry?.teams ?? []).findIndex((x) => x[0] === id) + 1)} · ${years}-year deal</small></button>`; };
    const choices = [...(!B.sacked && (B.renewal || B.contractLeft > 0) ? [opt(s.team, B.contractLeft > 0 ? B.contractLeft : 2, B.contractLeft > 0 ? 'Stay: your contract continues' : 'Renew with your team')] : []), ...B.offers.filter((o) => o.team !== s.team).map((o) => opt(o.team, o.years, 'An offer'))];
    body = `<div class="cc"><h3>The board meeting <em>${esc(cur.full)}</em></h3><div style="font-size:16px;line-height:1.5">${verdict}</div></div>
      <div class="cc"><h3>Where next</h3><div class="opts">${choices.join('')}</div>${B.choice !== s.team ? '<div class="muted" style="margin-top:10px">A new team means new people: its own staff, its own car, and its first seat for you. Your team-mate is whoever you sign (Driver market).</div>' : ''}</div>${next()}`;
    wires.push((h) => h.querySelectorAll('[data-crteam]').forEach((b) => b.addEventListener('click', () => { B.choice = b.dataset.crteam; B.years = +b.dataset.yrs; ctx.save(); ctx.rerender(); })));
  } else if (winter && sub === 2) {
    const tid = W.board?.choice ?? s.team, t = team(tid), seats = s.roster[tid] ?? [];
    const order = W.entry?.teams?.map((x) => x[0]) ?? [];
    const appealOf = Math.max(20, 100 - (Math.max(1, order.indexOf(tid) + 1) - 1) * 7.5) + ((C.rep ?? 50) - 50) * 0.3;
    const free = (W.free ?? []).map((n) => ({ n, d: s.drivers[n] })).filter((x) => x.d).sort((a, b) => driverRating(b.d) - driverRating(a.d));
    const mate = seats[1] && seats[1] !== ME ? seats[1] : null;   // (seat 1: the team-mate, signed or carried over)
    body = `<div class="row c21"><div class="cc"><h3>Free agents <em>${free.length} drivers</em></h3><table><tr><th>Driver</th><th>Age</th><th>Rating</th><th>Potential</th><th>Salary</th><th></th></tr>${free.map(({ n, d }) => {
      const ok = willing(d, appealOf);
      return `<tr><td>${esc(n)} <small class="muted">${d.flag ?? ''}${d.rookie ? ' · rookie' : ''}</small></td><td>${d.age}</td><td><b>${driverRating(d)}</b></td><td>${d.potential}</td><td>$${d.salary}M</td><td>${ok ? `<button class="btn sm acc" data-crsign="${esc(n)}">Sign</button>` : '<span class="muted">Not interested</span>'}</td></tr>`;
    }).join('')}</table></div>
      <div class="cc"><h3>${esc(t.name)} ${s.year + 1}</h3>${seats.map((n, k) => `<div style="font:800 18px var(--cond);margin-top:${k ? 6 : 0}px">${k + 1}. ${n === ME ? `${esc(me)} <span class="muted">(you)</span>` : n ? esc(n) : '<span class="bad">Empty: sign a driver</span>'}</div>`).join('')}
        ${mate && s.drivers[mate] ? `<div class="muted" style="margin-top:6px">Rating ${driverRating(s.drivers[mate])} · age ${s.drivers[mate].age} · ${s.drivers[mate].years} year${s.drivers[mate].years === 1 ? '' : 's'} left</div>` : ''}
        <div class="muted" style="margin-top:10px">Signing someone new replaces your current team-mate, who becomes a free agent. Leave the seat empty and the best driver willing to join is signed for you.</div>
        <h3 style="margin-top:16px">The silly season</h3><div class="feed">${(C.feed ?? []).filter((x) => x.kind !== 'tech').map((x) => `<div><b>${esc(x.title)}</b><small>${esc(x.standfirst)}</small></div>`).join('') || '<div class="muted">Quiet so far.</div>'}</div></div></div>
      <div class="cc"><h3>The ${s.year + 1} grid so far</h3><table>${TEAMS.map((tm) => `<tr class="${tm.id === tid ? 'me' : ''}"><td>${sw(tm.id)}${esc(tm.name)}</td>${(s.roster[tm.id] ?? []).map((n) => `<td>${n === ME ? `${esc(me)} (you)` : n ? `${esc(n)} <small class="muted">${driverRating(s.drivers[n] ?? {})}</small>` : '<span class="muted">To be announced</span>'}</td>`).join('')}</tr>`).join('')}</table></div>${next()}`;
    wires.push((h) => h.querySelectorAll('[data-crsign]').forEach((b) => b.addEventListener('click', () => { const err = signDriver(s, b.dataset.crsign); if (err) alert(err); ctx.save(); ctx.rerender(); })));
  } else if (winter && sub === 3) {
    const moving = (W.board?.choice ?? s.team) !== s.team;
    const rows = Object.entries(s.staff?.people ?? {}).map(([role, p]) => {
      const st = W.staff?.[role];
      const ctl = moving ? '<span class="muted">Stays with the old team</span>' : st === 'retire' ? '<span class="bad">Retiring</span> · replaced from the market' : st ? `<span class="seg"><button data-crst="${role}" data-v="renew" class="${st === 'renew' ? 'on' : ''}">Renew · $${Math.round(p.salary * 1.08 * 10) / 10}M</button><button data-crst="${role}" data-v="release" class="${st === 'release' ? 'on' : ''}">Release</button></span>` : `<span class="ok">Under contract · ${p.years} yr</span>`;
      return `<tr><td>${esc(ROLES[role]?.name)}</td><td>${esc(p.name)}</td><td>${p.age ?? '—'}</td><td><b>${Math.round(p.rating)}</b> / ${p.potential}</td><td>${ctl}</td></tr>`;
    }).join('');
    body = `<div class="cc"><h3>Staff contracts</h3>${moving ? '<div class="muted" style="margin-bottom:10px">You\'re moving teams: your new team\'s people are waiting for you there.</div>' : ''}<table><tr><th>Role</th><th>Name</th><th>Age</th><th>Rating / potential</th><th>Contract</th></tr>${rows}</table>
      <div class="muted" style="margin-top:10px">Released and retiring staff are replaced by the best available from the market for the role.</div></div>${next()}`;
    wires.push((h) => h.querySelectorAll('[data-crst]').forEach((b) => b.addEventListener('click', () => { W.staff[b.dataset.crst] = b.dataset.v; ctx.save(); ctx.rerender(); })));
  } else if (winter && sub === 4) {
    const R = W.regs;
    body = `<div class="cc" style="${R.major ? 'border-color:#ffd21f' : ''}"><h3>Regulations for ${s.year + 1} <em>${R.major ? '<span class="gold">Major change</span>' : 'Minor change'}</em></h3><div style="font:800 24px var(--cond)">${esc(R.title)}</div><div class="muted" style="margin-top:6px">${esc(R.text)}</div></div>
      <div class="cc"><h3>Winter development focus</h3><div class="muted" style="margin-bottom:10px">Where the factory puts its winter work on the ${s.year + 1} car. Everything else carries over from this year's development${R.major ? ', what little survives the new rules' : ''}.</div>
        <div class="opts">${Object.entries(FOCUS_INFO).map(([k, [name, what]]) => `<button class="opt ${W.focus === k ? 'on' : ''}" data-crfocus="${k}"><b>${name}</b><small>${esc(what)}</small></button>`).join('')}</div></div>${next()}`;
    wires.push((h) => h.querySelectorAll('[data-crfocus]').forEach((b) => b.addEventListener('click', () => { W.focus = b.dataset.crfocus; ctx.save(); ctx.rerender(); })));
  } else if (winter && sub === 5) {
    const tid = W.board?.choice ?? s.team, seats = s.roster[tid] ?? [];
    const mate = seats[1];
    const list = [
      ['Team', `${team(tid).full}${tid !== s.team ? ' (new)' : ''} · ${W.board?.years ?? 2}-year contract`],
      ['Team-mate', mate && mate !== ME ? mate : 'The best driver willing to join'],
      ['Staff', tid !== s.team ? 'Your new team\'s department heads' : `${Object.values(W.staff ?? {}).filter((x) => x === 'renew').length} renewed, ${Object.values(W.staff ?? {}).filter((x) => x !== 'renew').length} replaced`],
      ['Regulations', W.regs.title],
      ['Winter focus', FOCUS_INFO[W.focus][0]],
    ];
    body = `<div class="hero"><div><small>Ready for ${s.year + 1}</small><b>The ${s.year + 1} season</b><span>Winter testing, then the first race. The board will set a new target once the cars have run.</span></div></div>
      <div class="cc"><table>${list.map(([k, v]) => `<tr><td style="width:180px" class="muted">${k}</td><td><b>${esc(v)}</b></td></tr>`).join('')}</table></div>
      <div style="display:flex;justify-content:flex-end"><button class="btn acc" data-crstart>Start the ${s.year + 1} season ›</button></div>`;
    wires.push((h) => h.querySelector('[data-crstart]')?.addEventListener('click', () => { startNextSeason(s); ctx.save(); ctx.done(); }));
  }
  void DRIVERS;
  return {
    html: `<div class="cr">${nav}${body}</div>`, pages: pages.length,
    wire(h) {
      h.querySelectorAll('[data-crsub]').forEach((b) => b.addEventListener('click', () => { if (!b.disabled) ctx.goSub(+b.dataset.crsub); }));
      for (const w of wires) w(h);
    },
  };
}
