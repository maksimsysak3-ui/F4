import { Group } from 'three';
import { lens } from '../../car/loft.js?v=a5d31c9';
import { buildCockpit, buildExhausts } from '../../car/cockpit.js?v=a5d31c9';
import { loft, NOSE_Z, TAIL_Z, COWL_Z, ROOF_FRONT_Z, ROOF_END_Z, AXLE_FRONT, AXLE_REAR } from './body.js?v=a5d31c9';

// Front: wide mesh grille, slim LED headlights, a deep splitter and the aluminium sump guard, bonnet vents.
function buildFront(mb) {
  const z = NOSE_Z;
  mb.prism('grille', [[-0.58, 0.28], [0.58, 0.28], [0.62, 0.62], [-0.62, 0.62]], 'z', z - 0.06, z + 0.004);
  mb.prism('stripe', [[-0.6, 0.62], [0.6, 0.62], [0.6, 0.64], [-0.6, 0.64]], 'z', z - 0.02, z + 0.008);
  for (const s of [1, -1]) {
    const S = (pts) => pts.map(([x, y]) => [x * s, y]);
    mb.prism('black', S([[0.6, 0.55], [0.84, 0.56], [0.82, 0.68], [0.6, 0.67]]), 'z', z - 0.06, z + 0.004);
    lens(mb, 'lamp', [0.72 * s, 0.615, z + 0.006], [0, 0, 1], [0, 1, 0], 0.055, 0.04, { segments: 12, dome: 0.012, rim: 'chrome', rimWidth: 0.008 });
    mb.prism('drl', S([[0.62, 0.56], [0.82, 0.57], [0.82, 0.585], [0.62, 0.575]]), 'z', z + 0.004, z + 0.012);
    loft.patch(mb, 'grille', [[1.3, 5.2], [1.3, 5.6], [0.95, 5.6], [0.95, 5.2]], 0.004, s); // bonnet vents
  }
  mb.prism('black', [[-0.86, 0.08], [0.86, 0.08], [0.9, 0.16], [-0.9, 0.16]], 'z', z - 0.2, z + 0.12); // splitter
  mb.prism('chrome', [[-0.55, 0.06], [0.55, 0.06], [0.55, 0.1], [-0.55, 0.1]], 'z', z - 0.9, z - 0.1); // sump guard
}

// Sides: two-tone livery on the doors, the door number board, mirrors, mudflaps behind the arches.
function buildSides(mb) {
  for (const side of [1, -1]) {
    const X = (p) => [p[0] * side, p[1], p[2]];
    loft.patch(mb, 'stripe', [[0.62, 1.15], [0.62, 2.55], [-0.62, 2.55], [-0.62, 1.15]], 0.006, side); // livery panel
    loft.patch(mb, 'plate', [[0.25, 1.45], [0.25, 2.2], [-0.45, 2.2], [-0.45, 1.45]], 0.01, side);     // door number board
    loft.ribbon(mb, 'black', [[AXLE_FRONT - 0.5, 0.35], [0, 0.35], [AXLE_REAR + 0.5, 0.35]], 0.12, 0.012, side);
    // Road dirt thrown up along the sills and behind the arches.
    loft.patch(mb, 'black', [[AXLE_FRONT - 0.48, 0.4], [AXLE_FRONT - 0.48, 0.85], [AXLE_REAR + 0.48, 0.85], [AXLE_REAR + 0.48, 0.4]], 0.004, side);
    loft.ribbon(mb, 'black', [[COWL_Z - 0.02, 4.02], [ROOF_FRONT_Z, 4.02], [-0.6, 4.02], [-0.95, 4.04]], 0.02, 0.004, side);
    loft.ribbon(mb, 'black', [[-0.38, 4.05], [-0.38, 4.95]], 0.06, 0.004, side); // B-pillar
    mb.hexa('black',
      [[0.82, 0.86, 0.56], [0.82, 0.86, 0.46], [0.92, 0.88, 0.48], [0.92, 0.88, 0.56]].map(X),
      [[0.82, 0.9, 0.56], [0.82, 0.9, 0.46], [0.92, 0.92, 0.48], [0.92, 0.92, 0.56]].map(X));
    mb.hexa('paint',
      [[0.9, 0.88, 0.58], [0.9, 0.88, 0.44], [1.02, 0.89, 0.46], [1.02, 0.89, 0.56]].map(X),
      [[0.9, 1.0, 0.58], [0.9, 1.0, 0.44], [1.02, 0.99, 0.46], [1.02, 0.99, 0.56]].map(X));
    for (const az of [AXLE_FRONT - 0.5, AXLE_REAR - 0.5]) {
      mb.hexa('stripe', [[0.6, 0.04, az], [0.92, 0.04, az], [0.92, 0.04, az - 0.025], [0.6, 0.04, az - 0.025]].map(X),
        [[0.6, 0.3, az + 0.02], [0.92, 0.3, az + 0.02], [0.92, 0.3, az - 0.005], [0.6, 0.3, az - 0.005]].map(X));
    }
  }
  // Contrasting roof in the livery colour, the vent on top of it.
  for (const side of [1, -1]) loft.patch(mb, 'stripe', [[-0.02, 5.05], [-0.02, 6], [-1.15, 6], [-1.15, 5.05]], 0.004, side);
  loft.patch(mb, 'black', [[-0.15, 5.45], [-0.15, 5.9], [-0.55, 5.9], [-0.55, 5.45]], 0.008, 1); // roof vent
  mb.prism('paint', [[-0.85, 1.43], [-1.05, 1.43], [-1.03, 1.52]], 'x', -0.02, 0.02); // antenna
}

// Rear: the big rally wing on the roof spoiler, slim tail lights, diffuser, the single big exhaust.
function buildRear(mb) {
  const z = TAIL_Z;
  mb.prism('paint', [[ROOF_END_Z + 0.06, 1.37], [ROOF_END_Z - 0.22, 1.33], [ROOF_END_Z - 0.24, 1.3], [ROOF_END_Z + 0.04, 1.34]], 'x', -0.66, 0.66);
  for (const x of [-0.34, 0.34]) mb.prism('black', [[ROOF_END_Z - 0.05, 1.34], [ROOF_END_Z - 0.2, 1.33], [ROOF_END_Z - 0.32, 1.52], [ROOF_END_Z - 0.2, 1.53]], 'x', x - 0.02, x + 0.02);
  mb.prism('paint', [[ROOF_END_Z - 0.12, 1.5], [ROOF_END_Z - 0.46, 1.48], [ROOF_END_Z - 0.46, 1.53], [ROOF_END_Z - 0.12, 1.54]], 'x', -0.8, 0.8);
  mb.prism('stripe', [[ROOF_END_Z - 0.44, 1.56], [ROOF_END_Z - 0.56, 1.6], [ROOF_END_Z - 0.55, 1.62], [ROOF_END_Z - 0.43, 1.58]], 'x', -0.8, 0.8);
  for (const s of [1, -1]) mb.prism('paint', [[ROOF_END_Z - 0.14, 1.5], [ROOF_END_Z - 0.54, 1.48], [ROOF_END_Z - 0.56, 1.62], [ROOF_END_Z - 0.18, 1.6]], 'x', s * 0.81 - 0.012, s * 0.81 + 0.012);
  for (const s of [1, -1]) {
    const S = (pts) => pts.map(([x, y]) => [x * s, y]);
    mb.prism('black', S([[0.42, 0.66], [0.86, 0.66], [0.86, 0.84], [0.42, 0.82]]), 'z', z - 0.012, z + 0.01);
    mb.prism('tail', S([[0.45, 0.7], [0.84, 0.7], [0.84, 0.8], [0.45, 0.78]]), 'z', z - 0.02, z - 0.01);
  }
  mb.prism('plate', [[-0.2, 0.42], [0.2, 0.42], [0.2, 0.54], [-0.2, 0.54]], 'z', z - 0.03, z - 0.015);
  mb.prism('black', [[-0.82, 0.12], [0.82, 0.12], [0.84, 0.3], [-0.84, 0.3]], 'z', z - 0.06, z + 0.3);
  for (const x of [-0.5, -0.25, 0.25, 0.5]) mb.prism('black', [[x - 0.01, 0.12], [x + 0.01, 0.12], [x + 0.01, 0.26], [x - 0.01, 0.26]], 'z', z - 0.12, z + 0.1);
  mb.prism('stripe', [[-0.05, 0.3], [0.05, 0.3], [0.05, 0.38], [-0.05, 0.38]], 'z', z - 0.06, z - 0.03); // tow strap
}

function buildInterior(mb) {
  mb.prism('interior', [[0.78, COWL_Z], [0.78, -1.05], [-0.78, -1.05], [-0.78, COWL_Z]], 'y', 0.22, 0.28);
  mb.prism('interior', [[COWL_Z, 0.86], [COWL_Z - 0.2, 0.86], [COWL_Z - 0.28, 0.66], [COWL_Z, 0.58]], 'x', -0.78, 0.78);
  const seat = [[-0.06, 0.29], [-0.4, 0.29], [-0.52, 0.98], [-0.4, 1.0], [-0.3, 0.46], [-0.06, 0.44]];
  for (const x of [0.33, -0.33]) mb.prism('alcantara', seat, 'x', x - 0.16, x + 0.16);
  for (const x of [0.6, -0.6]) {
    mb.prism('titanium', [[-0.62, 0.28], [-0.58, 0.28], [-0.58, 1.32], [-0.62, 1.32]], 'x', x - 0.02, x + 0.02);
    mb.prism('titanium', [[0.45, 1.3], [-0.6, 1.3], [-0.6, 1.33], [0.45, 1.33]], 'x', x - 0.02, x + 0.02);
  }
  mb.prism('titanium', [[-0.62, 1.3], [-0.58, 1.3], [-0.58, 1.33], [-0.62, 1.33]], 'x', -0.6, 0.6);
}

export function buildDetails(mb) {
  buildFront(mb);
  buildSides(mb);
  buildRear(mb);
  buildInterior(mb);
}

export function buildAnimatedParts(mats) {
  const cockpit = buildCockpit(mats, { seatX: 0.33, seatZ: -0.22, wheelZ: 0.18, wheelY: 0.7, seatY: 0.06 });
  const ex = buildExhausts(mats, [{ x: -0.6, y: 0.2, z: TAIL_Z, r: 0.065, sides: 12 }]);
  const group = new Group();
  group.add(...cockpit.group.children, ...ex.group.children);
  return { group, head: cockpit.head, steering: cockpit.steering, flames: ex.flames };
}
