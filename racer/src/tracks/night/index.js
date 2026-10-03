import { buildLayout } from '../street/layout.js';
import { definePitLane } from '../street/pitlane.js';
import { circuitTrack } from '../circuitTrack.js';

// Hand-drawn layout points (image pixels, y down), driven in this order.
export const NIGHT_POINTS = [
  [389, 418], [222, 437], [151, 442], [125, 442], [108, 429], [101, 406], [113, 388], [132, 381], [154, 390], [180, 394],
  [192, 383], [188, 359], [160, 322], [147, 286], [152, 221], [180, 161], [216, 134], [274, 110], [397, 66], [504, 20],
  [538, 2], [555, 11], [566, 42], [571, 103], [587, 188], [601, 218], [619, 243], [658, 268], [701, 268], [739, 252],
  [776, 216], [812, 200], [853, 197], [893, 225], [940, 288], [1027, 390], [1046, 415], [1030, 451], [1016, 488], [929, 500],
  [742, 516], [664, 525], [632, 530], [622, 537], [622, 551], [658, 575], [693, 597], [709, 643], [701, 699], [688, 746],
  [669, 766], [650, 779], [627, 774], [575, 729], [485, 650], [452, 626], [424, 617], [401, 619], [366, 640], [328, 661],
  [278, 658], [226, 638], [201, 610], [191, 585], [206, 565], [241, 555], [455, 518], [707, 473], [869, 442], [895, 437],
  [913, 422], [918, 405], [903, 381], [866, 378], [799, 387], [685, 394], [581, 402], [485, 412],
];

// A purpose-built international circuit: wide painted asphalt run-offs everywhere.
const layout = buildLayout({ points: NIGHT_POINTS, metresPerPx: 1.0, width: 13, runoff: { base: 5, open: 20 }, verge: 'paved' });
layout.pit = definePitLane(layout, { side: 'R', garages: [-63, 63], lane: 8.2, taper: 40, before: 120, after: 45, speedLimit: 60 / 3.6 });

/** Lumen Bay International: a 4.5 km floodlit desert-and-marina circuit raced at night. */
export const LUMEN_CITY = circuitTrack({
  id: 'lumenbay',
  name: 'Lumen Bay International',
  blurb: 'Floodlit marina circuit at night · 4.5 km',
  coverTitle: 'LUMEN BAY',
  country: 'Gulf coast',
  cover: { scene: 'gulf', sky: ['#070a1c', '#2a2050'], ground: '#3a3026', flag: [], accent: '#7df9ff', sun: 'rgba(160,200,255,0.55)' },
  layout,
  mood: 'night',
  async build(ctx) {
    const { buildNightScene } = await import('./scene.js');
    return buildNightScene(layout, ctx);
  },
});
