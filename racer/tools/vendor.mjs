// Copies the parts of three.js the game uses from node_modules into ./vendor,
// minified, so the game runs as plain static files with no CDN or bundler.
// Run after changing the three version: `npm run vendor`.
import { transform } from 'esbuild';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const SRC = 'node_modules/three';
const OUT = 'vendor/three';
const FILES = [
  'build/three.core.js',
  'build/three.module.js',
  'examples/jsm/postprocessing/EffectComposer.js',
  'examples/jsm/postprocessing/RenderPass.js',
  'examples/jsm/postprocessing/ShaderPass.js',
  'examples/jsm/postprocessing/MaskPass.js',
  'examples/jsm/postprocessing/Pass.js',
  'examples/jsm/postprocessing/UnrealBloomPass.js',
  'examples/jsm/postprocessing/OutputPass.js',
  'examples/jsm/shaders/CopyShader.js',
  'examples/jsm/shaders/LuminosityHighPassShader.js',
  'examples/jsm/shaders/OutputShader.js',
];

await rm(OUT, { recursive: true, force: true });
for (const file of FILES) {
  const code = await readFile(join(SRC, file), 'utf8');
  const { code: min } = await transform(code, { minify: true, format: 'esm', legalComments: 'inline' });
  const dest = join(OUT, file.replace('examples/jsm/', 'addons/'));
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, min);
  console.log(`${dest}  ${(min.length / 1024).toFixed(0)} KB`);
}
await writeFile(join(OUT, 'LICENSE'), await readFile(join(SRC, 'LICENSE'), 'utf8'));
