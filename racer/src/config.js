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
  absSlip: 0.12,
  absSlipRear: 0.06,       // rears are held well inside the limit so they keep side grip
};
