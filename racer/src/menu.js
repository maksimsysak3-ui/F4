import { WebGLRenderer, Scene, PerspectiveCamera, HemisphereLight, DirectionalLight, ACESFilmicToneMapping, SRGBColorSpace, Group, Vector3, Mesh, CircleGeometry, MeshStandardMaterial } from 'three';
import { CarVisual } from './car/carVisual.js';
import { Vehicle } from './physics/vehicle.js';
import { topTimes } from './game/leaderboard.js';
import { formatTime } from './game/lapTimer.js';

const W = 300, H = 160;

/**
 * Start menu: track cards (mini-map, record) and car cards with a live 3D
 * model turning on a turntable. One offscreen renderer draws every car card,
 * copied into each card's 2D canvas, so the page only holds one extra GL context.
 */
export class Menu {
  constructor({ cars, tracks, carIndex, trackIndex, onRace }) {
    this.cars = cars;
    this.tracks = tracks;
    this.car = carIndex;
    this.track = trackIndex;
    this.onRace = onRace;
    this.el = document.getElementById('menu');
    this.build();
    this.renderer = null;
    this.visible = false;
    this.angle = 0;
  }

  build() {
    const trackRow = this.el.querySelector('#menu-tracks');
    const carRow = this.el.querySelector('#menu-cars');
    this.trackCards = this.tracks.map((t, k) => {
      const card = document.createElement('button');
      card.className = 'mcard';
      card.innerHTML = `<canvas width="260" height="96"></canvas><h4>${t.name}</h4><p>${t.blurb ?? ''}</p><p class="rec"></p>`;
      card.addEventListener('click', () => this.pickTrack(k));
      trackRow.appendChild(card);
      drawMap(card.querySelector('canvas'), t.minimap ? t.minimap() : []);
      return card;
    });
    this.carCards = this.cars.map((c, k) => {
      const card = document.createElement('button');
      card.className = 'mcard car';
      const hp = Math.round(Math.max(...c.engine.torqueCurve.map(([rpm, nm]) => (nm * rpm * 2 * Math.PI) / 60 / 745.7)));
      card.innerHTML = `<canvas width="${W}" height="${H}"></canvas><h4>${c.name}</h4><p>${c.blurb ?? ''}</p>
        <div class="stats"><span><b>${hp}</b> hp</span><span><b>${c.mass}</b> kg</span><span><b>${c.defaults.awd ? 'AWD' : 'RWD'}</b></span></div>`;
      card.addEventListener('click', () => this.pickCar(k));
      carRow.appendChild(card);
      return card;
    });
    this.el.querySelector('#menu-race').addEventListener('click', () => this.race());
    this.refresh();
  }

  pickTrack(k) { this.track = k; this.refresh(); }
  pickCar(k) { this.car = k; this.refresh(); }

  refresh() {
    this.trackCards.forEach((c, k) => {
      c.classList.toggle('on', k === this.track);
      const best = topTimes(this.tracks[k].id)[0];
      c.querySelector('.rec').textContent = best ? `Record ${formatTime(best.time)} · ${best.carName}` : 'No record yet';
    });
    this.carCards.forEach((c, k) => c.classList.toggle('on', k === this.car));
  }

  race() {
    this.hide();
    this.onRace(this.track, this.car);
  }

  show(trackIndex = this.track, carIndex = this.car) {
    this.track = trackIndex;
    this.car = carIndex;
    this.refresh();
    this.el.classList.remove('hidden');
    this.visible = true;
    if (!this.renderer) this.initPreview();
  }

  hide() {
    this.el.classList.add('hidden');
    this.visible = false;
  }

  /** Offscreen turntable scene with every car on it (one visible per render). */
  initPreview() {
    try {
      this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    this.renderer.setSize(W, H, false);
    this.renderer.setPixelRatio(1);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(30, W / H, 0.1, 50);
    this.camera.position.set(3.4, 1.5, 3.4);
    this.camera.lookAt(0, 0.25, 0);
    this.scene.add(new HemisphereLight(0xcfe0ff, 0x30283a, 1.6));
    const key = new DirectionalLight(0xfff2dc, 2.6);
    key.position.set(3, 5, 2);
    const rim = new DirectionalLight(0x9fb4ff, 1.4);
    rim.position.set(-4, 2, -3);
    this.scene.add(key, rim);
    const disc = new Mesh(new CircleGeometry(1.9, 48).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: 0x15171d, roughness: 0.85, metalness: 0 }));
    this.scene.add(disc);
    this.turntables = this.cars.map((spec) => {
      const v = new Vehicle({ heightAt: () => 0 }, spec);
      for (let i = 0; i < 240; i++) v.step(1 / 240, { throttle: 0, brake: 0, steer: 0, handbrake: 1 });
      const visual = new CarVisual(spec, spec.paints[0], v.modelOffset);
      visual.root.position.copy(v.body.position);
      visual.root.quaternion.copy(v.body.quaternion);
      visual.update(v, 0);
      const holder = new Group();
      holder.add(visual.root);
      holder.visible = false;
      this.scene.add(holder);
      return holder;
    });
  }

  /** Called every frame by the game loop while the menu is open. */
  update(dt) {
    if (!this.visible || !this.renderer) return;
    this.angle += dt * 0.6;
    this.turntables.forEach((holder, k) => {
      for (const h of this.turntables) h.visible = h === holder;
      // The selected car turns faster and sits a touch closer.
      holder.rotation.y = this.angle * (k === this.car ? 1.6 : 0.7) + k;
      this.renderer.render(this.scene, this.camera);
      const ctx = this.carCards[k].querySelector('canvas').getContext('2d');
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(this.renderer.domElement, 0, 0, W, H);
    });
  }
}

function drawMap(canvas, pts) {
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  if (!pts.length) return;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const s = Math.min((canvas.width - 24) / (x1 - x0 || 1), (canvas.height - 24) / (z1 - z0 || 1));
  const ox = (canvas.width - (x1 - x0) * s) / 2, oz = (canvas.height - (z1 - z0) * s) / 2;
  g.lineJoin = 'round';
  for (const [w, c] of [[7, 'rgba(0,0,0,0.5)'], [4, '#e8edf5']]) {
    g.beginPath();
    pts.forEach(([x, z], k) => { const px = ox + (x - x0) * s, pz = oz + (z - z0) * s; if (k) g.lineTo(px, pz); else g.moveTo(px, pz); });
    g.closePath();
    g.lineWidth = w;
    g.strokeStyle = c;
    g.stroke();
  }
  const [sx, sz] = pts[0];
  g.fillStyle = '#ffc21a';
  g.beginPath();
  g.arc(ox + (sx - x0) * s, oz + (sz - z0) * s, 5, 0, Math.PI * 2);
  g.fill();
}
