// Dev diagnostic: brake hard from speed, release, then turn in and make a correction (keyboard-style).
// Reports peak body slip and how far the yaw rate overshoots the steering request.
import { Vehicle } from '../src/physics/vehicle.js';
import { PHYSICS_HZ } from '../src/config.js';
import { CARS } from '../src/cars/index.js';
import { steerRateAt } from '../src/input.js';
const DT = 1 / PHYSICS_HZ;
for (const spec of CARS) for (const kmh of [140, 200]) {
  const car = new Vehicle({ heightAt: () => 0 }, spec);
  for (let i = 0; i < 30 * PHYSICS_HZ && car.forwardSpeed < kmh / 3.6; i++) car.step(DT, { throttle: 1, brake: 0, steer: 0, handbrake: 0 });
  let s = 0, b = 0, t = 0, maxBeta = 0, spins = 0, maxYaw = 0;
  // 1.0 s hard brake, trail into a full-lock turn at 0.8 s, correction the other way at 1.8 s, straighten at 2.6 s.
  while (t < 4) {
    const brake = t < 1.0 ? 1 : 0;
    const t0 = process.env.TRAIL ? 0.3 : 0.8;
    const want = t < t0 ? 0 : t < 1.8 ? 1 : t < 2.6 ? -1 : 0;
    const rate = steerRateAt(spec.steering.rate, car.speed) * 1.15;
    s += Math.max(-rate * DT, Math.min(rate * DT, want - s));
    b = brake ? Math.min(1, b + 16 * DT) : Math.max(0, b - 16 * DT);
    car.step(DT, { throttle: t > 1.0 ? 0.4 : 0, brake: b, steer: s, handbrake: 0 });
    maxBeta = Math.max(maxBeta, Math.abs(car.slipAngle));
    maxYaw = Math.max(maxYaw, Math.abs(car.body.angularVelocity.y));
    if (Math.abs(car.slipAngle) > 0.6) spins++;
    t += DT;
  }
  console.log(`${spec.id} ${kmh}: max slip ${(maxBeta * 57.3).toFixed(1)} deg, max yaw ${(maxYaw * 57.3).toFixed(0)} deg/s, >35deg ${(spins * DT).toFixed(2)} s`);
}
