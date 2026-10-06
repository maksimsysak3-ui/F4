import { buildLayout } from '../street/layout.js';
import { definePitLane } from '../street/pitlane.js';
import { circuitTrack } from '../circuitTrack.js';
import { YAS_POINTS } from './points.js';

/*
 * Yas Marina Circuit (Abu Dhabi GP), 5.281 km, 16 turns, anticlockwise, raced
 * from dusk into the night under floodlights. Point numbers refer to YAS_POINTS
 * (P0 is on the start straight heading south):
 *   T1 (P2-P4) left, T2-T4 (P5-P11) the flowing esses, T5 (P15-P18) the
 *   hairpin at the end of the east straight onto the 1.2 km back straight
 *   (P18-P20), T6-T7 (P20-P24) the chicane, the second straight (P24-P31),
 *   T9 (P31-P35) the long left, the marina section (P36-P53) past the
 *   superyachts, under the Yas hotel's bridge (P53-P56) and T16 (P57-P59)
 *   onto the straight. Flat; tarmac run-offs; lit walls; floodlight towers.
 */
const layout = buildLayout({
  points: YAS_POINTS,
  metresPerPx: 1.6176,
  width: 14,
  kerbWidth: 1.2,
  runoff: { base: 3, open: 8 },
  verge: 'paved',
  elevation: [[0, 2], [10, 2.5], [18, 3], [24, 4], [31, 3.5], [40, 2.5], [50, 2], [56, 2.4]],
  zones: [
    { from: 2, to: 5, side: 'outside', runoff: 20, verge: 'paved' },   // T1
    { from: 14, to: 19, side: 'outside', runoff: 22, verge: 'paved' }, // T5 hairpin
    { from: 20, to: 25, side: 'outside', runoff: 16, verge: 'paved' }, // the chicane
    { from: 30, to: 36, side: 'outside', runoff: 18, verge: 'paved' }, // T9
    { from: 41, to: 53, side: 'both', runoff: 3 },                     // the marina section: walls close
    { from: 53, to: 57, side: 'both', runoff: 2 },                     // under the hotel
  ],
});
layout.pit = definePitLane(layout, { side: 'R', garages: [-210, 60], lane: 10, taper: 45, before: 120, after: 90, speedLimit: 80 / 3.6 });

export const YAS = circuitTrack({
  id: 'yas',
  name: 'Yas Marina Circuit',
  pack: 'f1',
  country: 'Abu Dhabi',
  blurb: 'Abu Dhabi GP · twilight to night, the marina, under the Yas hotel · 5.28 km',
  coverTitle: 'ABU DHABI',
  cover: { scene: 'yas', sky: ['#060a20', '#5a3a8a'], ground: '#1a1a2a', flag: ['#00732f', '#ffffff', '#000000', '#ff0000'], accent: '#7df9ff', sun: 'rgba(255,120,220,0.6)' },
  layout,
  mood: 'yas',
  async build(ctx) {
    const { buildYasScene } = await import('./yasScene.js');
    return buildYasScene(layout, ctx);
  },
});
