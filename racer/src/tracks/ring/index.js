import { TRACK } from '../../config.js';
import { ground } from '../../world/trackShape.js';
import { buildTrack } from '../../world/trackMesh.js';

const R = TRACK.centerRadius;
const LENGTH = 2 * Math.PI * R;

/** The original test ring: one black circle floating in the void. */
export const VOID_RING = {
  id: 'ring',
  name: 'The Void Ring',
  length: LENGTH,
  ground,
  mood: 'void',
  voidY: TRACK.voidY,
  spawn: { s: LENGTH - 3.75, lateral: 0 },

  /** Distance along the lap (start line at theta = 0, driving towards +theta). */
  progress(x, z) {
    const t = Math.atan2(z, x) / (2 * Math.PI);
    return (((t % 1) + 1) % 1) * LENGTH;
  },

  /** Pose at distance s; lateral + = left of travel (outwards on this ring). */
  poseAt(s, lateral = 0) {
    const theta = s / R;
    const r = R + lateral;
    return { x: Math.cos(theta) * r, z: Math.sin(theta) * r, yaw: -theta, s };
  },

  minimap() {
    const pts = [];
    for (let i = 0; i < 96; i++) pts.push([Math.cos((i / 96) * Math.PI * 2) * R, Math.sin((i / 96) * Math.PI * 2) * R]);
    return pts;
  },

  build() {
    return { group: buildTrack(), update() {} };
  },
};
