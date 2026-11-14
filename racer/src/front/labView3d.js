import {
  WebGLRenderer, Scene, PerspectiveCamera, Color, FogExp2, Vector2, Vector3, Box3, Group, Mesh, PlaneGeometry, BoxGeometry, CylinderGeometry, TorusGeometry,
  SphereGeometry, TubeGeometry, CatmullRomCurve3, CanvasTexture, RepeatWrapping, SRGBColorSpace, ACESFilmicToneMapping, MeshStandardMaterial, MeshBasicMaterial,
  LineSegments, BufferGeometry, BufferAttribute, LineBasicMaterial, AdditiveBlending, DoubleSide, PMREMGenerator, DirectionalLight, HemisphereLight, PointLight,
  SpotLight, Sprite, SpriteMaterial, Float32BufferAttribute,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { partModel } from './parts3d.js?v=1a016bc';
import { LAB, TESTS, MODEL, ISSUE_KIND, sevName } from '../game/lab.js?v=1a016bc';
import { mountLab } from './labView.js?v=1a016bc';
import { lapModel, indexAt, fmtLap, gearOf, radioFor } from './labSim.js?v=1a016bc';

/*
 * The development lab in 3D: the part itself (the parts3d.js model, shaped by the geometry on the bench)
 * in the place it's tested, with a camera that cuts between shots like a broadcast.
 *
 *   wind tunnel   the part on its sting over the moving belt, a smoke rake and seeded particles flowing
 *                 round it (potential flow round the part's envelope, turned up behind a loaded wing),
 *                 separated flow tumbling red where the test found it
 *   CFD           the part painted with its surface pressure, a pressure slice through the air beside it,
 *                 streamlines coloured by speed, converging from noise while the residuals fall
 *   rig           the suspension on the hydraulic posts of a 7-post rig; the chassis twisting in the
 *                 torsion rig
 *   dyno          the brake disc spinning up and glowing through a lap of stops, sparks off the pads; the
 *                 power unit shaking at full load, the exhausts glowing
 *   simulator     a lap of the next circuit, the car running round it with the new part
 *
 * Issues are numbered markers on the part. A telemetry panel (labView.js's traces) sits in the corner.
 * mountLab3d(canvas) -> { set(state), destroy() }, the same state as labView.js plus team, n, dir (the
 * model's two axes) and layout (the next circuit, for the simulator).
 */

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ease = (t) => t * t * (3 - 2 * t);
const JET = [[0, [0.27, 0.12, 0.63]], [0.25, [0.16, 0.43, 1]], [0.45, [0.16, 0.86, 0.9]], [0.6, [0.47, 0.94, 0.35]], [0.78, [1, 0.86, 0.16]], [1, [1, 0.2, 0.12]]];
function jet(t, out = [0, 0, 0]) {
  t = clamp(t, 0, 1);
  for (let k = 1; k < JET.length; k++) if (t <= JET[k][0]) { const [a, ca] = JET[k - 1], [b, cb] = JET[k], f = (t - a) / (b - a); for (let i = 0; i < 3; i++) out[i] = ca[i] + (cb[i] - ca[i]) * f; return out; }
  return JET[JET.length - 1][1].slice();
}
const AERO = ['frontWing', 'rearWing', 'floor', 'sidepods'];
const SIM_SPEED = 3;   // the simulator's lap plays at three times real time

function stripeTexture(fn, w = 256, h = 64) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  const t = new CanvasTexture(c); t.wrapS = t.wrapT = RepeatWrapping; t.colorSpace = SRGBColorSpace;
  return t;
}

export function mountLab3d(canvas) {
  const view = canvas.parentElement;
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1));
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  scene.background = new Color(0x04060a); scene.fog = new FogExp2(0x04060a, 0.075);
  const camera = new PerspectiveCamera(30, 2, 0.02, 400);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(512, 256), 0.42, 0.5, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Reflections: a dark room with soft boxes.
  {
    const room = new Scene(); room.background = new Color(0x08090c);
    const panel = (w, h, x, y, z, rx, ry, c) => { const m = new Mesh(new BoxGeometry(w, h, 0.05), new MeshBasicMaterial({ color: c })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); room.add(m); };
    panel(8, 1, 0, 5, 0, Math.PI / 2, 0, 0xffffff); panel(4, 2, -5, 2, 2, 0, Math.PI / 2, 0xbfd4ff); panel(4, 2, 5, 1.5, -2, 0, -Math.PI / 2, 0xffeedd);
    const pm = new PMREMGenerator(renderer); scene.environment = pm.fromScene(room, 0.04).texture; pm.dispose();
  }
  const key = new DirectionalLight(0xffffff, 2.0); key.position.set(3, 6, 4); scene.add(key);
  const rim = new DirectionalLight(0x8fb8ff, 1.4); rim.position.set(-4, 3, -5); scene.add(rim);
  scene.add(new HemisphereLight(0xcfdcff, 0x0a0a10, 0.45));
  const spot = new SpotLight(0xffffff, 18, 12, 0.5, 0.7); spot.position.set(0, 5, 0.5); scene.add(spot); scene.add(spot.target);

  // ---- the sets ----
  const sets = { tunnel: new Group(), rig: new Group(), sim: new Group() };
  for (const g of Object.values(sets)) { g.visible = false; scene.add(g); }
  const floorMat = new MeshStandardMaterial({ color: 0x0b0e13, roughness: 0.35, metalness: 0.4 });
  // The wind tunnel: a long hall, light strips, the honeycomb at the inlet, the belt.
  {
    const T = sets.tunnel;
    const fl = new Mesh(new PlaneGeometry(9, 26), floorMat); fl.rotation.x = -Math.PI / 2; T.add(fl);
    const beltTex = stripeTexture((g, w, h) => { g.fillStyle = '#1a1e25'; g.fillRect(0, 0, w, h); g.fillStyle = '#2c323c'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 3, h); g.fillStyle = '#ffffff22'; g.fillRect(0, h / 2 - 1, w, 2); });
    beltTex.repeat.set(10, 1);
    const belt = new Mesh(new PlaneGeometry(2.6, 9), new MeshStandardMaterial({ map: beltTex, roughness: 0.6, metalness: 0.2 }));
    belt.rotation.x = -Math.PI / 2; belt.rotation.z = Math.PI / 2; belt.position.y = 0.004; T.add(belt); T.userData.belt = beltTex;
    const wallTex = stripeTexture((g, w, h) => { g.fillStyle = '#0a0d12'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffffff10'; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }, 256, 256);
    wallTex.repeat.set(10, 2);
    const wallMat = new MeshStandardMaterial({ map: wallTex, roughness: 0.8, side: DoubleSide });
    for (const sx of [-1, 1]) { const w = new Mesh(new PlaneGeometry(26, 3.6), wallMat); w.position.set(sx * 4.5, 1.8, 0); w.rotation.y = (-sx * Math.PI) / 2; T.add(w); }
    const ceil = new Mesh(new PlaneGeometry(9, 26), wallMat); ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.6; T.add(ceil);
    const strip = new MeshBasicMaterial({ color: new Color(2.4, 2.5, 2.8) });
    for (const sx of [-1, 1]) for (const yy of [3.55, 0.25]) { const s = new Mesh(new BoxGeometry(0.06, 0.04, 24), strip); s.position.set(sx * 4.4, yy, 0); T.add(s); }
    for (let k = -5; k <= 5; k++) { const r = new Mesh(new BoxGeometry(8.8, 0.03, 0.06), new MeshBasicMaterial({ color: new Color(0.25, 0.32, 0.45) })); r.position.set(0, 3.58, k * 2.2); T.add(r); }
    const hc = stripeTexture((g, w, h) => { g.fillStyle = '#05070a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#5c6a80'; g.lineWidth = 2; for (let y = 0; y < h + 20; y += 14) for (let x = 0; x < w + 20; x += 16) { g.beginPath(); for (let k = 0; k < 7; k++) { const a = (k / 6) * Math.PI * 2; g.lineTo(x + ((y / 14) % 2) * 8 + Math.cos(a) * 7, y + Math.sin(a) * 7); } g.stroke(); } }, 256, 256);
    hc.repeat.set(4, 2);
    const inlet = new Mesh(new PlaneGeometry(9, 3.6), new MeshStandardMaterial({ map: hc, emissive: new Color(0.06, 0.08, 0.12), emissiveMap: hc })); inlet.position.set(0, 1.8, 10); inlet.rotation.y = Math.PI; T.add(inlet);
    const sting = new Mesh(new CylinderGeometry(0.03, 0.04, 3, 16), new MeshStandardMaterial({ color: 0x9aa3b0, metalness: 0.9, roughness: 0.25 })); T.add(sting); T.userData.sting = sting;
  }
  // The rig / dyno hall: a studio floor and a frame.
  {
    const G = sets.rig;
    const fl = new Mesh(new PlaneGeometry(30, 30), floorMat); fl.rotation.x = -Math.PI / 2; G.add(fl);
    const grid = stripeTexture((g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#ffffff12'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); }, 128, 128); grid.repeat.set(30, 30);
    const gm = new Mesh(new PlaneGeometry(30, 30), new MeshBasicMaterial({ map: grid, transparent: true })); gm.rotation.x = -Math.PI / 2; gm.position.y = 0.002; G.add(gm);
    const steel = new MeshStandardMaterial({ color: 0x5a6270, metalness: 0.85, roughness: 0.3 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const c = new Mesh(new BoxGeometry(0.12, 2.6, 0.12), steel); c.position.set(sx * 1.6, 1.3, sz * 1.6); G.add(c); }
    for (const sz of [-1, 1]) { const bm = new Mesh(new BoxGeometry(3.32, 0.12, 0.12), steel); bm.position.set(0, 2.6, sz * 1.6); G.add(bm); }
    const lamp = new MeshBasicMaterial({ color: new Color(2.2, 2.3, 2.6) });
    for (const sz of [-1, 1]) { const l = new Mesh(new BoxGeometry(3, 0.03, 0.05), lamp); l.position.set(0, 2.53, sz * 1.6); G.add(l); }
    G.userData.posts = [];
    for (let k = 0; k < 4; k++) { const p = new Mesh(new CylinderGeometry(0.11, 0.13, 0.5, 24), new MeshStandardMaterial({ color: 0xc23b2b, metalness: 0.6, roughness: 0.35 })); G.add(p); G.userData.posts.push(p); }
  }

  // ---- state ----
  let st = null, part = null, partKey = '', box = new Box3(), C = new Vector3(), E = new Vector3(1, 1, 1), loadK = 0.7;
  const holder = new Group(); scene.add(holder);
  let spinner = null, glow = null, exhaust = null, sparks = null;
  const markers = new Group(); scene.add(markers);
  let zones = [], anchors = {};

  function buildPart() {
    const k = JSON.stringify([st.slot, st.dir, st.n, st.team?.id]);
    if (k === partKey) return;
    partKey = k;
    holder.clear(); spinner = glow = exhaust = null;
    if (part) part.traverse((o) => o.geometry?.dispose());
    part = partModel(st.slot, { dir: st.dir, n: st.n ?? 0, team: st.team });
    // Normalise its size (the lab is set up for each part) and sit it on the bench.
    const b0 = new Box3().setFromObject(part), s0 = b0.getSize(new Vector3()), maxD = Math.max(s0.x, s0.y, s0.z);
    const target = { frontWing: 1.9, rearWing: 1.3, floor: 2.6, sidepods: 1.9, suspension: 1.5, brakes: 0.9, chassis: 2.4, pu: 1.4 }[st.slot] ?? 1.6;
    part.scale.setScalar(target / maxD);
    const b1 = new Box3().setFromObject(part), c1 = b1.getCenter(new Vector3());
    const lift = st.slot === 'rearWing' ? 0.35 : AERO.includes(st.slot) ? 0.06 : st.slot === 'suspension' ? 0.55 : st.slot === 'brakes' ? 0.75 : 0.5;
    part.position.set(-c1.x, -b1.min.y + lift, -c1.z);
    if (st.slot === 'brakes') {
      // Spin the disc and bell; the caliper and the cooling drum stay put.
      const kids = part.children.slice(), keep = kids.slice(-2);
      spinner = new Group(); part.add(spinner);
      for (const ch of kids) if (!keep.includes(ch)) spinner.add(ch);
      glow = new Mesh(new TorusGeometry(0.135, 0.03, 12, 64), new MeshBasicMaterial({ color: new Color(0, 0, 0), transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false }));
      spinner.add(glow);
    }
    holder.add(part);
    holder.updateMatrixWorld(true);
    box = new Box3().setFromObject(part); box.getCenter(C); box.getSize(E).multiplyScalar(0.5);
    E.x = Math.max(E.x, 0.08); E.y = Math.max(E.y, 0.06); E.z = Math.max(E.z, 0.08);
    if (st.slot === 'pu') { exhaust = new PointLight(0xff7a2a, 0, 3); exhaust.position.set(C.x, C.y + E.y * 0.6, C.z - E.z); scene.add(exhaust); holder.userData.exhaust = exhaust; }
    const ts = sets.tunnel.userData.sting; ts.position.set(C.x, box.max.y + 1.5, C.z); ts.scale.y = 1;
    cfdKey = ''; tubesKey = '';
  }

  // ---- the flow round the part: potential flow round its envelope ----
  const U = 2.4, D = new Vector3(0, 0, -1), q = new Vector3(), tmp = new Vector3();
  function flowAt(p, out) {
    q.set((p.x - C.x) / (E.x * 1.15), (p.y - C.y) / (E.y * 1.6), (p.z - C.z) / (E.z * 1.15));
    const r2 = q.lengthSq(), r = Math.sqrt(r2);
    out.copy(D);
    if (r < 4) {
      const r3 = Math.max(0.35, r2 * r), dq = q.dot(D) / Math.max(1e-6, r);
      tmp.copy(q).multiplyScalar(1 / Math.max(1e-6, r));
      out.addScaledVector(D, 1 / (2 * r3)).addScaledVector(tmp, (-3 * dq) / (2 * r3));
      if (r < 1) out.addScaledVector(tmp, (1 - r) * 3);
      // A loaded wing turns the air up behind it (and pulls it down past the floor's diffuser).
      if (q.z < 0.2 && q.z > -4 && Math.abs(q.y) < 2.4 && Math.abs(q.x) < 1.3) out.y += loadK * 0.55 * Math.exp(-Math.abs(q.z + 0.8) * 0.7) * Math.exp(-Math.abs(q.y) * 0.6) * (st.slot === 'floor' ? 1.4 : 1);
      out.x *= E.x / E.z; out.y *= Math.min(1.4, E.y / E.z + 0.4);
    }
    if (p.y < 0.03) out.y = Math.max(out.y, 0.1);
    return out.multiplyScalar(U);
  }
  const inZone = (p) => { let t = 0; for (const z of zones) { const d = p.distanceTo(z.p); if (d < z.r) t = Math.max(t, 1 - d / z.r); } return t; };

  // Particles with trails.
  const NP = 800, TL = 8;
  const pp = new Float32Array(NP * TL * 3), pl = new Float32Array(NP);
  const segPos = new Float32Array(NP * (TL - 1) * 6), segCol = new Float32Array(NP * (TL - 1) * 6);
  const pgeo = new BufferGeometry(); pgeo.setAttribute('position', new BufferAttribute(segPos, 3)); pgeo.setAttribute('color', new BufferAttribute(segCol, 3));
  const plines = new LineSegments(pgeo, new LineBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false }));
  plines.frustumCulled = false; scene.add(plines);
  const spawn = (i, anywhere) => {
    const x = C.x + (Math.random() * 2 - 1) * E.x * 1.7, y = 0.02 + Math.random() * (C.y + E.y * 2.4), z = anywhere ? C.z - 4 + Math.random() * 9 : C.z + 5 + Math.random();
    for (let t = 0; t < TL; t++) { pp[(i * TL + t) * 3] = x; pp[(i * TL + t) * 3 + 1] = y; pp[(i * TL + t) * 3 + 2] = z; }
    pl[i] = 0;
  };
  let seeded = false;
  const v3 = new Vector3(), p3 = new Vector3(), col = [0, 0, 0];
  function stepParticles(dt, cfdMode) {
    if (!seeded) { for (let i = 0; i < NP; i++) spawn(i, true); seeded = true; }
    let o = 0;
    for (let i = 0; i < NP; i++) {
      const b = i * TL * 3;
      for (let t = TL - 1; t > 0; t--) { pp[b + t * 3] = pp[b + (t - 1) * 3]; pp[b + t * 3 + 1] = pp[b + (t - 1) * 3 + 1]; pp[b + t * 3 + 2] = pp[b + (t - 1) * 3 + 2]; }
      p3.set(pp[b], pp[b + 1], pp[b + 2]);
      flowAt(p3, v3);
      const turb = inZone(p3);
      if (turb) { v3.multiplyScalar(1 - turb * 0.7); v3.x += (Math.random() - 0.5) * 5 * turb; v3.y += (Math.random() - 0.5) * 5 * turb; v3.z += (Math.random() - 0.3) * 3 * turb; }
      p3.addScaledVector(v3, dt);
      pp[b] = p3.x; pp[b + 1] = p3.y; pp[b + 2] = p3.z; pl[i] += dt;
      if (p3.z < C.z - 5 || p3.y > 3.4 || Math.abs(p3.x - C.x) > 4 || p3.y < 0) spawn(i, false);
      const spd = v3.length() / U;
      if (cfdMode) jet(0.3 + (spd - 0.6) * 0.9, col);
      else if (turb > 0.05) { col[0] = 1.6; col[1] = 0.35 + (1 - turb) * 0.5; col[2] = 0.2; }
      else { col[0] = 0.35 + spd * 0.35; col[1] = 0.7 + spd * 0.3; col[2] = 1.2; }
      for (let t = 0; t < TL - 1; t++) {
        const f = (1 - t / (TL - 1)) * Math.min(1, pl[i] * 2) * (cfdMode ? 0.55 : 0.3);
        for (let k = 0; k < 2; k++) {
          const s = b + (t + k) * 3;
          segPos[o] = pp[s]; segPos[o + 1] = pp[s + 1]; segPos[o + 2] = pp[s + 2];
          segCol[o] = col[0] * f; segCol[o + 1] = col[1] * f; segCol[o + 2] = col[2] * f; o += 3;
        }
      }
    }
    pgeo.attributes.position.needsUpdate = true; pgeo.attributes.color.needsUpdate = true;
  }

  // The smoke rake: glowing tubes along streamlines, a pulse running down them.
  const smokeTex = stripeTexture((g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#000'); gr.addColorStop(0.5, '#fff'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 256, 4);
  smokeTex.repeat.set(6, 1);
  const smokeMat = new MeshBasicMaterial({ color: new Color(1.2, 1.35, 1.6), alphaMap: smokeTex, transparent: true, blending: AdditiveBlending, depthWrite: false, opacity: 0.55 });
  const hotMat = new MeshBasicMaterial({ color: new Color(2.2, 0.6, 0.35), alphaMap: smokeTex, transparent: true, blending: AdditiveBlending, depthWrite: false, opacity: 0.85 });
  const tubes = new Group(); scene.add(tubes);
  let tubesKey = '';
  function buildTubes() {
    const k = `${partKey}|${zones.map((z) => z.p.toArray().map((v) => v.toFixed(2)).join()).join(';')}`;
    if (k === tubesKey) return;
    tubesKey = k;
    tubes.children.forEach((m) => m.geometry.dispose()); tubes.clear();
    for (let a = 0; a < 3; a++) for (let j = 0; j < 7; j++) {
      const p = new Vector3(C.x + (a - 1) * E.x * 0.55, 0.04 + (j / 6) * (C.y + E.y * 1.8), C.z + 4.5), pts = [p.clone()];
      let hot = false;
      for (let s = 0; s < 180 && p.z > C.z - 4.5; s++) {
        flowAt(p, v3); const t = inZone(p);
        if (t > 0.05) { hot = true; v3.x += Math.sin(s * 1.7 + j) * 2 * t; v3.y += Math.cos(s * 2.3 + a) * 2.5 * t; }
        p.addScaledVector(v3, 0.02); if (s % 2 === 0) pts.push(p.clone());
      }
      if (pts.length < 4) continue;
      const m = new Mesh(new TubeGeometry(new CatmullRomCurve3(pts), pts.length * 2, 0.0075, 6, false), hot ? hotMat : smokeMat);
      tubes.add(m);
    }
  }

  // ---- CFD: surface pressure on the part, a pressure slice through the air ----
  let cfdKey = '', savedMats = null;
  const slice = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ transparent: true, opacity: 0.62, side: DoubleSide, depthWrite: false }));
  scene.add(slice);
  const sliceCanvas = document.createElement('canvas'); sliceCanvas.width = 220; sliceCanvas.height = 90;
  const sliceTex = new CanvasTexture(sliceCanvas); sliceTex.colorSpace = SRGBColorSpace; slice.material.map = sliceTex;
  const cpOf = (p, n) => {
    flowAt(p, v3);
    let cp = 1 - v3.lengthSq() / (U * U);
    if (n) cp += 0.9 * Math.max(0, n.z) + 0.5 * Math.max(0, n.y) * loadK - 1.7 * Math.max(0, -n.y) * loadK;
    const t = inZone(p); if (t) cp = cp * (1 - t) + Math.sin(p.x * 40 + p.z * 30) * 0.25 * t;
    return cp;
  };
  function paintCfd(conv) {
    const k = `${partKey}|${tubesKey}|${Math.round(conv * 10)}`;
    if (k === cfdKey) return;
    cfdKey = k;
    if (!savedMats) { savedMats = new Map(); part.traverse((o) => { if (o.isMesh) savedMats.set(o, o.material); }); }
    const wp = new Vector3(), nm = new Vector3();
    part.traverse((o) => {
      if (!o.isMesh || !o.geometry.attributes.position || o.material === glow?.material) return;
      const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, n = P.count;
      const cols = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        wp.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld);
        if (N) nm.fromBufferAttribute(N, i).transformDirection(o.matrixWorld); else nm.set(0, 1, 0);
        const cp = cpOf(wp, nm), noise = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
        jet((0.55 + cp * 0.32) * conv + noise * (1 - conv), col);
        cols[i * 3] = col[0]; cols[i * 3 + 1] = col[1]; cols[i * 3 + 2] = col[2];
      }
      g.setAttribute('color', new Float32BufferAttribute(cols, 3));
      if (!o.userData.cfdMat) o.userData.cfdMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.05, emissive: new Color(0.15, 0.15, 0.15) });
      o.material = o.userData.cfdMat;
    });
    // The slice: a vertical plane through the middle of the part, along the flow.
    const L = E.z * 7, H = C.y + E.y * 3;
    slice.scale.set(L, H, 1); slice.rotation.set(0, Math.PI / 2, 0); slice.position.set(C.x + E.x * 0.02, H / 2, C.z - E.z * 0.6);
    const g2 = sliceCanvas.getContext('2d'), img = g2.createImageData(sliceCanvas.width, sliceCanvas.height);
    for (let j = 0; j < sliceCanvas.height; j++) for (let i = 0; i < sliceCanvas.width; i++) {
      p3.set(C.x, H * (1 - (j + 0.5) / sliceCanvas.height), C.z - E.z * 0.6 + L * ((i + 0.5) / sliceCanvas.width - 0.5));
      const cp = cpOf(p3, null), noise = Math.abs(Math.sin(i * 7.31 + j * 3.17) * 9187.13) % 1;
      jet((0.6 + cp * 0.45) * conv + noise * (1 - conv), col);
      const o = (j * sliceCanvas.width + i) * 4; img.data[o] = col[0] * 255; img.data[o + 1] = col[1] * 255; img.data[o + 2] = col[2] * 255; img.data[o + 3] = 255;
    }
    g2.putImageData(img, 0, 0); sliceTex.needsUpdate = true;
  }
  function unpaint() {
    if (!savedMats) return;
    for (const [o, m] of savedMats) o.material = m;
    savedMats = null; cfdKey = '';
  }

  // ---- the simulator: a live lap of the next circuit, seen from above (2.5D) ----
  let simKey = '', M = null, simSc = 1, carMesh = null, ghost = null, trail = null, simT = 0, lastI = 0, lapNo = 1, feed = [], radio = [], sectorT = [], hudT = 0;
  const trailN = 220, trailPos = new Float32Array(trailN * 3), trailCol = new Float32Array(trailN * 3);
  const simPos = (i, out) => { const n = M.n, a = ((Math.floor(i) % n) + n) % n, b = (a + 1) % n, f = i - Math.floor(i); return out.set((M.x[a] + (M.x[b] - M.x[a]) * f) * simSc, 0.08, (M.z[a] + (M.z[b] - M.z[a]) * f) * simSc); };
  function textSprite(text, color = '#fff', size = 1) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
    g.font = '800 54px Titillium Web, sans-serif'; g.fillStyle = '#000a'; const w = g.measureText(text).width + 30; g.fillRect((256 - w) / 2, 14, w, 68); g.fillStyle = color; g.textAlign = 'center'; g.fillText(text, 128, 66);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace;
    const s = new Sprite(new SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(6 * size, 2.25 * size, 1); s.renderOrder = 5;
    return s;
  }
  function buildSim() {
    const L = st.layout, fx = st.sim?.fx ?? {}, delta = st.sim?.delta ?? 0;
    const k = `${L ? `${L.N}|${L.length}` : 'none'}|${delta.toFixed(4)}`;
    if (k === simKey) return;
    simKey = k;
    sets.sim.traverse((o) => { o.geometry?.dispose(); o.material?.map?.dispose(); });
    sets.sim.clear();
    M = lapModel(L, fx, delta);
    let mx = 1; for (let i = 0; i < M.n; i++) mx = Math.max(mx, Math.abs(M.x[i]), Math.abs(M.z[i]));
    simSc = 60 / mx;
    const fl = new Mesh(new PlaneGeometry(400, 400), floorMat); fl.rotation.x = -Math.PI / 2; sets.sim.add(fl);
    const grid = stripeTexture((g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#ffffff10'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); }, 64, 64); grid.repeat.set(80, 80);
    const gm = new Mesh(new PlaneGeometry(400, 400), new MeshBasicMaterial({ map: grid, transparent: true })); gm.rotation.x = -Math.PI / 2; gm.position.y = 0.01; sets.sim.add(gm);
    // The track: asphalt, glowing edges, coloured by the speed through each part of it.
    const ribbon = (half, off, y, colors) => {
      const pos = [], idx = [], col = [], p = new Vector3(), q = new Vector3();
      for (let i = 0; i <= M.n; i++) {
        simPos(i, p); simPos(i + 1, q);
        const tx = q.x - p.x, tz = q.z - p.z, l = Math.hypot(tx, tz) || 1, nx = -tz / l, nz = tx / l;
        for (const sd of [-1, 1]) { pos.push(p.x + nx * (off + sd * half), y, p.z + nz * (off + sd * half)); if (colors) { jet(clamp(M.v0[i % M.n] / 92, 0, 1), col); colors.push(col[0] * 1.6, col[1] * 1.6, col[2] * 1.6); } }
        if (i < M.n) { const k2 = i * 2; idx.push(k2, k2 + 1, k2 + 2, k2 + 1, k2 + 3, k2 + 2); }
      }
      const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(pos, 3)); if (colors) g.setAttribute('color', new Float32BufferAttribute(colors, 3)); g.setIndex(idx); g.computeVertexNormals();
      return g;
    };
    sets.sim.add(new Mesh(ribbon(0.9, 0, 0.04), new MeshStandardMaterial({ color: 0x1d2129, roughness: 0.85, side: DoubleSide })));
    for (const off of [-0.95, 0.95]) sets.sim.add(new Mesh(ribbon(0.09, off, 0.05, []), new MeshBasicMaterial({ vertexColors: true, side: DoubleSide })));
    // Start line, sector boards, corner numbers.
    const p = new Vector3();
    const startLine = new Mesh(new BoxGeometry(2.4, 0.05, 0.25), new MeshBasicMaterial({ color: new Color(2.5, 2.5, 2.5) })); simPos(0, startLine.position); startLine.position.y = 0.07;
    simPos(1, p); startLine.lookAt(p.x, 0.07, p.z); sets.sim.add(startLine);
    M.sectors.slice(0, 2).forEach((i, k2) => { const s = textSprite(`S${k2 + 2}`, '#ffd21f', 0.8); simPos(i, s.position); s.position.y = 2.2; sets.sim.add(s); });
    M.corners.forEach((c) => { const s = textSprite(`T${c.turn}`, '#ffffffcc', 0.55); simPos(c.i, s.position); s.position.y = 1.6; sets.sim.add(s); });
    // The cars: the new design in the team's colours, the current part as a ghost.
    const car = (colour, opacity) => {
      const G2 = new Group();
      const paint = new MeshStandardMaterial({ color: colour, metalness: 0.5, roughness: 0.3, transparent: opacity < 1, opacity }), dark = new MeshStandardMaterial({ color: 0x111111, roughness: 0.5, transparent: opacity < 1, opacity });
      const bx = (w, h, l, x, y, z2, m) => { const o = new Mesh(new BoxGeometry(w, h, l), m); o.position.set(x, y, z2); G2.add(o); };
      bx(0.32, 0.22, 2.0, 0, 0.26, 0, paint); bx(0.9, 0.18, 0.9, 0, 0.24, -0.15, paint); bx(1.1, 0.04, 0.25, 0, 0.12, 1.05, dark); bx(0.85, 0.2, 0.18, 0, 0.62, -1.0, dark);
      for (const [x2, z2] of [[-0.55, 0.7], [0.55, 0.7], [-0.55, -0.75], [0.55, -0.75]]) { const w = new Mesh(new CylinderGeometry(0.2, 0.2, 0.22, 14), dark); w.rotation.z = Math.PI / 2; w.position.set(x2, 0.2, z2); G2.add(w); }
      G2.scale.setScalar(1.6); sets.sim.add(G2);
      return G2;
    };
    carMesh = car(st.team?.colours?.[0] ?? '#ffffff', 1);
    const lt = new PointLight(new Color(...st.accentRGB), 8, 10); lt.position.y = 2; carMesh.add(lt);
    const marker = new Mesh(new TorusGeometry(1.6, 0.08, 8, 40), new MeshBasicMaterial({ color: new Color(...st.accentRGB.map((v) => v * 2.5)) })); marker.rotation.x = Math.PI / 2; marker.position.y = 0.05; carMesh.add(marker);
    ghost = car('#9aa3b0', 0.35);
    const tg = new BufferGeometry(); tg.setAttribute('position', new BufferAttribute(trailPos, 3)); tg.setAttribute('color', new BufferAttribute(trailCol, 3));
    trail = new LineSegments(tg, new LineBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false })); trail.frustumCulled = false;
    { const idx = []; for (let i = 0; i < trailN - 1; i++) idx.push(i, i + 1); tg.setIndex(idx); }
    sets.sim.add(trail);
    simT = 0; lastI = 0; lapNo = 1; sectorT = []; feed = [];
  }
  function simFrame(dt) {
    if (!M) return;
    const running = st.progress != null;
    // A test drives one full lap; between tests the car keeps lapping.
    if (running) { const t = st.progress * M.lap1; if (t < simT - 1) { lastI = 0; sectorT = []; lapNo = 1; feed = []; } simT = t; }
    else simT += dt * SIM_SPEED;   // the lap at three times real time
    const tl = simT % M.lap1, i = indexAt(M.t1, tl), ig = indexAt(M.t0, simT % M.lap0);
    const p = new Vector3(), q = new Vector3();
    simPos(i, p); simPos(i + 1.5, q); carMesh.position.copy(p); carMesh.lookAt(q.x, p.y, q.z);
    simPos(ig, p); simPos(ig + 1.5, q); ghost.position.copy(p); ghost.lookAt(q.x, p.y, q.z);
    // The trail: the last stretch behind the car, coloured by speed.
    for (let k2 = 0; k2 < trailN; k2++) {
      const j = i - k2 * 0.9; simPos(j, p); trailPos[k2 * 3] = p.x; trailPos[k2 * 3 + 1] = 0.15; trailPos[k2 * 3 + 2] = p.z;
      jet(clamp(M.v1[((Math.floor(j) % M.n) + M.n) % M.n] / 92, 0, 1), col); const f = (1 - k2 / trailN) * 1.6;
      trailCol[k2 * 3] = col[0] * f; trailCol[k2 * 3 + 1] = col[1] * f; trailCol[k2 * 3 + 2] = col[2] * f;
    }
    trail.geometry.attributes.position.needsUpdate = true; trail.geometry.attributes.color.needsUpdate = true;
    // Events: sectors, the driver's comments, the end of the lap.
    const ii = Math.floor(i);
    if (ii < lastI - M.n / 2) {   // a new lap
      const d = M.lap1 - M.lap0;
      feed.unshift({ who: 'ENG', text: `Lap ${lapNo}: ${fmtLap(M.lap1)}, ${d <= 0 ? `${Math.abs(d).toFixed(3)} faster` : `${d.toFixed(3)} slower`} than the current part.`, col: d <= 0 ? '#5fd38a' : '#ff6b5a' });
      lapNo++; sectorT = [];
    }
    M.sectors.forEach((si, k2) => { if (sectorT[k2] == null && ii >= si - 1 && lastI < si - 1) sectorT[k2] = { t: M.t1[Math.min(si, M.n)] - (k2 ? M.t1[M.sectors[k2 - 1]] : 0), d: (M.t1[Math.min(si, M.n)] - M.t0[Math.min(si, M.n)]) - (k2 ? M.t1[M.sectors[k2 - 1]] - M.t0[M.sectors[k2 - 1]] : 0) }; });
    for (const r of radio) if (ii >= r.at && lastI < r.at) feed.unshift({ who: 'DRV', text: `T${r.turn}: "${r.text}"`, col: r.sev > 1.4 ? '#ff6b5a' : '#ffc247' });
    if (feed.length > 4) feed.length = 4;
    lastI = ii;
    // The timing screen (10 times a second).
    hudT += dt;
    if (hudT > 0.1) {
      hudT = 0;
      const v = M.v1[ii % M.n] * 3.6, vPrev = M.v1[(ii - 3 + M.n) % M.n] * 3.6, dl = M.t1[Math.min(ii, M.n)] - M.t0[Math.min(ii, M.n)];
      const box = hud.querySelector('.h-sim');
      box.innerHTML = `<div class="lt"><small>Lap ${lapNo}</small><b>${fmtLap(tl)}</b><em class="${dl <= 0 ? 'up' : 'dn'}">${dl <= 0 ? '−' : '+'}${Math.abs(dl).toFixed(3)}</em></div>
        <div class="sc">${[0, 1, 2].map((k2) => `<div><small>S${k2 + 1}</small><b>${sectorT[k2] ? sectorT[k2].t.toFixed(3) : '—'}</b><em class="${sectorT[k2] ? (sectorT[k2].d <= 0 ? 'pu' : 'dn') : ''}">${sectorT[k2] ? `${sectorT[k2].d <= 0 ? '−' : '+'}${Math.abs(sectorT[k2].d).toFixed(3)}` : ''}</em></div>`).join('')}</div>
        <div class="tel"><div><small>Speed</small><b>${Math.round(v)}</b><em>km/h</em></div><div><small>Gear</small><b>${gearOf(v)}</b></div><div class="pd"><i style="height:${v >= vPrev ? 100 : 15}%;background:#5fd38a"></i><i style="height:${v < vPrev - 1 ? 100 : 0}%;background:#ff5a4a"></i></div></div>
        <div class="ref"><span>Current part ${fmtLap(M.lap0)}</span><span>New design ${fmtLap(M.lap1)}</span></div>`;
      hud.querySelector('.h-radio').innerHTML = feed.map((f) => `<div style="--c:${f.col}"><b>${f.who === 'DRV' ? 'DRIVER' : 'ENGINEER'}</b>${f.text}</div>`).join('');
    }
  }

  // ---- markers ----
  function markerSprite(k, is) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const g = c.getContext('2d'), colr = is.sev > 1.4 ? '#ff4d4d' : is.sev > 0.9 ? '#ff8a3d' : '#ffc247';
    g.fillStyle = colr; g.beginPath(); g.arc(64, 64, 40, 0, 7); g.fill();
    g.fillStyle = '#000'; g.font = '800 48px Titillium Web, sans-serif'; g.textAlign = 'center'; g.fillText(String(k + 1), 64, 81);
    g.textAlign = 'left'; g.fillStyle = '#000000c0'; g.fillRect(118, 34, 380, 60); g.fillStyle = colr; g.fillRect(118, 34, 6, 60);
    g.fillStyle = '#fff'; g.font = '700 34px Titillium Web, sans-serif'; g.fillText(`${ISSUE_KIND[is.kind]} · ${sevName(is.sev)}`, 136, 76);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace;
    const s = new Sprite(new SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.center.set(0.125, 0.5); s.renderOrder = 10;
    return s;
  }
  function buildMarkers() {
    markers.children.forEach((s) => s.material.map.dispose()); markers.clear(); zones = []; anchors = {};
    const at = MODEL[st.slot]?.at ?? {};
    for (const [key, a] of Object.entries(at)) anchors[key] = new Vector3(C.x + a[0] * E.x, C.y + a[1] * E.y, C.z + a[2] * E.z);
    (st.issues ?? []).forEach((is, k) => {
      const p = anchors[is.key] ?? C.clone();
      if (AERO.includes(st.slot) || st.slot === 'brakes') zones.push({ p: p.clone().add(new Vector3(0, 0.02, -E.z * 0.35)), r: Math.max(E.x, E.z) * (0.35 + Math.min(0.4, is.sev * 0.15)) });
      const s = markerSprite(k, is); s.position.copy(p); s.userData.k = k; markers.add(s);
    });
  }

  // ---- the HUD over the view ----
  const hud = document.createElement('div'); hud.className = 'lab3d-hud';
  hud.innerHTML = `<div class="h-t"><b></b><small></small></div><div class="h-live"><i></i>LIVE</div><div class="h-figs"></div><div class="h-sim"></div><div class="h-radio"></div><canvas class="h-chart"></canvas><div class="h-bar"><i></i></div>`;
  view.appendChild(hud);
  const chart = mountLab(hud.querySelector('.h-chart'), { hud: true });

  // ---- cameras: a broadcast director cutting between shots ----
  const SHOTS = {
    tunnel: [[0.9, 0.35, 0.9, 1.7], [-1, 0.25, -0.4, 1.6], [0.05, 0.12, 1, 1.9], [0.7, 0.9, -0.6, 1.5], [1, 0.05, 0.05, 1.45]],
    cfd: [[0.85, 0.5, 0.75, 1.8], [-0.95, 0.3, 0.3, 1.5], [0.4, 1, -0.3, 1.6], [1, 0.1, 0.15, 1.5]],
    rig: [[0.9, 0.45, 0.9, 1.7], [-0.8, 0.25, 0.7, 1.5], [0.2, 0.15, 1, 1.5], [1, 0.8, -0.4, 1.6]],
    dyno: [[0.9, 0.35, 0.9, 1.6], [0.1, 0.1, 1, 1.35], [-0.9, 0.5, 0.3, 1.5], [1, 0.15, -0.5, 1.5]],
  };
  let shotIdx = 0, shotT = 0, camPos = new Vector3(4, 2, 4), camLook = new Vector3();
  const desired = new Vector3(), lookD = new Vector3();

  function set(state) {
    const prev = st;
    st = state;
    const mode = st.kind === 'tunnel' || st.kind === 'cfd' ? 'tunnel' : st.kind === 'sim' ? 'sim' : 'rig';
    for (const [k, g] of Object.entries(sets)) g.visible = k === mode;
    scene.fog.density = mode === 'sim' ? 0.006 : 0.075;
    holder.visible = mode !== 'sim'; markers.visible = mode !== 'sim';
    if (mode !== 'sim') buildPart(); else { buildSim(); radio = radioFor(st.findings ?? [], M); }
    hud.classList.toggle('sim', mode === 'sim');
    loadK = 0.45 + 0.5 * clamp(((st.figures?.df ?? 1.2) - 0.5) / 2, 0, 1);
    if (mode !== 'sim') { buildMarkers(); if (mode === 'tunnel') buildTubes(); }
    plines.visible = mode === 'tunnel'; tubes.visible = st.kind === 'tunnel'; slice.visible = st.kind === 'cfd';
    if (st.kind !== 'cfd') unpaint();
    if (exhaust) exhaust.visible = st.slot === 'pu';
    if (!prev || prev.kind !== st.kind || prev.slot !== st.slot) { shotIdx = 0; shotT = 0; }
    const test = TESTS[st.kind];
    hud.querySelector('.h-t b').textContent = test.name.toUpperCase();
    hud.querySelector('.h-t small').textContent = st.kind === 'tunnel' ? '60% model · 50 m/s · rolling road · yaw 0°' : st.kind === 'cfd' ? 'RANS · 140 M cells · ride height map' : st.kind === 'sim' ? `Driver in the loop · ${st.sim?.track ?? ''}` : st.kind === 'dyno' ? 'Full load · lap cycle' : st.slot === 'chassis' ? 'Torsion rig · FIA load cases' : '7-post rig · kerb sequence';
    hud.classList.toggle('live', st.progress != null);
    hud.querySelector('.h-bar i').style.width = `${(st.progress ?? 0) * 100}%`;
    const L = LAB[st.slot];
    hud.querySelector('.h-figs').innerHTML = st.figures ? L.metrics.slice(0, 4).map((m) => { const v = st.figures[m.key]; const jit = st.progress != null && st.progress < 1 ? 1 + (Math.random() - 0.5) * 0.04 * (1 - st.progress) : 1; return `<div><small>${m.name}</small><b>${(v * jit).toFixed(m.d)}</b><em>${m.unit}</em></div>`; }).join('') : '';
    const showChart = st.kind !== 'tunnel' && st.kind !== 'sim';
    hud.querySelector('.h-chart').style.display = showChart ? 'block' : 'none';
    if (showChart) chart.set({ ...st, issues: [], kind: st.kind === 'cfd' ? 'cfdres' : st.kind });
  }

  const clock = { last: performance.now(), t: 0 };
  let raf = requestAnimationFrame(frame);
  function frame(now) {
    if (!canvas.isConnected) { destroy(); return; }
    raf = requestAnimationFrame(frame);
    // (the first frame's timestamp can be earlier than the moment the view was made: never a negative step)
    const dt = clamp((now - clock.last) / 1000, 0, 0.05); clock.last = Math.max(clock.last, now); clock.t += dt;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h || !st) return;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    const t = clock.t, mode = st.kind === 'tunnel' || st.kind === 'cfd' ? 'tunnel' : st.kind === 'sim' ? 'sim' : 'rig';
    const running = st.progress != null;
    // The tunnel: belt, flow, smoke.
    if (mode === 'tunnel') {
      sets.tunnel.userData.belt.offset.x -= dt * 2.2;
      stepParticles(dt * (running ? 1.15 : 0.85), st.kind === 'cfd');
      smokeTex.offset.x -= dt * 1.4;
      if (st.kind === 'cfd') paintCfd(running ? st.progress : 1);
    }
    // The rig and the dyno.
    const posts = sets.rig.userData.posts;
    posts.forEach((p) => { p.visible = mode === 'rig' && st.slot === 'suspension'; });
    if (mode === 'rig' && part) {
      const n = Object.fromEntries(LAB[st.slot].params.map((pm) => [pm.key, (st.x[pm.key] - pm.min) / (pm.max - pm.min)]));
      holder.position.set(0, 0, 0); holder.rotation.set(0, 0, 0);
      if (st.slot === 'suspension') {
        const ph = (t * 1.6) % 4, inp = ph > 1 && ph < 1.25 ? Math.sin((ph - 1) / 0.25 * Math.PI) : 0;
        const k = 0.5 + n.spring * 2, c = 0.15 + n.damp * 1.2;
        holder.userData.z ??= 0; holder.userData.v ??= 0;
        const a = k * (inp * 0.06 - holder.userData.z) * 40 - c * holder.userData.v * 8; holder.userData.v += a * dt; holder.userData.z += holder.userData.v * dt;
        holder.position.y = holder.userData.z;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) => { posts[i].position.set(C.x + sx * E.x * 0.8, 0.25 + inp * 0.06 * (i < 2 ? 1 : 0.6), C.z + sz * E.z * 0.7); });
      } else if (st.slot === 'chassis') {
        holder.rotation.z = Math.sin(t * 1.4) * (0.02 + (1 - n.stiff) * 0.05) * (running ? 1 : 0.4);
      } else if (st.slot === 'brakes') {
        const brake = (t * 0.8) % 1 < 0.25, heat = clamp(((st.figures?.temp ?? 1000) - 500) / 700, 0, 1);
        spinner.rotation.z -= dt * (brake ? 8 : 30);
        holder.userData.heat = (holder.userData.heat ?? 0) + ((brake ? 0.4 + heat * 0.8 : 0) - (holder.userData.heat ?? 0)) * dt * (brake ? 3 : 0.8);
        const hh = holder.userData.heat;
        glow.material.color.setRGB(hh * 3, hh * hh * 1.4, hh ** 3 * 0.4);
      } else if (st.slot === 'pu') {
        const shake = running ? 0.004 : 0.0015;
        holder.position.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, 0);
        if (exhaust) exhaust.intensity = (running ? 6 : 2) * (0.7 + Math.random() * 0.6);
      }
    }
    // The simulator: the car round the lap.
    if (mode === 'sim') simFrame(dt);
    // Markers pulse; hidden while the test runs.
    markers.children.forEach((s) => { const sc = Math.max(E.x, E.y, E.z) * 0.32 * (1 + Math.sin(t * 5 + s.userData.k) * 0.06); s.scale.set(sc * 4, sc, 1); s.visible = !running || st.progress > 0.85; });
    // Camera.
    if (mode === 'sim' && carMesh) {
      desired.set(Math.sin(t * 0.035) * 16, 128, 96 + Math.cos(t * 0.035) * 10);
      lookD.set(17, 0, 4).lerp(carMesh.position, 0.22);   // aimed right of centre: the circuit sits left of the timing panel
    } else {
      const list = SHOTS[st.kind === 'cfd' ? 'cfd' : st.kind === 'tunnel' ? 'tunnel' : st.kind === 'dyno' ? 'dyno' : 'rig'];
      shotT += dt;
      const len = running ? 2.6 : 7;
      if (shotT > len) { shotT = 0; shotIdx = (shotIdx + 1) % list.length; }
      const [dx, dy, dz, dist] = list[shotIdx], R = Math.max(E.x, E.y * 1.6, E.z) * 2.2 * dist;
      const drift = ease(clamp(shotT / len, 0, 1)) * 0.35 - 0.17;
      const dir = new Vector3(dx, dy, dz).normalize().applyAxisAngle(new Vector3(0, 1, 0), drift);
      desired.copy(C).addScaledVector(dir, R); desired.y = Math.max(0.12, desired.y);
      lookD.copy(C);
      if (shotT < dt * 1.5) { camPos.copy(desired); camLook.copy(lookD); }   // a cut
    }
    camPos.lerp(desired, 1 - Math.exp(-dt * (mode === 'sim' ? 3 : 1.6)));
    camLook.lerp(lookD, 1 - Math.exp(-dt * 4));
    camera.position.copy(camPos); camera.lookAt(camLook);
    spot.position.set(C.x + 0.5, C.y + 4, C.z + 1); spot.target.position.copy(C);
    composer.render();
  }
  function destroy() {
    cancelAnimationFrame(raf);
    part?.traverse((o) => o.geometry?.dispose());
    tubes.children.forEach((m) => m.geometry.dispose());
    composer.dispose?.(); renderer.dispose(); renderer.forceContextLoss?.();
    hud.remove();
  }
  // How long a simulator test takes: one lap at three times real time (ms).
  const simDuration = () => (M ? (M.lap1 / SIM_SPEED) * 1000 : 25000);
  return { set, destroy, simDuration };
}
