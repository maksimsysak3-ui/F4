import {
  Group, Mesh, MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, PlaneGeometry, CircleGeometry, DoubleSide,
  CanvasTexture, SRGBColorSpace, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial,
  AdditiveBlending, TorusGeometry, BoxGeometry, CylinderGeometry, Color,
} from 'three';
import { MeshBuilder } from '../../car/meshBuilder.js';
import { buildCircuit } from '../street/circuit.js';
import { buildPits } from '../street/pits.js';
import { Frame, rng, rgb, PALETTE, pick } from '../street/kit.js';
import { teamAtlas, NIGHT_SPONSORS } from '../street/textures.js';
import { palm } from '../street/trees.js';
import { yacht } from '../street/props.js';
import { createSceneKit } from '../sceneKit.js';
import { lightPole, mainGrandstand, hotelShell, stage, foodTruck, parkedCar, footbridge, mediaCentre, circuitTower, gulfBuilding, motorhome, beam, STEEL } from './venue.js';
import { TEAMS } from '../street/textures.js';

/**
 * Lumen Bay International: a purpose-built circuit raced at night under
 * lattice floodlight masts. The main grandstand complex faces the pits, the
 * lattice-shell hotel glows over the marina, the fan zone has a stage, food
 * trucks and the observation wheel, and the car parks are full.
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
      barrier: 'jersey', fence: true, lamps: 'none', verge: 'paving',
      sponsors: NIGHT_SPONSORS,
      zoneBrands: ['NEON NOODLE', 'PIXEL COLA', 'MIDNIGHT ENERGY', 'KATANA MOTORS', 'LUMA TV', 'ORBIT AIR'],
      primeBrands: ['HYPERION', 'SKYLINE TELECOM'],
      title: ['LUMEN BAY', 'NIGHT GRAND PRIX', '#07071a', '#ffffff', '#3b9bff'],
      bridges: [['PIXEL COLA', 'TASTE THE NIGHT', '#e0003a', '#ffffff', '#ffd23f'], ['HYPERION', 'FASTER THAN LIGHT', '#05070f', '#7df9ff', '#3b7bff'], ['ORBIT AIR', 'FLY THE NIGHT', '#f4f1ea', '#1b2a7a', '#e0003a']],
      roadName: 'LUMEN BAY',
      bannerGlow: 0.6,
    },
  });
  group.add(circuit.group);

  const samples = [];
  for (let i = 0; i < L.N; i += 6) samples.push([L.x[i], L.z[i]]);
  const trackDist = (x, z) => { let m = Infinity; for (const [a, b] of samples) m = Math.min(m, (a - x) ** 2 + (b - z) ** 2); return Math.sqrt(m); };
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of samples) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }

  // ---- the marina: the biggest open space -------------------------------------------------
  let bay = { x: 0, z: 0, r: 0 };
  for (let x = minX; x < maxX; x += 15) for (let z = minZ; z < maxZ; z += 15) {
    const d = trackDist(x, z);
    if (d > bay.r) bay = { x, z, r: d };
  }
  bay.r = Math.min(140, bay.r - 45);
  const inBay = (x, z, pad = 0) => bay.r > 20 && Math.hypot(x - bay.x, z - bay.z) < bay.r + pad;
  const dry = (x, z) => !inBay(x, z, 6);
  if (bay.r > 20) kit.footprints.push({ cx: bay.x, cz: bay.z, ux: 1, uz: 0, hw: bay.r + 8, hd: bay.r + 8 });

  const placed = [];
  // ---- main grandstand complex opposite the pits ------------------------------------------
  const opp = L.pit.side === 'L' ? 'R' : 'L';
  {
    const W = 120;
    const fr = kit.frontage(L.length - 40, opp, -3.2);
    const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, W, 34, -1.5, dry);
    if (F) { kit.stands.push({ F, ...mainGrandstand(F, R, W) }); placed.push('main stand'); }
  }
  const SEATS = [[rgb(0x1b2a7a), rgb(0x24369a)], [rgb(0x7a1b2a), rgb(0x9a2436)], [rgb(0x1b6a7a), rgb(0x24879a)], [rgb(0xe0e2e8), rgb(0xc8cad0)]];
  kit.cornerStands({ style: 'tent', roof: true, palette: SEATS, test: dry, widths: [[72, -18], [58, -14], [44, -10], [32, 6]], tiers: 12, width: 60 });
  kit.straightStands({ style: 'tent', palette: SEATS, test: dry, widths: [[72, -18], [58, -14], [44, -10], [32, 6]], tiers: 12, width: 60 }, 200);

  // ---- light poles along the whole lap: slender columns with LED bars over the run-off ----
  let masts = 0;
  const pools = []; // [x, z, radius, strength]: light falling on the ground
  for (const side of ['L', 'R']) {
    for (let s = side === 'L' ? 0 : 19; s < L.length; s += 38) {
      const fr = kit.frontage(s, side, -2.2);
      if (!kit.isFree(fr.x, fr.z, 0.4) || !dry(fr.x, fr.z) || kit.overlaps({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 0.8, hd: 0.8 })) continue;
      kit.footprints.push({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 0.8, hd: 0.8 });
      pools.push([fr.x + fr.dirX * 9, fr.z + fr.dirZ * 9, 17, 0.42]);
      lightPole(new Frame(kit.builderAt(fr.x, fr.z), fr.x, 0, fr.z, fr.dirZ, -fr.dirX), rng(s | 0));
      masts++;
    }
  }

  // ---- hotel, media centre, fan zone, car parks: the biggest free lots near the track -------
  const scanLot = (W, D, extra, from = 0, tries = 200, mk) => {
    for (let k = 0; k < tries; k++) {
      const s = (from + k * 23) % L.length;
      for (const side of ['L', 'R']) {
        const fr = kit.frontage(s, side, extra);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, W, D, 2, dry);
        if (F) { mk(F); return true; }
      }
    }
    return false;
  };
  if (scanLot(70, 34, 18, Math.round(L.length * 0.18), 200, (F) => hotelShell(F, R, 70, 34))) placed.push('hotel');
  if (scanLot(60, 20, 10, Math.round(L.length * 0.02), 120, (F) => mediaCentre(F, R, 60))) placed.push('media');
  const screens = [];
  const fanCrowd = [];
  if (scanLot(56, 52, 8, Math.round(L.length * 0.55), 200, (F) => {
    stage(subFrame(F, 0, -40, 0, F.r[0], F.r[1]), R, screens);
    // Standing crowd facing the stage, food trucks around the edge, picnic tables.
    for (let a = -20; a < 20; a += 0.9) for (let b = -36; b < -14; b += 0.95) if (R() < 0.6) fanCrowd.push({ p: F.at(a + (R() - 0.5) * 0.4, 0.02, b + (R() - 0.5) * 0.4), yaw: Math.atan2(-F.f[0], -F.f[1]), cheer: R() < 0.7 ? 0.6 + R() * 0.4 : 0 });
    for (let k = 0; k < 4; k++) {
      const c = F.at(-24 + k * 16, 0, -6);
      foodTruck(new Frame(F.mb, c[0], 0, c[2], -F.r[0], -F.r[1]), rng(k * 17 + 1));
      for (let q = 0; q < 6; q++) fanCrowd.push({ p: F.at(-24 + k * 16 + (R() - 0.5) * 4, 0.02, -9 - R() * 3), yaw: Math.atan2(F.f[0], F.f[1]) + Math.PI });
    }
  })) placed.push('fan zone');
  kit.addCrowd(fanCrowd, 55);
  let cars = 0;
  for (const from of [0.3, 0.7, 0.85]) {
    scanLot(80, 46, 20, Math.round(L.length * from), 150, (F) => {
      F.box('concrete', -40, 40, 0, 0.02, -46, 0, rgb(0x2c2e34));
      for (let row = 0; row < 4; row++) {
        for (let a = -38; a < 38; a += 2.8) {
          const b = -4 - row * 11 - (row % 2 ? 0 : 1.5);
          F.box('trim', a - 0.05, a + 0.05, 0.02, 0.03, b - 2.5, b + 2.5, rgb(0xd8d8d8));
          if (R() < 0.75) { parkedCar(F, rng(cars * 7 + 3), a + 1.4, b, Math.PI / 2 + (R() - 0.5) * 0.08); cars++; }
        }
      }
      for (let a = -36; a <= 36; a += 18) {
        F.box('metal', a - 0.1, a + 0.1, 0, 9, -23.1, -22.9, STEEL);
        F.box('lampHead', a - 0.8, a + 0.8, 9, 9.25, -23.5, -22.5, null);
        const w = F.at(a, 0, -23);
        pools.push([w[0], w[2], 14, 0.45]);
      }
    });
  }

  // ---- footbridges over the two longest straights --------------------------------------------
  {
    const runs = [];
    let start = null;
    for (let i = 0; i < L.N * 2; i++) {
      const k = Math.abs(L.k[i % L.N]);
      if (k < 1 / 400) { if (start === null) start = i; } else if (start !== null) { runs.push([start, i]); start = null; }
    }
    runs.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
    const used = [];
    for (const [a, b] of runs) {
      const mid = Math.floor((a + b) / 2) % L.N;
      if (used.some((u) => Math.abs(u - mid) < 200) || Math.abs(mid * L.ds - L.length) < 300 || mid * L.ds < 300) continue;
      used.push(mid);
      const span = (L.wall.L[mid] + L.wall.R[mid]) + 4;
      const c = L.poseAt(mid * L.ds, (L.wall.L[mid] - L.wall.R[mid]) / 2);
      footbridge(new Frame(kit.builderAt(c.x, c.z), c.x, 0, c.z, L.nx[mid], L.nz[mid]), span);
      if (used.length >= 2) break;
    }
  }

  // ---- marina: water, quay, pontoons with yachts, palms, lamps, the wheel -----------------
  let wheel = null;
  if (bay.r > 20) {
    const water = new Mesh(new CircleGeometry(bay.r, 56).rotateX(-Math.PI / 2), new MeshPhysicalMaterial({ color: 0x08142a, roughness: 0.04, metalness: 0.25, clearcoat: 1, envMapIntensity: 1.6 }));
    water.position.set(bay.x, -0.4, bay.z);
    group.add(water);
    const H = new Frame(kit.builderAt(bay.x, bay.z), bay.x, 0, bay.z, 1, 0);
    // Quay wall ring and promenade.
    for (let k = 0; k < 56; k++) {
      const t0 = (k / 56) * Math.PI * 2, t1 = ((k + 1) / 56) * Math.PI * 2;
      const ring = (rr, y) => [[Math.cos(t0) * rr, y, Math.sin(t0) * rr], [Math.cos(t1) * rr, y, Math.sin(t1) * rr]];
      const [a0, a1] = ring(bay.r, 0.02), [b0, b1] = ring(bay.r + 9, 0.02);
      H.mb.color = rgb(0x8a8680);
      H.mb.triFacing('concrete', H.at(...a0), H.at(...a1), H.at(...b1), [0, 1, 0]);
      H.mb.triFacing('concrete', H.at(...a0), H.at(...b1), H.at(...b0), [0, 1, 0]);
      H.mb.color = rgb(0x6a6660);
      const [c0, c1] = ring(bay.r, -0.45);
      H.mb.triFacing('concrete', H.at(...c0), H.at(...c1), H.at(...a1), [-Math.cos(t0), 0, -Math.sin(t0)]);
      H.mb.triFacing('concrete', H.at(...c0), H.at(...a1), H.at(...a0), [-Math.cos(t0), 0, -Math.sin(t0)]);
      if (k % 2 === 0) {
        const lp = [Math.cos(t0) * (bay.r + 2.5), Math.sin(t0) * (bay.r + 2.5)];
        H.box('metal', lp[0] - 0.08, lp[0] + 0.08, 0, 5, lp[1] - 0.08, lp[1] + 0.08, STEEL);
        H.box('lampHead', lp[0] - 0.35, lp[0] + 0.35, 5, 5.3, lp[1] - 0.35, lp[1] + 0.35, null);
        pools.push([bay.x + lp[0], bay.z + lp[1], 8, 0.5]);
      }
      if (k % 4 === 1) {
        const pp = [Math.cos(t0) * (bay.r + 6), Math.sin(t0) * (bay.r + 6)];
        palm(new Frame(H.mb, bay.x + pp[0], 0, bay.z + pp[1], 1, 0), rng(k * 11), 8 + (k % 3));
      }
    }
    // Pontoons with yachts, lights along them.
    for (let p = 0; p < 4; p++) {
      const t = -Math.PI / 2 + (p - 1.5) * 0.35;
      const dx = Math.cos(t), dz = Math.sin(t);
      const P = new Frame(H.mb, bay.x + dx * (bay.r - 1), -0.2, bay.z + dz * (bay.r - 1), -dz, dx);
      P.box('trim', -1.2, 1.2, -0.1, 0.12, -bay.r * 0.55, 0, rgb(0x9a7a5a));
      for (let b = -4; b > -bay.r * 0.55; b -= 9) {
        P.box('neon', -1.3, -1.2, 0.12, 0.3, b - 0.1, b + 0.1, [2.4, 2.0, 1.2]);
        for (const side of [-1, 1]) {
          if (R() < 0.2) continue;
          const len = 14 + R() * 12;
          yacht(subFrame(P, side * (2 + len * 0.13), b - 3, -0.75, P.f[0], P.f[1]), rng((p * 97 + b) | 0), len);
        }
      }
    }
    wheel = observationWheel(bay);
    group.add(wheel.group);
  }

  // ---- circuit tower by the start, team motorhomes in the paddock behind the pits ---------
  {
    const fr = kit.frontage(L.length - 110, L.pit.side, 30);
    const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 24, 24, 2, dry);
    if (F) { circuitTower(new Frame(F.mb, ...(() => { const p = F.at(0, 0, -12); return [p[0], 0, p[2]]; })(), F.r[0], F.r[1]), R); placed.push('tower'); }
    let homes = 0;
    for (let s = -55; s < 60; s += 17) {
      const p = kit.frontage(s, L.pit.side, 30);
      const H = kit.lot(p.x, p.z, p.dirX, p.dirZ, 16, 9, 1, dry);
      if (H) { const t = TEAMS[homes % TEAMS.length]; motorhome(H, R, rgb(parseInt(t[1].slice(1), 16))); homes++; }
    }
    placed.push(`${homes} motorhomes`);
  }
  // A Gulf-style village of domed, arched buildings with wind towers around the fan zone side.
  let village = 0;
  for (let k = 0; k < 60 && village < 18; k++) {
    const s = (L.length * 0.5 + k * 61) % L.length;
    const side = k % 2 ? 'L' : 'R';
    const fr = kit.frontage(s, side, 24 + R() * 30);
    const W = 16 + R() * 10, D = 12 + R() * 6;
    const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, W, D, 6, dry);
    if (F) { gulfBuilding(F, rng(k * 13 + 5), W, D); village++; }
  }
  placed.push(`${village} gulf buildings`);
  // Spectator hills at the corners where the stands didn't go.
  let banks = 0;
  for (let i = 0; i < L.N; i += 40) {
    const k = L.k[i];
    if (Math.abs(k) < 1 / 120) continue;
    if (kit.spectatorBank(i * L.ds, k > 0 ? 'R' : 'L', 36, rgb(0x5c7a3a), dry)) banks++;
  }
  placed.push(`${banks} spectator hills`);

  // ---- landscape: lawns and palms along the venue roads, dunes, a distant skyline ---------
  for (let k = 0; k < 2200; k++) {
    const x = minX - 100 + R() * (maxX - minX + 200), z = minZ - 100 + R() * (maxZ - minZ + 200);
    if (!kit.isFree(x, z, 3) || !dry(x, z) || kit.overlaps({ cx: x, cz: z, ux: 1, uz: 0, hw: 2, hd: 2 })) continue;
    if (trackDist(x, z) > 70) continue;
    palm(new Frame(kit.builderAt(x, z), x, 0, z, 1, 0), rng(k * 31), 7 + R() * 4);
  }
  kit.addCrowd(pits.people, 7);
  group.add(dunesAndSkyline(minX, maxX, minZ, maxZ));
  const ground = new Mesh(new PlaneGeometry(7000, 7000).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: 0x8a7254, roughness: 1 }));
  ground.position.y = -0.03;
  group.add(ground);
  const lawn = new Mesh(new PlaneGeometry(maxX - minX + 120, maxZ - minZ + 120).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: 0x3f6a32, roughness: 1 }));
  lawn.position.set((minX + maxX) / 2, -0.025, (minZ + maxZ) / 2);
  group.add(lawn);
  group.add(lightPools(pools));
  const fireworks = new Fireworks(bay.r > 20 ? bay : { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, r: 200 });
  group.add(fireworks.points);

  // ---- materials ----------------------------------------------------------------------------
  const screen = videoScreen();
  const mats = {
    stucco: new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
    trim: new MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }),
    roof: new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: DoubleSide }),
    copper: new MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.45 }),
    metal: new MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.7 }),
    concrete: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
    fabric: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: DoubleSide }),
    leaf: new MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: DoubleSide }),
    glass: new MeshPhysicalMaterial({ color: 0x141c2a, roughness: 0.06, metalness: 0.7, envMapIntensity: 1.3 }),
    winLit: new MeshBasicMaterial({ vertexColors: true }),
    neon: new MeshBasicMaterial({ vertexColors: true }),
    flood: new MeshBasicMaterial({ vertexColors: true }),
    lampHead: new MeshBasicMaterial({ color: new Color(3.0, 2.6, 2.0) }),
    team: new MeshStandardMaterial({ map: teams.tex, emissive: 0xffffff, emissiveMap: teams.tex, emissiveIntensity: 0.6, roughness: 0.6 }),
    screen: new MeshBasicMaterial({ map: screen.tex }),
  };
  const screenMb = new MeshBuilder();
  for (const q of screens) screenMb.quadUV('screen', q[0], q[1], q[2], q[3], [0, 0], [1, 0], [1, 1], [0, 1]);
  group.add(screenMb.build(mats));
  group.add(pitsMb.build(mats));
  kit.finish(mats, ['LUMEN BAY', 'NIGHT GRAND PRIX'], ['#07071a', '#ffffff', '#3b9bff']);

  console.info(`[Lumen Bay] placed: ${placed.join(', ')}; ${kit.stands.length} grandstands, ${masts} floodlight masts, ${cars} parked cars, ${screens.length} stage, marina r=${bay.r.toFixed(0)}, ${kit.people} people`);
  return {
    group,
    update(dt, camera) {
      kit.update(dt, camera);
      if (wheel) wheel.update(dt);
      fireworks.update(dt);
      screen.update(dt);
    },
  };
}

// ---------------------------------------------------------------------------------------------

/** A new frame at (a, b) of F, at height y, with its own 'along' direction (rx, rz). */
function subFrame(F, a, b, y, rx, rz) {
  const p = F.at(a, 0, b);
  return new Frame(F.mb, p[0], y, p[2], rx, rz);
}

/** Soft pools of light on the ground under masts and lamps (additive decals). */
function lightPools(pools) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,240,220,1)');
  grad.addColorStop(0.45, 'rgba(255,232,205,0.45)');
  grad.addColorStop(1, 'rgba(255,225,200,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new CanvasTexture(c);
  const pos = [], uv = [], col = [];
  for (const [x, z, r, k] of pools) {
    const q = [[x - r, z - r, 0, 0], [x + r, z - r, 1, 0], [x + r, z + r, 1, 1], [x - r, z + r, 0, 1]];
    for (const idx of [0, 2, 1, 0, 3, 2]) { pos.push(q[idx][0], 0.06, q[idx][1]); uv.push(q[idx][2], q[idx][3]); col.push(k, k, k); }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new Float32BufferAttribute(col, 3));
  const m = new Mesh(geo, new MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  m.renderOrder = 2;
  return m;
}

/** Stage video wall: an animated light show with the event name. */
function videoScreen() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 192;
  const g = c.getContext('2d');
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  let t = 0, acc = 0;
  const draw = () => {
    const grad = g.createLinearGradient(0, 0, 512, 192);
    const h = (t * 40) % 360;
    grad.addColorStop(0, `hsl(${h}, 90%, 45%)`);
    grad.addColorStop(1, `hsl(${(h + 120) % 360}, 90%, 30%)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 192);
    g.globalAlpha = 0.25;
    for (let k = 0; k < 12; k++) {
      g.fillStyle = '#ffffff';
      g.fillRect(((k * 53 + t * 120) % 560) - 40, 0, 6, 192);
    }
    g.globalAlpha = 1;
    g.fillStyle = '#ffffff';
    g.font = 'italic 900 64px "Arial Black", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('LUMEN BAY', 256, 84);
    g.font = '700 24px Arial';
    g.fillText('NIGHT GRAND PRIX', 256, 140);
    tex.needsUpdate = true;
  };
  draw();
  return { tex, update(dt) { t += dt; acc += dt; if (acc > 0.1) { acc = 0; draw(); } } };
}

/** Dunes rolling away from the venue, and a far city skyline with sparse lights. */
function dunesAndSkyline(minX, maxX, minZ, maxZ) {
  const mb = new MeshBuilder();
  const r = rng(12);
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const R0 = Math.max(maxX - minX, maxZ - minZ) / 2 + 300;
  const N = 64, rings = 10;
  const pt = (i, j) => {
    const t = (i / N) * Math.PI * 2, rr = R0 + j * 160;
    const h = j === 0 ? -0.5 : 6 + Math.sin(t * 7 + j) * 8 + Math.sin(t * 13 - j * 2) * 5 + j * 4 + r() * 3;
    return [cx + Math.cos(t) * rr, h, cz + Math.sin(t) * rr];
  };
  const grid = [];
  for (let j = 0; j <= rings; j++) { grid.push([]); for (let i = 0; i < N; i++) grid[j].push(pt(i, j)); }
  for (let j = 0; j < rings; j++) for (let i = 0; i < N; i++) {
    const a = grid[j][i], b = grid[j][(i + 1) % N], c = grid[j + 1][(i + 1) % N], d = grid[j + 1][i];
    mb.color = (i + j) % 2 ? rgb(0x9a7e5a) : rgb(0x8c714f);
    mb.triFacing('stucco', a, b, c, [0, 1, 0]);
    mb.triFacing('stucco', a, c, d, [0, 1, 0]);
  }
  // Skyline far beyond the dunes on one side.
  for (let k = 0; k < 40; k++) {
    const t = -1.2 + (k / 40) * 1.6 + r() * 0.03, rr = R0 + 1700 + r() * 500;
    const x = cx + Math.cos(t) * rr, z = cz + Math.sin(t) * rr;
    const w = 30 + r() * 40, h = 80 + r() * 220;
    const F = new Frame(mb, x, 0, z, -Math.sin(t), Math.cos(t));
    F.box('stucco', -w / 2, w / 2, 0, h, -w / 2, w / 2, rgb(0x1a1e2a));
    for (let y = 8; y < h - 4; y += 9) if (r() < 0.5) F.box('winLit', -w / 2 + 2, -w / 2 + 2 + r() * (w - 4), y, y + 2, w / 2, w / 2 + 0.5, [1.6, 1.3, 0.9]);
    F.box('neon', -0.6, 0.6, h, h + 1.2, -0.6, 0.6, [3, 0.3, 0.2]);
  }
  return mb.build({ stucco: new MeshStandardMaterial({ vertexColors: true, roughness: 1 }), winLit: new MeshBasicMaterial({ vertexColors: true }), neon: new MeshBasicMaterial({ vertexColors: true }) });
}

/** The Lumen Eye: an observation wheel with warm-white capsules that stay level as it turns. */
function observationWheel(bay) {
  const group = new Group();
  const Rw = 40, cx = bay.x + (bay.r + 30) * 0.7, cz = bay.z - (bay.r + 30) * 0.7;
  const hub = new Group();
  hub.position.set(cx, Rw + 6, cz);
  hub.rotation.y = Math.PI / 4;
  group.add(hub);
  const steel = new MeshStandardMaterial({ color: 0xd8dce4, roughness: 0.3, metalness: 0.8 });
  const warm = new MeshBasicMaterial({ color: new Color(2.2, 2.0, 1.6) });
  const spin = new Group();
  hub.add(spin);
  spin.add(new Mesh(new TorusGeometry(Rw, 0.45, 6, 72), steel));
  spin.add(new Mesh(new TorusGeometry(Rw - 1.8, 0.25, 6, 72), steel));
  for (let k = 0; k < 36; k++) {
    const bulb = new Mesh(new BoxGeometry(0.5, 0.5, 0.5), warm);
    const t = (k / 36) * Math.PI * 2;
    bulb.position.set(Math.cos(t) * (Rw - 0.9), Math.sin(t) * (Rw - 0.9), 0.5);
    spin.add(bulb);
  }
  for (let k = 0; k < 24; k++) {
    const spoke = new Mesh(new BoxGeometry(0.16, Rw, 0.16), steel);
    const t = (k / 24) * Math.PI * 2;
    spoke.rotation.z = t;
    spoke.position.set(-Math.sin(t) * Rw / 2, Math.cos(t) * Rw / 2, 0);
    spin.add(spoke);
  }
  for (const s of [-1, 1]) for (const tt of [-1, 1]) {
    const leg = new Mesh(new BoxGeometry(0.9, Rw + 10, 0.9), steel);
    leg.position.set(s * 13, -(Rw + 6) / 2 + 2, tt * 3.5);
    leg.rotation.z = -s * 0.3;
    hub.add(leg);
  }
  const capsules = [];
  const glass = new MeshPhysicalMaterial({ color: 0x9fb8cc, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.55 });
  const inner = new MeshBasicMaterial({ color: new Color(1.8, 1.6, 1.2) });
  for (let k = 0; k < 28; k++) {
    const cap = new Group();
    cap.add(new Mesh(new CylinderGeometry(1.5, 1.5, 3.6, 12).rotateX(Math.PI / 2), glass));
    cap.add(new Mesh(new BoxGeometry(2.2, 0.15, 3.0), inner));
    hub.add(cap);
    capsules.push({ cap, a: (k / 28) * Math.PI * 2 });
  }
  let angle = 0;
  return {
    group,
    update(dt) {
      angle += dt * 0.04;
      spin.rotation.z = angle;
      for (const c of capsules) c.cap.position.set(Math.cos(c.a + angle) * (Rw + 1.8), Math.sin(c.a + angle) * (Rw + 1.8), 0);
    },
  };
}

/** Fireworks over the marina: shells burst into coloured sparks that fall and fade. */
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
    this.points = new Points(geo, new PointsMaterial({ size: 1.4, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending }));
    this.points.frustumCulled = false;
    this.timer = 3;
    this.next = 0;
  }

  burst() {
    const b = this.bay;
    const t = Math.random() * Math.PI * 2, d = Math.random() * b.r * 0.6;
    const cx = b.x + Math.cos(t) * d, cy = 80 + Math.random() * 50, cz = b.z + Math.sin(t) * d;
    const palette = [[2.6, 0.6, 0.4], [0.5, 1.8, 2.8], [2.6, 2.2, 0.6], [2.2, 0.6, 2.4], [2.6, 2.6, 2.6]];
    const c = palette[Math.floor(Math.random() * palette.length)];
    for (let k = 0; k < 150; k++) {
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
    if (this.timer <= 0) { this.burst(); this.timer = 2.5 + Math.random() * 5; }
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
