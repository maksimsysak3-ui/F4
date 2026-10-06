// Dev helper: driver's-eye screenshots at fractions of the lap.
// Usage: node tools/lapview.mjs <outPrefix> <trackId> "0.1,0.3,0.6" [width] [height]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const [prefix = 'lap', track = 'cota', fr = '0.1,0.4,0.7', w = '960', h = '540'] = process.argv.slice(2);
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  page.on('console', (m) => { if (m.text().startsWith('[')) console.log(m.text().slice(0, 300)); });
  await page.goto(`http://localhost:${port}/index.html?autostart&track=${track}`);
  await page.waitForTimeout(5000);
  // Each view is a lap fraction (0.3) or a point number (p24).
  for (const [k, f] of fr.split(',').entries()) {
    await page.evaluate((f) => {
      const L = window.__racer.track.layout, i = f[0] === 'p' ? L.pointSample[+f.slice(1)] : Math.floor(+f * L.N), j = (i + 20) % L.N;
      const y = (q) => L.yAt(q, 0) + 1.3;
      window.__freeCam = [[L.x[i], y(i), L.z[i]], [L.x[j], y(j) - 0.4, L.z[j]]];
    }, f);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${prefix}-${k}.png`, timeout: 180000 });
  }
} finally {
  await browser.close();
  server.kill();
}
