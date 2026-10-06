import { buildLayout } from '../street/layout.js';
import { definePitLane } from '../street/pitlane.js';
import { circuitTrack } from '../circuitTrack.js';
import { MONACO_POINTS } from './points.js';

/*
 * Circuit de Monaco, 3.337 km, 19 turns, clockwise, through the streets of
 * Monte Carlo. Point numbers refer to MONACO_POINTS (P0 is on the Boulevard
 * Albert 1er, the start straight along the harbour):
 *   T1 Sainte Dévote (P3-P5): a tight right at the foot of the hill, escape road ahead
 *   Beau Rivage (P5-P13): the long climb, 35 m up, to
 *   T3 Massenet (P13-P16): the long left round the gardens, into
 *   T4 Casino Square (P16-P19): right over the crest past the Casino and the Hôtel de Paris
 *   down to T5 Mirabeau Haute (P22-P25), T6 the Grand Hotel hairpin (P27-P31, the slowest corner in F1),
 *   T7 Mirabeau Bas and T8 Portier (P31-P36) onto the seafront,
 *   the tunnel (P36-P41) curving right under the hotel, out into the light and down to
 *   T10-T11 the Nouvelle Chicane (P43-P47) by the harbour, T12 Tabac (P47-P50),
 *   T13-T16 the swimming pool (P50-P60), T17-T18 La Rascasse (P60-P69),
 *   T19 Anthony Noghès (P69-P73) back onto the straight.
 * Barriers right at the kerbs nearly everywhere; escape roads at Sainte Dévote,
 * Mirabeau, the chicane and Rascasse. Pits on the harbour side of the straight.
 */
const layout = buildLayout({
  points: MONACO_POINTS,
  metresPerPx: 1.0954,
  width: 9.5,
  kerbWidth: 1.0,
  runoff: { base: 0.9, open: 1.4 },
  verge: 'paved',
  elevation: [
    [0, 7], [3, 9], [5, 11], [7, 16], [9, 23], [11, 32], [13, 39], [15, 43], [17, 45], [19, 43],
    [21, 40], [23, 37], [25, 33], [27, 28], [29, 25], [31, 21], [33, 15], [35, 11], [37, 9.5],
    [39, 8.5], [41, 7], [43, 4.5], [45, 3], [48, 2.5], [52, 2.2], [56, 2.5], [60, 3], [64, 3.2],
    [67, 3.5], [70, 4.5], [72, 6],
  ],
  zones: [
    { from: 2, to: 6, side: 'outside', runoff: 11, verge: 'paved' },   // Sainte Dévote escape road
    { from: 21, to: 25, side: 'outside', runoff: 6, verge: 'paved' },  // Mirabeau
    { from: 42, to: 47, side: 'outside', runoff: 13, verge: 'paved' }, // the chicane escape road
    { from: 61, to: 69, side: 'outside', runoff: 4, verge: 'paved' },  // Rascasse
  ],
});
layout.pit = definePitLane(layout, { side: 'R', garages: [-160, 40], lane: 7.5, taper: 30, before: 70, after: 50, speedLimit: 60 / 3.6 });

export const MONACO = circuitTrack({
  id: 'monaco',
  name: 'Circuit de Monaco',
  pack: 'f1',
  country: 'Monaco',
  blurb: 'Monaco GP · Casino Square, the hairpin, the tunnel, the harbour · 3.34 km',
  coverTitle: 'MONACO',
  cover: { scene: 'monaco', sky: ['#3a78c8', '#f2e2c4'], ground: '#5a6a4a', flag: ['#ce1126', '#ffffff'], accent: '#ffd23f' },
  layout,
  mood: 'monaco',
  async build(ctx) {
    const { buildMonacoScene } = await import('./monacoScene.js');
    return buildMonacoScene(layout, ctx);
  },
});
