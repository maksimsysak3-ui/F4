import { BufferGeometry, Float32BufferAttribute, LineSegments, Points, ShaderMaterial, Vector3, Color, AdditiveBlending } from 'three';

const DROPS = 9000;
const BOX = new Vector3(70, 34, 70);

/**
 * Rain: streaks in a box that wraps around the camera. All motion happens in
 * the vertex shader (seed + fall * time, wrapped), so the CPU cost is one
 * uniform update per frame however many drops there are.
 */
export class Rain {
  constructor(scene) {
    const seed = new Float32Array(DROPS * 2 * 3);
    const end = new Float32Array(DROPS * 2);
    for (let i = 0; i < DROPS; i++) {
      const s = [Math.random(), Math.random(), Math.random()];
      for (let k = 0; k < 2; k++) {
        seed.set(s, (i * 2 + k) * 3);
        end[i * 2 + k] = k;
      }
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(seed, 3)); // seeds; real positions come from the shader
    geo.setAttribute('aEnd', new Float32BufferAttribute(end, 1));
    this.material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uCam: { value: new Vector3() },
        uBox: { value: BOX.clone() },
        uFall: { value: new Vector3(1.6, -17, 0.8) },
        uRel: { value: new Vector3() },
        uColor: { value: new Color(0.75, 0.8, 0.88) },
        uOpacity: { value: 0.4 },
      },
      vertexShader: /* glsl */ `
        attribute float aEnd;
        uniform float uTime;
        uniform vec3 uCam, uBox, uFall, uRel, uColor;
        varying float vFade;
        void main() {
          vec3 p = mod(position * uBox + uFall * uTime - uCam, uBox) - uBox * 0.5 + uCam;
          // Streak length follows the drop's motion relative to the moving camera.
          p -= (uFall - uRel) * 0.035 * aEnd;
          float d = length(p.xz - uCam.xz);
          vFade = smoothstep(1.4, 3.0, d) * (1.0 - smoothstep(18.0, 34.0, d)); // not inside the cabin, thin out far away
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vFade;
        void main() { gl_FragColor = vec4(uColor, uOpacity * vFade); }`,
    });
    this.mesh = new LineSegments(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    this.mesh.visible = false;
    scene.add(this.mesh);

    // Splashes: drops bursting on the ground around the car, each a short-lived expanding ring.
    const SPL = 700, sp = new Float32Array(SPL * 3);
    for (let i = 0; i < SPL * 3; i++) sp[i] = Math.random();
    const sgeo = new BufferGeometry();
    sgeo.setAttribute('position', new Float32BufferAttribute(sp, 3));
    this.splashMat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uTime: this.material.uniforms.uTime, uCenter: { value: new Vector3() }, uScale: { value: 600 }, uColor: { value: new Color(0.7, 0.75, 0.82) } },
      vertexShader: /* glsl */ `
        uniform float uTime, uScale;
        uniform vec3 uCenter;
        varying float vLife;
        void main() {
          float cyc = floor(uTime * 2.2 + position.z);
          vLife = fract(uTime * 2.2 + position.z);
          vec2 r = fract(sin(vec2(dot(position.xy + cyc, vec2(12.9898, 78.233)), dot(position.xy + cyc, vec2(39.346, 11.135)))) * 43758.5453);
          vec3 p = vec3(uCenter.x + (r.x - 0.5) * 34.0, uCenter.y + 0.06, uCenter.z + (r.y - 0.5) * 34.0);
          vec4 mv = viewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (0.08 + vLife * 0.22) * uScale / -mv.z;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vLife;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          d.y *= 2.6; // lying flat on the road, seen at a glancing angle
          float r = length(d) * 2.0;
          float ring = smoothstep(0.55, 0.85, r) * (1.0 - smoothstep(0.85, 1.0, r));
          gl_FragColor = vec4(uColor * (ring + (1.0 - smoothstep(0.0, 0.3, r)) * (1.0 - vLife)) * (1.0 - vLife) * 0.35, 1.0);
        }`,
    });
    this.splashes = new Points(sgeo, this.splashMat);
    this.splashes.frustumCulled = false;
    this.splashes.visible = false;
    scene.add(this.splashes);
  }

  set active(on) { this.mesh.visible = on; this.splashes.visible = on; }
  get active() { return this.mesh.visible; }

  /** Night tracks get brighter streaks (they catch the floodlights). */
  setTint(night) {
    this.material.uniforms.uColor.value.set(night ? 0xc8d4ff : 0xb8c0cc);
    this.material.uniforms.uOpacity.value = night ? 0.5 : 0.38;
  }

  /** ground: the road height under the car (splashes land around it). */
  update(dt, camera, carVelocity, ground = null, viewportHeight = 800) {
    if (!this.mesh.visible) return;
    if (ground) this.splashMat.uniforms.uCenter.value.copy(ground);
    this.splashMat.uniforms.uScale.value = viewportHeight;
    const u = this.material.uniforms;
    u.uTime.value = (u.uTime.value + dt) % 1000;
    u.uCam.value.copy(camera.position);
    u.uRel.value.copy(carVelocity);
  }
}

/**
 * Wet road look: every ground surface the track marks as shadow-receiving gets
 * darker and glossier so the lights and sky streak across it. `reflect` scales
 * the environment reflection (the studio env map is far too bright for a night road). Remembers the dry
 * values per material so toggling back is exact.
 */
export function setWetSurfaces(root, wet, reflect = 1) {
  root.traverse((o) => {
    if (!o.isMesh || !o.receiveShadow) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m || m.roughness === undefined) continue;
      if (!m.userData.dry) m.userData.dry = { roughness: m.roughness, color: m.color.clone(), env: m.envMapIntensity ?? 1, metal: m.metalness };
      const d = m.userData.dry;
      m.roughness = wet ? Math.max(0.2, d.roughness * 0.32) : d.roughness;
      m.color.copy(d.color).multiplyScalar(wet ? 0.55 : 1);
      m.envMapIntensity = wet ? d.env * reflect : d.env;
      m.metalness = d.metal;
    }
  });
}
