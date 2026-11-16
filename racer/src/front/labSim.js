/*
 * The driver-in-the-loop simulator's lap: the real circuit's curvature turned into a speed profile
 * (cornering on downforce, traction out of the corners, braking into them), timed, split into sectors;
 * the same lap with the new part (its gains where they apply: low-speed grip in the slow corners,
 * downforce in the fast ones, drag and power on the straights) and what the driver says about it.
 */
const G = 9.81, VMAX = 92;   // m/s (330 km/h)

/** The lap with the current part and with the new design. fx: the design's attribute changes; delta: its lap time change (s). */
export function lapModel(layout, fx = {}, delta = 0) {
  let x, z, k, ds;
  if (layout) {
    const step = Math.max(1, Math.round(4 / layout.ds));   // ~4 m per sample
    const n = Math.floor(layout.N / step);
    x = new Float64Array(n); z = new Float64Array(n); k = new Float64Array(n);
    for (let i = 0; i < n; i++) { const j = i * step; x[i] = layout.x[j]; z[i] = layout.z[j]; let s = 0; for (let q = -2; q <= 2; q++) s += layout.k[(j + q * step + layout.N) % layout.N]; k[i] = s / 5; }
    ds = layout.length / n;
  } else {   // no circuit: a generic one
    const n = 1100; x = new Float64Array(n); z = new Float64Array(n); k = new Float64Array(n);
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; x[i] = Math.cos(a) * 900 + Math.sin(a * 3) * 160; z[i] = Math.sin(a) * 520; }
    for (let i = 0; i < n; i++) { const a = (i - 1 + n) % n, b = (i + 1) % n, h1 = Math.atan2(z[i] - z[a], x[i] - x[a]), h2 = Math.atan2(z[b] - z[i], x[b] - x[i]); let d = h2 - h1; d = Math.atan2(Math.sin(d), Math.cos(d)); k[i] = d / Math.hypot(x[b] - x[i], z[b] - z[i]); }
    ds = 4;
  }
  const n = x.length;
  const profile = (gain) => {
    const v = new Float64Array(n);
    for (let i = 0; i < n; i++) v[i] = Math.min(VMAX * (1 + gain(VMAX, 'top')), Math.sqrt((4.3 * G) / Math.max(1e-4, Math.abs(k[i]))) * (1 + gain(Math.sqrt((4.3 * G) / Math.max(1e-4, Math.abs(k[i]))), 'corner')));
    const out = v.slice();
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) { const p = out[(i - 1 + n) % n], acc = 1.15 * G * (1 - (p / VMAX) * 0.75); out[i] = Math.min(out[i], Math.sqrt(p * p + 2 * acc * ds)); }
    for (let pass = 0; pass < 2; pass++) for (let i = n - 1; i >= 0; i--) { const q = out[(i + 1) % n]; out[i] = Math.min(out[i], Math.sqrt(q * q + 2 * 4.6 * G * ds)); }
    return out;
  };
  const timeOf = (v) => { const t = new Float64Array(n + 1); for (let i = 0; i < n; i++) t[i + 1] = t[i] + ds / v[i]; return t; };
  const v0 = profile(() => 0), t0 = timeOf(v0);
  // Where the part helps (fractions of speed), scaled so the lap changes by exactly delta.
  const raw = (v, where) => where === 'top' ? ((fx.straight ?? 0) + (fx.power ?? 0)) * 0.004
    : v < 40 ? (fx.lowSpeed ?? 0) * 0.006 : v < 65 ? ((fx.lowSpeed ?? 0) + (fx.highSpeed ?? 0)) * 0.003 : (fx.highSpeed ?? 0) * 0.006;
  let scale = 1;
  const tryLap = (s) => timeOf(profile((v, w) => raw(v, w) * s))[n];
  const d1 = tryLap(1) - t0[n];
  if (Math.abs(d1) > 1e-4) scale = delta / d1; else scale = 0;
  let v1 = profile((v, w) => raw(v, w) * scale);
  if (scale === 0 && Math.abs(delta) > 1e-4) { const f = t0[n] / (t0[n] + delta); v1 = v0.map((v) => v * f); }
  const t1 = timeOf(v1);
  const sectors = [Math.floor(n / 3), Math.floor((2 * n) / 3), n];
  // The corners (local speed minima), for the driver's comments.
  const corners = [];
  for (let i = 0; i < n; i++) { const a = v0[(i - 1 + n) % n], b = v0[(i + 1) % n]; if (v0[i] < a && v0[i] <= b && v0[i] < 75) corners.push({ i, v: v0[i] }); }
  corners.forEach((c, k2) => { c.turn = k2 + 1; });
  return { n, x, z, ds, v0, v1, t0, t1, lap0: t0[n], lap1: t1[n], sectors, corners, length: n * ds };
}

/** Index along the lap at time t (s) into a lap with cumulative times T. */
export function indexAt(T, t) {
  let lo = 0, hi = T.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; }
  return lo + (t - T[lo]) / Math.max(1e-6, T[lo + 1] - T[lo]);
}
export const fmtLap = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(3).padStart(6, '0')}`;
export const gearOf = (kmh) => 1 + [80, 115, 150, 185, 220, 255, 290].filter((g) => kmh > g).length;

/** What the driver says, from what the test found (by kind), placed at a corner where it shows. */
export function radioFor(findings, model) {
  const say = {
    balance: (t) => t.replace(/ in the simulator/, ''),
    porpoise: () => 'It\'s bouncing on the straights, I can\'t see the braking boards.',
    mech: (t) => t,
    thermal: () => 'Temperatures are climbing, I\'m having to lift and coast.',
    flow: () => 'The rear lets go when I turn in at speed, it doesn\'t feel planted.',
    wake: () => 'Following another car the front just washes out.',
  };
  const slow = model.corners.slice().sort((a, b) => a.v - b.v);
  return findings.map((f, k) => {
    const c = (f.kind === 'balance' || f.kind === 'mech' ? slow[k % Math.max(1, slow.length)] : model.corners[(k * 3 + 2) % Math.max(1, model.corners.length)]) ?? { i: Math.floor(model.n * (0.3 + k * 0.2)), turn: '?' };
    return { at: c.i, turn: c.turn, text: (say[f.kind] ?? ((t) => t))(f.text), sev: f.sev };
  });
}
