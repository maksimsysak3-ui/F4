// Builds a single self-contained AI sim file (no server needed): bundles src/ai/aisimUI.js with the
// circuit layouts and inlines it into aisim.html. Usage: node tools/buildaisim.mjs [out=aisim-standalone.html]
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
const out = process.argv[2] || 'aisim-standalone.html';
const res = await build({ entryPoints: ['src/ai/aisimUI.js'], bundle: true, format: 'iife', minify: true, write: false, external: ['*Scene.js', './scene.js'], logLevel: 'warning' });
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
let html = readFileSync('aisim.html', 'utf8');
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\n?/, '');
html = html.replace('<script type="module" src="./src/ai/aisimUI.js"></script>', () => `<script>\n${js}\n</script>`);
writeFileSync(out, html);
console.log(`${out}: ${(html.length / 1024).toFixed(0)} KB`);
