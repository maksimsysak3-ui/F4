import { Group, Mesh, IcosahedronGeometry, TorusGeometry, BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry } from 'three';
import { facet } from './meshBuilder.js';

/**
 * Chibi driver (oversized helmet, tiny body) and steering wheel, shared by all
 * cars. Positions are in the car's design space; the visual squashes only the
 * placement, so the helmet stays round.
 */
export function buildCockpit(mats, { seatX = 0.36, seatZ = -0.18, wheelZ = 0.2, wheelY = 0.7, seatY = 0 } = {}) {
  const group = new Group();

  const driver = new Group();
  driver.position.set(seatX, seatY, seatZ);
  const torso = new Mesh(facet(new BoxGeometry(0.3, 0.32, 0.2)), mats.suit);
  torso.position.set(0, 0.56, -0.08);
  torso.rotation.x = -0.25;
  const head = new Group();
  head.position.set(0, 0.92, -0.02);
  head.userData.baseY = 0.92;
  const helmet = new Mesh(facet(new IcosahedronGeometry(0.175, 2)), mats.helmet);
  const stripe = new Mesh(facet(new IcosahedronGeometry(0.178, 2)), mats.paint);
  stripe.scale.set(0.28, 1, 1);
  const visor = new Mesh(facet(new SphereGeometry(0.18, 10, 3, Math.PI / 2 - 0.95, 1.9, 1.2, 0.62)), mats.visor);
  head.add(helmet, stripe, visor);
  for (const m of [torso, helmet, stripe, visor]) m.castShadow = true;
  const armL = new Mesh(facet(new BoxGeometry(0.07, 0.07, 0.24)), mats.suit);
  armL.position.set(0.13, 0.64, 0.1);
  armL.rotation.x = 0.3;
  const armR = armL.clone();
  armR.position.x = -0.13;
  driver.add(torso, head, armL, armR);
  group.add(driver);

  const steering = new Group();
  steering.position.set(seatX, wheelY + seatY, wheelZ);
  steering.rotation.x = -0.35;
  const rimMesh = new Mesh(facet(new TorusGeometry(0.12, 0.018, 5, 12)), mats.alcantara);
  const spokeBar = new Mesh(new BoxGeometry(0.22, 0.03, 0.02), mats.interior);
  const marker = new Mesh(new BoxGeometry(0.02, 0.03, 0.03), mats.stitch);
  marker.position.y = 0.12;
  steering.add(rimMesh, spokeBar, marker);
  group.add(steering);

  return { group, head, steering };
}

/**
 * Exhaust tips with flame cones for pops & bangs. Each tip: { x, y, z, r, sides, rotate }.
 * Returns the meshes to add and the flame cones to animate.
 */
export function buildExhausts(mats, tips) {
  const group = new Group();
  const flames = [];
  for (const t of tips) {
    const pipe = new Mesh(facet(new CylinderGeometry(t.r, t.r, 0.16, t.sides, 1, true)), mats.titanium);
    pipe.rotation.x = Math.PI / 2;
    pipe.rotation.y = t.rotate || 0;
    pipe.position.set(t.x, t.y, t.z - 0.04);
    const inner = new Mesh(new CylinderGeometry(t.r * 0.85, t.r * 0.85, 0.01, t.sides), mats.grille);
    inner.rotation.x = Math.PI / 2;
    inner.rotation.y = t.rotate || 0;
    inner.position.set(t.x, t.y, t.z - 0.06);
    const flame = new Mesh(new ConeGeometry(t.r, 0.32, 7, 1, true), mats.flame);
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(t.x, t.y, t.z - 0.28);
    flame.visible = false;
    flames.push(flame);
    group.add(pipe, inner, flame);
  }
  return { group, flames };
}
