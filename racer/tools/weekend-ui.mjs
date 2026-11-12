import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
// Dev check of the race weekend screens (screenshots into OUT). Usage: OUT=dir node tools/weekend-ui.mjs
const OUT = process.env.OUT ?? '.', round = +(process.env.ROUND ?? 9);
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', (e) => console.log('ERR', e.message, (e.stack || '').split('\n').slice(1, 4).join(' | ')));
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.addInitScript((round) => {
  localStorage.setItem('tiny-f1:fav', 'mclaren');
  localStorage.setItem('tiny-f1:season', JSON.stringify({ team: 'mclaren', round, manager: { name: 'Max Test', skin: '#e0b48c', hair: 'short', hairCol: '#2a1d14', facial: 'none', suit: '#1d2230', tie: '#8a1a22' }, points: {} }));
}, round);
await p.goto(`http://localhost:${port}/index.html?nopost`);
for (let k = 0; k < 120 && !(await p.evaluate(() => !!window.__racer?.frontend)); k++) await p.waitForTimeout(500);
const shot = async (n) => { await p.screenshot({ path: `${OUT}/${n}.png` }); console.log('shot', n); };
const t0 = Date.now();
await p.evaluate(() => window.__racer.frontend.go('loading'));
await p.waitForTimeout(800); await shot('1-loading');
for (let k = 0; k < 120; k++) { if (await p.evaluate(() => window.__racer.frontend.screen) === 'garage') break; await p.waitForTimeout(500); }
console.log('loaded in', (Date.now() - t0) / 1000, 's; screen', await p.evaluate(() => window.__racer.frontend.screen));
await p.waitForTimeout(2500); await shot('2-garage');
await p.evaluate(() => window.__racer.frontend.openMonitor());
for (let k = 0; k < 40; k++) { if (await p.evaluate(() => window.__racer.frontend.screen) === 'monitor') break; await p.waitForTimeout(250); }
await p.waitForTimeout(500); await shot('3-schedule');
console.log(await p.evaluate(() => { const b = document.querySelector('.wk .btn.primary'); const r = b.getBoundingClientRect(); const top = document.elementFromPoint(r.x + 10, r.y + 10); let o = [], e = b; while (e) { const cs = getComputedStyle(e); if (cs.opacity !== '1' || cs.filter !== 'none') o.push(e.className + ':' + cs.opacity + ':' + cs.filter); e = e.parentElement; } return JSON.stringify({ top: top.className, o, dis: b.disabled, bg: getComputedStyle(b).backgroundColor }); }));
await p.evaluate(() => window.__racer.frontend.go('monitor', 'session', 'FP1'));
await p.waitForTimeout(800); await shot('4-session');
await p.click('.wk [data-tab="weather"]'); await p.waitForTimeout(500); await shot('5-weather');
await p.click('.wk [data-tab="tyres"]'); await p.waitForTimeout(500); await shot('6-tyres');
await p.click('.wk [data-a="start"]');
await p.waitForTimeout(1000);
await p.click('.wk [data-a="s5"]');
await p.waitForTimeout(1500); await shot('7-live');
await p.click('.wk [data-a="car"]');
for (let k = 0; k < 60; k++) { if (!(await p.evaluate(() => !!window.__racer.frontend.stage.tween))) break; await p.waitForTimeout(250); }
await p.waitForTimeout(300); await shot('8-incar');
await p.click('.wk [data-a="go"]');
await p.waitForTimeout(4000);
console.log(await p.evaluate(() => { const r = window.__racer; return JSON.stringify({ mode: r.weekendRun.mode, comp: r.vehicle.compound, pos: [r.vehicle.body.position.x|0, r.vehicle.body.position.z|0], started: r.started, fe: r.frontend.visible, cars: r.weekendRun.field.cars.filter(a=>a.state!=='garage').length }); }));
await b.close(); server.kill();
