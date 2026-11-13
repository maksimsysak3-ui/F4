// Check: save slots (slot 1 = the old save, a new career in slot 2, switching back) and simulated
// sessions giving the player's car its times. Usage: node tools/slots-check.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('pageerror', (e) => console.log('ERR', e.message));
p.on('dialog', (d) => d.accept());
await p.addInitScript(() => { if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', 1); localStorage.setItem('tiny-f1:fav', 'ferrari'); localStorage.setItem('tiny-f1:season', JSON.stringify({ team: 'mclaren', round: 9, manager: { name: 'Max Test' }, points: {}, weekendPrefs: { length: 'short', difficulty: 90, raceLength: 'short' } })); } });
await p.goto(`http://localhost:${port}/index.html?nopost`);
for (let k = 0; k < 60; k++) { if (await p.evaluate(() => !!window.__racer?.frontend)) break; await p.waitForTimeout(500); }
await p.evaluate(() => window.__racer.frontend.go('main'));
const slotsBtn = async () => p.evaluate(() => [...document.querySelectorAll('.mm-sub button, .mm-main button')].find((x) => x.textContent.startsWith('Save slots')).click());
await slotsBtn(); await p.waitForTimeout(300);
console.log('slots', await p.evaluate(() => [...document.querySelectorAll('.board .slot')].map((x) => x.innerText.replace(/\s+/g, ' ')).join(' | ')));
await p.evaluate(() => document.querySelector('.board [data-new="2"]').click()); await p.waitForTimeout(300);
console.log('new slot 2 ->', await p.evaluate(() => JSON.stringify({ screen: window.__racer.frontend.screen, slot: localStorage.getItem('tiny-f1:slot'), season: !!window.__racer.frontend.season, s1: !!localStorage.getItem('tiny-f1:season') })));
await p.evaluate(() => { const fe = window.__racer.frontend; fe.season = { manager: { name: 'Second' }, team: 'williams', round: 0 }; fe.saveSeason(); fe.go('main'); });
await slotsBtn(); await p.waitForTimeout(300);
console.log('slots', await p.evaluate(() => [...document.querySelectorAll('.board .slot')].map((x) => x.innerText.replace(/\s+/g, ' ')).join(' | ')));
await p.evaluate(() => document.querySelector('.board [data-play="1"]').click()); await p.waitForTimeout(500);
console.log('play 1 ->', await p.evaluate(() => JSON.stringify({ screen: window.__racer.frontend.screen, team: window.__racer.frontend.season?.team, slot: localStorage.getItem('tiny-f1:slot') })));
// Simulated sessions: the player's car gets times.
await p.evaluate(() => window.__racer.frontend.go('loading'));
for (let k = 0; k < 120; k++) { if (await p.evaluate(() => window.__racer.frontend.screen) === 'garage') break; await p.waitForTimeout(500); }
for (const id of ['FP1', 'FP2', 'FP3', 'Q', 'R']) {
  await p.evaluate((id) => { window.__racer.frontend.go('monitor', 'session', id); document.querySelector('.wk [data-a="sim"]')?.click(); }, id);
  await p.waitForTimeout(500);
  console.log(id, await p.evaluate((id) => { const res = window.__racer.frontend.season.weekend.results[id], me = res.find((r) => r.id.startsWith('mclaren-0')), k = res.indexOf(me); return `P${k + 1}/${res.length} best ${me?.best?.toFixed(3) ?? me?.time} laps ${me?.laps} | top5 ${res.slice(0, 5).map((r) => r.code + ' ' + (r.best?.toFixed?.(3) ?? '-')).join(', ')} | P12 ${res[11]?.code} ${res[11]?.best?.toFixed?.(3)} | last ${res.at(-1)?.code} ${res.at(-1)?.best?.toFixed?.(3)}`; }, id));
}
await b.close(); server.kill();
