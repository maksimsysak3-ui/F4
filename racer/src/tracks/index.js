import { PORTO_VELA } from './street/index.js';
import { PINEWOOD } from './forest/index.js';
import { LUMEN_CITY } from './night/index.js';
import { VOID_RING } from './ring/index.js';
import { ZANDVOORT } from './real/zandvoort.js';
import { COTA } from './real/cota.js';
import { INTERLAGOS } from './real/interlagos.js';
import { HUNGARORING } from './real/hungaroring.js';
import { MONACO } from './real/monaco.js';
import { MIAMI } from './real/miami.js';
import { CATALUNYA } from './real/catalunya.js';
import { BAKU } from './real/baku.js';
import { RED_MESA } from './mesa/index.js';

// Packs group the tracks in the menu: real circuits, the made-up ones, and the test ring.
for (const t of [PORTO_VELA, PINEWOOD, LUMEN_CITY]) t.pack = 'creative';
VOID_RING.pack = 'test';

/** Every track, in the order the track switcher cycles through them. */
export const TRACKS = [ZANDVOORT, COTA, INTERLAGOS, HUNGARORING, MONACO, MIAMI, CATALUNYA, BAKU, PORTO_VELA, PINEWOOD, LUMEN_CITY, RED_MESA, VOID_RING];
export const PACKS = [
  { id: 'f1', name: 'F1 Track Pack', blurb: 'Real Grand Prix circuits, recreated corner by corner' },
  { id: 'creative', name: 'Creative Pack', blurb: 'Imagined circuits' },
  { id: 'test', name: 'Test', blurb: '' },
];
export { PORTO_VELA, PINEWOOD, LUMEN_CITY, VOID_RING, ZANDVOORT, COTA, INTERLAGOS, HUNGARORING, MONACO, MIAMI, CATALUNYA, BAKU, RED_MESA };
