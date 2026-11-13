// Check: the optional pit lane interview before FP1 (three reporters, answers recorded, in the news).
// Usage: OUT=dir node tools/interview-check.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const OUT = process.env.OUT ?? '.';
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', (e) => console.log('ERR', e.message, (e.stack || '').split('\n').slice(1, 3).join(' | ')));
await p.addInitScript(() => { localStorage.setItem('tiny-f1:fav', 'ferrari'); localStorage.setItem('tiny-f1:season', JSON.stringify({ team: 'mclaren', round: 9, manager: { name: 'Max Test' }, points: { 'Max Test': 80, 'Max Verstappen': 120 }, weekendPrefs: { length: 'short', difficulty: 90, raceLength: 'short' } })); });
await p.goto(`http://localhost:${port}/index.html?nopost`);
for (let k = 0; k < 60; k++) { if (await p.evaluate(() => !!window.__racer)) break; await p.waitForTimeout(500); }
await p.evaluate(() => window.__racer.frontend.go('loading'));
for (let k = 0; k < 120; k++) { if (await p.evaluate(() => window.__racer.frontend.screen) === 'garage') break; await p.waitForTimeout(500); }
await p.evaluate(() => window.__racer.frontend.go('monitor', 'schedule'));
await p.waitForTimeout(500);
console.log('schedule buttons', await p.evaluate(() => [...document.querySelectorAll('.wk .acts button')].map((x) => x.textContent).join(' | ')));
await p.evaluate(() => document.querySelector('.wk [data-a="ivw"]').click());
await p.waitForTimeout(2500);
await p.screenshot({ path: `${OUT}/ivw-1.png`, timeout: 120000 });
for (let k = 0; k < 3; k++) {
  console.log('Q', k + 1, await p.evaluate(() => `${document.querySelector('.ivw .who b')?.textContent} (${document.querySelector('.ivw .who small')?.textContent}): ${document.querySelector('.ivw .q')?.textContent}`));
  await p.evaluate((k) => document.querySelectorAll('.ivw [data-j]')[k % 3].click(), k);
  await p.waitForTimeout(300);
  if (k === 0) await p.screenshot({ path: `${OUT}/ivw-2.png`, timeout: 120000 });
  await p.evaluate(() => document.querySelector('.ivw [data-a="next"]').click());
  await p.waitForTimeout(300);
}
console.log('after', await p.evaluate(() => JSON.stringify({ screen: window.__racer.frontend.screen, saved: window.__racer.frontend.season.interviews?.map((x) => `${x.kind}:${x.tone}`), btn: [...document.querySelectorAll('.wk .acts button')].map((x) => x.textContent).join(' | ') })));
await b.close(); server.kill();
