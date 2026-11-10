import { Group, Mesh, MeshStandardMaterial, SphereGeometry, CapsuleGeometry, CylinderGeometry, BoxGeometry, TorusGeometry, Color } from 'three';

/*
 * Simple low-poly people for the season mode (managers, team principals, drivers): a clean rounded
 * head with just eyes and hair, a rounded body in the outfit, rounded limbs. A look is
 *   { skin, hair: 'short'|'buzz'|'quiff'|'curly'|'long'|'braids'|'mullet'|'bald', hairCol, facial, glasses }
 * and an outfit { kind: 'suit'|'polo'|'race', main, accent }.
 */
const cache = new Map();
const mat = (hex, rough = 0.7) => {
  const key = `${hex}|${rough}`;
  if (!cache.has(key)) cache.set(key, new MeshStandardMaterial({ color: new Color(hex), roughness: rough, flatShading: true }));
  return cache.get(key);
};
function add(parent, geo, m, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  const o = new Mesh(geo, m);
  o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(rx, 0, rz);
  o.castShadow = true;
  parent.add(o);
  return o;
}

/** A person standing at the origin, facing +z, ~1.8 m tall. */
export function buildPerson(look, outfit = { kind: 'suit', main: '#1d2230', accent: '#ffffff' }) {
  const root = new Group();
  const skin = mat(look.skin), hair = mat(look.hairCol ?? '#2a1d14', 0.9), body = mat(outfit.main, 0.6);
  const legs = mat(outfit.kind === 'race' ? outfit.main : '#16181e', 0.7);
  // Legs, body, arms: rounded capsules.
  for (const s of [-1, 1]) add(root, new CapsuleGeometry(0.075, 0.72, 3, 8), legs, s * 0.1, 0.48, 0);
  const torso = add(root, new CapsuleGeometry(0.2, 0.42, 4, 10), body, 0, 1.18, 0, 1, 1, 0.72);
  if (outfit.kind === 'suit') add(root, new BoxGeometry(0.12, 0.3, 0.02), mat('#f2f2ee'), 0, 1.3, 0.15);                     // shirt
  if (outfit.kind === 'suit' && outfit.accent) add(root, new BoxGeometry(0.04, 0.24, 0.02), mat(outfit.accent), 0, 1.28, 0.162); // tie
  if (outfit.kind === 'race') { // the team's race suit: chest band, collar, belt, stripes down the legs, a sponsor patch, boots
    const acc = mat(outfit.accent ?? '#ffffff');
    add(root, new BoxGeometry(0.42, 0.06, 0.3), acc, 0, 1.3, 0);
    add(root, new CylinderGeometry(0.075, 0.09, 0.06, 10), acc, 0, 1.6, 0);
    add(root, new BoxGeometry(0.4, 0.05, 0.29), mat('#16161a'), 0, 0.98, 0);
    add(root, new BoxGeometry(0.12, 0.05, 0.01), mat(outfit.patch ?? '#ffffff'), 0.08, 1.18, 0.148);
    for (const s of [-1, 1]) {
      add(root, new BoxGeometry(0.02, 0.62, 0.05), acc, s * 0.172, 0.55, 0);
      add(root, new BoxGeometry(0.13, 0.08, 0.22), mat('#141416', 0.5), s * 0.1, 0.06, 0.03);
    }
  }
  if (outfit.kind === 'polo') add(root, new BoxGeometry(0.18, 0.04, 0.02), mat(outfit.accent ?? '#ffffff'), 0, 1.45, 0.13);  // collar
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new Group();
    arm.position.set(s * 0.27, 1.42, 0);
    arm.rotation.z = s * 0.08;
    add(arm, new CapsuleGeometry(0.06, 0.48, 3, 8), outfit.kind === 'polo' ? skin : body, 0, -0.3, 0);
    add(arm, new SphereGeometry(0.06, 8, 6), outfit.kind === 'race' ? mat(outfit.accent ?? '#16161a') : skin, 0, -0.62, 0); // gloves on a driver
    root.add(arm);
    arms.push(arm);
  }
  // Head: a smooth rounded head, two eyes, the hair.
  const head = new Group();
  head.position.y = 1.7;
  root.add(head);
  add(head, new SphereGeometry(0.15, 12, 10), skin, 0, 0, 0, 0.95, 1.08, 1);
  for (const s of [-1, 1]) add(head, new SphereGeometry(0.018, 6, 5), mat('#141210', 0.3), s * 0.05, 0.02, 0.138);
  const cap = (sy = 1) => add(head, new SphereGeometry(0.158, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, 0, 0.02, -0.005, 0.98, sy, 1.02);
  switch (look.hair) {
    case 'buzz': cap(0.8); break;
    case 'short': cap(); break;
    case 'quiff': cap(); add(head, new SphereGeometry(0.09, 8, 6), hair, 0, 0.13, 0.06, 1.3, 0.7, 1); break;
    case 'curly': cap(1.15); add(head, new SphereGeometry(0.15, 8, 6), hair, 0, 0.08, -0.02, 1.08, 0.8, 1.08); break;
    case 'long': cap(); add(head, new CapsuleGeometry(0.12, 0.16, 3, 8), hair, 0, -0.08, -0.08, 1.15, 1, 0.6); break;
    case 'braids': cap(1.05); add(head, new CapsuleGeometry(0.13, 0.2, 3, 8), hair, 0, -0.1, -0.09, 1.1, 1, 0.55); break;
    case 'mullet': cap(); add(head, new CapsuleGeometry(0.1, 0.1, 3, 8), hair, 0, -0.1, -0.1, 1.2, 1, 0.6); break;
    default: break; // bald
  }
  if (look.facial === 'beard' || look.facial === 'goatee') add(head, new SphereGeometry(0.15, 12, 6, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4), hair, 0, -0.005, 0.006, 0.97, 1.1, 1.02);
  if (look.facial === 'stubble') add(head, new SphereGeometry(0.15, 12, 6, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), mat('#' + new Color(look.skin).lerp(new Color(look.hairCol ?? '#222'), 0.2).getHexString()), 0, -0.003, 0.004, 0.965, 1.09, 1.015);
  if (look.facial === 'moustache') add(head, new BoxGeometry(0.08, 0.02, 0.02), hair, 0, -0.05, 0.14);
  if (look.glasses) {
    const frame = mat('#141416', 0.3);
    for (const s of [-1, 1]) add(head, new TorusGeometry(0.03, 0.006, 4, 10), frame, s * 0.05, 0.02, 0.15);
    add(head, new BoxGeometry(0.04, 0.008, 0.008), frame, 0, 0.025, 0.152);
  }
  root.userData = { head, arms, torso, t: Math.random() * 10 };
  return root;
}

/**
 * Poses: 'idle' (arms at the sides) or 'clasp' (hands held together low in front, the waiting pose of
 * drivers on the grid).
 */
export function setPose(person, pose) {
  const { arms } = person.userData;
  arms.forEach((arm, k) => {
    const s = k === 0 ? -1 : 1;
    if (pose === 'clasp') arm.rotation.set(-0.36, 0, -s * 0.44);
    else arm.rotation.set(0, 0, s * 0.08);
  });
}

/** Idle: breathing and a slow look around. */
export function animatePerson(person, dt) {
  const u = person.userData;
  u.t += dt;
  u.torso.scale.y = 1 + Math.sin(u.t * 1.6) * 0.012;
  u.head.rotation.y = Math.sin(u.t * 0.45) * 0.2;
}
