const KEY = 'tiny-lambo-racer:v1';
const DEFAULTS = { car: 'lambo', paints: {}, assists: true, automatic: true, telemetry: false, muted: false };

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
