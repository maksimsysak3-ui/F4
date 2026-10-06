import { Group } from 'three';
import { loft, sectionAt, NOSE_Z, TAIL_Z } from './body.js?v=a5d31c9';
import { buildCockpit, buildExhausts } from '../../car/cockpit.js?v=a5d31c9';

const surfaceRibbon = loft.ribbon;
const surfaceDecal = loft.decal;

// ---------------------------------------------------------------------------
// Static body details, all emitted into the shared MeshBuilder.

function buildFront(mb) {
  const z = NOSE_Z;
  const face = [z + 0.002, z + 0.012];
  for (const side of [1, -1]) {
    const S = (pts) => pts.map(([x, y]) => [x * side, y]);
    // Big side intakes with a body-coloured blade through them.
    mb.prism('grille', S([[0.16, 0.15], [0.56, 0.145], [0.64, 0.205], [0.61, 0.3], [0.33, 0.33], [0.2, 0.26]]), 'z', ...face);
    mb.prism('paint', S([[0.22, 0.235], [0.63, 0.25], [0.62, 0.268], [0.24, 0.255]]), 'z', face[1], face[1] + 0.012);
    // Headlight DRL: the "Y" signature, a main stroke with a fork.
    surfaceRibbon(mb, 'drl', [[1.695, 3.3], [1.63, 3.3], [1.58, 3.35], [1.505, 3.45]], 0.018, 0.006, side);
    surfaceRibbon(mb, 'drl', [[1.63, 3.3], [1.58, 3.55], [1.53, 3.8]], 0.014, 0.006, side);
  }
  mb.prism('grille', [[-0.12, 0.15], [0.12, 0.15], [0.1, 0.22], [-0.1, 0.22]], 'z', ...face);

  // Little gold shield.
  mb.prism('gold', [[-0.032, 0.395], [0.032, 0.395], [0.034, 0.36], [0, 0.335], [-0.034, 0.36]], 'z', z - 0.01, z + 0.012);

  // Carbon splitter with an upturned centre.
  mb.prism('carbon', [[0.62, 1.79], [0.84, 1.66], [0.86, 1.5], [-0.86, 1.5], [-0.84, 1.66], [-0.62, 1.79]], 'y', 0.07, 0.1);
  for (const x of [0.35, -0.35]) mb.prism('carbon', [[1.5, 0.1], [1.78, 0.1], [1.72, 0.15], [1.5, 0.16]], 'x', x - 0.008, x + 0.008);
}

function buildRear(mb) {
  const z = TAIL_Z;
  const face = [z - 0.012, z - 0.002];
  // Black mesh panel across the tail.
  mb.prism('grille', [[0.8, 0.3], [0.86, 0.56], [0.7, 0.63], [-0.7, 0.63], [-0.86, 0.56], [-0.8, 0.3]], 'z', ...face);
  for (const side of [1, -1]) {
    const S = (pts) => pts.map(([x, y]) => [x * side, y]);
    // Y-shaped tail light (Huracán signature) with a thin LED bar towards the centre.
    mb.prism('tail', S([
      [0.4, 0.752], [0.63, 0.742], [0.79, 0.655], [0.835, 0.672], [0.69, 0.752],
      [0.875, 0.762], [0.872, 0.788], [0.4, 0.774],
    ]), 'z', z - 0.018, z - 0.001);
    mb.prism('tail', S([[0.18, 0.758], [0.38, 0.756], [0.38, 0.768], [0.18, 0.77]]), 'z', z - 0.012, z - 0.001);
    // Diffuser strakes.
    for (const x of [0.62, 0.34]) {
      mb.prism('carbon', [[-1.2, 0.2], [-1.69, 0.08], [-1.69, 0.3], [-1.55, 0.3]], 'x', x * side - 0.01, x * side + 0.01);
    }
  }
  mb.prism('carbon', [[-1.2, 0.2], [-1.69, 0.08], [-1.69, 0.3], [-1.55, 0.3]], 'x', -0.01, 0.01);
  mb.prism('carbon', [[0.82, -1.66], [0.82, -1.3], [-0.82, -1.3], [-0.82, -1.66]], 'y', 0.12, 0.14);
  mb.prism('reverse', [[-0.09, 0.33], [0.09, 0.33], [0.09, 0.36], [-0.09, 0.36]], 'z', z - 0.02, z - 0.008);
}

function buildRearWing(mb) {
  // STO-style big wing on swan-neck struts, comically large on a tiny car.
  const foil = [[-1.29, 1.14], [-1.35, 1.172], [-1.5, 1.18], [-1.66, 1.16], [-1.66, 1.148], [-1.5, 1.14], [-1.36, 1.127]];
  mb.prism('paint', foil, 'x', -0.86, 0.86);
  const gurney = [[-1.66, 1.16], [-1.672, 1.16], [-1.672, 1.19], [-1.66, 1.19]];
  mb.prism('carbon', gurney, 'x', -0.86, 0.86);
  const plate = [[-1.24, 1.03], [-1.69, 1.06], [-1.69, 1.24], [-1.38, 1.2]];
  mb.prismMirrorX('carbon', plate, 0.86, 0.885);
  const strut = [[-1.36, 0.86], [-1.47, 0.86], [-1.5, 1.135], [-1.42, 1.135]];
  mb.prismMirrorX('carbon', strut, 0.39, 0.415);
}

function buildRoof(mb) {
  // STO roof snorkel: low, tapering towards the rear.
  const yf = sectionAt(-0.04)[6][1];
  const yr = sectionAt(-0.55)[6][1];
  mb.hexa('paint',
    [[0.15, yf - 0.02, -0.02], [-0.15, yf - 0.02, -0.02], [-0.1, yr - 0.02, -0.56], [0.1, yr - 0.02, -0.56]],
    [[0.12, yf + 0.065, -0.05], [-0.12, yf + 0.065, -0.05], [-0.05, yr + 0.02, -0.56], [0.05, yr + 0.02, -0.56]]);
  mb.quad('grille', [0.125, yf - 0.005, -0.017], [0.105, yf + 0.055, -0.045], [-0.105, yf + 0.055, -0.045], [-0.125, yf - 0.005, -0.017]);

  // Shark fin down the engine cover.
  const fin = [];
  for (let z = -0.55; z >= -1.451; z -= 0.15) fin.push([z, sectionAt(z)[6][1] - 0.02]);
  fin.push([-1.45, 1.075], [-0.55, sectionAt(-0.55)[6][1] + 0.03]);
  mb.prism('paint', fin, 'x', -0.009, 0.009);

  // Louvre slats over the carbon engine cover.
  for (let z = -0.72; z > -1.24; z -= 0.1) {
    const p = sectionAt(z);
    const [x5, y5] = p[5];
    const y6 = p[6][1];
    const band = [[-x5, y5 - 0.012], [0, y6 - 0.012], [x5, y5 - 0.012], [x5, y5 + 0.014], [0, y6 + 0.014], [-x5, y5 + 0.014]];
    mb.prism('paint', band, 'z', z - 0.018, z + 0.018);
  }
}

function buildSides(mb) {
  for (const side of [1, -1]) {
    // The Huracán's triangular side intake, pointing forwards from the rear arch.
    surfaceDecal(mb, 'grille', [[-0.2, 1.55], [-0.54, 0.75], [-0.54, 2.75]], 0.006, side);
    // Thin body-coloured blade along its upper edge.
    surfaceRibbon(mb, 'paint', [[-0.18, 1.62], [-0.3, 2.04], [-0.42, 2.45], [-0.54, 2.85]], 0.022, 0.012, side);
  }
}

function buildMirrors(mb) {
  for (const side of [1, -1]) {
    const X = (p) => [p[0] * side, p[1], p[2]];
    // Thin stalk from the door top out to the housing.
    mb.hexa('black',
      [[0.78, 0.84, 0.49], [0.78, 0.84, 0.43], [0.95, 0.9, 0.43], [0.95, 0.9, 0.47]].map(X),
      [[0.78, 0.875, 0.49], [0.78, 0.875, 0.43], [0.95, 0.925, 0.43], [0.95, 0.925, 0.47]].map(X));
    // Wedge-shaped housing: blunt at the back (glass), tapering to the front.
    mb.hexa('paint',
      [[0.9, 0.9, 0.5], [0.9, 0.9, 0.38], [1.04, 0.905, 0.39], [1.03, 0.91, 0.46]].map(X),
      [[0.9, 0.965, 0.48], [0.9, 0.975, 0.38], [1.04, 0.965, 0.39], [1.02, 0.955, 0.45]].map(X));
    mb.hexa('chrome',
      [[0.91, 0.908, 0.385], [0.91, 0.908, 0.377], [1.03, 0.912, 0.383], [1.03, 0.912, 0.391]].map(X),
      [[0.91, 0.965, 0.385], [0.91, 0.965, 0.377], [1.03, 0.958, 0.383], [1.03, 0.958, 0.391]].map(X));
  }
}

function buildInterior(mb) {
  // Tub floor, dash and centre console.
  mb.prism('interior', [[0.76, 0.6], [0.76, -0.62], [-0.76, -0.62], [-0.76, 0.6]], 'y', 0.2, 0.26);
  mb.prism('interior', [[0.64, 0.8], [0.34, 0.8], [0.22, 0.62], [0.42, 0.5], [0.64, 0.5]], 'x', -0.76, 0.76);
  mb.prism('alcantara', [[0.4, 0.42], [-0.35, 0.42], [-0.35, 0.26], [0.4, 0.26]], 'x', -0.1, 0.1);
  // Bucket seats.
  const seat = [[0.05, 0.27], [-0.32, 0.27], [-0.5, 0.9], [-0.4, 0.92], [-0.24, 0.42], [0.06, 0.4]];
  for (const x of [0.36, -0.36]) mb.prism('alcantara', seat, 'x', x - 0.17, x + 0.17);
  for (const x of [0.36, -0.36]) mb.prism('stitch', [[-0.47, 0.86], [-0.45, 0.88], [-0.28, 0.42], [-0.3, 0.41]], 'x', x - 0.005, x + 0.005);
}

// ---------------------------------------------------------------------------

/** Separate meshes that animate (driver, steering wheel, exhaust flames). */
export function buildAnimatedParts(mats) {
  const cockpit = buildCockpit(mats, { seatX: 0.36, seatZ: -0.18, wheelZ: 0.2 });
  // Twin hexagonal exhausts mounted high in the tail, STO style.
  const ex = buildExhausts(mats, [0.12, -0.12].map((x) => ({ x, y: 0.705, z: TAIL_Z, r: 0.052, sides: 6, rotate: Math.PI / 6 })));
  const group = new Group();
  group.add(...cockpit.group.children, ...ex.group.children);
  return { group, head: cockpit.head, steering: cockpit.steering, flames: ex.flames };
}

/** Emits all static detail geometry into the MeshBuilder. */
export function buildDetails(mb) {
  buildFront(mb);
  buildRear(mb);
  buildRearWing(mb);
  buildRoof(mb);
  buildSides(mb);
  buildMirrors(mb);
  buildInterior(mb);
}
