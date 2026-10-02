const ACTIONS = {
  KeyC: 'camera', KeyL: 'leaderboard', KeyG: 'menu', Enter: 'race', KeyR: 'reset', KeyX: 'paint', KeyV: 'car', KeyT: 'track', KeyH: 'horn', KeyM: 'mute', KeyP: 'pause', Escape: 'pause',
  Digit1: 'assists', Digit2: 'gearbox', Digit3: 'drivetrain', Digit4: 'telemetry', KeyI: 'help', Slash: 'help',
  KeyO: 'weather', KeyE: 'shiftUp', KeyQ: 'shiftDown',
};

/** Keyboard steering slows as speed rises, so a tap at 200 km/h is a correction, not a swerve. */
export const steerRateAt = (rate, speed) => rate * Math.max(0.45, 1 - speed / 75);

const approach = (v, target, rate, dt) => (v < target ? Math.min(target, v + rate * dt) : Math.max(target, v - rate * dt));

/**
 * Keyboard + gamepad. Produces smoothed analog controls each frame and fires
 * discrete actions through onAction(name).
 */
export class Input {
  constructor() {
    this.keys = new Set();
    this.onAction = () => {};
    this.controls = { throttle: 0, brake: 0, steer: 0, handbrake: 0, shiftUp: false, shiftDown: false };
    this.pendingShift = 0;
    this.usingPad = false;
    this.prevPadButtons = [];
    this.steering = { rate: 4, returnRate: 5.5 };
    this.speed = 0; // m/s, set by the game for speed-sensitive steering

    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      this.keys.add(e.code);
      this.usingPad = false;
      const action = ACTIONS[e.code];
      if (action === 'shiftUp') this.pendingShift = 1;
      else if (action === 'shiftDown') this.pendingShift = -1;
      if (action) this.onAction(action);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }

  any(...codes) {
    return codes.some((c) => this.keys.has(c));
  }

  /** Keyboard steering ramp rates for the current car. */
  setSteering(steering) {
    this.steering = steering;
  }

  update(dt) {
    const c = this.controls;
    const pad = this.readGamepad();
    if (pad) {
      c.throttle = pad.throttle;
      c.brake = pad.brake;
      c.steer = pad.steer;
      c.handbrake = pad.handbrake;
    } else {
      const st = this.steering;
      const left = this.any('KeyA', 'ArrowLeft');
      const right = this.any('KeyD', 'ArrowRight');
      const target = (right ? 1 : 0) - (left ? 1 : 0);
      // Return to centre faster than turning in, like a self-aligning wheel.
      const returning = target === 0 || Math.sign(target) !== Math.sign(c.steer);
      c.steer = approach(c.steer, target, returning ? st.returnRate * 1.15 : steerRateAt(st.rate, this.speed), dt);
      c.throttle = approach(c.throttle, this.any('KeyW', 'ArrowUp') ? 1 : 0, 8, dt);
      c.brake = approach(c.brake, this.any('KeyS', 'ArrowDown') ? 1 : 0, 16, dt);
      c.handbrake = this.any('Space') ? 1 : 0;
    }
    c.shiftUp = this.pendingShift > 0;
    c.shiftDown = this.pendingShift < 0;
    this.pendingShift = 0;
    return c;
  }

  readGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = [...pads].find((p) => p && p.mapping === 'standard');
    if (!gp) return null;
    const btn = (i) => (gp.buttons[i] ? gp.buttons[i].value : 0);
    const pressed = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const dead = (v, d = 0.08) => (Math.abs(v) < d ? 0 : (v - Math.sign(v) * d) / (1 - d));
    const steerRaw = dead(gp.axes[0] || 0);
    const state = {
      // Slight curve gives finer control around centre.
      steer: Math.sign(steerRaw) * Math.abs(steerRaw) ** 1.4,
      throttle: btn(7),
      brake: btn(6),
      handbrake: pressed(0) ? 1 : 0,
    };
    // Edge-triggered buttons: B reset, Y camera, LB/RB shift, Start pause, X telemetry, Back switch car.
    const map = { 1: 'reset', 3: 'camera', 4: 'shiftDown', 5: 'shiftUp', 9: 'pause', 2: 'telemetry', 8: 'car' };
    for (const [i, action] of Object.entries(map)) {
      const now = pressed(+i);
      if (now && !this.prevPadButtons[i]) {
        if (action === 'shiftUp') this.pendingShift = 1;
        else if (action === 'shiftDown') this.pendingShift = -1;
        this.onAction(action);
      }
      this.prevPadButtons[i] = now;
    }
    const active = state.throttle > 0.02 || state.brake > 0.02 || Math.abs(state.steer) > 0.02 || state.handbrake;
    if (active) this.usingPad = true;
    return this.usingPad ? state : null;
  }
}
