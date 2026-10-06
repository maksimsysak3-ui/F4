import { Vector3, MathUtils, Quaternion, Euler } from 'three';

const _fwd = new Vector3();
const _vel = new Vector3();
const _target = new Vector3();
const _desired = new Vector3();
const _blend = new Vector3();
const _up = new Vector3(0, 1, 0);

const damp = (rate, dt) => 1 - Math.exp(-rate * dt);

export const CAMERA_MODES = ['Chase', 'Cockpit', 'Far chase', 'Bumper', 'Showroom', 'Top down'];

const _q = new Quaternion();
const _e = new Euler();
const _acc = new Vector3();
const _loc = new Vector3();
const FLIP = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);

/**
 * Camera director: a few follow modes plus a mouse-orbit showroom for admiring
 * the car. When the car falls into the void the camera stays put and watches.
 */
export class CameraRig {
  constructor(camera, dom) {
    this.camera = camera;
    this.mode = 0;
    this.pos = new Vector3(0, 5, -10);
    this.look = new Vector3();
    this.heading = new Vector3(0, 0, 1);
    this.orbit = { yaw: 2.4, pitch: 0.22, dist: 4.8, idle: 0 };
    this.shake = 0;
    this.watchingFall = false;
    // Cockpit: head position (world, set by the game each frame) and the g-force sway state.
    this.cockpitPos = new Vector3();
    this.prevVel = new Vector3();
    this.gForce = new Vector3();   // smoothed acceleration in the car frame (x left, y up, z forward)
    this.headOff = new Vector3();
    this.headVel = new Vector3();
    this.time = 0;

    let dragging = false;
    dom.addEventListener('pointerdown', (e) => { dragging = true; dom.setPointerCapture(e.pointerId); });
    dom.addEventListener('pointerup', () => { dragging = false; });
    dom.addEventListener('pointermove', (e) => {
      if (!dragging || CAMERA_MODES[this.mode] !== 'Showroom') return;
      this.orbit.yaw -= e.movementX * 0.006;
      this.orbit.pitch = MathUtils.clamp(this.orbit.pitch + e.movementY * 0.004, -0.05, 1.3);
      this.orbit.idle = 0;
    });
    dom.addEventListener('wheel', (e) => {
      if (CAMERA_MODES[this.mode] !== 'Showroom') return;
      this.orbit.dist = MathUtils.clamp(this.orbit.dist * (1 + Math.sign(e.deltaY) * 0.08), 2.4, 18);
      e.preventDefault();
    }, { passive: false });
  }

  get modeName() { return CAMERA_MODES[this.mode]; }

  next() {
    this.mode = (this.mode + 1) % CAMERA_MODES.length;
    this.snap = true;
  }

  /** Jump instantly next update (after resets). */
  cut() { this.snap = true; }

  update(dt, carPos, carQuat, carVel, falling) {
    const cam = this.camera;
    // Depth precision scales with the near plane: only the cockpit needs it close.
    const near = this.modeName === 'Cockpit' ? 0.08 : 0.3;
    if (cam.near !== near) { cam.near = near; cam.updateProjectionMatrix(); }
    const speed = carVel.length();
    _fwd.set(0, 0, 1).applyQuaternion(carQuat);
    _fwd.y = 0;
    if (_fwd.lengthSq() < 1e-4) _fwd.set(0, 0, 1);
    _fwd.normalize();

    // Blend heading toward the direction of travel so drifts show the car's angle.
    _vel.copy(carVel).setY(0);
    const travel = speed > 4 && _vel.dot(_fwd) > 0 ? _vel.normalize() : _fwd;
    const blendTarget = _blend.copy(_fwd).lerp(travel, 0.45).normalize();
    this.heading.lerp(blendTarget, this.snap ? 1 : damp(4.5, dt)).normalize();

    const mode = this.modeName;
    let fov = 60;
    let posRate = 10;
    let lookRate = 14;

    if (mode === 'Cockpit' && !falling) {
      this.updateCockpit(dt, carQuat, carVel, speed);
      return;
    }
    if (falling) {
      // Hold position, track the plummet.
      _desired.copy(this.pos);
      _target.copy(carPos);
      this.watchingFall = true;
    } else if (mode === 'Chase' || mode === 'Far chase') {
      const far = mode === 'Far chase';
      const dist = (far ? 6.4 : 3.7) + speed * 0.02;
      const height = far ? 2.3 : 1.3;
      _desired.copy(carPos).addScaledVector(this.heading, -dist).addScaledVector(_up, height);
      _target.copy(carPos).addScaledVector(this.heading, far ? 3 : 2).addScaledVector(_up, 0.5);
      fov = 58 + Math.min(speed * 0.3, 24);
      posRate = 7;
    } else if (mode === 'Bumper') {
      _desired.set(0, 0.42, 0.95).applyQuaternion(carQuat).add(carPos);
      _target.set(0, 0.5, 12).applyQuaternion(carQuat).add(carPos);
      fov = 70 + Math.min(speed * 0.2, 16);
      posRate = 1000;
      lookRate = 1000;
    } else if (mode === 'Showroom') {
      const o = this.orbit;
      o.idle += dt;
      if (o.idle > 3) o.yaw += dt * 0.18;
      _desired.set(
        Math.sin(o.yaw) * Math.cos(o.pitch) * o.dist,
        Math.sin(o.pitch) * o.dist + 0.6,
        Math.cos(o.yaw) * Math.cos(o.pitch) * o.dist,
      ).add(carPos);
      _target.copy(carPos).addScaledVector(_up, 0.15);
      fov = 40;
      posRate = 12;
    } else {
      _desired.copy(carPos).addScaledVector(_up, 34).addScaledVector(this.heading, -6);
      _target.copy(carPos);
      fov = 50;
      posRate = 6;
    }

    if (this.snap) {
      this.pos.copy(_desired);
      this.look.copy(_target);
      this.snap = false;
      this.watchingFall = false;
    } else {
      this.pos.lerp(_desired, damp(posRate, dt));
      this.look.lerp(_target, damp(lookRate, dt));
    }

    // Street circuits: never put the camera inside or behind a barrier.
    if (this.wallProbe && !falling && mode !== 'Top down') {
      for (let i = 0; i < 6 && this.wallProbe(this.pos.x, this.pos.z); i++) this.pos.lerp(_target, 0.3);
    }

    // Keep the chase cam from dipping under the track surface.
    if (!falling && mode !== 'Bumper') this.pos.y = Math.max(this.pos.y, carPos.y + 0.4);

    cam.position.copy(this.pos);
    if (this.shake > 0 && mode !== 'Showroom') {
      const s = this.shake;
      cam.position.x += (Math.random() - 0.5) * s;
      cam.position.y += (Math.random() - 0.5) * s;
    }
    if (mode === 'Bumper' && !falling) cam.up.set(0, 1, 0).applyQuaternion(carQuat);
    else cam.up.set(0, 1, 0);
    cam.lookAt(this.look);
    cam.fov += (fov - cam.fov) * damp(3, dt);
    cam.updateProjectionMatrix();
  }

  /**
   * Driver's-eye view. The head is a damped spring pushed by the car's
   * accelerations: it sways out in corners, nods under braking, sinks under
   * throttle, and bounces with the suspension; the engine adds a fine buzz.
   */
  updateCockpit(dt, carQuat, carVel, speed) {
    const cam = this.camera;
    this.time += dt;
    if (this.snap || dt <= 0) {
      this.prevVel.copy(carVel);
      this.headOff.set(0, 0, 0);
      this.headVel.set(0, 0, 0);
      this.snap = false;
    }
    if (dt > 0) {
      _acc.copy(carVel).sub(this.prevVel).divideScalar(dt);
      this.prevVel.copy(carVel);
      _q.copy(carQuat).invert();
      _acc.applyQuaternion(_q);                       // into the car frame
      this.gForce.lerp(_acc, damp(10, dt));
    }
    const g = this.gForce;
    // Spring target: inertia pushes the head opposite the acceleration.
    const tx = MathUtils.clamp(-g.x * 0.0035, -0.05, 0.05);
    const ty = MathUtils.clamp(-g.y * 0.0025, -0.03, 0.03);
    const tz = MathUtils.clamp(-g.z * 0.003, -0.04, 0.04);
    const k = 160, c = 18;
    for (const [axis, t] of [['x', tx], ['y', ty], ['z', tz]]) {
      const a = (t - this.headOff[axis]) * k - this.headVel[axis] * c;
      this.headVel[axis] += a * dt;
      this.headOff[axis] += this.headVel[axis] * dt;
    }
    // Road and engine buzz grows with speed.
    const buzz = Math.min(1, speed / 60) * 0.0012;
    _loc.set(
      this.headOff.x,
      0.03 + this.headOff.y + Math.sin(this.time * 61) * buzz + Math.sin(this.time * 37.3) * buzz * 0.6,
      0.05 + this.headOff.z,
    ).applyQuaternion(carQuat);
    cam.position.copy(this.cockpitPos).add(_loc);
    // Look forward along the car, with a touch of roll and pitch from the g-forces and a slight downward gaze.
    const roll = MathUtils.clamp(g.x * 0.004, -0.06, 0.06);
    const pitch = -0.07 + MathUtils.clamp(g.z * 0.003, -0.05, 0.05);
    _e.set(pitch, 0, roll, 'YXZ');
    cam.quaternion.copy(carQuat).multiply(FLIP).multiply(_q.setFromEuler(_e));
    this.pos.copy(cam.position);
    this.look.copy(cam.position).add(_loc.set(0, 0, 10).applyQuaternion(carQuat));
    const fov = 72 + Math.min(speed * 0.08, 8);
    cam.fov += (fov - cam.fov) * damp(3, dt);
    cam.updateProjectionMatrix();
  }
}
