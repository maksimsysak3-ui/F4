/**
 * Lamborghini body: the lines plan, hexagonal arches and facet materials.
 * The loft engine (car/loft.js) turns this data into the shell.
 */
import { createLoft } from '../../car/loft.js?v=a5d31c9';

export const AXLE_FRONT = 1.025;
export const AXLE_REAR = -1.025;
export const NOSE_Z = 1.7;
export const TAIL_Z = -1.62;
export const WELL_X = 0.52; // inner wall of the wheel wells

const LINES = [
  [ 1.70, 0.56,0.13, 0.62,0.19, 0.66,0.27, 0.62,0.36, 0.44,0.40, 0.21,0.42, 0.42],
  [ 1.63, 0.76,0.12, 0.82,0.19, 0.85,0.31, 0.81,0.45, 0.58,0.50, 0.30,0.51, 0.505],
  [ 1.50, 0.86,0.12, 0.90,0.20, 0.92,0.38, 0.88,0.58, 0.63,0.60, 0.32,0.605,0.60],
  [ 1.25, 0.91,0.13, 0.94,0.21, 0.955,0.45, 0.905,0.76, 0.64,0.72, 0.33,0.695,0.69],
  [ 1.025,0.93,0.13, 0.95,0.22, 0.96,0.50, 0.90,0.86, 0.64,0.80, 0.34,0.765,0.76],
  [ 0.80, 0.93,0.14, 0.95,0.23, 0.955,0.52, 0.89,0.84, 0.70,0.82, 0.46,0.80, 0.795],
  [ 0.62, 0.92,0.14, 0.94,0.24, 0.95,0.53, 0.88,0.80, 0.76,0.82, 0.58,0.82, 0.815],
  [ 0.30, 0.90,0.14, 0.92,0.24, 0.93,0.55, 0.865,0.80, 0.75,0.83, 0.55,1.01, 1.02],
  [ 0.00, 0.88,0.14, 0.895,0.24, 0.905,0.57, 0.855,0.80, 0.74,0.84, 0.52,1.18, 1.215],
  [-0.30, 0.875,0.14, 0.885,0.24, 0.915,0.59, 0.865,0.81, 0.74,0.86, 0.51,1.205,1.24],
  [-0.62, 0.87,0.14, 0.85,0.26, 0.95,0.61, 0.92,0.84, 0.77,0.88, 0.54,1.13, 1.16],
  [-1.025,0.97,0.20, 0.98,0.30, 0.99,0.63, 0.95,0.89, 0.81,0.92, 0.58,1.01, 1.035],
  [-1.40, 0.95,0.22, 0.965,0.32,0.975,0.63, 0.93,0.86, 0.80,0.88, 0.60,0.90, 0.91],
  [-1.62, 0.88,0.26, 0.91,0.36, 0.93,0.62, 0.90,0.82, 0.78,0.84, 0.58,0.85, 0.86],
];

// Hexagonal wheel arches, a Lamborghini signature. [distance from axle, height].
const ARCH = [[0, 0.80], [0.17, 0.80], [0.36, 0.585], [0.47, 0.14]];

/** Which material each facet gets. strip = index of the lower point (0..5). */
function stripMaterial(strip, z, arch) {
  switch (strip) {
    case 0:
      if (z > 1.48) return 'carbon';            // front lip
      return arch > 0.2 ? 'paint' : 'carbon';  // side skirts between the wheels
    case 1:
    case 2:
      return 'paint'; // the side intake is a separate wedge (lamboParts) so it can be triangular
    case 3:
      if (z > 1.5) return 'headlight';
      return 'paint';
    case 4:
      if (z < 0.62 && z > -0.45) return 'glass';   // side windows
      if (z <= -0.45 && z >= -0.62) return 'black'; // B-pillar
      if (z < -0.62 && z > -1.025) return 'glass'; // rear quarter glass behind the B-pillar
      return 'paint';
    case 5:
      if (z < 0.62 && z > 0.0) return 'glass';    // windscreen
      if (z <= -0.62 && z > -1.25) return 'carbon'; // engine cover (louvred)
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
  extraStations: [1.58, 0.45, -0.2, -0.45, -0.75, -1.25, -1.5],
  stripMaterial,
});

export const { sectionAt, surfacePoint } = loft;
