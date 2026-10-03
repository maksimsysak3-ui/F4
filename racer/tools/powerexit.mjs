// Dev diagnostic: hairpin exit at full lock and full throttle from 30/50 km/h, and a handbrake tap.
import { Vehicle } from '../src/physics/vehicle.js';
import { PHYSICS_HZ } from '../src/config.js';
import { CARS } from '../src/cars/index.js';
const DT = 1 / PHYSICS_HZ;
for (const spec of CARS) {
  const rows = [];
  for (const [kmh, hb] of [[30, 0], [50, 0], [70, 0], [60, 1]]) {
    const car = new Vehicle({ heightAt: () => 0 }, spec);
    car.awd = spec.defaults.awd;
    const hold = (c) => Math.max(0, Math.min(1, (kmh - c.forwardSpeed * 3.6) * 0.1));
    for (let i = 0; i < 20 * PHYSICS_HZ; i++) car.step(DT, { throttle: hold(car), brake: 0, steer: 0, handbrake: 0 });
    let t = 0, beta = 0, spinT = 0, s = 0;
    while (t < 3) {
      s = Math.min(1, s + 4 * DT);
      car.step(DT, { throttle: hb ? (t > 0.6 ? 1 : 0) : 1, brake: 0, steer: s, handbrake: hb && t > 0.2 && t < 0.6 ? 1 : 0 });
      beta = Math.max(beta, Math.abs(car.slipAngle));
      if (Math.abs(car.slipAngle) > 0.6) spinT += DT;
      t += DT;
    }
    rows.push(`${hb ? 'hb' : ''}${kmh}: ${(beta * 57.3).toFixed(0)}deg${spinT > 0 ? ' SPIN' : ''}`);
  }
  console.log(spec.id.padEnd(8), rows.join(' | '));
}
