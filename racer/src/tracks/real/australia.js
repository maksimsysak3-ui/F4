import { buildLayout } from '../street/layout.js?v=b8df018';
import { definePitLane } from '../street/pitlane.js?v=b8df018';
import { circuitTrack } from '../circuitTrack.js?v=b8df018';
import { AUSTRALIA_POINTS } from './points.js?v=b8df018';

/*
 * Albert Park Circuit, Melbourne (Australian GP), 5.278 km, 14 turns since the 2022 rework,
 * clockwise round Albert Park Lake on the park's roads. Race lap record 1:19.813 (Leclerc, 2024);
 * pole ~1:15.1 (2025). Flat: a few metres of rise in the whole lap. Point numbers refer to
 * AUSTRALIA_POINTS (P0 on the pit straight, heading west for T1):
 *   T1-T2 (P3-P7): the right then left at the end of the pit straight, the run to T3 (P12-P13),
 *   the slow right, T4-T5 (P14-P17), up the western side to T6 (P24-P26), the fast sweeps along
 *   the lake (P26-P36) where the old T9-T10 chicane was, Lakeside Drive down to the fast T11-T12
 *   chicane (P41-P43), across to T13 (P49-P50), T14 (P53-P54) and the last corners (P57-P61) onto
 *   the pit straight.
 * Concrete walls with debris fences close to the track; grass verges, gravel at the heavy stops,
 * painted tarmac at T1 and T3; green-and-yellow kerbs.
 */
const layout = buildLayout({
  points: AUSTRALIA_POINTS,
  metresPerPx: 1.9413,
  width: 13,
  kerbWidth: 1.2,
  runoff: { base: 3, open: 6 },
  verge: 'grass',
  elevation: [[0, 4], [8, 4.3], [16, 5], [24, 5.6], [30, 6.2], [36, 5.4], [42, 4.6], [50, 4.2], [58, 3.9], [64, 4]],
  zones: [
    { from: 2, to: 7, side: 'outside', runoff: 20, verge: 'paved', paint: true },   // T1-T2
    { from: 11, to: 14, side: 'outside', runoff: 22, verge: 'paved', paint: true }, // T3
    { from: 14, to: 18, side: 'outside', runoff: 14, verge: 'gravel' },             // T4-T5
    { from: 23, to: 27, side: 'outside', runoff: 18, verge: 'gravel' },             // T6
    { from: 31, to: 37, side: 'outside', runoff: 16, verge: 'grass' },              // the fast sweeps
    { from: 40, to: 44, side: 'outside', runoff: 18, verge: 'gravel' },             // T11-T12
    { from: 48, to: 51, side: 'outside', runoff: 16, verge: 'gravel' },             // T13
    { from: 52, to: 55, side: 'outside', runoff: 14, verge: 'gravel' },             // T14
    { from: 56, to: 62, side: 'outside', runoff: 9, verge: 'grass' },
  ],
});
layout.pit = definePitLane(layout, { side: 'L', garages: [-200, 60], lane: 10, taper: 40, before: 120, after: 90, speedLimit: 80 / 3.6 });

export const AUSTRALIA = circuitTrack({
  id: 'australia',
  name: 'Albert Park Circuit',
  pack: 'f1',
  country: 'Australia',
  blurb: 'Australian GP · round Albert Park Lake, under the Melbourne skyline · 5.28 km',
  coverTitle: 'MELBOURNE',
  cover: { scene: 'miami', sky: ['#3a8ae0', '#dceaf4'], ground: '#4a7a34', flag: ['#012169', '#ffffff', '#e4002b'], accent: '#00843d' },
  layout,
  mood: 'australia',
  async build(ctx) {
    const { buildAustraliaScene } = await import('./australiaScene.js?v=b8df018');
    return buildAustraliaScene(layout, ctx);
  },
});
