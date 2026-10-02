import {
  Group, Mesh, BoxGeometry, TorusGeometry, CylinderGeometry, PlaneGeometry, MeshStandardMaterial,
  MeshBasicMaterial, CanvasTexture, SRGBColorSpace, Vector3, Color,
} from 'three';

/**
 * First-person cockpit, built in camera space (camera looks down -Z) so it is
 * framed the same in every car: racing wheel with shift lights and a hub
 * display, gloved hands on the rim, arms that follow the hands, harness
 * straps, dash, A-pillars and roof header in the car's paint.
 *
 * The wheel turns with the real front-wheel angle (including the
 * self-aligning countersteer), at a quick racing ratio.
 */
const RATIO = 5.5;
const RIM = 0.17;

export class CockpitView {
  constructor(camera) {
    this.group = new Group();
    this.group.visible = false;
    camera.add(this.group);

    const mat = (color, o = {}) => new MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, ...o });
    this.mats = {
      alcantara: mat(0x3a3c42, { roughness: 0.95 }),
      carbon: mat(0x141416, { roughness: 0.35, metalness: 0.3 }),
      glove: mat(0x22252b, { roughness: 0.85 }),
      suit: mat(0x2b3442, { roughness: 0.9 }),
      accent: mat(0xffc21a, { roughness: 0.6 }),
      strap: mat(0xc8242b, { roughness: 0.8 }),
      metal: mat(0xc9ccd2, { roughness: 0.3, metalness: 0.9 }),
      paint: mat(0xffc21a, { roughness: 0.35, metalness: 0.2 }),
      dash: mat(0x18191c, { roughness: 0.9 }),
      mirror: mat(0x8fa3b8, { roughness: 0.05, metalness: 1 }),
    };
    const M = this.mats;
    const add = (parent, geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const mesh = new Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, rz);
      parent.add(mesh);
      return mesh;
    };

    // ---- car body around the driver: dash, A-pillars, header, mirror --------
    const g = this.group;
    // Dash: top surface, the face toward the driver, and the instrument cowl.
    add(g, new BoxGeometry(1.7, 0.1, 0.42), M.dash, 0, -0.43, -0.83);
    add(g, new BoxGeometry(1.7, 0.5, 0.04), M.dash, 0, -0.68, -0.63);
    add(g, new BoxGeometry(0.36, 0.07, 0.18), M.dash, 0, -0.36, -0.74, -0.25);
    // Hood seen through the windscreen: painted panel falling away, with fender crowns either side.
    add(g, new BoxGeometry(1.5, 0.05, 1.5), M.paint, 0, -0.52, -1.75, -0.14);
    for (const s of [-1, 1]) add(g, new BoxGeometry(0.34, 0.12, 1.2), M.paint, s * 0.66, -0.47, -1.6, -0.12, 0, s * 0.18);
    add(g, new BoxGeometry(1.6, 0.03, 0.06), M.carbon, 0, -0.46, -1.02);                 // windscreen base trim
    for (const s of [-1, 1]) {
      const pillar = add(g, new BoxGeometry(0.07, 0.95, 0.05), M.paint, s * 0.6, 0.02, -0.76, -0.38, 0, s * 0.2);
      pillar.scale.set(1, 1, 1);
      add(g, new BoxGeometry(0.12, 0.1, 0.3), M.dash, s * 0.72, -0.36, -0.7);           // door top
    }
    add(g, new BoxGeometry(1.4, 0.07, 0.12), M.paint, 0, 0.44, -0.62);                  // roof header
    add(g, new BoxGeometry(0.2, 0.06, 0.03), M.carbon, 0, 0.37, -0.6);
    add(g, new PlaneGeometry(0.18, 0.045), M.mirror, 0, 0.37, -0.584, 0.1);

    // ---- steering wheel ----------------------------------------------------------
    this.wheelMount = new Group();
    this.wheelMount.position.set(0, -0.25, -0.46);
    this.wheelMount.rotation.x = 0.32; // top leans away, like a real column
    g.add(this.wheelMount);
    this.wheel = new Group();
    this.wheelMount.add(this.wheel);
    const W = this.wheel;
    add(W, new TorusGeometry(RIM, 0.017, 6, 28), M.alcantara, 0, 0, 0);
    for (const s of [-1, 1]) add(W, new TorusGeometry(RIM, 0.026, 6, 6, 0.9), M.alcantara, 0, 0, 0, 0, 0, s > 0 ? -0.45 : Math.PI - 0.45); // grips
    add(W, new BoxGeometry(0.03, 0.018, 0.02), M.accent, 0, RIM, 0.002);                // 12 o'clock stripe
    add(W, new BoxGeometry(0.15, 0.1, 0.035), M.carbon, 0, 0.0, -0.005);                // hub
    for (const s of [-1, 1]) add(W, new BoxGeometry(0.08, 0.025, 0.02), M.carbon, s * 0.11, -0.01, -0.005); // spokes
    add(W, new BoxGeometry(0.025, 0.09, 0.02), M.carbon, 0, -0.1, -0.005);
    for (const s of [-1, 1]) add(W, new BoxGeometry(0.05, 0.08, 0.008), M.metal, s * 0.085, 0.05, -0.04); // shift paddles
    // Rotary knobs and buttons on the hub.
    for (const [x, y, c] of [[-0.055, -0.03, 0xc8242b], [0.055, -0.03, 0x2f9be0], [-0.055, 0.03, 0xffc21a], [0.055, 0.03, 0x6fd61f]]) {
      add(W, new CylinderGeometry(0.009, 0.009, 0.012, 8), new MeshBasicMaterial({ color: c }), x, y, 0.016, Math.PI / 2);
    }
    // Hub display (gear + speed), redrawn a few times a second.
    this.screen = document.createElement('canvas');
    this.screen.width = 128; this.screen.height = 64;
    this.screenTex = new CanvasTexture(this.screen);
    this.screenTex.colorSpace = SRGBColorSpace;
    add(W, new PlaneGeometry(0.075, 0.0375), new MeshBasicMaterial({ map: this.screenTex }), 0, 0.005, 0.0131);
    // Shift lights along the top of the hub.
    this.leds = [];
    const ledCols = [0x2dd36f, 0x2dd36f, 0x2dd36f, 0xffc21a, 0xffc21a, 0xffc21a, 0xff3b3b, 0xff3b3b, 0x3b7bff, 0x3b7bff];
    ledCols.forEach((c, k) => {
      const m = new MeshBasicMaterial({ color: c });
      m.userData.on = new Color(c).multiplyScalar(2.2);
      m.userData.off = new Color(c).multiplyScalar(0.12);
      this.leds.push(add(W, new BoxGeometry(0.008, 0.008, 0.006), m, -0.054 + k * 0.012, 0.042, 0.016));
    });

    // ---- hands (on the rim, they turn with it) and arms -------------------------
    this.hands = [];
    for (const s of [-1, 1]) {
      const hand = new Group();
      hand.position.set(s * RIM, 0.0, 0.0);
      add(hand, new BoxGeometry(0.05, 0.085, 0.055), M.glove, s * 0.008, 0, 0.012);     // palm wrapped on the rim
      add(hand, new BoxGeometry(0.045, 0.075, 0.03), M.glove, -s * 0.012, 0, 0.035);    // fingers over the front
      add(hand, new BoxGeometry(0.02, 0.04, 0.02), M.glove, -s * 0.03, 0.03, 0.02);    // thumb
      add(hand, new BoxGeometry(0.052, 0.02, 0.06), M.accent, s * 0.012, -0.05, 0.0);   // cuff stripe
      W.add(hand);
      this.hands.push(hand);
    }
    this.arms = [-1, 1].map((s) => {
      const upper = add(g, new BoxGeometry(0.085, 0.085, 1), M.suit, 0, 0, 0);
      const fore = add(g, new BoxGeometry(0.07, 0.07, 1), M.suit, 0, 0, 0);
      return { s, upper, fore, shoulder: new Vector3(s * 0.25, -0.5, 0.08) };
    });

    this._tmp = new Vector3();
    this._elbow = new Vector3();
    this.screenTimer = 0;
  }

  setPaint(hex) {
    this.mats.paint.color.setHex(hex);
  }

  /** @param vehicle physics vehicle; @param visible cockpit camera active */
  update(vehicle, dt, visible) {
    this.group.visible = visible;
    if (!visible) return;
    this.wheel.rotation.z = vehicle.steerAngle * RATIO;
    // Arms: shoulder -> elbow (out and down) -> wrist, re-aimed every frame.
    for (const a of this.arms) {
      const hand = this.hands[a.s < 0 ? 0 : 1];
      hand.getWorldPosition(this._tmp);
      this.group.worldToLocal(this._tmp);
      this._tmp.z += 0.03;
      this._elbow.copy(a.shoulder).lerp(this._tmp, 0.5);
      this._elbow.x += a.s * 0.07;
      this._elbow.y -= 0.07;
      place(a.upper, a.shoulder, this._elbow, 1);
      place(a.fore, this._elbow, this._tmp, 1);
    }
    // Shift lights.
    const eng = vehicle.cfg.engine;
    const frac = (vehicle.rpm - eng.redlineRpm * 0.55) / (eng.redlineRpm * 0.43);
    const lit = Math.round(Math.max(0, Math.min(1, frac)) * this.leds.length);
    const flash = vehicle.rpm > eng.redlineRpm - 150 && Math.floor(performance.now() / 80) % 2;
    this.leds.forEach((m, k) => m.material.color.copy(k < lit && !flash ? m.material.userData.on : m.material.userData.off));
    // Hub display at ~12 Hz.
    this.screenTimer -= dt;
    if (this.screenTimer <= 0) {
      this.screenTimer = 0.08;
      const c = this.screen.getContext('2d');
      c.fillStyle = '#05070a'; c.fillRect(0, 0, 128, 64);
      c.fillStyle = '#ffc21a'; c.font = 'bold 44px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(vehicle.gearLabel, 34, 34);
      c.fillStyle = '#e8edf5'; c.font = 'bold 28px Arial';
      c.fillText(String(Math.round(Math.abs(vehicle.forwardSpeed) * 3.6)), 92, 28);
      c.fillStyle = '#7f8a99'; c.font = '11px Arial';
      c.fillText('KM/H', 92, 52);
      this.screenTex.needsUpdate = true;
    }
  }
}

/** Stretch a unit-length (along z) box between two points. */
function place(mesh, a, b, unit) {
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.lookAt(mesh.parent.localToWorld(b.clone()));
  // lookAt works in world space; the parent is the camera group, so convert back.
  mesh.scale.set(1, 1, a.distanceTo(b) / unit);
}
