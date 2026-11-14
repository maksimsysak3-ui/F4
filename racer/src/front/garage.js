import {
  Group, Mesh, BoxGeometry, PlaneGeometry, CylinderGeometry, TorusGeometry, MeshStandardMaterial, MeshBasicMaterial, CanvasTexture,
  SRGBColorSpace, Color, Vector3, PointLight, SpotLight, HemisphereLight, DirectionalLight, RectAreaLight,
} from 'three';
import { buildPerson, setPose } from './people.js?v=1a016bc';

/*
 * The team's garage in the pit lane, for the race weekend. The garage opens to the pit lane at +z
 * (daylight pouring in); the car sits in the middle on its stands, nose to the lane, tyre blankets on;
 * mechanics round it; along the left wall the engineers' desk with its banks of monitors; at the back
 * the team's wall with the logo, tyre sets on trolleys, red tool cabinets; an overhead gantry of LED
 * lights and timing screens. The player's desk is at the front right: a big monitor showing the
 * weekend (drawn live), which is what they click to open the weekend screen.
 *
 * World: floor at y = 0, the car's middle at the origin, the garage 9 m wide (x), 14 m deep (z from
 * -9 at the back wall to +5 at the door).
 */
const mats = new Map();
const M = (hex, rough = 0.6, metal = 0, extra = {}) => {
  const k = `${hex}|${rough}|${metal}|${JSON.stringify(extra)}`;
  if (!mats.has(k)) mats.set(k, new MeshStandardMaterial({ color: new Color(hex), roughness: rough, metalness: metal, ...extra }));
  return mats.get(k);
};
function box(p, m, w, h, d, x, y, z, ry = 0, shadow = true) {
  const o = new Mesh(new BoxGeometry(w, h, d), m);
  o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = shadow; o.receiveShadow = true;
  p.add(o); return o;
}
function cyl(p, m, r0, r1, h, x, y, z, seg = 16, rx = 0, rz = 0) {
  const o = new Mesh(new CylinderGeometry(r0, r1, h, seg), m);
  o.position.set(x, y, z); o.rotation.set(rx, 0, rz); o.castShadow = true; o.receiveShadow = true;
  p.add(o); return o;
}
const canvasTex = (w, h, draw) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 4;
  return t;
};
const lum = (hex) => { const c = new Color(hex); return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b; };

/** A screen showing a timing-ish page in the team colours (for the walls and the engineers' desk). */
function dataScreen(A, k) {
  return canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#0b0d12'; g.fillRect(0, 0, w, h);
    g.fillStyle = A; g.fillRect(0, 0, w, 14);
    if (k % 3 === 0) { // telemetry traces
      for (const [col, ph, amp] of [['#2fd673', 0, 30], ['#ff4d4d', 1.3, 22], ['#ffd21f', 2.1, 16]]) { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); for (let x = 0; x < w; x += 4) { const y = 90 + Math.sin(x / 18 + ph + k) * amp * Math.sin(x / 70 + k); if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
    } else if (k % 3 === 1) { // timing rows
      for (let r = 0; r < 9; r++) { g.fillStyle = r % 2 ? '#141821' : '#10131a'; g.fillRect(4, 20 + r * 15, w - 8, 14); g.fillStyle = ['#ff8000', '#d40000', '#1e2a5c', '#00d2be', '#00594f'][r % 5]; g.fillRect(6, 22 + r * 15, 3, 10); g.fillStyle = '#c9ccd4'; g.fillRect(14, 25 + r * 15, 30, 4); g.fillRect(w - 60, 25 + r * 15, 50, 4); }
    } else { // track map
      g.strokeStyle = '#f5c518'; g.lineWidth = 4; g.beginPath(); g.ellipse(w / 2, h / 2 + 8, 90, 48, 0.2, 0, 6.3); g.stroke();
      g.fillStyle = A; g.beginPath(); g.arc(w / 2 + 60, h / 2 - 10, 6, 0, 7); g.fill();
    }
  });
}

/**
 * Builds the garage into `group`. o: { team, carModel (Group, ~5.6 m long on y = 0, nose +z), crew
 * looks: { drivers: [look, look], principal } }.
 * Returns { screen (the player's monitor mesh), drawScreen(fn(g, w, h)), carModel, people, views }.
 */
export function buildGarage(group, o) {
  const t = o.team, A = t.colours[0], B = t.colours[1] ?? '#111', base = t.colours.find((c) => lum(c) < 0.72) ?? '#1c1f26';
  const accentInk = lum(A) > 0.6 ? '#14161c' : '#ffffff';
  // ---- the shell -------------------------------------------------------------------------------
  const floorTex = canvasTex(1024, 1024, (g, w) => {
    g.fillStyle = '#9ea2a8'; g.fillRect(0, 0, w, w);
    for (let k = 0; k < 2500; k++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * w, 2 + Math.random() * 6, 1); }
    g.fillStyle = A; g.fillRect(w * 0.06, 0, 18, w); g.fillRect(w * 0.94 - 18, 0, 18, w);   // team stripes along the sides
    g.fillStyle = '#e8e8e8'; for (const x of [0.25, 0.75]) g.fillRect(w * x - 4, w * 0.15, 8, w * 0.75); // the car's box lines
    g.fillStyle = '#e8e8e8'; g.fillRect(w * 0.25, w * 0.15, w * 0.5, 8);
  });
  const floor = new Mesh(new PlaneGeometry(10, 15).rotateX(-Math.PI / 2), new MeshStandardMaterial({ map: floorTex, roughness: 0.22, metalness: 0.15 }));
  floor.position.set(0, 0, -2); floor.receiveShadow = true; group.add(floor);
  // Pit lane outside (bright concrete) and the wall opposite.
  const lane = new Mesh(new PlaneGeometry(40, 14).rotateX(-Math.PI / 2), M('#c9c6c0', 0.8));
  lane.position.set(0, -0.01, 12); group.add(lane);
  box(group, M('#e8e4dc', 0.7), 40, 1.1, 0.5, 0, 0.55, 18.5);                                     // the pit wall across the lane
  for (let x = -18; x <= 18; x += 4) box(group, M('#9a9ea6', 0.3, 0.8), 0.08, 3.5, 0.08, x, 2.85, 18.5); // fence posts
  const skyTex = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5f8fd0'); gr.addColorStop(0.65, '#bcd3ee'); gr.addColorStop(1, '#eef3f8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const sky = new Mesh(new PlaneGeometry(90, 34), new MeshBasicMaterial({ map: skyTex }));
  sky.position.set(0, 14, 44); sky.rotation.y = Math.PI; group.add(sky);
  // Across the pit wall: the track, then a grandstand full of fans under its roof.
  const tarmac = new Mesh(new PlaneGeometry(90, 16).rotateX(-Math.PI / 2), M('#3b3d42', 0.9));
  tarmac.position.set(0, -0.02, 27); group.add(tarmac);
  const crowd = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#2a2d35'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 10; r++) for (let x = 0; x < w; x += 4) { g.fillStyle = ['#d8d2c8', '#e63b2e', '#1f4fa8', '#f2c230', A, '#1b1d22', '#f4f4f6'][Math.floor(Math.random() * 7)]; g.fillRect(x + (r % 2) * 2, r * 12 + 3, 3, 6); }
  });
  crowd.wrapS = 1000; crowd.repeat.set(4, 1);
  const stand = new Mesh(new PlaneGeometry(80, 9), new MeshStandardMaterial({ map: crowd, roughness: 0.9 }));
  stand.position.set(0, 5.2, 37); stand.rotation.set(-0.5, Math.PI, 0); group.add(stand);
  box(group, M('#d9dce2', 0.5, 0.3), 80, 0.4, 7, 0, 10.4, 38.5, 0, false);                           // the roof
  for (let x = -36; x <= 36; x += 8) box(group, M('#b8bcc4', 0.4, 0.6), 0.3, 10, 0.3, x, 5.2, 41, 0, false);
  box(group, M('#e8e4dc', 0.7), 80, 1.6, 0.6, 0, 0.8, 34.6, 0, false);                                 // the wall in front of the stand
  // Walls and ceiling: dark panels with the team colour, the back wall a feature.
  const wallM = M('#4a4f5a', 0.75, 0.05);
  box(group, wallM, 0.3, 5, 14, -5.15, 2.5, -2);
  box(group, wallM, 0.3, 5, 14, 5.15, 2.5, -2);
  const sideTex = canvasTex(1024, 384, (g, w, h) => {
    g.fillStyle = '#e9ebef'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d5d8de'; for (let x = 0; x < w; x += 128) g.fillRect(x, 0, 3, h);
    g.fillStyle = A; g.beginPath(); g.moveTo(0, h * 0.62); g.lineTo(w, h * 0.42); g.lineTo(w, h * 0.56); g.lineTo(0, h * 0.76); g.fill();
    g.fillStyle = base; g.fillRect(0, h * 0.86, w, h * 0.14);
  });
  for (const sx of [-1, 1]) {
    const side = new Mesh(new PlaneGeometry(14, 5), new MeshStandardMaterial({ map: sideTex, roughness: 0.6 }));
    side.position.set(sx * 4.99, 2.5, -2); side.rotation.y = -sx * Math.PI / 2; side.receiveShadow = true; group.add(side);
  }
  box(group, M('#141519', 0.8), 10.6, 0.3, 14, 0, 5.15, -2, 0, false);
  const backTex = canvasTex(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, new Color(base).getStyle()); gr.addColorStop(1, new Color(base).multiplyScalar(0.4).getStyle());
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = B; g.fillRect(0, h - 26, w, 26);
    g.globalAlpha = 0.08; g.fillStyle = '#fff'; for (let k = 0; k < 18; k++) g.fillRect(k * 64, 0, 2, h); g.globalAlpha = 1;
  });
  const back = new Mesh(new PlaneGeometry(10, 5), new MeshStandardMaterial({ map: backTex, roughness: 0.65 }));
  back.position.set(0, 2.5, -8.98); back.receiveShadow = true; group.add(back);
  // The logo on the back wall (from its link; the wall stands without it if it can't be loaded).
  if (t.logo) {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      const tx = canvasTex(1024, 400, (g, w, h) => { g.fillStyle = t.logoBg ?? '#f4f4f6'; g.fillRect(0, 0, w, h); const k = Math.min((w - 80) / img.width, (h - 60) / img.height); g.drawImage(img, (w - img.width * k) / 2, (h - img.height * k) / 2, img.width * k, img.height * k); });
      const m = new Mesh(new PlaneGeometry(3.6, 1.4), new MeshStandardMaterial({ map: tx, roughness: 0.4 }));
      m.position.set(0, 3.5, -8.9); group.add(m);
    };
    img.src = t.logo;
  }
  // The front of the garage: the door frame and a header board with the team's name.
  box(group, M('#202228', 0.5, 0.4), 10.6, 1.2, 0.3, 0, 4.6, 5.1);
  const head = canvasTex(1024, 128, (g, w, h) => { g.fillStyle = A; g.fillRect(0, 0, w, h); g.fillStyle = accentInk; g.font = '900 72px "Titillium Web", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t.full.toUpperCase(), w / 2, h / 2 + 4, w - 60); });
  const headM = new Mesh(new PlaneGeometry(8, 1), new MeshStandardMaterial({ map: head, roughness: 0.5, emissive: 0xffffff, emissiveMap: head, emissiveIntensity: 0.15 }));
  headM.position.set(0, 4.6, 5.26); headM.rotation.y = Math.PI; group.add(headM);

  // ---- overhead gantry: LED strips, hanging screens ---------------------------------------------
  for (const x of [-2.6, 2.6]) {
    box(group, M('#2a2c33', 0.4, 0.7), 0.25, 0.25, 12, x, 4.4, -2.5);
    const led = new Mesh(new BoxGeometry(0.12, 0.04, 11.5), new MeshBasicMaterial({ color: new Color(2.4, 2.4, 2.3) }));
    led.position.set(x, 4.26, -2.5); group.add(led);
  }
  for (const [x, z, ry, k] of [[-2.6, -1, 0.35, 0], [2.6, -1, -0.35, 1], [0, -6.5, 0, 2]]) {
    const scr = new Mesh(new PlaneGeometry(1.4, 0.85), new MeshBasicMaterial({ map: dataScreen(A, k) }));
    scr.position.set(x, 3.55, z); scr.rotation.y = ry; group.add(scr);
    box(group, M('#0d0e11', 0.4, 0.4), 1.5, 0.95, 0.06, x - Math.sin(ry) * 0.04, 3.55, z - Math.cos(ry) * 0.04, ry);
    for (const s of [-0.5, 0.5]) box(group, M('#2a2c33', 0.4, 0.7), 0.03, 0.4, 0.03, x + s * Math.cos(ry), 4.2, z - s * Math.sin(ry));
  }

  // ---- the car on its stands, tyre blankets on --------------------------------------------------
  const car = o.carModel;
  if (car) { car.position.x = 0; car.position.z = -1.2; group.add(car); }
  const blanket = M(A, 0.85);
  box(group, M('#c8202a', 0.35, 0.3), 0.3, 0.12, 1.2, 0, 0.12, 1.8);            // front jack
  cyl(group, M('#9a9ea6', 0.3, 0.8), 0.02, 0.02, 1.6, 0, 0.75, 2.4, 6, 0.9);   // its handle
  void B;

  // ---- tyre sets on trolleys, tool cabinets ------------------------------------------------------
  const rubber = M('#16171a', 0.9), comps = [['#e8213a', 'S'], ['#ffd21f', 'M'], ['#f4f4f6', 'H']];
  comps.forEach(([band], k) => {
    const x = -3.6 + k * 1.2, z = -7.6;
    box(group, M('#9a9ea6', 0.3, 0.7), 0.9, 0.06, 0.9, x, 0.3, z);
    for (let n = 0; n < 4; n++) {
      cyl(group, blanket, 0.36, 0.36, 0.33, x, 0.52 + n * 0.34, z, 20);
      cyl(group, M(band, 0.5), 0.365, 0.365, 0.05, x, 0.52 + n * 0.34 + 0.12, z, 20);
    }
  });
  for (const [x, z] of [[3.2, -7.9], [4.3, -7.9], [4.6, -5.5]]) {   // red tool cabinets with drawers
    const c = box(group, M('#c8202a', 0.3, 0.4), 1, 1.05, 0.6, x, 0.55, z, x > 4.4 ? Math.PI / 2 : 0);
    void c;
    for (let d = 0; d < 5; d++) box(group, M('#9a9ea6', 0.25, 0.8), 0.8, 0.02, 0.02, x, 0.25 + d * 0.18, z + (x > 4.4 ? 0 : 0.31), x > 4.4 ? Math.PI / 2 : 0, false);
    box(group, M('#2a2c33', 0.4, 0.3), 1.02, 0.04, 0.62, x, 1.1, z, x > 4.4 ? Math.PI / 2 : 0);
  }
  // Wheel guns and an air line on the side wall.
  for (let k = 0; k < 4; k++) { const gx = 4.95, gz = -3 + k * 0.5; box(group, M('#2a2c33', 0.4, 0.6), 0.1, 0.32, 0.12, gx, 1.6, gz); cyl(group, M('#e8e8e8', 0.4, 0.6), 0.04, 0.04, 0.2, gx - 0.12, 1.66, gz, 8, 0, Math.PI / 2); }

  // ---- the engineers' desk (left wall): monitors, chairs, engineers ------------------------------
  box(group, M('#1a1b20', 0.4, 0.3), 1.0, 0.06, 6, -4.4, 0.78, -2.5);
  box(group, M('#26282e', 0.5, 0.2), 0.9, 0.74, 6, -4.45, 0.38, -2.5);
  const people = [];
  for (let k = 0; k < 4; k++) {
    const z = -4.7 + k * 1.45;
    for (const [dz, dy] of [[-0.33, 1.15], [0.33, 1.15], [0, 1.62]]) {
      const scr = new Mesh(new PlaneGeometry(0.6, 0.36), new MeshBasicMaterial({ map: dataScreen(A, k * 3 + Math.round(dz * 3 + dy)) }));
      scr.position.set(-4.62, dy, z + dz); scr.rotation.y = Math.PI / 2; group.add(scr);
      box(group, M('#0d0e11', 0.4, 0.4), 0.04, 0.4, 0.66, -4.66, dy, z + dz);
    }
    const chair = new Group(); chair.position.set(-3.55, 0, z); group.add(chair);
    box(chair, M('#1c1d22', 0.85), 0.5, 0.08, 0.5, 0, 0.5, 0); box(chair, M('#1c1d22', 0.85), 0.07, 0.6, 0.46, 0.25, 0.82, 0);
    cyl(chair, M('#9a9ea6', 0.25, 0.9), 0.025, 0.025, 0.4, 0, 0.27, 0, 8);
    const eng = buildPerson(o.crew?.[k] ?? { skin: ['#f4d2b4', '#9a6440', '#ebc29c', '#d6a476'][k], hair: ['quiff', 'short', 'bald', 'buzz'][k], hairCol: ['#7a5634', '#1b1714', '#2a1d14', '#5a3a22'][k], facial: k === 2 ? 'beard' : 'none', glasses: k === 1 }, { kind: 'polo', main: lum(A) > 0.85 ? B : A, accent: '#ffffff', patch: B });
    eng.position.set(-3.6, 0, z); eng.rotation.y = -Math.PI / 2;
    setPose(eng, 'sit');
    // A headset.
    const hs = new Mesh(new TorusGeometry(0.11, 0.015, 6, 16, Math.PI), M('#111', 0.4, 0.4));
    hs.position.set(0, 1.68 - 0.335, 0); hs.rotation.y = Math.PI / 2; eng.userData.head.add(hs);
    hs.position.set(0, 0.06, 0);
    group.add(eng); people.push(eng);
  }

  // ---- mechanics round the car -------------------------------------------------------------------
  const mechLooks = o.mechanics ?? [];
  const spots = [[-1.9, 0.6, 0.8], [1.9, 0.4, -0.9], [-1.8, -2.6, 1.2], [1.8, -2.9, -1.4], [0, 2.9, Math.PI], [-0.8, -4.6, 0.2], [1.1, -4.4, -0.3]];
  spots.forEach(([x, z, ry], k) => {
    const look = mechLooks[k % Math.max(1, mechLooks.length)] ?? { skin: ['#ebc29c', '#d6a476', '#9a6440', '#f4d2b4'][k % 4], hair: ['short', 'buzz', 'bald', 'quiff'][k % 4], hairCol: ['#2a1d14', '#5a3a22', '#1b1714', '#7a5634'][k % 4], facial: k % 3 ? 'none' : 'stubble' };
    const m = buildPerson(look, { kind: 'race', main: lum(A) > 0.85 ? B : A, accent: lum(A) > 0.85 ? A : B, patch: '#ffffff' });
    m.position.set(x, 0, z); m.rotation.y = ry;
    if (k % 2) setPose(m, 'clasp');
    group.add(m); people.push(m);
  });

  // ---- the player's desk (front right) and their monitor ------------------------------------------
  box(group, M('#1a1b20', 0.35, 0.3), 1.6, 0.05, 0.8, 3.7, 0.78, 2.6, -0.5);
  box(group, M('#26282e', 0.5, 0.2), 1.5, 0.74, 0.7, 3.72, 0.38, 2.62, -0.5);
  const mon = new Group(); mon.position.set(3.85, 0.8, 2.35); mon.rotation.y = -0.5 + Math.PI; group.add(mon);
  box(mon, M('#0b0b0d', 0.3, 0.5), 1.0, 0.6, 0.04, 0, 0.55, 0);
  box(mon, M('#0b0b0d', 0.3, 0.5), 0.06, 0.25, 0.06, 0, 0.13, 0.04);
  box(mon, M('#0b0b0d', 0.3, 0.5), 0.3, 0.02, 0.22, 0, 0.01, 0.04);
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 1024; screenCanvas.height = 600;
  const screenTex = new CanvasTexture(screenCanvas); screenTex.colorSpace = SRGBColorSpace;
  const screen = new Mesh(new PlaneGeometry(0.96, 0.56), new MeshBasicMaterial({ map: screenTex }));
  screen.position.set(0, 0.55, -0.025); screen.rotation.y = Math.PI; mon.add(screen);
  const glow = new PointLight(new Color(A), 0.6, 2, 2); glow.position.set(0, 0.55, -0.4); mon.add(glow);
  const pchair = new Group(); pchair.position.set(4.0, 0, 3.55); pchair.rotation.y = Math.PI - 0.5; group.add(pchair);
  box(pchair, M('#33363e', 0.8), 0.5, 0.08, 0.5, 0, 0.5, 0); box(pchair, M('#33363e', 0.8), 0.48, 0.62, 0.07, 0, 0.85, 0.25);
  cyl(pchair, M('#9a9ea6', 0.25, 0.9), 0.025, 0.025, 0.4, 0, 0.27, 0, 8);

  // ---- light: daylight from the lane, the LED gantry, warm fill ----------------------------------
  group.add(new HemisphereLight(0xf2f4ff, 0x5a5650, 1.7));
  for (const [x, z] of [[-3.6, -5], [-3.6, 0], [3.6, -5], [3.6, 1.2]]) { const l = new PointLight(0xf4f6ff, 5, 8, 1.6); l.position.set(x, 4.0, z); group.add(l); }
  const sun = new DirectionalLight(0xfff2e0, 2.2);
  sun.position.set(4, 9, 16); sun.target.position.set(0, 0, -2);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  sun.shadow.bias = -0.0004;
  group.add(sun, sun.target);
  for (const x of [-2.6, 2.6]) { const l = new SpotLight(0xf4f6ff, 26, 9, 0.9, 0.7, 1.4); l.position.set(x, 4.2, -1.5); l.target.position.set(x * 0.3, 0, -1.5); group.add(l, l.target); }
  const fill = new PointLight(new Color(A), 1.6, 9, 2); fill.position.set(0, 1.2, -7.5); group.add(fill);
  void RectAreaLight; void Vector3;

  // The driver's eyes: the helmet's place in the car model (in the garage's frame).
  const eye = new Vector3(0, 0.95, -1.4);
  if (car?.userData.head) { group.updateMatrixWorld(true); car.userData.head.getWorldPosition(eye); group.worldToLocal(eye); eye.y += 0.12; car.userData.head.visible = false; }
  return {
    screen, people, carModel: car,
    /** Repaint the player's monitor: draw(g, w, h). */
    drawScreen(draw) { const g = screenCanvas.getContext('2d'); draw(g, screenCanvas.width, screenCanvas.height); screenTex.needsUpdate = true; },
    views: {
      // Standing behind the player's chair, the monitor and the garage beyond it.
      desk: { pos: new Vector3(1.3, 1.85, 6.3), look: new Vector3(2.1, 1.1, 0.4), fov: 50 },
      wide: { pos: new Vector3(4.2, 2.6, 7.6), look: new Vector3(-0.6, 0.9, -2.6), fov: 50 },
      screen: { pos: new Vector3(3.45, 1.36, 3.1), look: new Vector3(3.85, 1.35, 2.35), fov: 34 },
      // In the car: the driver's eye line under the halo, looking out at the lane.
      cockpit: { pos: eye, look: new Vector3(eye.x, eye.y - 0.75, eye.z + 8), fov: 68 },
    },
  };
}
