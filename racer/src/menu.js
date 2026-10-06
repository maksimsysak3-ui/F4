import { WebGLRenderer, Scene, PerspectiveCamera, HemisphereLight, DirectionalLight, ACESFilmicToneMapping, SRGBColorSpace, Group, Vector3, Mesh, CircleGeometry, MeshStandardMaterial } from 'three';
import { CarVisual } from './car/carVisual.js?v=a5d31c9';
import { Vehicle } from './physics/vehicle.js?v=a5d31c9';
import { topTimes } from './game/leaderboard.js?v=a5d31c9';
import { formatTime } from './game/lapTimer.js?v=a5d31c9';
import { drawCover } from './covers.js?v=a5d31c9';

const W = 300, H = 160;

/**
 * Start menu: track cover cards grouped by pack (with the record) and car cards with a live 3D
 * model turning on a turntable. One offscreen renderer draws every car card,
 * copied into each card's 2D canvas, so the page only holds one extra GL context.
 */
export class Menu {
  constructor({ cars, tracks, packs = [], carIndex, trackIndex, onRace, onWeather }) {
    this.cars = cars;
    this.tracks = tracks;
    this.packs = packs.length ? packs : [{ id: 'creative', name: 'Tracks', blurb: '' }];
    this.car = carIndex;
    this.track = trackIndex;
    this.onRace = onRace;
    this.onWeather = onWeather;
    this.el = document.getElementById('menu');
    this.build();
    this.renderer = null;
    this.visible = false;
    this.angle = 0;
  }

  build() {
    const trackRoot = this.el.querySelector('#menu-tracks');
    const carRow = this.el.querySelector('#menu-cars');
    // Packs first: a tile per pack (a mosaic of its covers); clicking one opens its tracks below.
    this.trackCards = [];
    this.packTiles = {};
    this.packSections = {};
    const tiles = document.createElement('div');
    tiles.className = 'mpacks';
    trackRoot.appendChild(tiles);
    for (const pack of this.packs) {
      const members = this.tracks.map((t, k) => [t, k]).filter(([t]) => (t.pack ?? 'creative') === pack.id);
      if (!members.length) continue;
      const tile = document.createElement('button');
      tile.className = `mpacktile pack-${pack.id}`;
      tile.innerHTML = `<canvas width="640" height="240"></canvas><div><b>${pack.name}</b><span>${members.length} ${members.length === 1 ? 'track' : 'tracks'}</span></div>`;
      tile.addEventListener('click', () => this.openPack(pack.id));
      tiles.appendChild(tile);
      drawPackTile(tile.querySelector('canvas'), members.map(([t]) => t));
      this.packTiles[pack.id] = tile;

      const section = document.createElement('section');
      section.className = `mpack pack-${pack.id} hidden`;
      section.innerHTML = `<header><b>${pack.name}</b><span>${pack.blurb}</span></header>`;
      const row = document.createElement('div');
      row.className = 'mrow';
      for (const [t, k] of members) {
        const card = document.createElement('button');
        card.className = 'mcard track';
        card.innerHTML = `<canvas width="640" height="360"></canvas><p>${t.blurb ?? ''}</p><p class="rec"></p>`;
        card.addEventListener('click', () => this.pickTrack(k));
        row.appendChild(card);
        drawCover(card.querySelector('canvas'), t);
        this.trackCards[k] = card;
      }
      section.appendChild(row);
      trackRoot.appendChild(section);
      this.packSections[pack.id] = section;
    }
    this.openPack(this.tracks[this.track]?.pack ?? this.packs[0].id);
    this.carCards = this.cars.map((c, k) => {
      const card = document.createElement('button');
      card.className = 'mcard car';
      const hp = Math.round(Math.max(...c.engine.torqueCurve.map(([rpm, nm]) => (nm * rpm * 2 * Math.PI) / 60 / 745.7)));
      card.innerHTML = `<canvas width="${W}" height="${H}"></canvas><h4>${c.name}</h4><p>${c.blurb ?? ''}</p>
        <div class="stats"><span><b>${hp}</b> hp</span><span><b>${c.mass}</b> kg</span><span><b>${c.drivetrain.layout === 'fwd' ? 'FWD' : c.defaults.awd ? 'AWD' : c.drivetrain.toggle4x4 ? '4X4' : 'RWD'}</b></span></div>`;
      card.addEventListener('click', () => this.pickCar(k));
      carRow.appendChild(card);
      return card;
    });
    this.el.querySelector('#menu-race').addEventListener('click', () => this.race());
    this.weatherBtn = this.el.querySelector('#menu-weather');
    this.weatherBtn.addEventListener('click', () => this.onWeather?.());
    this.refresh();
  }

  setWeather(wet) {
    this.weatherBtn.textContent = wet ? '🌧 RAIN' : '☀ DRY';
    this.weatherBtn.classList.toggle('on', wet);
  }

  pickTrack(k) { this.track = k; this.refresh(); }

  /** Show one pack's tracks (the tile row stays, the open pack's tile is highlighted). */
  openPack(id) {
    if (!this.packSections[id]) id = Object.keys(this.packSections)[0];
    this.open = id;
    for (const [k, sec] of Object.entries(this.packSections)) sec.classList.toggle('hidden', k !== id);
    for (const [k, tile] of Object.entries(this.packTiles)) tile.classList.toggle('on', k === id);
  }
  pickCar(k) { this.car = k; this.refresh(); }

  refresh() {
    this.trackCards.forEach((c, k) => {
      if (!c) return;
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
    this.openPack(this.tracks[trackIndex]?.pack);
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

/** Pack tile: the pack's covers side by side as a strip, darkened at the bottom for the title. */
function drawPackTile(canvas, tracks) {
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, n = Math.min(4, tracks.length);
  const tmp = document.createElement('canvas');
  tmp.width = 640; tmp.height = 360;
  for (let k = 0; k < n; k++) {
    drawCover(tmp, tracks[k], 2, { bare: true });
    const w = W / n, sx = (640 - (w / H) * 360) / 2;
    g.drawImage(tmp, Math.max(0, sx), 0, Math.min(640, (w / H) * 360), 360, k * w, 0, w, H);
    g.fillStyle = 'rgba(0,0,0,0.5)';
    if (k) g.fillRect(k * w - 1, 0, 2, H);
  }
  const shade = g.createLinearGradient(0, H * 0.35, 0, H);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.8)');
  g.fillStyle = shade;
  g.fillRect(0, 0, W, H);
}
