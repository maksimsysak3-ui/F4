import { PORTO_VELA } from './street/index.js?v=a5d31c9';
import { PINEWOOD } from './forest/index.js?v=a5d31c9';
import { LUMEN_CITY } from './night/index.js?v=a5d31c9';
import { VOID_RING } from './ring/index.js?v=a5d31c9';
import { ZANDVOORT } from './real/zandvoort.js?v=a5d31c9';
import { COTA } from './real/cota.js?v=a5d31c9';
import { INTERLAGOS } from './real/interlagos.js?v=a5d31c9';
import { HUNGARORING } from './real/hungaroring.js?v=a5d31c9';
import { MONACO } from './real/monaco.js?v=a5d31c9';
import { MIAMI } from './real/miami.js?v=a5d31c9';
import { CATALUNYA } from './real/catalunya.js?v=a5d31c9';
import { BAKU } from './real/baku.js?v=a5d31c9';
import { SILVERSTONE } from './real/silverstone.js?v=a5d31c9';
import { YAS } from './real/yas.js?v=a5d31c9';
import { RED_MESA } from './mesa/index.js?v=a5d31c9';
import { GLACIER_PASS } from './alpine/index.js?v=a5d31c9';

// Packs group the tracks in the menu: real circuits, the made-up ones, and the test ring.
for (const t of [PORTO_VELA, PINEWOOD, LUMEN_CITY]) t.pack = 'creative';
VOID_RING.pack = 'test';

/** Every track, in the order the track switcher cycles through them. */
export const TRACKS = [ZANDVOORT, COTA, INTERLAGOS, HUNGARORING, MONACO, MIAMI, CATALUNYA, BAKU, SILVERSTONE, YAS, PORTO_VELA, PINEWOOD, LUMEN_CITY, RED_MESA, GLACIER_PASS, VOID_RING];
export const PACKS = [
  { id: 'f1', name: 'F1 Track Pack', blurb: 'Real Grand Prix circuits, recreated corner by corner' },
  { id: 'creative', name: 'Creative Pack', blurb: 'Imagined circuits' },
  { id: 'test', name: 'Test', blurb: '' },
];
export { PORTO_VELA, PINEWOOD, LUMEN_CITY, VOID_RING, ZANDVOORT, COTA, INTERLAGOS, HUNGARORING, MONACO, MIAMI, CATALUNYA, BAKU, SILVERSTONE, YAS, RED_MESA, GLACIER_PASS };
