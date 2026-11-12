// Dev check: on each permanent circuit, list anything standing in the run-off (between the kerb and
// 3 m short of the barrier): props, trees, stands, posts that the wider escape areas now overlap.
// Usage: node tools/runoff-props.mjs [trackId...]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const ALL = ['austria', 'bahrain', 'catalunya', 'china', 'cota', 'hungaroring', 'interlagos', 'mexico', 'monza', 'qatar', 'silverstone', 'spa', 'suzuka', 'yas', 'zandvoort'];
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
const port = 8000 + Math.floor(Math.random() * 900);
const server = spawn(process.execPath, ['tools/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let total = 0;
for (const t of ids) {
  const p = await b.newPage({ viewport: { width: 160, height: 100 } });
  let done = false;
  p.on('pageerror', (e) => console.log(t, 'ERR', e.message));
  p.on('console', (m) => { if (m.text().includes('built in')) done = true; });
  await p.goto(`http://localhost:${port}/index.html?autostart&track=${t}`);
  for (let k = 0; k < 120 && !done; k++) await p.waitForTimeout(500);
  const out = await p.evaluate(() => {
    const R = window.__racer, L = R.track.layout, hits = {};
    const v = { x: 0, y: 0, z: 0 };
    const e = (m) => m.elements;
    const apply = (m, x, y, z) => { const a = e(m); const w = 1 / (a[3] * x + a[7] * y + a[11] * z + a[15]); v.x = (a[0] * x + a[4] * y + a[8] * z + a[12]) * w; v.y = (a[1] * x + a[5] * y + a[9] * z + a[13]) * w; v.z = (a[2] * x + a[6] * y + a[10] * z + a[14]) * w; };
    const mul = (A, B) => { const a = e(A), bb = e(B), r = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * bb[i * 4 + k]; r[i * 4 + j] = s; } return { elements: r }; };
    R.scene.updateMatrixWorld(true);
    const test = (label, m) => {
      const nn = L.nearest(v.x, v.z);
      if (!nn) return;
      const side = nn.lateral > 0 ? 'L' : 'R', a = Math.abs(nn.lateral);
      let w = Infinity; for (let d = -4; d <= 5; d++) w = Math.min(w, L.wall[side][(nn.i + d + L.N) % L.N]); // the barrier's closest point nearby (it steps in and out at corners)
      if (w - L.edge < 8 || L.noWall?.[side][nn.i] || a < L.edge + 1.5 || a > w - 3) return;
      const h = v.y - L.heightAt(v.x, v.z);
      if (h < 0.3 || h > 30) return;
      const k = `${label}${h > 3 ? ' (high)' : ''}`; const H = (hits[k] ??= { n: 0, at: [], lo: 99, hi: 0 }); H.n++; H.lo = Math.min(H.lo, h); H.hi = Math.max(H.hi, h);
      if (H.at.length < 3) H.at.push(`s=${Math.round(nn.s)} ${side} ${a.toFixed(0)}/${w.toFixed(0)}m @${v.x.toFixed(0)},${v.z.toFixed(0)}`);
    };
    R.scene.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.position || !o.visible) return;
      if (o.parent && R.car && (o === R.car || R.car.group?.getObjectById?.(o.id))) return;
      const chain = []; for (let q = o; q && q !== R.scene && chain.length < 4; q = q.parent) if (q.name) chain.push(q.name);
      const mt = [o.material].flat()[0];
      const label = `${chain.join('<') || `mesh(${mt?.type} ${mt?.color?.getHexString?.()} map:${!!mt?.map} v${o.geometry.attributes.position.count}${o.isInstancedMesh ? ' inst' + o.count : ''})`}`;
      const pos = o.geometry.attributes.position, n = pos.count, step = Math.max(1, Math.floor(n / 4000));
      const mats = o.isInstancedMesh ? Array.from({ length: o.count }, (_, i) => { const m = { elements: Array.from(o.instanceMatrix.array.slice(i * 16, i * 16 + 16)) }; return mul(o.matrixWorld, m); }) : [o.matrixWorld];
      for (const M of mats) for (let i = 0; i < n; i += o.isInstancedMesh ? Math.max(1, Math.floor(n / 6)) : step) { apply(M, pos.getX(i), pos.getY(i), pos.getZ(i)); test(label, M); }
    });
    return hits;
  });
  // Only what stands on the ground counts (an overhanging roof, canopy or bridge deck is above the cars).
  const keys = Object.keys(out).filter((k) => out[k].lo < 4);
  total += keys.length;
  console.log(`${t}: ${keys.length ? '' : 'clear'}`);
  for (const k of keys) console.log(`   ${k}  ×${out[k].n}  h ${out[k].lo.toFixed(1)}-${out[k].hi.toFixed(1)}m  ${out[k].at.join(' | ')}`);
  await p.close();
}
await b.close(); server.kill();
console.log(total ? `${total} object groups standing in run-offs` : 'all run-offs clear');
