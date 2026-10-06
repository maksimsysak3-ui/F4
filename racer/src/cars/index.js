import { LAMBO } from './lambo/spec.js';
import { MUSTANG } from './mustang/spec.js';
import { F1 } from './f1/spec.js';
import { PICKUP } from './pickup/spec.js';
import { HATCH } from './hatch/spec.js';
import { KART } from './kart/spec.js';
import { RALLY } from './rally/spec.js';
import { EV } from './ev/spec.js';

/** Every drivable car, in the order the car switcher cycles through them. */
export const CARS = [LAMBO, MUSTANG, HATCH, F1, PICKUP, KART, RALLY, EV];
export { LAMBO, MUSTANG, HATCH, F1, PICKUP };
