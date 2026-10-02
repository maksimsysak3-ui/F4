import { rgb, scaleC, pick, PALETTE } from '../street/kit.js';

/**
 * Hand-built structures for Lumen Bay International. Everything draws through
 * a Frame (a along, y up, b out of the front, towards the track).
 */

export const STEEL = rgb(0x8a929e), STEEL_DARK = rgb(0x4a505a), WHITE = rgb(0xeef0f2), CONCRETE = rgb(0x9a9a9e);
const LAMP_LIGHT = [3.2, 3.2, 3.0];

/** Square-section beam from p to q (frame coordinates [a, y, b]). */
export function beam(F, key, p, q, w, color) {
  const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
  const len = Math.hypot(...d) || 1;
  const t = d.map((x) => x / len);
  // Two axes perpendicular to the beam.
  let u = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  let v = cr(t, u); const lv = Math.hypot(...v); v = v.map((x) => x / lv);
  u = cr(v, t);
  const h = w / 2;
  const ring = (c) => [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([i, j]) => F.at(c[0] + (u[0] * i + v[0] * j) * h, c[1] + (u[1] * i + v[1] * j) * h, c[2] + (u[2] * i + v[2] * j) * h));
  F.mb.color = color;
  F.mb.hexa(key, ring(p), ring(q));
}

/**
 * Lattice floodlight mast: four tapering legs with X-bracing, a ladder, a
 * service platform, and a head of lamps aimed at the track (towards +b).
 */
export function floodMast(F, r, H = 26 + r() * 6) {
  const base = 1.0, top = 0.35;
  const leg = (sa, sb) => beam(F, 'metal', [sa * base, 0, sb * base], [sa * top, H, sb * top], 0.14, STEEL);
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) leg(sa, sb);
  const at = (y, sa, sb) => { const k = base + (top - base) * (y / H); return [sa * k, y, sb * k]; };
  for (let y = 0; y < H - 2; y += 2.6) {
    const y1 = y + 2.6;
    for (const [s0, s1, fixed, axis] of [[-1, 1, -1, 'a'], [-1, 1, 1, 'a'], [-1, 1, -1, 'b'], [-1, 1, 1, 'b']]) {
      const P = (yy, s) => (axis === 'a' ? at(yy, s, fixed) : at(yy, fixed, s));
      beam(F, 'metal', P(y, s0), P(y1, s1), 0.05, STEEL);
      beam(F, 'metal', P(y, s1), P(y1, s0), 0.05, STEEL);
    }
  }
  // Platform with railing.
  F.box('metal', -1.6, 1.6, H - 0.15, H, -1.2, 1.2, STEEL_DARK);
  for (const b of [-1.2, 1.2]) F.box('metal', -1.6, 1.6, H + 1.0, H + 1.06, b - 0.03, b + 0.03, STEEL);
  // Lamp head: a frame tilted at the track holding 3 rows of 5 lamps.
  const tilt = 0.45;
  const head = (a, y, b) => [a, H + 1.5 + y * Math.cos(tilt), 0.9 + b + y * Math.sin(tilt) * -1];
  beam(F, 'metal', head(-3.4, 0, 0), head(3.4, 0, 0), 0.12, STEEL_DARK);
  beam(F, 'metal', head(-3.4, 2.9, 0), head(3.4, 2.9, 0), 0.12, STEEL_DARK);
  for (const a of [-3.4, 3.4]) beam(F, 'metal', head(a, 0, 0), head(a, 2.9, 0), 0.12, STEEL_DARK);
  for (let row = 0; row < 3; row++) {
    for (let c = 0; c < 5; c++) {
      const a = -2.7 + c * 1.35, y = 0.45 + row * 0.95;
      const [x0, y0, b0] = head(a, y, 0);
      F.box('metal', x0 - 0.5, x0 + 0.5, y0 - 0.4, y0 + 0.4, b0 - 0.35, b0, rgb(0x2a2e34));
      F.face('flood', x0 - 0.4, x0 + 0.4, y0 - 0.32, y0 + 0.32, b0 + 0.01, LAMP_LIGHT);
    }
  }
  // Aviation light on top.
  F.box('neon', -0.15, 0.15, H + 5, H + 5.3, -0.15, 0.15, [4, 0.3, 0.2]);
}

/**
 * Main grandstand complex (front at b = 0 facing the track, width W):
 * lower tier, VIP boxes, upper tier, sweeping roof on ribs, LED roof edge.
 * Returns seat positions for the crowd and the roof fascia rectangle.
 */
export function mainGrandstand(F, r, W) {
  const seats = [];
  const step = 0.85, rise = 0.5;
  const seatA = rgb(0x1b2a7a), seatB = rgb(0x24369a);
  const tier = (rows, y0, b0) => {
    for (let k = 0; k < rows; k++) {
      const b1 = b0 - k * step, b2 = b1 - step, y = y0 + k * rise;
      F.box('concrete', -W / 2, W / 2, y0 - 0.6, y, b2, b1, CONCRETE);
      F.box('concrete', -W / 2, W / 2, y, y + 0.08, b2 + 0.05, b1, k % 2 ? seatA : seatB);
      F.box('concrete', -W / 2, W / 2, y + 0.08, y + 0.4, b2 + 0.08, b2 + 0.16, scaleC(k % 2 ? seatA : seatB, 0.75));
      for (let a = -W / 2 + 0.4; a < W / 2 - 0.3; a += 0.55) {
        if (Math.abs(((a + W / 2) % 14) - 7) < 0.7) continue; // aisles
        if (r() < 0.8) seats.push(F.at(a, y + 0.08, b1 - 0.45));
      }
    }
    return [y0 + rows * rise, b0 - rows * step];
  };
  // Lower tier from the front wall.
  F.box('concrete', -W / 2, W / 2, 0, 1.6, -0.4, 0.2, WHITE);
  const [yL, bL] = tier(12, 1.6, -0.4);
  // VIP level: glass boxes along the back of the lower tier.
  const vy0 = yL + 0.3, vy1 = vy0 + 3.2;
  F.box('concrete', -W / 2, W / 2, yL, vy0, bL - 6, bL, CONCRETE);
  F.box('stucco', -W / 2, W / 2, vy0, vy1, bL - 6, bL - 1, rgb(0x2a2e38));
  for (let a = -W / 2 + 0.5; a < W / 2 - 3; a += 4) {
    F.face('winLit', a, a + 3.6, vy0 + 0.3, vy1 - 0.4, bL - 0.99, [1.3, 1.1, 0.8]);
    F.box('metal', a + 3.6, a + 4, vy0, vy1, bL - 1, bL - 0.9, STEEL_DARK);
  }
  F.box('metal', -W / 2, W / 2, vy0, vy0 + 1.0, bL - 0.4, bL - 0.3, rgb(0x9fb8cc)); // glass balustrade
  F.box('neon', -W / 2, W / 2, vy1 - 0.12, vy1 - 0.04, bL - 0.98, bL - 0.94, [0.5, 1.8, 2.8]);
  // Upper tier above and behind.
  const [yU, bU] = tier(14, vy1 + 0.6, bL - 6);
  F.box('concrete', -W / 2, W / 2, 0, yU + 1, bU - 0.5, bU, CONCRETE); // back wall
  for (const a of [-W / 2, W / 2 - 0.5]) F.box('concrete', a, a + 0.5, 0, yU + 1, bU, 0.2, CONCRETE);
  // Sweeping roof: ribs arching from the back wall out over the front, with a skin and LED edge.
  const roofBack = [bU - 0.5, yU + 2], roofFront = [2, yU + 7];
  const arc = (t) => [roofBack[0] + (roofFront[0] - roofBack[0]) * t, roofBack[1] + (roofFront[1] - roofBack[1]) * t + Math.sin(Math.PI * t) * 3.5];
  const N = 10;
  for (let a = -W / 2; a <= W / 2 + 0.01; a += 9) {
    for (let k = 0; k < N; k++) {
      const [b0, y0] = arc(k / N), [b1, y1] = arc((k + 1) / N);
      beam(F, 'metal', [a, y0, b0], [a, y1, b1], 0.35, WHITE);
    }
    beam(F, 'metal', [a, yU + 1, bU - 0.2], [a, roofBack[1], roofBack[0]], 0.4, WHITE);
  }
  for (let k = 0; k < N; k++) {
    const [b0, y0] = arc(k / N), [b1, y1] = arc((k + 1) / N);
    F.mb.color = rgb(0xd8dde4);
    const p = [F.at(-W / 2 - 1, y0 + 0.2, b0), F.at(W / 2 + 1, y0 + 0.2, b0), F.at(W / 2 + 1, y1 + 0.2, b1), F.at(-W / 2 - 1, y1 + 0.2, b1)];
    F.mb.triFacing('roof', p[0], p[1], p[2], [0, 1, 0]);
    F.mb.triFacing('roof', p[0], p[2], p[3], [0, 1, 0]);
    F.mb.color = rgb(0x8890a0);
    F.mb.triFacing('roof', p[0], p[1], p[2], [0, -1, 0]);
    F.mb.triFacing('roof', p[0], p[2], p[3], [0, -1, 0]);
  }
  const [bE, yE] = arc(1);
  F.box('neon', -W / 2 - 1, W / 2 + 1, yE - 0.3, yE - 0.1, bE - 0.1, bE + 0.1, [0.6, 2.2, 3.0]);
  return { seats, fascia: { a0: -W / 2 - 1, a1: W / 2 + 1, y0: yE - 1.6, y1: yE - 0.35, b: bE + 0.12 } };
}

/**
 * Lumen Hotel: two curved glass slabs straddling a plaza under a lattice
 * gridshell that glows softly in changing colour (the shell nodes carry the light).
 */
export function hotelShell(F, r, W, D) {
  const floors = 11, fh = 3.4, H = floors * fh;
  for (const side of [-1, 1]) {
    const a0 = side < 0 ? -W / 2 : W / 2 - W * 0.32, a1 = a0 + W * 0.32;
    F.box('stucco', a0, a1, 0, H, -D, 0, rgb(0x2e3440));
    for (let f = 0; f < floors; f++) {
      const y = f * fh + 0.6;
      for (let a = a0 + 0.6; a < a1 - 1.6; a += 2.2) {
        const lit = r() < 0.55;
        F.face(lit ? 'winLit' : 'glass', a, a + 1.8, y, y + 2.4, 0.02, lit ? pick(r, [[1.2, 0.95, 0.7], [1.0, 1.0, 1.1]]) : null);
        F.face(lit ? 'winLit' : 'glass', a, a + 1.8, y, y + 2.4, -D - 0.02, lit ? [1.1, 0.95, 0.75] : null, -1);
      }
      F.box('trim', a0, a1, f * fh, f * fh + 0.25, -D - 0.2, 0.2, rgb(0x7a8290)); // slab edges
    }
  }
  // Gridshell: a doubly curved lattice over everything.
  const NX = 18, NZ = 9;
  const node = (i, j) => {
    const u = i / NX, v = j / NZ;
    const a = -W / 2 - 6 + (W + 12) * u, b = 6 - (D + 12) * v;
    const y = H + 3 + Math.sin(Math.PI * u) * 9 + Math.sin(Math.PI * v) * 6 - Math.abs(u - 0.5) * 4;
    return [a, y, b];
  };
  const lightCols = [[0.5, 1.4, 2.6], [1.6, 0.6, 2.4], [0.5, 2.2, 1.6]];
  for (let i = 0; i <= NX; i++) {
    for (let j = 0; j <= NZ; j++) {
      if (i < NX) beam(F, 'metal', node(i, j), node(i + 1, j), 0.12, STEEL);
      if (j < NZ) beam(F, 'metal', node(i, j), node(i, j + 1), 0.12, STEEL);
      if (i < NX && j < NZ) beam(F, (i + j) % 3 ? 'metal' : 'neon', node(i, j), node(i + 1, j + 1), 0.08, (i + j) % 3 ? STEEL : lightCols[(i >> 2) % 3]);
    }
  }
  // Shell edge supports down to the ground at the corners.
  for (const [i, j] of [[0, 0], [NX, 0], [0, NZ], [NX, NZ]]) { const p = node(i, j); beam(F, 'metal', [p[0], 0, p[2]], p, 0.6, STEEL_DARK); }
}

/** Concert stage with lighting truss, spotlights, screen, speaker stacks. Faces +b. */
export function stage(F, r, screens) {
  F.box('concrete', -12, 12, 0, 1.6, -10, 0, rgb(0x1a1c22));
  F.box('stucco', -12, 12, 1.6, 10, -10.4, -9.8, rgb(0x14151a)); // back wall
  screens.push([F.at(-8, 3, -9.78), F.at(8, 3, -9.78), F.at(8, 9, -9.78), F.at(-8, 9, -9.78)]);
  // Truss: two towers and a box truss across the top.
  for (const a of [-11.5, 11.5]) {
    for (const [da, db] of [[-0.4, -0.4], [0.4, -0.4], [0.4, 0.4], [-0.4, 0.4]]) beam(F, 'metal', [a + da, 1.6, -0.6 + db], [a + da, 12, -0.6 + db], 0.06, STEEL);
    for (let y = 2; y < 12; y += 1.2) beam(F, 'metal', [a - 0.4, y, -1.0], [a + 0.4, y + 1.2, -1.0], 0.04, STEEL);
  }
  for (const [db, y] of [[-1.0, 11.6], [-0.2, 11.6], [-1.0, 12.4], [-0.2, 12.4]]) beam(F, 'metal', [-11.9, y, db], [11.9, y, db], 0.07, STEEL);
  for (let a = -11.5; a < 11.5; a += 1.2) beam(F, 'metal', [a, 11.6, -0.6], [a + 1.2, 12.4, -0.6], 0.04, STEEL);
  // Spotlights hanging from the truss, aimed down at the stage and crowd.
  const cols = [[3, 2.6, 2], [0.6, 1.6, 3], [3, 0.6, 2], [0.6, 3, 1.2]];
  for (let a = -10; a <= 10; a += 2.5) {
    F.box('metal', a - 0.25, a + 0.25, 10.9, 11.5, -0.85, -0.35, rgb(0x22252a));
    F.box('neon', a - 0.2, a + 0.2, 10.85, 10.9, -0.8, -0.4, cols[Math.floor(r() * cols.length)]);
  }
  for (const a of [-14, 14]) {
    F.box('stucco', a - 1.2, a + 1.2, 0, 6, -2, 0, rgb(0x15161a));
    for (let y = 0.8; y < 6; y += 1.4) F.cylinder('metal', a, 0.02, 0.45, y, y + 0.05, 10, rgb(0x2a2c32));
  }
}

/** Food truck with a lit serving hatch, awning and a sign. Faces +b. */
export function foodTruck(F, r) {
  const col = pick(r, [rgb(0xc8242b), rgb(0xffc21a), rgb(0x2f9be0), rgb(0x2f6b4a), rgb(0xff7ad9), rgb(0xf2ede2)]);
  F.box('stucco', -3, 3, 0.5, 3.2, -2.3, 0, col);
  F.box('stucco', 3, 4.6, 0.5, 2.4, -2.2, -0.1, scaleC(col, 0.85)); // cab
  F.face('glass', 3.2, 4.5, 1.5, 2.2, 0.01, null);
  F.face('winLit', -2.2, 1.8, 1.3, 2.6, 0.01, [2.0, 1.6, 1.0]);
  F.box('trim', -2.4, 2.0, 1.2, 1.3, 0, 0.5, rgb(0xd8d8d8)); // counter
  F.mb.color = pick(r, PALETTE.parasol);
  F.mb.quad('fabric', F.at(-2.5, 2.9, 0), F.at(2.1, 2.9, 0), F.at(2.1, 2.5, 1.6), F.at(-2.5, 2.5, 1.6));
  F.box('neon', -2.4, 2.0, 3.25, 3.9, -0.4, -0.3, pick(r, [[2.6, 2.2, 0.6], [0.6, 2.4, 2.8], [2.6, 0.6, 1.8]]));
  for (const a of [-2, 2.2, 3.8]) for (const b of [-2.3, 0]) F.cylinder('metal', a, b, 0.42, 0, 0.2, 8, PALETTE.iron);
}

/** Parked car: low-poly body, glasshouse, wheels. Long axis along a. */
export function parkedCar(F, r, a, b, rot) {
  const col = pick(r, [rgb(0xf2f2f2), rgb(0x15161a), rgb(0x8a8f96), rgb(0xc8242b), rgb(0x1f4f9a), rgb(0x3a3d44), rgb(0xd8c8a8)]);
  const ca = Math.cos(rot), sa = Math.sin(rot);
  const P = (x, y, z) => [a + x * ca - z * sa, y, b + x * sa + z * ca];
  const bx = (x0, x1, y0, y1, z0, z1, c, key = 'stucco') => {
    F.mb.color = c;
    const ring = (y) => [P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)].map(([x, yy, z]) => F.at(x, yy, z));
    F.mb.hexa(key, ring(y0), ring(y1));
  };
  bx(-2.2, 2.2, 0.3, 0.95, -0.85, 0.85, col);
  bx(-1.1, 1.0, 0.95, 1.45, -0.75, 0.75, rgb(0x1a2230), 'glass');
  for (const x of [-1.4, 1.4]) for (const z of [-0.86, 0.86]) bx(x - 0.32, x + 0.32, 0, 0.62, z - 0.12, z + 0.12, PALETTE.iron);
}

/** Pedestrian footbridge spanning the track: stair towers, a deck with glass sides and an LED underside. */
export function footbridge(F, span) {
  const y = 7.2;
  for (const s of [-1, 1]) {
    const a = s * (span / 2 + 2.5);
    F.box('stucco', a - 2.5, a + 2.5, 0, y + 3, -2, 2, rgb(0x3a3f4a));
    F.face('winLit', a - 2, a + 2, 1, y + 2.5, 2.02, [0.9, 1.1, 1.4]);
  }
  F.box('concrete', -span / 2, span / 2, y, y + 0.5, -1.6, 1.6, rgb(0x6a707a));
  for (const b of [-1.6, 1.6]) {
    F.box('metal', -span / 2, span / 2, y + 0.5, y + 1.7, b - 0.04, b + 0.04, rgb(0x9fb8cc));
    F.box('metal', -span / 2, span / 2, y + 1.7, y + 1.8, b - 0.08, b + 0.08, STEEL);
  }
  F.box('neon', -span / 2, span / 2, y - 0.04, y, -1.2, 1.2, [0.6, 1.8, 2.8]);
  F.box('metal', -span / 2, span / 2, y + 3.2, y + 3.4, -1.9, 1.9, STEEL_DARK); // canopy
  for (let a = -span / 2; a <= span / 2; a += 4) for (const b of [-1.7, 1.7]) F.box('metal', a - 0.06, a + 0.06, y + 0.5, y + 3.2, b - 0.06, b + 0.06, STEEL);
}

/** Media centre: long glazed block with a cantilevered roof and satellite dishes. Faces +b. */
export function mediaCentre(F, r, W) {
  const H = 12;
  F.box('stucco', -W / 2, W / 2, 0, H, -16, 0, rgb(0x353a46));
  for (let f = 0; f < 3; f++) {
    for (let a = -W / 2 + 1; a < W / 2 - 1; a += 3) {
      const lit = r() < 0.7;
      F.face(lit ? 'winLit' : 'glass', a, a + 2.7, f * 4 + 0.6, f * 4 + 3.4, 0.02, lit ? [1.0, 1.05, 1.15] : null);
    }
    F.box('trim', -W / 2, W / 2, f * 4, f * 4 + 0.3, -0.2, 0.4, WHITE);
  }
  F.box('trim', -W / 2 - 2, W / 2 + 2, H, H + 0.6, -18, 4, WHITE);
  F.box('neon', -W / 2 - 2, W / 2 + 2, H - 0.05, H + 0.05, 3.9, 4.0, [2.4, 2.4, 2.6]);
  for (let k = 0; k < 4; k++) {
    const a = -W / 2 + 6 + k * (W - 12) / 3;
    F.cylinder('metal', a, -10, 0.15, H + 0.6, H + 2.6, 6, STEEL);
    F.cylinder('trim', a, -10, 1.6, H + 2.6, H + 2.8, 12, WHITE);
  }
}
