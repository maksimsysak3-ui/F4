import {
  BufferGeometry, Float32BufferAttribute, Mesh, Group, MeshPhysicalMaterial, MeshStandardMaterial, MeshBasicMaterial, CanvasTexture, RepeatWrapping, SRGBColorSpace,
  BoxGeometry, CylinderGeometry, TorusGeometry, LatheGeometry, ExtrudeGeometry, Shape, Path, Vector2, Vector3, Color,
  WebGLRenderer, Scene, PerspectiveCamera, OrthographicCamera, DirectionalLight, HemisphereLight, PMREMGenerator, EdgesGeometry, LineSegments, LineBasicMaterial, Box3,
  ACESFilmicToneMapping, DoubleSide, TubeGeometry, CatmullRomCurve3, SphereGeometry,
} from 'three';

/*
 * The car's components as 3D models, built to 2026-era Formula 1 proportions from reference photographs
 * of real parts (2022-25 ground-effect cars: McLaren MCL36A and Mercedes W14 front wings, the Alpine
 * A523's rear wing, beam wing and diffuser, RB19 sidepods, a carbon disc on its bell, the Mercedes
 * hybrid power unit, a carbon survival cell with the halo). Real dimensions in metres: x to the left,
 * y up, z forwards.
 *
 * Each model is parametric: the design brief (two axes, 0..1) changes its geometry the way a real
 * design would change (a high-downforce front wing has deeper, steeper flaps and outwash tips; a Monaco
 * rear wing is a deep spoon, a Monza one a flat plank; big cooling opens the sidepod inlet and adds
 * louvres...), and each spec is subtly different.
 *
 * partImage(slot, params, { view, mode }) renders one to an image (a data URL, cached): 'hero' (a
 * studio three-quarter view, carbon and team colours) or the orthographic 'front' | 'side' | 'top'
 * views as a technical drawing (edges on a blueprint).
 */

// ----------------------------------------------------------------------------------- materials
let carbonTex = null;
function carbonTexture() {
  if (carbonTex) return carbonTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#16171a'; g.fillRect(0, 0, 128, 128);
  // 2x2 twill: tows of 8 px, the over-under shifting one tow per row.
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const over = ((x + y) >> 1) % 2 === 0;
    const grd = g.createLinearGradient(x * 8, y * 8, x * 8 + (over ? 8 : 0), y * 8 + (over ? 0 : 8));
    grd.addColorStop(0, over ? '#2a2c31' : '#1c1d21'); grd.addColorStop(0.5, over ? '#383a40' : '#24262a'); grd.addColorStop(1, over ? '#25272b' : '#18191c');
    g.fillStyle = grd; g.fillRect(x * 8 + 0.5, y * 8 + 0.5, 7, 7);
  }
  carbonTex = new CanvasTexture(c); carbonTex.wrapS = carbonTex.wrapT = RepeatWrapping; carbonTex.colorSpace = SRGBColorSpace; carbonTex.anisotropy = 4;
  return carbonTex;
}
function mats(team) {
  const carbon = new MeshPhysicalMaterial({ color: 0xffffff, map: carbonTexture(), roughness: 0.42, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.18, envMapIntensity: 0.55, side: DoubleSide });
  const paint = new MeshPhysicalMaterial({ color: new Color(team?.colours?.[0] ?? '#e10600'), roughness: 0.32, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06, side: DoubleSide });
  const accent = new MeshPhysicalMaterial({ color: new Color(team?.colours?.[1] ?? '#ffffff'), roughness: 0.35, clearcoat: 1, side: DoubleSide });
  const metal = new MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.25, metalness: 1 });
  const titanium = new MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.35, metalness: 1 });
  const gold = new MeshStandardMaterial({ color: 0xd4a73a, roughness: 0.3, metalness: 1 });
  const disc = new MeshStandardMaterial({ color: 0x2b2b2d, roughness: 0.85, metalness: 0.2 });
  const glow = new MeshStandardMaterial({ color: 0x441010, emissive: 0xff2a1a, emissiveIntensity: 1.2 });
  return { carbon, paint, accent, metal, titanium, gold, disc, glow };
}

// ------------------------------------------------------------------------------------ geometry
/** An aerofoil section: points round it (leading edge at u = 0, trailing edge at u = 1), [u, v]. */
function aerofoil(t = 0.1, camber = 0.06, n = 14) {
  const up = [], lo = [];
  for (let k = 0; k <= n; k++) {
    const u = (1 - Math.cos((k / n) * Math.PI)) / 2;
    const yt = 5 * t * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4);
    const yc = camber * 4 * u * (1 - u);
    up.push([u, yc + yt]); lo.push([u, yc - yt]);
  }
  return [...up.reverse(), ...lo.slice(1)];   // TE (upper) -> LE -> TE (lower)
}
/**
 * A lofted surface through rings of points (each the same count): rings[i][j] = [x, y, z]. Closed
 * round each ring; the ends capped. UVs along the loft and round the ring (scaled for the weave).
 */
function loft(rings, { cap = true, uScale = 6, vScale = 2 } = {}) {
  const pos = [], uv = [], idx = [], n = rings[0].length;
  let along = 0;
  rings.forEach((r, i) => {
    if (i) along += Math.hypot(r[0][0] - rings[i - 1][0][0], r[0][1] - rings[i - 1][0][1], r[0][2] - rings[i - 1][0][2]);
    let round = 0;
    r.forEach((p, j) => { if (j) round += Math.hypot(p[0] - r[j - 1][0], p[1] - r[j - 1][1], p[2] - r[j - 1][2]); pos.push(...p); uv.push(along * uScale, round * vScale); });
  });
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < n - 1; j++) {
    const a = i * n + j, b = a + 1, c = a + n, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  if (cap) for (const i of [0, rings.length - 1]) {
    const r = rings[i], cx = r.reduce((s, p) => s + p[0], 0) / n, cy = r.reduce((s, p) => s + p[1], 0) / n, cz = r.reduce((s, p) => s + p[2], 0) / n;
    const c = pos.length / 3; pos.push(cx, cy, cz); uv.push(0, 0);
    for (let j = 0; j < n - 1; j++) idx.push(c, i * n + j + (i ? 0 : 1), i * n + j + (i ? 1 : 0));
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** Rotate a section [u along chord, v up] by pitch (deg; + = trailing edge up) to (dy, dz). */
function place(s, u, v) {
  const p = ((s.pitch ?? 0) * Math.PI) / 180, c = s.chord;
  const dz = -u * c, dy = v * c * (s.thick ?? 1);
  // Pitch about the leading edge: trailing edge rises with + pitch.
  return [s.x, s.y + dy * Math.cos(p) - dz * Math.sin(p), s.z + dz * Math.cos(p) + dy * Math.sin(p)];
}
function element(stations, sec = aerofoil(0.09, 0.07)) { return loft(stations.map((s) => sec.map(([u, v]) => place(s, u, v)))); }
/** Mirror stations of the left half to make the full span (x -> -x), joined in the middle. */
const span = (half) => [...half.slice().reverse().map((s) => ({ ...s, x: -s.x })), ...half.slice(1)];
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** A flat plate from a 2D outline (in its own plane), extruded by thickness, placed by a function. */
function plate(pts, thick, m) {
  const sh = new Shape(); pts.forEach(([u, v], k) => (k ? sh.lineTo(u, v) : sh.moveTo(u, v)));
  const g = new ExtrudeGeometry(sh, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.3, bevelSize: thick * 0.3, bevelSegments: 1, curveSegments: 6 });
  g.translate(0, 0, -thick / 2);
  return new Mesh(g, m);
}
/** An elliptical cross-section ring at z, centre (x, y), half-width w, half-height h. */
const ellipse = (z, x, y, w, h, n = 24, flat = 0) => Array.from({ length: n + 1 }, (_, k) => { const a = (k / n) * Math.PI * 2; const cy = Math.sin(a); return [x + Math.cos(a) * w, y + (cy < 0 ? cy * h * (1 - flat) : cy * h), z]; });


/** A rod between two points (radius r; flat > 1 squashes it into an aerofoil-ish strut). */
function rod(p1, p2, r, m, flat = 1) {
  const a = new Vector3(...p1), b = new Vector3(...p2), len = a.distanceTo(b);
  const geo = new CylinderGeometry(r, r, len, 12); geo.scale(flat, 1, 1);
  const mesh = new Mesh(geo, m);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return mesh;
}
const tube = (pts, r, m, seg = 40, rad = 10) => new Mesh(new TubeGeometry(new CatmullRomCurve3(pts.map((p) => new Vector3(...p))), seg, r, rad, false), m);
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const b = new Mesh(new BoxGeometry(w, h, d), m); b.position.set(x, y, z); return b; };
const lathe = (prof, m, seg = 48) => new Mesh(new LatheGeometry(prof.map(([r, y]) => new Vector2(r, y)), seg), m);
/** A rounded-rectangle ring (superellipse) at z: centre (x, y), half sizes w, h, roundness p; undercut pulls the lower half in. */
const sring = (z, x, y, w, h, p = 3, under = 0, n = 32) => Array.from({ length: n + 1 }, (_, k) => {
  const t = (k / n) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
  const ex = Math.sign(c) * Math.abs(c) ** (2 / p), ey = Math.sign(sn) * Math.abs(sn) ** (2 / p);
  const pull = ey < 0 ? 1 - under * (-ey) : 1;
  return [x + ex * w * pull, y + ey * h, z];
});

// -------------------------------------------------------------------------------------- the parts
const BUILD = {
  /**
   * Front wing (2022+ rules): four elements, the leading edge swept back in a V from the nose, the
   * outboard part sweeping up into a tall endplate; the nose sits on the main plane. Brief: load (deeper
   * flaps at steeper angles) and wake (outwash: the tips of the upper flaps lift and twist, the endplate
   * leans out).
   */
  frontWing(a, b, n, M) {
    const g = new Group(), half = 0.9, N = 18;
    // Real proportions: a broad main plane and three flaps, ~0.55 m of wing front to back; the stack
    // stays together outboard and rolls up into the endplate (the upper flaps twist up the most).
    const chords = [0.32, 0.18, 0.155, 0.13].map((c, k) => c * (0.88 + a * 0.24) * (k ? 1 + n * 0.012 : 1));
    const pitchBase = [3 + a * 3, 10 + a * 7, 17 + a * 9, 24 + a * 11];
    const R = 0.085 + a * 0.04 + b * 0.015;
    let zLE = 0, yBase = 0.07;
    const elems = [];
    for (let k = 0; k < 4; k++) {
      const st = [];
      for (let i = 0; i <= N; i++) {
        const x = (i / N) * half, out = smooth(0.28, 0.95, x);
        const sweep = 0.17 * (x / half) ** 1.5;                                      // the V in plan
        const twist = out * (4 + b * 8) * (k / 3);                                  // outwash: the upper flaps' tips twist up
        st.push({ x, y: yBase + out * (R + k * 0.01), z: zLE - sweep + out * k * 0.012, chord: chords[k] * (1 - out * 0.1), pitch: pitchBase[k] + twist });
      }
      elems.push(st);
      // The next element: its leading edge tucked under this one's trailing edge (a slot gap of ~10 mm).
      const p = (pitchBase[k] * Math.PI) / 180;
      zLE -= chords[k] * Math.cos(p) * 0.82; yBase += chords[k] * Math.sin(p) * 0.82 + 0.011;
    }
    elems.forEach((st, k) => {
      const geo = element(span(st), aerofoil(k ? 0.07 : 0.06, k ? -0.07 : -0.045, 18));   // inverted: the suction side underneath
      g.add(new Mesh(geo, k >= 2 ? M.paint : M.carbon));
    });
    // Endplates: tall, rounded at the top, from ahead of the main plane to behind the top flap at the tip;
    // leaning out with outwash. A footplate along the bottom, a painted accent along the top.
    const tips = elems.map((st) => { const t = st[N], p = (t.pitch * Math.PI) / 180; return { zf: t.z, zb: t.z - t.chord * Math.cos(p), yt: t.y + t.chord * Math.sin(p) }; });
    const zf = tips[0].zf + 0.05, zb = Math.min(...tips.map((t) => t.zb)) - 0.03, top = Math.max(...tips.map((t) => t.yt)) + 0.025;
    for (const sx of [-1, 1]) {
      const ep = new Group();
      // The endplate's outline (as on the 2022-25 cars): a rounded leading edge, the top falling away to
      // the rear, a notch at the trailing edge above the footplate.
      const L = zf - zb;
      ep.add(plate([[zf, 0.03], [zf + 0.012, 0.11], [zf - 0.01, top - 0.07], [zf - 0.06, top - 0.012], [zf - 0.12, top], [zb + L * 0.25, top - 0.03], [zb + 0.01, top - 0.075], [zb, 0.14], [zb + 0.035, 0.11], [zb + 0.02, 0.05], [zb + 0.06, 0.03]], 0.012, M.carbon));
      ep.add(plate([[zf - 0.02, top - 0.07], [zf - 0.1, top - 0.015], [zb + 0.05, top - 0.012], [zb + 0.01, top - 0.05], [zb + 0.0, top - 0.1]], 0.016, M.paint));
      ep.add(plate([[zf + 0.02, 0.012], [zb + 0.05, 0.012], [zb + 0.03, 0.05], [zf - 0.02, 0.035]], 0.02, M.carbon));
      ep.children.forEach((m) => { m.rotation.y = -Math.PI / 2; });
      ep.position.x = sx * (half + 0.008); ep.rotation.z = -sx * b * 0.14;
      g.add(ep);
    }
    // Flap adjusters (the brackets the mechanics turn) and the slot-gap separators.
    for (const sx of [-1, 1]) for (const x of [0.3, 0.52, 0.72]) {
      const out = smooth(0.32, 0.92, x), st = elems[2][Math.round((x / half) * N)];
      const br = new Mesh(new BoxGeometry(0.008, 0.05 + out * 0.04, 0.03), M.metal);
      br.position.set(sx * x, st.y + 0.02, st.z - 0.02);
      g.add(br);
    }
    // The nose: from its tip ahead of the main plane, rising and widening to the bulkhead.
    const rings = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, z = 0.12 - t * 0.62;
      rings.push(ellipse(z, 0, 0.115 + t * t * 0.16 + t * 0.02, 0.025 + Math.sqrt(t) * 0.1, 0.022 + Math.sqrt(t) * 0.085, 22, 0.35));
    }
    g.add(new Mesh(loft(rings), M.paint));
    const pylon = new Mesh(new BoxGeometry(0.012, 0.09, 0.2), M.carbon); pylon.position.set(0, 0.11, -0.05); g.add(pylon);
    return g;
  },

  /**
   * Rear wing (2022+ rules, after the Alpine A523): the main plane and the DRS flap with their tips
   * rolled down into curved endplates (louvred at the top of the trailing edge), the single swan-neck
   * pylon, the DRS actuator, the beam wing below, the rain light. Brief: downforce level (a Monaco
   * spoon, deep chord, steep flap .. a flat Monza plank) and the beam wing (one element for efficiency,
   * two for load).
   */
  rearWing(a, b, n, M) {
    const g = new Group(), half = 0.47, N = 22, base = 0.9;
    const c0 = (0.3 + a * 0.12) * (1 + n * 0.01), c1 = 0.16 + a * 0.09;
    const p0 = 6 + a * 12, p1 = 20 + a * 18, dip = a * 0.07;
    const st0 = [], st1 = [];
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * half, tip = smooth(0.72, 1, x / half), mid = 1 - (x / (half * 0.72)) ** 2;
      const y = base - Math.max(0, mid) * dip - tip * 0.07;                 // the spoon in the middle, the tips rolling down
      st0.push({ x, y, z: 0.0 - tip * 0.02, chord: c0 * (1 - tip * 0.15), pitch: p0 + tip * 25 });
      const pr = (p0 * Math.PI) / 180;
      st1.push({ x, y: y + c0 * Math.sin(pr) * 0.86 + 0.012, z: -c0 * Math.cos(pr) * 0.84, chord: c1 * (1 - tip * 0.2), pitch: p1 + tip * 10 });
    }
    g.add(new Mesh(element(span(st0), aerofoil(0.075, -0.07, 18)), M.carbon));
    g.add(new Mesh(element(span(st1), aerofoil(0.07, -0.08, 18)), M.paint));
    // Endplates: curved plates whose top joins the rolled tips; slots in the trailing edge.
    const zf = 0.12, zb = -c0 - c1 - 0.05, top = base + 0.07 + a * 0.03;
    for (const sx of [-1, 1]) {
      const ep = new Group();
      ep.add(plate([[zf - 0.04, 0.66], [zf - 0.01, 0.76], [zf - 0.04, top - 0.1], [zf - 0.12, top - 0.01], [zb + 0.1, top + 0.005], [zb + 0.02, top - 0.05], [zb + 0.02, 0.72], [zb + 0.1, 0.62]], 0.012, M.carbon));
      for (let k = 0; k < 5; k++) ep.add(plate([[zb + 0.005, top - 0.08 - k * 0.035], [zb - 0.05, top - 0.07 - k * 0.035], [zb - 0.05, top - 0.084 - k * 0.035], [zb + 0.005, top - 0.094 - k * 0.035]], 0.016, M.carbon));
      ep.add(plate([[zf - 0.05, top - 0.04], [zf - 0.12, top - 0.005], [zb + 0.1, top], [zb + 0.04, top - 0.03]], 0.018, M.paint));
      ep.children.forEach((m) => { m.rotation.y = -Math.PI / 2; });
      ep.position.x = sx * (half + 0.01); ep.rotation.z = sx * 0.04;
      g.add(ep);
    }
    // The swan-neck pylon: from the crash structure, up behind the main plane, hooking over to its top.
    g.add(tube([[0, 0.38, -0.1], [0, 0.6, -0.08], [0, 0.82, -0.06], [0, base + 0.05, 0.02], [0, base + 0.03, 0.08]], 0.016, M.carbon));
    g.add(box(0.02, 0.5, 0.06, M.carbon, 0, 0.62, -0.1));
    // DRS actuator pod on the main plane and its rod to the flap.
    g.add(box(0.05, 0.06, 0.12, M.carbon, 0, base - dip + 0.07, -0.08));
    g.add(rod([0, base - dip + 0.07, -0.13], [0, base - dip + 0.1, -0.2], 0.006, M.titanium));
    // Beam wing: one or two elements below, across the diffuser.
    const beams = b > 0.5 ? 2 : 1;
    for (let k = 0; k < beams; k++) {
      const st = []; for (let i = 0; i <= 12; i++) { const x = (i / 12) * 0.42; st.push({ x, y: 0.42 + k * 0.05 - (x / 0.42) ** 2 * 0.03, z: -0.06 - k * 0.1, chord: 0.12 - k * 0.025, pitch: 6 + b * 12 + k * 14 }); }
      g.add(new Mesh(element(span(st), aerofoil(0.09, -0.06, 14)), M.carbon));
    }
    // Crash structure and the rain light.
    g.add(box(0.16, 0.12, 0.45, M.carbon, 0, 0.32, 0.05));
    g.add(box(0.1, 0.07, 0.03, M.glow, 0, 0.3, -0.18));
    return g;
  },

  /**
   * Floor and diffuser (the 2022+ ground-effect floor), shown underside up as on a display stand: the
   * tunnel inlets with their fences, the Venturi tunnels sweeping back and up into the diffuser with its
   * strakes, the plank with its titanium skids, the edge wing along the side. Brief: peak load (more
   * fences, a steeper diffuser, a sharper edge wing) or a stable platform; the ride height it's designed
   * for (a low floor runs a lower throat and a more aggressive kick at the edges).
   */
  floor(a, b, n, M) {
    const g = new Group(), y0 = 0.02;
    // The floor body (top view outline), its underside facing up.
    const outline = [[0.22, 1.75], [0.62, 1.15], [0.8, 0.95], [0.83, -0.2], [0.78, -0.8], [0.62, -1.15], [0.52, -1.55], [-0.52, -1.55], [-0.62, -1.15], [-0.78, -0.8], [-0.83, -0.2], [-0.8, 0.95], [-0.62, 1.15], [-0.22, 1.75]];
    const fl = plate(outline.map(([x, z]) => [x, z]), 0.018, M.carbon); fl.rotation.x = Math.PI / 2; fl.position.y = y0; g.add(fl);
    // The plank down the middle (and its titanium skids), then the tunnels either side.
    const pl = plate([[0.15, 1.2], [0.15, -0.9], [-0.15, -0.9], [-0.15, 1.2]], 0.012, new MeshStandardMaterial({ color: 0xa57a4a, roughness: 0.8 })); pl.rotation.x = Math.PI / 2; pl.position.y = y0 + 0.022; g.add(pl);
    for (const z of [0.9, 0.1, -0.6]) g.add(box(0.06, 0.006, 0.12, M.titanium, 0, y0 + 0.03, z));
    const throat = 0.07 + (1 - b) * 0.03, kick = 0.22 + a * 0.12;
    for (const sx of [-1, 1]) {
      // Tunnel roof: a surface from the inlet (high), down to the throat, up into the diffuser.
      const rings = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16, z = 1.35 - t * 2.85;
        const h = t < 0.15 ? 0.16 - t * 0.6 : t < 0.6 ? throat : throat + ((t - 0.6) / 0.4) ** 1.6 * kick;
        const xi = 0.17, xo = 0.58 - Math.max(0, t - 0.75) * 0.3;
        rings.push([[sx * xi, y0 + 0.02, z], [sx * xi, y0 + h, z], [sx * (xi + xo) / 2 + 0 * sx, y0 + h + 0.012, z], [sx * xo, y0 + h, z], [sx * xo, y0 + 0.02, z]]);
      }
      g.add(new Mesh(loft(rings, { cap: false }), M.carbon));
      // Inlet fences (more for peak load), curving outwards.
      const fences = 3 + Math.round(a * 2);
      for (let k = 0; k < fences; k++) {
        const x = 0.2 + (k / Math.max(1, fences - 1)) * 0.42;
        const pts = []; for (let j = 0; j <= 8; j++) { const t = j / 8; pts.push([sx * (x + t * t * 0.12 * (k / fences + 0.3)), y0 + 0.02 + 0.09 * (1 - t * 0.6), 1.45 - t * 0.85]); }
        g.add(tube(pts, 0.006, M.carbon, 16, 6));
        const fence = plate([[1.45, 0], [0.6, 0], [0.6, 0.06], [1.45, 0.11]], 0.006, M.carbon); fence.rotation.y = -Math.PI / 2; fence.position.set(sx * x, y0 + 0.02, 0); g.add(fence);
      }
      // Diffuser strakes.
      for (let k = 0; k < 3; k++) { const st = plate([[-0.95, 0], [-1.52, 0], [-1.52, kick * 0.9], [-1.2, kick * 0.3]], 0.006, M.carbon); st.rotation.y = -Math.PI / 2; st.position.set(sx * (0.25 + k * 0.13), y0 + 0.02, 0); g.add(st); }
      // The edge wing along the side (sharper for peak load).
      const ew = []; for (let i = 0; i <= 10; i++) { const t = i / 10; ew.push({ x: sx * 0.84, y: y0 + 0.02 + t * 0.02, z: 0.75 - t * 0.9, chord: 0.07 + a * 0.03, pitch: 0 }); }
      const ewm = new Mesh(element(ew.map((e) => ({ ...e, x: 0 })), aerofoil(0.1, 0.08 + a * 0.06, 12)), M.paint);
      ewm.rotation.y = 0; ewm.position.x = sx * 0.84; ewm.rotation.z = sx * (0.6 + a * 0.4); g.add(ewm);
    }
    return g;
  },

  /**
   * Sidepods and engine cover (after the RB19 and W14): the inlet (bigger for big cooling), the deep
   * undercut, the top either ramping down hard (downwash) or running high and flat (water slide), the
   * engine cover between them; louvres on top for big cooling.
   */
  sidepods(a, b, n, M) {
    const g = new Group(), inlet = 0.12 + a * 0.08;
    // The engine cover spine.
    const spine = [];
    for (let i = 0; i <= 14; i++) { const t = i / 14, z = 0.55 - t * 2.1; spine.push(sring(z, 0, 0.62 - t * 0.28, 0.2 - t * 0.12, 0.2 - t * 0.12, 2.6)); }
    g.add(new Mesh(loft(spine), M.carbon));
    for (const sx of [-1, 1]) {
      const rings = [];
      for (let i = 0; i <= 18; i++) {
        const t = i / 18, z = 0.45 - t * 1.9;
        const front = smooth(0, 0.12, t);
        const w = (0.12 + front * (0.16 + a * 0.03)) * (1 - smooth(0.55, 1, t) * 0.7);
        const topDrop = b < 0.5 ? smooth(0.12, 0.7, t) * 0.24 : smooth(0.5, 1, t) * 0.24;   // downwash ramps early; the water slide stays high
        const hgt = (0.12 + front * 0.06) * (1 - smooth(0.6, 1, t) * 0.5);
        const cy = 0.42 - topDrop * 0.6 - t * 0.04;
        rings.push(sring(z, sx * (0.26 + w * 0.6), cy, w, hgt * (b < 0.5 ? 1 - topDrop * 1.2 : 1), 3.2, 0.55 - t * 0.25));
      }
      g.add(new Mesh(loft(rings), M.paint));
      // The inlet: a dark mouth at the front of the pod.
      const mouth = new Mesh(new BoxGeometry(0.26 + a * 0.05, inlet, 0.02), new MeshStandardMaterial({ color: 0x050506, roughness: 0.9 }));
      mouth.position.set(sx * 0.38, 0.45, 0.455); g.add(mouth);
      g.add(box(0.3 + a * 0.05, 0.012, 0.06, M.carbon, sx * 0.38, 0.45 + inlet / 2 + 0.01, 0.46));
      // Louvres on top (big cooling).
      const louv = Math.round(a * 6);
      for (let k = 0; k < louv; k++) g.add(box(0.12, 0.012, 0.025, M.carbon, sx * 0.36, 0.48 - k * 0.02 - (b < 0.5 ? 0.06 : 0), -0.25 - k * 0.07));
    }
    return g;
  },

  /**
   * Front suspension corner: double wishbones of aerofoil-section carbon, the pushrod (or pullrod) and
   * track rod, the upright with the brake duct drum, the wheel. Brief: set-up window (mechanical grip:
   * a pullrod, more camber; aero platform: a pushrod, flatter arms) and anti-dive (the arms' inclination).
   */
  suspension(a, b, n, M) {
    const g = new Group(), wx = 0.72, wy = 0.36, inc = (b - 0.5) * 0.08;
    // The wheel: rim and tyre (context).
    const tyre = new Mesh(new TorusGeometry(0.31, 0.11, 16, 48), new MeshStandardMaterial({ color: 0x18181a, roughness: 0.9 }));
    tyre.rotation.y = Math.PI / 2; tyre.position.set(wx + 0.06, wy, 0); tyre.scale.set(1, 1, 1.25); g.add(tyre);
    const rim = lathe([[0.0, -0.17], [0.23, -0.17], [0.24, -0.15], [0.24, 0.15], [0.23, 0.17], [0.0, 0.17]], new MeshStandardMaterial({ color: 0x2a2b2e, metalness: 0.6, roughness: 0.4 }));
    rim.rotation.z = Math.PI / 2; rim.position.set(wx + 0.06, wy, 0); g.add(rim);
    // Upright and the brake drum.
    g.add(box(0.06, 0.3, 0.1, M.titanium, wx - 0.08, wy, 0));
    const drum = lathe([[0.12, -0.06], [0.16, -0.04], [0.17, 0.04], [0.12, 0.06]], M.carbon); drum.rotation.z = Math.PI / 2; drum.position.set(wx - 0.02, wy, 0); g.add(drum);
    // Wishbones: front and rear legs to the chassis.
    const top = [wx - 0.1, wy + 0.13, 0], bot = [wx - 0.1, wy - 0.13, 0];
    const camber = 0.02 + a * 0.03;
    for (const [p, h] of [[top, 0.56 + a * 0.03], [bot, 0.22]]) {
      for (const dz of [0.22, -0.2]) g.add(rod([p[0] + (p === top ? camber : 0), p[1], p[2]], [0.12, h + (dz > 0 ? inc : -inc), dz], 0.012, M.carbon, 2.6));
    }
    // Push or pull rod, and the track rod.
    const pull = a > 0.5;
    g.add(pull ? rod([wx - 0.12, wy + 0.12, 0.02], [0.14, 0.24, 0.02], 0.012, M.paint) : rod([wx - 0.12, wy - 0.12, 0.02], [0.14, 0.6, 0.02], 0.012, M.paint));
    g.add(rod([wx - 0.1, wy + 0.02, 0.12], [0.12, 0.42, 0.14], 0.008, M.carbon, 2));
    // The chassis side (context).
    g.add(box(0.06, 0.5, 0.7, M.carbon, 0.1, 0.42, 0));
    return g;
  },

  /**
   * Brakes: the carbon disc with its rows of ventilation holes drilled into the rim, on its aluminium
   * bell with the titanium drive pegs, and the six-piston monobloc caliper; the cooling drum. Brief: duct
   * size (more holes and a bigger drum for cooling; small and light) and the pad (progressive or bite).
   */
  brakes(a, b, n, M) {
    const g = new Group(), R = 0.164, r = 0.105, th = 0.032;
    const ring = new Shape(); ring.absarc(0, 0, R, 0, Math.PI * 2, false); const hole = new Path(); hole.absarc(0, 0, r, 0, Math.PI * 2, true); ring.holes.push(hole);
    const disc = new Mesh(new ExtrudeGeometry(ring, { depth: th, bevelEnabled: false, curveSegments: 64 }), M.disc); disc.position.z = -th / 2; g.add(disc);
    // The ventilation holes: rows round the rim, seen as dark dots on the outer edge and the faces.
    const rows = 3 + Math.round(a * 3), per = 60 + Math.round(a * 40), dot = new MeshBasicMaterial({ color: 0x050505 });
    const dg = new CylinderGeometry(0.0022, 0.0022, 0.004, 6);
    for (let k = 0; k < rows; k++) for (let j = 0; j < per; j++) {
      const t = (j / per) * Math.PI * 2 + k * 0.03, m = new Mesh(dg, dot);
      m.position.set(Math.cos(t) * (R + 0.0005), Math.sin(t) * (R + 0.0005), -th / 2 + ((k + 0.5) / rows) * th);
      m.rotation.z = t + Math.PI / 2; g.add(m);
      if (j % 2 === 0) { const f = new Mesh(dg, dot); f.position.set(Math.cos(t) * (r + 0.008 + k * ((R - r - 0.016) / Math.max(1, rows - 1))), Math.sin(t) * (r + 0.008 + k * ((R - r - 0.016) / Math.max(1, rows - 1))), th / 2 + 0.001); f.rotation.x = Math.PI / 2; g.add(f); }
    }
    // The bell and its drive pegs.
    const bell = lathe([[0.03, 0.06], [0.06, 0.06], [0.07, 0.03], [0.1, 0.02], [0.11, 0.0], [0.03, 0.0]], M.metal); bell.rotation.x = Math.PI / 2; bell.position.z = th / 2; g.add(bell);
    for (let j = 0; j < 12; j++) { const t = (j / 12) * Math.PI * 2, pg = new Mesh(new CylinderGeometry(0.006, 0.006, 0.012, 10), M.gold); pg.rotation.x = Math.PI / 2; pg.position.set(Math.cos(t) * 0.1, Math.sin(t) * 0.1, th / 2 + 0.006); g.add(pg); }
    // The caliper: a curved monobloc over the trailing side (bigger, deeper for a strong bite).
    const cal = new Shape(), a0 = -0.55, a1 = 0.55, ro = R + 0.025 + b * 0.01, ri = R - 0.035;
    cal.absarc(0, 0, ro, a0, a1, false); cal.absarc(0, 0, ri, a1, a0, true);
    const cm = new Mesh(new ExtrudeGeometry(cal, { depth: th + 0.05, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, curveSegments: 24 }), M.paint);
    cm.position.z = -(th + 0.05) / 2; g.add(cm);
    // The cooling drum (bigger for cooling).
    const drum = lathe([[R + 0.03, -0.05 - a * 0.03], [R + 0.04 + a * 0.02, -0.02], [R + 0.04 + a * 0.02, 0.0]], M.carbon); drum.rotation.x = Math.PI / 2; drum.position.z = -0.03; drum.scale.set(1, 1, 1); g.add(drum);
    return g;
  },

  /**
   * Chassis: the carbon survival cell (after the Sauber tub): the front bulkhead, the cockpit opening,
   * the side impact structures, the roll hoop and the titanium halo. Brief: weight saving (lighter
   * lay-up, cut-backs) or stiffness; the layout (where the mass and the fuel cell sit).
   */
  chassis(a, b, n, M) {
    const g = new Group();
    const rings = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, z = 1.1 - t * 2.0;
      const w = 0.15 + smooth(0, 0.45, t) * 0.27 - smooth(0.85, 1, t) * 0.04, h = 0.17 + smooth(0, 0.5, t) * 0.17;
      rings.push(sring(z, 0, 0.32 + smooth(0, 0.5, t) * 0.08 + (b - 0.5) * 0.02, w, h, 3.5, 0.15));
    }
    g.add(new Mesh(loft(rings), M.carbon));
    g.add(box(0.36, 0.02, 0.62, new MeshStandardMaterial({ color: 0x050506, roughness: 0.9 }), 0, 0.73, -0.05));   // cockpit opening
    // The halo: a titanium hoop over the cockpit on a centre pillar.
    const hp = []; for (let k = 0; k <= 20; k++) { const t = (k / 20) * Math.PI; hp.push([Math.cos(t) * 0.24, 0.82 + Math.sin(t) * 0.05, -0.25 - Math.sin(t) * 0.25]); }
    g.add(tube(hp, 0.022, M.titanium, 40, 12));
    g.add(rod([0, 0.86, 0.22], [0, 0.74, 0.4], 0.02, M.titanium));
    for (const sx of [-1, 1]) g.add(rod([sx * 0.24, 0.82, -0.25], [sx * 0.24, 0.7, -0.32], 0.02, M.titanium));
    // Roll hoop (the airbox above the driver's head).
    g.add(tube([[0, 0.76, -0.62], [0, 0.98, -0.66], [0, 1.02, -0.78], [0, 0.8, -0.86]], 0.05, M.carbon, 20, 12));
    // Side impact structures (cut back for weight saving).
    for (const sx of [-1, 1]) g.add(rod([sx * 0.4, 0.42, -0.1], [sx * (0.62 - a * 0.06), 0.42, -0.1], 0.03, M.carbon, 1.4));
    g.add(box(0.2 + a * 0, 0.22, 0.06, M.paint, 0, 0.3, 1.11));                                                        // front bulkhead face
    return g;
  },

  /**
   * Power unit (after the Mercedes hybrid power unit): the 90-degree V6 with its cam covers, the carbon
   * plenum on top, the heat-wrapped exhaust manifolds to the turbo, the turbine and compressor, the
   * MGU-K, the energy store underneath. Brief: combustion (peak power: a bigger turbo; reliability) and
   * deployment (a bigger energy store for long straights).
   */
  pu(a, b, n, M) {
    const g = new Group();
    const alu = new MeshStandardMaterial({ color: 0x8d9198, metalness: 0.85, roughness: 0.35 }), foil = new MeshStandardMaterial({ color: 0xc9b98a, metalness: 1, roughness: 0.32 });
    // Crankcase and the two banks at 90 degrees.
    g.add(box(0.36, 0.2, 0.62, alu, 0, 0.18, 0));
    for (const sx of [-1, 1]) {
      const bank = new Group();
      bank.add(box(0.16, 0.26, 0.56, alu, 0, 0.13, 0));
      bank.add(box(0.13, 0.05, 0.52, M.carbon, 0, 0.28, 0));          // cam cover
      bank.rotation.z = sx * Math.PI / 4; bank.position.set(sx * 0.1, 0.28, 0);
      g.add(bank);
      // Exhaust manifold: three heat-wrapped primaries per bank sweeping back to the turbine.
      for (let k = 0; k < 3; k++) g.add(tube([[sx * 0.26, 0.3, 0.2 - k * 0.18], [sx * 0.34, 0.24, 0.12 - k * 0.18], [sx * 0.3, 0.16, -0.32], [sx * 0.08, 0.2, -0.46]], 0.022, foil, 30, 10));
    }
    // The plenum: a carbon shell over the vee.
    const pl = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pl.push(sring(0.3 - t * 0.6, 0, 0.5 + Math.sin(t * Math.PI) * 0.04, 0.16, 0.1 + Math.sin(t * Math.PI) * 0.03, 2.5)); }
    g.add(new Mesh(loft(pl), M.carbon));
    // Turbine at the back, the compressor at the front, the shaft between (the MGU-H on it).
    const tr = 0.09 + a * 0.03;
    const turb = new Mesh(new TorusGeometry(tr, 0.05, 12, 30), foil); turb.position.set(0, 0.22, -0.52); g.add(turb);
    g.add(rod([0, 0.22, -0.5], [0, 0.22, 0.42], 0.025, M.metal));
    const comp = new Mesh(new TorusGeometry(tr * 0.95, 0.045, 12, 30), alu); comp.position.set(0, 0.22, 0.44); g.add(comp);
    g.add(tube([[0, 0.22, -0.6], [0, 0.18, -0.75], [0, 0.2, -0.9]], 0.05, foil, 12, 12));               // tailpipe
    // MGU-K on the side; the energy store underneath (bigger for long straights).
    const mguk = new Mesh(new CylinderGeometry(0.07, 0.07, 0.2, 24), M.paint); mguk.rotation.x = Math.PI / 2; mguk.position.set(-0.24, 0.12, 0.22); g.add(mguk);
    g.add(box(0.5, 0.1 + b * 0.04, 0.5 + b * 0.12, new MeshStandardMaterial({ color: 0xb5b9c0, metalness: 0.7, roughness: 0.4 }), 0, 0.02, 0.0));
    g.add(box(0.12, 0.02, 0.2, new MeshStandardMaterial({ color: 0xffd21f, roughness: 0.6 }), 0.12, 0.09 + b * 0.02, 0.1));           // HV warning label
    return g;
  },
};

// ------------------------------------------------------------------------------------ rendering
let studio = null;
function getStudio() {
  if (studio) return studio;
  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(960, 600, false);
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  // A studio for reflections: a dark room with soft-box panels.
  const room = new Scene();
  room.background = new Color(0x0a0b0d);
  const panel = (w, h, x, y, z, rx, ry, c = 0xffffff) => { const m = new Mesh(new BoxGeometry(w, h, 0.05), new MeshBasicMaterial({ color: c })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); room.add(m); };
  panel(6, 1.4, 0, 5, 0, Math.PI / 2, 0, 0xffffff); panel(4, 2, -5, 2, 2, 0, Math.PI / 2, 0xbfd4ff); panel(4, 2, 5, 1.5, -2, 0, -Math.PI / 2, 0xfff1e0); panel(8, 0.4, 0, 0.4, -6, 0, 0, 0x8899aa);
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  const key = new DirectionalLight(0xffffff, 2.2); key.position.set(3, 5, 4); scene.add(key);
  const rim = new DirectionalLight(0x9fc4ff, 1.6); rim.position.set(-4, 3, -5); scene.add(rim);
  scene.add(new HemisphereLight(0xdde6ff, 0x101015, 0.6));
  studio = { renderer, scene, cache: new Map() };
  return studio;
}
/** The model of a part (cached per brief). */
export function partModel(slot, { dir = [0.5, 0.5], n = 0, team = null } = {}) {
  const b = BUILD[slot] ?? BUILD.frontWing;
  return b(dir[0], dir[1], n, mats(team));
}
const VIEWS = {
  hero: { dir: [0.75, 0.8, 1.25], fov: 24 },
  heroOf: { rearWing: [-0.85, 0.85, -1.15], floor: [0.75, 1.0, 1.35], sidepods: [1.15, 0.7, 1.2], suspension: [0.25, 1.2, 1.15], brakes: [0.35, 0.3, 1.0], chassis: [1.2, 0.8, 1.0], pu: [1.1, 0.9, 1.3] },
  front: { ortho: [0, 0, 1] }, side: { ortho: [1, 0, 0] }, top: { ortho: [0, 1, 0.0001] },
};
/**
 * The part as an image: view 'hero' (shaded, studio) or 'front' | 'side' | 'top' (a technical drawing:
 * the part's edges, light on transparent, for a blueprint background). Returns a PNG data URL.
 */
export function partImage(slot, params = {}, { view = 'hero', w = 960, h = 600 } = {}) {
  const S = getStudio();
  const key = JSON.stringify([slot, params.dir, params.n, params.team?.id, view, w, h]);
  if (S.cache.has(key)) return S.cache.get(key);
  const model = partModel(slot, params), V = VIEWS[view];
  const box = new Box3().setFromObject(model), size = box.getSize(new Vector3()), ctr = box.getCenter(new Vector3());
  S.renderer.setSize(w, h, false);
  let cam, out;
  const scene = new Scene();
  if (!V.ortho) {
    scene.environment = S.scene.environment;
    S.scene.children.forEach((c) => scene.add(c.clone()));
    scene.add(model);
    cam = new PerspectiveCamera(V.fov, w / h, 0.05, 50);
    const d = new Vector3(...(VIEWS.heroOf[slot] ?? V.dir)).normalize(), r = size.length() / 2 / Math.sin(((V.fov / 2) * Math.PI) / 180) * 0.78;
    cam.position.copy(ctr).addScaledVector(d, r); cam.lookAt(ctr);
  } else {
    // The drawing: dark faces (so hidden edges hide) and crisp edges.
    const face = new MeshBasicMaterial({ color: 0x0c2a52, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    const edge = new LineBasicMaterial({ color: 0xd9ecff });
    model.traverse((o) => { if (o.isMesh) { o.material = face; const e = new LineSegments(new EdgesGeometry(o.geometry, 22), edge); o.add(e); } });
    scene.add(model);
    const d = new Vector3(...V.ortho).normalize();
    const ext = view === 'front' ? [size.x, size.y] : view === 'side' ? [size.z, size.y] : [size.x, size.z];
    const k = Math.max(ext[0] / (w / h), ext[1]) * 0.56;
    cam = new OrthographicCamera((-k * w) / h, (k * w) / h, k, -k, 0.01, 50);
    cam.position.copy(ctr).addScaledVector(d, 10); if (view === 'top') cam.up.set(0, 0, -1); cam.lookAt(ctr);
  }
  S.renderer.setClearColor(0x000000, 0);
  S.renderer.render(scene, cam);
  out = S.renderer.domElement.toDataURL('image/png');
  model.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  S.cache.set(key, out);
  if (S.cache.size > 80) S.cache.delete(S.cache.keys().next().value);
  return out;
}
export const PART_SLOTS = () => Object.keys(BUILD);
/**
 * Any 3D object as a studio image (the news pages' portraits): key caches it; dir is the camera
 * direction from the target; frame: [centre y, height] of what to fill the image with.
 */
export function objectImage(key, make, { dir = [0.35, 0.12, 1], fov = 22, w = 640, h = 400, frame = null, bg = null } = {}) {
  const S = getStudio();
  if (S.cache.has(key)) return S.cache.get(key);
  const obj = make();
  const scene = new Scene();
  scene.environment = S.scene.environment;
  S.scene.children.forEach((c) => scene.add(c.clone()));
  scene.add(obj);
  const box = new Box3().setFromObject(obj), size = box.getSize(new Vector3()), ctr = box.getCenter(new Vector3());
  if (typeof frame === 'function') frame = frame(box);
  if (frame) { ctr.y = frame[0]; size.set(frame[1] * (w / h), frame[1], frame[1]); }
  S.renderer.setSize(w, h, false);
  const cam = new PerspectiveCamera(fov, w / h, 0.05, 60), d = new Vector3(...dir).normalize();
  const r = (Math.max(size.y, size.x / (w / h)) / 2) / Math.tan(((fov / 2) * Math.PI) / 180) * 1.05;
  cam.position.copy(ctr).addScaledVector(d, r); cam.lookAt(ctr);
  if (bg) { scene.background = new Color(bg); } else S.renderer.setClearColor(0x000000, 0);
  S.renderer.render(scene, cam);
  const out = S.renderer.domElement.toDataURL('image/png');
  S.cache.set(key, out);
  return out;
}
void TorusGeometry; void LatheGeometry; void Path; void Vector2; void CylinderGeometry; void TubeGeometry; void CatmullRomCurve3; void SphereGeometry;
