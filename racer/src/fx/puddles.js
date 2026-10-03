import { BufferGeometry, Float32BufferAttribute, Mesh, MeshPhysicalMaterial } from 'three';

/**
 * Standing water for wet races. Puddles collect where water would: in the dips
 * of the elevation profile, at the foot of the kerbs on corner exits, and in a
 * few random low spots along the lap. Each is an irregular, mirror-glossy decal
 * on the road; physically it's a patch where the tyres aquaplane a little.
 *
 * createPuddles(layout) -> { mesh, at(x, z) -> depth 0..1 }
 */
export function createPuddles(L, seed = 7) {
  let a = seed >>> 0;
  const R = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const N = L.N, ds = L.ds;
  const list = []; // { f, lat, along, across, rot }
  const add = (f, lat, size) => list.push({ f, lat, along: size * (1.6 + R() * 1.4), across: size * (0.7 + R() * 0.6), seed: R() * 6.28 });

  // Dips in the elevation profile: the local minima collect the most water.
  if (L.hasRelief) {
    for (let i = 0; i < N; i++) {
      const w = Math.round(30 / ds);
      const e = L.elev[i];
      if (e < L.elev[(i - w + N) % N] - 0.4 && e < L.elev[(i + w) % N] - 0.4 && e <= L.elev[(i + 1) % N] && e <= L.elev[(i - 1 + N) % N]) {
        for (let k = 0; k < 4; k++) add(i + (R() - 0.5) * 12 / ds, (R() - 0.5) * (L.halfW * 1.4), 1.6 + R() * 1.6);
      }
    }
  }
  // Corner exits: water sheets off the camber and pools against the outside kerb.
  for (let i = 0; i < N; i += Math.round(8 / ds)) {
    if (Math.abs(L.k[i]) < 1 / 80 || R() > 0.35) continue;
    const outside = L.k[i] > 0 ? -1 : 1;
    add(i + 6 / ds, outside * (L.halfW - 1.0 - R() * 1.2), 0.9 + R() * 0.9);
  }
  // A scattering of shallow puddles in ruts and low spots along the lap.
  for (let k = 0; k < Math.round(L.length / 140); k++) add(R() * N, (R() - 0.5) * L.halfW * 1.5, 0.7 + R() * 1.1);

  // ---- mesh: an irregular 14-sided blob per puddle, conforming to the road --------------------
  const pos = [], nor = [];
  const P = (f, lat) => {
    const i = ((Math.floor(f) % N) + N) % N, t = f - Math.floor(f), j = (i + 1) % N;
    const x = L.x[i] + (L.x[j] - L.x[i]) * t + L.nx[i] * lat, z = L.z[i] + (L.z[j] - L.z[i]) * t + L.nz[i] * lat;
    return [x, (L.hasRelief ? L.yAt(f, lat) : 0) + 0.012, z];
  };
  const SIDES = 14;
  for (const p of list) {
    const c = P(p.f, p.lat);
    const ring = [];
    for (let k = 0; k < SIDES; k++) {
      const t = (k / SIDES) * Math.PI * 2;
      const wob = 0.75 + 0.25 * Math.sin(t * 3 + p.seed) + 0.12 * Math.sin(t * 5 + p.seed * 2);
      ring.push(P(p.f + (Math.cos(t) * p.along * wob) / ds, p.lat + Math.sin(t) * p.across * wob));
    }
    for (let k = 0; k < SIDES; k++) {
      const q0 = ring[k], q1 = ring[(k + 1) % SIDES];
      // Wind each triangle upward.
      const cr = (q0[0] - c[0]) * (q1[2] - c[2]) - (q0[2] - c[2]) * (q1[0] - c[0]);
      const tri = cr < 0 ? [c, q0, q1] : [c, q1, q0];
      for (const v of tri) { pos.push(...v); nor.push(0, 1, 0); }
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  const mesh = new Mesh(geo, new MeshPhysicalMaterial({
    color: 0x1a1d22, roughness: 0.02, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  }));
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  mesh.visible = false;

  // ---- physics: depth at a point, by nearest puddles (cheap: bucket by sample index) ----------
  const buckets = new Map();
  const B = Math.round(20 / ds);
  for (const p of list) {
    const b = Math.floor((((p.f % N) + N) % N) / B);
    if (!buckets.has(b)) buckets.set(b, []);
    buckets.get(b).push(p);
  }
  const at = (x, z) => {
    const n = L.nearest(x, z);
    if (!n) return 0;
    const f = n.i + n.t, b = Math.floor(f / B);
    let depth = 0;
    for (const bb of [b - 1, b, b + 1]) {
      for (const p of buckets.get(((bb % Math.ceil(N / B)) + Math.ceil(N / B)) % Math.ceil(N / B)) || []) {
        let df = (f - p.f) * ds;
        if (df > (N * ds) / 2) df -= N * ds;
        if (df < -(N * ds) / 2) df += N * ds;
        const u = df / p.along, v = (n.lateral - p.lat) / p.across;
        const r2 = u * u + v * v;
        if (r2 < 1) depth = Math.max(depth, 1 - r2);
      }
    }
    return depth;
  };
  return { mesh, at, count: list.length };
}
