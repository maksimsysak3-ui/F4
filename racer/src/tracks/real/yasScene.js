import { rgb, scaleC, pick } from '../street/kit.js';
import { buildRealScene } from './scene.js';
import { cheapBlock } from '../street/buildings.js';
import { palm } from '../street/trees.js';
import { grandstand, yacht } from '../street/props.js';
import { floodMast, beam } from '../night/venue.js';

/*
 * Yas Marina, handcrafted for the night. The Yas hotel straddles the track on
 * two white towers joined by a bridge, wrapped in its gridshell of glowing
 * diamond panels; the marina below is full of lit superyachts. White
 * grandstands with mashrabiya lattice screens and tensile sail roofs, the
 * floodlight towers that turn night into day, a red theme-park roof the size
 * of a town to the north, palms on the sand, and the towers of Abu Dhabi
 * glittering across the water.
 */

const WHITE = rgb(0xf4f4f0), SAND = rgb(0xd8c49a), STEEL = rgb(0x8a929e);
const CYAN = [0.5, 2.6, 3.2], MAGENTA = [3.0, 0.6, 2.4], BLUE = [0.6, 1.0, 3.2], GOLD = [3.0, 2.0, 0.8];
const SHIRTS = [rgb(0x00732f), WHITE, rgb(0xd8242b), rgb(0x1b1b1f), rgb(0xff8000), rgb(0x00a19b), rgb(0x2a4a8a), rgb(0xf2c200)];

const SPONSORS = [
  ['FALCON AIRWAYS', '#8a1a3a', '#ffffff', '#d8b04a', 'serif'],
  ['DUNE ENERGY', '#e8a030', '#141416', '#141416', 'stripes'],
  ['YAS TELECOM', '#00a19b', '#ffffff', '#ffffff', 'wave'],
  ['PEARL BANK', '#f2ead8', '#1b2a4a', '#d8b04a', 'serif'],
  ['OASIS COLA', '#d8242b', '#ffffff', '#ffd23f', 'wave'],
  ['MIRAGE TYRES', '#141416', '#7df9ff', '#7df9ff', 'tread'],
  ['NEON GULF', '#3a1a7a', '#7df9ff', '#ff3fd1', 'bolt'],
  ['SAADIYAT WATCHES', '#1b1b1f', '#d8b04a', '#d8b04a', 'serif'],
];

/** Grandstand in the Yas style: white frame, a mashrabiya lattice screen behind, a sail roof, LED fascia. */
function yasStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: false, seats: [rgb(0xd8242b), rgb(0x00732f), WHITE] });
  const depth = tiers * 0.85 + 2, top = 1.2 + tiers * 0.6;
  // Lattice screen: a diamond grid of white struts, lit from behind.
  F.box('stucco', -W / 2, W / 2, 0, top + 6, -depth - 0.8, -depth - 0.5, rgb(0x2a2440));
  for (let a = -W / 2; a < W / 2 - 1; a += 2.4) {
    for (let y = 0.6; y < top + 5; y += 2.4) {
      beam(F, 'trim', [a, y, -depth - 0.45], [a + 1.2, y + 1.2, -depth - 0.45], 0.14, WHITE);
      beam(F, 'trim', [a + 1.2, y + 1.2, -depth - 0.45], [a + 2.4, y, -depth - 0.45], 0.14, WHITE);
      F.face('neon', a + 0.9, a + 1.5, y + 0.3, y + 0.9, -depth - 0.49, scaleC(r() < 0.5 ? CYAN : MAGENTA, 0.35));
    }
  }
  // Sail roof: white triangles on masts at the back, peaks alternating.
  for (let a = -W / 2; a < W / 2 - 0.1; a += 12) {
    F.box('metal', a - 0.15, a + 0.15, 0, top + 12, -depth - 0.2, -depth + 0.1, WHITE);
    const p0 = F.at(a, top + 12, -depth), p1 = F.at(Math.min(W / 2, a + 12), top + 7, -depth), p2 = F.at(a + 6, top + 8.5, 3);
    F.mb.color = WHITE;
    F.mb.triFacing('fabric', p0, p1, p2, [0, 1, 0]);
    F.mb.triFacing('fabric', p0, p2, p1, [0, -1, 0]);
  }
  F.box('neon', -W / 2, W / 2, 1.0, 1.15, 0.13, 0.2, CYAN); // LED line along the front
  return { ...gs, shirts: SHIRTS };
}

/** A tall modern tower: textured glass, a lit crown, the odd LED outline. */
function gulfTower(F, r, W, D, floors) {
  cheapBlock(F, r, W, D, floors, { wall: pick(r, [rgb(0xb8c8d8), rgb(0xd8d0c0), rgb(0xa8c0d0), rgb(0xe8e0d0)]), style: r() < 0.7 ? 'glass' : 'stucco' });
  const H = 3.4 + floors * 3.1;
  if (r() < 0.6) {
    const c = pick(r, [CYAN, MAGENTA, BLUE, GOLD]);
    for (const [a0, a1, b0, b1] of [[-W / 2 - 0.1, -W / 2 + 0.2, -D, 0], [W / 2 - 0.2, W / 2 + 0.1, -D, 0]]) F.box('neon', a0, a1, 3.4, H + 0.4, b0 - 0.1, b0 + 0.2, c);
    F.box('neon', -W / 2, W / 2, H + 0.4, H + 0.9, -D, 0.1, c);
  }
}

/** The Aldar headquarters: the giant round disc standing on its edge. */
function discTower(F) {
  const R = 55, n = 28;
  for (let k = 0; k < n; k++) {
    const t0 = (k / n) * Math.PI * 2, t1 = ((k + 1) / n) * Math.PI * 2;
    const q = (t) => [Math.cos(t) * R, R + 4 + Math.sin(t) * R];
    const [a0, y0] = q(t0), [a1, y1] = q(t1);
    F.mb.color = null;
    for (const b of [-12, 12]) {
      const p = [F.at(0, R + 4, b), F.at(a0, y0, b), F.at(a1, y1, b)];
      F.mb.triFacing('glass', p[0], p[1], p[2], [0, 0, b > 0 ? 1 : -1].map((v, i) => (i === 2 ? v : 0)));
    }
    F.mb.color = WHITE;
    const e = [F.at(a0, y0, -12), F.at(a1, y1, -12), F.at(a1, y1, 12), F.at(a0, y0, 12)];
    F.mb.quad('trim', e[0], e[1], e[2], e[3]);
    beam(F, 'neon', [a0 * 0.98, y0, 12.1], [a1 * 0.98, y1, 12.1], 0.3, scaleC(GOLD, 0.6));
  }
}

/** The theme park's vast red roof: a low, three-lobed shell with a white rim. */
function redRoof(F) {
  const n = 30;
  for (let k = 0; k < n; k++) {
    const t0 = (k / n) * Math.PI * 2, t1 = ((k + 1) / n) * Math.PI * 2;
    const R = (t) => 170 * (1 + 0.22 * Math.cos(3 * t));
    for (let ring = 0; ring < 4; ring++) {
      const r0 = ring / 4, r1 = (ring + 1) / 4, h = (u) => 34 * (1 - u * u);
      const P = (t, u) => [Math.cos(t) * R(t) * u, h(u), Math.sin(t) * R(t) * u];
      const a = P(t0, r0), b = P(t1, r0), c = P(t1, r1), d = P(t0, r1);
      F.mb.color = ring === 3 ? WHITE : rgb(0xc8102e);
      F.mb.triFacing('roof', F.at(a[0], a[1], a[2]), F.at(b[0], b[1], b[2]), F.at(c[0], c[1], c[2]), [0, 1, 0]);
      F.mb.triFacing('roof', F.at(a[0], a[1], a[2]), F.at(c[0], c[1], c[2]), F.at(d[0], d[1], d[2]), [0, 1, 0]);
    }
  }
  F.cylinder('stucco', 0, 0, 160, 0, 3, 30, rgb(0x3a3440));
}

/** A white mosque on the horizon: a big central dome, smaller domes, four minarets, lit. */
function mosque(F) {
  F.box('stucco', -60, 60, 0, 14, -60, 60, WHITE);
  F.cylinder('stucco', 0, 0, 20, 14, 26, 16, WHITE);
  for (let k = 0; k < 6; k++) F.cylinder('stucco', 0, 0, 20 * (1 - k * 0.16), 26 + k * 3, 29 + k * 3, 16, WHITE);
  for (const [a, b] of [[-40, -40], [40, -40], [40, 40], [-40, 40]]) {
    F.cylinder('stucco', a * 1.4, b * 1.4, 3, 0, 90, 10, WHITE);
    F.cylinder('neon', a * 1.4, b * 1.4, 3.2, 70, 72, 10, GOLD);
  }
  F.box('neon', -60, 60, 13.6, 14.2, 60.1, 60.4, scaleC(GOLD, 0.5));
}

export function buildYasScene(L) {
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const noise = (x, z) => Math.sin(x * 0.013 + 0.3) * Math.cos(z * 0.011 + 0.8) * 0.6 + Math.sin(x * 0.033 - z * 0.027) * 0.4;
  const img = (px, py) => L.fromImage(px, py);
  // The marina south of the marina section, and the channel to the open water beyond.
  const marina = [];
  for (const [px, py, r] of [[200, 520, 70], [300, 545, 80], [400, 560, 70], [140, 600, 90], [260, 640, 110], [420, 650, 100], [560, 690, 90]]) {
    const [x, z] = img(px, py);
    marina.push({ x, z, r: r * 1.6176, y: 0.4, margin: 10, depth: 6, colour: 0x0e2a4a });
  }
  const sea = [];
  for (let px = -500; px <= 1500; px += 200) { const [x, z] = img(px, 980); sea.push({ x, z, r: 700, y: 0.4, margin: 30, depth: 10, colour: 0x0a1e3a }); }
  const water = [...marina, ...sea];
  const wetAt = (x, z, pad = 0) => water.some((w) => Math.hypot(x - w.x, z - w.z) < w.r + pad);

  return buildRealScene(L, {
    name: 'Yas Marina',
    seed: 2009,
    margin: 700,
    windowGlow: 1.2,
    trackside: { stands: true, standBuild: yasStand, suburb: 0, hoardingSpacing: 110, skyline: { count: 380, tall: 190, dir: 3.6, spread: 1.6, depth: 1400, colours: [rgb(0x8aa0c0), rgb(0xa8b8d0), rgb(0xc8c0b0)] } },
    pitTheme: {
      wall: rgb(0xeeeeea),
      upper(F, hw, i, rc, { H1, DEPTH }) {
        const top = H1 + 4;
        F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -1.0, WHITE);
        F.face(i % 2 ? 'winLit' : 'glass', -hw + 0.2, hw - 0.2, H1 + 0.4, top - 0.4, -0.98, [0.9, 1.15, 1.3]);
        F.box('neon', -hw, hw, top, top + 0.25, -DEPTH, 0.9, CYAN);
        F.box('roof', -hw, hw, top + 0.25, top + 0.7, -DEPTH, 1.6, WHITE);
        if (rc) F.box('stucco', -hw + 0.6, hw - 0.6, top + 0.7, top + 6, -DEPTH + 1, -1.2, WHITE);
      },
    },
    style: {
      kerb: [rgb(0xf2f1ec), rgb(0xd8242b)],
      runoff: 'brand', runoffFloor: [0.08, 0.08, 0.09],
      barrier: 'slab', slab: [rgb(0xe8e8ec), rgb(0x1c1c22), [0.6, 2.4, 3.0]],
      fence: true, lamps: 'flood', verge: 'paving',
      sponsors: SPONSORS,
      zoneBrands: ['FALCON AIRWAYS', 'DUNE ENERGY', 'YAS TELECOM', 'OASIS COLA', 'NEON GULF'],
      primeBrands: ['PEARL BANK', 'SAADIYAT WATCHES'],
      title: ['ABU DHABI', 'ABU DHABI GRAND PRIX', '#0a0a1a', '#ffffff', '#7df9ff'],
      bridges: [['FALCON AIRWAYS', 'FLY BEYOND', '#8a1a3a', '#ffffff', '#d8b04a'], ['NEON GULF', 'THE NIGHT IS OURS', '#3a1a7a', '#7df9ff', '#ff3fd1']],
      roadName: 'YAS MARINA',
      bannerGlow: 0.55,
      boardBorder: '#7df9ff',
    },
    fascia: ['ABU DHABI', 'ABU DHABI GRAND PRIX'],
    fasciaColours: ['#0a0a1a', '#ffffff', '#7df9ff'],
    skirtColour: [0.42, 0.38, 0.32],
    groundKind: 'sand',
    relief(x, z, d) {
      return (noise(x * 0.6, z * 0.6) * 4) * smooth(60, 300, d);
    },
    colourAt(x, z, h, slope, d) {
      const sand = [0.62, 0.55, 0.42], lawn = [0.3, 0.46, 0.24], pave = [0.5, 0.5, 0.52];
      if (wetAt(x, z, 6)) return [0.7, 0.68, 0.62];
      if (d < 70) return noise(x * 3, z * 3) > 0.2 ? lawn : pave;
      return noise(x * 1.5, z * 1.5) > 0.45 ? lawn : sand;
    },
    water,
    stands: [
      { at: 0, side: 'L', W: 170, tiers: 16, build: yasStand, offset: -60 }, // main grandstand, opposite the pits
      { at: 4, side: 'outside', W: 90, tiers: 14, build: yasStand },        // T1
      { at: 17, side: 'outside', W: 90, tiers: 14, build: yasStand },       // the hairpin
      { at: 19, side: 'R', W: 120, tiers: 14, build: yasStand },            // the back straight
      { at: 23, side: 'outside', W: 80, tiers: 12, build: yasStand },       // the chicane
      { at: 33, side: 'outside', W: 90, tiers: 14, build: yasStand },       // T9
      { at: 45, side: 'L', W: 70, tiers: 12, build: yasStand },             // the marina
    ],
    landmarks({ L, R, frameAt, kit, terrain, placed }) {
      const ps = (k) => L.pointS(k);
      const dry = (x, z) => !wetAt(x, z, 6);
      // ---- the Yas hotel: two towers either side of the track, a bridge, the gridshell over all ----
      const hs = (ps(53) + ps(55)) / 2, hi = Math.floor(hs / L.ds) % L.N;
      let hotel = 0;
      for (const side of ['L', 'R']) {
        const fr = kit.frontage(hs, side, 1.5);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 90, 24, 0.5, null);
        if (!F) continue;
        cheapBlock(F, R, 90, 24, 11, { wall: WHITE, style: 'glass', flat: true });
        hotel++;
      }
      const cx = L.x[hi], cz = L.z[hi], ry = L.yAt(hi, 0);
      const H = frameAt(cx, cz, Math.atan2(L.tz[hi], L.tx[hi]) * -1, ry);
      // Frame axes: a along the track, b across it.
      const wa = L.wall.L[hi] + 25, wb = L.wall.R[hi] + 25;
      H.box('stucco', -12, 12, 16, 22, -wb, wa, WHITE); // the bridge
      H.face('winLit', -11, 11, 17, 21, wa + 0.02, [1, 1.1, 1.3]);
      // Gridshell: arches across the track and ribs along it, a diamond lattice of LED panels.
      const shell = (a, u) => { const span = (wa + wb) / 2 + 26, b = -wb - 26 + u * (2 * span); return [a, 30 + 28 * Math.sin(u * Math.PI) * (1 - (a / 120) ** 2), b]; }; // a swelling, blob-like shell
      for (let a = -78; a <= 78; a += 6) for (let k = 0; k < 14; k++) {
        const p = shell(a, k / 14), q = shell(a + 6, (k + 1) / 14), q2 = shell(a + 6, k / 14);
        beam(H, 'trim', p, q, 0.35, WHITE);
        beam(H, 'neon', p, q2, 0.22, (Math.floor(a / 6) + k) % 3 === 0 ? MAGENTA : (Math.floor(a / 6) + k) % 3 === 1 ? CYAN : BLUE);
      }
      placed.yasHotel = hotel;
      // ---- superyachts in the marina, lit ----
      let yachts = 0;
      const moored = [];
      for (let k = 0; k < 3000 && yachts < 90; k++) {
        const m = marina[Math.floor(R() * marina.length)], t = R() * 6.28, rr = m.r * Math.sqrt(R()) * 0.9;
        const x = m.x + Math.cos(t) * rr, z = m.z + Math.sin(t) * rr, len = 18 + R() * R() * 50, yaw = 0.2 + (R() < 0.7 ? 0 : R() * 3);
        if (!marina.some((w) => Math.hypot(x - w.x, z - w.z) < w.r - len * 0.6) || moored.some(([mx, mz, ml]) => Math.hypot(x - mx, z - mz) < (ml + len) * 0.35 + 3)) continue;
        moored.push([x, z, len]);
        const F = frameAt(x, z, yaw, 0.4);
        yacht(F, R, len);
        F.box('neon', -len * 0.4, len * 0.4, 0.9, 1.05, -len * 0.13 - 0.02, len * 0.13 + 0.02, pick(R, [CYAN, BLUE, MAGENTA, GOLD]).map((v) => v * 0.5));
        yachts++;
      }
      placed.yachts = yachts;
      // ---- floodlight towers round the lap, behind the fences ----
      let masts = 0;
      for (let s = 30; s < L.length; s += 120) {
        const i = Math.floor(s / L.ds) % L.N, side = L.k[i] > 0 ? 'R' : 'L';
        const fr = kit.frontage(s, side, 6);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 5, 5, 0.5, dry);
        if (F) { floodMast(F, R, 34 + R() * 8); masts++; }
      }
      placed.masts = masts;
      // ---- the theme park's red roof to the north, the disc tower, the mosque, the city ----
      const [fx, fz] = img(560, -260);
      redRoof(frameAt(fx, fz, 0.3, terrain.heightAt(fx, fz) - 0.5));
      kit.footprints.push({ cx: fx, cz: fz, ux: 1, uz: 0, hw: 220, hd: 220 });
      const [dx, dz] = img(1250, 200);
      discTower(frameAt(dx, dz, 1.2, terrain.heightAt(dx, dz)));
      kit.footprints.push({ cx: dx, cz: dz, ux: 1, uz: 0, hw: 60, hd: 30 });
      const [mx, mz] = img(-420, 760);
      mosque(frameAt(mx, mz, 0.2, terrain.heightAt(mx, mz)));
      // Hotels, the mall and apartment towers on the island, lit up.
      let towers = 0;
      const b = terrain.bounds;
      for (let z = b.minZ + 40; z < b.maxZ - 40; z += 34) for (let x = b.minX + 40; x < b.maxX - 40; x += 34) {
        const px = x + (R() - 0.5) * 12, pz = z + (R() - 0.5) * 12, d = terrain.distSmooth(px, pz);
        if (d < 60 || d > 650 || !dry(px, pz) || R() < (d < 200 ? 0.55 : 0.35)) continue;
        const W = 18 + R() * 20, D = 16 + R() * 16;
        const F = kit.lot(px, pz, 0, 1, W, D, 4, dry);
        if (!F) continue;
        gulfTower(F, R, W, D, d < 200 ? 4 + Math.floor(R() * 8) : 8 + Math.floor(R() * 30));
        towers++;
      }
      placed.towers = towers;
      // Palms everywhere: along the walls, on the promenades, round the marina.
      let palms = 0;
      for (const side of ['L', 'R']) for (let s = 0; s < L.length; s += 16) {
        const fr = kit.frontage(s, side, 3 + R() * 2);
        if (!kit.isFree(fr.x, fr.z, 1) || !dry(fr.x, fr.z) || kit.overlaps({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 1, hd: 1 })) continue;
        palm(frameAt(fr.x, fr.z, R() * 6.28), R, 7 + R() * 4);
        palms++;
      }
      placed.palms = palms;
    },
    trees: {
      variants: [palm],
      attempts: 5000,
      scale: [1],
      test(x, z, d, h, R) {
        if (d < 14 || wetAt(x, z, 4)) return -1;
        return R() < (d < 120 ? 0.3 : 0.08) ? 0 : -1;
      },
    },
  });
}
