// Regression: a season save that has not been to a race weekend (and an older one) opens the office,
// uses the computer and reaches the hub, then every tab and page renders. Usage: node tools/office-check.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [name, save] of [['fresh', { team: 'mclaren', round: 0, manager: { name: 'Max' }, points: {} }], ['mid', { team: 'williams', round: 3, manager: { name: 'Max' }, points: { Max: 12 }, history: [] }]]) {
  const p = await b.newPage({ viewport: { width: 1200, height: 750 } });
  p.on('pageerror', (e) => console.log(name, 'ERR', e.message, (e.stack || '').split('\n').slice(1, 4).join(' | ')));
  p.on('console', (m) => { if (m.type() === 'error') console.log(name, 'CONSOLE', m.text()); });
  await p.addInitScript((s) => localStorage.setItem('tiny-f1:season', JSON.stringify(s)), save);
  await p.goto(`http://localhost:${port}/index.html?nopost`);
  for (let k = 0; k < 60 && !(await p.evaluate(() => !!window.__racer?.frontend)); k++) await p.waitForTimeout(250);
  await p.evaluate(() => window.__racer.frontend.go('office'));
  await p.waitForTimeout(3000);
  await p.evaluate(() => window.__racer.frontend.openComputer());
  for (let k = 0; k < 12; k++) { await p.waitForTimeout(2500); const st = await p.evaluate(() => { const S = window.__racer.frontend.stage; return JSON.stringify({ tw: S?.tween ? { t: S.tween.t, d: S.tween.d, pending: S.tween.pending } : null, hub: window.__racer.frontend.el.classList.contains('hubmode'), frames: window.__racer.frames }); }); console.log(name, k, st); if (st.includes('"hub":true')) break; }
  await p.waitForTimeout(4000);
  console.log(name, await p.evaluate(() => ({ hubPage: !!document.querySelector('.hub-page'), tiles: document.querySelectorAll('.hub-tile').length, text: document.querySelector('#front')?.innerText.slice(0, 160).replace(/\n/g, ' | ') })));
  for (const tab of ['news', 'calendar', 'standings', 'rd', 'team', 'home']) for (const sub of [0, 1, 2, 3, 4, 5, 6]) { await p.evaluate(([t, u]) => window.__racer.frontend.go('hub', t, u), [tab, sub]); await p.waitForTimeout(400); const ok = await p.evaluate(() => !!document.querySelector('.hub-page')?.innerText.trim()); if (!ok) console.log(name, 'EMPTY', tab, sub); }
  await p.screenshot({ path: `/tmp/claude-0/-home-user-F4/952c04d6-41b9-5ae7-863c-2ea1f3d18b99/scratchpad/repro-${name}.png` });
  await p.close();
}
await b.close(); server.kill();
