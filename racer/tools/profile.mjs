// Dev helper: CPU profile of a track load; prints the top self-time functions.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const [t = 'interlagos'] = process.argv.slice(2);
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
  await cdp.send('Profiler.start');
  const done = new Promise((res) => page.on('console', (m) => { if (/built in/.test(m.text())) res(); }));
  await page.goto(`http://localhost:${port}/index.html?autostart&track=${t}`);
  await done;
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(), dt = new Map();
  const ids = new Map(profile.nodes.map((n) => [n.id, n]));
  for (let k = 0; k < profile.samples.length; k++) { const id = profile.samples[k]; dt.set(id, (dt.get(id) || 0) + (profile.timeDeltas[k] || 0)); }
  for (const [id, us] of dt) { const n = ids.get(id), cf = n.callFrame; const key = `${cf.functionName || '(anon)'} ${cf.url.split('/').slice(-1)[0]}:${cf.lineNumber + 1}`; self.set(key, (self.get(key) || 0) + us); }
  for (const [k, us] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 18)) console.log((us / 1000).toFixed(0).padStart(6), 'ms', k);
} finally { await browser.close(); server.kill(); }
