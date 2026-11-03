import { rgb, scaleC, pick } from '../street/kit.js';
import { standVariety } from './trackside.js';
import { buildRealScene } from './scene.js';
import { cheapBlock } from '../street/buildings.js';
import { palm } from '../street/trees.js';
import { grandstand } from '../street/props.js';
import { marquees, bigScreen } from './silverstoneScene.js';
import { beam } from '../night/venue.js';
import { createDaySkyline, skin, ngon, rect } from './sgCity.js';
import { sub, VEHICLES } from '../backstageProps.js';
import { MeshBuilder } from '../../car/meshBuilder.js';

/*
 * Melbourne, handcrafted. Albert Park: the circuit runs on the park roads round the lake, its island
 * of trees in the middle, river red gums and sugar gums everywhere with their pale trunks and loose
 * olive crowns, rows of Canary Island palms along Lakeside Drive, the golf course on the east side.
 * At Turn 3 the red-brick Victorian Institute of Sport building with its arched windows under a red
 * roof; the pit building on the straight; temporary steel stands; concrete walls and high debris
 * fences; the terrace houses of Albert Park and Middle Park to the south, and to the north, across
 * the lake, the towers of the CBD and Southbank: Australia 108, the gold-crowned Eureka Tower.
 */

const WHITE = rgb(0xf4f4f2), GREEN = rgb(0x00843d), YELLOW = rgb(0xffcd00), STEEL = rgb(0x8a929e);
const SHIRTS = [GREEN, YELLOW, rgb(0xff8000), WHITE, rgb(0x1b1b1f), rgb(0x00a19b), rgb(0x1f4f9a), rgb(0xd8242b)];

function apStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: true, style: 'steel', seats: [rgb(0x3a2a6a), rgb(0x4a3a8a), rgb(0x2a2a30)] });
  return { ...gs, shirts: SHIRTS };
}
const VARIED = standVariety(apStand, null, SHIRTS);

/** A gum tree: a pale, forking trunk and loose clumps of olive leaves, irregular and open. */
export function gum(F, r) {
  const h = 14 + r() * 10, bark = pick(r, [rgb(0xd8d0c0), rgb(0xc8beb0), rgb(0xb8b0a4)]);
  const fork = [(r() - 0.5) * 2, h * (0.45 + r() * 0.15), (r() - 0.5) * 2];
  beam(F, 'stucco', [0, 0, 0], fork, 0.55, bark);
  const n = 3 + Math.floor(r() * 3);
  for (let k = 0; k < n; k++) {
    const t = (k / n) * 6.283 + r(), reach = 2.5 + r() * 4;
    const tip = [fork[0] + Math.cos(t) * reach, h * (0.75 + r() * 0.25), fork[2] + Math.sin(t) * reach];
    beam(F, 'stucco', fork, tip, 0.25, bark);
    for (let q = 0; q < 2; q++) F.blob('leaf', tip[0] + (r() - 0.5) * 2, tip[2] + (r() - 0.5) * 2, 2.2 + r() * 1.6, tip[1] - 1.5, tip[1] + 1.5 + r(), 6, pick(r, [rgb(0x5a6a3a), rgb(0x4e5e34), rgb(0x6a7444), rgb(0x56663e)]));
  }
}

/** Canary Island date palm: a thick, diamond-patterned trunk and a dense round crown. */
function canaryPalm(F, r) {
  const h = 8 + r() * 5;
  F.cylinder('stucco', 0, 0, 0.55, 0, h, 8, rgb(0x6a5a44));
  palm(F, r, h);
}

/** The Victorian Institute of Sport building: red brick, arched windows, a red hipped roof on brackets. */
function visBuilding(F, W, D) {
  const BRICK = rgb(0x9a4a32), PIER = rgb(0x8a3e2a), CREAM = rgb(0xe8dcc0), ROOF = rgb(0xa8382a), H = 14;
  F.box('stucco', -W / 2, W / 2, 0, H, -D, 0, BRICK);
  F.box('stucco', -W / 2 - 0.2, W / 2 + 0.2, 0, 0.9, -D - 0.2, 0.2, CREAM);            // plinth
  F.box('stucco', -W / 2 - 0.15, W / 2 + 0.15, 6.4, 7.0, -D - 0.15, 0.15, CREAM);      // string course
  F.box('stucco', -W / 2 - 0.15, W / 2 + 0.15, 12.9, 13.4, -D - 0.15, 0.15, CREAM);    // cornice band
  for (let a = -W / 2; a <= W / 2 + 0.01; a += 7) F.box('stucco', a - 0.45, a + 0.45, 0.9, H, -0.1, 0.35, PIER); // brick piers
  for (let a = -W / 2 + 3.5; a < W / 2 - 1; a += 7) {
    // upper floor: tall arched window in a cream surround, a keystone, louvred hood
    F.box('stucco', a - 2.3, a + 2.3, 7.6, 11.6, 0, 0.12, CREAM);
    F.face('glass', a - 1.8, a + 1.8, 7.9, 11.4, 0.13, null);
    F.blob('stucco', a, 0.06, 2.3, 10.8, 12.7, 10, CREAM);
    F.box('stucco', a - 0.3, a + 0.3, 12.1, 12.8, 0, 0.25, CREAM);
    for (let y = 8.3; y < 11.3; y += 0.5) F.box('trim', a - 1.7, a + 1.7, y, y + 0.08, 0.14, 0.3, rgb(0x5a6a5a)); // louvres
    // ground floor: two sash windows with cream sills and heads
    for (const o of [-1.4, 1.4]) { F.face('glass', a + o - 0.8, a + o + 0.8, 1.6, 5.0, 0.02, null); F.box('stucco', a + o - 1.0, a + o + 1.0, 1.4, 1.6, 0, 0.25, CREAM); F.box('stucco', a + o - 1.0, a + o + 1.0, 5.0, 5.4, 0, 0.2, CREAM); }
  }
  // the deep eaves on timber brackets, the red hipped roof
  for (let a = -W / 2 + 1; a < W / 2; a += 3.5) beam(F, 'trim', [a, 13.4, 0], [a, 14.6, 2.2], 0.12, WHITE);
  F.box('stucco', -W / 2 - 2.4, W / 2 + 2.4, 14.5, 15, -D - 2.4, 2.4, WHITE);
  F.block('roof', [[-W / 2 - 2.4, 2.4], [W / 2 + 2.4, 2.4], [W / 2 + 2.4, -D - 2.4], [-W / 2 - 2.4, -D - 2.4]], [[-W / 2 + 5, -D / 2], [W / 2 - 5, -D / 2], [W / 2 - 5, -D / 2], [-W / 2 + 5, -D / 2]], 15, 21, ROOF);
  // the sign: VICTORIAN INSTITUTE OF SPORT on the string course
  F.box('trim', -9, 9, 6.0, 6.9, 0.18, 0.32, rgb(0x1b1b1f));
  F.face('neon', -8.8, 8.8, 6.15, 6.75, 0.33, [1.5, 1.5, 1.5]);
  // the white wing beside it, with its stepped (Dutch) parapet
  F.box('stucco', W / 2 + 2.6, W / 2 + 18, 0, 8, -D + 4, -1, rgb(0xeae6dc));
  for (let k = 0; k < 4; k++) F.box('stucco', W / 2 + 2.6 + k * 1.6, W / 2 + 18 - k * 1.6, 8 + k * 1.1, 9.1 + k * 1.1, -D + 4, -1, rgb(0xeae6dc));
  for (let a = W / 2 + 5; a < W / 2 + 17; a += 3.5) F.face('glass', a - 0.9, a + 0.9, 2, 5.5, -0.98, null);
}

/**
 * A Victorian terrace house (front at b = 0): a decorated parapet with a pediment hiding the
 * corrugated-iron roof, a chimney, the front door with its fanlight and a tall window, the verandah
 * on cast-iron posts with an iron-lace frieze and a bullnose roof, a tiled path, a picket fence and
 * a garden shrub; some are two storeys with a lace balcony. W: frontage (they stand wall to wall).
 */
function terrace(F, r, W, D, two) {
  const wall = pick(r, [rgb(0x9a5a3a), rgb(0xa8644a), rgb(0xe8dcc8), rgb(0xd0c4b0), rgb(0xc8d0c8), rgb(0xe0d0b8), rgb(0xb8c4d0)]);
  const trim = pick(r, [WHITE, rgb(0xe8e0cc), rgb(0x2a3a2a), rgb(0x6a2a24)]), iron = pick(r, [rgb(0x1b1b1f), WHITE, rgb(0x2a4030)]);
  const roof = pick(r, [rgb(0x8a8e94), rgb(0x8a3a2a), rgb(0x5a6a5a)]), H = two ? 7.4 : 4.4, B = -3.2; // facade set back behind the verandah
  F.box('stucco', -W / 2, W / 2, 0, H, -D, B, wall);
  F.block('roof', [[-W / 2, B], [W / 2, B], [W / 2, -D], [-W / 2, -D]], [[-W / 2, (B - D) / 2], [W / 2, (B - D) / 2], [W / 2, (B - D) / 2], [-W / 2, (B - D) / 2]], H, H + 2.6, roof);
  F.box('stucco', -W / 2, W / 2, H, H + 1.0, B - 0.3, B, wall);                       // the parapet
  F.box('stucco', -W / 2, W / 2, H + 0.95, H + 1.15, B - 0.35, B + 0.08, trim);       // its cornice
  F.block('stucco', [[-1.3, B + 0.05], [1.3, B + 0.05], [1.3, B - 0.3], [-1.3, B - 0.3]], [[0, B + 0.05], [0, B + 0.05], [0, B - 0.3], [0, B - 0.3]], H + 1.15, H + 2.1, trim); // pediment
  for (const a of [-W / 2 + 0.3, W / 2 - 0.3]) F.box('stucco', a - 0.25, a + 0.25, H + 1.0, H + 1.6, B - 0.3, B + 0.1, trim); // urns
  F.box('stucco', W / 2 - 1.3, W / 2 - 0.3, H, H + 3.6, (B - D) / 2 - 0.5, (B - D) / 2 + 0.5, rgb(0x8a4a32)); // chimney
  // the front: door + fanlight, a tall window (a bay on some)
  F.face('trim', -W / 2 + 0.5, -W / 2 + 1.5, 0.2, 2.4, B + 0.02, pick(r, [rgb(0x2a3a5a), rgb(0x6a2a24), rgb(0x2a4a30), rgb(0x1b1b1f)]));
  F.face('glass', -W / 2 + 0.5, -W / 2 + 1.5, 2.5, 3.0, B + 0.02, null);
  if (r() < 0.4) { F.box('stucco', -W / 2 + 2.2, W / 2 - 0.5, 0, 3.3, B, B + 0.9, wall); F.face('glass', -W / 2 + 2.5, W / 2 - 0.8, 0.9, 2.9, B + 0.92, null); }
  else { F.face('glass', -W / 2 + 2.4, W / 2 - 0.7, 0.9, 3.1, B + 0.02, null); F.box('stucco', -W / 2 + 2.2, W / 2 - 0.5, 0.75, 0.9, B, B + 0.2, trim); }
  if (two) {
    for (const [a0, a1] of [[-W / 2 + 0.6, -W / 2 + 1.6], [-W / 2 + 2.4, W / 2 - 0.7]]) F.face('glass', a0, a1, 4.6, 6.8, B + 0.02, null);
    F.box('stucco', -W / 2, W / 2, 4.1, 4.3, B, 0, trim);                             // balcony floor
    F.box('trim', -W / 2, W / 2, 4.3, 5.2, -0.1, 0, iron);                            // lace balustrade
  }
  // the verandah
  F.box('stucco', -W / 2, W / 2, 0, 0.25, B, 0, rgb(0x8a6a5a));                        // tiled floor
  const vh = two ? 7.0 : 2.9;
  for (const a of [-W / 2 + 0.15, W / 2 - 0.15]) F.box('metal', a - 0.07, a + 0.07, 0, vh, -0.2, -0.06, iron);
  F.box('trim', -W / 2, W / 2, 2.55, 2.9, -0.2, -0.05, iron);                         // the iron-lace frieze
  for (let a = -W / 2 + 0.9; a < W / 2 - 0.4; a += 1.4) F.box('trim', a - 0.4, a + 0.4, 2.62, 2.83, -0.21, -0.2, wall); // its pierced pattern
  F.mb.color = roof;
  F.mb.quad('roof', F.at(-W / 2, vh + 0.45, B), F.at(W / 2, vh + 0.45, B), F.at(W / 2, vh, -0.05), F.at(-W / 2, vh, -0.05)); // bullnose roof
  F.mb.color = null;
  // front garden: path, picket fence, a gate, a shrub
  F.box('stucco', -W / 2 + 0.4, -W / 2 + 1.6, 0, 0.05, 0, 2.4, rgb(0x8a5a4a));
  for (let a = -W / 2 + 1.8; a < W / 2; a += 0.9) F.box('trim', a - 0.05, a + 0.05, 0, 1.0, 2.4, 2.46, trim);
  F.box('trim', -W / 2 + 1.7, W / 2, 0.2, 0.3, 2.38, 2.48, trim);
  F.box('trim', -W / 2 + 1.7, W / 2, 0.75, 0.85, 2.38, 2.48, trim);
  F.blob('leaf', W / 2 - 1.4, 1.2, 0.9, 0, 1.6, 6, pick(r, [rgb(0x2a4a24), rgb(0x3a5a2a)]));
}

/**
 * A Melbourne tower in daylight: curtain-wall skin over the shape, a pale frame where the type has
 * one, a dark roof and plant. type: slab | setback | oval | round | concrete.
 */
function dayTower(S, F, r, type, W, D, H, key) {
  const cz = -D / 2, frame = rgb(0xd8dce0);
  const lid = (p, y) => { const cx = p.reduce((t, q) => t + q[0], 0) / p.length, cc = p.reduce((t, q) => t + q[1], 0) / p.length; F.mb.color = rgb(0x3a3e44); for (let i = 0; i < p.length; i++) F.mb.triFacing('stucco', F.at(cx, y, cc), F.at(p[i][0], y, p[i][1]), F.at(p[(i + 1) % p.length][0], y, p[(i + 1) % p.length][1]), [0, 1, 0]); F.mb.color = null; };
  if (type === 'oval' || type === 'round') {
    const p = ngon(type === 'oval' ? 16 : 20, W / 2, (type === 'oval' ? D : W) / 2, 0, 0, cz);
    skin(S, F, key, p, 0, H, r); lid(p, H);
    F.cylinder('metal', 0, cz, Math.min(W, D) * 0.3, H, H + 4, 10, rgb(0x6a6e74));
  } else if (type === 'setback') {
    let w = W, d = D, y = 0;
    for (const f of [0.6, 0.25, 0.15]) { const p = rect(w, d, 0, cz); skin(S, F, key, p, y, y + H * f, r); lid(p, y + H * f); y += H * f; w *= 0.8; d *= 0.8; }
  } else {
    const p = rect(W, D, 0, cz);
    skin(S, F, type === 'concrete' ? 'sgConc' : key, p, 0, H, r); lid(p, H);
    if (type === 'slab' && r() < 0.5) for (const [a, b] of p) beam(F, 'stucco', [a, 0, b], [a, H, b], 0.5, frame); // pale corner frame
    F.box('metal', -W / 4, W / 4, H, H + 3.5, cz - D / 4, cz + D / 4, rgb(0x6a6e74));
  }
}

export function buildAustraliaScene(L) {
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const noise = (x, z) => Math.sin(x * 0.013 + 0.3) * Math.cos(z * 0.011 + 0.8) * 0.6 + Math.sin(x * 0.033 - z * 0.027) * 0.4;
  const img = (px, py) => L.fromImage(px, py);
  const [ox, oz] = img(0, 0), ipx = (x) => (x - ox) / 1.9413, ipz = (z) => (z - oz) / 1.9413;
  // Albert Park Lake fills the middle of the loop: discs packed by clearance from the circuit, so it
  // runs long and curving between the two sides, leaving a band of park round the track.
  const cl = [];
  for (let i = 0; i < L.N; i += 3) cl.push([L.x[i], L.z[i]]);
  const clearance = (x, z) => { let m = 1e9; for (const [a, b] of cl) m = Math.min(m, Math.hypot(a - x, b - z)); return m; };
  const water = [];
  for (let pass = 0; pass < 2; pass++) for (let py = 180; py < 560; py += 10) for (let px = 60; px < 720; px += 10) {
    const [x, z] = img(px, py), r = Math.min(clearance(x, z) - 70, 170);
    if (r < (pass ? 28 : 60) || water.some((w) => Math.hypot(x - w.x, z - w.z) < w.r * 0.78)) continue;
    // inside the loop only: the circuit must lie on all four sides
    let sides = 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let t = 40; t < 900; t += 20) if (clearance(x + dx * t, z + dz * t) < 15) { sides++; break; }
    if (sides < 4) continue;
    water.push({ x, z, r, y: 0.2, margin: 0, depth: 4, colour: 0x3a6a72 });
  }
  const wetAt = (x, z, pad = 0) => water.some((w) => Math.hypot(x - w.x, z - w.z) < w.r + pad);
  const big = water.reduce((m, w) => (w.r > m.r ? w : m), water[0]), ix = big.x, iz = big.z; // the island, in the widest part
  const golf = (x, z) => { const a = ipx(x), b = ipz(z); return a > 700 && a < 1000 && b > 420 && b < 560; };
  const south = (x, z) => ipz(z) > 700; // the suburbs beyond Aughtie Drive and Albert Road
  const CBD = img(-300, 380), inCBD = (x, z) => Math.abs(x - CBD[0]) < 420 && Math.abs(z - CBD[1]) < 260;

  return buildRealScene(L, {
    name: 'Australia',
    seed: 1996,
    life: { paddock: true, parks: 10, villages: true },
    margin: 750,
    trackside: { standBuild: apStand, shirts: SHIRTS, suburb: 0, standSpacing: 240, hoardingSpacing: 110, keepOut: (x, z) => wetAt(x, z, 8), skyline: { count: 0 } },
    pitTheme: {
      wall: rgb(0xeceae6),
      upper(F, hw, i, rc, { H1, DEPTH }) {
        const top = H1 + 3.8;
        F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -1.0, WHITE);
        F.face(i % 3 === 0 ? 'winLit' : 'glass', -hw + 0.3, hw - 0.3, H1 + 0.4, top - 0.4, -0.98, [1.0, 1.05, 1.1]);
        F.box('trim', -hw, hw, top, top + 0.4, -DEPTH, 1.5, GREEN);
        if (rc) F.box('stucco', -hw + 0.5, hw - 0.5, top + 0.4, top + 5, -DEPTH + 1, -1.2, WHITE);
      },
    },
    style: {
      kerb: [GREEN, YELLOW],
      runoff: 'brand', runoffFields: 2, runoffBoth: 0, runoffFloor: [0.11, 0.115, 0.12],
      barrier: 'jersey', fence: true, fenceTop: 4.8, lamps: 'none', verge: 'grass',
      title: ['MELBOURNE', 'AUSTRALIAN GRAND PRIX', '#012169', '#ffffff', '#00843d'],
      roadName: 'MELBOURNE',
      bannerGlow: 0.12,
      boardBorder: '#00843d',
    },
    fascia: ['ALBERT PARK', 'AUSTRALIAN GRAND PRIX'],
    fasciaColours: ['#012169', '#ffffff', '#00843d'],
    skirtColour: [0.26, 0.38, 0.2],
    groundKind: 'grass',
    relief(x, z, d) { return noise(x, z) * 1.2 * smooth(40, 200, d); },
    colourAt(x, z, h, slope, d) {
      if (wetAt(x, z, 10)) return [0.62, 0.6, 0.52];           // the lakeside path
      if (golf(x, z)) return noise(x * 4, z * 4) > 0.5 ? [0.72, 0.68, 0.48] : [0.32, 0.56, 0.22]; // fairways and bunkers
      if (south(x, z)) return [0.42, 0.42, 0.4];
      return noise(x * 2, z * 2) > 0.4 ? [0.44, 0.5, 0.26] : [0.34, 0.5, 0.22];  // Melbourne's dry-summer grass
    },
    water,
    stands: [
      { at: 0, side: 'R', W: 260, tiers: 20, build: apStand, offset: -40 },  // Fangio, opposite the pits
      { at: 4, side: 'outside', W: 160, tiers: 18, build: apStand },        // Jones, T1
      { at: 7, side: 'outside', W: 120, tiers: 16, build: apStand },        // Brabham, T2
      { at: 13, side: 'outside', W: 110, tiers: 16, build: VARIED },         // Clark, T3
      { at: 25, side: 'outside', W: 100, tiers: 14, build: VARIED },         // Hill, T6
      { at: 42, side: 'outside', W: 120, tiers: 16, build: apStand },       // Waite, T11-T12
      { at: 50, side: 'outside', W: 110, tiers: 14, build: VARIED },         // T13
      { at: 59, side: 'outside', W: 110, tiers: 14, build: VARIED },         // Prost, the last corners
    ],
    landmarks({ L, R, frameAt, kit, terrain, placed, group }) {
      const ps = (k) => L.pointS(k);
      // ---- the Victorian Institute of Sport: right behind the fence on the approach to T3, as seen from the cars ----
      for (const [k, extra] of [[10, 1.5], [10, 4], [9, 2], [11, 2], [9, 6]]) {
        const fr = kit.frontage(ps(k), 'R', extra);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 76, 26, 1, (a, b) => !wetAt(a, b, 4));
        if (F) { visBuilding(sub(F, -8, 0), 56, 26); placed.vis = k; break; }
      }
      // ---- the island: a clump of gums ----
      for (let k = 0; k < 14; k++) { const t = R() * 6.28, rr = R() * 24; gum(frameAt(ix + Math.cos(t) * rr, iz + Math.sin(t) * rr, R() * 6.28, 0.6), R); }
      frameAt(ix, iz, 0, 0).cylinder('stucco', 0, 0, 34, -1, 0.7, 20, rgb(0x5a6a3a));
      // ---- palms along Lakeside Drive and by the lake ----
      let palms = 0;
      for (let s = ps(17); s < ps(40); s += 22) for (const side of ['L', 'R']) {
        const fr = kit.frontage(s, side, 4 + R() * 3);
        if (!kit.isFree(fr.x, fr.z, 1.5) || wetAt(fr.x, fr.z, 2) || kit.overlaps({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 1.5, hd: 1.5 })) continue;
        canaryPalm(frameAt(fr.x, fr.z, R() * 6.28), R); palms++;
      }
      // ---- marquees and screens ----
      for (const k of [3, 14, 26, 44, 56]) {
        const s = ps(k), side = L.k[Math.floor(s / L.ds) % L.N] > 0 ? 'R' : 'L';
        const fr = kit.frontage(s, side, 26 + R() * 10);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 56, 28, 3, (a, b) => !wetAt(a, b, 4));
        if (F) marquees(F, R, 56, 28);
        const g = kit.frontage(s + 30, side, 4), G = kit.lot(g.x, g.z, g.dirX, g.dirZ, 13, 2, 1, null);
        if (G) bigScreen(G);
      }
      // ---- the terrace streets of Albert Park and Middle Park: pairs of rows facing each other across
      // a street with footpaths, plane trees and parked cars ----
      let houses = 0;
      const b = terrain.bounds, ROW = 15, STREET = 13;
      const streets = new MeshBuilder();
      for (let zs = b.minZ + 20; zs < b.maxZ; zs += 2 * (ROW + STREET / 2) + 4) {
        for (let x = b.minX; x < b.maxX; x += 8.4) {
          for (const [dir, z] of [[1, zs - STREET / 2], [-1, zs + STREET / 2]]) {
            if (!south(x, z) || terrain.distSmooth(x, z) < 110 || terrain.distSmooth(x, z) > 480) continue;
            if (Math.floor(x / 120) % 6 === 5) continue; // cross streets
            const F = kit.lot(x, z, 0, dir, 8.2, ROW, 0.05, null);
            if (F) { terrace(F, R, 8.2, ROW, R() < 0.3); houses++; }
          }
          // the street: kerbs and plane trees on the footpaths, cars parked along both sides
          if (!south(x, zs) || terrain.distSmooth(x, zs) < 120 || terrain.distSmooth(x, zs) > 470 || Math.floor(x / 120) % 6 === 5) continue;
          const S0 = frameAt(x, zs, 0, terrain.heightAt(x, zs));
          S0.box('concrete', -4.2, 4.2, -0.3, 0.04, -3.6, 3.6, rgb(0x3a3c40));
          if (Math.round(x / 8.4) % 3 === 0) for (const sd of [-1, 1]) {
            const t = frameAt(x, zs + sd * 5.4, R() * 6.28, terrain.heightAt(x, zs));
            beam(t, 'stucco', [0, 0, 0], [0, 4.5, 0], 0.3, rgb(0x8a8270));
            for (let q = 0; q < 3; q++) t.blob('leaf', (R() - 0.5) * 3, (R() - 0.5) * 3, 2.6, 4, 8, 7, pick(R, [rgb(0x3a5a2a), rgb(0x4a6a32)]));
          }
          if (R() < 0.55) VEHICLES.car(sub(S0, 0, (R() < 0.5 ? -1 : 1) * 2.6, Math.PI / 2), pick(R, [rgb(0xf2f2ee), rgb(0x1b1b1f), rgb(0x8a929e), rgb(0x2a4a8a), rgb(0x9a1c1c), rgb(0xc8c0a8)]), 'stucco');
        }
      }
      void streets;
      // ---- the CBD and Southbank across the lake to the north, in sunlit glass ----
      const SK = createDaySkyline();
      const [cx, cz] = [CBD[0], CBD[1]]; // ahead of the cars on the run to T3, as in the photographs
      const at = (dx, dz) => frameAt(cx + dx, cz + dz, 0, terrain.heightAt(cx + dx, cz + dz) - 1);
      { // Australia 108: slim, dark blue glass, the gold-and-white starburst cantilevered at ~70%, a narrower top
        const F = at(0, 0);
        skin(SK, F, 'sgDark', rect(34, 30, 0, -15), 0, 220, R);
        skin(SK, F, 'sgDark', rect(28, 26, 0, -15), 220, 317, R);
        F.box('stucco', -22, 22, 214, 222, -36, 6, rgb(0xe8e2d0));
        F.box('copper', -21, 21, 216, 220, -35, 5, rgb(0xc8a24a));
        F.box('metal', -10, 10, 317, 321, -25, -5, rgb(0x5a5e66));
      }
      { // Eureka Tower: blue glass, the top in gold, the red stripe up one face, the stepped top
        const F = at(150, 70);
        skin(SK, F, 'sgBlue', rect(36, 32, 0, -16), 0, 225, R);
        skin(SK, F, 'sgGold', rect(36, 32, 0, -16), 225, 280, R);
        skin(SK, F, 'sgGold', rect(26, 22, 4, -16), 280, 297, R);
        F.box('trim', -3, -1.5, 0, 280, 0, 0.4, rgb(0xc8202a));
      }
      { // Prima Pearl and the round Southbank towers beside them
        dayTower(SK, at(95, 120), R, 'oval', 40, 26, 254, 'sgBlue');
        dayTower(SK, at(-120, 60), R, 'round', 36, 36, 210, 'sgTeal');
      }
      dayTower(SK, at(-70, -90), R, 'setback', 40, 34, 251, 'sgGrey');     // Rialto
      dayTower(SK, at(60, -140), R, 'slab', 36, 34, 265, 'sgGrey');       // 120 Collins
      dayTower(SK, at(-200, -40), R, 'slab', 44, 30, 230, 'sgDark');
      for (let k = 0; k < 90; k++) {
        const dx = (R() - 0.5) * 760, dz = (R() - 0.5) * 420, H = 55 + R() * R() * 190;
        if (Math.hypot(dx, dz) < 70 || Math.hypot(dx - 150, dz - 70) < 50) continue;
        const type = pick(R, ['slab', 'slab', 'setback', 'oval', 'concrete', 'concrete', 'round']);
        dayTower(SK, at(dx, dz), R, type, 24 + R() * 22, 22 + R() * 18, H, pick(R, ['sgBlue', 'sgTeal', 'sgGrey', 'sgDark', 'sgGrey']));
      }
      group.add(SK.build());
      placed.australia = { palms, houses };
      void scaleC; void STEEL;
    },
    trees: {
      variants: [gum, palm],
      attempts: 22000,
      scale: [1, 1],
      test(x, z, d, h, R) {
        if (d < 16 || wetAt(x, z, 8) || south(x, z) || inCBD(x, z)) return -1;
        if (golf(x, z)) return R() < 0.08 ? 0 : -1;
        return R() < 0.42 ? (R() < 0.82 ? 0 : 1) : -1; // gums everywhere in the park, palms among them
      },
    },
  });
}
