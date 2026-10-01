import { Group, Mesh, IcosahedronGeometry, TorusGeometry, CylinderGeometry, ConeGeometry, BoxGeometry, SphereGeometry } from 'three';
import { facet } from './meshBuilder.js';
import { sectionAt, surfacePoint, archOutline, AXLE_FRONT, AXLE_REAR, NOSE_Z, TAIL_Z, WELL_X } from './lamboBody.js';

// ---------------------------------------------------------------------------
// Small vector helpers on [x, y, z] arrays.
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** Outward surface normal of the shell at (z, s). */
function surfaceNormal(z, s, side) {
  const e = 0.01;
  const dz = sub(surfacePoint(z + e, s, side), surfacePoint(z - e, s, side));
  const ds = sub(surfacePoint(z, Math.min(6, s + e), side), surfacePoint(z, Math.max(0, s - e), side));
  const n = norm(cross(ds, dz));
  return side > 0 ? n : scale(n, -1);
}

/**
 * Triangle laid onto the curved body: subdivided in (z, s) parameter space so
 * every vertex sits on the surface, then lifted slightly along the normal.
 */
function surfaceDecal(mb, key, [A, B, C], lift, side, steps = 6) {
  const P = (u, v) => {
    const z = A[0] + (B[0] - A[0]) * u + (C[0] - A[0]) * v;
    const s = A[1] + (B[1] - A[1]) * u + (C[1] - A[1]) * v;
    return [add(surfacePoint(z, s, side), scale(surfaceNormal(z, s, side), lift)), surfaceNormal(z, s, side)];
  };
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps - i; j++) {
      const u0 = i / steps, v0 = j / steps, d = 1 / steps;
      const [a, n] = P(u0, v0);
      const [b] = P(u0 + d, v0);
      const [c] = P(u0, v0 + d);
      mb.triFacing(key, a, b, c, n);
      if (j < steps - i - 1) {
        const [e] = P(u0 + d, v0 + d);
        mb.triFacing(key, b, e, c, n);
      }
    }
  }
}

/** Thin raised ribbon following the body surface through (z, s) waypoints. */
function surfaceRibbon(mb, key, path, width, lift, side) {
  const pts = path.map(([z, s]) => add(surfacePoint(z, s, side), scale(surfaceNormal(z, s, side), lift)));
  const nrm = path.map(([z, s]) => surfaceNormal(z, s, side));
  for (let i = 0; i < pts.length - 1; i++) {
    const dir = norm(sub(pts[i + 1], pts[i]));
    const offA = scale(norm(cross(nrm[i], dir)), width / 2);
    const offB = scale(norm(cross(nrm[i + 1], dir)), width / 2);
    const a0 = sub(pts[i], offA), a1 = add(pts[i], offA);
    const b0 = sub(pts[i + 1], offB), b1 = add(pts[i + 1], offB);
    mb.triFacing(key, a0, b0, b1, nrm[i]);
    mb.triFacing(key, a0, b1, a1, nrm[i]);
  }
}

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

function buildWheelWells(mb) {
  for (const zc of [AXLE_FRONT, AXLE_REAR]) {
    mb.prismMirrorX('grille', archOutline(zc), WELL_X - 0.02, WELL_X);
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
  const group = new Group();

  // Chibi driver: oversized helmet, tiny body. Sits on the left (left-hand drive).
  const driver = new Group();
  driver.position.set(0.36, 0, -0.18);
  const torso = new Mesh(facet(new BoxGeometry(0.3, 0.32, 0.2)), mats.suit);
  torso.position.set(0, 0.56, -0.08);
  torso.rotation.x = -0.25;
  const head = new Group();
  head.position.set(0, 0.92, -0.02);
  const helmet = new Mesh(facet(new IcosahedronGeometry(0.175, 2)), mats.helmet);
  const stripe = new Mesh(facet(new IcosahedronGeometry(0.178, 2)), mats.paint);
  stripe.scale.set(0.28, 1, 1);
  const visor = new Mesh(facet(new SphereGeometry(0.18, 10, 3, Math.PI / 2 - 0.95, 1.9, 1.2, 0.62)), mats.visor);
  head.add(helmet, stripe, visor);
  for (const m of [torso, helmet, stripe, visor]) m.castShadow = true;
  const armL = new Mesh(facet(new BoxGeometry(0.07, 0.07, 0.24)), mats.suit);
  armL.position.set(0.13, 0.64, 0.1);
  armL.rotation.x = 0.3;
  const armR = armL.clone();
  armR.position.x = -0.13;
  driver.add(torso, head, armL, armR);
  group.add(driver);

  const steering = new Group();
  steering.position.set(0.36, 0.7, 0.2);
  steering.rotation.x = -0.35;
  const rimMesh = new Mesh(facet(new TorusGeometry(0.12, 0.018, 5, 12)), mats.alcantara);
  const spokeBar = new Mesh(new BoxGeometry(0.22, 0.03, 0.02), mats.interior);
  const marker = new Mesh(new BoxGeometry(0.02, 0.03, 0.03), mats.stitch);
  marker.position.y = 0.12;
  steering.add(rimMesh, spokeBar, marker);
  group.add(steering);

  // Twin hexagonal exhausts with flame cones for pops & bangs.
  const flames = [];
  for (const x of [0.12, -0.12]) {
    const pipe = new Mesh(facet(new CylinderGeometry(0.052, 0.052, 0.16, 6, 1, true)), mats.titanium);
    pipe.rotation.x = Math.PI / 2;
    pipe.rotation.y = Math.PI / 6;
    pipe.position.set(x, 0.705, TAIL_Z - 0.04);
    const inner = new Mesh(new CylinderGeometry(0.044, 0.044, 0.01, 6), mats.grille);
    inner.rotation.x = Math.PI / 2;
    inner.position.set(x, 0.705, TAIL_Z - 0.06);
    const flame = new Mesh(new ConeGeometry(0.05, 0.32, 7, 1, true), mats.flame);
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(x, 0.705, TAIL_Z - 0.28);
    flame.visible = false;
    flames.push(flame);
    group.add(pipe, inner, flame);
  }

  return { group, head, steering, flames };
}

/** Emits all static detail geometry into the MeshBuilder. */
export function buildDetails(mb) {
  buildFront(mb);
  buildRear(mb);
  buildRearWing(mb);
  buildRoof(mb);
  buildSides(mb);
  buildMirrors(mb);
  buildWheelWells(mb);
  buildInterior(mb);
}
