import { Vector2, WebGLRenderTarget, HalfFloatType, DepthTexture, UnsignedIntType } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RainLensShader } from './rainLens.js?v=a5d31c9';

/** Grade in linear HDR before tone mapping: a little saturation and contrast, and a soft vignette. */
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, saturation: { value: 1.08 }, contrast: { value: 1.06 }, vignette: { value: 0.28 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float saturation, contrast, vignette;
    varying vec2 vUv;
    void main() {
      vec4 t = texture2D(tDiffuse, vUv);
      vec3 c = max(t.rgb, 0.0);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, saturation);
      c = 0.18 * pow(c / 0.18, vec3(contrast)); // contrast around middle grey
      vec2 d = vUv - 0.5;
      c *= 1.0 - vignette * smoothstep(0.25, 0.85, dot(d, d) * 2.2);
      gl_FragColor = vec4(c, t.a);
    }`,
};

/**
 * Post chain: scene -> ambient occlusion -> bloom -> grade -> tone map/sRGB.
 * AO reuses the main pass's depth buffer (normals rebuilt from depth), so it
 * costs two full-screen passes but no second scene render. 'low' quality turns
 * AO off for weak GPUs.
 */
export function createPost(renderer, scene, camera) {
  const w = innerWidth, h = innerHeight;
  const rt = new WebGLRenderTarget(w, h, { type: HalfFloatType, samples: 4 });
  rt.depthTexture = new DepthTexture(w, h, UnsignedIntType);
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.addPass(new RenderPass(scene, camera));

  const ao = new GTAOPass(scene, camera, w, h, { depthTexture: rt.depthTexture });
  ao.updateGtaoMaterial({ radius: 2.2, distanceExponent: 1.5, thickness: 2.5, scale: 1.35, samples: 12, distanceFallOff: 1.0 });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
  ao.blendIntensity = 0.9;
  // The composer ping-pongs two targets; read the depth of whichever one the scene was drawn into.
  const render = ao.render.bind(ao);
  ao.render = (r, write, read, ...rest) => {
    const depth = read.depthTexture;
    if (depth && ao.gtaoMaterial.uniforms.tDepth.value !== depth) {
      ao.gtaoMaterial.uniforms.tDepth.value = depth;
      ao.pdMaterial.uniforms.tDepth.value = depth;
    }
    render(r, write, read, ...rest);
  };
  // AO is soft by nature: compute it at half resolution (a quarter of the pixels).
  const aoSetSize = ao.setSize.bind(ao);
  ao.setSize = (width, height) => aoSetSize(Math.max(1, width >> 1), Math.max(1, height >> 1));
  ao.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  composer.addPass(ao);

  const bloom = new UnrealBloomPass(new Vector2(w, h), 0.42, 0.45, 2.2);
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  const lens = new ShaderPass(RainLensShader);
  lens.enabled = false;
  composer.addPass(lens);
  composer.addPass(new OutputPass());

  return {
    composer,
    bloom,
    ao,
    grade,
    get quality() { return ao.enabled ? 'high' : 'low'; },
    setQuality(q) { ao.enabled = q !== 'low'; },
    setSize(width, height) { composer.setSize(width, height); },
    /** Render resolution scale (the governor in main.js lowers it when frames run long). */
    setPixelRatio(pr) {
      renderer.setPixelRatio(pr);
      composer.setPixelRatio(pr);
      composer.setSize(innerWidth, innerHeight);
    },
    /** Drops on the lens: amount 0..1 (0 switches the pass off), speed 0..1 of the car. */
    setRain(amount, speed, dt) {
      lens.enabled = amount > 0.01;
      const u = lens.uniforms;
      u.uAmount.value = amount;
      u.uSpeed.value += (speed - u.uSpeed.value) * Math.min(1, dt * 2);
      u.uTime.value = (u.uTime.value + dt) % 1000;
      u.uAspect.value = innerWidth / innerHeight;
    },
    render(dt) { composer.render(dt); },
  };
}
