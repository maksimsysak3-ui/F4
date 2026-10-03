import { TRACK } from '../config.js';

/**
 * Pure geometry of the ring track, shared by physics (heightAt) and the mesh
 * builder so what you see is exactly what the tires feel.
 * Angle convention: theta = atan2(z, x); driving direction is +theta.
 */
export const R_IN = TRACK.centerRadius - TRACK.width / 2;
export const R_OUT = TRACK.centerRadius + TRACK.width / 2;
const KW = TRACK.kerbWidth;
const KH = TRACK.kerbHeight;
const RAMP = 0.35; // fraction of kerb width that ramps up from the asphalt

/** Kerb height for a position across the kerb (u: 0 = asphalt side, 1 = outer edge) and along it. */
export function kerbProfile(u, alongPhase) {
  const across = Math.min(1, u / RAMP);
  // Each block peaks in its middle -> a rumble the suspension can feel.
  const ridge = 0.6 + 0.4 * (1 - Math.abs(alongPhase * 2 - 1));
  return KH * across * ridge;
}

/** Kerb blocks per lap on a kerb at the given radius (integer so the pattern closes). */
export function kerbBlocks(radius) {
  return Math.round((2 * Math.PI * radius) / TRACK.kerbBlockLength / 2) * 2;
}

const BLOCKS_IN = kerbBlocks(R_IN + KW / 2);
const BLOCKS_OUT = kerbBlocks(R_OUT - KW / 2);

/** Ground height at (x, z), or null over the void. */
export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  if (r < R_IN || r > R_OUT) return null;
  let u;
  let blocks;
  if (r < R_IN + KW) { u = (R_IN + KW - r) / KW; blocks = BLOCKS_IN; }
  else if (r > R_OUT - KW) { u = (r - (R_OUT - KW)) / KW; blocks = BLOCKS_OUT; }
  else return 0;
  const theta = Math.atan2(z, x);
  const t = ((theta / (2 * Math.PI)) * blocks) % 1;
  return kerbProfile(u, t < 0 ? t + 1 : t);
}

export const ground = { heightAt };

/** Closest point on the racing line, heading along the direction of travel. */
export function nearestTrackPose(x, z) {
  const theta = Math.atan2(z, x);
  const r = TRACK.centerRadius;
  return {
    x: Math.cos(theta) * r,
    z: Math.sin(theta) * r,
    // Car forward is +Z in body space; yaw rotates it to the tangent (-sin, cos).
    yaw: Math.atan2(-Math.sin(theta), Math.cos(theta)),
    theta,
  };
}
