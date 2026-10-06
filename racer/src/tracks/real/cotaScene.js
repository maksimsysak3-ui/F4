import { MeshBasicMaterial } from 'three';
import { MeshBuilder } from '../../car/meshBuilder.js?v=a5d31c9';
import { Frame, rgb, scaleC, pick } from '../street/kit.js?v=a5d31c9';
import { buildRealScene } from './scene.js?v=a5d31c9';
import { transporterRow, paddockClub, teamHospitality, medicalCentre, teamColour } from '../paddock.js?v=a5d31c9';
import { portal, sub, towerCrane, recoveryCrane, cameraTower, cabinStack, container, uplinkFarm, busTerminal, helipad, gate, loos, foodTrucks, lightMast, constructionSite, VEHICLES } from '../backstageProps.js?v=a5d31c9';

/*
 * Circuit of the Americas, handcrafted: rolling Texas grassland with live oaks,
 * the main grandstand under its white canopy along the uphill straight, the
 * huge Turn 1 hillside grandstand, the stadium section stands, the 77 m
 * observation tower wrapped in its red steel veil beside the amphitheatre and
 * Grand Plaza, a pit building with a roof deck under sails, car parks packed
 * with trucks, ranch barns, and downtown Austin on the north-west horizon.
 */

const WHITE = rgb(0xf2f2ee), STEEL = rgb(0x8a929e), DARK = rgb(0x22262c), RED = rgb(0xc8242b), BLUE = rgb(0x1f3f8a);
const SHIRTS = [rgb(0xbf5700), WHITE, RED, BLUE, rgb(0x2a2a2e), rgb(0x6a8ac8), rgb(0xe8d8b0), rgb(0xff8a1a)];

const SPONSORS = [
  ['LONE STAR TELECOM', '#1f3f8a', '#ffffff', '#c8242b', 'bolt'],
  ['MESQUITE BBQ', '#3a2418', '#f2c879', '#e86a2c', 'grain'],
  ['TEXAS CRUDE', '#111214', '#ffd23f', '#c8242b', 'tread'],
  ['ARMADILLO TYRES', '#5a5a5e', '#ffffff', '#ffd23f', 'tread'],
  ['CACTUS COLA', '#1f7a3a', '#ffffff', '#ffd23f', 'wave'],
  ['BIG SKY AIR', '#6ab0e8', '#ffffff', '#1f3f8a', 'wave'],
  ['RODEO ENERGY', '#bf5700', '#ffffff', '#1b1b1f', 'stripes'],
  ['ALAMO BANK', '#f2ead2', '#7a1a1a', '#1f3f8a', 'serif'],
];

/** The main grandstand: concrete tiers with blue seats under a long white canopy on tall raking masts. */
function mainGrandstand(F, r, W, tiers) {
  const seats = [];
  const step = 0.85, rise = 0.55;
  F.box('concrete', -W / 2, W / 2, 0, 3.2, -2, 0.2, rgb(0x4a4e56));
  for (let a = -W / 2 + 3; a < W / 2 - 3; a += 7) F.face('winLit', a, a + 5, 0.4, 2.8, 0.21, [1.25, 1.12, 0.9]);
  for (let k = 0; k < tiers; k++) {
    const y = 3.2 + k * rise, b1 = -2 - k * step, b0 = b1 - step;
    F.box('concrete', -W / 2, W / 2, y - 0.5, y, b0, b1, rgb(0xa4a6aa));
    const col = k % 6 < 3 ? BLUE : scaleC(BLUE, 0.8);
    F.box('trim', -W / 2, W / 2, y, y + 0.07, b0 + 0.05, b1, col);
    F.box('trim', -W / 2, W / 2, y + 0.07, y + 0.42, b0 + 0.06, b0 + 0.14, scaleC(col, 0.75));
    for (let a = -W / 2 + 0.4; a < W / 2 - 0.3; a += 0.55) if (r() < 0.85) seats.push(F.at(a + (r() - 0.5) * 0.1, y + 0.07, b1 - 0.45));
  }
  const depth = 2 + tiers * step, top = 3.2 + tiers * rise;
  F.box('concrete', -W / 2, W / 2, 0, top + 1.2, -depth - 0.5, -depth, rgb(0x6a6e76));
  // Canopy: masts behind the stand leaning forward, tension rods to a white membrane over the seats.
  for (let a = -W / 2; a <= W / 2 + 0.01; a += 18) {
    for (let k = 0; k < 8; k++) {
      const u0 = k / 8, u1 = (k + 1) / 8;
      F.box('metal', a - 0.4, a + 0.4, top + u0 * 16, top + u1 * 16, -depth - 2 + u0 * 3, -depth - 1 + u0 * 3, WHITE);
    }
  }
  const roofY = top + 9;
  for (let k = 0; k < 8; k++) {
    const b0 = -depth + (k / 8) * (depth + 3), b1 = -depth + ((k + 1) / 8) * (depth + 3);
    const y0 = roofY + Math.sin((k / 8) * Math.PI) * 1.4, y1 = roofY + Math.sin(((k + 1) / 8) * Math.PI) * 1.4;
    F.mb.color = WHITE;
    const p = [F.at(-W / 2 - 2, y0, b0), F.at(W / 2 + 2, y0, b0), F.at(W / 2 + 2, y1, b1), F.at(-W / 2 - 2, y1, b1)];
    F.mb.triFacing('roof', p[0], p[1], p[2], [0, 1, 0]);
    F.mb.triFacing('roof', p[0], p[2], p[3], [0, 1, 0]);
  }
  for (let a = -W / 2; a <= W / 2 + 0.01; a += 18) F.box('metal', a - 0.06, a + 0.06, roofY, top + 16, 2.6, 2.8, STEEL);
  return { seats, fascia: { a0: -W / 2, a1: W / 2, y0: 1.0, y1: 3.0, b: 0.22 }, shirts: SHIRTS };
}

/** Temporary hillside grandstand (Turn 1 and around the lap): open steel frame, grey seats, flags, no roof. */
function hillGrandstand(F, r, W, tiers) {
  const seats = [];
  const step = 0.8, rise = 0.62;
  for (let k = 0; k < tiers; k++) {
    const y = 1.2 + k * rise, b1 = -k * step, b0 = b1 - step;
    const col = k % 2 ? rgb(0x9a9ea6) : rgb(0x8a8e96);
    F.box('trim', -W / 2, W / 2, y - 0.08, y, b0, b1, col);
    F.box('trim', -W / 2, W / 2, y, y + 0.38, b0, b0 + 0.08, scaleC(col, 0.8));
    for (let a = -W / 2 + 0.4; a < W / 2 - 0.3; a += 0.55) if (r() < 0.82) seats.push(F.at(a + (r() - 0.5) * 0.1, y, b1 - 0.42));
  }
  const depth = tiers * step;
  for (let a = -W / 2; a <= W / 2 + 0.01; a += 4) {
    for (let k = 0; k < tiers; k += 3) F.box('metal', a - 0.06, a + 0.06, 0, 1.2 + k * rise, -k * step - 0.06, -k * step + 0.06, STEEL);
    F.box('metal', a - 0.06, a + 0.06, 0, 1.2 + tiers * rise, -depth - 0.06, -depth + 0.06, STEEL);
  }
  F.box('trim', -W / 2, W / 2, 0, 1.3, 0, 0.12, DARK);
  const top = 1.2 + tiers * rise;
  for (let a = -W / 2 + 3; a < W / 2; a += 10) {
    F.box('metal', a - 0.05, a + 0.05, top, top + 6, -depth - 0.1, -depth, STEEL);
    const cols = r() < 0.5 ? [RED, WHITE, BLUE] : [BLUE, WHITE, RED];
    cols.forEach((c, k) => F.box('fabric', a, a + 2.6, top + 5.6 - (k + 1) * 0.45, top + 5.6 - k * 0.45, -depth - 0.06, -depth - 0.04, c));
  }
  return { seats, fascia: { a0: -W / 2, a1: W / 2, y0: 0.15, y1: 1.2, b: 0.13 }, shirts: SHIRTS };
}

/** Pit building: white, deep blue glazing, a roof deck shaded by tensile sails. */
const pitTheme = {
  wall: rgb(0xf0f0ec),
  upper(F, hw, i, rc, { H1, DEPTH }) {
    const top = H1 + 3.6;
    F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.5, -0.6, rgb(0xe4e6ea));
    F.face(i % 4 === 1 ? 'winLit' : 'glass', -hw + 0.3, hw - 0.3, H1 + 0.4, top - 0.4, -0.58, [1.1, 1.05, 0.95]);
    F.box('trim', -hw, hw, top, top + 0.3, -DEPTH, 1.5, WHITE);
    F.box('metal', -hw, hw, top + 0.3, top + 1.3, 1.4, 1.5, rgb(0x9fb8cc));
    // Sail over every second module: a white triangle peaked on a mast.
    if (i % 2 === 0) {
      F.box('metal', -0.08, 0.08, top + 0.3, top + 6, -DEPTH + 1, -DEPTH + 1.2, STEEL);
      F.mb.color = WHITE;
      F.mb.triFacing('fabric', F.at(-hw - 2, top + 3, 1.4), F.at(hw + 2, top + 3, 1.4), F.at(0, top + 6, -DEPTH + 1.1), [0, 1, 0]);
      F.mb.triFacing('fabric', F.at(-hw - 2, top + 3, 1.4), F.at(0, top + 6, -DEPTH + 1.1), F.at(hw + 2, top + 3, 1.4), [0, -1, 0]);
    }
    if (rc) {
      F.box('stucco', -hw + 0.8, hw - 0.8, top + 0.3, top + 5, -DEPTH + 2, -1, rgb(0xe4e6ea));
      F.face('winLit', -hw + 1, hw - 1, top + 0.8, top + 4.6, -0.98, [1.2, 1.25, 1.3]);
    }
  },
};

/** Thin steel tube between two frame-space points [a, y, b]. */
function tube(F, p, q, w, col) {
  const A = F.at(...p), B = F.at(...q);
  const d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
  const l = Math.hypot(...d) || 1;
  d[0] /= l; d[1] /= l; d[2] /= l;
  const up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  let u = [d[1] * up[2] - d[2] * up[1], d[2] * up[0] - d[0] * up[2], d[0] * up[1] - d[1] * up[0]];
  const ul = Math.hypot(...u);
  u = u.map((v) => (v / ul) * w);
  const v = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
  const ring = (P) => [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([su, sv]) => [P[0] + u[0] * su + v[0] * sv, P[1] + u[1] * su + v[1] * sv, P[2] + u[2] * su + v[2] * sv]);
  F.mb.color = col;
  F.mb.hexa('metal', ring(A), ring(B));
}

/** The observation tower: a 77 m concrete column inside a red steel veil, with a glass deck. */
function observationTower(F) {
  const H = 77;
  F.cylinder('concrete', 0, 0, 1.8, 0, H - 6, 12, rgb(0xd8d4cc));
  F.cylinder('concrete', 0, 0, 3.4, 0, 3, 12, rgb(0xc8c4bc));
  F.cylinder('trim', 0, 0, 7, H - 6, H - 5.4, 16, WHITE);
  F.cylinder('glass', 0, 0, 6.6, H - 5.4, H - 1.4, 16, null);
  F.cylinder('trim', 0, 0, 7.4, H - 1.4, H - 0.8, 16, WHITE);
  F.cylinder('winLit', 0, 0, 6.4, H - 5, H - 2, 16, [1.4, 1.25, 1.0]);
  // The veil: 18 red tubes from the deck rim to a ring on the ground, each twisted a quarter turn,
  // so together they draw a waisted hyperboloid around the column; two rings tie them together.
  const N = 18, seg = 8;
  const veil = (k, u) => {
    const t = (k / N) * Math.PI * 2 + u * 1.4;
    const rr = 7.4 + (15 - 7.4) * u - Math.sin(u * Math.PI) * 3.2;
    return [Math.cos(t) * rr, H - 3 - (H - 3) * u, Math.sin(t) * rr];
  };
  for (let k = 0; k < N; k++) for (let s = 0; s < seg; s++) tube(F, veil(k, s / seg), veil(k, (s + 1) / seg), 0.16, RED);
  for (const u of [0.35, 0.7]) for (let k = 0; k < N; k++) tube(F, veil(k, u), veil((k + 1) % N, u), 0.1, RED);
  F.cylinder('roof', 0, 0, 19, 9, 9.6, 20, RED); // canopy over the plaza
}

/** Amphitheatre beside the tower: a fan of seating facing a covered stage. */
function amphitheatre(F) {
  for (let k = 0; k < 14; k++) {
    const rr = 20 + k * 2, y = k * 0.75;
    for (let s = 0; s < 16; s++) {
      const t0 = -1.15 + (s / 16) * 2.3, t1 = t0 + 2.3 / 16;
      const ring = [[Math.sin(t0) * rr, -Math.cos(t0) * rr], [Math.sin(t1) * rr, -Math.cos(t1) * rr], [Math.sin(t1) * (rr + 2), -Math.cos(t1) * (rr + 2)], [Math.sin(t0) * (rr + 2), -Math.cos(t0) * (rr + 2)]];
      F.block('concrete', ring, ring, y, y + 0.75, k % 2 ? rgb(0x9a9a9e) : rgb(0x8a8a8e));
    }
  }
  F.box('stucco', -14, 14, 0, 1.4, -9, 3, DARK);
  F.box('metal', -15, 15, 13, 13.6, -11, 5, WHITE);
  for (const a of [-14.5, 14.5]) F.box('metal', a - 0.35, a + 0.35, 0, 13, -10.5, -10, STEEL);
  F.face('neon', -10, 10, 2.5, 9, -8.9, [0.6, 1.2, 2.4]);
}

/** Team building in the paddock: a two-storey glass box with a team-colour band. */
function teamBuilding(F, col) {
  F.box('stucco', -10, 10, 0, 8, -14, 0, rgb(0x2a2e36));
  F.face('glass', -9.6, 9.6, 0.4, 7.6, 0.02, null);
  F.face('winLit', -9.6, 9.6, 0.4, 3.6, 0.03, [1.25, 1.15, 1.0]);
  F.box('stucco', -10.2, 10.2, 8, 8.8, -14.2, 0.4, col);
}

/** Car park row: pickups and SUVs nose to tail. */
function parkingRow(F, r, n = 30) {
  const cols = [0xf2f2ee, 0x1b1b1f, 0x8a929e, 0x9a1418, 0x1f3f8a, 0x5a5a5e, 0xc8b48a, 0x2a4a2a].map(rgb);
  for (let k = 0; k < n; k++) {
    for (const b of [-3.2, 3.2]) {
      if (r() < 0.12) continue;
      const a = -n * 1.6 + 1.6 + k * 3.2, c = pick(r, cols), truck = r() < 0.55;
      F.box('stucco', a - 1.0, a + 1.0, 0.3, 1.25, b - 2.6, b + 2.6, c);
      F.box('stucco', a - 0.95, a + 0.95, 1.25, 1.95, b - (truck ? 0.3 : 1.6), b + (truck ? 1.6 : 1.4), c);
      F.box('glass', a - 0.96, a + 0.96, 1.35, 1.85, b - (truck ? 0.2 : 1.5), b + (truck ? 1.5 : 1.3), null);
    }
  }
}

/** Red ranch barn with a tin roof and a windpump. */
function ranchBarn(F) {
  const W = 14, D = 10, H = 5, red = rgb(0x8a2a22);
  F.box('stucco', -W / 2, W / 2, 0, H, -D, 0, red);
  F.face('trim', -2, 2, 0, 3.6, 0.02, WHITE);
  F.gableRoof('roof', -W / 2, W / 2, -D, 0, H, 3, rgb(0x9aa0a8), red, 0.4);
  F.box('metal', W / 2 + 3, W / 2 + 3.25, 0, 10, -3, -2.75, STEEL);
  for (let k = 0; k < 8; k++) {
    const t = (k / 8) * Math.PI * 2;
    F.box('metal', W / 2 + 3.1 - 0.05, W / 2 + 3.1 + 0.05, 10 + Math.sin(t) * 1.8 - 0.05, 10 + Math.sin(t) * 1.8 + 0.05, -2.95 + Math.cos(t) * 1.8, -2.85 + Math.cos(t) * 1.8, STEEL);
  }
}

/** Downtown Austin on the horizon: a cluster of towers. */
function austinSkyline(F, r) {
  for (let k = 0; k < 34; k++) {
    const a = (r() - 0.5) * 1100, b = (r() - 0.5) * 400;
    const w = 25 + r() * 40, d = 25 + r() * 30, h = 60 + r() * r() * 280;
    const c = scaleC(rgb(pick(r, [0x8a96a6, 0x6e7c8e, 0xa8b4c2, 0x5a6878, 0xc2c8d0])), 0.9 + r() * 0.2);
    F.box('stucco', a - w / 2, a + w / 2, 0, h, b - d / 2, b + d / 2, c);
    if (r() < 0.35) F.box('stucco', a - w / 4, a + w / 4, h, h + 20 + r() * 40, b - d / 4, b + d / 4, scaleC(c, 0.85)); // spire / crown
  }
  // Austin's famous crane count: tower cranes on the towers going up.
  for (let k = 0; k < 9; k++) {
    const a = (r() - 0.5) * 1000, b = (r() - 0.5) * 360, h = 120 + r() * 200, ang = r() * 6.28, j = 60 + r() * 30;
    const col = scaleC(rgb(0xd8b040), 0.8);
    F.box('stucco', a - 2, a + 2, 0, h, b - 2, b + 2, col);
    F.box('stucco', a + Math.cos(ang) * -15 - 1.5, a + Math.cos(ang) * j + 1.5, h, h + 3, b - 1.5, b + 1.5, col);
    F.box('stucco', a - 1, a + 1, h, h + 14, b - 1, b + 1, col);
  }
}

/** Texas live oak: a wide, low, gnarled crown. */
function liveOak(F, r) {
  const h = 6 + r() * 3, spread = 5 + r() * 3;
  F.cylinder('trim', 0, 0, 0.45, 0, h * 0.45, 6, rgb(0x4a3a2a));
  for (let k = 0; k < 6; k++) {
    const t = (k / 6) * Math.PI * 2 + r();
    const rr = spread * (0.3 + r() * 0.3), lr = spread * (0.4 + r() * 0.2), y = h * (0.42 + r() * 0.2);
    F.blob('leaf', Math.cos(t) * rr, Math.sin(t) * rr, lr, y, y + lr * 1.1, 8, scaleC(rgb(pick(r, [0x3e5424, 0x4a6028, 0x36481e])), 0.9 + r() * 0.2));
  }
  F.blob('leaf', 0, 0, spread * 0.5, h * 0.7, h * 0.7 + spread * 0.75, 8, rgb(0x46602a)); // crown top
}

/** Ashe juniper ("cedar") clump: dark, dense and conical. */
function cedar(F, r) {
  const h = 4 + r() * 3;
  F.blob('leaf', 0, 0, 1.6, 0, h * 0.5, 7, rgb(0x2e3e24));
  F.blob('leaf', 0, 0, 1.1, h * 0.5, h, 7, rgb(0x34462a));
}

/**
 * Behind the scenes at the Circuit of the Americas: the paddock gate, F1
 * logistics yard, TV uplink farm, shuttle-bus terminal, medical helipad,
 * recovery cranes and camera towers around the lap, concessions behind the
 * GA banks, and a hotel going up beside the perimeter road.
 */
function backOfHouse({ L, R, kit, bs, placed, frameAt }) {
  const n = { cranes: 0, cams: 0, paddock: 0 };
  const lotBehind = (s, side, extra, W, D, margin = 2) => {
    const fr = kit.frontage(((s % L.length) + L.length) % L.length, side, extra);
    return kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, W, D, margin, null);
  };
  const facing = (fr) => frameAt(fr.x, fr.z, Math.atan2(fr.dirX, fr.dirZ));
  // The tunnel under the main straight: a portal each side, the gate on the paddock side.
  if (net.paddock) {
    portal(facing(net.portalIn), { W: 8 });
    portal(facing(net.portalOut), { W: 8 });
    const g = bs.alongside(net.paddock, { side: 1, offset: -3.5, every: 1000, from: 70 })[0];
    if (g) gate(frameAt(g.x, g.z, Math.atan2(g.dirZ, -g.dirX)), R, { W: 12, col: rgb(0x1f3f8a) });
    // Transporters backed up to the team buildings, nose to the paddock road.
    let team = 0;
    for (const F of bs.roadside(net.paddock, { side: 'in', W: 22, D: 16, every: 24, count: 12, from: 90, apron: null, margin: 1 })) { transporterRow(F, R, 6, team); team += 6; n.paddock++; }
    // Across the road: hospitality units, the paddock club, medical centre, the uplink farm and the F1 logistics yard.
    const out = (o) => bs.roadside(net.paddock, { side: 'out', every: 12, margin: 1, ...o });
    for (const F of out({ W: 64, D: 19, count: 1, from: 120 })) { paddockClub(F, R); n.paddock++; }
    for (const F of out({ W: 23, D: 15, count: 8, from: 60 })) { teamHospitality(F, R, teamColour(n.paddock)); n.paddock++; }
    for (const F of out({ W: 20, D: 13, count: 1, from: 40 })) { medicalCentre(F, R); n.paddock++; }
    for (const F of out({ W: 26, D: 26, count: 1, from: 40 })) { helipad(sub(F, 0, -13), R, rgb(0xc8242b)); placed.helipad = 1; }
    for (const F of out({ W: 52, D: 30, count: 1, from: 40 })) { uplinkFarm(F, R, { livery: [rgb(0x1f3f8a), rgb(0xf2f2ee), rgb(0x1b1b1f), rgb(0xc8242b)] }); placed.uplink = 1; }
  }
  for (const F of bs.roadside(net.spur, { side: 1, W: 70, D: 34, every: 15, count: 1, from: 20 }).concat(bs.roadside(net.ring, { side: 'out', W: 70, D: 34, every: 60, count: 1 }))) {
    const LIVERY = [rgb(0xffd23f), rgb(0xc8242b), rgb(0x1f3f8a), rgb(0x8a929e)];
    for (let k = 0; k < 5; k++) for (let h = 0; h < 2; h++) if (h === 0 || R() < 0.7) container(sub(F, -30 + k * 3, -24, 0, h * 2.6), R, LIVERY[(k + h) % 4]);
    for (let k = 0; k < 6; k++) VEHICLES.truck(sub(F, -8 + k * 4, -9, Math.PI), k % 2 ? rgb(0xffd23f) : rgb(0xf2f2ee), 'stucco');
    for (let k = 0; k < 2; k++) cabinStack(sub(F, 22 + k * 7, -3, 0), R, 2);
    placed.logistics = 1;
    break;
  }
  // Shuttle buses from the downtown park & ride, on the perimeter road.
  for (const F of bs.roadside(net.ring, { side: 'in', W: 44, D: 16, every: 90, from: 150, count: 2, margin: 3 })) { busTerminal(sub(F, 0, -15), R, { n: 7, col: rgb(0x2a5ab8) }); placed.buses = (placed.buses ?? 0) + 1; }
  // A hotel going up across the perimeter road.
  for (const F of bs.roadside(net.ring, { side: 'out', W: 46, D: 36, every: 60, from: 700, count: 1, margin: 4, apron: [0.55, 0.5, 0.42] })) { constructionSite(sub(F, 0, -7), R, { W: 34, D: 22, floors: 9, built: 0.6, cranes: 2, hoarding: rgb(0xbf5700) }); placed.site = 1; }
  // Recovery cranes on the service road behind the slow corners, TV camera towers on the outside of the others.
  for (const c of bs.corners(1 / 70)) {
    if (c.k > 1 / 45 && n.cranes < 8) {
      const C = lotBehind(c.s + 25, c.outside, 9.5, 9, 14, 1);
      if (C) { recoveryCrane(sub(C, 0, -7), R, rgb(0xffd23f)); n.cranes++; }
    }
    const T = lotBehind(c.s - 30, c.outside, -1.4, 2.6, 2.6, 0.5);
    if (T) { cameraTower(sub(T, 0, -1.3), R, 6 + R() * 3); n.cams++; }
  }
  // Concessions and loos on the service road behind the GA banks.
  for (const at of [5, 12, 35, 57, 63, 70]) {
    const s = L.pointS(at), i = Math.floor(s / L.ds) % L.N;
    const sd = L.k[i] > 0 ? 'R' : 'L';
    const Fd = lotBehind(s + 40, sd, 9.5, 42, 6, 1);
    if (Fd) foodTrucks(Fd, R, 5);
    const Fl = lotBehind(s - 50, sd, 9.5, 12, 2, 1);
    if (Fl) loos(Fl, R, 9);
  }
  Object.assign(placed, n);
}

let net = {};

export function buildCotaScene(L) {
  net = {};
  let tx0 = Infinity, tx1 = -Infinity, tz0 = Infinity, tz1 = -Infinity;
  for (let i = 0; i < L.N; i++) { tx0 = Math.min(tx0, L.x[i]); tx1 = Math.max(tx1, L.x[i]); tz0 = Math.min(tz0, L.z[i]); tz1 = Math.max(tz1, L.z[i]); }
  const hills = (x, z) => Math.sin(x * 0.006 + 0.7) * Math.cos(z * 0.005 + 1.3) * 0.6 + Math.sin(x * 0.017 - z * 0.011) * 0.3 + Math.sin(z * 0.04 + x * 0.013) * 0.1;
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

  return buildRealScene(L, {
    name: 'COTA',
    trackside: { suburb: 0.3, skyline: { count: 320, tall: 130, dir: 5.6, spread: 2.4 } },
    seed: 2012,
    margin: 750,
    pitTheme,
    style: {
      kerb: [rgb(0xf2f1ec), rgb(0xc8202a)],
      runoff: 'brand', runoffFloor: [0.075, 0.08, 0.09], stripes: [rgb(0x1f3f8a), rgb(0xf2f1ec)],
      barrier: 'jersey', fence: true, lamps: 'none', verge: 'none', grass: [0.5, 0.58, 0.3],
      sponsors: SPONSORS,
      zoneBrands: ['LONE STAR TELECOM', 'TEXAS CRUDE', 'ARMADILLO TYRES', 'CACTUS COLA', 'BIG SKY AIR', 'RODEO ENERGY'],
      primeBrands: ['LONE STAR TELECOM', 'ALAMO BANK'],
      title: ['COTA', 'UNITED STATES GRAND PRIX', '#1f3f8a', '#ffffff', '#c8242b'],
      bridges: [['RODEO ENERGY', 'HOLD ON TIGHT', '#bf5700', '#ffffff', '#1b1b1f'], ['MESQUITE BBQ', 'LOW & SLOW', '#3a2418', '#f2c879', '#e86a2c']],
      roadName: 'AUSTIN',
      bannerGlow: 0.15,
      boardBorder: '#1f3f8a',
    },
    fascia: ['AUSTIN', 'UNITED STATES GRAND PRIX'],
    fasciaColours: ['#1f3f8a', '#ffffff', '#c8242b'],
    skirtColour: [0.6, 0.58, 0.36],
    relief(x, z, d) { return hills(x, z) * 9 * smooth(30, 200, d); },
    colourAt(x, z, h, slope, d) {
      const n = hills(x * 3.1, z * 3.1);
      const dry = [0.74, 0.68, 0.42], green = [0.5, 0.58, 0.3], dirt = [0.66, 0.54, 0.38];
      let c = d < 50 ? green : dry.map((v, k) => v + (green[k] - v) * Math.max(0, n));
      if (slope > 0.12) c = c.map((v, k) => v + (dirt[k] - v) * Math.min(1, (slope - 0.12) * 4));
      return c;
    },
    water: [{ x: tx1 + 220, z: tz0 - 60, r: 70, colour: 0x3a5a5a }],
    stands: [
      { at: 1, side: 'R', W: 200, tiers: 22, build: mainGrandstand, depth: 22, offset: 90 },
      { at: 2, side: 'R', W: 80, tiers: 16, build: hillGrandstand },
      { at: 4, side: 'outside', W: 140, tiers: 24, build: hillGrandstand, offset: 15 }, // Turn 1 hill
      { at: 6, side: 'outside', W: 70, tiers: 16, build: hillGrandstand },
      { at: 13, side: 'outside', W: 70, tiers: 14, build: hillGrandstand }, // esses
      { at: 36, side: 'outside', W: 70, tiers: 14, build: hillGrandstand }, // T11
      { at: 45, side: 'outside', W: 110, tiers: 18, build: hillGrandstand }, // T12
      { at: 50, side: 'outside', W: 70, tiers: 14, build: hillGrandstand }, // T13-14
      { at: 56, side: 'outside', W: 80, tiers: 16, build: hillGrandstand }, // T15
      { at: 62, side: 'outside', W: 90, tiers: 16, build: hillGrandstand }, // T16-18
      { at: 69, side: 'outside', W: 90, tiers: 18, build: hillGrandstand }, // T19
      { at: 73, side: 'outside', W: 80, tiers: 16, build: hillGrandstand }, // T20
    ],
    roadTheme: { asphalt: 0xc4c0b8, edge: [0.92, 0.92, 0.88], centre: [0.95, 0.75, 0.15], shoulder: [0.55, 0.5, 0.42] },
    // Perimeter road with the car parks on it, the paddock road behind the transporters, the tunnel
    // under the main straight out to the perimeter road, and roads away to the highway and town.
    roads({ bs, kit, L }) {
      net.ring = bs.ring(175);
      const p0 = L.pointS(1), wrap = (v) => ((v % L.length) + L.length) % L.length;
      const lane = (ds, side, extra) => { const f = kit.frontage(wrap(p0 + ds), side, extra); return [f.x, f.z]; };
      const T = -290; // tunnel, before the pit entry
      net.portalIn = kit.frontage(wrap(p0 + T), 'L', 16);
      net.portalOut = kit.frontage(wrap(p0 + T), 'R', 16);
      const pts = [lane(T, 'L', 16), lane(T + 30, 'L', 50)];
      for (let ds = T + 60; ds <= 270; ds += 20) pts.push(lane(ds, 'L', 92));
      net.paddock = bs.path(pts, { w: 7, kind: 'spur', margin: 1 });
      net.spur = bs.spur(net.portalOut.x, net.portalOut.z, 175);
      net.exits = [0.08, 0.42, 0.71].map((f, k) => bs.exitFrom(net.ring, f, { w: k === 0 ? 11 : 8.5 }));
          // The paddock's paved apron, from behind the pit building out to the paddock road.
      for (let ds = T + 50; ds < 270; ds += 30) { const f = kit.frontage(wrap(p0 + ds), 'L', 26); bs.pad(f.x, f.z, f.dirX, f.dirZ, 31, 70, [0.66, 0.65, 0.62]); }
      const PAINT = [0xf2f2ee, 0xf2f2ee, 0x1b1b1f, 0x8a929e, 0x9a1418, 0x1f3f8a, 0x5a5a5e, 0xc8b48a, 0xbf5700];
      bs.traffic(net.ring, { density: 9, mix: { car: 3, pickup: 4, van: 1, bus: 0.6, truck: 0.5 }, palette: PAINT, speed: [9, 12] });
      for (const e of net.exits) bs.traffic(e, { density: 16, mix: { car: 3, pickup: 4, van: 1, bus: 0.4, truck: 1 }, palette: PAINT, speed: [13, 17] });
      bs.traffic(net.spur, { density: 12, mix: { van: 2, truck: 1, car: 1 }, palette: [0xf2f2ee, 0x1b1b1f, 0xbf5700], speed: [6, 8] });
      bs.traffic(net.paddock, { density: 8, mix: { van: 2, car: 1 }, palette: [0xf2f2ee, 0x1b1b1f], speed: [4, 6] });
    },
    landmarks({ L, R, frameAt, kit, group, terrain, placed, bs }) {
      backOfHouse({ L, R, kit, bs, placed, frameAt });
      // The tower and amphitheatre in the stadium section, on the inside of T16-T18.
      const i = L.pointSample[61];
      const s = L.k[i] > 0 ? 1 : -1; // inside
      const tx = L.x[i] + L.nx[i] * s * 70, tz = L.z[i] + L.nz[i] * s * 70;
      if (kit.isFree(tx, tz, 20)) { observationTower(frameAt(tx, tz)); placed.tower = 1; }
      const ax = L.x[i] + L.nx[i] * s * 130, az = L.z[i] + L.nz[i] * s * 130;
      if (kit.isFree(ax, az, 30)) { amphitheatre(frameAt(ax, az, Math.atan2(tx - ax, tz - az))); placed.amphitheatre = 1; }
      // Paddock: team buildings in a row behind the pits.
      const TEAM = [0xc8102e, 0xff7a12, 0x1e2a5a, 0x00a19c, 0x2a7a3a, 0x1b1b1f, 0x6a8ac8, 0xd8d8d8, 0xffd23f, 0x6a1b9a].map(rgb);
      let teams = 0;
      for (let ss = -40; ss < 220; ss += 26) {
        const fr = kit.frontage((ss + L.length) % L.length, 'L', 48);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 21, 15, 1.5, null);
        if (F) { teamBuilding(F, TEAM[teams % TEAM.length]); teams++; }
      }
      placed.teams = teams;
      // Car parks off the perimeter road (rows of pickups and SUVs), floodlit.
      let lots = 0;
      for (const F of bs.roadside(net.ring, { side: 'out', W: 104, D: 26, every: 118, count: 60, margin: 4, apron: [0.42, 0.41, 0.4] })) {
        parkingRow(sub(F, 0, -8), R, 32);
        parkingRow(sub(F, 0, -21), R, 32);
        lightMast(sub(F, -30, -14.5)); lightMast(sub(F, 30, -14.5));
        lots++;
      }
      placed.carparks = lots;
      // General admission: fans on the grass banks (rugs, standing groups, flags), as at T1, the esses and T15-T19.
      let ga = 0;
      const gaBank = (at, side, W, D) => {
        const s = L.pointS(at);
        const i = Math.floor(s / L.ds) % L.N;
        const sd = side === 'outside' ? (L.k[i] > 0 ? 'R' : 'L') : side;
        const fr = kit.frontage(s, sd, 6);
        const rx = fr.dirZ, rz = -fr.dirX;
        const fans = [];
        const yaw = Math.atan2(-fr.dirX, -fr.dirZ);
        for (let k = 0; k < W * D * 0.09; k++) {
          const a = (R() - 0.5) * W, b = R() * D;
          const x = fr.x + rx * a + fr.dirX * b, z = fr.z + rz * a + fr.dirZ * b;
          if (!kit.isFree(x, z, 0.5) || kit.overlaps({ cx: x, cz: z, ux: 1, uz: 0, hw: 0.4, hd: 0.4 })) continue;
          fans.push({ p: [x, terrain.heightAt(x, z) - 0.02, z], yaw: yaw + (R() - 0.5) * 0.7, seated: R() < 0.55, cheer: R() < 0.25 ? 0.6 : 0 });
        }
        kit.addCrowd(fans, 5000 + at);
        ga += fans.length;
      };
      for (const [at, side, W, D] of [[5, 'outside', 90, 30], [7, 'outside', 60, 20], [12, 'outside', 80, 25], [16, 'outside', 70, 20], [19, 'outside', 60, 20],
        [26, 'outside', 50, 18], [35, 'outside', 60, 20], [52, 'outside', 50, 18], [57, 'outside', 60, 20], [63, 'outside', 70, 25], [70, 'outside', 60, 22]]) gaBank(at, side, W, D);
      // People milling around the Grand Plaza under the tower.
      if (placed.tower) {
        const walkers = [];
        for (let k = 0; k < 260; k++) {
          const t = R() * Math.PI * 2, rr = 20 + R() * 45;
          const x = tx + Math.cos(t) * rr, z = tz + Math.sin(t) * rr;
          if (!kit.isFree(x, z, 1)) continue;
          walkers.push({ p: [x, terrain.heightAt(x, z) - 0.02, z], yaw: R() * 6.28, seated: false, cheer: 0 });
        }
        kit.addCrowd(walkers, 6100);
        ga += walkers.length;
      }
      placed.ga = ga;
      // Ranches on the fringe and downtown Austin far to the north-west.
      for (let k = 0; k < 6; k++) ranchBarn(frameAt(tx1 + 300 + R() * 300, tz0 - 300 + R() * (tz1 - tz0 + 600), R() * 6));
      // Downtown is ~20 km away: drawn at 3.5 km, exempt from the haze but tinted to it, so it reads as distant.
      const sky = new MeshBuilder();
      austinSkyline(new Frame(sky, tx0 - 2600, -10, tz0 - 2200, Math.cos(0.6), -Math.sin(0.6)), R);
      group.add(sky.build({ stucco: new MeshBasicMaterial({ vertexColors: true, fog: false, color: 0xb8bcc6 }) }));
    },
    trees: {
      variants: [liveOak, cedar],
      attempts: 9000,
      scale: [1, 1],
      test(x, z, d, h, R) {
        if (d < 30) return -1;
        const n = hills(x * 2.2, z * 2.2);
        if (n > 0.2) return R() < 0.55 ? 0 : 1; // groves on the rises
        return R() < 0.12 ? 0 : R() < 0.1 ? 1 : -1;
      },
    },
  });
}
