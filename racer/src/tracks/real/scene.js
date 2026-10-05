import {
  Group, Mesh, MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, CircleGeometry, RingGeometry, DoubleSide,
} from 'three';
import { MeshBuilder } from '../../car/meshBuilder.js';
import { buildCircuit } from '../street/circuit.js';
import { buildPits } from '../street/pits.js';
import { Frame, rng, rgb, underlay } from '../street/kit.js';
import { groundMaterial } from '../../world/ground.js';
import { createTerrain } from '../../world/terrain.js';
import { teamAtlas } from '../street/textures.js';
import { createSceneKit } from '../sceneKit.js';
import { createBackstage } from '../backstage.js';

/**
 * Scene engine for the F1 Track Pack. It only provides the invisible plumbing
 * (terrain maths, the circuit surface renderer, pit-lane geometry, crowds,
 * materials); every visible design is the circuit's own, from its config:
 *
 *   style         circuit dressing (kerbs, run-off paint, barriers, sponsors)
 *   relief        (x, z, d) -> extra terrain height (dunes, hills, a city bowl)
 *   colourAt      (x, z, h, slope, d) -> terrain vertex colour
 *   pitTheme      { wall, upper(F, hw, i, rc, dims) }: the circuit's own pit building
 *   stands        [{ at: point, side: 'L'|'R'|'outside'|'inside', W, tiers, build(F, r, W, tiers, o), offset }]
 *   landmarks     (ctx) => void: towers, villages, skylines, lakes...
 *   trees         { variants: [(F, r) => void], density, test(x, z, d, h) -> variant index | -1 }
 *   water         [{ x, z, r, y? }] lakes / sea (world coords)
 *   roads         (ctx) => void: the circuit's road network (perimeter road, gates, exits, traffic), see backstage.js
 *   roadTheme     { asphalt, edge, centre, shoulder } road paint
 *   groundKind    terrain detail texture: 'grass' (default) | 'sand' | 'gravel'
 */
export function buildRealScene(L, cfg) {
  const group = new Group();
  // Lakes stay clear of the circuit (walls plus a margin) and sit in basins carved into the ground.
  for (const w of cfg.water || []) {
    if (w.r >= 1000) continue; // the sea
    let clear = Infinity;
    for (let i = 0; i < L.N; i += 2) clear = Math.min(clear, Math.hypot(L.x[i] - w.x, L.z[i] - w.z) - Math.max(L.wall.L[i], L.wall.R[i]) - 30);
    w.r = Math.min(w.r, clear);
  }
  const lakes = (cfg.water || []).filter((w) => w.r < 1000 && w.r >= 12);
  const basin = (x, z) => {
    let b = 0;
    for (const w of lakes) {
      const t = Math.min(1, Math.max(0, (w.r + 18 - Math.hypot(x - w.x, z - w.z)) / 22));
      b = Math.max(b, t * t * (3 - 2 * t) * 4);
    }
    return b;
  };
  const relief = (x, z, d) => (cfg.relief ? cfg.relief(x, z, d) : 0) - basin(x, z);
  const terrain = createTerrain(L, { margin: cfg.margin ?? 650, cell: cfg.cell ?? 10, relief });
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
  const circuit = buildCircuit(L, { isFree: kit.isFree, keepClear: pits.zone, style: cfg.style });
  group.add(circuit.group);

  // ---- terrain ---------------------------------------------------------------------------------
  const tmat = underlay(groundMaterial({ kind: cfg.groundKind ?? 'grass', base: 0xb4b4b4, dark: 0x909090, light: 0xd4d4d4, tile: 8, macro: 0.3 }), 2);
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
    const water = new Mesh(new CircleGeometry(w.r, 48).rotateX(-Math.PI / 2), new MeshPhysicalMaterial({ color: w.colour ?? 0x2a5a6a, roughness: 0.06, metalness: 0.1, clearcoat: 1, envMapIntensity: 1.3 }));
    water.position.set(w.x, level, w.z);
    group.add(water);
  }


  // ---- hand-placed grandstands --------------------------------------------------------------------
  let stands = 0;
  for (const st of cfg.stands || []) {
    // Try the exact spot first, then slide along the lap and narrow the stand before giving up.
    let ok = false;
    for (const shift of [0, 25, -25, 50, -50, 80, -80]) {
      const s = (L.pointS(st.at) + (st.offset ?? 0) + shift + L.length) % L.length;
      const i = Math.floor(s / L.ds) % L.N;
      const side = st.side === 'outside' ? (L.k[i] > 0 ? 'R' : 'L') : st.side === 'inside' ? (L.k[i] > 0 ? 'L' : 'R') : st.side;
      for (const W of [st.W, st.W * 0.75, st.W * 0.55]) {
        if (kit.standAt(s, side, W, { ...st, tiers: st.tiers ?? 10, test: dry })) { stands++; ok = true; break; }
      }
      if (ok) break;
    }
    if (!ok) console.info(`[${cfg.name}] stand at P${st.at} did not fit`);
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
  cfg.landmarks?.({ kit, L, R, terrain, group, frameAt, lotAt, dry, wet, placed, bs });

  // ---- trees ---------------------------------------------------------------------------------------------
  let treeCount = 0;
  if (cfg.trees) {
    const t = cfg.trees, b = terrain.bounds, out = [];
    const attempts = t.attempts ?? 9000;
    for (let k = 0; k < attempts; k++) {
      const x = b.minX + R() * (b.maxX - b.minX), z = b.minZ + R() * (b.maxZ - b.minZ);
      const d = terrain.distAt(x, z);
      if (d < 12 || !dry(x, z) || !kit.isFree(x, z, 3)) continue;
      const h = terrain.heightAt(x, z);
      const v = t.test(x, z, d, h, R);
      if (v < 0) continue;
      if (kit.overlaps({ cx: x, cz: z, ux: 1, uz: 0, hw: 2, hd: 2 })) continue;
      out.push({ x, z, v, s: (t.scale?.[v] ?? 1) * (0.75 + R() * 0.5), rot: R() * 6.28, tint: 0.88 + R() * 0.24 });
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
    team: new MeshStandardMaterial({ map: teams.tex, emissive: 0xffffff, emissiveMap: teams.tex, emissiveIntensity: 0.3, roughness: 0.6 }),
  };
  group.add(pitsMb.build(mats));
  kit.finish(mats, cfg.fascia ?? ['GRAND PRIX', ''], cfg.fasciaColours);

  group.add(bs.build());
  console.info(`[${cfg.name}] ${kit.stands.length} grandstands (${stands} hand-placed), ${treeCount} trees, ${kit.people} people, ${bs.roads.length} roads, ${bs.vehicles} vehicles, landmarks: ${JSON.stringify(placed)}`);
  return { group, update: (dt, camera) => { kit.update(dt, camera); bs.update(dt); } };
}

function treeMats() {
  return {
    leaf: new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: DoubleSide }),
    trim: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
    stucco: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
  };
}

export { rng };
