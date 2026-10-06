import { rgb, scaleC, pick } from '../street/kit.js?v=a5d31c9';
import { buildRealScene } from '../real/scene.js?v=a5d31c9';
import { venueRoads, venueBackOfHouse } from '../real/backOfHouse.js?v=a5d31c9';
import { sub, VEHICLES } from '../backstageProps.js?v=a5d31c9';

/*
 * Red Mesa Canyon, handcrafted: a raceway on the floor of a desert canyon at
 * golden hour. Flat-topped mesas and buttes with striped cliffs (red, rust,
 * cream sandstone strata) stand around the circuit; a natural stone arch and
 * hoodoos rise beside the Gulch. Saguaros, Joshua trees and sagebrush dot the
 * sand. The pit building is adobe with timber vigas; shade-canopy grandstands
 * line the straight. A desert town sits on the road out: diner, gas station,
 * motel, water tower, windmill; a freight railroad and power lines run past.
 */

const SAND = rgb(0xe8c8a0), RUST = rgb(0xb8502a), ADOBE = rgb(0xd09a6a), WOOD = rgb(0x6a4a30), STEEL = rgb(0x8a929e), WHITE = rgb(0xf2ece0);
const TURQ = rgb(0x2aa8a0);
const SHIRTS = [RUST, WHITE, TURQ, rgb(0x1b1b1f), rgb(0xf2c200), rgb(0x2a5ab8), rgb(0xe86a2a), SAND];

const SPONSORS = [
  ['MESA MOTOR OIL', '#b8502a', '#ffffff', '#f2c200', 'tread'],
  ['COYOTE COLA', '#c8242b', '#ffffff', '#2aa8a0', 'wave'],
  ['ROUTE 9 DINER', '#2aa8a0', '#ffffff', '#ff6a8a', 'serif'],
  ['SIDEWINDER TYRES', '#141416', '#f2c200', '#f2c200', 'tread'],
  ['DUST DEVIL ENERGY', '#e86a2a', '#1b1b1f', '#1b1b1f', 'bolt'],
  ['CANYON AIR', '#3a62a8', '#ffffff', '#f0b070', 'wave'],
  ['SAGEBRUSH BANK', '#4a5a3a', '#f2ece0', '#d8b070', 'serif'],
  ['TUMBLEWEED TV', '#6a3a8a', '#ffffff', '#f2c200', 'stripes'],
];

/** Main grandstand: steel tiers under sail-like shade canopies on tall masts. */
function shadeGrandstand(F, r, W, tiers) {
  const seats = [];
  const step = 0.82, rise = 0.6;
  F.box('concrete', -W / 2, W / 2, 0, 2.4, -1.5, 0.2, ADOBE);
  for (let k = 0; k < tiers; k++) {
    const y = 2.4 + k * rise, b1 = -1.5 - k * step, b0 = b1 - step;
    const col = k % 6 < 3 ? TURQ : scaleC(TURQ, 0.8);
    F.box('trim', -W / 2, W / 2, y - 0.08, y, b0, b1, rgb(0x9a9ea6));
    F.box('trim', -W / 2, W / 2, y, y + 0.38, b0, b0 + 0.08, col);
    for (let a = -W / 2 + 0.4; a < W / 2 - 0.3; a += 0.55) if (r() < 0.85) seats.push(F.at(a + (r() - 0.5) * 0.1, y, b1 - 0.42));
  }
  const depth = 1.5 + tiers * step, top = 2.4 + tiers * rise;
  for (let a = -W / 2; a <= W / 2 + 0.01; a += 4) F.box('metal', a - 0.05, a + 0.05, 0, top + 0.8, -depth - 0.05, -depth + 0.05, STEEL);
  // Shade sails: tilted triangles between masts, alternating sand and rust.
  for (let a = -W / 2; a < W / 2 - 1; a += 20) {
    const a1 = Math.min(W / 2, a + 20), am = (a + a1) / 2;
    F.box('metal', am - 0.15, am + 0.15, 0, top + 9, -depth - 0.4, -depth - 0.1, WHITE);
    F.mb.color = Math.floor((a + W / 2) / 20) % 2 ? SAND : RUST;
    F.mb.triFacing('fabric', F.at(a, top + 4.5, 1.5), F.at(a1, top + 4.5, 1.5), F.at(am, top + 9, -depth - 0.2), [0, 1, 0]);
    F.mb.triFacing('fabric', F.at(a, top + 4.5, 1.5), F.at(am, top + 9, -depth - 0.2), F.at(a1, top + 4.5, 1.5), [0, -1, 0]);
  }
  return { seats, fascia: { a0: -W / 2, a1: W / 2, y0: 0.4, y1: 2.2, b: 0.22 }, shirts: SHIRTS };
}

/** Bleacher on the canyon slopes: open steel, no roof, a sand-coloured banner rail. */
function bleacher(F, r, W, tiers) {
  const seats = [];
  const step = 0.8, rise = 0.58;
  for (let k = 0; k < tiers; k++) {
    const y = 1.0 + k * rise, b1 = -k * step, b0 = b1 - step;
    F.box('trim', -W / 2, W / 2, y - 0.07, y, b0, b1, rgb(0xb8bcc2));
    F.box('trim', -W / 2, W / 2, y, y + 0.34, b0, b0 + 0.07, rgb(0x9a9ea6));
    for (let a = -W / 2 + 0.4; a < W / 2 - 0.3; a += 0.55) if (r() < 0.82) seats.push(F.at(a + (r() - 0.5) * 0.1, y, b1 - 0.42));
  }
  const depth = tiers * step, top = 1.0 + tiers * rise;
  for (let a = -W / 2; a <= W / 2 + 0.01; a += 4) {
    for (let k = 0; k < tiers; k += 3) F.box('metal', a - 0.05, a + 0.05, 0, 1.0 + k * rise, -k * step - 0.05, -k * step + 0.05, STEEL);
    F.box('metal', a - 0.05, a + 0.05, 0, top + 1, -depth - 0.05, -depth + 0.05, STEEL);
  }
  F.box('fabric', -W / 2, W / 2, top, top + 1, -depth - 0.08, -depth - 0.06, RUST);
  F.box('trim', -W / 2, W / 2, 0, 1.1, 0, 0.12, SAND);
  return { seats, fascia: { a0: -W / 2, a1: W / 2, y0: 0.15, y1: 1.0, b: 0.13 }, shirts: SHIRTS };
}

/** Adobe pit building: thick rounded earth walls, timber vigas poking through, a shaded roof deck. */
const pitTheme = {
  wall: rgb(0xd8a878),
  upper(F, hw, i, rc, { H1, DEPTH }) {
    const top = H1 + 3.6;
    F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -0.6, ADOBE);
    F.face(i % 3 === 0 ? 'winLit' : 'glass', -hw + 0.8, hw - 0.8, H1 + 0.6, top - 0.6, -0.58, [1.3, 1.1, 0.8]);
    for (let a = -hw + 0.6; a < hw; a += 1.4) F.cylinder('trim', a, -0.2, 0.12, top - 0.5, top - 0.25, 6, WOOD); // viga ends
    F.box('stucco', -hw, hw, top, top + 0.7, -DEPTH + 0.4, -0.4, scaleC(ADOBE, 0.92)); // parapet
    for (let a = -hw + 1; a < hw; a += hw) F.box('trim', a - 0.08, a + 0.08, top + 0.7, top + 3.2, -1.2, -1, WOOD);
    F.box('trim', -hw, hw, top + 3.2, top + 3.35, -DEPTH + 0.8, -0.6, WOOD); // ramada shade
    if (rc) {
      F.box('stucco', -hw + 1, hw - 1, top + 0.7, top + 7, -DEPTH + 1.2, -1.4, ADOBE);
      F.box('glass', -hw + 1.2, hw - 1.2, top + 4, top + 6.5, -1.42, -1.38, null);
      F.box('stucco', -hw + 0.8, hw - 0.8, top + 7, top + 7.6, -DEPTH + 1, -1.2, scaleC(ADOBE, 0.9));
    }
  },
};

// ---- the canyon's rock and plants ----------------------------------------------------------------
/** Saguaro: a ribbed green column with upturned arms. */
function saguaro(F, r) {
  const h = 6 + r() * 5, G = rgb(0x4a7a3a);
  F.cylinder('leaf', 0, 0, 0.42, 0, h, 8, G);
  F.blob('leaf', 0, 0, 0.44, h - 0.6, h + 0.3, 8, scaleC(G, 1.05));
  for (let k = 0; k < 1 + Math.floor(r() * 3); k++) {
    const t = r() * 6.28, y = h * (0.35 + r() * 0.3), l = 1.1, ax = Math.cos(t) * l, az = Math.sin(t) * l, up = 1.5 + r() * 2;
    F.box('leaf', Math.min(0, ax) - 0.28, Math.max(0, ax) + 0.28, y - 0.28, y + 0.28, Math.min(0, az) - 0.28, Math.max(0, az) + 0.28, G);
    F.cylinder('leaf', ax, az, 0.3, y, y + up, 7, G);
    F.blob('leaf', ax, az, 0.31, y + up - 0.4, y + up + 0.2, 7, G);
  }
}
/** Joshua tree: a shaggy trunk forking into arms tipped with spiky leaf clusters. */
function joshua(F, r) {
  const h = 3 + r() * 2, T = rgb(0x6a5a44);
  F.cylinder('trim', 0, 0, 0.35, 0, h, 6, T);
  for (let k = 0; k < 3 + Math.floor(r() * 3); k++) {
    const t = (k / 4) * 6.28 + r(), l = 1 + r() * 1.5, y = h + r() * 1.5, ax = Math.cos(t) * l, az = Math.sin(t) * l;
    F.block('trim', [[-0.18, -0.18], [0.18, -0.18], [0.18, 0.18], [-0.18, 0.18]], [[ax - 0.15, az - 0.15], [ax + 0.15, az - 0.15], [ax + 0.15, az + 0.15], [ax - 0.15, az + 0.15]], h - 0.3, y, T);
    F.blob('leaf', ax, az, 0.65, y - 0.2, y + 1.0, 7, rgb(pick(r, [0x6a7a3a, 0x7a8a48, 0x5a6a32])));
  }
}
/** Sagebrush and creosote: low grey-green domes. */
function sage(F, r) {
  for (let k = 0; k < 4; k++) F.blob('leaf', (r() - 0.5) * 2.4, (r() - 0.5) * 2.4, 0.6 + r() * 0.6, 0, 0.6 + r() * 0.7, 6, rgb(pick(r, [0x8a9a6a, 0x9aa478, 0x7a8a5a, 0xa8a080])));
}
/** Boulders: a scatter of rounded sandstone blocks, half sunk into the sand. */
function boulders(F, r) {
  for (let k = 0; k < 3 + Math.floor(r() * 4); k++) {
    const a = (r() - 0.5) * 6, b = (r() - 0.5) * 6, rr = 0.6 + r() * r() * 2.4;
    F.blob('stucco', a, b, rr, -rr * 0.4, rr * (0.9 + r() * 0.6), 7, scaleC(pick(r, [RUST, rgb(0xc8784a), rgb(0x9a4a2a), rgb(0xd89a6a)]), 0.85 + r() * 0.25));
  }
}
/** Dead tree / ocotillo: grey whip-like stems from the ground. */
function ocotillo(F, r) {
  for (let k = 0; k < 7; k++) {
    const t = (k / 7) * 6.28 + r(), l = 1.2 + r() * 0.8, h = 3 + r() * 2.5;
    F.block('trim', [[-0.06, -0.06], [0.06, -0.06], [0.06, 0.06], [-0.06, 0.06]], [[Math.cos(t) * l - 0.03, Math.sin(t) * l - 0.03], [Math.cos(t) * l + 0.03, Math.sin(t) * l - 0.03], [Math.cos(t) * l + 0.03, Math.sin(t) * l + 0.03], [Math.cos(t) * l - 0.03, Math.sin(t) * l + 0.03]], 0, h, rgb(0x6a6a52));
  }
}
/** Hoodoo: a stack of sandstone drums capped by a harder, wider stone. */
function hoodoo(F, r) {
  let y = 0, rr = 2.2 + r();
  const n = 4 + Math.floor(r() * 3);
  for (let k = 0; k < n; k++) {
    const h = 2 + r() * 2.5, c = scaleC(k % 2 ? RUST : rgb(0xd88a5a), 0.9 + r() * 0.2);
    F.blob('stucco', (r() - 0.5) * 0.4, (r() - 0.5) * 0.4, rr, y - 0.3, y + h, 8, c);
    y += h * 0.85; rr *= 0.86;
  }
  F.blob('stucco', 0, 0, rr * 1.8, y - 0.3, y + 1.6, 8, rgb(0x8a5a40));
}
/** Natural sandstone arch spanning ~40 m. */
function stoneArch(F, r) {
  const span = 40, H = 26;
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) F.blob('stucco', s * (span / 2 + 2) + (r() - 0.5) * 2, (r() - 0.5) * 2, 7 - k * 0.6, k * 4, k * 4 + 6, 9, scaleC(RUST, 0.9 + r() * 0.15));
  for (let k = 0; k <= 12; k++) {
    const t = k / 12, a = -span / 2 + t * span, y = H - Math.pow(Math.abs(t - 0.5) * 2, 2) * 6;
    F.blob('stucco', a, (r() - 0.5), 4.5, y - 2, y + 4, 8, scaleC(rgb(0xc8683a), 0.92 + r() * 0.12));
  }
}

// ---- the town on the road out -----------------------------------------------------------------------
function diner(F, r) {
  F.box('stucco', -9, 9, 0, 4.2, -10, 0, rgb(0xd8d8d0));
  F.box('trim', -9.1, 9.1, 1.2, 1.6, -10.1, 0.05, TURQ);
  F.face('winLit', -8, 8, 1.7, 3.6, 0.02, [1.6, 1.3, 1.0]);
  F.box('trim', -9.3, 9.3, 4.2, 4.6, -10.2, 0.6, rgb(0xc8242b));
  // The pole sign with its neon.
  F.box('metal', 10, 10.4, 0, 9, -1, -0.6, STEEL);
  F.box('neon', 8, 13, 7, 9.5, -0.9, -0.7, [2.4, 0.5, 0.9]);
  F.box('neon', 8.5, 12.5, 7.4, 9.1, -0.68, -0.64, [2.2, 2.0, 1.4]);
}
function gasStation(F, r) {
  F.box('concrete', -12, 12, 0, 0.12, -14, 0, rgb(0x9a968e));
  for (const [a, b] of [[-9, -3], [9, -3], [-9, -10], [9, -10]]) F.box('metal', a - 0.25, a + 0.25, 0, 5, b - 0.25, b + 0.25, WHITE);
  F.box('trim', -11, 11, 5, 5.8, -12, -1, WHITE);
  F.box('trim', -11.05, 11.05, 5.2, 5.6, -12.05, -0.95, rgb(0xc8242b));
  for (const a of [-4, 4]) for (const b of [-4.5, -8.5]) { F.box('stucco', a - 0.4, a + 0.4, 0.12, 1.8, b - 0.3, b + 0.3, rgb(0xc8242b)); F.face('neon', a - 0.3, a + 0.3, 1.2, 1.6, b + 0.31, [2, 2, 1.8]); }
  F.box('stucco', -10, 0, 0, 3.6, -22, -15, rgb(0xe8dcc8));
  F.face('winLit', -9, -1, 0.8, 2.8, -14.98, [1.4, 1.3, 1.1]);
  F.box('metal', 13, 13.3, 0, 12, -1, -0.7, STEEL);
  F.box('stucco', 11.5, 15, 9, 12, -0.95, -0.75, rgb(0xc8242b));
}
function motel(F, r) {
  for (let k = 0; k < 8; k++) {
    const a = -21 + k * 6;
    F.box('stucco', a - 3, a + 3, 0, 3.4, -9, 0, k % 2 ? rgb(0xf0e2c8) : rgb(0xe8d4b4));
    F.face('trim', a - 1.8, a - 0.8, 0.1, 2.3, 0.02, TURQ);
    F.face(r() < 0.5 ? 'winLit' : 'glass', a + 0.2, a + 2.2, 1.1, 2.2, 0.02, [1.4, 1.2, 0.9]);
  }
  F.box('trim', -24.5, 24.5, 3.4, 3.8, -9.5, 1.6, rgb(0x6a4a30));
  for (let a = -24; a <= 24; a += 6) F.box('trim', a - 0.12, a + 0.12, 0, 3.4, 1.3, 1.5, WOOD);
  F.box('metal', 26, 26.4, 0, 10, -1, -0.6, STEEL);
  F.box('neon', 24, 30, 6.5, 10, -0.9, -0.7, [0.5, 2.0, 1.9]);
}
function waterTower(F) {
  for (const [a, b] of [[-2.5, -2.5], [2.5, -2.5], [2.5, 2.5], [-2.5, 2.5]]) F.box('metal', a - 0.2, a + 0.2, 0, 14, b - 0.2, b + 0.2, STEEL);
  F.cylinder('metal', 0, 0, 4.2, 14, 20, 14, rgb(0xd8d4c8));
  F.block('metal', [[-4.2, -4.2], [4.2, -4.2], [4.2, 4.2], [-4.2, 4.2]], [[0, 0], [0, 0], [0, 0], [0, 0]], 20, 22.5, rgb(0xb8b4a8));
  F.box('neon', -2.5, 2.5, 16.2, 17.6, 4.22, 4.26, [1.6, 0.6, 0.3]);
}
function windmill(F, r) {
  for (const [a, b] of [[-1.2, -1.2], [1.2, -1.2], [1.2, 1.2], [-1.2, 1.2]]) F.block('metal', [[a - 0.08, b - 0.08], [a + 0.08, b - 0.08], [a + 0.08, b + 0.08], [a - 0.08, b + 0.08]], [[a * 0.2 - 0.06, b * 0.2 - 0.06], [a * 0.2 + 0.06, b * 0.2 - 0.06], [a * 0.2 + 0.06, b * 0.2 + 0.06], [a * 0.2 - 0.06, b * 0.2 + 0.06]], 0, 10, STEEL);
  for (let k = 0; k < 12; k++) {
    const t = (k / 12) * Math.PI * 2;
    F.mb.color = STEEL;
    F.mb.triFacing('metal', F.at(0, 10.5, 0.4), F.at(Math.cos(t) * 2.4, 10.5 + Math.sin(t) * 2.4, 0.4), F.at(Math.cos(t + 0.2) * 2.4, 10.5 + Math.sin(t + 0.2) * 2.4, 0.4), [0, 0, 1]);
  }
  F.box('metal', -0.1, 0.1, 10.3, 10.7, -2.5, 0.4, STEEL);
  F.box('metal', -0.05, 0.05, 9.8, 11.4, -2.6, -2.4, STEEL);
}
/** One freight car (or locomotive) centred on its frame, length along a. */
function railcar(F, r, kind) {
  if (kind === 'loco') {
    F.box('stucco', -10, 10, 0.9, 4.4, -1.5, 1.5, rgb(0xf2c200));
    F.box('stucco', 6, 10, 4.4, 5, -1.3, 1.3, rgb(0x2a2e36));
    F.box('stucco', -10, 10, 0.9, 1.4, -1.52, 1.52, rgb(0x2a4a8a));
    return;
  }
  const col = rgb(pick(r, [0x8a3a22, 0x6a4a3a, 0x3a5a6a, 0x9a8a6a, 0x5a5a5e, 0xb86a2a]));
  if (kind === 'box') F.box('stucco', -4.2, 4.2, 0.9, 4.3, -1.45, 1.45, col);
  else { F.block('stucco', [[-4.2, -1.45], [4.2, -1.45], [4.2, 1.45], [-4.2, 1.45]], [[-4.2, -1.45], [4.2, -1.45], [4.2, 1.45], [-4.2, 1.45]], 1.2, 3.8, col); F.box('stucco', -2, 2, 0.7, 1.2, -1, 1, col); }
  F.box('stucco', -3.6, 3.6, 0.3, 0.9, -0.8, 0.8, rgb(0x1b1b1f)); // bogies
}

const VENUE = {
  pitSide: 'R', paddock: [-160, 180], tunnel: 300, ring: 150, exits: [0.2, 0.62],
  palette: [0xf2f2ee, 0xc8242b, 0x1b1b1f, 0xc0c4c8, 0x8a3a22, 0x2a4a8a, 0xd8c8a0, 0x2aa8a0],
  mix: { pickup: 5, car: 3, truck: 1.4, van: 1, bus: 0.4 }, density: 7,
  bus: rgb(0x2aa8a0), gate: RUST, heli: rgb(0xc8242b), hoarding: RUST, crane: rgb(0xf2c200),
  liveries: [RUST, WHITE, TURQ, rgb(0x1b1b1f)], busTerminals: 1, sites: 1, hospitality: 5,
  concessions: [5, 14, 24],
};
let net = {};

export function buildMesaScene(L) {
  net = {};
  // Mesas and buttes: flat-topped plateaus with steep cliff skirts, noisy edges, set around the canyon.
  const MESAS = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let cx = 0, cz = 0;
  for (let i = 0; i < L.N; i += 8) { cx += L.x[i]; cz += L.z[i]; }
  cx /= Math.ceil(L.N / 8); cz /= Math.ceil(L.N / 8);
  for (let k = 0; k < 14; k++) {
    const t = (k / 14) * Math.PI * 2 + rnd() * 0.3, rr = 620 + rnd() * 380;
    MESAS.push({ x: cx + Math.cos(t) * rr * 1.2, z: cz + Math.sin(t) * rr, r: 90 + rnd() * 160, h: 40 + rnd() * 55 });
  }
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const wob = (x, z) => Math.sin(x * 0.031 + z * 0.017) * 0.5 + Math.sin(z * 0.047 - x * 0.023) * 0.3 + Math.sin(x * 0.11) * 0.2;
  const mesaH = (x, z) => {
    let h = 0;
    for (const m of MESAS) {
      const d = Math.hypot(x - m.x, z - m.z) + wob(x, z) * 22;
      h = Math.max(h, m.h * smooth(m.r + 26, m.r, d));
    }
    return h;
  };
  const dunes = (x, z) => Math.sin(x * 0.008 + 0.5) * Math.cos(z * 0.007 + 1.4) * 0.6 + Math.sin(x * 0.021 - z * 0.015) * 0.4;

  return buildRealScene(L, {
    name: 'Red Mesa',
    seed: 1866,
    margin: 950,
    pitTheme,
    style: {
      kerb: [rgb(0xf2ece0), rgb(0xb8502a)],
      runoff: 'brand', runoffFloor: [0.11, 0.07, 0.05], stripes: [rgb(0xe8c8a0), rgb(0xf2ece0)],
      barrier: 'jersey', fence: true, lamps: 'none', verge: 'none',
      grass: [0.6, 0.5, 0.32], gravel: rgb(0xd88a5a),
      sponsors: SPONSORS,
      zoneBrands: ['COYOTE COLA', 'ROUTE 9 DINER', 'SIDEWINDER TYRES', 'DUST DEVIL ENERGY', 'CANYON AIR', 'TUMBLEWEED TV'],
      primeBrands: ['MESA MOTOR OIL', 'SAGEBRUSH BANK'],
      title: ['RED MESA', 'CANYON GRAND PRIX', '#b8502a', '#ffffff', '#2aa8a0'],
      bridges: [['COYOTE COLA', 'HOWL AT THE MOON', '#c8242b', '#ffffff', '#2aa8a0'], ['DUST DEVIL ENERGY', 'SPIN IT UP', '#e86a2a', '#1b1b1f', '#ffffff']],
      roadName: 'RED MESA',
      bannerGlow: 0.15,
      boardBorder: '#b8502a',
    },
    fascia: ['RED MESA', 'CANYON GRAND PRIX'],
    fasciaColours: ['#b8502a', '#ffffff', '#2aa8a0'],
    skirtColour: [0.62, 0.38, 0.24],
    roadTheme: { asphalt: 0xc4b8b0, edge: [0.94, 0.92, 0.88], centre: [0.95, 0.78, 0.2], shoulder: [0.7, 0.5, 0.36] },
    relief(x, z, d) { return mesaH(x, z) * smooth(140, 260, d) + dunes(x, z) * 6 * smooth(40, 220, d); },
    // Striped sandstone on the cliffs (by height), red sand on the flats, pale wash in the hollows.
    colourAt(x, z, h, slope, d) {
      const sand = [0.78, 0.48, 0.3], pale = [0.86, 0.68, 0.5], scrub = [0.6, 0.5, 0.32];
      let c = d < 50 ? scrub : (dunes(x * 3, z * 3) > 0.3 ? pale : sand);
      if (slope > 0.35) {
        const band = Math.floor((h + wob(x, z) * 1.5) / 4.5) % 4;
        const strata = [[0.72, 0.32, 0.18], [0.84, 0.5, 0.3], [0.62, 0.26, 0.15], [0.9, 0.74, 0.56]][band];
        c = c.map((v, k) => v + (strata[k] - v) * Math.min(1, (slope - 0.35) * 3));
      }
      return c;
    },
    stands: [
      { at: 0, side: 'L', W: 180, tiers: 18, build: shadeGrandstand, depth: 18, offset: 20 },
      { at: 4, side: 'outside', W: 90, tiers: 14, build: bleacher }, // Mesa Climb
      { at: 9, side: 'outside', W: 60, tiers: 12, build: bleacher }, // the hairpin
      { at: 13, side: 'inside', W: 80, tiers: 14, build: bleacher }, // Rimrock
      { at: 18, side: 'outside', W: 70, tiers: 14, build: bleacher }, // the Wash
      { at: 23, side: 'outside', W: 60, tiers: 12, build: bleacher }, // the Gulch
      { at: 31, side: 'outside', W: 80, tiers: 14, build: bleacher }, // Butte hairpin
    ],
    roads(ctx) {
      net = venueRoads(ctx, VENUE);
      // The railroad runs beyond the perimeter road, on its own bed, stopping short of anything in its way.
      const pts = ctx.bs.alongside(net.ring, { side: 'out', offset: 46, every: 20 }).map((f) => [f.x, f.z]);
      net.rail = pts.length > 10 ? ctx.bs.path(pts, { w: 4.6, kind: 'rail', lines: false, margin: 6 }) : null;
    },
    landmarks({ L, R, frameAt, kit, terrain, placed, bs }) {
      venueBackOfHouse({ L, R, kit, bs, placed, frameAt }, net, VENUE);
      // The town on the first road out: diner, gas station, motel, water tower, windmill.
      const town = net.exits[0] || net.ring;
      let k = 0;
      for (const [fn, W, D, side] of [[gasStation, 32, 24, 1], [diner, 30, 12, -1], [motel, 58, 12, 1], [diner, 30, 12, 1]]) {
        const F = bs.roadside(town, { side, W, D, every: 14, from: 60 + k * 70, margin: 3, apron: [0.62, 0.55, 0.46] })[0];
        if (F) { fn(F, R); k++; }
      }
      const wt = bs.roadside(town, { side: -1, W: 12, D: 12, every: 20, from: 200, margin: 3, apron: null })[0];
      if (wt) waterTower(sub(wt, 0, -6));
      for (const F of bs.roadside(net.ring, { side: 'out', W: 8, D: 8, every: 400, count: 3, margin: 2, apron: null })) windmill(sub(F, 0, -4), R);
      placed.town = k;
      // A freight train standing on the railroad, each car on the rails where it stands; pylons alongside.
      if (net.rail && net.rail.length > 200) {
        const rp = net.rail.pts, step = net.rail.length / (rp.length - 1);
        const carAt = (s, kind) => {
          const k = Math.min(rp.length - 2, Math.floor(s / step)), p = rp[k], q = rp[k + 1];
          const F = frameAt(p[0], p[2], Math.atan2(-(q[2] - p[2]), q[0] - p[0]), p[1] + 0.2);
          railcar(F, R, kind);
        };
        let s = 30;
        for (let c = 0; c < 2; c++, s += 21) carAt(s + 10, 'loco');
        for (let c = 0; c < 30 && s < net.rail.length - 40; c++, s += 9) carAt(s + 4.5, R() < 0.55 ? 'box' : 'hopper');
        let prev = null, pylons = 0;
        for (let d = 10; d < net.rail.length - 10; d += 110) {
          const k = Math.floor(d / step), p = rp[k], q = rp[Math.min(rp.length - 1, k + 1)];
          const tx = q[0] - p[0], tz = q[2] - p[2], tl = Math.hypot(tx, tz) || 1;
          const x = p[0] - (tz / tl) * 11, z = p[2] + (tx / tl) * 11;
          if (!kit.isFree(x, z, 8)) { prev = null; continue; }
          const y = terrain.heightAt(x, z), yaw = Math.atan2(-tz, tx);
          const F = frameAt(x, z, yaw, y);
          F.block('metal', [[-2, -2], [2, -2], [2, 2], [-2, 2]], [[-0.4, -0.4], [0.4, -0.4], [0.4, 0.4], [-0.4, 0.4]], 0, 22, rgb(0x8a929e));
          F.box('metal', -0.2, 0.2, 20, 20.5, -5.5, 5.5, rgb(0x8a929e));
          const tops = [-5, 0, 5].map((b) => F.at(0, 20, b));
          if (prev) {
            const W = frameAt(0, 0, 0, 0);
            for (let w = 0; w < 3; w++) for (let k2 = 0; k2 < 6; k2++) {
              const t0 = k2 / 6, t1 = (k2 + 1) / 6, sag = (t) => Math.sin(t * Math.PI) * 2.4;
              const A = prev[w], B = tops[w];
              W.mb.color = rgb(0x3a3a3e);
              const p0 = [A[0] + (B[0] - A[0]) * t0, A[1] + (B[1] - A[1]) * t0 - sag(t0), A[2] + (B[2] - A[2]) * t0];
              const p1 = [A[0] + (B[0] - A[0]) * t1, A[1] + (B[1] - A[1]) * t1 - sag(t1), A[2] + (B[2] - A[2]) * t1];
              W.mb.hexa('metal', [[p0[0] - 0.03, p0[1] - 0.03, p0[2]], [p0[0] + 0.03, p0[1] - 0.03, p0[2]], [p0[0] + 0.03, p0[1] + 0.03, p0[2]], [p0[0] - 0.03, p0[1] + 0.03, p0[2]]],
                [[p1[0] - 0.03, p1[1] - 0.03, p1[2]], [p1[0] + 0.03, p1[1] - 0.03, p1[2]], [p1[0] + 0.03, p1[1] + 0.03, p1[2]], [p1[0] - 0.03, p1[1] + 0.03, p1[2]]]);
            }
          }
          prev = tops;
          pylons++;
        }
        placed.railroad = { length: Math.round(net.rail.length), pylons };
      }
      // The stone arch and hoodoos beside the Gulch (inside the circuit's bowl, clear of everything).
      const gi = L.pointSample[22], go = L.k[gi] > 0 ? -1 : 1;
      for (const off of [120, 150, 180]) {
        const x = L.x[gi] + L.nx[gi] * go * off, z = L.z[gi] + L.nz[gi] * go * off;
        if (kit.isFree(x, z, 40) && !bs.near(x, z, 30) && !kit.overlaps({ cx: x, cz: z, ux: 1, uz: 0, hw: 26, hd: 10 })) {
          stoneArch(frameAt(x, z, Math.atan2(L.tx[gi], L.tz[gi])), R);
          kit.footprints.push({ cx: x, cz: z, ux: 1, uz: 0, hw: 26, hd: 10 });
          placed.arch = 1;
          break;
        }
      }
      let hoodoos = 0;
      for (let n = 0; n < 300 && hoodoos < 26; n++) {
        const s = R() * L.length, i = Math.floor(s / L.ds) % L.N, sd = R() < 0.5 ? 1 : -1, off = 60 + R() * 120;
        const x = L.x[i] + L.nx[i] * sd * off, z = L.z[i] + L.nz[i] * sd * off;
        if (!kit.isFree(x, z, 30) || bs.near(x, z, 12) || kit.overlaps({ cx: x, cz: z, ux: 1, uz: 0, hw: 4, hd: 4 })) continue;
        kit.footprints.push({ cx: x, cz: z, ux: 1, uz: 0, hw: 4, hd: 4 });
        hoodoo(frameAt(x, z, R() * 6), R);
        hoodoos++;
      }
      placed.hoodoos = hoodoos;
      // Pickups and RVs camped on the flats by the bleachers.
      let rv = 0;
      for (const F of bs.roadside(net.ring, { side: 'in', W: 60, D: 14, every: 70, count: 4, margin: 3, apron: [0.6, 0.45, 0.32] })) {
        for (let a = -26; a <= 26; a += 6.5) (R() < 0.5 ? VEHICLES.pickup : VEHICLES.van)(sub(F, a, -7, Math.PI / 2 * (R() < 0.5 ? 1 : -1)), rgb(pick(R, [0xf2f2ee, 0xc8242b, 0x1b1b1f, 0x8a929e, 0x2aa8a0, 0xd8c8a0])), 'stucco');
        rv++;
      }
      placed.camp = rv;
      // Fans on the sandy banks outside the big corners.
      let ga = 0;
      for (const [at, W, D] of [[5, 70, 26], [13, 80, 28], [18, 60, 24], [24, 60, 24], [32, 60, 24]]) {
        const s = L.pointS(at), i = Math.floor(s / L.ds) % L.N;
        const fr = kit.frontage(s, L.k[i] > 0 ? 'R' : 'L', 8);
        const rx = fr.dirZ, rz = -fr.dirX, yaw = Math.atan2(-fr.dirX, -fr.dirZ), fans = [];
        for (let k = 0; k < W * D * 0.07; k++) {
          const a = (R() - 0.5) * W, b = R() * D;
          const x = fr.x + rx * a + fr.dirX * b, z = fr.z + rz * a + fr.dirZ * b;
          if (!kit.isFree(x, z, 0.5) || bs.near(x, z, 1) || kit.overlaps({ cx: x, cz: z, ux: 1, uz: 0, hw: 0.4, hd: 0.4 })) continue;
          fans.push({ p: [x, terrain.heightAt(x, z) - 0.02, z], yaw: yaw + (R() - 0.5) * 0.7, seated: R() < 0.5, cheer: R() < 0.25 ? 0.6 : 0 });
        }
        kit.addCrowd(fans, 8000 + at);
        ga += fans.length;
      }
      placed.ga = ga;
    },
    trees: {
      variants: [saguaro, joshua, sage, boulders, ocotillo],
      attempts: 24000,
      scale: [1, 1, 1, 1, 1],
      test(x, z, d, h, R) {
        if (d < 24) return -1;
        const m = mesaH(x, z);
        if (m > 30) return R() < 0.08 ? 2 : -1; // sparse scrub up on the mesa tops
        if (m > 1.5) return R() < 0.7 ? 3 : -1; // talus: boulder fields at the foot of the cliffs
        const v = R();
        return v < 0.1 ? 0 : v < 0.16 ? 1 : v < 0.6 ? 2 : v < 0.7 ? 3 : v < 0.76 ? 4 : -1;
      },
    },
    groundKind: 'sand',
  });
}
