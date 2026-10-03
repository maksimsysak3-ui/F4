/**
 * Track cover art for the menu: painted on a 2D canvas from each track's
 * `cover` description: a sky gradient, a landscape silhouette with the
 * circuit's landmark, the circuit map glowing on top, a flag band and the name.
 *
 * cover: { sky: [top, horizon], ground, scene, flag: [colours], accent }
 * scenes: 'dunes' | 'hills' | 'city' | 'harbour' | 'forest' | 'gulf' | 'void'
 */
export function drawCover(canvas, track, scale = 2) {
  // Painted at `scale`× for crisp text on dense screens, laid out in 320×180-style units.
  const g = canvas.getContext('2d');
  g.setTransform(scale, 0, 0, scale, 0, 0);
  const W = canvas.width / scale, H = canvas.height / scale;
  const c = track.cover || { sky: ['#1a2238', '#3a4a6a'], ground: '#1a1d24', scene: 'void', flag: [], accent: '#ffc21a' };
  let seed = [...track.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
  const R = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  // Sky.
  const sky = g.createLinearGradient(0, 0, 0, H * 0.7);
  sky.addColorStop(0, c.sky[0]);
  sky.addColorStop(1, c.sky[1]);
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  const hz = H * 0.62; // horizon

  // Sun or moon glow.
  const glow = g.createRadialGradient(W * 0.78, hz - 28, 2, W * 0.78, hz - 28, 70);
  glow.addColorStop(0, c.sun || 'rgba(255,240,200,0.9)');
  glow.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  const poly = (pts, fill) => { g.fillStyle = fill; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
  const ground = c.ground;

  switch (c.scene) {
    case 'dunes': {
      // North Sea strip, rolling dunes, the water tower and orange tribunes.
      g.fillStyle = '#4a7a8a'; g.fillRect(0, hz - 6, W, 8);
      for (let layer = 0; layer < 3; layer++) {
        const pts = [[0, H]];
        for (let x = 0; x <= W; x += 8) pts.push([x, hz + layer * 9 + Math.sin(x * 0.03 + layer * 2) * (8 - layer * 2) + Math.sin(x * 0.011 + layer) * 6]);
        pts.push([W, H]);
        poly(pts, ['#c8b888', '#a8a870', '#7a8a50'][layer]);
      }
      g.fillStyle = '#8a4a32'; g.fillRect(W * 0.2, hz - 40, 9, 38);
      g.fillStyle = '#e8e0cc'; g.fillRect(W * 0.2 - 4, hz - 50, 17, 11);
      g.fillStyle = '#2f5a4a'; g.fillRect(W * 0.2 - 5, hz - 53, 19, 4);
      g.fillStyle = '#ff6a00'; g.fillRect(W * 0.55, hz + 2, 70, 10);
      break;
    }
    case 'hills': {
      // Texas hill country, live oaks, the observation tower with its red veil.
      poly([[0, H], [0, hz + 4], ...Array.from({ length: 41 }, (_, k) => [k * W / 40, hz + Math.sin(k * 0.5) * 5 + Math.sin(k * 0.17) * 8]), [W, H]], ground);
      for (let k = 0; k < 14; k++) { const x = R() * W, y = hz + 8 + R() * 30; g.fillStyle = '#3e5424'; g.beginPath(); g.ellipse(x, y, 7 + R() * 6, 4 + R() * 3, 0, 0, 7); g.fill(); }
      const tx = W * 0.3;
      g.strokeStyle = '#c8242b'; g.lineWidth = 1.6;
      for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(tx + k * 1.6, hz - 70); g.quadraticCurveTo(tx + k * 0.5, hz - 30, tx + k * 4, hz + 4); g.stroke(); }
      g.fillStyle = '#e8e8e4'; g.fillRect(tx - 9, hz - 76, 18, 7);
      g.fillStyle = '#c8242b'; g.beginPath(); g.ellipse(tx, hz + 4, 18, 4, 0, 0, 7); g.fill();
      break;
    }
    case 'city': {
      // São Paulo: a wall of towers around the bowl, palms in front.
      for (let k = 0; k < 40; k++) {
        const x = k * (W / 40) + R() * 4, h = 20 + R() * R() * 60, w = 5 + R() * 6;
        g.fillStyle = ['#a8a49c', '#8a8a86', '#b8b4ac', '#9a968e'][k % 4];
        g.fillRect(x, hz - h, w, h + 4);
      }
      poly([[0, H], [0, hz + 6], [W * 0.3, hz + 2], [W * 0.7, hz + 8], [W, hz + 4], [W, H]], ground);
      for (let k = 0; k < 6; k++) {
        const x = 20 + k * (W / 6) + R() * 20, top = hz - 10 - R() * 14;
        g.strokeStyle = '#b8b4ac'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, hz + 14); g.lineTo(x, top); g.stroke();
        g.strokeStyle = '#2f7a2a'; g.lineWidth = 2;
        for (let f = 0; f < 6; f++) { const a = (f / 6) * Math.PI * 2; g.beginPath(); g.moveTo(x, top); g.quadraticCurveTo(x + Math.cos(a) * 6, top - 3, x + Math.cos(a) * 10, top + 4); g.stroke(); }
      }
      break;
    }
    case 'harbour': {
      // Riviera: pastel houses climbing the hill, the sea, the lighthouse.
      poly([[0, hz + 10], [W * 0.25, hz - 34], [W * 0.5, hz - 20], [W * 0.75, hz - 42], [W, hz - 10], [W, hz + 10]], '#7a6a6a');
      for (let k = 0; k < 30; k++) {
        const x = R() * W * 0.8, y = hz - 8 - R() * 22;
        g.fillStyle = ['#e8c8a0', '#d8a888', '#f2e2c8', '#c88a6a', '#e8d0b0'][k % 5];
        g.fillRect(x, y, 7 + R() * 6, 6 + R() * 6);
      }
      g.fillStyle = '#2a5a7a'; g.fillRect(0, hz + 4, W, H - hz);
      g.fillStyle = '#f2efe8'; g.fillRect(W * 0.85, hz - 26, 6, 30);
      g.fillStyle = '#c8242b'; g.fillRect(W * 0.85, hz - 16, 6, 5);
      g.fillStyle = '#ffd890'; g.fillRect(W * 0.85, hz - 30, 6, 4);
      break;
    }
    case 'forest': {
      // Snowy peaks over a spruce forest.
      for (const [x, h, w] of [[0.2, 52, 70], [0.5, 66, 90], [0.82, 48, 70]]) {
        poly([[W * x - w, hz], [W * x, hz - h], [W * x + w, hz]], '#8a9aa8');
        poly([[W * x - w * 0.28, hz - h * 0.72], [W * x, hz - h], [W * x + w * 0.28, hz - h * 0.72]], '#f2f4f6');
      }
      g.fillStyle = ground; g.fillRect(0, hz, W, H - hz);
      for (let k = 0; k < 40; k++) {
        const x = R() * W, y = hz + R() * 26, h = 12 + R() * 14;
        poly([[x - h * 0.3, y], [x, y - h], [x + h * 0.3, y]], ['#1f3d2c', '#24482f', '#2b5234'][k % 3]);
      }
      break;
    }
    case 'gulf': {
      // Night desert venue: dunes, the observation wheel, light poles, a glowing sky.
      poly([[0, H], [0, hz], [W * 0.4, hz - 6], [W, hz + 2], [W, H]], ground);
      g.strokeStyle = '#7df9ff'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(W * 0.25, hz - 30, 26, 0, Math.PI * 2); g.stroke();
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.beginPath(); g.moveTo(W * 0.25, hz - 30); g.lineTo(W * 0.25 + Math.cos(a) * 26, hz - 30 + Math.sin(a) * 26); g.stroke(); }
      for (let k = 0; k < 9; k++) { const x = W * 0.45 + k * 18; g.fillStyle = '#e8e8f0'; g.fillRect(x, hz - 34, 1.5, 34); g.fillStyle = '#fff6d8'; g.fillRect(x - 3, hz - 36, 7, 2); }
      break;
    }
    default: {
      g.fillStyle = ground; g.fillRect(0, hz, W, H - hz);
      for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(255,255,255,${R() * 0.8})`; g.fillRect(R() * W, R() * hz, 1.2, 1.2); }
    }
  }

  // Shade the lower half for the text, then the circuit map glowing top-right.
  const shade = g.createLinearGradient(0, H * 0.45, 0, H);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.75)');
  g.fillStyle = shade;
  g.fillRect(0, 0, W, H);
  const pts = track.minimap ? track.minimap() : [];
  if (pts.length) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const bw = W * 0.44, bh = H * 0.46, s = Math.min(bw / (x1 - x0 || 1), bh / (z1 - z0 || 1));
    const ox = W - 10 - bw + (bw - (x1 - x0) * s) / 2, oz = 10 + (bh - (z1 - z0) * s) / 2;
    g.lineJoin = 'round';
    for (const [w, col] of [[6, 'rgba(0,0,0,0.55)'], [3, '#ffffff']]) {
      g.beginPath();
      pts.forEach(([x, z], k) => { const px = ox + (x - x0) * s, pz = oz + (z - z0) * s; if (k) g.lineTo(px, pz); else g.moveTo(px, pz); });
      g.closePath();
      g.lineWidth = w;
      g.strokeStyle = col;
      g.stroke();
    }
    const [sx, sz] = pts[0];
    g.fillStyle = c.accent;
    g.beginPath(); g.arc(ox + (sx - x0) * s, oz + (sz - z0) * s, 4, 0, 7); g.fill();
  }

  // Flag band and title.
  const fl = c.flag || [];
  fl.forEach((col, k) => { g.fillStyle = col; g.fillRect(12 + k * 9, H - 47, 9, 6); });
  g.fillStyle = '#ffffff';
  g.font = 'italic 900 19px "Arial Black", Arial, sans-serif';
  g.fillText(track.coverTitle || track.name.toUpperCase(), 12, H - 21);
  g.fillStyle = c.accent;
  g.font = '700 12px Arial, sans-serif';
  g.fillText(`${track.country ? track.country.toUpperCase() + ' · ' : ''}${(track.length / 1000).toFixed(2)} KM`, 12, H - 6);
}
