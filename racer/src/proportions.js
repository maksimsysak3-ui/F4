/**
 * Miniature proportions, shared by physics and visuals.
 *
 * The body is designed in "design space" (a normal-ish supercar, axles at
 * z = ±1.025). To make it a Choro-Q style miniature we:
 *  1. squash it lengthwise with a piecewise-linear map that keeps the wheel
 *     arches undistorted (so the big wheels still fit) but crushes the cabin
 *     and overhangs, giving a stubby wheelbase and a bubble cabin;
 *  2. scale the whole thing down uniformly by MODEL_SCALE.
 */
export const MODEL_SCALE = 0.85;

export const DESIGN_AXLE = 1.025;
export const SQUASHED_AXLE = 0.75;

// [design z, squashed z]. Slope 1 across each arch (axle ± 0.47), 0.5 through the cabin.
const KNOTS = [
  [-1.495, -1.22],
  [-0.555, -0.28],
  [0.555, 0.28],
  [1.495, 1.22],
];
const OVERHANG_SLOPE = 0.75;

export function squashSlope(z) {
  if (z <= KNOTS[0][0] || z >= KNOTS[KNOTS.length - 1][0]) return OVERHANG_SLOPE;
  for (let i = 1; i < KNOTS.length; i++) {
    if (z <= KNOTS[i][0]) return (KNOTS[i][1] - KNOTS[i - 1][1]) / (KNOTS[i][0] - KNOTS[i - 1][0]);
  }
  return OVERHANG_SLOPE;
}

export function squashZ(z) {
  const first = KNOTS[0];
  const last = KNOTS[KNOTS.length - 1];
  if (z <= first[0]) return first[1] + (z - first[0]) * OVERHANG_SLOPE;
  if (z >= last[0]) return last[1] + (z - last[0]) * OVERHANG_SLOPE;
  for (let i = 1; i < KNOTS.length; i++) {
    const [z0, s0] = KNOTS[i - 1];
    const [z1, s1] = KNOTS[i];
    if (z <= z1) return s0 + ((z - z0) * (s1 - s0)) / (z1 - z0);
  }
  return last[1];
}

/** Design-space point [x, y, z] -> model metres (squashed and scaled, ground at y = 0). */
export function designToModel([x, y, z]) {
  return [x * MODEL_SCALE, y * MODEL_SCALE, squashZ(z) * MODEL_SCALE];
}
