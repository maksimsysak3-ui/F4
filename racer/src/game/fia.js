import { TEAMS } from '../front/teams.js';
import { COST_CAP } from './rd.js';

/*
 * The FIA's rules as the game plays them: the rule book (what each rule says and its penalty, marked
 * where the game enforces it), drivers' super licence penalty points, grid penalties and how they are
 * applied to the grid, and the cost cap's breach classes.
 *
 * Sources: the FIA 2026 Formula 1 Sporting and Power Unit Sporting Regulations (allocations, the grid
 * penalty ladder), the International Sporting Code (the penalties the stewards can give, licence points)
 * and the Financial Regulations (cost cap breaches; the 2021 Red Bull case: a minor overspend, a $7m fine
 * and 10% less aerodynamic testing). The penalty for a given offence is the stewards' judgement; the
 * figures here are the usual ones.
 */
export const CHAPTERS = [
  ['race', 'On track'], ['proc', 'Starts, Safety Car and flags'], ['pit', 'Pit lane'], ['pu', 'Power unit and gearbox'],
  ['licence', 'Super licence'], ['tech', 'Technical and parc fermé'], ['money', 'Cost cap and testing'],
];
/** The rules: chapter, title, what it says, the usual penalty, licence points, whether the game enforces it. */
export const RULES = [
  { ch: 'race', id: 'collision', title: 'Causing a collision', rule: 'A driver judged wholly or predominantly to blame for a collision.', pen: '5 or 10 second time penalty; more for a serious one', pts: '2–3', game: true },
  { ch: 'race', id: 'forcing', title: 'Forcing another driver off the track', rule: 'Leaving a rival less than a car\'s width at the edge of the track, or moving so they have to leave it to avoid contact.', pen: '5 or 10 second time penalty', pts: '1–2' },
  { ch: 'race', id: 'advantage', title: 'Leaving the track and gaining an advantage', rule: 'Passing a car off the track, or keeping a position gained off it: the place must be given back.', pen: '5 or 10 second time penalty if not given back', pts: '1–2' },
  { ch: 'race', id: 'limits', title: 'Track limits', rule: 'The track is the space between the white lines; a car is off it when no part of it touches the line. Each lap time set off it is deleted. In the race, three times off brings the black-and-white flag; the next one a penalty.', pen: 'Lap time deleted; in the race, a 5 second time penalty after the warning', pts: '0', game: true },
  { ch: 'race', id: 'moving', title: 'More than one change of direction', rule: 'Defending a position, a driver may change direction once; moving back to the racing line is allowed, a second move is not. No moving under braking.', pen: '5 or 10 second time penalty', pts: '1–2' },
  { ch: 'race', id: 'impeding', title: 'Impeding in qualifying', rule: 'Getting in the way of a driver on a fast lap.', pen: '3 or more grid places', pts: '1' },
  { ch: 'proc', id: 'jump', title: 'False start', rule: 'Moving before the red lights go out, detected by the transponder on the grid.', pen: '5 or 10 second time penalty, or a drive-through', pts: '0–2' },
  { ch: 'proc', id: 'grid', title: 'Out of position on the grid', rule: 'Stopping outside the grid box.', pen: '5 second time penalty', pts: '0' },
  { ch: 'proc', id: 'sc', title: 'Safety Car and VSC', rule: 'No overtaking under a Safety Car or VSC; under the VSC each car keeps to a minimum time in every marshalling sector; under the Safety Car, no more than ten car lengths apart.', pen: '5 or 10 second time penalty; a drive-through or stop-go for overtaking', pts: '2–3', game: true },
  { ch: 'proc', id: 'yellow', title: 'Yellow flags', rule: 'Slow down, no overtaking, be ready to stop; double yellow: be ready to stop.', pen: 'From a reprimand to a grid penalty; 2 points for not slowing', pts: '2–3', game: true },
  { ch: 'proc', id: 'blue', title: 'Blue flags', rule: 'A lapped car must let the leaders by at the first chance; ignoring three blue flags is an offence.', pen: '5 second time penalty or a drive-through', pts: '1', game: true },
  { ch: 'proc', id: 'black', title: 'The black flag', rule: 'Disqualification from the race: the driver returns to the pits. Also given for not serving a drive-through within three laps.', pen: 'Disqualification', pts: '—', game: true },
  { ch: 'pit', id: 'speed', title: 'Pit lane speeding', rule: 'The speed limit in the pit lane, 80 km/h at most circuits (60 km/h at the tightest).', pen: 'Practice and qualifying: a fine per km/h over; race: 5 second time penalty or a drive-through', pts: '0', game: true },
  { ch: 'pit', id: 'release', title: 'Unsafe release', rule: 'Sending a car out of its pit box into the path of another.', pen: 'Fine for the team (practice); 5 or 10 second time penalty (race)', pts: '0' },
  { ch: 'pit', id: 'serve', title: 'Serving a penalty', rule: 'A time penalty is served at the next stop (no work on the car while it runs) or added to the race time. A drive-through or stop-go must be taken within three laps of the decision.', pen: 'Not serving it: disqualification', pts: '—', game: true },
  { ch: 'pu', id: 'pualloc', title: 'Power unit allocation', rule: 'Per driver, for 2026: 4 ICE, 4 turbochargers, 4 exhausts, 3 MGU-K, 3 energy stores, 3 control electronics (one more of each than the base allowance, for the first year of the new engines). Units used so far can be rotated freely.', pen: 'First unit of an element beyond its allocation: 10 grid places; each one after: 5', pts: '0', game: true },
  { ch: 'pu', id: 'back', title: 'More than 15 grid places', rule: 'A driver with more than 15 places of penalties starts at the back of the grid, behind everyone, in the order the penalties were incurred.', pen: 'Back of the grid', pts: '0', game: true },
  { ch: 'pu', id: 'gearbox', title: 'Gearbox allocation', rule: 'A pool of gearboxes for the season (five in the regulations published for 2024–25; the game uses the same for 2026).', pen: '5 grid places for each one beyond', pts: '0', game: true },
  { ch: 'pu', id: 'pf', title: 'Changes under parc fermé', rule: 'Power unit elements changed after qualifying, or a change of specification under parc fermé.', pen: 'Start from the pit lane', pts: '0' },
  { ch: 'licence', id: 'points', title: 'Penalty points', rule: 'Stewards can add penalty points to a driver\'s super licence with most penalties. Each point stays for twelve months.', pen: '12 points in twelve months: the licence is suspended for the next event (a race ban)', pts: '—', game: true },
  { ch: 'licence', id: 'reprimand', title: 'Reprimands', rule: 'A formal warning. Five in a season, at least four of them for driving offences, brings a grid penalty.', pen: '10 grid places at the event of the fifth reprimand', pts: '0' },
  { ch: 'licence', id: 'conduct', title: 'Misconduct', rule: 'Unsporting behaviour, swearing in official settings, ignoring the stewards\' instructions.', pen: 'Fines, a suspended sentence, a race ban', pts: '—' },
  { ch: 'tech', id: 'weight', title: 'Minimum weight', rule: 'The car with its driver must weigh at least the minimum at every check, including after the race with what\'s left in it.', pen: 'Disqualification', pts: '0' },
  { ch: 'tech', id: 'plank', title: 'Plank wear', rule: 'The wooden plank under the floor may wear at most 1 mm below its thickness (measured at the skid holes).', pen: 'Disqualification', pts: '0' },
  { ch: 'tech', id: 'fuel', title: 'Fuel sample', rule: 'At least one litre of fuel must be left for a sample after the race.', pen: 'Disqualification', pts: '0' },
  { ch: 'tech', id: 'parcferme', title: 'Parc fermé', rule: 'From the start of qualifying the set-up is frozen: only routine work, damage repaired with parts of the same specification.', pen: 'Start from the pit lane', pts: '0' },
  { ch: 'tech', id: 'curfew', title: 'Curfew', rule: 'Team staff working on the cars stay away from the circuit for a set number of hours on the nights of a race weekend; each team has a small number of exceptions a season.', pen: 'Breach beyond the exceptions: a fine', pts: '0' },
  { ch: 'money', id: 'cap', title: 'The cost cap', rule: 'What a team spends on the cars and the team in a year is capped ($215M in the game). Overspending up to 5% is a minor breach; 5% or more is a material breach.', pen: 'Minor: a fine, a smaller aero testing allowance, possibly points. Material: championship points and a lower cap the next year as well.', pts: '—', game: true },
  { ch: 'money', id: 'atr', title: 'Aerodynamic testing restrictions', rule: 'Wind tunnel runs and CFD items are rationed every testing period on a sliding scale: the constructors\' champion gets 70% of the baseline, the last-placed team 115% and more.', pen: 'Breaking it: a reduced allowance and a fine', pts: '—', game: true },
];

/** Licence points for a stewards' decision (the game's offences). */
export function pointsFor(reason, pen) {
  if (/COLLISION UNDER SAFETY CAR/.test(reason)) return 3;
  if (/CAUSING A COLLISION/.test(reason)) return pen === 't10' || pen === 'dt' ? 3 : 2;
  if (/BLUE FLAGS/.test(reason)) return 1;
  if (/YELLOW/.test(reason)) return 2;
  if (/OVERTAKING UNDER/.test(reason)) return 3;
  return 0;
}
/**
 * Every driver's licence: the points from the stewards' decisions of the last 24 rounds (twelve months),
 * the decisions they came from, and bans served (the points that brought a ban are cleared once it's
 * served).
 */
export function licences(season) {
  const now = season.round ?? 0, out = {};
  const cleared = season.fia?.cleared ?? {};
  for (const h of season.history ?? []) for (const d of h.rc?.decisions ?? []) {
    const p = pointsFor(d.reason, d.pen);
    if (!p || now - h.round > 24 || (cleared[d.id] ?? -1) >= h.round) continue;
    const L = (out[d.id] ??= { id: d.id, code: d.code, points: 0, list: [] });
    L.points += p; L.list.push({ round: h.round, track: h.track, reason: d.reason, pen: d.pen, pts: p });
  }
  return out;
}
/** After a race weekend: anyone on 12 or more points is banned from the next event. */
export function fiaWeekend(season, round) {
  const f = (season.fia ??= { bans: [], cleared: {} });
  for (const L of Object.values(licences(season))) if (L.points >= 12 && !f.bans.some((b) => b.id === L.id && b.round > round)) {
    f.bans.push({ id: L.id, code: L.code, round: round + 1 });
    f.cleared[L.id] = round;
  }
}
export const bannedAt = (season, id, round) => (season.fia?.bans ?? []).some((b) => b.id === id && b.round === round);

/** The grid penalties for this round: [{ id, places, reason }] summed per driver, back = more than 15. */
export function gridPenalties(season, round) {
  if (!season) return [];
  const by = {};
  for (const p of season.loadout?.pending ?? []) if (p.round === round) { const g = (by[p.id] ??= { id: p.id, places: 0, reasons: [] }); g.places += p.places; g.reasons.push(p.reason); }
  return Object.values(by).map((g) => ({ ...g, back: g.places > 15 }));
}
/** The grid with its penalties applied (ids in qualifying order). */
export function applyGridPenalties(grid, pens) {
  if (!pens?.length) return grid;
  const pen = Object.fromEntries(pens.map((p) => [p.id, p]));
  const clean = grid.filter((id) => !pen[id]), out = clean.slice();
  const dropped = grid.map((id, k) => ({ id, k, p: pen[id] })).filter((x) => x.p && !x.p.back).sort((a, b) => a.k + a.p.places - (b.k + b.p.places));
  for (const x of dropped) out.splice(Math.min(out.length, x.k + x.p.places), 0, x.id);
  for (const id of grid) if (pen[id]?.back) out.push(id);
  return out;
}

/** The cost cap: spent, the breach class if over. */
export function capStatus(rd, teamId) {
  const T = rd?.teams?.[teamId];
  if (!T) return null;
  const over = T.spent - COST_CAP, pct = (over / COST_CAP) * 100;
  return { spent: T.spent, over: Math.max(0, over), pct: Math.max(0, pct), cls: over <= 0 ? 'Within the cap' : pct < 5 ? 'Minor overspend breach' : 'Material overspend breach' };
}
export const driverName = (id, season) => {
  const [team, k] = id.split('-'), t = TEAMS.find((x) => x.id === team);
  if (!t) return id;
  return team === season.team && k === '0' ? season.manager?.name || 'You' : t.drivers[+k]?.name ?? id;
};
