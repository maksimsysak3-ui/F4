import { Group, Mesh, BoxGeometry, CylinderGeometry, MeshStandardMaterial, Color } from 'three';
import { buildPerson, setPose, setAction, animatePerson } from '../front/people.js';
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
  SPOTS.push({ x: wx, y: wy + side * 0.75, face: -side * Math.PI / 2, crouch: true, gun: true, role: 'gun', wx, wy, side });   // the gun
  SPOTS.push({ x: wx + 0.6, y: wy + side * 0.95, face: -side * Math.PI / 2 - 0.5, crouch: true, role: 'off', wx, wy, side });  // tyre off
  SPOTS.push({ x: wx - 0.6, y: wy + side * 1.6, face: -side * Math.PI / 2 + 0.5, crouch: false, role: 'on', wx, wy, side }); // tyre on
}
SPOTS.push({ x: 3.0, y: 0, face: Math.PI, crouch: false, jack: true, role: 'jack' });   // front jack
SPOTS.push({ x: -2.75, y: 0, face: 0, crouch: false, jack: true, role: 'jack' });       // rear jack
SPOTS.push({ x: 0.2, y: 1.6, face: -Math.PI / 2, crouch: false });        // stabilisers
SPOTS.push({ x: 0.2, y: -1.6, face: Math.PI / 2, crouch: false });
SPOTS.push({ x: 4.2, y: 1.8, face: Math.PI + 0.6, crouch: false, role: 'release' });       // release controller

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const READY = { gun: 'ready', off: 'ready', on: 'carry', jack: null, release: 'point' };
/** Set a move only when it changes (the options updated in place). */
function setActionOnce(p, name, o = {}) { const u = p.userData; if (u.act !== name || !u.cur) setAction(p, name, o); else Object.assign(u.actO, o); }
const TYRE_G = new CylinderGeometry(0.33, 0.33, 0.3, 16), TYRE_M = new MeshStandardMaterial({ color: 0x141416, roughness: 0.85 });
const RIM_G = new CylinderGeometry(0.2, 0.2, 0.31, 12), RIM_M = new MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.4, metalness: 0.6 });

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
      // The wheel crews' tyres: the old one pulled off, the new one carried in (body space, in front of them).
      let tyre = null;
      if (sp.role === 'off' || sp.role === 'on') {
        tyre = new Mesh(TYRE_G, TYRE_M); tyre.rotation.z = Math.PI / 2; tyre.position.set(0, 0.62, 0.42); tyre.visible = false; p.add(tyre);
        const rim = new Mesh(RIM_G, RIM_M); rim.position.y = 0.001; tyre.add(rim);
      }
      return { p, sp, tyre };
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
    c.busy = true; c.t = 0; c.len = len; c.waiting = false;
    c.root.position.set(x, y, z);
    c.root.rotation.set(0, -h, 0);
    c.root.scale.setScalar(scale);
    c.root.visible = true;
    c.lamp.material.emissive.setHex(0xff2020);
    for (const e of c.people) { e.p.position.set(e.sp.x, 0, e.sp.y); setPose(e.p, 'idle'); setAction(e.p, READY[e.sp.role] ?? null); if (e.tyre) e.tyre.visible = e.sp.role === 'on'; }
    return c;
  }
  /** A crew standing ready in its box, red light on, waiting for the car (go() starts the stop). */
  hold(team, x, y, z, h, scale = 1) { const c = this.start(team, x, y, z, h, Infinity, scale); c.waiting = true; return c; }
  /** The car is in: the waiting crew gets to work for len seconds. */
  go(c, len) { c.waiting = false; c.t = 0; c.len = len; }
  /** Stand a waiting crew down (the car didn't stop). */
  release(c) { if (c?.waiting) { c.busy = false; c.waiting = false; c.root.visible = false; } }
  update(dt) {
    for (const c of this.crews) {
      if (!c.busy) continue;
      c.t += dt;
      if (c.waiting) { for (const e of c.people) animatePerson(e.p, dt); continue; }
      // The stop, as a share of its length: jacks up and guns on at once; the old tyres off by ~35%,
      // the new ones on by ~60%, the guns again to ~85%; then down, the light green, everyone back.
      const u = c.t / Math.max(0.5, c.len), done = c.t > c.len - 0.25;
      if (done) c.lamp.material.emissive.setHex(0x20ff40);
      for (const e of c.people) {
        const { p, sp, tyre } = e, side = sp.side ?? 0, back = done ? Math.min(1, (c.t - c.len + 0.25) / 0.5) : 0;
        const home = (dx = 0, dy = 0) => p.position.set(sp.x + dx, 0, sp.y + dy);
        if (sp.role === 'gun') { setActionOnce(p, done ? null : 'gun', { work: u > 0.05 && u < 0.3 || u > 0.6 && u < 0.85 }); home(0, side * (0.45 * back)); }
        else if (sp.role === 'off') {
          // In beside the wheel, then away with the old tyre, outward and back.
          const pull = smooth((u - 0.12) / 0.25), inn = smooth(u / 0.12) * (1 - pull);
          home((sp.wx - sp.x) * 0.6 * inn + 0.5 * pull, side * (-0.35 * inn + 0.9 * pull));
          setActionOnce(p, 'carry'); if (tyre) tyre.visible = u > 0.12 && !done;
        } else if (sp.role === 'on') {
          // The new tyre carried in to the hub, fitted, then back out of the way.
          const inn = smooth((u - 0.2) / 0.3), out = smooth((u - 0.62) / 0.2);
          home((sp.wx - sp.x) * 0.85 * (inn - out), side * (-1.1 * inn + 0.6 * out));
          setActionOnce(p, out > 0.5 ? null : 'carry'); if (tyre) tyre.visible = u < 0.58;
        } else if (sp.role === 'jack') { setActionOnce(p, done ? null : 'jack'); home(Math.sign(sp.x) * 0.5 * back, 0); }
        else if (sp.role === 'release') setActionOnce(p, done ? 'wave' : 'point');
        else setActionOnce(p, done ? null : 'hug');   // the stabilisers, hands on the car
        animatePerson(p, dt);
      }
      if (c.t > c.len + 1.4) { c.busy = false; c.root.visible = false; }
    }
  }
  dispose() { for (const c of this.crews) this.scene.remove(c.root); this.crews = []; }
}
const GUN = new MeshStandardMaterial({ color: 0x2a2c30, metalness: 0.6, roughness: 0.4 });
const JACK = new MeshStandardMaterial({ color: 0x9a9ea6, metalness: 0.7, roughness: 0.35 });
