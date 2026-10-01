import { BufferGeometry, Float32BufferAttribute, Mesh, Group, ShapeUtils, Vector2 } from 'three';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const WHITE = [1, 1, 1];
const normalize = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/**
 * Collects triangles per material key and emits one mesh per material.
 *
 * Normals are explicit: every quad gets a single normal (from its diagonals),
 * so a slightly non-planar quad still reads as one clean facet instead of two
 * differently-lit triangles. That is what makes low-poly read as "designed".
 */
export class MeshBuilder {
  constructor() {
    this.buckets = new Map();
    /** Optional vertex colour [r, g, b] (linear) applied to everything emitted while set. */
    this.color = null;
  }

  bucket(key) {
    let b = this.buckets.get(key);
    if (!b) this.buckets.set(key, (b = { pos: [], nrm: [], col: [], uv: [], hasColor: false, hasUV: false }));
    return b;
  }

  tri(key, a, b, c, n = normalize(cross(sub(b, a), sub(c, a))), uvs = null) {
    const bk = this.bucket(key);
    bk.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    for (let i = 0; i < 3; i++) bk.nrm.push(n[0], n[1], n[2]);
    const col = this.color || WHITE;
    if (this.color) bk.hasColor = true;
    bk.col.push(col[0], col[1], col[2], col[0], col[1], col[2], col[0], col[1], col[2]);
    if (uvs) { bk.hasUV = true; bk.uv.push(...uvs[0], ...uvs[1], ...uvs[2]); } else bk.uv.push(0, 0, 0, 0, 0, 0);
  }

  /** Textured quad: uv per corner. */
  quadUV(key, a, b, c, d, ua, ub, uc, ud) {
    const raw = cross(sub(c, a), sub(d, b));
    if (Math.hypot(raw[0], raw[1], raw[2]) < 1e-12) return;
    const n = normalize(raw);
    this.tri(key, a, b, c, n, [ua, ub, uc]);
    this.tri(key, a, c, d, n, [ua, uc, ud]);
  }

  /** Quad a-b-c-d, counter-clockwise when viewed from the front face. */
  quad(key, a, b, c, d) {
    const raw = cross(sub(c, a), sub(d, b));
    if (Math.hypot(raw[0], raw[1], raw[2]) < 1e-12) return; // degenerate
    const n = normalize(raw);
    this.tri(key, a, b, c, n);
    this.tri(key, a, c, d, n);
  }

  /** Closed polygon ring fanned from its centroid (safe for mildly concave outlines). */
  fan(key, ring) {
    const c = [0, 0, 0];
    for (const p of ring) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
    c[0] /= ring.length; c[1] /= ring.length; c[2] /= ring.length;
    for (let i = 0; i < ring.length; i++) this.tri(key, c, ring[i], ring[(i + 1) % ring.length]);
  }

  /** Triangle flipped if needed so its normal faces along n. */
  triFacing(key, a, b, c, n) {
    const fn = cross(sub(b, a), sub(c, a));
    if (fn[0] * n[0] + fn[1] * n[1] + fn[2] * n[2] >= 0) this.tri(key, a, b, c);
    else this.tri(key, a, c, b);
  }

  /**
   * Six-sided solid from 8 corners: bottom ring b0..b3 and top ring t0..t3
   * (matching order). Faces are oriented outward from the centroid. Good for
   * tapered blocks (mirrors, scoops) that a straight prism can't express.
   */
  hexa(key, b, t) {
    const all = [...b, ...t];
    const c = all.reduce((s, p) => [s[0] + p[0] / 8, s[1] + p[1] / 8, s[2] + p[2] / 8], [0, 0, 0]);
    const face = (p, q, r, s) => {
      const mid = [(p[0] + r[0]) / 2, (p[1] + r[1]) / 2, (p[2] + r[2]) / 2];
      const out = sub(mid, c);
      const n = cross(sub(r, p), sub(s, q));
      if (n[0] * out[0] + n[1] * out[1] + n[2] * out[2] >= 0) this.quad(key, p, q, r, s);
      else this.quad(key, s, r, q, p);
    };
    face(b[0], b[1], b[2], b[3]);
    face(t[0], t[1], t[2], t[3]);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      face(b[i], b[j], t[j], t[i]);
    }
  }

  /**
   * Extrude a 2D outline (may be concave) along an axis between lo and hi.
   * axis 'x': outline is (z, y). axis 'y': (x, z). axis 'z': (x, y).
   */
  prism(key, outline, axis, lo, hi) {
    const to3 = {
      x: (u, v, t) => [t, v, u],
      y: (u, v, t) => [u, t, v],
      z: (u, v, t) => [u, v, t],
    }[axis];
    const axisN = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[axis];
    const pts = outline.map(([u, v]) => new Vector2(u, v));
    if (ShapeUtils.isClockWise(pts)) pts.reverse();
    const faces = ShapeUtils.triangulateShape(pts, []);
    const neg = axisN.map((v) => -v);
    for (const [i, j, k] of faces) {
      const P = (q, t) => to3(pts[q].x, pts[q].y, t);
      this.triFacing(key, P(i, hi), P(j, hi), P(k, hi), axisN);
      this.triFacing(key, P(i, lo), P(j, lo), P(k, lo), neg);
    }
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const out = to3(b.y - a.y, -(b.x - a.x), 0); // outward 2D normal of a CCW outline
      const p0 = to3(a.x, a.y, lo), p1 = to3(b.x, b.y, lo), p2 = to3(b.x, b.y, hi), p3 = to3(a.x, a.y, hi);
      this.triFacing(key, p0, p1, p2, out);
      this.triFacing(key, p0, p2, p3, out);
    }
  }

  /** Same prism on both sides of the car (outline axis 'x', x range given for the left side). */
  prismMirrorX(key, outline, lo, hi) {
    this.prism(key, outline, 'x', lo, hi);
    this.prism(key, outline, 'x', -hi, -lo);
  }

  /**
   * @param materials  key -> material
   * @param warpZ      optional (z) => z' applied to every vertex, with slope(z) for normals
   */
  build(materials, warpZ = null, slope = null) {
    const group = new Group();
    for (const [key, { pos, nrm, col, uv, hasColor, hasUV }] of this.buckets) {
      if (warpZ) {
        for (let i = 0; i < pos.length; i += 3) {
          // Normals of a stretched surface scale by the inverse stretch.
          const k = slope(pos[i + 2]);
          nrm[i + 2] /= k;
          const l = Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]) || 1;
          nrm[i] /= l; nrm[i + 1] /= l; nrm[i + 2] /= l;
          pos[i + 2] = warpZ(pos[i + 2]);
        }
      }
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
      geo.setAttribute('normal', new Float32BufferAttribute(nrm, 3));
      if (hasColor) geo.setAttribute('color', new Float32BufferAttribute(col, 3));
      if (hasUV) geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
      geo.computeBoundingSphere();
      const mesh = new Mesh(geo, materials[key]);
      mesh.name = key;
      mesh.castShadow = key !== 'glass';
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
}

/** Faceted copy of a primitive geometry (non-indexed, one normal per triangle). */
export function facet(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.computeVertexNormals();
  return g;
}
