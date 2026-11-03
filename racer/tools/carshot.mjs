// Dev helper: close-up screenshots of the player's car from around it.
// Usage: node tools/carshot.mjs <outPrefix> "<query>" [width] [height]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const [prefix = 'car', query = 'car=f26&track=silverstone', w = '1280', h = '720'] = process.argv.slice(2);
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.goto(`http://localhost:${port}/index.html?autostart&${query}`);
  await page.waitForTimeout(6000);
  // Left side, front three-quarter, top, right side: offsets in the car's frame (x left, z forward).
  const views = [[3.2, 0.6, 0.2], [2.4, 1.3, 2.8], [0.01, 4.2, 0.3], [-3.2, 0.6, 0.2]];
  for (const [k, [ox, oy, oz]] of views.entries()) {
    await page.evaluate(([ox, oy, oz]) => {
      const c = window.__racer.car.root; c.updateMatrixWorld();
      const p = c.localToWorld(c.position.clone().set(ox, oy, oz)), t = c.localToWorld(c.position.clone().set(0, 0.1, 0));
      window.__freeCam = [[p.x, p.y, p.z], [t.x, t.y, t.z]];
    }, [ox, oy, oz]);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${prefix}-${k}.png`, timeout: 180000 });
  }
} finally {
  await browser.close();
  server.kill();
}
