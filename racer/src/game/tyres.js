/*
 * Tyres and fuel over a race, modelled on how F1 tyres behave (Pirelli's dry range, a typical 2024-25
 * season):
 *
 *   compound   pace vs soft   linear deg   usable life    then
 *   soft       0              ~0.10% /lap  ~18 laps       the cliff: grip falls away fast
 *   medium     +0.55%         ~0.06% /lap  ~30 laps
 *   hard       +1.05%         ~0.035%/lap  ~45 laps
 *   inter      wet tyre       ~0.07% /lap  ~35 laps       overheats and wears fast on a drying track
 *   wet        wet tyre       ~0.05% /lap  ~40 laps
 *
 * Wear is the share of the tread left (1 new .. 0 gone). It goes with distance, with how abrasive the
 * circuit is, with how hard the car is driven (a sliding tyre wears far faster) and with the race
 * length (a short race uses the tyres up as fast as a full one would, so strategy still counts). Grip
 * is what the tyre gives now: new-tyre grip for the compound, minus a little per lap, minus a lot past
 * the cliff; the first lap on a cold tyre gives a bit less (warm-up).
 *
 * Fuel: ~105 kg at the start, burnt evenly; each 10 kg costs ~0.3 s a lap (0.35% at ~85 s), so the
 * car gets quicker as the race goes on: the "fuel effect" that hides some of the tyre deg.
 */
export const COMPOUNDS = {
  S: { name: 'Soft', colour: '#e8213a', pace: 0, deg: 0.0010, life: 18 },
  M: { name: 'Medium', colour: '#ffd21f', pace: 0.0055, deg: 0.0006, life: 30 },
  H: { name: 'Hard', colour: '#f4f4f6', pace: 0.0105, deg: 0.00035, life: 45 },
  I: { name: 'Intermediate', colour: '#2fd673', pace: 0, deg: 0.0007, life: 35 },
  W: { name: 'Wet', colour: '#2f8cff', pace: 0, deg: 0.0005, life: 40 },
};
/** How hard each circuit is on tyres (1 = average). */
export const ABRASION = { bahrain: 1.35, qatar: 1.4, silverstone: 1.3, suzuka: 1.3, barcelona: 1.2, catalunya: 1.2, zandvoort: 1.15, china: 1.1, cota: 1.15, interlagos: 1.05, austria: 1.0, hungaroring: 1.0, spa: 1.05, mexico: 0.9, monza: 0.85, baku: 0.8, jeddah: 0.85, vegas: 0.75, monaco: 0.6, singapore: 0.95, miami: 0.95, canada: 0.9, madring: 1.0, australia: 0.95, yas: 0.9 };

export const FUEL_START = 105, FUEL_EFFECT = 0.00035; // kg, lap-time share per kg

/** One set of tyres on a car. */
export class TyreSet {
  constructor(compound = 'M', { trackId = '', wearScale = 1 } = {}) {
    this.compound = compound; this.wear = 1; this.laps = 0; this.dist = 0; this.warm = 0;
    this.abrasion = ABRASION[trackId] ?? 1; this.wearScale = wearScale;
    this.use = [1, 1, 1, 1];   // each tyre's share of the work (FL, FR, RL, RR): the one that slides most wears most
  }
  /** Each tyre's work over a distance d (m): its slip (and load) from the physics. */
  useWheels(d, wheels) {
    if (!wheels?.length || d <= 0) return;
    for (let i = 0; i < 4; i++) { const w = wheels[i]; if (!w?.inContact) continue; this.use[i] += d * (0.4 + Math.min(2.5, Math.abs(w.slip ?? 0)) * (0.6 + Math.min(1.5, (w.load ?? 1) / Math.max(1, w.nominal ?? w.load ?? 1)) * 0.4)) / 1000; }
  }
  /** One tyre's tread left (0..1): the set's wear shared out by the work each tyre has done. */
  wheelWear(i) { const m = this.use.reduce((a, b) => a + b, 0) / 4; return Math.max(0, Math.min(1, 1 - (1 - this.wear) * (this.use[i] / m))); }
  get c() { return COMPOUNDS[this.compound] ?? COMPOUNDS.M; }
  /** Laps of use the tread is worth (life to the cliff, then a few more on a dying tyre). */
  get lifeLaps() { return this.c.life / (this.abrasion * this.wearScale); }
  /** Wear over a distance (m) of a lap length L at a driving severity (1 = a normal racing lap). */
  run(d, L, severity = 1) {
    this.dist += d; this.laps = this.dist / L;
    this.warm = Math.min(1, this.warm + d / (L * 0.6));
    this.wear = Math.max(0, this.wear - (d / L) * (0.82 / this.lifeLaps) * severity);
  }
  /** Lap-time share lost to this tyre now (0 = a new, warm tyre of the fastest compound). */
  get loss() {
    const c = this.c, used = 1 - this.wear;
    const lin = c.deg * this.laps * Math.min(2, this.abrasion * this.wearScale) / Math.max(0.5, this.wearScale);
    const cliff = used > 0.82 ? ((used - 0.82) / 0.18) ** 2 * 0.06 : 0;   // past the cliff: up to 6% (seconds a lap)
    const cold = (1 - this.warm) * 0.012;
    return c.pace + lin + cliff + cold;
  }
  /** Grip multiplier for the physics (lap time ~ 1/sqrt(grip) in the corners). */
  get grip() { return 1 / (1 + this.loss) ** 2; }
  /** For the HUD: 0..100 % tread left. */
  get pct() { return Math.round(this.wear * 100); }
  get state() { const u = 1 - this.wear; return u > 0.82 ? 'gone' : u > 0.62 ? 'worn' : u > 0.3 ? 'used' : 'good'; }
}

/** Fuel load (kg) after a share of the race. */
export const fuelAt = (share) => FUEL_START * (1 - Math.min(1, share)) + 2;
/** Lap-time share from the fuel on board (0 when empty). */
export const fuelLoss = (kg) => kg * FUEL_EFFECT;

/**
 * A race strategy for laps, given the conditions: the stints (compound and planned length). Dry
 * races use two compounds at least (the rule). wetness 0..1 picks inters/wets with no stop plan.
 * rand: a random stream, so each team's plan differs a little.
 */
export function planStrategy(laps, { trackId = '', wearScale = 1, wetness = 0, rand = Math.random, aggressive = 0.5, startCompound = null } = {}) {
  if (wetness > 0.58) return [{ c: 'W', laps }];
  if (wetness > 0.22) return [{ c: 'I', laps }];
  const life = (c) => COMPOUNDS[c].life / ((ABRASION[trackId] ?? 1) * wearScale);
  const options = [];
  const add = (seq) => {
    // Split the race in proportion to each tyre's life, then check no stint runs past its life.
    const tot = seq.reduce((a, c) => a + life(c), 0), stints = [];
    let used = 0;
    seq.forEach((c, k) => { const n = k === seq.length - 1 ? laps - used : Math.max(1, Math.round((laps * life(c)) / tot)); stints.push({ c, laps: n }); used += n; });
    if (stints.some((s) => s.laps > life(s.c) * 1.05 || s.laps < 1)) return;
    // Rough race time: tyre deg + pit loss (~22 s, ~0.26 laps' worth at ~85 s).
    let cost = (seq.length - 1) * 0.26;
    for (const s of stints) cost += s.laps * COMPOUNDS[s.c].pace + COMPOUNDS[s.c].deg * (s.laps * s.laps) / 2 * (ABRASION[trackId] ?? 1) * wearScale;
    options.push({ stints, cost: cost + (rand() - 0.5) * 0.08 + (seq[0] === 'S' ? -aggressive * 0.04 : 0) });
  };
  for (const seq of [['M', 'H'], ['H', 'M'], ['S', 'H'], ['S', 'M'], ['M', 'M', 'H'], ['S', 'M', 'H'], ['M', 'H', 'S'], ['S', 'H', 'S'], ['S', 'M', 'M'], ['H', 'M', 'S'], ['M', 'H', 'H'], ['S', 'S', 'H', 'M']]) {
    if (startCompound && seq[0] !== startCompound) continue;
    add(seq);
  }
  if (!options.length) { const n = Math.max(1, Math.ceil(laps / Math.max(4, life('H') * 0.9))); return Array.from({ length: n + 1 }, (_, k) => ({ c: k % 2 ? 'M' : 'H', laps: Math.round(laps / (n + 1)) })); }
  options.sort((a, b) => a.cost - b.cost);
  return options[Math.min(options.length - 1, Math.floor(rand() * Math.min(3, options.length) * 0.6))].stints;
}
