import { TEAMS } from '../front/teams.js';
import { CAR_RATING } from './grid.js';

/*
 * Research and development, the way a Formula 1 team develops its car under the 2026 rules (and the way
 * F1 Manager plays it: every project is a brief and a share of limited resources, every part a spec you
 * choose to run or not).
 *
 * THE CAR is a set of performance attributes (100 = the best on the grid at the start of 2026):
 *   lowSpeed    slow-corner grip: mechanical grip, low-speed downforce, traction
 *   highSpeed   fast-corner downforce and stability
 *   straight    straight-line speed: drag
 *   power       the power unit (combustion and the 50/50 electrical deployment)
 *   tyre        tyre management: how kind the car is to its tyres
 *   weight      mass over the minimum
 *   reliability how often something breaks
 * Each circuit weights them its own way: Monaco wants slow-corner grip, Monza drag and power, Suzuka
 * and Silverstone fast-corner downforce. A car's rating at a circuit is what it races with.
 *
 * THE PLAYER'S CAR is built from components, each with the spec fitted for this weekend:
 *   front wing, rear wing, floor, sidepods and cooling, suspension, brakes, chassis, power unit (works
 *   teams only: customers get their supplier's upgrades).
 * A new spec comes from a DESIGN PROJECT:
 *   brief       two trade-offs per part (a rear wing: Monza or Monaco downforce, a beam wing for load
 *               or efficiency; a floor: peak load or a stable platform...). What it gains is what it
 *               costs somewhere else, so a spec suits some circuits and not others.
 *   resources   designers (the design office's capacity, shared between projects: more is faster),
 *               wind tunnel runs and CFD items (from the ATR allowance for this testing period: more
 *               finds more and narrows the uncertainty), and how many copies to make (spares: a crash
 *               that breaks a wing writes a copy off; no copy left and the older spec goes back on).
 *   knowledge   each part's expertise grows with every spec designed: the next one is surer and better.
 * Specs build up in the inventory; before each race you choose what to fit (a low-drag rear wing for
 * Monza, the high-downforce one for Monaco). A new spec's real gain is only known once it has run in
 * practice and the data correlates with the tunnel: until then it's a range.
 * Not every design works. Each brief carries a risk (less testing, less expertise and a more extreme
 * concept raise it): the concept can hit a dead end in the tunnel (the project stops, the money is
 * spent), reach the car and find nothing (a dud), or backfire, slower than the part it replaced. The
 * car on track is always what was really built; the team only learns which once it has run.
 *
 * THE LIMITS:
 *   cost cap      $215M (2026): running the team every weekend, every project and copy, crash repairs.
 *                 Overspend and the FIA cuts the aero testing.
 *   ATR           wind tunnel runs and CFD items per testing period (here every 3 rounds), on a sliding
 *                 scale by championship position: the leader 70% of the baseline, last 120%.
 *   facilities    wind tunnel, CFD cluster, factory, simulator: capital spending outside the cap.
 *
 * THE OTHER TEAMS develop too, each with its own budget, ATR and priorities (its weak areas for the
 * circuits ahead); late in the season the top teams turn to next year's car.
 */
export const COST_CAP = 215e6;
export const RUN_COST = 6.2e6;               // running the team at a race weekend (staff, travel, logistics, power units)
export const ATR_BASE = { runs: 320, cfd: 2000 }, ATR_ROUNDS = 3;
export const ATTRS = ['lowSpeed', 'highSpeed', 'straight', 'power', 'tyre', 'weight', 'reliability'];
export const ATTR_NAMES = { lowSpeed: 'Low-speed grip', highSpeed: 'High-speed downforce', straight: 'Straight-line speed', power: 'Power unit', tyre: 'Tyre management', weight: 'Weight', reliability: 'Reliability' };
export const ATTR_SHORT = { lowSpeed: 'Low speed', highSpeed: 'High speed', straight: 'Straights', power: 'Power', tyre: 'Tyres', weight: 'Weight', reliability: 'Reliability' };
export const PU = { mclaren: 'mercedes', mercedes: 'mercedes', williams: 'mercedes', alpine: 'mercedes', ferrari: 'ferrari', haas: 'ferrari', cadillac: 'ferrari', redbull: 'redbull', racingbulls: 'redbull', aston: 'honda', audi: 'audi' };
export const PU_NAME = { mercedes: 'Mercedes', ferrari: 'Ferrari', redbull: 'Red Bull Ford', honda: 'Honda', audi: 'Audi' };
const WORKS = { mercedes: 'mercedes', ferrari: 'ferrari', redbull: 'redbull', aston: 'honda', audi: 'audi' };
export const isWorks = (teamId) => !!WORKS[teamId];

/** How each circuit weights the attributes (low, high, straight, power, tyre). */
const PROFILE = {
  monaco: [0.45, 0.05, 0.05, 0.1, 0.35], singapore: [0.4, 0.1, 0.1, 0.15, 0.25], hungaroring: [0.35, 0.2, 0.1, 0.15, 0.2], baku: [0.25, 0.05, 0.35, 0.25, 0.1],
  monza: [0.1, 0.15, 0.4, 0.3, 0.05], spa: [0.15, 0.3, 0.25, 0.2, 0.1], silverstone: [0.1, 0.45, 0.15, 0.15, 0.15], suzuka: [0.15, 0.45, 0.1, 0.15, 0.15],
  vegas: [0.15, 0.05, 0.4, 0.3, 0.1], jeddah: [0.1, 0.35, 0.25, 0.25, 0.05], bahrain: [0.3, 0.15, 0.2, 0.15, 0.2], qatar: [0.1, 0.45, 0.15, 0.15, 0.15],
  zandvoort: [0.3, 0.35, 0.05, 0.1, 0.2], mexico: [0.25, 0.2, 0.25, 0.2, 0.1], canada: [0.3, 0.05, 0.3, 0.25, 0.1], australia: [0.25, 0.3, 0.2, 0.15, 0.1],
  china: [0.25, 0.25, 0.2, 0.15, 0.15], miami: [0.3, 0.15, 0.25, 0.2, 0.1], catalunya: [0.2, 0.4, 0.1, 0.1, 0.2], austria: [0.3, 0.2, 0.2, 0.2, 0.1],
  cota: [0.25, 0.35, 0.15, 0.15, 0.1], interlagos: [0.3, 0.25, 0.2, 0.15, 0.1], yas: [0.35, 0.15, 0.25, 0.15, 0.1], madring: [0.3, 0.25, 0.2, 0.15, 0.1],
};
export const profileOf = (trackId) => { const p = PROFILE[trackId] ?? [0.25, 0.25, 0.2, 0.15, 0.15]; return { lowSpeed: p[0], highSpeed: p[1], straight: p[2], power: p[3], tyre: p[4] }; };

/** Each team's character at the start of 2026 (attribute offsets from its overall rating). */
const CHARACTER = {
  mclaren: { lowSpeed: 1.2, highSpeed: 0.8, tyre: 1.4, straight: -0.8 }, mercedes: { power: 1.4, highSpeed: 0.6, tyre: -0.5, straight: 0.4 },
  redbull: { highSpeed: 1.2, straight: 0.8, lowSpeed: -0.9 }, ferrari: { straight: 1.0, power: 0.6, tyre: -0.7, lowSpeed: 0.4 },
  williams: { straight: 1.5, lowSpeed: -1.1, power: 0.6 }, aston: { lowSpeed: 0.7, power: -1.2, reliability: -2 }, racingbulls: { highSpeed: 0.6, lowSpeed: -0.4, reliability: -1.5 },
  haas: { tyre: -0.9, straight: 0.3 }, alpine: { lowSpeed: -0.3, power: 0.8, tyre: 0.3 }, audi: { power: -1.4, reliability: -2.5, highSpeed: 0.4 }, cadillac: { lowSpeed: -0.8, highSpeed: -0.4, reliability: -1.5, power: 0.4 },
};

/*
 * The components. Each has two design axes (0 .. 1 between two philosophies; each end's effect on the
 * attributes), the size of a typical step (gain, rating points), its cost and copy cost, the testing
 * it needs for a full-quality design (runs, CFD items), and the time: design rounds at a normal share of
 * the design office, manufacturing rounds.
 */
export const SLOTS = {
  frontWing: { name: 'Front wing', code: 'FW', dept: 'Aerodynamics', gain: 0.9, cost: 1.0e6, copy: 0.18e6, runs: 45, cfd: 320, design: 2, make: 1, broken: 'frontWing',
    axes: [{ id: 'load', name: 'Load', lo: 'Low drag', hi: 'High downforce', fx: [{ straight: 0.8, highSpeed: 0.1 }, { lowSpeed: 0.6, highSpeed: 0.55, straight: -0.25 }] },
      { id: 'wake', name: 'Wake', lo: 'Inwash', hi: 'Outwash', fx: [{ highSpeed: 0.35, tyre: 0.2 }, { lowSpeed: 0.35, straight: 0.2 }] }] },
  rearWing: { name: 'Rear wing', code: 'RW', dept: 'Aerodynamics', gain: 0.95, cost: 0.9e6, copy: 0.15e6, runs: 40, cfd: 260, design: 2, make: 1, broken: 'rearWing',
    axes: [{ id: 'level', name: 'Downforce level', lo: 'Monza (skinny)', hi: 'Monaco (spoon)', fx: [{ straight: 1.1, power: 0.1, highSpeed: -0.3 }, { highSpeed: 0.7, lowSpeed: 0.45, straight: -0.45 }] },
      { id: 'beam', name: 'Beam wing', lo: 'Efficiency', hi: 'Load', fx: [{ straight: 0.35, highSpeed: 0.1 }, { highSpeed: 0.3, lowSpeed: 0.2, straight: -0.1 }] }] },
  floor: { name: 'Floor and diffuser', code: 'FL', dept: 'Aerodynamics', gain: 1.4, cost: 2.4e6, copy: 0.45e6, runs: 70, cfd: 520, design: 3, make: 2, broken: 'floor',
    axes: [{ id: 'peak', name: 'Philosophy', lo: 'Stable platform', hi: 'Peak load', fx: [{ tyre: 0.45, lowSpeed: 0.25, highSpeed: 0.2 }, { highSpeed: 0.8, lowSpeed: 0.35, tyre: -0.2 }] },
      { id: 'ride', name: 'Ride height', lo: 'High (safe)', hi: 'Low (aggressive)', fx: [{ reliability: 0.35, tyre: 0.15 }, { highSpeed: 0.4, straight: 0.2, reliability: -0.3 }] }] },
  sidepods: { name: 'Sidepods and cooling', code: 'SP', dept: 'Aerodynamics', gain: 0.85, cost: 1.5e6, copy: 0.3e6, runs: 50, cfd: 420, design: 2, make: 2, broken: 'sidepods',
    axes: [{ id: 'cool', name: 'Cooling', lo: 'Tight packaging', hi: 'Big cooling', fx: [{ straight: 0.6, highSpeed: 0.3, reliability: -0.25 }, { reliability: 0.7, power: 0.15, straight: -0.2 }] },
      { id: 'flow', name: 'Bodywork', lo: 'Downwash', hi: 'Water slide', fx: [{ highSpeed: 0.4, lowSpeed: 0.1 }, { straight: 0.3, tyre: 0.15 }] }] },
  suspension: { name: 'Suspension', code: 'SU', dept: 'Chassis', gain: 0.9, cost: 1.6e6, copy: 0.25e6, runs: 10, cfd: 70, design: 3, make: 2,
    axes: [{ id: 'grip', name: 'Set-up window', lo: 'Aero platform', hi: 'Mechanical grip', fx: [{ highSpeed: 0.55, straight: 0.1 }, { lowSpeed: 0.6, tyre: 0.4 }] },
      { id: 'anti', name: 'Anti-dive', lo: 'Compliant', hi: 'Stiff', fx: [{ tyre: 0.4, lowSpeed: 0.15 }, { highSpeed: 0.35, lowSpeed: 0.2, tyre: -0.1 }] }] },
  brakes: { name: 'Brakes', code: 'BR', dept: 'Chassis', gain: 0.7, cost: 0.7e6, copy: 0.12e6, runs: 6, cfd: 90, design: 2, make: 1,
    axes: [{ id: 'cool', name: 'Ducts', lo: 'Small (light)', hi: 'Big cooling', fx: [{ weight: 0.5, straight: 0.15 }, { reliability: 0.45, tyre: 0.35 }] },
      { id: 'bite', name: 'Pedal', lo: 'Progressive', hi: 'Strong bite', fx: [{ tyre: 0.3, reliability: 0.1 }, { lowSpeed: 0.5 }] }] },
  chassis: { name: 'Chassis', code: 'CH', dept: 'Chassis', gain: 1.2, cost: 2.0e6, copy: 0.6e6, runs: 0, cfd: 50, design: 3, make: 2,
    axes: [{ id: 'mass', name: 'Target', lo: 'Stiffness', hi: 'Weight saving', fx: [{ highSpeed: 0.3, lowSpeed: 0.3, reliability: 0.15 }, { weight: 1.0 }] },
      { id: 'cog', name: 'Layout', lo: 'Rearward', hi: 'Forward', fx: [{ tyre: 0.3, straight: 0.1 }, { lowSpeed: 0.35 }] }] },
  pu: { name: 'Power unit', code: 'PU', dept: 'Power unit', gain: 1.0, cost: 3.8e6, copy: 0.9e6, runs: 0, cfd: 120, design: 4, make: 2, works: true,
    axes: [{ id: 'peak', name: 'Combustion', lo: 'Reliability', hi: 'Peak power', fx: [{ reliability: 0.8, power: 0.3 }, { power: 1.1, reliability: -0.3 }] },
      { id: 'ers', name: 'Deployment', lo: 'Corner exits', hi: 'Long straights', fx: [{ lowSpeed: 0.3, power: 0.2 }, { straight: 0.45, power: 0.2 }] }] },
};
export const SLOT_IDS = Object.keys(SLOTS);
export const FACILITIES = {
  tunnel: { name: 'Wind tunnel', what: 'Each run finds more; aero parts correlate better' },
  cfd: { name: 'CFD cluster', what: 'More design work out of each CFD item' },
  factory: { name: 'Factory', what: 'Parts and copies made faster and cheaper' },
  sim: { name: 'Simulator', what: 'Every part correlates better with the track' },
};
export const FACILITY_COST = [0, 6e6, 10e6, 16e6, 24e6]; // capital spend (outside the cap) to go to the next level

let seedN = 1;
const rnd = (st) => { st.seed = (st.seed * 1664525 + 1013904223) >>> 0; return st.seed / 4294967296; };
const gauss = (st) => { let u = 0; for (let k = 0; k < 6; k++) u += rnd(st); return (u - 3) / 1.2; }; // ~N(0, 1), bounded
const fmtM = (x) => `$${(x / 1e6).toFixed(1)}M`;
export { fmtM };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** A new season's R&D: every team's car and departments, the player's components on their launch specs. */
export function newRD(playerTeam, seed = Math.floor(Math.random() * 1e9)) {
  const st = { v: 2, seed: seed >>> 0 || seedN++, round: 0, player: playerTeam, teams: {}, pu: {}, log: [], capex: 30e6, mods: {} };
  for (const t of TEAMS) {
    const base = CAR_RATING[t.id] ?? 96, ch = CHARACTER[t.id] ?? {};
    const attrs = {};
    for (const a of ATTRS) attrs[a] = base + (ch[a] ?? 0) + (a === 'reliability' ? (base - 97) * 0.6 : a === 'weight' ? (base - 98) * 0.5 : 0);
    st.teams[t.id] = {
      attrs, spent: 0, projects: [], parts: [], history: [],
      atr: { runs: 0, cfd: 0 }, period: -1, overspend: false,
      expertise: Object.fromEntries(SLOT_IDS.map((k) => [k, clamp(0.35 + (base - 95) * 0.06, 0.2, 0.75)])),
      facilities: { tunnel: base > 98.5 ? 3 : 2, cfd: base > 98.5 ? 3 : 2, factory: base > 97.5 ? 3 : 2, sim: base > 99 ? 3 : base > 96.5 ? 2 : 1 },
      puUpgrades: WORKS[t.id] ? 3 : 0,
    };
  }
  initPlayer(st);
  // The first aero testing period, by last season's order (the car ratings), and the other teams'
  // first projects: development never stops over the winter.
  const order = TEAMS.map((t) => t.id).sort((a, b) => (CAR_RATING[b] ?? 96) - (CAR_RATING[a] ?? 96));
  for (const t of TEAMS) {
    const T = st.teams[t.id], pos = order.indexOf(t.id) + 1;
    T.period = 0;
    T.atr = { runs: Math.round(ATR_BASE.runs * atrFactor(pos)), cfd: Math.round(ATR_BASE.cfd * atrFactor(pos)) };
    if (t.id !== playerTeam) aiDecide(st, t.id, [], pos);
    T.history.push({ round: 0, rating: overall(st, t.id) });
  }
  return st;
}
/** The player's components: the launch spec of each, fitted, three copies. */
function initPlayer(st) {
  st.specs = SLOT_IDS.map((slot) => ({ id: `${slot}-0`, slot, n: 0, name: `${SLOTS[slot].code}-00`, label: '2026 launch spec', dir: [0.5, 0.5], delta: {}, actual: {}, validated: true, copies: 3, made: 0, cost: 0, factor: 1 }));
  st.fitted = Object.fromEntries(SLOT_IDS.map((s) => [s, `${s}-0`]));
  st.pending = [];               // copies being made: { specId, ready }
  st.lastProject = {};           // per slot, the round the last design finished
}
/** An older season's R&D (one model of development ago): kept as it is, the player's side added. */
export function upgradeRD(st) {
  if (!st || st.v === 2) return st;
  st.v = 2; st.mods ??= {};
  for (const T of Object.values(st.teams)) {
    T.projects = [];
    const e = T.expertise ?? {};
    T.expertise = Object.fromEntries(SLOT_IDS.map((k) => [k, clamp(typeof e[k] === 'number' ? e[k] : 0.45, 0.2, 0.9)]));
  }
  initPlayer(st);
  return st;
}

// ------------------------------------------------------------------------------------------ the car
/**
 * A team's attributes: the player's are the chassis plus the fitted specs. By default what the team
 * knows (a new part not yet run counts at 85% of its prediction); truth = what the parts really do (the
 * car on track: a part that backfired is slow whether anyone knows it yet or not).
 */
export function attrsOf(st, teamId, truth = false) {
  const T = st.teams[teamId];
  if (teamId !== st.player || !st.specs) return T.attrs;
  const A = { ...T.attrs };
  for (const slot of SLOT_IDS) {
    const sp = specById(st, st.fitted[slot]);
    if (!sp) continue;
    const real = truth || sp.validated, d = real ? sp.actual : sp.delta;
    for (const k in d) A[k] += d[k] * (real ? 1 : 0.85);
  }
  return A;
}
export const specById = (st, id) => st.specs?.find((s) => s.id === id) ?? null;
export function overall(st, teamId) {
  const ids = Object.keys(PROFILE);
  return ids.reduce((s, id) => s + trackRating(st, teamId, id), 0) / ids.length;
}
export function trackRating(st, teamId, trackId, A = attrsOf(st, teamId)) {
  const P = profileOf(trackId), pu = st.pu[PU[teamId]] ?? 0;   // the supplier's power unit upgrades, for every team it supplies
  let r = 0;
  for (const k of Object.keys(P)) r += P[k] * (k === 'power' ? A.power + pu : A[k]);
  return r + (A.weight - 98) * 0.08;
}
/** Ratings for every team at a circuit (what game/grid.js turns into pace): the real cars. */
export function ratingsAt(st, trackId) { return Object.fromEntries(TEAMS.map((t) => [t.id, trackRating(st, t.id, trackId, attrsOf(st, t.id, true))])); }
/**
 * The player's car in the physics, relative to the best car at this circuit: grip from the cornering
 * attributes, power from the straight-line ones. ~0.3% of lap time per rating point.
 */
export function playerCarFactors(st, trackId) {
  const P = profileOf(trackId);
  const best = Math.max(...TEAMS.map((t) => trackRating(st, t.id, trackId, attrsOf(st, t.id, true))));
  const mine = trackRating(st, st.player, trackId, attrsOf(st, st.player, true)), gap = Math.max(-3, best - mine);
  const cornerW = P.lowSpeed + P.highSpeed + P.tyre, lineW = P.straight + P.power;
  const cornerGap = gap * (cornerW / (cornerW + lineW)) / Math.max(0.2, cornerW), lineGap = gap * (lineW / (cornerW + lineW)) / Math.max(0.2, lineW);
  return { grip: Math.max(0.85, (1 - 0.003 * cornerGap) ** 2), power: Math.max(0.85, 1 - 0.004 * lineGap), rating: mine, best };
}
/** The chance a car's race ends with a failure (per race). */
export const failureChance = (st, teamId) => Math.max(0.004, (97.5 - attrsOf(st, teamId, true).reliability) * 0.006 + 0.006);
/** ATR allowance factor for a championship position (1 = leader). */
export const atrFactor = (pos) => Math.min(1.2, 0.7 + (pos - 1) * 0.05);
/** Rankings: every team's overall rating, best first. */
export const rankings = (st) => TEAMS.map((t) => ({ t, rating: overall(st, t.id) })).sort((a, b) => b.rating - a.rating);

// ------------------------------------------------------------------------------------- designing
/** The attribute changes of a design direction (per unit of gain): each axis between its two ends. */
export function directionFx(slot, dir) {
  const S = SLOTS[slot], out = {};
  S.axes.forEach((ax, i) => {
    const v = dir[i] ?? 0.5;
    for (const end of [0, 1]) for (const [k, w] of Object.entries(ax.fx[end])) out[k] = (out[k] ?? 0) + w * (end ? v : 1 - v);
  });
  // A balanced design is a compromise: a little less of everything than an extreme one gives somewhere.
  const ext = S.axes.reduce((s, _, i) => s + Math.abs((dir[i] ?? 0.5) - 0.5), 0) / S.axes.length;  // 0..0.5
  const sum = Object.values(out).reduce((s, w) => s + Math.max(0, w), 0) || 1;
  const k = (0.9 + ext * 0.4) / sum * 1.6;
  for (const a in out) out[a] *= k;
  return out;
}
/** The default plan for a project (a balanced brief and a fair share of everything). */
export function defaultPlan(st, slot) {
  const S = SLOTS[slot], T = st.teams[st.player];
  const free = Math.max(0.1, 1 - T.projects.reduce((s, p) => s + (p.stage === 'Design' ? p.designers ?? 0.35 : 0), 0));
  return { dir: [0.5, 0.5], designers: Math.min(0.35, free), runs: Math.min(S.runs, T.atr.runs), cfd: Math.min(S.cfd, T.atr.cfd), copies: 2 };
}
/** The design office's capacity (staff: the technical director) and its share already in use. */
export function designLoad(st, teamId = st.player) {
  const used = st.teams[teamId].projects.reduce((s, p) => s + (p.stage === 'Design' ? p.designers ?? 0.35 : 0), 0);
  return { used, cap: 1, slots: (st.mods?.slots ?? 3) };
}
/**
 * What a project would give and take: plan { dir: [a, b], designers (share of the office), runs, cfd,
 * copies }. Returns { fx (attribute changes, expected), mean (rating step), lo, hi, spread, cost,
 * designRounds, makeRounds, rounds, blocked, quality }.
 */
export function quote(st, teamId, slot, plan) {
  const T = st.teams[teamId], S = SLOTS[slot], M = st.mods ?? {};
  const isAero = S.dept === 'Aerodynamics';
  const fx = directionFx(slot, plan.dir);
  // How far the car already is in what this design targets (diminishing returns near the top).
  const A = attrsOf(st, teamId), keys = Object.keys(fx).filter((k) => fx[k] > 0);
  const level = keys.length ? keys.reduce((s, k) => s + A[k] * fx[k], 0) / keys.reduce((s, k) => s + fx[k], 0) : 98;
  const dim = clamp((104.5 - level) / 6.5, 0.3, 1.35);
  // Testing: the runs and CFD items it gets against what a thorough design needs.
  const tun = 1 + (T.facilities.tunnel - 2) * 0.08, cfdEff = 1 + (T.facilities.cfd - 2) * 0.1;
  const rf = S.runs ? (plan.runs * tun) / S.runs : 1, cf = (plan.cfd * cfdEff) / S.cfd;
  const quality = 0.4 + 0.38 * (1 - Math.exp(-1.3 * cf)) + (S.runs ? 0.38 * (1 - Math.exp(-1.3 * rf)) : 0.3 * (1 - Math.exp(-1.3 * cf)));
  const exp = T.expertise[slot] ?? 0.4;
  const staff = isAero ? M.aero ?? 1 : S.dept === 'Chassis' ? M.chassis ?? 1 : 1;
  const mean = S.gain * quality * dim * (0.8 + exp * 0.45) * staff;
  // The uncertainty: less testing, less knowledge, worse correlation tools, a more extreme brief.
  const ext = S.axes.reduce((s, _, i) => s + Math.abs((plan.dir[i] ?? 0.5) - 0.5), 0) / S.axes.length;
  const corr = Math.max(0.35, 1 - (T.facilities.sim - 1) * 0.1 - (isAero ? (T.facilities.tunnel - 1) * 0.07 : 0)) * (M.corr ?? 1);
  const spread = clamp((0.42 - 0.12 * Math.min(1.5, rf) - 0.1 * Math.min(1.5, cf)) * (1.25 - exp * 0.6) * corr * (1 + ext * 0.8), 0.05, 0.6);
  const designRounds = Math.max(1, Math.round(S.design * (0.35 / clamp(plan.designers, 0.1, 0.7)) ** 0.8 / (M.design ?? 1)));
  const makeRounds = Math.max(1, S.make - (T.facilities.factory >= 4 ? 1 : 0));
  const copyCost = S.copy * (1 - (T.facilities.factory - 2) * 0.06);
  const cost = S.cost * (0.75 + 0.15 * Math.min(2, rf) + 0.1 * Math.min(2, cf)) * (0.8 + plan.designers * 0.6) + copyCost * plan.copies;
  const works = WORKS[teamId];
  const blocked = S.works && !works ? `Customer team: ${PU_NAME[PU[teamId]]} develop the power unit` : S.works && T.puUpgrades <= 0 ? 'No power unit upgrades left this season' : null;
  const out = {};
  for (const k in fx) out[k] = fx[k] * mean;
  // The risk the concept doesn't work at all: the same things that make the result uncertain, an extreme
  // brief most of all. Of the failures, about 4 in 10 backfire (the part is slower than the old one).
  const risk = clamp(0.055 + spread * 0.34 + ext * 0.14 - exp * 0.05, 0.04, 0.35);
  return { slot, plan, fx: out, mean, lo: mean * (1 - spread * 1.6), hi: mean * (1 + spread * 1.2), spread, cost, copyCost, designRounds, makeRounds, rounds: designRounds + makeRounds, blocked, quality, exp,
    risk, backfire: risk * 0.4 };
}
/** The team's resources now: budget left, ATR left this period, the design office. */
export function resources(st, teamId = st.player) {
  const T = st.teams[teamId], L = designLoad(st, teamId);
  return { budget: COST_CAP - T.spent, runs: T.atr.runs, cfd: T.atr.cfd, slots: L.slots - T.projects.length, office: L.cap - L.used };
}
/** Start a project. Returns an error string, or null. */
export function startProject(st, teamId, slot, plan) {
  const T = st.teams[teamId], q = quote(st, teamId, slot, plan), L = designLoad(st, teamId);
  if (q.blocked) return q.blocked;
  if (T.projects.length >= L.slots) return `All ${L.slots} project slots are in use`;
  if (T.projects.some((p) => p.slot === slot)) return 'Already a project on this part';
  if (plan.designers > L.cap - L.used + 1e-6) return `Only ${Math.round((L.cap - L.used) * 100)}% of the design office is free`;
  if (plan.runs > T.atr.runs) return `Only ${T.atr.runs} wind tunnel runs left this period`;
  if (plan.cfd > T.atr.cfd) return `Only ${T.atr.cfd} CFD items left this period`;
  if (T.spent + q.cost > COST_CAP) return 'That would go over the cost cap';
  T.atr.runs -= plan.runs; T.atr.cfd -= plan.cfd; T.spent += q.cost;
  if (SLOTS[slot].works) T.puUpgrades--;
  // What it will really give is decided now (and only known once it has run on track, or, for a dead
  // end, when the tunnel stops finding anything at the end of the design stage).
  const u = rnd(st);
  const outcome = u < q.backfire ? 'backfire' : u < q.risk ? (rnd(st) < 0.5 ? 'deadend' : 'dud') : 'ok';
  const factor = outcome === 'ok' ? Math.max(0.3, 1 + gauss(st) * q.spread)
    : outcome === 'backfire' ? -(0.25 + rnd(st) * 0.45)       // slower than the part it replaces
    : rnd(st) * 0.12;                                          // a dud (or a dead end): next to nothing
  T.projects.push({ slot, plan: { ...plan, dir: plan.dir.slice() }, name: SLOTS[slot].name, designers: plan.designers, started: st.round,
    design: q.designRounds, make: q.makeRounds, left: q.rounds, stage: 'Design', fx: q.fx, mean: q.mean, lo: q.lo, hi: q.hi, factor, outcome, risk: q.risk, cost: q.cost, copyCost: q.copyCost, copies: plan.copies });
  if (teamId === st.player) st.log.push({ round: st.round, kind: 'design', text: `${SLOTS[slot].name} design started: ${dirLabel(slot, plan.dir)}. ${fmtM(q.cost)}, ${plan.runs} runs, ${plan.cfd} CFD items.` });
  return null;
}
/** Cancel a project (what's been spent is gone; testing used this period isn't returned). */
export function cancelProject(st, slot) {
  const T = st.teams[st.player], k = T.projects.findIndex((p) => p.slot === slot);
  if (k < 0) return;
  const p = T.projects.splice(k, 1)[0];
  if (SLOTS[slot].works) T.puUpgrades++;
  st.log.push({ round: st.round, kind: 'design', text: `${p.name} project cancelled.` });
}
/** The brief in words ("High downforce · Outwash"). */
export function dirLabel(slot, dir) {
  return SLOTS[slot].axes.map((ax, i) => { const v = dir[i] ?? 0.5; return v < 0.36 ? ax.lo : v > 0.64 ? ax.hi : `Balanced ${ax.name.toLowerCase()}`; }).join(' · ');
}

// ----------------------------------------------------------------------------------- the inventory
/** Fit a spec for the next race (it needs a copy). */
export function fitSpec(st, specId) {
  const sp = specById(st, specId);
  if (!sp) return 'No such part';
  if (sp.copies < 1) return 'No copy of this spec left';
  st.fitted[sp.slot] = sp.id;
  return null;
}
/** The best spec of each component for a circuit (the ones with a copy). */
export function bestFit(st, trackId) {
  const P = profileOf(trackId), out = {};
  for (const slot of SLOT_IDS) {
    let best = null, bv = -Infinity;
    for (const sp of st.specs.filter((x) => x.slot === slot && x.copies > 0)) {
      const d = sp.validated ? sp.actual : sp.delta, f = sp.validated ? 1 : 0.85;
      const v = Object.keys(P).reduce((s, k) => s + P[k] * (d[k] ?? 0) * f, 0) + (d.weight ?? 0) * 0.08 * f + (d.reliability ?? 0) * 0.02;
      if (v > bv) { bv = v; best = sp; }
    }
    if (best) out[slot] = best.id;
  }
  return out;
}
/** How much a spec is worth at a circuit (rating points). */
export function specValue(st, sp, trackId) {
  const P = profileOf(trackId), d = sp.validated ? sp.actual : sp.delta, f = sp.validated ? 1 : 0.85;
  return Object.keys(P).reduce((s, k) => s + P[k] * (d[k] ?? 0) * f, 0) + (d.weight ?? 0) * 0.08 * f;
}
/** Make another copy of a spec (ready at the next round, or the one after). */
export function makeCopy(st, specId) {
  const sp = specById(st, specId), T = st.teams[st.player];
  if (!sp || sp.n === 0) return 'The launch spec is always available';
  const c = SLOTS[sp.slot].copy * (1 - (T.facilities.factory - 2) * 0.06);
  if (T.spent + c > COST_CAP) return 'That would go over the cost cap';
  T.spent += c;
  st.pending.push({ specId, ready: st.round + Math.max(1, SLOTS[sp.slot].make - 1) });
  st.log.push({ round: st.round, kind: 'factory', text: `Another ${sp.name} going through the factory (${fmtM(c)}).` });
  return null;
}
/**
 * The player's practice laps correlated the fitted new parts: their real gain is now known. Returns the
 * specs validated (with a verdict).
 */
export function validate(st, teamId = st.player) {
  if (teamId !== st.player || !st.specs) return null;
  const sp = SLOT_IDS.map((s) => specById(st, st.fitted[s])).find((x) => x && !x.validated);
  if (!sp) return null;
  sp.validated = true;
  const r = sp.factor;
  sp.verdict = r < 0 ? 'Backfired: slower than the old part' : r < 0.15 ? 'A dud: no gain at all' : r > 1.12 ? 'Better than the tunnel said' : r > 0.88 ? 'Correlates with the tunnel' : r > 0.5 ? 'Below what the tunnel said' : 'Does not correlate';
  st.log.push({ round: st.round, kind: r < 0.15 ? 'warn' : 'track', text: `${sp.name} ${SLOTS[sp.slot].name.toLowerCase()}: ${sp.verdict.toLowerCase()} (${Math.round(r * 100)}% of the prediction).` });
  // A part that doesn't work comes off: the one it replaced goes back on (if a copy is left).
  const old = r < 0.15 && specById(st, sp.replaced);
  if (old && old.copies > 0) {
    st.fitted[sp.slot] = old.id;
    sp.reverted = old.name;
    st.log.push({ round: st.round, kind: 'track', text: `Back to ${old.name} on the ${SLOTS[sp.slot].name.toLowerCase()}: ${sp.name} stays in the stores.` });
  }
  return sp;
}
/** Parts broken in a crash this weekend ({ frontWing: true, ... }): a copy of the fitted spec is written off. */
function writeOff(st, broken = {}) {
  for (const slot of SLOT_IDS) {
    const key = SLOTS[slot].broken;
    if (!key || !broken[key]) continue;
    const sp = specById(st, st.fitted[slot]);
    if (!sp || sp.n === 0) continue;
    sp.copies = Math.max(0, sp.copies - 1);
    if (sp.copies === 0) {
      const alt = st.specs.filter((x) => x.slot === slot && x.copies > 0).sort((a, b) => b.n - a.n)[0];
      st.fitted[slot] = alt.id;
      st.log.push({ round: st.round, kind: 'factory', text: `${sp.name} destroyed in the crash and no spare left: back to ${alt.name}. Make another copy.` });
    } else st.log.push({ round: st.round, kind: 'factory', text: `${sp.name} written off in the crash. ${sp.copies} cop${sp.copies === 1 ? 'y' : 'ies'} left.` });
  }
}

// ----------------------------------------------------------------------------------------- the season
/**
 * After a race weekend: the running costs (and repairs), projects move on, finished ones join the
 * inventory (the player's) or the car (the others'), copies arrive, crash damage writes copies off, the
 * ATR period turns over, the other teams decide. standings: team ids in constructors' order; upcoming:
 * the next circuits; repairs: { teamId: $ }; broken: the player's parts broken this weekend.
 */
export function advance(st, { standings = TEAMS.map((t) => t.id), upcoming = [], repairs = {}, broken = {} } = {}) {
  upgradeRD(st);
  st.round++;
  writeOff(st, broken);
  for (const c of st.pending.filter((x) => x.ready <= st.round)) {
    const sp = specById(st, c.specId);
    if (sp) sp.copies++;
  }
  st.pending = st.pending.filter((x) => x.ready > st.round);
  for (const t of TEAMS) {
    const T = st.teams[t.id], pos = standings.indexOf(t.id) + 1 || 6;
    T.spent += RUN_COST + (repairs[t.id] ?? 0);
    const period = Math.floor((st.round - 1) / ATR_ROUNDS);
    if (period !== T.period) {
      T.period = period;
      const f = atrFactor(pos) * (T.overspend ? 0.9 : 1);
      T.atr = { runs: Math.round(ATR_BASE.runs * f), cfd: Math.round(ATR_BASE.cfd * f) };
      if (t.id === st.player) st.log.push({ round: st.round, kind: 'atr', text: `New testing period: ${T.atr.runs} wind tunnel runs, ${T.atr.cfd} CFD items (P${pos} in the constructors').` });
    }
    for (const p of T.projects) {
      p.left--;
      p.stage = p.left > p.make ? 'Design' : p.left > 0 ? 'Manufacturing' : 'Ready';
    }
    // A dead end shows itself when the design stage ends: the tunnel stops finding anything, the project
    // stops before anything is made (the manufacturing money for the copies isn't spent).
    for (const p of T.projects.filter((x) => x.outcome === 'deadend' && x.stage !== 'Design')) {
      T.projects.splice(T.projects.indexOf(p), 1);
      const refund = (p.copyCost ?? 0) * (p.copies ?? 0);
      T.spent = Math.max(0, T.spent - refund);
      T.expertise[p.slot] = clamp((T.expertise[p.slot] ?? 0.4) + 0.04 * (1 - (T.expertise[p.slot] ?? 0.4)), 0, 1);  // something learned
      (st.flops ??= []).push({ round: st.round, team: t.id, slot: p.slot, kind: 'deadend', label: dirLabel(p.slot, p.plan.dir) });
      if (t.id === st.player) st.log.push({ round: st.round, kind: 'warn', text: `${SLOTS[p.slot].name} (${dirLabel(p.slot, p.plan.dir)}): a dead end. The tunnel stopped finding anything and the concept doesn't deliver what CFD promised. Project stopped${refund ? `; the ${fmtM(refund)} for the copies is saved` : ''}.` });
    }
    for (const p of T.projects.filter((x) => x.left <= 0)) {
      T.projects.splice(T.projects.indexOf(p), 1);
      T.expertise[p.slot] = clamp((T.expertise[p.slot] ?? 0.4) + 0.08 * (1 - (T.expertise[p.slot] ?? 0.4)) * (st.mods?.learn ?? 1), 0, 1);
      if (t.id === st.player) {
        const n = 1 + Math.max(0, ...st.specs.filter((x) => x.slot === p.slot).map((x) => x.n));
        const actual = realFx(p.fx, p.factor);
        const sp = { id: `${p.slot}-${n}`, slot: p.slot, n, name: `${SLOTS[p.slot].code}-${String(n).padStart(2, '0')}`, label: dirLabel(p.slot, p.plan.dir), dir: p.plan.dir,
          delta: p.fx, actual, mean: p.mean, lo: p.lo, hi: p.hi, factor: p.factor, outcome: p.outcome ?? 'ok', validated: false, copies: p.copies, made: st.round, cost: p.cost, replaced: st.fitted[p.slot] };
        st.specs.push(sp);
        st.fitted[p.slot] = sp.id;
        st.lastProject[p.slot] = st.round;
        st.log.push({ round: st.round, kind: 'ready', text: `${sp.name} ${SLOTS[p.slot].name.toLowerCase()} (${sp.label}) is ready: ${p.copies} cop${p.copies === 1 ? 'y' : 'ies'}, fitted for the next race. Run it in practice to correlate it.` });
      } else if (p.factor < 0.15) {
        // A rival's dud or backfire: they run it, find it's no better (or worse) and go back to the old part.
        (st.flops ??= []).push({ round: st.round, team: t.id, slot: p.slot, kind: p.factor < 0 ? 'backfire' : 'dud', label: dirLabel(p.slot, p.plan.dir) });
      } else {
        for (const [k, v] of Object.entries(p.fx)) T.attrs[k] += v * p.factor;
        if (SLOTS[p.slot].works) st.pu[PU[t.id]] = (st.pu[PU[t.id]] ?? 0) + (p.fx.power ?? 0) * p.factor * 0.5;
      }
    }
    if (T.spent > COST_CAP && !T.overspend) { T.overspend = true; if (t.id === st.player) st.log.push({ round: st.round, kind: 'warn', text: 'Over the cost cap: the FIA cuts our aero testing by 10%.' }); }
    if (t.id !== st.player) aiDecide(st, t.id, upcoming, pos);
    T.history.push({ round: st.round, rating: overall(st, t.id) });
  }
  if (st.log.length > 80) st.log.splice(0, st.log.length - 80);
  if (st.flops?.length > 60) st.flops.splice(0, st.flops.length - 60);
}
/**
 * What a part really does to the car, from its prediction and how it turned out (factor: real / predicted).
 * A working part scales everything, its compromises too. One that failed (factor under 0.3) still carries
 * its compromises (the downforce it trades for top speed is gone either way): a dud gains almost nothing
 * for them, and a backfire loses where it was meant to gain.
 */
function realFx(fx, factor) {
  return Object.fromEntries(Object.entries(fx).map(([k, v]) => [k, factor >= 0.3 || v <= 0 ? v * (factor >= 0.3 ? factor : factor < 0 ? 1.15 : 0.6) : v * factor]));
}
/** An AI team's development: its weak areas for the circuits ahead, a brief to suit, resources to match. */
function aiDecide(st, teamId, upcoming, pos) {
  const T = st.teams[teamId];
  const late = st.round >= 16 && pos <= 3;                      // the top teams turn to next year's car
  const need = { lowSpeed: 0.12, highSpeed: 0.12, straight: 0.12, power: 0.1, tyre: 0.1 };
  for (const id of upcoming.slice(0, 6)) { const P = profileOf(id); for (const k in need) need[k] += P[k]; }
  for (let k = 0; k < (late ? 1 : 3) && T.projects.length < 3; k++) {
    const options = SLOT_IDS.map((slot) => {
      const S = SLOTS[slot];
      if (T.projects.some((x) => x.slot === slot) || (S.works && (!WORKS[teamId] || T.puUpgrades <= 0))) return null;
      // A brief that leans towards what's needed: each axis towards the end whose effects are worth more.
      const dir = S.axes.map((ax) => {
        const val = (end) => Object.entries(ax.fx[end]).reduce((s, [a, w]) => s + w * ((need[a] ?? 0.1) + Math.max(0, 99 - T.attrs[a]) * 0.04), 0);
        return clamp(0.5 + (val(1) - val(0)) * 0.9 + (rnd(st) - 0.5) * 0.3, 0.1, 0.9);
      });
      const share = Math.min(1, T.atr.runs / 3 / Math.max(1, S.runs)), cshare = Math.min(1, T.atr.cfd / 3 / S.cfd);
      const plan = { dir, designers: 0.3, runs: Math.round(S.runs * clamp(share, 0.4, 1)), cfd: Math.round(S.cfd * clamp(cshare, 0.4, 1)), copies: 2 };
      const q = quote(st, teamId, slot, plan);
      if (q.blocked || plan.runs > T.atr.runs || plan.cfd > T.atr.cfd) return null;
      const value = Object.entries(q.fx).reduce((s, [a, v]) => s + v * ((need[a] ?? 0.1) + Math.max(0, 99 - T.attrs[a]) * 0.05), 0) / (q.cost / 1e6 + 1);
      return { slot, plan, q, value: value * (0.7 + rnd(st) * 0.6) };
    }).filter(Boolean).sort((a, b) => b.value - a.value);
    if (!options.length) break;
    const o = options[0];
    if (COST_CAP - T.spent - RUN_COST * (24 - st.round) < o.q.cost) break;
    startProject(st, teamId, o.slot, o.plan);
  }
}
/** Spend capital on a facility (outside the cost cap: a separate capital allowance). */
export function upgradeFacility(st, teamId, key) {
  const T = st.teams[teamId], lvl = T.facilities[key];
  if (lvl >= 5) return 'Already at the top level';
  const c = FACILITY_COST[lvl];
  if (st.capex < c) return 'Not enough capital allowance';
  st.capex -= c; T.facilities[key] = lvl + 1;
  st.log.push({ round: st.round, kind: 'facility', text: `${FACILITIES[key].name} upgraded to level ${lvl + 1} (${fmtM(c)} capital).` });
  return null;
}
