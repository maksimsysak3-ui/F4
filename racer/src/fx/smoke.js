import { BufferGeometry, Float32BufferAttribute, Points, ShaderMaterial, DynamicDrawUsage, Color } from 'three';

const MAX = 700;

/**
 * Tire smoke: pooled soft billboards that billow, rise and fade. Options make the
 * same pool work for rain spray (short-lived, low, pale).
 */
export class Smoke {
  constructor(scene, o = {}) {
    this.o = { color: [0.62, 0.64, 0.7], life: [1.6, 1.4], size: [0.7, 4.2], alpha: 0.33, lift: 0.25, rise: [0.6, 0.9], carry: 0.25, ...o };
    this.pos = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.age = new Float32Array(MAX).fill(1);
    this.life = new Float32Array(MAX).fill(1);
    this.size = new Float32Array(MAX);
    this.alpha = new Float32Array(MAX);
    this.geo = new BufferGeometry();
    this.posAttr = new Float32BufferAttribute(this.pos, 3).setUsage(DynamicDrawUsage);
    this.sizeAttr = new Float32BufferAttribute(this.size, 1).setUsage(DynamicDrawUsage);
    this.alphaAttr = new Float32BufferAttribute(this.alpha, 1).setUsage(DynamicDrawUsage);
    this.geo.setAttribute('position', this.posAttr);
    this.geo.setAttribute('aSize', this.sizeAttr);
    this.geo.setAttribute('aAlpha', this.alphaAttr);

    this.material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uScale: { value: 600 },
        uColor: { value: new Color(...this.o.color) },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAlpha;
        uniform float uScale;
        varying float vAlpha;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uScale / max(0.5, -mv.z);
          vAlpha = aAlpha;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = dot(d, d) * 4.0;
          if (r > 1.0) discard;
          float a = (1.0 - r) * (1.0 - r) * vAlpha;
          gl_FragColor = vec4(uColor * (0.85 + 0.15 * (1.0 - r)), a);
        }`,
    });
    this.points = new Points(this.geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    scene.add(this.points);
    this.cursor = 0;
    this.spawnDebt = new Float32Array(8);
  }

  /** Emit at a contact point. rate = particles per second. */
  emit(slot, point, carVel, rate, dt) {
    this.spawnDebt[slot] += rate * dt;
    while (this.spawnDebt[slot] >= 1) {
      this.spawnDebt[slot] -= 1;
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % MAX;
      this.pos[i * 3] = point.x + (Math.random() - 0.5) * 0.3;
      this.pos[i * 3 + 1] = point.y + 0.15;
      this.pos[i * 3 + 2] = point.z + (Math.random() - 0.5) * 0.3;
      const { carry, rise, life } = this.o;
      this.vel[i * 3] = carVel.x * carry + (Math.random() - 0.5) * 1.6;
      this.vel[i * 3 + 1] = rise[0] + Math.random() * rise[1];
      this.vel[i * 3 + 2] = carVel.z * carry + (Math.random() - 0.5) * 1.6;
      this.age[i] = 0;
      this.life[i] = life[0] + Math.random() * life[1];
    }
  }

  update(dt, viewportHeight, fovDeg) {
    this.material.uniforms.uScale.value = viewportHeight / (2 * Math.tan((fovDeg * Math.PI) / 360));
    for (let i = 0; i < MAX; i++) {
      const life = this.life[i];
      let a = this.age[i];
      if (a >= life) { this.alpha[i] = 0; this.size[i] = 0; continue; }
      a += dt;
      this.age[i] = a;
      const t = a / life;
      const drag = Math.exp(-1.8 * dt);
      this.vel[i * 3] *= drag;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * drag + this.o.lift * dt;
      this.vel[i * 3 + 2] *= drag;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] = this.o.size[0] + t * this.o.size[1];
      this.alpha[i] = Math.min(1, t * 8) * (1 - t) * this.o.alpha;
    }
    this.posAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
  }

  clear() {
    this.age.fill(1);
    this.life.fill(1);
  }
}
