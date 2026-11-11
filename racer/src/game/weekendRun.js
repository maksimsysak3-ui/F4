import { Vector3 } from 'three';
import { Car, CAR } from '../ai/sim2d.js';
import { Field, planFor } from '../ai/field.js';
import { buildEntries } from './grid.js';
import { LiveSession, sessionsOf, liveWeather, fmtClock, fmtLap } from './session.js';
import { TEAMS } from '../front/teams.js';
import { LIVERIES } from '../car/livery.js';

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
  async prepare(weekend, { teamId, playerName, difficulty = 90, length = 'short' }) {
    const track = this.ctx.getTrack(), spec = this.ctx.CARS.find((c) => c.id === 'f26') ?? this.ctx.CARS[1];
    this.dispose();
    this.weekend = weekend; this.length = length; this.teamId = teamId;
    this.entries = buildEntries({ playerTeam: teamId, playerName, difficulty }).map((e) => ({ ...e, paint: 1 + Math.max(0, LIVERIES.findIndex(([id]) => id === e.team.livery)) }));
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
    const fresh = buildEntries({ playerTeam: this.teamId, playerName: this.playerEntry.name, difficulty });
    for (const a of this.field?.cars ?? []) { const e = fresh.find((x) => x.id === a.entry.id); if (e) { a.entry.pace = e.pace; a.driver.setPace(e.pace); } }
  }

  sessions() { return this.weekend ? sessionsOf(this.weekend, this.length) : []; }

  /** Green light for a session: weather, clock, the AIs' run plans. */
  start(def) {
    this.def = def;
    this.weather = liveWeather(this.weekend, def);
    this.ctx.useWeather(this.weather);
    for (const a of this.field.cars) { a.state = 'garage'; a.visual.root.visible = false; a.laps = []; a.best = null; a.bestSectors = [null, null, null]; a.lapType = null; a.run = null; a.nextRunAt = Infinity; a.tyreLaps = 0; }
    this.field.time = 0;
    this.session = new LiveSession({ def, weekend: this.weekend, field: this.field, entries: this.entries, weather: this.weather, playerEntry: this.playerEntry });
    this.session.onChequer = () => this.ctx.hud.toast('CHEQUERED FLAG', 3, 'best');
    this.session.onSegmentEnd = (cut) => { if (cut.some((r) => r.e.player)) this.ctx.hud.toast(`KNOCKED OUT IN ${this.session.def.prefix}${this.session.segment + 1}`, 3); };
    this.session.onDone = () => this.onSessionDone?.(this.session);
    this.compound = this.weather.wetness > 0.65 ? 'W' : this.weather.wetness > 0.25 ? 'I' : 'S';
  }

  /** The player leaves the garage: their car in its box in the pit lane, pointing down the lane. */
  goOut(compound = this.compound) {
    const track = this.ctx.getTrack(), L = track.layout, box = this.boxes[this.teamId][0];
    const lat = this.field.laneLat(box);
    const pose = track.poseAt(box, lat);
    // Facing down the pit lane (the direction of the lap).
    this.ctx.place(pose);
    this.compound = compound;
    this.mode = 'track';
    this.lapFlags = { inPit: true, touchedPit: true, invalid: false };
    this.offTime = 0;
    this.session.player.compound = compound;
  }

  /** Back to the garage (stopped in the box, or from the menu): the session carries on without them. */
  toGarage() { this.mode = 'garage'; this.player.onTrack = false; }

  /** Leave the weekend: the field off the track, the weather back to free play's. */
  dispose() {
    this.field?.dispose();
    this.field = null; this.session = null; this.weekend = null; this.mode = 'garage';
  }

  /** The player's lap from the lap timer (only on track in a session). */
  playerLap(ev) {
    if (!this.session || ev.type !== 'lap') { if (ev?.type === 'start') this.lapFlags = { inPit: this.lapFlags.inPitNow, touchedPit: this.lapFlags.inPitNow, invalid: false }; return; }
    const f = this.lapFlags;
    const type = f.inPit ? 'out' : f.touchedPit ? 'in' : 'push';
    const rec = { time: ev.time, sectors: ev.sectors.slice(), type, compound: this.compound, valid: !f.invalid, at: this.field.time };
    const started = this.session.state === 'green' || this.session.state === 'chequer';
    if (started && !this.session.out.has(this.playerEntry.id)) this.session.lap(this.session.player, rec);
    if (type === 'push' && f.invalid) this.ctx.hud.toast('LAP DELETED · TRACK LIMITS', 2.2, 'void');
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
      // Track limits: all four wheels off the track for a moment deletes the lap.
      const off = v.wheels.every((w) => !w.inContact || w.surface === 'grass' || w.surface === 'gravel');
      this.offTime = off ? this.offTime + dt : 0;
      if (this.offTime > 0.25 && !this.lapFlags.invalid && !inPitLane) { this.lapFlags.invalid = true; this.ctx.hud.toast('TRACK LIMITS', 1.4, 'void'); }
    }
    p.onTrack = on;
    p.pushing = on && !this.lapFlags.inPit && !this.lapFlags.touchedPit;
    if (!paused) {
      const hit = this.field.update(dt, p.onTrack ? p : null, this.weather);
      if (hit && this.mode === 'track') {
        const b = v.body;
        b.velocity.x += hit.dvx; b.velocity.z += hit.dvz; b.position.x += hit.dx; b.position.z += hit.dz;
        const s = Math.hypot(hit.dvx, hit.dvz);
        if (s > 1.5) this.ctx.onCrash?.(s);
      }
    }
    this.field.draw(dt, camera);
    // Tower, four times a second.
    this.towerT -= dt;
    if (this.towerT <= 0 && this.session) { this.towerT = 0.25; this.drawTower(inPitLane); }
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
      return { pos: k + 1, code: r.e.code, colour: r.e.colour, time: t, gap: t == null ? '' : k === 0 || lead == null ? fmtLap(t) : `+${(t - lead).toFixed(3)}`, status: r.status, me: r.e.player, out: S.out.has(r.id) };
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
