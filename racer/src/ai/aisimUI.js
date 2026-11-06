import { TRACKS } from '../tracks/index.js';
import { Car, stepCar, collide, slipstream, grid, locate, countLaps, markSplit, timeGap } from './sim2d.js';
import { planTrack, AIDriver, LapRecorder } from './driver.js';

/*
 * The live 2D AI sim: the game's real circuit layouts, a field of AI drivers and (optionally) you.
 * Everything the AI does is visible: its line, what it's thinking (OVERTAKE L, DEFEND, SPACE...).
 */

const $ = (id) => document.getElementById(id);
const cv = $('c'), g = cv.getContext('2d');
const TEAM = [['#3671c6', 'Red Bull'], ['#e8002d', 'Ferrari'], ['#27f4d2', 'Mercedes'], ['#ff8000', 'McLaren'], ['#229971', 'Aston'], ['#0093cc', 'Alpine'], ['#64c4ff', 'Williams'], ['#6692ff', 'RB'], ['#52e252', 'Sauber'], ['#b6babd', 'Haas']];
const NAMES = ['VER', 'LEC', 'HAM', 'NOR', 'ALO', 'GAS', 'ALB', 'TSU', 'HUL', 'OCO', 'PIA', 'SAI', 'RUS', 'STR', 'DOO', 'COL', 'LAW', 'BOR', 'BEA', 'ANT'];
const tracks = TRACKS.filter((t) => t.layout?.nearest && t.layout?.wall);
tracks.forEach((t, k) => $('track').add(new Option(t.name, k)));
$('track').value = Math.max(0, tracks.findIndex((t) => t.id === 'suzuka'));

// Live labels for the sliders.
const bind = (id, fmt = (v) => v) => { const f = () => ($(id + 'V').textContent = fmt($(id).value)); $(id).addEventListener('input', f); f(); };
bind('n'); bind('skill', (v) => v + '%'); bind('spread', (v) => '±' + v + '%'); bind('dskill', (v) => v + '%'); bind('aggr', (v) => v + '%'); bind('hum', (v) => v + '%'); bind('slot'); bind('laps'); bind('learn', (v) => v + '%');

let L, plan, cars = [], drivers = [], me = null, time = 0, paused = false, running = false, finished = false;
let cam = { mode: 'follow', x: 0, z: 0, zoom: 3, target: 0 }, recorder = null, myRecord = null, events = [];
let trackPaths = null;

function buildTrackPaths() {
  const N = L.N, P = (i, lat) => [L.x[i] + L.nx[i] * lat, L.z[i] + L.nz[i] * lat];
  const ring = (f) => { const p = new Path2D(); for (let i = 0; i <= N; i++) { const [x, z] = f(i % N); i ? p.lineTo(x, z) : p.moveTo(x, z); } return p; };
  trackPaths = {
    wallL: ring((i) => P(i, L.wall.L[i])), wallR: ring((i) => P(i, -L.wall.R[i])),
    edgeL: ring((i) => P(i, L.halfW)), edgeR: ring((i) => P(i, -L.halfW)), centre: ring((i) => P(i, 0)),
  };
  // Run-off band (edge to wall) and road as filled polygons.
  const band = (side) => { const p = new Path2D(); const s = side === 'L' ? 1 : -1; for (let i = 0; i <= N; i++) { const [x, z] = P(i % N, s * L.edge); i ? p.lineTo(x, z) : p.moveTo(x, z); } for (let i = N; i >= 0; i--) { const [x, z] = P(i % N, s * (side === 'L' ? L.wall.L[i % N] : L.wall.R[i % N])); p.lineTo(x, z); } p.closePath(); return p; };
  trackPaths.runL = band('L'); trackPaths.runR = band('R');
  const road = new Path2D(); for (let i = 0; i <= N; i++) { const [x, z] = P(i % N, L.edge); i ? road.lineTo(x, z) : road.moveTo(x, z); } for (let i = N; i >= 0; i--) { const [x, z] = P(i % N, -L.edge); road.lineTo(x, z); } road.closePath();
  trackPaths.road = road;
  // Kerbs: short coloured segments where the layout has them.
  trackPaths.kerbs = [];
  for (const side of ['L', 'R']) { const s = side === 'L' ? 1 : -1; for (let i = 0; i < N; i++) if (L.kerb[side][i] > 0.5) trackPaths.kerbs.push([P(i, s * (L.halfW + L.kerbW / 2)), P((i + 1) % N, s * (L.halfW + L.kerbW / 2)), Math.floor(i / 2) % 2]); }
}

function linePath(off) { const p = new Path2D(); for (let i = 0; i <= L.N; i++) { const j = i % L.N, x = L.x[j] + L.nx[j] * off[j], z = L.z[j] + L.nz[j] * off[j]; i ? p.lineTo(x, z) : p.moveTo(x, z); } return p; }

function start() {
  L = tracks[+$('track').value].layout;
  log('Planning the racing line…');
  plan = planTrack(L);
  buildTrackPaths();
  const n = +$('n').value, mode = $('me').value, slot = Math.min(+$('slot').value, n + 1) - 1;
  const total = n + (mode === 'off' ? 0 : 1);
  const spots = grid(L, total);
  const base = +$('skill').value / 100, spread = +$('spread').value / 100;
  // AI skills, then order them on the grid as asked.
  const skills = Array.from({ length: n }, (_, k) => Math.min(1.02, Math.max(0.8, base + spread * (1 - (2 * k) / Math.max(1, n - 1)))));
  const order = $('order').value;
  if (order === 'reverse') skills.reverse();
  else if (order === 'mixed') for (let k = skills.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [skills[k], skills[j]] = [skills[j], skills[k]]; }
  cars = []; drivers = []; me = null; events = []; time = 0; finished = false;
  let ai = 0;
  for (let k = 0; k < total; k++) {
    const isMe = mode !== 'off' && k === slot;
    const tm = TEAM[(isMe ? 0 : ai) % TEAM.length];
    const c = new Car(k + 1, { ...spots[k], name: isMe ? 'YOU' : NAMES[ai % NAMES.length], colour: isMe ? '#ffd23f' : tm[0] });
    locate(L, c); c.progress = c.s > L.length / 2 ? c.s - L.length : c.s; c._prevS = c.s;
    cars.push(c);
    if (isMe) { me = c; drivers.push(mode === 'ai' ? new AIDriver(plan, { pace: base, skill: +$('dskill').value / 100, aggression: +$('aggr').value / 100, humanity: +$('hum').value / 100, name: 'YOU' }) : null); }
    else { const ds = Math.min(1, Math.max(0.78, +$('dskill').value / 100 + (Math.random() - 0.5) * 0.08)); drivers.push(new AIDriver(plan, { pace: skills[ai], skill: ds, aggression: Math.min(1, Math.max(0, +$('aggr').value / 100 + (Math.random() - 0.5) * 0.3)), humanity: +$('hum').value / 100, name: c.name })); ai++; }
  }
  const learn = +$('learn').value / 100;
  if (myRecord && learn > 0) drivers.forEach((d) => d && d.learn(myRecord, learn));
  recorder = me ? new LapRecorder(L) : null;
  cam.target = me ? cars.indexOf(me) : 0;
  cam.mode = 'follow'; cam.zoom = Math.max(cam.zoom, 4); $('cam').textContent = 'Camera: follow';
  running = true; paused = false;
  log(`${tracks[+$('track').value].name}: ${n} AI${me ? ' + you' : ''}, ${$('laps').value} laps. Lights out!`);
}

function log(t) { $('log').textContent = t; }

// ---- your controls ----
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyC') cycleCam();
  if (e.code === 'KeyP') togglePause();
  if (e.code === 'KeyR') start();
  if (e.code === 'Tab') { e.preventDefault(); cam.target = (cam.target + 1) % Math.max(1, cars.length); cam.mode = 'follow'; }
  if (e.code === 'Equal' || e.code === 'NumpadAdd') cam.zoom *= 1.2;
  if (e.code === 'Minus' || e.code === 'NumpadSubtract') cam.zoom /= 1.2;
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
const touch = { l: false, r: false, g: false, b: false };
for (const [id, k] of [['tl', 'l'], ['tr', 'r'], ['tg', 'g'], ['tb', 'b']]) {
  const el = $(id);
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); touch[k] = true; });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, () => { touch[k] = false; });
}
let steerIn = 0;
function myInputs(dt) {
  const left = keys.ArrowLeft || keys.KeyA || touch.l, right = keys.ArrowRight || keys.KeyD || touch.r;
  // In the follow camera the car points up the screen and a growing heading turns it to the right.
  const want = (right ? 1 : 0) - (left ? 1 : 0);
  const rate = want === 0 ? 4 : 2.6;
  steerIn += Math.max(-rate * dt, Math.min(rate * dt, want - steerIn));
  return { steer: steerIn, throttle: keys.ArrowUp || keys.KeyW || touch.g ? 1 : 0, brake: keys.ArrowDown || keys.KeyS || touch.b ? 1 : 0 };
}

function cycleCam() { cam.mode = cam.mode === 'follow' ? 'overview' : 'follow'; $('cam').textContent = `Camera: ${cam.mode}`; }
function togglePause() { paused = !paused; $('pause').textContent = paused ? 'Resume' : 'Pause'; }
$('start').onclick = start; $('cam').onclick = cycleCam; $('pause').onclick = togglePause;
$('toggle').onclick = () => $('settings').classList.toggle('open');
$('learn').addEventListener('change', () => { const b = +$('learn').value / 100; if (myRecord) drivers.forEach((d) => d && d.learn(myRecord, b)); log(myRecord ? `AI now ${Math.round(b * 100)}% on your line` : 'Drive a full lap first: the AI learns from your last lap'); });
cv.addEventListener('wheel', (e) => { e.preventDefault(); cam.zoom *= e.deltaY < 0 ? 1.12 : 1 / 1.12; }, { passive: false });
let drag = null;
cv.addEventListener('pointerdown', (e) => { if (cam.mode === 'overview') drag = [e.clientX, e.clientY, cam.x, cam.z]; });
addEventListener('pointerup', () => (drag = null));
addEventListener('pointermove', (e) => { if (drag) { cam.x = drag[2] - (e.clientX - drag[0]) / cam.zoom; cam.z = drag[3] - (e.clientY - drag[1]) / cam.zoom; } });

// ---- simulation ----
const DT = 1 / 120;
function step() {
  for (const c of cars) locate(L, c);
  slipstream(L, cars);
  cars.forEach((c, k) => {
    const d = drivers[k];
    const o = d ? d.drive(c, cars.filter((x) => x !== c), DT, time) : myInputs(DT);
    c.steer = o.steer; c.throttle = o.throttle; c.brake = o.brake;
  });
  for (const c of cars) stepCar(L, c, DT);
  collide(cars);
  for (const c of cars) {
    markSplit(c, time + DT);
    const before = c.lap;
    if (countLaps(L, c, time) && c.lap > 1 && c === me) {
      // Your lap: keep it for the AI to learn from.
      const rec = recorder.finish();
      if (rec) { myRecord = rec; log(`Your lap ${fmt(c.lastLap)} recorded: the AI can learn it (AI learns my line)`); }
      recorder.reset();
    }
    if (c.lap > before && c.lap >= +$('laps').value && !c.finished) { c.finished = true; c.finishTime = time; if (!finished) { finished = true; events.push(`${c.name} wins!`); log(`${c.name} wins!`); } }
  }
  if (me && recorder) recorder.add(me);
  time += DT;
}

// Overtake and incident log.
let lastOrder = [];
function watchEvents() {
  const order = cars.slice().sort((a, b) => (b.finished && a.finished ? a.finishTime - b.finishTime : b.progress - a.progress));
  const ids = order.map((c) => c.id);
  if (lastOrder.length && time > 8) for (let p = 0; p < ids.length; p++) {
    const was = lastOrder.indexOf(ids[p]);
    if (was > p && was - p === 1) { const c = order[p], o = order[p + 1]; if (Math.abs(c.progress - o.progress) > 6) log(`${c.name} passes ${o.name} for P${p + 1}`); }
  }
  lastOrder = ids;
  return order;
}

const fmt = (t) => (t == null ? '—' : `${Math.floor(t / 60)}:${(t % 60).toFixed(3).padStart(6, '0')}`);

// ---- drawing ----
function resize() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
addEventListener('resize', resize); resize();

function draw(order) {
  const W = cv.width, H = cv.height, dpr = devicePixelRatio;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#2a3a22'; g.fillRect(0, 0, W, H);
  if (!L) return;
  const tc = cars[cam.target];
  let rot = 0;
  if (cam.mode === 'follow' && tc) { cam.x += (tc.x - cam.x) * 0.2; cam.z += (tc.z - cam.z) * 0.2; rot = -tc.h - Math.PI / 2; }
  const z = cam.mode === 'follow' ? Math.max(cam.zoom, 2.2) : cam.zoom;
  g.translate(W / 2, H * (cam.mode === 'follow' ? 0.62 : 0.5));
  g.scale(z * dpr, z * dpr);
  g.rotate(rot);
  g.translate(-cam.x, -cam.z);
  // Run-offs, road, kerbs, walls.
  g.fillStyle = '#5a6a4a'; g.fill(trackPaths.runL); g.fill(trackPaths.runR);
  g.fillStyle = '#3a3c42'; g.fill(trackPaths.road, 'evenodd');
  g.lineWidth = 0.25; g.strokeStyle = '#e8e8e8'; g.stroke(trackPaths.edgeL); g.stroke(trackPaths.edgeR);
  g.lineWidth = L.kerbW;
  for (const [a, b, c] of trackPaths.kerbs) { g.strokeStyle = c ? '#d01020' : '#f4f4f2'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  g.lineWidth = 0.6; g.strokeStyle = '#c8c8cc'; g.stroke(trackPaths.wallL); g.stroke(trackPaths.wallR);
  // Start line.
  { const a = L.poseAt(0, L.halfW), b = L.poseAt(0, -L.halfW); g.lineWidth = 1.2; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(a.x, a.z); g.lineTo(b.x, b.z); g.stroke(); }
  // Racing lines.
  if ($('lines').checked) {
    g.lineWidth = 0.25;
    drivers.forEach((d, k) => { if (!d) return; if (!d._path) d._path = linePath(d.copy ? d.myLine.map((v, i) => v * (1 - d.copyBlend) + d.copy.lat[i] * d.copyBlend) : d.myLine); g.strokeStyle = cars[k].colour + 'aa'; g.stroke(d._path); });
    if (myRecord) { g.strokeStyle = '#ffd23f'; g.lineWidth = 0.5; g.stroke(linePath(myRecord.lat)); }
  }
  // Cars.
  for (const c of cars) {
    g.save(); g.translate(c.x, c.z); g.rotate(c.h);
    const l = c.p.length, w = c.p.width;
    g.fillStyle = '#111'; for (const [a, b] of [[l * 0.32, w * 0.5], [l * 0.32, -w * 0.5], [-l * 0.32, w * 0.5], [-l * 0.32, -w * 0.5]]) g.fillRect(a - 0.35, b - 0.25, 0.7, 0.5);
    g.fillStyle = c.colour; g.beginPath(); g.moveTo(l / 2, 0); g.lineTo(l * 0.15, w * 0.35); g.lineTo(-l / 2, w * 0.42); g.lineTo(-l / 2, -w * 0.42); g.lineTo(l * 0.15, -w * 0.35); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.fillRect(l * 0.42, -w * 0.5, 0.25, w);
    if (c === me) { g.strokeStyle = '#fff'; g.lineWidth = 0.25; g.stroke(); }
    g.restore();
  }
  // Labels (screen space, upright).
  g.setTransform(1, 0, 0, 1, 0, 0);
  const toScreen = (x, zz) => { const dx = x - cam.x, dz = zz - cam.z, c = Math.cos(rot), s = Math.sin(rot); return [W / 2 + (dx * c - dz * s) * z * dpr, H * (cam.mode === 'follow' ? 0.62 : 0.5) + (dx * s + dz * c) * z * dpr]; };
  g.font = `${11 * dpr}px system-ui`; g.textAlign = 'center';
  cars.forEach((c, k) => {
    const [sx, sy] = toScreen(c.x, c.z);
    if (sx < -50 || sy < -50 || sx > W + 50 || sy > H + 50) return;
    g.fillStyle = c === me ? '#ffd23f' : '#fff';
    if (cam.mode === 'follow' || cam.zoom > 0.9 || c === me) g.fillText(`${order.indexOf(c) + 1} ${c.name}`, sx, sy - 14 * dpr);
    const d = drivers[k];
    if ($('think').checked && d && d.note && (cam.mode === 'follow' || cam.zoom > 1.5)) { g.fillStyle = d.note.startsWith('OVERTAKE') ? '#52e252' : d.note === 'DEFEND' ? '#ff8000' : d.note === 'MISTAKE' ? '#ff4040' : '#9ad0ff'; g.fillText(d.note, sx, sy - 26 * dpr); }
  });
}

function standings(order) {
  const lead = order[0];
  $('tbl').innerHTML = order.map((c, p) => {
    const k = cars.indexOf(c), d = drivers[k];
    const gap = p === 0 ? `L${Math.max(1, Math.min(c.lap, +$('laps').value))}/${$('laps').value}` : c.finished ? `+${(c.finishTime - lead.finishTime).toFixed(1)}s` : (() => { const g = timeGap(lead, c, time); return g === null ? '' : `+${g.toFixed(1)}s`; })();
    return `<tr class="${c === me ? 'me' : ''} ${k === cam.target ? 'sel' : ''}"><td>${p + 1}</td><td><span class="sw" style="background:${c.colour}"></span> ${c.name}</td><td>${gap}</td><td>${fmt(c.best)}</td><td class="st">${d ? d.note || '' : ''}${c.wallHits ? ' ⚠' + c.wallHits : ''}</td></tr>`;
  }).join('');
}

function hud() {
  const c = cars[cam.target];
  if (!c) { $('hud').textContent = ''; return; }
  $('hud').textContent = `${c.name}  ${Math.round(c.u * 3.6)} km/h  lap ${Math.max(1, Math.min(c.lap, +$('laps').value))}  last ${fmt(c.lastLap)}  best ${fmt(c.best)}  ${c.surface !== 'asphalt' && c.surface !== 'kerb' ? '· ' + c.surface : ''}`;
}

// Main loop: fixed physics steps, sim speed multiplier.
let last = performance.now(), acc = 0, frame = 0;
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (running && !paused) {
    acc += dt * +$('speed').value;
    let n = 0;
    while (acc >= DT && n < 600) { step(); acc -= DT; n++; }
  }
  const order = running ? watchEvents() : [];
  draw(order);
  if (frame++ % 6 === 0 && running) { standings(order); hud(); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Overview zoom to fit the track on first load.
L = tracks[+$('track').value].layout; plan = null; buildTrackPaths();
{ let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (let i = 0; i < L.N; i++) { x0 = Math.min(x0, L.x[i]); x1 = Math.max(x1, L.x[i]); z0 = Math.min(z0, L.z[i]); z1 = Math.max(z1, L.z[i]); } cam.x = (x0 + x1) / 2; cam.z = (z0 + z1) / 2; cam.zoom = Math.min(innerWidth / (x1 - x0), innerHeight / (z1 - z0)) * 0.85; cam.mode = 'overview'; $('cam').textContent = 'Camera: overview'; }
$('track').addEventListener('change', () => { L = tracks[+$('track').value].layout; buildTrackPaths(); running = false; cars = []; drivers = []; let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (let i = 0; i < L.N; i++) { x0 = Math.min(x0, L.x[i]); x1 = Math.max(x1, L.x[i]); z0 = Math.min(z0, L.z[i]); z1 = Math.max(z1, L.z[i]); } cam.x = (x0 + x1) / 2; cam.z = (z0 + z1) / 2; cam.zoom = Math.min(innerWidth / (x1 - x0), innerHeight / (z1 - z0)) * 0.85; cam.mode = 'overview'; log('Press Start race'); });
window.__sim = { get cars() { return cars; }, get drivers() { return drivers; }, start };
