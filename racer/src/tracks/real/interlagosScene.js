import { rgb, scaleC, pick } from '../street/kit.js';
import { buildRealScene } from './scene.js';

/*
 * Interlagos, handcrafted: the circuit sits in a bowl in southern São Paulo.
 * The covered concrete main grandstand faces the pits on the climb to the
 * line, temporary tribunes line the Senna S, Junção and Laranjinha, the pit
 * building has modernist concrete fins, and the lakes lie in the infield and
 * behind the Descida do Lago. All around the bowl rise apartment towers and
 * hillside favelas; the infield is lush with canopy trees, palms and jacarandas.
 */

const WHITE = rgb(0xf2f2ee), STEEL = rgb(0x8a929e), CONCRETE = rgb(0xb4b2ac), DARK = rgb(0x262a30);
const YELLOW = rgb(0xffd200), GREEN = rgb(0x009b3a), BLUE = rgb(0x002776);
const SHIRTS = [YELLOW, YELLOW, GREEN, GREEN, BLUE, WHITE, rgb(0xc8102e), rgb(0x1b1b1f)];

const SPONSORS = [
  ['SAMBA TELECOM', '#009b3a', '#ffd200', '#ffffff', 'wave'],
  ['CAFÉ PAULISTA', '#4a2e1c', '#f2c879', '#f2c879', 'serif'],
  ['GUARANÁ POP', '#c8102e', '#ffffff', '#1f7a3a', 'stripes'],
  ['SELVA AIR', '#1f7a3a', '#ffffff', '#ffd200', 'wave'],
  ['BANCO PAULISTA', '#002776', '#ffffff', '#ffd200', 'serif'],
  ['VERDE OIL', '#0a3a1a', '#ffd200', '#ffd200', 'tread'],
  ['AÇAÍ ENERGY', '#4a1a5a', '#ffffff', '#c86ad8', 'bolt'],
  ['TUCANO TYRES', '#111214', '#ff8a1a', '#ff8a1a', 'tread'],
];

/** The main grandstand on the climb: concrete terraces in yellow, green and blue under a flat slab on pillars. */
function mainGrandstand(F, r, W, tiers) {
  const seats = [];
  const step = 0.85, rise = 0.6;
  F.box('concrete', -W / 2, W / 2, 0, 2.6, -1.6, 0.2, CONCRETE);
  for (let k = 0; k < tiers; k++) {
    const y = 2.6 + k * rise, b1 = -1.6 - k * step, b0 = b1 - step;
    F.box('concrete', -W / 2, W / 2, y - 0.6, y, b0, b1, CONCRETE);
    // Painted terraces: blocks of the flag colours along the stand.
    for (let a = -W / 2; a < W / 2 - 0.01; a += 12) {
      const col = [YELLOW, GREEN, BLUE, GREEN][Math.floor((a + W / 2) / 12) % 4];
      F.box('trim', a, Math.min(W / 2, a + 12), y, y + 0.06, b0 + 0.05, b1, scaleC(col, k % 2 ? 0.92 : 1));
    }
    for (let a = -W / 2 + 0.4; a < W / 2 - 0.3; a += 0.55) if (r() < 0.9) seats.push(F.at(a + (r() - 0.5) * 0.1, y + 0.06, b1 - 0.45));
  }
  const depth = 1.6 + tiers * step, top = 2.6 + tiers * rise;
  F.box('concrete', -W / 2, W / 2, 0, top + 1, -depth - 0.5, -depth, scaleC(CONCRETE, 0.85));
  // Roof slab on round pillars rising through the terraces, with a fascia and Brazilian flags.
  const roofY = top + 4.5;
  for (let a = -W / 2 + 2; a <= W / 2 - 2; a += 12) F.cylinder('concrete', a, -depth * 0.55, 0.45, 0, roofY, 8, CONCRETE);
  F.box('concrete', -W / 2 - 1, W / 2 + 1, roofY, roofY + 0.8, -depth - 1, 1.5, rgb(0xd8d6d0));
  for (let a = -W / 2 + 6; a < W / 2; a += 20) {
    F.box('metal', a - 0.05, a + 0.05, roofY + 0.8, roofY + 6, 0.8, 0.9, STEEL);
    F.box('fabric', a, a + 3, roofY + 4.6, roofY + 6, 0.85, 0.87, GREEN);
    F.box('fabric', a + 1.1, a + 1.9, roofY + 5.0, roofY + 5.6, 0.83, 0.85, YELLOW);
  }
  return { seats, fascia: { a0: -W / 2 - 1, a1: W / 2 + 1, y0: roofY, y1: roofY + 0.8, b: 1.52 }, shirts: SHIRTS };
}

/** Temporary tribune: steel frame, white seats with a coloured top band, banners on the back. */
function tribune(F, r, W, tiers) {
  const seats = [];
  const step = 0.8, rise = 0.6;
  for (let k = 0; k < tiers; k++) {
    const y = 1.1 + k * rise, b1 = -k * step, b0 = b1 - step;
    const col = k > tiers - 3 ? GREEN : rgb(0xe8e8e4);
    F.box('trim', -W / 2, W / 2, y - 0.07, y, b0, b1, col);
    F.box('trim', -W / 2, W / 2, y, y + 0.36, b0, b0 + 0.08, scaleC(col, 0.82));
    for (let a = -W / 2 + 0.4; a < W / 2 - 0.3; a += 0.55) if (r() < 0.85) seats.push(F.at(a + (r() - 0.5) * 0.1, y, b1 - 0.42));
  }
  const depth = tiers * step, top = 1.1 + tiers * rise;
  for (let a = -W / 2; a <= W / 2 + 0.01; a += 3.5) {
    for (let k = 0; k < tiers; k += 2) F.box('metal', a - 0.05, a + 0.05, 0, 1.1 + k * rise, -k * step - 0.05, -k * step + 0.05, STEEL);
    F.box('metal', a - 0.05, a + 0.05, 0, top + 1, -depth - 0.05, -depth + 0.05, STEEL);
  }
  for (let a = -W / 2; a < W / 2 - 0.1; a += 8) F.box('fabric', a, Math.min(W / 2, a + 8), top - 2, top + 1, -depth - 0.08, -depth - 0.06, [YELLOW, GREEN, BLUE][Math.floor((a + W / 2) / 8) % 3]);
  F.box('trim', -W / 2, W / 2, 0, 1.2, 0, 0.12, GREEN);
  return { seats, fascia: { a0: -W / 2, a1: W / 2, y0: 0.15, y1: 1.1, b: 0.13 }, shirts: SHIRTS };
}

/** Pit building: grey concrete with deep vertical fins (brise-soleil) over green glass, and a flat roof terrace. */
const pitTheme = {
  wall: rgb(0xd8d6d0),
  upper(F, hw, i, rc, { H1, DEPTH }) {
    const top = H1 + 4;
    F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -1.2, rgb(0xc8c6c0));
    F.face(i % 3 === 0 ? 'winLit' : 'glass', -hw, hw, H1 + 0.3, top - 0.3, -1.18, [1.05, 1.2, 1.0]);
    for (let a = -hw; a <= hw + 0.01; a += hw / 2) F.box('concrete', a - 0.12, a + 0.12, H1, top + 0.4, -1.2, 0.6, CONCRETE);
    F.box('concrete', -hw - 0.05, hw + 0.05, top, top + 0.45, -DEPTH, 0.8, rgb(0xe4e2dc));
    F.box('metal', -hw, hw, top + 0.45, top + 1.4, 0.65, 0.75, rgb(0x9fb8cc));
    if (rc) {
      // Race control: a curved concrete drum on the roof.
      F.cylinder('stucco', 0, -DEPTH / 2, hw - 0.5, top + 0.45, top + 5, 14, rgb(0xe4e2dc));
      F.cylinder('winLit', 0, -DEPTH / 2, hw - 0.45, top + 1.4, top + 4, 14, [1.15, 1.25, 1.2]);
    }
  },
};

const SP_WALLS = [0xd8d0c0, 0xc8b8a0, 0xe8e2d6, 0xb8b0a4, 0x9a9488, 0xd0c4b0, 0xc4ccd0, 0xe0d4c0].map(rgb);

/** São Paulo residential tower: tall slab, window grid, balcony bands, rooftop water tank. */
function apartmentTower(F, r) {
  const W = 16 + r() * 10, D = 14 + r() * 6, floors = 12 + Math.floor(r() * 24), fh = 2.8, H = floors * fh;
  const c = pick(r, SP_WALLS);
  F.box('stucco', -W / 2, W / 2, 0, H, -D, 0, c);
  for (let f = 1; f < floors; f++) {
    const y = f * fh;
    for (let a = -W / 2 + 1; a < W / 2 - 1.5; a += 2.6) F.face(r() < 0.3 ? 'winLit' : 'glass', a, a + 1.6, y + 0.6, y + 2.0, 0.02, [1.25, 1.1, 0.85]);
    if (f % 2 === 0) F.box('trim', -W / 2, W / 2, y, y + 0.12, 0, 0.9, scaleC(c, 1.08));
  }
  F.box('stucco', -W / 4, W / 4, H, H + 3, -D / 2 - 2, -D / 2 + 2, scaleC(c, 0.85));
  if (r() < 0.5) F.box('metal', -W / 2 + 1, -W / 2 + 1.1, H, H + 6, -D / 2, -D / 2 + 0.1, STEEL);
}

const FAVELA = [0xe8a05a, 0x6aa8d8, 0xe85a4a, 0xf2d24a, 0x8ac86a, 0xd8d0c0, 0xb86a3a, 0xc8a0d8, 0x9a8a7a].map(rgb);

/** Hillside of small self-built houses: painted brick boxes, flat roofs and blue water tanks. */
function favela(F, r) {
  for (let k = 0; k < 36; k++) {
    const a = (r() - 0.5) * 50, b = -r() * 40;
    const w = 3.5 + r() * 3, d = 3.5 + r() * 3, floors = 1 + Math.floor(r() * 3);
    const c = r() < 0.35 ? rgb(0xa8604a) : pick(r, FAVELA);
    F.box('stucco', a - w / 2, a + w / 2, -1, floors * 2.7, b - d / 2, b + d / 2, c);
    F.face(r() < 0.3 ? 'winLit' : 'glass', a - 0.6, a + 0.6, 1.0, 2.0, b + d / 2 + 0.02, [1.3, 1.0, 0.6]);
    if (r() < 0.6) F.cylinder('trim', a + w / 4, b, 0.6, floors * 2.7, floors * 2.7 + 1.1, 8, rgb(0x2f5aa8));
  }
}

/** Low-rise neighbourhood house: rendered walls, terracotta roof. */
function casa(F, r) {
  const W = 8 + r() * 4, D = 9, H = 3 + (r() < 0.4 ? 3 : 0);
  F.box('stucco', -W / 2, W / 2, -1, H, -D, 0, pick(r, SP_WALLS));
  F.face('glass', -1.2, 1.2, 1, 2.2, 0.02, null);
  F.hipRoof('roof', -W / 2, W / 2, -D, 0, H, 1.8, rgb(0xb0582e), 0.4);
}

/** Roadside billboard on two legs. */
function billboard(F, r) {
  const [bg, fg] = pick(r, [[GREEN, YELLOW], [rgb(0xc8102e), WHITE], [BLUE, YELLOW], [rgb(0x4a1a5a), WHITE]]);
  for (const a of [-4, 4]) F.box('metal', a - 0.2, a + 0.2, 0, 8, -0.2, 0.2, STEEL);
  F.box('stucco', -7, 7, 8, 13, -0.3, 0, bg);
  F.box('stucco', -6, 6, 9.5, 11.5, 0, 0.05, fg);
}

/** Tropical canopy tree: a broad, bright crown on a pale trunk. */
function canopyTree(F, r) {
  const h = 8 + r() * 5, spread = 4 + r() * 3;
  F.cylinder('trim', 0, 0, 0.4, 0, h * 0.6, 6, rgb(0x8a7a62));
  for (let k = 0; k < 6; k++) {
    const t = (k / 6) * Math.PI * 2 + r(), rr = spread * (0.3 + r() * 0.3), lr = spread * (0.45 + r() * 0.2), y = h * (0.55 + r() * 0.2);
    F.cylinder('leaf', Math.cos(t) * rr, Math.sin(t) * rr, lr, y, y + lr * 1.1, 8, scaleC(rgb(pick(r, [0x2f7a2a, 0x3a8a30, 0x2a6a26, 0x4a9a3a])), 0.9 + r() * 0.2));
  }
  F.cylinder('leaf', 0, 0, spread * 0.55, h * 0.78, h, 8, rgb(0x358a2e));
}

/** Jacaranda: an open crown of violet blossom. */
function jacaranda(F, r) {
  const h = 7 + r() * 3, spread = 4 + r() * 2;
  F.cylinder('trim', 0, 0, 0.3, 0, h * 0.55, 6, rgb(0x5a4a3a));
  for (let k = 0; k < 7; k++) {
    const t = (k / 7) * Math.PI * 2 + r(), rr = spread * (0.35 + r() * 0.3), lr = spread * (0.35 + r() * 0.15), y = h * (0.55 + r() * 0.25);
    F.cylinder('leaf', Math.cos(t) * rr, Math.sin(t) * rr, lr, y, y + lr * 0.9, 7, rgb(pick(r, [0x8a5ac8, 0x9a6ad8, 0x7a4ab8, 0x6a8a3a])));
  }
}

/** Point in frame space -> world, helper for the fronds. */
const at = (F, a, y, b) => F.at(a, y, b);

/**
 * Royal palm, in detail: a smooth grey trunk with growth rings that swells at
 * the base and narrows up to a glossy green crownshaft; 14 arching fronds, each
 * a curved midrib in four segments carrying drooping leaflets on both sides.
 */
function royalPalm(F, r) {
  const h = 13 + r() * 7, lean = (r() - 0.5) * 0.6;
  const trunkAt = (u) => [lean * u * u * 2, u * (h - 2.6)];
  for (let k = 0; k < 8; k++) {
    const u0 = k / 8, u1 = (k + 1) / 8;
    const [a0, y0] = trunkAt(u0), [, y1] = trunkAt(u1);
    const rad = 0.42 - u0 * 0.16 + (k === 0 ? 0.08 : 0);
    F.cylinder('trim', a0, 0, rad, y0, y1, 8, rgb(k % 2 ? 0xb4b0a8 : 0xa8a49c));
  }
  const [ta, ty] = trunkAt(1);
  F.cylinder('leaf', ta, 0, 0.3, ty, ty + 2.6, 8, rgb(0x5a9a3a)); // crownshaft
  const top = ty + 2.4;
  const N = 14;
  for (let k = 0; k < N; k++) {
    const t = (k / N) * Math.PI * 2 + r() * 0.25;
    const len = 4.2 + r() * 1.4, up = 0.6 + r() * 0.8; // arch up then droop
    const col = rgb(pick(r, [0x3a7a2a, 0x4a8a34, 0x2f6a24, 0x447e2e]));
    let prev = [ta, top, 0];
    for (let sgm = 1; sgm <= 4; sgm++) {
      const u = sgm / 4;
      const d = len * u, y = top + up * Math.sin(u * Math.PI * 0.8) - u * u * 2.2;
      const cur = [ta + Math.cos(t) * d, y, Math.sin(t) * d];
      // Midrib.
      F.mb.color = scaleC(col, 0.8);
      const side = [-Math.sin(t) * 0.05, 0, Math.cos(t) * 0.05];
      F.mb.triFacing('leaf', at(F, prev[0], prev[1], prev[2]), at(F, cur[0], cur[1], cur[2]), at(F, cur[0] + side[0], cur[1] + 0.04, cur[2] + side[2]), [0, 1, 0]);
      // Leaflets hanging from both sides of this segment, shorter towards the tip.
      const ll = 1.1 * (1 - u * 0.55);
      for (const sg of [-1, 1]) {
        const ox = -Math.sin(t) * sg, oz = Math.cos(t) * sg;
        const mid = [(prev[0] + cur[0]) / 2, (prev[1] + cur[1]) / 2, (prev[2] + cur[2]) / 2];
        const tip = [mid[0] + ox * ll, mid[1] - ll * 0.7, mid[2] + oz * ll];
        F.mb.color = scaleC(col, 0.92 + r() * 0.16);
        F.mb.triFacing('leaf', at(F, ...prev), at(F, ...cur), at(F, ...tip), [0, 1, 0]);
        F.mb.triFacing('leaf', at(F, ...prev), at(F, ...tip), at(F, ...cur), [0, -1, 0]);
      }
      prev = cur;
    }
  }
}

export function buildInterlagosScene(L) {
  let tx0 = Infinity, tx1 = -Infinity, tz0 = Infinity, tz1 = -Infinity;
  for (let i = 0; i < L.N; i++) { tx0 = Math.min(tx0, L.x[i]); tx1 = Math.max(tx1, L.x[i]); tz0 = Math.min(tz0, L.z[i]); tz1 = Math.max(tz1, L.z[i]); }
  const cx = (tx0 + tx1) / 2, cz = (tz0 + tz1) / 2;
  const hills = (x, z) => Math.sin(x * 0.009 + 0.4) * Math.cos(z * 0.011 + 1.1) * 0.6 + Math.sin(x * 0.023 - z * 0.017) * 0.4;
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  // Lakes: behind the Descida do Lago (outside T4) and in the infield.
  const i4 = L.pointSample[19], i28 = L.pointSample[33];
  const sgO = L.k[i4] > 0 ? -1 : 1;
  const lakeA = { x: L.x[i4] + L.nx[i4] * sgO * 95, z: L.z[i4] + L.nz[i4] * sgO * 95, r: 60, colour: 0x3a5a4a };
  const lakeB = { x: (L.x[i28] + cx) / 2, z: (L.z[i28] + cz) / 2 + 40, r: 45, colour: 0x3a5a4a };

  return buildRealScene(L, {
    name: 'Interlagos',
    seed: 1940,
    margin: 800,
    pitTheme,
    style: {
      kerb: [rgb(0xffd200), rgb(0x009b3a)],
      runoff: 'stripes', stripes: [rgb(0x009b3a), rgb(0xffd200)],
      barrier: 'jersey', fence: true, lamps: 'none', verge: 'paved',
      asphaltTint: 0xd0d0d4, // the lighter grey 2024 surface
      sponsors: SPONSORS,
      zoneBrands: ['SAMBA TELECOM', 'GUARANÁ POP', 'SELVA AIR', 'VERDE OIL', 'AÇAÍ ENERGY', 'TUCANO TYRES'],
      primeBrands: ['BANCO PAULISTA', 'CAFÉ PAULISTA'],
      title: ['INTERLAGOS', 'GRANDE PRÊMIO DE SÃO PAULO', '#009b3a', '#ffd200', '#002776'],
      bridges: [['GUARANÁ POP', 'SABOR DO BRASIL', '#c8102e', '#ffffff', '#1f7a3a'], ['SAMBA TELECOM', 'SEMPRE CONECTADO', '#009b3a', '#ffd200', '#ffffff']],
      roadName: 'INTERLAGOS',
      bannerGlow: 0.15,
      boardBorder: '#009b3a',
    },
    fascia: ['INTERLAGOS', 'GRANDE PRÊMIO DE SÃO PAULO'],
    fasciaColours: ['#009b3a', '#ffd200', '#002776'],
    skirtColour: [0.42, 0.46, 0.36],
    // The bowl: the city rises on every side, with hills and valleys.
    relief(x, z, d) { return smooth(120, 800, d) * 38 + hills(x, z) * 10 * smooth(40, 250, d); },
    colourAt(x, z, h, slope, d) {
      const n = hills(x * 2.7, z * 2.7);
      const lawn = [0.4, 0.6, 0.26], scrub = [0.34, 0.48, 0.24], earth = [0.62, 0.42, 0.3];
      let c = d < 60 ? lawn : n > 0.2 ? scrub : lawn;
      if (slope > 0.18) c = c.map((v, k) => v + (earth[k] - v) * Math.min(1, (slope - 0.18) * 3)); // red São Paulo soil on cuttings
      return c;
    },
    water: [lakeA, lakeB],
    stands: [
      { at: 73, side: 'R', W: 220, tiers: 20, build: mainGrandstand, depth: 20, offset: -60 },
      { at: 3, side: 'outside', W: 120, tiers: 18, build: tribune }, // Senna S, Setor A
      { at: 7, side: 'outside', W: 70, tiers: 14, build: tribune },
      { at: 12, side: 'outside', W: 80, tiers: 14, build: tribune }, // Curva do Sol
      { at: 19, side: 'outside', W: 80, tiers: 14, build: tribune }, // Descida do Lago
      { at: 29, side: 'outside', W: 60, tiers: 12, build: tribune }, // Ferradura
      { at: 36, side: 'outside', W: 70, tiers: 14, build: tribune }, // Laranjinha
      { at: 41, side: 'outside', W: 60, tiers: 12, build: tribune }, // Pinheirinho
      { at: 49, side: 'outside', W: 60, tiers: 12, build: tribune }, // Bico de Pato
      { at: 59, side: 'outside', W: 110, tiers: 18, build: tribune }, // Junção
      { at: 64, side: 'R', W: 90, tiers: 16, build: tribune }, // the climb
    ],
    landmarks({ L, R, frameAt, kit, terrain, placed }) {
      // Paddock: team trucks and hospitality behind the pits (inside, left).
      const TEAM = [0xc8102e, 0xff7a12, 0x1e2a5a, 0x00a19c, 0x2a7a3a, 0x1b1b1f, 0x6a8ac8, 0xd8d8d8].map(rgb);
      let pad = 0;
      for (let s = -190; s < 50; s += 20) {
        const fr = kit.frontage((s + L.length) % L.length, 'L', 46);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 16, 12, 1, null);
        if (!F) continue;
        const col = TEAM[pad++ % TEAM.length];
        F.box('stucco', -7.5, 7.5, 0.6, 4, -12, -9.6, col); // truck trailer
        F.box('stucco', -7.8, 7.8, 0, 3.2, -6, 0, rgb(0xe8e6e0)); // hospitality unit
        F.face('winLit', -7.2, 7.2, 0.4, 2.8, 0.02, [1.2, 1.1, 0.95]);
        F.box('stucco', -7.8, 7.8, 3.2, 3.5, -6.2, 1.5, col);
      }
      placed.paddock = pad;
      // The city: towers and favelas on the rim of the bowl, low-rise houses closer in, billboards on the ring roads.
      let towers = 0, favelas = 0, houses = 0, boards = 0;
      for (let k = 0; k < 1400; k++) {
        const t = R() * Math.PI * 2, rr = 280 + R() * 900;
        const x = cx + Math.cos(t) * rr * 1.25, z = cz + Math.sin(t) * rr;
        const d = terrain.distAt(x, z);
        if (d < 90 || !kit.isFree(x, z, 40) || kit.overlaps({ cx: x, cz: z, ux: 1, uz: 0, hw: 14, hd: 14 })) continue;
        if ([lakeA, lakeB].some((w) => Math.hypot(x - w.x, z - w.z) < w.r + 25)) continue;
        kit.footprints.push({ cx: x, cz: z, ux: 1, uz: 0, hw: 14, hd: 14 });
        const yaw = Math.atan2(cx - x, cz - z) + (R() - 0.5) * 0.6;
        const F = frameAt(x, z, yaw);
        if (d > 330 && R() < 0.5) { apartmentTower(F, R); towers++; }
        else if (d > 200 && R() < 0.35) { favela(F, R); favelas++; }
        else if (R() < 0.08) { billboard(F, R); boards++; }
        else { casa(F, R); houses++; }
      }
      placed.city = { towers, favelas, houses, boards };
    },
    trees: {
      variants: [canopyTree, royalPalm, jacaranda],
      attempts: 9000,
      scale: [1, 1, 1],
      test(x, z, d, h, R) {
        if (d < 22 || d > 420) return -1;
        const v = R();
        if (d < 200) return v < 0.45 ? 1 : v < 0.9 ? 0 : 2; // palms and canopy trees, a few jacarandas
        return v < 0.22 ? 0 : v < 0.34 ? 1 : -1;
      },
    },
  });
}
