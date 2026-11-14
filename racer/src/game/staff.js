import { TEAMS } from '../front/teams.js?v=1a016bc';
import { CAR_RATING } from './grid.js?v=1a016bc';

/*
 * The team's people: the senior staff who run the departments, each with a rating (0-100), a potential
 * they grow towards with experience, morale, and a contract. They make a measurable difference:
 *
 *   Technical Director      design speed in the design office; a great one runs a fourth project
 *   Head of Aerodynamics    what each aero part gains, and how well the tunnel predicts the track
 *   Chief Designer          what each chassis part gains
 *   Race Engineer           how quickly new parts are correlated in practice (laps needed)
 *   Head of Strategy        reading a Safety Car or VSC: calls the cheap stop at the right moment
 *   Pit Crew Chief          the pit stop: the average time in the box and how consistent it is
 *   Chief Mechanic          repairs: what a crash costs, and how long a new nose takes in a stop
 *
 * The staff market has people looking for a seat; signing one costs a fee inside the cost cap, and the
 * one replaced leaves. After each weekend everyone grows a little towards their potential (faster when
 * morale is high), and results lift or drop morale.
 */
export const ROLES = {
  techDirector: { name: 'Technical Director', short: 'TD', effect: 'Design speed; a fourth project slot from 85' },
  headAero: { name: 'Head of Aerodynamics', short: 'AERO', effect: 'Aero part gains and correlation' },
  chiefDesigner: { name: 'Chief Designer', short: 'DES', effect: 'Chassis part gains' },
  raceEngineer: { name: 'Race Engineer', short: 'ENG', effect: 'Laps needed to correlate new parts' },
  strategist: { name: 'Head of Strategy', short: 'STR', effect: 'Calls the cheap stop under the Safety Car or VSC' },
  pitCrew: { name: 'Pit Crew Chief', short: 'PIT', effect: 'Pit stop time and consistency' },
  chiefMechanic: { name: 'Chief Mechanic', short: 'MECH', effect: 'Repair costs; time to change a nose' },
};
export const ROLE_IDS = Object.keys(ROLES);
const FIRST = ['James', 'Pierre', 'Marco', 'Andrea', 'Ben', 'Tom', 'Ruth', 'Laura', 'Hannah', 'Simone', 'Kenji', 'Yuki', 'Lars', 'Mattia', 'Dan', 'Alex', 'Sophie', 'Clara', 'Diego', 'Luis', 'Oliver', 'Grace', 'Henrik', 'Paolo', 'Nadia', 'Elena', 'Jonas', 'Aiden', 'Priya', 'Felipe'];
const LAST = ['Hartley', 'Moreau', 'Bianchi', 'Costa', 'Whitfield', 'Okafor', 'Lindqvist', 'Tanaka', 'Fischer', 'Novak', 'Delgado', 'Brennan', 'Sato', 'Kowalski', 'Rossi', 'Laurent', 'Schmidt', 'Ivanova', 'Ortega', 'Carvalho', 'Hughes', 'Becker', 'Mancini', 'Petit', 'Weber', 'Kaur', 'Andersen', 'Morgan', 'Varga', 'Ferreira'];
const FLAGS = ['GB', 'FR', 'IT', 'DE', 'ES', 'JP', 'NL', 'BR', 'AU', 'US', 'SE', 'AT', 'CH', 'PL', 'IE'];
const rngOf = (seed) => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** A name nobody else in `used` has (the team and the market never show two of the same person). */
function nameFor(R, used) {
  let name;
  for (let k = 0; k < 40 && (!name || used.has(name)); k++) name = `${FIRST[Math.floor(R() * FIRST.length)]} ${LAST[Math.floor(R() * LAST.length)]}`;
  used.add(name);
  return name;
}
function person(R, role, level, { principal = null, used = new Set() } = {}) {
  const rating = clamp(Math.round(level + (R() - 0.5) * 14), 48, 96);
  return {
    id: `${role}-${Math.floor(R() * 1e9).toString(36)}`, role,
    name: principal ?? nameFor(R, used),
    age: 31 + Math.floor(R() * 26), flag: FLAGS[Math.floor(R() * FLAGS.length)],
    rating, potential: clamp(rating + Math.round(R() * 10), rating, 98), morale: 0.7, years: 1 + Math.floor(R() * 3),
    salary: Math.round((0.4 + ((rating - 50) / 46) ** 2 * 2.6) * 10) / 10,   // $M a year
  };
}
/** The staff of the player's team at the start of the season (their level from the team's standing). */
export function newStaff(teamId, seed = Math.floor(Math.random() * 1e9)) {
  const R = rngOf(seed), base = CAR_RATING[teamId] ?? 96, level = 62 + (base - 95) * 4.5;
  const team = TEAMS.find((t) => t.id === teamId);
  const staff = { seed, people: {}, market: [], principal: team?.principal?.name ?? 'Team Principal' };
  const used = new Set();
  for (const role of ROLE_IDS) staff.people[role] = person(R, role, level + (R() - 0.5) * 6, { used });
  refreshMarket(staff, R);
  return staff;
}
/** The people on the market (a fresh list every few rounds). */
export function refreshMarket(staff, R = rngOf(staff.seed++ + 7)) {
  const used = new Set(Object.values(staff.people).map((p) => p.name));
  staff.market = ROLE_IDS.flatMap((role) => [0, 1].map(() => { const p = person(R, role, 60 + R() * 30, { used }); p.fee = Math.round(p.salary * (0.6 + R() * 0.6) * 10) / 10; return p; }));
}
/** Sign someone from the market for their role. Returns an error or null (charges the fee to the cap via pay). */
export function hire(staff, id, pay) {
  const p = staff.market.find((x) => x.id === id);
  if (!p) return 'No longer available';
  const err = pay?.(p.fee * 1e6);
  if (err) return err;
  staff.market = staff.market.filter((x) => x.id !== id);
  const out = staff.people[p.role];
  staff.people[p.role] = { ...p, morale: 0.8, years: 2 };
  if (out) staff.market.push({ ...out, fee: Math.round(out.salary * 0.5 * 10) / 10 });
  return null;
}
/** After a weekend: growth towards potential, morale from the result (pos: the player's finish or null). */
export function staffWeekend(staff, { pos = null, round = 0 } = {}) {
  for (const p of Object.values(staff.people)) {
    p.morale = clamp(p.morale + (pos == null ? 0 : pos <= 3 ? 0.08 : pos <= 10 ? 0.03 : -0.04), 0.2, 1);
    p.rating = Math.min(p.potential, p.rating + (p.potential - p.rating) * (0.05 + p.morale * 0.06));
  }
  if (round % 4 === 0) refreshMarket(staff);
}
const r01 = (staff, role) => ((staff?.people?.[role]?.rating ?? 70) - 50) / 46;   // 0 (50) .. 1 (96)
/** What the staff do to the systems (R&D, the race, repairs). */
export function staffMods(staff) {
  const td = r01(staff, 'techDirector'), aero = r01(staff, 'headAero'), des = r01(staff, 'chiefDesigner'), eng = r01(staff, 'raceEngineer');
  const pit = r01(staff, 'pitCrew'), mech = r01(staff, 'chiefMechanic'), strat = staff?.people?.strategist?.rating ?? 70;
  return {
    design: 0.85 + td * 0.35, slots: (staff?.people?.techDirector?.rating ?? 70) >= 85 ? 4 : 3, learn: 0.8 + td * 0.4,
    aero: 0.9 + aero * 0.22, corr: 1.12 - aero * 0.25, chassis: 0.9 + des * 0.22,
    corrLaps: eng > 0.65 ? 2 : 3,
    strategy: strat,
    pitBase: 2.55 - pit * 0.6, pitSpread: 0.9 - pit * 0.55, pitSlow: 0.07 - pit * 0.05,
    repairCost: 1.2 - mech * 0.4, noseTime: 7.6 - mech * 2,
  };
}
/** Human-readable effects for the staff cards. */
export function effectText(role, staff) {
  const m = staffMods(staff);
  return {
    techDirector: `Designs ${Math.round((m.design - 1) * 100) >= 0 ? '+' : ''}${Math.round((m.design - 1) * 100)}% faster · ${m.slots} project slots`,
    headAero: `Aero gains ${Math.round((m.aero - 1) * 100) >= 0 ? '+' : ''}${Math.round((m.aero - 1) * 100)}% · correlation ${Math.round((1 - m.corr) * 100) >= 0 ? '+' : ''}${Math.round((1 - m.corr) * 100)}%`,
    chiefDesigner: `Chassis gains ${Math.round((m.chassis - 1) * 100) >= 0 ? '+' : ''}${Math.round((m.chassis - 1) * 100)}%`,
    raceEngineer: `New parts correlated in ${m.corrLaps} clean laps`,
    strategist: m.strategy >= 60 ? 'Calls the cheap stop under the Safety Car or VSC' : 'Misses half the Safety Car stop windows',
    pitCrew: `Pit stops ${(m.pitBase + m.pitSpread / 2).toFixed(2)} s on average · ${Math.round(m.pitSlow * 100)}% slow`,
    chiefMechanic: `Repairs ×${m.repairCost.toFixed(2)} · new nose in ${m.noseTime.toFixed(1)} s`,
  }[role];
}
