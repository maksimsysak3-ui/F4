import {
  WebGLRenderer, Scene, PerspectiveCamera, ACESFilmicToneMapping, SRGBColorSpace, PCFShadowMap,
  Vector3, Quaternion, SpotLight, Object3D,
} from 'three';
import { createPost } from './fx/post.js';

import { PHYSICS_HZ } from './config.js';
import { CARS } from './cars/index.js';
import { Vehicle } from './physics/vehicle.js';
import { TRACKS } from './tracks/index.js';
import { Environment } from './world/environment.js';
import { CarVisual } from './car/carVisual.js';
import { CameraRig, CAMERA_MODES } from './camera.js';
import { CockpitView } from './cockpitView.js';
import { Menu } from './menu.js';
import { Input } from './input.js';
import { Hud } from './hud.js';
import { CarAudio } from './audio.js';
import { Skidmarks } from './fx/skidmarks.js';
import { Smoke } from './fx/smoke.js';
import { Rain, setWetSurfaces } from './fx/weather.js';
import { LapTimer } from './game/lapTimer.js';
import { topTimes, submitLap, bestSectors, submitSectors, bestTrace, saveTrace } from './game/leaderboard.js';
import { loadSettings, saveSettings } from './game/settings.js';

const DT = 1 / PHYSICS_HZ;
const MAX_STEPS = +(new URLSearchParams(location.search).get('maxsteps') || 12);
const params = new URLSearchParams(location.search);

// ---------- Renderer & post ----------
const canvas = document.getElementById('game');
const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
// Full HiDPI is 4x the pixels for the post chain; 1.5 looks nearly as sharp. The governor below
// lowers it further on slow GPUs.
const MAX_PIXEL_RATIO = Math.min(devicePixelRatio, 1.5);
renderer.setPixelRatio(MAX_PIXEL_RATIO);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;

const scene = new Scene();
const camera = new PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 6000);

const post = createPost(renderer, scene, camera);

// ---------- World ----------
const env = new Environment(scene, renderer);

const settings = loadSettings();
if (params.has('lowfx')) settings.quality = 'low';
if (params.has('hifx')) settings.quality = 'high';
post.setQuality(settings.quality ?? 'high');
const wrap = (i, n) => (((Math.floor(i) || 0) % n) + n) % n;
if (params.has('track')) settings.track = params.get('track');
let trackIndex = Math.max(0, TRACKS.findIndex((t) => t.id === settings.track));
let track = TRACKS[trackIndex];
let trackScene = null;
if (params.has('car')) settings.car = params.get('car');
let carIndex = Math.max(0, CARS.findIndex((c) => c.id === settings.car));

// Headlights: one shared spot (cheap) aimed down the road; re-parented per car.
const headlight = new SpotLight(0xe8eeff, 60, 70, 0.42, 0.55, 1.6);
const headTarget = new Object3D();
headlight.target = headTarget;

let spec;
let vehicle;
let car;
const lapTimers = new Map(); // best laps are per car

function paintIndex() {
  const i = params.has('paint') ? +params.get('paint') : settings.paints[spec.id];
  return wrap(i, spec.paints.length);
}

/** Build (or swap to) a car: new physics body + visual, same settings. */
function selectCar(index) {
  carIndex = wrap(index, CARS.length);
  spec = CARS[carIndex];
  const prev = vehicle;
  vehicle = new Vehicle(track.ground, spec);
  vehicle.assists = prev ? prev.assists : settings.assists;
  vehicle.wetness = settings.rain ? 1 : 0;
  vehicle.automatic = prev ? prev.automatic : settings.automatic;
  vehicle.awd = spec.defaults.awd;
  if (car) { scene.remove(car.root); car.dispose(); }
  car = new CarVisual(spec, spec.paints[paintIndex()], vehicle.modelOffset);
  car.onPop = () => audio.pop();
  headlight.position.copy(car.headlightPosition);
  headTarget.position.copy(car.headlightPosition).add(new Vector3(0, -0.6, 14));
  car.root.add(headlight, headTarget);
  headlight.visible = spec.lights !== false; // open-wheelers don't carry headlights
  scene.add(car.root);
  input.setSteering(spec.steering);
  audio.setProfile(spec.audio);
  hud.setBadge(spec.badge);
  useLapTimer();
  settings.car = spec.id;
}

/** Best laps are per track and per car. */
function useLapTimer() {
  const key = `${track.id}:${spec.id}`;
  if (!lapTimers.has(key)) lapTimers.set(key, new LapTimer(track.length, bestTrace(track.id, spec.id)));
  laps = lapTimers.get(key);
  hud.trackSectors = bestSectors(track.id);
}

/** Build (or swap to) a track: scene, mood, physics ground, minimap. */
async function selectTrack(index) {
  trackIndex = wrap(index, TRACKS.length);
  track = TRACKS[trackIndex];
  settings.track = track.id;
  hud.toast(`Loading ${track.name}…`, 30);
  if (trackScene) {
    scene.remove(trackScene.group);
    trackScene.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach((m) => { m.map?.dispose(); m.dispose(); });
    });
  }
  trackScene = await track.build({ renderer, scene });
  scene.add(trackScene.group);
  env.setMood(track.mood);
  applyWeather();
  if (vehicle) vehicle.ground = track.ground;
  rig.wallProbe = track.ground.wallContact || null;
  hud.setMinimap(track.minimap());
  hud.toast(track.name.toUpperCase(), 2.2, 'paint');
  skids.clear();
  smoke.clear();
  spray.clear();
}

/** Dry or rain: sky and light, glossy dark road, falling rain, wet grip, rain on the roof. */
function applyWeather() {
  env.setRain(settings.rain);
  if (trackScene) setWetSurfaces(trackScene.group, settings.rain, track.mood === 'night' || track.mood === 'void' ? 0.25 : 0.9);
  rain.active = settings.rain;
  rain.setTint(track.mood === 'night');
  if (vehicle) vehicle.wetness = settings.rain ? 1 : 0;
  audio.setRain(settings.rain);
  hud.setWeather(settings.rain);
  menu?.setWeather(settings.rain);
}

const skids = new Skidmarks(scene, 4);
const smoke = new Smoke(scene);
// Rain spray: pale, short-lived, low and left behind the car.
const spray = new Smoke(scene, { color: [0.78, 0.8, 0.84], life: [0.45, 0.4], size: [0.5, 2.6], alpha: 0.22, lift: -0.4, rise: [0.4, 0.8], carry: 0.45 });
const rain = new Rain(scene);
if (params.has('rain')) settings.rain = params.get('rain') !== '0';
let menu = null;
let laps;
const rig = new CameraRig(camera, canvas);
const cockpit = new CockpitView(camera);
scene.add(camera); // the cockpit rig hangs off the camera
const input = new Input();
const hud = new Hud();
const audio = new CarAudio();
audio.setMuted(settings.muted);
await selectTrack(trackIndex);
selectCar(carIndex);
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
let lastSafeS = track.spawn.s;
const autopilot = params.has('autopilot');

function spawn(s, lateral = 0) {
  const pose = track.poseAt(s, lateral);
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
spawn(track.spawn.s, track.spawn.lateral);

// ---------- Start menu: pick a track and a car on live cards, then race ----------
menu = new Menu({
  cars: CARS, tracks: TRACKS, carIndex, trackIndex,
  onRace: async (ti, ci) => {
    if (ti !== trackIndex) {
      await selectTrack(ti);
      lastSafeS = track.spawn.s;
    }
    if (ci !== carIndex || ti !== trackIndex) selectCar(ci);
    useLapTimer();
    spawn(track.spawn.s, track.spawn.lateral);
    persist();
    begin();
  },
  onWeather: () => toggleWeather(),
});
menu.setWeather(settings.rain);

function toggleWeather() {
  settings.rain = !settings.rain;
  applyWeather();
  if (!menu.visible) hud.toast(settings.rain ? 'Rain · wet track' : 'Dry track', 1.4);
  persist();
}
if (!started) menu.show();

// ---------- Actions ----------
function persist() {
  saveSettings({
    ...settings, track: track.id, assists: vehicle.assists, automatic: vehicle.automatic,
    telemetry: hud.showTelemetry, muted: audio.muted,
  });
}

input.onAction = (action) => {
  if (menu.visible) { if (action === 'race') menu.race(); else if (action === 'weather') toggleWeather(); else if (action === 'help') hud.el.help.classList.toggle('hidden'); return; }
  switch (action) {
    case 'menu': started = false; menu.show(trackIndex, carIndex); break;
    case 'camera': rig.next(); hud.toast(rig.modeName, 1.2); break;
    case 'leaderboard': hud.toggleBoard(track.name, topTimes(track.id)); break;
    case 'reset': spawn(currentS()); break;
    case 'paint': {
      const i = wrap(paintIndex() + 1, spec.paints.length);
      settings.paints = { ...settings.paints, [spec.id]: i };
      params.delete('paint');
      car.setPaint(spec.paints[i]);
      hud.toast(spec.paints[i].name, 1.6, 'paint');
      persist();
      break;
    }
    case 'car': {
      const s = currentS();
      selectCar(carIndex + 1);
      spawn(s);
      hud.toast(spec.name.toUpperCase(), 1.8, 'paint');
      persist();
      break;
    }
    case 'track':
      selectTrack(trackIndex + 1).then(() => {
        lastSafeS = track.spawn.s;
        useLapTimer();
        spawn(track.spawn.s, track.spawn.lateral);
        persist();
      });
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
      if (vehicle.fwd) { hud.toast('Front-wheel drive only', 1.4); break; }
      vehicle.awd = !vehicle.awd;
      hud.toast(vehicle.awd ? (spec.drivetrain.toggle4x4 ? '4x4 engaged' : 'All-wheel drive') : 'Rear-wheel drive', 1.6);
      persist();
      break;
    case 'telemetry': hud.setTelemetry(!hud.showTelemetry); persist(); break;
    case 'mute': audio.setMuted(!audio.muted); hud.toast(audio.muted ? 'Sound off' : 'Sound on', 1); persist(); break;
    case 'horn': audio.horn(true); break;
    case 'pause': setPaused(!paused); break;
    case 'weather': toggleWeather(); break;
    case 'quality':
      settings.quality = post.quality === 'high' ? 'low' : 'high';
      post.setQuality(settings.quality);
      hud.toast(settings.quality === 'high' ? 'Graphics: high (ambient occlusion)' : 'Graphics: performance', 1.6);
      persist();
      break;
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
addEventListener('keydown', () => { if (started) audio.start(); });
canvas.addEventListener('pointerdown', () => { if (started) audio.start(); });
hud.el.help.addEventListener('pointerdown', () => hud.el.help.classList.add('hidden'));

function setPaused(p) {
  paused = p;
  hud.el.pause.classList.toggle('hidden', !p);
  if (audio.ctx) (p ? audio.ctx.suspend() : audio.ctx.resume());
}
document.addEventListener('visibilitychange', () => { if (document.hidden && started) setPaused(true); });

/** Where the car is along the lap (falls back to the last safe spot when off the map or falling). */
function currentS() {
  const p = vehicle.body.position;
  const s = !falling && p.y > -2 ? track.progress(p.x, p.z) : null;
  return s ?? lastSafeS;
}

// ---------- Simple driver for the ?autopilot showcase (pure pursuit, any track) ----------
function autopilotControls() {
  const p = vehicle.body.position;
  const s = track.progress(p.x, p.z) ?? 0;
  const v = Math.max(5, vehicle.speed);
  const aim = track.poseAt(s + 6 + v * 0.35);
  const fwd = vehicle.forward;
  const dx = aim.x - p.x, dz = aim.z - p.z;
  // Angle to the aim point, + = left. Input steer + = right.
  const ang = Math.atan2(fwd.z * dx - fwd.x * dz, fwd.x * dx + fwd.z * dz);
  // Slow for what's coming: estimate curvature from heading change over the next stretch.
  const ahead = track.poseAt(s + 25 + v * 1.2);
  let turn = ahead.yaw - track.poseAt(s).yaw;
  while (turn > Math.PI) turn -= Math.PI * 2;
  while (turn < -Math.PI) turn += Math.PI * 2;
  const target = Math.min(170, 40 + 700 / (1 + Math.abs(turn) * 22)) / 3.6;
  const err = target - vehicle.forwardSpeed;
  return {
    steer: Math.max(-1, Math.min(1, -ang * 3.2)),
    throttle: err > 0 ? Math.min(1, err * 0.4) : 0,
    brake: err < -2 ? Math.min(1, -err * 0.12) : 0,
    handbrake: 0,
  };
}

// ---------- Per-frame effects ----------
function updateEffects(dt) {
  for (let i = 0; i < 4; i++) {
    const w = vehicle.wheels[i];
    if (!w.inContact) { skids.add(i, w.contactPoint, w.lateral, 0, 0, 0); continue; }
    if (vehicle.wetness > 0 && w.groundSpeed > 6) spray.emit(i, w.contactPoint, vehicle.body.velocity, Math.min(60, w.groundSpeed * 1.3) * (w.isFront ? 0.4 : 1), dt);
    const sliding = Math.max(0, w.slip - 1.0) * 1.4;
    const locked = Math.abs(w.slipRatio) > 0.4 ? 0.8 : 0;
    const intensity = Math.min(1, Math.max(sliding, locked)) * Math.min(1, w.groundSpeed / 3);
    const width = w.isFront ? spec.tireWidth.front : spec.tireWidth.rear;
    skids.add(i, w.contactPoint, w.lateral, width * 0.9, intensity, track.ground.heightAt(w.contactPoint.x, w.contactPoint.z) ?? 0);

    const slipSpeed = Math.hypot(w.omega * w.radius - w.vLong, w.vLat);
    if (slipSpeed > 4.5 && w.slip > 1.3) smoke.emit(i, w.contactPoint, vehicle.body.velocity, Math.min(70, slipSpeed * 5), dt);
  }
  skids.flush();
  smoke.update(dt, renderer.domElement.clientHeight, camera.fov);
  spray.update(dt, renderer.domElement.clientHeight, camera.fov);
}

function updateSafety(dt) {
  const b = vehicle.body;
  const p = b.position;
  const upY = new Vector3(0, 1, 0).applyQuaternion(b.quaternion).y;

  if (vehicle.wheelsInContact === 4 && upY > 0.9) lastSafeS = track.progress(p.x, p.z) ?? lastSafeS;

  if (track.voidY !== null && !falling && p.y < -2.5 && vehicle.wheelsInContact === 0) {
    falling = true;
    hud.toast(['LOST IN THE VOID', 'YEET', 'GOODBYE, TINY LAMBO', 'THE VOID SAYS HI'][Math.floor(Math.random() * 4)], 2.2, 'void');
  }
  if (falling) {
    fallTimer += dt;
    if (p.y < track.voidY || fallTimer > 3.5) spawn(lastSafeS);
  }

  // Stuck on the roof or side: put it back on its wheels.
  if (!falling && upY < 0.35 && vehicle.speed < 1.5) {
    flippedTimer += dt;
    if (flippedTimer > 1.8) {
      hud.toast('Flipped! Back on your wheels', 1.6);
      spawn(currentS());
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
let pitLimiterOn = false;
/**
 * Performance governor: watches the smoothed frame time while driving and trades
 * resolution for frame rate (down to 0.65x), then drops ambient occlusion if that
 * isn't enough (unless the player picked a quality with key 5). Raises the
 * resolution again after a long stretch of fast frames.
 */
const perf = { ema: 1 / 60, cooldown: 3, fastFor: 0, ratio: MAX_PIXEL_RATIO };
const MIN_PIXEL_RATIO = Math.min(MAX_PIXEL_RATIO, 0.65);
function watchPerformance(dt) {
  if (!started || paused || menu?.visible || dt <= 0 || dt > 0.25) return;
  perf.ema += (dt - perf.ema) * 0.05;
  perf.cooldown -= dt;
  if (perf.cooldown > 0) return;
  if (perf.ema > 1 / 50) {
    perf.fastFor = 0;
    perf.cooldown = 1.5;
    if (perf.ratio > MIN_PIXEL_RATIO + 0.01) {
      perf.ratio = Math.max(MIN_PIXEL_RATIO, perf.ratio - 0.15);
      post.setPixelRatio(perf.ratio);
    } else if (!settings.quality && post.quality === 'high') {
      post.setQuality('low');
      hud.toast('Graphics: performance mode (key 5 to change)', 2.5);
    }
  } else if (perf.ema < 1 / 58 && perf.ratio < MAX_PIXEL_RATIO) {
    perf.fastFor += dt;
    if (perf.fastFor > 10) {
      perf.fastFor = 0;
      perf.ratio = Math.min(MAX_PIXEL_RATIO, perf.ratio + 0.1);
      post.setPixelRatio(perf.ratio);
      perf.cooldown = 2;
    }
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  // rAF timestamps can predate `last` on the first frame; never step backwards.
  const dt = Math.min(MAX_STEPS * DT, Math.max(0, (now - last) / 1000));
  last = now;

  if (!paused) {
    input.speed = vehicle.speed;
    const controls = { ...(autopilot ? autopilotControls() : input.update(dt)) };
    if (!started && !autopilot) Object.assign(controls, { throttle: 0, brake: 0, steer: 0, handbrake: 1 });
    // Pit lane speed limiter: cuts throttle and eases the brakes down to the limit.
    const limit = track.pitLimit?.(vehicle.body.position.x, vehicle.body.position.z) ?? null;
    if ((limit !== null) !== pitLimiterOn) {
      pitLimiterOn = limit !== null;
      hud.toast(pitLimiterOn ? `PIT LIMITER  ${Math.round(limit * 3.6)} KM/H` : 'LIMITER OFF', 1.4);
    }
    if (limit !== null && vehicle.forwardSpeed > limit - 0.3) {
      controls.throttle = 0;
      controls.brake = Math.max(controls.brake, Math.min(0.6, (vehicle.forwardSpeed - limit) * 0.12));
    }
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

    const event = laps.update(dt, track.progress(b.position.x, b.position.z));
    if (event && event.type === 'lap') {
      // Records: sectors and top-10 per track, best-lap trace per car (for the delta).
      const rank = submitLap(track.id, { time: event.time, car: spec.id, carName: spec.name });
      hud.trackSectors = submitSectors(track.id, event.sectors);
      if (event.isBest) saveTrace(track.id, spec.id, event.trace);
      const record = rank === 1 ? 'TRACK RECORD' : event.isBest ? 'PERSONAL BEST' : 'LAP';
      hud.toast(`${record}  ${event.time.toFixed(3)}${rank ? `  · P${rank}` : ''}`, 2.8, event.isBest ? 'best' : '');
      hud.showBoard(track.name, topTimes(track.id), rank, 5);
    }

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
  // Cockpit view: eyes in the driver's helmet, which (with the car's own wheel) is hidden.
  const inCockpit = rig.modeName === 'Cockpit' && !falling;
  car.head.getWorldPosition(rig.cockpitPos);
  // The tiny car's own shell would wall in the camera: the cockpit rig draws the car instead.
  for (const c of car.root.children) if (!c.isLight && c !== headTarget) c.visible = !inCockpit;

  const kerbShake = vehicle.wheels.reduce((s, w) => s + (w.inContact ? Math.abs(w.compressionVelocity || 0) : 0), 0);
  rig.shake = Math.min(0.03, kerbShake * 0.004 + vehicle.speed * 0.00008);
  rig.update(dt, renderPos, renderQuat, vehicle.body.velocity, falling);
  camera.updateMatrixWorld();
  cockpit.setPaint(car.paintColor ?? 0xffc21a);
  cockpit.setStyle(spec.cockpit ?? 'closed');
  cockpit.update(vehicle, paused ? 0 : dt, inCockpit);
  if (window.__freeCam) { const [p, t] = window.__freeCam; camera.position.set(...p); camera.lookAt(...t); } // dev screenshots
  env.update(renderPos, camera, dt);
  rain.update(paused ? 0 : dt, camera, vehicle.body.velocity);
  trackScene.update?.(dt, camera, renderPos);
  menu.update(dt);
  hud.update(dt, vehicle, laps, rig.modeName, accel);
  hud.updateMinimap(renderPos, vehicle.forward);

  if (params.has('nopost')) renderer.render(scene, camera);
  else post.render(dt);
  frames++;
  watchPerformance(dt);
}
requestAnimationFrame(frame);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  post.setSize(innerWidth, innerHeight);
});

// Expose for debugging in the console.
window.__racer = { get vehicle() { return vehicle; }, get car() { return car; }, get track() { return track; }, rig, scene, renderer, settings, smoke, skids, get frames() { return frames; }, get paused() { return paused; }, get started() { return started; } };
