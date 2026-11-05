import { rgb, scaleC, pick } from '../street/kit.js';
import { standVariety } from './trackside.js';
import { buildRealScene } from './scene.js';
import { venueDressing } from './backOfHouse.js';
import { cheapBlock } from '../street/buildings.js';
import { birch } from '../street/trees.js';
import { grandstand } from '../street/props.js';
import { oak } from './hungaroringScene.js';
import { marquees, bigScreen } from './silverstoneScene.js';
import { beam } from '../night/venue.js';
import { signMaterial, placeSign, letter } from './signs.js';

/*
 * Monza, handcrafted. The circuit runs through the walled Parco di Monza: tall oaks, planes and
 * poplars close round it, so the lap is a tunnel of trees between the stands. The main straight
 * between the pit building and its podium tower, and the Tribuna
 * Centrale; the huge steel stand round the outside of the first chicane, packed with tifosi in red;
 * the yellow Pirelli gantries over the straights (the only things over the track); #ItalianGP boards;
 * green, white and red kerbs and yellow sausage
 * kerbs in the chicanes; gravel at the Curva Grande, the Roggia, the Lesmos and Ascari.
 */

const RED = rgb(0xce2b37), FERRARI = rgb(0xd40000), GREEN = rgb(0x009246), WHITE = rgb(0xf4f4f2), YELLOW = rgb(0xffd100), STEEL = rgb(0x8a929e);
// The tifosi: Ferrari red everywhere, a little yellow, the odd other team.
const SHIRTS = [FERRARI, FERRARI, FERRARI, RED, FERRARI, YELLOW, WHITE, rgb(0xff8000), rgb(0x1b1b1f), FERRARI];

function centrale(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: true, seats: [FERRARI, rgb(0x8a1c1c), WHITE] });
  return { ...gs, shirts: SHIRTS };
}
/** The big steel scaffold stands (Prima Variante, Parabolica): open tiers on a lattice of tubes. */
function scaffoldStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: false, style: 'alu', seats: [rgb(0x8a8e96), FERRARI], fill: 0.97 });
  const depth = tiers * 0.85 + 1.5, top = 1.2 + tiers * 0.55;
  for (let a = -W / 2; a <= W / 2 + 0.01; a += 4) {
    beam(F, 'metal', [a, 0, -depth], [a, top, -depth], 0.12, STEEL);
    if (Math.round(a / 4) % 2) beam(F, 'metal', [a, 0, -depth], [a + 4, top, -depth], 0.06, STEEL);
  }
  for (let y = 2; y < top; y += 2.2) F.box('metal', -W / 2, W / 2, y, y + 0.08, -depth - 0.05, -depth + 0.05, STEEL);
  // Flags of the tifosi along the top rail.
  for (let a = -W / 2 + 3; a < W / 2; a += 9 + r() * 6) {
    F.box('metal', a - 0.03, a + 0.03, top, top + 3.2, -depth + 0.4, -depth + 0.46, STEEL);
    F.box('fabric', a, a + 1.6, top + 2.1, top + 3.1, -depth + 0.42, -depth + 0.44, pick(r, [FERRARI, FERRARI, YELLOW, GREEN]));
  }
  return { ...gs, shirts: SHIRTS };
}
const VARIED = standVariety(scaffoldStand, null, SHIRTS);

/** A Lombardy poplar: a tall, narrow column of leaves. */
function poplar(F, r) {
  const h = 18 + r() * 8;
  beam(F, 'stucco', [0, 0, 0], [0, h * 0.3, 0], 0.35, rgb(0x6a5e4e));
  F.blob('leaf', 0, 0, 2.2 + r(), h * 0.15, h, 8, pick(r, [rgb(0x3a5a2a), rgb(0x46682e), rgb(0x34502a)]));
}

/** A plane tree: mottled trunk, a big round crown. */
function plane(F, r) {
  const h = 16 + r() * 8;
  beam(F, 'stucco', [0, 0, 0], [(r() - 0.5) * 1.5, h * 0.5, (r() - 0.5) * 1.5], 0.55, rgb(0xa8a088));
  for (let k = 0; k < 4; k++) { const t = r() * 6.28, d = r() * 2.5; F.blob('leaf', Math.cos(t) * d, Math.sin(t) * d, 4 + r() * 2, h * 0.42, h, 8, pick(r, [rgb(0x3e5e2c), rgb(0x4a6a30), rgb(0x365428)])); }
}

const VENUE = venueDressing({
  pitSide: 'R', paddock: [-260, 60], tunnel: 170, ring: 170, exits: [0.12, 0.45, 0.75],
  palette: [0xf2f2ee, 0xf2f2ee, 0x1b1b1f, 0xc0c4c8, 0x8a1418, 0x2a4a8a, 0x5a5e64],
  mix: { car: 6, van: 1.5, bus: 1, truck: 0.6 }, density: 10,
  bus: rgb(0xce2b37), gate: rgb(0xce2b37), heli: rgb(0xce2b37), hoarding: rgb(0xce2b37), crane: rgb(0xf2c200),
  liveries: [rgb(0xce2b37), rgb(0x009246), rgb(0xf2f2ee)], busTerminals: 2, sites: 1, hospitality: 7,
  concessions: [8, 26, 44, 62], carParks: 10,
});

export function buildMonzaScene(L) {
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const noise = (x, z) => Math.sin(x * 0.013 + 0.3) * Math.cos(z * 0.011 + 0.8) * 0.6 + Math.sin(x * 0.033 - z * 0.027) * 0.4;
  const clearing = (x, z) => noise(x * 0.4 + 31, z * 0.4 - 7) > 0.72; // lawns of the park, the golf course, car parks

  /** A frame across the track at sample i whose +b faces the oncoming cars; aL/aR: a of the walls (+3 m). */
  const across = (frameAt, i, extra = 3) => {
    const tx = L.tx[i], tz = L.tz[i], yaw = Math.atan2(-tx, -tz);
    const F = frameAt(L.x[i], L.z[i], yaw, L.yAt(i, 0));
    const left = F.r[0] * L.nx[i] + F.r[1] * L.nz[i] > 0 ? 1 : -1;
    const wl = (sd) => Math.min(L.wall[sd][i], L.edge + 6);   // gantries stand at the track's edge, not out at far run-off walls
    return { F, aL: left * (wl('L') + extra), aR: -left * (wl('R') + extra) };
  };

  const rq = [4, 5, 6, 7, 8].map((k) => { const i = L.pointSample[k]; return [L.x[i], L.z[i]]; });
  const rcx = rq.reduce((t, p) => t + p[0], 0) / 5, rcz = rq.reduce((t, p) => t + p[1], 0) / 5;
  const inRettifilo = (x, z) => Math.hypot(x - rcx, z - rcz) < 75 && L.nearest(x, z) && Math.abs(L.nearest(x, z).lateral) < 60;
  return buildRealScene(L, {
    name: 'Monza',
    seed: 1922,
    life: { paddock: true, camping: true, camps: 8, parks: 10 },
    margin: 750,
    trackside: { standBuild: scaffoldStand, shirts: SHIRTS, suburb: 0, standSpacing: 330, hoardings: false },
    pitTheme: {
      wall: rgb(0xeeece6),
      upper(F, hw, i, rc, { H1, DEPTH }) {
        const top = H1 + 4;
        F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -1.0, WHITE);
        F.face(i % 3 === 0 ? 'winLit' : 'glass', -hw + 0.3, hw - 0.3, H1 + 0.4, top - 0.4, -0.98, [1.0, 1.05, 1.1]);
        F.box('trim', -hw, hw, top, top + 0.4, -DEPTH, 1.6, RED);
        F.box('trim', -hw, hw, top - 0.3, top, 1.4, 1.6, GREEN);
        if (rc) F.box('stucco', -hw + 0.5, hw - 0.5, top + 0.4, top + 5, -DEPTH + 1, -1.2, WHITE);
      },
    },
    style: {
      kerb: [GREEN, WHITE, RED, WHITE],
      runoff: 'brand', runoffFields: 1, runoffBoth: 0, runoffFloor: [0.11, 0.115, 0.12],
      barrier: 'armco', fence: true, lamps: 'none', verge: 'grass', edgeTarmac: rgb(0x3f7a3c), edgeBand: rgb(0x3f7a3c), fenceFlaps: true,
      title: ['MONZA', "GRAN PREMIO D'ITALIA", '#009246', '#ffffff', '#ce2b37'],
      roadName: 'MONZA',
      bannerGlow: 0.12,
      boardBorder: '#ce2b37',
    },
    fascia: ['AUTODROMO NAZIONALE MONZA', "GRAN PREMIO D'ITALIA"],
    fasciaColours: ['#009246', '#ffffff', '#ce2b37'],
    skirtColour: [0.24, 0.36, 0.18],
    groundKind: 'grass',
    relief(x, z, d) { return noise(x, z) * 2.5 * smooth(40, 260, d); },
    colourAt(x, z, h, slope, d) {
      if (inRettifilo(x, z)) return [0.72, 0.64, 0.5];   // gravel
      if (d < 30) return [0.34, 0.52, 0.22];
      if (clearing(x, z)) return [0.38, 0.54, 0.24];
      return noise(x * 3, z * 3) > 0.2 ? [0.16, 0.24, 0.12] : [0.22, 0.3, 0.14]; // the floor of the woods
    },
    stands: [
      { at: 0, side: 'L', W: 300, tiers: 24, build: centrale, offset: -50 },       // Tribuna Centrale, opposite the pits
      { at: 6, side: 'outside', W: 240, tiers: 28, build: scaffoldStand },         // Prima Variante: the sea of red
      { at: 11, side: 'outside', W: 140, tiers: 18, build: scaffoldStand },        // Biassono, Curva Grande
      { at: 17, side: 'outside', W: 120, tiers: 18, build: scaffoldStand },        // Roggia
      { at: 22, side: 'outside', W: 110, tiers: 16, build: VARIED },               // Lesmo 1
      { at: 25, side: 'outside', W: 100, tiers: 16, build: VARIED },               // Lesmo 2
      { at: 33, side: 'outside', W: 150, tiers: 18, build: scaffoldStand },        // Ascari
      { at: 40, side: 'outside', W: 280, tiers: 26, build: scaffoldStand },        // Parabolica
    ],
    roads: VENUE.roads,
    landmarks({ L, R, frameAt, kit, terrain, placed, group, bs }) {
      VENUE.dress({ L, R, kit, bs, placed, frameAt });
      const ps = (k) => L.pointS(k);
      // ---- the yellow Pirelli gantries over the straights ----
      const pirelli = signMaterial((g, W, H) => {
        g.fillStyle = '#ffd100'; g.fillRect(0, 0, W, H);
        letter(g, 'PIRELLI', W / 2, H * 0.55, H * 0.72, '#d10a11', { family: '"Arial Black", Arial, sans-serif', italic: true, max: W * 0.86 });
      }, { lit: 0.15 });
      const pzero = signMaterial((g, W, H) => {
        g.fillStyle = '#111111'; g.fillRect(0, 0, W, H);
        letter(g, 'P ZERO', W / 2, H * 0.55, H * 0.66, '#ffd100', { italic: true, max: W * 0.8 });
      }, { lit: 0.15 });
      let gantries = 0;
      for (const k of [2, 28, 36]) {
        const i = L.pointSample[k] % L.N, { F, aL, aR } = across(frameAt, i, 2.5), a0 = Math.min(aL, aR), a1 = Math.max(aL, aR), H = 7.5;
        for (const a of [a0, a1]) { F.box('stucco', a - 1.1, a + 1.1, 0, H + 3.4, -1.1, 1.1, YELLOW); F.box('concrete', a - 1.4, a + 1.4, 0, 0.6, -1.4, 1.4, rgb(0x9a9a96)); }
        F.box('stucco', a0, a1, H, H + 3.4, -1.0, 1.0, YELLOW);                       // the deep yellow beam
        placeSign(group, F, (a0 + a1) / 2, H + 1.7, 1.02, a1 - a0 - 3, 2.8, pirelli);   // facing the cars
        placeSign(group, F, (a0 + a1) / 2, H + 1.7, -1.02, a1 - a0 - 3, 2.8, pzero, Math.PI);
        F.box('neon', a0, a1, H - 0.1, H, -0.6, 0.6, [1.4, 1.3, 1.1]);
        gantries++;
      }
      placed.gantries = gantries;
      // ---- the podium tower beside the main straight (nothing spans the track but the Pirelli gantries) ----
      {
        const i = Math.floor((ps(0) - 45 + L.length) / L.ds) % L.N, { F, aR } = across(frameAt, i, 1);
        const s = Math.sign(aR) || 1, H = 9;
        F.box('stucco', aR + s * 2, aR + s * 12, 0, H + 6, -10, 10, WHITE);
        F.face('glass', aR + s * 2, aR + s * 12, 2, H + 5, 10.02, null);
        F.box('stucco', aR + s * 0.5, aR + s * 2, H, H + 0.6, -8, 8, WHITE);                  // the podium balcony, up to the wall
        F.box('glass', aR + s * 0.5, aR + s * 0.6, H + 0.6, H + 1.6, -8, 8, null);
        placeSign(group, F, aR + s * 7, H + 3.2, 10.08, 9, 1.4, pirelli);
        placed.podium = 1;
      }
      // ---- sausage kerbs on the apexes of the chicanes ----
      let sausages = 0;
      // Built exactly where the layout's physical humps are: yellow, rounded, black-based, in 1.5 m segments.
      for (const side of ['L', 'R']) {
        const sg = side === 'L' ? 1 : -1, W = L.SAUSAGE_W;
        for (let i = 0; i < L.N; i += Math.max(1, Math.round(1.5 / L.ds))) {
          if (!L.sausage[side][i]) continue;
          const p = L.poseAt(i * L.ds, sg * (L.edge + W / 2));
          const F = frameAt(p.x, p.z, p.yaw + Math.PI / 2, L.yAt(i, sg * L.edge));
          F.box('trim', -0.72, 0.72, 0, 0.04, -W / 2 - 0.05, W / 2 + 0.05, rgb(0x1b1b1f));
          F.box('trim', -0.7, 0.7, 0.04, 0.12, -W / 2, W / 2, rgb(0xf2c200));
          F.box('trim', -0.7, 0.7, 0.12, 0.17, -W / 4, W / 4, rgb(0xf2c200));
          F.box('trim', -0.72, -0.62, 0.04, 0.16, -W / 2, W / 2, rgb(0x1b1b1f));
          sausages++;
        }
      }
      placed.sausages = sausages;
      // ---- the Rettifilo, built by hand: two straight armco lines (their collision is in the layout) ----
      for (const w of L.wallLines) {
        for (const [sd, c] of [['L', w.cL], ['R', w.cR]]) {
          const sg = sd === 'L' ? 1 : -1, at = (a) => [w.x0 + w.ux * a + w.uz * c, w.z0 + w.uz * a - w.ux * c];
          // Join the automatic walls just outside the zone to the straight line.
          let ia = -1, ib = -1;
          for (let i = 0; i < L.N; i++) if (L.noWall[sd][i] && !L.noWall[sd][(i - 1 + L.N) % L.N]) ia = (i - 1 + L.N) % L.N;
          for (let i = 0; i < L.N; i++) if (L.noWall[sd][i] && !L.noWall[sd][(i + 1) % L.N]) ib = (i + 1) % L.N;
          const wp = (i) => { const p = L.poseAt(i * L.ds, sg * L.wall[sd][i]); return [p.x, p.z]; };
          const pts = [wp(ia), at(25), at(w.len - 25), wp(ib)];
          const F = frameAt(0, 0, 0, 0);
          for (let k = 0; k < 3; k++) {
            const [x0, z0] = pts[k], [x1, z1] = pts[k + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 4));
            for (let q = 0; q < n; q++) {
              const xa = x0 + (x1 - x0) * q / n, za = z0 + (z1 - z0) * q / n, xb = x0 + (x1 - x0) * (q + 1) / n, zb = z0 + (z1 - z0) * (q + 1) / n;
              const ya = terrain.heightAt(xa, za), yb = terrain.heightAt(xb, zb);
              for (const h of [0.55, 0.85]) beam(F, 'metal', [xa, ya + h, za], [xb, yb + h, zb], 0.16, rgb(0xb8bec6));
              beam(F, 'metal', [xa, ya, za], [xa, ya + 1.0, za], 0.12, rgb(0x6a707a));
              beam(F, 'metal', [xa, ya + 1.0, za], [xa, ya + 4.2, za], 0.06, rgb(0x5a5e66));   // fence post
            }
          }
        }
      }
      // The Rettifilo's interior is all gravel: keep the fans, trucks and paths out of it.
      { const q = [4, 5, 6, 7, 8].map((k) => { const i = L.pointSample[k]; return [L.x[i], L.z[i]]; });
        const cx = q.reduce((t, p) => t + p[0], 0) / q.length, cz = q.reduce((t, p) => t + p[1], 0) / q.length;
        kit.footprints.push({ cx, cz, ux: 1, uz: 0, hw: 70, hd: 70 }); }
      // The Rettifilo's interior is all gravel: keep the fans, trucks and paths out of it.
      { const q = [4, 5, 6, 7, 8].map((k) => { const i = L.pointSample[k]; return [L.x[i], L.z[i]]; });
        const cx = q.reduce((t, p) => t + p[0], 0) / q.length, cz = q.reduce((t, p) => t + p[1], 0) / q.length;
        kit.footprints.push({ cx, cz, ux: 1, uz: 0, hw: 70, hd: 70 }); }
      // ---- the escape road through the Rettifilo, in tarmac, edged white ----
      for (const e of L.escapes) {
        const dx = e.x1 - e.x0, dz = e.z1 - e.z0, len = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
        for (let t = 0; t < len; t += 4) {
          const x = e.x0 + dx * (t + 2) / len, z = e.z0 + dz * (t + 2) / len;
          const nr = L.nearest(x, z);
          if (!nr || Math.abs(nr.lateral) < L.edge + 6) continue;          // only off the track, never across it
          const F = frameAt(x, z, yaw + Math.PI / 2, L.heightAt(x, z));
          F.box('concrete', -2.05, 2.05, 0.05, 0.1, -e.w / 2, e.w / 2, rgb(0x2a2a2e));
          for (const b of [-e.w / 2 + 0.3, e.w / 2 - 0.3]) F.box('concrete', -2.05, 2.05, 0.1, 0.11, b - 0.12, b + 0.12, rgb(0xe8e8e8));
        }
      }
      // ---- hospitality, screens, the tifosi's flags on poles ----
      for (const k of [3, 12, 24, 34, 41]) {
        const s = ps(k), side = L.k[Math.floor(s / L.ds) % L.N] > 0 ? 'R' : 'L';
        const fr = kit.frontage(s, side, 26 + R() * 10), F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 56, 28, 3, null);
        if (F) marquees(F, R, 56, 28);
        const g = kit.frontage(s + 30, side, 4), G = kit.lot(g.x, g.z, g.dirX, g.dirZ, 13, 2, 1, null);
        if (G) bigScreen(G);
      }
      // ---- the park's old buildings: villas and cascine (farmhouses) in ochre with red roofs ----
      let villas = 0;
      const b = terrain.bounds;
      for (let k = 0; k < 400 && villas < 24; k++) {
        const x = b.minX + R() * (b.maxX - b.minX), z = b.minZ + R() * (b.maxZ - b.minZ);
        if (terrain.distSmooth(x, z) < 160 || !clearing(x, z)) continue;
        const W = 24 + R() * 20, D = 12 + R() * 6, F = kit.lot(x, z, 0, 1, W, D, 3, null);
        if (F) { cheapBlock(F, R, W, D, 2 + Math.floor(R() * 2), { wall: pick(R, [rgb(0xe8c88a), rgb(0xe0b878), rgb(0xf0dcb0)]), roof: rgb(0xb05a3a), style: 'stucco', trim: WHITE }); villas++; }
      }
      placed.monza = { villas };
    },
    trees: {
      variants: [oak, plane, poplar, birch],
      attempts: 44000,
      scale: [1.2, 1.1, 1, 0.9],
      test(x, z, d, h, R) {
        if (d < 18) return -1;
        if (clearing(x, z)) return R() < 0.04 ? 1 : -1;
        const v = R();
        return v < 0.5 ? 0 : v < 0.78 ? 1 : v < 0.9 ? 2 : 3; // the park's woods right up to the fences
      },
    },
  });
}
