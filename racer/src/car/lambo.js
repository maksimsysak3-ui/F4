import { Group, Vector3, Quaternion } from 'three';
import { MeshBuilder } from './meshBuilder.js';
import { createCarMaterials } from './materials.js';
import { buildShell } from './lamboBody.js';
import { buildDetails, buildAnimatedParts } from './lamboParts.js';
import { buildWheel } from './wheel.js';
import { CAR } from '../config.js';
import { MODEL_SCALE, squashZ, squashSlope } from '../proportions.js';

const HEAD_SCALE = 1.22; // chibi driver: oversized helmet
const _acc = new Vector3();
const _inv = new Quaternion();

/**
 * The visual car. `root` follows the physics body (CG frame, metres). `model`
 * holds the body authored in design space: squashed lengthwise into miniature
 * proportions at build time, then scaled by MODEL_SCALE. Wheels live directly
 * in body space so they line up exactly with the simulated suspension.
 */
export class LamboVisual {
  constructor(paintHex, modelOffset) {
    this.mats = createCarMaterials(paintHex);
    this.root = new Group();
    this.model = new Group();
    this.model.position.copy(modelOffset);
    this.model.scale.setScalar(MODEL_SCALE);
    this.root.add(this.model);

    const mb = new MeshBuilder();
    buildShell(mb);
    buildDetails(mb);
    this.model.add(mb.build(this.mats, squashZ, squashSlope));

    const anim = buildAnimatedParts(this.mats);
    // Animated parts keep their own shape (round helmet!); only their placement is squashed.
    for (const child of anim.group.children) child.position.z = squashZ(child.position.z);
    this.model.add(anim.group);
    this.head = anim.head;
    this.steeringWheel = anim.steering;
    this.flames = anim.flames;

    this.wheels = CAR.wheels.map((spec) => {
      const front = spec.axle === 'front';
      // Built at design size, then scaled, so hub/caliper details keep their proportions.
      const w = buildWheel(this.mats, {
        radius: CAR.wheelRadius / MODEL_SCALE,
        width: (front ? CAR.tireWidth.front : CAR.tireWidth.rear) / MODEL_SCALE,
        left: spec.x > 0,
      });
      w.root.scale.setScalar(MODEL_SCALE);
      this.root.add(w.root);
      return w;
    });

    this.headOffset = new Vector3();
    this.headVel = new Vector3();
    this.prevVel = new Vector3();
    this.popTimer = 0;
    this.popCooldown = 0;
    this.prevThrottle = 0;
    this.wasShifting = false;
    this.onPop = null;
  }

  setPaint(hex) {
    this.mats.paint.color.setHex(hex);
  }

  /** Sync with the simulation. Call once per rendered frame. */
  update(vehicle, dt) {
    for (let i = 0; i < 4; i++) {
      const w = vehicle.wheels[i];
      const vis = this.wheels[i];
      vis.root.position.set(w.anchor.x, w.anchor.y - w.suspensionLength, w.anchor.z);
      vis.root.rotation.y = w.steer;
      vis.spin.rotation.x = w.spinAngle;
    }
    this.steeringWheel.rotation.z = -vehicle.steerAngle * 6;

    // Lights.
    this.mats.tail.emissiveIntensity = vehicle.brake > 0.05 ? 9 : 3;
    this.mats.reverse.emissiveIntensity = vehicle.gearLabel === 'R' ? 4 : 0;

    this.updateBobblehead(vehicle, dt);
    this.updateFlames(vehicle, dt);
  }

  /** The oversized helmet lags behind the car's acceleration on a soft spring. */
  updateBobblehead(vehicle, dt) {
    if (dt <= 0) return;
    const b = vehicle.body;
    const acc = _acc.copy(b.velocity).sub(this.prevVel).divideScalar(dt);
    this.prevVel.copy(b.velocity);
    acc.applyQuaternion(_inv.copy(b.quaternion).invert()).clampLength(0, 40); // into car space
    const k = 160;
    const c = 9;
    // Spring towards an offset opposite the acceleration (the head "lags").
    const force = acc.multiplyScalar(-0.0035).sub(this.headOffset).multiplyScalar(k).addScaledVector(this.headVel, -c);
    this.headVel.addScaledVector(force, dt);
    this.headOffset.addScaledVector(this.headVel, dt).clampLength(0, 0.05);
    this.head.position.set(this.headOffset.x, 0.92 + this.headOffset.y * 0.5, -0.02 + this.headOffset.z);
    this.head.scale.setScalar(HEAD_SCALE);
    this.head.rotation.set(this.headOffset.z * 4, vehicle.steerAngle * 0.6, -this.headOffset.x * 5);
  }

  /** Pops & bangs on upshifts and lifting off at high revs. */
  updateFlames(vehicle, dt) {
    this.popCooldown -= dt;
    const shifting = vehicle.isShifting;
    const lifted = this.prevThrottle > 0.6 && vehicle.throttle < 0.1;
    if (this.popCooldown <= 0 && vehicle.rpm > 5500 && ((shifting && !this.wasShifting) || lifted)) {
      this.popTimer = shifting ? 0.12 : 0.45;
      this.popCooldown = 0.6;
    }
    this.wasShifting = shifting;
    this.prevThrottle = vehicle.throttle;

    this.popTimer -= dt;
    const on = this.popTimer > 0;
    const flicker = on && Math.random() < 0.55;
    for (const f of this.flames) {
      f.visible = flicker;
      if (flicker) {
        const s = 0.6 + Math.random() * 0.8;
        f.scale.set(s, 0.7 + Math.random() * 0.9, s);
      }
    }
    this.mats.flame.opacity = flicker ? 0.9 : 0;
    if (flicker && this.onPop) this.onPop();
  }
}
