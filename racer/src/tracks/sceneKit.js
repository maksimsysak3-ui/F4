import { Group, InstancedMesh, Matrix4, Quaternion, Vector3, Euler, Color, MeshStandardMaterial, DoubleSide } from 'three';
import { MeshBuilder } from '../car/meshBuilder.js';
import { Frame, rng } from './street/kit.js';
import { grandstand } from './street/props.js';
import { buildCrowd, animateCrowds } from './street/people.js';
import { titleBanner } from './street/textures.js';

/**
 * Shared scaffolding for the hand-built circuit scenes: spatial rules that keep
 * everything off the track, chunked mesh builders, footprints, grandstands,
 * crowds (distance-culled) and instanced forests.
 */
export function createSceneKit(L, group, { tile = 300, seed = 1 } = {}) {
  const R = rng(seed);
  const tecAt = (side, i, t) => (L.at(L.wall[side], i, t) - L.edge > 4.2 ? 0.95 : 0);
  /** True if (x, z) is clear of every track corridor by `margin` metres beyond the barrier's back face. */
  const isFree = (x, z, margin) => {
    const n = L.nearest(x, z);
    if (!n) return true;
    const side = n.lateral > 0 ? 'L' : 'R';
    return Math.abs(n.lateral) > L.at(L.wall[side], n.i, n.t) + tecAt(side, n.i, n.t) + 0.62 + margin;
  };
  const barrierBack = (side, i) => L.wall[side][i] + tecAt(side, i, 0) + 0.62;

  const chunks = new Map();
  const builderAt = (x, z) => {
    const key = `${Math.floor(x / tile)},${Math.floor(z / tile)}`;
    if (!chunks.has(key)) chunks.set(key, new MeshBuilder());
    return chunks.get(key);
  };
  const footprints = [];
  const overlaps = (fp) => footprints.some((o) => obbOverlap(o, fp));

  /** Facade-centred frame `extra` metres beyond the barrier at s on a side, facing the track. */
  const frontage = (s, side, extra = 0) => {
    const f = (((s / L.ds) % L.N) + L.N) % L.N;
    const i = Math.floor(f) % L.N, t = f - Math.floor(f);
    const sg = side === 'L' ? 1 : -1;
    const lat = L.at(L.wall[side], i, t) + tecAt(side, i, t) + 0.62 + 4.6 + extra;
    const p = L.poseAt(s, sg * lat);
    return { x: p.x, z: p.z, dirX: -L.nx[i] * sg, dirZ: -L.nz[i] * sg, i };
  };

  /** Reserve a W x D lot whose front edge centre is (cx, cz), facing (dirX, dirZ). Returns a Frame or null. */
  const lot = (cx, cz, dirX, dirZ, W, D, margin = 4.5, extraTest = null) => {
    const rx = dirZ, rz = -dirX;
    const fp = { cx: cx - dirX * D / 2, cz: cz - dirZ * D / 2, ux: rx, uz: rz, hw: W / 2 + 0.8, hd: D / 2 + 0.8 };
    for (const [a, b] of [[-W / 2, 0], [W / 2, 0], [W / 2, -D], [-W / 2, -D], [0, -D / 2], [0, 0]]) {
      const x = cx + rx * a + dirX * b, z = cz + rz * a + dirZ * b;
      if (!isFree(x, z, margin) || (extraTest && !extraTest(x, z))) return null;
    }
    if (overlaps(fp)) return null;
    footprints.push(fp);
    return new Frame(builderAt(cx, cz), cx, 0, cz, rx, rz);
  };

  // ---- grandstands -------------------------------------------------------------
  const stands = [];
  const standAt = (s, side, W, o = {}) => {
    const tiers = o.tiers ?? 9;
    const depth = tiers * 0.85 + 2;
    const fr = frontage(s, side, -3.2);
    const rx = fr.dirZ, rz = -fr.dirX;
    const fp = { cx: fr.x - fr.dirX * depth / 2, cz: fr.z - fr.dirZ * depth / 2, ux: rx, uz: rz, hw: W / 2, hd: depth / 2 + 0.5 };
    if (overlaps(fp)) return false;
    for (const [a, b] of [[-W / 2, -0.5], [W / 2, -0.5], [W / 2, -depth], [-W / 2, -depth], [0, -depth], [-W / 4, -0.5], [W / 4, -0.5]]) {
      const x = fr.x + rx * a + fr.dirX * b, z = fr.z + rz * a + fr.dirZ * b;
      if (!isFree(x, z, 0.3) || (o.test && !o.test(x, z))) return false;
    }
    footprints.push(fp);
    const F = new Frame(builderAt(fr.x, fr.z), fr.x, 0, fr.z, rx, rz);
    const gs = grandstand(F, rng(s | 0), W, tiers, o);
    stands.push({ F, ...gs });
    return true;
  };
  /** A stand at the outside of every real corner where there's room. */
  const cornerStands = (o = {}) => {
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
      for (const [W, off] of o.widths ?? [[44, -14], [32, -10], [24, 6], [18, -4]]) {
        if (standAt(i * L.ds + off, side, W, { ...o, roof: o.roof ?? (!tight && n % 2 === 0), tiers: o.tiers ?? (tight ? 6 : 8), seats: o.palette?.[n % o.palette.length] })) break;
      }
    }
  };

  /** Extra stands along the straights, alternating sides every `spacing` metres. */
  const straightStands = (o = {}, spacing = 240) => {
    let n = 0;
    for (let s = 120; s < L.length - 60; s += spacing) {
      const i = Math.floor(s / L.ds) % L.N;
      if (Math.abs(L.k[i]) > 1 / 300) continue;
      const side = n % 2 ? 'L' : 'R';
      for (const sd of [side, side === 'L' ? 'R' : 'L']) {
        if (standAt(s, sd, o.width ?? 40, { ...o, roof: o.roof ?? true, tiers: o.tiers ?? 8, seats: o.palette?.[n % (o.palette?.length || 1)] })) { n++; break; }
      }
    }
    return n;
  };

  /**
   * Spectator hill: a natural grassy mound rising away from the track (smooth
   * toe, rounded crest, tapering ends, a little irregularity) whose colour fades
   * into the surrounding ground, with fans sitting and standing on the slope.
   */
  const spectatorBank = (s, side, W, colour, test = null, ground = colour) => {
    const fr = frontage(s, side, 0);
    const H = 4.2, D = 24, Wt = W + 18;
    const F = lot(fr.x, fr.z, fr.dirX, fr.dirZ, Wt, D, 0.5, test);
    if (!F) return false;
    const r = rng((s * 11 + (side === 'L' ? 1 : 2)) | 0);
    const ph = r() * 6.28;
    const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    const height = (a, b) => {
      const u = -b;
      const along = u < 11 ? ss(0, 10, u) : 1 - ss(12, D, u);
      const ends = ss(0, 9, Wt / 2 - Math.abs(a));
      const wobble = 1 + 0.14 * Math.sin(a * 0.21 + u * 0.33 + ph) + 0.08 * Math.sin(a * 0.57 - u * 0.21 + ph * 2);
      return H * along * ends * wobble;
    };
    const col = (h) => {
      const k = Math.min(1, h / H) * (0.85 + r() * 0.3);
      return ground.map((g, n) => (g + (colour[n] - g) * k) * (0.95 + r() * 0.1));
    };
    const step = 2.4;
    const na = Math.ceil(Wt / step), nb = Math.ceil(D / step);
    const pt = (ia, ib) => { const a = -Wt / 2 + (ia / na) * Wt, b = -(ib / nb) * D; return [a, b, height(a, b) - 0.03]; };
    for (let ia = 0; ia < na; ia++) {
      for (let ib = 0; ib < nb; ib++) {
        const q = [pt(ia, ib), pt(ia + 1, ib), pt(ia + 1, ib + 1), pt(ia, ib + 1)];
        if (q.every((p) => p[2] < 0.02)) continue; // flat ground: the ground plane already covers it
        const w = q.map(([a, b, y]) => F.at(a, y, b));
        F.mb.color = col((q[0][2] + q[2][2]) / 2);
        F.mb.triFacing('concrete', w[0], w[1], w[2], [0, 1, 0]);
        F.mb.color = col((q[0][2] + q[2][2]) / 2);
        F.mb.triFacing('concrete', w[0], w[2], w[3], [0, 1, 0]);
      }
    }
    F.mb.color = null;
    // Fans on the track-facing slope and along the crest, on picnic rugs and standing.
    const fans = [];
    const yaw = Math.atan2(F.f[0], F.f[1]);
    for (let b = -2.5; b > -13; b -= 0.9) {
      for (let a = -W / 2 + 1; a < W / 2 - 1; a += 0.7 + r() * 0.6) {
        if (r() < 0.74) continue; // a scattering of fans, not a packed terrace
        const aa = a + (r() - 0.5) * 0.4, bb = b + (r() - 0.5) * 0.4;
        if (height(aa, bb) < 0.6) continue;
        fans.push({ p: F.at(aa, height(aa, bb) - 0.03, bb), yaw: yaw + (r() - 0.5) * 0.5, seated: r() < 0.65, cheer: r() < 0.25 ? 0.6 : 0 });
      }
    }
    addCrowd(fans, (s | 0) + 7);
    return true;
  };

  // ---- crowds --------------------------------------------------------------------
  const crowds = [];
  let people = 0;
  const addCrowd = (list, s = 1) => {
    if (!list.length) return;
    people += list.length;
    const c = buildCrowd(list, s);
    let cx = 0, cz = 0;
    for (const q of list) { cx += q.p[0]; cz += q.p[2]; }
    cx /= list.length; cz /= list.length;
    let rad = 0;
    for (const q of list) rad = Math.max(rad, Math.hypot(q.p[0] - cx, q.p[2] - cz));
    crowds.push({ c, cx, cz, rad });
    group.add(c);
  };
  /** Standing fans along the fences: clusters, favouring the outside of corners. */
  const roadsideFans = (zone = () => false, density = 1) => {
    const byTile = new Map();
    for (const side of ['L', 'R']) {
      const sg = side === 'L' ? 1 : -1;
      for (let s = 0; s < L.length; s += 1) {
        const cell = Math.floor(s / 70);
        const i = Math.floor(s / L.ds) % L.N;
        const outside = (L.k[i] > 0) === (side === 'R') && Math.abs(L.k[i]) > 1 / 200;
        if (rng(cell * 31 + (side === 'L' ? 5 : 9))() > (outside ? 0.7 : 0.25) * density || zone(side, i)) continue;
        const wa = barrierBack(side, i);
        const rr = rng((s * 13 + (side === 'L' ? 1 : 2)) | 0);
        for (let row = 0; row < 3; row++) {
          if (rr() > [0.8, 0.45, 0.15][row]) continue;
          const p = L.poseAt(s + rr() * 0.6, sg * (wa + 0.7 + row * 0.55 + rr() * 0.2));
          if (!isFree(p.x, p.z, -0.35 - row * 0.55) || overlaps({ cx: p.x, cz: p.z, ux: 1, uz: 0, hw: 0.3, hd: 0.3 })) continue;
          const key = `${Math.floor(p.x / tile)},${Math.floor(p.z / tile)}`;
          if (!byTile.has(key)) byTile.set(key, []);
          byTile.get(key).push({ p: [p.x, 0.05, p.z], yaw: Math.atan2(-L.nx[i] * sg, -L.nz[i] * sg), cheer: rr() < 0.4 ? 0.5 + rr() * 0.5 : 0 });
        }
      }
    }
    for (const [k, list] of [...byTile.values()].entries()) addCrowd(list, 900 + k);
  };

  // ---- instanced forests ------------------------------------------------------------
  /**
   * Instance a set of tree models over placements [{ x, z, s, v }] (v = variant index),
   * one InstancedMesh per variant, material and tile so frustum culling stays useful.
   */
  const forest = (variants, placements, mats) => {
    const protos = variants.map((fn, k) => {
      const mb = new MeshBuilder();
      fn(new Frame(mb, 0, 0, 0, 1, 0), rng(k * 101 + 7));
      return mb.build(mats).children; // meshes per material
    });
    const byTile = new Map();
    for (const p of placements) {
      const key = `${Math.floor(p.x / tile)},${Math.floor(p.z / tile)}|${p.v}`;
      if (!byTile.has(key)) byTile.set(key, []);
      byTile.get(key).push(p);
    }
    const m = new Matrix4(), q = new Quaternion(), sc = new Vector3(), pos = new Vector3(), e = new Euler(), col = new Color();
    let count = 0;
    for (const [key, list] of byTile) {
      const v = +key.split('|')[1];
      for (const proto of protos[v]) {
        const im = new InstancedMesh(proto.geometry, proto.material, list.length);
        list.forEach((p, k) => {
          q.setFromEuler(e.set((p.lean ?? 0) * 0.04, p.rot ?? 0, 0));
          sc.set(p.s, p.s * (p.sy ?? 1), p.s);
          m.compose(pos.set(p.x, p.y ?? 0, p.z), q, sc);
          im.setMatrixAt(k, m);
          const t = p.tint ?? 1;
          im.setColorAt(k, col.setRGB(t, t * (p.tintG ?? 1), t));
        });
        im.computeBoundingSphere();
        group.add(im);
      }
      count += list.length;
    }
    return count;
  };

  // ---- build ---------------------------------------------------------------------------
  const finish = (mats, fasciaText = ['GRAND PRIX', ''], fasciaColours = ['#0d1b2e', '#f4efe2', '#ffc21a']) => {
    for (const mb of chunks.values()) {
      const g = mb.build(mats);
      g.traverse((o) => { o.castShadow = false; o.receiveShadow = false; });
      group.add(g);
    }
    const fasciaTex = titleBanner(fasciaText[0], fasciaText[1], ...fasciaColours);
    const fasciaMb = new MeshBuilder();
    for (const st of stands) {
      const { F, fascia } = st;
      const fm = new Frame(fasciaMb, F.o[0], 0, F.o[2], F.r[0], F.r[1]);
      const p = [fm.at(fascia.a0, fascia.y0, fascia.b + 0.02), fm.at(fascia.a1, fascia.y0, fascia.b + 0.02), fm.at(fascia.a1, fascia.y1, fascia.b + 0.02), fm.at(fascia.a0, fascia.y1, fascia.b + 0.02)];
      fasciaMb.quadUV('fascia', p[0], p[1], p[2], p[3], [0, 0], [1, 0], [1, 1], [0, 1]);
    }
    group.add(fasciaMb.build({ fascia: new MeshStandardMaterial({ map: fasciaTex, emissive: 0xffffff, emissiveMap: fasciaTex, emissiveIntensity: 0.35, side: DoubleSide }) }));
    for (const [k, st] of stands.entries()) {
      const yaw = Math.atan2(st.F.f[0], st.F.f[1]);
      addCrowd(st.seats.map((p) => ({ p, yaw, seated: true })), 100 + k);
    }
  };

  const update = (dt, camera) => {
    animateCrowds(dt);
    if (camera) for (const k of crowds) k.c.visible = Math.hypot(camera.position.x - k.cx, camera.position.z - k.cz) - k.rad < 320;
  };

  return {
    R, isFree, barrierBack, builderAt, footprints, overlaps, frontage, lot, standAt, cornerStands, straightStands, spectatorBank, stands,
    addCrowd, roadsideFans, forest, finish, update, get people() { return people; },
  };
}

/** Oriented-rectangle overlap (separating axis theorem). */
export function obbOverlap(a, b) {
  const axes = [[a.ux, a.uz], [-a.uz, a.ux], [b.ux, b.uz], [-b.uz, b.ux]];
  const dx = b.cx - a.cx, dz = b.cz - a.cz;
  for (const [ax, az] of axes) {
    const proj = (o) => o.hw * Math.abs(o.ux * ax + o.uz * az) + o.hd * Math.abs(-o.uz * ax + o.ux * az);
    if (Math.abs(dx * ax + dz * az) > proj(a) + proj(b)) return false;
  }
  return true;
}
