import {
  InstancedMesh, MeshStandardMaterial, Matrix4, Vector3, Color, DynamicDrawUsage, RepeatWrapping, Group,
} from 'three';
import { MeshBuilder } from '../car/meshBuilder.js';
import { Frame } from './street/kit.js';
import { obbOverlap } from './sceneKit.js';
import { streetAsphalt } from './street/textures.js';
import { VEHICLES } from './backstageProps.js';

/**
 * The working circuit behind the fences: the road network that feeds it and
 * the traffic on it. Every circuit composes its own network from these
 * pieces (where the gates are, which way the motorway lies, where the bus
 * terminal sits); this file only does the geometry:
 *
 *   ring(dist)          perimeter road following the circuit `dist` m out (a contour of the distance field)
 *   spur(x, z)          access road from a gate at (x, z) out to the perimeter road
 *   exit(x, z, dx, dz)  road from (x, z) heading off the map (to the motorway / town)
 *   path(points)        any hand-drawn road (world x, z waypoints)
 *   service(opts)       narrow service lane just behind the barriers, in pieces where there's room
 *   traffic(road, o)    vehicles driving it (right-hand traffic), or park(kind, ...) for parked ones
 *   alongside(road, o)  frames facing the road at regular spacing, for roadside lots
 *
 * Roads reserve their footprints in the scene kit, so stands, buildings, car
 * parks and trees placed afterwards keep off them.
 */
export function createBackstage({ L, kit, terrain, dry = () => true, theme = {} }) {
  const R = kit.R;
  const step = 4;
  const roads = [];
  const T = {
    asphalt: theme.asphalt ?? 0xc8c8c8, edge: theme.edge ?? [0.92, 0.92, 0.9], centre: theme.centre ?? [0.92, 0.92, 0.9],
    shoulder: theme.shoulder ?? null,
  };
  const b = terrain.bounds;
  const inside = (x, z, pad = 30) => x > b.minX + pad && x < b.maxX - pad && z > b.minZ + pad && z < b.maxZ - pad;
  const groundY = (x, z) => terrain.meshY(x, z) + 0.09;

  // ---- spatial index of road samples (for scenery placed with free frames) -------------------------
  const CELL = 24, grid = new Map();
  const key = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  const index = (rd) => {
    for (const p of rd.pts) {
      const k = key(p[0], p[2]);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push([p[0], p[2], rd.w / 2]);
    }
  };
  /** True if (x, z) is within `margin` m of any road edge. */
  const near = (x, z, margin = 2) => {
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      for (const [px, pz, hw] of grid.get(`${cx + i},${cz + j}`) || []) if ((px - x) ** 2 + (pz - z) ** 2 < (hw + margin) ** 2) return true;
    }
    return false;
  };

  // ---- polyline helpers ---------------------------------------------------------------------------
  const resample = (pts, loop) => {
    const src = loop ? [...pts, pts[0]] : pts;
    const out = [[src[0][0], src[0][1]]];
    let carry = 0;
    for (let k = 1; k < src.length; k++) {
      const [x0, z0] = src[k - 1], [x1, z1] = src[k];
      const len = Math.hypot(x1 - x0, z1 - z0);
      let t = step - carry;
      while (t <= len) { out.push([x0 + (x1 - x0) * (t / len), z0 + (z1 - z0) * (t / len)]); t += step; }
      carry = len - (t - step);
    }
    if (loop) out.pop();
    else if (Math.hypot(out.at(-1)[0] - src.at(-1)[0], out.at(-1)[1] - src.at(-1)[1]) > 0.5) out.push([...src.at(-1)]);
    return out;
  };
  const chaikin = (pts, loop, n = 2) => {
    for (let it = 0; it < n; it++) {
      const out = [];
      const m = pts.length;
      if (!loop) out.push(pts[0]);
      for (let k = 0; k < (loop ? m : m - 1); k++) {
        const p = pts[k], q = pts[(k + 1) % m];
        out.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]);
      }
      if (!loop) out.push(pts[m - 1]);
      pts = out;
    }
    return pts;
  };
  /** Where a road may run: on dry land, inside the terrain, clear of the circuit and of anything already built. */
  // Roads may cross other roads (junctions), not anything else.
  const clear = (x, z, hw, margin) => {
    if (!inside(x, z) || !dry(x, z) || !kit.isFree(x, z, margin + hw)) return false;
    const fp = { cx: x, cz: z, ux: 1, uz: 0, hw: hw * 0.7, hd: hw * 0.7 };
    return !kit.footprints.some((o) => !o.road && obbOverlap(o, fp));
  };
  /** Split a polyline into runs where `ok` holds, keeping runs at least minLen long. */
  const runs = (pts, loop, ok, minLen = 60) => {
    const flags = pts.map(([x, z]) => ok(x, z));
    if (loop && flags.every(Boolean)) return [{ pts, loop: true }];
    const out = [];
    let start = loop ? flags.findIndex((f) => !f) : -1;
    const n = pts.length;
    let cur = [];
    for (let c = 0; c < n; c++) {
      const k = loop ? (start + 1 + c) % n : c;
      if (flags[k]) cur.push(pts[k]);
      else { if (cur.length * step >= minLen) out.push({ pts: cur, loop: false }); cur = []; }
    }
    if (cur.length * step >= minLen) out.push({ pts: cur, loop: false });
    return out;
  };

  /** Register a road: heights, footprints, index. Returns the road object (or null if nothing survived). */
  const add = (pts2, { w = 7, loop = false, kind = 'road', lines = true, margin = 3 } = {}) => {
    const made = [];
    for (const run of runs(resample(pts2, loop), loop, (x, z) => clear(x, z, w / 2, margin))) {
      const pts = run.pts.map(([x, z]) => [x, groundY(x, z), z]);
      const rd = { pts, w, loop: run.loop, kind, lines, length: (pts.length - (run.loop ? 0 : 1)) * step };
      for (let k = 0; k < pts.length - (rd.loop ? 0 : 1); k += 3) {
        const p = pts[k], q = pts[Math.min(pts.length - 1, k + 3) % pts.length];
        const dx = q[0] - p[0], dz = q[2] - p[2], l = Math.hypot(dx, dz) || 1;
        kit.footprints.push({ cx: (p[0] + q[0]) / 2, cz: (p[2] + q[2]) / 2, ux: dx / l, uz: dz / l, hw: l / 2 + 1, hd: w / 2 + (kind === 'service' ? 0.8 : 1.5), road: true });
      }
      index(rd);
      roads.push(rd);
      made.push(rd);
    }
    made.sort((a, c) => c.length - a.length);
    return made[0] ?? null;
  };

  // ---- perimeter road: the outermost contour of the distance-to-track field ------------------------
  const contour = (level) => {
    const { D, nx, nz, minX, minZ, cell } = terrain.grid;
    const v = (i, j) => D[j * nx + i] - level;
    const pt = new Map(); // edge id -> [x, z]
    const link = new Map(); // edge id -> [edge ids]
    const edge = (i0, j0, i1, j1) => {
      const id = i0 === i1 ? `v${i0},${Math.min(j0, j1)}` : `h${Math.min(i0, i1)},${j0}`;
      if (!pt.has(id)) {
        const a = v(i0, j0), c = v(i1, j1), t = a / (a - c);
        pt.set(id, [minX + (i0 + (i1 - i0) * t) * cell, minZ + (j0 + (j1 - j0) * t) * cell]);
      }
      return id;
    };
    const join = (p, q) => {
      if (!link.has(p)) link.set(p, []);
      if (!link.has(q)) link.set(q, []);
      link.get(p).push(q); link.get(q).push(p);
    };
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
      const s = c.map(([a, bb]) => v(a, bb) > 0);
      const cuts = [];
      for (let k = 0; k < 4; k++) if (s[k] !== s[(k + 1) % 4]) cuts.push(edge(...c[k], ...c[(k + 1) % 4]));
      if (cuts.length === 2) join(cuts[0], cuts[1]);
      else if (cuts.length === 4) { join(cuts[0], cuts[1]); join(cuts[2], cuts[3]); }
    }
    // Walk the links into chains and keep the longest closed one.
    const seen = new Set();
    let best = null;
    for (const start of link.keys()) {
      if (seen.has(start)) continue;
      const chain = [start];
      seen.add(start);
      let prev = null, cur = start;
      for (;;) {
        const next = (link.get(cur) || []).find((q) => q !== prev && !seen.has(q));
        if (!next) break;
        seen.add(next); chain.push(next); prev = cur; cur = next;
      }
      if (!best || chain.length > best.length) best = chain;
    }
    return best ? best.map((id) => pt.get(id)) : [];
  };
  const ring = (dist, o = {}) => {
    const pts = contour(dist);
    if (pts.length < 20) return null;
    return add(chaikin(pts, true, 3), { w: 7.5, loop: true, kind: 'ring', ...o });
  };

  // ---- spurs and exits: climb the distance field away from the track --------------------------------
  const climb = (x, z, until) => {
    const pts = [[x, z]];
    for (let k = 0; k < 500; k++) {
      const d = terrain.distSmooth(x, z);
      if (until(x, z, d)) break;
      const gx = terrain.distSmooth(x + 6, z) - terrain.distSmooth(x - 6, z), gz = terrain.distSmooth(x, z + 6) - terrain.distSmooth(x, z - 6);
      const gl = Math.hypot(gx, gz);
      if (gl < 1e-4) break;
      x += (gx / gl) * 6; z += (gz / gl) * 6;
      pts.push([x, z]);
    }
    return pts;
  };
  /** Access road from a gate at (x, z) out to the perimeter road `ringDist` m from the track. */
  const spur = (x, z, ringDist, o = {}) => add(chaikin(climb(x, z, (_, __, d) => d >= ringDist), false, 2), { w: 6.5, kind: 'spur', margin: 1, ...o });
  /** Road heading off the map from (x, z), first along (dx, dz), then straight on to the edge. */
  const exit = (x, z, dx, dz, o = {}) => {
    const l = Math.hypot(dx, dz), pts = [];
    for (let s = 0; ; s += 20) {
      const px = x + (dx / l) * s, pz = z + (dz / l) * s;
      pts.push([px, pz]);
      if (!inside(px, pz, 12) || s > 4000) break;
    }
    return add(pts, { w: o.w ?? 9, kind: 'exit', margin: 6, ...o });
  };
  /** Exit road leaving road `rd` at fraction `frac` of its length, heading straight away from the circuit. */
  const exitFrom = (rd, frac, o = {}) => {
    if (!rd) return null;
    const p = rd.pts[Math.floor(frac * (rd.pts.length - 1))];
    let cx = 0, cz = 0;
    for (let i = 0; i < L.N; i += 8) { cx += L.x[i]; cz += L.z[i]; }
    cx /= Math.ceil(L.N / 8); cz /= Math.ceil(L.N / 8);
    return exit(p[0], p[2], p[0] - cx + (o.bend?.[0] ?? 0), p[2] - cz + (o.bend?.[1] ?? 0), o);
  };
  /** Apexes of the real corners: sample index, distance along the lap and the outside. */
  const corners = (kMin = 1 / 60) => {
    const out = [];
    const w = Math.round(40 / L.ds);
    for (let i = 0; i < L.N; i++) {
      const k = Math.abs(L.k[i]);
      if (k < kMin) continue;
      let peak = true;
      for (let j = -w; j <= w && peak; j++) if (Math.abs(L.k[(i + j + L.N) % L.N]) > k) peak = false;
      if (peak) out.push({ i, s: i * L.ds, k, outside: L.k[i] > 0 ? 'R' : 'L', inside: L.k[i] > 0 ? 'L' : 'R' });
    }
    return out;
  };
  const path = (pts, o = {}) => add(o.smooth === false ? pts : chaikin(pts, !!o.loop, 2), o);

  /** Narrow service lane behind the barriers (recovery trucks, medical car, marshals). */
  const service = ({ offset = 9, w = 4, side = 'both', minLen = 50 } = {}) => {
    let n = 0;
    for (const sd of side === 'both' ? ['L', 'R'] : [side]) {
      const sg = sd === 'L' ? 1 : -1, pts = [];
      for (let i = 0; i < L.N; i += Math.max(1, Math.round(step / L.ds))) {
        const lat = kit.barrierBack(sd, i) + offset;
        const p = L.poseAt(i * L.ds, sg * lat);
        pts.push([p.x, p.z]);
      }
      for (const run of runs(pts, true, (x, z) => clear(x, z, w / 2, offset - w / 2 - 1.2), minLen)) {
        if (add(run.pts, { w, loop: run.loop, kind: 'service', lines: false, margin: offset - w / 2 - 1.2 })) n++;
      }
    }
    return n;
  };

  /** Frames along a road, `offset` m to its side, facing it (b towards the road), every `every` m. */
  const alongside = (rd, { side = 1, offset = 8, every = 40, from = 0, to = Infinity } = {}) => {
    const out = [];
    if (!rd) return out;
    for (let s = from; s < Math.min(rd.length, to); s += every) {
      const k = Math.min(rd.pts.length - 2, Math.floor(s / step));
      const p = rd.pts[k], q = rd.pts[(k + 1) % rd.pts.length];
      const dx = q[0] - p[0], dz = q[2] - p[2], l = Math.hypot(dx, dz) || 1;
      let sg = side;
      // 'out' / 'in': away from or towards the circuit.
      if (side === 'out' || side === 'in') {
        const away = terrain.distSmooth(p[0] - dz / l * 10, p[2] + dx / l * 10) > terrain.distSmooth(p[0] + dz / l * 10, p[2] - dx / l * 10);
        sg = (away === (side === 'out')) ? 1 : -1;
      }
      const rx = -dz / l * sg, rz = dx / l * sg; // to the chosen side
      const x = p[0] + rx * (rd.w / 2 + offset), z = p[2] + rz * (rd.w / 2 + offset);
      out.push({ x, z, dirX: -rx, dirZ: -rz, s });
    }
    return out;
  };

  // ---- paved aprons that follow the ground (paddocks, yards, car parks) ------------------------------
  const pads = [];
  /** A W x D paved area whose front edge centre is (x, z), extending D away from (dirX, dirZ). */
  const pad = (x, z, dirX, dirZ, W, D, colour = [0.62, 0.61, 0.58]) => pads.push({ x, z, dirX, dirZ, W, D, colour });

  /**
   * Lots on a road: W x D plots `offset` m off its edge, facing it, each with a paved
   * apron/driveway back to the road. Returns up to `count` Frames (front edge centre, b towards the road).
   */
  const roadside = (rd, { side = 'out', W, D, every = 25, from = 0, to = Infinity, offset = 2.5, count = 1, margin = 2, apron = [0.6, 0.59, 0.56], test = null }) => {
    const out = [];
    for (const fr of alongside(rd, { side, offset, every, from, to })) {
      if (out.length >= count) break;
      const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, W, D, margin, test);
      if (!F) continue;
      if (apron) pad(fr.x + fr.dirX * offset, fr.z + fr.dirZ * offset, fr.dirX, fr.dirZ, W, D + offset, apron);
      F.fr = fr;
      out.push(F);
    }
    return out;
  };

  // ---- traffic ------------------------------------------------------------------------------------------
  const movers = []; // { rd, s, v, dir, lane, kind, slot }
  const parked = []; // { kind, x, y, z, yaw, colour }
  const counts = Object.fromEntries(Object.keys(VEHICLES).map((k) => [k, 0]));
  /**
   * Vehicles driving a road both ways. density: vehicles per km per direction;
   * mix: { kind: weight }; palette: body colours.
   */
  const traffic = (rd, { density = 10, mix = { car: 1 }, palette = [0xd8d8d8], speed = [11, 14], lanes = 2 } = {}) => {
    if (!rd) return;
    const kinds = Object.entries(mix), total = kinds.reduce((a, [, w]) => a + w, 0);
    for (const dir of lanes === 2 ? [1, -1] : [1]) {
      const n = Math.max(1, Math.round((rd.length / 1000) * density));
      const v = speed[0] + R() * (speed[1] - speed[0]);
      for (let k = 0; k < n; k++) {
        let w = R() * total, kind = kinds[0][0];
        for (const [kk, ww] of kinds) { if ((w -= ww) <= 0) { kind = kk; break; } }
        movers.push({ rd, s: ((k + R() * 0.5) / n) * rd.length, v, dir, lane: lanes === 2 ? rd.w * 0.24 : 0, kind, colour: palette[Math.floor(R() * palette.length)] });
        counts[kind]++;
      }
    }
  };
  const park = (kind, x, z, yaw, colour = 0xd8d8d8) => { parked.push({ kind, x, y: groundY(x, z) - 0.05, z, yaw, colour }); counts[kind]++; };

  // ---- build --------------------------------------------------------------------------------------------
  const group = new Group();
  const meshes = {};
  const moving = new Set();
  const build = () => {
    const mb = new MeshBuilder();
    const up = [0, 1, 0];
    // Upward-facing triangle (winding fixed up so the road isn't culled).
    const upTri = (bucket, a, c, d, ua, uc, ud) => {
      const cy = (c[2] - a[2]) * (d[0] - a[0]) - (c[0] - a[0]) * (d[2] - a[2]);
      if (cy >= 0) mb.tri(bucket, a, c, d, up, [ua, uc, ud]);
      else mb.tri(bucket, a, d, c, up, [ua, ud, uc]);
    };
    for (const rd of roads) {
      const n = rd.pts.length, m = rd.loop ? n : n - 1;
      const side = (k, off) => {
        const p = rd.pts[k], q = rd.pts[Math.min(n - 1, k + 1)], o = rd.pts[Math.max(0, k - 1)];
        const a = rd.loop ? rd.pts[(k + 1) % n] : q, c = rd.loop ? rd.pts[(k - 1 + n) % n] : o;
        const dx = a[0] - c[0], dz = a[2] - c[2], l = Math.hypot(dx, dz) || 1;
        const x = p[0] + (-dz / l) * off, z = p[2] + (dx / l) * off;
        return [x, groundY(x, z), z];
      };
      const strip = (bucket, o0, o1, lift, col, dash = 0) => {
        mb.color = col;
        for (let k = 0; k < m; k++) {
          if (dash && Math.floor((k * step) / dash) % 2) continue;
          const k1 = (k + 1) % n;
          const a = side(k, o0), c = side(k, o1), d = side(k1, o1), e = side(k1, o0);
          for (const p of [a, c, d, e]) p[1] += lift;
          const s0 = (k * step) / 8, s1 = ((k + 1) * step) / 8;
          upTri(bucket, a, d, c, [0, s0], [1, s1], [1, s0]);
          upTri(bucket, a, e, d, [0, s0], [0, s1], [1, s1]);
        }
      };
      const hw = rd.w / 2;
      if (T.shoulder) strip('shoulder', -hw - 1.2, hw + 1.2, -0.02, T.shoulder);
      strip(rd.kind === 'service' ? 'service' : 'road', -hw, hw, 0, [1, 1, 1]);
      if (rd.lines) {
        strip('paint', -hw + 0.25, -hw + 0.4, 0.015, T.edge);
        strip('paint', hw - 0.4, hw - 0.25, 0.015, T.edge);
        strip('paint', -0.08, 0.08, 0.015, T.centre, rd.kind === 'exit' ? 0 : 6);
      }
    }
    for (const p of pads) {
      const rx = p.dirZ, rz = -p.dirX, na = Math.max(1, Math.round(p.W / 6)), nb = Math.max(1, Math.round(p.D / 6));
      const at = (i, j) => {
        const a = -p.W / 2 + (i / na) * p.W, bb = -(j / nb) * p.D;
        const x = p.x + rx * a + p.dirX * bb, z = p.z + rz * a + p.dirZ * bb;
        return [x, groundY(x, z) - 0.03, z];
      };
      mb.color = p.colour;
      for (let i = 0; i < na; i++) for (let j = 0; j < nb; j++) {
        const a = at(i, j), c = at(i + 1, j), d = at(i + 1, j + 1), e = at(i, j + 1);
        upTri('pad', a, c, d, [a[0] / 8, a[2] / 8], [c[0] / 8, c[2] / 8], [d[0] / 8, d[2] / 8]);
        upTri('pad', a, d, e, [a[0] / 8, a[2] / 8], [d[0] / 8, d[2] / 8], [e[0] / 8, e[2] / 8]);
      }
    }
    const tex = streetAsphalt();
    tex.wrapS = tex.wrapT = RepeatWrapping;
    const road = new MeshStandardMaterial({ map: tex, color: T.asphalt, roughness: 0.92, envMapIntensity: 0.3, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    const paint = new MeshStandardMaterial({ vertexColors: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
    const shoulder = new MeshStandardMaterial({ vertexColors: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -0.5, polygonOffsetUnits: -1 });
    const padMat = new MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.95, envMapIntensity: 0.25, polygonOffset: true, polygonOffsetFactor: -0.5, polygonOffsetUnits: -1 });
    const service = new MeshStandardMaterial({ color: 0x9a968e, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    const g = mb.build({ road, paint, shoulder, pad: padMat, service });
    g.traverse((o) => { o.castShadow = false; o.receiveShadow = true; });
    group.add(g);
    // One instanced mesh per vehicle kind, coloured per instance.
    const bodyMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.35 });
    for (const [kind, draw] of Object.entries(VEHICLES)) {
      if (!counts[kind]) continue;
      const vb = new MeshBuilder();
      draw(new Frame(vb, 0, 0, 0, 1, 0), [1, 1, 1]);
      const geo = vb.build({ body: bodyMat }).children.find((c) => c.name === 'body').geometry;
      const im = new InstancedMesh(geo, bodyMat, counts[kind]);
      im.instanceMatrix.setUsage(DynamicDrawUsage);
      im.frustumCulled = false;
      im.castShadow = false;
      im.count = 0;
      meshes[kind] = im;
      group.add(im);
    }
    const c = new Color();
    for (const p of parked) {
      const im = meshes[p.kind], k = im.count++;
      _m.makeRotationY(p.yaw).setPosition(p.x, p.y, p.z);
      im.setMatrixAt(k, _m);
      im.setColorAt(k, c.setHex(p.colour));
    }
    for (const v of movers) {
      const im = meshes[v.kind];
      moving.add(v.kind);
      v.slot = im.count++;
      im.setColorAt(v.slot, c.setHex(v.colour));
    }
    for (const im of Object.values(meshes)) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
    update(0);
    return group;
  };

  const _hide = new Matrix4().makeScale(0, 0, 0);
  const _m = new Matrix4(), _x = new Vector3(), _y = new Vector3(), _z = new Vector3(), UP = new Vector3(0, 1, 0);
  const update = (dt) => {
    for (const v of movers) {
      const rd = v.rd, n = rd.pts.length;
      if (v.wait > 0) { v.wait -= dt; if (v.wait > 0) continue; }
      v.s += v.v * v.dir * dt;
      if (rd.loop) v.s = ((v.s % rd.length) + rd.length) % rd.length;
      else if (v.s > rd.length - 2 || v.s < 2) {
        // Open roads: a vehicle leaves at its end; a while later another turns in at the start.
        v.s = v.dir > 0 ? 2 : rd.length - 2;
        v.wait = 1 + R() * (rd.length / v.v) * 0.5;
        meshes[v.kind].setMatrixAt(v.slot, _hide);
        continue;
      }
      const f = v.s / step, k = Math.floor(f) % n, t = f - Math.floor(f);
      const p = rd.pts[k], q = rd.pts[(k + 1) % n];
      let dx = (q[0] - p[0]) * v.dir, dy = (q[1] - p[1]) * v.dir, dz = (q[2] - p[2]) * v.dir;
      const l = Math.hypot(dx, dz) || 1;
      const x = p[0] + (q[0] - p[0]) * t + (-dz / l) * v.lane, z = p[2] + (q[2] - p[2]) * t + (dx / l) * v.lane;
      _z.set(dx, dy, dz).normalize();
      _x.crossVectors(UP, _z).normalize();
      _y.crossVectors(_z, _x);
      _m.makeBasis(_x, _y, _z).setPosition(x, p[1] + (q[1] - p[1]) * t - 0.05, z);
      meshes[v.kind].setMatrixAt(v.slot, _m);
    }
    for (const kind of moving) meshes[kind].instanceMatrix.needsUpdate = true;
  };

  return { roads, ring, spur, exit, exitFrom, corners, path, pad, roadside, service, alongside, traffic, park, near, build, update, groundY, group, get vehicles() { return movers.length + parked.length; } };
}
