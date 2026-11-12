// Screenshots of race control in the 3D race: the Safety Car out in front of the player's car, the HUD
// (flags, delta, race control messages with the FIA mark), a penalty card. Usage: OUT=dir node tools/rc-visual.mjs
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
await p.waitForTimeout(1500);
// Fast-forward through the formation lap and the start (the player is placed on the box).
const step = (secs, dt = 0.05) => p.evaluate(([secs, dt]) => { const w = window.__racer.weekendRun; for (let t = 0; t < secs; t += dt) { w.session.update(dt); w.field.update(dt, w.player.onTrack ? w.player : null, w.weather); w.raceRun.update(dt, { inPitLane: false }); } return `${w.session.state} ${w.session.rc.status} sc=${w.field.sc?.state}`; }, [secs, dt]);
console.log(await step(3)); console.log(await step(150)); console.log(await step(50)); console.log(await step(30));
// The Safety Car: deployed, out in front of the leader; the player put behind it.
await p.evaluate(() => { const w = window.__racer.weekendRun; w.session.rc.stopped.push({ r: null, s: 0, cause: 'test', recoverAt: w.session.rc.t + 400 }); w.session.rc.deploySC(); });
for (let k = 0; k < 30; k++) { const r = await step(5); if (r.includes('sc=track')) { console.log(r); break; } }
await step(6);
await p.evaluate(() => { const w = window.__racer.weekendRun, sc = w.field.sc, track = w.ctx.getTrack(); w.ctx.place(track.poseAt(sc.K.s - 16, sc.K.lat)); });
await p.waitForTimeout(2500);
await p.screenshot({ path: `${OUT}/rc-sc.png`, timeout: 180000 });
// Race control messages and a penalty card for the player.
await p.evaluate(() => { const w = window.__racer.weekendRun, S = w.session, rc = S.rc, o = S.standings(); rc.stewards(`TURN 4 INCIDENT INVOLVING CARS ${rc.num(o[2])} (${o[2].e.code}) AND ${rc.num(S.player)} (${S.player.e.code}) UNDER INVESTIGATION - CAUSING A COLLISION`, 'inv', [o[2], S.player]); rc.penalise(S.player, 't5', 'CAUSING A COLLISION'); rc.stewards(`5 SECOND TIME PENALTY FOR ${rc.car(S.player)} - CAUSING A COLLISION`, 'penalty', [S.player]); rc.msg('SAFETY CAR IN THIS LAP', 'sc'); });
await p.waitForTimeout(300);
console.log('dom', await p.evaluate(() => JSON.stringify({ cards: [...document.querySelectorAll('#rh .rcm')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()), pen: document.querySelector('#rh .pen').className + ' ' + document.querySelector('#rh .pen').textContent, go: getComputedStyle(document.querySelector('#rh .rh-go')).opacity })));
await p.screenshot({ path: `${OUT}/rc-msgs.png`, timeout: 180000 });
await b.close(); server.kill();
