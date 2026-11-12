import { SLOTS, COST_CAP, fmtM } from './rd.js';

/*
 * The development lab: where a design is actually developed before it goes to the factory.
 *
 * A design is three pieces of real geometry (a front wing's flap angle, main-plane camber and endplate
 * outwash; a floor's ride height, venturi throat and edge wing...). For the brief the team has chosen
 * there is a best geometry, but nobody knows exactly where it is: the brief says roughly, the physics
 * hides the rest (a seeded offset per design). The team finds it by testing:
 *
 *   wind tunnel   (ATR runs)       flow problems: separation, stall, porpoising on the rolling road
 *   CFD           (ATR items)      wakes and vortices, cooling flows, the whole flow field
 *   rig           (money)          the mechanical side: kerbs, platform, stiffness, crash tests
 *   dyno          (money)          brakes and power units: temperatures, knock, fade
 *   simulator     (money)          the driver: balance problems, and the lap time at the next circuit
 *
 * Each test measures the design (with noise: better facilities, less noise) and points out the issues it
 * can see (every test sees some kinds better than others). Fix them, test again, and when the design is
 * where you want it, sign it off: it becomes a project. How good the design really is decides what the
 * part gains, and anything left wrong in it is the risk that it fails on track.
 */

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rngOf = (seed) => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const gaussOf = (R) => () => { let u = 0; for (let k = 0; k < 6; k++) u += R(); return (u - 3) / 1.2; };

/**
 * Per part: the geometry (key, name, unit, min, max, step, neutral c, how the brief's two axes move the
 * best value: dir [axis0, axis1] per unit of the axis away from the middle), the issue on each side
 * ('hi' = too much, 'lo' = too little: its kind and what the engineers see) and the measured figures
 * (scale: base × (1 + Σ coef × offset), add: base + Σ coef × offset, offsets in ranges from neutral).
 */
export const LAB = {
  frontWing: {
    tests: ['tunnel', 'cfd', 'sim'],
    params: [
      { key: 'flap', name: 'Flap angle', unit: '°', min: 6, max: 26, step: 1, c: 15, dir: [8, 0],
        hi: ['flow', 'Flap too steep: the flow separates off the flap trailing edge'], lo: ['flow', 'Flap under-loaded: the wing is far below the load it can make'] },
      { key: 'camber', name: 'Main plane camber', unit: '%', min: 4, max: 14, step: 0.5, c: 9, dir: [3, 0],
        hi: ['flow', 'Too much camber: the main plane stalls in ground effect under braking'], lo: ['balance', 'Front too light: the driver reports understeer in slow corners'] },
      { key: 'endplate', name: 'Endplate outwash', unit: '°', min: 0, max: 20, step: 1, c: 10, dir: [0, 9],
        hi: ['wake', 'Too much outwash: the endplate vortex bursts and hits the floor edge'], lo: ['wake', 'Tyre wake not pushed out: the floor ingests it'] },
    ],
    metrics: [
      { key: 'df', name: 'Downforce', unit: 'CL·A', base: 1.45, d: 2, k: { flap: 0.55, camber: 0.4, endplate: -0.05 } },
      { key: 'drag', name: 'Drag', unit: 'CD·A', base: 0.42, d: 3, k: { flap: 0.45, camber: 0.25, endplate: 0.12 }, lower: true },
      { key: 'eff', name: 'Efficiency', unit: 'L/D', ratio: ['df', 'drag'], d: 2 },
      { key: 'bal', name: 'Aero balance', unit: '% front', base: 43, d: 1, add: true, q: 0, k: { flap: 7, camber: 5 } },
    ],
  },
  rearWing: {
    tests: ['tunnel', 'cfd', 'sim'],
    params: [
      { key: 'aoa', name: 'Main plane angle', unit: '°', min: 8, max: 30, step: 1, c: 19, dir: [10, 0],
        hi: ['flow', 'Main plane stalls in yaw: the downforce drops off in fast corners'], lo: ['balance', 'Rear too light: snap oversteer in fast corners in the simulator'] },
      { key: 'gap', name: 'Slot gap', unit: 'mm', min: 8, max: 20, step: 0.5, c: 13, dir: [0, -2],
        hi: ['flow', 'Slot gap too wide: the flap loses its attached flow'], lo: ['flow', 'Slot gap too tight: the flap flutters and DRS won\'t open cleanly'] },
      { key: 'beam', name: 'Beam wing load', unit: '%', min: 0, max: 100, step: 5, c: 50, dir: [0, 35],
        hi: ['wake', 'Beam wing overloaded: it stalls and kills the diffuser\'s upwash'], lo: ['wake', 'Beam wing too light: the diffuser loses its pull'] },
    ],
    metrics: [
      { key: 'df', name: 'Downforce', unit: 'CL·A', base: 1.1, d: 2, k: { aoa: 0.6, beam: 0.25 } },
      { key: 'drag', name: 'Drag', unit: 'CD·A', base: 0.55, d: 3, k: { aoa: 0.5, beam: 0.15, gap: -0.04 }, lower: true },
      { key: 'eff', name: 'Efficiency', unit: 'L/D', ratio: ['df', 'drag'], d: 2 },
      { key: 'drs', name: 'DRS gain', unit: 'km/h', base: 14, d: 1, k: { aoa: 0.5, gap: 0.2 } },
    ],
  },
  floor: {
    tests: ['tunnel', 'cfd', 'sim'],
    params: [
      { key: 'ride', name: 'Ride height', unit: 'mm', min: 20, max: 60, step: 1, c: 38, dir: [3, -12],
        hi: ['flow', 'Ride height too high: the venturi tunnels lose their seal'], lo: ['porpoise', 'Floor bottoms out: porpoising on the straights'] },
      { key: 'throat', name: 'Venturi throat', unit: 'mm', min: 60, max: 120, step: 2, c: 90, dir: [-15, 0],
        hi: ['flow', 'Throat too open: the suction peak is weak'], lo: ['flow', 'Throat too tight: the flow chokes and separates in the diffuser'] },
      { key: 'edge', name: 'Edge wing angle', unit: '°', min: 0, max: 30, step: 1, c: 15, dir: [8, 0],
        hi: ['wake', 'Edge wing too aggressive: the edge vortex bursts in yaw'], lo: ['wake', 'Floor edge not sealed: tyre squirt leaks under the floor'] },
    ],
    metrics: [
      { key: 'df', name: 'Downforce', unit: 'CL·A', base: 2.2, d: 2, k: { ride: -0.35, throat: -0.25, edge: 0.2 } },
      { key: 'drag', name: 'Drag', unit: 'CD·A', base: 0.18, d: 3, k: { edge: 0.25, throat: 0.05 }, lower: true },
      { key: 'eff', name: 'Efficiency', unit: 'L/D', ratio: ['df', 'drag'], d: 1 },
      { key: 'sens', name: 'Ride sensitivity', unit: '%/mm', base: 1.0, d: 2, k: { ride: -0.5, throat: -0.25 }, lower: true },
    ],
  },
  sidepods: {
    tests: ['tunnel', 'cfd', 'sim'],
    params: [
      { key: 'inlet', name: 'Inlet area', unit: 'cm²', min: 300, max: 700, step: 10, c: 500, dir: [180, 0],
        hi: ['flow', 'Inlet too big: spillage drag around the inlet lip'], lo: ['thermal', 'Inlet too small: water temperature over the limit in hot races'] },
      { key: 'undercut', name: 'Undercut depth', unit: 'mm', min: 40, max: 160, step: 5, c: 100, dir: [0, -40],
        hi: ['flow', 'Undercut too deep: the flow separates under the sidepod'], lo: ['wake', 'Undercut too shallow: the floor edge is starved of flow'] },
      { key: 'ramp', name: 'Downwash ramp', unit: '°', min: 5, max: 35, step: 1, c: 20, dir: [0, -10],
        hi: ['flow', 'Ramp too steep: separation on the engine cover'], lo: ['wake', 'Not enough downwash: the beam wing sits in dirty air'] },
    ],
    metrics: [
      { key: 'cool', name: 'Cooling margin', unit: '°C', base: 6, d: 1, add: true, q: 4, k: { inlet: 18 } },
      { key: 'drag', name: 'Drag', unit: 'CD·A', base: 0.7, d: 3, k: { inlet: 0.25, ramp: 0.08 }, lower: true },
      { key: 'df', name: 'Downforce', unit: 'CL·A', base: 0.6, d: 2, k: { undercut: 0.35, ramp: 0.3 } },
      { key: 'eff', name: 'Efficiency', unit: 'L/D', ratio: ['df', 'drag'], d: 2 },
    ],
  },
  suspension: {
    tests: ['rig', 'sim'],
    params: [
      { key: 'spring', name: 'Heave spring', unit: 'N/mm', min: 100, max: 400, step: 10, c: 250, dir: [-80, 0],
        hi: ['mech', 'Too stiff: tyre load fluctuates over the kerbs'], lo: ['mech', 'Too soft: the floor touches the ground at high speed'] },
      { key: 'antidive', name: 'Anti-dive', unit: '%', min: 0, max: 60, step: 2, c: 30, dir: [0, 18],
        hi: ['balance', 'Too much anti-dive: the fronts lock under braking in the simulator'], lo: ['mech', 'Not enough anti-dive: the platform pitches 14 mm under braking'] },
      { key: 'damp', name: 'Damping', unit: '%', min: 20, max: 80, step: 2, c: 50, dir: [0, 8],
        hi: ['mech', 'Damping too hard: the car skips over bumps'], lo: ['mech', 'Under-damped: the rear keeps oscillating after kerbs'] },
    ],
    metrics: [
      { key: 'pitch', name: 'Pitch under braking', unit: 'mm', base: 9, d: 1, add: true, q: 3, k: { spring: -5, antidive: -6 }, lower: true },
      { key: 'load', name: 'Tyre load variation', unit: '%', base: 12, d: 1, add: true, q: 4, k: { spring: 8, damp: 5 }, lower: true },
      { key: 'settle', name: 'Settling time', unit: 's', base: 0.32, d: 2, k: { damp: -0.6 }, lower: true },
    ],
  },
  brakes: {
    tests: ['dyno', 'cfd', 'sim'],
    params: [
      { key: 'duct', name: 'Duct size', unit: 'cm²', min: 40, max: 140, step: 5, c: 90, dir: [45, 0],
        hi: ['flow', 'Ducts too big: drag, and the discs run cold and glaze'], lo: ['thermal', 'Ducts too small: discs over 1100 °C, the brakes fade'] },
      { key: 'holes', name: 'Disc ventilation', unit: 'holes', min: 800, max: 1600, step: 50, c: 1200, dir: [250, 0],
        hi: ['mech', 'Too many holes: the disc wears fast and could crack'], lo: ['thermal', 'Not enough ventilation: hot spots on the disc'] },
      { key: 'pad', name: 'Pad bite', unit: '%', min: 0, max: 100, step: 5, c: 50, dir: [0, 35],
        hi: ['balance', 'Pad bite too aggressive: the rears lock in the simulator'], lo: ['balance', 'Pad too progressive: the driver can\'t brake late'] },
    ],
    metrics: [
      { key: 'temp', name: 'Peak disc temperature', unit: '°C', base: 1000, d: 0, k: { duct: -0.22, holes: -0.12 }, lower: true },
      { key: 'mass', name: 'Corner mass', unit: 'kg', base: 7.6, d: 2, k: { duct: 0.08, holes: -0.04 }, lower: true },
      { key: 'dist', name: 'Braking 300-80 km/h', unit: 'm', base: 112, d: 1, k: { pad: -0.06 }, lower: true },
    ],
  },
  chassis: {
    tests: ['rig', 'sim'],
    params: [
      { key: 'plies', name: 'Carbon plies', unit: 'layers', min: 8, max: 20, step: 1, c: 14, dir: [-3, 0],
        hi: ['mech', 'Over-built: the chassis is over its weight target'], lo: ['mech', 'Under-built: it fails the FIA side-impact test'] },
      { key: 'stiff', name: 'Torsional target', unit: 'kNm/°', min: 30, max: 60, step: 1, c: 45, dir: [-6, 0],
        hi: ['mech', 'Stiffness target out of reach at this weight: extra plies in the tub'], lo: ['balance', 'The chassis flexes: the driver reports a vague front end'] },
      { key: 'ballast', name: 'Ballast position', unit: '% fwd', min: 0, max: 100, step: 5, c: 50, dir: [0, 30],
        hi: ['balance', 'Weight too far forward: understeer mid-corner'], lo: ['balance', 'Weight too far back: snap oversteer on entry'] },
    ],
    metrics: [
      { key: 'tors', name: 'Torsional stiffness', unit: 'kNm/°', base: 45, d: 1, k: { stiff: 0.55, plies: 0.25 } },
      { key: 'mass', name: 'Tub mass', unit: 'kg', base: 43, d: 1, k: { plies: 0.25, stiff: 0.08 }, lower: true },
      { key: 'wd', name: 'Weight distribution', unit: '% front', base: 45, d: 1, add: true, q: 0, k: { ballast: 6 } },
    ],
  },
  pu: {
    tests: ['dyno', 'sim'],
    params: [
      { key: 'cr', name: 'Compression ratio', unit: ':1', min: 14, max: 18, step: 0.1, c: 16, dir: [1.4, 0],
        hi: ['thermal', 'Knock at full load: piston temperature over the limit'], lo: ['flow', 'Combustion too lean: power below target'] },
      { key: 'turbo', name: 'Turbo size', unit: '%', min: 0, max: 100, step: 5, c: 50, dir: [0, 25],
        hi: ['mech', 'Turbo lag out of slow corners'], lo: ['mech', 'The turbo runs out of breath at the top end'] },
      { key: 'ers', name: 'ERS deployment', unit: '%', min: 0, max: 100, step: 5, c: 50, dir: [0, 30],
        hi: ['balance', 'Battery empty before the end of the straight in the simulator'], lo: ['balance', 'Deployment too cautious: energy left unused'] },
    ],
    metrics: [
      { key: 'kw', name: 'Peak power', unit: 'kW', base: 800, d: 0, k: { cr: 0.22, turbo: 0.1 } },
      { key: 'fuel', name: 'Fuel use', unit: 'kg/h', base: 96, d: 1, k: { cr: -0.12, ers: 0.05 }, lower: true },
      { key: 'knock', name: 'Knock margin', unit: '°', base: 5, d: 1, add: true, q: 2, k: { cr: -6 } },
    ],
  },
};

/**
 * How the geometry shapes the 3D model (parts3d.js takes two 0..1 axes): [param, inverted] per axis, and
 * where each parameter's problems show on the part (in the part's box: -1..1 across, up, forward).
 */
export const MODEL = {
  frontWing: { axes: [['flap', 0], ['endplate', 0]], at: { flap: [0, 0.7, -0.9], camber: [0, -0.8, 0.2], endplate: [0.95, 0.3, -0.6] } },
  rearWing: { axes: [['aoa', 0], ['beam', 0]], at: { aoa: [0, 0.6, -0.9], gap: [0, 0.75, -0.3], beam: [0, -0.8, -0.6] } },
  floor: { axes: [['throat', 1], ['ride', 1]], at: { ride: [0, -1, 0], throat: [0, -0.9, -0.3], edge: [0.95, -0.4, 0.2] } },
  sidepods: { axes: [['inlet', 0], ['undercut', 1]], at: { inlet: [0.3, 0.4, 0.95], undercut: [0.6, -0.7, 0], ramp: [0.2, 0.8, -0.8] } },
  suspension: { axes: [['spring', 1], ['antidive', 0]], at: { spring: [0, 0.6, 0], antidive: [0.5, 0, 0.8], damp: [-0.5, -0.5, -0.5] } },
  brakes: { axes: [['duct', 0], ['pad', 0]], at: { duct: [0, 0, 0.9], holes: [0, 0, 0], pad: [0, 0.8, 0] } },
  chassis: { axes: [['plies', 1], ['ballast', 0]], at: { plies: [0.9, 0, 0], stiff: [0, 0.5, 0], ballast: [0, -0.6, 0.4] } },
  pu: { axes: [['cr', 0], ['ers', 0]], at: { cr: [0, 0.6, 0.2], turbo: [-0.5, 0.2, -0.8], ers: [0.6, -0.2, 0] } },
};
/** The model's two axes for the current geometry. */
export function modelDir(d) {
  const L = LAB[d.slot];
  return MODEL[d.slot].axes.map(([key, inv]) => { const p = L.params.find((x) => x.key === key), v = (d.x[key] - p.min) / (p.max - p.min); return clamp(inv ? 1 - v : v, 0, 1); });
}

/** The tests: what they cost and how well they see each kind of issue (chance per test). */
export const TESTS = {
  tunnel: { name: 'Wind tunnel', verb: 'Run the wind tunnel', see: { flow: 0.85, wake: 0.45, porpoise: 0.6 }, noise: 0.05 },
  cfd: { name: 'CFD', verb: 'Run a CFD simulation', see: { flow: 0.65, wake: 0.9, thermal: 0.85, porpoise: 0.2 }, noise: 0.065 },
  rig: { name: 'Test rig', verb: 'Put it on the rig', see: { mech: 0.9, porpoise: 0.6, balance: 0.2 }, noise: 0.04 },
  dyno: { name: 'Dyno', verb: 'Run it on the dyno', see: { thermal: 0.9, mech: 0.8, flow: 0.55 }, noise: 0.04 },
  sim: { name: 'Simulator', verb: 'Driver-in-the-loop simulator', see: { balance: 0.85, porpoise: 0.75, mech: 0.3, thermal: 0.25 }, noise: 0.07 },
};
export const ISSUE_KIND = { flow: 'Flow', wake: 'Wake', porpoise: 'Porpoising', thermal: 'Thermal', mech: 'Mechanical', balance: 'Driver' };

/** What one test costs: { runs, cfd, money }. */
export function testCost(slot, kind) {
  const S = SLOTS[slot];
  if (kind === 'tunnel') return { runs: Math.max(4, Math.round(S.runs / 5)), cfd: 0, money: 0.04e6 };
  if (kind === 'cfd') return { runs: 0, cfd: Math.max(20, Math.round(S.cfd / 5)), money: 0.02e6 };
  if (kind === 'rig') return { runs: 0, cfd: 0, money: 0.15e6 };
  if (kind === 'dyno') return { runs: 0, cfd: 0, money: slot === 'pu' ? 0.4e6 : 0.2e6 };
  return { runs: 0, cfd: 0, money: 0.1e6 };
}
export const fmtMoney = (m) => (m < 0.1e6 ? `$${Math.round(m / 1e3)}k` : fmtM(m));
export const costText = (c) => [c.runs && `${c.runs} tunnel runs`, c.cfd && `${c.cfd} CFD items`, c.money && fmtMoney(c.money)].filter(Boolean).join(' · ');

// ---------------------------------------------------------------------------------- the design
/** A new design on the bench: the current geometry is neutral, the brief balanced. */
export function newDesign(st, slot) {
  const L = LAB[slot];
  return { slot, dir: [0.5, 0.5], x: Object.fromEntries(L.params.map((p) => [p.key, p.c])), seed: Math.floor(Math.random() * 1e9), tests: [], spent: { runs: 0, cfd: 0, money: 0 }, opened: st.round };
}
/** The best geometry for this design's brief (hidden: the tests only point towards it). */
export function optimumOf(d) {
  const L = LAB[d.slot], R = rngOf(d.seed), G = gaussOf(R);
  return Object.fromEntries(L.params.map((p) => {
    const span = p.max - p.min, v = p.c + p.dir[0] * (d.dir[0] - 0.5) * 2 + p.dir[1] * (d.dir[1] - 0.5) * 2 + G() * span * 0.13;
    return [p.key, clamp(v, p.min + span * 0.08, p.max - span * 0.08)];
  }));
}
/** How far each parameter is from its best, in tolerances (signed: + too much). */
export function offsets(d) {
  const o = optimumOf(d);
  return Object.fromEntries(LAB[d.slot].params.map((p) => [p.key, (d.x[p.key] - o[p.key]) / ((p.max - p.min) * 0.2)]));
}
/** How good the design really is: 1 at the best geometry. */
export function scoreOf(d) {
  const off = offsets(d);
  return Math.exp(-0.45 * Object.values(off).reduce((s, v) => s + v * v, 0));
}
/** The issues really in the design (each parameter far enough off its best, on one side). */
export function issuesOf(d) {
  const off = offsets(d);
  return LAB[d.slot].params.flatMap((p) => {
    const s = off[p.key];
    if (Math.abs(s) < 0.5) return [];
    const [kind, text] = s > 0 ? p.hi : p.lo;
    return [{ key: p.key, side: s > 0 ? 'hi' : 'lo', kind, text, sev: Math.abs(s) }];
  });
}
export const sevName = (sev) => (sev > 1.4 ? 'Critical' : sev > 0.9 ? 'Major' : 'Minor');
/** The figures a test reads for the design (true values; a test adds its noise). */
export function figuresOf(d, q = scoreOf(d)) {
  const L = LAB[d.slot], n = Object.fromEntries(L.params.map((p) => [p.key, (d.x[p.key] - p.c) / (p.max - p.min)]));
  const out = {};
  for (const m of L.metrics) {
    if (m.ratio) continue;
    const off = Object.entries(m.k).reduce((s, [k, c]) => s + c * (n[k] ?? 0), 0);
    // add: base + coefficient per full range of the parameter; a better design (q) helps by m.q (default 1).
    out[m.key] = m.add ? m.base + off + (m.lower ? -1 : 1) * (q - 0.6) * (m.q ?? 1)
      : m.base * (1 + off) * (m.lower ? 1.12 - 0.2 * q : 0.86 + 0.2 * q);
  }
  for (const m of L.metrics) if (m.ratio) out[m.key] = out[m.ratio[0]] / out[m.ratio[1]];
  return out;
}

/**
 * Run a test: charges its cost (ATR / cost cap) and returns the result: the figures as read (with the
 * test's noise), the estimate of how much of the design's potential is there, and the issues it found.
 * Returns an error string if it can't run.
 */
export function runTest(st, d, kind, { teamId = st.player } = {}) {
  const T = st.teams[teamId], c = testCost(d.slot, kind), test = TESTS[kind];
  if (!LAB[d.slot].tests.includes(kind)) return 'Not a test for this part';
  if (c.runs > T.atr.runs) return `Only ${T.atr.runs} wind tunnel runs left this period`;
  if (c.cfd > T.atr.cfd) return `Only ${T.atr.cfd} CFD items left this period`;
  if (T.spent + c.money > COST_CAP) return 'That would go over the cost cap';
  T.atr.runs -= c.runs; T.atr.cfd -= c.cfd; T.spent += c.money;
  d.spent.runs += c.runs; d.spent.cfd += c.cfd; d.spent.money += c.money;
  const fac = kind === 'tunnel' ? T.facilities.tunnel : kind === 'cfd' ? T.facilities.cfd : T.facilities.sim;
  const R = rngOf(d.seed ^ (d.tests.length * 7919 + 13)), G = gaussOf(R);
  const sigma = test.noise * (1.25 - fac * 0.12);
  const q = scoreOf(d), truth = figuresOf(d, q);
  const figures = Object.fromEntries(Object.entries(truth).map(([k, v]) => [k, v * (1 + G() * sigma * 0.35)]));
  const est = clamp(q + G() * sigma + (kind === 'cfd' ? 0.03 : 0), 0, 1.05);   // CFD reads a little optimistic
  const found = issuesOf(d).filter((is) => R() < (test.see[is.kind] ?? 0.05) * clamp(0.55 + is.sev * 0.35, 0, 1));
  const res = { n: d.tests.length + 1, kind, round: st.round, x: { ...d.x }, dir: d.dir.slice(), figures, est, sigma, found };
  d.tests.push(res);
  if (d.tests.length > 24) d.tests.splice(0, d.tests.length - 24);
  return res;
}
/** The issues the team knows about for the current geometry (from the tests run on exactly this design). */
export function knownIssues(d) {
  const same = d.tests.filter((t) => Object.keys(d.x).every((k) => t.x[k] === d.x[k]) && t.dir[0] === d.dir[0] && t.dir[1] === d.dir[1]);
  const seen = new Map();
  for (const t of same) for (const is of t.found) seen.set(`${is.key}-${is.side}`, { ...is, by: [...(seen.get(`${is.key}-${is.side}`)?.by ?? []), t.kind] });
  return { tested: same.length > 0, kinds: [...new Set(same.map((t) => t.kind))], list: [...seen.values()].sort((a, b) => b.sev - a.sev) };
}
/**
 * Signing a design off: the plan for the project (quote/startProject in rd.js). The design's real
 * quality sets the gain; what's still wrong in it (seen or not) is the risk; how much it was tested
 * narrows the range.
 */
export function signOffPlan(d, plan = {}) {
  const q = scoreOf(d), open = issuesOf(d);
  const kinds = new Set(d.tests.map((t) => t.kind));
  return { designers: 0.35, copies: 2, ...plan, dir: d.dir.slice(), runs: 0, cfd: 0,
    lab: { score: q, open: open.reduce((s, is) => s + Math.min(2, is.sev), 0), tests: d.tests.length, kinds: kinds.size, spent: { ...d.spent } } };
}
