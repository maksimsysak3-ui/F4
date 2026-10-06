import { buildLayout } from '../street/layout.js?v=a5d31c9';
import { definePitLane } from '../street/pitlane.js?v=a5d31c9';
import { circuitTrack } from '../circuitTrack.js?v=a5d31c9';
import { HUNGARORING_POINTS } from './points.js?v=a5d31c9';

/*
 * Hungaroring (Hungarian GP), Mogyoród, 4.381 km, 14 turns, clockwise, laid in
 * a valley so the hillsides form a natural amphitheatre. Point numbers refer to
 * HUNGARORING_POINTS (P0 is on the pit straight, which runs gently downhill):
 *   T1 (P2-P6): tight right hairpin at the bottom of the straight, huge tarmac run-off
 *   T2 (P10-P13): downhill left, gravel     T3 (P14-P16): fast right at the lowest point
 *   the back straight (P16-P21) climbs to T4 (P21-P24), a blind uphill left over the crest
 *   T5 (P24-P28): long right at the top     T6-T7 (P30-P33): the chicane, downhill
 *   T8-T9 (P34-P38): left-right through the dip     T10-T11 (P39-P45): flat-out sweeps uphill
 *   T12 (P45-P47): right, then the short straight to T13 (P49-P51)
 *   T14 (P52-P64): the long twisting final sequence back up onto the straight.
 * About 35 m of elevation. Red/white kerbs, green-painted tarmac by the kerbs,
 * gravel on most outsides, pits on the inside (right) of the main straight.
 */
const layout = buildLayout({
  points: HUNGARORING_POINTS,
  metresPerPx: 1.6931,
  width: 12,
  kerbWidth: 1.2,
  runoff: { base: 3, open: 4.5 },
  verge: 'grass',
  elevation: [
    [0, 24], [1, 17], [3, 14], [5, 12.5], [7, 9.5], [9, 6.5], [11, 4], [13, 3], [15, 2.5], [16, 3],
    [18, 7], [20, 11.5], [21, 14], [22, 19], [24, 24], [26, 26], [28, 25.5], [30, 23], [32, 20], [34, 16],
    [35, 15], [37, 16.5], [39, 19], [41, 21], [43, 22.5], [45, 23.5], [46, 23], [48, 21], [50, 19.5],
    [52, 18.5], [54, 17.5], [56, 18], [58, 19.5], [60, 21], [62, 22.5], [64, 23.5],
  ],
  banking: [[24, 28, 3]],
  zones: [
    { from: 63, to: 1, side: 'both', runoff: 4, verge: 'grass' },
    { from: 1, to: 7, side: 'outside', runoff: 24, verge: 'paved' },
    { from: 1, to: 7, side: 'inside', runoff: 7, verge: 'paved' },
    { from: 9, to: 13, side: 'outside', runoff: 15, verge: 'gravel' },
    { from: 13, to: 17, side: 'outside', runoff: 12, verge: 'gravel' },
    { from: 17, to: 21, side: 'both', runoff: 5, verge: 'grass' },
    { from: 21, to: 24, side: 'outside', runoff: 13, verge: 'gravel' },
    { from: 24, to: 29, side: 'outside', runoff: 16, verge: 'gravel' },
    { from: 29, to: 34, side: 'both', runoff: 9, verge: 'paved' },
    { from: 34, to: 39, side: 'outside', runoff: 12, verge: 'gravel' },
    { from: 39, to: 45, side: 'outside', runoff: 14, verge: 'gravel' },
    { from: 45, to: 48, side: 'outside', runoff: 12, verge: 'paved' },
    { from: 48, to: 52, side: 'outside', runoff: 11, verge: 'gravel' },
    { from: 52, to: 57, side: 'outside', runoff: 10, verge: 'paved' },
    { from: 57, to: 63, side: 'outside', runoff: 11, verge: 'gravel' },
  ],
});
layout.pit = definePitLane(layout, { side: 'R', garages: [-170, 80], lane: 8.5, taper: 40, before: 110, after: 70, speedLimit: 80 / 3.6 });

export const HUNGARORING = circuitTrack({
  id: 'hungaroring',
  name: 'Hungaroring',
  pack: 'f1',
  country: 'Hungary',
  blurb: 'Hungarian GP · tight, twisty, a valley amphitheatre · 4.38 km',
  coverTitle: 'HUNGARORING',
  cover: { scene: 'plains', sky: ['#4f86c8', '#f2dca0'], ground: '#8a9a48', flag: ['#cd2a3e', '#ffffff', '#436f4d'], accent: '#ffcf3a' },
  layout,
  mood: 'hungary',
  async build(ctx) {
    const { buildHungaroringScene } = await import('./hungaroringScene.js?v=a5d31c9');
    return buildHungaroringScene(layout, ctx);
  },
});
