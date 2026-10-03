import { buildLayout } from '../street/layout.js';
import { definePitLane } from '../street/pitlane.js';
import { circuitTrack } from '../circuitTrack.js';
import { INTERLAGOS_POINTS } from './points.js';

/*
 * Autódromo José Carlos Pace, Interlagos (São Paulo GP). 4.309 km, 15 turns,
 * anticlockwise, in a bowl in the south of the city. Point numbers refer to
 * INTERLAGOS_POINTS (P0 is on the pit straight, at the top of the climb):
 *   T1-T2 Senna S (P3-P9): downhill left-right from the start
 *   T3 Curva do Sol (P9-P15): long left onto the Reta Oposta (P15-P18), still falling
 *   T4 Descida do Lago (P18-P21): the lowest point, 40 m below the start, lake behind
 *   T5 (P22-P25)   T6-T7 Ferradura (P27-P31)   T8 Laranjinha (P35-P38)
 *   T9 Pinheirinho (P38-P43)   T10 Bico de Pato (P47-P51) hairpin
 *   T11 Mergulho (P52-P56) dives left   T12 Junção (P57-P61)
 *   then the 1.2 km flat-out climb (Subida dos Boxes, P61-P73), 33 m back up to the line.
 * Grey asphalt (2024 resurfacing), kerbs in yellow and green, asphalt run-offs on the
 * big stops and gravel on the fast corners; pits on the inside (left).
 */
const layout = buildLayout({
  points: INTERLAGOS_POINTS,
  metresPerPx: 1.1553,
  width: 13,
  kerbWidth: 1.2,
  runoff: { base: 3, open: 5 },
  verge: 'paved',
  elevation: [
    [0, 40], [2, 38.5], [4, 35], [6, 32], [8, 29], [10, 25], [12, 20], [14, 16], [16, 9], [17, 3], [18, 0],
    [20, 0.5], [22, 1], [24, 2], [26, 6], [28, 10], [30, 12], [32, 14], [35, 16], [38, 15], [41, 12], [44, 12.5],
    [48, 14], [51, 13], [54, 9], [57, 6], [59, 5], [61, 5], [63, 8], [65, 14], [67, 22], [69, 29], [71, 35], [73, 38], [75, 39.5],
  ],
  banking: [[9, 15, 4]],
  zones: [
    { from: 72, to: 2, side: 'both', runoff: 4, verge: 'paved' },
    { from: 2, to: 9, side: 'outside', runoff: 20, verge: 'paved' },
    { from: 2, to: 9, side: 'inside', runoff: 8, verge: 'paved' },
    { from: 9, to: 15, side: 'outside', runoff: 14, verge: 'gravel' },
    { from: 9, to: 15, side: 'inside', runoff: 6, verge: 'grass' },
    { from: 15, to: 17, side: 'both', runoff: 6, verge: 'grass' },
    { from: 17, to: 21, side: 'outside', runoff: 22, verge: 'paved' },
    { from: 21, to: 25, side: 'outside', runoff: 12, verge: 'gravel' },
    { from: 25, to: 27, side: 'both', runoff: 5, verge: 'grass' },
    { from: 27, to: 31, side: 'outside', runoff: 14, verge: 'gravel' },
    { from: 31, to: 35, side: 'both', runoff: 5, verge: 'grass' },
    { from: 35, to: 38, side: 'outside', runoff: 12, verge: 'gravel' },
    { from: 38, to: 43, side: 'outside', runoff: 12, verge: 'paved' },
    { from: 43, to: 47, side: 'both', runoff: 5, verge: 'grass' },
    { from: 47, to: 51, side: 'outside', runoff: 14, verge: 'paved' },
    { from: 52, to: 56, side: 'outside', runoff: 12, verge: 'gravel' },
    { from: 57, to: 61, side: 'outside', runoff: 16, verge: 'paved' },
    { from: 61, to: 72, side: 'both', runoff: 4.5, verge: 'paved' },
  ],
});
layout.pit = definePitLane(layout, { side: 'L', garages: [-200, 50], lane: 8.5, taper: 40, before: 110, after: 80, speedLimit: 80 / 3.6 });

export const INTERLAGOS = circuitTrack({
  id: 'interlagos',
  name: 'Interlagos',
  pack: 'f1',
  country: 'Brazil',
  blurb: 'São Paulo GP · Senna S, Descida do Lago, the climb to the line · 4.31 km',
  layout,
  mood: 'saopaulo',
  async build(ctx) {
    const { buildInterlagosScene } = await import('./interlagosScene.js');
    return buildInterlagosScene(layout, ctx);
  },
});
