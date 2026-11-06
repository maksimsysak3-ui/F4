// World and assist tunables. Each car's own handling lives in src/cars/<car>/spec.js.
// Units are SI: metres, kilograms, seconds, newtons, radians.

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

export const ASSISTS = {
  tractionSlip: 0.14,      // target max slip ratio with TC on
  stabilitySlip: 1.08,     // max combined slip on a driven tire before TC trims power
  escGrip: 1.65,           // g used to cap the yaw rate the driver can ask for (just above real grip)
  escDeadband: 0.06,       // rad/s of extra yaw tolerated before ESC steps in
  escGain: 4000,           // Nm of outside-front brake per rad/s of excess yaw
  escMaxTorque: 1500,
  escSlipAngle: 0.12,      // rad of tail-out sideslip ESC tolerates
  escSlipGain: 2.5,        // ESC level per rad of sideslip beyond that
  absSlip: 0.10,
  absCapMargin: 1.0,       // brake torque cap as a fraction of what the tyre can transmit
  absSlipRear: 0.06,       // rears are held well inside the limit so they keep side grip
  alignDeadband: 0.07,     // rad of body slide before the fronts start following the direction of travel
  alignGain: 1.0,          // how fully they follow it (1 = wheels track the slide)
  yawGain: 7,              // assist: how hard the car is turned toward the requested yaw rate (1/s)
  yawTorque: 0.32,         // assist: max yaw torque as a fraction of m*g*wheelbase
  assistGrip: 1.0,         // assist: requested yaw is capped at this fraction of the ESC grip
  slideDamp: 1.6,          // assist: sideways slide decay rate (1/s)
  slideMax: 0.35,          // assist: cap on the anti-slide force (g)
  brakeBoost: 0.6,         // extra braking deceleration (g) with assists on, along the nose
  brakeYawCut: 0.45,       // handling assist asks for this much less rotation at full brake
  frontSlipCap: 1.1,       // steering limiter: front slip angle at most this x the tyre's peak
  counterBeta: 0.04,       // slip (rad) from which a counter-steer stops asking the assist for rotation
  counterRange: 0.1,       // ...fading over this much more slip
  counterFloor: 0.1,       // ...to this fraction of the requested yaw rate
  handbrakeScale: 0.45,    // handbrake torque with assists on
  handbrakeSlideCap: 0.45, // rad: past this, ESC intervenes even with the handbrake held
};

/**
 * SPORT assists (the default): the same helpers with a looser grip. Wheels can lock
 * for a moment under a stamp on the brakes mid-corner, the rears can be spun up, and
 * the stability aids saturate well past the limit, so overdriving can still end in a spin.
 */
export const SPORT = {
  ...ASSISTS,
  tractionSlip: 0.19,
  stabilitySlip: 1.3,
  escDeadband: 0.14,
  escGain: 2200,
  escMaxTorque: 900,
  escSlipAngle: 0.2,
  escSlipGain: 1.4,
  absSlip: 0.35,          // a stamp on the brakes locks the fronts for a moment (smoke, flat-spot squeal)
  absCapMargin: 1.2,
  absSlipRear: 0.22,
  yawTorque: 0.16,
  slideDamp: 0.7,
  slideMax: 0.18,
  brakeBoost: 0.45,
  frontSlipCap: 1.25,
  counterFloor: 0.3,
  handbrakeScale: 0.7,
  handbrakeSlideCap: 0.8,
};

