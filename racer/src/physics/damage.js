import { Vector3, Quaternion } from 'three';

/*
 * Component damage, the way it shows up in an F1 car's behaviour:
 *
 *   frontWing    front downforce: understeer, the front washes out in quick corners
 *   rearWing     rear downforce: oversteer under power and in fast corners (and a little less drag)
 *   floor        the floor and diffuser: grip everywhere drops (the biggest single aero loss)
 *   sidepods     cooling: the power unit runs hot and is turned down (power falls with it)
 *   suspension   per corner (FL FR RL RR): that wheel grips less and the car pulls towards it
 *   engine       the power unit itself: power
 *   puncture     per wheel: a tyre down to the rim, almost no grip at that corner
 *
 * Health is 1 (perfect) .. 0 (gone). An impact is spread over the parts by where it hit the car (body
 * frame: +x left, +z forward) and how hard: the nose takes the front wing, a rear-ender the rear wing
 * and gearbox, a side hit the sidepods and the suspension on that side, a landing the floor. The
 * effects are written to the vehicle as per-wheel grip factors, a power factor and a steering pull.
 */
const PARTS = ['frontWing', 'rearWing', 'floor', 'sidepods', 'engine'];
const CORNERS = ['FL', 'FR', 'RL', 'RR'];
const _q = new Quaternion(), _v = new Vector3();

export function partsOf(v) {
  v.parts ??= { frontWing: 1, rearWing: 1, floor: 1, sidepods: 1, engine: 1, susp: { FL: 1, FR: 1, RL: 1, RR: 1 }, puncture: { FL: false, FR: false, RL: false, RR: false } };
  return v.parts;
}
export function resetDamage(v) { v.parts = null; applyDamage(v); }

/**
 * An impact: speed (m/s, the closing speed), where (world point, or a body-frame direction {x, z}),
 * under: a hit from below (bottoming out, a landing).
 */
export function impact(v, speed, { point = null, dir = null, under = false } = {}) {
  if (speed < 3) return null;
  const P = partsOf(v);
  let x = 0, z = 0;
  if (dir) { x = dir.x; z = dir.z; }
  else if (point) {
    _q.copy(v.body.quaternion).invert();
    _v.copy(point).sub(v.body.position).applyQuaternion(_q);
    x = _v.x; z = _v.z;
  }
  const mag = Math.hypot(x, z) || 1, fx = x / mag, fz = z / mag;
  const k = Math.min(1, ((speed - 3) / 22) ** 1.6);          // ~25 m/s (90 km/h) closing destroys what it hits
  const hit = (part, share) => { P[part] = Math.max(0, P[part] - k * share); };
  const before = JSON.stringify(P);
  if (under) { hit('floor', 0.6); if (k > 0.5) hit('sidepods', 0.2); }
  else {
    if (fz > 0.45) { hit('frontWing', 1.1 * fz); if (Math.random() < k * 0.5) P.puncture[fx > 0 ? 'FL' : 'FR'] = true; }
    if (fz < -0.45) { hit('rearWing', 0.9 * -fz); hit('engine', 0.25 * -fz); if (Math.random() < k * 0.4) P.puncture[fx > 0 ? 'RL' : 'RR'] = true; }
    if (Math.abs(fx) > 0.4) {
      hit('sidepods', 0.6 * Math.abs(fx)); hit('floor', 0.3 * Math.abs(fx));
      const side = fx > 0 ? 'L' : 'R', end = fz >= 0 ? 'F' : 'R';
      P.susp[end + side] = Math.max(0, P.susp[end + side] - k * 0.9 * Math.abs(fx));
      if (Math.random() < k * 0.35) P.puncture[end + side] = true;
    }
    hit('floor', 0.15);
  }
  applyDamage(v);
  return JSON.stringify(P) === before ? null : describe(P, before);
}

/** A worn-out or damaged component can also fail slowly (overheating with broken sidepods). */
export function tickDamage(v, dt, load = 1) {
  const P = v.parts;
  if (!P) return;
  if (P.sidepods < 0.5) P.engine = Math.max(0, P.engine - dt * load * (0.5 - P.sidepods) * 0.004);
  applyDamage(v);
}

/** Write the effects to the vehicle (per-wheel grip, power, steering pull) and the HUD summary. */
export function applyDamage(v) {
  const P = v.parts;
  const ids = v.wheels.map((w, k) => w.id ?? CORNERS[k]);
  if (!P) {
    v.wheels.forEach((w) => { w.damageGrip = 1; });
    v.damagePower = 1; v.steerPull = 0; v.damageParts = {}; v.damageWarning = '';
    return;
  }
  const aeroF = 0.72 + 0.28 * P.frontWing, aeroR = 0.76 + 0.24 * P.rearWing, floor = 0.84 + 0.16 * P.floor;
  v.wheels.forEach((w, k) => {
    const id = ids[k], front = id[0] === 'F';
    const susp = 0.7 + 0.3 * P.susp[id];
    w.damageGrip = (front ? aeroF : aeroR) * floor * susp * (P.puncture[id] ? 0.35 : 1);
  });
  v.damagePower = (0.55 + 0.45 * P.engine) * (0.9 + 0.1 * P.sidepods);
  // A bent corner pulls the car towards it (left corners damaged: pulls left).
  const left = (1 - P.susp.FL) + (1 - P.susp.RL) * 0.5, right = (1 - P.susp.FR) + (1 - P.susp.RR) * 0.5;
  v.steerPull = (left - right) * 0.08;
  const suspMin = Math.min(...Object.values(P.susp));
  v.damageParts = { frontWing: P.frontWing, rearWing: P.rearWing, floor: P.floor, sidepods: P.sidepods, engine: P.engine, suspension: suspMin, chassis: Math.min(1, (P.floor + P.sidepods) / 2 + 0.2) };
  const worst = Object.entries(v.damageParts).sort((a, b) => a[1] - b[1])[0];
  const punct = CORNERS.filter((c) => P.puncture[c]);
  v.damageWarning = punct.length ? `PUNCTURE ${punct.join(' ')}` : worst && worst[1] < 0.6 ? `${LABEL[worst[0]]} DAMAGE` : '';
  // The overall figure (smoke and fire, the old crash effects).
  v.damage = Math.max(v.damage ?? 0, 1 - Math.min(P.engine, (P.frontWing + P.rearWing + P.floor + P.sidepods + suspMin) / 5));
}
const LABEL = { frontWing: 'FRONT WING', rearWing: 'REAR WING', floor: 'FLOOR', sidepods: 'SIDEPOD', engine: 'POWER UNIT', suspension: 'SUSPENSION', chassis: 'CHASSIS' };

/** What changed, for the engineer: the worst new damage in a sentence (or null for nothing much). */
function describe(P, before) {
  const B = JSON.parse(before);
  const lost = [];
  for (const k of PARTS) if (B[k] - P[k] > 0.12) lost.push([k, P[k]]);
  for (const c of CORNERS) { if (B.susp[c] - P.susp[c] > 0.12) lost.push([`susp${c}`, P.susp[c]]); if (!B.puncture[c] && P.puncture[c]) lost.push([`punct${c}`, 0]); }
  if (!lost.length) return null;
  lost.sort((a, b) => a[1] - b[1]);
  const [k, h] = lost[0];
  const name = k.startsWith('punct') ? `a puncture, ${CNAME[k.slice(5)]}` : k.startsWith('susp') ? `suspension damage, ${CNAME[k.slice(4)]}` : `${LABEL[k].toLowerCase()} damage`;
  if (k.startsWith('punct')) return `We have ${name}. Box this lap.`;
  const sev = h < 0.3 ? 'Heavy' : h < 0.65 ? 'Some' : 'Light';
  return `${sev} ${name}.${h < 0.5 && k === 'frontWing' ? ' Box for a new nose.' : ''}`;
}
const CNAME = { FL: 'front left', FR: 'front right', RL: 'rear left', RR: 'rear right' };

/** A pit stop's repairs: new tyres fix punctures; a new nose fixes the front wing (if it's needed). */
export function repairAtStop(v) {
  const P = v.parts;
  if (!P) return { nose: false };
  for (const c of CORNERS) P.puncture[c] = false;
  const nose = P.frontWing < 0.7;
  if (nose) P.frontWing = 1;
  applyDamage(v);
  return { nose };
}
