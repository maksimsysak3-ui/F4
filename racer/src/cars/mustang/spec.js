// Mustang: front-engine RWD big-block V8 muscle car. Physics in SI units.
// Body-space convention: +X = left, +Y = up, +Z = forward. Origin = centre of mass.
//
// Character vs the Lambo: heavier, nose-heavy, soft and rolly, less grip but a
// gentle, progressive breakaway; huge low-rev torque that lights up the rears;
// slow clunky shifts; weaker brakes; slower steering. Big lazy power slides.
import { createProportions } from '../../car/proportions.js?v=a5d31c9';
import { loft, NOSE_Z } from './body.js?v=a5d31c9';
import { buildDetails, buildAnimatedParts } from './parts.js?v=a5d31c9';

const PAINTS = [
  { name: 'Grabber Blue / white stripes', color: 0x1e6fd9, stripe: 0xf2f2ee },
  { name: 'Candy Apple Red / white stripes', color: 0xb3121c, stripe: 0xf2f2ee },
  { name: 'Wimbledon White / blue stripes', color: 0xeeeeea, stripe: 0x1c3f94 },
  { name: 'Highland Green (no stripes)', color: 0x1f3a2b, stripe: 0x1f3a2b },
  { name: 'Twister Orange / black stripes', color: 0xff6a12, stripe: 0x111114 },
  { name: 'Raven Black / gold stripes', color: 0x111114, stripe: 0xc9a64a },
  { name: 'Gulfstream Aqua / white stripes', color: 0x3fa7a5, stripe: 0xf2f2ee },
];

const S = 0.85; // miniature scale
// Arches (axle ± 0.47) keep slope 1; the cabin is crushed to half; long overhangs at 0.75.
const P = createProportions({
  scale: S,
  knots: [[-1.52, -1.23], [-0.58, -0.29], [0.58, 0.29], [1.52, 1.23]],
  overhangSlope: 0.75,
});
const SQUASHED_AXLE = 0.76;
const WHEELBASE = 2 * SQUASHED_AXLE * S; // ~1.29 m

export const MUSTANG = {
  id: 'mustang',
  name: 'Mustang Fastback',
  badge: 'TINY PONY',
  blurb: 'Big-block V8 · RWD · lazy power slides',
  proportions: P,
  defaults: { awd: false },
  escGrip: 1.7, // lower grip than the Lambo, so stability control expects less

  mass: 1000,
  inertia: { x: 560, y: 590, z: 300 }, // long and heavy: a touch lazier rotation than the Lambo

  wheelbase: WHEELBASE,
  cgHeight: 0.47 * S,            // tall-ish: more roll and squat
  cgToFront: WHEELBASE * 0.46,   // => 54% front / 46% rear (V8 up front)

  wheels: [
    { id: 'FL', x: 0.8 * S, axle: 'front' },
    { id: 'FR', x: -0.8 * S, axle: 'front' },
    { id: 'RL', x: 0.81 * S, axle: 'rear' },
    { id: 'RR', x: -0.81 * S, axle: 'rear' },
  ],
  wheelRadius: 0.35 * S,
  wheelInertia: 0.85,
  tireWidth: { front: 0.27 * S, rear: 0.31 * S },

  suspension: {
    anchorHeight: 0.22 * S,
    restLength: 0.38 * S,
    maxTravel: 0.17 * S,
    // Soft and floaty, with a fat front bar: pushes on turn-in, rotates on power.
    front: { spring: 24000, damperBump: 1800, damperRebound: 2600, antiRoll: 8000 },
    rear:  { spring: 21000, damperBump: 1700, damperRebound: 2500, antiRoll: 2500 },
    bumpStopRate: 220000,
  },

  tires: {
    // Less grip, larger peak slip angles (soft sidewalls), and a slow, gentle falloff.
    front: { muLat: 1.68, muLong: 1.65, peakSlipAngle: 0.16, peakSlipRatio: 0.13, slide: 0.84, falloff: 1.1 },
    rear:  { muLat: 1.74, muLong: 1.7, peakSlipAngle: 0.15, peakSlipRatio: 0.13, slide: 0.84, falloff: 1.1 },
    loadSensitivity: 0.1,
    rollingResistance: 0.014,
  },

  steering: {
    maxAngle: 0.62,
    limitGrip: 1.2,
    limitSlip: 0.09,
    rate: 3.8,           // slower rack than the Lambo
    returnRate: 5,
    ackermann: 0.4,
  },

  brakes: {
    maxTorque: 1900,
    frontBias: 0.7,
    handbrakeTorque: 2600,
  },

  engine: {
    idleRpm: 750,
    redlineRpm: 6600,
    limiterRpm: 6900,
    launchRpm: 2800,
    inertia: 0.34,       // heavy flywheel: slow to rev, rumbles
    // Big-block torque: fat and flat from just off idle. ~460 hp at 5500 rpm.
    torqueCurve: [
      [800, 430], [2000, 570], [3000, 620], [4000, 635],
      [5000, 615], [5800, 575], [6500, 510], [6900, 470],
    ],
    engineBrake: 0.04,
  },

  gearbox: {
    ratios: [-2.9, 0, 2.66, 1.78, 1.3, 1.0, 0.8, 0.63], // R, N, 1..6
    finalDrive: 3.55 * S,
    efficiency: 0.88,
    shiftTime: 0.24,     // clunky manual-style shifts
    upshiftRpm: 6300,
    downshiftRpm: 2900,
  },

  drivetrain: {
    awdFrontShare: 0.3,
    lsdFront: 20,
    lsdRear: 22,         // loose diff: lets the inside rear spin up
    centerCoupling: 60,
  },

  aero: {
    dragArea: 0.86,      // brick-shaped
    liftArea: 0.3,      // essentially no downforce
    frontBalance: 0.5,
    airDensity: 1.225,
  },

  hullPoints: [
    [0.86, 0.18, 1.84], [-0.86, 0.18, 1.84], [0.88, 0.2, -1.74], [-0.88, 0.2, -1.74],
    [0.93, 0.75, 1.0], [-0.93, 0.75, 1.0], [0.95, 0.82, -1.0], [-0.95, 0.82, -1.0],
    [0.54, 1.16, -0.3], [-0.54, 1.16, -0.3], [0.56, 1.12, -0.62], [-0.56, 1.12, -0.62],
    [0.6, 0.9, -1.5], [-0.6, 0.9, -1.5], [0, 1.2, -0.45],
  ],
  hull: { stiffness: 180000, damping: 9000, friction: 0.55 },

  paints: PAINTS,

  // Cross-plane V8: 4 pulses per rev with a strong half-order lope.
  audio: {
    firingPerRev: 4,
    harmonics: [[0.5, 'sawtooth', 0.85], [1, 'square', 0.35], [2, 'sawtooth', 0.1], [0.25, 'sine', 0.45], [1.5, 'triangle', 0.12]],
    twin: [1.013, 0.3],
    brightness: 0.55,
  },

  visual: {
    buildShell: (mb) => loft.buildShell(mb),
    buildDetails,
    buildAnimatedParts,
    wheelStyle: 'torq',
    materials: { caliper: 0x9a1b1b, stitch: 0xd8c39a },
    headlight: [0, 0.5, NOSE_Z],
  },
};
