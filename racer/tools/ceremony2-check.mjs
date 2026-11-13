// Check: the post-race scenes (garage finish off the podium, parc fermé on it, the podium), the media
// pen behind the interviews, and a pit stop's crew. Screenshots at moments in each. Usage: OUT=dir node tools/ceremony2-check.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const OUT = process.env.OUT ?? '.';
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
p.on('pageerror', (e) => { errs.push(e.message); console.log('ERR', e.message, (e.stack || '').split('\n').slice(1, 3).join(' | ')); });
await p.addInitScript(() => { localStorage.setItem('tiny-f1:fav', 'ferrari'); localStorage.setItem('tiny-f1:season', JSON.stringify({ team: 'mclaren', round: 9, manager: { name: 'Max Test' }, points: {}, weekendPrefs: { length: 'short', difficulty: 90, raceLength: 'short' } })); });
await p.goto(`http://localhost:${port}/index.html?nopost`);
for (let k = 0; k < 60; k++) { if (await p.evaluate(() => !!window.__racer)) break; await p.waitForTimeout(500); }
await p.evaluate(() => window.__racer.frontend.go('loading'));
for (let k = 0; k < 120; k++) { if (await p.evaluate(() => window.__racer.frontend.screen) === 'garage') break; await p.waitForTimeout(500); }
for (const id of ['FP1', 'FP2', 'FP3', 'Q']) { await p.evaluate((id) => { const fe = window.__racer.frontend; fe.go('monitor', 'session', id); document.querySelector('.wk [data-a="sim"]')?.click(); }, id); await p.waitForTimeout(200); }
await p.evaluate(() => { const fe = window.__racer.frontend; fe.go('monitor', 'session', 'R'); document.querySelector('.wk [data-a="simrace"]')?.click(); });
await p.waitForTimeout(800);
// Drive a scripted scene forward in time without waiting on swiftshader's frame rate.
const advance = (secs) => p.evaluate((secs) => { const S = window.__racer.frontend.stage, cam = S.camera; for (let t = 0; t < secs; t += 1 / 30) { S.custom?.update?.(1 / 30, cam); for (const q of S.people) q.userData && window.__animate?.(q, 1 / 30); } }, secs);
await p.evaluate(async () => { const m = await import('./src/front/people.js'); window.__animate = m.animatePerson; window.__three = await import('three'); });
const shot = async (name) => { await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/${name}.png`, timeout: 120000 }); console.log('shot', name); };
const setPos = (pos) => p.evaluate((pos) => { const fe = window.__racer.frontend, R = fe.season.weekend.results.R, me = R.find((r) => r.id === 'mclaren-0'); R.splice(R.indexOf(me), 1); R.splice(pos - 1, 0, me); R.forEach((r, k) => { r.pos = k + 1; }); me.retired = false; me.points = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1][pos - 1] ?? 0; }, pos);
await setPos(9);
await p.evaluate(() => window.__racer.frontend.go('parc', 'R'));
await advance(2); await shot('gf-1');
await advance(4); await shot('gf-2');
await advance(3); await shot('gf-3');
await setPos(1);
await p.evaluate(() => window.__racer.frontend.go('parc', 'R'));
await advance(1); await shot('pf-1');
await advance(4.5); await shot('pf-2');
await advance(5); await shot('pf-3');
await advance(4); await shot('pf-4');
await p.evaluate(() => window.__racer.frontend.go('podium', 'R'));
await advance(2); await shot('pod-1');
await advance(10); await shot('pod-2');
await advance(7); await shot('pod-3');
await advance(6); await shot('pod-4');
// The media pen behind the post-race interview.
await p.evaluate(() => window.__racer.frontend.go('results', 'R'));
await p.waitForTimeout(500);
await p.evaluate(() => document.querySelector('.wk [data-a="ivw"]')?.click());
await advance(2); await shot('pen-1');
// A pit stop: the crew round a car, part-way through.
await p.evaluate(async () => {
  const fe = window.__racer.frontend, { PitCrews } = await import('./src/game/pitCrew.js'), { TEAMS } = await import('./src/front/teams.js');
  document.querySelectorAll('.ivw-host').forEach((x) => x.remove());
  fe.setScene('custom', (g) => {
    const car = fe.makeCar(1); g.add(car);
    const T = window.__three; g.add(new T.HemisphereLight(0xffffff, 0x444444, 2.2)); const sun = new T.DirectionalLight(0xffffff, 2.5); sun.position.set(4, 8, 5); g.add(sun);
    const fl = new T.Mesh(new T.PlaneGeometry(30, 30).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0x8f9298 })); g.add(fl);
    const crews = new PitCrews(g); const c = crews.start(TEAMS[0], 0, 0, 0, Math.PI / 2, 3);
    window.__crew = { crews, c };
    return { people: [], update(dt, cam) { crews.update(dt); cam.position.set(5, 3.2, 6); cam.fov = 40; cam.updateProjectionMatrix(); cam.lookAt(0, 0.6, 0); return false; } };
  });
});
await advance(0.4); await shot('pit-1');
await advance(0.9); await shot('pit-2');
await advance(1.9); await shot('pit-3');
console.log('errors', errs.length);
await b.close(); server.kill();
