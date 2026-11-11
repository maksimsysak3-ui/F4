import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
// Dev check of the R&D model (a whole season, AI and player) and the hub tab (screenshots into OUT).
// Usage: OUT=dir node tools/rd-check.mjs
const OUT = process.env.OUT ?? '.';
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', (e) => console.log('ERR', e.message, (e.stack || '').split('\n').slice(1, 4).join(' | ')));
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.addInitScript(() => {
  localStorage.setItem('tiny-f1:fav', 'mclaren');
  localStorage.setItem('tiny-f1:season', JSON.stringify({ team: 'williams', round: 0, manager: { name: 'Max Test', skin: '#e0b48c', hair: 'short', hairCol: '#2a1d14', facial: 'none', suit: '#1d2230', tie: '#8a1a22' }, points: {} }));
});
await p.goto(`http://localhost:${port}/index.html?nopost`);
for (let k = 0; k < 60 && !(await p.evaluate(() => !!window.__racer?.frontend)); k++) await p.waitForTimeout(250);
// The model: a season of 24 rounds, the player starting two projects early and validating the parts.
console.log(await p.evaluate(async () => {
  const rd = await import('./src/game/rd.js');
  const st = rd.newRD('williams', 7), out = [];
  const errs = [rd.startProject(st, 'williams', 'floor', 'bold'), rd.startProject(st, 'williams', 'frontWing', 'balanced'), rd.startProject(st, 'williams', 'floor', 'safe')];
  out.push('start errors: ' + JSON.stringify(errs));
  const r0 = rd.rankings(st).map((r) => `${r.t.id}:${r.rating.toFixed(1)}`).join(' ');
  for (let k = 0; k < 24; k++) {
    const order = rd.rankings(st).map((r) => r.t.id);
    rd.advance(st, { standings: order, upcoming: ['monza', 'monaco'], repairs: k === 3 ? { williams: 0.7e6 } : {} });
    for (let i = 0; i < st.teams.williams.parts.length; i++) if (!st.teams.williams.parts[i].validated) rd.validate(st, 'williams', i);
    if (k % 3 === 2 && st.teams.williams.projects.length < 2) rd.startProject(st, 'williams', ['rearWingLD', 'sidepods', 'suspension', 'diffuser'][k % 4], 'balanced');
  }
  const r1 = rd.rankings(st).map((r) => `${r.t.id}:${r.rating.toFixed(1)}`).join(' ');
  out.push('start: ' + r0, 'end:   ' + r1);
  for (const id of Object.keys(st.teams)) { const T = st.teams[id]; out.push(`${id.padEnd(12)} spent ${rd.fmtM(T.spent).padStart(8)} parts ${String(T.parts.length).padStart(2)} over ${T.overspend ? 'Y' : '-'} fac ${Object.values(T.facilities).join('')}`); }
  out.push('williams parts: ' + st.teams.williams.parts.map((x) => `${x.name}(${x.verdict ?? '?'} ${x.actual?.toFixed(2)}/${x.mean.toFixed(2)})`).join(', '));
  out.push('log tail: ' + st.log.slice(-5).map((l) => l.text).join(' | '));
  out.push('factors monaco: ' + JSON.stringify(rd.playerCarFactors(st, 'monaco')) + ' fail williams ' + rd.failureChance(st, 'williams').toFixed(4));
  out.push('json size ' + JSON.stringify(st).length);
  return out.join('\n');
}));
// Eight rounds into the season (projects started and parts correlated) so every page has data.
await p.evaluate(async () => {
  const rd = await import('./src/game/rd.js'), s = window.__racer.frontend.season;
  s.rd = rd.newRD(s.team, 11);
  rd.startProject(s.rd, s.team, 'frontWing', 'bold'); rd.startProject(s.rd, s.team, 'suspension', 'balanced');
  for (let k = 0; k < 8; k++) {
    rd.advance(s.rd, { standings: rd.rankings(s.rd).map((r) => r.t.id), upcoming: ['monaco', 'spain'], repairs: k === 2 ? { [s.team]: 0.9e6 } : {} });
    if (k < 6) rd.validate(s.rd, s.team);
    if (k === 4) rd.startProject(s.rd, s.team, 'floor', 'balanced');
  }
  s.round = 8;
});
// The hub tab, every page.
for (let k = 0; k < 6; k++) {
  await p.evaluate((k) => window.__racer.frontend.go('hub', 'rd', k), k);
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/rd-${k}.png` });
}
// Design: pick a part, start it, end on the factory page.
await p.evaluate(() => window.__racer.frontend.go('hub', 'rd', 1)); await p.waitForTimeout(300);
await p.click('[data-part="diffuser"]'); await p.waitForTimeout(300);
await p.evaluate(() => document.querySelector('.rd .quote').scrollIntoView({ block: 'end' })); await p.waitForTimeout(200);
await p.screenshot({ path: `${OUT}/rd-1b.png` });
await p.click('[data-start="balanced"]'); await p.waitForTimeout(500);
console.log('after start:', await p.evaluate(() => JSON.stringify({ projects: window.__racer.frontend.season.rd.teams.williams.projects.map((x) => x.name), saved: !!JSON.parse(localStorage.getItem('tiny-f1:season')).rd })));
await p.screenshot({ path: `${OUT}/rd-2b.png` });
await p.evaluate(() => window.__racer.frontend.go('hub', 'home')); await p.waitForTimeout(500);
await p.screenshot({ path: `${OUT}/rd-home.png` });
await b.close(); server.kill();
