// Rally car: Group A four-door, 2.0 turbo with anti-lag, permanent four-wheel drive. Physics in SI units.
// Body-space convention: +X = left, +Y = up, +Z forward. Origin = centre of mass.
//
// Character: the only car at home off the tarmac. Long soft travel soaks up kerbs and
// bumps, gravel tyres slide early but progressively, and keep most of their grip on
// grass and gravel. Tight diffs and a 45/55 split: it rotates on the throttle, holds a
// drift, and power pulls it straight. Short gearing and a sequential box: brutal
// acceleration, modest top speed.
import { createProportions } from '../../car/proportions.js?v=a5d31c9';
import { loft, NOSE_Z, AXLE_FRONT, AXLE_REAR } from './body.js?v=a5d31c9';
import { buildDetails, buildAnimatedParts } from './parts.js?v=a5d31c9';

const PAINTS = [
  { name: 'Works Blue / gold', color: 0x1f3fa8, stripe: 0xf2c200 },
  { name: 'Martini White', color: 0xf2f2ee, stripe: 0xd8202a },
  { name: 'Castrol Green', color: 0x1f7a3a, stripe: 0xd8202a },
  { name: 'Marlboro Red', color: 0xd8202a, stripe: 0xf2f2ee },
  { name: 'Safari Yellow', color: 0xf2c200, stripe: 0x1b1b1f },
  { name: 'Gravel Black', color: 0x18191c, stripe: 0xff6a10 },
];

const S = 0.82;
const P = createProportions({
  scale: S,
  knots: [[-1.8, -1.42], [-0.65, -0.27], [0.65, 0.27], [1.8, 1.42]],
  overhangSlope: 0.75,
});
const WHEELBASE = (P.squashZ(AXLE_FRONT) - P.squashZ(AXLE_REAR)) * S; // ~1.5 m

export const RALLY = {
  id: 'rally',
  name: 'Rally Car',
  badge: 'TINY WRC',
  blurb: '1.6 turbo hatch · anti-lag · AWD · long travel, at home on gravel',
  proportions: P,
  defaults: { awd: true },
  escGrip: 1.55,

  mass: 820,
  inertia: { x: 420, y: 470, z: 230 },

  wheelbase: WHEELBASE,
  cgHeight: 0.52 * S,
  cgToFront: WHEELBASE * 0.46, // => 54% front / 46% rear

  wheels: [
    { id: 'FL', x: 0.82 * S, axle: 'front' },
    { id: 'FR', x: -0.82 * S, axle: 'front' },
    { id: 'RL', x: 0.82 * S, axle: 'rear' },
    { id: 'RR', x: -0.82 * S, axle: 'rear' },
  ],
  wheelRadius: 0.385 * S,
  wheelInertia: 0.8,
  tireWidth: { front: 0.27 * S, rear: 0.27 * S },

  suspension: {
    anchorHeight: 0.26 * S,
    restLength: 0.46 * S,
    maxTravel: 0.24 * S,      // long-travel gravel dampers
    front: { spring: 21000, damperBump: 1800, damperRebound: 2600, antiRoll: 4200 },
    rear:  { spring: 20000, damperBump: 1700, damperRebound: 2500, antiRoll: 3600 },
    bumpStopRate: 200000,
  },

  tires: {
    // Gravel-pattern tread: lower peak, early, very progressive breakaway, little loss off the road.
    front: { muLat: 1.62, muLong: 1.66, peakSlipAngle: 0.15, peakSlipRatio: 0.14, slide: 0.9, falloff: 0.8 },
    rear:  { muLat: 1.6, muLong: 1.66, peakSlipAngle: 0.15, peakSlipRatio: 0.14, slide: 0.9, falloff: 0.8 },
    loadSensitivity: 0.1,
    rollingResistance: 0.016,
    offroad: 0.8,
  },

  steering: {
    maxAngle: 0.62,
    limitGrip: 1.4,
    limitSlip: 0.09,
    rate: 4.4,
    returnRate: 6,
    ackermann: 0.4,
  },

  brakes: {
    maxTorque: 1900,
    frontBias: 0.6,
    handbrakeTorque: 3200,    // the hydraulic fly-off handbrake for hairpins
  },

  engine: {
    idleRpm: 1200,
    redlineRpm: 7600,
    limiterRpm: 7800,
    launchRpm: 5000,
    inertia: 0.13,
    // Anti-lag keeps the turbo spooled: a flat wall of torque from 3000, ~380 hp.
    torqueCurve: [
      [1200, 260], [2200, 420], [3000, 520], [4500, 540], [5500, 520],
      [6500, 455], [7200, 390], [7800, 330],
    ],
    engineBrake: 0.035,
  },

  gearbox: {
    ratios: [-3.0, 0, 3.0, 2.15, 1.65, 1.32, 1.08, 0.92], // R, N, 1..6 sequential
    finalDrive: 4.4 * S,       // short: acceleration over top speed
    efficiency: 0.88,
    shiftTime: 0.06,
    upshiftRpm: 7400,
    downshiftRpm: 4200,
  },

  drivetrain: {
    awdFrontShare: 0.45,
    lsdFront: 45,              // tight plated diffs both ends
    lsdRear: 60,
    centerCoupling: 120,
  },

  aero: {
    dragArea: 0.82,
    liftArea: 0.5,             // the big wing does a little
    frontBalance: 0.45,
    airDensity: 1.225,
  },

  hullPoints: [
    [0.84, 0.16, 1.95], [-0.84, 0.16, 1.95], [0.86, 0.22, -1.72], [-0.86, 0.22, -1.72],
    [0.98, 0.7, 1.2], [-0.98, 0.7, 1.2], [0.98, 0.74, -1.2], [-0.98, 0.74, -1.2],
    [0.62, 1.38, 0.0], [-0.62, 1.38, 0.0], [0.62, 1.36, -1.2], [-0.62, 1.36, -1.2], [0, 1.62, -1.6],
  ],
  hull: { stiffness: 170000, damping: 8500, friction: 0.55 },

  paints: PAINTS,

  // Turbo four with anti-lag: a hard bark, crackles and pops on the overrun.
  audio: {
    firingPerRev: 2,
    harmonics: [[1, 'sawtooth', 0.7], [2, 'square', 0.35], [0.5, 'sawtooth', 0.4], [3, 'square', 0.15], [5, 'triangle', 0.08]],
    twin: [1.01, 0.22],
    brightness: 0.95,
  },

  visual: {
    buildShell: (mb) => loft.buildShell(mb),
    buildDetails,
    buildAnimatedParts,
    wheelStyle: 'rally',
    materials: { caliper: 0xd8202a, rim: 0xf2f2ee },
    headlight: [0, 0.6, NOSE_Z],
  },
};
