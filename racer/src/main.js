import { NightLights } from './world/nightLights.js';
import {
  WebGLRenderer, Scene, PerspectiveCamera, ACESFilmicToneMapping, SRGBColorSpace, PCFShadowMap, PCFSoftShadowMap,
  Vector3, Quaternion, SpotLight, Object3D,
} from 'three';
import { createPost } from './fx/post.js';

import { PHYSICS_HZ } from './config.js';
import { CARS } from './cars/index.js';
import { Vehicle } from './physics/vehicle.js';
import { TRACKS, PACKS } from './tracks/index.js';
import { Environment } from './world/environment.js';
import { CarVisual } from './car/carVisual.js';
import { CameraRig, CAMERA_MODES } from './camera.js';
import { CockpitView } from './cockpitView.js';
import { Menu } from './menu.js';
import { Frontend } from './front/frontend.js';
import { Input } from './input.js';
import { Hud } from './hud.js';
import { CarAudio } from './audio.js';
import { Skidmarks } from './fx/skidmarks.js';
import { Smoke } from './fx/smoke.js';
import { Rain, setWetSurfaces } from './fx/weather.js';
import { createPuddles } from './fx/puddles.js';
import { createRacingLine } from './fx/racingLine.js';
import { CrashFx } from './fx/crash.js';
import { LapTimer, formatTime } from './game/lapTimer.js';
import { topTimes, submitLap, bestSectors, submitSectors, bestTrace, saveTrace, resetTrack } from './game/leaderboard.js';
import { loadSettings, saveSettings } from './game/settings.js';
import { Weather, CLIMATE, STAGES } from './game/forecast.js';
import { WeekendRun } from './game/weekendRun.js';
import { Engineer } from './engineer.js';
import { whereIs } from './engineerBrain.js';
import { impact as damageImpact } from './physics/damage.js';
import { raceHud } from './raceHud.js';
import { TyreSet } from './game/tyres.js';
let runTyres = null;   // the set on the car outside races (the PHYSICS tab's wear)
import { validate as rdValidate, playerCarFactors } from './game/rd.js';
import { forecast } from './game/forecast.js';
import { TEAMS } from './front/teams.js';

const DT = 1 / PHYSICS_HZ;
const MAX_STEPS = +(new URLSearchParams(location.search).get('maxsteps') || 12);
const params = new URLSearchParams(location.search);

// ---------- Renderer & post ----------
const canvas = document.getElementById('game');
const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
// Full HiDPI is 4x the pixels for the post chain; 1.5 looks nearly as sharp. The governor below
// lowers it further on slow GPUs.
const MAX_PIXEL_RATIO = Math.min(devicePixelRatio, 2);
renderer.setPixelRatio(MAX_PIXEL_RATIO);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;

const scene = new Scene();
const camera = new PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 4000); // the haze hides anything further

const post = createPost(renderer, scene, camera);

// ---------- World ----------
const env = new Environment(scene, renderer);
let nightLights = null; // floodlight pools that follow the camera on floodlit night circuits

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
/** Clear the current track's lap records (top 10, sectors, every car's best lap) and start fresh. */
function resetTrackLaps() {
  resetTrack(track.id);
  for (const k of [...lapTimers.keys()]) if (k.startsWith(`${track.id}:`)) lapTimers.delete(k);
  hud.trackSectors = [null, null, null];
  useLapTimer();
  hud.toast('Lap times reset for this track', 2);
}

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
  vehicle.assistLevel = prev ? prev.assistLevel : settings.assistLevel ?? (settings.assists === false ? 0 : 1);
  vehicle.wetness = settings.rain ? 1 : 0;
  vehicle.puddleAt = settings.rain && puddles ? puddles.at : null;
  vehicle.automatic = prev ? prev.automatic : settings.automatic;
  vehicle.awd = spec.defaults.awd;
  if (car) { scene.remove(car.root); car.dispose(); }
  car = new CarVisual(spec, spec.paints[paintIndex()], vehicle.modelOffset);
  car.onPop = () => audio.pop();
  // The T-cam mounts on the helmet's position in the car's own frame (the root sits at the origin here).
  car.root.updateMatrixWorld(true);
  rig.tcam = car.head ? car.head.getWorldPosition(new Vector3()).setY(car.head.getWorldPosition(new Vector3()).y - ((spec.visual.headY ?? 0.92) - 0.92) * spec.proportions.scale) : null; // mounted where the helmet top used to be
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

let weekendRef = null; // the WeekendRun once it exists (the tower is drawn before it's made)
/** Best laps are per track and per car. */
function useLapTimer() {
  const key = `${track.id}:${spec.id}`;
  if (!lapTimers.has(key)) lapTimers.set(key, new LapTimer(track.length, bestTrace(track.id, spec.id)));
  laps = lapTimers.get(key);
  hud.trackSectors = bestSectors(track.id);
  sessionBest = null;
  hud.setLap(1);
  refreshTower();
}

/** Who's driving, for the timing tower and the map: the paint's (team's) name and colour. */
function driverTag() {
  const paint = spec.paints[paintIndex()] ?? {}, hex = '#' + (car?.paintColor ?? paint.color ?? 0xffc21a).toString(16).padStart(6, '0');
  return { name: 'You', team: paint.name ?? spec.name, colour: hex };
}
let sessionBest = null;
/** The time trial tower: personal best, the baseline (the best lap here that isn't yours) and the last lap. */
function refreshTower() {
  if (weekendRef?.active && weekendRef.session) return; // a weekend session draws its own tower
  const me = driverTag();
  hud.mapColour = me.colour;
  const pb = laps?.best ?? null;
  const baseline = topTimes(track.id).find((e) => pb == null || Math.abs(e.time - pb) > 1e-6) ?? null;
  hud.setTimeTrial({ pb, baseline, last: laps?.last ?? null, colour: me.colour });
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
  puddles = null;
  racingLine = null;
  trackScene = await track.build({ renderer, scene });
  scene.add(trackScene.group);
  env.setMood(track.mood);
  nightLights?.dispose(scene);
  nightLights = track.floodlit ? new NightLights(scene, track.layout, track.floodlit) : null;
  resetSky();
  applyWeather();
  if (vehicle) vehicle.ground = track.ground;
  rig.wallProbe = track.ground.wallContact || null;
  hud.setMinimap(track.minimap());
  hud.toast(track.name.toUpperCase(), 2.2, 'paint');
  skids.clear();
  smoke.clear();
  floorSparks.clear(); dirt.clear(); rubber.clear();
  spray.clear();
  droplets.clear();
  crash?.clear();
}

/*
 * The weather as it is right now (from `weather`, the live model): cloud cover and gloom in the sky
 * and light, rain falling as hard as it's raining, and the track as wet as it has become (the road's
 * sheen, puddles, the tyres' grip). Cheap enough to run every frame: the road surfaces are only
 * re-tinted when the wetness has moved on a little.
 */
let weather = null;
const wx = { surf: -1, stage: -1, raining: null };
function applyWeather() {
  if (!weather || !track) return;
  const w = weather, wetness = w.wetness, raining = w.rain > 0.03, night = track.mood === 'night' || track.mood === 'void';
  env.rain = raining;
  env.setWetness(w.gloom);
  env.setCloud(w.cloud);
  env.apply();
  if (trackScene && Math.abs(wetness - wx.surf) > 0.04) { setWetSurfaces(trackScene.group, wetness, night ? 0.25 : 0.9); wx.surf = wetness; }
  rain.active = raining;
  rain.setIntensity(w.rain);
  // Standing water: built once per track, shown when it's properly wet, and felt by the tyres.
  if (wetness > 0.5 && !puddles && track.layout?.nearest && track.layout.k) {
    try { puddles = createPuddles(track.layout, 7); trackScene.group.add(puddles.mesh); } catch (e) { console.warn('puddles', e); puddles = null; }
  }
  if (puddles) puddles.mesh.visible = wetness > 0.5;
  if (vehicle) { vehicle.wetness = wetness; vehicle.puddleAt = wetness > 0.5 && puddles ? puddles.at : null; }
  if (raining !== wx.raining) { wx.raining = raining; audio.setRain(raining); }
  hud.setWeather(wetness > 0.25);
  settings.rain = wetness > 0.5;
  // Tell the driver when the weather turns (not at the start).
  const k = w.stage;
  if (k !== wx.stage) { if (wx.stage >= 0 && started) hud.toast(k > wx.stage ? (k >= 5 ? `${STAGES[k].name}${k > 5 ? ' — track getting wet' : ''}` : STAGES[k].name) : (k >= 4 ? `${STAGES[k].name} — easing` : STAGES[k].name), 2); wx.stage = k; }
}

const skids = new Skidmarks(scene, 4);
const smoke = new Smoke(scene);
// Floor sparks (titanium skid blocks scraping at speed) and dust thrown up off grass and gravel.
const floorSparks = new Smoke(scene, { color: [1.0, 0.62, 0.22], life: [0.28, 0.3], size: [0.09, 0.15], alpha: 1, lift: -9, rise: [0.2, 1.6], carry: 0.12, additive: true, max: 1600 });
const dirt = new Smoke(scene, { color: [0.5, 0.42, 0.3], life: [0.7, 0.9], size: [0.5, 2.2], alpha: 0.38, rise: [0.4, 0.9], carry: 0.18 });
const rubber = new Smoke(scene, { color: [0.16, 0.16, 0.17], life: [0.35, 0.3], size: [0.04, 0.06], alpha: 0.9, lift: -9, rise: [0.6, 1.4], carry: 0.5 });
// Rain spray: a rooster tail of mist hanging behind the car, and droplets flung off the tyres that arc and fall.
const spray = new Smoke(scene, { color: [0.8, 0.82, 0.86], life: [1.2, 0.8], size: [0.9, 6.5], alpha: 0.13, lift: -0.15, rise: [0.5, 1.4], carry: 0.32, max: 900 });
const droplets = new Smoke(scene, { color: [0.86, 0.9, 0.96], life: [0.5, 0.3], size: [0.07, 0.04], alpha: 0.75, lift: -9, rise: [1.6, 3.4], carry: 0.85, max: 900 });
const rain = new Rain(scene);
let puddles = null; // per track, built the first time it rains there
const sky = { t: 0 }; // time of day through a session
let racingLine = null; // per track, the reactive racing line (key 6)
const _ground = new Vector3();
// Crashes: debris, sparks, damage smoke and fire. Ground height comes from the current track.
const crash = new CrashFx(scene, (x, z) => track.ground.heightAt(x, z));
const frameHit = { speed: 0, slide: 0, point: new Vector3(), normal: new Vector3() };
let crashCooldown = 0;
let damageWarned = 0;
let impactShake = 0; // decaying camera shake after a hit
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
  vehicle.reset(new Vector3(pose.x, pose.y ?? 0, pose.z), pose.yaw);
  prevPos.copy(vehicle.body.position);
  prevQuat.copy(vehicle.body.quaternion);
  laps.reset();
  falling = false;
  fallTimer = 0;
  flippedTimer = 0;
  for (const t of skids.trails) t.active = false;
  rig.cut();
  damageWarned = 0;
}
spawn(track.spawn.s, track.spawn.lateral);
/** Put the car at a pose (a pit box, say) and start driving from there. */
function placeAt(pose) {
  vehicle.reset(new Vector3(pose.x, pose.y ?? 0, pose.z), pose.yaw);
  prevPos.copy(vehicle.body.position);
  prevQuat.copy(vehicle.body.quaternion);
  laps.reset();
  falling = false; fallTimer = 0; flippedTimer = 0;
  for (const t of skids.trails) t.active = false;
  rig.cut();
}

// ---------- Race weekend: the field, the sessions, the player's car in them ----------
const weekendRun = new WeekendRun({
  scene, hud, CARS, settings,
  getTrack: () => track, getVehicle: () => vehicle, getSpec: () => spec,
  place: (pose) => placeAt(pose),
  useWeather: (w) => useWeather(w),
  onCrash: (s) => { audio.crash(s * 2); impactShake = Math.min(0.08, impactShake + s * 0.01); },
});
weekendRef = weekendRun;
/** The weekend's controls for the front end (garage, monitor, the car). */
const weekendApi = {
  run: weekendRun,
  /** Load the circuit and the field for a weekend (the loading screen waits on this). */
  async prepare(weekend, opts) {
    const ti = TRACKS.findIndex((t) => t.id === weekend.trackId);
    if (ti !== trackIndex) await selectTrack(ti);
    opts.onStep?.(55, 'Building the paddock');
    await new Promise((r) => setTimeout(r, 30));
    const f26 = CARS.findIndex((c) => c.id === 'f26');
    if (carIndex !== f26) selectCar(f26);
    if (opts.paint != null) { settings.paints = { ...settings.paints, f26: opts.paint }; car.setPaint(spec.paints[opts.paint]); }
    // The team's car as developed so far (grip and power against the best car at this circuit).
    vehicle.rdGrip = opts.car?.grip ?? 1; vehicle.rdPower = opts.car?.power ?? 1;
    opts.onStep?.(80, 'Rolling out the field');
    await new Promise((r) => setTimeout(r, 30));
    await weekendRun.prepare(weekend, opts);
    started = false;
  },
  start(def) { weekendRun.start(def); },
  /** Into the car and out of the garage: the player drives from their box. */
  goOut(compound) {
    // A session's own lap timer: no time-trial records or reference laps in the weekend.
    if (weekendRun.lapTimerFor !== weekendRun.session) { weekendRun.lapTimerFor = weekendRun.session; weekendRun.lapTimer = new LapTimer(track.length, null); }
    laps = weekendRun.lapTimer;
    weekendRun.goOut(compound);
    vehicle.compound = compound;
    begin();
  },
  /** Leave the weekend (back to the season): the field goes, free play's weather comes back. */
  /** Onto the grid for a Sprint or the Grand Prix (length: short | medium | long | full). */
  startRace(def, length) {
    if (weekendRun.lapTimerFor !== def) { weekendRun.lapTimerFor = def; weekendRun.lapTimer = new LapTimer(track.length, null); }
    laps = weekendRun.lapTimer;
    weekendRun.startRace(def, length);
    begin();
  },
  /** Run a race without driving it. */
  simulateRace(def, length) { weekendRun.simulateRace(def, length); },
  /** Back to the garage from the track. */
  garage: () => returnToGarage(),
  leave() { weekendRun.dispose(); vehicle.compound = null; vehicle.rdGrip = 1; vehicle.rdPower = 1; useWeather(null); refreshTower(); },
};
// ---------- The race engineer (the telemetry pop-up's third tab) ----------
const engineer = new Engineer({ getContext: engineerContext, onTab: (k) => { hud.setTelemetry(k); persist(); } });
hud.engineer = engineer;
hud.setTelemetry(hud.telemetryTab);
/** What the engineer sees: the car, the lap, the session and the weather, right now. */
function engineerContext() {
  const S = weekendRun.active ? weekendRun.session : null, run = weekendRun;
  const team = run.active ? TEAMS.find((t) => t.id === run.teamId) : null;
  const c = {
    track: track.name, team: team?.full ?? 'the team', driver: run.playerEntry?.name ?? 'the driver',
    speed: vehicle.speed * 3.6, gear: vehicle.gearLabel ?? vehicle.gear, wetness: weather.wetness, weather: weather.name,
    best: laps.best, compound: vehicle.compound, layout: track.layout,
    last: laps.lastLap ? { time: laps.lastLap.time, sectors: laps.lastLap.sectors, valid: run.lastRec?.valid, trace: laps.lastLap.trace, ref: laps.lastLap.ref } : null,
    bestSectors: laps.bestSectors, fastestSectors: hud.trackSectors ?? null,
  };
  if (S && weekendRun.racing) {
    // A race: position, the gaps on the road, laps to go, the tyres' wear and the plan.
    const order = S.standings(), me = S.player, k = order.indexOf(me), ahead = order[k - 1], behind = order[k + 1];
    Object.assign(c, {
      race: true, sessionType: 'race', session: { name: S.def.name, label: S.label, remaining: `${Math.max(0, S.laps - me.laps)} laps`, state: S.state, flag: S.state === 'chequer' ? 'chequered flag out' : ({ sc: 'safety car', scIn: 'safety car in this lap', vsc: 'virtual safety car', vscEnd: 'VSC ending' })[S.rc.status] ?? 'green flag' },
      stewards: { underInvestigation: (me.inv ?? 0) > 0, penaltyToServe: me.penalty, driveThrough: !!me.driveThrough, trackLimits: me.limits ?? 0, penalties: (me.pens ?? []).map((p) => `${p.key} for ${p.reason.toLowerCase()}${p.served ? ' (served)' : ''}`) },
      position: k + 1, cars: order.length, best: me.best, lapsLeft: Math.max(0, S.laps - me.laps), laps: S.laps,
      leader: order[0] !== me ? { code: order[0].e.code, gapRace: me.gap } : null,
      aheadRace: ahead ? { code: ahead.e.code, gap: Math.max(0, me.gap - ahead.gap) } : null,
      behindRace: behind ? { code: behind.e.code, gap: Math.max(0, behind.gap - me.gap) } : null,
      tyreWear: me.tyres.pct, tyreLaps: Math.round(me.tyres.laps), compound: me.tyres.compound, pits: me.pits,
      nextStopLap: Number.isFinite(me.pitLap) ? me.pitLap : null, nextCompound: S.nextCompound(me), wantsPit: S.wantsPit(me), penalty: me.penalty,
      lapStatus: weekendRun.raceRun?.stopping ? 'pit stop' : pitLimiterOn ? 'in the pit lane' : 'racing',
    });
    c.forecast = forecastAhead(600);
  } else if (S) {
    const quali = S.def.type === 'quali', key = (r) => (quali ? r.segBest[S.segment] : r.best);
    const order = S.standings(), me = S.player, k = order.indexOf(me), lead = order[0];
    const fmtClock = (x) => { const t = Math.ceil(x); return `${Math.floor(t / 60)} min ${t % 60} s`; };
    Object.assign(c, {
      session: { name: S.def.name, label: S.label, remaining: fmtClock(S.remaining), flag: S.state === 'chequer' ? 'chequered flag out' : S.state === 'break' ? 'between segments' : 'green flag' },
      position: k + 1, cars: order.length, knockedOut: S.out.has(me.id), cutLine: quali && S.segment < 2 ? (S.segment === 0 ? 16 : 10) : null,
      best: key(me) ?? laps.best, leader: key(lead) != null ? { code: lead.e.code, time: key(lead) } : null,
      ahead: k > 0 && key(order[k - 1]) != null && key(me) != null ? { code: order[k - 1].e.code, time: key(order[k - 1]) } : null,
      fastestSectors: S.overall.sectors, lapStatus: run.playerStatus(pitLimiterOn).toLowerCase(), sessionLaps: me.laps,
    });
    if (c.leader && c.best != null) c.gap = c.best - c.leader.time;
    c.forecast = forecastAhead(S.remaining);
    c.sessionType = S.def.type; c.remainingSec = S.remaining; c.session.state = S.state;
    const below = order[k + 1];
    if (below && key(below) != null && key(me) != null) { c.behind = { code: below.e.code, time: key(below) }; c.behindGap = key(below) - key(me); }
    if (c.cutLine) {
      const cutRow = order[c.cutLine - 1], firstOut = order[c.cutLine];
      if (cutRow && key(cutRow) != null && cutRow !== me) { c.cutTime = key(cutRow); c.cutCode = cutRow.e.code; }
      if (k + 1 <= c.cutLine && firstOut && key(firstOut) != null && key(me) != null) c.marginOver = key(firstOut) - key(me);
    }
    c.rainSoon = /\b(drizzle|rain) \(/.test(c.forecast ?? '') && c.wetness < 0.2; // a rain stage in the forecast (not just "0% chance of rain")
  }
  return c;
}
/** The weather timeline from now to the end of the session, in three slots. */
function forecastAhead(remaining) {
  const tl = weather.timeline.map((x) => ({ ...x, t: x.t - weather.t })).filter((x, i, a) => x.t >= 0 || (a[i + 1]?.t ?? 1) > 0).map((x) => ({ ...x, t: Math.max(0, x.t) }));
  if (!tl.length) return null;
  return forecast(tl, Math.max(60, remaining), 3).map((f, i) => `${i === 0 ? 'next few minutes' : `in ${Math.round((remaining * i) / 3 / 60)} min`} ${f.name.toLowerCase()} (${f.rain}% chance of rain)`).join(', ');
}
/** The pit wall calls a finished lap over the radio. */
function lapRadio(rec) {
  weekendRun.lastRec = rec;
  if (rec.type !== 'push') return;
  if (!rec.valid) { engineer.radio('Lap deleted, track limits.'); return; }
  const S = weekendRun.session, quali = S.def.type === 'quali', key = (r) => (quali ? r.segBest[S.segment] : r.best);
  const order = S.standings(), pos = order.indexOf(S.player) + 1, lead = order[0];
  const fast = S.overall.sectors, purple = rec.sectors.findIndex((x, k) => x != null && fast[k] != null && x <= fast[k] + 1e-6);
  let msg = `${formatTime(rec.time)}, P${pos}.`;
  if (lead !== S.player && key(lead) != null) msg += ` ${(rec.time - key(lead)).toFixed(1)} off ${lead.e.code}.`;
  else if (pos === 1) msg += ' Top of the times, good lap.';
  if (purple >= 0) msg += ` Purple sector ${purple + 1}.`;
  const cut = quali && S.segment < 2 ? (S.segment === 0 ? 16 : 10) : null;
  if (cut && pos > cut) msg += ` You're in the drop zone, need more.`;
  engineer.radio(msg);
}
weekendRun.onSessionDone = () => {
  frontend.saveSeason();
  // The results come up wherever the player is; closing them goes back to the garage.
  const id = weekendRun.def.id;
  weekendRun.session.resultsShown = true;
  const after = weekendRun.racing ? 'parc' : 'results'; // a race: parc fermé, the podium, then the results
  if (weekendRun.mode === 'track') { weekendRun.toGarage(); started = false; frontend.show(after, id); }
  else if (frontend.visible) frontend.go(after, id);
};
weekendRun.onRadio = (text) => engineer.call(text);
// Practice laps correlate the new parts: their real gain is known and applied, and the engineer says how they did.
weekendRun.onValidate = () => {
  const st = frontend.season?.rd;
  if (!st) return;
  const done = [];
  for (let p = rdValidate(st, st.player); p; p = rdValidate(st, st.player)) done.push(p);
  if (!done.length) return;
  const f = playerCarFactors(st, track.id);
  vehicle.rdGrip = f.grip; vehicle.rdPower = f.power;
  frontend.saveSeason();
  engineer.call(`Data's in. ${done.map((p) => `${p.name}: ${p.verdict.toLowerCase()}, ${Math.round(p.factor * 100)} percent of the prediction`).join('. ')}.`);
  hud.toast('NEW PARTS CORRELATED', 2.5, 'best');
};
weekendRun.onLimits = (s) => engineer.radio(`Track limits at ${whereIs(track.layout, s)}. That lap is gone, start again.`);
function returnToGarage() {
  weekendRun.toGarage();
  started = false;
  frontend.show('garage', 'return');
}

// ---------- Start menu: pick a track and a car on live cards, then race ----------
/** Load a track and car (in a given paint, if any) and start driving. */
async function startRace(ti, ci, paint = null) {
  if (paint !== null) { params.delete('paint'); settings.paints = { ...settings.paints, [CARS[ci].id]: paint }; }
  if (ti !== trackIndex) {
    await selectTrack(ti);
    lastSafeS = track.spawn.s;
  }
  if (ci !== carIndex || ti !== trackIndex) selectCar(ci);
  else if (paint !== null) car.setPaint(spec.paints[paintIndex()]);
  useLapTimer();
  spawn(track.spawn.s, track.spawn.lateral);
  persist();
  begin();
}
menu = new Menu({
  cars: CARS, tracks: TRACKS, packs: PACKS, carIndex, trackIndex,
  onRace: (ti, ci) => startRace(ti, ci),
  onWeather: () => toggleWeather(),
});
// The front end: main menu, the season mode's opening and the time trial.
const frontend = new Frontend({
  cars: CARS, tracks: TRACKS,
  onTimeTrial: (ti, ci, paint) => startRace(ti, ci, paint),
  onSeasonRace: (ti, ci, paint) => startRace(ti, ci, paint),
  weekend: weekendApi,
  onFreePlay: () => menu.show(trackIndex, carIndex),
  weather: { get: () => settings.rain, toggle: () => { toggleWeather(); menu.setWeather(settings.rain); } },
});
menu.setWeather(settings.rain);

/*
 * Dynamic sky (key 7): the light changes through a session on some circuits (COTA from afternoon to
 * sunset, Yas Marina from dusk to full night), and showers roll in and clear: the sky clouds over
 * gradually, then the track turns wet.
 */
const DAY_CYCLE = { cota: ['texasSunset', 9], yas: ['yasNight', 7], baku: ['yasNight', 14], silverstone: ['texasSunset', 14] };
/** A new day at the circuit: the time of day from the start, the weather from its climate. */
function resetSky() {
  sky.t = 0;
  weather = new Weather({ wet: CLIMATE[track.id] ?? 0.25 });
  if (settings.rain) weather.set('rain');
  wx.surf = -1; wx.stage = -1;
  rain.setTint(track.mood === 'night');
}
/** The live weather comes from somewhere else (a session's forecast timeline), or back to free play's own. */
function useWeather(w) { weather = w ?? new Weather({ wet: CLIMATE[track.id] ?? 0.25 }); wx.stage = -1; applyWeather(); }
function updateSky(dt) {
  if (!track) return;
  if (settings.dynamic !== false) {
    const cyc = DAY_CYCLE[track.id];
    if (cyc) { sky.t = Math.min(1, sky.t + dt / (cyc[1] * 60)); env.setTimeOfDay(cyc[0], sky.t); }
    weather?.update(dt);
  }
  applyWeather();
}

/** Free play's weather key: straight to rain, or straight back to sunshine (and a dry track). */
function toggleWeather() {
  weather.set(weather.wetness > 0.5 ? 'clear' : 'rain');
  applyWeather();
  if (!menu.visible) hud.toast(settings.rain ? 'Rain · wet track' : 'Dry track', 1.4);
  persist();
}
if (!started) frontend.show('main');

// ---------- Actions ----------
function persist() {
  saveSettings({
    ...settings, track: track.id, assists: vehicle.assists, assistLevel: vehicle.assistLevel, automatic: vehicle.automatic,
    telemetry: hud.showTelemetry, muted: audio.muted,
  });
}

input.onAction = (action) => {
  if (frontend.visible) return; // the front end handles its own keys
  if (menu.visible) { if (action === 'race') menu.race(); else if (action === 'weather') toggleWeather(); else if (action === 'help') hud.el.help.classList.toggle('hidden'); return; }
  // A season weekend: the team's own car and livery, at this circuit (no swapping cars, paint or track).
  if (weekendRun.active && (action === 'paint' || action === 'car' || action === 'track' || action === 'weather')) { hud.toast('SEASON · TEAM CAR AND LIVERY', 1.6); return; }
  switch (action) {
    case 'menu': if (weekendRun.active) returnToGarage(); else { started = false; frontend.show('main'); } break;
    case 'camera': rig.next(); hud.toast(rig.modeName, 1.2); break;
    case 'leaderboard': hud.toggleBoard(track.name, topTimes(track.id)); break;
    case 'reset': spawn(currentS()); break;
    case 'paint': {
      const i = wrap(paintIndex() + 1, spec.paints.length);
      settings.paints = { ...settings.paints, [spec.id]: i };
      params.delete('paint');
      car.setPaint(spec.paints[i]);
      refreshTower();
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
      // FULL -> SPORT -> OFF -> FULL
      vehicle.assistLevel = vehicle.assistLevel === 2 ? 1 : vehicle.assistLevel === 1 ? 0 : 2;
      hud.toast(['Assists OFF — good luck', 'Assists SPORT (can lock up and spin)', 'Assists FULL'][vehicle.assistLevel], 1.8);
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
    case 'telemetry': hud.nextTelemetry(); persist(); break;
    case 'mute': audio.setMuted(!audio.muted); hud.toast(audio.muted ? 'Sound off' : 'Sound on', 1); persist(); break;
    case 'horn': audio.horn(true); break;
    case 'pause': setPaused(!paused); break;
    case 'resetLaps': resetTrackLaps(); break;
    case 'weather': toggleWeather(); break;
    case 'quality':
      settings.quality = post.quality === 'high' ? 'low' : 'high';
      post.setQuality(settings.quality);
      hud.toast(settings.quality === 'high' ? 'Graphics: high (ambient occlusion)' : 'Graphics: performance', 1.6);
      persist();
      break;
    case 'ersMode':
      if (!vehicle.ers) { hud.toast('No hybrid system on this car', 1.4); break; }
      vehicle.ers.mode = (vehicle.ers.mode + 1) % 3;
      hud.toast(`ERS ${['HARVEST', 'BALANCED', 'OVERTAKE'][vehicle.ers.mode]}`, 1.2);
      break;
    case 'dynamicSky':
      settings.dynamic = settings.dynamic === false;
      if (!settings.dynamic) env.setTimeOfDay(null, 0);
      hud.toast(settings.dynamic ? 'Dynamic time & weather on' : 'Dynamic time & weather off', 1.6);
      persist();
      break;
    case 'racingLine':
      settings.racingLine = !settings.racingLine;
      hud.toast(settings.racingLine ? 'Racing line on' : 'Racing line off', 1.4);
      persist();
      break;
    case 'help': hud.el.help.classList.toggle('hidden'); break;
    default: break;
  }
};
addEventListener('keyup', (e) => { if (e.code === 'KeyH') audio.horn(false); });
addEventListener('keydown', (e) => { if (e.code === 'Enter' && !frontend.visible && weekendRun.active && weekendRun.boxNoted) returnToGarage(); });

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

const _spark = new Vector3();
// ---------- Per-frame effects ----------
function updateEffects(dt) {
  for (let i = 0; i < 4; i++) {
    const w = vehicle.wheels[i];
    if (!w.inContact) { skids.add(i, w.contactPoint, w.lateral, 0, 0, 0); continue; }
    if (vehicle.wetness > 0 && w.groundSpeed > 4) {
      // Spray grows with the square of speed; a puddle throws a sheet of water.
      const v = w.groundSpeed, splash = 1 + (w.puddle || 0) * 5;
      spray.emit(i, w.contactPoint, vehicle.body.velocity, Math.min(90, v * v * 0.05) * (w.isFront ? 0.35 : 1) * splash, dt);
      droplets.emit(i, w.contactPoint, vehicle.body.velocity, Math.min(160, v * 3) * (w.isFront ? 0.5 : 1) * splash, dt);
    }
    // Marks show from the edge of grip (hard cornering, heavy braking, wheelspin), darker as it slides.
    const sliding = Math.max(0, w.slip - 0.62) * 1.7;
    const locked = Math.abs(w.slipRatio) > 0.15 ? Math.min(0.95, (Math.abs(w.slipRatio) - 0.15) * 3.5 + 0.35) : 0;
    const intensity = Math.min(1, Math.max(sliding, locked) * 1.3) * Math.min(1, w.groundSpeed / 3);
    const width = w.isFront ? spec.tireWidth.front : spec.tireWidth.rear;
    skids.add(i, w.contactPoint, w.lateral, width * 0.9, intensity, track.ground.heightAt(w.contactPoint.x, w.contactPoint.z) ?? 0);

    const slipSpeed = Math.hypot(w.omega * w.radius - w.vLong, w.vLat);
    if (slipSpeed > 4.5 && w.slip > 1.3) smoke.emit(i, w.contactPoint, vehicle.body.velocity, Math.min(70, slipSpeed * 5), dt);
    // Off the track: dust and stones; on it, at the limit: little flecks of rubber.
    if ((w.surface === 'grass' || w.surface === 'gravel') && w.groundSpeed > 4) dirt.emit(i, w.contactPoint, vehicle.body.velocity, Math.min(90, w.groundSpeed * (w.surface === 'gravel' ? 4 : 2)), dt);
    else if (intensity > 0.15) rubber.emit(i, w.contactPoint, vehicle.body.velocity, intensity * 40, dt);
  }
  // Open-wheelers spark off the titanium skid blocks: over bumps, kerbs and crests, in flickers when
  // flat out on a straight, and from the front of the plank as the nose dives under heavy braking.
  if (spec.cockpit === 'f1') {
    const v = vehicle.forwardSpeed, [fl, fr, rl, rr] = vehicle.wheels;
    if (v > 38 && rl.inContact && rr.inContact) {
      const bump = Math.max(rl.compressionVelocity ?? 0, rr.compressionVelocity ?? 0), kerb = rl.surface === 'kerb' || rr.surface === 'kerb';
      const speedK = Math.min(1, (v - 38) / 30);
      let rate = bump > 0.12 || kerb ? 1500 : v > 58 && Math.random() < 0.14 ? 800 : 0;
      if (rate) {
        _spark.copy(rl.contactPoint).add(rr.contactPoint).multiplyScalar(0.5);
        floorSparks.emit(4, _spark, vehicle.body.velocity, rate * speedK, dt);
        _spark.lerp(fl.contactPoint, 0.45); // the middle of the plank
        floorSparks.emit(5, _spark, vehicle.body.velocity, rate * 0.6 * speedK, dt);
      }
      if (accel.long < -24 && fl.inContact && fr.inContact && Math.random() < 0.5) {
        _spark.copy(fl.contactPoint).add(fr.contactPoint).multiplyScalar(0.5).lerp(rl.contactPoint, 0.2);
        floorSparks.emit(6, _spark, vehicle.body.velocity, 900 * speedK, dt);
      }
    }
  }
  floorSparks.update(dt, renderer.domElement.clientHeight, camera.fov);
  dirt.update(dt, renderer.domElement.clientHeight, camera.fov);
  rubber.update(dt, renderer.domElement.clientHeight, camera.fov);
  skids.flush();
  smoke.update(dt, renderer.domElement.clientHeight, camera.fov);
  spray.update(dt, renderer.domElement.clientHeight, camera.fov);
  droplets.update(dt, renderer.domElement.clientHeight, camera.fov);
  puddles?.update(dt);
  if (settings.racingLine && trackScene && track.layout?.k && track.layout.nearest) {
    if (!racingLine) { racingLine = createRacingLine(track.layout); trackScene.group.add(racingLine.mesh); }
    racingLine.mesh.visible = true;
    const p = vehicle.body.position;
    racingLine.update(vehicle, track.progress(p.x, p.z));
  } else if (racingLine) racingLine.mesh.visible = false;
  updateCrash(dt);
}

/** Turn this frame's hardest impact into damage, debris, sound; scraping into sparks. */
function updateCrash(dt) {
  crashCooldown = Math.max(0, crashCooldown - dt);
  const hit = frameHit.speed;
  if (hit > 5 && crashCooldown === 0) {
    vehicle.hitPoint.copy(frameHit.point);
    vehicle.hitNormal.copy(frameHit.normal);
    // Damage grows with the square of the impact speed: a tap does nothing, ~80 km/h head-on wrecks it.
    vehicle.damage = Math.min(1, vehicle.damage + ((hit - 5) / 20) ** 2 * 0.9);
    // Which parts it broke, and what that does to the car (and the engineer tells you).
    const before = vehicle.parts ? JSON.stringify(vehicle.parts) : null;
    const said = damageImpact(vehicle, hit, { point: frameHit.point, under: vehicle.hullHit > 4 });
    // The bill (inside the cost cap): a front wing ~$0.2M, a floor ~$0.5M, a gearbox...
    if (weekendRun.active && frontend.season?.weekend && vehicle.parts) {
      const P = vehicle.parts, B = before ? JSON.parse(before) : { frontWing: 1, rearWing: 1, floor: 1, sidepods: 1, engine: 1 };
      const cost = ((B.frontWing - P.frontWing) * 0.2 + (B.rearWing - P.rearWing) * 0.15 + (B.floor - P.floor) * 0.5 + (B.sidepods - P.sidepods) * 0.25 + (B.engine - P.engine) * 1.5) * 1e6 * (weekendRun.mods?.repairCost ?? 1);
      frontend.season.weekend.repairs = (frontend.season.weekend.repairs ?? 0) + Math.max(0, cost);
      // Parts broken beyond repair: the R&D inventory writes a copy off at the end of the weekend.
      const broken = (frontend.season.weekend.broken ??= {});
      for (const k of ['frontWing', 'rearWing', 'floor', 'sidepods']) if (P[k] < 0.45) broken[k] = true;
    }
    if (said && weekendRun.active) engineer.call(said);
    if (said) hud.toast('DAMAGE · 4 FOR THE CAR (PHYSICS)', 2.4, 'void');
    if (weekendRun.racing) weekendRun.raceRun?.impact(hit);   // a heavy crash in a race: debris, yellows, perhaps a neutralisation
    crash.impact(vehicle, car.paintColor ?? 0xffc21a, hit);
    audio.crash(hit);
    impactShake = Math.min(0.12, impactShake + hit * 0.004);
    crashCooldown = 0.35;
    if (vehicle.damage > 0.75 && damageWarned < 2) { hud.toast('ON FIRE — R to reset', 2.2, 'void'); damageWarned = 2; }
    else if (vehicle.damage > 0.35 && damageWarned < 1) { hud.toast('Heavy damage', 1.6); damageWarned = 1; }
  }
  if (frameHit.slide > 3) crash.scrape(frameHit.point, vehicle.body.velocity, frameHit.slide, dt);
  audio.scrape(frameHit.slide > 3 ? frameHit.slide : 0);
  crash.update(dt, vehicle, renderer.domElement.clientHeight, camera.fov);
  frameHit.speed = frameHit.slide = 0;
}

function updateSafety(dt) {
  const b = vehicle.body;
  const p = b.position;
  const upY = new Vector3(0, 1, 0).applyQuaternion(b.quaternion).y;

  if (vehicle.wheelsInContact === 4 && upY > 0.9) lastSafeS = track.progress(p.x, p.z) ?? lastSafeS;

  if (track.voidY !== null && !falling && p.y < -2.5 && vehicle.wheelsInContact === 0) {
    falling = true;
    hud.toast(['LOST IN THE VOID', 'YEET', 'GOODBYE, TINY F1', 'THE VOID SAYS HI'][Math.floor(Math.random() * 4)], 2.2, 'void');
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
    weekendRun.controls(controls); // a race: held on the grid and in the pit box, the clutch start
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
      // Keep the hardest hit of this frame (impacts last only a few physics steps).
      const hit = Math.max(vehicle.wallHit, vehicle.hullHit * 0.8);
      if (hit > frameHit.speed) { frameHit.speed = hit; frameHit.point.copy(vehicle.hitPoint); frameHit.normal.copy(vehicle.hitNormal); }
      frameHit.slide = Math.max(frameHit.slide, vehicle.wallHit > 0 ? vehicle.wallSlide : 0);
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

    const prevBest = laps.bestSectors.slice(), prevBestLap = laps.best;
    const event = laps.update(dt, track.progress(b.position.x, b.position.z), Math.abs(vehicle.forwardSpeed));
    // Cinematic timing: every sector and lap flashes up, coloured like F1 timing screens.
    const verdict = (t, record, best) => (record != null && t <= record + 1e-6 ? 'purple' : best == null || t <= best + 1e-6 ? 'green' : 'yellow');
    const gapText = (t, ref) => (ref == null ? '' : `${t - ref < 0 ? '-' : '+'}${Math.abs(t - ref).toFixed(3)}`);
    const inWeekend = weekendRun.active && weekendRun.mode === 'track';
    if (inWeekend) {
      const rec = event ? weekendRun.playerLap(event) : null;
      if (rec) lapRadio(rec);
      if (event?.type === 'lap') { hud.setLap(hud.lapNo + 1); hud.flashTiming(event.outLap ? 'Out lap' : 'Lap', formatTime(event.time), gapText(event.time, prevBestLap), event.isBest ? 'green' : 'yellow', true); }
    } else if (event && event.type === 'sector') {
      const k = event.index, rec = (hud.trackSectors || [])[k];
      hud.flashTiming(`Sector ${k + 1}`, event.time.toFixed(3), gapText(event.time, prevBest[k] ?? rec), verdict(event.time, rec, prevBest[k]));
    }
    if (event && event.type === 'lap') {
      // Records: sectors and top-10 per track, best-lap trace per car (for the delta).
      // Every completed lap goes in the table, the first one from the grid included; only a flying
      // lap's trace is kept as the reference for the live delta.
      const me = driverTag();
      if (!inWeekend) {
      const rank = submitLap(track.id, { time: event.time, car: spec.id, carName: spec.name, team: me.team, colour: me.colour });
      sessionBest = sessionBest == null ? event.time : Math.min(sessionBest, event.time);
      hud.setLap(hud.lapNo + 1);
      refreshTower();
      hud.trackSectors = submitSectors(track.id, event.sectors);
      if (event.isBest && !event.outLap) saveTrace(track.id, spec.id, event.trace);
      const record = rank === 1 ? 'TRACK RECORD' : event.isBest ? 'PERSONAL BEST' : 'LAP';
      hud.flashTiming(rank === 1 ? 'Track record' : event.isBest ? 'Personal best' : `Lap${rank ? ` · P${rank}` : ''}`, formatTime(event.time), gapText(event.time, prevBestLap), rank === 1 ? 'purple' : event.isBest ? 'green' : 'yellow', true);
      void record;
      hud.showBoard(track.name, topTimes(track.id), rank, 5);
      }
    }

    updateSafety(dt);
    updateEffects(dt);
    if (weekendRun.active && weekendRun.mode === 'track' && weekendRun.inBox()) {
      if (!weekendRun.boxNoted) { weekendRun.boxNoted = true; hud.toast('In your box — Enter for the garage', 3); }
    } else weekendRun.boxNoted = false;
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
  impactShake *= Math.exp(-6 * dt);
  rig.shake = Math.min(0.03, kerbShake * 0.004 + vehicle.speed * 0.00008) + impactShake;
  rig.update(dt, renderPos, renderQuat, vehicle.body.velocity, falling);
  camera.updateMatrixWorld();
  cockpit.setPaint(car.paintColor ?? 0xffc21a);
  cockpit.setStyle(spec.cockpit ?? 'closed');
  cockpit.update(vehicle, paused ? 0 : dt, inCockpit);
  if (window.__freeCam) { const [p, t] = window.__freeCam; camera.position.set(...p); camera.lookAt(...t); } // dev screenshots
  if (!paused) updateSky(dt);
  env.update(renderPos, camera, dt);
  nightLights?.update(camera.position);
  _ground.set(renderPos.x, track.ground.heightAt(renderPos.x, renderPos.z) ?? renderPos.y, renderPos.z);
  rain.update(paused ? 0 : dt, camera, vehicle.body.velocity, _ground, renderer.domElement.clientHeight);
  post.setRain(rain.active ? 1 : 0, Math.min(1, vehicle.body.velocity.length() / 55), paused ? 0 : dt);
  trackScene.update?.(dt, camera, renderPos);
  menu.update(dt);
  if (weekendRun.active) weekendRun.update(dt, camera, { inPitLane: pitLimiterOn, paused });
  // The tyres for the PHYSICS telemetry tab: a race keeps its own; in practice, qualifying and free
  // running the set on the car wears with the distance and how hard each tyre slides (a new set on a
  // compound change or a reset).
  if (!weekendRun.racing) {
    const comp = vehicle.compound ?? 'M';
    if (!runTyres || runTyres.compound !== comp || runTyres.trackId !== track.id || !started) { runTyres = new TyreSet(comp, { trackId: track.id }); runTyres.trackId = track.id; }
    if (!paused && started && !frontend.visible) {
      const d = Math.max(0, vehicle.forwardSpeed) * dt, slip = vehicle.wheels.reduce((a, w) => a + Math.min(2, Math.abs(w.slip ?? 0)), 0) / 4;
      runTyres.run(d, track.layout.length, Math.max(0.75, Math.min(2.6, 0.75 + Math.max(0, slip - 0.35) * 1.8)));
      runTyres.useWheels(d, vehicle.wheels);
    }
    hud.tyreInfo = { compound: comp, wear: runTyres.wear, pct: runTyres.pct, wheels: [0, 1, 2, 3].map((i) => runTyres.wheelWear(i)), warning: vehicle.damageWarning ?? '' };
  }
  frontend.update(dt);
  hud.update(dt, vehicle, laps, rig.modeName, accel);
  hud.updateMinimap(renderPos, vehicle.forward);

  if (frontend.visible) return; // the front end covers the whole screen: don't draw the world under it
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
document.getElementById('reset-laps')?.addEventListener('click', (e) => { e.stopPropagation(); resetTrackLaps(); });
window.__racer = { hud, frontend, engineer, weekendRun, weekendApi, get weather() { return weather; }, useWeather, get vehicle() { return vehicle; }, get car() { return car; }, get track() { return track; }, rig, scene, renderer, settings, smoke, skids, get frames() { return frames; }, get paused() { return paused; }, get started() { return started; } };
