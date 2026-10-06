import {
  Scene, Mesh, SphereGeometry, PlaneGeometry, ShaderMaterial, MeshBasicMaterial, BackSide, Color,
  BufferGeometry, Float32BufferAttribute, Points, PointsMaterial, AdditiveBlending, CanvasTexture,
  HemisphereLight, DirectionalLight, PMREMGenerator, FogExp2, Vector3,
} from 'three';

const HORIZON = new Color(0x0c1022);

const DAY_HAZE = 2.1;

/** Gradient void: indigo glow at the horizon fading to black above and far below. */
function skyDome() {
  const mat = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      horizon: { value: HORIZON },
      zenith: { value: new Color(0x010104) },
      abyss: { value: new Color(0x000000) },
      glow: { value: new Color(0x2a1a4a) },
      sunDir: { value: new Vector3(-0.8, 0.12, 0.3).normalize() },
      sunColor: { value: new Color(0, 0, 0) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 horizon, zenith, abyss, glow, sunDir, sunColor;
      varying vec3 vDir;
      void main() {
        float y = vDir.y;
        vec3 c = y > 0.0 ? mix(horizon, zenith, pow(min(1.0, y * 2.2), 0.6))
                         : mix(horizon, abyss, pow(min(1.0, -y * 3.0), 0.5));
        // Faint aurora band hugging the horizon.
        float band = exp(-pow(y * 9.0 - 0.6, 2.0)) * (0.55 + 0.45 * sin(atan(vDir.z, vDir.x) * 3.0 + 1.3));
        c += glow * band * 0.6;
        // Low sun: a soft halo and a bright core.
        float sd = max(0.0, dot(normalize(vDir), sunDir));
        c += sunColor * (pow(sd, 8.0) * 0.35 + pow(sd, 90.0) * 1.2 + pow(sd, 2000.0) * 6.0);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new Mesh(new SphereGeometry(1, 32, 16), mat);
  mesh.scale.setScalar(3000);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return mesh;
}

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new CanvasTexture(c);
}

function starfield(tex) {
  const n = 2200;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    pos.set([Math.cos(a) * r * 2500, u * 2500, Math.sin(a) * r * 2500], i * 3);
    const b = 0.3 + Math.random() ** 3 * 1.6;
    const warm = Math.random();
    col.set([b * (0.8 + warm * 0.2), b * 0.85, b * (1.05 - warm * 0.25)], i * 3);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new Float32BufferAttribute(col, 3));
  const mat = new PointsMaterial({
    size: 2.2, sizeAttenuation: false, map: tex, vertexColors: true, transparent: true,
    depthWrite: false, blending: AdditiveBlending, fog: false,
  });
  const pts = new Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

/** Drifting motes in a box that wraps around the camera: gives the void a sense of speed. */
class Dust {
  constructor(tex) {
    this.n = 500;
    this.size = 90;
    this.base = new Float32Array(this.n * 3);
    for (let i = 0; i < this.base.length; i++) this.base[i] = Math.random() * this.size;
    this.geo = new BufferGeometry();
    this.geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(this.n * 3), 3));
    this.points = new Points(this.geo, new PointsMaterial({
      size: 0.18, map: tex, color: 0x8fa6ff, transparent: true, opacity: 0.55,
      depthWrite: false, blending: AdditiveBlending,
    }));
    this.points.frustumCulled = false;
    this.drift = new Vector3();
  }

  update(camPos, dt) {
    this.drift.x += dt * 0.4;
    this.drift.y += dt * 0.15;
    const s = this.size;
    const arr = this.geo.attributes.position.array;
    for (let i = 0; i < this.n; i++) {
      const k = i * 3;
      for (let a = 0; a < 3; a++) {
        const c = a === 0 ? camPos.x : a === 1 ? camPos.y : camPos.z;
        const d = a === 0 ? this.drift.x : a === 1 ? this.drift.y : this.drift.z;
        let v = (this.base[k + a] + d - c) % s;
        if (v < 0) v += s;
        arr[k + a] = c + v - s / 2;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}

/** Studio light rig, rendered once into a PMREM env map for car reflections. */
function studioEnvironment(renderer) {
  const scene = new Scene();
  scene.background = new Color(0x06070c);
  const box = (w, h, color, pos, look) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color, side: BackSide }));
    m.position.set(...pos);
    m.lookAt(...look);
    scene.add(m);
  };
  const dome = new Mesh(new SphereGeometry(50, 32, 16), new ShaderMaterial({
    side: BackSide,
    vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 d; void main(){ float y = d.y; vec3 c = mix(vec3(0.02,0.022,0.035), vec3(0.09,0.1,0.16), smoothstep(-0.2,0.6,y)); c += vec3(0.55,0.6,0.75) * exp(-pow(y * 7.0 - 0.35, 2.0)); gl_FragColor = vec4(c,1.0); }',
  }));
  scene.add(dome);
  box(40, 12, new Color(3.2, 3.1, 3.0), [0, 30, 0], [0, 0, 0]);         // overhead softbox
  box(30, 3, new Color(2.2, 2.4, 3.0), [-30, 8, 0], [0, 4, 0]);        // cool side strip
  box(30, 3, new Color(3.0, 2.3, 1.6), [30, 6, 6], [0, 4, 0]);         // warm side strip
  box(20, 2, new Color(1.5, 1.6, 2.0), [0, 4, -32], [0, 4, 0]);        // rear kicker
  box(14, 1.5, new Color(1.2, 1.2, 1.4), [0, 3, 32], [0, 4, 0]);
  const pmrem = new PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.03);
  pmrem.dispose();
  return rt.texture;
}

export const MOODS = {
  void: {
    horizon: 0x0c1022, zenith: 0x010104, abyss: 0x000000, glow: 0x2a1a4a, sunGlow: 0x000000,
    sunDir: new Vector3(-18, 34, 14).normalize(), fog: 0x0c1022, fogDensity: 0.0019, stars: 1, dust: true,
    hemiSky: 0xb4c4ff, hemiGround: 0x1a1420, hemi: 0.9, sun: 0xfff1dc, sunIntensity: 2.4, rim: 1.0, envIntensity: 0.9,
  },
  // Riviera golden hour: low warm sun in the west, violet zenith, peach haze.
  dusk: {
    horizon: 0xe9946a, zenith: 0x1b2c5a, abyss: 0x2a2030, glow: 0xb05a7a, sunGlow: 0xffb070,
    sunDir: new Vector3(-0.82, 0.2, 0.34).normalize(), fog: 0xb08078, fogDensity: 0.0013, stars: 0.35, dust: false,
    hemiSky: 0x9fb2e0, hemiGround: 0x6a4a3c, hemi: 1.05, sun: 0xffb784, sunIntensity: 2.9, rim: 0.55, envIntensity: 1.0,
  },
  // Alpine morning in the pines: crisp blue sky, high sun, a cool green-blue haze.
  forest: {
    horizon: 0xd6e4e6, zenith: 0x3f7cc4, abyss: 0x2a3a2a, glow: 0xbfd8e8, sunGlow: 0xfff0c8,
    sunDir: new Vector3(0.45, 0.62, -0.38).normalize(), fog: 0xa8c2c6, fogDensity: 0.0017, stars: 0, dust: false,
    hemiSky: 0xd4e8ff, hemiGround: 0x4a5a32, hemi: 1.15, sun: 0xfff2d8, sunIntensity: 3.0, rim: 0.45, envIntensity: 1.0,
  },
  // North Sea coast: bright, slightly hazy afternoon with a high pale sky and a sea breeze haze.
  coast: {
    horizon: 0xdfe6ea, zenith: 0x5a8cc8, abyss: 0x3a4a52, glow: 0xe8eef2, sunGlow: 0xfff4d8,
    sunDir: new Vector3(-0.55, 0.55, 0.45).normalize(), fog: 0xc8d4dc, fogDensity: 0.0006, stars: 0, dust: false,
    hemiSky: 0xdce8f4, hemiGround: 0x6a6a52, hemi: 1.15, sun: 0xfff2e0, sunIntensity: 3.0, rim: 0.45, envIntensity: 1.0,
  },
  // Central Texas: hot, clear late afternoon, warm low sun and a dusty horizon.
  texas: {
    horizon: 0xf0d8b0, zenith: 0x3a78c8, abyss: 0x5a4a3a, glow: 0xf4d0a0, sunGlow: 0xffd28a,
    sunDir: new Vector3(0.7, 0.38, -0.35).normalize(), fog: 0xd8c8a8, fogDensity: 0.0008, stars: 0, dust: false,
    hemiSky: 0xd8e4f4, hemiGround: 0x8a7a52, hemi: 1.1, sun: 0xffe2b8, sunIntensity: 3.2, rim: 0.5, envIntensity: 1.0,
  },
  // São Paulo: humid, hazy subtropical afternoon over the city.
  saopaulo: {
    horizon: 0xd8d8cc, zenith: 0x6a94c0, abyss: 0x4a4a42, glow: 0xe4e0d0, sunGlow: 0xfff0c8,
    sunDir: new Vector3(0.3, 0.6, 0.55).normalize(), fog: 0xc8c8bc, fogDensity: 0.0008, stars: 0, dust: false,
    hemiSky: 0xd8e2ec, hemiGround: 0x5a6a42, hemi: 1.15, sun: 0xfff0dc, sunIntensity: 2.7, rim: 0.5, envIntensity: 1.0,
  },
  // Catalan May afternoon: clear sky, warm dry light, a dusty haze over the hills.
  spain: {
    horizon: 0xf0e0c0, zenith: 0x3a78cc, abyss: 0x4a4434, glow: 0xf4e4c8, sunGlow: 0xfff0c8,
    sunDir: new Vector3(0.45, 0.6, -0.4).normalize(), fog: 0xe0d4b8, fogDensity: 0.0007, stars: 0, dust: false,
    hemiSky: 0xe0e8f0, hemiGround: 0x7a6a44, hemi: 1.15, sun: 0xfff2dc, sunIntensity: 2.9, rim: 0.5, envIntensity: 1.0,
  },
  // South Florida afternoon: hot blue sky, white light, a peach haze on the horizon.
  miami: {
    horizon: 0xf8dcc4, zenith: 0x2a7ad8, abyss: 0x3a4a4a, glow: 0xffe8d0, sunGlow: 0xfff0d0,
    sunDir: new Vector3(-0.3, 0.7, 0.45).normalize(), fog: 0xe8dcd0, fogDensity: 0.0006, stars: 0, dust: false,
    hemiSky: 0xe0ecf8, hemiGround: 0x6a7050, hemi: 1.2, sun: 0xfff6e8, sunIntensity: 3.0, rim: 0.5, envIntensity: 1.1,
  },
  // Riviera spring: deep blue sky, crisp Mediterranean light, a soft sea haze.
  monaco: {
    horizon: 0xe8e0cc, zenith: 0x3a74c4, abyss: 0x2a4a5a, glow: 0xf2e8d0, sunGlow: 0xfff2d0,
    sunDir: new Vector3(0.4, 0.66, 0.5).normalize(), fog: 0xd8dcd8, fogDensity: 0.0007, stars: 0, dust: false,
    hemiSky: 0xdde8f2, hemiGround: 0x6a6450, hemi: 1.15, sun: 0xfff4e0, sunIntensity: 2.8, rim: 0.5, envIntensity: 1.05,
  },
  // Hungarian summer: hot, hazy, bright; a pale gold horizon over the plain.
  hungary: {
    horizon: 0xe8dcb8, zenith: 0x5a8ccc, abyss: 0x4e4a3e, glow: 0xf0e4c4, sunGlow: 0xfff0c0,
    sunDir: new Vector3(-0.35, 0.62, 0.5).normalize(), fog: 0xd8d0b4, fogDensity: 0.0007, stars: 0, dust: false,
    hemiSky: 0xdce6f0, hemiGround: 0x6a6a3e, hemi: 1.15, sun: 0xfff2d8, sunIntensity: 2.8, rim: 0.5, envIntensity: 1.0,
  },
  // Caspian afternoon: a pale, windy sky, warm sandstone light, dust in the air.
  baku: {
    horizon: 0xeadcc4, zenith: 0x4a7ac0, abyss: 0x3a3a34, glow: 0xf4e4c8, sunGlow: 0xfff0d0,
    sunDir: new Vector3(0.5, 0.58, 0.35).normalize(), fog: 0xe2d6c0, fogDensity: 0.0007, stars: 0, dust: false,
    hemiSky: 0xe0e6ee, hemiGround: 0x7a6a50, hemi: 1.15, sun: 0xfff0dc, sunIntensity: 2.8, rim: 0.5, envIntensity: 1.0,
  },
  // English summer: soft grey-blue sky, broken cloud light, a green-grey haze.
  silverstone: {
    horizon: 0xd8dce0, zenith: 0x6a8cb8, abyss: 0x3e4440, glow: 0xe8ecee, sunGlow: 0xf4f2e8,
    sunDir: new Vector3(-0.4, 0.55, 0.45).normalize(), fog: 0xc8d0d0, fogDensity: 0.0008, stars: 0, dust: false,
    hemiSky: 0xd8e2ec, hemiGround: 0x4a5a3a, hemi: 1.3, sun: 0xf6f2e8, sunIntensity: 2.2, rim: 0.4, envIntensity: 1.0,
  },
  // Yas Marina after sunset: violet-blue twilight, floodlit, the glow of the marina.
  yas: {
    horizon: 0x5a3a8a, zenith: 0x060a20, abyss: 0x0a0a18, glow: 0xff7ad8, sunGlow: 0xc8a8ff,
    sunDir: new Vector3(-0.3, 0.6, 0.4).normalize(), fog: 0x1e1a3a, fogDensity: 0.0009, stars: 0.6, dust: false,
    hemiSky: 0xc0c8ff, hemiGround: 0x4a3a5a, hemi: 1.7, sun: 0xe8eaff, sunIntensity: 2.4, rim: 1.0, envIntensity: 1.0,
  },
  // High Alps: a deep blue sky, hard bright sun on the snow, crystal-clear air.
  alpine: {
    horizon: 0xdce8f4, zenith: 0x1e5ab8, abyss: 0x3a4250, glow: 0xf0f4fa, sunGlow: 0xfffaf0,
    sunDir: new Vector3(0.4, 0.62, -0.45).normalize(), fog: 0xd8e2ee, fogDensity: 0.00045, stars: 0, dust: false,
    hemiSky: 0xe4eef8, hemiGround: 0x8a8e98, hemi: 1.25, sun: 0xfffaf2, sunIntensity: 3.1, rim: 0.55, envIntensity: 1.15,
  },
  // Desert canyon at golden hour: deep blue zenith, orange haze, low warm sun on red rock.
  canyon: {
    horizon: 0xf0b884, zenith: 0x3a62a8, abyss: 0x5a3a2a, glow: 0xffc890, sunGlow: 0xffd8a0,
    sunDir: new Vector3(0.55, 0.32, -0.45).normalize(), fog: 0xe0a880, fogDensity: 0.0006, stars: 0, dust: true,
    hemiSky: 0xf0d8c0, hemiGround: 0x8a4a30, hemi: 1.1, sun: 0xffd2a0, sunIntensity: 3.0, rim: 0.7, envIntensity: 1.0,
  },
  // Night race: deep navy sky with stars and a violet city glow, lit like a stadium.
  night: {
    horizon: 0x24305e, zenith: 0x03050f, abyss: 0x0a0a14, glow: 0x5a2a8a, sunGlow: 0x8fa8ff,
    sunDir: new Vector3(0.35, 0.55, 0.45).normalize(), fog: 0x141a32, fogDensity: 0.0012, stars: 1, dust: false,
    hemiSky: 0xa8b8f0, hemiGround: 0x3a3050, hemi: 1.55, sun: 0xd8e2ff, sunIntensity: 2.2, rim: 1.0, envIntensity: 0.9,
  },
};

export class Environment {
  constructor(scene, renderer) {
    this.scene = scene;
    const tex = dotTexture();
    scene.fog = new FogExp2(HORIZON.getHex(), 0.0019);
    scene.background = new Color(0x000000);
    scene.environment = studioEnvironment(renderer);
    scene.environmentIntensity = 0.9;

    this.sky = skyDome();
    this.stars = starfield(tex);
    this.dust = new Dust(tex);
    scene.add(this.sky, this.stars, this.dust.points);

    this.hemi = new HemisphereLight(0xb4c4ff, 0x1a1420, 0.9);
    scene.add(this.hemi);

    // Key light follows the car so its shadow map stays tight and crisp.
    this.sun = new DirectionalLight(0xfff1dc, 2.4);
    this.sunOffset = new Vector3(-18, 34, 14);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 90;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.035;
    scene.add(this.sun, this.sun.target);

    // Cool fill that rides with the camera, so whichever side of the car you see
    // (the key light is fixed in the world) never sinks into the black void.
    this.rim = new DirectionalLight(0x9fb4ff, 1.0);
    scene.add(this.rim, this.rim.target);
  }

  /** Switch the whole atmosphere: 'void' (the black ring) or 'dusk' (the harbour town). */
  setMood(name) {
    this.moodName = name;
    const m = MOODS[name] || MOODS.void;
    const u = this.sky.material.uniforms;
    u.horizon.value.set(m.horizon);
    u.zenith.value.set(m.zenith);
    u.abyss.value.set(m.abyss);
    u.glow.value.set(m.glow);
    u.sunColor.value.set(m.sunGlow);
    u.sunDir.value.copy(m.sunDir);
    this.scene.fog.color.set(m.fog);
    // Day air is hazier than the sky alone suggests: from a car's low eye line the detail fades out by
    // ~500 m and only big landforms show beyond a kilometre. (Night moods are already dense.)
    this.scene.fog.density = m.fogDensity < 0.001 ? m.fogDensity * DAY_HAZE : m.fogDensity;
    this.stars.material.opacity = m.stars;
    this.dust.points.visible = m.dust;
    this.hemi.color.set(m.hemiSky);
    this.hemi.groundColor.set(m.hemiGround);
    this.hemi.intensity = m.hemi;
    this.sun.color.set(m.sun);
    this.sun.intensity = m.sunIntensity;
    this.sunOffset.copy(m.sunDir).multiplyScalar(40);
    this.rim.intensity = m.rim;
    this.scene.environmentIntensity = m.envIntensity;
  }

  /**
   * Rain: the same mood under cloud. The sky and fog go grey (dark slate at
   * night), the sun all but disappears so shadows soften, and the haze closes in.
   */
  setRain(on) {
    this.setMood(this.moodName);
    this.rain = on;
    if (!on) return;
    const night = this.moodName === 'night' || this.moodName === 'void' || this.moodName === 'yas';
    const cloud = new Color(night ? 0x1a2030 : 0x7c858f);
    const u = this.sky.material.uniforms;
    u.horizon.value.lerp(cloud, 0.8);
    u.zenith.value.lerp(cloud.clone().multiplyScalar(night ? 0.5 : 0.62), 0.85);
    u.glow.value.lerp(cloud, 0.7);
    u.sunColor.value.multiplyScalar(0.15);
    this.scene.fog.color.lerp(cloud, 0.75);
    this.scene.fog.density *= night ? 1.6 : 2.4;
    this.stars.material.opacity = 0;
    this.sun.intensity *= night ? 0.12 : 0.28; // a glossy road catches any strong key light as a big beige sheen
    this.hemi.intensity *= night ? 0.95 : 0.9;
    this.hemi.color.lerp(cloud, 0.3);
    this.scene.environmentIntensity *= 1.1;
  }

  update(focus, camera, dt) {
    this.sun.position.copy(focus).add(this.sunOffset);
    this.sun.target.position.copy(focus);
    this.rim.position.copy(camera.position).y += 6;
    this.rim.target.position.copy(focus);
    this.sky.position.copy(camera.position);
    this.stars.position.copy(camera.position);
    this.dust.update(camera.position, dt);
  }
}
