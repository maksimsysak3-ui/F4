import { MeshBuilder } from '../../car/meshBuilder.js';
import { Frame, rng, rgb, PALETTE, villa, cypress } from './buildings.js';
import { tree } from './props.js';

/**
 * The mountains behind Porto Vela: a faceted ridge that rises from the top of
 * the old town, with spurs running down to the sea at both ends of the bay.
 * The lower slopes carry terraced villas, cypress rows and umbrella pines.
 */

const BANDS = [
  [0, rgb(0x6f7b47)],    // olive groves and gardens
  [45, rgb(0x5c6a3e)],   // maquis scrub
  [120, rgb(0x7d7563)],  // limestone and scree
  [210, rgb(0xa49a86)],  // bare summits
];

function bandColor(h, slope) {
  let c = BANDS[0][1];
  for (const [y, col] of BANDS) if (h >= y) c = col;
  // Steep faces read as rock whatever their height.
  if (slope > 0.9) c = BANDS[2][1];
  return c;
}

/**
 * @param o.zStart  z where the slope starts (north edge of the town)
 * @param o.x0, o.x1 extent along x; o.zEnd far edge (north, more negative)
 * @param o.coastZ  shoreline z; spurs run down to it beyond o.spurX
 * @param o.isClear (x, z) -> true where villas may stand (away from the town)
 */
export function buildHills(o) {
  const mb = new MeshBuilder();
  const { zStart, x0, x1, zEnd, coastZ } = o;
  const R = rng(4242);

  // Height field: ridge rising north + two headlands, broken by sine "erosion".
  const heightAt = (x, z) => {
    const north = Math.max(0, zStart - z);
    let h = 260 * (1 - Math.exp(-north / 420));
    for (const [sx, dir] of [[o.spurX0, -1], [o.spurX1, 1]]) {
      const d = (x - sx) * dir;
      if (d > 0) h = Math.max(h, Math.min(1, d / 260) * 150 * Math.min(1, Math.max(0, (coastZ - 30 - z) / 300)));
    }
    if (h <= 0) return 0;
    const n = Math.sin(x * 0.011 + z * 0.004) * 18 + Math.sin(x * 0.027 - z * 0.019) * 9 + Math.cos(x * 0.006 + 1.3) * 26 + Math.sin(z * 0.013 + x * 0.002) * 12;
    return Math.max(0, h + n * Math.min(1, h / 60));
  };

  const NX = 96, NZ = 40;
  const zFar = zEnd;
  const grid = [];
  for (let j = 0; j <= NZ; j++) {
    const row = [];
    // Rows bunch up near the town so the foothills keep their shape.
    const t = j / NZ;
    const z = zStart + 20 - (zStart + 20 - zFar) * t * t;
    for (let i = 0; i <= NX; i++) {
      const x = x0 + ((x1 - x0) * i) / NX + (j % 2 ? (x1 - x0) / NX / 2 : 0);
      const jit = j > 0 && j < NZ && i > 0 && i < NX ? (R() - 0.5) * 14 : 0;
      row.push([x + jit, heightAt(x + jit, z) + 0.05, z + (R() - 0.5) * 6 * t]);
    }
    grid.push(row);
  }
  // The spurs need ground all the way to the coast: a second field south of zStart, outside the town.
  const emitTri = (a, b, c) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    if (n[1] < 0) n = [-n[0], -n[1], -n[2]];
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    const h = (a[1] + b[1] + c[1]) / 3;
    if (h < 0.3) return;   // flat ground is the town slab
    const slope = Math.hypot(n[0], n[2]) / Math.abs(n[1] || 1e-6);
    const col = bandColor(h + (R() - 0.5) * 20, slope);
    const k = 0.94 + R() * 0.1;
    mb.color = [col[0] * k, col[1] * k, col[2] * k];
    mb.triFacing('hill', a, b, c, [n[0] / len, n[1] / len, n[2] / len]);
  };
  const sheet = (g) => {
    for (let j = 0; j < g.length - 1; j++) {
      for (let i = 0; i < g[j].length - 1; i++) {
        const a = g[j][i], b = g[j][i + 1], c = g[j + 1][i + 1], d = g[j + 1][i];
        emitTri(a, b, c);
        emitTri(a, c, d);
      }
    }
  };
  sheet(grid);
  // Headland sheets from zStart down to the coast on both flanks.
  for (const [xa, xb] of [[x0, o.spurX0], [o.spurX1, x1]]) {
    const g = [];
    const nz = 14, nx = 18;
    for (let j = 0; j <= nz; j++) {
      const z = coastZ - 2 - ((coastZ - 2 - (zStart + 20)) * j) / nz;
      const row = [];
      for (let i = 0; i <= nx; i++) {
        const x = xa + ((xb - xa) * i) / nx;
        row.push([x, heightAt(x, z) + 0.05, z]);
      }
      g.push(row);
    }
    sheet(g.reverse());
  }

  // ---- terraced villas, cypress rows and pines on the lower slopes ----------
  const placed = [];
  let villas = 0;
  for (let k = 0; k < 900 && villas < 70; k++) {
    const x = x0 + 120 + R() * (x1 - x0 - 240);
    const z = zStart - 15 - R() * 380;
    const h = heightAt(x, z);
    if (h < 4 || h > 110 || !o.isClear(x, z)) continue;
    // Slope at the lot: skip cliffs.
    const dz = heightAt(x, z + 8) - heightAt(x, z - 8);
    if (Math.abs(dz) > 9) continue;
    if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 30)) continue;
    placed.push([x, z]);
    const r = rng((x * 73 + z * 31) | 0);
    const W = 11 + r() * 7, D = 9 + r() * 4;
    // Face the sea (south), turned a little to follow the contour.
    const ang = (r() - 0.5) * 0.5;
    const fx = Math.sin(ang), fz = Math.cos(ang);
    const base = Math.min(heightAt(x, z), heightAt(x - fz * W / 2, z + fx * W / 2), heightAt(x + fz * W / 2, z - fx * W / 2)) - 0.2;
    // Terrace: a stone retaining wall in front, the villa on the platform.
    const F = new Frame(mb, x, base, z, fz, -fx);
    const top = heightAt(x, z - D) - base;
    F.box('stucco', -W / 2 - 3, W / 2 + 3, -Math.max(4, top + 6), 0, -D - 3, 7, PALETTE.stoneDark);
    F.box('trim', -W / 2 - 3.1, W / 2 + 3.1, 0, 0.35, 6.6, 7.1, PALETTE.stone);
    villa(F, r, { width: W, depth: D, floors: 2, detail: false });
    villas++;
    // Cypress row along the drive, a pine or two behind.
    const side = r() < 0.5 ? -1 : 1;
    for (let c = 0; c < 4; c++) {
      const cx = x + fz * side * (W / 2 + 5) - fx * (c * 4 - 4), cz = z - fx * side * (W / 2 + 5) - fz * (c * 4 - 4);
      cypress(new Frame(mb, cx, heightAt(cx, cz) - 0.3, cz, 1, 0), r, 0, 0, 8 + r() * 5);
    }
    for (let c = 0; c < 2; c++) {
      const cx = x + (r() - 0.5) * W * 2, cz = z - D - 6 - r() * 10;
      tree(new Frame(mb, cx, heightAt(cx, cz) - 0.3, cz, 1, 0), r);
    }
  }
  // Scattered cypress clumps and pines across the slopes.
  for (let k = 0; k < 420; k++) {
    const x = x0 + R() * (x1 - x0), z = zStart - 10 - R() * 700;
    const h = heightAt(x, z);
    if (h < 3 || h > 150 || !o.isClear(x, z)) continue;
    const F = new Frame(mb, x, h - 0.4, z, 1, 0);
    if (R() < 0.55) { const r = rng(k * 17); for (let c = 0; c < 3; c++) cypress(F, r, (r() - 0.5) * 6, (r() - 0.5) * 6, 6 + r() * 6); }
    else tree(F, rng(k * 29));
  }
  return { mb, heightAt, villas };
}
