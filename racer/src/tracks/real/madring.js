import { buildLayout } from '../street/layout.js';
import { definePitLane } from '../street/pitlane.js';
import { circuitTrack } from '../circuitTrack.js';
import { MADRING_POINTS } from './points.js';

/*
 * Madring, Madrid (Spanish GP from 2026), ~5.47 km, 22 turns, clockwise: a hybrid street circuit
 * round the IFEMA exhibition halls and through Valdebebas. The lowest point is Turn 2, the highest
 * Turn 7, about 26 m above it (~700 m above sea level). La Monumental, the 550 m bowl-like right
 * banked at up to 24% (13.5 degrees), and the tunnel that takes the lap from Valdebebas back under
 * the motorway to IFEMA. Point numbers refer to MADRING_POINTS (P0 on the main straight, heading north):
 *   T1-T2 (P2-P4) the right-left at the end of the straight (the low point), T3 (P5), the long climb
 *   up the diagonal (P5-P11), the T5-T7 kinks (P11-P14) at the top, the run east along the top
 *   (P14-P21), the Valdebebas links (P21-P26), La Monumental (P26-P31), back west (P32-P40), down
 *   through the tunnel (P41-P44), past the halls (P44-P56), the last corners (P56-P61).
 * Red-and-yellow kerbs, sausage kerbs at the chicanes, run-offs painted red with yellow fields and
 * MSC Cruises; concrete walls, overpasses and footbridges, big exhibition halls and offices.
 */
// The traced T5-T7 kinks at the top of the climb (P10-P14) zigzag in a few pixels; relax them so the
// chicane flows (still a left-right flick) instead of folding the kerbs and walls over each other.
const POINTS = MADRING_POINTS.map((p) => [...p]);
for (let it = 0; it < 1; it++) for (let k = 10; k <= 14; k++) {
  const a = POINTS[k - 1], b = POINTS[k], c = POINTS[k + 1];
  POINTS[k] = [(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4];
}

const layout = buildLayout({
  points: POINTS,
  metresPerPx: 2.0901,
  width: 12.5,
  kerbWidth: 1.2,
  runoff: { base: 1.8, open: 6 },
  verge: 'paved',
  elevation: [
    // Turn 2 is the low point (671 m), Turn 7 (P14) the high point (696.7 m): a gentle rise up the
    // diagonal, the steep ~10 m Subida de las Cárcavas to the blind crest, then 8% down the other side.
    [0, 9], [1, 6], [2, 2.5], [3, 0.6], [4, 0], [5, 1], [6, 3], [7, 6.5], [9, 10.5], [10, 13], [11, 16],
    [12, 20], [13, 23.5], [14, 25.7], [15, 22], [16, 19], [17, 17], [19, 15.5], [21, 14.5], [24, 13],
    [26, 12], [29, 11.5], [31, 11.5], [34, 12.5], [38, 12], [40, 11], [41, 9], [42, 6], [43, 4.5], [44, 4.5],
    [47, 5.5], [50, 6.5], [53, 7.5], [56, 8.5], [58, 9.2], [61, 9.2],
  ],

  banking: [[26, 31, 13.5]],                                            // La Monumental
  sausages: [3, 4, 12, 13, 45, 55],
  zones: [
    { from: 1, to: 5, side: 'outside', runoff: 22, verge: 'paved', paint: true },   // T1-T2
    { from: 5, to: 11, side: 'both', runoff: 4, verge: 'paved' },
    { from: 10, to: 15, side: 'both', runoff: 12, verge: 'paved', paint: true },    // T5-T7: painted both sides
    { from: 16, to: 19, side: 'outside', runoff: 10, verge: 'paved', paint: true },
    { from: 21, to: 26, side: 'outside', runoff: 14, verge: 'paved', paint: true }, // Valdebebas
    { from: 26, to: 31, side: 'outside', runoff: 9, verge: 'paved', paint: true },  // La Monumental
    { from: 32, to: 36, side: 'outside', runoff: 14, verge: 'paved', paint: true },
    { from: 39, to: 45, side: 'both', runoff: 1.4, verge: 'paved' },                // into and through the tunnel
    { from: 45, to: 47, side: 'outside', runoff: 12, verge: 'paved', paint: true },
    { from: 50, to: 57, side: 'outside', runoff: 10, verge: 'paved', paint: true },
    { from: 57, to: 61, side: 'outside', runoff: 14, verge: 'paved', paint: true }, // the last corners
  ],
});
layout.pit = definePitLane(layout, { side: 'R', garages: [-240, 40], lane: 10, taper: 40, before: 120, after: 80, speedLimit: 80 / 3.6 });

export const MADRING = circuitTrack({
  id: 'madring',
  name: 'Madring',
  pack: 'f1',
  country: 'Spain',
  blurb: 'Spanish GP · Madrid: IFEMA, Valdebebas, La Monumental, the tunnel · 5.47 km',
  coverTitle: 'MADRING',
  cover: { scene: 'spa', sky: ['#3a8ae0', '#e8f0f6'], ground: '#8a7a5a', flag: ['#c60b1e', '#ffc400', '#c60b1e'], accent: '#c60b1e' },
  layout,
  mood: 'madring',
  async build(ctx) {
    const { buildMadringScene } = await import('./madringScene.js');
    return buildMadringScene(layout, ctx);
  },
});
