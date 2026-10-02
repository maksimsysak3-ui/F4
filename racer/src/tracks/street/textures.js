import { CanvasTexture, RepeatWrapping, SRGBColorSpace, ClampToEdgeWrapping } from 'three';

/**
 * Painted textures for the street circuit: sponsor boards (all fictional
 * brands), the start gantry banner, debris-fence mesh and the asphalt.
 */

// [name, background, text colour, accent, style]
export const SPONSORS = [
  ['NEBULA COLA', '#c8102e', '#ffffff', '#ffd23f', 'wave'],
  ['TINY TYRES', '#111214', '#ffc21a', '#ffc21a', 'tread'],
  ['PORTO BANK', '#0e2a5c', '#f2e6c9', '#c9a24a', 'serif'],
  ['HEXA ENERGY', '#14c38e', '#0b1d17', '#0b1d17', 'hex'],
  ['LUMEN WATCHES', '#f4f1ea', '#1b1b1f', '#b08d57', 'serif'],
  ['OCTANE 9', '#ff6a12', '#121212', '#ffffff', 'stripes'],
  ['CORAL CRUISES', '#1e8fb8', '#ffffff', '#ff8a6b', 'wave'],
  ['VOLTWAVE', '#2b1a5c', '#7df9ff', '#ff3fd1', 'bolt'],
];
const ROWS = SPONSORS.length;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function drawBrand(g, x, y, w, h, [name, bg, fg, accent, style]) {
  g.fillStyle = bg;
  g.fillRect(x, y, w, h);
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = accent;
  g.strokeStyle = accent;
  if (style === 'wave') {
    g.lineWidth = h * 0.08;
    for (let k = 0; k < 2; k++) {
      g.beginPath();
      for (let i = 0; i <= w; i += 8) g.lineTo(x + i, y + h * (0.82 + k * 0.1) + Math.sin(i / 30) * h * 0.05);
      g.stroke();
    }
  } else if (style === 'stripes') {
    for (let i = -h; i < w; i += h * 0.7) {
      g.beginPath();
      g.moveTo(x + i, y + h); g.lineTo(x + i + h * 0.3, y + h); g.lineTo(x + i + h * 0.6, y); g.lineTo(x + i + h * 0.3, y);
      g.fill();
    }
    g.fillStyle = bg;
    g.fillRect(x + w * 0.18, y, w * 0.64, h);
  } else if (style === 'tread') {
    for (let i = 0; i < w; i += h * 0.5) g.fillRect(x + i, y, h * 0.18, h * 0.16);
    for (let i = h * 0.25; i < w; i += h * 0.5) g.fillRect(x + i, y + h * 0.84, h * 0.18, h * 0.16);
  } else if (style === 'hex') {
    const r = h * 0.28;
    for (let i = 0; i < w + r * 2; i += r * 3.4) {
      for (const cy of [y + h * 0.25, y + h * 0.75]) {
        g.beginPath();
        for (let a = 0; a < 6; a++) g.lineTo(x + i + Math.cos((a / 6) * Math.PI * 2) * r, cy + Math.sin((a / 6) * Math.PI * 2) * r);
        g.globalAlpha = 0.18;
        g.fill();
        g.globalAlpha = 1;
      }
    }
  } else if (style === 'grid') {
    g.lineWidth = 1.5;
    g.globalAlpha = 0.3;
    for (let i = 0; i < w; i += h * 0.35) { g.beginPath(); g.moveTo(x + i, y); g.lineTo(x + i, y + h); g.stroke(); }
    g.globalAlpha = 1;
  } else if (style === 'grain') {
    g.globalAlpha = 0.18;
    for (let i = 0; i < h; i += 4) { g.fillRect(x, y + i + Math.sin(i) * 1.5, w, 1.5); }
    g.globalAlpha = 1;
  } else if (style === 'bolt') {
    g.lineWidth = h * 0.06;
    g.beginPath();
    g.moveTo(x, y + h * 0.5);
    for (let i = 0; i < w; i += h * 0.6) { g.lineTo(x + i + h * 0.3, y + h * 0.2); g.lineTo(x + i + h * 0.6, y + h * 0.8); }
    g.globalAlpha = 0.35;
    g.stroke();
    g.globalAlpha = 1;
  }
  g.restore();
  // Brand name, repeated so a long board reads from any angle.
  const serif = style === 'serif';
  g.font = `${serif ? '' : 'italic '}900 ${Math.round(h * 0.56)}px ${serif ? 'Georgia, serif' : '"Arial Black", "Helvetica Neue", Arial, sans-serif'}`;
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  g.fillStyle = fg;
  const tw = g.measureText(name).width + h * 1.6;
  const reps = Math.max(1, Math.floor(w / tw));
  for (let r = 0; r < reps; r++) g.fillText(name, x + (w / reps) * (r + 0.5), y + h * 0.53);
}

/** Atlas: one sponsor per horizontal band. v range of sponsor k: [k/ROWS, (k+1)/ROWS]. */
export function sponsorAtlas(list = SPONSORS) {
  const W = 1024, H = 64, ROWS = list.length;
  const [c, g] = canvas(W, H * ROWS);
  // Canvas y grows down, texture v grows up: draw row k at the top-down position for v band k.
  list.forEach((s, k) => drawBrand(g, 0, (ROWS - 1 - k) * H, W, H, s));
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  tex.anisotropy = 8;
  return { tex, rows: ROWS };
}

/** Run-off lettering: each sponsor's name in its text colour on a transparent band (rows like the board atlas). */
export function logoAtlas(list = SPONSORS) {
  const W = 1024, H = 128, ROWS = list.length;
  const [c, g] = canvas(W, H * ROWS);
  g.clearRect(0, 0, W, H * ROWS);
  list.forEach(([name, , fg, accent, style], k) => {
    const y = (ROWS - 1 - k) * H;
    const serif = style === 'serif';
    g.font = `${serif ? '' : 'italic '}900 ${Math.round(H * 0.62)}px ${serif ? 'Georgia, serif' : '"Arial Black", "Helvetica Neue", Arial, sans-serif'}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = fg;
    g.globalAlpha = 0.92;
    g.fillText(name, W / 2, y + H * 0.52, W * 0.86);
    // Accent pin-stripes above and below the lettering.
    g.fillStyle = accent;
    g.fillRect(0, y + 6, W, 6);
    g.fillRect(0, y + H - 12, W, 6);
    g.globalAlpha = 1;
  });
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.anisotropy = 8;
  return { tex, rows: ROWS };
}

/** Wide banner for gantries and grandstand roofs. */
export function titleBanner(text, sub, bg = '#0d1b2e', fg = '#f4efe2', accent = '#ffc21a') {
  const [c, g] = canvas(1024, 160);
  g.fillStyle = bg;
  g.fillRect(0, 0, 1024, 160);
  g.fillStyle = accent;
  g.fillRect(0, 0, 1024, 10);
  g.fillRect(0, 150, 1024, 10);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = fg;
  g.font = 'italic 900 78px "Arial Black", Arial, sans-serif';
  g.fillText(text, 512, sub ? 66 : 82);
  if (sub) {
    g.fillStyle = accent;
    g.font = '700 30px Georgia, serif';
    g.fillText(sub, 512, 122);
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Chain-link debris fence: alpha-tested diamond mesh. */
export function fenceTexture() {
  const [c, g] = canvas(64, 64);
  g.clearRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(190,198,206,1)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, 0); g.lineTo(64, 64);
  g.moveTo(64, 0); g.lineTo(0, 64);
  g.moveTo(32, -32); g.lineTo(96, 32);
  g.moveTo(-32, 32); g.lineTo(32, 96);
  g.moveTo(32, 96); g.lineTo(96, 32);
  g.moveTo(-32, 32); g.lineTo(32, -32);
  g.stroke();
  const tex = new CanvasTexture(c);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  return tex;
}

/** City-street asphalt: lighter and patchier than the void ring's, with seams and repairs. */
export function streetAsphalt() {
  const size = 512;
  const [c, g] = canvas(size, size);
  g.fillStyle = '#242424';
  g.fillRect(0, 0, size, size);
  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = Math.random();
    const v = n > 0.99 ? 66 : n > 0.92 ? 44 : 31 + Math.random() * 8;
    d[i] = v; d[i + 1] = v; d[i + 2] = v; // neutral grey: any blue tint turns teal under night lighting
  }
  g.putImageData(img, 0, 0);
  // Resurfacing patches and a few tar seams: a road that's lived in.
  for (let k = 0; k < 6; k++) {
    const p = 16 + Math.random() * 10;
    g.fillStyle = `rgba(${p},${p},${p - 1},0.35)`;
    g.fillRect(Math.random() * size, Math.random() * size, 40 + Math.random() * 120, 30 + Math.random() * 90);
  }
  g.strokeStyle = 'rgba(10,10,12,0.5)';
  g.lineWidth = 2;
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    let x = Math.random() * size;
    g.moveTo(x, 0);
    for (let y = 0; y <= size; y += 24) { x += (Math.random() - 0.5) * 18; g.lineTo(x, y); }
    g.stroke();
  }
  const tex = new CanvasTexture(c);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Big painted text on the road surface near the start line. */
export function roadText(text) {
  const [c, g] = canvas(1024, 256);
  g.clearRect(0, 0, 1024, 256);
  g.fillStyle = 'rgba(240,240,236,0.9)';
  g.font = 'italic 900 170px "Arial Black", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 512, 135);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Brake marker boards: three columns (150, 100, 50), white with a coloured border and big black digits. */
export function markerBoards(border = '#c8242b') {
  const [c, g] = canvas(384, 128);
  ['150', '100', '50'].forEach((t, k) => {
    const x = k * 128;
    g.fillStyle = border;
    g.fillRect(x, 0, 128, 128);
    g.fillStyle = '#f4f4f0';
    g.fillRect(x + 10, 10, 108, 108);
    g.fillStyle = '#111114';
    g.font = '900 64px "Arial Black", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(t, x + 64, 68);
  });
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Hotel names for the grand hotels' rooftop signs (rows match SIGNS in buildings.js). */
export const HOTELS = ['GRAND HOTEL VELA', 'HOTEL MIRAMARE', 'HOTEL BELVEDERE', 'PALAIS ROSE'];

/** Warm script-like signage: gilt serif letters on a dark lacquered board. v band k = HOTELS[k]. */
export function signAtlas() {
  const W = 1024, H = 128;
  const [c, g] = canvas(W, H * HOTELS.length);
  HOTELS.forEach((name, k) => {
    const y = (HOTELS.length - 1 - k) * H;
    g.fillStyle = '#1d1410';
    g.fillRect(0, y, W, H);
    g.strokeStyle = '#d9b26a';
    g.lineWidth = 5;
    g.strokeRect(10, y + 10, W - 20, H - 20);
    g.font = 'italic 700 78px Georgia, "Times New Roman", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffe2a8';
    g.fillText(name, W / 2, y + H * 0.54);
  });
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, rows: HOTELS.length };
}

// [team, primary, text, accent] — eight fictional teams, two garages each.
export const TEAMS = [
  ['SCUDERIA PICCOLA', '#c8102e', '#ffffff', '#ffd23f'],
  ['MINI MOTORI', '#ff7a12', '#0e1f3d', '#0e1f3d'],
  ['TINY TYRES RACING', '#141416', '#ffc21a', '#ffc21a'],
  ['HEXA ENERGY GP', '#14c38e', '#0b1d17', '#ffffff'],
  ['VOLTWAVE', '#2b1a5c', '#7df9ff', '#ff3fd1'],
  ['PORTO BANK RT', '#0e2a5c', '#f2e6c9', '#c9a24a'],
  ['CORAL CRUISES', '#1e8fb8', '#ffffff', '#ff8a6b'],
  ['NEBULA COLA', '#e8e4da', '#c8102e', '#c8102e'],
];

/** Garage name boards. v band k = TEAMS[k]; then RACE CONTROL, PIT IN, PIT OUT. */
export function teamAtlas() {
  const W = 512, H = 64, rows = TEAMS.length + 3;
  const [c, g] = canvas(W, H * rows);
  const board = (k, [name, bg, fg, accent]) => {
    const y = (rows - 1 - k) * H;
    g.fillStyle = bg;
    g.fillRect(0, y, W, H);
    g.fillStyle = accent;
    g.fillRect(0, y + H - 8, W, 8);
    g.fillRect(14, y + 12, 10, H - 28);
    g.font = 'italic 900 34px "Arial Black", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = fg;
    g.fillText(name, W / 2 + 8, y + H * 0.45);
  };
  TEAMS.forEach((t, k) => board(k, t));
  board(TEAMS.length, ['RACE CONTROL', '#f3ecdf', '#0d1b2e', '#ffc21a']);
  board(TEAMS.length + 1, ['PIT IN  ▶', '#ffc21a', '#111214', '#111214']);
  board(TEAMS.length + 2, ['◀  PIT OUT', '#ffc21a', '#111214', '#111214']);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, rows };
}

// Pinewood Ridge: outdoor, timber and mountain brands.
export const FOREST_SPONSORS = [
  ['TIMBERLINE', '#2f5a34', '#f2ead2', '#c9a24a', 'grain'],
  ['MOOSE MOTOR OIL', '#6b3a1e', '#ffd23f', '#ffd23f', 'stripes'],
  ['PINECONE BANK', '#f2ead2', '#2f5a34', '#8a5a2a', 'serif'],
  ['ALPENFRESH', '#1e6fb8', '#ffffff', '#bfe3ff', 'wave'],
  ['TRAILHEAD', '#e86a2c', '#1b1b1f', '#1b1b1f', 'tread'],
  ['NORDIC TYRES', '#111214', '#7fd1ff', '#7fd1ff', 'tread'],
  ['ACORN COFFEE', '#4a2e1c', '#f2c879', '#f2c879', 'serif'],
  ['GLACIER WATER', '#d8eef8', '#0e4a7a', '#0e4a7a', 'hex'],
];

// Lumen City: neon, tech and night-life brands.
export const NIGHT_SPONSORS = [
  ['NEON NOODLE', '#12061e', '#ff3fd1', '#7df9ff', 'grid'],
  ['HYPERION', '#05070f', '#7df9ff', '#3b7bff', 'bolt'],
  ['PIXEL COLA', '#e0003a', '#ffffff', '#ffd23f', 'wave'],
  ['SKYLINE TELECOM', '#0b1d3a', '#ffffff', '#00e0ff', 'hex'],
  ['MIDNIGHT ENERGY', '#111111', '#b6ff00', '#b6ff00', 'stripes'],
  ['ORBIT AIR', '#f4f1ea', '#1b2a7a', '#e0003a', 'serif'],
  ['KATANA MOTORS', '#1a1a1a', '#ff2a2a', '#ffffff', 'tread'],
  ['LUMA TV', '#3a0a6a', '#ffe14a', '#ff7ad9', 'grid'],
];
