// Mini F1: open-wheel, rear-wheel drive hybrid V6. Physics in SI units.
// Body-space convention: +X = left, +Y = up, +Z = forward. Origin = centre of mass.
//
// Character vs the others: very light, longer wheelbase, rock-hard suspension,
// sharp grippy slicks that let go quickly past the peak, and huge downforce, so
// it's twitchy at low speed and glued down fast. Seamless shifts, screaming revs,
// carbon brakes that stop it in nothing.
import { createProportions } from '../../car/proportions.js?v=a5d31c9';
import { buildShell, buildDetails, buildAnimatedParts, NOSE_Z } from './body.js?v=a5d31c9';

const PAINTS = [
  { name: 'Papaya / Blue', color: 0xff7a12, stripe: 0x1f6fd9 },
  { name: 'Scarlet / White', color: 0xd4141c, stripe: 0xf2f2ee },
  { name: 'Petronas Teal', color: 0x1b1d20, stripe: 0x14c3b0 },
  { name: 'Racing Navy / Red', color: 0x1b2a6a, stripe: 0xe0003a },
  { name: 'Racing Green / Lime', color: 0x0f4a2c, stripe: 0xc8ff2a },
  { name: 'Alpine Pink', color: 0xf2f2f6, stripe: 0xff4fa0 },
  { name: 'Matte Carbon / Gold', color: 0x232428, stripe: 0xd8b04a },
];

const S = 0.85;
// Arch zones (axle +-0.5) keep slope 1 so the big wheels stay round; the middle is crushed.
const P = createProportions({
  scale: S,
  knots: [[-2.2, -1.42], [-1.2, -0.42], [1.2, 0.42], [2.2, 1.42]],
  overhangSlope: 0.8,
});
const WHEELBASE = (P.squashZ(1.66) - P.squashZ(-1.66)) * S; // a little shorter than the Mini F1

export const F26 = {
  id: 'f26',
  name: 'F1 2026',
  badge: 'TINY F1 26',
  blurb: 'New rules · active aero X/Z-mode · 50/50 hybrid, lighter and narrower',
  proportions: P,
  defaults: { awd: false },
  cockpit: 'f1',
  // 650 hp on slicks that peak at 10% slip: traction control has to hold it near the peak, and the
  // stability aids work a little harder than on the road cars (SPORT still lets an overdriven car go).
  assistTune: {
    sport: { tractionSlip: 0.11, stabilitySlip: 1.08, slideDamp: 1.7, slideMax: 0.34, yawTorque: 0.18, escSlipAngle: 0.11, escDeadband: 0.08, escGain: 3600, escMaxTorque: 1400 },
    full: { tractionSlip: 0.1 },
  },
  lights: false,
  escGrip: 1.75,           // mechanical grip at low speed...
  escGripAero: 0.0005,     // less downforce than the Mini F1: ~2.2 g at 110 km/h
  escGripMax: 2.7,

  mass: 600,              // lighter and smaller than the old cars
  inertia: { x: 330, y: 380, z: 150 },

  wheelbase: WHEELBASE,
  cgHeight: 0.27 * S,
  cgToFront: WHEELBASE * 0.55,     // => 45% front / 55% rear

  wheels: [
    { id: 'FL', x: 0.9 * S, axle: 'front' },
    { id: 'FR', x: -0.9 * S, axle: 'front' },
    { id: 'RL', x: 0.88 * S, axle: 'rear' },
    { id: 'RR', x: -0.88 * S, axle: 'rear' },
  ],
  wheelRadius: 0.36 * S,
  wheelInertia: 0.55,
  tireWidth: { front: 0.28 * S, rear: 0.37 * S }, // narrower tyres

  suspension: {
    anchorHeight: 0.18 * S,
    restLength: 0.3 * S,
    maxTravel: 0.08 * S,     // barely moves
    front: { spring: 46000, damperBump: 3200, damperRebound: 4200, antiRoll: 13000 },
    rear:  { spring: 50000, damperBump: 3400, damperRebound: 4600, antiRoll: 6500 },
    bumpStopRate: 300000,
  },

  tires: {
    // Slicks: lots of grip, a sharp peak and a quicker fall-off past it.
    front: { muLat: 1.95, muLong: 1.92, peakSlipAngle: 0.1, peakSlipRatio: 0.1, slide: 0.82, falloff: 1.5 },
    rear:  { muLat: 2.16, muLong: 2.05, peakSlipAngle: 0.11, peakSlipRatio: 0.1, slide: 0.84, falloff: 1.45 },
    loadSensitivity: 0.11,
    rollingResistance: 0.014,
  },

  steering: {
    maxAngle: 0.42,
    limitGrip: 1.55,         // low-speed grip (no downforce yet): full lock lands on the peak
    limitSlip: 0.055,
    rate: 3.6,               // a weighty, precise rack: no darting on turn-in
    returnRate: 5,
    ackermann: 0.35,
  },

  brakes: {
    maxTorque: 2500,         // carbon-carbon
    frontBias: 0.6,          // aero load keeps the rear planted under braking
    handbrakeTorque: 1400,
  },

  engine: {
    idleRpm: 3800,
    redlineRpm: 12000,
    limiterRpm: 12300,
    launchRpm: 7500,
    inertia: 0.09,
    // Hybrid V6 with electric fill: strong everywhere, peaks high. ~650 hp in a 640 kg car.
    // Half the power is electric now: a big flat shove from low revs, then the battery "clips" at the top.
    torqueCurve: [
      [3800, 380], [6000, 445], [8000, 455], [9500, 450],
      [10500, 430], [11300, 395], [12000, 345], [12300, 320],
    ],
    engineBrake: 0.02,
  },

  gearbox: {
    ratios: [-3.0, 0, 3.25, 2.5, 2.02, 1.7, 1.46, 1.28, 1.13, 1.0], // R, N, 1..8
    finalDrive: 4.25 * S,
    efficiency: 0.94,
    shiftTime: 0.04,         // seamless
    upshiftRpm: 11800,
    downshiftRpm: 8200,
  },

  drivetrain: {
    awdFrontShare: 0,
    lsdFront: 0,
    lsdRear: 22,         // open enough that a full-throttle exit doesn't push the tail round
    centerCoupling: 0,
  },

  aero: {
    dragArea: 0.92,
    liftArea: 2.7,           // Z-mode: about 20% less downforce than the Mini F1
    frontBalance: 0.43,
    airDensity: 1.225,
    // X-mode on the straights: the flaps lie flat for ~40% less drag and half the downforce.
    active: { drag: 0.6, lift: 0.5, minSpeed: 28 },
  },

  hullPoints: [
    // Front wing tips and floor edges sit a little above the bodywork so kerbs do not lever the car up.
    [1.0, 0.17, 2.78], [-1.0, 0.17, 2.78], [0.8, 0.14, -2.0], [-0.8, 0.14, -2.0],
    [0.68, 0.5, 0.35], [-0.68, 0.5, 0.35], [0.52, 1.05, -2.36], [-0.52, 1.05, -2.36],
    [0, 0.94, -0.4], [0.28, 0.88, 0.2], [-0.28, 0.88, 0.2], [0, 0.66, 1.0],
  ],
  hull: { stiffness: 150000, damping: 8000, friction: 0.5 },

  paints: PAINTS,

  // Hybrid V6: 3 pulses per revolution at 12,000 rpm, a hard, buzzy wail.
  audio: {
    firingPerRev: 3,
    harmonics: [[0.5, 'sawtooth', 0.35], [1, 'sawtooth', 0.5], [2, 'square', 0.18], [3, 'sawtooth', 0.1], [4, 'triangle', 0.08]],
    twin: [1.004, 0.18],
    brightness: 1.25,
  },

  visual: {
    buildShell,
    buildDetails,
    buildAnimatedParts,
    wheelStyle: 'aero',
    materials: { caliper: 0x1b1b1f },
    headlight: [0, 0.4, NOSE_Z],
  },
};
