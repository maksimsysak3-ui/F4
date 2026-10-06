import { rgb, scaleC, pick } from '../street/kit.js';
import { buildRealScene } from './scene.js';
import { venueRoads, venueBackOfHouse } from './backOfHouse.js';
import { sub, VEHICLES, lightMast } from '../backstageProps.js';
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

/** Hard Rock Stadium: an open bowl of seats inside a ring of concourses, the white canopy on four masts. */
function stadium(F, r, sc = 1) {
  const RX = 120 * sc, RZ = 92 * sc, n = 36;
  const ring = (t, s, y0, y1, col, key = 'concrete') => {
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
      const p = (a, rr) => [Math.cos(a) * RX * rr, Math.sin(a) * RZ * rr];
      const [x0, z0] = p(a0, t), [x1, z1] = p(a1, t), [x2, z2] = p(a1, s), [x3, z3] = p(a0, s);
      F.block(key, [[x0, z0], [x1, z1], [x2, z2], [x3, z3]], [[x0, z0], [x1, z1], [x2, z2], [x3, z3]], y0, y1, col);
    }
  };
  ring(1.0, 0.96, 0, 34, rgb(0xd8d8d4)); // outer wall
  for (let k = 0; k < 3; k++) ring(0.995 - k * 0.002, 0.99, 6 + k * 10, 7 + k * 10, TEAL, 'trim'); // concourse bands
  for (let t = 0; t < 14; t++) ring(0.95 - t * 0.032, 0.92 - t * 0.032, 0, 32 - t * 2.2, t % 2 ? rgb(0x2a7ab8) : rgb(0x1f5a9a), 'trim'); // the seating bowl
  const px = 50 * sc, pz = 28 * sc;
  F.block('concrete', [[-px, -pz], [px, -pz], [px, pz], [-px, pz]], [[-px, -pz], [px, -pz], [px, pz], [-px, pz]], 0, 0.3, rgb(0x3a8a3a)); // the pitch
  for (let a = -px * 0.9; a <= px * 0.9; a += px * 0.18) F.box('trim', a - 0.15, a + 0.15, 0.3, 0.32, -pz, pz, WHITE);
  // The canopy: a ring of white membrane held up by four corner masts.
  for (const [x, z] of [[-RX * 0.78, -RZ * 0.78], [RX * 0.78, -RZ * 0.78], [RX * 0.78, RZ * 0.78], [-RX * 0.78, RZ * 0.78]]) F.cylinder('metal', x, z, 1.4, 0, 58, 8, WHITE);
  ring(1.02, 0.7, 40, 41.5, WHITE, 'roof');
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
    relief(x, z, d) { return noise(x, z) * 1.5 * smooth(40, 200, d) + 6 * Math.exp(-(((x - (tx1 + 260)) / 30) ** 2)) * smooth(100, 300, d); },
    colourAt(x, z, h, slope, d) {
      const lawn = [0.38, 0.58, 0.24], dry = [0.56, 0.6, 0.36], lot = [0.48, 0.48, 0.46];
      let c = d < 50 ? lawn : noise(x * 3, z * 3) > 0.25 ? dry : lawn;
      if (d > 120 && d < 420 && noise(x * 0.7 + 50, z * 0.7) > 0) c = lot; // the campus car parks
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
    roads(ctx) { net = venueRoads(ctx, VENUE); },
    landmarks({ L, R, frameAt, kit, terrain, placed, bs }) {
      if (st && st.d > 70) {
        const s = Math.min(1, (st.d - 10) / 125);
        stadium(frameAt(st.x, st.z, 0.25, terrain.heightAt(st.x, st.z) - 0.2), R, s);
        kit.footprints.push({ cx: st.x, cz: st.z, ux: 1, uz: 0, hw: 120 * s, hd: 120 * s });
        placed.stadium = Math.round(s * 100);
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
      const CARS = [0xf2f2ee, 0xc0c4c8, 0x1b1b1f, 0x5a5e64, 0x9a1418, 0x2a4a8a, 0xff4fa0, 0x2ad4e0, 0xd8d0b8].map(rgb);
      for (const F of bs.roadside(net.ring, { side: 'out', W: 110, D: 60, every: 80, count: 14, margin: 4, apron: [0.42, 0.42, 0.42] })) {
        for (let b = -5; b > -57; b -= 11) for (let a = -52; a < 52; a += 2.9) for (const o of [0, -5.2]) if (R() < 0.82) VEHICLES.car(sub(F, a, b + o, o ? Math.PI : 0), pick(R, CARS), 'stucco');
        for (const a of [-40, 0, 40]) { palm(sub(F, a, -31), R, 8 + R() * 3); lightMast(sub(F, a + 18, -31)); }
        lots++;
      }
      placed.lots = lots;
      // Art Deco blocks along the boulevards out to the city, and the downtown skyline far south.
      let deco = 0;
      for (const e of net.exits) for (const side of [1, -1]) for (const F of bs.roadside(e, { side, W: 22, D: 16, every: 26, from: 150, count: 10, margin: 2, apron: [0.62, 0.6, 0.56] })) { decoBlock(F, R, 22, 16, 3 + Math.floor(R() * 6)); deco++; }
      placed.deco = deco;
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
