// Check: the player's car held on the grid (no input) stays put, and drives away on the formation lap.
// Usage: node tools/grid-hold-check.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.addInitScript(() => { localStorage.setItem('tiny-f1:fav', 'ferrari'); localStorage.setItem('tiny-f1:season', JSON.stringify({ team: 'mclaren', round: 9, manager: { name: 'Max Test' }, points: {}, weekendPrefs: { length: 'short', difficulty: 90, raceLength: 'short' } })); });
await p.goto(`http://localhost:${port}/index.html?nopost`);
for (let k = 0; k < 60; k++) { if (await p.evaluate(() => !!window.__racer)) break; await p.waitForTimeout(500); }
await p.evaluate(() => window.__racer.frontend.go('loading'));
for (let k = 0; k < 120; k++) { if (await p.evaluate(() => window.__racer.frontend.screen) === 'garage') break; await p.waitForTimeout(500); }
const ids = await p.evaluate(() => window.__racer.weekendRun.sessions().map((d) => d.id));
for (const id of ids.filter((x) => x !== 'R' && x !== 'S')) { await p.evaluate((id) => { window.__racer.frontend.go('monitor', 'session', id); document.querySelector('.wk [data-a="sim"]')?.click(); }, id); await p.waitForTimeout(300); }
await p.evaluate(() => { const fe = window.__racer.frontend; fe.go('monitor', 'session', 'R'); document.querySelector('.wk [data-a="race"]').click(); });
await p.waitForTimeout(1500);
await p.evaluate(() => { window.__racer.paused = true; });
const step = (secs, ctl) => p.evaluate(([secs, ctl]) => {
  const r = window.__racer, w = r.weekendRun, v = r.vehicle, L = r.track.layout, out = [];
  for (let t = 0; t < secs; t += 1 / 30) {
    const c = { throttle: 0, brake: 0, steer: 0, handbrake: 0, shiftUp: false, shiftDown: false, ...ctl };
    w.controls(c);
    for (let k = 0; k < 4; k++) v.step(1 / 120, c);
    w.update(1 / 30, r.rig.camera ?? { position: v.body.position }, { inPitLane: false, paused: false });
    if (Math.round(t * 30) % 30 === 0) { const n = L.nearest(v.body.position.x, v.body.position.z); out.push(`${w.session.state[0]} s${Math.round(n?.s)} v${v.forwardSpeed.toFixed(1)}`); }
  }
  return out.join(' ');
}, [secs, ctl]);
console.log('mode', await p.evaluate(() => window.__racer.weekendRun.mode + ' ' + window.__racer.weekendRun.session.state + ' started ' + window.__racer.started));
console.log('idle', await step(10, {}));
console.log('drive', await step(12, { throttle: 0.7 }));
console.log('cars', await p.evaluate(() => { const F = window.__racer.weekendRun.field; return F.cars.filter((a) => a.row).slice(0, 4).map((a) => a.entry.code + ' ' + (a.car.u * 3.6).toFixed(0)).join(', '); }));
await b.close(); server.kill();
