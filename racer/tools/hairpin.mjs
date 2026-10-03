// Dev diagnostic: tight hairpin at full keyboard lock from a few entry speeds, throttle out.
// Reports body slip (rear sliding), front slip vs peak (front pushing), radius achieved.
import { Vehicle } from '../src/physics/vehicle.js';
import { PHYSICS_HZ } from '../src/config.js';
import { CARS } from '../src/cars/index.js';
import { steerRateAt } from '../src/input.js';
const DT = 1 / PHYSICS_HZ;
for (const spec of CARS) {
  const rows = [];
  for (const kmh of [40, 60, 80]) {
    const car = new Vehicle({ heightAt: () => 0 }, spec);
    car.awd = spec.defaults.awd;
    const hold = (c) => Math.max(0, Math.min(1, (kmh - c.forwardSpeed * 3.6) * 0.1));
    for (let i = 0; i < 20 * PHYSICS_HZ; i++) car.step(DT, { throttle: hold(car), brake: 0, steer: 0, handbrake: 0 });
    let s = 0, t = 0, beta = 0, front = 0, slideT = 0, heading = 0;
    while (t < 3) {
      const rate = steerRateAt(spec.steering.rate, car.speed) * 1.15;
      s = Math.min(1, s + rate * DT);
      car.step(DT, { throttle: t > 0.8 ? 0.7 : 0.25, brake: 0, steer: s, handbrake: 0 });
      beta = Math.max(beta, Math.abs(car.slipAngle));
      const fr = Math.max(...car.wheels.slice(0, 2).map((w) => (w.inContact ? Math.abs(w.slipAngle) / w.tire.peakSlipAngle : 0)));
      front = Math.max(front, fr);
      if (Math.abs(car.slipAngle) > 0.12 || fr > 1.4) slideT += DT;
      heading += Math.abs(car.body.angularVelocity.y) * DT;
      t += DT;
    }
    rows.push(`${kmh}: beta ${(beta * 57.3).toFixed(0)} front ${front.toFixed(1)}x slide ${slideT.toFixed(1)}s turn ${(heading * 57.3).toFixed(0)}`);
  }
  console.log(spec.id.padEnd(8), rows.join(' | '));
}
