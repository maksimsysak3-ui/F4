import { Group, MeshStandardMaterial, MeshPhysicalMaterial, DoubleSide, Color } from 'three';
import { MeshBuilder } from '../../car/meshBuilder.js';
import { sponsorAtlas, logoAtlas, titleBanner, fenceTexture, streetAsphalt, roadText, SPONSORS } from './textures.js';

/**
 * The racing surface and everything bolted to it, built by hand along the
 * centreline samples: road, kerbs, gutters, painted run-offs, barriers with
 * sponsor boards, debris fences, Tecpro walls, gantries, start lights,
 * marshal posts and street lamps.
 */

const rgb = (hex) => { const c = new Color(hex); return [c.r, c.g, c.b]; };
const COL = {
  white: rgb(0xf2f1ec), red: rgb(0xc81d25), line: rgb(0xeeeeea), gutter: rgb(0x3b3a3e),
  runoff: rgb(0x2c5f73), runoffEdge: rgb(0xd8d8d2), concrete: rgb(0x7d7a74), paving: rgb(0x8f8a80),
  curb: rgb(0xb7b2a6), barrier: rgb(0xe9e7e1), barrierRed: rgb(0xb8262c), tecRed: rgb(0xc8242b),
  tecBlue: rgb(0x1f4f9a), tecWhite: rgb(0xe8e8e8), hut: rgb(0xeeeae0), hutRoof: rgb(0xe8701e),
  black: rgb(0x16171a), yellow: rgb(0xffc21a), steel: rgb(0xb8bec6), tyreBand: rgb(0xe8e8e8),
};

/** Porto Vela's look; other circuits override parts of it. */
const DEFAULT_STYLE = {
  kerb: null,                 // [colour A, colour B] (defaults to red/white)
  runoff: 'sponsor',          // 'sponsor' (painted brand floors) | 'gravel' (traps + grass) | 'stripes' (painted asphalt)
  barrier: 'jersey',          // 'jersey' concrete | 'armco' steel guardrail
  fence: true,
  lamps: 'street',            // 'street' | 'flood' | 'none'
  verge: 'paving',            // what's behind the barrier: 'paving' | 'grass'
  sponsors: null,             // brand list (textures.js format)
  zoneBrands: ['NEBULA COLA', 'TINY TYRES', 'HEXA ENERGY', 'CORAL CRUISES', 'OCTANE 9', 'VOLTWAVE'],
  primeBrands: ['PORTO BANK', 'LUMEN WATCHES'],
  bannerGlow: 0.22,
  title: ['PORTO VELA', 'GRAND PRIX · CIRCUITO CITTADINO', '#0d1b2e', '#f4efe2', '#ffc21a'],
  bridges: [['NEBULA COLA', 'TASTE THE VOID', '#c8102e', '#ffffff', '#ffd23f'], ['TINY TYRES', 'GRIP THAT FITS IN YOUR POCKET', '#111214', '#ffc21a', '#ffc21a']],
  roadName: 'PORTO VELA',
  stripes: null,              // [colour A, colour B] for 'stripes' run-offs
};

export function buildCircuit(layout, { isFree, keepClear = () => false, style = {} }) {
  const S = { ...DEFAULT_STYLE, ...style };
  const BRANDS = S.sponsors || SPONSORS;
  const KERB = S.kerb || [COL.white, COL.red];
  const L = layout;
  const { N, ds, halfW, kerbW, edge } = L;
  const group = new Group();
  const mb = new MeshBuilder();

  // ---- frame helpers -------------------------------------------------------
  const lerpIdx = (arr, f) => { const i = Math.floor(f) % N, j = (i + 1) % N, t = f - Math.floor(f); return arr[i] + (arr[j] - arr[i]) * t; };
  const P = (f, lat, y) => [lerpIdx(L.x, f) + lerpIdx(L.nx, f) * lat, y, lerpIdx(L.z, f) + lerpIdx(L.nz, f) * lat];
  const wallAt = (side, f) => lerpIdx(L.wall[side], f);
  const kerbAt = (side, f) => lerpIdx(L.kerb[side], f) > 0.5;
  const UPN = [0, 1, 0];
  /** Up-facing quad regardless of winding. */
  const flat = (key, a, b, c, d) => { mb.triFacing(key, a, b, c, UPN); mb.triFacing(key, a, c, d, UPN); };

  // ---- sponsor zones ---------------------------------------------------------
  // Each stretch of the lap is sold to one brand, like a real street race: the
  // start straight to the bank and the watchmaker, corners to one sponsor each.
  /** 0 (plain pavement) .. 1 (fully painted escape area) from the barrier offset. */
  const runoffPaint = (wall) => Math.min(1, Math.max(0, (wall - edge - 2.2) / 2.5));
  // Run-off floor paint: each sponsor's background colour, toned down like paint on asphalt.
  const BRAND_FLOOR = BRANDS.map(([, bg]) => mix(rgb(parseInt(bg.slice(1), 16)), COL.concrete, 0.25));
  const brandIndex = Object.fromEntries(BRANDS.map(([name], k) => [name, k]));
  const ZONE_BRANDS = [...S.zoneBrands, ...S.zoneBrands.slice().reverse()].map((b) => brandIndex[b]);
  const zones = Math.round((L.length - 900) / 230);
  const zoneLen = (L.length - 900) / zones;
  /** Brand for centreline distance s; the 900 m around the line belongs to the prestige pair. */
  const brandAt = (s) => {
    const u = ((s + 700) % L.length + L.length) % L.length;
    if (u < 900) return Math.floor(u / 36) % 2 ? brandIndex[S.primeBrands[1]] : brandIndex[S.primeBrands[0]];
    return ZONE_BRANDS[Math.floor((u - 900) / zoneLen) % ZONE_BRANDS.length];
  };

  // ---- road ----------------------------------------------------------------
  for (let i = 0; i < N; i++) {
    const j = i + 1;
    const s0 = i * ds, s1 = j * ds;
    const a = P(i, -halfW, 0), b = P(i, halfW, 0), c = P(j, halfW, 0), d = P(j, -halfW, 0);
    const u0 = -halfW / 8, u1 = halfW / 8;
    // Counter-clockwise seen from above (right edge -> forward -> left edge), so the face points up.
    mb.tri('asphalt', a, c, b, UPN, [[u0, s0 / 8], [u1, s1 / 8], [u1, s0 / 8]]);
    mb.tri('asphalt', a, d, c, UPN, [[u0, s0 / 8], [u0, s1 / 8], [u1, s1 / 8]]);
  }

  // ---- per side: edge line, kerb or gutter, run-off ------------------------
  for (const side of ['L', 'R']) {
    const sg = side === 'L' ? 1 : -1;
    for (let i = 0; i < N; i++) {
      const j = i + 1;
      // Painted white edge line.
      mb.color = COL.line;
      flat('paint', P(i, sg * (halfW - 0.45), 0.006), P(i, sg * (halfW - 0.15), 0.006), P(j, sg * (halfW - 0.15), 0.006), P(j, sg * (halfW - 0.45), 0.006));

      const wall = Math.min(wallAt(side, i), wallAt(side, j));
      const runoff = wall - edge;
      const kerb = kerbAt(side, i) && kerbAt(side, j);
      if (kerb) {
        // Kerb at 1 m resolution so the 2 m ridges and colour blocks are exact.
        for (const [f0, f1] of [[i, i + 0.5], [i + 0.5, j]]) {
          const sA = f0 * ds, sB = f1 * ds;
          const block = Math.floor(((sA + sB) / 2) / 2) % 2;
          mb.color = KERB[block];
          const us = [0, 0.3, 1];
          for (let k = 0; k < 2; k++) {
            const la = sg * (halfW + us[k] * kerbW), lb = sg * (halfW + us[k + 1] * kerbW);
            const ya0 = L.kerbProfile(us[k], sA) + 0.002, yb0 = L.kerbProfile(us[k + 1], sA) + 0.002;
            const ya1 = L.kerbProfile(us[k], sB) + 0.002, yb1 = L.kerbProfile(us[k + 1], sB) + 0.002;
            flat('kerb', P(f0, la, ya0), P(f0, lb, yb0), P(f1, lb, yb1), P(f1, la, ya1));
          }
          // Outer lip so the kerb doesn't float.
          const lo = sg * edge;
          mb.color = COL.gutter;
          mb.triFacing('paint', P(f0, lo, 0), P(f1, lo, 0), P(f1, lo, L.kerbProfile(1, sB) + 0.002), [L.nx[i] * sg, 0, L.nz[i] * sg]);
          mb.triFacing('paint', P(f0, lo, 0), P(f1, lo, L.kerbProfile(1, sB) + 0.002), P(f0, lo, L.kerbProfile(1, sA) + 0.002), [L.nx[i] * sg, 0, L.nz[i] * sg]);
        }
      } else {
        mb.color = COL.gutter;
        flat('paint', P(i, sg * halfW, 0.001), P(i, sg * edge, 0.001), P(j, sg * edge, 0.001), P(j, sg * halfW, 0.001));
      }

      // Run-off: painted where it's a real escape area, plain pavement where it's a street.
      const paint = runoffPaint(wall);
      if (S.runoff === 'gravel') {
        // Grass verge, and a gravel trap where the run-off opens up on the outside of corners.
        const grass = mix(GRASS, GRASS_DARK, (hash(i * 3 + (side === 'L' ? 1 : 0)) % 100) / 100);
        mb.color = grass;
        flat('paint', P(i, sg * edge, 0.001), P(i, sg * wallAt(side, i), 0.001), P(j, sg * wallAt(side, j), 0.001), P(j, sg * edge, 0.001));
        if (wall - edge > 4.7) { // same threshold as the gravel surface in layout.surfaceAt
          mb.color = mix(GRAVEL, GRAVEL_DARK, (hash(i * 7 + 5) % 100) / 100 * 0.6);
          const g0 = edge + 0.8, ga = wallAt(side, i) - 0.6, gb = wallAt(side, j % N) - 0.6;
          if (ga > g0 + 0.5 && gb > g0 + 0.5) flat('paint', P(i, sg * g0, 0.012), P(i, sg * ga, 0.012), P(j, sg * gb, 0.012), P(j, sg * g0, 0.012));
        }
      } else if (S.runoff === 'stripes') {
        // Painted asphalt: a band of alternating stripes by the kerb, deep colour beyond.
        const [sa, sb] = S.stripes || [rgb(0x1b3fa8), COL.white];
        mb.color = mix(COL.gutter, BRAND_FLOOR[brandAt(i * ds)], paint * 0.8);
        flat('paint', P(i, sg * edge, 0.001), P(i, sg * wallAt(side, i), 0.001), P(j, sg * wallAt(side, j), 0.001), P(j, sg * edge, 0.001));
        if (paint > 0.4) {
          mb.color = Math.floor(i / 1) % 2 ? sa : sb;
          flat('paint', P(i, sg * edge, 0.003), P(i, sg * (edge + 1.4), 0.003), P(j, sg * (edge + 1.4), 0.003), P(j, sg * edge, 0.003));
        }
      } else {
        mb.color = mix(COL.concrete, BRAND_FLOOR[brandAt(i * ds)], paint);
        flat('paint', P(i, sg * edge, 0.001), P(i, sg * wallAt(side, i), 0.001), P(j, sg * wallAt(side, j), 0.001), P(j, sg * edge, 0.001));
      }
      if (paint > 0.5 && S.runoff !== 'gravel') {
        mb.color = COL.runoffEdge;
        flat('paint', P(i, sg * edge, 0.004), P(i, sg * (edge + 0.2), 0.004), P(j, sg * (edge + 0.2), 0.004), P(j, sg * edge, 0.004));
      }
    }
  }
  mb.color = null;

  // ---- sponsor lettering on the run-offs ---------------------------------------
  // The run-off floor itself is painted in the zone sponsor's colour (above); here
  // the brand name runs along it in a continuous band, tiling every 13 m.
  const logos = logoAtlas(BRANDS);
  const logoMb = new MeshBuilder();
  for (const side of ['L', 'R']) {
    const sg = side === 'L' ? 1 : -1;
    for (let i = 0; i < N; i++) {
      const j = i + 1;
      const wa = wallAt(side, i), wb = wallAt(side, j % N);
      if (S.runoff === 'gravel' || runoffPaint(wa) < 0.99 || runoffPaint(wb) < 0.99) continue;
      const row = brandAt(i * ds);
      const v0 = row / logos.rows, v1 = (row + 1) / logos.rows;
      // Band from just off the edge line to most of the way to the barrier (up to 4 m wide).
      const band = (w) => Math.min(4, w - edge - 1.4);
      const ua = (i * ds) / 13, ub = (j * ds) / 13;
      const uA = sg > 0 ? ua : -ua, uB = sg > 0 ? ub : -ub;
      emitFacing(logoMb, 'logo', P(i, sg * (edge + 0.7), 0.006), P(j, sg * (edge + 0.7), 0.006), P(j, sg * (edge + 0.7 + band(wb)), 0.006), P(i, sg * (edge + 0.7 + band(wa)), 0.006),
        [uA, v0], [uB, v0], [uB, v1], [uA, v1], UPN);
    }
  }

  // ---- start line, grid boxes, painted name --------------------------------
  {
    const rows = 2, cols = 12, depth = 0.6;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const la = -halfW + (c / cols) * 2 * halfW, lb = -halfW + ((c + 1) / cols) * 2 * halfW;
        const fa = (r * depth) / ds, fb = ((r + 1) * depth) / ds;
        mb.color = (r + c) % 2 ? COL.black : COL.white;
        flat('paint', P(fa, la, 0.007), P(fa, lb, 0.007), P(fb, lb, 0.007), P(fb, la, 0.007));
      }
    }
    // Staggered grid boxes behind the line.
    mb.color = COL.white;
    for (let g = 0; g < 8; g++) {
      const s = L.length - 9 - g * 8;
      const lat = g % 2 ? 2.5 : -2.5;
      const f = s / ds;
      const w = 1.4, len = 4.4 / ds, t = 0.15 / ds;
      // A bracket: front bar plus two short legs.
      flat('paint', P(f, lat - w, 0.007), P(f, lat + w, 0.007), P(f + t, lat + w, 0.007), P(f + t, lat - w, 0.007));
      for (const e of [-w, w - 0.15]) flat('paint', P(f - len * 0.3, lat + e, 0.007), P(f - len * 0.3, lat + e + 0.15, 0.007), P(f, lat + e + 0.15, 0.007), P(f, lat + e, 0.007));
    }
    mb.color = null;
  }

  // ---- barriers ---------------------------------------------------------------
  // Jersey profile (outward offset from the barrier face, height).
  const PROFILE = [[0, 0], [0, 0.3], [0.12, 0.55], [0.18, 1.05], [0.5, 1.05], [0.62, 0]];
  const PC = [0.3, 0.5];
  const tecZone = (side, i) => wallAt(side, i) - edge > 4.2;
  // Pit lane: the barrier is open over the entry/exit tapers, with crash cushions on its noses.
  const pit = L.pit;
  const openAt = (side, f) => !!pit && side === pit.side && !pit.barrierAt((f % N) * ds);
  const noseAt = (side, f) => (pit && side === pit.side ? pit.noseAt((f % N) * ds) : null);
  const banners = [];
  for (const side of ['L', 'R']) {
    const sg = side === 'L' ? 1 : -1;
    for (let i = 0; i < N; i++) {
      const j = i + 1;
      if (openAt(side, i) || openAt(side, j)) continue;
      if (noseAt(side, i) !== null || noseAt(side, j) !== null) { crashCushion(side, sg, i); continue; }
      const offA = wallAt(side, i) + (tecZone(side, i) ? 0.95 : 0);
      const offB = wallAt(side, j) + (tecZone(side, j % N) ? 0.95 : 0);
      // Red/white painted blocks on corner barriers, plain white on the straights.
      const corner = Math.abs(L.k[i]) > 1 / 120;
      if (S.barrier === 'armco') armco(side, sg, i, offA, offB);
      else for (let k = 0; k < PROFILE.length - 1; k++) {
        const [o0, y0] = PROFILE[k], [o1, y1] = PROFILE[k + 1];
        let n2o = y1 - y0, n2y = -(o1 - o0);
        const mo = (o0 + o1) / 2 - PC[0], my = (y0 + y1) / 2 - PC[1];
        if (n2o * mo + n2y * my < 0) { n2o = -n2o; n2y = -n2y; }
        const nrm = [L.nx[i] * sg * n2o, n2y, L.nz[i] * sg * n2o];
        const a = P(i, sg * (offA + o0), y0), b = P(i, sg * (offA + o1), y1);
        const c = P(j, sg * (offB + o1), y1), d = P(j, sg * (offB + o0), y0);
        mb.color = corner && k === 0 && Math.floor(i / 2) % 2 ? COL.barrierRed : COL.barrier;
        mb.triFacing('concrete', a, b, c, nrm);
        mb.triFacing('concrete', a, c, d, nrm);
      }
      // Sponsor boards on the upright face (12 m each).
      // Every barrier panel carries the zone sponsor's board.
      const slot = i % 6 === 0;
      if (slot && ![0, 1, 2, 3, 4, 5, 6].some((q) => openAt(side, i + q) || noseAt(side, i + q) !== null)) banners.push({ side, sg, i, sponsor: brandAt(i * ds) });
    }
  }
  mb.color = null;

  /** Steel guardrail: a post per sample and a double W-beam, galvanised. */
  function armco(side, sg, i, offA, offB) {
    const j = i + 1;
    mb.color = COL.steel;
    post(mb, 'metal', P(i, sg * (offA + 0.32), 0), L.tx[i], L.tz[i], 0.12, 0.12, 0.85);
    for (const [y0, y1] of [[0.42, 0.62], [0.68, 0.86]]) {
      mb.hexa('metal',
        [P(i, sg * offA, y0), P(i, sg * (offA + 0.18), y0), P(j, sg * (offB + 0.18), y0), P(j, sg * offB, y0)],
        [P(i, sg * offA, y1), P(i, sg * (offA + 0.18), y1), P(j, sg * (offB + 0.18), y1), P(j, sg * offB, y1)]);
    }
    mb.color = null;
  }

  /** Water-filled crash cushion: yellow/black chevron segments on one 2 m sample. */
  function crashCushion(side, sg, i) {
    const w = wallAt(side, i);
    for (let q = 0; q < 4; q++) {
      const f0 = i + q * 0.25, f1 = f0 + 0.22;
      mb.color = q % 2 ? COL.black : COL.yellow;
      const bot = [P(f0, sg * (w - 0.05), 0), P(f0, sg * (w + 0.67), 0), P(f1, sg * (w + 0.67), 0), P(f1, sg * (w - 0.05), 0)];
      mb.hexa('concrete', bot, bot.map((p) => [p[0], 0.95, p[2]]));
    }
  }

  const atlas = sponsorAtlas(BRANDS);
  for (const bnr of banners) {
    const { side, sg, i } = bnr;
    const row = bnr.sponsor % atlas.rows;
    const v0 = row / atlas.rows + 0.004, v1 = (row + 1) / atlas.rows - 0.004;
    for (let q = 0; q < 6; q++) {
      const f0 = i + q, f1 = i + q + 1;
      const off0 = wallAt(side, f0 % N) + (tecZone(side, f0 % N) ? 0.95 : 0);
      const off1 = wallAt(side, f1 % N) + (tecZone(side, f1 % N) ? 0.95 : 0);
      const u0 = q / 6, u1 = (q + 1) / 6;
      const a = P(f0, sg * (off0 + 0.11), 0.56), b = P(f1, sg * (off1 + 0.11), 0.56);
      const c = P(f1, sg * (off1 + 0.165), 1.03), d = P(f0, sg * (off0 + 0.165), 1.03);
      // Readable from the track side: wind so the normal faces the road.
      const n = [-L.nx[f0 % N] * sg, 0.1, -L.nz[f0 % N] * sg];
      const uvA = [u0, v0], uvB = [u1, v0], uvC = [u1, v1], uvD = [u0, v1];
      // Mirror u on the right side so the text reads left-to-right from the cockpit.
      if (sg < 0) { uvA[0] = 1 - u0; uvB[0] = 1 - u1; uvC[0] = 1 - u1; uvD[0] = 1 - u0; }
      emitFacing(mb, 'banner', a, b, c, d, uvA, uvB, uvC, uvD, n);
    }
  }

  // Tecpro energy-absorbing blocks in front of the run-off barriers.
  for (const side of ['L', 'R']) {
    const sg = side === 'L' ? 1 : -1;
    let k = 0;
    for (let f = 0; f < N; f += 0.8) {
      const i = Math.floor(f);
      if (!tecZone(side, i) || !tecZone(side, (i + 1) % N)) continue;
      const w0 = wallAt(side, f), w1 = wallAt(side, f + 0.75);
      const colour = S.barrier === 'armco' ? [COL.black, COL.black, COL.tyreBand, COL.black][k++ % 4] : [COL.tecRed, COL.tecWhite, COL.tecBlue, COL.tecWhite][k++ % 4];
      mb.color = colour;
      const bA = [P(f, sg * w0, 0), P(f, sg * (w0 + 0.9), 0), P(f + 0.75, sg * (w1 + 0.9), 0), P(f + 0.75, sg * w1, 0)];
      const tA = bA.map((p) => [p[0], 1.0, p[2]]);
      mb.hexa('concrete', bA, tA);
    }
  }
  mb.color = null;

  // Debris fence: posts every 6 m and a chain-link panel on top of the barrier.
  const fenceMb = new MeshBuilder();
  for (const side of S.fence ? ['L', 'R'] : []) {
    const sg = side === 'L' ? 1 : -1;
    for (let i = 0; i < N; i++) {
      const j = i + 1;
      if (openAt(side, i) || openAt(side, j) || noseAt(side, i) !== null) continue;
      const offA = wallAt(side, i) + (tecZone(side, i) ? 0.95 : 0) + 0.34;
      const offB = wallAt(side, j % N) + (tecZone(side, j % N) ? 0.95 : 0) + 0.34;
      const s0 = i * ds, s1 = j * ds;
      fenceMb.quadUV('fence', P(i, sg * offA, 1.05), P(j, sg * offB, 1.05), P(j, sg * offB, 3.9), P(i, sg * offA, 3.9),
        [s0 / 0.6, 1.05 / 0.6], [s1 / 0.6, 1.05 / 0.6], [s1 / 0.6, 3.9 / 0.6], [s0 / 0.6, 3.9 / 0.6]);
      if (i % 3 === 0) {
        const c = P(i, sg * offA, 0);
        post(mb, 'metal', c, L.tx[i], L.tz[i], 0.1, 0.1, 4.05);
        // Top rail.
        mb.hexa('metal',
          [P(i, sg * (offA - 0.03), 3.88), P(i, sg * (offA + 0.03), 3.88), P(i + 3, sg * (wallAt(side, (i + 3) % N) + (tecZone(side, (i + 3) % N) ? 0.95 : 0) + 0.37), 3.88), P(i + 3, sg * (wallAt(side, (i + 3) % N) + (tecZone(side, (i + 3) % N) ? 0.95 : 0) + 0.31), 3.88)],
          [P(i, sg * (offA - 0.03), 3.95), P(i, sg * (offA + 0.03), 3.95), P(i + 3, sg * (wallAt(side, (i + 3) % N) + (tecZone(side, (i + 3) % N) ? 0.95 : 0) + 0.37), 3.95), P(i + 3, sg * (wallAt(side, (i + 3) % N) + (tecZone(side, (i + 3) % N) ? 0.95 : 0) + 0.31), 3.95)]);
      }
    }
  }

  // ---- pavement behind the barriers, street lamps, marshal posts ----------
  for (const side of ['L', 'R']) {
    const sg = side === 'L' ? 1 : -1;
    for (let i = 0; i < N; i++) {
      const j = i + 1;
      const wa = wallAt(side, i) + (tecZone(side, i) ? 0.95 : 0) + 0.62;
      const wb = wallAt(side, j % N) + (tecZone(side, j % N) ? 0.95 : 0) + 0.62;
      const mid = P(i + 0.5, sg * (wa + 2), 0);
      if (keepClear(side, i) || !isFree(mid[0], mid[2], 0.3)) continue;
      mb.color = S.verge === 'grass' ? GRASS : COL.paving;
      flat('paint', P(i, sg * wa, 0.14), P(i, sg * (wa + 4), 0.14), P(j, sg * (wb + 4), 0.14), P(j, sg * wb, 0.14));
      mb.color = S.verge === 'grass' ? GRASS_DARK : COL.curb;
      const n = [L.nx[i] * sg, 0, L.nz[i] * sg];
      mb.triFacing('paint', P(i, sg * (wa + 4), 0), P(j, sg * (wb + 4), 0), P(j, sg * (wb + 4), 0.14), n);
      mb.triFacing('paint', P(i, sg * (wa + 4), 0), P(j, sg * (wb + 4), 0.14), P(i, sg * (wa + 4), 0.14), n);

      if (S.lamps === 'street' && i % 15 === (side === 'L' ? 0 : 7)) streetLamp(mb, P(i, sg * (wa + 2.6), 0.14), -L.nx[i] * sg, -L.nz[i] * sg);
      if (S.lamps === 'flood' && i % 24 === (side === 'L' ? 0 : 12)) floodlight(mb, P(i, sg * (wa + 2.2), 0.14), -L.nx[i] * sg, -L.nz[i] * sg);
      if (i % 110 === (side === 'L' ? 20 : 75)) marshalPost(mb, P(i, sg * (wa + 1.8), 0.14), L.tx[i], L.tz[i], -L.nx[i] * sg, -L.nz[i] * sg);
    }
  }
  mb.color = null;

  // ---- gantries: start lights, sponsor bridges -------------------------------
  const startBanner = titleBanner(...S.title);
  const bridgeBanners = S.bridges.map((b) => titleBanner(...b));
  const bannerMb = new MeshBuilder();
  gantry(mb, bannerMb, 'start', 6 / ds, true);
  for (const [k, s] of findStraights(L, 2).entries()) gantry(mb, bannerMb, `bridge${k}`, s / ds, false);

  function gantry(mbx, bmb, key, f, lights) {
    const i = Math.floor(f) % N;
    const wl = wallAt('L', i) + 0.9, wr = wallAt('R', i) + 0.9;
    const H = 6.6;
    for (const lat of [wl, -wr]) {
      // Pillars: steel box columns on a concrete footing.
      const base = P(f, lat, 0);
      mb.color = COL.concrete;
      post(mbx, 'concrete', base, L.tx[i], L.tz[i], 0.5, 0.5, 0.6);
      mb.color = null;
      post(mbx, 'metal', base, L.tx[i], L.tz[i], 0.32, 0.32, H + 0.9);
    }
    // Box truss: two chords with verticals and diagonals.
    const span = (y0, y1, df) => {
      mbx.hexa('metal',
        [P(f + df - 0.05, wl, y0), P(f + df + 0.05, wl, y0), P(f + df + 0.05, -wr, y0), P(f + df - 0.05, -wr, y0)],
        [P(f + df - 0.05, wl, y1), P(f + df + 0.05, wl, y1), P(f + df + 0.05, -wr, y1), P(f + df - 0.05, -wr, y1)]);
    };
    for (const df of [-0.25, 0.25]) { span(H, H + 0.12, df); span(H + 1.2, H + 1.32, df); }
    // Banner faces on both sides of the truss.
    const tex = key === 'start' ? 'startBanner' : `bridgeBanner${key.slice(-1)}`;
    for (const [df, flip] of [[-0.32, false], [0.32, true]]) {
      const a = P(f + df, wl, H + 0.12), b = P(f + df, -wr, H + 0.12), c = P(f + df, -wr, H + 1.2), d = P(f + df, wl, H + 1.2);
      const t = [L.tx[i] * (flip ? 1 : -1), 0, L.tz[i] * (flip ? 1 : -1)];
      const ua = flip ? 1 : 0, ub = flip ? 0 : 1;
      emitFacing(bmb, tex, a, b, c, d, [ua, 0], [ub, 0], [ub, 1], [ua, 1], t);
    }
    if (lights) {
      // Start-light pod: five columns of red lamps facing the grid.
      const pod = (lat0, lat1, y0, y1) => mbx.hexa('metal',
        [P(f - 0.45, lat0, y0), P(f - 0.2, lat0, y0), P(f - 0.2, lat1, y0), P(f - 0.45, lat1, y0)],
        [P(f - 0.45, lat0, y1), P(f - 0.2, lat0, y1), P(f - 0.2, lat1, y1), P(f - 0.45, lat1, y1)]);
      mb.color = COL.black;
      pod(-1.9, 1.9, H - 1.1, H + 0.05);
      mb.color = null;
      for (let c = 0; c < 5; c++) {
        for (let r = 0; r < 2; r++) {
          const lat = -1.5 + c * 0.75, y = H - 0.75 + r * 0.42;
          mbx.hexa('startLamp',
            [P(f - 0.47, lat - 0.15, y - 0.15), P(f - 0.45, lat - 0.15, y - 0.15), P(f - 0.45, lat + 0.15, y - 0.15), P(f - 0.47, lat + 0.15, y - 0.15)],
            [P(f - 0.47, lat - 0.15, y + 0.15), P(f - 0.45, lat - 0.15, y + 0.15), P(f - 0.45, lat + 0.15, y + 0.15), P(f - 0.47, lat + 0.15, y + 0.15)]);
        }
      }
    }
  }

  // Track name painted on the road just past the line.
  const nameMb = new MeshBuilder();
  {
    const f0 = 30 / ds, f1 = 44 / ds;
    const steps = 7;
    for (let q = 0; q < steps; q++) {
      const fa = f0 + ((f1 - f0) * q) / steps, fb = f0 + ((f1 - f0) * (q + 1)) / steps;
      const va = q / steps, vb = (q + 1) / steps;
      // Text runs across the road, read by drivers approaching.
      nameMb.quadUV('roadName', P(fa, halfW - 1, 0.008), P(fa, -halfW + 1, 0.008), P(fb, -halfW + 1, 0.008), P(fb, halfW - 1, 0.008),
        [1 - va, 0], [1 - va, 1], [1 - vb, 1], [1 - vb, 0]);
    }
  }

  // ---- materials & meshes ---------------------------------------------------
  const asphaltTex = streetAsphalt();
  const mats = {
    asphalt: new MeshStandardMaterial({ map: asphaltTex, roughness: 0.92, metalness: 0, envMapIntensity: 0.3 }),
    paint: new MeshStandardMaterial({ vertexColors: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    kerb: new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, envMapIntensity: 0.5 }),
    concrete: new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
    metal: new MeshStandardMaterial({ vertexColors: true, color: 0x8a9099, roughness: 0.45, metalness: 0.7 }),
    banner: new MeshStandardMaterial({ map: atlas.tex, roughness: 0.6, emissive: 0xffffff, emissiveMap: atlas.tex, emissiveIntensity: S.bannerGlow }),
    fence: new MeshStandardMaterial({ map: fenceTexture(), color: 0xb9c2cc, alphaTest: 0.5, side: DoubleSide, roughness: 0.5, metalness: 0.6 }),
    lamp: new MeshStandardMaterial({ color: 0x332211, emissive: 0xffd9a0, emissiveIntensity: 3.5 }),
    flood: new MeshStandardMaterial({ color: 0x222222, emissive: 0xf4f8ff, emissiveIntensity: 6 }),
    startLamp: new MeshStandardMaterial({ color: 0x220000, emissive: 0xff2020, emissiveIntensity: 2.2 }),
    hutGlass: new MeshPhysicalMaterial({ color: 0x1c2733, roughness: 0.1, metalness: 0.3 }),
    startBanner: new MeshStandardMaterial({ map: startBanner, emissive: 0xffffff, emissiveMap: startBanner, emissiveIntensity: 0.35, roughness: 0.6 }),
    bridgeBanner0: new MeshStandardMaterial({ map: bridgeBanners[0], emissive: 0xffffff, emissiveMap: bridgeBanners[0], emissiveIntensity: 0.35, roughness: 0.6 }),
    bridgeBanner1: new MeshStandardMaterial({ map: bridgeBanners[1], emissive: 0xffffff, emissiveMap: bridgeBanners[1], emissiveIntensity: 0.35, roughness: 0.6 }),
    logo: new MeshStandardMaterial({ map: logos.tex, transparent: true, depthWrite: false, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -3 }),
    roadName: new MeshStandardMaterial({ map: roadText(S.roadName), transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false }),
  };
  for (const b of [mb, fenceMb, bannerMb, nameMb, logoMb]) {
    const g = b.build(mats);
    g.traverse((o) => { o.castShadow = false; o.receiveShadow = o.material === mats.asphalt || o.material === mats.paint || o.material === mats.kerb; });
    group.add(g);
  }
  return { group, mats };
}

// ---------------------------------------------------------------------------

const GRASS = rgb(0x4f7a34), GRASS_DARK = rgb(0x3f6a2c), GRAVEL = rgb(0xcdb995), GRAVEL_DARK = rgb(0xa8946e);

/** Stadium floodlight tower: lattice mast, a bank of lamps angled down at the track. */
function floodlight(mb, base, fx, fz) {
  const H = 16;
  const at = (a, y, b) => [base[0] + fx * b + -fz * a, base[1] + y, base[2] + fz * b + fx * a];
  mb.color = rgb(0x6a7280);
  mb.hexa('metal', [at(-0.25, 0, -0.25), at(0.25, 0, -0.25), at(0.25, 0, 0.25), at(-0.25, 0, 0.25)], [at(-0.12, H, -0.12), at(0.12, H, -0.12), at(0.12, H, 0.12), at(-0.12, H, 0.12)]);
  mb.hexa('metal', [at(-1.6, H - 0.2, 0.2), at(1.6, H - 0.2, 0.2), at(1.6, H - 0.2, 0.5), at(-1.6, H - 0.2, 0.5)], [at(-1.6, H + 1.4, 0.5), at(1.6, H + 1.4, 0.5), at(1.6, H + 1.4, 0.8), at(-1.6, H + 1.4, 0.8)]);
  mb.color = null;
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    const a = -1.2 + c * 0.8, y = H + 0.15 + r * 0.6;
    mb.hexa('flood', [at(a - 0.3, y, 0.55 + r * 0.15), at(a + 0.3, y, 0.55 + r * 0.15), at(a + 0.3, y, 0.62 + r * 0.15), at(a - 0.3, y, 0.62 + r * 0.15)],
      [at(a - 0.3, y + 0.45, 0.65 + r * 0.15), at(a + 0.3, y + 0.45, 0.65 + r * 0.15), at(a + 0.3, y + 0.45, 0.72 + r * 0.15), at(a - 0.3, y + 0.45, 0.72 + r * 0.15)]);
  }
}

function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

function hash(n) {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 1274126177) >>> 0;
  return x >>> 8;
}

/** Textured quad whose triangles face along n, keeping the UV mapping. */
function emitFacing(mb, key, a, b, c, d, ua, ub, uc, ud, n) {
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] >= 0) mb.quadUV(key, a, b, c, d, ua, ub, uc, ud);
  else mb.quadUV(key, a, d, c, b, ua, ud, uc, ub);
}

/** Upright square post at base point, aligned with the track direction. */
function post(mb, key, base, tx, tz, w, d, h) {
  const nx = tz, nz = -tx;
  const corner = (a, b, y) => [base[0] + tx * a + nx * b, base[1] + y, base[2] + tz * a + nz * b];
  const ring = (y) => [corner(-d / 2, -w / 2, y), corner(d / 2, -w / 2, y), corner(d / 2, w / 2, y), corner(-d / 2, w / 2, y)];
  mb.hexa(key, ring(0), ring(h));
}

/** Riviera street lamp: tapered post, curved arm reaching over the road, warm lantern. */
function streetLamp(mb, base, dx, dz) {
  const at = (o, y) => [base[0] + dx * o, base[1] + y, base[2] + dz * o];
  const sq = (c, r) => [[c[0] - r, c[1], c[2] - r], [c[0] + r, c[1], c[2] - r], [c[0] + r, c[1], c[2] + r], [c[0] - r, c[1], c[2] + r]];
  mb.color = COL.black;
  mb.hexa('metal', sq(at(0, 0), 0.12), sq(at(0, 0.5), 0.1));
  mb.hexa('metal', sq(at(0, 0.5), 0.06), sq(at(0, 7.2), 0.045));
  const arm = [[0, 7.2], [0.6, 7.6], [1.4, 7.75], [2.0, 7.7]];
  for (let k = 0; k < arm.length - 1; k++) {
    mb.hexa('metal', sq(at(arm[k][0], arm[k][1]), 0.04), sq(at(arm[k + 1][0], arm[k + 1][1]), 0.04));
  }
  mb.color = null;
  const head = at(2.0, 7.6);
  mb.hexa('metal', sq([head[0], head[1] + 0.05, head[2]], 0.22), sq([head[0], head[1] + 0.22, head[2]], 0.08));
  mb.hexa('lamp', sq([head[0], head[1] - 0.2, head[2]], 0.15), sq([head[0], head[1] + 0.05, head[2]], 0.2));
}

/** Marshal post: a little white hut with an orange roof and a flag. */
function marshalPost(mb, base, tx, tz, fx, fz) {
  const nx = tz, nz = -tx;
  const at = (a, b, y) => [base[0] + tx * a + nx * b, base[1] + y, base[2] + tz * a + nz * b];
  const box = (a0, a1, b0, b1, y0, y1, key) => mb.hexa(key,
    [at(a0, b0, y0), at(a1, b0, y0), at(a1, b1, y0), at(a0, b1, y0)],
    [at(a0, b0, y1), at(a1, b0, y1), at(a1, b1, y1), at(a0, b1, y1)]);
  mb.color = COL.hut;
  box(-1.1, 1.1, -0.9, 0.9, 0, 2.3, 'concrete');
  mb.color = COL.hutRoof;
  box(-1.25, 1.25, -1.05, 1.05, 2.3, 2.5, 'concrete');
  mb.color = null;
  // Window facing the track.
  const sgn = fx * nx + fz * nz > 0 ? 1 : -1;
  box(-0.8, 0.8, sgn * 0.9, sgn * 0.93, 1.1, 1.9, 'hutGlass');
  mb.color = COL.black;
  box(0.95, 1.0, -0.6, -0.55, 2.5, 4.2, 'metal');
  mb.color = COL.yellow;
  box(1.0, 1.05, -0.55, 0.25, 3.6, 4.15, 'concrete');
  mb.color = null;
}

/** Positions (s) of the middles of the longest straights, away from the start. */
function findStraights(L, count) {
  const straight = [];
  let run = 0;
  for (let i = 0; i < L.N * 2; i++) {
    const k = Math.abs(L.k[i % L.N]);
    if (k < 1 / 400) run++;
    else {
      if (run > 40 && i - run / 2 < L.N * 1.5) straight.push({ len: run, mid: ((i - run / 2) % L.N) * L.ds });
      run = 0;
    }
  }
  return straight
    .filter((s) => s.mid > 250 && s.mid < L.length - 150)
    .sort((a, b) => b.len - a.len)
    .filter((s, i, arr) => arr.findIndex((o) => Math.abs(o.mid - s.mid) < 150) === i)
    .slice(0, count)
    .map((s) => s.mid);
}
