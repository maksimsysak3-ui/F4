import { rgb, scaleC, Frame } from './street/kit.js?v=a5d31c9';

/*
 * Back-of-house props: road vehicles, cranes, building sites, camera towers,
 * cabins, containers, TV uplinks, bus terminals, helipads, gates. All draw
 * through a Frame (a across, y up, b forward / towards the front). Circuits
 * pick, colour and place them; nothing here knows where it stands.
 */

const GLASS = [0.06, 0.07, 0.08], TYRE = [0.05, 0.05, 0.055], STEEL = rgb(0x8a929e), DARK = rgb(0x2a2e36), WHITE = rgb(0xf2f2ee);
const LAMP = [1.6, 1.5, 1.3], TAIL = [0.9, 0.08, 0.06];

/** A sub-frame at local (a, b), rotated by `ang` (radians, about up). */
export function sub(F, a, b, ang = 0, y = 0) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const rx = F.r[0] * c + F.f[0] * s, rz = F.r[1] * c + F.f[1] * s;
  const o = F.at(a, y, b);
  return new Frame(F.mb, o[0], o[1], o[2], rx, rz);
}

/** A straight bar between two points (square section t), for lattices, booms and stays. */
export function bar(F, key, a0, y0, b0, a1, y1, b1, t, col) {
  const h = t / 2;
  if (Math.abs(y1 - y0) < 1e-3) {
    // Horizontal: a box rotated in plan.
    const da = a1 - a0, db = b1 - b0, l = Math.hypot(da, db) || 1, na = -db / l * h, nb = da / l * h;
    F.mb.color = col;
    const ring = (y) => [F.at(a0 + na, y, b0 + nb), F.at(a1 + na, y, b1 + nb), F.at(a1 - na, y, b1 - nb), F.at(a0 - na, y, b0 - nb)];
    F.mb.hexa(key, ring(y0 - h), ring(y0 + h));
    return;
  }
  const sq = (a, b) => [[a - h, b - h], [a + h, b - h], [a + h, b + h], [a - h, b + h]];
  F.block(key, sq(a0, b0), sq(a1, b1), y0, y1, col);
}

const wheels = (F, key, half, axles, r = 0.34, w = 0.24) => {
  for (const b of axles) for (const s of [-1, 1]) F.box(key, s * half - w / 2, s * half + w / 2, 0, r * 2, b - r, b + r, TYRE);
};

// ---- road vehicles (facing +b, centred) -----------------------------------------------------------
export const VEHICLES = {
  car(F, col, key = 'body') {
    F.box(key, -0.88, 0.88, 0.28, 0.92, -2.2, 2.2, col);
    F.box(key, -0.78, 0.78, 0.92, 1.38, -1.25, 0.85, GLASS);
    F.box(key, -0.76, 0.76, 1.38, 1.45, -1.15, 0.7, col);
    F.box(key, -0.8, -0.5, 0.62, 0.78, 2.2, 2.23, LAMP); F.box(key, 0.5, 0.8, 0.62, 0.78, 2.2, 2.23, LAMP);
    F.box(key, -0.84, -0.5, 0.66, 0.8, -2.23, -2.2, TAIL); F.box(key, 0.5, 0.84, 0.66, 0.8, -2.23, -2.2, TAIL);
    wheels(F, key, 0.8, [-1.35, 1.35], 0.32);
  },
  pickup(F, col, key = 'body') {
    F.box(key, -0.98, 0.98, 0.5, 1.2, -2.8, 2.7, col);
    F.box(key, -0.9, 0.9, 1.2, 1.8, -0.4, 1.4, GLASS);
    F.box(key, -0.9, 0.9, 1.8, 1.88, -0.35, 1.25, col);
    F.box(key, -0.98, 0.98, 1.2, 1.5, -2.8, -0.45, col); // bed sides
    F.box(key, -0.85, 0.85, 1.2, 1.25, -2.7, -0.5, DARK);
    F.box(key, -0.9, -0.55, 0.85, 1.05, 2.7, 2.73, LAMP); F.box(key, 0.55, 0.9, 0.85, 1.05, 2.7, 2.73, LAMP);
    wheels(F, key, 0.88, [-1.7, 1.6], 0.4, 0.3);
  },
  van(F, col, key = 'body') {
    F.box(key, -1.0, 1.0, 0.35, 2.45, -2.6, 1.7, col);
    F.block(key, [[-1, 1.7], [1, 1.7], [1, 2.55], [-1, 2.55]], [[-0.98, 1.7], [0.98, 1.7], [0.98, 2.1], [-0.98, 2.1]], 0.35, 2.0, col);
    F.face(key, -0.9, 0.9, 1.25, 1.95, 2.13, GLASS);
    F.box(key, -1.01, 1.01, 1.4, 1.9, 0.6, 1.6, GLASS);
    wheels(F, key, 0.9, [-1.7, 1.75], 0.34);
  },
  bus(F, col, key = 'body') {
    F.box(key, -1.25, 1.25, 0.32, 3.05, -6, 6, col);
    F.box(key, -1.27, 1.27, 1.45, 2.65, -5.5, 5.4, GLASS);
    F.face(key, -1.15, 1.15, 0.9, 2.8, 6.01, GLASS);
    F.box(key, -0.9, 0.9, 3.05, 3.35, -4, -1.5, scaleC(col, 0.85)); // roof aircon pod
    F.box(key, -1.1, -0.7, 0.5, 0.7, 6, 6.03, LAMP); F.box(key, 0.7, 1.1, 0.5, 0.7, 6, 6.03, LAMP);
    wheels(F, key, 1.1, [-3.8, 3.9], 0.5, 0.32);
  },
  truck(F, col, key = 'body') {
    // Articulated lorry: cab at the front, a long box trailer behind.
    F.box(key, -1.25, 1.25, 0.6, 3.3, 5.0, 7.2, col);
    F.face(key, -1.1, 1.1, 2.0, 3.0, 7.21, GLASS);
    F.box(key, -1.15, 1.15, 3.3, 3.8, 5.2, 6.4, scaleC(col, 0.8)); // roof fairing
    F.box(key, -0.6, 0.6, 0.5, 1.0, -8.5, 5.0, TYRE); // chassis
    F.box(key, -1.27, 1.27, 1.15, 4.0, -8.6, 4.7, [0.92, 0.92, 0.9]);
    F.box(key, -1.28, 1.28, 1.15, 1.35, -8.6, 4.7, scaleC(col, 0.9));
    F.box(key, -1.1, -0.75, 0.75, 0.95, 7.2, 7.23, LAMP); F.box(key, 0.75, 1.1, 0.75, 0.95, 7.2, 7.23, LAMP);
    wheels(F, key, 1.05, [6.2, 3.6, 2.4, -5.6, -6.9, -8.1], 0.5, 0.36);
  },
};

// ---- cranes --------------------------------------------------------------------------------------------
/** Tower crane: lattice mast, slewing cab, jib with trolley and hook, counter-jib with ballast. */
export function towerCrane(F, r, { h = 42, jib = 44, col = rgb(0xf2c200), ang = r() * 6.28, load = true } = {}) {
  const s = 0.95, t = 0.16;
  F.box('concrete', -2.4, 2.4, 0, 1.2, -2.4, 2.4, rgb(0x9a9a96));
  // Mast: four chords, ties and zig-zag bracing on each face.
  for (const [a, b] of [[-s, -s], [s, -s], [s, s], [-s, s]]) F.box('metal', a - t / 2, a + t / 2, 1.2, h, b - t / 2, b + t / 2, col);
  for (let y = 1.2; y < h - 0.1; y += 2.6) {
    const y1 = Math.min(h, y + 2.6);
    bar(F, 'metal', -s, y, -s, s, y, -s, 0.1, col); bar(F, 'metal', -s, y, s, s, y, s, 0.1, col);
    bar(F, 'metal', -s, y, -s, -s, y, s, 0.1, col); bar(F, 'metal', s, y, -s, s, y, s, 0.1, col);
    bar(F, 'metal', -s, y, -s, s, y1, -s, 0.08, col); bar(F, 'metal', s, y, s, -s, y1, s, 0.08, col);
    bar(F, 'metal', -s, y, s, -s, y1, -s, 0.08, col); bar(F, 'metal', s, y, -s, s, y1, s, 0.08, col);
  }
  // Everything above the slewing ring turns together.
  const T = sub(F, 0, 0, ang, h);
  T.box('metal', -1.4, 1.4, 0, 1.2, -1.4, 1.4, col);
  T.box('stucco', 1.1, 2.6, 0.2, 2.6, 0.5, 2.6, WHITE); // operator cab
  T.face('glass', 1.15, 2.55, 1.0, 2.4, 2.61, null);
  // Jib (along +b): two bottom chords and a top chord, diagonals between.
  for (const a of [-0.7, 0.7]) T.box('metal', a - 0.08, a + 0.08, 1.2, 1.36, 1.4, jib, col);
  T.box('metal', -0.08, 0.08, 2.9, 3.06, 1.4, jib - 2, col);
  for (let b = 1.4; b < jib - 2.5; b += 2.4) {
    for (const a of [-0.7, 0.7]) bar(T, 'metal', a, 1.28, b, 0, 2.98, b + 1.2, 0.07, col);
    for (const a of [-0.7, 0.7]) bar(T, 'metal', 0, 2.98, b + 1.2, a, 1.28, b + 2.4, 0.07, col);
  }
  // Counter-jib with concrete ballast, the A-frame apex, pendant stays.
  T.box('metal', -1.0, 1.0, 1.2, 1.5, -14, -1.4, col);
  T.box('concrete', -1.2, 1.2, 0.2, 2.6, -14, -11, rgb(0xb8b8b2));
  T.box('metal', -0.9, 0.9, 1.5, 2.5, -9, -6.5, DARK); // winch
  T.box('metal', -0.12, 0.12, 1.2, 9, -0.12, 0.12, col);
  bar(T, 'metal', 0, 9, 0, 0, 3.0, jib * 0.62, 0.06, STEEL);
  bar(T, 'metal', 0, 9, 0, 0, 1.5, -13.5, 0.06, STEEL);
  // Trolley, hook line and (sometimes) a load of rebar or a skip.
  const tb = 8 + r() * (jib - 14), hy = 1.2 - (6 + r() * (h - 14));
  T.box('metal', -0.9, 0.9, 0.9, 1.2, tb - 0.8, tb + 0.8, DARK);
  T.box('metal', -0.03, 0.03, hy, 0.9, tb - 0.03, tb + 0.03, DARK);
  T.box('metal', -0.25, 0.25, hy - 0.5, hy, tb - 0.25, tb + 0.25, rgb(0xf2c200));
  if (load) T.box('metal', -1.2, 1.2, hy - 1.6, hy - 0.6, tb - 2.4, tb + 2.4, r() < 0.5 ? rgb(0x6a4a3a) : rgb(0x6a6e74));
}

/** Truck-mounted recovery crane parked behind the barriers, boom raised and slewed toward the track. */
export function recoveryCrane(F, r, col = rgb(0xf2c200)) {
  F.box('metal', -1.3, 1.3, 0.6, 1.5, -6, 5.2, col);
  F.box('stucco', -1.3, 1.3, 1.5, 3.2, 3.2, 5.2, col);
  F.face('glass', -1.1, 1.1, 2.2, 3.0, 5.21, null);
  for (const b of [-4.6, -3.2, 2.0, 3.8]) for (const s of [-1, 1]) F.box('concrete', s * 1.1 - 0.25, s * 1.1 + 0.25, 0, 1.1, b - 0.55, b + 0.55, TYRE);
  // Outriggers down on pads.
  for (const b of [-5.4, 2.6]) for (const s of [-1, 1]) {
    F.box('metal', s * 1.3, s * 3.2, 0.7, 1.0, b - 0.2, b + 0.2, col);
    F.box('metal', s * 3.0 - 0.35, s * 3.0 + 0.35, 0, 0.75, b - 0.35, b + 0.35, DARK);
  }
  // Superstructure slewed to the rear, the boom stowed forward over the cab on its rest, hook tied off.
  const T = sub(F, 0, -2.6, Math.PI, 1.5);
  T.box('metal', -1.2, 1.2, 0, 1.4, -1.6, 1.6, col);
  T.box('stucco', 0.5, 1.4, 0.2, 2.2, -1.8, -0.4, rgb(0x2a2e36));
  F.box('metal', -0.15, 0.15, 3.2, 3.9, 4.6, 4.9, DARK); // boom rest on the cab
  bar(F, 'metal', 0, 2.6, -2.6, 0, 3.95, 6.2, 0.62, col);
  bar(F, 'metal', 0, 3.6, 3.5, 0, 3.75, 6.6, 0.5, scaleC(col, 0.9));
  F.box('metal', -0.3, 0.3, 3.2, 3.7, 6.3, 6.8, rgb(0xc8242b));
}

/** Concrete building going up: slabs, columns, a part-built top floor, scaffold netting, hoarding, a crane. */
export function constructionSite(F, r, { W = 30, D = 22, floors = 6, built = 0.7, craneCol = rgb(0xf2c200), netting = rgb(0x2a6a8a), hoarding = rgb(0x1f3f8a), cranes = 1 } = {}) {
  const fh = 3.3, done = Math.max(1, Math.round(floors * built));
  const CON = rgb(0xb4b2ac);
  for (let k = 0; k <= done; k++) F.box('concrete', -W / 2, W / 2, k * fh, k * fh + 0.3, -D, 0, scaleC(CON, 0.95 + (k % 2) * 0.05));
  for (let k = 0; k < done; k++) for (let a = -W / 2 + 0.3; a <= W / 2 - 0.3; a += 6) for (let b = -0.3; b >= -D + 0.3; b -= 6) {
    F.box('concrete', a - 0.25, a + 0.25, k * fh + 0.3, (k + 1) * fh, b - 0.25, b + 0.25, CON);
  }
  // Lower floors closed in with windows already; the top ones open, netting on the scaffold face.
  for (let k = 0; k < Math.max(0, done - 3); k++) {
    F.face('glass', -W / 2 + 0.3, W / 2 - 0.3, k * fh + 0.6, (k + 1) * fh - 0.2, 0.02, null);
  }
  F.box('fabric', -W / 2 - 1.2, W / 2 + 1.2, Math.max(0, done - 3) * fh, done * fh + 1.2, 0.6, 0.7, netting);
  for (let a = -W / 2 - 1.2; a <= W / 2 + 1.2; a += 2.5) F.box('metal', a - 0.04, a + 0.04, 0, done * fh + 1.2, 0.8, 0.9, STEEL);
  // Rebar starter bars sticking out of the top slab, formwork stacks, a skip.
  for (let a = -W / 2 + 0.3; a <= W / 2 - 0.3; a += 6) F.box('metal', a - 0.06, a + 0.06, done * fh + 0.3, done * fh + 1.4, -0.36, -0.24, rgb(0x6a4a3a));
  F.box('trim', -W / 2 + 2, -W / 2 + 6, done * fh + 0.3, done * fh + 1.1, -D + 2, -D + 5, rgb(0xc89a4a));
  // Site hoarding all round with the developer's colours, a gate, cabins stacked two high.
  const hb = 5;
  F.box('trim', -W / 2 - hb, W / 2 + hb, 0, 2.4, hb, hb + 0.1, hoarding);
  F.box('trim', -W / 2 - hb, -W / 2 - hb + 0.1, 0, 2.4, -D - hb, hb, hoarding);
  F.box('trim', W / 2 + hb - 0.1, W / 2 + hb, 0, 2.4, -D - hb, hb, hoarding);
  F.box('trim', -W / 2 - hb, W / 2 + hb, 0, 2.4, -D - hb - 0.1, -D - hb, hoarding);
  cabinStack(sub(F, W / 2 + 1.5, 1.5, Math.PI), r, 2, rgb(0xe8e8e2));
  F.box('metal', -W / 2 - 3.5, -W / 2 - 0.8, 0, 1.3, hb - 4, hb - 1.5, rgb(0xd8a020)); // skip
  for (let k = 0; k < cranes; k++) towerCrane(sub(F, k ? -W / 2 - 2.6 : W / 2 + 2.6, -D / 2 - k * 4), r, { h: (floors + 3) * fh + 4, jib: 34 + r() * 14, col: craneCol });
}

// ---- trackside --------------------------------------------------------------------------------------------
/** TV camera tower: scaffold with a platform, camera on its tripod, an operator and an umbrella. */
export function cameraTower(F, r, h = 7) {
  const s = 1.1;
  for (const [a, b] of [[-s, -s], [s, -s], [s, s], [-s, s]]) F.box('metal', a - 0.05, a + 0.05, 0, h + 1.1, b - 0.05, b + 0.05, STEEL);
  for (let y = 1.5; y < h; y += 1.5) {
    F.box('metal', -s, s, y, y + 0.06, -s - 0.03, -s + 0.03, STEEL);
    F.box('metal', -s - 0.03, -s + 0.03, y, y + 0.06, -s, s, STEEL);
    F.box('metal', s - 0.03, s + 0.03, y, y + 0.06, -s, s, STEEL);
  }
  F.box('trim', -s - 0.1, s + 0.1, h, h + 0.12, -s - 0.1, s + 0.1, rgb(0x8a6a3a));
  F.box('metal', -s, s, h + 0.9, h + 1.0, s - 0.03, s + 0.03, STEEL);
  F.box('metal', -0.25, 0.25, h + 0.9, h + 1.35, 0.1, 0.9, DARK); // camera
  F.box('metal', -0.06, 0.06, h + 0.12, h + 0.9, 0.4, 0.5, DARK);
  F.box('stucco', -0.55, -0.15, h + 0.12, h + 1.65, -0.2, 0.2, rgb(0x1f3f8a)); // operator
  F.box('stucco', -0.5, -0.2, h + 1.65, h + 1.95, -0.15, 0.15, rgb(0xd8a888));
  F.box('metal', -0.03, 0.03, h + 0.12, h + 2.8, -0.6, -0.54, STEEL);
  F.cylinder('fabric', 0, -0.57, 1.4, h + 2.75, h + 2.85, 8, r() < 0.5 ? rgb(0xc8242b) : WHITE);
  // Ladder.
  F.box('metal', -0.35, -0.3, 0, h, -s - 0.15, -s - 0.1, STEEL);
  F.box('metal', 0.3, 0.35, 0, h, -s - 0.15, -s - 0.1, STEEL);
}

/** Site/office cabin: 6 x 2.5 m, windows and door on the front (+b). */
export function cabin(F, r, col = rgb(0xe8e8e2)) {
  F.box('stucco', -3, 3, 0.2, 2.8, -2.5, 0, col);
  F.box('trim', -3.05, 3.05, 2.8, 2.95, -2.55, 0.05, scaleC(col, 0.8));
  F.box('concrete', -3, 3, 0, 0.2, -2.5, 0, DARK);
  F.face('winLit', -2.6, -1.0, 1.1, 2.1, 0.01, [0.9, 0.95, 1.0]);
  F.face('winLit', 0.9, 2.5, 1.1, 2.1, 0.01, [0.9, 0.95, 1.0]);
  F.face('trim', -0.5, 0.4, 0.25, 2.3, 0.01, scaleC(col, 0.6));
}
export function cabinStack(F, r, n = 2, col) {
  for (let k = 0; k < n; k++) cabin(sub(F, 0, 0, 0, k * 2.95), r, col);
  if (n > 1) {
    // External stair to the upper cabin and a walkway rail.
    for (let k = 0; k < 8; k++) F.box('metal', 3.1, 4.1, k * 0.37, k * 0.37 + 0.08, -2.4 + k * 0.28, -2.1 + k * 0.28, STEEL);
    F.box('metal', -3, 4.1, 2.95, 3.05, 0, 1.0, STEEL);
    F.box('metal', -3, 4.1, 3.9, 3.96, 0.95, 1.0, STEEL);
  }
}

/** Shipping container (12 x 2.4 x 2.6), ribbed sides. */
export function container(F, r, col) {
  F.box('metal', -1.2, 1.2, 0, 2.6, -6, 6, col);
  for (let b = -5.6; b < 5.7; b += 0.8) for (const s of [-1, 1]) F.box('metal', s * 1.2 - 0.03, s * 1.2 + 0.03, 0.1, 2.5, b - 0.12, b + 0.12, scaleC(col, 0.82));
  F.face('metal', -1.1, 1.1, 0.1, 2.5, 6.01, scaleC(col, 0.75));
}

/** Satellite uplink dish on a pedestal, tilted to the sky. */
export function dish(F, a, b, rad = 1.6, tilt = 0.75, col = WHITE) {
  F.box('metal', a - 0.25, a + 0.25, 0, rad + 0.3, b - 0.25, b + 0.25, STEEL);
  const n = 12, cy = rad + 0.6, c = Math.cos(tilt), s = Math.sin(tilt);
  const rim = [];
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2, u = Math.cos(t) * rad, v = Math.sin(t) * rad;
    rim.push(F.at(a + u, cy + v * c, b - v * s * 0.6 + 0.3 * s));
  }
  const centre = F.at(a, cy - 0.25 * s, b - 0.35 * c);
  F.mb.color = col;
  for (let k = 0; k < n; k++) {
    F.mb.triFacing('stucco', centre, rim[k], rim[(k + 1) % n], [F.f[0] * c, s, F.f[1] * c]);
    F.mb.triFacing('stucco', centre, rim[(k + 1) % n], rim[k], [-F.f[0] * c, -s, -F.f[1] * c]);
  }
  bar(F, 'metal', a, cy, b + 0.2, a, cy + 0.9 * s, b + 1.2 * c, 0.06, STEEL);
}

/** Broadcast uplink farm: OB trucks nose to tail, a field of dishes, generators and cable runs. */
export function uplinkFarm(F, r, { W = 50, D = 30, livery = [rgb(0x1f3f8a), rgb(0xc8242b), WHITE, rgb(0x1b1b1f)] } = {}) {
  F.box('concrete', -W / 2, W / 2, 0, 0.06, -D, 0, rgb(0x6a6c70));
  for (let a = -W / 2 + 4; a < W / 2 - 4; a += 3.4) VEHICLES.truck(sub(F, a, -8, Math.PI, 0.06), livery[Math.floor(r() * livery.length)], 'stucco');
  for (let a = -W / 2 + 3; a < W / 2 - 2; a += 5) dish(F, a + r(), -D + 8 + r() * 2, 1.4 + r() * 1.2, 0.6 + r() * 0.4);
  for (let a = -W / 2 + 6; a < W / 2 - 6; a += 14) {
    F.box('metal', a - 1.1, a + 1.1, 0, 2.2, -D + 0.8, -D + 4.8, rgb(0x3a5a3a)); // generator
    F.box('metal', a + 0.4, a + 0.7, 2.2, 3.0, -D + 1.2, -D + 1.5, DARK);
  }
  F.box('trim', -W / 2, W / 2, 0.06, 0.18, -2.2, -1.6, rgb(0xd8a020)); // cable ramp
}

/** Shuttle bus terminal: a canopy, queue rails, buses in bays. */
export function busTerminal(F, r, { n = 6, col = rgb(0x1f6ad8), canopy = WHITE } = {}) {
  const pitch = 5;
  const W = n * pitch + 6;
  F.box('concrete', -W / 2, W / 2, 0, 0.18, 0, 6, rgb(0xb8b6b0));
  for (let a = -W / 2 + 2; a <= W / 2 - 2; a += 6) F.box('metal', a - 0.12, a + 0.12, 0.18, 4.2, 4.6, 4.84, STEEL);
  F.box('trim', -W / 2, W / 2, 4.2, 4.5, 1.2, 6.6, canopy);
  for (let a = -W / 2 + 2; a < W / 2 - 2; a += 1.8) F.box('metal', a, a + 1.2, 0.18, 1.1, 2.2, 2.26, STEEL);
  for (let k = 0; k < n; k++) {
    const a = -((n - 1) * pitch) / 2 + k * pitch;
    F.box('trim', a - 2.4, a - 2.3, 0, 0.02, -13, -0.2, WHITE);
    if (r() < 0.85) VEHICLES.bus(sub(F, a, -6.6, Math.PI * 0, 0), col, 'stucco');
  }
}

/** Helipad: concrete disc with the H and the circle, a medical helicopter and the windsock. */
export function helipad(F, r, heli = rgb(0xc8242b)) {
  F.cylinder('concrete', 0, 0, 11, 0, 0.25, 20, rgb(0x8a8a86));
  F.cylinder('trim', 0, 0, 9, 0.25, 0.27, 20, WHITE);
  F.cylinder('concrete', 0, 0, 8.6, 0.27, 0.29, 20, rgb(0x8a8a86));
  F.box('trim', -2.4, -1.6, 0.29, 0.31, -3, 3, WHITE); F.box('trim', 1.6, 2.4, 0.29, 0.31, -3, 3, WHITE); F.box('trim', -1.6, 1.6, 0.29, 0.31, -0.4, 0.4, WHITE);
  // Helicopter parked off the H.
  const H = sub(F, 5, 3, 0.4, 0.3);
  H.box('stucco', -1.0, 1.0, 0.6, 2.4, -1.6, 2.2, heli);
  H.block('stucco', [[-1, 2.2], [1, 2.2], [1, 2.2], [-1, 2.2]], [[-0.7, 3.4], [0.7, 3.4], [0.7, 2.2], [-0.7, 2.2]], 0.6, 2.2, heli);
  H.face('glass', -0.9, 0.9, 1.3, 2.2, 2.21, null);
  H.box('stucco', -0.25, 0.25, 1.4, 2.0, -7, -1.6, heli);
  H.box('stucco', -0.05, 0.05, 1.6, 3.1, -7.2, -6.4, heli);
  for (const s of [-1, 1]) H.box('metal', s * 1.0 - 0.06, s * 1.0 + 0.06, 0, 0.12, -1.4, 2.0, DARK);
  H.box('metal', -0.08, 0.08, 2.4, 2.85, -0.1, 0.1, DARK);
  bar(H, 'metal', -5, 2.85, -0.4, 5, 2.85, 0.6, 0.08, DARK);
  bar(H, 'metal', -0.6, 2.85, -5, 0.4, 2.85, 5, 0.08, DARK);
  F.box('metal', 9.6, 9.7, 0.25, 5, 9.6, 9.7, STEEL);
  F.box('fabric', 9.7, 11.4, 4.3, 4.8, 9.6, 9.7, rgb(0xff6a00));
}

/** Entry gate: ticket booths, barrier arms and a gantry with the gate sign, across a road along a. */
export function gate(F, r, { W = 18, col = rgb(0x1f3f8a) } = {}) {
  for (const a of [-W / 2 - 0.6, W / 2 + 0.6]) F.box('metal', a - 0.3, a + 0.3, 0, 7.2, -0.3, 0.3, col);
  F.box('trim', -W / 2 - 0.9, W / 2 + 0.9, 5.8, 7.4, -0.4, 0.4, col);
  F.face('neon', -W / 2 + 1, W / 2 - 1, 6.1, 7.1, 0.41, [1.8, 1.8, 1.8]);
  for (const a of [-W / 4, W / 4]) {
    F.box('stucco', a - 1.1, a + 1.1, 0, 2.6, -1.2, 1.2, WHITE);
    F.box('trim', a - 1.25, a + 1.25, 2.6, 2.8, -1.4, 1.4, col);
    F.face('winLit', a - 0.9, a + 0.9, 1.1, 2.2, 1.21, [0.9, 0.95, 1.0]);
    F.box('metal', a + 1.1, a + 1.1 + W / 4 - 1.6, 0.95, 1.05, -0.05, 0.05, [0.9, 0.12, 0.1]);
  }
}

/** Row of portable toilets (blue boxes) or of food trucks with their awnings out. */
export function loos(F, r, n = 8) {
  for (let k = 0; k < n; k++) {
    const a = -((n - 1) * 1.3) / 2 + k * 1.3;
    F.box('stucco', a - 0.6, a + 0.6, 0, 2.3, -1.2, 0, rgb(0x2a5ab8));
    F.box('stucco', a - 0.62, a + 0.62, 2.3, 2.45, -1.22, 0.02, WHITE);
  }
}
export function foodTrucks(F, r, n = 5, colours = [rgb(0xc8242b), rgb(0xf2c200), rgb(0x2a7a3a), WHITE, rgb(0x1f6ad8)]) {
  for (let k = 0; k < n; k++) {
    const a = -((n - 1) * 8) / 2 + k * 8, col = colours[(k + Math.floor(r() * 5)) % colours.length];
    const T = sub(F, a, -1.2, -Math.PI / 2);
    VEHICLES.van(T, col, 'stucco');
    F.face('winLit', a - 1.6, a + 1.6, 1.2, 2.0, 0.02, [1.4, 1.2, 0.9]);
    F.mb.color = scaleC(col, 0.85);
    F.mb.quad('fabric', F.at(a - 2, 2.5, 0), F.at(a + 2, 2.5, 0), F.at(a + 2, 2.2, 1.6), F.at(a - 2, 2.2, 1.6));
    for (const s of [-1.6, 1.6]) F.box('metal', a + s - 0.4, a + s + 0.4, 0, 0.75, 2.4, 3.2, WHITE); // tables
  }
}

/** Floodlight mast for car parks and compounds. */
export function lightMast(F, h = 16) {
  F.box('metal', -0.18, 0.18, 0, h, -0.18, 0.18, STEEL);
  F.box('metal', -1.2, 1.2, h, h + 0.2, -0.2, 0.2, STEEL);
  for (const a of [-0.9, -0.3, 0.3, 0.9]) F.box('neon', a - 0.22, a + 0.22, h - 0.45, h, -0.35, -0.1, LAMP);
}

/** Tunnel portal: concrete headwall and wing walls round a dark mouth, the road running into it (along -b). */
export function portal(F, { W = 9, H = 5.2, col = rgb(0xb4b2ac) } = {}) {
  F.box('concrete', -W / 2 - 1.2, W / 2 + 1.2, 0, H + 1.4, 0, 1.2, col);
  F.face('concrete', -W / 2, W / 2, 0, H, -0.01, [0.02, 0.02, 0.025], -1);
  F.box('concrete', -W / 2 - 0.6, W / 2 + 0.6, H, H + 0.25, -0.6, 0, scaleC(col, 0.85));
  for (const s of [-1, 1]) F.block('concrete', [[s * (W / 2 + 0.4), 0], [s * (W / 2 + 1.2), 0], [s * (W / 2 + 1.2), -10], [s * (W / 2 + 0.4), -10]],
    [[s * (W / 2 + 0.4), 0], [s * (W / 2 + 1.2), 0], [s * (W / 2 + 1.2), -10], [s * (W / 2 + 0.4), -10]], 0, 1.0, col);
  F.box('trim', -W / 2 - 1.2, W / 2 + 1.2, H + 1.4, H + 1.6, 0, 1.2, scaleC(col, 0.7));
  F.box('neon', -W / 2 + 0.6, W / 2 - 0.6, H - 0.4, H - 0.3, -0.05, 0, [1.6, 1.5, 1.2]);
}
