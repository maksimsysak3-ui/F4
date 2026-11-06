/*
 * Structures that span the track: road overpasses (and anything else that crosses it). Placing one
 * safely is the hard part: across the lap from the wall on one side to the wall on the other, then a
 * check that no part of the footprint lands on another stretch of the circuit (round a hairpin the
 * far abutment would otherwise sit on the road after the bend).
 */
import { rgb, scaleC } from '../street/kit.js';
import { beam } from '../night/venue.js';

const CONC = rgb(0xc8c4bc), STEEL = rgb(0x8a929e);

/** Helpers bound to a circuit: L is its layout, frameAt the scene's frame factory. */
export function trackSpans(L, frameAt) {
  /** A frame across the track at s (a along the span, left to right), and where the walls are. */
  const across = (s) => {
    const i = Math.floor(((s % L.length) + L.length) % L.length / L.ds) % L.N, tx = L.tx[i], tz = L.tz[i];
    const F = frameAt(L.x[i], L.z[i], Math.atan2(-tx, -tz), L.yAt(i, 0));
    const left = F.r[0] * L.nx[i] + F.r[1] * L.nz[i] > 0 ? 1 : -1;
    return { F, i, aL: left * (L.wall.L[i] + 1.5), aR: -left * (L.wall.R[i] + 1.5) };
  };
  /** True if the span from a0 to a1, w wide, touches no other part of the lap than the one at s. */
  const clearAcross = (F, s, a0, a1, w) => {
    for (let a = a0; a <= a1; a += 2) for (const b of [-w / 2, 0, w / 2]) {
      const p = F.at(a, 0, b), n = L.nearest(p[0], p[2]);
      if (!n) continue;
      const ds = Math.abs((((n.s - s) % L.length) + 1.5 * L.length) % L.length - L.length / 2);
      if (ds > 40 && Math.abs(n.lateral) < L.edge + 4) return false;
    }
    return true;
  };
  /** The nearest spot to s (within ±60 m) where a span reaching ext0 / ext1 beyond the walls is clear. */
  const spanAt = (s, ext0, ext1, w, yaw = 0) => {
    for (const d of [0, 15, -15, 30, -30, 45, -45, 60, -60]) {
      const q = s + d, { i, aL, aR } = across(q);
      const F = frameAt(L.x[i], L.z[i], Math.atan2(-L.tx[i], -L.tz[i]) + yaw, L.yAt(i, 0));
      const a0 = Math.min(aL, aR) - ext0, a1 = Math.max(aL, aR) + ext1;
      if (clearAcross(F, q, a0, a1, w)) return { F, i, s: q, aL, aR, a0, a1 };
    }
    return null;
  };
  return { across, clearAcross, spanAt };
}

/** A road bridge's deck across a span: slab, girders, parapets with railing posts. */
export function overpassDeck(F, a0, a1, width, H, col = CONC, rail = STEEL) {
  F.box('concrete', a0, a1, H, H + 1.4, -width / 2, width / 2, col);
  F.box('concrete', a0, a1, H - 0.7, H, -width / 2 + 1, width / 2 - 1, scaleC(col, 0.6));             // girders
  for (const b of [-width / 2, width / 2 - 0.4]) F.box('concrete', a0, a1, H + 1.4, H + 2.4, b, b + 0.4, col);
  for (let a = a0 + 4; a < a1 - 2; a += 2.4) beam(F, 'metal', [a, H + 2.4, -width / 2 + 0.2], [a, H + 3.6, -width / 2 + 0.2], 0.05, rail);
}

/**
 * A complete road overpass on a span from spanAt: the deck, round piers just beyond the walls and
 * solid abutments at both ends. Returns the deck's ends (a0, a1) for any trim the circuit adds.
 */
export function roadOverpass(sp, width, H, { col = CONC, pier = col, abutment = rgb(0xb8b4ac), rail = STEEL } = {}) {
  const { F, aL, aR } = sp, a0 = sp.a0 + 3, a1 = sp.a1 - 3;
  overpassDeck(F, a0, a1, width, H, col, rail);
  for (const a of [Math.min(aL, aR) - 2, Math.max(aL, aR) + 2]) for (const b of [-width / 3, width / 3]) F.cylinder('concrete', a, b, 1.1, -1, H, 10, pier);
  for (const a of [a0, a1]) F.box('concrete', a - 3, a + 3, -1, H + 1.4, -width / 2, width / 2, abutment);
  return { a0, a1 };
}

/**
 * The parts of an overpass on a span that stand off the track (deck ends and abutments, from the
 * span's ends to a metre outside each wall), as scene footprints: test them against what's already
 * placed, then push them so later buildings, masts and trees keep clear.
 */
export function spanFootprints(sp, width) {
  const { F, aL, aR, a0, a1 } = sp, lo = Math.min(aL, aR) - 1, hi = Math.max(aL, aR) + 1;
  const piece = (p, q) => { const c = F.at((p + q) / 2, 0, 0); return { cx: c[0], cz: c[2], ux: F.r[0], uz: F.r[1], hw: (q - p) / 2, hd: width / 2 + 0.5 }; };
  return [piece(a0, lo), piece(hi, a1)].filter((fp) => fp.hw > 0.5);
}
