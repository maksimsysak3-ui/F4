import { rgb, scaleC, pick } from '../street/kit.js';
import { standVariety } from './trackside.js';
import { buildRealScene } from './scene.js';
import { cheapBlock } from '../street/buildings.js';
import { palm } from '../street/trees.js';
import { grandstand } from '../street/props.js';
import { oak } from './hungaroringScene.js';
import { floodMast, beam } from '../night/venue.js';
import { createSkyline, tower, streetBuilding, park, supertrees, helix, lotus } from './sgCity.js';
import { Frame } from '../street/kit.js';
import { FACADES } from './facades.js';
import { sub, VEHICLES } from '../backstageProps.js';

/*
 * Marina Bay at night, handcrafted. The circuit threads the heart of Singapore under floodlights:
 * the pit straight and the Flyer's glowing rim, the run under the Benjamin Sheares Bridge, Raffles
 * Boulevard between the Marina Centre hotels, the Esplanade's spiky domes, the Padang and City
 * Hall, the Anderson Bridge over the river, and the bayfront to the floating platform. Across the
 * bay the three towers of Marina Bay Sands under their SkyPark, the CBD towers packed behind, the
 * lit expressways overhead. Concrete walls and debris fences right at the kerbs, blue-and-gold
 * Singapore Airlines run-offs, palms and rain trees along every boulevard.
 */

const WHITE = rgb(0xf4f4f2), RED = rgb(0xef3340), GOLD = rgb(0xf2b31b), BLUE = rgb(0x1d2a6a), STEEL = rgb(0x8a929e);
const SHIRTS = [RED, WHITE, rgb(0x1b1b1f), rgb(0xff8000), rgb(0x00a19b), rgb(0x1f4f9a), GOLD, rgb(0x2a2a30)];
const NIGHT = (c, k = 0.3) => scaleC(c, k);
const LED = [[2.6, 2.6, 2.5], [0.6, 1.8, 3.0], [2.8, 0.7, 2.2], [2.8, 2.0, 0.8], [0.4, 2.4, 1.6]];

function sgStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: true, style: 'steel', seats: [rgb(0x1d2a6a), rgb(0x2a2a30)], led: [0.4, 0.6, 1.6] });
  return { ...gs, shirts: SHIRTS };
}
const VARIED = standVariety(sgStand, null, SHIRTS);

/** A night tower: dark glass with lit floors (the facade's own glow), an LED crown, the aviation light. */
function nightTower(F, r, W, D, floors) {
  cheapBlock(F, r, W, D, floors, { wall: NIGHT(pick(r, [rgb(0x6a7a8a), rgb(0x8a98a8), rgb(0x5a6a7a), rgb(0x9aa4ae)]), 0.5), style: 'glass', flat: true, trim: rgb(0x2a2e36) });
  const H = 3.4 + floors * 3.1, c = pick(r, LED);
  F.box('neon', -W / 2 - 0.1, W / 2 + 0.1, H + 0.4, H + 0.9, -D - 0.1, 0.1, c);
  if (r() < 0.4) for (const a of [-W / 2, W / 2]) F.box('neon', a - 0.15, a + 0.15, 4, H, -0.15, 0.15, scaleC(c, 0.7));
  if (r() < 0.3) F.box('stucco', -W / 4, W / 4, H + 0.9, H + 7, -D * 0.7, -D * 0.3, rgb(0x2a2e36));
  F.box('neon', -0.3, 0.3, H + 0.9, H + 1.5, -D / 2 - 0.3, -D / 2 + 0.3, [3, 0.3, 0.2]);
}

/** Shophouse row: three storeys of pastel facades with louvred windows, lit five-foot-way arcade. */
function shophouses(F, r, W, D) {
  for (let a = -W / 2; a < W / 2 - 4; a += 5.5) {
    const col = pick(r, [rgb(0xe8c8a0), rgb(0xc8e0d0), rgb(0xf0d0d8), rgb(0xe0d8a0), rgb(0xc8d8f0), rgb(0xf2f0e8)]);
    F.box('stucco', a, a + 5.4, 0, 10, -D, 0, NIGHT(col, 0.5));
    F.face('winLit', a + 0.6, a + 4.8, 0.3, 2.8, 0.02, [1.6, 1.2, 0.7]);
    for (const y of [4, 7.2]) F.face(r() < 0.6 ? 'winLit' : 'glass', a + 1, a + 4.4, y, y + 1.8, 0.02, [1.4, 1.1, 0.7]);
    F.block('roof', [[a, 0], [a + 5.4, 0], [a + 5.4, -D], [a, -D]], [[a, -D / 2], [a + 5.4, -D / 2], [a + 5.4, -D / 2], [a, -D / 2]], 10, 12.5, rgb(0x6a3a2a));
  }
}

/** Marina Bay Sands: three 55-storey towers on splayed legs, the SkyPark ship across their tops. */
function marinaBaySands(F, S) {
  const H = 194, glass = NIGHT(rgb(0x8a9aaa), 0.45), G = new Frame(S.mb, F.o[0], F.o[1], F.o[2], F.r[0], F.r[1]);
  const slab = (a0, a1, b0, b1, b0t, b1t) => { // a slab whose depth range leans from (b0,b1) at the base to (b0t,b1t) at the top
    const P = (a, y, b) => G.at(a, y, b);
    const h = H / (3.5 * 64), w = (a1 - a0) / (1.6 * 64);
    for (const [pa, pb, qa, qb] of [[a0, b1, a1, b1], [a1, b0, a0, b0]]) {
      const top = pb === b1 ? b1t : b0t;
      G.mb.quadUV('sg2', P(pa, 0, pb), P(qa, 0, qb), P(qa, H, top), P(pa, H, top), [0, 0], [w, 0], [w, h], [0, h]);
    }
    F.block('stucco', [[a0 + 0.6, b0 + 0.6], [a1 - 0.6, b0 + 0.6], [a1 - 0.6, b1 - 0.6], [a0 + 0.6, b1 - 0.6]], [[a0 + 0.6, b0t + 0.6], [a1 - 0.6, b0t + 0.6], [a1 - 0.6, b1t - 0.6], [a0 + 0.6, b1t - 0.6]], 0, H, scaleC(glass, 0.5)); // core, inside the lit skin
    // the ends of each slab, lit too
    for (const a of [a0, a1]) G.mb.quadUV('sg2', P(a, 0, b0), P(a, 0, b1), P(a, H, b1t), P(a, H, b0t), [0, 0], [(b1 - b0) / 102, 0], [(b1 - b0) / 102, h], [0, h]);
  };
  for (const a of [-75, 0, 75]) {
    slab(a - 16, a + 16, -36, -20, -26, -10); // the leaning leg
    slab(a - 16, a + 16, -8, 8, -8, 8);       // the upright leg
    F.box('neon', a - 16.2, a + 16.2, H - 1, H, -27, 9, [0.5, 1.2, 3.0]);
  }
  // The SkyPark: a 340 m ship laid across the three towers, cantilevered out at the north end.
  F.block('stucco', [[-115, -26], [140, -26], [150, 0], [140, 10], [-115, 10]], [[-115, -26], [140, -26], [150, 0], [140, 10], [-115, 10]], H, H + 12, rgb(0x5a5e66));
  for (const b of [-25, 9]) F.box('neon', -115, 150, H - 0.3, H + 0.3, b - 0.3, b + 0.3, [2.2, 2.4, 2.8]); // the underside edges, lit
  F.box('winLit', -110, 135, H + 2, H + 10, 10.05, 10.2, [0.9, 0.8, 0.6]);
  F.box('neon', -115, 150, H + 11.6, H + 12.2, 9.8, 10.4, [1.6, 2.2, 3.2]);
  F.box('neon', -115, 150, H + 11.6, H + 12.2, -26.4, -25.8, [1.6, 2.2, 3.2]);
  for (let a = -100; a < 130; a += 14) F.blob('leaf', a, -8, 3, H + 12, H + 17, 6, rgb(0x1a3a22));
  F.box('stucco', -140, 140, 0, 20, -60, 30, NIGHT(rgb(0xd8d4cc), 0.2)); // the podium, the mall and the theatres
  F.face('winLit', -138, 138, 2, 7, 30.02, [0.9, 0.75, 0.5]);
  for (let a = -138; a < 138; a += 6) F.box('stucco', a, a + 0.4, 0, 20, 30, 30.6, rgb(0x3a3e46)); // the podium's fins
}

/** The Singapore Flyer: a 150 m wheel on its terminal, the rim lit in magenta and violet. */
function flyer(F) {
  const R = 75, cy = 90, n = 48;
  for (const z of [-3, 3]) for (let k = 0; k < n; k++) {
    const t0 = (k / n) * 6.283, t1 = ((k + 1) / n) * 6.283;
    beam(F, 'neon', [Math.cos(t0) * R, cy + Math.sin(t0) * R, z], [Math.cos(t1) * R, cy + Math.sin(t1) * R, z], 0.6, k % 2 ? [2.6, 0.5, 2.2] : [1.6, 0.5, 2.8]);
    if (k % 2 === 0) beam(F, 'metal', [0, cy, z * 0.3], [Math.cos(t0) * R, cy + Math.sin(t0) * R, z], 0.15, STEEL);
  }
  for (let k = 0; k < 28; k++) { const t = (k / 28) * 6.283, x = Math.cos(t) * (R + 3), y = cy + Math.sin(t) * (R + 3); F.blob('neon', x, 0, 2.6, y - 2.6, y + 2.6, 8, [1.8, 2.0, 2.4]); }
  for (const s of [-1, 1]) for (const z of [-7, 7]) beam(F, 'metal', [s * 26, 18, z], [0, cy, z * 0.5], 2.2, STEEL);
  F.box('stucco', -60, 60, 0, 18, -24, 24, NIGHT(WHITE, 0.4));
  F.face('winLit', -58, 58, 2, 16, 24.02, [1.3, 1.3, 1.5]);
}

/** The Esplanade theatres: two spiky shells (the "durians") on a podium. */
function durian(F, a, R0) {
  F.blob('metal', a, 0, R0, 0, R0 * 0.85, 12, NIGHT(rgb(0xb8b4a8), 0.55));
  for (let i = 0; i < 18; i++) for (let j = 1; j < 5; j++) {
    const t = (i / 18) * 6.283 + j * 0.17, p = (j / 5) * 1.3, r = R0 * Math.cos(p) * 0.98, y = R0 * 0.85 * Math.sin(p) * 0.98;
    F.box('neon', a + Math.cos(t) * r - 0.5, a + Math.cos(t) * r + 0.5, y, y + 0.8, Math.sin(t) * r - 0.5, Math.sin(t) * r + 0.5, [2.2, 1.8, 1.2]);
  }
}

/** Colonial landmark: white neoclassical block with a colonnade and a dome (City Hall / the old Supreme Court). */
function colonial(F, W, D, dome) {
  F.box('stucco', -W / 2, W / 2, 0, 18, -D, 0, NIGHT(WHITE, 0.6));
  for (let a = -W / 2 + 3; a < W / 2 - 2; a += 4) F.cylinder('stucco', a, 2.2, 0.9, 0, 15, 10, NIGHT(WHITE, 0.75));
  F.box('stucco', -W / 2, W / 2, 15, 18, -1, 3.2, NIGHT(WHITE, 0.7));
  F.face('winLit', -W / 2 + 1, W / 2 - 1, 1, 12, 0.02, [1.6, 1.3, 0.9]);
  if (dome) { F.cylinder('stucco', 0, -D / 2, 9, 18, 26, 16, NIGHT(WHITE, 0.6)); F.blob('roof', 0, -D / 2, 9.5, 26, 36, 14, rgb(0x5a7a6a)); }
  F.box('neon', -W / 2, W / 2, 0.2, 0.5, 3.3, 3.5, [2.4, 2.0, 1.4]); // uplights
}

/** An elevated expressway from A to B: a lit deck on piers, parapets, lamps and the traffic. */
function viaduct(kit, frameAt, terrain, wetAt, R, A, B, H, W = 22) {
  const dx = B[0] - A[0], dz = B[1] - A[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len, yaw = Math.atan2(-uz, ux);
  const GREY = rgb(0x5a5e66);
  for (let t = 0; t < len; t += 6) {
    const x = A[0] + ux * t, z = A[1] + uz * t, y = H + 3;
    const F = frameAt(x, z, yaw, y);
    F.box('concrete', -3.05, 3.05, -1.8, 0, -W / 2, W / 2, GREY);
    for (const s of [-1, 1]) {
      F.box('concrete', -3.05, 3.05, 0, 1.1, s > 0 ? W / 2 - 0.4 : -W / 2, s > 0 ? W / 2 : -W / 2 + 0.4, GREY); // parapet
      F.box('neon', -3.05, 3.05, -1.9, -1.8, s * (W / 2 - 0.4) - 0.15, s * (W / 2 - 0.4) + 0.15, [0.5, 1.4, 3.0]); // the blue wash under the deck edge
    }
    if (Math.round(t) % 36 === 0) for (const s of [-1, 1]) { F.box('metal', -0.1, 0.1, 0, 9, s * (W / 2 - 0.6) - 0.1, s * (W / 2 - 0.6) + 0.1, STEEL); F.box('neon', -0.4, 0.4, 8.7, 9, s * (W / 2 - 2) - 0.5, s * (W / 2 - 0.6), [2.6, 2.2, 1.6]); }
    if (Math.round(t) % 30 === 0 && terrain.distSmooth(x, z) > 7 && !wetAt(x, z)) F.box('concrete', -1.4, 1.4, -(y - terrain.heightAt(x, z)) - 1, -1.8, -4, 4, GREY);
    // Traffic: head- and tail-lights streaming both ways.
    if (R() < 0.22) for (const [b, c] of [[-W / 4, [3, 0.3, 0.2]], [W / 4, [2.8, 2.6, 2.2]]]) { const a = (R() - 0.5) * 5; F.box('neon', a - 1.8, a + 1.8, 0.3, 0.8, b - 0.8, b + 0.8, c); }
    kit.footprints.push({ cx: x, cz: z, ux, uz, hw: 3.5, hd: W / 2 + 3 });
  }
}

export function buildSingaporeScene(L) {
  const img = (px, py) => L.fromImage(px, py);
  const noise = (x, z) => Math.sin(x * 0.013 + 0.3) * Math.cos(z * 0.011 + 0.8) * 0.6 + Math.sin(x * 0.033 - z * 0.027) * 0.4;
  const W = (px, py, r, colour = 0x0a1a2a) => { const [x, z] = img(px, py); return { x, z, r: r * 1.8461, y: 0.4, margin: 12, depth: 8, colour, env: 0.22 }; };
  // Marina Bay, the Singapore River out of it to the west, the Kallang basin to the north-east.
  const water = [W(620, 670, 130), W(790, 720, 120), W(480, 730, 90), W(380, 720, 45), W(300, 705, 30), W(230, 700, 30), W(160, 710, 30), W(1170, 140, 150)];
  const wetAt = (x, z, pad = 0) => water.some((w) => Math.hypot(x - w.x, z - w.z) < w.r + pad);
  // The Padang: the green between St Andrew's Road and Connaught Drive.
  const inPadang = (x, z) => { const px = x / 1.8461, pz = z / 1.8461, [ox, oz] = img(0, 0); const ix = px - ox / 1.8461, iz = pz - oz / 1.8461; return ix > 215 && ix < 295 && iz > 380 && iz < 590; };

  return buildRealScene(L, {
    name: 'Singapore',
    seed: 2008,
    life: { paddock: true, parks: 0, paths: true, villages: true, villageSpacing: 500 },
    margin: 750,
    windowGlow: 0.4,
    trackside: { standBuild: sgStand, shirts: SHIRTS, suburb: 0, standSpacing: 120, hoardingSpacing: 90, keepOut: (x, z) => wetAt(x, z, 10),
      skyline: { count: 160, tall: 160, dir: -2.4, spread: 2.2, depth: 1400, colours: [rgb(0x12141c), rgb(0x161a24), rgb(0x1a1e28)] } },
    pitTheme: {
      wall: rgb(0xe8e8ec),
      upper(F, hw, i, rc, { H1, DEPTH }) {
        const top = H1 + 4;
        F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -1.0, rgb(0x2a2c34));
        F.face(i % 2 ? 'winLit' : 'glass', -hw + 0.2, hw - 0.2, H1 + 0.4, top - 0.4, -0.98, [1.1, 1.05, 1.2]);
        F.box('neon', -hw, hw, top, top + 0.25, -DEPTH, 0.9, [2.6, 1.8, 0.5]);
        if (rc) F.box('stucco', -hw + 0.6, hw - 0.6, top + 0.25, top + 6, -DEPTH + 1, -1.2, rgb(0x2a2c34));
      },
    },
    style: {
      kerb: [WHITE, RED],
      runoff: 'brand', runoffFields: 6, runoffBoth: 1, runoffHero: 'SINGAPORE AIRLINES', runoffFloor: [0.09, 0.09, 0.1], runoffMix: true, runoffBandFloor: BLUE,
      runoffStripes: [BLUE, BLUE, GOLD, WHITE],
      barrier: 'slab', slab: [rgb(0xd8d8dc), rgb(0x2a2e36), [0.25, 0.25, 0.3]], wallHeight: 1.5, fenceTop: 5.0,
      fence: true, lamps: 'flood', floodEvery: 10, verge: 'paving',
      title: ['SINGAPORE', 'SINGAPORE GRAND PRIX', '#ef3340', '#ffffff', '#f2b31b'],
      roadName: 'SINGAPORE',
      bannerGlow: 0.5,
      boardBorder: '#f2b31b',
    },
    fascia: ['MARINA BAY', 'SINGAPORE GRAND PRIX'],
    fasciaColours: ['#ef3340', '#ffffff', '#f2b31b'],
    skirtColour: [0.12, 0.12, 0.14],
    groundKind: 'paving',
    relief(x, z, d) { return noise(x, z) * 0.6; },
    colourAt(x, z, h, slope, d) {
      if (inPadang(x, z)) return [0.2, 0.36, 0.16];
      if (wetAt(x, z, 8)) return [0.42, 0.42, 0.44];   // the promenades
      if (d < 40) return [0.3, 0.3, 0.32];
      return noise(x * 2.5, z * 2.5) > 0.5 ? [0.18, 0.3, 0.14] : [0.26, 0.26, 0.28];
    },
    water,
    stands: [
      { at: 0, side: 'L', W: 240, tiers: 20, build: sgStand, offset: -30 }, // the Pit Grandstand
      { at: 3, side: 'outside', W: 140, tiers: 18, build: sgStand },       // Turn 1
      { at: 9, side: 'outside', W: 90, tiers: 14, build: VARIED },          // T3
      { at: 20, side: 'outside', W: 120, tiers: 16, build: sgStand },      // Stamford
      { at: 34, side: 'R', W: 160, tiers: 18, build: sgStand },            // the Padang
      { at: 47, side: 'outside', W: 90, tiers: 14, build: VARIED },         // Anderson Bridge
      { at: 52, side: 'outside', W: 100, tiers: 16, build: VARIED },        // Connaught
      { at: 56, side: 'R', W: 140, tiers: 16, build: sgStand },             // the Esplanade waterfront
      { at: 61, side: 'outside', W: 200, tiers: 20, build: sgStand },      // the Bay Grandstand, the floating platform
    ],
    landmarks({ L, R, frameAt, kit, terrain, placed, group }) {
      const S = createSkyline();
      // The towers near the circuit get real facades in Singapore's own idiom (louvres, fins, sky
      // gardens, granite); the skyline beyond keeps its lit window textures.
      const SG_STYLE = { sg0: FACADES.sgLouvre, sg1: FACADES.sgFins, sg2: FACADES.sgGarden, sg3: FACADES.sgGarden, sg4: FACADES.sgTeal, sg5: FACADES.sgGranite };
      S.geoAt = (F) => terrain.distSmooth(F.o[0], F.o[2]) < 200;
      S.geoStyle = (key) => SG_STYLE[key] ?? FACADES.sgLouvre;
      // ---- overhead: the Benjamin Sheares Bridge over T1-T4, the Nicoll Highway over Raffles Boulevard ----
      viaduct(kit, frameAt, terrain, wetAt, R, img(1080, 620), img(760, 20), 26);
      viaduct(kit, frameAt, terrain, wetAt, R, img(540, 120), img(700, 520), 17, 18);
      placed.viaducts = 2;
      // ---- Marina Bay Sands across the bay, the Flyer, the Esplanade ----
      const place = (spots, Wd, Dd, yawAt, fn, key) => {
        for (const [px, py] of spots) {
          const [x, z] = img(px, py);
          const F = kit.lot(x, z, Math.sin(yawAt), Math.cos(yawAt), Wd, Dd, 4, (a, b) => !wetAt(a, b, 2));
          if (F) { fn(F); placed[key] = 1; return; }
        }
      };
      place([[800, 880], [840, 900], [760, 900], [880, 860]], 300, 100, Math.PI, (F) => marinaBaySands(F, S), 'mbs');
      place([[1030, 260], [1050, 300], [1010, 330]], 130, 54, -Math.PI / 2, flyer, 'flyer');
      place([[470, 505], [450, 500], [500, 515]], 130, 60, Math.PI, (F) => { F.box('stucco', -64, 64, 0, 4, -58, 0, NIGHT(WHITE, 0.4)); durian(F, -32, 24); durian(F, 30, 20); }, 'esplanade');
      place([[150, 460], [140, 430], [130, 490]], 70, 34, Math.PI / 2, (F) => colonial(F, 70, 34, true), 'supremeCourt');
      place([[150, 380], [140, 360]], 80, 30, Math.PI / 2, (F) => colonial(F, 80, 30, false), 'cityHall');
      place([[370, 640], [390, 625], [350, 655]], 60, 40, Math.PI, (F) => { colonial(F, 70, 50, false); F.box('neon', -35, 35, 18, 18.4, -50, 0.1, [2.6, 2.2, 1.4]); }, 'fullerton');
      place([[200, 610], [190, 595]], 20, 20, Math.PI / 2, (F) => { F.box('stucco', -5, 5, 0, 54, -10, 0, NIGHT(WHITE, 0.65)); F.blob('neon', 0, 0.2, 2.6, 44, 49, 10, [2.8, 2.6, 2.0]); F.blob('roof', 0, -5, 5, 54, 62, 8, rgb(0x5a6a6a)); }, 'clockTower');
      // The Cricket Club pavilion at the end of the Padang.
      place([[250, 560], [245, 540], [255, 520]], 40, 14, Math.PI, (F) => { F.box('stucco', -20, 20, 0, 9, -14, 0, NIGHT(WHITE, 0.6)); F.block('roof', [[-20, 0], [20, 0], [20, -14], [-20, -14]], [[-20, -7], [20, -7], [20, -7], [-20, -7]], 9, 13, rgb(0x8a3a2a)); F.face('winLit', -18, 18, 1, 7, 0.02, [1.6, 1.3, 0.8]); }, 'cricketClub');
      // ---- the gardens, the Helix Bridge, the ArtScience lotus ----
      place([[990, 840], [1010, 800], [960, 880]], 150, 170, Math.PI, (F) => supertrees(sub(F, 0, -90), R), 'gardens');
      { const [x0, z0] = img(905, 600), [x1, z1] = img(870, 790), yaw = Math.atan2(-(z1 - z0), x1 - x0); helix(frameAt((x0 + x1) / 2, (z0 + z1) / 2, yaw, 0.4), Math.hypot(x1 - x0, z1 - z0)); placed.helix = 1; }
      place([[690, 815], [670, 830]], 50, 50, Math.PI, (F) => lotus(sub(F, 0, -25)), 'artScience');
      // ---- the white bridge: the final chicane runs across it, white steel arches rising either side of
      // the roadway, tied together overhead, the parapets and the lamps along it ----
      {
        const Wb = frameAt(0, 0, 0, 0), kA = L.pointS(62), kB = L.pointS(66), len = kB - kA, n = Math.max(8, Math.round(len / 5));
        const P = (t, sg) => { const s = kA + t * len, i = Math.floor(s / L.ds) % L.N, side = sg > 0 ? 'L' : 'R', p = L.poseAt(s, sg * (L.wall[side][i] + 0.9)); return [p.x, L.yAt(i, 0), p.z]; };
        const archH = (t) => 2 + 9 * Math.sin(Math.PI * t);
        for (const sg of [1, -1]) for (let k = 0; k < n; k++) {
          const t0 = k / n, t1 = (k + 1) / n, a0 = P(t0, sg), a1 = P(t1, sg);
          const lo0 = [a0[0], a0[1] + 1.4, a0[2]], lo1 = [a1[0], a1[1] + 1.4, a1[2]];
          const hi0 = [a0[0], a0[1] + archH(t0), a0[2]], hi1 = [a1[0], a1[1] + archH(t1), a1[2]];
          beam(Wb, 'stucco', lo0, lo1, 0.35, WHITE);                       // deck chord
          beam(Wb, 'stucco', hi0, hi1, 0.45, WHITE);                       // the arch
          beam(Wb, 'stucco', lo0, hi0, 0.16, WHITE);                       // hangers
          beam(Wb, 'stucco', k % 2 ? lo0 : hi0, k % 2 ? hi1 : lo1, 0.12, WHITE); // lattice
          if (k % 2 === 0) Wb.box('neon', a0[0] - 0.2, a0[0] + 0.2, a0[1] + 1.4, a0[1] + 1.6, a0[2] - 0.2, a0[2] + 0.2, [2.4, 2.2, 1.8]);
        }
        for (let k = 1; k < n; k++) { // overhead ties where the arches are high enough to clear the cars
          const t = k / n; if (archH(t) < 7) continue;
          const l = P(t, 1), r = P(t, -1);
          beam(Wb, 'stucco', [l[0], l[1] + archH(t), l[2]], [r[0], r[1] + archH(t), r[2]], 0.3, WHITE);
          if (k % 2 === 0) { beam(Wb, 'stucco', [l[0], l[1] + archH(t), l[2]], [r[0], r[1] + archH((k + 1) / n), r[2]], 0.12, WHITE); }
        }
        placed.whiteBridge = 1;
      }
      // ---- the skyline: named towers where they stand, then the districts ----
      const [ox, oz] = img(0, 0), ipx = (x) => (x - ox) / 1.8461, ipz = (z) => (z - oz) / 1.8461;
      const NAMED = [
        [150, 770, 'tri', 46, 40, 280], [215, 820, 'oct', 40, 40, 280], [95, 820, 'sloped', 44, 36, 280], [60, 900, 'sloped', 50, 40, 290], // One Raffles Place, UOB, Republic, Guoco
        [300, 860, 'setback', 50, 40, 245], [520, 880, 'slab', 46, 34, 240], [580, 930, 'setback', 50, 40, 245], [440, 900, 'twin', 64, 30, 210], // MBFC, the Sail-side towers
        [920, 700, 'sail', 52, 30, 245], [960, 640, 'sail', 46, 26, 215],                                                             // The Sail @ Marina Bay
        [560, 400, 'hotel', 90, 34, 120], [690, 405, 'hotel', 80, 34, 140], [810, 400, 'twin', 70, 30, 150],                            // Pan Pacific, Ritz, Mandarin
        [600, 230, 'round', 38, 38, 180], [660, 230, 'round', 38, 38, 180], [630, 190, 'round', 38, 38, 180], [570, 190, 'round', 38, 38, 180], [700, 280, 'slab', 40, 34, 140], // Suntec
      ];
      let named = 0;
      for (const [px, py, type, Wd, Dd, H] of NAMED) {
        const [x, z] = img(px, py);
        const F = kit.lot(x, z, 0, 1, Wd + 6, Dd + 6, 3, (a, c) => !wetAt(a, c, 4));
        if (F) { tower(S, F, R, type, Wd, Dd, H); named++; }
      }
      // The streets the circuit runs down are walled in by buildings: a row of detailed street
      // buildings right behind the barriers on both sides, towers behind them, the skyline beyond.
      let street = 0, towers = 0, parks = 0;
      for (const side of ['L', 'R']) for (let s = 0; s < L.length; s += 34) {
        if (Math.sin(s * 0.0042 + (side === 'L' ? 0 : 2.1)) > 0.45) { // open stretches: city parks
          const fr = kit.frontage(s, side, 6), Pk = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 32, 30, 1.5, (a, c) => !wetAt(a, c, 4));
          if (Pk) { park(Pk, R, 32, 30); parks++; }
          continue;
        }
        for (const extra of [10, 16, 24]) {
          const fr = kit.frontage(s, side, extra), Wd = 26 + R() * 10, Dd = 24 + R() * 10;
          const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, Wd, Dd, 1.2, (a, c) => !wetAt(a, c, 4) && !inPadang(a, c));
          if (!F) continue;
          streetBuilding(S, F, R, Wd, Dd, 30 + R() * R() * 110, pick(R, ['slab', 'hotel', 'setback', 'twin', 'round', 'resi', 'sloped']));
          street++;
          break;
        }
      }
      const b = terrain.bounds;
      for (let z = b.minZ + 30; z < b.maxZ - 30; z += 40) for (let x = b.minX + 30; x < b.maxX - 30; x += 40) {
        const px = x + (R() - 0.5) * 12, pz = z + (R() - 0.5) * 12, d = terrain.distSmooth(px, pz);
        if (d < 40 || d > 760 || wetAt(px, pz, 14) || inPadang(px, pz)) continue;
        const ix = ipx(px), iz = ipz(pz);
        const cbd = (ix < 420 && iz > 640) || (iz > 770 && ix < 760);
        if (R() < (cbd ? 0.06 : 0.16)) continue;
        const Wd = 24 + R() * 18, Dd = 22 + R() * 16;
        const F = kit.lot(px, pz, 0, 1, Wd + 6, Dd + 6, 2.5, (a, c) => !wetAt(a, c, 4));
        if (!F) continue;
        const far = d > 420;
        const type = cbd ? pick(R, ['slab', 'setback', 'round', 'sloped', 'oct', 'slab', 'twin']) : far ? pick(R, ['resi', 'resi', 'slab', 'hotel', 'round']) : pick(R, ['slab', 'hotel', 'resi', 'round', 'setback', 'twin', 'sloped']);
        const H = cbd ? 130 + R() * 140 : far ? 50 + R() * 80 : 60 + R() * R() * 130;
        tower(S, F, R, type, Wd, Dd, H);
        towers++;
      }
      group.add(S.build());
      // Floodlight towers round the lap.
      let masts = 0;
      for (let s = 25, m = 0; s < L.length; s += 60, m++) {
        const fr = kit.frontage(s, m % 2 ? 'R' : 'L', 5);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 5, 5, 0.5, (a, c) => !wetAt(a, c));
        if (F) { floodMast(F, R, 30 + R() * 8); masts++; }
      }
      // Palms along the boulevards, lit from below.
      let palms = 0;
      for (const side of ['L', 'R']) for (let s = 0; s < L.length; s += 16) {
        const fr = kit.frontage(s, side, 2.5 + R() * 2);
        if (!kit.isFree(fr.x, fr.z, 1) || wetAt(fr.x, fr.z, 2) || kit.overlaps({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 1, hd: 1 })) continue;
        const F = frameAt(fr.x, fr.z, R() * 6.28);
        palm(F, R, 8 + R() * 4);
        F.box('neon', -0.25, 0.25, 0, 0.3, -0.25, 0.25, [2.6, 2.2, 1.4]);
        palms++;
      }
      // Tour boats on the bay.
      for (let k = 0; k < 14; k++) { const w = water[k % 3], t = R() * 6.28, rr = R() * w.r * 0.7; const F = frameAt(w.x + Math.cos(t) * rr, w.z + Math.sin(t) * rr, R() * 6.28, 0.4); VEHICLES.van(sub(F, 0, 0), NIGHT(rgb(0xc8302a), 0.6), 'stucco'); F.box('neon', -1.2, 1.2, 2.5, 2.7, -3, 2, [2.6, 2.0, 1.0]); }
      placed.singapore = { named, street, parks, towers, masts, palms };
    },
    trees: {
      variants: [oak, palm],
      attempts: 9000,
      scale: [1.2, 1],
      test(x, z, d, h, R) {
        if (d < 12 || wetAt(x, z, 6)) return -1;
        if (inPadang(x, z)) return R() < 0.05 ? 0 : -1;
        return R() < 0.5 ? (R() < 0.6 ? 0 : 1) : -1; // rain trees and palms between the towers
      },
    },
  });
}
