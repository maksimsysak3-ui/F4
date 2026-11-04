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
const layout = buildLayout({
  points: MADRING_POINTS,
  metresPerPx: 2.0901,
  width: 12.5,
  kerbWidth: 1.2,
  runoff: { base: 1.8, open: 6 },
  verge: 'paved',
  elevation: [
    [0, 8], [1, 5], [2, 2], [3, 0.5], [4, 0], [5, 1.5], [7, 8], [9, 15], [11, 21], [12, 23.5], [13, 25], [14, 26], [17, 25.5],
    [21, 24], [24, 21], [26, 19], [29, 17], [31, 16.5], [34, 17], [38, 16], [40, 14], [41, 12], [42, 8], [43, 5], [44, 4.5],
    [47, 6], [50, 7], [53, 8], [56, 9], [58, 9.5], [61, 9],
  ],
  banking: [[26, 31, 13.5]],                                            // La Monumental
  sausages: [3, 4, 12, 13, 45, 55],
  zones: [
    { from: 1, to: 5, side: 'outside', runoff: 22, verge: 'paved', paint: true },   // T1-T2
    { from: 5, to: 11, side: 'both', runoff: 4, verge: 'paved' },
    { from: 11, to: 14, side: 'outside', runoff: 14, verge: 'paved', paint: true }, // T5-T7
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
