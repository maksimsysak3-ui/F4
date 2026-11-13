// Dev screenshots of a circuit from free cameras. Usage:
//   OUT=dir VIEWS='[["name", point, lateral, height, back]]' node tools/shot.mjs <track>
// Each view looks at layout point `point` (offset `lateral` m) from `back` m behind it, `height` m up.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const track = process.argv[2];
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 800, height: 450 } });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto(`http://localhost:${port}/index.html?autostart&nopost&track=${track}`);
for (let k = 0; k < 120; k++) { if (await p.evaluate((t) => window.__racer?.started && window.__racer.track?.id === t, track)) break; await p.waitForTimeout(500); }
await p.addStyleTag({ content: '.hud,#hud,#wheel,#tower,#laps,#minimap,#topright,#toast{display:none!important}' });
await p.waitForTimeout(1500);
for (const [name, pt, lat, h, back, lookLat = lat] of JSON.parse(process.env.VIEWS)) {
  await p.evaluate(([pt, lat, h, back, lookLat]) => { const L = window.__racer.track.layout; const s = typeof pt === 'object' ? pt.s : L.pointS(pt); const sa = ((s - back) % L.length + L.length) % L.length, a = L.poseAt(sa, lat), c = L.poseAt(s, lookLat), ya = L.yAt(Math.floor(sa / L.ds), 0), yc = L.yAt(Math.floor(s / L.ds), 0); window.__freeCam = [[a.x, ya + h, a.z], [c.x, yc + 1, c.z]]; }, [pt, lat, h, back, lookLat]);
  await p.waitForTimeout(4000);
  await p.screenshot({ path: `${process.env.OUT}/${name}.png`, timeout: 120000 });
  console.log('shot', name);
}
await b.close(); server.kill();
