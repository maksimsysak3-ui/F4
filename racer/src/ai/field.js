import { Vector3, Quaternion, Euler } from 'three';
import { Car, CAR, stepCar, collide, slipstream, locate, markSplit, lockAt } from './sim2d.js';
import { planTrack, AIDriver } from './driver.js';
import { CarVisual } from '../car/carVisual.js';
import { Vehicle } from '../physics/vehicle.js';

/*
 * The other cars in a session. Each AI drives on the circuit's 2D model (the same physics and
 * racecraft as the AI sim: its own line, the limit of its car, slipstream, dirty air, mistakes) and is
 * drawn in 3D in its team's livery, posed on the real track surface. The player's car takes part as
 * a body the AIs see, race and can touch.
 *
 * Each car lives through the session like a driver would:
 *   garage   in its team's garage, waiting for its next run
 *   pitOut   rolling down the pit lane at the limit and out onto the circuit
 *   track    out lap, then what the run calls for: push laps, cool-down laps, an in lap
 *   pitIn    in the lane, down to the limit, stopped in its box, pushed back into the garage
 * Runs come from the session (practice: longer runs at race-ish pace; qualifying: an out lap, a flying
 * lap at the limit, a cool-down, perhaps another). A car on a slow lap gets out of the way of one on a
 * flying lap, and on an out lap in qualifying it looks for space.
 */
const DT = 1 / 120;
const SECTORS = 3;
const plans = new Map();
/** The racing line and speed plan for a circuit (worked out once per circuit). */
export function planFor(track) {
  if (!plans.has(track.id)) plans.set(track.id, planTrack(track.layout));
  return plans.get(track.id);
}
const wrapS = (L, s) => ((s % L.length) + L.length) % L.length;
const dsWrap = (L, a, b) => { let d = b - a; if (d > L.length / 2) d -= L.length; if (d < -L.length / 2) d += L.length; return d; };
const PACE = { out: 0.8, push: 1, cool: 0.76, in: 0.8, long: 0.985 };

let settled = null;
/** The F1 car settled on its suspension (wheel positions and ride height for the AI cars' visuals). */
function settledCar(spec) {
  if (settled?.spec === spec) return settled;
  const v = new Vehicle({ heightAt: () => 0 }, spec);
  for (let i = 0; i < 240; i++) v.step(1 / 240, { throttle: 0, brake: 0, steer: 0, handbrake: 1 });
  settled = { spec, offset: v.modelOffset.clone(), y: v.body.position.y, wheels: v.wheels.map((w) => ({ anchor: w.anchor.clone(), suspensionLength: w.suspensionLength, radius: w.radius ?? 0.33 })) };
  return settled;
}

export class Field {
  /**
   * track: the circuit; scene: where the cars are drawn; spec: the car (the F1 spec); entries: the AI
   * drivers (game/grid.js), each with `paint` (index in spec.paints); boxes: team id -> pit box s.
   */
  constructor({ track, scene, spec, entries, boxes }) {
    this.track = track; this.L = track.layout; this.scene = scene; this.spec = spec;
    this.plan = planFor(track);
    this.time = 0; this.acc = 0;
    this.weatherGrip = 1;
    const S = settledCar(spec), L = this.L, pit = L.pit;
    this.pit = pit;
    this.sg = pit?.side === 'L' ? 1 : -1;
    this.cars = entries.map((e, k) => {
      const car = new Car(k, { x: 0, z: 0, heading: 0, name: e.code, colour: e.colour, params: CAR });
      const driver = new AIDriver(this.plan, { pace: e.pace, skill: e.skill, aggression: e.aggression, humanity: e.humanity, name: e.code, seed: 1000 + k * 7919 });
      const visual = new CarVisual(spec, spec.paints[e.paint] ?? spec.paints[0], S.offset);
      visual.root.visible = false;
      visual.root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
      scene.add(visual.root);
      const adapter = { wheels: S.wheels.map((w) => ({ ...w, anchor: w.anchor, steer: 0, spinAngle: 0 })), steerAngle: 0, brake: 0, throttle: 0, rpm: 0, gearLabel: '1', isShifting: false, body: { velocity: new Vector3(), quaternion: visual.root.quaternion } };
      return {
        entry: e, car, driver, visual, adapter, k,
        state: 'garage', box: boxes?.[e.team.id]?.[e.seat] ?? 0, nextRunAt: Infinity, run: null,
        lapType: null, lapStart: 0, secStart: 0, sectors: [null, null, null], laps: [], best: null, bestSectors: [null, null, null],
        compound: 'M', tyreLaps: 0, kin: { s: 0, lat: 0, v: 0 }, prev: { x: 0, z: 0, h: 0 }, lastS: 0, done: false,
      };
    });
    this.lineFrac = [1 / 3, 2 / 3];
    this.onLap = null; // (aiCar, lapTime, sectors, isBest)
    this.onSector = null;
  }

  dispose() { for (const a of this.cars) { this.scene.remove(a.visual.root); a.visual.dispose(); } }

  // ------------------------------------------------------------------------------- the pit lane
  /** The lane's centre line (lateral, signed) at s; in the tapers it runs out to meet the track. */
  laneLat(s) {
    const L = this.L, p = this.pit, i = Math.floor(wrapS(L, s) / L.ds) % L.N;
    return this.sg * (L.wall[p.side][i] + 0.62 + Math.max(1.2, p.widthAt(wrapS(L, s))) / 2);
  }
  /** Distance along the lane from its start to s (unwrapped, for driving down it). */
  laneU(s) { return wrapS(this.L, s - this.pit.s0); }

  /** Send a car out: it leaves its garage now and runs the given program (lap types after the out lap). */
  sendOut(a, run) {
    if (!this.pit) return;
    a.run = run; a.state = 'pitOut';
    a.kin = { s: this.pit.s0 + this.laneU(a.box), lat: this.laneLat(a.box) + this.sg * 1.6, v: 0 };
    a.visual.root.visible = true;
    a.compound = run.compound ?? a.compound;
  }
  /** Bring a car in at the end of its current lap. */
  callIn(a) { if (a.state === 'track' && a.lapType !== 'in') a.run = { laps: [], pace: a.run?.pace ?? 1 }; }

  // ---------------------------------------------------------------------------------- stepping
  /**
   * Advance the field by dt. player: { car (a sim2d Car proxy built from the player's vehicle), onTrack }
   * or null. Returns the proxy's velocity change from any contact (to apply to the player's car).
   */
  update(dt, player = null, weather = null) {
    this.acc += Math.min(dt, 0.25);
    let hit = null;
    if (weather) this.weatherGrip = 1 - weather.wetness * 0.3;
    while (this.acc >= DT) {
      this.acc -= DT;
      this.time += DT;
      const h = this.step(DT, player);
      if (h) hit = h;
    }
    return hit;
  }

  step(dt, player) {
    const L = this.L, t = this.time;
    const onTrack = this.cars.filter((a) => a.state === 'track');
    const cars = onTrack.map((a) => a.car);
    if (player?.onTrack) cars.push(player.car);
    for (const a of onTrack) { a.prev.x = a.car.x; a.prev.z = a.car.z; a.prev.h = a.car.h; locate(L, a.car); }
    if (player?.onTrack) locate(L, player.car);
    slipstream(L, cars);
    for (const a of onTrack) {
      this.direct(a, onTrack, player);
      a.car.weatherGrip = this.weatherGrip;
      const o = a.driver.drive(a.car, cars.filter((c) => c !== a.car), dt, t);
      a.car.steer = o.steer; a.car.throttle = o.throttle; a.car.brake = o.brake;
    }
    for (const a of onTrack) stepCar(L, a.car, dt);
    let hit = null;
    if (player?.onTrack) {
      const p = player.car, vx = Math.cos(p.h) * p.u - Math.sin(p.h) * p.vlat, vz = Math.sin(p.h) * p.u + Math.cos(p.h) * p.vlat, x0 = p.x, z0 = p.z;
      collide(cars);
      const vx1 = Math.cos(p.h) * p.u - Math.sin(p.h) * p.vlat, vz1 = Math.sin(p.h) * p.u + Math.cos(p.h) * p.vlat;
      if (Math.abs(vx1 - vx) + Math.abs(vz1 - vz) + Math.abs(p.x - x0) + Math.abs(p.z - z0) > 1e-4) hit = { dvx: vx1 - vx, dvz: vz1 - vz, dx: p.x - x0, dz: p.z - z0 };
    } else collide(cars);
    for (const a of onTrack) { markSplit(a.car, t); this.timing(a); }
    if (player?.onTrack) markSplit(player.car, t);
    for (const a of this.cars) if (a.state === 'pitOut' || a.state === 'pitIn') this.lane(a, dt);
    return hit;
  }

  /** The program for this lap: pace, getting out of the way, finding space, heading for the pits. */
  direct(a, onTrack, player) {
    const L = this.L, me = a.car, d = a.driver, i = Math.floor(wrapS(L, me.s) / L.ds) % L.N;
    const slow = a.lapType === 'out' || a.lapType === 'cool' || a.lapType === 'in';
    let want = (PACE[a.lapType] ?? 1) * (a.lapType === 'push' ? (a.run?.pace ?? 1) : 1) * this.tyrePace(a);
    d.offset = 0;
    if (!slow) me.yieldSide = 0;
    if (slow) {
      // A car behind on a flying lap: move off the line on a straight and stay there until it has gone
      // by (never cut back across it), lifting a little; in a corner, just keep going at a steady pace.
      const others = onTrack.filter((o) => o !== a && o.lapType === 'push').map((o) => o.car);
      if (player?.onTrack && player.pushing) others.push(player.car);
      const chaser = others.find((o) => { const g = dsWrap(L, o.s, me.s); return g > -12 && g < 220 && o.u > me.u - 2; });
      const straight = Math.abs(this.plan.kLine[i]) < 1 / 260;
      if (chaser && (straight || a.aside)) {
        a.aside ??= (chaser.lateral > me.lateral + 0.5 ? -1 : chaser.lateral < me.lateral - 0.5 ? 1 : this.plan.line[i] >= 0 ? -1 : 1) * (L.halfW - 1.5); // away from where it's coming
        d.offset = a.aside;
        me.yieldSide = Math.sign(a.aside);
        if (straight) want *= 0.88;
      } else if (!chaser) { a.aside = null; me.yieldSide = 0; }
      // Out lap in qualifying: find a gap (back off if a car on its own out lap is just ahead).
      if (a.lapType === 'out' && a.run?.space) {
        const near = onTrack.find((o) => o !== a && o.lapType !== 'push' && dsWrap(L, me.s, o.car.s) > 0 && dsWrap(L, me.s, o.car.s) < 180);
        if (near) want *= 0.84;
      }
    }
    // Just out of the pits: stay on the pit side of the exit line for the first couple of hundred metres
    // (never cut straight across the track into cars on a flying lap).
    if (a.lapType === 'out' && this.pit) {
      const since = dsWrap(L, this.pit.s1, me.s);
      if (since > -5 && since < 260) { d.offset = this.sg * (L.halfW - 1.4); want = Math.min(want, 0.85); }
    }
    // In lap: over to the pit side well before the entry.
    if (a.lapType === 'in' && this.pit) {
      const toEntry = dsWrap(L, me.s, this.pit.s0);
      if (toEntry > 0 && toEntry < 320) { d.offset = this.sg * (L.halfW - 1.3); want = Math.min(want, toEntry < 140 ? 0.55 : 0.75); }
      if (toEntry > -4 && toEntry <= 12) this.enterLane(a);
    }
    // Change pace gradually (a driver eases off over a few seconds, never brake-tests the car behind).
    const cur = d.paceMul ?? want;
    d.paceMul = cur + Math.max(-0.06 * DT, Math.min(0.12 * DT, want - cur));
  }

  /** Grip on the current tyres for the track's state (slicks on a wet track are hopeless). */
  tyrePace(a) {
    const w = 1 - (this.weatherGrip - 0.7) / 0.3; // wetness 0..1
    const c = a.compound;
    const base = c === 'S' ? 1 : c === 'M' ? 0.9975 : c === 'H' ? 0.995 : c === 'I' ? 0.975 : 0.955;
    const wetFit = c === 'W' ? 1 - Math.max(0, 0.45 - w) * 0.12 : c === 'I' ? 1 - Math.abs(w - 0.45) * 0.08 : 1 - w * 0.12;
    return base * wetFit * (1 - Math.min(0.01, a.tyreLaps * 0.0009));
  }

  /** Timing on track: sectors and laps, and what the next lap is (from the run program). */
  timing(a) {
    const L = this.L, s = a.car.s, prev = a.lastS;
    a.lastS = s;
    const t = this.time;
    const crossed = (f) => { const b = f * L.length; return prev < b && s >= b && s - prev < L.length / 2; };
    for (let k = 0; k < SECTORS - 1; k++) if (crossed(this.lineFrac[k]) && a.lapType && a.lapType !== 'out') {
      a.sectors[k] = t - a.secStart; a.secStart = t;
      this.onSector?.(a, k, a.sectors[k]);
    }
    if (prev > L.length * 0.75 && s < L.length * 0.25) {
      // Across the line.
      if (a.lapType && a.lapType !== 'out') {
        const lap = t - a.lapStart;
        a.sectors[2] = t - a.secStart;
        const timed = a.lapType === 'push';
        const rec = { time: lap, sectors: a.sectors.slice(), type: a.lapType, compound: a.compound, valid: true, at: t };
        a.laps.push(rec);
        a.tyreLaps++;
        if (timed && (a.best === null || lap < a.best)) a.best = lap;
        if (timed) a.sectors.forEach((x, k) => { if (x != null && (a.bestSectors[k] == null || x < a.bestSectors[k])) a.bestSectors[k] = x; });
        this.onLap?.(a, rec);
      }
      a.lapStart = t; a.secStart = t; a.sectors = [null, null, null];
      a.lapType = a.run?.laps?.length ? a.run.laps.shift() : 'in';
      if (a.forceIn) { a.lapType = 'in'; a.forceIn = false; }
    }
  }

  /** From the track into the pit lane: down the lane on rails (the limiter does the driving). */
  enterLane(a) {
    const me = a.car;
    a.state = 'pitIn';
    a.kin = { s: this.pit.s0 + 0.01, lat: me.lateral, v: me.u };
    a.lapType = null;
  }

  lane(a, dt) {
    const L = this.L, p = this.pit, K = a.kin, limit = p.speedLimit;
    const u = this.laneU(K.s), boxU = this.laneU(a.box), len = p.s1 - p.s0;
    let latT = this.laneLat(K.s);
    if (a.state === 'pitIn') {
      const toBox = boxU - u;
      let vT = limit;
      if (toBox < 40) vT = Math.max(0, Math.sqrt(Math.max(0, 2 * 5 * (toBox - 1))));
      if (toBox < 25) latT += this.sg * 1.6 * (1 - toBox / 25);
      K.v += Math.max(-12 * dt, Math.min(6 * dt, vT - K.v));
      if (toBox <= 1.2 && K.v < 0.5) {   // stopped in the box: into the garage
        a.state = 'garage'; a.visual.root.visible = false; a.tyreLaps = a.compoundSwap ? 0 : a.tyreLaps;
        a.nextRunAt = Infinity; this.onGarage?.(a);
        return;
      }
    } else {
      // Out of the box, down the lane, out of the exit taper onto the track.
      K.v += Math.max(-8 * dt, Math.min(4 * dt, limit - K.v));
      const exitIn = len - p.taper;
      if (u > exitIn) { const f = Math.min(1, (u - exitIn) / p.taper); latT = latT * (1 - f) + this.sg * (L.halfW - 1.4) * f; K.v = Math.max(K.v, limit); K.v += 6 * dt * f; }
      if (u >= len - 0.5) {
        // Hand over to the driver: on the track, at speed, its out lap begins.
        const q = L.poseAt(K.s, K.lat), i = Math.floor(wrapS(L, K.s) / L.ds) % L.N;
        const me = a.car;
        Object.assign(me, { x: q.x, z: q.z, h: Math.atan2(L.tz[i], L.tx[i]), u: K.v, vlat: 0, r: 0, steer: 0, splits: null, _prevS: undefined });
        me.progress = wrapS(L, K.s); me.s = me.progress;
        a.prev.x = me.x; a.prev.z = me.z; a.prev.h = me.h;
        a.state = 'track'; a.lapType = 'out'; a.lastS = wrapS(L, K.s);
        return;
      }
    }
    K.lat += (latT - K.lat) * Math.min(1, dt * 1.6);
    K.s += K.v * dt;
    const q = L.poseAt(K.s, K.lat), i = Math.floor(wrapS(L, K.s) / L.ds) % L.N;
    const me = a.car;
    a.prev.x = me.x; a.prev.z = me.z; a.prev.h = me.h;
    me.x = q.x; me.z = q.z; me.h = Math.atan2(L.tz[i], L.tx[i]); me.u = K.v; me.steer = 0; me.brake = 0;
  }

  // ---------------------------------------------------------------------------------- drawing
  /** Pose every car on the 3D track (interpolated between physics steps); hide the ones far away. */
  draw(dt, camera) {
    const L = this.L, ground = this.track.ground, alpha = this.acc / DT, cam = camera.position;
    let shadows = 0;
    const order = this.cars.filter((a) => a.state !== 'garage').map((a) => ({ a, d: (a.car.x - cam.x) ** 2 + (a.car.z - cam.z) ** 2 })).sort((p, q) => p.d - q.d);
    for (const a of this.cars) if (a.state === 'garage') a.visual.root.visible = false;
    for (const { a, d } of order) {
      const v = a.visual, me = a.car;
      v.root.visible = d < 900 * 900;
      if (!v.root.visible) continue;
      let dh = me.h - a.prev.h; if (dh > Math.PI) dh -= 2 * Math.PI; if (dh < -Math.PI) dh += 2 * Math.PI;
      const x = a.prev.x + (me.x - a.prev.x) * alpha, z = a.prev.z + (me.z - a.prev.z) * alpha, h = a.prev.h + dh * alpha;
      const fx = Math.cos(h), fz = Math.sin(h);
      ground.hint?.(null);
      const y = ground.heightAt(x, z) ?? 0;
      const yf = ground.heightAt(x + fx * 1.8, z + fz * 1.8) ?? y, yb = ground.heightAt(x - fx * 1.8, z - fz * 1.8) ?? y;
      const yl = ground.heightAt(x - fz * 0.8, z + fx * 0.8) ?? y, yr = ground.heightAt(x + fz * 0.8, z - fx * 0.8) ?? y;
      v.root.position.set(x, (y + yf + yb) / 3 + settled.y, z);
      _e.set(-Math.atan2(yf - yb, 3.6), Math.PI / 2 - h, Math.atan2(yl - yr, 1.6), 'YXZ');
      v.root.quaternion.setFromEuler(_e);
      // Wheels, steering, brake lights.
      const ad = a.adapter, r = 0.33;
      ad.steerAngle = me.steer * lockAt(me.p, me.u);
      ad.brake = me.brake; ad.throttle = me.throttle;
      ad.wheels.forEach((w, k) => { w.spinAngle += (me.u * dt) / r; w.steer = k < 2 ? ad.steerAngle : 0; });
      ad.body.velocity.set(fx * me.u, 0, fz * me.u);
      v.update(ad, dt);
      const cast = shadows < 6 && d < 120 * 120;
      if (cast !== a.cast) { a.cast = cast; v.root.traverse((o) => { if (o.isMesh) o.castShadow = cast; }); }
      if (cast) shadows++;
    }
  }

  /** The nearest AI car's distance (m) to a point, for the audio (null if none on track). */
  nearest(x, z) {
    let best = null;
    for (const a of this.cars) if (a.state === 'track') { const d = Math.hypot(a.car.x - x, a.car.z - z); if (!best || d < best.d) best = { d, a }; }
    return best;
  }
}
const _e = new Euler();
void Quaternion;
