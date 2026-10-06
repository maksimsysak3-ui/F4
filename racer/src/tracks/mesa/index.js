import { buildLayout } from '../street/layout.js?v=a5d31c9';
import { definePitLane } from '../street/pitlane.js?v=a5d31c9';
import { circuitTrack } from '../circuitTrack.js?v=a5d31c9';
import { MESA_POINTS } from '../real/points.js?v=a5d31c9';

/*
 * Red Mesa Canyon Raceway, an imagined desert circuit, 3.6 km, clockwise.
 * Point numbers refer to MESA_POINTS:
 *   the main straight runs east along the canyon floor (P34-P3), into
 *   the Mesa Climb (P3-P10): a right, a left and a tight uphill hairpin onto the shelf,
 *   Rimrock (P11-P15): a long, fast, falling sweep along the cliff edge,
 *   the Wash (P16-P19): down onto the dry riverbed, the lowest point,
 *   the Gulch (P19-P27): a tight twisting sequence between the canyon walls,
 *   Railroad (P28-P30) back east, and the Butte hairpin (P30-P33) onto the straight.
 * 25 m of elevation; tarmac run-offs painted sand and rust, gravel on the fast corners.
 */
const layout = buildLayout({
  points: MESA_POINTS,
  metresPerPx: 2.4785,
  width: 12.5,
  kerbWidth: 1.2,
  runoff: { base: 3, open: 4.5 },
  verge: 'paved',
  elevation: [
    [0, 10], [3, 10], [5, 15], [7, 21], [9, 25], [10, 26], [11, 25.5], [12, 22], [13, 17], [14, 12],
    [15, 8], [16, 5], [17, 3], [18, 2], [19, 2], [21, 3.5], [23, 6], [25, 8.5], [26, 10.5], [27, 12],
    [28, 11.5], [29, 10], [30, 8.5], [31, 8.5], [32, 9.5], [34, 10], [36, 10],
  ],
  banking: [[11, 15, 5]],
  zones: [
    { from: 34, to: 3, side: 'both', runoff: 4, verge: 'paved' },
    { from: 3, to: 7, side: 'outside', runoff: 16, verge: 'paved' },
    { from: 7, to: 11, side: 'outside', runoff: 12, verge: 'paved' },
    { from: 11, to: 16, side: 'outside', runoff: 18, verge: 'gravel' },
    { from: 11, to: 16, side: 'inside', runoff: 6, verge: 'grass' },
    { from: 16, to: 19, side: 'outside', runoff: 12, verge: 'gravel' },
    { from: 19, to: 28, side: 'both', runoff: 7, verge: 'paved' },
    { from: 28, to: 31, side: 'outside', runoff: 10, verge: 'gravel' },
    { from: 31, to: 34, side: 'outside', runoff: 16, verge: 'paved' },
  ],
});
layout.pit = definePitLane(layout, { side: 'R', garages: [-120, 140], lane: 8.5, taper: 40, before: 110, after: 70, speedLimit: 80 / 3.6 });

export const RED_MESA = circuitTrack({
  id: 'redmesa',
  name: 'Red Mesa Canyon',
  pack: 'creative',
  country: 'Desert Southwest',
  blurb: 'Canyon raceway at golden hour · mesas, the Gulch, the Rimrock sweep · 3.6 km',
  coverTitle: 'RED MESA CANYON',
  cover: { scene: 'mesa', sky: ['#3a62a8', '#f0b070'], ground: '#b8603a', flag: [], accent: '#ffb060', sun: 'rgba(255,200,130,0.95)' },
  layout,
  mood: 'canyon',
  async build(ctx) {
    const { buildMesaScene } = await import('./scene.js?v=a5d31c9');
    return buildMesaScene(layout, ctx);
  },
});
