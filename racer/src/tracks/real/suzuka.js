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
// The traced end of the S Curves (P12-P17) kinks into 18-22 m bends, as tight as the Hairpin; the real
// esses are fast sweeps. Relax that stretch so they flow (a kink this tight also saw-tooths the road
// surface under a car carrying speed over the inside, and threw it in the air).
const POINTS = SUZUKA_POINTS.map((p) => [...p]);
for (let it = 0; it < 3; it++) for (let k = 12; k <= 17; k++) {
  const a = POINTS[k - 1], b = POINTS[k], c = POINTS[k + 1];
  POINTS[k] = [(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4];
}

const layout = buildLayout({
  points: POINTS,
  metresPerPx: 2.0314,
  width: 12,
  kerbWidth: 1.2,
  runoff: { base: 3, open: 5 },
  verge: 'grass',
  // ~40 m in all: down from the line to T1-T2 (the lowest part), up through the S Curves and Dunlop to
  // Degner (the highest), down under the bridge to the Hairpin, back up along the long right to Spoon,
  // the back straight climbing over the bridge to 130R, and falling through the chicane to the line.
  elevation: [
    [0, 26], [2, 16], [4, 8], [7, 6], [10, 10], [13, 17], [16, 25], [19, 34], [21, 40], [23, 44],
    [25, 40], [26, 35], [27, 30], [28, 28], [30, 25], [33, 24], [36, 27], [39, 31], [42, 34], [45, 35],
    [47, 36], [49, 39], [50, 41], [51, 41], [53, 37], [55, 32], [57, 29], [60, 27],
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
