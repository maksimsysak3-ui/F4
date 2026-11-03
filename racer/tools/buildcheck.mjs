// Dev helper: build tracks headless and print each one's build summary and any page errors.
// Usage: node tools/buildcheck.mjs <trackId>...
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const t of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 160, height: 100 } });
  let done = false;
  p.on('pageerror', (e) => console.log(t, 'ERR', e.message, (e.stack || '').split('\n').slice(1, 5).join(' | ')));
  p.on('console', (m) => { const x = m.text(); if (x.includes('did not fit')) console.log(t, x); if (x.includes('built in')) { done = true; console.log(x.slice(0, 400)); } });
  await p.goto(`http://localhost:${port}/index.html?autostart&track=${t}`);
  for (let k = 0; k < 60 && !done; k++) await p.waitForTimeout(500);
  await p.close();
}
await b.close(); server.kill();
