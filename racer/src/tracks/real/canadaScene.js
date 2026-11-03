import { CanvasTexture, SRGBColorSpace, MeshStandardMaterial, Group, Mesh, BoxGeometry } from 'three';
import { MeshBuilder } from '../../car/meshBuilder.js';
import { rgb, pick, scaleC } from '../street/kit.js';
import { standVariety } from './trackside.js';
import { buildRealScene } from './scene.js';
import { cheapBlock } from '../street/buildings.js';
import { scotsPine, birch } from '../street/trees.js';
import { grandstand } from '../street/props.js';
import { oak } from './hungaroringScene.js';
import { marquees, bigScreen } from './silverstoneScene.js';
import { beam } from '../night/venue.js';

/*
 * Montréal, handcrafted. Circuit Gilles Villeneuve runs round Île Notre-Dame, the island built in
 * the St. Lawrence for Expo 67: the river wide and fast on the south and west, the long Olympic
 * rowing Basin beside the Casino straight, the Lac des Régates with its sand beach in the middle
 * of the island, lawns and maples everywhere. Across the water: Buckminster Fuller's Biosphère on
 * Île Sainte-Hélène, the Casino de Montréal by the hairpin, and the towers of downtown beyond.
 * Concrete walls with debris fencing close to the track, footbridges over it, the long white pit
 * building, and "Bienvenue au Québec" on the Wall of Champions.
 */

const WHITE = rgb(0xf4f4f2), RED = rgb(0xd80621), STEEL = rgb(0x8a929e);
const SHIRTS = [RED, WHITE, rgb(0x1b1b1f), rgb(0xff8000), rgb(0x00a19b), rgb(0x1f4f9a), RED, rgb(0xf2c200)];

function cgvStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: true, seats: [RED, rgb(0x2a3a7a), rgb(0x8a8e96)] });
  return { ...gs, shirts: SHIRTS };
}
function openStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: false, style: 'alu', seats: [rgb(0x8a8e96), RED] });
  return { ...gs, shirts: SHIRTS };
}
const VARIED = standVariety(openStand, null, SHIRTS);

/** The Biosphère: a three-quarter geodesic sphere of white steel struts. */
function biosphere(F, R0) {
  const n = 18, m = 12;
  const P = (i, j) => { const t = (i / n) * Math.PI * 2, p = -0.45 + (j / m) * (Math.PI / 2 + 0.45); return [Math.cos(t) * Math.cos(p) * R0, R0 * 0.62 + Math.sin(p) * R0, Math.sin(t) * Math.cos(p) * R0]; };
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const off = j % 2 ? 0.5 : 0;
    beam(F, 'metal', P(i + off, j), P(i + 1 + off, j), 0.22, WHITE);
    beam(F, 'metal', P(i + off, j), P(i + 0.5 + off, j + 1), 0.22, WHITE);
    beam(F, 'metal', P(i + 1 + off, j), P(i + 0.5 + off, j + 1), 0.22, WHITE);
  }
  F.cylinder('stucco', 0, 0, R0 * 0.82, 0, R0 * 0.3, 18, rgb(0xb8bcc0));
}

/** Casino de Montréal: the Expo 67 French pavilion, stacked white concrete tiers with dark glass. */
function casino(F) {
  for (const [y0, w, d] of [[0, 46, 34], [10, 52, 38], [20, 46, 34], [30, 34, 26]]) {
    F.box('glass', -w / 2 + 2, w / 2 - 2, y0, y0 + 8, -d + 2, -2, null);
    F.box('stucco', -w / 2, w / 2, y0 + 8, y0 + 10, -d, 0, WHITE);
    for (let a = -w / 2; a <= w / 2; a += 3) F.box('stucco', a - 0.25, a + 0.25, y0, y0 + 8, -0.5, 0, WHITE); // the concrete fins
  }
  F.box('neon', -17, 17, 40, 40.4, -26, 0.1, [2.4, 2.0, 1.4]);
}

/** Footbridge over the track: steel truss on two stair towers, a sponsor board facing each way. */
function footbridge(L, frameAt, i, col) {
  const A = frameAt(L.x[i], L.z[i], Math.atan2(-L.tz[i], L.tx[i]), L.yAt(i, 0));
  const bl = L.wall.L[i] + 3, br = -(L.wall.R[i] + 3), H = 6;
  for (const b of [bl, br]) A.box('concrete', -2, 2, 0, H, b - 1.5, b + 1.5, rgb(0x9a9a96));
  A.box('metal', -1.5, 1.5, H, H + 0.3, br, bl, STEEL);
  for (const a of [-1.5, 1.5]) {
    A.box('metal', a - 0.05, a + 0.05, H + 2.2, H + 2.3, br, bl, STEEL);
    for (let b = br; b < bl; b += 2) beam(A, 'metal', [a, H + 0.3, b], [a, H + 2.2, b + 2], 0.06, STEEL);
    A.box('trim', a > 0 ? 1.55 : -1.75, a > 0 ? 1.75 : -1.55, H + 0.4, H + 2.0, br + 2, bl - 2, col);
  }
}

export function buildCanadaScene(L) {
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const noise = (x, z) => Math.sin(x * 0.013 + 0.3) * Math.cos(z * 0.011 + 0.8) * 0.6 + Math.sin(x * 0.033 - z * 0.027) * 0.4;
  const img = (px, py) => L.fromImage(px, py);
  const clear = (x, z) => { let m = 1e9; for (let i = 0; i < L.N; i += 3) m = Math.min(m, Math.hypot(L.x[i] - x, L.z[i] - z) - Math.max(L.wall.L[i], L.wall.R[i])); return m; };
  const pitS = (s) => L.pit && L.pit.into(s) !== null;

  // ---- water: the St. Lawrence outside the lap, the Olympic Basin, the Lac des Régates ----
  const water = [];
  // Outside of the loop is the drivers' left (clockwise); the river round the south and west.
  for (let k = 8; k <= 41; k += 2) {
    const i = L.pointSample[k] % L.N, r = 600;
    const p = L.poseAt(i * L.ds, L.wall.L[i] + 42 + r);
    if (clear(p.x, p.z) > r + 30) water.push({ x: p.x, z: p.z, r, y: 0.2, margin: 25, depth: 12, colour: 0x1a3a4a });
  }
  // The Olympic Basin: a long narrow channel beside the Casino straight, past the paddock.
  for (let k = 45; k <= 55; k++) for (const t of [0, 0.5]) {
    const kk = k + t, i = (L.pointSample[Math.floor(kk) % 56] + Math.round(t * 8)) % L.N, r = 48;
    const p = L.poseAt(i * L.ds, L.wall.L[i] + (pitS(i * L.ds) ? 100 : 62) + r);
    if (clear(p.x, p.z) > r + 12) water.push({ x: p.x, z: p.z, r, y: 0.4, margin: 10, depth: 5, colour: 0x2a5a6a });
  }
  const [lx, lz] = img(570, 405);
  const lake = { x: lx, z: lz, r: 95, y: 0.5, margin: 20, depth: 4, colour: 0x3a8a8a };
  water.push(lake);
  const wetAt = (x, z, pad = 0) => water.some((w) => Math.hypot(x - w.x, z - w.z) < w.r + pad);

  return buildRealScene(L, {
    name: 'Canada',
    seed: 1978,
    life: { paddock: true, parks: 6, villages: true },
    margin: 700,
    trackside: { standBuild: openStand, shirts: SHIRTS, suburb: 0, standSpacing: 170, hoardingSpacing: 110, keepOut: (x, z) => wetAt(x, z, 8),
      skyline: { count: 220, tall: 150, dir: -2.3, spread: 1.0, depth: 1400, colours: [rgb(0x8a9aaa), rgb(0x6a7a8a), rgb(0xa8b0b8), rgb(0x5a6470)] } },
    pitTheme: {
      wall: rgb(0xeceae6),
      upper(F, hw, i, rc, { H1, DEPTH }) {
        const top = H1 + 3.8;
        F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -1.0, WHITE);
        F.face(i % 3 === 0 ? 'winLit' : 'glass', -hw + 0.3, hw - 0.3, H1 + 0.4, top - 0.4, -0.98, [1.0, 1.05, 1.1]);
        F.box('stucco', -hw, hw, top, top + 0.5, -DEPTH, 3.5, WHITE); // the roof terrace overhang
        F.box('metal', -hw, hw, top + 0.5, top + 1.5, 3.4, 3.5, rgb(0x9fb8cc));
        F.box('trim', -hw, hw, top - 0.2, top, 3.3, 3.5, RED);
      },
    },
    style: {
      kerb: [WHITE, RED],
      runoff: 'brand', runoffFields: 4, runoffBoth: 1, runoffHero: 'ROLEX', runoffFloor: [0.1, 0.105, 0.11],
      barrier: 'jersey', fence: true, lamps: 'none', verge: 'grass', gantries: 4,
      title: ['MONTRÉAL', 'GRAND PRIX DU CANADA', '#d80621', '#ffffff', '#1b1b1f'],
      roadName: 'MONTRÉAL',
      bannerGlow: 0.12,
      boardBorder: '#d80621',
    },
    fascia: ['CIRCUIT GILLES VILLENEUVE', 'GRAND PRIX DU CANADA'],
    fasciaColours: ['#d80621', '#ffffff', '#1b1b1f'],
    skirtColour: [0.24, 0.36, 0.2],
    groundKind: 'grass',
    relief(x, z, d) { return noise(x, z) * 1.5 * smooth(40, 200, d); },
    colourAt(x, z, h, slope, d) {
      const dl = Math.hypot(x - lx, z - lz) - lake.r;
      if (dl < 22) return [0.86, 0.78, 0.6];                       // the beach
      if (wetAt(x, z, 6)) return [0.5, 0.52, 0.46];               // stone banks
      return noise(x * 2, z * 2) > 0.45 ? [0.3, 0.48, 0.2] : [0.36, 0.56, 0.24];
    },
    water,
    stands: [
      { at: 0, side: 'R', W: 260, tiers: 20, build: cgvStand, offset: -40 }, // Grandstand 1, opposite the pits
      { at: 3, side: 'outside', W: 180, tiers: 18, build: cgvStand },       // Senna (11-12)
      { at: 7, side: 'outside', W: 120, tiers: 16, build: openStand },
      { at: 13, side: 'outside', W: 90, tiers: 14, build: VARIED },
      { at: 23, side: 'outside', W: 100, tiers: 14, build: VARIED },
      { at: 31, side: 'outside', W: 90, tiers: 14, build: VARIED },
      { at: 37, side: 'outside', W: 150, tiers: 18, build: cgvStand },      // L'Épingle
      { at: 49, side: 'R', W: 140, tiers: 18, build: cgvStand },             // the final chicane
    ],
    landmarks({ L, R, frameAt, kit, terrain, placed, group }) {
      const ps = (k) => L.pointS(k);
      // ---- the Biosphère across the Basin, the Casino by the hairpin ----
      for (const [px, py] of [[210, 80], [240, 70], [180, 60]]) {
        const [x, z] = img(px, py);
        if (wetAt(x, z, 40) || terrain.distSmooth(x, z) < 70) continue;
        biosphere(frameAt(x, z, 0, terrain.heightAt(x, z)), 38);
        kit.footprints.push({ cx: x, cz: z, ux: 1, uz: 0, hw: 42, hd: 42 }); placed.biosphere = 1; break;
      }
      for (const [px, py] of [[105, 135], [130, 120], [150, 140]]) {
        const [x, z] = img(px, py);
        const F = kit.lot(x, z, 0, 1, 52, 38, 3, (a, b) => !wetAt(a, b, 4));
        if (F) { casino(F); placed.casino = 1; break; }
      }
      // ---- footbridges over the track ----
      // ---- tri-vision boards at wall height: three-sided slats turning between sponsors ----
      {
        const c = document.createElement('canvas'); c.width = 1024; c.height = 384;
        const g = c.getContext('2d');
        [['ROLEX', '#006039', '#c8a24b'], ['Heineken', '#00843d', '#ffffff'], ['PIRELLI', '#ffd100', '#111111']].forEach(([t, bg, fg], k) => {
          g.fillStyle = bg; g.fillRect(0, k * 128, 1024, 128);
          g.fillStyle = fg; g.font = '900 92px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(t, 512, k * 128 + 68, 960);
        });
        const tex = new CanvasTexture(c); tex.colorSpace = SRGBColorSpace;
        const mat = new MeshStandardMaterial({ map: tex, roughness: 0.6 });
        const LEN = 7, NS = 14, r0 = 0.32;
        // One slat: a triangular prism along x, its three faces mapped to the three thirds of the texture.
        const slat = new MeshBuilder();
        for (let f = 0; f < 3; f++) {
          const t0 = (f / 3) * Math.PI * 2 + Math.PI / 2, t1 = ((f + 1) / 3) * Math.PI * 2 + Math.PI / 2;
          const p = (x, t) => [x, Math.sin(t) * r0, Math.cos(t) * r0], v0 = 1 - (f + 1) / 3, v1 = 1 - f / 3;
          slat.quadUV('t', p(-LEN / 2, t0), p(LEN / 2, t0), p(LEN / 2, t1), p(-LEN / 2, t1), [0, v0], [1, v0], [1, v1], [0, v1]);
        }
        const slatGeo = slat.build({ t: mat }).children[0].geometry;
        let boards = 0, t = 0, last = performance.now();
        for (let s = 80; s < L.length; s += 330) {
          const i = Math.floor(s / L.ds) % L.N, side = boards % 2 ? 'L' : 'R', sg = side === 'L' ? 1 : -1;
          const p = L.poseAt(s, sg * (L.wall[side][i] + 1.6)), y = L.yAt(i, sg * L.wall[side][i]);
          const holder = new Group();
          holder.position.set(p.x, y + 1.1, p.z);
          holder.rotation.y = Math.atan2(-L.tz[i], L.tx[i]) + (side === 'L' ? Math.PI : 0);
          for (let k = 0; k < NS; k++) {
            const m = new Mesh(slatGeo, mat);
            m.position.y = k * r0 * 1.45 - (NS * r0 * 1.45) / 2 + 2.6;
            m.rotation.x = 0; m.scale.x = 1;
            m.userData.k = k;
            holder.add(m);
          }
          const frame = new Mesh(new BoxGeometry(LEN + 0.4, NS * r0 * 1.45 + 0.4, 0.3), new MeshStandardMaterial({ color: 0x1b1b1f, roughness: 0.8 }));
          frame.position.set(0, 2.6, -0.45);
          holder.add(frame);
          // Turn a third every few seconds, the slats rippling one after another.
          holder.children[0].onBeforeRender = () => {
            const now = performance.now(); t += Math.min(0.1, (now - last) / 1000); last = now;
            for (const m of holder.children) if (m.userData.k !== undefined) {
              const ph = t / 4 - m.userData.k * 0.02, step = Math.floor(ph), f = ph - step;
              const e = f < 0.2 ? (1 - Math.cos((f / 0.2) * Math.PI)) / 2 : 1;
              m.rotation.x = (step + e) * (Math.PI * 2) / 3;
            }
          };
          group.add(holder);
          boards++;
        }
        placed.trivision = boards;
      }
      // ---- downtown Montréal across the river to the north-west, Mount Royal behind it ----
      {
        const [cx, cz] = img(-160, -150), [mx, mz] = img(-420, -560);
        const M = frameAt(mx, mz, 0, -5);
        M.blob('leaf', 0, 0, 520, 0, 230, 14, rgb(0x2e4a26));                    // Mount Royal
        M.box('metal', -0.8, 0.8, 222, 252, -0.8, 0.8, WHITE); M.box('metal', -6, 6, 240, 242, -0.8, 0.8, WHITE); // the cross
        const tw = (x, z, W, D, H, wall, style) => { if (wetAt(x, z, 10)) return; const F = frameAt(x, z, 0.62, 2); cheapBlock(F, R, W, D, Math.round(H / 3.1), { wall, style, flat: true, trim: rgb(0x5a5e66) }); return F; };
        // Place Ville Marie: the cruciform glass tower.
        const pvm = [cx + 60, cz - 40];
        tw(pvm[0], pvm[1], 64, 18, 188, rgb(0x9aa4ae), 'glass'); tw(pvm[0], pvm[1] - 23, 18, 64, 188, rgb(0x9aa4ae), 'glass');
        // 1000 de La Gauchetière with its copper pyramid, 1250 René-Lévesque, the Bourse.
        const g = tw(cx - 40, cz + 30, 40, 40, 190, rgb(0xc8c0b0), 'soviet');
        if (g) g.block('copper', [[-20, 0], [20, 0], [20, -40], [-20, -40]], [[0, -20], [0, -20], [0, -20], [0, -20]], 196, 214, rgb(0x5a9a80));
        tw(cx + 140, cz + 60, 40, 30, 199, rgb(0x8a98a8), 'glass');
        tw(cx - 120, cz - 60, 30, 30, 190, rgb(0x3a3e46), 'glass');
        for (let k = 0; k < 90; k++) {
          const x = cx + (R() - 0.5) * 520, z = cz + (R() - 0.5) * 380, H = 40 + R() * R() * 160;
          tw(x, z, 22 + R() * 18, 20 + R() * 16, H, pick(R, [rgb(0x9aa4ae), rgb(0xb8b0a0), rgb(0x8a98a8), rgb(0xd0c8b8), rgb(0x6a7480)]), R() < 0.55 ? 'glass' : 'soviet');
        }
        placed.downtown = 1;
      }
      // ---- Bienvenue au Québec on the Wall of Champions ----
      {
        const i = L.pointSample[52] % L.N, side = L.wall.L[i] < L.wall.R[i] ? 'L' : 'R', sg = side === 'L' ? 1 : -1;
        const c = document.createElement('canvas'); c.width = 1024; c.height = 64;
        const g = c.getContext('2d');
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, 1024, 64);
        g.fillStyle = '#1b1b1f'; g.font = '700 46px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('BIENVENUE AU QUÉBEC', 512, 34);
        const tex = new CanvasTexture(c); tex.colorSpace = SRGBColorSpace;
        const mb = new MeshBuilder(), lat = L.wall[side][i] - 0.04;
        const P = (s, y) => { const p = L.poseAt(s, sg * lat); return [p.x, L.yAt(i, sg * lat) + y, p.z]; };
        const s0 = i * L.ds - 16, s1 = i * L.ds + 16, a = sg > 0 ? [s1, s0] : [s0, s1];
        mb.quadUV('wall', P(a[0], 0.15), P(a[1], 0.15), P(a[1], 0.95), P(a[0], 0.95), [0, 0], [1, 0], [1, 1], [0, 1]);
        group.add(mb.build({ wall: new MeshStandardMaterial({ map: tex, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 }) }));
        placed.wallOfChampions = 1;
      }
      // ---- hospitality and screens; the beach and its pavilion ----
      for (const k of [2, 12, 30, 41, 50]) {
        const s = ps(k), side = L.k[Math.floor(s / L.ds) % L.N] > 0 ? 'R' : 'L';
        const fr = kit.frontage(s, side, 26 + R() * 10);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 56, 28, 3, (a, b) => !wetAt(a, b, 4));
        if (F) marquees(F, R, 56, 28);
        const g = kit.frontage(s + 30, side, 4);
        const G = kit.lot(g.x, g.z, g.dirX, g.dirZ, 13, 2, 1, null);
        if (G) bigScreen(G);
      }
      const bp = kit.lot(lx, lz + lake.r + 34, 0, -1, 40, 12, 3, null);
      if (bp) { cheapBlock(bp, R, 40, 12, 1, { wall: WHITE, style: 'glass', flat: true }); placed.beach = 1; }
      void pick;
    },
    trees: {
      variants: [oak, birch, scotsPine],
      attempts: 26000,
      scale: [1.15, 1, 1],
      test(x, z, d, h, R) {
        if (d < 18 || wetAt(x, z, 10) || Math.hypot(x - lx, z - lz) < lake.r + 30) return -1;
        if (noise(x * 1.2 + 7, z * 1.2) > -0.1) { const v = R(); return v < 0.7 ? 0 : v < 0.88 ? 1 : 2; }
        return R() < 0.1 ? 0 : -1;
      },
    },
  });
}
