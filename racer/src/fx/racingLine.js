import { BufferGeometry, BufferAttribute, Mesh, MeshBasicMaterial, DoubleSide } from 'three';

/*
 * Reactive racing line, like the F1 games: an ideal line round the lap and a speed profile for the
 * car you're driving, drawn on the road ahead of you and coloured live against your speed:
 * green where you can stay on the power, yellow where you'll need to lift, red where you must brake
 * now to make the corner. It reaches ~220 m ahead and fades out; nothing is drawn behind the car.
 */

const G = 9.81;
const AHEAD = 220;

/** The line itself: a tightened string through the lap, kept on the asphalt (cached per layout). */
function idealLine(L) {
  if (L._racingLine) return L._racingLine;
  const N = L.N, lim = L.halfW - 1.0, o = new Float64Array(N);
  const px = (i) => L.x[i] + L.nx[i] * o[i], pz = (i) => L.z[i] + L.nz[i] * o[i];
  // Relax each point toward the midpoint of its neighbours (a string pulled tight), projected back
  // onto its cross-section and clamped to the road: the classic outside-apex-outside line.
  for (let it = 0; it < 500; it++) {
    for (let i = 0; i < N; i++) {
      const a = (i - 2 + N) % N, b = (i + 2) % N;
      const mx = (px(a) + px(b)) / 2, mz = (pz(a) + pz(b)) / 2;
      const lat = (mx - L.x[i]) * L.nx[i] + (mz - L.z[i]) * L.nz[i];
      o[i] = Math.max(-lim, Math.min(lim, o[i] + (lat - o[i]) * 0.6));
    }
  }
  // Radius of the line at each sample (circle through points 4 samples either side).
  const R = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const a = (i - 4 + N) % N, b = (i + 4) % N;
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
    for (let k = 0; k < 4; k++) s = Math.min(95, Math.sqrt(gripAt(s) * 0.92 * G * line.R[i]));
    v[i] = s;
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let k = 2 * N; k > 0; k--) { // braking: work backwards from each corner
      const i = k % N, j = (i + 1) % N, d = gripAt(v[j]) * G * 0.85;
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
  const set = (i, r, g, b, a) => { for (const k of [i * 2, i * 2 + 1]) col.set([r, g, b, a], k * 4); };
  return {
    mesh,
    /** vehicle: the player's car (speed, grip model); s: the car's distance along the lap. */
    update(vehicle, s) {
      if (profileFor !== vehicle.cfg) { profile = speedProfile(L, line, (v) => vehicle.escGripAt(v)); profileFor = vehicle.cfg; }
      for (const i of drawn) set(i, 0, 0, 0, 0);
      drawn = [];
      if (s == null) { colour.needsUpdate = true; return; }
      const v = Math.max(0, vehicle.forwardSpeed), i0 = Math.floor(s / L.ds);
      for (let k = 1; k * L.ds < AHEAD; k++) {
        const i = (i0 + k) % N, dist = k * L.ds, vt = profile.v[i];
        const need = (v * v - vt * vt) / (2 * Math.max(dist, 1)); // deceleration needed to arrive at the target speed
        const r = need / profile.dec[i];
        let c;
        if (r > 0.75) c = [1.0, 0.12, 0.1];          // brake now
        else if (r > 0.3) c = [1.0, 0.78, 0.1];      // lift / brake soon
        else c = [0.15, 0.95, 0.35];                 // power
        const a = 0.8 * Math.min(1, k / 4) * (1 - dist / AHEAD);
        set(i, c[0], c[1], c[2], a);
        drawn.push(i);
      }
      colour.needsUpdate = true;
    },
  };
}
