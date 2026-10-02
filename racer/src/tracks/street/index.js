import { buildLayout } from './layout.js';
import { LAYOUT_POINTS } from './points.js';
import { definePitLane } from './pitlane.js';

const layout = buildLayout({ points: LAYOUT_POINTS, metresPerPx: 1.1, width: 12 });
// Monaco-style pits on the harbour side of the start straight; garages straddle the line.
layout.pit = definePitLane(layout, { side: 'R', garages: [-63, 63], lane: 8.2, taper: 40, before: 120, after: 45, speedLimit: 60 / 3.6 });

/**
 * Porto Vela Street Circuit: 3.36 km through a fictional Riviera harbour town.
 * The start/finish straight runs along the marina; the rest winds through
 * the old town between concrete walls.
 */
export const PORTO_VELA = {
  id: 'portovela',
  name: 'Porto Vela Street Circuit',
  length: layout.length,
  layout,
  ground: { heightAt: layout.heightAt, wallContact: layout.wallContact },
  mood: 'dusk',
  voidY: null,
  spawn: { s: layout.length - 9, lateral: -2.5 }, // pole position box

  progress(x, z) {
    const n = layout.nearest(x, z);
    return n ? n.s : null;
  },

  poseAt: layout.poseAt,

  /** Speed limit (m/s) if (x, z) is in the pit lane between the speed lines, else null. */
  pitLimit(x, z) {
    const p = layout.pit;
    const n = layout.nearest(x, z);
    if (!n || p.into(n.s) === null) return null;
    const a = n.lateral * (p.side === 'L' ? 1 : -1);
    const lineIn = p.g0 - 30, lineOut = p.g1 + 20;
    const u = (((n.s - lineIn) % layout.length) + layout.length) % layout.length;
    return u <= lineOut - lineIn && a > layout.wall[p.side][n.i] + 0.3 ? p.speedLimit : null;
  },

  minimap() {
    const pts = [];
    for (let i = 0; i < layout.N; i += 4) pts.push([layout.x[i], layout.z[i]]);
    return pts;
  },

  /** The whole town is built on demand (it's big). */
  async build(ctx) {
    const { buildStreetScene } = await import('./scene.js');
    return buildStreetScene(layout, ctx);
  },
};
