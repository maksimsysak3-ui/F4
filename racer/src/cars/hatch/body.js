/**
 * Hot hatch body: a compact five-door with a short hood, a long flat roof, and
 * a steep tailgate under a roof spoiler. Design space: +X left, +Y up, +Z forward.
 */
import { createLoft } from '../../car/loft.js';

export const AXLE_FRONT = 1.2;
export const AXLE_REAR = -1.25;
export const NOSE_Z = 1.95;
export const TAIL_Z = -1.72;
export const WELL_X = 0.5;
export const COWL_Z = 0.62;        // windscreen base
export const ROOF_FRONT_Z = 0.0;   // windscreen top
export const ROOF_END_Z = -1.25;   // roof meets the tailgate glass
export const HATCH_Z = -1.6;       // tailgate glass bottom

// Row: [z, x0,y0, x1,y1, x2,y2, x3,y3, x4,y4, x5,y5, y6]  (see car/loft.js)
const LINES = [
  [1.95, 0.78, 0.22, 0.83, 0.32, 0.85, 0.52, 0.83, 0.7, 0.62, 0.74, 0.3, 0.76, 0.76],
  [1.88, 0.84, 0.19, 0.87, 0.3, 0.88, 0.54, 0.86, 0.73, 0.64, 0.78, 0.31, 0.8, 0.8],
  [1.5, 0.87, 0.18, 0.89, 0.29, 0.9, 0.56, 0.88, 0.77, 0.66, 0.83, 0.32, 0.86, 0.86],
  [0.75, 0.87, 0.18, 0.89, 0.29, 0.9, 0.58, 0.88, 0.8, 0.68, 0.88, 0.34, 0.92, 0.92],
  [COWL_Z, 0.87, 0.18, 0.89, 0.29, 0.9, 0.58, 0.88, 0.8, 0.8, 0.85, 0.7, 0.9, 0.92],
  [ROOF_FRONT_Z, 0.87, 0.18, 0.89, 0.29, 0.9, 0.58, 0.87, 0.8, 0.79, 0.86, 0.63, 1.42, 1.45],
  [-0.9, 0.87, 0.18, 0.89, 0.29, 0.905, 0.59, 0.875, 0.81, 0.79, 0.87, 0.63, 1.44, 1.47],
  [ROOF_END_Z, 0.87, 0.18, 0.89, 0.29, 0.905, 0.6, 0.875, 0.81, 0.79, 0.87, 0.62, 1.38, 1.4],
  [HATCH_Z, 0.86, 0.2, 0.88, 0.31, 0.895, 0.6, 0.865, 0.81, 0.78, 0.86, 0.66, 1.0, 1.02],
  [TAIL_Z, 0.84, 0.24, 0.86, 0.33, 0.87, 0.58, 0.845, 0.79, 0.76, 0.83, 0.66, 0.95, 0.96],
];

// Round arches with a slight flare.
const ARCH = [[0, 0.82], [0.15, 0.81], [0.27, 0.77], [0.36, 0.69], [0.42, 0.58], [0.46, 0.42], [0.48, 0.2]];

function stripMaterial(strip, z) {
  switch (strip) {
    case 4:
      if (z < COWL_Z && z > -1.05) return 'glass';                   // side windows up to the thick C-pillar
      return 'paint';
    case 5:
      if (z < COWL_Z && z > ROOF_FRONT_Z) return 'glass';            // windscreen
      if (z < ROOF_END_Z && z > HATCH_Z) return 'glass';             // tailgate glass
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
  extraStations: [1.7, 1.0, 0.3, -0.45, -1.05, -1.4, -1.68],
  stripMaterial,
});

export const { sectionAt, surfacePoint } = loft;
