import { PALETTE, rgb } from './buildings.js';

/**
 * Hand-built props: palms, round trees, grandstands, the harbour quay, piers,
 * moored yachts, a breakwater and the lighthouse. All draw through a Frame
 * (see buildings.js): a along, y up, b outwards.
 */

const PALM_GREEN = [rgb(0x3f7a3a), rgb(0x4e8a3c), rgb(0x346b36)];
const TRUNK = rgb(0x8a6a4a);

/** Low-poly palm: a gently curving segmented trunk and drooping fronds. */
export function palm(F, r, height = 7 + r() * 3) {
  const lean = (r() - 0.5) * 0.25;
  const segs = 6;
  let a = 0, b = 0, y = 0;
  for (let k = 0; k < segs; k++) {
    const t = k / segs;
    const na = a + lean * (height / segs) * (0.4 + t), nb = b + lean * 0.4 * (height / segs);
    const ny = y + height / segs;
    const w0 = 0.22 - t * 0.08, w1 = 0.22 - (t + 1 / segs) * 0.08;
    F.block('stucco', [[a - w0, b - w0], [a + w0, b - w0], [a + w0, b + w0], [a - w0, b + w0]],
      [[na - w1, nb - w1], [na + w1, nb - w1], [na + w1, nb + w1], [na - w1, nb + w1]], y, ny, k % 2 ? TRUNK : [TRUNK[0] * 0.85, TRUNK[1] * 0.85, TRUNK[2] * 0.85]);
    a = na; b = nb; y = ny;
  }
  const fronds = 8;
  for (let k = 0; k < fronds; k++) {
    const t = (k / fronds) * Math.PI * 2 + r() * 0.3;
    const dx = Math.cos(t), dz = Math.sin(t);
    const len = 3 + r() * 1.2;
    const col = PALM_GREEN[k % 3];
    // Two-segment drooping leaf, as a thin diamond strip.
    const p0 = F.at(a, y, b);
    const p1 = F.at(a + dx * len * 0.55, y + 0.6, b + dz * len * 0.55);
    const p2 = F.at(a + dx * len, y - 0.9, b + dz * len);
    const sx = -dz * 0.45, sz = dx * 0.45;
    const l1 = F.at(a + dx * len * 0.55 + sx, y + 0.45, b + dz * len * 0.55 + sz);
    const r1 = F.at(a + dx * len * 0.55 - sx, y + 0.45, b + dz * len * 0.55 - sz);
    F.mb.color = col;
    for (const [q0, q1, q2] of [[p0, l1, p1], [p0, p1, r1], [p1, l1, p2], [p1, p2, r1]]) {
      F.mb.triFacing('leaf', q0, q1, q2, [0, 1, 0]);
    }
  }
  // Coconuts.
  F.box('stucco', a - 0.25, a + 0.25, y - 0.5, y - 0.1, b - 0.25, b + 0.25, rgb(0x5a4026));
}

/** Round tree: faceted canopy on a short trunk. */
export function tree(F, r) {
  const h = 2 + r() * 1.5;
  F.box('stucco', -0.18, 0.18, 0, h, -0.18, 0.18, TRUNK);
  const R = 1.8 + r() * 1.2;
  const col = PALM_GREEN[Math.floor(r() * 3)];
  F.cylinder('leaf', 0, 0, R, h, h + R * 0.9, 7, col);
  F.cylinder('leaf', 0, 0, R * 0.7, h + R * 0.9, h + R * 1.6, 7, [col[0] * 1.1, col[1] * 1.1, col[2] * 1.05]);
}

/**
 * Grandstand facing +b (the track): stepped tiers, roof on columns, sponsor
 * fascia. Returns seat positions (world) for the crowd.
 */
export function grandstand(F, r, W, tiers = 9) {
  const seats = [];
  const step = 0.85, rise = 0.55;
  const depth = tiers * step + 1.5;
  const seatCols = [rgb(0x1f4f9a), rgb(0x2a63b8)];
  // Tiers from the front (b = 0) going back and up.
  for (let k = 0; k < tiers; k++) {
    const b1 = -k * step, b0 = b1 - step;
    const y = 1.2 + k * rise;
    F.box('concrete', -W / 2, W / 2, 0, y, b0, b1, PALETTE.concrete);
    F.box('concrete', -W / 2, W / 2, y, y + 0.08, b0 + 0.05, b1, seatCols[k % 2]);
    for (let a = -W / 2 + 0.4; a < W / 2 - 0.3; a += 0.55) {
      if (r() < 0.78) seats.push(F.at(a + (r() - 0.5) * 0.1, y + 0.08, b1 - 0.45));
    }
  }
  // Back wall, front wall with railing, side walls.
  const top = 1.2 + tiers * rise;
  F.box('concrete', -W / 2, W / 2, 0, top + 1.2, -depth, -depth + 0.4, PALETTE.concrete);
  F.box('concrete', -W / 2, W / 2, 0, 1.3, 0, 0.3, PALETTE.trim);
  for (const a of [-W / 2, W / 2 - 0.4]) F.box('concrete', a, a + 0.4, 0, top + 1.2, -depth, 0.3, PALETTE.concrete);
  // Roof: columns at the back and a cantilevered canopy.
  const roofY = top + 3.6;
  for (let a = -W / 2 + 0.5; a <= W / 2 - 0.5; a += 7) F.box('metal', a - 0.15, a + 0.15, top, roofY, -depth + 0.4, -depth + 0.7, PALETTE.iron);
  F.block('roof', [[-W / 2 - 0.5, -depth], [W / 2 + 0.5, -depth], [W / 2 + 0.5, 1.2], [-W / 2 - 0.5, 1.2]],
    [[-W / 2 - 0.5, -depth], [W / 2 + 0.5, -depth], [W / 2 + 0.5, 1.2], [-W / 2 - 0.5, 1.2]], roofY, roofY + 0.25, rgb(0xe9e7e1));
  return { seats, fascia: { a0: -W / 2 - 0.5, a1: W / 2 + 0.5, y0: roofY - 0.9, y1: roofY + 0.25, b: 1.25 } };
}

/** Motor yacht: lofted hull, white decks, dark windows, a flybridge and a mast. */
export function yacht(F, r, len) {
  const w = len * 0.26;
  const hull = r() < 0.75 ? rgb(0xf4f4f2) : pick3(r, [0x1b2a3f, 0x8a1c1c, 0x2f4f3f]);
  // Hull as two blocks: a tapered bow and the main body.
  F.block('stucco', [[-len / 2, -w / 2], [len * 0.25, -w / 2], [len * 0.25, w / 2], [-len / 2, w / 2]],
    [[-len / 2, -w / 2 - 0.1], [len * 0.25, -w / 2 - 0.1], [len * 0.25, w / 2 + 0.1], [-len / 2, w / 2 + 0.1]], -0.5, 0.9, hull);
  F.block('stucco', [[len * 0.25, -w / 2], [len / 2, -0.05], [len / 2, 0.05], [len * 0.25, w / 2]],
    [[len * 0.25, -w / 2 - 0.1], [len / 2 + 0.4, -0.05], [len / 2 + 0.4, 0.05], [len * 0.25, w / 2 + 0.1]], -0.5, 1.0, hull);
  F.box('trim', -len / 2, len * 0.4, 0.88, 0.95, -w / 2 - 0.05, w / 2 + 0.05, rgb(0xb0865a)); // teak deck
  // Superstructure with dark glazing.
  const s0 = -len * 0.32, s1 = len * 0.18;
  F.box('stucco', s0, s1, 0.95, 2.4, -w * 0.38, w * 0.38, PALETTE.trim);
  F.box('glass', s0 + 0.3, s1 - 0.3, 1.4, 2.1, -w * 0.39, w * 0.39, null);
  F.box('stucco', s0 + 0.4, s1 - 1.2, 2.4, 3.3, -w * 0.3, w * 0.3, PALETTE.trim);
  F.box('glass', s0 + 0.6, s1 - 1.4, 2.6, 3.1, -w * 0.31, w * 0.31, null);
  F.box('metal', s0 + 1.2, s0 + 1.3, 3.3, 5.5 + r() * 2, -0.05, 0.05, PALETTE.iron);
  // Portholes glow at dusk.
  for (let k = 0; k < 4; k++) {
    const a = -len * 0.35 + k * len * 0.15;
    for (const b of [-w / 2 - 0.11, w / 2 + 0.11]) F.box('winLit', a - 0.18, a + 0.18, 0.35, 0.6, b - 0.01, b + 0.01, [1.3, 1.0, 0.6]);
  }
}

function pick3(r, hexes) { return rgb(hexes[Math.floor(r() * hexes.length) % hexes.length]); }

/** Lighthouse at the end of the breakwater: banded tower, gallery, glowing lamp room. */
export function lighthouse(F) {
  const bands = [0xf2efe8, 0xc8242b];
  for (let k = 0; k < 6; k++) F.cylinder('stucco', 0, 0, 2.2 - k * 0.18, k * 3, (k + 1) * 3, 10, rgb(bands[k % 2]));
  F.cylinder('metal', 0, 0, 1.9, 18, 18.3, 10, PALETTE.iron);
  F.cylinder('winLit', 0, 0, 1.05, 18.3, 20.2, 10, [3.0, 2.4, 1.2]);
  F.cylinder('roof', 0, 0, 1.3, 20.2, 20.6, 10, PALETTE.iron);
  F.cylinder('roof', 0, 0, 0.5, 20.6, 21.6, 10, PALETTE.iron);
}

/** Crowd colours: shirts, hats, flags. */
export const CROWD = [0xc8242b, 0xf2ede2, 0x1f4f9a, 0xffc21a, 0x2f6b4a, 0xe86a2c, 0x222226, 0x9b59b6, 0x6fd61f, 0xff4fa0].map(rgb);
