import { LAMBO } from './lambo/spec.js?v=1a016bc';
import { MUSTANG } from './mustang/spec.js?v=1a016bc';
import { F1 } from './f1/spec.js?v=1a016bc';
import { PICKUP } from './pickup/spec.js?v=1a016bc';
import { HATCH } from './hatch/spec.js?v=1a016bc';
import { F26 } from './f26/spec.js?v=1a016bc';

/** Every drivable car, in the order the car switcher cycles through them. */
export const CARS = [F1, F26]; // the F1 cars only (the other specs stay for the dev tools)
export { LAMBO, MUSTANG, HATCH, F1, PICKUP };
