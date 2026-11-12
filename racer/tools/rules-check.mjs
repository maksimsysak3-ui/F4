// Dev check of the loadout (R&D) and the FIA tab, part-way through a season: screenshots into OUT.
// Usage: OUT=dir node tools/rules-check.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const OUT = process.env.OUT ?? '.';
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
p.on('pageerror', (e) => console.log('ERR', e.message, (e.stack || '').split('\n').slice(1, 3).join(' | ')));
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.addInitScript(() => localStorage.setItem('tiny-f1:season', JSON.stringify({ team: 'williams', round: 0, manager: { name: 'Max Test' }, points: {} })));
await p.goto(`http://localhost:${port}/index.html?nopost`);
for (let k = 0; k < 60 && !(await p.evaluate(() => !!window.__racer?.frontend)); k++) await p.waitForTimeout(250);
console.log(await p.evaluate(async () => {
  const fe = window.__racer.frontend, s = fe.season;
  const { ensureSeasonState } = await import('./src/game/seasonState.js'), L = await import('./src/game/loadout.js'), F = await import('./src/game/fia.js'), rd = await import('./src/game/rd.js');
  ensureSeasonState(s); s.history = [];
  const reasons = ['CAUSING A COLLISION', 'TRACK LIMITS', 'IGNORING BLUE FLAGS', 'COLLISION UNDER SAFETY CAR'];
  for (let r = 0; r < 14; r++) {
    s.history.push({ round: r + 1, track: 'monza', R: [], rc: { decisions: [0, 1].map((k) => ({ lap: 5 + k, id: ['ferrari-1', 'haas-0', 'williams-0', 'redbull-0'][(r + k) % 4], code: 'X', reason: reasons[(r * 3 + k) % 4], pen: ['t5', 't10', 'dt'][(r + k) % 3] })) } });
    rd.advance(s.rd, {});
    L.loadoutWeekend(s.loadout, { round: r, failed: r === 9 ? 'MGUK' : null });
    s.round = r + 1; F.fiaWeekend(s, r);
  }
  L.fitNew(s.loadout, 'ICE', s.round); L.fitNew(s.loadout, 'GB', s.round);
  const sp = s.rd.specs.find((x) => x.slot === 'frontWing');
  return `round ${s.round}; pens next: ${JSON.stringify(F.gridPenalties(s, s.round).slice(0, 4))}; ban: ${JSON.stringify(s.fia.bans)}`;
}));
const shot = async (name, go, arg) => { await p.evaluate(go, arg); await p.waitForTimeout(1800); await p.screenshot({ path: `${OUT}/${name}.png`, timeout: 180000 }); console.log('shot', name); };
await shot('loadout', () => window.__racer.frontend.go('hub', 'rd', 4));
await p.evaluate(() => document.querySelector('[data-order]')?.click()); await p.waitForTimeout(800);
console.log('after order:', await p.evaluate(() => document.querySelector('[data-order-err]')?.textContent || 'ok', ));
for (let k = 0; k < 5; k++) await shot(`fia-${k}`, (k) => window.__racer.frontend.go('hub', 'fia', k), k);
await p.evaluate(() => { const i = document.querySelector('[data-q]'); i.value = 'gearbox'; i.dispatchEvent(new Event('input')); }); await p.waitForTimeout(400);
console.log('search gearbox:', await p.evaluate(() => document.querySelectorAll('.rule').length));
await b.close(); server.kill();
