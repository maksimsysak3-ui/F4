// Dev check of the race engineer: its data, the offline answers, and the Claude path with a dummy key
// (which must fail cleanly into an offline answer). Usage: OUT=dir node tools/engineer-check.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const OUT = process.env.OUT ?? '.';
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', (e) => console.log('ERR', e.message, (e.stack || '').split('\n').slice(1, 4).join(' | ')));
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
await p.addInitScript(() => { localStorage.setItem('tiny-f1:fav', 'ferrari'); localStorage.setItem('tiny-f1:season', JSON.stringify({ team: 'ferrari', round: 9, manager: { name: 'Max Test' }, points: {} })); });
await p.goto(`http://localhost:${port}/index.html?nopost`);
for (let k = 0; k < 60; k++) { if (await p.evaluate(() => !!window.__racer)) break; await p.waitForTimeout(500); }
await p.evaluate(() => window.__racer.frontend.go('loading'));
for (let k = 0; k < 120; k++) { if (await p.evaluate(() => window.__racer.frontend.screen) === 'garage') break; await p.waitForTimeout(500); }
await p.evaluate(() => { const fe = window.__racer.frontend; fe.go('monitor', 'session', 'Q'); });
await p.evaluate(() => { const fe = window.__racer.frontend; fe.go('monitor', 'session', 'FP1'); document.querySelector('.wk [data-a="start"]').click(); });
await p.evaluate(() => { const S = window.__racer.weekendRun.session; S.skip(240); });
await p.evaluate(() => { window.__racer.frontend.go('incar'); });
await p.waitForTimeout(300);
await p.evaluate(() => document.querySelector('.wk [data-a="go"]').click());
await p.waitForTimeout(1500);
await p.evaluate(() => { const r = window.__racer; r.hud.setTelemetry('engineer'); });
console.log(await p.evaluate(async () => { const { dataBlock } = await import('./src/engineer.js'); return dataBlock(window.__racer.engineer.getContext()); }));
for (const q of ['Pace?', 'Tyres?', 'Weather?']) await p.click(`#engineer button.c >> text=${q}`);
await p.waitForTimeout(300);
console.log('--- offline log:\n' + await p.evaluate(() => [...document.querySelectorAll('#engineer .log p')].map((x) => x.textContent).join('\n')));
// The Claude path with a dummy key.
await p.evaluate(() => localStorage.setItem('tiny-f1:anthropic-key', 'sk-ant-dummy-key-for-test'));
await p.fill('#engineer .ask input', 'How do I go faster in sector two?');
await p.click('#engineer .send');
for (let k = 0; k < 40; k++) { const t = await p.evaluate(() => document.querySelector('#engineer .log').lastElementChild.textContent); if (!t.endsWith('…')) break; await p.waitForTimeout(500); }
await p.waitForTimeout(500);
console.log('--- claude path:\n' + await p.evaluate(() => [...document.querySelectorAll('#engineer .log p')].slice(-3).map((x) => x.className + ' | ' + x.textContent).join('\n')));
console.log('history', await p.evaluate(() => window.__racer.engineer.history.length), 'sdk', await p.evaluate(() => !!window.__racer.engineer.Anthropic));
await p.screenshot({ path: `${OUT}/engineer.png` });
await b.close(); server.kill();
