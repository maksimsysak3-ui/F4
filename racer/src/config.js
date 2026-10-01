// All tunables live here so handling can be adjusted without touching the sim.
// Units are SI: metres, kilograms, seconds, newtons, radians.

import { MODEL_SCALE as S, SQUASHED_AXLE } from './proportions.js';

export const PHYSICS_HZ = 240;

export const TRACK = {
  centerRadius: 150,
  width: 22,
  thickness: 2.4,      // visual slab depth under the asphalt
  kerbWidth: 1.4,
  kerbHeight: 0.035,   // kerbs are real bumps the suspension feels
  kerbBlockLength: 2.2,
  segments: 360,
  voidY: -40,          // below this the car is lost and respawns
};

// Body-space convention: +X = left, +Y = up, +Z = forward. Origin = centre of mass.
// Model-space (the visual mesh): ground at y=0, axle midpoint at z=0.
// The car is a miniature: lengths below are design values times S (see proportions.js).
const WHEELBASE = 2 * SQUASHED_AXLE * S; // ~1.28 m: go-kart short
export const CAR = {
  mass: 900,
  // Yaw inertia on the high side for its size: calmer, better-damped rotation on a short wheelbase.
  inertia: { x: 450, y: 660, z: 250 }, // pitch, yaw, roll

  wheelbase: WHEELBASE,
  cgHeight: 0.43 * S,              // above ground at rest (low: the stubby chassis would wheelie)
  cgToFront: WHEELBASE * 0.57,     // => 43% front / 57% rear static weight (mid-engine)

  wheels: [
    // x: lateral offset (+ left), axle: 'front' | 'rear'
    { id: 'FL', x: 0.8 * S, axle: 'front' },
    { id: 'FR', x: -0.8 * S, axle: 'front' },
    { id: 'RL', x: 0.82 * S, axle: 'rear' },
    { id: 'RR', x: -0.82 * S, axle: 'rear' },
  ],
  wheelRadius: 0.35 * S,
  wheelInertia: 0.7,
  tireWidth: { front: 0.27 * S, rear: 0.33 * S },

  suspension: {
    anchorHeight: 0.22 * S,  // mount point height above the CG (body space)
    restLength: 0.36 * S,    // anchor -> wheel centre with no load
    maxTravel: 0.14 * S,     // bump stop engages beyond this compression past static
    front: { spring: 27000, damperBump: 2100, damperRebound: 3000, antiRoll: 9000 },
    rear:  { spring: 33000, damperBump: 2500, damperRebound: 3500, antiRoll: 5000 },
    bumpStopRate: 220000,
  },

  tires: {
    front: { muLat: 1.5, muLong: 1.48, peakSlipAngle: 0.13, peakSlipRatio: 0.11, slide: 0.80, falloff: 1.6 },
    rear:  { muLat: 1.6, muLong: 1.55, peakSlipAngle: 0.115, peakSlipRatio: 0.11, slide: 0.76, falloff: 1.8 },
    loadSensitivity: 0.09, // grip coefficient drop per unit of load above nominal
    rollingResistance: 0.012,
  },

  steering: {
    maxAngle: 0.58,          // ~33 deg at parking speed
    // At speed the lock is limited to what the front tires can use: the
    // geometric angle for the tightest corner the grip allows, plus peak slip.
    limitGrip: 1.35,         // g assumed for that tightest corner
    limitSlip: 0.15,         // rad of extra lock on top (≈ front peak slip angle)
    rate: 3.2,               // keyboard steer rate (fraction of lock per second)
    returnRate: 5.5,
    ackermann: 0.55,
  },

  brakes: {
    maxTorque: 2300,         // per wheel at full pedal, before bias
    frontBias: 0.75,         // far forward: the short, tall-ish mini pitches hard onto its nose
    handbrakeTorque: 2800,   // rear only
  },

  engine: {
    idleRpm: 1000,
    redlineRpm: 8500,
    limiterRpm: 8700,
    launchRpm: 3800,
    inertia: 0.22,
    // V10-ish torque curve [rpm, Nm]. Peak ~550 hp around 8000 rpm: absurd for 900 kg.
    torqueCurve: [
      [1000, 325], [2500, 425], [4000, 505], [5500, 540],
      [6500, 545], [7500, 520], [8250, 490], [8700, 455],
    ],
    engineBrake: 0.028,      // Nm per rpm with throttle closed
  },

  gearbox: {
    ratios: [-3.0, 0, 3.15, 2.30, 1.78, 1.42, 1.18, 0.99, 0.84], // R, N, 1..7
    finalDrive: 3.7 * S,     // smaller wheels spin faster: keep road speed per gear
    efficiency: 0.9,
    shiftTime: 0.14,
    upshiftRpm: 8150,
    downshiftRpm: 4300,
  },

  drivetrain: {
    awdFrontShare: 0.30,     // torque to the front axle in AWD mode
    lsdFront: 25,            // viscous locking, Nm per rad/s
    lsdRear: 40,
    centerCoupling: 90,      // strong: a front axle unloaded under launch hands torque to the rear
  },

  aero: {
    dragArea: 0.68,          // Cd * A
    liftArea: 0.7,           // downforce Cl * A
    frontBalance: 0.42,
    airDensity: 1.225,
  },

  // Points on the body that collide with the ground (for crashes / rollovers),
  // in design space (see proportions.js); converted to body space at load.
  hullPoints: [
    [0.88, 0.16, 1.66], [-0.88, 0.16, 1.66], [0.93, 0.16, -1.58], [-0.93, 0.16, -1.58],
    [0.95, 0.70, 1.0], [-0.95, 0.70, 1.0], [0.97, 0.80, -1.0], [-0.97, 0.80, -1.0],
    [0.55, 1.18, -0.05], [-0.55, 1.18, -0.05], [0.57, 1.13, -0.70], [-0.57, 1.13, -0.70],
    [0.85, 1.30, -1.45], [-0.85, 1.30, -1.45], [0, 1.24, -0.35],
  ],
  hull: { stiffness: 180000, damping: 9000, friction: 0.55 },
};

export const ASSISTS = {
  tractionSlip: 0.14,      // target max slip ratio with TC on
  stabilitySlip: 1.08,     // max combined slip on a driven tire before TC trims power
  escGrip: 1.3,            // g used to cap the yaw rate the driver can ask for
  escDeadband: 0.06,       // rad/s of extra yaw tolerated before ESC steps in
  escGain: 4000,           // Nm of outside-front brake per rad/s of excess yaw
  escMaxTorque: 1500,
  absSlip: 0.13,
};

export const PAINTS = [
  { name: 'Giallo Orion', color: 0xffc21a },
  { name: 'Verde Mantis', color: 0x6fd61f },
  { name: 'Arancio Borealis', color: 0xff6a12 },
  { name: 'Viola Pasifae', color: 0x6a2bd9 },
  { name: 'Rosso Mars', color: 0xd4141c },
  { name: 'Blu Cepheus', color: 0x1f5bff },
  { name: 'Bianco Monocerus', color: 0xeef0f2 },
  { name: 'Nero Noctis', color: 0x17171b },
];
