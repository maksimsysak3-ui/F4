/*
 * Trackside partners as seen at each Grand Prix: the series' global partners on every circuit plus
 * each race's local partners. [name as written, background, lettering, accent, style, 'plain'].
 * Logos are drawn as lettering in each brand's colours and typeface feel (no artwork files).
 */
const B = {
  ROLEX: ['ROLEX', '#006039', '#c8a24b', '#c8a24b', 'serif', 'plain', 'crown', '#00492b'],
  ARAMCO: ['aramco', '#12a44c', '#ffffff', '#ffffff', 'wave', 'plain'],
  ARAMCO_B: ['aramco\u200b', '#2c63c4', '#ffffff', '#ffffff', 'wave', 'plain'],
  PIRELLI: ['PIRELLI', '#ffd100', '#111111', '#e2001a', 'stripes', 'plain', 'longP'],
  DHL: ['DHL', '#ffcc00', '#d40511', '#d40511', 'stripes', 'plain', 'speed', '#d40511'],
  HEINEKEN: ['Heineken', '#00843d', '#ffffff', '#e2001a', 'serif', 'plain', 'star'],
  CRYPTO: ['crypto.com', '#002d74', '#ffffff', '#1199fa', 'hex', 'plain', 'hex'],
  AWS: ['aws', '#232f3e', '#ffffff', '#ff9900', 'wave', 'plain', 'smile'],
  LENOVO: ['Lenovo', '#e2231a', '#ffffff', '#ffffff', 'stripes', 'plain'],
  MSC: ['MSC CRUISES', '#1f3f8f', '#ffffff', '#ffffff', 'wave', 'plain', 'compass', '#d8303a'],
  QATAR: ['QATAR AIRWAYS', '#5c0632', '#ffffff', '#c8a24b', 'serif', 'plain', 'disc'],
  EMIRATES: ['Emirates', '#d71921', '#ffffff', '#ffffff', 'serif', 'plain', 'disc'],
  SALESFORCE: ['salesforce', '#00a1e0', '#ffffff', '#ffffff', 'wave', 'plain'],
  PARAMOUNT: ['Paramount+', '#0064ff', '#ffffff', '#ffffff', 'wave', 'plain'],
  MOET: ['MOËT & CHANDON', '#111111', '#c8a24b', '#c8a24b', 'serif', 'plain'],
  LIQUIMOLY: ['LIQUI MOLY', '#00529b', '#ffffff', '#e30613', 'stripes', 'plain'],
  TAG: ['TAG HEUER', '#111111', '#ffffff', '#009a49', 'serif', 'plain', 'disc'],
  ETIHAD: ['ETIHAD AIRWAYS', '#b8945a', '#ffffff', '#ffffff', 'serif', 'plain', 'disc'],
  ETIHAD_W: ['ETIHAD AIRWAYS', '#f4f2ec', '#a8842e', '#a8842e', 'serif', 'plain', 'disc'],
  ADNOC: ['ADNOC', '#0047ba', '#ffffff', '#00a3e0', 'wave', 'plain'],
  ALDAR: ['ALDAR', '#f4f2ec', '#1b1b1f', '#1b1b1f', 'serif', 'plain'],
  SOCAR: ['SOCAR', '#ffffff', '#0f4a8a', '#e2231a', 'bolt', 'plain'],
  AZERCELL: ['Azercell', '#5c2d91', '#ffffff', '#ffffff', 'wave', 'plain'],
  HARDROCK: ['HARD ROCK', '#111111', '#ffffff', '#c8102e', 'stripes', 'plain'],
  STC: ['stc', '#4f008c', '#ffffff', '#ff375e', 'wave', 'plain'],
  TELCEL: ['Telcel', '#0d47a1', '#ffffff', '#ffffff', 'wave', 'plain'],
  HONDA: ['HONDA', '#cc0000', '#ffffff', '#ffffff', 'stripes', 'plain', 'hwing'],
  SANTANDER: ['Santander', '#ec0000', '#ffffff', '#ffffff', 'wave', 'plain'],
  SHELL: ['Shell', '#fbce07', '#dd1d21', '#dd1d21', 'stripes', 'plain', 'pecten'],
  ESTRELLA: ['Estrella Damm', '#c8102e', '#ffffff', '#c8a24b', 'serif', 'plain', 'star'],
  ZIGGO: ['Ziggo', '#f48c00', '#ffffff', '#ffffff', 'wave', 'plain'],
  // Painted art run-offs (not sponsors): the Texas flag, and stars over red-white-blue stripes.
  TEXAS: ['TEXAS FLAG', '#bf0a30', '#ffffff', '#002868', 'flag', 'plain'],
  STARS: ['STARS AND STRIPES', '#1c3f94', '#ffffff', '#bf0a30', 'flag', 'plain'],
  REDBULL: ['Red Bull', '#1e2a5c', '#db0a40', '#ffc906', 'wave', 'plain'],
  SIA: ['SINGAPORE AIRLINES', '#1d2a6a', '#f2b31b', '#f2b31b', 'serif', 'plain'],
  LV: ['LOUIS VUITTON', '#4a2e1c', '#e8d4a8', '#e8d4a8', 'serif', 'plain'],
  GULFAIR: ['GULF AIR', '#a8853a', '#ffffff', '#1d2a5c', 'serif', 'plain', 'disc'],
  ITALIANGP: ['#ItalianGP', '#111111', '#ffffff', '#e2001a', 'stripes', 'plain'],
  SILVER: ['Heineken Silver', '#00843d', '#ffffff', '#e2001a', 'serif', 'plain', 'star'],
  BAHRAIN_ART: ['BAHRAIN CALLIGRAPHY', '#f2c08e', '#d4202a', '#f07a1e', 'flag', 'plain'],
  BAHRAIN_BLUE: ['BAHRAIN MOSAIC', '#2a7ad8', '#ffffff', '#5ad0ff', 'flag', 'plain'],
  VEGAS_ART: ['HEINEKEN 0.0', '#00843d', '#ffffff', '#1a5ab8', 'flag', 'plain'],
  BAHRAIN_GEO: ['BAHRAIN GEOMETRIC', '#c9a978', '#ce1126', '#1a8a8a', 'flag', 'plain'],
  VEGAS_SIGN: ['LAS VEGAS SIGN', '#1a2a6a', '#e2231a', '#ffd23f', 'flag', 'plain'],
  QATAR_GEO: ['QATAR GEOMETRIC', '#5c1632', '#ffffff', '#f07a1e', 'flag', 'plain'],
  QATAR_ART: ['QATAR AIRWAYS FIELD', '#6a1a52', '#ffffff', '#f07a1e', 'flag', 'plain'],
  LENOVO_ART: ['LENOVO FIELD', '#4a2a7a', '#ffffff', '#e2231a', 'flag', 'plain'],
  MADRING_YELLOW: ['MADRING YELLOW', '#f2c200', '#c8102e', '#c8102e', 'flag', 'plain'],
  MIAMI_ART: ['MIAMI PALMS', '#3ab0d0', '#ffffff', '#ff4fa0', 'flag', 'plain'],
  MEXICO_ART: ['MEXICO ART', '#006847', '#ffffff', '#ce1126', 'flag', 'plain'],
  PZERO: ['P ZERO', '#ffd100', '#111111', '#e2001a', 'stripes', 'plain'],
  MOTUL: ['MOTUL', '#d71920', '#ffffff', '#111111', 'stripes', 'plain'],
};

// Per race: [boards in order], the run-off/zone brands, the main-straight brands, and gantry banners.
const RACES = {
  Jeddah: [[B.ARAMCO, B.ARAMCO_B, B.STC, B.ROLEX, B.PIRELLI, B.DHL, B.MSC, B.QATAR], ['ARAMCO', 'ARAMCO_B', 'STC', 'MSC', 'DHL', 'QATAR'], ['ARAMCO', 'STC']],
  Mexico: [[B.ARAMCO, B.ARAMCO_B, B.HEINEKEN, B.MSC, B.TELCEL, B.ROLEX, B.PIRELLI, B.DHL, B.MEXICO_ART], ['HEINEKEN', 'MSC', 'ARAMCO', 'ARAMCO_B', 'TELCEL'], ['HEINEKEN', 'ROLEX']],
  Monaco: [[B.ARAMCO, B.ARAMCO_B, B.ROLEX, B.TAG, B.MOET, B.MSC, B.PIRELLI, B.DHL], ['ARAMCO', 'ARAMCO_B', 'DHL', 'PIRELLI', 'MSC'], ['ROLEX', 'TAG']],
  Miami: [[B.ARAMCO, B.ARAMCO_B, B.CRYPTO, B.HARDROCK, B.AWS, B.LENOVO, B.PIRELLI, B.DHL, B.MIAMI_ART], ['ARAMCO', 'ARAMCO_B', 'CRYPTO', 'LENOVO', 'DHL'], ['CRYPTO', 'HARDROCK'], ['MIAMI_ART', 'CRYPTO', 'MIAMI_ART', 'ARAMCO', 'MIAMI_ART', 'LENOVO', 'MIAMI_ART']],
  Catalunya: [[B.ARAMCO, B.ARAMCO_B, B.ROLEX, B.PIRELLI, B.ESTRELLA, B.SANTANDER, B.DHL, B.HEINEKEN], ['ARAMCO', 'ARAMCO_B', 'ESTRELLA', 'SANTANDER', 'DHL'], ['ARAMCO', 'ROLEX']],
  COTA: [[B.ARAMCO, B.ARAMCO_B, B.LENOVO, B.AWS, B.CRYPTO, B.MSC, B.PIRELLI, B.DHL, B.TEXAS, B.STARS], ['MSC', 'LENOVO', 'ARAMCO', 'ARAMCO_B', 'AWS', 'CRYPTO', 'DHL'], ['ROLEX', 'LENOVO'], ['TEXAS', 'STARS']],
  Hungaroring: [[B.ARAMCO, B.ARAMCO_B, B.ROLEX, B.PIRELLI, B.DHL, B.HEINEKEN, B.LENOVO, B.MSC], ['ARAMCO', 'ARAMCO_B', 'DHL', 'MSC', 'QATAR'], ['ROLEX', 'ARAMCO']],
  Interlagos: [[B.ARAMCO, B.ARAMCO_B, B.MSC, B.HEINEKEN, B.PIRELLI, B.ROLEX, B.DHL, B.LENOVO], ['ARAMCO', 'ARAMCO_B', 'MSC', 'HEINEKEN', 'DHL'], ['ROLEX', 'HEINEKEN']],
  Zandvoort: [[B.ARAMCO, B.ARAMCO_B, B.HEINEKEN, B.ZIGGO, B.DHL, B.ROLEX, B.PIRELLI, B.MOTUL], ['ARAMCO', 'ARAMCO_B', 'HEINEKEN', 'ZIGGO', 'DHL'], ['HEINEKEN', 'ROLEX']],
  Baku: [[B.ARAMCO, B.ARAMCO_B, B.SOCAR, B.AZERCELL, B.ROLEX, B.PIRELLI, B.DHL, B.QATAR], ['ARAMCO', 'ARAMCO_B', 'SOCAR', 'AZERCELL', 'DHL'], ['SOCAR', 'ROLEX']],
  Silverstone: [[B.ARAMCO, B.ARAMCO_B, B.ROLEX, B.PIRELLI, B.HEINEKEN, B.DHL, B.LENOVO, B.QATAR], ['ARAMCO', 'ARAMCO_B', 'HEINEKEN', 'DHL', 'LENOVO'], ['ROLEX', 'ARAMCO']],
  'Yas Marina': [[B.ARAMCO, B.ARAMCO_B, B.ETIHAD, B.ETIHAD_W, B.ADNOC, B.ALDAR, B.ROLEX, B.PIRELLI], ['ARAMCO', 'ARAMCO_B', 'ETIHAD', 'ADNOC', 'ALDAR'], ['ETIHAD', 'ROLEX']],
  Spa: [[B.ARAMCO, B.ARAMCO_B, B.MOET, B.ROLEX, B.PIRELLI, B.HEINEKEN, B.DHL, B.LENOVO], ['ARAMCO', 'ARAMCO_B', 'HEINEKEN', 'DHL', 'PIRELLI'], ['ROLEX', 'MOET']],
  Austria: [[B.ARAMCO, B.ARAMCO_B, B.QATAR, B.REDBULL, B.ROLEX, B.PIRELLI, B.DHL, B.HEINEKEN], ['REDBULL', 'ARAMCO', 'ARAMCO_B', 'HEINEKEN', 'DHL'], ['QATAR', 'ROLEX']],
  Canada: [[B.ARAMCO, B.ARAMCO_B, B.PIRELLI, B.ROLEX, B.HEINEKEN, B.DHL, B.AWS, B.LENOVO], ['ROLEX', 'HEINEKEN', 'ARAMCO', 'ARAMCO_B', 'AWS', 'DHL'], ['PIRELLI', 'ROLEX']],
  Singapore: [[B.ARAMCO, B.ARAMCO_B, B.SIA, B.ROLEX, B.PIRELLI, B.DHL, B.HEINEKEN, B.CRYPTO], ['SIA', 'ARAMCO', 'ARAMCO_B', 'DHL', 'HEINEKEN'], ['SIA', 'ROLEX'], ['SIA']],
  Australia: [[B.ARAMCO, B.ARAMCO_B, B.AWS, B.LV, B.ROLEX, B.PIRELLI, B.DHL, B.HEINEKEN], ['LV', 'AWS', 'HEINEKEN', 'DHL'], ['LV', 'ROLEX']],
  Monza: [[B.ARAMCO, B.ARAMCO_B, B.PIRELLI, B.ITALIANGP, B.ROLEX, B.DHL, B.HEINEKEN, B.MSC], ['PIRELLI', 'ARAMCO', 'ARAMCO_B', 'DHL'], ['PIRELLI', 'ROLEX']],
  Bahrain: [[B.ARAMCO, B.ARAMCO_B, B.GULFAIR, B.ROLEX, B.PIRELLI, B.DHL, B.HEINEKEN, B.BAHRAIN_ART, B.BAHRAIN_BLUE, B.BAHRAIN_GEO], ['GULFAIR', 'ROLEX', 'ARAMCO', 'DHL'], ['GULFAIR', 'ROLEX'], ['BAHRAIN_GEO']],
  Qatar: [[B.ARAMCO, B.ARAMCO_B, B.QATAR, B.ROLEX, B.PIRELLI, B.DHL, B.MSC, B.HEINEKEN, B.QATAR_ART, B.QATAR_GEO], ['QATAR', 'ROLEX', 'ARAMCO', 'DHL', 'MSC'], ['QATAR', 'ROLEX'], ['QATAR_GEO', 'QATAR_ART', 'QATAR_GEO', 'QATAR_ART', 'QATAR_GEO', 'QATAR_ART']],
  China: [[B.ARAMCO, B.ARAMCO_B, B.LENOVO, B.ROLEX, B.PIRELLI, B.DHL, B.HEINEKEN, B.AWS, B.MSC, B.LENOVO_ART], ['LENOVO', 'HEINEKEN', 'ARAMCO', 'DHL', 'AWS'], ['LENOVO', 'ROLEX'], ['LENOVO_ART']],
  Madring: [[B.ARAMCO, B.ARAMCO_B, B.MSC, B.ROLEX, B.PIRELLI, B.DHL, B.ESTRELLA, B.SANTANDER, B.MADRING_YELLOW], ['MSC', 'ESTRELLA', 'SANTANDER', 'ARAMCO', 'DHL'], ['MSC', 'ROLEX'], ['MADRING_YELLOW', 'MSC', 'MADRING_YELLOW', 'MADRING_YELLOW', 'MSC', 'MADRING_YELLOW']],
  'Las Vegas': [[B.ARAMCO, B.ARAMCO_B, B.SILVER, B.PIRELLI, B.PZERO, B.ROLEX, B.AWS, B.CRYPTO, B.DHL, B.VEGAS_ART, B.VEGAS_SIGN], ['PIRELLI', 'PZERO', 'SILVER', 'PIRELLI', 'AWS', 'PZERO', 'CRYPTO'], ['SILVER', 'PIRELLI'], ['VEGAS_SIGN', 'VEGAS_ART', 'VEGAS_SIGN', 'PIRELLI', 'VEGAS_SIGN', 'CRYPTO', 'VEGAS_SIGN']],
  Suzuka: [[B.ARAMCO, B.ARAMCO_B, B.HONDA, B.LENOVO, B.ROLEX, B.PIRELLI, B.DHL, B.HEINEKEN], ['ARAMCO', 'ARAMCO_B', 'HONDA', 'LENOVO', 'DHL'], ['ROLEX', 'HONDA']],
};
const TAGLINE = { GULFAIR: 'TITLE PARTNER', SILVER: 'TITLE PARTNER', ITALIANGP: 'GRAN PREMIO D\'ITALIA', SIA: 'TITLE PARTNER', REDBULL: 'GIVES YOU WINGS', QATAR: 'TITLE PARTNER', STC: 'TITLE PARTNER', ROLEX: 'OFFICIAL TIMEPIECE', PIRELLI: 'OFFICIAL TYRE SUPPLIER', DHL: 'OFFICIAL LOGISTICS PARTNER', ARAMCO: 'GLOBAL PARTNER', HEINEKEN: 'GLOBAL PARTNER', LENOVO: 'GLOBAL PARTNER', ETIHAD: 'TITLE PARTNER', SOCAR: 'TITLE PARTNER', CRYPTO: 'TITLE PARTNER', MSC: 'GLOBAL PARTNER', MOET: 'OFFICIAL CHAMPAGNE', TAG: 'OFFICIAL TIMEKEEPER', HONDA: 'TITLE PARTNER', HARDROCK: 'HOST PARTNER' };

// Each Grand Prix's title partner (the "<partner> <country> Grand Prix" name): it owns the main
// straight's walls, leads the run-off sponsors and gets the biggest painted field.
const TITLE = {
  Jeddah: 'STC', Mexico: 'HEINEKEN', Monaco: 'TAG', Miami: 'CRYPTO', Catalunya: 'ARAMCO', COTA: 'MSC',
  Interlagos: 'MSC', Zandvoort: 'HEINEKEN', Baku: 'QATAR', Silverstone: 'QATAR', 'Yas Marina': 'ETIHAD',
  Spa: 'MOET', Suzuka: 'LENOVO', Austria: 'QATAR', Canada: 'PIRELLI', Singapore: 'SIA', Australia: 'LV', Monza: 'PIRELLI', Bahrain: 'GULFAIR', 'Las Vegas': 'SILVER', Qatar: 'QATAR', China: 'LENOVO', Madring: 'MSC',
};

const ART = [B.TEXAS, B.STARS, B.BAHRAIN_ART, B.BAHRAIN_BLUE, B.VEGAS_ART, B.BAHRAIN_GEO, B.VEGAS_SIGN, B.QATAR_ART, B.QATAR_GEO, B.LENOVO_ART, B.MADRING_YELLOW, B.MIAMI_ART, B.MEXICO_ART];

/** Replace a circuit's sponsors with the real partners of that race (by scene name). */
export function realSponsors(name) {
  const race = RACES[name];
  if (!race) return null;
  let [list, zone, prime, art] = race;
  // TAG Heuer has been F1's official timekeeper since 2025 (in Rolex's place): its boards on the walls,
  // one of the two big billboards over the straights, and a painted run-off at every other race.
  const swap = (k) => (k === 'ROLEX' ? 'TAG' : k);
  list = [...new Set(list.map((b) => (b === B.ROLEX ? B.TAG : b)))];
  if (!list.includes(B.TAG)) list = [...list.slice(0, 2), B.TAG, ...list.slice(2)];
  prime = prime.map(swap);
  if (!prime.includes('TAG')) prime = [prime[0], 'TAG'];
  zone = zone.map(swap);
  if (Object.keys(RACES).indexOf(name) % 2 === 0 && !zone.includes('TAG')) zone = [...zone, 'TAG'];
  const title = TITLE[name];
  const nm = (k) => B[k][0];
  const bridge = (k) => [nm(k), TAGLINE[k] ?? 'OFFICIAL PARTNER', B[k][1], B[k][2], B[k][3]];
  if (title) {
    if (!list.includes(B[title])) list = [...list.filter((b) => !ART.includes(b)).slice(0, -1), B[title], ...list.filter((b) => ART.includes(b))];
    prime = [title, prime.find((k) => k !== title) ?? zone.find((k) => k !== title && !k.startsWith('ARAMCO')) ?? 'TAG'];
    zone = [title, ...zone.filter((k) => k !== title)];
  }
  return { sponsors: list, zoneBrands: zone.map(nm), primeBrands: prime.map(nm), bridges: prime.map(bridge), titleBrand: title ? nm(title) : undefined, runoffBrands: art ? art.map(nm) : undefined };
}
