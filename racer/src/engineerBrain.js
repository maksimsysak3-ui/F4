/*
 * The built-in race engineer: understands what the driver asks (in their own words, with follow-ups
 * like "and sector 3?") and answers from the live data, like an engineer reading the timing screens
 * and the telemetry. Free, instant, offline, and never invents a number.
 *
 * The lap analysis compares the last lap with the reference lap (the best before it), 10 m at a time:
 * it finds the corner where the most time went and whether it went on the way in (braking), in the
 * middle (minimum speed) or on the way out (traction), and says so.
 *
 * answer(question, ctx) -> text. ctx: see engineerContext() in main.js.
 */
const fmt = (t) => (t == null ? '—' : `${Math.floor(t / 60)}:${(t % 60).toFixed(3).padStart(6, '0')}`);
const tenths = (x) => { const a = Math.abs(x); return a < 0.1 ? `${Math.round(a * 1000)} thousandths` : a < 1 ? `${(a * 10).toFixed(1).replace(/\.0$/, '')} tenths` : `${a.toFixed(1)} seconds`; };
const TYRE = { S: 'softs', M: 'mediums', H: 'hards', I: 'inters', W: 'full wets' };
const km = (s) => (s < 1000 ? `${Math.round(s / 10) * 10} metres` : `${(s / 1000).toFixed(1)} k`);

// ------------------------------------------------------------------------------- the circuit
const cornerCache = new WeakMap();
/** The corners of a layout: where the curvature peaks, with direction and how slow they are. */
export function cornersOf(L) {
  if (!L) return [];
  if (cornerCache.has(L)) return cornerCache.get(L);
  const out = [], N = L.N, ds = L.ds, sm = new Float32Array(N), w = Math.max(1, Math.round(15 / ds));
  for (let i = 0; i < N; i++) { let a = 0; for (let k = -w; k <= w; k++) a += L.k[(i + k + N) % N]; sm[i] = a / (2 * w + 1); }
  let i0 = -1;
  for (let i = 0; i <= N; i++) {
    const on = i < N && Math.abs(sm[i]) > 1 / 160;
    if (on && i0 < 0) i0 = i;
    if (!on && i0 >= 0) {
      let peak = i0;
      for (let k = i0; k < i; k++) if (Math.abs(sm[k]) > Math.abs(sm[peak])) peak = k;
      const r = 1 / Math.abs(sm[peak]), s = peak * ds;
      const prev = out[out.length - 1];
      if (prev && s - prev.s < 60 && Math.sign(sm[peak]) === prev.dir) { if (r < prev.r) Object.assign(prev, { s, r }); } // one corner, two peaks
      else out.push({ s, r, dir: Math.sign(sm[peak]) });
      i0 = -1;
    }
  }
  out.forEach((c, k) => { c.n = k + 1; c.kind = c.r < 25 ? 'hairpin' : c.r < 55 ? 'slow' : c.r < 120 ? 'medium-speed' : 'fast'; c.side = c.dir > 0 ? 'left' : 'right'; });
  cornerCache.set(L, out);
  return out;
}
/** The corner nearest to a point of the lap, by name ("the slow right-hander at 1.3 k, sector 1"). */
export function whereIs(L, s) { const cs = cornersOf(L); if (!cs.length) return `${km(s)} into the lap`; const c = cs.reduce((a, b) => (Math.abs(b.s - s) < Math.abs(a.s - s) ? b : a)); return Math.abs(c.s - s) < 250 ? cornerName(c, L) : `${km(s)} into the lap`; }
const cornerName = (c, L) => `the ${c.kind === 'hairpin' ? `${c.side} hairpin` : `${c.kind} ${c.side}-hander`} at ${km(c.s)}${L ? `, sector ${Math.min(3, 1 + Math.floor((3 * c.s) / L.length))}` : ''}`;

/**
 * Where the last lap lost time to the reference: per corner, the time lost on the way in, through the
 * middle and on the way out, with the speeds that explain it.
 */
export function analyseLap(c) {
  const t = c.last?.trace, r = c.last?.ref, L = c.layout;
  if (!t || !r || !L || t.length < 20 || r.length < 20) return null;
  const n = Math.min(t.length, r.length) - 1, STEP = 10;
  const dt = (a, i) => a[i + 1] - a[i], v = (a, i) => (STEP / Math.max(1e-3, dt(a, i))) * 3.6;
  const loss = (i0, i1) => { let x = 0; for (let i = Math.max(0, i0); i < Math.min(n, i1); i++) x += dt(t, i) - dt(r, i); return x; };
  const minV = (a, i0, i1) => { let m = Infinity; for (let i = Math.max(0, i0); i < Math.min(n, i1); i++) m = Math.min(m, v(a, i)); return m; };
  const at = (s) => Math.round(s / STEP);
  const corners = cornersOf(L).map((k) => {
    const a = at(k.s);
    const entry = loss(a - 14, a - 3), mid = loss(a - 3, a + 3), exit = loss(a + 3, a + 14);
    // Braking point: where speed first drops 5% below its approach, on both laps.
    const brake = (arr) => { let top = 0; for (let i = Math.max(0, a - 25); i < a; i++) { const sp = v(arr, i); if (sp > top) top = sp; else if (sp < top * 0.95) return i; } return a; };
    return { ...k, entry, mid, exit, total: entry + mid + exit, vMin: minV(t, a - 3, a + 3), vMinRef: minV(r, a - 3, a + 3), exitV: v(t, Math.min(n - 1, a + 10)), exitVRef: v(r, Math.min(n - 1, a + 10)), brakeGap: (brake(t) - brake(r)) * STEP };
  });
  const total = t[n] - r[n];
  const worst = corners.slice().sort((p, q) => q.total - p.total)[0], best = corners.slice().sort((p, q) => p.total - q.total)[0];
  return { total, corners, worst, best };
}
/** The engineer's read of one corner: what went wrong and what to do. */
function cornerAdvice(k, L) {
  const where = cornerName(k, L);
  const phase = [['entry', k.entry], ['mid', k.mid], ['exit', k.exit]].sort((p, q) => q[1] - p[1])[0][0];
  const dv = k.vMinRef - k.vMin;
  if (phase === 'entry' && k.brakeGap < -10) return `${tenths(k.total)} lost at ${where}. You're braking about ${Math.round(-k.brakeGap)} metres earlier than your best. Brake later, trust the car.`;
  if (phase === 'entry' && k.vMin < k.vMinRef - 4) return `${tenths(k.total)} lost into ${where}. Too much braking, the minimum speed is ${Math.round(dv)} k down. Release the brake earlier and roll more speed in.`;
  if (phase === 'entry') return `${tenths(k.total)} lost on the way into ${where}. Entry is the issue, work on the braking phase.`;
  if (phase === 'mid' && dv > 3) return `${tenths(k.total)} lost at ${where}, ${Math.round(dv)} k down on minimum speed. Carry more speed to the apex.`;
  if (phase === 'exit' && k.vMin > k.vMinRef + 2) return `${tenths(k.total)} lost at ${where}. You're overdriving the entry: more minimum speed, but it costs the exit. Slow in, fast out.`;
  if (phase === 'exit') return `${tenths(k.total)} lost on exit of ${where}, ${Math.round(k.exitVRef - k.exitV)} k slower coming out. Straighten the wheel and get on the power earlier.`;
  return `${tenths(k.total)} lost at ${where}. Look at your line through there.`;
}

// ------------------------------------------------------------------------------- understanding
const INTENTS = [
  ['greet', /\b(hi|hello|hey|yo|radio check|can you hear|you there|comms?)\b/],
  ['thanks', /\b(thanks|thank you|cheers|copy( that)?|understood|roger|ok(ay)?|got it)\b/],
  ['mood', /\b(struggl|hate|terrible|awful|undriv|nightmare|sorry|my bad|messed|mistake|frustrat|can'?t drive|useless|sucks?)\b/],
  ['corner', /\b(turn|corner|hairpin|chicane|braking|brake|apex|entry|exit|traction|line|where.*(slow|los|time|improv|faster)|los(ing|t) time|improve|faster|quicker|better lap|find time|how do i go)\b/],
  ['sector', /\bsector|s[123]\b|split/],
  ['lastlap', /\b(last|that|previous) lap\b|how was (that|it)|lap time\b/],
  ['bestlap', /\b(best|fastest|personal best|pb|quickest) (lap|time)\b|\bmy best\b/],
  ['ahead', /\b(ahead|in front|in front of me|above me|car ahead|next car up|beat next)\b/],
  ['behind', /\b(behind|below me|chasing|under threat|car behind)\b/],
  ['leader', /\b(leader|first|fastest|p1|pole|top|quickest car|who('?s| is) (leading|fastest|on top))\b/],
  ['cut', /\b(cut|drop zone|safe|knock|eliminat|through|make it|get through|q2|q3|need to do|need a)\b/],
  ['position', /\b(position|where am i|what p\b|p\?|standing|place|classif|how am i doing|how'?s it going|pace)\b/],
  ['remaining', /\b(time left|how long|remaining|minutes?|clock|session time|when.*(end|finish))\b/],
  ['tyres', /\b(tyres?|tires?|compound|grip|softs?|mediums?|hards?|inters?|intermediates?|wets?|slicks?|rubber)\b/],
  ['weather', /\b(weather|rain|raining|wet|dry|cloud|sun|forecast|radar|storm|drizzle|shower)\b/],
  ['box', /\b(box|pit|come in|stop|pits)\b/],
  ['stewards', /\b(penalt|investigat|stewards?|incident|black (and|&) white|drive.?through|dsq|disqualif)/],
  ['neutral', /\b(safety car|sc\b|vsc|virtual|yellow|neutrali[sz]|restart|delta)/],
  ['limits', /\b(track limits?|deleted|invalid|white line)\b/],
  ['speed', /\b(speed|how fast|km\/?h|mph|gear|rpm)\b/],
  ['plan', /\b(plan|strategy|what (should|do) i do|what now|next|programme|program|push)\b/],
  ['car', /\b(car|setup|balance|understeer|oversteer|handling|damage|broken)\b/],
];
function intentsOf(q) { return INTENTS.filter(([, re]) => re.test(q)).map(([k]) => k); }
const PRIORITY = ['stewards', 'neutral', 'limits', 'corner', 'sector', 'cut', 'ahead', 'behind', 'leader', 'lastlap', 'bestlap', 'tyres', 'weather', 'box', 'remaining', 'speed', 'plan', 'car', 'position', 'mood', 'greet', 'thanks'];

export class EngineerBrain {
  constructor() { this.memory = { intent: null, sector: null }; this.turn = 0; }
  pick(list) { this.turn++; return list[this.turn % list.length]; }

  answer(question, c) {
    const q = ` ${question.toLowerCase().replace(/[^a-z0-9?'.\s/]/g, ' ')} `;
    let found = intentsOf(q);
    const sectorNo = /sector\s*(one|two|three|[123])|\bs([123])\b/.exec(q);
    const sec = sectorNo ? { one: 1, two: 2, three: 3 }[sectorNo[1]] ?? +(sectorNo[1] ?? sectorNo[2]) : null;
    // Follow-ups: "and sector 3?", "what about behind?", "and now?" carry on from the last subject.
    const followUp = /^\s*(and|what about|how about|also|now|then|again)\b/.test(q);
    if (!found.length && followUp && this.memory.intent) found = [this.memory.intent];
    if (sec && !found.includes('sector')) found.push('sector');
    const intent = PRIORITY.find((k) => found.includes(k)) ?? null;
    this.memory.intent = intent ?? this.memory.intent;
    if (sec) this.memory.sector = sec;
    const say = this[`on_${intent}`]?.(c, q, sec ?? (intent === 'sector' ? this.memory.sector : null));
    return say ?? this.unsure(c);
  }

  unsure(c) {
    return this.pick([
      `Say again? Ask me about pace, sectors, where you're losing time, tyres, weather or the gap.`,
      `Didn't copy that. ${this.on_position(c)}`,
      `Not sure what you need. Try "where am I losing time" or "gap to the car ahead".`,
    ]);
  }

  // ------------------------------------------------------------------------------ answers
  on_greet(c) { return this.pick([`Loud and clear. ${c.session ? `${c.session.label}, ${c.session.remaining} to go.` : 'Ready when you are.'}`, 'Radio check fine, we hear you.', `Yep, go ahead. ${c.position ? `You're P${c.position}.` : ''}`]).trim(); }
  on_thanks() { return this.pick(['Copy.', 'No problem. Keep it clean.', 'Understood.', 'All good. Head down.']); }
  on_mood(c) {
    const a = analyseLap(c);
    return this.pick([
      `Stay calm, it's there. ${a?.worst && a.worst.total > 0.05 ? `Most of it is ${cornerName(a.worst, c.layout)}, fix that and the lap comes.` : 'Reset, one clean lap.'}`,
      `Don't worry about it. Deep breath, next lap.`,
      `Forget that one. The pace is in the car, we just need it all in one lap.`,
    ]);
  }

  raceGaps(c) {
    const bits = [`P${c.position}, ${c.lapsLeft} laps to go.`];
    if (c.aheadRace) bits.push(`${c.aheadRace.code} ${c.aheadRace.gap.toFixed(1)} ahead.`);
    if (c.behindRace) bits.push(`${c.behindRace.code} ${c.behindRace.gap.toFixed(1)} behind.`);
    return bits.join(' ');
  }
  on_position(c) {
    if (c.race) return this.raceGaps(c);
    if (!c.session) return c.best != null ? `It's just us out here. Best is ${fmt(c.best)}.` : `Empty track, no lap on the board yet. Push when ready.`;
    if (c.knockedOut) return `We're out, P${c.position}. Sorry mate, we'll regroup.`;
    if (c.best == null) return `No time yet, so P${c.position} for now. ${c.session.remaining} left, get a lap in.`;
    if (c.position === 1) return this.pick([`P1, top of the times. ${c.behindGap != null ? `${tenths(c.behindGap)} clear of ${c.behind.code}.` : ''}`, `You're fastest. Good job, keep it up.`]).trim();
    return `P${c.position}, ${tenths(c.gap)} off ${c.leader.code}.${c.ahead ? ` ${c.ahead.code} is ${tenths(c.best - c.ahead.time)} ahead.` : ''}`;
  }
  on_leader(c) {
    if (c.race) return c.position === 1 ? 'You are leading.' : `${c.leader?.code ?? 'The leader'} leads, ${(c.leader?.gapRace ?? 0).toFixed(1)} ahead of you.`;
    if (!c.leader) return c.session ? 'Nobody has set a time yet.' : 'No other cars out, just you.';
    if (c.position === 1) return `You are. ${fmt(c.best)} is the time to beat.`;
    return `${c.leader.code} on top with a ${fmt(c.leader.time)}${c.best != null ? `, ${tenths(c.gap)} up on you.` : '.'}`;
  }
  on_ahead(c) {
    if (c.race) return c.aheadRace ? `${c.aheadRace.code} is ${c.aheadRace.gap.toFixed(1)} ahead. ${c.aheadRace.gap < 1 ? 'DRS range, have a go.' : 'Keep chipping away.'}` : 'Nobody ahead, you are leading. Manage the gap.';
    if (!c.session) return 'No one ahead, empty track.';
    if (c.position === 1) return "No one ahead, you're P1.";
    if (!c.ahead) return c.best == null ? 'Set a lap first, then we can compare.' : 'No time to compare ahead yet.';
    return `${c.ahead.code} ahead with a ${fmt(c.ahead.time)}, ${tenths(c.best - c.ahead.time)} quicker. ${this.findIt(c, c.best - c.ahead.time)}`;
  }
  on_behind(c) {
    if (c.race) return c.behindRace ? `${c.behindRace.code} is ${c.behindRace.gap.toFixed(1)} behind. ${c.behindRace.gap < 1 ? 'He has DRS, defend into the braking zones.' : 'You are clear for now.'}` : 'Nobody behind.';
    if (!c.behind) return c.session ? "Nobody behind with a time near you." : 'Empty track, no one behind.';
    return `${c.behind.code} behind with a ${fmt(c.behind.time)}, ${tenths(c.behindGap)} slower. ${c.behindGap < 0.15 ? "That's close, keep improving." : 'Comfortable for now.'}`;
  }
  findIt(c, need) {
    const a = analyseLap(c);
    if (a?.worst && a.worst.total > need * 0.4 && a.worst.total > 0.04) return `The time is at ${cornerName(a.worst, c.layout)}.`;
    return '';
  }
  on_cut(c) {
    if (c.race) return c.position <= 10 ? `P${c.position}, in the points.` : `P${c.position}. ${c.aheadRace ? `${c.aheadRace.gap.toFixed(1)} to ${c.aheadRace.code}` : ''}, we need ${c.position - 10} places for points.`;
    if (!c.session || !c.cutLine) return c.session ? "No knockout in this session." : 'No session running.';
    if (c.knockedOut) return `We're out, P${c.position}.`;
    if (c.best == null) return `No time yet, you're in the drop zone. You need to beat ${c.cutTime != null ? `${fmt(c.cutTime)}, ${c.cutCode} in P${c.cutLine}` : 'whatever is in P' + c.cutLine}. ${c.session.remaining} left.`;
    if (c.position <= c.cutLine) return `P${c.position}, ${c.marginOver != null ? `${tenths(c.marginOver)} above the cut` : 'above the cut'}. ${c.marginOver != null && c.marginOver < 0.2 ? 'Not safe yet, others will improve. One more lap.' : 'Looking safe, but keep it clean.'}`;
    return `P${c.position}, in the drop zone. Need ${tenths(c.best - c.cutTime)} to get past ${c.cutCode}. ${this.findIt(c, c.best - c.cutTime)}`.trim();
  }

  on_lastlap(c) {
    if (!c.last) return 'No completed lap yet.';
    if (c.last.valid === false) return `That one's deleted, track limits. ${fmt(c.last.time)} would have counted otherwise.`;
    const d = c.best != null && c.last.time > c.best + 0.001 ? `, ${tenths(c.last.time - c.best)} off your best` : c.best != null ? ', your best lap' : '';
    const a = analyseLap(c);
    return `${fmt(c.last.time)}${d}.${a?.worst && a.worst.total > 0.05 ? ` Biggest loss ${cornerName(a.worst, c.layout)}, ${tenths(a.worst.total)}.` : ''}${a?.best && a.best.total < -0.05 ? ` Good gain at ${cornerName(a.best, c.layout)}.` : ''}`;
  }
  on_bestlap(c) {
    if (c.best == null) return 'No timed lap yet.';
    const theo = c.bestSectors?.every((x) => x != null) ? c.bestSectors.reduce((x, y) => x + y, 0) : null;
    return `Best is ${fmt(c.best)}.${theo && c.best - theo > 0.05 && c.best - theo < 3 ? ` Your best sectors add up to ${fmt(theo)}, so ${tenths(c.best - theo)} is there for the taking.` : ''}`;
  }
  on_sector(c, q, n) {
    const last = c.last?.sectors, fast = c.fastestSectors, mine = c.bestSectors;
    if (!last && !mine?.some((x) => x != null)) return 'No sector times yet.';
    if (n) {
      const k = n - 1, x = last?.[k] ?? mine?.[k];
      if (x == null) return `No time in sector ${n} yet.`;
      const ref = fast?.[k] ?? mine?.[k];
      const a = analyseLap(c), here = a?.corners.filter((p) => Math.min(3, 1 + Math.floor((3 * p.s) / c.layout.length)) === n).sort((p, q2) => q2.total - p.total)[0];
      return `Sector ${n}: ${x.toFixed(3)}${ref != null && x - ref > 0.005 ? `, ${tenths(x - ref)} off the fastest` : ref != null ? ', purple' : ''}.${here && here.total > 0.04 ? ` ${cornerAdvice(here, c.layout)}` : ''}`;
    }
    if (last && fast?.some((x) => x != null)) {
      const loss = last.map((x, k) => (x != null && fast[k] != null ? x - fast[k] : -1)), k = loss.indexOf(Math.max(...loss));
      this.memory.sector = k + 1;
      return loss[k] > 0.03 ? `Sector ${k + 1} is the weak one, ${tenths(loss[k])} off the fastest. ${loss.filter((x) => x <= 0.005 && x >= 0).length ? 'The others are on it.' : ''}`.trim() : 'All three sectors are on the pace.';
    }
    return `Sectors ${last.map((x) => (x == null ? '—' : x.toFixed(3))).join(', ')}.`;
  }
  on_corner(c, q) {
    const a = analyseLap(c);
    if (!a) return c.last ? 'I need a reference lap to compare against. Do another clean lap.' : 'Do a full lap first and I can tell you where the time is.';
    // A particular corner: "turn 5", "the hairpin".
    const tn = /\bturn\s*(\d{1,2})\b/.exec(q);
    let k = null;
    if (tn) k = a.corners.find((p) => p.n === +tn[1]);
    else if (/hairpin/.test(q)) k = a.corners.filter((p) => p.kind === 'hairpin').sort((p, q2) => q2.total - p.total)[0];
    if (k) return k.total > 0.03 ? cornerAdvice(k, c.layout) : `${cornerName(k, c.layout)} is fine, within ${tenths(Math.abs(k.total))} of your best.`;
    if (a.total < -0.05) return `That lap was ${tenths(-a.total)} up on your best, nothing big to fix. ${a.worst.total > 0.04 ? `Small one at ${cornerName(a.worst, c.layout)}.` : 'Keep doing that.'}`;
    const top = a.corners.filter((p) => p.total > 0.04).sort((p, q2) => q2.total - p.total).slice(0, 2);
    if (!top.length) return 'Losses are spread around, nothing big in one place. Smooth inputs, clean laps.';
    return cornerAdvice(top[0], c.layout) + (top[1] ? ` Also ${tenths(top[1].total)} at ${cornerName(top[1], c.layout)}.` : '');
  }

  on_tyres(c) {
    if (c.race) {
      const nm = TYRE[c.compound] ?? 'tyres';
      if (c.wantsPit) return `${nm} are at ${c.tyreWear} percent. Box this lap for ${TYRE[c.nextCompound] ?? 'new tyres'}.`;
      return `${nm[0].toUpperCase() + nm.slice(1)}, ${c.tyreWear} percent left after ${c.tyreLaps} laps.${c.nextStopLap ? ` Plan is to stop on lap ${c.nextStopLap} for ${TYRE[c.nextCompound]}.` : ' No more stops planned.'}`;
    }
    const want = c.wetness > 0.58 ? 'W' : c.wetness > 0.22 ? 'I' : 'S';
    const on = TYRE[c.compound] ?? 'these tyres';
    const ok = (want === 'S' && 'SMH'.includes(c.compound ?? 'S')) || want === c.compound;
    if (!ok) return `Wrong tyre. Track wants ${TYRE[want]}, you're on ${on}. Box, box.`;
    if (c.rainSoon && 'SMH'.includes(c.compound ?? 'S')) return `${on} are right for now, but rain is coming. Be ready to box for inters.`;
    return this.pick([`${on[0].toUpperCase() + on.slice(1)}, right tyre for this. Push.`, `Tyres are good, ${on} are the call.`, `You're on ${on}. Grip should be there, keep the tyres in the window.`]);
  }
  on_weather(c) {
    const now = `${c.weather}, track ${c.wetness > 0.6 ? 'wet' : c.wetness > 0.2 ? 'damp' : 'dry'}.`;
    return c.forecast ? `${now} Radar: ${c.forecast}.` : now;
  }
  on_box(c) {
    if (c.race) return c.wantsPit ? `Yes, box this lap. ${TYRE[c.nextCompound] ?? 'New tyres'} are ready.` : c.nextStopLap ? `Not yet. Stay out, we box on lap ${c.nextStopLap}.` : 'Stay out. No more stops, bring it home.';
    if (!c.session) return 'Box whenever you like, no session running.';
    const want = c.wetness > 0.58 ? 'W' : c.wetness > 0.22 ? 'I' : 'S';
    const wrong = !((want === 'S' && 'SMH'.includes(c.compound ?? 'S')) || want === c.compound);
    if (wrong) return `Yes, box this lap for ${TYRE[want]}.`;
    if (c.session.state === 'chequer') return 'Chequered flag, box this lap.';
    return c.remainingSec < 120 ? 'Stay out, no time to come in and go again. Push.' : 'Stay out unless you want a break. Box when you\'re done with the run.';
  }
  on_remaining(c) { if (c.race) return `${c.lapsLeft} laps to go.`; return c.session ? `${c.session.remaining} left in ${c.session.label}.` : 'No session clock, free running.'; }
  on_stewards(c) {
    const st = c.stewards;
    if (!st) return 'Nothing from the stewards.';
    if (st.driveThrough) return 'We have a drive-through. Box, drive through at the limit, do not stop. Within three laps or it is the black flag.';
    const bits = [];
    if (st.underInvestigation) bits.push('We are under investigation, waiting for the decision.');
    if (st.penaltyToServe) bits.push(`${st.penaltyToServe} seconds of penalty to serve: at the stop, or it goes on our race time.`);
    if (st.penalties.length && !st.penaltyToServe) bits.push(`Penalties today: ${st.penalties.join(', ')}.`);
    if (st.trackLimits) bits.push(`${st.trackLimits} track limits so far${st.trackLimits >= 3 ? ', we have had the black and white flag, no more' : ''}.`);
    return bits.join(' ') || 'Nothing from the stewards. Clean race so far.';
  }
  on_neutral(c) {
    const f = c.session?.flag ?? '';
    if (f.includes('safety car in')) return 'Safety car in this lap. No overtaking until the control line, be ready for the restart.';
    if (f.includes('safety car')) return 'Safety car. Stay above the delta until you catch the queue, then keep it within ten car lengths. No overtaking.';
    if (f.includes('VSC ending')) return 'VSC ending, green any moment. Be ready.';
    if (f.includes('virtual')) return 'VSC. Keep the delta positive, no overtaking. A stop now costs about half the usual time.';
    return 'Green flag, no neutralisation. Racing.';
  }
  on_limits(c) { return c.last?.valid === false ? 'Last lap was deleted for track limits. Keep all four wheels inside the white line.' : 'No track limits on your last lap. Keep it inside the white lines.'; }
  on_speed(c) { return `${Math.round(c.speed)} k in ${c.gear === 'N' ? 'neutral' : `gear ${c.gear}`}.`; }
  on_car(c) {
    const a = analyseLap(c);
    if (a?.worst && a.worst.total > 0.05) return `Data says the car is fine. The time is at ${cornerName(a.worst, c.layout)}. ${cornerAdvice(a.worst, c.layout).split('. ').slice(1).join('. ')}`;
    return "Nothing wrong on the data. Car's fine, keep pushing.";
  }
  on_plan(c) {
    if (c.race) return c.wantsPit ? `Box this lap for ${TYRE[c.nextCompound]}.` : `${this.raceGaps(c)} ${c.nextStopLap ? `Stop on lap ${c.nextStopLap}.` : 'Bring it home.'}`;
    if (!c.session) return 'Build up lap by lap, then push for a time.';
    if (c.session.state === 'chequer') return 'Flag is out. Finish the lap and box.';
    if (c.sessionType === 'quali') {
      if (c.best == null) return `Priority is a banker lap. Out lap, then push. ${c.session.remaining} left.`;
      if (c.cutLine && c.position > c.cutLine) return `We need to improve to get through. ${this.findIt(c, c.best - (c.cutTime ?? c.best)) || 'Clean lap, push everywhere.'}`;
      return c.remainingSec < 150 ? 'Last chance. Everything you have this lap.' : 'Good position. Cool lap, then one more push at the end when the track is best.';
    }
    return c.sessionLaps < 3 ? 'Build up, learn the track, then push for a time.' : `Keep doing push laps. ${this.findIt(c, 0.1) || 'Work on consistency.'}`;
  }
}
