import { formatTime, formatDelta } from './game/lapTimer.js';

const RPM_SEGMENTS = 28;
const $ = (id) => document.getElementById(id);

/** DOM heads-up display + a canvas telemetry panel for inspecting the physics. */
export class Hud {
  constructor() {
    this.el = {
      speed: $('speed'), gear: $('gear'), rpmBar: $('rpm-bar'), lap: $('lap-time'), last: $('last-time'),
      best: $('best-time'), cam: $('cam-mode'), toast: $('toast'), tc: $('tc-light'), abs: $('abs-light'),
      assists: $('chip-assists'), weather: $('chip-weather'), box: $('chip-gearbox'), drive: $('chip-drive'), telemetry: $('telemetry'),
      help: $('help'), pause: $('pause'), shift: $('shift-light'), minimap: $('minimap'),
      delta: $('delta'), board: $('board'), boardTitle: $('board-title'), boardList: $('board-list'),
      ers: $('ers'), ersMode: $('ers-mode'), ersPct: $('ers-pct'), ersBar: $('ers-bar'), ersFill: $('ers-fill'), ersState: $('ers-state'), aero: $('aero-mode'),
      wheel: $('wheel'), wBatt: $('w-batt'), wBattArc: $('w-batt-arc'), wState: $('w-state'), wLeds: $('w-leds'), wGear: $('w-gear'), wMode: $('w-mode'),
      wModebar: $('w-modebar'), wAero: $('w-aero'), wSpd: $('w-spd'), wSpdArc: $('w-spd-arc'), wRpm: $('w-rpm'), wBoost: $('w-boost'), speedo: $('speedo'),
      banner: $('banner'), bannerTag: $('banner-tag'), bannerTime: $('banner-time'), bannerGap: $('banner-gap'),
      towerLap: $('tower-lap'), towerTag: $('tower-tag'), towerList: $('tower-list'), lapNo: $('lap-no'),
    };
    this.sectorEls = [...$('sectors').children];
    this.trackSectors = [null, null, null];
    this.boardTimer = 0;
    this.boardPinned = false;
    this.segments = [];
    for (let i = 0; i < RPM_SEGMENTS; i++) {
      const s = document.createElement('i');
      const f = i / RPM_SEGMENTS;
      s.className = f > 0.86 ? 'red' : f > 0.68 ? 'amber' : '';
      this.el.rpmBar.appendChild(s);
      this.segments.push(s);
    }
    this.wLeds = [];
    for (let i = 0; i < 15; i++) { // F1 wheel shift lights: five green, five red, five blue
      const s = document.createElement('i');
      s.className = i < 5 ? 'g' : i < 10 ? 'r' : 'b';
      this.el.wLeds.appendChild(s);
      this.wLeds.push(s);
    }
    this.cache = {};
    this.toastTimer = 0;
    this.accum = 0;
    this.showTelemetry = false;
    this.ctx = this.el.telemetry.getContext('2d');
    this.gSmooth = { x: 0, y: 0 };
    this.lapNo = 1;
    this.mapColour = '#ffc21a';
  }

  set(key, el, value) {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    el.textContent = value;
  }

  toggleClass(key, el, cls, on) {
    const k = `${key}:${cls}`;
    if (this.cache[k] === on) return;
    this.cache[k] = on;
    el.classList.toggle(cls, on);
  }

  /**
   * The track map, bottom left: the lap as a bare yellow line (no panel), the start/finish line and
   * the sector boundaries numbered. points: world [x, z], evenly spaced round the lap.
   */
  setMinimap(points) {
    const c = this.el.minimap;
    const W = c.width, H = c.height, pad = 30;
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of points) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const k = Math.min((W - pad * 2) / (x1 - x0), (H - pad * 2) / (z1 - z0));
    const ox = pad - x0 * k, oz = (H - (z1 - z0) * k) / 2 - z0 * k; // hug the left edge
    this.mapXform = { k, ox, oz };
    const base = document.createElement('canvas');
    base.width = W; base.height = H;
    const g = base.getContext('2d');
    g.lineJoin = g.lineCap = 'round';
    const P = (i) => { const [x, z] = points[((i % points.length) + points.length) % points.length]; return [x * k + ox, z * k + oz]; };
    const path = () => { g.beginPath(); points.forEach((_, i) => { const [x, y] = P(i); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); };
    path(); g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 11; g.stroke();
    path(); g.strokeStyle = '#f5c518'; g.lineWidth = 5; g.stroke();
    // Sector boundaries: a white tick across the line and the sector's number beside its start.
    const n = points.length, cx = W / 2, cy = H / 2;
    g.font = '800 22px "Titillium Web", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let s = 0; s < 3; s++) {
      const i = Math.round((s * n) / 3), [x, y] = P(i), [ax, ay] = P(i + 2), dx = ax - x, dy = ay - y, d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d, ny = dx / d;
      g.strokeStyle = s === 0 ? '#ffffff' : '#0b0c10'; g.lineWidth = s === 0 ? 5 : 4;
      g.beginPath(); g.moveTo(x - nx * 11, y - ny * 11); g.lineTo(x + nx * 11, y + ny * 11); g.stroke();
      const out = (x - cx) * nx + (y - cy) * ny > 0 ? 1 : -1, tx = x + nx * out * 26, ty = y + ny * out * 26;
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.arc(tx, ty, 13, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.fillText(String(s + 1), tx, ty + 1);
    }
    this.mapBase = base;
  }

  updateMinimap(pos, fwd) {
    if (!this.mapBase || this.accum !== 0) return; // redraw at the HUD's 30 Hz tick
    const g = this.el.minimap.getContext('2d');
    const { k, ox, oz } = this.mapXform;
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);
    g.drawImage(this.mapBase, 0, 0);
    const x = pos.x * k + ox, y = pos.z * k + oz;
    // The car: a dot in its colour with a white ring, a short nub showing the heading.
    const a = Math.atan2(fwd.z, fwd.x);
    g.strokeStyle = '#fff'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); g.lineTo(x + Math.cos(a) * 17, y + Math.sin(a) * 17); g.stroke();
    g.fillStyle = this.mapColour; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill();
    g.lineWidth = 3; g.stroke();
  }

  /**
   * The timing tower, top left: the track's best laps with this session's best slotted in and
   * highlighted. entries: [{ time, carName, team?, colour? }], me: { time, name, colour } or null.
   */
  setTower(tag, entries, me = null) {
    this.el.towerTag.textContent = tag;
    const rows = entries.slice(0, 10).map((e) => ({ ...e, me: false }));
    if (me?.time != null) {
      const at = rows.findIndex((e) => Math.abs(e.time - me.time) < 1e-6);
      if (at >= 0) rows[at].me = true; else rows.push({ time: me.time, carName: me.name, colour: me.colour, me: true });
    }
    rows.sort((a, b) => a.time - b.time);
    let shown = rows.slice(0, 5);
    const mi = rows.findIndex((r) => r.me);
    if (mi >= 5) shown = [...rows.slice(0, 4), rows[mi]];
    const lead = rows[0]?.time;
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    this.el.towerList.innerHTML = shown.length ? shown.map((r) => {
      const pos = rows.indexOf(r) + 1;
      return `<li class="${r.me ? 'me' : ''}"><span class="p">${pos}</span><span class="c" style="background:${esc(r.colour ?? '#8a8e98')}"></span><span class="n">${esc(r.me ? me.name : r.team ?? r.carName ?? '')}</span><span class="t">${pos === 1 ? formatTime(r.time) : '+' + (r.time - lead).toFixed(3)}</span></li>`;
    }).join('') : '<li class="empty"><span></span><span></span><span class="n">No laps yet: set the first time</span><span></span></li>';
  }

  /**
   * The time trial tower: your personal best, the baseline below it (the best lap on this track that
   * isn't yours) with the gap between them, and your last lap against your best.
   */
  setTimeTrial({ pb = null, baseline = null, last = null, colour = '#ffc21a' }) {
    this.el.towerTag.textContent = 'TIME TRIAL';
    const gap = (t, ref) => (ref == null ? formatTime(t) : `${t - ref < 0 ? '-' : '+'}${Math.abs(t - ref).toFixed(3)}`);
    const row = (cls, label, col, val) => `<li class="${cls}"><span class="p"></span><span class="c" style="background:${col}"></span><span class="n">${label}</span><span class="t">${val}</span></li>`;
    this.el.towerList.innerHTML =
      row('me', 'Personal best', colour, pb == null ? 'NO TIME' : formatTime(pb)) +
      row('', 'Baseline', baseline?.colour ?? '#8a8e98', baseline == null ? '—' : pb == null ? formatTime(baseline.time) : gap(baseline.time, pb)) +
      (last != null ? row(pb != null && last <= pb + 1e-6 ? 'pb' : '', 'Last lap', '#5b606b', pb == null || last <= pb + 1e-6 ? formatTime(last) : gap(last, pb)) : '');
  }

  /**
   * The session tower: the session and its clock in the header, then the order (the leader's time,
   * gaps to it below), each car's team colour, code and what it's doing when it has no time yet; the
   * knockout line in qualifying; the player's row highlighted (and shown even outside the top rows).
   * rows: [{ pos, code, colour, time, gap, status, me, out }], cut: the last safe position (or null).
   */
  setSession({ label, clock, flag = '', rows, cut = null, show = 12 }) {
    this.el.towerLap.textContent = label;
    this.el.towerTag.textContent = clock;
    this.el.towerTag.className = flag;
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    let list = rows.slice(0, show);
    const me = rows.find((r) => r.me);
    if (me && !list.includes(me)) list = [...rows.slice(0, show - 1), me];
    const html = list.map((r, k) => {
      const line = cut && r.pos === cut + 1 && list[k - 1]?.pos === cut ? ' cutline' : '';
      const right = r.time != null ? `<span class="t">${esc(r.gap)}</span>` : `<span class="t st">${esc(r.status)}</span>`;
      return `<li class="${r.me ? 'me' : ''}${r.out ? ' ko' : ''}${line}"><span class="p">${r.pos}</span><span class="c" style="background:${esc(r.colour)}"></span><span class="n">${esc(r.code)}${r.time != null && r.status && r.status !== 'GARAGE' ? `<i>${esc(r.status)}</i>` : ''}</span>${right}</li>`;
    }).join('');
    if (html !== this.cache.towerHtml) { this.cache.towerHtml = html; this.el.towerList.innerHTML = html; }
  }

  /** The lap counter in the tower and the timing panel. */
  setLap(n) {
    this.lapNo = n;
    this.el.towerLap.textContent = `LAP ${n}`;
    this.el.lapNo.textContent = `LAP ${n}`;
  }

  setBadge(text) {
    document.getElementById('brand').textContent = text;
  }

  toast(text, seconds = 2.2, kind = '') {
    this.el.toast.textContent = text;
    this.el.toast.className = `show ${kind}`;
    this.toastTimer = seconds;
  }

  /**
   * Leaderboard panel. entries: [{ time, carName }]; highlight: rank to mark.
   * Shown for `seconds` (or pinned until toggled when seconds is 0).
   */
  showBoard(title, entries, highlight = null, seconds = 0) {
    this.el.boardTitle.textContent = `${title.toUpperCase()} · TOP TIMES`;
    const rows = entries.length ? entries.map((e, k) => `<li class="${k + 1 === highlight ? 'me' : ''}"><span>${k + 1}</span><span>${e.carName}</span><span>${formatTime(e.time)}</span></li>`).join('')
      : '<li><span></span><span>No laps yet: set the first time</span><span></span></li>';
    this.el.boardList.innerHTML = rows;
    this.el.board.classList.add('show');
    this.boardTimer = seconds;
    this.boardPinned = seconds === 0;
  }

  toggleBoard(title, entries) {
    if (this.el.board.classList.contains('show') && this.boardPinned) { this.el.board.classList.remove('show'); return; }
    this.showBoard(title, entries);
  }

  /** Cinematic timing banner: kind 'purple' | 'green' | 'yellow', a tag, a time and the gap to the reference. */
  flashTiming(tag, time, gap, kind, lap = false) {
    const b = this.el.banner;
    this.el.bannerTag.textContent = tag;
    this.el.bannerTime.textContent = time;
    this.el.bannerGap.textContent = gap;
    this.el.bannerGap.style.display = gap ? '' : 'none';
    b.className = '';
    void b.offsetWidth; // restart the animation
    b.className = `show ${kind}${lap ? ' lap' : ''}`;
  }

  updateErs(vehicle) {
    const e = vehicle.ers;
    // ERS cars get the steering-wheel dash in place of the speedo strip and the ERS panel.
    this.toggleClass('ersHidden', this.el.ers, 'hidden', true);
    this.toggleClass('wheelHidden', this.el.wheel, 'hidden', !e);
    this.toggleClass('speedoHidden', this.el.speedo, 'hidden', !!e);
    if (!e) return;
    this.updateWheel(vehicle, e);
    const pct = Math.round(e.soc * 100);
    this.el.ersFill.style.width = `${pct}%`;
    this.set('ersPct', this.el.ersPct, `${pct}%`);
    const mode = ['HARVEST', 'BALANCED', 'OVERTAKE'][e.mode];
    this.set('ersMode', this.el.ersMode, mode);
    this.el.ersMode.className = mode.toLowerCase();
    const st = e.deploying ? 'deploy' : e.harvesting ? 'harvest' : '';
    this.set('ersState', this.el.ersState, e.deploying ? (e.soc < 0.08 ? 'CLIPPING' : 'DEPLOY') : e.harvesting ? 'HARVEST' : e.soc < 0.02 ? 'EMPTY' : 'READY');
    this.el.ersState.className = st;
    this.toggleClass('ersD', this.el.ersBar, 'deploy', e.deploying);
    this.toggleClass('ersH', this.el.ersBar, 'harvest', !e.deploying && e.harvesting);
    this.toggleClass('ersL', this.el.ersBar, 'low', e.soc < 0.2);
    const aero = vehicle.cfg.aero.active ? (vehicle.aeroMode > 0.5 ? 'X' : 'Z') : '–';
    this.set('aero', this.el.aero, aero);
    this.toggleClass('aeroX', this.el.aero, 'x', aero === 'X');
  }

  updateWheel(vehicle, e) {
    const pct = Math.round(e.soc * 100), kmh = Math.round(Math.abs(vehicle.forwardSpeed) * 3.6), eng = vehicle.cfg.engine;
    this.set('wBatt', this.el.wBatt, `${pct}%`);
    this.el.wBattArc.setAttribute('stroke-dasharray', `${(e.soc * 75).toFixed(1)} 100`);
    this.el.wBattArc.setAttribute('class', e.soc < 0.2 ? 'low' : e.harvesting && !e.deploying ? 'harvest' : '');
    this.set('wState', this.el.wState, e.deploying ? (e.soc < 0.08 ? 'CLIPPING' : 'DEPLOY') : e.harvesting ? 'HARVEST' : e.soc < 0.02 ? 'EMPTY' : 'READY');
    this.set('wGear', this.el.wGear, vehicle.gearLabel);
    const mode = ['HARVEST', 'BALANCED', 'OVERTAKE'][e.mode];
    this.set('wMode', this.el.wMode, `${mode} MODE`);
    this.el.wMode.className = mode.toLowerCase();
    this.toggleClass('wModebar', this.el.wModebar, 'on', e.mode === 2);
    this.toggleClass('wOT', this.el.wheel, 'overtake', e.mode === 2);
    const x = vehicle.cfg.aero.active && vehicle.aeroMode > 0.5;
    this.set('wAero', this.el.wAero, vehicle.cfg.aero.active ? (x ? 'X MODE' : 'Z MODE') : '');
    this.toggleClass('wAeroX', this.el.wAero, 'x', x);
    this.toggleClass('wX', this.el.wheel, 'xmode', x);
    this.set('wSpd', this.el.wSpd, String(kmh));
    this.el.wSpdArc.setAttribute('stroke-dasharray', `${(Math.min(1, kmh / 360) * 75).toFixed(1)} 100`);
    this.set('wRpm', this.el.wRpm, `${Math.round(vehicle.rpm / 100) * 100} RPM`);
    this.toggleClass('wBoost', this.el.wBoost, 'on', e.deploying);
    // Shift lights fill from the middle of the band to the upshift point, then all flash blue.
    const up = vehicle.cfg.gearbox.upshiftRpm, lo = up * 0.72;
    const lit = Math.max(0, Math.min(15, Math.round(((vehicle.rpm - lo) / (up - lo)) * 15)));
    const flash = vehicle.rpm > up - 120 && vehicle.gearLabel !== 'N' && performance.now() % 160 < 80;
    if (this.cache.wLit !== lit) { this.cache.wLit = lit; this.wLeds.forEach((s, i) => s.classList.toggle('on', i < lit)); }
    this.toggleClass('wFlash', this.el.wLeds, 'flash', flash);
    void eng;
  }

  setWeather(wet) {
    if (this.cache.wet === wet) return;
    this.cache.wet = wet;
    this.el.weather.textContent = wet ? 'WET' : 'DRY';
    this.el.weather.classList.toggle('wet', wet);
  }

  /** The telemetry pop-up: off, or a tab ('physics' | 'lap'). setTelemetry(true) opens the physics tab. */
  setTelemetry(on) {
    this.telemetryTab = on === true ? 'physics' : on || null;
    this.showTelemetry = !!this.telemetryTab && this.telemetryTab !== 'engineer';
    this.el.telemetry.style.display = this.showTelemetry ? 'block' : 'none';
    if (this.engineer) this.engineer.visible = this.telemetryTab === 'engineer';
  }
  /** Cycles the pop-up: physics -> lap -> engineer -> off. */
  nextTelemetry() { const order = ['physics', 'lap', ...(this.engineer ? ['engineer'] : []), null]; this.setTelemetry(order[(order.indexOf(this.telemetryTab) + 1) % order.length]); }

  update(dt, vehicle, laps, cameraName, accel) {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.el.toast.className = '';
    }
    if (this.boardTimer > 0) {
      this.boardTimer -= dt;
      if (this.boardTimer <= 0 && !this.boardPinned) this.el.board.classList.remove('show');
    }
    this.accum += dt;
    if (this.accum < 1 / 30) return;
    const step = this.accum;
    this.accum = 0;

    const kmh = Math.abs(vehicle.forwardSpeed) * 3.6;
    this.set('speed', this.el.speed, String(Math.round(kmh)));
    this.set('gear', this.el.gear, vehicle.gearLabel);

    const eng = vehicle.cfg.engine;
    const frac = Math.max(0, (vehicle.rpm - eng.idleRpm * 0.6) / (eng.limiterRpm - eng.idleRpm * 0.6));
    const lit = Math.round(frac * RPM_SEGMENTS);
    if (this.cache.lit !== lit) {
      this.cache.lit = lit;
      this.segments.forEach((s, i) => s.classList.toggle('on', i < lit));
    }
    const shiftNow = vehicle.rpm > vehicle.cfg.gearbox.upshiftRpm - 250 && vehicle.gearLabel !== 'N';
    this.toggleClass('shift', this.el.shift, 'on', shiftNow && (performance.now() % 160 < 80));

    this.set('lap', this.el.lap, laps.started ? formatTime(laps.time) : '--:--.---');
    this.set('delta', this.el.delta, laps.delta == null ? '\u00a0' : formatDelta(laps.delta));
    this.toggleClass('dA', this.el.delta, 'ahead', laps.delta != null && laps.delta < 0);
    this.toggleClass('dB', this.el.delta, 'behind', laps.delta != null && laps.delta >= 0);
    // Sector chips: the current sector is outlined; finished ones are coloured
    // purple (track record), green (personal best) or yellow (slower).
    const record = this.trackSectors || [];
    this.sectorEls.forEach((el, k) => {
      const t = laps.started && laps.sectors[k] != null ? laps.sectors[k] : null;
      const shown = t ?? (!laps.started || k > laps.sector ? laps.lastSectors[k] : null);
      let cls = '';
      if (shown != null) cls = record[k] != null && shown <= record[k] + 1e-6 ? 'purple' : laps.bestSectors[k] != null && shown <= laps.bestSectors[k] + 1e-6 ? 'green' : 'yellow';
      if (laps.started && k === laps.sector && t == null) cls = 'cur';
      const text = shown != null ? shown.toFixed(1) : `S${k + 1}`;
      if (el.className !== cls) el.className = cls;
      if (el.textContent !== text) el.textContent = text;
    });
    this.set('last', this.el.last, formatTime(laps.last));
    this.set('best', this.el.best, formatTime(laps.best));
    this.set('cam', this.el.cam, cameraName);

    this.toggleClass('tc', this.el.tc, 'on', vehicle.tcActive);
    this.toggleClass('abs', this.el.abs, 'on', vehicle.absActive);
    this.set('assists', this.el.assists, ['RAW', 'SPORT', 'ASSIST'][vehicle.assistLevel]);
    this.toggleClass('assists', this.el.assists, 'off', !vehicle.assists);
    this.set('box', this.el.box, vehicle.automatic ? 'AUTO' : 'MANUAL');
    this.set('drive', this.el.drive, vehicle.layoutLabel);

    this.updateErs(vehicle);
    if (this.showTelemetry) { if (this.telemetryTab === 'lap') this.drawLapTelemetry(laps); else this.drawTelemetry(vehicle, accel, step); this.drawTabs(); }
  }

  /** The pop-up's tabs across the top. */
  drawTabs() {
    const g = this.ctx;
    g.save();
    g.font = '700 11px "Titillium Web", system-ui, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
    [['PHYSICS', 'physics'], ['LAP', 'lap'], ...(this.engineer ? [['ENGINEER', 'engineer']] : [])].forEach(([t, k], i) => {
      const x = 14 + i * 84, on = this.telemetryTab === k;
      g.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,0.4)'; g.fillText(t, x, 14);
      if (on) { g.fillStyle = '#ffc21a'; g.fillRect(x, 23, g.measureText(t).width, 2); }
    });
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.textAlign = 'right'; g.fillText('4 / X: next', g.canvas.width - 12, 14);
    g.restore();
  }

  /**
   * Lap telemetry: the last lap against the reference it was driven against, along the lap. Top: the
   * delta (below the line = up on the reference), green where time was gained, red where it was lost.
   * Below: both laps' speed (derived from the time every 10 m), and the gain or loss per sector.
   */
  drawLapTelemetry(laps) {
    const g = this.ctx, W = g.canvas.width, H = g.canvas.height;
    g.clearRect(0, 0, W, H);
    g.font = '600 11px "Titillium Web", system-ui, sans-serif'; g.textBaseline = 'middle';
    const lap = laps.lastLap;
    if (!lap || !lap.ref) {
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.textAlign = 'center';
      g.fillText(lap ? 'First flying lap: the next one is compared with it' : 'Complete a lap to see where you gain and lose time', W / 2, H / 2);
      return;
    }
    const n = Math.min(lap.trace.length, lap.ref.length), d = [];
    for (let i = 0; i < n; i++) d.push(lap.trace[i] - lap.ref[i]);
    const x0 = 34, x1 = W - 12, X = (i) => x0 + ((x1 - x0) * i) / (n - 1);
    // Delta graph.
    const top = 36, bot = 128, mid = (top + bot) / 2, span = Math.max(0.2, ...d.map(Math.abs)) * 1.15, Y = (v) => mid + (v / span) * (bot - top) / 2;
    g.strokeStyle = 'rgba(255,255,255,0.15)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x0, mid); g.lineTo(x1, mid); g.stroke();
    for (let k = 1; k < 3; k++) { const x = x0 + ((x1 - x0) * k) / 3; g.beginPath(); g.moveTo(x, top - 4); g.lineTo(x, H - 30); g.stroke(); }
    g.lineWidth = 2.2;
    for (let i = 1; i < n; i++) {
      g.strokeStyle = d[i] > d[i - 1] + 1e-4 ? '#ff4d4d' : d[i] < d[i - 1] - 1e-4 ? '#2fd673' : 'rgba(255,255,255,0.6)';
      g.beginPath(); g.moveTo(X(i - 1), Y(d[i - 1])); g.lineTo(X(i), Y(d[i])); g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.textAlign = 'right';
    g.fillText(`+${span.toFixed(2)}`, x0 - 4, bot); g.fillText(`-${span.toFixed(2)}`, x0 - 4, top); g.fillText('Δ', x0 - 4, mid);
    // Speed: this lap (white) over the reference (yellow).
    const sTop = 140, sBot = H - 34, sp = (t) => t.slice(1, n).map((v, i) => 36 / Math.max(1e-3, v - t[i]));
    const a = sp(lap.trace), b = sp(lap.ref), vmax = Math.max(...a, ...b, 50), vmin = Math.min(...a, ...b, vmax - 50);
    const SY = (v) => sBot - ((v - vmin) / (vmax - vmin)) * (sBot - sTop);
    for (const [arr, col, w] of [[b, 'rgba(255,194,26,0.85)', 1.6], [a, '#ffffff', 1.6]]) {
      g.strokeStyle = col; g.lineWidth = w; g.beginPath();
      arr.forEach((v, i) => (i ? g.lineTo(X(i + 0.5), SY(v)) : g.moveTo(X(i + 0.5), SY(v)))); g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.textAlign = 'right';
    g.fillText(`${Math.round(vmax)}`, x0 - 4, sTop + 4); g.fillText(`${Math.round(vmin)}`, x0 - 4, sBot - 2);
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText('km/h', 2, (sTop + sBot) / 2);
    // Per sector: the gain or loss, and the lap's verdict.
    const third = Math.floor((n - 1) / 3);
    for (let k = 0; k < 3; k++) {
      const i0 = k * third, i1 = k === 2 ? n - 1 : (k + 1) * third, gain = d[i1] - d[i0];
      g.fillStyle = gain < 0 ? '#2fd673' : '#ff4d4d'; g.textAlign = 'center';
      g.fillText(`S${k + 1} ${gain < 0 ? '' : '+'}${gain.toFixed(3)}`, (X(i0) + X(i1)) / 2, H - 14);
    }
  }

  drawTelemetry(vehicle, accel, dt) {
    const g = this.ctx;
    const W = g.canvas.width;
    const H = g.canvas.height;
    g.clearRect(0, 0, W, H);
    g.font = '600 11px "Titillium Web", system-ui, sans-serif';
    g.textBaseline = 'middle';

    // Car outline + four tires. Fill = how hard each tire works (1.0 = peak grip).
    const cx = 104;
    const cy = 128;
    drawF1TopView(g, cx, cy);
    const layout = [[-1, -1], [1, -1], [-1, 1], [1, 1]]; // screen: FL top-left (car's left on screen left)
    const nominal = (vehicle.cfg.mass * 9.81) / 4;
    vehicle.wheels.forEach((w, i) => {
      const [sx, sy] = layout[i];
      const x = cx + sx * 42;
      const y = cy + sy * 46;
      const slip = w.inContact ? w.slip : 0;
      g.fillStyle = slipColor(slip, w.inContact);
      g.fillRect(x - 9, y - 18, 18, 36);
      // Load bar beside the tire.
      const load = Math.min(2.2, w.load / nominal);
      g.fillStyle = 'rgba(255,255,255,0.75)';
      const bx = x + sx * 16 - 2;
      g.fillRect(bx, y + 18 - load * 16, 4, load * 16);
      // Force vector in the tire's frame (screen up = forward, left = car's left).
      if (w.inContact && w.load > 1) {
        const k = 22 / nominal;
        const fx = -w.fy * k; // left force -> screen left
        const fy = -w.fx * k;
        const ang = w.steer;
        const rx = fx * Math.cos(ang) + fy * Math.sin(ang);
        const ry = -fx * Math.sin(ang) + fy * Math.cos(ang);
        g.strokeStyle = '#ffffff';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + rx, y + ry);
        g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.textAlign = sx < 0 ? 'right' : 'left';
      const tx = x + sx * 24;
      g.fillText(`${(w.slipAngle * 57.3).toFixed(1)}°`, tx, y - 8);
      g.fillText(`${(w.slipRatio * 100).toFixed(0)}%`, tx, y + 6);
    });

    // G-meter.
    const gx = 244;
    const gy = 92;
    const R = 46;
    g.strokeStyle = 'rgba(255,255,255,0.2)';
    g.lineWidth = 1;
    for (const r of [R, R / 2]) { g.beginPath(); g.arc(gx, gy, r, 0, Math.PI * 2); g.stroke(); }
    g.beginPath(); g.moveTo(gx - R, gy); g.lineTo(gx + R, gy); g.moveTo(gx, gy - R); g.lineTo(gx, gy + R); g.stroke();
    const s = 1 - Math.exp(-12 * dt);
    this.gSmooth.x += (accel.lat - this.gSmooth.x) * s;
    this.gSmooth.y += (accel.long - this.gSmooth.y) * s;
    const px = gx - Math.max(-2, Math.min(2, this.gSmooth.x / 9.81)) * (R / 1.6);
    const py = gy - Math.max(-2, Math.min(2, this.gSmooth.y / 9.81)) * (R / 1.6);
    g.fillStyle = '#ffc21a';
    g.beginPath(); g.arc(px, py, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.textAlign = 'center';
    g.fillText(`${(Math.hypot(this.gSmooth.x, this.gSmooth.y) / 9.81).toFixed(2)} g`, gx, gy + R + 14);

    g.textAlign = 'left';
    const lines = [
      ['β slip', `${(vehicle.slipAngle * 57.3).toFixed(1)}°`],
      ['yaw', `${(vehicle.body.angularVelocity.y * 57.3).toFixed(0)}°/s`],
      ['rpm', `${Math.round(vehicle.rpm)}`],
      ['torque', `${Math.round(vehicle.engineTorque)} Nm`],
      ['steer', `${(vehicle.steerAngle * 57.3).toFixed(1)}°`],
    ];
    lines.forEach(([k, v], i) => {
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.fillText(k, 194, 172 + i * 17);
      g.fillStyle = '#fff';
      g.fillText(v, 240, 172 + i * 17);
    });
  }
}

function slipColor(s, contact) {
  if (!contact) return 'rgba(120,120,140,0.35)';
  if (s < 0.75) return `rgba(60, 220, 130, ${0.35 + s * 0.6})`;
  if (s < 1.05) return 'rgba(255, 200, 40, 0.95)';
  return 'rgba(255, 60, 60, 0.95)';
}

/**
 * A 2026 F1 car from above (nose up), centred on (cx, cy) at the telemetry's scale: front wing, nose,
 * the tub with the cockpit and halo, sidepods, engine cover, floor edges and rear wing. The tyres are
 * drawn over it by the caller at (±42, ±46).
 */
function drawF1TopView(g, cx, cy) {
  const P = (pts) => { g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(cx + x, cy + y) : g.moveTo(cx + x, cy + y))); g.closePath(); };
  g.save();
  g.lineJoin = 'round';
  // Floor (the widest part between the wheels), then the body on top.
  P([[-30, -22], [30, -22], [33, 30], [26, 52], [-26, 52], [-33, 30]]);
  g.fillStyle = 'rgba(255,255,255,0.05)'; g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 1; g.stroke();
  P([[-4, -86], [4, -86], [8, -50], [12, -24], [27, -14], [29, 12], [20, 36], [13, 60], [-13, 60], [-20, 36], [-29, 12], [-27, -14], [-12, -24], [-8, -50]]);
  g.fillStyle = 'rgba(255,255,255,0.09)'; g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.32)'; g.lineWidth = 1.5; g.stroke();
  // Front wing (two elements, endplates) and rear wing.
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.fillRect(cx - 50, cy - 84, 100, 5); g.fillRect(cx - 48, cy - 78, 96, 3);
  g.fillRect(cx - 52, cy - 86, 3, 12); g.fillRect(cx + 49, cy - 86, 3, 12);
  g.fillRect(cx - 34, cy + 64, 68, 7); g.fillRect(cx - 36, cy + 62, 3, 12); g.fillRect(cx + 33, cy + 62, 3, 12);
  // Cockpit opening and the halo over it.
  g.fillStyle = 'rgba(0,0,0,0.45)';
  P([[-6, -18], [6, -18], [7, 4], [-7, 4]]); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(cx, cy - 26); g.lineTo(cx, cy - 18); g.moveTo(cx - 7, cy + 2); g.quadraticCurveTo(cx - 9, cy - 16, cx, cy - 18); g.quadraticCurveTo(cx + 9, cy - 16, cx + 7, cy + 2); g.stroke();
  // Engine cover spine and sidepod inlets.
  g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(cx, cy + 6); g.lineTo(cx, cy + 58); g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(cx - 27, cy - 12, 8, 4); g.fillRect(cx + 19, cy - 12, 8, 4);
  // Suspension arms out to the wheels.
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1;
  g.beginPath();
  for (const s of [-1, 1]) { g.moveTo(cx + s * 9, cy - 52); g.lineTo(cx + s * 33, cy - 46); g.moveTo(cx + s * 11, cy - 40); g.lineTo(cx + s * 33, cy - 44); g.moveTo(cx + s * 14, cy + 44); g.lineTo(cx + s * 33, cy + 46); g.moveTo(cx + s * 16, cy + 52); g.lineTo(cx + s * 33, cy + 48); }
  g.stroke();
  g.restore();
}
