import { rgb, scaleC, pick } from '../street/kit.js?v=b8df018';
import { standVariety } from './trackside.js?v=b8df018';
import { buildRealScene } from './scene.js?v=b8df018';
import { venueDressing } from './backOfHouse.js?v=b8df018';
import { cheapBlock } from '../street/buildings.js?v=b8df018';
import { spruce, birch } from '../street/trees.js?v=b8df018';
import { grandstand } from '../street/props.js?v=b8df018';
import { oak } from './hungaroringScene.js?v=b8df018';
import { marquees, bigScreen } from './silverstoneScene.js?v=b8df018';
import { beam } from '../night/venue.js?v=b8df018';
import { sub } from '../backstageProps.js?v=b8df018';

/*
 * Spielberg, handcrafted. The Red Bull Ring climbs a meadow hillside above the Mur valley in
 * Styria: dark spruce woods in patches round the circuit and up the slopes, the Seetal Alps and
 * the Gleinalpe behind, farmhouses with white walls, dark timber and steep roofs, the village
 * church with its onion dome. At the circuit: the pit building under its white blade roof, the
 * Start-Ziel grandstand opposite, the Steiermark stand at T1, the stand at the top of Remus, the
 * giant steel bull on the hill, grass banks packed with fans, and the orange campsites.
 */

const WHITE = rgb(0xf4f4f2), RED = rgb(0xed2939), NAVY = rgb(0x1e2a5c), YELLOW = rgb(0xffc906), STEEL = rgb(0x8a929e);
const SHIRTS = [rgb(0xff6a00), rgb(0xff6a00), NAVY, RED, WHITE, rgb(0x1b1b1f), rgb(0x00a19b), YELLOW];

function rbrStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: true, seats: [NAVY, rgb(0x2a3a7a), RED] });
  return { ...gs, shirts: SHIRTS };
}
/** Open steel stand on the hillside with a Red Bull back board. */
function hillStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: false, style: 'alu', seats: [rgb(0x8a8e96), NAVY] });
  const depth = tiers * 0.85 + 1.5, top = 1.2 + tiers * 0.55;
  F.box('trim', -W / 2, W / 2, top, top + 2.4, -depth - 0.3, -depth, NAVY);
  return { ...gs, shirts: SHIRTS };
}
const VARIED = standVariety(hillStand, null, SHIRTS);

/** The Bull of Spielberg: a giant steel bull, head down and charging, on its stone plinth (k: scale). */
function steelBull(F, k = 1) {
  const S = rgb(0xa8aeb6), D = rgb(0x6a7078), P = (x, y, z) => [x * k, y * k, z * k];
  const box = (x0, x1, y0, y1, z0, z1, c) => F.box('metal', x0 * k, x1 * k, y0 * k, y1 * k, z0 * k, z1 * k, c);
  F.box('concrete', -16 * k, 16 * k, 0, 3 * k, -7 * k, 7 * k, rgb(0xb8b4aa));
  box(-10, 7, 10, 17, -3.4, 3.4, S);                                    // the barrel of the body
  box(-11, -5, 11, 18, -3.6, 3.6, S);                                   // haunches
  box(1, 8, 12, 19.5, -3.8, 3.8, scaleC(S, 1.06));                      // the hump over the shoulders
  beam(F, 'metal', P(7, 15, 0), P(13, 10.5, 0), 3.4 * k, S);             // neck, head down
  box(12, 17, 7, 12, -2.4, 2.4, S);                                     // head
  box(16.5, 18, 7.5, 9.5, -1.6, 1.6, D);                                // muzzle
  for (const z of [-2.2, 2.2]) { beam(F, 'metal', P(14, 11.6, z), P(16, 15, z * 2.3), 0.55 * k, D); beam(F, 'metal', P(16, 15, z * 2.3), P(19, 14.6, z * 2.2), 0.4 * k, D); } // horns forward
  for (const [x, z, s] of [[5, -2.6, 1], [5, 2.6, -0.6], [-8, -2.6, -1], [-8, 2.6, 0.6]]) beam(F, 'metal', P(x, 11, z), P(x + s * 4, 3, z), 1.3 * k, D); // legs driving
  beam(F, 'metal', P(-10, 15, 0), P(-15, 20, 0), 0.6 * k, D); beam(F, 'metal', P(-15, 20, 0), P(-17.5, 17.5, 0), 0.5 * k, D); // tail up
}

/** Styrian farmhouse: white ground floor, dark timber upper floor and balcony, steep roof. */
function farmHouse(F, r, W, D) {
  cheapBlock(F, r, W, D, 2, { wall: pick(r, [WHITE, rgb(0xf0ead8), rgb(0xe8e0cc)]), roof: pick(r, [rgb(0x5a3a2a), rgb(0x4a4e54), rgb(0x8a3a2a)]), style: 'stucco', trim: rgb(0x6a4a2e) });
  F.box('trim', -W / 2, W / 2, 6.3, 9.6, -D + 0.3, -0.3, rgb(0x6a4a2e));   // timber upper floor
  F.box('trim', -W / 2 + 0.5, W / 2 - 0.5, 6.3, 6.5, 0, 1.4, rgb(0x5a3a22)); // balcony
  for (let a = -W / 2 + 1; a < W / 2 - 0.5; a += 2) F.box('trim', a, a + 0.12, 6.5, 7.4, 1.3, 1.4, rgb(0x5a3a22));
  if (r() < 0.6) for (let a = -W / 2 + 1.5; a < W / 2 - 1; a += 2.5) F.box('fabric', a, a + 1.4, 6.6, 7.0, 1.4, 1.6, rgb(0xd8284a)); // geraniums
}

/** The village church: white nave, the tower with its dark onion dome and spire. */
function church(F) {
  F.box('stucco', -5, 5, 0, 11, -26, -6, WHITE);
  F.block('roof', [[-5.5, -6], [5.5, -6], [5.5, -26], [-5.5, -26]], [[0, -6], [0, -6], [0, -26], [0, -26]], 11, 17, rgb(0x5a3a2a));
  F.box('stucco', -3.5, 3.5, 0, 26, -6, 1, WHITE);
  F.box('trim', -3.6, 3.6, 20, 21, -6.1, 1.1, rgb(0xc8a24a));
  F.blob('roof', 0, -2.5, 3.6, 26, 32, 10, rgb(0x2a3a30));   // the onion
  F.cylinder('roof', 0, -2.5, 1.2, 31, 33, 8, rgb(0x2a3a30));
  F.box('metal', -0.15, 0.15, 33, 37, -2.65, -2.35, rgb(0xc8a24a));
}

/** Pit building upper floor: full glass, a white roof blade cantilevered towards the track. */
const pitTheme = {
  wall: rgb(0xeceae6),
  upper(F, hw, i, rc, { H1, DEPTH }) {
    const top = H1 + 4.2;
    F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -1.0, rgb(0x2a2e36));
    F.face(i % 2 ? 'winLit' : 'glass', -hw + 0.2, hw - 0.2, H1 + 0.4, top - 0.3, -0.98, [1.0, 1.05, 1.1]);
    F.block('stucco', [[-hw, 6], [hw, 6], [hw, -DEPTH], [-hw, -DEPTH]], [[-hw, 6], [hw, 6], [hw, -DEPTH], [-hw, -DEPTH]], top + 0.6, top + 1.2, WHITE); // the blade
    F.box('trim', -hw, hw, top + 0.4, top + 0.6, 5.6, 6, RED);
    if (rc) F.box('stucco', -hw + 0.5, hw - 0.5, top + 1.2, top + 6, -DEPTH + 1, -1.2, WHITE);
  },
};

const VENUE = venueDressing({
  pitSide: 'L', paddock: [-240, 40], tunnel: 160, ring: 170, exits: [0.12, 0.45, 0.75],
  palette: [0xf2f2ee, 0xf2f2ee, 0x1b1b1f, 0xc0c4c8, 0x8a1418, 0x2a4a8a, 0x5a5e64],
  mix: { car: 6, van: 1.5, bus: 1, truck: 0.6 }, density: 10,
  bus: rgb(0xe2001a), gate: rgb(0xe2001a), heli: rgb(0xe2001a), hoarding: rgb(0xe2001a), crane: rgb(0xf2c200),
  liveries: [rgb(0xe2001a), rgb(0x1e2a5c), rgb(0xf2f2ee)], busTerminals: 2, sites: 1, hospitality: 7,
  concessions: [8, 26, 44, 62], carParks: 10,
});

export function buildAustriaScene(L) {
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const noise = (x, z) => Math.sin(x * 0.013 + 0.3) * Math.cos(z * 0.011 + 0.8) * 0.6 + Math.sin(x * 0.033 - z * 0.027) * 0.4;
  const img = (px, py) => L.fromImage(px, py);
  const woods = (x, z) => noise(x * 0.55 + 31, z * 0.55 - 12) > 0.18; // the spruce patches

  return buildRealScene(L, {
    name: 'Austria',
    seed: 1969,
    life: { paddock: true, camping: true, camps: 26, parks: 12 },
    margin: 800,
    trackside: { standBuild: hillStand, shirts: SHIRTS, suburb: 0, standSpacing: 9999, hoardingSpacing: 110 },
    pitTheme,
    style: {
      kerb: [WHITE, RED],
      runoff: 'brand', runoffFields: 2, runoffBoth: 0, runoffFloor: [0.11, 0.115, 0.12], runoffBandFloor: RED,
      runoffStripes: [RED], runoffFlag: [[3.5, 3.2, WHITE]],
      barrier: 'armco', fence: true, lamps: 'none', verge: 'grass',
      title: ['SPIELBERG', 'GROSSER PREIS VON ÖSTERREICH', '#ed2939', '#ffffff', '#1e2a5c'],
      roadName: 'SPIELBERG',
      bannerGlow: 0.12,
      boardBorder: '#ed2939',
    },
    fascia: ['RED BULL RING', 'GROSSER PREIS VON ÖSTERREICH'],
    fasciaColours: ['#1e2a5c', '#ffffff', '#ed2939'],
    skirtColour: [0.2, 0.32, 0.16],
    // The circuit sits on the slope; the meadow keeps rising behind it to the north, and the Alps
    // ring the valley 2-4 km out.
    relief(x, z, d) {
      // The hillside keeps rising behind the circuit to the north; the Seetal Alps and the Gleinalpe
      // wall in the valley all round, lower to the south where the Mur valley opens.
      const ang = Math.atan2(z, x), south = 0.55 + 0.45 * Math.max(0, -Math.sin(ang));
      const ridges = 0.7 + 0.3 * Math.sin(ang * 5 + 1.3) + 0.15 * Math.sin(ang * 13);
      const mountains = Math.pow(smooth(280, 820, d), 1.4) * 560 * ridges * south;
      const slope = Math.max(0, -z) * 0.06 * smooth(40, 300, d);
      return mountains + slope + noise(x, z) * 10 * smooth(40, 260, d) + noise(x * 3, z * 3) * 1.5 * smooth(15, 60, d);
    },
    colourAt(x, z, h, slope, d) {
      if (h > 430) return slope > 0.7 ? [0.5, 0.5, 0.48] : [0.34, 0.42, 0.26]; // rock and alpine meadow above the tree line
      if (h > 140) return [0.11, 0.2, 0.1];                                   // spruce-covered mountainsides
      if (d < 30) return [0.34, 0.54, 0.22];
      if (woods(x, z) && d > 50) return [0.12, 0.22, 0.1];
      return noise(x * 1.7, z * 1.7) > 0.35 ? [0.5, 0.56, 0.24] : [0.32, 0.52, 0.2]; // hay meadows and pasture
    },
    // The real stands: few but big, navy Red Bull seats under roofs; the rest of the hillside is grass
    // banks packed with fans.
    stands: [
      { at: 0, side: 'R', W: 320, tiers: 24, build: rbrStand, offset: -30 },    // Start-Ziel Tribüne, opposite the pits
      { at: 4, side: 'outside', W: 220, tiers: 22, build: rbrStand },          // Steiermark Tribüne, T1
      { at: 15, side: 'outside', W: 200, tiers: 22, build: rbrStand },         // Red Bull Tribüne, Remus
      { at: 24, side: 'outside', W: 120, tiers: 16, build: hillStand },        // Schlossgold
      { at: 52, side: 'outside', W: 160, tiers: 18, build: rbrStand },         // Pannorama / T9-T10
    ],

    roads: VENUE.roads,
    landmarks({ L, R, frameAt, kit, terrain, placed, bs }) {
      VENUE.dress({ L, R, kit, bs, placed, frameAt });
      const ps = (k) => L.pointS(k);
      // ---- the Bull of Spielberg: on the hill inside the climb to Remus, facing down to the start ----
      for (const [k, extra] of [[9, 40], [10, 50], [8, 60], [11, 40], [7, 70]]) {
        const i = L.pointSample[k] % L.N, inside = L.k[i] > 0 ? 'L' : 'R';
        const fr = kit.frontage(L.pointS(k), inside, extra);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 60, 26, 3, null);
        if (F) { steelBull(sub(F, 0, -13, Math.PI * 0.85), 1.7); placed.bull = k; break; }
      }
      // ---- hospitality villages, big screens ----
      for (const k of [2, 16, 26, 36, 50]) {
        const s = ps(k), side = L.k[Math.floor(s / L.ds) % L.N] > 0 ? 'R' : 'L';
        const fr = kit.frontage(s, side, 30 + R() * 12);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 60, 30, 3, null);
        if (F) marquees(F, R, 60, 30);
        const g = kit.frontage(s + 30, side, 4);
        const G = kit.lot(g.x, g.z, g.dirX, g.dirZ, 13, 2, 1, null);
        if (G) bigScreen(G);
      }
      // ---- Spielberg village and the farms on the slopes ----
      let farms = 0;
      const [vx, vz] = img(980, 640);
      const C = kit.lot(vx, vz, 0, 1, 12, 28, 3, null);
      if (C) { church(C); placed.church = 1; }
      for (let k = 0; k < 160; k++) {
        const x = vx + (R() - 0.5) * 520, z = vz + (R() - 0.2) * 400;
        if (terrain.distSmooth(x, z) < 120) continue;
        const W = 11 + R() * 5, D = 9 + R() * 3, yaw = R() < 0.5 ? 0 : Math.PI / 2;
        const F = kit.lot(x, z, Math.sin(yaw), Math.cos(yaw), W, D, 3, null);
        if (F) { farmHouse(F, R, W, D); farms++; }
      }
      const b = terrain.bounds;
      for (let k = 0; k < 500 && farms < 260; k++) {
        const x = b.minX + R() * (b.maxX - b.minX), z = b.minZ + R() * (b.maxZ - b.minZ), d = terrain.distSmooth(x, z);
        if (d < 220 || woods(x, z) || terrain.heightAt(x, z) > 300) continue;
        // farmsteads: a house and a barn
        const F = kit.lot(x, z, 0, 1, 13, 10, 3, null);
        if (!F) continue;
        farmHouse(F, R, 13, 10);
        F.box('stucco', 9, 25, 0, 6, -12, 0, rgb(0x6a4a2e));
        F.block('roof', [[9, 0], [25, 0], [25, -12], [9, -12]], [[9, -6], [25, -6], [25, -6], [9, -6]], 6, 10, rgb(0x4a4e54));
        farms++;
      }
      placed.austria = { farms };
    },
    trees: {
      variants: [spruce, spruce, oak, birch],   // no Scots pines: their bare trunks vanish at distance and the crowns float
      attempts: 52000,
      scale: [1.35, 1.1, 1, 1],
      test(x, z, d, h, R) {
        if (d < 22 || h > 700) return -1;
        if (woods(x, z) || h > 120) return R() < 0.94 ? 0 : 3; // Norway spruce forest, the odd birch at the edges
        return R() < 0.015 ? 0 : -1;                           // lone spruces in the meadows
      },
    },
  });
}
