import { CanvasTexture, SRGBColorSpace, MeshStandardMaterial, DoubleSide } from 'three';
import { MeshBuilder } from '../../car/meshBuilder.js?v=b8df018';
import { Frame, rgb } from '../street/kit.js?v=b8df018';

/*
 * Official timing boards by the start line: big green-and-gold rectangles on
 * posts, a crown emblem and a live digital clock (time of day, like the real
 * thing), redrawn once a second.
 */
const GREEN = '#006039', GOLD = '#c8a24b';

function draw(g, W, H) {
  g.fillStyle = GREEN; g.fillRect(0, 0, W, H);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,255,255,0.12)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = GOLD; g.lineWidth = 10; g.strokeRect(8, 8, W - 16, H - 16);
  const cx = W * 0.5, cy = H * 0.2, s = H * 0.09;
  g.fillStyle = GOLD; g.beginPath();
  g.moveTo(cx - s * 1.6, cy + s * 0.8); g.lineTo(cx - s * 1.6, cy - s * 0.3);
  for (let k = 0; k < 5; k++) { const x = cx - s * 1.6 + (k + 0.5) * (s * 3.2 / 5); g.lineTo(x, cy - s * (k % 2 ? 0.6 : 1.1)); g.lineTo(x + s * 0.32, cy - s * 0.2); }
  g.lineTo(cx + s * 1.6, cy - s * 0.3); g.lineTo(cx + s * 1.6, cy + s * 0.8); g.closePath(); g.fill();
  g.font = `700 ${Math.round(H * 0.1)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('ROLEX', cx, H * 0.36);
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  g.fillStyle = '#062a1c'; g.fillRect(W * 0.08, H * 0.46, W * 0.84, H * 0.44);
  g.font = `700 ${Math.round(H * 0.36)}px "Courier New", monospace`; g.fillStyle = '#f4f0e0';
  g.fillText(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`, cx, H * 0.69);
}

export function timingBoards(L, kit, terrain, group) {
  const W = 1024, H = 512, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  draw(g, W, H);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  const mb = new MeshBuilder();
  let n = 0;
  for (const [s, side] of [[60, 'L'], [-90, 'R'], [L.length * 0.5, 'L']]) {
    const ss = ((s % L.length) + L.length) % L.length;
    const fr = kit.frontage(ss, side, 1.5);
    if (!kit.isFree(fr.x, fr.z, 0.5)) continue;
    const y = terrain.heightAt(fr.x, fr.z);
    const F = new Frame(kit.builderAt(fr.x, fr.z), fr.x, y, fr.z, fr.dirZ, -fr.dirX); // facing the track
    const bw = 12, bh = 6, y0 = 6;
    for (const a of [-bw / 2 + 1, bw / 2 - 1]) F.box('metal', a - 0.35, a + 0.35, 0, y0, -0.6, 0.1, rgb(0x2a2c30));
    F.box('trim', -bw / 2 - 0.4, bw / 2 + 0.4, y0 - 0.4, y0 + bh + 0.4, -1.0, -0.2, rgb(0xc9a24a));
    const T = new Frame(mb, fr.x, y, fr.z, fr.dirZ, -fr.dirX);
    const p = [T.at(-bw / 2, y0, -0.18), T.at(bw / 2, y0, -0.18), T.at(bw / 2, y0 + bh, -0.18), T.at(-bw / 2, y0 + bh, -0.18)];
    mb.quadUV('board', p[0], p[1], p[2], p[3], [0, 0], [1, 0], [1, 1], [0, 1]);
    n++;
  }
  group.add(mb.build({ board: new MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.6, roughness: 0.5, side: DoubleSide }) }));
  let t = 0, last = -1;
  return {
    count: n,
    update(dt) {
      t += dt;
      const sec = new Date().getSeconds();
      if (sec !== last && t > 0.2) { last = sec; t = 0; draw(g, W, H); tex.needsUpdate = true; }
    },
  };
}
