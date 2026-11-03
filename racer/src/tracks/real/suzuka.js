import { buildLayout } from '../street/layout.js';
import { definePitLane } from '../street/pitlane.js';
import { circuitTrack } from '../circuitTrack.js';
import { SUZUKA_POINTS } from './points.js';

/*
 * Suzuka International Racing Course (Japanese GP), 5.807 km, 18 turns, the only
 * figure-of-eight on the calendar. Lap record 1:30.983 (Hamilton, 2019); pole ~1:27-1:28.
 * Point numbers refer to SUZUKA_POINTS (P0 is on the start straight, falling towards Turn 1):
 *   T1-T2 (P2-P7): the fast downhill right and the tighter right after it
 *   the S Curves (P8-P18): left-right-left-right up the hill, to
 *   Dunlop (P19-P21), the climbing left, and the two Degners (P23-P26)
 *   under the bridge (P27-P28) to the Hairpin (P30-P34)
 *   the long right to Spoon (P41-P46), the double-apex left, onto
 *   the back straight (P47-P51), over the bridge (P50-P51), to 130R (P52-P54), flat out,
 *   the Casio Triangle chicane (P55-P58) and the last corner onto the straight.
 * ~40 m of elevation: highest around Dunlop and Degner, lowest in the first corners.
 * Kerbs in red and white with a painted green band beyond, gravel and grass everywhere else.
 */
const layout = buildLayout({
  points: SUZUKA_POINTS,
  metresPerPx: 2.0314,
  width: 12,
  kerbWidth: 1.2,
  runoff: { base: 3, open: 5 },
  verge: 'grass',
  elevation: [
    [0, 22], [2, 14], [4, 10], [7, 10], [10, 13], [13, 18], [16, 24], [19, 32], [21, 36], [23, 36],
    [25, 30], [26, 26], [27, 23], [28, 22], [30, 22], [33, 23], [36, 25], [39, 27], [42, 28], [45, 29],
    [47, 30], [49, 32], [50, 33], [51, 33], [53, 30], [55, 26], [57, 24], [60, 23],
  ],
  zones: [
    { from: 1, to: 7, side: 'outside', runoff: 22, verge: 'gravel' },   // T1-T2
    { from: 8, to: 18, side: 'outside', runoff: 9, verge: 'grass' },    // the S Curves
    { from: 19, to: 22, side: 'outside', runoff: 14, verge: 'gravel' }, // Dunlop
    { from: 22, to: 27, side: 'outside', runoff: 14, verge: 'gravel' }, // Degner
    { from: 26, to: 29, side: 'both', runoff: 2.5, verge: 'paved' },    // under the bridge
    { from: 30, to: 34, side: 'outside', runoff: 14, verge: 'paved' },  // the Hairpin
    { from: 40, to: 47, side: 'outside', runoff: 18, verge: 'gravel' }, // Spoon
    { from: 49, to: 52, side: 'both', runoff: 2.5, verge: 'paved' },    // over the bridge
    { from: 52, to: 55, side: 'outside', runoff: 20, verge: 'paved' },  // 130R
    { from: 55, to: 59, side: 'outside', runoff: 14, verge: 'paved' },  // the chicane
  ],
});
layout.pit = definePitLane(layout, { side: 'R', garages: [-230, 50], lane: 10, taper: 45, before: 120, after: 80, speedLimit: 80 / 3.6 });

export const SUZUKA = circuitTrack({
  id: 'suzuka',
  name: 'Suzuka International Racing Course',
  pack: 'f1',
  country: 'Japan',
  blurb: 'Japanese GP · the S Curves, Degner, Spoon, 130R, the figure-of-eight bridge · 5.81 km',
  coverTitle: 'SUZUKA',
  cover: { scene: 'suzuka', sky: ['#3a7ad0', '#e8eef4'], ground: '#4a6a34', flag: ['#ffffff', '#bc002d', '#ffffff'], accent: '#bc002d' },
  layout,
  mood: 'suzuka',
  async build(ctx) {
    const { buildSuzukaScene } = await import('./suzukaScene.js');
    return buildSuzukaScene(layout, ctx);
  },
});
