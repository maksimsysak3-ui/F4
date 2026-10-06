import { buildLayout } from '../street/layout.js';
import { definePitLane } from '../street/pitlane.js';
import { circuitTrack } from '../circuitTrack.js';
import { BAKU_POINTS } from './points.js';

/*
 * Baku City Circuit (Azerbaijan GP), 6.003 km, 20 turns, anticlockwise, through
 * the capital on the Caspian. Point numbers refer to BAKU_POINTS (P0 is on the
 * start straight, Neftchilar Avenue, running east along the seafront boulevard):
 *   T1 (P2-P4): a square left at the end of the straight, T2 (P6-P8) left again
 *   the run back west (P8-P12) past Government House, T3 (P12) a square left,
 *   T4 (P13) right, T5-T6 (P15-P18) round the block, T7 (P19-P20) into
 *   the castle section (P20-P28): T8 to T10, the narrowest bends in F1 (7.6 m),
 *   climbing between the Old City wall and the houses opposite,
 *   T11-T12 (P28-P33) along the top of the Old City, T13-T14 (P33-P37) down,
 *   T15 (P37-P38) and T16 (P39-P40) onto the 2.2 km flat-out run:
 *   T17-T20 are kinks along the boulevard back onto the start straight.
 * The run back to the line (P42-P45) passes within metres of T5-T7 (P17-P20),
 * walls back to back. Concrete walls and fences right at the kerbs everywhere;
 * escape roads at T1, T3, T15 and T16. ~25 m climb to the Old City.
 */
const layout = buildLayout({
  points: BAKU_POINTS,
  metresPerPx: 2.234,
  width: 10.5,
  kerbWidth: 1.0,
  runoff: { base: 0.9, open: 1.6 },
  verge: 'paved',
  elevation: [
    [0, 1], [3, 1.5], [5, 3], [8, 4], [12, 6], [14, 7], [17, 7.5], [20, 8], [22, 11], [24, 14],
    [26, 17], [28, 21], [30, 25], [33, 26], [35, 22], [37, 18], [39, 13], [41, 9], [43, 6], [45, 4],
    [47, 2], [48, 1.2],
  ],
  zones: [
    { from: 1, to: 4, side: 'outside', runoff: 14, verge: 'paved' },   // T1 escape road
    { from: 11, to: 13, side: 'outside', runoff: 9, verge: 'paved' },  // T3
    { from: 36, to: 38, side: 'outside', runoff: 10, verge: 'paved' }, // T15
    { from: 38, to: 40, side: 'outside', runoff: 9, verge: 'paved' },  // T16
    { from: 21, to: 28, side: 'both', runoff: 0.2, narrow: 4.0 },      // the castle: 8 m between the walls
  ],
});
layout.pit = definePitLane(layout, { side: 'L', garages: [-260, 30], lane: 8, taper: 40, before: 110, after: 70, speedLimit: 80 / 3.6 });

export const BAKU = circuitTrack({
  id: 'baku',
  name: 'Baku City Circuit',
  pack: 'f1',
  country: 'Azerbaijan',
  blurb: 'Azerbaijan GP · the castle section, the Old City walls, 2.2 km flat out · 6.00 km',
  coverTitle: 'BAKU',
  cover: { scene: 'baku', sky: ['#3a6ec8', '#f0dcc0'], ground: '#b89a6a', flag: ['#00b5e2', '#ef3340', '#509e2f'], accent: '#00b5e2' },
  layout,
  mood: 'baku',
  async build(ctx) {
    const { buildBakuScene } = await import('./bakuScene.js');
    return buildBakuScene(layout, ctx);
  },
});
