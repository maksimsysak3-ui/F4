import { rgb, scaleC } from './street/kit.js';
import { TEAMS } from './street/textures.js';

/**
 * F1 paddock architecture shared by the purpose-built circuits: team
 * hospitality units, transporters, the paddock club, medical centre, TV
 * compound and merchandise stores. Everything draws through a Frame
 * (a along the front, y up, b towards the track; the lot spans b in [-D, 0]).
 */

const WHITE = rgb(0xf2f3f5), STEEL = rgb(0x8a929e), DARK = rgb(0x2a2e36), GLASS_LIT = [1.15, 1.1, 1.0];
export const teamColour = (k) => rgb(parseInt(TEAMS[k % TEAMS.length][1].slice(1), 16));

/** Two-storey team hospitality: glass ground floor, a cantilevered team-colour upper floor, roof terrace. */
export function teamHospitality(F, r, col, W = 22, D = 14) {
  F.box('stucco', -W / 2, W / 2, 0, 3.6, -D, 0, DARK);
  F.face('winLit', -W / 2 + 0.5, W / 2 - 0.5, 0.3, 3.3, 0.02, GLASS_LIT);
  // Upper floor overhangs the entrance.
  F.box('stucco', -W / 2 - 0.5, W / 2 + 0.5, 3.6, 7.4, -D, 1.8, col);
  F.face('glass', -W / 2 + 0.6, W / 2 - 0.6, 4.1, 6.9, 1.82, null);
  for (let a = -W / 2 + 0.6; a < W / 2 - 0.6; a += 3.2) F.box('metal', a, a + 0.15, 4.1, 6.9, 1.8, 1.9, scaleC(col, 0.7));
  F.box('neon', -W / 2 - 0.5, W / 2 + 0.5, 3.55, 3.62, 1.7, 1.8, scaleC(col, 2.4));
  // Roof terrace: slab, glass balustrade, parasols.
  F.box('trim', -W / 2 - 0.5, W / 2 + 0.5, 7.4, 7.7, -D, 1.8, WHITE);
  F.box('metal', -W / 2 - 0.5, W / 2 + 0.5, 7.7, 8.7, 1.7, 1.8, rgb(0x9fb8cc));
  for (let k = 0; k < 3; k++) {
    const a = -W / 3 + (k * W) / 3, b = -D / 2 + 2;
    F.box('metal', a - 0.05, a + 0.05, 7.7, 9.8, b - 0.05, b + 0.05, STEEL);
    F.cylinder('fabric', a, b, 1.6, 9.7, 9.85, 8, WHITE);
  }
  // Team-colour fin with the name panel height.
  F.box('stucco', W / 2 - 1.2, W / 2 - 0.4, 0, 10.5, -1, 2.2, scaleC(col, 0.8));
  F.box('neon', W / 2 - 1.25, W / 2 - 0.35, 9.6, 10.3, 2.21, 2.25, [2.2, 2.2, 2.2]);
}

/** Team transporters parked nose to the paddock: cab plus box trailer in the team colours. */
export function transporterRow(F, r, n, firstTeam = 0) {
  const pitch = 3.6;
  for (let k = 0; k < n; k++) {
    const a = -((n - 1) * pitch) / 2 + k * pitch, col = teamColour(firstTeam + k);
    F.box('stucco', a - 1.25, a + 1.25, 0.9, 4.1, -16.5, -3.4, col); // trailer
    F.box('stucco', a - 1.26, a + 1.26, 0.9, 1.6, -16.5, -3.4, scaleC(col, 0.55)); // skirt
    F.box('stucco', a - 1.25, a + 1.25, 0.7, 3.6, -3.2, 0, WHITE); // cab
    F.face('glass', a - 1.0, a + 1.0, 2.2, 3.3, 0.02, null);
    F.box('neon', a - 1.0, a + 1.0, 1.0, 1.15, 0.0, 0.04, [2.4, 2.3, 2.0]);
    for (const b of [-1.2, -6, -7.4, -14, -15.4]) for (const s of [-1, 1]) F.box('concrete', a + s * 1.1 - 0.2, a + s * 1.1 + 0.2, 0, 1.0, b - 0.5, b + 0.5, DARK);
  }
}

/** Paddock club: a long glazed VIP pavilion under a row of white tensile sails. */
export function paddockClub(F, r, W = 64, D = 18) {
  F.box('trim', -W / 2, W / 2, 0, 0.6, -D, 0, WHITE);
  F.box('stucco', -W / 2, W / 2, 0.6, 4.6, -D + 1, -1, rgb(0x3a3f4a));
  F.face('winLit', -W / 2 + 0.5, W / 2 - 0.5, 0.9, 4.3, -0.98, GLASS_LIT);
  F.box('stucco', -W / 2 + 2, W / 2 - 2, 4.6, 8, -D + 3, -3, rgb(0x2f343e));
  F.face('winLit', -W / 2 + 2.5, W / 2 - 2.5, 5, 7.6, -2.98, [1.25, 1.12, 0.9]);
  const bay = 8;
  for (let a = -W / 2; a < W / 2 - 0.1; a += bay) {
    const a1 = Math.min(W / 2, a + bay), am = (a + a1) / 2;
    F.box('metal', am - 0.12, am + 0.12, 0.6, 12.5, -D / 2 - 0.1, -D / 2 + 0.1, STEEL);
    const peak = F.at(am, 12.5, -D / 2);
    const c = [F.at(a, 8.6, 1.5), F.at(a1, 8.6, 1.5), F.at(a1, 9.4, -D - 0.5), F.at(a, 9.4, -D - 0.5)];
    F.mb.color = WHITE;
    for (let k = 0; k < 4; k++) {
      F.mb.triFacing('fabric', c[k], c[(k + 1) % 4], peak, [0, 1, 0]);
      F.mb.triFacing('fabric', c[k], peak, c[(k + 1) % 4], [0, -1, 0]);
    }
  }
  F.box('neon', -W / 2, W / 2, 0.6, 0.66, -0.02, 0.02, [2.6, 2.4, 2.0]);
}

/** Circuit medical centre: white block, red cross, helipad on the roof. */
export function medicalCentre(F, r) {
  const W = 20, D = 13, H = 5.5;
  F.box('stucco', -W / 2, W / 2, 0, H, -D, 0, WHITE);
  F.box('trim', -W / 2, W / 2, 0, 0.5, -D, 0.02, rgb(0xc8242b));
  for (let a = -W / 2 + 1; a < W / 2 - 4; a += 3) F.face('winLit', a, a + 2, 1.6, 3.8, 0.02, [1.1, 1.15, 1.2]);
  F.box('neon', W / 2 - 3.6, W / 2 - 1.2, 2.3, 3.0, 0.02, 0.08, [2.6, 0.3, 0.3]);
  F.box('neon', W / 2 - 2.75, W / 2 - 2.05, 1.45, 3.85, 0.02, 0.08, [2.6, 0.3, 0.3]);
  F.cylinder('concrete', 0, -D / 2, 5.5, H, H + 0.1, 20, rgb(0x3a3d42));
  F.cylinder('trim', 0, -D / 2, 4.9, H + 0.1, H + 0.12, 20, rgb(0xffc21a));
  F.cylinder('concrete', 0, -D / 2, 4.6, H + 0.12, H + 0.14, 20, rgb(0x3a3d42));
  F.box('trim', -1.6, -1.0, H + 0.14, H + 0.16, -D / 2 - 1.8, -D / 2 + 1.8, WHITE);
  F.box('trim', 1.0, 1.6, H + 0.14, H + 0.16, -D / 2 - 1.8, -D / 2 + 1.8, WHITE);
  F.box('trim', -1.0, 1.0, H + 0.14, H + 0.16, -D / 2 - 0.3, -D / 2 + 0.3, WHITE);
  F.box('metal', W / 2 - 1, W / 2 - 0.9, H, H + 4, -D + 1, -D + 1.1, STEEL);
  F.mb.color = rgb(0xff7a1a);
  F.mb.triFacing('fabric', F.at(W / 2 - 0.95, H + 4, -D + 1.05), F.at(W / 2 - 0.95, H + 3.4, -D + 1.05), F.at(W / 2 + 1.2, H + 3.75, -D + 1.05), [0, 0, 1]);
}

/** Broadcast compound: outside-broadcast trucks in a row and a bank of satellite dishes. */
export function broadcastCompound(F, r, W = 40, D = 22) {
  F.box('concrete', -W / 2, W / 2, 0, 0.05, -D, 0, rgb(0x55575c));
  for (let k = 0; k < 5; k++) {
    const a = -W / 2 + 4 + k * 6.5;
    F.box('stucco', a - 1.25, a + 1.25, 0.8, 4, -14, -1.5, k % 2 ? rgb(0xe8eaee) : rgb(0x30343c));
    F.box('neon', a - 1.26, a + 1.26, 3.2, 3.4, -14, -1.5, k % 2 ? [0.4, 1.4, 2.6] : [2.6, 0.9, 0.3]);
    F.box('stucco', a - 1.25, a + 1.25, 0.7, 3.4, -1.5, 0.8, WHITE);
  }
  for (let k = 0; k < 4; k++) dish(F, -W / 2 + 6 + k * 9, 0, -D + 3, 1.6 + (k % 2) * 0.8);
}

function dish(F, a, y, b, R) {
  F.box('metal', a - 0.15, a + 0.15, y, y + 2.4, b - 0.15, b + 0.15, STEEL);
  const cy = y + 2.4 + R * 0.8, tilt = 0.75; // faces up and towards +b
  const ring = [];
  for (let k = 0; k < 12; k++) {
    const t = (k / 12) * Math.PI * 2, u = Math.cos(t) * R, v = Math.sin(t) * R;
    ring.push(F.at(a + u, cy + v * Math.cos(tilt), b - v * Math.sin(tilt)));
  }
  const centre = F.at(a, cy - 0.25 * Math.sin(tilt), b - 0.25 * Math.cos(tilt));
  F.mb.color = rgb(0xe6e8ec);
  for (let k = 0; k < 12; k++) {
    F.mb.triFacing('trim', ring[k], ring[(k + 1) % 12], centre, [0, Math.sin(tilt), Math.cos(tilt)]);
    F.mb.triFacing('trim', ring[k], centre, ring[(k + 1) % 12], [0, -Math.sin(tilt), -Math.cos(tilt)]);
  }
}

/** Merchandise street: team stores with lit counters and coloured awnings. */
export function merchRow(F, r, W = 36) {
  const n = Math.floor(W / 6);
  for (let k = 0; k < n; k++) {
    const a = -W / 2 + 3 + k * 6, col = teamColour(k + Math.floor(r() * 10));
    F.box('stucco', a - 2.6, a + 2.6, 0, 3.4, -5, 0, rgb(0xeceae4));
    F.face('winLit', a - 2.2, a + 2.2, 0.9, 2.6, 0.02, [1.4, 1.25, 1.0]);
    F.box('stucco', a - 2.6, a + 2.6, 3.4, 4.2, -5, 0.1, col);
    F.mb.color = col;
    F.mb.quad('fabric', F.at(a - 2.6, 3.2, 0), F.at(a + 2.6, 3.2, 0), F.at(a + 2.6, 2.7, 1.8), F.at(a - 2.6, 2.7, 1.8));
  }
}

/**
 * Lay out a paddock around a circuit: hospitality and transporters behind the
 * pits, then the paddock club, medical centre, TV compound, merchandise rows
 * and extra hospitality suites wherever there's room near the track.
 */
export function buildPaddock(kit, L, R, test, { scatter = true } = {}) {
  const side = L.pit.side;
  let n = 0;
  // Team hospitality and transporters behind the pit building.
  let team = 0;
  for (let s = -90; s < 110; s += 25) {
    const fr = kit.frontage((s + L.length) % L.length, side, 46);
    const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 23, 15, 1.5, test);
    if (F) { teamHospitality(F, R, teamColour(team++)); n++; }
    const tr = kit.frontage((s + L.length) % L.length, side, 66);
    const T = kit.lot(tr.x, tr.z, tr.dirX, tr.dirZ, 22, 17, 1, test);
    if (T) { transporterRow(T, R, 6, team * 2); n++; }
  }
  if (!scatter) return n; // the rest stands on the venue's roads (backOfHouse.js)
  const scan = (W, D, extra, from, mk, tries = 160) => {
    for (let k = 0; k < tries; k++) {
      const s = (from + k * 29) % L.length;
      for (const sd of ['L', 'R']) {
        const fr = kit.frontage(s, sd, extra);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, W, D, 2, test);
        if (F) { mk(F); n++; return true; }
      }
    }
    return false;
  };
  scan(64, 19, 14, Math.round(L.length * 0.04), (F) => paddockClub(F, R));
  scan(20, 13, 12, Math.round(L.length * 0.3), (F) => medicalCentre(F, R));
  scan(40, 22, 20, Math.round(L.length * 0.12), (F) => broadcastCompound(F, R));
  for (let k = 0; k < 4; k++) scan(36, 7, 16, Math.round(L.length * (0.2 + k * 0.2)), (F) => merchRow(F, R));
  // Hospitality suites spread around the lap (corporate and team guests at the best corners).
  for (let k = 0; k < 10; k++) scan(23, 15, 18 + (k % 3) * 8, Math.round(L.length * (0.07 + k * 0.093)), (F) => teamHospitality(F, R, teamColour(team++)));
  return n;
}
