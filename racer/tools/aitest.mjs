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
  const rank = gridOrder === 'reverse' ? +n - 1 - k : k;
  drivers.push(new AIDriver(plan, { skill: 0.9 + 0.1 * (1 - rank / Math.max(1, +n - 1)) * 0.9 + (k % 3) * 0.01, aggression: 0.3 + (k % 4) * 0.15, humanity: 0.25 }));
});
const DT = 1 / 120;
let time = 0, overtakes = 0;
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
  if (Math.round(time / DT) % 30 === 0) for (const a of cars) for (const b of cars) {
    if (a === b) continue;
    const d = a.progress - b.progress, k2 = key(a, b), was = ahead.get(k2);
    if (d > 7 && was === false && time > 10) overtakes++;
    if (d > 7) ahead.set(k2, true); else if (d < -7) ahead.set(k2, false);
  }
}
console.log(`simulated ${time.toFixed(0)} s in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
const fmt = (x) => (x == null ? '-' : x.toFixed(2));
for (const c of cars.slice().sort((a, b) => b.progress - a.progress)) console.log(`${c.name.padEnd(5)} laps ${c.lap - 1} best ${fmt(c.best)} last ${fmt(c.lastLap)} walls ${c.wallHits} contacts ${c.contacts} off ${c.offTime.toFixed(1)} s`);
console.log(`overtakes: ${overtakes}`);
