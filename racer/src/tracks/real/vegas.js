import { buildLayout } from '../street/layout.js?v=1a016bc';
import { definePitLane } from '../street/pitlane.js?v=1a016bc';
import { circuitTrack } from '../circuitTrack.js?v=1a016bc';
import { VEGAS_POINTS } from './points.js?v=1a016bc';

/*
 * Las Vegas Strip Circuit (Las Vegas GP), 6.201 km, 17 turns, anticlockwise, at night on the streets
 * of the Strip. Race lap record 1:33.365 (Verstappen, 2025). Flat. Point numbers refer to VEGAS_POINTS
 * (P0 on the start straight by the pit building):
 *   T1-T3 (P3-P6): the slow left hairpin past the Heineken run-off, T4 (P7-P10), onto Koval Lane
 *   (P11-P16), T5 the right at its end (P16-P18), the long left sweep round the Sphere (T7-T9, P18-P24),
 *   the jink (P24-P30) and Sands Avenue west (P30-P34), T12 onto the Strip (P34-P41): the 1.9 km run
 *   south down Las Vegas Boulevard past the Venetian, Caesars, the LINQ, Bellagio, Paris, the
 *   Cosmopolitan and Planet Hollywood (P41-P53), the T14-T16 chicane onto Harmon Avenue (P53-P56) and
 *   east to T17 (P60-P61) and the line.
 * Concrete walls and debris fences everywhere, escape roads at the stops, red-and-white kerbs.
 */
const layout = buildLayout({
  points: VEGAS_POINTS,
  metresPerPx: 1.9344,
  width: 13,
  kerbWidth: 1.2,
  runoff: { base: 1.2, open: 3 },
  verge: 'paved',
  elevation: [[0, 3], [20, 3.3], [40, 3.8], [53, 3.4], [61, 3]],
  zones: [
    { from: 1, to: 7, side: 'outside', runoff: 34, verge: 'paved' },   // T1-T3: the Heineken run-off
    { from: 7, to: 11, side: 'outside', runoff: 10, verge: 'paved' },  // T4
    { from: 15, to: 18, side: 'outside', runoff: 16, verge: 'paved' }, // T5, end of Koval
    { from: 24, to: 31, side: 'outside', runoff: 8, verge: 'paved' },
    { from: 33, to: 37, side: 'outside', runoff: 14, verge: 'paved' }, // T12 onto the Strip
    { from: 52, to: 56, side: 'outside', runoff: 22, verge: 'paved' }, // T14, the Harmon escape road
    { from: 60, to: 62, side: 'outside', runoff: 10, verge: 'paved' }, // T17
  ],
});
layout.pit = definePitLane(layout, { side: 'R', garages: [-280, 30], lane: 11, taper: 45, before: 130, after: 90, speedLimit: 80 / 3.6 });

export const VEGAS = circuitTrack({
  id: 'vegas',
  name: 'Las Vegas Strip Circuit',
  pack: 'f1',
  country: 'United States',
  blurb: 'Las Vegas GP · round the Sphere and down the Strip at night · 6.20 km',
  coverTitle: 'LAS VEGAS',
  cover: { scene: 'yas', sky: ['#05030c', '#3a1a4a'], ground: '#14121a', flag: ['#b31942', '#ffffff', '#0a3161'], accent: '#ff2a8a', sun: 'rgba(255,120,220,0.6)' },
  layout,
  mood: 'vegas',
  floodlit: { count: 8, spacing: 36 },
  async build(ctx) {
    const { buildVegasScene } = await import('./vegasScene.js?v=1a016bc');
    return buildVegasScene(layout, ctx);
  },
});
