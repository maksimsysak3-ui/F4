import { rgb, scaleC, pick } from '../street/kit.js';
import { standVariety } from './trackside.js';
import { buildRealScene } from './scene.js';
import { venueDressing } from './backOfHouse.js';
import { cheapBlock } from '../street/buildings.js';
import { palm } from '../street/trees.js';
import { grandstand } from '../street/props.js';
import { floodMast, beam } from '../night/venue.js';
import { sub } from '../backstageProps.js';

/*
 * Sakhir at night, handcrafted. The circuit lies in the desert south of Manama, floodlit: towers of
 * lamps all round the lap, the Sakhir Tower by the paddock (a drum of glowing floors under a crown of
 * white tent peaks), the main grandstand and the corner stands roofed in white Bedouin-tent peaks,
 * the paddock's peaked white hospitality tents, palms along the roads and by the buildings, an
 * irrigated green infield with the helipad, sand and limestone everywhere else, and the nodding
 * donkeys of the Awali oil field out in the desert. Huge painted run-offs: the Bahrain calligraphy,
 * the blue mosaic, Rolex; red-and-white kerbs.
 */

const WHITE = rgb(0xf4f2ee), RED = rgb(0xce1126), SAND = rgb(0xd8c4a0), STEEL = rgb(0x8a929e);
const SHIRTS = [RED, WHITE, rgb(0xff8000), rgb(0x1b1b1f), rgb(0x00a19b), rgb(0x1f4f9a), RED, rgb(0xf2c200)];
const WARM = [2.6, 1.9, 1.0];

/** A white tent peak: a square pyramid of fabric on a mast (y0 base height, w base, h height). */
function peak(F, a, b, y0, w, h) {
  F.block('fabric', [[a - w / 2, b + w / 2], [a + w / 2, b + w / 2], [a + w / 2, b - w / 2], [a - w / 2, b - w / 2]], [[a, b], [a, b], [a, b], [a, b]], y0, y0 + h, WHITE);
  F.box('metal', a - 0.08, a + 0.08, y0 + h - 0.2, y0 + h + 2, b - 0.08, b + 0.08, WHITE);
}

/** Sakhir grandstand: tiers under a roof of white tent peaks on steel masts, a lit fascia. */
function sakhirStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: false, style: 'steel', seats: [rgb(0x8a1c1c), rgb(0x6a6e78), RED] });
  const depth = tiers * 0.85 + 1.5, top = 1.2 + tiers * 0.55, y = top + 3.2, w = 10;
  for (let a = -W / 2 + w / 2; a <= W / 2 - w / 2 + 0.01; a += w) for (let b = -w / 2; b > -depth; b -= w) {
    peak(F, a, b, y, w, 4.8);
    F.box('metal', a - w / 2 - 0.1, a - w / 2 + 0.1, 0, y, b - 0.1, b + 0.1, STEEL);
  }
  F.box('stucco', -W / 2, W / 2, y - 0.6, y, 0.2, 1.4, SAND);
  F.box('neon', -W / 2, W / 2, y - 0.7, y - 0.6, 0.6, 1.4, WARM);
  return { ...gs, shirts: SHIRTS };
}
const VARIED = standVariety(sakhirStand, null, SHIRTS);

/** The Sakhir Tower: a drum of nine glowing floors, the peaked tent crown, masts above. */
function sakhirTower(F) {
  const R = 15, n = 9, FL = 4.6;
  F.cylinder('stucco', 0, 0, R + 6, 0, 5, 24, SAND);                                       // the podium
  F.cylinder('glass', 0, 0, R - 1.2, 5, 5 + n * FL, 24, null);                             // the glass drum
  for (let k = 0; k < n; k++) {
    const y = 5 + k * FL;
    F.cylinder('stucco', 0, 0, R + 0.4, y + FL - 0.7, y + FL, 28, rgb(0x6a2a22));          // the floor slab, dark red
    F.cylinder('neon', 0, 0, R + 0.2, y + FL - 1.9, y + FL - 0.7, 28, WARM);               // its band of light
  }
  F.box('stucco', -3, 3, 5, 5 + n * FL, R - 1, R + 0.6, rgb(0x5a2420));                    // the dark vertical spine
  const top = 5 + n * FL;
  F.cylinder('stucco', 0, 0, R + 2, top, top + 1.2, 28, WHITE);
  for (let k = 0; k < 10; k++) { const t = (k / 10) * 6.283; peak(F, Math.cos(t) * (R - 2), Math.sin(t) * (R - 2), top + 1.2, 6.5, 7); }
  peak(F, 0, 0, top + 1.2, 10, 12);
  F.cylinder('neon', 0, 0, R + 2.1, top + 1.1, top + 1.3, 28, [2.8, 2.4, 1.8]);
}

/** Peaked white hospitality tents in rows (the paddock), lit inside. */
function peakTents(F, r, W, D) {
  for (let a = -W / 2 + 5; a < W / 2 - 4; a += 10) for (let b = -5; b > -D + 4; b -= 10) {
    F.box('fabric', a - 4.6, a + 4.6, 0, 3.2, b - 4.6, b + 4.6, WHITE);
    F.face('winLit', a - 4, a + 4, 0.4, 2.8, b + 4.62, [1.6, 1.4, 1.0]);
    peak(F, a, b, 3.2, 9.4, 4.2);
  }
}

/** A nodding-donkey pumpjack: the A-frame, the walking beam with its horse head, the crank. */
function pumpjack(F, r) {
  const yaw = r() * 0.6;
  F.box('concrete', -4, 4, 0, 0.5, -1.5, 1.5, rgb(0x9a948a));
  for (const s of [-0.8, 0.8]) beam(F, 'metal', [-1.5, 0.5, s], [0, 4.6, 0], 0.18, rgb(0x5a5e66));
  beam(F, 'metal', [-4.2, 4.9 + yaw, 0], [3.6, 4.9 - yaw, 0], 0.35, rgb(0xb8a038));
  F.box('metal', 3.4, 4.4, 3.4 - yaw, 5.4 - yaw, -0.4, 0.4, rgb(0xb8a038));               // the horse head
  F.box('metal', -4.6, -3, 1, 2.6, -0.6, 0.6, rgb(0x6a6e74));                              // the crank weights
  beam(F, 'metal', [4, 3.4, 0], [4, 0.5, 0], 0.05, rgb(0x2a2a2e));
}

const VENUE = venueDressing({
  pitSide: 'R', paddock: [-260, 50], tunnel: 170, ring: 170, exits: [0.12, 0.45, 0.75],
  palette: [0xf2f2ee, 0xf2f2ee, 0x1b1b1f, 0xc0c4c8, 0x8a1418, 0x2a4a8a, 0x5a5e64],
  mix: { car: 6, van: 1.5, bus: 1, truck: 0.6 }, density: 10,
  bus: rgb(0xce1126), gate: rgb(0xce1126), heli: rgb(0xce1126), hoarding: rgb(0xce1126), crane: rgb(0xf2c200),
  liveries: [rgb(0xce1126), rgb(0xa8853a), rgb(0xf2f2ee)], busTerminals: 2, sites: 1, hospitality: 7,
  concessions: [8, 26, 44, 62], carParks: 10,
});

export function buildBahrainScene(L) {
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const noise = (x, z) => Math.sin(x * 0.013 + 0.3) * Math.cos(z * 0.011 + 0.8) * 0.6 + Math.sin(x * 0.033 - z * 0.027) * 0.4;
  const img = (px, py) => L.fromImage(px, py);
  const [hx, hz] = img(690, 440); // the helipad, in the irrigated infield
  const green = (x, z) => Math.hypot(x - hx, z - hz) < 95;

  return buildRealScene(L, {
    name: 'Bahrain',
    seed: 2004,
    life: { paddock: true, parks: 12, villages: true, paths: true },
    margin: 800,
    windowGlow: 0.6,
    trackside: { standBuild: sakhirStand, shirts: SHIRTS, suburb: 0, standSpacing: 300, hoardingSpacing: 110, skyline: { count: 0 } },
    pitTheme: {
      wall: rgb(0xe8e0d0),
      upper(F, hw, i, rc, { H1, DEPTH }) {
        const top = H1 + 4;
        F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -1.0, SAND);
        F.face(i % 2 ? 'winLit' : 'glass', -hw + 0.3, hw - 0.3, H1 + 0.4, top - 0.4, -0.98, [1.4, 1.2, 0.9]);
        F.box('trim', -hw, hw, top, top + 0.4, -DEPTH, 1.6, RED);
        F.box('neon', -hw, hw, top - 0.15, top, 1.4, 1.6, WARM);
        if (rc) peak(F, 0, -DEPTH / 2, top + 0.4, Math.min(2 * hw, 10), 4.5);
      },
    },
    style: {
      kerb: [RED, WHITE],
      runoff: 'brand', runoffFull: true, runoffFields: 16, runoffBoth: 3, runoffHero: 'BAHRAIN CALLIGRAPHY', runoffPlace: [[15, 'BAHRAIN MOSAIC'], [35, 'ROLEX']], runoffFloor: [0.5, 0.41, 0.3], // sand-coloured tarmac
      barrier: 'jersey', fence: true, lamps: 'flood', floodEvery: 12, verge: 'paving', grass: rgb(0xcfb488), // desert: the verges are sand, not grass
      title: ['SAKHIR', 'BAHRAIN GRAND PRIX', '#ce1126', '#ffffff', '#a8853a'],
      roadName: 'BAHRAIN',
      bannerGlow: 0.45,
      boardBorder: '#ce1126',
    },
    fascia: ['BAHRAIN INTERNATIONAL CIRCUIT', 'BAHRAIN GRAND PRIX'],
    fasciaColours: ['#ce1126', '#ffffff', '#a8853a'],
    skirtColour: [0.42, 0.36, 0.28],
    groundKind: 'sand',
    // The desert: low dunes and limestone ridges, the land falling gently to the south.
    relief(x, z, d) {
      return (noise(x * 0.6, z * 0.6) * 6 + Math.max(0, noise(x * 0.25 + 11, z * 0.25) - 0.3) * 30) * smooth(50, 300, d) + noise(x * 3, z * 3) * 0.6;
    },
    colourAt(x, z, h, slope, d) {
      if (green(x, z)) return [0.26, 0.46, 0.2];
      if (d < 28) return [0.48, 0.44, 0.38];
      if (slope > 0.35) return [0.66, 0.58, 0.46];  // limestone faces
      return noise(x * 2, z * 2) > 0.3 ? [0.82, 0.7, 0.52] : [0.76, 0.64, 0.46];
    },
    stands: [
      { at: 0, side: 'L', W: 320, tiers: 24, build: sakhirStand, offset: -40 }, // the Main Grandstand
      { at: 5, side: 'outside', W: 160, tiers: 20, build: sakhirStand },       // Turn 1
      { at: 15, side: 'outside', W: 140, tiers: 18, build: sakhirStand },      // Turn 4 (Batelco)
      { at: 23, side: 'outside', W: 110, tiers: 16, build: VARIED },
      { at: 29, side: 'outside', W: 120, tiers: 16, build: VARIED },
      { at: 58, side: 'outside', W: 140, tiers: 18, build: sakhirStand },      // Turn 14
    ],
    roads: VENUE.roads,
    landmarks({ L, R, frameAt, kit, terrain, placed, bs }) {
      VENUE.dress({ L, R, kit, bs, placed, frameAt });
      const ps = (k) => L.pointS(k);
      // ---- the Sakhir Tower, behind the pit building ----
      for (const extra of [70, 90, 110, 130]) {
        const fr = kit.frontage(ps(0) - 120, 'R', extra);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 46, 46, 3, null);
        if (F) { sakhirTower(sub(F, 0, -23)); placed.tower = extra; break; }
      }
      // ---- the paddock's peaked hospitality tents, the helipad in the green infield ----
      let tents = 0;
      for (const [s, side, extra] of [[ps(0) - 40, 'R', 36], [ps(0) + 120, 'R', 40], [ps(68), 'R', 40], [ps(2), 'L', 50], [ps(44), 'R', 30]]) {
        const fr = kit.frontage(s, side, extra), F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 60, 32, 2, null);
        if (F) { peakTents(F, R, 60, 32); tents++; }
      }
      {
        const H = frameAt(hx, hz, 0, terrain.heightAt(hx, hz) + 0.05);
        H.cylinder('stucco', 0, 0, 14, -0.3, 0.06, 24, rgb(0xe8e4dc));
        H.cylinder('stucco', 0, 0, 12, 0.06, 0.08, 24, RED);
        H.cylinder('stucco', 0, 0, 10.6, 0.08, 0.1, 24, rgb(0xe8e4dc));
        H.box('stucco', -1.2, 1.2, 0.1, 0.12, -6, 6, RED); H.box('stucco', -6, 6, 0.1, 0.12, -1.2, 1.2, RED);
        for (let k = 0; k < 16; k++) { const t = (k / 16) * 6.283; H.box('neon', Math.cos(t) * 14.4 - 0.2, Math.cos(t) * 14.4 + 0.2, 0, 0.3, Math.sin(t) * 14.4 - 0.2, Math.sin(t) * 14.4 + 0.2, [2.4, 2.2, 1.4]); }
        kit.footprints.push({ cx: hx, cz: hz, ux: 1, uz: 0, hw: 16, hd: 16 });
        placed.helipad = 1;
      }
      // ---- floodlight towers right round the lap ----
      let masts = 0;
      for (let s = 30, m = 0; s < L.length; s += 70, m++) {
        const fr = kit.frontage(s, m % 2 ? 'R' : 'L', 6), F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 5, 5, 0.5, null);
        if (F) { floodMast(F, R, 36 + R() * 8); masts++; }
      }
      // ---- palms: along the access roads and round every building ----
      let palms = 0;
      for (const side of ['L', 'R']) for (let s = 0; s < L.length; s += 24) {
        const fr = kit.frontage(s, side, 10 + R() * 6);
        if (!kit.isFree(fr.x, fr.z, 1.5) || kit.overlaps({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 1.5, hd: 1.5 })) continue;
        palm(frameAt(fr.x, fr.z, R() * 6.28), R, 8 + R() * 4); palms++;
      }
      // ---- the circuit's buildings in the desert: low sand-coloured blocks with arched arcades ----
      let blocks = 0, jacks = 0;
      const b = terrain.bounds;
      for (let k = 0; k < 600; k++) {
        const x = b.minX + R() * (b.maxX - b.minX), z = b.minZ + R() * (b.maxZ - b.minZ), d = terrain.distSmooth(x, z);
        if (d < 120) continue;
        if (d > 360 && jacks < 26 && R() < 0.5) { const F = kit.lot(x, z, 1, 0, 10, 4, 3, null); if (F) { pumpjack(F, R); jacks++; } continue; }
        if (d > 320 || blocks > 40) continue;
        const W = 30 + R() * 30, D = 16 + R() * 12, F = kit.lot(x, z, 0, 1, W, D, 3, null);
        if (!F) continue;
        cheapBlock(F, R, W, D, 1 + Math.floor(R() * 3), { wall: pick(R, [rgb(0xe0ccaa), rgb(0xd8c49c), rgb(0xece0c8)]), style: 'sand', flat: true, trim: rgb(0xc8b088) });
        for (let a = -W / 2 + 2; a < W / 2 - 1; a += 4) F.box('neon', a - 0.2, a + 0.2, 0.3, 0.6, 0.05, 0.3, WARM);
        blocks++;
      }
      placed.bahrain = { tents, masts, palms, blocks, jacks };
    },
    trees: {
      variants: [palm, (F, r) => F.blob('leaf', 0, 0, 1.2 + r(), 0, 1.4 + r(), 6, pick(r, [rgb(0x6a6a44), rgb(0x7a7048)]))],
      attempts: 9000,
      scale: [1, 1],
      test(x, z, d, h, R) {
        if (d < 16) return -1;
        if (green(x, z)) return R() < 0.25 ? 0 : -1;
        return d < 200 ? (R() < 0.08 ? 0 : R() < 0.15 ? 1 : -1) : (R() < 0.05 ? 1 : -1); // palms near, desert scrub beyond
      },
    },
  });
}
