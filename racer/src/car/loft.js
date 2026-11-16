/**
 * Lofted car bodies from a hand-drawn "lines plan": a table of half
 * cross-sections from nose to tail. Each section is 7 points running from the
 * sill up and over to the roof centreline. Sections are mirrored for the right
 * side, and every quad between neighbouring stations becomes one flat facet,
 * which gives the faceted low-poly look.
 *
 * Point index meaning (per section):
 *  P0 sill/bottom edge  P1 lower side  P2 belt (widest)  P3 shoulder / fender peak
 *  P4 hood crease / window base  P5 roof edge / A-pillar  P6 centreline top
 * Each lines row: [z, x0,y0, x1,y1, x2,y2, x3,y3, x4,y4, x5,y5, y6]
 *
 * Design space: +X left, +Y up, +Z forward, ground at y = 0.
 */

const mirror = (p) => [-p[0], p[1], p[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const vec = { sub, add, scale, cross, norm, mirror };

/**
 * @param {object} o
 * @param {number[][]} o.lines         lines plan rows, front (high z) to rear
 * @param {number[][]} o.arch          arch profile [distance from axle, height], from the top down
 * @param {number[]}   o.axles         [front z, rear z]
 * @param {number}     o.wellX         x of the inner wheel-well walls
 * @param {number[]}   [o.extraStations] extra z stations so features get their own facets
 * @param {(strip:number, z:number, arch:number) => string} o.stripMaterial
 * @param {number[]}   [o.archGaps]    how far P1..P3 must clear the arch edge
 */
export function createLoft(o) {
  const { lines, arch, axles, wellX, stripMaterial } = o;
  const archGaps = o.archGaps || [0, 0.02, 0.045, 0.07];
  const nose = lines[0][0];
  const tail = lines[lines.length - 1][0];
  const archHalf = arch[arch.length - 1][0];

  function archHeight(z) {
    let best = 0;
    for (const zc of axles) {
      const d = Math.abs(z - zc);
      if (d >= archHalf) continue;
      for (let i = 1; i < arch.length; i++) {
        if (d <= arch[i][0]) {
          const [d0, h0] = arch[i - 1];
          const [d1, h1] = arch[i];
          best = Math.max(best, h0 + ((h1 - h0) * (d - d0)) / (d1 - d0));
          break;
        }
      }
    }
    return best;
  }

  /** Arch outline in (z, y) for one axle, used for the inner wheel-well liners. */
  function archOutline(zc) {
    const pts = [];
    for (let i = arch.length - 1; i >= 0; i--) pts.push([zc + arch[i][0], arch[i][1]]);
    for (let i = 1; i < arch.length; i++) pts.push([zc - arch[i][0], arch[i][1]]);
    return pts;
  }

  function rowAt(z) {
    if (z >= lines[0][0]) return lines[0].slice();
    for (let i = 1; i < lines.length; i++) {
      const a = lines[i - 1];
      const b = lines[i];
      if (z >= b[0]) {
        const t = (a[0] - z) / (a[0] - b[0]);
        return a.map((v, k) => v + (b[k] - v) * t);
      }
    }
    return lines[lines.length - 1].slice();
  }

  /** Half cross-section at z as 7 [x, y] points (arches applied). */
  function sectionAt(z) {
    const r = rowAt(z);
    const p = [];
    for (let i = 0; i < 6; i++) p.push([r[1 + i * 2], r[2 + i * 2]]);
    p.push([0, r[13]]);
    const a = archHeight(z);
    if (a > p[0][1]) {
      // Lift the lower body over the tire; the panel above becomes the fender lip.
      p[0] = [p[1][0], a];
      for (let i = 1; i <= 3; i++) p[i][1] = Math.max(p[i][1], a + archGaps[i]);
    }
    return p;
  }

  function stations() {
    const zs = new Set(lines.map((r) => r[0]));
    for (const zc of axles) {
      for (const [d] of arch) { zs.add(+(zc + d).toFixed(4)); zs.add(+(zc - d).toFixed(4)); }
    }
    (o.extraStations || []).forEach((z) => zs.add(z));
    return [...zs].filter((z) => z <= nose && z >= tail).sort((a, b) => b - a);
  }

  /** Emits the shell into a MeshBuilder. */
  function buildShell(mb) {
    const zs = stations();
    const secs = zs.map((z) => sectionAt(z).map(([x, y]) => [x, y, z]));
    for (let k = 0; k < secs.length - 1; k++) {
      const A = secs[k];
      const B = secs[k + 1];
      const zMid = (zs[k] + zs[k + 1]) / 2;
      const a = archHeight(zMid);
      for (let i = 0; i < 6; i++) {
        const mat = stripMaterial(i, zMid, a);
        mb.quad(mat, A[i], B[i], B[i + 1], A[i + 1]); // left side (outward = +X)
        mb.quad(mat, mirror(A[i]), mirror(A[i + 1]), mirror(B[i + 1]), mirror(B[i])); // right, mirrored
      }
      // Underside between the two sills (over the wheels this is the well ceiling).
      mb.quad('black', A[0], mirror(A[0]), mirror(B[0]), B[0]);
      if (a > 0) {
        // Keep the floor flat between the wheel wells so the car isn't hollow from below.
        const ya = rowAt(zs[k])[2];
        const yb = rowAt(zs[k + 1])[2];
        mb.quad('black', [wellX, ya, zs[k]], [-wellX, ya, zs[k]], [-wellX, yb, zs[k + 1]], [wellX, yb, zs[k + 1]]);
      }
    }
    // Nose and tail caps. Ring runs counter-clockwise seen from the front.
    const ring = (sec) => [...sec.slice().reverse().map(mirror), ...sec.slice(0, 6)];
    mb.fan(o.noseMaterial || 'paint', ring(secs[0]));
    mb.fan(o.tailMaterial || 'paint', ring(secs[secs.length - 1]).reverse());
    for (const zc of axles) mb.prismMirrorX('grille', archOutline(zc), wellX - 0.02, wellX);
  }

  /** Point on the shell surface: z and a fractional profile index s in [0, 6]. */
  function surfacePoint(z, s, side = 1) {
    const p = sectionAt(z);
    const i = Math.min(5, Math.floor(s));
    const f = s - i;
    const x = p[i][0] + (p[i + 1][0] - p[i][0]) * f;
    const y = p[i][1] + (p[i + 1][1] - p[i][1]) * f;
    return [x * side, y, z];
  }

  /** Outward surface normal at (z, s). */
  function surfaceNormal(z, s, side = 1) {
    const e = 0.01;
    const dz = sub(surfacePoint(z + e, s, side), surfacePoint(z - e, s, side));
    const ds = sub(surfacePoint(z, Math.min(6, s + e), side), surfacePoint(z, Math.max(0, s - e), side));
    const n = norm(cross(ds, dz));
    return side > 0 ? n : scale(n, -1);
  }

  /** Thin raised ribbon following the body surface through (z, s) waypoints. */
  function ribbon(mb, key, path, width, lift, side) {
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

  /**
   * Triangle laid onto the curved body: subdivided in (z, s) parameter space so
   * every vertex sits on the surface, then lifted slightly along the normal.
   */
  function decal(mb, key, [A, B, C], lift, side, steps = 6) {
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

  /** Quad patch on the surface (corners A..D in (z, s), CCW from outside), subdivided. */
  function patch(mb, key, [A, B, C, D], lift, side) {
    decal(mb, key, [A, B, C], lift, side, 4);
    decal(mb, key, [A, C, D], lift, side, 4);
  }

  return {
    nose, tail, axles, wellX,
    rowAt, sectionAt, archHeight, archOutline, surfacePoint, surfaceNormal,
    buildShell, ribbon, decal, patch,
  };
}

/**
 * A low-poly domed lens (headlight, indicator) sitting on a surface: an n-gon
 * ring in the plane through `center` perpendicular to `normal`, with a raised
 * centre. `up` orients the ellipse; rx/ry are its radii.
 */
export function lens(mb, key, center, normal, up, rx, ry, { segments = 12, dome = 0.02, rim = null, rimWidth = 0.012 } = {}) {
  const n = norm(normal);
  const u = norm(cross(up, n));
  const v = norm(cross(n, u));
  const ring = (k, grow) => {
    const a = (k / segments) * Math.PI * 2;
    return add(center, add(scale(u, Math.cos(a) * (rx + grow)), scale(v, Math.sin(a) * (ry + grow))));
  };
  const apex = add(center, scale(n, dome));
  for (let k = 0; k < segments; k++) mb.triFacing(key, apex, ring(k, 0), ring(k + 1, 0), n);
  if (rim) {
    for (let k = 0; k < segments; k++) {
      const a = ring(k, 0), b = ring(k + 1, 0), c = ring(k + 1, rimWidth), d = ring(k, rimWidth);
      mb.triFacing(rim, a, c, b, n);
      mb.triFacing(rim, a, d, c, n);
    }
  }
}
