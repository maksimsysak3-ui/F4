import { buildLayout } from '../street/layout.js?v=a5d31c9';
import { definePitLane } from '../street/pitlane.js?v=a5d31c9';
import { circuitTrack } from '../circuitTrack.js?v=a5d31c9';
import { COTA_POINTS } from './points.js?v=a5d31c9';

/*
 * Circuit of the Americas (United States GP), Austin, Texas. 5.513 km, 20 turns,
 * anticlockwise. Point numbers refer to COTA_POINTS; the lap starts at P1,
 * partway up the main straight:
 *   T1 (P3-P6): the 40 m climb to a blind left hairpin at the top of the hill
 *   T2 (P7-P9) downhill right   T3-T6 the esses (P10-P20), flat out downhill
 *   T7-T9 (P20-P27)   T10 (P28-P32) fast left   T11 hairpin (P34-P38)
 *   the 1.2 km back straight (P38-P44)   T12 heavy braking (P44-P46)
 *   T13-T15 stadium section (P46-P58)   T16-T18 multi-apex right (P59-P66)
 *   T19 (P68-P71)   T20 (P72-P75) onto the main straight
 * ~40 m of elevation, wide asphalt run-offs painted red and white, red/white
 * kerbs, concrete walls with catch fencing; pits on the inside (left).
 */
const layout = buildLayout({
  points: COTA_POINTS,
  start: 1,
  metresPerPx: 1.7955,
  width: 14,
  kerbWidth: 1.3,
  runoff: { base: 4, open: 6 },
  verge: 'paved',
  elevation: [
    // The climb to Turn 1: ~40 m in the last 700 m of the straight, steepest (~11%) near the top.
    [0, 5], [1, 12], [2, 25], [3, 35], [4, 40], [5, 39.5], [6, 37.5], [8, 33], [10, 29], [12, 26], [15, 23],
    [18, 21], [20, 19], [22, 18], [24, 16], [27, 14], [30, 12], [32, 11], [34, 9], [36, 8], [38, 8], [40, 6],
    [42, 4], [44, 3], [46, 3], [48, 3.5], [51, 4], [55, 4.5], [58, 5], [61, 5.5], [64, 5], [67, 4.5], [70, 4],
    [72, 3.5], [75, 4],
  ],
  zones: [
    { from: 72, to: 3, side: 'both', runoff: 5, verge: 'paved' },
    { from: 3, to: 7, side: 'outside', runoff: 30, verge: 'paved' }, // the vast T1 run-off
    { from: 7, to: 10, side: 'outside', runoff: 14, verge: 'paved' },
    { from: 10, to: 20, side: 'both', runoff: 9, verge: 'grass' }, // esses: grass verges, gravel on the outside
    { from: 10, to: 20, side: 'outside', runoff: 12, verge: 'gravel' },
    { from: 20, to: 28, side: 'outside', runoff: 14, verge: 'paved' },
    { from: 28, to: 33, side: 'outside', runoff: 12, verge: 'gravel' },
    { from: 34, to: 38, side: 'outside', runoff: 18, verge: 'paved' },
    { from: 38, to: 43, side: 'both', runoff: 6, verge: 'grass' },
    { from: 43, to: 47, side: 'outside', runoff: 26, verge: 'paved' }, // T12
    { from: 47, to: 58, side: 'outside', runoff: 12, verge: 'paved' },
    { from: 59, to: 66, side: 'outside', runoff: 16, verge: 'paved' },
    { from: 67, to: 71, side: 'outside', runoff: 14, verge: 'gravel' }, // T19
    { from: 72, to: 75, side: 'outside', runoff: 14, verge: 'paved' },
  ],
});
layout.pit = definePitLane(layout, { side: 'L', garages: [-60, 230], lane: 9, taper: 45, before: 120, after: 70, speedLimit: 80 / 3.6 });

export const COTA = circuitTrack({
  id: 'cota',
  name: 'Circuit of the Americas',
  pack: 'f1',
  country: 'United States',
  blurb: 'US GP · Austin · uphill Turn 1, esses, 1.2 km back straight · 5.51 km',
  coverTitle: 'COTA · AUSTIN',
  cover: { scene: 'hills', sky: ['#2c4f8a', '#f0b878'], ground: '#7a7a48', flag: ['#b22234', '#ffffff', '#3c3b6e'], accent: '#ff5a4a', sun: 'rgba(255,214,150,0.95)' },
  layout,
  mood: 'texas',
  async build(ctx) {
    const { buildCotaScene } = await import('./cotaScene.js?v=a5d31c9');
    return buildCotaScene(layout, ctx);
  },
});
