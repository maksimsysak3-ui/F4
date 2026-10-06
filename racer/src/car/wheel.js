import { Group, Mesh, LatheGeometry, Vector2, Vector3, Shape, ExtrudeGeometry, CylinderGeometry, BoxGeometry } from 'three';
import { facet } from './meshBuilder.js?v=a5d31c9';

const TIRE_SEGMENTS = 22;

/** Lathe a profile given as [radius, axialOffset] pairs around the X axis. */
function latheX(profile, segments) {
  const geo = new LatheGeometry(profile.map(([r, x]) => new Vector2(r, x)), segments);
  geo.rotateZ(-Math.PI / 2); // lathe axis Y -> X
  return facet(geo);
}

/** Y-shaped spoke, the Huracán-style design, in the wheel face plane. */
function ySpokeShape() {
  const s = new Shape();
  const pts = [
    [-0.017, 0.05], [0.017, 0.05], [0.021, 0.125], [0.079, 0.214], [0.052, 0.226],
    [0.0, 0.152], [-0.052, 0.226], [-0.079, 0.214], [-0.021, 0.125],
  ];
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return s;
}

/**
 * One wheel assembly. Returns:
 *  root  - positioned at the hub, steers about Y
 *  spin  - child of root, rotates about X with the wheel
 * Outer face points to +X; mirrored for right-hand wheels.
 */
/** Torq-Thrust style spoke: tapered from a wide root to a narrow tip, classic muscle-car mag. */
function torqSpokeShape() {
  const s = new Shape();
  const pts = [[-0.045, 0.07], [0.045, 0.07], [0.022, 0.215], [-0.022, 0.215]];
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return s;
}

/** style: 'ySpoke' (Lamborghini, centre-lock), 'torq' (classic mag, lug nuts, taller sidewall) or
 * 'offroad' (all-terrain tyre with block tread, six-spoke wheel with a beadlock ring). */
export function buildWheel(mats, { radius, width, left, style = 'ySpoke' }) {
  const root = new Group();
  const spin = new Group();
  const holder = new Group();
  root.add(spin);
  spin.add(holder);
  if (!left) holder.rotation.y = Math.PI;

  const hw = width / 2;
  if (style === 'kart') return kartWheel(mats, root, spin, holder, radius, hw);
  if (style === 'rally') return rallyWheel(mats, root, spin, holder, radius, hw, left);
  if (style === 'aero') return aeroWheel(mats, root, spin, holder, radius, hw, left);
  const off = style === 'offroad';
  const torq = style === 'torq' || off; // offroad shares the lug-nut hub and recessed face
  const rimR = radius * (off ? 0.56 : torq ? 0.64 : 0.72);

  // Tire: tread + rounded shoulders + sidewalls, one low-poly lathe each.
  const tread = latheX([
    [radius * 0.96, -hw], [radius, -hw + 0.03], [radius, hw - 0.03], [radius * 0.96, hw],
  ], TIRE_SEGMENTS);
  // Profile order sets which way lathe faces point; these run so the walls face away from the tire centre.
  const wall = latheX([
    [radius * 0.96, hw], [radius * 0.9, hw + 0.004], [rimR, hw - 0.012],
  ], TIRE_SEGMENTS);
  const wallIn = latheX([
    [rimR, -hw + 0.012], [radius * 0.9, -hw - 0.004], [radius * 0.96, -hw],
  ], TIRE_SEGMENTS);
  for (const [g, m] of [[tread, mats.tire], [wall, mats.tireWall], [wallIn, mats.tireWall]]) {
    const mesh = new Mesh(g, m);
    mesh.castShadow = true;
    holder.add(mesh);
  }

  if (off) {
    // All-terrain tread: staggered blocks standing proud of the carcass, and shoulder lugs.
    const block = new BoxGeometry(width * 0.4, 0.028, radius * 0.17);
    const lug = new BoxGeometry(0.03, radius * 0.1, radius * 0.14);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      for (const sx of [-1, 1]) {
        const m = new Mesh(block, mats.tire);
        const x = sx * width * (i % 2 ? 0.22 : 0.26);
        m.position.set(x, Math.cos(a) * (radius + 0.008), Math.sin(a) * (radius + 0.008));
        m.rotation.x = -a;
        holder.add(m);
        const l = new Mesh(lug, mats.tireWall);
        l.position.set(sx * (hw + 0.006), Math.cos(a + 0.17) * radius * 0.9, Math.sin(a + 0.17) * radius * 0.9);
        l.rotation.x = -a - 0.17;
        holder.add(l);
      }
    }
  }

  // Rim barrel (inside) and polished lip.
  const barrel = new Mesh(latheX([[rimR, hw - 0.02], [rimR * 0.97, -hw + 0.02]], 18), mats.rim);
  const lip = new Mesh(latheX([[rimR * 1.01, hw - 0.004], [rimR * 0.93, hw - 0.012], [rimR * 0.92, hw - 0.04]], 30), mats.rimLip);
  holder.add(barrel, lip);

  // Five spokes.
  const spokeGeo = facet(new ExtrudeGeometry(torq ? torqSpokeShape() : ySpokeShape(), { depth: 0.028, bevelEnabled: false }));
  spokeGeo.scale(rimR / 0.235, rimR / 0.235, 1);
  spokeGeo.rotateY(Math.PI / 2); // shape plane XY -> ZY, extrude along X
  if (torq) {
    // Dark recessed face behind the polished spokes.
    const face = new Mesh(facet(new CylinderGeometry(rimR * 0.93, rimR * 0.93, 0.01, 20)), mats.rim);
    face.rotation.z = Math.PI / 2;
    face.position.x = hw - 0.065;
    holder.add(face);
  }
  const spokes = off ? 6 : 5;
  for (let i = 0; i < spokes; i++) {
    const spoke = new Mesh(spokeGeo, torq && !off ? mats.rimLip : mats.rim);
    spoke.rotation.x = (i / spokes) * Math.PI * 2;
    spoke.position.x = hw - 0.05;
    spoke.castShadow = true;
    holder.add(spoke);
  }

  if (torq) {
    // Domed chrome cap and five lug nuts.
    const capT = new Mesh(facet(new CylinderGeometry(0.035, 0.055, 0.04, 10)), mats.chrome);
    capT.rotation.z = Math.PI / 2;
    capT.position.x = hw - 0.025;
    holder.add(capT);
    if (off) {
      // Beadlock ring bolted round the rim edge.
      const ring = new Mesh(latheX([[rimR * 1.04, hw + 0.004], [rimR * 0.9, hw + 0.004], [rimR * 0.9, hw - 0.01]], 24), mats.rimLip);
      holder.add(ring);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const bolt = new Mesh(facet(new CylinderGeometry(0.008, 0.008, 0.02, 6)), mats.chrome);
        bolt.rotation.z = Math.PI / 2;
        bolt.position.set(hw + 0.008, Math.cos(a) * rimR * 0.97, Math.sin(a) * rimR * 0.97);
        holder.add(bolt);
      }
    }
    for (let i = 0; i < 5; i++) {
      const a = ((i + 0.5) / 5) * Math.PI * 2;
      const nut = new Mesh(facet(new CylinderGeometry(0.012, 0.012, 0.03, 6)), mats.chrome);
      nut.rotation.z = Math.PI / 2;
      nut.position.set(hw - 0.04, Math.cos(a) * 0.075, Math.sin(a) * 0.075);
      holder.add(nut);
    }
  }

  // Hexagonal centre-lock nut.
  const hub = new Mesh(facet(new CylinderGeometry(0.05, 0.058, 0.05, 6)), mats.rimLip);
  hub.rotation.z = Math.PI / 2;
  hub.position.x = hw - 0.03;
  const cap = new Mesh(facet(new CylinderGeometry(0.03, 0.03, 0.012, 6)), mats.gold);
  cap.rotation.z = Math.PI / 2;
  cap.position.x = hw - 0.002;
  if (!torq) holder.add(hub, cap);

  // Brake disc spins; the caliper does not.
  const disc = new Mesh(facet(new CylinderGeometry(rimR * 0.86, rimR * 0.86, 0.028, 24)), mats.disc);
  disc.rotation.z = Math.PI / 2;
  disc.position.x = hw - 0.11;
  holder.add(disc);

  const caliper = new Mesh(new BoxGeometry(0.05, 0.13, 0.075), mats.caliper);
  caliper.position.set((left ? 1 : -1) * (hw - 0.085), rimR * 0.62, -rimR * 0.42);
  caliper.rotation.x = 0.6;
  caliper.castShadow = true;
  root.add(caliper);

  return { root, spin };
}

/**
 * Kart wheel: a wide, low slick with square shoulders on a small cast
 * magnesium rim: a flat dished face with six lightening holes, a raised hub
 * boss with three studs and a gold centre nut. No brake inside (the kart
 * brakes on its rear axle).
 */
function kartWheel(mats, root, spin, holder, radius, hw) {
  const rimR = radius * 0.6;
  const tread = latheX([[radius * 0.97, -hw], [radius, -hw + 0.012], [radius, hw - 0.012], [radius * 0.97, hw]], TIRE_SEGMENTS);
  const wall = latheX([[radius * 0.97, hw], [radius * 0.93, hw + 0.002], [rimR * 1.04, hw - 0.004]], TIRE_SEGMENTS);
  const wallIn = latheX([[rimR * 1.04, -hw + 0.004], [radius * 0.93, -hw - 0.002], [radius * 0.97, -hw]], TIRE_SEGMENTS);
  for (const [g, m] of [[tread, mats.tire], [wall, mats.tireWall], [wallIn, mats.tireWall]]) {
    const mesh = new Mesh(g, m);
    mesh.castShadow = true;
    holder.add(mesh);
  }
  // Bead flange, dish and face.
  holder.add(new Mesh(latheX([[rimR * 1.05, hw - 0.002], [rimR * 0.98, hw - 0.01], [rimR * 0.96, -hw + 0.01], [rimR * 1.05, -hw + 0.002]], 24), mats.rimLip));
  const face = new Mesh(facet(new CylinderGeometry(rimR * 0.96, rimR * 0.96, 0.012, 24)), mats.rim);
  face.rotation.z = Math.PI / 2;
  face.position.x = hw - 0.03;
  holder.add(face);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const hole = new Mesh(facet(new CylinderGeometry(rimR * 0.17, rimR * 0.17, 0.014, 10)), mats.tire);
    hole.rotation.z = Math.PI / 2;
    hole.position.set(hw - 0.028, Math.cos(a) * rimR * 0.6, Math.sin(a) * rimR * 0.6);
    holder.add(hole);
  }
  const boss = new Mesh(facet(new CylinderGeometry(rimR * 0.3, rimR * 0.36, 0.03, 12)), mats.rimLip);
  boss.rotation.z = Math.PI / 2;
  boss.position.x = hw - 0.012;
  holder.add(boss);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const stud = new Mesh(facet(new CylinderGeometry(0.009, 0.009, 0.03, 6)), mats.chrome);
    stud.rotation.z = Math.PI / 2;
    stud.position.set(hw + 0.004, Math.cos(a) * rimR * 0.2, Math.sin(a) * rimR * 0.2);
    holder.add(stud);
  }
  const nut = new Mesh(facet(new CylinderGeometry(0.018, 0.018, 0.02, 6)), mats.gold);
  nut.rotation.z = Math.PI / 2;
  nut.position.x = hw + 0.006;
  holder.add(nut);
  return { root, spin };
}

/** Tyre carcass shared by the custom wheels: tread band and two sidewalls down to rimR. */
function carcass(mats, holder, radius, hw, rimR, crown = 0.97) {
  const tread = latheX([[radius * crown, -hw], [radius, -hw + hw * 0.15], [radius, hw - hw * 0.15], [radius * crown, hw]], TIRE_SEGMENTS);
  const wall = latheX([[radius * crown, hw], [radius * 0.9, hw + 0.004], [rimR * 1.03, hw - 0.008]], TIRE_SEGMENTS);
  const wallIn = latheX([[rimR * 1.03, -hw + 0.008], [radius * 0.9, -hw - 0.004], [radius * crown, -hw]], TIRE_SEGMENTS);
  for (const [g, m] of [[tread, mats.tire], [wall, mats.tireWall], [wallIn, mats.tireWall]]) {
    const mesh = new Mesh(g, m);
    mesh.castShadow = true;
    holder.add(mesh);
  }
}

/**
 * Gravel rally wheel: a chunky block-tread tyre on a white flat-faced rim with
 * eight round lightening holes, a deep dish and five wheel nuts; a vented disc
 * and the red caliper behind it.
 */
function rallyWheel(mats, root, spin, holder, radius, hw, left) {
  const rimR = radius * 0.6;
  carcass(mats, holder, radius, hw, rimR, 0.95);
  // Gravel blocks across the tread, staggered.
  const block = new BoxGeometry(hw * 0.7, 0.02, radius * 0.13);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    for (const sx of [-1, 1]) {
      const m = new Mesh(block, mats.tire);
      m.position.set(sx * hw * (i % 2 ? 0.4 : 0.5), Math.cos(a) * (radius + 0.006), Math.sin(a) * (radius + 0.006));
      m.rotation.x = -a;
      holder.add(m);
    }
  }
  holder.add(new Mesh(latheX([[rimR * 1.04, hw - 0.004], [rimR * 0.97, hw - 0.012], [rimR * 0.95, -hw + 0.012], [rimR * 1.04, -hw + 0.004]], 24), mats.rim));
  const face = new Mesh(facet(new CylinderGeometry(rimR * 0.95, rimR * 0.95, 0.014, 24)), mats.rim);
  face.rotation.z = Math.PI / 2;
  face.position.x = hw - 0.045;
  holder.add(face);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const hole = new Mesh(facet(new CylinderGeometry(rimR * 0.15, rimR * 0.15, 0.016, 10)), mats.tire);
    hole.rotation.z = Math.PI / 2;
    hole.position.set(hw - 0.043, Math.cos(a) * rimR * 0.66, Math.sin(a) * rimR * 0.66);
    holder.add(hole);
  }
  for (let i = 0; i < 5; i++) {
    const a = ((i + 0.5) / 5) * Math.PI * 2;
    const nut = new Mesh(facet(new CylinderGeometry(0.012, 0.012, 0.03, 6)), mats.chrome);
    nut.rotation.z = Math.PI / 2;
    nut.position.set(hw - 0.03, Math.cos(a) * rimR * 0.28, Math.sin(a) * rimR * 0.28);
    holder.add(nut);
  }
  const disc = new Mesh(facet(new CylinderGeometry(rimR * 0.8, rimR * 0.8, 0.026, 22)), mats.disc);
  disc.rotation.z = Math.PI / 2;
  disc.position.x = hw - 0.11;
  holder.add(disc);
  const caliper = new Mesh(new BoxGeometry(0.05, 0.12, 0.07), mats.caliper);
  caliper.position.set((left ? 1 : -1) * (hw - 0.09), rimR * 0.55, -rimR * 0.4);
  caliper.rotation.x = 0.6;
  root.add(caliper);
  return { root, spin };
}

/**
 * Aero wheel: a low-profile tyre on a big rim closed by a flat turbine cover:
 * a dark disc with curved vanes and a coloured accent ring, the brake glowing behind.
 */
function aeroWheel(mats, root, spin, holder, radius, hw, left) {
  const rimR = radius * 0.76;
  carcass(mats, holder, radius, hw, rimR, 0.97);
  holder.add(new Mesh(latheX([[rimR * 1.03, hw - 0.003], [rimR * 0.97, hw - 0.01], [rimR * 0.95, -hw + 0.01], [rimR * 1.03, -hw + 0.003]], 28), mats.rimLip));
  const cover = new Mesh(facet(new CylinderGeometry(rimR * 0.95, rimR * 0.95, 0.012, 28)), mats.rim);
  cover.rotation.z = Math.PI / 2;
  cover.position.x = hw - 0.02;
  holder.add(cover);
  // Curved turbine vanes raised on the cover.
  const vane = new BoxGeometry(0.008, rimR * 0.62, 0.03);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const m = new Mesh(vane, mats.rimLip);
    m.position.set(hw - 0.01, Math.cos(a) * rimR * 0.55, Math.sin(a) * rimR * 0.55);
    m.rotation.x = -a + 0.5;
    holder.add(m);
  }
  const ring = new Mesh(latheX([[rimR * 0.9, hw - 0.012], [rimR * 0.86, hw - 0.012]], 28), mats.caliper);
  holder.add(ring);
  const hub = new Mesh(facet(new CylinderGeometry(rimR * 0.18, rimR * 0.2, 0.03, 8)), mats.rimLip);
  hub.rotation.z = Math.PI / 2;
  hub.position.x = hw - 0.005;
  holder.add(hub);
  const caliper = new Mesh(new BoxGeometry(0.05, 0.13, 0.075), mats.caliper);
  caliper.position.set((left ? 1 : -1) * (hw - 0.085), rimR * 0.6, -rimR * 0.4);
  caliper.rotation.x = 0.6;
  root.add(caliper);
  return { root, spin };
}
