// Pickup: full-size crew-cab truck, front-engine V8, RWD with a switchable 4x4.
// Body-space convention: +X = left, +Y = up, +Z = forward. Origin = centre of mass.
//
// Character: by far the heaviest and tallest car. Soft, long-travel suspension
// that leans and pitches, all-terrain tyres with modest tarmac grip but little
// penalty on grass and gravel, a lazy torque-rich V8 and big but slow-acting
// brakes. Understeers when pushed; the 4x4 (key 3) digs it out of loose stuff.
import { createProportions } from '../../car/proportions.js';
import { loft, NOSE_Z } from './body.js';
import { buildDetails, buildAnimatedParts } from './parts.js';

const PAINTS = [
  { name: 'Oxford White', color: 0xf1f1ee, stripe: 0x1a1a1c },
  { name: 'Agate Black', color: 0x141416, stripe: 0x2a2a2e },
  { name: 'Rapid Red', color: 0x9a1418, stripe: 0x1a1a1c },
  { name: 'Velocity Blue', color: 0x1f4f9a, stripe: 0x1a1a1c },
  { name: 'Army Green', color: 0x4a5236, stripe: 0x1a1a1c },
  { name: 'Desert Sand', color: 0xc8b48a, stripe: 0x1a1a1c },
];

const S = 0.9; // miniature scale
// Arches (axle ± 0.62) keep slope 1; the crew cab is crushed; the bed keeps its length.
const P = createProportions({
  scale: S,
  knots: [[-2.2, -1.67], [-0.95, -0.42], [0.85, 0.42], [2.1, 1.67]],
  overhangSlope: 0.75,
});
const SQUASHED_AXLE = 1.02;
const WHEELBASE = 2 * SQUASHED_AXLE * S; // ~1.84 m

export const PICKUP = {
  id: 'pickup',
  name: 'Pickup Truck',
  badge: 'TINY TRUCK',
  blurb: 'V8 · RWD / 4x4 · soft, heavy, unstoppable off-road',
  proportions: P,
  defaults: { awd: false },
  escGrip: 1.4,
  rollCentre: 0.4, // lets the body lean a little more than the road cars

  mass: 1500,
  inertia: { x: 1050, y: 1350, z: 560 },

  wheelbase: WHEELBASE,
  cgHeight: 0.66 * S,
  cgToFront: WHEELBASE * 0.45, // => 55% front / 45% rear (big V8 up front, empty bed)

  wheels: [
    { id: 'FL', x: 0.83 * S, axle: 'front' },
    { id: 'FR', x: -0.83 * S, axle: 'front' },
    { id: 'RL', x: 0.83 * S, axle: 'rear' },
    { id: 'RR', x: -0.83 * S, axle: 'rear' },
  ],
  wheelRadius: 0.47 * S,
  wheelInertia: 1.6,
  tireWidth: { front: 0.36 * S, rear: 0.36 * S },

  suspension: {
    anchorHeight: 0.3 * S,
    restLength: 0.5 * S,
    maxTravel: 0.26 * S,
    // Long-travel and soft, damped for comfort: it leans, squats and dives.
    front: { spring: 30000, damperBump: 2700, damperRebound: 3800, antiRoll: 10000 },
    rear:  { spring: 28000, damperBump: 2500, damperRebound: 3600, antiRoll: 3500 },
    bumpStopRate: 320000,
  },

  tires: {
    // All-terrain tread: soft blocks give big slip angles and a gentle breakaway.
    front: { muLat: 1.45, muLong: 1.48, peakSlipAngle: 0.19, peakSlipRatio: 0.15, slide: 0.86, falloff: 1.0 },
    rear:  { muLat: 1.5, muLong: 1.5, peakSlipAngle: 0.18, peakSlipRatio: 0.15, slide: 0.86, falloff: 1.0 },
    loadSensitivity: 0.12,
    rollingResistance: 0.02,
    offroad: 0.6, // keeps most of its grip on grass and gravel
  },

  steering: {
    maxAngle: 0.6,
    limitGrip: 1.05,
    limitSlip: 0.1,
    rate: 3.2,
    returnRate: 4.5,
    ackermann: 0.4,
  },

  brakes: {
    maxTorque: 2900,
    frontBias: 0.68,
    handbrakeTorque: 3400,
  },

  engine: {
    idleRpm: 650,
    redlineRpm: 6000,
    limiterRpm: 6250,
    launchRpm: 2200,
    inertia: 0.42,
    // 5.0 V8 tuned for torque: ~390 hp at 5500 rpm, most of the pull down low.
    torqueCurve: [
      [700, 430], [1500, 540], [2500, 590], [3500, 600],
      [4500, 570], [5500, 505], [6250, 440],
    ],
    engineBrake: 0.05,
  },

  gearbox: {
    ratios: [-3.2, 0, 4.17, 2.34, 1.52, 1.14, 0.87, 0.69], // R, N, 1..6 (auto)
    finalDrive: 3.9 * S,
    efficiency: 0.86,
    shiftTime: 0.3,
    upshiftRpm: 5600,
    downshiftRpm: 2400,
  },

  drivetrain: {
    toggle4x4: true,
    awdFrontShare: 0.45,
    lsdFront: 10,
    lsdRear: 45,         // rear locker-ish diff
    centerCoupling: 260, // part-time transfer case: front and rear locked together
  },

  aero: {
    dragArea: 1.3,       // a brick with an open bed
    liftArea: 0.05,
    frontBalance: 0.5,
    airDensity: 1.225,
  },

  hullPoints: [
    [0.92, 0.36, 2.3], [-0.92, 0.36, 2.3], [0.92, 0.38, -2.4], [-0.92, 0.38, -2.4],
    [0.98, 1.1, 1.8], [-0.98, 1.1, 1.8], [0.98, 1.12, -2.2], [-0.98, 1.12, -2.2],
    [0.76, 1.64, 0.05], [-0.76, 1.64, 0.05], [0.76, 1.64, -0.5], [-0.76, 1.64, -0.5], [0, 1.68, -0.2],
    [0.98, 1.0, 0.0], [-0.98, 1.0, 0.0],
  ],
  hull: { stiffness: 220000, damping: 11000, friction: 0.6 },

  paints: PAINTS,

  // Cross-plane V8 with a deep, muffled note.
  audio: {
    firingPerRev: 4,
    harmonics: [[0.5, 'sawtooth', 0.95], [1, 'square', 0.28], [2, 'sawtooth', 0.06], [0.25, 'sine', 0.55], [1.5, 'triangle', 0.08]],
    twin: [1.01, 0.32],
    brightness: 0.38,
  },

  visual: {
    buildShell: (mb) => loft.buildShell(mb),
    buildDetails,
    buildAnimatedParts,
    wheelStyle: 'offroad',
    materials: { caliper: 0xc8242b, stitch: 0x8a8a8a, rim: 0x2a2b2f },
    headlight: [0, 0.94, NOSE_Z],
  },
};
