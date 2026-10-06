// Electric hypercar: four motors, one gear, a floor full of battery. Physics in SI units.
// Body-space convention: +X = left, +Y = up, +Z forward. Origin = centre of mass.
//
// Character: nothing else in the garage drives like it. Full torque from a standstill
// and no gearshifts at all, just an unbroken surge that fades into a power ceiling at
// speed. The battery makes it the heaviest car after the pickup but puts the weight on
// the floor, so it barely rolls. Torque split front/rear and side to side keeps it
// neutral and planted; lift off and the motors regenerate hard, so it slows like it's
// braking. Silent apart from the motor whine and the tyres.
import { createProportions } from '../../car/proportions.js';
import { loft, NOSE_Z, AXLE_FRONT, AXLE_REAR } from './body.js';
import { buildDetails, buildAnimatedParts } from './parts.js';

const PAINTS = [
  { name: 'Glacier White / blue', color: 0xeef2f4, stripe: 0x2a8aff },
  { name: 'Volt Black / lime', color: 0x141518, stripe: 0xc8ff2a },
  { name: 'Liquid Silver / teal', color: 0xb8bec6, stripe: 0x14d4c8 },
  { name: 'Electric Blue / white', color: 0x1f5ad8, stripe: 0xf2f2ee },
  { name: 'Magma Orange / black', color: 0xff5a10, stripe: 0x141518 },
  { name: 'Aurora Purple / cyan', color: 0x5a2a9a, stripe: 0x2ae4ff },
];

const S = 0.85;
const P = createProportions({
  scale: S,
  knots: [[-1.52, -1.24], [-0.58, -0.3], [0.58, 0.3], [1.52, 1.24]],
  overhangSlope: 0.75,
});
const WHEELBASE = (P.squashZ(AXLE_FRONT) - P.squashZ(AXLE_REAR)) * S; // ~1.3 m

export const EV = {
  id: 'ev',
  name: 'Volt Hypercar',
  badge: 'TINY VOLT',
  blurb: 'Four motors · one gear · instant torque, heavy and planted',
  proportions: P,
  defaults: { awd: true },
  escGrip: 1.8,
  // 760 Nm from zero: traction control holds the instant torque near the tyres' peak.
  assistTune: { sport: { tractionSlip: 0.12 }, full: { tractionSlip: 0.09 } },

  mass: 1150,
  inertia: { x: 520, y: 600, z: 260 },

  wheelbase: WHEELBASE,
  cgHeight: 0.32 * S,          // the battery floor: the lowest CG of the road cars
  cgToFront: WHEELBASE * 0.53, // => 47% front / 53% rear

  wheels: [
    { id: 'FL', x: 0.82 * S, axle: 'front' },
    { id: 'FR', x: -0.82 * S, axle: 'front' },
    { id: 'RL', x: 0.84 * S, axle: 'rear' },
    { id: 'RR', x: -0.84 * S, axle: 'rear' },
  ],
  wheelRadius: 0.35 * S,
  wheelInertia: 0.7,
  tireWidth: { front: 0.29 * S, rear: 0.33 * S },

  suspension: {
    anchorHeight: 0.2 * S,
    restLength: 0.34 * S,
    maxTravel: 0.12 * S,
    front: { spring: 34000, damperBump: 2600, damperRebound: 3600, antiRoll: 9000 },
    rear:  { spring: 34000, damperBump: 2600, damperRebound: 3600, antiRoll: 8000 },
    bumpStopRate: 260000,
  },

  tires: {
    front: { muLat: 1.82, muLong: 1.8, peakSlipAngle: 0.11, peakSlipRatio: 0.11, slide: 0.84, falloff: 1.2 },
    rear:  { muLat: 1.86, muLong: 1.84, peakSlipAngle: 0.11, peakSlipRatio: 0.11, slide: 0.84, falloff: 1.2 },
    loadSensitivity: 0.12,
    rollingResistance: 0.012,
  },

  steering: {
    maxAngle: 0.56,
    limitGrip: 1.55,
    limitSlip: 0.07,
    rate: 4.2,
    returnRate: 6,
    ackermann: 0.4,
  },

  brakes: {
    maxTorque: 2300,
    frontBias: 0.62,
    handbrakeTorque: 1800,
  },

  // Four motors summed as one: full torque to 6000 rpm, then constant power (~800 hp) to 20,000.
  engine: {
    idleRpm: 400,
    redlineRpm: 20000,
    limiterRpm: 20200,
    launchRpm: 600,
    inertia: 0.035,
    torqueCurve: [
      [0, 760], [6000, 760], [8000, 700], [10000, 590], [12000, 495],
      [15000, 400], [18000, 335], [20200, 300],
    ],
    engineBrake: 0.07,          // regenerative braking off the throttle
  },

  gearbox: {
    ratios: [-8.5, 0, 8.5],    // R, N, one forward gear
    finalDrive: 1,
    efficiency: 0.96,
    shiftTime: 0.0,
    upshiftRpm: 1e9,
    downshiftRpm: 0,
  },

  drivetrain: {
    awdFrontShare: 0.45,
    lsdFront: 30,              // torque vectoring, approximated as moderate locking
    lsdRear: 35,
    centerCoupling: 150,
  },

  aero: {
    dragArea: 0.6,
    liftArea: 1.05,
    frontBalance: 0.45,
    airDensity: 1.225,
  },

  hullPoints: [
    [0.82, 0.12, 1.66], [-0.82, 0.12, 1.66], [0.82, 0.18, -1.8], [-0.82, 0.18, -1.8],
    [0.96, 0.6, 1.05], [-0.96, 0.6, 1.05], [0.98, 0.7, -1.05], [-0.98, 0.7, -1.05],
    [0.5, 1.12, -0.05], [-0.5, 1.12, -0.05], [0.5, 1.1, -0.7], [-0.5, 1.1, -0.7], [0, 1.18, -0.4],
  ],
  hull: { stiffness: 180000, damping: 9000, friction: 0.55 },

  paints: PAINTS,

  // Motor whine: pure high harmonics rising with speed, no combustion pulses.
  audio: {
    firingPerRev: 1,
    harmonics: [[1, 'sine', 0.5], [2, 'sine', 0.3], [3.5, 'triangle', 0.12], [6, 'sine', 0.08], [0.5, 'sine', 0.2]],
    twin: [1.003, 0.3],
    brightness: 0.55,
    electric: true,
  },

  visual: {
    buildShell: (mb) => loft.buildShell(mb),
    buildDetails,
    buildAnimatedParts,
    wheelStyle: 'aero',
    materials: { caliper: 0x2a8aff, rim: 0x1b1c20 },
    headlight: [0, 0.31, NOSE_Z],
  },
};
