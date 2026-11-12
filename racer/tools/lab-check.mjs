// Dev check of the R&D development lab: on a fresh season, run each kind of test on several parts
// (screenshots mid-run and after), change the geometry, sign a design off.
// Usage: OUT=dir node tools/lab-check.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const OUT = process.env.OUT ?? '.';
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
p.on('pageerror', (e) => console.log('ERR', e.message, (e.stack || '').split('\n').slice(1, 3).join(' | ')));
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.addInitScript(() => localStorage.setItem('tiny-f1:season', JSON.stringify({ team: 'mercedes', round: 2, manager: { name: 'Max Test' }, points: {} })));
await p.goto(`http://localhost:${port}/index.html?nopost`);
for (let k = 0; k < 60 && !(await p.evaluate(() => !!window.__racer?.frontend)); k++) await p.waitForTimeout(250);
const shot = (name) => p.screenshot({ path: `${OUT}/${name}.png`, timeout: 180000 });
for (const [slot, kind] of [['frontWing', 'tunnel'], ['floor', 'cfd'], ['rearWing', 'sim'], ['suspension', 'rig'], ['brakes', 'dyno'], ['chassis', 'rig'], ['pu', 'dyno'], ['sidepods', 'tunnel']]) {
  await p.evaluate(([s]) => { const fe = window.__racer.frontend; fe.go('hub', 'rd', 1); }, [slot]);
  await p.waitForTimeout(800);
  await p.evaluate((s) => document.querySelector(`[data-slot="${s}"]`)?.click(), slot);
  await p.waitForTimeout(900);
  await p.evaluate((k) => document.querySelector(`[data-view="${k}"]`)?.click(), kind);
  // A bad geometry first, so the tests have something to find.
  if (kind !== 'sim') await p.evaluate(() => { const b = document.querySelectorAll('[data-p][data-k="5"]'); b[0]?.click(); b[0]?.click(); b[0]?.click(); });
  await p.evaluate(() => document.querySelector('[data-run]')?.click());
  await p.waitForTimeout(1600);
  await p.evaluate(() => document.querySelector('.lab .view')?.scrollIntoView({ block: 'center' }));
  await shot(`lab-${slot}-${kind}-run`);
  await p.waitForTimeout(kind === 'cfd' ? 6000 : 5000);
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot(`lab-${slot}-${kind}`);
  console.log(slot, kind, await p.evaluate(() => ({ findings: document.querySelector('[data-find]')?.innerText.slice(0, 200).replace(/\n/g, ' | '), est: document.querySelector('[data-est] .est b')?.textContent, run: document.querySelector('[data-runcost]')?.textContent })));
}
// Sign the sidepods off.
console.log('sign', await p.evaluate(async () => {
  const fe = window.__racer.frontend, before = fe.season.rd.teams[fe.season.team].projects.length;
  document.querySelector('[data-sign]')?.click();
  await new Promise((r) => setTimeout(r, 1200));
  return { before, after: fe.season.rd.teams[fe.season.team].projects.length, err: document.querySelector('[data-err]')?.textContent ?? null, page: document.querySelector('.hub-sub .on')?.textContent };
}));
await shot('lab-projects');
await b.close(); server.kill();
