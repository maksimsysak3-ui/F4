import { buildLayout } from './layout.js?v=a5d31c9';
import { LAYOUT_POINTS } from './points.js?v=a5d31c9';
import { definePitLane } from './pitlane.js?v=a5d31c9';
import { circuitTrack } from '../circuitTrack.js?v=a5d31c9';

const layout = buildLayout({ points: LAYOUT_POINTS, metresPerPx: 1.1, width: 12 });
// Monaco-style pits on the harbour side of the start straight; garages straddle the line.
layout.pit = definePitLane(layout, { side: 'R', garages: [-63, 63], lane: 8.2, taper: 40, before: 120, after: 45, speedLimit: 60 / 3.6 });

/**
 * Porto Vela Street Circuit: 3.36 km through a fictional Riviera harbour town.
 * The start/finish straight runs along the marina; the rest winds through
 * the old town between concrete walls.
 */
export const PORTO_VELA = circuitTrack({
  id: 'portovela',
  name: 'Porto Vela Street Circuit',
  blurb: 'Riviera harbour town at dusk · 3.4 km',
  coverTitle: 'PORTO VELA',
  country: 'Riviera',
  cover: { scene: 'harbour', sky: ['#3a3a6a', '#f2a070'], ground: '#5a5a5a', flag: [], accent: '#ffb070', sun: 'rgba(255,190,130,0.95)' },
  layout,
  mood: 'dusk',
  // The whole town is built on demand (it's big).
  async build(ctx) {
    const { buildStreetScene } = await import('./scene.js?v=a5d31c9');
    return buildStreetScene(layout, ctx);
  },
});
