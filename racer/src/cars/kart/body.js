import { Group } from 'three';
import { lens } from '../../car/loft.js?v=a5d31c9';
import { buildCockpit, buildExhausts } from '../../car/cockpit.js?v=a5d31c9';

/**
 * Shifter kart, hand-built in design space (+X left, +Y up, +Z forward,
 * ground at y = 0): a bent-tube chassis with nerf bars and a rear bumper loop,
 * moulded plastic nose cone, front fairing with the number panel and wide
 * sidepods, a bucket seat, the 125 cc two-stroke bolted beside the driver
 * with its finned barrel, expansion chamber and airbox, chain drive to a solid
 * rear axle carrying the brake disc, and a driver sitting bolt upright with
 * legs out to the pedals.
 */
export const AXLE_FRONT = 0.62;
export const AXLE_REAR = -0.62;
export const NOSE_Z = 1.1;
export const TAIL_Z = -1.02;
const HUB_F = 0.6, HUB_R = 0.64, WHEEL_Y = 0.27;

/** Round-ish tube between two points (octagonal section). */
function tube(mb, key, p, q, d) {
  const v = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
  const len = Math.hypot(...v) || 1;
  const t = v.map((x) => x / len);
  let u = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  let w = cr(t, u); const lw = Math.hypot(...w); w = w.map((x) => x / lw);
  u = cr(w, t);
  const r = d / 2, n = 6;
  const ring = (c) => Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2, ca = Math.cos(a) * r, sa = Math.sin(a) * r;
    return [c[0] + u[0] * ca + w[0] * sa, c[1] + u[1] * ca + w[1] * sa, c[2] + u[2] * ca + w[2] * sa];
  });
  const A = ring(p), B = ring(q);
  for (let k = 0; k < n; k++) mb.quad(key, A[k], A[(k + 1) % n], B[(k + 1) % n], B[k]);
}
/** A polyline of tubes. */
const bent = (mb, key, pts, d) => { for (let k = 0; k < pts.length - 1; k++) tube(mb, key, pts[k], pts[k + 1], d); };
const mirror = (pts) => pts.map(([x, y, z]) => [-x, y, z]);

export function buildShell(mb) {
  // ---- chassis: two main rails, cross members, the steering-column mount ----
  for (const s of [1, -1]) {
    bent(mb, 'stripe', [[0.2 * s, 0.1, 0.92], [0.3 * s, 0.08, 0.62], [0.34 * s, 0.07, 0.1], [0.38 * s, 0.07, -0.5], [0.34 * s, 0.09, -0.78]], 0.05);
    // Front stub-axle uprights (kingpins) and their tie bars.
    bent(mb, 'stripe', [[0.3 * s, 0.08, 0.62], [(HUB_F - 0.12) * s, 0.12, AXLE_FRONT], [(HUB_F - 0.12) * s, 0.36, AXLE_FRONT]], 0.04);
    tube(mb, 'chrome', [(HUB_F - 0.12) * s, WHEEL_Y, AXLE_FRONT], [(HUB_F - 0.02) * s, WHEEL_Y, AXLE_FRONT], 0.03);
    tube(mb, 'titanium', [0.04 * s, 0.2, 0.45], [(HUB_F - 0.14) * s, 0.2, AXLE_FRONT - 0.08], 0.018);
    // Nerf bars between the wheels.
    bent(mb, 'chrome', [[0.34 * s, 0.08, 0.3], [0.62 * s, 0.12, 0.26], [0.66 * s, 0.13, -0.26], [0.38 * s, 0.08, -0.32]], 0.035);
    bent(mb, 'chrome', [[0.62 * s, 0.12, 0.26], [0.64 * s, 0.22, 0.12], [0.65 * s, 0.22, -0.14], [0.66 * s, 0.13, -0.26]], 0.03);
    // Bearing hangers for the rear axle.
    tube(mb, 'stripe', [0.36 * s, 0.07, -0.55], [0.36 * s, WHEEL_Y, AXLE_REAR], 0.05);
  }
  for (const z of [0.62, 0.1, -0.5]) tube(mb, 'stripe', [0.33, 0.075, z], [-0.33, 0.075, z], 0.045);
  tube(mb, 'stripe', [0.2, 0.1, 0.92], [-0.2, 0.1, 0.92], 0.045);
  // Rear bumper loop behind the rear tyres.
  bent(mb, 'chrome', [[0.34, 0.1, -0.78], [0.5, 0.14, -0.98], [0.2, 0.18, -1.02], [-0.2, 0.18, -1.02], [-0.5, 0.14, -0.98], [-0.34, 0.1, -0.78]], 0.04);
  // Floor tray between the rails.
  mb.prism('carbon', [[-0.3, 0.6], [0.3, 0.6], [0.34, -0.45], [-0.34, -0.45]], 'y', 0.04, 0.06);

  // ---- rear axle, brake disc and caliper, sprocket ------------------------------
  tube(mb, 'chrome', [HUB_R + 0.02, WHEEL_Y, AXLE_REAR], [-HUB_R - 0.02, WHEEL_Y, AXLE_REAR], 0.05);
  mb.prism('chrome', octagon(0.13, 0.13, WHEEL_Y, AXLE_REAR), 'x', 0.1, 0.12);
  mb.hexa('caliper', box(0.08, 0.15, WHEEL_Y + 0.08, WHEEL_Y + 0.18, AXLE_REAR - 0.05, AXLE_REAR + 0.05).b, box(0.08, 0.15, WHEEL_Y + 0.08, WHEEL_Y + 0.18, AXLE_REAR - 0.05, AXLE_REAR + 0.05).t);
  mb.prism('black', octagon(0.11, 0.11, WHEEL_Y, AXLE_REAR), 'x', -0.24, -0.22); // sprocket
}

function octagon(rx, ry, y, z) {
  return Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * Math.PI * 2; return [z + Math.cos(a) * rx, y + Math.sin(a) * ry]; });
}
function box(x0, x1, y0, y1, z0, z1) {
  return { b: [[x1, y0, z0], [x0, y0, z0], [x0, y0, z1], [x1, y0, z1]], t: [[x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1]] };
}
const hexBox = (mb, key, x0, x1, y0, y1, z0, z1) => { const q = box(x0, x1, y0, y1, z0, z1); mb.hexa(key, q.b, q.t); };

function buildBodywork(mb) {
  // Nose cone: wide, low, swept up at the front, with a darker underside.
  const NB = [[0.5, 0.05, 1.08], [-0.5, 0.05, 1.08], [-0.42, 0.05, 0.82], [0.42, 0.05, 0.82]];
  const NT = [[0.48, 0.2, 1.1], [-0.48, 0.2, 1.1], [-0.38, 0.27, 0.82], [0.38, 0.27, 0.82]];
  mb.hexa('paint', NB, NT);
  mb.hexa('stripe', [[0.49, 0.2, 1.1], [-0.49, 0.2, 1.1], [-0.39, 0.27, 0.82], [0.39, 0.27, 0.82]], [[0.49, 0.22, 1.1], [-0.49, 0.22, 1.1], [-0.39, 0.29, 0.82], [0.39, 0.29, 0.82]]);
  // Front fairing: the sloped panel in front of the driver's shins, number plate on it.
  mb.hexa('paint', [[0.24, 0.1, 0.78], [-0.24, 0.1, 0.78], [-0.2, 0.1, 0.6], [0.2, 0.1, 0.6]], [[0.2, 0.42, 0.62], [-0.2, 0.42, 0.62], [-0.17, 0.42, 0.52], [0.17, 0.42, 0.52]]);
  lens(mb, 'plate', [0, 0.3, 0.71], [0, 0.85, 0.52], [0, 0.4, 1], 0.1, 0.075, { segments: 14 });
  // Sidepods: moulded boxes outboard of the nerf bars, inlet scoop at the front.
  for (const s of [1, -1]) {
    const S = (p) => [p[0] * s, p[1], p[2]];
    const B = [[0.4, 0.08, 0.28], [0.7, 0.1, 0.24], [0.72, 0.1, -0.28], [0.42, 0.08, -0.3]].map(S);
    const T = [[0.42, 0.24, 0.22], [0.68, 0.3, 0.16], [0.7, 0.3, -0.24], [0.44, 0.26, -0.28]].map(S);
    mb.hexa('paint', B, T);
    mb.hexa('stripe', T, T.map(([x, y, z]) => [x, y + 0.025, z]));
    hexBox(mb, 'black', s > 0 ? 0.46 : -0.66, s > 0 ? 0.66 : -0.46, 0.12, 0.24, 0.235, 0.25);
  }
  // Rear bumper fairing (the plastic shroud over the bumper loop).
  mb.hexa('paint', [[0.62, 0.08, -0.94], [-0.62, 0.08, -0.94], [-0.62, 0.08, -1.04], [0.62, 0.08, -1.04]], [[0.6, 0.24, -0.95], [-0.6, 0.24, -0.95], [-0.6, 0.22, -1.03], [0.6, 0.22, -1.03]]);
}

function buildSeatAndEngine(mb) {
  // Bucket seat, leaning back, with its stays to the rails.
  mb.hexa('interior', [[0.2, 0.1, -0.15], [-0.2, 0.1, -0.15], [-0.2, 0.1, -0.42], [0.2, 0.1, -0.42]], [[0.21, 0.2, -0.12], [-0.21, 0.2, -0.12], [-0.21, 0.2, -0.42], [0.21, 0.2, -0.42]]);
  mb.hexa('interior', [[0.21, 0.12, -0.42], [-0.21, 0.12, -0.42], [-0.21, 0.12, -0.5], [0.21, 0.12, -0.5]], [[0.22, 0.62, -0.56], [-0.22, 0.62, -0.56], [-0.22, 0.62, -0.63], [0.22, 0.62, -0.63]]);
  for (const s of [1, -1]) {
    mb.hexa('interior', [[0.2 * s, 0.12, -0.12], [0.24 * s, 0.12, -0.12], [0.24 * s, 0.12, -0.5], [0.2 * s, 0.12, -0.5]].map((p) => p), [[0.2 * s, 0.34, -0.14], [0.25 * s, 0.34, -0.14], [0.25 * s, 0.5, -0.56], [0.2 * s, 0.5, -0.56]]);
    tube(mb, 'stripe', [0.22 * s, 0.5, -0.58], [0.34 * s, 0.09, -0.7], 0.025);
  }
  // Fuel tank between the legs, with the filler cap.
  hexBox(mb, 'glass', -0.1, 0.1, 0.07, 0.2, 0.15, 0.42);
  mb.prism('black', octagon(0.03, 0.03, 0.3, 0), 'y', 0.2, 0.23);
  // 125 cc two-stroke on the right of the seat: crankcase, finned barrel and head, water pump.
  const ex = -0.36;
  hexBox(mb, 'chrome', ex - 0.12, ex + 0.08, 0.1, 0.3, -0.62, -0.3);
  for (let k = 0; k < 7; k++) {
    const y = 0.31 + k * 0.035;
    hexBox(mb, 'titanium', ex - 0.11 + k * 0.004, ex + 0.07 - k * 0.004, y, y + 0.02, -0.56, -0.36);
  }
  hexBox(mb, 'black', ex - 0.05, ex + 0.01, 0.56, 0.6, -0.5, -0.42); // spark-plug cap
  // Airbox in front of the engine with its two snorkels.
  hexBox(mb, 'black', -0.48, -0.26, 0.1, 0.3, -0.1, 0.12);
  for (const z of [-0.06, 0.06]) tube(mb, 'black', [-0.37, 0.3, z], [-0.37, 0.4, z + 0.08], 0.05);
  // Expansion chamber sweeping round behind the seat to the silencer.
  bent(mb, 'titanium', [[ex - 0.02, 0.38, -0.62], [ex - 0.08, 0.3, -0.76], [-0.18, 0.28, -0.86], [0.1, 0.3, -0.88], [0.3, 0.32, -0.82]], 0.1);
  bent(mb, 'chrome', [[0.3, 0.32, -0.82], [0.42, 0.36, -0.66], [0.44, 0.42, -0.52]], 0.08);
  // Chain from the engine sprocket to the axle sprocket.
  tube(mb, 'black', [-0.23, 0.2, -0.46], [-0.23, WHEEL_Y + 0.1, AXLE_REAR], 0.02);
  tube(mb, 'black', [-0.23, 0.14, -0.46], [-0.23, WHEEL_Y - 0.1, AXLE_REAR], 0.02);
  // Radiator on the left of the seat.
  hexBox(mb, 'grille', 0.3, 0.33, 0.14, 0.5, -0.4, -0.12);
  hexBox(mb, 'black', 0.29, 0.34, 0.5, 0.53, -0.4, -0.12);
}

function buildDriverLegs(mb) {
  // Legs out to the pedals (the cockpit group draws the torso, arms and helmet).
  for (const s of [1, -1]) {
    tube(mb, 'suit', [0.1 * s, 0.22, -0.14], [0.11 * s, 0.32, 0.22], 0.11);
    tube(mb, 'suit', [0.11 * s, 0.32, 0.22], [0.12 * s, 0.2, 0.55], 0.095);
    hexBox(mb, 'black', 0.12 * s - 0.05, 0.12 * s + 0.05, 0.12, 0.24, 0.53, 0.66); // boots
    tube(mb, 'chrome', [0.12 * s, 0.08, 0.6], [0.12 * s, 0.2, 0.66], 0.03); // pedals
  }
}

export function buildDetails(mb) {
  buildBodywork(mb);
  buildSeatAndEngine(mb);
  buildDriverLegs(mb);
  // Steering column from the fairing to the wheel.
  tube(mb, 'chrome', [0, 0.12, 0.56], [0, 0.46, 0.24], 0.035);
  // Ground clearance: lift everything built near the road (floor tray, rails, nose, bumpers) so the
  // bodywork never dips through the asphalt over crests, dips and kerbs. The wheels are separate.
  for (const b of mb.buckets.values()) {
    for (let i = 1; i < b.pos.length; i += 3) if (b.pos[i] < 0.16) b.pos[i] = 0.08 + b.pos[i] * 0.5;
  }
}

export function buildAnimatedParts(mats) {
  // Bolt upright and exposed: the seat is low, so the driver sits well down.
  const cockpit = buildCockpit(mats, { seatX: 0, seatZ: -0.3, wheelZ: 0.22, wheelY: 0.64, seatY: -0.18 });
  const ex = buildExhausts(mats, [{ x: 0.44, y: 0.44, z: -0.5, r: 0.035, sides: 8 }]);
  const group = new Group();
  group.add(...cockpit.group.children, ...ex.group.children);
  return { group, head: cockpit.head, steering: cockpit.steering, flames: ex.flames };
}
