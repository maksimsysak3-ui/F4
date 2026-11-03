import { rgb, scaleC, pick } from '../street/kit.js';
import { standVariety } from './trackside.js';
import { buildRealScene } from './scene.js';
import { cheapBlock } from '../street/buildings.js';
import { palm } from '../street/trees.js';
import { grandstand, yacht } from '../street/props.js';
import { floodMast, beam } from '../night/venue.js';
import { MeshStandardMaterial, DoubleSide, CanvasTexture, SRGBColorSpace } from 'three';
import { MeshBuilder } from '../../car/meshBuilder.js';
import { sponsorAtlas } from '../street/textures.js';

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
  ['FALCON AIRWAYS', '#ffffff', '#b08d3a', '#c9a24a', 'serif'],
  ['FALCON AIRWAYS', '#c9a24a', '#ffffff', '#ffffff', 'serif'],
  ['PEARL BANK', '#ffffff', '#1b2a4a', '#c9a24a', 'serif'],
  ['YAS TELECOM', '#ffffff', '#00a19b', '#00a19b', 'wave'],
  ['DUNE ENERGY', '#ffffff', '#e8a030', '#141416', 'stripes'],
  ['OASIS COLA', '#d8242b', '#ffffff', '#ffffff', 'wave'],
  ['MIRAGE TYRES', '#ffffff', '#141416', '#c9a24a', 'tread'],
  ['SAADIYAT WATCHES', '#c9a24a', '#ffffff', '#ffffff', 'serif'],
];

/** Grandstand in the Yas style: white frame, a mashrabiya lattice screen behind, a sail roof, LED fascia. */
function yasStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: false, style: 'white', seats: [WHITE, rgb(0xe8e4dc), rgb(0xc9a24a)] });
  const depth = tiers * 0.85 + 2, top = 1.2 + tiers * 0.6;
  // Lattice screen: a diamond grid of white struts, lit from behind.
  F.box('stucco', -W / 2, W / 2, 0, top + 6, -depth - 0.8, -depth - 0.5, rgb(0xf2f2f0));
  for (let a = -W / 2; a < W / 2 - 1; a += 2.4) {
    for (let y = 0.6; y < top + 5; y += 2.4) {
      beam(F, 'trim', [a, y, -depth - 0.45], [a + 1.2, y + 1.2, -depth - 0.45], 0.14, WHITE);
      beam(F, 'trim', [a + 1.2, y + 1.2, -depth - 0.45], [a + 2.4, y, -depth - 0.45], 0.14, WHITE);
      F.face('neon', a + 0.9, a + 1.5, y + 0.3, y + 0.9, -depth - 0.49, scaleC(r() < 0.6 ? [2.6, 2.6, 2.4] : GOLD, 0.45));
    }
  }
  // The roof: one long white wave of fabric over the seats, cantilevered from masts at the back.
  const roofY = (a, b) => top + 7 + 2.6 * Math.sin(a * 0.045) + (b + depth) * 0.12;
  F.mb.color = WHITE;
  const NA = Math.max(8, Math.round(W / 6));
  for (let k = 0; k < NA; k++) for (const [b0, b1] of [[-depth - 1, -depth * 0.4], [-depth * 0.4, 4]]) {
    const a0 = -W / 2 - 1 + (k / NA) * (W + 2), a1 = -W / 2 - 1 + ((k + 1) / NA) * (W + 2);
    const p = [F.at(a0, roofY(a0, b0), b0), F.at(a1, roofY(a1, b0), b0), F.at(a1, roofY(a1, b1), b1), F.at(a0, roofY(a0, b1), b1)];
    F.mb.triFacing('fabric', p[0], p[1], p[2], [0, 1, 0]); F.mb.triFacing('fabric', p[0], p[2], p[3], [0, 1, 0]);
    F.mb.triFacing('fabric', p[0], p[2], p[1], [0, -1, 0]); F.mb.triFacing('fabric', p[0], p[3], p[2], [0, -1, 0]);
  }
  for (let a = -W / 2; a <= W / 2 + 0.1; a += 14) {
    beam(F, 'metal', [a, roofY(a, -depth - 1) - 0.2, -depth - 1], [a, roofY(a, -depth - 1) + 3, -depth - 1], 0.25, WHITE);
    F.box('metal', a - 0.25, a + 0.25, 0, roofY(a, -depth - 1) + 0.2, -depth - 1.2, -depth - 0.7, WHITE);
    beam(F, 'metal', [a, roofY(a, -depth - 1) + 3, -depth - 1], [a, roofY(a, 4), 4], 0.12, WHITE); // tie rods
  }
  F.box('neon', -W / 2, W / 2, roofY(0, 4) - 0.6, roofY(0, 4) - 0.45, 3.9, 4.0, [2.6, 2.6, 2.4]); // lit roof edge
  // Pointed Arabic arches along the white back wall, softly lit.
  for (let a = -W / 2 + 3; a < W / 2 - 3; a += 6) {
    F.face('winLit', a - 1.2, a + 1.2, 0.3, 3.2, -depth - 0.81, [1.2, 1.0, 0.7], -1);
    F.mb.color = [1.2, 1.0, 0.7];
    F.mb.triFacing('winLit', F.at(a - 1.2, 3.2, -depth - 0.81), F.at(a + 1.2, 3.2, -depth - 0.81), F.at(a, 4.6, -depth - 0.81), [-F.f[0], 0, -F.f[1]]);
  }
  F.box('neon', -W / 2, W / 2, 1.0, 1.15, 0.13, 0.2, [2.8, 2.8, 2.6]); // white LED line along the front
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
  const H = 4 + floors * 3.4, kind = Math.floor(r() * 9), led = pick(r, [[2.6, 2.6, 2.4], [2.6, 2.6, 2.4], GOLD, CYAN, BLUE]);
  // Skin: dark glass, white-clad, or tinted curtain wall (white, gold, blue-grey).
  const skin = r(), key = skin < 0.4 ? 'glass' : skin < 0.8 ? 'stucco' : 'copper';
  const skinCol = key === 'glass' ? null : key === 'stucco' ? pick(r, [WHITE, rgb(0xe8e4da), rgb(0xf0ece2)]) : pick(r, [rgb(0xd8b870), rgb(0xc9a24a), rgb(0xe0d0a0)]);
  const lvls = Math.max(6, Math.min(30, Math.round(floors / 2)));
  const ys = Array.from({ length: lvls + 1 }, (_, k) => (k / lvls) * H);
  const R0 = Math.min(W, D) / 2;
  let polys;
  if (kind === 0) polys = ys.map((y, k) => ngon(4, R0, R0, (k / lvls) * Math.PI * 0.6 + Math.PI / 4));                       // twisting square
  else if (kind === 1) polys = ys.map((y, k) => ngon(8, R0 * (1 - 0.55 * (k / lvls) ** 1.5), R0 * (1 - 0.55 * (k / lvls) ** 1.5)));  // tapering octagon
  else if (kind === 2) polys = ys.map((y, k) => ngon(10, R0, R0 * 0.7, 0, (k / lvls) ** 1.4 * R0 * 0.9, 0));                  // leaning ellipse
  else if (kind === 3) polys = ys.map((y, k) => { const t = k / lvls, w = R0 * (1.2 - 0.9 * t * t); return [[-w, R0 * 0.6], [w, R0 * 0.6], [w * 0.4, -R0 * (0.9 - 0.5 * t)], [-w * 0.4, -R0 * (0.9 - 0.5 * t)]]; }); // the sail
  else if (kind === 4) polys = ys.map((y, k) => ngon(3, R0 * 1.15, R0 * 1.15, (k / lvls) * 0.9));                           // twisting triangle
  else if (kind === 5) polys = ys.map(() => ngon(4, R0, R0 * 0.8, Math.PI / 4));                                         // diagrid block
  else if (kind === 6) polys = ys.map((y, k) => ngon(4, R0 * (k < lvls * 0.4 ? 1 : k < lvls * 0.75 ? 0.75 : 0.5), R0 * (k < lvls * 0.4 ? 1 : k < lvls * 0.75 ? 0.75 : 0.5), Math.PI / 4)); // stepped setbacks
  else if (kind === 7) polys = ys.map(() => ngon(14, R0, R0));                                                            // round tower
  else polys = ys.map((y, k) => ngon(6, R0 * (0.8 + 0.25 * Math.sin((k / lvls) * Math.PI)), R0 * (0.8 + 0.25 * Math.sin((k / lvls) * Math.PI)))); // bulging hexagon
  loftPoly(F, key, polys, ys, skinCol);
  if (kind === 7) for (let k = 0; k < 14; k += 2) { const P = polys[0][k]; F.box('stucco', P[0] * 1.03 - 0.3, P[0] * 1.03 + 0.3, 0, H, P[1] * 1.03 - 0.3, P[1] * 1.03 + 0.3, WHITE); } // white fins
  // LED floor lines every few levels and up the edges, the lit crown.
  for (let k = 1; k < lvls; k += 2) {
    const P = polys[k].map(([a, b]) => [a * 1.015, b * 1.015]), y = ys[k];
    for (let i = 0; i < P.length; i++) beam(F, 'neon', [P[i][0], y, P[i][1]], [P[(i + 1) % P.length][0], y, P[(i + 1) % P.length][1]], 0.22, scaleC(led, 0.55));
  }
  if (kind === 5 || kind === 6) for (let k = 0; k < lvls; k += 2) for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0]]) {
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
    trackside: { standBuild: yasStand, shirts: SHIRTS, stands: true, suburb: 0, hoardingSpacing: 110, skyline: { count: 140, tall: 150, dir: 3.6, spread: 1.0, depth: 2200, colours: [rgb(0x8aa0c0), rgb(0xa8b8d0), rgb(0xc8c0b0)] } },
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
      runoff: 'brand', runoffFloor: [0.08, 0.08, 0.09], runoffColour: rgb(0x2ab8b0),
      barrier: 'slab', slab: [rgb(0xe8e8ec), rgb(0x1c1c22), [0.6, 2.4, 3.0]],
      fence: true, lamps: 'flood', verge: 'paving',
      sponsors: SPONSORS,
      zoneBrands: ['FALCON AIRWAYS', 'SAADIYAT WATCHES', 'OASIS COLA'],
      primeBrands: ['FALCON AIRWAYS', 'PEARL BANK'],
      title: ['ABU DHABI', 'ABU DHABI GRAND PRIX', '#0a0a1a', '#ffffff', '#7df9ff'],
      bridges: [['FALCON AIRWAYS', 'FLY BEYOND', '#ffffff', '#b08d3a', '#c9a24a'], ['FALCON AIRWAYS', 'ABU DHABI GRAND PRIX', '#c9a24a', '#ffffff', '#ffffff']],
      roadName: 'YAS MARINA',
      bannerGlow: 0.55,
      boardBorder: '#c9a24a',
    },
    fascia: ['ABU DHABI', 'ABU DHABI GRAND PRIX'],
    fasciaColours: ['#0a0a1a', '#ffffff', '#7df9ff'],
    skirtColour: [0.42, 0.38, 0.32],
    groundKind: 'sand',
    relief(x, z, d) {
      return (noise(x * 0.6, z * 0.6) * 4) * smooth(60, 300, d);
    },
    colourAt(x, z, h, slope, d) {
      const sand = [0.78, 0.72, 0.6], lawn = [0.3, 0.46, 0.24], pave = [0.86, 0.86, 0.84];
      if (wetAt(x, z, 6)) return [0.7, 0.68, 0.62];
      // Yas Island: manicured grass verges by the circuit, pale paving round the venue buildings,
      // and otherwise flat desert sand between the roads and the resorts.
      if (d < 35) return lawn;
      if (d < 90) return noise(x * 3, z * 3) > 0.1 ? pave : lawn;
      return noise(x * 0.6, z * 0.6) > 0.55 ? pave : sand;
    },
    water,
    stands: [
      { at: 0, side: 'L', W: 300, tiers: 26, build: yasStand, offset: -60 }, // the Main Grandstand, opposite the pits
      { at: 4, side: 'outside', W: 160, tiers: 22, build: yasStand },     // North Grandstand, T1
      { at: 17, side: 'outside', W: 150, tiers: 22, build: yasStand },    // the hairpin
      { at: 19, side: 'R', W: 220, tiers: 22, build: yasStand },          // West Grandstand, the back straight
      { at: 23, side: 'outside', W: 120, tiers: 18, build: yasStand },    // the chicane
      { at: 33, side: 'outside', W: 140, tiers: 20, build: yasStand },    // South Grandstand, T9
      { at: 45, side: 'L', W: 110, tiers: 16, build: yasStand },          // Marina Grandstand
    ],
    landmarks({ L, R, frameAt, kit, terrain, placed, group }) {
      const ps = (k) => L.pointS(k);
      const dry = (x, z) => !wetAt(x, z, 6);
      // ---- the Yas hotel (W Abu Dhabi): two long, low white buildings on plots either side of the track,
      // a glazed bridge between them high over the road, and the gridshell: a low, flowing veil of
      // diamond panels draped over the whole complex, lit in soft washes of colour ----
      const hs = (ps(53) + ps(55)) / 2, hi = Math.floor(hs / L.ds) % L.N;
      let hotel = 0;
      const towerH = 30;
      for (const side of ['L', 'R']) {
        for (const extra of [6, 12, 20]) {
          const fr = kit.frontage(hs, side, extra);
          const T = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 70, 24, 1, dry);
          if (!T) continue;
          T.box('stucco', -35, 35, 0, towerH, -24, 0, WHITE);
          for (let y = 3.5; y < towerH - 1; y += 3.4) {
            T.face('winLit', -34, 34, y, y + 1.9, 0.02, [1.05, 1.0, 0.92]);           // lit window bands
            T.face('winLit', -34, 34, y, y + 1.9, -24.02, [1.05, 1.0, 0.92], -1);
          }
          T.box('stucco', -35.5, 35.5, towerH, towerH + 0.8, -24.5, 0.5, WHITE);
          hotel++;
          break;
        }
      }
      const cx = L.x[hi], cz = L.z[hi], ry = L.yAt(hi, 0);
      const H = frameAt(cx, cz, Math.atan2(-L.tz[hi], L.tx[hi]), ry); // a along the track, b across it
      const span = Math.max(L.wall.L[hi], L.wall.R[hi]) + 40;
      // The bridge: a slim glazed box on a white deck, 18 m over the road.
      H.box('stucco', -7, 7, 18, 19, -span + 10, span - 10, WHITE);
      H.box('glass', -6.5, 6.5, 19, 23, -span + 10, span - 10, null);
      H.box('neon', -7.1, 7.1, 17.8, 18, -span + 10, span - 10, [1.2, 1.4, 1.6]);
      // The gridshell: height falls to the ends and the outer edges, well clear of the road and the cars.
      const NA = 22, NU = 14, LEN = 120;
      const node = (a, u) => [a, 26 + 12 * Math.sin(Math.PI * u) * Math.sqrt(Math.max(0, 1 - (a / (LEN / 2 + 4)) ** 2)), -span + u * 2 * span];
      for (let i = 0; i < NA; i++) for (let j = 0; j < NU; j++) {
        const a0 = -LEN / 2 + (i / NA) * LEN, a1 = -LEN / 2 + ((i + 1) / NA) * LEN, am = (a0 + a1) / 2;
        const u0 = j / NU, u1 = (j + 1) / NU, um = (u0 + u1) / 2;
        const pN = node(am, u0), pE = node(a1, um), pS = node(am, u1), pW = node(a0, um);
        for (const [p, q] of [[pN, pE], [pE, pS], [pS, pW], [pW, pN]]) beam(H, 'trim', p, q, 0.22, WHITE);
        const t = (Math.sin(i * 0.4 + j * 0.3) + 1) / 2, k = 0.18 + 0.12 * ((i + j) % 2);
        const col = [0.6 + 1.6 * t, 0.9 + 0.6 * (1 - t), 1.6 + 0.4 * t].map((v) => v * k);
        const c = node(am, um), inset = (p) => [c[0] + (p[0] - c[0]) * 0.7, c[1] + (p[1] - c[1]) * 0.7, c[2] + (p[2] - c[2]) * 0.7];
        const d = [pN, pE, pS, pW].map(inset).map(([a, y, b]) => H.at(a, y, b));
        H.mb.color = col;
        H.mb.triFacing('neon', d[0], d[1], d[2], [0, 1, 0]); H.mb.triFacing('neon', d[0], d[2], d[3], [0, 1, 0]);
        H.mb.triFacing('neon', d[0], d[2], d[1], [0, -1, 0]); H.mb.triFacing('neon', d[0], d[3], d[2], [0, -1, 0]);
      }
      // Shell legs down to the ground on the plots, never on the road.
      for (const a of [-LEN / 2, -LEN / 4, 0, LEN / 4, LEN / 2]) for (const b of [-span, span]) beam(H, 'trim', [a, 0, b], node(a, b < 0 ? 0 : 1), 0.5, WHITE);
      placed.yasHotel = hotel;
      // ---- the arena by the marina: a long, low hall wrapped in white fins rising and falling like dunes ----
      {
        const fr = kit.frontage(ps(47), 'R', 45);
        const AR = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 150, 70, 3, dry);
        if (AR) {
          AR.box('stucco', -73, 73, 0, 18, -68, -2, rgb(0x2a2c34));
          for (let a = -75; a <= 75; a += 1.6) {
            const h = 20 + 7 * Math.sin(a * 0.05) + 3 * Math.sin(a * 0.17);
            AR.box('stucco', a - 0.35, a + 0.35, 0, h, -1.8, 0, WHITE);
            if (Math.round(a / 1.6) % 3 === 0) AR.box('neon', a - 0.1, a + 0.1, 1, h - 1, 0.01, 0.08, [2.4, 2.4, 2.6]);
          }
          placed.arena = 1;
        }
      }
      // ---- overhead gantries: white square frames spanning the track with gold-and-white boards and white lights ----
      // Each board carries one sponsor written once, centred: gold lettering on white, or white on gold.
      const ARCH = [['ETIHAD AIRWAYS', '#f4f2ec', '#a8842e'], ['ALDAR', '#b8923a', '#ffffff'], ['ETIHAD AIRWAYS ABU DHABI GRAND PRIX', '#f4f2ec', '#1b2a4a'], ['ADNOC', '#0047ba', '#ffffff']];
      const bc = document.createElement('canvas'); bc.width = 1024; bc.height = 256 * ARCH.length;
      const bg = bc.getContext('2d');
      ARCH.forEach(([name, back, ink], k) => {
        const y = (ARCH.length - 1 - k) * 256;
        bg.fillStyle = back; bg.fillRect(0, y, 1024, 256);
        bg.strokeStyle = ink; bg.globalAlpha = 0.5; bg.lineWidth = 6; bg.strokeRect(14, y + 14, 996, 228); bg.globalAlpha = 1;
        bg.fillStyle = ink; bg.font = '700 118px Georgia, serif'; bg.textAlign = 'center'; bg.textBaseline = 'middle';
        bg.fillText(name, 512, y + 132, 940);
      });
      const atlas = { tex: new CanvasTexture(bc), rows: ARCH.length }, boards = new MeshBuilder();
      atlas.tex.colorSpace = SRGBColorSpace; atlas.tex.anisotropy = 8;
      let arches = 0;
      for (let s = 180; s < L.length - 120; s += 820) { // a handful round the lap, on the straights
        const i = Math.floor(s / L.ds) % L.N;
        if (Math.abs(s - hs) < 120 || Math.abs(L.k[i]) > 1 / 300) continue;
        const A = frameAt(L.x[i], L.z[i], Math.atan2(-L.tz[i], L.tx[i]), L.yAt(i, 0));
        const left = L.nx[i] * -L.tz[i] + L.nz[i] * L.tx[i] >= 0;
        const bl = (left ? L.wall.L[i] : L.wall.R[i]) + 1.5, br = -((left ? L.wall.R[i] : L.wall.L[i]) + 1.5);
        const span = bl - br, mid = (bl + br) / 2, top = 13;
        // A square gantry: two white box columns, a deep white box beam across, the board flush on its face.
        for (const b of [bl, br]) {
          A.box('stucco', -1.2, 1.2, 0, top + 1.6, b - 1.2, b + 1.2, WHITE);
          A.box('neon', -1.25, 1.25, 1, top, b - 0.08, b + 0.08, [1.3, 1.3, 1.2]); // white light strip up each column
        }
        A.box('stucco', -1.2, 1.2, top - 4.2, top + 1.6, br - 1.2, bl + 1.2, WHITE);
        const bw = span - 3, y0 = top - 3.6, y1 = top + 1.0, row = arches % ARCH.length;
        const v0 = row / atlas.rows + 0.004, v1 = (row + 1) / atlas.rows - 0.004;
        for (const [a, flip] of [[1.22, false], [-1.22, true]]) {
          const p = [A.at(a, y0, mid - bw / 2), A.at(a, y0, mid + bw / 2), A.at(a, y1, mid + bw / 2), A.at(a, y1, mid - bw / 2)];
          const u0 = flip ? 1 : 0, u1 = flip ? 0 : 1; // the name once across the span
          boards.quadUV('board', p[0], p[1], p[2], p[3], [u0, v0], [u1, v0], [u1, v1], [u0, v1]);
          A.box('trim', a > 0 ? 1.2 : -1.3, a > 0 ? 1.3 : -1.2, y0 - 0.3, y0 - 0.1, br - 1.2, bl + 1.2, rgb(0xc9a24a)); // gold trim
          A.box('neon', a > 0 ? 1.2 : -1.35, a > 0 ? 1.35 : -1.2, top - 4.3, top - 4.2, br, bl, [1.4, 1.4, 1.3]); // white lights under the beam
        }
        arches++;
      }
      group.add(boards.build({ board: new MeshStandardMaterial({ map: atlas.tex, emissive: 0xffffff, emissiveMap: atlas.tex, emissiveIntensity: 0.3, roughness: 0.5, side: DoubleSide }) }));
      placed.arches = arches;
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
      void discTower;
      kit.footprints.push({ cx: dx, cz: dz, ux: 1, uz: 0, hw: 60, hd: 30 });
      const [mx, mz] = img(-420, 760);
      mosque(frameAt(mx, mz, 0.2, terrain.heightAt(mx, mz)));
      // Hotels, the mall and apartment towers on the island, lit up.
      let towers = 0;
      const b = terrain.bounds;
      for (let z = b.minZ + 40; z < b.maxZ - 40; z += 34) for (let x = b.minX + 40; x < b.maxX - 40; x += 34) {
        const px = x + (R() - 0.5) * 12, pz = z + (R() - 0.5) * 12, d = terrain.distSmooth(px, pz);
        if (d < 60 || d > 650 || !dry(px, pz) || R() < (d < 250 ? 0.85 : 0.8)) continue; // spread out, with desert between
        const W = 18 + R() * 20, D = 16 + R() * 16;
        const F = kit.lot(px, pz, 0, 1, W, D, 4, dry);
        if (!F) continue;
        // Yas Island is low-rise: white and sand resort hotels, apartments and villas round the circuit;
        // only far out, towards the city, the odd tower.
        if (d < 140 && R() < 0.4) podium(F, R, W, D);
        else if (d < 450 || R() < 0.75) cheapBlock(F, R, W, D, 3 + Math.floor(R() * (d < 250 ? 5 : 9)), { wall: pick(R, [WHITE, rgb(0xf0e8d8), rgb(0xe8dcc4), rgb(0xf4f0e8)]), style: R() < 0.6 ? 'stucco' : 'sand', flat: true, trim: rgb(0xd8c8a8) });
        else gulfTower(F, R, W, D, 12 + Math.floor(R() * 26));
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
