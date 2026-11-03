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
  const g = c.getContext('2d');
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
  material.onBeforeCompile = () => {};
  material.customProgramCacheKey = () => 'plain';
  material.needsUpdate = true;
}

// ---- Red Bull Racing --------------------------------------------------------------------------

const RB_NAVY = '#1b2552', RB_NAVY_D = '#121a3d', RB_RED = '#db0a40', RB_YELLOW = '#ffc906', RB_BLUE = '#2a4fd8';

/** The charging bull, facing right, its back along the top; (x, y) is the centre, s the length. */
function bull(g, x, y, s, colour, flip = false) {
  g.save();
  g.translate(x, y);
  g.scale((flip ? -1 : 1) * s / 200, s / 200);
  g.fillStyle = colour;
  g.beginPath();
  g.moveTo(-100, -8);            // tail root
  g.bezierCurveTo(-112, -14, -120, -4, -116, 8);
  g.lineTo(-104, 2);
  g.bezierCurveTo(-96, 22, -90, 30, -86, 46); // hind leg
  g.lineTo(-74, 46);
  g.lineTo(-74, 22);
  g.bezierCurveTo(-40, 26, 0, 26, 30, 18);
  g.lineTo(48, 44);               // fore leg pushing back
  g.lineTo(60, 40);
  g.lineTo(52, 12);
  g.bezierCurveTo(66, 10, 80, 12, 92, 18); // head lowered
  g.lineTo(104, 14);
  g.lineTo(98, 2);
  g.lineTo(112, -10);             // horn
  g.lineTo(94, -8);
  g.bezierCurveTo(80, -22, 50, -30, 20, -26); // hump
  g.bezierCurveTo(-20, -30, -70, -24, -100, -8);
  g.closePath();
  g.fill();
  g.restore();
}

/** The full mark: two bulls charging at a yellow sun. */
function bullMark(g, x, y, s) {
  g.fillStyle = RB_YELLOW;
  g.beginPath(); g.arc(x, y - s * 0.02, s * 0.2, 0, 7); g.fill();
  bull(g, x - s * 0.27, y + s * 0.02, s * 0.5, RB_RED);
  bull(g, x + s * 0.27, y + s * 0.02, s * 0.5, RB_RED, true);
}

function wordmark(g, text, x, y, size, colour, { font = '900', italic = true, family = '"Arial Black", Arial, sans-serif', align = 'center', track = 0 } = {}) {
  g.save();
  g.fillStyle = colour;
  g.font = `${italic ? 'italic ' : ''}${font} ${size}px ${family}`;
  g.textAlign = align; g.textBaseline = 'middle';
  if (track) g.letterSpacing = `${track}px`;
  g.fillText(text, x, y);
  g.restore();
}

/** Matte navy with the darker mottled pattern of the current car. */
function navy(g, y0, h, seed) {
  g.fillStyle = RB_NAVY;
  g.fillRect(0, y0, W, h);
  let s = seed;
  const R = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let k = 0; k < 900; k++) {
    const x = R() * W, y = y0 + R() * h, r = 4 + R() * R() * 26;
    g.fillStyle = R() < 0.7 ? 'rgba(10,16,44,0.55)' : 'rgba(60,80,170,0.35)';
    g.beginPath(); g.ellipse(x, y, r * (1 + R()), r, R() * 3, 0, 7); g.fill();
  }
  // A brighter blue sweep low along the floor and the nose sides.
  const grd = g.createLinearGradient(0, y0 + h, 0, y0 + h * 0.55);
  grd.addColorStop(0, 'rgba(42,79,216,0.55)'); grd.addColorStop(1, 'rgba(42,79,216,0)');
  g.fillStyle = grd; g.fillRect(0, y0 + h * 0.55, W, h * 0.45);
}

// Panel positions measured from the body (u along the car from the nose, v up from the floor):
// chassis sides u .17-.35 v .17-.5, sidepod u .42-.67 v .17-.5, engine cover u .5-.67 v .5-.83,
// fin u .83-1 v .8-1, front-wing endplates u 0-.08 v 0-.17. Canvas x = u * 2048, y = (1 - v) * 512.
function rbSide(g, y0, noseLeft) {
  const Xc = (x) => (noseLeft ? x : W - x); // mirror positions, never the lettering
  navy(g, y0, BAND, noseLeft ? 11 : 23);
  // Yellow nose tip (above the wing), the charging bull along the nose.
  g.fillStyle = RB_YELLOW;
  g.beginPath();
  const tip = [[0, 60], [150, 60], [240, 250], [200, 420], [0, 420]];
  tip.forEach(([x, y], k) => (k ? g.lineTo(Xc(x), y0 + y) : g.moveTo(Xc(x), y0 + y)));
  g.fill();
  bull(g, Xc(330), y0 + 330, 230, RB_RED, !noseLeft);
  wordmark(g, 'Mobil', Xc(80), y0 + 470, 30, '#ffffff', { italic: false });
  // Chassis: Carlyle and 1Password.
  wordmark(g, 'CARLYLE', Xc(600), y0 + 300, 40, '#ffffff', { italic: false, font: '700', family: 'Georgia, serif', track: 3 });
  wordmark(g, '1Password', Xc(600), y0 + 350, 30, '#ffffff', { italic: false, font: '700' });
  // Sidepod: ORACLE, ROKT above it.
  wordmark(g, 'ORACLE', Xc(1110), y0 + 345, 96, '#ffffff', { italic: false, font: '400', family: 'Arial, sans-serif', track: 4 });
  wordmark(g, 'ROKT', Xc(930), y0 + 240, 40, '#ffffff', { font: '900' });
  // Engine cover: yellow round the airbox, the big bull, the Red Bull script.
  g.fillStyle = RB_YELLOW;
  g.beginPath(); g.ellipse(Xc(1060), y0 + 70, 120, 60, 0, 0, 7); g.fill();
  bull(g, Xc(1230), y0 + 115, 300, RB_RED, !noseLeft);
  wordmark(g, 'Red Bull', Xc(1230), y0 + 200, 62, RB_RED, { font: '900' });
  wordmark(g, 'Ford', Xc(1480), y0 + 285, 36, '#ffffff', { font: '700', family: 'Georgia, serif' });
  // Number board and the fin.
  g.fillStyle = '#ffffff'; g.fillRect(Xc(1640) - 34, y0 + 300, 68, 68);
  wordmark(g, '1', Xc(1640), y0 + 336, 56, RB_RED, { font: '900' });
  wordmark(g, 'Mobil 1', Xc(1930), y0 + 60, 44, '#ffffff', { italic: false, font: '900' });
}

function rbTop(g, y0) {
  navy(g, y0, BAND, 37);
  g.fillStyle = RB_YELLOW; // nose tip, the middle of the car's width only (the wing stays blue)
  g.beginPath(); g.ellipse(0, y0 + BAND / 2, 210, 70, 0, 0, 7); g.fill();
  bullMark(g, 430, y0 + BAND / 2, 200);
  bullMark(g, 1160, y0 + BAND / 2, 260);
  wordmark(g, 'Mobil 1', 120, y0 + 60, 40, '#ffffff', { italic: false });
  wordmark(g, 'Mobil 1', 120, y0 + BAND - 60, 40, '#ffffff', { italic: false });
}

const PAINTERS = {
  redbull(g) {
    rbSide(g, 0, true);         // canvas top band: v (2..3)/3 after the flip below
    rbSide(g, BAND, false);
    rbTop(g, BAND * 2);
  },
};
