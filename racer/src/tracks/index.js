import { PORTO_VELA } from './street/index.js?v=b8df018';
import { PINEWOOD } from './forest/index.js?v=b8df018';
import { LUMEN_CITY } from './night/index.js?v=b8df018';
import { VOID_RING } from './ring/index.js?v=b8df018';
import { ZANDVOORT } from './real/zandvoort.js?v=b8df018';
import { COTA } from './real/cota.js?v=b8df018';
import { INTERLAGOS } from './real/interlagos.js?v=b8df018';
import { HUNGARORING } from './real/hungaroring.js?v=b8df018';
import { MONACO } from './real/monaco.js?v=b8df018';
import { MIAMI } from './real/miami.js?v=b8df018';
import { CATALUNYA } from './real/catalunya.js?v=b8df018';
import { BAKU } from './real/baku.js?v=b8df018';
import { SILVERSTONE } from './real/silverstone.js?v=b8df018';
import { YAS } from './real/yas.js?v=b8df018';
import { SPA } from './real/spa.js?v=b8df018';
import { SUZUKA } from './real/suzuka.js?v=b8df018';
import { JEDDAH } from './real/jeddah.js?v=b8df018';
import { MEXICO } from './real/mexico.js?v=b8df018';
import { AUSTRIA } from './real/austria.js?v=b8df018';
import { CANADA } from './real/canada.js?v=b8df018';
import { SINGAPORE } from './real/singapore.js?v=b8df018';
import { AUSTRALIA } from './real/australia.js?v=b8df018';
import { MONZA } from './real/monza.js?v=b8df018';
import { BAHRAIN } from './real/bahrain.js?v=b8df018';
import { QATAR } from './real/qatar.js?v=b8df018';
import { CHINA } from './real/china.js?v=b8df018';
import { MADRING } from './real/madring.js?v=b8df018';
import { VEGAS } from './real/vegas.js?v=b8df018';
import { RED_MESA } from './mesa/index.js?v=b8df018';
import { GLACIER_PASS } from './alpine/index.js?v=b8df018';

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
