import {
  Group, Mesh, MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, PlaneGeometry, DoubleSide,
  InstancedMesh, BoxGeometry, Matrix4, Color, ConeGeometry, AdditiveBlending,
} from 'three';
import { mergeGeometries } from './merge.js?v=a5d31c9';
import { MeshBuilder } from '../../car/meshBuilder.js?v=a5d31c9';
import { buildCircuit } from './circuit.js?v=a5d31c9';
import { ARCHETYPES, Frame, rng, rgb, PALETTE, villa, cypress } from './buildings.js?v=a5d31c9';
import { palm, tree, grandstand, yacht, lighthouse, sailboat } from './props.js?v=a5d31c9';
import { buildCrowdChunks, animateCrowds, setCrowdLod } from './people.js?v=a5d31c9';
import { titleBanner, signAtlas, teamAtlas } from './textures.js?v=a5d31c9';
import { buildPits } from './pits.js?v=a5d31c9';
import { buildWater } from './water.js?v=a5d31c9';
import { underlay, groundPlane } from './kit.js?v=a5d31c9';
import { groundMaterial } from '../../world/ground.js?v=a5d31c9';
import { MOODS } from '../../world/environment.js?v=a5d31c9';
import { buildHills } from './hills.js?v=a5d31c9';

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

  // ---- pit complex (first: the town and the circuit dressing keep clear of it) --
  const teams = teamAtlas();
  const pitsMb = new MeshBuilder();
  const barrierBack = (side, i) => L.wall[side][i] + tecAt(side, i, 0) + 0.62;
  const pits = buildPits(L, pitsMb, barrierBack, teams.rows);

  // ---- circuit -------------------------------------------------------------
  const circuit = buildCircuit(L, { isFree, keepClear: pits.zone });
  group.add(circuit.group);

  // ---- chunked city builders ----------------------------------------------
  const chunks = new Map();
  const builderAt = (x, z) => {
    const key = `${Math.floor(x / TILE)},${Math.floor(z / TILE)}`;
    if (!chunks.has(key)) chunks.set(key, new MeshBuilder());
    return chunks.get(key);
  };
  const footprints = [...pits.reserved];
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
    ARCHETYPES[kind](F, rng(Math.floor(R() * 1e9)), { width: W, depth: D, floors, detail: opts.detail ?? true, street: opts.street ?? false });
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
  const SEATS = [[rgb(0x1f4f9a), rgb(0x2a63b8)], [rgb(0xc8242b), rgb(0xe03a3a)], [rgb(0x2f6b4a), rgb(0x3d8a5c)], [rgb(0xe0a22b), rgb(0xf0b840)], [rgb(0x6a2b4f), rgb(0x8a3b6a)], [rgb(0x1e8fb8), rgb(0x34a8cf)]];
  /** Try to build a grandstand facing the track at s; returns true if it fits. */
  const standAt = (s, side, W, o = {}) => {
    const tiers = o.tiers ?? 9;
    const depth = tiers * 0.85 + 2;
    const fr = frontage(s, side, -3.2);
    const rx = fr.dirZ, rz = -fr.dirX;
    const fp = { cx: fr.x - fr.dirX * depth / 2, cz: fr.z - fr.dirZ * depth / 2, ux: rx, uz: rz, hw: W / 2, hd: depth / 2 + 0.5 };
    if (overlaps(fp)) return false;
    for (const [a, b] of [[-W / 2, -0.5], [W / 2, -0.5], [W / 2, -depth], [-W / 2, -depth], [0, -depth], [-W / 4, -0.5], [W / 4, -0.5]]) {
      const x = fr.x + rx * a + fr.dirX * b, z = fr.z + rz * a + fr.dirZ * b;
      if (!isFree(x, z, 0.3) || inWater(x, z, 2)) return false;
    }
    footprints.push(fp);
    const mb = builderAt(fr.x, fr.z);
    const F = new Frame(mb, fr.x, 0, fr.z, rx, rz);
    const gs = grandstand(F, rng(s | 0), W, tiers, { roof: o.roof, seats: SEATS[stands.length % SEATS.length] });
    stands.push({ F, ...gs });
    return true;
  };
  standAt(L.length - 130, 'L', 70);   // main straight, opposite the pits
  standAt(205, 'R', 64);              // on the harbour quay, past the pit exit
  standAt(sAtImage(30, 645) - 10, 'L', 34, { roof: false }); // around the hairpin
  standAt(sAtImage(800, 252), 'R', 56); // back straight
  // Every real corner gets a stand on its outside where the town leaves room:
  // big roofed stands at the fast ones, open bleachers at the tight ones.
  {
    const apexes = [];
    for (let i = 0; i < L.N; i++) {
      const k = Math.abs(L.k[i]);
      if (k < 1 / 70) continue;
      let peak = true;
      for (let d = -15; d <= 15 && peak; d++) if (Math.abs(L.k[(i + d + L.N) % L.N]) > k) peak = false;
      if (peak && !apexes.some((j) => Math.abs(j - i) * L.ds < 110)) apexes.push(i);
    }
    for (const [n, i] of apexes.entries()) {
      const side = L.k[i] > 0 ? 'R' : 'L';
      const tight = Math.abs(L.k[i]) > 1 / 35;
      for (const [W, off] of [[44, -14], [32, -10], [24, 6], [18, -4]]) {
        if (standAt(i * L.ds + off, side, W, { roof: !tight && n % 2 === 0, tiers: tight ? 6 : 8 })) break;
      }
    }
  }

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
      const roll = R();
      // Mostly palazzi and townhouse rows; every so often a Belle Époque grand hotel.
      const kind = roll < 0.52 ? 'riviera' : roll < 0.84 ? 'townhouses' : 'grandHotel';
      const hotel = kind === 'grandHotel';
      const W = hotel ? 28 + Math.floor(R() * 10) : 12 + Math.floor(R() * 14);
      const D = hotel ? 18 + Math.floor(R() * 4) : 13 + Math.floor(R() * 8);
      const floors = hotel ? 4 + Math.floor(R() * 3) : 2 + Math.floor(R() * 4);
      const fr = frontage(s + W / 2, side, R() * 1.5);
      let ok = place(kind, fr.x, fr.z, fr.dirX, fr.dirZ, W, D, floors, { street: true });
      if (!ok && hotel) ok = place('riviera', fr.x, fr.z, fr.dirX, fr.dirZ, W * 0.5, D * 0.8, 3, { street: true });
      // Squeezed lots get a low building, never a tall sliver.
      if (!ok && W * 0.6 >= 9) ok = place(hotel ? 'riviera' : kind, fr.x, fr.z, fr.dirX, fr.dirZ, W * 0.6, D * 0.75, Math.min(floors, 2), { street: true });
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
      // Old town near the circuit; garden villas at the fringes.
      const fringe = jz < bz0 + 70 || jx < bx0 + 90 || jx > bx1 - 90;
      const kind = fringe && R() < 0.6 ? 'villa' : 'backdrop';
      const W = kind === 'villa' ? 11 + R() * 6 : 14 + R() * 14, D = kind === 'villa' ? 10 + R() * 4 : 12 + R() * 12;
      place(kind, jx, jz, dirX, dirZ, W, D, 2 + Math.floor(R() * 4), { margin: 7, detail: false });
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
      const roll = R();
      if (fr.z > hz0 - 60 || roll < 0.4) palm(F, rng(s * 13 + (side === 'L' ? 1 : 2)));
      else if (roll < 0.7) { const rr = rng(s * 5); cypress(F, rr, 0, 0); if (rr() < 0.6) cypress(F, rr, 1.4, 0.3, 5 + rr() * 3); }
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
    if (overlaps({ cx: x + 6, cz: hz0 - 3, ux: 1, uz: 0, hw: 1.5, hd: 1.5 })) continue;
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
  // Out at sea: yachts at anchor and sailing boats heading along the coast.
  {
    const sea = rng(77);
    for (let k = 0; k < 26; k++) {
      const x = -900 + sea() * 1900, z = mz + 60 + sea() * 520;
      const t = sea() * Math.PI * 2;
      const F = new Frame(harbour, x, -0.75, z, Math.cos(t), Math.sin(t));
      if (sea() < 0.65) sailboat(F, rng(k * 97 + 3));
      else yacht(F, rng(k * 53 + 1), 18 + sea() * 22);
    }
  }

  // ---- the mountains behind the town ---------------------------------------
  const hills = buildHills({
    zStart: bz0 - 12, zEnd: -1750, x0: -1700, x1: 1700, coastZ,
    spurX0: bx0 - 40, spurX1: bx1 + 40,
    isClear: (x, z) => isFree(x, z, 12) && !overlaps({ cx: x, cz: z, ux: 1, uz: 0, hw: 14, hd: 14 }),
  });

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
    winLit: new MeshBasicMaterial({ vertexColors: true }),
    neon: new MeshBasicMaterial({ vertexColors: true }),
    sign: litBoard(signAtlas().tex, 0.9),
    team: litBoard(teams.tex, 0.35),
    hill: new MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
  };
  for (const mb of [...chunks.values(), harbour, pitsMb, hills.mb]) {
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
  // ---- people -------------------------------------------------------------------
  // Seated fans in the stands, mechanics and guests in the pits, and clusters of
  // standing spectators along the fences. One crowd per stand / tile so off-screen
  // groups are culled.
  let people = 0;
  const crowds = [];
  const addCrowd = (list, seed) => {
    if (!list.length) return;
    people += list.length;
    for (const chunk of buildCrowdChunks(list, seed)) {
      crowds.push(chunk);
      group.add(chunk.c);
    }
  };
  for (const [k, st] of stands.entries()) {
    const yaw = Math.atan2(st.F.f[0], st.F.f[1]);
    addCrowd(st.seats.map((p) => ({ p, yaw, seated: true })), 100 + k);
  }
  addCrowd(pits.people, 7);
  const roadside = new Map();
  for (const side of ['L', 'R']) {
    const sg = side === 'L' ? 1 : -1;
    for (let s = 0; s < L.length; s += 1) {
      // Clusters of fans: about a third of the lap, favouring the outside of corners.
      const cell = Math.floor(s / 70);
      const i = Math.floor(s / L.ds) % L.N;
      const outside = (L.k[i] > 0) === (side === 'R') && Math.abs(L.k[i]) > 1 / 200;
      const keep = rng(cell * 31 + (side === 'L' ? 5 : 9))() < (outside ? 0.75 : 0.3);
      if (!keep || pits.zone(side, i)) continue;
      const wa = barrierBack(side, i);
      const rr = rng((s * 13 + (side === 'L' ? 1 : 2)) | 0);
      for (let row = 0; row < 3; row++) {
        if (rr() > [0.8, 0.45, 0.15][row]) continue;
        const lat = wa + 0.7 + row * 0.55 + rr() * 0.2;
        const p = L.poseAt(s + rr() * 0.6, sg * lat);
        if (!isFree(p.x, p.z, -0.35 - row * 0.55) || inWater(p.x, p.z, 0.5)) continue;
        if (overlaps({ cx: p.x, cz: p.z, ux: 1, uz: 0, hw: 0.3, hd: 0.3 })) continue;
        const key = `${Math.floor(p.x / TILE)},${Math.floor(p.z / TILE)}`;
        if (!roadside.has(key)) roadside.set(key, []);
        roadside.get(key).push({ p: [p.x, 0.14, p.z], yaw: Math.atan2(-L.nx[i] * sg, -L.nz[i] * sg), cheer: rr() < 0.4 ? 0.5 + rr() * 0.5 : 0 });
      }
    }
  }
  for (const [k, list] of [...roadside.values()].entries()) addCrowd(list, 900 + k);

  // ---- ground, water ---------------------------------------------------------
  const groundMat = underlay(groundMaterial({ kind: 'paving', base: 0x6f6a62, dark: 0x57534c, light: 0x86817a, tile: 6, macro: 0.2, roughness: 0.96 }));
  const slab = (x0, x1, z0, z1) => {
    const m = new Mesh(groundPlane(x1 - x0, z1 - z0, 30), groundMat);
    m.position.set((x0 + x1) / 2, -0.02, (z0 + z1) / 2);
    m.receiveShadow = true;
    group.add(m);
  };
  slab(-1600, 1600, -1600, hz0);
  slab(-1600, hx0, hz0, coastZ);
  slab(hx1, 1600, hz0, coastZ);

  const water = buildWater({ hx0, hx1, hz0, coastZ, sky: MOODS.dusk });
  group.add(water.mesh);

  // Lighthouse beam sweeping the dusk.
  const beam = new Mesh(new ConeGeometry(4, 90, 12, 1, true).translate(0, -45, 0).rotateZ(Math.PI / 2),
    new MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.08, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
  beam.position.set(hx1 - 118, 20.4, mz + 3);
  group.add(beam);

  console.info(`[Porto Vela] ${stands.length} grandstands, ${placed} frontage buildings, ${footprints.length} footprints, ${hills.villas} hill villas, ${people} people, ${chunks.size} chunks`);

  return {
    group,
    update(dt, camera) {
      water.update(dt);
      // People are specks in the haze beyond a few hundred metres: don't draw them.
      if (camera) for (const k of crowds) setCrowdLod(k.c, Math.hypot(camera.position.x - k.cx, camera.position.z - k.cz), k.rad);
      animateCrowds(dt);
      beam.rotation.y += dt * 0.6;
    },
  };
}

/** Sign board material: the painted texture, glowing gently at dusk. */
function litBoard(map, glow) {
  return new MeshStandardMaterial({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: glow, roughness: 0.6 });
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

