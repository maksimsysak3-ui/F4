import {
  Group, Mesh, MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, PlaneGeometry, CircleGeometry, DoubleSide,
} from 'three';
import { MeshBuilder } from '../../car/meshBuilder.js';
import { buildCircuit } from '../street/circuit.js';
import { buildPits } from '../street/pits.js';
import { Frame, rng, rgb, PALETTE, scaleC, pick } from '../street/kit.js';
import { teamAtlas, FOREST_SPONSORS } from '../street/textures.js';
import { spruce } from '../street/trees.js';
import { createSceneKit } from '../sceneKit.js';

const WOOD = rgb(0x8a6440), WOOD_DARK = rgb(0x5e4128), SHINGLE = rgb(0x3d3631), STONE = rgb(0x9a958a);

/**
 * Pinewood Ridge: the circuit cut through a spruce forest under snowy peaks.
 * Big roofed grandstands, spectator hills with tents and campers behind, log
 * cabins, a mountain lake, and a forest that thins into a distant canopy.
 */
export function buildForestScene(L) {
  const group = new Group();
  const kit = createSceneKit(L, group, { seed: 77 });
  const R = kit.R;

  // ---- pits and circuit ------------------------------------------------------------
  const teams = teamAtlas();
  const pitsMb = new MeshBuilder();
  const pits = buildPits(L, pitsMb, kit.barrierBack, teams.rows, { wall: rgb(0xd8c39a) });
  kit.footprints.push(...pits.reserved);
  const circuit = buildCircuit(L, {
    isFree: kit.isFree,
    keepClear: pits.zone,
    style: {
      kerb: [rgb(0xf2f1ec), rgb(0x1f8a3a)],
      runoff: 'gravel', barrier: 'armco', fence: false, lamps: 'none', verge: 'grass',
      sponsors: FOREST_SPONSORS,
      zoneBrands: ['ALPENFRESH', 'NORDIC TYRES', 'MOOSE MOTOR OIL', 'TRAILHEAD', 'ACORN COFFEE', 'GLACIER WATER'],
      primeBrands: ['PINECONE BANK', 'TIMBERLINE'],
      title: ['PINEWOOD RIDGE', 'MOUNTAIN GRAND PRIX', '#1f3a26', '#f2ead2', '#c9a24a'],
      bridges: [['ALPENFRESH', 'BREATHE THE PINES', '#1e6fb8', '#ffffff', '#bfe3ff'], ['MOOSE MOTOR OIL', 'SLIPPERY WHEN FAST', '#6b3a1e', '#ffd23f', '#ffd23f']],
      roadName: 'PINEWOOD',
      bannerGlow: 0.12,
    },
  });
  group.add(circuit.group);

  // Coarse distance-to-track for the lake, the canopy and the forest density.
  const samples = [];
  for (let i = 0; i < L.N; i += 8) samples.push([L.x[i], L.z[i]]);
  const trackDist = (x, z) => { let m = Infinity; for (const [a, b] of samples) m = Math.min(m, (a - x) ** 2 + (b - z) ** 2); return Math.sqrt(m); };
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of samples) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }

  // ---- the lake: the clearing furthest from the track inside its bounds -------------
  let lake = { x: 0, z: 0, r: 0 };
  for (let x = minX; x < maxX; x += 20) for (let z = minZ; z < maxZ; z += 20) {
    const d = trackDist(x, z);
    if (d > lake.r) lake = { x, z, r: d };
  }
  lake.r = Math.min(170, lake.r - 45);
  const inLake = (x, z, pad = 0) => lake.r > 20 && Math.hypot(x - lake.x, z - lake.z) < lake.r + pad;

  // ---- grandstands: opposite the pits and at the corners -----------------------
  const SEATS = [[rgb(0x2f5a34), rgb(0x3d6e42)], [rgb(0x8a3b2f), rgb(0xa04a3a)], [rgb(0xc9a24a), rgb(0xd8b45a)], [rgb(0x1e5a8a), rgb(0x2a6ea0)]];
  // A covered main stand on the start straight; open aluminium bleachers (no roof, open ends) elsewhere.
  const dryLand = (x, z) => !inLake(x, z, 4);
  kit.standAt(L.length - 110, L.pit.side === 'L' ? 'R' : 'L', 90, { seats: SEATS[0], tiers: 14, test: dryLand });
  const open = { style: 'alu', roof: false, palette: SEATS, test: dryLand, widths: [[72, -18], [58, -14], [44, -10], [32, 6]], tiers: 12, width: 60 };
  kit.cornerStands(open);
  kit.straightStands(open, 230);

  // ---- spectator hills: fans sit on grassy banks; their tents and campers behind --------
  let hills = 0;
  for (let s = 40; s < L.length; s += 190) {
    for (const side of ['L', 'R']) {
      if (!kit.spectatorBank(s, side, 40, rgb(0x5e8e3e), (x, z) => !inLake(x, z, 5), rgb(0x4d7432))) continue;
      hills++;
      const fr = kit.frontage(s, side, 26);
      const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 34, 14, 1, (x, z) => !inLake(x, z, 5));
      if (!F) continue;
      const r = rng((s * 7 + (side === 'L' ? 3 : 5)) | 0);
      for (let k = 0; k < 4; k++) tent(F, r, -13 + k * 7 + r() * 2, -4 - r() * 3);
      camper(F, r, -8 + r() * 4, -11);
      camper(F, r, 8 + r() * 4, -10);
      for (let a = -14; a <= 14; a += 7) flagpole(F, r, a, -1);
    }
  }
  kit.addCrowd(pits.people, 7);

  // ---- log cabins and the ridge lodge ---------------------------------------------
  {
    const fr = kit.frontage(L.length - 20, L.pit.side === 'L' ? 'R' : 'L', 26);
    const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 30, 18, 3, (x, z) => !inLake(x, z, 4));
    if (F) lodge(F, R);
  }
  let cabins = 0;
  for (let k = 0; k < 400 && cabins < 26; k++) {
    const x = minX - 150 + R() * (maxX - minX + 300), z = minZ - 150 + R() * (maxZ - minZ + 300);
    const d = trackDist(x, z);
    if (d < 45 || d > 200 || inLake(x, z, 12)) continue;
    const t = R() * Math.PI * 2;
    const F = kit.lot(x, z, Math.cos(t), Math.sin(t), 9, 7, 8);
    if (F) { cabin(F, rng(k * 13 + 1)); cabins++; }
  }
  // Jetty and boathouse on the lake.
  if (lake.r > 20) {
    const F = new Frame(kit.builderAt(lake.x, lake.z), lake.x, 0, lake.z - lake.r + 2, 1, 0);
    F.box('trim', -1.2, 1.2, 0.1, 0.3, 0, 22, WOOD);
    for (let b = 1; b < 22; b += 3) for (const a of [-1.1, 1.1]) F.box('trim', a - 0.1, a + 0.1, -1.2, 0.1, b - 0.1, b + 0.1, WOOD_DARK);
  }

  // ---- forest: instanced spruce, pine and birch, dense near the track --------------------
  const trees = [];
  const GAP = 9.5;
  for (let x = minX - 220; x < maxX + 220; x += GAP) {
    for (let z = minZ - 220; z < maxZ + 220; z += GAP) {
      const jx = x + (R() - 0.5) * GAP * 0.9, jz = z + (R() - 0.5) * GAP * 0.9;
      const d = trackDist(jx, jz);
      if (d > 165) continue;
      if (!kit.isFree(jx, jz, 3 + R() * 6) || inLake(jx, jz, 6)) continue;
      if (kit.overlaps({ cx: jx, cz: jz, ux: 1, uz: 0, hw: 2, hd: 2 })) continue;
      // Birches line the clearings; spruce is the forest; a few tall Scots pines poke out.
      const edge = d < 40;
      const roll = R();
      const v = roll < 0.5 ? 0 : 1; // one family: spruce, in two builds
      trees.push({ x: jx, z: jz, v, s: (edge ? 0.7 : 0.85) + R() * 0.45, rot: R() * 6.28, tint: 0.88 + R() * 0.22 });
    }
  }
  const treeMats = {
    stucco: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
    leaf: new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: DoubleSide }),
  };
  const treeCount = kit.forest([(F, r) => spruce(F, r, 15), (F, r) => spruce(F, r, 12)], trees, treeMats);

  // ---- distant canopy, mountains, lake, ground ---------------------------------------
  group.add(canopyAndMountains(trackDist, minX, maxX, minZ, maxZ));
  const ground = new Mesh(new PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: 0x4d7432, roughness: 1 }));
  ground.position.y = -0.03;
  group.add(ground);
  if (lake.r > 20) {
    const water = new Mesh(new CircleGeometry(lake.r, 40).rotateX(-Math.PI / 2), new MeshPhysicalMaterial({ color: 0x1d4a5a, roughness: 0.08, metalness: 0.1, clearcoat: 1, envMapIntensity: 1.2 }));
    water.position.set(lake.x, -0.01, lake.z);
    group.add(water);
    const shore = new Mesh(new CircleGeometry(lake.r + 5, 40).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: 0x9a8a6a, roughness: 1 }));
    shore.position.set(lake.x, -0.02, lake.z);
    group.add(shore);
  }

  // ---- materials ----------------------------------------------------------------------
  const mats = {
    stucco: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
    trim: new MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
    roof: new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
    copper: new MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.45 }),
    metal: new MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.6 }),
    concrete: new MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }),
    fabric: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: DoubleSide }),
    leaf: new MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: DoubleSide }),
    glass: new MeshPhysicalMaterial({ color: 0x1a2532, roughness: 0.08, metalness: 0.6, envMapIntensity: 1.1 }),
    winLit: new MeshBasicMaterial({ vertexColors: true }),
    neon: new MeshBasicMaterial({ vertexColors: true }),
    team: new MeshStandardMaterial({ map: teams.tex, emissive: 0xffffff, emissiveMap: teams.tex, emissiveIntensity: 0.3, roughness: 0.6 }),
  };
  const pg = pitsMb.build(mats);
  group.add(pg);
  kit.finish(mats, ['PINEWOOD RIDGE', 'MOUNTAIN GRAND PRIX'], ['#1f3a26', '#f2ead2', '#c9a24a']);

  console.info(`[Pinewood Ridge] ${kit.stands.length} grandstands, ${treeCount} trees, ${cabins} cabins, lake r=${lake.r.toFixed(0)}, ${kit.people} people`);
  return { group, update: kit.update };
}

/** Log cabin: stacked logs, stone chimney, steep shingle roof, lit windows. */
function cabin(F, r) {
  const W = 8, D = 6, H = 3;
  for (let y = 0; y < H; y += 0.3) F.box('stucco', -W / 2, W / 2, y, y + 0.3, -D, 0, (y / 0.3) % 2 ? WOOD : WOOD_DARK);
  for (const a of [-W / 2, W / 2]) F.box('stucco', a - 0.15, a + 0.15, 0, H, -D - 0.15, 0.15, WOOD_DARK); // corner posts
  F.face(r() < 0.6 ? 'winLit' : 'glass', -2.6, -1.2, 1.0, 2.1, 0.02, [1.3, 0.9, 0.5]);
  F.face(r() < 0.6 ? 'winLit' : 'glass', 1.2, 2.6, 1.0, 2.1, 0.02, [1.3, 0.9, 0.5]);
  F.face('trim', -0.5, 0.5, 0, 2.2, 0.02, WOOD_DARK);
  F.gableRoof('roof', -W / 2, W / 2, -D, 0, H, 2.6, SHINGLE, WOOD, 0.5);
  F.box('stucco', W / 2 - 1.6, W / 2 - 0.8, 0, H + 3.2, -D + 1, -D + 1.8, STONE);
  F.box('trim', -W / 2, W / 2, 0, 0.12, 0.1, 1.8, WOOD); // porch
}

/** Ridge Lodge: a big chalet restaurant with balconies, overlooking the start. */
function lodge(F, r) {
  const W = 28, D = 16;
  F.box('stucco', -W / 2, W / 2, 0, 3.4, -D, 0, STONE);
  F.box('stucco', -W / 2, W / 2, 3.4, 7.2, -D, 0, WOOD);
  for (let a = -W / 2 + 2; a < W / 2 - 1; a += 3) {
    F.face('winLit', a - 0.8, a + 0.8, 0.9, 2.7, 0.02, [1.3, 0.95, 0.6]);
    F.face('winLit', a - 0.8, a + 0.8, 4.2, 6.4, 0.02, [1.3, 0.95, 0.6]);
  }
  F.box('trim', -W / 2, W / 2, 3.4, 3.6, 0, 1.8, WOOD_DARK); // balcony
  for (let a = -W / 2; a <= W / 2; a += 0.5) F.box('trim', a - 0.04, a + 0.04, 3.6, 4.6, 1.7, 1.8, WOOD_DARK);
  F.box('trim', -W / 2, W / 2, 4.6, 4.7, 1.65, 1.85, WOOD_DARK);
  F.gableRoof('roof', -W / 2, W / 2, -D, 0, 7.2, 5, SHINGLE, WOOD, 1.2);
  for (const a of [-W / 4, W / 4]) F.box('stucco', a - 0.6, a + 0.6, 7, 13.5, -D / 2 - 0.6, -D / 2 + 0.6, STONE);
  // Big sign on the gable.
  F.box('trim', -5, 5, 8.2, 9.4, 0.2, 0.35, WOOD_DARK);
  F.face('winLit', -4.6, 4.6, 8.4, 9.2, 0.36, [1.6, 1.3, 0.7]);
}

/** Ridge tent: two fabric slopes on a pole frame. */
function tent(F, r, a, b) {
  const col = pick(r, [rgb(0xe86a2c), rgb(0x2f6b4a), rgb(0x1f4f9a), rgb(0xffc21a), rgb(0xc8242b)]);
  const w = 1.6, l = 2.4, h = 1.3;
  F.mb.color = col;
  for (const s of [-1, 1]) F.mb.quad('fabric', F.at(a + s * w, 0.02, b - l / 2), F.at(a + s * w, 0.02, b + l / 2), F.at(a, h, b + l / 2), F.at(a, h, b - l / 2));
  F.mb.color = scaleC(col, 0.7);
  F.mb.triFacing('fabric', F.at(a - w, 0.02, b + l / 2), F.at(a + w, 0.02, b + l / 2), F.at(a, h, b + l / 2), [F.f[0], 0, F.f[1]]);
}

/** Camper van: boxy body, pop-top, windows, wheels, awning out. */
function camper(F, r, a, b) {
  const col = pick(r, [rgb(0xf2ede2), rgb(0x9bb8a6), rgb(0xe4b65e), rgb(0xd17d74), rgb(0x3f6a8c)]);
  F.box('stucco', a - 2.6, a + 2.6, 0.45, 2.3, b - 1.0, b + 1.0, col);
  F.box('stucco', a - 2.6, a + 2.6, 0.45, 1.2, b - 1.02, b + 1.02, scaleC(col, 0.8));
  F.box('stucco', a - 1.8, a + 1.4, 2.3, 2.7, b - 0.9, b + 0.9, rgb(0xf4f1ea));
  F.face('glass', a + 1.9, a + 2.5, 1.4, 2.0, b + 1.01, null);
  F.face('winLit', a - 1.8, a - 0.4, 1.4, 1.95, b + 1.01, [1.2, 0.9, 0.55]);
  for (const x of [a - 1.7, a + 1.7]) for (const z of [b - 1.0, b + 1.0]) F.cylinder('metal', x, z, 0.38, 0, 0.18, 8, PALETTE.iron);
  F.mb.color = pick(r, PALETTE.parasol);
  F.mb.quad('fabric', F.at(a - 2, 2.2, b + 1.0), F.at(a + 1, 2.2, b + 1.0), F.at(a + 1, 1.9, b + 3.2), F.at(a - 2, 1.9, b + 3.2));
}

function flagpole(F, r, a, b) {
  F.box('metal', a - 0.04, a + 0.04, 0, 5.5, b - 0.04, b + 0.04, PALETTE.iron);
  F.mb.color = pick(r, PALETTE.parasol);
  F.mb.quad('fabric', F.at(a, 4.4, b), F.at(a + 1.6, 4.3, b), F.at(a + 1.6, 5.4, b), F.at(a, 5.5, b));
}

/** The forest thinning into a faceted canopy, then a ring of snow-capped peaks. */
function canopyAndMountains(trackDist, minX, maxX, minZ, maxZ) {
  const mb = new MeshBuilder();
  const r = rng(9);
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const N = 70, ext = Math.max(maxX - minX, maxZ - minZ) / 2 + 700;
  const hAt = new Map();
  const H = (i, j) => {
    const key = i * 1000 + j;
    if (hAt.has(key)) return hAt.get(key);
    const x = cx - ext + (2 * ext * i) / N, z = cz - ext + (2 * ext * j) / N;
    const d = trackDist(x, z);
    // Canopy starts beyond the instanced trees and rises in soft lumps.
    const lift = Math.min(1, Math.max(0, (d - 150) / 35));
    const h = lift * (13 + Math.sin(x * 0.05) * 3 + Math.cos(z * 0.043) * 3 + r() * 3);
    const v = [x, h - 0.5, z];
    hAt.set(key, v);
    return v;
  };
  const COLS = [rgb(0x203f2a), rgb(0x264a2e), rgb(0x2c5232)];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const a = H(i, j), b = H(i + 1, j), c = H(i + 1, j + 1), d = H(i, j + 1);
    if (a[1] < 0 && b[1] < 0 && c[1] < 0 && d[1] < 0) continue;
    mb.color = COLS[(i * 7 + j * 3) % 3];
    mb.triFacing('leaf', a, b, c, [0, 1, 0]);
    mb.triFacing('leaf', a, c, d, [0, 1, 0]);
  }
  // Peaks: faceted cones with snow on top.
  for (let k = 0; k < 16; k++) {
    const t = (k / 16) * Math.PI * 2 + r() * 0.3;
    const dist = ext + 900 + r() * 700;
    const px = cx + Math.cos(t) * dist, pz = cz + Math.sin(t) * dist;
    const h = 150 + r() * 130, rad = 380 + r() * 220;
    const sides = 7;
    const top = [px, h, pz];
    const snowLine = 0.62;
    for (let s = 0; s < sides; s++) {
      const a0 = (s / sides) * Math.PI * 2 + r() * 0.2, a1 = ((s + 1) / sides) * Math.PI * 2;
      const b0 = [px + Math.cos(a0) * rad, -2, pz + Math.sin(a0) * rad], b1 = [px + Math.cos(a1) * rad, -2, pz + Math.sin(a1) * rad];
      const m0 = [lerp3(b0, top, snowLine)], m1 = [lerp3(b1, top, snowLine)];
      const out = [Math.cos((a0 + a1) / 2), 0.5, Math.sin((a0 + a1) / 2)];
      mb.color = s % 2 ? rgb(0x5a6a5e) : rgb(0x4e5d52);
      mb.triFacing('leaf', b0, b1, m1[0], out);
      mb.triFacing('leaf', b0, m1[0], m0[0], out);
      mb.color = rgb(0xeef3f6);
      mb.triFacing('leaf', m0[0], m1[0], top, out);
    }
  }
  return mb.build({ leaf: new MeshStandardMaterial({ vertexColors: true, roughness: 1 }) });
}

const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
