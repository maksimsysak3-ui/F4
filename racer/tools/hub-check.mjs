// Dev check of the season hub, six rounds into a season: every tab and its pages (screenshots into OUT).
// Usage: OUT=dir node tools/hub-check.mjs
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
await p.addInitScript(() => { localStorage.setItem('tiny-f1:fav', 'ferrari'); localStorage.setItem('tiny-f1:season', JSON.stringify({ team: 'mclaren', round: 0, manager: { name: 'Max Test' }, points: {} })); });
await p.goto(`http://localhost:${port}/index.html?nopost`);
for (let k = 0; k < 60 && !(await p.evaluate(() => !!window.__racer?.frontend)); k++) await p.waitForTimeout(250);
console.log(await p.evaluate(async () => {
  const rd = await import('./src/game/rd.js'), staffM = await import('./src/game/staff.js'), { TEAMS } = await import('./src/front/teams.js'), { CALENDAR } = await import('./src/front/hub.js');
  const s = window.__racer.frontend.season, me = 'Max Test';
  s.rd = rd.newRD(s.team, 5); s.staff = staffM.newStaff(s.team, 9); s.staff.team = s.team; s.points = {}; s.history = [];
  rd.startProject(s.rd, s.team, 'floor', { ...rd.defaultPlan(s.rd, 'floor'), dir: [0.8, 0.6] });
  const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
  for (let r = 0; r < 6; r++) {
    const field = TEAMS.flatMap((t) => t.drivers.map((d, k) => ({ n: t.id === s.team && k === 0 ? me : d.name, t: t.id, v: rd.trackRating(s.rd, t.id, CALENDAR[r][0]) + Math.random() * 2.2 })));
    field.sort((a, b) => b.v - a.v);
    const R = field.map((x, k) => { const dnf = Math.random() < 0.06; return [x.n, k + 1, Math.max(1, k + 1 + Math.round((Math.random() - 0.5) * 6)), dnf ? 1 : 0, dnf ? 0 : POINTS[k] ?? 0, x.t]; });
    for (const x of R) s.points[x[0]] = (s.points[x[0]] ?? 0) + x[4];
    s.history.push({ round: r, track: CALENDAR[r][0], R, rc: { periods: r % 2 ? [{ kind: 'SC', from: 4, to: 6 }] : [], decisions: r === 2 ? [{ lap: 7, id: 'mclaren-0', code: 'MAX', pen: 't5', reason: 'CAUSING A COLLISION' }, { lap: 12, id: 'ferrari-1', code: 'HAM', pen: 't5', reason: 'TRACK LIMITS' }, { lap: 20, id: 'redbull-0', code: 'VER', pen: 't10', reason: 'UNSAFE RELEASE' }] : [] } });
    rd.advance(s.rd, { standings: rd.rankings(s.rd).map((x) => x.t.id), upcoming: CALENDAR.slice(r + 1, r + 4).map((c) => c[0]) });
    rd.validate(s.rd);
    staffM.staffWeekend(s.staff, { pos: R.find((x) => x[0] === me)[1], round: r + 1 });
  }
  s.round = 6;
  return 'season ready: ' + Object.entries(s.points).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, v]) => `${n} ${v}`).join(', ');
}));
const shot = async (name, go, wait = 1500, arg) => { await p.evaluate(go, arg); await p.waitForTimeout(wait); await p.screenshot({ path: `${OUT}/${name}.png`, timeout: 180000 }); console.log('shot', name); };
await shot('home', () => window.__racer.frontend.go('hub', 'home'), 3500);
await shot('news', () => window.__racer.frontend.go('hub', 'news'), 4000);
await p.evaluate(() => document.querySelector('.hub-page').scrollTo(0, 560)); await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}/news-wall.png`, timeout: 180000 }); console.log('shot news-wall');
await p.evaluate(() => document.querySelector('.nw .lead')?.click()); await p.waitForTimeout(2500); await p.screenshot({ path: `${OUT}/news-read.png`, timeout: 180000 }); console.log('shot news-read');
await p.evaluate(() => { document.querySelector('.nw [data-back]')?.click(); }); await p.waitForTimeout(600);
await p.evaluate(() => { document.querySelector('.nw .chips [data-kind="transfer"]')?.click(); }); await p.waitForTimeout(2500); await p.screenshot({ path: `${OUT}/news-transfers.png`, timeout: 180000 }); console.log('shot news-transfers');
for (let k = 0; k < 4; k++) await shot(`team-${k}`, (k) => window.__racer.frontend.go('hub', 'team', k), 1200, k);
await shot('rd-3', () => window.__racer.frontend.go('hub', 'rd', 3), 3500);
await b.close(); server.kill();
