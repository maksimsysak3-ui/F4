import { CanvasTexture, SRGBColorSpace, MeshStandardMaterial } from 'three';
import { MeshBuilder } from '../../car/meshBuilder.js';
import { rgb, scaleC, pick } from '../street/kit.js';
import { standVariety } from './trackside.js';
import { buildRealScene } from './scene.js';
import { cheapBlock } from '../street/buildings.js';
import { palm } from '../street/trees.js';
import { grandstand } from '../street/props.js';
import { floodMast, beam } from '../night/venue.js';

/*
 * Jeddah, at night. The circuit is laid along the Corniche: the Red Sea on one side, a lagoon inside
 * the last corner with its island of palms, and the city's towers rising behind the walls on the other.
 * Concrete walls lined top and bottom with purple-violet LED strips, floodlights everywhere, neon on
 * the grandstands and the towers, and the huge painted circle at T27 with Aramco's run-off around it.
 */

const WHITE = rgb(0xf4f4f0), VIOLET = [1.6, 0.6, 3.0], CYAN = [0.4, 1.8, 2.8], MAGENTA = [2.6, 0.5, 2.2], WARM = [2.4, 1.8, 1.0];
const SHIRTS = [rgb(0x006c35), WHITE, rgb(0x1b1b1f), rgb(0xd8242b), rgb(0xff8000), rgb(0x00a19b), rgb(0x2a4a8a), rgb(0xf2c200)];

/** Jeddah stand: white tiers, a violet LED lip on each tier and a lit edge under the roof. */
function jeddahStand(F, r, W, tiers) {
  const gs = grandstand(F, r, W, tiers, { roof: true, style: 'steel', seats: [rgb(0x1b1b1f), rgb(0x2a2a30)], led: VIOLET });
  return { ...gs, shirts: SHIRTS };
}
const VARIED = standVariety(jeddahStand, null, SHIRTS);

// Night: walls are dark (the floodlights are on the track, not the city); windows and LEDs carry the light.
const NIGHT = 0.24, dark = (c, k = NIGHT) => scaleC(c, k);
const SAND = [rgb(0xeee4cc), rgb(0xe0d0b0), rgb(0xf4ece0), rgb(0xd4c09a), rgb(0xe8dcc0), rgb(0xc8b090)].map((c) => dark(c));
const LED = [[2.2, 2.2, 2.1], CYAN, VIOLET, MAGENTA, [1.2, 2.0, 2.6]];

/** Glass prism with the curtain-wall facade on all four sides, front face on b = b1. */
function glassPrism(F, a0, a1, y0, y1, b0, b1, wall) {
  F.box('stucco', a0 + 0.05, a1 - 0.05, y0, y1, b0 + 0.05, b1 - 0.05, scaleC(wall, 0.7));
  F.mb.color = wall;
  const bayU = 1 / (4 * 3.2), flU = 1 / (4 * 3.1), h = (y1 - y0) * flU;
  const side = (pa, pb, qa, qb, len) => {
    const p = [F.at(pa, y0, pb), F.at(qa, y0, qb), F.at(qa, y1, qb), F.at(pa, y1, pb)];
    F.mb.quadUV('facade_glass', p[0], p[1], p[2], p[3], [0, 0], [len * bayU, 0], [len * bayU, h], [0, h]);
  };
  side(a0, b1 + 0.01, a1, b1 + 0.01, a1 - a0); side(a1, b0 - 0.01, a0, b0 - 0.01, a1 - a0);
  side(a1 + 0.01, b1, a1 + 0.01, b0, b1 - b0); side(a0 - 0.01, b0, a0 - 0.01, b1, b1 - b0);
  F.mb.color = null;
}

/**
 * A Corniche apartment block: sand or white render, deep window reveals, carved wooden mashrabiya bays
 * climbing the front, a crenellated parapet, and the roof clutter of water tanks, AC units and a stair head.
 */
function arabBlock(F, r, W, D, floors) {
  const wall = pick(r, SAND), H = 3.4 + floors * 3.1 + 0.45;
  cheapBlock(F, r, W, D, floors, { wall, style: r() < 0.6 ? 'sand' : 'stucco', flat: true, trim: scaleC(wall, 0.82) });
  const wood = dark(pick(r, [rgb(0x6a4a2e), rgb(0x8a6a44), rgb(0x4a5a5a), WHITE]), 0.35);
  for (let a = -W / 2 + 3.2; a < W / 2 - 2; a += 6 + Math.floor(r() * 2) * 2) {
    if (r() < 0.35) continue;
    const f0 = 1 + Math.floor(r() * 2), f1 = Math.min(floors, f0 + 1 + Math.floor(r() * floors));
    F.box('trim', a - 1.3, a + 1.3, 3.4 + f0 * 3.1 - 2.6, 3.4 + f1 * 3.1 - 0.4, 0, 0.75, wood);
    F.box('trim', a - 1.45, a + 1.45, 3.4 + f1 * 3.1 - 0.4, 3.4 + f1 * 3.1, -0.05, 0.9, scaleC(wall, 0.9));
  }
  if (r() < 0.6) for (let a = -W / 2; a < W / 2 - 0.6; a += 1.8) F.box('stucco', a, a + 0.9, H + 1.2, H + 1.9, -0.45, 0, wall);
  F.box('stucco', -W / 4 - 1.5, -W / 4 + 1.5, H + 0.45, H + 3.3, -D / 2 - 1.8, -D / 2 + 1.8, wall);
  for (let k = 0, n = 1 + Math.floor(r() * 4); k < n; k++) F.cylinder('metal', W / 4 - k * 1.8, -D / 2 + (r() - 0.5) * 4, 0.7, H + 1.2, H + 2.7, 8, dark(rgb(0xdcdcd8), 0.3));
  if (r() < 0.5) F.box('metal', -1.2, 1.2, H + 1.2, H + 2.2, -D + 2, -D + 3.6, rgb(0xb8bcc0));
  // Detail: a lit shopfront podium, balcony slabs, a sign on the parapet, AC units on the face.
  F.box('stucco', -W / 2 - 0.8, W / 2 + 0.8, 3.0, 3.6, -D - 0.8, 1.2, scaleC(wall, 0.75));
  F.face('winLit', -W / 2 + 0.6, W / 2 - 0.6, 0.4, 2.8, 0.03, pick(r, [[1.6, 1.4, 1.0], [1.3, 1.5, 1.7], [1.6, 1.2, 1.5]]));
  if (r() < 0.4) for (let f = 2; f < floors; f += 2) F.box('trim', -W / 2 + 1, W / 2 - 1, 3.4 + f * 3.1 - 0.15, 3.4 + f * 3.1, 0, 1.3, scaleC(wall, 1.05));
  if (r() < 0.5) for (let k = 0, n = 2 + Math.floor(r() * 6); k < n; k++) {
    const a = -W / 2 + 1.5 + r() * (W - 3), y = 3.4 + (1 + Math.floor(r() * (floors - 1))) * 3.1 + 0.4;
    F.box('metal', a - 0.45, a + 0.45, y, y + 0.6, 0, 0.45, dark(rgb(0xd8d8d4), 0.3));
  }
  if (r() < 0.25) {
    const c = pick(r, ['#ffffff', '#3ad0ff', '#ff4fc8']);
    F.box('neon', -W / 4, W / 4, H + 0.6, H + 2.0, 0.1, 0.4, c === '#ffffff' ? [2.4, 2.4, 2.3] : c === '#3ad0ff' ? CYAN : MAGENTA);
  }
  if (r() < 0.55) { // LED outline on the roofline, sometimes up the corners too
    const c = pick(r, [VIOLET, VIOLET, CYAN, MAGENTA, [2.2, 2.2, 2.1]]);
    F.box('neon', -W / 2 - 0.1, W / 2 + 0.1, H - 0.2, H + 0.2, 0, 0.3, c);
    F.box('neon', -W / 2 - 0.1, W / 2 + 0.1, H - 0.2, H + 0.2, -D - 0.3, -D, c);
    for (const a of [-W / 2, W / 2]) F.box('neon', a - 0.15, a + 0.15, H - 0.2, H + 0.2, -D, 0, c);
    if (r() < 0.5) for (const a of [-W / 2, W / 2]) F.box('neon', a - 0.2, a + 0.2, 3.4, H, 0, 0.3, c);
  }
  if (floors < 8 && r() < 0.2) { F.cylinder('stucco', 0, -D / 2, 3, H + 1.2, H + 2.4, 12, wall); F.blob('stucco', 0, -D / 2, 3.1, H + 1.6, H + 5.2, 12, wall); }
}

/** Modern towers, one of several silhouettes: stepped setbacks, a glass drum, or a slab with fins and a raked crown. */
function modernTower(F, r, W, D, floors) {
  const H = 3.4 + floors * 3.1, glass = dark(pick(r, [rgb(0x5a6a80), rgb(0x7a8aa0), rgb(0x9aa6b4), rgb(0x4a5a68), rgb(0x8a9890)]), 0.4), c = pick(r, LED), kind = Math.floor(r() * 3);
  // Podium: a lit lobby and a canopy over the entrance.
  F.box('stucco', -W / 2 - 2, W / 2 + 2, 0, 6, -D - 2, 0.5, dark(rgb(0xe4e0d8)));
  F.face('winLit', -W / 2, W / 2, 0.4, 5, 0.52, [1.5, 1.35, 1.1]);
  F.box('trim', -4, 4, 4.4, 4.8, 0.5, 4, dark(rgb(0xd0d0d0), 0.4));
  F.box('neon', -W / 2 - 2, W / 2 + 2, 5.8, 6.1, 0.5, 0.7, c);
  if (kind === 0) {
    let w = W, d = D, y = 0;
    for (const f of [0.5, 0.3, 0.2]) {
      const y1 = y + H * f;
      glassPrism(F, -w / 2, w / 2, y, y1, -D / 2 - d / 2, -D / 2 + d / 2, glass);
      F.box('neon', -w / 2 - 0.1, w / 2 + 0.1, y1 - 0.3, y1, -D / 2 - d / 2 - 0.1, -D / 2 + d / 2 + 0.1, c);
      y = y1; w *= 0.76; d *= 0.76;
    }
    F.box('metal', -0.3, 0.3, y, y + H * 0.15, -D / 2 - 0.3, -D / 2 + 0.3, rgb(0xc8ccd0));
  } else if (kind === 1) {
    const R0 = Math.min(W, D) / 2;
    F.cylinder('stucco', 0, -D / 2, R0, 0, H, 16, scaleC(glass, 0.45));
    for (let y = 4.6; y < H - 1; y += 3.1) F.cylinder(r() < 0.5 ? 'winLit' : 'stucco', 0, -D / 2, R0 + 0.05, y, y + 1.6, 16, r() < 0.5 ? [1.1, 0.95, 0.7] : scaleC(glass, 0.6));
    for (let y = 9; y < H; y += 3.1 * (2 + Math.floor(r() * 3))) F.cylinder('trim', 0, -D / 2, R0 + 0.25, y, y + 0.35, 16, dark(rgb(0xe8e8e8), 0.35));
    F.cylinder('neon', 0, -D / 2, R0 + 0.1, H, H + 0.6, 16, c);
    F.cylinder('stucco', 0, -D / 2, R0 * 0.6, H, H + 6, 12, scaleC(glass, 0.8));
  } else {
    glassPrism(F, -W / 2, W / 2, 0, H, -D, 0, glass);
    for (const a of [-W / 2, W / 2]) for (const bb of [0, -D]) F.box('stucco', a - 0.7, a + 0.7, 0, H + 6, bb - 0.7, bb + 0.7, dark(rgb(0xe8e6e0), 0.3));
    for (let a = -W / 2 + 3; a < W / 2 - 1; a += 3) F.box('trim', a - 0.12, a + 0.12, 3.4, H, 0, 0.6, dark(rgb(0xd8d8d4), 0.3)); // vertical fins
    F.block('stucco', [[-W / 2, 0], [W / 2, 0], [W / 2, -D], [-W / 2, -D]], [[-W / 2, -D * 0.2], [W / 2, -D * 0.2], [W / 2, -D], [-W / 2, -D]], H, H + 6, scaleC(glass, 1.15));
    F.box('neon', -W / 2, W / 2, H - 0.25, H, 0, 0.15, c);
  }
}

/** The two landmark towers over the Corniche: a slim glass needle with a stepped crown, and a tall stone-and-glass slab. */
function needleTower(F, H) {
  const g = dark(rgb(0x8a98a8), 0.4);
  glassPrism(F, -14, 14, 0, H, -14, 14, g);
  for (let y = 30; y < H; y += 30) F.box('neon', -14.3, 14.3, y, y + 0.4, -14.3, 14.3, [1.6, 1.6, 1.8]);
  glassPrism(F, -10, 10, H, H + 18, -10, 10, scaleC(g, 1.15));
  glassPrism(F, -6, 6, H + 18, H + 30, -6, 6, scaleC(g, 1.25));
  F.box('metal', -0.6, 0.6, H + 30, H + 52, -0.6, 0.6, dark(rgb(0xd8dce0), 0.4));
  F.box('neon', -0.4, 0.4, H + 52, H + 53, -0.4, 0.4, [3, 0.4, 0.3]); // aircraft warning light
  for (const y of [H, H + 18]) F.box('neon', -14.4 + (y - H) / 4.5, 14.4 - (y - H) / 4.5, y - 0.4, y, -14.4 + (y - H) / 4.5, 14.4 - (y - H) / 4.5, [2.2, 2.2, 2.1]);
}
function slabTower(F, H) {
  const stone = dark(rgb(0xd8ccb0), 0.3), g = dark(rgb(0x6a7a8a), 0.4);
  glassPrism(F, -24, 24, 0, H, -11, 11, g);
  for (const a of [-24, 24]) F.box('stucco', a - 2.5, a + 2.5, 0, H + 14, -11.5, 11.5, stone);
  for (let y = 12; y < H; y += 12.4) F.box('stucco', -24, 24, y, y + 0.8, 11, 11.6, stone);
  F.box('stucco', -18, 18, H, H + 10, -9, 9, stone);
  F.box('neon', -24.1, 24.1, H + 13.6, H + 14, -11.6, 11.6, [2.4, 1.8, 1.0]);
  F.box('neon', -0.4, 0.4, H + 14, H + 15, -0.4, 0.4, [3, 0.4, 0.3]);
}

/** F1 facilities on the sea side: white hospitality hangars and tensile umbrella canopies. */
function hangar(F, W, D) {
  F.box('stucco', -W / 2, W / 2, 0, 5, -D, 0, dark(WHITE, 0.55));
  F.block('roof', [[-W / 2, 0], [W / 2, 0], [W / 2, -D], [-W / 2, -D]], [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, -D / 2]], 5, 9, dark(rgb(0xf4f4f2), 0.6));
  F.box('neon', -W / 2, W / 2, 4.8, 5.05, 0, 0.2, VIOLET);
  F.face('winLit', -W / 2 + 2, W / 2 - 2, 0.3, 3.2, 0.02, [1.4, 1.3, 1.1]);
}
/** Team hospitality / paddock club: stacked glass floors, each lit, cantilevered white decks, team-colour LED. */
const TEAM = [[2.6, 0.5, 0.3], [0.4, 1.8, 2.8], [2.8, 1.4, 0.2], [0.3, 2.2, 1.6], [2.4, 2.4, 2.4], [1.6, 0.6, 3.0], [0.4, 0.8, 3.0]];
function hospitality(F, r, W, D) {
  const floors = 2 + Math.floor(r() * 2), c = pick(r, TEAM), fh = 4.2;
  for (let f = 0; f < floors; f++) {
    const y = f * fh, inset = f * 1.5;
    F.box('stucco', -W / 2 + inset, W / 2 - inset, y, y + fh - 0.5, -D + inset, -inset, rgb(0x14161c));
    F.face('winLit', -W / 2 + inset + 0.4, W / 2 - inset - 0.4, y + 0.4, y + fh - 0.9, -inset + 0.02, pick(r, [[1.5, 1.3, 1.0], [1.2, 1.3, 1.5]]));
    F.box('stucco', -W / 2 + inset - 1.5, W / 2 - inset + 1.5, y + fh - 0.5, y + fh, -D + inset - 0.5, -inset + 2.2, dark(WHITE, 0.6)); // deck
    F.box('neon', -W / 2 + inset - 1.5, W / 2 - inset + 1.5, y + fh - 0.55, y + fh - 0.35, -inset + 2.2, -inset + 2.35, c);
  }
  F.box('neon', -W / 2 + 0.2, -W / 2 + 0.5, 0, floors * fh, 0, 0.3, c);
}
function canopies(F, r, W, D) {
  for (let a = -W / 2 + 6; a < W / 2 - 4; a += 12) for (let b = -6; b > -D + 4; b -= 12) {
    if (r() < 0.2) continue;
    F.box('metal', a - 0.12, a + 0.12, 0, 5, b - 0.12, b + 0.12, rgb(0xe0e0e0));
    F.block('fabric', [[a - 5.6, b + 5.6], [a + 5.6, b + 5.6], [a + 5.6, b - 5.6], [a - 5.6, b - 5.6]], [[a, b], [a, b], [a, b], [a, b]], 4.2, 7.2, WHITE);
    F.box('neon', a - 0.6, a + 0.6, 3.8, 4.0, b - 0.6, b + 0.6, [2.2, 2, 1.8]);
  }
}

export function buildJeddahScene(L) {
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const noise = (x, z) => Math.sin(x * 0.013 + 0.3) * Math.cos(z * 0.011 + 0.8) * 0.6 + Math.sin(x * 0.033 - z * 0.027) * 0.4;
  const img = (px, py) => L.fromImage(px, py);
  // The Corniche runs along the image diagonal; the Red Sea lies on the far side of the coastal leg.
  // seaN() is the distance across the coast in image px (track band 620-781), seaward positive.
  const NX = 0.503, NZ = 0.864, MPP = 2.4006, [ox, oz] = img(0, 0);
  const seaN = (x, z) => ((x - ox) / MPP) * NX + ((z - oz) / MPP) * NZ;
  const atNU = (n, u) => img(n * NX - u * NZ, n * NZ + u * NX);
  const sea = [];
  for (let u = -1600; u <= 1000; u += 130) { const [x, z] = atNU(1108, u); sea.push({ x, z, r: 760, y: 0.3, margin: 30, depth: 10, colour: 0x061428 }); }
  // Clearance from the circuit (the pit side of the start gets extra room for the lane and garages).
  const cl = [];
  for (let i = 0; i < L.N; i += 3) {
    const s0 = i * L.ds, u = Math.min(s0, L.length - s0);
    cl.push([L.x[i], L.z[i], (s0 > L.length - 320 || s0 < 120) ? 75 : 0, u]);
  }
  const clearance = (x, z) => { let m = 1e9; for (const [cx, cz, extra] of cl) m = Math.min(m, Math.hypot(x - cx, z - cz) - extra); return m; };
  // The sea comes right up behind the coastal leg: a chain of discs along its seaward side.
  for (let k = 50; k <= 72; k++) {
    const i = L.pointSample[k % 77] % L.N;
    for (const sg of [1, -1]) {
      const side = sg > 0 ? 'L' : 'R', p = L.poseAt(i * L.ds, sg * (L.wall[side][i] + 16 + 220));
      if (seaN(p.x, p.z) < seaN(L.x[i], L.z[i]) + 40) continue;
      if (clearance(p.x, p.z) > 220 + 14) sea.push({ x: p.x, z: p.z, r: 220, y: 0.3, margin: 12, depth: 10, colour: 0x061428 });
    }
  }
  // The lagoon fills the long gap between the outbound leg and the coastal leg, up to the final corner.
  const [lx, lz] = img(985, 250);
  const lagoon = { x: lx, z: lz, r: 110, y: 0.6, margin: 14, depth: 4, colour: 0x101a3c };
  const pond = [lagoon];
  const circleAt = (() => { const i = L.pointSample[71], side = L.k[i] > 0 ? 'L' : 'R', sg = side === 'L' ? 1 : -1; return L.poseAt(i * L.ds, sg * (L.wall[side][i] + 30)); })();
  // Enclosed: the track must lie both seaward and landward of the point within ~350 m, so the water
  // stays between the two legs (land everywhere else, and never between the circuit and the city).
  const hits = (x, z, dn) => { for (let t = 10; t < 150; t += 4) { const [px, pz] = atNU(n0(x, z) + dn * t, u0(x, z)); if (clearance(px, pz) < 10) return true; } return false; };
  const n0 = (x, z) => seaN(x, z), u0 = (x, z) => ((x - ox) / MPP) * -NZ + ((z - oz) / MPP) * NX;
  for (let pass = 0; pass < 2; pass++) for (let u = -1000; u < -400; u += 12) for (let n = 640; n < 800; n += 6) {
    const [x, z] = atNU(n, u), c = clearance(x, z) - 24, r = Math.min(c, 160);
    if (r < (pass ? 22 : 40) || !hits(x, z, 1) || !hits(x, z, -1) || Math.hypot(x - circleAt.x, z - circleAt.z) < 26 + r + 8) continue;
    if (pond.some((w) => Math.hypot(x - w.x, z - w.z) < w.r * 0.75)) continue;
    pond.push({ x, z, r, y: 0.6, margin: 8, depth: 4, colour: 0x101a3c });
  }
  const water = [...sea, ...pond];
  const wetAt = (x, z, pad = 0) => water.some((w) => Math.hypot(x - w.x, z - w.z) < w.r + pad);

  return buildRealScene(L, {
    name: 'Jeddah',
    seed: 2021,
    margin: 700,
    windowGlow: 1.0,
    trackside: { standBuild: jeddahStand, shirts: SHIRTS, suburb: 0, standSpacing: 90, hoardingSpacing: 110, keepOut: (x, z) => wetAt(x, z, 10), skyline: { count: 260, tall: 220, dir: Math.atan2(-NX, -NZ), spread: 2.0, depth: 1400, colours: [rgb(0x12141a), rgb(0x161a22), rgb(0x1a1c24)] } },
    pitTheme: {
      wall: rgb(0xe8e8ec),
      upper(F, hw, i, rc, { H1, DEPTH }) {
        const top = H1 + 4;
        F.box('stucco', -hw, hw, H1, top, -DEPTH + 0.6, -1.0, rgb(0x2a2c34));
        F.face(i % 2 ? 'winLit' : 'glass', -hw + 0.2, hw - 0.2, H1 + 0.4, top - 0.4, -0.98, [1.0, 0.9, 1.3]);
        F.box('neon', -hw, hw, top, top + 0.25, -DEPTH, 0.9, VIOLET);
        if (rc) F.box('stucco', -hw + 0.6, hw - 0.6, top + 0.25, top + 6, -DEPTH + 1, -1.2, rgb(0x2a2c34));
      },
    },
    style: {
      kerb: [WHITE, rgb(0x0a8a4a)],
      runoff: 'brand', runoffFloor: [0.17, 0.08, 0.27],
      barrier: 'slab', slab: [rgb(0xe4e4ea), rgb(0x1a1424), VIOLET],
      fence: true, lamps: 'flood', floodEvery: 12, verge: 'paving',
      title: ['JEDDAH', 'SAUDI ARABIAN GRAND PRIX', '#006c35', '#ffffff', '#b04cff'],
      roadName: 'JEDDAH',
      bannerGlow: 0.45,
      boardBorder: '#b04cff',
    },
    fascia: ['JEDDAH', 'SAUDI ARABIAN GRAND PRIX'],
    fasciaColours: ['#006c35', '#ffffff', '#b04cff'],
    skirtColour: [0.2, 0.18, 0.2],
    groundKind: 'sand',
    relief(x, z, d) { return noise(x * 0.5, z * 0.5) * 2 * smooth(60, 300, d); },
    colourAt(x, z, h, slope, d) {
      if (wetAt(x, z, 6)) return [0.66, 0.62, 0.56]; // the promenades and beaches
      if (d < 60) return noise(x * 3, z * 3) > 0.3 ? [0.26, 0.4, 0.22] : [0.5, 0.5, 0.52];
      return noise(x, z) > 0.4 ? [0.5, 0.5, 0.52] : [0.62, 0.56, 0.44];
    },
    water,
    stands: [
      { at: 0, side: 'R', W: 220, tiers: 20, build: jeddahStand, offset: -60 }, // the main grandstand
      { at: 3, side: 'outside', W: 110, tiers: 16, build: VARIED },            // T1
      { at: 35, side: 'outside', W: 100, tiers: 16, build: VARIED },           // T13, the banked turn
      { at: 22, side: 'outside', W: 90, tiers: 14, build: VARIED },
      { at: 50, side: 'outside', W: 90, tiers: 14, build: VARIED },
      { at: 64, side: 'outside', W: 90, tiers: 14, build: VARIED },
      { at: 72, side: 'outside', W: 140, tiers: 18, build: jeddahStand },      // T27
      { at: 10, side: 'outside', W: 100, tiers: 16, build: VARIED },
      { at: 16, side: 'outside', W: 90, tiers: 14, build: VARIED },
      { at: 28, side: 'outside', W: 110, tiers: 16, build: jeddahStand },
      { at: 42, side: 'outside', W: 100, tiers: 16, build: VARIED },
      { at: 46, side: 'outside', W: 90, tiers: 14, build: VARIED },
      { at: 57, side: 'outside', W: 120, tiers: 18, build: jeddahStand },
      { at: 61, side: 'inside', W: 90, tiers: 14, build: VARIED },
      { at: 68, side: 'outside', W: 110, tiers: 16, build: VARIED },
      { at: 75, side: 'outside', W: 100, tiers: 16, build: jeddahStand },
    ],
    landmarks({ L, R, frameAt, kit, terrain, placed, group }) {
      const ps = (k) => L.pointS(k);
      const dry = (x, z) => !wetAt(x, z, 8);
      // ---- the painted circle inside T27: a ring of colour round the fountain island ----
      {
        const i = L.pointSample[71], side = L.k[i] > 0 ? 'L' : 'R', sg = side === 'L' ? 1 : -1;
        const lat = L.wall[side][i] + 30, p = L.poseAt(i * L.ds, sg * lat), R0 = 26;
        const c = document.createElement('canvas'); c.width = c.height = 1024;
        const g = c.getContext('2d');
        g.fillStyle = '#3ad0c8'; g.beginPath(); g.arc(512, 512, 510, 0, 7); g.fill();
        g.fillStyle = '#2ab070'; for (let k = 0; k < 18; k++) { const t = (k / 18) * 6.283; g.save(); g.translate(512 + Math.cos(t) * 330, 512 + Math.sin(t) * 330); g.rotate(t); g.fillRect(-60, -14, 120, 28); g.restore(); }
        g.fillStyle = '#e8424a'; for (let k = 0; k < 3; k++) { const t = (k / 3) * 6.283 + 0.4; g.save(); g.translate(512 + Math.cos(t) * 230, 512 + Math.sin(t) * 230); g.rotate(t + 1.2); g.beginPath(); g.ellipse(0, 0, 150, 60, 0, 0, 7); g.fill(); g.restore(); }
        g.fillStyle = '#ffffff'; g.font = '700 54px "Trebuchet MS", sans-serif'; g.textAlign = 'center';
        for (let k = 0; k < 6; k++) { const t = (k / 6) * 6.283; g.save(); g.translate(512 + Math.cos(t) * 470, 512 + Math.sin(t) * 470); g.rotate(t + Math.PI / 2); g.fillText('aramco', 0, 18); g.restore(); }
        const tex = new CanvasTexture(c); tex.colorSpace = SRGBColorSpace;
        const mb = new MeshBuilder(), y = terrain.heightAt(p.x, p.z) + 0.08, n = 40;
        for (let k = 0; k < n; k++) {
          const a0 = (k / n) * 6.283, a1 = ((k + 1) / n) * 6.283;
          const P = (a) => [p.x + Math.cos(a) * R0, y, p.z + Math.sin(a) * R0], uv = (a) => [0.5 + Math.cos(a) * 0.5, 0.5 - Math.sin(a) * 0.5];
          mb.color = null;
          mb.tri('disc', [p.x, y, p.z], P(a1), P(a0), [0, 1, 0], [[0.5, 0.5], uv(a1), uv(a0)]);
        }
        group.add(mb.build({ disc: new MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35, roughness: 0.8 }) }));
        const F = frameAt(p.x, p.z, 0, y);
        F.cylinder('stucco', 0, 0, 2.5, 0, 1.2, 14, WHITE);
        for (let k = 0; k < 6; k++) { const t = (k / 6) * 6.283; beam(F, 'metal', [Math.cos(t) * 2, 1.2, Math.sin(t) * 2], [0, 9, 0], 0.18, rgb(0xb8b0a0)); }
        kit.footprints.push({ cx: p.x, cz: p.z, ux: 1, uz: 0, hw: R0, hd: R0 });
        placed.circle = 1;
      }
      // ---- floodlight towers, the Corniche towers and the city behind, palms everywhere ----
      let masts = 0;
      for (let s = 30, m = 0; s < L.length; s += 55, m++) {
        const i = Math.floor(s / L.ds) % L.N, side = m % 2 ? 'R' : 'L';
        const fr = kit.frontage(s, side, 6);
        const F = kit.lot(fr.x, fr.z, fr.dirX, fr.dirZ, 5, 5, 0.5, dry);
        if (F) { floodMast(F, R, 34 + R() * 8); masts++; }
      }
      // Inland (the band's landward edge and beyond): the city, sand-rendered blocks with mashrabiya bays
      // mixed with modern glass towers. Between the legs and towards the sea: only the F1 facilities.
      const city = { blocks: 0, towers: 0, hangars: 0 };
      const landmark = (n, u, w, build) => {
        for (let k = 0; k < 40; k++) {
          const [x, z] = atNU(n - k * 6, u + ((k % 5) - 2) * 14);
          const F = kit.lot(x, z, NX, NZ, w, w, 6, dry);
          if (F) { build(F); return 1; }
        }
        return 0;
      };
      placed.landmarks = landmark(560, -170, 34, (F) => needleTower(F, 230)) + landmark(575, -95, 54, (F) => slabTower(F, 168));
      const b = terrain.bounds;
      for (let z = b.minZ + 40; z < b.maxZ - 40; z += 30) for (let x = b.minX + 40; x < b.maxX - 40; x += 30) {
        const px = x + (R() - 0.5) * 12, pz = z + (R() - 0.5) * 12, d = terrain.distSmooth(px, pz), n = seaN(px, pz);
        if (d < 45 || d > 700 || !dry(px, pz)) continue;
        if (n > 628) {
          // The F1 side: hospitality hangars and canopies near the track, open paving and car parks otherwise.
          if (d > 280 || R() < 0.35) continue;
          const kind = R(), W = kind < 0.45 ? 30 + R() * 24 : 40 + R() * 30, D = kind < 0.45 ? 16 + R() * 8 : 22 + R() * 14;
          const F = kit.lot(px, pz, NX, NZ, W, D, 3, dry);
          if (!F) continue;
          if (kind < 0.45) hospitality(F, R, W, D); else if (kind < 0.75) hangar(F, W, D); else canopies(F, R, W, D);
          city.hangars++;
          continue;
        }
        if (R() < 0.42) continue;
        const near = d < 220, modern = R() < (near ? 0.18 : 0.32);
        const W = 16 + R() * 18, D = 14 + R() * 14, yaw = R() < 0.8 ? [NX, NZ] : [-NZ, NX];
        const F = kit.lot(px, pz, yaw[0], yaw[1], W, D, 4, dry);
        if (!F) continue;
        if (modern) { modernTower(F, R, W, D, 14 + Math.floor(R() * R() * 34)); city.towers++; }
        else { arabBlock(F, R, W, D, (near ? 3 : 5) + Math.floor(R() * (near ? 8 : 16))); city.blocks++; }
      }
      let palms = 0;
      for (const side of ['L', 'R']) for (let s = 0; s < L.length; s += 18) {
        const fr = kit.frontage(s, side, 3 + R() * 3);
        if (!kit.isFree(fr.x, fr.z, 1) || !dry(fr.x, fr.z) || kit.overlaps({ cx: fr.x, cz: fr.z, ux: 1, uz: 0, hw: 1, hd: 1 })) continue;
        palm(frameAt(fr.x, fr.z, R() * 6.28), R, 7 + R() * 4);
        palms++;
      }
      // Violet LED strips: round the lagoon's edge and along the sea wall behind the coastal leg.
      const strip = frameAt(0, 0, 0, 0);
      for (const w of pond) {
        const n = Math.max(16, Math.round(w.r / 3));
        for (let k = 0; k < n; k++) {
          const t0 = (k / n) * 6.283, t1 = ((k + 1) / n) * 6.283, rr = w.r + 1;
          const a = [w.x + Math.cos(t0) * rr, w.z + Math.sin(t0) * rr], b2 = [w.x + Math.cos(t1) * rr, w.z + Math.sin(t1) * rr];
          if (pond.some((o) => o !== w && (Math.hypot(a[0] - o.x, a[1] - o.z) < o.r || Math.hypot(b2[0] - o.x, b2[1] - o.z) < o.r))) continue;
          beam(strip, 'neon', [a[0], 1.0, a[1]], [b2[0], 1.0, b2[1]], 0.7, k % 9 === 0 ? [0.6, 0.9, 3.2] : VIOLET);
        }
      }
      // The sea wall: a violet line along the shore wherever it meets land.
      for (const w of sea) {
        const n = Math.round(w.r / 4);
        for (let k = 0; k < n; k++) {
          const t0 = (k / n) * 6.283, t1 = ((k + 1) / n) * 6.283, rr = w.r + 1;
          const a = [w.x + Math.cos(t0) * rr, w.z + Math.sin(t0) * rr], b2 = [w.x + Math.cos(t1) * rr, w.z + Math.sin(t1) * rr];
          if (wetAt(a[0], a[1], -0.5) || wetAt(b2[0], b2[1], -0.5) || terrain.distSmooth(a[0], a[1]) > 500) continue;
          beam(strip, 'neon', [a[0], 1.2, a[1]], [b2[0], 1.2, b2[1]], 0.8, R() < 0.85 ? VIOLET : [0.6, 0.9, 3.2]);
        }
      }
      // The palm island in the lagoon: low villas, lit palms, a violet LED shore.
      const big = pond.reduce((m, w) => (w.r > m.r ? w : m), pond[0]), IR = big.r * 0.42;
      {
        const F = frameAt(big.x, big.z, 0, 0.6);
        F.cylinder('stucco', 0, 0, IR, -1, 0.9, 28, rgb(0xb8a888));
        for (let k = 0; k < 28; k++) { const t0 = (k / 28) * 6.283, t1 = ((k + 1) / 28) * 6.283, q = IR + 0.3; beam(F, 'neon', [Math.cos(t0) * q, 0.8, Math.sin(t0) * q], [Math.cos(t1) * q, 0.8, Math.sin(t1) * q], 0.4, VIOLET); }
        for (let k = 0; k < 7; k++) {
          const t = R() * 6.28, rr = R() * IR * 0.55, a = Math.cos(t) * rr, bb = Math.sin(t) * rr, w = 6 + R() * 6;
          F.box('stucco', a - w / 2, a + w / 2, 0.9, 4.4, bb - w / 3, bb + w / 3, WHITE);
          F.face('winLit', a - w / 2 + 0.6, a + w / 2 - 0.6, 1.4, 3.6, bb + w / 3 + 0.02, [1.4, 1.2, 0.9]);
        }
        for (let k = 0; k < Math.round(IR * 0.9); k++) {
          const t = R() * 6.28, rr = Math.sqrt(R()) * IR * 0.9, P = frameAt(big.x + Math.cos(t) * rr, big.z + Math.sin(t) * rr, R() * 6.28, 0.9);
          palm(P, R, 6 + R() * 4);
          if (R() < 0.5) P.box('neon', -0.15, 0.15, 0, 0.6, -0.15, 0.15, R() < 0.5 ? VIOLET : [2.4, 2.0, 1.4]);
        }
      }
      placed.jeddah = { masts, palms, ...city };
      void ps;
    },
    trees: { variants: [palm], attempts: 3000, scale: [1], test(x, z, d, h, R) { if (d < 14 || wetAt(x, z, 4)) return -1; return R() < (d < 120 ? 0.25 : 0.05) ? 0 : -1; } },
  });
}
