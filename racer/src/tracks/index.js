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
import { SILVERSTONE } from './real/silverstone.js';
import { YAS } from './real/yas.js';
import { SPA } from './real/spa.js';
import { SUZUKA } from './real/suzuka.js';
import { JEDDAH } from './real/jeddah.js';
import { MEXICO } from './real/mexico.js';
import { RED_MESA } from './mesa/index.js';
import { GLACIER_PASS } from './alpine/index.js';

// Packs group the tracks in the menu: the real circuits and the test ring. (The imagined circuits
// are kept in the code but no longer offered.)
for (const t of [PORTO_VELA, PINEWOOD, LUMEN_CITY]) t.pack = 'creative';
VOID_RING.pack = 'test';

/** Every track, in the order the track switcher cycles through them. */
export const TRACKS = [ZANDVOORT, COTA, INTERLAGOS, HUNGARORING, MONACO, MIAMI, CATALUNYA, BAKU, SILVERSTONE, YAS, SPA, SUZUKA, JEDDAH, MEXICO, VOID_RING];
export const PACKS = [
  { id: 'f1', name: 'F1 Track Pack', blurb: 'Real Grand Prix circuits, recreated corner by corner' },
  { id: 'test', name: 'Test', blurb: '' },
];
export { PORTO_VELA, PINEWOOD, LUMEN_CITY, VOID_RING, ZANDVOORT, COTA, INTERLAGOS, HUNGARORING, MONACO, MIAMI, CATALUNYA, BAKU, SILVERSTONE, YAS, SPA, SUZUKA, JEDDAH, MEXICO, RED_MESA, GLACIER_PASS };
