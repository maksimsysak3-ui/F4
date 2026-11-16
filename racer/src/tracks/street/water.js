import { Mesh, PlaneGeometry, ShaderMaterial, UniformsLib, UniformsUtils, Color, Vector3 } from 'three';

/**
 * Riviera sea: a custom shader rather than a lit plane, because the scene's
 * environment map is a studio rig and water mostly shows what it reflects.
 *
 *  - gentle swell in the vertex shader, fine ripples as analytic normals
 *  - Fresnel mix of the water body and a dusk sky gradient
 *  - a glittering sun path from the low western sun
 *  - turquoise shallows along the quays, deep blue offshore
 *  - animated foam where the water meets stone
 */
export function buildWater({ hx0, hx1, hz0, coastZ, sky }) {
  const uniforms = UniformsUtils.merge([UniformsLib.fog, {
    uTime: { value: 0 },
    uSunDir: { value: sky.sunDir.clone().normalize() },
    uSunColor: { value: new Color(sky.sun) },
    uHorizon: { value: new Color(sky.horizon) },
    uZenith: { value: new Color(sky.zenith) },
    uDeep: { value: new Color(0x0b3a52) },
    uShallow: { value: new Color(0x1f7c86) },
    uHarbour: { value: new Vector3(hx0, hx1, hz0) },
    uCoastZ: { value: coastZ },
  }]);
  const material = new ShaderMaterial({
    uniforms,
    fog: true,
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      uniform float uTime;
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        // Long, slow swell from the open sea (south), damped inside the harbour.
        float open = smoothstep(-20.0, 60.0, wp.z - ${coastZ.toFixed(1)});
        float swell = sin(wp.x * 0.045 + wp.z * 0.03 + uTime * 0.8) * 0.22 + sin(wp.x * 0.11 - uTime * 1.1) * 0.06;
        wp.y += swell * mix(0.25, 1.0, open);
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform float uTime;
      uniform vec3 uSunDir, uSunColor, uHorizon, uZenith, uDeep, uShallow, uHarbour;
      uniform float uCoastZ;
      varying vec3 vWorld;

      // Sum of directional waves: returns the surface slope (d/dx, d/dz).
      vec2 slope(vec2 p) {
        vec2 s = vec2(0.0);
        const int N = 6;
        for (int i = 0; i < N; i++) {
          float fi = float(i);
          float a = fi * 2.399 + 0.6;               // golden-angle spread of directions
          vec2 d = vec2(cos(a), sin(a));
          float k = 0.18 * pow(1.65, fi);           // wavenumber grows per octave
          float amp = 0.55 / pow(1.9, fi);
          float ph = dot(d, p) * k + uTime * sqrt(9.81 * k) * 0.55 + fi * 1.7;
          s += d * k * amp * cos(ph);
        }
        return s;
      }

      float shoreDistance(vec2 p) {
        // Inside the harbour basin: distance to the three quay walls; outside: to the coastline.
        bool basin = p.x > uHarbour.x && p.x < uHarbour.y && p.y < uCoastZ;
        if (basin) return min(p.y - uHarbour.z, min(p.x - uHarbour.x, uHarbour.y - p.x));
        return p.y - uCoastZ;
      }

      void main() {
        vec2 p = vWorld.xz;
        vec2 sl = slope(p) * 0.35;
        vec3 n = normalize(vec3(-sl.x, 1.0, -sl.y));
        vec3 v = normalize(cameraPosition - vWorld);
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
        vec3 r = reflect(-v, n);
        // Dusk sky as seen in the water: warm at the horizon, violet-blue overhead, brighter toward the sun.
        float up = clamp(r.y, 0.0, 1.0);
        vec3 sky = mix(uHorizon, uZenith, pow(up, 0.45));
        float toSun = max(dot(r, uSunDir), 0.0);
        sky += uSunColor * pow(toSun, 8.0) * 0.35;
        // Water body: shallow turquoise by the stone, deep offshore.
        float d = shoreDistance(p);
        vec3 body = mix(uShallow, uDeep, smoothstep(2.0, 45.0, d));
        body *= 0.55 + 0.45 * max(dot(n, normalize(uSunDir + vec3(0.0, 0.6, 0.0))), 0.0);
        vec3 col = mix(body, sky, fres);
        // Sun glitter: tight specular on the ripples.
        col += uSunColor * (pow(toSun, 320.0) * 6.0 + pow(toSun, 60.0) * 0.5);
        // Foam where the water laps the quay walls and the shore.
        float foamNoise = 0.5 + 0.5 * sin(p.x * 1.3 + uTime * 1.6) * sin(p.y * 1.1 - uTime * 1.2);
        float foam = (1.0 - smoothstep(0.0, 1.6, d)) * (0.55 + 0.45 * foamNoise);
        col = mix(col, vec3(0.93, 0.95, 0.96), clamp(foam, 0.0, 1.0) * 0.8);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const water = new Mesh(new PlaneGeometry(3400, 2600, 160, 120).rotateX(-Math.PI / 2), material);
  water.position.set(0, -0.9, hz0 + 1250);
  water.receiveShadow = false;
  return { mesh: water, update(dt) { uniforms.uTime.value += dt; } };
}
