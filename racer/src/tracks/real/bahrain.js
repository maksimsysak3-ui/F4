import { buildLayout } from '../street/layout.js?v=b8df018';
import { definePitLane } from '../street/pitlane.js?v=b8df018';
import { circuitTrack } from '../circuitTrack.js?v=b8df018';
import { BAHRAIN_POINTS } from './points.js?v=b8df018';

/*
 * Bahrain International Circuit, Sakhir (Bahrain GP), 5.412 km, 15 turns, clockwise, raced at night in
 * the desert. Race lap record 1:31.447 (de la Rosa, 2005); pole ~1:29.8 (2025). A little elevation:
 * the climb from T1 to T4, down through the infield, the downhill T9-T10. Point numbers refer to
 * BAHRAIN_POINTS (P0 on the pit straight, heading west):
 *   T1 (P4-P7) the hairpin after the longest braking zone, T2-T3 (P7-P10), up to T4 (P14-P17),
 *   T5-T7 the esses (P18-P22), T8 the hairpin (P22-P24), the downhill T9-T10 (P26-P30), T11 (P34-P37),
 *   T12 (P37-P39) flat out, T13 (P45-P48), T14 (P56-P59), and T15 (P64-P67) onto the straight.
 * Huge tarmac run-offs painted in colours and calligraphy, red-and-white kerbs, sand beyond.
 */
const layout = buildLayout({
  points: BAHRAIN_POINTS,
  metresPerPx: 1.6215,
  width: 14,
  kerbWidth: 1.3,
  runoff: { base: 5, open: 9 },
  verge: 'paved',  // sand-coloured tarmac everywhere; grass only along the main straight
  elevation: [[0, 5], [4, 4.5], [8, 6], [12, 9], [15, 12], [18, 11], [22, 13], [24, 12], [26, 9], [28, 4], [30, 2.5], [34, 3], [38, 4], [42, 5], [45, 6], [50, 8], [56, 10], [59, 10], [62, 8], [66, 6], [70, 5]],
  zones: [
    { from: 66, to: 2, side: 'both', verge: 'grass' },                // the main straight: the only grass verges
    { from: 2, to: 8, side: 'outside', runoff: 34, verge: 'paved' },    // T1
    { from: 13, to: 18, side: 'outside', runoff: 30, verge: 'paved' },  // T4
    { from: 21, to: 25, side: 'outside', runoff: 26, verge: 'paved' },  // T8
    { from: 26, to: 31, side: 'outside', runoff: 28, verge: 'paved' },  // T9-T10
    { from: 33, to: 38, side: 'outside', runoff: 24, verge: 'paved' },  // T11
    { from: 44, to: 49, side: 'outside', runoff: 22, verge: 'paved' },  // T13
    { from: 55, to: 60, side: 'outside', runoff: 26, verge: 'paved' },  // T14
    { from: 63, to: 68, side: 'outside', runoff: 24, verge: 'paved' },  // T15
  ],
});
layout.pit = definePitLane(layout, { side: 'R', garages: [-260, 50], lane: 11, taper: 45, before: 130, after: 100, speedLimit: 80 / 3.6 });

export const BAHRAIN = circuitTrack({
  id: 'bahrain',
  name: 'Bahrain International Circuit',
  pack: 'f1',
  country: 'Bahrain',
  blurb: 'Bahrain GP · under the floodlights in the Sakhir desert · 5.41 km',
  coverTitle: 'SAKHIR',
  cover: { scene: 'yas', sky: ['#05060c', '#2a2030'], ground: '#3a3024', flag: ['#ce1126', '#ffffff', '#ce1126'], accent: '#ce1126', sun: 'rgba(255,190,120,0.55)' },
  layout,
  mood: 'bahrain',
  floodlit: { count: 8, spacing: 40 },
  async build(ctx) {
    const { buildBahrainScene } = await import('./bahrainScene.js?v=b8df018');
    return buildBahrainScene(layout, ctx);
  },
});
