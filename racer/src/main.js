import {
  WebGLRenderer, Scene, PerspectiveCamera, ACESFilmicToneMapping, SRGBColorSpace, PCFShadowMap,
  Vector3, Quaternion, Vector2, WebGLRenderTarget, HalfFloatType, SpotLight, Object3D,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { PHYSICS_HZ, TRACK, PAINTS, CAR } from './config.js';
import { Vehicle } from './physics/vehicle.js';
import { ground, nearestTrackPose } from './world/trackShape.js';
import { buildTrack } from './world/trackMesh.js';
import { Environment } from './world/environment.js';
import { LamboVisual } from './car/lambo.js';
import { CameraRig, CAMERA_MODES } from './camera.js';
import { Input } from './input.js';
import { Hud } from './hud.js';
import { CarAudio } from './audio.js';
import { Skidmarks } from './fx/skidmarks.js';
import { Smoke } from './fx/smoke.js';
import { LapTimer } from './game/lapTimer.js';
import { loadSettings, saveSettings } from './game/settings.js';

const DT = 1 / PHYSICS_HZ;
const MAX_STEPS = +(new URLSearchParams(location.search).get('maxsteps') || 12);
const params = new URLSearchParams(location.search);

// ---------- Renderer & post ----------
const canvas = document.getElementById('game');
const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;

const scene = new Scene();
const camera = new PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 6000);

const rt = new WebGLRenderTarget(innerWidth, innerHeight, { type: HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(renderer.getPixelRatio());
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new Vector2(innerWidth, innerHeight), 0.42, 0.45, 2.2);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- World ----------
const env = new Environment(scene, renderer);
scene.add(buildTrack());

const settings = loadSettings();
if (params.has('paint')) settings.paint = +params.get('paint');
settings.paint = ((Math.floor(settings.paint) || 0) % PAINTS.length + PAINTS.length) % PAINTS.length;

const vehicle = new Vehicle(ground);
vehicle.assists = settings.assists;
vehicle.automatic = settings.automatic;
vehicle.awd = settings.awd;

const car = new LamboVisual(PAINTS[settings.paint].color, vehicle.modelOffset);
scene.add(car.root);

// Headlights: one shared spot (cheap) aimed down the road.
const headlight = new SpotLight(0xe8eeff, 60, 70, 0.42, 0.55, 1.6);
headlight.position.set(0, 0.05, 1.05);
const headTarget = new Object3D();
headTarget.position.set(0, -0.6, 14);
car.root.add(headlight, headTarget);
headlight.target = headTarget;

const skids = new Skidmarks(scene, 4);
const smoke = new Smoke(scene);
const laps = new LapTimer();
const rig = new CameraRig(camera, canvas);
const input = new Input();
const hud = new Hud();
const audio = new CarAudio();
audio.setMuted(settings.muted);
car.onPop = () => audio.pop();
if (params.has('cam')) rig.mode = Math.max(0, CAMERA_MODES.findIndex((m) => m.toLowerCase().startsWith(params.get('cam'))));
hud.setTelemetry(settings.telemetry || params.has('telemetry'));
for (const k of ['yaw', 'pitch', 'dist']) if (params.has(k)) rig.orbit[k] = +params.get(k);
if (params.has('yaw')) rig.orbit.idle = -1e9; // fixed framing for screenshots

// ---------- State ----------
const prevPos = new Vector3();
const prevQuat = new Quaternion();
const renderPos = new Vector3();
const renderQuat = new Quaternion();
const lastVel = new Vector3();
const accel = { lat: 0, long: 0 };
let accumulator = 0;
let paused = false;
let started = params.has('autostart');
let falling = false;
let fallTimer = 0;
let flippedTimer = 0;
let lastSafeTheta = -0.025;
const autopilot = params.has('autopilot');

function spawn(theta) {
  const pose = nearestTrackPose(Math.cos(theta), Math.sin(theta));
  vehicle.reset(new Vector3(pose.x, 0, pose.z), pose.yaw);
  prevPos.copy(vehicle.body.position);
  prevQuat.copy(vehicle.body.quaternion);
  laps.reset();
  falling = false;
  fallTimer = 0;
  flippedTimer = 0;
  for (const t of skids.trails) t.active = false;
  rig.cut();
}
spawn(lastSafeTheta);
if (started) hud.el.help.classList.add('hidden');

// ---------- Actions ----------
function persist() {
  saveSettings({
    ...settings, assists: vehicle.assists, automatic: vehicle.automatic, awd: vehicle.awd,
    telemetry: hud.showTelemetry, muted: audio.muted,
  });
}

input.onAction = (action) => {
  if (!started && action !== 'help') { begin(); return; }
  switch (action) {
    case 'camera': rig.next(); hud.toast(rig.modeName, 1.2); break;
    case 'reset': {
      const p = vehicle.body.position;
      const onTrack = ground.heightAt(p.x, p.z) !== null && p.y > -2;
      spawn(onTrack ? Math.atan2(p.z, p.x) : lastSafeTheta);
      break;
    }
    case 'paint':
      settings.paint = (settings.paint + 1) % PAINTS.length;
      car.setPaint(PAINTS[settings.paint].color);
      hud.toast(PAINTS[settings.paint].name, 1.6, 'paint');
      persist();
      break;
    case 'assists':
      vehicle.assists = !vehicle.assists;
      hud.toast(vehicle.assists ? 'Assists ON  (TC + ABS)' : 'Assists OFF — good luck', 1.6);
      persist();
      break;
    case 'gearbox':
      vehicle.automatic = !vehicle.automatic;
      hud.toast(vehicle.automatic ? 'Automatic gearbox' : 'Manual gearbox  (Q / E)', 1.6);
      persist();
      break;
    case 'drivetrain':
      vehicle.awd = !vehicle.awd;
      hud.toast(vehicle.awd ? 'All-wheel drive' : 'Rear-wheel drive', 1.6);
      persist();
      break;
    case 'telemetry': hud.setTelemetry(!hud.showTelemetry); persist(); break;
    case 'mute': audio.setMuted(!audio.muted); hud.toast(audio.muted ? 'Sound off' : 'Sound on', 1); persist(); break;
    case 'horn': audio.horn(true); break;
    case 'pause': setPaused(!paused); break;
    case 'help': hud.el.help.classList.toggle('hidden'); break;
    default: break;
  }
};
addEventListener('keyup', (e) => { if (e.code === 'KeyH') audio.horn(false); });

function begin() {
  started = true;
  hud.el.help.classList.add('hidden');
  audio.start();
}
addEventListener('keydown', () => { if (!started) begin(); else audio.start(); });
canvas.addEventListener('pointerdown', () => { if (!started) begin(); else audio.start(); });
hud.el.help.addEventListener('pointerdown', () => { if (!started) begin(); else hud.el.help.classList.add('hidden'); });

function setPaused(p) {
  paused = p;
  hud.el.pause.classList.toggle('hidden', !p);
  if (audio.ctx) (p ? audio.ctx.suspend() : audio.ctx.resume());
}
document.addEventListener('visibilitychange', () => { if (document.hidden && started) setPaused(true); });

// ---------- Simple driver for the ?autopilot showcase ----------
const _radial = new Vector3();
function autopilotControls() {
  const p = vehicle.body.position;
  const r = Math.hypot(p.x, p.z);
  _radial.set(p.x, 0, p.z).normalize();
  const radialVel = vehicle.body.velocity.dot(_radial);
  const steer = Math.max(-1, Math.min(1, (r - TRACK.centerRadius) * 0.08 + radialVel * 0.25 + 0.1));
  const kmh = vehicle.forwardSpeed * 3.6;
  return { throttle: Math.max(0, Math.min(1, (125 - kmh) * 0.08)), brake: 0, steer, handbrake: 0 };
}

// ---------- Per-frame effects ----------
function updateEffects(dt) {
  for (let i = 0; i < 4; i++) {
    const w = vehicle.wheels[i];
    if (!w.inContact) { skids.add(i, w.contactPoint, w.lateral, 0, 0, 0); continue; }
    const sliding = Math.max(0, w.slip - 1.0) * 1.4;
    const locked = Math.abs(w.slipRatio) > 0.4 ? 0.8 : 0;
    const intensity = Math.min(1, Math.max(sliding, locked)) * Math.min(1, w.groundSpeed / 3);
    const width = w.isFront ? CAR.tireWidth.front : CAR.tireWidth.rear;
    skids.add(i, w.contactPoint, w.lateral, width * 0.9, intensity, ground.heightAt(w.contactPoint.x, w.contactPoint.z) ?? 0);

    const slipSpeed = Math.hypot(w.omega * w.radius - w.vLong, w.vLat);
    if (slipSpeed > 4.5 && w.slip > 1.3) smoke.emit(i, w.contactPoint, vehicle.body.velocity, Math.min(70, slipSpeed * 5), dt);
  }
  skids.flush();
  smoke.update(dt, renderer.domElement.clientHeight, camera.fov);
}

function updateSafety(dt) {
  const b = vehicle.body;
  const p = b.position;
  const upY = new Vector3(0, 1, 0).applyQuaternion(b.quaternion).y;

  if (vehicle.wheelsInContact === 4 && upY > 0.9) lastSafeTheta = Math.atan2(p.z, p.x);

  if (!falling && p.y < -2.5 && vehicle.wheelsInContact === 0) {
    falling = true;
    hud.toast(['LOST IN THE VOID', 'YEET', 'GOODBYE, TINY LAMBO', 'THE VOID SAYS HI'][Math.floor(Math.random() * 4)], 2.2, 'void');
  }
  if (falling) {
    fallTimer += dt;
    if (p.y < TRACK.voidY || fallTimer > 3.5) spawn(lastSafeTheta);
  }

  // Stuck on the roof or side: put it back on its wheels.
  if (!falling && upY < 0.35 && vehicle.speed < 1.5) {
    flippedTimer += dt;
    if (flippedTimer > 1.8) {
      hud.toast('Flipped! Back on your wheels', 1.6);
      spawn(Math.atan2(p.z, p.x));
    }
  } else {
    flippedTimer = 0;
  }
}

// ---------- Loop ----------
let last = performance.now();
let frames = 0;
const _fwd = new Vector3();
const _left = new Vector3();
function frame(now) {
  requestAnimationFrame(frame);
  // rAF timestamps can predate `last` on the first frame; never step backwards.
  const dt = Math.min(MAX_STEPS * DT, Math.max(0, (now - last) / 1000));
  last = now;

  if (!paused) {
    const controls = autopilot ? autopilotControls() : input.update(dt);
    if (!started && !autopilot) Object.assign(controls, { throttle: 0, brake: 0, steer: 0, handbrake: 1 });
    accumulator += dt;
    let steps = 0;
    while (accumulator >= DT && steps < MAX_STEPS) {
      prevPos.copy(vehicle.body.position);
      prevQuat.copy(vehicle.body.quaternion);
      vehicle.step(DT, controls);
      controls.shiftUp = controls.shiftDown = false;
      accumulator -= DT;
      steps++;
    }
    if (steps === MAX_STEPS) accumulator = 0;

    // Measured acceleration in the car frame for the g-meter.
    const b = vehicle.body;
    const a = b.velocity.clone().sub(lastVel).divideScalar(Math.max(dt, 1e-4));
    lastVel.copy(b.velocity);
    _fwd.set(0, 0, 1).applyQuaternion(b.quaternion);
    _left.set(1, 0, 0).applyQuaternion(b.quaternion);
    accel.long = a.dot(_fwd);
    accel.lat = a.dot(_left);

    const event = laps.update(dt, b.position.x, b.position.z);
    if (event && event.type === 'lap') hud.toast(event.isBest ? `NEW BEST  ${event.time.toFixed(3)}` : `LAP  ${event.time.toFixed(3)}`, 2.5, event.isBest ? 'best' : '');

    updateSafety(dt);
    updateEffects(dt);
    audio.update(vehicle);
  }

  // Interpolate between physics states for smooth motion at any refresh rate.
  const alpha = accumulator / DT;
  renderPos.lerpVectors(prevPos, vehicle.body.position, alpha);
  renderQuat.slerpQuaternions(prevQuat, vehicle.body.quaternion, alpha);
  car.root.position.copy(renderPos);
  car.root.quaternion.copy(renderQuat);
  car.update(vehicle, paused ? 0 : dt);

  const kerbShake = vehicle.wheels.reduce((s, w) => s + (w.inContact ? Math.abs(w.compressionVelocity || 0) : 0), 0);
  rig.shake = Math.min(0.03, kerbShake * 0.004 + vehicle.speed * 0.00008);
  rig.update(dt, renderPos, renderQuat, vehicle.body.velocity, falling);
  env.update(renderPos, camera, dt);
  hud.update(dt, vehicle, laps, rig.modeName, accel);

  if (params.has('nopost')) renderer.render(scene, camera);
  else composer.render(dt);
  frames++;
}
requestAnimationFrame(frame);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// Expose for debugging in the console.
window.__racer = { vehicle, car, rig, scene, renderer, settings, smoke, skids, get frames() { return frames; }, get paused() { return paused; }, get started() { return started; } };
