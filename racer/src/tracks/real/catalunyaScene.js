import { MeshBasicMaterial } from 'three';
import { MeshBuilder } from '../../car/meshBuilder.js';
import { Frame, rgb, scaleC, pick, LOD } from '../street/kit.js';
import { buildRealScene } from './scene.js';
import { venueRoads, venueBackOfHouse } from './backOfHouse.js';
import { stonePine, olive, cypress } from '../street/trees.js';

/*
 * Montmeló, handcrafted: the circuit sits on dry, rolling Catalan hills.
 * Terraced vineyards and olive groves, umbrella-pine woods on the ridges,
 * red-tiled masias (farmhouses) and the white houses of Montmeló and Granollers
 * spread over the hills, the industrial estates along the motorway, and the
 * jagged saw-tooth massif of Montserrat on the western horizon. At the circuit:
 * the big main grandstand under its curved roof on the start straight, the
 * tall pit building with the glass control tower, and grandstands at every
 * corner in the circuit's red, yellow and blue.
 */

const RED = rgb(0xc60b1e), YELLOW = rgb(0xffc400), BLUE = rgb(0x1f4f9a), WHITE = rgb(0xf4f2ec), STEEL = rgb(0x8a929e);
const SHIRTS = [RED, YELLOW, BLUE, WHITE, rgb(0xff7a12), rgb(0x1b1b1f), rgb(0x2f6b4a), RED];

const SPONSORS = [
  ['CATALANA BANK', '#0e3a6a', '#ffffff', '#ffc400', 'serif'],
  ['SANGRIA SOL', '#c60b1e', '#ffffff', '#ffc400', 'wave'],
  ['MONTSERRAT WATER', '#1e8ab8', '#ffffff', '#ffffff', 'wave'],
  ['TAPAS TELECOM', '#ffb400', '#1b1b1f', '#c60b1e', 'bolt'],
  ['IBERIA FUEL', '#2a8a3a', '#ffffff', '#ffc400', 'tread'],
  ['FLAMENCO AIR', '#8a1a5a', '#ffffff', '#ffc400', 'wave'],
  ['RIOJA RESERVA', '#5a1a2a', '#f2d8a0', '#f2d8a0', 'serif'],
  ['SIERRA TYRES', '#141416', '#ffc400', '#ffc400', 'tread'],
];

/** Main grandstand: concrete tiers in red, yellow and blue under a long curved roof on raking steel arms. */
function mainGrandstand(F, r, W, tiers) {
  const seats = [], step = 0.85, rise = 0.56;
  F.box('concrete', -W / 2, W / 2, 0, 3, -1.8, 0.2, rgb(0xc8c4bc));
  for (let a = -W / 2 + 4; a < W / 2 - 4; a += 9) F.face('winLit', a, a + 6, 0.5, 2.6, 0.21, [1.2, 1.1, 0.9]);
  for (let k = 0; k < tiers; k++) {
    const y = 3 + k * rise, b1 = -1.8 - k * step, b0 = b1 - step;
    F.box('concrete', -W / 2, W / 2, y - 0.55, y, b0, b1, rgb(0xb8b4ac));
    for (let a = -W / 2; a < W / 2 - 0.01; a += 15) {
      const col = [RED, YELLOW, BLUE][Math.floor((a + W / 2) / 15) % 3];
      F.box('trim', a, Math.min(W / 2, a + 15), y, y + 0.07, b0 + 0.05, b1, scaleC(col, k % 2 ? 0.9 : 1));
      F.box('trim', a, Math.min(W / 2, a + 15), y + 0.07, y + 0.4, b0 + 0.05, b0 + 0.13, scaleC(col, 0.75));
    }
    for (let a = -W / 2 + 0.4; a < W / 2 - 0.3; a += 0.55) if (r() < 0.88) seats.push(F.at(a + (r() - 0.5) * 0.1, y + 0.07, b1 - 0.45));
  }
  const depth = 1.8 + tiers * step, top = 3 + tiers * rise;
  F.box('concrete', -W / 2, W / 2, 0, top + 1.2, -depth - 0.6, -depth, rgb(0xa8a49c));
  // The roof: a curved white shell, rising towards the track, on arms raking forward every 16 m.
  for (let a = -W / 2; a <= W / 2 + 0.01; a += 16) {
    F.block('metal', [[a - 0.4, -depth - 0.6], [a + 0.4, -depth - 0.6], [a + 0.4, -depth], [a - 0.4, -depth]], [[a - 0.25, -depth + 2], [a + 0.25, -depth + 2], [a + 0.25, -depth + 2.5], [a - 0.25, -depth + 2.5]], 0, top + 8, STEEL);
  }
  for (let k = 0; k < 10; k++) {
    const b0 = -depth - 1 + (k / 10) * (depth + 4), b1 = -depth - 1 + ((k + 1) / 10) * (depth + 4);
    const y0 = top + 6 + Math.sin((k / 10) * Math.PI * 0.8) * 2.4, y1 = top + 6 + Math.sin(((k + 1) / 10) * Math.PI * 0.8) * 2.4;
    F.mb.color = WHITE;
    const p = [F.at(-W / 2 - 1, y0, b0), F.at(W / 2 + 1, y0, b0), F.at(W / 2 + 1, y1, b1), F.at(-W / 2 - 1, y1, b1)];
    F.mb.triFacing('roof', p[0], p[1], p[2], [0, 1, 0]); F.mb.triFacing('roof', p[0], p[2], p[3], [0, 1, 0]);
    F.mb.triFacing('roof', p[0], p[2], p[1], [0, -1, 0]); F.mb.triFacing('roof', p[0], p[3], p[2], [0, -1, 0]);
  }
  return { seats, fascia: { a0: -W / 2, a1: W / 2, y0: 0.6, y1: 2.8, b: 0.22 }, shirts: SHIRTS };
}

/** Corner grandstand: an open steel frame, grey seats, a coloured roof over the top rows. */
function tribune(F, r, W, tiers) {
  const seats = [], step = 0.8, rise = 0.6;
  for (let k = 0; k < tiers; k++) {
    const y = 1.1 + k * rise, b1 = -k * step, b0 = b1 - step;
    const col = k % 2 ? rgb(0xa8acb2) : rgb(0x989ca4);
    F.box('trim', -W / 2, W / 2, y - 0.07, y, b0, b1, col);
    F.box('trim', -W / 2, W / 2, y, y + 0.36, b0, b0 + 0.08, scaleC(col, 0.8));
    for (let a = -W / 2 + 0.4; a < W / 2 - 0.3; a += 0.55) if (r() < 0.84) seats.push(F.at(a + (r() - 0.5) * 0.1, y, b1 - 0.42));
  }
  const depth = tiers * step, top = 1.1 + tiers * rise, col = pick(r, [RED, YELLOW, BLUE]);
  for (let a = -W / 2; a <= W / 2 + 0.01; a += 4) {
    for (let k = 0; k < tiers; k += 3) F.box('metal', a - 0.05, a + 0.05, 0, 1.1 + k * rise, -k * step - 0.05, -k * step + 0.05, STEEL);
    F.box('metal', a - 0.06, a + 0.06, 0, top + 3.6, -depth - 0.06, -depth + 0.06, STEEL);
  }
  F.box('roof', -W / 2 - 0.4, W / 2 + 0.4, top + 3.6, top + 3.9, -depth - 0.4, -depth * 0.5, col);
  F.box('trim', -W / 2, W / 2, 0, 1.2, 0, 0.12, col);
  return { seats, fascia: { a0: -W / 2, a1: W / 2, y0: 0.15, y1: 1.1, b: 0.13 }, shirts: SHIRTS };
}

/** Pit building: three white floors with strip windows, a glass gallery, the round control tower over it. */
const pitTheme = {
  wall: rgb(0xeeeeea),
  upper(F, hw, i, rc, { H1, DEPTH }) {
    const top = H1 + 6.6;
    F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -1.0, WHITE);
    for (const y of [H1 + 0.6, H1 + 3.8]) F.face(i % 3 === 0 ? 'winLit' : 'glass', -hw + 0.2, hw - 0.2, y, y + 2.2, -0.98, [1.15, 1.15, 1.1]);
    F.box('trim', -hw, hw, top, top + 0.4, -DEPTH, 1.2, rgb(0xd8d4cc));
    if (rc) {
      F.cylinder('stucco', 0, -DEPTH / 2, 2.6, top, top + 16, 12, WHITE);
      F.cylinder('glass', 0, -DEPTH / 2, 4.2, top + 16, top + 20, 12, null);
      F.cylinder('trim', 0, -DEPTH / 2, 4.6, top + 20, top + 20.6, 12, RED);
    }
  },
};

/** Masia: a Catalan farmhouse, stone walls, a wide low-pitched tile roof, an arched doorway, a tower. */
function masia(F, r) {
  const W = 16 + r() * 6, D = 12, H = 7;
  F.box('stucco', -W / 2, W / 2, -0.8, H, -D, 0, rgb(pick(r, [0xd8c8a8, 0xc8b894, 0xe0d4bc])));
  F.gableRoof('roof', -W / 2, W / 2, -D, 0, H, 2.4, rgb(0xb0582e), rgb(0xd8c8a8));
  F.face('glass', -1.2, 1.2, 0, 2.6, 0.02, null);
  for (const a of [-W / 3, W / 3]) F.face('glass', a - 0.6, a + 0.6, 3.6, 4.8, 0.02, null);
  if (r() < 0.4) { F.box('stucco', W / 2 - 4, W / 2, -0.8, H + 5, -4, 0, rgb(0xd8c8a8)); F.hipRoof('roof', W / 2 - 4, W / 2, -4, 0, H + 5, 1.6, rgb(0xb0582e), 0.3); }
}
/** Town house in Montmeló: white walls, green shutters, a terracotta roof. */
function townHouse(F, r) {
  const W = 8 + r() * 4, D = 9, H = 6 + (r() < 0.4 ? 3 : 0);
  F.box('stucco', -W / 2, W / 2, -0.8, H, -D, 0, rgb(pick(r, [0xf4f0e6, 0xece4d4, 0xf2e8d0])));
  F.hipRoof('roof', -W / 2, W / 2, -D, 0, H, 2, rgb(0xb8603a), 0.4);
  for (let f = 0; f < H / 3; f++) for (const a of [-W / 4, W / 4]) {
    F.face('glass', a - 0.6, a + 0.6, f * 3 + 1, f * 3 + 2.4, 0.02, null);
    F.face('trim', a - 1.1, a - 0.6, f * 3 + 1, f * 3 + 2.4, 0.03, rgb(0x3f6a4a));
  }
}
/** Industrial unit on the polígon by the motorway: a big grey shed with a sawtooth roof and a yard. */
function warehouse(F, r) {
  const W = 40 + r() * 30, D = 30, H = 9;
  F.box('stucco', -W / 2, W / 2, -0.6, H, -D, 0, rgb(pick(r, [0xc8c8c4, 0xb8bcc0, 0xd8d4cc])));
  for (let b = -D; b < 0; b += 6) { F.mb.color = rgb(0x8a9098); F.mb.quad('roof', F.at(-W / 2, H, b), F.at(W / 2, H, b), F.at(W / 2, H + 2.4, b + 3), F.at(-W / 2, H + 2.4, b + 3)); }
  F.face('trim', -W / 4, -W / 4 + 6, 0, 5, 0.02, rgb(0x5a6a7a));
  F.box('trim', -W / 2, W / 2, H - 1.4, H - 0.6, 0, 0.05, pick(r, [RED, BLUE, rgb(0x2a8a3a)]));
}
/** Vine rows: low green hedges in a terraced field. */
function vines(F, r) {
  for (let b = -10; b < 10; b += 2.2) F.box('leaf', -10, 10, 0, 1.1, b - 0.35, b + 0.35, rgb(pick(r, [0x5a7a2a, 0x6a8a32, 0x4e6e26])));
}
/** Montserrat: the saw-tooth massif of rounded rock pinnacles on the horizon. */
function montserrat(F, r) {
  for (let k = 0; k < 60; k++) {
    const a = (k / 60 - 0.5) * 2400 + (r() - 0.5) * 30, h = 260 + Math.sin(k * 0.35) * 120 + r() * 140;
    F.block('stucco', [[a - 40, -60], [a + 40, -60], [a + 40, 60], [a - 40, 60]], [[a - 12, -20], [a + 12, -20], [a + 12, 20], [a - 12, 20]], 0, h, scaleC(rgb(0xb8a894), 0.9 + r() * 0.15));
  }
}

const VENUE = {
  pitSide: 'L', paddock: [-250, 60], tunnel: 160, ring: 170, exits: [0.12, 0.42, 0.7],
  palette: [0xf2f2ee, 0xc0c4c8, 0x1b1b1f, 0x5a5e64, 0xc60b1e, 0x2a4a8a, 0xd8d0b8, 0xffc400],
  mix: { car: 6, van: 1.5, bus: 1, truck: 1 }, density: 12,
  bus: rgb(0xc60b1e), gate: RED, heli: YELLOW, hoarding: BLUE, crane: YELLOW,
  liveries: [RED, YELLOW, BLUE, WHITE], busTerminals: 2, sites: 1, hospitality: 8,
  concessions: [6, 22, 42, 53],
};
let net = {};

export function buildCatalunyaScene(L) {
  net = {};
  let tx0 = Infinity, tx1 = -Infinity, tz0 = Infinity, tz1 = -Infinity;
  for (let i = 0; i < L.N; i++) { tx0 = Math.min(tx0, L.x[i]); tx1 = Math.max(tx1, L.x[i]); tz0 = Math.min(tz0, L.z[i]); tz1 = Math.max(tz1, L.z[i]); }
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const hills = (x, z) => Math.sin(x * 0.006 + 0.3) * Math.cos(z * 0.0055 + 1.0) * 0.6 + Math.sin(x * 0.015 - z * 0.012) * 0.3 + Math.sin(z * 0.035 + x * 0.02) * 0.1;
  const ca = Math.cos(0.5), sa = Math.sin(0.5);
  const plot = (x, z) => {
    const u = x * ca - z * sa, v = x * sa + z * ca, i = Math.floor(u / 90), j = Math.floor(v / 70);
    return Math.floor((Math.abs(Math.sin(i * 127.1 + j * 311.7) * 43758.5453) % 1) * 4); // 0 vines, 1 olives, 2 scrub, 3 field
  };

  return buildRealScene(L, {
    name: 'Catalunya',
    trackside: { suburb: 0.3, warehouses: 0.4, skyline: { count: 220, tall: 45, dir: 3.6, spread: 3.5 } },
    seed: 1991,
    margin: 800,
    pitTheme,
    style: {
      kerb: [rgb(0xf2f1ec), rgb(0xc60b1e)],
      runoff: 'brand', runoffFloor: [0.085, 0.085, 0.09],
      barrier: 'armco', fence: true, lamps: 'none', verge: 'none', grass: [0.5, 0.56, 0.3],
      sponsors: SPONSORS,
      zoneBrands: ['SANGRIA SOL', 'MONTSERRAT WATER', 'TAPAS TELECOM', 'IBERIA FUEL', 'FLAMENCO AIR'],
      primeBrands: ['CATALANA BANK', 'RIOJA RESERVA'],
      title: ['BARCELONA', 'GRAN PREMIO DE ESPAÑA', '#c60b1e', '#ffffff', '#ffc400'],
      bridges: [['SANGRIA SOL', 'SALUD', '#c60b1e', '#ffffff', '#ffc400'], ['TAPAS TELECOM', 'SIEMPRE CONECTADO', '#ffb400', '#1b1b1f', '#c60b1e']],
      roadName: 'CATALUNYA',
      bannerGlow: 0.15,
      boardBorder: '#c60b1e',
    },
    fascia: ['BARCELONA', 'GRAN PREMIO DE ESPAÑA'],
    fasciaColours: ['#c60b1e', '#ffffff', '#ffc400'],
    skirtColour: [0.62, 0.58, 0.38],
    roadTheme: { asphalt: 0xc4c0b8, edge: [0.95, 0.95, 0.92], centre: [0.95, 0.95, 0.92], shoulder: [0.66, 0.6, 0.44] },
    relief(x, z, d) { return hills(x, z) * 24 * smooth(40, 300, d); },
    // Dry summer hills: tawny grass, olive-green scrub, red earth on the banks, terraced plots further out.
    colourAt(x, z, h, slope, d) {
      const lawn = [0.44, 0.54, 0.26], tawny = [0.74, 0.66, 0.42], scrub = [0.46, 0.5, 0.3], earth = [0.66, 0.46, 0.3];
      let c = d < 45 ? lawn : tawny.map((v, k) => v + (scrub[k] - v) * Math.max(0, hills(x * 3, z * 3)));
      if (d > 320) { const p = plot(x, z); c = [[0.5, 0.56, 0.3], [0.6, 0.62, 0.38], c, [0.78, 0.7, 0.46]][p]; }
      if (slope > 0.18) c = c.map((v, k) => v + (earth[k] - v) * Math.min(0.7, (slope - 0.18) * 2.5));
      return c;
    },
    stands: [
      { at: 0, side: 'R', W: 230, tiers: 22, build: mainGrandstand, depth: 22, offset: -40 }, // Tribuna Principal
      { at: 4, side: 'outside', W: 110, tiers: 18, build: tribune }, // T1
      { at: 13, side: 'outside', W: 90, tiers: 16, build: tribune }, // Renault
      { at: 23, side: 'outside', W: 80, tiers: 16, build: tribune }, // Repsol
      { at: 30, side: 'outside', W: 70, tiers: 14, build: tribune }, // Seat
      { at: 43, side: 'outside', W: 80, tiers: 16, build: tribune }, // Campsa
      { at: 53, side: 'outside', W: 90, tiers: 16, build: tribune }, // La Caixa
      { at: 60, side: 'outside', W: 80, tiers: 16, build: tribune }, // the stadium section
      { at: 66, side: 'outside', W: 80, tiers: 16, build: tribune },
    ],
    roads(ctx) { net = venueRoads(ctx, VENUE); },
    landmarks({ L, R, frameAt, kit, terrain, placed, bs, group }) {
      venueBackOfHouse({ L, R, kit, bs, placed, frameAt }, net, VENUE);
      // Fans on the grass banks (the circuit's famous hillside general admission).
      let ga = 0;
      for (const [at, W, D] of [[8, 80, 30], [17, 70, 26], [26, 70, 26], [36, 60, 24], [46, 80, 30], [57, 60, 24]]) {
        const s = L.pointS(at), i = Math.floor(s / L.ds) % L.N;
        const fr = kit.frontage(s, L.k[i] > 0 ? 'R' : 'L', 8);
        const rx = fr.dirZ, rz = -fr.dirX, yaw = Math.atan2(-fr.dirX, -fr.dirZ), fans = [];
        for (let k = 0; k < W * D * 0.09; k++) {
          const a = (R() - 0.5) * W, b = R() * D, x = fr.x + rx * a + fr.dirX * b, z = fr.z + rz * a + fr.dirZ * b;
          if (!kit.isFree(x, z, 0.5) || bs.near(x, z, 1) || kit.overlaps({ cx: x, cz: z, ux: 1, uz: 0, hw: 0.4, hd: 0.4 })) continue;
          fans.push({ p: [x, terrain.heightAt(x, z) - 0.02, z], yaw: yaw + (R() - 0.5) * 0.7, seated: R() < 0.6, cheer: R() < 0.25 ? 0.6 : 0 });
        }
        kit.addCrowd(fans, 9700 + at);
        ga += fans.length;
      }
      placed.ga = ga;
      // Montmeló along the roads out: white town houses, masias on the hills, warehouses by the motorway.
      let town = 0, farms = 0, sheds = 0;
      for (const [k, e] of net.exits.entries()) for (const side of [1, -1]) {
        for (const F of bs.roadside(e, { side, W: k === 2 ? 70 : 13, D: k === 2 ? 36 : 11, every: k === 2 ? 30 : 15, from: 120, count: k === 2 ? 8 : 26, margin: 2, apron: k === 2 ? [0.55, 0.55, 0.52] : [0.62, 0.6, 0.56] })) {
          if (k === 2) { warehouse(F, R); sheds++; } else { townHouse(F, R); town++; }
        }
      }
      for (let n = 0; n < 500 && farms < 26; n++) {
        const x = tx0 - 500 + R() * (tx1 - tx0 + 1000), z = tz0 - 500 + R() * (tz1 - tz0 + 1000);
        if (terrain.distAt(x, z) < 260 || bs.near(x, z, 14) || kit.overlaps({ cx: x, cz: z, ux: 1, uz: 0, hw: 14, hd: 10 })) continue;
        kit.footprints.push({ cx: x, cz: z, ux: 1, uz: 0, hw: 14, hd: 10 });
        masia(frameAt(x, z, R() * 6, terrain.heightAt(x, z) - 0.6), R);
        farms++;
      }
      placed.towns = { town, farms, sheds };
      // Montserrat, 30 km west: far out, exempt from the haze but tinted to it.
      const sky = new MeshBuilder();
      montserrat(new Frame(sky, tx0 - 3200, -20, (tz0 + tz1) / 2 - 400, Math.cos(1.35), -Math.sin(1.35)), R);
      group.add(sky.build({ stucco: new MeshBasicMaterial({ vertexColors: true, fog: false, color: 0xc4c0c8 }) }));
    },
    trees: {
      variants: [stonePine, olive, cypress, vines],
      attempts: 22000,
      scale: [1.1, 1, 1, 1],
      test(x, z, d, h, R) {
        if (d < 30) return -1;
        if (d > 320) {
          const p = plot(x, z);
          if (p === 0) return R() < 0.25 ? 3 : -1; // vineyards
          if (p === 1) return R() < 0.35 ? 1 : -1; // olive groves
          if (p === 2) return R() < 0.15 ? 0 : -1; // pine scrub
          return R() < 0.01 ? 2 : -1;
        }
        const n = hills(x * 2, z * 2);
        if (n > 0.3) return R() < 0.5 ? 0 : -1; // umbrella pines on the ridges
        return R() < 0.04 ? 1 : R() < 0.02 ? 2 : -1;
      },
    },
  });
}
