import {
  BufferGeometry, Float32BufferAttribute, InstancedBufferAttribute, InstancedMesh, Matrix4,
  MeshStandardMaterial, Group, Vector3,
} from 'three';
import { rgb } from './kit.js';

/**
 * Hand-built low-poly people: spectators on the stands and along the fences,
 * mechanics in the pits. One model per pose and hair style; every instance
 * picks its own skin, shirt, trousers, hair and accessory colours, and cheering
 * fans wave their arms (animated in the vertex shader, so thousands cost one
 * draw call per stand and variant).
 *
 * Local space: feet at y = 0 (standing) or the seat at y = 0 (seated), facing +z.
 */

// Colour slots resolved per instance in the shader.
const SKIN = 0, SHIRT = 1, PANTS = 2, HAIR = 3, FIXED = 4, ACCENT = 5;
const SHOULDER_Y = 1.42, SHOULDER_X = 0.235;

class PersonBuilder {
  constructor() {
    this.pos = []; this.nrm = []; this.col = []; this.slot = []; this.arm = [];
  }

  tri(a, b, c, slot, arm, color) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const l = Math.hypot(...n) || 1;
    n = n.map((x) => x / l);
    for (const p of [a, b, c]) {
      this.pos.push(...p); this.nrm.push(...n); this.col.push(...(color || [1, 1, 1]));
      this.slot.push(slot); this.arm.push(arm);
    }
  }

  quad(a, b, c, d, slot, arm, color) { this.tri(a, b, c, slot, arm, color); this.tri(a, c, d, slot, arm, color); }

  /** Tapered box: bottom rect (x0..x1, z0..z1) at y0, top rect scaled by `top` [sx, sz] about its centre. */
  box(x0, x1, y0, y1, z0, z1, slot, { arm = 0, color = null, top = [1, 1], shift = [0, 0], bottom = false } = {}) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const tx = (x) => cx + (x - cx) * top[0] + shift[0], tz = (z) => cz + (z - cz) * top[1] + shift[1];
    const b = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]];
    const t = [[tx(x0), y1, tz(z0)], [tx(x1), y1, tz(z0)], [tx(x1), y1, tz(z1)], [tx(x0), y1, tz(z1)]];
    // Counter-clockwise from outside on every face.
    this.quad(b[3], b[2], t[2], t[3], slot, arm, color); // front (+z)
    this.quad(b[1], b[0], t[0], t[1], slot, arm, color); // back
    this.quad(b[2], b[1], t[1], t[2], slot, arm, color); // right (+x)
    this.quad(b[0], b[3], t[3], t[0], slot, arm, color); // left
    this.quad(t[3], t[2], t[1], t[0], slot, arm, color); // top
    if (bottom) this.quad(b[0], b[1], b[2], b[3], slot, arm, color);
  }

  /** n-gon frustum around the y axis at (x, z). */
  prism(x, z, r0, r1, y0, y1, sides, slot, { arm = 0, color = null, cap = true, sz = 1 } = {}) {
    for (let k = 0; k < sides; k++) {
      const a0 = (k / sides) * Math.PI * 2, a1 = ((k + 1) / sides) * Math.PI * 2;
      const p = (r, a, y) => [x + Math.sin(a) * r, y, z + Math.cos(a) * r * sz];
      this.quad(p(r0, a0, y0), p(r0, a1, y0), p(r1, a1, y1), p(r1, a0, y1), slot, arm, color);
      if (cap) this.tri(p(r1, a0, y1), p(r1, a1, y1), [x, y1, z], slot, arm, color);
    }
  }

  geometry() {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new Float32BufferAttribute(this.col, 3));
    g.setAttribute('slot', new Float32BufferAttribute(this.slot, 1));
    g.setAttribute('arm', new Float32BufferAttribute(this.arm, 1));
    return g;
  }
}

const SHOE = rgb(0x1d1d20), WHITE = rgb(0xf2f0ea), EYE = rgb(0x16120f), FLAGPOLE = rgb(0x8a8f96);

function head(pb, y, hair) {
  // A six-sided head that narrows at the chin, a nose and a strip of shades.
  const h0 = y + 0.05;
  pb.prism(0, 0.01, 0.075, 0.112, h0, h0 + 0.11, 6, SKIN, { cap: false });
  pb.prism(0, 0.01, 0.112, 0.1, h0 + 0.11, h0 + 0.22, 6, SKIN, { cap: false });
  pb.prism(0, 0.01, 0.1, 0.055, h0 + 0.22, h0 + 0.27, 6, hair === 'bald' ? SKIN : HAIR);
  pb.box(-0.018, 0.018, h0 + 0.09, h0 + 0.13, 0.1, 0.13, SKIN, { top: [0.6, 0.6] }); // nose
  pb.box(-0.085, 0.085, h0 + 0.135, h0 + 0.165, 0.085, 0.112, FIXED, { color: EYE }); // shades
  const top = h0 + 0.22;
  if (hair === 'short') {
    pb.box(-0.105, 0.105, top - 0.08, top + 0.04, -0.1, 0.06, HAIR, { top: [0.85, 0.8] });
  } else if (hair === 'long') {
    pb.box(-0.115, 0.115, h0 - 0.02, top + 0.04, -0.12, 0.04, HAIR, { top: [0.85, 0.85] });
  } else if (hair === 'cap') {
    pb.prism(0, 0.0, 0.118, 0.1, top - 0.03, top + 0.07, 6, ACCENT);
    pb.box(-0.09, 0.09, top - 0.025, top, 0.08, 0.2, ACCENT); // peak
  } else if (hair === 'bun') {
    pb.box(-0.105, 0.105, top - 0.07, top + 0.04, -0.1, 0.05, HAIR, { top: [0.85, 0.8] });
    pb.box(-0.05, 0.05, top + 0.0, top + 0.1, -0.13, -0.04, HAIR, { top: [0.7, 0.7] });
  }
}

/** Arm hanging from the shoulder (side s = ±1); animated as a unit by the shader. */
function arm(pb, s, raise, sleeve) {
  const x = s * SHOULDER_X;
  const a = s; // shader rotates vertices tagged with the arm side about the shoulder
  pb.box(x - 0.055, x + 0.055, SHOULDER_Y - 0.3, SHOULDER_Y + 0.02, -0.055, 0.055, SHIRT, { arm: a, top: [1.1, 1.1] });
  pb.box(x - 0.04, x + 0.04, SHOULDER_Y - 0.66, SHOULDER_Y - 0.29, -0.035, 0.05, sleeve === 'long' ? SHIRT : SKIN, { arm: a, top: [1.2, 1.15] }); // forearm and hand
  if (raise === 'flag' && s > 0) {
    // A small flag on a stick held in the right hand.
    pb.box(x - 0.012, x + 0.012, SHOULDER_Y - 0.72, SHOULDER_Y - 0.05, 0.0, 0.024, FIXED, { arm: a, color: FLAGPOLE });
    pb.quad([x, SHOULDER_Y - 0.36, 0.012], [x, SHOULDER_Y - 0.36, 0.38], [x, SHOULDER_Y - 0.08, 0.38], [x, SHOULDER_Y - 0.08, 0.012], ACCENT, a);
    pb.quad([x, SHOULDER_Y - 0.36, 0.38], [x, SHOULDER_Y - 0.36, 0.012], [x, SHOULDER_Y - 0.08, 0.012], [x, SHOULDER_Y - 0.08, 0.38], ACCENT, a);
  }
}

function standingBody(pb) {
  for (const s of [-1, 1]) {
    const x = s * 0.085;
    pb.box(x - 0.065, x + 0.065, 0, 0.08, -0.07, 0.15, FIXED, { color: SHOE, top: [0.95, 0.9] });
    pb.box(x - 0.066, x + 0.066, 0.08, 0.9, -0.068, 0.068, PANTS, { top: [1.25, 1.15] });
  }
  pb.box(-0.17, 0.17, 0.88, 1.0, -0.1, 0.1, PANTS);                            // hips
  pb.box(-0.18, 0.18, 1.0, SHOULDER_Y + 0.04, -0.105, 0.11, SHIRT, { top: [1.2, 1.0] }); // torso, wider at the shoulders
}

function seatedBody(pb) {
  // Seat at y = 0: thighs forward, shins down to the step below.
  for (const s of [-1, 1]) {
    const x = s * 0.085;
    pb.box(x - 0.074, x + 0.074, 0.02, 0.17, -0.05, 0.44, PANTS);
    pb.box(x - 0.068, x + 0.068, -0.4, 0.05, 0.33, 0.47, PANTS);
    pb.box(x - 0.065, x + 0.065, -0.48, -0.4, 0.3, 0.58, FIXED, { color: SHOE });
  }
  pb.box(-0.17, 0.17, 0.0, 0.14, -0.12, 0.1, PANTS);
  pb.box(-0.18, 0.18, 0.12, 0.6, -0.12, 0.08, SHIRT, { top: [1.2, 1.0], shift: [0, 0.02] });
}

const VARIANTS = {
  standShort: { seated: false, hair: 'short' },
  standLong: { seated: false, hair: 'long' },
  standCap: { seated: false, hair: 'cap' },
  standFlag: { seated: false, hair: 'bun', raise: 'flag' },
  sitShort: { seated: true, hair: 'short' },
  sitLong: { seated: true, hair: 'long' },
  sitCap: { seated: true, hair: 'cap' },
  sitBald: { seated: true, hair: 'bald', raise: 'flag' },
};

const geometries = new Map();
function geometryFor(name) {
  if (geometries.has(name)) return geometries.get(name);
  const v = VARIANTS[name];
  const pb = new PersonBuilder();
  if (v.seated) {
    // The seated model is the standing torso lowered so the hips sit on y = 0.
    const lift = -0.88;
    seatedBody(pb);
    const sub = new PersonBuilder();
    head(sub, SHOULDER_Y + 0.02, v.hair);
    for (const s of [-1, 1]) arm(sub, s, v.raise, 'short');
    for (let i = 1; i < sub.pos.length; i += 3) sub.pos[i] += lift + 0.28;
    for (const k of ['pos', 'nrm', 'col', 'slot', 'arm']) pb[k].push(...sub[k]);
  } else {
    standingBody(pb);
    head(pb, SHOULDER_Y + 0.02, v.hair);
    for (const s of [-1, 1]) arm(pb, s, v.raise, 'short');
  }
  const g = pb.geometry();
  geometries.set(name, g);
  return g;
}

/**
 * Far LOD: the same person as three boxes (legs, torso, head with a hair cap),
 * ~30 triangles instead of ~200, coloured by the same per-instance slots.
 */
const lodGeometries = new Map();
function lodGeometryFor(seated) {
  if (lodGeometries.has(seated)) return lodGeometries.get(seated);
  const pb = new PersonBuilder();
  const dy = seated ? -0.6 : 0;
  if (seated) pb.box(-0.16, 0.16, -0.02, 0.12, -0.05, 0.42, 2); // thighs forward on the seat
  else pb.box(-0.15, 0.15, 0, 0.88, -0.09, 0.09, 2);
  pb.box(-0.21, 0.21, 0.88 + dy, SHOULDER_Y + 0.02 + dy, -0.12, 0.12, 1, { top: [0.9, 0.9] });
  pb.box(-0.13, 0.13, SHOULDER_Y + 0.04 + dy, SHOULDER_Y + 0.3 + dy, -0.12, 0.13, 0);
  pb.box(-0.14, 0.14, SHOULDER_Y + 0.3 + dy, SHOULDER_Y + 0.36 + dy, -0.13, 0.13, 3);
  const g = pb.geometry();
  lodGeometries.set(seated, g);
  return g;
}

// Shoulder pivot height per pose (seated models are lowered by 0.6).
const PIVOT = { false: SHOULDER_Y, true: SHOULDER_Y - 0.6 };

const time = { value: 0 };
const materials = new Map();
function materialFor(seated) {
  const key = String(seated);
  if (materials.has(key)) return materials.get(key);
  const m = new MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime;
        attribute float slot;
        attribute float arm;
        attribute vec3 color;
        attribute vec3 iSkin;
        attribute vec3 iShirt;
        attribute vec3 iPants;
        attribute vec3 iHair;
        attribute vec3 iAccent;
        attribute vec2 iMood; // x: cheer amount 0..1, y: phase
        varying vec3 vPersonColor;
        vec3 swingArm(vec3 p, float side, float ang) {
          // Rotate about the shoulder, around the body's forward axis (arm swings out and up).
          vec3 pivot = vec3(side * ${SHOULDER_X.toFixed(3)}, ${PIVOT[key].toFixed(3)}, 0.0);
          vec3 d = p - pivot;
          float c = cos(ang * side), s = sin(ang * side);
          return pivot + vec3(d.x * c - d.y * s, d.x * s + d.y * c, d.z);
        }`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        float cheer = iMood.x;
        float swing = cheer * (1.9 + 0.7 * sin(uTime * (5.0 + cheer * 3.0) + iMood.y + arm * 1.7)) + (1.0 - cheer) * 0.08;
        if (abs(arm) > 0.5) {
          float c = cos(swing * arm), s = sin(swing * arm);
          objectNormal = vec3(objectNormal.x * c - objectNormal.y * s, objectNormal.x * s + objectNormal.y * c, objectNormal.z);
        }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        if (abs(arm) > 0.5) transformed = swingArm(transformed, arm, swing);
        // Fans bounce a little when they cheer.
        transformed.y += cheer * 0.04 * max(0.0, sin(uTime * 7.0 + iMood.y));
        vPersonColor = slot < 0.5 ? iSkin : slot < 1.5 ? iShirt : slot < 2.5 ? iPants : slot < 3.5 ? iHair : slot < 4.5 ? color : iAccent;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPersonColor;')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * vPersonColor, opacity );');
  };
  materials.set(key, m);
  return m;
}

const SKINS = [0xf1c8a6, 0xe0ac86, 0xc68b62, 0x9c6844, 0x6e4529, 0xf6d7bd, 0xb57a52].map(rgb);
const HAIRS = [0x1b1410, 0x3a2416, 0x6b4223, 0xc89a55, 0xe6cf98, 0x8a8a88, 0x9c3b1c, 0x111111].map(rgb);
const PANTS_C = [0x2c3e5c, 0x1f2a3d, 0xc8b590, 0x2a2a2c, 0xece8de, 0x5a6470, 0x7a5a3a, 0x3d5a3a].map(rgb);
const FAN = [0xc8242b, 0xf2ede2, 0x1f4f9a, 0xffc21a, 0x2f6b4a, 0xe86a2c, 0x222226, 0x9b59b6, 0x6fd61f, 0xff4fa0, 0x14c38e, 0xff7a12, 0x7df9ff].map(rgb);

/**
 * A crowd: people[] of { p: [x, y, z], yaw, seated, shirt?, cheer? }.
 * Returns a Group with one InstancedMesh per used variant.
 */
export function buildCrowd(people, seed = 1) {
  let a = seed >>> 0;
  const R = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (arr) => arr[Math.floor(R() * arr.length) % arr.length];
  const groups = new Map();
  for (const q of people) {
    const names = Object.keys(VARIANTS).filter((n) => VARIANTS[n].seated === !!q.seated && (q.pose ? n === q.pose : true));
    const name = q.pose ?? pick(names);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(q);
  }
  const group = new Group();
  const near = [], far = [];
  group.userData.lod = { near, far };
  const m = new Matrix4();
  const scale = new Vector3();
  for (const [name, list] of groups) {
    const geo = geometryFor(name).clone();
    const n = list.length;
    const attrs = { iSkin: new Float32Array(n * 3), iShirt: new Float32Array(n * 3), iPants: new Float32Array(n * 3), iHair: new Float32Array(n * 3), iAccent: new Float32Array(n * 3), iMood: new Float32Array(n * 2) };
    const mesh = new InstancedMesh(geo, materialFor(VARIANTS[name].seated), n);
    list.forEach((q, k) => {
      const s = 0.92 + R() * 0.16; // heights vary
      m.makeRotationY(q.yaw + (R() - 0.5) * 0.5).scale(scale.setScalar(s));
      m.setPosition(q.p[0], q.p[1], q.p[2]);
      mesh.setMatrixAt(k, m);
      const shirt = q.shirt ?? pick(FAN);
      attrs.iSkin.set(pick(SKINS), k * 3);
      attrs.iShirt.set(shirt, k * 3);
      attrs.iPants.set(q.pants ?? pick(PANTS_C), k * 3);
      attrs.iHair.set(pick(HAIRS), k * 3);
      attrs.iAccent.set(R() < 0.5 ? shirt : pick(FAN), k * 3);
      attrs.iMood.set([q.cheer ?? (R() < 0.35 ? 0.4 + R() * 0.6 : 0), R() * 6.283], k * 2);
    });
    // Far LOD shares the instance data (matrices and colours) with the full mesh.
    const lodGeo = lodGeometryFor(VARIANTS[name].seated).clone();
    for (const [key, arr] of Object.entries(attrs)) {
      const attr = new InstancedBufferAttribute(arr, key === 'iMood' ? 2 : 3);
      geo.setAttribute(key, attr);
      lodGeo.setAttribute(key, attr);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    const lod = new InstancedMesh(lodGeo, mesh.material, n);
    lod.instanceMatrix = mesh.instanceMatrix;
    lod.boundingSphere = mesh.boundingSphere;
    lod.visible = false;
    group.add(mesh, lod);
    near.push(mesh);
    far.push(lod);
  }
  return group;
}

/**
 * Crowd visibility by distance from the camera: full models within `nearDist`,
 * the box LOD out to `farDist`, nothing beyond. `rad` is the crowd's radius.
 */
export function setCrowdLod(crowd, dist, rad, nearDist = 45, farDist = 320) {
  const d = dist - rad;
  crowd.visible = d < farDist;
  const lod = crowd.userData.lod;
  if (!lod || !crowd.visible) return;
  const close = d < nearDist;
  for (const m of lod.near) m.visible = close;
  for (const m of lod.far) m.visible = !close;
}

/**
 * Split a crowd into ~`cell`-metre chunks so distance LOD works locally on big
 * grandstands. Returns [{ c, cx, cz, rad }] ready for setCrowdLod.
 */
export function buildCrowdChunks(people, seed = 1, cell = 40) {
  const cells = new Map();
  for (const q of people) {
    const key = `${Math.floor(q.p[0] / cell)},${Math.floor(q.p[2] / cell)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(q);
  }
  const out = [];
  let k = 0;
  for (const list of cells.values()) {
    const c = buildCrowd(list, seed + k++ * 7919);
    let cx = 0, cz = 0;
    for (const q of list) { cx += q.p[0]; cz += q.p[2]; }
    cx /= list.length; cz /= list.length;
    let rad = 0;
    for (const q of list) rad = Math.max(rad, Math.hypot(q.p[0] - cx, q.p[2] - cz));
    out.push({ c, cx, cz, rad });
  }
  return out;
}

/** Advance the crowd animation (shared by every crowd). */
export function animateCrowds(dt) { time.value += dt; }
