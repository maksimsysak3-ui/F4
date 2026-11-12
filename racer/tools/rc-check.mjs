// Dev check of race control: a short race with a crash and the Safety Car, a VSC, penalties (a
// drive-through and a time penalty for AI cars), the stewards' messages and the classification.
// Usage: OUT=dir node tools/rc-check.mjs [round]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const OUT = process.env.OUT ?? '.', round = +(process.argv[2] ?? 9);
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', (e) => console.log('ERR', e.message, (e.stack || '').split('\n').slice(1, 4).join(' | ')));
await p.addInitScript((round) => { localStorage.setItem('tiny-f1:fav', 'ferrari'); localStorage.setItem('tiny-f1:season', JSON.stringify({ team: 'mclaren', round, manager: { name: 'Max Test' }, points: {}, weekendPrefs: { length: 'short', difficulty: 90, raceLength: 'short' } })); }, round);
await p.goto(`http://localhost:${port}/index.html?nopost`);
for (let k = 0; k < 60; k++) { if (await p.evaluate(() => !!window.__racer)) break; await p.waitForTimeout(500); }
await p.evaluate(() => window.__racer.frontend.go('loading'));
for (let k = 0; k < 120; k++) { if (await p.evaluate(() => window.__racer.frontend.screen) === 'garage') break; await p.waitForTimeout(500); }
const ids = await p.evaluate(() => window.__racer.weekendRun.sessions().map((d) => d.id));
for (const id of ids.filter((x) => x !== 'R' && x !== 'S')) { await p.evaluate((id) => { const fe = window.__racer.frontend; fe.go('monitor', 'session', id); document.querySelector('.wk [data-a="sim"]')?.click(); }, id); await p.waitForTimeout(300); }
await p.evaluate(() => { const fe = window.__racer.frontend; fe.go('monitor', 'session', 'R'); document.querySelector('.wk [data-a="race"]').click(); });
await p.waitForTimeout(800);
await p.evaluate(() => { const w = window.__racer.weekendRun; w.session.player.retired = true; w.mode = 'garage'; globalThis.__msgs = []; const rc = w.session.rc, on = rc.onMessage; rc.onMessage = (m) => { globalThis.__msgs.push(`L${m.lap} [${m.kind}] ${m.text}`); on?.(m); }; });
const step = (secs, dt = 0.05) => p.evaluate(([secs, dt]) => {
  const w = window.__racer.weekendRun;
  for (let t = 0; t < secs; t += dt) { w.session.update(dt); w.field.update(dt, null, w.weather); w.raceRun.update(dt, { inPitLane: false }); }
  const S = w.session, rc = S.rc, F = w.field, sc = F.sc, run = S.standings().filter((r) => !r.retired && !r.finished);
  const lead = run[0], gapSC = sc?.active && lead?.ai ? Math.round(((sc.car.s - lead.ai.car.s) % F.L.length + F.L.length) % F.L.length) : null;
  return JSON.stringify({ st: S.state, rc: rc.status, lap: rc.lap, lead: run.slice(0, 3).map((x) => x.e.code).join(' '), sc: sc ? sc.state : '-', gapSC, queued: !!rc.scQueued,
    spread: run.length ? Math.round(run[0].dist - run[run.length - 1].dist) : 0, pits: S.rows.reduce((n, x) => n + x.pits, 0), out: F.cars.filter((a) => a.state === 'out').length, dnf: S.rows.filter((r) => r.retired).length, yellows: rc.yellows.length, open: rc.cases.length });
}, [secs, dt]);
const msgs = async () => { const m = await p.evaluate(() => globalThis.__msgs.splice(0)); if (m.length) console.log('  ' + m.join('\n  ')); };
await step(3); await step(150); await step(50);
console.log('start', await step(12)); await msgs();
console.log('race', await step(40)); await msgs();
// A crash, and make sure it's the Safety Car.
await p.evaluate(() => { const w = window.__racer.weekendRun; w.field.crashRandom(); if (w.session.rc.status !== 'sc') w.session.rc.deploySC(); });
for (let k = 0; k < 24; k++) { const r = await step(10); console.log('sc', r); await msgs(); if (k > 3 && JSON.parse(r).rc === 'green') break; }
// Penalties: a drive-through for P5, a 5 s time penalty for P6.
console.log(await p.evaluate(() => { const S = window.__racer.weekendRun.session, o = S.standings().filter((r) => !r.retired); S.rc.penalise(o[4], 'dt', 'TEST DRIVE THROUGH'); S.rc.penalise(o[5], 't5', 'TEST TIME'); globalThis.__dt = o[4].id; globalThis.__t5 = o[5].id; return `dt ${o[4].e.code} t5 ${o[5].e.code}`; }));
// A VSC (once it's green again).
for (let k = 0; k < 20; k++) { const r = await step(10); await msgs(); if (JSON.parse(r).rc === 'green') break; }
console.log('green', await step(20)); await msgs();
await p.evaluate(() => { const rc = window.__racer.weekendRun.session.rc; rc.stopped.push({ r: null, s: 100, cause: 'test', recoverAt: rc.t + 40 }); rc.deployVSC(); });
for (let k = 0; k < 16; k++) { const r = await step(10); console.log('vsc', r); await msgs(); if (k > 2 && JSON.parse(r).rc === 'green') break; }
for (let k = 0; k < 80; k++) { const r = await step(15); await msgs(); const st = JSON.parse(r).st; if (k % 4 === 0) console.log('race', r); if (st === 'done') break; }
console.log(await p.evaluate(() => { const S = window.__racer.weekendRun.session, dt = S.row(globalThis.__dt), t5 = S.row(globalThis.__t5); return `DT car: driveThrough ${JSON.stringify(dt.driveThrough)} pens ${JSON.stringify(dt.pens)} | T5 car: unserved ${t5.penalty} pens ${JSON.stringify(t5.pens)}`; }));
console.log(await p.evaluate(() => { const w = window.__racer.weekendRun, res = w.weekend.results.R; return res ? res.map((r) => `${r.pos} ${r.code} ${r.gap ?? ''} pen ${r.penTime} ${r.retired ? 'DNF' : ''}`).join(' | ') : 'no results'; }));
console.log(await p.evaluate(() => JSON.stringify(window.__racer.weekendRun.weekend.raceControl?.R)));
await b.close(); server.kill();
