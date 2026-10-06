import { rgb, scaleC, pick } from '../street/kit.js?v=a5d31c9';
import { standVariety } from './trackside.js?v=a5d31c9';
import { buildRealScene } from './scene.js?v=a5d31c9';
import { cheapBlock } from '../street/buildings.js?v=a5d31c9';
import { grandstand } from '../street/props.js?v=a5d31c9';
import { birch } from '../street/trees.js?v=a5d31c9';
import { oak, fieldParking, campsite } from './hungaroringScene.js?v=a5d31c9';
import { sub, lightMast, helipad, foodTrucks } from '../backstageProps.js?v=a5d31c9';

/*
 * Silverstone, handcrafted. The old RAF airfield in the Northamptonshire
 * fields: the Wing's white blade of a roof sweeping over the pits on the
 * Hamilton Straight, the old National pits and the BRDC clubhouse by Woodcote,
 * the wartime hangars that gave the Hangar Straight its name, the old runways
 * still crossing the infield, and grandstands in their hundreds of metres at
 * every corner. Beyond: a patchwork of green and gold fields, hedgerows,
 * oak copses, and the biggest campsites in the sport.
 */

const WHITE = rgb(0xf2f4f6), STEEL = rgb(0x8a929e), DARK = rgb(0x2a3440), BLUE = rgb(0x012169), RED = rgb(0xc8102e);
const SHIRTS = [BLUE, WHITE, RED, rgb(0x1b1b1f), rgb(0xff8000), rgb(0x00a19b), rgb(0x2a2a2e), rgb(0xe8d8b0)];

const SPONSORS = [
  ['ROYAL OAK ALE', '#1f3a2a', '#f2e6c9', '#d8b04a', 'serif'],
  ['UNION TELECOM', '#012169', '#ffffff', '#c8102e', 'stripes'],
  ['BRITANNIA BANK', '#c8102e', '#ffffff', '#012169', 'serif'],
  ['HANGAR FUEL', '#ff8000', '#141416', '#141416', 'tread'],
  ['NORTHANTS TYRES', '#141416', '#f2c200', '#f2c200', 'tread'],
  ['WOODCOTE TEA', '#00a19b', '#ffffff', '#f2e6c9', 'wave'],
  ['CLUB AIRWAYS', '#4a7ac8', '#ffffff', '#c8102e', 'wave'],
  ['COPSE WATCHES', '#e8e4dc', '#1b1b1f', '#012169', 'serif'],
];

/** Covered grandstand in the British style: grey steel, union-blue seats, a cantilever roof. */
function brStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: true, seats: [BLUE, rgb(0x2a4a9a), RED] });
  return { ...gs, shirts: SHIRTS };
}

/** A curved surface between two (b, y) profiles across the frame, facing up or down. */
function sweep(F, key, a0, a1, prof, up, col) {
  F.mb.color = col;
  for (let k = 0; k < prof.length - 1; k++) {
    const [b0, y0] = prof[k], [b1, y1] = prof[k + 1];
    const p = [F.at(a0, y0, b0), F.at(a1, y0, b0), F.at(a1, y1, b1), F.at(a0, y1, b1)];
    const n = [0, up ? 1 : -1, 0];
    F.mb.triFacing(key, p[0], p[1], p[2], n);
    F.mb.triFacing(key, p[0], p[2], p[3], n);
  }
}

/** The Wing: two glass floors over the garages under a white aerofoil blade cantilevered over the pit lane. */
const pitTheme = {
  wall: rgb(0xeef0f2),
  upper(F, hw, i, rc, { H1, DEPTH }) {
    const D = DEPTH;
    F.box('stucco', -hw, hw, H1, H1 + 7.4, -D - 3, -1.4, rgb(0xdfe3e8));
    for (const y of [H1 + 0.4, H1 + 4.1]) F.face(i % 3 === 0 && y > H1 + 1 ? 'winLit' : 'glass', -hw + 0.1, hw - 0.1, y, y + 3.2, -1.38, [0.9, 1.1, 1.2]);
    F.box('trim', -hw, hw, H1 + 3.7, H1 + 4.0, -2, 0.6, rgb(0xc8ccd2)); // the walkway slab
    // A wing section: a sharp leading edge far out over the pit lane rising to a high crown, then
    // sweeping down and back over the paddock.
    const top = [[15, H1 + 10.5], [12, H1 + 14], [7, H1 + 16.6], [1, H1 + 17.4], [-6, H1 + 16], [-D - 10, H1 + 9.4]];
    const bot = [[15, H1 + 10.5], [11, H1 + 10.9], [5, H1 + 11.2], [-2, H1 + 10.6], [-8, H1 + 9.4], [-D - 10, H1 + 8.6]];
    sweep(F, 'roof', -hw, hw, top, true, WHITE);
    sweep(F, 'roof', -hw, hw, bot, false, rgb(0xd8dce2));
    F.box('trim', -hw, hw, H1 + 8.6, H1 + 9.4, -D - 10.2, -D - 9.8, rgb(0xd8dce2)); // trailing edge
    F.box('stucco', -hw, hw, H1 + 7.4, H1 + 10.6, -8, -1.4, rgb(0xdfe3e8)); // the top floor under the crown
    F.face(i % 4 === 1 ? 'winLit' : 'glass', -hw + 0.1, hw - 0.1, H1 + 7.6, H1 + 10.4, -1.38, [0.9, 1.1, 1.2]);
    if (i % 2 === 0) F.box('metal', -0.25, 0.25, H1 + 7.4, H1 + 11, 3, 3.5, STEEL); // blade struts
    if (rc) F.box('stucco', -hw + 0.6, hw - 0.6, H1 + 10.6, H1 + 15, -D + 2, -2, WHITE);
  },
};

/** The old National pits: a long low white block with a viewing terrace and the BRDC sign. */
function oldPits(F, len) {
  F.box('stucco', -len / 2, len / 2, 0, 4.2, -12, 0, rgb(0xeceae4));
  for (let a = -len / 2 + 1; a < len / 2 - 4; a += 5.5) F.face('trim', a, a + 4.4, 0.2, 3.6, 0.02, rgb(0x5a6068));
  F.box('stucco', -len / 2, len / 2, 4.2, 7.6, -12, -3, WHITE);
  F.face('glass', -len / 2 + 0.5, len / 2 - 0.5, 4.6, 7.2, -2.98, null);
  F.box('metal', -len / 2, len / 2, 4.2, 5.3, -0.1, 0.05, STEEL);
  F.box('trim', -len / 2, len / 2, 7.6, 8.0, -12.3, 0.4, BLUE);
}

/** A wartime aircraft hangar: corrugated barrel roof on brick walls, the doors on the end. */
function hangar(F, W, D) {
  const H = 9, R = W / 2;
  F.box('stucco', -W / 2, W / 2, 0, H * 0.5, -D, 0, rgb(0x8a5a42));
  for (let k = 0; k < 10; k++) {
    const t0 = (k / 10) * Math.PI, t1 = ((k + 1) / 10) * Math.PI;
    const p = (t) => [Math.cos(t) * R, H * 0.5 + Math.sin(t) * R * 0.75];
    const [a0, y0] = p(t0), [a1, y1] = p(t1);
    F.block('roof', [[a0, 0], [a1, 0], [a1, -D], [a0, -D]], [[a0, 0], [a1, 0], [a1, -D], [a0, -D]], Math.min(y0, y1), Math.max(y0, y1) + 0.25, rgb(0x6a7270));
  }
  F.face('trim', -W / 2 + 2, W / 2 - 2, 0, H * 0.5 + R * 0.5, 0.03, rgb(0x4a5258));
}

/** Corporate hospitality village: rows of white marquees with clear-wall sides and flags. */
function marquees(F, r, W, D) {
  for (let a = -W / 2 + 6; a < W / 2 - 5; a += 13) for (let b = -6; b > -D + 5; b -= 15) {
    F.box('fabric', a - 5.5, a + 5.5, 0, 3, b - 5, b + 5, rgb(0xf6f6f2));
    F.face('winLit', a - 5, a + 5, 0.6, 2.4, b + 5.02, [1.1, 1.05, 0.95]);
    F.block('fabric', [[a - 5.8, b + 5.3], [a + 5.8, b + 5.3], [a + 5.8, b - 5.3], [a - 5.8, b - 5.3]], [[a - 5.8, b], [a + 5.8, b], [a + 5.8, b], [a - 5.8, b]], 3, 5, rgb(0xf6f6f2));
    if (r() < 0.5) { F.box('metal', a - 0.05, a + 0.05, 5, 9, b + 5.2, b + 5.3, STEEL); F.box('fabric', a, a + 1.8, 8, 9, b + 5.24, b + 5.26, pick(r, [BLUE, RED, WHITE, rgb(0x00a19b)])); }
  }
}

/** A big screen on a truss tower facing the track. */
function bigScreen(F) {
  for (const a of [-5.5, 5.5]) F.box('metal', a - 0.3, a + 0.3, 0, 13, -0.6, 0, STEEL);
  F.box('trim', -6, 6, 6, 13, -0.8, -0.2, rgb(0x1b1b1f));
  F.face('neon', -5.6, 5.6, 6.4, 12.6, -0.18, [0.7, 0.9, 1.2]);
}

/** A hedgerow along a field edge. */
function hedge(F, len, r) {
  for (let a = -len / 2; a < len / 2; a += 3) F.blob('leaf', a + r() * 1.5, -0.6, 1.4 + r() * 0.5, 0, 1.6 + r() * 0.8, 5, pick(r, [rgb(0x3e5a2a), rgb(0x4a6a32), rgb(0x34502a)]));
}

/** Brick village house with a slate roof. */
function brickHouse(F, r, W, D) {
  cheapBlock(F, r, W, D, 2, { wall: pick(r, [rgb(0xc88a72), rgb(0xd09a7a), rgb(0xb87a6a), rgb(0xf0e4cc)]), roof: pick(r, [rgb(0x4a5258), rgb(0x5a3a32)]), style: 'brick', trim: rgb(0xe8e4dc) });
}

const VARIED = standVariety(brStand, null, SHIRTS);

export function buildSilverstoneScene(L) {
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const fields = (x, z) => Math.sin(x * 0.0061 + 0.4) * Math.cos(z * 0.0053 - 0.2) + Math.sin((x + z) * 0.0021) * 0.5;
  const noise = (x, z) => Math.sin(x * 0.013 + 0.3) * Math.cos(z * 0.011 + 0.8) * 0.6 + Math.sin(x * 0.033 - z * 0.027) * 0.4;
  const img = (px, py) => L.fromImage(px, py);
  // The old runways: three long concrete strips across the infield (the airfield's triangle).
  const RUNWAYS = [[img(240, 260), img(900, 520)], [img(420, 200), img(700, 560)], [img(300, 420), img(940, 300)]];
  const runway = (x, z) => RUNWAYS.some(([[ax, az], [bx, bz]]) => {
    const ux = bx - ax, uz = bz - az, l2 = ux * ux + uz * uz, t = Math.max(0, Math.min(1, ((x - ax) * ux + (z - az) * uz) / l2));
    return Math.hypot(x - ax - ux * t, z - az - uz * t) < 22;
  });

  return buildRealScene(L, {
    name: 'Silverstone',
    seed: 1950,
    margin: 750,
    trackside: { standBuild: brStand, shirts: SHIRTS, suburb: 0.05, standSpacing: 150, palette: [[BLUE, WHITE], [RED, WHITE], [BLUE, RED]], skyline: { count: 90, tall: 18, spread: 6.28 } },
    pitTheme,
    style: {
      kerb: [rgb(0xf2f1ec), rgb(0xc8102e)],
      runoff: 'brand', runoffFloor: [0.11, 0.115, 0.12],
      barrier: 'jersey', fence: true, lamps: 'none', verge: 'grass',
      sponsors: SPONSORS,
      zoneBrands: ['UNION TELECOM', 'BRITANNIA BANK', 'HANGAR FUEL', 'WOODCOTE TEA', 'CLUB AIRWAYS'],
      primeBrands: ['ROYAL OAK ALE', 'COPSE WATCHES'],
      title: ['SILVERSTONE', 'BRITISH GRAND PRIX', '#012169', '#ffffff', '#c8102e'],
      bridges: [['UNION TELECOM', 'HOME OF BRITISH MOTOR RACING', '#012169', '#ffffff', '#c8102e'], ['ROYAL OAK ALE', 'BREWED FOR THE BRAVE', '#1f3a2a', '#f2e6c9', '#d8b04a']],
      roadName: 'SILVERSTONE',
      bannerGlow: 0.12,
      boardBorder: '#012169',
    },
    fascia: ['SILVERSTONE', 'BRITISH GRAND PRIX'],
    fasciaColours: ['#012169', '#ffffff', '#c8102e'],
    skirtColour: [0.36, 0.5, 0.26],
    relief(x, z, d) {
      return (fields(x, z) * 3 + noise(x, z) * 1.5) * smooth(40, 260, d);
    },
    colourAt(x, z, h, slope, d) {
      const grass = [0.32, 0.5, 0.22], deep = [0.26, 0.42, 0.18], wheat = [0.72, 0.64, 0.34], rape = [0.86, 0.8, 0.22];
      if (d > 30 && runway(x, z)) return [0.56, 0.56, 0.54];
      if (d < 220) return noise(x * 2, z * 2) > 0.3 ? deep : grass;
      const f = Math.floor((fields(x * 2.3, z * 2.3) + 2) * 3) % 5;
      return [grass, wheat, deep, rape, grass][f];
    },
    stands: [
      { at: 69, side: 'L', W: 160, tiers: 16, build: brStand, offset: 40 },  // opposite the Wing
      { at: 2, side: 'outside', W: 90, tiers: 14, build: VARIED },          // Abbey
      { at: 10, side: 'outside', W: 80, tiers: 12, build: VARIED },         // Village
      { at: 14, side: 'outside', W: 60, tiers: 12, build: VARIED },         // the Loop
      { at: 28, side: 'outside', W: 110, tiers: 14, build: VARIED },        // Luffield
      { at: 32, side: 'outside', W: 120, tiers: 16, build: VARIED },        // Woodcote
      { at: 39, side: 'outside', W: 100, tiers: 14, build: VARIED },        // Copse
      { at: 46, side: 'L', W: 90, tiers: 14, build: VARIED },               // Maggots
      { at: 50, side: 'R', W: 90, tiers: 14, build: VARIED },               // Becketts
      { at: 58, side: 'outside', W: 110, tiers: 14, build: VARIED },        // Stowe
      { at: 64, side: 'outside', W: 100, tiers: 14, build: VARIED },        // Club
    ],
    landmarks({ L, R, frameAt, kit, terrain, placed }) {
      const ps = (k) => L.pointS(k);
      const lotOn = (s, side, extra, W, D, margin = 1.5) => {
        const fr = kit.frontage(((s % L.length) + L.length) % L.length, side, extra);
        return kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, W, D, margin, null);
      };
      // ---- the old National pits by Woodcote, the hangars on the Hangar Straight ----
      const nps = (ps(33) + ps(36)) / 2, side = L.k[Math.floor(ps(35) / L.ds)] > 0 ? 'L' : 'R';
      const NP = lotOn(nps, side, 6, 180, 14, 2);
      if (NP) { oldPits(NP, 180); placed.oldPits = 1; }
      let hangars = 0;
      for (const k of [0.25, 0.5, 0.75]) {
        const s = ps(55) + (ps(57) - ps(55)) * k;
        for (const sd of ['L', 'R']) {
          const F = lotOn(s, sd, 70 + R() * 30, 46, 60, 4);
          if (F) { hangar(F, 46, 60); hangars++; break; }
        }
      }
      placed.hangars = hangars;
      // ---- close to the track: marquee villages, big screens, a helicopter park, tree lines ----
      let vill = 0, screens = 0, trees = 0;
      for (const k of [1, 9, 28, 33, 47, 58, 64]) {
        const s = ps(k), side = L.k[Math.floor(s / L.ds) % L.N] > 0 ? 'R' : 'L';
        const F = lotOn(s, side, 28 + R() * 20, 70, 36, 3);
        if (F) { marquees(F, R, 70, 36); vill++; }
        const G = lotOn(s + 40, side, 4, 13, 2, 1);
        if (G) { bigScreen(G); screens++; }
        const T = lotOn(s - 30, side, 20, 30, 10, 2);
        if (T) foodTrucks(T, R, 5);
      }
      const hp = lotOn(ps(36), 'R', 120, 140, 90, 4);
      if (hp) for (let a = -55; a <= 55; a += 27) for (const b of [-22, -66]) helipad(sub(hp, a, b), R, pick(R, [rgb(0xc8242b), rgb(0x1b1b1f), rgb(0xf2f2ee), rgb(0x1f3f8a)]));
      placed.heliPark = hp ? 1 : 0;
      for (const side of ['L', 'R']) for (let s = 0; s < L.length; s += 11) {
        if (R() < 0.35) continue;
        const fr = kit.frontage(s, side, 14 + R() * 26);
        if (!kit.isFree(fr.x, fr.z, 4) || runway(fr.x, fr.z) || kit.overlaps({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 2, hd: 2 })) continue;
        (R() < 0.75 ? oak : birch)(frameAt(fr.x, fr.z, R() * 6.28), R);
        trees++;
      }
      placed.close = { vill, screens, trees };
      // ---- campsites and car parks on the fields, hedgerows, oak copses, the village ----
      let camps = 0, parks = 0, hedges = 0, houses = 0;
      const b = terrain.bounds;
      for (let z = b.minZ + 60; z < b.maxZ - 60; z += 46) for (let x = b.minX + 60; x < b.maxX - 60; x += 102) {
        const d = terrain.distSmooth(x, z);
        if (d < 45 || d > 360 || runway(x, z)) continue;
        const v = R();
        const F = kit.lot(x, z, 0, 1, 96, 40, 4, (px, pz) => !runway(px, pz));
        if (!F) continue;
        if (v < 0.5) { campsite(F, R, 96, 40); camps++; } else if (v < 0.85) { fieldParking(F, R, 96, 40); lightMast(sub(F, 0, -20)); parks++; } else { hedge(F, 96, R); hedges++; }
      }
      for (let k = 0; k < 160; k++) {
        const x = b.minX + R() * (b.maxX - b.minX), z = b.minZ + R() * (b.maxZ - b.minZ);
        if (terrain.distSmooth(x, z) < 160) continue;
        const F = kit.lot(x, z, R() < 0.5 ? 0 : 1, R() < 0.5 ? 1 : 0, 120, 3, 2, null);
        if (F) { hedge(F, 120, R); hedges++; }
      }
      // Silverstone village to the west: brick and stone houses along two lanes, a church tower.
      const [vx, vz] = img(-180, 280);
      for (let k = 0; k < 260; k++) {
        const x = vx + (R() - 0.5) * 420, z = vz + (R() - 0.5) * 360;
        if (terrain.distSmooth(x, z) < 140) continue;
        const yaw = R() < 0.5 ? 0 : Math.PI / 2, W = 9 + R() * 5, D = 8 + R() * 3;
        const F = kit.lot(x, z, Math.sin(yaw), Math.cos(yaw), W, D, 3, null);
        if (F) { brickHouse(F, R, W, D); houses++; }
      }
      const CH = kit.lot(vx, vz, 0, 1, 10, 24, 2, null);
      if (CH) { CH.box('stucco', -4, 4, 0, 22, -8, 0, rgb(0xb8a888)); CH.box('stucco', -5, 5, 0, 10, -24, -8, rgb(0xb8a888)); CH.block('roof', [[-5, -8], [5, -8], [5, -24], [-5, -24]], [[0, -8], [0, -8], [0, -24], [0, -24]], 10, 15, rgb(0x4a5258)); }
      placed.surroundings = { camps, parks, hedges, houses, runways: RUNWAYS.length };
    },
    trees: {
      variants: [oak, birch],
      attempts: 16000,
      scale: [1, 0.9],
      test(x, z, d, h, R) {
        if (d < 30 || runway(x, z)) return -1;
        const copse = noise(x * 0.7 + 90, z * 0.7) > 0.3;
        if (copse) return R() < 0.75 ? 0 : 1;
        return R() < 0.03 ? 0 : -1; // the odd field oak
      },
    },
  });
}
