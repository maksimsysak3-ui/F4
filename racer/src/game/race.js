import { rng } from './forecast.js';
import { TyreSet, planStrategy, fuelAt, fuelLoss, COMPOUNDS } from './tyres.js';

/*
 * A Grand Prix (or a Sprint), run the way the real one is:
 *
 *   grid        every car on its grid box in qualifying order (the painted, staggered boxes, 8 m apart)
 *   formation   the formation lap: single file at a steady pace, no overtaking, back round to the grid
 *   parking     each car stops in its own box (the player too: how close they get is shown and rated)
 *   lights      the five red lights come on one a second, a random hold, then out: a clutch launch
 *   racing      the laps: positions by distance run, gaps timed at checkpoints round the lap, pit stops
 *   chequer     the leader takes the flag after the race distance; everyone else finishes as they
 *               next cross the line (lapped cars a lap or more down)
 *   done        the classification, the points (25-18-15-12-10-8-6-4-2-1; Sprint 8 to 1)
 *
 * Race length: the real number of laps, or a share of it (long 2/3, medium 1/3, short 1/6); tyre wear
 * scales up with a shorter race so a stop (or two) still decides it.
 */
export const REAL_LAPS = { australia: 58, china: 56, suzuka: 53, bahrain: 57, jeddah: 50, miami: 57, canada: 70, monaco: 78, catalunya: 66, austria: 71, silverstone: 52, spa: 44, hungaroring: 70, zandvoort: 72, monza: 53, madring: 57, baku: 51, singapore: 62, cota: 56, mexico: 71, interlagos: 71, vegas: 50, qatar: 57, yas: 58 };
export const SPRINT_LAPS = { china: 19, miami: 19, canada: 23, silverstone: 17, zandvoort: 24, singapore: 20 };
export const RACE_LENGTHS = { short: { name: 'Short', f: 1 / 6 }, medium: { name: 'Medium', f: 1 / 3 }, long: { name: 'Long', f: 2 / 3 }, full: { name: 'Full', f: 1 } };
export const POINTS = { R: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], S: [8, 7, 6, 5, 4, 3, 2, 1] };

/** Laps for a race at a circuit and a length preset. */
export function raceLaps(trackId, kind = 'R', length = 'medium') {
  const real = (kind === 'S' ? SPRINT_LAPS[trackId] : REAL_LAPS[trackId]) ?? (kind === 'S' ? 20 : 55);
  return Math.max(kind === 'S' ? 2 : 3, Math.round(real * (RACE_LENGTHS[length]?.f ?? 1 / 3)));
}

const GRID_GAP = 8, GRID_LAT = 2.5, GRID_FRONT = 9 + 2.4; // slot spacing, stagger, pole's box front + half a car

export class RaceSession {
  /**
   * def: the session; weekend; field: the AI field; entries (all, the player's flagged); grid: entry ids
   * in grid order; laps; track; weather; length (preset name).
   */
  constructor({ def, weekend, field, entries, playerEntry, grid, laps, track, weather, length }) {
    Object.assign(this, { def, weekend, field, playerEntry, laps, track, weather, length });
    const L = track.layout, real = (def.id === 'S' ? SPRINT_LAPS : REAL_LAPS)[track.id] ?? laps;
    this.L = L;
    this.kind = def.id === 'S' ? 'S' : 'R';
    this.R = rng((weekend.seed ^ 0x9e3779b9 ^ (def.index * 7919)) >>> 0);
    this.wearScale = Math.max(1, Math.min(6, real / laps));
    this.state = 'grid'; this.t = 0; this.phaseT = 0; this.lightsOn = 0; this.lightsOutAt = null;
    this.events = []; this.out = new Set(); this.segment = 0;
    this.checkpoints = 24; this.cpTimes = []; // leader's time at each checkpoint (by index of distance)
    const byId = new Map(entries.map((e) => [e.id, e]));
    this.rows = grid.map((id, k) => {
      const e = byId.get(id);
      const slotS = ((L.length - GRID_FRONT - k * GRID_GAP) % L.length + L.length) % L.length;
      const r = { e, id, gridPos: k + 1, slotS, slotLat: k % 2 ? GRID_LAT : -GRID_LAT, laps: 0, crossings: 0, dist: slotS - L.length, finished: false, finishT: null,
        pits: 0, gap: 0, interval: 0, best: null, last: null, lapStart: null, status: 'GRID', penalty: 0, retired: false, cp: -1, stops: [] };
      r.tyres = new TyreSet('M', { trackId: track.id, wearScale: this.wearScale });
      r.ai = field.cars.find((a) => a.entry.id === id) ?? null;
      return r;
    });
    this.player = this.rows.find((r) => r.e.player);
    // Strategies: each team plans its race for the conditions; the starting tyre follows it.
    const wet = weather.wetness;
    for (const r of this.rows) {
      r.plan = planStrategy(laps, { trackId: track.id, wearScale: this.wearScale, wetness: wet, rand: this.R, aggressive: r.e.aggression ?? 0.5 });
      r.stint = 0; r.tyres.compound = r.plan[0].c;
      r.pitLap = r.plan.length > 1 ? r.plan[0].laps : Infinity;
    }
    this.label = this.kind === 'S' ? 'SPRINT' : 'RACE';
  }
  get running() { return this.state === 'racing' || this.state === 'chequer'; }
  get leader() { return this.standings()[0]; }
  get leaderLap() { return Math.min(this.laps, Math.max(1, this.leader.laps + (this.running ? 1 : 0))); }
  feed(text, kind = '') { this.events.push({ t: this.t, text, kind }); if (this.events.length > 50) this.events.shift(); }
  row(id) { return this.rows.find((r) => r.id === id); }

  /** Order: finishers by when they finished, then everyone else by distance run. */
  standings() {
    return this.rows.slice().sort((a, b) => {
      if (a.retired !== b.retired) return a.retired ? 1 : -1;
      if (a.finished && b.finished) return a.laps !== b.laps ? b.laps - a.laps : a.finishT - b.finishT;
      if (a.finished !== b.finished) return a.finished ? (a.laps >= b.laps ? -1 : 1) : (b.laps >= a.laps ? 1 : -1);
      return b.dist - a.dist;
    });
  }

  /**
   * A car's distance changed (s on the lap, crossed: it passed the line). The race's bookkeeping:
   * laps, lap times, finishing, the timing checkpoints for the gaps.
   */
  progress(r, s, crossed) {
    const L = this.L;
    if (crossed) {
      r.crossings++;
      if (this.running) {
        if (r.crossings >= 2) {
          r.laps = r.crossings - 1;
          const lap = this.t - r.lapStart;
          r.last = lap; if (r.best == null || lap < r.best) { r.best = lap; if (this.fastest == null || lap < this.fastest.time) { this.fastest = { time: lap, id: r.id }; if (r.laps > 1) this.feed(`${r.e.code} fastest lap ${fmt(lap)}`, 'purple'); } }
          this.onLap?.(r, lap);
        }
        r.lapStart = this.t;
        if (this.state === 'chequer' && r.crossings >= 2 && !r.finished) this.finishCar(r);
        else if (!r.finished && r.laps >= this.laps) { this.state = 'chequer'; this.feed(`${r.e.code} wins! Chequered flag`, 'chequer'); this.finishCar(r); this.onChequer?.(r); }
      }
    }
    r.dist = r.crossings === 0 ? s - L.length : (r.crossings - 1) * L.length + s; // from the start line (the grid is behind it)
    // Gaps: the time each car reaches checkpoints round the lap, against the leader's.
    if (this.running && !r.finished) {
      const cp = Math.floor(Math.max(0, r.dist) / (L.length / this.checkpoints));
      if (cp > r.cp) { r.cp = cp; if (this.cpTimes[cp] == null) this.cpTimes[cp] = this.t; r.gap = this.t - this.cpTimes[cp]; }
    }
  }
  finishCar(r) {
    r.finished = true; r.finishT = this.t + r.penalty; r.status = 'FINISHED';
    const pos = this.standings().indexOf(r) + 1;
    if (r.e.player) this.onPlayerFinish?.(pos);
  }

  /** The clock and the phases (the field and the player's car are driven elsewhere). */
  update(dt) {
    this.t += dt; this.phaseT += dt;
    if (this.state === 'lights') {
      const n = Math.min(5, Math.floor(this.phaseT / 1.0) + 1);
      if (n !== this.lightsOn && this.lightsOutAt == null) { this.lightsOn = n; this.onLight?.(n); }
      if (this.lightsOutAt == null && this.phaseT >= 5) this.lightsOutAt = this.phaseT + 0.2 + this.R() * 2.8;  // the hold after the fifth light
      if (this.lightsOutAt != null && this.phaseT >= this.lightsOutAt) this.go();
    }
    if (this.running) {
      const order = this.standings();
      order.forEach((r, k) => { r.pos = k + 1; r.interval = k === 0 ? 0 : Math.max(0, r.gap - order[k - 1].gap); });
      // Lapped cars: a lap or more down on the leader.
      const lead = order[0];
      for (const r of order) r.lapsDown = Math.floor((lead.dist - r.dist) / this.L.length);
      if (this.state === 'chequer' && (this.rows.every((r) => r.finished || r.retired) || this.t - this.leaderDoneAt > 150)) this.end();
      if (this.state === 'chequer') this.leaderDoneAt ??= this.t;
    }
  }
  /** Lights out. */
  go() {
    this.state = 'racing'; this.lightsOn = 0; this.startT = this.t;
    for (const r of this.rows) { r.lapStart = this.t; r.status = 'RACING'; r.crossings = 0; r.laps = 0; }
    this.feed(`Lights out! ${this.label === 'SPRINT' ? 'Sprint' : 'Race'} under way, ${this.laps} laps`, 'green');
    this.onStart?.();
  }
  end() {
    if (this.state === 'done') return;
    for (const r of this.rows) if (!r.finished && !r.retired) { r.finished = true; r.finishT = Infinity; }
    this.state = 'done';
    this.finish();
    this.onDone?.();
  }

  /** The classification and points into the weekend (and the season's tables). */
  finish() {
    const order = this.standings(), lead = order[0], pts = POINTS[this.kind];
    const res = order.map((r, k) => {
      const gap = k === 0 ? null : r.laps < lead.laps ? `+${lead.laps - r.laps} lap${lead.laps - r.laps > 1 ? 's' : ''}` : r.finishT === Infinity ? '—' : `+${(r.finishT - lead.finishT).toFixed(3)}`;
      return { pos: k + 1, id: r.id, code: r.e.code, name: r.e.name, team: r.e.team.id, best: r.best, laps: r.laps, time: k === 0 ? r.finishT - (this.startT ?? 0) : null, gap, grid: r.gridPos, pits: r.pits, points: r.retired ? 0 : pts[k] ?? 0, retired: r.retired, fastest: this.fastest?.id === r.id, stints: r.stops.map((s) => s.c) };
    });
    this.weekend.results[this.def.id] = res;
    if (!this.weekend.done.includes(this.def.id)) this.weekend.done.push(this.def.id);
  }

  /**
   * Run the race without driving it: lap by lap, every car's lap from its pace, its tyres, the fuel,
   * its pit stops; it can only pass the car ahead if it's clearly quicker (track position counts).
   */
  simulate(lapIdeal) {
    const R = this.R, L = this.L;
    if (this.state === 'grid' || this.state === 'formation' || this.state === 'parking' || this.state === 'lights') this.go();
    const cars = this.rows.map((r, k) => ({ r, t: k * 0.25 + (r.e.player ? 0.4 : 0), pace: r.ai ? r.ai.driver.pace : r.e.pace ?? 0.98 }));
    for (let lap = 1; lap <= this.laps; lap++) {
      const fuel = fuelLoss(fuelAt((lap - 1) / this.laps));
      for (const c of cars) {
        const r = c.r;
        const base = lapIdeal * (0.978 + 0.85 * Math.max(0, 1 - c.pace)) * (1 + this.weather.wetness * 0.12);
        let t = base * (1 + r.tyres.loss + fuel) * (1 + (R() - 0.5) * 0.006 * (1 + (r.e.humanity ?? 0.3)));
        if (lap === 1) t += 2 + (r.gridPos - 1) * 0.15;
        r.tyres.run(L.length, L.length, 1);
        if (lap === r.pitLap && lap < this.laps) { t += 21 + R() * 2.5; this.pitDone(r); }
        c.t += t; c.lap = t;
      }
      // Track position: a car within a second of the one ahead stays behind unless much quicker.
      cars.sort((a, b) => a.t - b.t);
      for (let k = 1; k < cars.length; k++) {
        const a = cars[k - 1], b = cars[k];
        if (b.t - a.t < 0.35 && R() > Math.min(0.9, (a.lap - b.lap) * 1.5)) b.t = a.t + 0.35 + R() * 0.3;
      }
      cars.sort((a, b) => a.t - b.t);
      for (const c of cars) { c.r.laps = lap; c.r.last = c.lap; if (c.r.best == null || c.lap < c.r.best) c.r.best = c.lap; }
    }
    for (const c of cars) { c.r.finished = true; c.r.finishT = c.t + c.r.penalty; }
    const f = cars.slice().sort((a, b) => a.r.best - b.r.best)[0]; this.fastest = { time: f.r.best, id: f.r.id };
    this.startT = 0;
    this.state = 'chequer';
    this.end();
  }

  /** A pit stop done: next stint's tyres, the plan for the next stop. */
  pitDone(r, compound = null) {
    r.pits++;
    r.stint = Math.min(r.plan.length - 1, r.stint + 1);
    const c = compound ?? r.plan[r.stint]?.c ?? (r.tyres.compound === 'H' ? 'M' : 'H');
    r.stops.push({ lap: r.laps, c: r.tyres.compound, to: c });
    r.tyres = new TyreSet(c, { trackId: this.track.id, wearScale: this.wearScale });
    r.tyres.warm = 0.3;
    const next = r.plan.slice(0, r.stint + 1).reduce((a, s) => a + s.laps, 0);
    r.pitLap = r.stint < r.plan.length - 1 ? next : Infinity;
  }
  /** Does this car want to pit at the end of this lap? (its plan, or tyres falling off the cliff) */
  wantsPit(r) {
    if (this.state !== 'racing' || r.finished) return false;
    const lapsLeft = this.laps - r.laps;
    if (lapsLeft <= 1) return false;
    if (r.laps + 1 >= r.pitLap) return true;
    if (r.tyres.wear < 0.14 && lapsLeft > 3) return true;                                   // the tyres are gone
    const w = this.weather.wetness, c = r.tyres.compound;                                   // the weather turned
    if ((w > 0.3 && 'SMH'.includes(c)) || (w < 0.12 && 'IW'.includes(c) && lapsLeft > 3)) return true;
    return false;
  }
  /** What a car goes onto at its stop (the plan, or what the conditions need). */
  nextCompound(r) {
    const w = this.weather.wetness;
    if (w > 0.58) return 'W';
    if (w > 0.25) return 'I';
    const planned = r.plan[r.stint + 1]?.c;
    if (planned && !'IW'.includes(planned)) return planned;
    const used = new Set([...r.stops.map((s) => s.c), r.tyres.compound]);
    const lapsLeft = this.laps - r.laps;
    if (lapsLeft < 14) return 'S';
    return used.has('H') ? 'M' : 'H';
  }
}
const fmt = (t) => (t == null ? '—' : `${Math.floor(t / 60)}:${(t % 60).toFixed(3).padStart(6, '0')}`);
export { COMPOUNDS, GRID_GAP, GRID_LAT, GRID_FRONT };
