// Dev helper: scene build time for tracks. Usage: node tools/buildtime.mjs cota,interlagos [off]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const [tracks = 'cota', off] = process.argv.slice(2);
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  for (const t of tracks.split(',')) {
    const page = await browser.newPage();
    if (off) await page.addInitScript(() => { globalThis.__noTS = true; });
    const done = new Promise((res) => page.on('console', (m) => { const k = m.text().match(/^\[(.+?)\] built in (\d+) ms/); if (k) res(`${t}: ${k[2]} ms`); }));
    await page.goto(`http://localhost:${port}/index.html?autostart&track=${t}`);
    console.log(await Promise.race([done, new Promise((r) => setTimeout(() => r(`${t}: timeout`), 120000))]));
    await page.close();
  }
} finally { await browser.close(); server.kill(); }
