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

const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};
const BRAND_FONT = { aramco: '500 {px}px "Trebuchet MS", "Helvetica Neue", Arial, sans-serif', 'aramco\u200b': '500 {px}px "Trebuchet MS", "Helvetica Neue", Arial, sans-serif', Heineken: 'bold {px}px Georgia, serif', 'crypto.com': '700 {px}px "Helvetica Neue", Arial, sans-serif', aws: '700 {px}px Arial, sans-serif', Lenovo: '700 {px}px "Helvetica Neue", Arial, sans-serif', salesforce: '600 {px}px "Helvetica Neue", Arial, sans-serif', DHL: 'italic 900 {px}px "Arial Black", Arial, sans-serif', PIRELLI: '900 {px}px "Arial Black", Arial, sans-serif', ROLEX: '600 {px}px Georgia, "Times New Roman", serif', Emirates: 'italic 600 {px}px Georgia, serif', Honda: '900 {px}px Arial, sans-serif' };
const fontFor = (style, px) => (style === 'serif' ? `700 ${px}px Georgia, "Times New Roman", serif` : `italic 900 ${px}px "Arial Black", "Helvetica Neue", Arial, sans-serif`);

/** The brand's emblem: a mark in the accent colour with the initial knocked out of it. */
function emblem(g, cx, cy, r, [name, bg, fg, accent, style]) {
  g.save();
  g.fillStyle = accent;
  g.beginPath();
  if (style === 'hex') for (let a = 0; a < 6; a++) g.lineTo(cx + Math.cos(a * Math.PI / 3 + Math.PI / 6) * r, cy + Math.sin(a * Math.PI / 3 + Math.PI / 6) * r);
  else if (style === 'tread' || style === 'stripes') { g.moveTo(cx - r, cy + r * 0.8); g.lineTo(cx - r * 0.35, cy - r * 0.8); g.lineTo(cx + r, cy - r * 0.8); g.lineTo(cx + r * 0.35, cy + r * 0.8); }
  else if (style === 'serif') { g.moveTo(cx, cy - r); g.lineTo(cx + r * 0.85, cy - r * 0.55); g.lineTo(cx + r * 0.7, cy + r * 0.45); g.lineTo(cx, cy + r); g.lineTo(cx - r * 0.7, cy + r * 0.45); g.lineTo(cx - r * 0.85, cy - r * 0.55); }
  else if (style === 'bolt') { g.moveTo(cx + r * 0.2, cy - r); g.lineTo(cx - r * 0.6, cy + r * 0.15); g.lineTo(cx - r * 0.05, cy + r * 0.15); g.lineTo(cx - r * 0.25, cy + r); g.lineTo(cx + r * 0.65, cy - r * 0.2); g.lineTo(cx + r * 0.1, cy - r * 0.2); }
  else g.arc(cx, cy, r, 0, Math.PI * 2);
  g.closePath();
  g.fill();
  g.lineWidth = Math.max(2, r * 0.1);
  g.strokeStyle = shade(bg, -0.35);
  g.stroke();
  if (style !== 'bolt') {
    g.fillStyle = bg;
    g.font = fontFor(style, Math.round(r * 1.15));
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(name[0], cx, cy + r * 0.06);
  }
  g.restore();
}

/**
 * Brand marks for the real partners, drawn in vector at the left of the lettering (cx, cy centre,
 * s size): the Rolex crown, the Heineken red star, the Shell pecten, the crypto.com hexagon,
 * the MSC compass rose, the Honda H wing, the Aramco ribbon, the Emirates/Etihad crest disc.
 */
export function brandMark(g, id, cx, cy, s, fg, accent) {
  g.save();
  g.fillStyle = fg; g.strokeStyle = fg; g.lineJoin = 'round'; g.lineCap = 'round';
  if (id === 'crown') {
    g.beginPath(); g.moveTo(cx - s, cy + s * 0.55);
    const pts = [[-1, -0.25], [-0.6, 0.15], [-0.45, -0.7], [-0.15, 0.1], [0, -0.95], [0.15, 0.1], [0.45, -0.7], [0.6, 0.15], [1, -0.25]];
    for (const [a, b] of pts) g.lineTo(cx + a * s, cy + b * s);
    g.lineTo(cx + s, cy + s * 0.55); g.closePath(); g.fill();
    for (const [a, b] of [[-1, -0.25], [-0.45, -0.7], [0, -0.95], [0.45, -0.7], [1, -0.25]]) { g.beginPath(); g.arc(cx + a * s, cy + b * s - s * 0.12, s * 0.12, 0, 7); g.fill(); }
    g.fillRect(cx - s * 0.85, cy + s * 0.62, s * 1.7, s * 0.16);
  } else if (id === 'star') {
    g.fillStyle = accent; g.beginPath();
    for (let k = 0; k < 10; k++) { const t = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? s * 0.42 : s; g.lineTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r); }
    g.closePath(); g.fill();
  } else if (id === 'pecten') {
    g.fillStyle = accent; g.beginPath(); g.moveTo(cx - s * 0.75, cy + s * 0.75); g.arc(cx, cy + s * 0.1, s * 0.95, Math.PI * 1.08, Math.PI * 1.92); g.lineTo(cx + s * 0.75, cy + s * 0.75); g.closePath(); g.fill();
    g.strokeStyle = shade('#fbce07', 0); g.lineWidth = s * 0.08;
    for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(cx, cy + s * 0.75); g.lineTo(cx + k * s * 0.24, cy - s * 0.7 + Math.abs(k) * s * 0.12); g.stroke(); }
  } else if (id === 'hex') {
    g.lineWidth = s * 0.16; g.beginPath();
    for (let k = 0; k < 6; k++) { const t = Math.PI / 6 + (k * Math.PI) / 3; g.lineTo(cx + Math.cos(t) * s, cy + Math.sin(t) * s); }
    g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(cx - s * 0.35, cy + s * 0.3); g.lineTo(cx, cy - s * 0.4); g.lineTo(cx + s * 0.35, cy + s * 0.3); g.stroke();
  } else if (id === 'compass') {
    g.fillStyle = accent; g.beginPath();
    for (let k = 0; k < 8; k++) { const t = (k * Math.PI) / 4 - Math.PI / 2, r = k % 2 ? s * 0.35 : s; g.lineTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r); }
    g.closePath(); g.fill();
  } else if (id === 'hwing') {
    g.fillStyle = fg;
    g.beginPath(); g.moveTo(cx - s, cy - s * 0.7); g.lineTo(cx + s, cy - s * 0.7); g.lineTo(cx + s * 0.7, cy + s * 0.8); g.lineTo(cx - s * 0.7, cy + s * 0.8); g.closePath(); g.fill();
    g.fillStyle = accent; g.fillRect(cx - s * 0.45, cy - s * 0.5, s * 0.22, s * 1.1); g.fillRect(cx + s * 0.23, cy - s * 0.5, s * 0.22, s * 1.1); g.fillRect(cx - s * 0.3, cy - s * 0.08, s * 0.6, s * 0.2);
  } else if (id === 'ribbon') {
    g.lineWidth = s * 0.3;
    for (const [c, o] of [[accent, -0.35], [fg, 0.25]]) { g.strokeStyle = c; g.beginPath(); g.moveTo(cx - s, cy + o * s); g.bezierCurveTo(cx - s * 0.3, cy - s + o * s, cx + s * 0.3, cy + s + o * s, cx + s, cy + o * s); g.stroke(); }
  } else if (id === 'disc') {
    g.lineWidth = s * 0.12; g.beginPath(); g.arc(cx, cy, s * 0.9, 0, 7); g.stroke();
    g.beginPath(); g.arc(cx, cy, s * 0.5, 0, 7); g.fill();
  }
  g.restore();
}

/** Background motif of the brand's style, faint, inside the panel. */
function motif(g, x, y, w, h, style, accent) {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = accent; g.strokeStyle = accent;
  if (style === 'wave') {
    g.lineWidth = h * 0.06; g.globalAlpha = 0.5;
    for (let k = 0; k < 2; k++) { g.beginPath(); for (let i = 0; i <= w; i += 6) g.lineTo(x + i, y + h * (0.86 + k * 0.08) + Math.sin(i / 34 + k) * h * 0.04); g.stroke(); }
  } else if (style === 'stripes') {
    g.globalAlpha = 0.9;
    for (const x0 of [x, x + w - h * 1.3]) for (let i = 0; i < 3; i++) { g.beginPath(); const a = x0 + i * h * 0.38; g.moveTo(a, y + h); g.lineTo(a + h * 0.18, y + h); g.lineTo(a + h * 0.52, y); g.lineTo(a + h * 0.34, y); g.fill(); }
  } else if (style === 'tread') {
    g.globalAlpha = 0.85;
    for (let i = 0; i < w; i += h * 0.42) { g.fillRect(x + i, y, h * 0.16, h * 0.1); g.fillRect(x + i + h * 0.21, y + h * 0.9, h * 0.16, h * 0.1); }
  } else if (style === 'hex') {
    const r = h * 0.22; g.globalAlpha = 0.12; g.lineWidth = 2;
    for (let i = 0; i < w + r * 2; i += r * 1.75) for (let row = 0; row < 3; row++) {
      const cx = x + i + (row % 2) * r * 0.87, cy = y + row * r * 1.5 + r * 0.3;
      g.beginPath(); for (let a = 0; a < 6; a++) g.lineTo(cx + Math.cos(a * Math.PI / 3) * r * 0.9, cy + Math.sin(a * Math.PI / 3) * r * 0.9); g.closePath(); g.stroke();
    }
  } else if (style === 'bolt') {
    g.lineWidth = h * 0.05; g.globalAlpha = 0.3; g.beginPath(); g.moveTo(x, y + h * 0.5);
    for (let i = 0; i < w; i += h * 0.6) { g.lineTo(x + i + h * 0.3, y + h * 0.18); g.lineTo(x + i + h * 0.6, y + h * 0.82); }
    g.stroke();
  } else if (style === 'serif') {
    g.globalAlpha = 0.9; g.fillRect(x, y + h * 0.1, w, Math.max(1, h * 0.025)); g.fillRect(x, y + h * 0.875, w, Math.max(1, h * 0.025));
  }
  g.restore();
}

/**
 * A sponsor panel: a shaded field in the brand colour with its motif, accent pinstripes top and
 * bottom, and logo units (emblem + name with a keyline and drop shadow) repeated with dividers.
 */
function drawBrand(g, x, y, w, h, brand, o = {}) {
  const [name, bg, fg, accent, style] = brand;
  if (brand[5] === 'plain') {
    // A real partner's board: its own flat colour and lettering, nothing else.
    g.fillStyle = bg;
    g.fillRect(x, y, w, h);
  } else {
    const grad = g.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, shade(bg, 0.22)); grad.addColorStop(0.45, bg); grad.addColorStop(1, shade(bg, -0.3));
    g.fillStyle = grad;
    g.fillRect(x, y, w, h);
    motif(g, x, y, w, h, style, accent);
    // Pinstripes and a gloss highlight across the top third.
    g.fillStyle = accent;
    g.fillRect(x, y + h * 0.04, w, Math.max(2, h * 0.035));
    g.fillRect(x, y + h * 0.925, w, Math.max(2, h * 0.035));
    const gloss = g.createLinearGradient(0, y, 0, y + h * 0.4);
    gloss.addColorStop(0, 'rgba(255,255,255,0.22)'); gloss.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gloss; g.fillRect(x, y, w, h * 0.4);
  }
  // Logo units.
  const px = Math.round(h * (o.text ?? 0.5));
  const font = BRAND_FONT[name] ? BRAND_FONT[name].replace('{px}', px) : fontFor(style, px);
  g.font = font;
  const plain = brand[5] === 'plain'; // real brands: their lettering alone, no made-up emblem
  const tw = g.measureText(name).width, er = plain ? 0 : h * 0.27, unit = er * 2.6 + tw + h * (o.gap ?? 1.4);
  const reps = Math.max(1, Math.floor(w / unit));
  for (let r = 0; r < reps; r++) {
    const cx = x + (w / reps) * (r + 0.5), ex = cx - (tw + er * 2.6) / 2 + er;
    if (!plain) emblem(g, ex, y + h * 0.5, er, brand);
    const mark = brand[6], ms = h * 0.27;
    let tx = plain ? cx - tw / 2 : ex + er * 1.6;
    if (mark) { tx += ms * 1.4; brandMark(g, mark, tx - ms * 1.6, y + h * 0.5, ms, fg, accent); }
    g.font = font;
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.lineJoin = 'round';
    if (!plain) {
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillText(name, tx + h * 0.025, y + h * 0.55);
      g.lineWidth = Math.max(2, h * 0.04);
      g.strokeStyle = shade(bg, -0.5);
      g.strokeText(name, tx, y + h * 0.52);
    }
    g.fillStyle = fg;
    if (brand[6] === 'longP') {
      // PIRELLI: the P drawn tall, its bowl over the rest of the word.
      g.save(); g.translate(tx, y + h * 0.52); g.scale(1, 1.55); g.fillText(name[0], 0, -h * 0.06); g.restore();
      g.fillText(name.slice(1), tx + g.measureText(name[0]).width * 0.95, y + h * 0.52);
    } else g.fillText(name, tx, y + h * 0.52);
    if (brand[6] === 'smile') { // aws: the orange smile arrow under the lettering
      g.strokeStyle = accent; g.lineWidth = h * 0.05; g.beginPath(); g.moveTo(tx, y + h * 0.72); g.quadraticCurveTo(tx + tw / 2, y + h * 0.9, tx + tw, y + h * 0.7); g.stroke();
      g.beginPath(); g.moveTo(tx + tw - h * 0.08, y + h * 0.66); g.lineTo(tx + tw + h * 0.02, y + h * 0.69); g.lineTo(tx + tw - h * 0.04, y + h * 0.78); g.stroke();
    }
    if (brand[6] === 'speed') { // DHL: the speed lines either side
      g.fillStyle = fg;
      for (let k = 0; k < 4; k++) { const yy = y + h * (0.33 + k * 0.1); g.fillRect(tx - h * (1.1 - k * 0.1), yy, h * (0.85 - k * 0.1), h * 0.04); g.fillRect(tx + tw + h * 0.25, yy, h * (0.85 - k * 0.1), h * 0.04); }
    }
    if (!plain && (reps > 1 || o.dividers)) { g.fillStyle = accent; g.globalAlpha = 0.8; const dx = x + (w / reps) * (r + 1) - 2; g.fillRect(dx, y + h * 0.2, Math.max(2, h * 0.03), h * 0.6); g.globalAlpha = 1; }
  }
}

/** Atlas: one sponsor per horizontal band. v range of sponsor k: [k/ROWS, (k+1)/ROWS]. */
export function sponsorAtlas(list = SPONSORS) {
  const W = 2048, H = 128, ROWS = list.length;
  const [c, g] = canvas(W, H * ROWS);
  // Canvas y grows down, texture v grows up: draw row k at the top-down position for v band k.
  list.forEach((s, k) => drawBrand(g, 0, (ROWS - 1 - k) * H, W, H, s));
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  tex.anisotropy = 16;
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

/**
 * Run-off lettering: each brand's name in big white letters with a thin dark keyline, one row per
 * brand, tiling along the field with a gap between repeats (like painted F1 run-off branding).
 */
/**
 * Painted sponsor run-off art, one row per brand, laid across the whole escape area (bottom of a row
 * = the kerb side). Most brands: a band of their colour along the kerb carrying the name, their
 * field colour behind (MSC's blue band on red). Aramco: green and blue halves meeting in a comb of
 * interleaved stripes, the name in huge white letters across both.
 */
export function runoffArt(list = SPONSORS) {
  const W = 2048, H = 512, ROWS = list.length;
  const [c, g] = canvas(W, H * ROWS);
  list.forEach((brand, k) => {
    const [name, bg, fg, accent, style] = brand;
    const y = (ROWS - 1 - k) * H, base = name.replace('\u200b', '');
    const star = (cx, cy, r) => { g.beginPath(); for (let k = 0; k < 10; k++) { const t = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.4 : r; g.lineTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr); } g.closePath(); g.fill(); };
    if (base === 'BAHRAIN CALLIGRAPHY') {
      // Peach ground, flowing orange swooshes, "Bahrain" in a big red brush script along the run-off.
      g.fillStyle = '#f2c08e'; g.fillRect(0, y, W, H);
      for (const [c, a, ph] of [['#f39a3c', 0.32, 0.2], ['#e8742a', 0.22, 1.7], ['#f6b25e', 0.4, 3.1]]) {
        g.fillStyle = c; g.beginPath(); g.moveTo(0, y + H);
        for (let x = 0; x <= W; x += 32) g.lineTo(x, y + H * (0.55 + a * Math.sin(x / 260 + ph)));
        g.lineTo(W, y + H); g.closePath(); g.fill();
      }
      g.save(); g.translate(W / 2, y + H * 0.5); g.rotate(-0.04);
      g.font = 'italic 700 ' + Math.round(H * 0.62) + 'px "Brush Script MT", "Segoe Script", cursive';
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = H * 0.05; g.strokeStyle = '#f8e2c8';
      g.strokeText('Bahrain', 0, 0, W * 0.9); g.fillStyle = '#d4202a'; g.fillText('Bahrain', 0, 0, W * 0.9);
      g.restore();
      return;
    }
    if (base === 'BAHRAIN MOSAIC') {
      // The blue mosaic: diamonds in blues and cyan with white keylines.
      const cell = H / 4;
      for (let r2 = 0; r2 < 4; r2++) for (let c2 = 0; c2 < W / cell; c2++) {
        const cx = c2 * cell + (r2 % 2) * cell / 2, cy = y + r2 * cell + cell / 2;
        g.fillStyle = ['#1f5ad0', '#2a7ad8', '#3aa8e8', '#5ad0ff', '#1a3a9a'][(r2 * 7 + c2 * 3) % 5];
        g.beginPath(); g.moveTo(cx, cy - cell / 2); g.lineTo(cx + cell / 2, cy); g.lineTo(cx, cy + cell / 2); g.lineTo(cx - cell / 2, cy); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3; g.stroke();
      }
      return;
    }
    if (base === 'BAHRAIN GEOMETRIC') {
      // Sakhir's usual run-off: sand-coloured tarmac carrying an intricate geometric frieze (eight-
      // pointed stars, interlaced diamonds, stepped bands) in red, teal, gold and white.
      g.fillStyle = '#c9a978'; g.fillRect(0, y, W, H);
      g.fillStyle = 'rgba(120,90,50,0.12)'; for (let k = 0; k < 900; k++) g.fillRect(Math.random() * W, y + Math.random() * H, 3, 3);
      const band = (y0, h, col) => { g.fillStyle = col; g.fillRect(0, y + y0, W, h); };
      band(H * 0.06, H * 0.05, '#ce1126'); band(H * 0.89, H * 0.05, '#ce1126'); band(H * 0.13, H * 0.015, '#ffffff'); band(H * 0.855, H * 0.015, '#ffffff');
      const cell = H * 0.62, cy = y + H / 2;
      for (let cx = cell / 2; cx < W + cell; cx += cell) {
        // An eight-pointed star (two squares), a diamond in its heart, small diamonds between.
        for (const [r, rot, col] of [[cell * 0.42, 0, '#1a8a8a'], [cell * 0.42, Math.PI / 4, '#1a8a8a'], [cell * 0.3, 0, '#e8b84a'], [cell * 0.3, Math.PI / 4, '#e8b84a']]) {
          g.save(); g.translate(cx, cy); g.rotate(rot); g.fillStyle = col; g.fillRect(-r / Math.SQRT2, -r / Math.SQRT2, r * Math.SQRT2, r * Math.SQRT2); g.restore();
        }
        g.fillStyle = '#ce1126'; g.beginPath(); g.moveTo(cx, cy - cell * 0.16); g.lineTo(cx + cell * 0.16, cy); g.lineTo(cx, cy + cell * 0.16); g.lineTo(cx - cell * 0.16, cy); g.closePath(); g.fill();
        g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.stroke();
        const mx = cx + cell / 2;
        for (const dy of [-0.3, 0.3]) { g.fillStyle = dy < 0 ? '#ce1126' : '#1a8a8a'; g.beginPath(); g.moveTo(mx, cy + dy * H - cell * 0.08); g.lineTo(mx + cell * 0.08, cy + dy * H); g.lineTo(mx, cy + dy * H + cell * 0.08); g.lineTo(mx - cell * 0.08, cy + dy * H); g.closePath(); g.fill(); }
        g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.moveTo(mx, cy - H * 0.2); g.lineTo(mx, cy + H * 0.2); g.stroke();
      }
      return;
    }
    if (base === 'LAS VEGAS SIGN') {
      // The Welcome-sign look on the big grey run-offs: night-blue ground, a row of the sign's
      // diamonds with "LAS VEGAS" across them in red with gold keylines, stars in the gaps.
      g.fillStyle = '#1a2a6a'; g.fillRect(0, y, W, H);
      g.fillStyle = '#ffd23f'; g.fillRect(0, y + H * 0.05, W, H * 0.025); g.fillRect(0, y + H * 0.92, W, H * 0.025);
      for (let cx = W * 0.12; cx < W; cx += W * 0.38) {
        g.save(); g.translate(cx + W * 0.07, y + H * 0.5);
        g.fillStyle = '#f4f4f2'; g.beginPath(); g.moveTo(-W * 0.15, -H * 0.2); g.quadraticCurveTo(0, -H * 0.42, W * 0.15, -H * 0.2); g.lineTo(W * 0.11, H * 0.28); g.lineTo(0, H * 0.4); g.lineTo(-W * 0.11, H * 0.28); g.closePath(); g.fill();
        g.lineWidth = 10; g.strokeStyle = '#ffd23f'; g.stroke();
        g.font = '900 ' + Math.round(H * 0.24) + 'px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 8; g.strokeStyle = '#ffd23f'; g.strokeText('LAS VEGAS', 0, H * 0.04, W * 0.24); g.fillStyle = '#e2231a'; g.fillText('LAS VEGAS', 0, H * 0.04, W * 0.24);
        g.font = 'italic 700 ' + Math.round(H * 0.1) + 'px Georgia, serif'; g.fillStyle = '#1a5ab8'; g.fillText('Fabulous', 0, -H * 0.17, W * 0.2);
        g.restore();
        g.fillStyle = '#ffd23f'; star(cx - W * 0.04, y + H * 0.3, H * 0.08); g.fillStyle = '#ff4fa0'; star(cx - W * 0.06, y + H * 0.68, H * 0.06);
      }
      return;
    }
    if (base === 'HEINEKEN 0.0') {
      // Heineken green with the red star and the white name, then the blue 0.0 panel, a white keyline.
      g.fillStyle = '#00843d'; g.fillRect(0, y, W * 0.66, H);
      g.fillStyle = '#1a5ab8'; g.fillRect(W * 0.66, y, W * 0.34, H);
      g.fillStyle = '#ffffff'; g.fillRect(0, y, W, H * 0.03); g.fillRect(W * 0.66, y, 8, H);
      g.font = '700 ' + Math.round(H * 0.46) + 'px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('Heineken', W * 0.3, y + H * 0.52, W * 0.5);
      const star = (cx, cy, rr) => { g.beginPath(); for (let k = 0; k < 10; k++) { const t = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? rr * 0.42 : rr; g.lineTo(cx + Math.cos(t) * q, cy + Math.sin(t) * q); } g.closePath(); g.fill(); };
      g.fillStyle = '#e2001a'; star(W * 0.6, y + H * 0.5, H * 0.24);
      g.fillStyle = '#ffffff'; g.font = '900 ' + Math.round(H * 0.5) + 'px Arial, sans-serif'; g.fillText('0.0', W * 0.83, y + H * 0.52, W * 0.28);
      return;
    }
    if (base === 'SINGAPORE AIRLINES') {
      // Navy field, the yellow kris bird (stacked swept strokes), the name in gold along the kerb side.
      g.fillStyle = '#1d2a6a'; g.fillRect(0, y, W, H);
      g.fillStyle = '#f2b31b';
      for (const cx of [W * 0.2, W * 0.8]) for (let k = 0; k < 4; k++) {
        g.beginPath(); const yy = y + H * (0.3 + k * 0.1), xx = cx + k * H * 0.05;
        g.moveTo(xx - H * 0.32, yy + H * 0.06); g.quadraticCurveTo(xx, yy - H * 0.1, xx + H * 0.34, yy - H * 0.02);
        g.lineTo(xx + H * 0.3, yy + H * 0.04); g.quadraticCurveTo(xx, yy - H * 0.02, xx - H * 0.3, yy + H * 0.1); g.closePath(); g.fill();
      }
      g.font = '700 ' + Math.round(H * 0.2) + 'px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('SINGAPORE AIRLINES', W / 2, y + H * 0.5, W * 0.5);
      g.fillStyle = '#ffffff'; g.fillRect(0, y, W, H * 0.03);
      return;
    }
    if (base === 'Red Bull') {
      // Navy, the yellow sun between two red charging shapes, Red Bull in red.
      g.fillStyle = '#1e2a5c'; g.fillRect(0, y, W, H);
      g.fillStyle = '#ffc906'; g.beginPath(); g.arc(W / 2, y + H * 0.42, H * 0.2, 0, 7); g.fill();
      g.font = 'italic 900 ' + Math.round(H * 0.3) + 'px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#db0a40'; g.fillText('Red Bull', W * 0.22, y + H * 0.48, W * 0.36); g.fillText('Red Bull', W * 0.78, y + H * 0.48, W * 0.36);
      g.fillStyle = '#ffffff'; g.fillRect(0, y, W, H * 0.03);
      return;
    }
    if (base === 'TEXAS FLAG') {
      // The Lone Star flag: blue hoist band with the white star, white over red.
      g.fillStyle = '#ffffff'; g.fillRect(0, y, W, H / 2);
      g.fillStyle = '#bf0a30'; g.fillRect(0, y + H / 2, W, H / 2);
      g.fillStyle = '#002868'; g.fillRect(0, y, W / 3, H);
      g.fillStyle = '#ffffff'; star(W / 6, y + H / 2, H * 0.3);
      return;
    }
    if (base === 'STARS AND STRIPES') {
      // Red and white stripes along the kerb, a blue band beyond scattered with white stars.
      for (let k = 0; k < 7; k++) { g.fillStyle = k % 2 ? '#ffffff' : '#bf0a30'; g.fillRect(0, y + (k * H * 0.55) / 7, W, (H * 0.55) / 7 + 1); }
      g.fillStyle = '#1c3f94'; g.fillRect(0, y + H * 0.55, W, H * 0.45);
      g.fillStyle = '#ffffff';
      for (let k = 0; k < 18; k++) star(W * ((k + 0.5) / 18), y + H * (0.66 + (k % 2) * 0.2), H * 0.07);
      return;
    }
    if (base === 'aramco') {
      // Aramco's run-offs are always split: green and blue halves meshing in a comb, white lettering.
      g.fillStyle = '#12a44c'; g.fillRect(0, y, W, H);
      g.fillStyle = '#2c63c4'; g.fillRect(W * 0.55, y, W * 0.45, H);
      for (let r = 0; r < 14; r++) {
        const yy = y + (r / 14) * H, hh = H / 14 * 0.55, reach = W * (0.08 + ((r * 37) % 11) / 11 * 0.14);
        g.fillStyle = '#2c63c4'; g.fillRect(W * 0.55 - reach, yy, reach, hh);
        g.fillStyle = '#12a44c'; g.fillRect(W * 0.55, yy + H / 28, reach * 0.8, hh);
      }
      g.font = BRAND_FONT.aramco.replace('{px}', Math.round(H * 0.5));
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('aramco', W / 2, y + H * 0.45, W * 0.92);
      return;
    }
    if (!brand[7] || base !== 'MSC CRUISES') { // MSC keeps its band-and-field look; the rest are one colour
      // One colour across the whole field, the name painted huge (Heineken: the red stars either side).
      g.fillStyle = bg; g.fillRect(0, y, W, H);
      const px = Math.round(H * 0.42);
      g.font = BRAND_FONT[name] ? BRAND_FONT[name].replace('{px}', px) : fontFor(style, px);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(name, W / 2, y + H * 0.48, W * 0.7);
      const tw = Math.min(W * 0.7, g.measureText(name).width);
      if (brand[6] && !['longP', 'smile', 'speed'].includes(brand[6])) for (const sx of [-1, 1]) brandMark(g, brand[6], W / 2 + sx * (tw / 2 + H * 0.28), y + H * 0.48, H * 0.2, fg, accent);
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(0, y, W, H * 0.025); // white line along the kerb side
      return;
    }
    g.fillStyle = brand[7]; g.fillRect(0, y, W, H); // the field
    const bandH = H * 0.42;
    g.fillStyle = bg; g.fillRect(0, y, W, bandH); // the band along the kerb (top of the row)
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(0, y + bandH, W, H * 0.02);
    const px = Math.round(bandH * 0.62);
    g.font = BRAND_FONT[name] ? BRAND_FONT[name].replace('{px}', px) : fontFor(style, px);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const cx of [W * 0.27, W * 0.73]) {
      const tw = Math.min(W * 0.42, g.measureText(name).width);
      if (brand[6] && !['longP', 'smile', 'speed'].includes(brand[6])) brandMark(g, brand[6], cx - tw / 2 - bandH * 0.35, y + bandH / 2, bandH * 0.28, fg, accent);
      g.fillText(name, cx, y + bandH / 2, W * 0.42);
    }
  });
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  tex.anisotropy = 16;
  return { tex, rows: ROWS };
}

export function runoffLettering(list = SPONSORS) {
  // Painted run-off lettering: the brand name in big white letters straight on the surface (no panel),
  // a thin keyline, the brand's accent as a short underline; transparent everywhere else.
  const W = 2048, H = 320, ROWS = list.length;
  const [c, g] = canvas(W, H * ROWS);
  g.clearRect(0, 0, W, H * ROWS);
  list.forEach(([name, , fg, accent, style], k) => {
    const y = (ROWS - 1 - k) * H;
    g.font = BRAND_FONT[name] ? BRAND_FONT[name].replace('{px}', Math.round(H * 0.62)) : fontFor(style, Math.round(H * 0.62));
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = 8; g.strokeStyle = 'rgba(10,12,16,0.35)';
    g.strokeText(name, W / 2, y + H * 0.5, W * 0.9);
    g.fillStyle = fg || '#f4f4f0'; // in the brand's own lettering colour
    g.fillText(name, W / 2, y + H * 0.5, W * 0.9);
    const tw = Math.min(W * 0.9, g.measureText(name).width);
    g.fillStyle = accent; g.globalAlpha = 0.9;
    g.fillRect(W / 2 - tw * 0.2, y + H * 0.86, tw * 0.4, H * 0.05);
    g.globalAlpha = 1;
  });
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  tex.anisotropy = 16;
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
  ['TITAN RACING', '#141416', '#ffc21a', '#ffc21a'],
  ['VERTEX GP', '#14c38e', '#0b1d17', '#ffffff'],
  ['NOVA RACING', '#2b1a5c', '#7df9ff', '#ff3fd1'],
  ['ARROWHEAD GP', '#0e2a5c', '#f2e6c9', '#c9a24a'],
  ['KESTREL F1', '#1e8fb8', '#ffffff', '#ff8a6b'],
  ['ORBIT MOTORSPORT', '#e8e4da', '#c8102e', '#c8102e'],
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

/**
 * Facade textures for distant town blocks, one per style, each tile 4 bays x 4 floors (one bay is
 * 3.2 m, one floor 3.1 m). Painted near-white so the vertex colour tints the wall; an emissive map
 * holds the lit windows. styles: sand (carved stone, arched windows), stucco (shutters), brick,
 * glass (curtain wall), soviet (concrete panels and balconies).
 */
const FACADES = {};
export function facadeTexture(style) {
  if (FACADES[style]) return FACADES[style];
  const S = 512, cw = S / 4, ch = S / 4;
  const [c, g] = canvas(S, S), [ce, ge] = canvas(S, S);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, S, S);
  let seed = [...style].reduce((a, k) => a * 31 + k.charCodeAt(0), 3) >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const lit = (x, y, w, h) => { if (rnd() < 0.3) { g.fillStyle = '#ffd08a'; g.fillRect(x, y, w, h); ge.fillStyle = '#ffc070'; ge.fillRect(x, y, w, h); return true; } return false; };
  const glass = (x, y, w, h) => { if (!lit(x, y, w, h)) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#5a6a7a'); gr.addColorStop(1, '#26303a'); g.fillStyle = gr; g.fillRect(x, y, w, h); } };
  if (style === 'glass') {
    g.fillStyle = '#c8d4de'; g.fillRect(0, 0, S, S);
    for (let r = 0; r < 4; r++) for (let k = 0; k < 8; k++) { const x = k * cw / 2 + 3, y = r * ch + 6; glass(x, y, cw / 2 - 6, ch - 18); }
    g.fillStyle = '#e8eef2'; for (let r = 0; r < 4; r++) g.fillRect(0, r * ch + ch - 12, S, 8);
  } else {
    const base = { sand: '#f2e8d8', stucco: '#f4efe6', brick: '#e8d0c0', soviet: '#e4e2de' }[style] ?? '#f0ece4';
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    if (style === 'brick') {
      for (let y = 0; y < S; y += 8) for (let x = (y / 8) % 2 ? -8 : 0; x < S; x += 16) { g.fillStyle = `rgba(90,40,30,${0.08 + rnd() * 0.12})`; g.fillRect(x + 1, y + 1, 14, 6); }
    }
    if (style === 'sand') for (let y = 0; y < S; y += 16) { g.fillStyle = 'rgba(120,90,50,0.12)'; g.fillRect(0, y, S, 1.5); for (let x = (y / 16) % 2 ? 0 : 20; x < S; x += 40) g.fillRect(x, y, 1.5, 16); }
    if (style === 'soviet') for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { g.strokeStyle = 'rgba(60,60,60,0.25)'; g.lineWidth = 2; g.strokeRect(k * cw + 1, r * ch + 1, cw - 2, ch - 2); }
    for (let r = 0; r < 4; r++) {
      const y0 = r * ch;
      // Floor band / cornice line.
      g.fillStyle = style === 'sand' ? 'rgba(150,115,70,0.45)' : 'rgba(0,0,0,0.12)';
      g.fillRect(0, y0 + ch - 7, S, 5);
      for (let k = 0; k < 4; k++) {
        const x0 = k * cw, ww = cw * 0.42, wh = ch * 0.58, wx = x0 + (cw - ww) / 2, wy = y0 + ch * 0.16;
        if (style === 'sand') {
          g.fillStyle = 'rgba(160,125,80,0.55)'; g.fillRect(wx - 7, wy - 10, ww + 14, wh + 16); // carved surround
          g.fillStyle = base; g.beginPath(); g.arc(wx + ww / 2, wy + 4, ww / 2 + 3, Math.PI, 0); g.fill();
          glass(wx, wy + 4, ww, wh - 4);
          g.fillStyle = '#26303a'; g.beginPath(); g.arc(wx + ww / 2, wy + 4, ww / 2, Math.PI, 0); g.fill();
          g.fillStyle = 'rgba(130,95,55,0.7)'; g.fillRect(wx - 8, wy + wh, ww + 16, 6); // sill
          if (r % 2 === 0) { g.fillStyle = 'rgba(40,36,32,0.85)'; for (let q = 0; q < 7; q++) g.fillRect(wx - 6 + q * (ww + 12) / 6, wy + wh - 18, 2, 18); g.fillRect(wx - 8, wy + wh - 20, ww + 16, 3); }
        } else if (style === 'soviet') {
          glass(x0 + 14, wy, cw - 28, wh);
          g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x0 + 8, wy + wh + 4, cw - 16, 10); // balcony slab
        } else {
          glass(wx, wy, ww, wh);
          g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(wx - 3, wy - 3, ww + 6, 4); g.fillRect(wx - 3, wy + wh, ww + 6, 5); g.fillRect(wx + ww / 2 - 1.5, wy, 3, wh);
          if (style === 'stucco') { g.fillStyle = ['#4f7a5a', '#3f6a8c', '#7a5236'][(k + r) % 3]; g.fillRect(wx - ww * 0.42, wy, ww * 0.38, wh); g.fillRect(wx + ww * 1.04, wy, ww * 0.38, wh); }
        }
      }
    }
    // Weathering: soft streaks down the wall.
    for (let k = 0; k < 14; k++) { const x = rnd() * S; const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, 'rgba(60,50,40,0.1)'); gr.addColorStop(1, 'rgba(60,50,40,0)'); g.fillStyle = gr; g.fillRect(x, 0, 6 + rnd() * 10, S); }
  }
  const map = new CanvasTexture(c), emissiveMap = new CanvasTexture(ce);
  for (const t of [map, emissiveMap]) { t.colorSpace = SRGBColorSpace; t.wrapS = t.wrapT = RepeatWrapping; t.anisotropy = 8; }
  return (FACADES[style] = { map, emissiveMap });
}
export const FACADE_STYLES = ['sand', 'stucco', 'brick', 'glass', 'soviet'];
