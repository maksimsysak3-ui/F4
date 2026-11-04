import { rgb, scaleC, pick } from '../street/kit.js';
import { standVariety } from './trackside.js';
import { buildRealScene } from './scene.js';
import { tree, cypress, stonePine } from '../street/trees.js';
import { grandstand } from '../street/props.js';
import { beam } from '../night/venue.js';
import { buildTunnel } from './tunnel.js';
import { createDaySkyline, skin, rect } from './sgCity.js';
import { signMaterial, placeSign, letter } from './signs.js';
import { skinGeo, FACADES } from './facades.js';

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
  return { ...gs, shirts: SHIRTS };
}
const VARIED = standVariety(madStand, null, SHIRTS);

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
  skinGeo(F, r, p, 0, H, pick(r, [FACADES.glass, FACADES.blueGlass, FACADES.white, FACADES.punched]));
  F.box('stucco', -W / 2 - 0.5, W / 2 + 0.5, H, H + 1.2, -D - 0.5, 0.5, rgb(0xd8d6d0));
  F.box('concrete', -W * 0.3, W * 0.3, H + 1.2, H + 4, -D * 0.7, -D * 0.3, rgb(0xa8a8a4));
}

/** A road bridge across the track at its frame: deck, parapets, piers beyond the walls. */
function overpass(F, a0, a1, width, H, col = CONC) {
  F.box('concrete', a0, a1, H, H + 1.4, -width / 2, width / 2, col);
  F.box('concrete', a0, a1, H - 0.7, H, -width / 2 + 1, width / 2 - 1, scaleC(col, 0.6));             // girders
  for (const b of [-width / 2, width / 2 - 0.4]) F.box('concrete', a0, a1, H + 1.4, H + 2.4, b, b + 0.4, col);
  for (let a = a0 + 4; a < a1 - 2; a += 2.4) beam(F, 'metal', [a, H + 2.4, -width / 2 + 0.2], [a, H + 3.6, -width / 2 + 0.2], 0.05, STEEL);
}

export function buildMadringScene(L) {
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
      if (valdebebas(x, z)) return noise(x * 1.6, z * 1.6) > 0.3 ? [0.42, 0.5, 0.26] : [0.66, 0.56, 0.4]; // parks and dust
      return noise(x * 2, z * 2) > 0.2 ? [0.6, 0.52, 0.36] : [0.48, 0.5, 0.3];       // dry grass and earth
    },
    stands: [
      { at: 60, side: 'L', W: 260, tiers: 22, build: madStand },                    // the main straight
      { at: 3, side: 'outside', W: 140, tiers: 18, build: VARIED },                 // T1-T2
      { at: 27, side: 'outside', W: 170, tiers: 32, build: madStand },              // La Monumental: the bullring
      { at: 29, side: 'outside', W: 170, tiers: 32, build: madStand },
      { at: 31, side: 'outside', W: 150, tiers: 30, build: madStand },
      { at: 13, side: 'outside', W: 120, tiers: 16, build: VARIED },
      { at: 47, side: 'outside', W: 110, tiers: 16, build: VARIED },
    ],
    landmarks({ L, R, frameAt, kit, terrain, placed, group }) {
      const ps = (k) => L.pointS(k);
      const across = (s) => {
        const i = Math.floor(((s % L.length) + L.length) % L.length / L.ds) % L.N, tx = L.tx[i], tz = L.tz[i];
        const F = frameAt(L.x[i], L.z[i], Math.atan2(-tx, -tz), L.yAt(i, 0));
        const left = F.r[0] * L.nx[i] + F.r[1] * L.nz[i] > 0 ? 1 : -1;
        return { F, i, aL: left * (L.wall.L[i] + 1.5), aR: -left * (L.wall.R[i] + 1.5) };
      };
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
        for (const a of [a0 - 6, a1 + 6]) F.box('concrete', Math.min(a, a + Math.sign(a) * 12), Math.max(a, a + Math.sign(a) * 12), 0, 10.4, -1, 1.5, rgb(0xd8c8b8));
      }
      // ---- motorway bridges over the climb and the IFEMA return, footbridges by the straight ----
      let bridges = 0;
      for (const [s, width, H, extra, yaw] of [[ps(7) + 20, 26, 8, 30, 0.3], [ps(13) + 10, 34, 9, 40, -0.25], [ps(37), 22, 8, 26, 0.15], [ps(51), 18, 7.5, 24, 0], [ps(55) + 20, 16, 7, 20, 0.2]]) {
        const { F: F0, i, aL, aR } = across(s);
        const F = frameAt(L.x[i], L.z[i], Math.atan2(-L.tx[i], -L.tz[i]) + yaw, L.yAt(i, 0));
        const a0 = Math.min(aL, aR) - extra, a1 = Math.max(aL, aR) + extra;
        overpass(F, a0, a1, width, H);
        for (const a of [Math.min(aL, aR) - 2, Math.max(aL, aR) + 2]) for (const b of [-width / 3, width / 3]) F.cylinder('concrete', a, b, 1.1, -1, H, 10, CONC);
        for (const a of [a0, a1]) F.box('concrete', a - 3, a + 3, -1, H + 1.4, -width / 2, width / 2, rgb(0xb8b4ac));
        bridges++;
      }
      for (const s of [ps(0) - 60, ps(1) + 40, ps(48)]) {
        const { F, aL, aR } = across(s), a0 = Math.min(aL, aR) - 3, a1 = Math.max(aL, aR) + 3, H = 6.5;
        F.box('metal', a0, a1, H, H + 0.4, -1.6, 1.6, STEEL);
        F.box('glass', a0, a1, H + 0.4, H + 1.6, -1.6, -1.45, null); F.box('glass', a0, a1, H + 0.4, H + 1.6, 1.45, 1.6, null);
        F.box('metal', a0, a1, H + 2.8, H + 3.0, -1.8, 1.8, WHITE);
        for (const a of [a0, a1]) F.box('concrete', a - 1.5, a + 1.5, 0, H + 3, -2, 2, CONC);
        F.box('trim', a0, a1, H - 1.2, H, 1.62, 1.7, RED);
        bridges++;
      }
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
      for (const side of ['L', 'R']) for (let s = 0; s < L.length; s += 90) {
        const fr = kit.frontage(s, side, 18 + R() * 20);
        if (valdebebas(fr.x, fr.z) && R() < 0.75) continue;
        const W = 30 + R() * 24, D = 18 + R() * 10, F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, W, D, 3, null);
        if (!F) continue;
        office(F, R, W, D, 18 + R() * R() * 50);
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
      attempts: 12000,
      scale: [1.1, 1, 1],
      test(x, z, d, h, R) {
        if (d < 16 || ifema(x, z)) return d > 16 && R() < 0.06 ? 0 : -1;
        if (valdebebas(x, z)) return R() < 0.12 ? (R() < 0.6 ? 0 : 2) : -1;
        return R() < 0.3 ? (R() < 0.6 ? 0 : R() < 0.5 ? 1 : 2) : -1;
      },
    },
  });
}
