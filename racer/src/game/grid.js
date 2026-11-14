import { TEAMS } from '../front/teams.js?v=1a016bc';

/*
 * The 2026 grid as the AI sees it: each driver's three-letter code, how good they are, and how good
 * their car is. Ratings are 0..100 the way a racing game shows them; they become the AI's pace (the
 * share of the car's limit it drives at), its precision, its aggression in wheel-to-wheel battles and
 * how human it is (reaction, inconsistency, the odd mistake).
 *
 *   car       the team's car: 0..100 (100 = the quickest car on the grid)
 *   pace      raw speed over a lap
 *   craft     consistency and precision (fewer and smaller mistakes, a tidier line)
 *   aggr      aggression in a fight
 */
export const CAR_RATING = { mclaren: 100, mercedes: 99.5, redbull: 99.2, ferrari: 99, williams: 97.6, aston: 97.4, racingbulls: 97.1, haas: 96.9, alpine: 96.6, audi: 96.2, cadillac: 95.4 };

export const DRIVERS = {
  'Lando Norris': { code: 'NOR', pace: 96, craft: 92, aggr: 62 },
  'Oscar Piastri': { code: 'PIA', pace: 95, craft: 94, aggr: 58 },
  'Charles Leclerc': { code: 'LEC', pace: 97, craft: 88, aggr: 66 },
  'Lewis Hamilton': { code: 'HAM', pace: 93, craft: 93, aggr: 60 },
  'Max Verstappen': { code: 'VER', pace: 98, craft: 96, aggr: 82 },
  'Isack Hadjar': { code: 'HAD', pace: 90, craft: 84, aggr: 66 },
  'George Russell': { code: 'RUS', pace: 95, craft: 92, aggr: 64 },
  'Kimi Antonelli': { code: 'ANT', pace: 91, craft: 82, aggr: 60 },
  'Fernando Alonso': { code: 'ALO', pace: 92, craft: 96, aggr: 78 },
  'Lance Stroll': { code: 'STR', pace: 84, craft: 80, aggr: 55 },
  'Alex Albon': { code: 'ALB', pace: 90, craft: 90, aggr: 56 },
  'Carlos Sainz': { code: 'SAI', pace: 91, craft: 92, aggr: 62 },
  'Liam Lawson': { code: 'LAW', pace: 87, craft: 82, aggr: 74 },
  'Arvid Lindblad': { code: 'LIN', pace: 87, craft: 80, aggr: 64 },
  'Pierre Gasly': { code: 'GAS', pace: 90, craft: 89, aggr: 60 },
  'Franco Colapinto': { code: 'COL', pace: 86, craft: 80, aggr: 62 },
  'Esteban Ocon': { code: 'OCO', pace: 88, craft: 88, aggr: 66 },
  'Oliver Bearman': { code: 'BEA', pace: 89, craft: 83, aggr: 64 },
  'Nico Hülkenberg': { code: 'HUL', pace: 89, craft: 91, aggr: 56 },
  'Gabriel Bortoleto': { code: 'BOR', pace: 88, craft: 85, aggr: 58 },
  'Sergio Pérez': { code: 'PER', pace: 88, craft: 88, aggr: 58 },
  'Valtteri Bottas': { code: 'BOT', pace: 88, craft: 90, aggr: 50 },
};

/**
 * The field for a weekend: every car but the player's, with its AI parameters. difficulty 0..110 is
 * the AI level (as in the F1 games): 110 puts the best driver in the best car right at the limit; each
 * point below takes ~0.06% of pace off everyone. The spread between cars and drivers stays as rated.
 */
export function buildEntries({ playerTeam, playerName = 'You', difficulty = 90, ratings = null }) {
  const out = [];
  const base = 1 - (110 - difficulty) * 0.0006;
  TEAMS.forEach((t, ti) => t.drivers.forEach((d, k) => {
    const r = DRIVERS[d.name] ?? { code: d.name.slice(0, 3).toUpperCase(), pace: 86, craft: 84, aggr: 60 };
    const isPlayer = t.id === playerTeam && k === 0;
    // The car: its rating at this circuit from the season's development (game/rd.js), else the 2026 baseline.
    const car = ratings?.[t.id] ?? CAR_RATING[t.id];
    // Car and driver both count, enough that the field spreads out over a stint (gaps build, chases).
    const pace = base * (1 - (100 - car) * 0.0038) * (1 - (100 - r.pace) * 0.0016);
    out.push({
      id: `${t.id}-${k}`, team: t, teamIndex: ti, seat: k, player: isPlayer,
      name: isPlayer ? playerName : d.name, code: isPlayer ? (playerName.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'YOU') : r.code,
      colour: t.colours[0], pace, skill: 0.86 + r.craft * 0.0014, aggression: r.aggr / 100, humanity: 0.12 + (100 - r.craft) * 0.012,
    });
  }));
  return out;
}
