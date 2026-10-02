/**
 * Lap timing on any closed circuit. Progress is the unwrapped distance along
 * the lap; a lap counts when the car crosses the line (s = 0) going forwards
 * having covered a full lap since the last crossing (so wiggling over the
 * line can't cheat). Laps are split into three sectors, and a trace of the
 * lap time every TRACE_STEP metres feeds the live delta against the best lap.
 */
export const SECTORS = 3;
const TRACE_STEP = 10;

export class LapTimer {
  constructor(length, bestTrace = null) {
    this.length = length;
    this.best = bestTrace ? bestTrace[bestTrace.length - 1] : null;
    this.bestTrace = bestTrace;
    this.last = null;
    this.bestSectors = [null, null, null];   // personal bests
    this.lastSectors = [null, null, null];
    this.reset();
  }

  /** Called on respawn: the current lap is void. */
  reset() {
    this.started = false;
    this.time = 0;
    this.prevS = null;
    this.progress = 0;
    this.sectors = [null, null, null];
    this.trace = [];
    this.delta = null;
  }

  /** Distance covered on the current lap (0 .. length). */
  get lapDistance() {
    return this.started ? this.progress - this.lapStart : 0;
  }

  /** Index of the sector being driven. */
  get sector() {
    return Math.min(SECTORS - 1, Math.floor(this.lapDistance / (this.length / SECTORS)));
  }

  /** s: distance along the lap in [0, length), or null when off the circuit. */
  update(dt, s) {
    const L = this.length;
    if (this.started) this.time += dt;
    if (s === null) return null;
    if (this.prevS === null) {
      this.progress = s > L / 2 ? s - L : s; // just behind the line counts as negative
      this.prevS = s;
      return null;
    }
    let d = s - this.prevS;
    if (d > L / 2) d -= L;
    if (d < -L / 2) d += L;
    this.prevS = s;
    const before = this.progress;
    this.progress += d;
    if (d > 0 && Math.floor(this.progress / L) > Math.floor(before / L)) return this.crossLine();
    if (!this.started) return null;
    const u = this.lapDistance;
    // Trace and live delta.
    while (this.trace.length * TRACE_STEP <= u && this.trace.length * TRACE_STEP < L) this.trace.push(this.time);
    if (this.bestTrace) {
      const f = u / TRACE_STEP, i = Math.floor(f);
      if (i + 1 < this.bestTrace.length) this.delta = this.time - (this.bestTrace[i] + (this.bestTrace[i + 1] - this.bestTrace[i]) * (f - i));
    }
    // Sector splits.
    const k = this.sectors.findIndex((x) => x === null);
    if (k >= 0 && k < SECTORS - 1 && u >= ((k + 1) * L) / SECTORS) {
      const prev = this.sectors.slice(0, k).reduce((a, b) => a + b, 0);
      this.sectors[k] = this.time - prev;
      return { type: 'sector', index: k, time: this.sectors[k] };
    }
    return null;
  }

  crossLine() {
    if (!this.started) {
      this.started = true;
      this.time = 0;
      this.lapStart = this.progress;
      this.sectors = [null, null, null];
      this.trace = [0];
      return { type: 'start' };
    }
    if (this.progress - this.lapStart < this.length * 0.98) return null;
    const lap = this.time;
    const done = this.sectors.slice(0, SECTORS - 1).reduce((a, b) => a + (b ?? 0), 0);
    this.sectors[SECTORS - 1] = lap - done;
    this.trace.push(lap);
    this.last = lap;
    this.lastSectors = this.sectors.slice();
    this.lastSectors.forEach((t, k) => { if (t != null && (this.bestSectors[k] == null || t < this.bestSectors[k])) this.bestSectors[k] = t; });
    const isBest = this.best === null || lap < this.best;
    if (isBest) { this.best = lap; this.bestTrace = this.trace.slice(); }
    const event = { type: 'lap', time: lap, isBest, sectors: this.lastSectors.slice(), trace: this.trace.slice() };
    this.time = 0;
    this.lapStart = this.progress;
    this.sectors = [null, null, null];
    this.trace = [0];
    this.delta = null;
    return event;
  }
}

export function formatTime(t) {
  if (t === null || t === undefined) return '--:--.---';
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
}

export function formatDelta(d) {
  if (d === null || d === undefined) return '';
  return `${d >= 0 ? '+' : '-'}${Math.abs(d).toFixed(3)}`;
}
