import { rgb, scaleC, pick } from '../street/kit.js';
import { standVariety, standBack } from './trackside.js';
import { buildRealScene } from './scene.js';
import { venueRoads, venueBackOfHouse } from './backOfHouse.js';
import { sub, VEHICLES, lightMast } from '../backstageProps.js';
import { cheapBlock } from '../street/buildings.js';
import { palm } from '../street/trees.js';
import { grandstand } from '../street/props.js';
import { floodMast, beam } from '../night/venue.js';
import { createSkyline, skin, tower, rect, ngon } from './sgCity.js';
import { signMaterial, placeSign, letter } from './signs.js';

/*
 * Lusail at night, handcrafted. The desert north of Doha, flat and pale, the lap ringed by floodlight
 * towers (thousands of lamps make it the brightest night circuit). On the main straight the long
 * white pit and paddock building, colonnaded in slim white columns, its floors glowing; the covered
 * main grandstand opposite; corner stands of plain steel; sand, a little scrub and a few palms by the
 * buildings; the Lusail skyline far off to the south, the Katara Towers' twin crescents, the Lusail
 * stadium's golden bowl. Maroon-magenta Qatar Airways run-offs with orange bands, white-and-maroon
 * kerbs.
 */

const WHITE = rgb(0xf4f2ee), MAROON = rgb(0x8a1538), SAND = rgb(0xd8c4a0), STEEL = rgb(0x8a929e);
const SHIRTS = [MAROON, WHITE, rgb(0xff8000), rgb(0x1b1b1f), rgb(0x00a19b), rgb(0x1f4f9a), rgb(0xe8002d), rgb(0xf2c200)];
const WARM = [2.6, 1.9, 1.0];

/** A white tent peak (a square pyramid of fabric) with its mast. */
function peak(F, a, b, y0, w, h) {
  F.block('fabric', [[a - w / 2, b + w / 2], [a + w / 2, b + w / 2], [a + w / 2, b - w / 2], [a - w / 2, b - w / 2]], [[a, b], [a, b], [a, b], [a, b]], y0, y0 + h, WHITE);
  F.box('metal', a - 0.08, a + 0.08, y0 + h - 0.2, y0 + h + 2.2, b - 0.08, b + 0.08, WHITE);
}

/**
 * Lusail's giant stand: deep maroon-and-white tiers under a canopy of white Bedouin-tent peaks on
 * steel masts, a maroon fascia with a warm light line, the back clad in white with lit concourses.
 */
function lusailStand(F, r, W, tiers, o = {}) {
  const gs = grandstand(F, r, W, tiers, { roof: false, style: 'steel', seats: [MAROON, WHITE, rgb(0x6a1a3a)] });
  const depth = tiers * 0.85 + 1.5, top = 1.2 + tiers * 0.55, y = top + 3.4, w = 10;
  if (o.roof !== false) {
    for (let a = -W / 2 + w / 2; a <= W / 2 - w / 2 + 0.01; a += w) for (let b = -w / 2; b > -depth; b -= w) {
      peak(F, a, b, y, w, 5);
      F.box('metal', a - w / 2 - 0.1, a - w / 2 + 0.1, 0, y, b - 0.1, b + 0.1, STEEL);
    }
    F.box('stucco', -W / 2, W / 2, y - 0.7, y, 0.2, 1.4, MAROON);
    F.box('neon', -W / 2, W / 2, y - 0.8, y - 0.7, 0.6, 1.4, WARM);
  }
  if (tiers >= 14) standBack(F, W, tiers, WHITE);
  return { ...gs, shirts: SHIRTS };
}
const VARIED = standVariety(lusailStand, null, SHIRTS);

/** The Katara Towers: two crescent blades facing each other, lit gold. */
function kataraTowers(S, F, r) {
  for (const s of [-1, 1]) {
    const pts = [];
    for (let k = 0; k <= 10; k++) { const t = (k / 10) * Math.PI * 0.9 - Math.PI * 0.45; pts.push([s * (18 + Math.cos(t) * 26), Math.sin(t) * 34]); }
    for (let k = 10; k >= 0; k--) { const t = (k / 10) * Math.PI * 0.9 - Math.PI * 0.45; pts.push([s * (18 + Math.cos(t) * 18), Math.sin(t) * 26]); }
    skin(S, F, 'sg2', pts, 0, 210, r);
    F.box('neon', s * 30 - 0.4, s * 30 + 0.4, 0, 210, -0.4, 0.4, [2.8, 2.0, 0.9]);
  }
}

/** The Lusail stadium: a golden bowl of lattice under the night sky. */
function lusailStadium(F) {
  F.cylinder('stucco', 0, 0, 120, 0, 8, 40, rgb(0x3a3024));
  for (let k = 0; k < 6; k++) F.cylinder(k % 2 ? 'neon' : 'copper', 0, 0, 122 + k * 0.6 - k * k * 0.4, 8 + k * 7, 15 + k * 7, 48, k % 2 ? [2.4, 1.7, 0.7] : rgb(0xb88a3a));
  F.cylinder('neon', 0, 0, 108, 50, 51, 48, [2.6, 2.2, 1.4]);
}

const VENUE = {
  pitSide: 'R', paddock: [-280, 60], tunnel: 190, ring: 190, exits: [0.1, 0.4, 0.7],
  palette: [0xf2f2ee, 0xf2f2ee, 0xf2f2ee, 0xc0c4c8, 0x1b1b1f, 0x8a1538, 0xd8d0b8],
  mix: { car: 5, pickup: 3, van: 1, bus: 0.8, truck: 0.4 }, density: 10,
  bus: rgb(0x8a1538), gate: rgb(0x8a1538), heli: rgb(0x8a1538), hoarding: rgb(0x8a1538), crane: rgb(0xf2c200),
  liveries: [rgb(0x8a1538), WHITE, rgb(0x1b1b1f)], busTerminals: 2, sites: 1, hospitality: 8,
  concessions: [10, 30, 50, 66],
};

/** Car parks along the perimeter road: rows of cars on tarmac, lamp masts, trees on the islands. */
function carParks(bs, net, R, n) {
  const CARS = [0xf2f2ee, 0xf2f2ee, 0xf2f2ee, 0xc0c4c8, 0xc0c4c8, 0x1b1b1f, 0x1b1b1f, 0x5a5e64, 0x8a1418, 0x2a3a6a].map(rgb);
  let lots = 0;
  for (const F of bs.roadside(net.ring, { side: 'out', W: 100, D: 50, every: 90, count: n, margin: 4, apron: [0.42, 0.42, 0.42] })) {
    for (let b = -5; b > -47; b -= 11) for (let a = -46; a < 46; a += 2.9) for (const o of [0, -5.2]) if (R() < 0.78) VEHICLES.car(sub(F, a, b + o, o ? Math.PI : 0), pick(R, CARS), 'stucco');
    for (const a of [-30, 30]) lightMast(sub(F, a, -26));
    lots++;
  }
  return lots;
}

export function buildQatarScene(L) {
  let net = {};
  const noise = (x, z) => Math.sin(x * 0.013 + 0.3) * Math.cos(z * 0.011 + 0.8) * 0.6 + Math.sin(x * 0.033 - z * 0.027) * 0.4;
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

  return buildRealScene(L, {
    name: 'Qatar',
    seed: 2021,
    life: { paddock: true, parks: 6, villages: true, paths: true },
    margin: 900,
    windowGlow: 0.6,
    trackside: { standBuild: lusailStand, shirts: SHIRTS, suburb: 0, standSpacing: 420, hoardingSpacing: 140, skyline: { count: 0 } },
    pitTheme: {
      wall: rgb(0xf0ece4),
      upper(F, hw, i, rc, { H1, DEPTH }) {
        // Three white floors behind a screen of slim white columns, glass glowing, a thin flat roof.
        for (let f = 0; f < 3; f++) {
          const y = H1 + f * 3.8;
          F.box('stucco', -hw, hw, y, y + 0.5, -DEPTH + 0.6, 0.8, WHITE);                    // the slab, a balcony edge
          F.face(f === 1 || i % 3 ? 'winLit' : 'glass', -hw + 0.2, hw - 0.2, y + 0.5, y + 3.8, -1.6, [1.5, 1.3, 1.0]);
          F.box('glass', -hw, hw, y + 0.5, y + 1.5, 0.6, 0.7, null);                         // the glass balustrade
        }
        const top = H1 + 11.4;
        for (let a = -hw + 1; a <= hw; a += 3) F.box('stucco', a - 0.3, a + 0.3, H1, top, 0.2, 0.8, WHITE);
        F.box('stucco', -hw, hw, top, top + 0.7, -DEPTH, 2.4, WHITE);
        F.box('neon', -hw, hw, top - 0.1, top, 2.0, 2.4, WARM);
      },
    },
    style: {
      kerb: [MAROON, WHITE],
      runoff: 'brand', runoffFull: true, runoffFields: 7, runoffBoth: 1, runoffHero: 'QATAR AIRWAYS FIELD', runoffFloor: scaleC(rgb(0x6a1a3a), 0.9),
      runoffBand: { colour: rgb(0xf07a1e), width: 1.2 }, grass: scaleC(rgb(0x6a1a3a), 0.9), // maroon run-off edged in orange
      barrier: 'jersey', fence: true, lamps: 'flood', floodEvery: 8, verge: 'paving',
      title: ['LUSAIL', 'QATAR GRAND PRIX', '#8a1538', '#ffffff', '#c8a24b'],
      roadName: 'QATAR',
      bannerGlow: 0.45,
      boardBorder: '#8a1538',
    },
    fascia: ['LUSAIL INTERNATIONAL CIRCUIT', 'QATAR GRAND PRIX'],
    fasciaColours: ['#8a1538', '#ffffff', '#c8a24b'],
    skirtColour: [0.42, 0.36, 0.28],
    groundKind: 'sand',
    relief(x, z, d) {
      return (noise(x * 0.5, z * 0.5) * 3 + Math.max(0, noise(x * 0.2 + 7, z * 0.2) - 0.4) * 10) * smooth(60, 400, d) + noise(x * 3, z * 3) * 0.3;
    },
    colourAt(x, z, h, slope, d) {
      if (d < 26) return [0.44, 0.4, 0.34];
      return noise(x * 2, z * 2) > 0.35 ? [0.8, 0.7, 0.54] : [0.74, 0.64, 0.48];
    },
    stands: [
      { at: 0, side: 'L', W: 320, tiers: 34, build: VARIED, offset: -40 },  // the main grandstand, opposite the pits
      { at: 4, side: 'outside', W: 180, tiers: 30, build: VARIED },          // T1
      { at: 20, side: 'outside', W: 150, tiers: 28, build: VARIED },
      { at: 34, side: 'outside', W: 150, tiers: 28, build: VARIED },
      { at: 60, side: 'outside', W: 170, tiers: 30, build: VARIED },         // T16
    ],
    roads(ctx) { net = venueRoads(ctx, VENUE); },
    landmarks({ L, R, frameAt, kit, terrain, placed, group, bs }) {
      venueBackOfHouse({ L, R, kit, bs, placed, frameAt }, net, VENUE);
      placed.carParks = carParks(bs, net, R, 12);
      const S = createSkyline();
      // ---- the lap board: a tall screen tower by the straight, QATAR AIRWAYS over the lap counter ----
      const qa = signMaterial((g, W, H) => {
        const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#9a1a6a'); gr.addColorStop(1, '#c0307a');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        letter(g, 'QATAR AIRWAYS', W / 2, H / 2, H * 0.5, '#ffffff', { family: 'Georgia, "Times New Roman", serif', font: '700', max: W * 0.86 });
      }, { W: 1024, H: 192, lit: 1.2 });
      const laps = signMaterial((g, W, H) => {
        g.fillStyle = '#06060a'; g.fillRect(0, 0, W, H);
        letter(g, '57 LAPS', W / 2, H / 2, H * 0.62, '#f4f4f2', { family: '"Arial Black", Arial, sans-serif', max: W * 0.8 });
        g.fillStyle = 'rgba(0,0,0,0.35)'; for (let y = 0; y < H; y += 5) g.fillRect(0, y, W, 2);
      }, { W: 768, H: 192, basic: true });
      let boards = 0;
      for (const [s, side, extra] of [[L.pointS(1) - 120, 'R', 9], [L.pointS(74) + 60, 'L', 9]]) {
        const fr = kit.frontage(s, side, extra), i = fr.i;
        const F = frameAt(fr.x, fr.z, Math.atan2(-L.tx[i], -L.tz[i]), terrain.heightAt(fr.x, fr.z)); // facing the oncoming cars
        F.box('metal', -0.5, 0.5, 0, 14, -0.5, 0.5, rgb(0x2a2a30));
        F.box('metal', -9, 9, 14, 22.5, -0.8, 0.4, rgb(0x1a1a20));
        placeSign(group, F, 0, 20, 0.42, 17, 3.2, qa);
        placeSign(group, F, 0, 16, 0.42, 12, 3.2, laps);
        kit.footprints.push({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 9, hd: 2 });
        boards++;
      }
      placed.lapBoards = boards;
      // ---- the floodlight towers: a ring of them both sides of the whole lap ----
      let masts = 0;
      for (const side of ['L', 'R']) for (let s = side === 'L' ? 20 : 55, m = 0; s < L.length; s += 72, m++) {
        const fr = kit.frontage(s, side, 7), F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 5, 5, 0.5, null);
        if (F) { floodMast(F, R, 34 + R() * 6); masts++; }
      }
      // ---- palms and low sand-coloured buildings by the paddock and the entrances ----
      let palms = 0, blocks = 0;
      for (const side of ['L', 'R']) for (let s = 0; s < L.length; s += 40) {
        if (R() < 0.55) continue;
        const fr = kit.frontage(s, side, 14 + R() * 8);
        if (!kit.isFree(fr.x, fr.z, 1.5) || kit.overlaps({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 1.5, hd: 1.5 })) continue;
        palm(frameAt(fr.x, fr.z, R() * 6.28), R, 8 + R() * 4); palms++;
      }
      const b = terrain.bounds;
      for (let k = 0; k < 400 && blocks < 26; k++) {
        const x = b.minX + R() * (b.maxX - b.minX), z = b.minZ + R() * (b.maxZ - b.minZ), d = terrain.distSmooth(x, z);
        if (d < 110 || d > 300) continue;
        const W = 34 + R() * 30, D = 18 + R() * 12, F = kit.lot(x, z, 0, 1, W, D, 3, null);
        if (!F) continue;
        cheapBlock(F, R, W, D, 1 + Math.floor(R() * 2), { wall: pick(R, [rgb(0xe8dcc4), rgb(0xf0e8d8), rgb(0xd8c8a8)]), style: 'sand', flat: true, trim: MAROON });
        for (let a = -W / 2 + 2; a < W / 2 - 1; a += 4) F.box('neon', a - 0.2, a + 0.2, 0.3, 0.6, 0.05, 0.3, WARM);
        blocks++;
      }
      // ---- the Lusail skyline far to the south: towers, the Katara crescents, the stadium ----
      const cx = (b.minX + b.maxX) / 2, far = b.maxZ + 500;
      let towers = 0;
      for (let k = 0; k < 46; k++) {
        const x = cx + (R() - 0.5) * 2400, z = far + R() * 500;
        const F = frameAt(x, z, Math.PI, 0);
        tower(S, F, R, pick(R, ['slab', 'round', 'setback', 'twin', 'hotel']), 26 + R() * 20, 22 + R() * 16, 70 + R() * R() * 180);
        towers++;
      }
      kataraTowers(S, frameAt(cx + 600, far + 200, Math.PI, 0), R);
      lusailStadium(frameAt(cx - 700, far + 160, 0, 0));
      group.add(S.build());
      placed.qatar = { masts, palms, blocks, towers };
    },
    trees: {
      variants: [palm, (F, r) => F.blob('leaf', 0, 0, 0.9 + r() * 0.8, 0, 1 + r(), 6, pick(r, [rgb(0x6a6a44), rgb(0x7a7048)]))],
      attempts: 5000,
      scale: [1, 1],
      test(x, z, d, h, R) {
        if (d < 22) return -1;
        return d < 220 ? (R() < 0.04 ? 0 : R() < 0.12 ? 1 : -1) : (R() < 0.05 ? 1 : -1); // a bare desert: scrub, the odd palm
      },
    },
  });
}
