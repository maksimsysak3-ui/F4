// Dev helper: free-camera screenshots of a track.
// Usage: node tools/view.mjs <outPrefix> "<query>" "px,py,pz,tx,ty,tz;..." [width] [height]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const [prefix = 'view', query = '', views = '', w = '1280', h = '720'] = process.argv.slice(2);
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.text().startsWith('[')) console.log(m.type(), m.text()); });
  await page.goto(`http://localhost:${port}/index.html?autostart&${query}`);
  await page.waitForTimeout(6000);
  for (const [k, v] of views.split(';').filter(Boolean).entries()) {
    const n = v.split(',').map(Number);
    await page.evaluate((n) => { window.__freeCam = [n.slice(0, 3), n.slice(3, 6)]; }, n);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${prefix}-${k}.png` });
  }
} finally {
  await browser.close();
  server.kill();
}
