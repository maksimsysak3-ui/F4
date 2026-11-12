import { LAB, TESTS, ISSUE_KIND, sevName } from '../game/lab.js';

/*
 * The development lab's live views, drawn on a canvas:
 *
 *   wind tunnel   the part's section on the rolling road, smoke lines and seeded particles flowing over
 *                 it (a cheap flow field: the air follows each element's surface, turns up behind a
 *                 loaded wing, never goes through a body), separated flow in red where a test found it
 *   CFD           the pressure field round the section (blue suction, red pressure), converging from noise
 *                 while the residuals fall, streamlines on top
 *   rig / dyno    live traces: the 7-post rig's ride heights over a kerb sequence, the torsion rig, brake
 *                 temperatures over a lap, the power unit's power curve and knock
 *   simulator     the next circuit's speed trace, the new part against the old, and the driver's notes
 *
 * mountLab(canvas) -> { set(state), destroy() }; state = { slot, x (geometry), kind, issues (found:
 * numbered markers), progress (0..1 while a test runs, else null), figures, accent, sim { delta, track } }.
 */

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const nrm = (slot, x) => Object.fromEntries(LAB[slot].params.map((p) => [p.key, (x[p.key] - p.min) / (p.max - p.min)]));
const rad = (d) => (d * Math.PI) / 180;

/** An aerofoil section (inverted: the trailing edge rises with angle), as a polygon, plus its flow element. */
function foil(lx, ly, chord, angle, camber = 0.06, th = 0.1, load = 0.5) {
  const a = rad(angle), c = Math.cos(a), s = Math.sin(a), up = [], lo = [];
  for (let k = 0; k <= 16; k++) {
    const t = k / 16, yt = th * chord * (1.4845 * Math.sqrt(t) - 0.63 * t - 1.758 * t * t + 1.4215 * t ** 3 - 0.5075 * t ** 4) * 0.5;
    const yc = -camber * chord * 4 * t * (1 - t);                  // inverted camber: bulges down
    up.push([t * chord, yc + yt]); lo.push([t * chord, yc - yt]);
  }
  const P = [...up, ...lo.reverse()].map(([u, v]) => [lx + u * c - v * s, ly + u * s + v * c]);
  return { poly: P, el: { ax: lx, ay: ly, bx: lx + chord * c, by: ly + chord * s, th: th * chord * 0.35, load } };
}
const seg = (ax, ay, bx, by, th = 0.012, load = 0) => ({ ax, ay, bx, by, th, load });

/** The section of each part in the tunnel (world: x right 0..2.1, y up 0..1), its flow elements and where each parameter lives. */
function sectionOf(slot, n) {
  const polys = [], els = [], deco = [];
  let ground = 0.1, anchors = {};
  if (slot === 'frontWing') {
    ground = 0.12;
    const m = foil(0.42, 0.24, 0.46, 2 + n.camber * 6, 0.03 + n.camber * 0.07, 0.11, 0.6 + n.camber * 0.4);
    const f1 = foil(0.86, 0.27 + 0.01, 0.22, 12 + n.flap * 30, 0.06, 0.1, 0.5 + n.flap * 0.5);
    const tx1 = f1.el.bx - 0.02, ty1 = f1.el.by + 0.015;
    const f2 = foil(tx1, ty1, 0.17, 22 + n.flap * 42, 0.07, 0.1, 0.5 + n.flap * 0.6);
    for (const f of [m, f1, f2]) { polys.push(f.poly); els.push(f.el); }
    deco.push({ kind: 'endplate', x0: 0.38, x1: 1.12, y0: ground + 0.02, y1: 0.62, skew: n.endplate });
    deco.push({ kind: 'tyre', x: 1.62, y: ground + 0.33, r: 0.33 });
    anchors = { flap: [f2.el.bx, f2.el.by], camber: [0.62, m.el.ay - 0.04], endplate: [1.12, 0.5 + n.endplate * 0.06] };
  } else if (slot === 'rearWing') {
    ground = 0.06;
    const m = foil(0.55, 0.6, 0.48, 3 + n.aoa * 14, 0.06, 0.11, 0.5 + n.aoa * 0.5);
    const g = 0.018 + n.gap * 0.045;
    const f = foil(m.el.bx - 0.05, m.el.by + g, 0.34, 26 + n.aoa * 26, 0.08, 0.1, 0.5 + n.aoa * 0.4);
    const b = foil(0.85, 0.27, 0.28, 4 + n.beam * 22, 0.05, 0.12, 0.3 + n.beam * 0.6);
    for (const x of [m, f, b]) { polys.push(x.poly); els.push(x.el); }
    polys.push([[0, 0.12], [0.95, 0.12], [1.5, 0.3], [1.5, 0.33], [0.95, 0.16], [0, 0.16]]);
    els.push(seg(0, 0.14, 0.95, 0.14, 0.02), seg(0.95, 0.14, 1.5, 0.31, 0.02, 0.4));
    deco.push({ kind: 'endplate', x0: 0.5, x1: 1.25, y0: 0.45, y1: 0.92, skew: 0.3 });
    anchors = { aoa: [m.el.bx, m.el.by - 0.02], gap: [m.el.bx - 0.02, m.el.by + g * 0.5], beam: [b.el.bx, b.el.by] };
  } else if (slot === 'floor') {
    ground = 0.08;
    const gap = 0.025 + n.ride * 0.09, thr = 0.02 + n.throat * 0.08;
    const yEnt = ground + gap + 0.11, yThr = ground + gap * 0.6 + thr * 0.5, yEx = ground + gap + 0.3;
    const under = [[0.15, yEnt], [0.45, yEnt - 0.04], [0.9, yThr], [1.25, yThr + 0.03], [1.75, yEx]];
    polys.push([...under, [1.75, 0.62], [0.15, 0.62]]);
    for (let k = 0; k < under.length - 1; k++) els.push(seg(...under[k], ...under[k + 1], 0.015, [0.3, 0.8, 1, 0.7][k] * (0.6 + (1 - n.throat) * 0.5)));
    const e = foil(0.3, 0.66, 0.2, 8 + n.edge * 30, 0.05, 0.1, 0.3 + n.edge * 0.5);
    polys.push(e.poly); els.push(e.el);
    anchors = { ride: [0.9, yThr - 0.02], throat: [1.05, yThr + 0.01], edge: [e.el.bx, e.el.by] };
  } else if (slot === 'sidepods') {
    ground = 0.1;
    const mouth = 0.07 + n.inlet * 0.13, top = 0.66, lip = top - mouth;
    const uc = 0.22 + (1 - n.undercut) * 0.15, rampDrop = 0.06 + n.ramp * 0.28;
    const upper = [[0.42, top], [0.95, top + 0.03], [1.25, top + 0.02], [1.95, top + 0.02 - rampDrop]];
    const lower = [[1.95, 0.2], [1.3, 0.2], [1.0, uc], [0.62, lip - 0.12], [0.46, lip]];
    polys.push([...upper, ...lower]);
    for (let k = 0; k < upper.length - 1; k++) els.push(seg(...upper[k], ...upper[k + 1], 0.015, k === 2 ? 0.3 : 0));
    els.push(seg(0.46, lip, 0.62, lip - 0.12, 0.015), seg(0.62, lip - 0.12, 1.0, uc, 0.015), seg(1.0, uc, 1.3, 0.2, 0.015));
    deco.push({ kind: 'inlet', x: 0.43, y0: lip, y1: top });
    anchors = { inlet: [0.44, (lip + top) / 2], undercut: [1.0, uc - 0.02], ramp: [1.6, top + 0.02 - rampDrop * 0.55] };
  } else {   // brakes: the front corner, a duct feeding the disc inside the wheel
    ground = 0.06;
    const ds = 0.06 + n.duct * 0.1;
    deco.push({ kind: 'wheel', x: 1.2, y: 0.46, r: 0.38, disc: 0.17, holes: n.holes, pad: n.pad });
    polys.push([[0.62, 0.46 + ds], [0.95, 0.46 + ds * 0.45], [0.95, 0.46 - ds * 0.45], [0.62, 0.46 - ds], [0.66, 0.46 - ds * 0.7], [0.66, 0.46 + ds * 0.7]]);
    els.push(seg(0.62, 0.46 + ds, 0.95, 0.46 + ds * 0.45, 0.012), seg(0.62, 0.46 - ds, 0.95, 0.46 - ds * 0.45, 0.012));
    anchors = { duct: [0.64, 0.46 + ds], holes: [1.2, 0.46], pad: [1.2, 0.46 + 0.19] };
  }
  // Round obstacles the air goes round (the tyre behind the front wing, the wheel round the brake).
  const circles = deco.filter((x) => x.kind === 'tyre' || x.kind === 'wheel').map((x) => ({ x: x.x, y: x.y, r: x.r }));
  return { polys, els, deco, ground, anchors, circles };
}

/** The flow at a point: the air follows the surfaces, is turned up behind loaded elements and kept out of bodies. */
function flowAt(sec, x, y) {
  let u = 1, v = 0;
  for (const e of sec.els) {
    const dx = e.bx - e.ax, dy = e.by - e.ay, L = Math.hypot(dx, dy), tx = dx / L, ty = dy / L, rx = x - e.ax, ry = y - e.ay;
    const t = (rx * tx + ry * ty) / L, d = -rx * ty + ry * tx, ad = Math.abs(d);
    const win = clamp(Math.min(t + 0.3, 1.2 - t) * 4, 0, 1);
    v += win * Math.exp(-ad / (0.05 + e.th)) * (ty / Math.max(0.2, tx)) * 0.95;
    if (t > -0.03 && t < 1.03 && ad < e.th + 0.012) v += Math.sign(d || 1) * (e.th + 0.012 - ad) * 30;
    if (t > 1) v += e.load * 0.55 * Math.exp(-(t - 1) * 1.6) * Math.exp(-ad / 0.16);
    if (t > 0 && t < 1 && d < 0) u += e.load * 0.35 * Math.exp(-ad / 0.05);   // faster on the suction side
  }
  for (const c of sec.circles) {
    const dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy), R1 = c.r * 1.35;
    if (d < R1 && d > 1e-6) { const f = (R1 - d) / (R1 - c.r * 0.9); v += (dy / d) * clamp(f, 0, 1.4) * 2.2; u *= 1 - clamp(f, 0, 1) * 0.5; }
  }
  if (y < sec.ground + 0.02) v = Math.max(v, 0.2);
  return [u, v];
}

const JET = [[0, [70, 30, 160]], [0.25, [40, 110, 255]], [0.45, [40, 220, 230]], [0.6, [120, 240, 90]], [0.78, [255, 220, 40]], [1, [255, 50, 30]]];
function jet(t) {
  t = clamp(t, 0, 1);
  for (let k = 1; k < JET.length; k++) if (t <= JET[k][0]) {
    const [a, ca] = JET[k - 1], [b, cb] = JET[k], f = (t - a) / (b - a);
    return ca.map((c, i) => Math.round(c + (cb[i] - c) * f));
  }
  return JET[JET.length - 1][1];
}

export function mountLab(canvas, opts = {}) {
  const g = canvas.getContext('2d');
  let st = null, sec = null, zones = [], parts = [], raf = 0, t0 = performance.now(), cfdCache = null, cfdKey = '';
  const W = () => canvas.width, H = () => canvas.height;
  const toPx = (x, y) => [x * H(), H() - y * H()];          // world unit = canvas height

  function set(state) {
    const prevKey = st ? `${st.slot}|${JSON.stringify(st.x)}|${st.kind}` : '';
    st = state;
    if (['tunnel', 'cfd'].includes(st.kind)) {
      sec = sectionOf(st.slot, nrm(st.slot, st.x));
      zones = (st.issues ?? []).filter((is) => ['flow', 'wake', 'porpoise', 'thermal'].includes(is.kind)).map((is) => {
        const [ax, ay] = sec.anchors[is.key] ?? [1, 0.5];
        return { x: ax + 0.1, y: ay, r: 0.07 + Math.min(0.12, is.sev * 0.05), sev: is.sev };
      });
      if (`${st.slot}|${JSON.stringify(st.x)}|${st.kind}` !== prevKey) parts = [];
    }
    cfdKey = '';
  }

  // ---- the wind tunnel ----
  function tunnel(time, dt) {
    const w = W(), h = H(), span = w / h;
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#0a1220'); bg.addColorStop(1, '#05080f');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff0d'; g.lineWidth = 1;
    for (let x = 0; x < span; x += 0.1) { const [px] = toPx(x, 0); g.beginPath(); g.moveTo(px, 0); g.lineTo(px, h); g.stroke(); }
    for (let y = 0; y < 1; y += 0.1) { const [, py] = toPx(0, y); g.beginPath(); g.moveTo(0, py); g.lineTo(w, py); g.stroke(); }
    // The rolling road.
    const [, gy] = toPx(0, sec.ground);
    g.fillStyle = '#10161f'; g.fillRect(0, gy, w, h - gy);
    g.fillStyle = '#ffffff22';
    const off = (time * 0.9 * h) % 40;
    for (let x = -off; x < w; x += 40) g.fillRect(x, gy + 3, 20, 2);
    // Decorations behind: endplates, the tyre, the wheel.
    for (const dcr of sec.deco) {
      if (dcr.kind === 'endplate') { const [x0, y0] = toPx(dcr.x0, dcr.y1), [x1, y1] = toPx(dcr.x1, dcr.y0); g.fillStyle = '#ffffff08'; g.strokeStyle = '#ffffff22'; g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.fill(); g.stroke(); }
      if (dcr.kind === 'tyre') { const [x, y] = toPx(dcr.x, dcr.y); g.fillStyle = '#16181c'; g.beginPath(); g.arc(x, y, dcr.r * h, 0, 7); g.fill(); g.strokeStyle = '#2a2e35'; g.lineWidth = 10; g.stroke(); g.lineWidth = 1; }
      if (dcr.kind === 'wheel') {
        const [x, y] = toPx(dcr.x, dcr.y);
        g.fillStyle = '#121418'; g.beginPath(); g.arc(x, y, dcr.r * h, 0, 7); g.fill(); g.strokeStyle = '#2b2f37'; g.lineWidth = 14; g.stroke(); g.lineWidth = 1;
        const temp = clamp(((st.figures?.temp ?? 1000) - 500) / 700, 0, 1), c = jet(0.55 + temp * 0.45);
        const rg = g.createRadialGradient(x, y, 4, x, y, dcr.disc * h); rg.addColorStop(0, '#1b1b1b'); rg.addColorStop(1, `rgba(${c},${0.35 + temp * 0.6})`);
        g.fillStyle = rg; g.beginPath(); g.arc(x, y, dcr.disc * h, 0, 7); g.fill();
        g.fillStyle = '#00000088'; const nh = 10 + Math.round(dcr.holes * 14);
        for (let k = 0; k < nh; k++) { const a = (k / nh) * 6.283 + time * 2; g.beginPath(); g.arc(x + Math.cos(a) * dcr.disc * h * 0.7, y + Math.sin(a) * dcr.disc * h * 0.7, 2, 0, 7); g.fill(); }
        g.fillStyle = st.accent; g.fillRect(x - 14, y - dcr.disc * h - 12, 28, 16);
      }
      if (dcr.kind === 'inlet') { const [x, y0] = toPx(dcr.x, dcr.y1), [, y1] = toPx(dcr.x, dcr.y0); const gr = g.createLinearGradient(x, 0, x + 60, 0); gr.addColorStop(0, '#ff6a0055'); gr.addColorStop(1, '#ff6a0000'); g.fillStyle = gr; g.fillRect(x, y0, 60, y1 - y0); }
    }
    // Smoke lines from the rake.
    for (let k = 0; k < 16; k++) {
      let x = 0.02, y = sec.ground + 0.03 + k * 0.058;
      g.beginPath(); g.moveTo(...toPx(x, y));
      let hot = false;
      for (let s = 0; s < 220 && x < span; s++) {
        const [u, v] = flowAt(sec, x, y);
        let jx = 0, jy = 0;
        for (const z of zones) if (Math.hypot(x - z.x, y - z.y) < z.r) { hot = true; jy = Math.sin(time * 9 + s * 0.7 + k) * 0.012 * z.sev; jx = Math.cos(time * 7 + s) * 0.004; }
        x += u * 0.012 + jx; y += v * 0.012 + jy;
        g.lineTo(...toPx(x, y));
      }
      g.strokeStyle = hot ? 'rgba(255,130,110,0.55)' : 'rgba(225,238,255,0.42)'; g.lineWidth = 1.6; g.stroke();
    }
    // Seeded particles.
    while (parts.length < 240) parts.push({ x: Math.random() * span, y: sec.ground + 0.02 + Math.random() * 0.95, a: Math.random() });
    g.lineWidth = 2;
    for (const p of parts) {
      let [u, v] = flowAt(sec, p.x, p.y), turb = 0;
      for (const z of zones) { const d = Math.hypot(p.x - z.x, p.y - z.y); if (d < z.r) { turb = Math.max(turb, 1 - d / z.r); } }
      if (turb) { u *= 1 - turb * 0.65; v += (Math.random() - 0.5) * 3 * turb; }
      const sp = 0.45 * dt * (st.progress != null ? 1.4 : 1), ox = p.x, oy = p.y;
      p.x += u * sp; p.y += v * sp;
      if (p.x > span || p.y > 1.05 || p.y < sec.ground) { p.x = 0; p.y = sec.ground + 0.02 + Math.random() * 0.95; continue; }
      const spd = Math.hypot(u, v);
      g.strokeStyle = turb ? `rgba(255,${Math.round(110 - turb * 80)},70,0.8)` : `rgba(${Math.round(90 + spd * 60)},${Math.round(200 + spd * 30)},255,${0.35 + spd * 0.2})`;
      const [ax, ay] = toPx(p.x, p.y), l = Math.hypot(p.x - ox, p.y - oy) || 1, len = 7 + spd * 5;
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax - ((p.x - ox) / l) * len, ay + ((p.y - oy) / l) * len); g.stroke();
    }
    drawBody();
  }
  function drawBody() {
    for (const P of sec.polys) {
      g.beginPath(); P.forEach(([x, y], k) => (k ? g.lineTo(...toPx(x, y)) : g.moveTo(...toPx(x, y)))); g.closePath();
      const [x0, y0] = toPx(P[0][0], P[0][1]); const gr = g.createLinearGradient(x0, y0 - 30, x0, y0 + 30); gr.addColorStop(0, '#6b7380'); gr.addColorStop(0.5, '#3a404b'); gr.addColorStop(1, '#1d2128');
      g.fillStyle = gr; g.fill(); g.strokeStyle = st.accent; g.lineWidth = 1.5; g.stroke();
    }
  }

  // ---- CFD ----
  function cfd(time) {
    const w = W(), h = H(), span = w / h, cell = 6;
    const conv = st.progress != null ? st.progress : 1, key = `${w}x${h}|${JSON.stringify(st.x)}|${zones.length}|${Math.round(conv * 12)}`;
    if (key !== cfdKey) {
      cfdKey = key;
      cfdCache ??= document.createElement('canvas');
      cfdCache.width = Math.ceil(w / cell); cfdCache.height = Math.ceil(h / cell);
      const c2 = cfdCache.getContext('2d'), img = c2.createImageData(cfdCache.width, cfdCache.height);
      for (let j = 0; j < cfdCache.height; j++) for (let i = 0; i < cfdCache.width; i++) {
        const x = ((i + 0.5) * cell) / h, y = 1 - ((j + 0.5) * cell) / h;
        const [u, v] = flowAt(sec, x, y);
        let cp = 1 - (u * u + v * v);
        for (const e of sec.els) {
          const dx = e.bx - e.ax, dy = e.by - e.ay, L = Math.hypot(dx, dy), t = ((x - e.ax) * dx + (y - e.ay) * dy) / (L * L), d = (-(x - e.ax) * dy + (y - e.ay) * dx) / L;
          if (t > -0.05 && t < 1.05) cp += (d < 0 ? -1.8 : 0.9) * (e.load + 0.15) * Math.exp(-Math.abs(d) / 0.07) * (1 - Math.abs(t - 0.3) * 0.6);
        }
        for (const z of zones) { const dd = Math.hypot(x - z.x, y - z.y); if (dd < z.r * 1.3) cp = cp * 0.3 + Math.sin(i * 1.7 + j * 2.3) * 0.25; }
        const noise = (Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1;
        const val = clamp(0.56 + cp * 0.42, 0, 1) * conv + Math.abs(noise) * (1 - conv);
        const col = y < sec.ground ? [16, 20, 28] : jet(val), o = (j * cfdCache.width + i) * 4;
        img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
      }
      c2.putImageData(img, 0, 0);
    }
    g.imageSmoothingEnabled = true; g.drawImage(cfdCache, 0, 0, w, h);
    // Streamlines.
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
    for (let k = 0; k < 22; k++) {
      let x = 0.01, y = sec.ground + 0.02 + k * 0.043;
      g.beginPath(); g.moveTo(...toPx(x, y));
      for (let s = 0; s < 200 && x < span; s++) { const [u, v] = flowAt(sec, x, y); x += u * 0.012; y += v * 0.012; g.lineTo(...toPx(x, y)); }
      g.stroke();
    }
    drawBody();
    // The colour scale and the residuals.
    const sx = w - 190, sy = 16;
    for (let k = 0; k < 150; k++) { g.fillStyle = `rgb(${jet(k / 150)})`; g.fillRect(sx + k, sy, 1, 8); }
    g.fillStyle = '#ffffffcc'; g.font = '600 10px Titillium Web, sans-serif'; g.fillText('Cp  −2.0', sx, sy + 21); g.fillText('+1.0', sx + 128, sy + 21);
    const rx = 16, ry = h - 86, rw = 170, rh = 66;
    g.fillStyle = '#000000aa'; g.fillRect(rx, ry, rw, rh); g.strokeStyle = '#ffffff33'; g.strokeRect(rx, ry, rw, rh);
    const iters = Math.round(conv * 3000);
    ['#ff6b5a', '#5fd38a', '#5aa9ff'].forEach((c, q) => {
      g.strokeStyle = c; g.beginPath();
      for (let k = 0; k <= 60 * conv; k++) { const yy = ry + 8 + (1 - Math.exp(-k / (14 + q * 4))) * (rh - 18) + Math.sin(k * 1.3 + q) * 2; k ? g.lineTo(rx + 6 + k * 2.6, yy) : g.moveTo(rx + 6, yy); }
      g.stroke();
    });
    g.fillStyle = '#ffffffcc'; g.fillText(`Residuals · ${iters} iterations`, rx + 6, ry + rh - 4);
  }

  // ---- traces (rig, dyno, simulator) ----
  function axes(x, y, w, h, xl, yl) {
    g.strokeStyle = '#ffffff30'; g.lineWidth = 1; g.strokeRect(x, y, w, h);
    g.strokeStyle = '#ffffff10';
    for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(x, y + (h * k) / 5); g.lineTo(x + w, y + (h * k) / 5); g.stroke(); }
    g.fillStyle = '#ffffff99'; g.font = '600 11px Titillium Web, sans-serif'; g.fillText(yl, x + 6, y + 14); g.fillText(xl, x + w - g.measureText(xl).width - 6, y + h - 6);
  }
  function line(pts, color, width = 2) { g.strokeStyle = color; g.lineWidth = width; g.beginPath(); pts.forEach(([a, b], k) => (k ? g.lineTo(a, b) : g.moveTo(a, b))); g.stroke(); }
  function hline(x, y, w, color, label) { g.setLineDash([6, 5]); line([[x, y], [x + w, y]], color, 1.2); g.setLineDash([]); if (label) { g.fillStyle = color; g.fillText(label, x + w - g.measureText(label).width - 6, y - 5); } }

  function traces(time) {
    const w = W(), h = H(), n = nrm(st.slot, st.x), live = st.progress != null ? st.progress : 1;
    if (opts.hud) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(4,7,12,0.72)'; g.fillRect(0, 0, w, h); } else { g.fillStyle = '#070b12'; g.fillRect(0, 0, w, h); }
    const X = 14, Y = opts.hud ? 14 : 40, CW = w - 28, CH = h - (opts.hud ? 28 : 70), N = Math.floor(240 * live);
    const has = (key, side) => (st.issues ?? []).some((is) => is.key === key && (!side || is.side === side));
    if (st.kind === 'cfdres') {   // CFD residuals: the solution converging
      axes(X, Y, CW, CH, `${Math.round(live * 3000)} iterations`, 'Residuals (log)');
      ['#ff6b5a', '#5fd38a', '#5aa9ff', '#ffc247'].forEach((c, q) => { const pts = []; for (let k = 0; k <= N; k++) pts.push([X + (k / 240) * CW, Y + 10 + (1 - Math.exp(-k / (30 + q * 9))) * (CH - 24) + Math.sin(k * 1.3 + q * 2) * 3 * (1 - k / 240)]); line(pts, c, 1.6); });
    } else if (st.kind === 'rig' && st.slot === 'suspension') {
      axes(X, Y, CW, CH, 'Time · 7-post rig, kerb sequence', 'Ride height (mm)');
      const k = 0.5 + n.spring * 2, c = 0.15 + n.damp * 1.2;
      for (const [col, ph, lim] of [['#5aa9ff', 0, true], [st.accent, 0.4, false]]) {
        let z = 0, vz = 0; const pts = [];
        for (let i = 0; i < N; i++) {
          const inp = (i % 60 > 8 && i % 60 < 14 ? 1 : 0) * (i % 120 < 60 ? 1 : 0.6);
          const a = k * (inp - z) * 4 - c * vz * 3; vz += a * 0.05; z += vz * 0.05;
          pts.push([X + (i / 240) * CW, Y + CH * 0.5 - (z * (1.2 - n.spring * 0.5)) * CH * 0.22 + ph * 30]);
        }
        line(pts, col);
      }
      hline(X, Y + CH * 0.86, CW, '#ff6b5a', 'Floor contact');
    } else if (st.kind === 'rig') {   // chassis torsion rig
      axes(X, Y, CW * 0.62, CH, 'Twist (°)', 'Torque (kNm)');
      const stiff = 30 + n.stiff * 30 * (0.8 + n.plies * 0.3), pts = [];
      for (let i = 0; i <= N; i++) { const tw = (i / 240) * 1.2; pts.push([X + (tw / 1.2) * CW * 0.62, Y + CH - (tw * stiff / 70) * CH]); }
      line(pts, st.accent, 2.5);
      const tgt = []; for (let i = 0; i <= 10; i++) { const tw = (i / 10) * 1.2; tgt.push([X + (tw / 1.2) * CW * 0.62, Y + CH - (tw * 45 / 70) * CH]); }
      g.setLineDash([6, 5]); line(tgt, '#ffffff66', 1.2); g.setLineDash([]);
      const bx = X + CW * 0.66, tests = [['Front impact', !has('plies', 'lo')], ['Side impact', !has('plies', 'lo')], ['Roll hoop load', true], ['Torsion target', !has('stiff')], ['Mass target', !has('plies', 'hi')]];
      g.font = '700 13px Titillium Web, sans-serif';
      tests.forEach(([name, ok], i) => { const yy = Y + 26 + i * 34, shown = live > (i + 1) / (tests.length + 1); g.fillStyle = '#ffffffcc'; g.fillText(name, bx, yy); g.fillStyle = !shown ? '#ffffff44' : ok ? '#5fd38a' : '#ff6b5a'; g.fillText(!shown ? '…' : ok ? 'PASS' : 'FAIL', bx + CW * 0.26, yy); });
    } else if (st.kind === 'dyno' && st.slot === 'brakes') {
      axes(X, Y, CW, CH, 'One lap of braking events', 'Disc temperature (°C)');
      const peak = st.figures?.temp ?? 1000, pts = [];
      let T = 450;
      for (let i = 0; i < N; i++) { const brake = i % 40 < 6; T += brake ? (peak - T) * 0.35 : -(T - 380) * 0.04; pts.push([X + (i / 240) * CW, Y + CH - ((T - 200) / 1100) * CH]); }
      line(pts, st.accent, 2);
      hline(X, Y + CH - ((1100 - 200) / 1100) * CH, CW, '#ff6b5a', 'Fade 1100 °C');
      hline(X, Y + CH - ((400 - 200) / 1100) * CH, CW, '#5aa9ff', 'Glazing 400 °C');
    } else if (st.kind === 'dyno') {   // power unit
      axes(X, Y, CW, CH, 'rpm 6000 – 13000', 'Power (kW)');
      const kw = st.figures?.kw ?? 800, pts = [];
      for (let i = 0; i < N; i++) { const r = i / 240, p = kw * (0.55 + 0.5 * Math.sin(r * 2.1) - (n.turbo < 0.35 ? 0.12 * r * r : 0) - (n.turbo > 0.65 ? 0.15 * Math.exp(-r * 6) : 0)); pts.push([X + r * CW, Y + CH - (p / 950) * CH]); }
      line(pts, st.accent, 2.5);
      if (has('cr', 'hi')) for (let i = 120; i < N; i += 23) { const r = i / 240; g.fillStyle = '#ff6b5a'; g.beginPath(); g.arc(X + r * CW, Y + CH - (kw * (0.55 + 0.5 * Math.sin(r * 2.1)) / 950) * CH, 4, 0, 7); g.fill(); }
      g.fillStyle = '#ff6b5a'; if (has('cr', 'hi')) g.fillText('● knock', X + 8, Y + CH - 8);
    } else {   // simulator: the next circuit's corners (seeded by its name), the new part where it helps
      axes(X, Y, CW, CH * 0.62, `Lap · ${st.sim?.track ?? 'next circuit'}`, 'Speed (km/h)');
      const name = st.sim?.track ?? 'x', hsh = [...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
      let rs = hsh || 1;
      const R = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
      const nc = 10 + Math.floor(R() * 6), cs = [];
      for (let k = 0, pos = 0.04; k < nc; k++) { pos += 0.03 + R() * (0.9 / nc); cs.push({ s: Math.min(0.98, pos), v: 75 + R() * 185 }); }
      // Where the part helps: low-speed grip in the slow corners, downforce in the fast ones, drag and power on the straights.
      const fx = st.sim?.fx ?? {}, gain = (v) => (v < 140 ? fx.lowSpeed ?? 0 : v < 210 ? ((fx.lowSpeed ?? 0) + (fx.highSpeed ?? 0)) / 2 : fx.highSpeed ?? 0) * 9;
      const speed = (r, nw) => Math.min(328 + (nw ? ((fx.straight ?? 0) + (fx.power ?? 0)) * 6 : 0), ...cs.map((c) => c.v + (nw ? gain(c.v) : 0) + 1250 * Math.abs(r - c.s) ** 0.78));
      const old = [], neu = [], tw = [];
      for (let i = 0; i <= 240; i++) {
        const r = i / 240, vo = speed(r, false), vn = speed(r, true);
        tw.push(1 / vo - 1 / vn);
        if (i <= N) { old.push([X + r * CW, Y + CH * 0.62 - (vo / 350) * CH * 0.62]); neu.push([X + r * CW, Y + CH * 0.62 - (vn / 350) * CH * 0.62 + Math.sin(time * 18 + i) * 0.6]); }
      }
      line(old, '#ffffff55', 1.5); line(neu, st.accent, 2);
      const tot = tw.reduce((a2, b2) => a2 + b2, 0) || 1, delta = st.sim?.delta ?? 0, dl = [];
      let acc = 0;
      for (let i = 0; i <= N; i++) { acc += (Math.abs(tw[i]) / Math.abs(tot)) * delta; dl.push([X + (i / 240) * CW, Y + CH * 0.84 + acc * CH * 0.9]); }
      g.strokeStyle = '#ffffff30'; g.strokeRect(X, Y + CH * 0.68, CW, CH * 0.32);
      hline(X, Y + CH * 0.84, CW, '#ffffff40', '');
      line(dl, delta <= 0 ? '#5fd38a' : '#ff6b5a', 2.2);
      g.fillStyle = '#ffffff99'; g.fillText('Lap time delta vs the current part', X + 6, Y + CH * 0.68 + 14);
      if (N >= 240) { g.font = '800 15px Titillium Web, sans-serif'; g.fillStyle = delta <= 0 ? '#5fd38a' : '#ff6b5a'; const tx = `${delta <= 0 ? '−' : '+'}${Math.abs(delta).toFixed(3)} s`; g.fillText(tx, X + CW - g.measureText(tx).width - 8, Y + CH * 0.68 + 18); }
      g.fillStyle = '#ffffff99'; g.font = '600 11px Titillium Web, sans-serif'; g.fillText('— current part', X + CW - 210, Y + 14); g.fillStyle = st.accent; g.fillText('— new design', X + CW - 110, Y + 14);
    }
  }

  function markers(time) {
    const list = st.issues ?? [];
    list.forEach((is, k) => {
      let px, py;
      if (sec && ['tunnel', 'cfd'].includes(st.kind)) [px, py] = toPx(...(sec.anchors[is.key] ?? [1, 0.5]));
      else { px = W() * (0.18 + 0.2 * k); py = 70 + (k % 2) * 30; }
      const pulse = 0.5 + 0.5 * Math.sin(time * 5 + k), col = is.sev > 1.4 ? '#ff4d4d' : is.sev > 0.9 ? '#ff8a3d' : '#ffc247';
      g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(px, py, 13 + pulse * 6, 0, 7); g.stroke();
      g.fillStyle = col; g.beginPath(); g.arc(px, py, 10, 0, 7); g.fill();
      g.fillStyle = '#000'; g.font = '800 12px Titillium Web, sans-serif'; g.textAlign = 'center'; g.fillText(String(k + 1), px, py + 4); g.textAlign = 'left';
      const label = `${ISSUE_KIND[is.kind]} · ${sevName(is.sev)}`, lw = g.measureText(label).width + 16, lx = Math.min(W() - lw - 8, px + 18), ly = clamp(py + (k % 2 ? 16 : -36), 8, H() - 30);
      g.fillStyle = '#000000cc'; g.fillRect(lx, ly, lw, 20); g.fillStyle = col; g.fillRect(lx, ly, 3, 20);
      g.fillStyle = '#fff'; g.font = '700 11px Titillium Web, sans-serif'; g.fillText(label, lx + 9, ly + 14);
    });
  }

  function overlay(time) {
    const test = TESTS[st.kind];
    g.font = '800 12px Titillium Web, sans-serif'; g.fillStyle = '#ffffffdd';
    const cond = st.kind === 'tunnel' ? '60% model · 50 m/s · rolling road' : st.kind === 'cfd' ? 'RANS · 140 M cells' : st.kind === 'sim' ? 'Driver in the loop' : st.kind === 'dyno' ? 'Full load' : 'Load cycle';
    g.fillText(`${test.name.toUpperCase()} · ${cond}`, 16, 22);
    if (st.progress != null) {
      g.fillStyle = Math.sin(time * 8) > 0 ? '#ff4d4d' : '#ff4d4d55'; g.beginPath(); g.arc(W() - 60, 18, 5, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.fillText('LIVE', W() - 50, 22);
      g.fillStyle = '#ffffff22'; g.fillRect(0, H() - 4, W(), 4); g.fillStyle = st.accent; g.fillRect(0, H() - 4, W() * st.progress, 4);
    }
  }

  function frame(now) {
    if (!canvas.isConnected) { cancelAnimationFrame(raf); return; }
    raf = requestAnimationFrame(frame);
    // Keep the backing store at the displayed size.
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), cw = Math.round(r.width * dpr), ch = Math.round(r.height * dpr);
    if (cw && ch && (canvas.width !== cw || canvas.height !== ch)) { canvas.width = cw; canvas.height = ch; cfdKey = ''; }
    if (!st || !canvas.width) return;
    const time = (now - t0) / 1000, dt = Math.min(0.05, (now - (frame.last ?? now)) / 1000); frame.last = now;
    g.save();
    if (st.kind === 'tunnel') tunnel(time, dt);
    else if (st.kind === 'cfd') cfd(time);
    else traces(time);
    if (!opts.hud) { if (st.progress == null || st.progress > 0.85) markers(time); overlay(time); }
    g.restore();
  }
  raf = requestAnimationFrame(frame);
  return { set, destroy() { cancelAnimationFrame(raf); } };
}
