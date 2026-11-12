// Dev check of the R&D model (a whole season, AI and player) and the hub tab's pages (screenshots into OUT).
// Usage: OUT=dir node tools/rd-check.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const OUT = process.env.OUT ?? '.';
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('pageerror', (e) => console.log('ERR', e.message, (e.stack || '').split('\n').slice(1, 3).join(' | ')));
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.addInitScript(() => {
  localStorage.setItem('tiny-f1:fav', 'mclaren');
  localStorage.setItem('tiny-f1:season', JSON.stringify({ team: 'williams', round: 0, manager: { name: 'Max Test' }, points: {} }));
});
await p.goto(`http://localhost:${port}/index.html?nopost`);
for (let k = 0; k < 60 && !(await p.evaluate(() => !!window.__racer?.frontend)); k++) await p.waitForTimeout(250);
// The model over a season: the player designs a floor and a low-drag rear wing early, validates, crashes once.
console.log(await p.evaluate(async () => {
  const rd = await import('./src/game/rd.js');
  const st = rd.newRD('williams', 7), out = [], me = 'williams';
  const plan = (slot, dir) => ({ ...rd.defaultPlan(st, slot), dir });
  out.push('start: ' + JSON.stringify([rd.startProject(st, me, 'floor', plan('floor', [0.8, 0.6])), rd.startProject(st, me, 'rearWing', plan('rearWing', [0.1, 0.3])), rd.startProject(st, me, 'frontWing', plan('frontWing', [0.5, 0.5]))]));
  const q = rd.quote(st, me, 'frontWing', rd.defaultPlan(st, 'frontWing'));
  out.push(`quote FW: mean ${q.mean.toFixed(2)} range ${q.lo.toFixed(2)}..${q.hi.toFixed(2)} cost ${rd.fmtM(q.cost)} rounds ${q.designRounds}+${q.makeRounds}`);
  const r0 = rd.rankings(st).map((r) => `${r.t.id}:${r.rating.toFixed(1)}`).join(' ');
  for (let k = 0; k < 24; k++) {
    rd.advance(st, { standings: rd.rankings(st).map((r) => r.t.id), upcoming: ['monza', 'monaco', 'spa'], broken: k === 5 ? { floor: true, frontWing: true } : {} });
    for (let v = rd.validate(st); v; v = rd.validate(st));
    const free = rd.SLOT_IDS.filter((s) => !st.teams[me].projects.some((x) => x.slot === s) && s !== 'pu');
    if (st.teams[me].projects.length < 2) rd.startProject(st, me, free[k % free.length], plan(free[k % free.length], [Math.random(), Math.random()]));
  }
  out.push('start: ' + r0, 'end:   ' + rd.rankings(st).map((r) => `${r.t.id}:${r.rating.toFixed(1)}`).join(' '));
  for (const id of Object.keys(st.teams)) { const T = st.teams[id]; out.push(`${id.padEnd(12)} spent ${rd.fmtM(T.spent).padStart(8)} over ${T.overspend ? 'Y' : '-'} exp ${Object.values(T.expertise).map((e) => e.toFixed(2)).join(' ')}`); }
  out.push('williams specs: ' + st.specs.filter((s) => s.n).map((s) => `${s.name}(${s.validated ? Math.round(s.factor * 100) + '%' : '?'} c${s.copies})`).join(' '));
  out.push('monza best fit: ' + JSON.stringify(rd.bestFit(st, 'monza')) + ' | monaco: ' + JSON.stringify(rd.bestFit(st, 'monaco')));
  out.push('log tail: ' + st.log.slice(-4).map((l) => l.text).join(' | '));
  out.push('json size ' + JSON.stringify(st).length);
  return out.join('\n');
}));
// The hub pages, eight rounds in.
await p.evaluate(async () => {
  const rd = await import('./src/game/rd.js'), s = window.__racer.frontend.season;
  s.rd = rd.newRD(s.team, 11);
  rd.startProject(s.rd, s.team, 'frontWing', { ...rd.defaultPlan(s.rd, 'frontWing'), dir: [0.8, 0.7] });
  rd.startProject(s.rd, s.team, 'suspension', { ...rd.defaultPlan(s.rd, 'suspension'), dir: [0.7, 0.4] });
  for (let k = 0; k < 6; k++) { rd.advance(s.rd, { standings: rd.rankings(s.rd).map((r) => r.t.id), upcoming: ['monaco', 'catalunya'] }); if (k < 4) rd.validate(s.rd); if (k === 3) rd.startProject(s.rd, s.team, 'rearWing', { ...rd.defaultPlan(s.rd, 'rearWing'), dir: [0.15, 0.3] }); }
  s.round = 6;
});
for (let k = 0; k < 7; k++) {
  await p.evaluate((k) => window.__racer.frontend.go('hub', 'rd', k), k);
  await p.waitForTimeout(k === 0 || k === 1 || k === 3 ? 2500 : 700);
  await p.screenshot({ path: `${OUT}/rd-${k}.png`, timeout: 180000 });
  console.log('page', k);
}
await p.evaluate(() => window.__racer.frontend.go('hub', 'rd', 1)); await p.waitForTimeout(1500);
await p.evaluate(() => { const el = document.querySelector('.rd .bpbox'); el?.scrollIntoView({ block: 'center' }); });
await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/rd-1b.png`, timeout: 180000 });
await b.close(); server.kill();
