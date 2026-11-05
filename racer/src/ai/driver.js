import { G, CAR, downforce } from './sim2d.js';

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
function speedProfile(L, k, car, gripScale = 1) {
  const N = k.length, ds = L.ds, c = downforce(car), mu = car.mu * gripScale, vTop = 130; // straights: power and drag (and a tow) decide
  const v = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const kk = Math.abs(k[i]), den = kk - mu * c;
    v[i] = den <= 1e-6 ? vTop : Math.min(vTop, Math.sqrt((mu * G) / den));
  }
  const drag = (s) => (0.5 * car.rho * car.cda * s * s) / car.mass;
  for (let pass = 0; pass < 2; pass++) {
    // Braking (backwards): the decel available after the cornering share, plus drag.
    for (let q = 2 * N; q > 0; q--) {
      const i = q % N, j = (q - 1 + N) % N, vi = v[i], a = mu * (G + c * vi * vi);
      const lat = Math.min(1, (Math.abs(k[j]) * v[j] * v[j]) / a), lon = a * Math.sqrt(1 - lat * lat) * 0.95 + drag(vi);
      v[j] = Math.min(v[j], Math.sqrt(vi * vi + 2 * lon * ds));
    }
    // Acceleration (forwards): power-limited, traction-limited.
    for (let q = 0; q < 2 * N; q++) {
      const i = q % N, j = (q + 1) % N, vi = v[i], a = mu * (G + c * vi * vi);
      const lat = Math.min(1, (Math.abs(k[i]) * vi * vi) / a);
      const lon = Math.max(0, Math.min(car.power / (car.mass * Math.max(vi, 4)), a * Math.sqrt(1 - lat * lat)) - drag(vi));
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
  const off = new Float64Array(N), step = 3;
  for (let it = 0; it < 900; it++) {
    for (let i = 0; i < N; i++) {
      const a = (i - step + N) % N, b = (i + step) % N;
      const ax = L.x[a] + L.nx[a] * off[a], az = L.z[a] + L.nz[a] * off[a];
      const bx = L.x[b] + L.nx[b] * off[b], bz = L.z[b] + L.nz[b] * off[b];
      const mx = (ax + bx) / 2, mz = (az + bz) / 2;
      const t = off[i] + ((mx - L.x[i]) * L.nx[i] + (mz - L.z[i]) * L.nz[i] - off[i]) * 0.6;
      off[i] = Math.max(-limR[i], Math.min(limL[i], t));
    }
  }
  const line = off;
  const kLine = pathCurvature(L, line);
  const wideL = Float64Array.from(limL), wideR = Float64Array.from(limR, (v) => -v);
  return {
    L, car, line, limL, limR,
    vLine: speedProfile(L, kLine, car), vLeft: speedProfile(L, pathCurvature(L, wideL), car), vRight: speedProfile(L, pathCurvature(L, wideR), car),
    kLine, wideL, wideR,
  };
}

/** The safe speed at sample i for a given lateral offset (between the three reference lines). */
function speedAt(plan, i, lat) {
  const r = plan.line[i];
  if (lat >= r) { const t = Math.min(1, (lat - r) / Math.max(0.5, plan.wideL[i] - r)); return plan.vLine[i] * (1 - t) + Math.min(plan.vLine[i], plan.vLeft[i]) * t; }
  const t = Math.min(1, (r - lat) / Math.max(0.5, r - plan.wideR[i])); return plan.vLine[i] * (1 - t) + Math.min(plan.vLine[i], plan.vRight[i]) * t;
}

/** Next real corner ahead of s (within range): its sample, direction (+1 left) and distance. */
function nextCorner(plan, s, range = 420) {
  const L = plan.L;
  for (let d = 20; d < range; d += 6) {
    const i = Math.floor(wrapS(L, s + d) / L.ds) % L.N;
    if (Math.abs(plan.kLine[i]) > 1 / 140) return { i, dir: Math.sign(plan.kLine[i]), dist: d, v: plan.vLine[i] };
  }
  return null;
}

let seed = 1;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

export class AIDriver {
  /**
   * opts: skill 0.85..1 (share of the grip used), aggression 0..1 (how early it attacks, how late it
   * brakes alongside), humanity 0..1 (reaction delay, inconsistency, mistakes).
   */
  constructor(plan, { skill = 0.97, aggression = 0.5, humanity = 0.3, name = 'AI' } = {}) {
    Object.assign(this, { plan, skill, aggression, humanity, name });
    this.state = 'race'; this.note = '';
    this.side = 0;            // tactical offset target relative to the line (m), eased
    this.tactical = 0;
    this.defended = false;    // one move per straight
    this.mistake = null;
    this.react = 0.12 + humanity * 0.25; // s
    this.seen = [];           // delayed view of the others
    this.copy = null;         // { lat: Float64Array, v: Float64Array } learned from a human lap
    this.copyBlend = 0;
    this.cornerJitter = new Map();
    // Every driver has its own line: an earlier or later apex, and a small personal wander.
    const L = plan.L, N = L.N;
    this.apexShift = Math.round((rand() - 0.5) * 8);                 // samples (~2 m each): early or late apex
    const f1 = 5 + Math.floor(rand() * 6), f2 = 11 + Math.floor(rand() * 8), p1 = rand() * 6.28, p2 = rand() * 6.28, A = 0.35 + rand() * 0.55;
    this.myLine = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const j = (i - this.apexShift + N) % N, t = (i / N) * Math.PI * 2;
      const v = plan.line[j] + A * (0.6 * Math.sin(f1 * t + p1) + 0.4 * Math.sin(f2 * t + p2));
      this.myLine[i] = Math.max(-plan.limR[i], Math.min(plan.limL[i], v));
    }
  }

  /** Learn from a recorded human lap (lateral and speed per sample); blend 0..1. */
  learn(rec, blend = 1) { this.copy = rec; this.copyBlend = blend; }

  /** Decide the inputs for `me` given the other cars. Returns { steer, throttle, brake }. */
  drive(me, others, dt, time) {
    const plan = this.plan, L = plan.L, N = L.N;
    const u = Math.max(0, me.u);
    const i = Math.floor(wrapS(L, me.s) / L.ds) % N;
    // ---- what it sees, after its reaction time ----
    this.seen.push({ t: time, cars: others.map((o) => ({ ref: o, s: o.s, lat: o.lateral, u: o.u })) });
    while (this.seen.length > 2 && this.seen[1].t <= time - this.react) this.seen.shift();
    // Humans react late but anticipate: project what was seen forward by the delay.
    const lag = time - this.seen[0].t;
    const view = this.seen[0].cars.map((c) => ({ ref: c.ref, s: c.s + c.u * lag, lat: c.ref.lateral * 0.5 + c.lat * 0.5, u: c.u }));
    // ---- reference line and speed (its own, or a learned human lap) ----
    const lineAt = (j) => (this.copy ? this.myLine[j] * (1 - this.copyBlend) + this.copy.lat[j] * this.copyBlend : this.myLine[j]);
    const vRefAt = (j, lat) => {
      let v = speedAt(plan, j, lat);
      if (this.copy) v = v * (1 - this.copyBlend) + Math.min(v * 1.03, this.copy.v[j]) * this.copyBlend;
      return v * Math.sqrt(this.skill);
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
    let target = 0;
    this.note = '';
    // Is the car ahead slower than us over the next stretch (we'd catch it)? Compare reference speeds.
    const pace = (o) => o.u;
    const closing = ahead ? u - pace(ahead.o) : 0;
    const myPace = vRefAt(i, lineHere), sameLane = ahead && Math.abs(ahead.o.lat - me.lateral) < W + 0.5;
    // Attack only when close and catching (or already alongside it); drop it once it gets away again.
    const strike = 10 + u * (0.22 + this.aggression * 0.12);
    const keep = this.state === 'attack' && ahead && ahead.d < strike + 18;
    if (ahead && ((ahead.d < strike && (closing > 0.4 || me.slipFactor < 0.9)) || keep)) {
      // Attack: the inside of the next corner if it's free, else the side they aren't covering.
      const theirs = ahead.o.lat;
      // Room on a side: to the track edge, minus any other car already there around the car ahead.
      const room = (sd) => {
        let r = sd > 0 ? limL - theirs : theirs - limR;
        for (const o of view) { if (o === ahead.o) continue; const dd = dsWrap(L, me.s, o.s); if (dd > -LEN && dd < ahead.d + LEN + 4) { const rel = (o.lat - theirs) * sd; if (rel > 0) r = Math.min(r, rel - W * 0.5 - 0.4); } }
        return r;
      };
      let side = this.attackSide || (corner ? corner.dir : (theirs >= lineHere ? -1 : 1));
      if (room(side) < W + 1.0) side = -side;
      if (room(side) >= W + 1.0) {
        this.attackSide = side;
        target = theirs + side * (W + 1.0) - lineHere;
        this.state = 'attack'; this.note = `OVERTAKE ${side > 0 ? 'L' : 'R'}`;
      } else { this.state = 'follow'; this.attackSide = 0; this.note = 'FOLLOW'; target = theirs - lineHere; }
    } else { this.state = 'race'; this.attackSide = 0; }
    // Defend: a car closing behind, a braking zone coming: one move to cover the inside, made early;
    // never once the attacker has a wheel alongside.
    if (behind && this.state === 'race') {
      const theyClose = behind.o.u - u > 0.6 || behind.d > -12;
      const overlapped = behind.d > -LEN * 0.85;
      if (theyClose && corner && corner.dist < 160 + u * 1.2 && corner.dist > 50 && !overlapped && !this.defended && this.aggression > 0.15) {
        this.defendDir = corner.dir; this.defended = true;
      }
    }
    if (!corner || corner.dist > 300 + u) this.defended = false;
    if (this.defendDir && corner && corner.dist > 25) {
      target = this.defendDir * Math.max(0, (this.defendDir > 0 ? limL : -limR) - 0.6) - lineHere;
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
      // Turn-in: on the outside and not ahead, tuck in behind rather than turn across them.
      if (corner && corner.dist < 45 && a.d > -1 && Math.sign(a.dl) === corner.dir) yield_ = true;
    }
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
    let steer = (delta * (1 + u / 28)) / me.p.steerMax - me.r * 0.04;
    steer = Math.max(-1, Math.min(1, steer));
    // ---- speed ----
    let vT = Infinity;
    for (let d = 0; d < 6 + u * 0.12; d += 2) { const j = Math.floor(wrapS(L, me.s + d) / L.ds) % N; vT = Math.min(vT, vRefAt(j, lineAt(j) + this.tactical)); }
    // Attacking on the inside into a corner: brake a little later (aggression), it's how passes happen.
    if (this.state === 'attack' && corner && corner.dist < 120 && this.attackSide === corner.dir) vT *= 1 + this.aggression * 0.025;
    // Human inconsistency: each corner gets its own small brake-point error; now and then a real mistake.
    if (corner) {
      if (!this.cornerJitter.has(corner.i)) {
        const err = (rand() - 0.5) * this.humanity * 0.04;
        const blunder = rand() < this.humanity * 0.03 ? 0.05 + rand() * 0.04 : 0;
        this.cornerJitter.set(corner.i, { err, blunder });
      }
      const jt = this.cornerJitter.get(corner.i);
      if (corner.dist < 120) vT *= 1 + jt.err + jt.blunder;
      if (jt.blunder && corner.dist < 120) this.note = this.note || 'MISTAKE';
    }
    if (this.cornerJitter.size > 40) this.cornerJitter.clear();
    if (yield_) { vT *= 0.93; this.note = 'YIELD'; }
    if (this.squeezed) { vT *= 0.9; this.note = 'BACK OFF'; }
    // Never into the back of the car ahead: if it's in our path (where we're heading, not just where
    // we are), keep a following gap that shrinks with confidence, brake to its speed if closer.
    if (ahead) {
      const pathLat = me.lateral + (this.tactical + lineHere - me.lateral) * 0.5;
      const inPath = Math.abs(ahead.o.lat - pathLat) < W + 0.35 && Math.abs(ahead.o.lat - me.lateral) < W + 0.35;
      if (inPath) {
        const headway = LEN + 2 + u * (0.12 - this.aggression * 0.05), gap = ahead.d - headway, rel = u - ahead.o.u;
        const stop = rel > 0 ? (rel * rel) / (2 * 16) : 0;
        if (gap < stop) { vT = Math.min(vT, ahead.o.u + Math.max(-3, gap * 0.4)); this.note = this.note || 'BRAKE'; }
      }
    }
    if (off) vT = Math.min(vT, 30);
    void myPace; void sameLane;
    // Pedals: firm, like a driver (no hovering); trail off the brake into the corner.
    const err = vT - u;
    let throttle = err > 0 ? Math.min(1, err * 0.5 + 0.05) : 0;
    let brake = err < -0.4 ? Math.min(1, -err * 0.25) : 0;
    if (Math.abs(steer) > 0.85 && u > 25) throttle *= 0.5;                               // patience on exit
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
