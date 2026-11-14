import { PORTO_VELA } from './street/index.js?v=1a016bc';
import { PINEWOOD } from './forest/index.js?v=1a016bc';
import { LUMEN_CITY } from './night/index.js?v=1a016bc';
import { VOID_RING } from './ring/index.js?v=1a016bc';
import { ZANDVOORT } from './real/zandvoort.js?v=1a016bc';
import { COTA } from './real/cota.js?v=1a016bc';
import { INTERLAGOS } from './real/interlagos.js?v=1a016bc';
import { HUNGARORING } from './real/hungaroring.js?v=1a016bc';
import { MONACO } from './real/monaco.js?v=1a016bc';
import { MIAMI } from './real/miami.js?v=1a016bc';
import { CATALUNYA } from './real/catalunya.js?v=1a016bc';
import { BAKU } from './real/baku.js?v=1a016bc';
import { SILVERSTONE } from './real/silverstone.js?v=1a016bc';
import { YAS } from './real/yas.js?v=1a016bc';
import { SPA } from './real/spa.js?v=1a016bc';
import { SUZUKA } from './real/suzuka.js?v=1a016bc';
import { JEDDAH } from './real/jeddah.js?v=1a016bc';
import { MEXICO } from './real/mexico.js?v=1a016bc';
import { AUSTRIA } from './real/austria.js?v=1a016bc';
import { CANADA } from './real/canada.js?v=1a016bc';
import { SINGAPORE } from './real/singapore.js?v=1a016bc';
import { AUSTRALIA } from './real/australia.js?v=1a016bc';
import { MONZA } from './real/monza.js?v=1a016bc';
import { BAHRAIN } from './real/bahrain.js?v=1a016bc';
import { QATAR } from './real/qatar.js?v=1a016bc';
import { CHINA } from './real/china.js?v=1a016bc';
import { MADRING } from './real/madring.js?v=1a016bc';
import { VEGAS } from './real/vegas.js?v=1a016bc';
import { RED_MESA } from './mesa/index.js?v=1a016bc';
import { GLACIER_PASS } from './alpine/index.js?v=1a016bc';

// Packs group the tracks in the menu: the real circuits and the test ring. (The imagined circuits
// are kept in the code but no longer offered.)
for (const t of [PORTO_VELA, PINEWOOD, LUMEN_CITY]) t.pack = 'creative';
VOID_RING.pack = 'test';

/** Every track, in the order the track switcher cycles through them. */
export const TRACKS = [ZANDVOORT, COTA, INTERLAGOS, HUNGARORING, MONACO, MIAMI, CATALUNYA, BAKU, SILVERSTONE, YAS, SPA, SUZUKA, JEDDAH, MEXICO, AUSTRIA, CANADA, SINGAPORE, AUSTRALIA, MONZA, BAHRAIN, VEGAS, QATAR, CHINA, MADRING, VOID_RING];
export const PACKS = [
  { id: 'f1', name: 'F1 Track Pack', blurb: 'Real Grand Prix circuits, recreated corner by corner' },
  { id: 'test', name: 'Test', blurb: '' },
];
export { PORTO_VELA, PINEWOOD, LUMEN_CITY, VOID_RING, ZANDVOORT, COTA, INTERLAGOS, HUNGARORING, MONACO, MIAMI, CATALUNYA, BAKU, SILVERSTONE, YAS, SPA, SUZUKA, JEDDAH, MEXICO, AUSTRIA, CANADA, SINGAPORE, AUSTRALIA, MONZA, BAHRAIN, VEGAS, QATAR, CHINA, MADRING, RED_MESA, GLACIER_PASS };
