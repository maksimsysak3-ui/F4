import { Vector3, MathUtils } from 'three';

const _fwd = new Vector3();
const _vel = new Vector3();
const _target = new Vector3();
const _desired = new Vector3();
const _blend = new Vector3();
const _up = new Vector3(0, 1, 0);

const damp = (rate, dt) => 1 - Math.exp(-rate * dt);

export const CAMERA_MODES = ['Chase', 'Far chase', 'Bumper', 'Showroom', 'Top down'];

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
}
