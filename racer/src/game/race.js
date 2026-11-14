import { rng } from './forecast.js?v=1a016bc';
import { TyreSet, planStrategy, fuelAt, fuelLoss, COMPOUNDS } from './tyres.js?v=1a016bc';
import { RaceControl, PEN } from './raceControl.js?v=1a016bc';

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
    this.wearScale = Math.max(1, Math.min(3, (real / laps) ** 0.6));   // shorter races wear faster, but not in proportion (a short race: mediums ~10 laps)
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
    this.rc = new RaceControl(this);
    this.rc.onRetire = (r, cause) => this.onRetire?.(r, cause);
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
        if (r.pos === 1 && r.crossings >= 2) this.rc.leaderCrossed();
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
    if (r.retired) return;
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
      const order = (this.order = this.standings());
      order.forEach((r, k) => { r.pos = k + 1; r.interval = k === 0 ? 0 : Math.max(0, r.gap - order[k - 1].gap); });
      // Lapped cars: a lap or more down on the leader.
      const lead = order[0];
      for (const r of order) r.lapsDown = Math.floor((lead.dist - r.dist) / this.L.length);
      // A failure (game/rd.js reliability): the car stops, out of the race.
      for (const r of order) if (r.failLap && !r.retired && !r.finished && r.laps >= r.failLap) {
        r.retired = true; r.status = 'DNF';
        this.feed(`${r.e.code} out: ${['power unit', 'gearbox', 'hydraulics', 'brakes', 'energy store'][Math.floor(Math.random() * 5)]} failure`, 'out');
        this.onRetire?.(r, 'failure');
      }
      this.rc.update(dt);
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
  /**
   * Finish the race for everyone still running (the player is done and in the pit lane): each car's
   * finishing time worked out from where it is and its average lap so far.
   */
  finishRest() {
    if (this.state === 'done') return;
    const lead = this.standings()[0], L = this.L;
    for (const r of this.rows) {
      if (r.finished || r.retired) continue;
      const laps = Math.min(this.laps, (r.dist > (lead.laps - 1) * L.length ? lead.laps : r.laps + 1));
      const avg = (this.t - (this.startT ?? 0)) / Math.max(0.5, r.dist / L.length);
      r.finishT = this.t + Math.max(0, (laps * L.length - r.dist) / L.length) * avg + r.penalty;
      r.laps = laps; r.finished = true;
    }
    this.state = 'chequer';
    this.end();
  }
  end() {
    if (this.state === 'done') return;
    for (const r of this.rows) if (!r.finished && !r.retired) { r.finished = true; r.finishT = Infinity; }
    this.rc.finalize();
    this.state = 'done';
    this.finish();
    this.onDone?.();
  }

  /** The classification and points into the weekend (and the season's tables). */
  finish() {
    const order = this.standings(), lead = order[0], pts = POINTS[this.kind];
    const res = order.map((r, k) => {
      const gap = k === 0 ? null : r.laps < lead.laps ? `+${lead.laps - r.laps} lap${lead.laps - r.laps > 1 ? 's' : ''}` : r.finishT === Infinity ? '—' : `+${(r.finishT - lead.finishT).toFixed(3)}`;
      const pens = (r.pens ?? []).map((p) => ({ pen: p.key, reason: p.reason, lap: p.lap }));
      return { pos: k + 1, id: r.id, code: r.e.code, name: r.e.name, team: r.e.team.id, best: r.best, laps: r.laps, time: k === 0 ? r.finishT - (this.startT ?? 0) : null, gap: r.dsq ? 'DSQ' : gap, grid: r.gridPos, pits: r.pits, points: r.retired ? 0 : pts[k] ?? 0, retired: r.retired, dsq: !!r.dsq, fastest: this.fastest?.id === r.id, stints: r.stops.map((s) => s.c), penTime: r.penTotal ?? 0, pens };
    });
    this.weekend.results[this.def.id] = res;
    (this.weekend.raceControl ??= {})[this.def.id] = this.rc.summary();
    if (!this.weekend.done.includes(this.def.id)) this.weekend.done.push(this.def.id);
  }

  /**
   * Run the race without driving it: lap by lap, every car's lap from its pace, its tyres, the fuel,
   * its pit stops; it can only pass the car ahead if it's clearly quicker (track position counts).
   */
  simulate(lapIdeal) {
    const R = this.R, L = this.L, rc = this.rc;
    if (this.state === 'grid' || this.state === 'formation' || this.state === 'parking' || this.state === 'lights') this.go();
    const cars = this.rows.map((r, k) => ({ r, t: k * 0.25 + (r.e.player ? 0.4 : 0), pace: r.ai ? r.ai.driver.pace : r.e.pace ?? 0.98 }));
    // The race's incidents, rolled up front: a crash or a failure brings out the Safety Car or the VSC.
    const pLap = 0.0105 * Math.min(4, this.wearScale) * (1 + this.weather.wetness * 2.5);
    const neutral = new Map();                     // lap -> 'SC' | 'VSC' | 'restart'
    for (let lap = 2; lap <= this.laps - 2; lap++) {
      if (neutral.has(lap) || R() >= pLap) continue;
      const sc = R() < 0.55, len = sc ? 3 + Math.floor(R() * 2) : 1;
      const pool = cars.filter((c) => !c.r.e.player && !c.r.retired && c.out == null), victim = pool[Math.floor(R() * pool.length)];
      if (victim) { victim.r.retired = true; victim.r.status = 'DNF'; victim.out = lap; this.feed(`${victim.r.e.code} crashes out`, 'out'); }
      for (let k = 0; k < len && lap + k <= this.laps; k++) neutral.set(lap + k, sc ? 'SC' : 'VSC');
      if (sc && lap + len <= this.laps) neutral.set(lap + len, 'restart');
      lap += len + 2;
    }
    // Reliability failures (game/rd.js): the car stops on that lap.
    for (const c of cars) if (c.r.failLap && !c.r.retired) { c.out = c.r.failLap; }
    let was = null;
    for (let lap = 1; lap <= this.laps; lap++) {
      const fuel = fuelLoss(fuelAt((lap - 1) / this.laps)), n = neutral.get(lap) ?? null;
      this.leaderLapSim = lap;
      if (n !== was) {
        if (n === 'SC' && was !== 'SC') { rc.deploySC(); }
        if (n === 'VSC') rc.deployVSC();
        if (n === 'restart' || (was === 'VSC' && n !== 'VSC')) { rc.closePeriod(); rc.set('green'); rc.msg('TRACK CLEAR', 'clear'); }
        if (was === 'SC' && n === 'restart') rc.msg('SAFETY CAR IN THIS LAP', 'sc');
        was = n;
      }
      for (const c of cars) {
        const r = c.r;
        if (c.out && lap >= c.out) { if (!r.retired) { r.retired = true; r.status = 'DNF'; } c.t = Infinity; continue; }
        if (r.retired && c.out == null) { c.out = lap; c.t = Infinity; continue; }
        const base = lapIdeal * (0.978 + 0.85 * Math.max(0, 1 - c.pace)) * (1 + this.weather.wetness * 0.12);
        let t = base * (1 + r.tyres.loss + fuel) * (1 + (R() - 0.5) * 0.006 * (1 + (r.e.humanity ?? 0.3)));
        if (lap === 1) t += 2 + (r.gridPos - 1) * 0.15;
        if (n === 'SC') t = base * 1.45; else if (n === 'VSC') t *= 1.38;
        r.tyres.run(L.length, L.length, n ? 0.4 : 1);
        // Stops: the plan, or a cheap one under the Safety Car / VSC; time penalties served there.
        const cheap = (n === 'SC' || n === 'VSC') && this.cheapStop(r) && R() < 0.85;
        if ((lap === r.pitLap || cheap) && lap < this.laps) {
          t += (n === 'SC' ? 11 : n === 'VSC' ? 12.5 : 21) + R() * 2.5 + r.penalty;
          if (r.penalty) { r.penalty = 0; rc.served(r, 'time'); }
          this.pitDone(r);
        }
        c.t += t; c.lap = t;
        // Now and then the stewards (contact, track limits, the pit lane).
        if (lap > 1 && R() < 0.0035 * (0.5 + (r.e.aggression ?? 0.5))) {
          const reason = ['CAUSING A COLLISION', 'TRACK LIMITS', 'UNSAFE RELEASE', 'LEAVING THE TRACK AND GAINING AN ADVANTAGE'][Math.floor(R() * 4)];
          const pen = reason === 'CAUSING A COLLISION' && R() < 0.3 ? 't10' : 't5';
          rc.penalise(r, pen, reason);
          rc.stewards(`${PEN[pen].name} FOR ${rc.car(r)} - ${reason}`, 'penalty', [r]);
        }
      }
      // Track position: a car within a second of the one ahead stays behind unless much quicker.
      const run = cars.filter((c) => Number.isFinite(c.t)).sort((a, b) => a.t - b.t);
      if (n === 'restart' || (n === 'SC' && neutral.get(lap - 1) !== 'SC')) {
        // Behind the Safety Car the field closes up: nose to tail at the restart.
        for (let k = 1; k < run.length; k++) run[k].t = Math.min(run[k].t, run[k - 1].t + 0.5 + R() * 0.3);
      }
      for (let k = 1; k < run.length; k++) {
        const a = run[k - 1], b = run[k];
        if (b.t - a.t < 0.35 && (n || R() > Math.min(0.9, (a.lap - b.lap) * 1.5))) b.t = a.t + 0.35 + R() * 0.3;
      }
      for (const c of run) { c.r.laps = lap; c.r.last = c.lap; if (c.r.best == null || (!n && c.lap < c.r.best)) c.r.best = c.lap; }
    }
    if (was === 'SC' || was === 'VSC') { rc.closePeriod(); rc.set('green'); }
    for (const c of cars) {
      if (!Number.isFinite(c.t)) { c.r.finished = false; c.r.retired = true; continue; }
      c.r.finished = true; c.r.finishT = c.t + c.r.penalty;
    }
    const f = cars.filter((c) => c.r.best != null && !c.r.retired).sort((a, b) => a.r.best - b.r.best)[0];
    if (f) this.fastest = { time: f.r.best, id: f.r.id };
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
  /** A stop under the Safety Car or the VSC is worth taking (costs about half the usual time)? */
  cheapStop(r) {
    if (this.state !== 'racing' || r.finished || r.retired) return false;
    const left = this.laps - r.laps, last = r.stops[r.stops.length - 1];
    if (left <= 2 || (last && r.laps - last.lap < 4)) return false;
    if (r.pitLap !== Infinity && r.pitLap - r.laps <= Math.max(3, this.laps * 0.25)) return true;
    return r.tyres.wear < 0.5 && left > 4;
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
