/**
 * The body shell, lofted from a hand-drawn "lines plan": a table of half
 * cross-sections from nose to tail. Each section is 7 points running from the
 * sill up and over to the roof centreline. Sections are mirrored for the right
 * side, and every quad between neighbouring sections becomes two flat-shaded
 * triangles, which gives the faceted low-poly Lamborghini look for free.
 *
 * Model space: +X left, +Y up, +Z forward, ground at y = 0, axle midpoint at z = 0.
 */

export const AXLE_FRONT = 1.025;
export const AXLE_REAR = -1.025;
export const NOSE_Z = 1.7;
export const TAIL_Z = -1.62;
export const WELL_X = 0.52; // inner wall of the wheel wells

// Point index meaning (per section):
//  P0 sill/bottom edge  P1 lower side  P2 belt (widest)  P3 shoulder / fender peak
//  P4 hood crease / window base  P5 roof edge / A-pillar  P6 centreline top
// Each row: [z, x0,y0, x1,y1, x2,y2, x3,y3, x4,y4, x5,y5, y6]
const LINES = [
  [ 1.70, 0.56,0.13, 0.62,0.19, 0.66,0.27, 0.62,0.36, 0.44,0.40, 0.21,0.42, 0.42],
  [ 1.63, 0.76,0.12, 0.82,0.19, 0.85,0.31, 0.81,0.45, 0.58,0.50, 0.30,0.51, 0.505],
  [ 1.50, 0.86,0.12, 0.90,0.20, 0.92,0.38, 0.88,0.58, 0.63,0.60, 0.32,0.605,0.60],
  [ 1.25, 0.91,0.13, 0.94,0.21, 0.955,0.45, 0.905,0.76, 0.64,0.72, 0.33,0.695,0.69],
  [ 1.025,0.93,0.13, 0.95,0.22, 0.96,0.50, 0.90,0.86, 0.64,0.80, 0.34,0.765,0.76],
  [ 0.80, 0.93,0.14, 0.95,0.23, 0.955,0.52, 0.89,0.84, 0.70,0.82, 0.46,0.80, 0.795],
  [ 0.62, 0.92,0.14, 0.94,0.24, 0.95,0.53, 0.88,0.80, 0.76,0.82, 0.58,0.82, 0.815],
  [ 0.30, 0.90,0.14, 0.92,0.24, 0.93,0.55, 0.865,0.80, 0.75,0.83, 0.55,1.01, 1.02],
  [ 0.00, 0.88,0.14, 0.895,0.24, 0.905,0.57, 0.855,0.80, 0.74,0.84, 0.52,1.18, 1.215],
  [-0.30, 0.875,0.14, 0.885,0.24, 0.915,0.59, 0.865,0.81, 0.74,0.86, 0.51,1.205,1.24],
  [-0.62, 0.87,0.14, 0.85,0.26, 0.95,0.61, 0.92,0.84, 0.77,0.88, 0.54,1.13, 1.16],
  [-1.025,0.97,0.20, 0.98,0.30, 0.99,0.63, 0.95,0.89, 0.81,0.92, 0.58,1.01, 1.035],
  [-1.40, 0.95,0.22, 0.965,0.32,0.975,0.63, 0.93,0.86, 0.80,0.88, 0.60,0.90, 0.91],
  [-1.62, 0.88,0.26, 0.91,0.36, 0.93,0.62, 0.90,0.82, 0.78,0.84, 0.58,0.85, 0.86],
];

// Hexagonal wheel arches, a Lamborghini signature. [distance from axle, height].
const ARCH = [[0, 0.80], [0.17, 0.80], [0.36, 0.585], [0.47, 0.14]];
const ARCH_HALF = ARCH[ARCH.length - 1][0];

export function archHeight(z) {
  let best = 0;
  for (const zc of [AXLE_FRONT, AXLE_REAR]) {
    const d = Math.abs(z - zc);
    if (d >= ARCH_HALF) continue;
    for (let i = 1; i < ARCH.length; i++) {
      if (d <= ARCH[i][0]) {
        const [d0, h0] = ARCH[i - 1];
        const [d1, h1] = ARCH[i];
        best = Math.max(best, h0 + ((h1 - h0) * (d - d0)) / (d1 - d0));
        break;
      }
    }
  }
  return best;
}

/** Arch outline in (z, y) for one axle, used for the inner wheel-well liners. */
export function archOutline(zc) {
  const pts = [];
  for (let i = ARCH.length - 1; i >= 0; i--) pts.push([zc + ARCH[i][0], ARCH[i][1]]);
  for (let i = 1; i < ARCH.length; i++) pts.push([zc - ARCH[i][0], ARCH[i][1]]);
  return pts;
}

function interpRow(z) {
  if (z >= LINES[0][0]) return LINES[0].slice();
  for (let i = 1; i < LINES.length; i++) {
    const a = LINES[i - 1];
    const b = LINES[i];
    if (z >= b[0]) {
      const t = (a[0] - z) / (a[0] - b[0]);
      return a.map((v, k) => v + (b[k] - v) * t);
    }
  }
  return LINES[LINES.length - 1].slice();
}

/** Half cross-section at z as 7 [x, y] points (arches applied). */
export function sectionAt(z) {
  const r = interpRow(z);
  const p = [];
  for (let i = 0; i < 6; i++) p.push([r[1 + i * 2], r[2 + i * 2]]);
  p.push([0, r[13]]);

  const arch = archHeight(z);
  if (arch > p[0][1]) {
    // Lift the lower body over the tire; the panel above becomes the fender lip.
    p[0] = [p[1][0], arch];
    const gaps = [0, 0.02, 0.045, 0.07];
    for (let i = 1; i <= 3; i++) p[i][1] = Math.max(p[i][1], arch + gaps[i]);
  }
  return p;
}

/** Station list: every lines-plan row plus every arch vertex, front to rear. */
function stations() {
  const zs = new Set(LINES.map((r) => r[0]));
  for (const zc of [AXLE_FRONT, AXLE_REAR]) {
    for (const [d] of ARCH) { zs.add(+(zc + d).toFixed(4)); zs.add(+(zc - d).toFixed(4)); }
  }
  // Extra stations so features get their own facets.
  [1.58, 0.45, -0.2, -0.45, -0.75, -1.25, -1.5].forEach((z) => zs.add(z));
  return [...zs].filter((z) => z <= NOSE_Z && z >= TAIL_Z).sort((a, b) => b - a);
}

/** Which material each facet gets. strip = index of the lower point (0..5). */
function stripMaterial(strip, z, arch) {
  switch (strip) {
    case 0:
      if (z > 1.48) return 'carbon';            // front lip
      return arch > 0.2 ? 'paint' : 'carbon';  // side skirts between the wheels
    case 1:
    case 2:
      return 'paint'; // the side intake is a separate wedge (lamboParts) so it can be triangular
    case 3:
      if (z > 1.5) return 'headlight';
      return 'paint';
    case 4:
      if (z < 0.62 && z > -0.45) return 'glass';   // side windows
      if (z <= -0.45 && z >= -0.62) return 'black'; // B-pillar
      if (z < -0.62 && z > -1.025) return 'glass'; // rear quarter glass behind the B-pillar
      return 'paint';
    case 5:
      if (z < 0.62 && z > 0.0) return 'glass';    // windscreen
      if (z <= -0.62 && z > -1.25) return 'carbon'; // engine cover (louvred)
      return 'paint';
    default:
      return 'paint';
  }
}

const mirror = (p) => [-p[0], p[1], p[2]];

/** Emits the shell into a MeshBuilder. */
export function buildShell(mb) {
  const zs = stations();
  const secs = zs.map((z) => sectionAt(z).map(([x, y]) => [x, y, z]));

  for (let k = 0; k < secs.length - 1; k++) {
    const A = secs[k];
    const B = secs[k + 1];
    const zMid = (zs[k] + zs[k + 1]) / 2;
    const arch = archHeight(zMid);
    for (let i = 0; i < 6; i++) {
      const mat = stripMaterial(i, zMid, arch);
      // Left side (outward = +X)
      mb.quad(mat, A[i], B[i], B[i + 1], A[i + 1]);
      // Right side, mirrored (winding reversed)
      mb.quad(mat, mirror(A[i]), mirror(A[i + 1]), mirror(B[i + 1]), mirror(B[i]));
    }
    // Underside between the two sills (over the wheels this is the well ceiling).
    mb.quad('black', A[0], mirror(A[0]), mirror(B[0]), B[0]);
    if (arch > 0) {
      // Keep the floor flat between the wheel wells so the car isn't hollow from below.
      const ya = interpRow(zs[k])[2];
      const yb = interpRow(zs[k + 1])[2];
      const w = WELL_X;
      mb.quad('black', [w, ya, zs[k]], [-w, ya, zs[k]], [-w, yb, zs[k + 1]], [w, yb, zs[k + 1]]);
    }
  }

  // Nose and tail caps (flat panels; details are layered on top).
  // Ring runs counter-clockwise seen from the front: roof centre, down the right, up the left.
  const ring = (sec) => [...sec.slice().reverse().map(mirror), ...sec.slice(0, 6)];
  const front = ring(secs[0]);
  mb.fan('paint', front);
  mb.fan('paint', ring(secs[secs.length - 1]).reverse());
}

/** Point on the shell surface: z and a fractional profile index s in [0, 6]. */
export function surfacePoint(z, s, side = 1) {
  const p = sectionAt(z);
  const i = Math.min(5, Math.floor(s));
  const f = s - i;
  const x = p[i][0] + (p[i + 1][0] - p[i][0]) * f;
  const y = p[i][1] + (p[i + 1][1] - p[i][1]) * f;
  return [x * side, y, z];
}
