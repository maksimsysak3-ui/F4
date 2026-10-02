/**
 * Street-circuit geometry, shared by physics and visuals so what you see is
 * exactly what the car feels.
 *
 * Hand-drawn layout points -> closed centripetal Catmull-Rom spline -> evenly
 * spaced samples (position, tangent, left normal, curvature). From those:
 * kerb zones on corner apexes and exits, run-off widths that open up on the
 * outside of corners, and wall offsets clamped wherever two parts of the
 * circuit run close together (they share a wall in the middle).
 *
 * World: x/z ground plane, +y up. Image y (down) maps to world +z.
 */

const TAU = Math.PI * 2;

function catmullRomClosed(pts, perSegment) {
  // Centripetal parameterisation: no loops or cusps on uneven point spacing.
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const d = (a, b) => Math.max(1e-4, Math.hypot(b[0] - a[0], b[1] - a[1]) ** 0.5);
    const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
    for (let k = 0; k < perSegment; k++) {
      const t = t1 + ((t2 - t1) * k) / perSegment;
      const lerp = (a, b, ta, tb) => {
        const w = (t - ta) / (tb - ta);
        return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w];
      };
      const A1 = lerp(p0, p1, t0, t1), A2 = lerp(p1, p2, t1, t2), A3 = lerp(p2, p3, t2, t3);
      const B1 = lerp(A1, A2, t0, t2), B2 = lerp(A2, A3, t1, t3);
      out.push(lerp(B1, B2, t1, t2));
    }
  }
  return out;
}

/** Resample a closed polyline to (almost exactly) equal arc-length steps. */
function resampleClosed(poly, step) {
  const n = poly.length;
  const cum = [0];
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[n];
  const count = Math.round(total / step);
  const out = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const s = (k / count) * total;
    while (cum[j + 1] < s) j++;
    const a = poly[j], b = poly[(j + 1) % n];
    const w = (s - cum[j]) / (cum[j + 1] - cum[j]);
    out.push([a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w]);
  }
  return out;
}

const SURFACES = {
  asphalt: { kind: 'asphalt', grip: 1, drag: 0 },
  kerb: { kind: 'kerb', grip: 0.97, drag: 0 },
  paint: { kind: 'paint', grip: 0.93, drag: 0.004 },
  grass: { kind: 'grass', grip: 0.55, drag: 0.06 },
  gravel: { kind: 'gravel', grip: 0.5, drag: 0.32 },
};

const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * @param {object} o
 * @param {number[][]} o.points    layout points (image px)
 * @param {number} o.metresPerPx
 * @param {number} o.width         road width (m)
 * @param {number} [o.step]        sample spacing (m)
 */
export function buildLayout(o) {
  const step = o.step || 2;
  const halfW = o.width / 2;
  const kerbW = o.kerbWidth || 1.1;
  const kerbH = o.kerbHeight || 0.04;

  // Centre the layout on the origin.
  let cx = 0, cy = 0;
  for (const [x, y] of o.points) { cx += x; cy += y; }
  cx /= o.points.length; cy /= o.points.length;
  const world = o.points.map(([x, y]) => [(x - cx) * o.metresPerPx, (y - cy) * o.metresPerPx]);

  let pts = resampleClosed(catmullRomClosed(world, 24), step);
  // A light Laplacian smooth irons out spline wobble on very short point spans.
  for (let pass = 0; pass < 4; pass++) {
    pts = pts.map((p, i) => {
      const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length];
      return [p[0] * 0.5 + (a[0] + b[0]) * 0.25, p[1] * 0.5 + (a[1] + b[1]) * 0.25];
    });
  }
  pts = resampleClosed(pts, step);
  const N = pts.length;
  const ds = step; // resampled: equal spacing

  const x = new Float64Array(N), z = new Float64Array(N);
  const tx = new Float64Array(N), tz = new Float64Array(N);
  const nx = new Float64Array(N), nz = new Float64Array(N);
  const k = new Float64Array(N);
  for (let i = 0; i < N; i++) { x[i] = pts[i][0]; z[i] = pts[i][1]; }
  for (let i = 0; i < N; i++) {
    const a = (i - 1 + N) % N, b = (i + 1) % N;
    let dx = x[b] - x[a], dz = z[b] - z[a];
    const l = Math.hypot(dx, dz);
    tx[i] = dx / l; tz[i] = dz / l;
    // Left of the direction of travel (car body +X is left when +Z is forward).
    nx[i] = tz[i]; nz[i] = -tx[i];
  }
  for (let i = 0; i < N; i++) {
    const a = (i - 1 + N) % N, b = (i + 1) % N;
    let da = Math.atan2(tx[b], tz[b]) - Math.atan2(tx[a], tz[a]);
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    k[i] = da / (2 * ds); // + = turning left
  }
  // Curvature smoothed over ~10 m for zone decisions.
  const ks = smoothArray(k, 3);
  const length = N * ds;

  // --- Kerbs: on the inside (apex) and outside (exit) of real corners. ---
  const KERB_K = 1 / 110;
  const kerbRaw = { L: new Float64Array(N), R: new Float64Array(N) };
  for (let i = 0; i < N; i++) {
    if (Math.abs(ks[i]) < KERB_K) continue;
    const inside = ks[i] > 0 ? 'L' : 'R';
    const outside = inside === 'L' ? 'R' : 'L';
    kerbRaw[inside][i] = 1;
    // Exit kerb on the outside, shifted forward along the corner.
    kerbRaw[outside][(i + Math.round(10 / ds)) % N] = 1;
  }
  const kerb = { L: dilate(kerbRaw.L, Math.round(10 / ds)), R: dilate(kerbRaw.R, Math.round(10 / ds)) };

  // --- Run-off and walls. ---
  const edge = halfW + kerbW;                // road + kerb
  const ro = { base: 1.6, open: 11, ...o.runoff }; // street default: pavement strip then the barrier
  const verge = o.verge || 'paved';
  const base = edge + ro.base;
  const desired = { L: new Float64Array(N), R: new Float64Array(N) };
  for (let i = 0; i < N; i++) {
    const c = Math.abs(ks[i]);
    const open = smoothstep(1 / 300, 1 / 45, c) * ro.open; // run-off on the outside of corners
    const outside = ks[i] > 0 ? 'R' : 'L';
    desired.L[i] = base + (outside === 'L' ? open : open * 0.12);
    desired.R[i] = base + (outside === 'R' ? open : open * 0.12);
  }
  // Run-offs extend past the corner exit, then blend smoothly.
  for (const side of ['L', 'R']) {
    desired[side] = smoothArray(shiftMax(desired[side], Math.round(10 / ds), Math.round(26 / ds)), 6);
  }

  // Clamp walls where another part of the circuit is close: walls meet halfway.
  const grid = new SegmentGrid(x, z, 24);
  const wall = { L: new Float64Array(N), R: new Float64Array(N) };
  const minWall = edge + 0.6;
  for (let i = 0; i < N; i++) {
    let limL = Infinity, limR = Infinity;
    for (const j of grid.near(x[i], z[i], 70)) {
      const sep = Math.min(Math.abs(i - j), N - Math.abs(i - j)) * ds;
      if (sep < 90) continue; // same stretch of road
      const vx = x[j] - x[i], vz = z[j] - z[i];
      const along = vx * tx[i] + vz * tz[i];
      if (Math.abs(along) > 30) continue;
      const lat = vx * nx[i] + vz * nz[i];
      const half = Math.abs(lat) / 2 - 0.4;
      if (lat > 0) limL = Math.min(limL, half); else limR = Math.min(limR, half);
    }
    wall.L[i] = Math.max(minWall, Math.min(desired.L[i], limL));
    wall.R[i] = Math.max(minWall, Math.min(desired.R[i], limR));
  }
  for (const side of ['L', 'R']) wall[side] = smoothMin(wall[side], 3);

  const layout = {
    /** Image pixel -> world [x, z] (same transform as the layout points). */
    fromImage(px, py) { return [(px - cx) * o.metresPerPx, (py - cy) * o.metresPerPx]; },
    N, ds, length, halfW, kerbW, kerbH, edge, x, z, tx, tz, nx, nz, k: ks, kerb, wall, grid,

    /** Closest centreline point: index, fraction, distance along, signed lateral offset (+ = left). */
    nearest(px, pz) {
      let best = null;
      let bestD = Infinity;
      for (const i of grid.near(px, pz, 24)) {
        const j = (i + 1) % N;
        const ax = x[i], az = z[i];
        const sx = x[j] - ax, sz = z[j] - az;
        const len2 = sx * sx + sz * sz;
        let t = ((px - ax) * sx + (pz - az) * sz) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const qx = ax + sx * t, qz = az + sz * t;
        const d2 = (px - qx) ** 2 + (pz - qz) ** 2;
        if (d2 < bestD) { bestD = d2; best = { i, t, qx, qz }; }
      }
      if (!best) return null;
      const { i, t } = best;
      const j = (i + 1) % N;
      const lnx = nx[i] + (nx[j] - nx[i]) * t, lnz = nz[i] + (nz[j] - nz[i]) * t;
      const lat = (px - best.qx) * lnx + (pz - best.qz) * lnz;
      return { i, t, s: (i + t) * ds, lateral: lat, dist: Math.sqrt(bestD) };
    },

    /** Interpolated per-sample value. */
    at(arr, i, t) {
      return arr[i] + (arr[(i + 1) % N] - arr[i]) * t;
    },

    /** Kerb surface height for a position across the kerb (u: 0 inner edge .. 1 outer) and along it. */
    kerbProfile(u, s) {
      const ridge = 0.6 + 0.4 * (1 - Math.abs(((s / 1.6) % 1) * 2 - 1));
      return kerbH * Math.min(1, u / 0.3) * ridge;
    },

    heightAt(px, pz) {
      const n = layout.nearest(px, pz);
      if (!n) return 0;
      const a = Math.abs(n.lateral);
      if (a < halfW || a > edge) return 0;
      const side = n.lateral > 0 ? 'L' : 'R';
      if (layout.at(kerb[side], n.i, n.t) < 0.5) return 0;
      return layout.kerbProfile((a - halfW) / kerbW, n.s);
    },

    /**
     * What the tyre is on: { kind, grip, drag }. Beyond the kerbs the verge style decides:
     * 'paved' run-offs keep most grip; 'gravel' traps bog the car down; grass is slippery.
     */
    surfaceAt(px, pz) {
      const n = layout.nearest(px, pz);
      if (!n) return SURFACES.asphalt;
      const a = Math.abs(n.lateral);
      if (a < halfW) return SURFACES.asphalt;
      const side = n.lateral > 0 ? 'L' : 'R';
      if (a < edge) return layout.at(kerb[side], n.i, n.t) > 0.5 ? SURFACES.kerb : SURFACES.asphalt;
      if (verge === 'paved') return SURFACES.paint;
      const wide = layout.at(wall[side], n.i, n.t) - edge > 4.7;
      return wide && a > edge + 0.6 ? SURFACES.gravel : SURFACES.grass;
    },

    /** Penetration of a point into the barriers: { depth, nx, nz } (push direction) or null. */
    wallContact(px, pz) {
      const n = layout.nearest(px, pz);
      if (!n) return null;
      const i = n.i;
      const lnx = nx[i], lnz = nz[i];
      const pit = layout.pit;
      if (pit && (n.lateral > 0) === (pit.side === 'L')) {
        const width = pit.widthAt(n.s);
        if (width > 0) {
          // Pit side: pit wall (open over the tapers) and the lane's outer wall.
          const sg = pit.side === 'L' ? 1 : -1;
          const a = n.lateral * sg;
          const w = layout.at(wall[pit.side], i, n.t), back = w + 0.62, outer = back + width;
          const inward = { nx: -lnx * sg, nz: -lnz * sg }, outward = { nx: lnx * sg, nz: lnz * sg };
          if (pit.barrierAt(n.s) && a > w && a < back) {
            return a < (w + back) / 2 ? { depth: a - w, ...inward } : { depth: back - a, ...outward };
          }
          const d = a - outer;
          return d > 0 && d < 4 ? { depth: d, ...inward } : null;
        }
      }
      if (n.lateral > 0) {
        const d = n.lateral - layout.at(wall.L, i, n.t);
        if (d > 0 && d < 4) return { depth: d, nx: -lnx, nz: -lnz };
      } else {
        const d = -n.lateral - layout.at(wall.R, i, n.t);
        if (d > 0 && d < 4) return { depth: d, nx: lnx, nz: lnz };
      }
      return null;
    },

    /** Pose on the circuit at distance s, offset sideways (+ left). */
    poseAt(s, lateral = 0) {
      const f = (((s / ds) % N) + N) % N;
      const i = Math.floor(f), t = f - i, j = (i + 1) % N;
      const px = x[i] + (x[j] - x[i]) * t + nx[i] * lateral;
      const pz = z[i] + (z[j] - z[i]) * t + nz[i] * lateral;
      return { x: px, z: pz, yaw: Math.atan2(tx[i], tz[i]), s: f * ds };
    },
  };
  return layout;
}

function smoothArray(a, radius) {
  const N = a.length;
  const out = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (let d = -radius; d <= radius; d++) s += a[(i + d + N) % N];
    out[i] = s / (2 * radius + 1);
  }
  return out;
}

function smoothMin(a, radius) {
  // Smooth, but never let a wall move outwards past where it was clamped.
  const sm = smoothArray(a, radius);
  return sm.map((v, i) => Math.min(v, a[i] + 0.5));
}

function dilate(a, r) {
  const N = a.length;
  const out = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    if (!a[i]) continue;
    for (let d = -r; d <= r; d++) out[(i + d + N) % N] = 1;
  }
  return out;
}

/** Running max over a window biased forwards (run-off continues past the corner). */
function shiftMax(a, back, ahead) {
  const N = a.length;
  const out = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let m = a[i];
    for (let d = -ahead; d <= back; d++) m = Math.max(m, a[(i + d + N) % N]);
    out[i] = m;
  }
  return out;
}

/** Uniform grid of centreline segments for fast nearest queries. */
class SegmentGrid {
  constructor(x, z, cell) {
    this.cell = cell;
    this.map = new Map();
    this.N = x.length;
    for (let i = 0; i < x.length; i++) {
      const cx = Math.floor(x[i] / cell), cz = Math.floor(z[i] / cell);
      const key = `${cx},${cz}`;
      if (!this.map.has(key)) this.map.set(key, []);
      this.map.get(key).push(i);
    }
  }

  /** Sample indices within roughly `radius` metres (cell-granular). */
  *near(px, pz, radius) {
    const c = this.cell;
    const r = Math.ceil(radius / c);
    const cx = Math.floor(px / c), cz = Math.floor(pz / c);
    for (let a = -r; a <= r; a++) {
      for (let b = -r; b <= r; b++) {
        const list = this.map.get(`${cx + a},${cz + b}`);
        if (list) yield* list;
      }
    }
  }
}
