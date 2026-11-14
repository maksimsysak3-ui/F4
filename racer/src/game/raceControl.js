import { cornersOf } from '../engineerBrain.js?v=1a016bc';
import { DRIVERS } from './grid.js?v=1a016bc';

/*
 * Race control and the FIA stewards, run the way a Grand Prix's are.
 *
 * Track status (the race director)
 *   green      racing
 *   vsc        Virtual Safety Car: every car slows to the VSC delta (a minimum time through each part of
 *              the lap) and holds station; no overtaking. "VSC ENDING" ~10-15 s before it goes green.
 *   sc         Safety Car: the SC leaves the pit exit in front of the leader and the field queues
 *              behind it (SC delta until a car has caught the queue), no overtaking, lapped cars stay
 *              where they are. Once the track is clear: "SAFETY CAR IN THIS LAP", the SC pits at the end
 *              of the lap, the leader sets the pace to the line; racing from the control line.
 *   yellows    local: a car stopped at the side of the track (single), on the racing line or a marshal
 *              at work (double): slow down, no overtaking in that part of the lap.
 *   DRS        disabled under VSC and SC, enabled again two laps after the restart.
 *
 * What brings them out: a car stopped on track (a crash, a failure, heavy contact), debris. Where it
 * stopped and why decides between the yellows, the VSC and the SC; the recovery takes time.
 *
 * The stewards: an incident is NOTED (the message names the cars, the turn and the offence), then
 * either REVIEWED NO FURTHER INVESTIGATION, or UNDER INVESTIGATION and, a little later, decided:
 * NO FURTHER ACTION, or a penalty. Offences: causing a collision (who hit whom: from behind, or moving
 * across a car alongside), track limits (warnings, the black-and-white flag after the third, then 5 s
 * and 10 s), a false start, pit lane speeding, an unsafe release, overtaking under the Safety Car or
 * yellows, not respecting the VSC delta, ignoring blue flags. Penalties:
 *   5 s / 10 s time penalty   served at the car's next stop (the crew waits before touching the car),
 *                             or added to its race time at the end
 *   drive-through             through the pit lane at the limit within three laps, or the black flag
 *   black flag                disqualified
 * The first lap is judged more leniently (a pack into turn 1), contact under a neutralisation harder.
 */
export const NUMBERS = { NOR: 1, PIA: 81, LEC: 16, HAM: 44, VER: 3, HAD: 6, RUS: 63, ANT: 12, ALO: 14, STR: 18, ALB: 23, SAI: 55, LAW: 30, LIN: 41, GAS: 10, COL: 43, OCO: 31, BEA: 87, HUL: 27, BOR: 5, PER: 11, BOT: 77 };
export const PEN = {
  nfa: { name: 'NO FURTHER ACTION', short: 'NFA' },
  t5: { name: '5 SECOND TIME PENALTY', short: '+5s', sec: 5 },
  t10: { name: '10 SECOND TIME PENALTY', short: '+10s', sec: 10 },
  dt: { name: 'DRIVE THROUGH PENALTY', short: 'DT' },
  dsq: { name: 'BLACK FLAG', short: 'DSQ' },
};
const NEUTRAL = { vsc: 'vsc', vscEnd: 'vsc', sc: 'sc', scIn: 'sc' };

export class RaceControl {
  constructor(race) {
    this.race = race; this.L = race.L;
    this.R = race.R;
    this.t = 0;
    this.status = 'green';
    this.msgs = [];            // every message, in order (the race's log)
    this.cases = [];           // open investigations
    this.decisions = [];       // { lap, car, pen, reason } (for the classification)
    this.periods = [];         // { kind: 'SC' | 'VSC', from: lap, to: lap }
    this.yellows = [];         // { s, double, until, turn }
    this.stopped = [];         // cars stopped on track: { r, s, recoverAt, cause }
    this.pairT = new Map();    // contact pairs recently noted
    this.drsLap = 2;           // DRS from this leader lap (the start: from lap 3)
    this.nextRoll = 1;         // the leader lap of the next random incident check
    this.onMessage = null;     // (msg) => ...
    this.onStatus = null;      // (status, prev) => ...
    this.onRecovered = null;   // (row) => ...  (the field removes the car)
    this.onIncident = null;    // (kind) => ...  (the field makes a car crash out)
  }

  // ------------------------------------------------------------------------------- naming
  num(r) { return NUMBERS[r.e.code] ?? NUMBERS[DRIVERS[r.e.team.drivers[r.e.seat ?? 0]?.name]?.code] ?? 99; }
  car(r) { return `CAR ${this.num(r)} (${r.e.code})`; }
  turn(s) {
    const cs = cornersOf(this.L);
    if (!cs.length) return `TRACK SECTOR ${1 + Math.floor((wrap(this.L, s) / this.L.length) * 20)}`;
    let best = cs[0], bd = Infinity;
    for (const c of cs) { const d = Math.abs(dsw(this.L, s, c.s)); if (d < bd) { bd = d; best = c; } }
    return `TURN ${best.n}`;
  }
  get lap() { return this.race.leaderLap ?? 1; }
  get neutral() { return NEUTRAL[this.status] ?? null; }
  get drsOn() { return this.status === 'green' && this.lap >= this.drsLap; }
  /** Yellow flags at s: null, 'single' or 'double'. */
  yellowAt(s) {
    let y = null;
    for (const z of this.yellows) if (Math.abs(dsw(this.L, z.s, s)) < 260 || (dsw(this.L, s, z.s) > 0 && dsw(this.L, s, z.s) < 420)) y = z.double ? 'double' : (y ?? 'single');
    return y;
  }

  /** A message on the race control feed. */
  msg(text, kind = 'info', cars = [], head = 'RACE CONTROL') {
    const m = { t: this.race.t, lap: this.lap, text, kind, head, cars: cars.map((r) => r.id), player: cars.some((r) => r.e.player) };
    this.msgs.push(m);
    this.onMessage?.(m);
    return m;
  }
  stewards(text, kind, cars) { return this.msg(`FIA STEWARDS: ${text}`, kind, cars, 'FIA STEWARDS'); }

  // ------------------------------------------------------------------------------- the stewards
  /**
   * Car-to-car contact (from the 2D physics): a, b the rows; info { rel (closing speed, m/s), dsAB (b's
   * distance ahead of a along the track), latAB (b's offset to a's left), vnA, vnB (lateral velocities,
   * left +), s }. Decides whether it's noted and who was to blame.
   */
  contact(a, b, info) {
    const race = this.race;
    if (!race.running || a.finished || b.finished || a.retired || b.retired) return;
    if (info.rel < 3) return;
    if (this.cases.length >= 6 && info.rel < 8) return;          // a busy moment: only the heavy ones
    const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
    if (this.t - (this.pairT.get(key) ?? -1e9) < 12) return;
    this.pairT.set(key, this.t);
    // Who: a car hitting the one ahead from behind, or the one that moved across into a car alongside.
    let guilty, victim, blame;
    if (Math.abs(info.dsAB) > 2.6) {
      const rear = info.dsAB > 0 ? a : b, front = rear === a ? b : a;
      const frontAcross = Math.abs(rear === a ? info.vnB : info.vnA);
      guilty = rear; victim = front;
      blame = 0.8 + Math.min(0.15, (info.rel - 3) * 0.02) - Math.min(0.3, frontAcross * 0.12);   // a late move by the car ahead shares it
    } else {
      const side = Math.sign(info.latAB) || 1;
      const towardA = info.vnA * side, towardB = -info.vnB * side;     // each car's speed towards the other
      if (Math.abs(towardA - towardB) < 0.5) { guilty = info.rel > 6 ? (towardA > towardB ? a : b) : null; blame = 0.5; }
      else { guilty = towardA > towardB ? a : b; blame = 0.62 + Math.min(0.3, Math.abs(towardA - towardB) * 0.12); }
      victim = guilty === a ? b : a;
    }
    if (this.lap <= 1) blame -= 0.14;               // the opening lap: a pack, a lot more lenient
    if (this.neutral) blame += 0.12;
    const where = this.turn(info.s), who = `${where} INCIDENT INVOLVING CARS ${this.num(a)} (${a.e.code}) AND ${this.num(b)} (${b.e.code})`;
    const reason = this.neutral ? 'COLLISION UNDER SAFETY CAR' : 'CAUSING A COLLISION';
    if (!guilty || blame < 0.62) {
      if (info.rel > 5.5) this.open({ cars: [a, b], text: who, reason: 'CAUSING A COLLISION', dismiss: true, noteIn: 2, invIn: 10 + this.R() * 14 });
      return;
    }
    // Light touches are mostly reviewed and dismissed; harder ones go to an investigation.
    const dismiss = info.rel < 4.5 && this.R() < 0.45;
    this.open({
      cars: [a, b], guilty, victim, text: who, reason, dismiss, rel: info.rel, blame,
      noteIn: 1.5 + this.R() * 2, invIn: 6 + this.R() * 8, decideIn: 30 + this.R() * 45,
      judge: () => {
        // The consequence decides it: the other car out of the race, a heavy hit, or nothing much.
        if (victim.retired || info.rel > 11) return 't10';
        if (blame < 0.72 && info.rel < 5 && !(victim.ai?.dmg > 0.35) && !victim.needsNose) return 'nfa';
        return 't5';
      },
    });
  }
  /**
   * An offence with a known outcome (track limits, a false start, speeding...): noted, investigated,
   * decided. pen: the penalty key; quick: decided fast (track limits, a false start is clear-cut).
   */
  offence(r, reason, pen, { s = null, quick = false, cars = [r], note = null } = {}) {
    if (r.finished && !['TRACK LIMITS', 'IGNORING BLUE FLAGS'].includes(reason)) return;
    const where = s != null ? `${this.turn(s)} ` : '';
    this.open({ cars, guilty: r, text: note ?? `${where}${this.car(r)}`.trim(), reason, judge: () => pen,
      noteIn: 1 + this.R() * 2, invIn: quick ? 4 + this.R() * 3 : 6 + this.R() * 8, decideIn: quick ? 12 + this.R() * 10 : 28 + this.R() * 35, skipNote: quick && reason === 'TRACK LIMITS' });
  }
  open(c) {
    c.t0 = this.t; c.stage = 'pending';
    c.noteAt = this.t + (c.noteIn ?? 2); c.invAt = c.noteAt + (c.invIn ?? 8); c.decideAt = c.invAt + (c.decideIn ?? 40);
    this.cases.push(c);
  }
  /** Track limits: the warnings, the black-and-white flag, then penalties. */
  trackLimits(r, s) {
    if (!this.race.running || r.retired) return;
    r.limits = (r.limits ?? 0) + 1;
    const n = r.limits;
    this.msg(`${this.car(r)} TRACK LIMITS AT ${this.turn(s)} LAP ${Math.max(1, r.laps + 1)}`, 'limits', [r]);
    if (n === 3) this.msg(`BLACK AND WHITE FLAG FOR ${this.car(r)} - TRACK LIMITS`, 'bw', [r]);
    if (n >= 4) this.offence(r, 'TRACK LIMITS', n === 4 ? 't5' : 't10', { quick: true, note: `${this.car(r)} - TRACK LIMITS (${n} TIMES)` });
    return n;
  }
  /** A penalty applied to a car (time penalties to serve; a drive-through to take within three laps). */
  penalise(r, key, reason) {
    const p = PEN[key];
    if (!p || key === 'nfa') return;
    r.pens ??= [];
    r.pens.push({ key, reason, lap: r.laps + 1, served: false });
    this.decisions.push({ lap: this.lap, id: r.id, code: r.e.code, pen: key, reason });
    // A car that has already finished: the time goes on its race time (a drive-through becomes 20 s).
    const sec = p.sec ?? (key === 'dt' && r.finished ? 20 : 0);
    if (sec) { if (r.finished && Number.isFinite(r.finishT)) r.finishT += sec; else r.penalty += sec; r.penTotal = (r.penTotal ?? 0) + sec; }
    if (key === 'dt' && !r.finished) r.driveThrough = { by: r.laps + 3, reason };
    if (key === 'dsq') this.disqualify(r, reason);
  }
  /** A car served its time penalties at a stop (sec) or its drive-through. */
  served(r, what) {
    for (const p of r.pens ?? []) if (!p.served && (what === 'dt' ? p.key === 'dt' : PEN[p.key].sec)) p.served = true;
    if (what === 'dt') r.driveThrough = null;
    this.stewards(`PENALTY SERVED - ${what === 'dt' ? 'DRIVE THROUGH PENALTY' : 'TIME PENALTY'} FOR ${this.car(r)}`, 'served', [r]);
  }
  disqualify(r, reason) {
    if (r.dsq) return;
    r.dsq = true; r.retired = true; r.status = 'DSQ';
    this.msg(`BLACK FLAG FOR ${this.car(r)} - ${reason}`, 'black', [r]);
    this.onRetire?.(r, 'dsq');
  }

  // ------------------------------------------------------------------------------- track status
  /** A car has stopped on track (cause: 'crash' | 'failure' | 'damage' | 'stopped'). Decides the response. */
  stoppedCar(r, s, cause) {
    const race = this.race;
    if (!race.running) return;
    const lapsLeft = race.laps - (race.leader?.laps ?? 0);
    const turn = this.turn(s);
    this.msg(`${this.car(r)} STOPPED AT ${turn}`, 'info', [r]);
    // Where: in a run-off with a crane nearby is a yellow; at the side of the track a VSC; in the
    // barriers or with debris on the racing line, the Safety Car.
    const x = this.R(), late = lapsLeft <= 2;
    let call = cause === 'crash' || cause === 'damage' ? (x < 0.3 ? 'sc' : x < 0.65 ? 'vsc' : 'yellow') : (x < 0.12 ? 'sc' : x < 0.45 ? 'vsc' : 'yellow');
    if (late && call === 'sc') call = 'vsc';
    if (this.neutral === 'sc') call = 'sc';
    else if (this.neutral === 'vsc' && call !== 'sc') call = 'vsc';
    const recover = call === 'sc' ? 85 + this.R() * 70 : call === 'vsc' ? 45 + this.R() * 45 : 35 + this.R() * 40;
    this.stopped.push({ r, s, cause, recoverAt: this.t + recover });
    this.yellows.push({ s, double: call !== 'yellow' || cause !== 'failure', until: this.t + recover + 6, turn });
    this.msg(`${call !== 'yellow' || cause !== 'failure' ? 'DOUBLE YELLOW' : 'YELLOW'} FLAG AT ${turn}`, 'yellow');
    if (call === 'sc') this.deploySC(`CAR ${this.num(r)} STOPPED`);
    else if (call === 'vsc') this.deployVSC();
  }
  /** A stopped car (the player's) got going again: nothing left to recover there. */
  unstop(r) { for (const x of this.stopped) if (x.r === r) x.recoverAt = Math.min(x.recoverAt, this.t + 8); }
  /** The yellow zone covering s (with its turn), or null. */
  yellowInfo(s) {
    let best = null;
    for (const z of this.yellows) if (Math.abs(dsw(this.L, z.s, s)) < 260 || (dsw(this.L, s, z.s) > 0 && dsw(this.L, s, z.s) < 420)) if (!best || z.double) best = z;
    return best ? { kind: best.double ? 'double' : 'single', turn: best.turn } : null;
  }
  /** Debris on the racing line (a front wing, bodywork): yellows, and sometimes a VSC to clear it. */
  debris(s, big = false) {
    if (!this.race.running || this.yellows.some((y) => Math.abs(dsw(this.L, y.s, s)) < 200)) return;
    const turn = this.turn(s);
    this.msg(`DEBRIS AT ${turn}`, 'info');
    this.yellows.push({ s, double: true, until: this.t + 30 + this.R() * 25, turn });
    this.msg(`DOUBLE YELLOW FLAG AT ${turn}`, 'yellow');
    if (big && !this.neutral && this.R() < 0.25) { this.deployVSC(); this.stopped.push({ r: null, s, cause: 'debris', recoverAt: this.t + 35 + this.R() * 25 }); }
  }
  deployVSC() {
    if (this.neutral) return;
    this.set('vsc');
    this.vscFrom = this.t;
    this.periods.push({ kind: 'VSC', from: this.lap, to: null });
    this.msg('VIRTUAL SAFETY CAR DEPLOYED', 'vsc');
    this.msg('DRS DISABLED', 'info');
  }
  deploySC() {
    if (this.status === 'sc' || this.status === 'scIn') return;
    if (this.status === 'vsc' || this.status === 'vscEnd') this.closePeriod();
    this.set('sc');
    this.scFrom = this.t; this.scLeaderLap = this.race.leader?.laps ?? 0; this.scQueued = false; this.restartGo = false; this.scPitted = false;
    this.periods.push({ kind: 'SC', from: this.lap, to: null });
    this.msg('SAFETY CAR DEPLOYED', 'sc');
    this.msg('DRS DISABLED', 'info');
    this.msg('LAPPED CARS WILL NOT BE ALLOWED TO OVERTAKE', 'info');
  }
  set(st) { const prev = this.status; if (prev === st) return; this.status = st; this.onStatus?.(st, prev); }
  closePeriod() { const p = this.periods[this.periods.length - 1]; if (p && p.to == null) p.to = this.lap; }
  /** The leader crossed the control line (for the restart after the Safety Car). */
  leaderCrossed() {
    if (this.status === 'scIn' && this.scPitted) {
      this.closePeriod(); this.set('green');
      this.drsLap = this.lap + 2;
      this.msg('TRACK CLEAR', 'clear');
      this.scPitted = false; this.restartGo = false;
    }
    // The random incidents of a race: a driver error into the barrier, now and then (a real race has a
    // neutralisation in about half of them; the chance per lap is scaled to the race distance).
    const lap = this.race.leader?.laps ?? 0, lapsLeft = this.race.laps - lap;
    if (this.status === 'green' && lap >= this.nextRoll && lapsLeft > 2 && lap >= 1) {
      this.nextRoll = lap + 1;
      const p = 0.0105 * Math.min(4, this.race.wearScale) * (1 + this.race.weather.wetness * 2.5);
      if (this.R() < p) this.onIncident?.('crash');
    }
  }
  /** The SC has gone into the pit lane. */
  scIntoPits() { this.scPitted = true; }

  update(dt) {
    this.t += dt;
    const race = this.race;
    // Investigations.
    for (const c of this.cases.slice()) {
      if (c.stage === 'pending' && this.t >= c.noteAt) {
        c.stage = 'noted';
        if (!c.skipNote) this.stewards(`${c.text} NOTED - ${c.reason}`, 'noted', c.cars);
      }
      if (c.stage === 'noted' && this.t >= c.invAt) {
        if (c.dismiss) { this.stewards(`${c.text} REVIEWED NO FURTHER INVESTIGATION`, 'nfi', c.cars); this.cases.splice(this.cases.indexOf(c), 1); continue; }
        c.stage = 'inv';
        for (const r of c.cars) r.inv = (r.inv ?? 0) + 1;
        this.stewards(`${c.text} UNDER INVESTIGATION - ${c.reason}`, 'inv', c.cars);
      }
      if (c.stage === 'inv' && this.t >= c.decideAt) {
        for (const r of c.cars) r.inv = Math.max(0, (r.inv ?? 1) - 1);
        this.cases.splice(this.cases.indexOf(c), 1);
        const pen = c.judge?.() ?? 'nfa';
        if (pen === 'nfa' || !c.guilty || c.guilty.retired && pen !== 'dsq') { this.stewards(`${c.text} - NO FURTHER ACTION`, 'nfa', c.cars); continue; }
        this.penalise(c.guilty, pen, c.reason);
        this.stewards(`${PEN[pen].name} FOR ${this.car(c.guilty)} - ${c.reason}`, 'penalty', [c.guilty]);
      }
    }
    // Drive-throughs not taken in time: the black flag.
    for (const r of race.rows) if (r.driveThrough && !r.retired && !r.finished && r.laps >= r.driveThrough.by) this.disqualify(r, 'FAILURE TO SERVE DRIVE THROUGH PENALTY');
    // Recoveries; the yellows come in as the marshals finish.
    for (const x of this.stopped.slice()) if (this.t >= x.recoverAt) {
      this.stopped.splice(this.stopped.indexOf(x), 1);
      if (x.r) this.onRecovered?.(x.r);
    }
    for (const y of this.yellows.slice()) if (this.t >= y.until) { this.yellows.splice(this.yellows.indexOf(y), 1); this.msg(`CLEAR AT ${y.turn}`, 'clear'); }
    const clear = this.stopped.length === 0;
    // The VSC: ending once the track is clear, then green ~10-15 s later.
    if (this.status === 'vsc' && clear && this.t - this.vscFrom > 30) { this.set('vscEnd'); this.vscEndAt = this.t + 10 + this.R() * 5; this.msg('VIRTUAL SAFETY CAR ENDING', 'vsc'); }
    if (this.status === 'vscEnd' && this.t >= this.vscEndAt) { this.closePeriod(); this.set('green'); this.drsLap = this.lap + 2; this.msg('TRACK CLEAR', 'clear'); }
    // The Safety Car: in this lap once the track is clear and the field has had a lap behind it.
    if (this.status === 'sc' && clear && this.scQueued && this.t - this.scFrom > 60 && (race.leader?.laps ?? 0) >= this.scLeaderLap + 1) {
      if (race.laps - (race.leader?.laps ?? 0) <= 1) return;   // the race ends behind the Safety Car
      this.set('scIn'); this.msg('SAFETY CAR IN THIS LAP', 'sc');
    }
  }

  /** The race is over: the stewards decide what is still open (penalties go on the race time). */
  finalize() {
    for (const c of this.cases.splice(0)) {
      if (c.dismiss || c.stage === 'pending') continue;
      for (const r of c.cars) r.inv = 0;
      const pen = c.judge?.() ?? 'nfa';
      if (pen === 'nfa' || !c.guilty || c.guilty.retired) { this.stewards(`${c.text} - NO FURTHER ACTION`, 'nfa', c.cars); continue; }
      this.penalise(c.guilty, pen, c.reason);
      this.stewards(`${PEN[pen].name} FOR ${this.car(c.guilty)} - ${c.reason} (AFTER THE RACE)`, 'penalty', [c.guilty]);
    }
  }
  /** Penalties and race control's summary for the classification. */
  summary() {
    return {
      decisions: this.decisions.slice(),
      periods: this.periods.map((p) => ({ ...p, to: p.to ?? this.lap })),
      messages: this.msgs.filter((m) => ['penalty', 'sc', 'vsc', 'black', 'bw'].includes(m.kind)).map((m) => ({ lap: m.lap, text: m.text, kind: m.kind })),
    };
  }
}
const wrap = (L, s) => ((s % L.length) + L.length) % L.length;
const dsw = (L, a, b) => { let d = b - a; if (d > L.length / 2) d -= L.length; if (d < -L.length / 2) d += L.length; return d; };
