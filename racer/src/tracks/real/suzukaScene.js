import { rgb, scaleC, pick } from '../street/kit.js';
import { standVariety } from './trackside.js';
import { buildRealScene } from './scene.js';
import { venueDressing } from './backOfHouse.js';
import { cheapBlock } from '../street/buildings.js';
import { palm } from '../street/trees.js';
import { grandstand } from '../street/props.js';
import { oak, fieldParking } from './hungaroringScene.js';
import { marquees, bigScreen } from './silverstoneScene.js';
import { beam } from '../night/venue.js';

/*
 * Suzuka, handcrafted. The figure-of-eight in the hills of Mie: the long main
 * grandstand over the start straight, the S Curves climbing past the huge
 * hillside stands, the bridge where the back straight crosses over the run from
 * Degner to the Hairpin, cherry trees in blossom along the banks, the red Ferris
 * wheel of the amusement park standing over the first corners, white marquees
 * and flags behind the fences, rice fields, tiled farmhouses and pylons beyond.
 * Red-and-white kerbs with a painted green band, gravel and dry grass.
 */

const RED = rgb(0xbc002d), WHITE = rgb(0xf4f4f0), GREEN = rgb(0x2aa88a), STEEL = rgb(0x9aa0a6);
const SHIRTS = [RED, WHITE, rgb(0x1b1b1f), rgb(0xff8000), rgb(0x1f4f9a), rgb(0x00a19b), rgb(0xf2c200), RED];

const SPONSORS = [
  ['ARAMIS ENERGY', '#14a88a', '#ffffff', '#1f6ad8', 'wave'],
  ['SAKURA TELECOM', '#ffffff', '#bc002d', '#bc002d', 'serif'],
  ['MIE MOTORS', '#bc002d', '#ffffff', '#ffffff', 'stripes'],
  ['ISE TEA', '#2a6a3a', '#f2e6c9', '#d8b04a', 'serif'],
  ['KAIZEN TYRES', '#141416', '#f2c200', '#f2c200', 'tread'],
  ['FUJI AIR', '#1f6ad8', '#ffffff', '#ffffff', 'wave'],
  ['HONSHU BANK', '#f2efe6', '#1b2a4a', '#bc002d', 'serif'],
  ['NEO TOKYO', '#2b1a5c', '#7df9ff', '#ff3fd1', 'bolt'],
];

function suzukaStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: true, seats: [rgb(0x3a6ab0), rgb(0x4a7ac0), RED] });
  return { ...gs, shirts: SHIRTS };
}
/** Hillside stand: concrete terraces stepped into the bank, open, packed (the S Curves). */
function hillStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: false, style: 'alu', seats: [rgb(0x8a8e96), rgb(0x9a9ea6)], fill: 0.9 });
  return { ...gs, shirts: SHIRTS };
}
const VARIED = standVariety(suzukaStand, null, SHIRTS);

/** Cherry tree in blossom: a short dark trunk and a wide, soft pink-white crown. */
function sakura(F, r) {
  const h = 6 + r() * 3, s = 3.2 + r() * 1.6;
  F.cylinder('trim', 0, 0, 0.3, 0, h * 0.45, 6, rgb(0x4a3430));
  const pinks = [rgb(0xf6dbe4), rgb(0xf0c8d6), rgb(0xfaeaf0), rgb(0xe8b8c8)];
  // A full cloud of blossom: two rings of clumps round a solid heart.
  for (let k = 0; k < 10; k++) {
    const t = (k / 10) * 6.28 + r(), rr = s * (k < 6 ? 0.55 + r() * 0.3 : 0.25 + r() * 0.2), y0 = h * (k < 6 ? 0.42 : 0.6);
    F.blob('leaf', Math.cos(t) * rr, Math.sin(t) * rr, s * (0.5 + r() * 0.25), y0, y0 + h * (0.38 + r() * 0.15), 10, pick(r, pinks));
  }
  F.blob('leaf', 0, 0, s * 0.9, h * 0.55, h + 0.6, 12, pick(r, pinks));
}

/** The amusement park's big red Ferris wheel with its gondolas and the circuit sign at the hub. */
function ferrisWheel(F, r) {
  const R = 25, cy = R + 6, n = 32;
  for (const z of [-1.4, 1.4]) {
    for (let k = 0; k < n; k++) {
      const t0 = (k / n) * 6.283, t1 = ((k + 1) / n) * 6.283;
      beam(F, 'metal', [Math.cos(t0) * R, cy + Math.sin(t0) * R, z], [Math.cos(t1) * R, cy + Math.sin(t1) * R, z], 0.35, WHITE);
      if (k % 2 === 0) beam(F, 'metal', [0, cy, z], [Math.cos(t0) * R, cy + Math.sin(t0) * R, z], 0.08, WHITE);
    }
  }
  // The red A-frame legs.
  for (const z of [-3.5, 3.5]) for (const s of [-1, 1]) beam(F, 'metal', [s * 13, 0, z], [0, cy, z * 0.4], 0.7, RED);
  for (const y of [8, 16]) beam(F, 'metal', [-13 + y * 0.42, y, 0], [13 - y * 0.42, y, 0], 0.4, RED);
  for (let k = 0; k < n; k += 2) {
    const t = (k / n) * 6.283, x = Math.cos(t) * R, y = cy + Math.sin(t) * R;
    F.box('stucco', x - 1.1, x + 1.1, y - 2.6, y - 0.4, -1.1, 1.1, RED);
    F.face('glass', x - 0.9, x + 0.9, y - 2.1, y - 0.9, 1.12, null);
  }
  F.box('trim', -3.5, 3.5, cy - 4, cy + 4, 1.6, 1.9, rgb(0x1b1b1f));
  F.face('neon', -3, 3, cy - 1.5, cy + 1.5, 1.92, [1.6, 1.6, 1.6]);
  F.box('stucco', -16, 16, 0, 5, -6, 6, WHITE); // the boarding station
}

/** Japanese farmhouse: dark tiled hip roof, pale walls. */
function farmHouse(F, r, W, D) {
  cheapBlock(F, r, W, D, 2, { wall: pick(r, [rgb(0xe8e2d4), rgb(0xd8d0c0), rgb(0xc8c0b0)]), roof: pick(r, [rgb(0x3a4048), rgb(0x2a3038), rgb(0x5a3a32)]), style: 'stucco', trim: rgb(0x6a6058) });
}

/** A lattice electricity pylon. */
function pylon(F, H = 36) {
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) beam(F, 'metal', [sa * 3, 0, sb * 3], [sa * 0.8, H, sb * 0.8], 0.3, rgb(0x8a3a32));
  for (const y of [H * 0.6, H * 0.78, H * 0.95]) beam(F, 'metal', [-7, y, 0], [7, y, 0], 0.3, rgb(0x8a3a32));
}

const VENUE = venueDressing({
  pitSide: 'R', paddock: [-230, 50], tunnel: 160, ring: 170, exits: [0.12, 0.45, 0.75],
  palette: [0xf2f2ee, 0xf2f2ee, 0x1b1b1f, 0xc0c4c8, 0x8a1418, 0x2a4a8a, 0x5a5e64],
  mix: { car: 6, van: 1.5, bus: 1, truck: 0.6 }, density: 10,
  bus: rgb(0xc8102e), gate: rgb(0xc8102e), heli: rgb(0xc8102e), hoarding: rgb(0xc8102e), crane: rgb(0xf2c200),
  liveries: [rgb(0xc8102e), rgb(0x1b1b1f), rgb(0xf2f2ee)], busTerminals: 2, sites: 1, hospitality: 7,
  concessions: [8, 26, 44, 62], carParks: 10,
});

export function buildSuzukaScene(L) {
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const hills = (x, z) => Math.sin(x * 0.0048 + 1.1) * Math.cos(z * 0.0041 - 0.6) + Math.sin((x + z) * 0.0024) * 0.5;
  const noise = (x, z) => Math.sin(x * 0.017 + 0.3) * Math.cos(z * 0.013 + 0.8) * 0.6 + Math.sin(x * 0.041 - z * 0.033) * 0.4;
  const paddy = (x, z) => (((Math.floor(x / 40) + Math.floor(z / 26)) % 3) + 3) % 3;

  return buildRealScene(L, {
    name: 'Suzuka',
    seed: 1962,
    life: { paddock: true, camping: false, parks: 14 },
    margin: 700,
    trackside: { standBuild: suzukaStand, shirts: SHIRTS, suburb: 0, standSpacing: 220, hoardingSpacing: 110 },
    pitTheme: {
      wall: rgb(0xeceae4),
      upper(F, hw, i, rc, { H1, DEPTH }) {
        const top = H1 + 3.6;
        F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -1.0, rgb(0xf2f0ea));
        F.face(i % 3 === 0 ? 'winLit' : 'glass', -hw + 0.3, hw - 0.3, H1 + 0.4, top - 0.4, -0.98, [1.0, 1.05, 1.1]);
        F.box('trim', -hw, hw, top, top + 0.35, -DEPTH, 1.5, RED);
        if (rc) F.box('stucco', -hw + 0.5, hw - 0.5, top + 0.35, top + 5, -DEPTH + 1, -1.2, WHITE);
      },
    },
    style: {
      kerb: [WHITE, rgb(0xd4262a)],
      runoff: 'gravel', edgeBand: GREEN,
      barrier: 'armco', fence: true, lamps: 'none', verge: 'grass',
      grass: [0.5, 0.52, 0.3],
      sponsors: SPONSORS,
      zoneBrands: ['ARAMIS ENERGY', 'SAKURA TELECOM', 'MIE MOTORS', 'FUJI AIR'],
      primeBrands: ['ARAMIS ENERGY', 'HONSHU BANK'],
      title: ['SUZUKA', 'JAPANESE GRAND PRIX', '#ffffff', '#bc002d', '#1b1b1f'],
      bridges: [['ARAMIS ENERGY', 'POWERING THE FIGURE OF EIGHT', '#14a88a', '#ffffff', '#1f6ad8'], ['SAKURA TELECOM', 'ALWAYS IN BLOOM', '#ffffff', '#bc002d', '#bc002d']],
      roadName: 'SUZUKA',
      bannerGlow: 0.12,
      boardBorder: '#bc002d',
    },
    fascia: ['SUZUKA', 'JAPANESE GRAND PRIX'],
    fasciaColours: ['#ffffff', '#bc002d', '#1b1b1f'],
    skirtColour: [0.34, 0.44, 0.24],
    relief(x, z, d) { return (hills(x, z) * 24 + 10 * smooth(150, 700, d)) * smooth(30, 220, d) + noise(x, z) * 3 * smooth(15, 60, d); },
    colourAt(x, z, h, slope, d) {
      const dry = [0.58, 0.56, 0.36], lawn = [0.4, 0.52, 0.26], wood = [0.2, 0.32, 0.18];
      if (d < 50) return noise(x * 3, z * 3) > 0.2 ? dry : lawn;
      if (d > 260 && h < 30 && noise(x * 0.5, z * 0.5) < 0) return [[0.36, 0.5, 0.3], [0.44, 0.56, 0.32], [0.5, 0.48, 0.3]][paddy(x, z)]; // rice paddies
      return noise(x * 1.3 + 9, z * 1.3) > 0.2 ? wood : lawn;
    },
    stands: [
      { at: 59, side: 'L', W: 380, tiers: 26, build: suzukaStand, offset: -20 }, // the main grandstand, most of the straight
      { at: 1, side: 'L', W: 180, tiers: 22, build: suzukaStand },                // ...running on to Turn 1
      { at: 3, side: 'outside', W: 120, tiers: 16, build: VARIED },              // Turn 1
      { at: 10, side: 'outside', W: 160, tiers: 20, build: hillStand },           // the S Curves
      { at: 15, side: 'outside', W: 140, tiers: 20, build: hillStand },
      { at: 24, side: 'outside', W: 80, tiers: 14, build: VARIED },               // Degner
      { at: 32, side: 'outside', W: 110, tiers: 16, build: VARIED },              // the Hairpin
      { at: 44, side: 'outside', W: 110, tiers: 16, build: VARIED },              // Spoon
      { at: 53, side: 'outside', W: 100, tiers: 16, build: VARIED },              // 130R
      { at: 56, side: 'outside', W: 120, tiers: 18, build: VARIED },              // the chicane
    ],
    roads: VENUE.roads,
    landmarks({ L, R, frameAt, kit, terrain, placed, bs }) {
      VENUE.dress({ L, R, kit, bs, placed, frameAt });
      const ps = (k) => L.pointS(k);
      // ---- the Ferris wheel and the amusement park over the first corners ----
      // The wheel stands in the amusement park inside the first corners, looking over T1-T2.
      for (const [k, extra] of [[2, 70], [4, 70], [1, 90], [5, 100], [3, 130], [6, 140]]) {
        if (placed.wheel) break;
        for (const side of ['L', 'R']) {
          const fr = kit.frontage(ps(k), side, extra);
          let ok = true;
          for (let a = -18; a <= 18 && ok; a += 6) for (const b of [-8, 0, 8]) if (!kit.isFree(fr.x + fr.dirZ * a + fr.dirX * b, fr.z - fr.dirX * a + fr.dirZ * b, 4)) { ok = false; break; }
          if (!ok || kit.overlaps({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 20, hd: 20 })) continue;
          kit.footprints.push({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 20, hd: 20 });
          ferrisWheel(frameAt(fr.x, fr.z, Math.atan2(fr.dirZ, -fr.dirX) + Math.PI / 2, terrain.heightAt(fr.x, fr.z) - 0.3), R);
          placed.wheel = 1;
          break;
        }
      }
      // ---- cherry trees along the banks, marquees and flags behind the fences ----
      let sak = 0;
      for (const side of ['L', 'R']) for (let s = 0; s < L.length; s += 11) {
        if (R() < 0.35) continue;
        const fr = kit.frontage(s, side, 4 + R() * 18);
        if (!kit.isFree(fr.x, fr.z, 2) || kit.overlaps({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 2, hd: 2 })) continue;
        sakura(frameAt(fr.x, fr.z, R() * 6.28), R);
        sak++;
      }
      for (const k of [1, 9, 18, 31, 43, 55]) {
        const s = ps(k), side = L.k[Math.floor(s / L.ds) % L.N] > 0 ? 'R' : 'L';
        const fr = kit.frontage(s, side, 26 + R() * 12);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 60, 30, 3, null);
        if (F) {
          marquees(F, R, 60, 30);
          for (let a = -28; a <= 28; a += 7) { F.box('metal', a - 0.05, a + 0.05, 0, 8, 2, 2.1, STEEL); F.box('fabric', a, a + 1.6, 6.8, 8, 2.04, 2.06, WHITE); }
        }
        const g = kit.frontage(s + 30, side, 4);
        const G = kit.lot(g.x, g.z, g.dirX, g.dirZ, 13, 2, 1, null);
        if (G) bigScreen(G);
      }
      // ---- the countryside: farmhouses among the paddies, car parks, pylons striding across ----
      let farms = 0, parks = 0;
      const b = terrain.bounds;
      for (let k = 0; k < 900; k++) {
        const x = b.minX + R() * (b.maxX - b.minX), z = b.minZ + R() * (b.maxZ - b.minZ), d = terrain.distSmooth(x, z);
        if (d < 160) continue;
        if (d < 380 && R() < 0.3) {
          const F = kit.lot(x, z, 0, 1, 90, 38, 4, null);
          if (F) { fieldParking(F, R, 90, 38); parks++; }
          continue;
        }
        const W = 10 + R() * 5, D = 9 + R() * 3, yaw = R() < 0.5 ? 0 : Math.PI / 2;
        const F = kit.lot(x, z, Math.sin(yaw), Math.cos(yaw), W, D, 3, null);
        if (F) { farmHouse(F, R, W, D); farms++; }
      }
      for (let k = 0; k < 8; k++) {
        const [x, z] = L.fromImage(-150 + k * 180, 760 - k * 60);
        if (terrain.distSmooth(x, z) > 80) pylon(frameAt(x, z, 0.4));
      }
      // F1 village: team hospitality units, white hangars and marquee rows around the circuit.
      const TEAMC = [rgb(0xff8000), rgb(0x1b2552), rgb(0xd4141c), rgb(0x00a19b), rgb(0x2a7fff), rgb(0xf2f2f2), rgb(0x006f62), rgb(0xff4fa0)];
      let f1b = 0;
      for (let k = 0; k < 220 && f1b < 46; k++) {
        const s = R() * L.length, side = R() < 0.5 ? 'L' : 'R', fr = kit.frontage(s, side, 30 + R() * 140);
        const kind = R(), W = kind < 0.5 ? 26 + R() * 16 : 34 + R() * 24, D = kind < 0.5 ? 14 + R() * 6 : 18 + R() * 10;
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, W, D, 3, null);
        if (!F) continue;
        if (kind < 0.5) {
          const floors = 2 + Math.floor(R() * 2), c = pick(R, TEAMC);
          for (let f = 0; f < floors; f++) {
            const y = f * 4, inset = f * 1.2;
            F.box('stucco', -W / 2 + inset, W / 2 - inset, y, y + 3.6, -D + inset, -inset, rgb(0xeeeeec));
            F.face('glass', -W / 2 + inset + 0.4, W / 2 - inset - 0.4, y + 0.4, y + 3.2, -inset + 0.02, null);
            F.box('trim', -W / 2 + inset - 1, W / 2 - inset + 1, y + 3.6, y + 4, -D + inset - 0.4, -inset + 1.8, c);
          }
        } else {
          F.box('stucco', -W / 2, W / 2, 0, 5, -D, 0, rgb(0xf4f4f2));
          F.block('roof', [[-W / 2, 0], [W / 2, 0], [W / 2, -D], [-W / 2, -D]], [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, -D / 2]], 5, 9, rgb(0xf8f8f6));
          F.box('trim', -W / 2, W / 2, 4.2, 4.8, 0, 0.15, pick(R, TEAMC));
        }
        f1b++;
      }
      placed.suzuka = { sak, farms, parks, f1b };
      void scaleC; void palm;
    },
    trees: {
      variants: [oak, sakura],
      attempts: 22000,
      scale: [0.9, 1.15],
      test(x, z, d, h, R) {
        if (d < 20) return -1;
        if (d > 260) return R() < 0.8 ? (R() < 0.75 ? 0 : 1) : -1; // the wooded hills all round
        if (noise(x * 1.3 + 9, z * 1.3) <= 0.0) return R() < 0.08 ? 1 : -1;
        return R() < 0.55 ? 0 : 1; // oak copses with cherry trees among them
      },
    },
  });
}
