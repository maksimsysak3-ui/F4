import { PALETTE, rgb } from './buildings.js';
import { scaleC } from './kit.js';

/**
 * Hand-built props: palms, round trees, grandstands, the harbour quay, piers,
 * moored yachts, a breakwater and the lighthouse. All draw through a Frame
 * (see buildings.js): a along, y up, b outwards.
 */

export { palm, tree } from './trees.js';

/**
 * Grandstand facing +b (the track): stepped tiers, sponsor fascia, either a
 * cantilevered roof on columns or open bleachers with flags. Returns seat
 * positions (world) for the crowd.
 */
export function grandstand(F, r, W, tiers = 9, o = {}) {
  const seats = [];
  const step = 0.85, rise = 0.55;
  const depth = tiers * step + 1.5;
  const seatCols = o.seats ?? [rgb(0x1f4f9a), rgb(0x2a63b8)];
  const roofed = o.roof ?? true;
  // Tiers from the front (b = 0) going back and up, with aisles every ~12 m.
  const aisles = [];
  for (let a = -W / 2 + 12; a < W / 2 - 6; a += 12) aisles.push(a);
  for (let k = 0; k < tiers; k++) {
    const b1 = -k * step, b0 = b1 - step;
    const y = 1.2 + k * rise;
    F.box('concrete', -W / 2, W / 2, 0, y, b0, b1, PALETTE.concrete);
    F.box('concrete', -W / 2, W / 2, y, y + 0.08, b0 + 0.05, b1, seatCols[k % seatCols.length]);
    // Seat backs: a slim rail along each tier.
    F.box('concrete', -W / 2, W / 2, y + 0.08, y + 0.42, b0 + 0.08, b0 + 0.16, scaleC(seatCols[k % seatCols.length], 0.8));
    for (let a = -W / 2 + 0.4; a < W / 2 - 0.3; a += 0.55) {
      if (aisles.some((x) => Math.abs(a - x) < 0.6)) continue;
      if (r() < (o.fill ?? 0.7)) seats.push(F.at(a + (r() - 0.5) * 0.1, y + 0.08, b1 - 0.45));
    }
  }
  for (const x of aisles) {
    for (let k = 0; k < tiers; k++) F.box('concrete', x - 0.5, x + 0.5, 1.2 + k * rise + 0.08, 1.2 + k * rise + 0.1, -(k + 1) * step, -k * step, PALETTE.trim);
    F.box('metal', x - 0.03, x + 0.03, 1.2, 1.2 + tiers * rise + 1, 0.05, 0.11, PALETTE.iron); // handrail post line
  }
  // Back wall, front wall with railing, side walls.
  const top = 1.2 + tiers * rise;
  F.box('concrete', -W / 2, W / 2, 0, top + 1.2, -depth, -depth + 0.4, PALETTE.concrete);
  F.box('concrete', -W / 2, W / 2, 0, 1.3, 0, 0.3, PALETTE.trim);
  F.box('metal', -W / 2, W / 2, 2.2, 2.26, 0.12, 0.18, PALETTE.iron);
  for (let a = -W / 2; a <= W / 2; a += 2) F.box('metal', a - 0.025, a + 0.025, 1.3, 2.2, 0.13, 0.17, PALETTE.iron);
  for (const a of [-W / 2, W / 2 - 0.4]) F.box('concrete', a, a + 0.4, 0, top + 1.2, -depth, 0.3, PALETTE.concrete);
  if (roofed) {
    // Roof: columns at the back and a cantilevered canopy.
    const roofY = top + 3.6;
    for (let a = -W / 2 + 0.5; a <= W / 2 - 0.5; a += 7) F.box('metal', a - 0.15, a + 0.15, top, roofY, -depth + 0.4, -depth + 0.7, PALETTE.iron);
    F.block('roof', [[-W / 2 - 0.5, -depth], [W / 2 + 0.5, -depth], [W / 2 + 0.5, 1.2], [-W / 2 - 0.5, 1.2]],
      [[-W / 2 - 0.5, -depth], [W / 2 + 0.5, -depth], [W / 2 + 0.5, 1.2], [-W / 2 - 0.5, 1.2]], roofY, roofY + 0.25, rgb(0xe9e7e1));
    return { seats, fascia: { a0: -W / 2 - 0.5, a1: W / 2 + 0.5, y0: roofY - 0.9, y1: roofY + 0.25, b: 1.25 } };
  }
  // Open bleachers: a scaffold back with a fascia board and a row of flags.
  F.box('metal', -W / 2, W / 2, top + 1.2, top + 2.6, -depth, -depth + 0.15, PALETTE.iron);
  for (let a = -W / 2 + 1; a < W / 2; a += 4) {
    F.box('metal', a - 0.04, a + 0.04, top + 1.2, top + 5.5, -depth + 0.02, -depth + 0.1, PALETTE.iron);
    const c = PALETTE.parasol[Math.floor(r() * PALETTE.parasol.length)];
    F.mb.color = c;
    F.mb.quad('fabric', F.at(a, top + 4.4, -depth + 0.06), F.at(a + 1.6, top + 4.3, -depth + 0.06), F.at(a + 1.6, top + 5.4, -depth + 0.06), F.at(a, top + 5.5, -depth + 0.06));
  }
  return { seats, fascia: { a0: -W / 2, a1: W / 2, y0: top + 1.3, y1: top + 2.5, b: -depth + 0.4, back: true } };
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

/** Sailing boat at anchor or under sail: slim hull, mast, mainsail and jib. */
export function sailboat(F, r) {
  const len = 8 + r() * 6, w = len * 0.28;
  const hull = r() < 0.7 ? rgb(0xf2f1ec) : rgb([0x1f3a5c, 0x8a1c1c, 0x2f4f3f][Math.floor(r() * 3)]);
  F.block('stucco', [[-len / 2, -w / 2], [len * 0.2, -w / 2], [len * 0.2, w / 2], [-len / 2, w / 2]],
    [[-len / 2, -w / 2 - 0.05], [len * 0.2, -w / 2 - 0.08], [len * 0.2, w / 2 + 0.08], [-len / 2, w / 2 + 0.05]], -0.4, 0.6, hull);
  F.block('stucco', [[len * 0.2, -w / 2], [len / 2, -0.04], [len / 2, 0.04], [len * 0.2, w / 2]],
    [[len * 0.2, -w / 2 - 0.08], [len / 2 + 0.3, -0.04], [len / 2 + 0.3, 0.04], [len * 0.2, w / 2 + 0.08]], -0.4, 0.7, hull);
  F.box('trim', -len / 2, len * 0.35, 0.58, 0.64, -w / 2, w / 2, rgb(0xb0865a));
  F.box('stucco', -len * 0.2, len * 0.05, 0.64, 1.3, -w * 0.3, w * 0.3, rgb(0xf4f2ec));
  const mast = len * 1.25;
  F.box('metal', -0.06, 0.06, 0.6, mast, -0.06, 0.06, PALETTE.iron);
  const sail = r() < 0.8 ? rgb(0xf6f2e6) : rgb([0xc8242b, 0x1f4f9a, 0xe0a22b][Math.floor(r() * 3)]);
  F.mb.color = sail;
  const boom = -len * 0.38, tack = 1.4;
  // Mainsail: a triangle from mast head to the boom, filled a little to one side.
  const bulge = 0.35 * (r() < 0.5 ? 1 : -1);
  F.mb.triFacing('fabric', F.at(0.08, tack, 0), F.at(0.08, mast - 0.4, 0), F.at(boom, tack, bulge), [0, 0, 1]);
  F.mb.color = scaleC(sail, 0.95);
  F.mb.triFacing('fabric', F.at(0.1, mast * 0.8, 0), F.at(len * 0.48, 0.9, bulge * 0.6), F.at(0.1, tack - 0.3, bulge * 0.4), [0, 0, 1]);
  F.box('metal', boom, 0.05, tack - 0.08, tack, -0.04, 0.04, PALETTE.iron);
}
