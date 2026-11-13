import {
  InstancedMesh, DodecahedronGeometry, SphereGeometry, MeshStandardMaterial, Object3D, Vector3, BufferGeometry, Float32BufferAttribute, Mesh, DoubleSide, DynamicDrawUsage,
} from 'three';
import { Smoke } from './smoke.js';
import { Skidmarks } from './skidmarks.js';

/*
 * What the tyres do to the circuit and the circuit to the tyres, for every car:
 *
 *   off the track   stones and clumps of grass thrown up behind the wheels, a dust cloud, ruts left in the
 *                   gravel and the grass
 *   back on it      the tyres still shed stones for a while, and leave gravel scattered on the asphalt
 *                   (it stays there for the session)
 *   on the limit    worn tyres shed rubber (marbles) that bounce off and collect off the racing line; a
 *                   locked wheel smokes; the floor's skid blocks spark over bumps and kerbs and at speed
 *   the circuit     already used: braking streaks into every big corner, tyre tracks through the run-offs
 *                   where cars have gone wide
 *
 * TrackFx.build(track) once per circuit; player(...) and ai(...) every frame; update(...) to draw.
 */
const AI_SLOTS = 72;
const _p = new Vector3(), _v = new Vector3(), _l = new Vector3(), _o = new Object3D();

export class TrackFx {
  constructor(scene) {
    this.scene = scene;
    const S = (o) => new Smoke(scene, { slots: 16 + AI_SLOTS, ...o });
    this.stones = S({ color: [0.47, 0.43, 0.38], life: [0.7, 0.6], size: [0.07, 0.02], alpha: 1, lift: -9.8, rise: [1.8, 3.8], carry: 0.45, max: 2000 });
    this.grass = S({ color: [0.2, 0.34, 0.11], life: [0.7, 0.5], size: [0.1, 0.04], alpha: 1, lift: -7.5, rise: [1.4, 3.2], carry: 0.45, max: 1500 });
    this.dust = S({ color: [0.55, 0.47, 0.36], life: [1.6, 1.2], size: [0.9, 3.8], alpha: 0.28, lift: 0.1, rise: [0.4, 0.9], carry: 0.18, max: 1100 });
    this.marbles = S({ color: [0.05, 0.05, 0.06], life: [0.55, 0.4], size: [0.075, 0.02], alpha: 1, lift: -9.8, rise: [0.6, 1.8], carry: 0.7, max: 1000 });
    this.sparks = S({ color: [1.0, 0.66, 0.26], life: [0.28, 0.35], size: [0.17, 0.06], alpha: 1, lift: -9, rise: [0.2, 2.4], carry: 0.1, additive: true, max: 3000 });
    this.lockSmoke = S({ color: [0.86, 0.88, 0.93], life: [1.2, 0.9], size: [0.5, 3.0], alpha: 0.3, lift: 0.25, rise: [0.4, 0.8], carry: 0.3, max: 800 });
    this.ruts = new Skidmarks(scene, 4 + AI_SLOTS, { color: 0x3a2a18, roughness: 0.95 });
    // What stays on the track: gravel brought back on, marbles swept off the line.
    const inst = (geo, mat, n) => { const m = new InstancedMesh(geo, mat, n); m.count = 0; m.frustumCulled = false; m.instanceMatrix.setUsage(DynamicDrawUsage); scene.add(m); return m; };
    this.gravel = inst(new DodecahedronGeometry(0.04, 0), new MeshStandardMaterial({ color: 0x9a9184, roughness: 0.95 }), 5000);
    this.dots = inst(new SphereGeometry(0.035, 6, 4), new MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.6 }), 4000);
    this.cursor = { gravel: 0, dots: 0 };
    this.cars = new Map();
    this.wear = null; this.corners = [];
  }

  /** A new circuit: clear everything, lay down its wear (braking streaks, run-off tracks). */
  build(track) {
    this.clear();
    if (this.wear) { this.scene.remove(this.wear); this.wear.geometry.dispose(); this.wear.material.dispose(); this.wear = null; }
    const L = track?.layout, ground = track?.ground;
    if (!L?.k || !L.nx) return;
    this.L = L; this.ground = ground;
    const N = L.N, ds = L.ds, hAt = (x, z) => (ground?.heightAt?.(x, z) ?? 0);
    // The corners: local maxima of the (smoothed) curvature.
    const k = Array.from(L.k), sm = k.map((_, i) => { let t = 0; for (let d = -6; d <= 6; d++) t += Math.abs(k[(i + d + N) % N]); return t / 13; });
    const corners = [];
    for (let i = 0; i < N; i++) if (sm[i] > 1 / 140 && sm[i] >= sm[(i - 1 + N) % N] && sm[i] >= sm[(i + 1) % N] && !corners.some((c) => Math.min(Math.abs(c.i - i), N - Math.abs(c.i - i)) * ds < 60)) corners.push({ i, k: sm[i], sign: Math.sign(k[i]) || 1 });
    this.corners = corners;
    const pos = [], col = [], R = mulberry(N * 31 + Math.round(L.length));
    const P = (i, lat, y = 0.014) => { const j = ((Math.round(i) % N) + N) % N; const x = L.x[j] + L.nx[j] * lat, z = L.z[j] + L.nz[j] * lat; return [x, hAt(x, z) + y, z]; };
    const strip = (pts, w, rgb, a0, a1) => {   // a ribbon along points [i, lat], fading in and out
      for (let q = 0; q < pts.length - 1; q++) {
        const [ia, la] = pts[q], [ib, lb] = pts[q + 1], fa = q / (pts.length - 1), fb = (q + 1) / (pts.length - 1);
        const A = Math.sin(fa * Math.PI) * (a0 + (a1 - a0) * fa), B = Math.sin(fb * Math.PI) * (a0 + (a1 - a0) * fb);
        const v = [P(ia, la - w / 2), P(ia, la + w / 2), P(ib, lb + w / 2), P(ib, lb - w / 2)];
        for (const [vv, a] of [[v[0], A], [v[1], A], [v[2], B], [v[0], A], [v[2], B], [v[3], B]]) { pos.push(...vv); col.push(...rgb, a); }
      }
    };
    const halfW = L.halfW ?? 6, edge = L.edge ?? halfW + 1;
    for (const c of corners) {
      const out = -c.sign;   // the outside of the corner (lateral sign)
      // Braking streaks: lock-ups on the way in, near the outside where the cars brake.
      const bz = Math.round((40 + Math.min(110, 0.9 / c.k)) / ds);
      for (let s = 0; s < 3 + Math.floor(R() * 4); s++) {
        const i0 = c.i - bz * (0.8 + R() * 0.5), len = (15 + R() * 45) / ds, lat0 = out * (halfW - 1.4 - R() * 2.2) + (R() - 0.5) * 1.2, pts = [];
        for (let q = 0; q <= 10; q++) pts.push([i0 + (q / 10) * len, lat0 + Math.sin(q * 0.7 + s) * 0.08 + q * 0.02 * -out]);
        strip(pts, 0.24 + R() * 0.08, [0.03, 0.03, 0.035], 0.18 + R() * 0.25, 0.1 + R() * 0.2);
      }
      // Gone wide: tyre tracks into the run-off at the exit (rubber on paved run-off, ruts in gravel and grass).
      const side = out > 0 ? 'L' : 'R', wallOut = L.wall?.[side]?.[c.i] ?? edge + 2;
      if (wallOut - edge < 5) continue;
      const verge = L.vergeAt?.(side, c.i) ?? 'paved', rgb = verge === 'paved' ? [0.03, 0.03, 0.035] : verge === 'gravel' ? [0.32, 0.28, 0.22] : [0.2, 0.17, 0.1];
      for (let s = 0; s < 1 + Math.floor(R() * 3); s++) {
        const i0 = c.i + (R() * 10) / ds, depth = Math.min(wallOut - edge - 1.5, 4 + R() * 16), len = (25 + R() * 35) / ds, pts = [];
        for (let q = 0; q <= 14; q++) { const f = q / 14; pts.push([i0 + f * len, out * (halfW - 0.5 + Math.sin(f * Math.PI * 0.85) * (edge - halfW + depth))]); }
        for (const off of [-0.8, 0.8]) strip(pts.map(([i, l]) => [i, l + off]), 0.3, rgb, 0.5, 0.35);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3)); g.setAttribute('color', new Float32BufferAttribute(col, 4));
    const n = new Float32Array(pos.length); for (let i = 1; i < n.length; i += 3) n[i] = 1; g.setAttribute('normal', new Float32BufferAttribute(n, 3));
    this.wear = new Mesh(g, new MeshStandardMaterial({ vertexColors: true, transparent: true, depthWrite: false, roughness: 0.6, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    this.wear.renderOrder = 1; this.wear.frustumCulled = false;
    this.scene.add(this.wear);
  }

  clear() {
    for (const s of [this.stones, this.grass, this.dust, this.marbles, this.sparks, this.lockSmoke]) s.clear();
    this.ruts.clear?.(); this.gravel.count = 0; this.dots.count = 0; this.cursor = { gravel: 0, dots: 0 }; this.cars.clear();
  }

  place(which, x, y, z, s = 1) {
    const m = this[which], i = this.cursor[which] % m.instanceMatrix.count;
    _o.position.set(x, y, z); _o.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    _o.scale.set(s, which === 'dots' ? s * 0.4 : s, s); _o.updateMatrix();
    m.setMatrixAt(i, _o.matrix); m.count = Math.max(m.count, i + 1); m.instanceMatrix.needsUpdate = true;
    this.cursor[which]++;
  }

  /**
   * One car's tyres on the ground this frame: key (a stable id), slot (an emitter slot 0..), the wheel
   * contact points [{ p, surface }], the car's velocity, speed (m/s), how hard it's sliding (0..1), the
   * tyres' wear (0..1), locked (0..1).
   */
  tyres(key, slot, wheels, vel, speed, slide, wear, locked, dt) {
    const st = this.cars.get(key) ?? { from: null, dirty: 0, gravelLeft: 0 };
    this.cars.set(key, st);
    const off = wheels.some((w) => w.surface === 'gravel' || w.surface === 'grass');
    wheels.forEach((w, j) => {
      const s = slot * 4 + j, onGravel = w.surface === 'gravel', onGrass = w.surface === 'grass';
      if (speed > 3 && (onGravel || onGrass)) {
        if (onGravel) this.stones.emit(s % this.stones.spawnDebt.length, w.p, vel, Math.min(160, speed * 6), dt);
        else this.grass.emit(s % this.grass.spawnDebt.length, w.p, vel, Math.min(120, speed * 4), dt);
        if (j >= wheels.length - 2) this.dust.emit(s % this.dust.spawnDebt.length, w.p, vel, Math.min(26, speed * (onGravel ? 1.4 : 0.7)), dt);
        this.ruts.add(s % (4 + AI_SLOTS), w.p, w.lat ?? _l.set(1, 0, 0), 0.32, onGravel ? 0.75 : 0.55, w.h ?? w.p.y);
      } else {
        this.ruts.add(s % (4 + AI_SLOTS), w.p, w.lat ?? _l.set(1, 0, 0), 0, 0, 0);
        // Back on the asphalt with dirty tyres: they shed what they picked up, and gravel is left on the track.
        if (st.dirty > 0 && speed > 3) {
          (st.from === 'gravel' ? this.stones : this.grass).emit(s % this.stones.spawnDebt.length, w.p, vel, 60 * st.dirty, dt);
          if (st.from === 'gravel' && st.gravelLeft > 0 && Math.random() < dt * speed * 1.4) this.place('gravel', w.p.x + (Math.random() - 0.5) * 0.9, (w.h ?? w.p.y) + 0.02, w.p.z + (Math.random() - 0.5) * 0.9, 0.7 + Math.random() * 0.8);
        }
        // Worn tyres at the limit shed rubber: marbles, bounced off and left off the line.
        if (slide > 0.25 && wear > 0.15 && speed > 12) {
          this.marbles.emit(s % this.marbles.spawnDebt.length, w.p, vel, slide * wear * 90, dt);
          if (Math.random() < slide * wear * dt * 3) { const lat = w.lat ?? _l.set(1, 0, 0), d = 1.5 + Math.random() * 3; this.place('dots', w.p.x + lat.x * d * (Math.random() < 0.5 ? -1 : 1), (w.h ?? w.p.y) + 0.012, w.p.z + lat.z * d, 0.8 + Math.random() * 0.6); }
        }
        if (locked > 0.3 && speed > 8) this.lockSmoke.emit(s % this.lockSmoke.spawnDebt.length, w.p, vel, 30 * locked, dt);
      }
    });
    if (off) { st.from = wheels.find((w) => w.surface === 'gravel') ? 'gravel' : 'grass'; st.dirty = 1; st.gravelLeft = 45; }
    else { st.dirty = Math.max(0, st.dirty - dt * 0.35); if (st.gravelLeft > 0) st.gravelLeft -= speed * dt; }
  }

  /** Sparks from the plank: at point p, at a rate. */
  spark(slot, p, vel, rate, dt) { this.sparks.emit(slot % this.sparks.spawnDebt.length, p, vel, rate, dt); }

  /** The AI field: their tyres off the track and on it, sparks at speed (cheap: two rear contacts per car). */
  ai(cars, dt, camPos) {
    if (!this.L) return;
    cars.forEach((a, n) => {
      const c = a.car;
      if (!c || a.state !== 'track' || !a.visual?.root?.visible) return;
      const dx = c.x - camPos.x, dz = c.z - camPos.z;
      if (dx * dx + dz * dz > 260 * 260) return;   // too far to see
      const cos = Math.cos(c.h), sin = Math.sin(c.h), speed = Math.max(0, c.u);
      const vel = _v.set(cos * speed, 0, sin * speed), wheels = [];
      for (const sx of [-0.8, 0.8]) {
        const x = c.x - cos * 1.7 - sin * sx, z = c.z - sin * 1.7 + cos * sx, h = this.ground?.heightAt?.(x, z) ?? 0;
        wheels.push({ p: new Vector3(x, h, z), h, surface: this.ground?.surfaceAt?.(x, z)?.kind ?? c.surface, lat: new Vector3(-sin, 0, cos) });
      }
      const slide = Math.min(1, Math.abs(c.vlat ?? 0) / 2.5);
      this.tyres(`ai${a.id ?? n}`, 4 + (n % (AI_SLOTS / 4)), wheels, vel, speed, slide, Math.min(1, a.tyreWear ?? 0.3), (c.brake ?? 0) > 0.85 && speed > 30 ? 0.35 : 0, dt);
      // Sparks off the plank at speed (flickers), more over kerbs.
      if (speed > 55 && Math.random() < (wheels.some((w) => w.surface === 'kerb') ? 0.6 : 0.12)) {
        _p.set(c.x - cos * 0.6, wheels[0].h + 0.05, c.z - sin * 0.6);
        this.spark(8 + (n % 64), _p, vel, 700, dt);
      }
    });
  }

  update(dt, h, fov) {
    for (const s of [this.stones, this.grass, this.dust, this.marbles, this.sparks, this.lockSmoke]) s.update(dt, h, fov);
    this.ruts.flush();
    // The track rubbers in: marbles gather off the line through the corners as the session goes on.
    if (this.L && this.corners.length && Math.random() < dt * 0.8) {
      const c = this.corners[Math.floor(Math.random() * this.corners.length)], L = this.L, j = (c.i + Math.floor((Math.random() - 0.3) * 30 / L.ds) + L.N) % L.N;
      const lat = -c.sign * ((L.halfW ?? 6) - 0.6 - Math.random() * 1.6) * (Math.random() < 0.2 ? -1 : 1), x = L.x[j] + L.nx[j] * lat, z = L.z[j] + L.nz[j] * lat;
      this.place('dots', x, (this.ground?.heightAt?.(x, z) ?? 0) + 0.012, z, 0.7 + Math.random() * 0.7);
    }
  }
}

function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
