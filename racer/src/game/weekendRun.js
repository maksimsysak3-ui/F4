import { applyGridPenalties } from './fia.js?v=1a016bc';
import { Vector3 } from 'three';
import { Car, CAR } from '../ai/sim2d.js?v=1a016bc';
import { Field, planFor } from '../ai/field.js?v=1a016bc';
import { buildEntries } from './grid.js?v=1a016bc';
import { LiveSession, sessionsOf, liveWeather, fmtClock, fmtLap, SESSION_PACE } from './session.js?v=1a016bc';
import { TEAMS } from '../front/teams.js?v=1a016bc';
import { RaceRun } from './raceRun.js?v=1a016bc';
import { RaceSession, raceLaps } from './race.js?v=1a016bc';
import { impact as damageImpact } from '../physics/damage.js?v=1a016bc';
import { LIVERIES } from '../car/livery.js?v=1a016bc';

/*
 * Runs a race weekend inside the game: builds the field for the circuit (every other car, in its
 * team's garage), starts a session (clock, weather timeline, the AIs' programs), puts the player's car
 * in its pit box when they go out, times their laps with everyone else's (an out lap, a lap that went
 * through the pit lane or broke track limits doesn't count), lets the AIs see and touch the player's
 * car, brings them back to the garage, and keeps the session tower up to date.
 *
 * ctx (from main): scene, hud, CARS, getTrack(), getVehicle(), getSpec(), place(pose), useWeather(w),
 * onCrash(speed), settings.
 */
export class WeekendRun {
  constructor(ctx) {
    this.ctx = ctx;
    this.weekend = null; this.session = null; this.field = null; this.def = null;
    this.player = { car: new Car(99, { name: 'YOU', params: CAR }), onTrack: false, pushing: false };
    this.mode = 'garage';   // garage | track
    this.towerT = 0;
    this.lapFlags = { inPit: true, touchedPit: false, invalid: false };
    this.offTime = 0;
  }

  get active() { return !!this.weekend; }

  /** Get the circuit ready for the weekend: the field in its garages (no session running yet). */
  async prepare(weekend, { teamId, playerName, difficulty = 90, length = 'short', ratings = null }) {
    const track = this.ctx.getTrack(), spec = this.ctx.CARS.find((c) => c.id === 'f26') ?? this.ctx.CARS[1];
    this.dispose();
    this.weekend = weekend; this.length = length; this.teamId = teamId;
    this.ratings = ratings; this.rd = arguments[1]?.rd ?? null; this.mods = arguments[1]?.staff ?? null;   // the staff's effects (game/staff.js)
    this.gridPens = arguments[1]?.gridPens ?? []; this.pu = arguments[1]?.pu ?? null; this.banned = !!arguments[1]?.banned;   // the rules (game/fia.js, game/loadout.js)
    this.entries = buildEntries({ playerTeam: teamId, playerName, difficulty, ratings }).map((e) => ({ ...e, paint: 1 + Math.max(0, LIVERIES.findIndex(([id]) => id === e.team.livery)) }));
    this.playerEntry = this.entries.find((e) => e.player);
    // Pit boxes: the garages in championship order from the pit entry, both cars of a team in theirs.
    const pit = track.layout.pit;
    this.boxes = {};
    TEAMS.forEach((t, k) => { const s = pit.g0 + ((pit.g1 - pit.g0) * (k + 0.5)) / TEAMS.length; this.boxes[t.id] = [s - 2.5, s + 2.5]; });
    await new Promise((r) => setTimeout(r, 0));
    planFor(track);
    this.field = new Field({ track, scene: this.ctx.scene, spec, entries: this.entries.filter((e) => !e.player), boxes: this.boxes });
    this.mode = 'garage';
  }

  /** A new AI level: everyone's pace from the ratings again (takes effect at once). */
  setDifficulty(difficulty) {
    if (!this.entries) return;
    const fresh = buildEntries({ playerTeam: this.teamId, playerName: this.playerEntry.name, difficulty, ratings: this.ratings });
    for (const a of this.field?.cars ?? []) { const e = fresh.find((x) => x.id === a.entry.id); if (e) { a.entry.pace = e.pace; a.driver.setPace(e.pace); } }
  }

  sessions() { return this.weekend ? sessionsOf(this.weekend, this.length) : []; }

  /** Green light for a session: weather, clock, the AIs' run plans. */
  /**
   * The field's pace for a session type: on a Saturday the cars are light and on new softs and the
   * drivers wring their necks, so each one's deficit to the limit shrinks (qualifying most); in the
   * race a touch. (The entry's pace is the race-day baseline.)
   */
  sessionPace(kind) {
    const { keep, boost } = SESSION_PACE[kind] ?? SESSION_PACE.race;
    for (const a of this.field?.cars ?? []) { a.driver.setPace?.(1 - (1 - (a.entry.pace ?? 0.98)) * keep); a.driver.gripBoost = boost; }
  }

  start(def) {
    this.def = def;
    this.sessionPace(def.type);
    this.weather = liveWeather(this.weekend, def);
    this.ctx.useWeather(this.weather);
    for (const a of this.field.cars) { a.state = 'garage'; a.visual.root.visible = false; a.laps = []; a.best = null; a.bestSectors = [null, null, null]; a.lapType = null; a.run = null; a.nextRunAt = Infinity; a.tyreLaps = 0; }
    this.field.time = 0; this.field.race = null; this.field.onPitStop = null;
    for (const a of this.field.cars) { a.row = null; a.held = false; a.startAt = null; a.parked = false; a.pitStop = false; a.pitThisLap = false; a.driver.noPass = false; a.driver.paceMul = 1; }
    this.raceRun?.hud.hideAll();
    this.session = new LiveSession({ def, weekend: this.weekend, field: this.field, entries: this.entries, weather: this.weather, playerEntry: this.playerEntry });
    this.session.onChequer = () => this.ctx.hud.toast(this.session.playerFlyer ? 'CHEQUERED FLAG · FINISH YOUR LAP' : 'CHEQUERED FLAG', 3, 'best');
    this.session.playerPushing = () => this.mode === 'track' && this.player.pushing;
    this.session.onSegmentEnd = (cut) => { const me = cut.find((r) => r.e.player); if (me) { this.ctx.hud.toast(`KNOCKED OUT IN ${this.session.def.prefix}${this.session.segment + 1}`, 3); this.onKnockedOut?.(me); } };
    this.session.onDone = () => this.onSessionDone?.(this.session);
    this.compound = this.weather.wetness > 0.65 ? 'W' : this.weather.wetness > 0.25 ? 'I' : 'S';
    this.cleanLaps = 0;
    const fresh = this.rd?.specs ? Object.values(this.rd.fitted).map((id) => this.rd.specs.find((x) => x.id === id)).filter((x) => x && !x.validated) : [];
    if (fresh.length && def.type === 'practice') setTimeout(() => this.onRadio?.(`We have the new ${fresh.map((p) => `${p.name}`).join(' and ')} on the car. Give us ${this.mods?.corrLaps === 2 ? 'two' : 'three'} clean laps so we can correlate ${fresh.length > 1 ? 'them' : 'it'} with the tunnel.`), 1500);
  }

  /** A Sprint or the Grand Prix: straight onto the grid (length: short | medium | long | full). */
  startRace(def, length) {
    this.sessionPace('race');
    this.raceRun ??= new RaceRun(this);
    this.raceRun.start(def, length);
    this.strikes = 0; this.offTime = 0;
  }
  /** A race worked out without driving it (the result straight into the weekend). */
  simulateRace(def, length) {
    this.sessionPace('race');
    const track = this.ctx.getTrack();
    const q = this.weekend.results[def.id === 'S' ? 'SQ' : 'Q'];
    const grid = applyGridPenalties(q ? q.map((r) => r.id) : this.entries.slice().sort((a, b) => (b.pace ?? 0.98) - (a.pace ?? 0.98)).map((e) => e.id), def.id === 'R' ? this.gridPens : []);
    this.weather = liveWeather(this.weekend, def);
    const S = new RaceSession({ def, weekend: this.weekend, field: this.field, entries: this.entries, playerEntry: this.playerEntry, grid, laps: raceLaps(track.id, def.id === 'S' ? 'S' : 'R', length), track, weather: this.weather, length });
    S.simulate(this.field.plan.lapIdeal);
    this.def = def; this.session = S;
    return S;
  }
  get racing() { return this.session instanceof RaceSession; }
  /** The race's hold on the player's controls (grid, lights, pit stops). */
  controls(c) { if (this.racing && this.mode === 'track') this.raceRun.controls(c); }

  /** The player leaves the garage: their car in its box in the pit lane, pointing down the lane. */
  goOut(compound = this.compound) {
    const track = this.ctx.getTrack(), L = track.layout, box = this.boxes[this.teamId][0];
    const lat = this.field.laneLat(box);
    const pose = track.poseAt(box, lat);
    // Facing down the pit lane (the direction of the lap).
    this.ctx.place(pose);
    this.compound = compound;
    this.mode = 'track'; this.koPending = false;
    this.lapFlags = { inPit: true, touchedPit: true, invalid: false };
    this.offTime = 0;
    this.session.player.compound = compound;
  }

  /** Watch the session from the garage (the TV feed: see spectator.js). Not in a race. */
  watch() { if (this.session && !this.racing) { this.mode = 'watch'; this.player.onTrack = false; return true; } return false; }

  /** Back to the garage (stopped in the box, or from the menu): the session carries on without them. */
  toGarage() {
    if (this.racing && this.session.running && !this.session.player.finished) { this.session.player.retired = true; this.session.player.status = 'DNF'; this.ctx.hud.toast('RETIRED', 3, 'void'); }
    if (this.racing) this.raceRun?.hud.hideAll();
    this.mode = 'garage'; this.player.onTrack = false;
  }

  /** Leave the weekend: the field off the track, the weather back to free play's. */
  dispose() {
    this.raceRun?.end();
    this.field?.dispose();
    this.field = null; this.session = null; this.weekend = null; this.mode = 'garage';
  }

  /** The player's lap from the lap timer (only on track in a session). */
  playerLap(ev) {
    if (this.racing) return null; // a race keeps its own laps
    if (!this.session || ev.type !== 'lap') { if (ev?.type === 'start') this.lapFlags = { inPit: this.lapFlags.inPitNow, touchedPit: this.lapFlags.inPitNow, invalid: false }; return; }
    const f = this.lapFlags;
    const type = f.inPit ? 'out' : f.touchedPit ? 'in' : 'push';
    const rec = { time: ev.time, sectors: ev.sectors.slice(), type, compound: this.compound, valid: !f.invalid, at: this.field.time };
    // After the flag only the lap that was under way when it fell counts (and then it's the end).
    const started = this.session.state === 'green' || (this.session.state === 'chequer' && this.session.playerFlyer);
    if (started && !this.session.out.has(this.playerEntry.id)) this.session.lap(this.session.player, rec);
    if (this.session.state === 'chequer') this.session.playerFlyer = false;
    // New parts on the car: a few clean laps in practice correlate them with the tunnel.
    if (type === 'push' && !f.invalid && this.def?.type === 'practice') { this.cleanLaps = (this.cleanLaps ?? 0) + 1; if (this.cleanLaps === (this.mods?.corrLaps ?? 3)) this.onValidate?.(); }
    // Why a lap didn't count, every time (so a missing time is never a mystery).
    if (type === 'push' && f.invalid) this.ctx.hud.toast('LAP DELETED · TRACK LIMITS', 3.5, 'void');
    else if (type === 'out') this.ctx.hud.toast('OUT LAP · NOT TIMED · PUSH NOW', 3);
    else if (type === 'in') this.ctx.hud.toast('LAP THROUGH THE PIT LANE · NOT TIMED', 3);
    else if (!started) this.ctx.hud.toast(this.session.state === 'break' ? 'BETWEEN SEGMENTS · NOT TIMED' : 'SESSION OVER · NOT TIMED', 3);
    else if (this.session.out.has(this.playerEntry.id)) this.ctx.hud.toast('KNOCKED OUT · NOT TIMED', 3);
    rec.limitsAt = f.limitsAt;
    this.lapFlags = { inPit: f.inPitNow, touchedPit: f.inPitNow, invalid: false, inPitNow: f.inPitNow };
    return rec;
  }

  /** Every frame while a weekend is on: the session clock, the field, the player's state, the tower. */
  update(dt, camera, { inPitLane, paused }) {
    if (!this.weekend || !this.field) return;
    const v = this.ctx.getVehicle(), track = this.ctx.getTrack();
    if (!paused && this.session) this.session.update(dt);
    // The player's car as the AIs see it.
    const p = this.player, on = this.mode === 'track' && !inPitLane;
    this.lapFlags.inPitNow = inPitLane;
    if (inPitLane) this.lapFlags.touchedPit = true;
    if (this.mode === 'track') {
      const b = v.body, fwd = v.forward, h = Math.atan2(fwd.z, fwd.x);
      Object.assign(p.car, { x: b.position.x, z: b.position.z, h, u: Math.max(0, v.forwardSpeed), vlat: b.velocity.x * -Math.sin(h) + b.velocity.z * Math.cos(h), r: b.angularVelocity.y });
      // Track limits, a little generous: the whole car well past the kerb (all four wheels beyond it
      // by ~0.8 m) for over half a second deletes the lap. Wheels in the air don't count, nor the
      // pit entry and exit roads. The driver is told at once, and where.
      const L = track.layout, n = L.nearest(b.position.x, b.position.z), pit = L.pit;
      const pitSide = pit && n && pit.into(n.s) !== null && Math.sign(n.lateral) === (pit.side === 'L' ? 1 : -1);
      const beyond = n ? Math.abs(n.lateral) - (L.halfW + L.kerbW + 1.0 + 0.8) : -1;
      const airborne = v.wheels.every((w) => !w.inContact);
      if (beyond > 0 && !airborne && !inPitLane && !pitSide && !this.lapFlags.inPit && !this.lapFlags.touchedPit) this.offTime += dt;
      else this.offTime = Math.max(0, this.offTime - dt * 2);
      if (this.racing && this.offTime > 0.6 && !this.limitsNoted) {
        // In a race: race control counts them (three, then the black-and-white flag, then penalties).
        this.limitsNoted = true;
        const k = this.session.rc.trackLimits(this.session.player, n.s) ?? 0;
        if (k > 3) { this.ctx.hud.toast('TRACK LIMITS · REPORTED TO THE STEWARDS', 4, 'void'); this.onRadio?.('Track limits again. That has gone to the stewards, it will be a penalty.'); }
        else { this.ctx.hud.toast(`TRACK LIMITS · WARNING ${k}/3${k === 3 ? ' · BLACK AND WHITE FLAG' : ''}`, 3.5, 'void'); if (k < 3) this.onLimits?.(n.s); }
      }
      if (this.offTime === 0) this.limitsNoted = false;
      if (!this.racing && this.offTime > 0.6 && !this.lapFlags.invalid) {
        this.lapFlags.invalid = true; this.lapFlags.limitsAt = n.s;
        this.ctx.hud.toast('TRACK LIMITS · THIS LAP WILL BE DELETED', 3.5, 'void');
        this.onLimits?.(n.s);
      }
    }
    p.onTrack = on;
    p.pushing = on && !this.lapFlags.inPit && !this.lapFlags.touchedPit;
    p.row = this.racing ? this.session.player : null;
    // Knocked out but still out there (or back out after it): the car goes back to the pits.
    if (this.mode === 'track' && !this.racing && this.session?.out.has(this.session.player.id) && this.session.state !== 'break' && !this.koPending) { this.koPending = true; this.onKnockedOut?.(this.session.player); }
    if (this.racing && this.mode === 'track' && !paused) this.raceRun.update(dt, { inPitLane });
    if (!paused) {
      const hit = this.field.update(dt, p.onTrack ? p : null, this.weather);
      if (hit && this.mode === 'track') {
        const b = v.body;
        b.velocity.x += hit.dvx; b.velocity.z += hit.dvz; b.position.x += hit.dx; b.position.z += hit.dz;
        const s = Math.hypot(hit.dvx, hit.dvz);
        if (s > 1.5) this.ctx.onCrash?.(s);
        // Car-to-car contact damages the part that was hit (the push is away from the other car).
        if (s > 2.5) {
          const yaw = Math.atan2(v.forward.z, v.forward.x), c = Math.cos(yaw), sn = Math.sin(yaw);
          const along = -(hit.dvx * c + hit.dvz * sn), left = -(hit.dvx * -sn + hit.dvz * c);
          const said = damageImpact(v, s * 1.6, { dir: { x: -left, z: along } });
          if (said) this.onRadio?.(said);
        }
      }
    }
    this.field.draw(dt, camera);
    // Tower, four times a second.
    this.towerT -= dt;
    if (this.towerT <= 0 && this.session && !this.racing) { this.towerT = 0.25; this.drawTower(inPitLane); }
    void track;
  }

  playerStatus(inPitLane) {
    if (this.mode === 'garage') return 'GARAGE';
    if (inPitLane) return 'PIT';
    return this.lapFlags.inPit ? 'OUT LAP' : this.lapFlags.touchedPit ? 'IN LAP' : 'FLYING';
  }

  drawTower(inPitLane) {
    const S = this.session, hud = this.ctx.hud;
    S.refreshStatus(this.playerStatus(inPitLane));
    const order = S.standings(), quali = S.def.type === 'quali', seg = S.segment;
    const key = (r) => (quali ? r.segBest[seg] : r.best);
    const lead = key(order[0]);
    const rows = order.map((r, k) => {
      const t = S.out.has(r.id) ? null : key(r);
      return { pos: k + 1, code: r.e.code, colour: r.e.colour, time: t, gap: t == null ? '' : k === 0 || lead == null ? fmtLap(t) : `+${(t - lead).toFixed(3)}`, status: r.status, me: this.mode === 'watch' ? r.ai != null && r.ai === this.watching : r.e.player, out: S.out.has(r.id) };
    });
    const clock = S.state === 'break' ? `NEXT ${fmtClock(S.breakLeft)}` : fmtClock(S.remaining);
    hud.setSession({ label: S.label, clock, flag: S.state === 'chequer' ? 'chequer' : S.state === 'break' ? 'break' : '', rows, cut: quali && seg < 2 ? (seg === 0 ? 16 : 10) : null });
    hud.trackSectors = S.overall.sectors;
  }

  /** The player's car is stopped in its box (to offer going back into the garage). */
  inBox() {
    if (this.mode !== 'track') return false;
    const v = this.ctx.getVehicle(), track = this.ctx.getTrack(), L = track.layout;
    const n = L.nearest(v.body.position.x, v.body.position.z);
    if (!n) return false;
    const box = this.boxes[this.teamId][0], d = Math.abs(((n.s - box) % L.length + 1.5 * L.length) % L.length - L.length / 2);
    return d < 8 && Math.abs(v.forwardSpeed) < 1 && Math.sign(n.lateral) === this.field.sg && Math.abs(n.lateral) > L.wall[L.pit.side][n.i];
  }
}
export { fmtLap, fmtClock };
void Vector3;
