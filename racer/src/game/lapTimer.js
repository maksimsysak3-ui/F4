const TAU = Math.PI * 2;

/**
 * Lap timing on the ring. Progress is the unwrapped track angle; a lap counts
 * when the car crosses the line at theta = 0 heading forwards having covered a
 * full revolution since the last crossing (so wiggling over the line can't cheat).
 */
export class LapTimer {
  constructor() {
    this.best = null;
    this.last = null;
    this.reset();
  }

  /** Called on respawn: the current lap is void. */
  reset() {
    this.started = false;
    this.time = 0;
    this.prevTheta = null;
    this.progress = 0;
  }

  update(dt, x, z) {
    const theta = Math.atan2(z, x);
    if (this.prevTheta === null) this.progress = theta; // absolute, unwrapped angle
    else {
      let d = theta - this.prevTheta;
      if (d > Math.PI) d -= TAU;
      if (d < -Math.PI) d += TAU;
      const before = this.progress;
      this.progress += d;
      if (this.started) this.time += dt;
      // Crossed a multiple of 2*pi going forwards.
      if (Math.floor(this.progress / TAU) > Math.floor(before / TAU) && d > 0) {
        const event = this.crossLine();
        this.prevTheta = theta;
        return event;
      }
    }
    this.prevTheta = theta;
    return null;
  }

  crossLine() {
    if (!this.started) {
      this.started = true;
      this.time = 0;
      this.lapStart = this.progress;
      return { type: 'start' };
    }
    if (this.progress - this.lapStart < TAU * 0.98) return null;
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
