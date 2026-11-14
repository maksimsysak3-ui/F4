import { CanvasTexture, SRGBColorSpace, Mesh, PlaneGeometry, MeshStandardMaterial, MeshBasicMaterial, DoubleSide } from 'three';

/**
 * Painted signs: a canvas drawn by `draw(g, W, H)`, as a material. lit: emissive strength (0 for a
 * plain painted board in daylight, about 1 for a lit sign at night). basic: unlit (LED screens).
 */
export function signMaterial(draw, { W = 1024, H = 256, lit = 0, basic = false, transparent = false } = {}) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  draw(c.getContext('2d'), W, H);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 8;
  if (basic) return new MeshBasicMaterial({ map: t, transparent, side: DoubleSide, toneMapped: true });
  return new MeshStandardMaterial({ map: t, roughness: 0.6, emissive: lit ? 0xffffff : 0x000000, emissiveMap: lit ? t : null, emissiveIntensity: lit, transparent, alphaTest: transparent ? 0.3 : 0, side: DoubleSide });
}

/** A W x H board centred at frame point (a, y, b), facing the frame's +b (out of the facade). */
export function placeSign(group, F, a, y, b, W, H, mat, turn = 0) {
  const m = new Mesh(new PlaneGeometry(W, H), mat);
  const p = F.at(a, y, b);
  m.position.set(p[0], p[1], p[2]);
  m.rotation.y = Math.atan2(F.f[0], F.f[1]) + turn;
  group.add(m);
  return m;
}

/** Big centred lettering helper for sign painters. */
export function letter(g, text, x, y, px, colour, { font = '900', family = '"Arial Black", Arial, sans-serif', italic = false, max = 1e9, stroke = null, sw = 0 } = {}) {
  g.font = `${italic ? 'italic ' : ''}${font} ${px}px ${family}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (stroke) { g.lineWidth = sw; g.strokeStyle = stroke; g.strokeText(text, x, y, max); }
  g.fillStyle = colour; g.fillText(text, x, y, max);
}
