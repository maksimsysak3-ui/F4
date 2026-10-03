import { MeshBasicMaterial } from 'three';
import { MeshBuilder } from '../../car/meshBuilder.js';
import { Frame, rgb, scaleC, pick } from '../street/kit.js';
import { buildRealScene } from './scene.js';
import { venueRoads, venueBackOfHouse } from './backOfHouse.js';

/*
 * Hungaroring, handcrafted: the circuit lies in a valley outside Mogyoród, the
 * hillsides around it a natural amphitheatre where fans sit on the grass. The
 * Super Gold grandstand with its white cantilever roof faces the pits; open
 * tribunes in red, white and green sit at T1, T2, T4, the chicane and the final
 * corners. The slopes are dry summer grass under dark oak and locust woods; far out,
 * the farmland of the plain with rows of poplars, the village with its red-tiled houses and church,
 * the M3 motorway, and Budapest's skyline with the Parliament dome on the horizon.
 */

const RED = rgb(0xcd2a3e), WHITE = rgb(0xf2f2ee), GREEN = rgb(0x436f4d), STEEL = rgb(0x8a929e), CONCRETE = rgb(0xb8b6b0);
const SHIRTS = [RED, WHITE, GREEN, rgb(0xff7a12), rgb(0x1b1b1f), rgb(0x2a5ab8), rgb(0xf2c200), RED];

const SPONSORS = [
  ['DUNA BANK', '#1f3a6a', '#ffffff', '#cd2a3e', 'serif'],
  ['PAPRIKA AIR', '#cd2a3e', '#ffffff', '#f2c200', 'wave'],
  ['TOKAJ WINE', '#5a1a2a', '#f2d8a0', '#f2d8a0', 'serif'],
  ['BALATON COLA', '#1f7ab8', '#ffffff', '#cd2a3e', 'wave'],
  ['MAGYAR OIL', '#436f4d', '#ffffff', '#f2c200', 'tread'],
  ['PUSZTA TYRES', '#141416', '#f2c200', '#f2c200', 'tread'],
  ['LÁNCHÍD TELECOM', '#2a2a6a', '#ffffff', '#6ad8ff', 'bolt'],
  ['GULYÁS GRILL', '#8a3a1a', '#ffe0b0', '#ffe0b0', 'grain'],
];

/** Super Gold main grandstand: red seats on concrete, a white roof cantilevered from raking masts at the back. */
function mainGrandstand(F, r, W, tiers) {
  const seats = [];
  const step = 0.85, rise = 0.58;
  F.box('concrete', -W / 2, W / 2, 0, 2.8, -1.8, 0.2, scaleC(CONCRETE, 0.9));
  for (let a = -W / 2 + 4; a < W / 2 - 4; a += 9) F.face('winLit', a, a + 6, 0.5, 2.4, 0.21, [1.2, 1.1, 0.9]);
  for (let k = 0; k < tiers; k++) {
    const y = 2.8 + k * rise, b1 = -1.8 - k * step, b0 = b1 - step;
    F.box('concrete', -W / 2, W / 2, y - 0.55, y, b0, b1, CONCRETE);
    const col = k % 8 === 7 ? WHITE : scaleC(RED, k % 2 ? 0.9 : 1);
    F.box('trim', -W / 2, W / 2, y, y + 0.07, b0 + 0.05, b1, col);
    F.box('trim', -W / 2, W / 2, y + 0.07, y + 0.4, b0 + 0.05, b0 + 0.13, scaleC(col, 0.78));
    for (let a = -W / 2 + 0.4; a < W / 2 - 0.3; a += 0.55) if (r() < 0.88) seats.push(F.at(a + (r() - 0.5) * 0.1, y + 0.07, b1 - 0.45));
  }
  const depth = 1.8 + tiers * step, top = 2.8 + tiers * rise;
  F.box('concrete', -W / 2, W / 2, 0, top + 1.3, -depth - 0.6, -depth, scaleC(CONCRETE, 0.8));
  // Masts raking back from the rear wall, the roof plate cantilevered forward over the seats.
  const roofY = top + 5.5;
  for (let a = -W / 2 + 3; a <= W / 2 - 3; a += 15) {
    F.block('metal', [[a - 0.35, -depth - 0.4], [a + 0.35, -depth - 0.4], [a + 0.35, -depth + 0.3], [a - 0.35, -depth + 0.3]],
      [[a - 0.25, -depth + 0.4], [a + 0.25, -depth + 0.4], [a + 0.25, -depth + 0.9], [a - 0.25, -depth + 0.9]], 0, roofY + 6, WHITE);
    for (let k = 0; k < 4; k++) {
      const b0 = -depth + 0.6 + (k / 4) * (depth + 2), b1 = -depth + 0.6 + ((k + 1) / 4) * (depth + 2);
      F.mb.color = STEEL;
      const p = F.at(a, roofY + 6 - k * 1.4, b0), q = F.at(a, roofY + 6 - (k + 1) * 1.4, b1);
      F.mb.hexa('metal', [[p[0] - 0.05, p[1], p[2]], [p[0] + 0.05, p[1], p[2]], [p[0] + 0.05, p[1] - 0.1, p[2]], [p[0] - 0.05, p[1] - 0.1, p[2]]],
        [[q[0] - 0.05, q[1], q[2]], [q[0] + 0.05, q[1], q[2]], [q[0] + 0.05, q[1] - 0.1, q[2]], [q[0] - 0.05, q[1] - 0.1, q[2]]]);
    }
  }
  F.block('roof', [[-W / 2 - 1, -depth - 0.5], [W / 2 + 1, -depth - 0.5], [W / 2 + 1, 2.6], [-W / 2 - 1, 2.6]],
    [[-W / 2 - 1, -depth - 0.5], [W / 2 + 1, -depth - 0.5], [W / 2 + 1, 2.6], [-W / 2 - 1, 2.6]], roofY, roofY + 0.6, WHITE);
  F.box('trim', -W / 2 - 1, W / 2 + 1, roofY - 0.9, roofY, 2.5, 2.6, RED);
  return { seats, fascia: { a0: -W / 2 - 1, a1: W / 2 + 1, y0: roofY - 0.9, y1: roofY, b: 2.62 }, shirts: SHIRTS };
}

/** Open tribune: steel frame, grey seats, a red-white-green banner along the top and flags. */
function tribune(F, r, W, tiers) {
  const seats = [];
  const step = 0.8, rise = 0.6;
  for (let k = 0; k < tiers; k++) {
    const y = 1.1 + k * rise, b1 = -k * step, b0 = b1 - step;
    const col = k % 2 ? rgb(0xa0a4aa) : rgb(0x9298a0);
    F.box('trim', -W / 2, W / 2, y - 0.07, y, b0, b1, col);
    F.box('trim', -W / 2, W / 2, y, y + 0.36, b0, b0 + 0.08, scaleC(col, 0.8));
    for (let a = -W / 2 + 0.4; a < W / 2 - 0.3; a += 0.55) if (r() < 0.85) seats.push(F.at(a + (r() - 0.5) * 0.1, y, b1 - 0.42));
  }
  const depth = tiers * step, top = 1.1 + tiers * rise;
  for (let a = -W / 2; a <= W / 2 + 0.01; a += 4) {
    for (let k = 0; k < tiers; k += 3) F.box('metal', a - 0.05, a + 0.05, 0, 1.1 + k * rise, -k * step - 0.05, -k * step + 0.05, STEEL);
    F.box('metal', a - 0.05, a + 0.05, 0, top + 1.2, -depth - 0.05, -depth + 0.05, STEEL);
  }
  // Tricolour band on the back rail and flags on poles.
  for (const [k, col] of [RED, WHITE, GREEN].entries()) F.box('fabric', -W / 2, W / 2, top + 0.2 + k * 0.33, top + 0.53 + k * 0.33, -depth - 0.08, -depth - 0.06, col);
  for (let a = -W / 2; a <= W / 2; a += 12) {
    F.box('metal', a - 0.04, a + 0.04, top, top + 4.5, -depth - 0.2, -depth - 0.12, STEEL);
    for (const [k, col] of [RED, WHITE, GREEN].entries()) F.box('fabric', a, a + 2.2, top + 4.2 - k * 0.45, top + 4.65 - k * 0.45, -depth - 0.17, -depth - 0.15, col);
  }
  F.box('trim', -W / 2, W / 2, 0, 1.2, 0, 0.12, RED);
  return { seats, fascia: { a0: -W / 2, a1: W / 2, y0: 0.15, y1: 1.1, b: 0.13 }, shirts: SHIRTS };
}

/** Pit building: white, a fully glazed upper floor under a forward-tilted canopy; race control in a glass-topped tower. */
const pitTheme = {
  wall: rgb(0xeeeeea),
  upper(F, hw, i, rc, { H1, DEPTH }) {
    const top = H1 + 3.8;
    F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -1.0, rgb(0xeeeeea));
    F.face(i % 4 === 0 ? 'winLit' : 'glass', -hw + 0.2, hw - 0.2, H1 + 0.3, top - 0.3, -0.98, [1.1, 1.15, 1.2]);
    F.block('roof', [[-hw, -DEPTH], [hw, -DEPTH], [hw, 1.6], [-hw, 1.6]], [[-hw, -DEPTH], [hw, -DEPTH], [hw, 1.6], [-hw, 1.6]], top + 0.2, top + 0.6, WHITE);
    F.box('trim', -hw, hw, top + 0.1, top + 0.25, 1.5, 1.65, RED);
    if (rc) {
      F.box('stucco', -hw + 0.6, hw - 0.6, top + 0.6, top + 9, -DEPTH + 1, -1.5, rgb(0xe8e8e4));
      F.box('glass', -hw + 0.4, hw - 0.4, top + 9, top + 12, -DEPTH + 0.8, -1.3, null);
      F.box('roof', -hw, hw, top + 12, top + 12.5, -DEPTH + 0.4, -0.9, WHITE);
    }
  },
};

const WALLS = [0xf2ead8, 0xf2e2b0, 0xe8dcc8, 0xf8f4ec, 0xe8d0a8, 0xd8c8b0].map(rgb);
const TILE = [0xa8442a, 0x9a3a24, 0xb8543a, 0x8a3a2a].map(rgb);

/** Village house: whitewashed or ochre walls, a steep red-tiled hip roof, a chimney, a fence. */
function villageHouse(F, r) {
  const W = 9 + r() * 3, D = 9 + r() * 2, H = 3 + (r() < 0.25 ? 2.8 : 0);
  F.box('stucco', -W / 2, W / 2, -0.6, H, -D - 1, -1, pick(r, WALLS));
  F.hipRoof('roof', -W / 2, W / 2, -D - 1, -1, H, 3 + r(), pick(r, TILE), 0.5);
  F.box('stucco', W / 4, W / 4 + 0.6, H + 1, H + 3.6, -D / 2 - 1.3, -D / 2 - 0.7, rgb(0xb8a890));
  for (const a of [-W / 4, W / 4]) F.face('glass', a - 0.6, a + 0.6, 1.0, 2.1, -0.98, null);
  F.box('trim', -W / 2 - 1, W / 2 + 1, 0, 1.1, -0.1, 0, rgb(0x6a5a48)); // garden fence
}

/** The village church: a white nave with a tall pointed spire. */
function church(F) {
  F.box('stucco', -6, 6, 0, 8, -22, 0, rgb(0xf4f0e6));
  F.gableRoof('roof', -6, 6, -22, 0, 8, 5, rgb(0x8a3a2a), rgb(0xf4f0e6));
  F.box('stucco', -3, 3, 0, 20, -2, 4, rgb(0xf4f0e6));
  F.face('glass', -1, 1, 15, 18, 4.02, null);
  F.block('copper', [[-3, -2], [3, -2], [3, 4], [-3, 4]], [[0, 1], [0, 1], [0, 1], [0, 1]], 20, 34, rgb(0x4a7a6a));
}

/** Budapest on the horizon: blocks, the Parliament with its dome and spires, a TV mast. */
function budapest(F, r) {
  for (let k = 0; k < 40; k++) {
    const a = (r() - 0.5) * 1600, b = (r() - 0.5) * 300, w = 30 + r() * 50, d = 25 + r() * 30, h = 25 + r() * r() * 90;
    F.box('stucco', a - w / 2, a + w / 2, 0, h, b - d / 2, b + d / 2, scaleC(rgb(pick(r, [0xb8b4a8, 0xa8a49a, 0xc8c2b4, 0x9a968c])), 0.9 + r() * 0.2));
  }
  // Parliament: long gothic block, central dome on a drum, spires along the front.
  F.box('stucco', -170, 170, 0, 45, -30, 30, rgb(0xd8ccb0));
  F.cylinder('stucco', 0, 0, 30, 45, 75, 14, rgb(0xd8ccb0));
  F.block('stucco', [[-30, -30], [30, -30], [30, 30], [-30, 30]], [[-4, -4], [4, -4], [4, 4], [-4, 4]], 75, 105, rgb(0x6a6a62));
  for (let a = -160; a <= 160; a += 40) F.block('stucco', [[a - 4, 26], [a + 4, 26], [a + 4, 34], [a - 4, 34]], [[a, 30], [a, 30], [a, 30], [a, 30]], 45, 70, rgb(0xd0c4a8));
  F.box('stucco', 500, 508, 0, 190, -60, -52, rgb(0xb8bcc4));
}

/** Oak: a broad, rounded, slightly ragged crown. */
function oak(F, r) {
  const h = 7 + r() * 4, spread = 4.5 + r() * 2.5;
  F.cylinder('trim', 0, 0, 0.4, 0, h * 0.5, 6, rgb(0x4a3a2a));
  for (let k = 0; k < 6; k++) {
    const t = (k / 6) * Math.PI * 2 + r(), rr = spread * (0.3 + r() * 0.3), lr = spread * (0.45 + r() * 0.2), y = h * (0.45 + r() * 0.2);
    F.blob('leaf', Math.cos(t) * rr, Math.sin(t) * rr, lr, y, y + lr * 1.15, 8, scaleC(rgb(pick(r, [0x3e5a26, 0x4a6a2c, 0x36521f])), 0.9 + r() * 0.2));
  }
  F.blob('leaf', 0, 0, spread * 0.55, h * 0.72, h + 1, 8, rgb(0x46642a));
}
/** Lombardy poplar: tall and narrow, lining the roads and field edges. */
function poplar(F, r) {
  const h = 14 + r() * 6;
  F.cylinder('trim', 0, 0, 0.3, 0, h * 0.25, 6, rgb(0x5a4a3a));
  F.blob('leaf', 0, 0, 1.6, h * 0.15, h * 0.6, 7, rgb(0x4a6a2c));
  F.blob('leaf', 0, 0, 1.25, h * 0.5, h, 7, rgb(0x52722e));
}
/** Black locust (acacia): an airy, open crown of small clumps. */
function acacia(F, r) {
  const h = 8 + r() * 3;
  F.cylinder('trim', 0, 0, 0.3, 0, h * 0.6, 6, rgb(0x5a4a3a));
  for (let k = 0; k < 5; k++) {
    const t = (k / 5) * Math.PI * 2 + r(), rr = 1.5 + r() * 1.5, y = h * (0.6 + r() * 0.25);
    F.blob('leaf', Math.cos(t) * rr, Math.sin(t) * rr, 1.4 + r(), y, y + 1.8, 7, rgb(pick(r, [0x6a8a3a, 0x7a9a42, 0x5a7a32])));
  }
}
const VENUE = {
  pitSide: 'R', paddock: [-210, 120], tunnel: 210, ring: 170, exits: [0.12, 0.47, 0.78],
  palette: [0xf2f2ee, 0xc0c4c8, 0x1b1b1f, 0x5a5e64, 0x9a1418, 0x2a4a8a, 0x3a5a3a, 0xd8d0b8],
  mix: { car: 6, van: 1.3, bus: 0.8, truck: 0.6 }, density: 11,
  bus: rgb(0x1f6ad8), gate: RED, heli: rgb(0xf2c200), hoarding: GREEN, crane: rgb(0xd8b020),
  liveries: [RED, WHITE, GREEN, rgb(0x1b1b1f)], busTerminals: 2, sites: 1,
  concessions: [3, 22, 31, 50],
};
let net = {};

export function buildHungaroringScene(L) {
  net = {};
  let tx0 = Infinity, tx1 = -Infinity, tz0 = Infinity, tz1 = -Infinity;
  for (let i = 0; i < L.N; i++) { tx0 = Math.min(tx0, L.x[i]); tx1 = Math.max(tx1, L.x[i]); tz0 = Math.min(tz0, L.z[i]); tz1 = Math.max(tz1, L.z[i]); }
  const hills = (x, z) => Math.sin(x * 0.005 + 0.4) * Math.cos(z * 0.0045 + 1.2) * 0.6 + Math.sin(x * 0.013 - z * 0.009) * 0.3 + Math.sin(z * 0.03 + x * 0.011) * 0.1;
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  // Field patchwork on a grid turned 20 degrees: 0 sunflower, 1 wheat, 2 young maize, 3 ploughed, 4 meadow.
  const ca = Math.cos(0.35), sa = Math.sin(0.35);
  const field = (x, z) => {
    const u = x * ca - z * sa, v = x * sa + z * ca;
    const i = Math.floor(u / 170), j = Math.floor(v / 120);
    const h = Math.abs(Math.sin(i * 127.1 + j * 311.7) * 43758.5453) % 1;
    return { kind: Math.floor(h * 5), edge: Math.min(u - i * 170, (i + 1) * 170 - u, v - j * 120, (j + 1) * 120 - v) < 5 };
  };

  // Woodland: patches on the hilltops and along the ridges around the valley (> 0 inside a wood).
  const forest = (x, z) => hills(x * 1.6 + 300, z * 1.6 - 120) * 0.7 + hills(x * 4.1, z * 4.1) * 0.3 - 0.12;

  return buildRealScene(L, {
    name: 'Hungaroring',
    seed: 1986,
    margin: 750,
    pitTheme,
    style: {
      kerb: [rgb(0xf2f1ec), rgb(0xcd2a3e)],
      runoff: 'stripes', runoffFloor: [0.08, 0.085, 0.08], stripes: [rgb(0x2f7a3a), rgb(0xf2f1ec)],
      barrier: 'armco', fence: true, lamps: 'none', verge: 'none', grass: [0.42, 0.56, 0.24],
      sponsors: SPONSORS,
      zoneBrands: ['PAPRIKA AIR', 'TOKAJ WINE', 'BALATON COLA', 'MAGYAR OIL', 'PUSZTA TYRES', 'GULYÁS GRILL'],
      primeBrands: ['DUNA BANK', 'LÁNCHÍD TELECOM'],
      title: ['HUNGARORING', 'MAGYAR NAGYDÍJ', '#cd2a3e', '#ffffff', '#436f4d'],
      bridges: [['PAPRIKA AIR', 'FLY HOT', '#cd2a3e', '#ffffff', '#f2c200'], ['BALATON COLA', 'ICE COLD', '#1f7ab8', '#ffffff', '#cd2a3e']],
      roadName: 'HUNGARORING',
      bannerGlow: 0.15,
      boardBorder: '#cd2a3e',
    },
    fascia: ['HUNGARORING', 'MAGYAR NAGYDÍJ'],
    fasciaColours: ['#cd2a3e', '#ffffff', '#436f4d'],
    skirtColour: [0.62, 0.6, 0.36],
    roadTheme: { asphalt: 0xc0c0c0, edge: [0.94, 0.94, 0.92], centre: [0.94, 0.94, 0.92], shoulder: [0.55, 0.52, 0.4] },
    // The valley: hillsides rising away from the circuit on all sides, gently rolling beyond.
    relief(x, z, d) { return smooth(40, 420, d) * 26 + hills(x, z) * 8 * smooth(60, 300, d); },
    // Summer at the Hungaroring: green watered lawns by the track, dry khaki grass on the slopes,
    // dark woods on the hilltops, bare earth on the steep banks, and farmland only far out.
    colourAt(x, z, h, slope, d) {
      const lawn = [0.4, 0.52, 0.22], khaki = [0.66, 0.6, 0.34], straw = [0.74, 0.66, 0.4], earth = [0.56, 0.44, 0.3], wood = [0.24, 0.32, 0.16];
      const n = hills(x * 3, z * 3), fine = hills(x * 9 + 40, z * 9);
      let c = khaki.map((v, k) => v + (straw[k] - v) * Math.max(0, fine) * 0.8);
      c = c.map((v, k) => v + (lawn[k] - v) * (1 - smooth(35, 90, d)));
      if (forest(x, z) > 0 && d > 110) c = c.map((v, k) => v + (wood[k] - v) * Math.min(1, forest(x, z) * 3));
      if (slope > 0.2) c = c.map((v, k) => v + (earth[k] - v) * Math.min(0.7, (slope - 0.2) * 2));
      if (d > 620) {
        const f = field(x, z);
        const fc = [[0.78, 0.66, 0.3], [0.72, 0.62, 0.36], [0.46, 0.56, 0.26], [0.52, 0.42, 0.3], [0.6, 0.6, 0.34]][f.kind];
        c = c.map((v, k) => v + (fc[k] - v) * smooth(620, 700, d) * (f.edge ? 0.3 : 1));
      }
      return c;
    },
    stands: [
      { at: 0, side: 'L', W: 200, tiers: 22, build: mainGrandstand, depth: 22, offset: -60 }, // Super Gold
      { at: 0, side: 'L', W: 110, tiers: 18, build: mainGrandstand, depth: 18, offset: 115 }, // Gold 1-2
      { at: 0, side: 'L', W: 110, tiers: 16, build: tribune, offset: -225 }, // Silver, by the last corner
      { at: 1, side: 'L', W: 90, tiers: 16, build: tribune, offset: 40 }, // Gold 3-4 towards T1
      { at: 3, side: 'outside', W: 120, tiers: 18, build: tribune, offset: 10 }, // T1
      { at: 11, side: 'outside', W: 70, tiers: 14, build: tribune }, // T2
      { at: 22, side: 'outside', W: 80, tiers: 14, build: tribune }, // T4
      { at: 31, side: 'outside', W: 70, tiers: 14, build: tribune }, // chicane
      { at: 47, side: 'outside', W: 60, tiers: 12, build: tribune }, // T12
      { at: 55, side: 'outside', W: 70, tiers: 14, build: tribune }, // T13
      { at: 61, side: 'outside', W: 80, tiers: 14, build: tribune }, // T14
    ],
    roads(ctx) { net = venueRoads(ctx, VENUE); },
    landmarks({ L, R, frameAt, kit, terrain, placed, bs, group }) {
      venueBackOfHouse({ L, R, kit, bs, placed, frameAt }, net, VENUE);
      // Fans on the hillsides: the natural amphitheatre at T1, T4, T5 and the final corners.
      let ga = 0;
      for (const [at, W, D] of [[4, 90, 34], [20, 70, 30], [26, 80, 34], [33, 60, 26], [41, 60, 26], [58, 70, 30]]) {
        const s = L.pointS(at), i = Math.floor(s / L.ds) % L.N;
        const fr = kit.frontage(s, L.k[i] > 0 ? 'R' : 'L', 8);
        const rx = fr.dirZ, rz = -fr.dirX, yaw = Math.atan2(-fr.dirX, -fr.dirZ), fans = [];
        for (let k = 0; k < W * D * 0.08; k++) {
          const a = (R() - 0.5) * W, b = R() * D;
          const x = fr.x + rx * a + fr.dirX * b, z = fr.z + rz * a + fr.dirZ * b;
          if (!kit.isFree(x, z, 0.5) || bs.near(x, z, 1) || kit.overlaps({ cx: x, cz: z, ux: 1, uz: 0, hw: 0.4, hd: 0.4 })) continue;
          fans.push({ p: [x, terrain.heightAt(x, z) - 0.02, z], yaw: yaw + (R() - 0.5) * 0.7, seated: R() < 0.6, cheer: R() < 0.2 ? 0.6 : 0 });
        }
        kit.addCrowd(fans, 7000 + at);
        ga += fans.length;
      }
      placed.ga = ga;
      // Mogyoród lines the roads beyond the slopes; the church on the perimeter road.
      let houses = 0;
      for (const rd of [net.ring, ...net.exits].filter(Boolean)) for (const side of rd === net.ring ? ['out'] : [1, -1]) {
        for (const fr of bs.alongside(rd, { side, offset: 3, every: 16 })) {
          if (terrain.distSmooth(fr.x, fr.z) < 230 || R() < 0.25) continue;
          const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 14, 13, 2, null);
          if (F) { villageHouse(F, R); houses++; }
        }
      }
      const C = bs.roadside(net.ring, { side: 'out', W: 16, D: 26, every: 50, from: 900, margin: 3, apron: [0.6, 0.58, 0.52] })[0];
      if (C) church(C);
      placed.village = houses;
      // Budapest, 20 km south-west: drawn far out, exempt from the haze but tinted to it.
      const sky = new MeshBuilder();
      budapest(new Frame(sky, tx0 - 2800, -8, tz1 + 2200, Math.cos(-0.5), -Math.sin(-0.5)), R);
      group.add(sky.build({ stucco: new MeshBasicMaterial({ vertexColors: true, fog: false, color: 0xc8c4b8 }) }));
    },
    trees: {
      variants: [oak, poplar, acacia],
      attempts: 26000,
      scale: [1.1, 1, 0.9],
      test(x, z, d, h, R) {
        if (d < 30) return -1;
        const f = forest(x, z);
        if (f > 0 && d > 110) return R() < 0.75 ? 0 : 2; // the woods: oaks with black locust at the edges
        if (d > 620) { const fl = field(x, z); return fl.edge && R() < 0.4 ? 1 : -1; } // poplar rows between the fields
        return R() < 0.03 ? 0 : -1; // the odd lone oak on the slopes
      },
    },
  });
}
