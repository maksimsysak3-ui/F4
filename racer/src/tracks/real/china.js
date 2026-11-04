import { buildLayout } from '../street/layout.js';
import { definePitLane } from '../street/pitlane.js';
import { circuitTrack } from '../circuitTrack.js';
import { CHINA_POINTS } from './points.js';

/*
 * Shanghai International Circuit (Chinese GP), 5.451 km, 16 turns, clockwise, on reclaimed marsh in
 * Jiading; the lap traces the character 上 ("shang"). Race lap record 1:32.238 (Schumacher, 2004);
 * pole 1:30.641 (Piastri, 2025). Flat. Point numbers refer to CHINA_POINTS (P0 on the start
 * straight, heading north for Turn 1):
 *   T1-T2 (P1-P8) the endless tightening right, the snail, T3 (P9-P13) the left out of it, T4 (P14-P16),
 *   T5 (P17-P19), the T6 hairpin (P20-P24), T7-T8 (P27-P31) the fast double-apex left, T9-T10
 *   (P33-P41), T11-T12 (P45-P50), T13 (P50-P55) the long right onto the 1.2 km back straight
 *   (P55-P60), the T14 hairpin (P60-P63) with its giant Lenovo run-off, T15-T16 (P63-P68).
 * Vast run-offs: grey tarmac and gravel the size of car parks, grass between, red-and-white kerbs;
 * the stands set far back behind them, the pit straight under the two wing grandstands.
 */
const layout = buildLayout({
  points: CHINA_POINTS,
  metresPerPx: 1.6472,
  width: 15,
  kerbWidth: 1.5,
  runoff: { base: 8, open: 16 },
  verge: 'grass',
  elevation: [[0, 4], [10, 4.5], [20, 5], [30, 5.5], [40, 5], [50, 4.5], [60, 4], [69, 4]],
  zones: [
    { from: 66, to: 1, side: 'both', runoff: 22, verge: 'grass' },     // the start straight, wide open
    { from: 1, to: 9, side: 'outside', runoff: 60, verge: 'paved' },    // T1-T2: a sea of tarmac
    { from: 9, to: 15, side: 'both', runoff: 30, verge: 'gravel' },     // T3-T4
    { from: 16, to: 20, side: 'both', runoff: 26, verge: 'grass' },
    { from: 20, to: 25, side: 'outside', runoff: 55, verge: 'paved' },  // T6 hairpin
    { from: 26, to: 32, side: 'outside', runoff: 45, verge: 'gravel' }, // T7-T8
    { from: 33, to: 41, side: 'outside', runoff: 36, verge: 'paved' },  // T9-T10
    { from: 44, to: 55, side: 'outside', runoff: 44, verge: 'gravel' }, // T11-T13
    { from: 55, to: 59, side: 'both', runoff: 24, verge: 'grass' },     // back straight
    { from: 59, to: 64, side: 'outside', runoff: 70, verge: 'paved' },  // T14: the giant hairpin run-off
    { from: 64, to: 68, side: 'outside', runoff: 32, verge: 'paved' },  // T15-T16
  ],
});
layout.pit = definePitLane(layout, { side: 'R', garages: [-260, 70], lane: 12, taper: 45, before: 140, after: 110, speedLimit: 80 / 3.6 });

export const CHINA = circuitTrack({
  id: 'china',
  name: 'Shanghai International Circuit',
  pack: 'f1',
  country: 'China',
  blurb: 'Chinese GP · the snail, the wing grandstands, the 1.2 km back straight · 5.45 km',
  coverTitle: 'SHANGHAI',
  cover: { scene: 'spa', sky: ['#9aa8b4', '#dfe4e8'], ground: '#4a6a38', flag: ['#de2910', '#ffde00', '#de2910'], accent: '#de2910' },
  layout,
  mood: 'china',
  async build(ctx) {
    const { buildChinaScene } = await import('./chinaScene.js');
    return buildChinaScene(layout, ctx);
  },
});
