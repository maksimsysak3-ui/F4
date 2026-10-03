import { rgb, scaleC, LOD } from './kit.js';

/**
 * Hand-sculpted Riviera trees, built like the cars: every trunk is a chain of
 * rings, every frond a rib with leaflets, every canopy a cluster of lumpy
 * faceted blobs. All draw through a Frame (a along, y up, b outwards).
 *
 *   palm        Canary/date palm: ringed, gently curving trunk, frond boot,
 *               coconuts, arching pinnate fronds and a couple of dead ones.
 *   stonePine   Umbrella pine: tall bare trunk, limbs, a flat parasol canopy.
 *   olive       Gnarled twin trunk, silvery clumpy crown.
 *   cypress     Flame-shaped Italian cypress with an irregular, faceted skin.
 */

const TRUNK = [rgb(0x8a6a4a), rgb(0x76593d), rgb(0x9a7a58)];
const FROND = [rgb(0x2f6a32), rgb(0x3f7d38), rgb(0x55913f), rgb(0x6aa048)];
const DEAD = rgb(0x8a7442);
const PINE = [rgb(0x2c4a2a), rgb(0x365a30), rgb(0x41663a)];
const PINE_BARK = rgb(0x7a5644);
const OLIVE = [rgb(0x77875a), rgb(0x8a9a68), rgb(0x6b7a52)];
const OLIVE_BARK = rgb(0x6e6253);
const CYPRESS = [rgb(0x24402a), rgb(0x2c4a2f), rgb(0x335536)];

const lerp = (a, b, t) => a + (b - a) * t;

/** Ring of points around (a, y, b) in frame space. */
function ring(F, a, y, b, r, sides, phase = 0, jitter = null) {
  const pts = [];
  for (let k = 0; k < sides; k++) {
    const t = phase + (k / sides) * Math.PI * 2;
    const rr = r * (jitter ? jitter(k) : 1);
    pts.push(F.at(a + Math.cos(t) * rr, y, b + Math.sin(t) * rr));
  }
  return pts;
}

/** Connect two rings with outward-facing quads. */
function band(F, key, r0, r1, c0, c1, color) {
  const n = r0.length;
  for (let k = 0; k < n; k++) {
    const k2 = (k + 1) % n;
    const out = [(r0[k][0] + r0[k2][0] + r1[k][0] + r1[k2][0]) / 4 - (c0[0] + c1[0]) / 2, 0, (r0[k][2] + r0[k2][2] + r1[k][2] + r1[k2][2]) / 4 - (c0[2] + c1[2]) / 2];
    F.mb.color = typeof color === 'function' ? color(k) : color;
    F.mb.triFacing(key, r0[k], r0[k2], r1[k2], out);
    F.mb.triFacing(key, r0[k], r1[k2], r1[k], out);
  }
}

/** Closed tube through centre points [a, y, b] with radii, `sides` facets. */
function tube(F, key, centres, radii, sides, color, phase = 0, cap = true) {
  let prev = null, prevC = null;
  for (let i = 0; i < centres.length; i++) {
    const [a, y, b] = centres[i];
    const cur = ring(F, a, y, b, radii[i], sides, phase);
    const c = F.at(a, y, b);
    if (prev) band(F, key, prev, cur, prevC, c, typeof color === 'function' ? color(i) : color);
    prev = cur; prevC = c;
  }
  if (!cap) return;
  const top = F.at(...centres[centres.length - 1]);
  F.mb.color = typeof color === 'function' ? color(centres.length - 1) : color;
  for (let k = 0; k < sides; k++) F.mb.triFacing(key, prev[k], prev[(k + 1) % sides], top, [0, 1, 0]);
}

/** Lumpy faceted ellipsoid; faces lighter on top like sun-lit foliage. */
function blob(F, key, a, y, b, rx, ry, rz, r, palette, LON = 9, LAT = 5) {
  if (LOD.far) { LON = 5; LAT = 3; }
  const jit = [];
  for (let i = 0; i <= LAT; i++) { jit.push([]); for (let j = 0; j < LON; j++) jit[i].push(0.82 + r() * 0.36); }
  const P = (i, j) => {
    const v = (i / LAT) * Math.PI, u = (j / LON) * Math.PI * 2 + (i % 2) * 0.45;
    const k = i === 0 || i === LAT ? 1 : jit[i][j % LON];
    return F.at(a + Math.sin(v) * Math.cos(u) * rx * k, y + Math.cos(v) * ry * (i === 0 ? 1 : k), b + Math.sin(v) * Math.sin(u) * rz * k);
  };
  const c = F.at(a, y, b);
  const base = palette[Math.floor(r() * palette.length)];
  const emit = (p, q, s) => {
    const m = [(p[0] + q[0] + s[0]) / 3 - c[0], (p[1] + q[1] + s[1]) / 3 - c[1], (p[2] + q[2] + s[2]) / 3 - c[2]];
    const l = Math.hypot(...m) || 1;
    F.mb.color = scaleC(base, 0.78 + 0.38 * Math.max(0, m[1] / l) + (r() - 0.5) * 0.08);
    F.mb.triFacing(key, p, q, s, m);
  };
  for (let i = 0; i < LAT; i++) {
    for (let j = 0; j < LON; j++) {
      const p00 = P(i, j), p01 = P(i, j + 1), p10 = P(i + 1, j), p11 = P(i + 1, j + 1);
      if (i > 0) emit(p00, p01, p11);
      if (i < LAT - 1) emit(p00, p11, p10);
    }
  }
}

/** Canary palm. */
export function palm(F, r, height = 7 + r() * 3) {
  const az = r() * Math.PI * 2, lean = 0.06 + r() * 0.12;
  const off = (t) => lean * height * Math.pow(t, 1.6);
  const at = (t) => [Math.cos(az) * off(t), t * height, Math.sin(az) * off(t)];
  // Root flare, then a ringed trunk: each ring has a lip (old frond scar) and a waist.
  tube(F, 'stucco', [[0, 0, 0], [0, 0.35, 0]], [0.42, 0.27], 7, TRUNK[1]);
  const segs = 9;
  for (let k = 0; k < segs; k++) {
    const t0 = 0.035 + (k / segs) * 0.965, t1 = 0.035 + ((k + 1) / segs) * 0.965;
    const r0 = lerp(0.27, 0.17, t0), r1 = lerp(0.27, 0.17, t1);
    // Each ring flares at its base (the old frond scar) and narrows to the next.
    tube(F, 'stucco', [at(t0), at(t1)], [r0 * 1.14, r1 * 0.92], 7, TRUNK[k % 3], k * 0.4, k === segs - 1);
  }
  const top = at(1);
  // Frond boot: a dark cone of old leaf bases, and coconuts below the crown.
  tube(F, 'stucco', [[top[0], top[1] - 0.6, top[2]], [top[0], top[1], top[2]], [top[0], top[1] + 0.35, top[2]]], [0.2, 0.42, 0.18], 8, rgb(0x5a4a30));
  for (let k = 0; k < 3; k++) {
    const t = (k / 3) * Math.PI * 2 + r();
    blob(F, 'stucco', top[0] + Math.cos(t) * 0.28, top[1] - 0.25 - r() * 0.15, top[2] + Math.sin(t) * 0.28, 0.13, 0.14, 0.13, r, [rgb(0xb88a3a), rgb(0x8a6a2a)], 5, 3);
  }
  // Fronds: an arching midrib with a V of leaflets that widens then tapers.
  const fronds = 12;
  for (let f = 0; f < fronds + 2; f++) {
    const dead = f >= fronds;
    const th = (f / fronds) * Math.PI * 2 + r() * 0.35;
    const elev = dead ? -1.1 - r() * 0.3 : 0.25 + r() * 0.75;
    const len = (dead ? 2.0 : 3.0 + r() * 1.1) * (height / 8.5);
    const droop = dead ? 0.1 : 0.9 + r() * 0.6;
    const dx = Math.cos(th), dz = Math.sin(th);
    const sx = -dz, sz = dx; // leaflet side direction
    const N = 5;
    const rib = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const h = len * u * Math.cos(elev), v = len * u * Math.sin(elev) - droop * len * 0.45 * u * u;
      rib.push([top[0] + dx * (h + 0.15), top[1] + 0.25 + v, top[2] + dz * (h + 0.15)]);
    }
    for (const side of [-1, 1]) {
      let prevTip = null;
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const w = (dead ? 0.35 : 0.85) * Math.sin(Math.PI * Math.min(1, u * 1.05)) ** 0.7 * (len / 3.5);
        const p = rib[i];
        const tip = [p[0] + sx * side * w + dx * w * 0.35, p[1] - w * 0.45, p[2] + sz * side * w + dz * w * 0.35];
        if (prevTip) {
          F.mb.color = dead ? DEAD : scaleC(FROND[Math.min(3, Math.floor(u * 4))], 0.92 + r() * 0.12);
          const q = [rib[i - 1], p, tip, prevTip].map(([a, y, b]) => F.at(a, y, b));
          F.mb.triFacing('leaf', q[0], q[1], q[2], [0, 1, 0]);
          F.mb.triFacing('leaf', q[0], q[2], q[3], [0, 1, 0]);
        }
        prevTip = tip;
      }
    }
  }
}

/** Umbrella (stone) pine: the Riviera's parasol on a stick. */
export function stonePine(F, r) {
  const h = 8 + r() * 4;
  const az = r() * Math.PI * 2, lean = 0.4 + r() * 0.8;
  const ax = Math.cos(az) * lean, bz = Math.sin(az) * lean;
  const fork = h * 0.62;
  tube(F, 'stucco', [[0, 0, 0], [ax * 0.3, fork * 0.5, bz * 0.3], [ax, fork, bz]], [0.36, 0.26, 0.22], 7, PINE_BARK);
  // Limbs spreading into the canopy.
  const limbs = 3 + Math.floor(r() * 2);
  const tips = [];
  for (let k = 0; k < limbs; k++) {
    const t = (k / limbs) * Math.PI * 2 + r() * 0.6;
    const d = 1.6 + r() * 1.6;
    const tip = [ax + Math.cos(t) * d, h - 0.6 + r() * 0.5, bz + Math.sin(t) * d];
    tips.push(tip);
    tube(F, 'stucco', [[ax, fork - 0.2, bz], [(ax + tip[0]) / 2, (fork + tip[1]) / 2 + 0.3, (bz + tip[2]) / 2], tip], [0.17, 0.12, 0.08], 5, PINE_BARK);
  }
  // Flat, wide canopy: overlapping flattened clumps.
  for (const tip of tips) blob(F, 'leaf', tip[0], tip[1] + 0.5, tip[2], 2.2 + r() * 0.8, 0.85 + r() * 0.25, 2.2 + r() * 0.8, r, PINE);
  blob(F, 'leaf', ax, h + 0.3, bz, 2.6, 1.0, 2.6, r, PINE);
}

/** Olive tree: twisted twin trunk and a silvery crown. */
export function olive(F, r) {
  for (let s = 0; s < 2; s++) {
    const t = r() * Math.PI * 2, wob = 0.35;
    const pts = [], radii = [];
    for (let i = 0; i <= 4; i++) {
      const u = i / 4;
      pts.push([Math.cos(t) * 0.25 * u + Math.sin(i * 1.7 + s) * wob * u, u * 2.0, Math.sin(t) * 0.25 * u + Math.cos(i * 1.3 + s) * wob * u]);
      radii.push(lerp(0.2, 0.09, u));
    }
    tube(F, 'stucco', pts, radii, 5, OLIVE_BARK, s);
  }
  const n = 5 + Math.floor(r() * 3);
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2 + r();
    const d = k === 0 ? 0 : 0.8 + r() * 0.7;
    blob(F, 'leaf', Math.cos(t) * d, 2.4 + r() * 0.9, Math.sin(t) * d, 0.9 + r() * 0.5, 0.7 + r() * 0.3, 0.9 + r() * 0.5, r, OLIVE);
  }
}

/** Italian cypress: a tall flame of dark faceted foliage. */
export function cypress(F, r, a = 0, b = 0, h = 7 + r() * 5) {
  tube(F, 'stucco', [[a, 0, b], [a, 0.9, b]], [0.14, 0.12], 5, rgb(0x5a4026));
  const rmax = 0.55 + h * 0.035;
  const RINGS = 9, SIDES = 8;
  const rings = [], centres = [];
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS;
    const y = 0.6 + t * (h - 0.6);
    // Flame profile: swells quickly, widest a third of the way up, then a long taper to a point.
    const prof = Math.sin(Math.PI * Math.min(1, 0.25 + t * 1.6) * 0.5) * Math.pow(1 - t, 0.55);
    const rr = Math.max(0.03, rmax * prof);
    const sway = Math.sin(t * 2.4 + a) * 0.08 * t;
    rings.push(ring(F, a + sway, y, b, rr, SIDES, i * 0.39, () => 0.84 + r() * 0.32));
    centres.push(F.at(a + sway, y, b));
  }
  for (let i = 0; i < RINGS; i++) band(F, 'leaf', rings[i], rings[i + 1], centres[i], centres[i + 1], () => scaleC(CYPRESS[Math.floor(r() * 3)], 0.9 + r() * 0.2));
  // Close the bottom.
  F.mb.color = CYPRESS[0];
  for (let k = 0; k < SIDES; k++) F.mb.triFacing('leaf', rings[0][k], rings[0][(k + 1) % SIDES], centres[0], [0, -1, 0]);
}

/** Generic street/garden tree: olive or umbrella pine. */
export function tree(F, r) {
  if (r() < 0.55) olive(F, r);
  else stonePine(F, r);
}

const SPRUCE = [rgb(0x1f3d2c), rgb(0x24482f), rgb(0x2b5234)];
const BIRCH_BARK = rgb(0xe8e4d8), BIRCH_MARK = rgb(0x2a2622), BIRCH_LEAF = [rgb(0x7fa84a), rgb(0x8fb856), rgb(0x6f9a40)];
const SCOTS_BARK = rgb(0xa0603a);

/** Norway spruce: a narrow tower of drooping skirts, darker inside, with a spike on top. */
export function spruce(F, r, h = 12 + r() * 8) {
  tube(F, 'stucco', [[0, 0, 0], [0, h * 0.3, 0]], [0.28, 0.2], 6, rgb(0x5a4030), 0, false);
  const tiers = 6;
  for (let k = 0; k < tiers; k++) {
    const t = k / tiers;
    const y0 = h * (0.12 + t * 0.8), y1 = y0 + h * 0.26;
    const R = (1 - t * 0.82) * h * 0.2;
    const col = SPRUCE[k % 3];
    const skirt = ring(F, 0, y0, 0, R, 8, k * 0.4, () => 0.85 + r() * 0.3);
    const apex = F.at(0, y1, 0), under = F.at(0, y0 + h * 0.06, 0);
    for (let i = 0; i < 8; i++) {
      const a = skirt[i], b = skirt[(i + 1) % 8];
      F.mb.color = scaleC(col, 0.9 + r() * 0.2);
      F.mb.triFacing('leaf', a, b, apex, [(a[0] + b[0]) / 2 - apex[0], 0.6, (a[2] + b[2]) / 2 - apex[2]]);
      F.mb.color = scaleC(col, 0.55);
      F.mb.triFacing('leaf', a, b, under, [0, -1, 0]);
    }
  }
  tube(F, 'leaf', [[0, h * 0.92, 0], [0, h * 1.04, 0]], [0.12, 0.02], 4, SPRUCE[0]);
}

/** Scots pine: tall bare orange trunk with a few dark clumps up top. */
export function scotsPine(F, r, h = 14 + r() * 6) {
  tube(F, 'stucco', [[0, 0, 0], [r() - 0.5, h * 0.75, r() - 0.5]], [0.3, 0.16], 6, SCOTS_BARK);
  for (let k = 0; k < 4; k++) {
    const t = (k / 4) * Math.PI * 2 + r();
    const d = k === 0 ? 0 : 1.4 + r();
    blob(F, 'leaf', Math.cos(t) * d, h * (0.78 + r() * 0.15), Math.sin(t) * d, 1.8 + r() * 0.8, 1.0 + r() * 0.4, 1.8 + r() * 0.8, r, SPRUCE, 6, 3);
  }
}

/** Silver birch: white trunk with black marks, light airy crown. */
export function birch(F, r, h = 9 + r() * 5) {
  const segs = 5;
  for (let k = 0; k < segs; k++) {
    const y0 = (k / segs) * h * 0.7, y1 = ((k + 1) / segs) * h * 0.7;
    tube(F, 'stucco', [[0, y0, 0], [0, y1, 0]], [0.16 - k * 0.02, 0.14 - k * 0.02], 5, k % 2 ? BIRCH_MARK : BIRCH_BARK, k, false);
  }
  for (let k = 0; k < 4; k++) {
    const t = (k / 4) * Math.PI * 2 + r();
    const d = k === 0 ? 0 : 0.9 + r() * 0.6;
    blob(F, 'leaf', Math.cos(t) * d, h * (0.7 + r() * 0.2), Math.sin(t) * d, 1.2 + r() * 0.5, 1.4 + r() * 0.5, 1.2 + r() * 0.5, r, BIRCH_LEAF, 6, 3);
  }
}
