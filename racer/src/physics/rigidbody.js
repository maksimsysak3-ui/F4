import { Vector3, Quaternion } from 'three';

const _r = new Vector3();
const _t = new Vector3();
const _q = new Quaternion();
const _qInv = new Quaternion();
const _dq = new Quaternion();

/**
 * Minimal 6-DOF rigid body with a diagonal body-space inertia tensor.
 * Forces accumulate during a step and are cleared by integrate().
 */
export class RigidBody {
  constructor(mass, inertia) {
    this.mass = mass;
    this.invMass = 1 / mass;
    this.invInertia = new Vector3(1 / inertia.x, 1 / inertia.y, 1 / inertia.z);

    this.position = new Vector3();
    this.quaternion = new Quaternion();
    this.velocity = new Vector3();
    this.angularVelocity = new Vector3(); // world space

    this.force = new Vector3();
    this.torque = new Vector3();
  }

  applyForce(f) {
    this.force.add(f);
  }

  applyForceAtPoint(f, worldPoint) {
    this.force.add(f);
    _r.subVectors(worldPoint, this.position);
    this.torque.add(_t.crossVectors(_r, f));
  }

  applyTorque(t) {
    this.torque.add(t);
  }

  /** Velocity of a world-space point rigidly attached to the body. */
  pointVelocity(worldPoint, out) {
    _r.subVectors(worldPoint, this.position);
    return out.crossVectors(this.angularVelocity, _r).add(this.velocity);
  }

  /** Body-space vector -> world-space point. */
  localToWorld(local, out) {
    return out.copy(local).applyQuaternion(this.quaternion).add(this.position);
  }

  /** Semi-implicit Euler. Gyroscopic term omitted (stable, negligible for a car). */
  integrate(dt) {
    this.velocity.addScaledVector(this.force, this.invMass * dt);

    // dw = R * I^-1 * R^T * torque * dt
    _qInv.copy(this.quaternion).invert();
    _t.copy(this.torque).applyQuaternion(_qInv).multiply(this.invInertia).applyQuaternion(this.quaternion);
    this.angularVelocity.addScaledVector(_t, dt);

    this.position.addScaledVector(this.velocity, dt);

    const w = this.angularVelocity;
    _dq.set(w.x * dt * 0.5, w.y * dt * 0.5, w.z * dt * 0.5, 0);
    _q.multiplyQuaternions(_dq, this.quaternion);
    this.quaternion.x += _q.x;
    this.quaternion.y += _q.y;
    this.quaternion.z += _q.z;
    this.quaternion.w += _q.w;
    this.quaternion.normalize();

    this.force.set(0, 0, 0);
    this.torque.set(0, 0, 0);
  }
}
