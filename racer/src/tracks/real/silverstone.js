import { buildLayout } from '../street/layout.js';
import { definePitLane } from '../street/pitlane.js';
import { circuitTrack } from '../circuitTrack.js';
import { SILVERSTONE_POINTS } from './points.js';

/*
 * Silverstone Circuit (British GP), 5.891 km, 18 turns, clockwise, on the old
 * RAF airfield in Northamptonshire. Point numbers refer to SILVERSTONE_POINTS
 * (P0 is on the Hamilton Straight in front of the Wing, heading for Abbey):
 *   T1 Abbey (P1-P4) flat-out right, T2 Farm (P4-P6) the left kink,
 *   T3 Village (P8-P12) right, T4 The Loop (P12-P16) the hairpin left,
 *   T5 Aintree (P16-P18) left onto the Wellington Straight (P18-P21),
 *   T6 Brooklands (P23-P27) left, T7 Luffield (P27-P31) the long right,
 *   T8 Woodcote (P31-P33) onto the National Straight past the old pits (P33-P37),
 *   T9 Copse (P37-P41) at 290 km/h, Maggots, Becketts and Chapel (P44-P55),
 *   the Hangar Straight (P55-P57), T15 Stowe (P57-P60), T16 Vale (P61-P63)
 *   and T17-T18 Club (P64-P69) onto the Hamilton Straight.
 * Flat as an airfield, a few metres of rise; huge tarmac run-offs, gravel at
 * Copse, Becketts, Stowe and Luffield.
 */
const layout = buildLayout({
  points: SILVERSTONE_POINTS,
  metresPerPx: 2.0154,
  width: 14,
  kerbWidth: 1.3,
  runoff: { base: 3.5, open: 6 },
  verge: 'grass',
  elevation: [
    [0, 4], [4, 4.5], [10, 3.5], [16, 3], [20, 4], [25, 5], [30, 5.5], [34, 5], [38, 4], [42, 3.2],
    [48, 2.6], [54, 2.4], [57, 3], [60, 3.5], [64, 4], [69, 4.2],
  ],
  zones: [
    { from: 1, to: 4, side: 'outside', runoff: 16, verge: 'paved' },   // Abbey
    { from: 8, to: 16, side: 'outside', runoff: 22, verge: 'paved' },  // Village and the Loop
    { from: 16, to: 18, side: 'outside', runoff: 10, verge: 'grass' }, // Aintree
    { from: 23, to: 27, side: 'outside', runoff: 18, verge: 'gravel' }, // Brooklands
    { from: 27, to: 31, side: 'outside', runoff: 22, verge: 'paved' }, // Luffield
    { from: 31, to: 33, side: 'outside', runoff: 14, verge: 'paved' }, // Woodcote
    { from: 37, to: 42, side: 'outside', runoff: 24, verge: 'gravel' }, // Copse
    { from: 44, to: 52, side: 'both', runoff: 16, verge: 'gravel' },   // Maggots, Becketts
    { from: 52, to: 55, side: 'outside', runoff: 14, verge: 'paved' }, // Chapel
    { from: 57, to: 61, side: 'outside', runoff: 26, verge: 'gravel' }, // Stowe
    { from: 61, to: 69, side: 'outside', runoff: 16, verge: 'paved' }, // Vale and Club
  ],
});
layout.pit = definePitLane(layout, { side: 'R', garages: [-150, 230], lane: 11, taper: 50, before: 130, after: 110, speedLimit: 80 / 3.6 });

export const SILVERSTONE = circuitTrack({
  id: 'silverstone',
  name: 'Silverstone Circuit',
  pack: 'f1',
  country: 'Great Britain',
  blurb: 'British GP · the Wing, Copse, Maggots-Becketts-Chapel, Stowe · 5.89 km',
  coverTitle: 'SILVERSTONE',
  cover: { scene: 'silverstone', sky: ['#6a8cb8', '#dfe4e6'], ground: '#4e7a3a', flag: ['#012169', '#ffffff', '#c8102e'], accent: '#c8102e' },
  layout,
  mood: 'silverstone',
  async build(ctx) {
    const { buildSilverstoneScene } = await import('./silverstoneScene.js');
    return buildSilverstoneScene(layout, ctx);
  },
});
