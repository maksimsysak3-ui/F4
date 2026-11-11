import { RaceSession, raceLaps } from './race.js';
import { COMPOUNDS, fuelAt, fuelLoss } from './tyres.js';
import { liveWeather } from './session.js';
import { PitCrews } from './pitCrew.js';
import { RaceHud } from '../raceHud.js';
import { TEAMS } from '../front/teams.js';

/*
 * The player's side of a race weekend's Sprint or Grand Prix: puts the car on its grid box, runs the
 * formation lap (no overtaking, back to the box, parked as close as you can), holds the car through the
 * start lights, the clutch launch (hold SPACE as the clutch with the revs up; let it go when the lights
 * go out: the reaction time and the revs decide the getaway; let go early and it's a jump start), then
 * the race: the tyres wear with how the car is driven, the engineer calls the stop, the crew changes
 * the tyres in the box, and the race tower and the race panel keep it all in view.
 */
const wrapS = (L, s) => ((s % L.length) + L.length) % L.length;
const dsWrap = (L, a, b) => { let d = b - a; if (d > L.length / 2) d -= L.length; if (d < -L.length / 2) d += L.length; return d; };
const TYRE_NAME = { S: 'softs', M: 'mediums', H: 'hards', I: 'inters', W: 'full wets' };

export class RaceRun {
  constructor(wr) {
    this.wr = wr;
    this.hud = new RaceHud();
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
    const grid = q ? q.map((r) => r.id) : wr.entries.slice().sort((a, b) => (b.pace ?? 0.98) - (a.pace ?? 0.98)).map((e) => e.id);
    const laps = raceLaps(track.id, def.id === 'S' ? 'S' : 'R', length);
    const S = new RaceSession({ def, weekend: wr.weekend, field, entries: wr.entries, playerEntry: wr.playerEntry, grid, laps, track, weather: wr.weather, length });
    wr.session = S;
    field.placeGrid(S);
    this.crews ??= new PitCrews(ctx.scene);
    field.onPitStop = (a, len) => this.crewAt(a.entry.team, a.car.x, a.car.z, a.car.h, len);
    // The player's car on its box.
    const pr = S.player;
    ctx.place(track.poseAt(pr.slotS, pr.slotLat));
    wr.mode = 'track';
    const v = ctx.getVehicle();
    v.compound = pr.tyres.compound; v.gripScale = 1; v.launchScale = 1;
    Object.assign(this, { t: 0, lastS: pr.slotS, formDist: 0, parked: false, parkVerdict: '', armed: false, released: false, goAt: null, stopping: null, boxCalled: false, finished: false, towerT: 0, hudT: 0, lastPlace: null, launchUntil: 0, allParkedAt: null });
    S.onLight = (n) => { this.hud.lights(n); ctx.audio?.beep?.(660, 0.12); };
    S.onStart = () => { field.raceStart(); this.hud.lightsOut(); this.goAt = this.t; ctx.audio?.beep?.(990, 0.25); };
    S.onChequer = () => this.hud.banner('CHEQUERED FLAG', 'chequer');
    S.onPlayerFinish = (pos) => this.playerFinished(pos);
    S.onDone = () => { this.hud.hideAll(); wr.onSessionDone?.(S); };
    S.onLap = (r) => { if (r === pr) this.playerLap(); };
    this.hud.hideAll();
    this.hud.banner(`${S.label === 'SPRINT' ? 'SPRINT' : 'GRAND PRIX'} · ${laps} LAPS · P${pr.gridPos} ON THE GRID`);
    this.radio(`On the grid, P${pr.gridPos}. ${laps} laps today. Start on the ${TYRE_NAME[pr.tyres.compound]}. Formation lap shortly.`);
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
        this.released = true; this.armed = false; S.player.penalty += 5;
        wr.ctx.hud.toast('JUMP START · 5 SECOND PENALTY', 4, 'void');
        this.radio('Jump start. We have a five second penalty.');
      }
      if (this.armed) held = true;
    }
    if (S.running && !this.released) {
      const since = this.t - (this.goAt ?? this.t);
      if (this.armed ? !clutch : since > 0.4) this.launch(c.throttle, this.armed ? since : 0.4);
      else held = true;
    }
    if (held) { c.brake = 1; c.handbrake = 0; if (S.state !== 'lights' && !this.armed) c.throttle = 0; }
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
      const severity = Math.max(0.75, Math.min(2.6, 0.75 + Math.max(0, slip - 0.35) * 1.8));
      if (d > 0) pr.tyres.run(d, L.length, severity);
      // Overtake mode (the 2026 rules' extra electrical deployment): within a second of the car ahead.
      const om = pr.laps >= 1 && (pr.interval ?? 9) < 1.0 && (pr.pos ?? 1) > 1;
      v.powerScale = (om ? 1.07 : 1) * (v.damagePower ?? 1);
      if (om !== this.om) { this.om = om; if (om) ctx.hud.toast('OVERTAKE MODE', 1.2, 'best'); }
      const fuel = fuelLoss(fuelAt(pr.laps / S.laps));
      v.compound = pr.tyres.compound;
      v.gripScale = pr.tyres.grip / (1 + fuel) ** 2;
      // The engineer's call to pit, and the stop itself.
      if (!this.boxCalled && S.wantsPit(pr) && !inPitLane) {
        this.boxCalled = true; this.boxFor = S.nextCompound(pr);
        this.radio(`Box, box. Box this lap for ${TYRE_NAME[this.boxFor]}.`);
      }
      this.hud.pit(this.stopping ? `PIT STOP ${(Math.max(0, this.stopping.until - this.t)).toFixed(1)}` : this.boxCalled && !inPitLane ? 'BOX BOX' : '', this.stopping ? 'stop' : 'box');
      if (inPitLane && !this.stopping && wr.inBox()) {
        const len = 2.0 + Math.random() * 0.7;
        this.stopping = { until: this.t + len, len };
        this.crewAt(wr.playerEntry.team, b.x, b.z, Math.atan2(v.forward.z, v.forward.x), len);
      }
      if (this.stopping && this.t >= this.stopping.until) {
        const c = this.boxFor ?? S.nextCompound(pr);
        S.pitDone(pr, c);
        ctx.hud.toast(`${this.stopping.len.toFixed(1)} s STOP · ${COMPOUNDS[c].name.toUpperCase()}`, 3, 'best');
        this.radio(`Good stop, ${this.stopping.len.toFixed(1)} seconds. On the ${TYRE_NAME[c]}. Watch the pit exit line.`);
        this.stopping = null; this.boxCalled = false; this.boxFor = null;
      }
    } else this.hud.pit('');
    // ---- HUD: the race panel, the car, the tower ----
    this.hudT -= dt;
    if (this.hudT <= 0) { this.hudT = 0.2; this.drawHud(); }
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
    this.finished = true;
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
        last: pr.last, best: pr.best, pits: pr.pits, penalty: pr.penalty });
    } else this.hud.info(false);
    const dmg = v.damageParts ?? {};
    const warn = pr.tyres.state === 'gone' ? 'TYRES GONE · BOX' : pr.tyres.state === 'worn' ? 'TYRES WORN' : v.damageWarning ?? '';
    this.hud.car(wr.mode === 'track', { tyres: { compound: pr.tyres.compound, wear: pr.tyres.wear, pct: pr.tyres.pct }, damage: dmg, warning: warn });
    // The tower.
    const lead = order[0];
    const rows = order.map((r, i) => ({
      pos: i + 1, code: r.e.code, colour: r.e.colour, me: r.e.player, out: r.retired,
      time: S.running || S.state === 'done' ? 0 : null,
      gap: i === 0 ? (S.state === 'chequer' || r.finished ? 'WINNER' : `LAP ${Math.min(S.laps, lead.laps + 1)}`) : r.lapsDown >= 1 ? `+${r.lapsDown} LAP` : `+${(r.interval ?? 0).toFixed(1)}`,
      status: r.status === 'PIT' || r.status === 'PIT STOP' ? 'PIT' : r.retired ? 'DNF' : r.finished ? 'FIN' : r.blue ? 'BLUE' : '',
    }));
    const label = S.running ? `LAP ${Math.min(S.laps, lead.laps + 1)}/${S.laps}` : S.state === 'formation' ? 'FORMATION' : S.state === 'lights' ? 'START' : 'GRID';
    wr.ctx.hud.setSession({ label, clock: S.label, flag: S.state === 'chequer' ? 'chequer' : '', rows: rows.map((r) => ({ ...r, time: r.time, status: r.time == null ? `P${order.find((x) => x.e.code === r.code)?.gridPos}` : r.status })), cut: null });
  }
  end() { this.hud.hideAll(); this.crews?.dispose(); this.crews = null; }
}
export { TEAMS };
