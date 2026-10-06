import { InstancedMesh, BoxGeometry, MeshStandardMaterial, Matrix4, Quaternion, Vector3, Euler, Color, DynamicDrawUsage } from 'three';
import { Smoke } from './smoke.js?v=a5d31c9';

const MAX = 160;
const G = 9.81;

/**
 * Crashes: bodywork breaks off on hard hits (shards of paint, carbon and trim
 * that tumble, bounce and settle on the ground), sparks while scraping a
 * barrier, and a damage level that brings engine smoke and finally fire.
 *
 *   crash.impact(vehicle, paintHex, speed)   on a hit (speed = m/s into the wall/ground)
 *   crash.scrape(point, velocity, amount, dt)
 *   crash.update(dt, vehicle, viewport)       every frame
 */
export class CrashFx {
  constructor(scene, heightAt) {
    this.heightAt = heightAt;
    this.mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ roughness: 0.45, metalness: 0.35 }), MAX);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.parts = []; // { p, v, q, w, s: Vector3 size, life, rest }
    this.cursor = 0;
    this.smoke = new Smoke(scene, { color: [0.13, 0.13, 0.14], life: [1.8, 1.6], size: [0.7, 5.6], alpha: 0.55, lift: 0.5, rise: [0.8, 1.0], carry: 0.15 });
    this.fire = new Smoke(scene, { color: [1.0, 0.42, 0.1], life: [0.22, 0.3], size: [0.25, 0.8], alpha: 0.9, lift: 3, rise: [1.4, 1.6], carry: 0.25, additive: true });
    this.sparks = new Smoke(scene, { color: [1.0, 0.78, 0.35], life: [0.12, 0.18], size: [0.08, 0.15], alpha: 1, lift: -6, rise: [0.5, 2.0], carry: 0.85, additive: true });
    this._m = new Matrix4();
    this._q = new Quaternion();
    this._e = new Euler();
    this._c = new Color();
    this._v = new Vector3();
    this._up = new Vector3();
  }

  /** A hit: spawn debris at the impact point, more and bigger the harder it was. */
  impact(vehicle, paintHex, speed) {
    const p = vehicle.hitPoint, n = vehicle.hitNormal, v = vehicle.body.velocity;
    const count = Math.min(26, Math.round((speed - 5) * 2.2));
    const paint = new Color(paintHex);
    for (let k = 0; k < count; k++) {
      const big = k < Math.min(3, Math.floor((speed - 7) / 4)); // panels: a bumper corner, a winglet, a mirror
      const size = big ? new Vector3(0.25 + Math.random() * 0.45, 0.04 + Math.random() * 0.05, 0.15 + Math.random() * 0.35)
        : new Vector3(0.04 + Math.random() * 0.12, 0.02 + Math.random() * 0.04, 0.04 + Math.random() * 0.12);
      const colour = Math.random() < 0.6 ? paint : Math.random() < 0.5 ? new Color(0x111114) : new Color(0x3a3d42);
      // Thrown off the wall, carried along with the car, kicked upward.
      const kick = speed * (0.25 + Math.random() * 0.45);
      const vel = new Vector3(
        v.x * (0.4 + Math.random() * 0.5) + n.x * kick + (Math.random() - 0.5) * 4,
        2 + Math.random() * (2 + speed * 0.35),
        v.z * (0.4 + Math.random() * 0.5) + n.z * kick + (Math.random() - 0.5) * 4,
      );
      this.spawn(p, vel, size, colour, 9 + Math.random() * 6);
    }
    // A burst of sparks and a puff of dust/smoke at the point of impact.
    for (let k = 0; k < 3; k++) this.sparks.emit(7, p, this._v.copy(v).addScaledVector(n, 6), 220, 1 / 30);
    this.smoke.emit(6, p, v, 40 * Math.min(1, speed / 20), 0.25);
  }

  spawn(p, vel, size, colour, life) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % MAX;
    this.parts[i] = {
      p: p.clone(), v: vel, q: new Quaternion().setFromEuler(new Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6)),
      w: new Vector3((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18), s: size, life, age: 0, rest: false,
    };
    this.mesh.setColorAt(i, colour);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mesh.count = Math.max(this.mesh.count, i + 1);
  }

  /** Sliding along a barrier: a shower of sparks behind the contact point. */
  scrape(point, velocity, amount, dt) {
    this.sparks.emit(7, point, velocity, Math.min(400, amount * 30), dt);
  }

  update(dt, vehicle, viewportHeight, fov) {
    const m = this._m, q = this._q;
    for (let i = 0; i < this.parts.length; i++) {
      const d = this.parts[i];
      if (!d) continue;
      d.age += dt;
      if (!d.rest) {
        d.v.y -= G * dt;
        d.p.addScaledVector(d.v, dt);
        const h = this.heightAt(d.p.x, d.p.z) ?? 0;
        const floor = h + d.s.y * 0.5;
        if (d.p.y < floor) {
          // Bounce: lose most of the energy, scrub along the ground, spin down.
          d.p.y = floor;
          d.v.y = Math.abs(d.v.y) * 0.32;
          d.v.x *= 0.6; d.v.z *= 0.6;
          d.w.multiplyScalar(0.55);
          if (Math.abs(d.v.y) < 0.6 && d.v.x * d.v.x + d.v.z * d.v.z < 0.5) { d.rest = true; d.v.set(0, 0, 0); }
        }
        const wl = d.w.length();
        if (wl > 1e-3) d.q.premultiply(q.setFromAxisAngle(this._up.copy(d.w).divideScalar(wl), wl * dt));
      }
      // Pieces fade out by shrinking at the end of their life.
      const fade = Math.max(0, Math.min(1, (d.life - d.age) / 1.5));
      if (fade <= 0) { this.parts[i] = null; m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, m); continue; }
      m.compose(d.p, d.q, this._v.copy(d.s).multiplyScalar(fade));
      this.mesh.setMatrixAt(i, m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    // Damage: engine smoke from 35%, fire from 75%.
    if (vehicle && vehicle.damage > 0.35) {
      const b = vehicle.body;
      const src = this._v.set(0, 0.35, -0.2).applyQuaternion(b.quaternion).add(b.position);
      this.smoke.emit(5, src, b.velocity, 14 + vehicle.damage * 40, dt);
      if (vehicle.damage > 0.75) this.fire.emit(5, src, b.velocity, 40 + (vehicle.damage - 0.75) * 160, dt);
    }
    this.smoke.update(dt, viewportHeight, fov);
    this.fire.update(dt, viewportHeight, fov);
    this.sparks.update(dt, viewportHeight, fov);
  }

  clear() {
    this.parts.length = 0;
    this.mesh.count = 0;
    this.smoke.clear();
    this.fire.clear();
    this.sparks.clear();
  }
}
