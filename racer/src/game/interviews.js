/**
 * Live interviews: the pit lane before first practice and the pen after the race. Three reporters, a
 * question each, built from what is actually going on (the championship, the last result, new parts on
 * the car, the forecast, today's result, the grid, the team-mate), three answers in different tones.
 * What the player says is kept (season.interviews) and written up in the news (game/news.js).
 */
import { TEAMS } from '../front/teams.js?v=1a016bc';

export const REPORTERS = [
  { id: 'sl', name: 'Sophie Lane', outlet: 'Grid TV', role: 'Pit lane reporter', tv: true, colour: '#e10600' },
  { id: 'mb', name: 'Marco Bellini', outlet: 'Pit Lane Live', role: 'Pit lane reporter', tv: true, colour: '#1f6ad8' },
  { id: 'ak', name: 'Aisha Khan', outlet: 'Radio Paddock', role: 'Broadcast journalist', tv: true, colour: '#00a19b' },
  { id: 'em', name: 'Elena Marsh', outlet: 'Paddock Post', role: 'Chief F1 correspondent', colour: '#c9a24a' },
  { id: 'km', name: 'Kenji Mori', outlet: 'Slipstream', role: 'Interviews', colour: '#8a5cf6' },
  { id: 'ho', name: 'Hannah Okoro', outlet: 'The Pit Wall', role: 'Race reporter', colour: '#ff8000' },
  { id: 'tb', name: 'Tom Brecken', outlet: 'Grid Insider', role: 'Transfers and contracts', colour: '#6a6e78' },
];
export const TONES = { confident: 'Confident', measured: 'Measured', deflect: 'Deflect', fiery: 'Fiery' };

const rng = (seed) => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const ord = (n) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
const surname = (n) => String(n ?? '').split(' ').slice(-1)[0];

/** Done already this round? */
export function interviewDone(s, kind) { return (s.interviews ?? []).some((x) => x.round === (s.round ?? 0) && x.kind === kind); }

/**
 * The questions for an interview. ctx: { gp, me (the player's name), team (team object), champPos,
 * champPts, leaderGap, lastPos, lastDnf, newParts, wetChance, pos, grid, dnf, points, mate, matePos,
 * penalty }.
 */
export function buildInterview(s, kind, ctx) {
  const R = rng(((s.round ?? 0) + 1) * 7919 + (kind === 'post' ? 104729 : 1) + (ctx.pos ?? 0) * 31);
  const pool = kind === 'pre' ? preQuestions(ctx) : postQuestions(ctx);
  // Three of them, the most relevant first (weight), a little shuffled; three different reporters.
  const chosen = pool.map((q) => ({ q, w: q.w + R() * 0.8 })).sort((a, b) => b.w - a.w).slice(0, 3).map((x) => x.q);
  const reps = REPORTERS.slice().sort(() => R() - 0.5);
  const tvFirst = reps.findIndex((r) => r.tv);
  if (tvFirst > 0) reps.unshift(reps.splice(tvFirst, 1)[0]);   // a TV crew opens the pit lane
  return chosen.map((q, k) => ({ ...q, reporter: reps[k] }));
}

function preQuestions(c) {
  const out = [], gp = c.gp, mate = surname(c.mate);
  if (c.champPos === 1) out.push({ w: 3, topic: 'title', text: `You lead the championship coming into the ${gp}. Does that change how you approach the weekend?`,
    answers: [{ tone: 'confident', text: "No. We came here to win, same as every weekend. The lead is a result of that, not a target." },
      { tone: 'measured', text: "It's a long season. We'll take it session by session and keep scoring." },
      { tone: 'deflect', text: "Ask me in Abu Dhabi. Right now I'm thinking about FP1." }] });
  else if (c.champPos && c.leaderGap != null) out.push({ w: 2.5, topic: 'title', text: `You're ${ord(c.champPos)} in the championship, ${c.leaderGap} points off the lead. Is the title still realistic?`,
    answers: [{ tone: 'confident', text: "Absolutely. The points are there to be taken and we're getting stronger." },
      { tone: 'measured', text: "We focus on our own job. If we do that well, the table looks after itself." },
      { tone: 'fiery', text: "Nobody's handing it to them. We'll be there fighting until it's done." }] });
  if (c.lastPos) out.push({ w: c.lastDnf ? 3 : c.lastPos <= 3 ? 2.6 : 1.8, topic: 'last', text: c.lastDnf ? `Last time out ended early for you. What have you learned from it?`
    : c.lastPos <= 3 ? `A podium last time. Can you carry that momentum into the ${gp}?` : `${ord(c.lastPos)} last time out. What's the target this weekend?`,
    answers: c.lastDnf ? [{ tone: 'measured', text: "We went through everything with the team. It's understood and it's fixed." },
      { tone: 'confident', text: "Forgotten already. The pace was there, and it will be again here." },
      { tone: 'fiery', text: "It hurt. I want those points back, and this is a good place to start." }]
      : c.lastPos <= 3 ? [{ tone: 'confident', text: "That's the plan. The car is working and so are we." },
        { tone: 'measured', text: "Every track is different. We start from zero in FP1." },
        { tone: 'deflect', text: "Momentum is something you talk about afterwards. Let's see." }]
        : [{ tone: 'confident', text: "Better than that. We have the pace for more." },
          { tone: 'measured', text: "A clean weekend and good points. Then we'll see where we are." },
          { tone: 'fiery', text: "Last time wasn't good enough. Simple as that." }] });
  if (c.newParts) out.push({ w: 2.8, topic: 'upgrade', text: `The team has brought ${c.newParts > 1 ? 'new parts' : 'a new part'} to the ${gp}. How much are you expecting from ${c.newParts > 1 ? 'them' : 'it'}?`,
    answers: [{ tone: 'confident', text: "The numbers from the factory are strong. I think we'll feel it straight away." },
      { tone: 'measured', text: "We'll correlate it in practice first. The tunnel is one thing, the track is another." },
      { tone: 'deflect', text: "I'll tell you after FP1. Ask the engineers how much it cost." }] });
  if (c.wetChance >= 35) out.push({ w: 2.2, topic: 'weather', text: `There's a real chance of rain this weekend. Good news for you?`,
    answers: [{ tone: 'confident', text: "I love it. Rain gives a driver a chance to make the difference." },
      { tone: 'measured', text: "It mixes things up. We'll be ready for both." },
      { tone: 'deflect', text: "I'm not the weatherman. We'll watch the radar like everyone else." }] });
  if (mate) out.push({ w: 1.6, topic: 'mate', text: `How is the relationship with ${mate}? There's talk of tension inside the team.`,
    answers: [{ tone: 'measured', text: "We push each other, that's healthy. The team comes first." },
      { tone: 'confident', text: "I just want to beat everyone, and that includes the other car." },
      { tone: 'deflect', text: "I don't read what's written. We get on fine." }] });
  out.push({ w: 1.4, topic: 'track', text: `What do you need from the car around here?`,
    answers: [{ tone: 'measured', text: "Good traction out of the slow corners and a stable rear on the brakes. That's where the lap time is." },
      { tone: 'confident', text: "Just give me a car I can lean on. I'll find the rest." },
      { tone: 'deflect', text: "That's between me and my engineer." }] });
  out.push({ w: 1.2, topic: 'rival', text: `Who do you see as the main threat this weekend?`,
    answers: [{ tone: 'measured', text: "The usual teams at the front. It will be tight." },
      { tone: 'fiery', text: "Whoever's in front of me. That's who I'm after." },
      { tone: 'deflect', text: "I only worry about us." }] });
  out.push({ w: 1, topic: 'contract', text: `Any update on your future? Some teams are said to be interested.`,
    answers: [{ tone: 'deflect', text: "I'm focused on this weekend. Next question." },
      { tone: 'measured', text: "I'm happy here. When there's something to say, we'll say it." },
      { tone: 'confident', text: "It's nice to be wanted. Results talk." }] });
  return out;
}

function postQuestions(c) {
  const out = [], mate = surname(c.mate), gained = c.grid && c.pos ? c.grid - c.pos : 0;
  if (c.dnf) out.push({ w: 4, topic: 'dnf', text: `A frustrating end to your race. What happened out there?`,
    answers: [{ tone: 'measured', text: "These things happen in racing. We'll look at it and come back stronger." },
      { tone: 'fiery', text: "It's painful. We had a good race going and we've thrown points away." },
      { tone: 'deflect', text: "I need to speak to the team before I say anything." }] });
  else if (c.pos === 1) out.push({ w: 4, topic: 'win', text: `You've won the ${c.gp}! Talk us through it.`,
    answers: [{ tone: 'confident', text: "What a car today. We controlled it from the front when it mattered." },
      { tone: 'measured', text: "Huge thanks to the team. The stop was perfect and the strategy was spot on." },
      { tone: 'fiery', text: "That's for everyone who doubted us. We're not going anywhere." }] });
  else if (c.pos <= 3) out.push({ w: 3.5, topic: 'podium', text: `${ord(c.pos)} and a podium. Happy with that?`,
    answers: [{ tone: 'measured', text: "Very. Good points, a clean race, the team did a great job." },
      { tone: 'confident', text: "Happy, but I wanted the win. We were close." },
      { tone: 'deflect', text: "A podium is a podium. We'll take it." }] });
  else if (c.points > 0) out.push({ w: 3, topic: 'points', text: `${ord(c.pos)} today and ${c.points} point${c.points > 1 ? 's' : ''}. A fair result?`,
    answers: [{ tone: 'measured', text: "About where we were on pace. Solid points for the team." },
      { tone: 'fiery', text: "Not good enough. We have to find more, quickly." },
      { tone: 'deflect', text: "Points are points. On to the next one." }] });
  else out.push({ w: 3, topic: 'nopoints', text: `${ord(c.pos)} and no points today. What went wrong?`,
    answers: [{ tone: 'measured', text: "We didn't have the pace. We have to understand why." },
      { tone: 'fiery', text: "A lot. I'm not going to hide behind excuses." },
      { tone: 'deflect', text: "We'll go through the data. I don't want to guess." }] });
  if (gained >= 4) out.push({ w: 2.8, topic: 'charge', text: `${gained} places gained from ${ord(c.grid)} on the grid. Where did you make them up?`,
    answers: [{ tone: 'confident', text: "On the brakes, mostly. The car was quick in the traffic and I wasn't waiting." },
      { tone: 'measured', text: "A good start, a good strategy, and staying out of trouble." },
      { tone: 'fiery', text: "Saturday put us in the wrong place. Sunday we fixed it." }] });
  else if (gained <= -4 && !c.dnf) out.push({ w: 2.8, topic: 'slide', text: `You started ${ord(c.grid)} and dropped back. Was it the pace or the strategy?`,
    answers: [{ tone: 'measured', text: "Probably a bit of both. We'll look at the tyres especially." },
      { tone: 'fiery', text: "We were too slow. Simple. That has to change." },
      { tone: 'deflect', text: "Ask me again when I've seen the data." }] });
  if (c.penalty) out.push({ w: 2.6, topic: 'penalty', text: `You picked up a penalty today. Fair call from the stewards?`,
    answers: [{ tone: 'measured', text: "They made their decision. We accept it and move on." },
      { tone: 'fiery', text: "I don't agree with it. Hard racing is racing." },
      { tone: 'deflect', text: "I'll leave that to the stewards." }] });
  if (mate && c.matePos) out.push({ w: 1.8, topic: 'mate', text: c.pos && c.matePos < c.pos ? `${mate} finished ahead of you today. How do you feel about that?` : `You beat ${mate} again today. Is that important to you?`,
    answers: c.pos && c.matePos < c.pos ? [{ tone: 'measured', text: "He did a good job. I'll learn from it." },
      { tone: 'fiery', text: "It won't happen often. Next time it's me in front." },
      { tone: 'deflect', text: "Good for the team. That's what matters." }]
      : [{ tone: 'confident', text: "Of course. Your team-mate is the first one you have to beat." },
        { tone: 'measured', text: "It's about the team's points. He had his own race." },
        { tone: 'deflect', text: "I don't really look at that." }] });
  out.push({ w: 1.5, topic: 'next', text: `What do you take into the next race?`,
    answers: [{ tone: 'confident', text: "Confidence. The car is getting better every week." },
      { tone: 'measured', text: "A lot of data. We'll go home, work and come back stronger." },
      { tone: 'fiery', text: "Motivation. I want more than this." }] });
  out.push({ w: 1.1, topic: 'car', text: `How did the car feel over the race distance?`,
    answers: [{ tone: 'measured', text: "Good balance, the tyres held on well towards the end." },
      { tone: 'fiery', text: "Hard work. We need more grip, there's no hiding it." },
      { tone: 'confident', text: "Like it was on rails. The team gave me a great car." }] });
  return out;
}

/** Keep the answer (and its tone) for the news. */
export function recordAnswer(s, kind, item, answer) {
  (s.interviews ??= []).push({ round: s.round ?? 0, kind, by: item.reporter.id, outlet: item.reporter.outlet, reporter: item.reporter.name, topic: item.topic, q: item.text, a: answer.text, tone: answer.tone });
  if (s.interviews.length > 120) s.interviews.splice(0, s.interviews.length - 120);
}

/** The context for an interview from the season and the weekend. */
export function interviewContext(s, kind, { gpName, playerId, wetChance = 0, newParts = 0 } = {}) {
  const me = s.manager?.name || 'Player', team = TEAMS.find((t) => t.id === s.team), pts = s.points ?? {};
  const champ = Object.entries(pts).sort((a, b) => b[1] - a[1]), k = champ.findIndex(([n]) => n === me);
  const last = (s.history ?? []).at(-1), lr = last?.R ?? [], li = lr.findIndex((r) => r[0] === me);
  const mate = team?.drivers?.[1]?.name ?? null;
  const ctx = { gp: gpName?.(s.weekend?.trackId) ?? 'Grand Prix', me, team, champPos: k >= 0 ? k + 1 : null, champPts: k >= 0 ? champ[k][1] : 0,
    leaderGap: k > 0 ? champ[0][1] - champ[k][1] : null, lastPos: li >= 0 ? li + 1 : null, lastDnf: li >= 0 ? !!lr[li][3] : false, wetChance, newParts, mate };
  if (kind === 'post') {
    const res = s.weekend?.results?.R ?? [], r = res.find((x) => x.id === playerId), mr = res.find((x) => x.id === `${s.team}-1`);
    Object.assign(ctx, { pos: r?.pos ?? null, dnf: !!r?.retired, points: r?.points ?? 0, grid: r?.grid ?? null, matePos: mr?.pos ?? null, penalty: (r?.pens?.length ?? 0) > 0 || (r?.penTime ?? 0) > 0 });
  }
  return ctx;
}
