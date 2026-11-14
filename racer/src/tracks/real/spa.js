import { buildLayout } from '../street/layout.js?v=1a016bc';
import { definePitLane } from '../street/pitlane.js?v=1a016bc';
import { circuitTrack } from '../circuitTrack.js?v=1a016bc';
import { SPA_POINTS } from './points.js?v=1a016bc';

/*
 * Circuit de Spa-Francorchamps (Belgian GP), 7.004 km, 19 turns, clockwise, in
 * the Ardennes forest. Lap record 1:46.286 (Bottas, 2018); pole ~1:40-1:41.
 * Point numbers refer to SPA_POINTS (P0 is on the start straight, heading for La Source):
 *   T1 La Source (P2-P6): the tight right hairpin, then the plunge downhill past the old pits
 *   Eau Rouge / Raidillon (P8-P12): the compression at the bottom, left-right-left up a 17% climb
 *   the Kemmel straight (P12-P15), climbing, to Les Combes (P15-P19), the highest point
 *   Malmedy, Rivage (P20-P25): the downhill right hairpin, then the long descent to
 *   Pouhon (P31-P35): the fast double-left in the dip, Fagnes (P36-P41)
 *   Stavelot (P42-P46), the lowest corner, then flat out uphill through the forest:
 *   Blanchimont (P49-P55) at 300 km/h, and the Bus Stop chicane (P61-P65) onto the straight.
 * About 100 m between the lowest and highest points. Kerbs in red and yellow; the run-off
 * at Eau Rouge painted in wide bands of the Belgian colours; gravel at Les Combes,
 * Pouhon, Stavelot; big tarmac run-offs at La Source, Raidillon, Blanchimont and the Bus Stop.
 */
const layout = buildLayout({
  paved: 2,   // permanent circuit: only the 2 biggest escape areas in tarmac, gravel and grass elsewhere
  points: SPA_POINTS,
  metresPerPx: 2.2164,
  width: 12.5,
  kerbWidth: 1.3,
  runoff: { base: 3, open: 6 },
  verge: 'grass',
  elevation: [
    [0, 30], [2, 32], [4, 33], [6, 26], [7, 18], [8, 8], [9, 2], [10, 14], [11, 30], [12, 38],
    [13, 46], [14, 60], [15, 72], [17, 74], [19, 70], [21, 62], [23, 56], [25, 54], [27, 50],
    [29, 42], [31, 34], [33, 26], [35, 20], [37, 14], [39, 10], [41, 6], [43, 2], [45, 0],
    [47, 4], [49, 10], [51, 16], [53, 22], [55, 26], [57, 28], [59, 30], [61, 31], [63, 30], [65, 30],
  ],
  banking: [[9, 12, 4]],
  zones: [
    // As rebuilt for 2022: gravel back at Raidillon, Les Combes, Pouhon, Fagnes, Stavelot and Blanchimont;
    // the striped tarmac run-offs only at La Source and the Bus Stop; elsewhere grass to the armco.
    { from: 1, to: 6, side: 'outside', runoff: 22, verge: 'paved', paint: true },  // La Source
    { from: 8, to: 10, side: 'outside', runoff: 14, verge: 'paved' },              // the Eau Rouge compression
    { from: 10, to: 13, side: 'outside', runoff: 24, verge: 'gravel' },            // Raidillon: the 2022 gravel trap
    { from: 8, to: 13, side: 'inside', runoff: 8, verge: 'grass' },
    { from: 15, to: 20, side: 'outside', runoff: 18, verge: 'gravel' }, // Les Combes
    { from: 20, to: 26, side: 'outside', runoff: 20, verge: 'paved' },  // Rivage
    { from: 31, to: 36, side: 'outside', runoff: 24, verge: 'gravel' }, // Pouhon
    { from: 36, to: 41, side: 'outside', runoff: 14, verge: 'gravel' }, // Fagnes
    { from: 42, to: 47, side: 'outside', runoff: 18, verge: 'gravel' }, // Stavelot
    { from: 49, to: 56, side: 'outside', runoff: 22, verge: 'gravel' }, // Blanchimont
    { from: 60, to: 65, side: 'both', runoff: 14, verge: 'paved', paint: true },   // the Bus Stop
  ],
});
layout.pit = definePitLane(layout, { side: 'R', garages: [-260, 40], lane: 10, taper: 45, before: 120, after: 80, speedLimit: 80 / 3.6 });

export const SPA = circuitTrack({
  id: 'spa',
  name: 'Circuit de Spa-Francorchamps',
  pack: 'f1',
  country: 'Belgium',
  blurb: 'Belgian GP · Eau Rouge-Raidillon, Pouhon, Blanchimont, in the Ardennes forest · 7.00 km',
  coverTitle: 'SPA',
  cover: { scene: 'spa', sky: ['#4a86d0', '#e4ecf0'], ground: '#2a4a26', flag: ['#1b1b1f', '#ffd90c', '#ef3340'], accent: '#ffd90c' },
  layout,
  mood: 'ardennes',
  async build(ctx) {
    const { buildSpaScene } = await import('./spaScene.js?v=1a016bc');
    return buildSpaScene(layout, ctx);
  },
});
