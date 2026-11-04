import { buildLayout } from '../street/layout.js';
import { definePitLane } from '../street/pitlane.js';
import { circuitTrack } from '../circuitTrack.js';
import { QATAR_POINTS } from './points.js';

/*
 * Lusail International Circuit (Qatar GP), 5.419 km, 16 turns, clockwise, raced at night under the
 * permanent floodlights in the desert north of Doha. Race lap record 1:22.384 (Norris, 2024); pole
 * 1:19.387 (Piastri, 2025). Almost flat: a few metres of rise and fall. Point numbers refer to
 * QATAR_POINTS (P0 on the 1.07 km main straight, heading west):
 *   T1 (P3-P6) the long right at the end of the straight, T2-T3 (P7-P10), T4 (P11-P13),
 *   T5 (P14-P16), the run up to T6 (P18-P21), T7 (P22-P24), the T8-T9 hairpin pair (P27-P29),
 *   T10 (P32-P36) at the top, T11 (P39-P42), the fast T12-T14 sweep (P44-P50), up to T15 (P53-P55),
 *   T16 (P58-P62), the long sweepers back down (P63-P69) and the last corner (P70-P74).
 * Wide tarmac run-offs, maroon-magenta Qatar Airways fields with orange bands, white-and-maroon
 * kerbs, sand everywhere beyond.
 */
const layout = buildLayout({
  points: QATAR_POINTS,
  metresPerPx: 1.1388,
  width: 13,
  kerbWidth: 1.4,
  runoff: { base: 5, open: 10 },
  verge: 'paved',
  elevation: [[0, 8], [5, 8.4], [12, 9.5], [18, 11], [22, 12], [28, 11], [34, 12.5], [40, 11], [46, 9.5], [52, 10.5], [58, 12], [62, 11.5], [68, 9.5], [73, 8.5]],
  zones: [
    { from: 2, to: 7, side: 'outside', runoff: 32, verge: 'paved' },    // T1
    { from: 10, to: 14, side: 'outside', runoff: 22, verge: 'paved' },  // T4
    { from: 17, to: 22, side: 'outside', runoff: 26, verge: 'paved' },  // T6
    { from: 26, to: 30, side: 'outside', runoff: 20, verge: 'paved' },  // T8-T9
    { from: 31, to: 37, side: 'outside', runoff: 24, verge: 'paved' },  // T10
    { from: 43, to: 48, side: 'outside', runoff: 20, verge: 'paved' },  // T12-T14
    { from: 52, to: 56, side: 'outside', runoff: 22, verge: 'paved' },  // T15
    { from: 58, to: 63, side: 'outside', runoff: 24, verge: 'paved' },  // T16
    { from: 69, to: 75, side: 'outside', runoff: 26, verge: 'paved' },  // the last corner
  ],
});
layout.pit = definePitLane(layout, { side: 'R', garages: [-280, 60], lane: 11, taper: 45, before: 130, after: 100, speedLimit: 80 / 3.6 });

export const QATAR = circuitTrack({
  id: 'qatar',
  name: 'Lusail International Circuit',
  pack: 'f1',
  country: 'Qatar',
  blurb: 'Qatar GP · under the floodlights in the Lusail desert · 5.42 km',
  coverTitle: 'LUSAIL',
  cover: { scene: 'yas', sky: ['#04050c', '#2a1828'], ground: '#3a3024', flag: ['#8a1538', '#ffffff', '#8a1538'], accent: '#8a1538', sun: 'rgba(255,200,140,0.5)' },
  layout,
  mood: 'qatar',
  floodlit: { count: 10, spacing: 34 },
  async build(ctx) {
    const { buildQatarScene } = await import('./qatarScene.js');
    return buildQatarScene(layout, ctx);
  },
});
