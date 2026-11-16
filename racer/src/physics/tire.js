/**
 * Combined-slip tire model.
 *
 * Slip ratio and slip angle are normalised by their peak values and combined
 * into one slip magnitude `s` (friction ellipse). A single curve maps `s` to the
 * fraction of available grip: it rises to 1 at s = 1 (the peak) and decays
 * smoothly towards `slide` as the tire slides. The resulting force is split back
 * into longitudinal / lateral parts in proportion to each normalised slip, so
 * hard braking eats into cornering grip and vice versa.
 */

/** Grip fraction for a normalised combined slip (C1-continuous). */
export function frictionCurve(s, slide, falloff) {
  if (s <= 1) return 1.5 * s - 0.5 * s * s * s;
  const e = s - 1;
  return slide + (1 - slide) * Math.exp(-falloff * e * e);
}

/** Grip drops as a tire is loaded beyond its nominal load (why weight transfer matters). */
export function loadFactor(load, nominalLoad, sensitivity) {
  return Math.max(0.6, 1 - sensitivity * (load / nominalLoad - 1));
}

/**
 * @param {object} t        tire params (muLat, muLong, peakSlipAngle, peakSlipRatio, slide, falloff)
 * @param {number} grip     normal load * load factor (N)
 * @param {number} slipRatio  (wheel surface speed - ground speed) / reference speed
 * @param {number} slipAngle  radians, positive when the contact patch slides to the left
 * @param {object} out      receives fx (forward +), fy (left +), slip (combined, normalised)
 */
export function tireForce(t, grip, slipRatio, slipAngle, out) {
  const sx = slipRatio / t.peakSlipRatio;
  const sy = slipAngle / t.peakSlipAngle;
  const s = Math.hypot(sx, sy);
  out.slip = s;
  if (s < 1e-9 || grip <= 0) {
    out.fx = 0;
    out.fy = 0;
    return out;
  }
  const f = frictionCurve(s, t.slide, t.falloff) * grip / s;
  out.fx = f * sx * t.muLong;
  out.fy = -f * sy * t.muLat;
  return out;
}

/** Max d(fx)/d(slipRatio): used to integrate wheel spin implicitly (stable at any load). */
export function longitudinalStiffness(t, grip) {
  return (1.5 * grip * t.muLong) / t.peakSlipRatio;
}
