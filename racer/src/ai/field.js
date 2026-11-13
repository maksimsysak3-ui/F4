import { Vector3, Quaternion, Euler } from 'three';
import { Car, CAR, stepCar, collide, slipstream, locate, markSplit, lockAt } from './sim2d.js';
import { planTrack, AIDriver } from './driver.js';
import { CarVisual } from '../car/carVisual.js';
import { Vehicle } from '../physics/vehicle.js';
import { SafetyCar } from './safetyCar.js';
import { cornersOf } from '../engineerBrain.js';

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
/** Where on the lap drivers run wide (the corners). */
const cornerSpots = (L) => cornersOf(L).map((c) => c.s);
const PACE = { out: 0.9, push: 1, cool: 0.88, in: 0.9, long: 0.985 }; // share of the limit in the corners (out and in laps: tyres and brakes not up to temperature, no risk)

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
    // Car-to-car contact in a race goes to the stewards (who hit whom, how hard, where on the lap).
    this.onHit = (A, B, rel, va, vb) => {
      const rc = this.race?.rc;
      if (!rc) return;
      const ra = this.rowOfCar(A), rb = this.rowOfCar(B);
      if (!ra || !rb) return;
      const L = this.L, i = Math.floor(wrapS(L, A.s ?? 0) / L.ds) % L.N, tx = L.tx[i], tz = L.tz[i], nx = -tz, nz = tx;
      rc.contact(ra, rb, { rel, s: A.s ?? 0, dsAB: (B.x - A.x) * tx + (B.z - A.z) * tz, latAB: (B.x - A.x) * nx + (B.z - A.z) * nz, vnA: va[0] * nx + va[1] * nz, vnB: vb[0] * nx + vb[1] * nz });
    };
    this.onLap = null; // (aiCar, lapTime, sectors, isBest)
    this.onSector = null;
  }

  dispose() { for (const a of this.cars) { this.scene.remove(a.visual.root); a.visual.dispose(); } this.sc?.dispose(); this.sc = null; }

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
    a.car.lap = 1 + a.laps.length; // (a practice run is never the opening lap of a race)
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
    // DRS only when race control has it enabled (never under the Safety Car or the VSC, nor just after).
    const rc = this.race?.rc;
    if (rc && !rc.drsOn) for (const c of cars) c.drs = false;
    // Cars parked on the grid, in a pit box or stopped at the side of the track are obstacles too; so is
    // the Safety Car.
    for (const a of this.cars) if (a.state === 'park' || a.state === 'stop' || a.state === 'out') cars.push(a.car);
    if (this.sc?.active) { this.sc.step(dt, this.leaderCar(player), rc); if (this.sc.obstacle) cars.push(this.sc.obstacle); }
    for (const a of onTrack) {
      if (a.held && (a.startAt == null || t < a.startAt)) { a.car.steer = 0; a.car.throttle = 0; a.car.brake = 1; continue; } // on the grid, waiting
      if (a.held) { a.held = false; a.startAt = null; }
      this.direct(a, onTrack, player);
      a.car.weatherGrip = this.weatherGrip;
      const o = a.driver.drive(a.car, cars.filter((c) => c !== a.car), dt, t);
      a.car.steer = o.steer; a.car.throttle = o.throttle; a.car.brake = o.brake; a.car.note = a.driver.note;
    }
    for (const a of onTrack) { stepCar(L, a.car, dt); if (a.held) { a.car.u = 0; a.car.vlat = 0; a.car.r = 0; } }
    let hit = null;
    if (player?.onTrack) {
      const p = player.car, vx = Math.cos(p.h) * p.u - Math.sin(p.h) * p.vlat, vz = Math.sin(p.h) * p.u + Math.cos(p.h) * p.vlat, x0 = p.x, z0 = p.z;
      collide(cars, this.onHit);
      const vx1 = Math.cos(p.h) * p.u - Math.sin(p.h) * p.vlat, vz1 = Math.sin(p.h) * p.u + Math.cos(p.h) * p.vlat;
      if (Math.abs(vx1 - vx) + Math.abs(vz1 - vz) + Math.abs(p.x - x0) + Math.abs(p.z - z0) > 1e-4) hit = { dvx: vx1 - vx, dvz: vz1 - vz, dx: p.x - x0, dz: p.z - z0 };
    } else collide(cars, this.onHit);
    for (const a of onTrack) { markSplit(a.car, t); if (!this.race) this.timing(a); }
    if (player?.onTrack) markSplit(player.car, t);
    for (const a of this.cars) {
      if (a.state === 'pitOut' || a.state === 'pitIn') this.lane(a, dt);
      else if (a.state === 'park') this.park(a, dt);
      else if (a.state === 'stop') this.stop(a);
      else if (a.state === 'out') this.offRoad(a, dt);
    }
    if (this.race) for (const a of this.cars) this.raceProgress(a, dt);
    return hit;
  }

  /** The program for this lap: pace, getting out of the way, finding space, heading for the pits. */
  direct(a, onTrack, player) {
    const L = this.L, me = a.car, d = a.driver, i = Math.floor(wrapS(L, me.s) / L.ds) % L.N;
    if (this.race && (a.lapType === 'formation' || a.lapType === 'race' || a.lapType === 'cool')) return this.directRace(a, onTrack, player);
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
      a.car.lap = (a.car.lap ?? 1) + 1;
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
    if (a.state === 'pitIn' && a.passThrough) {
      // A drive-through: down the lane at the limit, past the box, out again.
      K.v += Math.max(-12 * dt, Math.min(6 * dt, limit - K.v));
      if (u > boxU + 4) a.state = 'pitOut';
      K.lat += (latT - K.lat) * Math.min(1, dt * 1.6);
      K.s += K.v * dt;
      this.place(a);
      return;
    }
    if (a.state === 'pitIn') {
      const toBox = boxU - u;
      let vT = limit;
      if (toBox < 40) vT = Math.max(0, Math.sqrt(Math.max(0, 2 * 5 * (toBox - 1))));
      if (toBox < 25) latT += this.sg * 1.6 * (1 - toBox / 25);
      K.v += Math.max(-12 * dt, Math.min(6 * dt, vT - K.v));
      if (toBox <= 1.2 && K.v < 0.5 && a.pitStop) {   // a race pit stop: the crew, new tyres, go
        const R = Math.random(), slow = R < 0.04 ? 3 + Math.random() * 6 : 0;   // now and then a sticky wheel nut
        const nose = a.row?.needsNose ? 6.5 : 0;                                  // a new front wing
        if (nose) { a.row.needsNose = false; a.dmg = (a.dmg ?? 0) * 0.3; a.dmgNoted = false; }
        // Time penalties are served first: the crew waits before touching the car.
        const pen = a.row?.penalty ?? 0, rc = this.race?.rc;
        if (pen > 0 && rc) { a.row.penalty = 0; rc.served(a.row, 'time'); }
        a.state = 'stop'; a.stopUntil = this.time + 2.0 + Math.random() * 0.9 + slow + nose + pen; a.stopLen = a.stopUntil - this.time;
        // Now and then the stewards look at a release into another car's path, or a car over the limit.
        if (rc && Math.random() < 0.012) rc.offence(a.row, 'UNSAFE RELEASE', 't5');
        else if (rc && Math.random() < 0.006) rc.offence(a.row, 'PIT LANE SPEEDING', 't5');
        this.onPitStop?.(a, a.stopLen);
        this.place(a);
        return;
      }
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
        a.state = 'track'; a.lapType = this.race && a.row ? (a.row.finished ? 'cool' : 'race') : 'out'; a.lastS = wrapS(L, K.s);
        if (a.passThrough) { a.passThrough = false; a.pitThisLap = false; if (a.row?.driveThrough) this.race.rc?.served(a.row, 'dt'); }
        a.justPitted = !!(this.race && a.row);
        return;
      }
    }
    K.lat += (latT - K.lat) * Math.min(1, dt * 1.6);
    K.s += K.v * dt;
    this.place(a);
  }
  /** Pose a car on rails (pit lane, grid parking) from its kinematic state. */
  place(a) {
    const L = this.L, K = a.kin, q = L.poseAt(K.s, K.lat), i = Math.floor(wrapS(L, K.s) / L.ds) % L.N;
    const me = a.car;
    a.prev.x = me.x; a.prev.z = me.z; a.prev.h = me.h;
    me.x = q.x; me.z = q.z; me.h = Math.atan2(L.tz[i], L.tx[i]); me.u = K.v; me.steer = 0; me.brake = K.v > 0.5 ? 0 : 1;
    me.s = wrapS(L, K.s); me.lateral = K.lat;
  }

  // ------------------------------------------------------------------------------------ races
  /** Every car onto its grid box (race.rows: slotS, slotLat), stationary, on its starting tyres. */
  placeGrid(race) {
    this.race = race;
    const L = this.L;
    for (const a of this.cars) {
      const r = race.rows.find((x) => x.ai === a);
      a.row = r;
      if (!r) { a.state = 'garage'; a.visual.root.visible = false; continue; }
      const q = L.poseAt(r.slotS, r.slotLat), i = Math.floor(r.slotS / L.ds) % L.N, h = Math.atan2(L.tz[i], L.tx[i]);
      Object.assign(a.car, { x: q.x, z: q.z, h, u: 0, vlat: 0, r: 0, steer: 0, throttle: 0, brake: 1, s: r.slotS, progress: r.slotS, lap: 0, splits: null, _prevS: undefined, lateral: r.slotLat });
      a.prev = { x: q.x, z: q.z, h };
      a.state = 'track'; a.lapType = 'grid'; a.held = true; a.startAt = null; a.visual.root.visible = true;
      a.compound = r.tyres.compound; a.raceS = r.slotS; a.formDist = 0; a.pitStop = false; a.pitThisLap = false;
      a.driver.noPass = true; a.driver.paceMul = 0.5; a.driver.offset = 0;
    }
  }
  /** Green flag for the formation lap: off in grid order, a moment apart. */
  formation() {
    for (const a of this.cars) if (a.row) { a.lapType = 'formation'; a.startAt = this.time + 1.2 + (a.row.gridPos - 1) * 0.45; a.formDist = 0; }
  }
  /** Lights out: everyone launches after their own reaction time. */
  raceStart() {
    for (const a of this.cars) if (a.row) {
      const h = a.driver.humanity ?? 0.3;
      a.lapType = 'race'; a.held = true; a.startAt = this.time + 0.17 + h * 0.2 + Math.random() * 0.12 + (Math.random() < h * 0.06 ? 0.4 : 0); // now and then a poor getaway
      a.driver.noPass = false; a.driver.paceMul = 1;
      // Now and then a car moves before the lights go out (the transponder sees it): a false start.
      if (Math.random() < 0.004) this.race.rc?.offence(a.row, 'FALSE START', 't10', { quick: true, note: `CAR ${this.race.rc.num(a.row)} (${a.row.e.code})` });
    }
  }
  /** The car's place in the race (distance, laps, crossing the line), tyre wear on the way. */
  raceProgress(a, dt) {
    const r = a.row, race = this.race, L = this.L;
    if (!r || a.state === 'garage' || a.state === 'out' || r.retired) return;
    const s = a.state === 'track' ? wrapS(L, a.car.s) : wrapS(L, a.kin.s);
    const prev = a.raceS ?? s, crossed = prev > L.length * 0.75 && s < L.length * 0.25;
    let d = s - prev; if (d < -L.length / 2) d += L.length; if (d > L.length / 2) d -= L.length;
    a.raceS = s;
    if (a.lapType === 'formation' && d > 0) a.formDist += d;
    if (!race.running && race.state !== 'done') { if (race.state === 'grid' || race.state === 'parking' || race.state === 'lights' || race.state === 'formation') race.progress(r, s, false); return; }
    if (r.finished && a.lapType === 'race') a.lapType = 'cool';
    a.car.lap = r.laps;
    // Contact damage: a hard enough hit costs pace (a bent wing, a damaged floor), a heavy one means a
    // stop for a new nose, a big one ends the race.
    if (a.car.hitSum) {
      const hit = a.car.hitSum; a.car.hitSum = 0;
      if (hit > 3 && race.running) {
        a.dmg = Math.min(1, (a.dmg ?? 0) + ((hit - 3) / 20) ** 1.6);
        if (a.dmg > 0.9 && !r.finished) { r.retired = true; r.status = 'DNF'; race.feed(`${r.e.code} out of the race (damage)`, 'out'); this.retireOnTrack(a, 'damage'); return; }
        if (a.dmg > 0.4) {
          r.needsNose = true;
          if (!a.dmgNoted) { a.dmgNoted = true; race.feed(`${r.e.code} damaged, heading for the pits`, 'out'); if (Math.random() < 0.6) race.rc?.debris(a.car.s, hit > 9); }   // the front wing on the track
        }
      }
    }
    // Overtaking aid: within a second of the car ahead (from the second lap), the drag reduction on the straights.
    a.car.drs = race.running && r.laps >= 1 && !r.finished && (r.interval ?? 9) < 1.0 && (r.pos ?? 1) > 1;
    if (race.state !== 'done') race.progress(r, s, crossed && !r.finished);
    // Track limits: a driver running wide now and then (more often the less precise the driver).
    if (crossed && race.running && !r.finished && race.rc && Math.random() < 0.006 + (a.driver.humanity ?? 0.3) * 0.02) {
      const cs = cornerSpots(L);
      race.rc.trackLimits(r, cs.length ? cs[Math.floor(Math.random() * cs.length)] : Math.random() * L.length);
    }
    if (d > 0 && !r.finished) r.tyres.run(d, L.length, a.state === 'track' && a.driver.state === 'attack' ? 1.15 : 1);
    r.status = a.state === 'track' ? (r.finished ? 'FINISHED' : 'RACING') : a.state === 'stop' ? 'PIT STOP' : 'PIT';
    a.compound = r.tyres.compound;
  }
  /** Racing laps and the formation lap: pace from the tyres and fuel, pit stops, parking on the grid. */
  directRace(a, onTrack, player) {
    const L = this.L, me = a.car, d = a.driver, r = a.row, race = this.race;
    d.offset = 0;
    let want;
    d.speedCap = null;
    if (a.lapType === 'formation') {
      want = 0.8; d.speedCap = 50; // ~180 km/h at most, single file (a brisk formation lap)
      // Back round to the grid: over the last part of the lap, onto rails into its own box.
      const toSlot = dsWrap(L, me.s, r.slotS);
      if (a.formDist > L.length * 0.55 && toSlot > 0 && toSlot < 170) {
        a.state = 'park'; a.kin = { s: me.s, lat: me.lateral, v: me.u };
        return;
      }
    } else {
      // The race: the tyres' grip and the fuel on board decide the pace; blue flags; pit stops.
      const share = race.laps ? Math.min(1, r.laps / race.laps) : 0;
      const loss = r.tyres.loss + 0.00035 * (105 * (1 - share));
      want = 0.995 / (1 + 1.3 * loss) * (1 - (a.dmg ?? 0) * 0.06);
      if (r.finished) want = 0.7;
      if (!a.pitThisLap && (race.wantsPit(r) || (r.needsNose && race.laps - r.laps > 1)) && this.pit) { const toEntry = dsWrap(L, me.s, this.pit.s0); if (toEntry > 0 && toEntry < 900) { a.pitThisLap = true; r.status = 'IN'; } }
      if ((a.pitThisLap || r.finished) && this.pit) {
        const toEntry = dsWrap(L, me.s, this.pit.s0);
        if (toEntry > 0 && toEntry < 320) { d.offset = this.sg * (L.halfW - 1.3); want = Math.min(want, toEntry < 140 ? 0.6 : 0.85); }
        if (toEntry > -4 && toEntry <= 12) { this.enterLane(a); a.pitStop = !r.finished && !a.passThrough; return; }
      }
      // Race control: the Safety Car, the VSC, yellow flags, a drive-through to take.
      const rc = race.rc;
      if (rc && !r.finished) {
        d.noPass = false;
        const neutral = rc.neutral;
        if (neutral === 'vsc') { want = Math.min(want, 0.6); d.noPass = true; }
        else if (neutral === 'sc') {
          d.noPass = true;
          // The leader controls the restart once the Safety Car is in: away at a point of its choosing
          // in the last part of the lap; the field follows, no passing until the line.
          if (rc.status === 'scIn' && rc.scPitted && r.pos === 1 && L.length - wrapS(L, me.s) < (rc.goAt ?? 300)) rc.restartGo = true;
          if (!rc.restartGo) {
            // Behind the Safety Car: its pace, in a queue (a car far behind the one in front closes up).
            const order = race.order ?? race.standings(), k = order.indexOf(r), ahead = k > 0 ? order[k - 1] : null;
            const sc = this.sc?.obstacle, toSC = sc ? dsWrap(L, me.s, sc.s) : null;
            const gap = ahead ? ahead.dist - r.dist : toSC != null && toSC > 0 ? toSC : 999;
            want = Math.min(want, gap > 250 ? 0.86 : gap > 110 ? 0.72 : 0.62);
            d.speedCap = gap > 250 ? 62 : gap > 110 ? 50 : k === 0 && toSC != null && toSC > 0 ? Math.max(10, sc.u + Math.min(8, Math.max(-6, (toSC - 30) * 0.2))) : 42;
          }
        }
        if (!neutral) a.neutralCall = null;
        // A cheap stop under the Safety Car or the VSC (it costs about half the time).
        if (neutral && a.neutralCall == null) a.neutralCall = race.cheapStop(r) && Math.random() < 0.85;
        if (neutral && a.neutralCall && !a.pitThisLap && this.pit) { const toEntry = dsWrap(L, me.s, this.pit.s0); if (toEntry > 60 && toEntry < 900) { a.pitThisLap = true; a.neutralCall = false; r.status = 'IN'; } }
        if (r.driveThrough && !a.pitThisLap && this.pit) { const toEntry = dsWrap(L, me.s, this.pit.s0); if (toEntry > 60 && toEntry < 900) { a.pitThisLap = true; a.passThrough = true; } }
        const y = rc.yellowAt(me.s);
        if (y) { want *= y === 'double' ? 0.8 : 0.92; d.noPass = true; }
      }
      // Out of the pits: on the pit side of the exit line until the cars on the racing line have gone by.
      if (a.justPitted && this.pit) {
        const since = dsWrap(L, this.pit.s1, me.s);
        if (since > -5 && since < 280) { d.offset = this.sg * (L.halfW - 1.4); want = Math.min(want, 0.93); } else if (since >= 280) a.justPitted = false;
      }
      // Blue flags: a car lapping this one is close behind: out of its way on the straight.
      const lapper = [...onTrack.map((o) => o.row && o !== a ? o : null).filter(Boolean)].find((o) => o.row.dist > r.dist + L.length * 0.5 && dsWrap(L, o.car.s, me.s) > -5 && dsWrap(L, o.car.s, me.s) < 90);
      const playerLapping = player?.onTrack && player.row && player.row.dist > r.dist + L.length * 0.5 && dsWrap(L, player.car.s, me.s) > -5 && dsWrap(L, player.car.s, me.s) < 90;
      if (lapper || playerLapping) {
        const i = Math.floor(wrapS(L, me.s) / L.ds) % L.N, straight = Math.abs(this.plan.kLine[i]) < 1 / 260;
        if (straight) { const chaserLat = (lapper ? lapper.car.lateral : player.car.lateral); a.aside ??= (chaserLat > me.lateral ? -1 : 1) * (L.halfW - 1.5); d.offset = a.aside; me.yieldSide = Math.sign(a.aside); want *= 0.93; r.blue = true; }
      } else { a.aside = null; me.yieldSide = 0; r.blue = false; }
    }
    const cur = d.paceMul ?? want;
    d.paceMul = cur + Math.max(-0.08 * DT, Math.min(0.12 * DT, want - cur));
  }
  /** Rolling into the grid box: down to a stop exactly on the slot, straightening up. */
  park(a, dt) {
    const K = a.kin, r = a.row, L = this.L, to = dsWrap(L, K.s, r.slotS);
    const vT = to > 0.05 ? Math.min(Math.max(K.v, 6), Math.sqrt(2 * 2.6 * Math.max(0, to))) : 0;
    K.v += Math.max(-9 * dt, Math.min(3 * dt, vT - K.v));
    K.lat += (r.slotLat - K.lat) * Math.min(1, dt * (to < 60 ? 1.4 : 0.7));
    K.s += Math.min(K.v * dt, Math.max(0, to));
    this.place(a);
    if (to <= 0.06 && K.v < 0.3) {
      K.v = 0; K.lat = r.slotLat; this.place(a);
      a.state = 'track'; a.held = true; a.startAt = Infinity; a.lapType = 'grid'; a.parked = true;
      a.car.u = 0; a.car.s = wrapS(L, K.s); a.car.progress = a.car.s; a.car.splits = null; a.car._prevS = undefined;
    }
  }
  /** Stopped in the pit box: the crew at work; then off down the lane on the new tyres. */
  stop(a) {
    if (this.time < a.stopUntil) return;
    const r = a.row;
    this.race.pitDone(r, this.race.nextCompound(r));
    a.compound = r.tyres.compound; a.pitStop = false; a.pitThisLap = false;
    a.state = 'pitOut';
    this.onPitDone?.(a);
  }

  // ------------------------------------------------------------------- race control on track
  /** The race row a sim2d car belongs to (an AI, or the player's), or null (the Safety Car). */
  rowOfCar(c) {
    if (!this.race) return null;
    if (c.id === 99) return this.race.player;
    const a = this.cars[c.id];
    return a?.car === c ? a.row ?? null : null;
  }
  /** The race leader's car on track (for the Safety Car to come out in front of it). */
  leaderCar(player) {
    const lead = this.race?.standings().find((r) => !r.retired && !r.finished);
    if (!lead) return null;
    if (lead.e.player) return player?.onTrack ? player.car : null;
    return lead.ai?.state === 'track' ? lead.ai.car : null;
  }
  /** The Safety Car (built the first time it's needed). */
  safetyCar() { return (this.sc ??= new SafetyCar(this)); }
  /**
   * A car out of the race on track: it slows and pulls off to the side (or slides off into the run-off
   * after a crash) and stays there until the marshals have recovered it. In the pit lane or the garage
   * it simply goes away.
   */
  retireOnTrack(a, cause) {
    if (!a) return;
    const r = a.row;
    if (a.state !== 'track') { a.state = 'garage'; a.visual.root.visible = false; return; }
    const L = this.L, me = a.car, side = Math.sign(me.lateral || (Math.random() - 0.5)) || 1;
    a.state = 'out'; a.lapType = null;
    a.kin = { s: wrapS(L, me.s), lat: me.lateral, v: me.u };
    a.outLat = side * (L.halfW + 2.4 + Math.random() * 2.5);
    a.outDecel = cause === 'crash' || cause === 'damage' ? 15 : 5;
    if (cause !== 'dsq') this.race?.rc?.stoppedCar(r, me.s, cause);
  }
  offRoad(a, dt) {
    const K = a.kin;
    K.v = Math.max(0, K.v - a.outDecel * dt);
    K.lat += (a.outLat - K.lat) * Math.min(1, dt * (K.v > 1 ? 3 : 0.8));   // off the racing line quickly
    K.s += K.v * dt;
    this.place(a);
  }
  /** The marshals have taken the car away. */
  recovered(r) { const a = r?.ai; if (a && a.state === 'out') { a.state = 'garage'; a.visual.root.visible = false; } }
  /** A driver error: a car on a racing lap goes off into the barrier (race control decides the rest). */
  crashRandom() {
    const race = this.race;
    const pool = this.cars.filter((a) => a.state === 'track' && a.row && !a.row.finished && !a.row.retired && a.lapType === 'race');
    if (!pool.length) return;
    const w = pool.map((a) => 0.2 + (a.driver.humanity ?? 0.3));
    let x = Math.random() * w.reduce((p, q) => p + q, 0), a = pool[0];
    for (let k = 0; k < pool.length; k++) { x -= w[k]; if (x <= 0) { a = pool[k]; break; } }
    const r = a.row;
    r.retired = true; r.status = 'DNF';
    race.feed(`${r.e.code} crashes out at ${race.rc?.turn(a.car.s).toLowerCase() ?? 'the circuit'}`, 'out');
    this.retireOnTrack(a, 'crash');
  }

  // ---------------------------------------------------------------------------------- drawing
  /** Pose every car on the 3D track (interpolated between physics steps); hide the ones far away. */
  draw(dt, camera) {
    const L = this.L, ground = this.track.ground, alpha = this.acc / DT, cam = camera.position;
    this.sc?.draw(dt, alpha);
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
