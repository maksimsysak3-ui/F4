/**
 * Pit lane geometry shared by the physics (walls), the circuit dressing
 * (barrier gaps, noses, outer wall) and the pit building.
 *
 * The lane runs behind the start-straight barrier on one side. Over the
 * entry and exit tapers the barrier is open so cars can peel off and rejoin;
 * between them the barrier is the pit wall, with the lane on its far side.
 *
 * Distances along the lap (s) may be negative: they wrap around the line.
 */
const NOSE = 3; // crash cushion length at each end of the pit wall (m)

export function definePitLane(L, o) {
  const { side, garages: [g0, g1], lane, taper, before, after } = o;
  const s0 = g0 - before, s1 = g1 + after;
  const len = s1 - s0;
  const wrap = (s) => ((s % L.length) + L.length) % L.length;
  /** Distance into the lane from its start, or null outside it. */
  const into = (s) => { const u = wrap(s - s0); return u <= len ? u : null; };

  const pit = {
    side, s0, s1, g0, g1, lane, taper, speedLimit: o.speedLimit,
    /** Lateral distance (unsigned) of the barrier's back face at sample i. */
    barrierBack: (i) => L.wall[side][i] + 0.62,
    into,
    /** Lane width beyond the barrier back face at s (tapers at both ends), or 0 outside. */
    widthAt(s) {
      const u = into(s);
      if (u === null) return 0;
      return lane * Math.min(1, u / taper, (len - u) / taper);
    },
    /** True where the barrier between track and lane stands (it is open over the tapers). */
    barrierAt(s) {
      const u = into(s);
      return u === null || (u > taper - NOSE && u < len - taper + NOSE);
    },
    /** Distance from s to the nearest pit-wall nose if within the crash cushion, else null. */
    noseAt(s) {
      const u = into(s);
      if (u === null) return null;
      if (u > taper - NOSE && u < taper) return u - (taper - NOSE);
      if (u > len - taper && u < len - taper + NOSE) return len - taper + NOSE - u;
      return null;
    },
    /** True where the outer wall is the garage facade rather than a separate pit-lane wall. */
    garageAt(s) {
      const u = wrap(s - g0);
      return u <= g1 - g0;
    },
  };
  return pit;
}
