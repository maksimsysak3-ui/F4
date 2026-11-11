// Dev check of a race: practice and qualifying simulated, onto the grid, the formation lap and the AI
// parking, the lights, the start, racing laps with pit stops (the field fast-forwarded), the results.
// Usage: OUT=dir node tools/race-check.mjs [round]
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
console.log('sessions', ids.join(' '));
for (const id of ids.filter((x) => x !== 'R' && x !== 'S')) {
  await p.evaluate((id) => { const fe = window.__racer.frontend; fe.go('monitor', 'session', id); document.querySelector('.wk [data-a="sim"]')?.click(); }, id);
  await p.waitForTimeout(300);
}
const raceId = ids.includes('S') ? 'S' : 'R';
await p.evaluate((id) => { const fe = window.__racer.frontend; fe.go('monitor', 'session', id); document.querySelector('.wk [data-a="race"]').click(); }, raceId);
await p.waitForTimeout(800);
const step = (secs, dt = 0.05) => p.evaluate(([secs, dt]) => { const r = window.__racer, w = r.weekendRun; for (let t = 0; t < secs; t += dt) { w.session.update(dt); w.field.update(dt, w.player.onTrack ? w.player : null, w.weather); w.raceRun.update(dt, { inPitLane: false }); } const S = w.session; return JSON.stringify({ state: S.state, lights: S.lightsOn, parked: w.field.cars.filter((a) => a.parked).length, form: w.field.cars.filter((a) => a.lapType === 'formation').length, lead: S.standings().slice(0, 3).map((x) => `${x.e.code}:L${x.laps}`).join(' '), pits: S.rows.reduce((n, x) => n + x.pits, 0), stopping: w.field.cars.filter((a) => a.state === 'stop').length, contacts: w.field.cars.reduce((n, a) => n + (a.car.contacts ?? 0), 0), walls: w.field.cars.reduce((n, a) => n + (a.car.wallHits ?? 0), 0), log: globalThis.__contactLog?.length }); }, [secs, dt]);
await p.evaluate(() => { const w = window.__racer.weekendRun; w.session.player.retired = true; w.mode = 'garage'; }); // (nobody drives the player's car here)
console.log('grid', await step(3));

console.log('formation', await step(60));
console.log('formation+', await step(90));
// The player hasn't driven: they get put on their box after a while; then the lights.
console.log('lights?', await step(50));
await p.evaluate(() => { globalThis.__contactLog = []; });
console.log('started?', await step(12));
console.log('start contacts', await p.evaluate(() => JSON.stringify(globalThis.__contactLog.slice(0, 40))));

console.log(await p.evaluate(() => { const w = window.__racer.weekendRun, F = w.field, L = F.L; const close = []; const cs = F.cars.filter((a) => a.row); for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) { const d = Math.hypot(cs[i].car.x - cs[j].car.x, cs[i].car.z - cs[j].car.z); if (d < 4) close.push(`${cs[i].entry.code}-${cs[j].entry.code} ${d.toFixed(1)} (${cs[i].row.gridPos},${cs[j].row.gridPos})`); } return 'close pairs: ' + close.join(', ') + ' | pit s0 ' + Math.round(F.pit.s0) + ' s1 ' + Math.round(F.pit.s1) + ' L ' + Math.round(L.length); }));
for (let k = 0; k < 15; k++) { console.log('race', await step(60, 0.05)); if (k === 1 || k === 0) console.log('start contacts', await p.evaluate(() => JSON.stringify(globalThis.__contactLog.slice(0, 40)))); console.log(await p.evaluate(() => { const w = window.__racer.weekendRun, F = w.field, S = w.session; const a = F.cars[0], r = a.row; return `${a.entry.code} laps ${r.laps} pitLap ${r.pitLap} wants ${S.wantsPit(r)} pitThis ${a.pitThisLap} state ${a.state} lapType ${a.lapType} s ${Math.round(a.car.s)} plan ${JSON.stringify(r.plan)}`; })); }
console.log(await p.evaluate(() => { const S = window.__racer.weekendRun.session; return JSON.stringify(S.standings().slice(0, 8).map((r) => `${r.pos} ${r.e.code} L${r.laps} gap ${r.gap.toFixed(1)} ${r.tyres.compound}${r.tyres.pct}% p${r.pits}`)); }));
await b.close(); server.kill();
