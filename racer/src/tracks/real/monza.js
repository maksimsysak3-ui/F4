import { buildLayout } from '../street/layout.js';
import { definePitLane } from '../street/pitlane.js';
import { circuitTrack } from '../circuitTrack.js';
import { MONZA_POINTS } from './points.js';

/*
 * Autodromo Nazionale Monza (Italian GP), 5.793 km, 11 turns, clockwise, in the Parco di Monza.
 * The fastest lap in F1: race lap record 1:20.901 (Norris, 2025), pole 1:18.792 (Verstappen, 2025).
 * Nearly flat (a few metres, rising gently to the Lesmos). Point numbers refer to MONZA_POINTS
 * (P0 on the main straight, heading for the first chicane):
 *   Variante del Rettifilo (P5-P8): the right-left first chicane, sausage kerbs on the apexes,
 *   Curva Grande (P9-P14): the long flat-out right, Variante della Roggia (P16-P18): the left-right
 *   chicane, Lesmo 1 (P21-P23) and Lesmo 2 (P25-P26), the Serraglio (P26-P31) under the old banking,
 *   Variante Ascari (P31-P35): left-right-left, the back straight, Curva Alboreto / Parabolica
 *   (P38-P43) onto the main straight.
 * Run-offs: grass and gravel at the Rettifilo, tarmac at the Parabolica, gravel at the
 * Curva Grande, the Roggia, both Lesmos and Ascari; green, white and red kerbs.
 */
// The traced Rettifilo (P4-P8) kinks into 7-14 m bends; the real chicane is taken at ~75-90 km/h.
const POINTS = MONZA_POINTS.map((p) => [...p]);
for (let k = 5; k <= 7; k++) {
  const a = POINTS[k - 1], b = POINTS[k], c = POINTS[k + 1];
  POINTS[k] = [(a[0] + 4 * b[0] + c[0]) / 6, (a[1] + 4 * b[1] + c[1]) / 6];
}

const layout = buildLayout({
  paved: 1,   // permanent circuit: only the 1 biggest escape area in tarmac, gravel and grass elsewhere
  points: POINTS,
  metresPerPx: 2.4403,
  width: 12.5,
  kerbWidth: 1.3,
  runoff: { base: 4, open: 6 },
  verge: 'grass',
  elevation: [[0, 2], [5, 2.2], [10, 2.8], [14, 4], [18, 5.2], [22, 6.2], [26, 6.4], [30, 5.2], [34, 4.2], [38, 3], [42, 2.4], [45, 2]],
  sausages: [6, 7, 17, 18, 32, 34],                                  // yellow humps behind the chicane apexes
  zones: [
    { from: 2, to: 10, side: 'both', verge: 'gravel', wallLine: [32, 56] }, // Rettifilo: built by hand in the scene (gravel, two straight walls)
    { from: 9, to: 15, side: 'outside', runoff: 22, verge: 'gravel' },  // Curva Grande
    { from: 15, to: 19, side: 'both', runoff: 18, verge: 'gravel' },    // Roggia
    { from: 20, to: 24, side: 'outside', runoff: 18, verge: 'gravel' }, // Lesmo 1
    { from: 24, to: 27, side: 'outside', runoff: 18, verge: 'gravel' }, // Lesmo 2
    { from: 31, to: 36, side: 'both', runoff: 18, verge: 'gravel' },    // Ascari
    { from: 38, to: 44, side: 'outside', runoff: 26, verge: 'paved' },  // Parabolica
  ],
});
layout.pit = definePitLane(layout, { side: 'R', garages: [-260, 60], lane: 11, taper: 45, before: 130, after: 100, speedLimit: 80 / 3.6 });

export const MONZA = circuitTrack({
  id: 'monza',
  name: 'Autodromo Nazionale Monza',
  pack: 'f1',
  country: 'Italy',
  blurb: 'Italian GP · the Temple of Speed: Rettifilo, Curva Grande, the Lesmos, Ascari, Parabolica · 5.79 km',
  coverTitle: 'MONZA',
  cover: { scene: 'spa', sky: ['#4a88d0', '#e8eef0'], ground: '#3a6a2a', flag: ['#009246', '#ffffff', '#ce2b37'], accent: '#ce2b37' },
  layout,
  mood: 'monza',
  async build(ctx) {
    const { buildMonzaScene } = await import('./monzaScene.js');
    return buildMonzaScene(layout, ctx);
  },
});
