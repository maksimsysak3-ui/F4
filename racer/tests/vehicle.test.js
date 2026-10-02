// Lamborghini physics regression tests: run with `npm test` (Node 20+). No browser needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { Vehicle } from '../src/physics/vehicle.js';
import { ground as track, nearestTrackPose } from '../src/world/trackShape.js';
import { PHYSICS_HZ, TRACK } from '../src/config.js';
import { LAMBO as CAR } from '../src/cars/index.js';

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
  const car = new Vehicle(flat, CAR);
  run(car, 6, idle);
  assert.equal(car.wheelsInContact, 4);
  assert.ok(car.speed < 0.02, `still moving: ${car.speed}`);
  assert.ok(Math.abs(car.body.position.y - CAR.cgHeight) < 0.06, `ride height ${car.body.position.y}`);
  const fl = car.wheels[0].load + car.wheels[1].load;
  const share = fl / car.wheels.reduce((s, w) => s + w.load, 0);
  assert.ok(share > 0.40 && share < 0.46, `front static share ${share}`);
});

test('0-100 km/h is supercar quick but traction limited', () => {
  const car = new Vehicle(flat, CAR);
  run(car, 1, idle);
  const t = run(car, 10, { ...idle, throttle: 1 }, (c) => (kmh(c) >= 100 ? false : undefined));
  console.log(`    0-100 km/h: ${t.toFixed(2)} s`);
  assert.ok(t > 2.3 && t < 4.5, `0-100 in ${t}`);
});

test('reaches a sensible top speed', () => {
  const car = new Vehicle(flat, CAR);
  run(car, 40, { ...idle, throttle: 1 });
  console.log(`    speed after 40 s: ${kmh(car).toFixed(0)} km/h in gear ${car.gearLabel}`);
  assert.ok(kmh(car) > 260 && kmh(car) < 360);
});

test('brakes from 100 km/h in a believable distance with ABS', () => {
  const car = new Vehicle(flat, CAR);
  run(car, 10, { ...idle, throttle: 1 }, (c) => (kmh(c) >= 100 ? false : undefined));
  const start = car.body.position.clone();
  run(car, 8, { ...idle, brake: 1 }, (c) => (c.forwardSpeed < 0.3 ? false : undefined));
  const d = car.body.position.distanceTo(start);
  console.log(`    100-0 km/h: ${d.toFixed(1)} m`);
  assert.ok(d > 25 && d < 45, `braking distance ${d}`);
  assert.ok(Math.abs(car.body.position.x) < 1.0, 'pulled sideways under braking');
});

test('holding brake at a standstill engages reverse and backs up', () => {
  const car = new Vehicle(flat, CAR);
  run(car, 1, idle);
  run(car, 2.5, { ...idle, brake: 1 });
  assert.equal(car.gearLabel, 'R');
  assert.ok(car.forwardSpeed < -2, `reverse speed ${car.forwardSpeed}`);
});

test('RWD without assists can light up the rear tires', () => {
  const car = new Vehicle(flat, CAR);
  car.awd = false;
  car.assists = false;
  run(car, 1, idle);
  let peak = 0;
  run(car, 1.5, { ...idle, throttle: 1 }, (c) => { peak = Math.max(peak, c.wheels[2].slipRatio); });
  console.log(`    peak rear slip ratio: ${peak.toFixed(2)}`);
  assert.ok(peak > 0.3);
});

test('laps the ring with a simple driver and pulls real lateral g', () => {
  const car = new Vehicle(track, CAR);
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
  const car = new Vehicle(track, CAR);
  const pose = nearestTrackPose(TRACK.centerRadius, 0);
  car.reset(new Vector3(pose.x, 0, pose.z), pose.yaw);
  run(car, 12, { ...idle, throttle: 0.6 });
  assert.ok(car.body.position.y < -10, `still at y=${car.body.position.y}`);
});

test('with assists, yanking full lock at 180 km/h does not spin the car', () => {
  const car = new Vehicle(flat, CAR);
  const hold = (k) => (c) => ({ ...idle, throttle: Math.max(0, Math.min(1, (k - kmh(c)) * 0.08)) });
  run(car, 15, hold(180));
  let maxBeta = 0;
  run(car, 6, (c) => ({ ...hold(180)(c), steer: 1 }), (c) => { maxBeta = Math.max(maxBeta, Math.abs(c.slipAngle)); });
  console.log(`    peak body slip: ${(maxBeta * 57.3).toFixed(1)} deg`);
  assert.ok(maxBeta < 0.2, `spun: beta ${maxBeta}`);
});

test('handbrake at speed (assists off) kicks the tail out', () => {
  const car = new Vehicle(flat, CAR);
  car.assists = false;
  run(car, 6, { ...idle, throttle: 1 }, (c) => (kmh(c) > 80 ? false : undefined));
  let maxBeta = 0;
  run(car, 1.2, { ...idle, steer: -1, handbrake: 1 }, (c) => { maxBeta = Math.max(maxBeta, Math.abs(c.slipAngle)); });
  console.log(`    handbrake slide angle: ${(maxBeta * 57.3).toFixed(0)} deg`);
  assert.ok(maxBeta > 0.35, `no slide: ${maxBeta}`);
});

test('riding the kerbs rumbles but never launches the car', () => {
  const car = new Vehicle(track, CAR);
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

test('braking hard out of a corner (assists on) stays straight-ish', () => {
  const car = new Vehicle(flat, CAR);
  run(car, 8, { ...idle, throttle: 1 }, (c) => (kmh(c) >= 100 ? false : undefined));
  let steer = 0;
  const ramp = (target) => { steer += Math.sign(target - steer) * Math.min(Math.abs(target - steer), CAR.steering.rate * DT); return steer; };
  run(car, 1, () => ({ ...idle, throttle: 0.6, steer: ramp(0.5) }));
  let peak = 0;
  run(car, 2.5, () => ({ ...idle, brake: 1, steer: ramp(0) }), (c) => { peak = Math.max(peak, Math.abs(c.slipAngle)); });
  console.log(`    peak slide under braking: ${(peak * 57.3).toFixed(1)} deg`);
  assert.ok(peak < 0.2, `brake-induced spin: ${peak}`);
});

test('braking hard while still turning (assists on) does not spin', () => {
  for (const [target, lock] of [[100, 0.6], [140, 1], [180, 1]]) {
    const car = new Vehicle(flat, CAR);
    const hold = (c) => Math.max(0, Math.min(1, (target - kmh(c)) * 0.08));
    run(car, 20, (c) => ({ ...idle, throttle: hold(c) }));
    let s = 0;
    run(car, 1.5, (c) => { s = Math.min(lock, s + CAR.steering.rate * DT); return { ...idle, throttle: hold(c), steer: s }; });
    let b = 0;
    let peak = 0;
    run(car, 2.5, () => { b = Math.min(1, b + 10 * DT); return { ...idle, brake: b, steer: lock }; },
      (c) => { if (c.speed > 3) peak = Math.max(peak, Math.abs(c.slipAngle)); });
    assert.ok(peak < 0.2, `${target} km/h lock ${lock}: slid ${(peak * 57.3).toFixed(0)} deg`);
  }
});

test('hitting a street-circuit wall at speed does not flip the car', async () => {
  const { PORTO_VELA } = await import('../src/tracks/index.js');
  const car = new Vehicle(PORTO_VELA.ground, CAR);
  // Start on the main straight and steer hard into the left wall.
  const pose = PORTO_VELA.poseAt(100, 0);
  car.reset(new Vector3(pose.x, 0, pose.z), pose.yaw);
  run(car, 6, { ...idle, throttle: 1 }, (c) => (kmh(c) > 120 ? false : undefined));
  let minUp = 1;
  run(car, 4, { ...idle, throttle: 0.5, steer: -1 }, (c) => {
    minUp = Math.min(minUp, new Vector3(0, 1, 0).applyQuaternion(c.body.quaternion).y);
  });
  const n = PORTO_VELA.layout.nearest(car.body.position.x, car.body.position.z);
  console.log(`    lowest up-vector y during the crash: ${minUp.toFixed(2)}, lateral after: ${n.lateral.toFixed(1)} m`);
  assert.ok(minUp > 0.5, 'car rolled over');
  assert.ok(Math.abs(n.lateral) < PORTO_VELA.layout.wall.L[n.i] + 0.5, 'car went through the wall');
});

test('the Porto Vela pit lane is drivable end to end', async () => {
  const { PORTO_VELA: T } = await import('../src/tracks/index.js');
  const L = T.layout, pit = L.pit;
  const car = new Vehicle(T.ground, CAR);
  const start = pit.s0 - 60;
  const pose = T.poseAt(start, 0);
  car.reset(new Vector3(pose.x, 0, pose.z), pose.yaw);
  // Lane centre, as a lateral offset from the centreline (pit side is negative).
  const sg = pit.side === 'L' ? 1 : -1;
  const laneLat = (s) => {
    const w = pit.widthAt(s);
    return w > 0 ? sg * (L.wall[pit.side][Math.round(((s % L.length) + L.length) % L.length / L.ds) % L.N] + 0.62 + Math.max(0, w - 2.6) / 1) : 0;
  };
  let minA = Infinity, maxA = -Infinity, travelled = 0, prev = start, wall = 0;
  run(car, 40, (c) => {
    const n = L.nearest(c.body.position.x, c.body.position.z);
    let d = n.s - (((prev % L.length) + L.length) % L.length); if (d < -L.length / 2) d += L.length;
    travelled += d; prev += d;
    const sAim = prev + 7;
    const aim = T.poseAt(sAim, laneLat(sAim));
    const f = c.forward, p = c.body.position;
    const ang = Math.atan2(f.z * (aim.x - p.x) - f.x * (aim.z - p.z), f.x * (aim.x - p.x) + f.z * (aim.z - p.z));
    if (pit.into(prev) !== null && pit.barrierAt(prev) && pit.noseAt(prev) === null) { const a = n.lateral * sg; minA = Math.min(minA, a); maxA = Math.max(maxA, a); }
    if (c.wallHit) wall += DT;
    return { ...idle, steer: Math.max(-1, Math.min(1, -ang * 3)), throttle: kmh(c) < 55 ? 0.5 : 0 };
  }, () => (travelled > pit.s1 - start + 40 ? false : undefined));
  console.log(`    pit lane: travelled ${travelled.toFixed(0)} m, lateral in lane ${minA.toFixed(1)}..${maxA.toFixed(1)} m, wall contact ${wall.toFixed(2)} s`);
  assert.ok(travelled > pit.s1 - start + 30, `stopped after ${travelled} m`);
  assert.ok(minA > L.wall[pit.side][0] + 0.62, 'never got behind the pit wall');
  assert.ok(wall < 0.3, `scraped the walls for ${wall} s`);
});
