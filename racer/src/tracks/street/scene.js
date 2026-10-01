import {
  Group, Mesh, MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, PlaneGeometry, DoubleSide,
  InstancedMesh, BoxGeometry, Matrix4, Color, ConeGeometry, AdditiveBlending,
} from 'three';
import { mergeGeometries } from './merge.js';
import { MeshBuilder } from '../../car/meshBuilder.js';
import { buildCircuit } from './circuit.js';
import { ARCHETYPES, Frame, rng, rgb, PALETTE } from './buildings.js';
import { palm, tree, grandstand, yacht, lighthouse, CROWD } from './props.js';
import { titleBanner } from './textures.js';

/**
 * Porto Vela: the circuit plus the town around it. Everything is laid out from
 * the shared layout so buildings never encroach on the track corridor.
 */
export function buildStreetScene(L) {
  const group = new Group();
  const R = rng(1906);
  const TILE = 300;

  // ---- spatial rules -------------------------------------------------------
  const tecAt = (side, i, t) => (L.at(L.wall[side], i, t) - L.edge > 4.2 ? 0.95 : 0);
  /** True if (x, z) is clear of every track corridor by `margin` metres beyond the barrier's back face. */
  const isFree = (x, z, margin) => {
    const n = L.nearest(x, z);
    if (!n) return true;
    const side = n.lateral > 0 ? 'L' : 'R';
    return Math.abs(n.lateral) > L.at(L.wall[side], n.i, n.t) + tecAt(side, n.i, n.t) + 0.62 + margin;
  };

  // Harbour basin and coastline (image space -> world).
  const [hx0, hz0] = L.fromImage(330, 418);
  const [hx1] = L.fromImage(965, 418);
  const [, coastZ] = L.fromImage(0, 702);
  const inWater = (x, z, pad = 0) => z > coastZ - pad || (x > hx0 - pad && x < hx1 + pad && z > hz0 - pad);

  // ---- circuit -------------------------------------------------------------
  const circuit = buildCircuit(L, { isFree });
  group.add(circuit.group);

  // ---- chunked city builders ----------------------------------------------
  const chunks = new Map();
  const builderAt = (x, z) => {
    const key = `${Math.floor(x / TILE)},${Math.floor(z / TILE)}`;
    if (!chunks.has(key)) chunks.set(key, new MeshBuilder());
    return chunks.get(key);
  };
  const footprints = [];
  const overlaps = (fp) => footprints.some((o) => obbOverlap(o, fp));

  /** Try to place a building; returns true on success. */
  function place(kind, cx, cz, dirX, dirZ, W, D, floors, opts = {}) {
    // Frame origin at the facade centre; the body extends behind it (away from the street).
    const ox = cx, oz = cz;
    const rx = dirZ, rz = -dirX; // along the facade
    const corners = [[-W / 2, 0], [W / 2, 0], [W / 2, -D], [-W / 2, -D], [0, -D / 2], [-W / 2, -D / 2], [W / 2, -D / 2], [0, 0]];
    const fp = { cx: ox - dirX * D / 2, cz: oz - dirZ * D / 2, ux: rx, uz: rz, hw: W / 2 + 0.8, hd: D / 2 + 0.8 };
    for (const [a, b] of corners) {
      const x = ox + rx * a + dirX * b, z = oz + rz * a + dirZ * b;
      if (!isFree(x, z, opts.margin ?? 4.5) || inWater(x, z, 3)) return false;
    }
    if (overlaps(fp)) return false;
    footprints.push(fp);
    const mb = builderAt(ox, oz);
    const F = new Frame(mb, ox, 0, oz, rx, rz);
    ARCHETYPES[kind](F, rng(Math.floor(R() * 1e9)), { width: W, depth: D, floors, detail: opts.detail ?? true });
    return true;
  }

  // ---- landmarks and grandstands first (they get the best spots) -----------
  const sAtImage = (px, py) => { const [x, z] = L.fromImage(px, py); return L.nearest(x, z).s; };
  const frontage = (s, side, extra = 0) => {
    const f = s / L.ds;
    const i = Math.floor(f) % L.N, t = f - Math.floor(f);
    const sg = side === 'L' ? 1 : -1;
    const lat = L.at(L.wall[side], i, t) + tecAt(side, i, t) + 0.62 + 4.6 + extra;
    const p = L.poseAt(s, sg * lat);
    return { x: p.x, z: p.z, dirX: -L.nx[i] * sg, dirZ: -L.nz[i] * sg, i };
  };

  const stands = [];
  const standAt = (s, side, W) => {
    const fr = frontage(s, side, -3.2);
    const rx = fr.dirZ, rz = -fr.dirX;
    const fp = { cx: fr.x - fr.dirX * 5, cz: fr.z - fr.dirZ * 5, ux: rx, uz: rz, hw: W / 2, hd: 6 };
    if (overlaps(fp)) return;
    for (const [a, b] of [[-W / 2, -0.5], [W / 2, -0.5], [W / 2, -10], [-W / 2, -10], [0, -10]]) {
      if (!isFree(fr.x + rx * a + fr.dirX * b, fr.z + rz * a + fr.dirZ * b, 0.3)) return;
    }
    footprints.push(fp);
    const mb = builderAt(fr.x, fr.z);
    const F = new Frame(mb, fr.x, 0, fr.z, rx, rz);
    const gs = grandstand(F, rng(s | 0), W);
    stands.push({ F, ...gs });
  };
  standAt(L.length - 130, 'L', 70);   // main straight, before the line
  standAt(90, 'R', 64);               // on the harbour quay
  standAt(sAtImage(30, 645) - 10, 'L', 34); // around the hairpin
  standAt(sAtImage(800, 252), 'R', 56); // back straight

  {
    const fr = frontage(70, 'L', 2);
    place('casino', fr.x, fr.z, fr.dirX, fr.dirZ, 40, 26, 4, { margin: 4 });
  }
  {
    const fr = frontage(sAtImage(250, 142), 'L', 8);
    place('church', fr.x, fr.z, fr.dirX, fr.dirZ, 24, 22, 3, { margin: 4 });
  }

  // ---- frontage: buildings facing the circuit on both sides ----------------
  let placed = 0;
  for (const side of ['L', 'R']) {
    let s = 0;
    while (s < L.length) {
      const W = 12 + Math.floor(R() * 14);
      const D = 13 + Math.floor(R() * 8);
      const fr = frontage(s + W / 2, side, R() * 1.5);
      const roll = R();
      const kind = roll < 0.55 ? 'riviera' : roll < 0.82 ? 'townhouses' : roll < 0.9 ? 'tower' : roll < 0.95 ? 'garage' : 'riviera';
      const floors = kind === 'tower' ? 9 + Math.floor(R() * 10) : 2 + Math.floor(R() * 4);
      let ok = place(kind, fr.x, fr.z, fr.dirX, fr.dirZ, W, D, floors);
      if (!ok) ok = place(kind, fr.x, fr.z, fr.dirX, fr.dirZ, W * 0.6, D * 0.8, floors);
      if (ok) placed++;
      s += ok ? W + 0.6 + R() * 2.5 : 5;
    }
  }

  // ---- background town: fill the blocks behind the frontage ----------------
  const [bx0, bz0] = L.fromImage(-260, -120);
  const [bx1] = L.fromImage(1400, 0);
  for (let x = bx0; x < bx1; x += 30) {
    for (let z = bz0; z < coastZ; z += 30) {
      const jx = x + (R() - 0.5) * 10, jz = z + (R() - 0.5) * 10;
      const n = L.nearest(jx, jz);
      let dirX, dirZ;
      if (n && n.dist < 140) {
        const i = n.i, sg = n.lateral > 0 ? 1 : -1;
        dirX = -L.nx[i] * sg; dirZ = -L.nz[i] * sg;
      } else {
        const a = 0.18 + (R() < 0.5 ? 0 : Math.PI / 2);
        dirX = Math.cos(a); dirZ = Math.sin(a);
      }
      const far = !n || n.dist > 90;
      const tall = far && R() < 0.08;
      const W = 14 + R() * 14, D = 12 + R() * 12;
      const kind = tall ? 'tower' : 'backdrop';
      place(kind, jx, jz, dirX, dirZ, W, D, tall ? 10 + Math.floor(R() * 12) : 2 + Math.floor(R() * 5), { margin: 7, detail: false });
    }
  }

  // ---- trees and palms in the gaps along the circuit ------------------------
  for (const side of ['L', 'R']) {
    for (let s = 0; s < L.length; s += 13) {
      const fr = frontage(s, side, -1.5);
      if (!isFree(fr.x, fr.z, 0.6) || inWater(fr.x, fr.z, 1)) continue;
      const fp = { cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 1.6, hd: 1.6 };
      if (overlaps(fp)) continue;
      const mb = builderAt(fr.x, fr.z);
      const F = new Frame(mb, fr.x, 0.14, fr.z, 1, 0);
      if (fr.z > hz0 - 60 || R() < 0.45) palm(F, rng(s * 13 + (side === 'L' ? 1 : 2)));
      else tree(F, rng(s * 7));
    }
  }

  // ---- harbour: quay, promenade palms, piers, yachts, breakwater, lighthouse --
  const harbour = new MeshBuilder();
  const H = new Frame(harbour, 0, 0, 0, 1, 0);
  const stone = rgb(0xb6a88f), stoneDark = rgb(0x8c8070), wood = rgb(0x8a6a4a);
  // Quay walls: vertical stone faces from the promenade down into the water.
  H.box('stucco', hx0, hx1, -1.6, 0.05, hz0 - 1.2, hz0, stone);
  H.box('stucco', hx0 - 1.2, hx0, -1.6, 0.05, hz0, coastZ, stone);
  H.box('stucco', hx1, hx1 + 1.2, -1.6, 0.05, hz0, coastZ, stone);
  // Coastline wall west and east of the harbour.
  H.box('stucco', -1600, hx0 - 1.2, -1.6, 0.05, coastZ, coastZ + 1.2, stoneDark);
  H.box('stucco', hx1 + 1.2, 1600, -1.6, 0.05, coastZ, coastZ + 1.2, stoneDark);
  // Bollards and palms along the quay.
  for (let x = hx0 + 6; x < hx1 - 4; x += 12) {
    H.cylinder('metal', x, hz0 - 0.6, 0.18, 0, 0.7, 6, PALETTE.iron);
    const Fp = new Frame(harbour, x + 6, 0, hz0 - 3, 1, 0);
    palm(Fp, rng(x | 0));
  }
  // Piers with yachts moored either side.
  const piers = 5;
  for (let p = 0; p < piers; p++) {
    const px = hx0 + ((hx1 - hx0) * (p + 0.6)) / (piers + 0.2);
    const len = (coastZ - hz0) * 0.62;
    H.box('trim', px - 1.6, px + 1.6, -0.35, -0.15, hz0, hz0 + len, wood);
    for (let z = hz0 + 4; z < hz0 + len; z += 6) {
      for (const dx of [-1.5, 1.5]) H.box('trim', px + dx - 0.12, px + dx + 0.12, -1.6, -0.15, z - 0.12, z + 0.12, stoneDark);
    }
    for (let z = hz0 + 8; z < hz0 + len - 6; z += 9) {
      for (const dx of [-1, 1]) {
        if (R() < 0.15) continue;
        const ylen = 11 + R() * 9;
        const Fy = new Frame(harbour, px + dx * (2.2 + ylen * 0.13), -0.75, z, 0, -1);
        yacht(Fy, rng((px * 31 + z) | 0), ylen);
      }
    }
  }
  // Breakwater across the harbour mouth with a gap, and the lighthouse.
  const mz = coastZ + 40;
  H.box('stucco', hx0 - 40, hx1 - 120, -1.6, 1.2, mz, mz + 6, stoneDark);
  H.box('stucco', hx1 - 60, hx1 + 30, -1.6, 1.2, mz, mz + 6, stoneDark);
  const LH = new Frame(harbour, hx1 - 120 + 2, 1.2, mz + 3, 1, 0);
  lighthouse(LH);

  // ---- materials ------------------------------------------------------------
  const mats = {
    stucco: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
    trim: new MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }),
    roof: new MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
    copper: new MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.45 }),
    metal: new MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.6 }),
    concrete: new MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }),
    fabric: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: DoubleSide }),
    leaf: new MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: DoubleSide }),
    glass: new MeshPhysicalMaterial({ color: 0x1a2532, roughness: 0.08, metalness: 0.6, envMapIntensity: 1.1 }),
    towerGlass: new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.06, metalness: 0.75, envMapIntensity: 1.4 }),
    winLit: new MeshBasicMaterial({ vertexColors: true }),
    neon: new MeshBasicMaterial({ vertexColors: true }),
  };
  for (const mb of [...chunks.values(), harbour]) {
    const g = mb.build(mats);
    g.traverse((o) => { o.castShadow = false; o.receiveShadow = false; });
    group.add(g);
  }

  // Grandstand roof fascias get a sponsor banner, then the crowd (one instanced mesh).
  const fasciaTex = titleBanner('PORTO VELA', 'GRAND PRIX', '#0d1b2e', '#f4efe2', '#ffc21a');
  const fasciaMb = new MeshBuilder();
  for (const st of stands) {
    const { F, fascia } = st;
    const fm = new Frame(fasciaMb, F.o[0], 0, F.o[2], F.r[0], F.r[1]);
    const p = [fm.at(fascia.a0, fascia.y0, fascia.b + 0.02), fm.at(fascia.a1, fascia.y0, fascia.b + 0.02), fm.at(fascia.a1, fascia.y1, fascia.b + 0.02), fm.at(fascia.a0, fascia.y1, fascia.b + 0.02)];
    fasciaMb.quadUV('fascia', p[0], p[1], p[2], p[3], [0, 0], [1, 0], [1, 1], [0, 1]);
  }
  group.add(fasciaMb.build({ fascia: new MeshStandardMaterial({ map: fasciaTex, emissive: 0xffffff, emissiveMap: fasciaTex, emissiveIntensity: 0.3, side: DoubleSide }) }));
  const seats = stands.flatMap((s) => s.seats);
  if (seats.length) {
    const body = new BoxGeometry(0.4, 0.62, 0.3).translate(0, 0.31, 0).toNonIndexed();
    const head = new BoxGeometry(0.22, 0.24, 0.22).translate(0, 0.76, 0).toNonIndexed();
    const person = mergeGeometries([body, head]);
    person.computeVertexNormals();
    const crowd = new InstancedMesh(person, new MeshStandardMaterial({ roughness: 0.9 }), seats.length);
    const m = new Matrix4();
    const c = new Color();
    seats.forEach((p, k) => {
      m.makeRotationY(R() * 0.6 - 0.3);
      m.setPosition(p[0], p[1], p[2]);
      crowd.setMatrixAt(k, m);
      const col = CROWD[Math.floor(R() * CROWD.length)];
      crowd.setColorAt(k, c.setRGB(col[0], col[1], col[2]));
    });
    group.add(crowd);
  }

  // ---- ground, water ---------------------------------------------------------
  const groundMat = new MeshStandardMaterial({ color: 0x6f6a62, roughness: 0.96 });
  const slab = (x0, x1, z0, z1) => {
    const m = new Mesh(new PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), groundMat);
    m.position.set((x0 + x1) / 2, -0.02, (z0 + z1) / 2);
    m.receiveShadow = true;
    group.add(m);
  };
  slab(-1600, 1600, -1600, hz0);
  slab(-1600, hx0, hz0, coastZ);
  slab(hx1, 1600, hz0, coastZ);

  const water = new Mesh(new PlaneGeometry(3200, 2400, 120, 90).rotateX(-Math.PI / 2), new MeshStandardMaterial({
    color: 0x123049, roughness: 0.32, metalness: 0.15, envMapIntensity: 0.15, flatShading: true,
  }));
  water.position.set(0, -0.9, hz0 + 1200);
  const waterTime = { value: 0 };
  water.material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.y += sin(position.x * 0.09 + uTime * 0.9) * 0.18 + cos(position.z * 0.12 + uTime * 0.7) * 0.14;`);
  };
  group.add(water);

  // Lighthouse beam sweeping the dusk.
  const beam = new Mesh(new ConeGeometry(4, 90, 12, 1, true).translate(0, -45, 0).rotateZ(Math.PI / 2),
    new MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.08, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
  beam.position.set(hx1 - 118, 20.4, mz + 3);
  group.add(beam);

  console.info(`[Porto Vela] ${placed} frontage buildings, ${footprints.length} footprints, ${seats.length} spectators, ${chunks.size} chunks`);

  return {
    group,
    update(dt) {
      waterTime.value += dt;
      beam.rotation.y += dt * 0.6;
    },
  };
}

/** Oriented-rectangle overlap (separating axis theorem). */
function obbOverlap(a, b) {
  const axes = [[a.ux, a.uz], [-a.uz, a.ux], [b.ux, b.uz], [-b.uz, b.ux]];
  const dx = b.cx - a.cx, dz = b.cz - a.cz;
  for (const [ax, az] of axes) {
    const proj = (o) => o.hw * Math.abs(o.ux * ax + o.uz * az) + o.hd * Math.abs(-o.uz * ax + o.ux * az);
    if (Math.abs(dx * ax + dz * az) > proj(a) + proj(b)) return false;
  }
  return true;
}

