/**
 * Rally car body: a three-door hatch in modern rally trim. The same clean lines
 * as a road hatchback, but pumped out over both axles into wide box arches,
 * sitting high on long-travel suspension, with a raised bonnet, a short nose
 * with a deep splitter and a roof vent. Design space: +X left, +Y up, +Z forward.
 */
import { createLoft } from '../../car/loft.js';

export const AXLE_FRONT = 1.2;
export const AXLE_REAR = -1.2;
export const NOSE_Z = 1.95;
export const TAIL_Z = -1.72;
export const WELL_X = 0.52;
export const COWL_Z = 0.62;        // windscreen base
export const ROOF_FRONT_Z = 0.0;   // windscreen top
export const ROOF_END_Z = -1.2;    // roof meets the tailgate glass
export const HATCH_Z = -1.55;      // tailgate glass bottom

// Row: [z, x0,y0, x1,y1, x2,y2, x3,y3, x4,y4, x5,y5, y6]  (see car/loft.js)
// Body sides pulled out to 0.98 over the axles (the arches), tucked in to 0.88 between them.
const W = (z) => {
  const near = Math.max(0, 1 - Math.min(Math.abs(z - AXLE_FRONT), Math.abs(z - AXLE_REAR)) / 0.62);
  return 0.885 + 0.1 * Math.min(1, near * 1.6);
};
const row = (z, y0, y2, y3, x4, y4, x5, y5, y6, tuck = 0) => {
  const w = W(z) - tuck;
  return [z, w - 0.04, y0, w - 0.01, y0 + 0.12, w, y2, w - 0.04, y3, x4, y4, x5, y5, y6];
};
const LINES = [
  row(1.95, 0.24, 0.5, 0.68, 0.62, 0.72, 0.3, 0.74, 0.74, 0.07),
  row(1.86, 0.2, 0.52, 0.72, 0.66, 0.77, 0.31, 0.79, 0.79, 0.02),
  row(1.5, 0.19, 0.55, 0.77, 0.68, 0.84, 0.32, 0.87, 0.87),
  row(1.0, 0.19, 0.57, 0.8, 0.7, 0.88, 0.34, 0.92, 0.93),
  row(COWL_Z, 0.19, 0.58, 0.8, 0.8, 0.86, 0.7, 0.9, 0.92),
  row(ROOF_FRONT_Z, 0.19, 0.58, 0.8, 0.79, 0.86, 0.63, 1.38, 1.41),
  row(-0.6, 0.19, 0.59, 0.81, 0.79, 0.87, 0.63, 1.4, 1.43),
  row(ROOF_END_Z, 0.19, 0.6, 0.81, 0.79, 0.87, 0.62, 1.34, 1.36),
  row(HATCH_Z, 0.2, 0.6, 0.81, 0.78, 0.86, 0.66, 1.0, 1.02),
  row(TAIL_Z, 0.24, 0.58, 0.79, 0.76, 0.83, 0.66, 0.95, 0.96, 0.05),
];

// Big square-ish arches, cut high for suspension travel and the tall gravel tyres.
const ARCH = [[0, 0.86], [0.17, 0.85], [0.29, 0.81], [0.38, 0.73], [0.44, 0.61], [0.48, 0.44], [0.5, 0.2]];

function stripMaterial(strip, z) {
  switch (strip) {
    case 4:
      if (z < COWL_Z && z > -0.95) return 'glass';
      return 'paint';
    case 5:
      if (z < COWL_Z && z > ROOF_FRONT_Z) return 'glass';
      if (z < ROOF_END_Z && z > HATCH_Z) return 'glass';
      return 'paint';
    default:
      return 'paint';
  }
}

export const loft = createLoft({
  lines: LINES,
  arch: ARCH,
  axles: [AXLE_FRONT, AXLE_REAR],
  wellX: WELL_X,
  extraStations: [1.75, 1.4, 0.95, 0.3, -0.3, -0.95, -1.4, -1.65],
  stripMaterial,
});
