import { buildLayout } from './layout.js';
import { LAYOUT_POINTS } from './points.js';

const layout = buildLayout({ points: LAYOUT_POINTS, metresPerPx: 1.1, width: 12 });

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
