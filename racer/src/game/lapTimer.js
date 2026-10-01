/**
 * Lap timing on any closed circuit. Progress is the unwrapped distance along
 * the lap; a lap counts when the car crosses the line (s = 0) going forwards
 * having covered a full lap since the last crossing (so wiggling over the
 * line can't cheat).
 */
export class LapTimer {
  constructor(length) {
    this.length = length;
    this.best = null;
    this.last = null;
    this.reset();
  }

  /** Called on respawn: the current lap is void. */
  reset() {
    this.started = false;
    this.time = 0;
    this.prevS = null;
    this.progress = 0;
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
    return null;
  }

  crossLine() {
    if (!this.started) {
      this.started = true;
      this.time = 0;
      this.lapStart = this.progress;
      return { type: 'start' };
    }
    if (this.progress - this.lapStart < this.length * 0.98) return null;
    const lap = this.time;
    this.last = lap;
    const isBest = this.best === null || lap < this.best;
    if (isBest) this.best = lap;
    this.time = 0;
    this.lapStart = this.progress;
    return { type: 'lap', time: lap, isBest };
  }
}

export function formatTime(t) {
  if (t === null || t === undefined) return '--:--.---';
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
}
