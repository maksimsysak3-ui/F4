import {
  Group, Mesh, BoxGeometry, PlaneGeometry, CylinderGeometry, LatheGeometry, SphereGeometry, MeshStandardMaterial, MeshBasicMaterial,
  CanvasTexture, SRGBColorSpace, Color, Vector2, Vector3, HemisphereLight, DirectionalLight, SpotLight, PointLight, Points, PointsMaterial,
  BufferGeometry, BufferAttribute, InstancedMesh, Object3D, DoubleSide, AdditiveBlending,
} from 'three';
import { buildPerson, setPose, setAction, animatePerson, handAnchor } from './people.js?v=1a016bc';

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

// ------------------------------------------------------------------------------ shared pieces
const CREW_LOOKS = [['#ebc29c', 'short', '#2a1d14'], ['#d6a476', 'buzz', '#1b1714'], ['#9a6440', 'bald', '#1b1714'], ['#f4d2b4', 'quiff', '#7a5634'], ['#c08d60', 'short', '#5a3a22'], ['#6a4430', 'buzz', '#120e0c']]
  .map(([skin, hair, hairCol]) => ({ skin, hair, hairCol }));
/** Walk a person from a to b over [t0, t1] (facing the way it goes), the walk animation while moving. */
function walkTo(p, a, b, t, t0, t1, speed = 1.4) {
  if (t < t0) return false;
  const u = Math.min(1, (t - t0) / (t1 - t0));
  p.position.set(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u);
  if (u < 1) { p.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); if (p.userData.act !== 'walk') setAction(p, 'walk', { speed }); }
  return u >= 1;
}
function act(p, name, o) { if (p.userData.act !== name || !p.userData.cur) setAction(p, name, o); }
/** A stand-in camera flash: a bright quad that pops for a frame or two. */
function flashes(g, n, area) {
  const list = [];
  for (let k = 0; k < n; k++) {
    const m = new Mesh(new PlaneGeometry(0.28, 0.28), new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    m.position.set(area.x0 + Math.random() * (area.x1 - area.x0), area.y0 + Math.random() * (area.y1 - area.y0), area.z0 + Math.random() * (area.z1 - area.z0));
    g.add(m); list.push({ m, t: Math.random() * 3 });
  }
  return (dt, rate = 1, camera = null) => { for (const f of list) { f.t -= dt * rate; if (f.t < 0) { f.t = 0.6 + Math.random() * 2.5; f.m.material.opacity = 1; } else f.m.material.opacity *= Math.exp(-dt * 22); if (camera) f.m.lookAt(camera.position); } };
}
/** A microphone (with the broadcaster's coloured cube) or a TV camera, for a hand. */
function microphone(colour) {
  const g = new Group();
  const stick = new Mesh(new CylinderGeometry(0.018, 0.015, 0.2, 8), M('#1a1a1c', 0.4)); stick.position.y = 0.06; g.add(stick);
  const ball = new Mesh(new SphereGeometry(0.035, 10, 8), M('#2a2a2e', 0.9)); ball.position.y = 0.18; g.add(ball);
  const cube = new Mesh(new BoxGeometry(0.055, 0.055, 0.055), M(colour, 0.5)); cube.position.y = 0.12; g.add(cube);
  g.rotation.x = 1.3;
  return g;
}
function tvCamera() {
  const g = new Group();
  const body = new Mesh(new BoxGeometry(0.16, 0.2, 0.42), M('#202126', 0.5, 0.3)); g.add(body);
  const lens = new Mesh(new CylinderGeometry(0.06, 0.07, 0.14, 12), M('#0e0e10', 0.3, 0.5)); lens.rotation.x = Math.PI / 2; lens.position.z = 0.27; g.add(lens);
  const handle = new Mesh(new BoxGeometry(0.03, 0.06, 0.2), M('#111', 0.6)); handle.position.y = 0.13; g.add(handle);
  g.position.set(0, 0.02, 0.05);
  return g;
}

// --------------------------------------------------------------------------------- parc fermé
/**
 * A podium finish: the car in its P1/P2/P3 spot, the team's crew packed behind the barrier; the driver
 * climbs out, up onto the car (a win) or onto the sidepod, celebrates to the crowd, then runs to the
 * crew and jumps into them, confetti over it all. ~17 s.
 * o: { car (Group, nose +z), team, look (the driver), pos (1..3) }
 */
export function buildParcFerme(g, o) {
  lights(g, 0xffe6c4);
  const win = o.pos === 1;
  const floor = new Mesh(new PlaneGeometry(60, 40).rotateX(-Math.PI / 2), M('#8f9298', 0.85)); floor.receiveShadow = true; g.add(floor);
  for (let x = -24; x <= 24; x += 6) { const d = new Mesh(new BoxGeometry(5.8, 5, 0.3), M(x % 12 === 0 ? '#2a2d34' : '#22252b', 0.6)); d.position.set(x, 2.5, -9); g.add(d); }
  const header = new Mesh(new PlaneGeometry(50, 1.2), new MeshBasicMaterial({ map: tex(1024, 32, (c, w, h) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); c.fillStyle = '#e10600'; c.fillRect(0, h - 4, w, 4); c.fillStyle = '#fff'; c.font = '900 20px "Titillium Web", Arial'; c.textAlign = 'center'; c.fillText('PARC FERMÉ', w / 2, 22); }) }));
  header.position.set(0, 5.6, -8.8); g.add(header);
  [[-6, 2], [0, 1], [6, 3]].forEach(([x, n]) => {
    const b = new Mesh(new PlaneGeometry(1.6, 1.1), new MeshBasicMaterial({ map: tex(160, 110, (c, w, h) => { c.fillStyle = n === 1 ? '#d4a017' : n === 2 ? '#b8bcc4' : '#b07040'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = '900 64px "Titillium Web", Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`P${n}`, w / 2, h / 2 + 4); }) }));
    b.position.set(x, 1.7, -2.6); g.add(b);
    const post = new Mesh(new CylinderGeometry(0.04, 0.04, 1.2, 6), SILVER); post.position.set(x, 0.6, -2.6); g.add(post);
  });
  const barrier = new Mesh(new BoxGeometry(40, 1.1, 0.3), M('#e8e8ea', 0.5)); barrier.position.set(0, 0.55, -6); g.add(barrier);
  const kit = suit(o.team), people = [];
  // The crew packed along the barrier, two rows, clapping as the car arrives.
  const crew = [];
  for (let k = 0; k < 22; k++) {
    const p = buildPerson(CREW_LOOKS[k % CREW_LOOKS.length], { ...kit, kind: 'polo' });
    const row = k % 2;
    p.position.set(-9 + (k >> 1) * 1.15 + (Math.random() - 0.5) * 0.25 + row * 0.55, 0, -6.6 - row * 0.75);
    p.userData.ph = Math.random() * 6;
    setAction(p, 'clap', { phase: p.userData.ph });
    g.add(p); people.push(p); crew.push(p);
  }
  const slot = [0, -6, 6][o.pos - 1] ?? 0;
  const car = o.car; car.position.set(slot, car.position.y, 1.2); car.rotation.y = Math.PI; g.add(car);
  const driver = buildPerson(o.look, kit);
  const seat = V(slot, 0.42, 1.6);
  driver.position.copy(seat); driver.rotation.y = Math.PI;
  setPose(driver, 'sit');
  g.add(driver); people.push(driver);
  const confetti = new Confetti(g, [...o.team.colours, '#ffd700'], 700, 22, 10);
  const flash = flashes(g, 10, { x0: slot - 6, x1: slot + 6, y0: 1.5, y1: 2.6, z0: 6, z1: 9 });
  // Where the celebration happens: on the car's nose (a win) or beside the cockpit.
  const top = win ? V(slot, 0.62, -0.4) : V(slot + 1.2, 0, 1.4), barrierSpot = V(slot * 0.5, 0, -5.2);
  let t = 0, phase = 0;
  const cam = cameraPath([
    [0, V(slot + 6, 2.6, 8), V(slot, 0.8, 1.2), 38], [2.5, V(slot + 3, 1.7, 4.6), V(slot, 1.0, 1.4), 40],
    [5.5, V(slot - 2.2, 1.4, 4.4), V(slot, 1.5, 0.6), 40], [5.51, V(slot + 3.6, 1.4, 1.6), V(top.x, top.y + 1.2, top.z), 36],
    [9.5, V(slot + 3.2, 1.8, 2.6), V(top.x, top.y + 1.1, top.z), 38], [9.51, V(slot + 4, 2.4, 2), V(slot * 0.5, 1.4, -5.6), 44],
    [14, V(slot - 3, 2.8, 1), V(slot * 0.5, 1.3, -5.6), 46], [17, V(slot - 5, 3.6, 6), V(slot * 0.5, 1.2, -4), 50],
  ]);
  return {
    people,
    update(dt, camera) {
      t += dt;
      // Out of the cockpit: up onto the seat, then onto the nose / down beside the car.
      if (t > 1.5 && phase === 0) { phase = 1; setPose(driver, 'idle'); driver.userData.cur = null; setAction(driver, 'hug'); }
      if (phase === 1) {
        const u = ease((t - 1.5) / 2.2);
        driver.position.set(seat.x + (top.x - seat.x) * u, seat.y + 0.15 + (top.y - seat.y - 0.15) * u + Math.sin(Math.PI * u) * 0.55, seat.z + (top.z - seat.z) * u);
        driver.rotation.y = Math.PI * (1 - u);   // turning to the cameras and the grandstand
        if (u >= 1) { phase = 2; act(driver, win ? 'fistpump' : 'wave2'); }
      }
      if (phase === 2 && t > 6.2) { act(driver, win ? 'cheer' : 'fistpump'); }
      if (phase === 2 && t > 8.6) { phase = 3; driver.userData.from = driver.position.clone(); }
      // Down and over to the crew at the barrier, into their arms.
      if (phase === 3 && walkTo(driver, driver.userData.from, barrierSpot, t, 8.6, 10.6, 1.8)) { phase = 4; driver.rotation.y = Math.PI; act(driver, 'hug'); }
      if (phase === 4 && t > 12) act(driver, 'jump');
      for (const p of crew) {
        if (t > 4 && t < 9.5) act(p, 'cheer', { phase: p.userData.ph });
        else if (t >= 9.5) act(p, Math.sin(p.userData.ph * 7) > 0 ? 'jump' : 'wave2', { phase: p.userData.ph });
      }
      if (t > 4) confetti.update(dt);
      flash(dt, t > 3 ? 2.2 : 0.6, camera);
      cam(camera, t);
      return t > 17;
    },
  };
}

// ------------------------------------------------------------------------------ the garage finish
/**
 * Off the podium (or out of the race): back in the garage. The car rolls in, the driver climbs out,
 * pulls the gloves off, the crew clap a points finish (or stand quietly after a bad day), the race
 * engineer comes over for a word. ~11 s.
 * o: { car, team, look, pos, points, dnf }
 */
export function buildGarageFinish(g, o) {
  lights(g, 0xfff0dc);
  const c0 = o.team.colours[0], c1 = o.team.colours[1] ?? '#ffffff', kit = suit(o.team), good = !o.dnf && (o.points ?? 0) > 0;
  const floor = new Mesh(new PlaneGeometry(14, 16).rotateX(-Math.PI / 2), M('#c9ccd2', 0.35)); floor.receiveShadow = true; g.add(floor);
  for (const [x, w] of [[-5, 0.3], [5, 0.3]]) { const wall = new Mesh(new BoxGeometry(w, 5, 16), M('#e8e9ec', 0.6)); wall.position.set(x, 2.5, 0); g.add(wall);
    const band = new Mesh(new BoxGeometry(w + 0.02, 0.7, 16), M(c0, 0.5)); band.position.set(x, 1.6, 0); g.add(band); }
  const back = new Mesh(new BoxGeometry(10, 5, 0.3), M(c0, 0.55)); back.position.set(0, 2.5, -7); g.add(back);
  const logo = new Mesh(new PlaneGeometry(4.6, 1.1), new MeshBasicMaterial({ map: tex(512, 128, (cx, w, h) => { cx.fillStyle = c0; cx.fillRect(0, 0, w, h); cx.fillStyle = c1; cx.font = '900 64px "Titillium Web", Arial'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(o.team.name.toUpperCase(), w / 2, h / 2 + 4, w * 0.92); }) }));
  logo.position.set(0, 3.4, -6.84); g.add(logo);
  const roof = new Mesh(new BoxGeometry(10, 0.3, 16), M('#202227', 0.7)); roof.position.set(0, 5.1, 0); g.add(roof);
  for (let z = -5; z <= 5; z += 2.5) { const l = new Mesh(new BoxGeometry(0.2, 0.05, 1.8), new MeshBasicMaterial({ color: 0xffffff })); l.position.set(0, 4.92, z); g.add(l); }
  for (const x of [-4.2, 4.2]) for (const z of [-5, -3.6]) { const tb = new Mesh(new BoxGeometry(0.9, 1.1, 1.2), M('#b0182a', 0.4, 0.3)); tb.position.set(x, 0.55, z); g.add(tb); }
  const car = o.car; car.rotation.y = 0; g.add(car);
  const people = [], crew = [];
  const spots = [[-2.4, -2.5], [2.4, -2.5], [-3.2, -0.5], [3.2, -0.5], [-3.4, 1.6], [3.4, 1.6], [-1.6, -4.5], [1.6, -4.5], [0, -5.4]];
  spots.forEach(([x, z], k) => {
    const p = buildPerson(CREW_LOOKS[k % CREW_LOOKS.length], { ...kit, kind: 'race' });
    p.position.set(x, 0, z); p.rotation.y = Math.atan2(-x, 1.5 - z) ; p.userData.ph = Math.random() * 5;
    setAction(p, null); g.add(p); people.push(p); crew.push(p);
  });
  const eng = buildPerson({ skin: '#e6b994', hair: 'short', hairCol: '#3a2a1a', glasses: true }, { kind: 'polo', main: c0, accent: c1 });
  eng.position.set(-3.6, 0, 3.2); eng.rotation.y = 1.2; g.add(eng); people.push(eng); setAction(eng, null);
  const driver = buildPerson(o.look, kit);
  setPose(driver, 'sit'); g.add(driver); people.push(driver);
  let t = 0, phase = 0;
  const carZ = (tt) => 7 - 6.6 * ease(tt / 3.2);
  const cam = cameraPath([
    [0, V(2.6, 1.6, 7.2), V(0, 0.8, 3), 46], [3.2, V(3, 1.8, 5.2), V(0, 0.9, 0.2), 44],
    [6, V(-2.4, 1.6, 3.6), V(0.8, 1.4, 0.4), 40], [6.01, V(1.4, 1.65, 4.6), V(-1.2, 1.5, 1.2), 36], [11.5, V(2.6, 2.2, 6.4), V(-1.4, 1.3, 1.2), 44],
  ]);
  return {
    people,
    update(dt, camera) {
      t += dt;
      // The car pushed back into its place; the driver still in it.
      const z = carZ(Math.min(t, 3.2)); car.position.z = z;
      if (phase === 0) { driver.position.set(0, 0.42, z + 0.4); driver.rotation.y = 0; }
      if (t > 3.6 && phase === 0) { phase = 1; setPose(driver, 'idle'); driver.userData.cur = null; setAction(driver, 'hug'); driver.userData.from = driver.position.clone(); }
      if (phase === 1) {
        const u = ease((t - 3.6) / 1.8), f = driver.userData.from;
        driver.position.set(f.x - 1.3 * u, f.y * (1 - u) + Math.sin(Math.PI * u) * 0.5, f.z + 0.4 * u);
        driver.rotation.y = -1.2 * u;
        if (u >= 1) { phase = 2; driver.userData.from = driver.position.clone(); act(driver, good ? 'fistpump' : null); }
      }
      if (phase === 2 && t > 7 && walkTo(driver, driver.userData.from, V(-2.7, 0, 2.6), t, 7, 8.4, 1.3)) { phase = 3; driver.rotation.y = -1.9; act(driver, good ? 'hug' : null); }
      if (phase >= 2) { eng.rotation.y = 1.4; act(eng, t > 8.4 ? 'hug' : null); }
      for (const p of crew) act(p, t > 4 && good ? ((o.pos ?? 20) <= 6 ? 'cheer' : 'clap') : null, { phase: p.userData.ph });
      cam(camera, t);
      return t > 11.5;
    },
  };
}

// ------------------------------------------------------------------------------- the media pen
/**
 * The interviews: the player behind a lectern in front of the sponsor backdrop (the media pen after the
 * race; the team's garage front in the pit lane before practice), a pack of reporters crowding in with
 * microphones, TV cameras on shoulders, photographers' flashes. setSpeaker(k) puts reporter k's
 * microphone forward. No end: the interview screen closes it.
 * o: { team, look, kind: 'pre' | 'post', reporters: [{ colour }] }
 */
export function buildMediaPen(g, o) {
  lights(g, 0xfff4e6);
  const c0 = o.team.colours[0], c1 = o.team.colours[1] ?? '#ffffff', kit = suit(o.team), pre = o.kind === 'pre';
  const floor = new Mesh(new PlaneGeometry(30, 20).rotateX(-Math.PI / 2), M(pre ? '#8f9298' : '#2a2c32', 0.8)); floor.receiveShadow = true; g.add(floor);
  // The backdrop: the step-and-repeat boards (team and series logos) or the garage front with the team's name.
  const back = new Mesh(new PlaneGeometry(12, 4.2), new MeshBasicMaterial({ map: tex(1200, 420, (c, w, h) => {
    if (pre) {
      c.fillStyle = '#1c1e24'; c.fillRect(0, 0, w, h); c.fillStyle = c0; c.fillRect(0, 0, w, 90);
      c.fillStyle = c1; c.font = '900 64px "Titillium Web", Arial'; c.textAlign = 'center'; c.fillText(o.team.full?.toUpperCase?.() ?? o.team.name.toUpperCase(), w / 2, 66, w * 0.94);
      c.fillStyle = '#2c2f36'; for (let x = 20; x < w; x += 140) c.fillRect(x, 120, 120, 300);   // the garage door panels
    } else {
      c.fillStyle = '#f4f5f8'; c.fillRect(0, 0, w, h);
      const logos = [[o.team.name.toUpperCase(), c0], ['FORMULA 1', '#e10600'], ['FIA', '#1b3fa8'], ['PADDOCK POST', '#c9a24a'], ['GRID TV', '#e10600']];
      c.font = '900 30px "Titillium Web", Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let y = 0, r = 0; y < h + 40; y += 70, r++) for (let x = (r % 2) * 120; x < w + 120; x += 240) { const [txt, col] = logos[(Math.floor(x / 240) + r) % logos.length]; c.fillStyle = col; c.fillText(txt, x, y + 30, 210); }
    }
  }) }));
  back.position.set(0, 2.1, -1.6); g.add(back);
  // The lectern (team colours, its name on the front) and the player behind it.
  const desk = new Mesh(new BoxGeometry(1.1, 1.1, 0.5), M(c0, 0.45)); desk.position.set(0, 0.55, -0.1); desk.castShadow = true; g.add(desk);
  const plate = new Mesh(new PlaneGeometry(0.9, 0.3), new MeshBasicMaterial({ map: tex(256, 84, (c, w, h) => { c.fillStyle = c0; c.fillRect(0, 0, w, h); c.fillStyle = c1; c.font = '900 40px "Titillium Web", Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.team.name.toUpperCase(), w / 2, h / 2 + 2, w * 0.92); }) }));
  plate.position.set(0, 0.8, 0.16); g.add(plate);
  const player = buildPerson(o.look, kit); player.position.set(0, 0, -0.65); setPose(player, 'clasp'); g.add(player);
  // The press pack: a semicircle three deep, microphones held out to the lectern, cameras, photographers.
  const people = [player], mics = [], cams = [];
  const looks = [...CREW_LOOKS, { skin: '#f0c9a8', hair: 'long', hairCol: '#5a3a22' }, { skin: '#c9946c', hair: 'braids', hairCol: '#1b1714' }];
  const outfits = ['#2a3242', '#3a2a2a', '#22303a', '#3c3c44', '#4a3a2c', '#1e2a3a'];
  let k = 0;
  for (const [r, n, rad] of [[0, 6, 1.75], [1, 7, 2.55], [2, 6, 3.3]]) for (let j = 0; j < n; j++) {
    const a = -0.95 + (j / (n - 1)) * 1.9 + (r === 1 ? 0.06 : 0), x = Math.sin(a) * rad, z = 0.2 + Math.cos(a) * rad;
    const p = buildPerson(looks[k % looks.length], { kind: 'suit', main: outfits[k % outfits.length], accent: '#d8d8dc' });
    p.position.set(x, 0, z); p.rotation.y = Math.atan2(-x, -0.6 - z) + (Math.random() - 0.5) * 0.15;
    const role = r === 0 ? 'mic' : r === 1 ? (j % 3 === 1 ? 'camera' : 'mic') : (j % 2 ? 'photo' : 'camera');
    p.userData.role = role; p.userData.ph = Math.random() * 5;
    if (role === 'mic') { const m = microphone(o.reporters?.[mics.length % (o.reporters?.length || 1)]?.colour ?? ['#e10600', '#1f6ad8', '#00a19b', '#c9a24a'][mics.length % 4]); handAnchor(p, 1).add(m); mics.push(p); }
    if (role === 'camera') { handAnchor(p, 1).add(tvCamera()); cams.push(p); }
    setAction(p, role, { phase: p.userData.ph });
    g.add(p); people.push(p); k++;
  }
  const flash = flashes(g, 8, { x0: -3, x1: 3, y0: 1.5, y1: 1.9, z0: 2.4, z1: 3.6 });
  let t = 0, speaker = 0;
  return {
    people,
    setSpeaker(i) { speaker = i; },
    update(dt, camera) {
      t += dt;
      // The active reporter leans in, mic forward; the player turns a little to them.
      mics.forEach((p, i) => { p.userData.actO.speed = 1; p.position.y = 0; p.userData.cur && (p.userData.cur.lean += ((i % 3 === speaker % 3 && i < 3 ? 0.12 : 0) - p.userData.cur.lean) * Math.min(1, dt * 4)); });
      const sp = mics[speaker % Math.max(1, Math.min(3, mics.length))];
      if (sp) player.rotation.y += (Math.atan2(sp.position.x - player.position.x, sp.position.z - player.position.z) * 0.35 - player.rotation.y) * Math.min(1, dt * 3);
      if (t > 0.5 && player.userData.act === undefined) setAction(player, null);
      flash(dt, 1.4, camera);
      // Over the reporters' shoulders, drifting slowly; a touch closer each question.
      // (Above the pack's heads, the player framed right of centre, clear of the question card.)
      const d = 5.4 - Math.min(0.6, speaker * 0.25), sw = Math.sin(t * 0.18) * 0.5;
      camera.position.set(-1.3 + sw, 2.55 + Math.sin(t * 0.23) * 0.05, d);
      camera.fov = 30; camera.updateProjectionMatrix();
      camera.lookAt(-0.9, 1.3, -0.6);
      return false;
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
  const foam = new Foam(g), confetti = new Confetti(g, ['#ffd700', '#ffffff', '#e10600', ...o.top.flatMap((d) => d.team.colours.slice(0, 1))], 900, 16, 10);
  const flash = flashes(g, 14, { x0: -6, x1: 6, y0: 0.4, y1: 1.6, z0: 4.5, z1: 7.5 });
  // Walking out from the back of the stage onto their steps.
  hands.forEach((h, k) => { h.from = V(h.x, h.y, -2.0); h.to = V(h.x, h.y, 0.1); h.p.position.copy(h.from); h.p.userData.ph = k * 1.3; });
  const cam = cameraPath([
    [0, V(0, 3.4, 15), V(0, 2.2, 0), 36], [4, V(0, 2.6, 11), V(0, 2.4, 0), 36],                    // the walk-out, the anthem
    [8, V(-3.4, 2.5, 8.5), V(0, 2.4, 0), 38], [8.01, V(3.2, 2.0, 5.6), V(2.3, 2.6, 0), 32],          // the trophies: third...
    [10, V(-2.6, 2.3, 5.8), V(-2.3, 2.8, 0), 32], [12, V(0.6, 2.6, 6.2), V(0, 3.2, 0), 32],            // ...second, the winner
    [14.5, V(0, 2.8, 9.5), V(0, 2.6, 0), 40], [14.51, V(-4.6, 2.2, 6), V(0.6, 2.6, 0), 42],            // the champagne
    [19, V(4.6, 2.4, 6.4), V(-0.4, 2.6, 0), 42], [23, V(0, 3.0, 9), V(0, 2.6, 0), 44], [29, V(-2, 4.6, 14), V(0, 2.2, 0), 48],
  ]);
  let t = 0;
  const tmp = new Vector3(), tmp2 = new Vector3();
  return {
    people,
    update(dt, camera) {
      t += dt;
      hands.forEach((h, k) => {
        const p = h.p, trophyAt = [12, 10, 8][k];   // third, second, then the winner
        if (t < 3.2) { walkTo(p, h.from, h.to, t, 0.2 + k * 0.25, 3.0 + k * 0.1, 1.2); return; }
        p.position.copy(h.to);
        if (t < trophyAt) { p.rotation.y = 0; p.userData.pose = 'clasp'; act(p, null); return; }
        if (t < 14.5) { h.tr.visible = true; act(p, 'lift', { phase: k }); return; }
        if (t < 16.5) { h.tr.visible = false; h.bt.visible = true; act(p, 'shake'); return; }
        if (t < 23) {
          // Spraying: the winner soaks the other two, they spray the winner back; a swig now and then.
          const swig = Math.sin(t * 0.9 + k * 2) > 0.85;
          act(p, swig ? 'drink' : 'spray', { phase: k * 2 });
          if (!swig) {
            h.bt.getWorldPosition(tmp); tmp.y += 0.35;
            const aim = k === 0 ? (Math.sin(t * 1.3) > 0 ? hands[1] : hands[2]) : hands[0];
            if (aim) { tmp2.set(aim.x - h.x, 0.55, 1.0).normalize(); foam.emit(tmp, tmp2, 300, dt); }
            p.rotation.y = Math.sin(t * 1.6 + k) * 0.4;
          }
          return;
        }
        h.bt.visible = false; p.rotation.y = 0;
        act(p, k === 0 ? 'jump' : (k === 1 ? 'cheer' : 'wave2'), { phase: k });
      });
      if (t > 14.5) confetti.update(dt);
      foam.update(dt);
      flash(dt, t > 8 ? 2.5 : 0.8, camera);
      cam(camera, t);
      return t > 29;
    },
  };
}
void SphereGeometry; void PointLight; void AdditiveBlending;
