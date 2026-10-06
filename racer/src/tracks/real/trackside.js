import { MeshStandardMaterial, DoubleSide } from 'three';
import { MeshBuilder } from '../../car/meshBuilder.js?v=a5d31c9';
import { Frame, rng, rgb, scaleC, pick } from '../street/kit.js?v=a5d31c9';
import { sponsorAtlas } from '../street/textures.js?v=a5d31c9';
import { cabin, cameraTower, foodTrucks, loos, sub } from '../backstageProps.js?v=a5d31c9';
import { grandstand } from '../street/props.js?v=a5d31c9';

/** A cheap suburban house (seen from a distance): walls, a gable roof, windows front and back. */
function house(F, r, W, D, floors, wall) {
  const H = floors * 3 + 0.4, roofC = pick(r, [rgb(0x9a4a32), rgb(0x6a6a6e), rgb(0x8a5a3a), rgb(0x4a5258), rgb(0xb8b0a0)]);
  F.box('stucco', -W / 2, W / 2, -1, H, -D, 0, wall);
  const ridge = H + Math.min(W, D) * 0.32;
  F.block('roof', [[-W / 2 - 0.4, 0.4], [W / 2 + 0.4, 0.4], [W / 2 + 0.4, -D - 0.4], [-W / 2 - 0.4, -D - 0.4]], [[-W / 2 - 0.4, -D / 2], [W / 2 + 0.4, -D / 2], [W / 2 + 0.4, -D / 2], [-W / 2 - 0.4, -D / 2]], H, ridge, roofC);
  const n = Math.max(2, Math.round(W / 3.2));
  for (let f = 0; f < floors; f++) {
    const y = f * 3 + 1;
    for (let k = 0; k < n; k++) {
      const a = -W / 2 + (W / n) * (k + 0.5);
      F.face(r() < 0.25 ? 'winLit' : 'glass', a - 0.6, a + 0.6, y, y + 1.4, 0.02, [1, 0.8, 0.55]);
    }
  }
  F.face('trim', -0.6, 0.6, 0, 2.2, 0.03, scaleC(wall, 0.55)); // the front door
}

/**
 * A family of grandstand designs around a circuit's own signature stand, so a lap doesn't pass the
 * same stand over and over: the signature design, open aluminium bleachers, a two-tier stand with a
 * band of glass VIP boxes, a sail-roofed stand, a steel cantilever with an LED lip, and an open
 * concrete terrace. Each call picks one from its own random stream.
 */
export function standVariety(base = grandstand, palette = null, shirtList = null) {
  return (F, r, W, tiers, o = {}) => {
    const seats = o.seats ?? (palette ? palette[Math.floor(r() * palette.length)] : undefined);
    const v = r(), shirts = (g) => (shirtList ? { ...g, shirts: shirtList } : g);
    if (v < 0.3) return base(F, r, W, tiers, o);
    if (v < 0.45) return shirts(grandstand(F, r, W, tiers, { ...o, seats, style: 'alu', roof: false }));
    if (v < 0.62) {
      // Two tiers: the upper set back and raised over a glazed hospitality band.
      const t1 = Math.max(5, Math.round(tiers * 0.55)), t2 = Math.max(5, tiers - t1 + 2);
      const lower = grandstand(F, r, W, t1, { ...o, seats, roof: false, style: 'alu' });
      const back = -(t1 * 0.85 + 1.5), y = 1.2 + t1 * 0.55;
      F.box('stucco', -W / 2, W / 2, y, y + 3.2, back - 4, back + 0.6, rgb(0xe8e8ea));
      F.face('winLit', -W / 2 + 0.5, W / 2 - 0.5, y + 0.4, y + 2.9, back + 0.62, [1.1, 1.05, 0.95]);
      const upper = grandstand(sub(F, 0, back - 0.4, 0, y + 3.2), r, W, t2, { ...o, seats, roof: true });
      return shirts({ seats: [...lower.seats, ...upper.seats], fascia: upper.fascia });
    }
    if (v < 0.75) return shirts(grandstand(F, r, W, tiers, { ...o, seats, style: 'tent', roof: true }));
    if (v < 0.9) return shirts(grandstand(F, r, W, tiers, { ...o, seats, style: 'steel', roof: true }));
    return shirts(grandstand(F, r, W, Math.max(5, tiers - 3), { ...o, seats, roof: false, fill: 0.9 }));
  };
}

/*
 * What makes a permanent circuit read as an F1 venue from the cockpit, filled in
 * generically wherever the circuit's own design left the ground free:
 *   - grandstands at the outside of the corners and along the straights,
 *   - general-admission banks: fans packed along the fences, deepest on the outside of corners,
 *   - sponsor hoardings on scaffolds behind the barriers,
 *   - marshal posts, TV towers, food trucks and toilets behind the stands,
 *   - a built-up surrounding: suburbs out to the edge of the terrain and a skyline on the horizon,
 *     so no circuit sits in the middle of nowhere.
 * Options (cfg.trackside): { stands, ga, hoardings, suburb (0..1), skyline: { count, dir, spread, tall },
 *   palette (stand seat colours), houseColours, standBuild }.
 */
export function dressTrackside({ L, kit, terrain, group, dry, placed }, o = {}, sponsors) {
  const R = rng(o.seed ?? 4242);
  const STEEL = rgb(0x9aa0a6), WHITE = rgb(0xf2f2ee);
  const out = { stands: 0, ga: 0, hoardings: 0, posts: 0, suburb: 0, skyline: 0 };
  const ok = (x, z) => dry(x, z) && (!o.keepOut || !o.keepOut(x, z));

  // ---- grandstands -------------------------------------------------------------------------------
  if (o.stands !== false) {
    const before = kit.stands.length;
    const build = standVariety(o.standBuild ?? grandstand, o.palette, o.shirts);
    kit.cornerStands({ test: ok, build });
    kit.straightStands({ test: ok, build, width: 46, tiers: 10 }, o.standSpacing ?? 230);
    out.stands = kit.stands.length - before;
  }

  // ---- sponsor hoardings on scaffolds behind the barriers ------------------------------------------
  const atlas = sponsorAtlas(sponsors);
  const hb = new MeshBuilder();
  const hoarding = (F, len, brandA, brandB) => {
    const H = 1.6, y0 = 1.2;
    for (let a = -len / 2; a <= len / 2 + 0.01; a += 4) {
      F.box('metal', a - 0.06, a + 0.06, 0, y0 + 2 * H + 0.2, -0.9, -0.78, STEEL); // scaffold uprights
      F.box('metal', a - 0.05, a + 0.05, 0, 0.1, -1.8, 0.2, STEEL);
      F.box('metal', a - 0.03, a + 0.03, 0.1, y0 + H, -1.7, -0.85, STEEL); // raking brace
    }
    F.box('trim', -len / 2, len / 2, y0 - 0.1, y0 + 2 * H + 0.1, -0.78, -0.7, rgb(0x2a2c30)); // backing
    for (const [k, brand] of [[0, brandA], [1, brandB]]) {
      const row = brand % atlas.rows, v0 = row / atlas.rows + 0.004, v1 = (row + 1) / atlas.rows - 0.004;
      const ya = y0 + k * H, yb = ya + H - 0.06;
      // Two board lengths of the strip per panel so the lettering keeps its proportions.
      const n = Math.max(1, Math.round(len / (H * 16 * 0.5)));
      for (let q = 0; q < n; q++) {
        const a0 = -len / 2 + (q * len) / n, a1 = a0 + len / n;
        hb.quadUV('hoard', F.at(a0, ya, -0.68), F.at(a1, ya, -0.68), F.at(a1, yb, -0.68), F.at(a0, yb, -0.68), [0, v0], [1, v0], [1, v1], [0, v1]);
      }
    }
  };
  if (o.hoardings !== false) {
    let n = 0;
    for (let s = 40; s < L.length; s += o.hoardingSpacing ?? 95) {
      const i = Math.floor(s / L.ds) % L.N;
      const side = (n++ % 2 === 0) === (L.k[i] > 0) ? 'R' : 'L'; // alternate, starting on the outside
      for (const extra of [1.5, 5, 10]) {
        const fr = kit.frontage(s, side, extra), len = 18 + Math.floor(R() * 3) * 6;
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, len, 2.2, 0.6, ok);
        if (!F) continue;
        hoarding(F, len, Math.floor(R() * atlas.rows), Math.floor(R() * atlas.rows));
        out.hoardings++;
        break;
      }
    }
    const mat = new MeshStandardMaterial({ map: atlas.tex, roughness: 0.6, emissive: 0xffffff, emissiveMap: atlas.tex, emissiveIntensity: 0.18, side: DoubleSide });
    group.add(hb.build({ hoard: mat }));
  }

  // ---- marshal posts and TV towers --------------------------------------------------------------
  for (let s = 120, n = 0; s < L.length; s += 210, n++) {
    const i = Math.floor(s / L.ds) % L.N, side = L.k[i] > 0 ? 'L' : 'R'; // the inside of the bend: posts see both ways
    const fr = kit.frontage(s, side, 0.8);
    const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 7, 3, 0.4, ok);
    if (!F) continue;
    if (n % 3 === 2) cameraTower(F, R, 6 + R() * 3); else cabin(F, R, rgb(0xf26a1a));
    out.posts++;
  }

  // ---- general-admission banks: fans packed along the fences ------------------------------------
  if (o.ga !== false) {
    const fans = [], cap = o.ga ?? 9000;
    for (const side of ['L', 'R']) {
      const sg = side === 'L' ? 1 : -1;
      for (let s = 0; s < L.length && fans.length < cap; s += 1.1) {
        const i = Math.floor(s / L.ds) % L.N;
        const outside = (L.k[i] > 0) === (side === 'R') && Math.abs(L.k[i]) > 1 / 220;
        const cell = rng(Math.floor(s / 45) * 31 + (sg > 0 ? 7 : 3))();
        if (cell > (outside ? 0.85 : 0.4)) continue;
        const rows = outside ? 9 : 5, wa = kit.barrierBack(side, i);
        const rr = rng((s * 17 + (sg > 0 ? 1 : 2)) | 0);
        for (let row = 0; row < rows; row++) {
          if (rr() > 0.9 - row * 0.07) continue;
          const p = L.poseAt(s + (rr() - 0.5) * 0.5, sg * (wa + 2.2 + row * 0.75 + rr() * 0.25));
          if (!kit.isFree(p.x, p.z, 1.2) || !ok(p.x, p.z) || kit.overlaps({ cx: p.x, cz: p.z, ux: 1, uz: 0, hw: 0.3, hd: 0.3 })) continue;
          const hc = terrain.heightAt(p.x, p.z);
          if (Math.abs(terrain.heightAt(p.x + 1.5, p.z) - hc) + Math.abs(terrain.heightAt(p.x, p.z + 1.5) - hc) > 1.2) continue; // no fans on cliffs
          fans.push({ p: [p.x, hc + 0.04, p.z], yaw: Math.atan2(-L.nx[i] * sg, -L.nz[i] * sg) + (rr() - 0.5) * 0.5, cheer: rr() < 0.35 ? 0.4 + rr() * 0.6 : 0 });
        }
      }
    }
    kit.addCrowd(fans, 7100);
    out.ga = fans.length;
  }

  // ---- fan services behind the stands ------------------------------------------------------------
  for (const [k, st] of kit.stands.entries()) {
    if (k % 2) continue;
    const { F } = st, back = -16 - R() * 6;
    const x = F.o[0] + F.f[0] * back, z = F.o[2] + F.f[1] * back;
    const G = kit.lot(x, z, F.f[0], F.f[1], 26, 8, 1, ok);
    if (!G) continue;
    if (k % 4) foodTrucks(G, R, 4); else loos(G, R, 8);
  }

  // ---- the surroundings: suburbs on the free ground, a skyline on the horizon --------------------
  const b = terrain.bounds;
  const sub = o.suburb ?? 0;
  if (sub > 0) {
    const walls = o.houseColours ?? [rgb(0xf0e8dc), rgb(0xe8d8c0), rgb(0xd8c8b0), rgb(0xf2f0ea), rgb(0xc8b8a0)];
    for (let z = b.minZ + 30; z < b.maxZ - 30; z += 24) {
      for (let x = b.minX + 30; x < b.maxX - 30; x += 24) {
        if (R() > sub) continue;
        const px = x + (R() - 0.5) * 10, pz = z + (R() - 0.5) * 10, d = terrain.distSmooth(px, pz);
        if (d < (o.suburbFrom ?? 170) || !ok(px, pz)) continue;
        const yaw = (o.gridYaw ?? 0) + (R() < 0.8 ? 0 : Math.PI / 2);
        const dx = Math.sin(yaw), dz = Math.cos(yaw);
        const big = R() < (o.warehouses ?? 0.15);
        const W = big ? 30 + R() * 20 : 10 + R() * 6, D = big ? 22 + R() * 12 : 9 + R() * 4;
        const F = kit.lot(px + dx * D / 2, pz + dz * D / 2, dx, dz, W, D, 3, ok);
        if (!F) continue;
        if (big) {
          const c = pick(R, [rgb(0xd8dadc), rgb(0xc8ccd0), rgb(0xe6e2da), rgb(0x9aa6b0)]);
          F.box('stucco', -W / 2, W / 2, -1, 8 + R() * 4, -D, 0, c);
          F.box('roof', -W / 2 - 0.3, W / 2 + 0.3, 8, 8.5, -D - 0.3, 0.3, scaleC(c, 0.8));
          for (let a = -W / 2 + 3; a < W / 2 - 4; a += 7) F.face('trim', a, a + 4, 0, 4.5, 0.02, rgb(0x6a7078));
        } else house(F, R, W, D, 1 + Math.floor(R() * 2), pick(R, walls));
        out.suburb++;
      }
    }
  }
  const sk = o.skyline;
  if (sk) {
    // Clusters of towers beyond the terrain's edge, hazed into silhouettes by the fog.
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2, rad = Math.hypot(b.maxX - b.minX, b.maxZ - b.minZ) / 2;
    const mb = new MeshBuilder();
    const cols = sk.colours ?? [rgb(0xd8dce0), rgb(0xc8ccd2), rgb(0xe8e4dc), rgb(0xb8c4cc), rgb(0xa8b4c0)];
    for (let k = 0; k < (sk.count ?? 260); k++) {
      const a = (sk.dir ?? 0) + (R() - 0.5) * (sk.spread ?? Math.PI * 2) * (R() < 0.7 ? 0.5 : 1);
      const rr = rad + 120 + R() * R() * (sk.depth ?? 900);
      const x = cx + Math.sin(a) * rr, z = cz + Math.cos(a) * rr;
      const tall = (sk.tall ?? 60) * (0.25 + R() * R() * 1.6), W = 18 + R() * 26, D = 16 + R() * 20;
      const y = terrain.heightAt(x, z) - 4;
      const F = new Frame(mb, x, y, z, Math.cos(a), -Math.sin(a));
      const c = pick(R, cols);
      F.box('stucco', -W / 2, W / 2, 0, tall, -D / 2, D / 2, c);
      for (let f = 6; f < tall - 3; f += 3.4) F.face('glass', -W / 2 + 1, W / 2 - 1, f, f + 1.6, D / 2 + 0.02, scaleC(c, 0.55));
      out.skyline++;
    }
    group.add(mb.build({
      stucco: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
      glass: new MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.3 }),
    }));
  }
  placed.trackside = out;
}
