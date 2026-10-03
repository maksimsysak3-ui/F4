/**
 * Common track object for the hand-laid circuits (Porto Vela, Pinewood Ridge,
 * Lumen City): wraps a layout with the interface the game uses (ground,
 * progress, poses, spawn, pit limiter, minimap) and builds the scene on demand.
 */
export function circuitTrack({ id, name, blurb, layout, mood, spawnLateral = -2.5, build, pack, country }) {
  return {
    id, name, blurb, mood, layout, pack, country,
    length: layout.length,
    ground: { heightAt: layout.heightAt, wallContact: layout.wallContact, surfaceAt: layout.surfaceAt },
    voidY: null,
    spawn: { s: layout.length - 9, lateral: spawnLateral }, // pole position box

    progress(x, z) {
      const n = layout.nearest(x, z);
      return n ? n.s : null;
    },

    poseAt: layout.poseAt,

    /** Speed limit (m/s) if (x, z) is in the pit lane between the speed lines, else null. */
    pitLimit(x, z) {
      const p = layout.pit;
      if (!p) return null;
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

    build,
  };
}
