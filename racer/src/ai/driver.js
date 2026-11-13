import { G, CAR, downforce, timeGap, speedWhenAt, lockAt, latLimit, brakeLimit, tractionLimit } from './sim2d.js';

/*
 * The AI driver. Plain racecraft, the way a good human races:
 *   - a racing line: the minimum-curvature path between the track limits (using the kerbs), and a
 *     speed for every metre of it from the car's grip (more with downforce), braking and traction;
 *   - three reference lines (racing, full left, full right) so any lateral position has a known safe
 *     speed: running wide to pass or defend costs speed, as it should;
 *   - racecraft: follow, slipstream, pick the side (the inside of the next corner, or the side the car
 *     ahead isn't covering), commit when overlapped, give a car's width side by side, one defensive move
 *     before a braking zone and never once the attacker is alongside, back off rather than hit;
 *   - limits: never aim off the track, recover gently if it does go off;
 *   - a human touch: reaction delay, a little inconsistency, the odd mistake (brakes too late, runs
 *     wide), all scaled by skill and "humanity";
 *   - learn from you: a recorded lap (lateral position and speed along the lap) can replace the line.
 * Track coordinates: s along the lap, lateral + to the left (L.nx, L.nz). Curvature > 0 bends left.
 */

const wrapS = (L, s) => ((s % L.length) + L.length) % L.length;
const dsWrap = (L, a, b) => { let d = b - a; if (d > L.length / 2) d -= L.length; if (d < -L.length / 2) d += L.length; return d; };

/** Speed profile along a path (per-sample curvature k), from grip, braking and power. */
function speedProfile(L, k, car, gripScale = 1, accel = true) {
  const N = k.length, ds = L.ds, c = downforce(car), mu = car.mu * gripScale, vTop = 130; // straights: power and drag (and a tow) decide
  const cap = (car.gripCap ?? 99) * G * gripScale;
  const v = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const kk = Math.abs(k[i]), den = kk - mu * c;
    const vAero = den <= 1e-6 ? vTop : Math.sqrt((mu * G) / den), vCap = kk > 1e-6 ? Math.sqrt(cap / kk) : vTop;   // downforce, then the cap
    v[i] = Math.min(vTop, vAero, vCap);
  }
  const drag = (s, x = 1) => (0.5 * car.rho * car.cda * x * s * s) / car.mass;
  for (let pass = 0; pass < 2; pass++) {
    // Braking (backwards): the decel available after the cornering share, plus drag.
    for (let q = 2 * N; q > 0; q--) {
      const i = q % N, j = (q - 1 + N) % N, vi = v[i], a = latLimit(car, vi, gripScale);
      const lat = Math.min(1, (Math.abs(k[j]) * v[j] * v[j]) / a), lon = brakeLimit(car, vi, gripScale) * Math.sqrt(1 - lat * lat) * 0.95 + drag(vi);
      v[j] = Math.min(v[j], Math.sqrt(vi * vi + 2 * lon * ds));
    }
    // Acceleration (forwards): power-limited, traction-limited. Left out for a driving target: the
    // car's real acceleration (with a tow or DRS) decides how fast it gets there.
    if (accel) for (let q = 0; q < 2 * N; q++) {
      const i = q % N, j = (q + 1) % N, vi = v[i], a = latLimit(car, vi, gripScale);
      const lat = Math.min(1, (Math.abs(k[i]) * vi * vi) / a), straightish = Math.abs(k[i]) < 1 / 450;
      const lon = Math.max(0, Math.min(car.power / (car.mass * Math.max(vi, 4)), tractionLimit(car, vi, gripScale) * Math.sqrt(1 - lat * lat)) - drag(vi, straightish ? car.xDrag ?? 1 : 1));
      v[j] = Math.min(v[j], Math.sqrt(vi * vi + 2 * lon * ds));
    }
  }
  return v;
}

/** Curvature of the path through the points centre + normal * offset (per sample). */
function pathCurvature(L, off) {
  const N = L.N, k = new Float64Array(N);
  const P = (i) => { i = (i + N) % N; return [L.x[i] + L.nx[i] * off[i], L.z[i] + L.nz[i] * off[i]]; };
  const h = Math.max(2, Math.round(6 / L.ds));
  for (let i = 0; i < N; i++) {
    const a = P(i - h), b = P(i), c = P(i + h);
    const abx = b[0] - a[0], abz = b[1] - a[1], bcx = c[0] - b[0], bcz = c[1] - b[1];
    const cross = abx * bcz - abz * bcx, la = Math.hypot(abx, abz), lb = Math.hypot(bcx, bcz), lc = Math.hypot(c[0] - a[0], c[1] - a[1]);
    k[i] = (2 * cross) / Math.max(1e-6, la * lb * lc);
  }
  // Same sign convention as the layout (+ = bends left).
  let dot = 0;
  for (let i = 0; i < N; i += 7) dot += k[i] * L.k[i];
  if (dot < 0) for (let i = 0; i < N; i++) k[i] = -k[i];
  // A car's path doesn't kink: average the curvature over ~16 m.
  const w = Math.max(1, Math.round(8 / L.ds)), sm = new Float64Array(N);
  for (let i = 0; i < N; i++) { let t = 0; for (let d = -w; d <= w; d++) t += k[(i + d + N) % N]; sm[i] = t / (2 * w + 1); }
  return sm;
}

/**
 * The curvature a car actually follows along a line: the faster it goes, the more its path smooths
 * out small wiggles in the line (a driver looks further ahead; the car can't change direction that
 * quickly), so the averaging grows with speed, about the steering look-ahead. Hairpins stay sharp,
 * fast sweeps aren't capped by kinks where the line meets the track limits. Without it the plan sat
 * ~9% under what the car can do, and a human driving at the real limit was far quicker.
 */
function drivenCurvature(L, off, car) {
  const N = L.N, k = pathCurvature(L, off), v = speedProfile(L, k, car), sm = new Float64Array(N);
  const pre = new Float64Array(3 * N + 1);           // prefix sums over three laps: any window wraps
  for (let i = 0; i < 3 * N; i++) pre[i + 1] = pre[i] + k[i % N];
  for (let i = 0; i < N; i++) {
    // Sized from the slowest speed within reach, so it shrinks on the way into a slow corner and a
    // chicane at the end of a straight isn't blurred into the straight.
    const span = (vv) => Math.round(Math.min(45, Math.max(8, (7 + 0.32 * vv) * 0.9)) / L.ds);
    let vMin = v[i]; const w0 = span(v[i]);
    for (let d = -2 * w0; d <= 2 * w0; d++) vMin = Math.min(vMin, v[(i + d + N) % N]);
    const w = span(vMin);
    sm[i] = (pre[i + w + N + 1] - pre[i - w + N]) / (2 * w + 1);
  }
  return sm;
}

/**
 * Plan for a circuit: the racing line (lateral offset per sample), how far each side the car may go,
 * and speed profiles for the racing line and for the far left and right of the road.
 */
export function planTrack(L, car = CAR) {
  const N = L.N, half = car.width / 2;
  const limL = new Float64Array(N), limR = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const kerbL = L.kerb?.L?.[i] > 0.5 ? L.kerbW * 0.8 : 0, kerbR = L.kerb?.R?.[i] > 0.5 ? L.kerbW * 0.8 : 0;
    limL[i] = Math.min(L.halfW + kerbL, L.wall.L[i] - 0.9) - half - 0.15;
    limR[i] = Math.min(L.halfW + kerbR, L.wall.R[i] - 0.9) - half - 0.15;
  }
  // Minimum-curvature line: relax each point toward the midpoint of its neighbours, within the limits.
  // Coarse to fine (neighbours ~64 m apart down to 6 m): a one-scale relaxation only reaches a few
  // tens of metres, so the line hugged the inside of every corner; this gives the real out-in-out,
  // wide on the way in, the apex, and out to the far side on the exit.
  const off = new Float64Array(N);
  for (const [step, its] of [[32, 160], [16, 160], [8, 200], [4, 240], [3, 300]]) for (let it = 0; it < its; it++) {
    for (let i = 0; i < N; i++) {
      const a = (i - step + N) % N, b = (i + step) % N;
      const ax = L.x[a] + L.nx[a] * off[a], az = L.z[a] + L.nz[a] * off[a];
      const bx = L.x[b] + L.nx[b] * off[b], bz = L.z[b] + L.nz[b] * off[b];
      const mx = (ax + bx) / 2, mz = (az + bz) / 2;
      const t = off[i] + ((mx - L.x[i]) * L.nx[i] + (mz - L.z[i]) * L.nz[i] - off[i]) * 0.6;
      off[i] = Math.max(-limR[i], Math.min(limL[i], t));
    }
  }
  // Then from the driver's point of view: what costs is the lateral g, curvature times speed squared,
  // so bending the line on a fast straight is expensive and in a slow corner cheap. Weighting each
  // point's curvature by its speed keeps the straights straight and out wide: the car stays on the
  // outside to the braking zone, turns in late and sweeps a far bigger radius through the corner,
  // instead of drifting across the straight and arriving at a hairpin from the middle.
  speedWeightedLine(L, off, limL, limR, car);
  const line = off;
  const kLine = drivenCurvature(L, line, car);
  const wideL = Float64Array.from(limL), wideR = Float64Array.from(limR, (v) => -v);
  const kWideL = drivenCurvature(L, wideL, car), kWideR = drivenCurvature(L, wideR, car);
  // Each corner (a run of samples tighter than ~140 m) gets a fixed id, so per-corner decisions
  // (a brake-point error, a mistake) are made once per corner, not every frame on the way in.
  const cornerId = new Int32Array(N).fill(-1);
  let id = 0;
  for (let i = 0; i < N; i++) if (Math.abs(kLine[i]) > 1 / 140) { cornerId[i] = (i > 0 && cornerId[i - 1] >= 0) ? cornerId[i - 1] : id++; }
  if (cornerId[0] >= 0 && cornerId[N - 1] >= 0) { const a = cornerId[0]; for (let i = 0; i < N && cornerId[i] === a; i++) cornerId[i] = cornerId[N - 1]; }
  return {
    cornerId,
    L, car, line, limL, limR,
    vLine: speedProfile(L, kLine, car), vLeft: speedProfile(L, kWideL, car), vRight: speedProfile(L, kWideR, car),
    // The same without the acceleration pass: corner and braking limits only (what a driver aims at).
    vLeftB: speedProfile(L, kWideL, car, 1, false), vRightB: speedProfile(L, kWideR, car, 1, false), vLineB: speedProfile(L, kLine, car, 1, false),
    kLine, wideL, wideR,
  };
}

/**
 * Minimise sum w_i D_i^2 by projected gradient descent on the lateral offsets, where D_i is how far
 * point i sits off the midpoint of its neighbours (a curvature measure) and w_i grows with the speed
 * the line allows there (from the previous pass). Coarse to fine, two re-weightings.
 */
function speedWeightedLine(L, off, limL, limR, car) {
  const N = L.N, D = new Float64Array(N), w = new Float64Array(N);
  for (let pass = 0; pass < 2; pass++) {
    const v = speedProfile(L, pathCurvature(L, off), car);
    let mean = 0; for (let i = 0; i < N; i++) mean += v[i] / N;
    for (let i = 0; i < N; i++) w[i] = Math.max(0.15, Math.min(4, (v[i] / mean) ** 2));
    for (const [step, its] of [[16, 150], [8, 200], [4, 250], [3, 300]]) for (let it = 0; it < its; it++) {
      for (let i = 0; i < N; i++) {
        const a = (i - step + N) % N, b = (i + step) % N;
        const mx = (L.x[a] + L.nx[a] * off[a] + L.x[b] + L.nx[b] * off[b]) / 2, mz = (L.z[a] + L.nz[a] * off[a] + L.z[b] + L.nz[b] * off[b]) / 2;
        D[i] = (mx - L.x[i]) * L.nx[i] + (mz - L.z[i]) * L.nz[i] - off[i];   // + : the midpoint is to the left
      }
      for (let i = 0; i < N; i++) {
        const a = (i - step + N) % N, b = (i + step) % N;
        // d/d off_i of sum w D^2: its own D (moving i toward its midpoint) and its neighbours' (i is half their midpoint).
        const g = -w[i] * D[i] + 0.5 * (w[a] * D[a] + w[b] * D[b]);
        off[i] = Math.max(-limR[i], Math.min(limL[i], off[i] - 0.25 * g / 4));
      }
    }
  }
}

/** The safe speed at sample i for a given lateral offset (between the three reference lines). */
function speedAt(plan, i, lat, line = plan.line, vLine = plan.vLine, limitsOnly = false) {
  const r = line[i], vl = limitsOnly && vLine === plan.vLine && plan.vLineB ? plan.vLineB[i] : vLine[i], vL = limitsOnly ? plan.vLeftB : plan.vLeft, vR = limitsOnly ? plan.vRightB : plan.vRight;
  if (lat >= r) { const t = Math.min(1, (lat - r) / Math.max(0.5, plan.wideL[i] - r)); return vl * (1 - t) + Math.min(vl, vL[i]) * t; }
  const t = Math.min(1, (r - lat) / Math.max(0.5, r - plan.wideR[i])); return vl * (1 - t) + Math.min(vl, vR[i]) * t;
}

/** Next real corner ahead of s (within range): its sample, direction (+1 left) and distance. */
function nextCorner(plan, s, range = 420) {
  const L = plan.L;
  for (let d = 20; d < range; d += 6) {
    const i = Math.floor(wrapS(L, s + d) / L.ds) % L.N;
    if (Math.abs(plan.kLine[i]) > 1 / 140) return { i, id: plan.cornerId[i], dir: Math.sign(plan.kLine[i]), dist: d, v: plan.vLine[i] };
  }
  return null;
}

// Each driver has its own random stream (its line, temperament, mistakes), so one driver's
// behaviour doesn't depend on how many others were created before it.
let nextSeed = 1;
const makeRng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

export class AIDriver {
  /**
   * opts: skill 0.85..1 (share of the grip used), aggression 0..1 (how early it attacks, how late it
   * brakes alongside), humanity 0..1 (reaction delay, inconsistency, mistakes).
   */
  constructor(plan, { skill = 0.95, pace = 0.97, aggression = 0.5, humanity = 0.3, name = 'AI', seed = nextSeed++ } = {}) {
    this.rand = makeRng((seed * 2654435761) >>> 0);
    // pace: the car (share of the grip it has); skill: the driver (how tidy the line, how precise the braking).
    Object.assign(this, { plan, skill, pace, aggression, humanity, name });
    this.state = 'race'; this.note = '';
    this.side = 0;            // tactical offset target relative to the line (m), eased
    this.tactical = 0;
    this.defended = false;    // one move per straight
    this.mistake = null;
    this.react = 0.12 + humanity * 0.25; // s
    this.patience = this.rand();   // temperament: patient drivers sit in the tow until there's a real chance
    this.form = 1; this.formLap = -1;
    this.seen = [];           // delayed view of the others
    this.copy = null;         // { lat: Float64Array, v: Float64Array } learned from a human lap
    this.copyBlend = 0;
    this.cornerJitter = new Map();
    // Every driver has its own line: an earlier or later apex, and a small personal wander.
    const L = plan.L, N = L.N;
    const sloppy = Math.max(0, 1 - skill);                             // 0 for a perfect driver
    this.apexShift = Math.round((this.rand() - 0.5) * (4 + sloppy * 30));  // samples (~2 m each): early or late apex
    const f1 = 5 + Math.floor(this.rand() * 6), f2 = 11 + Math.floor(this.rand() * 8), p1 = this.rand() * 6.28, p2 = this.rand() * 6.28, A = 0.2 + sloppy * 4 * (0.6 + this.rand() * 0.6);
    const raw = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const j = (i - this.apexShift + N) % N, t = (i / N) * Math.PI * 2;
      raw[i] = plan.line[j] + A * (0.6 * Math.sin(f1 * t + p1) + 0.4 * Math.sin(f2 * t + p2)) - plan.line[i];
    }
    // Its own line has its own corner speeds. What it costs over a lap is down to skill (a tidy
    // driver loses ~0.3%, a scruffy one ~1%), not to luck: kinks where the shifted line meets the
    // track limits are smoothed out, and a line that still costs more than that is drawn back toward
    // the ideal; one that comes out quicker is driven a touch slower. Where it gains and loses
    // still differs corner by corner from driver to driver.
    const lapTime = (v) => { let t = 0; for (let i = 0; i < N; i++) t += L.ds / v[i]; return t; };
    plan.lapIdeal ??= lapTime(plan.vLine);
    const target = plan.lapIdeal * (1 + 0.002 + sloppy * 0.07);
    const build = (w) => {
      const line = new Float64Array(N);
      for (let i = 0; i < N; i++) line[i] = Math.max(-plan.limR[i], Math.min(plan.limL[i], plan.line[i] + raw[i] * w));
      if (w > 0) for (let pass = 0; pass < 8; pass++) for (let i = 0; i < N; i++) {
        const v = (line[(i - 1 + N) % N] + 2 * line[i] + line[(i + 1) % N]) / 4;
        line[i] = Math.max(-plan.limR[i], Math.min(plan.limL[i], v));
      }
      const k = drivenCurvature(L, line, plan.car);
      return { line, k, v: speedProfile(L, k, plan.car) };
    };
    let mine = build(1);
    for (const w of [0.7, 0.45, 0.2, 0]) { if (lapTime(mine.v) <= target) break; mine = build(w); }
    this.lineFix = Math.min(1, lapTime(mine.v) / target); // a line that came out quicker than the driver: driven a touch slower
    this.myLine = mine.line; this.myK = mine.k;
    this.setPace(pace);
  }

  /**
   * The car's pace (0.9..1): how much grip and power it has, as profiles the driver follows. Slower
   * cars carry less speed through the corners (less grip: the profile is built with it, so they still
   * brake at their own limit, late and hard, never early on a scaled-down curve) and have less power
   * on the straights. Half the deficit each way, so a car 2% down is ~1% slower in the corners.
   */
  setPace(pace) {
    this.pace = pace;
    const deficit = Math.max(0, 1 - pace), corner = (1 - deficit * 0.55) * this.lineFix, L = this.plan.L;
    const grip = corner * corner;
    this.vMine = speedProfile(L, this.myK, this.plan.car, grip);
    this.vMineB = speedProfile(L, this.myK, this.plan.car, grip, false);
    // Straights: top speed ~ power^1/3. Never more power than the player's car.
    this.power = Math.min(1, 1 - deficit * 0.9) ** 3;
  }

  /** Learn from a recorded human lap (lateral and speed per sample); blend 0..1. */
  learn(rec, blend = 1) { this.copy = rec; this.copyBlend = blend; }

  /** Decide the inputs for `me` given the other cars. Returns { steer, throttle, brake }. */
  drive(me, others, dt, time) {
    const plan = this.plan, L = plan.L, N = L.N;
    const u = Math.max(0, me.u);
    if (me.lap !== this.formLap) { this.formLap = me.lap; this.form = 1 + (this.rand() - 0.5) * 0.008 * (0.5 + this.humanity); }
    const i = Math.floor(wrapS(L, me.s) / L.ds) % N;
    // ---- what it sees, after its reaction time ----
    this.seen.push({ t: time, cars: others.map((o) => ({ ref: o, s: o.s, lat: o.lateral, u: o.u })) });
    while (this.seen.length > 2 && this.seen[1].t <= time - this.react) this.seen.shift();
    // Humans react late but anticipate: project what was seen forward by the delay.
    const lag = time - this.seen[0].t;
    const view = this.seen[0].cars.map((c) => ({ ref: c.ref, s: c.s + c.u * lag, lat: c.ref.lateral * 0.5 + c.lat * 0.5, u: c.u }));
    // ---- reference line and speed (its own, or a learned human lap) ----
    const lineAt = (j) => (this.copy ? this.myLine[j] * (1 - this.copyBlend) + this.copy.lat[j] * this.copyBlend : this.myLine[j]);
    // Clean-air pace (with the acceleration out of corners), or with limitsOnly what it aims at: the
    // corner and braking limits only, so a tow or DRS on a straight is never braked away.
    const vRefAt = (j, lat, limitsOnly = false) => {
      let v = limitsOnly ? speedAt(plan, j, lat, this.myLine, this.vMineB, true) : speedAt(plan, j, lat, this.myLine, this.vMine);
      const humanAccel = this.copy && this.copy.v[(j + 1) % N] > this.copy.v[j] + 0.05;
      if (this.copy && !(limitsOnly && humanAccel)) v = v * (1 - this.copyBlend) + Math.min(v * 1.03, this.copy.v[j]) * this.copyBlend;
      return v * (this.paceMul ?? 1) * this.form * Math.sqrt((me.gripFactor ?? 1) * (me.weatherGrip ?? 1)); // (the car's pace is in its profiles)
    };
    // ---- racecraft ----
    const corner = nextCorner(plan, me.s);
    const W = me.p.width, LEN = me.p.length;
    let ahead = null, behind = null;
    const near = [];
    for (const o of view) {
      const d = dsWrap(L, me.s, o.s), dl = o.lat - me.lateral;
      if (Math.abs(d) < LEN + 1 && Math.abs(dl) < W + 1.6) near.push({ o, d, dl });
      if (d > 0 && d < 140 && (!ahead || d < ahead.d)) ahead = { o, d, dl };
      if (d < 0 && d > -70 && (!behind || d > behind.d)) behind = { o, d, dl };
    }
    const lineHere = lineAt(i), limL = plan.limL[i], limR = -plan.limR[i];
    // Where this car is, counted in another car's own race distance (cars in a practice session are on
    // different laps of their own runs; in a race it's the same as me.progress).
    const inFrame = (o) => ({ progress: o.progress + dsWrap(L, o.s, me.s), u: me.u });
    let target = 0;
    this.note = '';
    // Is the car ahead slower than us over the next stretch (we'd catch it)? Compare reference speeds.
    const pace = (o) => o.u;
    const closing = ahead ? u - pace(ahead.o) : 0;
    const myPace = vRefAt(i, lineHere), sameLane = ahead && Math.abs(ahead.o.lat - me.lateral) < W + 0.5;
    // Attack only when close and catching (or already alongside it); drop it once it gets away again.
    // Quicker than the car ahead? Compare the speed it had at each spot with what this driver would
    // do there in clean air, averaged over a few seconds: a real sense of pace, not a moment's closing
    // speed (sat in its tow there is none). Clearly quicker (by more than its patience allows): close
    // right up and have a go.
    if (ahead && ahead.d < 100 && u > 15 && time > 12) {
      const vThen = speedWhenAt(ahead.o.ref, inFrame(ahead.o.ref).progress);
      if (vThen !== null) { const mine = vRefAt(i, lineHere), k = Math.min(1, dt / 4); this.faster = (this.faster ?? 0) * (1 - k) + Math.max(-0.1, Math.min(0.1, (mine - vThen) / mine)) * k; }
    } else this.faster = (this.faster ?? 0) * (1 - Math.min(1, dt / 4));
    const quicker = this.faster > 0.004 + this.patience * 0.01;
    const heldUpNow = (this.heldUp ?? 0) > 1 + this.patience * 4 || quicker;
    const strike = heldUpNow ? 20 + u * 0.6 : 10 + u * (0.22 + this.aggression * 0.12);   // held up: close in and have a go
    // An attack that isn't working (no overlap after a few seconds) is given up: back into the tow for a
    // while rather than weaving behind it for a whole lap.
    if (this.state === 'attack' && ahead && ahead.d > LEN * 0.9 && time - this.attackSince > 3 + this.aggression * 4 && closing < 0.3) { this.passCool = time + 2 + this.patience * 4; this.state = 'race'; }   // (still closing down a long straight: keep at it)
    const cooling = (this.passCool ?? 0) > time;
    const keep = this.state === 'attack' && ahead && ahead.d < strike + 18 && !this.noPass; // (no passing on a formation lap)
    const theirSlip = ahead && (ahead.o.ref.mistakeUntil ?? 0) > time;                // they've just made a mistake: go
    const heldUp = heldUpNow;                                                         // stuck behind a slower car long enough, or plainly quicker
    const lap1Brake = me.lap < 1 && corner && corner.dist < 110 && ahead && ahead.d > LEN * 0.9; // opening lap: no lunges into a braking zone from behind
    const wantPass = ahead && !this.noPass && !lap1Brake && !(cooling && closing < 3) && (closing > 0.4 + this.patience * 1.6 || theirSlip || heldUp || (me.slipFactor < 0.85 && closing > 0.2 + this.patience));
    if (ahead && ((ahead.d < strike && wantPass) || keep)) {
      // Attack: the inside of the next corner if it's free, else the side they aren't covering.
      const theirs = ahead.o.lat;
      // Room on a side: to the track edge, minus any other car already there around the car ahead.
      const room = (sd) => {
        let r = sd > 0 ? limL - theirs : theirs - limR;
        for (const o of view) { if (o === ahead.o) continue; const dd = dsWrap(L, me.s, o.s); if (dd > -LEN && dd < ahead.d + LEN + 4) { const rel = (o.lat - theirs) * sd; if (rel > 0) r = Math.min(r, rel - W * 0.5 - 0.4); } }
        return r;
      };
      let side = this.attackSide || (corner ? corner.dir : (theirs >= lineHere ? -1 : 1));
      if (ahead.o.ref.yieldSide) side = -ahead.o.ref.yieldSide; // it's moving aside: pass on the other side
      if (room(side) < W + 1.0) side = -side;
      if (room(side) >= W + 1.0) {
        this.attackSide = side;
        if (this.state !== 'attack') this.attackSince = time;
        this.state = 'attack';
        // Set it up: through the corners stay tucked in on the line (off-line there only loses time),
        // pull out on the straight (the tow and DRS do the work), then brake later on the inside.
        // Pull out only while there's straight left to use: not alongside (at least a nose on the
        // inside) by the braking point, tuck back in so the corner isn't taken off the line.
        const brakeAt = corner ? Math.max(0, (u * u - corner.v * corner.v) / 60) + u * 1.0 : 0;
        // "Straight": anywhere flat out with grip to spare (Austria's straights curve gently, R 300-600 m).
        const flat = Math.abs(plan.kLine[i]) < 1 / 350 || u * u * Math.abs(plan.kLine[i]) < 0.4 * latLimit(me.p, u);
        const straightHere = flat && (!corner || corner.dist > 30 + brakeAt);
        const overlap = ahead.d < LEN * (corner && side === corner.dir ? 1.5 : 0.9);
        if (straightHere || overlap) { target = theirs + side * (W + 1.0) - lineHere; this.note = `OVERTAKE ${side > 0 ? 'L' : 'R'}`; }
        else { target = 0; this.note = 'SET UP'; }
      } else { this.state = 'follow'; this.attackSide = 0; this.note = 'FOLLOW'; target = theirs - lineHere; }
    } else { this.state = 'race'; this.attackSide = 0; }
    // Defend: a car closing behind, a braking zone coming: one move to cover the inside, made early;
    // never once the attacker has a wheel alongside.
    if (behind && this.state === 'race') {
      // Only against a real threat: close enough to try a move into this corner (within ~0.3 s, or
      // further back but coming much faster), not anyone in the mirrors.
      const theyClose = behind.d > -(LEN * 2 + Math.max(0, behind.o.u - u) * 2.5);
      const overlapped = behind.d > -LEN * 0.85;
      if (theyClose && corner && corner.dist < 160 + u * 1.2 && corner.dist > 50 && !overlapped && !this.defended && this.aggression > 0.15) {
        this.defendDir = corner.dir; this.defended = true;
      }
    }
    if (!corner || corner.dist > 300 + u) this.defended = false;
    if (this.defendDir && corner && corner.dist > 25 + u * 0.4) {
      // Cover the inside by about a car's width off the line (not the kerb: that wrecks the corner).
      const edge = this.defendDir > 0 ? limL - 0.6 : limR + 0.6;
      target = this.defendDir > 0 ? Math.min(edge, lineHere + W + 1.2) - lineHere : Math.max(edge, lineHere - W - 1.2) - lineHere;
      this.note = this.note || 'DEFEND';
    } else this.defendDir = 0;
    // Side by side: hold a car's width of space (the car behind gives way more than the one ahead).
    let yield_ = false;
    for (const a of near) {
      const gap = Math.abs(a.dl), need = W + 0.8;
      if (gap < need) {
        const share = a.d > 0 ? 1.4 : 0.6;
        target += -Math.sign(a.dl || (a.d > 0 ? 1 : -1)) * (need - gap) * share;
        this.note = this.note || 'SPACE';
      }
      // Turn-in: on the outside with the other car on the inside and overlapping (its nose at least
      // ~40% of a car alongside), give it the corner rather than turn across it.
      const theyInside = corner && Math.sign(a.dl) === corner.dir, overlap = a.d > -LEN * 0.6;
      if (corner && corner.dist < 45 && overlap && theyInside) yield_ = true;
      // Into a slow corner side by side and not ahead: tuck in behind, don't force it, unless this car
      // has the inside and a real overlap (then the corner is its, and the car outside yields).
      if (corner && corner.v < 42 && corner.dist < 90 && a.d > 1.2 && (theyInside || a.d > LEN * 0.6)) yield_ = true;
      // A wheel behind and door to door, closer than a car's width of air: drop in behind it now
      // rather than lean on it (out of a slow corner the exit lines converge).
      if (a.d > 0.5 && a.d < LEN + 0.8 && Math.abs(a.dl) < W + 0.5) this.dropBehind = Math.min(this.dropBehind ?? Infinity, a.o.ref.u - 1.5);
    }
    // An instruction from outside (a slow lap pulling aside for a car on a flying lap, lining up for the pits).
    if (this.offset) { target = this.offset - lineHere; this.note = this.note || 'ASIDE'; }
    // Ease the tactical offset (a human moves across the track over a second or so).
    this.tactical += (target - this.tactical) * Math.min(1, dt * (1.4 + this.aggression * 1.2));
    // ---- where to aim ----
    const look = 7 + u * 0.32;
    const sa = wrapS(L, me.s + look), ja = Math.floor(sa / L.ds) % N;
    let lat = lineAt(ja) + this.tactical;
    // Alongside another car: a hard corridor, never steer into the space it occupies.
    let lo = -plan.limR[ja], hi = plan.limL[ja];
    for (const a of near) {
      if (Math.abs(a.d) > LEN + 0.8) continue;
      if (a.dl > 0) hi = Math.min(hi, a.o.lat - (W + 1.0)); else lo = Math.max(lo, a.o.lat + (W + 1.0));
    }
    this.squeezed = lo > hi;                                  // three wide, no room: back out of it
    if (this.squeezed) { const m = (lo + hi) / 2; lo = hi = m; }
    lat = Math.max(lo, Math.min(hi, Math.max(-plan.limR[ja], Math.min(plan.limL[ja], lat))));
    // Keep the eased tactical offset consistent with the corridor so it doesn't fight it next frame.
    this.tactical = Math.max(lo - lineAt(ja), Math.min(hi - lineAt(ja), this.tactical));
    const off = me.surface === 'grass' || me.surface === 'gravel';
    if (off) { lat *= 0.6; this.note = 'RECOVER'; }
    const q = L.poseAt(sa, lat);
    const fx = Math.cos(me.h), fz = Math.sin(me.h), dx = q.x - me.x, dz = q.z - me.z;
    const alpha = Math.atan2(fx * dz - fz * dx, fx * dx + fz * dz);
    const delta = Math.atan((2 * me.p.wheelbase * Math.sin(alpha)) / look);
    let steer = delta / lockAt(me.p, u) - me.r * 0.04;
    steer = Math.max(-1, Math.min(1, steer));
    // ---- speed ----
    let vT = this.speedCap ?? Infinity; // (a formation lap: a steady speed, never flat out on the straights)
    for (let d = 0; d < 3 + u * 0.05; d += 2) { const j = Math.floor(wrapS(L, me.s + d) / L.ds) % N; vT = Math.min(vT, vRefAt(j, lineAt(j) + this.tactical, true)); } // a short look: the brake goes on at the braking point, not before
    // Attacking on the inside into a corner: brake a little later (aggression), it's how passes happen.
    if (this.state === 'attack' && corner && corner.dist < 120 && this.attackSide === corner.dir) vT *= 1 + this.aggression * 0.025;
    // Human inconsistency: each corner gets a small brake-point error, and now and then a minor
    // mistake that costs time (braked too early, a scruffy exit, a lock-up running a little wide).
    if (corner) {
      const cid = `${me.lap}:${corner.id}`;              // once per corner per lap
      if (!this.cornerJitter.has(cid)) {
        const err = (this.rand() - 0.5) * (this.humanity * 0.02 + (1 - this.skill) * 0.15);   // imprecise braking
        const m = this.rand() < this.humanity * 0.035 ? ['early', 'exit', 'exit', 'lock'][Math.floor(this.rand() * 4)] : null;
        this.cornerJitter.set(cid, { err, m, sev: 0.5 + this.rand() * 0.5 });
      }
      const jt = this.cornerJitter.get(cid);
      if (corner.dist < 120) {
        vT *= 1 + jt.err;
        if (jt.m === 'early') { vT *= 1 - 0.08 * jt.sev; this.note = 'MISTAKE'; me.mistakeUntil = time + 2; }
        if (jt.m === 'lock' && corner.dist < 60) { vT *= 1 + 0.04 * jt.sev; this.note = 'MISTAKE'; me.mistakeUntil = time + 2.5; }
        if (jt.m === 'exit' && corner.dist < 30) { this.exitUntil = me.s + 70; this.exitSev = jt.sev; }
      }
    }
    if (this.exitUntil !== undefined && dsWrap(L, me.s, this.exitUntil) > 0) { vT *= 1 - 0.1 * this.exitSev; this.note = 'MISTAKE'; me.mistakeUntil = time + 2; }
    else this.exitUntil = undefined;
    // Tag along: not quick enough to pass, sit in the tow at the driver's own comfortable gap.
    const free = vT;                                                                      // what it could do in clear air
    if (ahead && this.state !== 'attack' && ahead.d < 60 + u * 0.6) {
      const hw = LEN + u * (heldUpNow ? 0.18 : me.lap < 1 ? 0.2 + this.patience * 0.15 : 0.3 + this.patience * 0.45);    // held up: on its gearbox; opening lap: nose to tail
      if (ahead.d < hw && Math.abs(ahead.o.lat - me.lateral) < W + 1) { vT = Math.min(vT, ahead.o.u + (ahead.d - hw) * 0.25); this.note = this.note || 'TOW'; }
    }
    // Held up: the car ahead is slower than this driver could go here. It adds up, then it attacks.
    if (ahead && ahead.d < 70 && Math.min(free, myPace) > ahead.o.u + 0.8) this.heldUp = (this.heldUp ?? 0) + dt;
    else this.heldUp = Math.max(0, (this.heldUp ?? 0) - dt * 0.5);
    if (this.state === 'attack' && ahead && ahead.d < 0) this.heldUp = 0;
    // Opening lap: a touch more margin into the braking zones while still in a crowd.
    if (me.lap < 1 && corner && corner.dist < 140 && ahead && ahead.d < 40 && Math.abs(ahead.dl) < W + 0.5) vT *= 0.99; // opening lap: a touch more margin behind the car in front
    if (this.cornerJitter.size > 120) this.cornerJitter.clear();
    if (this.dropBehind !== undefined) { vT = Math.min(vT, this.dropBehind); this.note = 'YIELD'; this.dropBehind = undefined; }
    if (yield_) { vT *= 0.93; this.note = 'YIELD'; }
    if (this.squeezed) { vT *= 0.9; this.note = 'BACK OFF'; }
    // Never into the back of the car ahead: if it's in our path (where we're heading, not just where
    // we are), keep a following gap that shrinks with confidence, brake to its speed if closer.
    // The car to keep clear of is the nearest one in our path, not just the nearest one ahead (in a pack
    // the nearest can be in the next lane while the one we'd hit is a few metres further on).
    const pathLat = me.lateral + (this.tactical + lineHere - me.lateral) * 0.5;
    const wide = me.lap < 1 ? 0.8 : 0;                                     // opening lap: a crowd, give everyone room
    const inPathOf = (o) => Math.abs(o.lat - me.lateral) < W + 0.5 + wide || Math.abs(o.lat - pathLat) < W + 0.3 + wide;
    let blocker = null;
    for (const o of view) { const dd = dsWrap(L, me.s, o.s); if (dd > 0 && dd < 160 && inPathOf(o) && (!blocker || dd < blocker.d)) blocker = { o, d: dd, dl: o.lat - me.lateral }; }
    if (blocker) {
      const ahead = blocker;
      {
        // Following: drive the speed the car ahead had at this same spot, a touch slower if inside the
        // driver's following gap (outside it, its own pace). Braking where it braked keeps the
        // gap through a braking zone without each car in a queue braking earlier than the one ahead.
        // A hard check underneath: could it still stop behind it if that car stopped dead from now?
        // (Braking a(v) = A + B v^2, the car's real brakes (sim2d brakeLimit): a stop from v takes
        // ln(1 + B v^2 / A) / (2 B) metres.)
        const them = ahead.o.ref, theirU = them.u, gap = ahead.d;
        const A = brakeLimit(me.p, 0), B = Math.max(1e-6, (brakeLimit(me.p, 50) - A) / 2500);
        const mine = inFrame(them), vThen = speedWhenAt(them, mine.progress), gapT = timeGap(them, mine, time);
        const want = this.react * 0.6 + 0.12 - this.aggression * 0.06 + (me.lap < 1 ? 0.08 : 0);   // s
        let vSafe = Infinity;
        // Only where it was slower there than this car is now (braking zones, corners): on a straight
        // the tow is free to close the gap for a move.
        // (Not on a straight both are accelerating down: there a quicker car must be free to close in,
        // get into the tow and make a run, rather than mirror the slower car's speed half a second back.)
        const brakingZone = vRefAt(i, lineHere, true) < u + 6;
        if (vThen !== null && gapT !== null && gapT < want && vThen < u && brakingZone) vSafe = vThen * (1 - Math.min(0.08, (want - gapT) * 0.25));
        const minGap = LEN + 1.0, stopThem = Math.log(1 + (B * theirU * theirU) / A) / (2 * B * 0.95);
        const room = gap - minGap + stopThem;
        vSafe = Math.min(vSafe, gap > minGap ? Math.sqrt((A * (Math.exp(Math.min(30, 2 * B * 0.9 * room)) - 1)) / B) : theirU - (minGap - gap) * 0.5);
        if (vSafe < vT) { vT = vSafe; this.note = this.note || 'BRAKE'; }
      }
    }
    if (off) vT = Math.min(vT, 30);
    void myPace; void sameLane;
    // Pedals: firm, like a driver (no hovering); trail off the brake into the corner.
    const err = vT - u;
    let throttle = err > 0 ? Math.min(1, err * 0.5 + 0.05) : 0;
    let brake = err < -0.25 ? Math.min(1, -err * 0.6) : 0; // hard on the brake at the point, then trailed off as the speed comes down to the corner's
    if (Math.abs(steer) > 0.85 && u > 25) throttle *= 0.5;                               // patience on exit
    throttle *= this.power;
    return { steer, throttle, brake };
  }
}

/** Record a human lap for the AI to learn from: lateral and speed per sample. */
export class LapRecorder {
  constructor(L) { this.L = L; this.reset(); }
  reset() { this.lat = new Float64Array(this.L.N).fill(NaN); this.v = new Float64Array(this.L.N).fill(NaN); this.count = 0; }
  add(car) {
    const i = Math.floor(wrapS(this.L, car.s) / this.L.ds) % this.L.N;
    if (Number.isNaN(this.lat[i])) this.count++;
    this.lat[i] = car.lateral; this.v[i] = car.u;
  }
  /** A clean record (gaps filled by interpolation) once the lap is mostly covered, else null. */
  finish() {
    const N = this.L.N;
    if (this.count < N * 0.85) return null;
    const fill = (a) => { const out = Float64Array.from(a); for (let i = 0; i < N; i++) if (Number.isNaN(out[i])) { let p = i, q = i; while (Number.isNaN(a[(p + N) % N])) p--; while (Number.isNaN(a[q % N])) q++; const A = a[(p + N) % N], B = a[q % N]; out[i] = A + ((B - A) * (i - p)) / (q - p); } return out; };
    return { lat: fill(this.lat), v: fill(this.v) };
  }
}
