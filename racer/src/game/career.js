import { TEAMS, SKIN, HAIR } from '../front/teams.js';
import { DRIVERS, CAR_RATING } from './grid.js';
import { newRD, attrsOf, overall, rankings, ATTRS, SLOT_IDS } from './rd.js';
import { newLoadout } from './loadout.js';
import { ROLE_IDS, ROLES, refreshMarket } from './staff.js';

/*
 * The career across seasons. A season save (frontend) carries:
 *
 *   year       the championship year (2026 first)
 *   phase      'season' (racing) | 'review' (the season is over: the review) | 'offseason' (the winter)
 *   roster     { teamId: [name, name] } this season's line-ups ('@me' is the player's own seat)
 *   drivers    { name: { code, pace, craft, aggr, age, potential, flag, years, salary, look } } every
 *              driver in the sport: the grid, the free agents, the rookies coming up
 *   objective  the board's target for the season: { target (constructors' position), expected, text }
 *   career     { started, rep (0-100), contract: { team, years }, seasons: [archive], champions: [...],
 *              feed: [off-season news stories] }
 *   winter     the off-season in progress: the review, the board's verdict, the market, the staff
 *              decisions, the regulations, the development focus
 *
 * The line-ups and the drivers' ratings are applied onto the shared team and driver tables
 * (applyCareer) whenever a save is loaded, so every screen and the race weekend see the same grid.
 *
 * Between seasons drivers age (the young improve towards their potential, the old fade and retire),
 * contracts run down, teams sign drivers by how good they are and how attractive the seat is, rookies
 * come up, the staff's contracts expire, the rules change (a small tweak most winters, a reset every
 * few years) and every car carries over what it learned, plus the winter's work.
 */

export const START_YEAR = 2026;
export const ME = '@me';
const BASE_LINEUPS = TEAMS.map((t) => t.drivers.map((d) => ({ ...d })));
const BASE_DRIVERS = JSON.parse(JSON.stringify(DRIVERS));
// Ages at the start of 2026 and nationalities, for the 2026 grid.
const BIO = {
  'Lando Norris': [26, 'GB'], 'Oscar Piastri': [25, 'AU'], 'Charles Leclerc': [28, 'MC'], 'Lewis Hamilton': [41, 'GB'], 'Max Verstappen': [28, 'NL'], 'Isack Hadjar': [21, 'FR'],
  'George Russell': [28, 'GB'], 'Kimi Antonelli': [19, 'IT'], 'Fernando Alonso': [44, 'ES'], 'Lance Stroll': [27, 'CA'], 'Alex Albon': [29, 'TH'], 'Carlos Sainz': [31, 'ES'],
  'Liam Lawson': [24, 'NZ'], 'Arvid Lindblad': [18, 'GB'], 'Pierre Gasly': [30, 'FR'], 'Franco Colapinto': [22, 'AR'], 'Esteban Ocon': [29, 'FR'], 'Oliver Bearman': [20, 'GB'],
  'Nico Hülkenberg': [38, 'DE'], 'Gabriel Bortoleto': [21, 'BR'], 'Sergio Pérez': [36, 'MX'], 'Valtteri Bottas': [36, 'FI'],
};
const FIRST = ['Luca', 'Noah', 'Mateo', 'Leo', 'Felix', 'Hugo', 'Kai', 'Elias', 'Ryo', 'Theo', 'Rafael', 'Dino', 'Jak', 'Victor', 'Paul', 'Zane', 'Nikola', 'Sami', 'Tiago', 'Ollie', 'Marcus', 'Joshua', 'Enzo', 'Max', 'Dennis'];
const LAST = ['Marchetti', 'Vance', 'Okada', 'Duval', 'Brandt', 'Ferro', 'Lindgren', 'Hayes', 'Castellano', 'Novak', 'Rehn', 'Kimura', 'Sorensen', 'Albers', 'Quinn', 'Moretti', 'Santos', 'Keller', 'Arango', 'Fontaine', 'Varga', 'Hale', 'Ortiz', 'Brook', 'Weiss'];
const FLAGS = ['GB', 'IT', 'FR', 'DE', 'ES', 'NL', 'BR', 'JP', 'AU', 'US', 'MX', 'AR', 'DK', 'FI', 'BE', 'NZ', 'CN', 'PL', 'SE', 'CA'];

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rngOf = (seed) => { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const pick = (R, xs) => xs[Math.floor(R() * xs.length)];
/** A driver's overall rating (pace counts most). */
export const driverRating = (d) => Math.round((d?.pace ?? 85) * 0.62 + (d?.craft ?? 84) * 0.38);
const teamById = (id) => TEAMS.find((t) => t.id === id);
const lookOf = (d) => ({ name: d.name, skin: d.skin, hair: d.hair, hairCol: d.hairCol, facial: d.facial ?? 'none' });

// ------------------------------------------------------------------------------- setting up a career
/** Give a save everything the career needs (an older save, or a brand new one). Returns true if changed. */
export function initCareer(s) {
  if (!s?.team) return false;
  let changed = false;
  if (!s.year) { s.year = START_YEAR; changed = true; }
  if (!s.phase) { s.phase = 'season'; changed = true; }
  if (!s.drivers) {
    s.drivers = {};
    TEAMS.forEach((t, ti) => BASE_LINEUPS[ti].forEach((d) => {
      const r = BASE_DRIVERS[d.name] ?? { code: d.name.slice(0, 3).toUpperCase(), pace: 86, craft: 84, aggr: 60 };
      const [age, flag] = BIO[d.name] ?? [27, 'GB'];
      s.drivers[d.name] = { ...r, age, flag, potential: clamp(Math.max(r.pace, age < 24 ? r.pace + 4 + (24 - age) : r.pace), 70, 99), years: age > 35 ? 1 : 1 + ((d.name.length + ti) % 3), salary: salaryOf(r), look: lookOf(d) };
    }));
    changed = true;
  }
  if (!s.roster) {
    // The player takes the team's first seat; the driver who had it is out of a drive for now.
    s.roster = Object.fromEntries(TEAMS.map((t, ti) => [t.id, BASE_LINEUPS[ti].map((d, k) => (t.id === s.team && k === 0 ? ME : d.name))]));
    changed = true;
  }
  if (!s.career) {
    s.career = { started: s.year, rep: 50, contract: { team: s.team, years: 1 }, seasons: [], champions: [], feed: [] };
    changed = true;
  }
  if (!s.objective) { s.objective = objectiveFor(s); changed = true; }
  return changed;
}
const salaryOf = (r) => Math.round((1 + ((driverRating(r) - 78) / 20) ** 3 * 50) * 10) / 10;   // $M a year

/** The board's target for the season: around where the car is expected to finish. */
export function objectiveFor(s) {
  const order = s.rd ? rankings(s.rd).map((x) => x.t.id) : TEAMS.map((t) => t.id).sort((a, b) => (CAR_RATING[b] ?? 96) - (CAR_RATING[a] ?? 96));
  const expected = order.indexOf(s.team) + 1 || 6;
  // A strong reputation raises the bar a little; a fragile one buys a little patience.
  const rep = s.career?.rep ?? 50, target = clamp(expected - (rep > 70 ? 1 : 0) + (rep < 30 ? 1 : 0), 1, TEAMS.length);
  const text = target === 1 ? 'Win the Constructors\' Championship' : target <= 3 ? `Finish in the top ${target} of the Constructors' Championship` : `Finish P${target} or better in the Constructors' Championship`;
  return { target, expected, text };
}

/** Apply the save's line-ups and drivers onto the shared tables (or the 2026 grid with no save). */
export function applyCareer(s) {
  for (const k of Object.keys(DRIVERS)) if (!(k in BASE_DRIVERS)) delete DRIVERS[k];
  Object.assign(DRIVERS, JSON.parse(JSON.stringify(BASE_DRIVERS)));
  if (!s?.roster || !s?.drivers) { TEAMS.forEach((t, ti) => { t.drivers = BASE_LINEUPS[ti].map((d) => ({ ...d })); }); return; }
  for (const [name, d] of Object.entries(s.drivers)) DRIVERS[name] = { code: d.code, pace: d.pace, craft: d.craft, aggr: d.aggr };
  const m = s.manager ?? {};
  TEAMS.forEach((t, ti) => {
    const names = s.roster[t.id] ?? BASE_LINEUPS[ti].map((d) => d.name);
    t.drivers = names.map((n, k) => {
      if (n === ME) return { name: m.name || 'Player', skin: m.skin ?? SKIN.light, hair: m.hair ?? 'short', hairCol: m.hairCol ?? HAIR.brown, facial: m.facial ?? 'none', player: true };
      const d = s.drivers[n];
      return d?.look ? { ...d.look, name: n } : { ...(BASE_LINEUPS[ti][k] ?? BASE_LINEUPS[ti][0]), name: n };
    });
  });
}

// ----------------------------------------------------------------------------------- the season ends
/** Both championships from the season's points: [{ name, team, pts }], [{ team, pts }]. */
export function tables(s) {
  const me = s.manager?.name || 'Player', pts = s.points ?? {};
  const drivers = TEAMS.flatMap((t) => t.drivers.map((d, k) => { const n = t.id === s.team && k === 0 ? me : d.name; return { name: n, team: t.id, pts: pts[n] ?? 0 }; }))
    .sort((a, b) => b.pts - a.pts || wins(s, b.name) - wins(s, a.name));
  const teams = TEAMS.map((t) => ({ team: t.id, pts: drivers.filter((d) => d.team === t.id).reduce((a, d) => a + d.pts, 0) })).sort((a, b) => b.pts - a.pts);
  return { drivers, teams };
}
const wins = (s, name) => (s.history ?? []).filter((h) => h.R?.[0]?.[0] === name).length;

/** A driver's season from the race history: wins, podiums, poles, DNFs, best, average finish. */
export function seasonStats(s, name) {
  const st = { races: 0, wins: 0, podiums: 0, poles: 0, dnfs: 0, best: null, sum: 0, finished: 0, pts: (s.points ?? {})[name] ?? 0 };
  for (const h of s.history ?? []) {
    const r = h.R?.find((x) => x[0] === name);
    if (!r) continue;
    st.races++;
    if (r[2] === 1) st.poles++;
    if (r[3]) { st.dnfs++; continue; }
    st.finished++; st.sum += r[1];
    if (r[1] === 1) st.wins++;
    if (r[1] <= 3) st.podiums++;
    st.best = st.best == null ? r[1] : Math.min(st.best, r[1]);
  }
  st.avg = st.finished ? st.sum / st.finished : null;
  return st;
}

/** Prize money by constructors' position ($M): what the teams take into next year's capital budget. */
export const prizeFor = (pos) => [140, 128, 116, 104, 94, 86, 78, 72, 66, 61, 57][pos - 1] ?? 55;

/**
 * The final race is over: archive the season, crown the champions, judge the objective, move to the
 * review. The winter (market, staff, rules) opens when the player leaves the review.
 */
export function endSeason(s) {
  initCareer(s);
  const { drivers, teams } = tables(s), me = s.manager?.name || 'Player';
  const mate = teamById(s.team)?.drivers[1]?.name;
  const tpos = teams.findIndex((x) => x.team === s.team) + 1, dpos = drivers.findIndex((x) => x.name === me) + 1;
  const obj = s.objective ?? objectiveFor(s), met = tpos <= obj.target;
  const entry = {
    year: s.year, team: s.team,
    drivers: drivers.slice(0, 10).map((d) => [d.name, d.team, d.pts]), teams: teams.map((t) => [t.team, t.pts]),
    champion: { name: drivers[0].name, team: drivers[0].team, pts: drivers[0].pts }, constructors: teams[0].team,
    player: { pos: dpos, ...seasonStats(s, me) }, mate: mate ? { name: mate, ...seasonStats(s, mate) } : null,
    teamPos: tpos, teamPts: teams[tpos - 1]?.pts ?? 0, objective: { ...obj, met }, prize: prizeFor(tpos),
    races: (s.history ?? []).map((h) => ({ round: h.round, track: h.track, podium: (h.R ?? []).slice(0, 3).map((r) => [r[0], r[5]]) })),
  };
  s.career.seasons.push(entry);
  s.career.champions.push({ year: s.year, driver: entry.champion.name, team: entry.champion.team, constructors: entry.constructors });
  // Reputation: against the board's target, plus the trophies.
  const delta = clamp((obj.target - tpos) * 5, -20, 20) + (entry.champion.name === me ? 12 : 0) + (entry.constructors === s.team ? 10 : 0) + Math.min(8, entry.player.wins * 2);
  s.career.rep = clamp(Math.round((s.career.rep ?? 50) + delta), 0, 100);
  s.winter = { year: s.year, entry, repDelta: delta, step: 0 };
  s.phase = 'review';
  return entry;
}

// ----------------------------------------------------------------------------------- the off-season
/** How attractive a team's seat is (0-100): last year's result, the car, the money. */
function appeal(teamId, order) {
  const pos = order.indexOf(teamId) + 1 || 6;
  return clamp(100 - (pos - 1) * 7.5, 20, 100);
}
/** Would a driver join a team with this appeal? (stars only for the front of the grid). */
export function willing(d, teamAppeal) {
  const want = clamp((driverRating(d) - 80) * 5, 0, 92);
  return teamAppeal + 6 >= want;
}

/**
 * Open the winter: the board's verdict and contract, every driver's year (age, form, retirement,
 * contracts), the AI teams' signings and the rookies, the staff's contracts, the rule changes. The
 * player then works through it (careerHub) and startNextSeason applies it all.
 */
export function openOffseason(s) {
  const W = s.winter ?? (s.winter = { year: s.year, step: 0 });
  if (W.opened) return W;
  W.opened = true;
  const R = rngOf(s.year * 7919 + (s.manager?.name?.length ?? 3) * 104729);
  const order = W.entry?.teams?.map((t) => t[0]) ?? TEAMS.map((t) => t.id);
  const feed = [];
  // ---- the board ----
  const c = s.career.contract ?? (s.career.contract = { team: s.team, years: 1 });
  c.years = (c.years ?? 1) - 1;
  const obj = W.entry?.objective, missedBy = obj ? (W.entry.teamPos - obj.target) : 0, rep = s.career.rep;
  const sacked = missedBy >= 3 && rep < 35;
  const renewal = !sacked && (c.years > 0 || rep >= 30 || obj?.met);
  const offers = [];
  if (sacked || c.years <= 0) {
    // Other teams' offers, by reputation: the better it is, the further up the grid they come from.
    const ranked = rankings(s.rd ?? { teams: {} }).map((x) => x.t.id).filter((id) => id !== s.team);
    for (const id of ranked) {
      const rank = ranked.indexOf(id) + 1, need = 100 - rank * 9;
      if (rep + 15 >= need && offers.length < 3 && R() < 0.8) offers.push({ team: id, years: 1 + Math.floor(R() * 3) });
    }
    if (!offers.length) offers.push({ team: ranked[ranked.length - 1], years: 2 });
  }
  W.board = { sacked, renewal, contractLeft: Math.max(0, c.years), offers, choice: sacked ? offers[0].team : s.team, years: c.years > 0 ? c.years : 2 };
  // ---- the drivers' year: age, form, retirement ----
  const retired = [];
  for (const [name, d] of Object.entries(s.drivers)) {
    if (d.retired) continue;
    d.age += 1;
    // Out of a drive for two winters and not quick enough to come back: gone from the sport.
    const seated = TEAMS.some((t) => (s.roster[t.id] ?? []).includes(name));
    d.benched = seated ? 0 : (d.benched ?? 0) + 1;
    if (d.benched >= 3 || (d.benched >= 2 && driverRating(d) < 86)) { d.retired = s.year; continue; }
    const growth = d.age <= 23 ? 1 + R() * 2.4 : d.age <= 27 ? R() * 1.4 : d.age <= 31 ? (R() - 0.5) * 1.2 : d.age <= 34 ? -R() * 1.2 : -0.8 - R() * 1.6;
    d.pace = clamp(Math.round((d.pace + Math.min(growth, Math.max(0, d.potential - d.pace) + (growth < 0 ? 0 : 0.4))) * 10) / 10, 70, 99);
    d.craft = clamp(Math.round((d.craft + (d.age <= 30 ? 0.4 + R() * 1.2 : (R() - 0.6) * 1.2)) * 10) / 10, 70, 99);
    d.salary = salaryOf(d);
    d.years = (d.years ?? 1) - 1;
    const goes = (d.age >= 37 && R() < 0.3 + (d.age - 37) * 0.18) || (d.age >= 34 && driverRating(d) < 84 && R() < 0.45);
    if (goes) { retired.push(name); d.retired = s.year; }
  }
  for (const name of retired) {
    for (const t of TEAMS) s.roster[t.id] = s.roster[t.id].map((n) => (n === name ? null : n));
    feed.push(story('feature', `${name} retires from Formula 1`, `After ${s.drivers[name].age - 18} years in racing, ${name.split(' ').pop()} calls time on a career at the top.`,
      [`${name} has confirmed this season was the last. "It's the right moment," the ${s.drivers[name].age}-year-old said. "I gave everything to this sport and it gave me more back."`]));
  }
  // ---- contracts: expired drivers stay if the team wants them and they want to stay ----
  const free = new Set(Object.keys(s.drivers).filter((n) => !s.drivers[n].retired && !TEAMS.some((t) => s.roster[t.id].includes(n))));
  for (const t of TEAMS) s.roster[t.id].forEach((n, k) => {
    if (!n || n === ME) return;
    const d = s.drivers[n];
    if (d.years > 0) return;
    const keep = (t.id === s.team) ? false : R() < (driverRating(d) >= 88 ? 0.75 : 0.55) && willing(d, appeal(t.id, order));
    if (keep) { d.years = 1 + Math.floor(R() * 3); return; }
    s.roster[t.id][k] = null; free.add(n);
  });
  // ---- rookies come up from the junior series ----
  const used = new Set(Object.keys(s.drivers));
  for (let k = 0; k < 3 + Math.floor(R() * 2); k++) {
    let name; for (let a = 0; a < 30 && (!name || used.has(name)); a++) name = `${pick(R, FIRST)} ${pick(R, LAST)}`;
    used.add(name);
    const pace = Math.round(80 + R() * 7), age = 18 + Math.floor(R() * 4);
    const d = { code: name.split(' ').pop().slice(0, 3).toUpperCase(), pace, craft: Math.round(75 + R() * 8), aggr: Math.round(50 + R() * 30), age, flag: pick(R, FLAGS), potential: Math.round(clamp(pace + 4 + R() * 10, 84, 98)), years: 0, rookie: true,
      look: { name, skin: SKIN[pick(R, Object.keys(SKIN))], hair: pick(R, ['short', 'quiff', 'curly', 'buzz', 'swept']), hairCol: HAIR[pick(R, ['black', 'darkBrown', 'brown', 'lightBrown', 'blond'])], facial: R() < 0.2 ? 'stubble' : 'none' } };
    d.salary = salaryOf(d);
    s.drivers[name] = d; free.add(name);
    feed.push(story('rumour', `${name} the rookie everyone wants`, `The ${age}-year-old ${d.flag} junior is being linked with a 2027 seat after a dominant season.`, [`Paddock talk says at least two teams have tested ${name.split(' ').pop()}. "Rated around ${driverRating(d)}," says one engineer, "and still learning."`]));
  }
  // ---- the AI teams sign drivers: the front of the grid picks first, from who's willing ----
  fillSeats(s, order, free, R, feed, false);
  W.free = [...free].filter((n) => !s.drivers[n].retired);
  W.retired = retired;
  // ---- the staff's contracts ----
  W.staff = {};
  for (const role of ROLE_IDS) {
    const p = s.staff?.people?.[role];
    if (!p) continue;
    p.age = (p.age ?? 45) + 1;
    p.years = (p.years ?? 1) - 1;
    if (p.age >= 66) { W.staff[role] = 'retire'; continue; }
    if (p.years <= 0) W.staff[role] = 'renew';
  }
  // ---- the rules: a tweak most winters, a reset every few years ----
  const major = (s.year - START_YEAR + 1) % 4 === 0 || (R() < 0.12 && !s.career.lastMajor);
  const tweak = pick(R, [['highSpeed', 'New floor edges cut high-speed downforce'], ['lowSpeed', 'Narrower front wings cost low-speed grip'], ['straight', 'Active aero straight-line mode limited'], ['power', 'Fuel flow trimmed for the hybrid units'], ['tyre', 'A harder tyre range from the supplier']]);
  W.regs = { major, attr: tweak[0], title: major ? `New technical regulations for ${s.year + 1}` : tweak[1], text: major ? 'A new generation of cars: every team starts again from a clean sheet. The order can change completely.' : 'A tweak to the technical rules: the teams that adapt fastest gain.' };
  feed.push(story('tech', W.regs.title, W.regs.text, [major ? 'The FIA has signed off a new rulebook. Expertise counts, but the gaps of today mean little: everybody is designing a new car.' : `The change will hit ${tweak[0] === 'straight' ? 'the low-drag cars' : 'some cars harder than others'}. Engineers expect the order to shuffle at the front of the midfield.`]));
  W.focus = 'balanced';
  s.career.feed = feed.slice(0, 14);
  s.phase = 'offseason';
  return W;
}
function story(kind, title, standfirst, body) { return { kind, title, standfirst, body }; }

/** Fill empty seats: each team in order picks the best driver willing to join it. */
function fillSeats(s, order, free, R, feed, all) {
  for (const id of order) {
    const seats = s.roster[id];
    for (let k = 0; k < seats.length; k++) {
      if (seats[k]) continue;
      if (id === s.team && !all) continue;   // the player's own seat-mate: the player chooses
      const cands = [...free].map((n) => ({ n, d: s.drivers[n] })).filter((x) => !x.d.retired && willing(x.d, appeal(id, order)))
        .sort((a, b) => (driverRating(b.d) + (b.d.potential - b.d.pace) * 0.4 + R() * 3) - (driverRating(a.d) + (a.d.potential - a.d.pace) * 0.4 + R() * 3));
      const c = cands[0] ?? [...free].map((n) => ({ n, d: s.drivers[n] })).filter((x) => !x.d.retired)[0];
      if (!c) continue;
      seats[k] = c.n; free.delete(c.n);
      c.d.years = 1 + Math.floor(R() * 3); c.d.rookie = false;
      if (feed) feed.push(story('rumour', `${c.n} signs for ${teamById(id).name}`, `A ${c.d.years}-year deal for the ${c.d.age}-year-old.`, [`${teamById(id).full} have confirmed ${c.n} for next season. "We think we've found someone special," the team said.`]));
    }
  }
}

/** The player signs a driver for their second seat (from the free agents, if willing). */
export function signDriver(s, name, years = 2) {
  const W = s.winter, d = s.drivers[name];
  if (!W || !d || !W.free.includes(name)) return 'Not available';
  const order = W.entry?.teams?.map((t) => t[0]) ?? TEAMS.map((t) => t.id);
  const team = W.board?.choice ?? s.team;
  if (!willing(d, appeal(team, order) + (s.career.rep - 50) * 0.3)) return `${name.split(' ').pop()} isn't interested in the seat`;
  const seats = s.roster[team];
  const k = seats[0] === ME ? 1 : seats.indexOf(null) >= 0 ? seats.indexOf(null) : 1;
  if (seats[k] && seats[k] !== ME) W.free.push(seats[k]);
  seats[k] = name; d.years = years;
  W.free = W.free.filter((n) => n !== name);
  W.signed = name;
  return null;
}

/**
 * Begin the next season with everything decided: the player's team (renewed or moved), every seat
 * filled, the staff renewed or replaced, the cars carried over with the winter's work and the new
 * rules, a fresh calendar of points, power units and licences, and the board's new target.
 */
export function startNextSeason(s) {
  const W = s.winter;
  if (!W) return;
  const R = rngOf(s.year * 104729 + 17);
  const order = W.entry?.teams?.map((t) => t[0]) ?? TEAMS.map((t) => t.id);
  const oldTeam = s.team, newTeam = W.board?.choice ?? s.team;
  // ---- the player's seat: a move frees the old seat and takes the new team's first seat ----
  const free = new Set(W.free ?? []);
  if (newTeam !== oldTeam) {
    s.roster[oldTeam] = s.roster[oldTeam].map((n) => (n === ME ? null : n));
    const displaced = s.roster[newTeam][0];
    if (displaced && displaced !== ME) free.add(displaced);
    s.roster[newTeam][0] = ME;
    s.team = newTeam;
    s.career.feed.unshift(story('feature', `${s.manager?.name || 'The manager'} moves to ${teamById(newTeam).name}`, `A new chapter: a ${W.board.years}-year contract at ${teamById(newTeam).base}.`, [`${teamById(newTeam).full} have their new team manager. The task: ${objectiveFor({ ...s, team: newTeam }).text.toLowerCase()}.`]));
  }
  s.career.contract = { team: s.team, years: W.board?.years ?? 2 };
  fillSeats(s, order, free, R, null, true);
  // ---- the cars: what each learned carries over, the winter's work, the new rules ----
  const old = s.rd;
  const rd = newRD(s.team);
  for (const t of TEAMS) {
    const T = rd.teams[t.id], O = old?.teams?.[t.id];
    const A = old ? attrsOf(old, t.id, true) : T.attrs;
    const fac = O?.facilities ?? T.facilities, facAvg = Object.values(fac).reduce((a, b) => a + b, 0) / 4;
    const lateFocus = order.indexOf(t.id) < 3 ? 0.3 : 0;   // the top teams moved on to this car early
    const focus = t.id === s.team ? W.focus : pick(R, ['balanced', 'aero', 'mechanical', 'power', 'reliability']);
    const winter = 0.5 + (facAvg - 2.5) * 0.35 + lateFocus + R() * 0.6 + (t.id === s.team ? ((s.staff?.people?.techDirector?.rating ?? 75) - 75) * 0.025 : 0);
    for (const a of ATTRS) {
      let v = A[a];
      const squeeze = W.regs?.major ? 0.5 : 0.85;
      v = 97 + (v - 97) * squeeze + (W.regs?.major ? (R() - 0.5) * 3 : (R() - 0.5) * 0.8);
      if (!W.regs?.major && a === W.regs?.attr) v -= 0.6 + R() * 0.8 * (1 - (O?.expertise?.[SLOT_IDS[0]] ?? 0.4));
      v += winter * (FOCUS[focus]?.[a] ?? 0.35);
      T.attrs[a] = clamp(Math.round(v * 100) / 100, 88, 104);
    }
    if (O) { T.facilities = { ...O.facilities }; T.expertise = Object.fromEntries(Object.entries(O.expertise).map(([k, v]) => [k, clamp(W.regs?.major ? v * 0.7 : v * 0.95, 0.2, 0.95)])); }
    T.history = [{ round: 0, rating: overall(rd, t.id) }];
  }
  rd.capex = 20e6 + prizeFor(order.indexOf(s.team) + 1) * 0.12e6 + (old && s.team === oldTeam ? Math.max(0, old.capex) * 0.5 : 0);
  s.rd = rd;
  // ---- the staff: renewals, replacements, retirements ----
  if (s.staff && newTeam === oldTeam) {
    for (const [role, what] of Object.entries(W.staff ?? {})) {
      const p = s.staff.people[role];
      if (what === 'renew' && p) { p.years = 2; p.salary = Math.round(p.salary * 1.08 * 10) / 10; p.morale = Math.min(1, (p.morale ?? 0.7) + 0.1); continue; }
      // Released or retired: the best of the market for the role takes the job.
      refreshMarket(s.staff);
      const c = s.staff.market.filter((x) => x.role === role).sort((a, b) => b.rating - a.rating)[0];
      if (c) { s.staff.people[role] = { ...c, years: 2, morale: 0.75 }; s.staff.market = s.staff.market.filter((x) => x.id !== c.id); }
    }
  } else if (newTeam !== oldTeam) s.staff = null;   // a new team: its own people (seasonState sets them up)
  // ---- a fresh season ----
  s.year += 1;
  s.round = 0; s.points = {}; s.history = []; s.weekend = null; s.interviews = [];
  s.fia = { bans: [], cleared: {} };
  s.loadout = newLoadout(s.team);
  s.objective = objectiveFor(s);
  s.career.lastMajor = !!W.regs?.major;
  s.phase = 'season';
  s.winter = null;
  void ROLES;
}
const FOCUS = {
  balanced: { lowSpeed: 0.55, highSpeed: 0.55, straight: 0.5, power: 0.45, tyre: 0.45, weight: 0.4, reliability: 0.5 },
  aero: { lowSpeed: 0.6, highSpeed: 1.1, straight: 0.55, power: 0.2, tyre: 0.3, weight: 0.2, reliability: 0.2 },
  mechanical: { lowSpeed: 1.1, highSpeed: 0.4, straight: 0.3, power: 0.2, tyre: 0.9, weight: 0.5, reliability: 0.3 },
  power: { lowSpeed: 0.25, highSpeed: 0.25, straight: 1.0, power: 1.1, tyre: 0.25, weight: 0.3, reliability: 0.3 },
  reliability: { lowSpeed: 0.3, highSpeed: 0.3, straight: 0.3, power: 0.4, tyre: 0.4, weight: 0.8, reliability: 1.6 },
};
export const FOCUS_INFO = {
  balanced: ['Balanced', 'A little everywhere: no weakness added, no big step anywhere'],
  aero: ['Aerodynamics', 'High-speed downforce first: Suzuka, Silverstone, Spa'],
  mechanical: ['Mechanical grip', 'Slow corners and tyre life: Monaco, Singapore, Hungary'],
  power: ['Power and drag', 'Straight-line speed: Monza, Baku, Las Vegas'],
  reliability: ['Reliability and weight', 'Fewer failures, a lighter car: points every weekend'],
};
