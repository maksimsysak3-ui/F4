import { CanvasTexture, SRGBColorSpace } from 'three';

/*
 * Team liveries painted on a canvas and projected onto the body in the shader, so they need no UVs:
 * side-facing surfaces sample the side artwork (one band per side, laid out so the nose is where the
 * viewer expects it and the lettering always reads the right way round), up-facing ones the top band.
 *
 * Atlas: 2048 x 1536, three bands of 512 px: left side (nose at the left), right side (nose at the
 * right), top (nose at the left, car centreline across the middle). u runs along the car's length.
 */
const W = 2048, BAND = 512;
const cache = {};

export function liveryTexture(id) {
  if (cache[id]) return cache[id];
  const c = document.createElement('canvas');
  c.width = W; c.height = BAND * 3;
  const g = c.getContext('2d', { willReadFrequently: true });
  PAINTERS[id](g);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return (cache[id] = tex);
}

/** Install the projection on the paint material; bounds are the painted body's extent in its own space. */
export function applyLivery(material, tex, box) {
  material.map = tex;
  material.color.setHex(0xffffff);
  // Show-car finish: deep gloss under a mirror clearcoat, strong reflections.
  material.userData.plain ??= { roughness: material.roughness, metalness: material.metalness, cc: material.clearcoatRoughness, env: material.envMapIntensity };
  Object.assign(material, { roughness: 0.14, metalness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.9 });
  material.userData.liveryBox = box;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.lvMin = { value: box.min };
    shader.uniforms.lvMax = { value: box.max };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLvPos;\nvarying vec3 vLvNrm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLvPos = position;\nvLvNrm = normal;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLvPos;\nvarying vec3 vLvNrm;\nuniform vec3 lvMin;\nuniform vec3 lvMax;')
      .replace('#include <map_fragment>', `
        vec3 lvN = normalize(vLvNrm);
        float lvU = (lvMax.z - vLvPos.z) / (lvMax.z - lvMin.z);          // 0 at the nose
        float lvV = (vLvPos.y - lvMin.y) / (lvMax.y - lvMin.y);          // 0 at the floor
        vec2 lvUv;
        if (lvN.y > 0.72) {
          float lvX = (vLvPos.x - lvMin.x) / (lvMax.x - lvMin.x);
          lvUv = vec2(lvU, (0.0 + lvX) / 3.0);                           // top band (bottom of the canvas)
        } else if (lvN.x >= 0.0) {
          lvUv = vec2(lvU, (2.0 + lvV) / 3.0);                           // left side (+X), nose left
        } else {
          lvUv = vec2(1.0 - lvU, (1.0 + lvV) / 3.0);                     // right side, nose right
        }
        vec4 lvC = texture2D(map, clamp(lvUv, vec2(0.001), vec2(0.999)));
        diffuseColor *= lvC;
      `);
  };
  material.customProgramCacheKey = () => 'livery';
  material.needsUpdate = true;
}

export function clearLivery(material) {
  if (!material.map) return;
  material.map = null;
  const p = material.userData.plain;
  if (p) Object.assign(material, { roughness: p.roughness, metalness: p.metalness, clearcoatRoughness: p.cc, envMapIntensity: p.env });
  material.onBeforeCompile = () => {};
  material.customProgramCacheKey = () => 'plain';
  material.needsUpdate = true;
}

function wordmark(g, text, x, y, size, colour, { font = '900', italic = true, family = '"Arial Black", Arial, sans-serif', align = 'center', track = 0 } = {}) {
  g.save();
  g.font = `${italic ? 'italic ' : ''}${font} ${size}px ${family}`;
  g.textAlign = align; g.textBaseline = 'middle';
  if (track) g.letterSpacing = `${track}px`;
  const w = g.measureText(text).width;
  const { fill, stroke } = ink(g, align === 'center' ? x - w / 2 : x, y - size * 0.38, w, size * 0.76, colour);
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = Math.max(2, size * 0.14); g.lineJoin = 'round'; g.strokeText(text, x, y); }
  g.fillStyle = fill;
  g.fillText(text, x, y);
  g.restore();
}

/*
 * Lettering that stays legible whatever it lands on: the paint under the word's box (in canvas
 * space, through any rotation) is sampled; on a background too close to the ink the word swaps to
 * black or white, and across a mixed one (a word over a stripe) it keeps its colour with an outline.
 */
function ink(g, x, y, w, h, colour) {
  if (!/^#[0-9a-f]{6}$/i.test(colour)) return { fill: colour, stroke: null };
  const m = g.getTransform(), pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([a, b]) => [m.a * a + m.c * b + m.e, m.b * a + m.d * b + m.f]);
  const X0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p[0])))), X1 = Math.min(g.canvas.width, Math.ceil(Math.max(...pts.map((p) => p[0]))));
  const Y0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p[1])))), Y1 = Math.min(g.canvas.height, Math.ceil(Math.max(...pts.map((p) => p[1]))));
  if (X1 - X0 < 2 || Y1 - Y0 < 2) return { fill: colour, stroke: null };
  const d = g.getImageData(X0, Y0, X1 - X0, Y1 - Y0).data, L = lum(colour);
  let n = 0, close = 0, sum = 0;
  for (let i = 0; i < d.length; i += 4 * 5) {
    const b = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    n++; sum += b; if (Math.abs(b - L) < 0.3) close++;
  }
  const f = close / n, opposite = L > 0.5 ? '#16161a' : '#ffffff';
  if (f > 0.55) return { fill: sum / n > 0.5 ? '#16161a' : '#ffffff', stroke: null };
  if (f > 0.1) return { fill: colour, stroke: opposite };
  return { fill: colour, stroke: null };
}

// Keep lettering on its panel: a wordmark wider than the panel it sits on shrinks to fit, and one that
// hangs over a panel's edge slides back onto it (otherwise the letters wrap round onto the next surface
// and read cut off). Panels in nose-left canvas coordinates (see below).
const PANELS = [[0, 240, 0, 512], [350, 720, 256, 425], [860, 1370, 256, 425], [1024, 1372, 87, 256], [1700, 2048, 0, 102]];
function fitWord(g, text, x, y, size, opts = {}) {
  const P = PANELS.find(([x0, x1, y0, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
  if (!P) return { x, size };
  g.save();
  g.font = `${opts.italic ? 'italic ' : ''}${opts.font ?? '900'} ${size}px ${opts.family ?? '"Arial Black", Arial, sans-serif'}`;
  let w = g.measureText(text).width + (opts.track ?? 0) * text.length;
  g.restore();
  const room = P[1] - P[0] - 24;
  if (w > room) { size *= room / w; w = room; }
  return { x: Math.min(P[1] - 12 - w / 2, Math.max(P[0] + 12 + w / 2, x)), size };
}

// Panel positions measured from the body (u along the car from the nose, v up from the floor):
// chassis sides x 350-720 y 256-425, sidepod x 860-1370 y 256-425, engine cover x 1024-1372 y 87-256,
// fin x 1700-2048 y 0-102, nose tip x 0-240. Canvas x = u * 2048, y = (1 - v) * 512.

/** A cleaner charging bull: head down and horns forward, hump, raised tail, legs driving. Faces right. */
function bull2(g, x, y, s, colour, flip = false) {
  g.save(); g.translate(x, y); g.scale((flip ? -1 : 1) * s / 200, s / 200); g.fillStyle = colour;
  g.beginPath();
  g.moveTo(-96, -6);
  g.quadraticCurveTo(-112, -30, -122, -22); g.quadraticCurveTo(-112, -18, -104, 0);  // tail flick
  g.quadraticCurveTo(-104, 14, -96, 22); g.lineTo(-112, 44); g.lineTo(-100, 48); g.lineTo(-80, 26); // hind leg back
  g.quadraticCurveTo(-50, 34, -20, 30); g.lineTo(-30, 50); g.lineTo(-18, 52); g.lineTo(0, 30);   // hind leg 2
  g.quadraticCurveTo(24, 30, 40, 24); g.lineTo(66, 46); g.lineTo(76, 40); g.lineTo(58, 16);      // fore leg
  g.quadraticCurveTo(74, 16, 86, 26); g.lineTo(104, 30); g.lineTo(100, 18);                       // lowered head
  g.lineTo(122, 4); g.lineTo(98, 6); g.lineTo(94, -2); g.lineTo(116, -16); g.lineTo(88, -10);    // horns
  g.quadraticCurveTo(64, -40, 20, -34); g.quadraticCurveTo(-40, -30, -96, -6);                    // hump and back
  g.closePath(); g.fill(); g.restore();
}
function sun(g, x, y, r, c) { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }

function mottle(g, y0, h, seed, dark, light, n = 700) {
  let s = seed;
  const R = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let k = 0; k < n; k++) {
    const x = R() * W, y = y0 + R() * h, r = 4 + R() * R() * 24;
    g.fillStyle = R() < 0.7 ? dark : light;
    g.beginPath(); g.ellipse(x, y, r * (1 + R()), r, R() * 3, 0, 7); g.fill();
  }
}
const poly = (g, pts, c, y0, Xc) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(Xc(x), y0 + y) : g.moveTo(Xc(x), y0 + y))); g.closePath(); g.fill(); };

/*
 * Team spec: base colour, then shapes painted in order (each { pts, c } in panel coordinates,
 * nose-left), then lettering { t, x, y, px, c, f } (f: font family key), the number and extras.
 */
const FONT = { sans: '"Arial Black", Arial, sans-serif', plain: 'Arial, sans-serif', serif: 'Georgia, serif', wide: 'Verdana, sans-serif' };
// The smaller partners every team carries all over the car (nose, bargeboards, lower sidepod, engine
// cover, endplates, halo), painted small in fixed slots so the cars read as busy as the real ones.
const MINOR = {
  redbull: ['Bybit', 'TAG Heuer', 'Rauch', 'Hard Rock', 'PUMA', 'Maui Jim', 'Ford', 'Gate.io', 'Pirelli'],
  racingbulls: ['Ford', 'Pirelli', 'Neat Burger', 'Maui Jim', 'PUMA', 'Red Bull', 'HUGO', 'Visa'],
  haas: ['Alpinestars', 'Pirelli', 'TOYOTA', 'HAAS AUTOMATION', 'MoneyGram', 'Gene Haas', 'Hyperice'],
  audi: ['Revolut', 'adidas', 'bp', 'Castrol', 'Pirelli', 'Audi', 'Nexo'],
  mercedes: ['PETRONAS', 'INEOS', 'Microsoft', 'CrowdStrike', 'Pure Storage', 'adidas', 'IWC', 'Monster', 'Qualcomm'],
  ferrari: ['Shell', 'Santander', 'UniCredit', 'Ray-Ban', 'PUMA', 'Richard Mille', 'Bitdefender', 'AWS', 'IBM'],
  alpine: ['BWT', 'Mastercard', 'Kappa', 'Bell & Ross', 'elf', 'Pirelli', 'Renault'],
  williams: ['Atlassian', 'Komatsu', 'Gulf', 'Duracell', 'Kraken', 'Michelob ULTRA', 'Santander', 'PUMA'],
  cadillac: ['Cadillac', 'GM', 'Pirelli', 'Alpinestars', 'TWG', 'IBM'],
  mclaren: ['Google', 'OKX', 'Dell', 'Gulf', 'Hilton', 'Monster', 'DP World', 'Estrella Galicia', 'Coca-Cola'],
  aston: ['Valvoline', 'Peroni Libera', 'Glenfiddich', 'BOSS', 'Girard-Perregaux', 'Pepe Jeans', 'Hackett', 'NetApp'],
};
// Side slots (nose to the left): [x, y, size] on the nose cone, bargeboard, lower sidepod, floor
// edge, engine cover, fin, rear endplate, front wing endplate.
const SLOTS = [[260, 190, 26], [300, 395, 22], [700, 175, 26], [760, 440, 22], [980, 445, 24], [1420, 290, 28],
  [1480, 430, 22], [1640, 185, 24], [1790, 330, 24], [1960, 170, 22], [1960, 300, 22], [110, 430, 20]];
const lum = (hex) => { const v = parseInt(hex.slice(1), 16); return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255; };

function paintTeam(T) {
  return (g) => {
    for (const [band, noseLeft] of [[0, true], [1, false], [2, null]]) {
      const y0 = band * BAND, Xc = (x) => (noseLeft === false ? W - x : x);
      g.fillStyle = T.base; g.fillRect(0, y0, W, BAND);
      if (T.mottle) mottle(g, y0, BAND, 11 + band * 7, ...T.mottle);
      if (noseLeft === null) { // top: the side shapes' colours as broad bands along the car
        for (const sh of T.top ?? []) { g.fillStyle = sh.c; g.fillRect(sh.x0, y0 + BAND * (sh.y0 ?? 0), sh.x1 - sh.x0, BAND * ((sh.y1 ?? 1) - (sh.y0 ?? 0))); }
        for (const w of T.topText ?? []) { g.save(); g.translate(w.x, y0 + BAND / 2); g.rotate(Math.PI / 2); wordmark(g, w.t, 0, 0, w.px, w.c, { italic: false, family: FONT[w.f ?? 'sans'], track: w.k ?? 0 }); g.restore(); }
        T.extraTop?.(g, y0);
        // Along the top: the minor partners small on the nose, the engine cover and the rear wing.
        const minor = T.minor ?? [], mc = T.minorC ?? (lum(T.base) > 0.55 ? '#16161a' : '#ffffff');
        [[330, 0.3], [330, 0.7], [1500, 0.3], [1500, 0.7], [1930, 0.5]].forEach(([x, f], k) => {
          if (!minor.length) return;
          g.save(); g.translate(x, y0 + BAND * f); g.rotate(Math.PI / 2); wordmark(g, minor[(k + 3) % minor.length], 0, 0, 26, mc, { italic: false, font: '700', family: FONT.plain }); g.restore();
        });
        continue;
      }
      for (const sh of T.shapes ?? []) poly(g, sh.pts, sh.c, y0, Xc);
      T.extra?.(g, y0, Xc, noseLeft);
      for (const w of T.text ?? []) {
        const o = { italic: !!w.i, font: w.w ?? '900', family: FONT[w.f ?? 'sans'], track: w.k ?? 0 }, f = fitWord(g, w.t, w.x, w.y, w.px, o);
        wordmark(g, w.t, Xc(f.x), y0 + w.y, f.size, w.c, o);
      }
      // The minor partners, small, in the fixed slots.
      const minor = T.minor ?? [], mc = T.minorC ?? (lum(T.base) > 0.55 ? '#16161a' : '#ffffff');
      SLOTS.forEach(([x, y, px], k) => {
        if (!minor.length) return;
        const o = { italic: false, font: '700', family: FONT.plain }, f = fitWord(g, minor[k % minor.length], x, y, Math.round(px * 1.25), o);
        wordmark(g, minor[k % minor.length], Xc(f.x), y0 + y, f.size, mc, o);
      });
      if (T.num) { const [n, c, bg] = T.num; if (bg) { g.fillStyle = bg; g.fillRect(Xc(1640) - 34, y0 + 300, 68, 68); } wordmark(g, n, Xc(1640), y0 + 336, 54, c); }
    }
  };
}

const TEAMS = {
  redbull: {
    base: '#1e2a5c', mottle: ['rgba(10,16,44,0.5)', 'rgba(70,95,190,0.35)'],
    shapes: [
      { pts: [[0, 70], [170, 70], [250, 300], [170, 440], [0, 440]], c: '#ffc906' },            // yellow nose
      { pts: [[860, 470], [1700, 470], [1700, 512], [860, 512]], c: '#2a4fd8' },                // blue floor edge
    ],
    extra(g, y0, Xc, nl) {
      bull2(g, Xc(330), y0 + 300, 240, '#db0a40', !nl);
      sun(g, Xc(1150), y0 + 150, 52, '#ffc906');
      bull2(g, Xc(1290), y0 + 160, 260, '#db0a40', !nl);
    },
    text: [
      { t: 'ORACLE', x: 1110, y: 350, px: 92, c: '#ffffff', w: '400', f: 'plain', k: 4 },
      { t: 'Red Bull', x: 1250, y: 235, px: 58, c: '#db0a40', i: 1 },
      { t: 'CARLYLE', x: 590, y: 300, px: 40, c: '#ffffff', w: '700', f: 'serif', k: 3 },
      { t: '1Password', x: 590, y: 350, px: 30, c: '#ffffff', w: '700', f: 'plain' },
      { t: 'ROKT', x: 900, y: 255, px: 38, c: '#ffffff' },
      { t: 'Mobil 1', x: 1900, y: 55, px: 44, c: '#ffffff' },
      { t: 'AT&T', x: 470, y: 400, px: 30, c: '#ffffff', w: '700', f: 'plain' },
    ],
    num: ['1', '#db0a40', '#ffffff'],
    top: [{ x0: 0, x1: 200, y0: 0.3, y1: 0.7, c: '#ffc906' }],
    extraTop(g, y0) { sun(g, 430, y0 + 256, 40, '#ffc906'); bull2(g, 360, y0 + 260, 120, '#db0a40'); bull2(g, 500, y0 + 260, 120, '#db0a40', true); sun(g, 1160, y0 + 256, 60, '#ffc906'); bull2(g, 1050, y0 + 262, 180, '#db0a40'); bull2(g, 1270, y0 + 262, 180, '#db0a40', true); },
  },
  racingbulls: {
    base: '#f4f4f6',
    shapes: [
      { pts: [[0, 260], [2048, 200], [2048, 512], [0, 512]], c: '#1c3fd0' },                    // blue lower half
      { pts: [[0, 240], [2048, 180], [2048, 205], [0, 265]], c: '#e5112b' },                    // red pinstripe
    ],
    text: [
      { t: 'VISA', x: 1110, y: 360, px: 110, c: '#ffffff', i: 1 },
      { t: 'cash app', x: 600, y: 330, px: 42, c: '#ffffff', w: '700', f: 'plain' },
      { t: 'Red Bull', x: 1250, y: 130, px: 54, c: '#e5112b', i: 1 },
      { t: 'HUGO', x: 420, y: 160, px: 36, c: '#1c3fd0', f: 'wide', k: 4 },
      { t: 'Red Bull', x: 1900, y: 55, px: 40, c: '#e5112b', i: 1 },
    ],
    num: ['30', '#1c3fd0', '#ffffff'],
    top: [{ x0: 0, x1: 2048, y0: 0.42, y1: 0.58, c: '#1c3fd0' }],
    topText: [{ t: 'VISA', x: 1100, px: 64, c: '#ffffff' }],
  },
  haas: {
    base: '#f2f2f2',
    shapes: [
      { pts: [[0, 330], [2048, 330], [2048, 512], [0, 512]], c: '#16161a' },                    // black lower
      { pts: [[0, 300], [700, 300], [600, 330], [0, 330]], c: '#e10600' },                     // red flash on the nose
      { pts: [[1500, 0], [2048, 0], [2048, 120], [1500, 120]], c: '#16161a' },
    ],
    text: [
      { t: 'HAAS', x: 1110, y: 240, px: 130, c: '#16161a', i: 1, k: 6 },
      { t: 'MoneyGram', x: 600, y: 240, px: 40, c: '#16161a', w: '700', f: 'plain' },
      { t: 'TOYOTA GAZOO', x: 1200, y: 400, px: 34, c: '#ffffff', w: '700', f: 'plain' },
      { t: 'HAAS', x: 1880, y: 55, px: 46, c: '#ffffff', i: 1 },
    ],
    num: ['31', '#e10600', '#ffffff'],
    top: [{ x0: 0, x1: 2048, y0: 0.45, y1: 0.55, c: '#e10600' }],
    topText: [{ t: 'HAAS', x: 1100, px: 70, c: '#16161a' }],
  },
  audi: {
    base: '#b9bcc2',
    shapes: [
      { pts: [[0, 360], [2048, 300], [2048, 512], [0, 512]], c: '#16161a' },
      { pts: [[1300, 0], [2048, 0], [2048, 300], [1500, 300]], c: '#16161a' },                  // black rear
      { pts: [[1250, 0], [1310, 0], [1510, 300], [1450, 300]], c: '#f50537' },                 // lava red slash
    ],
    extra(g, y0, Xc) { g.strokeStyle = '#16161a'; g.lineWidth = 9; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(Xc(960 + k * 52), y0 + 240, 32, 0, 7); g.stroke(); } },
    text: [
      { t: 'AUDI', x: 1050, y: 330, px: 52, c: '#16161a', f: 'wide', k: 10 },
      { t: 'Revolut', x: 600, y: 300, px: 40, c: '#16161a', w: '700', f: 'plain' },
      { t: 'AUDI', x: 1870, y: 55, px: 40, c: '#ffffff', f: 'wide', k: 8 },
    ],
    num: ['27', '#16161a', '#ffffff'],
    top: [{ x0: 1300, x1: 2048, c: '#16161a' }, { x0: 1250, x1: 1300, c: '#f50537' }],
    topText: [{ t: 'AUDI', x: 900, px: 56, c: '#16161a', f: 'wide', k: 8 }],
  },
  mercedes: {
    base: '#141518',
    shapes: [
      { pts: [[0, 60], [2048, 160], [2048, 260], [0, 140]], c: '#c8ccd2' },                     // silver sweep
      { pts: [[0, 150], [2048, 260], [2048, 280], [0, 168]], c: '#00d7b6' },                    // teal line
    ],
    text: [
      { t: 'PETRONAS', x: 1110, y: 350, px: 72, c: '#00d7b6', k: 3 },
      { t: 'INEOS', x: 600, y: 320, px: 44, c: '#ffffff', w: '700', f: 'wide' },
      { t: 'Microsoft', x: 1260, y: 200, px: 40, c: '#141518', w: '700', f: 'plain' },
      { t: 'PETRONAS', x: 1880, y: 55, px: 36, c: '#00d7b6' },
    ],
    num: ['63', '#00d7b6', '#141518'],
    top: [{ x0: 0, x1: 2048, y0: 0.38, y1: 0.62, c: '#c8ccd2' }],
    topText: [{ t: 'PETRONAS', x: 1050, px: 52, c: '#00a891' }],
  },
  ferrari: {
    base: '#d40000',
    shapes: [
      { pts: [[0, 0], [400, 0], [300, 160], [0, 160]], c: '#ffffff' },                          // white nose top
      { pts: [[1150, 0], [1500, 0], [1500, 200], [1250, 200]], c: '#ffffff' },                  // white engine cover band
      { pts: [[0, 470], [2048, 470], [2048, 512], [0, 512]], c: '#14141a' },
    ],
    extra(g, y0, Xc) { sun(g, Xc(1100), y0 + 320, 52, '#1a5ab8'); wordmark(g, 'hp', Xc(1100), y0 + 322, 54, '#ffffff', { italic: true }); g.fillStyle = '#ffe000'; g.fillRect(Xc(700) - 26, y0 + 280, 52, 66); },
    text: [
      { t: 'Shell', x: 600, y: 380, px: 36, c: '#ffe000', w: '700', f: 'plain' },
      { t: 'UniCredit', x: 1260, y: 420, px: 34, c: '#ffffff', w: '700', f: 'plain' },
      { t: '16', x: 1330, y: 110, px: 80, c: '#d40000' },
      { t: 'Ferrari', x: 1880, y: 55, px: 42, c: '#ffffff', i: 1, f: 'serif' },
    ],
    num: ['16', '#ffffff', null],
    top: [{ x0: 1150, x1: 1500, c: '#ffffff' }],
    topText: [{ t: 'hp', x: 760, px: 70, c: '#ffffff' }],
  },
  alpine: {
    base: '#0b5fd8',
    shapes: [
      { pts: [[0, 512], [0, 380], [500, 260], [1000, 200], [1500, 260], [2048, 200], [2048, 512]], c: '#0a1a3c' },
      { pts: [[1300, 0], [2048, 0], [2048, 300], [1450, 260]], c: '#ff5ab4' },                  // BWT pink rear
      { pts: [[0, 60], [220, 60], [260, 300], [0, 300]], c: '#ff5ab4' },
    ],
    text: [
      { t: 'BWT', x: 1100, y: 300, px: 110, c: '#ffffff', i: 1 },
      { t: 'MERCADO LIBRE', x: 600, y: 300, px: 30, c: '#ffffff', w: '700', f: 'plain' },
      { t: 'ALPINE', x: 1700, y: 160, px: 44, c: '#ffffff', f: 'wide', k: 4 },
      { t: 'BWT', x: 1880, y: 55, px: 48, c: '#ffffff', i: 1 },
    ],
    num: ['10', '#ffffff', null],
    top: [{ x0: 1300, x1: 2048, c: '#ff5ab4' }],
    topText: [{ t: 'BWT', x: 1100, px: 80, c: '#ffffff' }],
  },
  williams: {
    base: '#0a1f6a',
    shapes: [
      { pts: [[0, 0], [2048, 0], [2048, 180], [0, 260]], c: '#1a7fff' },                         // bright blue upper
      { pts: [[0, 250], [2048, 170], [2048, 190], [0, 270]], c: '#ffffff' },
    ],
    text: [
      { t: 'ATLASSIAN', x: 1100, y: 120, px: 62, c: '#ffffff', k: 2 },
      { t: 'KOMATSU', x: 1100, y: 340, px: 62, c: '#ffffff', i: 1 },
      { t: 'Gulf', x: 600, y: 320, px: 40, c: '#ff7a00', i: 1, f: 'serif' },
      { t: 'Duracell', x: 1880, y: 55, px: 38, c: '#ffffff', w: '700', f: 'plain' },
    ],
    num: ['23', '#ffffff', null],
    top: [{ x0: 0, x1: 2048, y0: 0.3, y1: 0.7, c: '#1a7fff' }],
    topText: [{ t: 'ATLASSIAN', x: 1050, px: 50, c: '#ffffff' }],
  },
  cadillac: {
    base: '#f2f2f2',
    shapes: [
      { pts: [[0, 512], [0, 300], [700, 280], [1300, 360], [2048, 300], [2048, 512]], c: '#111114' }, // black lower
      { pts: [[1400, 0], [2048, 0], [2048, 300], [1600, 300]], c: '#111114' },
    ],
    text: [
      { t: 'TWG', x: 1080, y: 250, px: 110, c: '#111114', f: 'serif', w: '700', k: 6 },
      { t: 'CADILLAC', x: 600, y: 240, px: 38, c: '#111114', f: 'wide', k: 3 },
      { t: 'CADILLAC', x: 1860, y: 55, px: 32, c: '#ffffff', f: 'wide', k: 3 },
    ],
    num: ['11', '#111114', '#ffffff'],
    top: [{ x0: 1400, x1: 2048, c: '#111114' }],
    topText: [{ t: 'TWG', x: 1050, px: 70, c: '#111114', f: 'serif' }],
  },
  mclaren: {
    base: '#ff8000',
    shapes: [
      { pts: [[0, 512], [0, 330], [900, 300], [1500, 360], [2048, 330], [2048, 512]], c: '#141416' }, // black lower
      { pts: [[0, 330], [900, 300], [900, 314], [0, 344]], c: '#47c7fc' },
    ],
    text: [
      { t: 'Gemini', x: 1080, y: 230, px: 80, c: '#141416', w: '700', f: 'plain' },
      { t: 'OKX', x: 600, y: 240, px: 52, c: '#141416' },
      { t: 'Mastercard', x: 1250, y: 410, px: 34, c: '#ffffff', w: '700', f: 'plain' },
      { t: 'McLaren', x: 1880, y: 55, px: 40, c: '#141416', w: '700', f: 'plain' },
    ],
    num: ['4', '#141416', null],
    top: [{ x0: 0, x1: 2048, y0: 0.44, y1: 0.56, c: '#141416' }],
    topText: [{ t: 'Gemini', x: 1050, px: 60, c: '#141416', f: 'plain' }],
  },
  aston: {
    base: '#00594f',
    mottle: ['rgba(0,40,34,0.35)', 'rgba(0,110,96,0.25)', 300],
    shapes: [
      { pts: [[0, 250], [2048, 200], [2048, 216], [0, 266]], c: '#cedc00' },                    // lime pinstripe
      { pts: [[0, 470], [2048, 470], [2048, 512], [0, 512]], c: '#0a0a0c' },
    ],
    text: [
      { t: 'aramco', x: 1100, y: 340, px: 92, c: '#ffffff', w: '700', f: 'plain' },
      { t: 'Cognizant', x: 600, y: 320, px: 38, c: '#ffffff', w: '700', f: 'plain' },
      { t: 'coinbase', x: 1880, y: 55, px: 40, c: '#ffffff', w: '700', f: 'plain' },
      { t: 'ASTON MARTIN', x: 1250, y: 150, px: 34, c: '#cedc00', f: 'wide', k: 3 },
    ],
    num: ['14', '#cedc00', null],
    top: [{ x0: 0, x1: 2048, y0: 0.47, y1: 0.53, c: '#cedc00' }],
    topText: [{ t: 'aramco', x: 1050, px: 66, c: '#ffffff', f: 'plain' }],
  },
};

export const LIVERIES = [
  ['redbull', 'Red Bull Racing', 0x1e2a5c], ['racingbulls', 'Racing Bulls', 0xf4f4f6], ['haas', 'Haas', 0xf2f2f2],
  ['audi', 'Audi', 0xb9bcc2], ['mercedes', 'Mercedes', 0x141518], ['ferrari', 'Ferrari', 0xd40000], ['alpine', 'Alpine', 0x0b5fd8],
  ['williams', 'Williams', 0x0a1f6a], ['cadillac', 'Cadillac', 0xf2f2f2], ['mclaren', 'McLaren', 0xff8000], ['aston', 'Aston Martin', 0x00594f],
];

const PAINTERS = Object.fromEntries(Object.entries(TEAMS).map(([k, T]) => [k, paintTeam({ minor: MINOR[k], ...T })]));
