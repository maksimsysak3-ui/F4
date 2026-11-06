import { skinGeo } from './facades.js?v=b8df018';
import { CanvasTexture, SRGBColorSpace, RepeatWrapping, MeshStandardMaterial, DoubleSide } from 'three';
import { MeshBuilder } from '../../car/meshBuilder.js?v=b8df018';
import { rgb, scaleC, pick, Frame } from '../street/kit.js?v=b8df018';
import { beam } from '../night/venue.js?v=b8df018';

/*
 * Singapore's skyline at night. Towers are skinned with night facades painted here (not the
 * generic facade): each a 32 x 32 grid of windows where only some are lit, in the colours of what
 * is behind them (cool office floors, warm hotel rooms, flats with balconies, LED-banded glass),
 * offset per tower so no two read the same. Shapes follow the real skyline: slabs with setbacks,
 * round and octagonal towers, triangular prisms, sails, twin slabs with a sky bridge, sloped and
 * stepped crowns, each with its own lit crown.
 */

const BAY = 1.6, FLOOR = 3.5, CELLS = 64, PX = 1024;

function facadeTexture(kind, seed) {
  const c = document.createElement('canvas');
  c.width = c.height = PX;
  const g = c.getContext('2d');
  let s = seed;
  const R = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const cell = PX / CELLS;
  const base = { office: '#0a1220', hotel: '#120e10', resi: '#14120f', led: '#060a14', stone: '#1a1814' }[kind];
  g.fillStyle = base; g.fillRect(0, 0, PX, PX);
  for (let row = 0; row < CELLS; row++) {
    const rowLit = kind === 'office' ? R() < 0.3 : kind === 'led' ? row % 4 === 0 : false;
    const rowWarm = R() < 0.5;
    for (let col = 0; col < CELLS; col++) {
      let p = { office: rowLit ? 0.9 : 0.12, hotel: 0.42, resi: 0.36, led: 0.1, stone: 0.3 }[kind];
      if (R() > p) {
        // unlit: dark glass catching a little city glow
        g.fillStyle = `rgba(${40 + R() * 30},${50 + R() * 30},${70 + R() * 40},0.35)`;
        g.fillRect(col * cell + 1, row * cell + 3, cell - 2, cell - 7);
        continue;
      }
      let colour;
      if (kind === 'office') colour = R() < 0.85 ? `rgb(${200 + R() * 40},${220 + R() * 30},255)` : 'rgb(255,236,190)';
      else if (kind === 'hotel') colour = R() < 0.8 ? `rgb(255,${190 + R() * 40},${110 + R() * 50})` : 'rgb(150,190,255)';
      else if (kind === 'resi') colour = rowWarm && R() < 0.7 ? `rgb(255,${200 + R() * 30},${140 + R() * 40})` : `rgb(${210 + R() * 40},${230 + R() * 20},255)`;
      else if (kind === 'stone') colour = `rgb(255,${210 + R() * 30},${150 + R() * 40})`;
      else colour = 'rgb(200,230,255)';
      g.fillStyle = colour;
      const k = 0.55 + R() * 0.45; // dimmer and brighter windows
      g.globalAlpha = k;
      g.fillRect(col * cell + 1, row * cell + 3, cell - 2, cell - 7);
      g.globalAlpha = 1;
    }
    if (kind === 'led' && row % 4 === 0) { g.fillStyle = R() < 0.5 ? '#3ad0ff' : '#5a7aff'; g.fillRect(0, row * cell + cell - 3, PX, 3); }
    if (kind === 'resi') { g.fillStyle = 'rgba(160,150,140,0.25)'; g.fillRect(0, row * cell + cell - 2, PX, 2); } // balcony slabs
  }
  // mullions
  g.fillStyle = 'rgba(0,0,0,0.35)';
  for (let col = 0; col <= CELLS; col += 4) g.fillRect(col * cell - 1, 0, 2, PX);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace; t.wrapS = t.wrapT = RepeatWrapping; t.anisotropy = 4;
  return t;
}

const SIGNS = [['UOB', '#0b3a8a', '#ffffff'], ['OCBC', '#e2231a', '#ffffff'], ['DBS', '#ff3030', '#ffffff'], ['Maybank', '#ffc72c', '#1b1b1f'], ['HSBC', '#ffffff', '#db0011'],
  ['citi', '#1a5aa8', '#ffffff'], ['MANDARIN ORIENTAL', '#1b1b1f', '#d8b070'], ['PAN PACIFIC', '#1b1b1f', '#ffffff'], ['Ritz-Carlton', '#1b1b1f', '#e8d8b0'], ['SUNTEC', '#1b1b1f', '#3ad0ff'],
  ['Singtel', '#e2231a', '#ffffff'], ['GREAT EASTERN', '#c8102e', '#ffffff']];
function signAtlas() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 128 * SIGNS.length;
  const g = c.getContext('2d');
  SIGNS.forEach(([t, bg, fg], k) => {
    g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, k * 128, 1024, 128);
    g.font = `700 ${t.length > 8 ? 76 : 100}px "Arial Black", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = bg === '#1b1b1f' ? fg : bg; g.fillText(t, 512, k * 128 + 66, 980);
  });
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/**
 * Daytime curtain walls: each pane reflects the sky (light at the top of the sheet, deeper below),
 * with a mullion grid, spandrel bands at every floor and panes varying a little in tint, so a tower
 * reads as glass in sunlight, not as a lit box. kind: blue | teal | grey | dark | gold | concrete.
 */
function dayFacade(kind, seed) {
  const c = document.createElement('canvas'); c.width = c.height = PX;
  const g = c.getContext('2d');
  let s = seed;
  const R = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const cell = PX / CELLS;
  const base = { blue: [86, 128, 178], teal: [84, 140, 150], grey: [128, 140, 154], dark: [46, 62, 82], gold: [196, 160, 92], concrete: [196, 190, 176] }[kind];
  for (let row = 0; row < CELLS; row++) for (let col = 0; col < CELLS; col++) {
    const sky = 1.12 - (row / CELLS) * 0.3, v = 0.9 + R() * 0.2, cloud = R() < 0.03 ? 1.25 : 1;
    const [r0, g0, b0] = base.map((x) => Math.min(255, x * sky * v * cloud));
    if (kind === 'concrete') {
      g.fillStyle = `rgb(${r0},${g0},${b0})`; g.fillRect(col * cell, row * cell, cell, cell);
      g.fillStyle = `rgba(30,40,52,${0.75 + R() * 0.2})`; g.fillRect(col * cell + 3, row * cell + 4, cell - 6, cell - 9); // punched window
      continue;
    }
    g.fillStyle = `rgb(${r0},${g0},${b0})`; g.fillRect(col * cell, row * cell, cell, cell);
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(col * cell, row * cell, cell, 2);       // the pane's top highlight
  }
  g.fillStyle = 'rgba(30,36,44,0.55)';
  for (let row = 0; row <= CELLS; row++) g.fillRect(0, row * cell - 2, PX, 4);                  // spandrels
  g.fillStyle = 'rgba(210,216,224,0.5)';
  for (let col = 0; col <= CELLS; col += 2) g.fillRect(col * cell - 1, 0, 2, PX);               // mullions
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.wrapS = t.wrapT = RepeatWrapping; t.anisotropy = 8;
  return t;
}

/** The daytime skyline set: keys sgBlue, sgTeal, sgGrey, sgDark, sgGold, sgConc. */
export function createDaySkyline() {
  const mats = {};
  [['sgBlue', 'blue'], ['sgTeal', 'teal'], ['sgGrey', 'grey'], ['sgDark', 'dark'], ['sgGold', 'gold'], ['sgConc', 'concrete']].forEach(([k, kind], i) => {
    const glass = kind !== 'concrete';
    mats[k] = new MeshStandardMaterial({ map: dayFacade(kind, 311 + i * 7919), roughness: glass ? 0.12 : 0.85, metalness: glass ? 0.55 : 0, envMapIntensity: glass ? 1.4 : 0.6, side: DoubleSide });
  });
  const mb = new MeshBuilder();
  return { mb, mats, build: () => mb.build(mats) };
}

export function createSkyline() {
  const kinds = ['office', 'office', 'hotel', 'resi', 'led', 'stone'];
  const mats = {};
  kinds.forEach((k, i) => {
    const t = facadeTexture(k, 97 + i * 7919);
    mats[`sg${i}`] = new MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.85, roughness: 0.35, metalness: 0.4, side: DoubleSide });
  });
  const sign = signAtlas();
  mats.sgsign = new MeshStandardMaterial({ map: sign, emissiveMap: sign, emissive: 0xffffff, emissiveIntensity: 1.6, transparent: true, alphaTest: 0.3, side: DoubleSide });
  const mb = new MeshBuilder();
  return { mb, mats, kinds, build: () => mb.build(mats) };
}

/** The night-facade skin round a prism (poly in frame a,b), from y0 to y1. */
export function skin(S, F, key, poly, y0, y1, r) {
  // Near the circuit a scene may ask for real geometric facades (S.geoAt / S.geoStyle).
  if (S.geoAt && S.geoAt(F)) { skinGeo(F, r, poly, y0, y1, S.geoStyle(key)); return; }
  const G = new Frame(S.mb, F.o[0], F.o[1], F.o[2], F.r[0], F.r[1]);
  const u0 = r() * 8, v0 = Math.floor(r() * 8) / CELLS;
  let u = u0;
  for (let i = 0; i < poly.length; i++) {
    const [a0, b0] = poly[i], [a1, b1] = poly[(i + 1) % poly.length], len = Math.hypot(a1 - a0, b1 - b0);
    const du = len / (BAY * CELLS), vb = v0 + y0 / (FLOOR * CELLS), vt = v0 + y1 / (FLOOR * CELLS);
    G.mb.color = null;
    G.mb.quadUV(key, G.at(a0, y0, b0), G.at(a1, y0, b1), G.at(a1, y1, b1), G.at(a0, y1, b0), [u, vb], [u + du, vb], [u + du, vt], [u, vt]);
    u += du;
  }
}

export const ngon = (n, rx, rz, rot = 0, ox = 0, oz = 0) => Array.from({ length: n }, (_, k) => { const t = rot + (k / n) * Math.PI * 2; return [ox + Math.cos(t) * rx, oz + Math.sin(t) * rz]; });
export const rect = (w, d, ox = 0, oz = 0) => [[ox - w / 2, oz + d / 2], [ox + w / 2, oz + d / 2], [ox + w / 2, oz - d / 2], [ox - w / 2, oz - d / 2]];
const shrink = (p, k) => { const cx = p.reduce((s, q) => s + q[0], 0) / p.length, cz = p.reduce((s, q) => s + q[1], 0) / p.length; return p.map(([a, b]) => [cx + (a - cx) * k, cz + (b - cz) * k]); };

/** Lid on a prism: a dark roof slab and an LED outline. */
function lid(F, poly, y, led) {
  const cx = poly.reduce((t, q) => t + q[0], 0) / poly.length, cz = poly.reduce((t, q) => t + q[1], 0) / poly.length;
  F.mb.color = rgb(0x14161c);
  for (let i = 0; i < poly.length; i++) { const [a0, b0] = poly[i], [a1, b1] = poly[(i + 1) % poly.length]; F.mb.triFacing('stucco', F.at(cx, y + 0.8, cz), F.at(a0, y + 0.8, b0), F.at(a1, y + 0.8, b1), [0, 1, 0]); }
  F.mb.color = null;
  if (led) for (let i = 0; i < poly.length; i++) { const [a0, b0] = poly[i], [a1, b1] = poly[(i + 1) % poly.length]; beam(F, 'neon', [a0, y + 0.8, b0], [a1, y + 0.8, b1], 0.35, led); }
}

const CROWN = [[2.6, 2.6, 2.4], [0.5, 1.8, 3.2], [2.8, 0.6, 2.2], [2.8, 2.0, 0.7], [0.4, 2.6, 1.8], [1.2, 1.4, 3.2]];

/** A corporate sign near the crown on the front face (b = front), lit. */
function crownSign(S, F, r, front, y, w) {
  const G = new Frame(S.mb, F.o[0], F.o[1], F.o[2], F.r[0], F.r[1]);
  const k = Math.floor(r() * SIGNS.length), v0 = 1 - (k + 1) / SIGNS.length, v1 = 1 - k / SIGNS.length, h = w / 8;
  G.mb.color = null;
  G.mb.quadUV('sgsign', G.at(-w / 2, y - h, front + 0.4), G.at(w / 2, y - h, front + 0.4), G.at(w / 2, y, front + 0.4), G.at(-w / 2, y, front + 0.4), [0, v0], [1, v0], [1, v1], [0, v1]);
}

/** The architecture beyond the windows: mechanical-floor bands, corner fins, rooftop plant and masts, a helipad, sky gardens. */
function decorate(F, r, poly, H, led, { fins = true, band = true, roof = true } = {}) {
  const GREY = rgb(0x3a3e46), LIGHT = rgb(0x8a929e);
  const edges = (y, rad, col) => { for (let i = 0; i < poly.length; i++) { const [a0, b0] = poly[i], [a1, b1] = poly[(i + 1) % poly.length]; beam(F, 'stucco', [a0, y, b0], [a1, y, b1], rad, col); } };
  if (band) for (let y = 42 + r() * 20; y < H - 12; y += 45 + r() * 20) { edges(y, 0.9, GREY); if (r() < 0.5) edges(y + 1.1, 0.12, [1.2, 1.4, 1.8]); }
  if (fins && poly.length <= 8) for (const [a, b] of poly) beam(F, 'stucco', [a, 6, b], [a, H, b], 0.55, LIGHT);
  if (!roof) return;
  const cx = poly.reduce((t, q) => t + q[0], 0) / poly.length, cz = poly.reduce((t, q) => t + q[1], 0) / poly.length;
  const v = r();
  if (v < 0.3) { // helipad
    F.cylinder('stucco', cx, cz, 9, H + 0.8, H + 1.4, 16, rgb(0x2a2e36));
    F.cylinder('neon', cx, cz, 9.1, H + 1.3, H + 1.5, 16, [2.6, 2.4, 1.2]);
    F.box('neon', cx - 2.5, cx - 1.7, H + 1.45, H + 1.55, cz - 3, cz + 3, [2.4, 2.4, 2.4]); F.box('neon', cx + 1.7, cx + 2.5, H + 1.45, H + 1.55, cz - 3, cz + 3, [2.4, 2.4, 2.4]); F.box('neon', cx - 2.5, cx + 2.5, H + 1.45, H + 1.55, cz - 0.4, cz + 0.4, [2.4, 2.4, 2.4]);
  } else if (v < 0.65) { // cooling towers and plant
    for (let k = 0; k < 3; k++) F.cylinder('metal', cx - 6 + k * 6, cz, 2.4, H + 0.8, H + 5, 10, rgb(0x6a6e74));
    F.box('metal', cx - 8, cx + 8, H + 0.8, H + 3.5, cz + 4, cz + 8, rgb(0x5a5e66));
  } else if (v < 0.85) { // a sky garden on the roof
    for (let k = 0; k < 6; k++) F.blob('leaf', cx + (r() - 0.5) * 14, cz + (r() - 0.5) * 10, 2 + r() * 1.5, H + 0.8, H + 4.5, 6, rgb(0x1e3a22));
    F.box('neon', cx - 8, cx + 8, H + 0.8, H + 1, cz - 6, cz - 5.8, [2.2, 2.0, 1.4]);
  }
  if (r() < 0.45) { beam(F, 'metal', [cx, H + 0.8, cz], [cx, H + 18 + r() * 14, cz], 0.35, LIGHT); }
}

/**
 * A tower of the given type, base centred on (0, -D/2) of the lot frame (front edge at b = 0).
 * type: slab | setback | round | oct | tri | sail | twin | hotel | resi | sloped
 */
export function tower(S, F, r, type, W, D, H) {
  const cz = -D / 2, led = pick(r, CROWN), key = (k) => `sg${k}`;
  const off = pick(r, [0, 1, 4]), hot = 2, res = 3, ledk = 4, stone = 5;
  switch (type) {
    case 'slab': {
      const p = rect(W, D, 0, cz);
      skin(S, F, key(off), p, 0, H, r); lid(F, p, H, led);
      if (r() < 0.5) F.box('neon', -0.3, 0.3, H + 0.8, H + 22, cz - 0.3, cz + 0.3, scaleC(led, 0.8)); // mast
      break;
    }
    case 'setback': {
      let p = rect(W, D, 0, cz), y = 0;
      for (const f of [0.55, 0.28, 0.17]) { skin(S, F, key(off), p, y, y + H * f, r); lid(F, p, y + H * f, led); y += H * f; p = shrink(p, 0.78); }
      break;
    }
    case 'round': {
      const p = ngon(18, W / 2, D / 2, 0, 0, cz);
      skin(S, F, key(r() < 0.5 ? off : ledk), p, 0, H, r); lid(F, p, H, led);
      F.cylinder('neon', 0, cz, Math.min(W, D) * 0.3, H + 0.8, H + 1.6, 12, scaleC(led, 0.6));
      break;
    }
    case 'oct': { // UOB Plaza: an octagon with its disc crown
      const p = ngon(8, W / 2, D / 2, Math.PI / 8, 0, cz);
      skin(S, F, key(off), p, 0, H, r); lid(F, p, H, null);
      F.cylinder('stucco', 0, cz, W * 0.62, H + 4, H + 7, 18, rgb(0x2a2e36));
      F.cylinder('neon', 0, cz, W * 0.63, H + 6.6, H + 7.2, 18, led);
      beam(F, 'metal', [0, H, cz], [0, H + 4, cz], 1.2, rgb(0x2a2e36));
      break;
    }
    case 'tri': { // One Raffles Place: triangular prisms in pairs
      const p1 = [[-W / 2, cz + D / 2], [W / 2, cz + D / 2], [-W / 2, cz - D / 2]];
      const p2 = [[W / 2 + 2, cz + D / 2], [W / 2 + 2, cz - D / 2], [-W / 2 + 2, cz - D / 2]];
      skin(S, F, key(off), p1, 0, H, r); lid(F, p1, H, led);
      skin(S, F, key(off), p2, 0, H * 0.82, r); lid(F, p2, H * 0.82, led);
      break;
    }
    case 'sail': { // The Sail: a lens in plan, rising to a raked top
      const p = Array.from({ length: 10 }, (_, k) => { const t = (k / 10) * Math.PI * 2; return [Math.cos(t) * W / 2, cz + Math.sin(t) * D / 2 * Math.abs(Math.cos(t * 0.5)) * 0.6]; });
      skin(S, F, key(ledk), p, 0, H, r); lid(F, p, H, led);
      F.block('stucco', rect(W * 0.5, D * 0.3, W * 0.15, cz), rect(W * 0.08, D * 0.15, W * 0.4, cz), H, H + 22, rgb(0x2a3040)); // the raked top
      break;
    }
    case 'twin': {
      const p1 = rect(W * 0.42, D, -W * 0.29, cz), p2 = rect(W * 0.42, D, W * 0.29, cz);
      skin(S, F, key(hot), p1, 0, H, r); skin(S, F, key(hot), p2, 0, H * 0.94, r);
      lid(F, p1, H, led); lid(F, p2, H * 0.94, led);
      F.box('stucco', -W * 0.1, W * 0.1, H * 0.7, H * 0.7 + 6, cz - D * 0.3, cz + D * 0.3, rgb(0x2a2e36)); // the sky bridge
      F.box('neon', -W * 0.1, W * 0.1, H * 0.7 + 6, H * 0.7 + 6.4, cz - D * 0.3, cz + D * 0.3, led);
      break;
    }
    case 'hotel': { // a long slab of rooms (the Marina Centre hotels), warm
      const p = rect(W, D * 0.5, 0, cz);
      skin(S, F, key(hot), p, 0, H, r); lid(F, p, H, null);
      F.box('neon', -W / 2, W / 2, H + 0.8, H + 2.4, cz + D * 0.25, cz + D * 0.25 + 0.2, [2.8, 2.4, 1.6]); // the name sign
      break;
    }
    case 'resi': { // HDB slab blocks: long, mid-rise, flats with balconies
      const p = rect(W, D * 0.45, 0, cz);
      skin(S, F, key(res), p, 0, H, r); lid(F, p, H, null);
      F.box('stucco', -W / 2 - 0.3, W / 2 + 0.3, H, H + 3, cz - D * 0.23, cz + D * 0.23, rgb(0x2a2a2e));
      break;
    }
    default: { // sloped crown (Guoco, Republic Plaza)
      const p = rect(W, D, 0, cz);
      skin(S, F, key(off), p, 0, H, r);
      F.block('stucco', p, [[-W / 2, cz + D / 2], [W / 2, cz + D / 2], [W / 2, cz + D / 2 - 2], [-W / 2, cz + D / 2 - 2]], H, H + D * 0.8, rgb(0x2a3040));
      for (const [a, b] of [[-W / 2, cz - D / 2], [W / 2, cz - D / 2]]) beam(F, 'neon', [a, H, b], [a, H + D * 0.8, cz + D / 2 - 1], 0.35, led);
    }
  }
  // Architecture and the crown sign.
  const plan = type === 'round' ? ngon(18, W / 2, D / 2, 0, 0, cz) : type === 'oct' ? ngon(8, W / 2, D / 2, Math.PI / 8, 0, cz) : type === 'hotel' || type === 'resi' ? rect(W, D * (type === 'hotel' ? 0.5 : 0.45), 0, cz) : rect(W, D, 0, cz);
  if (type !== 'tri' && type !== 'twin' && type !== 'sail' && type !== 'setback') decorate(F, r, plan, H, led, { fins: type !== 'round' && type !== 'resi', roof: type !== 'oct' && type !== 'sloped' });
  if (type === 'setback') decorate(F, r, plan, H * 0.55, led, { roof: false });
  const front = type === 'hotel' ? cz + D * 0.25 : type === 'resi' ? cz + D * 0.225 : cz + D / 2;
  if (type !== 'resi' && type !== 'round' && type !== 'sail' && r() < (H > 150 ? 0.8 : 0.45)) crownSign(S, F, r, front, (type === 'setback' ? H * 0.55 : type === 'sloped' ? H : H) - 3, Math.min(W * 0.8, 34));
  // Balcony slabs on the flats, every floor, proud of the facade.
  if (type === 'resi') for (let y = 3.5; y < H; y += 3.5) F.box('stucco', -W / 2 + 1, W / 2 - 1, y - 0.15, y, front, front + 1.4, rgb(0x4a4844));
  // A podium at the foot: shopfronts lit, an LED fascia.
  F.box('stucco', -W / 2 - 3, W / 2 + 3, 0, 6, -D - 2, 0.5, rgb(0x1a1c22));
  F.face('winLit', -W / 2 - 2, W / 2 + 2, 0.4, 5, 0.52, pick(r, [[1.6, 1.4, 1.0], [1.2, 1.4, 1.7], [1.7, 1.2, 1.4]]));
  F.box('neon', -W / 2 - 3, W / 2 + 3, 5.8, 6.1, 0.5, 0.7, scaleC(led, 0.8));
  F.box('neon', -0.4, 0.4, H + 1, H + 1.6, cz - 0.4, cz + 0.4, [3, 0.3, 0.2]); // aviation light
}

/**
 * A building right on the circuit: a two-storey podium with an arcade of columns, lit shopfronts,
 * awnings, a lit sign over the entrance, planters with trees, then a tower above (any type) set back.
 */
export function streetBuilding(S, F, r, W, D, H, type) {
  const style = Math.floor(r() * 3), warm = pick(r, [[1.6, 1.3, 0.9], [1.5, 1.4, 1.2], [1.7, 1.2, 1.0]]);
  const BAYW = 4.2, bays = Math.max(3, Math.floor((W - 1) / BAYW)), x0 = -(bays * BAYW) / 2;
  const NIGHTK = 0.55; // facades in the night: lit by the street lamps and the shops, not by day
  const shop = (a, y0, y1, b) => { // a lit shop window with mullions, a door at one side, a sill and a hanging sign
    F.face('winLit', a - 1.5, a + 1.5, y0, y1, b, warm);
    for (const m of [-0.5, 0.5]) F.box('trim', a + m - 0.05, a + m + 0.05, y0, y1, b, b + 0.06, rgb(0x2a2a2e));
    F.box('trim', a - 1.6, a + 1.6, y0 + 1.2, y0 + 1.28, b, b + 0.06, rgb(0x2a2a2e)); // transom
    F.face('trim', a + 0.9, a + 1.5, y0, y0 + 2.2, b + 0.01, pick(r, [rgb(0x5a3a22), rgb(0x2a2a2e), rgb(0x6a2a24)]));
    if (r() < 0.6) { F.box('metal', a - 0.03, a + 0.03, y1 + 0.2, y1 + 0.6, b, b + 0.7, rgb(0x2a2a2e)); F.box('neon', a - 0.6, a + 0.6, y1 - 0.4, y1 + 0.25, b + 0.6, b + 0.68, pick(r, [[2.6, 0.6, 0.5], [0.6, 2.0, 2.8], [2.6, 2.2, 0.6], [2.4, 2.4, 2.3]])); }
  };
  if (style === 0) {
    // Colonial shophouse podium: pastel render, a five-foot way behind an arcade of piers, shutters above.
    const wall = scaleC(pick(r, [rgb(0xf0dcc0), rgb(0xd8ecd8), rgb(0xf4d8dc), rgb(0xe8e0b0), rgb(0xd8e4f4), rgb(0xf4f0e6)]), NIGHTK), trim = scaleC(rgb(0xf4f2ea), NIGHTK);
    F.box('stucco', -W / 2, W / 2, 0, 10, -D, -3, wall);                                  // the house behind the arcade
    F.box('stucco', -W / 2, W / 2, 4.2, 10, -3, 0, wall);                                 // the floor above, over the walkway
    for (let k = 0; k <= bays; k++) { const a = x0 + k * BAYW; F.box('stucco', a - 0.35, a + 0.35, 0, 4.2, -0.4, 0.2, trim); F.box('stucco', a - 0.5, a + 0.5, 0, 0.5, -0.5, 0.3, trim); }
    for (let k = 0; k < bays; k++) {
      const a = x0 + (k + 0.5) * BAYW;
      F.blob('stucco', a, 0.05, BAYW / 2 - 0.35, 3.3, 4.5, 10, wall);                    // the arch's spandrel
      shop(a, 0.25, 3.2, -2.98);
      for (const o of [-0.85, 0.85]) {                                                   // a pair of shuttered windows above
        F.face('glass', a + o - 0.45, a + o + 0.45, 5.6, 8.3, 0.02, null);
        F.box('trim', a + o - 0.55, a + o + 0.55, 5.4, 5.6, 0, 0.25, trim);
        for (let y = 5.8; y < 8.2; y += 0.3) F.box('trim', a + o - 0.45, a + o - 0.05, y, y + 0.1, 0.02, 0.1, scaleC(pick(r, [rgb(0x2a6a4a), rgb(0x2a4a6a), rgb(0x8a6a3a)]), NIGHTK));
      }
      F.box('trim', a - 0.3, a + 0.3, 8.6, 9.4, 0, 0.12, trim);                          // a plaster medallion
    }
    F.box('stucco', -W / 2 - 0.1, W / 2 + 0.1, 4.2, 4.6, -0.1, 0.35, trim);              // string course
    F.box('stucco', -W / 2 - 0.2, W / 2 + 0.2, 9.6, 10.3, -0.2, 0.45, trim);             // cornice
  } else if (style === 1) {
    // River warehouse (godown): brick piers, arched openings with cream surrounds, a hipped roof edge.
    const brick = scaleC(pick(r, [rgb(0x9a4a32), rgb(0x8a4a3a), rgb(0xa85a3a)]), NIGHTK), cream = scaleC(rgb(0xe8dcc0), NIGHTK);
    F.box('stucco', -W / 2, W / 2, 0, 10, -D, -0.6, brick);
    F.box('stucco', -W / 2 - 0.15, W / 2 + 0.15, 0, 0.7, -0.75, -0.45, cream);
    F.box('stucco', -W / 2 - 0.15, W / 2 + 0.15, 4.6, 5.1, -0.75, -0.45, cream);
    for (let k = 0; k <= bays; k++) { const a = x0 + k * BAYW; F.box('stucco', a - 0.45, a + 0.45, 0.7, 9.4, -0.6, -0.25, scaleC(brick, 0.9)); }
    for (let k = 0; k < bays; k++) {
      const a = x0 + (k + 0.5) * BAYW;
      F.box('stucco', a - 1.75, a + 1.75, 0.7, 3.8, -0.6, -0.5, cream);
      shop(a, 0.7, 3.6, -0.48);
      F.blob('stucco', a, -0.55, 1.75, 3.2, 4.5, 10, cream);                              // the arch
      F.box('stucco', a - 0.25, a + 0.25, 4.0, 4.6, -0.6, -0.35, cream);                  // keystone
      F.face('glass', a - 1.2, a + 1.2, 6.0, 8.6, -0.58, null);
      F.box('stucco', a - 1.4, a + 1.4, 5.8, 6.0, -0.6, -0.3, cream);
      F.blob('stucco', a, -0.6, 1.2, 8.2, 9.2, 8, cream);
    }
    for (let a = -W / 2 + 1.5; a < W / 2; a += 2.6) beam(F, 'trim', [a, 9.6, -0.6], [a, 10.4, 1.2], 0.1, cream); // eave brackets
    F.box('stucco', -W / 2 - 1.4, W / 2 + 1.4, 10.3, 10.7, -D, 1.4, cream);
    F.block('roof', [[-W / 2 - 1.4, 1.4], [W / 2 + 1.4, 1.4], [W / 2 + 1.4, -D], [-W / 2 - 1.4, -D]], [[-W / 2 + 3, -D / 2], [W / 2 - 3, -D / 2], [W / 2 - 3, -D / 2], [-W / 2 + 3, -D / 2]], 10.7, 14, scaleC(rgb(0xa8382a), NIGHTK));
  } else {
    // Modern stone podium: deep window reveals in granite, a cantilevered steel canopy, planters.
    const granite = scaleC(pick(r, [rgb(0xb8b4ac), rgb(0x8a8680), rgb(0xd0ccc4)]), NIGHTK);
    F.box('stucco', -W / 2, W / 2, 0, 10, -D, -0.8, granite);
    for (let k = 0; k <= bays; k++) { const a = x0 + k * BAYW; F.box('stucco', a - 0.4, a + 0.4, 0, 10, -0.8, 0, scaleC(granite, 1.1)); }
    for (const y of [4.6, 9.4]) F.box('stucco', -W / 2, W / 2, y, y + 0.6, -0.8, 0, scaleC(granite, 1.1));
    for (let k = 0; k < bays; k++) {
      const a = x0 + (k + 0.5) * BAYW;
      shop(a, 0.3, 4.2, -0.78);
      F.face('glass', a - 1.6, a + 1.6, 5.4, 9.2, -0.78, null);
      F.box('trim', a - 0.04, a + 0.04, 5.4, 9.2, -0.78, -0.7, rgb(0x2a2a2e));
    }
    F.box('metal', -W / 2, W / 2, 4.3, 4.5, 0, 2.6, rgb(0x3a3e46));                     // the canopy
    F.box('neon', -W / 2, W / 2, 4.25, 4.3, 0.2, 2.4, [1.2, 1.15, 1.0]);                  // its soffit lights
    for (const a of [-W / 2 + 2, W / 2 - 2]) { F.box('stucco', a - 1, a + 1, 0, 0.8, 0.6, 2.2, granite); F.blob('leaf', a, 1.4, 1.2, 0.8, 3.4, 7, rgb(0x1e4a26)); }
  }
  // Air-conditioning units hung on the side wall, a rooftop water tank on the podium.
  for (let y = 5.5; y < 9; y += 2.2) F.box('metal', W / 2, W / 2 + 0.5, y, y + 0.7, -D / 2 - 0.4, -D / 2 + 0.4, rgb(0x7a7e84));
  crownSign(S, F, r, 0.5, 4.0 + (style === 2 ? 0.6 : 0) + 0.2, Math.min(W * 0.4, 10));
  // The tower above, set back from the street: built, not just lit.
  const T = new Frame(F.mb, ...F.at(0, 10.7, -5), F.r[0], F.r[1]);
  streetTower(S, T, r, W * 0.86, D - 6, H);
}

/**
 * A street tower with real architecture over its window skin: a frame of floor slabs and fins in
 * pale cladding (dark at night, catching the street light), one of several treatments (grid, deep
 * balconies, louvres, terraced setbacks), a cornice, rooftop plant, sometimes a lit crown.
 */
function streetTower(S, F, r, W, D, H) {
  const clad = scaleC(pick(r, [rgb(0xd8d2c4), rgb(0xc8ccd2), rgb(0xe4ddd0), rgb(0xb8b4ac), rgb(0xa8b0b8)]), 0.42);
  const dark = rgb(0x16181e), FL = 3.5, cz = -D / 2;
  const kind = Math.floor(r() * 4), skinKey = pick(r, ['sg5', 'sg3', 'sg2', 'sg0']);
  const body = (w, d, y0, y1) => skin(S, F, skinKey, rect(w, d, 0, cz), y0, y1, r);
  // The frame on one face: face plane at b = fb, spanning a in [a0, a1], from y0 to y1, out = +1 or -1.
  const frame = (a0, a1, fb, out, y0, y1, finStep, slabDepth) => {
    for (let y = y0 + FL; y < y1 - 0.5; y += FL) F.box('stucco', a0 - 0.2, a1 + 0.2, y - 0.18, y + 0.12, out > 0 ? fb : fb - slabDepth, out > 0 ? fb + slabDepth : fb, clad);
    for (let a = a0; a <= a1 + 0.01; a += finStep) F.box('stucco', a - 0.16, a + 0.16, y0, y1, out > 0 ? fb : fb - slabDepth * 0.9, out > 0 ? fb + slabDepth * 0.9 : fb, clad);
  };
  const sides = (w, d, y0, y1, finStep, slab) => {
    frame(-w / 2, w / 2, cz + d / 2, 1, y0, y1, finStep, slab);
    frame(-w / 2, w / 2, cz - d / 2, -1, y0, y1, finStep, slab);
    // the ends: bands only, every other floor
    for (let y = y0 + FL * 2; y < y1 - 0.5; y += FL * 2) for (const a of [-w / 2, w / 2]) F.box('stucco', a < 0 ? a - 0.4 : a, a < 0 ? a : a + 0.4, y - 0.18, y + 0.12, cz - d / 2, cz + d / 2, clad);
  };
  if (kind === 0) { // the grid: slabs and fins every bay
    body(W, D, 0, H); sides(W, D, 0, H, 4.8, 0.45);
  } else if (kind === 1) { // deep balconies with glass rails, every floor
    body(W, D, 0, H);
    for (let y = FL; y < H - 0.5; y += FL) {
      F.box('stucco', -W / 2, W / 2, y - 0.2, y, cz + D / 2, cz + D / 2 + 1.6, clad);
      F.box('glass', -W / 2, W / 2, y, y + 1.0, cz + D / 2 + 1.5, cz + D / 2 + 1.6, null);
    }
    for (const a of [-W / 2, 0, W / 2]) F.box('stucco', a - 0.25, a + 0.25, 0, H, cz + D / 2, cz + D / 2 + 1.6, clad);
  } else if (kind === 2) { // louvres: dense thin vertical fins over the whole front, solid end walls
    body(W, D, 0, H);
    for (let a = -W / 2 + 0.9; a < W / 2; a += 1.8) F.box('stucco', a - 0.1, a + 0.1, 2, H - 1, cz + D / 2, cz + D / 2 + 0.7, clad);
    for (const a of [-W / 2, W / 2]) F.box('stucco', a - 0.6, a + 0.6, 0, H + 1.5, cz - D / 2 - 0.3, cz + D / 2 + 0.8, clad);
  } else { // terraced: three setbacks, each terrace with planting and a glass rail
    let w = W, d = D, y = 0;
    for (const f of [0.5, 0.3, 0.2]) {
      const y1 = y + H * f;
      body(w, d, y, y1); sides(w, d, y, y1, 4.2, 0.4);
      if (f !== 0.2) {
        F.box('stucco', -w / 2, w / 2, y1, y1 + 0.3, cz - d / 2, cz + d / 2, clad);
        for (let a = -w / 2 + 1.5; a < w / 2 - 1; a += 3) F.blob('leaf', a, cz + d / 2 - 1.2, 0.9, y1 + 0.3, y1 + 2.2, 6, rgb(0x1e3a22));
        F.box('glass', -w / 2, w / 2, y1 + 0.3, y1 + 1.4, cz + d / 2 - 0.1, cz + d / 2, null);
      }
      y = y1; w *= 0.8; d *= 0.82;
    }
    H = y;
  }
  // Cornice and roof: a dark parapet, plant, sometimes a lit crown or a mast.
  F.box('stucco', -W / 2 - 0.4, W / 2 + 0.4, H, H + 1.2, cz - D / 2 - 0.4, cz + D / 2 + 0.4, kind === 3 ? dark : clad);
  F.mb.color = dark;
  F.block('stucco', rect(W - 1, D - 1, 0, cz), rect(W - 1, D - 1, 0, cz), H + 0.2, H + 0.9, dark);
  F.box('metal', -W / 4, W / 4, H + 0.9, H + 3.2, cz - D / 4, cz + D / 6, rgb(0x4a4e56));
  if (r() < 0.4) F.box('neon', -W / 2 - 0.4, W / 2 + 0.4, H + 1.2, H + 1.45, cz + D / 2 + 0.3, cz + D / 2 + 0.45, pick(r, CROWN));
  if (r() < 0.3) beam(F, 'metal', [W / 4, H + 1, cz], [W / 4, H + 14, cz], 0.25, rgb(0x8a929e));
}

/** A city park: lawn, paths, rain trees with spreading crowns, benches, lamps glowing warm. */
export function park(F, r, W, D) {
  F.box('stucco', -W / 2, W / 2, -0.3, 0.06, -D, 0, rgb(0x1e3a1c));
  F.box('stucco', -1.2, 1.2, -0.3, 0.09, -D, 0, rgb(0x4a4844));                      // the main path
  F.box('stucco', -W / 2, W / 2, -0.3, 0.09, -D / 2 - 1, -D / 2 + 1, rgb(0x4a4844));   // the cross path
  for (let k = 0; k < Math.round((W * D) / 140); k++) {
    const a = (r() - 0.5) * (W - 6), b = -3 - r() * (D - 6);
    if (Math.abs(a) < 3 || Math.abs(b + D / 2) < 3) continue;
    const h = 6 + r() * 4, R = 4 + r() * 3;                                           // rain tree: short trunk, wide flat crown
    beam(F, 'stucco', [a, 0, b], [a + (r() - 0.5), h * 0.6, b], 0.45, rgb(0x3a2e26));
    for (let q = 0; q < 4; q++) { const t = r() * 6.28, rr = r() * R * 0.5; F.blob('leaf', a + Math.cos(t) * rr, b + Math.sin(t) * rr, R * (0.6 + r() * 0.3), h * 0.55, h, 7, pick(r, [rgb(0x1e3a1e), rgb(0x24442a), rgb(0x1a3220)])); }
  }
  for (let b = -4; b > -D + 2; b -= 9) for (const s of [-1, 1]) {
    F.box('metal', s * 2.2 - 0.06, s * 2.2 + 0.06, 0, 3.6, b - 0.06, b + 0.06, rgb(0x3a3e46));
    F.box('neon', s * 2.2 - 0.22, s * 2.2 + 0.22, 3.4, 3.7, b - 0.22, b + 0.22, [2.6, 2.0, 1.2]);
    F.box('trim', s * 2.9 - 0.2, s * 2.9 + 0.2, 0.4, 0.5, b - 0.9, b + 0.9, rgb(0x5a4030));  // bench
  }
}

/** Gardens by the Bay: a grove of Supertrees lit in violet, pink and blue, the walkway between. */
export function supertrees(F, r) {
  const spots = [[0, 0, 50], [-30, 18, 42], [28, 22, 40], [-12, -26, 34], [22, -30, 30], [-44, -16, 28], [46, -8, 26], [-8, 40, 30], [40, 44, 25], [-48, 40, 24], [14, 62, 26], [-28, 66, 22]];
  for (const [a, b, h] of spots) {
    const c = pick(r, [[2.6, 0.5, 2.6], [1.0, 0.6, 3.2], [3.0, 0.6, 1.4], [0.6, 2.4, 2.6]]);
    beam(F, 'stucco', [a, 0, b], [a, h * 0.8, b], 2.2, rgb(0x4a3a40));       // trunk
    for (let k = 0; k < 12; k++) {                                          // the funnel canopy
      const t = (k / 12) * 6.283, R = h * 0.32;
      beam(F, 'neon', [a, h * 0.72, b], [a + Math.cos(t) * R, h, b + Math.sin(t) * R], 0.22, c);
      const t1 = ((k + 1) / 12) * 6.283;
      beam(F, 'neon', [a + Math.cos(t) * R, h, b + Math.sin(t) * R], [a + Math.cos(t1) * R, h, b + Math.sin(t1) * R], 0.3, c);
    }
    for (let y = 6; y < h * 0.7; y += 5) F.cylinder('neon', a, b, 2.4, y, y + 0.4, 8, scaleC(c, 0.5)); // light rings on the trunk
  }
  // The OCBC Skyway between the tallest.
  beam(F, 'metal', [-30, 24, 18], [0, 24, 0], 0.8, rgb(0x6a6e74)); beam(F, 'metal', [0, 24, 0], [28, 24, 22], 0.8, rgb(0x6a6e74));
  // The two cooled conservatories: glass shells.
  for (const [a, b, R] of [[-90, 120, 40], [10, 140, 34]]) { F.blob('glass', a, b, R, 0, R * 0.55, 14, null); F.cylinder('neon', a, b, R + 0.4, 0, 0.5, 18, [1.6, 2.0, 2.4]); }
}

/** The Helix Bridge: a deck between two lit DNA strands. */
export function helix(F, len) {
  for (let t = 0; t < len; t += 2) {
    const a0 = -len / 2 + t, a1 = a0 + 2;
    F.box('concrete', a0, a1, 6, 6.6, -4, 4, rgb(0x5a5e66));
    for (const ph of [0, Math.PI]) {
      const p = (a) => [a, 9 + Math.sin((a / 9) + ph) * 3.4, Math.cos((a / 9) + ph) * 5];
      beam(F, 'neon', p(a0), p(a1), 0.18, ph ? [2.6, 0.7, 2.0] : [0.6, 2.0, 3.0]);
    }
  }
}

/** ArtScience Museum: the lotus, ten white petals on a pedestal, lit from inside. */
export function lotus(F) {
  F.cylinder('stucco', 0, 0, 14, 0, 10, 12, rgb(0xd8d8d4));
  for (let k = 0; k < 10; k++) {
    const t = (k / 10) * 6.283, h = 28 + (k % 3) * 6;
    beam(F, 'stucco', [Math.cos(t) * 8, 10, Math.sin(t) * 8], [Math.cos(t) * (18 + (k % 2) * 6), h, Math.sin(t) * (18 + (k % 2) * 6)], 5, rgb(0xe8e6e0));
    F.box('neon', Math.cos(t) * 20 - 0.5, Math.cos(t) * 20 + 0.5, h - 1, h, Math.sin(t) * 20 - 0.5, Math.sin(t) * 20 + 0.5, [2.6, 2.4, 2.0]);
  }
}
