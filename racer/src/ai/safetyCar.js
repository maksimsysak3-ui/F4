import { Group, Mesh, BoxGeometry, MeshStandardMaterial, Box3, Vector3, Euler } from 'three';
import { Car, CAR } from './sim2d.js?v=1a016bc';
import { CarVisual } from '../car/carVisual.js?v=1a016bc';
import { Vehicle } from '../physics/vehicle.js?v=1a016bc';
import { LAMBO } from '../cars/index.js?v=1a016bc';

/*
 * The Safety Car: a silver sports car with the light bar on its roof (orange lights flashing while it's
 * out, off on its last lap). It waits at the pit exit, leaves the lane timed to come out in front of the
 * leader, then runs round the racing line at Safety Car pace (the field queues behind it); once race
 * control calls it in, it goes into the pit lane at the end of the lap and the race restarts.
 *
 * It moves on rails (its own kinematics, like the cars in the pit lane) and is a body the cars see and
 * follow, and can touch.
 */
const PAINT = { name: 'Safety Car', color: 0xb9bec6 };
let settled = null;
function settledCar(spec) {
  if (settled?.spec === spec) return settled;
  const v = new Vehicle({ heightAt: () => 0 }, spec);
  for (let i = 0; i < 240; i++) v.step(1 / 240, { throttle: 0, brake: 0, steer: 0, handbrake: 1 });
  settled = { spec, offset: v.modelOffset.clone(), y: v.body.position.y, wheels: v.wheels.map((w) => ({ anchor: w.anchor.clone(), suspensionLength: w.suspensionLength, radius: w.radius ?? 0.33 })) };
  return settled;
}
const wrapS = (L, s) => ((s % L.length) + L.length) % L.length;
const dsWrap = (L, a, b) => { let d = b - a; if (d > L.length / 2) d -= L.length; if (d < -L.length / 2) d += L.length; return d; };
const AMBER_ON = 0xff9a10, AMBER_OFF = 0x000000;

export class SafetyCar {
  /** field: the AI field (the track, its racing line, the pit lane, the scene). */
  constructor(field, scale = 1.25) {
    this.field = field; this.L = field.L;
    const spec = LAMBO, S = settledCar(spec);
    this.S = S;
    this.car = new Car(98, { name: 'SC', colour: '#b9bec6', params: CAR });
    this.visual = new CarVisual(spec, PAINT, S.offset);
    const root = this.visual.root;
    root.scale.setScalar(scale);
    // The light bar across the roof.
    const box = new Box3().setFromObject(root), top = box.max.y / scale;
    const bar = new Group(), base = new MeshStandardMaterial({ color: 0x1a1c20, metalness: 0.5, roughness: 0.5 });
    bar.add(new Mesh(new BoxGeometry(0.62, 0.05, 0.14), base));
    this.lamps = [-0.2, 0.2].map((x) => {
      const m = new MeshStandardMaterial({ color: 0x3a2a10, emissive: AMBER_ON, emissiveIntensity: 2.2 });
      const l = new Mesh(new BoxGeometry(0.17, 0.07, 0.1), m); l.position.set(x, 0.05, 0); bar.add(l);
      return m;
    });
    const green = new MeshStandardMaterial({ color: 0x103a10, emissive: 0x20ff40, emissiveIntensity: 0 });
    const g = new Mesh(new BoxGeometry(0.1, 0.06, 0.1), green); g.position.set(0, 0.05, 0); bar.add(g);
    this.green = green;
    bar.position.set(0, top + 0.02, -0.05);
    root.add(bar);
    root.visible = false;
    root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    field.scene.add(root);
    this.adapter = { wheels: S.wheels.map((w) => ({ ...w, anchor: w.anchor, steer: 0, spinAngle: 0 })), steerAngle: 0, brake: 0, throttle: 0, rpm: 0, gearLabel: '1', isShifting: false, body: { velocity: new Vector3(), quaternion: root.quaternion } };
    this.state = 'off'; this.prev = { x: 0, z: 0, h: 0 }; this.K = { s: 0, lat: 0, v: 0 };
    this.flash = 0; this.lightsOn = true;
  }
  get active() { return this.state !== 'off'; }
  /** The body the cars see (on the track only). */
  get obstacle() { return this.state === 'track' || this.state === 'toPit' ? this.car : null; }

  /** Deployed: to the end of the pit lane, waiting to be released in front of the leader. */
  deploy() {
    const f = this.field, p = f.pit;
    if (!p || this.active) return;
    const len = p.s1 - p.s0;
    this.K = { s: p.s0 + Math.max(0, len - p.taper - 25), lat: 0, v: 0 };
    this.K.lat = f.laneLat(this.K.s);
    this.state = 'wait'; this.lightsOn = true; this.waitT = 0;
    this.place();
    this.prev = { x: this.car.x, z: this.car.z, h: this.car.h };
    this.visual.root.visible = true;
  }
  /** Race control: in this lap (the lights go off; into the pits at the end of the lap). */
  callIn() { if (this.state === 'track') this.state = 'toPit'; this.lightsOn = false; }
  hide() { this.state = 'off'; this.visual.root.visible = false; }

  /** One physics step. leader: the race leader's car (sim2d) or null; rc: race control. */
  step(dt, leader, rc) {
    if (!this.active) return;
    const f = this.field, L = this.L, p = f.pit, K = this.K;
    this.prev = { x: this.car.x, z: this.car.z, h: this.car.h };
    this.flash += dt;
    const lane = f.laneU(K.s), len = p.s1 - p.s0;
    if (this.state === 'wait') {
      // Out when the leader is far enough before the pit exit for the SC to come out in front of it.
      this.waitT += dt;
      const toExit = leader ? dsWrap(L, leader.s, p.s1) : 0;
      if (!leader || (toExit > 380 && toExit < 1100) || this.waitT > 150) this.state = 'lane';
      K.v = 0;
    } else if (this.state === 'lane') {
      K.v += Math.min(7 * dt, p.speedLimit * 1.6 - K.v);
      const exitIn = len - p.taper;
      let latT = f.laneLat(K.s);
      if (lane > exitIn) { const k = Math.min(1, (lane - exitIn) / p.taper); latT = latT * (1 - k) + this.lineLat(K.s) * k; }
      K.lat += (latT - K.lat) * Math.min(1, dt * 1.6);
      K.s += K.v * dt;
      if (lane >= len - 0.5) { this.state = 'track'; K.s = wrapS(L, K.s); }
    } else if (this.state === 'track' || this.state === 'toPit') {
      const i = Math.floor(wrapS(L, K.s) / L.ds) % L.N;
      let vT = Math.min(f.plan.vLine[i] * 0.62, 46);
      // Waiting for the field: easing off while the leader is far behind (the queue forms).
      const gap = leader ? dsWrap(L, leader.s, K.s) : 0;
      if (leader && gap > 260 && this.state === 'track') vT *= 0.85;
      if (leader && gap > 0 && gap < 160) rc.scQueued = true;
      let latT = this.lineLat(K.s);
      if (this.state === 'toPit') {
        const toEntry = dsWrap(L, K.s, p.s0);
        if (toEntry > 0 && toEntry < 300) { latT = f.sg * (L.halfW - 1.3); vT = Math.min(vT, toEntry < 140 ? 30 : 40); }
        if (toEntry > -3 && toEntry <= 6) { this.state = 'in'; K.s = p.s0 + 0.01; rc.scIntoPits(); }
      }
      K.v += Math.max(-10 * dt, Math.min(5 * dt, vT - K.v));
      K.lat += (latT - K.lat) * Math.min(1, dt * 1.2);
      K.s = wrapS(L, K.s + K.v * dt);
    } else if (this.state === 'in') {
      K.v += Math.max(-8 * dt, Math.min(4 * dt, p.speedLimit - K.v));
      K.lat += (f.laneLat(K.s) - K.lat) * Math.min(1, dt * 1.6);
      K.s += K.v * dt;
      if (lane > Math.min(len * 0.5, 160)) this.hide();
    }
    this.place();
    // Lights: orange, flashing, while it's out; off on its way in.
    const on = this.lightsOn && Math.floor(this.flash * 4) % 2 === 0;
    this.lamps[0].emissive.setHex(on ? AMBER_ON : AMBER_OFF);
    this.lamps[1].emissive.setHex(this.lightsOn && !on ? AMBER_ON : AMBER_OFF);
  }
  lineLat(s) { const f = this.field, i = Math.floor(wrapS(this.L, s) / this.L.ds) % this.L.N; return f.plan.line[i]; }
  place() {
    const L = this.L, K = this.K, q = L.poseAt(K.s, K.lat), i = Math.floor(wrapS(L, K.s) / L.ds) % L.N;
    Object.assign(this.car, { x: q.x, z: q.z, h: Math.atan2(L.tz[i], L.tx[i]), u: K.v, vlat: 0, r: 0, s: wrapS(L, K.s), lateral: K.lat, progress: wrapS(L, K.s) });
  }

  /** Pose it on the 3D track (interpolated between physics steps, alpha 0..1). */
  draw(dt, alpha) {
    if (!this.active) return;
    const ground = this.field.track.ground, me = this.car, a = this.prev;
    let dh = me.h - a.h; if (dh > Math.PI) dh -= 2 * Math.PI; if (dh < -Math.PI) dh += 2 * Math.PI;
    const x = a.x + (me.x - a.x) * alpha, z = a.z + (me.z - a.z) * alpha, h = a.h + dh * alpha;
    const fx = Math.cos(h), fz = Math.sin(h);
    ground.hint?.(null);
    const y = ground.heightAt(x, z) ?? 0;
    const yf = ground.heightAt(x + fx * 1.6, z + fz * 1.6) ?? y, yb = ground.heightAt(x - fx * 1.6, z - fz * 1.6) ?? y;
    const root = this.visual.root;
    root.position.set(x, (y + yf + yb) / 3 + this.S.y, z);
    _e.set(-Math.atan2(yf - yb, 3.2), Math.PI / 2 - h, 0, 'YXZ');
    root.quaternion.setFromEuler(_e);
    const ad = this.adapter;
    ad.wheels.forEach((w) => { w.spinAngle += (me.u * dt) / 0.3; w.steer = 0; });
    ad.body.velocity.set(fx * me.u, 0, fz * me.u);
    ad.brake = 0; ad.throttle = 0.3;
    this.visual.update(ad, dt);
  }
  dispose() { this.field.scene.remove(this.visual.root); this.visual.dispose?.(); }
}
const _e = new Euler();
