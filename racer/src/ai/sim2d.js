/*
 * A 2D racing world on the game's real circuit layouts: F1-like car physics (grip that grows with
 * downforce, a friction circle shared by braking and cornering, power and drag, slipstream), the
 * track's own surfaces (kerbs, grass, gravel, walls) and car-to-car contact. Used by the AI sim and
 * by the headless AI tests; the AI only ever sees what a driver would (positions, speeds, the track).
 */

export const G = 9.81;
const TOW = 0.18, DRS = 0.15;   // slipstream (max drag cut, within 45 m) and DRS (drag cut): the player's car has the same

/**
 * Car parameters, roughly an F1 car (the AI's original model: grip calibrated to the game's F1 car),
 * on the player's car's straight-line and braking performance; front-runners ~69.0 s at Austria.
 */
export const CAR = {
  // Straight line and brakes: the player's car exactly (measured in physics/vehicle.js: 0-100 2.2 s,
  // 100-200 2.4 s, 200-300 4.5 s, ~377 km/h with the active aero, 300-100 km/h braking in ~1.55 s), so
  // time between the player and the AI isn't won and lost in lumps on the straights and in the
  // braking zones; the difference is made smoothly, in the corners (grip).
  mass: 600, power: 360e3, cda: 0.92, rho: 1.225, rolling: 0.15, xDrag: 0.6,
  brakeG: [2.73, 0.000173],   // braking on the tyres, g + per (m/s)^2
  tractionG: 1.15,            // drive out of slow corners (a little under the player's car: no running away on the exits)
  mu: 2.565, cla: 3.75,        // cornering: mu (g + c v^2): front-runners ~69.0 s at Austria
  wheelbase: 3.6, length: 5.6, width: 2.0, steerMax: 0.34, brakeMu: 1.0,
};
/** What the tyres hold sideways, under braking and driving at speed u (m/s), scaled by grip. */
export const latLimit = (p, u, scale = 1) => Math.min((p.gripCap ?? 9) * G, p.mu * (G + downforce(p) * u * u)) * scale;
export const brakeLimit = (p, u, scale = 1) => (p.brakeG ? G * (p.brakeG[0] + p.brakeG[1] * u * u) : p.mu * (G + downforce(p) * u * u)) * scale;
export const tractionLimit = (p, u, scale = 1) => (p.tractionG ? G * p.tractionG : p.mu * (G + downforce(p) * u * u)) * scale;

const SURF_DRAG = { asphalt: 0, kerb: 0, paint: 0.4, grass: 2.2, gravel: 9, sausage: 2.5 };

/** Downforce term c so lateral grip = mu (g + c v^2). */
export const downforce = (car = CAR) => (0.5 * car.rho * car.cla) / car.mass;
/** Wheel angle (rad) at full lock for a speed: less lock at speed, as a driver would use, and a bit
 *  more at hairpin speeds so the tightest street-circuit hairpins (~12 m) can be made on full lock. */
export const lockAt = (p, u) => (p.steerMax * (1 + 0.4 * Math.max(0, 1 - u / 25))) / (1 + u / 28);
const dragAcc = (car, v, slip = 1) => (0.5 * car.rho * car.cda * slip * v * v) / car.mass + car.rolling;

export class Car {
  constructor(id, { x, z, heading, name = `Car ${id}`, colour = '#e10600', number = id, params = CAR } = {}) {
    Object.assign(this, { id, x, z, h: heading, name, colour, number, p: params });
    this.u = 0; this.vlat = 0; this.r = 0;
    this.steer = 0; this.throttle = 0; this.brake = 0;
    this.s = 0; this.lap = 0; this.lapStart = 0; this.lapTimes = []; this.best = null; this.progress = 0;
    this.lateral = 0; this.surface = 'asphalt'; this.wallHits = 0; this.contacts = 0; this.offTime = 0;
    this.slipFactor = 1; this.usage = 0;
  }
  get speed() { return Math.hypot(this.u, this.vlat); }
}

/** Track-relative position for every car: distance along the lap (unwrapped progress) and lateral. */
export function locate(L, car) {
  levelHint(L, car);
  const n = L.nearest(car.x, car.z);
  if (!n) return;
  if (car._prevS !== undefined) {
    let d = n.s - car._prevS;
    if (d > L.length / 2) d -= L.length;
    if (d < -L.length / 2) d += L.length;
    car.progress += d;
  }
  car._prevS = n.s;
  car.s = n.s; car.lateral = n.lateral; car.idx = n.i;
  if (L.hasCrossing) car.level = L.elev[n.i] + (L.elev[(n.i + 1) % L.N] - L.elev[n.i]) * n.t;
}

/** Where the lap crosses itself (a bridge), keep each car on its own level: the lookup prefers the
 *  road at the car's height, so it never snaps to the road above or below. */
function levelHint(L, car) { if (L.hasCrossing) L.hintY = car.level ?? null; }

/** One physics step for one car (inputs already set on it). */
export function stepCar(L, car, dt) {
  const p = car.p, c = downforce(p);
  levelHint(L, car);
  const surf = L.surfaceAt ? L.surfaceAt(car.x, car.z) : { kind: 'asphalt', grip: 1 };
  car.surface = surf.kind;
  const grip = p.mu * (surf.grip ?? 1) * (car.gripFactor ?? 1) * (car.weatherGrip ?? 1); // dirty air, and a wet track   // dirty air behind another car costs grip
  const u = Math.max(0, car.u);
  const aMax = latLimit(p, u, grip / p.mu);                    // what the tyres hold sideways
  // Steering.
  const delta = car.steer * lockAt(p, u);
  const rWant = (u * Math.tan(delta)) / p.wheelbase;
  const aLatWant = u * rWant;
  // Longitudinal request.
  const aTrac = tractionLimit(p, u, grip / p.mu), aBrk = brakeLimit(p, u, grip / p.mu);
  // The throttle fed in as the lock comes off: only the grip the corner leaves goes to the rear tyres
  // (as the driver does, and as the speed plan assumes), so a car on the power doesn't run wide.
  const latUse = Math.min(1, Math.abs(aLatWant) / aMax);
  const aPower = car.throttle * Math.min(p.power / (p.mass * Math.max(u, 4)), aTrac * Math.sqrt(Math.max(0.06, 1 - latUse * latUse)));
  const aBrake = car.brake * aBrk * (p.brakeMu ?? 1);
  let aLong = aPower - (u > 0.2 ? aBrake : 0);
  // Friction circle: if the request is more than the tyres hold, both shrink (understeer, longer stops).
  const usage = Math.hypot(aLatWant / aMax, aLong / (aLong >= 0 ? aTrac : aBrk));
  car.usage = usage;
  let aLat = aLatWant;
  if (usage > 1) { aLat /= usage; aLong /= usage; }
  // Sliding: the part of the lateral request the tyres couldn't hold becomes slip, decaying quickly.
  // (It slides to the outside of the turn, as a car beyond its grip does: asking for more lock than
  // the tyres hold only scrubs it wide, it never turns it tighter.)
  car.vlat -= (aLatWant - aLat) * dt * 0.08 * Math.sign(rWant || 1);
  car.vlat *= Math.exp(-dt * 6);
  const rNow = u > 0.5 ? aLat / Math.max(u, 0.5) : rWant;
  car.r += (rNow - car.r) * Math.min(1, dt * 14);
  // Drag (less in a slipstream), surface drag (grass and gravel bog you down).
  const straight = car.idx !== undefined && Math.abs(L.k[car.idx]) < 1 / 250;   // (flat-out bends count: Austria's 'straights' curve at R 300-650 m)
  car.drsOpen = car.drs && straight;
  // The active aero flattens the wings on a straight at full throttle (as the player's car does).
  car.xMode = straight && car.brake < 0.05;   // (not tied to full throttle: a car easing off in a tow would get 67% more drag at once)
  const drag = dragAcc(p, u, car.slipFactor * (car.drsOpen ? 1 - DRS : 1) * (car.xMode ? p.xDrag ?? 1 : 1)) + (SURF_DRAG[surf.kind] ?? 0) * (u > 1 ? 1 : u);
  car.u = Math.max(0, u + (aLong - drag) * dt);
  car.h += car.r * dt;
  const ch = Math.cos(car.h), sh = Math.sin(car.h);
  car.x += (ch * car.u - sh * car.vlat) * dt;
  car.z += (sh * car.u + ch * car.vlat) * dt;
  // Walls: push back out, lose the speed into the wall and a share of the rest.
  levelHint(L, car);
  const w = L.wallContact ? L.wallContact(car.x, car.z) : null;
  if (w && w.depth > 0) {
    car.x += w.nx * w.depth; car.z += w.nz * w.depth;
    const vx = ch * car.u - sh * car.vlat, vz = sh * car.u + ch * car.vlat, vn = vx * w.nx + vz * w.nz;
    if (vn < 0) {
      const ex = vx - vn * w.nx * 1.2, ez = vz - vn * w.nz * 1.2, keep = 0.75;
      car.u = Math.max(0, (ex * ch + ez * sh) * keep); car.vlat = (-ex * sh + ez * ch) * keep * 0.3;
      if (-vn > 3) { car.wallHits++; car.lastWall = performance.now?.() ?? 0; }
    }
  }
  if (surf.kind === 'grass' || surf.kind === 'gravel') car.offTime += dt;
}

/** Car-to-car contact: two circles per car, separated and their closing speed shared. */
let wasTouching = new Set(), touching = new Set();
export function collide(cars, onHit = null) {
  wasTouching = touching; touching = new Set();
  const circles = (c) => { const ch = Math.cos(c.h), sh = Math.sin(c.h), o = c.p.length * 0.27; return [[c.x + ch * o, c.z + sh * o], [c.x - ch * o, c.z - sh * o]]; };
  const R = 1.05;
  for (let a = 0; a < cars.length; a++) for (let b = a + 1; b < cars.length; b++) {
    const A = cars[a], B = cars[b];
    if (Math.abs(A.x - B.x) > 8 || Math.abs(A.z - B.z) > 8) continue;
    for (const pa of circles(A)) for (const pb of circles(B)) {
      const dx = pb[0] - pa[0], dz = pb[1] - pa[1], d = Math.hypot(dx, dz);
      if (d >= 2 * R || d < 1e-6) continue;
      const nx = dx / d, nz = dz / d, push = (2 * R - d) / 2;
      const pair = A.id < B.id ? `${A.id}:${B.id}` : `${B.id}:${A.id}`;
      touching.add(pair);
      A.x -= nx * push; A.z -= nz * push; B.x += nx * push; B.z += nz * push;
      const va = worldVel(A), vb = worldVel(B), rel = (vb[0] - va[0]) * nx + (vb[1] - va[1]) * nz;
      if (rel < 0) {
        if (onHit && -rel > 1.5 && !wasTouching.has(pair)) onHit(A, B, -rel, va, vb);   // before the impulse: who was moving where
        const j = -rel * 0.6;
        setWorldVel(A, va[0] - nx * j, va[1] - nz * j); setWorldVel(B, vb[0] + nx * j, vb[1] + nz * j);
        if (-rel > 1.5 && !wasTouching.has(pair)) { A.contacts++; B.contacts++; A.hitSum = (A.hitSum ?? 0) - rel; B.hitSum = (B.hitSum ?? 0) - rel; globalThis.__contactLog?.push([A.name, B.name, A.u.toFixed(0), B.u.toFixed(0), (-rel).toFixed(1), Math.round(A.s ?? 0), A.note ?? '', B.note ?? '', (A.lateral ?? 0).toFixed(1), (B.lateral ?? 0).toFixed(1)]); } // one count per touch
      }
    }
  }
}
const worldVel = (c) => { const ch = Math.cos(c.h), sh = Math.sin(c.h); return [ch * c.u - sh * c.vlat, sh * c.u + ch * c.vlat]; };
const setWorldVel = (c, vx, vz) => { const ch = Math.cos(c.h), sh = Math.sin(c.h); c.u = Math.max(0, vx * ch + vz * sh); c.vlat = -vx * sh + vz * ch; };

/** Slipstream: a car close behind another, in its wake, has less drag. */
export function slipstream(L, cars) {
  for (const c of cars) {
    c.slipFactor = 1; c.gripFactor = 1; c.drs = false;
    for (const o of cars) {
      if (o === c) continue;
      let ds = o.s - c.s;
      if (ds < -L.length / 2) ds += L.length;
      if (ds > L.length / 2) ds -= L.length;
      if (ds > 4 && ds < 45 && Math.abs(o.lateral - c.lateral) < 2.0) c.slipFactor = Math.min(c.slipFactor, 1 - TOW + TOW * (ds / 45));   // the tow: up to TOW less drag, felt out to ~45 m
      // Dirty air: right behind another car the front loses downforce, up to ~5% grip in a corner.
      // DRS: within a second of the car ahead (from lap 3), the rear wing opens on the straights.
      if (ds > 0 && ds / Math.max(20, c.u) < 1.0 && c.lap >= 2) c.drs = true;
      if (ds > 3 && ds < 30 && Math.abs(o.lateral - c.lateral) < 2.4) c.gripFactor = Math.min(c.gripFactor, 1 - 0.05 * (1 - ds / 30) * Math.min(1, (c.u / 55) ** 2));   // (it's downforce lost: little at hairpin speeds)
    }
  }
}

/** Starting grid: two staggered columns behind the line. */
export function grid(L, n, { spacing = 8, back = 12 } = {}) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const s = (L.length - back - k * spacing) % L.length, lat = k % 2 ? -2.6 : 2.6;
    const q = L.poseAt(s, lat);
    out.push({ x: q.x, z: q.z, heading: Math.atan2(q.z - L.poseAt(s - 1, lat).z, q.x - L.poseAt(s - 1, lat).x) });
  }
  return out;
}

/** Lap counting for a car: a lap when its progress passes the next multiple of the lap length. */
export function countLaps(L, car, time) {
  const laps = Math.floor((car.progress + 1) / L.length);
  if (laps > car.lap) {
    if (car.lap >= 1) { const t = time - car.lapStart; car.lapTimes.push(t); if (car.best === null || t < car.best) car.best = t; car.lastLap = t; }
    car.lap = laps; car.lapStart = time;
    return true;
  }
  return false;
}

/**
 * Timing: each car notes when it passed every few metres of its race distance, so a gap is real
 * timing (how long ago the car ahead was where this one is now), not distance over current speed,
 * which blows up in slow corners.
 */
const SPLIT = 5, SPLIT0 = 1000;   // metres per split; offset so the grid (behind the line) indexes from 0
export function markSplit(car, time) {
  const k = Math.floor((car.progress + SPLIT0) / SPLIT);
  if (!car.splits) { car.splits = []; car.splitV = []; car.splitK = k; car.splits[k] = time; car.splitV[k] = car.u; return; }
  while (car.splitK < k) { car.splits[++car.splitK] = time; car.splitV[car.splitK] = car.u; }
}
/** The speed `car` had when it was at race distance `progress` (null if it hasn't been there). */
export function speedWhenAt(car, progress) {
  const v = car.splitV?.[Math.floor((progress + SPLIT0) / SPLIT)];
  return v === undefined ? null : v;
}
/** Seconds `car` is behind `lead` (null when it can't be timed yet). */
export function timeGap(lead, car, time) {
  if (!lead.splits) return null;
  const f = (car.progress + SPLIT0) / SPLIT, k = Math.floor(f), t0 = lead.splits[k];
  if (t0 === undefined) return null;
  const t1 = lead.splits[k + 1] ?? time;
  return Math.max(0, time - (t0 + (t1 - t0) * (f - k)));
}
