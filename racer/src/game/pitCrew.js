import { Group, Mesh, BoxGeometry, CylinderGeometry, MeshStandardMaterial, Color } from 'three';
import { buildPerson, setPose, animatePerson } from '../front/people.js';
import { SKIN, HAIR } from '../front/teams.js';

/*
 * A pit crew at work: when a car stops in its box during a race the team's crew is there round it,
 * as in F1: three at each wheel (the gun, off, on), the front and rear jack, two stabilisers at the
 * sidepods, and the release controller at the front by the light gantry. Crouched over the wheels while
 * the car is up, then standing back as it's dropped and released. A few crews are kept and reused (a
 * stop is a couple of seconds; rarely more than two at once).
 */
const LOOKS = [
  { skin: SKIN.light, hair: 'short', hairCol: HAIR.brown }, { skin: SKIN.tan, hair: 'buzz', hairCol: HAIR.black }, { skin: SKIN.fair, hair: 'quiff', hairCol: HAIR.blond },
  { skin: SKIN.brown, hair: 'bald', hairCol: HAIR.black }, { skin: SKIN.olive, hair: 'short', hairCol: HAIR.darkBrown, facial: 'stubble' }, { skin: SKIN.dark, hair: 'buzz', hairCol: HAIR.black },
];
// Places round the car (car frame: x along the car, forward +; y to the left), and how they stand.
const SPOTS = [];
for (const [wx, wy] of [[1.45, 0.95], [1.45, -0.95], [-1.3, 0.95], [-1.3, -0.95]]) {
  const side = Math.sign(wy);
  SPOTS.push({ x: wx, y: wy + side * 0.75, face: -side * Math.PI / 2, crouch: true, gun: true });   // the gun
  SPOTS.push({ x: wx + 0.6, y: wy + side * 0.95, face: -side * Math.PI / 2 - 0.5, crouch: true });  // tyre off
  SPOTS.push({ x: wx - 0.6, y: wy + side * 0.95, face: -side * Math.PI / 2 + 0.5, crouch: false }); // tyre on
}
SPOTS.push({ x: 3.0, y: 0, face: Math.PI, crouch: false, jack: true });   // front jack
SPOTS.push({ x: -2.75, y: 0, face: 0, crouch: false, jack: true });       // rear jack
SPOTS.push({ x: 0.2, y: 1.6, face: -Math.PI / 2, crouch: false });        // stabilisers
SPOTS.push({ x: 0.2, y: -1.6, face: Math.PI / 2, crouch: false });
SPOTS.push({ x: 4.2, y: 1.8, face: Math.PI + 0.6, crouch: false });       // release controller

export class PitCrews {
  constructor(scene) { this.scene = scene; this.crews = []; }

  /** A crew for a team (built once per team colours, then reused). */
  crew(team) {
    let c = this.crews.find((x) => x.team === team && !x.busy);
    if (c) return c;
    c = this.crews.find((x) => !x.busy && this.crews.length >= 4);
    if (c) { this.scene.remove(c.root); this.crews.splice(this.crews.indexOf(c), 1); }
    const root = new Group(), main = team.colours[0], light = new Color(main).getHSL({}).l > 0.85;
    const outfit = { kind: 'race', main: light ? team.colours[1] ?? '#222' : main, accent: light ? main : team.colours[1] ?? '#fff', patch: '#ffffff' };
    const people = SPOTS.map((sp, k) => {
      const p = buildPerson(LOOKS[k % LOOKS.length], outfit);
      p.position.set(sp.x, 0, sp.y);
      p.rotation.y = sp.face;
      root.add(p);
      // A helmet-ish dark cap for the wheel crew, the jacks and the gun.
      if (sp.gun) { const g = new Mesh(new CylinderGeometry(0.05, 0.05, 0.35, 8), GUN); g.rotation.z = Math.PI / 2; g.position.set(0.25, 0.6, 0); p.add(g); }
      if (sp.jack) { const j = new Mesh(new BoxGeometry(1.4, 0.08, 0.12), JACK); j.position.set(0.7, 0.35, 0); j.rotation.z = -0.35; p.add(j); }
      return { p, sp };
    });
    // The release light gantry (green when the car may go).
    const lamp = new Mesh(new BoxGeometry(0.2, 0.2, 0.2), new MeshStandardMaterial({ color: 0x222222, emissive: 0xff2020, emissiveIntensity: 1.6 }));
    lamp.position.set(4.6, 2.6, 0); root.add(lamp);
    const post = new Mesh(new BoxGeometry(0.08, 2.6, 0.08), JACK); post.position.set(4.6, 1.3, 0); root.add(post);
    c = { team, root, people, lamp, busy: false, t: 0, len: 0 };
    root.visible = false;
    this.scene.add(root);
    this.crews.push(c);
    return c;
  }

  /** A stop starts: the crew round the car at (x, y, z) heading h (radians, track frame), for len s. */
  start(team, x, y, z, h, len, scale = 1) {
    const c = this.crew(team);
    c.busy = true; c.t = 0; c.len = len;
    c.root.position.set(x, y, z);
    c.root.rotation.set(0, -h, 0);
    c.root.scale.setScalar(scale);
    c.root.visible = true;
    c.lamp.material.emissive.setHex(0xff2020);
    for (const { p, sp } of c.people) setPose(p, sp.crouch ? 'sit' : 'idle');
    return c;
  }
  update(dt) {
    for (const c of this.crews) {
      if (!c.busy) continue;
      c.t += dt;
      // The wheel crew crouched over the wheels; on release they stand back and the light goes green.
      const done = c.t > c.len - 0.25;
      if (done) c.lamp.material.emissive.setHex(0x20ff40);
      for (const { p, sp } of c.people) {
        if (done && sp.crouch) setPose(p, 'idle');
        animatePerson(p, dt);
      }
      if (c.t > c.len + 1.2) { c.busy = false; c.root.visible = false; }
    }
  }
  dispose() { for (const c of this.crews) this.scene.remove(c.root); this.crews = []; }
}
const GUN = new MeshStandardMaterial({ color: 0x2a2c30, metalness: 0.6, roughness: 0.4 });
const JACK = new MeshStandardMaterial({ color: 0x9a9ea6, metalness: 0.7, roughness: 0.35 });
