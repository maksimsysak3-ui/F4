// Shifter kart: 125 cc two-stroke, six-speed sequential, solid rear axle. Physics in SI units.
// Body-space convention: +X = left, +Y = up, +Z = forward. Origin = centre of mass.
//
// Character: tiny, light and instant. No real suspension (the chassis is the spring),
// a short wheelbase and a near-locked rear axle, so it turns in like a go-kart should:
// sharp, darty, a touch of push mid-corner, and a rear that steps out if you yank it.
// The engine is peaky: nothing below 9000 rpm, then a scream to 14,500.
import { createProportions } from '../../car/proportions.js';
import { buildShell, buildDetails, buildAnimatedParts, NOSE_Z } from './body.js';

const PAINTS = [
  { name: 'Racing Green', color: 0x15924a, stripe: 0xe8e8e2 },
  { name: 'Kart Red', color: 0xd4141c, stripe: 0x1b1b1f },
  { name: 'Fluo Yellow', color: 0xe8e01a, stripe: 0x1b1b1f },
  { name: 'Electric Blue', color: 0x1f6fd9, stripe: 0xf2f2ee },
  { name: 'Orange Fury', color: 0xff6a10, stripe: 0x1b1b1f },
  { name: 'Black / Chrome', color: 0x151518, stripe: 0xb8bcc4 },
];

const S = 0.85;
// No squash: a kart is already short. The map is the identity (slope 1 everywhere).
const P = createProportions({ scale: S, knots: [[-1, -1], [1, 1]], overhangSlope: 1 });
const WHEELBASE = 1.24 * S; // ~1.05 m, a real kart's

export const KART = {
  id: 'kart',
  name: 'Shifter Kart',
  badge: 'TINY KZ',
  blurb: '125 cc two-stroke · 6-speed · solid axle, pure reflexes',
  proportions: P,
  defaults: { awd: false },
  cockpit: 'kart',
  lights: false,
  escGrip: 1.8,

  mass: 175, // with the driver
  inertia: { x: 32, y: 48, z: 20 },

  wheelbase: WHEELBASE,
  cgHeight: 0.24 * S,      // the driver sits up, so it's not as low as it looks
  cgToFront: WHEELBASE * 0.57, // => 43% front / 57% rear

  wheels: [
    { id: 'FL', x: 0.66 * S, axle: 'front' },
    { id: 'FR', x: -0.66 * S, axle: 'front' },
    { id: 'RL', x: 0.74 * S, axle: 'rear' },
    { id: 'RR', x: -0.74 * S, axle: 'rear' },
  ],
  wheelRadius: 0.27 * S,
  wheelInertia: 0.22,
  tireWidth: { front: 0.17 * S, rear: 0.24 * S },

  suspension: {
    anchorHeight: 0.15 * S,
    restLength: 0.2 * S,
    maxTravel: 0.05 * S,     // only chassis flex
    front: { spring: 12000, damperBump: 800, damperRebound: 1050, antiRoll: 1800 },
    rear:  { spring: 13000, damperBump: 850, damperRebound: 1100, antiRoll: 1400 },
    bumpStopRate: 90000,
  },

  tires: {
    // Soft slicks: grippy, progressive, forgiving past the peak.
    front: { muLat: 1.78, muLong: 1.7, peakSlipAngle: 0.12, peakSlipRatio: 0.12, slide: 0.86, falloff: 1.15 },
    rear:  { muLat: 1.82, muLong: 1.76, peakSlipAngle: 0.12, peakSlipRatio: 0.12, slide: 0.85, falloff: 1.2 },
    loadSensitivity: 0.08,
    rollingResistance: 0.018,
  },

  steering: {
    maxAngle: 0.56,
    limitGrip: 1.55,
    limitSlip: 0.075,
    rate: 6.0,               // direct rack, no assistance
    returnRate: 7,
    ackermann: 0.6,
  },

  brakes: {
    maxTorque: 420,
    frontBias: 0.42,         // shifter karts have small front brakes; most of it is the rear disc
    handbrakeTorque: 320,
  },

  engine: {
    idleRpm: 2800,
    redlineRpm: 14200,
    limiterRpm: 14500,
    launchRpm: 9500,
    inertia: 0.012,
    // Peaky two-stroke: ~55 hp at 13,500 rpm from 125 cc.
    torqueCurve: [
      [2800, 9], [6000, 14], [8500, 20], [10000, 27], [11500, 30],
      [13000, 29.5], [13800, 28], [14500, 24],
    ],
    engineBrake: 0.012,
  },

  gearbox: {
    ratios: [-2.4, 0, 2.6, 2.0, 1.66, 1.43, 1.28, 1.17], // R, N, 1..6 sequential
    finalDrive: 6.4,
    efficiency: 0.93,
    shiftTime: 0.05,
    upshiftRpm: 14000,
    downshiftRpm: 10200,
  },

  drivetrain: {
    layout: 'rwd',
    awdFrontShare: 0,
    lsdFront: 0,
    lsdRear: 70,             // a solid axle, softened a touch so it still turns
    centerCoupling: 0,
  },

  aero: {
    dragArea: 0.5,           // the upright driver is most of it
    liftArea: 0.04,
    frontBalance: 0.5,
    airDensity: 1.225,
  },

  hullPoints: [
    [0.5, 0.05, 1.08], [-0.5, 0.05, 1.08], [0.62, 0.08, -1.0], [-0.62, 0.08, -1.0],
    [0.7, 0.1, 0.0], [-0.7, 0.1, 0.0], [0.42, 0.42, 0.62], [-0.42, 0.42, 0.62],
    [0, 0.95, -0.3], [0.2, 0.7, -0.35], [-0.2, 0.7, -0.35],
  ],
  hull: { stiffness: 42000, damping: 2400, friction: 0.55 },

  paints: PAINTS,

  // Single-cylinder two-stroke: one ragged pulse per rev, the classic "ring-ding" scream.
  audio: {
    firingPerRev: 1,
    harmonics: [[1, 'sawtooth', 0.6], [2, 'square', 0.35], [3, 'sawtooth', 0.22], [0.5, 'square', 0.12], [5, 'triangle', 0.08]],
    twin: [1.012, 0.25],
    brightness: 1.35,
  },

  visual: {
    buildShell,
    buildDetails,
    buildAnimatedParts,
    wheelStyle: 'kart',
    materials: { caliper: 0xd8d8d8, rim: 0xc9a64a },
    headlight: [0, 0.3, NOSE_Z],
  },
};
