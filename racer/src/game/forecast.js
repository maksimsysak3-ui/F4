/*
 * Dynamic weather. The sky moves through stages, one step at a time, the way weather actually turns:
 *   Sunny → Partly cloudy → Cloudy → Overcast → Dark clouds → Drizzle → Rain → Heavy rain
 * and back again. It can cloud over and clear, darken and spit, or build into a downpour; it never
 * jumps from sunshine to a storm. Each stage holds for a few minutes. How likely it is to turn worse
 * depends on the circuit's climate (Spa and Interlagos far more than Bahrain).
 *
 * Three values come out of it, each easing towards the stage it's in:
 *   cloud     0..1 cover (sky, light, shadows)
 *   rain      0..1 intensity (falling rain, spray, the sound)
 *   wetness   0..1 water on the track: builds under rain, dries slowly once it stops (faster in sun);
 *             this is what the tyres feel, so a track stays damp for a while after a shower
 *
 * A session's weather is a seeded timeline, so the forecast shown before it is the weather that comes
 * (as a forecast, with its uncertainty), and every car on track lives through the same shower.
 */
export const STAGES = [
  { id: 'clear', name: 'Sunny', cloud: 0.05, rain: 0, icon: 'sun' },
  { id: 'fair', name: 'Partly cloudy', cloud: 0.32, rain: 0, icon: 'suncloud' },
  { id: 'cloudy', name: 'Cloudy', cloud: 0.6, rain: 0, icon: 'cloud' },
  { id: 'overcast', name: 'Overcast', cloud: 0.84, rain: 0, icon: 'cloud' },
  { id: 'dark', name: 'Dark clouds', cloud: 1, rain: 0, icon: 'darkcloud' },
  { id: 'drizzle', name: 'Drizzle', cloud: 0.96, rain: 0.16, icon: 'drizzle' },
  { id: 'rain', name: 'Rain', cloud: 1, rain: 0.48, icon: 'rain' },
  { id: 'heavy', name: 'Heavy rain', cloud: 1, rain: 0.88, icon: 'storm' },
];
const IDX = Object.fromEntries(STAGES.map((s, k) => [s.id, k]));

/** Chance of rain at each circuit (a session there turning wet), 0..1. */
export const CLIMATE = {
  spa: 0.62, interlagos: 0.55, silverstone: 0.5, suzuka: 0.42, zandvoort: 0.45, hungaroring: 0.3, canada: 0.35, china: 0.35,
  monaco: 0.25, miami: 0.3, singapore: 0.3, cota: 0.2, catalunya: 0.2, austria: 0.35, baku: 0.12, monza: 0.25, australia: 0.25,
  madring: 0.15, mexico: 0.25, jeddah: 0.03, bahrain: 0.02, qatar: 0.02, yas: 0.03, vegas: 0.04,
};

/** A small seeded random generator. */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/**
 * Picks the next stage from `k`: a step worse with a chance set by the climate (stronger the closer
 * to rain the sky already is, so a dark sky usually does rain somewhere wet), else a step better or
 * staying put. Clear skies at a dry circuit mostly stay clear.
 */
function nextStage(k, wet, R) {
  const worse = Math.min(0.85, wet * (k >= 3 ? 1.25 : k >= 1 ? 0.95 : 0.6) + 0.04);
  const better = k >= 5 ? 0.45 : 0.38;
  const u = R();
  if (u < worse) return Math.min(STAGES.length - 1, k + 1);
  if (u < worse + better) return Math.max(0, k - 1);
  return k;
}

/**
 * A weather timeline: [{ t (s from the start), stage }] covering `duration` seconds. `start` is a
 * stage index (or null for one drawn from the climate).
 */
export function makeTimeline(seed, wet, duration, start = null) {
  const R = rng(seed);
  let k = start ?? (R() < wet * 0.6 ? 2 + Math.floor(R() * 3) : Math.floor(R() * 3));
  const tl = [{ t: 0, stage: k }];
  let t = 0;
  while (t < duration) {
    t += 160 + R() * 340; // each stage lasts ~3 to 8 minutes
    k = nextStage(k, wet, R);
    if (k !== tl[tl.length - 1].stage) tl.push({ t, stage: k });
  }
  return tl;
}

/** The stage at time t on a timeline. */
export const stageAt = (tl, t) => { let k = tl[0].stage; for (const e of tl) { if (e.t > t) break; k = e.stage; } return k; };

/**
 * A forecast for a timeline, as a broadcaster would give it: the outlook in slots through the
 * session, with a chance of rain per slot (certain near the start, vaguer later).
 */
export function forecast(tl, duration, slots = 5) {
  const out = [];
  for (let k = 0; k < slots; k++) {
    const t0 = (duration * k) / slots, t1 = (duration * (k + 1)) / slots;
    let worst = 0;
    for (let t = t0; t <= t1; t += 20) worst = Math.max(worst, stageAt(tl, t));
    const s = STAGES[worst], blur = 0.08 + 0.1 * k;
    const chance = Math.round(Math.max(0, Math.min(100, (s.rain > 0 ? 75 + s.rain * 25 : worst >= 4 ? 45 : worst >= 3 ? 20 : 5) + (k ? (Math.sin(worst * 7 + k) * blur * 100) : 0))));
    out.push({ t: t0, stage: worst, name: s.name, icon: s.icon, rain: chance });
  }
  return out;
}

/** Live weather: plays a timeline (or keeps generating one) and eases the values towards it. */
export class Weather {
  constructor({ timeline = null, wet = 0.3, seed = Math.random() * 1e9, wetness = null } = {}) {
    this.wet = wet; this.seed = seed;
    this.timeline = timeline ?? makeTimeline(seed, wet, 7200);
    this.t = 0;
    const s = STAGES[this.timeline[0].stage];
    this.cloud = s.cloud; this.rain = s.rain;
    this.wetness = wetness ?? Math.min(1, s.rain * 2.2);
  }
  get stage() { return stageAt(this.timeline, this.t); }
  get name() { return STAGES[this.stage].name; }
  /** Jump straight to a stage (free play's weather key), with the track to match. */
  set(stageId, track = true) {
    const k = IDX[stageId] ?? 0;
    this.timeline = [{ t: 0, stage: k }, ...makeTimeline(this.seed + this.t, this.wet, 7200, k).slice(1).map((e) => ({ ...e, t: e.t + 600 }))];
    this.t = 0;
    const s = STAGES[k];
    this.cloud = s.cloud; this.rain = s.rain;
    if (track) this.wetness = Math.min(1, s.rain * 2.2);
  }
  update(dt) {
    this.t += dt;
    if (this.t > this.timeline[this.timeline.length - 1].t + 3600) this.timeline = this.timeline.concat(makeTimeline(this.seed + this.t, this.wet, 7200, this.stage).slice(1).map((e) => ({ ...e, t: e.t + this.t })));
    const s = STAGES[this.stage];
    this.cloud += (s.cloud - this.cloud) * Math.min(1, dt / 70);   // clouds roll in over a minute or two
    this.rain += (s.rain - this.rain) * Math.min(1, dt / 35);      // rain builds and eases over ~half a minute
    if (this.rain > 0.03) this.wetness = Math.min(1, this.wetness + this.rain * dt / 45);   // heavy rain soaks it in ~1 minute
    else this.wetness = Math.max(0, this.wetness - dt * (0.0016 + 0.0028 * (1 - this.cloud))); // dries in ~4-10 minutes
  }
  /** How grey and dim the sky and light are (0 bright .. 1 storm). */
  get gloom() { return Math.min(1, Math.max(this.rain * 1.15, Math.max(0, this.cloud - 0.5) * 1.3)); }
}
