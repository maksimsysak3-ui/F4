import { rgb, scaleC, pick } from '../street/kit.js';
import { standVariety } from './trackside.js';
import { buildRealScene } from './scene.js';
import { cheapBlock } from '../street/buildings.js';
import { palm } from '../street/trees.js';
import { grandstand } from '../street/props.js';
import { oak } from './hungaroringScene.js';
import { marquees, bigScreen } from './silverstoneScene.js';
import { beam } from '../night/venue.js';

/*
 * Mexico City, handcrafted. The autodrome sits in the Magdalena Mixhuca park: the long main straight,
 * the Esses through the trees, and the stadium section where the cars thread through the Foro Sol
 * baseball stadium, its stands packed and roaring, a dark steel roof over the tiers. Beside it, the
 * silver lattice dome of the Palacio de los Deportes. Sausage kerbs at the chicanes, huge painted
 * sponsor run-offs, fan zones under white parasols, and the city spreading to the mountains.
 */

const WHITE = rgb(0xf4f4f0), GREEN = rgb(0x006847), RED = rgb(0xce1126), STEEL = rgb(0x6a6e74);
const SHIRTS = [GREEN, WHITE, RED, rgb(0x1b1b1f), rgb(0xff8000), rgb(0x1f4f9a), rgb(0xf2c200), RED];

function mexStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: true, seats: [rgb(0x8a2a2a), rgb(0x6a6e78), rgb(0x1f4f9a)] });
  return { ...gs, shirts: SHIRTS };
}
/** Foro Sol: deep packed tiers under a dark steel roof on a lattice frame, a sponsor band along the front. */
function foroSol(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: false, seats: [rgb(0xa83a2a), rgb(0x8a8e96)], fill: 0.95 });
  const depth = tiers * 0.85 + 1.5, top = 1.2 + tiers * 0.55;
  for (let a = -W / 2; a <= W / 2 + 0.01; a += 9) {
    F.box('metal', a - 0.3, a + 0.3, 0, top + 9, -depth - 1, -depth - 0.4, STEEL);
    beam(F, 'metal', [a, top + 9, -depth - 0.7], [a, top + 6, 3], 0.25, STEEL);
  }
  F.box('roof', -W / 2 - 1, W / 2 + 1, top + 8.6, top + 9.2, -depth - 1, 3, rgb(0x3a3036));
  F.box('stucco', -W / 2, W / 2, top + 7.4, top + 8.6, 2.2, 3, rgb(0x141418)); // the sponsor band under the roof edge
  return { ...gs, shirts: SHIRTS };
}
const VARIED = standVariety(mexStand, null, SHIRTS);

/** Palacio de los Deportes: the copper-and-silver hyperbolic lattice dome. */
function palacio(F) {
  const R = 70, n = 24, rings = 8;
  for (let k = 0; k < n; k++) for (let j = 0; j < rings; j++) {
    const t0 = (k / n) * 6.283, t1 = ((k + 1) / n) * 6.283, u0 = j / rings, u1 = (j + 1) / rings;
    const P = (t, u) => [Math.cos(t) * R * Math.cos(u * 1.4), 6 + Math.sin(u * 1.4) * 34, Math.sin(t) * R * Math.cos(u * 1.4)];
    beam(F, 'metal', P(t0, u0), P(t1, u1), 0.5, rgb(0xb8bcc4));
    beam(F, 'metal', P(t1, u0), P(t0, u1), 0.5, rgb(0x9aa0a8));
  }
  F.cylinder('stucco', 0, 0, R, 0, 6, 24, rgb(0x8a8e96));
}

export function buildMexicoScene(L) {
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const noise = (x, z) => Math.sin(x * 0.013 + 0.3) * Math.cos(z * 0.011 + 0.8) * 0.6 + Math.sin(x * 0.033 - z * 0.027) * 0.4;
  const img = (px, py) => L.fromImage(px, py);

  return buildRealScene(L, {
    name: 'Mexico',
    seed: 1962,
    life: { paddock: true, parks: 10 },
    margin: 700,
    trackside: { standBuild: mexStand, shirts: SHIRTS, suburb: 0.55, standSpacing: 160, skyline: { count: 0 } },
    pitTheme: {
      wall: rgb(0xeceae4),
      upper(F, hw, i, rc, { H1, DEPTH }) {
        const top = H1 + 3.4;
        F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -1.0, WHITE);
        F.face(i % 3 === 0 ? 'winLit' : 'glass', -hw + 0.3, hw - 0.3, H1 + 0.4, top - 0.4, -0.98, [1.0, 1.05, 1.1]);
        F.box('trim', -hw, hw, top, top + 0.35, -DEPTH, 1.5, i % 3 === 0 ? GREEN : i % 3 === 1 ? WHITE : RED);
        if (rc) F.box('stucco', -hw + 0.5, hw - 0.5, top + 0.35, top + 5, -DEPTH + 1, -1.2, WHITE);
      },
    },
    style: {
      kerb: [WHITE, RED],
      runoff: 'brand', runoffFull: true, runoffFields: 12, runoffBoth: 4, runoffFloor: [0.11, 0.11, 0.12],
      // The stadium section (T12-T16): strictly sponsored, the Mexico art, Heineken and Aramco, no plain tarmac.
      runoffSections: [{ from: 47, to: 60, brands: ['MEXICO ART', 'aramco\u200b', 'Heineken', 'aramco'] }],
      barrier: 'jersey', fence: true, gantries: 5, lamps: 'none', verge: 'grass',
      title: ['MÉXICO', 'GRAN PREMIO DE LA CIUDAD DE MÉXICO', '#006847', '#ffffff', '#ce1126'],
      roadName: 'MEXICO',
      bannerGlow: 0.12,
      boardBorder: '#ce1126',
    },
    fascia: ['MÉXICO', 'GRAN PREMIO DE LA CIUDAD DE MÉXICO'],
    fasciaColours: ['#006847', '#ffffff', '#ce1126'],
    skirtColour: [0.46, 0.44, 0.36],
    relief(x, z, d) {
      // The city is flat in the valley; the volcanoes and ridges ring it far away.
      const r = Math.hypot(x, z);
      return (Math.pow(smooth(900, 2400, r), 1.4) * 500 + noise(x, z) * 3) * smooth(60, 300, d);
    },
    colourAt(x, z, h, slope, d) {
      if (h > 120) return slope > 0.4 ? [0.42, 0.4, 0.38] : [0.36, 0.42, 0.3];
      if (d < 40) return [0.36, 0.52, 0.24];
      return noise(x * 2, z * 2) > 0.2 ? [0.3, 0.44, 0.22] : [0.56, 0.54, 0.48];
    },
    stands: [
      { at: 2, side: 'L', W: 220, tiers: 20, build: mexStand },                   // along the main straight
      { at: 8, side: 'outside', W: 140, tiers: 18, build: VARIED },               // T1
      { at: 11, side: 'outside', W: 100, tiers: 16, build: VARIED },
      { at: 20, side: 'outside', W: 90, tiers: 14, build: VARIED },               // T4-T6
      { at: 34, side: 'outside', W: 90, tiers: 14, build: VARIED },               // the Esses
      { at: 49, side: 'outside', W: 140, tiers: 30, build: foroSol },             // Foro Sol
      { at: 52, side: 'outside', W: 110, tiers: 30, build: foroSol },
      { at: 55, side: 'outside', W: 160, tiers: 32, build: foroSol },
      { at: 57, side: 'outside', W: 120, tiers: 28, build: foroSol },
    ],
    landmarks({ L, R, frameAt, kit, terrain, placed }) {
      const ps = (k) => L.pointS(k);
      // ---- sausage kerbs: the yellow humps on the apexes of the chicanes ----
      let sausages = 0;
      for (const k of [8, 10, 12, 19, 21, 50, 53, 56]) {
        const i = L.pointSample[k] % L.N, side = L.k[i] > 0 ? 'L' : 'R', sg = side === 'L' ? 1 : -1;
        for (let q = -2; q <= 2; q++) {
          const p = L.poseAt((i + q * 2) * L.ds, sg * (L.edge + 0.6));
          const F = frameAt(p.x, p.z, p.yaw, L.yAt(i + q * 2, sg * L.edge));
          F.box('trim', -0.25, 0.25, 0, 0.18, -1.0, 1.0, rgb(0xf2c200));
          F.box('trim', -0.27, 0.27, 0.0, 0.05, -1.0, 1.0, rgb(0x1b1b1f));
        }
        sausages++;
      }
      placed.sausages = sausages;
      // ---- the footbridge over the last corner: two stair towers, a lattice span, a sponsor board ----
      {
        const i = L.pointSample[60] % L.N;
        const A = frameAt(L.x[i], L.z[i], Math.atan2(-L.tz[i], L.tx[i]), L.yAt(i, 0));
        const left = L.nx[i] * -L.tz[i] + L.nz[i] * L.tx[i] >= 0;
        const bl = (left ? L.wall.L[i] : L.wall.R[i]) + 2.5, br = -((left ? L.wall.R[i] : L.wall.L[i]) + 2.5), H = 6.5;
        for (const b of [bl, br]) {
          A.box('stucco', -2.2, 2.2, 0, H + 3.2, b - 2.2, b + 2.2, rgb(0xe8e8e4));      // stair tower
          A.box('glass', -2.25, 2.25, 1, H + 2.8, b - 2.25, b + 2.25, rgb(0x6a7a88));
        }
        A.box('metal', -1.6, 1.6, H, H + 0.4, br, bl, STEEL);                            // deck
        A.box('stucco', -1.7, 1.7, H + 3.0, H + 3.3, br, bl, rgb(0xe8e8e4));            // roof
        for (const a of [-1.6, 1.6]) {
          A.box('metal', a - 0.06, a + 0.06, H + 0.4, H + 0.5, br, bl, STEEL);
          A.box('metal', a - 0.06, a + 0.06, H + 2.9, H + 3.0, br, bl, STEEL);
          for (let b = br; b < bl; b += 2.4) beam(A, 'metal', [a, H + 0.4, b], [a, H + 3.0, b + 2.4], 0.07, STEEL);
          A.box('trim', a > 0 ? 1.62 : -1.82, a > 0 ? 1.82 : -1.62, H + 0.6, H + 2.3, br + 3, bl - 3, rgb(0x00843d)); // Heineken-green board
        }
        placed.footbridge = 1;
      }
      // ---- the Palacio de los Deportes dome, fan zones with white parasols, trees in the park ----
      const [dx, dz] = img(420, 470);
      if (terrain.distSmooth(dx, dz) > 90) { palacio(frameAt(dx, dz, 0, terrain.heightAt(dx, dz))); kit.footprints.push({ cx: dx, cz: dz, ux: 1, uz: 0, hw: 75, hd: 75 }); placed.palacio = 1; }
      for (const k of [3, 14, 33, 45, 51]) {
        const s = ps(k), side = L.k[Math.floor(s / L.ds) % L.N] > 0 ? 'R' : 'L';
        const fr = kit.frontage(s, side, 24 + R() * 10);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 60, 30, 3, null);
        if (F) {
          marquees(F, R, 60, 18);
          for (let a = -26; a <= 26; a += 5) for (const b of [-22, -27]) { F.box('metal', a - 0.04, a + 0.04, 0, 2.6, b - 0.04, b + 0.04, STEEL); F.blob('fabric', a, b, 1.6, 2.5, 2.9, 6, WHITE); }
        }
        const g = kit.frontage(s + 30, side, 4);
        const G = kit.lot(g.x, g.z, g.dirX, g.dirZ, 13, 2, 1, null);
        if (G) bigScreen(G);
      }
      // The city: low concrete blocks in faded pastels across the valley.
      let blocks = 0;
      const b = terrain.bounds;
      for (let k = 0; k < 1400; k++) {
        const x = b.minX + R() * (b.maxX - b.minX), z = b.minZ + R() * (b.maxZ - b.minZ), d = terrain.distSmooth(x, z);
        if (d < 180 || terrain.heightAt(x, z) > 40) continue;
        const W = 12 + R() * 14, D = 10 + R() * 10, F = kit.lot(x, z, 0, 1, W, D, 3, null);
        if (!F) continue;
        cheapBlock(F, R, W, D, 2 + Math.floor(R() * 5), { wall: pick(R, [rgb(0xe8c8a0), rgb(0xd8a890), rgb(0xc8d0b8), rgb(0xe0d8c8), rgb(0xd09a8a), rgb(0xb8c8d8)]), style: R() < 0.5 ? 'stucco' : 'soviet', flat: true });
        blocks++;
      }
      placed.mexico = { blocks };
      void scaleC; void palm;
    },
    trees: {
      variants: [oak, palm],
      attempts: 30000,
      scale: [0.85, 1.15],
      test(x, z, d, h, R) {
        if (d < 16 || h > 80) return -1;
        if (d < 320 && noise(x * 1.5 + 4, z * 1.5) > -0.25) return R() < 0.9 ? 0 : 1; // the park's woods round the circuit
        if (d < 600) return R() < 0.35 ? (R() < 0.8 ? 0 : 1) : -1;                    // street trees through the city
        return R() < 0.06 ? 0 : -1;
      },
    },
  });
}
