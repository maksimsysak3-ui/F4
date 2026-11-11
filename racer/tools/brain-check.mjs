// Dev check of the built-in engineer: corner detection on a real layout, the lap analysis on a
// synthetic lap (slow at one corner), and answers to a range of questions. Usage: node tools/brain-check.mjs [track]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 200, height: 120 } });
p.on('pageerror', (e) => console.log('ERR', e.message));
const track = process.argv[2] ?? 'austria';
await p.goto(`http://localhost:${port}/index.html?autostart&nopost&track=${track}`);
for (let k = 0; k < 120; k++) { if (await p.evaluate((t) => window.__racer?.track?.id === t && window.__racer.started, track)) break; await p.waitForTimeout(500); }
const out = await p.evaluate(async () => {
  const { EngineerBrain, cornersOf } = await import('./src/engineerBrain.js');
  const L = window.__racer.track.layout, cs = cornersOf(L);
  // A reference lap from a simple speed profile (slower where the track bends), and a "last lap" that
  // brakes ~40 m early and carries less speed into one slow corner.
  const n = Math.floor(L.length / 10), v = [];
  for (let i = 0; i < n; i++) { let k = 0; for (let d = 0; d < 12; d++) k = Math.max(k, Math.abs(L.k[Math.floor(((i * 10 + d * 10) / L.ds)) % L.N])); v.push(Math.min(85, Math.sqrt(30 / Math.max(k, 1e-4)))); }
  const ref = [0]; for (let i = 0; i < n; i++) ref.push(ref[i] + 10 / v[i]);
  const target = cs.filter((c) => c.kind === 'slow' || c.kind === 'hairpin')[1] ?? cs[2];
  const a = Math.round(target.s / 10), trace = [0];
  for (let i = 0; i < n; i++) { const early = i >= a - 9 && i < a - 3 ? 0.8 : i >= a - 3 && i < a + 3 ? 0.9 : 1; trace.push(trace[i] + 10 / (v[i] * early)); }
  const ctx = { track: 'Test', layout: L, wetness: 0, weather: 'Sunny', compound: 'S', speed: 212, gear: 6, best: ref[n], bestSectors: [22, 23, 21.5],
    last: { time: trace[n], sectors: [22.1, 23.6, 21.6], trace, ref, valid: true }, fastestSectors: [21.8, 23.0, 21.4],
    session: { name: 'Qualifying', label: 'Q1', remaining: '3 min 20 s', state: 'green' }, sessionType: 'quali', remainingSec: 200,
    position: 17, cars: 22, cutLine: 16, cutTime: ref[n] - 0.12, cutCode: 'ALB', leader: { code: 'VER', time: ref[n] - 0.8 }, gap: 0.8,
    ahead: { code: 'ALB', time: ref[n] - 0.12 }, behind: { code: 'BOT', time: ref[n] + 0.2 }, behindGap: 0.2, forecast: 'next few minutes sunny (5% chance of rain)' };
  const brain = new EngineerBrain();
  const qs = ['radio check', 'where am I losing time?', 'how do I go faster', 'and sector 2?', 'what about sector 3', 'am I safe?', 'gap to the car ahead', 'who is behind me', 'how was that lap', 'tyres ok?', 'is it going to rain', 'should I box', 'what should I do now', 'how long left', 'this car is undriveable', 'turn ' + target.n, 'who is fastest', 'what is my best lap', 'banana', 'thanks'];
  return { corners: cs.length, target: `${target.n} ${target.kind} ${Math.round(target.s)}m`, answers: qs.map((q) => `> ${q}\n  ${brain.answer(q, ctx)}`) };
});
console.log(`corners found: ${out.corners}, slowed corner: ${out.target}`);
console.log(out.answers.join('\n'));
await b.close(); server.kill();
