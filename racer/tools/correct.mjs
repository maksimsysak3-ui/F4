// Dev diagnostic: a keyboard driver turning in, finishing the turn on the throttle and
// correcting any slide with full opposite key (after a human reaction delay).
// Reports peak slide, time spent sliding and how often the slide swaps sides (fishtails).
import { Vehicle } from '../src/physics/vehicle.js';
import { PHYSICS_HZ, ASSISTS } from '../src/config.js';
import { CARS } from '../src/cars/index.js';
import { steerRateAt } from '../src/input.js';
const DT = 1 / PHYSICS_HZ;
const only = process.env.CAR;
const approach = (v, t, rate, dt) => (v < t ? Math.min(t, v + rate * dt) : Math.max(t, v - rate * dt));
let worst = 0;
for (const spec of CARS) {
  if (only && spec.id !== only) continue;
  const rows = [];
  for (const kmh of [50, 90, 130]) for (const exitThrottle of [0.6, 1]) {
    const car = new Vehicle({ heightAt: () => 0 }, spec);
    const st = spec.steering;
    const hold = (c) => Math.max(0, Math.min(1, (kmh - c.forwardSpeed * 3.6) * 0.08));
    for (let i = 0; i < 25 * PHYSICS_HZ; i++) car.step(DT, { throttle: hold(car), brake: 0, steer: 0, handbrake: 0 });
    let steer = 0, throttle = hold(car), t = 0, peak = 0, sliding = 0, swaps = 0, lastSide = 0, key = 1;
    const seen = []; // beta history for the reaction delay
    while (t < 5) {
      const beta = car.slipAngle; // + = sliding one way
      seen.push(beta);
      const late = seen[Math.max(0, seen.length - 1 - Math.round(0.15 / DT))];
      if (t < 1.4) key = 1; // turn in, full lock
      else if (Math.abs(late) > 0.07) key = late > 0 ? 1 : -1; // counter the slide (sign tuned below)
      else if (Math.abs(late) < 0.03) key = 0;
      const target = key * (spec.id ? 1 : 1);
      const returning = target === 0 || Math.sign(target) !== Math.sign(steer);
      steer = approach(steer, target, returning ? st.returnRate * 1.15 : steerRateAt(st.rate, car.speed) * 1.15, DT);
      throttle = t < 1.4 ? 0.35 : exitThrottle;
      car.step(DT, { throttle, brake: 0, steer, handbrake: 0 });
      const a = Math.abs(car.slipAngle);
      peak = Math.max(peak, a);
      if (a > 0.17) sliding += DT;
      const side = car.slipAngle > 0.07 ? 1 : car.slipAngle < -0.07 ? -1 : 0;
      if (side && lastSide && side !== lastSide) swaps++;
      if (side) lastSide = side;
      t += DT;
    }
    worst = Math.max(worst, peak);
    rows.push(`${kmh}/${exitThrottle}: ${(peak * 57.3).toFixed(0)}deg ${sliding.toFixed(1)}s x${swaps}`);
  }
  console.log(spec.id.padEnd(8), rows.join(' | '));
}
