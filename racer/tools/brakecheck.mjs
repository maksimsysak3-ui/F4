// Dev diagnostic: keyboard-style brake + full steer from speed; measures turning, lockup and stopping.
import { Vehicle } from '../src/physics/vehicle.js';
import { PHYSICS_HZ } from '../src/config.js';
import { CARS } from '../src/cars/index.js';
const DT = 1 / PHYSICS_HZ;
for (const spec of CARS) for (const kmh of (process.env.KMH || "60,110").split(",").map(Number)) for (const steer of [0, 1]) {
  const car = new Vehicle({ heightAt: () => 0 }, spec);
  for (let i = 0; i < 25 * PHYSICS_HZ && car.forwardSpeed < kmh / 3.6; i++) car.step(DT, { throttle: 1, brake: 0, steer: 0, handbrake: 0 });
  let b = 0, s = 0, t = 0, locked = 0, heading = 0, maxBeta = 0;
  const p0 = car.body.position.clone();
  while (car.speed > 2 && t < 8) {
    b = Math.min(1, b + 16 * DT); s = Math.min(steer, s + spec.steering.rate * DT);
    car.step(DT, { throttle: 0, brake: b, steer: s, handbrake: 0 });
    for (const w of car.wheels.slice(0, 2)) if (w.slipRatio < -0.35) locked += DT / 2;
    heading += car.body.angularVelocity.y * DT; maxBeta = Math.max(maxBeta, Math.abs(car.slipAngle)); t += DT;
  }
  console.log(`${spec.id} ${kmh} km/h steer ${steer}: stop ${car.body.position.distanceTo(p0).toFixed(1)} m in ${t.toFixed(2)} s, turned ${(Math.abs(heading) * 57.3).toFixed(0)} deg, front lock ${locked.toFixed(2)} s, max slide ${(maxBeta * 57.3).toFixed(0)} deg`);
}
