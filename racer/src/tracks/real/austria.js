import { buildLayout } from '../street/layout.js';
import { definePitLane } from '../street/pitlane.js';
import { circuitTrack } from '../circuitTrack.js';
import { AUSTRIA_POINTS } from './points.js';

/*
 * Red Bull Ring, Spielberg (Austrian GP), 4.318 km, 10 turns, clockwise, on a Styrian hillside.
 * Lap record 1:05.619 (Sainz, 2020); pole ~1:04.3. 65 m between the lowest and highest points.
 * Point numbers refer to AUSTRIA_POINTS (P0 on the start straight, climbing towards T1):
 *   T1 Niki Lauda Kurve (P3-P6): the uphill right, then the steep climb (12% at its worst) to
 *   T3 Remus (P14-P17): the tight right hairpin at the top of the hill, then the long downhill
 *   Remus straight (P17-P23) to T4 Schlossgold (P23-P27), the downhill right, and down through
 *   T5 (P28-P31), T6 Rauch (P33-P37) and T7 Würth (P38-P42), the fast left-handers in the dip,
 *   up the short straight (P43-P47) to T9 (P48-P50) and T10 (P52-P54) onto the start straight.
 * Run-offs: T1, T3, T4 and T10 vast tarmac painted in red and white stripes; gravel at T5-T7;
 * red-and-white kerbs with the yellow sausage "negative" kerbs on the exits; armco; open hillsides.
 */
const layout = buildLayout({
  paved: 3,   // permanent circuit: only the 3 biggest escape areas in tarmac, gravel and grass elsewhere
  points: AUSTRIA_POINTS,
  metresPerPx: 1.6696,
  width: 13.5,
  kerbWidth: 1.3,
  runoff: { base: 3.5, open: 7 },
  verge: 'grass',
  // The official figures: 65 m from the lowest to the highest point, 12% maximum climb, 9.3% maximum
  // descent. The start/finish straight climbs to T1; the run from T1 up to T3 is the steep one (~12%),
  // T3 is the top; down the straight into T4, on down through T5 and the blind downhill T6, T7 dips
  // and climbs again, the fast downhill into T9, up to T10, then down through the final corner onto
  // the pit straight: the lowest point is at the foot of the straight, near the line.
  elevation: [
    [0, 1], [2, 5], [3, 8], [5, 12], [6, 14], [8, 21], [9, 28], [10, 36], [11, 44.5], [12, 52], [13, 58], [14, 62], [15, 64], [16, 65], [17, 65], [19, 62], [21, 58], [23, 54], [24, 52], [26, 50], [27, 48], [29, 42], [31, 37], [33, 33], [35, 29], [36, 25], [38, 21], [40, 18], [42, 20], [43, 21], [45, 19], [46, 17], [47, 13], [48, 10], [50, 8], [51, 9], [52, 10], [53, 10], [54, 8], [55, 5], [56, 2], [57, 0],
  ],
  zones: [
    { from: 2, to: 7, side: 'outside', runoff: 26, verge: 'paved', paint: true },   // T1 Niki Lauda
    { from: 14, to: 18, side: 'outside', runoff: 28, verge: 'paved', paint: true }, // T3 Remus
    { from: 23, to: 27, side: 'outside', runoff: 24, verge: 'paved', paint: true }, // T4 Schlossgold
    { from: 28, to: 31, side: 'outside', runoff: 16, verge: 'gravel' },             // T5
    { from: 33, to: 37, side: 'outside', runoff: 20, verge: 'gravel' },             // T6 Rauch
    { from: 38, to: 42, side: 'outside', runoff: 20, verge: 'gravel' },             // T7 Würth
    { from: 47, to: 50, side: 'outside', runoff: 16, verge: 'paved' },              // T9
    { from: 52, to: 55, side: 'outside', runoff: 24, verge: 'paved', paint: true }, // T10
  ],
});
layout.pit = definePitLane(layout, { side: 'L', garages: [-240, 40], lane: 11, taper: 45, before: 120, after: 90, speedLimit: 80 / 3.6 });

export const AUSTRIA = circuitTrack({
  id: 'austria',
  name: 'Red Bull Ring',
  pack: 'f1',
  country: 'Austria',
  blurb: 'Austrian GP · up the hill to Remus, down through Rauch and Würth, in the Styrian mountains · 4.32 km',
  coverTitle: 'SPIELBERG',
  cover: { scene: 'spa', sky: ['#2a64b8', '#d4e2ee'], ground: '#3a6a2a', flag: ['#ed2939', '#ffffff', '#ed2939'], accent: '#ed2939' },
  layout,
  mood: 'austria',
  async build(ctx) {
    const { buildAustriaScene } = await import('./austriaScene.js');
    return buildAustriaScene(layout, ctx);
  },
});
