// Headless AI race: N AI cars race L laps on a circuit; reports lap times, overtakes, contacts, wall
// hits and time off the track. Usage: node tools/aitest.mjs [track=suzuka] [cars=10] [laps=3]
import { TRACKS } from '../src/tracks/index.js';
import { Car, stepCar, collide, slipstream, grid, locate, countLaps } from '../src/ai/sim2d.js';
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
  drivers.push(Object.assign(new AIDriver(plan, { pace: 0.978 + 0.016 * q, skill: 0.9 + 0.08 * ((q + ((k * 7) % 5) / 5) / 2), aggression: 0.3 + (k % 4) * 0.15, humanity: 0.25 }), { rankPace: +n - Math.round(q * (+n - 1)) }));
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
  for (const c of cars) countLaps(L, c, time);
  time += DT;
  const lead = cars.reduce((a, b) => (b.progress > a.progress ? b : a));
  if (lead.lap > leaderLap) {
    leaderLap = lead.lap;
    const o = cars.slice().sort((a, b) => b.progress - a.progress), v = 60;
    spreads.push((o[0].progress - o[o.length - 1].progress) / v);
    bunched.push(o.slice(1).filter((c, k) => (o[k].progress - c.progress) / Math.max(20, c.u) < 1.0).length);
  }
  if (Math.round(time / DT) % 60 === 0 && time > 12) {
    const now = cars.slice().sort((x, y) => y.progress - x.progress).map((c) => c.id);
    for (const c of cars) { const p2 = now.indexOf(c.id); if (held.has(c.id) && p2 < held.get(c.id).pos && time - held.get(c.id).t > 0) gained += held.get(c.id).pos - p2; held.set(c.id, { pos: p2, t: time }); }
  }
}
console.log(`simulated ${time.toFixed(0)} s in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
const fmt = (x) => (x == null ? '-' : x.toFixed(2));
for (const c of cars.slice().sort((a, b) => b.progress - a.progress)) console.log(`${c.name.padEnd(5)} laps ${c.lap - 1} best ${fmt(c.best)} last ${fmt(c.lastLap)} walls ${c.wallHits} contacts ${c.contacts} off ${c.offTime.toFixed(1)} s`);
console.log(`places gained (all cars, sampled each second): ${gained}`);
console.log('finish order by pace (1 = fastest):', cars.slice().sort((a, b) => b.progress - a.progress).map((c) => drivers[cars.indexOf(c)].rankPace).join(' '));
console.log('field spread (first to last, s) at each lap of the leader:', spreads.map((x) => x.toFixed(1)).join('  '), '| cars within 1.0 s of the car ahead:', bunched.join('  '));
