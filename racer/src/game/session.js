import { makeTimeline, forecast, Weather, CLIMATE, rng } from './forecast.js';

/*
 * A race weekend and its sessions.
 *
 *   standard   Practice 1, Practice 2 (Friday), Practice 3, Qualifying (Saturday), the Grand Prix (Sunday)
 *   sprint     Practice 1, Sprint Qualifying (Friday), the Sprint, Qualifying (Saturday), the Grand Prix
 *
 * Qualifying (and Sprint Qualifying) is three knockout segments: after Q1 the slowest six are out
 * (P17-22), after Q2 the next six (P11-16), Q3 decides the top ten. Session lengths scale with the
 * player's choice (short by default: the same shape, less waiting).
 *
 * The live session runs the clock, the field's programs (when each car goes out and for what), the
 * timing for every car (the player included) and the flag; the weekend keeps each session's results.
 */
export const SPRINT_ROUNDS = new Set(['china', 'miami', 'canada', 'silverstone', 'zandvoort', 'singapore']);

const SESSIONS = {
  FP1: { id: 'FP1', name: 'Practice 1', short: 'FP1', type: 'practice', minutes: 60 },
  FP2: { id: 'FP2', name: 'Practice 2', short: 'FP2', type: 'practice', minutes: 60 },
  FP3: { id: 'FP3', name: 'Practice 3', short: 'FP3', type: 'practice', minutes: 60 },
  SQ: { id: 'SQ', name: 'Sprint Qualifying', short: 'SQ', type: 'quali', segments: [12, 10, 8], prefix: 'SQ' },
  S: { id: 'S', name: 'Sprint', short: 'SPR', type: 'race', laps: 100 / 1, locked: true },
  Q: { id: 'Q', name: 'Qualifying', short: 'Q', type: 'quali', segments: [18, 15, 12], prefix: 'Q' },
  R: { id: 'R', name: 'Grand Prix', short: 'RACE', type: 'race', locked: true },
};
export const FORMATS = {
  standard: [['FP1', 'Fri', '12:30'], ['FP2', 'Fri', '16:00'], ['FP3', 'Sat', '12:30'], ['Q', 'Sat', '16:00'], ['R', 'Sun', '15:00']],
  sprint: [['FP1', 'Fri', '12:30'], ['SQ', 'Fri', '16:30'], ['S', 'Sat', '12:00'], ['Q', 'Sat', '16:00'], ['R', 'Sun', '15:00']],
};
/** Session length presets: minutes of practice, and the qualifying segments as a share of the real ones. */
export const LENGTHS = { short: { practice: 12, quali: 0.34, name: 'Short' }, medium: { practice: 25, quali: 0.6, name: 'Medium' }, full: { practice: 60, quali: 1, name: 'Full' } };

/** A new weekend at a circuit (kept in the season save). */
export function newWeekend(trackId, round, seed = Math.floor(Math.random() * 1e9)) {
  const format = SPRINT_ROUNDS.has(trackId) ? 'sprint' : 'standard';
  return { trackId, round, format, seed, results: {}, done: [] };
}

/** The weekend's sessions with their definitions, days, times, and lengths for a preset. */
export function sessionsOf(weekend, length = 'short') {
  const P = LENGTHS[length] ?? LENGTHS.short;
  return FORMATS[weekend.format].map(([id, day, time], k) => {
    const d = SESSIONS[id];
    const segments = d.segments ? d.segments.map((m) => Math.max(3, Math.round(m * P.quali))) : null;
    const minutes = d.type === 'practice' ? P.practice : segments ? segments.reduce((a, b) => a + b, 0) : 0;
    return { ...d, index: k, day, time, segments, minutes, status: weekend.done.includes(id) ? 'done' : d.locked ? 'locked' : 'open' };
  });
}

/** Each session's weather: a timeline seeded from the weekend (so the forecast comes true). */
export function sessionWeather(weekend, session, length = 'short') {
  const wet = CLIMATE[weekend.trackId] ?? 0.25, dur = Math.max(10, session.minutes) * 60 + 600;
  const tl = makeTimeline((weekend.seed + session.index * 7919) >>> 0, wet, dur);
  return { timeline: tl, forecast: forecast(tl, Math.max(10, session.minutes) * 60, 5), wet };
}

const fmtClock = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export { fmtClock };

/**
 * A session being run. def: from sessionsOf; field: the AI field; entries: every car (AI and the
 * player), in field order with the player's entry flagged; weather: its Weather.
 */
export class LiveSession {
  constructor({ def, weekend, field, entries, weather, playerEntry }) {
    Object.assign(this, { def, weekend, field, weather, playerEntry });
    this.R = rng((weekend.seed ^ (def.index * 2654435761)) >>> 0);
    this.state = 'green';
    this.segment = 0;
    this.segments = def.type === 'quali' ? def.segments.map((m) => m * 60) : [def.minutes * 60];
    this.elapsed = 0;          // within the current segment
    this.breakLeft = 0;
    this.out = new Set();      // knocked out (ids)
    // Timing rows: one per car.
    this.rows = entries.map((e) => ({ e, id: e.id, best: null, bestSectors: [null, null, null], last: null, laps: 0, status: 'GARAGE', compound: e.player ? 'M' : 'M', segBest: [null, null, null], ai: null }));
    for (const a of field.cars) { const r = this.row(a.entry.id); r.ai = a; }
    this.player = this.row(playerEntry.id);
    this.overall = { best: null, sectors: [null, null, null] };
    this.events = [];          // feed: { t, text, kind }
    field.onLap = (a, rec) => this.lap(this.row(a.entry.id), rec);
    field.onGarage = (a) => this.planNext(a);
    this.lapEst = (field.plan.lapIdeal ?? 90) * 1.04;
    for (const a of field.cars) this.planNext(a, true);
  }
  row(id) { return this.rows.find((r) => r.id === id); }
  get duration() { return this.segments[this.segment]; }
  get remaining() { return Math.max(0, this.duration - this.elapsed); }
  get label() { return this.def.type === 'quali' ? `${this.def.prefix}${this.segment + 1}` : this.def.short; }
  get running() { return this.state === 'green' || this.state === 'chequer'; }

  /** When this AI goes out next, and to do what. */
  planNext(a, first = false, now = this.elapsed) {
    const R = this.R, dur = this.duration, est = this.lapEst;
    a.run = null; a.nextRunAt = Infinity;
    if (this.state !== 'green' || this.out.has(a.entry.id)) return;
    const wetness = this.weather.wetness;
    const compound = wetness > 0.65 ? 'W' : wetness > 0.25 ? 'I' : null;
    if (this.def.type === 'practice') {
      // Practice: a handful of runs, short and long, the first a while after the green light.
      const at = first ? (R() < 0.45 ? 5 + R() * 50 : R() * dur * 0.3) : now + 90 + R() * 240 * Math.max(0.4, dur / 3600);
      const n = 2 + Math.floor(R() * (dur > 1200 ? 7 : 4));
      const laps = Array.from({ length: n }, (_, k) => (k > 0 && R() < 0.18 ? 'cool' : 'push'));
      if (at + est * (n + 1.5) > dur + est * 0.5) return;
      a.nextRunAt = at;
      a.run = { laps, pace: 0.982 + R() * 0.012, compound: compound ?? ['S', 'M', 'M', 'H'][Math.floor(R() * 4)] };
    } else {
      // Qualifying: a first run early, then the last run timed to start the flying lap in the final
      // minute or two, when the track is at its best.
      const late = dur - est * 2.3 - R() * Math.min(60, dur * 0.12);
      if (first && R() < 0.85 && dur > est * 5) { a.nextRunAt = dur * (0.06 + R() * 0.3); a.run = { laps: R() < 0.5 ? ['push', 'cool', 'push'] : ['push'], pace: 1, compound: compound ?? 'S', space: true }; return; }
      if (late > now + 20) { a.nextRunAt = late; a.run = { laps: ['push'], pace: 1, compound: compound ?? 'S', space: true }; }
    }
  }

  /** A completed lap for a timing row. */
  lap(r, rec) {
    r.last = rec.time; r.laps++;
    if (rec.type !== 'push' || !rec.valid) return;
    const improved = r.best === null || rec.time < r.best;
    if (improved) r.best = rec.time;
    // Qualifying: each segment's own best (a slower lap in Q2 than in Q1 still counts for Q2).
    const seg = this.segment, segImproved = this.def.type === 'quali' && (r.segBest[seg] == null || rec.time < r.segBest[seg]);
    if (segImproved) r.segBest[seg] = rec.time;
    rec.sectors.forEach((x, k) => { if (x != null && (r.bestSectors[k] == null || x < r.bestSectors[k])) r.bestSectors[k] = x; if (x != null && (this.overall.sectors[k] == null || x < this.overall.sectors[k])) this.overall.sectors[k] = x; });
    if (this.overall.best === null || rec.time < this.overall.best) {
      this.overall.best = rec.time;
      this.feed(`${r.e.code} fastest: ${fmtLap(rec.time)}`, 'purple');
    } else if (segImproved) {
      const p = this.standings().findIndex((x) => x === r) + 1;
      if (p <= 3 || r.e.player) this.feed(`${r.e.code} P${p}: ${fmtLap(rec.time)}`, 'green');
    }
  }
  feed(text, kind = '') { this.events.push({ t: this.elapsed, text, kind }); if (this.events.length > 40) this.events.shift(); }

  /** The order: best time (this segment's in qualifying), then laps run, then the knocked-out by where they went out. */
  standings() {
    const quali = this.def.type === 'quali', seg = this.segment;
    const key = (r) => (quali ? (this.out.has(r.id) ? null : r.segBest[seg]) : r.best);
    const outOrder = (r) => (r.outPos ?? 99);
    return this.rows.slice().sort((a, b) => {
      const ao = this.out.has(a.id), bo = this.out.has(b.id);
      if (ao !== bo) return ao ? 1 : -1;
      if (ao && bo) return outOrder(a) - outOrder(b);
      const ka = key(a), kb = key(b);
      if (ka != null && kb != null) return ka - kb;
      if (ka != null) return -1;
      if (kb != null) return 1;
      return (b.laps - a.laps) || a.e.teamIndex - b.e.teamIndex;
    });
  }

  /** Status for each row (what the car is doing). */
  refreshStatus(playerState) {
    for (const r of this.rows) {
      if (this.out.has(r.id)) { r.status = 'OUT'; continue; }
      if (r.e.player) { r.status = playerState; continue; }
      const a = r.ai;
      r.status = a.state === 'garage' ? 'GARAGE' : a.state === 'pitOut' ? 'PIT EXIT' : a.state === 'pitIn' ? 'IN PIT' : a.lapType === 'push' ? 'FLYING' : a.lapType === 'out' ? 'OUT LAP' : a.lapType === 'in' ? 'IN LAP' : 'COOL';
      r.compound = a.compound;
    }
  }

  /** Advance the clock: send cars out on time, the flag at zero, the knockouts between segments. */
  update(dt) {
    if (this.state === 'done') return;
    if (this.state === 'break') {
      this.breakLeft -= dt;
      if (this.breakLeft <= 0) this.startSegment(this.segment + 1);
      return;
    }
    this.elapsed += dt;
    if (this.state === 'green') {
      for (const a of this.field.cars) if (a.state === 'garage' && this.elapsed >= a.nextRunAt) { this.field.sendOut(a, a.run); a.nextRunAt = Infinity; }
      if (this.elapsed >= this.duration) {
        this.state = 'chequer';
        this.feed('Chequered flag', 'chequer');
        // Laps already started still count; everyone comes in after it.
        for (const a of this.field.cars) if (a.state === 'track' && a.lapType !== 'push') a.forceIn = true; else if (a.state === 'track') a.run = { laps: [], pace: 1 };
        this.onChequer?.();
      }
    } else if (this.state === 'chequer') {
      const busy = this.field.cars.some((a) => a.state === 'track' && a.lapType === 'push');
      if (!busy && (this.elapsed > this.duration + this.lapEst * 1.2 || this.field.cars.every((a) => a.state === 'garage' || a.lapType === 'in'))) this.endSegment();
    }
  }

  endSegment() {
    if (this.def.type === 'quali' && this.segment < 2) {
      // Knockout: the slowest six (of those still in) are out, in the order they finished.
      const order = this.standings().filter((r) => !this.out.has(r.id));
      const cut = order.slice(order.length - 6);
      cut.forEach((r, k) => { this.out.add(r.id); r.outPos = (this.segment === 0 ? 17 : 11) + k; });
      this.feed(`${this.label} over: ${cut.map((r) => r.e.code).join(', ')} knocked out`, 'out');
      this.knocked = cut;
      this.state = 'break';
      this.breakLeft = 45;
      this.onSegmentEnd?.(cut);
    } else {
      this.state = 'done';
      this.finish();
      this.onDone?.();
    }
  }
  startSegment(k) {
    this.segment = k; this.elapsed = 0; this.state = 'green';
    for (const r of this.rows) r.segBest[k] = null;
    for (const a of this.field.cars) this.planNext(a, true);
    this.feed(`${this.label}: green light`, 'green');
    this.onSegmentStart?.(k);
  }

  /** Final classification into the weekend. */
  finish() {
    let order;
    if (this.def.type === 'quali') {
      const q3 = this.rows.filter((r) => !this.out.has(r.id)).sort((a, b) => (a.segBest[2] ?? 1e9) - (b.segBest[2] ?? 1e9) || (a.segBest[1] ?? 1e9) - (b.segBest[1] ?? 1e9));
      const outs = this.rows.filter((r) => this.out.has(r.id)).sort((a, b) => a.outPos - b.outPos);
      order = [...q3, ...outs];
    } else order = this.standings();
    this.weekend.results[this.def.id] = order.map((r, k) => ({ pos: k + 1, id: r.id, code: r.e.code, name: r.e.name, team: r.e.team.id, best: r.best, q: r.segBest.slice(), laps: r.laps, sectors: r.bestSectors.slice() }));
    if (!this.weekend.done.includes(this.def.id)) this.weekend.done.push(this.def.id);
  }

  /**
   * Skip ahead (the player waiting in the garage): the field's laps over that time are worked out from
   * each car's pace rather than driven, then the clock moves on. Cars out on track come back in.
   */
  skip(seconds) {
    if (this.state !== 'green') return;
    const to = Math.min(this.duration, this.elapsed + seconds), R = this.R, ideal = this.field.plan.lapIdeal ?? this.lapEst;
    const wet = 1 + this.weather.wetness * 0.12;
    for (const a of this.field.cars) {
      // Measured with tools/ai-lap.mjs: a lone car laps in ~0.978 of the plan's ideal at full pace, +0.85% per point of pace down.
      const r = this.row(a.entry.id), base = ideal * wet * (0.978 + 0.85 * Math.max(0, 1 - a.driver.pace)) * (1 + (1 - a.driver.skill) * 0.05);
      // A car out on track: its run is worked out from here, as if it had just left the garage.
      if (a.state !== 'garage') {
        a.state = 'garage'; a.visual.root.visible = false; a.lapType = null;
        a.run ??= { laps: ['push'], pace: 1 }; a.nextRunAt = this.elapsed;
      }
      for (let guard = 0; a.run && a.nextRunAt < to && guard < 20; guard++) {
        let clock = Math.max(a.nextRunAt, this.elapsed) + base * 1.25; // the out lap
        for (const kind of a.run.laps) {
          if (clock > this.duration) break; // laps started before the flag still count
          const push = kind === 'push';
          const lapT = push ? (base / (a.run.pace ?? 1)) * (1 + (R() - 0.3) * 0.006 * (1 + a.driver.humanity)) : base * 1.3;
          const sec = [0.33, 0.34, 0.33].map((f) => lapT * f * (1 + (R() - 0.5) * 0.004));
          this.lap(r, { time: lapT, sectors: sec, type: kind, valid: R() > 0.04 * a.driver.humanity, compound: a.run.compound });
          clock += lapT;
        }
        a.compound = a.run.compound ?? a.compound;
        this.planNext(a, false, clock + base * 1.1); // the next run, from when this one is back in
      }
    }
    this.elapsed = to;
    if (this.elapsed >= this.duration) { this.state = 'chequer'; this.endSegment(); }
  }
}
export const fmtLap = (t) => (t == null ? '—' : `${Math.floor(t / 60)}:${(t % 60).toFixed(3).padStart(6, '0')}`);

/** The weather for a live session. */
export function liveWeather(weekend, def) {
  const w = sessionWeather(weekend, def);
  return new Weather({ timeline: w.timeline, wet: w.wet });
}
