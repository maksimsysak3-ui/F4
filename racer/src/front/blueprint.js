import { partImage } from './parts3d.js?v=1a016bc';

/*
 * A design office drawing sheet for a component: the 3D model's orthographic views (front, side, plan)
 * drawn as technical line drawings on a blueprint (grid, border, view labels, a title strip with the
 * office, the part, the spec, the brief and the scale). The views come from the same parametric model
 * as the rendered part (front/parts3d.js), so the drawing is the design.
 *
 * blueprint(slot, { dir, n, name, partName, label, team, round }) returns an SVG string.
 */
const INK = '#d9ecff', DIM = '#7fb6ff';
const W = 960, H = 600;
const text = (x, y, t, { size = 12, anchor = 'start', col = DIM, weight = 700 } = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${col}" font-weight="${weight}" letter-spacing=".08em">${t}</text>`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function blueprint(slot, o = {}) {
  const params = { dir: o.dir ?? [0.5, 0.5], n: o.n ?? 0, team: o.team ?? null };
  const id = `bp${Math.random().toString(36).slice(2, 8)}`;
  // Three views: the front elevation and the side elevation side by side, the plan below across.
  const views = [['front', 'FRONT ELEVATION', 24, 40, 452, 268], ['side', 'SIDE ELEVATION', 484, 40, 452, 268], ['top', 'PLAN VIEW', 24, 318, 640, 230]];
  const img = (v, w, h) => partImage(slot, params, { view: v, w: Math.round(w * 1.5), h: Math.round(h * 1.5) });
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class="bp" font-family="'Titillium Web',Arial,sans-serif">
  <defs><pattern id="${id}g" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0V12" fill="none" stroke="#5c9ae0" stroke-opacity=".12" stroke-width=".6"/></pattern>
  <pattern id="${id}G" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="url(#${id}g)"/><path d="M60 0H0V60" fill="none" stroke="#5c9ae0" stroke-opacity=".26" stroke-width=".8"/></pattern>
  <radialGradient id="${id}r" cx="45%" cy="40%" r="80%"><stop offset="0" stop-color="#103d74"/><stop offset="1" stop-color="#071a36"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#${id}r)"/><rect width="${W}" height="${H}" fill="url(#${id}G)"/>
  <rect x="8" y="8" width="${W - 16}" height="${H - 16}" fill="none" stroke="${INK}" stroke-opacity=".5" stroke-width="1.4"/>
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="${INK}" stroke-opacity=".25" stroke-width=".8"/>
  ${views.map(([v, label, x, y, w, h]) => `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${INK}" stroke-opacity=".18" stroke-dasharray="4 4"/>
    <image x="${x}" y="${y}" width="${w}" height="${h}" href="${img(v, w, h)}" preserveAspectRatio="xMidYMid meet"/>${text(x + 8, y + 18, label, { size: 11, col: INK })}</g>`).join('')}
  ${titleBlock(slot, o)}
</svg>`;
}
function titleBlock(slot, o) {
  const x = 680, y = 318, w = 256, rows = [['DRAWN BY', `${esc((o.team?.name ?? '').toUpperCase())} DESIGN OFFICE`], ['PART', esc((o.partName ?? slot).toUpperCase())], ['SPEC', esc(o.name ?? 'PROPOSAL')], ['BRIEF', esc((o.label ?? '').toUpperCase())], ['ROUND', String(o.round ?? 0)], ['SCALE', '1:10 · DIMENSIONS IN MM']];
  const rh = 38;
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${rh * rows.length}" fill="#0a2547" fill-opacity=".85" stroke="${INK}" stroke-opacity=".6"/>
  ${rows.map(([k, v], i) => `<path d="M${x} ${y + i * rh}H${x + w}" stroke="${INK}" stroke-opacity=".35"/>${text(x + 10, y + i * rh + 14, k, { size: 9.5, col: DIM })}${text(x + 10, y + i * rh + 30, v.length > 34 ? v.slice(0, 33) + '…' : v, { size: 12.5, col: INK })}`).join('')}
  ${text(W - 22, H - 22, 'CONFIDENTIAL', { size: 10, anchor: 'end', col: '#ff8a80' })}</g>`;
}
