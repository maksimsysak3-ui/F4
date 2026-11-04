import { Mesh, PlaneGeometry } from 'three';
import { rgb, scaleC, pick } from '../street/kit.js';
import { standVariety } from './trackside.js';
import { buildRealScene } from './scene.js';
import { tree, birch } from '../street/trees.js';
import { grandstand } from '../street/props.js';
import { oak } from './hungaroringScene.js';
import { beam } from '../night/venue.js';
import { createDaySkyline, skin, rect } from './sgCity.js';
import { signMaterial, placeSign, letter } from './signs.js';

/*
 * Shanghai International Circuit, handcrafted. Built on reclaimed marsh in Jiading: wide flat
 * parkland, canals and a lake, groves of trees, the lap enormous and open with run-offs the size of
 * car parks in grey tarmac and pale gravel, grass in between. Over the start straight the two "wing"
 * grandstand bridges: each a pair of glass drum towers either side of the track carrying a sweeping
 * white roof high across it, LENOVO on the fascia. The vast main grandstand along the straight, the
 * corner stands in red and purple seats set far back behind the run-offs, the team buildings as
 * pavilions on stilts in the lake behind the pits. "SHANGHAI LET'S MEET" in white on the infield
 * grass; the city's high-rises hazy on the horizon. Red-and-white kerbs, Lenovo's purple hairpin.
 */

const WHITE = rgb(0xf4f4f2), RED = rgb(0xde2910), PURPLE = rgb(0x5a3aa0), STEEL = rgb(0x8a929e);
const SHIRTS = [RED, WHITE, rgb(0x1b1b1f), rgb(0xff8000), rgb(0x00a19b), rgb(0x1f4f9a), rgb(0xe8002d), rgb(0xf2c200)];

function shanghaiStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: r() < 0.5, style: 'steel', seats: [rgb(0xc8202a), PURPLE, rgb(0x2a4aa0)] });
  return { ...gs, shirts: SHIRTS };
}
const VARIED = standVariety(shanghaiStand, null, SHIRTS);

/** The main grandstand: the huge covered stand along the straight, its roof on a row of masts. */
function mainStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: true, style: 'steel', seats: [rgb(0x2a4aa0), rgb(0xc8202a), PURPLE] });
  return { ...gs, shirts: SHIRTS };
}

export function buildChinaScene(L) {
  const img = (px, py) => L.fromImage(px, py);
  const noise = (x, z) => Math.sin(x * 0.013 + 0.3) * Math.cos(z * 0.011 + 0.8) * 0.6 + Math.sin(x * 0.033 - z * 0.027) * 0.4;
  const [lx, lz] = img(560, 470);           // the lake behind the pits, team pavilions over it
  const [kx, kz] = img(600, 300);            // a canal pond in the infield
  const lake = { x: lx, z: lz, r: 70, y: 0.25, margin: 26, depth: 3, colour: 0x4a6a6e, env: 0.5 };
  const pond = { x: kx, z: kz, r: 40, y: 0.25, margin: 26, depth: 3, colour: 0x4a6a6e, env: 0.5 };

  return buildRealScene(L, {
    name: 'China',
    seed: 2004,
    life: { paddock: true, parks: 16, villages: true, paths: true, camping: false },
    margin: 900,
    trackside: { standBuild: shanghaiStand, shirts: SHIRTS, suburb: 0, standSpacing: 360, hoardingSpacing: 120, skyline: { count: 0 } },
    pitTheme: {
      wall: rgb(0xe8e8ea),
      upper(F, hw, i, rc, { H1, DEPTH }) {
        // The pit building: grey glass floors under a white fascia, a terrace on the roof.
        for (let f = 0; f < 2; f++) {
          const y = H1 + f * 4;
          F.box('stucco', -hw, hw, y, y + 0.5, -DEPTH + 0.6, 0.6, WHITE);
          F.face('glass', -hw + 0.2, hw - 0.2, y + 0.5, y + 4, -1.2, null);
        }
        F.box('stucco', -hw, hw, H1 + 8, H1 + 9.4, -DEPTH, 1.0, WHITE);
        F.box('trim', -hw, hw, H1 + 8.2, H1 + 8.6, 1.0, 1.1, RED);
      },
    },
    style: {
      kerb: [RED, WHITE],
      runoff: 'brand', runoffFull: true, runoffFields: 5, runoffBoth: 1, runoffHero: 'LENOVO FIELD', runoffHeroAt: 61, runoffFloor: [0.2, 0.2, 0.21],
      barrier: 'armco', fence: true, lamps: 'none', verge: 'grass', edgeBand: rgb(0x2a8a4a),
      title: ['SHANGHAI', 'CHINESE GRAND PRIX', '#de2910', '#ffffff', '#ffde00'],
      roadName: 'SHANGHAI',
      bannerGlow: 0.12,
      boardBorder: '#de2910',
    },
    fascia: ['SHANGHAI INTERNATIONAL CIRCUIT', 'CHINESE GRAND PRIX'],
    fasciaColours: ['#de2910', '#ffffff', '#ffde00'],
    skirtColour: [0.3, 0.4, 0.24],
    groundKind: 'grass',
    relief(x, z, d) { return noise(x, z) * 0.4; },
    colourAt(x, z, h, slope, d) {
      return noise(x * 2.2, z * 2.2) > 0.3 ? [0.36, 0.5, 0.26] : [0.32, 0.46, 0.22];
    },
    water: [lake, pond],
    stands: [
      { at: 68, side: 'L', W: 360, tiers: 34, build: mainStand },   // the main grandstand along the straight
      { at: 3, side: 'outside', W: 260, tiers: 30, build: shanghaiStand },     // T1, far back behind the tarmac
      { at: 22, side: 'outside', W: 200, tiers: 26, build: shanghaiStand },    // T6 hairpin
      { at: 52, side: 'outside', W: 220, tiers: 26, build: VARIED },           // T13
      { at: 61, side: 'outside', W: 320, tiers: 30, build: shanghaiStand },    // T14: the huge hairpin stand
      { at: 57, side: 'R', W: 200, tiers: 24, build: VARIED },                 // the back straight
    ],
    landmarks({ L, R, frameAt, kit, terrain, placed, group }) {
      const ps = (k) => L.pointS(k);
      // ---- the two wing grandstand bridges over the start straight ----
      const lenovo = signMaterial((g, W, H) => {
        g.fillStyle = '#1b1b1f'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#e2231a'; g.fillRect(W * 0.18, H * 0.12, W * 0.64, H * 0.76);
        letter(g, 'Lenovo 联想', W / 2, H * 0.52, H * 0.56, '#ffffff', { family: '"Helvetica Neue", Arial, sans-serif', font: '700', max: W * 0.6 });
      }, { W: 1024, H: 160, lit: 0.4 });
      let wings = 0;
      for (const s of [ps(68) + 40, ps(69) + 60]) {
        const i = Math.floor(s / L.ds) % L.N, tx = L.tx[i], tz = L.tz[i], y0 = L.yAt(i, 0);
        const F = frameAt(L.x[i], L.z[i], Math.atan2(-tx, -tz), y0);
        const left = F.r[0] * L.nx[i] + F.r[1] * L.nz[i] > 0 ? 1 : -1;
        const aL = left * (L.wall.L[i] + 28), aR = -left * (L.wall.R[i] + 28);
        const H = 46;
        for (const a of [aL, aR]) {
          F.cylinder('glass', a, 0, 11, 0, H, 20, null);                                   // the glass drum tower
          for (let y = 4; y < H; y += 4) F.cylinder('stucco', a, 0, 11.2, y, y + 0.35, 20, scaleC(WHITE, 0.85));
          F.cylinder('stucco', a, 0, 12, H, H + 1.2, 20, WHITE);
        }
        // The wing: a sweeping white roof deck across the track, thick in the middle, thin at the tips.
        const a0 = Math.min(aL, aR) - 22, a1 = Math.max(aL, aR) + 22, mid = (a0 + a1) / 2, half = (a1 - a0) / 2;
        for (let k = 0; k < 16; k++) {
          const ta = a0 + (k / 16) * (a1 - a0), tb = a0 + ((k + 1) / 16) * (a1 - a0), u = Math.abs((ta + tb) / 2 - mid) / half;
          const th = 5.5 - u * 4, yb = H + 2 + u * u * 6;
          F.box('stucco', ta, tb, yb, yb + th, -14 + u * 6, 14 - u * 6, WHITE);
          F.box('stucco', ta, tb, yb - 0.3, yb, -13 + u * 6, 13 - u * 6, rgb(0xb8bcc4));
        }
        placeSign(group, F, mid, H + 4.6, 14.1, 60, 6, lenovo);
        placeSign(group, F, mid, H + 4.6, -14.1, 60, 6, lenovo, Math.PI);
        kit.footprints.push({ cx: L.x[i], cz: L.z[i], ux: 1, uz: 0, hw: 4, hd: 4 });
        wings++;
      }
      // ---- team pavilions on stilts in the lake behind the pits ----
      let pavilions = 0;
      for (let k = 0; k < 10; k++) {
        const t = (k / 10) * Math.PI * 2, x = lx + Math.cos(t) * lake.r * 0.55, z = lz + Math.sin(t) * lake.r * 0.55;
        const F = frameAt(x, z, -t, 0.25);
        for (const [a, b] of [[-5, -5], [5, -5], [5, 5], [-5, 5]]) F.cylinder('concrete', a, b, 0.4, -1, 3, 8, rgb(0x9a9a9a));
        F.box('stucco', -7, 7, 3, 3.6, -7, 7, WHITE);
        F.face('glass', -6, 6, 3.6, 10, 6, null);
        F.box('glass', -6, 6, 3.6, 10, -6, 6, null);
        F.box('stucco', -8, 8, 10, 11, -8, 8, WHITE);
        F.box('trim', -8, 8, 10.6, 11, 7.6, 8.1, pick(R, [RED, PURPLE, rgb(0x00a19b), rgb(0xff8000)]));
        pavilions++;
      }
      kit.footprints.push({ cx: lx, cz: lz, ux: 1, uz: 0, hw: lake.r + 10, hd: lake.r + 10 });
      // ---- "SHANGHAI LET'S MEET" in white on the infield grass inside the snail ----
      {
        const [gx, gz] = img(612, 300);
        const m = signMaterial((g, W, H) => {
          g.clearRect(0, 0, W, H);
          g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.beginPath(); g.arc(W / 2, H * 0.26, H * 0.17, 0, 7); g.stroke();
          letter(g, '上', W / 2, H * 0.27, H * 0.2, '#ffffff', { family: 'serif', font: '700' });
          letter(g, "SHANGHAI LET'S MEET", W / 2, H * 0.72, H * 0.26, '#ffffff', { family: '"Arial Black", Arial, sans-serif', max: W * 0.95 });
        }, { W: 2048, H: 512, transparent: true });
        const mesh = new Mesh(new PlaneGeometry(64, 16), m);
        mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = Math.atan2(L.tz[0], L.tx[0]) * 0;
        mesh.position.set(gx, terrain.heightAt(gx, gz) + 0.06, gz);
        group.add(mesh);
        placed.letsMeet = 1;
      }
      // ---- the city: Jiading's high-rises hazy along the horizon ----
      const S = createDaySkyline(), b = terrain.bounds;
      let towers = 0;
      for (let k = 0; k < 70; k++) {
        const side = k % 3, x = side === 0 ? b.minX - 250 - R() * 500 : b.minX + R() * (b.maxX - b.minX), z = side === 0 ? b.minZ + R() * (b.maxZ - b.minZ) : b.minZ - 300 - R() * 500;
        const F = frameAt(x, z, R() * 6.28, 0), W = 24 + R() * 18, D = 18 + R() * 14, H = 60 + R() * R() * 140, key = pick(R, ['sgGrey', 'sgConc', 'sgConc', 'sgBlue', 'sgTeal']);
        skin(S, F, key, rect(W, D, 0, -D / 2), 0, H, R);
        F.box('concrete', -W / 2 - 0.4, W / 2 + 0.4, H, H + 2, -D - 0.4, 0.4, rgb(0xb8b8b4));
        if (R() < 0.4) F.box('concrete', -W * 0.25, W * 0.25, H + 2, H + 9, -D * 0.7, -D * 0.3, rgb(0xa8a8a4));
        towers++;
      }
      group.add(S.build());
      // ---- groves: tree belts along the canals and round the car parks ----
      placed.china = { wings, pavilions, towers };
    },
    trees: {
      variants: [tree, oak, birch],
      attempts: 22000,
      scale: [1.1, 1.2, 1],
      test(x, z, d, h, R) {
        if (d < 60 || Math.hypot(x - lx, z - lz) < lake.r + 6 || Math.hypot(x - kx, z - kz) < pond.r + 6) return -1;
        const grove = noise(x * 0.9, z * 0.9) > 0.15;
        return grove && R() < 0.55 ? (R() < 0.5 ? 0 : R() < 0.6 ? 1 : 2) : -1;
      },
    },
  });
}
