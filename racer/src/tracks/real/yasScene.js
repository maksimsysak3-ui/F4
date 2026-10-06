import { rgb, scaleC, pick } from '../street/kit.js?v=a5d31c9';
import { standVariety } from './trackside.js?v=a5d31c9';
import { buildRealScene } from './scene.js?v=a5d31c9';
import { cheapBlock } from '../street/buildings.js?v=a5d31c9';
import { palm } from '../street/trees.js?v=a5d31c9';
import { grandstand, yacht } from '../street/props.js?v=a5d31c9';
import { floodMast, beam } from '../night/venue.js?v=a5d31c9';

/*
 * Yas Marina, handcrafted for the night. The Yas hotel straddles the track on
 * two white towers joined by a bridge, wrapped in its gridshell of glowing
 * diamond panels; the marina below is full of lit superyachts. White
 * grandstands with mashrabiya lattice screens and tensile sail roofs, the
 * floodlight towers that turn night into day, a red theme-park roof the size
 * of a town to the north, palms on the sand, and the towers of Abu Dhabi
 * glittering across the water.
 */

const WHITE = rgb(0xf4f4f0), SAND = rgb(0xd8c49a), STEEL = rgb(0x8a929e);
const CYAN = [0.5, 2.6, 3.2], MAGENTA = [3.0, 0.6, 2.4], BLUE = [0.6, 1.0, 3.2], GOLD = [3.0, 2.0, 0.8];
const SHIRTS = [rgb(0x00732f), WHITE, rgb(0xd8242b), rgb(0x1b1b1f), rgb(0xff8000), rgb(0x00a19b), rgb(0x2a4a8a), rgb(0xf2c200)];

const SPONSORS = [
  ['FALCON AIRWAYS', '#8a1a3a', '#ffffff', '#d8b04a', 'serif'],
  ['DUNE ENERGY', '#e8a030', '#141416', '#141416', 'stripes'],
  ['YAS TELECOM', '#00a19b', '#ffffff', '#ffffff', 'wave'],
  ['PEARL BANK', '#f2ead8', '#1b2a4a', '#d8b04a', 'serif'],
  ['OASIS COLA', '#d8242b', '#ffffff', '#ffd23f', 'wave'],
  ['MIRAGE TYRES', '#141416', '#7df9ff', '#7df9ff', 'tread'],
  ['NEON GULF', '#3a1a7a', '#7df9ff', '#ff3fd1', 'bolt'],
  ['SAADIYAT WATCHES', '#1b1b1f', '#d8b04a', '#d8b04a', 'serif'],
];

/** Grandstand in the Yas style: white frame, a mashrabiya lattice screen behind, a sail roof, LED fascia. */
function yasStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: false, seats: [rgb(0xd8242b), rgb(0x00732f), WHITE] });
  const depth = tiers * 0.85 + 2, top = 1.2 + tiers * 0.6;
  // Lattice screen: a diamond grid of white struts, lit from behind.
  F.box('stucco', -W / 2, W / 2, 0, top + 6, -depth - 0.8, -depth - 0.5, rgb(0x2a2440));
  for (let a = -W / 2; a < W / 2 - 1; a += 2.4) {
    for (let y = 0.6; y < top + 5; y += 2.4) {
      beam(F, 'trim', [a, y, -depth - 0.45], [a + 1.2, y + 1.2, -depth - 0.45], 0.14, WHITE);
      beam(F, 'trim', [a + 1.2, y + 1.2, -depth - 0.45], [a + 2.4, y, -depth - 0.45], 0.14, WHITE);
      F.face('neon', a + 0.9, a + 1.5, y + 0.3, y + 0.9, -depth - 0.49, scaleC(r() < 0.5 ? CYAN : MAGENTA, 0.35));
    }
  }
  // Sail roof: white triangles on masts at the back, peaks alternating.
  for (let a = -W / 2; a < W / 2 - 0.1; a += 12) {
    F.box('metal', a - 0.15, a + 0.15, 0, top + 12, -depth - 0.2, -depth + 0.1, WHITE);
    const p0 = F.at(a, top + 12, -depth), p1 = F.at(Math.min(W / 2, a + 12), top + 7, -depth), p2 = F.at(a + 6, top + 8.5, 3);
    F.mb.color = WHITE;
    F.mb.triFacing('fabric', p0, p1, p2, [0, 1, 0]);
    F.mb.triFacing('fabric', p0, p2, p1, [0, -1, 0]);
  }
  F.box('neon', -W / 2, W / 2, 1.0, 1.15, 0.13, 0.2, CYAN); // LED line along the front
  return { ...gs, shirts: SHIRTS };
}

/**
 * Lofted solid through horizontal polygons (each [[a, b], ...] at its height): side quads facing out,
 * caps fanned. The building block of the futuristic towers (twisted, tapered, leaning, sail-shaped).
 */
function loftPoly(F, key, polys, ys, col, cap = true) {
  F.mb.color = col;
  const n = polys[0].length;
  for (let k = 0; k < polys.length - 1; k++) {
    const P = polys[k], Q = polys[k + 1], y0 = ys[k], y1 = ys[k + 1];
    let cx = 0, cz = 0;
    for (const [a, b] of P) { cx += a / n; cz += b / n; }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const p = [F.at(P[i][0], y0, P[i][1]), F.at(P[j][0], y0, P[j][1]), F.at(Q[j][0], y1, Q[j][1]), F.at(Q[i][0], y1, Q[i][1])];
      const m = F.at((P[i][0] + P[j][0]) / 2, y0, (P[i][1] + P[j][1]) / 2), c = F.at(cx, y0, cz);
      const out = [m[0] - c[0], 0, m[2] - c[2]];
      F.mb.triFacing(key, p[0], p[1], p[2], out);
      F.mb.triFacing(key, p[0], p[2], p[3], out);
    }
  }
  if (!cap) return;
  const T = polys.at(-1), y = ys.at(-1), c = [0, 0];
  for (const [a, b] of T) { c[0] += a / n; c[1] += b / n; }
  for (let i = 0; i < n; i++) F.mb.triFacing(key, F.at(c[0], y, c[1]), F.at(T[i][0], y, T[i][1]), F.at(T[(i + 1) % n][0], y, T[(i + 1) % n][1]), [0, 1, 0]);
}
const ngon = (n, rx, rz, rot = 0, ox = 0, oz = 0) => Array.from({ length: n }, (_, k) => { const t = rot + (k / n) * Math.PI * 2; return [ox + Math.cos(t) * rx, oz + Math.sin(t) * rz]; });

/** A futuristic tower, one of several forms, in dark reflective glass with LED lines and a lit crown. */
function gulfTower(F, r, W, D, floors) {
  const H = 4 + floors * 3.4, kind = Math.floor(r() * 6), led = pick(r, [CYAN, MAGENTA, BLUE, GOLD, [2.4, 2.6, 3.0]]);
  const lvls = Math.max(6, Math.min(30, Math.round(floors / 2)));
  const ys = Array.from({ length: lvls + 1 }, (_, k) => (k / lvls) * H);
  const R0 = Math.min(W, D) / 2;
  let polys;
  if (kind === 0) polys = ys.map((y, k) => ngon(4, R0, R0, (k / lvls) * Math.PI * 0.6 + Math.PI / 4));                       // twisting square
  else if (kind === 1) polys = ys.map((y, k) => ngon(8, R0 * (1 - 0.55 * (k / lvls) ** 1.5), R0 * (1 - 0.55 * (k / lvls) ** 1.5)));  // tapering octagon
  else if (kind === 2) polys = ys.map((y, k) => ngon(10, R0, R0 * 0.7, 0, (k / lvls) ** 1.4 * R0 * 0.9, 0));                  // leaning ellipse
  else if (kind === 3) polys = ys.map((y, k) => { const t = k / lvls, w = R0 * (1.2 - 0.9 * t * t); return [[-w, R0 * 0.6], [w, R0 * 0.6], [w * 0.4, -R0 * (0.9 - 0.5 * t)], [-w * 0.4, -R0 * (0.9 - 0.5 * t)]]; }); // the sail
  else if (kind === 4) polys = ys.map((y, k) => ngon(3, R0 * 1.15, R0 * 1.15, (k / lvls) * 0.9));                           // twisting triangle
  else polys = ys.map(() => ngon(4, R0, R0 * 0.8, Math.PI / 4));                                                            // diagrid block
  loftPoly(F, 'glass', polys, ys, null);
  // LED floor lines every few levels and up the edges, the lit crown.
  for (let k = 1; k < lvls; k += 2) {
    const P = polys[k].map(([a, b]) => [a * 1.015, b * 1.015]), y = ys[k];
    for (let i = 0; i < P.length; i++) beam(F, 'neon', [P[i][0], y, P[i][1]], [P[(i + 1) % P.length][0], y, P[(i + 1) % P.length][1]], 0.22, scaleC(led, 0.55));
  }
  if (kind === 5) for (let k = 0; k < lvls; k += 2) for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0]]) {
    const P = polys[k], Q = polys[Math.min(lvls, k + 2)];
    beam(F, 'trim', [P[i][0] * 1.01, ys[k], P[i][1] * 1.01], [Q[j][0] * 1.01, ys[Math.min(lvls, k + 2)], Q[j][1] * 1.01], 0.35, WHITE);
  }
  for (const i of [0, Math.floor(polys[0].length / 2)]) {
    const pts = polys.map((P, k) => [P[i][0] * 1.02, ys[k], P[i][1] * 1.02]);
    for (let k = 0; k < pts.length - 1; k++) beam(F, 'neon', pts[k], pts[k + 1], 0.25, led);
  }
  const T = polys.at(-1);
  loftPoly(F, 'neon', [T.map(([a, b]) => [a * 0.9, b * 0.9]), T.map(([a, b]) => [a * 0.6, b * 0.6])], [H, H + 4], scaleC(led, 0.7));
  if (kind === 1) F.cylinder('metal', 0, 0, 0.5, H + 4, H + 28, 6, WHITE); // the spire
}

/** Podium block between the towers: low, white, wrapped in lit glass bands. */
function podium(F, r, W, D) {
  F.box('stucco', -W / 2, W / 2, -1, 9, -D, 0, rgb(0xe8e8ec));
  for (const y of [1.2, 5.2]) F.face('winLit', -W / 2 + 1, W / 2 - 1, y, y + 2.6, 0.02, [1.1, 1.15, 1.3]);
  F.box('neon', -W / 2, W / 2, 9, 9.3, -D, 0.1, scaleC(pick(r, [CYAN, MAGENTA, BLUE]), 0.6));
}

/** The Aldar headquarters: the giant round disc standing on its edge. */
function discTower(F) {
  const R = 55, n = 28;
  for (let k = 0; k < n; k++) {
    const t0 = (k / n) * Math.PI * 2, t1 = ((k + 1) / n) * Math.PI * 2;
    const q = (t) => [Math.cos(t) * R, R + 4 + Math.sin(t) * R];
    const [a0, y0] = q(t0), [a1, y1] = q(t1);
    F.mb.color = null;
    for (const b of [-12, 12]) {
      const p = [F.at(0, R + 4, b), F.at(a0, y0, b), F.at(a1, y1, b)];
      F.mb.triFacing('glass', p[0], p[1], p[2], [0, 0, b > 0 ? 1 : -1].map((v, i) => (i === 2 ? v : 0)));
    }
    F.mb.color = WHITE;
    const e = [F.at(a0, y0, -12), F.at(a1, y1, -12), F.at(a1, y1, 12), F.at(a0, y0, 12)];
    F.mb.quad('trim', e[0], e[1], e[2], e[3]);
    beam(F, 'neon', [a0 * 0.98, y0, 12.1], [a1 * 0.98, y1, 12.1], 0.3, scaleC(GOLD, 0.6));
  }
}

/** The theme park's vast red roof: a low, three-lobed shell with a white rim. */
function redRoof(F) {
  const n = 30;
  for (let k = 0; k < n; k++) {
    const t0 = (k / n) * Math.PI * 2, t1 = ((k + 1) / n) * Math.PI * 2;
    const R = (t) => 170 * (1 + 0.22 * Math.cos(3 * t));
    for (let ring = 0; ring < 4; ring++) {
      const r0 = ring / 4, r1 = (ring + 1) / 4, h = (u) => 34 * (1 - u * u);
      const P = (t, u) => [Math.cos(t) * R(t) * u, h(u), Math.sin(t) * R(t) * u];
      const a = P(t0, r0), b = P(t1, r0), c = P(t1, r1), d = P(t0, r1);
      F.mb.color = ring === 3 ? WHITE : rgb(0xc8102e);
      F.mb.triFacing('roof', F.at(a[0], a[1], a[2]), F.at(b[0], b[1], b[2]), F.at(c[0], c[1], c[2]), [0, 1, 0]);
      F.mb.triFacing('roof', F.at(a[0], a[1], a[2]), F.at(c[0], c[1], c[2]), F.at(d[0], d[1], d[2]), [0, 1, 0]);
    }
  }
  F.cylinder('stucco', 0, 0, 160, 0, 3, 30, rgb(0x3a3440));
}

/** A white mosque on the horizon: a big central dome, smaller domes, four minarets, lit. */
function mosque(F) {
  F.box('stucco', -60, 60, 0, 14, -60, 60, WHITE);
  F.cylinder('stucco', 0, 0, 20, 14, 26, 16, WHITE);
  for (let k = 0; k < 6; k++) F.cylinder('stucco', 0, 0, 20 * (1 - k * 0.16), 26 + k * 3, 29 + k * 3, 16, WHITE);
  for (const [a, b] of [[-40, -40], [40, -40], [40, 40], [-40, 40]]) {
    F.cylinder('stucco', a * 1.4, b * 1.4, 3, 0, 90, 10, WHITE);
    F.cylinder('neon', a * 1.4, b * 1.4, 3.2, 70, 72, 10, GOLD);
  }
  F.box('neon', -60, 60, 13.6, 14.2, 60.1, 60.4, scaleC(GOLD, 0.5));
}

const VARIED = standVariety(yasStand, null, SHIRTS);

export function buildYasScene(L) {
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const noise = (x, z) => Math.sin(x * 0.013 + 0.3) * Math.cos(z * 0.011 + 0.8) * 0.6 + Math.sin(x * 0.033 - z * 0.027) * 0.4;
  const img = (px, py) => L.fromImage(px, py);
  // The marina south of the marina section, and the channel to the open water beyond.
  const marina = [];
  for (const [px, py, r] of [[200, 520, 70], [300, 545, 80], [400, 560, 70], [140, 600, 90], [260, 640, 110], [420, 650, 100], [560, 690, 90]]) {
    const [x, z] = img(px, py);
    marina.push({ x, z, r: r * 1.6176, y: 0.4, margin: 10, depth: 6, colour: 0x0e2a4a });
  }
  const sea = [];
  for (let px = -500; px <= 1500; px += 200) { const [x, z] = img(px, 980); sea.push({ x, z, r: 700, y: 0.4, margin: 30, depth: 10, colour: 0x0a1e3a }); }
  const water = [...marina, ...sea];
  const wetAt = (x, z, pad = 0) => water.some((w) => Math.hypot(x - w.x, z - w.z) < w.r + pad);

  return buildRealScene(L, {
    name: 'Yas Marina',
    seed: 2009,
    margin: 700,
    windowGlow: 1.2,
    trackside: { standBuild: yasStand, shirts: SHIRTS, stands: true, suburb: 0, hoardingSpacing: 110, skyline: { count: 380, tall: 190, dir: 3.6, spread: 1.6, depth: 1400, colours: [rgb(0x8aa0c0), rgb(0xa8b8d0), rgb(0xc8c0b0)] } },
    pitTheme: {
      wall: rgb(0xeeeeea),
      upper(F, hw, i, rc, { H1, DEPTH }) {
        const top = H1 + 4;
        F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -1.0, WHITE);
        F.face(i % 2 ? 'winLit' : 'glass', -hw + 0.2, hw - 0.2, H1 + 0.4, top - 0.4, -0.98, [0.9, 1.15, 1.3]);
        F.box('neon', -hw, hw, top, top + 0.25, -DEPTH, 0.9, CYAN);
        F.box('roof', -hw, hw, top + 0.25, top + 0.7, -DEPTH, 1.6, WHITE);
        if (rc) F.box('stucco', -hw + 0.6, hw - 0.6, top + 0.7, top + 6, -DEPTH + 1, -1.2, WHITE);
      },
    },
    style: {
      kerb: [rgb(0xf2f1ec), rgb(0xd8242b)],
      runoff: 'brand', runoffFloor: [0.08, 0.08, 0.09],
      barrier: 'slab', slab: [rgb(0xe8e8ec), rgb(0x1c1c22), [0.6, 2.4, 3.0]],
      fence: true, lamps: 'flood', verge: 'paving',
      sponsors: SPONSORS,
      zoneBrands: ['FALCON AIRWAYS', 'DUNE ENERGY', 'YAS TELECOM', 'OASIS COLA', 'NEON GULF'],
      primeBrands: ['PEARL BANK', 'SAADIYAT WATCHES'],
      title: ['ABU DHABI', 'ABU DHABI GRAND PRIX', '#0a0a1a', '#ffffff', '#7df9ff'],
      bridges: [['FALCON AIRWAYS', 'FLY BEYOND', '#8a1a3a', '#ffffff', '#d8b04a'], ['NEON GULF', 'THE NIGHT IS OURS', '#3a1a7a', '#7df9ff', '#ff3fd1']],
      roadName: 'YAS MARINA',
      bannerGlow: 0.55,
      boardBorder: '#7df9ff',
    },
    fascia: ['ABU DHABI', 'ABU DHABI GRAND PRIX'],
    fasciaColours: ['#0a0a1a', '#ffffff', '#7df9ff'],
    skirtColour: [0.42, 0.38, 0.32],
    groundKind: 'sand',
    relief(x, z, d) {
      return (noise(x * 0.6, z * 0.6) * 4) * smooth(60, 300, d);
    },
    colourAt(x, z, h, slope, d) {
      const sand = [0.62, 0.55, 0.42], lawn = [0.3, 0.46, 0.24], pave = [0.5, 0.5, 0.52];
      if (wetAt(x, z, 6)) return [0.7, 0.68, 0.62];
      if (d < 70) return noise(x * 3, z * 3) > 0.2 ? lawn : pave;
      return noise(x * 1.5, z * 1.5) > 0.45 ? lawn : sand;
    },
    water,
    stands: [
      { at: 0, side: 'L', W: 170, tiers: 16, build: yasStand, offset: -60 }, // main grandstand, opposite the pits
      { at: 4, side: 'outside', W: 90, tiers: 14, build: VARIED },        // T1
      { at: 17, side: 'outside', W: 90, tiers: 14, build: VARIED },       // the hairpin
      { at: 19, side: 'R', W: 120, tiers: 14, build: VARIED },            // the back straight
      { at: 23, side: 'outside', W: 80, tiers: 12, build: VARIED },       // the chicane
      { at: 33, side: 'outside', W: 90, tiers: 14, build: VARIED },       // T9
      { at: 45, side: 'L', W: 70, tiers: 12, build: VARIED },             // the marina
    ],
    landmarks({ L, R, frameAt, kit, terrain, placed }) {
      const ps = (k) => L.pointS(k);
      const dry = (x, z) => !wetAt(x, z, 6);
      // ---- the Yas hotel: two oval white towers either side of the track, a sleek bridge between them,
      // and the gridshell: a flowing veil of diamond panels lit in waves of colour over both ----
      const hs = (ps(53) + ps(55)) / 2, hi = Math.floor(hs / L.ds) % L.N;
      const cx = L.x[hi], cz = L.z[hi], ry = L.yAt(hi, 0);
      const H = frameAt(cx, cz, Math.atan2(-L.tz[hi], L.tx[hi]), ry); // a along the track, b across it
      const plusIsLeft = L.nx[hi] * -L.tz[hi] + L.nz[hi] * L.tx[hi] >= 0;
      const wl = (plusIsLeft ? L.wall.L[hi] : L.wall.R[hi]) + 4, wr = (plusIsLeft ? L.wall.R[hi] : L.wall.L[hi]) + 4, TW = 22, TL = 120, TH = 44;
      let hotel = 0;
      for (const [b0, sgn] of [[wl, 1], [-wr, -1]]) {
        const bc = b0 + sgn * TW / 2;
        const lv = 12, ysT = Array.from({ length: lv + 1 }, (_, k) => (k / lv) * TH);
        const oval = (k) => ngon(18, TL / 2 * (1 - 0.08 * Math.abs(k / lv - 0.5)), TW / 2, 0, 0, bc);
        loftPoly(H, 'glass', ysT.map((_, k) => oval(k)), ysT, null);
        for (let k = 1; k < lv; k++) {
          const P = oval(k).map(([a, b]) => [a * 1.012, bc + (b - bc) * 1.06]);
          loftPoly(H, 'stucco', [P, P], [ysT[k] - 0.35, ysT[k] + 0.1], WHITE, false); // white floor bands
        }
        kit.footprints.push({ cx: cx - L.tz[hi] * bc, cz: cz + L.tx[hi] * bc, ux: L.tx[hi], uz: L.tz[hi], hw: TL / 2 + 6, hd: TW / 2 + 4 });
        hotel++;
      }
      // The bridge: a flattened glass tube on a white keel, high over the road.
      H.box('stucco', -10, 10, 19.4, 20.6, -wr - 4, wl + 4, WHITE);
      H.box('glass', -9, 9, 20.6, 25, -wr - 4, wl + 4, null);
      H.box('neon', -10, 10, 19.2, 19.4, -wr - 4, wl + 4, CYAN);
      // Gridshell over everything: height falls off to the ends and the outer edges like a draped veil.
      const span = wl + wr + 2 * TW + 30, b0g = -wr - TW - 15;
      const gy = (a, u) => 18 + 40 * Math.sqrt(Math.max(0, 1 - (a / 78) ** 2)) * (0.35 + 0.65 * Math.sin(Math.PI * u));
      const node = (a, u) => [a, gy(a, u), b0g + u * span];
      const NA = 26, NU = 16;
      for (let i = 0; i < NA; i++) for (let j = 0; j < NU; j++) {
        const a0 = -78 + (i / NA) * 156, a1 = -78 + ((i + 1) / NA) * 156, am = (a0 + a1) / 2;
        const u0 = j / NU, u1 = (j + 1) / NU, um = (u0 + u1) / 2;
        // A diamond: corners at the cell's edge midpoints.
        const pN = node(am, u0), pE = node(a1, um), pS = node(am, u1), pW = node(a0, um);
        for (const [p, q] of [[pN, pE], [pE, pS], [pS, pW], [pW, pN]]) beam(H, 'trim', p, q, 0.28, WHITE);
        // The panel, lit in a wave of colour along the building.
        const t = (Math.sin(i * 0.45) + 1) / 2, col = [CYAN[0] + (MAGENTA[0] - CYAN[0]) * t, CYAN[1] + (MAGENTA[1] - CYAN[1]) * t, CYAN[2] + (MAGENTA[2] - CYAN[2]) * t].map((v) => v * (0.28 + 0.22 * ((i + j) % 2)));
        const c = node(am, um), inset = (p) => [c[0] + (p[0] - c[0]) * 0.62, c[1] + (p[1] - c[1]) * 0.62 + 0.05, c[2] + (p[2] - c[2]) * 0.62];
        const d = [pN, pE, pS, pW].map(inset).map(([a, y, b]) => H.at(a, y, b));
        H.mb.color = col;
        H.mb.triFacing('neon', d[0], d[1], d[2], [0, 1, 0]); H.mb.triFacing('neon', d[0], d[2], d[3], [0, 1, 0]);
        H.mb.triFacing('neon', d[0], d[2], d[1], [0, -1, 0]); H.mb.triFacing('neon', d[0], d[3], d[2], [0, -1, 0]);
      }
      placed.yasHotel = hotel;
      // ---- superyachts in the marina, lit ----
      let yachts = 0;
      const moored = [];
      for (let k = 0; k < 3000 && yachts < 90; k++) {
        const m = marina[Math.floor(R() * marina.length)], t = R() * 6.28, rr = m.r * Math.sqrt(R()) * 0.9;
        const x = m.x + Math.cos(t) * rr, z = m.z + Math.sin(t) * rr, len = 18 + R() * R() * 50, yaw = 0.2 + (R() < 0.7 ? 0 : R() * 3);
        if (!marina.some((w) => Math.hypot(x - w.x, z - w.z) < w.r - len * 0.6) || moored.some(([mx, mz, ml]) => Math.hypot(x - mx, z - mz) < (ml + len) * 0.35 + 3)) continue;
        moored.push([x, z, len]);
        const F = frameAt(x, z, yaw, 0.4);
        yacht(F, R, len);
        F.box('neon', -len * 0.4, len * 0.4, 0.9, 1.05, -len * 0.13 - 0.02, len * 0.13 + 0.02, pick(R, [CYAN, BLUE, MAGENTA, GOLD]).map((v) => v * 0.5));
        yachts++;
      }
      placed.yachts = yachts;
      // ---- floodlight towers round the lap, behind the fences ----
      let masts = 0;
      for (let s = 30; s < L.length; s += 120) {
        const i = Math.floor(s / L.ds) % L.N, side = L.k[i] > 0 ? 'R' : 'L';
        const fr = kit.frontage(s, side, 6);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 5, 5, 0.5, dry);
        if (F) { floodMast(F, R, 34 + R() * 8); masts++; }
      }
      placed.masts = masts;
      // ---- the theme park's red roof to the north, the disc tower, the mosque, the city ----
      const [fx, fz] = img(560, -260);
      redRoof(frameAt(fx, fz, 0.3, terrain.heightAt(fx, fz) - 0.5));
      kit.footprints.push({ cx: fx, cz: fz, ux: 1, uz: 0, hw: 220, hd: 220 });
      const [dx, dz] = img(1250, 200);
      discTower(frameAt(dx, dz, 1.2, terrain.heightAt(dx, dz)));
      kit.footprints.push({ cx: dx, cz: dz, ux: 1, uz: 0, hw: 60, hd: 30 });
      const [mx, mz] = img(-420, 760);
      mosque(frameAt(mx, mz, 0.2, terrain.heightAt(mx, mz)));
      // Hotels, the mall and apartment towers on the island, lit up.
      let towers = 0;
      const b = terrain.bounds;
      for (let z = b.minZ + 40; z < b.maxZ - 40; z += 34) for (let x = b.minX + 40; x < b.maxX - 40; x += 34) {
        const px = x + (R() - 0.5) * 12, pz = z + (R() - 0.5) * 12, d = terrain.distSmooth(px, pz);
        if (d < 60 || d > 650 || !dry(px, pz) || R() < (d < 200 ? 0.55 : 0.35)) continue;
        const W = 18 + R() * 20, D = 16 + R() * 16;
        const F = kit.lot(px, pz, 0, 1, W, D, 4, dry);
        if (!F) continue;
        if (d < 140 && R() < 0.5) podium(F, R, W, D);
        else gulfTower(F, R, W, D, d < 200 ? 6 + Math.floor(R() * 10) : 10 + Math.floor(R() * 34));
        towers++;
      }
      placed.towers = towers;
      // Palms everywhere: along the walls, on the promenades, round the marina.
      let palms = 0;
      for (const side of ['L', 'R']) for (let s = 0; s < L.length; s += 16) {
        const fr = kit.frontage(s, side, 3 + R() * 2);
        if (!kit.isFree(fr.x, fr.z, 1) || !dry(fr.x, fr.z) || kit.overlaps({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 1, hd: 1 })) continue;
        palm(frameAt(fr.x, fr.z, R() * 6.28), R, 7 + R() * 4);
        palms++;
      }
      placed.palms = palms;
    },
    trees: {
      variants: [palm],
      attempts: 5000,
      scale: [1],
      test(x, z, d, h, R) {
        if (d < 14 || wetAt(x, z, 4)) return -1;
        return R() < (d < 120 ? 0.3 : 0.08) ? 0 : -1;
      },
    },
  });
}
