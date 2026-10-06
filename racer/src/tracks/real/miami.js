import { buildLayout } from '../street/layout.js';
import { definePitLane } from '../street/pitlane.js';
import { circuitTrack } from '../circuitTrack.js';
import { MIAMI_POINTS } from './points.js';

/*
 * Miami International Autodrome, 5.412 km, 19 turns, anticlockwise, laid around
 * Hard Rock Stadium in Miami Gardens. Point numbers refer to MIAMI_POINTS
 * (P0 is on the start straight, heading for Turn 1):
 *   T1-T3 (P1-P7): left, right, then the long fast right round the stadium's east side
 *   T4-T8 (P8-P23): the flowing esses past the marina, flat out
 *   T9-T10 (P24-P31): the left-right onto the long run west
 *   T11 (P28-P31): the slow hairpin at the far end, then the run back east (P31-P45)
 *   T12-T16 (P46-P61): through the stadium's back lots, up over the bridge and the tight
 *   T14-T15 chicane (P57-P60) under the motorway ramp, down to T16
 *   the 1.2 km back straight (P61-P64), DRS, to the T17 hairpin (P64-P67)
 *   T18-T19 (P67-P77) and the curving run onto the start straight.
 * Flat apart from the bridge at the chicane. Painted tarmac run-offs, TecPro on
 * the walls, kerbs in red and white, pits on the left of the start straight.
 */
const layout = buildLayout({
  points: MIAMI_POINTS,
  metresPerPx: 1.4104,
  width: 13,
  kerbWidth: 1.2,
  runoff: { base: 3, open: 5 },
  verge: 'paved',
  elevation: [
    [0, 2], [10, 2], [20, 2.2], [30, 2], [40, 2], [46, 2], [50, 2.2], [53, 3], [55, 4.5],
    [57, 6], [59, 6.2], [60, 5], [62, 2.5], [64, 2], [70, 2], [77, 2],
  ],
  zones: [
    { from: 76, to: 1, side: 'both', runoff: 4, verge: 'paved' },
    { from: 1, to: 4, side: 'outside', runoff: 22, verge: 'paved' },     // T1 run-off
    { from: 4, to: 8, side: 'outside', runoff: 12, verge: 'paved' },
    { from: 8, to: 24, side: 'outside', runoff: 9, verge: 'grass' },     // the esses
    { from: 24, to: 31, side: 'outside', runoff: 14, verge: 'paved' },   // T9-T11
    { from: 31, to: 45, side: 'both', runoff: 5, verge: 'grass' },
    { from: 45, to: 50, side: 'outside', runoff: 16, verge: 'paved' },   // T12
    { from: 50, to: 61, side: 'both', runoff: 2.2, verge: 'paved' },     // the walled chicane section
    { from: 61, to: 64, side: 'both', runoff: 5, verge: 'paved' },
    { from: 64, to: 68, side: 'outside', runoff: 24, verge: 'paved' },   // T17 run-off
    { from: 68, to: 76, side: 'outside', runoff: 10, verge: 'paved' },
  ],
});
layout.pit = definePitLane(layout, { side: 'L', garages: [-210, 60], lane: 9, taper: 40, before: 120, after: 70, speedLimit: 80 / 3.6 });

export const MIAMI = circuitTrack({
  id: 'miami',
  name: 'Miami International Autodrome',
  pack: 'f1',
  country: 'United States',
  blurb: 'Miami GP · Hard Rock Stadium, the marina, the chicane under the bridge · 5.41 km',
  coverTitle: 'MIAMI',
  cover: { scene: 'miami', sky: ['#3a8ad8', '#f8c8a8'], ground: '#5a8a4a', flag: ['#ff4fa0', '#2ad4e0', '#ffffff'], accent: '#2ad4e0', sun: 'rgba(255,220,180,0.95)' },
  layout,
  mood: 'miami',
  async build(ctx) {
    const { buildMiamiScene } = await import('./miamiScene.js');
    return buildMiamiScene(layout, ctx);
  },
});
