/**
 * Rain on the lens / windscreen: a full-screen pass, all procedural. Three
 * layers of beads on a hashed grid each grow, hold and fade on their own clock;
 * the big ones slide down. Every bead refracts the image behind it (a lens: the
 * view is offset and flipped inside it) with a bright rim on top. At speed the
 * airflow takes over: beads thin out and fresh drops streak outward from the
 * centre of the view. uAmount 0 = dry (the pass is skipped entirely).
 */
export const RainLensShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAmount: { value: 0 },
    uSpeed: { value: 0 },
    uAspect: { value: 1.6 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uAmount, uSpeed, uAspect;
    varying vec2 vUv;

    vec3 hash3(vec2 p) {
      vec3 q = vec3(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)), dot(p, vec2(419.2, 371.9)));
      return fract(sin(q) * 43758.5453);
    }

    // One layer of beads: returns (refraction offset xy, coverage).
    vec3 beads(vec2 p, float scale, float t, float slide) {
      vec2 g = p * scale;
      vec2 id = floor(g), f = fract(g) - 0.5;
      vec3 h = hash3(id);
      float life = fract(t * (0.05 + 0.08 * h.z) + h.x);
      float grow = smoothstep(0.0, 0.25, life) * (1.0 - smoothstep(0.75, 1.0, life));
      vec2 c = (h.xy - 0.5) * 0.6;
      c.y += slide * life * life * h.z * 0.9; // heavy beads run down (screen y is up)
      vec2 d = f - c;
      d.y *= 1.0 + slide * 0.6 * life; // and stretch as they run
      float r = (0.1 + 0.2 * h.y) * grow;
      float m = smoothstep(r, r * 0.55, length(d));
      return vec3(-d / max(r, 1e-3) * m, m);
    }

    // Airflow streaks at speed: thin drops racing outward from the view centre.
    vec3 streaks(vec2 p, float t, float speed) {
      float a = atan(p.y, p.x), rr = length(p);
      vec2 g = vec2(a * 9.0, rr * 7.0 - t * (2.0 + 6.0 * speed));
      vec2 id = floor(g), f = fract(g) - 0.5;
      vec3 h = hash3(id + 17.0);
      if (h.z > 0.35) return vec3(0.0);
      vec2 d = f - (h.xy - 0.5) * 0.5;
      d.x *= 5.0; // narrow across, long along the flow
      float m = smoothstep(0.35, 0.1, length(d)) * smoothstep(0.1, 0.45, rr);
      return vec3(-normalize(p + 1e-4) * m * 0.6, m * 0.7);
    }

    void main() {
      vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
      float still = 1.0 - smoothstep(0.15, 0.7, uSpeed); // beads only cling when slow
      vec3 acc = vec3(0.0);
      acc += beads(p, 9.0, uTime, 1.0) * still;
      acc += beads(p + 3.7, 15.0, uTime * 1.3, 0.5) * (0.6 + 0.4 * still);
      acc += beads(p - 1.3, 26.0, uTime * 1.7, 0.0);
      acc += streaks(p, uTime, uSpeed) * smoothstep(0.1, 0.5, uSpeed);
      acc *= uAmount;
      float m = clamp(acc.z, 0.0, 1.0);
      vec2 off = acc.xy * 0.035;
      vec3 bg = texture2D(tDiffuse, vUv).rgb;
      vec3 seen = texture2D(tDiffuse, vUv + off).rgb;
      // A bead shows the world refracted, slightly brighter, with a highlight on its upper rim.
      vec3 c = mix(bg, seen * 1.08 + 0.02, m);
      c += m * smoothstep(0.2, 0.9, acc.y) * 0.06;
      // The whole view softens and greys a little in heavy rain.
      c = mix(c, vec3(dot(c, vec3(0.3, 0.5, 0.2))), 0.12 * uAmount);
      gl_FragColor = vec4(c, 1.0);
    }`,
};
