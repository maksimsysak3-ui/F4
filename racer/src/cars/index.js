import { LAMBO } from './lambo/spec.js?v=a5d31c9';
import { MUSTANG } from './mustang/spec.js?v=a5d31c9';
import { F1 } from './f1/spec.js?v=a5d31c9';
import { PICKUP } from './pickup/spec.js?v=a5d31c9';
import { HATCH } from './hatch/spec.js?v=a5d31c9';
import { KART } from './kart/spec.js?v=a5d31c9';
import { RALLY } from './rally/spec.js?v=a5d31c9';
import { EV } from './ev/spec.js?v=a5d31c9';
import { F26 } from './f26/spec.js?v=a5d31c9';

/** Every drivable car, in the order the car switcher cycles through them. */
export const CARS = [LAMBO, MUSTANG, HATCH, F1, F26, PICKUP, KART, RALLY, EV];
export { LAMBO, MUSTANG, HATCH, F1, PICKUP };
