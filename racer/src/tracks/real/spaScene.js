import { rgb, scaleC, pick } from '../street/kit.js';
import { standVariety } from './trackside.js';
import { buildRealScene } from './scene.js';
import { cheapBlock } from '../street/buildings.js';
import { spruce, scotsPine, birch } from '../street/trees.js';
import { grandstand } from '../street/props.js';
import { oak, campsite, fieldParking } from './hungaroringScene.js';
import { marquees, bigScreen } from './silverstoneScene.js';
import { sub } from '../backstageProps.js';

/*
 * Spa-Francorchamps, handcrafted. The circuit is cut through the Ardennes: dark
 * spruce forest right up to the fences, oak and birch along the edges, the land
 * falling away from La Source into the Eau Rouge valley and climbing again up
 * Raidillon to the big covered grandstand on the crest. Run-offs painted in wide
 * bands of yellow, red and white; red-and-yellow kerbs; blue-seated bleachers on
 * the banks, campsites in the clearings, the village of Francorchamps over the hill.
 */

const YELLOW = rgb(0xffd90c), RED = rgb(0xef3340), BLACK = rgb(0x1b1b1f), WHITE = rgb(0xf2f2ee), GREEN = rgb(0x0b5a3a);
const SHIRTS = [YELLOW, RED, BLACK, WHITE, rgb(0xff8000), rgb(0x1f4f9a), rgb(0x2a2a2e), RED];

const SPONSORS = [
  ['CORONA TIMEPIECES', '#0b5a3a', '#e8d7a0', '#c9a24a', 'serif'],
  ['ARDENNES BIER', '#1b1b1f', '#ffd90c', '#ef3340', 'serif'],
  ['MEUSE ENERGY', '#ef3340', '#ffffff', '#ffd90c', 'bolt'],
  ['STAVELOT TELECOM', '#1f4f9a', '#ffffff', '#ffd90c', 'wave'],
  ['BELGA FRITES', '#ffd90c', '#1b1b1f', '#ef3340', 'stripes'],
  ['HAUTES FAGNES AIR', '#4a8ad0', '#ffffff', '#ffffff', 'wave'],
  ['FRANCORCHAMPS FUEL', '#ff8000', '#141416', '#141416', 'tread'],
  ['WALLONIA BANK', '#f2efe6', '#1b2a4a', '#ef3340', 'serif'],
];

/** Covered concrete grandstand like the one on the crest of Raidillon: tiers, a big flat roof on raking columns. */
function raidillonStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: true, style: 'steel', seats: [rgb(0x2a4a9a), rgb(0x3a5ab0)], led: [0, 0, 0] });
  const depth = tiers * 0.85 + 1.5;
  F.box('concrete', -W / 2, W / 2, 0, 3.4, -2, 0.3, rgb(0x5a5e66)); // hospitality floor under the front
  F.face('winLit', -W / 2 + 1, W / 2 - 1, 0.6, 3.0, 0.32, [1.05, 1.0, 0.92]);
  for (let a = -W / 2 + 8; a < W / 2 - 8; a += 26) F.face('trim', a, a + 14, 3.6, 6.8, 0.34, GREEN); // the green timing boards on the stand front
  void depth;
  return { ...gs, shirts: SHIRTS };
}

/** Open steel bleachers with blue seats and a yellow back board (the hillside "Gold" stands). */
function bankStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: false, style: 'alu', seats: [rgb(0x1f4fb0), rgb(0x2a5ac8)] });
  const depth = tiers * 0.85 + 1.5, top = 1.2 + tiers * 0.55;
  F.box('trim', -W / 2, W / 2, top, top + 2.6, -depth - 0.3, -depth, YELLOW);
  return { ...gs, shirts: SHIRTS };
}

const VARIED = standVariety(bankStand, null, SHIRTS);

/** Ardennes stone house: grey stone, slate roof. */
function stoneHouse(F, r, W, D) {
  cheapBlock(F, r, W, D, 2, { wall: pick(r, [rgb(0x9a968e), rgb(0xb0aaa0), rgb(0xe8e4dc), rgb(0x8a8680)]), roof: rgb(0x3a3e44), style: 'stucco', trim: rgb(0xd8d4cc) });
}

export function buildSpaScene(L) {
  let tx0 = Infinity, tx1 = -Infinity, tz0 = Infinity, tz1 = -Infinity;
  for (let i = 0; i < L.N; i++) { tx0 = Math.min(tx0, L.x[i]); tx1 = Math.max(tx1, L.x[i]); tz0 = Math.min(tz0, L.z[i]); tz1 = Math.max(tz1, L.z[i]); }
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const hills = (x, z) => Math.sin(x * 0.0042 + 0.6) * Math.cos(z * 0.0037 - 0.3) + Math.sin((x - z) * 0.0021) * 0.6 + Math.sin(x * 0.011 + z * 0.009) * 0.25;
  const noise = (x, z) => Math.sin(x * 0.017 + 0.3) * Math.cos(z * 0.013 + 0.8) * 0.6 + Math.sin(x * 0.041 - z * 0.033) * 0.4;
  // Clearings in the forest (campsites, car parks, the village); everywhere else is woodland.
  const clearing = (x, z) => noise(x * 0.35 + 70, z * 0.35 - 40) > 0.62;

  return buildRealScene(L, {
    name: 'Spa',
    seed: 1921,
    margin: 750,
    trackside: { standBuild: bankStand, shirts: SHIRTS, suburb: 0, standSpacing: 260, hoardingSpacing: 120 },
    pitTheme: {
      wall: rgb(0xe8e6e0),
      upper(F, hw, i, rc, { H1, DEPTH }) {
        const top = H1 + 3.4;
        F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -1.0, rgb(0xd8d8d4));
        F.face(i % 3 === 0 ? 'winLit' : 'glass', -hw + 0.3, hw - 0.3, H1 + 0.4, top - 0.4, -0.98, [1.0, 1.05, 1.1]);
        F.box('trim', -hw, hw, top, top + 0.4, -DEPTH, 1.5, rgb(0x2a2c30));
        if (rc) F.box('stucco', -hw + 0.5, hw - 0.5, top + 0.4, top + 5, -DEPTH + 1, -1.2, rgb(0xd8d8d4));
      },
    },
    style: {
      kerb: [YELLOW, RED],
      runoff: 'brand', runoffFloor: [0.12, 0.12, 0.13],
      runoffStripes: [YELLOW, RED, WHITE, RED],
      barrier: 'armco', fence: true, lamps: 'none', verge: 'grass',
      sponsors: SPONSORS,
      zoneBrands: ['ARDENNES BIER', 'MEUSE ENERGY', 'STAVELOT TELECOM', 'HAUTES FAGNES AIR'],
      primeBrands: ['CORONA TIMEPIECES', 'WALLONIA BANK'],
      title: ['SPA-FRANCORCHAMPS', 'BELGIAN GRAND PRIX', '#1b1b1f', '#ffd90c', '#ef3340'],
      bridges: [['CORONA TIMEPIECES', 'OFFICIAL TIMEPIECE', '#0b5a3a', '#e8d7a0', '#c9a24a'], ['ARDENNES BIER', 'BREWED IN THE FOREST', '#1b1b1f', '#ffd90c', '#ef3340']],
      roadName: 'SPA',
      bannerGlow: 0.12,
      boardBorder: '#ffd90c',
    },
    fascia: ['SPA-FRANCORCHAMPS', 'BELGIAN GRAND PRIX'],
    fasciaColours: ['#1b1b1f', '#ffd90c', '#ef3340'],
    skirtColour: [0.16, 0.26, 0.15],
    // The Ardennes: ridges and valleys all round, steep wooded banks right by the circuit.
    relief(x, z, d) {
      return (hills(x, z) * 45 + 25 * smooth(150, 900, d)) * smooth(25, 220, d) + noise(x, z) * 4 * smooth(15, 60, d);
    },
    colourAt(x, z, h, slope, d) {
      const grass = [0.32, 0.5, 0.22], forest = [0.12, 0.2, 0.1], earth = [0.34, 0.28, 0.2];
      if (d < 30) return grass;
      if (clearing(x, z)) return grass;
      let c = d < 60 ? grass.map((v, k) => v + (forest[k] - v) * 0.5) : forest;
      if (slope > 0.6) c = c.map((v, k) => v + (earth[k] - v) * 0.4);
      return c;
    },
    stands: [
      { at: 12, side: 'outside', W: 170, tiers: 22, build: raidillonStand },   // the crest of Raidillon
      { at: 9, side: 'inside', W: 110, tiers: 16, build: bankStand },          // the bank at the foot of Eau Rouge
      { at: 64, side: 'L', W: 160, tiers: 18, build: raidillonStand, offset: -60 }, // the main grandstand
      { at: 4, side: 'outside', W: 100, tiers: 16, build: VARIED },            // La Source
      { at: 17, side: 'outside', W: 90, tiers: 14, build: VARIED },            // Les Combes
      { at: 23, side: 'outside', W: 80, tiers: 14, build: VARIED },            // Rivage
      { at: 33, side: 'outside', W: 100, tiers: 16, build: bankStand },        // Pouhon
      { at: 44, side: 'outside', W: 80, tiers: 14, build: VARIED },            // Stavelot
      { at: 53, side: 'outside', W: 90, tiers: 14, build: VARIED },            // Blanchimont
      { at: 62, side: 'outside', W: 110, tiers: 16, build: bankStand },        // the Bus Stop
    ],
    landmarks({ L, R, frameAt, kit, terrain, placed }) {
      const ps = (k) => L.pointS(k);
      // ---- campsites, car parks and hospitality in the clearings; the village of Francorchamps ----
      let camps = 0, parks = 0, houses = 0;
      const b = terrain.bounds;
      for (let z = b.minZ + 60; z < b.maxZ - 60; z += 46) for (let x = b.minX + 60; x < b.maxX - 60; x += 100) {
        const d = terrain.distSmooth(x, z);
        if (d < 50 || d > 420 || !clearing(x, z)) continue;
        const F = kit.lot(x, z, 0, 1, 90, 38, 4, null);
        if (!F) continue;
        if (R() < 0.6) { campsite(F, R, 90, 38); camps++; } else { fieldParking(F, R, 90, 38); parks++; }
      }
      for (const k of [2, 12, 33, 53, 63]) {
        const s = ps(k), side = L.k[Math.floor(s / L.ds) % L.N] > 0 ? 'R' : 'L';
        const fr = kit.frontage(s, side, 30 + R() * 14);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 60, 32, 3, null);
        if (F) marquees(F, R, 60, 32);
        const g = kit.frontage(s + 30, side, 4);
        const G = kit.lot(g.x, g.z, g.dirX, g.dirZ, 13, 2, 1, null);
        if (G) bigScreen(G);
      }
      const [vx, vz] = L.fromImage(180, 470);
      for (let k = 0; k < 220; k++) {
        const x = vx - 120 + (R() - 0.5) * 360, z = vz + (R() - 0.5) * 300;
        if (terrain.distSmooth(x, z) < 70) continue;
        const yaw = R() < 0.5 ? 0 : Math.PI / 2, W = 10 + R() * 5, D = 9 + R() * 3;
        const F = kit.lot(x, z, Math.sin(yaw), Math.cos(yaw), W, D, 3, null);
        if (F) { stoneHouse(F, R, W, D); houses++; }
      }
      // Lines of oak and birch right along the fences: the forest edge.
      let edge = 0;
      for (const side of ['L', 'R']) for (let s = 0; s < L.length; s += 9) {
        const fr = kit.frontage(s, side, 6 + R() * 16);
        if (!kit.isFree(fr.x, fr.z, 3) || kit.overlaps({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 2, hd: 2 })) continue;
        const v = R(), F = frameAt(fr.x, fr.z, R() * 6.28);
        if (v < 0.55) spruce(F, R, 16 + R() * 10); else if (v < 0.8) oak(F, R); else birch(F, R);
        edge++;
      }
      placed.spa = { camps, parks, houses, edge };
      void sub; void scaleC;
    },
    trees: {
      variants: [spruce, scotsPine, oak, birch],
      attempts: 26000,
      scale: [1.3, 1.1, 1, 1],
      test(x, z, d, h, R) {
        if (d < 22 || clearing(x, z)) return -1;
        const v = R();
        return v < 0.62 ? 0 : v < 0.78 ? 1 : v < 0.92 ? 2 : 3;
      },
    },
  });
}
