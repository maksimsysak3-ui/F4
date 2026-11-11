import {
  Group, Mesh, BoxGeometry, PlaneGeometry, CylinderGeometry, SphereGeometry, IcosahedronGeometry, LatheGeometry, TorusGeometry,
  MeshStandardMaterial, MeshBasicMaterial, CanvasTexture, SRGBColorSpace, Color, Vector2, Vector3,
  SpotLight, PointLight, DirectionalLight, HemisphereLight, RepeatWrapping,
} from 'three';
import { buildPerson, setPose } from './people.js';

/*
 * The season hub's home: the manager's office. A modern room in the team's colours: a floor-to-ceiling
 * window onto a garden (a lake, trees, a gravel path), a feature wall with the team's logo,
 * trophy and helmet shelves, a wood-slat wall with a TV showing the next circuit, LED strips and
 * pendant lamps. At the walnut desk the manager sits at an ultrawide monitor on its sign-in page,
 * among a keyboard, mouse, lamp, mug, the signed contract, a notebook, a phone and a scale model of
 * the team's car.
 *
 * World: the desk's centre at the origin, its top at 0.75 m; the manager sits behind it (z > 0) facing
 * -z, towards the monitor and the window wall beyond. Returns the clickable screen and camera poses.
 */
const mats = new Map();
const M = (hex, rough = 0.6, metal = 0, extra = {}) => {
  const k = `${hex}|${rough}|${metal}|${JSON.stringify(extra)}`;
  if (!mats.has(k)) mats.set(k, new MeshStandardMaterial({ color: new Color(hex), roughness: rough, metalness: metal, ...extra }));
  return mats.get(k);
};
function box(parent, m, w, h, d, x, y, z, ry = 0, shadow = true) {
  const o = new Mesh(new BoxGeometry(w, h, d), m);
  o.position.set(x, y, z); o.rotation.y = ry;
  o.castShadow = shadow; o.receiveShadow = true;
  parent.add(o);
  return o;
}
function cyl(parent, m, r0, r1, h, x, y, z, seg = 16) {
  const o = new Mesh(new CylinderGeometry(r0, r1, h, seg), m);
  o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true;
  parent.add(o);
  return o;
}
const canvasTex = (w, h, draw) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
};
const lum = (hex) => { const c = new Color(hex); return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b; };

/**
 * Builds the office into `group`. o: { team, manager (look + suit, tie), trackLayout (for the TV), nextName,
 * carModel (a Group, ~5.6 m long, standing on y = 0) }.
 */
export function buildOffice(group, o) {
  const t = o.team, A = t.colours[0], base = t.colours.find((c) => lum(c) < 0.72) ?? '#1c1f26';
  const room = new Group();
  group.add(room);

  // ---- the room ---------------------------------------------------------------------------------
  const floorTex = canvasTex(512, 512, (g, w) => { // wide oak boards
    for (let i = 0; i < 8; i++) { g.fillStyle = ['#4a3526', '#523b2a', '#463222', '#4f3828'][i % 4]; g.fillRect(0, i * 64, w, 64); g.fillStyle = '#00000030'; g.fillRect(0, i * 64, w, 2); }
    for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * w, 40 + Math.random() * 120, 1); }
  });
  floorTex.wrapS = floorTex.wrapT = RepeatWrapping; floorTex.repeat.set(4, 4);
  const floor = new Mesh(new PlaneGeometry(12, 12).rotateX(-Math.PI / 2), new MeshStandardMaterial({ map: floorTex, roughness: 0.45, metalness: 0.05 }));
  floor.receiveShadow = true;
  room.add(floor);
  box(room, M('#1a1b20', 0.9), 4.6, 0.012, 3.0, 0, 0.006, 0.3, 0, false);                      // rug
  box(room, M('#2a2c33', 0.85), 4.5, 0.014, 2.9, 0, 0.007, 0.3, 0, false);
  const ceiling = box(room, M('#16171b', 0.9), 12, 0.1, 12, 0, 3.45, 0, 0, false);
  void ceiling;
  for (const x of [-2.4, 0, 2.4]) box(room, new MeshBasicMaterial({ color: new Color(1.6, 1.55, 1.45) }), 0.06, 0.02, 7, x, 3.39, -0.5, 0, false); // LED strips

  // Window wall behind the desk: mullions, glass, the circuit outside.
  const W = { z: -4.2 };
  box(room, M('#d9d9dc', 0.8), 12, 0.3, 0.3, 0, 0.15, W.z, 0);                                   // sill
  box(room, M('#16171b', 0.5, 0.6), 12, 0.25, 0.25, 0, 3.32, W.z, 0);                            // head
  for (let x = -5; x <= 5.01; x += 1.67) box(room, M('#16171b', 0.4, 0.6), 0.07, 3.2, 0.12, x, 1.7, W.z, 0);
  box(room, M('#16171b', 0.4, 0.6), 12, 0.05, 0.1, 0, 1.0, W.z, 0);                              // transom
  const glass = new Mesh(new PlaneGeometry(12, 3.1), new MeshStandardMaterial({ color: 0x9fb8c8, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.2 }));
  glass.position.set(0, 1.75, W.z + 0.02);
  room.add(glass);
  buildOutside(room);

  // Feature wall (left): the team's colour, its name in big letters and its logo, shelves of trophies.
  const wallTex = canvasTex(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, base); gr.addColorStop(1, new Color(base).multiplyScalar(0.45).getStyle());
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = t.colours[1] ?? '#fff'; g.fillRect(0, h - 14, w, 14);
  });
  const feature = new Mesh(new PlaneGeometry(8.4, 3.4), new MeshStandardMaterial({ map: wallTex, roughness: 0.7 }));
  feature.position.set(-4.98, 1.7, 0.2); feature.rotation.y = Math.PI / 2; feature.receiveShadow = true;
  room.add(feature);
  // The logo on a plate (loaded from its link; the wall keeps the name if it can't be).
  const plate = box(room, M(t.logoBg ?? '#f4f4f6', 0.4), 0.04, 0.9, 1.9, -4.94, 2.35, 0.2, 0);
  void plate;
  if (t.logo) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const tx = canvasTex(512, 240, (g, w, h) => { g.fillStyle = t.logoBg ?? '#f4f4f6'; g.fillRect(0, 0, w, h); const k = Math.min((w - 40) / img.width, (h - 30) / img.height); g.drawImage(img, (w - img.width * k) / 2, (h - img.height * k) / 2, img.width * k, img.height * k); });
      const face = new Mesh(new PlaneGeometry(1.86, 0.86), new MeshStandardMaterial({ map: tx, roughness: 0.4 }));
      face.position.set(-4.915, 2.35, 0.2); face.rotation.y = Math.PI / 2;
      room.add(face);
    };
    img.src = t.logo;
  }
  // Shelves with trophies and helmets.
  const gold = M('#d4a83a', 0.25, 0.9), silver = M('#cfd3d8', 0.2, 0.9);
  const cup = new LatheGeometry([[0, 0], [0.07, 0], [0.07, 0.03], [0.02, 0.05], [0.02, 0.14], [0.09, 0.2], [0.1, 0.3], [0.085, 0.32]].map(([r, y]) => new Vector2(r, y)), 20);
  for (const [y, z0] of [[1.15, -1.9], [1.75, -1.9], [1.15, 2.3], [1.75, 2.3]]) {
    box(room, M('#1c1c20', 0.4, 0.5), 0.32, 0.04, 1.3, -4.82, y, z0);
    for (let k = 0; k < 3; k++) {
      const z = z0 - 0.45 + k * 0.45;
      if ((k + (y > 1.5 ? 1 : 0)) % 2 === 0) { const c = new Mesh(cup, k === 1 ? silver : gold); c.position.set(-4.82, y + 0.02, z); c.scale.setScalar(0.8 + (k % 2) * 0.25); c.castShadow = true; room.add(c); }
      else { // a helmet replica in the team's colours
        const h = new Group(); h.position.set(-4.8, y + 0.15, z); h.rotation.y = Math.PI / 2 - 0.4;
        const shell = new Mesh(new SphereGeometry(0.13, 18, 14), M(A, 0.25, 0.2)); shell.scale.set(1, 0.92, 1.12); shell.castShadow = true; h.add(shell);
        const visor = new Mesh(new BoxGeometry(0.2, 0.06, 0.05), M('#141418', 0.1, 0.6)); visor.position.set(0, 0.01, 0.12); h.add(visor);
        const band = new Mesh(new TorusGeometry(0.12, 0.012, 6, 24), M(t.colours[1] ?? '#fff', 0.4)); band.rotation.x = Math.PI / 2; band.position.y = -0.02; h.add(band);
        room.add(h);
      }
    }
  }

  // Right wall: vertical wood slats and a TV with the next circuit's outline.
  for (let z = -4; z <= 4.5; z += 0.13) box(room, M(z % 0.26 < 0.13 ? '#5b4130' : '#634733', 0.6), 0.06, 3.3, 0.08, 4.97, 1.7, z, 0);
  const tvTex = canvasTex(1024, 576, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0d0f14'); gr.addColorStop(1, new Color(base).multiplyScalar(0.5).getStyle());
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const L = o.trackLayout;
    if (L) {
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (let i = 0; i < L.N; i++) { x0 = Math.min(x0, L.x[i]); x1 = Math.max(x1, L.x[i]); z0 = Math.min(z0, L.z[i]); z1 = Math.max(z1, L.z[i]); }
      const k = Math.min((w - 260) / (x1 - x0), (h - 160) / (z1 - z0)), ox = 120 + ((w - 240) - (x1 - x0) * k) / 2, oz = 80 + ((h - 160) - (z1 - z0) * k) / 2;
      g.beginPath(); for (let i = 0; i <= L.N; i += 2) { const X = ox + (L.x[i % L.N] - x0) * k, Y = oz + (L.z[i % L.N] - z0) * k; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }
      g.closePath(); g.lineJoin = 'round'; g.strokeStyle = '#000'; g.lineWidth = 16; g.stroke(); g.strokeStyle = '#f5c518'; g.lineWidth = 8; g.stroke();
    }
    g.fillStyle = '#fff'; g.font = '800 44px "Barlow Condensed", Arial'; g.fillText((o.nextName ?? 'NEXT RACE').toUpperCase(), 40, 66);
  });
  box(room, M('#0b0b0d', 0.3, 0.5), 0.05, 0.95, 1.65, 4.9, 1.75, 0.6, 0);
  const tv = new Mesh(new PlaneGeometry(1.58, 0.89), new MeshBasicMaterial({ map: tvTex }));
  tv.position.set(4.87, 1.75, 0.6); tv.rotation.y = -Math.PI / 2;
  room.add(tv);
  // A credenza under the TV, a plant in the corner.
  box(room, M('#24252b', 0.5, 0.2), 0.5, 0.6, 2.2, 4.68, 0.3, 0.6, 0);
  box(room, M('#5b4130', 0.5), 0.52, 0.03, 2.22, 4.68, 0.615, 0.6, 0);
  const pot = cyl(room, M('#e8e4dc', 0.6), 0.22, 0.17, 0.5, 4.3, 0.25, -3.5);
  void pot;
  const leaf = M('#2f6b3a', 0.7);
  for (let k = 0; k < 14; k++) { const l = new Mesh(new IcosahedronGeometry(0.2, 0), leaf); const a = k * 2.4; l.position.set(4.3 + Math.cos(a) * 0.18, 0.75 + (k % 5) * 0.16, -3.5 + Math.sin(a) * 0.18); l.scale.set(0.6, 1.5, 0.35); l.rotation.set(Math.cos(a) * 0.5, a, Math.sin(a) * 0.5); l.castShadow = true; room.add(l); }

  // Pendant lamps over the desk.
  for (const x of [-0.55, 0.55]) {
    cyl(room, M('#111114', 0.3, 0.6), 0.004, 0.004, 1.3, x, 2.8, 0, 6);
    const shade = cyl(room, M('#111114', 0.35, 0.7), 0.06, 0.2, 0.22, x, 2.05, 0, 24);
    void shade;
    const bulb = new Mesh(new SphereGeometry(0.05, 12, 8), new MeshBasicMaterial({ color: new Color(2.2, 1.9, 1.5) }));
    bulb.position.set(x, 1.95, 0); room.add(bulb);
  }

  // ---- the desk -----------------------------------------------------------------------------------
  const walnut = canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#5a3a24'; g.fillRect(0, 0, w, h); for (let k = 0; k < 90; k++) { g.strokeStyle = `rgba(${30 + Math.random() * 30},${18 + Math.random() * 14},${10},${0.25 + Math.random() * 0.3})`; g.lineWidth = 1 + Math.random() * 2; const y = Math.random() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + (Math.random() - 0.5) * 20, w * 0.7, y + (Math.random() - 0.5) * 20, w, y + (Math.random() - 0.5) * 10); g.stroke(); } });
  const top = new Mesh(new BoxGeometry(2.1, 0.05, 0.95), new MeshStandardMaterial({ map: walnut, roughness: 0.35, metalness: 0.05 }));
  top.position.set(0, 0.725, 0); top.castShadow = true; top.receiveShadow = true;
  group.add(top);
  const black = M('#141418', 0.35, 0.7);
  for (const x of [-0.95, 0.95]) { box(group, black, 0.05, 0.7, 0.05, x, 0.35, -0.38); box(group, black, 0.05, 0.7, 0.05, x, 0.35, 0.38); box(group, black, 0.05, 0.05, 0.8, x, 0.04, 0); box(group, black, 0.05, 0.05, 0.8, x, 0.68, 0); }
  box(group, M('#2a2b31', 0.6, 0.3), 1.8, 0.4, 0.03, 0, 0.47, -0.42);                                  // modesty panel

  // Ultrawide monitor facing the manager (+z), the hub on it.
  const mon = new Group(); mon.position.set(0.15, 0.75, -0.08); group.add(mon);
  box(mon, black, 0.28, 0.015, 0.2, 0, 0.008, 0);                                                    // base
  box(mon, black, 0.05, 0.3, 0.03, 0, 0.16, -0.04);                                                  // neck
  box(mon, M('#0b0b0d', 0.3, 0.5), 1.0, 0.46, 0.04, 0, 0.42, 0);                                     // body
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 1024; screenCanvas.height = 440;
  const screenTex = new CanvasTexture(screenCanvas); screenTex.colorSpace = SRGBColorSpace;
  const screen = new Mesh(new PlaneGeometry(0.96, 0.42), new MeshBasicMaterial({ map: screenTex, color: new Color(1, 1, 1) }));
  screen.position.set(0, 0.42, 0.021); mon.add(screen);
  const glow = new PointLight(new Color(A), 0.8, 2.2, 2); glow.position.set(0, 0.42, 0.3); mon.add(glow);
  // Keyboard, mouse and pad.
  const kbTex = canvasTex(512, 160, (g, w, h) => { g.fillStyle = '#1b1c21'; g.fillRect(0, 0, w, h); g.fillStyle = '#2e3038'; for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) g.fillRect(8 + c * 33.5, 8 + r * 30, 29, 25); g.fillRect(140, 128, 230, 25); });
  const kb = new Mesh(new BoxGeometry(0.44, 0.018, 0.14), [M('#1b1c21', 0.5), M('#1b1c21', 0.5), new MeshStandardMaterial({ map: kbTex, roughness: 0.6 }), M('#1b1c21', 0.5), M('#1b1c21', 0.5), M('#1b1c21', 0.5)]);
  kb.position.set(0.15, 0.759, 0.36); kb.castShadow = true; group.add(kb);
  box(group, M('#202126', 0.9), 0.32, 0.004, 0.26, 0.52, 0.752, 0.36);
  const mouse = new Mesh(new SphereGeometry(0.035, 12, 8), M('#16171b', 0.3, 0.3)); mouse.scale.set(0.9, 0.45, 1.5); mouse.position.set(0.52, 0.765, 0.36); mouse.castShadow = true; group.add(mouse);
  // Desk lamp (left), its light.
  const lamp = new Group(); lamp.position.set(-0.85, 0.75, -0.22); group.add(lamp);
  cyl(lamp, black, 0.08, 0.09, 0.02, 0, 0.01, 0);
  const arm1 = box(lamp, black, 0.02, 0.4, 0.02, 0, 0.2, 0); arm1.rotation.z = -0.25; arm1.position.x = 0.05;
  const arm2 = box(lamp, black, 0.3, 0.02, 0.02, 0.22, 0.4, 0); arm2.rotation.z = -0.35;
  const head = cyl(lamp, black, 0.03, 0.07, 0.1, 0.36, 0.33, 0, 16); head.rotation.z = 0.5;
  const lampLight = new SpotLight(0xffd8a8, 6, 2.5, 0.7, 0.6, 1.8); lampLight.position.set(-0.5, 1.07, -0.22); lampLight.target.position.set(-0.35, 0.75, 0.15); group.add(lampLight, lampLight.target);
  // Mug in the team colour, the signed contract, a notebook and pen, a phone.
  const mug = cyl(group, M('#f2f2ee', 0.4), 0.042, 0.04, 0.1, 0.78, 0.8, 0.12, 20); void mug;
  cyl(group, M(A, 0.5), 0.0425, 0.0425, 0.025, 0.78, 0.82, 0.12, 20);
  const handle = new Mesh(new TorusGeometry(0.028, 0.008, 6, 14), M('#f2f2ee', 0.4)); handle.position.set(0.83, 0.8, 0.12); handle.rotation.y = Math.PI / 2; group.add(handle);
  box(group, M(base, 0.5), 0.24, 0.012, 0.32, -0.42, 0.756, 0.2, 0.18);                              // contract folder
  box(group, M('#f4f2ec', 0.8), 0.21, 0.004, 0.29, -0.42, 0.764, 0.2, 0.18);
  box(group, M('#202128', 0.7), 0.15, 0.01, 0.21, -0.12, 0.755, 0.33, -0.12);                         // notebook
  const pen = cyl(group, M('#d4a83a', 0.3, 0.8), 0.005, 0.005, 0.14, -0.04, 0.765, 0.32, 8); pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.5;
  box(group, M('#0d0d10', 0.2, 0.4), 0.075, 0.008, 0.15, 0.82, 0.754, 0.33, -0.3);                   // phone
  // The scale model of the team's car on a plinth.
  box(group, M('#101114', 0.3, 0.4), 0.42, 0.03, 0.14, -0.62, 0.765, -0.24);
  if (o.carModel) { const m = o.carModel; m.scale.multiplyScalar(0.38 / 5.6); m.position.set(-0.62, 0.781, -0.24); m.rotation.y = Math.PI / 2 + 0.35; group.add(m); }

  // ---- the chairs and the manager -----------------------------------------------------------------
  const chair = (x, z, ry, tall = true) => {
    const c = new Group(); c.position.set(x, 0, z); c.rotation.y = ry; group.add(c);
    const fab = M('#1c1d22', 0.85);
    box(c, fab, 0.5, 0.08, 0.48, 0, 0.47, 0);                                                         // seat
    box(c, fab, 0.48, tall ? 0.62 : 0.4, 0.07, 0, tall ? 0.85 : 0.72, 0.25);                          // back
    for (const s of [-1, 1]) box(c, black, 0.04, 0.03, 0.3, s * 0.27, 0.66, 0.02);                   // armrests
    for (const s of [-1, 1]) box(c, black, 0.03, 0.18, 0.03, s * 0.27, 0.57, 0.1);
    cyl(c, M('#9a9ea6', 0.25, 0.9), 0.025, 0.025, 0.36, 0, 0.26, 0, 10);                             // gas lift
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2, leg = box(c, black, 0.04, 0.03, 0.3, Math.sin(a) * 0.15, 0.07, Math.cos(a) * 0.15); leg.rotation.y = a; cyl(c, black, 0.025, 0.025, 0.04, Math.sin(a) * 0.29, 0.03, Math.cos(a) * 0.29, 8); }
    return c;
  };
  chair(0.15, 0.86, 0);
  chair(-0.55, -1.25, Math.PI, false);
  chair(0.75, -1.25, Math.PI, false);
  const m = o.manager ?? {};
  const manager = buildPerson(m, { kind: 'suit', main: m.suit ?? '#1d2230', accent: m.tie ?? '#8a1a22' });
  manager.position.set(0.15, 0.0, 0.82);
  manager.rotation.y = Math.PI;
  setPose(manager, 'sit');
  group.add(manager);

  // ---- light ----------------------------------------------------------------------------------------
  group.add(new HemisphereLight(0xfff4e6, 0x2a2420, 0.9));
  const sun = new DirectionalLight(0xfff0dc, 2.6);
  sun.position.set(-3, 7, -9); sun.target.position.set(0, 0.5, 0.5);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
  sun.shadow.bias = -0.0004;
  group.add(sun, sun.target);
  const fill = new PointLight(0xffe2c0, 3, 6, 2); fill.position.set(0, 2.6, 1.2); group.add(fill);
  const accent = new PointLight(new Color(A), 2.2, 5, 2); accent.position.set(-4.2, 0.5, 0.2); group.add(accent);

  // ---- the monitor: a sign-in page (the password typed in when it's clicked) -----------------------------
  const who = o.manager?.name || 'Manager', initials = who.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  const clock = new Date();
  function drawScreen(hover, typed = 0, welcome = false) {
    const g = screenCanvas.getContext('2d'), w = 1024, h = 440;
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, new Color(base).multiplyScalar(0.9).getStyle()); gr.addColorStop(1, new Color(base).multiplyScalar(0.22).getStyle());
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const glowG = g.createRadialGradient(w * 0.75, h * 0.1, 10, w * 0.75, h * 0.1, 520); glowG.addColorStop(0, '#ffffff30'); glowG.addColorStop(1, '#ffffff00');
    g.fillStyle = glowG; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.fillStyle = '#fff';
    g.font = '600 22px Barlow, Arial'; g.globalAlpha = 0.85;
    g.fillText(clock.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), w / 2, 50);
    g.font = '700 58px "Barlow Condensed", Arial'; g.globalAlpha = 1;
    g.fillText(clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), w / 2, 108);
    // Avatar, name, password field.
    g.fillStyle = A; g.beginPath(); g.arc(w / 2, 186, 46, 0, 7); g.fill();
    g.strokeStyle = '#ffffff90'; g.lineWidth = 3; g.stroke();
    g.fillStyle = lum(A) > 0.6 ? '#14161c' : '#fff'; g.font = '800 38px "Barlow Condensed", Arial'; g.fillText(initials, w / 2, 200);
    g.fillStyle = '#fff'; g.font = '700 28px Barlow, Arial'; g.fillText(who, w / 2, 268);
    const fx = w / 2 - 160, fy = 292;
    g.fillStyle = hover || typed ? '#ffffffee' : '#ffffffb0'; g.beginPath(); g.roundRect(fx, fy, 320, 50, 8); g.fill();
    if (welcome) { g.fillStyle = '#14161c'; g.font = '700 22px Barlow, Arial'; g.fillText('Welcome back', w / 2, fy + 33); }
    else if (typed) { g.fillStyle = '#14161c'; for (let k = 0; k < typed; k++) { g.beginPath(); g.arc(fx + 34 + k * 26, fy + 25, 7, 0, 7); g.fill(); } }
    else { g.fillStyle = '#5a5e68'; g.font = '500 20px Barlow, Arial'; g.fillText('Password', w / 2, fy + 32); }
    g.fillStyle = '#14161c'; g.beginPath(); g.roundRect(fx + 274, fy + 7, 38, 36, 6); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(fx + 285, fy + 25); g.lineTo(fx + 301, fy + 25); g.moveTo(fx + 295, fy + 18); g.lineTo(fx + 302, fy + 25); g.lineTo(fx + 295, fy + 32); g.stroke();
    g.fillStyle = '#ffffffc0'; g.font = '500 17px Barlow, Arial';
    g.fillText(hover ? 'Click to sign in' : `${t.full} · Team systems`, w / 2, 380);
    if (hover) { g.strokeStyle = '#ffffffd0'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); }
    g.textAlign = 'left';
    screenTex.needsUpdate = true;
  }
  drawScreen(false);
  /** Types the password (dots appear one by one), says welcome, then calls done. */
  function unlock(done) {
    let n = 0;
    const tick = () => {
      n++;
      if (n <= 9) { drawScreen(true, n); setTimeout(tick, 75); }
      else { drawScreen(false, 0, true); setTimeout(done, 260); }
    };
    tick();
  }

  return {
    screen,
    manager,
    hover: (on) => drawScreen(on),
    unlock,
    /** Camera poses: the room from over the manager's shoulder, and close in on the screen. */
    views: {
      desk: { pos: new Vector3(2.75, 1.95, 2.9), look: new Vector3(-0.35, 0.95, -0.75), fov: 40 },
      screen: { pos: new Vector3(0.15, 1.17, 0.6), look: new Vector3(0.15, 1.17, -0.06), fov: 32 },
    },
  };
}

/**
 * The view out of the window (beyond z = -4.2): a lawn running down to a lake, a gravel path along
 * the shore with lamp posts and a bench, clumps of trees, hills and the sky.
 */
function buildOutside(room) {
  const out = new Group();
  room.add(out);
  // Sky: a big gradient dome, haze at the horizon.
  const sky = canvasTex(4, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#4f86c8'); gr.addColorStop(0.55, '#9cc2e6'); gr.addColorStop(0.8, '#e6eef2'); gr.addColorStop(1, '#e6eef2'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); });
  const dome = new Mesh(new SphereGeometry(140, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new MeshBasicMaterial({ map: sky, side: 1 }));
  dome.position.set(0, -2, -40);
  out.add(dome);
  // Lawn (outside floor level: the office is on the ground floor), slightly lower than the room.
  const grass = canvasTex(256, 256, (g, w) => { g.fillStyle = '#5f8f3e'; g.fillRect(0, 0, w, w); for (let k = 0; k < 1600; k++) { g.fillStyle = `rgba(${40 + Math.random() * 60},${90 + Math.random() * 70},${30 + Math.random() * 30},0.5)`; g.fillRect(Math.random() * w, Math.random() * w, 2, 3); } });
  grass.wrapS = grass.wrapT = RepeatWrapping; grass.repeat.set(30, 30);
  const lawn = new Mesh(new PlaneGeometry(160, 120).rotateX(-Math.PI / 2), new MeshStandardMaterial({ map: grass, roughness: 0.95 }));
  lawn.position.set(0, -0.02, -64); lawn.receiveShadow = true;
  out.add(lawn);
  box(out, M('#c9c4b8', 0.85), 14, 0.15, 2.4, 0, 0.0, -5.5);                                            // a stone terrace outside
  // The lake: a still, reflective surface with a shoreline.
  const shore = new Mesh(new CylinderGeometry(19, 19.6, 0.06, 48), M('#8a7d62', 0.9)); shore.scale.set(1.6, 1, 0.55); shore.position.set(3, 0.0, -34); out.add(shore);
  const lake = new Mesh(new CylinderGeometry(18.8, 18.8, 0.05, 48), new MeshStandardMaterial({ color: 0x3f7896, roughness: 0.06, metalness: 0.75 })); lake.scale.set(1.6, 1, 0.55); lake.position.set(3, 0.02, -34); out.add(lake);
  // The gravel path: curving from the terrace down to the shore and along it.
  const gravel = M('#cfc3a6', 1);
  const pts = [[-2, -7], [-3.2, -11], [-5.5, -15], [-8, -19], [-11, -22.5], [-15, -25.5], [-20, -27.5], [-26, -29]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], len = Math.hypot(x1 - x0, z1 - z0);
    const seg = new Mesh(new BoxGeometry(1.7, 0.04, len + 0.6), gravel);
    seg.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2); seg.rotation.y = Math.atan2(x1 - x0, z1 - z0); seg.receiveShadow = true;
    out.add(seg);
    const post = new Group(); post.position.set(x0 + 1.4, 0, z0); out.add(post);                       // a lamp post every segment
    cyl(post, M('#1c1d22', 0.4, 0.6), 0.04, 0.05, 2.6, 0, 1.3, 0, 8);
    const lampHead = new Mesh(new BoxGeometry(0.22, 0.22, 0.22), new MeshBasicMaterial({ color: 0xfff1d8 })); lampHead.position.y = 2.7; post.add(lampHead);
  }
  const bench = new Group(); bench.position.set(-6.8, 0, -15.6); bench.rotation.y = 0.9; out.add(bench);
  box(bench, M('#7a5a3a', 0.8), 1.6, 0.06, 0.45, 0, 0.45, 0); box(bench, M('#7a5a3a', 0.8), 1.6, 0.4, 0.06, 0, 0.7, -0.2);
  for (const x of [-0.7, 0.7]) box(bench, M('#1c1d22', 0.4, 0.6), 0.06, 0.45, 0.45, x, 0.22, 0);
  // Trees: rounded deciduous canopies and darker conifers, in clumps round the lawn and the far shore.
  const trunkM = M('#5a4130', 0.9);
  const leafMs = ['#3f7a34', '#4a8a3a', '#5b9440', '#356b2e'].map((c) => M(c, 0.85));
  const firM = M('#2c5a32', 0.85);
  let seed = 7;
  const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const tree = (x, z, s) => {
    const g = new Group(); g.position.set(x, 0, z); g.scale.setScalar(s); out.add(g);
    if (R() < 0.3) { // conifer
      cyl(g, trunkM, 0.12, 0.16, 1.2, 0, 0.6, 0, 6);
      for (let k = 0; k < 3; k++) { const c = new Mesh(new CylinderGeometry(0, 1.5 - k * 0.38, 1.8, 7), firM); c.position.y = 1.6 + k * 1.05; c.castShadow = true; g.add(c); }
    } else {
      cyl(g, trunkM, 0.14, 0.2, 2.2, 0, 1.1, 0, 6);
      for (let k = 0; k < 5; k++) { const b = new Mesh(new IcosahedronGeometry(1 + R() * 0.5, 1), leafMs[Math.floor(R() * 4)]); b.position.set((R() - 0.5) * 1.6, 2.8 + R() * 1.3, (R() - 0.5) * 1.6); b.castShadow = true; g.add(b); }
    }
  };
  for (const [cx, cz, n, sp] of [[-12, -12, 6, 4], [10, -11, 5, 3.5], [-24, -36, 9, 7], [26, -30, 8, 7], [4, -58, 16, 18], [-30, -55, 10, 9], [32, -52, 10, 9], [17, -18, 3, 3]]) {
    for (let k = 0; k < n; k++) { const x = cx + (R() - 0.5) * sp * 2, z = cz + (R() - 0.5) * sp * 2; if (Math.hypot((x - 3) / 31, (z + 34) / 11) < 1.05) continue; tree(x, z, 0.9 + R() * 0.7); }
  }
  // Hills beyond.
  for (const [x, z, r, h, c] of [[-40, -95, 40, 14, '#5d7f55'], [10, -110, 55, 18, '#6b8a62'], [55, -95, 40, 12, '#5d7f55']]) {
    const hill = new Mesh(new SphereGeometry(r, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(c, 0.95)); hill.scale.y = h / r; hill.position.set(x, -0.5, z); out.add(hill);
  }
}
