import { TEAMS } from '../front/teams.js';
import { CAR_RATING } from './grid.js';

/*
 * Research and development, modelled on how an F1 team actually develops its car under the 2026 rules:
 *
 * THE CAR is a set of performance attributes (0-100, 100 = the best on the grid today):
 *   lowSpeed    slow-corner grip: mechanical grip, low-speed downforce, traction
 *   highSpeed   fast-corner grip: high-speed downforce, stability
 *   straight    straight-line speed: drag (aero efficiency)
 *   power       the power unit: combustion engine and the 50/50 electrical deployment
 *   tyre        tyre management: how kind the car is to its tyres (deg, temperatures)
 *   weight      mass over the minimum (lighter is quicker everywhere)
 *   reliability how often something fails
 * A circuit weights them its own way (Monaco: slow corners and tyres; Monza: straight-line speed and
 * power; Silverstone and Suzuka: fast corners), so a car can be a front-runner at one and midfield at
 * the next. The rating at a circuit is what the cars race with.
 *
 * THE LIMITS:
 *   cost cap      $215M a season (2026), everything inside it: running the team at each race, the
 *                 parts designed and made, crash damage repairs. Overspend and the FIA cuts the
 *                 team's aero testing.
 *   ATR           aerodynamic testing restrictions: wind tunnel runs and CFD items per 8-week testing
 *                 period (here: every 3 rounds), on a sliding scale by championship position: the
 *                 leader gets 70% of the baseline, each place down +5%, last place 120%.
 *
 * A PART goes through: concept and CFD (costs CFD items), wind tunnel (runs), then manufacturing; it
 * reaches the car at a race weekend. Until it has been run on track and its data correlated (a
 * practice session's laps), it's only as good as the tunnel says: the gain is shown as a range.
 * Correlation can disappoint (or surprise): aggressive designs promise more but scatter further.
 * Every new gain is harder than the last (diminishing returns near the top).
 *
 * POWER UNITS are developed by the manufacturers (Mercedes, Ferrari, Honda, Red Bull Ford, Audi); their
 * customer teams get each upgrade too. Each works team gets a limited number of PU upgrades a season.
 *
 * THE OTHER TEAMS develop too, each with its own budget, its own ATR allowance and its own priorities
 * (its weakest areas for the circuits coming up); the top teams turn to next year's car late in the
 * season, so the development race tightens up.
 */
export const COST_CAP = 215e6;
export const RUN_COST = 6.2e6;               // running the team at a race weekend (staff, travel, logistics, power units)
export const ATR_BASE = { runs: 320, cfd: 2000 }, ATR_ROUNDS = 3;
export const ATTRS = ['lowSpeed', 'highSpeed', 'straight', 'power', 'tyre', 'weight', 'reliability'];
export const ATTR_NAMES = { lowSpeed: 'Low-speed grip', highSpeed: 'High-speed downforce', straight: 'Straight-line speed', power: 'Power unit', tyre: 'Tyre management', weight: 'Weight', reliability: 'Reliability' };
export const PU = { mclaren: 'mercedes', mercedes: 'mercedes', williams: 'mercedes', alpine: 'mercedes', ferrari: 'ferrari', haas: 'ferrari', cadillac: 'ferrari', redbull: 'redbull', racingbulls: 'redbull', aston: 'honda', audi: 'audi' };
export const PU_NAME = { mercedes: 'Mercedes', ferrari: 'Ferrari', redbull: 'Red Bull Ford', honda: 'Honda', audi: 'Audi' };
const WORKS = { mercedes: 'mercedes', ferrari: 'ferrari', redbull: 'redbull', aston: 'honda', audi: 'audi' };

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
/** The parts a team can design: department, what they improve, size of the step, and what they take. */
export const PARTS = [
  { id: 'frontWing', name: 'Front wing', dept: 'Aerodynamics', fx: { lowSpeed: 0.5, highSpeed: 0.55 }, gain: 0.9, cost: 1.2e6, runs: 40, cfd: 300, design: 2, make: 1 },
  { id: 'floor', name: 'Floor', dept: 'Aerodynamics', fx: { highSpeed: 0.65, lowSpeed: 0.45, tyre: 0.15 }, gain: 1.4, cost: 2.6e6, runs: 70, cfd: 520, design: 3, make: 2 },
  { id: 'rearWingHD', name: 'Rear wing (high downforce)', dept: 'Aerodynamics', fx: { highSpeed: 0.75, lowSpeed: 0.35, straight: -0.3 }, gain: 0.85, cost: 0.9e6, runs: 35, cfd: 240, design: 2, make: 1 },
  { id: 'rearWingLD', name: 'Rear wing (low drag)', dept: 'Aerodynamics', fx: { straight: 1.0, highSpeed: -0.25 }, gain: 0.85, cost: 0.9e6, runs: 35, cfd: 240, design: 2, make: 1 },
  { id: 'sidepods', name: 'Sidepods and engine cover', dept: 'Aerodynamics', fx: { straight: 0.5, highSpeed: 0.35, reliability: 0.3 }, gain: 0.8, cost: 1.6e6, runs: 50, cfd: 420, design: 2, make: 2 },
  { id: 'diffuser', name: 'Diffuser and beam wing', dept: 'Aerodynamics', fx: { highSpeed: 0.45, lowSpeed: 0.3, straight: 0.2 }, gain: 0.8, cost: 1.1e6, runs: 45, cfd: 380, design: 2, make: 1 },
  { id: 'suspension', name: 'Suspension geometry', dept: 'Chassis', fx: { lowSpeed: 0.65, tyre: 0.55 }, gain: 0.9, cost: 1.8e6, runs: 8, cfd: 60, design: 3, make: 2 },
  { id: 'brakes', name: 'Brake system and cooling', dept: 'Chassis', fx: { lowSpeed: 0.4, tyre: 0.35, reliability: 0.3 }, gain: 0.7, cost: 0.8e6, runs: 6, cfd: 80, design: 2, make: 1 },
  { id: 'weight', name: 'Weight reduction', dept: 'Chassis', fx: { weight: 1 }, gain: 1.3, cost: 2.2e6, runs: 0, cfd: 40, design: 3, make: 2 },
  { id: 'pu', name: 'Power unit upgrade', dept: 'Power unit', fx: { power: 1 }, gain: 1.0, cost: 4.2e6, runs: 0, cfd: 120, design: 4, make: 2, works: true },
  { id: 'reliability', name: 'Reliability package', dept: 'Durability', fx: { reliability: 1 }, gain: 1.6, cost: 0.9e6, runs: 0, cfd: 30, design: 2, make: 1 },
];
export const APPROACH = {
  safe: { name: 'Conservative', gain: 0.8, spread: 0.12, cost: 0.9, res: 0.9 },
  balanced: { name: 'Balanced', gain: 1.0, spread: 0.28, cost: 1.0, res: 1.0 },
  bold: { name: 'Aggressive', gain: 1.32, spread: 0.55, cost: 1.25, res: 1.3 },
};
export const FACILITIES = { tunnel: { name: 'Wind tunnel', what: 'Better correlation of aero parts' }, cfd: { name: 'CFD cluster', what: 'More design work per CFD item' }, factory: { name: 'Factory', what: 'Faster manufacturing' }, sim: { name: 'Simulator', what: 'Better correlation of every part' } };
export const FACILITY_COST = [0, 6e6, 10e6, 16e6, 24e6]; // capital spend (outside the cap) to go to the next level

let seedN = 1;
const rnd = (st) => { st.seed = (st.seed * 1664525 + 1013904223) >>> 0; return st.seed / 4294967296; };
const gauss = (st) => { let u = 0; for (let k = 0; k < 6; k++) u += rnd(st); return (u - 3) / 1.2; }; // ~N(0, 1), bounded
const fmtM = (x) => `$${(x / 1e6).toFixed(1)}M`;
export { fmtM };

/** A new season's R&D: every team's car and its departments. */
export function newRD(playerTeam, seed = Math.floor(Math.random() * 1e9)) {
  const st = { seed: seed >>> 0 || seedN++, round: 0, player: playerTeam, teams: {}, pu: {}, log: [], capex: 30e6 };
  for (const t of TEAMS) {
    const base = CAR_RATING[t.id] ?? 96, ch = CHARACTER[t.id] ?? {};
    const attrs = {};
    for (const a of ATTRS) attrs[a] = base + (ch[a] ?? 0) + (a === 'reliability' ? (base - 97) * 0.6 : a === 'weight' ? (base - 98) * 0.5 : 0);
    attrs.power = (base + (ch.power ?? 0));
    st.teams[t.id] = {
      attrs, spent: 0, projects: [], parts: [], history: [], focus: null,
      atr: { runs: 0, cfd: 0 }, period: -1, overspend: false,
      expertise: { Aerodynamics: 0.85 + (base - 95) * 0.04, Chassis: 0.85 + (base - 95) * 0.035, 'Power unit': 0.9, Durability: 0.9 },
      facilities: { tunnel: base > 98.5 ? 3 : 2, cfd: base > 98.5 ? 3 : 2, factory: base > 97.5 ? 3 : 2, sim: base > 99 ? 3 : base > 96.5 ? 2 : 1 },
      puUpgrades: WORKS[t.id] ? 2 : 0,
    };
  }
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

/** The car's overall rating (an average circuit) and at a particular circuit. */
export function overall(st, teamId) {
  const ids = Object.keys(PROFILE);
  return ids.reduce((s, id) => s + trackRating(st, teamId, id), 0) / ids.length;
}
export function trackRating(st, teamId, trackId) {
  const A = st.teams[teamId].attrs, P = profileOf(trackId);
  const pu = st.pu[PU[teamId]] ?? 0;   // the supplier's power unit upgrades, for every team it supplies
  let r = 0;
  for (const k of Object.keys(P)) r += P[k] * (k === 'power' ? A.power + pu : A[k]);
  return r + (A.weight - 98) * 0.08;
}
/** Ratings for every team at a circuit (what game/grid.js turns into pace). */
export function ratingsAt(st, trackId) { return Object.fromEntries(TEAMS.map((t) => [t.id, trackRating(st, t.id, trackId)])); }
/**
 * The player's car in the physics, relative to the best car (rating 100 at this circuit): grip from the
 * aero and chassis attributes, power from the power unit and the drag. ~0.3% of lap time per point.
 */
export function playerCarFactors(st, trackId) {
  const A = st.teams[st.player].attrs, P = profileOf(trackId), pu = st.pu[PU[st.player]] ?? 0;
  const best = Math.max(...TEAMS.map((t) => trackRating(st, t.id, trackId)));
  const mine = trackRating(st, st.player, trackId), gap = Math.max(-3, best - mine);
  const cornerW = P.lowSpeed + P.highSpeed + P.tyre, lineW = P.straight + P.power;
  const cornerGap = gap * (cornerW / (cornerW + lineW)) / Math.max(0.2, cornerW), lineGap = gap * (lineW / (cornerW + lineW)) / Math.max(0.2, lineW);
  void A; void pu;
  return { grip: Math.max(0.85, (1 - 0.003 * cornerGap) ** 2), power: Math.max(0.85, 1 - 0.004 * lineGap), rating: mine, best };
}
/** The chance a car's race ends with a failure (per race). */
export const failureChance = (st, teamId) => Math.max(0.004, (97.5 - st.teams[teamId].attrs.reliability) * 0.006 + 0.006);

/** ATR allowance factor for a championship position (1 = leader). */
export const atrFactor = (pos) => Math.min(1.2, 0.7 + (pos - 1) * 0.05);

/** What a project of a part would give and take, for a team now. */
export function quote(st, teamId, partId, approach = 'balanced') {
  const T = st.teams[teamId], part = PARTS.find((p) => p.id === partId), ap = APPROACH[approach];
  const keys = Object.keys(part.fx);
  const level = keys.reduce((s, k) => s + T.attrs[k] * Math.abs(part.fx[k]), 0) / keys.reduce((s, k) => s + Math.abs(part.fx[k]), 0);
  const dim = Math.max(0.3, Math.min(1.4, (104 - level) / 6));                 // diminishing returns near the top
  const exp = T.expertise[part.dept] ?? 0.9, cfdEff = 1 + (T.facilities.cfd - 2) * 0.08;
  const mean = part.gain * ap.gain * dim * exp;
  const corr = Math.max(0.3, 1 - (T.facilities.sim - 1) * 0.12 - (part.dept === 'Aerodynamics' ? (T.facilities.tunnel - 1) * 0.08 : 0));
  const spread = ap.spread * corr;
  const made = Math.max(1, part.make - (T.facilities.factory >= 4 ? 1 : 0));
  return {
    part, approach, mean, lo: mean * (1 - spread * 1.6), hi: mean * (1 + spread * 1.2), spread,
    cost: part.cost * ap.cost, runs: Math.round(part.runs * ap.res), cfd: Math.round((part.cfd * ap.res) / cfdEff), rounds: part.design + made, design: part.design, make: made,
    blocked: part.works && !WORKS[teamId] ? `Customer team: ${PU_NAME[PU[teamId]]} develop the power unit` : part.works && T.puUpgrades <= 0 ? 'No power unit upgrades left this season' : null,
  };
}
/** The team's resources now: budget left, ATR left this period, the projects running. */
export function resources(st, teamId) {
  const T = st.teams[teamId];
  return { budget: COST_CAP - T.spent, runs: T.atr.runs, cfd: T.atr.cfd, slots: 3 - T.projects.length };
}
/** Start a project (the player's choice, or an AI team's). Returns an error string, or null. */
export function startProject(st, teamId, partId, approach = 'balanced') {
  const T = st.teams[teamId], q = quote(st, teamId, partId, approach);
  if (q.blocked) return q.blocked;
  if (T.projects.length >= 3) return 'Three projects already running';
  if (T.projects.some((p) => p.partId === partId)) return 'Already being developed';
  if (q.runs > T.atr.runs) return 'Not enough wind tunnel runs left this period';
  if (q.cfd > T.atr.cfd) return 'Not enough CFD items left this period';
  if (T.spent + q.cost > COST_CAP) return 'Over the cost cap';
  T.atr.runs -= q.runs; T.atr.cfd -= q.cfd; T.spent += q.cost;
  if (q.part.works) T.puUpgrades--;
  // What it will actually give is decided now (unknown until it's correlated on track).
  const actual = q.mean * (1 + gauss(st) * q.spread);
  T.projects.push({ partId, approach, name: q.part.name, dept: q.part.dept, started: st.round, design: q.design, make: q.make, left: q.rounds, stage: 'Design', mean: q.mean, lo: q.lo, hi: q.hi, actual, cost: q.cost });
  if (teamId === st.player) st.log.push({ round: st.round, text: `${q.part.name} (${APPROACH[approach].name.toLowerCase()}) started: ${fmtM(q.cost)}, ${q.runs} runs, ${q.cfd} CFD items.` });
  return null;
}
/** Apply a part's gain to the car (the share of its effect on each attribute). */
function applyGain(st, teamId, partId, gain, share = 1) {
  const T = st.teams[teamId], part = PARTS.find((p) => p.id === partId);
  if (part.works) { st.pu[PU[teamId]] = (st.pu[PU[teamId]] ?? 0) + gain * share; return; }
  for (const [k, w] of Object.entries(part.fx)) T.attrs[k] += gain * w * share;
}
/**
 * The player's practice laps correlated a fitted part: its real gain is now known (and applied in
 * full). Returns what it turned out to be.
 */
export function validate(st, teamId, idx = 0) {
  const T = st.teams[teamId], p = T.parts.filter((x) => !x.validated)[idx];
  if (!p) return null;
  applyGain(st, teamId, p.partId, p.actual - p.provisional);
  p.validated = true;
  const ratio = p.actual / p.mean;
  p.verdict = ratio > 1.1 ? 'Better than the tunnel said' : ratio > 0.9 ? 'Correlates with the tunnel' : ratio > 0.5 ? 'Below what the tunnel said' : 'Does not correlate: little gain';
  st.log.push({ round: st.round, text: `${p.name}: track data ${p.verdict.toLowerCase()} (${p.actual >= 0 ? '+' : ''}${p.actual.toFixed(2)} pts).` });
  return p;
}

/**
 * After a race weekend: the cost of running it (and any crash repairs), projects move on a stage, parts
 * that are made reach the car, the ATR period turns over, and the other teams take their decisions.
 * standings: team ids in constructors' order (leader first); upcoming: the next circuits' ids.
 */
export function advance(st, { standings = TEAMS.map((t) => t.id), upcoming = [], repairs = {} } = {}) {
  st.round++;
  for (const t of TEAMS) {
    const T = st.teams[t.id], pos = standings.indexOf(t.id) + 1 || 6;
    T.spent += RUN_COST + (repairs[t.id] ?? 0);
    // A new aero testing period every few rounds: the allowance by championship position (an overspend cuts it).
    const period = Math.floor((st.round - 1) / ATR_ROUNDS);
    if (period !== T.period) {
      T.period = period;
      const f = atrFactor(pos) * (T.overspend ? 0.9 : 1);
      T.atr = { runs: Math.round(ATR_BASE.runs * f), cfd: Math.round(ATR_BASE.cfd * f) };
    }
    // Projects: design, then manufacturing; done ones go on the car.
    for (const p of T.projects) {
      p.left--;
      p.stage = p.left > p.make ? 'Design' : p.left > 0 ? 'Manufacturing' : 'Ready';
    }
    for (const p of T.projects.filter((x) => x.left <= 0)) {
      T.projects.splice(T.projects.indexOf(p), 1);
      const fitted = { ...p, fitted: st.round, validated: t.id !== st.player, provisional: t.id === st.player ? p.mean * 0.8 : p.actual };
      T.parts.push(fitted);
      applyGain(st, t.id, p.partId, fitted.provisional);
      if (t.id === st.player) st.log.push({ round: st.round, text: `${p.name} is ready and fitted for the next race. Run it in practice to correlate it.` });
    }
    if (T.spent > COST_CAP && !T.overspend) { T.overspend = true; if (t.id === st.player) st.log.push({ round: st.round, text: 'Over the cost cap: the FIA cuts our aero testing by 10%.' }); }
    // The other teams' decisions.
    if (t.id !== st.player) aiDecide(st, t.id, upcoming, pos);
    T.history.push({ round: st.round, rating: overall(st, t.id) });
  }
  if (st.log.length > 60) st.log.splice(0, st.log.length - 60);
}
/** An AI team's development: what to work on (its weaknesses for the circuits ahead) and how boldly. */
function aiDecide(st, teamId, upcoming, pos) {
  const T = st.teams[teamId];
  const late = st.round >= 16 && pos <= 3;                      // the top teams turn to next year's car
  const tries = late ? 1 : 3;
  const need = { lowSpeed: 0, highSpeed: 0, straight: 0, power: 0, tyre: 0 };
  for (const id of upcoming.slice(0, 6)) { const P = profileOf(id); for (const k in need) need[k] += P[k]; }
  for (let k = 0; k < tries && T.projects.length < 3; k++) {
    const options = PARTS.map((p) => {
      const q = quote(st, teamId, p.id, 'balanced');
      if (q.blocked || T.projects.some((x) => x.partId === p.id) || q.runs > T.atr.runs || q.cfd > T.atr.cfd) return null;
      const value = Object.entries(p.fx).reduce((s, [a, w]) => s + w * ((need[a] ?? 0.12) + Math.max(0, 99 - T.attrs[a]) * 0.05), 0) * q.mean / (q.cost / 1e6 + 1);
      return { p, value: value * (0.7 + rnd(st) * 0.6) };
    }).filter(Boolean).sort((a, b) => b.value - a.value);
    if (!options.length) break;
    const budgetLeft = COST_CAP - T.spent - RUN_COST * (24 - st.round);
    if (budgetLeft < options[0].p.cost) break;
    const approach = pos > 7 && rnd(st) < 0.45 ? 'bold' : rnd(st) < 0.25 ? 'safe' : 'balanced';
    startProject(st, teamId, options[0].p.id, approach);
  }
}
/** Spend capital on a facility (outside the cost cap: a separate capital allowance). */
export function upgradeFacility(st, teamId, key) {
  const T = st.teams[teamId], lvl = T.facilities[key];
  if (lvl >= 5) return 'Already at the top level';
  const c = FACILITY_COST[lvl];
  if (st.capex < c) return 'Not enough capital allowance';
  st.capex -= c; T.facilities[key] = lvl + 1;
  st.log.push({ round: st.round, text: `${FACILITIES[key].name} upgraded to level ${lvl + 1} (${fmtM(c)} capital).` });
  return null;
}
/** Rankings: every team's overall rating, best first. */
export const rankings = (st) => TEAMS.map((t) => ({ t, rating: overall(st, t.id) })).sort((a, b) => b.rating - a.rating);
