import { applyGridPenalties } from './fia.js';
import { RaceSession, raceLaps } from './race.js';
import { COMPOUNDS, fuelAt, fuelLoss } from './tyres.js';
import { liveWeather } from './session.js';
import { PitCrews } from './pitCrew.js';
import { raceHud } from '../raceHud.js';
import { repairAtStop, tickDamage } from '../physics/damage.js';
import { failureChance } from './rd.js';
import { PEN } from './raceControl.js';
import { TEAMS } from '../front/teams.js';

/*
 * The player's side of a race weekend's Sprint or Grand Prix: puts the car on its grid box, runs the
 * formation lap (no overtaking, back to the box, parked as close as you can), holds the car through the
 * start lights, the clutch launch (hold SPACE as the clutch with the revs up; let it go when the lights
 * go out: the reaction time and the revs decide the getaway; let go early and it's a jump start), then
 * the race: the tyres wear with how the car is driven, the engineer calls the stop, the crew changes
 * the tyres in the box, and the race tower and the race panel keep it all in view.
 *
 * Race control (game/raceControl.js) runs alongside: the player's side of it is here. A false start,
 * track limits, pit lane speeding, contact go to the stewards; under the Safety Car and the VSC the
 * player has a delta to keep positive and may not overtake (pass a car and the engineer asks you to
 * give the place back, or it's a penalty), the same in a yellow flag zone; a car a lap up close behind
 * shows the blue flag (ignore it and it's a penalty); time penalties are served at the next stop (the
 * crew waits before touching the car), a drive-through within three laps or it's the black flag.
 */
const wrapS = (L, s) => ((s % L.length) + L.length) % L.length;
const dsWrap = (L, a, b) => { let d = b - a; if (d > L.length / 2) d -= L.length; if (d < -L.length / 2) d += L.length; return d; };
const TYRE_NAME = { S: 'softs', M: 'mediums', H: 'hards', I: 'inters', W: 'full wets' };

export class RaceRun {
  constructor(wr) {
    this.wr = wr;
    this.hud = raceHud();
    this.crews = null;
  }
  get S() { return this.wr.session; }

  /** Line up for the race: grid from qualifying, the field on its boxes, the player in theirs. */
  start(def, length = 'medium') {
    const wr = this.wr, ctx = wr.ctx, track = ctx.getTrack(), L = track.layout, field = wr.field;
    wr.def = def;
    wr.weather = liveWeather(wr.weekend, def);
    ctx.useWeather(wr.weather);
    for (const a of field.cars) { a.state = 'garage'; a.visual.root.visible = false; a.lapType = null; a.run = null; a.nextRunAt = Infinity; a.parked = false; a.held = false; }
    field.time = 0; field.acc = 0; field.onLap = null; field.onGarage = null; field.onSector = null;
    const q = wr.weekend.results[def.id === 'S' ? 'SQ' : 'Q'];
    // The grid, then the grid penalties (power unit and gearbox allocations: game/fia.js).
    const grid = applyGridPenalties(q ? q.map((r) => r.id) : wr.entries.slice().sort((a, b) => (b.pace ?? 0.98) - (a.pace ?? 0.98)).map((e) => e.id), def.id === 'R' ? wr.gridPens : []);
    const laps = raceLaps(track.id, def.id === 'S' ? 'S' : 'R', length);
    const S = new RaceSession({ def, weekend: wr.weekend, field, entries: wr.entries, playerEntry: wr.playerEntry, grid, laps, track, weather: wr.weather, length });
    wr.session = S;
    // Reliability: now and then an AI car's race ends with a failure (the chance from its reliability).
    if (wr.rd) for (const r of S.rows) if (!r.e.player && Math.random() < failureChance(wr.rd, r.e.team.id) * (laps / 50)) r.failLap = 1 + Math.floor(Math.random() * Math.max(1, laps - 1));
    // The player's power unit: worn units can fail (the element at fault is finished: game/loadout.js).
    const me = S.rows.find((r) => r.e.player), risk = wr.pu?.risk;
    wr.pendingFail = null;
    if (me && risk && Math.random() < risk.p * (laps / 50)) {
      me.failLap = 1 + Math.floor(Math.random() * Math.max(1, laps - 1));
      let u = Math.random() * risk.per.reduce((a, x) => a + x.p, 0); wr.pendingFail = (risk.per.find((x) => (u -= x.p) <= 0) ?? risk.per[0]).el;
    }
    field.placeGrid(S);
    // Race control: the Safety Car on standby, cars out of the race stopping on track, the stewards.
    const rc = S.rc, sc = field.safetyCar();
    sc.hide();
    S.onRetire = (r, cause) => { if (r.e.player) { if (cause === 'failure' && wr.pendingFail) wr.weekend.puFailed = wr.pendingFail; this.playerOut(cause); } else field.retireOnTrack(r.ai, cause); };
    rc.onRecovered = (r) => field.recovered(r);
    rc.onIncident = () => field.crashRandom();
    rc.onMessage = (m) => this.rcMessage(m);
    rc.onStatus = (st, prev) => this.trackStatus(st, prev);
    this.crews ??= new PitCrews(ctx.scene);
    field.onPitStop = (a, len) => this.crewAt(a.entry.team, a.car.x, a.car.z, a.car.h, len);
    // The player's car on its box.
    const pr = S.player;
    ctx.place(track.poseAt(pr.slotS, pr.slotLat));
    wr.mode = 'track';
    const v = ctx.getVehicle();
    v.compound = pr.tyres.compound; v.gripScale = 1; v.launchScale = 1;
    Object.assign(this, { t: 0, lastS: pr.slotS, formDist: 0, parked: false, parkVerdict: '', armed: false, released: false, goAt: null, stopping: null, boxCalled: false, finished: false, towerT: 0, hudT: 0, lastPlace: null, launchUntil: 0, allParkedAt: null,
      ceremony: false, delta: null, deltaBadT: 0, deltaFlagged: false, deltaWarned: false, giveBack: null, prevAhead: null, blueT: 0, blueSaid: false, blueFlagged: new Set(), lapper: null,
      speedT: 0, speedFlag: false, dtLane: false, dtCalled: false, greenUntil: 0, bwUntil: 0, stillT: 0, stoppedNoted: false, black: false });
    S.onLight = (n) => { this.hud.lights(n); ctx.audio?.beep?.(660, 0.12); };
    S.onStart = () => { field.raceStart(); this.hud.lightsOut(); this.goAt = this.t; ctx.audio?.beep?.(990, 0.25); };
    S.onChequer = () => this.hud.banner('CHEQUERED FLAG', 'chequer');
    S.onPlayerFinish = (pos) => this.playerFinished(pos);
    S.onDone = () => { this.hud.hideAll(); wr.onSessionDone?.(S); };
    S.onLap = (r) => { if (r === pr) this.playerLap(); };
    this.hud.hideAll();
    this.hud.banner(`${S.label === 'SPRINT' ? 'SPRINT' : 'GRAND PRIX'} · ${laps} LAPS · P${pr.gridPos} ON THE GRID`);
    this.radio(`On the grid, P${pr.gridPos}. ${laps} laps today. Start on the ${TYRE_NAME[pr.tyres.compound]}. ${this.wr.formationLap === false ? 'Straight to the start, no formation lap.' : 'Formation lap shortly.'}`);
  }
  radio(text) { this.wr.onRadio?.(text); }
  crewAt(team, x, z, h, len) {
    const g = this.wr.ctx.getTrack().ground, y = g.heightAt(x, z) ?? 0;
    this.crews.start(team, x, y, z, h, len);
  }

  /** The player's controls: held on the grid, in the box; the clutch start. */
  controls(c) {
    const S = this.S, wr = this.wr;
    if (!S || wr.mode !== 'track') return;
    const clutch = c.handbrake > 0;
    let held = S.state === 'grid' || S.state === 'lights' || (S.state === 'formation' && this.parked) || !!this.stopping;
    if (S.state === 'lights' && !this.released) {
      if (clutch) this.armed = true;
      else if (this.armed) {                                      // let go before the lights went out
        this.released = true; this.armed = false;
        S.rc.offence(S.player, 'FALSE START', 't10', { quick: true });
        wr.ctx.hud.toast('JUMP START · REPORTED TO THE STEWARDS', 4, 'void');
        this.radio('We moved before the lights went out. That will be a penalty.');
      }
      if (this.armed) held = true;
    }
    if (S.running && !this.released) {
      const since = this.t - (this.goAt ?? this.t);
      if (this.armed ? !clutch : since > 0.4) this.launch(c.throttle, this.armed ? since : 0.4);
      else held = true;
    }
    // Into the box: braked to a stop at the crew (the last ~30 m of the pit lane).
    if (this.boxAssist != null && !held) {
      const v = wr.ctx.getVehicle(), u = Math.max(0, v.forwardSpeed), d = Math.max(0.4, this.boxAssist + 0.3);
      c.throttle = u < 2.5 && this.boxAssist > 4 ? 0.25 : 0; c.brake = Math.min(1, (u * u) / (2 * d) / 7 + (this.boxAssist < 1 ? 1 : 0)); c.hold = true;
    }
    if (held) { c.brake = 1; c.handbrake = 0; c.hold = true; if (S.state !== 'lights' && !this.armed) c.throttle = 0; }
    else if (S.running && this.t < this.launchUntil) c.handbrake = 0;
  }
  /** Away: the reaction time and the revs (throttle) at the release decide the launch. */
  launch(throttle, reaction) {
    this.released = true;
    const v = this.wr.ctx.getVehicle();
    let q = 'GOOD LAUNCH', k = 1;
    if (throttle > 0.95) { q = 'TOO MUCH WHEELSPIN'; k = 0.82; } else if (throttle < 0.35) { q = 'BOGGED DOWN'; k = 0.55; } else if (throttle >= 0.6 && throttle <= 0.9 && reaction < 0.3) q = 'GREAT LAUNCH';
    v.launchScale = k; this.launchUntil = this.t + 1.3;
    this.wr.ctx.hud.toast(`REACTION ${reaction.toFixed(2)} s · ${q}`, 2.6, q.includes('GOOD') || q.includes('GREAT') ? 'best' : '');
  }

  /** Every frame of the race. */
  update(dt, { inPitLane }) {
    const S = this.S, wr = this.wr, ctx = wr.ctx, track = ctx.getTrack(), L = track.layout, v = ctx.getVehicle(), pr = S.player;
    this.t += dt;
    this.crews?.update(dt);
    if (this.t > this.launchUntil && v.launchScale !== 1) v.launchScale = 1;
    if (S.state === 'grid' && this.t > 4 && wr.formationLap === false) {
      // No formation lap (a setting): everyone is in their box already; the lights.
      this.parked = true; this.parkedAt = this.t;
      S.state = 'lights'; S.phaseT = 0; this.hud.banner(''); this.hud.park(false);
      this.radio('Straight to the start. Hold the clutch, revs up.');
      ctx.hud.toast('HOLD SPACE (CLUTCH) + THROTTLE · RELEASE ON LIGHTS OUT', 6);
    }
    if (S.state === 'grid' && this.t > 7) {
      S.state = 'formation'; wr.field.formation();
      this.hud.banner('FORMATION LAP', 'form');
      this.radio(`Formation lap. Warm the tyres and brakes, no overtaking. Back to grid box ${pr.gridPos}.`);
    }
    // Where the player is in the race.
    const b = v.body.position, n = L.nearest(b.x, b.z);
    const s = n ? n.s : this.lastS, lat = n ? n.lateral : 0;
    let d = s - this.lastS; if (d < -L.length / 2) d += L.length; if (d > L.length / 2) d -= L.length;
    const crossed = this.lastS > L.length * 0.75 && s < L.length * 0.25;
    this.lastS = s;
    if (S.state === 'formation' && d > 0) this.formDist += d;
    if (S.state !== 'done') S.progress(pr, s, crossed && S.running && !pr.finished);
    pr.status = inPitLane ? (this.stopping ? 'PIT STOP' : 'PIT') : pr.finished ? 'FINISHED' : S.running ? 'RACING' : 'GRID';
    // ---- formation lap: back to the grid box ----
    if (S.state === 'formation') {
      const toSlot = dsWrap(L, s, pr.slotS), latErr = lat - pr.slotLat, nearEnd = this.formDist > L.length * 0.55;
      if (nearEnd && !this.parked && toSlot > -15 && toSlot < 260) {
        this.hud.park(true, { slot: pr.gridPos, along: Math.max(0, toSlot), lat: latErr });
        if (Math.abs(v.forwardSpeed) < 0.4 && Math.abs(toSlot) < 6 && Math.abs(latErr) < 2.6) this.park(Math.hypot(toSlot, latErr));
      }
      const aiParked = wr.field.cars.every((a) => !a.row || a.parked);
      if (aiParked) this.allParkedAt ??= this.t;
      if (aiParked && !this.parked && this.t - this.allParkedAt > 45) {      // still not there: put on the box
        ctx.place(track.poseAt(pr.slotS, pr.slotLat)); this.park(0, 'PLACED ON THE GRID');
      }
      if (aiParked && this.parked && this.t - Math.max(this.allParkedAt, this.parkedAt) > 2.5) {
        S.state = 'lights'; S.phaseT = 0; this.hud.banner(''); this.hud.park(false);
        this.radio('All cars in position. Lights in a moment. Hold the clutch, revs up.');
        ctx.hud.toast('HOLD SPACE (CLUTCH) + THROTTLE · RELEASE ON LIGHTS OUT', 6);
      }
    }
    // ---- the race ----
    if (S.running && !pr.finished) {
      // Tyre wear with how the car is driven: sliding tyres wear far faster.
      const slip = v.wheels.reduce((a, w) => a + Math.min(2, Math.abs(w.slip ?? 0)), 0) / 4;
      const severity = Math.max(0.8, Math.min(1.8, 0.8 + Math.max(0, slip - 0.45) * 1.2));
      if (d > 0) { pr.tyres.run(d, L.length, severity); pr.tyres.useWheels(d, v.wheels); }
      // Overtake mode (the 2026 rules' extra electrical deployment): within a second of the car ahead.
      const om = pr.laps >= 1 && (pr.interval ?? 9) < 1.0 && (pr.pos ?? 1) > 1 && S.rc.drsOn;
      v.powerScale = om ? 1.07 : 1;
      if (om !== this.om) { this.om = om; if (om) ctx.hud.toast('OVERTAKE MODE', 1.2, 'best'); }
      const fuel = fuelLoss(fuelAt(pr.laps / S.laps));
      v.compound = pr.tyres.compound;
      v.gripScale = pr.tyres.grip / (1 + fuel) ** 2;
      // The engineer's call to pit, and the stop itself.
      tickDamage(v, dt, Math.max(0, v.throttle ?? 0));
      const needNose = v.parts && (v.parts.frontWing < 0.5 || Object.values(v.parts.puncture).some(Boolean));
      if (!this.boxCalled && needNose && !inPitLane && S.laps - pr.laps > 1) { this.boxCalled = true; this.boxFor = S.nextCompound(pr); this.radio(`Box, box. We'll fix the car and fit ${TYRE_NAME[this.boxFor]}.`); }
      if (!this.boxCalled && S.wantsPit(pr) && !inPitLane) {
        this.boxCalled = true; this.boxFor = S.nextCompound(pr);
        this.radio(`Box, box. Box this lap for ${TYRE_NAME[this.boxFor]}.`);
      }
      this.raceRules(dt, { inPitLane, s, d, v, b, L, track });
      const stopText = () => { const el = this.t - (this.stopping.until - this.stopping.len); return el < this.stopping.pen ? `PENALTY ${(this.stopping.pen - el).toFixed(1)}` : `PIT STOP ${(Math.max(0, this.stopping.until - this.t)).toFixed(1)}`; };
      // In the pit lane: the crew waits in the box (where to stop), the distance to it counts down, and
      // over the last ~30 m the car is braked into the box (as in the F1 games); a drive-through goes by.
      const box = wr.boxes[wr.teamId][0], toBox = dsWrap(L, s, box);
      if (!inPitLane) { this.boxVisit = false; this.boxAssist = null; if (this.crewWait && !this.stopping) { this.crews.release(this.crewWait); this.crewWait = null; } }
      else if (!this.stopping && !this.boxVisit && !pr.driveThrough) {
        if (!this.crewWait) {
          const lat = wr.field.laneLat(box), p = track.poseAt(box, lat), i = Math.floor(box / L.ds) % L.N, g = track.ground.heightAt(p.x, p.z) ?? 0;
          this.crewWait = this.crews.hold(wr.playerEntry.team, p.x, g, p.z, Math.atan2(L.tz[i], L.tx[i]));
        }
        this.boxAssist = toBox > -3 && toBox < 32 ? toBox : null;
      } else this.boxAssist = null;
      const boxText = inPitLane && !this.stopping && !this.boxVisit && !pr.driveThrough && toBox > -3 && toBox < 600 ? `YOUR BOX ${Math.max(0, Math.round(toBox))} m` : '';
      this.hud.pit(this.stopping ? stopText() : boxText || (pr.driveThrough && !inPitLane ? 'DRIVE THROUGH · BOX' : this.boxCalled && !inPitLane ? 'BOX BOX' : ''), this.stopping ? 'stop' : 'box');
      if (inPitLane && !this.stopping && !this.boxVisit && wr.inBox()) {   // (one stop per visit to the pit lane)
        const fix = repairAtStop(v);                                   // punctures fixed with the new tyres; a new nose if needed
        // Time penalties first: the crew waits before touching the car.
        const pen = pr.penalty;
        if (pen > 0) { pr.penalty = 0; S.rc.served(pr, 'time'); this.radio(`Serving the ${pen} second penalty. Hold it.`); }
        // The crew (the Pit Crew Chief and the Chief Mechanic, game/staff.js): the time in the box, a slow one now and then.
        const M = wr.mods ?? {}, slow = Math.random() < (M.pitSlow ?? 0.04) ? 1.5 + Math.random() * 3 : 0;
        const len = (M.pitBase ?? 2.0) + Math.random() * (M.pitSpread ?? 0.7) + slow + (fix.nose ? M.noseTime ?? 6.5 : 0) + pen;
        if (fix.nose) this.radio('New nose going on, hold on.');
        this.stopping = { until: this.t + len, len, pen };
        this.boxVisit = true; this.boxAssist = null;
        if (this.crewWait) { this.crews.go(this.crewWait, len); this.crewWait = null; }
        else this.crewAt(wr.playerEntry.team, b.x, b.z, Math.atan2(v.forward.z, v.forward.x), len);
      }
      if (this.stopping && this.t >= this.stopping.until) {
        const c = this.boxFor ?? S.nextCompound(pr);
        S.pitDone(pr, c);
        const work = this.stopping.len - this.stopping.pen;
        ctx.hud.toast(`${work.toFixed(1)} s STOP${this.stopping.pen ? ` + ${this.stopping.pen} s PENALTY` : ''} · ${COMPOUNDS[c].name.toUpperCase()}`, 3, 'best');
        this.radio(`${work < 3 ? 'Good stop' : 'Stop done'}, ${work.toFixed(1)} seconds. On the ${TYRE_NAME[c]}. Watch the pit exit line.`);
        this.stopping = null; this.boxCalled = false; this.boxFor = null;
      }
    } else this.hud.pit('');
    // Done: into the pit lane after the slowing-down lap (or after a while) for parc fermé and the podium.
    if (this.finished && !this.ceremony && S.state !== 'done' && (inPitLane || this.t - this.finishAt > 40)) { this.ceremony = true; this.hud.hideAll(); S.finishRest(); }
    // ---- HUD: the race panel, the car, the tower ----
    this.hudT -= dt;
    if (this.hudT <= 0) { this.hudT = 0.25; this.raceChecks(); this.drawHud(); }
  }
  // ------------------------------------------------------------------------------ race control
  /** The player's rules, every frame of the race (S.running, not finished). */
  raceRules(dt, { inPitLane, s, d, v, L, track }) {
    const S = this.S, rc = S.rc, pr = S.player, wr = this.wr, b = v.body.position;
    if (pr.retired) return;
    // The delta under the VSC (and under the Safety Car until you've caught the queue): never quicker
    // than the reference through any part of the lap.
    if (rc.neutral && !inPitLane) {
      const i = Math.floor(s / L.ds) % L.N, vref = Math.max(6, wr.field.plan.vLine[i] * (rc.neutral === 'vsc' ? 0.7 : 0.75));
      const queued = rc.neutral === 'sc' && this.inQueue(s);
      this.delta ??= 2;
      if (!queued) this.delta = Math.min(6, this.delta + dt - Math.min(Math.max(0, d), 110 * dt) / vref);   // (a reset or a teleport isn't driving)
      this.deltaShown = queued ? null : this.delta;
      if (this.delta < 0 && !queued) {
        this.deltaBadT += dt;
        if (!this.deltaWarned) { this.deltaWarned = true; this.radio('Delta! Delta is negative, slow down.'); }
        if (!this.deltaFlagged && (this.deltaBadT > 2 || this.delta < -1.2)) { this.deltaFlagged = true; rc.offence(pr, rc.neutral === 'vsc' ? 'FAILING TO RESPECT VSC DELTA' : 'FAILING TO RESPECT SAFETY CAR DELTA', 't5', { s }); }
      } else if (this.delta > 0.4) this.deltaWarned = false;
    } else if (!rc.neutral) { this.delta = null; this.deltaShown = null; this.deltaBadT = 0; this.deltaFlagged = false; }
    // Leading at the restart: the field goes when you go (in the last part of the lap).
    if (rc.status === 'scIn' && rc.scPitted && pr.pos === 1 && L.length - s < (rc.goAt ?? 300)) rc.restartGo = true;
    // Pit lane speeding (the limiter catches it, but not if you arrive far too fast).
    if (inPitLane && !this.stopping) {
      const lim = track.pitLimit?.(b.x, b.z);
      if (lim != null && v.forwardSpeed > lim + 0.8) this.speedT += dt;
      if (this.speedT > 1.2 && !this.speedFlag) { this.speedFlag = true; rc.offence(pr, 'PIT LANE SPEEDING', 't5', { s }); this.radio('We were over the limit in the pit lane. Brake before the line next time.'); }
    } else if (!inPitLane) { this.speedT = 0; this.speedFlag = false; }
    // A drive-through: in the lane and out again.
    if (pr.driveThrough) {
      if (!this.dtCalled) { this.dtCalled = true; this.radio('Drive-through penalty. Box this lap, drive through at the limit, do not stop.'); }
      if (inPitLane) this.dtLane = true;
      else if (this.dtLane) { this.dtLane = false; rc.served(pr, 'dt'); this.dtCalled = false; this.radio('Drive-through done. Push now.'); }
    }
    // Stopped on track: the marshals' yellows, maybe the VSC or the Safety Car.
    if (!inPitLane && Math.abs(v.forwardSpeed) < 1 && this.released) this.stillT += dt;
    else { this.stillT = 0; if (this.stoppedNoted && Math.abs(v.forwardSpeed) > 5) { this.stoppedNoted = false; rc.unstop(pr); } }
    if (this.stillT > 8 && !this.stoppedNoted) { this.stoppedNoted = true; rc.stoppedCar(pr, s, 'stopped'); }
  }
  /** Under the Safety Car: caught up with the car in front (or the Safety Car itself)? */
  inQueue(s) {
    const S = this.S, pr = S.player, order = S.standings(), k = order.indexOf(pr);
    const sc = this.wr.field.sc;
    if (k === 0) return !!sc?.obstacle && dsWrap(this.wr.ctx.getTrack().layout, s, sc.car.s) > 0 && dsWrap(this.wr.ctx.getTrack().layout, s, sc.car.s) < 160;
    const ahead = order[k - 1];
    return ahead && ahead.dist - pr.dist < 140;
  }
  /** Four times a second: overtaking where you may not, blue flags. */
  raceChecks() {
    const S = this.S, rc = S.rc, pr = S.player, L = this.wr.ctx.getTrack().layout;
    if (!S.running || pr.finished || pr.retired) return;
    const order = S.standings(), k = order.indexOf(pr), s = this.lastS;
    const y = rc.yellowInfo(s), restricted = rc.neutral ? (rc.neutral === 'sc' ? 'OVERTAKING UNDER SAFETY CAR' : 'OVERTAKING UNDER VIRTUAL SAFETY CAR') : y ? 'OVERTAKING UNDER YELLOW FLAGS' : null;
    if (restricted && this.prevAhead && !this.giveBack) {
      for (const id of this.prevAhead) {
        const x = S.row(id);
        if (!x || x.retired || x.finished || ['PIT', 'PIT STOP', 'IN'].includes(x.status) || order.indexOf(x) < k) continue;
        if (x.dist < pr.dist - L.length * 0.5) continue;                    // a lapped car
        this.giveBack = { x, until: this.t + 12, reason: restricted };
        this.radio(`You passed ${x.e.code} ${restricted.includes('YELLOW') ? 'under yellow flags' : rc.neutral === 'sc' ? 'under the safety car' : 'under the VSC'}. Give the place back.`);
        break;
      }
    }
    if (this.giveBack) {
      const x = this.giveBack.x;
      if (order.indexOf(x) < k || x.retired || ['PIT', 'PIT STOP', 'IN'].includes(x.status)) { this.giveBack = null; this.radio('Place given back. Thanks.'); }
      else if (this.t > this.giveBack.until) { rc.offence(pr, this.giveBack.reason, 't5', { s, cars: [pr, x], note: `${rc.turn(s)} ${rc.car(pr)}` }); this.giveBack = null; this.radio('We didn\'t give it back. The stewards will look at it.'); }
    }
    this.prevAhead = order.slice(0, k).map((r) => r.id);
    // Blue flags: a car a lap up within a second behind.
    const lapper = order.find((x) => x !== pr && !x.retired && !x.finished && x.dist > pr.dist + L.length * 0.5 && x.ai?.state === 'track' && (() => { const g = dsWrap(L, x.ai.car.s, s); return g > 0 && g < 70; })());
    this.lapper = lapper ?? null;
    if (lapper) {
      this.blueT += 0.25;
      if (this.blueT > 3 && !this.blueSaid) { this.blueSaid = true; this.radio(`Blue flags. Let ${lapper.e.code} through.`); }
      if (this.blueT > 15 && !this.blueFlagged.has(lapper.id)) { this.blueFlagged.add(lapper.id); rc.offence(pr, 'IGNORING BLUE FLAGS', 't5', { s }); }
    } else { this.blueT = Math.max(0, this.blueT - 0.5); if (this.blueT === 0) this.blueSaid = false; }
  }
  /** A message from race control: on screen, and the engineer's word when it's about us. */
  rcMessage(m) {
    const pr = this.S.player;
    const mine = m.player;
    if (!mine && (m.kind === 'limits' || m.kind === 'served')) return;     // the other cars' routine ones stay in the log
    this.hud.rcMessage(m);
    if (!mine) return;
    const last = pr.pens?.[pr.pens.length - 1];
    if (m.kind === 'inv') this.radio(`We're under investigation. ${m.text.split(' - ').pop().toLowerCase().replace(/^./, (c) => c.toUpperCase())}.`);
    else if (m.kind === 'penalty' && last) {
      this.hud.penalty(PEN[last.key].name, last.reason);
      this.radio(last.key === 'dt' ? 'Drive-through penalty. We have three laps to take it.' : `${PEN[last.key].sec} second time penalty, ${last.reason.toLowerCase()}. We'll serve it at the stop, or it goes on our time.`);
    } else if (m.kind === 'nfa' || m.kind === 'nfi') { this.hud.penalty('NO FURTHER ACTION', 'The stewards have reviewed the incident', true); this.radio('No further action from the stewards. Good, keep going.'); }
    else if (m.kind === 'bw') { this.bwUntil = this.t + 8; this.radio('Black and white flag. One more track limits and it\'s a penalty.'); }
    else if (m.kind === 'served') this.radio('Penalty served.');
  }
  /** The track status changed: the Safety Car out or in, the VSC, green. */
  trackStatus(st, prev) {
    const S = this.S, pr = S.player, sc = this.wr.field.safetyCar(), audio = this.wr.ctx.audio;
    if (st === 'sc') { sc.deploy(); this.delta = 2; this.radio('Safety car, safety car. Stay above the delta, no overtaking.'); audio?.beep?.(520, 0.3); }
    if (st === 'vsc') { this.delta = 2; this.radio('VSC, VSC. Virtual safety car. Keep the delta positive.'); audio?.beep?.(520, 0.3); }
    if (st === 'vscEnd') this.radio('VSC ending. Be ready, green any moment.');
    if (st === 'scIn') { sc.callIn(); this.S.rc.goAt = 120 + Math.random() * 380; this.radio(pr.pos === 1 ? 'Safety car in this lap. You control the restart. Go when you want, before the line.' : 'Safety car in this lap. No overtaking until the line.'); }
    if (st === 'green') { this.greenUntil = this.t + 4; this.delta = null; if (prev !== 'green') this.radio('Green, green, green! Racing.'); }
    // A cheap stop: the call when the Safety Car or the VSC comes out.
    // (The Head of Strategy: a good one never misses the window; a weak one does half the time.)
    if ((st === 'sc' || st === 'vsc') && !this.boxCalled && !pr.finished && S.cheapStop(pr) && ((this.wr.mods?.strategy ?? 70) >= 60 || Math.random() < 0.5)) {
      this.boxCalled = true; this.boxFor = S.nextCompound(pr);
      setTimeout(() => this.radio(`Box, box. Cheap stop under the ${st === 'sc' ? 'safety car' : 'VSC'}. ${TYRE_NAME[this.boxFor]}.`), 1800);
    }
  }
  /** Out of the race: disqualified (the black flag), or a failure. */
  playerOut(cause) {
    if (this.finished) return;
    this.finished = true; this.finishAt = this.t;
    if (cause === 'dsq') { this.black = true; this.hud.banner('BLACK FLAG · DISQUALIFIED'); this.radio('Black flag. We\'re disqualified. Box, box.'); }
  }
  /** A heavy crash (main.js): debris, the yellows, perhaps more. */
  impact(hit) {
    const S = this.S;
    if (!S?.running || hit < 17) return;
    S.rc.debris(this.lastS, hit > 24);
  }

  park(err, verdict = null) {
    this.parked = true; this.parkedAt = this.t;
    const v = verdict ?? (err < 0.5 ? 'PERFECT' : err < 1.2 ? 'GOOD' : err < 2.5 ? 'OK' : 'POOR');
    this.parkVerdict = v;
    this.hud.park(true, { slot: this.S.player.gridPos, done: true, verdict: `${v} · ${err.toFixed(1)} m` });
    this.radio(v === 'PERFECT' || v === 'GOOD' ? 'Good position in the box.' : 'Okay, stay there.');
  }
  playerLap() {
    const S = this.S, pr = S.player, order = S.standings(), k = order.indexOf(pr);
    if (pr.finished) return;
    const lapsLeft = S.laps - pr.laps;
    if (lapsLeft === 1) this.radio(`Last lap. P${k + 1}. Bring it home.`);
    else if (pr.laps % 3 === 0 && lapsLeft > 1) {
      const ahead = order[k - 1], behind = order[k + 1];
      const bits = [`P${k + 1}, ${lapsLeft} to go.`];
      if (ahead) bits.push(`${ahead.e.code} ${Math.max(0, pr.gap - ahead.gap).toFixed(1)} ahead.`);
      if (behind && behind.gap - pr.gap < 1.2) bits.push(`${behind.e.code} close behind, ${Math.max(0, behind.gap - pr.gap).toFixed(1)}.`);
      if (pr.tyres.state === 'worn' || pr.tyres.state === 'gone') bits.push(`Tyres at ${pr.tyres.pct} percent.`);
      this.radio(bits.join(' '));
    }
  }
  playerFinished(pos) {
    this.finished = true; this.finishAt = this.t;
    this.hud.banner('CHEQUERED FLAG', 'chequer');
    setTimeout(() => this.hud.banner(''), 5000);
    const pts = (this.S.kind === 'S' ? [8, 7, 6, 5, 4, 3, 2, 1] : [25, 18, 15, 12, 10, 8, 6, 4, 2, 1])[pos - 1] ?? 0;
    this.radio(pos === 1 ? 'Yes! We won! P1! Fantastic job, mate!' : pos <= 3 ? `P${pos}! Podium! Great job!` : pos <= 10 ? `P${pos}. ${pts} points. Good job.` : `P${pos}. Not our day.`);
  }

  drawHud() {
    const S = this.S, pr = S.player, wr = this.wr, order = S.standings(), k = order.indexOf(pr);
    const v = wr.ctx.getVehicle();
    const show = S.running || S.state === 'done';
    if (show) {
      const ahead = order[k - 1], behind = order[k + 1];
      this.hud.info(true, { pos: k + 1, lap: Math.min(S.laps, pr.laps + 1), laps: S.laps, finished: pr.finished,
        ahead: ahead ? { code: ahead.e.code, gap: Math.max(0, pr.gap - ahead.gap) } : null,
        behind: behind ? { code: behind.e.code, gap: Math.max(0, behind.gap - pr.gap) } : null,
        last: pr.last, best: pr.best, pits: pr.pits, penalty: pr.penalty, inv: (pr.inv ?? 0) > 0 });
    } else this.hud.info(false);
    const dmg = v.damageParts ?? {};
    const warn = pr.tyres.state === 'gone' ? 'TYRES GONE · BOX' : pr.tyres.state === 'worn' ? 'TYRES WORN' : v.damageWarning ?? '';
    wr.ctx.hud.tyreInfo = { compound: pr.tyres.compound, wear: pr.tyres.wear, pct: pr.tyres.pct, wheels: [0, 1, 2, 3].map((i) => pr.tyres.wheelWear(i)), warning: warn };   // the PHYSICS telemetry tab
    void dmg;
    // The tower.
    const lead = order[0];
    const rows = order.map((r, i) => ({
      pos: i + 1, code: r.e.code, colour: r.e.colour, me: r.e.player, out: r.retired,
      time: S.running || S.state === 'done' ? 0 : null,
      gap: i === 0 ? (S.state === 'chequer' || r.finished ? 'WINNER' : `LAP ${Math.min(S.laps, lead.laps + 1)}`) : r.lapsDown >= 1 ? `+${r.lapsDown} LAP` : `+${(r.interval ?? 0).toFixed(1)}`,
      status: r.dsq ? 'DSQ' : r.status === 'PIT' || r.status === 'PIT STOP' ? 'PIT' : r.retired ? 'DNF' : r.finished ? (r.penalty ? `+${r.penalty}s` : 'FIN') : r.inv ? 'INV' : r.driveThrough ? 'DT' : r.penalty ? `+${r.penalty}s` : r.blue ? 'BLUE' : '',
    }));
    const label = S.running ? `LAP ${Math.min(S.laps, lead.laps + 1)}/${S.laps}` : S.state === 'formation' ? 'FORMATION' : S.state === 'lights' ? 'START' : 'GRID';
    const rc = S.rc, st = rc.status;
    if (S.running) {
      const y = rc.yellowInfo(this.lastS);
      this.hud.flags({ status: st, delta: this.deltaShown == null ? null : Math.round(this.deltaShown * 10) / 10, yellow: y?.kind ?? null, turn: y?.turn, blue: this.lapper?.e.code ?? null,
        giveBack: this.giveBack?.x.e.code ?? null, dt: pr.driveThrough ? Math.max(0, pr.driveThrough.by - pr.laps - 1) : null, bw: this.t < this.bwUntil, green: this.t < this.greenUntil, black: this.black });
    }
    const clock = st === 'sc' || st === 'scIn' ? 'SAFETY CAR' : st === 'vsc' || st === 'vscEnd' ? 'VSC' : this.t < this.greenUntil ? 'GREEN' : S.label;
    const flag = S.state === 'chequer' ? 'chequer' : st === 'sc' || st === 'scIn' ? 'sc' : st === 'vsc' || st === 'vscEnd' ? 'vsc' : this.t < this.greenUntil ? 'green' : '';
    wr.ctx.hud.setSession({ label, clock, flag, rows: rows.map((r) => ({ ...r, time: r.time, status: r.time == null ? `P${order.find((x) => x.e.code === r.code)?.gridPos}` : r.status })), cut: null });
  }
  end() { this.hud.hideAll(); this.crews?.dispose(); this.crews = null; this.wr.field?.sc?.hide(); }
}
export { TEAMS };
