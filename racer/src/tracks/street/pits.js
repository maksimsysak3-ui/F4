import { Frame, PALETTE, rgb } from './kit.js';
import { TEAMS } from './textures.js';

/**
 * Porto Vela pit complex, Monaco style: on the harbour side of the start
 * straight, behind the pit wall (the circuit barrier). Sixteen garages for
 * eight teams with a race-control tower over the start line, a hospitality
 * floor with a balcony canopy, a painted pit lane and pit-wall stands.
 *
 * Purely scenic: the drivable surface is the circuit; the pit lane sits
 * behind the barrier. Each 7 m garage module gets its own Frame from the
 * centreline pose, so the building follows the straight's gentle bow.
 */

const MODULE = 7;           // garage width (m)
const LANE = 8.2;           // barrier back face -> garage facade
const DEPTH = 10.5;         // garage building depth
const G = 4.6;              // ground floor height
const H1 = 8.4;             // roofline of the hospitality floor

const hex3 = (h) => rgb(parseInt(h.slice(1), 16));
const TEAM_COL = TEAMS.map(([, bg, fg, accent]) => ({ bg: hex3(bg), fg: hex3(fg), accent: hex3(accent) }));
const ASPHALT = rgb(0x2b2b30), LINE = rgb(0xeeeeea), YELLOW = rgb(0xffc21a);
const EPOXY = rgb(0xaeb3b8), WALL_IN = rgb(0xdedcd6), RUBBER = rgb(0x18181b);
let WHITE = rgb(0xf4f1ea); // building colour: set per track theme in buildPits

/**
 * @param L layout
 * @param mb MeshBuilder for the complex
 * @param barrierBack (side, i) -> lateral distance of the barrier's back face
 * @param teamRows rows in the team sign atlas (teams + race control)
 */
export function buildPits(L, mb, barrierBack, teamRows, theme = {}) {
  const SIDE = L.pit.side;
  WHITE = theme.wall ?? rgb(0xf4f1ea);
  const sg = SIDE === 'L' ? 1 : -1;
  const wrap = (s) => ((s % L.length) + L.length) % L.length;
  const idx = (s) => Math.round(wrap(s) / L.ds) % L.N;
  // Race control straddles the line; eight garages either side.
  const modules = [];
  for (let k = -8; k <= 8; k++) modules.push(k === 0 ? { s: 0, width: MODULE * 2, rc: true } : { s: k * MODULE + Math.sign(k) * MODULE / 2, width: MODULE });
  const pit = L.pit;
  const s0 = pit.g0, s1 = pit.g1;
  const laneS0 = pit.s0, laneS1 = pit.s1, taper = pit.taper;

  /** Frame at the garage facade line for centreline distance s (facade faces the track). */
  const frameAt = (s, lateralExtra = 0) => {
    const i = idx(s);
    const lat = barrierBack(SIDE, i) + LANE + lateralExtra;
    const p = L.poseAt(wrap(s), sg * lat);
    const fx = -sg * L.nx[i], fz = -sg * L.nz[i]; // out of the facade = towards the track
    return new Frame(mb, p.x, 0, p.z, fz, -fx);
  };

  const people = [];
  const reserved = [];  // OBB footprints so the town keeps clear

  // ---- pit lane surface, lines and tapers ---------------------------------
  const UP = [0, 1, 0];
  const flat = (a, b, c, d, color) => { mb.color = color; mb.triFacing('concrete', a, b, c, UP); mb.triFacing('concrete', a, c, d, UP); };
  const P = (s, lat, y) => { const p = L.poseAt(wrap(s), sg * lat); return [p.x, y, p.z]; };
  for (let s = laneS0; s < laneS1; s += 2) {
    const e = Math.min(s + 2, laneS1);
    const ba = barrierBack(SIDE, idx(s)), bb = barrierBack(SIDE, idx(e));
    const oa = pit.widthAt(s), ob = pit.widthAt(e);
    // Where the barrier is open the lane surface runs right up to the road.
    const ia = pit.barrierAt(s) ? ba : L.edge, ib = pit.barrierAt(e) ? bb : L.edge;
    flat(P(s, ia, 0.03), P(s, ba + oa, 0.03), P(e, bb + ob, 0.03), P(e, ib, 0.03), ASPHALT);
    // White line along the pit wall, dashed fast-lane line.
    if (pit.barrierAt(s) && pit.barrierAt(e)) flat(P(s, ba + 0.25, 0.04), P(s, ba + 0.4, 0.04), P(e, bb + 0.4, 0.04), P(e, bb + 0.25, 0.04), LINE);
    if (oa > 4.2 && ob > 4.2 && Math.floor(s / 2) % 2 === 0) flat(P(s, ba + 4, 0.04), P(s, ba + 4.15, 0.04), P(e, bb + 4.15, 0.04), P(e, bb + 4, 0.04), LINE);
  }
  // Solid yellow lines that peel off the track edge at the entry and rejoin it at the exit.
  for (const [sa, sb] of [[laneS0, laneS0 + taper], [laneS1, laneS1 - taper]]) {
    const n = 20;
    for (let q = 0; q < n; q++) {
      const t0 = q / n, t1 = (q + 1) / n;
      const fa = sa + (sb - sa) * t0, fb = sa + (sb - sa) * t1;
      const la = L.edge + (barrierBack(SIDE, idx(sb)) - L.edge) * t0, lb = L.edge + (barrierBack(SIDE, idx(sb)) - L.edge) * t1;
      flat(P(fa, la, 0.045), P(fa, la + 0.18, 0.045), P(fb, lb + 0.18, 0.045), P(fb, lb, 0.045), YELLOW);
    }
  }
  // Pit-lane speed line: a white bar across the lane at both ends of the garages.
  for (const s of [s0 - 30, s1 + 20]) {
    const b = barrierBack(SIDE, idx(s));
    flat(P(s, b, 0.042), P(s, b + LANE, 0.042), P(s + 0.5, b + LANE, 0.042), P(s + 0.5, b, 0.042), LINE);
  }
  // Outer pit-lane wall wherever it isn't the garage frontage: low concrete, red and white.
  for (let s = laneS0; s < laneS1; s += 2) {
    const e = Math.min(s + 2, laneS1);
    if (pit.garageAt((s + e) / 2)) continue;
    const oa = barrierBack(SIDE, idx(s)) + pit.widthAt(s), ob = barrierBack(SIDE, idx(e)) + pit.widthAt(e);
    mb.color = Math.floor(s / 4) % 2 ? rgb(0xc8242b) : WHITE;
    mb.hexa('concrete', [P(s, oa, 0), P(s, oa + 0.5, 0), P(e, ob + 0.5, 0), P(e, ob, 0)], [P(s, oa + 0.08, 0.9), P(s, oa + 0.42, 0.9), P(e, ob + 0.42, 0.9), P(e, ob + 0.08, 0.9)]);
  }
  // PIT IN / PIT OUT boards where the lanes split and join.
  for (const [s, row] of [[laneS0 + taper + 4, teamRows - 2], [laneS1 - taper - 4, teamRows - 1]]) {
    const F = frameAt(s, -LANE + 0.9);
    F.box('metal', -0.06, 0.06, 0, 2.2, -0.06, 0.06, PALETTE.iron);
    F.box('metal', 1.94, 2.06, 0, 2.2, -0.06, 0.06, PALETTE.iron);
    board(F, -0.3, 2.3, 2.2, 3.1, 0.08, row, teamRows);
    F.box('metal', -0.35, 2.35, 2.15, 3.15, -0.04, 0.06, PALETTE.iron);
  }
  for (let s = laneS0; s < laneS1; s += 12) {
    const e = Math.min(s + 12, laneS1);
    const fa = frameAt((s + e) / 2, -LANE / 2);
    reserved.push({ cx: fa.o[0], cz: fa.o[2], ux: fa.r[0], uz: fa.r[1], hw: (e - s) / 2 + 1, hd: LANE / 2 + 1.5 });
  }

  // ---- garage modules --------------------------------------------------------
  let team = 0;
  for (const [mi, m] of modules.entries()) {
    const F = frameAt(m.s);
    const hw = m.width / 2;
    reserved.push({ cx: F.o[0] - F.f[0] * DEPTH / 2, cz: F.o[2] - F.f[1] * DEPTH / 2, ux: F.r[0], uz: F.r[1], hw: hw + 0.5, hd: DEPTH / 2 + 1 });
    if (m.rc) { raceControl(F, hw, teamRows); continue; }
    const t = team >> 1;
    const col = TEAM_COL[t];
    garage(F, hw, col, t, teamRows, mi, people);
    // One pit-wall stand per team, opposite its first garage.
    if (team % 2 === 0) pitWallStand(frameAt(m.s, -LANE + 1.6), col);
    team++;
  }

  return { reserved, people, zone: (side, i) => side === SIDE && pit.into(i * L.ds) !== null };
}

/** One garage: open bay with a lit interior, hospitality floor above, balcony canopy, team boards. */
function garage(F, hw, col, t, teamRows, mi, people) {
  const D = DEPTH, inner = hw - 0.3;
  // Party walls (shared piers with the neighbours), back block, slab, lintel.
  for (const s of [-1, 1]) F.box('stucco', s > 0 ? inner : -hw, s > 0 ? hw : -inner, 0, G, -D, 0.2, WHITE);
  F.box('stucco', -inner, inner, 0, G, -D, -D + 0.6, WHITE);
  F.box('stucco', -inner, inner, G - 0.7, G, -0.5, 0.05, WHITE);
  F.box('metal', -inner + 0.1, inner - 0.1, G - 1.0, G - 0.7, -0.45, -0.15, rgb(0x5a5f66)); // rolled-up shutter
  // Interior: epoxy floor, team-colour back wall, pale side walls, ceiling with strip lights.
  F.box('concrete', -inner, inner, 0, 0.04, -D + 0.6, -0.5, EPOXY);
  F.face('trim', -inner, inner, 0.04, G - 0.7, -D + 0.61, col.bg);
  F.face('trim', -inner, inner, 2.3, 2.7, -D + 0.63, col.accent);
  for (const s of [-1, 1]) F.sideFace('trim', s * inner, -D + 0.6, -0.5, 0.04, G - 0.7, WALL_IN, -s);
  F.box('trim', -inner, inner, G - 0.75, G - 0.7, -D + 0.6, -0.5, WALL_IN);
  for (const a of [-1.4, 1.4]) F.box('winLit', a - 0.08, a + 0.08, G - 0.82, G - 0.75, -D + 1.2, -1.2, [2.2, 2.4, 2.6]);
  // Tool cabinets along one wall, tyre stacks along the other, a monitor on the back wall.
  F.box('metal', -inner, -inner + 0.6, 0, 1.05, -D + 1.6, -D + 5.2, col.bg);
  F.box('metal', -inner, -inner + 0.62, 1.05, 1.12, -D + 1.6, -D + 5.2, rgb(0x9aa0a6));
  for (let k = 0; k < 3; k++) for (let h = 0; h < 4; h++) F.cylinder('concrete', inner - 0.5, -D + 1.6 + k * 0.8, 0.32, h * 0.3, h * 0.3 + 0.27, 8, RUBBER);
  F.face('winLit', -0.9, 0.9, 1.6, 2.2, -D + 0.64, [0.5, 1.1, 1.8]);
  // Tyre stacks waiting in front of the bay under blankets (team colour).
  for (const a of [-inner + 0.6, inner - 0.6]) {
    for (let h = 0; h < 4; h++) F.cylinder('concrete', a, 1.1, 0.32, h * 0.3, h * 0.3 + 0.27, 8, h === 3 ? col.bg : RUBBER);
  }
  // Painted pit box in the working lane.
  const strip = (a0, a1, b0, b1) => F.box('trim', a0, a1, 0.04, 0.05, b0, b1, col.accent === col.fg ? WHITE : col.accent);
  strip(-2.7, -2.55, 0.6, 4.1); strip(2.55, 2.7, 0.6, 4.1); strip(-2.7, 2.7, 3.95, 4.1);
  // Mechanics in team kit.
  for (const [a, b] of [[-1.2, -2.5], [1.0, -4], [0.4, 2.2]]) if ((mi + a * 10) % 3 !== 0) people.push({ p: F.at(a, 0.04, b), yaw: Math.atan2(F.f[0], F.f[1]) + (b < 0 ? Math.PI * (mi % 2) : 0), shirt: col.bg, pants: col.bg, pose: 'standShort' });

  // Hospitality floor: recessed ribbon glazing between the piers.
  F.box('stucco', -hw, hw, G, H1, -D, -0.7, WHITE);
  for (const s of [-1, 1]) F.box('stucco', s > 0 ? inner : -hw, s > 0 ? hw : -inner, G, H1, -0.7, 0.15, WHITE);
  F.box('stucco', -inner, inner, H1 - 0.55, H1, -0.7, 0.05, WHITE);
  const lit = mi % 3 !== 1;
  F.face(lit ? 'winLit' : 'glass', -inner, inner, G + 0.25, H1 - 0.55, -0.68, [1.15, 0.92, 0.66]);
  for (const a of [-inner / 2, 0, inner / 2]) F.box('metal', a - 0.05, a + 0.05, G + 0.25, H1 - 0.55, -0.7, -0.6, PALETTE.iron);
  F.box('metal', -inner, inner, G + 1.25, G + 1.32, -0.7, -0.6, PALETTE.iron);
  // Balcony slab cantilevered over the working lane, with downlights and a railing.
  F.box('trim', -hw, hw, G - 0.05, G + 0.2, -0.5, 2.6, WHITE);
  for (const a of [-hw / 2, hw / 2]) F.box('winLit', a - 0.25, a + 0.25, G - 0.08, G - 0.05, 1.6, 2.0, [2.4, 2.1, 1.6]);
  F.box('metal', -hw, hw, G + 1.15, G + 1.22, 2.45, 2.55, PALETTE.iron);
  for (let a = -hw; a <= hw + 0.01; a += hw / 2) F.box('metal', a - 0.03, a + 0.03, G + 0.2, G + 1.15, 2.47, 2.53, PALETTE.iron);
  for (let a = -hw + 0.2; a < hw; a += 0.35) F.box('metal', a - 0.012, a + 0.012, G + 0.2, G + 1.15, 2.49, 2.51, PALETTE.iron);
  // Team board on the canopy edge, team colour fascia stripe below it.
  board(F, -hw + 0.1, hw - 0.1, G - 0.65, G - 0.05, 2.62, t, teamRows);
  F.box('trim', -hw, hw, G - 0.7, G - 0.65, 2.45, 2.62, col.accent);
  if ((mi & 1) === 0) people.push({ p: F.at(-1.4, G + 0.2, 1.4), yaw: Math.atan2(F.f[0], F.f[1]) }, { p: F.at(1.7, G + 0.2, 1.9), yaw: Math.atan2(F.f[0], F.f[1]) });

  // Roof: parapet, AC plant, flag poles.
  F.box('stucco', -hw, hw, H1, H1 + 0.15, -D, -0.7, rgb(0xcfcac0));
  F.box('trim', -hw, hw, H1, H1 + 0.8, -0.7, 0.15, WHITE);
  if (mi % 2) {
    F.box('metal', -1.5, 1.5, H1 + 0.15, H1 + 1.2, -D + 2, -D + 4, rgb(0xb8bcc0));
    F.cylinder('metal', -0.7, -D + 3, 0.5, H1 + 1.2, H1 + 1.3, 8, rgb(0x6a6e74));
    F.cylinder('metal', 0.7, -D + 3, 0.5, H1 + 1.2, H1 + 1.3, 8, rgb(0x6a6e74));
  } else {
    F.box('metal', -0.04, 0.04, H1 + 0.8, H1 + 6, -0.3, -0.22, PALETTE.iron);
    flag(F, 0, H1 + 4.6, H1 + 5.9, -0.26, col);
  }
  // Harbour-side elevation: a row of portholes and a service door.
  for (let a = -hw + 1.2; a < hw - 0.8; a += 1.75) F.face(lit ? 'winLit' : 'glass', a - 0.35, a + 0.35, G + 1.2, G + 2.2, -D - 0.02, [1.1, 0.9, 0.6], -1);
  F.face('metal', -0.6, 0.6, 0, 2.3, -D - 0.02, rgb(0x5a5f66), -1);
  F.box('trim', -hw, hw, G - 0.35, G, -D - 0.12, -D, col.bg);
  F.box('trim', -hw, hw, H1 + 0.15, H1 + 0.45, -D - 0.2, -D + 0.2, PALETTE.stone);
  for (const s of [-1, 1]) F.box('trim', s * hw - 0.3, s * hw + 0.3, 0, H1, -D - 0.12, -D + 0.1, PALETTE.stone);
  if ((mi & 1) === 1) {
    const p = [F.at(hw - 0.4, G + 2.6, -D - 0.14), F.at(-hw + 0.4, G + 2.6, -D - 0.14), F.at(-hw + 0.4, G + 3.4, -D - 0.14), F.at(hw - 0.4, G + 3.4, -D - 0.14)];
    F.mb.color = null;
    F.mb.quadUV('team', p[0], p[1], p[2], p[3], [0, t / teamRows], [1, t / teamRows], [1, (t + 1) / teamRows], [0, (t + 1) / teamRows]);
  }
}

/** Two-module race-control tower over the line: lobby, offices, slanted glass control room, sign, mast. */
function raceControl(F, hw, teamRows) {
  const D = DEPTH, stone = PALETTE.stone;
  // Glazed lobby on the ground floor.
  F.box('stucco', -hw, hw, 0, G, -D, -1.2, WHITE);
  F.face('winLit', -hw + 0.6, hw - 0.6, 0.2, G - 0.5, -1.18, [1.3, 1.1, 0.8]);
  for (let a = -hw + 0.6; a <= hw - 0.6 + 0.01; a += (2 * hw - 1.2) / 6) F.box('metal', a - 0.06, a + 0.06, 0.2, G - 0.5, -1.2, -1.05, PALETTE.iron);
  for (const s of [-1, 1]) F.box('trim', s > 0 ? hw - 0.6 : -hw, s > 0 ? hw : -hw + 0.6, 0, G, -1.2, 0.3, stone);
  F.box('trim', -hw, hw, G - 0.5, G, -1.2, 0.3, stone);
  // Office floors.
  const top = 14.2;
  F.box('stucco', -hw, hw, G, top, -D, -0.3, WHITE);
  for (let f = 0; f < 2; f++) {
    const y = G + 0.7 + f * 3.2;
    for (let k = 0; k < 6; k++) {
      const a = -hw + 1.3 + k * ((2 * hw - 2.6) / 5);
      F.box('trim', a - 0.65, a + 0.65, y - 0.15, y + 0.02, -0.3, 0.05, stone);
      F.face(k % 2 || f ? 'winLit' : 'glass', a - 0.5, a + 0.5, y, y + 1.9, -0.28, [1.1, 0.95, 0.75]);
    }
  }
  for (const s of [-1, 1]) F.box('trim', s * hw - (s > 0 ? 0.5 : 0), s * hw + (s < 0 ? 0.5 : 0), 0, top, -D, 0.35, stone);
  // Race-control room: a band of glass that leans out over the pit lane.
  F.box('stucco', -hw + 0.4, hw - 0.4, top, top + 3.2, -D + 0.4, -2.2, WHITE);
  for (let a = -hw + 1.6; a < hw - 1; a += 2.4) F.face('winLit', a - 0.7, a + 0.7, top + 0.8, top + 2.4, -D + 0.38, [1.1, 0.95, 0.75], -1);
  F.block('glass', [[-hw, -2.2], [hw, -2.2], [hw, 0.2], [-hw, 0.2]], [[-hw - 0.4, -2.2], [hw + 0.4, -2.2], [hw + 0.4, 1.6], [-hw - 0.4, 1.6]], top, top + 3.2, null);
  F.face('winLit', -hw + 0.3, hw - 0.3, top + 0.2, top + 2.6, 0.95, [0.9, 1.1, 1.3]);
  for (let a = -hw; a <= hw + 0.01; a += hw / 3) {
    F.mb.color = PALETTE.iron;
    F.mb.hexa('metal',
      [F.at(a - 0.06, top, 0.2), F.at(a + 0.06, top, 0.2), F.at(a + 0.06, top, 0.32), F.at(a - 0.06, top, 0.32)],
      [F.at(a - 0.06, top + 3.2, 1.6), F.at(a + 0.06, top + 3.2, 1.6), F.at(a + 0.06, top + 3.2, 1.72), F.at(a - 0.06, top + 3.2, 1.72)]);
  }
  F.box('trim', -hw - 0.8, hw + 0.8, top + 3.2, top + 3.6, -D + 0.6, 2.4, WHITE);
  // RACE CONTROL sign and a clock over the line.
  board(F, -hw + 1.5, hw - 1.5, top + 3.7, top + 5.1, 1.2, TEAMS.length, teamRows);
  F.box('metal', -hw + 1.4, hw - 1.4, top + 3.6, top + 3.7, 0.9, 1.2, PALETTE.iron);
  F.cylinder('winLit', 0, 0.35, 1.1, G + 7.2, G + 7.25, 16, [2.2, 2.2, 2.0]); // clock face (seen from above), backed by the ring
  F.box('trim', -1.4, 1.4, G + 6.6, G + 9.4, -0.3, 0.3, PALETTE.iron);
  F.face('winLit', -1.2, 1.2, G + 6.8, G + 9.2, 0.32, [2.0, 2.0, 1.85]);
  F.box('metal', -0.06, 0.06, G + 7.9, G + 9.0, 0.33, 0.37, PALETTE.iron);   // hour hand at twelve
  F.box('metal', -0.05, 0.75, G + 7.95, G + 8.05, 0.33, 0.37, PALETTE.iron); // minute hand at three
  // Mast with an aircraft warning light.
  F.box('metal', -0.08, 0.08, top + 3.6, top + 11, -D / 2 - 0.08, -D / 2 + 0.08, PALETTE.iron);
  for (let y = top + 4.5; y < top + 11; y += 1.4) F.box('metal', -0.5, 0.5, y, y + 0.05, -D / 2 - 0.03, -D / 2 + 0.03, PALETTE.iron);
  F.box('winLit', -0.15, 0.15, top + 11, top + 11.3, -D / 2 - 0.15, -D / 2 + 0.15, [4, 0.4, 0.3]);
  // Flags of the event on the roof edge.
  for (const [a, c] of [[-hw + 0.6, { bg: rgb(0xc8242b), accent: WHITE }], [hw - 0.6, { bg: rgb(0x0e2a5c), accent: rgb(0xffc21a) }]]) {
    F.box('metal', a - 0.04, a + 0.04, top + 3.6, top + 8.5, 2.0, 2.08, PALETTE.iron);
    flag(F, a, top + 7.1, top + 8.4, 2.04, c);
  }
}

/** Team / race-control board quad from the sign atlas, facing the track. */
function board(F, a0, a1, y0, y1, b, row, rows) {
  const p = [F.at(a0, y0, b), F.at(a1, y0, b), F.at(a1, y1, b), F.at(a0, y1, b)];
  F.mb.color = null;
  F.mb.quadUV('team', p[0], p[1], p[2], p[3], [0, row / rows], [1, row / rows], [1, (row + 1) / rows], [0, (row + 1) / rows]);
}

/** Two-tone flag hanging from a pole at a, both sides. */
function flag(F, a, y0, y1, b, col) {
  const w = 1.8, mid = (y0 + y1) / 2;
  for (const [ya, yb, c] of [[mid, y1, col.bg], [y0, mid, col.accent]]) {
    F.mb.color = c;
    const p = [F.at(a, ya, b), F.at(a + w, ya - 0.15, b), F.at(a + w, yb - 0.15, b), F.at(a, yb, b)];
    F.mb.quad('fabric', p[0], p[1], p[2], p[3]);
  }
}

/** Pit-wall stand by the barrier (b = +1.6): desk, monitors facing the engineers' stools, team canopy. */
function pitWallStand(F, col) {
  const w = 2.6;
  F.box('metal', -w, w, 0, 1.0, 0.2, 0.85, rgb(0x2a2d32));
  F.box('trim', -w - 0.05, w + 0.05, 1.0, 1.05, 0.15, 0.9, col.bg);
  for (let k = 0; k < 4; k++) {
    const a = -w + 0.65 + k * 1.3;
    F.box('metal', a - 0.4, a + 0.4, 1.05, 1.55, 0.3, 0.38, PALETTE.iron);
    F.face('winLit', a - 0.35, a + 0.35, 1.1, 1.5, 0.29, [0.5, 1.2, 2.0], -1);
    F.box('metal', a - 0.2, a + 0.2, 0, 0.75, -0.75, -0.35, PALETTE.iron); // stool
  }
  for (const a of [-w, w]) F.box('metal', a - 0.05, a + 0.05, 1.0, 2.7, 0.6, 0.7, PALETTE.iron);
  F.box('trim', -w - 0.2, w + 0.2, 2.7, 2.85, -1.0, 1.0, col.bg);
  F.box('trim', -w - 0.2, w + 0.2, 2.62, 2.7, -1.0, -0.9, col.accent);
}
