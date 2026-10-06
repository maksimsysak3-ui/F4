import { Group } from 'three';
import { lens } from '../../car/loft.js?v=a5d31c9';
import { MeshBuilder } from '../../car/meshBuilder.js?v=a5d31c9';
import { buildCockpit, buildExhausts } from '../../car/cockpit.js?v=a5d31c9';
import { rod, plate } from '../f1/body.js?v=a5d31c9';

/**
 * F1 2026, hand-built in design space (+X left, +Y up, +Z forward, ground at
 * y = 0). The new-rules car: narrower and shorter than the Mini F1, a low,
 * long nose on a simpler two-element front wing, sidepods with a deep undercut
 * washing down to a flat floor, a slim engine cover with a small fin, no beam
 * wing, and active aerodynamics: the front and rear wing flaps are separate
 * animated parts that lie flat on the straights (X-mode) and stand up for the
 * corners (Z-mode).
 */
export const AXLE_FRONT = 1.66;
export const AXLE_REAR = -1.66;
export const NOSE_Z = 2.72;
export const TAIL_Z = -2.34;
const HUB_X = 0.9;

// Tub/nose/engine cover sections: [z, half width, bottom y, top y].
const SPINE = [
  [2.62, 0.06, 0.2, 0.26], [2.3, 0.1, 0.19, 0.34], [1.95, 0.15, 0.18, 0.44], [1.45, 0.21, 0.17, 0.53],
  [0.95, 0.27, 0.16, 0.61], [0.55, 0.31, 0.15, 0.64], [-0.3, 0.33, 0.15, 0.66], [-0.72, 0.29, 0.15, 0.8],
  [-1.2, 0.2, 0.16, 0.6], [-1.7, 0.13, 0.17, 0.46], [-2.1, 0.08, 0.2, 0.38],
];
const ring = ([z, w, y0, y1], dw = 0, dy = 0) => [[w + dw, y0 - dy, z], [-w - dw, y0 - dy, z], [-w - dw, y1 + dy, z], [w + dw, y1 + dy, z]];

export function buildShell(mb) {
  for (let k = 0; k < SPINE.length - 1; k++) {
    const a = SPINE[k], b = SPINE[k + 1];
    const mid = (s) => [s[0], s[1], s[2], (s[2] + s[3]) / 2];
    const top = (s) => [s[0], s[1], (s[2] + s[3]) / 2, s[3]];
    mb.hexa('carbon', ring(mid(a)), ring(mid(b)));
    if (!(a[0] <= 0.55 && b[0] >= -0.3)) mb.hexa('paint', ring(top(a)), ring(top(b)));
  }
  for (const s of [1, -1]) {
    mb.hexa('paint', [[0.33 * s, 0.4, 0.55], [0.25 * s, 0.4, 0.55], [0.25 * s, 0.4, -0.3], [0.33 * s, 0.4, -0.3]], [[0.33 * s, 0.66, 0.55], [0.25 * s, 0.68, 0.55], [0.25 * s, 0.68, -0.3], [0.33 * s, 0.66, -0.3]]);
    mb.hexa('carbon', [[0.26 * s, 0.66, 0.55], [0.21 * s, 0.66, 0.55], [0.21 * s, 0.66, -0.3], [0.26 * s, 0.66, -0.3]], [[0.26 * s, 0.7, 0.55], [0.21 * s, 0.7, 0.55], [0.21 * s, 0.7, -0.3], [0.26 * s, 0.7, -0.3]]);
  }
  mb.prism('interior', [[-0.25, 0.55], [0.25, 0.55], [0.25, -0.3], [-0.25, -0.3]], 'y', 0.38, 0.42);
  // Livery: a stripe down the nose and along the engine cover.
  mb.hexa('stripe', ring([2.3, 0.1, 0.19, 0.34], 0.003, 0.003), ring([1.45, 0.21, 0.17, 0.53], 0.003, 0.003).map(([x, y, z], i) => (i > 1 ? [x * 0.45, y, z] : [x * 0.45, y + 0.33, z])));
  mb.hexa('stripe', ring([-0.72, 0.29, 0.62, 0.81], 0.004, 0.004), ring([-1.2, 0.2, 0.5, 0.61], 0.004, 0.004));
}

function buildFrontWing(mb) {
  // A simpler main plane, narrower than the old cars, with open endplates and a nose that sits on it.
  plate(mb, 'carbon', -1.0, 1.0, 2.8, 2.5, 0.09, 0.03, 0.015);
  for (const s of [1, -1]) {
    plate(mb, 'paint', 0.16 * s, 0.98 * s, 2.56, 2.42, 0.13, 0.022, 0.03); // the fixed second element
    mb.prism('carbon', [[2.84, 0.07], [2.3, 0.07], [2.32, 0.3], [2.6, 0.32], [2.84, 0.16]], 'x', 0.99 * s - 0.012, 0.99 * s + 0.012);
    mb.prism('stripe', [[2.6, 0.24], [2.36, 0.24], [2.36, 0.3], [2.6, 0.32]], 'x', 0.99 * s + 0.012, 0.99 * s + 0.016);
  }
}

function buildSidepods(mb) {
  for (const s of [1, -1]) {
    const S = (p) => [p[0] * s, p[1], p[2]];
    // High, narrow inlet; the undercut scooped out below; bodywork washing down to the floor.
    const front = [[0.33, 0.3, 0.38], [0.68, 0.3, 0.38], [0.68, 0.56, 0.36], [0.33, 0.62, 0.38]].map(S);
    const mid = [[0.33, 0.22, -0.3], [0.62, 0.22, -0.3], [0.6, 0.48, -0.3], [0.33, 0.6, -0.3]].map(S);
    const rear = [[0.22, 0.17, -1.45], [0.3, 0.18, -1.45], [0.3, 0.28, -1.45], [0.22, 0.36, -1.45]].map(S);
    mb.hexa('paint', front, mid);
    mb.hexa('paint', mid, rear);
    mb.prism('grille', [[0.38 * s, 0.34], [0.64 * s, 0.34], [0.64 * s, 0.53], [0.38 * s, 0.58]], 'z', 0.385, 0.4);
    // Undercut shadow and the floor's edge fence.
    mb.prism('carbon', [[0.34, 0.1], [0.34, 0.3], [-0.3, 0.22], [-0.3, 0.1]], 'x', 0.66 * s - 0.01, 0.66 * s + 0.01);
    rod(mb, 'carbon', [0.32 * s, 0.64, 0.45], [0.5 * s, 0.74, 0.43], 0.022);
    mb.hexa('carbon', [[0.46 * s, 0.7, 0.45], [0.6 * s, 0.7, 0.45], [0.6 * s, 0.7, 0.4], [0.46 * s, 0.7, 0.4]], [[0.46 * s, 0.78, 0.45], [0.6 * s, 0.78, 0.45], [0.6 * s, 0.78, 0.4], [0.46 * s, 0.78, 0.4]]);
  }
}

function buildEngineAndRear(mb) {
  mb.prism('grille', [[-0.1, 0.68], [0.1, 0.68], [0.09, 0.84], [-0.09, 0.84]], 'z', -0.33, -0.31);
  mb.hexa('paint', [[0.12, 0.78, -0.3], [-0.12, 0.78, -0.3], [-0.12, 0.86, -0.3], [0.12, 0.86, -0.3]], [[0.16, 0.76, -0.72], [-0.16, 0.76, -0.72], [-0.15, 0.86, -0.72], [0.15, 0.86, -0.72]]);
  mb.prism('paint', [[-0.72, 0.78], [-1.7, 0.84], [-1.7, 0.6], [-1.15, 0.6]], 'x', -0.01, 0.01); // small fin
  // A flatter floor (no big tunnels), a smaller diffuser.
  mb.prism('carbon', [[-0.8, 0.95], [0.8, 0.95], [0.8, -2.0], [-0.8, -2.0]], 'y', 0.06, 0.085);
  for (const s of [1, -1]) mb.prism('carbon', [[0.95, 0.06], [0.95, 0.12], [-2.0, 0.12], [-2.0, 0.06]], 'x', 0.79 * s - 0.01, 0.79 * s + 0.01);
  for (const x of [-0.45, -0.15, 0.15, 0.45]) mb.prism('carbon', [[-2.0, 0.08], [-2.3, 0.28], [-2.3, 0.31], [-2.0, 0.11]], 'x', x - 0.01, x + 0.01);
  // Rear wing: tall endplates, the fixed main plane on a single pylon. No beam wing.
  for (const s of [1, -1]) mb.prism('paint', [[-1.98, 0.62], [-1.98, 1.02], [-2.36, 1.06], [-2.38, 0.58]], 'x', 0.52 * s - 0.014, 0.52 * s + 0.014);
  plate(mb, 'carbon', -0.51, 0.51, -2.02, -2.24, 0.82, 0.035, 0.04);
  rod(mb, 'carbon', [0, 0.6, -1.85], [0, 0.84, -2.15], 0.04);
  mb.prism('tail', [[-0.06, 0.26], [0.06, 0.26], [0.06, 0.34], [-0.06, 0.34]], 'z', -2.33, -2.31);
  for (const s of [1, -1]) mb.prism('tail', [[0.5 * s - 0.01, 0.66], [0.5 * s + 0.01, 0.66], [0.5 * s + 0.01, 0.96], [0.5 * s - 0.01, 0.96]], 'z', -2.385, -2.375); // endplate LEDs
}

function buildSuspension(mb) {
  for (const [z, inner, yb, yt] of [[AXLE_FRONT, 0.26, 0.22, 0.48], [AXLE_REAR, 0.2, 0.22, 0.44]]) {
    for (const s of [1, -1]) {
      for (const [y0, y1] of [[yb, 0.25], [yt, 0.46]]) {
        rod(mb, 'carbon', [inner * s, y0, z + 0.2], [(HUB_X - 0.12) * s, y1, z], 0.026);
        rod(mb, 'carbon', [inner * s, y0, z - 0.2], [(HUB_X - 0.12) * s, y1, z], 0.026);
      }
      rod(mb, 'titanium', [(HUB_X - 0.14) * s, 0.46, z], [(inner + 0.02) * s, 0.2, z + (z > 0 ? -0.14 : 0.14)], 0.02); // pull rods
    }
  }
}

export function buildDetails(mb) {
  buildFrontWing(mb);
  buildSidepods(mb);
  buildEngineAndRear(mb);
  buildSuspension(mb);
  const H = [[0, 0.68, 0.55], [0, 0.86, 0.42], [0.15, 0.88, 0.18], [0.25, 0.86, -0.05], [0.27, 0.7, -0.25]];
  for (let k = 0; k < H.length - 1; k++) {
    rod(mb, 'titanium', H[k], H[k + 1], 0.042);
    if (k > 0) rod(mb, 'titanium', [-H[k][0], H[k][1], H[k][2]], [-H[k + 1][0], H[k + 1][1], H[k + 1][2]], 0.042);
  }
  lens(mb, 'plate', [0, 0.42, 1.7], [0, 0.85, 0.5], [0, 0, 1], 0.065, 0.065, { segments: 12 });
}

// Flap angles (rad, trailing edge up) in Z-mode and X-mode.
const FRONT_Z = 0.42, FRONT_X = 0.06, REAR_Z = 0.55, REAR_X = 0.04;

export function buildAnimatedParts(mats) {
  const cockpit = buildCockpit(mats, { seatX: 0, seatZ: -0.15, wheelZ: 0.3, wheelY: 0.54, seatY: -0.05 });
  const ex = buildExhausts(mats, [{ x: 0, y: 0.48, z: -2.24, r: 0.045, sides: 10 }]);
  const group = new Group();
  group.add(...cockpit.group.children, ...ex.group.children);
  // The active flaps: each built about its hinge on the leading edge.
  const flap = (key, x0, x1, chord, thick, z, y) => {
    const mb = new MeshBuilder();
    plate(mb, key, x0, x1, 0, -chord, 0, thick, 0);
    const g = new Group();
    g.add(mb.build(mats));
    g.position.set(0, y, z);
    group.add(g);
    return g;
  };
  const flaps = [
    { g: flap('stripe', 0.3, 0.97, 0.15, 0.02, 2.42, 0.2), z: FRONT_Z, x: FRONT_X },
    { g: flap('stripe', -0.97, -0.3, 0.15, 0.02, 2.42, 0.2), z: FRONT_Z, x: FRONT_X },
    { g: flap('paint', -0.5, 0.5, 0.17, 0.028, -2.22, 0.9), z: REAR_Z, x: REAR_X },
  ];
  const animate = (vehicle) => {
    const m = vehicle.aeroMode ?? 0;
    for (const f of flaps) f.g.rotation.x = f.z + (f.x - f.z) * m;
  };
  animate({ aeroMode: 0 });
  return { group, head: cockpit.head, steering: cockpit.steering, flames: ex.flames, animate };
}
