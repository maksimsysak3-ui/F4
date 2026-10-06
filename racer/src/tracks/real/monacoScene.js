import { MeshBasicMaterial } from 'three';
import { MeshBuilder } from '../../car/meshBuilder.js';
import { Frame, rgb, scaleC, pick, PALETTE } from '../street/kit.js';
import { buildRealScene } from './scene.js';
import { riviera, townhouses, grandHotel, casino, villa, cheapBlock } from '../street/buildings.js';
import { palm, stonePine, cypress } from '../street/trees.js';
import { yacht, grandstand } from '../street/props.js';
import { teamHospitality, teamColour } from '../paddock.js';

/*
 * Monte Carlo, handcrafted. The town climbs from the harbour up the mountain:
 * Belle Époque blocks in ochre, rose and cream with shutters and balconies line
 * every street right to the barriers, the taller apartment blocks rise behind,
 * and the modern towers stack up the hillside towards the Tête de Chien. Casino
 * Square has the Casino with its copper roofs, the Hôtel de Paris and the Café
 * de Paris; the road dives into the curving tunnel under the seafront hotel and
 * comes out above the harbour, packed with superyachts. The swimming pool sits
 * by the Piscine section, the Rock with the Prince's Palace rises to the
 * south-west, and the sea lies beyond. Grandstands where the real ones stand.
 */

const RED = rgb(0xce1126), WHITE = rgb(0xf4f2ec), STONE = PALETTE.stone, SEA_Y = 0.2;
const SHIRTS = [RED, WHITE, rgb(0x1b1b1f), rgb(0x2a4a8a), rgb(0xd8c8a0), rgb(0xff7a12), rgb(0x2f6b4a), RED];

const SPONSORS = [
  ['RIVIERA PRIVÉE', '#0e2a5c', '#ffffff', '#c9a24a', 'serif'],
  ['AZUR CHAMPAGNE', '#c9a24a', '#1b1b1f', '#ffffff', 'serif'],
  ['ROCHER WATCHES', '#1f5a3a', '#ffffff', '#c9a24a', 'serif'],
  ['MONTE AIR', '#ce1126', '#ffffff', '#ffffff', 'wave'],
  ['HERCULE YACHTS', '#1e5fa8', '#ffffff', '#f2c200', 'wave'],
  ['CORNICHE FUEL', '#e86a1a', '#ffffff', '#1b1b1f', 'tread'],
  ['GRAND PRIX TV', '#5a2a8a', '#ffffff', '#f2c200', 'stripes'],
  ['LA CONDAMINE', '#2a8aa8', '#ffffff', '#ffffff', 'bolt'],
];

/** Harbour-front grandstand: steel tiers, white canopy, the red and white of Monaco on the back. */
function harbourStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: true, seats: [RED, rgb(0xe8e4dc)] });
  return { ...gs, shirts: SHIRTS };
}

/** Modern hillside tower: stacked balconies with glass rails, a stepped crown. */
function tower(F, r, W, D, floors) {
  const fh = 3.1, H = floors * fh, wall = pick(r, [rgb(0xf2ece0), rgb(0xe8dcc8), rgb(0xd8d4cc), rgb(0xf0e4d0)]);
  F.box('stucco', -W / 2, W / 2, -2, H, -D, 0, wall);
  for (let f = 1; f < floors; f++) {
    const y = f * fh;
    F.box('trim', -W / 2 - 0.2, W / 2 + 0.2, y, y + 0.22, -0.2, 1.4, WHITE); // balcony slab
    F.face(r() < 0.3 ? 'winLit' : 'glass', -W / 2 + 0.6, W / 2 - 0.6, y + 0.3, y + 2.6, 0.02, [1.2, 1.1, 0.9]);
    F.face('glass', -W / 2 - 0.2, W / 2 + 0.2, y + 0.22, y + 1.15, 1.42, null); // glass rail
  }
  F.box('stucco', -W / 2 + 2, W / 2 - 2, H, H + 4, -D + 2, -2, scaleC(wall, 0.9));
}

/** The tunnel's seafront hotel: a long cream block over the road, rows of windows and balconies, a roof terrace. */
function hotelBlock(F, len, floors, r) {
  const fh = 3.2, H = floors * fh, wall = rgb(0xece4d4);
  F.box('stucco', -len / 2, len / 2, 0, H, -16, 16, wall);
  for (const [b, dir] of [[16.02, 1], [-16.02, -1]]) {
    for (let f = 0; f < floors; f++) {
      const y = f * fh + 0.7;
      for (let a = -len / 2 + 1.2; a < len / 2 - 1.5; a += 3.4) F.face(r() < 0.25 ? 'winLit' : 'glass', a, a + 1.7, y, y + 1.9, b, [1.25, 1.12, 0.9], dir);
      if (f % 2 === 0) F.box('trim', -len / 2, len / 2, y - 0.6, y - 0.42, dir > 0 ? 16 : -17.1, dir > 0 ? 17.1 : -16, WHITE);
    }
  }
  F.box('trim', -len / 2 - 0.3, len / 2 + 0.3, H, H + 0.5, -16.3, 16.3, rgb(0xd8ccb4)); // cornice
  for (let a = -len / 2 + 4; a < len / 2 - 3; a += 8) F.cylinder('fabric', a, 8, 1.4, H + 2.2, H + 2.35, 8, r() < 0.5 ? WHITE : RED); // terrace parasols
}

/** The Prince's Palace on the Rock: a long ochre façade, crenellated towers, the flag on top. */
function palace(F) {
  F.box('stucco', -60, 60, 0, 16, -30, 0, rgb(0xe8d4b0));
  F.box('stucco', -64, -52, 0, 26, -34, 0, rgb(0xe0c8a0));
  F.box('stucco', 52, 64, 0, 22, -34, 0, rgb(0xe0c8a0));
  for (let a = -64; a < 64; a += 4) F.box('stucco', a, a + 2, 16, 17.5, -1, 0, rgb(0xe8d4b0));
  for (let a = -56; a < 56; a += 6) F.face('glass', a, a + 2, 6, 10, 0.02, null);
  F.box('metal', -0.1, 0.1, 26, 34, -20, -19.8, rgb(0x8a929e));
  F.box('fabric', 0.1, 4, 31, 32.2, -19.95, -19.85, RED);
  F.box('fabric', 0.1, 4, 29.8, 31, -19.95, -19.85, WHITE);
}

/** The outdoor swimming pool by the harbour (Piscine Rainier III): deck, the blue water, diving board. */
function swimmingPool(F) {
  F.box('concrete', -30, 30, 0, 0.6, -22, 0, rgb(0xe8e4dc));
  F.box('winLit', -25, 25, 0.6, 0.62, -18, -4, [0.25, 0.9, 1.3]);
  for (let a = -24; a < 25; a += 3) F.box('trim', a - 0.05, a + 0.05, 0.62, 0.64, -18, -4, WHITE);
  F.box('metal', 24, 26, 0.6, 3.6, -12, -11, rgb(0x8a929e));
  F.box('trim', 20, 26, 3.4, 3.6, -11.6, -11.4, WHITE);
}

/** Tunnel over the track between two distances: walls, roof, ceiling lamps; the hotel on top. */
function buildTunnel(L, kit, s0, s1) {
  const c0 = L.poseAt(s0, 0), mb = kit.builderAt(c0.x, c0.z); // merged with the scene's other chunks
  const step = 4;
  const pt = (s, side, extra, y) => {
    const i = Math.floor(s / L.ds) % L.N, sg = side === 'L' ? 1 : -1;
    const lat = kit.barrierBack(side, i) + extra;
    const p = L.poseAt(s, sg * lat);
    return [p.x, L.yAt(s / L.ds, sg * Math.min(lat, L.halfW)) + y, p.z];
  };
  const H = 7.2;
  for (let s = s0; s < s1; s += step) {
    const t = Math.min(s1, s + step);
    for (const side of ['L', 'R']) {
      mb.color = rgb(0xb8b4ac);
      const a0 = pt(s, side, 0.15, -0.5), a1 = pt(t, side, 0.15, -0.5), b0 = pt(s, side, 0.75, -0.5), b1 = pt(t, side, 0.75, -0.5);
      mb.hexa('concrete', [a0, a1, b1, b0], [[a0[0], a0[1] + H, a0[2]], [a1[0], a1[1] + H, a1[2]], [b1[0], b1[1] + H, b1[2]], [b0[0], b0[1] + H, b0[2]]]);
    }
    // Roof slab spanning the road, dark underneath, with a row of lamps along the centre.
    const l0 = pt(s, 'L', 0.75, H), l1 = pt(t, 'L', 0.75, H), r0 = pt(s, 'R', 0.75, H), r1 = pt(t, 'R', 0.75, H);
    mb.color = rgb(0x5a5c60);
    mb.hexa('concrete', [l0, l1, r1, r0], [l0, l1, r1, r0].map(([x, y, z]) => [x, y + 1.4, z]));
    if (Math.floor(s / step) % 3 === 0) {
      const c = L.poseAt(s, 0), yc = L.yAt(s / L.ds, 0) + H - 0.05;
      mb.color = [3.2, 3.0, 2.6];
      mb.hexa('neon', [[c.x - 0.4, yc - 0.1, c.z - 0.4], [c.x + 0.4, yc - 0.1, c.z - 0.4], [c.x + 0.4, yc - 0.1, c.z + 0.4], [c.x - 0.4, yc - 0.1, c.z + 0.4]],
        [[c.x - 0.4, yc, c.z - 0.4], [c.x + 0.4, yc, c.z - 0.4], [c.x + 0.4, yc, c.z + 0.4], [c.x - 0.4, yc, c.z + 0.4]]);
    }
  }
  return mb;
}

export function buildMonacoScene(L) {
  let tx0 = Infinity, tx1 = -Infinity, tz0 = Infinity, tz1 = -Infinity;
  for (let i = 0; i < L.N; i++) { tx0 = Math.min(tx0, L.x[i]); tx1 = Math.max(tx1, L.x[i]); tz0 = Math.min(tz0, L.z[i]); tz1 = Math.max(tz1, L.z[i]); }
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  // The coast, traced in image coordinates: along the seafront past the tunnel, round the harbour mouth.
  const COAST = [[1250, 430], [1100, 420], [1040, 440], [960, 515], [850, 545], [700, 520], [630, 470], [600, 700], [-200, 700]];
  const coastY = (px) => {
    for (let k = 0; k < COAST.length - 1; k++) {
      const [x0, y0] = COAST[k], [x1, y1] = COAST[k + 1];
      if ((px <= x0 && px >= x1) || (px >= x0 && px <= x1)) return x0 === x1 ? Math.max(y0, y1) : y0 + ((px - x0) / (x1 - x0)) * (y1 - y0);
    }
    return 700;
  };
  const mpp = 1.0954, [ox, oz] = L.fromImage(0, 0);
  const toImg = (x, z) => [(x - ox) / mpp, (z - oz) / mpp];
  const seaward = (x, z) => { const [px, py] = toImg(x, z); return py - coastY(px); }; // > 0 out at sea (px)
  const coastZ = tz1 + 45;
  const [rockX, rockZ] = L.fromImage(-60, 640);
  const noise = (x, z) => Math.sin(x * 0.011 + 0.7) * Math.cos(z * 0.013 + 0.4) * 0.6 + Math.sin(x * 0.031 - z * 0.023) * 0.4;

  // Port Hercule: open water south of Tabac and the Piscine, west of the chicane, out to the harbour mouth.
  const inside = (x, z) => { let c = false; for (let i = 0, j = L.N - 1; i < L.N; j = i, i += 3) { if ((L.z[i] > z) !== (L.z[j] > z) && x < ((L.x[j] - L.x[i]) * (z - L.z[i])) / (L.z[j] - L.z[i]) + L.x[i]) c = !c; } return c; };
  const dist = (x, z) => { let m = Infinity; for (let i = 0; i < L.N; i += 3) m = Math.min(m, Math.hypot(L.x[i] - x, L.z[i] - z) - Math.max(L.wall.L[i], L.wall.R[i])); return m; };
  const harbour = [];
  // Fill the basin with overlapping discs right up to ~5 m off the quay walls.
  for (let py = 330; py < 720; py += 10) for (let px = 180; px < 660; px += 10) {
    const [x, z] = L.fromImage(px, py);
    if (inside(x, z) || seaward(x, z) > 40) continue;
    const d = dist(x, z);
    if (d < 11 || harbour.some((h) => Math.hypot(x - h.x, z - h.z) < h.r * 0.75)) continue;
    harbour.push({ x, z, r: Math.min(60, d - 5), y: SEA_Y, margin: 5, depth: 16, colour: 0x1e5a72 });
  }
  // The open sea: discs strung along the coast, each kept off the road by the water clamp.
  const sea = [];
  for (let px = -400; px <= 1500; px += 140) {
    const R = 420, [x, z] = L.fromImage(px, coastY(Math.min(1250, Math.max(-200, px))) + R);
    sea.push({ x, z, r: R * mpp, y: SEA_Y, margin: 8, depth: 16, colour: 0x1e5a7a });
  }
  const wetAt = (x, z) => [...harbour, ...sea].some((w) => Math.hypot(x - w.x, z - w.z) < w.r + 4);

  return buildRealScene(L, {
    name: 'Monaco',
    trackside: { stands: false, suburb: 0 },
    seed: 1929,
    margin: 650,
    pitTheme: {
      wall: rgb(0xe8e4dc),
      upper(F, hw, i, rc, { H1, DEPTH }) {
        const top = H1 + 3.2;
        F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -1.0, rgb(0xf2efe8));
        F.face(i % 3 === 0 ? 'winLit' : 'glass', -hw + 0.3, hw - 0.3, H1 + 0.4, top - 0.4, -0.98, [1.2, 1.1, 0.9]);
        F.box('trim', -hw, hw, top, top + 0.3, -DEPTH, 1.4, RED);
        if (rc) F.box('stucco', -hw + 0.5, hw - 0.5, top + 0.3, top + 4, -DEPTH + 1, -1.2, WHITE);
      },
    },
    style: {
      kerb: [rgb(0xf2f1ec), rgb(0xce1126)],
      runoff: 'brand', runoffFloor: [0.09, 0.09, 0.095],
      barrier: 'armco', fence: true, lamps: 'street', verge: 'paving',
      sponsors: SPONSORS,
      zoneBrands: ['RIVIERA PRIVÉE', 'MONTE AIR', 'HERCULE YACHTS', 'AZUR CHAMPAGNE', 'LA CONDAMINE', 'ROCHER WATCHES'],
      primeBrands: ['RIVIERA PRIVÉE', 'ROCHER WATCHES'],
      title: ['MONACO', 'GRAND PRIX DE MONACO', '#ce1126', '#ffffff', '#c9a24a'],
      bridges: [['ROCHER WATCHES', 'TIME, PERFECTED', '#1f5a3a', '#ffffff', '#c9a24a'], ['AZUR CHAMPAGNE', 'CELEBRATE', '#c9a24a', '#1b1b1f', '#ffffff']],
      roadName: 'MONACO',
      bannerGlow: 0.15,
      boardBorder: '#ce1126',
    },
    fascia: ['MONACO', 'GRAND PRIX DE MONACO'],
    fasciaColours: ['#ce1126', '#ffffff', '#c9a24a'],
    skirtColour: [0.46, 0.5, 0.36],
    groundKind: 'grass',
    // The town climbs the mountain to the north; the Rock rises in the south-west; the sea floor falls away.
    relief(x, z, d) {
      const inland = -seaward(x, z) * mpp; // metres from the coast, + inland
      const up = Math.pow(Math.min(1, Math.max(0, (inland - 120) / 1500)), 1.25) * 170;
      const rock = 55 * Math.exp(-((x - rockX) ** 2 + (z - rockZ) ** 2) / (150 * 150));
      const sea = inland < 0 ? -Math.min(12, -inland * 0.25) : 0;
      return (up + rock + noise(x, z) * 8) * smooth(20, 160, d) + sea * smooth(8, 30, d);
    },
    colourAt(x, z, h, slope, d) {
      const garden = [0.36, 0.5, 0.26], scrub = [0.5, 0.52, 0.34], rock = [0.66, 0.6, 0.5], town = [0.62, 0.58, 0.52];
      if (seaward(x, z) > -6) return [0.72, 0.68, 0.58]; // the shore
      let c = d < 300 ? town : (h > 140 ? rock : scrub);
      if (noise(x * 3, z * 3) > 0.3) c = c.map((v, k) => v + (garden[k] - v) * 0.7);
      if (slope > 0.5) {
        // Steep banks in town are dressed-stone retaining walls, coursed every metre and a half.
        const wall = d < 300 ? [0.74, 0.66, 0.52] : rock, course = Math.abs((h / 1.5) % 1 - 0.5) < 0.06 ? 0.82 : 1;
        c = c.map((v, k) => (v + (wall[k] - v) * 0.8) * course);
      }
      return c;
    },
    water: [...harbour, ...sea],
    stands: [
      { at: 0, side: 'L', W: 90, tiers: 12, build: harbourStand, offset: 40 }, // the start straight
      { at: 5, side: 'outside', W: 40, tiers: 10, build: harbourStand }, // Sainte Dévote
      { at: 48, side: 'R', W: 70, tiers: 12, build: harbourStand }, // Tabac, on the harbour
      { at: 52, side: 'R', W: 60, tiers: 12, build: harbourStand }, // Piscine
      { at: 58, side: 'R', W: 50, tiers: 10, build: harbourStand }, // Piscine exit
      { at: 64, side: 'outside', W: 50, tiers: 10, build: harbourStand }, // Rascasse
    ],
    landmarks({ L, R, frameAt, kit, terrain, group, placed }) {
      const lotOn = (s, side, extra, W, D, margin = 0.8) => {
        const fr = kit.frontage(((s % L.length) + L.length) % L.length, side, extra);
        return kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, W, D, margin, (x, z) => !wetAt(x, z) && seaward(x, z) < -3);
      };
      const ps = (k) => L.pointS(k);
      // ---- the tunnel and the hotel over it ----
      const t0 = ps(37) - 20, t1 = ps(40) + 30;
      buildTunnel(L, kit, t0, t1);
      for (let s = t0 + 20; s < t1 - 15; s += 42) {
        const fr = kit.frontage(s, 'R', -4.6), y = L.yAt(s / L.ds, 0) + 8.6;
        hotelBlock(new Frame(kit.builderAt(fr.x, fr.z), fr.x - fr.dirX * 4, y, fr.z - fr.dirZ * 4, fr.dirZ, -fr.dirX), 44, 7, R);
        kit.footprints.push({ cx: fr.x, cz: fr.z, ux: fr.dirZ, uz: -fr.dirX, hw: 23, hd: 24 });
      }
      placed.tunnel = Math.round(t1 - t0);
      // ---- Casino Square: the Casino on the outside, the Hôtel de Paris across, the Café de Paris ----
      const ci = Math.floor(ps(17) / L.ds), cout = L.k[ci] > 0 ? 'R' : 'L', cin = cout === 'L' ? 'R' : 'L';
      const C = lotOn(ps(17), cout, 6, 60, 46, 0.5);
      if (C) { casino(C, R, { width: 60, depth: 46, floors: 3, detail: true }); placed.casino = 1; }
      const HP = lotOn(ps(15), cin, 2, 64, 26, 0.5);
      if (HP) { grandHotel(HP, R, { width: 64, depth: 26, floors: 6, detail: true }); placed.hotelDeParis = 1; }
      const CP = lotOn(ps(19), cout, 2, 30, 18, 0.5);
      if (CP) { riviera(CP, R, { width: 30, depth: 18, floors: 3, detail: true, street: true }); placed.cafe = 1; }
      // ---- the town along every street: Belle Époque blocks, apartments behind, towers up the hill ----
      let blocks = 0, towers = 0;
      // No buildings on the harbour quays (left, chicane to Rascasse) or by the pits (right of the straight).
      const harbourSide = (s, side) => (side === 'L' && s > ps(43) && s < ps(67)) || (side === 'R' && (s > ps(66) || s < ps(4)));
      for (const side of ['L', 'R']) {
        for (let s = 0; s < L.length; s += 6) {
          if (s > t0 - 10 && s < t1 + 5) continue; // the tunnel has the hotel over it
          if (harbourSide(s, side)) continue;
          const W = 14 + Math.floor(R() * 4) * 3, D = 14 + R() * 6;
          const F = lotOn(s, side, 0.6, W, D);
          if (!F) continue;
          const v = R();
          if (v < 0.5) riviera(F, R, { width: W, depth: D, floors: 4 + Math.floor(R() * 4), detail: true, street: R() < 0.4 });
          else if (v < 0.8) townhouses(F, R, { width: W, depth: D, floors: 4 + Math.floor(R() * 3), detail: true, street: R() < 0.4 });
          else grandHotel(F, R, { width: W, depth: D, floors: 5 + Math.floor(R() * 3), detail: true });
          blocks++;
          s += W - 6;
          // A taller block behind, and up the hill a tower.
          const B = lotOn(s, side, D + 6, W, 16, 1);
          if (B) { riviera(B, R, { width: W, depth: 16, floors: 7 + Math.floor(R() * 5), detail: false }); blocks++; }
          if (side === (L.k[Math.floor(s / L.ds) % L.N] > 0 ? 'R' : 'L') || R() < 0.4) {
            const T = lotOn(s, side, D + 30, 20, 18, 2);
            if (T) { tower(T, R, 20, 18, 10 + Math.floor(R() * 14)); towers++; }
          }
        }
      }
      // ---- the rest of the town: every free plot from the harbour to the top of the hill ----
      // Monte Carlo has no open ground: blocks fill every terrace between the streets, facing the
      // nearest road down by the circuit and turning to face the sea further up the slope.
      const plotFree = (px, pz) => !wetAt(px, pz) && seaward(px, pz) < -3;
      const STEP = 21;
      for (let gz = tz0 - 760; gz < tz1 + 140; gz += STEP) {
        for (let gx = tx0 - 560; gx < tx1 + 560; gx += STEP) {
          const x = gx + (R() - 0.5) * 9, z = gz + (R() - 0.5) * 9;
          if (seaward(x, z) > -10 || wetAt(x, z)) continue;
          const d = terrain.distSmooth(x, z);
          if (d < 9) continue;
          const inland = -seaward(x, z) * mpp, onRock = Math.hypot(x - rockX, z - rockZ);
          if (onRock < 70) continue; // the Palace square
          if (inland > 900 && R() < 0.55) continue; // thinning out towards the ridge
          let dirX, dirZ;
          const n = d < 140 ? L.nearest(x, z) : null;
          if (n) { const sg = n.lateral > 0 ? 1 : -1; dirX = -L.nx[n.i] * sg; dirZ = -L.nz[n.i] * sg; }
          else {
            const gxh = terrain.heightAt(x + 6, z) - terrain.heightAt(x - 6, z), gzh = terrain.heightAt(x, z + 6) - terrain.heightAt(x, z - 6);
            const gl = Math.hypot(gxh, gzh);
            if (gl > 0.4) { dirX = -gxh / gl; dirZ = -gzh / gl; } else { dirX = 0; dirZ = 1; } // downhill, to the sea
          }
          const small = onRock < 220 || inland > 700;
          const W = small ? 10 + R() * 8 : 13 + R() * 12, D = small ? 10 + R() * 6 : 12 + R() * 8;
          const F = kit.lot(x + dirX * D / 2, z + dirZ * D / 2, dirX, dirZ, W, D, 1.5, plotFree);
          if (!F) continue;
          const v = R(), close = d < 90;
          if (!close) {
            // Out of the circuit's close-up view: cheap blocks and towers.
            if (onRock < 220) cheapBlock(F, R, W, D, 3 + Math.floor(R() * 2));
            else if (inland > 700) cheapBlock(F, R, W, D, 2 + Math.floor(R() * 3));
            else if (v < (d < 300 ? 0.75 : 0.5)) cheapBlock(F, R, W, D, 5 + Math.floor(R() * 6));
            else { tower(F, R, W, D, 10 + Math.floor(R() * 20)); towers++; blocks--; }
          } else if (onRock < 220) townhouses(F, R, { width: W, depth: D, floors: 3, detail: true, street: R() < 0.3 }); // Monaco-Ville
          else if (v < 0.45) riviera(F, R, { width: W, depth: D, floors: 5 + Math.floor(R() * 5), detail: true, street: R() < 0.4 });
          else if (v < 0.75) townhouses(F, R, { width: W, depth: D, floors: 4, detail: true, street: R() < 0.4 });
          else grandHotel(F, R, { width: W, depth: D, floors: 6 + Math.floor(R() * 4), detail: true });
          blocks++;
        }
      }
      // Banks between two levels of the lap (Beau Rivage above the chicane, the hairpin above the tunnel):
      // narrow blocks built up against the slope from the lower road, their roofs level with the upper one.
      for (let gz = tz0 - 60; gz < tz1 + 60; gz += 9) {
        for (let gx = tx0 - 60; gx < tx1 + 60; gx += 9) {
          const x = gx + (R() - 0.5) * 3, z = gz + (R() - 0.5) * 3;
          const d = terrain.distSmooth(x, z);
          if (d < 6 || d > 45 || wetAt(x, z) || seaward(x, z) > -3) continue;
          const hx = terrain.heightAt(x + 5, z) - terrain.heightAt(x - 5, z), hz = terrain.heightAt(x, z + 5) - terrain.heightAt(x, z - 5);
          const g = Math.hypot(hx, hz);
          if (g < 2.5) continue; // only the steep banks
          const dirX = -hx / g, dirZ = -hz / g, W = 8 + R() * 5, D = 6 + R() * 2;
          const F = kit.lot(x + dirX * D / 2, z + dirZ * D / 2, dirX, dirZ, W, D, 0.4, plotFree);
          if (!F) continue;
          const top = terrain.heightAt(x - dirX * D, z - dirZ * D) - F.o[1];
          cheapBlock(F, R, W, D, Math.max(2, Math.ceil((top + 4) / 3.1)));
          blocks++;
        }
      }
      placed.town = { blocks, towers };
      // ---- the harbour: superyachts moored along the quays and out in the basin ----
      let yachts = 0;
      const moored = [];
      const afloat = (x, z, pad) => harbour.some((w) => Math.hypot(x - w.x, z - w.z) < w.r - pad);
      for (let k = 0; k < 4000 && yachts < 140; k++) {
        const h = harbour[Math.floor(R() * harbour.length)];
        const t = R() * Math.PI * 2, rr = h.r * Math.sqrt(R());
        const x = h.x + Math.cos(t) * rr, z = h.z + Math.sin(t) * rr;
        const len = 16 + R() * R() * 42, yaw = R() < 0.7 ? 0.35 : R() * 6.28; // most lie in rows, bows to the quay
        const ex = Math.cos(yaw) * len * 0.5, ez = -Math.sin(yaw) * len * 0.5;
        if (!afloat(x, z, 3) || !afloat(x + ex, z + ez, 2) || !afloat(x - ex, z - ez, 2)) continue;
        if (moored.some(([mx, mz, ml]) => Math.hypot(x - mx, z - mz) < (ml + len) * 0.32 + 4)) continue;
        moored.push([x, z, len]);
        yacht(frameAt(x, z, yaw, SEA_Y), R, len);
        yachts++;
      }
      placed.yachts = yachts;
      placed.harbour = harbour.map((h) => [Math.round(h.x), Math.round(h.z), Math.round(h.r)]);
      // ---- the paddock on the quay: team hospitality behind the pits ----
      let teams = 0;
      for (let s = -150; s < 40 && teams < 10; s += 24) {
        const F = lotOn(s, 'R', 1, 22, 13, 0.5);
        if (F) { teamHospitality(F, R, teamColour(teams), 22, 13); teams++; }
      }
      placed.paddock = teams;
      // ---- the swimming pool by the Piscine section, the Palace on the Rock ----
      const P = lotOn(ps(53), 'R', 3, 62, 24, 1);
      if (P) { swimmingPool(P); placed.pool = 1; }
      palace(frameAt(rockX, rockZ, 0.3, terrain.heightAt(rockX, rockZ) - 1));
      // Spectators on the balconies and terraces of the hillside above Beau Rivage.
      const fans = [];
      for (let k = 0; k < 500; k++) {
        const s = ps(5) + R() * (ps(13) - ps(5));
        const fr = kit.frontage(s, 'L', -3.5 + R() * 1.2);
        if (!kit.isFree(fr.x, fr.z, 0.2) || kit.overlaps({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 0.4, hd: 0.4 })) continue;
        fans.push({ p: [fr.x, terrain.heightAt(fr.x, fr.z) + 0.1, fr.z], yaw: Math.atan2(-fr.dirX, -fr.dirZ) + Math.PI + (R() - 0.5) * 0.6, seated: false, cheer: R() < 0.3 ? 0.6 : 0 });
      }
      kit.addCrowd(fans, 9300);
      placed.fans = fans.length;
    },
    trees: {
      variants: [palm, stonePine, cypress],
      attempts: 9000,
      scale: [1, 1, 1],
      test(x, z, d, h, R) {
        if (d < 14 || seaward(x, z) > -8 || wetAt(x, z)) return -1;
        const v = R();
        if (d < 120) return v < 0.35 ? 0 : v < 0.5 ? 2 : -1; // palms and cypresses along the streets
        return v < 0.25 ? 1 : v < 0.35 ? 2 : v < 0.4 ? 0 : -1; // stone pines on the hillside
      },
    },
  });
}
