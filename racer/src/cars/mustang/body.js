/**
 * '67-style Mustang fastback body: lines plan, round arches and facet materials.
 * Long hood, set-back cabin, a fastback roof running to a Kamm tail.
 * Design space: +X left, +Y up, +Z forward, ground at y = 0.
 */
import { createLoft } from '../../car/loft.js?v=a5d31c9';

export const AXLE_FRONT = 1.05;
export const AXLE_REAR = -1.05;
export const NOSE_Z = 1.86;
export const TAIL_Z = -1.76;
export const WELL_X = 0.52;
export const COWL_Z = 0.2;           // windscreen base
export const ROOF_FRONT_Z = -0.28;   // windscreen top
export const FASTBACK_Z = -0.7;      // roof meets the fastback glass
export const DECK_Z = -1.15;         // fastback glass meets the deck lid

// Row: [z, x0,y0, x1,y1, x2,y2, x3,y3, x4,y4, x5,y5, y6]  (see car/loft.js)
const LINES = [
  [ 1.86, 0.80,0.22, 0.85,0.30, 0.87,0.50, 0.85,0.66, 0.62,0.68, 0.31,0.685, 0.685],
  [ 1.80, 0.85,0.19, 0.885,0.28, 0.90,0.52, 0.88,0.70, 0.63,0.715, 0.32,0.72, 0.72],
  [ 1.55, 0.88,0.17, 0.91,0.27, 0.925,0.55, 0.895,0.745, 0.64,0.75, 0.33,0.755, 0.755],
  [ 1.05, 0.90,0.17, 0.92,0.27, 0.935,0.57, 0.90,0.78, 0.65,0.775, 0.33,0.78, 0.78],
  [ 0.62, 0.90,0.17, 0.92,0.27, 0.935,0.58, 0.895,0.79, 0.66,0.785, 0.34,0.79, 0.79],
  [ 0.20, 0.895,0.17, 0.915,0.27, 0.93,0.585, 0.89,0.80, 0.76,0.81, 0.62,0.815, 0.815],
  [-0.28, 0.89,0.17, 0.91,0.27, 0.92,0.59, 0.88,0.81, 0.74,0.84, 0.55,1.12, 1.14],
  [-0.52, 0.89,0.17, 0.91,0.27, 0.92,0.60, 0.88,0.82, 0.74,0.85, 0.54,1.16, 1.18],
  [-0.70, 0.895,0.17, 0.915,0.27, 0.93,0.61, 0.89,0.83, 0.75,0.86, 0.55,1.11, 1.13],
  [-1.05, 0.92,0.19, 0.935,0.29, 0.95,0.62, 0.91,0.83, 0.77,0.85, 0.59,0.96, 0.97],
  [-1.15, 0.92,0.20, 0.935,0.30, 0.95,0.62, 0.91,0.825, 0.77,0.845, 0.60,0.93, 0.935],
  [-1.50, 0.91,0.22, 0.925,0.32, 0.94,0.62, 0.90,0.81, 0.77,0.825, 0.62,0.84, 0.845],
  [-1.72, 0.89,0.25, 0.905,0.34, 0.92,0.61, 0.885,0.79, 0.76,0.805, 0.61,0.815, 0.82],
  [-1.76, 0.87,0.27, 0.89,0.35, 0.90,0.60, 0.87,0.78, 0.75,0.795, 0.60,0.805, 0.805],
];

// Round arches (low-poly), the classic counterpoint to the Lambo's hexagons.
const ARCH = [[0, 0.8], [0.15, 0.79], [0.27, 0.75], [0.36, 0.67], [0.42, 0.56], [0.46, 0.4], [0.47, 0.14]];

function stripMaterial(strip, z) {
  switch (strip) {
    case 4:
      if (z < COWL_Z && z > FASTBACK_Z) return 'glass'; // pillarless hardtop side glass
      return 'paint';                                   // C-pillar (louvres are added on top)
    case 5:
      if (z < COWL_Z && z > ROOF_FRONT_Z) return 'glass'; // windscreen
      if (z < FASTBACK_Z && z > DECK_Z) return 'glass';   // fastback rear glass
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
  extraStations: [1.7, 1.35, 0.85, 0.45, -0.1, -0.4, -0.85, -1.3, -1.62],
  stripMaterial,
});

export const { sectionAt, surfacePoint } = loft;
