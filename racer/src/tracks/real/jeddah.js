import { buildLayout } from '../street/layout.js?v=b8df018';
import { definePitLane } from '../street/pitlane.js?v=b8df018';
import { circuitTrack } from '../circuitTrack.js?v=b8df018';
import { JEDDAH_POINTS } from './points.js?v=b8df018';

/*
 * Jeddah Corniche Circuit (Saudi Arabian GP), 6.174 km, 27 turns, anticlockwise, raced at night on
 * the Red Sea shore. The fastest street circuit in F1: average speeds over 250 km/h, lap record
 * 1:30.734 (Hamilton, 2021). Point numbers refer to JEDDAH_POINTS (P0 on the start straight):
 *   T1-T2 (P2-P8): the slow left-right chicane, then the flowing, blind esses T3-T12 (P9-P30)
 *   between walls, flat out, the long run to T13 (P33-P37): the 12-degree banked left at the
 *   north end, back south through T14-T21 (P38-P58), the kinks along the lagoon T22-T26 (P59-P68),
 *   and T27 (P69-P74): the hairpin round the painted circle, onto the main straight.
 * Flat; concrete walls with TecPro right at the kerbs; escape roads at T1, T13, T27.
 */
const layout = buildLayout({
  points: JEDDAH_POINTS,
  metresPerPx: 2.4006,
  width: 12,
  kerbWidth: 1.1,
  runoff: { base: 1.0, open: 2.5 },
  verge: 'paved',
  elevation: [[0, 2], [20, 2.5], [35, 3], [50, 2.5], [70, 2]],
  banking: [[33, 37, 12]],
  zones: [
    { from: 1, to: 6, side: 'outside', runoff: 16, verge: 'paved' },   // T1 escape road
    { from: 32, to: 38, side: 'outside', runoff: 8, verge: 'paved' },  // T13
    { from: 68, to: 75, side: 'outside', runoff: 28, verge: 'paved' }, // T27 round the painted circle
    { from: 59, to: 67, side: 'outside', runoff: 6, verge: 'paved' },
  ],
});
layout.pit = definePitLane(layout, { side: 'L', garages: [-250, 50], lane: 10, taper: 45, before: 120, after: 80, speedLimit: 80 / 3.6 });

export const JEDDAH = circuitTrack({
  id: 'jeddah',
  name: 'Jeddah Corniche Circuit',
  pack: 'f1',
  country: 'Saudi Arabia',
  blurb: 'Saudi Arabian GP · the fastest street circuit, at night on the Red Sea · 6.17 km',
  coverTitle: 'JEDDAH',
  cover: { scene: 'yas', sky: ['#04030c', '#3a1a6a'], ground: '#140f24', flag: ['#006c35', '#ffffff', '#006c35'], accent: '#b04cff', sun: 'rgba(180,90,255,0.6)' },
  layout,
  mood: 'jeddah',
  floodlit: { count: 8, spacing: 40 },
  async build(ctx) {
    const { buildJeddahScene } = await import('./jeddahScene.js?v=b8df018');
    return buildJeddahScene(layout, ctx);
  },
});
