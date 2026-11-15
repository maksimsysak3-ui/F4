// Racecraft benchmark: how hard is the AI to race against, measured from the player's side.
// A bot "player" (the AI's own driving, tuned like a quick, aggressive human: perfect skill, instant
// reactions, no patience) races the AI in three scenarios, each over several seeds:
//   duel   the bot starts behind one AI defender with a pace advantage (in % of lap time, measured
//          solo); pass rate and laps to the first pass that sticks. The difficulty curve: how much
//          quicker you must be to get by.
//   lap1   20 cars, mixed grid; the bot starts P12 with front-runner pace: places gained on the
//          opening lap and by the end, its contacts.
//   field  the same race's AI-vs-AI passes and contacts (harder defending mustn't kill the racing).
// Usage: node tools/racecraft.mjs [track=china] [scenarios=duel,lap1] [seeds=4]
//        (DUEL_LAPS, DELTAS=0.3,0.6,1.0,1.5 and FIELD_LAPS env overrides)
import { TRACKS } from '../src/tracks/index.js';
import { Car, stepCar, collide, slipstream, grid, locate, countLaps, markSplit } from '../src/ai/sim2d.js';
import { planTrack, AIDriver } from '../src/ai/driver.js';

const [trackId = 'china', which = 'duel,lap1', seedsArg = '4'] = process.argv.slice(2);
const T = TRACKS.find((t) => t.id === trackId);
if (!T) { console.error(`no track ${trackId}`); process.exit(1); }
const L = T.layout, plan = planTrack(L), SEEDS = +seedsArg, DT = 1 / 120;
const BOT = { skill: 1, aggression: 1, humanity: 0, patience: 0 };
const AI = { skill: 0.95, aggression: 0.6, humanity: 0.25 };

/** Race cars (opts per car, in grid order) for `laps` laps; returns timing and pass records. */
function race(entries, laps, seed, { maxTime = 900, launch = true } = {}) {
  const slots = grid(L, Math.max(entries.length, ...entries.map((e) => (e.slot ?? 0) + 1)));
  const cars = [], drivers = [];
  entries.forEach((e, k) => {
    const c = new Car(k + 1, { ...slots[e.slot ?? k], name: e.name ?? `AI${k + 1}` });
    locate(L, c); c.progress = c.s > L.length / 2 ? c.s - L.length : c.s; c._prevS = c.s;
    const d = new AIDriver(plan, { ...e, seed: k + 1 + 100 * seed });
    if (e.patience !== undefined) d.patience = e.patience;
    if (launch) d.launchUntil = 6;   // (the game's getaway: field.raceStart)
    cars.push(c); drivers.push(d);
  });
  let time = 0;
  const hist = [], info = [], passes = [], lapOrder = new Map();
  while (time < maxTime && cars.some((c) => c.lap <= laps)) {
    for (const c of cars) locate(L, c);
    slipstream(L, cars);
    cars.forEach((c, k) => { const o = drivers[k].drive(c, cars.filter((x) => x !== c), DT, time); c.steer = o.steer; c.throttle = o.throttle; c.brake = o.brake; });
    for (const c of cars) stepCar(L, c, DT);
    collide(cars);
    time += DT;
    for (const c of cars) { markSplit(c, time); countLaps(L, c, time); }
    // The order when each lap is completed by the car being watched (entry 0 by convention: the bot).
    const me = cars[entries.findIndex((e) => e.watch)] ?? null;
    if (me && !lapOrder.has(me.lap)) lapOrder.set(me.lap, cars.slice().sort((a, b) => b.progress - a.progress).indexOf(me) + 1);
    // A pass: X from behind Y to ahead of it, and still ahead 3 s later (back-and-forth isn't one).
    if (Math.round(time / DT) % 30 === 0 && time > 8) {
      hist.push(cars.slice().sort((x, y) => y.progress - x.progress).map((c) => c.id));
      // (What each car was doing then: on a straight or into a corner, DRS, its plan; for where passes happen.)
      info.push(cars.map((c) => ({ straight: Math.abs(plan.kLine[Math.floor(((c.s % L.length) + L.length) % L.length / L.ds) % L.N]) < 1 / 250, drs: c.drs, braking: c.brake > 0.2 })));
      if (hist.length > 7) { hist.shift(); info.shift(); }
      if (hist.length === 7) {
        const [o0, o1] = hist, rest = hist.slice(1);
        for (let a = 0; a < o0.length; a++) for (let b = a + 1; b < o0.length; b++) {
          const A = o0[a], B = o0[b];   // B was behind A
          if (rest.every((o) => o.indexOf(B) < o.indexOf(A)) && o1.indexOf(B) < o1.indexOf(A)) passes.push({ by: B, on: A, t: time - 3, lap: cars[B - 1].lap, where: (() => { const x = info[1][B - 1]; return x.braking ? 'braking' : x.straight ? (x.drs ? 'drs' : 'straight') : 'corner'; })() });
        }
      }
    }
  }
  return { cars, passes, lapOrder, time };
}

/** Clean-air lap time for a pace (one car, best of laps 2-3). */
const soloCache = new Map();
function solo(opts) {
  const k = JSON.stringify(opts);
  if (!soloCache.has(k)) { const { cars } = race([{ ...opts }], 3, 0, { launch: false }); soloCache.set(k, cars[0].best); }
  return soloCache.get(k);
}
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const f = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '-');
const t0 = Date.now();
console.log(`${T.name}: racecraft benchmark, ${SEEDS} seeds`);

if (which.includes('duel')) {
  // A midfield defender; the bot's pace set for each target advantage (measured solo, not assumed).
  const def = { ...AI, pace: 0.985 }, tDef = solo(def), LAPS = +(process.env.DUEL_LAPS ?? 6);
  console.log(`\nDUEL: bot starts ~3 places behind one defender (solo ${f(tDef, 2)} s), ${LAPS} laps`);
  console.log('  advantage   pass rate   laps to pass   passes back   contacts   where');
  for (const want of (process.env.DELTAS ?? '0.3,0.6,1.0,1.5').split(',').map(Number)) {
    // Find the bot pace giving this advantage (lap time scales ~0.85% per point of pace: refine once).
    let pace = Math.min(1, 0.985 + want / 100 / 0.85), tBot = solo({ ...BOT, pace });
    pace = Math.min(1, pace + (want - (1 - tBot / tDef) * 100) / 100 / 0.85); tBot = solo({ ...BOT, pace });
    const got = (1 - tBot / tDef) * 100;
    const res = [];
    for (let s = 1; s <= SEEDS; s++) {
      const { cars, passes } = race([{ ...def }, { ...BOT, pace, slot: 3, watch: true, name: 'BOT' }], LAPS, s);
      const mine = passes.filter((p) => p.by === 2), back = passes.filter((p) => p.by === 1);
      res.push({ passed: mine.length > 0, lap: mine[0]?.lap ?? null, back: back.length, contacts: cars[1].contacts, where: mine[0]?.where });
    }
    const won = res.filter((r) => r.passed);
    const where = {}; for (const r of won) where[r.where] = (where[r.where] ?? 0) + 1;
    console.log(`  ${f(got, 2).padStart(5)}%      ${String(won.length).padStart(2)}/${SEEDS}        ${f(avg(won.map((r) => r.lap)))}            ${f(avg(res.map((r) => r.back)))}          ${f(avg(res.map((r) => r.contacts)))}      ${Object.entries(where).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  }
}

if (which.includes('lap1') || which.includes('field')) {
  const LAPS = +(process.env.FIELD_LAPS ?? 5);
  const order = [3, 0, 6, 1, 9, 4, 2, 11, 7, 5, 10, 8, 13, 12, 15, 14, 17, 16, 19, 18];   // (aitest's mixed grid)
  const field = order.map((rank, k) => {
    const q = 1 - rank / 19;
    return { pace: 0.994 - 0.016 * (1 - q), skill: 0.9 + 0.08 * ((q + ((k * 7) % 5) / 5) / 2), aggression: 0.3 + (k % 4) * 0.15, humanity: 0.25 };
  });
  field[11] = { ...BOT, pace: 0.994, watch: true, name: 'BOT' };   // the bot: P12, front-runner pace
  console.log(`\nLAP 1 + FIELD: 20 cars, bot from P12 with front-runner pace, ${LAPS} laps`);
  const rows = [];
  for (let s = 1; s <= SEEDS; s++) {
    const { cars, passes, lapOrder } = race(field, LAPS, s);
    const bot = cars[11], fin = cars.slice().sort((a, b) => b.progress - a.progress).indexOf(bot) + 1;
    const aiPasses = passes.filter((p) => p.by !== 12 && p.on !== 12).length;
    rows.push({ l1: lapOrder.get(2), fin, botPasses: passes.filter((p) => p.by === 12).length, aiPasses, botContacts: bot.contacts, contacts: cars.reduce((n, c) => n + c.contacts, 0) / 2 });
    console.log(`  seed ${s}: P12 -> P${lapOrder.get(2) ?? '?'} after lap 1 -> P${fin} at the end; bot passes ${rows.at(-1).botPasses}, AI-vs-AI passes ${aiPasses}, bot contacts ${bot.contacts}, all contacts ${rows.at(-1).contacts}`);
  }
  console.log(`  MEAN: lap 1 P${f(avg(rows.map((r) => r.l1)))}  finish P${f(avg(rows.map((r) => r.fin)))}  bot passes ${f(avg(rows.map((r) => r.botPasses)))}  AI-vs-AI passes ${f(avg(rows.map((r) => r.aiPasses)))}  contacts ${f(avg(rows.map((r) => r.contacts)))}`);
}
console.log(`\n(${((Date.now() - t0) / 1000).toFixed(0)} s)`);
