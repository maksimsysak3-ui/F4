// 1967-style Grand Prix car: 3-litre V8, five-speed H-pattern, no wings. Physics in SI units.
// Body-space convention: +X = left, +Y = up, +Z = forward. Origin = centre of mass.
//
// Character: the opposite of the Mini F1. Light and powerful on skinny treaded tyres
// with no downforce at all, so it slides everywhere, gently and progressively: you steer
// it on the throttle. Soft springs let it roll and pitch, the steering is slow and heavy,
// the drum-era-feeling brakes need a long run-up, and the gearchanges take their time.
import { createProportions } from '../../car/proportions.js';
import { buildShell, buildDetails, buildAnimatedParts, NOSE_Z, AXLE_FRONT, AXLE_REAR } from './body.js';

const PAINTS = [
  { name: 'British Racing Green', color: 0x0f4a2c, stripe: 0xf2c200 },
  { name: 'Rosso Corsa', color: 0xc8101a, stripe: 0xf2f2ee },
  { name: 'French Blue', color: 0x1f4fb8, stripe: 0xf2f2ee },
  { name: 'German Silver', color: 0xc0c4c8, stripe: 0xc8101a },
  { name: 'Racing Yellow', color: 0xf2c200, stripe: 0x1b1b1f },
  { name: 'Lotus Green / yellow', color: 0x1a6a2a, stripe: 0xf2d22a },
];

const S = 0.85;
const P = createProportions({ scale: S, knots: [[-1.75, -1.55], [1.8, 1.6]], overhangSlope: 0.9 });
const WHEELBASE = (P.squashZ(AXLE_FRONT) - P.squashZ(AXLE_REAR)) * S; // ~1.9 m

export const CLASSIC = {
  id: 'classic',
  name: 'Classic GP 1967',
  badge: 'TINY GP67',
  blurb: '3.0 V8 · no wings · skinny tyres, steer it on the throttle',
  proportions: P,
  defaults: { awd: false },
  cockpit: 'f1',
  lights: false,
  escGrip: 1.3,
  // Period-correct it isn't, but SPORT still catches the worst of a power slide on these tyres.
  assistTune: { sport: { tractionSlip: 0.13, slideDamp: 1.2, slideMax: 0.28, escSlipAngle: 0.16 } },

  mass: 560,
  inertia: { x: 260, y: 330, z: 120 },

  wheelbase: WHEELBASE,
  cgHeight: 0.36 * S,
  cgToFront: WHEELBASE * 0.58, // => 42% front / 58% rear

  wheels: [
    { id: 'FL', x: 0.86 * S, axle: 'front' },
    { id: 'FR', x: -0.86 * S, axle: 'front' },
    { id: 'RL', x: 0.88 * S, axle: 'rear' },
    { id: 'RR', x: -0.88 * S, axle: 'rear' },
  ],
  wheelRadius: 0.38 * S,
  wheelInertia: 0.6,
  tireWidth: { front: 0.17 * S, rear: 0.22 * S },

  suspension: {
    anchorHeight: 0.2 * S,
    restLength: 0.36 * S,
    maxTravel: 0.14 * S,
    front: { spring: 17000, damperBump: 1200, damperRebound: 1700, antiRoll: 3500 },
    rear:  { spring: 18000, damperBump: 1300, damperRebound: 1800, antiRoll: 2400 },
    bumpStopRate: 160000,
  },

  tires: {
    // Narrow treaded crossplies: modest grip, a very soft, long breakaway.
    front: { muLat: 1.32, muLong: 1.3, peakSlipAngle: 0.13, peakSlipRatio: 0.13, slide: 0.88, falloff: 0.7 },
    rear:  { muLat: 1.42, muLong: 1.38, peakSlipAngle: 0.14, peakSlipRatio: 0.13, slide: 0.88, falloff: 0.7 },
    loadSensitivity: 0.12,
    rollingResistance: 0.015,
  },

  steering: {
    maxAngle: 0.46,
    limitGrip: 1.15,
    limitSlip: 0.07,
    rate: 3.2,               // slow, heavy rack
    returnRate: 4.5,
    ackermann: 0.3,
  },

  brakes: {
    maxTorque: 1150,
    frontBias: 0.6,
    handbrakeTorque: 600,
  },

  engine: {
    idleRpm: 2500,
    redlineRpm: 9800,
    limiterRpm: 10000,
    launchRpm: 6000,
    inertia: 0.1,
    // 3-litre V8: ~420 hp at 9,500, a crisp, linear band.
    torqueCurve: [
      [2500, 170], [4500, 240], [6000, 290], [7500, 320], [8500, 320],
      [9300, 312], [9800, 300], [10000, 285],
    ],
    engineBrake: 0.025,
  },

  gearbox: {
    ratios: [-2.8, 0, 2.6, 1.9, 1.5, 1.24, 1.06], // R, N, 1..5
    finalDrive: 3.9 * S,
    efficiency: 0.92,
    shiftTime: 0.2,           // an H-pattern: lift, clutch, shift
    upshiftRpm: 9600,
    downshiftRpm: 6000,
  },

  drivetrain: {
    layout: 'rwd',
    awdFrontShare: 0,
    lsdFront: 0,
    lsdRear: 30,             // ZF limited-slip
    centerCoupling: 0,
  },

  aero: {
    dragArea: 0.62,
    liftArea: -0.12,         // a cigar body makes a little lift at speed
    frontBalance: 0.5,
    airDensity: 1.225,
  },

  hullPoints: [
    [0.15, 0.35, 2.35], [-0.15, 0.35, 2.35], [0.2, 0.3, -2.0], [-0.2, 0.3, -2.0],
    [0.36, 0.25, 0.6], [-0.36, 0.25, 0.6], [0.36, 0.25, -1.0], [-0.36, 0.25, -1.0],
    [0, 1.05, -0.52], [0.2, 0.72, 0.0], [-0.2, 0.72, 0.0],
  ],
  hull: { stiffness: 140000, damping: 7000, friction: 0.5 },

  paints: PAINTS,

  // Flat-plane-ish racing V8 with open trumpets: a hard, rising howl.
  audio: {
    firingPerRev: 4,
    harmonics: [[0.5, 'sawtooth', 0.45], [1, 'sawtooth', 0.6], [2, 'square', 0.2], [1.5, 'sawtooth', 0.15], [3, 'triangle', 0.1]],
    twin: [1.007, 0.2],
    brightness: 1.1,
  },

  visual: {
    buildShell,
    buildDetails,
    buildAnimatedParts,
    wheelStyle: 'wire',
    materials: { caliper: 0x3a3c40 },
    headlight: [0, 0.42, NOSE_Z],
  },
};
