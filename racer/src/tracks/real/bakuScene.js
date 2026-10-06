import { rgb, scaleC, pick, PALETTE } from '../street/kit.js';
import { buildRealScene } from './scene.js';
import { riviera, grandHotel, cheapBlock } from '../street/buildings.js';
import { palm, stonePine, cypress } from '../street/trees.js';
import { grandstand } from '../street/props.js';
import { oak } from './hungaroringScene.js';

/*
 * Baku, handcrafted. The start straight runs along the seafront boulevard, palms
 * and the Caspian on one side, the oil-boom mansions of the 1900s on the other,
 * carved sandstone with balconies and arched windows. The lap turns inland past
 * Government House, then squeezes up the castle section between the medieval
 * Old City wall (crenellated sandstone with round towers, the Maiden Tower and
 * the Shirvanshah domes inside) and the houses opposite, runs along the top of
 * the Old City and drops back to the boulevard past the rolled-carpet museum.
 * The three Flame Towers stand on the hill above it all.
 */

const SAND = [0xe2c9a0, 0xd8bc8e, 0xe8d4b0, 0xceb084, 0xe0c69a, 0xd4b88c, 0xeadcc0].map(rgb);
const STONE = rgb(0xd2b483), STONE_DK = rgb(0xa88a5e);
const SHIRTS = [rgb(0x00b5e2), rgb(0xef3340), rgb(0x509e2f), rgb(0xf4f4f0), rgb(0x1b1b1f), rgb(0x00b5e2)];

const SPONSORS = [
  ['CASPIAN PETRO', '#00a3d4', '#ffffff', '#ef3340', 'wave'],
  ['FLAME BANK', '#c8242b', '#ffffff', '#ffb000', 'bolt'],
  ['ABSHERON AIR', '#0e3a6a', '#ffffff', '#00b5e2', 'stripes'],
  ['SHIRVAN SILK', '#5a2a6a', '#f2e6c9', '#d8b04a', 'serif'],
  ['KHAZAR TELECOM', '#509e2f', '#ffffff', '#f4f4f0', 'hex'],
  ['ICHERI TEA', '#e8d4b0', '#5a2a1a', '#a8402a', 'serif'],
  ['NARGIZ WATCHES', '#141416', '#d8b04a', '#d8b04a', 'serif'],
  ['BOULEVARD TYRES', '#ff8a12', '#141416', '#141416', 'tread'],
];

/** Boulevard grandstand: steel tiers, a white sail roof, Azerbaijani blue/red/green seats. */
function bakuStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: true, seats: [rgb(0x00b5e2), rgb(0xef3340), rgb(0x509e2f)] });
  return { ...gs, shirts: SHIRTS };
}

/** Oil-boom mansion: carved sandstone, arched windows with balconies, a corner cupola. */
function mansion(F, r, W, D, floors, detail) {
  const save = PALETTE.stucco;
  PALETTE.stucco = SAND;
  if (r() < 0.75) riviera(F, r, { width: W, depth: D, floors, detail, street: r() < 0.3 });
  else grandHotel(F, r, { width: W, depth: D, floors, detail });
  PALETTE.stucco = save;
}

/**
 * A stretch of the Old City wall: coursed sandstone ashlar in weathered shades over a battered
 * foot, arrow slits, a corbelled parapet with pointed merlons, ivy at the base, a lantern; a
 * half-round tower every so often.
 */
function wallRun(F, r, len, tower, lantern) {
  const H = 9;
  F.block('stucco', [[-len / 2, 1.1], [len / 2, 1.1], [len / 2, -3.2], [-len / 2, -3.2]], [[-len / 2, 0], [len / 2, 0], [len / 2, -3.2], [-len / 2, -3.2]], -2, 2.2, STONE_DK); // battered foot
  F.box('stucco', -len / 2, len / 2, 2.2, H, -3.2, 0, STONE);
  // Ashlar courses: staggered blocks, each its own weathered shade.
  for (let row = 0, y = 2.3; y < H - 0.3; row++, y += 0.62) {
    for (let a = -len / 2 + (row % 2 ? 0.6 : 0); a < len / 2 - 0.2; a += 1.25) {
      const a1 = Math.min(len / 2, a + 1.18), k = 0.86 + r() * 0.2;
      F.face('stucco', a, a1, y, y + 0.56, 0.02, scaleC(STONE, k));
    }
  }
  // Rain streaks and soot under the parapet.
  for (let k = 0; k < 3; k++) { const a = -len / 2 + r() * len; F.face('stucco', a, a + 0.5 + r() * 0.6, 3 + r() * 2, H - 0.4, 0.04, scaleC(STONE_DK, 0.9)); }
  // Arrow slits.
  for (let a = -len / 2 + 2.5; a < len / 2 - 1; a += 4.5) F.face('trim', a, a + 0.18, 5.2, 6.8, 0.05, rgb(0x2a2018));
  // Corbels and the parapet, then pointed merlons.
  for (let a = -len / 2 + 0.3; a < len / 2; a += 1.0) F.box('stucco', a, a + 0.45, H - 0.7, H, 0, 0.45, STONE_DK);
  F.box('stucco', -len / 2, len / 2, H, H + 0.8, -3.2, 0.5, STONE);
  for (let a = -len / 2 + 0.4; a < len / 2 - 0.9; a += 1.7) {
    F.box('stucco', a, a + 1.0, H + 0.8, H + 1.8, -0.4, 0.5, STONE);
    F.block('stucco', [[a, -0.4], [a + 1.0, -0.4], [a + 1.0, 0.5], [a, 0.5]], [[a + 0.5, 0.05], [a + 0.5, 0.05], [a + 0.5, 0.05], [a + 0.5, 0.05]], H + 1.8, H + 2.4, STONE);
  }
  // Ivy and fig at the foot.
  for (let k = 0; k < 2; k++) if (r() < 0.6) F.blob('leaf', -len / 2 + r() * len, 0.9, 0.9 + r() * 0.7, 0.4, 1.4 + r() * 1.6, 5, pick(r, [rgb(0x3e5a2a), rgb(0x4a6a32)]));
  if (lantern) {
    F.box('metal', -0.05, 0.05, 5.6, 6.4, 0, 0.6, rgb(0x2a2a2e));
    F.box('metal', -0.22, 0.22, 5.0, 5.7, 0.4, 0.84, rgb(0x2a2a2e));
    F.face('winLit', -0.18, 0.18, 5.05, 5.65, 0.86, [2.2, 1.6, 0.8]);
  }
  if (tower) {
    F.cylinder('stucco', 0, -0.4, 4.4, -2, 12, 14, STONE);
    for (let y = 1, k = 0; y < 11.5; y += 0.62, k++) F.cylinder('stucco', 0, -0.4, 4.45, y, y + 0.06, 14, scaleC(STONE_DK, 1.05));
    for (const t of [-0.5, 0.5]) F.face('trim', Math.sin(t) * 4.4 - 0.1, Math.sin(t) * 4.4 + 0.1, 7, 8.6, Math.cos(t) * 4.4 - 0.4 + 0.02, rgb(0x2a2018));
    F.cylinder('stucco', 0, -0.4, 4.8, 12, 12.8, 14, STONE);
    for (let k = 0; k < 12; k++) { const t = (k / 12) * Math.PI * 2, x = Math.cos(t) * 4.5, z = -0.4 + Math.sin(t) * 4.5; F.box('stucco', x - 0.45, x + 0.45, 12.8, 13.9, z - 0.45, z + 0.45, STONE); }
  }
}

/** The Maiden Tower: a 29 m sandstone cylinder with the buttress on its east side. */
function maidenTower(F) {
  F.cylinder('stucco', 0, 0, 8.2, 0, 29, 16, STONE);
  for (let y = 4; y < 28; y += 6) F.cylinder('stucco', 0, 0, 8.35, y, y + 0.5, 16, STONE_DK);
  F.box('stucco', 6, 12, 0, 27, -3.5, 3.5, STONE); // the buttress
  for (const y of [8, 15, 22]) F.face('glass', -0.5, 0.5, y, y + 1.8, 8.3, null);
}

/** Shirvanshah palace: low sandstone halls with ribbed domes. */
function shirvanshah(F) {
  F.box('stucco', -22, 22, 0, 8, -26, 0, STONE);
  for (const [a, b, r] of [[-12, -10, 5], [8, -14, 6], [-2, -20, 4]]) {
    F.cylinder('stucco', a, b, r, 8, 10, 12, STONE);
    for (let k = 0; k < 5; k++) F.cylinder('stucco', a, b, r * (1 - k * 0.19), 10 + k * 1.1, 11.1 + k * 1.1, 12, scaleC(STONE, 1 - k * 0.03));
  }
  F.face('trim', -3, 3, 0, 6.5, 0.02, STONE_DK);
}

/** Government House: the vast U of sandstone with a central tower and spire. */
function governmentHouse(F) {
  F.box('stucco', -80, 80, 0, 30, -26, 0, STONE);
  for (const s of [-1, 1]) F.box('stucco', s * 80 - 22, s * 80 + 22, 0, 30, -90, -26, STONE);
  for (let f = 0; f < 8; f++) {
    const y = 3 + f * 3.4;
    for (let a = -76; a < 76; a += 4) F.face(f % 3 === 0 ? 'winLit' : 'glass', a, a + 2, y, y + 2.2, 0.02, [1, 0.85, 0.6]);
  }
  for (let a = -30; a <= 30; a += 6) F.cylinder('stucco', a, 1.4, 1.1, 0, 22, 8, scaleC(STONE, 1.06)); // the colonnade
  F.box('stucco', -14, 14, 30, 52, -20, -2, STONE);
  F.box('stucco', -9, 9, 52, 64, -16, -6, STONE);
  F.cylinder('metal', 0, -11, 2.2, 64, 78, 8, rgb(0xd8b04a));
  F.box('trim', -82, 82, 30, 31.2, -28, 1, STONE_DK);
}

/** The Carpet Museum: a rolled carpet, half unrolled, in woven reds and blues. */
function carpetMuseum(F) {
  const cols = [rgb(0x9a2a2a), rgb(0x2a3a7a), rgb(0xd8b04a), rgb(0x9a2a2a), rgb(0xe8dcc0)];
  for (let k = 0; k < 18; k++) {
    const t0 = (k / 18) * Math.PI, t1 = ((k + 1) / 18) * Math.PI, R = 9 - k * 0.12;
    const p = (t) => [Math.cos(t) * R, Math.sin(t) * R];
    const [y0, a0] = p(t0), [y1, a1] = p(t1);
    F.block('trim', [[-60 + 0, a0 - 0.6], [60, a0 - 0.6], [60, a0], [-60, a0]], [[-60, a1 - 0.6], [60, a1 - 0.6], [60, a1], [-60, a1]], 9 - y0 * 0.95, 9 - y1 * 0.95, cols[k % cols.length]);
  }
  F.box('trim', -60, 60, 0, 1.2, -9, 9, cols[0]);
  F.box('trim', -60, 60, 0, 0.6, 9, 22, cols[1]); // the unrolled end
  F.face('winLit', -54, 54, 1.5, 6, 9.1, [1, 0.9, 0.7]);
}

/** A Flame Tower: a curving blade of blue glass, narrowing to a point, lit flames at night. */
function flameTower(F, H, W) {
  const n = 22;
  for (let k = 0; k < n; k++) {
    const t0 = k / n, t1 = (k + 1) / n;
    const w = (t) => W * Math.sin(Math.PI * (0.18 + 0.82 * (1 - t))) * (1 - t * 0.55);
    const lean = (t) => Math.sin(t * Math.PI * 0.9) * W * 0.35;
    const q = (t) => [[-w(t) / 2, lean(t) - w(t) * 0.45], [w(t) / 2, lean(t) - w(t) * 0.45], [w(t) / 2 * 0.7, lean(t) + w(t) * 0.45], [-w(t) / 2 * 0.7, lean(t) + w(t) * 0.45]];
    F.block(k % 3 === 2 ? 'winLit' : 'glass', q(t0), q(t1), t0 * H, t1 * H, k % 3 === 2 ? [1.2, 0.55, 0.15] : null);
  }
}

export function buildBakuScene(L) {
  let tx0 = Infinity, tx1 = -Infinity, tz0 = Infinity, tz1 = -Infinity;
  for (let i = 0; i < L.N; i++) { tx0 = Math.min(tx0, L.x[i]); tx1 = Math.max(tx1, L.x[i]); tz0 = Math.min(tz0, L.z[i]); tz1 = Math.max(tz1, L.z[i]); }
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const mpp = 2.234, [ox, oz] = L.fromImage(0, 0);
  const toImg = (x, z) => [(x - ox) / mpp, (z - oz) / mpp];
  // The Caspian shore, in image coordinates: below the boulevard that carries the start straight.
  const COAST = [[-400, 420], [80, 395], [300, 430], [500, 462], [700, 560], [900, 700], [1100, 790], [1500, 900]];
  const coastY = (px) => {
    for (let k = 0; k < COAST.length - 1; k++) {
      const [x0, y0] = COAST[k], [x1, y1] = COAST[k + 1];
      if (px >= x0 && px <= x1) return y0 + ((px - x0) / (x1 - x0)) * (y1 - y0);
    }
    return px < COAST[0][0] ? COAST[0][1] : COAST.at(-1)[1];
  };
  const seaward = (x, z) => { const [px, py] = toImg(x, z); return (py - coastY(px)) * mpp; }; // metres out to sea
  const noise = (x, z) => Math.sin(x * 0.012 + 0.3) * Math.cos(z * 0.01 + 0.8) * 0.6 + Math.sin(x * 0.03 - z * 0.021) * 0.4;
  const img = (px, py) => L.fromImage(px, py);
  const [ocx, ocz] = img(255, 245); // the Old City
  const [hx, hz] = img(-60, 60);    // Highland Park, where the Flame Towers stand
  const sea = [];
  for (let px = -500; px <= 1600; px += 150) {
    const R = 420, [x, z] = img(px, coastY(px) + R);
    sea.push({ x, z, r: R * mpp, y: -0.6, margin: 10, depth: 14, colour: 0x2a6a7a });
  }
  const wetAt = (x, z) => seaward(x, z) > -2;

  return buildRealScene(L, {
    name: 'Baku',
    windowGlow: 0.6,
    seed: 2016,
    margin: 700,
    trackside: { stands: true, suburb: 0, hoardingSpacing: 120, keepOut: (x, z) => seaward(x, z) > -25, skyline: { count: 220, tall: 90, dir: 3.4, spread: 3.2 } },
    pitTheme: {
      wall: rgb(0xe8e4dc),
      upper(F, hw, i, rc, { H1, DEPTH }) {
        const top = H1 + 3.4;
        F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -1.0, rgb(0xf2efe8));
        F.face(i % 3 === 0 ? 'winLit' : 'glass', -hw + 0.3, hw - 0.3, H1 + 0.4, top - 0.4, -0.98, [0.9, 1.15, 1.25]);
        F.box('trim', -hw, hw, top, top + 0.3, -DEPTH, 1.4, rgb(0x00b5e2));
        if (rc) F.box('stucco', -hw + 0.5, hw - 0.5, top + 0.3, top + 4, -DEPTH + 1, -1.2, rgb(0xf4f4f0));
      },
    },
    style: {
      kerb: [rgb(0xf2f1ec), rgb(0xd8242b)],
      runoff: 'brand', runoffFloor: [0.1, 0.1, 0.105],
      barrier: 'jersey', fence: true, lamps: 'street', verge: 'paving',
      sponsors: SPONSORS,
      zoneBrands: ['CASPIAN PETRO', 'FLAME BANK', 'ABSHERON AIR', 'KHAZAR TELECOM', 'BOULEVARD TYRES'],
      primeBrands: ['NARGIZ WATCHES', 'SHIRVAN SILK'],
      title: ['BAKU', 'AZERBAIJAN GRAND PRIX', '#00b5e2', '#ffffff', '#ef3340'],
      bridges: [['CASPIAN PETRO', 'ENERGY OF THE LAND OF FIRE', '#00a3d4', '#ffffff', '#ef3340'], ['FLAME BANK', 'BANKING ON FIRE', '#c8242b', '#ffffff', '#ffb000']],
      roadName: 'BAKU',
      bannerGlow: 0.15,
      boardBorder: '#00b5e2',
    },
    fascia: ['BAKU', 'AZERBAIJAN GRAND PRIX'],
    fasciaColours: ['#00b5e2', '#ffffff', '#ef3340'],
    skirtColour: [0.66, 0.6, 0.48],
    groundKind: 'gravel',
    relief(x, z, d) {
      const inland = -seaward(x, z);
      const up = Math.pow(Math.min(1, Math.max(0, (inland - 150) / 1400)), 1.2) * 60;
      const park = 45 * Math.exp(-((x - hx) ** 2 + (z - hz) ** 2) / (420 * 420)); // Highland Park hill
      const shore = inland < 0 ? -Math.min(10, -inland * 0.2) : 0;
      return (up + park + noise(x, z) * 4) * smooth(25, 170, d) + shore * smooth(10, 40, d);
    },
    colourAt(x, z, h, slope, d) {
      const pave = [0.72, 0.66, 0.56], garden = [0.42, 0.52, 0.3], dust = [0.7, 0.62, 0.48];
      const s = seaward(x, z);
      if (s > -8) return [0.76, 0.72, 0.62];
      if (s > -90) return noise(x * 4, z * 4) > 0 ? garden : pave; // the boulevard park
      let c = d < 260 ? pave : dust;
      if (noise(x * 3, z * 3) > 0.45) c = c.map((v, k) => v + (garden[k] - v) * 0.6);
      if (slope > 0.5) c = c.map((v) => v * 0.88);
      return c;
    },
    water: sea,
    stands: [
      { at: 46, side: 'R', W: 120, tiers: 14, build: bakuStand, offset: 0 },  // the start straight, on the boulevard
      { at: 2, side: 'outside', W: 60, tiers: 12, build: bakuStand },        // T1
      { at: 12, side: 'outside', W: 40, tiers: 10, build: bakuStand },       // T3
      { at: 38, side: 'outside', W: 50, tiers: 10, build: bakuStand },       // T15
      { at: 40, side: 'outside', W: 60, tiers: 12, build: bakuStand },       // T16
      { at: 43, side: 'R', W: 80, tiers: 12, build: bakuStand },             // the boulevard run
    ],
    landmarks({ L, R, frameAt, kit, terrain, placed }) {
      const ps = (k) => L.pointS(k);
      const dry = (x, z) => seaward(x, z) < -150; // the boulevard park stays open along the sea
      const lotOn = (s, side, extra, W, D, margin = 0.8) => {
        const fr = kit.frontage(((s % L.length) + L.length) % L.length, side, extra);
        return kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, W, D, margin, dry);
      };
      const sideToward = (s, x, z) => {
        const i = Math.floor(s / L.ds) % L.N;
        return (x - L.x[i]) * L.nx[i] + (z - L.z[i]) * L.nz[i] > 0 ? 'L' : 'R';
      };
      // ---- the Old City wall along the castle section and the top of the Old City ----
      let wall = 0;
      for (let s = ps(19); s < ps(34); s += 12) {
        const side = sideToward(s, ocx, ocz);
        const F = lotOn(s, side, -1.2, 12.5, 4, 0.1);
        if (F) { wallRun(F, R, 12.5, wall % 4 === 2, wall % 3 === 1); wall++; }
      }
      placed.oldWall = wall;
      // Opposite the wall in the castle (and round T5-T7), the houses stand right on the barrier, their
      // closed timber balconies (shahnishin) and eaves hanging out over the road.
      const tight = [[ps(14), ps(29)]];
      let bays = 0;
      for (const [a, b] of tight) for (let s = a; s < b; s += 11) {
        const inCastle = s > ps(20);
        const side = sideToward(s, ocx, ocz) === 'L' ? 'R' : 'L';
        for (const sd of inCastle ? [side] : ['L', 'R']) {
          const W = 10 + R() * 4, D = 13;
          const F = lotOn(s, sd, -0.4, W, D, 0.05);
          if (!F) continue;
          mansion(F, R, W, D, 4 + Math.floor(R() * 3), true);
          // Overhangs: a jettied first floor, timber bay windows on brackets, a deep cornice.
          F.box('stucco', -W / 2, W / 2, 5.4, 5.8, 0, 1.6, STONE_DK);
          for (let a0 = -W / 2 + 1; a0 < W / 2 - 2.5; a0 += 4.2) {
            const wood = pick(R, [rgb(0x6a4a2a), rgb(0x8a5a32), rgb(0x4a5a3a), rgb(0x5a3a2a)]);
            F.box('trim', a0, a0 + 2.6, 5.8, 9.2, 0, 2.4, wood);
            F.face(R() < 0.4 ? 'winLit' : 'glass', a0 + 0.25, a0 + 2.35, 6.4, 8.8, 2.42, [1, 0.8, 0.55]);
            for (const q of [a0 + 0.3, a0 + 2.3]) F.box('trim', q - 0.12, q + 0.12, 4.6, 5.8, 0, 1.8, wood); // brackets
            bays++;
          }
          F.box('trim', -W / 2 - 0.2, W / 2 + 0.2, 15.6, 16.1, -D, 2.2, STONE_DK);
        }
      }
      placed.bays = bays;
      // Fig and plane trees inside the wall, their crowns hanging out over the castle section.
      for (let s = ps(20); s < ps(28); s += 16) {
        const side = sideToward(s, ocx, ocz), fr = kit.frontage(s, side, 2.5);
        stonePine(frameAt(fr.x, fr.z, R() * 6.28, terrain.heightAt(fr.x, fr.z) + 6), R);
      }
      // Inside the walls: the Old City's sandstone houses, flat roofs, narrow lanes; the Maiden Tower, the palace.
      const [mtx, mtz] = img(300, 320), [shx, shz] = img(210, 215);
      maidenTower(frameAt(mtx, mtz, 0.4, terrain.heightAt(mtx, mtz) - 0.5));
      kit.footprints.push({ cx: mtx, cz: mtz, ux: 1, uz: 0, hw: 14, hd: 12 });
      const SP = kit.lot(shx, shz, 0, 1, 46, 28, 3, dry);
      if (SP) shirvanshah(SP);
      let old = 0;
      for (let pz = img(0, 140)[1]; pz < img(0, 360)[1]; pz += 11) for (let px = img(100, 0)[0]; px < img(380, 0)[0]; px += 11) {
        const x = px + (R() - 0.5) * 3, z = pz + (R() - 0.5) * 3;
        if (terrain.distSmooth(x, z) < 14 || Math.hypot(x - ocx, z - ocz) > 290) continue;
        const W = 7 + R() * 5, D = 7 + R() * 4, yaw = 0.15 + (R() < 0.5 ? 0 : Math.PI / 2);
        const F = kit.lot(x + Math.sin(yaw) * D / 2, z + Math.cos(yaw) * D / 2, Math.sin(yaw), Math.cos(yaw), W, D, 2, dry);
        if (!F) continue;
        cheapBlock(F, R, W, D, 2 + Math.floor(R() * 2), { wall: pick(R, SAND), flat: true, style: 'sand', trim: STONE_DK });
        old++;
      }
      placed.oldCity = old;
      // ---- Government House by T2, the Carpet Museum on the boulevard ----
      const gs = ps(9);
      const GH = lotOn(gs, sideToward(gs, ...img(900, 300)), 8, 170, 92, 2);
      if (GH) { governmentHouse(GH); placed.governmentHouse = 1; }
      const cs = ps(44);
      const CM = lotOn(cs, 'R', 18, 122, 32, 2);
      if (CM) { carpetMuseum(CM); placed.carpetMuseum = 1; }
      // ---- the Flame Towers on the hill ----
      for (const [dx, dz, H, W] of [[0, 0, 182, 46], [70, -40, 160, 42], [-60, -50, 160, 42]]) {
        const x = hx + dx, z = hz + dz, yaw = Math.atan2(ocx - x, ocz - z);
        flameTower(frameAt(x, z, yaw + Math.PI / 2, terrain.heightAt(x, z) - 1), H, W);
        kit.footprints.push({ cx: x, cz: z, ux: 1, uz: 0, hw: W * 0.6, hd: W * 0.6 });
      }
      placed.flameTowers = 3;
      // ---- oil-boom mansions on every street frontage, apartment blocks behind ----
      let blocks = 0;
      for (const side of ['L', 'R']) {
        for (let s = 0; s < L.length; s += 6) {
          const W = 16 + Math.floor(R() * 4) * 3, D = 16 + R() * 6;
          // The 2.2 km run along the boulevard is wide open: the buildings stand back across the avenue.
          const open = s > ps(40) || s < ps(3);
          const F = lotOn(s, side, open ? 9 + R() * 4 : 0.8, W, D);
          if (!F) continue;
          mansion(F, R, W, D, 4 + Math.floor(R() * 4), true);
          blocks++;
          s += W - 6;
          const B = lotOn(s, side, D + 6, W, 16, 1);
          if (B) { cheapBlock(B, R, W, 16, 6 + Math.floor(R() * 5), { wall: pick(R, SAND), flat: R() < 0.5, style: R() < 0.75 ? 'sand' : 'soviet' }); blocks++; }
        }
      }
      // The rest of the city, every free plot out to the edge.
      for (let gz = tz0 - 650; gz < tz1 + 300; gz += 27) for (let gx = tx0 - 650; gx < tx1 + 650; gx += 27) {
        const x = gx + (R() - 0.5) * 9, z = gz + (R() - 0.5) * 9;
        if (!dry(x, z) || seaward(x, z) > -60) continue;
        const d = terrain.distSmooth(x, z);
        if (d < 12 || d > 620 || Math.hypot(x - ocx, z - ocz) < 300) continue;
        const n = d < 140 ? L.nearest(x, z) : null;
        let dirX = 0, dirZ = 1;
        if (n) { const sg = n.lateral > 0 ? 1 : -1; dirX = -L.nx[n.i] * sg; dirZ = -L.nz[n.i] * sg; }
        const W = 14 + R() * 12, D = 13 + R() * 8;
        const F = kit.lot(x + dirX * D / 2, z + dirZ * D / 2, dirX, dirZ, W, D, 1.5, dry);
        if (!F) continue;
        if (d < 55) mansion(F, R, W, D, 4 + Math.floor(R() * 4), false);
        else if (R() < 0.12) cheapBlock(F, R, W, D, 12 + Math.floor(R() * 24), { wall: pick(R, [rgb(0xb8c8d8), rgb(0xa8b8c8), rgb(0xc8d0d8)]), style: 'glass' }); // a modern tower among the old blocks
        else cheapBlock(F, R, W, D, 4 + Math.floor(R() * 6), { wall: pick(R, SAND), flat: R() < 0.6, style: R() < 0.7 ? 'sand' : R() < 0.6 ? 'soviet' : 'stucco' });
        blocks++;
      }
      placed.city = blocks;
      // Big plane trees: an avenue along the boulevard run and the wide streets, crowns over the fences.
      let planes = 0;
      for (const side of ['L', 'R']) for (let s = 0; s < L.length; s += 13) {
        const open = s > ps(40) || s < ps(3);
        if (!open && R() < 0.55) continue;
        const fr = kit.frontage(s, side, 2.2 + R() * 1.5);
        if (!kit.isFree(fr.x, fr.z, 1) || seaward(fr.x, fr.z) > -6 || kit.overlaps({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 1, hd: 1 })) continue;
        const F = frameAt(fr.x, fr.z, R() * 6.28);
        F.mb.color = null;
        oak(F, R); planes++;
      }
      placed.planes = planes;
      // The boulevard: palms and a promenade rail along the sea wall.
      let palms = 0;
      for (let px = -300; px < 1400; px += 9) {
        const [x, z] = img(px, coastY(px) - 6 - R() * 30);
        if (terrain.distSmooth(x, z) < 12 || !kit.isFree(x, z, 3) || seaward(x, z) > -4) continue;
        palm(frameAt(x, z, R() * 6.28), R, 7 + R() * 4);
        palms++;
      }
      placed.palms = palms;
    },
    trees: {
      variants: [palm, stonePine, cypress, oak],
      attempts: 9000,
      scale: [1, 1, 1, 1.4],
      test(x, z, d, h, R) {
        if (d < 14 || seaward(x, z) > -10) return -1;
        const v = R();
        if (seaward(x, z) > -100) return v < 0.35 ? 0 : v < 0.45 ? 2 : v < 0.7 ? 3 : -1;
        return v < 0.1 ? 1 : v < 0.16 ? 2 : v < 0.3 ? 3 : -1;
      },
    },
  });
}
