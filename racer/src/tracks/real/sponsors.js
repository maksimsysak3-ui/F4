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
  MOTUL: ['MOTUL', '#d71920', '#ffffff', '#111111', 'stripes', 'plain'],
};

// Per race: [boards in order], the run-off/zone brands, the main-straight brands, and gantry banners.
const RACES = {
  Jeddah: [[B.ARAMCO, B.ARAMCO_B, B.STC, B.ROLEX, B.PIRELLI, B.DHL, B.MSC, B.QATAR], ['ARAMCO', 'ARAMCO_B', 'STC', 'MSC', 'DHL', 'QATAR'], ['ARAMCO', 'STC']],
  Mexico: [[B.ARAMCO, B.ARAMCO_B, B.HEINEKEN, B.MSC, B.TELCEL, B.ROLEX, B.PIRELLI, B.DHL], ['HEINEKEN', 'MSC', 'ARAMCO', 'ARAMCO_B', 'TELCEL'], ['HEINEKEN', 'ROLEX']],
  Monaco: [[B.ARAMCO, B.ARAMCO_B, B.ROLEX, B.TAG, B.MOET, B.MSC, B.PIRELLI, B.DHL], ['ARAMCO', 'ARAMCO_B', 'DHL', 'PIRELLI', 'MSC'], ['ROLEX', 'TAG']],
  Miami: [[B.ARAMCO, B.ARAMCO_B, B.CRYPTO, B.HARDROCK, B.AWS, B.LENOVO, B.PIRELLI, B.DHL], ['ARAMCO', 'ARAMCO_B', 'CRYPTO', 'LENOVO', 'DHL'], ['CRYPTO', 'HARDROCK']],
  Catalunya: [[B.ARAMCO, B.ARAMCO_B, B.ROLEX, B.PIRELLI, B.ESTRELLA, B.SANTANDER, B.DHL, B.HEINEKEN], ['ARAMCO', 'ARAMCO_B', 'ESTRELLA', 'SANTANDER', 'DHL'], ['ARAMCO', 'ROLEX']],
  COTA: [[B.ARAMCO, B.ARAMCO_B, B.LENOVO, B.AWS, B.CRYPTO, B.MSC, B.PIRELLI, B.DHL], ['MSC'], ['ROLEX', 'LENOVO']],
  Hungaroring: [[B.ARAMCO, B.ARAMCO_B, B.ROLEX, B.PIRELLI, B.DHL, B.HEINEKEN, B.LENOVO, B.MSC], ['ARAMCO', 'ARAMCO_B', 'DHL', 'MSC', 'QATAR'], ['ROLEX', 'ARAMCO']],
  Interlagos: [[B.ARAMCO, B.ARAMCO_B, B.MSC, B.HEINEKEN, B.PIRELLI, B.ROLEX, B.DHL, B.LENOVO], ['ARAMCO', 'ARAMCO_B', 'MSC', 'HEINEKEN', 'DHL'], ['ROLEX', 'HEINEKEN']],
  Zandvoort: [[B.ARAMCO, B.ARAMCO_B, B.HEINEKEN, B.ZIGGO, B.DHL, B.ROLEX, B.PIRELLI, B.MOTUL], ['ARAMCO', 'ARAMCO_B', 'HEINEKEN', 'ZIGGO', 'DHL'], ['HEINEKEN', 'ROLEX']],
  Baku: [[B.ARAMCO, B.ARAMCO_B, B.SOCAR, B.AZERCELL, B.ROLEX, B.PIRELLI, B.DHL, B.QATAR], ['ARAMCO', 'ARAMCO_B', 'SOCAR', 'AZERCELL', 'DHL'], ['SOCAR', 'ROLEX']],
  Silverstone: [[B.ARAMCO, B.ARAMCO_B, B.ROLEX, B.PIRELLI, B.HEINEKEN, B.DHL, B.LENOVO, B.QATAR], ['ARAMCO', 'ARAMCO_B', 'HEINEKEN', 'DHL', 'LENOVO'], ['ROLEX', 'ARAMCO']],
  'Yas Marina': [[B.ARAMCO, B.ARAMCO_B, B.ETIHAD, B.ETIHAD_W, B.ADNOC, B.ALDAR, B.ROLEX, B.PIRELLI], ['ARAMCO', 'ARAMCO_B', 'ETIHAD', 'ADNOC', 'ALDAR'], ['ETIHAD', 'ROLEX']],
  Spa: [[B.ARAMCO, B.ARAMCO_B, B.MOET, B.ROLEX, B.PIRELLI, B.HEINEKEN, B.DHL, B.LENOVO], ['ARAMCO', 'ARAMCO_B', 'HEINEKEN', 'DHL', 'PIRELLI'], ['ROLEX', 'MOET']],
  Suzuka: [[B.ARAMCO, B.ARAMCO_B, B.HONDA, B.LENOVO, B.ROLEX, B.PIRELLI, B.DHL, B.HEINEKEN], ['ARAMCO', 'ARAMCO_B', 'HONDA', 'LENOVO', 'DHL'], ['ROLEX', 'HONDA']],
};
const TAGLINE = { ROLEX: 'OFFICIAL TIMEPIECE', PIRELLI: 'OFFICIAL TYRE SUPPLIER', DHL: 'OFFICIAL LOGISTICS PARTNER', ARAMCO: 'GLOBAL PARTNER', HEINEKEN: 'GLOBAL PARTNER', LENOVO: 'GLOBAL PARTNER', ETIHAD: 'TITLE PARTNER', SOCAR: 'TITLE PARTNER', CRYPTO: 'TITLE PARTNER', MSC: 'GLOBAL PARTNER', MOET: 'OFFICIAL CHAMPAGNE', TAG: 'OFFICIAL TIMEKEEPER', HONDA: 'TITLE PARTNER', HARDROCK: 'HOST PARTNER' };

/** Replace a circuit's sponsors with the real partners of that race (by scene name). */
export function realSponsors(name) {
  const race = RACES[name];
  if (!race) return null;
  const [list, zone, prime] = race;
  const nm = (k) => B[k][0];
  const bridge = (k) => [nm(k), TAGLINE[k] ?? 'OFFICIAL PARTNER', B[k][1], B[k][2], B[k][3]];
  return { sponsors: list, zoneBrands: zone.map(nm), primeBrands: prime.map(nm), bridges: prime.map(bridge) };
}
