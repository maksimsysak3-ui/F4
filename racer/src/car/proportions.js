/**
 * Miniature proportions, shared by a car's physics and its visuals.
 *
 * Bodies are designed in "design space" (normal-ish car proportions). To make
 * them Choro-Q style miniatures we:
 *  1. squash them lengthwise with a piecewise-linear map that keeps the wheel
 *     arches undistorted (so the big wheels still fit) but crushes the cabin
 *     and overhangs, giving a stubby wheelbase and a bubble cabin;
 *  2. scale everything down uniformly by `scale`.
 *
 * @param {object} o
 * @param {number} o.scale          uniform miniature scale
 * @param {number[][]} o.knots      [design z, squashed z] pairs, ascending
 * @param {number} o.overhangSlope  squash factor beyond the outer knots
 */
export function createProportions({ scale, knots, overhangSlope }) {
  const first = knots[0];
  const last = knots[knots.length - 1];

  function squashSlope(z) {
    if (z <= first[0] || z >= last[0]) return overhangSlope;
    for (let i = 1; i < knots.length; i++) {
      if (z <= knots[i][0]) return (knots[i][1] - knots[i - 1][1]) / (knots[i][0] - knots[i - 1][0]);
    }
    return overhangSlope;
  }

  function squashZ(z) {
    if (z <= first[0]) return first[1] + (z - first[0]) * overhangSlope;
    if (z >= last[0]) return last[1] + (z - last[0]) * overhangSlope;
    for (let i = 1; i < knots.length; i++) {
      const [z0, s0] = knots[i - 1];
      const [z1, s1] = knots[i];
      if (z <= z1) return s0 + ((z - z0) * (s1 - s0)) / (z1 - z0);
    }
    return last[1];
  }

  /** Design-space point [x, y, z] -> model metres (squashed and scaled, ground at y = 0). */
  function designToModel([x, y, z]) {
    return [x * scale, y * scale, squashZ(z) * scale];
  }

  return { scale, squashZ, squashSlope, designToModel };
}
