import { Color } from 'three';

/**
 * Hand-modelled building archetypes for Porto Vela, low-poly but detailed.
 * Every archetype draws into a MeshBuilder through a local frame:
 *   a = along the facade (right), y = up, b = out of the facade towards the street.
 * The facade at b = 0 faces the street; the body extends to b = -depth.
 */

export const rgb = (hex) => { const c = new Color(hex); return [c.r, c.g, c.b]; };
const scaleC = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

export const PALETTE = {
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
  towerGlass: [0x2b4a66, 0x34515c, 0x3d4560].map(rgb),
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
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];

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

// ---------------------------------------------------------------------------
// Shared facade pieces

function windowUnit(F, r, a, y, w, h, opt) {
  const { wall, shutter, lit, balcony, iron, flowers } = opt;
  // Stone surround, then the pane (lit or dark), then the sill.
  F.face('trim', a - w / 2 - 0.12, a + w / 2 + 0.12, y - 0.12, y + h + 0.16, 0.02, PALETTE.trim);
  if (lit) F.face('winLit', a - w / 2, a + w / 2, y, y + h, 0.04, scaleC(pick(r, [[1, 0.72, 0.42], [1, 0.82, 0.55], [0.95, 0.65, 0.38]]), 0.8 + r() * 0.6));
  else F.face('glass', a - w / 2, a + w / 2, y, y + h, 0.04, null);
  F.box('trim', a - w / 2 - 0.15, a + w / 2 + 0.15, y - 0.2, y - 0.08, 0, 0.14, PALETTE.trim);
  // Mullion cross.
  F.face('trim', a - 0.03, a + 0.03, y, y + h, 0.05, PALETTE.trim);
  if (shutter) {
    for (const s of [-1, 1]) F.face('stucco', a + s * (w / 2 + 0.16), a + s * (w / 2 + 0.16 + w * 0.48), y - 0.02, y + h + 0.02, 0.06, shutter);
  }
  if (balcony) {
    // Slab, wrought-iron rail with a few balusters.
    const bw = w / 2 + 0.55;
    F.box('trim', a - bw, a + bw, y - 0.22, y - 0.08, 0, 0.75, PALETTE.trim);
    F.box('metal', a - bw, a + bw, y + 0.82, y + 0.87, 0.7, 0.75, iron);
    for (let k = 0; k <= 4; k++) {
      const x = a - bw + (2 * bw * k) / 4;
      F.box('metal', x - 0.02, x + 0.02, y - 0.08, y + 0.84, 0.7, 0.74, iron);
    }
    if (flowers) {
      F.box('stucco', a - bw + 0.1, a - bw + 0.6, y - 0.08, y + 0.2, 0.45, 0.7, PALETTE.plant);
      F.box('stucco', a - bw + 0.15, a - bw + 0.55, y + 0.2, y + 0.32, 0.5, 0.68, flowers);
    }
  }
}

function shopfront(F, r, a0, a1, h, opt) {
  const bays = Math.max(1, Math.round((a1 - a0) / 3.6));
  const bw = (a1 - a0) / bays;
  const [awA, awB] = pick(r, PALETTE.awning);
  for (let k = 0; k < bays; k++) {
    const x0 = a0 + k * bw + 0.25, x1 = a0 + (k + 1) * bw - 0.25;
    const door = r() < 0.3;
    F.face('winLit', x0, x1, 0.15, h - 0.6, 0.03, scaleC([1, 0.8, 0.55], 0.9 + r() * 0.5));
    if (door) F.face('trim', (x0 + x1) / 2 - 0.5, (x0 + x1) / 2 + 0.5, 0.15, 2.3, 0.05, scaleC(opt.wall, 0.45));
    // Pilasters between bays.
    F.box('trim', x0 - 0.25, x0, 0, h, 0, 0.12, PALETTE.trim);
    F.box('trim', x1, x1 + 0.25, 0, h, 0, 0.12, PALETTE.trim);
    // Striped awning: sloping canvas plus a scalloped valance.
    if (opt.awnings) {
      const stripes = 6;
      for (let s = 0; s < stripes; s++) {
        const sa = x0 + ((x1 - x0) * s) / stripes, sb = x0 + ((x1 - x0) * (s + 1)) / stripes;
        const col = s % 2 ? awA : awB;
        F.mb.color = col;
        const p = [F.at(sa, h - 0.35, 0.05), F.at(sb, h - 0.35, 0.05), F.at(sb, h - 0.95, 1.5), F.at(sa, h - 0.95, 1.5)];
        F.mb.triFacing('fabric', p[0], p[1], p[2], [F.f[0], 1.5, F.f[1]]);
        F.mb.triFacing('fabric', p[0], p[2], p[3], [F.f[0], 1.5, F.f[1]]);
        F.face('fabric', sa, sb, h - 1.25, h - 0.95, 1.5, col);
      }
    }
  }
  // Sign band above the shops.
  F.box('trim', a0, a1, h - 0.6, h - 0.35, 0, 0.18, PALETTE.trim);
}

function rooftop(F, r, a0, a1, b0, b1, y, opt) {
  // Parapet, water tank, AC units, an antenna and sometimes a pergola garden.
  const t = 0.25;
  F.box('trim', a0, a1, y, y + 0.6, b1 - t, b1, PALETTE.trim);
  F.box('trim', a0, a1, y, y + 0.6, b0, b0 + t, PALETTE.trim);
  F.box('trim', a0, a0 + t, y, y + 0.6, b0, b1, PALETTE.trim);
  F.box('trim', a1 - t, a1, y, y + 0.6, b0, b1, PALETTE.trim);
  const cx = a0 + (a1 - a0) * (0.25 + r() * 0.5), cb = b0 + (b1 - b0) * (0.3 + r() * 0.4);
  if (r() < 0.7) {
    F.cylinder('metal', cx, cb, 0.9, y, y + 1.6, 8, PALETTE.tank);
    for (const [da, db] of [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]]) F.box('metal', cx + da - 0.05, cx + da + 0.05, y, y + 0.4, cb + db - 0.05, cb + db + 0.05, PALETTE.iron);
  }
  const ac = 1 + Math.floor(r() * 3);
  for (let k = 0; k < ac; k++) {
    const x = a0 + 1 + r() * (a1 - a0 - 3), z = b0 + 1 + r() * (b1 - b0 - 3);
    F.box('metal', x, x + 1.2, y, y + 0.8, z, z + 0.9, PALETTE.concrete);
  }
  if (r() < 0.4) F.box('metal', a1 - 1.2, a1 - 1.1, y, y + 4 + r() * 3, b0 + 1, b0 + 1.1, PALETTE.iron);
  if (opt.pergola) {
    const x0 = a0 + 1, x1 = Math.min(a1 - 1, x0 + 6), z0 = b1 - 4, z1 = b1 - 0.8;
    for (const x of [x0, x1]) for (const z of [z0, z1]) F.box('metal', x - 0.06, x + 0.06, y, y + 2.4, z - 0.06, z + 0.06, PALETTE.trim);
    for (let x = x0; x <= x1; x += 0.8) F.box('metal', x - 0.04, x + 0.04, y + 2.4, y + 2.5, z0, z1, PALETTE.trim);
    F.box('stucco', x0, x1, y, y + 0.5, z0, z0 + 0.6, PALETTE.plant);
  }
}

// ---------------------------------------------------------------------------
// Archetypes. Each takes (F, r, lot) where lot = { width, depth, floors, detail }.

/** Riviera apartment block: stucco, shutters, balconies, shops with awnings. */
export function riviera(F, r, lot) {
  const { width: W, depth: D } = lot;
  const floors = lot.floors;
  const g = 4.2, fh = 3.1;
  const H = g + floors * fh;
  const wall = pick(r, PALETTE.stucco);
  const shutter = pick(r, PALETTE.shutter);
  F.box('stucco', -W / 2, W / 2, 0, H, -D, 0, wall);
  // Rusticated ground floor band.
  F.box('stucco', -W / 2 - 0.05, W / 2 + 0.05, 0, g, -D - 0.05, 0.06, scaleC(wall, 0.92));
  shopfront(F, r, -W / 2 + 0.3, W / 2 - 0.3, g, { wall, awnings: r() < 0.85 });
  const bays = Math.max(2, Math.round(W / 3));
  const bw = W / bays;
  const balconyFloors = new Set();
  for (let f = 0; f < floors; f++) if (r() < 0.45) balconyFloors.add(f);
  const flowers = pick(r, PALETTE.flowers);
  for (let f = 0; f < floors; f++) {
    const y = g + f * fh + 0.75;
    // String course between floors.
    F.box('trim', -W / 2, W / 2, g + f * fh - 0.08, g + f * fh + 0.04, 0, 0.08, PALETTE.trim);
    for (let k = 0; k < bays; k++) {
      const a = -W / 2 + bw * (k + 0.5);
      windowUnit(F, r, a, y, Math.min(1.25, bw * 0.42), 1.75, {
        wall, shutter, lit: r() < 0.38, balcony: balconyFloors.has(f), iron: PALETTE.iron, flowers: r() < 0.5 ? flowers : null,
      });
    }
    // Side windows (simpler) on both flanks.
    if (lot.detail) {
      const sb = Math.max(1, Math.round(D / 4.5));
      for (let k = 0; k < sb; k++) {
        const b = -D + (D / sb) * (k + 0.5);
        for (const [a, dir] of [[-W / 2 - 0.02, -1], [W / 2 + 0.02, 1]]) {
          F.sideFace(r() < 0.3 ? 'winLit' : 'glass', a, b - 0.5, b + 0.5, y, y + 1.6, r() < 0.3 ? [1, 0.78, 0.5] : null, dir);
        }
      }
    }
  }
  // Cornice and roof.
  F.box('trim', -W / 2 - 0.3, W / 2 + 0.3, H - 0.45, H, -D - 0.3, 0.35, PALETTE.trim);
  if (r() < 0.45) F.hipRoof('roof', -W / 2, W / 2, -D, 0, H, Math.min(3.5, D * 0.28), pick(r, PALETTE.roofTile));
  else rooftop(F, r, -W / 2, W / 2, -D, 0, H, { pergola: r() < 0.35 });
}

/** A row of narrow townhouses with gables, each its own colour and height. */
export function townhouses(F, r, lot) {
  const { width: W, depth: D } = lot;
  const n = Math.max(2, Math.round(W / 7));
  const w = W / n;
  for (let k = 0; k < n; k++) {
    const a0 = -W / 2 + k * w, a1 = a0 + w;
    const floors = 2 + Math.floor(r() * 3);
    const H = 3.6 + floors * 3;
    const wall = pick(r, PALETTE.stucco);
    const shutter = pick(r, PALETTE.shutter);
    F.box('stucco', a0, a1, 0, H, -D, 0, wall);
    // Arched door: door slab with a lighter semicircle-ish fanlight.
    const dc = (a0 + a1) / 2 + (r() < 0.5 ? -w * 0.22 : w * 0.22);
    F.face('trim', dc - 0.75, dc + 0.75, 0, 2.7, 0.02, PALETTE.trim);
    F.face('stucco', dc - 0.6, dc + 0.6, 0, 2.3, 0.04, pick(r, PALETTE.shutter));
    F.face('winLit', dc - 0.45, dc + 0.45, 2.32, 2.62, 0.04, [1, 0.8, 0.5]);
    const wa = (a0 + a1) / 2 - (dc - (a0 + a1) / 2);
    F.face(r() < 0.5 ? 'winLit' : 'glass', wa - 0.6, wa + 0.6, 0.9, 2.5, 0.04, [1, 0.8, 0.55]);
    for (let f = 0; f < floors; f++) {
      const y = 3.6 + f * 3 + 0.7;
      for (const s of [-1, 1]) {
        windowUnit(F, r, (a0 + a1) / 2 + s * w * 0.22, y, Math.min(0.95, w * 0.2), 1.55, {
          wall, shutter, lit: r() < 0.35, balcony: false, iron: PALETTE.iron, flowers: null,
        });
        if (r() < 0.4) {
          F.box('stucco', (a0 + a1) / 2 + s * w * 0.22 - 0.55, (a0 + a1) / 2 + s * w * 0.22 + 0.55, y - 0.32, y - 0.12, 0.1, 0.35, PALETTE.plant);
          F.box('stucco', (a0 + a1) / 2 + s * w * 0.22 - 0.5, (a0 + a1) / 2 + s * w * 0.22 + 0.5, y - 0.12, y, 0.12, 0.32, pick(r, PALETTE.flowers));
        }
      }
    }
    F.box('trim', a0, a1, H - 0.25, H, 0, 0.18, PALETTE.trim);
    // Gable facing the street (ridge runs front-to-back): use a hip with a small inset for a crisp low-poly look.
    if (r() < 0.6) F.hipRoof('roof', a0 + 0.05, a1 - 0.05, -D, 0, H, 2.2, pick(r, PALETTE.roofTile), 0.3);
    else rooftop(F, r, a0, a1, -D, 0, H, { pergola: false });
  }
}

/** Modern hotel tower on a stone podium: curtain wall, lit floors, a glowing crown sign. */
export function tower(F, r, lot) {
  const { width: W, depth: D } = lot;
  const floors = lot.floors;
  const pod = 7.5;
  F.box('stucco', -W / 2, W / 2, 0, pod, -D, 0, PALETTE.stone);
  shopfront(F, r, -W / 2 + 0.4, W / 2 - 0.4, 4.4, { wall: PALETTE.stone, awnings: false });
  F.box('trim', -W / 2 - 0.2, W / 2 + 0.2, pod - 0.4, pod, -D - 0.2, 0.2, PALETTE.stoneDark);
  const inset = 1.5;
  const tw0 = -W / 2 + inset, tw1 = W / 2 - inset, tb0 = -D + inset, tb1 = -inset;
  const fh = 3.3;
  const top = pod + floors * fh;
  F.box('towerGlass', tw0, tw1, pod, top, tb0, tb1, pick(r, PALETTE.towerGlass));
  // Lit panes on the street face and flanks; mullions and floor bands.
  for (let f = 0; f < floors; f++) {
    const y = pod + f * fh;
    F.box('metal', tw0 - 0.05, tw1 + 0.05, y - 0.06, y + 0.1, tb0 - 0.05, tb1 + 0.05, PALETTE.concrete);
    for (let a = tw0 + 0.75; a < tw1; a += 1.5) {
      if (r() < 0.3) F.face('winLit', a - 0.65, a + 0.65, y + 0.3, y + fh - 0.3, tb1 + 0.02, scaleC([0.95, 0.88, 0.7], 0.7 + r() * 0.6));
    }
    for (const [a, dir] of [[tw0 - 0.02, -1], [tw1 + 0.02, 1]]) {
      for (let b = tb0 + 0.75; b < tb1; b += 1.5) if (r() < 0.25) F.sideFace('winLit', a, b - 0.65, b + 0.65, y + 0.3, y + fh - 0.3, [0.95, 0.88, 0.7], dir);
    }
  }
  for (let a = tw0; a <= tw1 + 0.01; a += 1.5) F.box('metal', a - 0.05, a + 0.05, pod, top, tb1 - 0.02, tb1 + 0.12, PALETTE.concrete);
  // Crown: setback, neon sign band, antenna with a red warning light.
  F.box('stucco', tw0 + 0.8, tw1 - 0.8, top, top + 3, tb0 + 0.8, tb1 - 0.8, PALETTE.concrete);
  F.box('neon', tw0 + 0.6, tw1 - 0.6, top + 1.2, top + 2.1, tb1 - 0.85, tb1 - 0.7, pick(r, PALETTE.neon));
  F.box('metal', -0.08, 0.08, top + 3, top + 12, (tb0 + tb1) / 2 - 0.08, (tb0 + tb1) / 2 + 0.08, PALETTE.iron);
  F.box('neon', -0.2, 0.2, top + 11.6, top + 12.1, (tb0 + tb1) / 2 - 0.2, (tb0 + tb1) / 2 + 0.2, [3, 0.2, 0.15]);
}

/** Belle Époque casino / grand hotel: the landmark by the start line. */
export function casino(F, r, lot) {
  const { width: W, depth: D } = lot;
  const H = 17;
  F.box('stucco', -W / 2, W / 2, 0, H, -D, 0, PALETTE.stone);
  // Rusticated base with arched windows (pointed polygons read as arches in low poly).
  F.box('stucco', -W / 2 - 0.2, W / 2 + 0.2, 0, 5.2, -D - 0.2, 0.2, PALETTE.stoneDark);
  const bays = Math.round(W / 4);
  for (let k = 0; k < bays; k++) {
    const a = -W / 2 + (W / bays) * (k + 0.5);
    const archW = 1.4;
    F.face('winLit', a - archW, a + archW, 0.6, 3.6, 0.22, [1.2, 0.9, 0.55]);
    F.mb.color = [1.2, 0.9, 0.55];
    F.mb.triFacing('winLit', F.at(a - archW, 3.6, 0.22), F.at(a + archW, 3.6, 0.22), F.at(a, 4.6, 0.22), [F.f[0], 0, F.f[1]]);
    // Pilasters on the piano nobile.
    F.box('trim', a - W / bays / 2, a - W / bays / 2 + 0.45, 5.2, H - 1.2, 0, 0.3, PALETTE.trim);
    for (const y of [6.4, 10.4]) {
      windowUnit(F, r, a, y, 1.3, 2.5, { wall: PALETTE.stone, shutter: null, lit: r() < 0.6, balcony: y === 6.4, iron: PALETTE.iron, flowers: null });
    }
  }
  // Balustrade, mansard roof with dormers, central copper dome and lantern.
  F.box('trim', -W / 2 - 0.4, W / 2 + 0.4, H - 1.2, H - 0.5, -D - 0.4, 0.45, PALETTE.trim);
  for (let a = -W / 2; a <= W / 2; a += 0.6) F.box('trim', a - 0.08, a + 0.08, H - 0.5, H + 0.4, 0.25, 0.4, PALETTE.trim);
  F.box('trim', -W / 2 - 0.4, W / 2 + 0.4, H + 0.4, H + 0.55, 0.2, 0.45, PALETTE.trim);
  F.block('roof', [[-W / 2 + 0.6, -D + 0.6], [W / 2 - 0.6, -D + 0.6], [W / 2 - 0.6, -0.6], [-W / 2 + 0.6, -0.6]],
    [[-W / 2 + 2.2, -D + 2.2], [W / 2 - 2.2, -D + 2.2], [W / 2 - 2.2, -2.2], [-W / 2 + 2.2, -2.2]], H, H + 4.5, PALETTE.slate);
  for (let k = 0; k < bays; k++) {
    const a = -W / 2 + (W / bays) * (k + 0.5);
    F.box('trim', a - 0.6, a + 0.6, H + 0.8, H + 2.8, -1.6, -0.9, PALETTE.trim);
    F.face('winLit', a - 0.4, a + 0.4, H + 1, H + 2.4, -0.88, [1.1, 0.85, 0.5]);
  }
  // Dome: stacked octagonal rings for a low-poly hemisphere.
  const db = -D / 2;
  const rings = [[5.2, 0], [5.0, 1.4], [4.4, 2.8], [3.4, 4.0], [2.0, 4.9], [0.6, 5.3]];
  for (let k = 0; k < rings.length - 1; k++) {
    const [r0, h0] = rings[k], [r1, h1] = rings[k + 1];
    const sides = 12;
    const base = H + 4.5;
    F.mb.color = PALETTE.copper;
    for (let s = 0; s < sides; s++) {
      const t0 = (s / sides) * Math.PI * 2, t1 = ((s + 1) / sides) * Math.PI * 2;
      const p = (rr, t, hh) => F.at(Math.cos(t) * rr, base + hh, db + Math.sin(t) * rr);
      const out = [Math.cos((t0 + t1) / 2), (r0 - r1) / Math.max(0.01, h1 - h0), Math.sin((t0 + t1) / 2)];
      const n = [F.r[0] * out[0] + F.f[0] * out[2], out[1], F.r[1] * out[0] + F.f[1] * out[2]];
      F.mb.triFacing('copper', p(r0, t0, h0), p(r0, t1, h0), p(r1, t1, h1), n);
      F.mb.triFacing('copper', p(r0, t0, h0), p(r1, t1, h1), p(r1, t0, h1), n);
    }
  }
  F.cylinder('stucco', 0, db, 5.3, H + 3.8, H + 4.6, 12, PALETTE.trim);
  F.cylinder('trim', 0, db, 0.7, H + 9.7, H + 11, 8, PALETTE.trim);
  F.cylinder('winLit', 0, db, 0.5, H + 9.9, H + 10.8, 8, [1.4, 1.1, 0.6]);
  F.box('metal', -0.04, 0.04, H + 11, H + 14, db - 0.04, db + 0.04, PALETTE.iron);
  F.box('fabric', 0.04, 1.4, H + 13, H + 13.8, db - 0.02, db + 0.02, rgb(0xc8242b));
  // Gold sign over the entrance.
  F.box('neon', -6, 6, 4.4, 5.0, 0.3, 0.4, [2.6, 1.9, 0.7]);
}

/** Church with a bell tower, clock faces and a spire. */
export function church(F, r, lot) {
  const { width: W, depth: D } = lot;
  const wall = PALETTE.stucco[2];
  const nw = Math.min(W - 6, 14);
  F.box('stucco', -nw / 2, nw / 2, 0, 11, -D, -2, wall);
  F.gableRoof('roof', -nw / 2, nw / 2, -D, -2, 11, 4.5, PALETTE.roofTile[0], wall);
  // Rose window and door.
  F.cylinder('winLit', 0, -2 + 0.05, 1.6, 6, 6.1, 10, [1.3, 0.6, 0.4]);
  F.face('trim', -1.4, 1.4, 0, 4.2, -1.95, PALETTE.trim);
  F.face('stucco', -1.1, 1.1, 0, 3.8, -1.9, rgb(0x5a3a28));
  // Bell tower.
  const tx = nw / 2 + 2.5;
  F.box('stucco', tx - 2.5, tx + 2.5, 0, 24, -7, -2, scaleC(wall, 0.95));
  F.box('trim', tx - 2.7, tx + 2.7, 17, 17.4, -7.2, -1.8, PALETTE.trim);
  for (const y of [18, 21]) F.face('glass', tx - 1, tx + 1, y, y + 2, -1.97, null);
  F.cylinder('winLit', tx, -1.95, 1.1, 13.5, 13.6, 12, [1.6, 1.5, 1.2]);
  F.block('roof', [[tx - 2.6, -7.1], [tx + 2.6, -7.1], [tx + 2.6, -1.9], [tx - 2.6, -1.9]],
    [[tx - 0.05, -4.55], [tx + 0.05, -4.55], [tx + 0.05, -4.45], [tx - 0.05, -4.45]], 24, 32, PALETTE.slate);
}

/** Open parking garage: concrete decks with dark gaps and a bright sign. */
export function garage(F, r, lot) {
  const { width: W, depth: D } = lot;
  const decks = 3 + Math.floor(r() * 3);
  const H = decks * 3;
  F.box('stucco', -W / 2 + 0.6, W / 2 - 0.6, 0, H, -D + 0.6, -0.6, rgb(0x3a3b3f));
  for (let k = 0; k <= decks; k++) F.box('stucco', -W / 2, W / 2, k * 3 - 0.2, k * 3 + 0.9, -D, 0, PALETTE.concrete);
  for (let a = -W / 2; a <= W / 2; a += 6) F.box('stucco', a - 0.25, a + 0.25, 0, H, -0.5, 0, PALETTE.concrete);
  F.box('neon', -2.5, 2.5, H + 0.9, H + 2.0, -0.3, -0.1, [0.4, 1.4, 3.0]);
}

/** Simple background block (cheap): body, window bands, cornice, flat or hip roof. */
export function backdrop(F, r, lot) {
  const { width: W, depth: D } = lot;
  const floors = lot.floors;
  const H = 3.6 + floors * 3.1;
  const wall = pick(r, PALETTE.stucco);
  F.box('stucco', -W / 2, W / 2, 0, H, -D, 0, wall);
  const rowsLit = r();
  for (let f = 0; f < floors; f++) {
    const y = 3.6 + f * 3.1 + 0.8;
    const bays = Math.max(2, Math.round(W / 3.2));
    for (let k = 0; k < bays; k++) {
      const a = -W / 2 + (W / bays) * (k + 0.5);
      const lit = r() < 0.32 + rowsLit * 0.1;
      F.face(lit ? 'winLit' : 'glass', a - 0.55, a + 0.55, y, y + 1.5, 0.03, lit ? [1, 0.75, 0.45] : null);
    }
    // Back face too: the town is seen from all sides.
    for (let k = 0; k < Math.max(2, Math.round(W / 4)); k++) {
      const a = -W / 2 + (W / Math.max(2, Math.round(W / 4))) * (k + 0.5);
      F.face('glass', a - 0.55, a + 0.55, y, y + 1.5, -D - 0.03, null, -1);
    }
  }
  F.box('trim', -W / 2 - 0.2, W / 2 + 0.2, H - 0.35, H, -D - 0.2, 0.2, PALETTE.trim);
  if (r() < 0.5) F.hipRoof('roof', -W / 2, W / 2, -D, 0, H, Math.min(3, D * 0.25), pick(r, PALETTE.roofTile));
}

export const ARCHETYPES = { riviera, townhouses, tower, casino, church, garage, backdrop };
