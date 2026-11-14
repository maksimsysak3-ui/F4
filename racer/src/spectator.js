import { Vector3 } from 'three';

/**
 * Watching a session from the garage: a TV director over the AI field.
 *
 * Cameras: an onboard (T-cam above the airbox), a chase camera, trackside TV cameras (fixed
 * positions round the lap that pan and zoom on the car) and a helicopter. The director picks the
 * car (a battle — two cars within ~1.2 s of each other on track — first, else a flying lap, else
 * whoever is out) and cuts between the cameras every few seconds; any manual choice hands control
 * to the viewer until they turn the director back on.
 *
 * Keys: ← → car, C camera, A director, Esc back to the garage. The same as buttons on screen.
 */
const CAMS = [['tv', 'TV'], ['onboard', 'Onboard'], ['chase', 'Chase'], ['heli', 'Helicopter']];
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const _p = new Vector3(), _f = new Vector3(), _u = new Vector3(), _l = new Vector3(), _t = new Vector3();

const CSS = `
#spec { position: fixed; inset: 0; pointer-events: none; z-index: 30; font-family: inherit; color: #eef0f4; }
#spec.hidden { display: none; }
#spec .card { position: absolute; left: 22px; bottom: 22px; display: grid; grid-template-columns: 44px 5px auto; min-width: 300px; background: rgba(10,12,18,.86); box-shadow: 0 8px 26px #0008; }
#spec .card .pos { display: grid; place-items: center; background: #f4f5f8; color: #0b0c10; font-weight: 900; font-size: 20px; }
#spec .card .bar { background: var(--c, #e10600); }
#spec .card .who { padding: 8px 14px 9px; }
#spec .card .who b { display: block; font-size: 18px; letter-spacing: 1.5px; text-transform: uppercase; }
#spec .card .who small { display: block; font-size: 11px; letter-spacing: 1.2px; color: #9aa0ad; text-transform: uppercase; }
#spec .card .lap { grid-column: 1 / -1; display: flex; gap: 14px; padding: 6px 12px; border-top: 1px solid #ffffff14; font-size: 12.5px; font-weight: 700; letter-spacing: .8px; font-variant-numeric: tabular-nums; }
#spec .card .lap span { color: #9aa0ad; font-weight: 600; }
#spec .card .lap .st { margin-left: auto; color: #c77dff; }
#spec .battle { position: absolute; left: 50%; top: 22px; transform: translateX(-50%); display: none; align-items: center; gap: 10px; padding: 7px 16px; background: rgba(10,12,18,.86); font-size: 13px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; }
#spec .battle.on { display: flex; }
#spec .battle i { width: 4px; height: 16px; display: inline-block; }
#spec .battle em { font-style: normal; color: #ffd21f; }
#spec .tag { position: absolute; right: 22px; top: 22px; padding: 6px 12px; background: #e10600; font-size: 12px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
#spec .tag small { font-weight: 700; opacity: .8; margin-left: 8px; }
#spec .quiet { position: absolute; left: 50%; top: 42%; transform: translate(-50%, -50%); display: none; text-align: center; background: rgba(10,12,18,.8); padding: 14px 22px; font-size: 14px; letter-spacing: 1.2px; text-transform: uppercase; }
#spec .quiet.on { display: block; }
#spec .ctl { position: absolute; right: 22px; bottom: 22px; display: flex; gap: 6px; pointer-events: auto; }
#spec .ctl button { font: inherit; font-size: 12px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: #eef0f4; background: rgba(10,12,18,.86); border: 1px solid #ffffff22; padding: 8px 12px; cursor: pointer; }
#spec .ctl button:hover { background: #2a2e38; }
#spec .ctl button.on { background: #e10600; border-color: #e10600; }
#spec .ctl button kbd { font: inherit; opacity: .6; margin-left: 6px; }
body.spectating .hud:not(#tower):not(#toast), body.spectating #banner { display: none !important; }
@media (max-width: 720px) { #spec .card { left: 10px; bottom: 64px; min-width: 0; } #spec .ctl { right: 10px; bottom: 10px; } #spec .ctl button kbd { display: none; } }
`;

export class Spectator {
  constructor(camera) {
    this.camera = camera;
    this.active = false;
    this.focus = new Vector3();   // what the camera is looking at (shadows and the sky follow it)
    this.camPos = new Vector3();
    this.audio = { rpm: 4000, throttle: 0, speed: 0, wheels: [], vol: 0 };
    this.onExit = null;
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    const el = (this.el = document.createElement('div'));
    el.id = 'spec'; el.className = 'hidden';
    el.innerHTML = `<div class="tag">Live<small></small></div><div class="battle"></div><div class="quiet"></div>
      <div class="card"><div class="pos"></div><div class="bar"></div><div class="who"><b></b><small></small></div><div class="lap"></div></div>
      <div class="ctl"><button data-k="prev">◀</button><button data-k="next">▶</button><button data-k="cam">Camera<kbd>C</kbd></button><button data-k="auto">Director<kbd>A</kbd></button><button data-k="exit">Garage<kbd>Esc</kbd></button></div>`;
    document.body.appendChild(el);
    this.q = (c) => el.querySelector(c);
    el.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => this.command(b.dataset.k)));
    // Ahead of the game's own keys (capture), and only while watching.
    addEventListener('keydown', (e) => {
      if (!this.active) return;
      const k = { ArrowLeft: 'prev', ArrowRight: 'next', KeyC: 'cam', KeyA: 'auto', Escape: 'exit', Enter: 'exit', Backspace: 'exit' }[e.code];
      if (!k) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (!e.repeat) this.command(k);
    }, { capture: true });
  }

  /** Start watching: run (the WeekendRun), spec (the car spec the field is drawn with). */
  start(run, spec) {
    this.run = run; this.field = run.field; this.L = run.ctx.getTrack().layout; this.ground = run.ctx.getTrack().ground;
    this.carLen = (spec?.wheelbase ?? 2.6) * 1.75 * (spec?.visualScale ?? 1);
    this.fov0 = this.camera.fov; this.near0 = this.camera.near;
    this.camera.near = 0.05; this.camera.updateProjectionMatrix();
    this.buildTvCams();
    this.active = true; this.auto = true;
    this.target = null; this.cam = 'tv'; this.cutT = 0; this.holdT = 0; this.tv = -1; this.snap = true;
    this.el.classList.remove('hidden');
    document.body.classList.add('spectating');
    this.direct(true);
  }
  stop() {
    if (!this.active) return;
    this.active = false;
    this.el.classList.add('hidden');
    document.body.classList.remove('spectating');
    this.camera.fov = this.fov0; this.camera.near = this.near0; this.camera.up.set(0, 1, 0); this.camera.updateProjectionMatrix();
    this.audio.vol = 0;
  }

  command(k) {
    if (k === 'exit') { this.onExit?.(); return; }
    if (k === 'auto') { this.auto = !this.auto; if (this.auto) this.direct(true); return; }
    this.auto = false;
    if (k === 'cam') { const i = CAMS.findIndex(([id]) => id === this.cam); this.setCam(CAMS[(i + 1) % CAMS.length][0]); return; }
    const cars = this.running();
    if (!cars.length) return;
    const i = cars.indexOf(this.target), n = cars.length;
    this.setTarget(cars[((i < 0 ? 0 : i + (k === 'next' ? 1 : -1)) % n + n) % n]);
  }

  /** The cars out of the garage, in timing order. */
  running() {
    const S = this.run.session, order = S ? S.standings() : [];
    const rank = new Map(order.map((r, k) => [r.id, k]));
    return this.field.cars.filter((a) => a.state !== 'garage' && a.state !== 'out').sort((a, b) => (rank.get(a.entry.id) ?? 99) - (rank.get(b.entry.id) ?? 99));
  }
  setTarget(a) { if (a !== this.target) { this.target = a; this.snap = true; this.tv = -1; this.holdT = 0; } }
  setCam(c) { if (c !== this.cam) { this.cam = c; this.snap = true; this.tv = -1; } }

  /** The director: a battle first, then a flying lap, else anyone out there; then a camera. */
  direct(force = false) {
    const cars = this.running();
    if (!cars.length) { this.target = null; return; }
    const L = this.L, best = { score: -1, car: null, battle: null };
    const S = this.run.session, order = S ? S.standings() : [];
    const pos = (a) => order.findIndex((r) => r.id === a.entry.id) + 1 || 22;
    const onTrack = cars.filter((a) => a.state === 'track');
    for (const a of onTrack) {
      // Flying laps matter more, the front of the order more than the back.
      let score = (a.lapType === 'push' ? 4 : a.lapType === 'out' ? 1 : 0.5) + (22 - pos(a)) * 0.08;
      let battle = null;
      for (const b of onTrack) {
        if (b === a) continue;
        let ds = b.car.s - a.car.s;
        if (ds < -L.length / 2) ds += L.length;
        if (ds > L.length / 2) ds -= L.length;
        if (ds > 0 && ds / Math.max(15, a.car.u) < 1.2) { battle = b; score += 6 + (1.2 - ds / Math.max(15, a.car.u)) * 3; break; }
      }
      if (a === this.target) score += 1.5; // a little loyalty: no flicking between equals
      if (score > best.score) Object.assign(best, { score, car: a, battle });
    }
    const pick = best.car ?? cars[0];
    if (force || pick !== this.target) this.setTarget(pick);
    this.battle = best.car === pick ? best.battle : null;
    // A camera: the TV most of the time, onboard in a battle (the chaser's view of the car ahead).
    const r = Math.random(), was = this.cam;
    const next = this.battle ? (r < 0.4 ? 'onboard' : r < 0.75 ? 'tv' : r < 0.9 ? 'chase' : 'heli') : (r < 0.5 ? 'tv' : r < 0.72 ? 'onboard' : r < 0.88 ? 'chase' : 'heli');
    this.setCam(next === was && !force ? (next === 'tv' ? 'onboard' : 'tv') : next);
    this.cutT = 5 + Math.random() * 5;
  }

  /** Trackside cameras round the lap: every ~150 m, on the side with more room, behind the kerbs. */
  buildTvCams() {
    const L = this.L, n = Math.max(8, Math.round(L.length / 150));
    this.tvs = [];
    for (let k = 0; k < n; k++) {
      const s = (k + 0.5) * (L.length / n), i = Math.floor(s / L.ds) % L.N;
      const wl = L.wall?.L?.[i] ?? L.halfW + 12, wr = L.wall?.R?.[i] ?? L.halfW + 12;
      const side = wl >= wr ? 1 : -1, wall = side > 0 ? wl : wr;
      const lat = side * Math.max(L.halfW + 3, Math.min(wall - 1.2, L.halfW + 28));
      const p = L.poseAt(s, lat), y = (this.ground.heightAt(p.x, p.z) ?? p.y ?? 0) + 3.5 + Math.abs(lat) * 0.06;
      this.tvs.push({ s, pos: new Vector3(p.x, y, p.z) });
    }
  }
  /** The trackside camera for a car at s: the next one up the road, kept until the car is well past. */
  tvFor(s) {
    const L = this.L, ahead = (k) => { let d = this.tvs[k].s - s; if (d < -L.length / 2) d += L.length; if (d > L.length / 2) d -= L.length; return d; };
    if (this.tv >= 0 && ahead(this.tv) > -70) return this.tv;
    let best = 0, bd = Infinity;
    for (let k = 0; k < this.tvs.length; k++) { const d = ahead(k); if (d > 15 && d < bd) { bd = d; best = k; } }
    return (this.tv = best);
  }

  update(dt) {
    if (!this.active) return;
    const a = this.target, S = this.run.session;
    if (this.auto) { this.cutT -= dt; if (this.cutT <= 0 || !a || a.state === 'garage') this.direct(); }
    else if (!a || a.state === 'garage' || a.state === 'out') { const cars = this.running(); this.setTarget(cars[0] ?? null); }
    if ((this.uiT = (this.uiT ?? 0) - dt) <= 0 || this.snap) { this.uiT = 0.25; this.overlay(S); } // the captions, four times a second
    if (!this.target) { this.idle(dt); return; }
    const root = this.target.visual.root, cam = this.camera, k = this.carLen;
    root.updateMatrixWorld(true);
    _p.copy(root.position);
    _f.set(0, 0, 1).applyQuaternion(root.quaternion); _u.set(0, 1, 0).applyQuaternion(root.quaternion); _l.crossVectors(_u, _f);
    this.focus.copy(_p);
    let fov = 50, look = _t;
    if (this.cam === 'onboard') {
      // Above the driver's head, on the airbox, rolling and pitching with the car.
      const head = this.target.visual.head;
      if (head) head.getWorldPosition(this.camPos); else this.camPos.copy(_p).addScaledVector(_u, 0.25 * k);
      this.camPos.addScaledVector(_u, 0.08 * k).addScaledVector(_f, -0.05 * k);
      cam.position.copy(this.camPos);
      cam.up.copy(_u);
      look.copy(this.camPos).addScaledVector(_f, 8 * k).addScaledVector(_u, -0.25 * k);
      fov = 64;
    } else if (this.cam === 'chase') {
      const want = _l.set(0, 0, 0).copy(_p).addScaledVector(_f, -2.3 * k).addScaledVector(_u, 0.55 * k);
      if (this.snap) this.camPos.copy(want); else this.camPos.lerp(want, damp(7, dt));
      cam.position.copy(this.camPos); cam.up.set(0, 1, 0);
      look.copy(_p).addScaledVector(_f, 1.2 * k).addScaledVector(_u, 0.15 * k);
      fov = 58;
    } else if (this.cam === 'heli') {
      const want = _l.copy(_p).addScaledVector(_f, -9 * k).add(_t.set(0, 11 * k, 0));
      if (this.snap) this.camPos.copy(want); else this.camPos.lerp(want, damp(1.5, dt));
      cam.position.copy(this.camPos); cam.up.set(0, 1, 0);
      look.copy(_p).addScaledVector(_f, 2 * k);
      fov = 34;
    } else {
      // Trackside: a fixed camera that pans with the car and zooms to keep it a steady size.
      const tv = this.tvs[this.tvFor(this.target.car.s)];
      this.camPos.copy(tv.pos);
      cam.position.copy(this.camPos); cam.up.set(0, 1, 0);
      look.copy(_p).addScaledVector(_f, 0.6 * k);
      const d = this.camPos.distanceTo(_p);
      fov = Math.max(5, Math.min(55, (2 * Math.atan((k * 3.2) / (2 * d)) * 180) / Math.PI));
    }
    if (this.snap) { this.lookAt = (this.lookAt ?? new Vector3()).copy(look); cam.fov = fov; }
    else { this.lookAt.lerp(look, this.cam === 'tv' ? damp(9, dt) : 1); cam.fov += (fov - cam.fov) * damp(this.cam === 'tv' ? 4 : 8, dt); }
    cam.lookAt(this.lookAt);
    cam.updateProjectionMatrix();
    this.snap = false;
    // The watched car's engine (louder the closer the camera).
    const c = this.target.car, u = Math.max(0, c.u), band = 100 / 8, g = Math.min(8, Math.floor(u / band) + 1), frac = Math.min(1, (u - (g - 1) * band) / band);
    const dist = cam.position.distanceTo(_p);
    Object.assign(this.audio, { rpm: 6500 + frac * 5300, throttle: c.throttle ?? 0.5, speed: u, vol: this.cam === 'onboard' ? 1 : Math.max(0.08, Math.min(0.9, 12 / Math.max(1, dist))) });
  }

  /** Nobody out: a wide shot down the start straight, and when the next car leaves. */
  idle(dt) {
    const L = this.L, p = L.poseAt(0, 0), q = L.poseAt(L.length - 80, (L.halfW + 18) * (this.field.sg ?? 1));
    const gy = (x, z, y0) => this.ground.heightAt(x, z) ?? y0 ?? 0;
    this.camera.position.set(q.x, gy(q.x, q.z, q.y) + 12, q.z);
    this.focus.set(p.x, gy(p.x, p.z, p.y), p.z);
    this.camera.up.set(0, 1, 0); this.camera.lookAt(this.focus); this.camera.fov += (40 - this.camera.fov) * damp(3, dt); this.camera.updateProjectionMatrix();
    this.audio.vol = 0;
  }

  overlay(S) {
    const a = this.target, q = this.q;
    q('.tag small').textContent = `${S?.label ?? ''} · ${CAMS.find(([id]) => id === this.cam)?.[1] ?? ''}${this.auto ? ' · Director' : ''}`;
    this.el.querySelector('[data-k="auto"]').classList.toggle('on', this.auto);
    const card = q('.card'), quiet = q('.quiet');
    card.style.display = a ? '' : 'none';
    if (!a) {
      const next = Math.min(...this.field.cars.map((c) => c.nextRunAt ?? Infinity));
      quiet.textContent = S?.state === 'break' ? `${S.label} over · next segment in ${Math.ceil(S.breakLeft)} s` : isFinite(next) && S ? `No cars on track · next run in ${Math.max(0, Math.ceil(next - S.elapsed))} s` : 'No cars on track';
      quiet.classList.add('on'); q('.battle').classList.remove('on');
      return;
    }
    quiet.classList.remove('on');
    const order = S ? S.standings() : [], r = S?.row(a.entry.id), p = order.indexOf(r) + 1;
    const e = a.entry, quali = S?.def.type === 'quali', best = r ? (quali ? r.segBest[S.segment] : r.best) : null;
    card.style.setProperty('--c', e.colour);
    q('.pos').textContent = p || '–';
    q('.who b').textContent = e.name ?? e.code;
    q('.who small').textContent = `${e.team?.name ?? ''}${S?.out.has(e.id) ? ' · knocked out' : ''}`;
    const lapT = a.lapType === 'push' && a.state === 'track' ? this.field.time - (a.lapStart ?? this.field.time) : null;
    const status = a.state === 'pitOut' ? 'Pit exit' : a.state === 'pitIn' || a.state === 'stop' ? 'In the pits' : a.lapType === 'push' ? 'Flying lap' : a.lapType === 'out' ? 'Out lap' : a.lapType === 'in' ? 'In lap' : 'Cool-down';
    q('.lap').innerHTML = `<div><span>Lap</span> ${lapT != null ? fmt(lapT) : '—'}</div><div><span>Best</span> ${best != null ? fmt(best) : '—'}</div><div><span>Tyre</span> ${a.compound ?? 'M'}</div><div class="st">${status}</div>`;
    const bt = q('.battle'), b = this.battle;
    if (b && this.target === a) {
      const rb = S?.row(b.entry.id), pb = order.indexOf(rb) + 1;
      let ds = b.car.s - a.car.s; if (ds < 0) ds += this.L.length;
      bt.innerHTML = `<i style="background:${b.entry.colour}"></i>${b.entry.code}<em>${(ds / Math.max(15, a.car.u)).toFixed(1)} s</em><i style="background:${e.colour}"></i>${e.code}<span style="color:#9aa0ad">· P${pb || '–'} vs P${p || '–'}</span>`;
      bt.classList.add('on');
    } else bt.classList.remove('on');
  }
}
function fmt(t) { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s.toFixed(1).padStart(4, '0')}`; }
