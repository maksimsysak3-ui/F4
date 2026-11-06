import { buildLayout } from '../street/layout.js?v=b8df018';
import { definePitLane } from '../street/pitlane.js?v=b8df018';
import { circuitTrack } from '../circuitTrack.js?v=b8df018';
import { SINGAPORE_POINTS } from './points.js?v=b8df018';

/*
 * Marina Bay Street Circuit (Singapore GP), 4.940 km, 19 turns (2023 layout), anticlockwise, at
 * night. Fastest lap 1:34.486 (Ricciardo, 2024); pole ~1:29.5. Hot, humid, bumpy, walls everywhere.
 * Point numbers refer to SINGAPORE_POINTS (P0 on the start straight, past the pits):
 *   T1-T3 (P2-P9): the left-right-left under the Benjamin Sheares bridge to the T3 hairpin,
 *   T4-T5 (P12-P16) onto Raffles Boulevard (P16-P20), T7 at Memorial (P20-P21), the Esplanade
 *   run past the Padang to T8 (P23-P24), St Andrew's Road and the old city (P24-P33), the long
 *   run south to the Anderson Bridge (P34-P46), the T13 hairpin (P46-P47), back up past the
 *   Fullerton to the T14 hairpin (P52-P53), along the bay (P54-P58), the floating-platform
 *   section under the grandstand (P58-P63) and the final corners onto the straight (P64-P67).
 * Concrete walls lined with debris fences right at the kerbs, escape roads at the big stops,
 * red-and-white kerbs, Singapore Airlines run-offs painted blue and gold.
 */
const layout = buildLayout({
  points: SINGAPORE_POINTS,
  metresPerPx: 1.8461,
  width: 12,
  kerbWidth: 1.1,
  runoff: { base: 1.0, open: 2.5 },
  verge: 'paved',
  elevation: [[0, 3], [16, 3.4], [33, 4], [46, 3], [58, 2.5], [67, 3]],
  zones: [
    { from: 2, to: 5, side: 'outside', runoff: 14, verge: 'paved' }, // T1
    { from: 7, to: 10, side: 'outside', runoff: 12, verge: 'paved' },             // T3 hairpin
    { from: 15, to: 17, side: 'outside', runoff: 9, verge: 'paved' },             // T5
    { from: 20, to: 22, side: 'outside', runoff: 10, verge: 'paved' },            // T7 Memorial
    { from: 23, to: 25, side: 'outside', runoff: 11, verge: 'paved' }, // T8
    { from: 30, to: 33, side: 'outside', runoff: 7, verge: 'paved' },
    { from: 46, to: 48, side: 'outside', runoff: 12, verge: 'paved' },            // T13 Anderson Bridge
    { from: 52, to: 54, side: 'outside', runoff: 12, verge: 'paved' }, // T14
    { from: 59, to: 63, side: 'outside', runoff: 6, verge: 'paved' },             // under the grandstand
    { from: 64, to: 67, side: 'outside', runoff: 10, verge: 'paved' },
  ],
});
layout.pit = definePitLane(layout, { side: 'R', garages: [-230, 40], lane: 9, taper: 40, before: 110, after: 80, speedLimit: 60 / 3.6 });

export const SINGAPORE = circuitTrack({
  id: 'singapore',
  name: 'Marina Bay Street Circuit',
  pack: 'f1',
  country: 'Singapore',
  blurb: 'Singapore GP · the night race round Marina Bay, under the skyline · 4.94 km',
  coverTitle: 'SINGAPORE',
  cover: { scene: 'yas', sky: ['#020308', '#1a1e30'], ground: '#101218', flag: ['#ef3340', '#ffffff', '#ef3340'], accent: '#f2b31b', sun: 'rgba(255,200,120,0.5)' },
  layout,
  mood: 'singapore',
  floodlit: { count: 8, spacing: 36 },
  async build(ctx) {
    const { buildSingaporeScene } = await import('./singaporeScene.js?v=b8df018');
    return buildSingaporeScene(layout, ctx);
  },
});
