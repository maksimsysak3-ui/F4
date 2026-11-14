import { Frame, rgb, scaleC } from '../street/kit.js?v=1a016bc';

/*
 * Geometric facades shared by the night cities (Las Vegas, Singapore): every window a pane of real
 * glass or a lit room, and the frame (mullions, spandrels, slabs, rails, pilasters, sills, sun
 * louvres, fins, sky gardens) built proud of it, instead of a window texture on a flat wall.
 */

const ROOM = [[1.15, 0.85, 0.5], [1.0, 0.72, 0.42], [0.62, 0.74, 1.0], [0.35, 0.55, 1.25], [0.42, 0.33, 0.24], [1.1, 0.95, 0.7], [0.8, 0.5, 0.3]];
export const FACADES = {
  glass: { kind: 'curtain', bay: 3.2, fh: 3.4, frame: rgb(0x9aa2ae), pane: 'glass' },
  blueGlass: { kind: 'curtain', bay: 2.8, fh: 3.4, frame: rgb(0x5a6a80), pane: 'glass' },
  bronze: { kind: 'curtain', bay: 3.0, fh: 3.3, frame: rgb(0x6a4a2a), pane: 'copper', paneCol: rgb(0x8a5a2a) },
  gold: { kind: 'curtain', bay: 3.0, fh: 3.3, frame: rgb(0xb08a3a), pane: 'copper', paneCol: rgb(0xc89a3a) },
  balcony: { kind: 'balcony', bay: 3.6, fh: 3.2, frame: rgb(0xe8e4dc), pane: 'glass' },
  punched: { kind: 'punched', bay: 3.4, fh: 3.2, frame: rgb(0xe2d6c0), wall: rgb(0xd8c8a8), pane: 'glass' },
  white: { kind: 'punched', bay: 3.2, fh: 3.2, frame: rgb(0xf2f0ea), wall: rgb(0xe8e6e0), pane: 'glass' },
  // Singapore's tropical modernism: deep sun louvres, dense white fins, sky gardens, granite.
  sgLouvre: { kind: 'louvre', bay: 3.0, fh: 3.6, frame: rgb(0xf0f0ec), pane: 'glass' },
  sgFins: { kind: 'fins', bay: 1.8, fh: 3.6, frame: rgb(0xe8ecee), pane: 'glass' },
  sgGarden: { kind: 'balcony', bay: 3.4, fh: 3.2, frame: rgb(0xf4f2ec), pane: 'glass', garden: 6, planters: true },
  sgTeal: { kind: 'louvre', bay: 2.6, fh: 3.6, frame: rgb(0x9ad0d0), pane: 'copper', paneCol: rgb(0x1a5a6a), garden: 9 },
  sgGranite: { kind: 'punched', bay: 2.8, fh: 3.8, frame: rgb(0x8a8680), wall: rgb(0x6a6660), pane: 'glass' },
};

/**
 * One facade plane of a tower as geometry, in G's frame: from a = -len/2 to len/2 on the plane
 * b = 0, facing +b, y0 to y1. Rooms are lit floor by floor (some floors busy, some asleep), the
 * dark panes are real reflective glass, and the frame (mullions, spandrels, slabs, rails,
 * pilasters, sills) stands proud of them so the face has depth from any angle.
 */
export function facadeGeo(G, R, len, y0, y1, st) {
  const nb = Math.max(1, Math.round(len / st.bay)), bw = len / nb, nf = Math.max(1, Math.floor((y1 - y0) / st.fh)), fh = (y1 - y0) / nf;
  const a0 = -len / 2, fr = st.frame, k = st.kind;
  if (k === 'punched') G.face('stucco', a0, -a0, y0, y1, 0, scaleC(st.wall, 0.9));
  for (let f = 0; f < nf; f++) {
    const y = y0 + f * fh, busy = (0.04 + R() * R() * 0.6) * (st.day ? 0.12 : 1), tone = Math.floor(R() * ROOM.length);
    if (st.garden && f > 2 && f < nf - 1 && f % st.garden === st.garden - 1) { skyGarden(G, R, a0, y, fh); continue; }
    // The panes, merging runs of dark glass into one quad.
    const wy0 = k === 'punched' ? y + 0.9 : y, wy1 = k === 'punched' ? y + fh - 0.5 : y + fh;
    let run = -1;
    for (let j = 0; j <= nb; j++) {
      const lit = j < nb && R() < busy;
      const wa0 = a0 + j * bw + (k === 'punched' ? bw * 0.22 : 0), wa1 = a0 + (j + 1) * bw - (k === 'punched' ? bw * 0.22 : 0);
      if (k === 'punched') {
        if (j < nb) {
          if (lit) G.face('winLit', wa0, wa1, wy0, wy1, 0.03, ROOM[R() < 0.7 ? tone : Math.floor(R() * ROOM.length)]);
          else G.face(st.pane, wa0, wa1, wy0, wy1, 0.03, st.paneCol ?? null);
        }
        continue;
      }
      if (!lit && j < nb) { if (run < 0) run = j; continue; }
      if (run >= 0) { G.face(st.pane, a0 + run * bw, a0 + j * bw, wy0, wy1, 0.02, st.paneCol ?? null); run = -1; }
      if (lit) G.face('winLit', a0 + j * bw, a0 + (j + 1) * bw, wy0, wy1, 0.02, ROOM[R() < 0.7 ? tone : Math.floor(R() * ROOM.length)]);
    }
    // The floor line.
    if (k === 'curtain' || k === 'fins') G.box('trim', a0, -a0, y - 0.3, y + 0.3, 0, 0.32, scaleC(fr, 1.1));
    else if (k === 'louvre') { G.box('trim', a0, -a0, y - 0.25, y + 0.25, 0, 0.4, scaleC(fr, 1.1)); G.box('trim', a0, -a0, y + fh * 0.72, y + fh * 0.72 + 0.14, 0, 1.2, scaleC(fr, 1.1)); }
    else if (k === 'balcony') {
      G.box('trim', a0, -a0, y - 0.15, y + 0.15, 0, 1.5, scaleC(fr, 1.1));                    // the slab
      if (f > 0 && st.planters) {
        G.box('stucco', a0, -a0, y + 0.15, y + 0.8, 1.0, 1.5, scaleC(fr, 1.1));
        G.box('leaf', a0 + 0.2, -a0 - 0.2, y + 0.8, y + 1.15, 1.05, 1.5, [0.1, 0.3, 0.08]);              // the hedge along the planter
        if (f % 3 === 0) for (let a = a0 + 2 + R() * 3; a < -a0 - 1; a += 6 + R() * 5) G.box('leaf', a - 0.5, a + 0.5, y + 1.0, y + 1.9, 1.0, 1.55, [0.14, 0.36, 0.1]);
      }
      else if (f > 0) { G.face('glass', a0, -a0, y + 0.15, y + 1.15, 1.48, null); G.box('trim', a0, -a0, y + 1.1, y + 1.2, 1.38, 1.5, scaleC(fr, 1.1)); }
    } else G.box('trim', a0, -a0, y + 0.75, y + 0.9, 0, 0.28, scaleC(fr, 1.1));                // the sills
  }
  // Vertical lines: mullions, unit dividers, pilasters.
  for (let j = 0; j <= nb; j++) {
    const a = a0 + j * bw;
    if (k === 'curtain' || k === 'louvre') G.box('trim', a - 0.12, a + 0.12, y0, y1, 0, 0.28, scaleC(fr, 1.1));
    else if (k === 'fins') G.box('trim', a - 0.09, a + 0.09, y0, y1, 0, 0.9, scaleC(fr, 1.1));
    else if (k === 'balcony') { if (j % 2 === 0) G.box('trim', a - 0.12, a + 0.12, y0, y1, 0, 1.5, scaleC(fr, 1.1)); }
    else G.box('trim', a - 0.35, a + 0.35, y0, y1, 0, 0.32, scaleC(fr, 1.1));
  }
}

/** A sky garden: an open storey, shaded inside, with planters, shrubs and small trees at its edge. */
function skyGarden(G, R, a0, y, fh) {
  G.face('stucco', a0, -a0, y, y + fh, -0.6, [0.05, 0.06, 0.05]);
  G.face('winLit', a0, -a0, y + fh - 0.25, y + fh - 0.15, -0.55, [1.6, 1.5, 1.2]);               // the soffit's strip lights
  G.box('trim', a0, -a0, y, y + 0.9, 0, 0.6, [0.4, 0.4, 0.38]);
  for (let a = a0 + 1; a < -a0 - 1; a += 2.4 + R() * 2) {
    if (R() < 0.35) { G.box('trim', a - 0.1, a + 0.1, y + 0.9, y + 1.9, -0.1, 0.1, [0.3, 0.22, 0.14]); G.blob('leaf', a, 0, 1.0 + R() * 0.4, y + 1.7, y + fh - 0.3, 5, [0.12, 0.34, 0.1]); }
    else G.box('leaf', a - 0.6, a + 0.6, y + 0.9, y + 1.4 + R() * 0.4, -0.3, 0.5, R() < 0.5 ? [0.1, 0.3, 0.08] : [0.16, 0.4, 0.12]);
  }
  for (const a of [a0, -a0]) G.box('trim', a - 0.4, a + 0.4, y, y + fh, -0.6, 0.3, [0.5, 0.5, 0.48]);
}

/** facadeGeo round a plan polygon (in F's a, b); each edge gets its own outward-facing frame. */
export function skinGeo(F, R, poly, y0, y1, st) {
  const cx = poly.reduce((t, q) => t + q[0], 0) / poly.length, cz = poly.reduce((t, q) => t + q[1], 0) / poly.length;
  for (let i = 0; i < poly.length; i++) {
    let [p, q] = [poly[i], poly[(i + 1) % poly.length]];
    let da = q[0] - p[0], db = q[1] - p[1];
    const len = Math.hypot(da, db);
    if (len < 1) continue;
    const ma = (p[0] + q[0]) / 2, mb = (p[1] + q[1]) / 2;
    if (-db * (ma - cx) + da * (mb - cz) < 0) { da = -da; db = -db; }      // keep the face outward
    const wr = [F.r[0] * da / len + F.f[0] * db / len, F.r[1] * da / len + F.f[1] * db / len];
    const m = F.at(ma, 0, mb);
    facadeGeo(new Frame(F.mb, m[0], m[1], m[2], wr[0], wr[1]), R, len, y0, y1, st);
  }
}
