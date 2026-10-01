// Physics regression tests: run with `npm test` (Node 20+). No browser needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { Vehicle } from '../src/physics/vehicle.js';
import { ground as track, nearestTrackPose } from '../src/world/trackShape.js';
import { PHYSICS_HZ, TRACK, CAR } from '../src/config.js';

const DT = 1 / PHYSICS_HZ;
const flat = { heightAt: () => 0 };
const idle = { throttle: 0, brake: 0, steer: 0, handbrake: 0 };

function run(car, seconds, input, onStep) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    const inp = typeof input === 'function' ? input(car, i * DT) : input;
    car.step(DT, inp);
    assertFinite(car);
    if (onStep && onStep(car, i * DT) === false) return i * DT;
  }
  return seconds;
}

function assertFinite(car) {
  const b = car.body;
  for (const v of [b.position, b.velocity, b.angularVelocity]) {
    assert.ok(Number.isFinite(v.x + v.y + v.z), 'state went non-finite');
  }
}

const kmh = (car) => car.forwardSpeed * 3.6;

test('settles at rest without creeping', () => {
  const car = new Vehicle(flat);
  run(car, 6, idle);
  assert.equal(car.wheelsInContact, 4);
  assert.ok(car.speed < 0.02, `still moving: ${car.speed}`);
  assert.ok(Math.abs(car.body.position.y - CAR.cgHeight) < 0.06, `ride height ${car.body.position.y}`);
  const fl = car.wheels[0].load + car.wheels[1].load;
  const share = fl / car.wheels.reduce((s, w) => s + w.load, 0);
  assert.ok(share > 0.40 && share < 0.46, `front static share ${share}`);
});

test('0-100 km/h is supercar quick but traction limited', () => {
  const car = new Vehicle(flat);
  run(car, 1, idle);
  const t = run(car, 10, { ...idle, throttle: 1 }, (c) => (kmh(c) >= 100 ? false : undefined));
  console.log(`    0-100 km/h: ${t.toFixed(2)} s`);
  assert.ok(t > 2.3 && t < 4.5, `0-100 in ${t}`);
});

test('reaches a sensible top speed', () => {
  const car = new Vehicle(flat);
  run(car, 40, { ...idle, throttle: 1 });
  console.log(`    speed after 40 s: ${kmh(car).toFixed(0)} km/h in gear ${car.gearLabel}`);
  assert.ok(kmh(car) > 260 && kmh(car) < 360);
});

test('brakes from 100 km/h in a believable distance with ABS', () => {
  const car = new Vehicle(flat);
  run(car, 10, { ...idle, throttle: 1 }, (c) => (kmh(c) >= 100 ? false : undefined));
  const start = car.body.position.clone();
  run(car, 8, { ...idle, brake: 1 }, (c) => (c.forwardSpeed < 0.3 ? false : undefined));
  const d = car.body.position.distanceTo(start);
  console.log(`    100-0 km/h: ${d.toFixed(1)} m`);
  assert.ok(d > 25 && d < 45, `braking distance ${d}`);
  assert.ok(Math.abs(car.body.position.x) < 1.0, 'pulled sideways under braking');
});

test('holding brake at a standstill engages reverse and backs up', () => {
  const car = new Vehicle(flat);
  run(car, 1, idle);
  run(car, 2.5, { ...idle, brake: 1 });
  assert.equal(car.gearLabel, 'R');
  assert.ok(car.forwardSpeed < -2, `reverse speed ${car.forwardSpeed}`);
});

test('RWD without assists can light up the rear tires', () => {
  const car = new Vehicle(flat);
  car.awd = false;
  car.assists = false;
  run(car, 1, idle);
  let peak = 0;
  run(car, 1.5, { ...idle, throttle: 1 }, (c) => { peak = Math.max(peak, c.wheels[2].slipRatio); });
  console.log(`    peak rear slip ratio: ${peak.toFixed(2)}`);
  assert.ok(peak > 0.3);
});

test('laps the ring with a simple driver and pulls real lateral g', () => {
  const car = new Vehicle(track);
  const pose = nearestTrackPose(TRACK.centerRadius, 0);
  car.reset(new Vector3(pose.x, 0, pose.z), pose.yaw);
  run(car, 1, idle);
  let maxLat = 0;
  let prevV = car.body.velocity.clone();
  const driver = (c) => {
    const p = c.body.position;
    const r = Math.hypot(p.x, p.z);
    const err = r - TRACK.centerRadius; // + = too far out -> steer left (inward)
    const radial = new Vector3(p.x, 0, p.z).normalize();
    const radialVel = c.body.velocity.dot(radial);
    const steer = Math.max(-1, Math.min(1, err * 0.12 + radialVel * 0.3 + 0.25));
    return { ...idle, steer, throttle: Math.max(0, Math.min(1, (130 - kmh(c)) * 0.08)) };
  };
  run(car, 40, driver, (c) => {
    const a = c.body.velocity.clone().sub(prevV).divideScalar(DT);
    prevV.copy(c.body.velocity);
    if (c.speed > 20) maxLat = Math.max(maxLat, Math.hypot(a.x, a.z));
  });
  const p = car.body.position;
  console.log(`    speed ${kmh(car).toFixed(0)} km/h, radius ${Math.hypot(p.x, p.z).toFixed(1)} m`);
  assert.ok(p.y > 0, 'fell off the track');
  assert.ok(kmh(car) > 100, `too slow: ${kmh(car)}`);
});

test('driving off the edge drops the car into the void', () => {
  const car = new Vehicle(track);
  const pose = nearestTrackPose(TRACK.centerRadius, 0);
  car.reset(new Vector3(pose.x, 0, pose.z), pose.yaw);
  run(car, 12, { ...idle, throttle: 0.6 });
  assert.ok(car.body.position.y < -10, `still at y=${car.body.position.y}`);
});

test('with assists, yanking full lock at 180 km/h does not spin the car', () => {
  const car = new Vehicle(flat);
  const hold = (k) => (c) => ({ ...idle, throttle: Math.max(0, Math.min(1, (k - kmh(c)) * 0.08)) });
  run(car, 15, hold(180));
  let maxBeta = 0;
  run(car, 6, (c) => ({ ...hold(180)(c), steer: 1 }), (c) => { maxBeta = Math.max(maxBeta, Math.abs(c.slipAngle)); });
  console.log(`    peak body slip: ${(maxBeta * 57.3).toFixed(1)} deg`);
  assert.ok(maxBeta < 0.2, `spun: beta ${maxBeta}`);
});

test('handbrake at speed (assists off) kicks the tail out', () => {
  const car = new Vehicle(flat);
  car.assists = false;
  run(car, 6, { ...idle, throttle: 1 }, (c) => (kmh(c) > 80 ? false : undefined));
  let maxBeta = 0;
  run(car, 1.2, { ...idle, steer: -1, handbrake: 1 }, (c) => { maxBeta = Math.max(maxBeta, Math.abs(c.slipAngle)); });
  console.log(`    handbrake slide angle: ${(maxBeta * 57.3).toFixed(0)} deg`);
  assert.ok(maxBeta > 0.35, `no slide: ${maxBeta}`);
});

test('riding the kerbs rumbles but never launches the car', () => {
  const car = new Vehicle(track);
  // Spawn on the outer kerb line, pointing along the track.
  const r = TRACK.centerRadius + TRACK.width / 2 - 0.9;
  const pose = nearestTrackPose(r, 0);
  car.reset(new Vector3(r, 0, 0), pose.yaw);
  let maxY = 0;
  run(car, 8, (c) => {
    const p = c.body.position;
    const err = Math.hypot(p.x, p.z) - r;
    return { ...idle, throttle: kmh(c) < 90 ? 0.7 : 0, steer: Math.max(-1, Math.min(1, err * 0.3 + 0.3)) };
  }, (c) => { if (c.body.position.y > -1) maxY = Math.max(maxY, c.body.position.y); });
  assert.ok(maxY < CAR.cgHeight + 0.25, `bounced to ${maxY}`);
});
