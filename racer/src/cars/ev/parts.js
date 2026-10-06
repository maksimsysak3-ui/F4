import { Group } from 'three';
import { lens } from '../../car/loft.js';
import { buildCockpit } from '../../car/cockpit.js';
import { loft, NOSE_Z, TAIL_Z, COWL_Z, ROOF_END_Z, AXLE_FRONT, AXLE_REAR } from './body.js';

// Front: a single full-width light bar, the low splitter and two flush air curtains; no grille (no radiator to feed).
function buildFront(mb) {
  const z = NOSE_Z;
  mb.prism('drl', [[-0.66, 0.31], [0.66, 0.31], [0.64, 0.335], [-0.64, 0.335]], 'z', z - 0.02, z + 0.012);
  for (const s of [1, -1]) {
    lens(mb, 'lamp', [0.5 * s, 0.31, z + 0.004], [0, 0, 1], [0, 1, 0], 0.07, 0.02, { segments: 10, dome: 0.006 });
    mb.prism('black', [[0.55 * s, 0.14], [0.8 * s, 0.14], [0.8 * s, 0.24], [0.55 * s, 0.24]].map(([x, y]) => [x, y]), 'z', z - 0.06, z - 0.02); // air curtains
  }
  mb.prism('carbon', [[-0.82, 0.07], [0.82, 0.07], [0.86, 0.12], [-0.86, 0.12]], 'z', z - 0.3, z + 0.06); // splitter
  mb.prism('stripe', [[-0.03, 0.37], [0.03, 0.37], [0.03, 0.4], [-0.03, 0.4]], 'z', z - 0.02, z + 0.01); // badge
}

// Sides: an aero blade sweeping from the front arch, flush door handles, camera mirrors, a charge flap.
function buildSides(mb) {
  for (const side of [1, -1]) {
    const X = (p) => [p[0] * side, p[1], p[2]];
    loft.patch(mb, 'stripe', [[AXLE_FRONT - 0.5, 1.6], [AXLE_FRONT - 0.5, 2.1], [AXLE_REAR + 0.55, 2.4], [AXLE_REAR + 0.55, 2.0]], 0.008, side); // accent blade
    loft.ribbon(mb, 'black', [[COWL_Z, 4.02], [-0.05, 4.02], [ROOF_END_Z, 4.02]], 0.02, 0.004, side);
    loft.patch(mb, 'black', [[-0.2, 2.6], [-0.2, 2.75], [-0.38, 2.75], [-0.38, 2.6]], 0.004, side); // flush handle
    // Camera "mirror": a slim carbon stalk with a tiny pod.
    mb.hexa('carbon', [[0.84, 0.78, 0.5], [0.84, 0.78, 0.44], [0.98, 0.8, 0.45], [0.98, 0.8, 0.49]].map(X), [[0.84, 0.82, 0.5], [0.84, 0.82, 0.44], [0.98, 0.84, 0.45], [0.98, 0.84, 0.49]].map(X));
  }
  loft.patch(mb, 'black', [[-1.15, 3.2], [-1.15, 3.55], [-1.35, 3.55], [-1.35, 3.2]], 0.004, 1); // charge port flap
}

// Rear: the full-width light bar, a ducktail lip, an active wing blade, and a big diffuser.
function buildRear(mb) {
  const z = TAIL_Z;
  mb.prism('tail', [[-0.74, 0.68], [0.74, 0.68], [0.72, 0.71], [-0.72, 0.71]], 'z', z - 0.02, z + 0.01);
  mb.prism('paint', [[z + 0.12, 0.8], [z - 0.06, 0.82], [z - 0.06, 0.84], [z + 0.12, 0.82]], 'x', -0.74, 0.74); // ducktail
  // Active wing: a thin blade on two slim pylons from the tail deck.
  for (const x of [-0.42, 0.42]) mb.prism('carbon', [[z + 0.3, 0.83], [z + 0.15, 0.84], [z + 0.12, 0.98], [z + 0.24, 0.98]], 'x', x - 0.015, x + 0.015);
  mb.prism('carbon', [[z + 0.3, 0.98], [z + 0.06, 0.99], [z + 0.06, 1.015], [z + 0.3, 1.005]], 'x', -0.72, 0.72);
  mb.prism('carbon', [[-0.8, 0.12], [0.8, 0.12], [0.82, 0.32], [-0.82, 0.32]], 'z', z - 0.05, z + 0.32); // diffuser
  for (const x of [-0.55, -0.3, -0.05, 0.2, 0.45]) mb.prism('carbon', [[x - 0.01, 0.12], [x + 0.01, 0.12], [x + 0.01, 0.3], [x - 0.01, 0.3]], 'z', z - 0.14, z + 0.2);
  mb.prism('plate', [[-0.18, 0.4], [0.18, 0.4], [0.18, 0.5], [-0.18, 0.5]], 'z', z - 0.03, z - 0.015);
}

function buildInterior(mb) {
  mb.prism('interior', [[0.78, COWL_Z], [0.78, -0.8], [-0.78, -0.8], [-0.78, COWL_Z]], 'y', 0.18, 0.24);
  const seat = [[-0.1, 0.25], [-0.44, 0.25], [-0.56, 0.86], [-0.44, 0.88], [-0.34, 0.4], [-0.1, 0.38]];
  for (const x of [0.32, -0.32]) mb.prism('alcantara', seat, 'x', x - 0.15, x + 0.15);
  mb.prism('black', [[COWL_Z, 0.7], [COWL_Z - 0.18, 0.7], [COWL_Z - 0.24, 0.55], [COWL_Z, 0.5]], 'x', -0.76, 0.76); // dash
  mb.prism('drl', [[COWL_Z - 0.16, 0.69], [COWL_Z - 0.2, 0.69], [COWL_Z - 0.2, 0.7], [COWL_Z - 0.16, 0.7]], 'x', -0.5, 0.5); // ambient strip
  void AXLE_REAR;
}

export function buildDetails(mb) {
  buildFront(mb);
  buildSides(mb);
  buildRear(mb);
  buildInterior(mb);
}

export function buildAnimatedParts(mats) {
  const cockpit = buildCockpit(mats, { seatX: 0.32, seatZ: -0.25, wheelZ: 0.15, wheelY: 0.6, seatY: -0.06 });
  // No exhausts: an empty flames list keeps the visual code happy.
  return { group: cockpit.group, head: cockpit.head, steering: cockpit.steering, flames: [] };
}
