// Dev diagnostic: a keyboard-style driver (binary keys, real input ramps) laps Porto Vela.
// Reports spins (body slip > 35 deg), wall hits and lap time. Usage: node tools/humanlap.mjs [car] [aggr] [assists]
import { Vector3 } from 'three';
import { Vehicle } from '../src/physics/vehicle.js';
import { PHYSICS_HZ } from '../src/config.js';
import { CARS } from '../src/cars/index.js';
import { PORTO_VELA as T } from '../src/tracks/street/index.js';

const [carId = 'lambo', aggr = '1', assists = '1'] = process.argv.slice(2);
const base = CARS.find((c) => c.id === carId);
const merge = (a, b) => { for (const k in b) a[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) ? merge({ ...a[k] }, b[k]) : b[k]; return a; };
const spec = merge({ ...base }, JSON.parse(process.env.PATCH || '{}'));
const DT = 1 / PHYSICS_HZ;
const L = T.layout;
const car = new Vehicle(T.ground, spec);
car.assists = assists === '1';
const pose = T.poseAt(T.spawn.s, T.spawn.lateral);
car.reset(new Vector3(pose.x, 0, pose.z), pose.yaw);

const approach = (v, t, r) => (v < t ? Math.min(t, v + r * DT) : Math.max(t, v - r * DT));
const c = { steer: 0, throttle: 0, brake: 0, handbrake: 0 };
const k = +aggr; // >1 = brakes later / carries more speed
let slideTime = 0, spins = 0, spinning = false, wallTime = 0, maxBeta = 0, dist = 0, prevS = null, t = 0;
const events = [];
const curvAhead = (s, from, to) => {
  let m = 0;
  for (let d = from; d < to; d += 2) {
    const i = Math.floor((((s + d) % L.length) + L.length) % L.length / L.ds) % L.N;
    m = Math.max(m, Math.abs(L.k[i]));
  }
  return m;
};
while (t < 400 && dist < L.length * 1.02) {
  const p = car.body.position;
  const n = L.nearest(p.x, p.z);
  const s = n ? n.s : 0;
  if (prevS !== null) { let d = s - prevS; if (d < -L.length / 2) d += L.length; if (d > L.length / 2) d -= L.length; dist += d; }
  prevS = s;
  const v = Math.max(3, car.speed);
  // Steering keys: aim at a point ahead, press when off by more than a small threshold.
  const aim = T.poseAt((s + 5 + v * 0.3) % L.length, 0);
  const fwd = car.forward;
  const dx = aim.x - p.x, dz = aim.z - p.z;
  const ang = Math.atan2(fwd.z * dx - fwd.x * dz, fwd.x * dx + fwd.z * dz);
  const keySteer = ang > 0.04 ? -1 : ang < -0.04 ? 1 : 0;
  // Speed keys: brake for the tightest curvature within braking distance.
  const kmax = curvAhead(s, 0, 10 + v * v / (2 * 9.81 * 1.1));
  const vt = Math.min(85, Math.sqrt((1.25 * k * 9.81) / Math.max(kmax, 1e-4)));
  const brakeKey = car.forwardSpeed > vt + 1.5;
  const gasKey = car.forwardSpeed < vt - 1;
  c.steer = approach(c.steer, keySteer, keySteer === 0 || Math.sign(keySteer) !== Math.sign(c.steer) ? spec.steering.returnRate : spec.steering.rate);
  c.throttle = approach(c.throttle, gasKey ? 1 : 0, 8);
  c.brake = approach(c.brake, brakeKey ? 1 : 0, 10);
  car.step(DT, c);
  t += DT;
  const beta = Math.abs(car.slipAngle);
  maxBeta = Math.max(maxBeta, beta);
  if (beta > 0.17 && car.speed > 5) slideTime += DT;
  if (process.env.TRACE && beta > 0.26 && !(t * 20 % 1 > 0.05)) {
    const w = car.wheels;
    events.push(`t=${t.toFixed(2)} s=${s.toFixed(0)} v=${(car.speed * 3.6).toFixed(0)} beta=${(beta * 57.3).toFixed(0)} yaw=${car.body.angularVelocity.y.toFixed(2)} thr=${c.throttle.toFixed(1)} brk=${c.brake.toFixed(1)} st=${c.steer.toFixed(2)} ang=${(car.steerAngle * 57.3).toFixed(1)} esc=${car.escLevel.toFixed(2)} tc=${car.tcFactor.toFixed(2)} slip=${w.map((x) => x.slip.toFixed(1)).join('/')} sa=${w.map((x) => (x.slipAngle * 57.3).toFixed(0)).join('/')} load=${w.map((x) => (x.load / 1000).toFixed(1)).join('/')} gear=${car.gearLabel} k=${(L.k[n.i] * 1000).toFixed(0)}`);
  }
  if (beta > 0.6 && !spinning) { spins++; spinning = true; events.push(`spin @s=${s.toFixed(0)} v=${(car.speed * 3.6).toFixed(0)} brake=${c.brake.toFixed(1)} steer=${c.steer.toFixed(1)}`); }
  if (beta < 0.15) spinning = false;
  if (car.wallHit) wallTime += DT;
  // A spun car: put it back on track like a player pressing reset.
  if (spinning && beta > 1.4) { const q = T.poseAt(s, 0); car.reset(new Vector3(q.x, 0, q.z), q.yaw); spinning = false; }
}
console.log(`${carId} aggr=${aggr} assists=${assists}: ${dist >= L.length ? 'lap ' + t.toFixed(1) + ' s' : 'DNF at ' + dist.toFixed(0) + ' m'}, spins ${spins}, sliding>10deg ${slideTime.toFixed(1)} s, wall ${wallTime.toFixed(1)} s, max slip ${(maxBeta * 57.3).toFixed(0)} deg`);
for (const e of events.slice(0, +(process.env.TRACE || 8))) console.log('   ', e);
