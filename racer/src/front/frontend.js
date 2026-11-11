import {
  WebGLRenderer, Scene, PerspectiveCamera, HemisphereLight, DirectionalLight, ACESFilmicToneMapping, SRGBColorSpace, Group,
  Mesh, CircleGeometry, MeshStandardMaterial, BoxGeometry, CylinderGeometry, PlaneGeometry, CanvasTexture, Box3, Vector3, Vector2, Color, PCFSoftShadowMap, ShadowMaterial, Raycaster,
} from 'three';
import { CarVisual } from '../car/carVisual.js';
import { Vehicle } from '../physics/vehicle.js';
import { LIVERIES } from '../car/livery.js';
import { topTimes } from '../game/leaderboard.js';
import { formatTime } from '../game/lapTimer.js';
import { drawCover } from '../covers.js';
import { TEAMS, SKIN, HAIR } from './teams.js';
import { buildPerson, animatePerson, setPose } from './people.js';
import { PHOTOS } from './photos.js';
import { buildCinematic } from './cinematic.js';
import { seasonHub, CALENDAR } from './hub.js';
import { buildOffice } from './office.js';
import { buildGarage } from './garage.js';
import { weekendScreens } from './weekend.js';

/*
 * The front end, laid out like a modern F1 game's menus: blurred streaks of the team colour on the left,
 * the circuit's picture in a panel across the middle, a solid block of the team colour on the right
 * with the car over it, a huge outlined name, an info card on the left, a row of cards along the bottom
 * and controller-style button hints. Screens: the main menu, the season mode's opening (create your
 * manager, choose a team, sign the contract) and the time trial (livery, then circuit).
 */
const SAVE = 'tiny-f1:season', FAV = 'tiny-f1:fav';
const TURNS = { zandvoort: 14, cota: 20, interlagos: 15, hungaroring: 14, monaco: 19, miami: 19, catalunya: 14, baku: 20, silverstone: 18, yas: 16, spa: 19, suzuka: 18, jeddah: 27, mexico: 17, austria: 10, canada: 14, singapore: 19, australia: 14, monza: 11, bahrain: 15, vegas: 17, qatar: 16, china: 16, madring: 22 };
const DIFFICULTY = { monaco: 'Very hard', singapore: 'Very hard', baku: 'Hard', jeddah: 'Hard', suzuka: 'Hard', zandvoort: 'Hard', vegas: 'Easy', monza: 'Easy', bahrain: 'Easy', austria: 'Easy' };
const GP = { zandvoort: 'Dutch', cota: 'United States', interlagos: 'São Paulo', hungaroring: 'Hungarian', monaco: 'Monaco', miami: 'Miami', catalunya: 'Barcelona-Catalunya', baku: 'Azerbaijan', silverstone: 'British', yas: 'Abu Dhabi', spa: 'Belgian', suzuka: 'Japanese', jeddah: 'Saudi Arabian', mexico: 'Mexico City', austria: 'Austrian', canada: 'Canadian', singapore: 'Singapore', australia: 'Australian', monza: 'Italian', bahrain: 'Bahrain', vegas: 'Las Vegas', qatar: 'Qatar', china: 'Chinese', madring: 'Spanish' };
const CAR_YAW = -Math.PI * 0.5 + 0.55; // the car's nose towards the viewer and to the left

const CSS = `
#front{position:fixed;inset:0;z-index:50;color:#fff;font-family:"Titillium Web",Arial,sans-serif;--a:#ff8000;--b:#1b1b20;overflow:hidden;background:#0d0b0a;user-select:none}
#front.hidden{display:none}
#front .streaks{position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;-webkit-mask:linear-gradient(90deg,#000 35%,transparent 75%);mask:linear-gradient(90deg,#000 35%,transparent 75%)}
#front .streaks i{position:absolute;left:-20%;width:150%;height:14%;transform:rotate(-12deg);filter:blur(22px);opacity:.75;background:linear-gradient(90deg,transparent,var(--a) 30%,color-mix(in srgb,var(--a) 40%,#000) 60%,transparent)}
#front .photo{position:absolute;left:22%;top:0;width:62%;height:68%;background-size:cover;background-position:center;-webkit-mask:linear-gradient(90deg,transparent 0,#000 14%),linear-gradient(0deg,transparent 0,#000 22%);-webkit-mask-composite:source-in;mask-composite:intersect}
#front .credit{position:absolute;left:1.2%;bottom:1.2%;font-size:10px;color:#ffffff70;max-width:46%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#front .credit a{color:inherit}
#front .block{position:absolute;right:0;top:0;width:18.5%;height:71%;background:var(--a)}
#front canvas.stage{position:absolute;inset:0;width:100%;height:100%}
#front .brand{position:absolute;right:2.2%;top:4%;display:flex;align-items:center;gap:10px}
#front .brand b{font-family:"Titillium Web",Arial,sans-serif;font-style:italic;font-size:clamp(26px,3.4vw,46px);letter-spacing:-.02em;text-shadow:0 2px 12px #0006}
#front .brand i{width:46px;height:46px;border-radius:50%;background:#fff;color:#111;display:grid;place-items:center;font-style:normal;font-weight:900;font-size:13px}
#front .hd{position:absolute;left:5.2%;top:12.5%;text-shadow:0 2px 14px #000c,0 1px 3px #000}
#front .tag{display:inline-block;background:#f0425a;color:#fff;font-weight:800;font-size:clamp(11px,1vw,14px);letter-spacing:.04em;padding:5px 9px;border-radius:3px;text-transform:uppercase}
#front .hd h1{font-family:"Titillium Web",Arial,sans-serif;font-weight:900;font-size:clamp(24px,2.6vw,36px);margin:12px 0 2px;text-transform:uppercase;letter-spacing:.01em}
#front .hd p{margin:0;font-size:clamp(12px,1.15vw,16px);color:#d4d7de;text-transform:uppercase;letter-spacing:.02em}
#front .bigname{position:absolute;left:36%;top:27.5%;font-family:"Titillium Web",Arial,sans-serif;font-weight:900;font-size:clamp(50px,8.6vw,124px);color:transparent;-webkit-text-stroke:1.5px #ffffffd9;letter-spacing:.03em;white-space:nowrap;pointer-events:none;text-transform:uppercase;line-height:1}
#front .card{position:absolute;left:5.2%;top:28.3%;width:29%;height:41%;background:linear-gradient(160deg,#2c2420e6,#1a1614e6);border:1px solid #ffffff2a;box-shadow:0 18px 50px #0007;padding:1.6% 1.8%;box-sizing:border-box;overflow:auto}
#front .card canvas.outline{width:100%;height:45%;display:block}
#front .stats{display:grid;grid-template-columns:1fr 1fr;column-gap:8%;margin-top:4%}
#front .stats div{border-top:1px solid #ffffff2e;padding:6px 0 8px}
#front .stats span{display:block;font-size:clamp(10px,.95vw,13px);font-weight:800;text-transform:uppercase;letter-spacing:.02em}
#front .stats b{display:block;font-size:clamp(11px,1vw,14px);font-weight:400;color:#e8e9ec;margin-top:2px}
#front .cards{position:absolute;left:0;right:0;top:73%;height:15%;display:flex;gap:1.2%;padding:0 0 0 0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
#front .cards::-webkit-scrollbar{display:none}
#front .cards button{flex:0 0 14%;height:100%;background:#1c1916f0;border:1px solid #ffffff22;border-radius:6px;position:relative;cursor:pointer;color:#fff;text-align:left;padding:0}
#front .cards button b{position:absolute;left:8%;top:10%;font-size:clamp(10px,1.05vw,14px);font-weight:900;text-transform:uppercase;letter-spacing:.02em;white-space:nowrap}
#front .cards button canvas{position:absolute;left:12%;right:12%;bottom:8%;width:76%;height:62%}
#front .cards button img{position:absolute;left:9%;right:9%;bottom:9%;width:82%;height:60%;box-sizing:border-box;padding:6px 10px;border-radius:6px;object-fit:contain;box-shadow:0 4px 14px #0008}
#front .cards button.on{background:#2a2a2e;border:2px solid #fff;box-shadow:0 0 0 1px #000,0 10px 30px #0008}
/* main menu: the cinematic behind a panel of stacked items (F1-game style) */
#front.cine .photo,#front.cine .block,#front.cine .streaks,#front.cine .bigname,#front.cine .hd,#front.cine .card,#front.cine .cards,#front.cine .credit,#front.cine .brand{display:none}
#front.cine{background:#000}
#front .fader{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none}
#front .vignette{position:absolute;inset:0;pointer-events:none;display:none;background:radial-gradient(ellipse 75% 70% at 62% 52%,#0000 50%,#000b 100%)}
#front.cine .vignette{display:block}
#front .mm{position:absolute;left:3%;top:4%;bottom:4%;width:clamp(270px,24vw,370px);border-radius:14px;overflow:hidden;display:none;
  background:linear-gradient(205deg,color-mix(in srgb,var(--a) 62%,#000) 0%,color-mix(in srgb,var(--a) 22%,#0b0b10) 34%,#0c0c11f0 62%,#09090df5 100%);
  border:1px solid #ffffff18;box-shadow:0 30px 80px #000c;backdrop-filter:blur(8px)}
#front.cine .mm{display:block}
#front .mm-strip{position:absolute;left:0;top:0;bottom:0;width:15%;background:linear-gradient(180deg,#0000,color-mix(in srgb,var(--a) 45%,#000) 70%,var(--a));border-right:1px solid #ffffff14}
#front .mm-strip span,#front .mm-strip b{position:absolute;left:50%;writing-mode:vertical-rl;transform:translateX(-50%) rotate(180deg);white-space:nowrap;text-transform:uppercase}
#front .mm-strip span{top:4%;font-size:10px;font-weight:800;letter-spacing:.14em;color:#ffffffa0}
#front .mm-strip b{bottom:4%;font-family:"Titillium Web",Arial,sans-serif;font-size:clamp(12px,1.1vw,15px);letter-spacing:.06em}
#front .mm-strip i{position:absolute;left:0;right:0;bottom:31%;height:9%;background:repeating-linear-gradient(135deg,#ffffff38 0 3px,#0000 3px 8px)}
#front .mm-body{position:absolute;left:21%;right:7%;top:9%;bottom:4%;display:flex;flex-direction:column}
#front .mm-logo{display:flex;align-items:center;gap:12px;margin-bottom:9%}
#front .mm-logo i{width:46px;height:46px;flex:none;border-radius:50%;background:#fff;color:#111;display:grid;place-items:center;font-style:normal;font-weight:900;font-size:12px;letter-spacing:.02em}
#front .mm-logo b{font-family:"Titillium Web",Arial,sans-serif;font-style:italic;font-size:clamp(30px,3.1vw,44px);letter-spacing:-.03em;line-height:1}
#front .mm-logo b em{font-style:italic;color:var(--a);-webkit-text-stroke:0}
#front .mm nav{display:flex;flex-direction:column;align-items:flex-start}
#front .mm nav button{background:none;border:2px solid #0000;border-radius:10px;color:#e8e8ee;font-family:"Arial Narrow","Roboto Condensed","Titillium Web",Arial,sans-serif;font-weight:800;text-transform:uppercase;cursor:pointer;text-align:left;margin-left:-14px;display:flex;align-items:center;gap:8px;transition:background .15s,border-color .15s}
#front .mm-main button{font-size:clamp(22px,2.35vw,34px);padding:2px 14px;letter-spacing:.005em;font-stretch:condensed}
#front .mm-sub{margin-top:auto;padding-top:8%;border-top:1px solid #ffffff18}
#front .mm-sub button{font-size:clamp(12px,1.05vw,15px);padding:5px 14px;letter-spacing:.03em}
#front .mm nav button.on{border-color:#fff;background:#ffffff22;color:#fff}
#front .mm nav button:hover:not(.on){background:#ffffff10}
#front .mm nav button u{text-decoration:none;width:16px;height:16px;border-radius:50%;background:#f4d000;color:#111;font-size:11px;font-weight:900;display:grid;place-items:center;font-family:Arial,sans-serif}
#front .mm-desc{font-size:12px;color:#c9cbd3;line-height:1.4;margin:6px 0 0;min-height:2.8em;max-width:95%}
/* the office: the 3D room fills the screen; only the header and the hints over it */
#front.officemode .photo,#front.officemode .block,#front.officemode .streaks,#front.officemode .bigname,#front.officemode .card,#front.officemode .cards,#front.officemode .credit,#front.officemode .brand{display:none}
#front.officemode{background:#000}
#front.officemode .hd .tag{background:var(--a);color:var(--ink,#fff)}
#front.officemode canvas.stage.hot{cursor:pointer}
#front .hints{position:absolute;right:3%;bottom:2.8%;display:flex;gap:2.4vw;align-items:center}
#front .hints button{display:flex;align-items:center;gap:8px;background:none;border:0;color:#fff;font-size:clamp(12px,1.1vw,15px);cursor:pointer;padding:4px}
#front .hints button:hover{color:var(--a)}
#front .hints i{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:900;font-size:12px;color:#111;box-shadow:inset 0 -2px 0 #0003}
#front .scr{display:none}
#front .scr.on{display:contents}
#front .k-a{background:#3cb043}#front .k-b{background:#e0312b}#front .k-y{background:#f4c400}#front .k-x{background:#3a7bd5}
/* manager editor inside the card */
#front .card h3{font-size:11px;letter-spacing:.14em;color:#c8ccd4;margin:10px 0 6px;font-weight:800;text-transform:uppercase}
#front .card h3:first-child{margin-top:0}
#front input.name{width:100%;box-sizing:border-box;background:#00000055;border:1px solid #ffffff30;border-radius:4px;padding:8px 10px;color:#fff;font-size:16px;font-weight:700}
#front .sw{display:flex;flex-wrap:wrap;gap:6px}
#front .sw button{width:24px;height:24px;border-radius:50%;border:2px solid #ffffff40;cursor:pointer}
#front .sw button.on{border-color:#fff;box-shadow:0 0 0 2px #f0425a}
#front .chips{display:flex;flex-wrap:wrap;gap:5px}
#front .chips button{padding:5px 9px;border-radius:3px;background:#ffffff12;border:1px solid #ffffff25;color:#fff;font-size:12px;font-weight:700;text-transform:capitalize;cursor:pointer}
#front .chips button.on{background:#fff;color:#111}
#front .tlogo{display:block;height:64px;max-width:100%;object-fit:contain;padding:6px 12px;border-radius:6px;margin-bottom:10px;box-sizing:border-box}
#front .tline{display:flex;height:5px;margin:4px 0 8px}#front .tline i{flex:1}
#front .signed{position:absolute;left:0;right:0;top:36%;text-align:center;opacity:0;transition:opacity .6s;pointer-events:none}
#front .signed.on{opacity:1}
#front .signed h1{font-family:"Titillium Web",Arial,sans-serif;font-size:clamp(40px,6vw,86px);margin:0;text-transform:uppercase;text-shadow:0 6px 30px #000a}
#front .signed p{font-size:16px;color:#e4e6ea;text-shadow:0 2px 10px #000}
#front .board{position:absolute;right:3%;top:16%;width:22%;background:#141210ee;border:1px solid #ffffff2a;padding:12px 14px;font-size:13px;display:none}
#front .board.on{display:block}
#front .board li{display:flex;justify-content:space-between;padding:3px 0;border-top:1px solid #ffffff1a}
@media (max-width:760px){#front .card{width:88%;top:24%;height:44%}#front .bigname{left:5%;top:16%}#front .block{width:30%}}
`;

export class Frontend {
  constructor({ cars, tracks, onTimeTrial, onSeasonRace, onFreePlay, weather = null, weekend = null }) {
    Object.assign(this, { cars, tracks, onTimeTrial, onSeasonRace, onFreePlay, weather, weekend });
    this.f26 = Math.max(0, cars.findIndex((c) => c.id === 'f26'));
    this.ttTracks = tracks.map((t, i) => ({ t, i })).filter(({ t }) => t.layout);
    this.season = load();
    this.manager = this.season?.manager ?? { name: '', skin: SKIN.light, hair: 'short', hairCol: HAIR.brown, facial: 'none', glasses: false, suit: '#1d2230', tie: '#8a1a22' };
    this.team = Math.max(0, TEAMS.findIndex((t) => t.id === (this.season?.team ?? 'mclaren')));
    let fav = -1;
    try { fav = TEAMS.findIndex((t) => t.id === localStorage.getItem(FAV)); } catch { /* storage off */ }
    this.fav = fav; // the player's favourite team (-1 until chosen): the main menu, the time trial's livery
    this.ttTeam = fav >= 0 ? fav : this.team;
    this.ttTrack = Math.max(0, this.ttTracks.findIndex(({ t }) => t.id === 'zandvoort'));
    this.mode = 0;
    this.visible = false;
    this.screen = 'main';
    this.time = 0;
    this.spin = 0;
    this.buildDom();
  }

  // ---------------------------------------------------------------------------------------------- DOM
  buildDom() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    const el = (this.el = document.createElement('div'));
    el.id = 'front';
    el.className = 'hidden';
    el.innerHTML = `
      <div class="streaks">${[8, 26, 44, 62, 80].map((t, k) => `<i style="top:${t}%;opacity:${0.35 + (k % 3) * 0.2}"></i>`).join('')}</div>
      <div class="photo"></div>
      <div class="block"></div>
      <canvas class="stage"></canvas>
      <div class="bigname"></div>
      <div class="brand"><i>TINY</i><b>F1 26</b></div>
      <div class="hd"><span class="tag"></span><h1></h1><p></p></div>
      <div class="card"></div>
      <div class="cards"></div>
      <div class="signed"><h1>Contract signed</h1><p></p></div>
      <div class="board"></div>
      <div class="vignette"></div>
      <div class="fader"></div>
      <div class="mm"><div class="mm-strip"><span>The 2026 season</span><i></i><b>Lights out</b></div>
        <div class="mm-body"><div class="mm-logo"><i>TINY</i><b>F1 <em>26</em></b></div><nav class="mm-main"></nav><p class="mm-desc"></p><nav class="mm-sub"></nav></div></div>
      <div class="hints"></div>
      <div class="credit"></div>`;
    document.body.appendChild(el);
    this.q = (s) => el.querySelector(s);
    this.canvas = this.q('canvas.stage');
    addEventListener('keydown', (e) => {
      if (!this.visible) return;
      const k = e.key.toLowerCase();
      if (e.target.tagName === 'INPUT') { if (k !== 'enter') return; e.target.blur(); } // typing a name: only Enter acts
      if (k === 'enter' || k === 'a') this.press('a');
      else if (k === 'escape' || k === 'backspace' || k === 'b') this.press('b');
      else if (k === 'y') this.press('y');
      else if (k === 'arrowright' || k === 'arrowleft' || k === 'arrowdown' || k === 'arrowup') this.step(k === 'arrowright' || k === 'arrowdown' ? 1 : -1);
      else return;
      e.preventDefault();
    });
    let drag = null;
    this.canvas.addEventListener('pointerdown', (e) => { drag = e.clientX; this.downAt = [e.clientX, e.clientY]; });
    // The office: hovering the monitor lights it, clicking it opens the season hub.
    const ray = new Raycaster(), ndc = new Vector2();
    const onScreen = (e) => {
      const S = this.stage;
      const scr = S?.office?.screen ?? (this.screen === 'garage' ? S?.garage?.screen : null);
      if (!scr || S.tween) return false;
      const r = this.canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, S.camera);
      return ray.intersectObject(scr, false).length > 0;
    };
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.stage?.office && !this.stage?.garage) return;
      const hot = onScreen(e);
      if (hot !== this.stage.hot) { this.stage.hot = hot; this.stage.office?.hover(hot); this.canvas.classList.toggle('hot', hot); }
    });
    this.canvas.addEventListener('click', (e) => {
      const moved = this.downAt && Math.hypot(e.clientX - this.downAt[0], e.clientY - this.downAt[1]) > 6;
      if (!moved && onScreen(e)) (this.stage.garage ? this.openMonitor() : this.openComputer());
    });
    addEventListener('pointerup', () => { drag = null; });
    addEventListener('pointermove', (e) => { if (drag !== null) { this.spin += (e.clientX - drag) * 0.01; drag = e.clientX; } });
  }

  /** The common frame: header, big name, hints. hints: [[key, label, action], ...] */
  frame({ tag, title, sub, big = '', hints = [] }) {
    this.q('.hd .tag').textContent = tag;
    this.q('.hd h1').textContent = title;
    this.q('.hd p').textContent = sub;
    this.q('.bigname').textContent = big;
    const h = this.q('.hints');
    h.innerHTML = '';
    this.actions = {};
    for (const [key, label, fn] of hints) {
      const b = document.createElement('button');
      b.innerHTML = `<i class="k-${key}">${key.toUpperCase()}</i>${label}`;
      b.addEventListener('click', fn);
      h.appendChild(b);
      this.actions[key] = fn;
    }
    this.q('.signed').classList.remove('on');
    this.q('.board').classList.remove('on');
  }
  press(k) { this.actions?.[k]?.(); }
  step(d) { this.onStep?.(d); }

  /** The row of cards along the bottom ({ title, draw(canvas, selected) }). */
  cardsRow(items, selected, onPick, { hover = false } = {}) {
    const row = this.q('.cards');
    row.innerHTML = '';
    items.forEach((it, k) => {
      const b = document.createElement('button');
      b.innerHTML = it.logo ? '<b></b><img alt="">' : '<b></b><canvas width="360" height="160"></canvas>';
      if (it.logo) { const img = b.querySelector('img'); img.src = it.logo; img.style.background = it.logoBg ?? '#f4f4f6'; img.onerror = () => img.replaceWith(Object.assign(document.createElement('canvas'), { width: 360, height: 160 })); }
      b.querySelector('b').textContent = it.title;
      b.addEventListener('click', () => onPick(k));
      if (hover) b.addEventListener('pointerenter', () => { this.noScroll = true; onPick(k); this.noScroll = false; }); // hovering previews a card, without scrolling the row under the pointer
      row.appendChild(b);
      const cv = b.querySelector('canvas');
      if (cv) it.draw?.(cv, k === selected);
    });
    this.markCard(selected, items);
  }
  markCard(k, items) {
    this.q('.cards').querySelectorAll('button').forEach((b, i) => {
      b.classList.toggle('on', i === k);
      const cv = b.querySelector('canvas');
      if (cv) items?.[i].draw?.(cv, i === k);
    });
    if (!this.noScroll) this.q('.cards').querySelectorAll('button')[k]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }

  /** The frame's colours and the middle picture: a circuit's real photo (credited), else its painted art. */
  setLook({ a, b, track = null, art = null }) {
    this.el.style.setProperty('--a', a);
    this.el.style.setProperty('--b', b ?? '#111');
    const ph = PHOTOS[track?.id], url = track ? trackImage(track) : art;
    this.q('.photo').style.backgroundImage = url ? `url("${url}")` : 'none';
    const credit = this.q('.credit');
    credit.innerHTML = '';
    if (ph) {
      const link = document.createElement('a');
      Object.assign(link, { href: ph.url, target: '_blank', rel: 'noopener' });
      link.textContent = `Photo: ${ph.author || 'Wikimedia Commons'} · ${ph.license} · Wikimedia Commons`;
      credit.appendChild(link);
    }
  }

  // ------------------------------------------------------------------------------------------ flow
  show(screen = 'main', arg) {
    this.visible = true;
    this.el.classList.remove('hidden');
    this.initStage();
    this.go(screen === 'main' && this.fav < 0 ? 'fav' : screen, arg); // first time: pick a favourite team
  }
  hide() { this.visible = false; this.el.classList.add('hidden'); }

  go(where, arg, arg2) {
    this.screen = where;
    this.onStep = null;
    this.el.classList.remove('cine', 'hubmode', 'hub-team', 'officemode', 'wkmode');
    this.tick = null;
    const wk = this.el.querySelector('.wk'); if (wk) wk.innerHTML = '';
    const card = this.q('.card'), cards = this.q('.cards');
    card.style.display = ''; card.style.height = ''; card.innerHTML = '';
    cards.style.display = ''; cards.innerHTML = ''; // no stale cards (and their handlers) from the last screen
    ({ main: () => this.mainMenu(), manager: () => this.managerScreen(), teams: () => this.teamScreen(), contract: () => this.contractScreen(arg), tt: () => this.ttScreen(), fav: () => this.teamScreen(true),
      office: () => this.officeScreen(arg === 'back'),
      loading: () => this.wk().loading(), garage: () => this.wk().garage(arg), monitor: () => this.wk().monitor(arg, arg2), incar: () => this.wk().incar(),
      hub: () => seasonHub(this, { trackImage, turns: TURNS, gpName: (id) => (GP[id] ? `${GP[id]} Grand Prix` : id) }, arg ?? 'home', arg2 ?? 0) })[where]();
  }

  /** The main menu: a panel of stacked items over the cinematic (primary modes big, the rest small). */
  mainMenu() {
    const mt = this.fav >= 0 ? this.fav : this.team, t = TEAMS[mt];
    this.el.classList.add('cine');
    this.el.style.setProperty('--a', t.colours[0]);
    this.el.style.setProperty('--b', t.colours[1]);
    this.frame({ tag: '', title: '', sub: '', hints: [['a', 'Select', () => items[this.mode]?.go()]] });
    const panel = (html) => { const b = this.q('.board'); b.innerHTML = html; b.classList.add('on'); };
    const items = [
      { main: true, title: this.season ? 'Continue season' : 'Season', badge: !this.season, desc: this.season ? `${this.season.manager.name || 'Manager'} · ${t.full}` : 'Create your manager, choose a team, sign the contract.', go: () => (this.season ? this.go('office') : this.go('manager')) },
      { main: true, title: 'Time trial', desc: 'Your team\'s livery on every circuit, against the clock.', go: () => this.go('tt') },
      { main: true, title: 'Free play', desc: 'Any circuit, any car, any weather.', go: () => { this.hide(); this.onFreePlay(); } },
      ...(this.season ? [{ title: 'New season', desc: 'Start again: a new manager and a new team.', go: () => { this.season = null; save(null); this.go('manager'); } }] : []),
      { title: `Favourite team: ${t.name}`, desc: 'Your colours on the menu, your livery in the time trial.', go: () => this.go('fav') },
      ...(this.weather ? [{ title: `Weather: ${this.weather.get() ? 'wet' : 'dry'}`, desc: 'Dry or wet track for your next session.', go: () => { this.weather.toggle(); this.mainMenu(); } }] : []),
      { title: 'Controls', desc: 'Keys for driving, cameras and menus.', go: () => panel(`<b>CONTROLS</b><div class="keys">${document.querySelector('#help .keys')?.innerHTML ?? ''}</div>`) },
      { title: 'Credits', desc: 'The circuit photographs and their licences.', go: () => panel(`<b>PHOTO CREDITS</b><ol style="padding-left:18px;margin:8px 0 0;max-height:60vh;overflow:auto">${Object.entries(PHOTOS).map(([id, ph]) => `<li><span>${this.tracks.find((x) => x.id === id)?.name ?? id}</span><b style="font-weight:400;font-size:11px">${ph.author} · ${ph.license}</b></li>`).join('')}</ol>`) },
    ];
    this.mode = Math.min(this.mode, items.length - 1);
    const main = this.q('.mm-main'), sub = this.q('.mm-sub');
    main.innerHTML = ''; sub.innerHTML = '';
    const pick = (k) => {
      this.mode = k;
      [...main.children, ...sub.children].forEach((el, i) => el.classList.toggle('on', i === k));
      this.q('.mm-desc').textContent = items[k].desc;
    };
    items.forEach((it, k) => {
      const b = document.createElement('button');
      b.textContent = it.title;
      if (it.badge) b.insertAdjacentHTML('beforeend', '<u>!</u>');
      b.addEventListener('pointerenter', () => pick(k));
      b.addEventListener('click', () => { pick(k); it.go(); });
      (it.main ? main : sub).appendChild(b);
    });
    pick(this.mode);
    this.onStep = (d) => pick((this.mode + d + items.length) % items.length);
    if (this.stage?.which !== 'cine' || this.stage.cineTeam !== mt) this.setScene('cine', 1 + this.liveryIndex(mt));
  }

  managerScreen() {
    this.frame({ tag: 'Season', title: 'Create your manager', sub: 'Your look in the paddock', big: this.manager.name || 'Manager',
      hints: [['b', 'Back', () => this.go('main')], ['a', 'Choose a team', () => this.go('teams')]] });
    this.setLook({ a: '#f0425a', b: '#1b1b20' });
    this.q('.cards').style.display = 'none';
    const card = this.q('.card');
    card.style.height = '66%';
    card.innerHTML = `<h3>Name</h3><input class="name" maxlength="20" placeholder="Your name">
      <h3>Skin tone</h3><div class="sw" data-k="skin"></div><h3>Hair</h3><div class="chips" data-k="hair"></div>
      <h3>Hair colour</h3><div class="sw" data-k="hairCol"></div><h3>Facial hair</h3><div class="chips" data-k="facial"></div>
      <h3>Glasses</h3><div class="chips" data-k="glasses"></div><h3>Suit</h3><div class="sw" data-k="suit"></div><h3>Tie</h3><div class="sw" data-k="tie"></div>`;
    const name = card.querySelector('input.name');
    name.value = this.manager.name;
    name.addEventListener('input', () => { this.manager.name = name.value; this.q('.bigname').textContent = name.value || 'Manager'; });
    const opts = {
      skin: Object.values(SKIN), hairCol: Object.values(HAIR), suit: ['#1d2230', '#0f1014', '#3a3f4a', '#2a3a5a', '#4a2a2a', '#d8d4cc', '#264034'],
      tie: ['#8a1a22', '#1a3a8a', '#141416', '#c8a85a', '#2a6a3a', '#ff8000'], hair: ['short', 'buzz', 'quiff', 'curly', 'long', 'braids', 'mullet', 'bald'],
      facial: ['none', 'stubble', 'beard', 'moustache'], glasses: [false, true],
    };
    for (const box of card.querySelectorAll('[data-k]')) {
      const k = box.dataset.k;
      for (const v of opts[k]) {
        const b = document.createElement('button');
        if (box.classList.contains('sw')) b.style.background = v; else b.textContent = v === true ? 'Yes' : v === false ? 'No' : v;
        b.classList.toggle('on', this.manager[k] === v);
        b.addEventListener('click', () => { this.manager[k] = v; box.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); this.setScene('manager'); });
        box.appendChild(b);
      }
    }
    this.setScene('manager');
  }

  /** Choosing a team: for the season (then the contract), or the favourite (first launch, or from the menu). */
  teamScreen(favourite = false) {
    let cur = favourite ? Math.max(0, this.fav) : this.team;
    const confirm = () => {
      if (!favourite) return this.go('contract');
      this.fav = this.ttTeam = cur;
      try { localStorage.setItem(FAV, TEAMS[cur].id); } catch { /* storage off */ }
      this.go('main');
    };
    const show = (k) => {
      cur = k;
      if (!favourite) this.team = k;
      const t = TEAMS[k];
      this.frame({ tag: favourite ? 'Welcome' : 'Season', title: favourite ? 'Choose your favourite team' : 'Choose your team', sub: t.full, big: t.name,
        hints: [...(favourite && this.fav < 0 ? [] : [['b', 'Back', () => this.go(favourite ? 'main' : 'manager')]]), ['a', favourite ? 'Confirm' : 'Sign the contract', confirm]] });
      this.setLook({ a: t.colours[0], b: t.colours[1], art: teamArt(t) });
      const card = this.q('.card');
      card.style.height = '50%';
      card.innerHTML = `<img class="tlogo" alt="${t.name}" src="${t.logo}" style="background:${t.logoBg}"><div class="tline">${t.colours.map((c) => `<i style="background:${c}"></i>`).join('')}</div>
        <div class="stats" style="margin-top:0">
          <div><span>Team</span><b>${t.full}</b></div><div><span>Base</span><b>${t.base}</b></div>
          <div><span>Team principal</span><b>${t.principal.name}</b></div><div><span>Car</span><b>2026 · ${t.name}</b></div>
          <div><span>Driver</span><b>${t.drivers[0].name}</b></div><div><span>Driver</span><b>${t.drivers[1].name}</b></div>
        </div>`;
      this.markCard(k, items);
      this.setScene('team', k);
    };
    const items = TEAMS.map((t) => ({ title: t.name, logo: t.logo, logoBg: t.logoBg, draw: (c, on) => drawTeamMark(c, t, on) }));
    this.cardsRow(items, cur, show);
    this.onStep = (d) => show((cur + d + TEAMS.length) % TEAMS.length);
    show(cur);
  }

  /** The manager's office: the season's home. Click the computer (or A) to open the season hub. */
  officeScreen(back = false) {
    const t = TEAMS[Math.max(0, TEAMS.findIndex((x) => x.id === this.season?.team))];
    const round = Math.min(this.season?.round ?? 0, CALENDAR.length - 1), nextId = CALENDAR[round][0];
    this.el.classList.add('officemode');
    this.el.style.setProperty('--a', t.colours[0]);
    this.el.style.setProperty('--ink', contrast(t.colours[0]));
    this.frame({ tag: `Round ${round + 1} of ${CALENDAR.length}`, title: t.full, sub: `${this.season?.manager?.name || 'Manager'} · Next: ${GP[nextId] ?? ''} Grand Prix`,
      hints: [['a', 'Use the computer', () => this.openComputer()], ['b', 'Main menu', () => this.go('main')]] });
    this.q('.card').style.display = 'none';
    this.q('.cards').style.display = 'none';
    if (this.stage?.which !== 'office') this.setScene('office');
    const S = this.stage;
    if (S?.office) {
      const { desk, screen } = S.office.views;
      if (back) { this.placeCamera(screen); this.tweenCamera(desk, 1.0); } else if (!S.tween) this.placeCamera(desk);
    }
  }

  /** The race weekend's screens (built on first use). */
  wk() {
    return (this.wkScreens ??= weekendScreens(this, { trackImage, turns: TURNS, calendar: CALENDAR, contrast, gpName: (id) => (GP[id] ? `${GP[id]} Grand Prix` : id) }));
  }
  saveSeason() { save(this.season); }
  /** The garage: glide into the player's monitor, then open the weekend on it. */
  openMonitor() {
    const S = this.stage;
    if (!S?.garage) { this.go('monitor'); return; }
    if (S.tween) return;
    this.tweenCamera(S.garage.views.screen, 0.8, () => this.go('monitor'));
  }
  closeMonitor() { this.go('garage', 'back'); }

  /** Glide into the monitor, then open the season hub. */
  openComputer() {
    const S = this.stage;
    if (!S?.office) { this.go('hub', 'home'); return; }
    if (S.tween) return;
    S.tween = { pending: true }; // no second click while the password goes in
    S.office.unlock(() => { S.tween = null; this.tweenCamera(S.office.views.screen, 0.9, () => this.go('hub', 'home')); });
  }

  placeCamera(v) {
    const c = this.stage.camera;
    c.position.copy(v.pos); c.fov = v.fov; c.updateProjectionMatrix(); c.lookAt(v.look);
    this.stage.look = v.look.clone();
  }
  tweenCamera(to, seconds, done = null) {
    const S = this.stage, c = S.camera;
    S.tween = { t: 0, d: seconds, p0: c.position.clone(), l0: (S.look ?? to.look).clone(), f0: c.fov, to, done };
  }

  contractScreen(already = false) {
    const t = TEAMS[this.team];
    this.screen = 'contract';
    this.frame({ tag: 'Season', title: 'Sign the contract', sub: `${t.full} · Team manager agreement`, big: '',
      hints: [['b', 'Back', () => this.go(already ? 'main' : 'teams')]] });
    this.setLook({ a: t.colours[0], b: t.colours[1] });
    this.q('.card').style.display = 'none';
    this.q('.cards').style.display = 'none';
    this.setScene('contract');
    if (already) this.finishContract(true);
  }

  ttScreen() {
    const pickTrack = (k) => {
      const n = this.ttTracks.length;
      this.ttTrack = ((k % n) + n) % n;
      const { t } = this.ttTracks[this.ttTrack];
      const lt = TEAMS[this.ttTeam];
      this.frame({ tag: 'Time trial', title: 'Select event', sub: `${GP[t.id] ? GP[t.id] + ' Grand Prix' : t.name}`, big: t.country ?? t.name,
        hints: [['x', 'Livery: ' + lt.name, () => { this.ttTeam = (this.ttTeam + 1) % TEAMS.length; pickTrack(this.ttTrack); this.setScene('car', 1 + this.liveryIndex(this.ttTeam)); }],
          ['y', 'View leaderboard', () => this.q('.board').classList.toggle('on')], ['a', 'Start session', () => { this.hide(); this.onTimeTrial(this.ttTracks[this.ttTrack].i, this.f26, 1 + this.liveryIndex(this.ttTeam)); }], ['b', 'Back', () => this.go('main')]] });
      this.setLook({ a: lt.colours[0], b: lt.colours[1], track: t });
      const best = topTimes(t.id);
      const card = this.q('.card');
      card.style.height = '41%';
      card.innerHTML = `<canvas class="outline" width="640" height="260"></canvas><div class="stats">
        <div><span>Turns</span><b>${TURNS[t.id] ?? '—'}</b></div><div><span>Circuit length</span><b>${(t.layout.length / 1000).toFixed(3)}km/ ${(t.layout.length / 1609.34).toFixed(3)} miles</b></div>
        <div><span>Track difficulty</span><b>${DIFFICULTY[t.id] ?? 'Medium'}</b></div><div><span>Lap record</span><b>${best[0] ? formatTime(best[0].time) : 'N/A'}</b></div>
        <div><span>Lap record holder</span><b>${best[0] ? `${this.manager.name || 'You'}` : 'N/A'}</b></div></div>`;
      drawOutline(card.querySelector('canvas'), t.layout, '#ffffff', 9, true);
      this.q('.board').innerHTML = `<b>${(t.country ?? t.name).toUpperCase()} · TOP TIMES</b><ol style="padding-left:18px;margin:8px 0 0">${best.slice(0, 10).map((e) => `<li><span>${e.carName ?? e.car ?? ''}</span><b>${formatTime(e.time)}</b></li>`).join('') || '<li>No laps yet</li>'}</ol>`;
      this.markCard(this.ttTrack, items);
    };
    const items = this.ttTracks.map(({ t }) => ({ title: cardTitle(t, this.ttTracks), draw: (c, on) => drawOutline(c, t.layout, on ? '#ffffff' : '#8d8f96', 6) }));
    this.cardsRow(items, this.ttTrack, pickTrack, { hover: true });
    this.onStep = (d) => pickTrack(this.ttTrack + d);
    pickTrack(this.ttTrack);
    this.setScene('car', 1 + this.liveryIndex(this.ttTeam));
  }

  liveryIndex(teamIdx) { return Math.max(0, LIVERIES.findIndex(([id]) => id === TEAMS[teamIdx].livery)); }

  // ------------------------------------------------------------------------------------- 3D stage
  initStage() {
    if (this.stage) return;
    let renderer;
    try { renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true }); } catch { this.stage = { failed: true }; return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    const scene = new Scene();
    const camera = new PerspectiveCamera(26, 1, 0.05, 200);
    scene.add(new HemisphereLight(0xeef2ff, 0x201814, 1.3));
    const key = new DirectionalLight(0xfff2e0, 3.0);
    key.position.set(-3, 8, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
    const rim = new DirectionalLight(0xffffff, 1.4);
    rim.position.set(6, 3, -4);
    scene.add(key, rim);
    const hemi = scene.children[0];
    // An invisible floor that only catches the car's shadow (the frame's art shows through).
    const floor = new Mesh(new CircleGeometry(14, 48).rotateX(-Math.PI / 2), new ShadowMaterial({ opacity: 0.55 }));
    floor.receiveShadow = true;
    scene.add(floor);
    this.stage = { renderer, scene, camera, group: null, people: [], lights: { hemi, key, rim }, floor };
  }

  /** A car in a livery, settled on its suspension, scaled to real size (~5.6 m long). */
  makeCar(paintIdx) {
    const spec = this.cars[this.f26];
    const v = new Vehicle({ heightAt: () => 0 }, spec);
    for (let i = 0; i < 240; i++) v.step(1 / 240, { throttle: 0, brake: 0, steer: 0, handbrake: 1 });
    const visual = new CarVisual(spec, spec.paints[paintIdx] ?? spec.paints[0], v.modelOffset);
    visual.root.position.copy(v.body.position);
    visual.root.quaternion.copy(v.body.quaternion);
    visual.update(v, 0);
    const g = new Group();
    g.add(visual.root);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const box = new Box3().setFromObject(g), size = box.getSize(new Vector3());
    const k = 5.6 / Math.max(size.x, size.z);
    g.scale.setScalar(k);
    g.position.y = -box.min.y * k;
    g.userData.head = visual.head;
    return g;
  }

  setScene(which, paint) {
    const S = this.stage;
    if (!S || S.failed) return;
    if (S.group) S.scene.remove(S.group);
    const g = (S.group = new Group());
    S.scene.add(g);
    S.people = [];
    S.turn = null;
    S.which = which;
    S.cine?.environment.dispose();
    S.cine = null;
    S.office = null; S.garage = null; S.tween = null; S.hot = false;
    this.canvas.classList.remove('hot');
    this.contract = null;
    const cam = S.camera;
    // The studio scenes' defaults (the cinematic changes them).
    cam.clearViewOffset(); cam.fov = 26; cam.updateProjectionMatrix();
    S.scene.environment = null;
    Object.assign(S.lights.hemi, { intensity: 1.3 }); S.lights.key.intensity = 3; S.lights.rim.intensity = 1.4; S.floor.visible = true;
    this.q('.fader').style.opacity = 0;
    if (which === 'cine') {
      const mt = this.fav >= 0 ? this.fav : this.team, t = TEAMS[mt];
      S.lights.hemi.intensity = 0.06; S.lights.key.intensity = 0; S.lights.rim.intensity = 0; S.floor.visible = false;
      // The team's driver in the race suit, hands together, beside the car.
      const driver = buildPerson(t.drivers[0], { kind: 'race', main: t.colours[0], accent: t.colours[1], patch: t.colours[2] });
      setPose(driver, 'clasp');
      S.people = [driver];
      S.cine = buildCinematic(g, this.makeCar(paint), { a: t.colours[0], b: t.colours[1] }, S.renderer, driver);
      S.scene.environment = S.cine.environment;
      S.cineTeam = mt;
    }
    if (which === 'car') {
      // The car on the right over the colour block, nose towards the viewer and to the left (as in F1 menus).
      const car = this.makeCar(paint);
      const holder = new Group();
      holder.add(car);
      holder.rotation.y = CAR_YAW;
      g.add(holder);
      S.turn = holder;
      S.turnBase = holder.rotation.y;
      cam.position.set(0, 2.6, 16);
      cam.lookAt(-3.2, 0.3, 0);
    } else if (which === 'manager') {
      const m = this.manager, person = buildPerson(m, { kind: 'suit', main: m.suit, accent: m.tie });
      g.add(person);
      S.people = [person];
      S.turn = person;
      S.turnBase = -0.25;
      cam.position.set(0, 1.25, 5.6);
      cam.lookAt(-1.45, 1.0, 0);
    } else if (which === 'team') {
      const ti = paint ?? this.team, t = TEAMS[ti];
      const car = this.makeCar(1 + this.liveryIndex(ti));
      const holder = new Group();
      holder.add(car);
      holder.rotation.y = CAR_YAW;
      holder.position.set(-0.2, 0, -2.2);
      g.add(holder);
      const suit = (k) => ({ kind: 'race', main: t.colours[0], accent: t.colours[k] ?? '#ffffff' });
      const light = (c) => new Color(c).getHSL({}).l > 0.85;
      const polo = { kind: 'polo', main: light(t.colours[0]) ? t.colours[1] : t.colours[0], accent: t.colours[2] ?? '#fff' };
      const d1 = buildPerson(t.drivers[0], suit(1)), d2 = buildPerson(t.drivers[1], suit(2)), tp = buildPerson(t.principal, polo);
      d1.position.set(-3.2, 0, 1.4); d1.rotation.y = 0.4;
      tp.position.set(-1.3, 0, 2.2); tp.rotation.y = 0.15;
      d2.position.set(0.7, 0, 1.6); d2.rotation.y = -0.25;
      g.add(d1, d2, tp);
      S.people = [d1, d2, tp];
      cam.position.set(0.6, 1.6, 12.5);
      cam.lookAt(-2.6, 0.9, 0.5);
    } else if (which === 'contract') {
      this.buildDesk(g);
    } else if (which === 'office') {
      const ti = Math.max(0, TEAMS.findIndex((x) => x.id === this.season?.team)), t = TEAMS[ti];
      const nextId = CALENDAR[Math.min(this.season?.round ?? 0, CALENDAR.length - 1)][0], next = this.tracks.find((x) => x.id === nextId);
      S.lights.hemi.intensity = 0; S.lights.key.intensity = 0; S.lights.rim.intensity = 0; S.floor.visible = false;
      S.office = buildOffice(g, { team: t, manager: this.season?.manager ?? this.manager, trackLayout: next?.layout, nextName: `${GP[nextId] ?? ''} Grand Prix`, carModel: this.makeCar(1 + this.liveryIndex(ti)) });
      S.people = [S.office.manager];
    } else if (which === 'garage') {
      const ti = Math.max(0, TEAMS.findIndex((x) => x.id === this.season?.team)), t = TEAMS[ti];
      S.lights.hemi.intensity = 0; S.lights.key.intensity = 0; S.lights.rim.intensity = 0; S.floor.visible = false;
      S.garage = buildGarage(g, { team: t, carModel: this.makeCar(1 + this.liveryIndex(ti)) });
      S.people = S.garage.people;
    }
  }

  // ---------------------------------------------------------------------------------- contract
  buildDesk(g) {
    const S = this.stage, t = TEAMS[this.team];
    const wood = new MeshStandardMaterial({ color: 0x2e1e14, roughness: 0.45, metalness: 0.05 });
    const desk = new Mesh(new BoxGeometry(3.2, 0.08, 1.6), wood);
    desk.position.set(0, 0.95, 0);
    desk.receiveShadow = true;
    g.add(desk);
    const pc = document.createElement('canvas');
    pc.width = 768; pc.height = 1024;
    const tex = new CanvasTexture(pc);
    tex.colorSpace = SRGBColorSpace;
    const paper = new Mesh(new PlaneGeometry(0.62, 0.83), new MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    paper.rotation.x = -Math.PI / 2;
    paper.rotation.z = 0.06;
    paper.position.set(0, 0.995, 0.15);
    paper.receiveShadow = true;
    g.add(paper);
    const pen = new Group();
    const barrel = new Mesh(new CylinderGeometry(0.009, 0.007, 0.15, 10), new MeshStandardMaterial({ color: 0x141416, roughness: 0.25, metalness: 0.6 }));
    barrel.position.y = 0.075;
    const tip = new Mesh(new CylinderGeometry(0.007, 0.001, 0.025, 8), new MeshStandardMaterial({ color: 0xd8c27a, metalness: 0.9, roughness: 0.2 }));
    tip.position.y = -0.012;
    pen.add(barrel, tip);
    pen.rotation.z = -0.55;
    g.add(pen);
    const light = (c) => new Color(c).getHSL({}).l > 0.85;
    const tp = buildPerson(t.principal, { kind: 'polo', main: light(t.colours[0]) ? t.colours[1] : t.colours[0], accent: t.colours[2] ?? '#fff' });
    tp.position.set(-0.4, 0, -1.25);
    g.add(tp);
    S.people = [tp];
    S.camera.position.set(1.25, 2.25, 2.9);
    S.camera.lookAt(-0.25, 1.3, -0.5);
    this.contract = { pc, tex, pen, t: 0, done: false };
    this.drawPaper(0);
  }

  drawPaper(progress) {
    const { pc, tex } = this.contract, g = pc.getContext('2d'), t = TEAMS[this.team], W = pc.width;
    g.fillStyle = '#f6f3ec'; g.fillRect(0, 0, W, pc.height);
    g.fillStyle = t.colours[0]; g.fillRect(0, 0, W, 120);
    g.fillStyle = t.colours[1]; g.fillRect(0, 120, W, 10);
    g.fillStyle = contrast(t.colours[0]); g.font = '900 44px "Titillium Web", Arial, sans-serif'; g.textAlign = 'left';
    g.fillText(t.full.toUpperCase(), 40, 78, W - 80);
    g.fillStyle = '#16181e'; g.font = '900 32px "Titillium Web", Arial, sans-serif';
    g.fillText('TEAM MANAGER AGREEMENT', 40, 200);
    g.font = '19px Georgia, serif'; g.fillStyle = '#3a3e48';
    const name = this.manager.name || 'The Manager';
    [`This agreement is made between ${t.full}`, `("the Team"), ${t.base}, and ${name}`, '("the Manager") for the 2026 FIA Formula One', 'World Championship season.', '',
      '1. The Manager leads the Team\'s race operations', '   at every Grand Prix of the season.', '2. The Team provides two cars and two drivers:', `   ${t.drivers[0].name} and ${t.drivers[1].name}.`, '3. Term: one season, with an option to extend.', '', `For the Team: ${t.principal.name}, Team Principal`]
      .forEach((l, k) => g.fillText(l, 40, 250 + k * 34, W - 80));
    g.strokeStyle = '#16181e'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(40, 900); g.lineTo(W - 40, 900); g.stroke();
    g.font = '15px Arial'; g.fillStyle = '#6a6e78'; g.fillText('SIGNATURE OF THE MANAGER', 40, 924);
    if (progress > 0) {
      g.save();
      g.beginPath(); g.rect(40, 800, (W - 80) * progress, 110); g.clip();
      g.fillStyle = '#1a2a6a'; g.font = 'italic 64px "Brush Script MT", "Segoe Script", "Snell Roundhand", cursive';
      g.fillText(name, 60, 885, W - 140);
      g.restore();
    }
    tex.needsUpdate = true;
  }

  finishContract(already = false) {
    const t = TEAMS[this.team];
    if (!already) { this.season = { manager: { ...this.manager }, team: t.id, round: 0 }; save(this.season); }
    if (this.contract) { this.contract.done = true; this.drawPaper(1); }
    this.q('.signed p').textContent = `Welcome to ${t.full}, ${this.manager.name || 'Manager'}. First race: Australia.`;
    this.q('.signed').classList.add('on');
    this.frame({ tag: 'Season', title: t.full, sub: `Team manager · ${this.manager.name || 'Manager'}`, big: '',
      hints: [['b', 'Main menu', () => this.go('main')], ['a', 'To the office', () => this.go('office')]] });
    this.q('.signed').classList.add('on');
  }

  // --------------------------------------------------------------------------------------- frame
  update(dt) {
    if (!this.visible || !this.stage || this.stage.failed) return;
    this.time += dt;
    const S = this.stage, r = S.renderer;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (this.canvas.width !== Math.round(w * r.getPixelRatio()) || this.canvas.height !== Math.round(h * r.getPixelRatio())) { r.setSize(w, h, false); S.camera.aspect = w / h; S.camera.updateProjectionMatrix(); }
    if (S.cine) { S.cine.update(dt, S.camera, w, h); this.q('.fader').style.opacity = S.cine.fade.toFixed(3); }
    this.tick?.(dt);
    if (S.turn) S.turn.rotation.y = S.turnBase + Math.sin(this.time * 0.3) * 0.08 + this.spin;
    for (const p of S.people) animatePerson(p, dt);
    const C = this.contract;
    if (C && !C.done) {
      C.t += dt;
      const prog = Math.min(1, Math.max(0, (C.t - 1.0) / 2.4));
      this.drawPaper(prog);
      const u = 0.08 + prog * 0.8, v = 0.83, px = (u - 0.5) * 0.62, pz = (v - 0.5) * 0.83, c = Math.cos(0.06), s = Math.sin(0.06);
      const lift = prog > 0 && prog < 1 ? Math.abs(Math.sin(C.t * 22)) * 0.01 : 0.05;
      C.pen.position.set(px * c + pz * s, 1.012 + lift, 0.14 + (-px * s + pz * c));
      if (C.t > 3.8) this.finishContract();
    }
    // The office camera: glides between views, otherwise drifts gently round the desk view.
    const cam = S.camera;
    if (S.tween && !S.tween.pending) {
      const T = S.tween;
      T.t += dt;
      const u = Math.min(1, T.t / T.d), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      cam.position.lerpVectors(T.p0, T.to.pos, e);
      S.look = T.l0.clone().lerp(T.to.look, e);
      cam.fov = T.f0 + (T.to.fov - T.f0) * e; cam.updateProjectionMatrix();
      cam.lookAt(S.look);
      if (u >= 1) { S.tween = null; T.done?.(); }
    } else if (!S.tween && ((S.office && this.el.classList.contains('officemode')) || (S.garage && this.screen === 'garage'))) {
      const v = (S.office ?? S.garage).views.desk, k = this.time;
      cam.position.set(v.pos.x + Math.sin(k * 0.13) * 0.12, v.pos.y + Math.sin(k * 0.21) * 0.03, v.pos.z + Math.cos(k * 0.11) * 0.06);
      cam.lookAt(v.look); S.look = v.look.clone();
    }
    // A hub page covers the stage (except the team page): don't draw under it.
    if (this.el.classList.contains('hubmode') && !this.el.classList.contains('hub-team')) return;
    r.render(S.scene, S.camera);
  }
}

// ------------------------------------------------------------------------------------------- art
/** A circuit's picture: its real photo, else its painted cover art. */
const trackImage = (t) => (PHOTOS[t.id] ? `assets/tracks/${t.id}.jpg` : coverArt(t));
const artCache = new Map();
/** The circuit's cover art as a picture for the middle panel. */
function coverArt(t) {
  if (artCache.has(t.id)) return artCache.get(t.id);
  const c = document.createElement('canvas');
  c.width = 1280; c.height = 720;
  let url = null;
  try { drawCover(c, t, 4, { bare: true, map: false }); url = c.toDataURL('image/jpeg', 0.85); } catch { /* no art */ }
  artCache.set(t.id, url);
  return url;
}
/** A team's panel picture: its colours in big diagonal bands, the name faint across them. */
function teamArt(t) {
  const c = document.createElement('canvas');
  c.width = 1280; c.height = 720;
  const g = c.getContext('2d');
  g.fillStyle = '#121216'; g.fillRect(0, 0, 1280, 720);
  t.colours.forEach((col, k) => { g.fillStyle = col; g.globalAlpha = 0.55 - k * 0.12; g.beginPath(); g.moveTo(300 + k * 260, 0); g.lineTo(700 + k * 260, 0); g.lineTo(400 + k * 260, 720); g.lineTo(0 + k * 260, 720); g.fill(); });
  return c.toDataURL('image/jpeg', 0.85);
}

/** A circuit's outline from its layout, fitted into a canvas (with sector numbers on the big one). */
function drawOutline(canvas, L, colour, width, sectors = false) {
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  g.clearRect(0, 0, W, H);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < L.N; i++) { x0 = Math.min(x0, L.x[i]); x1 = Math.max(x1, L.x[i]); z0 = Math.min(z0, L.z[i]); z1 = Math.max(z1, L.z[i]); }
  const pad = width * 2 + (sectors ? 24 : 6), k = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (z1 - z0));
  const ox = (W - (x1 - x0) * k) / 2, oz = (H - (z1 - z0) * k) / 2;
  const P = (i) => [ox + (L.x[i % L.N] - x0) * k, oz + (L.z[i % L.N] - z0) * k];
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i <= L.N; i += 2) { const [X, Y] = P(i); if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y); }
  g.closePath();
  g.strokeStyle = colour; g.lineWidth = width; g.stroke();
  g.strokeStyle = '#0006'; g.lineWidth = Math.max(1, width * 0.35); g.stroke();
  if (sectors) {
    g.fillStyle = '#fff'; g.font = '900 30px "Titillium Web", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const cx = W / 2, cy = H / 2;
    for (const [n, f] of [[1, 0.02], [2, 0.36], [3, 0.7]]) {
      const [X, Y] = P(Math.floor(f * L.N)), dx = X - cx, dy = Y - cy, d = Math.hypot(dx, dy) || 1;
      g.fillText(String(n), X + (dx / d) * 30, Y + (dy / d) * 30);
    }
  }
}

/** Card art for a team: its colours as a slanted badge. */
function drawTeamMark(c, t, on) {
  const g = c.getContext('2d'), W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);
  t.colours.forEach((col, k) => { g.fillStyle = col; g.beginPath(); const x = W * 0.2 + k * 70; g.moveTo(x + 40, H * 0.2); g.lineTo(x + 100, H * 0.2); g.lineTo(x + 60, H * 0.9); g.lineTo(x, H * 0.9); g.fill(); });
  if (on) { g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(W * 0.16, H * 0.14, W * 0.68, H * 0.82); }
}

/** A circuit card's title: the country, or the city where a country has more than one race. */
const CITY = { cota: 'Austin', miami: 'Miami', vegas: 'Las Vegas', catalunya: 'Barcelona', madring: 'Madrid' };
const cardTitle = (t, all) => (all.filter(({ t: o }) => o.country === t.country).length > 1 ? CITY[t.id] ?? t.name : t.country ?? t.name);
const contrast = (hex) => { const c = new Color(hex); return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b > 0.55 ? '#0b0c10' : '#ffffff'; };
function load() { try { return JSON.parse(localStorage.getItem(SAVE)); } catch { return null; } }
function save(v) { try { localStorage.setItem(SAVE, JSON.stringify(v)); } catch { /* storage off */ } }
