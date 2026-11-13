import { TEAMS } from '../front/teams.js';
import { SLOTS, COST_CAP, specById, fmtM } from './rd.js';

/*
 * The car's loadout: what's physically on the car and in the stores.
 *
 * THE POWER UNIT (2026 rules): six elements and the gearbox, each with a season allocation per driver
 * (the 2026 numbers include the extra unit allowed in the first year of the new engines: 4 ICE, 4
 * turbochargers, 4 exhausts, 3 MGU-K, 3 energy stores, 3 control electronics). Units go in a pool:
 * any unit not worn out can be refitted, as often as wanted. A unit's life is its mileage: past about
 * 80% of it the power fades and the chance it fails in a race climbs. Fitting more units than the
 * allocation is a grid penalty at the event where it's first used: 10 places the first time an element's
 * allocation is exceeded, 5 for each one after; more than 15 places and the car starts from the back.
 * The gearbox: a pool of 5 (the rule as published for 2024-25; the game uses it for 2026), 5 places.
 *
 * THE CHASSIS PARTS: the copies of each spec (rd.js). The factory makes them in batches: every batch
 * pays for its tooling once, and the more parts in a batch the cheaper each one (the learning curve),
 * but it ties up money and factory capacity, and a batch of a spec that is overtaken is money spent on
 * parts that end up on a shelf.
 *
 * The other drivers use up their pools too (a model of it): later in the season their grid penalties
 * come up.
 */
export const PU_ELEMENTS = {
  ICE: { name: 'Internal combustion engine', short: 'ICE', alloc: 4, life: 4400, power: 0.014, what: '1.6-litre V6 turbo on 100% sustainable fuel, about 400 kW' },
  TC: { name: 'Turbocharger', short: 'TC', alloc: 4, life: 4400, power: 0.005, what: 'Compressor and turbine on one shaft (no MGU-H from 2026)' },
  EX: { name: 'Exhaust', short: 'EX', alloc: 4, life: 4200, power: 0.002, what: 'The manifolds and tailpipe, run white-hot' },
  MGUK: { name: 'MGU-K', short: 'MGU-K', alloc: 3, life: 6000, power: 0.008, what: 'The motor-generator on the crankshaft: 350 kW deploying, harvesting under braking' },
  ES: { name: 'Energy store', short: 'ES', alloc: 3, life: 6000, power: 0.006, what: 'The battery: its state of health sets how much energy each lap can deploy' },
  CE: { name: 'Control electronics', short: 'CE', alloc: 3, life: 7400, power: 0, what: 'The power electronics and the engine control unit' },
  GB: { name: 'Gearbox', short: 'GB', alloc: 5, life: 5000, power: 0, gearbox: true, what: 'Eight forward gears, the casing and the internals' },
};
export const PU_IDS = Object.keys(PU_ELEMENTS);
/** Kilometres a power unit does over a race weekend (practice, qualifying, the race, the laps to the grid). */
export const KM_WEEKEND = 690;

const rngOf = (seed) => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** The loadout of a season: the player's power unit pool, and a model of everyone else's. */
export function newLoadout(teamId) {
  const lo = { team: teamId, units: {}, fitted: {}, exceeded: {}, pending: [], log: [], ai: {}, seed: Math.floor(Math.random() * 1e9) };
  for (const el of PU_IDS) { lo.units[el] = [{ n: 1, km: 0, dead: false }]; lo.fitted[el] = 1; lo.exceeded[el] = 0; }
  for (const t of TEAMS) t.drivers.forEach((_, k) => {
    const id = `${t.id}-${k}`;
    if (id === `${teamId}-0`) return;
    lo.ai[id] = Object.fromEntries(PU_IDS.map((el) => [el, { used: 1, km: 0, exceeded: 0 }]));
  });
  return lo;
}
export const unitOf = (lo, el, n = lo.fitted[el]) => lo.units[el].find((u) => u.n === n);
/** A unit's wear: 0 new .. 1 at the end of its life (more past it). */
export const wearOf = (el, u) => u.km / PU_ELEMENTS[el].life;

/** The power lost to worn units (a factor on the car's power, 1 = all new). */
export function powerFactor(lo) {
  if (!lo?.units) return 1;
  return PU_IDS.reduce((f, el) => f * (1 - 0.5 * PU_ELEMENTS[el].power * clamp(wearOf(el, unitOf(lo, el)) - 0.3, 0, 1.4) ** 1.4), 1);
}
/** The chance something on the power unit or gearbox fails in a race, and which element is most at risk. */
export function failRisk(lo) {
  if (!lo?.units) return { p: 0, per: [{ el: 'ICE', p: 0 }] };
  const per = PU_IDS.map((el) => { const w = wearOf(el, unitOf(lo, el)); return { el, p: 0.0015 + 0.3 * Math.max(0, w - 0.8) ** 2 + (w > 1 ? (w - 1) * 0.08 : 0) }; });
  const p = 1 - per.reduce((q, x) => q * (1 - x.p), 1);
  return { p, per: per.sort((a, b) => b.p - a.p) };
}

/** Refit a unit from the pool (free). Returns an error or null. */
export function fitUnit(lo, el, n) {
  const u = unitOf(lo, el, n);
  if (!u) return 'No such unit';
  if (u.dead) return 'That unit is finished: it can never be used again';
  lo.fitted[el] = n;
  return null;
}
/** What fitting a new unit would cost in grid places (0 inside the allocation). */
export function newUnitPenalty(lo, el) {
  const E = PU_ELEMENTS[el], n = lo.units[el].length + 1;
  if (n <= E.alloc) return 0;
  return E.gearbox ? 5 : lo.exceeded[el] === 0 ? 10 : 5;
}
/** Fit a brand-new unit (beyond the allocation: a grid penalty at the next event, round). */
export function fitNew(lo, el, round) {
  const E = PU_ELEMENTS[el], n = lo.units[el].length + 1, places = newUnitPenalty(lo, el);
  lo.units[el].push({ n, km: 0, dead: false });
  lo.fitted[el] = n;
  if (places) {
    lo.exceeded[el]++;
    lo.pending.push({ round, id: `${lo.team}-0`, places, reason: `${E.short} #${n}: beyond the ${E.alloc} allowed` });
  }
  lo.log.push({ round, text: `New ${E.name} #${n} fitted${places ? ` (${places}-place grid penalty)` : ''}.` });
  return places;
}

/**
 * After a race weekend: the fitted units' mileage, a failure (the element that broke is finished and a
 * new one has to go in, or one from the pool), and the other drivers' power units.
 */
export function loadoutWeekend(lo, { round, failed = null }) {
  for (const el of PU_IDS) unitOf(lo, el).km += KM_WEEKEND * (0.92 + Math.random() * 0.16);
  // The team looks after the power unit unless the player has taken it over: a worn unit makes way for
  // the freshest one in the pool, or a new one while the allocation allows (never beyond: that's a
  // penalty, the player's call).
  if (lo.auto !== false) for (const el of PU_IDS) {
    if (wearOf(el, unitOf(lo, el)) < 0.92) continue;
    const alt = lo.units[el].filter((u) => !u.dead && wearOf(el, u) < 0.75).sort((x, y) => x.km - y.km)[0];
    if (alt) { lo.fitted[el] = alt.n; lo.log.push({ round, text: `The team refitted ${PU_ELEMENTS[el].short} #${alt.n} from the pool.` }); }
    else if (lo.units[el].length < PU_ELEMENTS[el].alloc) { fitNew(lo, el, round + 1); lo.log[lo.log.length - 1].text += ' (the team, at the end of the old one\'s life)'; }
  }
  if (failed && PU_ELEMENTS[failed]) {
    const u = unitOf(lo, failed); u.dead = true; u.km = Math.max(u.km, PU_ELEMENTS[failed].life);
    lo.log.push({ round, text: `${PU_ELEMENTS[failed].name} #${u.n} failed in the race: it's finished.` });
    // The team fits the healthiest unit left in the pool, or a new one (penalty) if nothing is left.
    const alt = lo.units[failed].filter((x) => !x.dead).sort((a, b) => a.km - b.km)[0];
    if (alt) lo.fitted[failed] = alt.n; else fitNew(lo, failed, round + 1);
  }
  // Everyone else: a unit is changed when it's worn (or fails); beyond the allocation, a penalty.
  const R = rngOf(lo.seed + round * 7919);
  for (const [id, pool] of Object.entries(lo.ai)) {
    const team = id.split('-')[0], rel = { mercedes: 0.9, ferrari: 1, redbull: 1.15, honda: 1.25, audi: 1.35 }[{ mclaren: 'mercedes', mercedes: 'mercedes', williams: 'mercedes', alpine: 'mercedes', ferrari: 'ferrari', haas: 'ferrari', cadillac: 'ferrari', redbull: 'redbull', racingbulls: 'redbull', aston: 'honda', audi: 'audi' }[team]] ?? 1;
    for (const el of PU_IDS) {
      const s = pool[el], E = PU_ELEMENTS[el];
      s.km += KM_WEEKEND;
      if (s.km > E.life * (0.82 + R() * 0.25) || R() < 0.008 * rel) {
        s.used++; s.km = 0;
        if (s.used > E.alloc) {
          const places = E.gearbox ? 5 : s.exceeded === 0 ? 10 : 5;
          s.exceeded++;
          lo.pending.push({ round: round + 1, id, places, reason: `${E.short} #${s.used}: beyond the ${E.alloc} allowed` });
        }
      }
    }
  }
  lo.pending = lo.pending.filter((p) => p.round >= round);
  if (lo.log.length > 40) lo.log.splice(0, lo.log.length - 40);
}

// ------------------------------------------------------------------------------------- the factory
/** A batch of copies of a spec: the tooling once, then each part cheaper the more are made. */
export function batchQuote(st, specId, qty) {
  const sp = specById(st, specId), T = st.teams[st.player];
  if (!sp) return null;
  const S = SLOTS[sp.slot], unit = S.copy * (1 - (T.facilities.factory - 2) * 0.06);
  const setup = unit * 0.55;                                          // moulds, tooling, an autoclave cycle
  const per = unit * (0.6 + 0.4 * qty ** -0.4);                       // the learning curve
  const total = setup + per * qty;
  const rounds = Math.max(1, S.make - (T.facilities.factory >= 4 ? 1 : 0)) + (qty > 4 ? 1 : 0);
  return { qty, unit, setup, per, total, perUnit: total / qty, rounds };
}
/** How many parts the factory can have in production at once. */
export const factoryCapacity = (st) => 4 + st.teams[st.player].facilities.factory * 2;
export const inProduction = (st) => (st.pending ?? []).length;
/** Order a batch. Returns an error or null. */
export function orderBatch(st, specId, qty) {
  const sp = specById(st, specId), T = st.teams[st.player], q = batchQuote(st, specId, qty);
  if (!sp || sp.n === 0) return 'The launch spec is always available';
  if (inProduction(st) + qty > factoryCapacity(st)) return `The factory has room for ${factoryCapacity(st) - inProduction(st)} more parts right now`;
  if (T.spent + q.total > COST_CAP) return 'That would go over the cost cap';
  T.spent += q.total;
  for (let k = 0; k < qty; k++) st.pending.push({ specId, ready: st.round + q.rounds });
  st.log.push({ round: st.round, kind: 'factory', text: `A batch of ${qty} ${sp.name} ordered: ${fmtM(q.total)} (${fmtM(q.perUnit)} a part), ready in ${q.rounds} round${q.rounds > 1 ? 's' : ''}.` });
  return null;
}
