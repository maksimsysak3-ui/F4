import { rgb, scaleC, pick } from '../street/kit.js';
import { buildRealScene } from './scene.js';

/*
 * Zandvoort, handcrafted: the circuit sits in the dunes a few hundred metres
 * from the North Sea, with the village to the south. Temporary steel tribunes
 * on the dunes in a sea of orange, the covered main tribune opposite the pits,
 * a black-glass pit building, marquee hospitality, the beach with its
 * pavilions, seafront flats, brick houses, the water tower and the church.
 */

const ORANGE = rgb(0xff6a00), ORANGE_D = rgb(0xd85400), WHITE = rgb(0xf2f2ee), STEEL = rgb(0x9aa2ac), DARK = rgb(0x1e2126);
const NL_RED = rgb(0xae1c28), NL_BLUE = rgb(0x21468b);
const SHIRTS = [ORANGE, ORANGE, ORANGE, ORANGE_D, rgb(0xff8a1a), WHITE, NL_BLUE, rgb(0x1b1b1f)];

const SPONSORS = [
  ['ORANJE BIER', '#ff6a00', '#ffffff', '#1b1b1f', 'stripes'],
  ['TULIP TELECOM', '#c8102e', '#ffffff', '#ffd23f', 'wave'],
  ['POLDER OIL', '#21468b', '#ffffff', '#ff6a00', 'tread'],
  ['KAASBANK', '#ffd23f', '#1b1b1f', '#c8102e', 'serif'],
  ['NOORDZEE AIR', '#f2f6fa', '#21468b', '#21468b', 'wave'],
  ['WINDMOLEN ENERGIE', '#1f7a3a', '#ffffff', '#bfe3c0', 'hex'],
  ['STROOPWAFEL & CO', '#6b3a1e', '#f2c879', '#f2c879', 'grain'],
  ['DUIN TYRES', '#111214', '#ff6a00', '#ff6a00', 'tread'],
];

/** Temporary steel tribune on the dunes: scaffold frame, orange plank seats, Dutch flags on top. */
function duneTribune(F, r, W, tiers) {
  const seats = [];
  const step = 0.82, rise = 0.6;
  for (let k = 0; k < tiers; k++) {
    const y = 1.0 + k * rise, b1 = -k * step, b0 = b1 - step;
    // Seat deck: orange with a white block in the middle (the "oranje" wall) and blue ends.
    for (let a = -W / 2; a < W / 2 - 0.01; a += 6) {
      const a1 = Math.min(W / 2, a + 6);
      const col = Math.abs(a + 3) < 6 ? WHITE : (a < -W / 2 + 6 || a1 > W / 2 - 6) ? NL_BLUE : (k % 2 ? ORANGE : ORANGE_D);
      F.box('trim', a, a1, y - 0.06, y, b0, b1, col);
      F.box('trim', a, a1, y, y + 0.35, b0, b0 + 0.08, scaleC(col, 0.8));
    }
    for (let a = -W / 2 + 0.4; a < W / 2 - 0.3; a += 0.55) if (r() < 0.86) seats.push(F.at(a + (r() - 0.5) * 0.1, y, b1 - 0.42));
  }
  // Scaffold: posts on a 3 m grid, ledgers under each tier, cross-bracing.
  const depth = tiers * step;
  for (let a = -W / 2; a <= W / 2 + 0.01; a += 3) {
    for (let k = 0; k <= tiers; k += 2) {
      const b = -k * step, y = 1.0 + Math.min(k, tiers - 1) * rise;
      F.box('metal', a - 0.04, a + 0.04, 0, y, b - 0.04, b + 0.04, STEEL);
    }
    F.box('metal', a - 0.03, a + 0.03, 0.4, 0.46, -depth, 0, STEEL);
  }
  for (let a = -W / 2; a < W / 2 - 2.9; a += 6) {
    // X-brace on the back face.
    const yb = 1 + (tiers - 1) * rise;
    for (let t = 0; t < 8; t++) {
      const u = t / 8;
      F.box('metal', a + u * 3 - 0.03, a + u * 3 + 0.03, u * yb, u * yb + 0.2, -depth - 0.02, -depth + 0.02, STEEL);
      F.box('metal', a + 3 - u * 3 - 0.03, a + 3 - u * 3 + 0.03, u * yb, u * yb + 0.2, -depth - 0.02, -depth + 0.02, STEEL);
    }
  }
  // Front barrier, rear handrail, flags.
  F.box('trim', -W / 2, W / 2, 0, 1.15, 0, 0.12, WHITE);
  const top = 1 + tiers * rise;
  F.box('metal', -W / 2, W / 2, top + 0.9, top + 0.96, -depth, -depth + 0.06, STEEL);
  for (let a = -W / 2 + 4; a < W / 2; a += 9) {
    F.box('metal', a - 0.04, a + 0.04, top, top + 5, -depth - 0.1, -depth - 0.02, STEEL);
    const stripes = r() < 0.7 ? [NL_RED, WHITE, NL_BLUE] : [ORANGE, ORANGE, ORANGE];
    stripes.forEach((c, k) => F.box('fabric', a, a + 2.2, top + 4.6 - (k + 1) * 0.4, top + 4.6 - k * 0.4, -depth - 0.08, -depth - 0.06, c));
  }
  return { seats, fascia: { a0: -W / 2, a1: W / 2, y0: 0.15, y1: 1.05, b: 0.13 }, shirts: SHIRTS };
}

/** The main tribune on the straight: concrete base, orange seats, a curved white roof on raking steel arms. */
function mainTribune(F, r, W, tiers) {
  const seats = [];
  const step = 0.85, rise = 0.55;
  F.box('concrete', -W / 2, W / 2, 0, 1.8, -1.2, 0.2, rgb(0x3a3d42));
  for (let a = -W / 2 + 2; a < W / 2 - 2; a += 5) F.face('winLit', a, a + 3.6, 0.3, 1.5, 0.21, [1.2, 1.1, 0.9]);
  for (let k = 0; k < tiers; k++) {
    const y = 1.8 + k * rise, b1 = -1.2 - k * step, b0 = b1 - step;
    F.box('concrete', -W / 2, W / 2, y - 0.5, y, b0, b1, rgb(0x8c8e92));
    F.box('trim', -W / 2, W / 2, y, y + 0.07, b0 + 0.05, b1, k % 2 ? ORANGE : ORANGE_D);
    F.box('trim', -W / 2, W / 2, y + 0.07, y + 0.42, b0 + 0.06, b0 + 0.14, scaleC(ORANGE_D, 0.8));
    for (let a = -W / 2 + 0.4; a < W / 2 - 0.3; a += 0.55) if (r() < 0.88) seats.push(F.at(a + (r() - 0.5) * 0.1, y + 0.07, b1 - 0.45));
  }
  const depth = 1.2 + tiers * step, top = 1.8 + tiers * rise;
  F.box('concrete', -W / 2, W / 2, 0, top + 1, -depth - 0.4, -depth, rgb(0x6a6d72));
  for (const a of [-W / 2, W / 2 - 0.4]) for (let k = 0; k < tiers; k += 3) F.box('metal', a, a + 0.4, 1.8 + k * rise, 2.8 + k * rise, -1.2 - (k + 1) * step, -1.2 - k * step, STEEL);
  // Roof: arms rising from the back, a curved white skin in six segments.
  const roofArc = (u) => [-depth + u * (depth + 2), top + 3 + Math.sin(u * Math.PI * 0.8) * 2.2 - u * 0.6];
  for (let a = -W / 2; a <= W / 2 + 0.01; a += 10) {
    F.box('metal', a - 0.25, a + 0.25, 0, top + 3, -depth - 0.4, -depth, STEEL);
    for (let k = 0; k < 6; k++) {
      const [b0, y0] = roofArc(k / 6), [b1, y1] = roofArc((k + 1) / 6);
      F.box('metal', a - 0.12, a + 0.12, Math.min(y0, y1) - 0.3, Math.max(y0, y1), Math.min(b0, b1), Math.max(b0, b1), STEEL);
    }
  }
  for (let k = 0; k < 6; k++) {
    const [b0, y0] = roofArc(k / 6), [b1, y1] = roofArc((k + 1) / 6);
    F.mb.color = WHITE;
    const p = [F.at(-W / 2 - 1, y0, b0), F.at(W / 2 + 1, y0, b0), F.at(W / 2 + 1, y1, b1), F.at(-W / 2 - 1, y1, b1)];
    F.mb.triFacing('roof', p[0], p[1], p[2], [0, 1, 0]);
    F.mb.triFacing('roof', p[0], p[2], p[3], [0, 1, 0]);
  }
  const [bE, yE] = roofArc(1);
  F.box('neon', -W / 2 - 1, W / 2 + 1, yE - 0.15, yE, bE - 0.1, bE + 0.05, [2.6, 1.2, 0.2]);
  return { seats, fascia: { a0: -W / 2 - 1, a1: W / 2 + 1, y0: yE - 1.4, y1: yE - 0.2, b: bE + 0.06 }, shirts: SHIRTS };
}

/** Pit building: white garages with a black-glass skybox floor and an orange LED line along the roof. */
const pitTheme = {
  wall: rgb(0xf4f4f2),
  upper(F, hw, i, rc, { H1, DEPTH }) {
    const top = H1 + 3.4;
    F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.5, -0.4, DARK);
    F.face(i % 3 ? 'glass' : 'winLit', -hw + 0.2, hw - 0.2, H1 + 0.4, top - 0.4, -0.38, [1.1, 1.0, 0.85]);
    F.box('trim', -hw - 0.02, hw + 0.02, top, top + 0.35, -DEPTH + 0.3, 0.6, DARK);
    F.box('neon', -hw, hw, top - 0.05, top + 0.05, 0.58, 0.64, [2.8, 1.2, 0.15]);
    if (rc) {
      // Race control: a glass box raised above the roofline with the circuit's crest.
      F.box('stucco', -hw + 1, hw - 1, top + 0.35, top + 4.2, -DEPTH + 2, -1.2, DARK);
      F.face('winLit', -hw + 1.3, hw - 1.3, top + 0.8, top + 3.8, -1.18, [1.2, 1.25, 1.35]);
      F.box('neon', -hw + 1, hw - 1, top + 4.2, top + 4.35, -1.25, -1.15, [2.8, 1.2, 0.15]);
    }
  },
};

/** Hospitality marquee: white peaked tent with glass gable and an orange pennant. */
function marquee(F, r, W = 18, D = 12) {
  const H = 3.2;
  F.box('fabric', -W / 2, W / 2, 0, H, -D, 0, WHITE);
  F.face('glass', -W / 2 + 1, W / 2 - 1, 0.3, H - 0.3, 0.02, null);
  for (let a = -W / 2; a < W / 2 - 0.1; a += 6) {
    const a1 = a + 6, am = a + 3;
    const peak = F.at(am, H + 2.6, -D / 2), c = [F.at(a, H, 0.3), F.at(a1, H, 0.3), F.at(a1, H, -D - 0.3), F.at(a, H, -D - 0.3)];
    F.mb.color = WHITE;
    for (let k = 0; k < 4; k++) { F.mb.triFacing('fabric', c[k], c[(k + 1) % 4], peak, [0, 1, 0]); F.mb.triFacing('fabric', c[k], peak, c[(k + 1) % 4], [0, -1, 0]); }
    F.box('metal', am - 0.03, am + 0.03, H + 2.6, H + 4.2, -D / 2 - 0.03, -D / 2 + 0.03, STEEL);
    F.box('fabric', am, am + 1.2, H + 3.6, H + 4.1, -D / 2, -D / 2 + 0.02, ORANGE);
  }
}

/** Team motorhome: a long silver trailer with an awning in team colour. */
function motorhome(F, col) {
  F.box('stucco', -7, 7, 0.4, 3.6, -2.6, 0, rgb(0xc8ccd2));
  F.face('winLit', -6.4, 6.4, 1.6, 3.0, 0.02, [1.2, 1.15, 1.0]);
  F.box('stucco', -7, 7, 3.6, 3.8, -2.6, 0, col);
  F.mb.color = col;
  F.mb.quad('fabric', F.at(-7, 3.4, 0), F.at(7, 3.4, 0), F.at(7, 2.9, 3), F.at(-7, 2.9, 3));
}

const BRICKS = [0x8a3b2a, 0x9c4a32, 0x6e2f24, 0xa8604a, 0x7a3a2c].map(rgb);
const TILES = [0x3a2a26, 0x2a2a2e, 0x8a3a2a, 0x5a3a2a].map(rgb);

/** Narrow Dutch brick house: steep gable, white window frames. */
function dutchHouse(F, r) {
  const W = 6 + r() * 2, D = 9, brick = pick(r, BRICKS), H = 5.5 + r() * 2.5;
  F.box('stucco', -W / 2, W / 2, 0, H, -D, 0, brick);
  for (const y of [0.9, 3.4].filter((v) => v + 1.8 < H)) {
    for (const a of [-W / 4, W / 4]) {
      F.box('trim', a - 0.75, a + 0.75, y - 0.1, y + 1.9, -0.05, 0.06, WHITE);
      F.face(r() < 0.5 ? 'winLit' : 'glass', a - 0.6, a + 0.6, y, y + 1.8, 0.07, [1.2, 1.0, 0.7]);
    }
  }
  F.gableRoof('roof', -W / 2, W / 2, -D, 0, H, 3.4 + r(), pick(r, TILES), brick, 0.35);
}

/** Seafront flats on the boulevard: white slab, balcony bands, glass rails. */
function seafrontFlats(F, r) {
  const W = 30 + r() * 20, floors = 6 + Math.floor(r() * 8), D = 14, fh = 2.9, H = floors * fh;
  F.box('stucco', -W / 2, W / 2, 0, H, -D, 0, r() < 0.6 ? rgb(0xece8e0) : rgb(0xd8d2c4));
  for (let f = 1; f < floors; f++) {
    const y = f * fh;
    F.box('trim', -W / 2, W / 2, y - 0.1, y + 0.1, 0, 1.4, WHITE);
    F.box('metal', -W / 2, W / 2, y + 0.1, y + 1.0, 1.35, 1.42, rgb(0x9fb8cc));
    for (let a = -W / 2 + 1; a < W / 2 - 1; a += 3.2) F.face(r() < 0.35 ? 'winLit' : 'glass', a, a + 2.4, y + 0.3, y + 2.4, 0.02, [1.2, 1.05, 0.8]);
  }
  F.box('trim', -W / 2 - 0.3, W / 2 + 0.3, H, H + 0.5, -D - 0.3, 0.3, WHITE);
}

/** Beach pavilion (strandpaviljoen) on stilts with a deck and parasols. */
function beachPavilion(F, r) {
  const W = 16, D = 10;
  for (let a = -W / 2 + 0.5; a <= W / 2; a += 5) for (const b of [-D + 0.5, -0.5]) F.box('trim', a - 0.15, a + 0.15, 0, 1.2, b - 0.15, b + 0.15, rgb(0x8a6440));
  F.box('trim', -W / 2, W / 2, 1.2, 1.4, -D, 3, rgb(0xb08a5a));
  F.box('stucco', -W / 2 + 1, W / 2 - 1, 1.4, 4.4, -D + 1, -1.5, pick(r, [WHITE, rgb(0x2f5a8a), rgb(0xe8d8b0)]));
  F.face('winLit', -W / 2 + 1.5, W / 2 - 1.5, 1.8, 4.0, -1.48, [1.3, 1.1, 0.8]);
  F.gableRoof('roof', -W / 2 + 0.6, W / 2 - 0.6, -D + 0.6, -0.9, 4.4, 1.6, rgb(0x3a3a3e), WHITE, 0.5);
  for (let k = 0; k < 4; k++) {
    const a = -W / 2 + 2 + k * 4;
    F.box('metal', a - 0.04, a + 0.04, 1.4, 3.6, 1.8, 1.88, STEEL);
    F.cylinder('fabric', a, 1.84, 1.4, 3.5, 3.62, 8, pick(r, [ORANGE, WHITE, NL_BLUE]));
  }
}

/** The village water tower: brick shaft with a pale tank and a lantern. */
function waterTower(F) {
  F.cylinder('stucco', 0, 0, 4.5, 0, 26, 12, rgb(0x8a4a32));
  F.cylinder('stucco', 0, 0, 6, 26, 32, 12, rgb(0xe8e0cc));
  F.cylinder('roof', 0, 0, 6.4, 32, 33, 12, rgb(0x2f5a4a));
  F.cylinder('roof', 0, 0, 2.2, 33, 37, 8, rgb(0x2f5a4a));
  for (let k = 0; k < 12; k++) {
    const t = (k / 12) * Math.PI * 2;
    F.box('winLit', Math.cos(t) * 4.52 - 0.3, Math.cos(t) * 4.52 + 0.3, 6 + (k % 3) * 6, 7.4 + (k % 3) * 6, Math.sin(t) * 4.52 - 0.3, Math.sin(t) * 4.52 + 0.3, [1.2, 1.0, 0.7]);
  }
}

/** Village church: brick nave and a tall spire. */
function church(F) {
  F.box('stucco', -6, 6, 0, 9, -24, 0, rgb(0x7a3a2c));
  F.gableRoof('roof', -6, 6, -24, 0, 9, 6, rgb(0x2a2a2e), rgb(0x7a3a2c), 0.3);
  F.box('stucco', -3, 3, 0, 22, -3, 3, rgb(0x7a3a2c));
  F.hipRoof('roof', -3, 3, -3, 3, 22, 16, rgb(0x2f5a4a), 0.2);
}

/** Camping tent for the fan campsite. */
function tent(F, r) {
  const col = pick(r, [ORANGE, ORANGE, rgb(0x2f6b4a), rgb(0x1f4f9a), WHITE]);
  const w = 2.4 + r(), d = 2 + r();
  F.block('fabric', [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]], [[-0.05, -d / 2], [0.05, -d / 2], [0.05, d / 2], [-0.05, d / 2]], 0, 1.3, col);
}

/** Black pine, planted on the Dutch dunes: a leaning trunk and a dense, rounded, dark crown of clumps. */
function dunePine(F, r) {
  const lean = 0.4 + r() * 0.5, h = 6 + r() * 4;
  for (let k = 0; k < 4; k++) F.cylinder('trim', (k / 4) * lean, 0, 0.26 - k * 0.04, (k / 4) * h * 0.62, ((k + 1) / 4) * h * 0.62, 6, rgb(0x5a3e2a));
  const greens = [0x23361f, 0x2b4024, 0x30472a, 0x263a22];
  for (let k = 0; k < 7; k++) {
    const t = (k / 7) * Math.PI * 2 + r();
    const rr = 0.6 + r() * 1.2, cr = 1.4 + r() * 0.9;
    const y = h * (0.5 + r() * 0.35);
    F.cylinder('leaf', lean + Math.cos(t) * rr, Math.sin(t) * rr, cr, y, y + cr * 1.3, 7, scaleC(rgb(pick(r, greens)), 0.9 + r() * 0.2));
  }
  F.cylinder('leaf', lean, 0, 1.6, h * 0.85, h, 7, scaleC(rgb(greens[1]), 1.05));
}

/** Sea buckthorn / creeping willow thicket: a low, wide mound of grey-green. */
function thicket(F, r) {
  for (let k = 0; k < 5; k++) {
    const a = (r() - 0.5) * 4, b = (r() - 0.5) * 4, rr = 1.2 + r() * 1.2;
    F.cylinder('leaf', a, b, rr, 0, 0.9 + r() * 0.8, 7, rgb(pick(r, [0x5a6a42, 0x6a7a4a, 0x4e5e3a, 0x7a8452])));
  }
}

/** Marram grass and sea buckthorn on the dunes. */
function duneShrub(F, r) {
  for (let k = 0; k < 6; k++) {
    const a = (r() - 0.5) * 2, b = (r() - 0.5) * 2;
    F.cylinder('leaf', a, b, 0.4 + r() * 0.4, 0, 0.5 + r() * 0.6, 5, rgb(pick(r, [0x9aa864, 0x8a9858, 0xaab878, 0x7a8a50])));
  }
}

export function buildZandvoortScene(L) {
  let tx0 = Infinity, tx1 = -Infinity, tz0 = Infinity, tz1 = -Infinity;
  for (let i = 0; i < L.N; i++) { tx0 = Math.min(tx0, L.x[i]); tx1 = Math.max(tx1, L.x[i]); tz0 = Math.min(tz0, L.z[i]); tz1 = Math.max(tz1, L.z[i]); }
  // The North Sea lies west of the main straight; the village is to the south.
  const beachX = tx0 - 300, seaX = beachX - 90;
  // Coastal dunes: ridges ~120-200 m apart running roughly along the coast, with smaller hummocks on them.
  const noise = (x, z) => Math.sin(x * 0.034 + z * 0.012) * Math.cos(z * 0.029 - x * 0.008) * 0.55
    + Math.sin(x * 0.087 + 1.7) * Math.sin(z * 0.079 + 0.4) * 0.3 + Math.sin((x * 0.6 + z) * 0.17) * 0.15;
  const dune = (x, z) => Math.pow(Math.max(0, noise(x, z) * 0.5 + 0.5), 1.6);
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

  return buildRealScene(L, {
    name: 'Zandvoort',
    seed: 1948,
    margin: 700,
    pitTheme,
    style: {
      kerb: [rgb(0xf2f1ec), rgb(0xc8202a)],
      runoff: 'stripes', stripes: [rgb(0xc8202a), rgb(0xf2f1ec)],
      barrier: 'armco', fence: true, lamps: 'none', verge: 'grass',
      sponsors: SPONSORS,
      zoneBrands: ['ORANJE BIER', 'TULIP TELECOM', 'POLDER OIL', 'KAASBANK', 'NOORDZEE AIR', 'DUIN TYRES'],
      primeBrands: ['ORANJE BIER', 'WINDMOLEN ENERGIE'],
      title: ['ZANDVOORT', 'DUTCH GRAND PRIX', '#ff6a00', '#ffffff', '#21468b'],
      bridges: [['ORANJE BIER', 'PROOST, ZANDVOORT', '#ff6a00', '#ffffff', '#1b1b1f'], ['TULIP TELECOM', 'ALWAYS IN BLOOM', '#c8102e', '#ffffff', '#ffd23f']],
      roadName: 'ZANDVOORT',
      bannerGlow: 0.15,
      boardBorder: '#ff6a00',
    },
    fascia: ['ZANDVOORT', 'DUTCH GRAND PRIX'],
    fasciaColours: ['#ff6a00', '#ffffff', '#21468b'],
    skirtColour: [0.62, 0.6, 0.42],
    // Dunes: rolling sand ridges rising away from the track, falling to the beach in the west.
    relief(x, z, d) {
      const inland = smooth(18, 80, d);
      let h = dune(x, z) * 16 * inland;
      h -= smooth(beachX + 160, beachX, x) * (h + 7); // down to the beach
      return h;
    },
    colourAt(x, z, h, slope, d) {
      const n = noise(x, z), fine = noise(x * 2.3 + 40, z * 2.3);
      const sand = [0.95, 0.86, 0.66], marram = [0.6, 0.67, 0.36], scrub = [0.3, 0.41, 0.2], green = [0.44, 0.6, 0.28];
      const beach = smooth(beachX + 60, beachX - 20, x);
      // Blow-outs of bare sand on the crests and steep faces, marram on the slopes, scrub in the hollows.
      let c = d < 40 ? green : n < -0.25 ? scrub : marram;
      const t = Math.min(1, Math.max(0, slope * 1.5 + smooth(0.42, 0.7, n) * 0.85 + (fine > 0.7 ? 0.3 : 0) + beach));
      return c.map((v, k) => v + (sand[k] - v) * t);
    },
    water: [{ x: seaX - 6000, z: (tz0 + tz1) / 2, r: 6000, y: -1.2, colour: 0x3a6a7a }],
    stands: [
      { at: 63, side: 'L', W: 160, tiers: 16, build: mainTribune, depth: 16 },
      { at: 0, side: 'L', W: 90, tiers: 14, build: duneTribune },
      { at: 3, side: 'outside', W: 120, tiers: 18, build: duneTribune, offset: 10 }, // Tarzan tribune
      { at: 6, side: 'outside', W: 60, tiers: 14, build: duneTribune },
      { at: 14, side: 'outside', W: 80, tiers: 16, build: duneTribune }, // Hugenholtz bowl
      { at: 17, side: 'outside', W: 60, tiers: 12, build: duneTribune },
      { at: 20, side: 'outside', W: 70, tiers: 14, build: duneTribune }, // Hunserug
      { at: 29, side: 'outside', W: 80, tiers: 16, build: duneTribune }, // Scheivlak
      { at: 33, side: 'outside', W: 60, tiers: 12, build: duneTribune }, // Masters
      { at: 50, side: 'outside', W: 70, tiers: 14, build: duneTribune }, // Hans Ernst
      { at: 56, side: 'outside', W: 60, tiers: 12, build: duneTribune }, // Kumho
      { at: 58, side: 'outside', W: 100, tiers: 18, build: duneTribune }, // Arena (Arie Luyendijk)
      { at: 60, side: 'outside', W: 80, tiers: 16, build: duneTribune },
    ],
    landmarks({ L, R, frameAt, lotAt, kit, placed }) {
      // Paddock: marquee hospitality and team motorhomes behind the pit building.
      const TEAM = [0xc8102e, 0xff7a12, 0x1e2a5a, 0x00a19c, 0x2a7a3a, 0x1b1b1f, 0x6a8ac8, 0xd8d8d8].map(rgb);
      let pad = 0;
      for (let s = -160; s < 40; s += 22) {
        const at = (s + L.length) % L.length;
        const fr = kit.frontage(at, 'R', 44);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 19, 13, 1.5, null);
        if (F) { marquee(F, R); pad++; }
        const fm = kit.frontage(at, 'R', 64);
        const M = kit.lot(fm.x, fm.z, fm.dirX, fm.dirZ, 15, 4, 1, null);
        if (M) { motorhome(M, TEAM[pad % TEAM.length]); pad++; }
      }
      placed.paddock = pad;
      // The beach: pavilions every ~140 m along the tide line, the boulevard of flats behind it.
      let pav = 0, flats = 0;
      for (let z = tz0 - 500; z < tz1 + 700; z += 140) {
        beachPavilion(frameAt(beachX - 40, z + R() * 30, -Math.PI / 2), R);
        pav++;
      }
      for (let z = (tz0 + tz1) / 2 + 150; z < tz1 + 800; z += 48 + R() * 20) {
        seafrontFlats(frameAt(beachX + 70 + R() * 30, z, -Math.PI / 2), R); flats++;
      }
      // The village south of the circuit: streets of brick houses, the water tower and the church.
      let houses = 0;
      const vx0 = tx0 - 230, vz0 = tz1 + 140;
      for (let gx = 0; gx < 14; gx++) {
        for (let gz = 0; gz < 9; gz++) {
          const x = vx0 + gx * 32, z = vz0 + gz * 30;
          for (let k = 0; k < 4; k++) {
            const hx = x + k * 7.2, hz = z;
            if (!kit.isFree(hx, hz, 30)) continue;
            dutchHouse(frameAt(hx, hz, 0), R);
            houses++;
          }
        }
      }
      waterTower(frameAt(vx0 + 200, vz0 + 120));
      church(frameAt(vx0 + 330, vz0 + 60, 0.3));
      placed.village = { pav, flats, houses };
      // Fan campsite on the dunes east of the circuit.
      let tents = 0;
      for (let k = 0; k < 220; k++) {
        const x = tx1 + 90 + R() * 180, z = tz0 + 100 + R() * (tz1 - tz0 - 200);
        if (!kit.isFree(x, z, 20)) continue;
        tent(frameAt(x, z, R() * 3), R);
        tents++;
      }
      placed.camp = tents;
    },
    trees: {
      variants: [dunePine, duneShrub, thicket],
      attempts: 12000,
      scale: [1, 1, 1],
      test(x, z, d, h, R) {
        if (x < beachX + 40) return -1; // open beach
        if (d < 25) return -1;
        const n = noise(x, z);
        if (n < -0.25) return R() < 0.55 ? 0 : 2; // woods and thickets in the hollows
        if (n > 0.3) return R() < 0.2 ? 1 : -1; // crests: bare sand, a little marram
        return R() < 0.5 ? 1 : R() < 0.25 ? 2 : -1;
      },
    },
  });
}
