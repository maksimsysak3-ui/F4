/**
 * Electric hypercar body: a low, smooth teardrop. A short nose with a
 * full-width light bar, a bubble canopy set well forward, flowing haunches
 * over the rear wheels and a long, tapering tail with a ducktail lip.
 * Design space: +X left, +Y up, +Z forward.
 */
import { createLoft } from '../../car/loft.js';

export const AXLE_FRONT = 1.05;
export const AXLE_REAR = -1.05;
export const NOSE_Z = 1.72;
export const TAIL_Z = -1.85;
export const WELL_X = 0.52;
export const COWL_Z = 0.55;
export const ROOF_FRONT_Z = -0.05;
export const ROOF_END_Z = -0.75;

// Row: [z, x0,y0, x1,y1, x2,y2, x3,y3, x4,y4, x5,y5, y6]
const LINES = [
  [1.72, 0.6, 0.12, 0.68, 0.17, 0.72, 0.28, 0.7, 0.4, 0.5, 0.42, 0.24, 0.43, 0.43],
  [1.62, 0.8, 0.11, 0.86, 0.17, 0.89, 0.32, 0.86, 0.52, 0.62, 0.52, 0.3, 0.52, 0.52],
  [1.4, 0.9, 0.11, 0.94, 0.18, 0.96, 0.42, 0.92, 0.74, 0.66, 0.66, 0.32, 0.64, 0.64],
  [1.05, 0.94, 0.12, 0.96, 0.2, 0.97, 0.5, 0.92, 0.88, 0.68, 0.78, 0.34, 0.73, 0.73],
  [0.75, 0.92, 0.13, 0.94, 0.21, 0.95, 0.5, 0.9, 0.82, 0.7, 0.78, 0.4, 0.77, 0.77],
  [COWL_Z, 0.9, 0.13, 0.92, 0.22, 0.93, 0.5, 0.88, 0.76, 0.74, 0.79, 0.5, 0.81, 0.81],
  [ROOF_FRONT_Z, 0.88, 0.13, 0.9, 0.22, 0.91, 0.52, 0.85, 0.76, 0.72, 0.82, 0.5, 1.14, 1.17],
  [-0.4, 0.88, 0.13, 0.9, 0.22, 0.92, 0.54, 0.87, 0.78, 0.72, 0.84, 0.5, 1.15, 1.18],
  [ROOF_END_Z, 0.9, 0.14, 0.93, 0.24, 0.96, 0.57, 0.92, 0.86, 0.78, 0.9, 0.52, 1.06, 1.09],
  [-1.05, 0.97, 0.16, 0.99, 0.26, 1.0, 0.62, 0.96, 0.92, 0.8, 0.94, 0.56, 0.96, 0.98],
  [-1.45, 0.94, 0.18, 0.96, 0.28, 0.97, 0.6, 0.92, 0.82, 0.78, 0.84, 0.56, 0.86, 0.87],
  [-1.85, 0.8, 0.24, 0.84, 0.32, 0.86, 0.58, 0.82, 0.74, 0.7, 0.78, 0.52, 0.8, 0.8],
];

const ARCH = [[0, 0.82], [0.16, 0.81], [0.28, 0.77], [0.37, 0.69], [0.43, 0.57], [0.46, 0.4], [0.47, 0.14]];

function stripMaterial(strip, z) {
  switch (strip) {
    case 4:
      if (z < COWL_Z && z > ROOF_END_Z) return 'glass';
      return 'paint';
    case 5:
      if (z < COWL_Z && z > ROOF_FRONT_Z) return 'glass';   // windscreen
      if (z <= ROOF_FRONT_Z && z > ROOF_END_Z) return 'glass'; // the glass roof of the canopy
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
  extraStations: [1.55, 0.25, -0.2, -0.6, -1.25, -1.65],
  stripMaterial,
});
