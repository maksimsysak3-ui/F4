import { rgb, scaleC, pick } from '../street/kit.js?v=a5d31c9';
import { standVariety } from '../real/trackside.js?v=a5d31c9';
import { buildRealScene } from '../real/scene.js?v=a5d31c9';
import { cheapBlock } from '../street/buildings.js?v=a5d31c9';
import { spruce, scotsPine } from '../street/trees.js?v=a5d31c9';
import { grandstand } from '../street/props.js?v=a5d31c9';
import { beam } from '../night/venue.js?v=a5d31c9';

/*
 * Glacier Pass, handcrafted. A high pass ringed by snow peaks, a glacier tongue
 * spilling down from the north, spruce forest on the slopes, a frozen lake in
 * the valley, a village of timber chalets with snow on their roofs and an onion
 * dome church, the red gondolas of the cable car climbing from the village to
 * the summit station, a ski jump with its own grandstand, and snow banks
 * piled behind the barriers.
 */

const WHITE = rgb(0xf4f6fa), SNOW = [0.93, 0.95, 0.98], ROCK = [0.46, 0.46, 0.5], STEEL = rgb(0x8a929e);
const TIMBER = [0x7a4a2a, 0x8a5a32, 0x6a3e22, 0x9a6a3a].map(rgb);
const SHIRTS = [rgb(0xc8242b), WHITE, rgb(0x1f3f8a), rgb(0x1b1b1f), rgb(0xf2c200), rgb(0x2a7a3a), rgb(0xff7a12)];

const SPONSORS = [
  ['EDELWEISS BANK', '#f4f2ec', '#1b2a4a', '#c8242b', 'serif'],
  ['GLACIER WATER', '#4ab0e8', '#ffffff', '#1f3f8a', 'wave'],
  ['ALPENHORN', '#c8242b', '#ffffff', '#f2c200', 'stripes'],
  ['SUMMIT TYRES', '#141416', '#f2c200', '#f2c200', 'tread'],
  ['AVALANCHE ENERGY', '#1f3f8a', '#ffffff', '#4ab0e8', 'bolt'],
  ['PEAK TELECOM', '#2a7a3a', '#ffffff', '#f4f2ec', 'hex'],
  ['CHALET CHOCOLAT', '#5a2a1a', '#f2e6c9', '#d8b04a', 'serif'],
  ['ICE COLA', '#e8f2fa', '#c8242b', '#4ab0e8', 'wave'],
];

function alpStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: true, seats: [rgb(0xc8242b), WHITE] });
  return { ...gs, shirts: SHIRTS };
}

/** Timber chalet: stone base, wooden walls, carved balconies, a deep-eaved roof under snow. */
function chalet(F, r, W, D, floors = 2) {
  const wood = pick(r, TIMBER), base = 2.6, H = base + floors * 2.9;
  F.box('stucco', -W / 2, W / 2, -1.5, base, -D, 0, rgb(0xb8b4ac));
  F.box('stucco', -W / 2, W / 2, base, H, -D, 0, wood);
  for (let f = 0; f < floors; f++) {
    const y = base + f * 2.9 + 0.7;
    for (let a = -W / 2 + 1.4; a < W / 2 - 1; a += 2.6) {
      F.face(r() < 0.3 ? 'winLit' : 'glass', a - 0.55, a + 0.55, y, y + 1.4, 0.02, [1, 0.8, 0.55]);
      for (const s of [-1, 1]) F.face('trim', a + s * 0.6, a + s * 1.0, y, y + 1.4, 0.03, rgb(0x2a5a3a));
    }
    if (f === floors - 1 || r() < 0.4) {
      F.box('trim', -W / 2, W / 2, y - 0.75, y - 0.6, 0, 1.4, scaleC(wood, 0.8)); // balcony
      for (let a = -W / 2 + 0.3; a < W / 2; a += 0.45) F.box('trim', a - 0.05, a + 0.05, y - 0.6, y + 0.3, 1.3, 1.4, scaleC(wood, 0.8));
      F.box('fabric', -W / 2 + 1, W / 2 - 1, y - 0.55, y - 0.2, 1.35, 1.45, rgb(0xd8304a)); // geraniums
    }
  }
  const ridge = H + Math.min(W, D) * 0.42;
  const roof = (y0, y1, c, grow) => F.block('roof', [[-W / 2 - grow, 1.8], [W / 2 + grow, 1.8], [W / 2 + grow, -D - 1.8], [-W / 2 - grow, -D - 1.8]], [[-W / 2 - grow, -D / 2], [W / 2 + grow, -D / 2], [W / 2 + grow, -D / 2], [-W / 2 - grow, -D / 2]], y0, y1, c);
  roof(H, ridge, scaleC(wood, 0.6), 1.2);
  roof(H + 0.25, ridge + 0.3, WHITE, 1.1); // the snow load
  F.box('stucco', W / 2 - 2, W / 2 - 1, ridge - 1.5, ridge + 1.2, -D / 2 - 0.5, -D / 2 + 0.5, rgb(0x8a8680)); // chimney
}

/** Onion-dome church: white walls, a tall tower with a copper onion dome. */
function church(F) {
  F.box('stucco', -7, 7, 0, 11, -26, 0, WHITE);
  F.block('roof', [[-7.6, 0.6], [7.6, 0.6], [7.6, -26.6], [-7.6, -26.6]], [[0, 0.6], [0, 0.6], [0, -26.6], [0, -26.6]], 11, 17, rgb(0x6a4a3a));
  F.box('stucco', -4, 4, 0, 30, 0, 8, WHITE);
  for (let k = 0; k < 7; k++) { const r = [3.2, 4.2, 4.6, 4.2, 3.0, 1.6, 0.6][k]; F.cylinder('copper', 0, 4, r, 30 + k * 1.4, 31.4 + k * 1.4, 12, rgb(0x4a8a6a)); }
  F.cylinder('metal', 0, 4, 0.12, 40, 44, 6, rgb(0xd8b04a));
  F.face('trim', -1.4, 1.4, 22, 24.8, 8.02, rgb(0x2a2a2e)); // the clock
}

/** A lattice cable-car pylon. */
function pylon(F, H) {
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) beam(F, 'metal', [sa * 2.2, 0, sb * 2.2], [sa * 0.7, H, sb * 0.7], 0.25, STEEL);
  for (let y = 4; y < H - 2; y += 5) for (const [p, q] of [[[-1, -1], [1, 1]], [[1, -1], [-1, 1]]]) {
    const k = (yy) => 2.2 - 1.5 * (yy / H);
    beam(F, 'metal', [p[0] * k(y), y, p[1] * k(y)], [q[0] * k(y + 5), y + 5, q[1] * k(y + 5)], 0.1, STEEL);
  }
  F.box('metal', -4, 4, H, H + 0.5, -0.8, 0.8, STEEL); // cross-arm
}

/** A ski jump: the inrun on its tower, the take-off, the landing hill and the outrun stand. */
function skiJump(F, H) {
  const steps = 14;
  for (let k = 0; k < steps; k++) {
    const t0 = k / steps, t1 = (k + 1) / steps;
    const y = (t) => H * (1 - t) ** 1.6 + 6 * t, b = (t) => -t * H * 2.2;
    F.block('concrete', [[-2.5, b(t0)], [2.5, b(t0)], [2.5, b(t1)], [-2.5, b(t1)]], [[-2.5, b(t0)], [2.5, b(t0)], [2.5, b(t1)], [-2.5, b(t1)]], y(t0) - 1.2, y(t0), rgb(0xd8dadc));
    beam(F, 'metal', [0, 0, b(t0)], [0, y(t0) - 1.2, b(t0)], 0.5, STEEL);
  }
  F.box('stucco', -4, 4, H, H + 5, 0, 6, rgb(0xc8242b)); // the start house
}

const VARIED = standVariety(alpStand, null, SHIRTS);

export function buildAlpineScene(L) {
  let tx0 = Infinity, tx1 = -Infinity, tz0 = Infinity, tz1 = -Infinity;
  for (let i = 0; i < L.N; i++) { tx0 = Math.min(tx0, L.x[i]); tx1 = Math.max(tx1, L.x[i]); tz0 = Math.min(tz0, L.z[i]); tz1 = Math.max(tz1, L.z[i]); }
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const noise = (x, z) => Math.sin(x * 0.009 + 0.3) * Math.cos(z * 0.008 + 0.8) * 0.6 + Math.sin(x * 0.027 - z * 0.021) * 0.4;
  const ridges = (x, z) => Math.abs(Math.sin(x * 0.0042 + Math.cos(z * 0.0031) * 1.7)) + Math.abs(Math.sin(z * 0.0047 - x * 0.0013));
  const img = (px, py) => L.fromImage(px, py);
  const cx = (tx0 + tx1) / 2, cz = (tz0 + tz1) / 2;
  const [lx, lz] = img(330, 640);                         // the frozen lake below Lakeside
  const [gx, gz] = img(600, -250);                        // the glacier, north
  const lake = [{ x: lx, z: lz, r: 120, y: 3.5, margin: 22, depth: 4, colour: 0xc8dcea }];
  const onLake = (x, z) => Math.hypot(x - lake[0].x, z - lake[0].z) < lake[0].r + 8;

  return buildRealScene(L, {
    name: 'Glacier Pass',
    seed: 2471,
    margin: 800,
    trackside: { standBuild: alpStand, shirts: SHIRTS, suburb: 0, standSpacing: 260, palette: [[rgb(0xc8242b), WHITE]], keepOut: onLake },
    pitTheme: {
      wall: rgb(0xeeeae2),
      upper(F, hw, i, rc, { H1, DEPTH }) {
        const top = H1 + 3.2, wood = TIMBER[i % TIMBER.length];
        F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -1.0, wood);
        F.face(i % 3 === 0 ? 'winLit' : 'glass', -hw + 0.3, hw - 0.3, H1 + 0.4, top - 0.4, -0.98, [1.1, 0.95, 0.8]);
        F.block('roof', [[-hw, 1.6], [hw, 1.6], [hw, -DEPTH - 1], [-hw, -DEPTH - 1]], [[-hw, -DEPTH / 2], [hw, -DEPTH / 2], [hw, -DEPTH / 2], [-hw, -DEPTH / 2]], top, top + 3.5, WHITE);
        if (rc) F.box('stucco', -hw + 0.5, hw - 0.5, top + 3.5, top + 6, -DEPTH + 2, -2, wood);
      },
    },
    style: {
      kerb: [rgb(0xf2f1ec), rgb(0xc8242b)],
      runoff: 'brand', runoffFloor: [0.13, 0.13, 0.14],
      barrier: 'armco', fence: true, lamps: 'none', verge: 'grass',
      sponsors: SPONSORS,
      zoneBrands: ['GLACIER WATER', 'ALPENHORN', 'AVALANCHE ENERGY', 'PEAK TELECOM', 'ICE COLA'],
      primeBrands: ['EDELWEISS BANK', 'CHALET CHOCOLAT'],
      title: ['GLACIER PASS', 'GRAND PRIX DES ALPES', '#c8242b', '#ffffff', '#f4f2ec'],
      bridges: [['GLACIER WATER', 'FROM THE ICE', '#4ab0e8', '#ffffff', '#1f3f8a'], ['ALPENHORN', 'HEARD ACROSS THE VALLEY', '#c8242b', '#ffffff', '#f2c200']],
      roadName: 'GLACIER PASS',
      bannerGlow: 0.12,
      boardBorder: '#c8242b',
    },
    fascia: ['GLACIER PASS', 'GRAND PRIX DES ALPES'],
    fasciaColours: ['#c8242b', '#ffffff', '#f4f2ec'],
    skirtColour: [0.84, 0.87, 0.92],
    groundKind: 'sand',
    water: lake,
    relief(x, z, d) {
      // Peaks all round, highest to the north where the glacier comes down; the valley floor south.
      const r = Math.hypot(x - cx, z - cz);
      const ring = Math.pow(smooth(500, 1500, r), 1.3) * (380 + ridges(x, z) * 260);
      const north = Math.max(0, (cz - z) / 1200) * 140;
      const glacier = -40 * Math.exp(-((x - gx) ** 2) / (160 * 160)) * smooth(0, 600, cz - z);
      return (ring + north * smooth(200, 700, r) + glacier + noise(x, z) * 10) * smooth(30, 200, d);
    },
    colourAt(x, z, h, slope, d) {
      const grass = [0.42, 0.52, 0.32], forest = [0.22, 0.32, 0.22];
      if (onLake(x, z)) return [0.82, 0.88, 0.94];
      if (slope > 0.75) return ROCK;
      if (h > 140 || slope < 0.08 && h > 40) return SNOW;
      if (d < 24) return noise(x * 4, z * 4) > 0.3 ? grass : SNOW; // snow banks broken by thaw
      const snowy = noise(x * 2, z * 2) > -0.2 || h > 80;
      return snowy ? SNOW : (noise(x * 3 + 7, z * 3) > 0 ? forest : grass);
    },
    stands: [
      { at: 0, side: 'L', W: 110, tiers: 12, build: alpStand, offset: -50 },
      { at: 3, side: 'outside', W: 70, tiers: 12, build: VARIED },
      { at: 12, side: 'outside', W: 60, tiers: 10, build: VARIED },
      { at: 22, side: 'outside', W: 60, tiers: 12, build: VARIED },
      { at: 30, side: 'outside', W: 70, tiers: 12, build: VARIED },
      { at: 40, side: 'outside', W: 60, tiers: 10, build: VARIED },
    ],
    landmarks({ L, R, frameAt, kit, terrain, placed }) {
      const ps = (k) => L.pointS(k);
      // ---- snow banks piled behind the barriers ----
      let banks = 0;
      for (const side of ['L', 'R']) for (let s = 0; s < L.length; s += 7) {
        const fr = kit.frontage(s, side, -2.4);
        if (!kit.isFree(fr.x, fr.z, 0.2) || onLake(fr.x, fr.z)) continue;
        const F = frameAt(fr.x, fr.z, 0, terrain.heightAt(fr.x, fr.z) - 0.3);
        F.blob('stucco', 0, 0, 2.2 + R() * 1.4, 0, 1.0 + R() * 0.8, 6, scaleC(WHITE, 0.94 + R() * 0.06));
        banks++;
      }
      placed.snowBanks = banks;
      // ---- the village by the valley straight: chalets, the church, a hotel ----
      const vs = (ps(26) + ps(29)) / 2, vi = Math.floor(vs / L.ds) % L.N, vside = L.k[vi] > 0 ? 'L' : 'R';
      const vfr = kit.frontage(vs, vside, 80);
      let chalets = 0;
      const CH = kit.lot(vfr.x, vfr.z, vfr.dirX, vfr.dirZ, 16, 34, 3, null);
      if (CH) { church(CH); placed.church = 1; }
      for (let k = 0; k < 900; k++) {
        const a = R() * 6.28, rr = 40 + R() * 340, x = vfr.x + Math.cos(a) * rr, z = vfr.z + Math.sin(a) * rr;
        const d = terrain.distSmooth(x, z);
        if (d < 20 || onLake(x, z) || terrain.heightAt(x, z) > 90) continue;
        const n = d < 120 ? L.nearest(x, z) : null;
        let dirX = 0, dirZ = 1;
        if (n) { const sg = n.lateral > 0 ? 1 : -1; dirX = -L.nx[n.i] * sg; dirZ = -L.nz[n.i] * sg; }
        const W = 11 + R() * 6, D = 10 + R() * 4;
        const F = kit.lot(x, z, dirX, dirZ, W, D, 3, null);
        if (!F) continue;
        chalet(F, R, W, D, 2 + Math.floor(R() * 2));
        chalets++;
      }
      // Chalets dotted along the whole lap too, and a grand hotel above the start.
      for (const side of ['L', 'R']) for (let s = 0; s < L.length; s += 70) {
        const W = 12 + R() * 6, D = 11 + R() * 3;
        const F = kit.lot(...(() => { const f = kit.frontage(s, side, 12 + R() * 30); return [f.x, f.z, f.dirX, f.dirZ]; })(), W, D, 2, (x, z) => !onLake(x, z));
        if (F) { chalet(F, R, W, D, 2 + Math.floor(R() * 2)); chalets++; }
      }
      const hfr = kit.frontage(ps(44), 'L', 30);
      const HT = kit.lot(hfr.x, hfr.z, hfr.dirX, hfr.dirZ, 70, 22, 3, null);
      if (HT) { cheapBlock(HT, R, 70, 22, 6, { wall: rgb(0xf0e8d8), style: 'stucco', roof: rgb(0x5a4a42) }); placed.hotel = 1; }
      placed.chalets = chalets;
      // ---- the cable car from the village to the summit station ----
      const [sx, sz] = img(560, -420);
      const sy = terrain.heightAt(sx, sz), vy = terrain.heightAt(vfr.x, vfr.z);
      const n = 9;
      let prev = null;
      const F0 = frameAt(0, 0, 0, 0); // world-space frame for the ropes
      for (let k = 0; k <= n; k++) {
        const t = k / n, x = vfr.x + (sx - vfr.x) * t, z = vfr.z + (sz - vfr.z) * t, g = terrain.heightAt(x, z);
        const H = k === 0 || k === n ? 8 : 22 + R() * 6, F = frameAt(x, z, Math.atan2(sz - vfr.z, sx - vfr.x) * -1);
        if (k === 0 || k === n) { F.box('stucco', -8, 8, 0, 9, -6, 6, rgb(0x8a8680)); F.box('roof', -9, 9, 9, 10, -7, 7, WHITE); } else pylon(F, H);
        const top = [x, g + H, z];
        if (prev) {
          for (const off of [-3, 3]) {
            const ox = -(sz - vfr.z), oz = sx - vfr.x, ol = Math.hypot(ox, oz);
            const p = [prev[0] + (ox / ol) * off, prev[1], prev[2] + (oz / ol) * off], q = [top[0] + (ox / ol) * off, top[1], top[2] + (oz / ol) * off];
            beam(F0, 'metal', p, q, 0.12, rgb(0x2a2a2e));
            // Gondolas hang off the rope.
            for (const u of [0.3, 0.7]) {
              const gx2 = p[0] + (q[0] - p[0]) * u, gy = p[1] + (q[1] - p[1]) * u - 3.4, gz2 = p[2] + (q[2] - p[2]) * u;
              const G = frameAt(gx2, gz2, R() * 0.2, gy);
              G.box('stucco', -1.3, 1.3, 0, 2.4, -1.3, 1.3, rgb(0xc8242b));
              G.face('glass', -1.1, 1.1, 1.0, 2.1, 1.31, null);
              G.box('metal', -0.06, 0.06, 2.4, 3.4, -0.06, 0.06, STEEL);
            }
          }
        }
        prev = top;
      }
      void sy; void vy;
      placed.cableCar = n;
      // ---- the ski jump on the slope above the Glacier loop ----
      const jfr = kit.frontage((ps(31) + ps(34)) / 2, 'R', 70);
      const J = kit.lot(jfr.x, jfr.z, jfr.dirX, jfr.dirZ, 10, 120, 3, null);
      if (J) { skiJump(J, 48); placed.skiJump = 1; }
    },
    trees: {
      variants: [spruce, scotsPine],
      attempts: 16000,
      scale: [1, 1],
      test(x, z, d, h, R) {
        if (d < 16 || onLake(x, z) || h > 150) return -1;
        const f = noise(x * 1.4 + 40, z * 1.4);
        if (f > 0.05) return R() < 0.85 ? 0 : 1;
        return R() < 0.04 ? 0 : -1;
      },
    },
  });
}
