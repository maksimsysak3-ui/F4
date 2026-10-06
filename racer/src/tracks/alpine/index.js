import { buildLayout } from '../street/layout.js';
import { definePitLane } from '../street/pitlane.js';
import { circuitTrack } from '../circuitTrack.js';
import { ALPINE_POINTS } from '../real/points.js';

/*
 * Glacier Pass, an imagined circuit high in the Alps, 5.1 km, anticlockwise.
 * Point numbers refer to ALPINE_POINTS:
 *   the start straight (P45-P2) runs west along the top of the pass, then
 *   the Avalanche (P2-P11): a fast plunge down the mountainside to the valley,
 *   Lakeside (P11-P16) along the frozen lake, the Climb (P16-P22) back up to
 *   the Chalet hairpin (P21-P23), the Gorge (P23-P26) down again,
 *   the valley straight (P26-P29) past the village, the Glacier loop (P29-P36),
 *   and the long Summit climb (P36-P41) round the cable-car station to
 *   the Col (P41-P45) onto the straight. 45 m of climb and fall on every lap.
 */
const layout = buildLayout({
  points: ALPINE_POINTS,
  metresPerPx: 1.8,
  width: 12,
  kerbWidth: 1.1,
  runoff: { base: 2.5, open: 6 },
  verge: 'grass',
  elevation: [
    [0, 52], [2, 51], [4, 44], [6, 36], [8, 28], [10, 16], [12, 9], [14, 8], [16, 10], [18, 18],
    [20, 26], [21, 29], [22, 28], [24, 17], [26, 10], [28, 10], [30, 12], [32, 15], [34, 20], [36, 26],
    [38, 38], [40, 48], [42, 51], [44, 52],
  ],
  banking: [[3, 10, 3], [36, 41, 3]],
  zones: [
    { from: 2, to: 5, side: 'outside', runoff: 16, verge: 'paved' },
    { from: 8, to: 12, side: 'outside', runoff: 18, verge: 'gravel' },
    { from: 20, to: 24, side: 'outside', runoff: 14, verge: 'paved' },
    { from: 28, to: 31, side: 'outside', runoff: 16, verge: 'paved' },
    { from: 38, to: 42, side: 'outside', runoff: 14, verge: 'gravel' },
  ],
});
layout.pit = definePitLane(layout, { side: 'R', garages: [-150, 60], lane: 8.5, taper: 40, before: 110, after: 70, speedLimit: 80 / 3.6 });

export const GLACIER_PASS = circuitTrack({
  id: 'glacier',
  name: 'Glacier Pass',
  pack: 'creative',
  country: 'The Alps',
  blurb: 'High-alpine pass · snow peaks, the frozen lake, the cable car · 5.1 km',
  coverTitle: 'GLACIER PASS',
  cover: { scene: 'alpine', sky: ['#1e5ab8', '#dce8f4'], ground: '#e8eef4', flag: [], accent: '#c8242b', sun: 'rgba(255,250,235,0.95)' },
  layout,
  mood: 'alpine',
  async build(ctx) {
    const { buildAlpineScene } = await import('./scene.js');
    return buildAlpineScene(layout, ctx);
  },
});
