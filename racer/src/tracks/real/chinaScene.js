import { Mesh, PlaneGeometry } from 'three';
import { rgb, scaleC, pick } from '../street/kit.js';
import { standVariety, standBack } from './trackside.js';
import { buildRealScene } from './scene.js';
import { venueRoads, venueBackOfHouse } from './backOfHouse.js';
import { sub, VEHICLES, lightMast } from '../backstageProps.js';
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
  if (tiers >= 18) standBack(F, W, tiers, rgb(0xd8dade));
  return { ...gs, shirts: SHIRTS };
}

const VENUE = {
  pitSide: 'R', paddock: [-260, 70], tunnel: 200, ring: 230, exits: [0.12, 0.42, 0.72],
  palette: [0xf2f2ee, 0xf2f2ee, 0x1b1b1f, 0x1b1b1f, 0xc0c4c8, 0x8a1418, 0x2a4a8a],
  mix: { car: 6, van: 1.5, bus: 1, truck: 0.6 }, density: 12,
  bus: RED, gate: RED, heli: RED, hoarding: RED, crane: rgb(0xf2c200),
  liveries: [RED, WHITE, PURPLE], busTerminals: 3, sites: 2, hospitality: 8,
  concessions: [6, 22, 44, 60],
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

export function buildChinaScene(L) {
  let net = {};
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
      runoff: 'brand', runoffFull: true, runoffFields: 2, runoffBoth: 0, runoffHero: 'LENOVO FIELD', runoffHeroAt: 3, runoffFloor: [0.2, 0.2, 0.21],
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
    roads(ctx) { net = venueRoads(ctx, VENUE); },
    landmarks({ L, R, frameAt, kit, terrain, placed, group, bs }) {
      venueBackOfHouse({ L, R, kit, bs, placed, frameAt }, net, VENUE);
      placed.carParks = carParks(bs, net, R, 12);
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
          // The glass drum: lit floors behind the glass, white fins all round, a ring at the top.
          F.cylinder('glass', a, 0, 11, 0, H, 24, null);
          for (let y = 4; y < H; y += 4) { F.cylinder('stucco', a, 0, 11.3, y, y + 0.4, 24, scaleC(WHITE, 0.9)); F.cylinder('winLit', a, 0, 10.9, y + 0.6, y + 3.2, 24, [0.9, 0.95, 1.0]); }
          for (let k = 0; k < 16; k++) { const t = (k / 16) * Math.PI * 2; F.box('stucco', a + Math.cos(t) * 11.2 - 0.25, a + Math.cos(t) * 11.2 + 0.25, 0, H, Math.sin(t) * 11.2 - 0.25, Math.sin(t) * 11.2 + 0.25, WHITE); }
          F.cylinder('stucco', a, 0, 12, H, H + 1.2, 24, WHITE);
        }
        // The wing: one smooth sail across the track, deepest and thickest over the middle, its tips
        // thinning and lifting; a pale grey underside, a lit strip along the leading edge.
        const a0 = Math.min(aL, aR) - 26, a1 = Math.max(aL, aR) + 26, mid = (a0 + a1) / 2, half = (a1 - a0) / 2;
        const prof = (a) => { const u = (a - mid) / half; return { d: 15 - 8 * u * u, yb: H + 2 + 7 * u * u * u * u, t: 5.5 - 4.4 * u * u }; };
        const n = 44;
        for (let k = 0; k < n; k++) {
          const ta = a0 + (k / n) * (a1 - a0), tb = a0 + ((k + 1) / n) * (a1 - a0), A = prof(ta), B = prof(tb);
          const ring = (y, dA, dB, yA, yB) => [F.at(ta, yA, -dA), F.at(tb, yB, -dB), F.at(tb, yB, dB), F.at(ta, yA, dA)];
          F.mb.color = WHITE;
          F.mb.hexa('stucco', ring(0, A.d, B.d, A.yb, B.yb), ring(0, A.d * 0.92, B.d * 0.92, A.yb + A.t, B.yb + B.t));
          F.mb.color = rgb(0xb8bcc4);
          F.mb.hexa('stucco', ring(0, A.d * 0.96, B.d * 0.96, A.yb - 0.25, B.yb - 0.25), ring(0, A.d * 0.96, B.d * 0.96, A.yb, B.yb));
          F.mb.color = [1.6, 1.7, 1.9];
          F.mb.hexa('neon', [F.at(ta, A.yb + 0.2, A.d), F.at(tb, B.yb + 0.2, B.d), F.at(tb, B.yb + 0.2, B.d + 0.15), F.at(ta, A.yb + 0.2, A.d + 0.15)], [F.at(ta, A.yb + 0.5, A.d), F.at(tb, B.yb + 0.5, B.d), F.at(tb, B.yb + 0.5, B.d + 0.15), F.at(ta, A.yb + 0.5, A.d + 0.15)]);
        }
        F.mb.color = null;
        placeSign(group, F, mid, H + 4.6, 15.1, 60, 6, lenovo);
        placeSign(group, F, mid, H + 4.6, -15.1, 60, 6, lenovo, Math.PI);
        kit.footprints.push({ cx: L.x[i], cz: L.z[i], ux: 1, uz: 0, hw: 4, hd: 4 });
        wings++;
      }
      // ---- team pavilions on stilts in the lake behind the pits ----
      let pavilions = 0;
      // Two rows of identical team buildings on stilts over the lake, after the Yuyuan Garden
      // pavilions: a glass box under a deep white roof with upturned eaves, a walkway between rows.
      const TEAM = [rgb(0xe8002d), rgb(0x00a19b), rgb(0xff8000), rgb(0x1e41ff), rgb(0x229971), rgb(0x0093cc), rgb(0xb6babd), rgb(0x52e252), rgb(0x6692ff), rgb(0xffffff)];
      for (let k = 0; k < 10; k++) {
        const row = k % 2 ? 1 : -1, x = lx + (Math.floor(k / 2) - 2) * 26, z = lz + row * 17;
        const F = frameAt(x, z, 0, 0.25);
        for (const [a, b] of [[-7, -6], [7, -6], [7, 6], [-7, 6]]) F.cylinder('concrete', a, b, 0.45, -1, 3, 8, rgb(0x9a9a9a));
        F.box('stucco', -8.5, 8.5, 3, 3.7, -7.5, 7.5, WHITE);
        F.box('glass', -7, 7, 3.7, 10.5, -6, 6, null);
        for (let a = -6; a <= 6; a += 3) F.box('stucco', a - 0.15, a + 0.15, 3.7, 10.5, 5.95, 6.15, WHITE);
        F.face('winLit', -6.8, 6.8, 4.2, 6.6, -6.02, [1.1, 1.05, 0.95], -1);
        F.block('roof', [[-10.5, 9], [10.5, 9], [10.5, -9], [-10.5, -9]], [[-8, 6.5], [8, 6.5], [8, -6.5], [-8, -6.5]], 10.5, 12.2, WHITE);  // the deep roof
        for (const [a, b] of [[-10.5, 9], [10.5, 9], [10.5, -9], [-10.5, -9]]) F.box('stucco', a - 0.4, a + 0.4, 10.3, 11.4, b - 0.4, b + 0.4, WHITE); // upturned eaves
        F.box('trim', -8.5, 8.5, 3.7, 4.1, 7.5, 7.6, TEAM[k]);
        pavilions++;
      }
      { const F = frameAt(lx, lz, 0, 0.25); F.box('concrete', -70, 70, 3, 3.5, -3, 3, rgb(0xd8d6d0)); for (const b of [-3, 3]) F.box('glass', -70, 70, 3.5, 4.6, b - 0.05, b + 0.05, null); }
      kit.footprints.push({ cx: lx, cz: lz, ux: 1, uz: 0, hw: lake.r + 10, hd: lake.r + 10 });
      // ---- "SHANGHAI LET'S MEET" in white on the infield grass inside the snail ----
      {
        const [gx, gz] = img(612, 172);
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
