// Renders the 3D component models (hero and drawing views) for two briefs. Usage: OUT=dir SLOTS=frontWing,rearWing node tools/parts-check.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const OUT = process.env.OUT ?? '.', SLOTS = (process.env.SLOTS ?? 'frontWing').split(',');
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1300 } });
p.on('pageerror', (e) => console.log('ERR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.goto(`http://localhost:${port}/index.html?nopost`);
for (let k = 0; k < 60; k++) { if (await p.evaluate(() => !!window.__racer)) break; await p.waitForTimeout(400); }
for (const slot of SLOTS) {
  await p.evaluate(async (slot) => {
    const { partImage } = await import('./src/front/parts3d.js');
    const team = { id: 'mclaren', colours: ['#ff8000', '#47c7fc', '#000000'] };
    const views = ['hero', 'front', 'side', 'top'];
    const rows = [[0.12, 0.15], [0.9, 0.85]].map((dir) => views.map((v) => `<img src="${partImage(slot, { dir, n: 1, team }, { view: v, w: 960, h: 600 })}" style="width:470px;height:294px;background:${v === 'hero' ? 'radial-gradient(#2a2f3a,#0b0d12)' : '#0b2a52'};margin:2px">`).join(''));
    document.body.innerHTML = `<div id="sheet" style="position:fixed;inset:0;z-index:99999;background:#000;padding:4px">${rows.map((r) => `<div>${r}</div>`).join('')}</div>`;
  }, slot);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/part-${slot}.png`, clip: { x: 0, y: 0, width: 1920, height: 610 }, timeout: 120000 });
  console.log('shot', slot);
}
await b.close(); server.kill();
