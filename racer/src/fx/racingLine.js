import { BufferGeometry, BufferAttribute, Mesh, MeshBasicMaterial, DoubleSide } from 'three';

/*
 * Reactive racing line, like the F1 games: an ideal line round the lap and a speed profile for the
 * car you're driving, drawn on the road ahead of you and coloured live against your speed:
 * green where you can stay on the power, yellow where you'll need to lift, red where you must brake
 * now to make the corner. It reaches ~220 m ahead and fades out; nothing is drawn behind the car.
 */

const G = 9.81;
const AHEAD = 220;

/**
 * The line itself, close to a minimum-curvature line: a string pulled tight through the lap,
 * relaxed coarse-to-fine (corners first, then the detail), clamped inside the kerbs with room for
 * the car, then smoothed so the steering it asks for is continuous. Cached per layout.
 */
function idealLine(L) {
  if (L._racingLine) return L._racingLine;
  const N = L.N, lim = Math.max(0.5, L.halfW - 1.3), o = new Float64Array(N);
  const px = (i) => L.x[i] + L.nx[i] * o[i], pz = (i) => L.z[i] + L.nz[i] * o[i];
  const clamp = (v) => Math.max(-lim, Math.min(lim, v));
  // Minimise the total squared curvature (what lets a car carry the most speed) by coordinate
  // descent on each offset, curvature measured over ~10 m chords, the step shrinking as it settles.
  const h = Math.max(2, Math.round(10 / L.ds));
  const kap = (i) => {
    const a = (i - h + N) % N, b = (i + h) % N;
    const ax = px(a), az = pz(a), bx = px(i), bz = pz(i), cx = px(b), cz = pz(b);
    const ab = Math.hypot(bx - ax, bz - az), bc = Math.hypot(cx - bx, cz - bz), ca = Math.hypot(ax - cx, az - cz);
    return (2 * ((bx - ax) * (cz - az) - (bz - az) * (cx - ax))) / (ab * bc * ca + 1e-9);
  };
  const local = (i) => { let e = 0; for (const d of [-h, 0, h]) { const k = kap((i + d + N) % N); e += k * k; } return e; };
  for (let step = 1.0; step > 0.02; step *= 0.7) {
    for (let it = 0; it < 6; it++) {
      for (let i = 0; i < N; i++) {
        const o0 = o[i], e0 = local(i);
        o[i] = clamp(o0 + step); const e1 = local(i);
        o[i] = clamp(o0 - step); const e2 = local(i);
        o[i] = e1 < e0 && e1 <= e2 ? clamp(o0 + step) : e2 < e0 ? clamp(o0 - step) : o0;
      }
    }
  }
  // Light smoothing (a ~10 m window), so the steering it asks for stays continuous.
  const w = Math.max(1, Math.round(6 / L.ds));
  for (let pass = 0; pass < 4; pass++) {
    const t = Float64Array.from(o);
    for (let i = 0; i < N; i++) { let sum = 0; for (let d = -w; d <= w; d++) sum += t[(i + d + N) % N]; o[i] = clamp(sum / (2 * w + 1)); }
  }
  // Radius of the line (circle through points ~16 m either side), then smoothed.
  const R = new Float64Array(N), m = Math.max(2, Math.round(16 / L.ds));
  for (let i = 0; i < N; i++) {
    const a = (i - m + N) % N, b = (i + m) % N;
    const ax = px(a), az = pz(a), bx = px(i), bz = pz(i), cx = px(b), cz = pz(b);
    const ab = Math.hypot(bx - ax, bz - az), bc = Math.hypot(cx - bx, cz - bz), ca = Math.hypot(ax - cx, az - cz);
    const cross = Math.abs((bx - ax) * (cz - az) - (bz - az) * (cx - ax));
    R[i] = cross < 1e-6 ? 1e4 : (ab * bc * ca) / (2 * cross);
  }
  return (L._racingLine = { o, R });
}

/** Target speed along the line for this car: cornering limit, then braking and traction passes. */
function speedProfile(L, line, gripAt) {
  const N = L.N, ds = L.ds, v = new Float64Array(N), dec = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let s = 30;
    for (let k = 0; k < 4; k++) s = Math.min(95, Math.sqrt(gripAt(s) * 0.85 * G * line.R[i]));
    v[i] = s;
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let k = 2 * N; k > 0; k--) { // braking: work backwards from each corner
      const i = k % N, j = (i + 1) % N, d = gripAt(v[j]) * G * 0.75;
      dec[i] = d;
      v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * d * ds));
    }
    for (let k = 0; k < 2 * N; k++) { // traction: forwards out of each corner
      const i = k % N, j = (i + 1) % N, a = Math.max(1.5, 8.5 - v[i] * 0.07);
      v[j] = Math.min(v[j], Math.sqrt(v[i] * v[i] + 2 * a * ds));
    }
  }
  return { v, dec };
}

export function createRacingLine(L) {
  const line = idealLine(L), N = L.N;
  const pos = new Float32Array(N * 2 * 3), col = new Float32Array(N * 2 * 4), idx = [];
  const half = 0.35;
  for (let i = 0; i < N; i++) {
    const o = line.o[i], cx = L.x[i] + L.nx[i] * o, cz = L.z[i] + L.nz[i] * o, y = L.yAt(i, o) + 0.09;
    pos.set([cx + L.nx[i] * half, y, cz + L.nz[i] * half, cx - L.nx[i] * half, y, cz - L.nz[i] * half], i * 6);
    const j = (i + 1) % N;
    idx.push(i * 2, j * 2, i * 2 + 1, i * 2 + 1, j * 2, j * 2 + 1);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  const colour = new BufferAttribute(col, 4);
  geo.setAttribute('color', colour);
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  const mat = new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const mesh = new Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;

  let profile = null, profileFor = null, drawn = [];
  const shown = {};
  const RED = [1.0, 0.13, 0.1], YELLOW = [1.0, 0.8, 0.1], GREEN = [0.15, 0.95, 0.35];
  const set = (i, r, g, b, a) => { for (const k of [i * 2, i * 2 + 1]) col.set([r, g, b, a], k * 4); };
  return {
    mesh,
    /** vehicle: the player's car (speed, grip model); s: the car's distance along the lap. */
    update(vehicle, s) {
      if (profileFor !== vehicle.cfg) { profile = speedProfile(L, line, (v) => vehicle.escGripAt(v)); profileFor = vehicle.cfg; }
      for (const i of drawn) set(i, 0, 0, 0, 0);
      drawn = [];
      if (s == null) { colour.needsUpdate = true; return; }
      // The F1-game reading: compare the speed you carry now with the most the line allows at each
      // point (the profile already includes the braking needed for the corner after it). Where your
      // speed is over it you must be braking: red. Close to it: yellow, lift. Under it: green, power.
      // Colours ease towards their target, so the line never flickers.
      const v = Math.max(0, vehicle.forwardSpeed), i0 = Math.floor(s / L.ds);
      for (let k = 1; k * L.ds < AHEAD; k++) {
        const i = (i0 + k) % N, dist = k * L.ds, vt = profile.v[i];
        const r = v / Math.max(1, vt);
        const target = r > 1.03 ? RED : r > 0.94 ? YELLOW : GREEN;
        const c = shown[i] ??= target.slice();
        for (let q = 0; q < 3; q++) c[q] += (target[q] - c[q]) * 0.25;
        const a = 0.75 * Math.min(1, k / 5) * (1 - dist / AHEAD);
        set(i, c[0], c[1], c[2], a);
        drawn.push(i);
      }
      for (const i of Object.keys(shown)) if (!drawn.includes(+i)) delete shown[i];
      colour.needsUpdate = true;
    },
  };
}
