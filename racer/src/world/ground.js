import { MeshStandardMaterial, CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

/**
 * Natural ground: a tiling detail texture (blades, grains, pebbles) broken up by
 * world-space macro noise in the shader, so a 6 km plane never shows its tile.
 *
 *   kind 'grass' | 'sand' | 'paving'
 *   base/dark/light  colours of the detail texture
 *   tile             metres per texture repeat
 *   macro            0..1 strength of the large patches
 */
export function groundMaterial({ kind = 'grass', base, dark, light, tile = 12, macro = 0.35, roughness = 1 }) {
  const tex = detailTexture(kind, base, dark, light);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  const m = new MeshStandardMaterial({ map: tex, roughness });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTile = { value: 1 / tile };
    shader.uniforms.uMacro = { value: macro };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vGroundXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGroundXZ = (modelMatrix * vec4(position, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vGroundXZ;
        uniform float uTile, uMacro;
        float gHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float gNoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(gHash(i), gHash(i + vec2(1, 0)), f.x), mix(gHash(i + vec2(0, 1)), gHash(i + vec2(1, 1)), f.x), f.y);
        }`)
      .replace('#include <map_fragment>', `
        vec4 gA = texture2D(map, vGroundXZ * uTile);
        vec4 gB = texture2D(map, vGroundXZ * uTile * 0.23 + 0.37); // second scale hides the repeat
        vec3 gCol = mix(gA.rgb, gB.rgb, 0.35);
        float gM = gNoise(vGroundXZ * 0.012) * 0.6 + gNoise(vGroundXZ * 0.045) * 0.3 + gNoise(vGroundXZ * 0.2) * 0.1;
        diffuseColor.rgb *= gCol * (1.0 + (gM - 0.5) * 2.0 * uMacro);`);
  };
  // A define makes the patched program unambiguously distinct in three's program cache, so the
  // world-space ground shader can never be reused for another textured material (e.g. the asphalt).
  m.defines = { GROUND_FX: 1 };
  m.customProgramCacheKey = () => `ground-${kind}`;
  return m;
}

function detailTexture(kind, base, dark, light) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  // Colours are sRGB hex, painted straight into the (sRGB) canvas.
  const css = (hex, a = 1) => `rgba(${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255},${a})`;
  g.fillStyle = css(base);
  g.fillRect(0, 0, size, size);
  const r = mulberry(kind.length * 977);
  if (kind === 'grass') {
    // Clumps, then thousands of short blades in light and dark.
    for (let k = 0; k < 40; k++) {
      g.fillStyle = css(r() < 0.5 ? dark : light, 0.18);
      g.beginPath();
      g.ellipse(r() * size, r() * size, 10 + r() * 30, 8 + r() * 20, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    for (let k = 0; k < 2600; k++) {
      const x = r() * size, y = r() * size, len = 2 + r() * 4, a = -Math.PI / 2 + (r() - 0.5) * 0.9;
      g.strokeStyle = css(r() < 0.5 ? dark : light, 0.55);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      g.stroke();
    }
  } else if (kind === 'sand') {
    // Wind ripples and fine grains.
    for (let y = 0; y < size; y += 6 + r() * 4) {
      g.strokeStyle = css(r() < 0.5 ? dark : light, 0.25);
      g.lineWidth = 2;
      g.beginPath();
      for (let x = 0; x <= size; x += 8) g.lineTo(x, y + Math.sin(x * 0.05 + y) * 2);
      g.stroke();
    }
    for (let k = 0; k < 5000; k++) {
      g.fillStyle = css(r() < 0.5 ? dark : light, 0.5);
      g.fillRect(r() * size, r() * size, 1, 1);
    }
  } else {
    // Paving: slabs with joints and some staining.
    const n = 4, s = size / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = css(r() < 0.5 ? dark : light, 0.18 + r() * 0.15);
      g.fillRect(i * s + 1, j * s + 1, s - 2, s - 2);
    }
    g.strokeStyle = css(dark, 0.8);
    g.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, size); g.stroke();
      g.beginPath(); g.moveTo(0, i * s); g.lineTo(size, i * s); g.stroke();
    }
    for (let k = 0; k < 2500; k++) {
      g.fillStyle = css(r() < 0.5 ? dark : light, 0.35);
      g.fillRect(r() * size, r() * size, 1, 1);
    }
  }
  return new CanvasTexture(c);
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
