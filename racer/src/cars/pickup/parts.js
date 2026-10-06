import { Group } from 'three';
import { lens } from '../../car/loft.js?v=a5d31c9';
import { buildCockpit, buildExhausts } from '../../car/cockpit.js?v=a5d31c9';
import {
  loft, NOSE_Z, TAIL_Z, COWL_Z, ROOF_FRONT_Z, CAB_BACK_Z, BED_Z, BED_FLOOR, RAIL_Y, AXLE_FRONT, AXLE_REAR,
} from './body.js?v=a5d31c9';

// ---------------------------------------------------------------------------
// Front: tall chrome grille with a bar pattern, wraparound LED headlights,
// black steel bumper with fog lamps, red tow hooks and a skid plate.

function buildFront(mb) {
  const z = NOSE_Z;
  mb.prism('chrome', [[-0.56, 0.6], [0.56, 0.6], [0.56, 1.05], [-0.56, 1.05]], 'z', z + 0.002, z + 0.014);
  mb.prism('grille', [[-0.52, 0.63], [0.52, 0.63], [0.52, 1.02], [-0.52, 1.02]], 'z', z + 0.014, z + 0.02);
  for (const y of [0.7, 0.79, 0.88, 0.97]) {
    mb.prism('chrome', [[-0.52, y - 0.012], [0.52, y - 0.012], [0.52, y + 0.012], [-0.52, y + 0.012]], 'z', z + 0.02, z + 0.034);
  }
  mb.prism('chrome', [[-0.02, 0.63], [0.02, 0.63], [0.02, 1.02], [-0.02, 1.02]], 'z', z + 0.02, z + 0.036);
  // Bow-tie-ish badge: a gold bar in the middle of the grille.
  mb.prism('gold', [[-0.12, 0.81], [0.12, 0.81], [0.1, 0.87], [-0.1, 0.87]], 'z', z + 0.034, z + 0.046);
  for (const s of [1, -1]) {
    const S = (pts) => pts.map(([x, y]) => [x * s, y]);
    // Headlight cluster: black housing, projector lens, LED C-signature.
    mb.prism('black', S([[0.58, 0.82], [0.86, 0.84], [0.86, 1.04], [0.58, 1.05]]), 'z', z - 0.04, z + 0.008);
    lens(mb, 'lamp', [0.7 * s, 0.94, z + 0.01], [0, 0, 1], [0, 1, 0], 0.06, 0.06, { segments: 12, dome: 0.02, rim: 'chrome', rimWidth: 0.014 });
    mb.prism('drl', S([[0.6, 0.85], [0.84, 0.86], [0.84, 0.88], [0.6, 0.87]]), 'z', z + 0.008, z + 0.016);
    mb.prism('drl', S([[0.82, 0.86], [0.85, 0.86], [0.85, 1.02], [0.82, 1.02]]), 'z', z + 0.008, z + 0.016);
    mb.prism('amber', S([[0.6, 1.0], [0.78, 1.01], [0.78, 1.03], [0.6, 1.02]]), 'z', z + 0.008, z + 0.016);
    // Fog lamps and red tow hooks in the bumper.
    lens(mb, 'lamp', [0.62 * s, 0.42, z + 0.13], [0, 0, 1], [0, 1, 0], 0.045, 0.045, { segments: 10, dome: 0.012, rim: 'black', rimWidth: 0.012 });
    mb.prism('caliper', S([[0.36, 0.33], [0.42, 0.33], [0.42, 0.41], [0.36, 0.41]]), 'z', z + 0.1, z + 0.2);
  }
  // Steel bumper: a deep black beam wrapping round the corners, a centre step and a skid plate.
  mb.prism('black', [[-0.97, 0.3], [0.97, 0.3], [0.97, 0.56], [-0.97, 0.56]], 'z', z - 0.08, z + 0.12);
  mb.prismMirrorX('black', [[z - 0.32, 0.3], [z + 0.12, 0.3], [z + 0.12, 0.56], [z - 0.32, 0.56]], 0.9, 0.98);
  mb.prism('titanium', [[-0.3, 0.5], [0.3, 0.5], [0.3, 0.56], [-0.3, 0.56]], 'z', z + 0.06, z + 0.13);
  mb.prism('titanium', [[-0.55, 0.16], [0.55, 0.16], [0.55, 0.3], [-0.55, 0.3]], 'z', z - 0.5, z + 0.02);
  // Hood: a raised power dome with twin vents.
  mb.hexa('paint',
    [[0.36, 1.19, 2.1], [-0.36, 1.19, 2.1], [-0.4, 1.21, 0.75], [0.4, 1.21, 0.75]],
    [[0.3, 1.24, 2.05], [-0.3, 1.24, 2.05], [-0.34, 1.27, 0.78], [0.34, 1.27, 0.78]]);
  for (const s of [1, -1]) mb.quad('grille', [0.12 * s, 1.252, 1.7], [0.28 * s, 1.252, 1.7], [0.28 * s, 1.262, 1.35], [0.12 * s, 1.262, 1.35]);
}

// ---------------------------------------------------------------------------
// Sides: black fender flares, running boards, door handles, B-pillar, towing
// mirrors, roof marker lamps and a whip antenna.

function buildSides(mb) {
  for (const side of [1, -1]) {
    const X = (p) => [p[0] * side, p[1], p[2]];
    // Fender flares hug each arch.
    for (const zc of [AXLE_FRONT, AXLE_REAR]) {
      loft.ribbon(mb, 'black', [[zc + 0.66, 1.1], [zc + 0.5, 1.95], [zc + 0.25, 2.25], [zc, 2.32], [zc - 0.25, 2.25], [zc - 0.5, 1.95], [zc - 0.66, 1.1]], 0.07, 0.02, side);
    }
    // Running board between the wheels.
    mb.hexa('black',
      [[0.92, 0.28, 0.75], [1.06, 0.28, 0.75], [1.06, 0.28, -0.85], [0.92, 0.28, -0.85]].map(X),
      [[0.92, 0.33, 0.75], [1.06, 0.33, 0.75], [1.06, 0.33, -0.85], [0.92, 0.33, -0.85]].map(X));
    mb.hexa('titanium',
      [[0.95, 0.331, 0.7], [1.05, 0.331, 0.7], [1.05, 0.331, -0.8], [0.95, 0.331, -0.8]].map(X),
      [[0.95, 0.338, 0.7], [1.05, 0.338, 0.7], [1.05, 0.338, -0.8], [0.95, 0.338, -0.8]].map(X));
    // Door shut lines and handles (crew cab: two doors a side).
    for (const z of [0.5, -0.08, -0.5]) loft.ribbon(mb, 'black', [[z, 0.62], [z, 2.0], [z, 3.0]], 0.006, 0.003, side);
    for (const z of [0.15, -0.38]) loft.ribbon(mb, 'chrome', [[z, 2.55], [z - 0.12, 2.55]], 0.035, 0.014, side);
    // B-pillar trim splitting the side glass.
    loft.ribbon(mb, 'black', [[-0.08, 4.05], [-0.08, 4.95]], 0.07, 0.004, side);
    loft.ribbon(mb, 'black', [[COWL_Z - 0.02, 4.02], [ROOF_FRONT_Z, 4.03], [CAB_BACK_Z + 0.02, 4.02]], 0.02, 0.004, side);
    // Towing mirror: arm and a tall housing.
    mb.hexa('black',
      [[0.9, 1.22, 0.52], [0.9, 1.22, 0.44], [1.08, 1.24, 0.46], [1.08, 1.24, 0.52]].map(X),
      [[0.9, 1.27, 0.52], [0.9, 1.27, 0.44], [1.08, 1.29, 0.46], [1.08, 1.29, 0.52]].map(X));
    mb.hexa('black',
      [[1.05, 1.18, 0.54], [1.05, 1.18, 0.44], [1.16, 1.18, 0.45], [1.16, 1.18, 0.53]].map(X),
      [[1.05, 1.42, 0.54], [1.05, 1.42, 0.44], [1.16, 1.42, 0.45], [1.16, 1.42, 0.53]].map(X));
    mb.quad('chrome', [1.06 * side, 1.2, 0.437], [1.15 * side, 1.2, 0.442], [1.15 * side, 1.4, 0.442], [1.06 * side, 1.4, 0.437]);
    // Fuel door on the bedside.
    if (side < 0) loft.decal(mb, 'black', [[-1.05, 2.4], [-1.25, 2.4], [-1.15, 2.85]], 0.004, side, 4);
  }
  // Roof marker lamps (the five ambers of a big truck) and an antenna.
  for (const x of [-0.5, -0.25, 0, 0.25, 0.5]) mb.prism('amber', [[x - 0.04, 1.66], [x + 0.04, 1.66], [x + 0.04, 1.69], [x - 0.04, 1.69]], 'z', ROOF_FRONT_Z - 0.06, ROOF_FRONT_Z - 0.02);
  mb.prism('black', [[0.82, 1.18], [0.83, 1.18], [0.83, 1.72], [0.82, 1.72]], 'z', 0.6, 0.61);
}

// ---------------------------------------------------------------------------
// Bed: wheel tubs, rail caps, a sport bar with a light bar, tie-down hooks.

function buildBed(mb) {
  const front = BED_Z - 0.02;
  // Wheel tubs: closed boxes over the rear tyres from the bed floor up to just under the rail,
  // with a chamfered top, so the wheels can never show through the bed.
  for (const side of [1, -1]) {
    const X = (p) => [p[0] * side, p[1], p[2]];
    const zc = AXLE_REAR, x0 = 0.54, x1 = 0.89;
    mb.hexa('interior',
      [[x0, BED_FLOOR - 0.02, zc + 0.7], [x1, BED_FLOOR - 0.02, zc + 0.7], [x1, BED_FLOOR - 0.02, zc - 0.7], [x0, BED_FLOOR - 0.02, zc - 0.7]].map(X),
      [[x0, 0.98, zc + 0.7], [x1, 0.98, zc + 0.7], [x1, 0.98, zc - 0.7], [x0, 0.98, zc - 0.7]].map(X));
    mb.hexa('interior',
      [[x0, 0.98, zc + 0.7], [x1, 0.98, zc + 0.7], [x1, 0.98, zc - 0.7], [x0, 0.98, zc - 0.7]].map(X),
      [[x0 + 0.1, 1.1, zc + 0.48], [x1, 1.1, zc + 0.48], [x1, 1.1, zc - 0.48], [x0 + 0.1, 1.1, zc - 0.48]].map(X));
    // Tie-down cleats on each tub.
    mb.hexa('chrome',
      [[x0 + 0.12, 1.1, zc + 0.05], [x0 + 0.2, 1.1, zc + 0.05], [x0 + 0.2, 1.1, zc - 0.05], [x0 + 0.12, 1.1, zc - 0.05]].map(X),
      [[x0 + 0.12, 1.13, zc + 0.05], [x0 + 0.2, 1.13, zc + 0.05], [x0 + 0.2, 1.13, zc - 0.05], [x0 + 0.12, 1.13, zc - 0.05]].map(X));
  }
  for (const side of [1, -1]) {
    const X = (p) => [p[0] * side, p[1], p[2]];
    // Black rail caps.
    mb.hexa('black',
      [[0.88, RAIL_Y, front], [0.99, RAIL_Y - 0.005, front], [0.99, RAIL_Y - 0.005, TAIL_Z + 0.02], [0.88, RAIL_Y, TAIL_Z + 0.02]].map(X),
      [[0.88, RAIL_Y + 0.025, front], [0.99, RAIL_Y + 0.02, front], [0.99, RAIL_Y + 0.02, TAIL_Z + 0.02], [0.88, RAIL_Y + 0.025, TAIL_Z + 0.02]].map(X));
    // Sport bar: two hoops from the rails up behind the rear window, joined across the top.
    for (const z of [front - 0.05, front - 0.32]) {
      mb.hexa('titanium',
        [[0.8, RAIL_Y, z], [0.86, RAIL_Y, z], [0.86, RAIL_Y, z - 0.06], [0.8, RAIL_Y, z - 0.06]].map(X),
        [[0.66, 1.68, z], [0.72, 1.68, z], [0.72, 1.68, z - 0.06], [0.66, 1.68, z - 0.06]].map(X));
    }
    mb.hexa('titanium',
      [[0.66, 1.62, front - 0.05], [0.72, 1.62, front - 0.05], [0.72, 1.62, front - 0.38], [0.66, 1.62, front - 0.38]].map(X),
      [[0.66, 1.68, front - 0.05], [0.72, 1.68, front - 0.05], [0.72, 1.68, front - 0.38], [0.66, 1.68, front - 0.38]].map(X));
    // Tie-down hooks.
    for (const z of [front - 0.3, TAIL_Z + 0.3]) mb.prism('chrome', [[0.85 * side - 0.02, BED_FLOOR + 0.12], [0.85 * side + 0.02, BED_FLOOR + 0.12], [0.85 * side + 0.02, BED_FLOOR + 0.18], [0.85 * side - 0.02, BED_FLOOR + 0.18]], 'z', z - 0.03, z + 0.03);
  }
  mb.prism('titanium', [[-0.72, 1.62], [0.72, 1.62], [0.72, 1.68], [-0.72, 1.68]], 'z', front - 0.11, front - 0.05);
  // LED light bar on the sport bar.
  mb.prism('black', [[-0.55, 1.68], [0.55, 1.68], [0.55, 1.76], [-0.55, 1.76]], 'z', front - 0.12, front - 0.04);
  mb.prism('drl', [[-0.52, 1.69], [0.52, 1.69], [0.52, 1.75], [-0.52, 1.75]], 'z', front - 0.04, front - 0.035);
  // Rear window in the cab back and a sliding centre pane frame.
  mb.prism('glass', [[-0.62, 1.27], [0.62, 1.27], [0.56, 1.58], [-0.56, 1.58]], 'z', CAB_BACK_Z - 0.035, CAB_BACK_Z - 0.03);
  mb.prism('black', [[-0.02, 1.27], [0.02, 1.27], [0.02, 1.58], [-0.02, 1.58]], 'z', CAB_BACK_Z - 0.04, CAB_BACK_Z - 0.034);
  // Ribbed bed floor.
  for (let x = -0.7; x <= 0.71; x += 0.14) mb.prism('black', [[x - 0.025, BED_FLOOR], [x + 0.025, BED_FLOOR], [x + 0.025, BED_FLOOR + 0.015], [x - 0.025, BED_FLOOR + 0.015]], 'z', TAIL_Z + 0.05, front);
}

// ---------------------------------------------------------------------------
// Rear: tall tail lights, tailgate handle and lettering panel, chrome step
// bumper with a receiver hitch, mud flaps.

function buildRear(mb) {
  const z = TAIL_Z;
  const box = (key, x0, x1, y0, y1, z0, z1) => mb.prism(key, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 'z', z0, z1);
  for (const s of [1, -1]) {
    const S = (pts) => pts.map(([x, y]) => [x * s, y]);
    // Tall tail-light cluster: chrome bezel, smoked housing, LED bars, amber signal and reverse lamp.
    mb.prism('chrome', S([[0.79, 0.64], [0.965, 0.64], [0.965, 1.14], [0.79, 1.14]]), 'z', z - 0.022, z + 0.02);
    mb.prism('black', S([[0.805, 0.655], [0.95, 0.655], [0.95, 1.125], [0.805, 1.125]]), 'z', z - 0.03, z - 0.02);
    for (let k = 0; k < 4; k++) {
      const y = 0.9 + k * 0.055;
      mb.prism('tail', S([[0.815, y], [0.94, y], [0.94, y + 0.035], [0.815, y + 0.035]]), 'z', z - 0.038, z - 0.028);
    }
    mb.prism('tail', S([[0.815, 0.86], [0.83, 0.86], [0.83, 1.12], [0.815, 1.12]]), 'z', z - 0.04, z - 0.028); // LED edge
    mb.prism('reverse', S([[0.83, 0.77], [0.94, 0.77], [0.94, 0.85], [0.83, 0.85]]), 'z', z - 0.036, z - 0.028);
    mb.prism('amber', S([[0.83, 0.67], [0.94, 0.67], [0.94, 0.75], [0.83, 0.75]]), 'z', z - 0.036, z - 0.028);
    // Bumper corner steps (grippy black pads) and reflectors.
    mb.prism('black', S([[0.72, 0.555], [0.95, 0.555], [0.95, 0.585], [0.72, 0.585]]), 'z', z - 0.16, z - 0.02);
    mb.prism('tail', S([[0.9, 0.42], [0.95, 0.42], [0.95, 0.48], [0.9, 0.48]]), 'z', z - 0.15, z - 0.14);
    // Mud flaps behind the rear wheels, with a chrome badge strip.
    mb.prism('black', S([[0.7, 0.12], [0.92, 0.12], [0.92, 0.42], [0.7, 0.42]]), 'z', AXLE_REAR - 0.7, AXLE_REAR - 0.68);
    mb.prism('chrome', S([[0.73, 0.33], [0.89, 0.33], [0.89, 0.36], [0.73, 0.36]]), 'z', AXLE_REAR - 0.71, AXLE_REAR - 0.7);
  }
  // Tailgate: shut lines round the gate, a recessed centre panel with embossed ribs,
  // a black spoiler cap on top, the handle with a camera, and the brand bar.
  box('black', -0.79, 0.79, 1.135, 1.15, z - 0.012, z + 0.002); // top gap
  for (const s of [1, -1]) box('black', s * 0.785 - 0.006, s * 0.785 + 0.006, 0.6, 1.14, z - 0.012, z + 0.002);
  box('black', -0.79, 0.79, 0.6, 0.612, z - 0.012, z + 0.002); // bottom gap
  box('paint', -0.7, 0.7, 0.66, 1.08, z - 0.014, z - 0.004);
  box('paint', -0.64, 0.64, 0.7, 1.04, z - 0.002, z + 0.004); // recess (set back)
  for (const y of [0.76, 0.8]) box('black', -0.6, 0.6, y, y + 0.008, z - 0.016, z - 0.006);
  box('black', -0.82, 0.82, 1.15, 1.19, z - 0.03, z + 0.08); // tailgate cap / spoiler lip
  box('black', -0.56, 0.56, 0.93, 1.03, z - 0.02, z - 0.012); // brand bar
  box('chrome', -0.5, 0.5, 0.955, 1.005, z - 0.026, z - 0.02);
  box('chrome', -0.13, 0.13, 1.055, 1.105, z - 0.03, z - 0.012); // handle
  box('black', -0.025, 0.025, 1.06, 1.08, z - 0.034, z - 0.03); // camera
  box('tail', -0.2, 0.2, 1.62, 1.65, CAB_BACK_Z - 0.035, CAB_BACK_Z - 0.02); // centre brake light
  // Chrome step bumper with a centre step notch, licence plate with lamps, hitch receiver and pin.
  box('chrome', -0.97, 0.97, 0.36, 0.58, z - 0.14, z + 0.06);
  box('black', -0.18, 0.18, 0.5, 0.585, z - 0.15, z - 0.02);
  box('plate', -0.16, 0.16, 0.39, 0.49, z - 0.155, z - 0.14);
  for (const x of [-0.12, 0.12]) box('reverse', x - 0.02, x + 0.02, 0.495, 0.505, z - 0.152, z - 0.142);
  box('black', -0.06, 0.06, 0.24, 0.35, z - 0.3, z - 0.05);
  box('black', -0.045, 0.045, 0.255, 0.335, z - 0.31, z - 0.29);
  box('chrome', -0.075, 0.075, 0.285, 0.305, z - 0.27, z - 0.25); // hitch pin
  // Spare wheel hung under the bed and the rear diff/axle behind the bumper.
  box('black', -0.86, 0.86, 0.18, 0.36, z - 0.02, z + 0.4);
  box('tire', -0.32, 0.32, 0.2, 0.32, z + 0.1, z + 0.7);
}

function buildInterior(mb) {
  mb.prism('interior', [[0.8, COWL_Z], [0.8, CAB_BACK_Z], [-0.8, CAB_BACK_Z], [-0.8, COWL_Z]], 'y', 0.5, 0.56);
  mb.prism('interior', [[COWL_Z, 1.15], [COWL_Z - 0.2, 1.15], [COWL_Z - 0.28, 0.92], [COWL_Z, 0.85]], 'x', -0.8, 0.8);
  const seat = [[-0.06, 0.56], [-0.42, 0.56], [-0.5, 1.24], [-0.4, 1.26], [-0.32, 0.74], [-0.06, 0.72]];
  for (const x of [0.36, -0.36]) mb.prism('alcantara', seat, 'x', x - 0.17, x + 0.17);
  mb.prism('alcantara', [[-0.5, 0.56], [-0.5, 0.74], [CAB_BACK_Z + 0.02, 0.74], [CAB_BACK_Z + 0.02, 0.56]], 'x', -0.7, 0.7);
}

export function buildDetails(mb) {
  buildFront(mb);
  buildSides(mb);
  buildBed(mb);
  buildRear(mb);
  buildInterior(mb);
}

export function buildAnimatedParts(mats) {
  const cockpit = buildCockpit(mats, { seatX: 0.36, seatZ: -0.12, wheelZ: 0.28, wheelY: 0.7, seatY: 0.34 });
  // Single side-exit exhaust ahead of the right rear wheel.
  const ex = buildExhausts(mats, [{ x: -0.7, y: 0.3, z: AXLE_REAR + 0.72, r: 0.05, sides: 10 }]);
  const group = new Group();
  group.add(...cockpit.group.children, ...ex.group.children);
  return { group, head: cockpit.head, steering: cockpit.steering, flames: ex.flames };
}
