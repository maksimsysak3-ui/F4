import { buildLayout } from '../street/layout.js';
import { definePitLane } from '../street/pitlane.js';
import { circuitTrack } from '../circuitTrack.js';
import { CATALUNYA_POINTS } from './points.js';

/*
 * Circuit de Barcelona-Catalunya (Spanish GP), Montmeló, 4.657 km, 14 turns,
 * clockwise, on the hills north of Barcelona. Point numbers refer to
 * CATALUNYA_POINTS (P0 is on the 1 km main straight, heading west and downhill):
 *   T1 Elf and T2 (P3-P9): right then left at the bottom of the straight
 *   T3 Renault (P9-P17): the long, fast, uphill right that loads the tyres
 *   T4 Repsol (P20-P26): a long right, T5 Seat (P28-P32): the left down the hill
 *   T6-T8 (P32-P42): flowing left and the climb to T9 Campsa (P42-P45), blind over the crest
 *   the back straight (P45-P51) falls away to T10 La Caixa (P51-P55), the slow left
 *   T11-T12 (P55-P62) climb through the stadium section, T13-T14 (P62-P71)
 *   sweep fast and downhill onto the main straight.
 * ~30 m of elevation. Red and white kerbs, wide gravel and painted tarmac
 * run-offs, the main grandstand with its huge roof opposite the pits.
 */
const layout = buildLayout({
  points: CATALUNYA_POINTS,
  metresPerPx: 1.2686,
  width: 12.5,
  kerbWidth: 1.2,
  runoff: { base: 3, open: 4.5 },
  verge: 'grass',
  elevation: [
    [0, 32], [3, 22], [5, 21], [8, 24], [12, 27], [16, 30], [20, 26], [24, 24], [28, 20], [31, 18],
    [35, 22], [39, 28], [42, 33], [45, 34], [49, 26], [51, 18], [54, 17], [58, 20], [62, 24], [66, 28],
    [70, 32], [74, 33],
  ],
  banking: [[9, 16, 2]],
  zones: [
    { from: 73, to: 2, side: 'both', runoff: 4, verge: 'grass' },
    { from: 2, to: 9, side: 'outside', runoff: 22, verge: 'paved' },    // T1-T2: the big tarmac run-off
    { from: 9, to: 17, side: 'outside', runoff: 16, verge: 'gravel' },  // T3 Renault
    { from: 20, to: 26, side: 'outside', runoff: 18, verge: 'gravel' }, // T4 Repsol
    { from: 28, to: 32, side: 'outside', runoff: 14, verge: 'paved' },  // T5 Seat
    { from: 32, to: 39, side: 'outside', runoff: 11, verge: 'gravel' },
    { from: 39, to: 45, side: 'outside', runoff: 18, verge: 'gravel' }, // T9 Campsa
    { from: 45, to: 51, side: 'both', runoff: 5, verge: 'grass' },
    { from: 51, to: 55, side: 'outside', runoff: 20, verge: 'paved' },  // T10 La Caixa
    { from: 55, to: 62, side: 'outside', runoff: 12, verge: 'gravel' },
    { from: 62, to: 71, side: 'outside', runoff: 12, verge: 'paved' },
  ],
});
layout.pit = definePitLane(layout, { side: 'L', garages: [-220, 40], lane: 9, taper: 40, before: 120, after: 70, speedLimit: 80 / 3.6 });

export const CATALUNYA = circuitTrack({
  id: 'catalunya',
  name: 'Circuit de Barcelona-Catalunya',
  pack: 'f1',
  country: 'Spain',
  blurb: 'Spanish GP · Montmeló, Renault, Campsa over the crest, La Caixa · 4.66 km',
  coverTitle: 'BARCELONA',
  cover: { scene: 'catalunya', sky: ['#3a7ad0', '#f2dcb0'], ground: '#a89a5a', flag: ['#c60b1e', '#ffc400', '#c60b1e'], accent: '#ffc400' },
  layout,
  mood: 'spain',
  async build(ctx) {
    const { buildCatalunyaScene } = await import('./catalunyaScene.js');
    return buildCatalunyaScene(layout, ctx);
  },
});
