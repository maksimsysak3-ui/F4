import { Group } from 'three';
import { lens } from '../../car/loft.js?v=a5d31c9';
import { buildCockpit, buildExhausts } from '../../car/cockpit.js?v=a5d31c9';
import { loft, NOSE_Z, TAIL_Z, COWL_Z, ROOF_FRONT_Z, ROOF_END_Z, HATCH_Z, AXLE_FRONT, AXLE_REAR } from './body.js?v=a5d31c9';

// ---------------------------------------------------------------------------
// Front: honeycomb grille with the red pinstripe, slim headlights joined by a
// light strip, a big lower intake with fog lamps and a splitter lip.

function buildFront(mb) {
  const z = NOSE_Z;
  mb.prism('grille', [[-0.6, 0.5], [0.6, 0.5], [0.58, 0.66], [-0.58, 0.66]], 'z', z - 0.01, z + 0.006);
  mb.prism('stitch', [[-0.6, 0.5], [0.6, 0.5], [0.6, 0.515], [-0.6, 0.515]], 'z', z + 0.006, z + 0.012); // red GTI line
  for (let x = -0.54; x <= 0.55; x += 0.09) {
    for (const y of [0.55, 0.61]) mb.prism('black', [[x - 0.025, y - 0.018], [x + 0.025, y - 0.018], [x + 0.025, y + 0.018], [x - 0.025, y + 0.018]], 'z', z + 0.006, z + 0.012);
  }
  mb.prism('chrome', [[-0.07, 0.56], [0.07, 0.56], [0.07, 0.63], [-0.07, 0.63]], 'z', z + 0.012, z + 0.022); // badge
  for (const s of [1, -1]) {
    const S = (pts) => pts.map(([x, y]) => [x * s, y]);
    mb.prism('black', S([[0.58, 0.52], [0.82, 0.53], [0.8, 0.68], [0.58, 0.67]]), 'z', z - 0.05, z + 0.004);
    lens(mb, 'lamp', [0.7 * s, 0.6, z + 0.006], [0, 0, 1], [0, 1, 0], 0.05, 0.04, { segments: 12, dome: 0.012, rim: 'chrome', rimWidth: 0.01 });
    mb.prism('drl', S([[0.6, 0.53], [0.8, 0.54], [0.8, 0.555], [0.6, 0.545]]), 'z', z + 0.004, z + 0.012);
    // Fog lamp "teeth" either side of the lower intake.
    for (let k = 0; k < 3; k++) mb.prism('drl', S([[0.6 + k * 0.05, 0.3], [0.63 + k * 0.05, 0.3], [0.63 + k * 0.05, 0.36], [0.6 + k * 0.05, 0.36]]), 'z', z - 0.02, z - 0.01);
  }
  mb.prism('grille', [[-0.5, 0.24], [0.5, 0.24], [0.54, 0.42], [-0.54, 0.42]], 'z', z - 0.04, z - 0.01);
  mb.prism('black', [[-0.8, 0.12], [0.8, 0.12], [0.82, 0.18], [-0.82, 0.18]], 'z', z - 0.3, z + 0.04); // splitter
}

// ---------------------------------------------------------------------------
// Sides: skirts with a red stripe, mirrors, handles, window line, fuel flap.

function buildSides(mb) {
  for (const side of [1, -1]) {
    const X = (p) => [p[0] * side, p[1], p[2]];
    loft.ribbon(mb, 'black', [[AXLE_FRONT - 0.5, 0.35], [0, 0.35], [AXLE_REAR + 0.5, 0.35]], 0.12, 0.012, side);
    loft.ribbon(mb, 'stitch', [[AXLE_FRONT - 0.5, 0.62], [0, 0.62], [AXLE_REAR + 0.5, 0.62]], 0.012, 0.014, side);
    loft.ribbon(mb, 'black', [[COWL_Z - 0.02, 4.02], [ROOF_FRONT_Z, 4.02], [-0.6, 4.02], [-1.05, 4.04]], 0.02, 0.004, side);
    loft.ribbon(mb, 'black', [[-0.38, 4.05], [-0.38, 4.95]], 0.06, 0.004, side); // B-pillar
    for (const z of [0.6, -0.38, -1.07]) loft.ribbon(mb, 'black', [[z, 0.5], [z, 2.0], [z, 3.0]], 0.006, 0.003, side);
    for (const z of [0.05, -0.75]) loft.ribbon(mb, 'chrome', [[z, 2.62], [z - 0.1, 2.62]], 0.026, 0.012, side);
    if (side < 0) loft.decal(mb, 'black', [[-1.15, 2.55], [-1.32, 2.55], [-1.23, 2.95]], 0.004, side, 4);
    // Painted mirror with a black base.
    mb.hexa('black',
      [[0.8, 0.86, 0.56], [0.8, 0.86, 0.46], [0.9, 0.88, 0.48], [0.9, 0.88, 0.56]].map(X),
      [[0.8, 0.9, 0.56], [0.8, 0.9, 0.46], [0.9, 0.92, 0.48], [0.9, 0.92, 0.56]].map(X));
    mb.hexa('paint',
      [[0.88, 0.88, 0.58], [0.88, 0.88, 0.44], [1.0, 0.89, 0.46], [1.0, 0.89, 0.56]].map(X),
      [[0.88, 1.0, 0.58], [0.88, 1.0, 0.44], [1.0, 0.99, 0.46], [1.0, 0.99, 0.56]].map(X));
  }
  // Shark-fin antenna on the roof.
  mb.prism('paint', [[-0.7, 1.46], [-1.0, 1.46], [-0.98, 1.54]], 'x', -0.025, 0.025);
}

// ---------------------------------------------------------------------------
// Rear: roof spoiler, wraparound tail lights, rear wiper, diffuser with twin
// exits, badge and plate.

function buildRear(mb) {
  const z = TAIL_Z;
  // Roof spoiler over the tailgate glass, with endplates.
  mb.prism('paint', [[ROOF_END_Z + 0.06, 1.4], [ROOF_END_Z - 0.2, 1.36], [ROOF_END_Z - 0.22, 1.33], [ROOF_END_Z + 0.04, 1.37]], 'x', -0.62, 0.62);
  mb.prismMirrorX('black', [[ROOF_END_Z + 0.04, 1.42], [ROOF_END_Z - 0.22, 1.36], [ROOF_END_Z - 0.2, 1.31], [ROOF_END_Z + 0.04, 1.36]], 0.6, 0.64);
  mb.prism('tail', [[-0.25, 1.37], [0.25, 1.37], [0.25, 1.385], [-0.25, 1.385]], 'z', ROOF_END_Z - 0.2, ROOF_END_Z - 0.18);
  for (const s of [1, -1]) {
    const S = (pts) => pts.map(([x, y]) => [x * s, y]);
    mb.prism('black', S([[0.42, 0.66], [0.84, 0.66], [0.84, 0.84], [0.42, 0.82]]), 'z', z - 0.012, z + 0.01);
    mb.prism('tail', S([[0.45, 0.7], [0.82, 0.7], [0.82, 0.8], [0.45, 0.78]]), 'z', z - 0.02, z - 0.01);
    mb.prism('reverse', S([[0.5, 0.72], [0.6, 0.72], [0.6, 0.76], [0.5, 0.76]]), 'z', z - 0.024, z - 0.018);
    mb.prismMirrorX('tail', [[z + 0.15, 0.7], [z + 0.002, 0.7], [z + 0.002, 0.8], [z + 0.15, 0.8]], 0.84, 0.855);
  }
  // Wiper on the hatch glass.
  mb.hexa('black',
    [[0.0, 1.03, HATCH_Z + 0.02], [0.02, 1.03, HATCH_Z + 0.02], [0.32, 1.22, ROOF_END_Z - 0.18], [0.3, 1.22, ROOF_END_Z - 0.18]],
    [[0.0, 1.045, HATCH_Z + 0.03], [0.02, 1.045, HATCH_Z + 0.03], [0.32, 1.235, ROOF_END_Z - 0.17], [0.3, 1.235, ROOF_END_Z - 0.17]]);
  mb.prism('chrome', [[-0.07, 0.86], [0.07, 0.86], [0.07, 0.92], [-0.07, 0.92]], 'z', z - 0.02, z - 0.01);
  mb.prism('plate', [[-0.2, 0.42], [0.2, 0.42], [0.2, 0.54], [-0.2, 0.54]], 'z', z - 0.03, z - 0.015);
  // Diffuser and bumper.
  mb.prism('black', [[-0.7, 0.14], [0.7, 0.14], [0.72, 0.3], [-0.72, 0.3]], 'z', z - 0.04, z + 0.3);
  for (const x of [-0.45, -0.25, 0.25, 0.45]) mb.prism('black', [[x - 0.01, 0.14], [x + 0.01, 0.14], [x + 0.01, 0.26], [x - 0.01, 0.26]], 'z', z - 0.08, z + 0.1);
}

function buildInterior(mb) {
  mb.prism('interior', [[0.76, COWL_Z], [0.76, -1.1], [-0.76, -1.1], [-0.76, COWL_Z]], 'y', 0.22, 0.28);
  mb.prism('interior', [[COWL_Z, 0.86], [COWL_Z - 0.2, 0.86], [COWL_Z - 0.28, 0.66], [COWL_Z, 0.58]], 'x', -0.76, 0.76);
  const seat = [[-0.06, 0.29], [-0.4, 0.29], [-0.52, 0.94], [-0.4, 0.96], [-0.3, 0.46], [-0.06, 0.44]];
  for (const x of [0.33, -0.33]) mb.prism('alcantara', seat, 'x', x - 0.16, x + 0.16);
  mb.prism('alcantara', [[-0.7, 0.29], [-0.7, 0.46], [-1.05, 0.46], [-1.05, 0.29]], 'x', -0.68, 0.68);
}

export function buildDetails(mb) {
  buildFront(mb);
  buildSides(mb);
  buildRear(mb);
  buildInterior(mb);
}

export function buildAnimatedParts(mats) {
  const cockpit = buildCockpit(mats, { seatX: 0.33, seatZ: -0.22, wheelZ: 0.18, wheelY: 0.68, seatY: 0.06 });
  const ex = buildExhausts(mats, [0.35, -0.35].map((x) => ({ x, y: 0.2, z: TAIL_Z, r: 0.045, sides: 10 })));
  const group = new Group();
  group.add(...cockpit.group.children, ...ex.group.children);
  return { group, head: cockpit.head, steering: cockpit.steering, flames: ex.flames };
}
