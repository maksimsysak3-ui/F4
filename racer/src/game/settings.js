const KEY = 'tiny-lambo-racer:v3'; // v3: SPORT assists become the default
const DEFAULTS = { track: 'portovela', car: 'lambo', paints: {}, assists: true, assistLevel: 1, automatic: true, telemetry: false, muted: false, rain: false };

/** Per-viewer preferences. Storage can be unavailable (private mode, sandboxing): never throw. */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    return { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
