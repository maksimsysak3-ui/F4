import { MeshBasicMaterial, CanvasTexture, SRGBColorSpace, DoubleSide } from 'three';
import { Frame, rgb, scaleC, pick } from '../street/kit.js';
import { beam } from '../night/venue.js';
import { skin, rect } from './sgCity.js';
import { FACADES, skinGeo, facadeGeo } from './facades.js';

export { FACADES, skinGeo, facadeGeo };

/*
 * The Las Vegas detail kit: real 3D channel letters (each glyph rasterised from the font and built
 * as metal-bodied blocks with a lit face), framed LED video walls and monopole billboards showing
 * drawn ad artwork, and resort towers with podiums, porte-cochère canopies, fins, slab bands,
 * crowns and wrap screens instead of bare window textures.
 */

const DARK = rgb(0x16161c), STEEL = rgb(0x6a707a);

// ---- 3D lettering -------------------------------------------------------------------------------------

const glyphCache = new Map();
/** Row runs [row, x0, x1] of the text drawn `rows` pixels tall, and its width in pixels. */
function rasterise(text, font, rows) {
  const key = `${text}|${font}|${rows}`;
  if (glyphCache.has(key)) return glyphCache.get(key);
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const px = Math.round(rows * 0.92);
  g.font = font.replace('{px}', px);
  const w = Math.ceil(g.measureText(text).width) + 4;
  c.width = w; c.height = rows + 4;
  g.font = font.replace('{px}', px); g.textBaseline = 'middle'; g.fillStyle = '#fff';
  g.fillText(text, 2, (rows + 4) / 2);
  const d = g.getImageData(0, 0, c.width, c.height).data, runs = [];
  for (let y = 0; y < c.height; y++) {
    let x0 = -1;
    for (let x = 0; x <= c.width; x++) {
      const on = x < c.width && d[(y * c.width + x) * 4 + 3] > 110;
      if (on && x0 < 0) x0 = x;
      if (!on && x0 >= 0) { runs.push([y, x0, x]); x0 = -1; }
    }
  }
  const out = { runs, w: c.width, h: c.height };
  glyphCache.set(key, out);
  return out;
}

export const FONTS = {
  block: '900 {px}px "Arial Black", Arial, sans-serif',
  serif: '700 {px}px Georgia, "Times New Roman", serif',
  roman: '700 {px}px "Trajan Pro", "Times New Roman", serif',
  script: 'italic 700 {px}px "Brush Script MT", "Segoe Script", cursive',
  sans: '700 {px}px "Helvetica Neue", Arial, sans-serif',
};

/**
 * Channel letters standing in the frame plane b, reading left to right for a viewer on the +b side.
 * h: cap height in metres; centred on a (align 0) with its middle at height y. Each pixel row run
 * is a metal-bodied block `depth` deep with its lit face proud of the body.
 */
export function text3D(F, text, a, y, b, h, { font = FONTS.block, face = [3, 2.6, 1.6], body = DARK, depth = 0.8, rows = 30, align = 0, rim = null } = {}) {
  const { runs, w, h: ph } = rasterise(text, font, rows);
  const cell = h / rows, W = w * cell, a0 = a - W / 2 + align * W / 2, top = y + (ph * cell) / 2;
  for (const [r, x0, x1] of runs) {
    const ya = top - (r + 1) * cell, yb = top - r * cell, aa = a0 + x0 * cell, ab = a0 + x1 * cell;
    F.box('metal', aa, ab, ya, yb, b - depth, b, body);
    F.face('neon', aa, ab, ya, yb, b + 0.03, face);
  }
  if (rim) F.box('neon', a0 - cell * 2, a0 + W + cell * 2, top - ph * cell - cell * 1.5, top - ph * cell - cell * 0.5, b - 0.2, b + 0.05, rim);
  return W;
}

// ---- LED screens ---------------------------------------------------------------------------------------

const COLS = 4, ROWS = 4, SW = 512, SH = 256;
/** The ad loop: 16 drawn spots for the video walls and billboards (generic, nothing branded). */
function adAtlas() {
  const c = document.createElement('canvas'); c.width = COLS * SW; c.height = ROWS * SH;
  const g = c.getContext('2d');
  let seed = 9;
  const R = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const txt = (t, x, y, px, col, font = '900 {px}px "Arial Black", Arial, sans-serif', stroke = null) => {
    g.font = font.replace('{px}', px); g.textAlign = 'center'; g.textBaseline = 'middle';
    if (stroke) { g.lineWidth = px * 0.12; g.strokeStyle = stroke; g.strokeText(t, x, y); }
    g.fillStyle = col; g.fillText(t, x, y);
  };
  const grad = (stops, x0 = 0, y0 = 0, x1 = SW, y1 = SH) => { const q = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, k) => q.addColorStop(k / (stops.length - 1), s)); return q; };
  const rays = (x, y, n, col) => { g.save(); g.globalAlpha = 0.25; g.fillStyle = col; for (let k = 0; k < n; k++) { const t = (k / n) * Math.PI * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(t) * 700, y + Math.sin(t) * 700); g.lineTo(x + Math.cos(t + Math.PI / n) * 700, y + Math.sin(t + Math.PI / n) * 700); g.fill(); } g.restore(); };
  const card = (x, y, rank, suit, red, rot) => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = '#fff'; g.fillRect(-34, -48, 68, 96); g.strokeStyle = '#222'; g.lineWidth = 2; g.strokeRect(-34, -48, 68, 96); g.fillStyle = red ? '#d01020' : '#111'; g.font = '700 26px Georgia'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(rank, -28, -44); g.font = '44px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(suit, 0, 8); g.restore(); };
  const spots = [
    () => { // the race
      g.fillStyle = grad(['#12001a', '#3a0a3a', '#ff2a6a']); g.fillRect(0, 0, SW, SH);
      for (let y = 0; y < 6; y++) for (let x = 0; x < 10; x++) if ((x + y) % 2) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(300 + x * 22, y * 22, 22, 22); }
      g.fillStyle = '#e10600'; g.beginPath(); g.moveTo(40, 200); g.lineTo(120, 170); g.lineTo(300, 165); g.lineTo(380, 185); g.lineTo(440, 190); g.lineTo(440, 205); g.lineTo(40, 210); g.fill();
      g.fillStyle = '#111'; for (const x of [110, 360]) { g.beginPath(); g.arc(x, 208, 26, 0, 7); g.fill(); }
      txt('LAS VEGAS', SW / 2, 58, 64, '#ffffff'); txt('GRAND PRIX', SW / 2, 118, 48, '#ff2a6a', undefined, '#fff');
    },
    () => { // slot reels
      g.fillStyle = grad(['#3a0000', '#a00010', '#3a0000'], 0, 0, 0, SH); g.fillRect(0, 0, SW, SH); rays(SW / 2, SH / 2, 18, '#ffd23f');
      for (let k = 0; k < 3; k++) { g.fillStyle = '#fff8e8'; g.fillRect(70 + k * 130, 50, 110, 130); g.strokeStyle = '#ffd23f'; g.lineWidth = 6; g.strokeRect(70 + k * 130, 50, 110, 130); txt('7', 125 + k * 130, 118, 110, '#e2001a', 'italic 900 {px}px Georgia', '#ffd23f'); }
      txt('JACKPOT', SW / 2, 222, 40, '#ffd23f', undefined, '#5a0000');
    },
    () => { // poker room
      g.fillStyle = grad(['#003a1a', '#00703a', '#003a1a']); g.fillRect(0, 0, SW, SH);
      ['A', 'K', 'Q', 'J', '10'].forEach((r, k) => card(150 + k * 52, 130, r, '♠', false, (k - 2) * 0.12));
      txt('POKER ROOM', 400, 70, 34, '#ffd23f'); txt('24 / 7', 410, 190, 44, '#ffffff');
    },
    () => { // live tonight
      g.fillStyle = '#05030a'; g.fillRect(0, 0, SW, SH);
      for (const [x, col] of [[100, '#ff2a8a'], [256, '#3ad0ff'], [410, '#ffd23f']]) { g.save(); g.globalAlpha = 0.45; g.fillStyle = col; g.beginPath(); g.moveTo(x, 0); g.lineTo(x - 90, SH); g.lineTo(x + 90, SH); g.fill(); g.restore(); }
      g.fillStyle = '#000'; for (let x = 0; x < SW; x += 18) { g.beginPath(); g.arc(x + 9, SH - 8 + Math.sin(x) * 4, 12, 0, 7); g.fill(); }
      txt('LIVE', SW / 2, 70, 80, '#ffffff', undefined, '#ff2a8a'); txt('TONIGHT', SW / 2, 150, 54, '#ffd23f');
    },
    () => { g.fillStyle = grad(['#2a1aff', '#ff2ad0', '#ffd23f']); g.fillRect(0, 0, SW, SH); for (let k = 0; k < 14; k++) { g.strokeStyle = `rgba(255,255,255,${0.15 + R() * 0.3})`; g.lineWidth = 6 + R() * 18; g.beginPath(); g.moveTo(0, R() * SH); g.bezierCurveTo(170, R() * SH, 340, R() * SH, SW, R() * SH); g.stroke(); } txt('VEGAS', SW / 2, SH / 2, 110, '#ffffff', 'italic 900 {px}px "Arial Black"', '#2a0a5a'); },
    () => { // blackjack
      g.fillStyle = grad(['#101010', '#2a2a2a']); g.fillRect(0, 0, SW, SH);
      card(120, 128, 'A', '♥', true, -0.15); card(175, 128, 'K', '♠', false, 0.12);
      for (let k = 0; k < 5; k++) { g.fillStyle = ['#e2001a', '#1a5ab8', '#111', '#00843d', '#ffd23f'][k]; g.beginPath(); g.ellipse(340, 200 - k * 12, 50, 16, 0, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.setLineDash([8, 8]); g.lineWidth = 4; g.stroke(); g.setLineDash([]); }
      txt('BLACKJACK', 360, 60, 40, '#ffffff'); txt('PAYS 3 TO 2', 360, 106, 26, '#ffd23f');
    },
    () => { g.fillStyle = grad(['#ff6a00', '#ff2a6a', '#5a1aa8'], 0, 0, 0, SH); g.fillRect(0, 0, SW, SH); g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(SW / 2, 170, 70, 0, 7); g.fill(); g.fillStyle = '#1a0a2a'; g.fillRect(0, 180, SW, 80); for (const x of [70, 440]) { g.strokeStyle = '#1a0a2a'; g.lineWidth = 10; g.beginPath(); g.moveTo(x, 256); g.quadraticCurveTo(x + 10, 150, x - 6, 90); g.stroke(); for (let f = 0; f < 6; f++) { const t = -Math.PI + f / 5 * Math.PI; g.beginPath(); g.moveTo(x - 6, 90); g.quadraticCurveTo(x - 6 + Math.cos(t) * 40, 70, x - 6 + Math.cos(t) * 80, 100 + Math.abs(Math.sin(t)) * 20); g.stroke(); } } txt('POOL PARTY', SW / 2, 60, 52, '#ffffff', undefined, '#5a1aa8'); },
    () => { g.fillStyle = '#050505'; g.fillRect(0, 0, SW, SH); for (let k = 0; k < 5; k++) { g.fillStyle = '#222'; g.fillRect(56 + k * 84, 60, 64, 140); for (let j = 0; j < 2; j++) { g.fillStyle = '#e10600'; g.beginPath(); g.arc(88 + k * 84, 100 + j * 60, 24, 0, 7); g.fill(); } } txt('LIGHTS OUT', SW / 2, 230, 34, '#ffffff'); },
    () => { g.fillStyle = grad(['#000014', '#001a4a']); g.fillRect(0, 0, SW, SH); for (let k = 0; k < 80; k++) { g.fillStyle = `rgba(255,255,255,${R()})`; g.fillRect(R() * SW, R() * SH, 2, 2); } g.strokeStyle = '#ffd23f'; g.lineWidth = 6; g.beginPath(); g.arc(130, 128, 80, 0, 7); g.stroke(); for (let k = 0; k < 16; k++) { const t = k / 16 * 6.283; g.beginPath(); g.moveTo(130, 128); g.lineTo(130 + Math.cos(t) * 80, 128 + Math.sin(t) * 80); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(130 + Math.cos(t) * 88, 128 + Math.sin(t) * 88, 7, 0, 7); g.fill(); } txt('HIGH', 360, 100, 60, '#ffffff'); txt('ROLLER', 360, 165, 60, '#ffd23f'); },
    () => { g.fillStyle = grad(['#2a0000', '#7a0010']); g.fillRect(0, 0, SW, SH); rays(SW / 2, 0, 12, '#fff'); for (const [x, s] of [[150, 1], [362, -1]]) { g.fillStyle = '#d01020'; g.beginPath(); g.ellipse(x, 140, 70, 56, s * 0.3, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(x - 40, 186, 80, 30); } txt('FIGHT NIGHT', SW / 2, 40, 46, '#ffffff', undefined, '#000'); },
    () => { g.fillStyle = '#0a0014'; g.fillRect(0, 0, SW, SH); g.fillStyle = '#111'; g.fillRect(200, 60, 110, 100); g.fillRect(170, 150, 170, 18); g.fillStyle = '#d01020'; g.fillRect(200, 135, 110, 14); for (let k = 0; k < 30; k++) { g.fillStyle = `hsl(${R() * 360},100%,70%)`; g.beginPath(); g.arc(256 + (R() - 0.5) * 300, 40 + R() * 60, 3 + R() * 4, 0, 7); g.fill(); } txt('MAGIC', SW / 2, 214, 56, '#ffd23f', 'italic 900 {px}px Georgia', '#5a0aa0'); },
    () => { g.fillStyle = grad(['#ffd23f', '#ff8a00']); g.fillRect(0, 0, SW, SH); g.fillStyle = '#222'; g.beginPath(); g.ellipse(120, 110, 40, 56, 0, 0, 7); g.fill(); g.fillRect(112, 160, 16, 70); txt('COMEDY', 330, 100, 64, '#111111'); txt('CLUB', 330, 170, 52, '#e2001a'); },
    () => { g.fillStyle = grad(['#00122a', '#00a0c8']); g.fillRect(0, 0, SW, SH); for (let k = 0; k < 7; k++) { g.strokeStyle = '#fff'; g.globalAlpha = 0.5; g.lineWidth = 4; g.beginPath(); g.moveTo(60 + k * 66, 256); g.quadraticCurveTo(60 + k * 66 + 10, 80 - (k % 3) * 20, 60 + k * 66 + 30, 256); g.stroke(); } g.globalAlpha = 1; txt('FOUNTAINS', SW / 2, 70, 54, '#ffffff'); txt('EVERY 15 MIN', SW / 2, 130, 30, '#bfefff'); },
    () => { g.fillStyle = '#000'; g.fillRect(0, 0, SW, SH); for (let k = 0; k < 9; k++) { g.strokeStyle = ['#ff2a8a', '#3ad0ff', '#ffd23f'][k % 3]; g.lineWidth = 10; g.strokeRect(20 + k * 14, 20 + k * 10, SW - 40 - k * 28, SH - 40 - k * 20); } txt('777', SW / 2, SH / 2, 100, '#ffffff', 'italic 900 {px}px Georgia', '#e2001a'); },
    () => { g.fillStyle = grad(['#1a1a1a', '#3a3a3a']); g.fillRect(0, 0, SW, SH); g.fillStyle = '#ffd23f'; g.fillRect(0, SH - 50, SW, 50); txt('PIT LANE', SW / 2, 90, 60, '#ffffff'); txt('PADDOCK CLUB', SW / 2, SH - 25, 34, '#111111'); },
    () => { g.fillStyle = grad(['#4a0a6a', '#e02a8a', '#ff8a2a']); g.fillRect(0, 0, SW, SH); for (let k = 0; k < 40; k++) { g.fillStyle = '#fff'; g.save(); g.translate(R() * SW, R() * SH); g.rotate(R()); g.fillRect(-2, -8, 4, 16); g.fillRect(-8, -2, 16, 4); g.restore(); } txt('SHOWTIME', SW / 2, SH / 2, 76, '#ffffff', 'italic 900 {px}px Georgia', '#4a0a6a'); },
  ];
  spots.forEach((draw, k) => { g.save(); g.translate((k % COLS) * SW, Math.floor(k / COLS) * SH); g.beginPath(); g.rect(0, 0, SW, SH); g.clip(); draw(); g.restore(); });
  // The LED pitch: fine dark lines so close up it reads as a screen, not paper.
  g.fillStyle = 'rgba(0,0,0,0.3)';
  for (let y = 0; y < c.height; y += 4) g.fillRect(0, y, c.width, 1);
  for (let x = 0; x < c.width; x += 4) g.fillRect(x, 0, 1, c.height);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/** Adds the ad atlas to a skyline set (as S.mats.vgscreen); call once. */
export function withScreens(S) {
  S.mats.vgscreen = new MeshBasicMaterial({ map: adAtlas(), side: DoubleSide });
  return S;
}

/** A frame on the skyline builder at F's origin (for textured quads). */
const onS = (S, F) => new Frame(S.mb, F.o[0], F.o[1], F.o[2], F.r[0], F.r[1]);

/** The bare LED picture: spot `slot` of the atlas on the plane b (facing +b, or -b with dir -1). */
export function screenQuad(S, F, a0, a1, y0, y1, b, slot, dir = 1) {
  const G = onS(S, F), cx = slot % COLS, cy = Math.floor(slot / COLS) % ROWS;
  const u0 = cx / COLS, u1 = (cx + 1) / COLS, v1 = 1 - cy / ROWS, v0 = 1 - (cy + 1) / ROWS;
  const [l, r] = dir > 0 ? [a0, a1] : [a1, a0];
  G.mb.color = null;
  G.mb.quadUV('vgscreen', G.at(l, y0, b), G.at(r, y0, b), G.at(r, y1, b), G.at(l, y1, b), [u0, v0], [u1, v0], [u1, v1], [u0, v1]);
}

/** A framed video wall: a dark cabinet with a bevelled rim, the picture just proud of it. */
export function videoWall(S, F, a, y, b, W, H, slot, { dir = 1, depth = 1.2, rim = [0.25, 0.25, 0.3], glow = null } = {}) {
  const t = Math.max(0.35, Math.min(W, H) * 0.04), bf = b + dir * 0.06;
  F.box('metal', a - W / 2 - t, a + W / 2 + t, y - H / 2 - t, y + H / 2 + t, dir > 0 ? b - depth : b, dir > 0 ? b : b + depth, DARK);
  F.face('neon', a - W / 2 - t, a + W / 2 + t, y - H / 2 - t, y - H / 2 - t * 0.5, b + dir * 0.03, rim, dir);
  F.face('neon', a - W / 2 - t, a + W / 2 + t, y + H / 2 + t * 0.5, y + H / 2 + t, b + dir * 0.03, rim, dir);
  if (glow) F.box('neon', a - W / 2 - t, a + W / 2 + t, y - H / 2 - t - 0.25, y - H / 2 - t, b - dir * 0.3, b + dir * 0.4, glow);
  screenQuad(S, F, a - W / 2, a + W / 2, y - H / 2, y + H / 2, bf, slot, dir);
}

/** A roadside monopole billboard: column, head frame, catwalk with lamps, two-sided screens. */
export function billboard(S, F, r, H = 14, W = 16, slots = [0, 1]) {
  const h = W / 2;
  F.cylinder('metal', 0, 0, 0.9, 0, H, 12, STEEL);
  F.box('metal', -1.6, 1.6, H - 1, H, -1.2, 1.2, STEEL);
  for (const s of [-1, 1]) {
    F.box('metal', -W / 2 - 0.4, W / 2 + 0.4, H, H + h + 0.8, s > 0 ? 0.6 : -1.0, s > 0 ? 1.0 : -0.6, DARK);
    screenQuad(S, F, -W / 2, W / 2, H + 0.4, H + 0.4 + h, s * 1.06, slots[(s + 1) / 2] ?? slots[0], s);
    // The catwalk and its lamps aimed up at the face.
    F.box('metal', -W / 2, W / 2, H - 0.1, H + 0.05, s * 1.0, s * 2.2, STEEL);
    for (let a = -W / 2 + 2; a < W / 2; a += 4) { beam(F, 'metal', [a, H, s * 2.1], [a, H + 0.9, s * 1.7], 0.12, DARK); F.box('neon', a - 0.25, a + 0.25, H + 0.85, H + 1.0, s * 1.6, s * 1.8, [2.8, 2.7, 2.4]); }
  }
  for (let k = 0; k < 3; k++) beam(F, 'metal', [-W / 2 + 1, H + h + 0.8, -0.2], [-W / 2 + 1 + (k + 1) * W / 4, H + h + 0.8, -0.2], 0.1, STEEL);
}

// ---- resort towers ---------------------------------------------------------------------------------------

const PODIUM = [rgb(0xd8c8a8), rgb(0xe8e2d4), rgb(0x2a2a32), rgb(0xb8a080), rgb(0x3a3440)];
const LEDS = [[3.0, 0.6, 2.0], [0.6, 1.8, 3.2], [3.0, 2.2, 0.9], [2.8, 2.8, 2.7], [0.6, 2.8, 1.4], [2.0, 0.8, 3.0]];

/**
 * A resort tower with real massing: a casino podium (lit porte-cochère canopy on columns, an entry
 * glowing through glass, a video wall on the front), then the tower with vertical fins and slab
 * bands for relief, maybe a full-height wrap screen on its side, and a crown (mechanical penthouse,
 * LED ring, rooftop name or an antenna).
 */
export function resortTower(S, F, R, W, D, H, { name = null, font = FONTS.block, nameCol = null, near = true, style = null } = {}) {
  const led = pick(R, LEDS), wall = pick(R, PODIUM), cz = -D / 2 - 14;
  const P = 9 + Math.floor(R() * 3) * 3; // podium height
  // ---- podium ----
  const PW = W + 24, PD = D + 18;
  F.box('stucco', -PW / 2, PW / 2, 0, P, -PD - 4, -2, scaleC(wall, 0.55));
  F.box('neon', -PW / 2, PW / 2, P - 1.1, P - 0.6, -2.05, -1.8, scaleC(led, 0.8));                // the lit cornice line
  F.face('winLit', -PW / 2 + 3, PW / 2 - 3, 0.2, 4.6, -1.98, [1.2, 0.85, 0.5]);                       // the casino floor through the glass
  for (let a = -PW / 2 + 4; a < PW / 2 - 2; a += 6) F.box('trim', a - 0.3, a + 0.3, 0, 5, -1.9, -1.4, scaleC(wall, 0.4));
  // The porte-cochère: a deep canopy on columns, its soffit full of lights.
  const cw = Math.min(30, PW * 0.5);
  F.box('stucco', -cw / 2, cw / 2, 6.2, 7.4, -2, 10, scaleC(wall, 0.6));
  F.face('neon', -cw / 2 + 0.6, cw / 2 - 0.6, 6.15, 6.18, 0, [0, 0, 0]);
  for (let a = -cw / 2 + 2; a < cw / 2 - 1; a += 2.5) for (let b = 0; b < 10; b += 2.5) F.box('neon', a - 0.3, a + 0.3, 6.05, 6.2, b - 0.3, b + 0.3, [2.2, 1.8, 1.2]);
  F.box('neon', -cw / 2, cw / 2, 7.4, 7.7, 9.6, 10.05, led);
  for (const a of [-cw / 2 + 1, cw / 2 - 1]) for (const b of [2, 9]) F.cylinder('stucco', a, b, 0.5, 0, 6.2, 8, scaleC(wall, 0.7));
  if (near && R() < 0.7) videoWall(S, F, (R() < 0.5 ? -1 : 1) * (PW / 2 - 14), P / 2 + 1.5, -1.6, 20, 10, Math.floor(R() * 16), { glow: scaleC(led, 0.5) });
  // ---- tower ----
  const p = rect(W, D, 0, cz), y0 = P, fd = 1.6;
  if (near) skinGeo(F, R, p, y0, H, style ?? FACADES[pick(R, ['glass', 'blueGlass', 'balcony', 'balcony', 'punched', 'white', 'bronze'])]);
  else skin(S, F, `sg${pick(R, [0, 1, 2, 2, 3])}`, p, y0, H, R);
  const finCol = scaleC(wall, 0.45);
  // Setback: an upper storey drawn in, with a terrace.
  if (near && R() < 0.4) { const p2 = rect(W * 0.7, D * 0.75, 0, cz), H2 = H + 3.3 * (2 + Math.floor(R() * 3)); skinGeo(F, R, p2, H + 1.2, H2, FACADES.glass); F.box('stucco', -W * 0.36, W * 0.36, H2, H2 + 0.8, cz - D * 0.39, cz + D * 0.39, DARK); }
  // A wrap screen down one side, the size of a building.
  if (near && R() < 0.35) {
    const s = R() < 0.5 ? -1 : 1, w = Math.min(D * 0.85, 36), h = w * 0.5, yc = y0 + (H - y0) * (0.45 + R() * 0.3);
    // A frame whose +b points out of the side wall (F's ±a).
    const G = new Frame(F.mb, ...F.at(s * (W / 2 + fd + 0.05), 0, cz), s * F.r[1], -s * F.r[0]);
    if (yc + h / 2 < H - 2) videoWall(S, G, 0, yc, 0, w, h, Math.floor(R() * 16), { depth: 0.6 });
  }
  // ---- crown ----
  F.box('stucco', -W / 2 - 0.6, W / 2 + 0.6, H, H + 1.2, cz - D / 2 - 0.6, cz + D / 2 + 0.6, DARK);
  F.box('neon', -W / 2 - 0.65, W / 2 + 0.65, H + 1.0, H + 1.25, cz - D / 2 - 0.65, cz + D / 2 + 0.65, led);
  F.box('concrete', -W * 0.3, W * 0.3, H + 1.2, H + 6, cz - D * 0.3, cz + D * 0.3, rgb(0x3a3a40));
  for (let k = 0; k < 4; k++) F.cylinder('metal', -W * 0.2 + k * W * 0.13, cz + D * 0.15, 1.1, H + 6, H + 7.5, 8, STEEL);
  if (name) text3D(F, name, 0, H + 6 + Math.min(10, W * 0.12), cz + D / 2 + 1.2, Math.min(9, W * 0.16), { font, face: nameCol ?? led, depth: 0.9 });
  else if (R() < 0.3) F.box('neon', -0.3, 0.3, H + 7.5, H + 28, cz - 0.3, cz + 0.3, scaleC(led, 0.7));
}

