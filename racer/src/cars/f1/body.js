import { Group } from 'three';
import { lens } from '../../car/loft.js';
import { buildCockpit, buildExhausts } from '../../car/cockpit.js';

/**
 * Mini F1 car, hand-built in design space (+X left, +Y up, +Z forward, ground
 * at y = 0). Open wheels: the body is a narrow tub with a raised nose, a
 * multi-element front wing, sidepods, an engine cover with shark fin, a
 * halo, a two-element rear wing with beam wing, floor and diffuser, and
 * wishbones out to the wheels.
 */
export const AXLE_FRONT = 1.75;
export const AXLE_REAR = -1.75;
export const NOSE_Z = 2.78;
export const TAIL_Z = -2.42;
const HUB_X = 0.95;

// Tub/nose/engine cover sections: [z, half width, bottom y, top y].
const SPINE = [
  [2.62, 0.07, 0.27, 0.33], [2.35, 0.11, 0.24, 0.4], [2.0, 0.16, 0.21, 0.48], [1.5, 0.22, 0.19, 0.56],
  [1.0, 0.29, 0.17, 0.63], [0.6, 0.33, 0.15, 0.66], [-0.3, 0.35, 0.15, 0.68], [-0.75, 0.32, 0.15, 0.82],
  [-1.25, 0.24, 0.16, 0.66], [-1.75, 0.16, 0.17, 0.5], [-2.15, 0.1, 0.2, 0.42],
];

const ring = ([z, w, y0, y1], dw = 0, dy = 0) => [[w + dw, y0 - dy, z], [-w - dw, y0 - dy, z], [-w - dw, y1 + dy, z], [w + dw, y1 + dy, z]];

/** Square-section rod between two design-space points. */
export function rod(mb, key, p, q, w) {
  const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
  const len = Math.hypot(...d) || 1;
  const t = d.map((x) => x / len);
  let u = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  let v = cr(t, u); const lv = Math.hypot(...v); v = v.map((x) => x / lv);
  u = cr(v, t);
  const h = w / 2;
  const sq = (c) => [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([i, j]) => [c[0] + (u[0] * i + v[0] * j) * h, c[1] + (u[1] * i + v[1] * j) * h, c[2] + (u[2] * i + v[2] * j) * h]);
  mb.hexa(key, sq(p), sq(q));
}

/** Wing element: a thin cambered plate spanning x0..x1, chord from zLead to zTrail, rising by `lift`. */
export function plate(mb, key, x0, x1, zLead, zTrail, y, thick, lift = 0) {
  const b = [[x1, y + lift, zTrail], [x0, y + lift, zTrail], [x0, y, zLead], [x1, y, zLead]];
  mb.hexa(key, b, b.map(([x, yy, z]) => [x, yy + thick, z]));
}

export function buildShell(mb) {
  // Spine: nose, tub, engine cover. Top half in livery, lower half carbon.
  for (let k = 0; k < SPINE.length - 1; k++) {
    const a = SPINE[k], b = SPINE[k + 1];
    const mid = (s) => [s[0], s[1], s[2], (s[2] + s[3]) / 2];
    const top = (s) => [s[0], s[1], (s[2] + s[3]) / 2, s[3]];
    mb.hexa('carbon', ring(mid(a)), ring(mid(b)));
    // Livery on top, with the cockpit opening cut from the tub (between z 0.6 and -0.3).
    if (!(a[0] <= 0.6 && b[0] >= -0.3)) mb.hexa('paint', ring(top(a)), ring(top(b)));
  }
  // Cockpit sides and rim around the opening.
  for (const s of [1, -1]) {
    mb.hexa('paint', [[0.35 * s, 0.4, 0.6], [0.26 * s, 0.4, 0.6], [0.26 * s, 0.4, -0.3], [0.35 * s, 0.4, -0.3]], [[0.35 * s, 0.68, 0.6], [0.26 * s, 0.7, 0.6], [0.26 * s, 0.7, -0.3], [0.35 * s, 0.68, -0.3]]);
    mb.hexa('carbon', [[0.27 * s, 0.68, 0.6], [0.22 * s, 0.68, 0.6], [0.22 * s, 0.68, -0.3], [0.27 * s, 0.68, -0.3]], [[0.27 * s, 0.72, 0.6], [0.22 * s, 0.72, 0.6], [0.22 * s, 0.72, -0.3], [0.27 * s, 0.72, -0.3]]);
  }
  mb.prism('interior', [[-0.26, 0.6], [0.26, 0.6], [0.26, -0.3], [-0.26, -0.3]], 'y', 0.38, 0.42); // cockpit floor
  // Nose tip accent and the front of the tub in stripe colour.
  mb.hexa('stripe', ring(SPINE[0], 0.003, 0.003), ring([2.45, 0.1, 0.25, 0.38], 0.003, 0.003));
  mb.hexa('stripe', ring([-0.75, 0.33, 0.6, 0.83], 0.004, 0.004), ring([-1.0, 0.29, 0.55, 0.75], 0.004, 0.004));
}

function buildFrontWing(mb) {
  // Main plane and two flaps rising towards the wheels, with endplates and nose pylons.
  plate(mb, 'carbon', -1.08, 1.08, 2.82, 2.48, 0.1, 0.035, 0.02);
  for (const s of [1, -1]) {
    plate(mb, 'paint', 0.18 * s, 1.06 * s, 2.55, 2.36, 0.16, 0.025, 0.08);
    plate(mb, 'stripe', 0.3 * s, 1.04 * s, 2.42, 2.26, 0.26, 0.02, 0.07);
    mb.prism('carbon', [[2.86, 0.08], [2.24, 0.08], [2.24, 0.4], [2.5, 0.42], [2.86, 0.22]], 'x', 1.06 * s - 0.015, 1.06 * s + 0.015);
    rod(mb, 'carbon', [0.06 * s, 0.13, 2.6], [0.06 * s, 0.3, 2.5], 0.03); // pylons
  }
}

function buildSidepods(mb) {
  for (const s of [1, -1]) {
    const S = (p) => [p[0] * s, p[1], p[2]];
    const front = [[0.34, 0.18, 0.45], [0.76, 0.18, 0.45], [0.76, 0.52, 0.42], [0.34, 0.6, 0.45]].map(S);
    const mid = [[0.34, 0.18, -0.4], [0.72, 0.2, -0.4], [0.7, 0.5, -0.4], [0.34, 0.6, -0.4]].map(S);
    const rear = [[0.25, 0.18, -1.5], [0.36, 0.2, -1.5], [0.36, 0.32, -1.5], [0.25, 0.42, -1.5]].map(S);
    mb.hexa('paint', front, mid);
    mb.hexa('paint', mid, rear);
    // Inlet: dark opening in the pod front.
    mb.prism('grille', [[0.4 * s, 0.24], [0.72 * s, 0.24], [0.72 * s, 0.48], [0.4 * s, 0.54]].map(([x, y]) => [x, y]), 'z', 0.455, 0.47);
    // Undercut and sidepod wing / bargeboard.
    mb.prism('carbon', [[0.85, 0.12], [0.85, 0.5], [0.4, 0.52], [0.2, 0.12]].map(([z, y]) => [z, y]), 'x', 0.78 * s - 0.01, 0.78 * s + 0.01);
    // Mirror on a stalk.
    rod(mb, 'carbon', [0.33 * s, 0.66, 0.5], [0.52 * s, 0.78, 0.48], 0.025);
    mb.hexa('carbon', [[0.48 * s, 0.74, 0.5], [0.64 * s, 0.74, 0.5], [0.64 * s, 0.74, 0.44], [0.48 * s, 0.74, 0.44]], [[0.48 * s, 0.83, 0.5], [0.64 * s, 0.83, 0.5], [0.64 * s, 0.83, 0.44], [0.48 * s, 0.83, 0.44]]);
    mb.prism('chrome', [[0.49 * s, 0.75], [0.63 * s, 0.75], [0.63 * s, 0.82], [0.49 * s, 0.82]], 'z', 0.435, 0.44);
  }
}

function buildEngineAndRear(mb) {
  // Airbox intake above the driver, roll hoop, T-cam and the shark fin.
  mb.prism('grille', [[-0.11, 0.7], [0.11, 0.7], [0.1, 0.86], [-0.1, 0.86]], 'z', -0.33, -0.31);
  mb.hexa('paint', [[0.13, 0.8, -0.3], [-0.13, 0.8, -0.3], [-0.13, 0.88, -0.3], [0.13, 0.88, -0.3]], [[0.18, 0.78, -0.75], [-0.18, 0.78, -0.75], [-0.16, 0.9, -0.75], [0.16, 0.9, -0.75]]);
  mb.hexa('stripe', [[0.05, 0.9, -0.42], [-0.05, 0.9, -0.42], [-0.05, 0.94, -0.42], [0.05, 0.94, -0.42]], [[0.05, 0.9, -0.5], [-0.05, 0.9, -0.5], [-0.05, 0.94, -0.5], [0.05, 0.94, -0.5]]);
  mb.prism('paint', [[-0.75, 0.82], [-2.05, 0.95], [-2.05, 0.62], [-1.2, 0.62]], 'x', -0.012, 0.012);
  // Floor with edge wing, and the diffuser fins.
  mb.prism('carbon', [[-0.85, 1.0], [0.85, 1.0], [0.85, -2.05], [-0.85, -2.05]], 'y', 0.06, 0.09);
  for (const s of [1, -1]) mb.prism('carbon', [[1.0, 0.06], [1.0, 0.13], [-2.05, 0.13], [-2.05, 0.06]], 'x', 0.84 * s - 0.01, 0.84 * s + 0.01);
  for (const x of [-0.6, -0.3, 0, 0.3, 0.6]) mb.prism('carbon', [[-2.05, 0.08], [-2.42, 0.36], [-2.42, 0.4], [-2.05, 0.12]], 'x', x - 0.01, x + 0.01);
  mb.prism('carbon', [[-0.62, 0.36], [0.62, 0.36], [0.62, 0.4], [-0.62, 0.4]], 'z', -2.42, -2.4);
  // Rear wing: endplates, main plane, DRS flap, beam wing, swan-neck pylon.
  for (const s of [1, -1]) mb.prism('paint', [[-2.0, 0.5], [-2.0, 1.04], [-2.4, 1.08], [-2.42, 0.46]], 'x', 0.56 * s - 0.015, 0.56 * s + 0.015);
  plate(mb, 'carbon', -0.55, 0.55, -2.04, -2.3, 0.82, 0.04, 0.05);
  plate(mb, 'paint', -0.55, 0.55, -2.26, -2.4, 0.93, 0.03, 0.06);
  plate(mb, 'carbon', -0.5, 0.5, -2.1, -2.3, 0.45, 0.03, 0.04);
  rod(mb, 'carbon', [0, 0.6, -1.9], [0, 0.97, -2.3], 0.04);
  // Rain light.
  mb.prism('tail', [[-0.06, 0.28], [0.06, 0.28], [0.06, 0.36], [-0.06, 0.36]], 'z', -2.44, -2.42);
}

function buildSuspension(mb) {
  // Upper and lower wishbones and push rods from the tub to each hub.
  for (const [z, inner, yb, yt] of [[AXLE_FRONT, 0.28, 0.24, 0.5], [AXLE_REAR, 0.22, 0.24, 0.46]]) {
    for (const s of [1, -1]) {
      for (const [y0, y1] of [[yb, 0.26], [yt, 0.48]]) {
        rod(mb, 'carbon', [inner * s, y0, z + 0.22], [(HUB_X - 0.12) * s, y1, z], 0.028);
        rod(mb, 'carbon', [inner * s, y0, z - 0.22], [(HUB_X - 0.12) * s, y1, z], 0.028);
      }
      rod(mb, 'titanium', [(HUB_X - 0.15) * s, 0.27, z], [(inner + 0.02) * s, 0.58, z + (z > 0 ? -0.15 : 0.15)], 0.022);
    }
  }
}

export function buildDetails(mb) {
  buildFrontWing(mb);
  buildSidepods(mb);
  buildEngineAndRear(mb);
  buildSuspension(mb);
  // Halo: titanium hoop from the tub front over the cockpit to the roll-hoop sides.
  const H = [[0, 0.7, 0.6], [0, 0.88, 0.45], [0.16, 0.9, 0.2], [0.26, 0.88, -0.05], [0.28, 0.72, -0.25]];
  for (let k = 0; k < H.length - 1; k++) {
    rod(mb, 'titanium', H[k], H[k + 1], 0.045);
    if (k > 0) rod(mb, 'titanium', [-H[k][0], H[k][1], H[k][2]], [-H[k + 1][0], H[k + 1][1], H[k + 1][2]], 0.045);
  }
  // Number dot on the nose.
  lens(mb, 'plate', [0, 0.5, 1.75], [0, 0.85, 0.5], [0, 0, 1], 0.07, 0.07, { segments: 12 });
}

export function buildAnimatedParts(mats) {
  const cockpit = buildCockpit(mats, { seatX: 0, seatZ: -0.15, wheelZ: 0.32, wheelY: 0.55, seatY: -0.05 });
  const ex = buildExhausts(mats, [{ x: 0, y: 0.5, z: -2.3, r: 0.05, sides: 10 }]);
  const group = new Group();
  group.add(...cockpit.group.children, ...ex.group.children);
  return { group, head: cockpit.head, steering: cockpit.steering, flames: ex.flames };
}
