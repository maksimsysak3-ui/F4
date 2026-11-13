import {
  Group, Mesh, MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, CircleGeometry, RingGeometry, DoubleSide,
} from 'three';
import { MeshBuilder } from '../../car/meshBuilder.js';
import { buildCircuit } from '../street/circuit.js';
import { buildPits } from '../street/pits.js';
import { Frame, rng, rgb, underlay } from '../street/kit.js';
import { groundMaterial } from '../../world/ground.js';
import { createTerrain } from '../../world/terrain.js';
import { teamAtlas, facadeTexture, FACADE_STYLES } from '../street/textures.js';
import { createSceneKit } from '../sceneKit.js';
import { createBackstage } from '../backstage.js';
import { dressTrackside } from './trackside.js';
import { circuitLife } from './life.js';
import { timingBoards } from './timing.js';
import { realSponsors } from './sponsors.js';
import { trackSpans, spanFootprints } from './spans.js';

/**
 * Scene engine for the F1 Track Pack. It only provides the invisible plumbing
 * (terrain maths, the circuit surface renderer, pit-lane geometry, crowds,
 * materials); every visible design is the circuit's own, from its config:
 *
 *   style         circuit dressing (kerbs, run-off paint, barriers, sponsors)
 *   relief        (x, z, d) -> extra terrain height (dunes, hills, a city bowl)
 *   colourAt      (x, z, h, slope, d) -> terrain vertex colour
 *   pitTheme      { wall, upper(F, hw, i, rc, dims) }: the circuit's own pit building
 *   stands        [{ at: point, side: 'L'|'R'|'outside'|'inside', W, tiers, build(F, r, W, tiers, o), offset, back }]
 *   openStands    open country: complexes alternate on the fence, ~18 m back and 40-60 m back
 *   landmarks     (ctx) => void: towers, villages, skylines, lakes...
 *   trees         { variants: [(F, r) => void], density, test(x, z, d, h) -> variant index | -1 }
 *   water         [{ x, z, r, y? }] lakes / sea (world coords)
 *   roads         (ctx) => void: the circuit's road network (perimeter road, gates, exits, traffic), see backstage.js
 *   roadTheme     { asphalt, edge, centre, shoulder } road paint
 *   groundKind    terrain detail texture: 'grass' (default) | 'sand' | 'gravel'
 *   trackside     options for the generic venue dressing (see trackside.js), or false
 */
export function buildRealScene(L, cfg) {
  const real = realSponsors(cfg.name);
  if (real) cfg = { ...cfg, style: { ...cfg.style, ...real } };
  const t0 = performance.now();
  const group = new Group();
  // Lakes stay clear of the circuit (walls plus a margin) and sit in basins carved into the ground.
  for (const w of cfg.water || []) {
    if (w.r >= 1000) continue; // the sea
    let clear = Infinity;
    for (let i = 0; i < L.N; i += 2) clear = Math.min(clear, Math.hypot(L.x[i] - w.x, L.z[i] - w.z) - Math.max(L.wall.L[i], L.wall.R[i]) - (w.margin ?? 30));
    w.r = Math.min(w.r, clear);
  }
  const lakes = (cfg.water || []).filter((w) => w.r < 1000 && w.r >= 12);
  const basin = (x, z) => {
    let b = 0;
    for (const w of lakes) {
      const t = Math.min(1, Math.max(0, (w.r + 18 - Math.hypot(x - w.x, z - w.z)) / 22));
      b = Math.max(b, t * t * (3 - 2 * t) * (w.depth ?? 4));
    }
    return b;
  };
  const relief = (x, z, d) => (cfg.relief ? cfg.relief(x, z, d) : 0) - basin(x, z);
  // Grandstand complexes: real circuits group their seating in big complexes (two or three stands
  // side by side, mostly big, some giant, a few smaller) rather than small stands dotted round the lap.
  // Each hand-placed stand becomes the main stand of a complex: made bigger, with a slightly smaller
  // companion beside it, and two either side of the giant ones (the main straight, T1).
  // How far each complex sits back from the barrier: on open circuits (cfg.openStands: China, Austria,
  // Spa) a mix of right on the fence, a little back and well back across the grass; elsewhere most stay
  // close, with some set back a few metres (more on permanent circuits than in the streets).
  const backOf = (k) => (cfg.openStands ? [0, 40 + (k * 7) % 22, 18][k % 3] : k % 3 === 1 ? (L.permanent ? 10 : 5) : 0);
  const standList = (cfg.stands || []).flatMap((st, k) => {
    const main = { ...st, back: st.back ?? backOf(k), W: Math.round(st.W * 1.15), tiers: Math.min(32, (st.tiers ?? 10) + 3) };
    const comp = (dir, f) => {
      const W = Math.round(main.W * f);
      return { ...st, back: main.back, W, tiers: Math.max(12, main.tiers - 3), offset: (st.offset ?? 0) + dir * (main.W / 2 + 14 + W / 2), companion: true };
    };
    if (main.W >= 220) return [main, comp(1, 0.7), comp(-1, 0.6)];
    return [main, comp(k % 2 ? -1 : 1, main.W >= 140 ? 0.7 : 0.8)];
  });
  // Flat pads where the hand-placed grandstands go, at the track's height, so no hillside runs through them.
  const pads = standList.map((st) => {
    const s = (L.pointS(st.at) + (st.offset ?? 0) + L.length) % L.length, i = Math.floor(s / L.ds) % L.N;
    const side = st.side === 'outside' ? (L.k[i] > 0 ? 'R' : 'L') : st.side === 'inside' ? (L.k[i] > 0 ? 'L' : 'R') : st.side;
    const sg = side === 'L' ? 1 : -1, depth = (st.tiers ?? 10) * 0.85 + 4, lat = L.wall[side][i] + 2 + (st.back ?? 0) + depth / 2;
    const p = L.poseAt(s, sg * lat);
    return { x: p.x, z: p.z, ux: L.tx[i], uz: L.tz[i], hw: st.W / 2 + 8, hd: depth / 2 + 6, y: L.yAt(i, sg * L.wall[side][i]) - 0.2 };
  });
  const terrain = createTerrain(L, { margin: cfg.margin ?? 650, cell: cfg.cell ?? 10, relief, pads });
  L.terrainAt = terrain.heightAt; // physics off the track (big run-offs) follows the landscape
  L.terrainMeshAt = terrain.meshAt; // (debug probes)
  const kit = createSceneKit(L, group, { seed: cfg.seed ?? 11, heightAt: terrain.heightAt });
  const R = kit.R;
  const wet = (x, z, pad = 0) => (cfg.water || []).some((w) => Math.hypot(x - w.x, z - w.z) < w.r + pad);
  const dry = (x, z) => !wet(x, z, 6) && !(cfg.keepOut && cfg.keepOut(x, z));

  // ---- pits and circuit ---------------------------------------------------------------------
  const teams = teamAtlas();
  const pitsMb = new MeshBuilder();
  const pits = buildPits(L, pitsMb, kit.barrierBack, teams.rows, cfg.pitTheme ?? {});
  kit.footprints.push(...pits.reserved);
  // ---- structures over the track (cfg.spans: road overpasses) -------------------------------------
  // Chosen now, before the circuit, so it leaves its floodlights and gantries out there (they would
  // stand through a deck) and everything placed later keeps clear of the abutments. The scene builds
  // them in its landmarks from ctx.spans. Each: { at: layout point, width, H, extra, yaw }.
  const spans = [];
  if (cfg.spans) {
    const mathFrame = (x, z, yaw = 0, y = 0) => new Frame(null, x, y, z, Math.cos(yaw), -Math.sin(yaw));
    const { spanAt } = trackSpans(L, mathFrame);
    for (const sp of cfg.spans) for (const d of [0, 40, -40, 80, -80]) {
      const c = spanAt(L.pointS(sp.at) + d, sp.extra, sp.extra, sp.width + 4, sp.yaw ?? 0);
      if (!c) continue;
      const fps = spanFootprints(c, sp.width);
      if (fps.some((fp) => kit.overlaps(fp))) continue;
      kit.footprints.push(...fps);
      spans.push({ ...sp, s: c.s, i: c.i, aL: c.aL, aR: c.aR, a0: c.a0, a1: c.a1 });
      break;
    }
  }
  const style = spans.length ? { ...cfg.style, clearAt: spans.map((c) => [c.s, c.width / 2 + 14]) } : cfg.style;
  const circuit = buildCircuit(L, { isFree: kit.isFree, keepClear: pits.zone, style });
  group.add(circuit.group);

  // ---- terrain ---------------------------------------------------------------------------------
  const tmat = underlay(groundMaterial({ kind: cfg.groundKind ?? 'grass', base: 0xb4b4b4, dark: 0x909090, light: 0xd4d4d4, tile: 8, macro: 0.3 , stripes: (cfg.groundKind ?? 'grass') === 'grass'}), 2);
  tmat.vertexColors = true;
  group.add(terrain.mesh(tmat, cfg.colourAt));
  // Ground beyond the terrain out to the horizon, joined seamlessly to the terrain's edge.
  {
    const skirtMat = underlay(groundMaterial({ kind: cfg.groundKind ?? 'grass', base: 0xb4b4b4, dark: 0x909090, light: 0xd4d4d4, tile: 20, macro: 0.4 }), 3);
    skirtMat.color.setRGB(...(cfg.skirtColour ?? [0.5, 0.55, 0.38]));
    group.add(terrain.skirt(skirtMat));
  }
  for (const w of cfg.water || []) {
    // A lake never reaches the circuit: shrink it to stay clear of the track corridor (walls plus a
    // margin), and set the level at the lowest ground round its shore so it can't flood the road.
    if (w.r < 12) continue;
    let level = w.y;
    if (level === undefined) {
      level = Infinity;
      for (let k = 0; k < 24; k++) { const t = (k / 24) * Math.PI * 2; level = Math.min(level, terrain.heightAt(w.x + Math.cos(t) * w.r * 0.97, w.z + Math.sin(t) * w.r * 0.97)); }
      level -= 0.1;
    }
    const water = new Mesh(new CircleGeometry(w.r, 48).rotateX(-Math.PI / 2), new MeshPhysicalMaterial({ color: w.colour ?? 0x2a5a6a, roughness: 0.06, metalness: 0.1, clearcoat: 1, envMapIntensity: w.env ?? 1.3 }));
    water.position.set(w.x, level, w.z);
    group.add(water);
  }


  // ---- hand-placed grandstands --------------------------------------------------------------------
  let stands = 0;
  // Every main stand first, then the companions round them (a companion never takes a main stand's spot).
  for (const st of [...standList.filter((x) => !x.companion), ...standList.filter((x) => x.companion)]) {
    // Try the exact spot first, then slide along the lap and narrow the stand before giving up.
    let ok = false;
    for (const shift of [0, 25, -25, 50, -50, 80, -80, 115, -115, 150, -150]) {
      const s = (L.pointS(st.at) + (st.offset ?? 0) + shift + L.length) % L.length;
      const i = Math.floor(s / L.ds) % L.N;
      const side = st.side === 'outside' ? (L.k[i] > 0 ? 'R' : 'L') : st.side === 'inside' ? (L.k[i] > 0 ? 'L' : 'R') : st.side;
      for (const W of [st.W, st.W * 0.75, st.W * 0.55]) {
        if (kit.standAt(s, side, W, { ...st, tiers: st.tiers ?? 10, test: dry })) { stands++; ok = true; break; }
      }
      if (ok) break;
    }
    if (!ok && !st.companion) console.info(`[${cfg.name}] stand at P${st.at} did not fit`);
  }


  /** A free-standing frame at (x, z) facing yaw, on the terrain, without lot checks (far scenery). */
  const frameAt = (x, z, yaw = 0, y = null) => new Frame(kit.builderAt(x, z), x, y ?? terrain.heightAt(x, z), z, Math.cos(yaw), -Math.sin(yaw));

  // ---- the road network behind the fences (before the landmarks, so they keep off it) ----------------
  const bs = createBackstage({ L, kit, terrain, dry, theme: cfg.roadTheme });
  cfg.roads?.({ bs, kit, L, R, terrain, frameAt, dry });

  // ---- landmarks and the surroundings (per circuit) -----------------------------------------------
  /** Reserve a lot near the track facing it (frontage at point `at`, `extra` m behind the barrier). */
  const lotAt = (at, side, extra, W, D, margin = 2) => {
    const s = L.pointS(at);
    const fr = kit.frontage(s, side, extra);
    return kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, W, D, margin, dry);
  };
  const placed = {};
  const spanFrames = spans.map((c) => ({ ...c, F: frameAt(L.x[c.i], L.z[c.i], Math.atan2(-L.tx[c.i], -L.tz[c.i]) + (c.yaw ?? 0), L.yAt(c.i, 0)) }));
  cfg.landmarks?.({ kit, L, R, terrain, group, frameAt, lotAt, dry, wet, placed, bs, spans: spanFrames });
  // ---- crossovers: where the lap passes over itself, the upper road stands on a bridge deck ----
  if (L.hasCrossing) {
    const over = new Uint8Array(L.N);
    for (let i = 0; i < L.N; i++) for (const j of L.grid.near(L.x[i], L.z[i], 40)) {
      const sep = Math.min(Math.abs(i - j), L.N - Math.abs(i - j)) * L.ds;
      if (sep > 90 && Math.hypot(L.x[j] - L.x[i], L.z[j] - L.z[i]) < 26 && L.elev[i] > L.elev[j] + 4) { over[i] = 1; break; }
    }
    const mb = kit.builderAt(L.x[0], L.z[0]);
    const deck = rgb(0xb8b6b0), dark = rgb(0x6a6a68);
    let spans = 0;
    for (let i = 0; i < L.N; i++) {
      if (!over[i] && !over[(i + 1) % L.N]) continue;
      const j = (i + 1) % L.N, wl = L.wall.L[i] + 0.8, wr = L.wall.R[i] + 0.8;
      const P = (k, lat, dy) => { const p = L.poseAt(k * L.ds, lat); return [p.x, L.yAt(k, lat) + dy, p.z]; };
      // Deck slab under the road, girder edges, and the parapets.
      mb.color = dark;
      mb.hexa('concrete', [P(i, wl, -1.6), P(j, wl, -1.6), P(j, -wr, -1.6), P(i, -wr, -1.6)], [P(i, wl, -0.05), P(j, wl, -0.05), P(j, -wr, -0.05), P(i, -wr, -0.05)]);
      mb.color = deck;
      for (const [a, b] of [[wl - 0.4, wl], [-wr, -wr + 0.4]]) mb.hexa('concrete', [P(i, a, -1.7), P(j, a, -1.7), P(j, b, -1.7), P(i, b, -1.7)], [P(i, a, 1.2), P(j, a, 1.2), P(j, b, 1.2), P(i, b, 1.2)]);
      // Piers every ~12 m, clear of the road underneath.
      if (i % 6 === 0) for (const lat of [wl - 1.2, -wr + 1.2]) {
        const top = P(i, lat, -1.6), g = terrain.heightAt(top[0], top[2]);
        if (top[1] - g < 2) continue;
        let onRoad = false; // never on the road passing underneath
        for (const k of L.grid.near(top[0], top[2], 30)) if (L.elev[k] < top[1] - 4 && Math.hypot(L.x[k] - top[0], L.z[k] - top[2]) < Math.max(L.wall.L[k], L.wall.R[k]) + 1.5) { onRoad = true; break; }
        if (onRoad) continue;
        mb.color = deck;
        mb.hexa('concrete', [[top[0] - 0.7, g - 1, top[2] - 0.7], [top[0] + 0.7, g - 1, top[2] - 0.7], [top[0] + 0.7, g - 1, top[2] + 0.7], [top[0] - 0.7, g - 1, top[2] + 0.7]],
          [[top[0] - 0.7, top[1], top[2] - 0.7], [top[0] + 0.7, top[1], top[2] - 0.7], [top[0] + 0.7, top[1], top[2] + 0.7], [top[0] - 0.7, top[1], top[2] + 0.7]]);
      }
      spans++;
    }
    mb.color = null;
    placed.bridge = spans;
  }
  const timing = timingBoards(L, kit, terrain, group);
  placed.timing = timing.count;
  // The F1 venue around whatever the circuit placed: stands, GA banks, hoardings, suburbs, a skyline.
  // With hand-placed complexes, no extra small stands dotted round the lap (the fans line the fences).
  const ts = { ...(cfg.trackside ?? {}), ...(standList.length ? { stands: false } : {}) };
  if (cfg.trackside !== false) dressTrackside({ L, kit, terrain, group, dry, placed }, ts, cfg.style?.sponsors);
  // The weekend's life in what is left: paddock, walkways, fan villages, car parks, campsites.
  if (cfg.life !== false) circuitLife({ L, R, kit, terrain, dry, placed }, cfg.life ?? {});

  // ---- trees ---------------------------------------------------------------------------------------------
  let treeCount = 0;
  if (cfg.trees) {
    const t = cfg.trees, b = terrain.bounds, out = [];
    const attempts = Math.min(40000, Math.round((t.attempts ?? 9000) * 1.35)); // a fuller treeline everywhere
    for (let k = 0; k < attempts; k++) {
      const x = b.minX + R() * (b.maxX - b.minX), z = b.minZ + R() * (b.maxZ - b.minZ);
      const d = terrain.distAt(x, z);
      if (d < 12 || !dry(x, z) || !kit.isFree(x, z, 3)) continue;
      const h = terrain.heightAt(x, z);
      const v = t.test(x, z, d, h, R);
      if (v < 0) continue;
      if (kit.overlaps({ cx: x, cz: z, ux: 1, uz: 0, hw: 2, hd: 2 })) continue;
      out.push({ x, z, v, s: (t.scale?.[v] ?? 1) * (0.92 + R() * 0.55), rot: R() * 6.28, tint: 0.88 + R() * 0.24 });
    }
    treeCount = kit.forest(t.variants, out, treeMats());
  }

  // ---- materials ----------------------------------------------------------------------------------------
  const mats = {
    stucco: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
    trim: new MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
    roof: new MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: DoubleSide }),
    metal: new MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.6 }),
    concrete: new MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }),
    fabric: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: DoubleSide }),
    leaf: new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: DoubleSide }),
    copper: new MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.45 }),
    glass: new MeshPhysicalMaterial({ color: 0x1a2532, roughness: 0.08, metalness: 0.6, envMapIntensity: 1.1 }),
    winLit: new MeshBasicMaterial({ vertexColors: true }),
    neon: new MeshBasicMaterial({ vertexColors: true }),
    flood: new MeshBasicMaterial({ vertexColors: true }),
    team: new MeshStandardMaterial({ map: teams.tex, emissive: 0xffffff, emissiveMap: teams.tex, emissiveIntensity: 0.3, roughness: 0.6 }),
  };
  // Textured facades for the town blocks; lit windows glow in proportion to the circuit's dusk.
  for (const st of FACADE_STYLES) {
    const t = facadeTexture(st);
    mats[`facade_${st}`] = new MeshStandardMaterial({ map: t.map, vertexColors: true, roughness: st === 'glass' ? 0.25 : 0.85, metalness: st === 'glass' ? 0.4 : 0, emissive: 0xffffff, emissiveMap: t.emissiveMap, emissiveIntensity: cfg.windowGlow ?? 0.15 });
  }
  group.add(pitsMb.build(mats));
  kit.finish(mats, cfg.fascia ?? ['GRAND PRIX', ''], cfg.fasciaColours);

  // The back-of-house road network stays as a layout guide for the venue (its lots still line the
  // routes) but isn't drawn: no access roads, road tunnels or traffic outside the circuit.
  if (cfg.drawRoads) group.add(bs.build());
  console.info(`[${cfg.name}] built in ${Math.round(performance.now() - t0)} ms: ${kit.stands.length} grandstands (${stands} hand-placed), ${treeCount} trees, ${kit.people} people, ${bs.roads.length} roads, ${bs.vehicles} vehicles, landmarks: ${JSON.stringify(placed)}`);
  return { group, update: (dt, camera) => { kit.update(dt, camera); if (cfg.drawRoads) bs.update(dt); timing.update(dt); } };
}

function treeMats() {
  return {
    leaf: new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: DoubleSide }),
    trim: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
    stucco: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
  };
}

export { rng };
