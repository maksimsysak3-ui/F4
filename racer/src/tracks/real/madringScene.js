import { rgb, scaleC, pick } from '../street/kit.js?v=b8df018';
import { standVariety, standBack } from './trackside.js?v=b8df018';
import { buildRealScene } from './scene.js?v=b8df018';
import { venueRoads, venueBackOfHouse } from './backOfHouse.js?v=b8df018';
import { sub, VEHICLES, lightMast, constructionSite } from '../backstageProps.js?v=b8df018';
import { tree, cypress, stonePine } from '../street/trees.js?v=b8df018';
import { grandstand } from '../street/props.js?v=b8df018';
import { beam } from '../night/venue.js?v=b8df018';
import { buildTunnel } from './tunnel.js?v=b8df018';
import { trackSpans, roadOverpass } from './spans.js?v=b8df018';
import { riviera, townhouses, grandHotel } from '../street/buildings.js?v=b8df018';
import { createDaySkyline, skin, rect } from './sgCity.js?v=b8df018';
import { signMaterial, placeSign, letter } from './signs.js?v=b8df018';
import { skinGeo, FACADES } from './facades.js?v=b8df018';
import { text3D, FONTS } from './vegasKit.js?v=b8df018';

/*
 * Madring, handcrafted. A hybrid street circuit in north-east Madrid, ~700 m up on the dry plateau.
 * The main straight runs up the west side of IFEMA, the trade-fair grounds: huge pale exhibition
 * halls with saw-tooth roofs and glass entrance halls, plane trees along the boulevards, a row of
 * flags. Down to the low point at Turn 2, then the long climb up the diagonal under the motorway
 * bridges to Turn 7, the top of the lap; east through Valdebebas, new roads crossing open dusty land
 * and young parks, round La Monumental, the 550 m bowl banked at up to 24% with its 45,000-seat
 * grandstands, back west and down into the tunnel under the motorway that brings the lap back to
 * IFEMA, its portal hung with the MADRING banner. Concrete walls and debris fences, footbridges,
 * billboards; red-and-yellow kerbs, sausage kerbs at the chicanes, red run-offs with yellow fields
 * and MSC Cruises; the Cuatro Torres on the skyline to the west.
 */

const WHITE = rgb(0xf2f0ea), RED = rgb(0xc60b1e), YELLOW = rgb(0xffc400), STEEL = rgb(0x8a929e), CONC = rgb(0xc8c4bc);
const SHIRTS = [RED, YELLOW, WHITE, rgb(0x1b1b1f), rgb(0xff8000), rgb(0x00a19b), rgb(0x1f4f9a), RED];

function madStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: r() < 0.4, style: 'steel', seats: [RED, YELLOW, rgb(0x2a2a30)] });
  if (tiers >= 18) standBack(F, W, tiers, rgb(0xd8d0c4));
  return { ...gs, shirts: SHIRTS };
}
const VARIED = standVariety(madStand, null, SHIRTS);

/** One segment of La Monumental's bowl: steep red-and-yellow tiers, a canopy on slim masts, the rim lit. */
function bowlSegment(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: false, style: 'steel', seats: [RED, YELLOW, RED] });
  const depth = tiers * 0.85 + 2, top = 1.2 + tiers * 0.58;
  F.box('stucco', -W / 2 - 0.3, W / 2 + 0.3, top + 6, top + 6.6, -depth - 1, 2.5, WHITE);          // the canopy
  F.box('trim', -W / 2 - 0.3, W / 2 + 0.3, top + 6, top + 6.25, 2.3, 2.6, RED);
  for (const a of [-W / 2, W / 2]) F.box('metal', a - 0.15, a + 0.15, 0, top + 6, -depth - 0.6, -depth - 0.3, STEEL);
  F.box('stucco', -W / 2 - 0.3, W / 2 + 0.3, 0, top + 0.6, -depth - 1.2, -depth - 0.6, rgb(0xd8c8b0)); // the back wall
  for (let a = -W / 2 + 1.5; a < W / 2; a += 3) F.box('stucco', a - 0.6, a + 0.6, 2, top - 2, -depth - 1.25, -depth - 1.15, rgb(0xb8a890)); // its arches, bullring-style
  return { ...gs, shirts: SHIRTS };
}

/** An IFEMA exhibition hall: a long pale box under a saw-tooth roof, glass foyer, the hall number. */
function hall(F, r, W, D, num) {
  const H = 16 + r() * 4;
  F.box('stucco', -W / 2, W / 2, 0, H, -D, 0, rgb(0xe4e0d6));
  for (let a = -W / 2 + 2; a < W / 2 - 1; a += 6) F.box('trim', a - 0.25, a + 0.25, 0, H, 0, 0.35, rgb(0xb8b4aa));   // ribbed cladding
  for (let b = -D + 6; b <= -1; b += 10) F.block('roof', [[-W / 2, b], [W / 2, b], [W / 2, b - 10], [-W / 2, b - 10]], [[-W / 2, b - 0.2], [W / 2, b - 0.2], [W / 2, b - 10], [-W / 2, b - 10]], H, H + 3.4, rgb(0x9aa0a8));
  // The glass foyer and canopy, the hall's number big on the facade.
  F.box('glass', -14, 14, 0, 9, 0, 6, null);
  F.box('stucco', -18, 18, 9, 9.8, -1, 9, WHITE);
  F.box('trim', -W / 2, W / 2, H - 1.4, H - 0.6, 0.36, 0.5, rgb(0x0a5aa8));
  return H;
}

/** A modern office block of the Campo de las Naciones: glass and stone with real facade depth. */
function office(F, r, W, D, H) {
  const p = rect(W, D, 0, -D / 2);
  skinGeo(F, r, p, 0, H, { ...pick(r, [FACADES.glass, FACADES.blueGlass, FACADES.white, FACADES.punched, FACADES.glass]), day: true });
  F.box('stucco', -W / 2 - 0.5, W / 2 + 0.5, H, H + 1.2, -D - 0.5, 0.5, rgb(0xd8d6d0));
  F.box('concrete', -W * 0.3, W * 0.3, H + 1.2, H + 4, -D * 0.7, -D * 0.3, rgb(0xa8a8a4));
}

/** A Madrid mid-rise block: shops under awnings on the ground floor, flats above with real windows
 *  and balconies, a parapet with roof plant. */
function midRise(F, r, W, D, H) {
  const wall = pick(r, [rgb(0xe8dcc8), rgb(0xd8c0a0), rgb(0xc89878), rgb(0xe8e4dc), rgb(0xb88a6a)]);
  F.box('stucco', -W / 2, W / 2, 0, 4.2, -D, 0, rgb(0x3a3a3e));                       // the shop floor
  for (let a = -W / 2 + 1; a < W / 2 - 4; a += 6) {
    F.face(r() < 0.7 ? 'winLit' : 'glass', a, a + 4.6, 0.3, 3.4, 0.03, [1.0, 0.95, 0.85]);
    F.block('fabric', [[a - 0.1, 0], [a + 4.7, 0], [a + 4.7, -0.1], [a - 0.1, -0.1]], [[a - 0.1, 1.6], [a + 4.7, 1.6], [a + 4.7, 1.5], [a - 0.1, 1.5]], 3.6, 3.0, pick(r, [rgb(0x2a5a3a), rgb(0x8a1a1a), rgb(0x1a3a6a), rgb(0xd8a020)]));
  }
  skinGeo(F, r, rect(W, D, 0, -D / 2), 4.2, H, { ...pick(r, [FACADES.balcony, FACADES.punched]), wall, frame: scaleC(wall, 1.05), bay: 3.8, day: true });
  F.box('stucco', -W / 2 - 0.3, W / 2 + 0.3, H, H + 1.1, -D - 0.3, 0.3, scaleC(wall, 0.9));
  for (let k = 0; k < 3; k++) F.box('metal', -W / 3 + k * W / 3 - 1.2, -W / 3 + k * W / 3 + 1.2, H + 1.1, H + 2.6, -D * 0.6, -D * 0.6 + 2, rgb(0x9a9ea4));
}

/** A low warehouse / showroom: ribbed cladding, loading doors, a coloured fascia band, roof lights. */
function warehouse(F, r, W, D) {
  const H = 8 + r() * 4, col = pick(r, [rgb(0xd8dadc), rgb(0xb8bcc0), rgb(0xe8e4dc)]), band = pick(r, [RED, rgb(0x1a5aa8), rgb(0x2a7a4a), YELLOW]);
  F.box('stucco', -W / 2, W / 2, 0, H, -D, 0, col);
  for (let a = -W / 2 + 1; a < W / 2; a += 2) F.box('trim', a - 0.12, a + 0.12, 0, H, 0, 0.2, scaleC(col, 0.85));
  F.box('trim', -W / 2, W / 2, H - 1.6, H - 0.4, 0.2, 0.35, band);
  for (let a = -W / 2 + 4; a < W / 2 - 4; a += 9) F.face('concrete', a - 2, a + 2, 0, 4.5, 0.36, rgb(0x6a6e74));
  F.face('glass', -W / 2 + 1, -W / 2 + 8, 0.4, 3.6, 0.36, null);
  for (let b = -4; b > -D + 2; b -= 6) F.box('glass', -W / 2 + 3, W / 2 - 3, H, H + 0.6, b - 1, b, null);
}

/** A multi-storey car park: open decks on columns, parapets, parked cars glinting, a stair tower. */
function garage(F, r, W, D) {
  const C = rgb(0xb8b4ac), CARS = [rgb(0xf2f2ee), rgb(0x1b1b1f), rgb(0xc0c4c8), rgb(0x8a1418), rgb(0x2a3a6a)];
  for (let f = 0; f < 5; f++) {
    const y = f * 3.1;
    F.box('concrete', -W / 2, W / 2, y, y + 0.4, -D, 0, C);
    F.box('concrete', -W / 2, W / 2, y + 0.4, y + 1.3, -0.3, 0, scaleC(C, 1.08));
    for (let a = -W / 2 + 2; a < W / 2 - 2; a += 2.8) if (f < 4 && r() < 0.6) F.box('stucco', a - 0.9, a + 0.9, y + 0.4, y + 1.8, -5, -0.6, pick(r, CARS));
  }
  for (let a = -W / 2; a <= W / 2 + 0.1; a += W / 4) F.box('concrete', a - 0.4, a + 0.4, 0, 15.5, -D, -0.2, C);
  F.box('stucco', W / 2 - 5, W / 2, 0, 18, -5, 0, rgb(0x2a5aa8));
  F.face('winLit', W / 2 - 4.5, W / 2 - 0.5, 1, 17, 0.02, [1.0, 1.2, 1.5]);
  F.box('trim', -W / 2, -W / 2 + 6, 15.5, 17.5, -1, 0, rgb(0x2a5aa8));
}

/** A petrol station: a flat canopy on columns, pumps, the shop behind, a price totem. */
function petrol(F, r, W, D) {
  const col = pick(r, [RED, rgb(0x00843d), rgb(0x1a5aa8)]);
  F.box('stucco', -W / 2 + 2, W / 2 - 2, 5, 6.2, -D + 6, -2, WHITE);
  F.box('trim', -W / 2 + 2, W / 2 - 2, 5.2, 6.0, -2.05, -1.9, col);
  F.face('winLit', -W / 2 + 3, W / 2 - 3, 5.0, 5.05, -D / 2, [2, 2, 1.9]);
  for (let a = -W / 2 + 5; a < W / 2 - 4; a += 6) { F.box('concrete', a - 0.4, a + 0.4, 0, 5, -D / 2 - 0.4, -D / 2 + 0.4, WHITE); F.box('trim', a - 1.2, a - 0.5, 0, 1.6, -D / 2 - 0.4, -D / 2 + 0.4, col); }
  F.box('stucco', -W / 2 + 4, W / 2 - 4, 0, 4, -D, -D + 5, WHITE); F.face('glass', -W / 2 + 5, W / 2 - 5, 0.3, 3.2, -D + 5.02, null);
  F.box('stucco', W / 2 - 1.6, W / 2 - 0.4, 0, 7, -0.6, 0.6, col);
}

/** An office building that bridges the track on piers: glazed floors from 9 m up, a lit soffit. */
function officeBridge(F, r, a0, a1, Wd, floors) {
  const y0 = 9.5, H = y0 + floors * 3.4;
  skinGeo(F, r, [[a0, Wd / 2], [a1, Wd / 2], [a1, -Wd / 2], [a0, -Wd / 2]], y0, H, { ...pick(r, [FACADES.glass, FACADES.blueGlass]), day: true });
  F.box('concrete', a0, a1, y0 - 1.2, y0, -Wd / 2, Wd / 2, rgb(0xb8b4ac));                          // the transfer slab
  for (let a = a0 + 2; a < a1 - 1; a += 3) F.box('neon', a - 0.4, a + 0.4, y0 - 1.25, y0 - 1.2, -Wd / 3, Wd / 3, [1.8, 1.7, 1.5]);
  F.box('stucco', a0 - 0.4, a1 + 0.4, H, H + 1.2, -Wd / 2 - 0.4, Wd / 2 + 0.4, rgb(0xd8d6d0));
}

const VENUE = {
  pitSide: 'R', paddock: [-240, 40], tunnel: 170, ring: 150, exits: [0.1, 0.35, 0.65],
  palette: [0xf2f2ee, 0xf2f2ee, 0x1b1b1f, 0xc0c4c8, 0x8a1418, 0x2a4a8a, 0x5a5e64],
  mix: { car: 6, van: 1.5, bus: 1, truck: 0.6 }, density: 12,
  bus: RED, gate: RED, heli: RED, hoarding: RED, crane: YELLOW,
  liveries: [RED, YELLOW, WHITE], busTerminals: 2, sites: 2, hospitality: 8,
  concessions: [8, 24, 40, 56],
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

export function buildMadringScene(L) {
  let net = {};
  const img = (px, py) => L.fromImage(px, py);
  const noise = (x, z) => Math.sin(x * 0.013 + 0.3) * Math.cos(z * 0.011 + 0.8) * 0.6 + Math.sin(x * 0.033 - z * 0.027) * 0.4;
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  // IFEMA: the halls fill the inside of the lap's south-west (map), between the straight and the return.
  const ifema = (x, z) => { const [ax, az] = img(250, 310), [bx, bz] = img(520, 560); return x > Math.min(ax, bx) && x < Math.max(ax, bx) && z > Math.min(az, bz) && z < Math.max(az, bz); };
  // Valdebebas: open dusty land and new parks east of the motorway.
  const valdebebas = (x, z) => { const [ax] = img(660, 0); return x > ax; };

  return buildRealScene(L, {
    name: 'Madring',
    seed: 2026,
    life: { paddock: true, parks: 10, villages: true, paths: true },
    margin: 800,
    trackside: { standBuild: madStand, shirts: SHIRTS, suburb: 0, standSpacing: 340, hoardingSpacing: 110, skyline: { count: 0 } },
    pitTheme: {
      wall: rgb(0xe8e4dc),
      upper(F, hw, i, rc, { H1, DEPTH }) {
        F.box('stucco', -hw, hw, H1, H1 + 4, -DEPTH + 0.6, -1.0, rgb(0x2a2a30));
        F.face(i % 2 ? 'winLit' : 'glass', -hw + 0.2, hw - 0.2, H1 + 0.4, H1 + 3.6, -0.98, [1.3, 1.2, 1.0]);
        F.box('trim', -hw, hw, H1 + 4, H1 + 4.6, -DEPTH, 1.4, RED);
        F.box('trim', -hw, hw, H1 + 4.6, H1 + 4.9, -DEPTH, 1.4, YELLOW);
      },
    },
    style: {
      kerb: [RED, YELLOW],
      runoff: 'brand', runoffFull: true, runoffFields: 9, runoffBoth: 1, runoffHero: 'MADRING YELLOW', runoffFloor: [0.62, 0.1, 0.1],
      barrier: 'jersey', fence: true, fenceTop: 4.6, lamps: 'none', verge: 'paving',
      title: ['MADRING', 'GRAN PREMIO DE ESPAÑA', '#c60b1e', '#ffffff', '#ffc400'],
      roadName: 'MADRING',
      bannerGlow: 0.12,
      boardBorder: '#c60b1e',
      gantries: 2,
    },
    fascia: ['MADRING', 'GRAN PREMIO DE ESPAÑA'],
    fasciaColours: ['#c60b1e', '#ffffff', '#ffc400'],
    skirtColour: [0.5, 0.42, 0.3],
    groundKind: 'gravel',
    relief(x, z, d) {
      // The plateau rolls gently; Valdebebas is a little lumpy, worked earth.
      return noise(x * 0.5, z * 0.5) * 3 * smooth(40, 300, d) + (valdebebas(x, z) ? noise(x * 2, z * 2) * 1.2 : 0);
    },
    colourAt(x, z, h, slope, d) {
      if (d < 24) return [0.46, 0.44, 0.4];
      if (ifema(x, z)) return [0.5, 0.5, 0.48];                                       // paving and car parks
      if (valdebebas(x, z)) return noise(x * 1.6, z * 1.6) > 0.55 ? [0.5, 0.5, 0.32] : noise(x * 0.7 + 3, z * 0.7) > 0.2 ? [0.72, 0.62, 0.46] : [0.64, 0.54, 0.4]; // bare worked earth, a little scrub
      return noise(x * 2, z * 2) > 0.2 ? [0.6, 0.52, 0.36] : [0.48, 0.5, 0.3];       // dry grass and earth
    },
    stands: [
      { at: 60, side: 'L', W: 260, tiers: 22, build: madStand },                    // the main straight
      { at: 3, side: 'outside', W: 140, tiers: 18, build: VARIED },                 // T1-T2
      { at: 13, side: 'outside', W: 120, tiers: 16, build: VARIED },
      { at: 47, side: 'outside', W: 110, tiers: 16, build: VARIED },
    ],
    roads(ctx) { net = venueRoads(ctx, VENUE); },
    landmarks({ L, R, frameAt, kit, terrain, placed, group, bs }) {
      venueBackOfHouse({ L, R, kit, bs, placed, frameAt }, net, VENUE);
      placed.carParks = carParks(bs, net, R, 3);
      const ps = (k) => L.pointS(k);
      const { across, clearAcross, spanAt } = trackSpans(L, frameAt);
      // ---- the tunnel under the motorway, Valdebebas back to IFEMA ----
      const t0 = ps(41) + 30, t1 = ps(43) + 20;
      buildTunnel(L, kit, t0, t1);
      for (let s = t0 - 10; s < t1 + 10; s += 8) for (const side of ['L', 'R']) {
        const fr = kit.frontage(s, side, 0);
        kit.footprints.push({ cx: fr.x, cz: fr.z, ux: fr.dirZ, uz: -fr.dirX, hw: 5, hd: 8 });
      }
      // The portal: the MADRING banner over the tunnel mouth, the abutments in pink-washed concrete.
      const banner = signMaterial((g, W, H) => {
        g.fillStyle = '#16161c'; g.fillRect(0, 0, W, H);
        g.strokeStyle = '#e8303a'; g.lineWidth = 3; for (let k = 0; k < 9; k++) { g.beginPath(); g.ellipse(W * 0.9, H * 1.4, W * 0.1 + k * 26, H * 0.9 + k * 10, 0, Math.PI, Math.PI * 2); g.stroke(); }
        letter(g, 'MADRING', W * 0.34, H * 0.52, H * 0.6, '#e8303a', { family: '"Arial Black", Arial, sans-serif', max: W * 0.45 });
        letter(g, 'F1  GRAN PREMIO DE ESPAÑA', W * 0.72, H * 0.52, H * 0.18, '#ffffff', { family: 'Arial, sans-serif', font: '700', max: W * 0.3 });
      }, { W: 2048, H: 256, lit: 0.1 });
      {
        const { F, aL, aR } = across(t0), a0 = Math.min(aL, aR), a1 = Math.max(aL, aR);
        F.box('concrete', a0 - 6, a1 + 6, 7.2, 10.4, -0.5, 1.5, rgb(0xd8c8b8));
        placeSign(group, F, (a0 + a1) / 2, 8.6, 1.55, a1 - a0 + 6, 2.6, banner);
        if (clearAcross(F, t0, a0 - 18, a0 - 6, 3)) F.box('concrete', a0 - 18, a0 - 6, 0, 10.4, -1, 1.5, rgb(0xd8c8b8));
        if (clearAcross(F, t0, a1 + 6, a1 + 18, 3)) F.box('concrete', a1 + 6, a1 + 18, 0, 10.4, -1, 1.5, rgb(0xd8c8b8));
      }
      // ---- motorway bridges over the climb and the IFEMA return, footbridges by the straight ----
      let bridges = 0;
      for (const [s, width, H, extra, yaw] of [[ps(7) + 20, 26, 8, 30, 0.3], [ps(13) + 10, 34, 9, 40, -0.25], [ps(37), 22, 8, 26, 0.15], [ps(51), 18, 7.5, 24, 0], [ps(55) + 20, 16, 7, 20, 0.2]]) {
        const sp = spanAt(s, extra + 3, extra + 3, width + 4, yaw);
        if (!sp) continue;
        roadOverpass(sp, width, H, { col: CONC });
        bridges++;
      }
      for (const s of [ps(0) - 60, ps(1) + 40, ps(48)]) {
        const sp = spanAt(s, 5, 5, 4);
        if (!sp) continue;
        const { F } = sp, a0 = sp.a0 + 2, a1 = sp.a1 - 2, H = 7.5;   // clear of the debris fences
        F.box('metal', a0, a1, H, H + 0.4, -1.6, 1.6, STEEL);
        F.box('glass', a0, a1, H + 0.4, H + 1.6, -1.6, -1.45, null); F.box('glass', a0, a1, H + 0.4, H + 1.6, 1.45, 1.6, null);
        F.box('metal', a0, a1, H + 2.8, H + 3.0, -1.8, 1.8, WHITE);
        for (const a of [a0, a1]) F.box('concrete', a - 1.5, a + 1.5, 0, H + 3, -2, 2, CONC);
        F.box('trim', a0, a1, H - 1.2, H, 1.62, 1.7, RED);
        bridges++;
      }
      // ---- La Monumental: one continuous bowl of stands round the outside of the banked corner ----
      let bowl = 0;
      for (let s = ps(25) + 6; s < ps(32) - 6; s += 13) {
        const i = Math.floor(s / L.ds) % L.N, side = L.k[i] > 0 ? 'R' : 'L';
        if (kit.standAt(s, side, 13.5, { tiers: 30, build: bowlSegment })) bowl++;
      }
      {
        const s = ps(29), i = Math.floor(s / L.ds) % L.N, side = L.k[i] > 0 ? 'R' : 'L';
        const fr = kit.frontage(s, side, 34), F = frameAt(fr.x, fr.z, Math.atan2(-fr.dirX, -fr.dirZ) + Math.PI, terrain.heightAt(fr.x, fr.z));
        const top = 1.2 + 30 * 0.58 + 7;
        for (const a of [-16, 16]) F.box('metal', a - 0.3, a + 0.3, 0, top + 8, -0.3, 0.3, STEEL);
        text3D(F, 'LA MONUMENTAL', 0, top + 4.5, 0.4, 4.2, { face: rgb(0xffffff), body: RED, depth: 0.6 });
      }
      placed.monumental = bowl;
      // ---- sausage kerbs, where the layout's humps are ----
      let sausages = 0;
      for (const side of ['L', 'R']) {
        const sg = side === 'L' ? 1 : -1, W = L.SAUSAGE_W;
        for (let i = 0; i < L.N; i += Math.max(1, Math.round(1.5 / L.ds))) {
          if (!L.sausage[side][i]) continue;
          const p = L.poseAt(i * L.ds, sg * (L.edge + W / 2));
          const F = frameAt(p.x, p.z, p.yaw + Math.PI / 2, L.yAt(i, sg * L.edge));
          F.box('trim', -0.72, 0.72, 0, 0.04, -W / 2 - 0.05, W / 2 + 0.05, rgb(0x1b1b1f));
          F.box('trim', -0.7, 0.7, 0.04, 0.12, -W / 2, W / 2, YELLOW);
          F.box('trim', -0.7, 0.7, 0.12, 0.17, -W / 4, W / 4, YELLOW);
          sausages++;
        }
      }
      // ---- the motorway (M-11) between IFEMA and Valdebebas: eight lanes, a median, lamp standards ----
      // (static: no traffic). It passes under the lap where they cross, so it's left out near the track.
      const [mx0, mz0] = img(692, -120), [mx1, mz1] = img(668, 820);
      {
        const len = Math.hypot(mx1 - mx0, mz1 - mz0), yaw = Math.atan2(mx1 - mx0, mz1 - mz0);
        for (let t = 0; t < len; t += 8) {
          const x = mx0 + (mx1 - mx0) * (t + 4) / len, z = mz0 + (mz1 - mz0) * (t + 4) / len, n = L.nearest(x, z);
          if (n && Math.abs(n.lateral) < 40) continue;
          const F = frameAt(x, z, yaw + Math.PI / 2, terrain.heightAt(x, z));
          F.box('concrete', -4.05, 4.05, 0.02, 0.12, -19, 19, rgb(0x3a3a3e));
          F.box('concrete', -4.05, 4.05, 0.12, 0.9, -0.5, 0.5, rgb(0xb8b4ac));                  // the median barrier
          for (const b of [-14.5, -10.5, -6.5, 6.5, 10.5, 14.5]) if (Math.floor(t / 8) % 2) F.box('trim', -2, 2, 0.12, 0.14, b - 0.08, b + 0.08, WHITE);
          for (const b of [-18.4, 18.4, -1.5, 1.5]) F.box('trim', -4.05, 4.05, 0.12, 0.14, b - 0.1, b + 0.1, WHITE);
          if (Math.floor(t / 8) % 5 === 0) { F.box('metal', -0.15, 0.15, 0.9, 12, -0.15, 0.15, STEEL); F.box('metal', -0.1, 0.1, 11.6, 11.9, -4, 4, STEEL); }
          kit.footprints.push({ cx: x, cz: z, ux: Math.cos(yaw), uz: -Math.sin(yaw), hw: 21, hd: 5 });
        }
      }
      // ---- Valdebebas: open worked land, sports pitches and a building site or two, not a city ----
      let pitches = 0, sites = 0;
      for (const [px, py] of [[790, 340], [880, 340], [790, 420], [880, 420], [970, 380], [830, 500]]) {
        const [x, z] = img(px, py);
        if (terrain.distSmooth(x, z) < 50) continue;
        const F = kit.lot(x, z + 40, 0, 1, 112, 76, 2, null);
        if (!F) continue;
        F.box('concrete', -56, 56, 0, 0.1, -76, 0, rgb(0x3a7a3a));                                       // artificial turf
        for (let a = -50; a < 50; a += 10) F.box('concrete', a, a + 5, 0.1, 0.11, -73, -3, rgb(0x449044)); // mowing stripes
        const ln = (a0, a1, b0, b1) => F.box('trim', a0, a1, 0.11, 0.13, b0, b1, WHITE);
        ln(-52, 52, -4, -3.8); ln(-52, 52, -72.2, -72); ln(-52, -51.8, -72, -4); ln(51.8, 52, -72, -4); ln(-0.1, 0.1, -72, -4);
        F.cylinder('trim', 0, -38, 9.2, 0.11, 0.13, 24, WHITE); F.cylinder('concrete', 0, -38, 9, 0.11, 0.135, 24, rgb(0x3a7a3a));
        for (const a of [-52, 52]) { ln(a < 0 ? a : a - 16.5, a < 0 ? a + 16.5 : a, -58, -18); for (const b of [-41.6, -34.4]) F.box('metal', a - 0.06, a + 0.06, 0, 2.44, b - 0.06, b + 0.06, WHITE); F.box('metal', a - 0.06, a + 0.06, 2.4, 2.5, -41.6, -34.4, WHITE); }
        for (const [a, b] of [[-56, 0], [56, 0], [-56, -76], [56, -76]]) F.box('metal', a - 0.2, a + 0.2, 0, 16, b - 0.2, b + 0.2, STEEL);
        pitches++;
      }
      for (const [px, py] of [[760, 120], [1080, 300], [940, 560]]) {
        const [x, z] = img(px, py);
        if (terrain.distSmooth(x, z) < 60) continue;
        const F = kit.lot(x, z, 0, 1, 36, 28, 4, null);
        if (F) { constructionSite(F, R, { W: 32, D: 24, floors: 5 + Math.floor(R() * 4), built: 0.4 + R() * 0.4, cranes: 1 }); sites++; }
      }
      placed.valdebebasLand = { pitches, sites };
      // ---- offices that bridge the track ----
      let spans = 0;
      for (const s of [ps(1) + 90, ps(19) + 10, ps(35) + 10, ps(53)]) {
        const Wd = 16, sp = spanAt(s, 16, 16, Wd);
        if (!sp) continue;
        const { F, aL, aR } = sp, a0 = sp.a0 + 6, a1 = sp.a1 - 6;
        officeBridge(F, R, a0, a1, Wd, 3 + Math.floor(R() * 3));
        for (const a of [Math.min(aL, aR) - 1, Math.max(aL, aR) + 1]) for (const b of [-Wd / 2 + 1.2, Wd / 2 - 1.2]) F.box('concrete', a - 1, a + 1, -1, 8.3, b - 1, b + 1, rgb(0xc8c4bc));
        F.box('concrete', a0 - 6, a0, -1, 9.5, -Wd / 2, Wd / 2, rgb(0xd8d6d0));
        F.box('concrete', a1, a1 + 6, -1, 9.5, -Wd / 2, Wd / 2, rgb(0xd8d6d0));
        spans++;
      }
      // ---- the street frontage: a continuous wall of buildings round the whole lap, right behind the fences ----
      let front = 0;
      for (const side of ['L', 'R']) for (let s = 10; s < L.length;) {
        const W = 24 + R() * 22, D = 16 + R() * 10, fr = kit.frontage(s, side, 3 + R() * 3);
        if (valdebebas(fr.x, fr.z)) { s += 12; continue; }   // east of the motorway the land is open (as it is today)
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, W, D, 1, null);
        if (!F) { s += 8; continue; }
        const v = R();
        // A real mix, not just offices: Madrid apartment blocks, older brick buildings with balconies,
        // terraced houses (adosados), hotels, warehouses and showrooms, car parks, petrol stations.
        const vd = valdebebas(fr.x, fr.z);
        const table = vd
          ? [[0.32, () => midRise(F, R, W, D, 4.2 + 3.1 * (3 + Math.floor(R() * 4)))], [0.5, () => townhouses(F, R, { width: W, depth: D, detail: true })],
             [0.68, () => warehouse(F, R, W, D)], [0.8, () => garage(F, R, W, D)], [0.88, () => petrol(F, R, W, D)], [1, () => office(F, R, W, D, 14 + R() * 20)]]
          : [[0.22, () => office(F, R, W, D, 18 + R() * R() * 50)], [0.44, () => midRise(F, R, W, D, 4.2 + 3.1 * (4 + Math.floor(R() * 4)))],
             [0.62, () => riviera(F, R, { width: W, depth: D, floors: 4 + Math.floor(R() * 3), detail: true, street: true })], [0.72, () => grandHotel(F, R, { width: W, depth: D, floors: 6 + Math.floor(R() * 4), detail: true })],
             [0.82, () => warehouse(F, R, W, D)], [0.92, () => garage(F, R, W, D)], [1, () => petrol(F, R, W, D)]];
        table.find(([p]) => v < p)[1]();
        front++;
        s += W + 2 + R() * 4;
      }
      placed.frontage = front; placed.officeBridges = spans;
      // ---- IFEMA's exhibition halls ----
      let halls = 0;
      const b = terrain.bounds;
      for (let z = b.minZ; z < b.maxZ; z += 110) for (let x = b.minX; x < b.maxX; x += 140) {
        const cx = x + 70, cz = z + 55;
        if (!ifema(cx, cz) || terrain.distSmooth(cx, cz) < 50) continue;
        const F = kit.lot(cx, cz + 45, 0, 1, 110, 84, 4, null);
        if (!F) continue;
        hall(F, R, 110, 84, 1 + halls);
        halls++;
      }
      // ---- offices and hotels round the circuit, the Campo de las Naciones ----
      let offices = 0;
      // Two business parks: the Campo de las Naciones along the climb, and the offices by the last corners.
      const parks = [[ps(6), ps(11)], [ps(50), ps(58)]];
      for (const side of ['L', 'R']) for (let s = 0; s < L.length; s += 34) {
        if (!parks.some(([a, b]) => s > a && s < b)) continue;
        const fr = kit.frontage(s, side, 16 + R() * 26);
        if (valdebebas(fr.x, fr.z)) continue;   // Valdebebas is open land and young parks
        const W = 30 + R() * 24, D = 18 + R() * 10, F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, W, D, 3, null);
        if (!F) continue;
        office(F, R, W, D, 14 + R() * R() * 70);
        offices++;
      }
      // ---- flags on tall poles by the straight, billboards on the motorways ----
      let flags = 0;
      for (let k = 0; k < 18; k++) {
        const fr = kit.frontage(ps(60) + k * 9, 'L', 6), F = frameAt(fr.x, fr.z, 0);
        F.cylinder('metal', 0, 0, 0.1, 0, 12, 6, WHITE);
        F.box('fabric', 0.1, 2.6, 9.4, 11.8, -0.02, 0.02, k % 3 === 0 ? RED : k % 3 === 1 ? YELLOW : rgb(0x2a3a8a));
        flags++;
      }
      const boards = ['MSC CRUISES', 'Estrella Galicia', 'Santander', 'MADRING'];
      let bills = 0;
      for (let s = 120; s < L.length; s += 420) {
        const fr = kit.frontage(s, bills % 2 ? 'L' : 'R', 14);
        if (!kit.isFree(fr.x, fr.z, 3) || kit.overlaps({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 8, hd: 3 })) continue;
        const i = fr.i, F = frameAt(fr.x, fr.z, Math.atan2(L.tx[i], L.tz[i]), terrain.heightAt(fr.x, fr.z));
        const name = boards[bills % boards.length], m = signMaterial((g, W, H) => {
          g.fillStyle = name === 'MSC CRUISES' ? '#1f3f8f' : name === 'Santander' ? '#ec0000' : name === 'MADRING' ? '#16161c' : '#c8102e';
          g.fillRect(0, 0, W, H); letter(g, name, W / 2, H / 2, H * 0.42, name === 'MADRING' ? '#e8303a' : '#ffffff', { max: W * 0.9 });
        }, { W: 1024, H: 384 });
        F.cylinder('metal', 0, 0, 0.6, 0, 12, 10, STEEL);
        F.box('metal', -8.4, 8.4, 11.6, 18.4, -0.5, 0.5, rgb(0x2a2a30));
        placeSign(group, F, 0, 15, 0.52, 16, 6, m); placeSign(group, F, 0, 15, -0.52, 16, 6, m, Math.PI);
        kit.footprints.push({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 8.5, hd: 2 });
        bills++;
      }
      // ---- Valdebebas: the new neighbourhood's mid-rise apartment blocks, set back beyond the circuit ----
      let flats = 0;
      for (let k = 0; k < 500 && flats < 26; k++) {
        const x = b.minX + R() * (b.maxX - b.minX), z = b.minZ + R() * (b.maxZ - b.minZ), d = terrain.distSmooth(x, z);
        if (!valdebebas(x, z) || d < 320 || d > 700) continue;   // the neighbourhood itself is beyond the open land
        const W = 40 + R() * 30, D = 16 + R() * 6, H = 18 + Math.floor(R() * 5) * 3.2;
        const F = kit.lot(x, z, 0, 1, W, D, 6, null);
        if (!F) continue;
        skinGeo(F, R, rect(W, D, 0, -D / 2), 0, H, { ...pick(R, [FACADES.white, FACADES.punched]), bay: 4.2, day: true });
        F.box('stucco', -W / 2 - 0.5, W / 2 + 0.5, H, H + 1, -D - 0.5, 0.5, rgb(0xe8e2d8));
        flats++;
      }
      placed.valdebebas = flats;
      // ---- plane-tree avenues along the IFEMA boulevards and the straight, crowns over the fences ----
      let avenue = 0;
      for (const side of ['L', 'R']) for (let s = 0; s < L.length; s += 7) {
        const fr = kit.frontage(s, side, 2.5 + R() * 3);
        if (!kit.isFree(fr.x, fr.z, 1) || kit.overlaps({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 1, hd: 1 }) || bs.near(fr.x, fr.z, 3)) continue;
        tree(frameAt(fr.x, fr.z, R() * 6.28), R);
        avenue++;
      }
      placed.avenue = avenue;
      // ---- the Cuatro Torres on the skyline to the west ----
      const S = createDaySkyline(), cx0 = b.minX - 1400, cz0 = (b.minZ + b.maxZ) / 2;
      [[0, 250, 'sgBlue'], [70, 249, 'sgGrey'], [140, 236, 'sgTeal'], [210, 224, 'sgDark']].forEach(([dz, H, key]) => {
        const F = frameAt(cx0, cz0 + dz - 100, Math.PI / 2, 0);
        skin(S, F, key, rect(42, 42, 0, -21), 0, H, R);
        F.box('concrete', -22, 22, H, H + 4, -43, 1, rgb(0x8a8a88));
        if (key === 'sgBlue') F.box('stucco', -18, 18, H - 30, H, -40, -2, rgb(0xd8d6d0));     // Torre Cepsa's arch, as a cap
      });
      for (let k = 0; k < 40; k++) {
        const F = frameAt(cx0 + (R() - 0.5) * 900, cz0 + (R() - 0.5) * 2200, R() * 6.28, 0), W = 24 + R() * 20, D = 18 + R() * 14, H = 30 + R() * R() * 90;
        skin(S, F, pick(R, ['sgConc', 'sgGrey', 'sgConc']), rect(W, D, 0, -D / 2), 0, H, R);
      }
      group.add(S.build());
      placed.madring = { bridges, sausages, halls, offices, flags, bills };
    },
    trees: {
      variants: [tree, cypress, stonePine],
      attempts: 26000,
      scale: [1.15, 1, 1.05],
      test(x, z, d, h, R) {
        if (d < 14) return -1;
        if (ifema(x, z)) return R() < 0.18 ? 0 : -1;                        // trees along the fairground's walks
        if (valdebebas(x, z)) return d < 60 && R() < 0.1 ? 0 : -1;         // young street trees only; the rest is open land
        return R() < 0.5 ? (R() < 0.55 ? 0 : R() < 0.5 ? 1 : 2) : -1;
      },
    },
  });
}
