import {
  Group, Mesh, PlaneGeometry, BoxGeometry, CylinderGeometry, SphereGeometry, MeshStandardMaterial, MeshBasicMaterial, SpotLight, PointLight,
  Sprite, SpriteMaterial, CanvasTexture, AdditiveBlending, BackSide, Points, BufferGeometry, Float32BufferAttribute, PointsMaterial,
  Box3, Vector3, Color, Scene, PMREMGenerator, SRGBColorSpace,
} from 'three';

/*
 * The main menu's cinematic: the player's car alone in a dark studio, a glossy black floor, a rig of
 * light bars sweeping overhead (their streaks run along the paint), rim lights in the team's colours,
 * haze and dust in the beams, the rain light blinking. A director cuts between five handmade shots
 * (each a camera move with its own lens), fading through black at every cut.
 *
 * Shots are in the car's frame: x to its left, y up, z towards the nose; the car's middle at the origin.
 */
const SHOTS = [
  // name, seconds, lens (fov), camera from -> to, look from -> to
  { s: 6.0, fov: 34, cam: [[3.0, 0.38, 7.0], [2.0, 0.5, 5.2]], look: [[0, 0.35, 1.2], [0, 0.42, 0.4]] },        // low at the nose, pushing in
  { s: 6.5, fov: 30, cam: [[5.6, 0.7, -3.6], [5.6, 0.8, 3.2]], look: [[0, 0.5, -1.6], [0, 0.5, 1.4]] },       // tracking along the side
  { s: 6.0, fov: 26, orbit: { r: 4.6, h: 6.6, a: [0.35, 1.15] }, look: [[0, 0, 0], [0, 0, 0.2]] },                // from above, turning
  { s: 6.0, fov: 32, cam: [[-0.9, 0.42, -4.3], [-1.7, 1.5, -5.7]], look: [[0, 0.75, -2.3], [0, 0.5, -0.2]] },     // behind the rear wing, rising
  { s: 6.0, fov: 30, cam: [[4.7, 1.5, 2.3], [4.0, 1.45, 1.75]], look: [[1.75, 1.3, 0.6], [1.75, 1.4, 0.6]] },  // the driver, waist up
  { s: 7.5, fov: 24, orbit: { r: 10, h: [1.4, 2.0], a: [0.5, 1.25] }, look: [[0.6, 0.7, 0.2], [0.6, 0.75, 0.2]] }, // the hero orbit: driver and car
];
/** Where the driver stands: by the car's left side, level with the cockpit, turned towards the hero shot. */
export const DRIVER_SPOT = { x: 1.75, z: 0.6, yaw: 0.95 };
const FADE = 0.4;

const ease = (t) => t * t * (3 - 2 * t);
const lerp3 = (a, b, t, out) => out.set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);

function glowTexture(inner = 'rgba(255,255,255,1)') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, inner); r.addColorStop(0.35, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** The studio's reflections: a dark room with long light strips overhead and the team colours low. */
function studioEnvironment(renderer, a, b) {
  const env = new Scene();
  env.add(new Mesh(new SphereGeometry(20, 24, 12), new MeshBasicMaterial({ color: 0x050507, side: BackSide })));
  for (let k = -3; k <= 3; k++) {
    const bar = new Mesh(new BoxGeometry(0.5, 0.1, 16), new MeshBasicMaterial({ color: new Color(1, 1, 1).multiplyScalar(3) }));
    bar.position.set(k * 2.2, 8, 0);
    env.add(bar);
  }
  for (const [x, c] of [[-14, a], [14, b]]) {
    const panel = new Mesh(new BoxGeometry(0.2, 3, 20), new MeshBasicMaterial({ color: new Color(c).multiplyScalar(1.3) }));
    panel.position.set(x, 1.5, 0);
    env.add(panel);
  }
  const pmrem = new PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.035).texture;
  pmrem.dispose();
  return tex;
}

/**
 * Builds the set into `group` around `car` (a Group standing on y = 0). Returns { update(dt, camera, w, h),
 * fade (0 clear .. 1 black), environment }.
 */
export function buildCinematic(group, car, { a, b }, renderer, driver = null) {
  // Centre the car on the origin.
  const box = new Box3().setFromObject(car), mid = box.getCenter(new Vector3()), size = box.getSize(new Vector3());
  car.position.x -= mid.x; car.position.z -= mid.z;
  group.add(car);
  if (driver) { driver.position.set(DRIVER_SPOT.x, 0, DRIVER_SPOT.z); driver.rotation.y = DRIVER_SPOT.yaw; group.add(driver); }
  const len = Math.max(size.x, size.z);

  // Glossy black floor, a pool of team colour under the car.
  const floor = new Mesh(new PlaneGeometry(120, 120).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: 0x040405, roughness: 0.5, metalness: 0.3, envMapIntensity: 0.35 }));
  floor.receiveShadow = true;
  group.add(floor);
  const pool = new Mesh(new PlaneGeometry(9, 6).rotateX(-Math.PI / 2), new MeshBasicMaterial({ map: glowTexture(), color: new Color(a).multiplyScalar(0.16), transparent: true, blending: AdditiveBlending, depthWrite: false }));
  pool.position.y = 0.01;
  group.add(pool);

  // The backdrop: black, with a faint band of the team colour at the horizon.
  const bc = document.createElement('canvas');
  bc.width = 4; bc.height = 256;
  const bg = bc.getContext('2d'), grad = bg.createLinearGradient(0, 0, 0, 256);
  const ca = new Color(a), tint = `rgb(${Math.round(ca.r * 38)},${Math.round(ca.g * 38)},${Math.round(ca.b * 38)})`;
  grad.addColorStop(0, '#020203'); grad.addColorStop(0.62, '#050507'); grad.addColorStop(0.8, tint); grad.addColorStop(0.86, '#040405'); grad.addColorStop(1, '#020203');
  bg.fillStyle = grad; bg.fillRect(0, 0, 4, 256);
  const backTex = new CanvasTexture(bc);
  backTex.colorSpace = SRGBColorSpace;
  const back = new Mesh(new CylinderGeometry(45, 45, 40, 48, 1, true), new MeshBasicMaterial({ map: backTex, side: BackSide, depthWrite: false }));
  back.position.y = 12;
  group.add(back);

  // The light rig: bars overhead (seen in the paint and on the floor) that drift along the car.
  const rig = new Group();
  const barMat = new MeshBasicMaterial({ color: new Color(1, 1, 1).multiplyScalar(1.6) });
  for (let k = 0; k < 9; k++) {
    const bar = new Mesh(new BoxGeometry(2.6, 0.05, 0.16), barMat);
    bar.position.set(0, 5.2, -8 + k * 2);
    rig.add(bar);
  }
  group.add(rig);

  // Lights: a soft key from above the nose, a sweeping spot, rims in the team's colours.
  const key = new SpotLight(0xfff4e8, 55, 30, 0.55, 0.9, 1.4);
  key.position.set(1.5, 7.5, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.target.position.set(0, 0, 0);
  const sweep = new SpotLight(0xffffff, 70, 22, 0.32, 0.7, 1.6);
  sweep.target.position.set(0, 0, 0);
  const rimA = new PointLight(new Color(a), 9, 16, 1.6), rimB = new PointLight(new Color(b), 7, 16, 1.6);
  rimA.position.set(-3.2, 2.4, -3.8); rimB.position.set(3.2, 2.2, -3.4);
  group.add(key, key.target, sweep, sweep.target, rimA, rimB);

  // The rain light at the back of the car.
  const rain = new Mesh(new BoxGeometry(0.12, 0.08, 0.03), new MeshBasicMaterial({ color: 0xff2020 }));
  rain.position.set(0, size.y * 0.42, -len / 2 + 0.25);
  const rainGlow = new Sprite(new SpriteMaterial({ map: glowTexture(), color: 0xff2a2a, blending: AdditiveBlending, depthWrite: false, transparent: true }));
  rainGlow.scale.setScalar(0.9);
  rainGlow.position.copy(rain.position);
  group.add(rain, rainGlow);

  // Haze in the beams and dust drifting through them.
  const haze = [];
  const glow = glowTexture('rgba(255,255,255,0.8)');
  for (let k = 0; k < 6; k++) {
    const sp = new Sprite(new SpriteMaterial({ map: glow, color: new Color(k % 2 ? a : 0xffffff).multiplyScalar(k % 2 ? 0.06 : 0.035), blending: AdditiveBlending, depthWrite: false, transparent: true }));
    sp.scale.setScalar(7 + k * 1.5);
    sp.position.set((k - 2.5) * 2.4, 2.2 + (k % 3) * 0.8, -3 + (k % 4) * 2);
    haze.push(sp);
    group.add(sp);
  }
  const N = 500, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 12; pos[i * 3 + 1] = Math.random() * 5; pos[i * 3 + 2] = (Math.random() - 0.5) * 14; }
  const dustGeo = new BufferGeometry();
  dustGeo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  const dust = new Points(dustGeo, new PointsMaterial({ color: 0xffffff, size: 0.035, map: glowTexture(), transparent: true, opacity: 0.5, blending: AdditiveBlending, depthWrite: false }));
  group.add(dust);

  const environment = studioEnvironment(renderer, a, b);
  const total = SHOTS.reduce((s, x) => s + x.s, 0);
  const P = new Vector3(), T = new Vector3();
  let time = 0;

  const self = {
    fade: 1,
    environment,
    /** Jump to a moment of the loop (dev screenshots). */
    seek(t) { time = t; },
    update(dt, camera, w, h) {
      time += dt;
      // Which shot, and how far through it.
      let t = time % total, k = 0;
      while (t > SHOTS[k].s) { t -= SHOTS[k].s; k++; }
      const shot = SHOTS[k], u = ease(t / shot.s);
      if (shot.orbit) {
        const o = shot.orbit, ang = o.a[0] + (o.a[1] - o.a[0]) * u, hh = Array.isArray(o.h) ? o.h[0] + (o.h[1] - o.h[0]) * u : o.h;
        P.set(Math.sin(ang) * o.r, hh, Math.cos(ang) * o.r);
      } else lerp3(shot.cam[0], shot.cam[1], u, P);
      lerp3(shot.look[0], shot.look[1], u, T);
      camera.position.copy(P);
      camera.lookAt(T);
      if (camera.fov !== shot.fov) { camera.fov = shot.fov; camera.updateProjectionMatrix(); }
      // Frame the car right of the menu panel.
      camera.setViewOffset(w, h, -w * 0.13, 0, w, h);
      self.fade = Math.max(0, 1 - Math.min(t, shot.s - t) / FADE);
      if (time < FADE) self.fade = Math.max(self.fade, 1 - time / FADE);

      // The set moves: light bars drift, the sweep runs along the car, haze breathes, dust rises.
      rig.position.z = ((time * 0.6) % 2);
      sweep.position.set(Math.sin(time * 0.4) * 1.5, 6, -6 + ((time * 1.6) % 12));
      sweep.target.position.set(0, 0, sweep.position.z * 0.6);
      haze.forEach((sp, i) => { sp.material.opacity = 0.75 + Math.sin(time * 0.5 + i) * 0.25; sp.position.x += Math.sin(time * 0.2 + i) * dt * 0.08; });
      const p = dustGeo.attributes.position;
      for (let i = 0; i < N; i++) { let y = p.getY(i) + dt * 0.06; if (y > 5) y = 0; p.setY(i, y); }
      p.needsUpdate = true;
      const on = Math.floor(time * 2.2) % 2 === 0;
      rain.material.color.setHex(on ? 0xff2020 : 0x300606);
      rainGlow.visible = on;
    },
  };
  return self;
}
