import {
  Group, Mesh, BoxGeometry, PlaneGeometry, CylinderGeometry, LatheGeometry, SphereGeometry, MeshStandardMaterial, MeshBasicMaterial,
  CanvasTexture, SRGBColorSpace, Color, Vector2, Vector3, HemisphereLight, DirectionalLight, SpotLight, PointLight, Points, PointsMaterial,
  BufferGeometry, BufferAttribute, InstancedMesh, Object3D, DoubleSide, AdditiveBlending,
} from 'three';
import { buildPerson, setPose, animatePerson, handAnchor } from './people.js';

/*
 * After the chequered flag:
 *
 *   parc fermé   the cars that finished in the top three parked in front of their P1/P2/P3 boards, the
 *                teams packed behind the barrier cheering; the player's car in front of the camera and
 *                the player climbing out of the cockpit, then celebrating (or just getting out, quietly,
 *                after a bad day)
 *   podium       the three on their steps under the Grand Prix's name: the anthem, the trophies held up,
 *                the champagne (foam spraying, the winner soaking the other two), confetti
 *
 * Each scene returns { people, update(dt, camera) -> true when it's over }. The camera follows a
 * scripted path; the front end puts the classification up when it's over.
 */
const M = (c, r = 0.6, m = 0) => new MeshStandardMaterial({ color: new Color(c), roughness: r, metalness: m });
const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t; };
const ease = (x) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
const suit = (team) => { const light = new Color(team.colours[0]).getHSL({}).l > 0.85; return { kind: 'race', main: light ? team.colours[1] : team.colours[0], accent: light ? team.colours[0] : team.colours[1] ?? '#fff', patch: team.colours[2] ?? '#fff' }; };
const GOLD = new MeshStandardMaterial({ color: 0xffcc55, metalness: 1, roughness: 0.18, emissive: 0x3a2a00, emissiveIntensity: 0.4 });
const SILVER = new MeshStandardMaterial({ color: 0xe8ecf2, metalness: 1, roughness: 0.2 });

/** A trophy: a cup on a stem (the winner's is the biggest). */
function trophy(scale = 1, mat = GOLD) {
  const pts = [[0, 0], [0.09, 0], [0.09, 0.025], [0.035, 0.05], [0.025, 0.16], [0.05, 0.19], [0.11, 0.24], [0.13, 0.33], [0.12, 0.36], [0.11, 0.36], [0.115, 0.33], [0.09, 0.25], [0, 0.23]].map(([x, y]) => new Vector2(x, y));
  const m = new Mesh(new LatheGeometry(pts, 24), mat);
  m.scale.setScalar(scale * 1.25); m.castShadow = true;
  for (const s of [-1, 1]) { const h = new Mesh(new CylinderGeometry(0.012, 0.012, 0.12, 6), mat); h.position.set(s * 0.15 * scale * 1.25, 0.3 * scale * 1.25, 0); h.rotation.z = s * 0.4; m.add(h); }
  return m;
}
/** A magnum of champagne (green glass, gold foil). */
function bottle() {
  const g = new Group();
  const glass = new Mesh(new CylinderGeometry(0.05, 0.05, 0.24, 14), new MeshStandardMaterial({ color: 0x1e4a2a, roughness: 0.15, metalness: 0.2 }));
  glass.position.y = 0.12; g.add(glass);
  const neck = new Mesh(new CylinderGeometry(0.018, 0.045, 0.11, 12), glass.material); neck.position.y = 0.29; g.add(neck);
  const foil = new Mesh(new CylinderGeometry(0.02, 0.022, 0.06, 10), new MeshStandardMaterial({ color: 0xd8b04a, metalness: 1, roughness: 0.3 })); foil.position.y = 0.36; g.add(foil);
  const label = new Mesh(new CylinderGeometry(0.0505, 0.0505, 0.08, 14), new MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.6 })); label.position.y = 0.12; g.add(label);
  g.userData.mouth = new Vector3(0, 0.4, 0);
  return g;
}
/** Champagne foam: particles out of the bottle's neck in an arc, falling back. */
class Foam {
  constructor(parent, n = 900) {
    this.n = n; this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3); this.life = new Float32Array(n).fill(-1); this.next = 0;
    const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(this.pos, 3));
    this.points = new Points(g, new PointsMaterial({ color: 0xfff6d8, size: 0.05, transparent: true, opacity: 0.85, depthWrite: false }));
    this.points.frustumCulled = false;
    parent.add(this.points);
  }
  emit(from, dir, rate, dt) {
    const k = Math.floor(rate * dt + Math.random());
    for (let q = 0; q < k; q++) {
      const i = this.next; this.next = (this.next + 1) % this.n;
      this.pos.set([from.x, from.y, from.z], i * 3);
      const sp = 4 + Math.random() * 3;
      this.vel.set([dir.x * sp + (Math.random() - 0.5) * 1.2, dir.y * sp + (Math.random() - 0.3) * 1.2, dir.z * sp + (Math.random() - 0.5) * 1.2], i * 3);
      this.life[i] = 1.6;
    }
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -100; continue; }
      this.life[i] -= dt;
      this.vel[i * 3 + 1] -= 9.8 * dt * 0.6;
      for (let a = 0; a < 3; a++) this.pos[i * 3 + a] += this.vel[i * 3 + a] * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}
/** Confetti: paper squares falling and fluttering in the team colours and gold. */
class Confetti {
  constructor(parent, colours, n = 500, area = 10, top = 9) {
    this.n = n; this.dummy = new Object3D(); this.top = top; this.area = area;
    const m = new InstancedMesh(new PlaneGeometry(0.06, 0.04), new MeshBasicMaterial({ side: DoubleSide }), n);
    const c = new Color();
    this.p = []; for (let i = 0; i < n; i++) { this.p.push({ x: (Math.random() - 0.5) * area, y: top + Math.random() * 8, z: (Math.random() - 0.5) * 4, r: Math.random() * 6, s: 0.5 + Math.random() * 1.5 }); m.setColorAt(i, c.set(colours[i % colours.length])); }
    this.mesh = m; m.visible = false; m.frustumCulled = false;
    parent.add(m);
  }
  update(dt) {
    this.mesh.visible = true;
    this.p.forEach((q, i) => {
      q.y -= dt * (0.8 + q.s * 0.4); q.x += Math.sin(q.r * 2 + q.y) * dt * 0.3; q.r += dt * q.s * 3;
      if (q.y < -0.5) q.y = this.top + Math.random() * 3;
      this.dummy.position.set(q.x, q.y, q.z); this.dummy.rotation.set(q.r, q.r * 0.7, q.r * 0.3); this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
/** The camera along a list of keyframes [t, pos, look, fov]. */
function cameraPath(keys) {
  return (camera, t) => {
    let k = 0; while (k < keys.length - 2 && t > keys[k + 1][0]) k++;
    const [t0, p0, l0, f0] = keys[k], [t1, p1, l1, f1] = keys[Math.min(k + 1, keys.length - 1)];
    const u = ease((t - t0) / Math.max(0.001, t1 - t0));
    camera.position.lerpVectors(p0, p1, u);
    camera.fov = f0 + (f1 - f0) * u; camera.updateProjectionMatrix();
    camera.lookAt(new Vector3().lerpVectors(l0, l1, u));
  };
}
const V = (x, y, z) => new Vector3(x, y, z);
function lights(g, warm = 0xfff2e0) {
  g.add(new HemisphereLight(0xeaf0ff, 0x4a4036, 1.4));
  const sun = new DirectionalLight(warm, 2.4); sun.position.set(6, 12, 8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
  g.add(sun, sun.target);
}

// --------------------------------------------------------------------------------- parc fermé
/**
 * o: { car (Group, ~5.6 m long, nose +z), team, look (the driver), pos (finishing position), crewLooks? }
 */
export function buildParcFerme(g, o) {
  lights(g);
  const top3 = o.pos <= 3;
  // The pit lane floor, the garage fronts behind, the barrier with the team's crew leaning over it.
  const floor = new Mesh(new PlaneGeometry(60, 40).rotateX(-Math.PI / 2), M('#8f9298', 0.85)); floor.receiveShadow = true; g.add(floor);
  for (let x = -24; x <= 24; x += 6) { const d = new Mesh(new BoxGeometry(5.8, 5, 0.3), M(x % 12 === 0 ? '#2a2d34' : '#22252b', 0.6)); d.position.set(x, 2.5, -9); g.add(d); }
  const header = new Mesh(new PlaneGeometry(50, 1.2), new MeshBasicMaterial({ map: tex(1024, 32, (c, w, h) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); c.fillStyle = '#e10600'; c.fillRect(0, h - 4, w, 4); c.fillStyle = '#fff'; c.font = '900 20px "Titillium Web", Arial'; c.textAlign = 'center'; c.fillText('PARC FERMÉ', w / 2, 22); }) }));
  header.position.set(0, 5.6, -8.8); g.add(header);
  // Position boards (P1 P2 P3) on stands.
  [[-6, 2], [0, 1], [6, 3]].forEach(([x, n]) => {
    const b = new Mesh(new PlaneGeometry(1.6, 1.1), new MeshBasicMaterial({ map: tex(160, 110, (c, w, h) => { c.fillStyle = n === 1 ? '#d4a017' : n === 2 ? '#b8bcc4' : '#b07040'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = '900 64px "Titillium Web", Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`P${n}`, w / 2, h / 2 + 4); }) }));
    b.position.set(x, 1.7, -2.6); g.add(b);
    const post = new Mesh(new CylinderGeometry(0.04, 0.04, 1.2, 6), SILVER); post.position.set(x, 0.6, -2.6); g.add(post);
  });
  const barrier = new Mesh(new BoxGeometry(40, 1.1, 0.3), M('#e8e8ea', 0.5)); barrier.position.set(0, 0.55, -6); g.add(barrier);
  // The crew behind the barrier.
  const people = [];
  const kit = suit(o.team);
  for (let k = 0; k < 14; k++) {
    const p = buildPerson(o.crewLooks?.[k % (o.crewLooks?.length || 1)] ?? { skin: ['#ebc29c', '#d6a476', '#9a6440', '#f4d2b4', '#c08d60'][k % 5], hair: ['short', 'buzz', 'bald', 'quiff'][k % 4], hairCol: ['#2a1d14', '#5a3a22', '#1b1714', '#7a5634'][k % 4] }, { ...kit, kind: 'polo' });
    p.position.set(-8 + k * 1.2 + (Math.random() - 0.5) * 0.3, 0, -6.7 - Math.random() * 0.8);
    p.userData.jump = Math.random() * 6;
    g.add(p); people.push(p);
  }
  // The player's car in its spot, the driver in the cockpit.
  const slot = top3 ? [0, -6, 6][o.pos - 1] : 0;
  const car = o.car; car.position.set(slot, car.position.y, 1.2); car.rotation.y = Math.PI; g.add(car); // nose to the boards
  const driver = buildPerson(o.look, kit);
  const seat = V(slot, 0.42, 1.2 + 0.4);   // in the cockpit (the car's nose points -z here)
  driver.position.copy(seat); driver.rotation.y = Math.PI;
  setPose(driver, 'sit');
  g.add(driver); people.push(driver);
  const confetti = top3 ? new Confetti(g, [...o.team.colours, '#ffd700']) : null;
  let t = 0, stood = false, cheered = false;
  const cam = cameraPath([
    [0, V(slot + 5, 2.4, 7), V(slot, 0.8, 1.2), 40], [3, V(slot + 3.2, 1.9, 4.6), V(slot, 1.0, 1.2), 42],
    [6, V(slot - 2.5, 1.7, 4.2), V(slot, 1.4, 1.0), 44], [10, V(slot - 4, 2.6, 7.5), V(slot, 1.2, -2), 48],
  ]);
  return {
    people,
    update(dt, camera) {
      t += dt;
      // Climbing out: up out of the cockpit, a leg over the side, down onto the ground beside the car.
      if (t > 1.5 && t < 3.6) {
        const u = ease((t - 1.5) / 2.1);
        if (!stood && u > 0.35) { setPose(driver, 'idle'); stood = true; }
        driver.position.set(slot + 2.1 * ease((u - 0.3) / 0.7), seat.y * (1 - u) + Math.sin(Math.PI * u) * 0.8, seat.z + 1.3 * u);
      }
      if (t > 3.6 && !cheered) { cheered = true; setPose(driver, top3 ? 'cheer' : 'clasp'); }
      if (cheered && top3) driver.position.y = Math.abs(Math.sin(t * 5)) * 0.35;                  // jumping
      for (const p of people) {
        if (p === driver) continue;
        if (t > 3.8 && top3) { if (p.userData.pose !== 'cheer') setPose(p, 'cheer'); p.position.y = Math.max(0, Math.sin(t * 6 + p.userData.jump)) * 0.2; }
        animatePerson(p, dt);
      }
      animatePerson(driver, dt);
      if (confetti && t > 3.6) confetti.update(dt);
      cam(camera, t);
      return t > 10.5;
    },
  };
}

// ---------------------------------------------------------------------------------------- podium
/**
 * o: { top: [{ team, look, code }] (P1 P2 P3), gp (the Grand Prix's name), playerPos }
 */
export function buildPodium(g, o) {
  lights(g, 0xfff6ea);
  const spot = new SpotLight(0xffffff, 60, 30, 0.6, 0.5, 1.2); spot.position.set(0, 12, 8); spot.target.position.set(0, 1.5, 0); g.add(spot, spot.target);
  // The stage: a dark platform, the steps (2 - 1 - 3 from the crowd's view), the backdrop.
  const stage = new Mesh(new BoxGeometry(14, 0.5, 6), M('#1a1c22', 0.5)); stage.position.set(0, 0.25, 0); stage.receiveShadow = true; g.add(stage);
  const steps = [[0, 1.4, 1], [-2.3, 1.0, 2], [2.3, 0.7, 3]];
  for (const [x, h, n] of steps) {
    const s = new Mesh(new BoxGeometry(2.2, h, 1.8), M('#f2f3f5', 0.35)); s.position.set(x, 0.5 + h / 2, 0); s.castShadow = s.receiveShadow = true; g.add(s);
    const f = new Mesh(new PlaneGeometry(1.2, 0.8), new MeshBasicMaterial({ map: tex(120, 80, (c, w, hh) => { c.fillStyle = '#e10600'; c.fillRect(0, 0, w, hh); c.fillStyle = '#fff'; c.font = '900 60px "Titillium Web", Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), w / 2, hh / 2 + 3); }) }));
    f.position.set(x, 0.5 + h / 2, 0.91); g.add(f);
  }
  const back = new Mesh(new PlaneGeometry(16, 7), new MeshBasicMaterial({ map: tex(1600, 700, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b0d14'); gr.addColorStop(1, '#1a1e2a'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e10600'; c.fillRect(0, h * 0.62, w, 8);
    c.fillStyle = '#fff'; c.font = '900 92px "Titillium Web", Arial'; c.textAlign = 'center'; c.fillText(o.gp.toUpperCase(), w / 2, h * 0.36, w * 0.9);
    c.font = '700 44px "Titillium Web", Arial'; c.fillStyle = '#c9ccd4'; c.fillText('2026 FORMULA 1 WORLD CHAMPIONSHIP', w / 2, h * 0.52);
    c.globalAlpha = 0.12; for (let k = 0; k < 40; k++) c.fillRect(k * 40, 0, 2, h);
  }) }));
  back.position.set(0, 3.9, -2.4); g.add(back);
  // The crowd below the stage (a sea of colour and flags).
  const crowd = new Mesh(new PlaneGeometry(40, 10), new MeshStandardMaterial({ map: tex(800, 200, (c, w, h) => { for (let y = 0; y < h; y += 5) for (let x = 0; x < w; x += 4) { c.fillStyle = ['#e10600', '#ff8000', '#f4f4f6', '#1e2a5c', '#00d2be', '#ffd21f', '#2a2a2a'][Math.floor(Math.random() * 7)]; c.fillRect(x, y, 3, 4); } }), roughness: 1 }));
  crowd.rotation.x = -Math.PI / 2 + 0.25; crowd.position.set(0, -1.2, 9); g.add(crowd);
  // The three on their steps, each with a trophy (to come) and a bottle (to come).
  const people = [], hands = [];
  o.top.forEach((d, k) => {
    const [x, h] = steps[k];
    const p = buildPerson(d.look, suit(d.team));
    p.position.set(x, 0.5 + h, 0.1); p.rotation.y = 0;
    setPose(p, 'clasp');
    g.add(p); people.push(p);
    const right = handAnchor(p, 1), left = handAnchor(p, 0);
    const tr = trophy(k === 0 ? 1.3 : 1, k === 0 ? GOLD : SILVER); tr.visible = false; right.add(tr);
    const bt = bottle(); bt.visible = false; bt.rotation.x = -1.1; left.add(bt);
    hands.push({ tr, bt, p, x, y: 0.5 + h });
  });
  const foam = new Foam(g), confetti = new Confetti(g, ['#ffd700', '#ffffff', '#e10600', ...o.top.flatMap((d) => d.team.colours.slice(0, 1))], 700, 14, 9);
  const cam = cameraPath([
    [0, V(0, 2.6, 14), V(0, 2.2, 0), 38], [4, V(-3, 2.4, 9), V(0, 2.4, 0), 40], [8, V(4, 2.2, 7.5), V(0, 2.6, 0), 42],
    [13, V(0, 3.2, 10), V(0, 2.4, 0), 46], [18, V(-5, 3.6, 12), V(0, 2.2, 0), 48],
  ]);
  let t = 0, phase = 0;
  const tmp = new Vector3(), tmp2 = new Vector3();
  return {
    people,
    update(dt, camera) {
      t += dt;
      // The trophies (from 3 s), held up (from 4 s); the champagne (from 9 s), sprayed until 16 s.
      if (phase === 0 && t > 3) { phase = 1; for (const h of hands) { h.tr.visible = true; setPose(h.p, 'trophy'); } }
      if (phase === 1 && t > 8.5) { phase = 2; for (const h of hands) { h.tr.visible = false; h.bt.visible = true; setPose(h.p, 'spray'); } }
      if (phase === 2) {
        hands.forEach((h, k) => {
          h.bt.getWorldPosition(tmp); tmp.y += 0.35;
          // The winner soaks the other two; second and third spray the crowd and the winner.
          const aim = k === 0 ? (Math.sin(t * 1.3) > 0 ? hands[1] : hands[2]) : hands[0];
          tmp2.set(aim.x - h.x, 0.6, 1.0).normalize();
          if (t < 16) foam.emit(tmp, tmp2, 260, dt);
          h.p.rotation.y = Math.sin(t * 2 + k) * 0.35;
        });
        confetti.update(dt);
      }
      if (phase === 2 && t > 16 && phase !== 3) { phase = 3; for (const h of hands) { h.bt.visible = false; setPose(h.p, 'cheer'); } }
      if (phase === 3) { confetti.update(dt); hands.forEach((h, k) => { h.p.position.y = h.y + Math.max(0, Math.sin(t * 5 + k)) * 0.25; }); }
      foam.update(dt);
      for (const p of people) animatePerson(p, dt);
      cam(camera, t);
      return t > 19;
    },
  };
}
void SphereGeometry; void PointLight; void AdditiveBlending;
