/**
 * Full-size pickup body: lines plan for a squared-off crew cab and an open bed.
 * The bed is part of the same shell: behind the cab each section runs over the
 * bed rail, down the inner wall and across the bed floor (a U-section), so the
 * loft gives the bedsides, inner walls and floor in one go and the tail cap
 * closes it with the tailgate. Design space: +X left, +Y up, +Z forward.
 */
import { createLoft } from '../../car/loft.js';

export const AXLE_FRONT = 1.45;
export const AXLE_REAR = -1.55;
export const NOSE_Z = 2.35;
export const TAIL_Z = -2.45;
export const WELL_X = 0.56;
export const COWL_Z = 0.55;        // windscreen base
export const ROOF_FRONT_Z = 0.1;   // windscreen top
export const CAB_BACK_Z = -0.52;   // back of the cab
export const BED_Z = -0.56;        // bed headboard
export const BED_FLOOR = 0.66;
export const RAIL_Y = 1.15;

// Row: [z, x0,y0, x1,y1, x2,y2, x3,y3, x4,y4, x5,y5, y6]  (see car/loft.js)
const cab = (z, roof) => [z, 0.95, 0.36, 0.98, 0.52, 0.99, 0.9, 0.96, 1.14, 0.88, 1.18, 0.76, roof, roof + 0.02];
const bed = (z, k = 0) => [z, 0.95 - k, 0.36 + k, 0.98 - k, 0.52 + k, 0.99 - k, 0.9, 0.97 - k, 1.14 - k * 0.5, 0.9 - k, RAIL_Y - k * 0.5, 0.86 - k, BED_FLOOR, BED_FLOOR];
const LINES = [
  [2.35, 0.84, 0.42, 0.88, 0.56, 0.9, 0.84, 0.88, 1.06, 0.7, 1.09, 0.36, 1.1, 1.1],
  [2.28, 0.92, 0.38, 0.95, 0.54, 0.96, 0.86, 0.94, 1.1, 0.74, 1.14, 0.37, 1.16, 1.16],
  [2.0, 0.95, 0.36, 0.98, 0.52, 0.99, 0.88, 0.97, 1.13, 0.76, 1.17, 0.38, 1.19, 1.19],
  [0.62, 0.95, 0.36, 0.98, 0.52, 0.99, 0.9, 0.97, 1.14, 0.78, 1.19, 0.4, 1.22, 1.22],
  [COWL_Z, 0.95, 0.36, 0.98, 0.52, 0.99, 0.9, 0.97, 1.14, 0.9, 1.17, 0.78, 1.2, 1.21],
  cab(ROOF_FRONT_Z, 1.64),
  cab(-0.3, 1.66),
  cab(CAB_BACK_Z, 1.65),
  bed(BED_Z),
  bed(-2.38),
  bed(TAIL_Z, 0.02),
];

// Squared-off arches with a flat top: big off-road tyres underneath.
const ARCH = [[0, 1.06], [0.2, 1.05], [0.36, 1.0], [0.48, 0.9], [0.56, 0.76], [0.62, 0.58], [0.64, 0.36]];

function stripMaterial(strip, z) {
  const inBed = z < BED_Z + 0.001;
  switch (strip) {
    case 4:
      if (inBed) return 'interior';                         // bedliner on the inner walls
      if (z < COWL_Z && z > CAB_BACK_Z) return 'glass';     // side windows
      return 'paint';
    case 5:
      if (inBed) return 'interior';                         // bed floor
      if (z < COWL_Z && z > ROOF_FRONT_Z) return 'glass';   // windscreen
      return 'paint';                                       // hood, roof, cab back
    default:
      return 'paint';
  }
}

export const loft = createLoft({
  lines: LINES,
  arch: ARCH,
  axles: [AXLE_FRONT, AXLE_REAR],
  wellX: WELL_X,
  extraStations: [2.15, 1.75, 1.1, 0.8, 0.35, -0.1, -0.54, -0.8, -1.0, -2.1, -2.25],
  stripMaterial,
  archGaps: [0, 0.03, 0.06, 0.09],
});

export const { sectionAt, surfacePoint } = loft;
