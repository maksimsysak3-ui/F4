// Check: in a race, the crew waits in the player's box, the distance counts down, the car is braked into the box and one stop is made.
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
await p.evaluate(() => { const r = window.__racer, w = r.weekendRun, S = w.session, rr = w.raceRun, L = r.track.layout; S.state = 'racing'; rr.released = true; rr.goAt = 0; const box = w.boxes[w.teamId][0], lat = w.field.laneLat(box), pose = r.track.poseAt(box - 120, lat); w.ctx.place(pose); const v = r.vehicle, f = v.forward; v.body.velocity.set(f.x * 20, 0, f.z * 20); });
const pit = (secs) => p.evaluate((secs) => {
  const r = window.__racer, w = r.weekendRun, v = r.vehicle, L = r.track.layout, out = [], box = w.boxes[w.teamId][0];
  for (let t = 0; t < secs; t += 1 / 30) {
    const lim = r.track.pitLimit?.(v.body.position.x, v.body.position.z) ?? null;
    const c = { throttle: 0.6, brake: 0, steer: 0, handbrake: 0, shiftUp: false, shiftDown: false };
    w.controls(c);
    if (lim !== null && v.forwardSpeed > lim - 0.3) c.throttle = 0;
    for (let k = 0; k < 4; k++) v.step(1 / 120, c);
    w.update(1 / 30, { position: v.body.position }, { inPitLane: lim !== null, paused: false });
    if (Math.round(t * 30) % 15 === 0) { const n = L.nearest(v.body.position.x, v.body.position.z); let d = box - n.s; out.push(`toBox${d.toFixed(1)} v${v.forwardSpeed.toFixed(1)} lim${lim !== null ? 1 : 0} ${w.raceRun.stopping ? 'STOP' : ''}${w.raceRun.crewWait ? 'crew' : ''} hud:${document.querySelector('#rh-pit, .rh-pit, [class*=pit]')?.textContent?.trim().slice(0, 20) ?? ''}`); }
  }
  return out.join(' | ');
}, secs);
console.log(await pit(20));
await b.close(); server.kill();
