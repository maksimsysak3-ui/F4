import { rgb, scaleC, pick } from '../street/kit.js';
import { buildRealScene } from './scene.js';
import { venueRoads, venueBackOfHouse } from './backOfHouse.js';
import { sub, bar, VEHICLES, lightMast } from '../backstageProps.js';
import { palm } from '../street/trees.js';
import { yacht } from '../street/props.js';

/*
 * Miami, handcrafted: the circuit wraps round Hard Rock Stadium, its open bowl
 * under the white canopy on four masts. The "marina" by the esses is a painted
 * lagoon with yachts moored on blocks; a beach club with cabanas and a pool
 * looks over Turn 1; the campus around is acres of car park, palm-lined
 * boulevards and the Florida Turnpike on its embankment. Grandstands in teal,
 * pink and white, Art Deco pastel everywhere, the downtown skyline far south.
 */

const PINK = rgb(0xff4fa0), TEAL = rgb(0x2ad4e0), WHITE = rgb(0xf4f4f0), STEEL = rgb(0x8a929e), ORANGE = rgb(0xff8a3a);
const SHIRTS = [PINK, TEAL, WHITE, ORANGE, rgb(0x1b1b1f), rgb(0xf2c200), rgb(0x2a4a8a), WHITE];
const DECO = [0xf8d8d0, 0xd0f0ec, 0xfff0c8, 0xf0d8f0, 0xffffff, 0xd8e8f8].map(rgb);

const SPONSORS = [
  ['FLAMINGO AIR', '#ff4fa0', '#ffffff', '#2ad4e0', 'wave'],
  ['BISCAYNE BANK', '#0e3a6a', '#ffffff', '#2ad4e0', 'serif'],
  ['OCEAN DRIVE COLA', '#2ad4e0', '#ffffff', '#ff4fa0', 'wave'],
  ['GATOR FUEL', '#2a8a3a', '#ffffff', '#f2c200', 'tread'],
  ['SUNSHINE TELECOM', '#ff8a3a', '#ffffff', '#1b1b1f', 'bolt'],
  ['KEY LIME', '#a8d84a', '#1b1b1f', '#1b1b1f', 'stripes'],
  ['DECO WATCHES', '#5a3a8a', '#ffffff', '#f2c200', 'serif'],
  ['MANGO TYRES', '#141416', '#ffb84a', '#ffb84a', 'tread'],
];

/**
 * Hard Rock Stadium: a raked aqua and orange bowl (lower and upper tiers with the club level
 * between), a layered white facade with open concourses, spiral ramp towers at the corners, and
 * the floating white canopy on four tall masts, with video boards over each end.
 */
function stadium(F, r, sc = 1) {
  const RX = 120 * sc, RZ = 92 * sc, n = 48;
  const AQUA = rgb(0x0aa8b4), DEEP = rgb(0x087a86), GREY = rgb(0xdedcd6), DARK = rgb(0x3a4048);
  const p = (k, rr) => { const t = (k / n) * Math.PI * 2; return [Math.cos(t) * RX * rr, Math.sin(t) * RZ * rr]; };
  // A ring of segments from r0 to r1 at y0, narrowing to t0..t1 at y1 (a raked tier when t0 ~ t1 ~ r1).
  const ring = (key, r0, r1, y0, y1, colAt, t0 = r0, t1 = r1, gap = 0) => {
    for (let k = 0; k < n; k++) {
      const k1 = k + 1 - gap;
      F.block(key, [p(k, r0), p(k1, r0), p(k1, r1), p(k, r1)], [p(k, t0), p(k1, t0), p(k1, t1), p(k, t1)], y0, y1, colAt(k));
    }
  };
  const seats = (k) => ((k % 12) === 3 || (k % 12) === 9 ? ORANGE : k % 2 ? AQUA : scaleC(AQUA, 0.9));
  ring('concrete', 1.0, 1.14, 0, 0.25, () => rgb(0xcfcac0)); // the plaza
  // Pitch and end zones.
  const fx = RX * 0.31, fz = RZ * 0.25;
  F.block('concrete', [[-fx - 14, -fz - 6], [fx + 14, -fz - 6], [fx + 14, fz + 6], [-fx - 14, fz + 6]], [[-fx - 14, -fz - 6], [fx + 14, -fz - 6], [fx + 14, fz + 6], [-fx - 14, fz + 6]], 0, 0.3, rgb(0x3a8a3a));
  for (const s of [-1, 1]) F.box('trim', s * fx, s * (fx + 10), 0.3, 0.33, -fz, fz, s > 0 ? AQUA : ORANGE);
  for (let a = -fx; a <= fx + 0.01; a += fx / 5) F.box('trim', a - 0.2, a + 0.2, 0.3, 0.34, -fz, fz, WHITE);
  // The bowl: lower tier, the club level's glass band, the upper tier, a white rim.
  ring('trim', 0.4, 0.64, 0.3, 13, seats, 0.635, 0.64);
  ring('glass', 0.64, 0.69, 12.5, 17, () => DARK);
  ring('trim', 0.66, 0.91, 16, 32, seats, 0.905, 0.91);
  ring('stucco', 0.905, 0.94, 31, 33, () => WHITE);
  // Facade: a dark recessed wall behind three white concourse slabs and slim columns.
  ring('concrete', 0.93, 0.945, 0, 31, () => DARK);
  for (const y of [0, 8.5, 16.5, 24.5]) ring('stucco', 0.94, 0.975, y, y + (y ? 1.4 : 7), () => (y ? WHITE : GREY));
  for (let k = 0; k < n; k += 2) { const [x, z] = p(k, 0.968); F.box('stucco', x - 0.5, x + 0.5, 0, 31, z - 0.5, z + 0.5, WHITE); }
  // Spiral ramp towers at the four corners.
  for (const k of [n / 8, (3 * n) / 8, (5 * n) / 8, (7 * n) / 8]) {
    const [x, z] = p(k, 1.03);
    F.cylinder('stucco', x, z, 8, 0, 27, 14, WHITE);
    for (let y = 3; y < 27; y += 4.5) F.cylinder('trim', x, z, 8.15, y, y + 0.9, 14, DARK);
  }
  // The canopy: white panels floating over the seats, on four masts with stays.
  ring('roof', 0.56, 0.99, 44, 45.2, () => WHITE, 0.56, 0.99, 0.08);
  ring('trim', 0.55, 0.57, 43.4, 45.4, () => GREY);
  for (const k of [n / 8, (3 * n) / 8, (5 * n) / 8, (7 * n) / 8]) {
    const [x, z] = p(k, 1.1);
    F.cylinder('metal', x, z, 1.5, 0, 74, 10, WHITE);
    for (const dk of [-3, 0, 3]) {
      const [cx, cz] = p(k + dk, 0.78);
      bar(F, 'metal', x, 74, z, cx, 45.2, cz, 0.35, STEEL);
    }
  }
  // Video boards hung under the canopy over each sideline, facing the pitch.
  for (const s of [-1, 1]) {
    const b = s * RZ * 0.62;
    F.box('trim', -RX * 0.16, RX * 0.16, 46, 57, b - 1.2, b + 1.2, DARK);
    F.face('winLit', -RX * 0.15, RX * 0.15, 46.8, 56.2, b - s * 1.22, [0.5, 1.1, 1.3], -s);
  }
}

/** The marina: a lagoon of painted water edged in white, yachts moored along the "pontoons". */
function marinaDeck(F, r, W, D) {
  F.box('concrete', -W / 2, W / 2, 0, 0.4, -D, 0, rgb(0xe8e4dc));
  F.box('winLit', -W / 2 + 3, W / 2 - 3, 0.4, 0.42, -D + 3, -3, [0.15, 0.55, 0.85]);
  for (let a = -W / 2 + 8; a < W / 2 - 6; a += 14) F.box('trim', a - 1, a + 1, 0.42, 0.7, -D + 3, -D / 2, rgb(0xb8946a)); // pontoons
  for (let a = -W / 2 + 15; a < W / 2 - 8; a += 14) yacht(sub(F, a, -D * 0.38, Math.PI / 2, 0.2), r, 14 + r() * 10);
  for (let a = -W / 2; a <= W / 2; a += 10) F.box('metal', a - 0.08, a + 0.08, 0.4, 5, -0.5, -0.3, WHITE);
}

/** Beach club: a pool, cabanas with striped awnings, loungers, a two-storey glass pavilion. */
function beachClub(F, r) {
  F.box('concrete', -40, 40, 0, 0.5, -36, 0, rgb(0xf0e8d8));
  F.box('winLit', -24, 10, 0.5, 0.52, -24, -8, [0.3, 0.9, 1.2]);
  for (let a = -36; a < 36; a += 6) {
    const col = a % 12 ? PINK : TEAL;
    for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [1.6, 1.6], [-1.6, 1.6]]) F.box('metal', a + x - 0.05, a + x + 0.05, 0.5, 3, -32 + z - 0.05, -32 + z + 0.05, WHITE);
    F.box('fabric', a - 1.8, a + 1.8, 3, 3.2, -33.8, -30.2, col);
  }
  for (let a = -22; a < 10; a += 2.4) F.box('trim', a - 0.4, a + 0.4, 0.5, 0.8, -6, -4.2, WHITE); // loungers
  F.box('stucco', 14, 38, 0.5, 9, -30, -6, WHITE);
  F.face('winLit', 15, 37, 1.5, 8, -5.98, [1.2, 1.1, 1.0]);
  F.box('trim', 13, 39, 9, 9.5, -31, -4, TEAL);
}

/** Open tribune: aluminium frame, seats in blocks of pink, teal and white, a canopy on the top rows. */
function tribune(F, r, W, tiers) {
  const seats = [], step = 0.8, rise = 0.58, cols = [PINK, TEAL, WHITE];
  for (let k = 0; k < tiers; k++) {
    const y = 1.0 + k * rise, b1 = -k * step, b0 = b1 - step;
    for (let a = -W / 2; a < W / 2 - 0.01; a += 10) {
      const col = cols[Math.floor((a + W / 2) / 10) % 3];
      F.box('trim', a, Math.min(W / 2, a + 10), y - 0.07, y, b0, b1, scaleC(col, k % 2 ? 0.9 : 1));
      F.box('trim', a, Math.min(W / 2, a + 10), y, y + 0.34, b0, b0 + 0.08, scaleC(col, 0.75));
    }
    for (let a = -W / 2 + 0.4; a < W / 2 - 0.3; a += 0.55) if (r() < 0.86) seats.push(F.at(a + (r() - 0.5) * 0.1, y, b1 - 0.42));
  }
  const depth = tiers * step, top = 1.0 + tiers * rise;
  for (let a = -W / 2; a <= W / 2 + 0.01; a += 4) {
    for (let k = 0; k < tiers; k += 3) F.box('metal', a - 0.05, a + 0.05, 0, 1 + k * rise, -k * step - 0.05, -k * step + 0.05, STEEL);
    F.box('metal', a - 0.06, a + 0.06, 0, top + 4, -depth - 0.06, -depth + 0.06, STEEL);
  }
  F.box('roof', -W / 2 - 0.5, W / 2 + 0.5, top + 4, top + 4.3, -depth - 0.5, -depth * 0.45, WHITE);
  F.box('trim', -W / 2, W / 2, 0, 1.1, 0, 0.12, TEAL);
  return { seats, fascia: { a0: -W / 2, a1: W / 2, y0: 0.15, y1: 1.0, b: 0.13 }, shirts: SHIRTS };
}

/** Pit and paddock building: two white floors, a teal glass band, a roof terrace with a pink canopy. */
const pitTheme = {
  wall: rgb(0xf2f2ee),
  upper(F, hw, i, rc, { H1, DEPTH }) {
    const top = H1 + 3.6;
    F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -1.0, WHITE);
    F.face(i % 3 === 0 ? 'winLit' : 'glass', -hw + 0.2, hw - 0.2, H1 + 0.4, top - 0.4, -0.98, [0.9, 1.25, 1.25]);
    F.box('trim', -hw, hw, H1 - 0.1, H1 + 0.2, -DEPTH, 1.0, TEAL);
    F.box('roof', -hw, hw, top + 2.6, top + 2.8, -DEPTH + 1, 1.4, i % 2 ? PINK : WHITE);
    for (const a of [-hw + 0.3, hw - 0.3]) F.box('metal', a - 0.06, a + 0.06, top, top + 2.6, 1.2, 1.3, STEEL);
    if (rc) F.box('stucco', -hw + 0.8, hw - 0.8, top, top + 4.5, -DEPTH + 1.4, -1.6, WHITE);
  },
};

/** Art Deco apartment block: pastel walls, rounded "eyebrow" ledges over the windows, a neon stripe. */
function decoBlock(F, r, W, D, floors) {
  const fh = 3.1, H = floors * fh, wall = pick(r, DECO);
  F.box('stucco', -W / 2, W / 2, -0.5, H, -D, 0, wall);
  for (let f = 0; f < floors; f++) {
    const y = f * fh + 0.8;
    F.face(r() < 0.25 ? 'winLit' : 'glass', -W / 2 + 1, W / 2 - 1, y, y + 1.6, 0.02, [1.2, 1.1, 1.0]);
    F.box('trim', -W / 2, W / 2, y + 1.7, y + 1.85, 0, 0.6, WHITE);
  }
  F.box('stucco', -2, 2, H, H + 4, -D / 2 - 1, -D / 2 + 1, wall);
  F.box('neon', -W / 2, W / 2, H - 0.6, H - 0.4, 0.01, 0.05, r() < 0.5 ? [3.0, 0.8, 1.8] : [0.6, 2.6, 2.8]);
}

/** Florida house: one storey, pale stucco, a low hip roof in white or terracotta tile, a carport and palms. */
function floridaHouse(F, r) {
  const W = 12 + r() * 4, D = 11, H = 3.4;
  F.box('stucco', -W / 2, W / 2, -0.5, H, -D, -1.5, pick(r, DECO));
  F.hipRoof('roof', -W / 2, W / 2, -D, -1.5, H, 1.6, r() < 0.5 ? rgb(0xf0ece4) : rgb(0xc0704a), 0.6);
  F.face('glass', -W / 4 - 1, -W / 4 + 1, 1, 2.4, -1.48, null);
  F.face('trim', W / 4 - 1.2, W / 4 + 1.2, 0, 2.4, -1.48, rgb(0xe8e4dc));
  if (r() < 0.6) VEHICLES.car(sub(F, W / 4, 1, Math.PI / 2), pick(r, [rgb(0xf2f2ee), rgb(0x1b1b1f), rgb(0xc0c4c8), rgb(0x9a1418), rgb(0x2a4a8a)]), 'stucco');
}
/** Strip mall: a long single-storey parade of shops under a deep canopy, signs, a car park in front. */
function stripMall(F, r, W) {
  F.box('stucco', -W / 2, W / 2, -0.5, 6, -40, -24, rgb(0xf0e8dc));
  F.box('trim', -W / 2, W / 2, 5, 7.6, -24, -20, rgb(0xe8dcc8));
  for (let a = -W / 2 + 2; a < W / 2 - 6; a += 9) {
    F.face('winLit', a, a + 7, 0.3, 4.2, -23.98, [1.4, 1.3, 1.1]);
    F.face('neon', a + 1, a + 6, 5.6, 6.8, -19.98, pick(r, [[3, 0.8, 1.8], [0.6, 2.6, 2.8], [2.8, 2.4, 0.8], [2.6, 0.6, 0.5]]));
  }
  for (let b = -16; b > -4; b -= 6) for (let a = -W / 2 + 2; a < W / 2 - 2; a += 2.9) if (r() < 0.6) VEHICLES.car(sub(F, a, b, r() < 0.5 ? 0 : Math.PI), pick(r, [rgb(0xf2f2ee), rgb(0x1b1b1f), rgb(0xc0c4c8), rgb(0x9a1418), rgb(0x2a4a8a), PINK]), 'stucco');
}
/** Office / hotel block: glass and white bands, a crown sign. */
function officeBlock(F, r, W, D, floors) {
  const fh = 3.6, H = floors * fh;
  F.box('stucco', -W / 2, W / 2, -0.5, H, -D, 0, WHITE);
  for (let f = 0; f < floors; f++) F.face(r() < 0.3 ? 'winLit' : 'glass', -W / 2 + 0.4, W / 2 - 0.4, f * fh + 0.6, f * fh + 3.0, 0.02, [1.1, 1.2, 1.25]);
  F.box('neon', -W / 3, W / 3, H + 0.4, H + 2.6, -0.6, -0.4, r() < 0.5 ? [0.6, 2.6, 2.8] : [3, 0.8, 1.8]);
}
/** Turnpike sound wall and its lamp standards (a run along one side of the motorway). */
function soundWall(F, len) {
  F.box('concrete', -len / 2, len / 2, -0.5, 4.5, -0.25, 0.25, rgb(0xc8c4b8));
  for (let a = -len / 2; a <= len / 2; a += 6) F.box('concrete', a - 0.2, a + 0.2, -0.5, 4.7, -0.35, 0.35, rgb(0xb8b4a8));
  for (let a = -len / 2 + 15; a < len / 2; a += 40) { F.box('metal', a - 0.15, a + 0.15, 0, 13, 1, 1.3, STEEL); F.box('metal', a - 0.1, a + 0.1, 12.6, 12.9, 1.3, 5, STEEL); F.box('neon', a - 0.3, a + 0.3, 12.4, 12.6, 4.4, 5.2, [2, 1.9, 1.6]); }
}

const VENUE = {
  pitSide: 'L', paddock: [-260, 80], tunnel: 160, ring: 150, exits: [0.08, 0.3, 0.55, 0.8],
  palette: [0xf2f2ee, 0xf2f2ee, 0x1b1b1f, 0xc0c4c8, 0xff4fa0, 0x2ad4e0, 0x2a4a8a, 0xd8d0b8, 0x9a1418],
  mix: { car: 6, pickup: 2, van: 1, bus: 0.8, truck: 0.5 }, density: 14,
  bus: TEAL, gate: PINK, heli: ORANGE, hoarding: TEAL, crane: rgb(0xf2c200),
  liveries: [PINK, TEAL, WHITE, rgb(0x1b1b1f)], busTerminals: 2, sites: 2, hospitality: 8,
  concessions: [8, 24, 46, 68],
};
let net = {};

export function buildMiamiScene(L) {
  net = {};
  let tx0 = Infinity, tx1 = -Infinity, tz0 = Infinity, tz1 = -Infinity;
  for (let i = 0; i < L.N; i++) { tx0 = Math.min(tx0, L.x[i]); tx1 = Math.max(tx1, L.x[i]); tz0 = Math.min(tz0, L.z[i]); tz1 = Math.max(tz1, L.z[i]); }
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const noise = (x, z) => Math.sin(x * 0.013 + 0.2) * Math.cos(z * 0.011 + 0.9) * 0.6 + Math.sin(x * 0.037 - z * 0.029) * 0.4;
  // The stadium: the biggest open space inside the loop.
  const inside = (x, z) => { let c = false; for (let i = 0, j = L.N - 1; i < L.N; j = i, i += 3) { if ((L.z[i] > z) !== (L.z[j] > z) && x < ((L.x[j] - L.x[i]) * (z - L.z[i])) / (L.z[j] - L.z[i]) + L.x[i]) c = !c; } return c; };
  const dist = (x, z) => { let m = Infinity; for (let i = 0; i < L.N; i += 3) m = Math.min(m, Math.hypot(L.x[i] - x, L.z[i] - z) - Math.max(L.wall.L[i], L.wall.R[i])); return m; };
  let st = null;
  for (let x = tx0; x < tx1; x += 10) for (let z = tz0; z < tz1; z += 10) {
    if (!inside(x, z)) continue;
    const d = dist(x, z);
    if (!st || d > st.d) st = { x, z, d };
  }
  // The marina lagoon: on the outside of the esses (P12-P20).
  const mi = L.pointSample[16], mo = L.k[mi] > 0 ? -1 : 1;
  const lagoon = { x: L.x[mi] + L.nx[mi] * mo * 80, z: L.z[mi] + L.nz[mi] * mo * 80, r: 55, colour: 0x2aa8c8, margin: 14, depth: 3 };

  return buildRealScene(L, {
    name: 'Miami',
    trackside: { skyline: { count: 300, tall: 160, dir: 0.4, spread: 2.2 } },
    seed: 2022,
    margin: 750,
    pitTheme,
    style: {
      kerb: [rgb(0xf2f1ec), rgb(0xd8202a)],
      runoff: 'brand', runoffFloor: [0.09, 0.09, 0.1],
      barrier: 'slab', fence: true, lamps: 'none', verge: 'none', grass: [0.4, 0.58, 0.26],
      sponsors: SPONSORS,
      zoneBrands: ['FLAMINGO AIR', 'OCEAN DRIVE COLA', 'GATOR FUEL', 'SUNSHINE TELECOM', 'KEY LIME', 'DECO WATCHES'],
      primeBrands: ['BISCAYNE BANK', 'FLAMINGO AIR'],
      title: ['MIAMI', 'MIAMI GRAND PRIX', '#ff4fa0', '#ffffff', '#2ad4e0'],
      bridges: [['OCEAN DRIVE COLA', 'STAY COOL', '#2ad4e0', '#ffffff', '#ff4fa0'], ['FLAMINGO AIR', 'FLY PINK', '#ff4fa0', '#ffffff', '#2ad4e0']],
      roadName: 'MIAMI',
      bannerGlow: 0.2,
      boardBorder: '#2ad4e0',
    },
    fascia: ['MIAMI', 'MIAMI GRAND PRIX'],
    fasciaColours: ['#ff4fa0', '#ffffff', '#2ad4e0'],
    skirtColour: [0.42, 0.56, 0.3],
    roadTheme: { asphalt: 0xc0c0c0, edge: [0.95, 0.95, 0.92], centre: [0.95, 0.8, 0.15], shoulder: [0.6, 0.62, 0.5] },
    // Flat South Florida: a little roll at most, and the Turnpike embankment along the east.
    relief(x, z, d) { return noise(x, z) * 1.5 * smooth(40, 200, d) + 6 * Math.exp(-(((x - (tx1 + 260)) / 34) ** 2)) * smooth(100, 300, d); },
    colourAt(x, z, h, slope, d) {
      const lawn = [0.38, 0.58, 0.24], dry = [0.56, 0.6, 0.36], lot = [0.48, 0.48, 0.46];
      let c = d < 50 ? lawn : noise(x * 3, z * 3) > 0.25 ? dry : lawn;
      if (d > 45 && d < 460 && noise(x * 0.7 + 50, z * 0.7) > -0.45) c = lot; // the campus: tarmac lots with lawn islands
      return c;
    },
    water: [lagoon],
    stands: [
      { at: 0, side: 'R', W: 180, tiers: 18, build: tribune, offset: -60 }, // main grandstand, opposite the pits
      { at: 2, side: 'outside', W: 100, tiers: 16, build: tribune }, // T1
      { at: 6, side: 'outside', W: 70, tiers: 14, build: tribune }, // T3
      { at: 17, side: 'inside', W: 80, tiers: 14, build: tribune }, // the marina
      { at: 29, side: 'outside', W: 70, tiers: 14, build: tribune }, // T11 hairpin
      { at: 47, side: 'outside', W: 70, tiers: 14, build: tribune }, // T12
      { at: 58, side: 'outside', W: 60, tiers: 12, build: tribune }, // the chicane
      { at: 63, side: 'R', W: 90, tiers: 14, build: tribune }, // back straight
      { at: 66, side: 'outside', W: 90, tiers: 16, build: tribune }, // T17
      { at: 72, side: 'outside', W: 70, tiers: 14, build: tribune }, // T18
    ],
    roads(ctx) {
      net = venueRoads(ctx, VENUE);
      const { bs } = ctx;
      // The Florida Turnpike: ten lanes on an embankment along the east side, then the city street grid.
      const hx = tx1 + 260, z0 = tz0 - 900, z1 = tz1 + 900;
      net.turnpike = bs.path([[hx, z0], [hx + 10, (z0 + z1) / 2], [hx - 20, z1]], { w: 30, kind: 'exit', margin: 6, smooth: false });
      bs.traffic(net.turnpike, { density: 40, mix: { car: 6, pickup: 2, truck: 2.5, van: 1, bus: 0.6 }, palette: VENUE.palette, speed: [24, 32] });
      net.grid = [];
      for (let k = -6; k <= 6; k++) {
        const x = (tx0 + tx1) / 2 + k * 150, z = (tz0 + tz1) / 2 + k * 130;
        // Each street runs only outside the campus (230 m+ from the circuit), in as many pieces as that takes.
        for (const line of [[[x, tz0 - 700], [x, tz1 + 700]], [[tx0 - 800, z], [hx - 40, z]]]) {
          const [[ax, az], [bx, bz]] = line, n = Math.ceil(Math.hypot(bx - ax, bz - az) / 20);
          let run = [];
          for (let i = 0; i <= n; i++) {
            const px = ax + ((bx - ax) * i) / n, pz = az + ((bz - az) * i) / n;
            if (ctx.terrain.distSmooth(px, pz) > 150) run.push([px, pz]);
            else { if (run.length > 4) net.grid.push(bs.path(run, { w: 9, kind: 'road', margin: 4, smooth: false })); run = []; }
          }
          if (run.length > 4) net.grid.push(bs.path(run, { w: 9, kind: 'road', margin: 4, smooth: false }));
        }
      }
      for (const g of bs.roads.filter((rd) => rd.kind === 'road')) bs.traffic(g, { density: 9, mix: { car: 6, pickup: 2, van: 1, bus: 0.4 }, palette: VENUE.palette, speed: [10, 13] });
    },
    landmarks({ L, R, frameAt, kit, terrain, placed, bs }) {
      if (st && st.d > 70) {
        const s = Math.min(1, (st.d - 10) / 125);
        stadium(frameAt(st.x, st.z, 0.25, terrain.heightAt(st.x, st.z) - 0.2), R, s);
        kit.footprints.push({ cx: st.x, cz: st.z, ux: 1, uz: 0, hw: 120 * s, hd: 120 * s });
        placed.stadium = [Math.round(s * 100), Math.round(st.x), Math.round(st.z)];
      }
      venueBackOfHouse({ L, R, kit, bs, placed, frameAt }, net, VENUE);
      // The marina deck on the lagoon's track side, the beach club over Turn 1.
      const md = (() => { const fr = kit.frontage(L.pointS(16), L.k[mi] > 0 ? 'R' : 'L', 2); return kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 80, 18, 1, null); })();
      if (md) { marinaDeck(md, R, 80, 18); placed.marina = 1; }
      const bi = Math.floor(L.pointS(2) / L.ds), bout = L.k[bi] > 0 ? 'R' : 'L';
      const bfr = kit.frontage(L.pointS(2) + 30, bout, 30);
      const B = kit.lot(bfr.x, bfr.z, bfr.dirX, bfr.dirZ, 80, 36, 2, null);
      if (B) { beachClub(B, R); placed.beachClub = 1; }
      // Car parks: the campus lots, packed, with palms on islands and floodlights.
      let lots = 0;
      const CARS = [0xf2f2ee, 0xf2f2ee, 0xf2f2ee, 0xc0c4c8, 0xc0c4c8, 0x1b1b1f, 0x1b1b1f, 0x5a5e64, 0x8a1418, 0x2a3a6a, 0xd8d0b8].map(rgb);
      for (const F of bs.roadside(net.ring, { side: 'out', W: 110, D: 60, every: 80, count: 14, margin: 4, apron: [0.42, 0.42, 0.42] })) {
        for (let b = -5; b > -57; b -= 11) for (let a = -52; a < 52; a += 2.9) for (const o of [0, -5.2]) if (R() < 0.82) VEHICLES.car(sub(F, a, b + o, o ? Math.PI : 0), pick(R, CARS), 'stucco');
        for (const a of [-40, 0, 40]) { palm(sub(F, a, -31), R, 8 + R() * 3); lightMast(sub(F, a + 18, -31)); }
        lots++;
      }
      // Fill the rest of the campus (track to city, and the infield) with parking: rows of cars on tarmac.
      for (let n = 0; n < 4000; n++) {
        const x = tx0 - 300 + R() * (tx1 - tx0 + 600), z = tz0 - 300 + R() * (tz1 - tz0 + 600);
        const d = terrain.distSmooth(x, z);
        if (d < 35 || d > 280 || bs.near(x, z, 10)) continue;
        const yaw = R() < 0.5 ? 0 : Math.PI / 2, ux = Math.cos(yaw), uz = -Math.sin(yaw);
        let ok = true;
        for (let a = -30; a <= 30 && ok; a += 10) for (const b of [-6, 6]) { const px = x + ux * a - uz * b, pz = z + uz * a + ux * b; if (!kit.isFree(px, pz, 6) || bs.near(px, pz, 4)) { ok = false; break; } }
        if (!ok || kit.overlaps({ cx: x, cz: z, ux, uz, hw: 32, hd: 8 })) continue;
        kit.footprints.push({ cx: x, cz: z, ux, uz, hw: 32, hd: 8 });
        const F = frameAt(x, z, yaw, terrain.heightAt(x, z) - 0.05);
        F.box('concrete', -31, 31, 0, 0.12, -7, 7, rgb(0x5a5a5c));
        for (let a = -29.5; a < 30; a += 2.9) for (const b of [-3.2, 3.2]) if (R() < 0.85) VEHICLES.car(sub(F, a, b, b > 0 ? Math.PI : 0), pick(R, CARS), 'stucco');
        if (R() < 0.3) lightMast(sub(F, 0, 0.2));
        lots++;
      }
      placed.lots = lots;
      // Art Deco blocks along the boulevards out to the city, and the downtown skyline far south.
      let deco = 0;
      for (const e of net.exits) for (const side of [1, -1]) for (const F of bs.roadside(e, { side, W: 22, D: 16, every: 26, from: 150, count: 10, margin: 2, apron: [0.62, 0.6, 0.56] })) { decoBlock(F, R, 22, 16, 3 + Math.floor(R() * 6)); deco++; }
      placed.deco = deco;
      // Miami Gardens: every street in the grid lined with houses, malls, offices and hotels.
      let houses = 0, malls = 0, offices = 0;
      for (const rd of bs.roads.filter((r) => r.kind === 'road')) for (const side of [1, -1]) {
        for (const fr of bs.alongside(rd, { side, offset: 3, every: 17 })) {
          const d = terrain.distSmooth(fr.x, fr.z);
          if (d < 120) continue;
          const v = R();
          const [kind, W, D] = v < 0.08 ? ['mall', 60, 40] : v < 0.2 ? ['office', 26, 22] : ['house', 15, 13];
          const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, W, D, 1.5, null);
          if (!F) continue;
          bs.pad(fr.x + fr.dirX * 3, fr.z + fr.dirZ * 3, fr.dirX, fr.dirZ, W, D + 3, kind === 'house' ? [0.4, 0.56, 0.26] : [0.5, 0.5, 0.48]);
          if (kind === 'mall') { stripMall(F, R, W); malls++; }
          else if (kind === 'office') { officeBlock(F, R, W, D, 4 + Math.floor(R() * R() * 14)); offices++; }
          else { floridaHouse(F, R); houses++; }
        }
      }
      placed.city = { houses, malls, offices };
      // The Turnpike's sound walls on both sides.
      if (net.turnpike) for (const side of [1, -1]) for (const fr of bs.alongside(net.turnpike, { side, offset: 1.5, every: 120 })) {
        soundWall(frameAt(fr.x, fr.z, Math.atan2(fr.dirZ, -fr.dirX) + (side > 0 ? 0 : Math.PI), terrain.heightAt(fr.x, fr.z)), 120);
      }
      const sky = frameAt((tx0 + tx1) / 2, tz1 + 2600, Math.PI, -6);
      for (let k = 0; k < 40; k++) {
        const a = (R() - 0.5) * 1400, b = (R() - 0.5) * 300, w = 25 + R() * 35, h = 60 + R() * R() * 220;
        sky.box('stucco', a - w / 2, a + w / 2, 0, h, b - w / 2, b + w / 2, scaleC(pick(R, DECO), 0.8));
      }
      // Fans on the lawns by the esses and T17.
      let ga = 0;
      for (const [at, W, D] of [[10, 80, 26], [20, 70, 24], [33, 60, 22], [69, 70, 24]]) {
        const s = L.pointS(at), i = Math.floor(s / L.ds) % L.N;
        const fr = kit.frontage(s, L.k[i] > 0 ? 'R' : 'L', 6);
        const rx = fr.dirZ, rz = -fr.dirX, yaw = Math.atan2(-fr.dirX, -fr.dirZ), fans = [];
        for (let k = 0; k < W * D * 0.08; k++) {
          const a = (R() - 0.5) * W, b = R() * D, x = fr.x + rx * a + fr.dirX * b, z = fr.z + rz * a + fr.dirZ * b;
          if (!kit.isFree(x, z, 0.5) || bs.near(x, z, 1) || kit.overlaps({ cx: x, cz: z, ux: 1, uz: 0, hw: 0.4, hd: 0.4 })) continue;
          fans.push({ p: [x, terrain.heightAt(x, z) - 0.02, z], yaw: yaw + (R() - 0.5) * 0.7, seated: R() < 0.5, cheer: R() < 0.25 ? 0.6 : 0 });
        }
        kit.addCrowd(fans, 9500 + at);
        ga += fans.length;
      }
      placed.ga = ga;
    },
    trees: {
      variants: [palm],
      attempts: 9000,
      scale: [1],
      test(x, z, d, h, R) {
        if (d < 18) return -1;
        return d < 160 ? (R() < 0.5 ? 0 : -1) : (R() < 0.12 ? 0 : -1); // palms everywhere, thick by the track
      },
    },
  });
}
