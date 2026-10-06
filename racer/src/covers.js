/**
 * Track cover art for the menu: painted on a 2D canvas from each track's
 * `cover` description: a sky gradient, a landscape silhouette with the
 * circuit's landmark, the circuit map glowing on top, a flag band and the name.
 *
 * cover: { sky: [top, horizon], ground, scene, flag: [colours], accent }
 * scenes: 'dunes' | 'hills' | 'city' | 'harbour' | 'forest' | 'gulf' | 'void'
 */
export function drawCover(canvas, track, scale = 2, { bare = false } = {}) {
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
    case 'miami': {
      // The stadium bowl under its canopy, palms, pink and teal.
      g.fillStyle = ground; g.fillRect(0, hz, W, H - hz);
      g.fillStyle = '#d8d8d4'; g.beginPath(); g.ellipse(W * 0.32, hz - 4, 70, 22, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#2a7ab8'; g.beginPath(); g.ellipse(W * 0.32, hz - 4, 58, 16, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#f4f4f0'; g.fillRect(W * 0.32 - 74, hz - 34, 148, 5);
      for (const x of [-64, 64]) g.fillRect(W * 0.32 + x - 2, hz - 44, 4, 40);
      for (let k = 0; k < 9; k++) {
        const x = 16 + k * 36 + R() * 10, top = hz - 14 - R() * 22;
        g.strokeStyle = '#8a7a62'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, hz + 14); g.quadraticCurveTo(x + 3, (top + hz) / 2, x + 2, top); g.stroke();
        g.strokeStyle = '#2f8a3a'; for (let f = 0; f < 7; f++) { const a = (f / 7) * Math.PI * 2; g.beginPath(); g.moveTo(x + 2, top); g.quadraticCurveTo(x + 2 + Math.cos(a) * 7, top - 3, x + 2 + Math.cos(a) * 12, top + 5); g.stroke(); }
      }
      g.fillStyle = '#ff4fa0'; g.fillRect(0, hz + 18, W, 3); g.fillStyle = '#2ad4e0'; g.fillRect(0, hz + 22, W, 3);
      break;
    }
    case 'monaco': {
      // The hillside town in pastel rising over the harbour, yachts on blue water.
      g.fillStyle = '#7a8a6a';
      g.beginPath(); g.moveTo(0, hz - 30); g.lineTo(W * 0.3, hz - 70); g.lineTo(W * 0.6, hz - 54); g.lineTo(W, hz - 80); g.lineTo(W, hz + 10); g.lineTo(0, hz + 10); g.fill();
      for (let k = 0; k < 70; k++) {
        const x = R() * W, y = hz - 6 - R() * 46 * (0.4 + x / W * 0.6);
        g.fillStyle = ['#f2dcb0', '#e8b890', '#f4ece0', '#d8908a', '#f0d2a8', '#e8e4dc'][k % 6];
        g.fillRect(x, y, 6 + R() * 8, 5 + R() * 9);
      }
      g.fillStyle = '#1e5a7a'; g.fillRect(0, hz + 4, W, H - hz);
      for (let k = 0; k < 9; k++) { const x = 14 + k * 34 + R() * 10; g.fillStyle = '#f4f4f2'; g.fillRect(x, hz + 8 + (k % 3) * 6, 18, 4); g.fillRect(x + 5, hz + 5 + (k % 3) * 6, 8, 3); }
      break;
    }
    case 'plains': {
      // Hungarian plain: sunflower and wheat strips, a row of poplars, Budapest's Parliament far off.
      g.fillStyle = '#b8b2a0'; g.fillRect(W * 0.08, hz - 14, 70, 14);
      g.beginPath(); g.arc(W * 0.08 + 35, hz - 14, 10, Math.PI, 0); g.fill();
      g.fillRect(W * 0.08 + 33, hz - 34, 4, 12);
      for (let k = 0; k < 7; k++) { g.fillRect(W * 0.08 + 4 + k * 10, hz - 22, 2, 8); }
      const strips = ['#e8c21a', '#d8b860', '#7a9a3a', '#e8c21a', '#c8a850'];
      for (let k = 0; k < 5; k++) poly([[0, hz + k * 12], [W, hz + k * 12 - 6], [W, hz + (k + 1) * 12 - 6], [0, hz + (k + 1) * 12]], strips[k]);
      g.fillStyle = ground; g.fillRect(0, hz + 60, W, H);
      for (let k = 0; k < 16; k++) { const x = W * 0.45 + k * 10; g.fillStyle = '#3e5a26'; g.beginPath(); g.ellipse(x, hz - 12, 3.5, 13, 0, 0, 7); g.fill(); }
      break;
    }
    case 'mesa': {
      // Red mesas and a butte against the golden sky, saguaros on the sand.
      for (const [x, w, h] of [[0.12, 90, 48], [0.55, 120, 64], [0.88, 60, 40]]) {
        poly([[W * x - w / 2 - 14, hz + 4], [W * x - w / 2, hz - h], [W * x + w / 2, hz - h], [W * x + w / 2 + 14, hz + 4]], '#a8482a');
        for (let k = 1; k < 4; k++) { g.fillStyle = k % 2 ? 'rgba(255,200,150,0.18)' : 'rgba(80,20,10,0.18)'; g.fillRect(W * x - w / 2 - k * 3, hz - h + k * h / 4, w + k * 6, h / 8); }
      }
      g.fillStyle = ground; g.fillRect(0, hz, W, H - hz);
      for (let k = 0; k < 7; k++) {
        const x = 20 + k * (W / 7) + R() * 20, top = hz - 6 - R() * 18;
        g.fillStyle = '#3e6a32'; g.fillRect(x - 2, top, 4, hz + 16 - top);
        g.fillRect(x - 8, top + 10, 6, 3); g.fillRect(x - 8, top + 3, 3, 9); g.fillRect(x + 2, top + 14, 6, 3); g.fillRect(x + 5, top + 6, 3, 10);
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

  if (bare) return; // pack tiles carry their own title
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
