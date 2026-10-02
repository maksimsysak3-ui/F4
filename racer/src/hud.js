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
    this.cache = {};
    this.toastTimer = 0;
    this.accum = 0;
    this.showTelemetry = false;
    this.ctx = this.el.telemetry.getContext('2d');
    this.gSmooth = { x: 0, y: 0 };
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

  /** Track outline for the minimap: world [x, z] points. Drawn once to an offscreen canvas. */
  setMinimap(points) {
    const c = this.el.minimap;
    const W = c.width, H = c.height, pad = 12;
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of points) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const k = Math.min((W - pad * 2) / (x1 - x0), (H - pad * 2) / (z1 - z0));
    const ox = (W - (x1 - x0) * k) / 2 - x0 * k;
    const oz = (H - (z1 - z0) * k) / 2 - z0 * k;
    this.mapXform = { k, ox, oz };
    const base = document.createElement('canvas');
    base.width = W; base.height = H;
    const g = base.getContext('2d');
    g.lineJoin = g.lineCap = 'round';
    const path = () => {
      g.beginPath();
      points.forEach(([x, z], i) => (i ? g.lineTo(x * k + ox, z * k + oz) : g.moveTo(x * k + ox, z * k + oz)));
      g.closePath();
    };
    path(); g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 7; g.stroke();
    path(); g.strokeStyle = 'rgba(243,244,248,0.85)'; g.lineWidth = 3; g.stroke();
    // Start/finish tick.
    const [sx, sz] = points[0];
    g.fillStyle = '#ffc21a';
    g.fillRect(sx * k + ox - 2, sz * k + oz - 5, 4, 10);
    this.mapBase = base;
  }

  updateMinimap(pos, fwd) {
    if (!this.mapBase || this.accum !== 0) return; // redraw at the HUD's 30 Hz tick
    const g = this.el.minimap.getContext('2d');
    const { k, ox, oz } = this.mapXform;
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);
    g.drawImage(this.mapBase, 0, 0);
    const x = pos.x * k + ox, y = pos.z * k + oz;
    const a = Math.atan2(fwd.z, fwd.x);
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.fillStyle = '#ffc21a';
    g.strokeStyle = '#111';
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(7, 0); g.lineTo(-5, -4.5); g.lineTo(-3, 0); g.lineTo(-5, 4.5); g.closePath();
    g.fill(); g.stroke();
    g.restore();
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

  setWeather(wet) {
    this.el.weather.textContent = wet ? 'WET' : 'DRY';
    this.el.weather.classList.toggle('wet', wet);
  }

  setTelemetry(on) {
    this.showTelemetry = on;
    this.el.telemetry.style.display = on ? 'block' : 'none';
  }

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
    this.set('assists', this.el.assists, vehicle.assists ? 'ASSIST' : 'RAW');
    this.toggleClass('assists', this.el.assists, 'off', !vehicle.assists);
    this.set('box', this.el.box, vehicle.automatic ? 'AUTO' : 'MANUAL');
    this.set('drive', this.el.drive, vehicle.awd ? 'AWD' : 'RWD');

    if (this.showTelemetry) this.drawTelemetry(vehicle, accel, step);
  }

  drawTelemetry(vehicle, accel, dt) {
    const g = this.ctx;
    const W = g.canvas.width;
    const H = g.canvas.height;
    g.clearRect(0, 0, W, H);
    g.font = '600 11px "Chakra Petch", system-ui, sans-serif';
    g.textBaseline = 'middle';

    // Car outline + four tires. Fill = how hard each tire works (1.0 = peak grip).
    const cx = 104;
    const cy = 128;
    g.strokeStyle = 'rgba(255,255,255,0.18)';
    g.lineWidth = 1.5;
    roundRect(g, cx - 34, cy - 70, 68, 140, 16);
    g.stroke();
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

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
