import { TEAMS } from './teams.js';

/*
 * The season hub: the career mode's home between races. Styled like a modern sports game's menus: a
 * full-bleed background in the team's colour with soft sweeps of light, a top bar of condensed tabs
 * between LB / RB bumpers (the active tab a light pill), a header line, then pages of slick
 * rectangular tiles and airy tables:
 *   home       tiles: the next race (circuit photo), the calendar, the standings, the team
 *   calendar   the 2026 calendar as photo tiles
 *   standings  drivers' and constructors' championships
 *   team       the 3D line-up (car, drivers, principal) beside the team's details
 * Keys: Q / E (LB / RB) change tab, arrows move between tiles, Enter (A) opens one.
 */
// The 2026 calendar: [track id, dates, city].
export const CALENDAR = [
  ['australia', '6–8 Mar', 'Melbourne'], ['china', '13–15 Mar', 'Shanghai'], ['suzuka', '27–29 Mar', 'Suzuka'], ['bahrain', '10–12 Apr', 'Sakhir'],
  ['jeddah', '17–19 Apr', 'Jeddah'], ['miami', '1–3 May', 'Miami'], ['canada', '22–24 May', 'Montréal'], ['monaco', '5–7 Jun', 'Monte Carlo'],
  ['catalunya', '12–14 Jun', 'Barcelona'], ['austria', '26–28 Jun', 'Spielberg'], ['silverstone', '3–5 Jul', 'Silverstone'], ['spa', '17–19 Jul', 'Spa-Francorchamps'],
  ['hungaroring', '24–26 Jul', 'Budapest'], ['zandvoort', '21–23 Aug', 'Zandvoort'], ['monza', '4–6 Sep', 'Monza'], ['madring', '11–13 Sep', 'Madrid'],
  ['baku', '24–26 Sep', 'Baku'], ['singapore', '9–11 Oct', 'Singapore'], ['cota', '23–25 Oct', 'Austin'], ['mexico', '30 Oct–1 Nov', 'Mexico City'],
  ['interlagos', '6–8 Nov', 'São Paulo'], ['vegas', '19–21 Nov', 'Las Vegas'], ['qatar', '27–29 Nov', 'Lusail'], ['yas', '4–6 Dec', 'Abu Dhabi'],
];
const TABS = [['home', 'Home'], ['calendar', 'Calendar'], ['standings', 'Standings'], ['team', 'Team']];

const CSS = `
#front.hubmode .photo,#front.hubmode .block,#front.hubmode .streaks,#front.hubmode .bigname,#front.hubmode .hd,#front.hubmode .card,#front.hubmode .cards,#front.hubmode .credit,#front.hubmode .brand{display:none}
#front.hubmode{background:var(--hubbg)}
#front.hubmode canvas.stage{opacity:0;pointer-events:none}
#front.hubmode.hub-team canvas.stage{opacity:1;pointer-events:auto}
#front .hub{position:absolute;inset:0;display:none;flex-direction:column;font-family:Barlow,"Helvetica Neue",Arial,sans-serif;color:#fff;overflow:hidden;--cond:"Barlow Condensed","Arial Narrow",Arial,sans-serif}
#front.hubmode .hub{display:flex}
#front .hub::before{content:'';position:absolute;inset:-20%;pointer-events:none;background:radial-gradient(60% 50% at 78% 18%,#ffffff26,transparent 70%),radial-gradient(40% 40% at 8% 92%,#00000040,transparent 70%)}
#front .hub::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(118deg,transparent 38%,#ffffff12 46%,transparent 47%,transparent 58%,#ffffff0c 66%,transparent 67%)}
#front .hub > *{position:relative;z-index:1}
#front.hubmode.hub-team .hub{pointer-events:none}
#front.hubmode.hub-team .hub-top,#front.hubmode.hub-team .hub-panel{pointer-events:auto}
.hub-top{display:flex;align-items:center;gap:10px;height:70px;padding:0 3vw}
.hub-bump{font:700 12px/1 var(--cond);letter-spacing:.06em;color:#fff;border:2px solid #ffffffc0;border-radius:7px;padding:4px 7px;background:#00000026;cursor:pointer}
.hub-tabs{display:flex;gap:4px}
.hub-tabs button{background:none;border:0;border-radius:6px;color:#ffffffb8;font:700 27px/1 var(--cond);text-transform:uppercase;letter-spacing:.01em;padding:7px 14px 6px;cursor:pointer;transition:background .15s,color .15s}
.hub-tabs button:hover{color:#fff;background:#ffffff14}
.hub-tabs button.on{background:#eef0f4;color:#14161c;box-shadow:0 4px 18px #0004}
.hub-info{margin-left:auto;display:flex;align-items:center;gap:16px;font:700 22px/1 var(--cond);text-transform:uppercase;letter-spacing:.02em}
.hub-info span{opacity:.92}.hub-info i{width:1px;height:24px;background:#ffffff50}
.hub-info small{font:600 13px var(--cond);letter-spacing:.12em;opacity:.7;margin-right:6px}
.hub-head{display:flex;align-items:center;gap:16px;padding:14px 3vw 22px}
.hub-plate{height:58px;min-width:96px;padding:6px 12px;border-radius:8px;box-sizing:border-box;display:grid;place-items:center;box-shadow:0 6px 20px #0003}
.hub-plate img{max-height:44px;max-width:150px;object-fit:contain}
.hub-head small{display:block;font:600 17px/1 var(--cond);letter-spacing:.06em;text-transform:uppercase;opacity:.85}
.hub-head b{display:block;font:800 44px/1 var(--cond);text-transform:uppercase;letter-spacing:.005em;margin-top:4px}
.hub-page{flex:1;min-height:0;padding:0 3vw 24px;margin-bottom:58px;overflow:auto;scrollbar-width:thin}
.hub-tiles{display:grid;grid-template-columns:2.1fr 1fr 1fr;grid-template-rows:1fr 1fr;gap:16px;height:100%;min-height:380px}
.hub-tile{position:relative;border:0;border-radius:6px;overflow:hidden;cursor:pointer;text-align:left;color:#fff;padding:0;background:#0003 center/cover no-repeat;box-shadow:0 10px 30px #0004;outline:3px solid transparent;outline-offset:3px;transition:transform .18s,outline-color .18s,box-shadow .18s}
.hub-tile::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#0000 35%,#000a 100%)}
.hub-tile.art{background-image:var(--art)}
.hub-tile .t{position:absolute;left:22px;right:22px;bottom:18px}
.hub-tile small{display:block;font:700 15px/1 var(--cond);letter-spacing:.12em;text-transform:uppercase;opacity:.85;margin-bottom:6px}
.hub-tile b{display:block;font:800 clamp(28px,2.9vw,46px)/.92 var(--cond);text-transform:uppercase}
.hub-tile .t > span{display:block;margin-top:8px;font:500 14px/1.35 Barlow,Arial,sans-serif;opacity:.9}
.hub-tile.big b{font-size:clamp(40px,4.4vw,72px)}
.hub-tile:hover{transform:translateY(-2px)}
.hub-tile.on{outline-color:#fff;transform:translateY(-3px);box-shadow:0 18px 40px #0006}
.hub-tile .go{position:absolute;right:18px;top:16px;font:700 14px/1 var(--cond);letter-spacing:.1em;text-transform:uppercase;background:#eef0f4;color:#14161c;border-radius:5px;padding:6px 10px;opacity:0;transition:opacity .15s}
.hub-tile.on .go{opacity:1}
.hub-tile.big{grid-row:span 2}
.hub-tile.wide{grid-column:span 2}
.hub-cal{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
.hub-cal .hub-tile{height:150px}
.hub-cal .hub-tile b{font-size:28px}
.hub-cal .hub-tile.done{filter:grayscale(.85) brightness(.75)}
.hub-sub{display:flex;gap:26px;margin:0 0 14px}
.hub-sub button{background:none;border:0;color:#ffffffa0;font:600 20px var(--cond);text-transform:uppercase;letter-spacing:.03em;cursor:pointer;padding:0}
.hub-sub button.on{color:#fff;font-weight:800}
.hub-rows{display:grid;gap:6px;max-width:980px}
.hub-row{display:grid;grid-template-columns:60px 6px 1fr 200px 90px;align-items:center;gap:0 14px;height:52px;border-radius:5px;background:#ffffff14;font:600 17px Barlow,Arial,sans-serif;overflow:hidden}
.hub-row .p{height:100%;display:grid;place-items:center;background:#0000002e;font:800 20px var(--cond)}
.hub-row .c{height:26px;border-radius:2px}
.hub-row .n{font-weight:700}.hub-row .tm{opacity:.85;font-size:15px;display:flex;align-items:center;gap:8px}
.hub-row .tm img{height:20px;max-width:58px;object-fit:contain;padding:2px 5px;border-radius:3px}
.hub-row .pt{text-align:right;padding-right:18px;font:800 24px var(--cond)}
.hub-row.me{background:#ffffff2e;outline:2px solid #ffffffd0;outline-offset:-2px;box-shadow:0 8px 26px #0004}
.hub-head2{display:grid;grid-template-columns:60px 6px 1fr 200px 90px;gap:0 14px;font:600 15px var(--cond);text-transform:uppercase;letter-spacing:.08em;opacity:.75;padding:0 0 6px;max-width:980px}
.hub-head2 :first-child{text-align:center}.hub-head2 :last-child{text-align:right;padding-right:18px}
.hub-panel{width:min(420px,34vw);display:grid;gap:8px}
.hub-panel .hub-row{grid-template-columns:150px 1fr;padding:0 16px;gap:12px;height:56px}
.hub-panel .hub-row span{font:600 14px var(--cond);text-transform:uppercase;letter-spacing:.1em;opacity:.75}
#front.hubmode .hints{left:3vw;right:auto;bottom:16px}
#front.hubmode .hints button{font:700 19px/1 "Barlow Condensed","Arial Narrow",Arial,sans-serif;text-transform:uppercase;letter-spacing:.02em}
@media (max-width:900px){.hub-tiles{grid-template-columns:1fr 1fr}.hub-tile.big{grid-column:span 2;grid-row:auto;min-height:220px}.hub-tabs button{font-size:20px;padding:6px 8px}.hub-info{display:none}.hub-row,.hub-head2{grid-template-columns:44px 6px 1fr 70px}.hub-row .tm:not(.n){display:none}.hub-head2{display:none}}
`;

const lum = (hex) => { const v = parseInt(hex.slice(1), 16); return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255; };
const darken = (hex, k) => { const v = parseInt(hex.slice(1), 16); return `rgb(${((v >> 16) & 255) * k | 0},${((v >> 8) & 255) * k | 0},${(v & 255) * k | 0})`; };
/** The team's backdrop colour: its first colour dark enough to carry white text. */
const baseColour = (t) => t.colours.find((c) => lum(c) < 0.72) ?? '#1c1f26';
const artCache = new Map();
/** Tile art in the team's colours: a gradient with fine diagonal pinstripes and an accent edge. */
function tileArt(t, k) {
  const key = `${t.id}|${k}`;
  if (artCache.has(key)) return artCache.get(key);
  const c = document.createElement('canvas');
  c.width = 640; c.height = 400;
  const g = c.getContext('2d'), base = baseColour(t), acc = t.colours.find((x) => x !== base) ?? '#ffffff';
  const gr = g.createLinearGradient(0, 0, 640, 400);
  gr.addColorStop(0, darken(base, 1)); gr.addColorStop(1, darken(base, 0.45));
  g.fillStyle = gr; g.fillRect(0, 0, 640, 400);
  g.globalAlpha = 0.09; g.strokeStyle = '#fff'; g.lineWidth = 10;
  for (let x = -400 + k * 37; x < 1000; x += 46) { g.beginPath(); g.moveTo(x, 400); g.lineTo(x + 400, 0); g.stroke(); }
  g.globalAlpha = 0.9; g.fillStyle = acc; g.fillRect(0, 392, 640, 8);
  const url = c.toDataURL('image/jpeg', 0.85);
  artCache.set(key, url);
  return url;
}

let styled = false, keysBound = false;
/**
 * Renders the hub into the front end. fe: the Frontend (its DOM, stage and callbacks); helpers:
 * { trackImage(track), turns, gpName(id) }. sub: the standings page (0 drivers, 1 constructors).
 */
export function seasonHub(fe, helpers, tab = 'home', sub = 0) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); styled = true; }
  if (!keysBound) {
    keysBound = true;
    addEventListener('keydown', (e) => {
      if (!fe.visible || !fe.el.classList.contains('hubmode') || e.target.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'q' || k === 'e') { fe.hubBump?.(k === 'e' ? 1 : -1); e.preventDefault(); }
    });
  }
  const season = fe.season, teamIdx = Math.max(0, TEAMS.findIndex((t) => t.id === season.team)), t = TEAMS[teamIdx];
  const round = Math.min(season.round ?? 0, CALENDAR.length - 1);
  const trackOf = (id) => fe.tracks.find((x) => x.id === id);
  const el = fe.el, base = baseColour(t);
  el.classList.add('hubmode');
  el.classList.toggle('hub-team', tab === 'team');
  el.style.setProperty('--hubbg', `linear-gradient(118deg, ${darken(base, 0.95)} 0%, ${darken(base, 0.6)} 52%, ${darken(base, 0.28)} 100%)`);
  let hub = fe.q('.hub');
  if (!hub) { hub = document.createElement('div'); hub.className = 'hub'; el.insertBefore(hub, fe.q('.hints')); }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const name = season.manager?.name || 'Manager';
  const points = season.points ?? {};
  const drivers = TEAMS.flatMap((tm) => tm.drivers.map((d) => ({ name: d.name, team: tm, pts: points[d.name] ?? 0 })))
    .sort((a, b) => b.pts - a.pts || TEAMS.indexOf(a.team) - TEAMS.indexOf(b.team));
  const teams = TEAMS.map((tm) => ({ tm, pts: tm.drivers.reduce((s, d) => s + (points[d.name] ?? 0), 0) })).sort((a, b) => b.pts - a.pts || TEAMS.indexOf(a.tm) - TEAMS.indexOf(b.tm));
  const tpos = teams.findIndex((x) => x.tm === t) + 1, tpts = teams[tpos - 1].pts;
  const [nextId, dates, city] = CALENDAR[round], next = trackOf(nextId);
  const img = (id) => (trackOf(id) ? helpers.trackImage(trackOf(id)) : '');
  const goTab = (k, s2 = 0) => fe.go('hub', k, s2);

  const top = `<header class="hub-top">
      <button class="hub-bump" data-bump="-1">LB</button>
      <nav class="hub-tabs">${TABS.map(([k, label]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${label}</button>`).join('')}</nav>
      <button class="hub-bump" data-bump="1">RB</button>
      <div class="hub-info"><span><small>Round</small>${round + 1}/${CALENDAR.length}</span><i></i><span><small>Constructors</small>P${tpos} · ${tpts} pts</span><i></i><span>${esc(name)}</span></div>
    </header>
    <div class="hub-head"><div class="hub-plate" style="background:${t.logoBg}"><img alt="${esc(t.name)}" src="${t.logo}"></div>
      <div><small>2026 season · Round ${round + 1} · ${esc(dates)}</small><b>${esc(helpers.gpName(nextId))}</b></div></div>`;

  let page = '', tiles = [];
  const race = () => { fe.hide(); const ti = fe.tracks.findIndex((x) => x.id === nextId); fe.onSeasonRace(Math.max(0, ti), fe.f26, 1 + fe.liveryIndex(teamIdx), season); };
  if (tab === 'home') {
    tiles = [
      { cls: 'big', img: img(nextId), small: `Round ${round + 1} · ${dates}`, b: 'Race weekend', span: `${next?.name ?? ''} · ${city} · ${next?.layout ? (next.layout.length / 1000).toFixed(3) + ' km' : ''} · ${helpers.turns[nextId] ?? '—'} turns`, go: race, label: 'Start' },
      { cls: 'art', k: 1, small: `${CALENDAR.length} rounds`, b: 'Calendar', span: `Next: ${helpers.gpName(CALENDAR[Math.min(round + 1, CALENDAR.length - 1)][0])}`, go: () => goTab('calendar'), label: 'Open' },
      { cls: 'art', k: 2, small: `P${tpos} · ${tpts} pts`, b: 'Standings', span: 'Drivers and constructors', go: () => goTab('standings'), label: 'Open' },
      { cls: 'art wide', k: 3, small: t.full, b: 'Team', span: `${t.drivers[0].name} · ${t.drivers[1].name} · ${t.principal.name}`, go: () => goTab('team'), label: 'Open' },
    ];
    page = `<div class="hub-tiles">${tiles.map(tileHtml).join('')}</div>`;
  } else if (tab === 'calendar') {
    tiles = CALENDAR.map(([id, d, c], k) => ({ cls: k < round ? 'done' : '', img: img(id), small: `Round ${k + 1} · ${d}`, b: helpers.gpName(id).replace(' Grand Prix', ''), span: k === round ? 'Next race' : k < round ? 'Completed' : c, go: k === round ? race : null }));
    page = `<div class="hub-cal">${tiles.map(tileHtml).join('')}</div>`;
  } else if (tab === 'standings') {
    page = `<div class="hub-sub">${['Drivers', 'Constructors'].map((s, k) => `<button data-sub="${k}" class="${k === sub ? 'on' : ''}">${s}</button>`).join('')}</div>`;
    const plate = (tm) => `<img alt="" src="${tm.logo}" style="background:${tm.logoBg}">`;
    if (sub === 0) {
      page += `<div class="hub-head2"><span>Pos</span><span></span><span>Driver</span><span>Team</span><span>Pts</span></div><div class="hub-rows">${drivers.map((d, k) => `<div class="hub-row ${d.team === t ? 'me' : ''}"><span class="p">${k + 1}</span><span class="c" style="background:${d.team.colours[0]}"></span><span class="n">${esc(d.name)}</span><span class="tm">${plate(d.team)}${esc(d.team.name)}</span><span class="pt">${d.pts}</span></div>`).join('')}</div>`;
    } else {
      page += `<div class="hub-head2"><span>Pos</span><span></span><span>Team</span><span>Drivers</span><span>Pts</span></div><div class="hub-rows">${teams.map(({ tm, pts }, k) => `<div class="hub-row ${tm === t ? 'me' : ''}"><span class="p">${k + 1}</span><span class="c" style="background:${tm.colours[0]}"></span><span class="n tm">${plate(tm)}${esc(tm.full)}</span><span class="tm">${esc(tm.drivers.map((d) => d.name.split(' ').pop()).join(' · '))}</span><span class="pt">${pts}</span></div>`).join('')}</div>`;
    }
  } else if (tab === 'team') {
    page = `<div class="hub-panel">${[['Team principal', t.principal.name], ['Driver', t.drivers[0].name], ['Driver', t.drivers[1].name], ['Team manager', name], ['Base', t.base], ['Car', `2026 · ${t.name}`]]
      .map(([k, v]) => `<div class="hub-row"><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>`;
  }
  hub.innerHTML = top + `<main class="hub-page">${page}</main>`;

  // Wiring: tabs, bumpers, sub-pages, tiles (pointer and arrows).
  const k0 = TABS.findIndex(([x]) => x === tab);
  fe.hubBump = (d) => goTab(TABS[(k0 + d + TABS.length) % TABS.length][0]);
  hub.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => goTab(b.dataset.tab)));
  hub.querySelectorAll('[data-bump]').forEach((b) => b.addEventListener('click', () => fe.hubBump(+b.dataset.bump)));
  hub.querySelectorAll('[data-sub]').forEach((b) => b.addEventListener('click', () => goTab('standings', +b.dataset.sub)));
  const els = [...hub.querySelectorAll('.hub-tile')];
  let sel = tab === 'calendar' ? round : 0;
  const pick = (i) => { sel = i; els.forEach((x, j) => x.classList.toggle('on', j === i)); els[i]?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); };
  els.forEach((x, i) => { x.addEventListener('pointerenter', () => pick(i)); x.addEventListener('click', () => { pick(i); tiles[i].go?.(); }); });
  if (els.length) pick(sel);
  fe.onStep = els.length ? (d) => pick((sel + d + els.length) % els.length) : tab === 'standings' ? (d) => goTab('standings', (sub + d + 2) % 2) : null;
  const primary = () => (els.length ? tiles[sel].go?.() : race());
  fe.frame({ tag: '', title: '', sub: '', hints: [['a', els.length ? 'Select' : 'Race weekend', primary], ['b', 'Main menu', () => fe.go('main')], ['x', 'LB / RB  Tabs', () => fe.hubBump(1)]] });
  if (tab !== 'team') fe.setScene('none'); // nothing 3D behind the hub's pages
  else fe.setScene('team', teamIdx);

  function tileHtml(x, i) {
    const bg = x.cls.includes('art') ? `--art:url('${tileArt(t, x.k ?? i)}')` : x.img ? `background-image:url('${x.img}')` : '';
    return `<button class="hub-tile ${x.cls}" style="${bg}">${x.label ? `<span class="go">${esc(x.label)}</span>` : ''}<div class="t"><small>${esc(x.small)}</small><b>${esc(x.b)}</b><span>${esc(x.span)}</span></div></button>`;
  }
}
