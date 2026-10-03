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
// Elevation: the pits sit mid-slope; the lap climbs to the far north-east hairpin on the ridge,
// sweeps back down the hillside and bottoms out in the southern valley before the climb home.
const layout = buildLayout({
  points: FOREST_POINTS, metresPerPx: 1.2, width: 11, runoff: { base: 3.4, open: 16 }, verge: 'gravel',
  elevation: [
    [0, 12], [2, 18], [4, 24], [6, 23], [8, 20], [10, 19], [12, 24], [13, 30], [15, 36], [17, 37], [19, 33],
    [21, 28], [23, 24], [25, 20], [27, 17], [29, 13], [31, 9], [33, 5], [35, 2], [37, 1], [39, 3], [41, 4],
    [43, 2], [45, 3], [47, 5], [49, 6], [51, 5], [53, 6], [55, 8], [57, 10],
  ],
});
layout.pit = definePitLane(layout, { side: 'L', garages: [-63, 63], lane: 8.2, taper: 40, before: 110, after: 45, speedLimit: 60 / 3.6 });

/** Pinewood Ridge: a 3.7 km mountain road course through spruce forest, gravel traps and timber stands. */
export const PINEWOOD = circuitTrack({
  id: 'pinewood',
  name: 'Pinewood Ridge',
  blurb: 'Mountain forest road course · 3.7 km',
  coverTitle: 'PINEWOOD RIDGE',
  country: 'Alps',
  cover: { scene: 'forest', sky: ['#5a88c0', '#d8e4ee'], ground: '#2c4a30', flag: [], accent: '#9fe07a' },
  layout,
  mood: 'forest',
  async build(ctx) {
    const { buildForestScene } = await import('./scene.js');
    return buildForestScene(layout, ctx);
  },
});
