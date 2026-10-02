import { BufferGeometry, Float32BufferAttribute, LineSegments, ShaderMaterial, Vector3, Color } from 'three';

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
  }

  set active(on) { this.mesh.visible = on; }
  get active() { return this.mesh.visible; }

  /** Night tracks get brighter streaks (they catch the floodlights). */
  setTint(night) {
    this.material.uniforms.uColor.value.set(night ? 0xc8d4ff : 0xb8c0cc);
    this.material.uniforms.uOpacity.value = night ? 0.5 : 0.38;
  }

  update(dt, camera, carVelocity) {
    if (!this.mesh.visible) return;
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
