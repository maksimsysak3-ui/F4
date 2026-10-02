// Dev helper: drive the car with scripted key presses and take screenshots along the way.
// Usage: node tools/drive.mjs <outPrefix> "<query>" "<script>"
//   script: comma-separated steps, e.g. "down:KeyW,wait:3000,shot,down:KeyA,wait:1500,shot,up:KeyA"
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const [prefix = 'drive', query = '', script = ''] = process.argv.slice(2);
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: +(process.env.W || 960), height: +(process.env.H || 600) } });
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.goto(`http://localhost:${port}/index.html?${process.env.NOAUTO ? "" : "autostart&"}${query}`);
  await page.waitForTimeout(1500);
  let n = 0;
  for (const step of script.split(',').filter(Boolean)) {
    const [cmd, arg] = step.split(':');
    if (cmd === 'down') await page.keyboard.down(arg);
    else if (cmd === 'up') await page.keyboard.up(arg);
    else if (cmd === 'press') await page.keyboard.press(arg);
    else if (cmd === 'wait') await page.waitForTimeout(+arg);
    else if (cmd === 'click') await page.mouse.click(480, 300);
    else if (cmd === 'eval') console.log(await page.evaluate(arg));
    else if (cmd === 'evalfile') console.log(await page.evaluate((await import('node:fs')).readFileSync(arg, 'utf8')));
    else if (cmd === 'shot') {
      await page.screenshot({ path: `${prefix}-${n}.png` });
      const info = await page.evaluate(() => {
        const v = window.__racer.vehicle;
        const sm = window.__racer.smoke;
        const alive = sm ? Array.from(sm.alpha).filter((a) => a > 0).length : -1;
        return { smoke: alive, skids: window.__racer.skids.count, pos: v.body.position.toArray().map((x) => +x.toFixed(1)), kmh: +(v.forwardSpeed * 3.6).toFixed(0), gear: v.gearLabel, rpm: Math.round(v.rpm), beta: +(v.slipAngle * 57.3).toFixed(1), frames: window.__racer.frames };
      });
      console.log(`shot ${n}`, JSON.stringify(info));
      n++;
    }
  }
} finally {
  await browser.close();
  server.kill();
}
