import { rgb, scaleC, pick } from '../street/kit.js';
import { standVariety } from './trackside.js';
import { buildRealScene } from './scene.js';
import { cheapBlock } from '../street/buildings.js';
import { palm } from '../street/trees.js';
import { grandstand } from '../street/props.js';
import { marquees, bigScreen } from './silverstoneScene.js';
import { beam } from '../night/venue.js';

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
  const BRICK = rgb(0x9a4a32), CREAM = rgb(0xe8dcc0);
  F.box('stucco', -W / 2, W / 2, 0, 15, -D, 0, BRICK);
  F.box('stucco', -W / 2, W / 2, 6.6, 7.2, -D - 0.2, 0.2, CREAM);   // the string course
  for (let a = -W / 2 + 4; a < W / 2 - 3; a += 7) {
    F.box('stucco', a - 2.2, a + 2.2, 8.4, 12.6, -0.2, 0.05, CREAM);  // arch surround
    F.face('glass', a - 1.7, a + 1.7, 8.8, 12.2, 0.07, null);
    F.blob('stucco', a, 0.05, 2.2, 11.4, 13.4, 8, CREAM);            // the arch head
    F.face('glass', a - 1.4, a + 1.4, 1.2, 5.6, 0.02, null);         // ground-floor windows
  }
  F.block('roof', [[-W / 2 - 1.6, 1.6], [W / 2 + 1.6, 1.6], [W / 2 + 1.6, -D - 1.6], [-W / 2 - 1.6, -D - 1.6]], [[-W / 2 + 4, -D / 2], [W / 2 - 4, -D / 2], [W / 2 - 4, -D / 2], [-W / 2 + 4, -D / 2]], 15, 21, rgb(0xa8382a));
  F.box('stucco', -W / 2 - 1.8, W / 2 + 1.8, 14.6, 15.2, -D - 1.8, 1.8, WHITE); // white fascia under the eaves
  F.box('trim', -W / 4, W / 4, 4.2, 5.4, 0.1, 0.2, rgb(0x1b1b1f));
  F.face('neon', -W / 4 + 0.2, W / 4 - 0.2, 4.4, 5.2, 0.21, [1.6, 1.6, 1.6]); // VICTORIAN INSTITUTE OF SPORT sign
}

/** A Victorian terrace house: brick or render front, a verandah with iron lace, a corrugated roof. */
function terrace(F, r, W, D) {
  cheapBlock(F, r, W, D, 1 + (r() < 0.35 ? 1 : 0), { wall: pick(r, [rgb(0x9a5a3a), rgb(0xe8dcc8), rgb(0xd0c4b0), rgb(0xb88a6a), rgb(0xc8d0c8)]), roof: pick(r, [rgb(0x8a8e94), rgb(0x8a3a2a), rgb(0x5a5e66)]), style: 'stucco', trim: WHITE });
  F.box('trim', -W / 2, W / 2, 3.1, 3.3, 0, 2, WHITE);
  for (const a of [-W / 2 + 0.2, W / 2 - 0.2]) F.box('metal', a - 0.08, a + 0.08, 0, 3.1, 1.8, 2, WHITE);
}

/** A CBD tower of the given type in daylight glass, H tall. */
function cbdTower(F, r, W, D, H, glass) {
  cheapBlock(F, r, W, D, Math.round(H / 3.3), { wall: glass, style: 'glass', flat: true, trim: rgb(0x5a6068) });
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
    landmarks({ L, R, frameAt, kit, terrain, placed }) {
      const ps = (k) => L.pointS(k);
      // ---- the Victorian Institute of Sport at T3 ----
      for (const extra of [8, 16, 26]) {
        const i = L.pointSample[13] % L.N, out = L.k[i] > 0 ? 'R' : 'L', fr = kit.frontage(ps(13), out, extra);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 62, 30, 2, (a, b) => !wetAt(a, b, 4));
        if (F) { visBuilding(F, 62, 30); placed.vis = 1; break; }
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
      // ---- the terrace streets of Albert Park and Middle Park, south of the circuit ----
      let houses = 0;
      const b = terrain.bounds;
      for (let z = b.minZ; z < b.maxZ; z += 22) for (let x = b.minX; x < b.maxX; x += 9) {
        if (!south(x, z) || terrain.distSmooth(x, z) < 90 || R() < 0.12) continue;
        const F = kit.lot(x, z, 0, 1, 7.5, 14, 0.3, null);
        if (F) { terrace(F, R, 7.5, 14); houses++; }
      }
      // ---- the CBD and Southbank across the lake to the north ----
      const [cx, cz] = img(330, -120);
      const T = (dx, dz, W, D, H, glass) => { const F = frameAt(cx + dx, cz + dz, 0, 0); cbdTower(F, R, W, D, H, glass); return F; };
      { // Australia 108: the tallest, slim, dark glass, the gold "starburst" cantilevered at 70% height
        const F = T(0, 0, 34, 30, 317, rgb(0x5a6a7a));
        F.box('copper', -19, 19, 210, 222, -34, 4, rgb(0xc8a24a));
      }
      { // Eureka Tower: blue-glass shaft with the gold crown, the red stripe
        const F = T(140, 60, 36, 32, 297, rgb(0x4a5a7a));
        F.box('copper', -18.2, 18.2, 220, 300, -32.2, 0.2, rgb(0xd8b04a));
        F.box('trim', -0.8, 0.8, 0, 300, 0.2, 0.6, rgb(0xc8202a));
      }
      T(-90, 40, 40, 34, 230, rgb(0x6a7a8a)); T(70, -80, 36, 36, 250, rgb(0x7a8a9a)); // Rialto, 120 Collins
      for (let k = 0; k < 110; k++) {
        const dx = (R() - 0.5) * 900, dz = (R() - 0.5) * 520, H = 50 + R() * R() * 200;
        if (Math.hypot(dx, dz) < 80) continue;
        T(dx, dz, 24 + R() * 20, 22 + R() * 18, H, pick(R, [rgb(0x8a98a8), rgb(0x9aa4ae), rgb(0x6a7a8a), rgb(0xb8b0a0), rgb(0x7a8a9a), rgb(0xc8c0b0)]));
      }
      placed.australia = { palms, houses };
      void scaleC; void STEEL;
    },
    trees: {
      variants: [gum, palm],
      attempts: 22000,
      scale: [1, 1],
      test(x, z, d, h, R) {
        if (d < 16 || wetAt(x, z, 8) || south(x, z)) return -1;
        if (golf(x, z)) return R() < 0.08 ? 0 : -1;
        return R() < 0.42 ? (R() < 0.82 ? 0 : 1) : -1; // gums everywhere in the park, palms among them
      },
    },
  });
}
