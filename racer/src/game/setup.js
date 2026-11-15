/*
 * Car setup (as in F1 Manager): five sliders 0-100. Every circuit has a hidden ideal; how close the
 * setup is decides up to ~1.5% of pace for the team's cars. After each practice session the drivers'
 * feedback says which way to go, more precisely the more running there has been. Locked from qualifying.
 */
export const SETUP = [['frontWing', 'Front wing'], ['rearWing', 'Rear wing'], ['stiffness', 'Suspension'], ['rideHeight', 'Ride height'], ['brakeBias', 'Brake bias']];
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
export function ideal(trackId) { let h = hash(trackId); return Object.fromEntries(SETUP.map(([k]) => { h = Math.imul(h, 1664525) + 1013904223 >>> 0; return [k, 15 + (h % 71)]; })); }
export const defaultSetup = () => Object.fromEntries(SETUP.map(([k]) => [k, 50]));
/** 0..1: how good the setup is. */
export function quality(setup, trackId) { const o = ideal(trackId); return Math.max(0, 1 - SETUP.reduce((a, [k]) => a + Math.abs((setup?.[k] ?? 50) - o[k]), 0) / SETUP.length / 45); }
/** The pace factor for the team's cars. */
export const setupFactor = (setup, trackId) => 0.985 + 0.015 * quality(setup, trackId);
/** The drivers' feedback after `sessions` practice sessions: per slider, which way and how sure. */
export function feedback(setup, trackId, sessions) {
  const o = ideal(trackId), tol = [18, 10, 6, 3][Math.min(3, sessions)];
  return Object.fromEntries(SETUP.map(([k]) => { const d = o[k] - (setup?.[k] ?? 50); return [k, sessions === 0 ? '?' : Math.abs(d) <= tol ? 'Good' : d > 0 ? (Math.abs(d) > 25 ? 'Much higher' : 'Higher') : (Math.abs(d) > 25 ? 'Much lower' : 'Lower')]; }));
}
