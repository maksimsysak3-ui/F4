// Headless AI race: N AI cars race L laps on a circuit; reports lap times, overtakes, contacts, wall
// hits and time off the track. Usage: node tools/aitest.mjs [track=suzuka] [cars=10] [laps=3]
import { TRACKS } from '../src/tracks/index.js';
import { Car, stepCar, collide, slipstream, grid, locate, countLaps, markSplit, timeGap } from '../src/ai/sim2d.js';
import { planTrack, AIDriver } from '../src/ai/driver.js';

const [trackId = 'suzuka', n = '10', laps = '3', gridOrder = 'fast'] = process.argv.slice(2);
const T = TRACKS.find((t) => t.id === trackId), L = T.layout;
let t0 = Date.now();
const plan = planTrack(L);
console.log(`${T.name}: plan in ${Date.now() - t0} ms; ideal line lap ~${(() => { let tt = 0; for (let i = 0; i < L.N; i++) tt += L.ds / plan.vLine[i]; return tt.toFixed(1); })()} s`);
const cars = [], drivers = [];
grid(L, +n).forEach((g, k) => {
  const c = new Car(k + 1, { ...g, name: `AI${k + 1}` });
  locate(L, c); c.progress = c.s > L.length / 2 ? c.s - L.length : c.s; c._prevS = c.s;
  cars.push(c);
  const rank = gridOrder === 'reverse' ? +n - 1 - k : gridOrder === 'mixed' ? [3, 0, 6, 1, 9, 4, 2, 11, 7, 5, 10, 8, 13, 12, 15, 14, 17, 16, 19, 18][k] % +n : k;
  const q = 1 - rank / Math.max(1, +n - 1);
  drivers.push(Object.assign(new AIDriver(plan, { pace: 0.994 - (+(process.env.SPREAD ?? 0.016)) * (1 - q), skill: 0.9 + 0.08 * ((q + ((k * 7) % 5) / 5) / 2), aggression: 0.3 + (k % 4) * 0.15, humanity: 0.25 }), { rankPace: +n - Math.round(q * (+n - 1)) }));
});
const DT = 1 / 120;
let time = 0, overtakes = 0, leaderLap = 0, gained = 0;
const held = new Map();
const spreads = [], bunched = [];
// A pass: one car's progress goes from behind another's to more than a car length ahead, and stays.
const ahead = new Map();
const key = (a, b) => `${a.id}:${b.id}`;
t0 = Date.now();
while (time < 1200 && cars.some((c) => c.lap <= +laps)) {
  for (const c of cars) locate(L, c);
  slipstream(L, cars);
  cars.forEach((c, k) => { const o = drivers[k].drive(c, cars.filter((x) => x !== c), DT, time); c.steer = o.steer; c.throttle = o.throttle; c.brake = o.brake; });
  for (const c of cars) stepCar(L, c, DT);
  collide(cars);
  time += DT;
  for (const c of cars) { markSplit(c, time); countLaps(L, c, time); }
  const lead = cars.reduce((a, b) => (b.progress > a.progress ? b : a));
  if (lead.lap > leaderLap) {
    leaderLap = lead.lap;
    const o = cars.slice().sort((a, b) => b.progress - a.progress), gap = (p) => timeGap(o[0], o[Math.min(p, o.length - 1)], time) ?? 0;
    spreads.push(`P5 +${gap(4).toFixed(1)} P10 +${gap(9).toFixed(1)} last +${gap(o.length - 1).toFixed(1)}`);
    bunched.push(o.slice(1).filter((c, k) => (timeGap(o[k], c, time) ?? 9) < 1.0).length);
  }
  // Passes: car X goes from behind Y to ahead of Y and stays there 3 s (back-and-forth isn't counted).
  if (Math.round(time / DT) % 30 === 0 && time > 12) {
    const ord = cars.slice().sort((x, y) => y.progress - x.progress).map((c) => c.id);
    globalThis.ORD ??= []; ORD.push(ord); if (ORD.length > 7) ORD.shift();
    if (ORD.length === 7) { const [o0, o1] = [ORD[0], ORD[1]], last = ORD.slice(1); for (let a = 0; a < o0.length; a++) for (let b = a + 1; b < o0.length; b++) { const A = o0[a], B = o0[b]; if (last.every((o) => o.indexOf(B) < o.indexOf(A)) && o1.indexOf(B) < o1.indexOf(A) && o0.indexOf(B) > o0.indexOf(A)) globalThis.PASSES = (globalThis.PASSES ?? 0) + 1; } }
  }
  if (Math.round(time / DT) % 60 === 0 && time > 12) {
    const now = cars.slice().sort((x, y) => y.progress - x.progress).map((c) => c.id);
    for (const c of cars) { const p2 = now.indexOf(c.id); if (held.has(c.id) && p2 < held.get(c.id).pos && time - held.get(c.id).t > 0) gained += held.get(c.id).pos - p2; held.set(c.id, { pos: p2, t: time }); }
  }
}
console.log(`simulated ${time.toFixed(0)} s in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
const fmt = (x) => (x == null ? '-' : x.toFixed(2));
for (const c of cars.slice().sort((a, b) => b.progress - a.progress)) console.log(`${c.name.padEnd(5)} laps ${c.lap - 1} best ${fmt(c.best)} last ${fmt(c.lastLap)} walls ${c.wallHits} contacts ${c.contacts} off ${c.offTime.toFixed(1)} s`);
console.log(`real passes (held 3 s): ${globalThis.PASSES ?? 0}`);
console.log(`places gained (all cars, sampled each second): ${gained}`);
console.log('finish order by pace (1 = fastest):', cars.slice().sort((a, b) => b.progress - a.progress).map((c) => drivers[cars.indexOf(c)].rankPace).join(' '));
console.log('gaps to the leader (real timing) at each lap of the leader:', spreads.join(' | '));
console.log('cars within 1.0 s of the car ahead:', bunched.join('  '));
