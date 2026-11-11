// Dev check of the race weekend logic: a session on track, back to the garage, simulated sessions, qualifying.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 320, height: 200 } });
p.on('pageerror', (e) => console.log('ERR', e.message, (e.stack || '').split('\n').slice(1, 4).join(' | ')));
await p.addInitScript(() => { localStorage.setItem('tiny-f1:fav', 'ferrari'); localStorage.setItem('tiny-f1:season', JSON.stringify({ team: 'ferrari', round: 9, manager: { name: 'Max Test' }, points: {} })); });
await p.goto(`http://localhost:${port}/index.html?nopost`);
for (let k = 0; k < 60; k++) { if (await p.evaluate(() => !!window.__racer)) break; await p.waitForTimeout(500); }
await p.evaluate(() => window.__racer.frontend.go('loading'));
for (let k = 0; k < 120; k++) { if (await p.evaluate(() => window.__racer.frontend.screen) === 'garage') break; await p.waitForTimeout(500); }
const st = () => p.evaluate(() => { const r = window.__racer, w = r.weekendRun, S = w.session; return JSON.stringify({ fe: r.frontend.screen, vis: r.frontend.visible, mode: w.mode, state: S?.state, rem: S && Math.round(S.remaining), seg: S?.segment, onTrack: w.field.cars.filter((a) => a.state !== 'garage').map((a) => a.entry.code + ':' + a.state[0] + (a.lapType ?? '')).join(' '), laps: S?.rows.reduce((n, x) => n + x.laps, 0), done: w.weekend?.done }); });
await p.evaluate(() => { const fe = window.__racer.frontend; fe.go('monitor', 'session', 'FP1'); document.querySelector('.wk [data-a="start"]').click(); });
await p.waitForTimeout(500);
await p.evaluate(() => { window.__racer.frontend.go('incar'); });
await p.waitForTimeout(500);
await p.evaluate(() => document.querySelector('.wk [data-a="go"]').click());
for (let k = 0; k < 2; k++) { await p.waitForTimeout(5000); console.log(await st()); }
await p.evaluate(() => window.__racer.weekendApi.garage());
await p.waitForTimeout(1500); console.log('after garage', await st());
// Qualifying straight after: simulate FP2, FP3, then run Q segments fast.
await p.evaluate(() => { const fe = window.__racer.frontend; for (const id of ['FP1', 'FP2', 'FP3']) { if (window.__racer.weekendRun.session?.def?.id === id) { const S = window.__racer.weekendRun.session; while (S.state !== 'done') { if (S.state === 'break') S.startSegment(S.segment + 1); else if (S.state === 'chequer') S.endSegment(); else S.skip(200); } } } });
for (const id of ['FP2', 'FP3']) { await p.evaluate((id) => { const fe = window.__racer.frontend; fe.go('monitor', 'session', id); document.querySelector('.wk [data-a="sim"]').click(); }, id); await p.waitForTimeout(300); }
console.log('after sims', await st());
await p.evaluate(() => { const fe = window.__racer.frontend; fe.go('monitor', 'session', 'Q'); document.querySelector('.wk [data-a="start"]').click(); });
await p.waitForTimeout(400);
for (let k = 0; k < 6; k++) { await p.evaluate(() => { const S = window.__racer.weekendRun.session; if (S.state === 'green') S.skip(1e6); else if (S.state === 'break') S.breakLeft = 0; }); await p.waitForTimeout(1500); console.log('Q', await st()); }
console.log(await p.evaluate(() => JSON.stringify(window.__racer.weekendRun.weekend.results.Q.slice(0, 12).map((r) => `${r.pos} ${r.code} ${r.q.map((x) => x?.toFixed(2)).join('/')}`))));
console.log(await p.evaluate(() => JSON.stringify(window.__racer.weekendRun.weekend.results.FP2.slice(0, 22).map((r) => `${r.pos} ${r.code} ${r.best?.toFixed(3)} ${r.laps}`))));
await b.close(); server.kill();
