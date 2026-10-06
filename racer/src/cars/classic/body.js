import { Group } from 'three';
import { buildCockpit, buildExhausts } from '../../car/cockpit.js';

/**
 * 1967-style Grand Prix car, hand-built in design space (+X left, +Y up, +Z
 * forward, ground at y = 0): a slim cigar-tube monocoque tapering to an oval
 * nose intake, a small wraparound aeroscreen, the driver sitting up in the
 * open, a roll hoop, the bare 3-litre V8 behind him with its eight intake
 * trumpets and snaking exhausts, outboard wishbones to the wire wheels, and the
 * white number roundels on the nose and flanks. No wings.
 */
export const AXLE_FRONT = 1.28;
export const AXLE_REAR = -1.28;
export const NOSE_Z = 2.42;
export const TAIL_Z = -2.0;
const HUB_X = 0.86;

// The tube: [z, half width, centre height, half height].
const TUBE = [
  [2.42, 0.1, 0.4, 0.075], [2.32, 0.16, 0.41, 0.12], [2.1, 0.21, 0.42, 0.16], [1.7, 0.25, 0.43, 0.2],
  [1.2, 0.28, 0.44, 0.23], [0.6, 0.31, 0.45, 0.25], [0.0, 0.32, 0.45, 0.25], [-0.5, 0.31, 0.44, 0.24],
  [-1.0, 0.28, 0.42, 0.21], [-1.5, 0.23, 0.4, 0.17], [-1.85, 0.17, 0.38, 0.12], [-2.0, 0.11, 0.38, 0.08],
];
const SIDES = 16;
const ringAt = ([z, w, y, h], open = false) => Array.from({ length: SIDES }, (_, k) => {
  const a = (k / SIDES) * Math.PI * 2;
  // The cockpit opening flattens the top of the section.
  const yy = y + Math.sin(a) * h * (open && Math.sin(a) > 0.5 ? 0.55 : 1);
  return [Math.cos(a) * w, yy, z];
});

function tube(mb, key, p, q, d) {
  const v = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], len = Math.hypot(...v) || 1, t = v.map((x) => x / len);
  let u = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  let w = cr(t, u); const lw = Math.hypot(...w); w = w.map((x) => x / lw); u = cr(w, t);
  const ring = (c) => Array.from({ length: 6 }, (_, k) => { const a = (k / 6) * Math.PI * 2, ca = Math.cos(a) * d / 2, sa = Math.sin(a) * d / 2; return [c[0] + u[0] * ca + w[0] * sa, c[1] + u[1] * ca + w[1] * sa, c[2] + u[2] * ca + w[2] * sa]; });
  const A = ring(p), B = ring(q);
  for (let k = 0; k < 6; k++) mb.quad(key, A[k], A[(k + 1) % 6], B[(k + 1) % 6], B[k]);
}

export function buildShell(mb) {
  for (let k = 0; k < TUBE.length - 1; k++) {
    const a = TUBE[k], b = TUBE[k + 1];
    const open = a[0] <= 0.62 && b[0] >= -0.52; // cockpit between z 0.6 and -0.5
    const A = ringAt(a, open), B = ringAt(b, open);
    for (let s = 0; s < SIDES; s++) {
      const s2 = (s + 1) % SIDES;
      const top = Math.sin(((s + 0.5) / SIDES) * Math.PI * 2) > 0.7;
      if (open && top) continue; // the opening itself
      mb.quad('paint', A[s], A[s2], B[s2], B[s]);
    }
  }
  // Nose intake: a dark oval mouth with a polished lip; the tail closes in a cone.
  const nose = ringAt(TUBE[0]);
  for (let s = 0; s < SIDES; s++) mb.tri('grille', [0, 0.42, TUBE[0][0] + 0.005], nose[(s + 1) % SIDES], nose[s]);
  const tail = ringAt(TUBE.at(-1));
  for (let s = 0; s < SIDES; s++) mb.tri('paint', [0, 0.38, TAIL_Z - 0.12], tail[s], tail[(s + 1) % SIDES]);
  // Cockpit: padded rim, the seat back, a small wraparound aeroscreen.
  mb.prism('interior', [[-0.27, 0.6], [0.27, 0.6], [0.27, -0.45], [-0.27, -0.45]], 'y', 0.24, 0.3);
  mb.prism('alcantara', [[-0.36, 0.3], [-0.5, 0.3], [-0.55, 0.8], [-0.42, 0.82]], 'x', -0.22, 0.22);
  for (const s of [1, -1]) mb.hexa('glass', [[0.12 * s, 0.68, 0.62], [0.27 * s, 0.66, 0.52], [0.27 * s, 0.66, 0.5], [0.12 * s, 0.68, 0.6]], [[0.1 * s, 0.86, 0.56], [0.25 * s, 0.82, 0.48], [0.25 * s, 0.82, 0.46], [0.1 * s, 0.86, 0.54]]);
  mb.hexa('glass', [[-0.12, 0.68, 0.62], [0.12, 0.68, 0.62], [0.12, 0.68, 0.6], [-0.12, 0.68, 0.6]], [[-0.1, 0.87, 0.56], [0.1, 0.87, 0.56], [0.1, 0.87, 0.54], [-0.1, 0.87, 0.54]]);
}

function buildEngine(mb) {
  // The V8 in the open: block, two cam covers, eight trumpets, oil tank, gearbox, exhausts.
  mb.prism('chrome', [[-1.55, 0.26], [-0.6, 0.26], [-0.6, 0.6], [-1.55, 0.56]], 'x', -0.22, 0.22);
  for (const s of [1, -1]) {
    mb.prism('titanium', [[-1.5, 0.6], [-0.65, 0.62], [-0.65, 0.7], [-1.5, 0.68]], 'x', s * 0.12 - 0.07, s * 0.12 + 0.07);
    for (let k = 0; k < 4; k++) tube(mb, 'chrome', [s * 0.06, 0.64, -0.75 - k * 0.2], [s * 0.04, 0.84, -0.75 - k * 0.2], 0.06);
    // Exhausts: four pipes per bank sweeping out, down and back into a pair of tailpipes.
    for (let k = 0; k < 4; k++) {
      const z = -0.75 - k * 0.2;
      tube(mb, 'titanium', [s * 0.22, 0.42, z], [s * 0.34, 0.36, z - 0.15], 0.045);
      tube(mb, 'titanium', [s * 0.34, 0.36, z - 0.15], [s * (0.27 + (k - 1.5) * 0.012), 0.36, -1.75], 0.045);
    }
    tube(mb, 'titanium', [s * 0.27, 0.36, -1.75], [s * 0.27, 0.4, -2.15], 0.08);
  }
  mb.prism('black', [[-2.0, 0.26], [-1.55, 0.26], [-1.55, 0.5], [-2.0, 0.46]], 'x', -0.16, 0.16); // gearbox
  mb.prism('stripe', [[0.62, 0.62], [0.48, 0.62], [0.48, 0.8], [0.62, 0.78]], 'x', -0.03, 0.03); // dash cowl
  // Roll hoop behind the driver's head.
  tube(mb, 'chrome', [0.2, 0.62, -0.5], [0.16, 1.02, -0.52], 0.04);
  tube(mb, 'chrome', [-0.2, 0.62, -0.5], [-0.16, 1.02, -0.52], 0.04);
  tube(mb, 'chrome', [0.16, 1.02, -0.52], [-0.16, 1.02, -0.52], 0.04);
  tube(mb, 'chrome', [0, 1.02, -0.52], [0, 0.66, -1.0], 0.03);
}

function buildSuspension(mb) {
  for (const [z, inner] of [[AXLE_FRONT, 0.24], [AXLE_REAR, 0.2]]) {
    for (const s of [1, -1]) {
      for (const [y0, y1] of [[0.3, 0.3], [0.52, 0.5]]) {
        tube(mb, 'black', [inner * s, y0, z + 0.2], [(HUB_X - 0.1) * s, y1, z], 0.03);
        tube(mb, 'black', [inner * s, y0, z - 0.2], [(HUB_X - 0.1) * s, y1, z], 0.03);
      }
      tube(mb, 'chrome', [(HUB_X - 0.14) * s, 0.32, z], [(inner + 0.04) * s, 0.62, z + (z > 0 ? -0.18 : 0.18)], 0.035); // spring-damper
    }
  }
  // Mirrors on short stalks either side of the screen.
  for (const s of [1, -1]) {
    tube(mb, 'chrome', [0.3 * s, 0.66, 0.5], [0.42 * s, 0.76, 0.48], 0.02);
    mb.hexa('chrome', [[0.38 * s, 0.72, 0.5], [0.5 * s, 0.72, 0.5], [0.5 * s, 0.72, 0.46], [0.38 * s, 0.72, 0.46]], [[0.38 * s, 0.8, 0.5], [0.5 * s, 0.8, 0.5], [0.5 * s, 0.8, 0.46], [0.38 * s, 0.8, 0.46]]);
  }
}

function buildRoundels(mb) {
  // White number roundels: on the nose, and either flank by the cockpit, with the stripe colour number disc.
  const disc = (c, n, r, key) => {
    const u = Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const v1 = cr(n, u), v2 = cr(n, v1);
    for (let k = 0; k < 14; k++) {
      const a0 = (k / 14) * Math.PI * 2, a1 = ((k + 1) / 14) * Math.PI * 2;
      const p = (a) => [c[0] + (v1[0] * Math.cos(a) + v2[0] * Math.sin(a)) * r, c[1] + (v1[1] * Math.cos(a) + v2[1] * Math.sin(a)) * r, c[2] + (v1[2] * Math.cos(a) + v2[2] * Math.sin(a)) * r];
      mb.triFacing(key, c, p(a0), p(a1), n);
    }
  };
  disc([0, 0.63, 1.75], [0, 1, 0.22], 0.14, 'plate');
  for (const s of [1, -1]) {
    disc([0.325 * s, 0.46, 0.15], [s, 0, 0], 0.16, 'plate');
    disc([0.328 * s, 0.46, 0.15], [s, 0, 0], 0.065, 'stripe');
  }
}

export function buildDetails(mb) {
  buildEngine(mb);
  buildSuspension(mb);
  buildRoundels(mb);
}

export function buildAnimatedParts(mats) {
  // Sitting up in the open, the helmet and shoulders above the tube.
  const cockpit = buildCockpit(mats, { seatX: 0, seatZ: -0.15, wheelZ: 0.35, wheelY: 0.62, seatY: -0.06 });
  const ex = buildExhausts(mats, [0.27, -0.27].map((x) => ({ x, y: 0.4, z: -2.15, r: 0.04, sides: 10 })));
  const group = new Group();
  group.add(...cockpit.group.children, ...ex.group.children);
  return { group, head: cockpit.head, steering: cockpit.steering, flames: ex.flames };
}
