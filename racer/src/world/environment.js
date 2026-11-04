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
      time: { value: 0 },
      cloudCover: { value: 0 },
      cloudLit: { value: new Color(1, 1, 1) },
      cloudShade: { value: new Color(0.6, 0.62, 0.68) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 horizon, zenith, abyss, glow, sunDir, sunColor, cloudLit, cloudShade;
      uniform float time, cloudCover;
      varying vec3 vDir;
      // ---- procedural clouds: value-noise fBm on a cloud deck, lit by marching towards the sun ----
      float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
        for (int k = 0; k < 6; k++) { v += a * vnoise(p); p = m * p; a *= 0.5; }
        return v;
      }
      // Cumulus shape: a coverage-driven threshold of billowing fBm, eroded by finer detail.
      float cloudDensity(vec2 p) {
        float base = fbm(p * 0.9 + vec2(time * 0.010, time * 0.004));
        float detail = fbm(p * 3.1 - vec2(time * 0.025, 0.0));
        float d = base - (1.0 - cloudCover) * 0.78 - 0.08 + (detail - 0.5) * 0.22;
        return clamp(d * 3.2, 0.0, 1.0);
      }
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
        if (cloudCover > 0.001 && y > 0.0) {
          // Project onto a flat deck: far clouds bunch towards the horizon, near ones spread overhead.
          vec2 p = vDir.xz / (y + 0.08) * 1.35;
          float d = cloudDensity(p);
          if (d > 0.0) {
            // Light: march 4 steps towards the sun through the deck; thick cloud shades its own underside.
            vec2 toSun = normalize(sunDir.xz + 1e-4) * 0.11;
            float occ = 0.0;
            for (int k = 1; k <= 4; k++) occ += cloudDensity(p + toSun * float(k));
            float light = exp(-occ * 0.9);
            float silver = pow(sd, 6.0) * (1.0 - d) * 1.6;               // bright rims towards the sun
            vec3 cc = mix(cloudShade, cloudLit, light) + sunColor * silver * 0.35;
            float fade = smoothstep(0.0, 0.16, y);                       // thins into the haze at the horizon
            c = mix(c, cc, d * fade * 0.95);
          }
        }
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
  // Texas sunset: the sun on the horizon, orange and rose sky, long shadows, a warm dusty haze.
  texasSunset: {
    horizon: 0xff9a52, zenith: 0x2a3e7a, abyss: 0x3a2a24, glow: 0xffb070, sunGlow: 0xff8a3a,
    sunDir: new Vector3(0.82, 0.08, -0.3).normalize(), fog: 0xc88a62, fogDensity: 0.0011, stars: 0.1, dust: true,
    hemiSky: 0xb898a8, hemiGround: 0x4a3828, hemi: 0.85, sun: 0xff9a5a, sunIntensity: 1.8, rim: 0.7, envIntensity: 0.7,
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
  // Ardennes summer: bright, high clouds, a cool green haze; light falling through the spruce.
  ardennes: {
    clouds: 0.55,
    horizon: 0xdce6ec, zenith: 0x3a78c8, abyss: 0x2a3428, glow: 0xeef2f0, sunGlow: 0xfff6e0,
    sunDir: new Vector3(-0.45, 0.6, 0.4).normalize(), fog: 0xb8c8c4, fogDensity: 0.0008, stars: 0, dust: false,
    hemiSky: 0xd8e4ee, hemiGround: 0x2e3e26, hemi: 1.2, sun: 0xfff4e4, sunIntensity: 2.8, rim: 0.5, envIntensity: 1.0,
  },
  // Mie in spring: a clear, soft blue sky, warm afternoon sun, a light haze over the hills.
  suzuka: {
    clouds: 0.45,
    horizon: 0xe6ecf0, zenith: 0x3a7ad0, abyss: 0x3a3e34, glow: 0xf4f2ec, sunGlow: 0xfff4e0,
    sunDir: new Vector3(0.5, 0.55, 0.45).normalize(), fog: 0xd0d8dc, fogDensity: 0.0007, stars: 0, dust: false,
    hemiSky: 0xe0e8f2, hemiGround: 0x5a5a3a, hemi: 1.2, sun: 0xfff2e2, sunIntensity: 2.9, rim: 0.5, envIntensity: 1.05,
  },
  // Yas Marina at full night: black sky, the floodlights and the city doing all the work.
  yasNight: {
    clouds: 0.12,
    horizon: 0x141c3a, zenith: 0x02040c, abyss: 0x06060c, glow: 0x3a2a6a, sunGlow: 0x8a9aff,
    sunDir: new Vector3(-0.3, 0.6, 0.4).normalize(), fog: 0x0e1226, fogDensity: 0.0012, stars: 1, dust: false,
    hemiSky: 0xa8b4f0, hemiGround: 0x2a2838, hemi: 1.6, sun: 0xd8e2ff, sunIntensity: 2.0, rim: 1.0, envIntensity: 0.9,
  },
  // Jeddah at night: a black sky with a violet glow over the city, floodlit.
  jeddah: {
    clouds: 0,
    horizon: 0x040508, zenith: 0x000102, abyss: 0x020203, glow: 0x000000, sunGlow: 0x000000,
    sunDir: new Vector3(0.15, 0.95, 0.2).normalize(), fog: 0x040508, fogDensity: 0.0009, stars: 0, dust: false,
    // Night: almost no ambient; an overhead floodlight key for shape, and the real light comes from the
    // floodlight pools (world/nightLights.js), windows and neon.
    hemiSky: 0x7a84a8, hemiGround: 0x141218, hemi: 0.4, sun: 0xfff2e2, sunIntensity: 0.9, rim: 0.35, envIntensity: 0.28,
  },

  // Mexico City, 2,240 m up: a deep, clear sky, sharp sun, the valley haze on the mountains.
  // Styria in summer: deep blue alpine sky, big cumulus over the mountains, crisp air.
  austria: {
    clouds: 0.55,
    horizon: 0xd4e2ee, zenith: 0x2a64b8, abyss: 0x3a4430, glow: 0xeef2f4, sunGlow: 0xfff8e8,
    sunDir: new Vector3(0.35, 0.72, 0.3).normalize(), fog: 0xc6d4dc, fogDensity: 0.0005, stars: 0, dust: false,
    hemiSky: 0xd8e6f4, hemiGround: 0x4a5a34, hemi: 1.2, sun: 0xfff6e8, sunIntensity: 3.0, rim: 0.45, envIntensity: 1.05,
  },
  // Lombardy in September: warm, a soft summer haze over the park, a gold low-ish sun.
  monza: {
    clouds: 0.3,
    horizon: 0xe2e2d8, zenith: 0x3a78c8, abyss: 0x3a4430, glow: 0xf4eedc, sunGlow: 0xfff2d8,
    sunDir: new Vector3(0.45, 0.6, 0.35).normalize(), fog: 0xd8dcd4, fogDensity: 0.00045, stars: 0, dust: false,
    hemiSky: 0xdce6ee, hemiGround: 0x4a5634, hemi: 1.15, sun: 0xfff0dc, sunIntensity: 3.0, rim: 0.45, envIntensity: 1.0,
  },
  // Sakhir at night: black sky with a warm haze low over the desert, the circuit floodlit.
  bahrain: {
    clouds: 0,
    horizon: 0x1e1814, zenith: 0x020204, abyss: 0x060504, glow: 0x2a1e14, sunGlow: 0x000000,
    sunDir: new Vector3(0.15, 0.95, 0.2).normalize(), fog: 0x120e0c, fogDensity: 0.0007, stars: 0.35, dust: false,
    hemiSky: 0x8a7e6e, hemiGround: 0x2a2018, hemi: 0.4, sun: 0xfff0dc, sunIntensity: 0.9, rim: 0.35, envIntensity: 0.3,
  },
  // Las Vegas in November, after midnight: black desert sky, the city's amber glow on the horizon.
  vegas: {
    clouds: 0,
    horizon: 0x261c16, zenith: 0x020204, abyss: 0x040404, glow: 0x3a2618, sunGlow: 0x000000,
    sunDir: new Vector3(0.15, 0.95, 0.2).normalize(), fog: 0x0e0c0e, fogDensity: 0.0006, stars: 0.15, dust: false,
    hemiSky: 0x8a8898, hemiGround: 0x1a1818, hemi: 0.42, sun: 0xfff2e2, sunIntensity: 0.9, rim: 0.35, envIntensity: 0.32,
  },
  // Melbourne in March: a hard, clear southern sky, high bright sun, crisp shadows.
  australia: {
    clouds: 0.25,
    horizon: 0xcfe2f0, zenith: 0x2a74d8, abyss: 0x3a4430, glow: 0xf2f4f2, sunGlow: 0xfff8ea,
    sunDir: new Vector3(-0.35, 0.75, -0.4).normalize(), fog: 0xc8d8e2, fogDensity: 0.00022, stars: 0, dust: false,
    hemiSky: 0xdce8f4, hemiGround: 0x5a5a3a, hemi: 1.2, sun: 0xfff6e8, sunIntensity: 3.3, rim: 0.45, envIntensity: 1.05,
  },
  // Montréal in June: clear, fresh, a little haze off the St. Lawrence.
  canada: {
    clouds: 0.45,
    horizon: 0xd8e4ec, zenith: 0x3a78c8, abyss: 0x3a4438, glow: 0xf0f2f2, sunGlow: 0xfff6e4,
    sunDir: new Vector3(-0.3, 0.7, 0.45).normalize(), fog: 0xc8d6de, fogDensity: 0.0006, stars: 0, dust: false,
    hemiSky: 0xdce8f4, hemiGround: 0x4a5a3c, hemi: 1.2, sun: 0xfff4e6, sunIntensity: 2.9, rim: 0.45, envIntensity: 1.05,
  },
  // Lusail at night: a clear black desert sky, the haze lit amber by the floodlights.
  qatar: {
    clouds: 0,
    horizon: 0x221a16, zenith: 0x020206, abyss: 0x060504, glow: 0x342418, sunGlow: 0x000000,
    sunDir: new Vector3(0.1, 0.95, 0.25).normalize(), fog: 0x120e0c, fogDensity: 0.0006, stars: 0.3, dust: false,
    hemiSky: 0x8a8070, hemiGround: 0x2a2018, hemi: 0.42, sun: 0xfff2e0, sunIntensity: 0.95, rim: 0.35, envIntensity: 0.3,
  },
  // Shanghai in spring: a pale overcast, the city's haze softening everything far away.
  china: {
    clouds: 0.75,
    horizon: 0xd2d8dc, zenith: 0x8aa0b4, abyss: 0x4a4e48, glow: 0xe8eaea, sunGlow: 0xf4f0e6,
    sunDir: new Vector3(-0.25, 0.75, 0.4).normalize(), fog: 0xc4cacc, fogDensity: 0.00085, stars: 0, dust: false,
    hemiSky: 0xd8dee4, hemiGround: 0x4a5040, hemi: 1.35, sun: 0xfff6ec, sunIntensity: 2.2, rim: 0.4, envIntensity: 0.95,
  },
  // Madrid in September: a hard blue Castilian sky, high sun, dry heat.
  madring: {
    clouds: 0.18,
    horizon: 0xd4e2ee, zenith: 0x2a6ad8, abyss: 0x5a4a38, glow: 0xf4f2ee, sunGlow: 0xfff6e4,
    sunDir: new Vector3(-0.35, 0.78, 0.35).normalize(), fog: 0xd2dae0, fogDensity: 0.00028, stars: 0, dust: false,
    hemiSky: 0xdce8f4, hemiGround: 0x6a5a40, hemi: 1.2, sun: 0xfff4e4, sunIntensity: 3.3, rim: 0.45, envIntensity: 1.05,
  },
  // Marina Bay at night: the humid black sky glowing faintly over the city, the circuit floodlit.
  singapore: {
    clouds: 0.15,
    horizon: 0x161a26, zenith: 0x020308, abyss: 0x040406, glow: 0x2a2030, sunGlow: 0x000000,
    sunDir: new Vector3(0.15, 0.95, 0.2).normalize(), fog: 0x0c0e16, fogDensity: 0.0008, stars: 0, dust: false,
    hemiSky: 0x7a84a8, hemiGround: 0x16141a, hemi: 0.42, sun: 0xfff2e2, sunIntensity: 0.9, rim: 0.35, envIntensity: 0.3,
  },
  mexico: {
    clouds: 0.38,
    horizon: 0xdcdcd4, zenith: 0x2a6ac8, abyss: 0x4a4434, glow: 0xf4f0e4, sunGlow: 0xfff6e0,
    sunDir: new Vector3(-0.4, 0.68, 0.4).normalize(), fog: 0xc8c4b8, fogDensity: 0.0006, stars: 0, dust: false,
    hemiSky: 0xdce6f2, hemiGround: 0x5a5440, hemi: 1.15, sun: 0xfff6ea, sunIntensity: 3.1, rim: 0.5, envIntensity: 1.05,
  },
  // Caspian dusk: a low copper sun through dust off the Absheron, a violet zenith, the streets in shade.
  baku: {
    clouds: 0.3,
    horizon: 0xc88452, zenith: 0x1c2448, abyss: 0x1e1a16, glow: 0xf09a5a, sunGlow: 0xffb070,
    sunDir: new Vector3(0.62, 0.14, 0.3).normalize(), fog: 0x8a6a4e, fogDensity: 0.0016, stars: 0.2, dust: true,
    hemiSky: 0xa88a74, hemiGround: 0x3a2c20, hemi: 0.7, sun: 0xffa868, sunIntensity: 1.4, rim: 0.6, envIntensity: 0.6,
  },

  // English summer: soft grey-blue sky, broken cloud light, a green-grey haze.
  silverstone: {
    clouds: 0.62,
    horizon: 0xd8dce0, zenith: 0x6a8cb8, abyss: 0x3e4440, glow: 0xe8ecee, sunGlow: 0xf4f2e8,
    sunDir: new Vector3(-0.4, 0.55, 0.45).normalize(), fog: 0xc8d0d0, fogDensity: 0.0008, stars: 0, dust: false,
    hemiSky: 0xd8e2ec, hemiGround: 0x4a5a3a, hemi: 1.3, sun: 0xf6f2e8, sunIntensity: 2.2, rim: 0.4, envIntensity: 1.0,
  },
  // Yas Marina after sunset: violet-blue twilight, floodlit, the glow of the marina.
  yas: {
    clouds: 0.15,
    horizon: 0x2a3e72, zenith: 0x040818, abyss: 0x0a0a14, glow: 0xff9a52, sunGlow: 0xffb070,
    sunDir: new Vector3(-0.85, 0.06, 0.3).normalize(), fog: 0x1a2440, fogDensity: 0.0008, stars: 0.5, dust: false,
    hemiSky: 0xb8c4f0, hemiGround: 0x3a3440, hemi: 1.6, sun: 0xffd2a0, sunIntensity: 1.2, rim: 1.0, envIntensity: 1.0,
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
    clouds: 0.1,
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
    this.sun.shadow.mapSize.set(4096, 4096);
    const sc = this.sun.shadow.camera;
    sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 1; sc.far = 230; // the car, and the walls, stands and trees around it
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.05;
    this.sun.shadow.radius = 3;
    scene.add(this.sun, this.sun.target);

    // Cool fill that rides with the camera, so whichever side of the car you see
    // (the key light is fixed in the world) never sinks into the black void.
    this.rim = new DirectionalLight(0x9fb4ff, 1.0);
    scene.add(this.rim, this.rim.target);
  }

  /** Switch the whole atmosphere to a mood (name in MOODS). */
  setMood(name) { this.moodName = name; this.blend = null; this.wet = this.rain ? 1 : 0; this.apply(); }

  /** Time of day: blend from the base mood towards `to` (0..1), e.g. day to sunset, dusk to night. */
  setTimeOfDay(to, t) { this.blend = to ? { to, t: Math.max(0, Math.min(1, t)) } : null; }

  /** Rain on/off (instant). For a shower rolling in, setWetness() eases the sky. */
  setRain(on) { this.rain = on; this.wet = on ? 1 : 0; this.apply(); }
  setWetness(w) { this.wet = Math.max(0, Math.min(1, w)); }

  get isNight() {
    const n = (m) => m === 'night' || m === 'void' || m === 'yas' || m === 'yasNight' || m === 'jeddah' || m === 'singapore' || m === 'bahrain' || m === 'vegas' || m === 'qatar';
    return n(this.moodName) || (this.blend && this.blend.t > 0.5 && n(this.blend.to));
  }

  /** Build the current atmosphere: base mood, blended towards the time-of-day target, then the cloud. */
  apply() {
    const A = MOODS[this.moodName] || MOODS.void, B = this.blend ? MOODS[this.blend.to] : null, t = B ? this.blend.t : 0;
    const col = (k) => { const c = new Color(A[k]); if (B) c.lerp(new Color(B[k]), t); return c; };
    const num = (k) => (B ? A[k] + (B[k] - A[k]) * t : A[k]);
    const u = this.sky.material.uniforms;
    u.horizon.value.copy(col('horizon'));
    u.zenith.value.copy(col('zenith'));
    u.abyss.value.copy(col('abyss'));
    u.glow.value.copy(col('glow'));
    u.sunColor.value.copy(col('sunGlow'));
    const dir = A.sunDir.clone(); if (B) dir.lerp(B.sunDir, t).normalize();
    u.sunDir.value.copy(dir);
    this.scene.fog.color.copy(col('fog'));
    // Day air is hazier than the sky alone suggests: from a car's low eye line the detail fades out by
    // ~500 m and only big landforms show beyond a kilometre. (Night moods are already dense.)
    const fd = num('fogDensity');
    this.scene.fog.density = fd < 0.001 ? fd * DAY_HAZE : fd;
    this.stars.material.opacity = num('stars');
    this.dust.points.visible = t < 0.5 ? A.dust : B.dust;
    this.hemi.color.copy(col('hemiSky'));
    this.hemi.groundColor.copy(col('hemiGround'));
    this.hemi.intensity = num('hemi');
    this.sun.color.copy(col('sun'));
    this.sun.intensity = num('sunIntensity');
    this.sunOffset.copy(dir).multiplyScalar(100);
    this.rim.intensity = num('rim');
    this.scene.environmentIntensity = num('envIntensity');
    // Rain: the same mood under cloud. The sky and fog go grey (dark slate at night), the sun all but
    // disappears so shadows soften, and the haze closes in. `wet` eases it in as a shower arrives.
    const w = this.wet ?? 0;
    // Clouds: lit by the mood's sun, shaded by its sky; heavier with rain, sparse and dim at night.
    {
      const night = this.isNight, cover = (B ? (A.clouds ?? 0.42) + ((B.clouds ?? 0.42) - (A.clouds ?? 0.42)) * t : A.clouds ?? 0.42);
      u.cloudCover.value = Math.min(0.97, (night ? Math.min(cover, 0.3) : cover) + 0.6 * w);
      const hor = col('horizon'), zen = col('zenith'), sun = col('sun'), si = num('sunIntensity');
      if (night) { u.cloudLit.value.copy(hor).multiplyScalar(1.7); u.cloudShade.value.copy(hor).multiplyScalar(0.55); }
      else {
        u.cloudLit.value.setRGB(1, 1, 1).lerp(sun, 0.45).multiplyScalar(Math.min(1.35, 0.5 + si * 0.28));
        u.cloudShade.value.copy(hor).lerp(zen, 0.35).multiplyScalar(0.72);
      }
      const grey = new Color(night ? 0x14181f : 0x8a9096);
      u.cloudLit.value.lerp(grey, 0.75 * w); u.cloudShade.value.lerp(grey.multiplyScalar(0.7), 0.75 * w);
    }
    if (w <= 0) return;
    const night = this.isNight;
    const cloud = new Color(night ? 0x1a2030 : 0x7c858f);
    u.horizon.value.lerp(cloud, 0.8 * w);
    u.zenith.value.lerp(cloud.clone().multiplyScalar(night ? 0.5 : 0.62), 0.85 * w);
    u.glow.value.lerp(cloud, 0.7 * w);
    u.sunColor.value.multiplyScalar(1 - 0.85 * w);
    this.scene.fog.color.lerp(cloud, 0.75 * w);
    this.scene.fog.density *= 1 + (night ? 0.6 : 1.4) * w;
    this.stars.material.opacity *= 1 - w;
    this.sun.intensity *= 1 - (night ? 0.88 : 0.72) * w; // a glossy road catches any strong key light as a big beige sheen
    this.hemi.intensity *= 1 - 0.1 * w;
    this.hemi.color.lerp(cloud, 0.3 * w);
    this.scene.environmentIntensity *= 1 + 0.1 * w;
  }

  update(focus, camera, dt) {
    this.sky.material.uniforms.time.value += dt ?? 0.016;
    this.sun.position.copy(focus).add(this.sunOffset);
    this.sun.target.position.copy(focus);
    this.rim.position.copy(camera.position).y += 6;
    this.rim.target.position.copy(focus);
    this.sky.position.copy(camera.position);
    this.stars.position.copy(camera.position);
    this.dust.update(camera.position, dt);
  }
}
