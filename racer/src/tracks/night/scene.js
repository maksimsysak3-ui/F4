import {
  Group, Mesh, MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, PlaneGeometry, CircleGeometry, DoubleSide,
  CanvasTexture, SRGBColorSpace, RepeatWrapping, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial,
  AdditiveBlending, TorusGeometry, BoxGeometry, CylinderGeometry, Color,
} from 'three';
import { MeshBuilder } from '../../car/meshBuilder.js';
import { buildCircuit } from '../street/circuit.js';
import { buildPits } from '../street/pits.js';
import { Frame, rng, rgb, PALETTE, scaleC, pick } from '../street/kit.js';
import { teamAtlas, sponsorAtlas, NIGHT_SPONSORS } from '../street/textures.js';
import { palm } from '../street/trees.js';
import { createSceneKit } from '../sceneKit.js';

const STYLES = 4; // window texture styles

/**
 * Lumen City: a floodlit night race. Towers full of lit windows with LED
 * crowns and aviation lights, podium shops with neon signs, a bay with a
 * giant observation wheel and fireworks, steel grandstands with LED strips.
 * Bright everywhere: the city is the light.
 */
export function buildNightScene(L) {
  const group = new Group();
  const kit = createSceneKit(L, group, { seed: 404 });
  const R = kit.R;

  // ---- pits and circuit ----------------------------------------------------------------
  const teams = teamAtlas();
  const pitsMb = new MeshBuilder();
  const pits = buildPits(L, pitsMb, kit.barrierBack, teams.rows, { wall: rgb(0x3a4050) });
  kit.footprints.push(...pits.reserved);
  const circuit = buildCircuit(L, {
    isFree: kit.isFree,
    keepClear: pits.zone,
    style: {
      kerb: [rgb(0xf2f1ec), rgb(0x1b4fd8)],
      runoff: 'stripes', stripes: [rgb(0x1b3fa8), rgb(0xe8eaf0)],
      barrier: 'jersey', fence: true, lamps: 'flood', verge: 'paving',
      sponsors: NIGHT_SPONSORS,
      zoneBrands: ['NEON NOODLE', 'PIXEL COLA', 'MIDNIGHT ENERGY', 'KATANA MOTORS', 'LUMA TV', 'ORBIT AIR'],
      primeBrands: ['HYPERION', 'SKYLINE TELECOM'],
      title: ['LUMEN CITY', 'NIGHT GRAND PRIX', '#07071a', '#7df9ff', '#ff3fd1'],
      bridges: [['PIXEL COLA', 'TASTE THE NIGHT', '#e0003a', '#ffffff', '#ffd23f'], ['HYPERION', 'FASTER THAN LIGHT', '#05070f', '#7df9ff', '#3b7bff'], ['NEON NOODLE', 'OPEN ALL NIGHT', '#12061e', '#ff3fd1', '#7df9ff']],
      roadName: 'LUMEN CITY',
      bannerGlow: 1.1,
    },
  });
  group.add(circuit.group);

  const samples = [];
  for (let i = 0; i < L.N; i += 8) samples.push([L.x[i], L.z[i]]);
  const trackDist = (x, z) => { let m = Infinity; for (const [a, b] of samples) m = Math.min(m, (a - x) ** 2 + (b - z) ** 2); return Math.sqrt(m); };
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of samples) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }

  // ---- the bay: the biggest open space, with the wheel on its shore ----------------------
  let bay = { x: 0, z: 0, r: 0 };
  for (let x = minX; x < maxX; x += 20) for (let z = minZ; z < maxZ; z += 20) {
    const d = trackDist(x, z);
    if (d > bay.r) bay = { x, z, r: d };
  }
  bay.r = Math.min(150, bay.r - 40);
  const inBay = (x, z, pad = 0) => bay.r > 20 && Math.hypot(x - bay.x, z - bay.z) < bay.r + pad;

  // ---- grandstands: steel with LED strips --------------------------------------------------
  const SEATS = [[rgb(0x1b2a7a), rgb(0x24369a)], [rgb(0x7a1b5a), rgb(0x9a2470)], [rgb(0x1b6a7a), rgb(0x24879a)], [rgb(0x2a2a30), rgb(0x3a3a44)]];
  const LEDS = [[0.4, 1.6, 2.6], [2.6, 0.5, 2.0], [2.4, 2.0, 0.4], [0.5, 2.4, 1.2]];
  kit.standAt(L.length - 130, L.pit.side === 'L' ? 'R' : 'L', 72, { style: 'steel', seats: SEATS[0], led: LEDS[0], test: (x, z) => !inBay(x, z, 3) });
  const cornerOpts = { style: 'steel', roof: true, palette: SEATS, test: (x, z) => !inBay(x, z, 3) };
  kit.cornerStands(cornerOpts);

  kit.roadsideFans(pits.zone, 1.1);
  kit.addCrowd(pits.people, 7);

  // ---- downtown: podium shops by the track, towers behind --------------------------------
  const neonBoards = [];
  let towers = 0, shops = 0;
  for (const side of ['L', 'R']) {
    let s = 0;
    while (s < L.length) {
      const W = 16 + Math.floor(R() * 14), D = 14 + Math.floor(R() * 6);
      const fr = kit.frontage(s + W / 2, side, 1 + R() * 2);
      const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, W, D, 4.5, (x, z) => !inBay(x, z, 4));
      if (F) { podium(F, rng(s * 3 + (side === 'L' ? 1 : 2)), W, D, neonBoards); shops++; }
      s += F ? W + 1 + R() * 3 : 6;
    }
  }
  for (let x = minX - 380; x < maxX + 380; x += 46) {
    for (let z = minZ - 380; z < maxZ + 380; z += 46) {
      const jx = x + (R() - 0.5) * 14, jz = z + (R() - 0.5) * 14;
      const d = trackDist(jx, jz);
      if (d < 28 || inBay(jx, jz, 12)) continue;
      const t = R() < 0.5 ? 0 : Math.PI / 2;
      const W = 20 + R() * 16, D = 20 + R() * 16;
      const F = kit.lot(jx, jz, Math.cos(t + 0.12), Math.sin(t + 0.12), W, D, 9, (px, pz) => !inBay(px, pz, 8));
      if (!F) continue;
      // Taller further from the track: a skyline that rises behind the circuit.
      const H = Math.min(190, 24 + d * 0.32 + R() * 50 + (R() < 0.08 ? 80 : 0));
      tower(F, rng((jx * 13 + jz * 7) | 0), W, D, H);
      towers++;
    }
  }
  // Palms and lamps along the bay promenade.
  if (bay.r > 20) {
    for (let k = 0; k < 40; k++) {
      const t = (k / 40) * Math.PI * 2;
      const x = bay.x + Math.cos(t) * (bay.r + 6), z = bay.z + Math.sin(t) * (bay.r + 6);
      if (!kit.isFree(x, z, 2)) continue;
      palm(new Frame(kit.builderAt(x, z), x, 0, z, 1, 0), rng(k * 7 + 3), 7 + (k % 3));
    }
  }

  // ---- ground, bay water, promenade ---------------------------------------------------------
  const ground = new Mesh(new PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: 0x2a2c34, roughness: 0.85 }));
  ground.position.y = -0.03;
  group.add(ground);
  let wheel = null;
  if (bay.r > 20) {
    const water = new Mesh(new CircleGeometry(bay.r, 48).rotateX(-Math.PI / 2), new MeshPhysicalMaterial({ color: 0x0a1428, roughness: 0.05, metalness: 0.2, clearcoat: 1, envMapIntensity: 1.5 }));
    water.position.set(bay.x, -0.01, bay.z);
    group.add(water);
    const edge = new Mesh(new CircleGeometry(bay.r + 9, 48).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: 0x5a5c66, roughness: 0.9 }));
    edge.position.set(bay.x, -0.02, bay.z);
    group.add(edge);
    // Neon ring around the bay edge.
    const ring = new Mesh(new TorusGeometry(bay.r + 0.5, 0.15, 6, 96).rotateX(Math.PI / 2), new MeshBasicMaterial({ color: new Color(0.3, 1.6, 2.4) }));
    ring.position.set(bay.x, 0.3, bay.z);
    group.add(ring);
    wheel = observationWheel(bay);
    group.add(wheel.group);
  }
  const fireworks = new Fireworks(bay.r > 20 ? bay : { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, r: 200 });
  group.add(fireworks.points);

  // ---- materials ----------------------------------------------------------------------------
  const signs = sponsorAtlas(NIGHT_SPONSORS);
  const winMats = {};
  for (let k = 0; k < STYLES; k++) {
    const tex = windowTexture(k);
    winMats[`win${k}`] = new MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.15, roughness: 0.35, metalness: 0.4 });
  }
  const mats = {
    stucco: new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
    trim: new MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }),
    roof: new MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }),
    copper: new MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.45 }),
    metal: new MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.7 }),
    concrete: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
    fabric: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: DoubleSide }),
    leaf: new MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: DoubleSide }),
    glass: new MeshPhysicalMaterial({ color: 0x141c2a, roughness: 0.06, metalness: 0.7, envMapIntensity: 1.3 }),
    winLit: new MeshBasicMaterial({ vertexColors: true }),
    neon: new MeshBasicMaterial({ vertexColors: true }),
    team: new MeshStandardMaterial({ map: teams.tex, emissive: 0xffffff, emissiveMap: teams.tex, emissiveIntensity: 0.6, roughness: 0.6 }),
    sign: new MeshBasicMaterial({ map: signs.tex }),
    ...winMats,
  };
  // Neon shop signs: quads mapped to the night sponsor atlas.
  const signMb = new MeshBuilder();
  for (const b of neonBoards) {
    const row = b.row % signs.rows;
    signMb.quadUV('sign', b.p[0], b.p[1], b.p[2], b.p[3], [0, row / signs.rows], [b.u, row / signs.rows], [b.u, (row + 1) / signs.rows], [0, (row + 1) / signs.rows]);
  }
  group.add(signMb.build(mats));
  group.add(pitsMb.build(mats));
  kit.finish(mats, ['LUMEN CITY', 'NIGHT GRAND PRIX'], ['#07071a', '#7df9ff', '#ff3fd1']);

  console.info(`[Lumen City] ${kit.stands.length} grandstands, ${towers} towers, ${shops} shops, bay r=${bay.r.toFixed(0)}, ${kit.people} people`);
  return {
    group,
    update(dt, camera) {
      kit.update(dt, camera);
      if (wheel) wheel.update(dt);
      fireworks.update(dt);
    },
  };
}

// ---------------------------------------------------------------------------------------------

/** Night window grid: dark glass with a random pattern of lit offices in one colour temperature. */
function windowTexture(style) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const glass = ['#0b1220', '#101624', '#0d1018', '#14101e'][style];
  const lit = [['#ffd9a0', '#ffe8c4', '#ffc878'], ['#cfe4ff', '#a8c8ff', '#e8f2ff'], ['#ffd9a0', '#9fd8ff', '#fff2d8'], ['#ff9ad8', '#9ae8ff', '#fff0a0']][style];
  g.fillStyle = glass;
  g.fillRect(0, 0, 256, 256);
  const cols = 8, rows = 8, cw = 256 / cols, rh = 256 / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const on = Math.random() < (style === 3 ? 0.4 : 0.55);
      g.fillStyle = on ? lit[Math.floor(Math.random() * lit.length)] : '#1a2234';
      g.globalAlpha = on ? 0.6 + Math.random() * 0.4 : 1;
      g.fillRect(x * cw + 3, y * rh + 4, cw - 6, rh - 9);
    }
  }
  g.globalAlpha = 1;
  // Mullions and floor slabs.
  g.fillStyle = '#05070c';
  for (let y = 0; y < rows; y++) g.fillRect(0, y * rh, 256, 3);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/** Quad wound to face `out`, with UVs. */
function facingQuad(mb, key, a, b, c, d, ua, ub, uc, ud, out) {
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  if (n[0] * out[0] + n[1] * out[1] + n[2] * out[2] >= 0) mb.quadUV(key, a, b, c, d, ua, ub, uc, ud);
  else mb.quadUV(key, a, d, c, b, ua, ud, uc, ub);
}

/** Office/residential tower: window-textured shaft, setback crown, LED band, aviation light. */
function tower(F, r, W, D, H) {
  const style = Math.floor(r() * STYLES);
  const key = `win${style}`;
  const shaft = (w, d, y0, y1, b0) => {
    const corners = [[-w / 2, b0], [w / 2, b0], [w / 2, b0 - d], [-w / 2, b0 - d]];
    for (let k = 0; k < 4; k++) {
      const [a0, c0] = corners[k], [a1, c1] = corners[(k + 1) % 4];
      const len = Math.hypot(a1 - a0, c1 - c0);
      const p = [F.at(a0, y0, c0), F.at(a1, y0, c1), F.at(a1, y1, c1), F.at(a0, y1, c0)];
      const mid = F.at((a0 + a1) / 2, y0, (c0 + c1) / 2), ctr = F.at(0, y0, b0 - d / 2);
      const u = len / 28, v0 = y0 / 28, v1 = y1 / 28; // one texture tile = 8 x 8 windows of 3.5 m
      facingQuad(F.mb, key, p[0], p[1], p[2], p[3], [0, v0], [u, v0], [u, v1], [0, v1], [mid[0] - ctr[0], 0, mid[2] - ctr[2]]);
    }
    F.box('roof', -w / 2, w / 2, y1 - 0.01, y1 + 0.4, b0 - d, b0, rgb(0x1a1d24));
  };
  const podiumH = 8 + r() * 6;
  F.box('stucco', -W / 2, W / 2, 0, podiumH, -D, 0, rgb(0x2a2e38));
  F.face('winLit', -W / 2 + 1, W / 2 - 1, 0.6, podiumH - 1.5, 0.02, [1.2, 1.0, 0.8]);
  const w = W * 0.8, d = D * 0.8;
  shaft(w, d, podiumH, H * 0.82, -D * 0.1);
  const crown = r() < 0.6;
  if (crown) shaft(w * 0.7, d * 0.7, H * 0.82, H, -D * 0.1 - d * 0.15);
  const top = crown ? H : H * 0.82;
  const led = pick(r, [[0.4, 1.8, 2.6], [2.6, 0.5, 2.0], [2.4, 2.2, 0.5], [0.5, 2.6, 1.0], [2.6, 2.6, 2.6]]);
  const cw = crown ? w * 0.7 : w, cd = crown ? d * 0.7 : d, cb = crown ? -D * 0.1 - d * 0.15 : -D * 0.1;
  F.box('neon', -cw / 2 - 0.1, cw / 2 + 0.1, top - 1.2, top - 0.7, cb - cd - 0.1, cb + 0.1, led);
  if (r() < 0.5) {
    F.box('metal', -0.15, 0.15, top, top + 12 + r() * 14, cb - cd / 2 - 0.15, cb - cd / 2 + 0.15, PALETTE.iron);
  }
  F.box('neon', -0.3, 0.3, top + (r() < 0.5 ? 0.4 : 12), top + (r() < 0.5 ? 0.9 : 12.6), cb - cd / 2 - 0.3, cb - cd / 2 + 0.3, [4, 0.3, 0.2]);
}

/** Podium block on the track: shopfronts, awnings, and a neon sign. */
function podium(F, r, W, D, boards) {
  const wall = pick(r, [rgb(0x2a2e38), rgb(0x34303c), rgb(0x2e3a3a), rgb(0x3a3230)]);
  const H = 7 + Math.floor(r() * 3) * 3.4;
  F.box('stucco', -W / 2, W / 2, 0, H, -D, 0, wall);
  // Lit shopfronts with mullions.
  for (let a = -W / 2 + 1; a < W / 2 - 2; a += 4) {
    F.face('winLit', a, a + 3.4, 0.4, 3.4, 0.02, pick(r, [[1.4, 1.1, 0.8], [0.8, 1.2, 1.6], [1.5, 0.8, 1.3]]));
    F.box('trim', a + 3.4, a + 4, 0, 3.6, -0.1, 0.1, rgb(0x15161a));
  }
  // Upper floors: a strip of warm windows per floor.
  for (let y = 4.4; y < H - 1; y += 3.4) F.face('winLit', -W / 2 + 0.8, W / 2 - 0.8, y, y + 1.6, 0.02, r() < 0.5 ? [1.1, 0.9, 0.6] : [0.6, 0.8, 1.2]);
  F.box('trim', -W / 2, W / 2, 3.6, 3.85, 0, 1.6, rgb(0x15161a)); // canopy
  F.box('neon', -W / 2, W / 2, 3.55, 3.62, 1.55, 1.62, pick(r, [[0.4, 1.8, 2.6], [2.6, 0.5, 2.0], [2.4, 2.2, 0.5]]));
  // Neon sign board on the parapet.
  const sw = Math.min(W - 2, 12), y0 = H - 0.2, y1 = H + 2.2;
  F.box('metal', -sw / 2 - 0.2, sw / 2 + 0.2, y0 - 0.1, y1 + 0.1, -0.3, -0.05, PALETTE.iron);
  boards.push({ p: [F.at(-sw / 2, y0, 0.01), F.at(sw / 2, y0, 0.01), F.at(sw / 2, y1, 0.01), F.at(-sw / 2, y1, 0.01)], row: Math.floor(r() * 8), u: Math.min(1, sw / 18) });
}

/** The Lumen Eye: a giant observation wheel with lit capsules that stay level as it turns. */
function observationWheel(bay) {
  const group = new Group();
  const Rw = 42, cx = bay.x + bay.r * 0.55, cz = bay.z - bay.r * 0.2;
  const hub = new Group();
  hub.position.set(cx, Rw + 6, cz);
  group.add(hub);
  const rimMat = new MeshBasicMaterial({ color: new Color(0.6, 1.9, 2.6) });
  const steel = new MeshStandardMaterial({ color: 0xc8ccd4, roughness: 0.3, metalness: 0.8 });
  const spin = new Group();
  hub.add(spin);
  spin.add(new Mesh(new TorusGeometry(Rw, 0.5, 6, 64), rimMat));
  spin.add(new Mesh(new TorusGeometry(Rw - 2, 0.25, 6, 64), steel));
  for (let k = 0; k < 24; k++) {
    const spoke = new Mesh(new BoxGeometry(0.18, Rw, 0.18), steel);
    spoke.rotation.z = (k / 24) * Math.PI * 2;
    spoke.position.set(Math.sin(-spoke.rotation.z) * Rw / 2, Math.cos(spoke.rotation.z) * Rw / 2, 0);
    spin.add(spoke);
  }
  // Legs.
  for (const s of [-1, 1]) {
    for (const t of [-1, 1]) {
      const leg = new Mesh(new BoxGeometry(0.8, Rw + 8, 0.8), steel);
      leg.position.set(cx + s * 14, (Rw + 6) / 2, cz + t * 3);
      leg.rotation.z = -s * 0.32;
      group.add(leg);
    }
  }
  const capsules = [];
  const capMat = [new MeshBasicMaterial({ color: new Color(2.4, 1.8, 1.0) }), new MeshBasicMaterial({ color: new Color(1.0, 1.6, 2.6) }), new MeshBasicMaterial({ color: new Color(2.4, 0.8, 2.0) })];
  for (let k = 0; k < 28; k++) {
    const cap = new Mesh(new CylinderGeometry(1.4, 1.4, 3.2, 10).rotateX(Math.PI / 2), capMat[k % 3]);
    hub.add(cap);
    capsules.push({ mesh: cap, a: (k / 28) * Math.PI * 2 });
  }
  let angle = 0;
  return {
    group,
    update(dt) {
      angle += dt * 0.05;
      spin.rotation.z = angle;
      for (const c of capsules) c.mesh.position.set(Math.cos(c.a + angle) * (Rw + 1.6), Math.sin(c.a + angle) * (Rw + 1.6), 0);
    },
  };
}

/** Fireworks over the bay: shells burst into coloured sparks that fall and fade. */
class Fireworks {
  constructor(bay) {
    this.bay = bay;
    this.max = 1800;
    this.pos = new Float32Array(this.max * 3);
    this.col = new Float32Array(this.max * 3);
    this.vel = new Float32Array(this.max * 3);
    this.life = new Float32Array(this.max);
    this.base = new Float32Array(this.max * 3);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new Float32BufferAttribute(this.col, 3));
    this.points = new Points(geo, new PointsMaterial({ size: 1.6, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending }));
    this.points.frustumCulled = false;
    this.timer = 1;
    this.next = 0;
  }

  burst() {
    const b = this.bay;
    const t = Math.random() * Math.PI * 2, d = Math.random() * b.r * 0.6;
    const cx = b.x + Math.cos(t) * d, cy = 70 + Math.random() * 50, cz = b.z + Math.sin(t) * d;
    const palette = [[2.6, 0.6, 0.4], [0.5, 1.8, 2.8], [2.6, 2.2, 0.6], [2.2, 0.6, 2.4], [0.6, 2.6, 0.9], [2.6, 2.6, 2.6]];
    const c = palette[Math.floor(Math.random() * palette.length)];
    for (let k = 0; k < 160; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.max;
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = 14 + Math.random() * 6;
      const r = Math.sqrt(1 - u * u);
      this.pos.set([cx, cy, cz], i * 3);
      this.vel.set([Math.cos(a) * r * s, u * s, Math.sin(a) * r * s], i * 3);
      this.base.set(c, i * 3);
      this.life[i] = 1;
    }
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer <= 0) { this.burst(); this.timer = 0.8 + Math.random() * 2.2; }
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt * 0.45;
      const k = i * 3;
      this.vel[k + 1] -= 9.8 * dt * 0.5;
      for (let a = 0; a < 3; a++) { this.vel[k + a] *= 1 - dt * 0.8; this.pos[k + a] += this.vel[k + a] * dt; }
      const f = Math.max(0, this.life[i]);
      for (let a = 0; a < 3; a++) this.col[k + a] = this.base[k + a] * f * f;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
