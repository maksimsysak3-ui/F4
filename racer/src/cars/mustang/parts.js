import { Group } from 'three';
import { lens } from '../../car/loft.js?v=a5d31c9';
import { buildCockpit, buildExhausts } from '../../car/cockpit.js?v=a5d31c9';
import {
  loft, sectionAt, NOSE_Z, TAIL_Z, COWL_Z, ROOF_FRONT_Z, FASTBACK_Z, DECK_Z,
} from './body.js?v=a5d31c9';

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

/** Surface point lifted along the normal. */
function lifted(z, s, side, lift) {
  return add(loft.surfacePoint(z, s, side), scale(loft.surfaceNormal(z, s, side), lift));
}

// ---------------------------------------------------------------------------
// Front: shark-nose grille, round headlights, pony badge, chrome blade bumper.

// Galloping pony silhouette, running to the viewer's left, roughly 2 x 1.2 units.
const PONY = [
  [-1.0, 0.55], [-0.8, 0.8], [-0.62, 0.95], [-0.45, 0.7], [0.25, 0.55], [0.7, 0.75], [1.0, 0.5],
  [0.62, 0.45], [0.45, 0.3], [0.85, -0.05], [0.75, -0.18], [0.3, 0.1], [-0.1, 0.12], [-0.55, -0.2],
  [-0.68, -0.1], [-0.45, 0.25], [-0.7, 0.42], [-0.92, 0.4],
];

function buildFront(mb) {
  const z = NOSE_Z;
  // Chrome surround, then the black egg-crate grille inside it.
  mb.prism('chrome', [[-0.6, 0.31], [0.6, 0.31], [0.6, 0.64], [-0.6, 0.64]], 'z', z + 0.002, z + 0.01);
  mb.prism('grille', [[-0.57, 0.335], [0.57, 0.335], [0.57, 0.615], [-0.57, 0.615]], 'z', z + 0.01, z + 0.016);
  for (const y of [0.4, 0.475, 0.55]) {
    mb.prism('chrome', [[-0.56, y - 0.006], [0.56, y - 0.006], [0.56, y + 0.006], [-0.56, y + 0.006]], 'z', z + 0.016, z + 0.02);
  }
  // Pony in its corral: chrome horse with a bar either side.
  const k = 0.075;
  mb.prism('chrome', PONY.map(([x, y]) => [x * k, 0.445 + y * k]), 'z', z + 0.02, z + 0.034);
  for (const s of [1, -1]) {
    mb.prism('chrome', [[0.11 * s, 0.47], [0.36 * s, 0.47], [0.36 * s, 0.482], [0.11 * s, 0.482]], 'z', z + 0.02, z + 0.026);
    // Round headlights with chrome bezels at the ends of the grille.
    lens(mb, 'lamp', [0.72 * s, 0.5, z + 0.012], [0, 0, 1], [0, 1, 0], 0.085, 0.085, { segments: 14, dome: 0.03, rim: 'chrome', rimWidth: 0.02 });
    // Amber parking lamps in the valance.
    mb.prism('amber', [[0.42 * s, 0.17], [0.6 * s, 0.17], [0.6 * s, 0.205], [0.42 * s, 0.205]], 'z', z - 0.02, z + 0.012);
    // Shelby hood pins.
    lens(mb, 'chrome', lifted(1.62, 4.6, s, 0.002), loft.surfaceNormal(1.62, 4.6, s), [0, 0, 1], 0.022, 0.022, { segments: 8, dome: 0.008 });
  }
  // Full-width chrome blade bumper (its ends wrap back along the fenders) and a black chin under it.
  mb.prismMirrorX('chrome', [[z - 0.2, 0.23], [z + 0.07, 0.23], [z + 0.07, 0.29], [z - 0.2, 0.29]], 0.86, 0.9);
  mb.prism('chrome', [[-0.9, 0.23], [0.9, 0.23], [0.9, 0.29], [-0.9, 0.29]], 'z', z - 0.02, z + 0.07);
  mb.prism('black', [[-0.8, 0.1], [0.8, 0.1], [0.8, 0.225], [-0.8, 0.225]], 'z', z - 0.3, z - 0.005);
}

// ---------------------------------------------------------------------------
// Hood scoop and Le Mans stripes.

function buildHood(mb) {
  const yf = sectionAt(1.3)[6][1];
  const yr = sectionAt(0.8)[6][1];
  mb.hexa('paint',
    [[0.17, yf - 0.01, 1.3], [-0.17, yf - 0.01, 1.3], [-0.2, yr - 0.01, 0.8], [0.2, yr - 0.01, 0.8]],
    [[0.14, yf + 0.075, 1.27], [-0.14, yf + 0.075, 1.27], [-0.17, yr + 0.02, 0.8], [0.17, yr + 0.02, 0.8]]);
  mb.quad('grille', [0.145, yf + 0.005, 1.305], [0.125, yf + 0.065, 1.275], [-0.125, yf + 0.065, 1.275], [-0.145, yf + 0.005, 1.305]);
}

/** Twin stripes over hood, roof and deck (skipping the glass), x from xi to xo either side. */
function buildStripes(mb, xi = 0.06, xo = 0.2) {
  const onGlass = (z) => (z < COWL_Z && z > ROOF_FRONT_Z) || (z < FASTBACK_Z && z > DECK_Z);
  const sAt = (z, x) => 6 - x / sectionAt(z)[5][0];
  const step = 0.05;
  for (let za = NOSE_Z - 0.005; za > TAIL_Z + 0.01; za -= step) {
    const zb = Math.max(TAIL_Z + 0.005, za - step);
    if (onGlass((za + zb) / 2)) continue;
    for (const side of [1, -1]) {
      const corners = [[za, sAt(za, xo)], [zb, sAt(zb, xo)], [zb, sAt(zb, xi)], [za, sAt(za, xi)]];
      const p = corners.map(([z, s]) => lifted(z, s, side, 0.004));
      const n = loft.surfaceNormal((za + zb) / 2, sAt(za, (xi + xo) / 2), side);
      mb.triFacing('stripe', p[0], p[1], p[2], n);
      mb.triFacing('stripe', p[0], p[2], p[3], n);
    }
  }
}

// ---------------------------------------------------------------------------
// Sides: side scoops, rocker stripe, chrome trim, C-pillar louvres, mirrors.

function buildSides(mb) {
  for (const side of [1, -1]) {
    // Side scoop ahead of the rear wheel.
    loft.decal(mb, 'grille', [[-0.36, 2.2], [-0.56, 1.4], [-0.56, 2.8]], 0.006, side);
    loft.ribbon(mb, 'chrome', [[-0.34, 2.22], [-0.45, 1.8], [-0.57, 1.36]], 0.016, 0.012, side);
    loft.ribbon(mb, 'chrome', [[-0.34, 2.22], [-0.45, 2.5], [-0.57, 2.84]], 0.016, 0.012, side);
    // The side sculpture: a crease running back from the front fender into the scoop.
    loft.ribbon(mb, 'black', [[1.52, 2.35], [1.1, 2.3], [0.5, 2.25], [0, 2.22], [-0.34, 2.2]], 0.012, 0.004, side);
    // GT rocker stripe between the wheels.
    loft.ribbon(mb, 'stripe', [[0.55, 0.62], [0.3, 0.62], [0, 0.62], [-0.3, 0.62], [-0.55, 0.62]], 0.06, 0.006, side);
    // Bright window and drip-rail mouldings.
    loft.ribbon(mb, 'chrome', [[COWL_Z - 0.01, 4.02], [0.1, 4.02], [-0.3, 4.02], [FASTBACK_Z + 0.01, 4.02]], 0.014, 0.006, side);
    loft.ribbon(mb, 'chrome', [[COWL_Z - 0.01, 5.0], [ROOF_FRONT_Z, 5.0], [-0.52, 5.0], [FASTBACK_Z, 5.0], [-0.9, 5.0], [DECK_Z + 0.01, 5.0]], 0.012, 0.006, side);
    // Fastback C-pillar louvres.
    for (const z of [-0.8, -0.91, -1.02]) loft.ribbon(mb, 'black', [[z, 4.18], [z - 0.06, 4.85]], 0.03, 0.008, side);
    // Door handle.
    loft.ribbon(mb, 'chrome', [[-0.26, 2.68], [-0.36, 2.68]], 0.028, 0.012, side);

    // Chrome bullet mirror on a short stem.
    const X = (p) => [p[0] * side, p[1], p[2]];
    mb.hexa('chrome',
      [[0.84, 0.83, 0.15], [0.84, 0.83, 0.11], [0.93, 0.87, 0.11], [0.93, 0.87, 0.15]].map(X),
      [[0.84, 0.85, 0.15], [0.84, 0.85, 0.11], [0.93, 0.89, 0.11], [0.93, 0.89, 0.15]].map(X));
    mb.hexa('chrome',
      [[0.91, 0.86, 0.18], [0.91, 0.86, 0.07], [1.0, 0.865, 0.08], [1.0, 0.865, 0.15]].map(X),
      [[0.91, 0.935, 0.18], [0.91, 0.935, 0.07], [1.0, 0.93, 0.08], [1.0, 0.93, 0.15]].map(X));
  }
}

// ---------------------------------------------------------------------------
// Rear: Kamm tail panel, tri-bar tail lights, pop-open fuel cap, ducktail.

function buildRear(mb) {
  const z = TAIL_Z;
  mb.prism('black', [[-0.8, 0.43], [0.8, 0.43], [0.8, 0.75], [-0.8, 0.75]], 'z', z - 0.01, z - 0.002);
  for (const s of [1, -1]) {
    const S = (pts) => pts.map(([x, y]) => [x * s, y]);
    mb.prism('chrome', S([[0.24, 0.5], [0.77, 0.5], [0.77, 0.7], [0.24, 0.7]]), 'z', z - 0.016, z - 0.01);
    for (const [x0, x1] of [[0.27, 0.4], [0.435, 0.565], [0.6, 0.735]]) {
      mb.prism('tail', S([[x0, 0.53], [x1, 0.53], [x1, 0.67], [x0, 0.67]]), 'z', z - 0.024, z - 0.016);
    }
    mb.prism('reverse', S([[0.4, 0.2], [0.52, 0.2], [0.52, 0.245], [0.4, 0.245]]), 'z', z - 0.03, z - 0.005);
  }
  mb.prismMirrorX('chrome', [[z - 0.07, 0.3], [z + 0.15, 0.3], [z + 0.15, 0.37], [z - 0.07, 0.37]], 0.86, 0.9);
  lens(mb, 'chrome', [0, 0.6, z - 0.012], [0, 0, -1], [0, 1, 0], 0.06, 0.06, { segments: 14, dome: 0.015 });
  mb.prism('chrome', [[-0.9, 0.3], [0.9, 0.3], [0.9, 0.37], [-0.9, 0.37]], 'z', z - 0.07, z + 0.01);
  mb.prism('black', [[-0.82, 0.12], [0.82, 0.12], [0.82, 0.3], [-0.82, 0.3]], 'z', z - 0.02, z + 0.25);
  mb.prism('plate', [[-0.15, 0.17], [0.15, 0.17], [0.15, 0.285], [-0.15, 0.285]], 'z', z - 0.035, z - 0.02);
  // Flip-up ducktail spoiler across the tail.
  mb.prism('paint', [[-1.58, 0.825], [-1.785, 0.795], [-1.795, 0.855], [-1.7, 0.85]], 'x', -0.84, 0.84);
}

function buildInterior(mb) {
  mb.prism('interior', [[0.76, 0.2], [0.76, -0.85], [-0.76, -0.85], [-0.76, 0.2]], 'y', 0.2, 0.26);
  mb.prism('interior', [[0.2, 0.8], [-0.04, 0.8], [-0.12, 0.62], [0.06, 0.5], [0.2, 0.5]], 'x', -0.76, 0.76);
  mb.prism('alcantara', [[0.12, 0.42], [-0.58, 0.42], [-0.58, 0.26], [0.12, 0.26]], 'x', -0.09, 0.09);
  const seat = [[-0.17, 0.27], [-0.54, 0.27], [-0.7, 0.86], [-0.6, 0.88], [-0.46, 0.42], [-0.16, 0.4]];
  for (const x of [0.33, -0.33]) mb.prism('alcantara', seat, 'x', x - 0.16, x + 0.16);
}

// ---------------------------------------------------------------------------

export function buildDetails(mb) {
  buildFront(mb);
  buildHood(mb);
  buildStripes(mb);
  buildSides(mb);
  buildRear(mb);
  buildInterior(mb);
}

export function buildAnimatedParts(mats) {
  const cockpit = buildCockpit(mats, { seatX: 0.33, seatZ: -0.4, wheelZ: -0.07, wheelY: 0.68, seatY: -0.03 });
  // Twin round tailpipes poking out under the rear bumper.
  const ex = buildExhausts(mats, [0.55, -0.55].map((x) => ({ x, y: 0.2, z: TAIL_Z, r: 0.045, sides: 10 })));
  const group = new Group();
  group.add(...cockpit.group.children, ...ex.group.children);
  return { group, head: cockpit.head, steering: cockpit.steering, flames: ex.flames };
}
