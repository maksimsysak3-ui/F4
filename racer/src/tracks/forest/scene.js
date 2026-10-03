import {
  Group, Mesh, MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, PlaneGeometry, CircleGeometry, DoubleSide,
} from 'three';
import { MeshBuilder } from '../../car/meshBuilder.js';
import { buildCircuit } from '../street/circuit.js';
import { buildPits } from '../street/pits.js';
import { Frame, rng, rgb, PALETTE, scaleC, pick, underlay, groundPlane } from '../street/kit.js';
import { groundMaterial } from '../../world/ground.js';
import { createTerrain } from '../../world/terrain.js';
import { buildPaddock } from '../paddock.js';
import { teamAtlas, FOREST_SPONSORS } from '../street/textures.js';
import { spruce } from '../street/trees.js';
import { createSceneKit } from '../sceneKit.js';

const WOOD = rgb(0x8a6440), WOOD_DARK = rgb(0x5e4128), SHINGLE = rgb(0x3d3631), STONE = rgb(0x9a958a);

/**
 * Pinewood Ridge: the circuit cut through a spruce forest under snowy peaks.
 * A covered main stand and open bleachers, a full F1 paddock (hospitality,
 * transporters, paddock club, medical and TV compounds), log cabins, a mountain
 * lake, and a forest that thins into a distant canopy.
 */
export function buildForestScene(L) {
  const group = new Group();
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

  // ---- terrain: forested hills; the lake sits in its own basin --------------------
  const hills = (x, z) => Math.sin(x * 0.0071 + 0.3) * Math.cos(z * 0.0063 + 1.1) * 0.6 + Math.sin(x * 0.019 - z * 0.014) * 0.3 + Math.sin(z * 0.043 + x * 0.021) * 0.1;
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lakeFar = (x, z) => (lake.r > 20 ? smooth(lake.r - 10, lake.r + 70, Math.hypot(x - lake.x, z - lake.z)) : 1);
  const terrain = createTerrain(L, {
    margin: 650,
    cell: 10,
    relief: (x, z, d) => hills(x, z) * 16 * smooth(30, 220, d) * lakeFar(x, z) - (1 - lakeFar(x, z)) * 7,
  });
  L.terrainAt = terrain.heightAt;
  const kit = createSceneKit(L, group, { seed: 77, heightAt: terrain.heightAt });
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


  // ---- grandstands: opposite the pits and at the corners -----------------------
  const SEATS = [[rgb(0x2f5a34), rgb(0x3d6e42)], [rgb(0x8a3b2f), rgb(0xa04a3a)], [rgb(0xc9a24a), rgb(0xd8b45a)], [rgb(0x1e5a8a), rgb(0x2a6ea0)]];
  // A covered main stand on the start straight; open aluminium bleachers (no roof, open ends) elsewhere.
  const dryLand = (x, z) => !inLake(x, z, 4);
  kit.standAt(L.length - 110, L.pit.side === 'L' ? 'R' : 'L', 90, { seats: SEATS[0], tiers: 14, test: dryLand });
  const open = { style: 'alu', roof: false, palette: SEATS, test: dryLand, widths: [[72, -18], [58, -14], [44, -10], [32, 6]], tiers: 12, width: 60 };
  kit.cornerStands(open);
  kit.straightStands(open, 230);

  // ---- the paddock: team hospitality, transporters, paddock club, medical and TV compounds ----
  const paddock = buildPaddock(kit, L, rng(4242), (x, z) => !inLake(x, z, 5));

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
    const F = new Frame(kit.builderAt(lake.x, lake.z), lake.x, terrain.heightAt(lake.x, lake.z) + 4.5, lake.z - lake.r + 2, 1, 0);
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
  const gmat = underlay(groundMaterial({ kind: 'grass', base: 0xb4b4b4, dark: 0x909090, light: 0xd4d4d4, tile: 9, macro: 0.4 }), 2);
  gmat.vertexColors = true;
  group.add(terrain.mesh(gmat, (x, z, h, slope, d) => {
    const grass = [0.36, 0.5, 0.24], meadow = [0.42, 0.56, 0.28], needles = [0.3, 0.33, 0.2], rock = [0.48, 0.46, 0.42];
    let c = d < 40 ? meadow : hills(x * 3, z * 3) > 0.1 ? needles : grass;
    if (slope > 0.22) c = c.map((v, k) => v + (rock[k] - v) * Math.min(1, (slope - 0.22) * 3)); // rocky cuttings
    return c;
  }));
  // Beyond the terrain: a skirt out to the horizon at its edge height.
  const skirt = new Mesh(groundPlane(9000, 9000, 60), underlay(groundMaterial({ kind: 'grass', base: 0x4d7432, dark: 0x3b5a26, light: 0x5e8a3e, tile: 20, macro: 0.4 }), 3));
  skirt.position.y = Math.min(terrain.heightAt(terrain.bounds.minX, 0), terrain.heightAt(terrain.bounds.maxX, 0)) - 2;
  group.add(skirt);
  const lakeY = lake.r > 20 ? terrain.heightAt(lake.x, lake.z) + 4.5 : 0;
  if (lake.r > 20) {
    const water = new Mesh(new CircleGeometry(lake.r, 40).rotateX(-Math.PI / 2), new MeshPhysicalMaterial({ color: 0x1d4a5a, roughness: 0.08, metalness: 0.1, clearcoat: 1, envMapIntensity: 1.2 }));
    water.position.set(lake.x, lakeY, lake.z);
    group.add(water);
    const shore = new Mesh(new CircleGeometry(lake.r + 5, 40).rotateX(-Math.PI / 2), underlay(new MeshStandardMaterial({ color: 0x9a8a6a, roughness: 1 })));
    shore.position.set(lake.x, lakeY - 0.6, lake.z);
    shore.visible = false; // the terrain basin forms the shore now
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

  console.info(`[Pinewood Ridge] ${kit.stands.length} grandstands, ${treeCount} trees, ${paddock} paddock buildings, ${cabins} cabins, lake r=${lake.r.toFixed(0)}, ${kit.people} people`);
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
