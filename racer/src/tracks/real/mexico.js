import { buildLayout } from '../street/layout.js';
import { definePitLane } from '../street/pitlane.js';
import { circuitTrack } from '../circuitTrack.js';
import { MEXICO_POINTS } from './points.js';

/*
 * Autódromo Hermanos Rodríguez (Mexico City GP), 4.304 km, 17 turns, clockwise, 2,240 m above the
 * sea: the thin air cuts downforce and drag, so the cars run Monaco-level wings and still hit
 * 360 km/h. Lap record 1:17.774 (Bottas, 2021). Point numbers refer to MEXICO_POINTS (P0 on the
 * 1.2 km main straight, the longest run to a first corner on the calendar):
 *   T1-T3 (P7-P12): the right-left-right at the end of the straight, then the back straight
 *   (P12-P17) to the T4-T6 hairpins (P17-P27), the run north (P27-P30), the Esses T7-T11 (P30-P41),
 *   the straight west (P42-P47), and the stadium section T12-T16 (P48-P58) through the Foro Sol
 *   baseball stadium, packed to the rafters, out past the old Peraltada (P59-P62) onto the straight.
 * Flat. Painted tarmac run-offs, heavily sponsored; sausage kerbs at the chicanes; grass inside.
 */
// The traced T4-T6 complex (P17-P22) kinks into 8-11 m bends, tighter than any F1 hairpin; the real
// corners are taken at ~85-120 km/h. Relax that stretch to realistic radii.
const POINTS = MEXICO_POINTS.map((p) => [...p]);
for (let it = 0; it < 3; it++) for (let k = 17; k <= 22; k++) {
  const a = POINTS[k - 1], b = POINTS[k], c = POINTS[k + 1];
  POINTS[k] = [(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4];
}

const layout = buildLayout({
  points: POINTS,
  metresPerPx: 1.6243,
  width: 13,
  kerbWidth: 1.2,
  runoff: { base: 3, open: 6 },
  verge: 'grass',
  elevation: [[0, 3], [10, 3.5], [20, 3], [30, 2.5], [45, 3], [55, 3.5]],
  zones: [
    { from: 6, to: 13, side: 'both', runoff: 22, verge: 'paved' },     // T1-T3
    { from: 16, to: 28, side: 'outside', runoff: 18, verge: 'paved' }, // T4-T6
    { from: 30, to: 41, side: 'outside', runoff: 12, verge: 'paved' }, // the Esses
    { from: 47, to: 59, side: 'both', runoff: 16, verge: 'paved' },    // the stadium section
    { from: 59, to: 62, side: 'outside', runoff: 14, verge: 'paved' },
  ],
});
layout.pit = definePitLane(layout, { side: 'R', garages: [-240, 60], lane: 11, taper: 45, before: 120, after: 80, speedLimit: 80 / 3.6 });

export const MEXICO = circuitTrack({
  id: 'mexico',
  name: 'Autódromo Hermanos Rodríguez',
  pack: 'f1',
  country: 'Mexico',
  blurb: 'Mexico City GP · the Foro Sol stadium section, 2,240 m up · 4.30 km',
  coverTitle: 'MEXICO CITY',
  cover: { scene: 'miami', sky: ['#3a7ad0', '#e8e4d8'], ground: '#5a7a3a', flag: ['#006847', '#ffffff', '#ce1126'], accent: '#ce1126' },
  layout,
  mood: 'mexico',
  async build(ctx) {
    const { buildMexicoScene } = await import('./mexicoScene.js');
    return buildMexicoScene(layout, ctx);
  },
});
