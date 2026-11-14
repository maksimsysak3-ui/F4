import { rgb, pick, Frame } from '../street/kit.js?v=1a016bc';
import { buildPaddock } from '../paddock.js?v=1a016bc';
import { sub, VEHICLES, foodTrucks, loos, lightMast } from '../backstageProps.js?v=1a016bc';
import { fieldParking, campsite } from './hungaroringScene.js?v=1a016bc';

/*
 * The life of a Grand Prix weekend around any circuit, run after the circuit's own landmarks and the
 * grandstands so it only fills what is left: the paddock behind the pits (team hospitality and
 * transporters), pedestrian walkways behind the fences, fan villages (food trucks, toilets, pagoda
 * tents, a merch stand), car parks full of cars with light masts, and on the country circuits the
 * fans' campsites. Options (cfg.life): paddock, camping, parks, villages, paths (all default on
 * except paddock and camping, which a circuit opts into).
 */

const WHITE = rgb(0xf4f4f2), STEEL = rgb(0x8a929e), PATH = rgb(0xb4b0a6);

/** White pagoda tent: square walls, a peaked roof, a coloured valance. */
function pagoda(F, a, b, w, col) {
  F.box('fabric', a - w / 2, a + w / 2, 0, 2.6, b - w / 2, b + w / 2, WHITE);
  F.block('fabric', [[a - w / 2, b + w / 2], [a + w / 2, b + w / 2], [a + w / 2, b - w / 2], [a - w / 2, b - w / 2]], [[a, b], [a, b], [a, b], [a, b]], 2.6, 2.6 + w * 0.45, WHITE);
  F.box('fabric', a - w / 2 - 0.02, a + w / 2 + 0.02, 2.2, 2.6, b + w / 2, b + w / 2 + 0.03, col);
}

/** A fan village: a row of food trucks, toilets, pagoda tents and benches. */
function fanVillage(F, r, W, D) {
  foodTrucks(sub(F, -W / 4, -2), r, 3);
  loos(sub(F, W / 2 - 7, -D + 2, Math.PI), r, 7);
  const cols = [rgb(0xc8242b), rgb(0x1f6ad8), rgb(0xf2c200), rgb(0x2a7a3a), rgb(0x1b1b1f)];
  for (let a = -W / 2 + 4; a < W / 2 - 10; a += 7) pagoda(F, a, -D / 2 - 1, 5, pick(r, cols));
  for (let k = 0; k < 6; k++) { const a = -W / 2 + 4 + r() * (W - 12), b = -D + 4 + r() * 4; F.box('trim', a - 1, a + 1, 0.7, 0.78, b - 0.4, b + 0.4, rgb(0x6a4a2e)); }
}

export function circuitLife({ L, R, kit, terrain, dry, placed }, o = {}) {
  const out = { paddock: 0, paths: 0, villages: 0, parks: 0, camps: 0 };
  // ---- the paddock behind the pit building ----
  if (o.paddock && L.pit) out.paddock = buildPaddock(kit, L, R, dry, { scatter: false });

  // ---- pedestrian walkways: a paved path a few metres behind the fences, round most of the lap ----
  if (o.paths !== false) {
    for (const side of ['L', 'R']) for (let s = 0; s < L.length; s += 6) {
      if (L.noWall?.[side][Math.floor(s / L.ds) % L.N]) continue; // open run-off, no wall to walk behind
      const fr = kit.frontage(s, side, o.pathOffset ?? 2.5);
      const rx = fr.dirZ, rz = -fr.dirX, fp = { cx: fr.x - fr.dirX * 1.3, cz: fr.z - fr.dirZ * 1.3, ux: rx, uz: rz, hw: 3.2, hd: 1.4 };
      if (!kit.isFree(fr.x, fr.z, 1) || !dry(fr.x, fr.z) || kit.overlaps(fp)) continue;
      const y = terrain.heightAt(fr.x, fr.z);
      if (Math.abs(terrain.heightAt(fr.x + rx * 3, fr.z + rz * 3) - y) > 1.2) continue; // too steep for a walkway
      const F = new Frame(kit.builderAt(fr.x, fr.z), fr.x, y, fr.z, rx, rz);
      F.box('concrete', -3.15, 3.15, -0.6, 0.03, -2.6, 0, PATH);
      kit.footprints.push(fp);
      out.paths++;
    }
  }

  // ---- fan villages round the lap ----
  if (o.villages !== false) {
    for (let s = 120, n = 0; s < L.length - 60; s += o.villageSpacing ?? 650, n++) {
      for (const side of n % 2 ? ['L', 'R'] : ['R', 'L']) {
        let done = false;
        for (const extra of [12, 22, 34]) {
          const fr = kit.frontage(s, side, extra);
          const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 44, 16, 2, dry);
          if (F) { fanVillage(F, R, 44, 16); out.villages++; done = true; break; }
        }
        if (done) break;
      }
    }
  }

  // ---- car parks and campsites on the open land around the circuit ----
  const b = terrain.bounds, maxParks = o.parks ?? 16, maxCamps = o.camping ? (o.camps ?? 18) : 0;
  for (let k = 0; k < 900 && (out.parks < maxParks || out.camps < maxCamps); k++) {
    const x = b.minX + R() * (b.maxX - b.minX), z = b.minZ + R() * (b.maxZ - b.minZ), d = terrain.distSmooth(x, z);
    if (d < 70 || d > 460) continue;
    const camp = out.camps < maxCamps && (out.parks >= maxParks || R() < 0.55);
    const W = camp ? 70 : 80, D = camp ? 40 : 44, yaw = R() * 6.28;
    const F = kit.lot(x, z, Math.sin(yaw), Math.cos(yaw), W, D, 3, dry);
    if (!F) continue;
    if (camp) { campsite(F, R, W, D); out.camps++; }
    else {
      fieldParking(F, R, W, D);
      lightMast(sub(F, -W / 2 + 2, -D / 2)); lightMast(sub(F, W / 2 - 2, -D / 2));
      if (R() < 0.4) VEHICLES.bus(sub(F, 0, -D + 3, Math.PI / 2), rgb(0x1f6ad8), 'stucco');
      out.parks++;
    }
  }
  placed.life = out;
}

export { STEEL };
