import { Color } from 'three';

/**
 * Modelling kit for Porto Vela: palette, seeded random, and a local Frame that
 * draws into a MeshBuilder:
 *   a = along the facade (right), y = up, b = out of the facade towards the street.
 * The facade at b = 0 faces the street; the body extends to b = -depth.
 */

export const rgb = (hex) => { const c = new Color(hex); return [c.r, c.g, c.b]; };
export const scaleC = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

/**
 * Ground planes under the track: pushed back in depth so they can never show
 * through the road, kerbs or tyres (a few cm apart is too close for the depth
 * buffer at range). Higher layers get a smaller push.
 */
export const underlay = (m, layer = 1) => Object.assign(m, { polygonOffset: true, polygonOffsetFactor: 2 * layer, polygonOffsetUnits: 6 * layer });

export const PALETTE = {
  bougainvillea: [0xd2306f, 0xc02a8a, 0xe0508a].map(rgb),
  cypress: rgb(0x2f4a2c),
  parasol: [0xf2ede2, 0xc8242b, 0x1f4f9a, 0xe0a22b, 0x2f6b4a].map(rgb),
  stucco: [0xe9cfa6, 0xd98e62, 0xf1e4cb, 0xd17d74, 0x9bb8a6, 0xe4b65e, 0xb3c0cc, 0xf0cfb4, 0xc9a77c, 0xe7d7c1, 0xa8806a].map(rgb),
  shutter: [0x4f7a5a, 0x3f6a8c, 0x7a5236, 0xe9e4d8, 0x2f5a6a, 0x8a3b2f].map(rgb),
  trim: rgb(0xf3ecdf),
  stone: rgb(0xe2d6bf),
  stoneDark: rgb(0xb9ab92),
  roofTile: [0xb5523b, 0xa6472f, 0xc0603f].map(rgb),
  slate: rgb(0x4a4f57),
  copper: rgb(0x5d9c86),
  iron: rgb(0x23262a),
  awning: [[0xc8242b, 0xf2ede2], [0x2f6b4a, 0xf2ede2], [0x1f4f9a, 0xf2ede2], [0xe0a22b, 0x5a2a1a], [0x6a2b4f, 0xf2ede2]].map((p) => p.map(rgb)),
  concrete: rgb(0x9a968e),
  tank: rgb(0xd8d4cc),
  plant: rgb(0x4f7d3e),
  flowers: [0xd23c6a, 0xf2c14e, 0xe9e4f2, 0xe8643a].map(rgb),
  neon: [[3.2, 1.4, 0.5], [0.6, 2.2, 3.0], [3.0, 0.7, 1.6], [2.6, 2.4, 1.0]],
};

/** Seeded random generator (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];

/** Local frame helper bound to a MeshBuilder. */
export class Frame {
  constructor(mb, ox, oy, oz, rx, rz) {
    this.mb = mb;
    this.o = [ox, oy, oz];
    this.r = [rx, rz];           // along the facade
    this.f = [-rz, rx];          // out of the facade (r rotated 90°)
  }

  at(a, y, b) {
    const { o, r, f } = this;
    return [o[0] + r[0] * a + f[0] * b, o[1] + y, o[2] + r[1] * a + f[1] * b];
  }

  /** Axis-aligned (in frame) box. */
  box(key, a0, a1, y0, y1, b0, b1, color) {
    this.mb.color = color;
    const ring = (y) => [this.at(a0, y, b0), this.at(a1, y, b0), this.at(a1, y, b1), this.at(a0, y, b1)];
    this.mb.hexa(key, ring(y0), ring(y1));
  }

  /** Tapered/sloped block from two rings given in (a, b) pairs at y0 and y1. */
  block(key, bottom, top, y0, y1, color) {
    this.mb.color = color;
    this.mb.hexa(key, bottom.map(([a, b]) => this.at(a, y0, b)), top.map(([a, b]) => this.at(a, y1, b)));
  }

  /** Flat quad in the facade plane (b), facing out (+b) or in (dir = -1). */
  face(key, a0, a1, y0, y1, b, color, dir = 1) {
    this.mb.color = color;
    const n = [this.f[0] * dir, 0, this.f[1] * dir];
    const p = [this.at(a0, y0, b), this.at(a1, y0, b), this.at(a1, y1, b), this.at(a0, y1, b)];
    this.mb.triFacing(key, p[0], p[1], p[2], n);
    this.mb.triFacing(key, p[0], p[2], p[3], n);
  }

  /** Flat quad on a side wall (constant a), facing ±a. */
  sideFace(key, a, b0, b1, y0, y1, color, dir) {
    this.mb.color = color;
    const n = [this.r[0] * dir, 0, this.r[1] * dir];
    const p = [this.at(a, y0, b0), this.at(a, y0, b1), this.at(a, y1, b1), this.at(a, y1, b0)];
    this.mb.triFacing(key, p[0], p[1], p[2], n);
    this.mb.triFacing(key, p[0], p[2], p[3], n);
  }

  /** n-gon prism (cylinder-ish) standing at (a, b). */
  cylinder(key, a, b, r, y0, y1, sides, color) {
    this.mb.color = color;
    const ring = (y, rr) => {
      const pts = [];
      for (let k = 0; k < sides; k++) {
        const t = (k / sides) * Math.PI * 2;
        pts.push(this.at(a + Math.cos(t) * rr, y, b + Math.sin(t) * rr));
      }
      return pts;
    };
    const bot = ring(y0, r), top = ring(y1, r);
    const up = [0, 1, 0];
    for (let k = 0; k < sides; k++) {
      const k2 = (k + 1) % sides;
      const mid = [(bot[k][0] + bot[k2][0]) / 2 - this.at(a, 0, b)[0], 0, (bot[k][2] + bot[k2][2]) / 2 - this.at(a, 0, b)[2]];
      this.mb.triFacing(key, bot[k], bot[k2], top[k2], mid);
      this.mb.triFacing(key, bot[k], top[k2], top[k], mid);
      this.mb.triFacing(key, top[0], top[k], top[k2], up);
    }
  }

  /** Pyramid / cone cap from a rectangle to a point (or ridge). */
  hipRoof(key, a0, a1, b0, b1, y0, h, color, overhang = 0.4) {
    this.mb.color = color;
    const A0 = a0 - overhang, A1 = a1 + overhang, B0 = b0 - overhang, B1 = b1 + overhang;
    const ridgeInset = Math.min(A1 - A0, B1 - B0) / 2;
    const ra0 = A0 + ridgeInset, ra1 = A1 - ridgeInset, rb = (B0 + B1) / 2;
    const p00 = this.at(A0, y0, B0), p10 = this.at(A1, y0, B0), p11 = this.at(A1, y0, B1), p01 = this.at(A0, y0, B1);
    const rA = this.at(Math.min(ra0, ra1), y0 + h, rb), rB = this.at(Math.max(ra0, ra1), y0 + h, rb);
    const c = this.at((a0 + a1) / 2, y0, (b0 + b1) / 2);
    const out = (p, q, s) => [((p[0] + q[0] + s[0]) / 3) - c[0], 1.2, ((p[2] + q[2] + s[2]) / 3) - c[2]];
    const tri = (p, q, s) => this.mb.triFacing(key, p, q, s, out(p, q, s));
    tri(p00, p10, rB); tri(p00, rB, rA);
    tri(p01, p11, rB); tri(p01, rB, rA);
    tri(p00, p01, rA);
    tri(p10, p11, rB);
    // Soffit underneath so the overhang isn't see-through.
    this.mb.triFacing(key, p00, p10, p11, [0, -1, 0]);
    this.mb.triFacing(key, p00, p11, p01, [0, -1, 0]);
  }

  /** Gable roof with the ridge running along a (gable ends at a0/a1). */
  gableRoof(key, a0, a1, b0, b1, y0, h, color, wallColor, overhang = 0.3) {
    const bm = (b0 + b1) / 2;
    this.mb.color = color;
    const A0 = a0 - overhang, A1 = a1 + overhang, B0 = b0 - overhang, B1 = b1 + overhang;
    const r0 = this.at(A0, y0 + h, bm), r1 = this.at(A1, y0 + h, bm);
    const f0 = this.at(A0, y0, B1), f1 = this.at(A1, y0, B1), k0 = this.at(A0, y0, B0), k1 = this.at(A1, y0, B0);
    this.mb.triFacing(key, f0, f1, r1, [this.f[0], 1, this.f[1]]);
    this.mb.triFacing(key, f0, r1, r0, [this.f[0], 1, this.f[1]]);
    this.mb.triFacing(key, k0, k1, r1, [-this.f[0], 1, -this.f[1]]);
    this.mb.triFacing(key, k0, r1, r0, [-this.f[0], 1, -this.f[1]]);
    // Gable end walls.
    this.mb.color = wallColor;
    for (const [a, dir] of [[a0, -1], [a1, 1]]) {
      const n = [this.r[0] * dir, 0, this.r[1] * dir];
      this.mb.triFacing('stucco', this.at(a, y0, b0), this.at(a, y0, b1), this.at(a, y0 + h, bm), n);
    }
  }
}

