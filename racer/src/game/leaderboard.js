/**
 * Per-track timing records kept in the browser: the top 10 laps (any car),
 * the track's best sectors, and each car's best-lap trace for the live delta.
 * Storage can be unavailable (private mode): every call degrades gracefully.
 */
const PREFIX = 'tiny-racer:times:';

function read(key, fallback) {
  try { const raw = localStorage.getItem(PREFIX + key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* ignore */ }
}

export function topTimes(trackId) {
  return read(`${trackId}:top`, []);
}

/** Record a lap; returns its rank (1-based) in the top 10, or null if it didn't make it. */
export function submitLap(trackId, entry) {
  const stamped = { ...entry, date: Date.now() };
  const list = [...topTimes(trackId), stamped].sort((a, b) => a.time - b.time).slice(0, 10);
  write(`${trackId}:top`, list);
  const idx = list.indexOf(stamped);
  return idx >= 0 ? idx + 1 : null;
}

export function bestSectors(trackId) {
  return read(`${trackId}:sectors`, [null, null, null]);
}

export function submitSectors(trackId, sectors) {
  const best = bestSectors(trackId);
  const next = best.map((b, k) => (sectors[k] != null && (b == null || sectors[k] < b) ? sectors[k] : b));
  write(`${trackId}:sectors`, next);
  return next;
}

export function bestTrace(trackId, carId) {
  return read(`${trackId}:${carId}:trace`, null);
}

export function saveTrace(trackId, carId, trace) {
  write(`${trackId}:${carId}:trace`, trace);
}
