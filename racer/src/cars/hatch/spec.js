// Hot hatch: transverse 2.0 turbo four, front-wheel drive. Physics in SI units.
// Body-space convention: +X = left, +Y = up, +Z forward. Origin = centre of mass.
//
// Character: the lightest road car and the only FWD one. Nose-heavy, a tight
// front diff that pulls it out of corners, quick steering and a short wheelbase.
// Push too hard and it understeers; lift mid-corner and the light rear tucks
// the nose in. Turbo lag below 2500 rpm, then a fat flat plateau.
import { createProportions } from '../../car/proportions.js';
import { loft, NOSE_Z } from './body.js';
import { buildDetails, buildAnimatedParts } from './parts.js';

const PAINTS = [
  { name: 'Tornado Red', color: 0xc8161d, stripe: 0x111114 },
  { name: 'Pure White', color: 0xf2f2ee, stripe: 0x111114 },
  { name: 'Deep Black Pearl', color: 0x101114, stripe: 0x111114 },
  { name: 'Lapiz Blue', color: 0x1b4fb8, stripe: 0x111114 },
  { name: 'Kings Red / black roof', color: 0xa8121a, stripe: 0x111114 },
  { name: 'Lime Yellow', color: 0xc9d62a, stripe: 0x111114 },
];

const S = 0.82; // miniature scale
const P = createProportions({
  scale: S,
  knots: [[-1.85, -1.47], [-0.65, -0.27], [0.6, 0.27], [1.8, 1.47]],
  overhangSlope: 0.75,
});
const SQUASHED_AXLE = 0.87;
const WHEELBASE = 2 * SQUASHED_AXLE * S; // ~1.43 m

export const HATCH = {
  id: 'hatch',
  name: 'Hot Hatch',
  badge: 'TINY GTI',
  blurb: '2.0 turbo · FWD · darty, pulls out of corners',
  proportions: P,
  defaults: { awd: false },
  escGrip: 1.65,

  mass: 760,
  inertia: { x: 380, y: 420, z: 210 }, // short and light: rotates eagerly

  wheelbase: WHEELBASE,
  cgHeight: 0.48 * S,
  cgToFront: WHEELBASE * 0.38, // => 62% front / 38% rear (engine over the front axle)

  wheels: [
    { id: 'FL', x: 0.76 * S, axle: 'front' },
    { id: 'FR', x: -0.76 * S, axle: 'front' },
    { id: 'RL', x: 0.75 * S, axle: 'rear' },
    { id: 'RR', x: -0.75 * S, axle: 'rear' },
  ],
  wheelRadius: 0.36 * S,
  wheelInertia: 0.75,
  tireWidth: { front: 0.29 * S, rear: 0.27 * S },

  suspension: {
    anchorHeight: 0.22 * S,
    restLength: 0.36 * S,
    maxTravel: 0.15 * S,
    // Firm front, stiff rear bar: the classic hot-hatch setup that keeps the nose biting.
    front: { spring: 26000, damperBump: 1900, damperRebound: 2700, antiRoll: 5500 },
    rear:  { spring: 23000, damperBump: 1700, damperRebound: 2500, antiRoll: 7000 },
    bumpStopRate: 220000,
  },

  tires: {
    front: { muLat: 1.8, muLong: 1.78, peakSlipAngle: 0.12, peakSlipRatio: 0.11, slide: 0.84, falloff: 1.25 },
    rear:  { muLat: 1.74, muLong: 1.7, peakSlipAngle: 0.11, peakSlipRatio: 0.11, slide: 0.84, falloff: 1.25 },
    loadSensitivity: 0.1,
    rollingResistance: 0.013,
  },

  steering: {
    maxAngle: 0.64,
    limitGrip: 1.45,
    limitSlip: 0.075,
    rate: 5.0,           // quick rack
    returnRate: 6,
    ackermann: 0.45,
  },

  brakes: {
    maxTorque: 1800,
    frontBias: 0.72,
    handbrakeTorque: 2200,
  },

  engine: {
    idleRpm: 850,
    redlineRpm: 7000,
    limiterRpm: 7200,
    launchRpm: 3800,
    inertia: 0.16,       // light flywheel: revs snappily
    // Turbo four: lag below 2500, a flat 420 Nm plateau, ~330 hp at 6000.
    torqueCurve: [
      [900, 180], [1800, 260], [2500, 400], [3000, 420], [4500, 420],
      [5500, 405], [6200, 375], [7200, 310],
    ],
    engineBrake: 0.03,
  },

  gearbox: {
    ratios: [-3.0, 0, 3.4, 2.19, 1.6, 1.24, 1.0, 0.83, 0.68], // R, N, 1..7 (twin-clutch)
    finalDrive: 4.0 * S,
    efficiency: 0.9,
    shiftTime: 0.08,
    upshiftRpm: 6700,
    downshiftRpm: 3200,
  },

  drivetrain: {
    layout: 'fwd',
    awdFrontShare: 1,
    lsdFront: 34,        // tight front diff: pulls the nose to the apex on power
    lsdRear: 0,
    centerCoupling: 0,
  },

  aero: {
    dragArea: 0.7,
    liftArea: 0.35,
    frontBalance: 0.55,
    airDensity: 1.225,
  },

  hullPoints: [
    [0.8, 0.18, 1.9], [-0.8, 0.18, 1.9], [0.82, 0.22, -1.68], [-0.82, 0.22, -1.68],
    [0.88, 0.72, 1.2], [-0.88, 0.72, 1.2], [0.88, 0.76, -1.2], [-0.88, 0.76, -1.2],
    [0.62, 1.4, 0.0], [-0.62, 1.4, 0.0], [0.62, 1.4, -1.2], [-0.62, 1.4, -1.2], [0, 1.46, -0.6],
  ],
  hull: { stiffness: 170000, damping: 8500, friction: 0.55 },

  paints: PAINTS,

  // Inline four: two pulses per rev, buzzy and bright, a turbo-ish hiss on top.
  audio: {
    firingPerRev: 2,
    harmonics: [[1, 'sawtooth', 0.7], [2, 'square', 0.3], [0.5, 'sine', 0.35], [3, 'sawtooth', 0.12], [4, 'triangle', 0.08]],
    twin: [1.006, 0.18],
    brightness: 0.85,
  },

  visual: {
    buildShell: (mb) => loft.buildShell(mb),
    buildDetails,
    buildAnimatedParts,
    wheelStyle: 'ySpoke',
    materials: { caliper: 0xc8161d, stitch: 0xd8141c, rim: 0x3a3c42 },
    headlight: [0, 0.6, NOSE_Z],
  },
};
