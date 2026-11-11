// Dev check of the race ceremonies: a simulated weekend, the race simulated, parc fermé, the podium
// (trophies, champagne), the results with the championship. Usage: OUT=dir node tools/ceremony-check.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const OUT = process.env.OUT ?? '.';
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', (e) => console.log('ERR', e.message, (e.stack || '').split('\n').slice(1, 4).join(' | ')));
await p.addInitScript(() => { localStorage.setItem('tiny-f1:fav', 'ferrari'); localStorage.setItem('tiny-f1:season', JSON.stringify({ team: 'mclaren', round: 9, manager: { name: 'Max Test', skin: '#d6a476', hair: 'short', hairCol: '#2a1d14' }, points: {} })); });
await p.goto(`http://localhost:${port}/index.html?nopost`);
for (let k = 0; k < 60; k++) { if (await p.evaluate(() => !!window.__racer)) break; await p.waitForTimeout(500); }
await p.evaluate(() => window.__racer.frontend.go('loading'));
for (let k = 0; k < 120; k++) { if (await p.evaluate(() => window.__racer.frontend.screen) === 'garage') break; await p.waitForTimeout(500); }
for (const id of ['FP1', 'FP2', 'FP3', 'Q']) { await p.evaluate((id) => { const fe = window.__racer.frontend; fe.go('monitor', 'session', id); document.querySelector('.wk [data-a="sim"]')?.click(); }, id); await p.waitForTimeout(200); }
// The race simulated; make the player a podium finisher for the parc fermé scene.
await p.evaluate(() => { const fe = window.__racer.frontend; fe.go('monitor', 'session', 'R'); document.querySelector('.wk [data-a="simrace"]').click(); });
await p.waitForTimeout(300);
await p.evaluate(() => { const r = window.__racer, w = r.weekendRun.weekend.results.R, me = w.find((x) => x.id === r.weekendRun.playerEntry.id); const i = w.indexOf(me); w.splice(i, 1); w.splice(1, 0, me); w.forEach((x, k) => { x.pos = k + 1; }); r.frontend.go('parc', 'R'); });
const shot = async (n, wait) => { await p.waitForTimeout(wait); await p.screenshot({ path: `${OUT}/${n}.png`, timeout: 120000 }); console.log('shot', n, await p.evaluate(() => window.__racer.frontend.screen)); };
await shot('cer-parc1', 2500);
await shot('cer-parc2', 5000);
await p.evaluate(() => window.__racer.frontend.go('podium', 'R'));
await shot('cer-pod1', 5000);
await shot('cer-pod2', 6000);
await shot('cer-pod3', 6000);
await p.evaluate(() => window.__racer.frontend.go('results', 'R'));
await shot('cer-results', 1500);
await b.close(); server.kill();
