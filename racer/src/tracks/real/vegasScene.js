import { Mesh, SphereGeometry, CylinderGeometry, MeshBasicMaterial, CanvasTexture, SRGBColorSpace } from 'three';
import { rgb, scaleC, pick, Frame } from '../street/kit.js?v=1a016bc';
import { standVariety } from './trackside.js?v=1a016bc';
import { buildRealScene } from './scene.js?v=1a016bc';
import { palm } from '../street/trees.js?v=1a016bc';
import { grandstand } from '../street/props.js?v=1a016bc';
import { beam } from '../night/venue.js?v=1a016bc';
import { createSkyline, skin, tower, ngon, rect } from './sgCity.js?v=1a016bc';
import { letter } from './signs.js?v=1a016bc';
import { text3D, FONTS, FACADES, skinGeo, withScreens, videoWall, billboard, resortTower } from './vegasKit.js?v=1a016bc';

/*
 * Las Vegas, handcrafted for the night. The Strip from the Sands Avenue corner south to Harmon: on
 * the west side Treasure Island, the Mirage, Caesars Palace, the Bellagio behind its lake of
 * fountains, the Cosmopolitan; on the east the Venetian and its campanile, the LINQ under the High
 * Roller wheel, the Flamingo in pink neon, Paris with its Eiffel Tower and balloon, Planet Hollywood;
 * Wynn and Encore in bronze at the corner, MGM Grand's green beyond Harmon. Inside the lap, the
 * Sphere wearing the "Welcome to Fabulous Las Vegas" sign in LEDs. Steel lighting trusses spanning
 * the track, Pirelli-yellow walls, red-and-white kerbs printed with card suits, the pit building with
 * its grandstands, the Heineken 0.0 run-off at Turn 1 and LAS VEGAS painted on the road.
 */

const WHITE = rgb(0xf4f4f2), RED = rgb(0xd01020), STEEL = rgb(0x8a929e), DARK = rgb(0x1a1a20);
const SHIRTS = [RED, WHITE, rgb(0x1b1b1f), rgb(0xff8000), rgb(0x00a19b), rgb(0x1f4f9a), rgb(0xff2a8a), rgb(0xf2c200)];
const LED = { pink: [3.0, 0.5, 2.0], blue: [0.5, 1.6, 3.2], gold: [3.0, 2.2, 0.9], white: [2.8, 2.8, 2.7], green: [0.5, 2.8, 1.2], violet: [1.8, 0.6, 3.0], red: [3.0, 0.4, 0.3] };

function vegasStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: true, style: 'steel', seats: [rgb(0x2a2a30), rgb(0x1e2a5c)], led: LED.pink });
  return { ...gs, shirts: SHIRTS };
}
const VARIED = standVariety(vegasStand, null, SHIRTS);
const PINK = { ...FACADES.white, wall: rgb(0xf0b8cc), frame: rgb(0xf4d8e2) };
const EMERALD = { kind: 'curtain', bay: 3.0, fh: 3.3, frame: rgb(0x2a6a4a), pane: 'copper', paneCol: rgb(0x1a8a4a) };

// ---- the Sphere ------------------------------------------------------------------------------------

/** The Sphere's LED skin: the Welcome sign, sparkling stars, palms, camels, chevrons and neon zigzags. */
function sphereTexture() {
  const W = 4096, H = 2048, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#05030c'; g.fillRect(0, 0, W, H);
  // Chevron bands round the whole sphere, in pastel neon.
  const cols = ['#ff4fa0', '#7a5aff', '#3ad0ff', '#ffd23f', '#ff7a2a'];
  for (let band = 0; band < 18; band++) {
    g.strokeStyle = cols[band % cols.length]; g.lineWidth = 14; g.globalAlpha = 0.55;
    g.beginPath();
    for (let x = 0; x <= W; x += 80) g.lineTo(x, H * 0.45 + band * 58 + ((x / 80) % 2 ? 40 : 0));
    g.stroke();
  }
  g.globalAlpha = 1;
  // Stars of every colour.
  let s = 7;
  const R = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const star4 = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill(); };
  for (let k = 0; k < 260; k++) star4(R() * W, R() * H * 0.95, 14 + R() * 34, cols[k % cols.length]);
  // The sign, centred on u = 0.25 (it faces the track).
  const cx = W * 0.25, cy = H * 0.36, sw = 1250, sh = 760;
  g.save(); g.translate(cx, cy);
  const diamond = (k, fill, stroke) => { g.beginPath(); g.moveTo(-sw / 2 * k, -sh * 0.32 * k); g.quadraticCurveTo(0, -sh * 0.62 * k, sw / 2 * k, -sh * 0.32 * k); g.lineTo(sw * 0.36 * k, sh * 0.42 * k); g.lineTo(0, sh * 0.62 * k); g.lineTo(-sw * 0.36 * k, sh * 0.42 * k); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = 22; g.strokeStyle = stroke; g.stroke(); } };
  diamond(1.06, '#0a0614', '#ffd23f'); diamond(0.98, null, '#3ad0ff');
  // WELCOME in red letters on white discs.
  'WELCOME'.split('').forEach((ch, k) => { const x = (k - 3) * 132, y = -sh * 0.34 - Math.cos((k - 3) / 3 * 1.2) * 30; g.fillStyle = '#f4f4f2'; g.beginPath(); g.arc(x, y, 58, 0, 7); g.fill(); g.lineWidth = 8; g.strokeStyle = '#ffd23f'; g.stroke(); letter(g, ch, x, y + 4, 82, '#e2231a', { family: 'Georgia, serif', font: '700' }); });
  letter(g, 'to', -310, -sh * 0.08, 92, '#3ad0ff', { family: 'Georgia, serif', italic: true, font: '700' });
  letter(g, 'Fabulous', 80, -sh * 0.1, 170, '#3ad0ff', { family: '"Brush Script MT", "Segoe Script", cursive', italic: true, font: '700', stroke: '#0a0614', sw: 10 });
  letter(g, 'LAS VEGAS', 0, sh * 0.13, 230, '#ff4a2a', { family: '"Arial Black", Arial, sans-serif', stroke: '#ffd23f', sw: 10, max: sw * 0.94 });
  letter(g, 'N E V A D A', 0, sh * 0.36, 96, '#9ad8ff', { family: 'Arial, sans-serif', font: '700' });
  g.restore();
  // Palms and camels either side of the sign.
  const palmAt = (x, y, k) => { g.strokeStyle = '#4ad86a'; g.lineWidth = 18; g.beginPath(); g.moveTo(x, y + 260 * k); g.quadraticCurveTo(x + 30 * k, y + 120 * k, x, y); g.stroke(); for (let f = 0; f < 7; f++) { const t = -Math.PI + (f / 6) * Math.PI; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(t) * 90 * k, y - 60 * k, x + Math.cos(t) * 170 * k, y + Math.abs(Math.sin(t)) * 40 * k); g.stroke(); } };
  palmAt(cx - 820, cy + 120, 1); palmAt(cx + 820, cy + 160, 0.9);
  for (const [x, y] of [[cx + 520, cy + 520], [cx + 700, cy + 540], [cx - 640, cy + 540]]) { g.fillStyle = '#e8c070'; g.fillRect(x - 70, y - 30, 140, 40); g.beginPath(); g.arc(x - 20, y - 40, 30, 0, 7); g.arc(x + 30, y - 40, 26, 0, 7); g.fill(); g.fillRect(x + 60, y - 90, 18, 70); g.fillRect(x - 60, y + 10, 10, 50); g.fillRect(x + 40, y + 10, 10, 50); }
  // The far side: a second, simpler panel: a giant eye-like ring of light (the Sphere's other famous look).
  const ex = W * 0.75, ey = H * 0.4;
  for (let k = 0; k < 9; k++) { g.strokeStyle = cols[k % cols.length]; g.lineWidth = 26; g.beginPath(); g.arc(ex, ey, 120 + k * 70, 0, 7); g.stroke(); }
  // LED dot screen: darken a fine grid so it reads as pixels.
  g.fillStyle = 'rgba(0,0,0,0.42)';
  for (let y = 0; y < H; y += 8) g.fillRect(0, y, W, 3);
  for (let x = 0; x < W; x += 8) g.fillRect(x, 0, 3, H);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// ---- the casinos -----------------------------------------------------------------------------------

/** A crescent (Bellagio, Wynn): plan points of an arc band, convex to the front (+b), or concave
 *  (its wings reaching forward round a lake) when dir = -1. */
function crescent(R0, depth, span, n = 10, cz = 0, dir = 1) {
  const out = [], inn = [];
  for (let k = 0; k <= n; k++) {
    const a = -span / 2 + (k / n) * span;
    const zc = cz - dir * R0, Rb = R0 - dir * depth;
    out.push([Math.sin(a) * R0, zc + dir * Math.cos(a) * R0]);
    inn.unshift([Math.sin(a) * Rb, zc + dir * Math.cos(a) * Rb]);
  }
  return [...out, ...inn];
}
/** Roof cap on any plan polygon (fan from its centroid). */
function cap(F, poly, y, col) {
  const cx = poly.reduce((t, q) => t + q[0], 0) / poly.length, cz = poly.reduce((t, q) => t + q[1], 0) / poly.length;
  F.mb.color = col;
  for (let i = 0; i < poly.length; i++) F.mb.triFacing('stucco', F.at(cx, y, cz), F.at(poly[i][0], y, poly[i][1]), F.at(poly[(i + 1) % poly.length][0], y, poly[(i + 1) % poly.length][1]), [0, 1, 0]);
  F.mb.color = null;
}
/** An LED outline along a polygon at height y. */
function outline(F, poly, y, col, w = 0.4) {
  for (let i = 0; i < poly.length; i++) beam(F, 'neon', [poly[i][0], y, poly[i][1]], [poly[(i + 1) % poly.length][0], y, poly[(i + 1) % poly.length][1]], w, col);
}

function bellagio(S, F, r) {
  const H = 152, p = crescent(170, 32, 1.15, 12, -40, -1);
  skinGeo(F, r, p, 0, H, FACADES.punched); cap(F, p, H, rgb(0x2a2420));
  // The crown: a stepped, lit Italianate top, terracotta roofs at each end.
  const c2 = crescent(170, 20, 0.7, 8, -46, -1);
  skinGeo(F, r, c2, H, H + 10, FACADES.punched); cap(F, c2, H + 10, rgb(0x6a3a2a)); outline(F, c2, H + 10, LED.gold, 0.6);
  text3D(F, 'BELLAGIO', 0, H - 7, -45, 8, { font: FONTS.serif, face: [3.0, 2.3, 1.0], body: rgb(0x3a2a1a), depth: 1 });
  // The low lakefront villa wings: cream walls, arched windows lit, red tile roofs.
  for (const a of [-90, 90]) {
    F.box('stucco', a - 26, a + 26, 0, 16, -20, 0, scaleC(rgb(0xe8d8b8), 0.6));
    for (let x = a - 22; x < a + 22; x += 5) { F.face('winLit', x - 1.4, x + 1.4, 2, 6, 0.02, [1.7, 1.3, 0.8]); F.face('winLit', x - 1.1, x + 1.1, 9, 13, 0.02, [1.4, 1.1, 0.7]); }
    F.block('roof', [[a - 27, 1], [a + 27, 1], [a + 27, -21], [a - 27, -21]], [[a - 24, -10], [a + 24, -10], [a + 24, -10], [a - 24, -10]], 16, 21, rgb(0x8a3a2a));
  }
}

function caesars(S, F, r) {
  // Augustus and Octavius towers (white, blue-lit crowns), the Palace tower, the colonnade on the Strip.
  for (const [a, b, w, d, h, yaw] of [[-60, -70, 60, 22, 140, 0.25], [40, -90, 70, 22, 130, -0.2], [-10, -40, 50, 20, 110, 0]]) {
    const p = rect(w, d, a, b).map(([x, z]) => [a + (x - a) * Math.cos(yaw) - (z - b) * Math.sin(yaw), b + (x - a) * Math.sin(yaw) + (z - b) * Math.cos(yaw)]);
    skinGeo(F, r, p, 0, h, FACADES.white); cap(F, p, h, DARK);
    outline(F, p, h + 0.5, LED.blue, 0.8); outline(F, p, h - 6, scaleC(LED.blue, 0.4), 0.4);
  }
  F.box('stucco', -70, 70, 0, 14, -16, 0, scaleC(rgb(0xece6d8), 0.65));                       // the Roman front
  for (let a = -66; a <= 66; a += 6) { F.cylinder('stucco', a, 2, 0.9, 0, 12, 10, scaleC(WHITE, 0.85)); F.box('neon', a - 0.4, a + 0.4, 0, 0.4, 2.6, 3.2, LED.gold); }
  F.box('stucco', -72, 72, 12, 15, -2, 4, scaleC(WHITE, 0.8));                               // the entablature
  F.block('stucco', [[-24, 4], [24, 4], [24, -2], [-24, -2]], [[0, 4], [0, 4], [0, -2], [0, -2]], 15, 23, scaleC(WHITE, 0.8)); // the pediment
  text3D(F, 'CAESARS PALACE', 0, 13.5, 4.3, 1.9, { font: FONTS.roman, face: [3.0, 2.3, 1.0], body: scaleC(WHITE, 0.7), depth: 0.4 });
  text3D(F, 'CAESARS', -10, 100, -28.5, 9, { font: FONTS.roman, face: [2.6, 2.8, 3.2], body: DARK, depth: 1 });
  for (const a of [-40, 40]) { F.box('stucco', a - 4, a + 4, 0, 3, 8, 16, rgb(0x3a5aa0)); F.box('neon', a - 3.8, a + 3.8, 2.9, 3.1, 8.2, 15.8, LED.blue); } // the fountains' pools
}

function eiffel(F) {
  const H = 165, GOLD = [2.6, 1.8, 0.7];
  const half = (y) => 24 * Math.pow(1 - y / H, 1.6) + 1.2;
  const P = (sx, sz, y) => [sx * half(y), y, sz * half(y)];
  const levels = [0, 12, 24, 38, 57, 80, 100, 115, 135, 155, H];
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) for (let k = 0; k < levels.length - 1; k++) beam(F, 'neon', P(sx, sz, levels[k]), P(sx, sz, levels[k + 1]), k < 4 ? 0.9 : 0.5, GOLD);
  for (let k = 1; k < levels.length - 1; k++) {
    const y0 = levels[k], y1 = levels[k + 1];
    for (const [a, b] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) {
      beam(F, 'metal', P(a[0], a[1], y0), P(b[0], b[1], y1), 0.25, rgb(0x6a5a40));
      beam(F, 'metal', P(b[0], b[1], y0), P(a[0], a[1], y1), 0.25, rgb(0x6a5a40));
    }
  }
  // The arches between the legs, the two platforms, the beacon.
  for (const [a, b] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) for (let k = 0; k < 8; k++) { const t0 = k / 8, t1 = (k + 1) / 8, arc = (t) => 6 + Math.sin(Math.PI * t) * 12; beam(F, 'neon', [24 * (a[0] + (b[0] - a[0]) * t0) * 0.82, arc(t0), 24 * (a[1] + (b[1] - a[1]) * t0) * 0.82], [24 * (a[0] + (b[0] - a[0]) * t1) * 0.82, arc(t1), 24 * (a[1] + (b[1] - a[1]) * t1) * 0.82], 0.4, GOLD); }
  for (const y of [57, 115]) { const w = half(y) + 2.5; F.box('stucco', -w, w, y - 1.5, y, -w, w, rgb(0x5a4a34)); F.box('neon', -w, w, y - 0.3, y, -w - 0.05, w + 0.05, GOLD); }
  F.box('neon', -0.7, 0.7, H, H + 6, -0.7, 0.7, [3, 2.6, 1.6]);
}

function paris(S, F, r) {
  // The hotel: a slab after the Hôtel de Ville, with a mansard roof; the Eiffel Tower in front, the balloon.
  const p = rect(110, 26, 30, -95);
  skinGeo(F, r, p, 0, 100, FACADES.punched);
  F.block('roof', [[-25, -82], [85, -82], [85, -108], [-25, -108]], [[-21, -88], [81, -88], [81, -102], [-21, -102]], 100, 110, rgb(0x2a3440));
  for (let a = -20; a < 82; a += 7) F.box('neon', a - 0.8, a + 0.8, 102, 105, -82.5, -81.8, [2.4, 2.0, 1.4]);       // the dormers, lit
  F.box('stucco', -60, 60, 0, 14, -30, -6, scaleC(rgb(0xe8dcc4), 0.6));                                            // the Paris facades on the Strip
  for (let a = -56; a < 58; a += 5) F.face('winLit', a - 1.4, a + 1.4, 2, 7, -5.98, [1.8, 1.4, 0.9]);
  eiffel(F);
  // The Montgolfier balloon sign: a striped globe on its plinth with PARIS in lights.
  F.box('stucco', 46, 54, 0, 14, -4, 4, scaleC(WHITE, 0.6));
  F.blob('stucco', 50, 0, 9, 14, 34, 16, rgb(0x2a3a8a));
  for (const y of [18, 24, 30]) F.cylinder('neon', 50, 0, 8.6 - Math.abs(y - 24) * 0.3, y, y + 0.8, 16, y === 24 ? LED.gold : LED.red);
  text3D(F, 'PARIS', 50, 7.5, 4.25, 4.2, { font: FONTS.serif, face: LED.red, body: DARK, depth: 0.5 });
  text3D(F, 'PARIS', 30, 92, -81.6, 9, { font: FONTS.serif, face: [2.8, 2.6, 2.2], body: DARK, depth: 1 });
}

function venetian(S, F, r) {
  // The Venezia and Palazzo towers (tan, a pyramid of tile on top), the campanile, the Doge's Palace front.
  for (const [a, b, w, d, h] of [[20, -110, 90, 24, 140], [-70, -150, 70, 24, 190]]) {
    const p = rect(w, d, a, b);
    skinGeo(F, r, p, 0, h, FACADES.punched);
    F.block('roof', p, rect(w * 0.3, d * 0.3, a, b), h, h + 14, rgb(0x8a4a2a));
    outline(F, p, h, LED.gold, 0.5);
  }
  // The campanile: brick shaft, the belfry's lit arches, the gold-green pyramid and the angel.
  const cx = -40, cz = -20;
  F.box('stucco', cx - 6, cx + 6, 0, 70, cz - 6, cz + 6, rgb(0x6a2a20));
  for (let y = 6; y < 66; y += 6) F.box('trim', cx - 6.1, cx + 6.1, y, y + 0.3, cz - 6.1, cz + 6.1, rgb(0x5a2218));
  F.box('stucco', cx - 7, cx + 7, 70, 82, cz - 7, cz + 7, scaleC(WHITE, 0.6));
  for (const s of [-1, 1]) { F.face('winLit', cx - 5, cx + 5, 72, 80, cz + s * 7.02, [2.2, 1.8, 1.0], s); }
  F.box('stucco', cx - 6.5, cx + 6.5, 82, 88, cz - 6.5, cz + 6.5, rgb(0x6a2a20));
  F.block('copper', rect(13, 13, cx, cz), rect(0.6, 0.6, cx, cz), 88, 104, rgb(0x5a8a6a));
  F.box('neon', cx - 0.5, cx + 0.5, 104, 107, cz - 0.5, cz + 0.5, LED.gold);
  // The Doge's Palace: a white arcade below, the pink diaper-patterned wall above.
  F.box('stucco', 0, 80, 0, 20, -30, -8, scaleC(rgb(0xf0d8d0), 0.6));
  for (let a = 3; a < 78; a += 4) { F.box('stucco', a - 0.5, a + 0.5, 0, 7, -8, -7, scaleC(WHITE, 0.8)); F.face('winLit', a + 0.6, a + 3.4, 0, 6, -8.6, [1.8, 1.4, 0.9]); }
  for (let a = 8; a < 78; a += 10) F.face('winLit', a - 1.5, a + 1.5, 11, 17, -7.98, [1.6, 1.2, 0.8]);
  text3D(F, 'THE VENETIAN', 20, 130, -97.3, 7, { font: FONTS.serif, face: [3.0, 2.3, 1.0], depth: 0.9 });
  text3D(F, 'THE PALAZZO', -70, 178, -137.3, 7, { font: FONTS.serif, face: [3.0, 2.3, 1.0], depth: 0.9 });
}

function highRoller(F) {
  const R = 79, cy = 88, n = 56;
  for (const z of [-4, 4]) for (let k = 0; k < n; k++) {
    const t0 = (k / n) * 6.283, t1 = ((k + 1) / n) * 6.283;
    beam(F, 'neon', [Math.cos(t0) * R, cy + Math.sin(t0) * R, z], [Math.cos(t1) * R, cy + Math.sin(t1) * R, z], 0.7, k % 3 === 0 ? LED.pink : k % 3 === 1 ? LED.blue : LED.violet);
    if (k % 2 === 0) beam(F, 'metal', [0, cy, z * 0.3], [Math.cos(t0) * R, cy + Math.sin(t0) * R, z], 0.18, STEEL);
  }
  for (let k = 0; k < 28; k++) { const t = (k / 28) * 6.283, x = Math.cos(t) * (R + 4), y = cy + Math.sin(t) * (R + 4); F.blob('glass', x, 0, 3.6, y - 3.4, y + 3.4, 10, null); F.cylinder('neon', x, 0, 3.7, y - 0.3, y + 0.3, 10, [1.6, 1.8, 2.2]); }
  for (const s of [-1, 1]) for (const z of [-9, 9]) beam(F, 'metal', [s * 30, 0, z], [0, cy, z * 0.4], 2.4, rgb(0xdcdcdc));
  F.cylinder('metal', 0, 0, 3, cy - 3, cy + 3, 12, STEEL);
}

function flamingo(S, F, r) {
  const p = rect(100, 24, 0, -40);
  skinGeo(F, r, p, 0, 85, PINK); cap(F, p, 85, DARK);
  // The pink-and-orange neon feathers fanning up the front.
  for (let k = 0; k < 9; k++) {
    const a = -40 + k * 10, h = 20 + Math.sin(k / 8 * Math.PI) * 50;
    beam(F, 'neon', [a, 4, -27.5], [a + (k - 4) * 2.5, h, -27.5], 1.2, k % 2 ? LED.pink : [3.0, 1.2, 0.4]);
  }
  outline(F, p, 85.6, LED.pink, 0.8);
  F.box('stucco', -50, 50, 0, 12, -24, 0, scaleC(rgb(0xf0a8c8), 0.5));
  F.box('neon', -48, 48, 10, 11.5, 0.05, 0.3, LED.pink);
  text3D(F, 'Flamingo', 0, 74, -27.3, 12, { font: FONTS.script, face: LED.pink, depth: 0.9 });
  text3D(F, 'FLAMINGO', 0, 15, 0.35, 2.6, { face: [3, 1.2, 0.4], depth: 0.4 });
}

function cosmopolitan(S, F, r) {
  for (const [a, h] of [[-26, 184], [26, 172]]) {
    const p = rect(36, 28, a, -60);
    skinGeo(F, r, p, 0, h, FACADES.balcony); cap(F, p, h, DARK);
    for (let y = 24; y < h; y += 24) outline(F, p, y, scaleC(LED.violet, 0.5), 0.25);
    outline(F, p, h + 0.4, LED.white, 0.8);
  }
}

function cosmoMarquee(S, F) {
  // The Cosmopolitan's marquee on the Strip: twin lit columns carrying a huge video wall.
  for (const a of [-17, 17]) { F.box('stucco', a - 1.6, a + 1.6, 0, 34, -1.6, 1.6, DARK); F.box('neon', a - 1.65, a + 1.65, 2, 33, 1.62, 1.7, LED.violet); }
  videoWall(S, F, 0, 22, 1.8, 30, 15, 15, { glow: LED.violet });
  text3D(F, 'THE COSMOPOLITAN', 0, 31.5, 1.9, 2.2, { font: FONTS.sans, face: LED.white, depth: 0.4 });
}

function planetHollywood(S, F, r) {
  const p = rect(80, 26, 0, -60);
  skinGeo(F, r, p, 0, 115, FACADES.blueGlass); cap(F, p, 115, DARK);
  // The wall of LED screens on the front, the name in lights over it.
  videoWall(S, F, 0, 52, -46.7, 64, 32, 15, { glow: LED.pink });
  videoWall(S, F, -30, 16, -46.7, 18, 9, 3); videoWall(S, F, 30, 16, -46.7, 18, 9, 10);
  text3D(F, 'PLANET HOLLYWOOD', 0, 80, -46.6, 6, { face: LED.white, depth: 0.8, rim: LED.pink });
  F.cylinder('neon', 0, -47, 12, 108, 110, 24, LED.violet);
}

function wynn(S, F, r) {
  for (const [a, h, span] of [[-60, 187, 0.9], [70, 180, 0.8]]) {
    const p = crescent(110, 24, span, 10, -30).map(([x, z]) => [x + a, z]);
    skinGeo(F, r, p, 0, h, FACADES.bronze); cap(F, p, h, rgb(0x3a2a1a));
    outline(F, p, h, LED.gold, 0.6);
    text3D(F, a < 0 ? 'Wynn' : 'Encore', a, h - 14, -29.2, 16, { font: FONTS.script, face: [3.0, 2.3, 1.0], body: rgb(0x3a2a1a), depth: 1.2 });
  }
}

function yTower(S, F, r, H, glowCol, name) {
  // The Mirage / Treasure Island plan: three wings at 120 degrees from a core.
  for (let k = 0; k < 3; k++) {
    const t = (k / 3) * Math.PI * 2 + Math.PI / 2, cx = Math.cos(t) * 26, cz = -50 + Math.sin(t) * 26;
    const p = rect(18, 52, 0, 0).map(([x, z]) => [cx + x * Math.cos(t) - z * Math.sin(t), cz + x * Math.sin(t) + z * Math.cos(t)]);
    skinGeo(F, r, p, 0, H - k * 8, (glowCol === LED.gold ? FACADES.gold : FACADES.punched)); cap(F, p, H - k * 8, DARK); outline(F, p, H - k * 8, glowCol, 0.5);
  }
  text3D(F, name, 0, H - 9, -14.4, 8, { font: FONTS.serif, face: glowCol, depth: 0.9 });
}

function cityCenter(S, F, r) {
  // Aria's two curved glass towers and Vdara behind, the CityCenter skyline south of the Cosmopolitan.
  for (const [a, h, span, col] of [[-40, 180, 0.7, LED.white], [40, 160, 0.6, LED.blue]]) {
    const p = crescent(90, 22, span, 8, -40).map(([x, z]) => [x + a, z]);
    skinGeo(F, r, p, 0, h, (col === LED.white ? FACADES.glass : FACADES.blueGlass)); cap(F, p, h, DARK); outline(F, p, h, col, 0.5);
  }
  const v = crescent(60, 18, 1.0, 8, -130);
  skinGeo(F, r, v, 0, 175, FACADES.glass); cap(F, v, 175, DARK); outline(F, v, 175, LED.white, 0.4);
}

function mgm(S, F, r) {
  for (const [a, b, yaw] of [[-50, -60, 0.6], [50, -60, -0.6], [0, -110, 0]]) {
    const p = rect(70, 22, a, b).map(([x, z]) => [a + (x - a) * Math.cos(yaw) - (z - b) * Math.sin(yaw), b + (x - a) * Math.sin(yaw) + (z - b) * Math.cos(yaw)]);
    skinGeo(F, r, p, 0, 95, EMERALD); cap(F, p, 95, DARK);
    outline(F, p, 95, LED.green, 0.8);
  }
  text3D(F, 'MGM GRAND', 0, 86, -98.4, 8, { face: LED.green, depth: 1 });
}

/** A Strip marquee pylon: a sculpted column, a two-sided video wall, the resort's name in 3D letters on top. */
function pylon(S, F, name, colour, slots, font = FONTS.serif, h = 22) {
  const back = new Frame(F.mb, F.o[0], F.o[1], F.o[2], -F.r[0], -F.r[1]); // the same spot, facing the other way
  F.box('stucco', -2.2, 2.2, 0, h - 4, -1.4, 1.4, DARK);
  for (const s of [-1, 1]) F.box('neon', s * 2.2 - 0.12, s * 2.2 + 0.12, 1, h - 4, -1.45, 1.45, colour);
  F.box('stucco', -3.4, 3.4, 0, 1.2, -2.4, 2.4, scaleC(WHITE, 0.5));
  videoWall(S, F, 0, h + 2.5, 1.4, 15, 7.5, slots[0], { depth: 1.4 });
  videoWall(S, back, 0, h + 2.5, 1.4, 15, 7.5, slots[1], { depth: 1.4 });
  F.box('stucco', -8.6, 8.6, h + 6.9, h + 12.5, -1.0, 1.0, DARK);
  for (const G of [F, back]) text3D(G, name, 0, h + 9.7, 1.05, 3.4, { font, face: colour, depth: 0.5, rows: 26 });
  F.box('neon', -8.7, 8.7, h + 12.5, h + 12.8, -1.05, 1.05, colour);
}

// ---- the scene ---------------------------------------------------------------------------------------

export function buildVegasScene(L) {
  const img = (px, py) => L.fromImage(px, py);
  const noise = (x, z) => Math.sin(x * 0.013 + 0.3) * Math.cos(z * 0.011 + 0.8) * 0.6 + Math.sin(x * 0.033 - z * 0.027) * 0.4;
  const [lx, lz] = img(645, 768); // the Bellagio's lake, right on the Strip
  const lake = { x: lx, z: lz, r: 74, y: 0.3, margin: 14, depth: 3, colour: 0x0c1a2a, env: 0.3 };

  return buildRealScene(L, {
    name: 'Las Vegas',
    seed: 2023,
    life: { paddock: true, parks: 14, paths: true },
    margin: 800,
    windowGlow: 0.5,
    trackside: { standBuild: vegasStand, shirts: SHIRTS, suburb: 0, standSpacing: 400, hoardingSpacing: 100, keepOut: (x, z) => Math.hypot(x - lx, z - lz) < lake.r + 10, skyline: { count: 0 } },
    pitTheme: {
      wall: rgb(0xe8e8ec),
      upper(F, hw, i, rc, { H1, DEPTH }) {
        // The four-storey pit and paddock building: glass floors, magenta LED bands, seats on the roof.
        for (let f = 0; f < 3; f++) {
          const y = H1 + f * 4;
          F.box('stucco', -hw, hw, y, y + 4, -DEPTH + 0.6, -1.0, rgb(0x22242c));
          F.face(i % 2 ? 'winLit' : 'glass', -hw + 0.2, hw - 0.2, y + 0.4, y + 3.6, -0.98, [1.2, 1.1, 1.3]);
          F.box('neon', -hw, hw, y + 3.8, y + 4, -1.0, -0.8, LED.pink);
        }
        const top = H1 + 12;
        for (let t = 0; t < 6; t++) F.box('stucco', -hw, hw, top + t * 0.5, top + t * 0.5 + 0.5, -DEPTH + 1 + t * 1.6, -DEPTH + 2.6 + t * 1.6, rgb(0x2a2a30));
        // The roof sign, in 3D letters on a steel truss above the front of the building.
        if (i === 3) {
          const W = text3D(F, 'LAS VEGAS GRAND PRIX', 0, top + 7, -0.6, 4.2, { face: LED.white, body: DARK, depth: 0.8, rim: LED.pink });
          for (let a = -W / 2; a <= W / 2 + 0.1; a += W / 6) beam(F, 'metal', [a, top, -2.5], [a, top + 4.4, -1.2], 0.25, STEEL);
          beam(F, 'metal', [-W / 2, top + 4.4, -1.2], [W / 2, top + 4.4, -1.2], 0.3, STEEL);
        }
      },
    },
    style: {
      kerb: [RED, WHITE], kerbSuits: true,
      runoff: 'brand', runoffFull: true, runoffFields: 9, runoffBoth: 1, runoffHero: 'HEINEKEN 0.0', runoffFloor: [0.11, 0.11, 0.12],
      barrier: 'slab', slab: [rgb(0xe8e8ec), rgb(0x1a1a20), [0.3, 0.3, 0.35]], wallHeight: 1.45, fenceTop: 5,
      fence: true, lamps: 'flood', floodEvery: 10, verge: 'paving',
      title: ['LAS VEGAS', 'LAS VEGAS GRAND PRIX', '#00843d', '#ffffff', '#e2001a'],
      roadName: 'LAS VEGAS',
      bannerGlow: 0.55,
      boardBorder: '#ff2a8a',
    },
    fascia: ['LAS VEGAS STRIP CIRCUIT', 'LAS VEGAS GRAND PRIX'],
    fasciaColours: ['#1b1b1f', '#ffffff', '#ff2a8a'],
    skirtColour: [0.12, 0.12, 0.14],
    groundKind: 'paving',
    relief(x, z, d) { return noise(x, z) * 0.5; },
    colourAt(x, z, h, slope, d) {
      if (d < 40) return [0.22, 0.22, 0.24];
      return noise(x * 2.4, z * 2.4) > 0.45 ? [0.3, 0.28, 0.24] : [0.2, 0.2, 0.22]; // car parks, desert lots, streets
    },
    water: [lake],
    stands: [
      { at: 59, side: 'L', W: 340, tiers: 26, build: vegasStand, offset: -20 }, // the grandstand opposite the pits
      { at: 5, side: 'outside', W: 160, tiers: 20, build: vegasStand },        // Turn 1
      { at: 20, side: 'outside', W: 180, tiers: 20, build: vegasStand },       // facing the Sphere
      { at: 13, side: 'outside', W: 140, tiers: 18, build: VARIED },            // Koval
      { at: 45, side: 'inside', W: 140, tiers: 18, build: VARIED },             // the Strip by the LINQ
      { at: 55, side: 'outside', W: 140, tiers: 18, build: vegasStand },       // Harmon
    ],
    landmarks({ L, R, frameAt, kit, terrain, placed, group }) {
      const S = withScreens(createSkyline());
      // Find the nearest track point and face it.
      const near = (x, z) => { let best = 1e9, bi = 0; for (let i = 0; i < L.N; i += 2) { const d = Math.hypot(L.x[i] - x, L.z[i] - z); if (d < best) { best = d; bi = i; } } return bi; };
      const site = (px, py, clear, fn, key, footprint = clear) => {
        let [x, z] = img(px, py);
        const i = near(x, z), dx = x - L.x[i], dz = z - L.z[i], dd = Math.hypot(dx, dz) || 1;
        const need = clear + Math.max(L.wall.L[i], L.wall.R[i]) + 6;
        if (dd < need) { x = L.x[i] + (dx / dd) * need; z = L.z[i] + (dz / dd) * need; }
        const F = frameAt(x, z, Math.atan2(L.x[i] - x, L.z[i] - z), terrain.heightAt(x, z));
        fn(F);
        const c = F.at(0, 0, -footprint * 0.55);   // the resorts stand behind their frontage
        kit.footprints.push({ cx: c[0], cz: c[2], ux: F.r[0], uz: F.r[1], hw: footprint * 1.1, hd: footprint * 0.75 });
        placed[key] = 1;
        return F;
      };
      // ---- the Sphere ----
      {
        const [x, z] = img(352, 212), i = near(x, z), R0 = 78.5;
        const geo = new SphereGeometry(R0, 96, 48, 0, Math.PI * 2, 0, 2.02);
        const m = new Mesh(geo, new MeshBasicMaterial({ map: sphereTexture() }));
        m.position.set(x, terrain.heightAt(x, z) + 33.5, z);
        m.rotation.y = Math.atan2(L.x[i] - x, L.z[i] - z);
        group.add(m);
        const base = new Mesh(new CylinderGeometry(R0 * 0.92, R0 * 0.95, 4, 48), new MeshBasicMaterial({ color: 0x14121a }));
        base.position.set(x, terrain.heightAt(x, z) + 2, z); group.add(base);
        kit.footprints.push({ cx: x, cz: z, ux: 1, uz: 0, hw: R0 + 8, hd: R0 + 8 });
        placed.sphere = 1;
      }
      // ---- the Strip's resorts ----
      site(645, 850, 70, (F) => bellagio(S, F, R), 'bellagio', 100);
      site(260, 790, 60, (F) => caesars(S, F, R), 'caesars', 90);
      site(120, 690, 50, (F) => yTower(S, F, R, 108, LED.gold, 'MIRAGE'), 'mirage', 60);
      site(30, 600, 50, (F) => yTower(S, F, R, 110, LED.red, 'TI'), 'treasureIsland', 60);
      site(830, 790, 50, (F) => { cosmopolitan(S, F, R); cosmoMarquee(S, F); }, 'cosmopolitan', 60);
      site(1000, 830, 50, (F) => cityCenter(S, F, R), 'cityCenter', 70);
      site(175, 470, 60, (F) => venetian(S, F, R), 'venetian', 90);
      site(330, 610, 20, (F) => { const p = rect(60, 22, 0, -50); skinGeo(F, R, p, 0, 100, FACADES.glass); cap(F, p, 100, DARK); outline(F, p, 100, LED.blue, 0.7); text3D(F, 'THE LINQ', 0, 92, -38.6, 7, { face: LED.blue, depth: 0.9 }); videoWall(S, F, 0, 20, -38.5, 34, 17, 8, { glow: LED.blue }); }, 'linq', 40);
      site(400, 520, 90, (F) => highRoller(F), 'highRoller', 90);
      site(480, 662, 40, (F) => flamingo(S, F, R), 'flamingo', 60);
      site(650, 680, 40, (F) => paris(S, F, R), 'paris', 70);
      site(880, 665, 40, (F) => planetHollywood(S, F, R), 'planetHollywood', 50);
      site(110, 300, 60, (F) => wynn(S, F, R), 'wynn', 110);
      site(1260, 700, 60, (F) => mgm(S, F, R), 'mgm', 80);
      // Fountains in the Bellagio lake: rows of white plumes.
      { const Fo = frameAt(lx, lz, 0, 0.3); for (let k = 0; k < 40; k++) { const t = (k / 40) * 6.283, rr = lake.r * 0.55 + (k % 2) * 8; Fo.blob('neon', Math.cos(t) * rr, Math.sin(t) * rr * 0.6, 1.2, 0, 12 + (k % 4) * 8, 6, [1.6, 1.9, 2.4]); } }
      // ---- marquee pylons on the Strip ----
      const PYL = [[210, 740, 'CAESARS', LED.gold, FONTS.roman], [600, 745, 'BELLAGIO', LED.gold, FONTS.serif], [560, 680, 'Flamingo', LED.pink, FONTS.script],
        [690, 680, 'PARIS', LED.red, FONTS.serif], [800, 745, 'COSMOPOLITAN', LED.white, FONTS.sans], [930, 685, 'PLANET HOLLYWOOD', LED.violet, FONTS.block],
        [190, 560, 'VENETIAN', LED.gold, FONTS.serif], [330, 680, 'THE LINQ', LED.blue, FONTS.block], [100, 600, 'TREASURE ISLAND', LED.red, FONTS.serif]];
      let pylons = 0;
      for (const [px, py, name, col, font] of PYL) {
        let [x, z] = img(px, py);
        const i = near(x, z), dx = x - L.x[i], dz = z - L.z[i], dd = Math.hypot(dx, dz) || 1, need = Math.max(L.wall.L[i], L.wall.R[i]) + 9;
        if (dd < need) { x = L.x[i] + (dx / dd) * need; z = L.z[i] + (dz / dd) * need; }
        // Its faces square to the traffic both ways.
        pylon(S, frameAt(x, z, Math.atan2(L.tx[i], L.tz[i]), terrain.heightAt(x, z)), name, col, [pylons % 16, (pylons * 7 + 3) % 16], font);
        kit.footprints.push({ cx: x, cz: z, ux: 1, uz: 0, hw: 9, hd: 9 });
        pylons++;
      }
      // ---- roadside billboards on monopoles, both faces lit ----
      let boards = 0;
      for (let s = 140; s < L.length; s += 210) {
        const side = boards % 2 ? 'L' : 'R', fr = kit.frontage(s, side, 7);
        if (!kit.isFree(fr.x, fr.z, 4) || kit.overlaps({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 9, hd: 9 })) continue;
        const i = fr.i;
        billboard(S, frameAt(fr.x, fr.z, Math.atan2(L.tx[i], L.tz[i]), terrain.heightAt(fr.x, fr.z)), R, 13 + R() * 4, 16, [(boards * 5) % 16, (boards * 3 + 1) % 16]);
        kit.footprints.push({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 9, hd: 3 });
        boards++;
      }
      // ---- the lighting trusses spanning the track, lamps hanging under them ----
      let trusses = 0;
      for (let s = 60; s < L.length; s += 130) {
        const i = Math.floor(s / L.ds) % L.N;
        if (Math.abs(L.k[i]) > 1 / 120) continue;
        const tx = L.tx[i], tz = L.tz[i], F = frameAt(L.x[i], L.z[i], Math.atan2(-tx, -tz), L.yAt(i, 0));
        const left = F.r[0] * L.nx[i] + F.r[1] * L.nz[i] > 0 ? 1 : -1, a0 = Math.min(left * (L.wall.L[i] + 2), -left * (L.wall.R[i] + 2)), a1 = Math.max(left * (L.wall.L[i] + 2), -left * (L.wall.R[i] + 2));
        const H = 11;
        for (const a of [a0, a1]) { beam(F, 'metal', [a, 0, -0.6], [a, H + 1.4, -0.6], 0.25, STEEL); beam(F, 'metal', [a, 0, 0.6], [a, H + 1.4, 0.6], 0.25, STEEL); }
        for (const [y, b] of [[H, -0.6], [H, 0.6], [H + 1.4, -0.6], [H + 1.4, 0.6]]) beam(F, 'metal', [a0, y, b], [a1, y, b], 0.1, STEEL);
        for (let a = a0; a < a1; a += 1.4) { beam(F, 'metal', [a, H, -0.6], [a + 1.4, H + 1.4, -0.6], 0.05, STEEL); beam(F, 'metal', [a, H, 0.6], [a + 1.4, H + 1.4, 0.6], 0.05, STEEL); }
        for (let a = a0 + 2; a < a1 - 1; a += 4) { F.box('metal', a - 0.5, a + 0.5, H - 0.7, H, -0.4, 0.4, rgb(0x2a2a2e)); F.box('neon', a - 0.4, a + 0.4, H - 0.75, H - 0.7, -0.35, 0.35, [3, 3, 2.9]); }
        trusses++;
      }
      // ---- pedestrian bridges over the Strip at Flamingo Road ----
      let bridges = 0;
      for (const k of [49, 51]) {
        const i = Math.floor((L.pointS(k) + 40) / L.ds) % L.N, tx = L.tx[i], tz = L.tz[i], F = frameAt(L.x[i], L.z[i], Math.atan2(-tx, -tz), L.yAt(i, 0));
        const w = Math.max(L.wall.L[i], L.wall.R[i]) + 10, H = 8;
        F.box('stucco', -w, w, H, H + 1.2, -3, 3, rgb(0x5a5e66));
        F.box('glass', -w, w, H + 1.2, H + 3.6, -3, -2.8, null); F.box('glass', -w, w, H + 1.2, H + 3.6, 2.8, 3, null);
        F.box('stucco', -w, w, H + 3.6, H + 4.2, -3.2, 3.2, rgb(0x6a6e76));
        F.box('neon', -w, w, H - 0.1, H, -2.6, 2.6, LED.blue);
        for (const a of [-w, w]) F.box('stucco', a - 4, a + 4, 0, H + 6, -5, 5, rgb(0x4a4e56));
        bridges++;
      }
      // ---- palms along the sidewalks of the Strip and Koval ----
      let palms = 0;
      for (const side of ['L', 'R']) for (let s = 0; s < L.length; s += 20) {
        const fr = kit.frontage(s, side, 3 + R() * 2);
        if (!kit.isFree(fr.x, fr.z, 1) || kit.overlaps({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 1.2, hd: 1.2 })) continue;
        const F = frameAt(fr.x, fr.z, R() * 6.28);
        palm(F, R, 9 + R() * 4); F.box('neon', -0.25, 0.25, 0, 0.3, -0.25, 0.25, [2.6, 2.2, 1.4]);
        palms++;
      }
      const NAMES = ['HOTEL', 'CASINO', 'RESORT', 'SUITES', 'TOWER', 'PALMS', 'GRAND', 'ROYALE', 'HORIZON', 'OASIS', 'SAHARA SUN', 'DESERT STAR', 'SILVER CREEK', 'GOLDEN ACE'];
      // ---- the street frontage: it is a street circuit, so casinos, hotels and garages line the lap ----
      let front = 0;
      for (const side of ['L', 'R']) for (let s = 30; s < L.length; s += 44 + R() * 22) {
        if (R() < 0.08) continue;
        const W = 34 + R() * 26, D = 16 + R() * 12, fr = kit.frontage(s, side, 17 + R() * 6);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, W + 26, D + 36, 2, null);
        if (!F) continue;
        resortTower(S, F, R, W, D, R() < 0.3 ? 24 + R() * 20 : 45 + R() * R() * 130, { name: R() < 0.5 ? pick(R, NAMES) : null, font: pick(R, [FONTS.block, FONTS.serif, FONTS.sans, FONTS.script]) });
        front++;
      }
      // ---- the rest of the city: resort towers with real massing near the track, garages, the skyline beyond ----
      let towers = 0, garages = 0;
      const b = terrain.bounds;
      for (let z = b.minZ + 60; z < b.maxZ - 60; z += 100) for (let x = b.minX + 60; x < b.maxX - 60; x += 100) {
        const px = x + (R() - 0.5) * 40, pz = z + (R() - 0.5) * 40, d = terrain.distSmooth(px, pz);
        if (d < 40 || d > 950 || R() < 0.3 || Math.hypot(px - lx, pz - lz) < lake.r + 40) continue;
        const i = near(px, pz), dl = Math.hypot(L.x[i] - px, L.z[i] - pz) || 1, dx = (L.x[i] - px) / dl, dz = (L.z[i] - pz) / dl;
        if (d < 480) {
          if (R() < 0.25) { // a parking garage: open decks, ramps, the cars' lights, a lit stair core
            const W = 50 + R() * 20, D = 34 + R() * 12, F = kit.lot(px, pz, dx, dz, W, D, 3, null);
            if (!F) continue;
            for (let f = 0; f < 6; f++) {
              F.box('concrete', -W / 2, W / 2, f * 3.2, f * 3.2 + 0.45, -D, 0, rgb(0x4a4a4e));
              F.box('concrete', -W / 2, W / 2, f * 3.2 + 0.45, f * 3.2 + 1.4, -0.3, 0, rgb(0x5a5a5e));            // the parapet
              F.face('neon', -W / 2, W / 2, f * 3.2 + 0.5, f * 3.2 + 0.7, 0.02, [1.4, 1.3, 1.0]);
              for (let a = -W / 2 + 3; a < W / 2 - 3; a += 5.5) if (R() < 0.6) F.box('stucco', a - 1, a + 1, f * 3.2 + 0.45, f * 3.2 + 1.9, -4.8, -0.6, pick(R, [rgb(0xb0b0b4), rgb(0x2a2a30), rgb(0x8a1a1a), rgb(0x1a3a6a)]));
            }
            for (const a of [-W / 2, -W / 6, W / 6, W / 2]) F.box('concrete', a - 0.5, a + 0.5, 0, 19.2, -D, 0, rgb(0x4a4a4e));
            F.box('stucco', W / 2 - 6, W / 2, 0, 22, -6, 0, DARK); F.face('winLit', W / 2 - 5.5, W / 2 - 0.5, 1, 21, 0.02, [1.2, 1.6, 2.2]);
            if (R() < 0.5) videoWall(S, F, -W / 4, 23.5, -0.5, 18, 9, Math.floor(R() * 16));
            garages++;
          } else {
            const W = 30 + R() * 22, D = 20 + R() * 12, H = 45 + R() * R() * 140;
            const F = kit.lot(px + dx * 10, pz + dz * 10, dx, dz, W + 26, D + 36, 3, null);
            if (!F) continue;
            resortTower(S, F, R, W, D, H, { name: R() < 0.45 ? pick(R, NAMES) : null, font: pick(R, [FONTS.block, FONTS.serif, FONTS.sans]) });
            towers++;
          }
        } else {
          const W = 28 + R() * 20, D = 24 + R() * 16, F = kit.lot(px, pz, dx, dz, W + 6, D + 6, 3, null);
          if (!F) continue;
          tower(S, F, R, pick(R, ['slab', 'hotel', 'round', 'setback', 'twin']), W, D, 40 + R() * R() * 110);
          towers++;
        }
      }
      group.add(S.build());
      placed.vegas = { pylons, boards, trusses, bridges, palms, front, towers, garages };
    },
    trees: {
      variants: [palm],
      attempts: 4000,
      scale: [1],
      test(x, z, d, h, R) { return d > 30 && d < 300 && R() < 0.2 ? 0 : -1; },
    },
  });
}
