// Dev helper: render the game headlessly and save screenshots.
// Usage: node tools/shot.mjs <outPrefix> "<query1>|<query2>|..." [waitMs] [width] [height]
// Writes <outPrefix>-0.png, <outPrefix>-1.png, ...
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const [prefix = 'shot', queries = '', wait = '2500', w = '1280', h = '720'] = process.argv.slice(2);
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const list = queries.split('|');
  for (let i = 0; i < list.length; i++) {
    const page = await browser.newPage({ viewport: { width: +w, height: +h } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_CERT')) errors.push(m.text()); });
    await page.goto(`http://localhost:${port}/index.html?autostart&${list[i]}`);
    await page.waitForTimeout(+wait);
    await page.screenshot({ path: `${prefix}-${i}.png` });
    const info = await page.evaluate(() => {
      const r = window.__racer;
      const v = r.vehicle;
      return { pos: v.body.position.toArray().map((x) => +x.toFixed(2)), kmh: +(v.forwardSpeed * 3.6).toFixed(1), gear: v.gearLabel, frames: r.frames };
    });
    console.log(i, list[i], JSON.stringify(info), errors.length ? 'ERRORS: ' + [...new Set(errors)].join(' / ') : '');
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
