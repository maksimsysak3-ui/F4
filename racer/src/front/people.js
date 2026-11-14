import { Group, Mesh, MeshStandardMaterial, BoxGeometry, Color, Vector3, Quaternion } from 'three';

/*
 * Blocky people for the front end (managers, team principals, drivers): ~1.8 m tall, standing at the
 * origin facing +z, built from boxes like a toy figure: a box head with a jaw block, two-tone eyes,
 * brows, nose and mouth, slabs of hair; a chest, abdomen and hips; box limbs with hands and shoes. The
 * arms are jointed (shoulder, elbow) and posed by two-bone IK.
 *
 *   look   { skin, hair: 'short'|'buzz'|'quiff'|'curly'|'long'|'braids'|'mullet'|'bald', hairCol,
 *            facial: 'none'|'stubble'|'beard'|'goatee'|'moustache', glasses }
 *   outfit { kind: 'suit'|'polo'|'race', main, accent, patch }
 */
const cache = new Map();
const mat = (hex, rough = 0.7, metal = 0) => {
  const key = `${hex}|${rough}|${metal}`;
  if (!cache.has(key)) cache.set(key, new MeshStandardMaterial({ color: new Color(hex), roughness: rough, metalness: metal }));
  return cache.get(key);
};
const shade = (hex, k) => '#' + new Color(hex).multiplyScalar(k).getHexString();
const mix = (a, b, t) => '#' + new Color(a).lerp(new Color(b), t).getHexString();
const boxes = new Map();
const boxGeo = (w, h, d) => { const k = `${w}|${h}|${d}`; if (!boxes.has(k)) boxes.set(k, new BoxGeometry(w, h, d)); return boxes.get(k); };

/** A box of size w x h x d centred at (x, y, z) in `parent`, optionally rotated. */
function box(parent, m, w, h, d, x = 0, y = 0, z = 0, r = null) {
  const o = new Mesh(boxGeo(w, h, d), m);
  o.position.set(x, y, z);
  if (r) o.rotation.set(...r);
  o.castShadow = true;
  parent.add(o);
  return o;
}

// ------------------------------------------------------------------------------------------- head
const HEAD_Y = 1.665, FACE = 0.11; // head centre; the face's front plane
function buildHead(look) {
  const head = new Group();
  head.position.y = HEAD_Y;
  const skin = mat(look.skin, 0.6), hairCol = look.hairCol ?? '#2a1d14', hair = mat(hairCol, 0.85);
  const skinDark = mat(shade(look.skin, 0.86), 0.65);
  // Skull and jaw.
  box(head, skin, 0.2, 0.17, 0.22, 0, 0.03, 0);
  box(head, skin, 0.18, 0.08, 0.2, 0, -0.08, 0.005);
  box(head, skin, 0.02, 0.05, 0.04, -0.106, 0.0, -0.005);  // ears
  box(head, skin, 0.02, 0.05, 0.04, 0.106, 0.0, -0.005);
  // Eyes (white, then the pupil looking ahead), brows, nose, mouth.
  for (const s of [-1, 1]) {
    box(head, mat('#f6f4f0', 0.4), 0.044, 0.026, 0.008, s * 0.046, 0.012, FACE + 0.002);
    box(head, mat('#2a1d14', 0.3), 0.02, 0.024, 0.008, s * 0.041, 0.011, FACE + 0.006);
    box(head, mat(look.hair === 'bald' ? shade(look.skin, 0.55) : hairCol, 0.85), 0.054, 0.013, 0.012, s * 0.046, 0.046, FACE + 0.004, [0, 0, -s * 0.08]);
  }
  box(head, skinDark, 0.03, 0.05, 0.03, 0, -0.018, FACE + 0.012);
  box(head, mat(mix(look.skin, '#7a2a2a', 0.5), 0.6), 0.06, 0.012, 0.01, 0, -0.072, FACE - 0.004);

  // Hair: slabs over the top, the back and the sides, a fringe at the front.
  const H = (w, h, d, x, y, z, r) => box(head, hair, w, h, d, x, y, z, r);
  const cap = (top = 0.05) => {
    H(0.212, top, 0.232, 0, 0.115 + top / 2 - 0.01, -0.002);
    H(0.212, 0.15, 0.03, 0, 0.055, -0.116);
    H(0.014, 0.085, 0.17, -0.106, 0.075, -0.025); H(0.014, 0.085, 0.17, 0.106, 0.075, -0.025);
    H(0.212, 0.03, 0.02, 0, 0.11, FACE + 0.002);
  };
  switch (look.hair) {
    case 'buzz': box(head, mat(mix(hairCol, look.skin, 0.25), 0.9), 0.208, 0.022, 0.228, 0, 0.123, 0); box(head, mat(mix(hairCol, look.skin, 0.25), 0.9), 0.208, 0.11, 0.02, 0, 0.07, -0.113); break;
    case 'short': cap(); break;
    case 'quiff': cap(); H(0.17, 0.06, 0.09, 0, 0.165, 0.065, [-0.35, 0, 0]); break;
    case 'curly': cap(0.08); for (const [x, z] of [[-0.07, 0.06], [0.06, 0.07], [0, -0.04], [-0.06, -0.08], [0.07, -0.07]]) H(0.07, 0.05, 0.07, x, 0.175, z); break;
    case 'long': cap(); H(0.212, 0.3, 0.05, 0, -0.04, -0.125); H(0.03, 0.2, 0.12, -0.112, -0.01, -0.06); H(0.03, 0.2, 0.12, 0.112, -0.01, -0.06); break;
    case 'braids': cap(0.055); for (let k = -3; k <= 3; k++) H(0.022, 0.24, 0.022, k * 0.028, -0.06, -0.13 + Math.abs(k) * 0.004); break;
    case 'mullet': cap(); H(0.19, 0.16, 0.04, 0, -0.06, -0.12); break;
    default: // bald: a band of short hair round the back and sides
      box(head, mat(mix(hairCol, look.skin, 0.35), 0.9), 0.214, 0.07, 0.02, 0, 0.02, -0.114);
      for (const s of [-1, 1]) box(head, mat(mix(hairCol, look.skin, 0.35), 0.9), 0.014, 0.06, 0.12, s * 0.107, 0.03, -0.05);
  }
  // Facial hair over the jaw.
  if (look.facial === 'beard') { H(0.188, 0.095, 0.21, 0, -0.085, 0.006); H(0.016, 0.07, 0.1, -0.103, -0.03, 0.01); H(0.016, 0.07, 0.1, 0.103, -0.03, 0.01); box(head, mat(mix(look.skin, '#7a2a2a', 0.5), 0.6), 0.05, 0.012, 0.01, 0, -0.07, FACE + 0.007); }
  if (look.facial === 'stubble') box(head, mat(mix(look.skin, hairCol, 0.28), 0.95), 0.184, 0.085, 0.204, 0, -0.084, 0.006);
  if (look.facial === 'goatee') H(0.06, 0.05, 0.02, 0, -0.1, FACE + 0.002);
  if (look.facial === 'moustache' || look.facial === 'beard') H(0.07, 0.016, 0.016, 0, -0.054, FACE + 0.006);
  if (look.facial === 'stubble') box(head, mat(mix(look.skin, '#7a2a2a', 0.5), 0.6), 0.06, 0.012, 0.01, 0, -0.072, FACE + 0.004);
  if (look.glasses) {
    const frame = mat('#121214', 0.3, 0.3), lens = mat('#9fb4c4', 0.1, 0.5);
    for (const s of [-1, 1]) { box(head, frame, 0.058, 0.04, 0.006, s * 0.046, 0.013, FACE + 0.011); box(head, lens, 0.046, 0.028, 0.006, s * 0.046, 0.013, FACE + 0.013); box(head, frame, 0.006, 0.008, 0.1, s * 0.106, 0.02, FACE - 0.05); }
    box(head, frame, 0.02, 0.008, 0.006, 0, 0.02, FACE + 0.011);
  }
  return head;
}

// ------------------------------------------------------------------------------------------- body
const SHOULDER = { x: 0.245, y: 1.43 }, UPPER = 0.29, FORE = 0.26;

/** Arm: shoulder (a group at the joint) -> upper arm -> elbow (group) -> forearm -> hand. */
function buildArm(side, sleeve, fore, hand, cuff = null) {
  const shoulder = new Group();
  shoulder.position.set(side * SHOULDER.x, SHOULDER.y, 0);
  box(shoulder, sleeve, 0.115, 0.11, 0.12, 0, -0.03, 0);
  box(shoulder, sleeve, 0.095, UPPER, 0.1, 0, -UPPER / 2, 0);
  const elbow = new Group();
  elbow.position.y = -UPPER;
  shoulder.add(elbow);
  box(elbow, fore, 0.087, FORE, 0.092, 0, -FORE / 2, 0);
  if (cuff) box(elbow, cuff, 0.092, 0.03, 0.096, 0, -FORE + 0.02, 0);
  box(elbow, hand, 0.07, 0.09, 0.045, 0, -FORE - 0.045, 0.004);
  box(elbow, hand, 0.022, 0.045, 0.026, -side * 0.04, -FORE - 0.03, 0.012);
  return { shoulder, elbow };
}

/** Leg: hip (a group at the joint) -> thigh -> knee (group) -> shin -> shoe. */
function buildLeg(side, trouser, shoe, stripe = null) {
  const hip = new Group();
  hip.position.set(side * 0.09, 0.91, 0);
  box(hip, trouser, 0.135, 0.45, 0.15, 0, -0.225, 0);
  if (stripe) box(hip, stripe, 0.012, 0.42, 0.05, side * 0.07, -0.22, 0);
  const knee = new Group();
  knee.position.y = -0.45;
  hip.add(knee);
  box(knee, trouser, 0.118, 0.4, 0.13, 0, -0.2, 0);
  if (stripe) box(knee, stripe, 0.012, 0.38, 0.05, side * 0.062, -0.2, 0);
  box(knee, shoe, 0.125, 0.085, 0.27, 0, -0.415, 0.05);
  box(knee, mat('#0b0b0c', 0.9), 0.127, 0.02, 0.272, 0, -0.448, 0.05);
  return { hip, knee };
}

/** A person standing at the origin, facing +z, ~1.8 m tall. */
export function buildPerson(look, outfit = { kind: 'suit', main: '#1d2230', accent: '#ffffff' }) {
  const root = new Group();
  const body = new Group();
  root.add(body);
  const kind = outfit.kind;
  const skin = mat(look.skin, 0.6), main = mat(outfit.main, kind === 'race' ? 0.5 : 0.65), acc = mat(outfit.accent ?? '#ffffff', 0.55);
  const trouser = kind === 'race' ? main : mat(kind === 'polo' ? '#1a1e2a' : shade(outfit.main, 0.85), 0.75);
  const shoe = mat('#121214', 0.45, 0.1), white = mat('#f2f2ee', 0.6), black = mat('#141416', 0.5);

  // Torso: chest, abdomen, hips; the neck.
  const torso = new Group();
  body.add(torso);
  box(torso, main, 0.4, 0.3, 0.22, 0, 1.33, 0);
  box(torso, main, 0.34, 0.2, 0.2, 0, 1.09, 0);
  box(torso, kind === 'suit' ? main : trouser, 0.35, 0.13, 0.205, 0, 0.94, 0);
  box(body, skin, 0.09, 0.08, 0.09, 0, 1.52, 0);
  const F = 0.111; // front of the chest
  if (kind === 'suit') {
    box(torso, white, 0.11, 0.28, 0.01, 0, 1.33, F);
    box(torso, acc, 0.036, 0.24, 0.012, 0, 1.31, F + 0.004);
    box(torso, acc, 0.044, 0.03, 0.016, 0, 1.44, F + 0.006);
    for (const s of [-1, 1]) box(torso, mat(shade(outfit.main, 0.7), 0.6), 0.05, 0.28, 0.012, s * 0.07, 1.33, F + 0.006, [0, 0, s * 0.3]);
    box(body, white, 0.11, 0.035, 0.11, 0, 1.49, 0);
    for (const y of [1.14, 1.06]) box(torso, mat(shade(outfit.main, 0.6), 0.5), 0.016, 0.016, 0.01, 0, y, 0.101);
  } else if (kind === 'polo') {
    for (const s of [-1, 1]) box(torso, acc, 0.06, 0.035, 0.014, s * 0.035, 1.485, F - 0.01, [-0.3, 0, s * 0.45]);
    box(torso, mat(shade(outfit.main, 0.8), 0.6), 0.03, 0.12, 0.01, 0, 1.41, F);
    box(torso, mat(outfit.patch ?? '#ffffff', 0.6), 0.06, 0.045, 0.01, -0.1, 1.36, F);
    box(torso, black, 0.352, 0.035, 0.207, 0, 0.995, 0);
  } else if (kind === 'race') {
    box(torso, acc, 0.404, 0.06, 0.224, 0, 1.3, 0);
    box(body, acc, 0.11, 0.05, 0.11, 0, 1.51, 0);
    box(torso, black, 0.352, 0.04, 0.207, 0, 1.005, 0);
    box(torso, mat(outfit.patch ?? '#ffffff', 0.6), 0.1, 0.045, 0.01, 0.085, 1.2, 0.101);
    box(torso, white, 0.08, 0.035, 0.01, -0.085, 1.2, 0.101);
    for (const s of [-1, 1]) box(torso, acc, 0.012, 0.36, 0.05, s * 0.17, 1.14, 0);
  }

  // Arms: jacket sleeves with shirt cuffs; short polo sleeves; race-suit sleeves and gloves.
  const fore = kind === 'polo' ? skin : main, hand = kind === 'race' ? acc : skin;
  const arms = [-1, 1].map((s) => {
    const a = buildArm(s, main, fore, hand, kind === 'suit' ? white : null);
    body.add(a.shoulder);
    return a;
  });
  const legs = [-1, 1].map((s) => { const l = buildLeg(s, trouser, shoe, kind === 'race' ? acc : null); body.add(l.hip); return l; });
  const head = buildHead(look);
  body.add(head);
  root.userData = { head, arms, legs, torso, body, t: Math.random() * 10 };
  setPose(root, 'idle');
  return root;
}

// ------------------------------------------------------------------------------------------ poses
const DOWN = new Vector3(0, -1, 0), _q = new Quaternion();
/** Points an arm's two bones so the hand reaches `target` (body space), the elbow bending towards `pole`. */
function reach(arm, target, pole) {
  const S = arm.shoulder.position, a = UPPER, b = FORE + 0.045;
  const toT = target.clone().sub(S), dist = Math.min(a + b - 0.005, toT.length());
  toT.normalize();
  const along = (a * a - b * b + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, a * a - along * along));
  const side = pole.clone().sub(toT.clone().multiplyScalar(pole.dot(toT))).normalize();
  const E = S.clone().addScaledVector(toT, along).addScaledVector(side, h);
  arm.shoulder.quaternion.setFromUnitVectors(DOWN, E.clone().sub(S).normalize());
  const hand = S.clone().addScaledVector(toT, dist);
  arm.elbow.quaternion.setFromUnitVectors(DOWN, hand.sub(E).normalize().applyQuaternion(_q.copy(arm.shoulder.quaternion).invert()));
}

/** How far the body drops to sit on a seat 0.5 m high (the hips at the seat, the thighs level). */
export const SEAT_DROP = -0.335;
/**
 * Poses: 'idle' (arms relaxed at the sides), 'clasp' (hands together low in front, as drivers stand on
 * the grid) or 'sit' (on a 0.5 m seat, thighs level, hands forward on a desk at 0.75 m, 0.42 m ahead).
 */
export function setPose(person, pose) {
  const u = person.userData, sit = pose === 'sit', crouch = pose === 'crouch';
  u.pose = pose;
  u.body.position.y = sit ? SEAT_DROP : crouch ? -0.38 : 0;
  if (crouch) { u.legs.forEach(({ hip, knee }) => { hip.rotation.x = -1.1; knee.rotation.x = 1.9; }); u.arms.forEach((arm, k) => { const s = k === 0 ? -1 : 1; reach(arm, new Vector3(s * 0.2, 0.95, 0.5), new Vector3(s * 0.7, 0, -0.4)); }); return; }
  u.legs.forEach(({ hip, knee }) => { hip.rotation.x = sit ? -Math.PI / 2 : 0; knee.rotation.x = sit ? Math.PI / 2 : 0; });
  u.arms.forEach((arm, k) => {
    const s = k === 0 ? -1 : 1;
    if (pose === 'clasp') reach(arm, new Vector3(s * 0.03, 0.88, 0.2), new Vector3(s * 0.8, 0, -0.6));
    else if (pose === 'cheer') reach(arm, new Vector3(s * 0.32, 2.12, 0.08), new Vector3(s * 1, 0, 0.3));          // both arms up
    else if (pose === 'trophy') reach(arm, s > 0 ? new Vector3(0.22, 2.15, 0.12) : new Vector3(-0.3, 0.9, 0.06), s > 0 ? new Vector3(1, 0, 0.3) : new Vector3(-0.2, 0, -1)); // the right hand raised high
    else if (pose === 'spray') reach(arm, new Vector3(s * 0.05, 1.62, 0.42), new Vector3(s * 0.9, -0.3, 0));       // both hands on the bottle, out in front
    else if (pose === 'crouch') reach(arm, new Vector3(s * 0.2, 0.55, 0.45), new Vector3(s * 0.7, 0, -0.4));
    else if (sit) reach(arm, new Vector3(s * 0.15, 0.75 + 0.03 - SEAT_DROP, 0.42), new Vector3(s * 0.7, -0.7, -0.2));
    else reach(arm, new Vector3(s * 0.3, 0.86, 0.04), new Vector3(s * 0.2, 0, -1));
  });
}

/** A point in a person's hand (k: 0 or 1) to hold things (a trophy, a bottle). */
export function handAnchor(person, k) {
  const g = new Group();
  g.position.y = -(FORE + 0.07);
  person.userData.arms[k].elbow.add(g);
  return g;
}

// ---------------------------------------------------------------------------------------- actions
/*
 * Actions: moves played over time on top of the rig, blended smoothly from whatever the person was
 * doing (the hands' targets, the hips and knees, the body's height and lean all ease toward the move's
 * frame), so nothing snaps. setAction(person, name, { side, phase, speed }); null back to the pose.
 *   cheer      both arms up, bouncing           jump       crouch, leap with the arms up, land
 *   fistpump   one fist pumping, a bounce       wave       one arm up waving
 *   clap       hands clapping in front          point      an arm pointing out ahead
 *   lift       a trophy raised high, swaying    shake      a bottle shaken in front of the chest
 *   spray      both hands on a bottle, sweeping drink      the bottle to the mouth
 *   mic        a microphone held out (a reporter) camera   a TV camera on the shoulder
 *   photo      a camera up to the face          walk       walking on the spot (move the root)
 *   gun        crouched at a wheel, gun on the nut, working   carry   crouched holding a wheel
 *   jack       leaning back on a jack's handle  ready      crouched, waiting for the car
 *   wave2      both arms waving to a crowd      hug        arms out round someone in front
 */
const ACT = {
  cheer: (t, k, s) => ({ h: [s * 0.32 + Math.sin(t * 4 + k) * 0.05, 2.08 + Math.sin(t * 7 + k * 2) * 0.06, 0.1], y: Math.max(0, Math.sin(t * 7)) * 0.06, knee: Math.max(0, Math.sin(t * 7)) * 0.25 }),
  jump: (t, k, s) => {
    const p = (t % 0.8) / 0.8, air = p > 0.3 && p < 0.85 ? Math.sin(((p - 0.3) / 0.55) * Math.PI) : 0, crouch = p < 0.3 ? Math.sin((p / 0.3) * Math.PI) : 0;
    return { h: air > 0 ? [s * 0.34, 2.1, 0.12] : [s * 0.3, 1.0 + crouch * 0.1, -0.1], y: air * 0.5 - crouch * 0.18, knee: crouch * 1.1 + air * 0.2, hip: -crouch * 0.6 };
  },
  fistpump: (t, k, s) => (k === 1 ? { h: [0.28, 1.75 + Math.max(0, Math.sin(t * 8)) * 0.35, 0.18] } : { h: [-0.18, 1.22, 0.28] }),
  wave: (t, k, s) => (k === 1 ? { h: [0.42 + Math.sin(t * 7) * 0.12, 1.95, 0.12] } : null),
  wave2: (t, k, s) => ({ h: [s * (0.45 + Math.sin(t * 6 + k * 3) * 0.12), 1.95, 0.15] }),
  clap: (t, k, s) => ({ h: [s * (0.03 + 0.11 * Math.abs(Math.sin(t * 6))), 1.3, 0.32] }),
  point: (t, k, s) => (k === 1 ? { h: [0.22, 1.72, 0.6] } : { h: [-0.22, 0.98, 0.1] }),
  lift: (t, k, s) => (k === 1 ? { h: [0.2, 2.08 + Math.sin(t * 2.2) * 0.08, 0.14 + Math.sin(t * 1.3) * 0.06] } : { h: [-0.3, 1.0, 0.1] }),
  shake: (t, k, s) => ({ h: [s * 0.05, 1.28 + Math.sin(t * 24) * 0.07, 0.34] }),
  spray: (t, k, s, o) => ({ h: [s * 0.05 + Math.sin(t * 1.6 + (o.phase ?? 0)) * 0.22, 1.58 + Math.sin(t * 2.3) * 0.08, 0.46] }),
  drink: (t, k, s) => (k === 1 ? { h: [0.04, 1.6, 0.17] } : { h: [-0.28, 0.98, 0.06] }),
  mic: (t, k, s) => (k === 1 ? { h: [0.08, 1.48 + Math.sin(t * 1.3) * 0.02, 0.58] } : null),
  camera: (t, k, s) => (k === 1 ? { h: [0.2, 1.7, 0.1] } : { h: [-0.02, 1.6, 0.32] }),
  photo: (t, k, s) => ({ h: [s * 0.09, 1.64, 0.22] }),
  walk: (t, k, s) => ({ h: [s * 0.3, 0.88, Math.sin(t * 7 + (k ? 0 : Math.PI)) * 0.22], hips: [Math.sin(t * 7) * 0.45, -Math.sin(t * 7) * 0.45], knees: [Math.max(0, -Math.sin(t * 7 - 0.6)) * 0.8, Math.max(0, Math.sin(t * 7 - 0.6)) * 0.8], y: -Math.abs(Math.sin(t * 7)) * 0.03 }),
  gun: (t, k, s, o) => ({ h: [s * 0.06 + (o.work ? Math.sin(t * 40) * 0.01 : 0), 0.62, 0.58 + (o.work ? Math.sin(t * 31) * 0.015 : 0)], crouch: true }),
  ready: (t, k, s) => ({ h: [s * 0.18, 0.75, 0.42], crouch: true }),
  carry: (t, k, s) => ({ h: [s * 0.27, 0.68, 0.42], crouch: 0.6 }),
  jack: (t, k, s) => ({ h: [s * 0.1, 0.9, 0.5], lean: -0.18, knee: 0.35, hip: -0.25 }),
  hug: (t, k, s) => ({ h: [s * 0.22, 1.4, 0.45] }),
};
const POSE_H = {
  idle: (s) => [s * 0.3, 0.86, 0.04], clasp: (s) => [s * 0.03, 0.88, 0.2], cheer: (s) => [s * 0.32, 2.12, 0.08],
  spray: (s) => [s * 0.05, 1.62, 0.42], trophy: (s) => (s > 0 ? [0.22, 2.15, 0.12] : [-0.3, 0.9, 0.06]),
};
/** Start a move (null: back to the pose). o: { side, phase, speed, work }. */
export function setAction(person, name, o = {}) {
  const u = person.userData;
  if (!u.cur) {
    const ph = POSE_H[u.pose] ?? POSE_H.idle, crouch = u.pose === 'crouch';
    u.cur = { h: [new Vector3(...ph(-1)), new Vector3(...ph(1))], hips: [crouch ? -1.1 : 0, crouch ? -1.1 : 0], knees: [crouch ? 1.9 : 0, crouch ? 1.9 : 0], y: u.body.position.y, lean: 0 };
  }
  u.act = name; u.actO = o; u.actT = o.phase ?? 0;
}
const _tv = new Vector3(), POLE = [new Vector3(-0.8, -0.2, -0.6), new Vector3(0.8, -0.2, -0.6)];
function playAction(u, dt) {
  const f = ACT[u.act], o = u.actO, t = (u.actT += dt * (o.speed ?? 1)), c = u.cur, k = 1 - Math.exp(-dt * (o.snap ?? 11));
  let y = 0, lean = 0, crouchAmt = 0, hipX = 0, kneeX = 0, hips = null, knees = null;
  for (let a = 0; a < 2; a++) {
    const s = a === 0 ? -1 : 1, fr = f ? f(t, a, s, o) : null, h = fr?.h ?? (POSE_H[u.pose] ?? POSE_H.idle)(s);
    _tv.set(h[0], h[1], h[2]);
    c.h[a].lerp(_tv, k);
    if (fr && a === 1) { y = fr.y ?? 0; lean = fr.lean ?? 0; crouchAmt = fr.crouch === true ? 1 : fr.crouch ?? 0; hipX = fr.hip ?? 0; kneeX = fr.knee ?? 0; hips = fr.hips; knees = fr.knees; }
    else if (fr && a === 0 && !f(t, 1, 1, o)) { y = fr.y ?? 0; }
  }
  // Legs: a crouch (hips -1.1, knees 1.9, the body down 0.38), a bend, or a walk's swing.
  for (let a = 0; a < 2; a++) {
    const th = hips ? hips[a] : -1.1 * crouchAmt + hipX, tk = knees ? knees[a] : 1.9 * crouchAmt + kneeX;
    c.hips[a] += (th - c.hips[a]) * k; c.knees[a] += (tk - c.knees[a]) * k;
    u.legs[a].hip.rotation.x = c.hips[a]; u.legs[a].knee.rotation.x = c.knees[a];
  }
  const ty = -0.38 * crouchAmt + y - (kneeX > 0 && !crouchAmt ? kneeX * 0.06 : 0);
  c.y += (ty - c.y) * (y > 0.05 ? 1 - Math.exp(-dt * 30) : k); c.lean += (lean - c.lean) * k;
  u.body.position.y = c.y; u.body.rotation.x = c.lean;
  for (let a = 0; a < 2; a++) reach(u.arms[a], c.h[a], POLE[a]);
}

/** Idle: breathing, a slow look around, the weight shifting a little (and any move being played). */
export function animatePerson(person, dt) {
  const u = person.userData;
  u.t += dt;
  if (u.act !== undefined && u.cur) playAction(u, dt);
  u.torso.scale.z = 1 + Math.sin(u.t * 1.6) * 0.015;
  u.head.rotation.y = Math.sin(u.t * 0.45) * 0.22;
  u.head.rotation.x = Math.sin(u.t * 0.31) * 0.04;
  u.body.rotation.z = Math.sin(u.t * 0.27) * 0.01;
}

