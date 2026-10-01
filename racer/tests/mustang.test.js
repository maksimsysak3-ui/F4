// Mustang physics regression tests: a different car, with its own character.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { Vehicle } from '../src/physics/vehicle.js';
import { ground as track, nearestTrackPose } from '../src/world/trackShape.js';
import { PHYSICS_HZ, TRACK } from '../src/config.js';
import { MUSTANG as CAR, LAMBO } from '../src/cars/index.js';

const DT = 1 / PHYSICS_HZ;
const flat = { heightAt: () => 0 };
const idle = { throttle: 0, brake: 0, steer: 0, handbrake: 0 };
const kmh = (c) => c.forwardSpeed * 3.6;

function run(car, seconds, input, onStep) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    car.step(DT, typeof input === 'function' ? input(car) : input);
    const p = car.body.position;
    assert.ok(Number.isFinite(p.x + p.y + p.z), 'state went non-finite');
    if (onStep && onStep(car) === false) return i * DT;
  }
  return seconds;
}

const newCar = (ground = flat) => {
  const c = new Vehicle(ground, CAR);
  c.awd = CAR.defaults.awd;
  return c;
};

test('mustang settles at rest, nose-heavy', () => {
  const car = newCar();
  run(car, 6, idle);
  assert.ok(car.speed < 0.02);
  const front = car.wheels[0].load + car.wheels[1].load;
  const share = front / car.wheels.reduce((s, w) => s + w.load, 0);
  assert.ok(share > 0.51 && share < 0.57, `front share ${share}`);
});

test('mustang is quick but clearly slower off the line than the Lambo', () => {
  const t = (spec, awd) => {
    const car = new Vehicle(flat, spec);
    car.awd = awd;
    run(car, 1, idle);
    return run(car, 12, { ...idle, throttle: 1 }, (c) => (kmh(c) >= 100 ? false : undefined));
  };
  const pony = t(CAR, false);
  const lambo = t(LAMBO, true);
  console.log(`    0-100: mustang ${pony.toFixed(2)} s vs lambo ${lambo.toFixed(2)} s`);
  assert.ok(pony > lambo + 0.5 && pony < 6.5);
});

test('mustang stops from 100 km/h, but needs more room', () => {
  const car = newCar();
  run(car, 12, { ...idle, throttle: 1 }, (c) => (kmh(c) >= 100 ? false : undefined));
  const start = car.body.position.clone();
  run(car, 8, { ...idle, brake: 1 }, (c) => (c.forwardSpeed < 0.3 ? false : undefined));
  const d = car.body.position.distanceTo(start);
  console.log(`    100-0: ${d.toFixed(1)} m`);
  assert.ok(d > 30 && d < 50);
});

test('mustang without assists does big burnouts', () => {
  const car = newCar();
  car.assists = false;
  run(car, 1, idle);
  let peak = 0;
  run(car, 1.5, { ...idle, throttle: 1 }, (c) => { peak = Math.max(peak, c.wheels[2].slipRatio); });
  assert.ok(peak > 0.5, `peak rear slip ${peak}`);
});

test('mustang laps the ring', () => {
  const car = newCar(track);
  const pose = nearestTrackPose(TRACK.centerRadius, 0);
  car.reset(new Vector3(pose.x, 0, pose.z), pose.yaw);
  run(car, 40, (c) => {
    const p = c.body.position;
    const radial = new Vector3(p.x, 0, p.z).normalize();
    const err = Math.hypot(p.x, p.z) - TRACK.centerRadius;
    const steer = Math.max(-1, Math.min(1, err * 0.12 + c.body.velocity.dot(radial) * 0.3 + 0.25));
    return { ...idle, steer, throttle: Math.max(0, Math.min(1, (115 - kmh(c)) * 0.08)) };
  });
  assert.ok(car.body.position.y > 0 && kmh(car) > 90, `y ${car.body.position.y} kmh ${kmh(car)}`);
});

test('mustang with assists survives full lock and braking mid-corner', () => {
  for (const [target, lock] of [[100, 1], [150, 1]]) {
    const car = newCar();
    const hold = (c) => Math.max(0, Math.min(1, (target - kmh(c)) * 0.08));
    run(car, 20, (c) => ({ ...idle, throttle: hold(c) }));
    let s = 0;
    let peak = 0;
    run(car, 3, (c) => { s = Math.min(lock, s + CAR.steering.rate * DT); return { ...idle, throttle: hold(c), steer: s }; },
      (c) => { peak = Math.max(peak, Math.abs(c.slipAngle)); });
    let b = 0;
    run(car, 2.5, () => { b = Math.min(1, b + 10 * DT); return { ...idle, brake: b, steer: lock }; },
      (c) => { if (c.speed > 3) peak = Math.max(peak, Math.abs(c.slipAngle)); });
    console.log(`    ${target} km/h: peak slide ${(peak * 57.3).toFixed(0)} deg`);
    assert.ok(peak < 0.25, `spun: ${peak}`);
  }
});
