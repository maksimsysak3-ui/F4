import { buildLayout } from '../street/layout.js?v=b8df018';
import { definePitLane } from '../street/pitlane.js?v=b8df018';
import { circuitTrack } from '../circuitTrack.js?v=b8df018';
import { CANADA_POINTS } from './points.js?v=b8df018';

/*
 * Circuit Gilles Villeneuve, Montréal (Canadian GP), 4.361 km, 14 turns, on Île Notre-Dame in the
 * St. Lawrence. Lap record 1:13.078 (Bottas, 2019); pole ~1:12. Flat. Point numbers refer to
 * CANADA_POINTS (P0 on the start straight, past the pits):
 *   T1 Senna (P2-P4) the left and T2 (P4-P8) the long right hairpin, the run along the river past
 *   the T3-T4 chicane (P11-P15), T5 (P16-P18), the T6-T7 chicane under the bridge (P21-P25),
 *   the back of the island to the T8-T9 chicane (P30-P33), the run to L'Épingle (P39-P42): the
 *   hairpin at the tip of the island, then the Casino straight (P42-P51) along the Olympic Basin,
 *   flat out to the final chicane T13-T14 (P51-P52) and the Wall of Champions on its exit.
 * Concrete walls close to the track like a street circuit, grass between; big tarmac at T1-T2
 * and the hairpin; red-and-white kerbs.
 */
const layout = buildLayout({
  points: CANADA_POINTS,
  metresPerPx: 1.8014,
  width: 12.5,
  kerbWidth: 1.2,
  runoff: { base: 2.5, open: 5 },
  verge: 'grass',
  elevation: [[0, 4], [10, 4.5], [20, 5], [30, 4.5], [40, 4], [50, 4]],
  zones: [
    { from: 1, to: 8, side: 'outside', runoff: 20, verge: 'paved' },     // T1-T2 Senna
    { from: 11, to: 15, side: 'both', runoff: 8, verge: 'grass' },       // T3-T4
    { from: 21, to: 25, side: 'both', runoff: 9, verge: 'paved' },       // T6-T7
    { from: 29, to: 33, side: 'both', runoff: 9, verge: 'grass' },       // T8-T9
    { from: 37, to: 43, side: 'outside', runoff: 30, verge: 'paved' },   // L'Épingle hairpin
    { from: 42, to: 49, side: 'both', runoff: 3, verge: 'grass' },       // the Casino straight
    { from: 50, to: 51, side: 'outside', runoff: 10, verge: 'paved' },   // final chicane entry
    { from: 51, to: 53, side: 'outside', runoff: 0.9, verge: 'paved' },  // the Wall of Champions
  ],
});
layout.pit = definePitLane(layout, { side: 'L', garages: [-200, 40], lane: 10, taper: 40, before: 110, after: 80, speedLimit: 80 / 3.6 });

export const CANADA = circuitTrack({
  id: 'canada',
  name: 'Circuit Gilles Villeneuve',
  pack: 'f1',
  country: 'Canada',
  blurb: 'Canadian GP · the hairpin, the Casino straight, the Wall of Champions, on the St. Lawrence · 4.36 km',
  coverTitle: 'MONTRÉAL',
  cover: { scene: 'miami', sky: ['#3a78c8', '#d8e4ec'], ground: '#3a6a34', flag: ['#d80621', '#ffffff', '#d80621'], accent: '#d80621' },
  layout,
  mood: 'canada',
  async build(ctx) {
    const { buildCanadaScene } = await import('./canadaScene.js?v=b8df018');
    return buildCanadaScene(layout, ctx);
  },
});
