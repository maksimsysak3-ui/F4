// Check: qualifying lengths (8-minute segments, 15-minute practice), the TV feed from the garage (cameras,
// overlay, director), and being knocked out on track (sent back to the pits, then offered the feed).
// Usage: OUT=dir node tools/watch-check.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const OUT = process.env.OUT ?? '.';
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('pageerror', (e) => { errs.push(e.message); console.log('ERR', e.message, (e.stack || '').split('\n').slice(1, 3).join(' | ')); });
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
await p.addInitScript(() => { localStorage.setItem('tiny-f1:fav', 'ferrari'); localStorage.setItem('tiny-f1:season', JSON.stringify({ team: 'mclaren', round: 9, manager: { name: 'Max Test' }, points: {}, weekendPrefs: { length: 'short', difficulty: 90, raceLength: 'short' } })); });
await p.goto(`http://localhost:${port}/index.html?nopost`);
for (let k = 0; k < 60; k++) { if (await p.evaluate(() => !!window.__racer)) break; await p.waitForTimeout(500); }
await p.evaluate(() => window.__racer.frontend.go('loading'));
for (let k = 0; k < 120; k++) { if (await p.evaluate(() => window.__racer.frontend.screen) === 'garage') break; await p.waitForTimeout(500); }
console.log('lengths', await p.evaluate(() => JSON.stringify(window.__racer.weekendRun.sessions().map((d) => [d.id, d.minutes, d.segments]))));
// Practice simulated, then qualifying started live.
const ids = await p.evaluate(() => window.__racer.weekendRun.sessions().map((d) => d.id));
for (const id of ids.filter((x) => x.startsWith('FP'))) { await p.evaluate((id) => { window.__racer.frontend.go('monitor', 'session', id); document.querySelector('.wk [data-a="sim"]')?.click(); }, id); await p.waitForTimeout(300); }
await p.evaluate(() => { window.__racer.frontend.go('monitor', 'session', 'Q'); document.querySelector('.wk [data-a="start"]').click(); });
await p.waitForTimeout(800);
console.log('screen', await p.evaluate(() => window.__racer.frontend.screen), await p.evaluate(() => [...document.querySelectorAll('.wk .acts button')].map((x) => x.textContent).join(' | ')));
// Run the clock until cars are out (stepping the world as the game would).
const step = (secs, dt = 1 / 30) => p.evaluate(([secs, dt]) => { const w = window.__racer.weekendRun; for (let t = 0; t < secs; t += dt) { w.session.update(dt); w.field.update(dt, null, w.weather); } return w.field.cars.filter((a) => a.state === 'track').length; }, [secs, dt]);
let on = 0; for (let k = 0; k < 20 && on < 4; k++) on = await step(20);
console.log('on track', on);
await p.evaluate(() => document.querySelector('.wk [data-a="watch"]').click());
await p.waitForTimeout(1500);
const state = () => p.evaluate(() => { const r = window.__racer, s = r.spectator; return JSON.stringify({ mode: r.weekendRun.mode, active: s.active, cam: s.cam, auto: s.auto, target: s.target?.entry.code, state: s.target?.state, fe: r.frontend.visible, card: document.querySelector('#spec .who b')?.textContent, lap: document.querySelector('#spec .lap')?.textContent, tag: document.querySelector('#spec .tag')?.textContent, speedo: getComputedStyle(document.getElementById('speedo')).display, tower: getComputedStyle(document.getElementById('tower')).display, carVisible: r.car.root.visible, fov: r.rig && Math.round(window.__racer.scene && document && 0) }); });
console.log('watching', await state());
if (!process.env.QUICK) {
for (const cam of ['tv', 'onboard', 'chase', 'heli']) {
  await p.evaluate((cam) => { const s = window.__racer.spectator; s.auto = false; s.setCam(cam); }, cam);
  await p.waitForTimeout(1600);
  await p.screenshot({ timeout: 180000, path: `${OUT}/watch-${cam}.png` });
  console.log(cam, await p.evaluate(() => { const c = window.__racer.spectator.camera, t = window.__racer.spectator.target?.visual.root.position; return `cam ${c.position.toArray().map((v) => v.toFixed(1))} fov ${c.fov.toFixed(1)} car ${t?.toArray().map((v) => v.toFixed(1))} dist ${t ? c.position.distanceTo(t).toFixed(1) : '-'}`; }));
}
// Keys: next car, camera cycle, director back on.
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300);
const t1 = await p.evaluate(() => window.__racer.spectator.target?.entry.code);
await p.keyboard.press('KeyC'); await p.keyboard.press('KeyA'); await p.waitForTimeout(300);
console.log('keys', t1, await state());
// Back to the garage with Esc: the timing screen.
await p.keyboard.press('Escape'); await p.waitForTimeout(1200);
console.log('after esc', await p.evaluate(() => JSON.stringify({ mode: window.__racer.weekendRun.mode, fe: window.__racer.frontend.visible, screen: window.__racer.frontend.screen, spec: document.getElementById('spec').className, body: document.body.className })));
}
// Knocked out while driving: out in the car, then the end of Q1 with no time set.
await p.evaluate(() => { const fe = window.__racer.frontend; fe.go('incar'); });
await p.waitForTimeout(500);
await p.evaluate(() => document.querySelector('.wk [data-a="go"], [data-a="go"]')?.click());
await p.waitForTimeout(800);
console.log('driving', await p.evaluate(() => JSON.stringify({ mode: window.__racer.weekendRun.mode, started: window.__racer.started, fe: window.__racer.frontend.visible })));
await p.evaluate(() => { const S = window.__racer.weekendRun.session; S.out.add(S.player.id); S.player.outPos = 18; S.state = 'break'; S.breakLeft = 45; S.onSegmentEnd([S.player]); });
await p.waitForTimeout(400);
console.log("ko dbg", await p.evaluate(() => JSON.stringify({ ko: window.__racer.koTimer, paused: window.__racer.paused, frames: window.__racer.frames }))); await p.waitForTimeout(3000); console.log("ko dbg2", await p.evaluate(() => JSON.stringify({ ko: window.__racer.koTimer, paused: window.__racer.paused, frames: window.__racer.frames })));
console.log("knocked", await p.evaluate(() => JSON.stringify({ out: window.__racer.weekendRun.session.out.has(window.__racer.weekendRun.session.player.id), mode: window.__racer.weekendRun.mode, state: window.__racer.weekendRun.session.state })));
for (let k = 0; k < 240 && (await p.evaluate(() => window.__racer.weekendRun.mode)) === "track"; k++) await p.waitForTimeout(1000);
console.log('after ko', await p.evaluate(() => JSON.stringify({ mode: window.__racer.weekendRun.mode, fe: window.__racer.frontend.visible, screen: window.__racer.frontend.screen, btn: document.querySelector('.wk [data-a="car"]')?.textContent, disabled: document.querySelector('.wk [data-a="car"]')?.disabled })));
await p.screenshot({ timeout: 180000, path: `${OUT}/watch-ko-monitor.png` });
await p.evaluate(() => document.querySelector('.wk [data-a="car"]').click()); await p.waitForTimeout(1000);
console.log('ko watch', await state());
await p.screenshot({ timeout: 180000, path: `${OUT}/watch-ko-feed.png` });
console.log('errors', errs.length);
await b.close(); server.kill();
