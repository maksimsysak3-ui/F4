import { chromium } from 'playwright';
import * as P from '../src/tracks/real/points.js';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1150, height: 720 } });
for (const [name, pts] of Object.entries(P)) {
  await page.setContent(`<canvas id=c width=1150 height=720 style="background:#fff"></canvas>`);
  await page.evaluate((pts) => {
    const g = document.getElementById('c').getContext('2d');
    g.lineWidth = 3; g.strokeStyle = '#333'; g.beginPath();
    pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
    g.font = '11px sans-serif';
    pts.forEach(([x, y], k) => { g.fillStyle = k === 0 ? '#e00' : '#06c'; g.beginPath(); g.arc(x, y, k === 0 ? 6 : 3, 0, 7); g.fill(); g.fillText(k, x + 5, y - 4); });
    // direction arrow P0 -> P1
    const [a, b] = [pts[0], pts[1]]; g.strokeStyle = '#e00'; g.lineWidth = 5; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(a[0] + (b[0] - a[0]) * 0.4, a[1] + (b[1] - a[1]) * 0.4); g.stroke();
  }, pts);
  await page.screenshot({ path: `/tmp/claude-0/-home-user-F4/952c04d6-41b9-5ae7-863c-2ea1f3d18b99/scratchpad/plot_${name}.png` });
}
await browser.close();
