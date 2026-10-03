import { buildLayout } from '../street/layout.js';
import { definePitLane } from '../street/pitlane.js';
import { circuitTrack } from '../circuitTrack.js';
import { ZANDVOORT_POINTS } from './points.js';

/*
 * Circuit Zandvoort (Dutch GP), 4.259 km, 14 turns, clockwise, in the dunes by
 * the North Sea. Point numbers below refer to ZANDVOORT_POINTS (P0 is on the
 * main straight, heading north to Tarzan):
 *   T1 Tarzan (P2-P6, right hairpin, slight banking, big gravel trap)
 *   T2 Gerlach (P7-P10)       T3 Hugenholtz (P11-P17, left, banked 18°, 4.5 m rise)
 *   T4 Hunserug (P18-P21, uphill)   T5-6 Rob Slotemaker (P22-P26, over the crest)
 *   T7 Scheivlak (P27-P31, fast right, plunging downhill, huge gravel)
 *   T8 Masters (P31-P34)     T9-10 (P35-P41)   T11-12 Hans Ernst chicane (P47-P52)
 *   T13 Kumho (P55-P57)       T14 Arie Luyendijk (P57-P61, right, banked 18°) onto the straight
 * ~14 m of elevation through the dunes. Gravel and grass everywhere, armco and
 * tyre walls, red/white kerbs; pits on the inside of the main straight.
 */
const layout = buildLayout({
  points: ZANDVOORT_POINTS,
  metresPerPx: 1.7774,
  width: 11.5,
  kerbWidth: 1.2,
  runoff: { base: 2.6, open: 4 },
  verge: 'grass',
  elevation: [
    [0, 5], [1, 4], [3, 2], [6, 2.2], [9, 3], [12, 3.6], [15, 4.2], [17, 4.8], [19, 8], [21, 12], [23, 14],
    [25, 12.6], [27, 11], [29, 8.5], [31, 5], [33, 4], [36, 5], [38, 6.5], [41, 8], [43, 9], [46, 8], [50, 7],
    [53, 6.5], [56, 7], [58, 6.5], [60, 6], [62, 5.5],
  ],
  banking: [[2, 6, 3], [11, 17, 18], [57, 61, 18]],
  zones: [
    { from: 61, to: 1, side: 'both', runoff: 3.2, verge: 'grass' },
    { from: 1, to: 7, side: 'outside', runoff: 19, verge: 'gravel' },
    { from: 1, to: 7, side: 'inside', runoff: 5, verge: 'grass' },
    { from: 7, to: 10, side: 'outside', runoff: 9, verge: 'gravel' },
    { from: 11, to: 17, side: 'outside', runoff: 4, verge: 'paved' },
    { from: 11, to: 17, side: 'inside', runoff: 9, verge: 'grass' },
    { from: 18, to: 22, side: 'outside', runoff: 10, verge: 'gravel' },
    { from: 22, to: 26, side: 'outside', runoff: 12, verge: 'gravel' },
    { from: 27, to: 31, side: 'outside', runoff: 22, verge: 'gravel' },
    { from: 31, to: 36, side: 'outside', runoff: 14, verge: 'gravel' },
    { from: 36, to: 42, side: 'outside', runoff: 10, verge: 'gravel' },
    { from: 42, to: 47, side: 'both', runoff: 4, verge: 'grass' },
    { from: 47, to: 53, side: 'outside', runoff: 9, verge: 'gravel' },
    { from: 53, to: 55, side: 'both', runoff: 4, verge: 'grass' },
    { from: 55, to: 58, side: 'outside', runoff: 12, verge: 'gravel' },
    { from: 57, to: 61, side: 'outside', runoff: 5.5, verge: 'paved' },
  ],
});
layout.pit = definePitLane(layout, { side: 'R', garages: [-190, 40], lane: 8.5, taper: 40, before: 110, after: 70, speedLimit: 80 / 3.6 });

export const ZANDVOORT = circuitTrack({
  id: 'zandvoort',
  name: 'Circuit Zandvoort',
  pack: 'f1',
  country: 'Netherlands',
  blurb: 'Dutch GP · dunes, banked Hugenholtz & Arie Luyendijk · 4.26 km',
  coverTitle: 'ZANDVOORT',
  cover: { scene: 'dunes', sky: ['#5f8fc4', '#e9d9b8'], ground: '#b8a878', flag: ['#ae1c28', '#ffffff', '#21468b'], accent: '#ff7a00' },
  layout,
  mood: 'coast',
  async build(ctx) {
    const { buildZandvoortScene } = await import('./zandvoortScene.js');
    return buildZandvoortScene(layout, ctx);
  },
});
