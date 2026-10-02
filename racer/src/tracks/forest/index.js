import { buildLayout } from '../street/layout.js';
import { definePitLane } from '../street/pitlane.js';
import { circuitTrack } from '../circuitTrack.js';

// Hand-drawn layout points (image pixels, y down), driven in this order.
export const FOREST_POINTS = [
  [183, 349], [241, 227], [256, 188], [265, 165], [282, 164], [309, 184], [324, 224], [376, 242], [448, 251], [530, 258],
  [611, 251], [694, 225], [777, 180], [897, 80], [963, 29], [985, 7], [1002, 10], [1005, 18], [992, 36], [941, 109],
  [879, 189], [850, 227], [835, 243], [795, 259], [709, 280], [665, 288], [648, 288], [651, 314], [667, 346], [700, 375],
  [704, 403], [694, 440], [645, 499], [606, 550], [572, 598], [544, 625], [522, 628], [498, 627], [422, 586], [362, 550],
  [339, 543], [321, 557], [327, 585], [347, 615], [365, 633], [405, 632], [451, 658], [474, 685], [473, 716], [451, 736],
  [432, 761], [403, 764], [343, 719], [246, 622], [192, 571], [148, 526], [145, 487], [154, 419], [169, 385],
];

// Wider verges and big gravel traps: a natural-terrain road course.
const layout = buildLayout({ points: FOREST_POINTS, metresPerPx: 1.2, width: 11, runoff: { base: 3.4, open: 16 }, verge: 'gravel' });
layout.pit = definePitLane(layout, { side: 'L', garages: [-63, 63], lane: 8.2, taper: 40, before: 110, after: 45, speedLimit: 60 / 3.6 });

/** Pinewood Ridge: a 3.7 km mountain road course through spruce forest, gravel traps and timber stands. */
export const PINEWOOD = circuitTrack({
  id: 'pinewood',
  name: 'Pinewood Ridge',
  blurb: 'Mountain forest road course · 3.7 km',
  layout,
  mood: 'forest',
  async build(ctx) {
    const { buildForestScene } = await import('./scene.js');
    return buildForestScene(layout, ctx);
  },
});
