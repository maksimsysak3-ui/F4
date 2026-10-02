// Dev diagnostic: steady full-lock turning at fixed speeds. Usage: node tools/turncheck.mjs [car]
import { Vehicle } from '../src/physics/vehicle.js';
import { PHYSICS_HZ } from '../src/config.js';
import { CARS } from '../src/cars/index.js';
const base = CARS.find((c) => c.id === (process.argv[2] || 'lambo'));
const merge = (a, b) => { for (const k in b) a[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) ? merge({ ...a[k] }, b[k]) : b[k]; return a; };
const spec = merge({ ...base }, JSON.parse(process.env.PATCH || '{}'));
const DT = 1 / PHYSICS_HZ, flat = { heightAt: () => 0 };
for (const lock of [1, 0.5]) for (const kmh of [30, 50, 70, 100, 140]) {
  const car = new Vehicle(flat, spec);
  const v0 = kmh / 3.6;
  const hold = (c) => Math.max(0, Math.min(1, (v0 - c.forwardSpeed) * 0.5));
  for (let i = 0; i < 25 * PHYSICS_HZ && car.forwardSpeed < v0; i++) car.step(DT, { throttle: 1, brake: 0, steer: 0, handbrake: 0 });
  let s = 0, ay = 0, beta = 0, n = 0, yaw = 0, fs = 0, rs = 0;
  for (let i = 0; i < 4 * PHYSICS_HZ; i++) {
    s = Math.min(lock, s + spec.steering.rate * DT);
    car.step(DT, { throttle: hold(car), brake: 0, steer: s, handbrake: 0 });
    if (i > 2.5 * PHYSICS_HZ) { const w = Math.abs(car.body.angularVelocity.y); yaw += w; ay += w * car.speed; beta += Math.abs(car.slipAngle); fs += (car.wheels[0].slip + car.wheels[1].slip) / 2; rs += (car.wheels[2].slip + car.wheels[3].slip) / 2; n++; }
  }
  const R = car.speed / (yaw / n);
  console.log(`${spec.id} lock ${lock} ${kmh} km/h -> v ${(car.speed * 3.6).toFixed(0)}, radius ${R.toFixed(1)} m, lat ${(ay / n / 9.81).toFixed(2)} g, beta ${(beta / n * 57.3).toFixed(1)} deg, steer ${(car.steerAngle * 57.3).toFixed(1)} deg, slip F ${(fs / n).toFixed(2)} R ${(rs / n).toFixed(2)}`);
}
// Turn-in: step to half lock at 80 km/h, time to 90% of the settled yaw rate.
{
  const car = new Vehicle(flat, spec);
  for (let i = 0; i < 25 * PHYSICS_HZ && car.forwardSpeed < 80 / 3.6; i++) car.step(DT, { throttle: 1, brake: 0, steer: 0, handbrake: 0 });
  const yaws = [];
  let s = 0;
  for (let i = 0; i < 3 * PHYSICS_HZ; i++) {
    s = Math.min(0.5, s + spec.steering.rate * DT);
    car.step(DT, { throttle: Math.max(0, Math.min(1, (80 / 3.6 - car.forwardSpeed) * 0.5)), brake: 0, steer: s, handbrake: 0 });
    yaws.push(Math.abs(car.body.angularVelocity.y));
  }
  const settled = yaws.at(-1), peak = Math.max(...yaws);
  console.log(`${spec.id} turn-in 80 km/h: 90% yaw in ${(yaws.findIndex((y) => y > 0.9 * settled) * DT).toFixed(2)} s, overshoot ${((peak / settled - 1) * 100).toFixed(0)}%`);
}
