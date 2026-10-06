import { PALETTE, rgb, pick, scaleC, Frame, rng } from './kit.js';

export { Frame, rng, rgb, PALETTE };
export { cypress } from './trees.js';
import { cypress } from './trees.js';

/**
 * Hand-modelled Riviera architecture for Porto Vela.
 *
 * Facades are built the way a low-poly artist would: the wall plane is made of
 * piers and spandrels around real window openings, so every window has a
 * reveal that catches light and shadow, then dressed with sills, shutters,
 * pediments, balconies, quoins, cornices, awnings and bougainvillea.
 */

const REVEAL = 0.26;
const SIGNS = 4; // rows in the hotel sign atlas (see textures.js)

// ---------------------------------------------------------------------------
// Facade construction

/**
 * A run of floors with real window openings between a0 and a1.
 * floors: [{ y, h }]. Options decide shutters, balconies, pediments, lights.
 */
function facade(F, r, o) {
  const { a0, a1, wall } = o;
  const bays = o.bays;
  const bw = (a1 - a0) / bays;
  const ww = Math.min(o.winW, bw * 0.46);
  const shutterW = ww * 0.5;
  for (const [fi, fl] of o.floors.entries()) {
    const sill = fl.y + 0.85;
    const head = Math.min(fl.y + fl.h - 0.45, sill + o.winH);
    // Spandrels below and above the windows, the full width of the facade.
    F.box('stucco', a0, a1, fl.y, sill, -REVEAL, 0, wall);
    F.box('stucco', a0, a1, head, fl.y + fl.h, -REVEAL, 0, wall);
    // Piers between the openings.
    const xs = [];
    for (let k = 0; k < bays; k++) xs.push(a0 + bw * (k + 0.5));
    let left = a0;
    for (const cx of xs) {
      F.box('stucco', left, cx - ww / 2, sill, head, -REVEAL, 0, wall);
      left = cx + ww / 2;
    }
    F.box('stucco', left, a1, sill, head, -REVEAL, 0, wall);
    // Reveal soffit and the window itself, set back in the opening.
    const balconyFloor = o.balcony && o.balcony(fi);
    const pediment = o.pediment && o.pediment(fi);
    for (const cx of xs) {
      const lit = r() < o.lit;
      const glassKey = lit ? 'winLit' : 'glass';
      const glow = lit ? scaleC(pick(r, [[1, 0.72, 0.42], [1, 0.82, 0.55], [0.95, 0.65, 0.38]]), 0.75 + r() * 0.6) : null;
      F.face(glassKey, cx - ww / 2, cx + ww / 2, sill, head, -REVEAL + 0.01, glow);
      // Frame: mullion and transom in white joinery.
      F.box('trim', cx - 0.035, cx + 0.035, sill, head, -REVEAL + 0.01, -REVEAL + 0.05, PALETTE.trim);
      F.box('trim', cx - ww / 2, cx + ww / 2, head - 0.42, head - 0.36, -REVEAL + 0.01, -REVEAL + 0.05, PALETTE.trim);
      // Stone sill.
      F.box('trim', cx - ww / 2 - 0.12, cx + ww / 2 + 0.12, sill - 0.1, sill + 0.02, -0.05, 0.13, o.stone || PALETTE.trim);
      // Lintel or pediment.
      if (pediment) {
        F.box('trim', cx - ww / 2 - 0.2, cx + ww / 2 + 0.2, head, head + 0.14, -0.02, 0.14, o.stone || PALETTE.trim);
        F.mb.color = o.stone || PALETTE.trim;
        const t0 = F.at(cx - ww / 2 - 0.2, head + 0.14, 0.12), t1 = F.at(cx + ww / 2 + 0.2, head + 0.14, 0.12), t2 = F.at(cx, head + 0.55, 0.12);
        F.mb.triFacing('trim', t0, t1, t2, [F.f[0], 0.2, F.f[1]]);
        const u0 = F.at(cx - ww / 2 - 0.2, head + 0.14, -0.02), u2 = F.at(cx, head + 0.55, -0.02), u1 = F.at(cx + ww / 2 + 0.2, head + 0.14, -0.02);
        F.mb.triFacing('trim', t0, t2, u2, [-F.r[0], 1, -F.r[1]]);
        F.mb.triFacing('trim', t0, u2, u0, [-F.r[0], 1, -F.r[1]]);
        F.mb.triFacing('trim', t1, u1, u2, [F.r[0], 1, F.r[1]]);
        F.mb.triFacing('trim', t1, u2, t2, [F.r[0], 1, F.r[1]]);
      } else {
        F.box('trim', cx - ww / 2 - 0.08, cx + ww / 2 + 0.08, head, head + 0.1, -0.02, 0.06, o.stone || PALETTE.trim);
      }
      // Louvred shutters folded back against the piers (with a slat line).
      if (o.shutter && !balconyFloor) {
        for (const sgn of [-1, 1]) {
          const s0 = cx + sgn * (ww / 2 + 0.02), s1 = cx + sgn * (ww / 2 + 0.02 + shutterW);
          F.box('stucco', Math.min(s0, s1), Math.max(s0, s1), sill + 0.02, head - 0.02, 0, 0.05, o.shutter);
          F.face('stucco', Math.min(s0, s1) + 0.04, Math.max(s0, s1) - 0.04, (sill + head) / 2 - 0.03, (sill + head) / 2 + 0.03, 0.055, scaleC(o.shutter, 0.7));
        }
      }
      if (balconyFloor) balcony(F, cx, sill, ww / 2 + (o.wideBalcony ? bw * 0.3 : 0.45), o, r);
    }
  }
}

/** Wrought-iron balcony with a stone slab, rail and balusters, sometimes planted. */
function balcony(F, cx, sill, hw, o, r) {
  const d = 0.85;
  const y = sill - 0.12;
  F.box('trim', cx - hw, cx + hw, y - 0.16, y, -0.05, d, o.stone || PALETTE.trim);
  // Corbels.
  for (const s of [-1, 1]) F.box('trim', cx + s * (hw - 0.2) - 0.08, cx + s * (hw - 0.2) + 0.08, y - 0.45, y - 0.16, 0, d * 0.6, o.stone || PALETTE.trim);
  F.box('metal', cx - hw, cx + hw, y + 0.95, y + 1.0, d - 0.06, d, PALETTE.iron);
  F.box('metal', cx - hw, cx + hw, y + 0.12, y + 0.16, d - 0.06, d, PALETTE.iron);
  for (const s of [-1, 1]) F.box('metal', cx + s * hw - 0.03, cx + s * hw + 0.03, y, y + 1.0, 0, d, PALETTE.iron);
  const n = Math.max(3, Math.round(hw * 4));
  for (let k = 0; k <= n; k++) {
    const x = cx - hw + (2 * hw * k) / n;
    F.box('metal', x - 0.015, x + 0.015, y, y + 0.96, d - 0.05, d - 0.02, PALETTE.iron);
  }
  if (r() < 0.45) {
    F.box('stucco', cx - hw + 0.12, cx - hw + 0.62, y, y + 0.32, d - 0.4, d - 0.1, rgb(0xb5603f));
    F.box('leaf', cx - hw + 0.08, cx - hw + 0.66, y + 0.32, y + 0.7, d - 0.44, d - 0.06, PALETTE.plant);
    if (r() < 0.6) F.box('leaf', cx - hw + 0.18, cx - hw + 0.5, y + 0.7, y + 0.86, d - 0.36, d - 0.14, pick(r, PALETTE.flowers));
  }
}

/** Rusticated stone quoins up a corner, wrapping onto the side wall. */
function quoins(F, a, side, y0, y1, color) {
  let k = 0;
  for (let y = y0; y < y1 - 0.2; y += 0.62, k++) {
    const w = k % 2 ? 0.45 : 0.75;
    const ax0 = side < 0 ? a - 0.05 : a - w, ax1 = side < 0 ? a + w : a + 0.05;
    F.box('trim', ax0, ax1, y, y + 0.5, -(k % 2 ? 0.45 : 0.75), 0.05, color);
  }
}

/** Two-step cornice with a frieze band. */
function cornice(F, W, D, H, color) {
  F.box('trim', -W / 2 - 0.05, W / 2 + 0.05, H - 0.9, H - 0.6, -D - 0.05, 0.08, scaleC(color, 0.96));
  F.box('trim', -W / 2 - 0.22, W / 2 + 0.22, H - 0.6, H - 0.3, -D - 0.22, 0.24, color);
  F.box('trim', -W / 2 - 0.42, W / 2 + 0.42, H - 0.3, H, -D - 0.42, 0.45, color);
}

/** Bougainvillea climbing a pier: magenta blossom clumps on green. */
function bougainvillea(F, r, a, y0, y1) {
  for (let y = y0; y < y1; y += 0.7 + r() * 0.4) {
    const w = 0.6 + r() * 0.9;
    const x = a + (r() - 0.5) * 0.8;
    const col = r() < 0.7 ? pick(r, PALETTE.bougainvillea) : PALETTE.plant;
    F.block('leaf', [[x - w / 2, 0.02], [x + w / 2, 0.02], [x + w / 2 - 0.1, 0.42], [x - w / 2 + 0.1, 0.42]],
      [[x - w / 2 + 0.15, 0.02], [x + w / 2 - 0.15, 0.02], [x + w / 2 - 0.2, 0.3], [x - w / 2 + 0.2, 0.3]], y, y + 0.55 + r() * 0.3, col);
  }
}

/** Ground floor: shops behind piers, with striped awnings, sign band and a door. */
function shops(F, r, a0, a1, g, wall) {
  const bays = Math.max(1, Math.round((a1 - a0) / 3.8));
  const bw = (a1 - a0) / bays;
  const [awA, awB] = pick(r, PALETTE.awning);
  const awnings = r() < 0.8;
  // Base course and sign band span the full width.
  F.box('stucco', a0, a1, 0, 0.45, -REVEAL, 0.04, scaleC(wall, 0.78));
  F.box('stucco', a0, a1, g - 0.95, g, -REVEAL, 0, scaleC(wall, 0.92));
  let left = a0;
  for (let k = 0; k < bays; k++) {
    const x0 = a0 + k * bw + 0.35, x1 = a0 + (k + 1) * bw - 0.35;
    F.box('stucco', left, x0, 0.45, g - 0.95, -REVEAL, 0, scaleC(wall, 0.92));
    left = x1;
    const lit = scaleC([1, 0.8, 0.55], 0.85 + r() * 0.5);
    F.face('winLit', x0, x1, 0.45, g - 0.95, -REVEAL - 0.15, lit);
    // Shop window frame and door.
    F.box('trim', x0, x1, 0.45, 0.6, -REVEAL - 0.1, 0, scaleC(wall, 0.5));
    if (r() < 0.4) F.face('stucco', (x0 + x1) / 2 - 0.55, (x0 + x1) / 2 + 0.55, 0.45, 2.6, -REVEAL - 0.12, scaleC(pick(r, PALETTE.shutter), 0.8));
    // Painted shop sign in the band.
    F.face('stucco', x0 + 0.3, x1 - 0.3, g - 0.82, g - 0.4, 0.01, pick(r, [rgb(0x1f3a2c), rgb(0x5a1e1e), rgb(0x1c2c4a), rgb(0xf2ede2)]));
    if (awnings) {
      const stripes = 6;
      for (let s = 0; s < stripes; s++) {
        const sa = x0 + ((x1 - x0) * s) / stripes, sb = x0 + ((x1 - x0) * (s + 1)) / stripes;
        const col = s % 2 ? awA : awB;
        F.mb.color = col;
        const p = [F.at(sa, g - 1.05, 0.05), F.at(sb, g - 1.05, 0.05), F.at(sb, g - 1.75, 1.6), F.at(sa, g - 1.75, 1.6)];
        F.mb.triFacing('fabric', p[0], p[1], p[2], [F.f[0], 1.5, F.f[1]]);
        F.mb.triFacing('fabric', p[0], p[2], p[3], [F.f[0], 1.5, F.f[1]]);
        // Scalloped valance: alternating short and long drops.
        F.face('fabric', sa, sb, g - (s % 2 ? 2.05 : 1.98), g - 1.75, 1.6, col);
      }
    }
  }
  F.box('stucco', left, a1, 0.45, g - 0.95, -REVEAL, 0, scaleC(wall, 0.92));
}

/** Ground floor portico: columns carrying an entablature, shops recessed behind. */
function arcade(F, r, a0, a1, g, stone) {
  const bays = Math.max(2, Math.round((a1 - a0) / 3.6));
  const bw = (a1 - a0) / bays;
  const depth = 2.0;
  F.box('trim', a0, a1, g - 0.7, g, 0, depth, stone);          // entablature
  F.box('trim', a0, a1, g - 0.75, g - 0.7, 0, depth, scaleC(stone, 0.8)); // ceiling line
  for (let k = 0; k <= bays; k++) {
    const x = a0 + k * bw;
    F.box('trim', x - 0.3, x + 0.3, 0, 0.35, depth - 0.6, depth, scaleC(stone, 0.9));
    F.cylinder('trim', x, depth - 0.3, 0.2, 0.35, g - 0.95, 8, stone);
    F.box('trim', x - 0.3, x + 0.3, g - 0.95, g - 0.75, depth - 0.6, depth, scaleC(stone, 0.9));
  }
  // Recessed shopfronts in the gallery.
  for (let k = 0; k < bays; k++) {
    const x0 = a0 + k * bw + 0.4, x1 = a0 + (k + 1) * bw - 0.4;
    F.face('winLit', x0, x1, 0.2, g - 1.3, -0.02, scaleC([1, 0.82, 0.58], 0.8 + r() * 0.5));
  }
  F.box('stucco', a0, a1, 0, g, -REVEAL - 0.3, -0.05, scaleC(stone, 0.85));
}

/** Roof options: tiled hip roof with chimneys, flat terrace with parasols, or a belvedere. */
/**
 * Pitched tiled roof in one of several forms, dressed with ridge caps, gutters,
 * chimneys, antennas and dishes. Returns nothing; draws through F.
 */
export function pitchedRoof(F, r, W, D, H, wall, detail = true) {
  const tile = scaleC(pick(r, PALETTE.roofTile), 0.9 + r() * 0.2);
  const cap = scaleC(tile, 0.72);
  const form = pick(r, ['hip', 'hip', 'gable', 'cross', 'dormer', 'altana']);
  const pitch = Math.min(3.4, D * (0.22 + r() * 0.1));
  let ridge = pitch;
  if (form === 'gable' || form === 'cross') {
    // Ridge along the street, gable ends on the sides.
    F.gableRoof('roof', -W / 2, W / 2, -D, 0, H, pitch, tile, wall, 0.45);
    F.box('roof', -W / 2 - 0.45, W / 2 + 0.45, H + pitch - 0.05, H + pitch + 0.12, -D / 2 - 0.14, -D / 2 + 0.14, cap);
    // Barge boards along the gable edges.
    for (const a of [-W / 2 - 0.45, W / 2 + 0.3]) {
      F.mb.color = PALETTE.trim;
      F.block('trim', [[a, -D - 0.3], [a + 0.15, -D - 0.3], [a + 0.15, -D / 2], [a, -D / 2]], [[a, -D / 2 - 0.05], [a + 0.15, -D / 2 - 0.05], [a + 0.15, -D / 2 + 0.05], [a, -D / 2 + 0.05]], H - 0.1, H + pitch, PALETTE.trim);
    }
    if (form === 'cross' && W > 10) {
      // A wing with its own gable facing the street.
      const ww = Math.min(6, W * 0.4), x = (r() < 0.5 ? -1 : 1) * (W / 2 - ww / 2 - 0.5);
      F.mb.color = tile;
      const hb = pitch * 0.9;
      const p = (a, y, b) => F.at(a, y, b);
      F.mb.triFacing('roof', p(x - ww / 2 - 0.3, H, 0.4), p(x, H + hb, 0.4), p(x, H + hb, -D / 2), [-F.r[0], 1, -F.r[1]]);
      F.mb.triFacing('roof', p(x - ww / 2 - 0.3, H, 0.4), p(x, H + hb, -D / 2), p(x - ww / 2 - 0.3, H, -D / 2), [-F.r[0], 1, -F.r[1]]);
      F.mb.triFacing('roof', p(x + ww / 2 + 0.3, H, 0.4), p(x, H + hb, 0.4), p(x, H + hb, -D / 2), [F.r[0], 1, F.r[1]]);
      F.mb.triFacing('roof', p(x + ww / 2 + 0.3, H, 0.4), p(x, H + hb, -D / 2), p(x + ww / 2 + 0.3, H, -D / 2), [F.r[0], 1, F.r[1]]);
      F.mb.color = wall;
      F.mb.triFacing('stucco', p(x - ww / 2, H, 0.02), p(x + ww / 2, H, 0.02), p(x, H + hb - 0.2, 0.02), [F.f[0], 0, F.f[1]]);
      F.face('glass', x - 0.45, x + 0.45, H + 0.4, H + 1.4, 0.04, null); // oculus window in the gable
      F.box('roof', x - 0.12, x + 0.12, H + hb - 0.05, H + hb + 0.1, -D / 2, 0.4, cap);
    }
  } else {
    F.hipRoof('roof', -W / 2, W / 2, -D, 0, H, pitch, tile, 0.5);
    // Ridge and hip caps: darker tile courses along the creases.
    const inset = Math.min(W + 1, D + 1) / 2;
    const ra0 = -W / 2 - 0.5 + inset, ra1 = W / 2 + 0.5 - inset;
    if (ra1 > ra0) F.box('roof', ra0, ra1, H + pitch - 0.05, H + pitch + 0.1, -D / 2 - 0.12, -D / 2 + 0.12, cap);
    if (form === 'dormer') {
      const n = Math.max(1, Math.floor(W / 5));
      for (let k = 0; k < n; k++) {
        const x = -W / 2 + (W / n) * (k + 0.5);
        F.box('stucco', x - 0.7, x + 0.7, H + 0.2, H + 1.7, -1.6, -0.55, wall);
        F.face('glass', x - 0.42, x + 0.42, H + 0.4, H + 1.45, -0.53, null);
        F.hipRoof('roof', x - 0.7, x + 0.7, -1.6, -0.55, H + 1.7, 0.6, tile, 0.15);
      }
    } else if (form === 'altana' && detail) {
      // Altana: a timber roof deck on posts with a railing and a pergola of vines.
      const x = (r() - 0.5) * Math.max(0, W - 6), z = -D / 2, wd = 3.2, dp = 2.6, y = H + pitch * 0.75;
      const wood = rgb(0x7a5a3c);
      for (const a of [x - wd / 2, x + wd / 2]) for (const b of [z - dp / 2, z + dp / 2]) F.box('trim', a - 0.07, a + 0.07, H, y + 2.2, b - 0.07, b + 0.07, wood);
      F.box('trim', x - wd / 2 - 0.1, x + wd / 2 + 0.1, y, y + 0.12, z - dp / 2 - 0.1, z + dp / 2 + 0.1, wood);
      for (let a = x - wd / 2; a <= x + wd / 2 + 0.01; a += 0.4) F.box('trim', a - 0.03, a + 0.03, y + 0.12, y + 0.95, z + dp / 2 - 0.03, z + dp / 2 + 0.03, wood);
      F.box('trim', x - wd / 2, x + wd / 2, y + 0.95, y + 1.02, z + dp / 2 - 0.05, z + dp / 2 + 0.05, wood);
      for (let b = z - dp / 2; b <= z + dp / 2 + 0.01; b += 0.45) F.box('trim', x - wd / 2 - 0.2, x + wd / 2 + 0.2, y + 2.2, y + 2.28, b - 0.04, b + 0.04, wood);
      F.box('leaf', x - wd / 2, x + wd / 2 - 0.6, y + 2.28, y + 2.45, z - dp / 2 + 0.2, z + dp / 2 - 0.4, PALETTE.plant);
    }
  }
  // Eave gutter along the street.
  F.box('metal', -W / 2 - 0.45, W / 2 + 0.45, H - 0.12, H + 0.02, 0.36, 0.5, rgb(0x6d5a48));
  // Chimneys: stucco stacks with a tiled cap on little piers and a pair of pots.
  const chim = 1 + Math.floor(r() * (detail ? 3 : 2));
  for (let k = 0; k < chim; k++) {
    const x = (r() - 0.5) * (W - 3), z = -D * (0.25 + r() * 0.5), h = ridge + 0.6 + r() * 1.2;
    const cw = 0.35 + r() * 0.2;
    F.box('stucco', x - cw, x + cw, H, H + h, z - cw, z + cw, wall);
    F.box('trim', x - cw - 0.08, x + cw + 0.08, H + h, H + h + 0.12, z - cw - 0.08, z + cw + 0.08, PALETTE.trim);
    if (r() < 0.6) {
      for (const s of [-1, 1]) F.box('trim', x + s * (cw - 0.12) - 0.08, x + s * (cw - 0.12) + 0.08, H + h + 0.12, H + h + 0.45, z - 0.08, z + 0.08, PALETTE.trim);
      F.hipRoof('roof', x - cw, x + cw, z - cw, z + cw, H + h + 0.45, 0.3, tile, 0.12);
    } else {
      for (const s of [-1, 1]) F.cylinder('roof', x + s * cw * 0.45, z, 0.11, H + h + 0.12, H + h + 0.5, 6, scaleC(tile, 0.85));
    }
  }
  if (!detail) return;
  // TV antenna, sometimes a satellite dish, sometimes a water tank.
  if (r() < 0.55) {
    const x = (r() - 0.5) * (W - 2), z = -D * 0.5, top = H + ridge + 2.2 + r() * 1.5;
    F.box('metal', x - 0.03, x + 0.03, H + ridge * 0.6, top, z - 0.03, z + 0.03, PALETTE.iron);
    for (let k = 0; k < 3; k++) {
      const y = top - 0.25 - k * 0.45, w = 0.9 - k * 0.2;
      F.box('metal', x - 0.02, x + 0.02, y - 0.02, y + 0.02, z - w / 2, z + w / 2, PALETTE.iron);
    }
  }
  if (r() < 0.3) {
    const x = (r() - 0.5) * (W - 3), z = -D * 0.3, y = H + ridge * 0.55;
    F.block('trim', [[x - 0.35, z - 0.05], [x + 0.35, z - 0.05], [x + 0.35, z + 0.05], [x - 0.35, z + 0.05]], [[x - 0.35, z + 0.05], [x + 0.35, z + 0.05], [x + 0.35, z + 0.15], [x - 0.35, z + 0.15]], y, y + 0.7, rgb(0xe8e6e0));
  }
}

function roof(F, r, W, D, H, wall, style) {
  if (style === 'hip' || style === 'pitched') { pitchedRoof(F, r, W, D, H, wall); return; }
  // Flat roof: balustraded parapet front, plain elsewhere.
  F.box('trim', -W / 2, W / 2, H, H + 0.15, -0.3, 0, PALETTE.trim);
  for (let x = -W / 2 + 0.2; x < W / 2; x += 0.45) F.box('trim', x - 0.07, x + 0.07, H + 0.15, H + 0.85, -0.22, -0.08, PALETTE.trim);
  F.box('trim', -W / 2, W / 2, H + 0.85, H + 1.0, -0.3, 0, PALETTE.trim);
  F.box('trim', -W / 2, -W / 2 + 0.3, H, H + 1.0, -D, 0, PALETTE.trim);
  F.box('trim', W / 2 - 0.3, W / 2, H, H + 1.0, -D, 0, PALETTE.trim);
  F.box('trim', -W / 2, W / 2, H, H + 1.0, -D, -D + 0.3, PALETTE.trim);
  if (style === 'terrace') {
    const n = 1 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) parasol(F, r, -W / 2 + 2 + r() * (W - 4), -2 - r() * (D - 4), H);
    if (r() < 0.6) {
      const x0 = W / 2 - 6, x1 = W / 2 - 1, z0 = -D + 1, z1 = -D + 5;
      for (const x of [x0, x1]) for (const z of [z0, z1]) F.box('trim', x - 0.07, x + 0.07, H, H + 2.5, z - 0.07, z + 0.07, PALETTE.trim);
      for (let x = x0; x <= x1; x += 0.7) F.box('trim', x - 0.04, x + 0.04, H + 2.5, H + 2.6, z0, z1, PALETTE.trim);
      F.box('leaf', x0, x1, H + 2.6, H + 2.75, z0 + 0.6, z1 - 0.6, PALETTE.plant);
    }
  } else if (style === 'belvedere') {
    // Little square tower with arched loggia openings and its own tiled roof.
    const x = (r() - 0.5) * (W - 6), z = -D * 0.5;
    F.box('stucco', x - 2, x + 2, H, H + 3.6, z - 2, z + 2, wall);
    for (const s of [-1, 1]) F.face('glass', x - 1.2, x + 1.2, H + 1, H + 3, z + 2.01, null);
    F.box('trim', x - 2.2, x + 2.2, H + 3.6, H + 3.85, z - 2.2, z + 2.2, PALETTE.trim);
    F.hipRoof('roof', x - 2, x + 2, z - 2, z + 2, H + 3.85, 1.6, pick(r, PALETTE.roofTile), 0.35);
  }
}

/** Beach-club parasol with a little table. */
function parasol(F, r, x, z, y) {
  const col = pick(r, PALETTE.parasol);
  F.box('metal', x - 0.04, x + 0.04, y, y + 2.3, z - 0.04, z + 0.04, PALETTE.iron);
  F.mb.color = col;
  const tip = F.at(x, y + 2.75, z);
  const sides = 8;
  for (let k = 0; k < sides; k++) {
    const t0 = (k / sides) * Math.PI * 2, t1 = ((k + 1) / sides) * Math.PI * 2;
    const p0 = F.at(x + Math.cos(t0) * 1.4, y + 2.2, z + Math.sin(t0) * 1.4);
    const p1 = F.at(x + Math.cos(t1) * 1.4, y + 2.2, z + Math.sin(t1) * 1.4);
    F.mb.color = k % 2 ? col : PALETTE.parasol[0];
    F.mb.triFacing('fabric', p0, p1, tip, [0, 1, 0]);
  }
  F.cylinder('trim', x, z, 0.4, y + 0.7, y + 0.75, 8, PALETTE.trim);
  F.box('metal', x - 0.03, x + 0.03, y, y + 0.7, z - 0.03, z + 0.03, PALETTE.iron);
}

/** Café terrace on the pavement: parasols, tables, chairs and planters. */
export function cafe(F, r, a0, a1) {
  const n = Math.max(1, Math.floor((a1 - a0) / 3.2));
  for (let k = 0; k < n; k++) {
    const x = a0 + (a1 - a0) * ((k + 0.5) / n);
    parasol(F, r, x, 2.0, 0.14);
    for (const s of [-1, 1]) {
      F.box('metal', x + s * 0.65 - 0.2, x + s * 0.65 + 0.2, 0.14, 0.6, 1.8, 2.2, PALETTE.iron);
      F.box('metal', x + s * 0.65 - 0.2, x + s * 0.65 + 0.2, 0.6, 1.1, s > 0 ? 2.15 : 1.8, s > 0 ? 2.2 : 1.85, PALETTE.iron);
    }
  }
  for (const x of [a0 + 0.3, a1 - 0.8]) {
    F.box('stucco', x, x + 0.5, 0.14, 0.75, 3.0, 3.5, rgb(0xb5603f));
    F.cylinder('leaf', x + 0.25, 3.25, 0.4, 0.75, 1.6, 6, PALETTE.plant);
  }
}

/** Classic scooter parked on the pavement. */
export function scooter(F, r, x, b) {
  const col = pick(r, [rgb(0x8fc1b5), rgb(0xe8d9b5), rgb(0xc8242b), rgb(0x2f5a8a)]);
  F.cylinder('metal', x - 0.55, b, 0.22, 0.14, 0.2, 8, PALETTE.iron);
  F.cylinder('metal', x + 0.55, b, 0.22, 0.14, 0.2, 8, PALETTE.iron);
  F.box('stucco', x - 0.75, x + 0.1, 0.3, 0.75, b - 0.28, b + 0.28, col);
  F.box('stucco', x + 0.1, x + 0.6, 0.25, 0.4, b - 0.15, b + 0.15, col);
  F.box('stucco', x + 0.5, x + 0.65, 0.4, 1.05, b - 0.12, b + 0.12, col);
  F.box('metal', x + 0.5, x + 0.6, 1.05, 1.1, b - 0.35, b + 0.35, PALETTE.iron);
  F.box('stucco', x - 0.65, x - 0.05, 0.75, 0.85, b - 0.2, b + 0.2, rgb(0x3a2a20));
}

// ---------------------------------------------------------------------------
// Archetypes: (F, r, lot) where lot = { width, depth, floors, detail }.

/** Rear elevation: plain windows with shutters, so buildings seen from behind aren't blank boxes. */
function backWindows(F, r, a0, a1, D, g, floors, fh, shutter) {
  const bays = Math.max(1, Math.round((a1 - a0) / 3.4));
  const bw = (a1 - a0) / bays;
  for (let f = 0; f < floors; f++) {
    const y = g + f * fh + 0.75;
    for (let k = 0; k < bays; k++) {
      const a = a0 + bw * (k + 0.5);
      const lit = r() < 0.28;
      F.face('trim', a - 0.62, a + 0.62, y - 0.12, y - 0.02, -D - 0.03, PALETTE.trim, -1);
      F.face(lit ? 'winLit' : 'glass', a - 0.48, a + 0.48, y, y + 1.5, -D - 0.03, lit ? [1, 0.76, 0.46] : null, -1);
      if (shutter && r() < 0.75) for (const s of [-1, 1]) F.face('stucco', a + s * 0.5, a + s * 0.92, y, y + 1.5, -D - 0.04, shutter, -1);
    }
  }
}

/** Riviera palazzo: stucco, shutters, balconies, shops or an arcade, rich roofline. */
export function riviera(F, r, lot) {
  const { width: W, depth: D } = lot;
  const floors = lot.floors;
  const g = 4.4, fh = 3.2;
  const H = g + floors * fh;
  const wall = pick(r, PALETTE.stucco);
  const stone = r() < 0.5 ? PALETTE.trim : PALETTE.stone;
  const shutter = pick(r, PALETTE.shutter);
  // Body behind the facade plane.
  F.box('stucco', -W / 2, W / 2, 0, H - 0.9, -D, -REVEAL, wall);
  if (r() < 0.25) arcade(F, r, -W / 2, W / 2, g, stone);
  else shops(F, r, -W / 2, W / 2, g, wall);
  const bays = Math.max(2, Math.round(W / 3.1));
  const balconyRule = r();
  facade(F, r, {
    a0: -W / 2, a1: W / 2, wall, stone, shutter, bays, winW: 1.25, winH: 1.85, lit: 0.36,
    floors: Array.from({ length: floors }, (_, f) => ({ y: g + f * fh, h: fh })),
    balcony: (f) => (balconyRule < 0.35 ? f === 0 : balconyRule < 0.7 ? f % 2 === 0 : r() < 0.3),
    pediment: (f) => f === 0 && r() < 0.55,
    wideBalcony: r() < 0.3,
  });
  if (r() < 0.55) { quoins(F, -W / 2, -1, g, H - 0.9, stone); quoins(F, W / 2, 1, g, H - 0.9, stone); }
  if (r() < 0.35) bougainvillea(F, r, -W / 2 + 0.6 + r() * (W - 1.2), 0.5, g + fh * (1 + Math.floor(r() * 2)));
  // Side walls: fewer, flat windows (they're seen at a glance).
  if (lot.detail) sideWindows(F, r, W, D, g, floors, fh, wall);
  backWindows(F, r, -W / 2, W / 2, D - 0.02, g, floors, fh, shutter);
  cornice(F, W, D, H, stone);
  roof(F, r, W, D, H, wall, pick(r, ['hip', 'hip', 'terrace', 'belvedere']));
  if (lot.street && r() < 0.55) cafe(F, r, -W / 2 + 0.5, W / 2 - 0.5);
  else if (lot.street && r() < 0.5) scooter(F, r, (r() - 0.5) * (W - 2), 2.6);
}

function sideWindows(F, r, W, D, g, floors, fh, wall) {
  const n = Math.max(1, Math.round(D / 4.2));
  for (let f = 0; f < floors; f++) {
    const y = g + f * fh + 0.85;
    for (let k = 0; k < n; k++) {
      const b = -D + (D / n) * (k + 0.5);
      for (const [a, dir] of [[-W / 2 - 0.02, -1], [W / 2 + 0.02, 1]]) {
        const lit = r() < 0.3;
        F.sideFace('trim', a, b - 0.68, b + 0.68, y - 0.12, y + 1.82, PALETTE.trim, dir);
        F.sideFace(lit ? 'winLit' : 'glass', a + dir * 0.01, b - 0.55, b + 0.55, y, y + 1.7, lit ? [1, 0.78, 0.5] : null, dir);
      }
    }
  }
}

/** A row of narrow townhouses, each its own colour, height and roof. */
export function townhouses(F, r, lot) {
  const { width: W, depth: D } = lot;
  const n = Math.max(2, Math.round(W / 6.5));
  const w = W / n;
  for (let k = 0; k < n; k++) {
    const a0 = -W / 2 + k * w, a1 = a0 + w;
    const floors = 2 + Math.floor(r() * 3);
    const g = 3.8, fh = 3.0;
    const H = g + floors * fh;
    const wall = pick(r, PALETTE.stucco);
    const shutter = pick(r, PALETTE.shutter);
    F.box('stucco', a0, a1, 0, H, -D, -REVEAL, wall);
    // Ground floor: front door with fanlight, and one shop or window.
    F.box('stucco', a0, a1, 0, g, -REVEAL, 0, wall);
    const dc = (a0 + a1) / 2 + (r() < 0.5 ? -w * 0.22 : w * 0.22);
    F.box('trim', dc - 0.75, dc + 0.75, 0, 2.95, 0, 0.08, PALETTE.trim);
    F.face('stucco', dc - 0.55, dc + 0.55, 0, 2.4, 0.09, pick(r, PALETTE.shutter));
    F.face('winLit', dc - 0.45, dc + 0.45, 2.45, 2.8, 0.09, [1, 0.8, 0.5]);
    const wa = (a0 + a1) - dc;
    F.face(r() < 0.6 ? 'winLit' : 'glass', wa - 0.7, wa + 0.7, 0.9, 2.6, 0.02, [1, 0.8, 0.55]);
    F.box('trim', wa - 0.85, wa + 0.85, 0.75, 0.9, 0, 0.12, PALETTE.trim);
    facade(F, r, {
      a0, a1, wall, shutter, bays: 2, winW: 0.95, winH: 1.6, lit: 0.34,
      floors: Array.from({ length: floors }, (_, f) => ({ y: g + f * fh, h: fh })),
      balcony: (f) => f === 0 && r() < 0.35,
    });
    F.box('trim', a0, a1, H - 0.3, H, -D, 0.2, PALETTE.trim);
    if (r() < 0.3) bougainvillea(F, r, a0 + w * (0.2 + r() * 0.6), 0.3, g + 1.5);
    if (r() < 0.7) {
      // Each house gets its own roof form, so a row reads as separate buildings.
      backWindows(F, r, a0 + 0.3, a1 - 0.3, D, g, floors, fh, shutter);
      const c = F.at((a0 + a1) / 2, 0, 0);
      pitchedRoof(new Frame(F.mb, c[0], F.o[1], c[2], F.r[0], F.r[1]), r, w - 0.1, D, H, wall, lot.detail);
    } else roof(F, r, w, D, H, wall, 'terrace');
  }
}

/** Belle Époque grand hotel: arcade, balconies, pediments, mansard with dormers, domed turrets, sign. */
export function grandHotel(F, r, lot) {
  const { width: W, depth: D } = lot;
  const floors = lot.floors;
  const g = 5.2, fh = 3.3;
  const H = g + floors * fh;
  const wall = pick(r, [PALETTE.stone, rgb(0xf4ebdc), rgb(0xf0dcc6), rgb(0xe8d3b8)]);
  const stone = PALETTE.trim;
  F.box('stucco', -W / 2, W / 2, 0, H - 0.9, -D, -REVEAL, wall);
  arcade(F, r, -W / 2, W / 2, g, stone);
  const bays = Math.max(4, Math.round(W / 3.3));
  facade(F, r, {
    a0: -W / 2, a1: W / 2, wall, stone, shutter: null, bays, winW: 1.3, winH: 2.1, lit: 0.48,
    floors: Array.from({ length: floors }, (_, f) => ({ y: g + f * fh, h: fh })),
    balcony: (f) => f % 2 === 0, pediment: (f) => f === 0 || f === 2, wideBalcony: true,
  });
  quoins(F, -W / 2, -1, g, H - 0.9, stone);
  quoins(F, W / 2, 1, g, H - 0.9, stone);
  if (lot.detail) sideWindows(F, r, W, D, g, floors, fh, wall);
  backWindows(F, r, -W / 2, W / 2, D - 0.02, g, floors, fh, null);
  cornice(F, W, D, H, stone);
  // Mansard roof with dormers.
  const mH = 4.2;
  F.block('roof', [[-W / 2 + 0.3, -D + 0.3], [W / 2 - 0.3, -D + 0.3], [W / 2 - 0.3, -0.3], [-W / 2 + 0.3, -0.3]],
    [[-W / 2 + 1.8, -D + 1.8], [W / 2 - 1.8, -D + 1.8], [W / 2 - 1.8, -1.8], [-W / 2 + 1.8, -1.8]], H, H + mH, PALETTE.slate);
  for (let k = 0; k < bays; k++) {
    const x = -W / 2 + (W / bays) * (k + 0.5);
    F.box('trim', x - 0.65, x + 0.65, H + 0.6, H + 2.6, -1.3, -0.6, stone);
    F.face(r() < 0.5 ? 'winLit' : 'glass', x - 0.42, x + 0.42, H + 0.8, H + 2.2, -0.58, [1.1, 0.85, 0.5]);
    F.mb.color = PALETTE.slate;
    F.mb.triFacing('roof', F.at(x - 0.8, H + 2.6, -0.55), F.at(x + 0.8, H + 2.6, -0.55), F.at(x, H + 3.2, -0.55), [F.f[0], 0.3, F.f[1]]);
  }
  // Corner turrets with copper domes and finials.
  for (const x of [-W / 2 + 1.6, W / 2 - 1.6]) {
    F.cylinder('trim', x, -1.6, 1.9, H, H + mH + 1.2, 8, wall);
    for (let k = 0; k < 4; k++) F.face('glass', x - 0.5, x + 0.5, H + 1 + k * 0.01, H + mH, 0.31 - 0.01 * k, null);
    const rings = [[2.05, 0], [1.9, 0.9], [1.45, 1.8], [0.8, 2.5], [0.2, 2.9]];
    const base = H + mH + 1.2;
    for (let k = 0; k < rings.length - 1; k++) {
      F.mb.color = PALETTE.copper;
      for (let s = 0; s < 8; s++) {
        const t0 = (s / 8) * Math.PI * 2, t1 = ((s + 1) / 8) * Math.PI * 2;
        const p = (rr, t, hh) => F.at(x + Math.cos(t) * rr, base + hh, -1.6 + Math.sin(t) * rr);
        const out = [Math.cos((t0 + t1) / 2), 0.6, Math.sin((t0 + t1) / 2)];
        const n = [F.r[0] * out[0] + F.f[0] * out[2], out[1], F.r[1] * out[0] + F.f[1] * out[2]];
        F.mb.triFacing('copper', p(rings[k][0], t0, rings[k][1]), p(rings[k][0], t1, rings[k][1]), p(rings[k + 1][0], t1, rings[k + 1][1]), n);
        F.mb.triFacing('copper', p(rings[k][0], t0, rings[k][1]), p(rings[k + 1][0], t1, rings[k + 1][1]), p(rings[k + 1][0], t0, rings[k + 1][1]), n);
      }
    }
    F.box('metal', x - 0.04, x + 0.04, base + 2.9, base + 4.2, -1.64, -1.56, PALETTE.iron);
  }
  // Glowing hotel name on the roofline.
  const row = Math.floor(r() * SIGNS);
  const sw = Math.min(W * 0.6, 16);
  const p = [F.at(-sw / 2, H + 0.4, 0.5), F.at(sw / 2, H + 0.4, 0.5), F.at(sw / 2, H + 2.2, 0.5), F.at(-sw / 2, H + 2.2, 0.5)];
  F.mb.color = null;
  F.mb.quadUV('sign', p[0], p[1], p[2], p[3], [0, row / SIGNS], [1, row / SIGNS], [1, (row + 1) / SIGNS], [0, (row + 1) / SIGNS]);
  for (const x of [-sw / 2 + 0.5, sw / 2 - 0.5]) F.box('metal', x - 0.05, x + 0.05, H, H + 2.2, 0.35, 0.45, PALETTE.iron);
  if (lot.street) cafe(F, r, -W / 2 + 1, W / 2 - 1);
}

/** Belle Époque casino: the landmark by the start line. */
export function casino(F, r, lot) {
  const { width: W, depth: D } = lot;
  const H = 17;
  const stone = PALETTE.stone;
  F.box('stucco', -W / 2, W / 2, 0, H - 0.9, -D, -REVEAL, stone);
  arcade(F, r, -W / 2, W / 2, 5.6, PALETTE.trim);
  const bays = Math.round(W / 4);
  facade(F, r, {
    a0: -W / 2, a1: W / 2, wall: stone, stone: PALETTE.trim, shutter: null, bays, winW: 1.5, winH: 2.8, lit: 0.7,
    floors: [{ y: 5.6, h: 5.2 }, { y: 10.8, h: 5.3 }], balcony: (f) => f === 0, pediment: (f) => f === 0, wideBalcony: true,
  });
  // Paired pilasters on the piano nobile.
  for (let k = 0; k <= bays; k++) {
    const a = -W / 2 + (W / bays) * k;
    F.box('trim', a - 0.5, a - 0.1, 5.6, H - 0.9, 0, 0.32, PALETTE.trim);
    F.box('trim', a + 0.1, a + 0.5, 5.6, H - 0.9, 0, 0.32, PALETTE.trim);
  }
  quoins(F, -W / 2, -1, 5.6, H - 0.9, PALETTE.trim);
  quoins(F, W / 2, 1, 5.6, H - 0.9, PALETTE.trim);
  cornice(F, W, D, H, PALETTE.trim);
  for (let a = -W / 2; a <= W / 2; a += 0.55) F.box('trim', a - 0.08, a + 0.08, H, H + 0.9, 0.2, 0.36, PALETTE.trim);
  F.box('trim', -W / 2 - 0.4, W / 2 + 0.4, H + 0.9, H + 1.05, 0.15, 0.45, PALETTE.trim);
  F.block('roof', [[-W / 2 + 0.6, -D + 0.6], [W / 2 - 0.6, -D + 0.6], [W / 2 - 0.6, -0.6], [-W / 2 + 0.6, -0.6]],
    [[-W / 2 + 2.2, -D + 2.2], [W / 2 - 2.2, -D + 2.2], [W / 2 - 2.2, -2.2], [-W / 2 + 2.2, -2.2]], H, H + 4.5, PALETTE.slate);
  for (let k = 0; k < bays; k++) {
    const a = -W / 2 + (W / bays) * (k + 0.5);
    F.box('trim', a - 0.6, a + 0.6, H + 1.1, H + 3.0, -1.6, -0.9, PALETTE.trim);
    F.face('winLit', a - 0.4, a + 0.4, H + 1.3, H + 2.6, -0.88, [1.1, 0.85, 0.5]);
  }
  // Central dome on a drum, with a lantern and flag.
  const db = -D / 2;
  F.cylinder('stucco', 0, db, 5.4, H + 3.6, H + 6.2, 12, PALETTE.trim);
  for (let k = 0; k < 12; k++) {
    const t = (k / 12) * Math.PI * 2;
    F.box('winLit', Math.cos(t) * 5.35 - 0.35, Math.cos(t) * 5.35 + 0.35, H + 4.2, H + 5.6, db + Math.sin(t) * 5.35 - 0.35, db + Math.sin(t) * 5.35 + 0.35, [1.2, 0.95, 0.6]);
  }
  const rings = [[5.6, 0], [5.3, 1.6], [4.6, 3.0], [3.4, 4.2], [1.9, 5.0], [0.7, 5.4]];
  const base = H + 6.2;
  for (let k = 0; k < rings.length - 1; k++) {
    F.mb.color = PALETTE.copper;
    for (let s = 0; s < 12; s++) {
      const t0 = (s / 12) * Math.PI * 2, t1 = ((s + 1) / 12) * Math.PI * 2;
      const p = (rr, t, hh) => F.at(Math.cos(t) * rr, base + hh, db + Math.sin(t) * rr);
      const out = [Math.cos((t0 + t1) / 2), 0.6, Math.sin((t0 + t1) / 2)];
      const n = [F.r[0] * out[0] + F.f[0] * out[2], out[1], F.r[1] * out[0] + F.f[1] * out[2]];
      F.mb.triFacing('copper', p(rings[k][0], t0, rings[k][1]), p(rings[k][0], t1, rings[k][1]), p(rings[k + 1][0], t1, rings[k + 1][1]), n);
      F.mb.triFacing('copper', p(rings[k][0], t0, rings[k][1]), p(rings[k + 1][0], t1, rings[k + 1][1]), p(rings[k + 1][0], t0, rings[k + 1][1]), n);
    }
  }
  F.cylinder('trim', 0, db, 0.75, base + 5.4, base + 6.8, 8, PALETTE.trim);
  F.cylinder('winLit', 0, db, 0.55, base + 5.6, base + 6.6, 8, [1.4, 1.1, 0.6]);
  F.box('metal', -0.04, 0.04, base + 6.8, base + 10, db - 0.04, db + 0.04, PALETTE.iron);
  F.box('fabric', 0.04, 1.5, base + 9, base + 9.8, db - 0.02, db + 0.02, rgb(0xc8242b));
  F.box('neon', -7, 7, 4.55, 5.15, 2.05, 2.15, [2.6, 1.9, 0.7]);
  // Formal garden in front: clipped hedges and two palms' worth of planters.
  F.box('leaf', -W / 2 + 1, -3, 0, 0.7, 2.3, 3.4, PALETTE.plant);
  F.box('leaf', 3, W / 2 - 1, 0, 0.7, 2.3, 3.4, PALETTE.plant);
}

/** Church with a bell tower, clock faces and a spire. */
export function church(F, r, lot) {
  const { width: W, depth: D } = lot;
  const wall = PALETTE.stucco[2];
  const nw = Math.min(W - 6, 14);
  F.box('stucco', -nw / 2, nw / 2, 0, 11, -D, -2, wall);
  F.gableRoof('roof', -nw / 2, nw / 2, -D, -2, 11, 4.5, PALETTE.roofTile[0], wall);
  F.cylinder('winLit', 0, -2 + 0.05, 1.6, 6, 6.1, 10, [1.3, 0.6, 0.4]);
  F.box('trim', -1.6, 1.6, 0, 4.6, -2, -1.85, PALETTE.trim);
  F.face('stucco', -1.1, 1.1, 0, 3.8, -1.8, rgb(0x5a3a28));
  for (const s of [-1, 1]) F.box('trim', s * nw / 2 - 0.4, s * nw / 2 + 0.4, 0, 11, -2.3, -1.7, PALETTE.trim);
  const tx = nw / 2 + 2.5;
  F.box('stucco', tx - 2.5, tx + 2.5, 0, 24, -7, -2, scaleC(wall, 0.95));
  quoins(F, tx - 2.5, -1, 0, 24, PALETTE.trim);
  F.box('trim', tx - 2.7, tx + 2.7, 17, 17.4, -7.2, -1.8, PALETTE.trim);
  for (const y of [18.2, 21]) F.face('glass', tx - 1, tx + 1, y, y + 2, -1.97, null);
  F.cylinder('winLit', tx, -1.95, 1.1, 13.5, 13.6, 12, [1.6, 1.5, 1.2]);
  F.block('roof', [[tx - 2.6, -7.1], [tx + 2.6, -7.1], [tx + 2.6, -1.9], [tx - 2.6, -1.9]],
    [[tx - 0.05, -4.55], [tx + 0.05, -4.55], [tx + 0.05, -4.45], [tx - 0.05, -4.45]], 24, 32, PALETTE.slate);
}

/** Hillside villa: hip roof, loggia, belvedere, garden wall and cypresses. */
export function villa(F, r, lot) {
  const { width: W, depth: D } = lot;
  const wall = pick(r, PALETTE.stucco);
  const H = 3.4 * (1 + Math.floor(r() * 2)) + 0.6;
  F.box('stucco', -W / 2, W / 2, 0, H, -D, 0, wall);
  const n = Math.max(2, Math.round(W / 3));
  for (let f = 0; f * 3.4 + 1 < H - 1; f++) {
    for (let k = 0; k < n; k++) {
      const a = -W / 2 + (W / n) * (k + 0.5);
      const y = f * 3.4 + 0.9;
      F.face('trim', a - 0.65, a + 0.65, y - 0.1, y + 1.8, 0.02, PALETTE.trim);
      F.face(r() < 0.35 ? 'winLit' : 'glass', a - 0.5, a + 0.5, y, y + 1.6, 0.04, [1, 0.78, 0.5]);
      for (const s of [-1, 1]) F.face('stucco', a + s * 0.52, a + s * 0.98, y, y + 1.6, 0.04, pick(r, PALETTE.shutter));
    }
  }
  pitchedRoof(F, r, W, D, H, wall, lot.detail);
  if (r() < 0.25) roof(F, r, W, D, H, wall, 'belvedere');
  // Garden wall and cypresses in front.
  F.box('stucco', -W / 2 - 2, W / 2 + 2, 0, 1.2, 4.5, 4.8, scaleC(wall, 0.9));
  for (let k = 0; k < 2 + Math.floor(r() * 3); k++) cypress(F, r, -W / 2 + r() * W, 3 + r() * 1.2);
}

/** Background old-town block: cheaper, but still shuttered, corniced and tiled. */
export function backdrop(F, r, lot) {
  const { width: W, depth: D } = lot;
  const floors = lot.floors;
  const H = 3.6 + floors * 3.1;
  const wall = pick(r, PALETTE.stucco);
  const shutter = pick(r, PALETTE.shutter);
  F.box('stucco', -W / 2, W / 2, 0, H, -D, 0, wall);
  F.box('stucco', -W / 2 - 0.04, W / 2 + 0.04, 0, 0.6, -D - 0.04, 0.04, scaleC(wall, 0.8));
  const bays = Math.max(2, Math.round(W / 3.2));
  for (let f = 0; f < floors; f++) {
    const y = 3.6 + f * 3.1 + 0.8;
    for (const [b, dir] of [[0.03, 1], [-D - 0.03, -1]]) {
      for (let k = 0; k < bays; k++) {
        const a = -W / 2 + (W / bays) * (k + 0.5);
        const lit = r() < 0.3;
        F.face(lit ? 'winLit' : 'glass', a - 0.5, a + 0.5, y, y + 1.55, b, lit ? [1, 0.75, 0.45] : null, dir);
        if (r() < 0.7) for (const s of [-1, 1]) F.face('stucco', a + s * 0.52, a + s * 0.95, y, y + 1.55, b + dir * 0.01, shutter, dir);
      }
    }
  }
  F.box('trim', -W / 2 - 0.25, W / 2 + 0.25, H - 0.4, H, -D - 0.25, 0.25, PALETTE.trim);
  if (r() < 0.2) roof(F, r, W, D, H, wall, pick(r, ['terrace', 'belvedere']));
  else pitchedRoof(F, r, W, D, H, wall, r() < 0.5);
}

export const ARCHETYPES = { riviera, townhouses, grandHotel, casino, church, villa, backdrop };

/**
 * Distant town block (cheap: a few dozen triangles): walls, a band of windows and a shutter line per
 * floor front and back, a cornice and a hipped roof. o: { wall, roof, flat, lit }.
 */
export function cheapBlock(F, r, W, D, floors, o = {}) {
  const fh = 3.1, H = 1 + floors * fh, wall = o.wall ?? pick(r, PALETTE.stucco), shut = pick(r, PALETTE.shutter);
  F.box('stucco', -W / 2, W / 2, -2, H, -D, 0, wall);
  for (let f = 0; f < floors; f++) {
    const y = 1.6 + f * fh;
    for (const [b, dir] of [[0.02, 1], [-D - 0.02, -1]]) {
      F.face(r() < (o.lit ?? 0.3) ? 'winLit' : 'glass', -W / 2 + 0.8, W / 2 - 0.8, y, y + 1.5, b, [1, 0.8, 0.55], dir);
      if (!o.flat) F.face('stucco', -W / 2 + 0.8, W / 2 - 0.8, y + 1.5, y + 1.75, b + 0.01 * dir, scaleC(shut, 0.9), dir);
    }
  }
  F.box('trim', -W / 2 - 0.3, W / 2 + 0.3, H, H + 0.4, -D - 0.3, 0.3, o.trim ?? PALETTE.trim);
  if (o.flat) F.box('stucco', -W / 2 + 0.5, W / 2 - 0.5, H + 0.4, H + 1.2, -D + 0.5, -0.5, scaleC(wall, 0.92)); // parapet roof
  else F.block('roof', [[-W / 2, 0], [W / 2, 0], [W / 2, -D], [-W / 2, -D]], [[-W / 2 + 1, -D / 2], [W / 2 - 1, -D / 2], [W / 2 - 1, -D / 2], [-W / 2 + 1, -D / 2]], H + 0.4, H + 3, o.roof ?? rgb(0xb8583a));
}
