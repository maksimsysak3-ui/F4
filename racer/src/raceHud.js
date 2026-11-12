/*
 * The race's own heads-up display, over the game HUD:
 *
 *   lights     the start gantry: five pairs of red lights coming on one a second, out at the start
 *   park       on the way back to the grid: your box, the distance to it, how straight you are; then
 *              how well you parked
 *   info       position, lap of the race, the gaps to the cars ahead and behind, last and best lap
 *   car        the car from above: each tyre coloured by its wear (with the compound and %), and each
 *              part by its damage (front wing, rear wing, floor, sidepods, suspension, power unit)
 *   pit        BOX BOX calls, the pit stop timer
 *   banner     formation lap, chequered flag
 *   rcMessage  race control and the FIA stewards: each message on a card with the FIA mark (incidents
 *              noted, investigations, decisions, flags, the Safety Car), coloured by what it is
 *   flags      the track status: SAFETY CAR / VSC (with the player's delta), yellow flags where you
 *              are, blue flags, the black-and-white flag, give the place back, a drive-through to take
 *   penalty    a big FIA card when the stewards penalise the player
 */
const CSS = `
#rh{position:fixed;inset:0;pointer-events:none;font-family:"Titillium Web",system-ui,sans-serif;color:#fff;z-index:5}
#rh .lights{position:absolute;top:7vh;left:50%;transform:translateX(-50%);display:none;gap:10px;padding:12px 14px;background:#0a0b0dee;border-radius:10px;box-shadow:0 8px 30px #000a}
#rh .lights.on{display:flex}
#rh .lights div{display:flex;flex-direction:column;gap:8px;padding:8px;background:#151619;border-radius:6px}
#rh .lights i{width:34px;height:34px;border-radius:50%;background:#2a0505;box-shadow:inset 0 2px 6px #000}
#rh .lights i.on{background:radial-gradient(circle at 40% 35%,#ff8a80,#ff1a10 45%,#a00000);box-shadow:0 0 18px #ff2010,0 0 40px #ff201066}
#rh .rh-go{position:absolute;top:22vh;left:50%;transform:translateX(-50%);font-size:clamp(28px,4vw,56px);font-weight:900;letter-spacing:.06em;text-shadow:0 4px 24px #000;opacity:0;transition:opacity .2s}
#rh .rh-go.on{opacity:1}
#rh .park{position:absolute;bottom:24vh;left:50%;transform:translateX(-50%);min-width:300px;padding:12px 18px;background:#0b0d12dd;border:1px solid #ffffff22;border-radius:8px;text-align:center;display:none}
#rh .park.on{display:block}
#rh .park small{display:block;font-size:12px;letter-spacing:.16em;color:#ffffffa0}
#rh .park b{display:block;font-size:30px;font-weight:900;font-variant-numeric:tabular-nums}
#rh .park .bar{position:relative;height:8px;background:#ffffff1c;border-radius:4px;margin-top:8px}
#rh .park .bar i{position:absolute;top:-3px;width:4px;height:14px;background:#ffc21a;border-radius:2px;transform:translateX(-50%)}
#rh .park .bar em{position:absolute;left:50%;top:-5px;width:2px;height:18px;background:#2fd673;transform:translateX(-50%)}
#rh .park.good b{color:#2fd673}
#rh .rcol{position:absolute;right:22px;top:200px;width:210px;display:flex;flex-direction:column;gap:10px}
#rh .info{background:#0b0d12d8;border:1px solid #ffffff1a;border-radius:8px;padding:10px 12px;display:none}
#rh .info.on{display:block}
#rh .info .pos{display:flex;align-items:baseline;gap:10px}
#rh .info .pos b{font-size:44px;font-weight:900;line-height:1}
#rh .info .pos span{font-size:14px;color:#ffffffb0;letter-spacing:.08em}
#rh .info .row{display:flex;justify-content:space-between;font-size:13px;padding:3px 0;border-top:1px solid #ffffff12;font-variant-numeric:tabular-nums}
#rh .info .row span{color:#ffffff90}
#rh .info .row b.up{color:#2fd673}#rh .info .row b.dn{color:#ff6b6b}
#rh .car{background:#0b0d12d8;border:1px solid #ffffff1a;border-radius:8px;padding:8px 10px;display:none}
#rh .car.on{display:block}
#rh .car svg{width:100%;height:auto;display:block}
#rh .car .lbl{display:flex;justify-content:space-between;font-size:11px;letter-spacing:.12em;color:#ffffffa0;margin-bottom:4px}
#rh .car .lbl b{color:#fff;letter-spacing:0}
#rh .car .warn{font-size:12px;color:#ff8a80;min-height:16px;margin-top:4px;text-align:center}
#rh .pit{position:absolute;top:30vh;left:50%;transform:translateX(-50%);font-size:clamp(22px,3vw,40px);font-weight:900;letter-spacing:.06em;padding:8px 22px;border-radius:6px;display:none;text-shadow:0 2px 12px #000}
#rh .pit.on{display:block}
#rh .pit.box{background:#e10600;animation:rhblink .5s steps(2) infinite}
#rh .pit.stop{background:#0b0d12dd;border:1px solid #ffffff30;font-variant-numeric:tabular-nums}
@keyframes rhblink{50%{opacity:.55}}
#rh .banner{position:absolute;top:13vh;left:50%;transform:translateX(-50%);padding:8px 28px;font-size:clamp(18px,2.2vw,30px);font-weight:900;letter-spacing:.1em;display:none;border-radius:4px}
#rh .banner.on{display:block}
#rh .banner.form{background:#1a8a3a}
#rh .banner.chequer{background:repeating-conic-gradient(#fff 0 25%,#111 0 50%) 0 0/18px 18px;color:#111;text-shadow:0 0 6px #fff,0 0 12px #fff}
#rh .flags{display:flex;flex-direction:column;gap:6px}
#rh .flag{border-radius:6px;padding:7px 10px;font-weight:900;letter-spacing:.06em;font-size:14px;display:flex;justify-content:space-between;align-items:center;gap:8px;box-shadow:0 4px 16px #0008}
#rh .flag small{font-size:11px;font-weight:700;letter-spacing:.12em;opacity:.8}
#rh .flag b{font-size:20px;font-variant-numeric:tabular-nums}
#rh .flag.sc{background:#ffd21f;color:#111}
#rh .flag.sc.big{flex-direction:column;align-items:stretch}
#rh .flag.sc .board{display:flex;justify-content:space-between;align-items:baseline}
#rh .flag.sc .board b{font-size:26px}
#rh .flag.sc .dl{display:flex;justify-content:space-between;background:#111;color:#fff;border-radius:4px;padding:3px 8px;margin-top:6px;font-size:13px}
#rh .flag.sc .dl b{font-size:18px}#rh .flag.sc .dl b.ok{color:#2fd673}#rh .flag.sc .dl b.bad{color:#ff4d4d}
#rh .flag.end{animation:rhblink .6s steps(2) infinite}
#rh .flag.yellow{background:#ffd21f;color:#111}
#rh .flag.dyellow{background:repeating-linear-gradient(90deg,#ffd21f 0 50%,#ffd21f 0 100%);color:#111;outline:3px solid #ffd21f;outline-offset:2px}
#rh .flag.green{background:#1fb455;color:#fff}
#rh .flag.blue{background:#1f5bff;color:#fff;animation:rhblink .7s steps(2) infinite}
#rh .flag.bw{background:linear-gradient(135deg,#111 50%,#fff 50%);color:#fff;text-shadow:0 0 4px #000,0 0 8px #000}
#rh .flag.warn{background:#ff8a20;color:#111}
#rh .flag.dt{background:#e10600;color:#fff}
#rh .flag.black{background:#000;color:#fff;border:2px solid #fff}
#rh .rcq{position:absolute;top:10px;left:50%;transform:translateX(-50%);width:min(640px,62vw);display:flex;flex-direction:column;gap:6px}
#rh .rcm{display:grid;grid-template-columns:42px 1fr;gap:10px;align-items:center;background:#0b0d12f0;border-left:5px solid var(--k,#3a8dff);border-radius:6px;padding:8px 12px 8px 8px;box-shadow:0 6px 24px #000a;animation:rcin .35s ease-out}
#rh .rcm.out{animation:rcout .4s ease-in forwards}
#rh .rcm.me{background:#161a24f5;box-shadow:0 0 0 1px #ffffff70,0 6px 24px #000a}
#rh .rcm svg{width:42px;height:42px;display:block}
#rh .rcm .hd{display:flex;justify-content:space-between;font-size:11px;font-weight:700;letter-spacing:.16em;color:#ffffff99}
#rh .rcm .hd em{font-style:normal;color:#fff;background:#e10600;border-radius:3px;padding:0 5px;letter-spacing:.08em;margin-left:6px}
#rh .rcm .tx{font-size:15px;font-weight:800;letter-spacing:.02em;line-height:1.25;text-transform:uppercase}
@keyframes rcin{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}
@keyframes rcout{to{opacity:0;transform:translateY(-8px)}}
#rh .pen{position:absolute;top:34vh;left:50%;transform:translate(-50%,-50%);display:none;grid-template-columns:86px 1fr;gap:18px;align-items:center;background:#0b0d12f2;border:2px solid #fff;border-radius:10px;padding:16px 26px 16px 18px;box-shadow:0 10px 40px #000c;min-width:min(520px,80vw)}
#rh .pen.on{display:grid;animation:rcin .3s ease-out}
#rh .pen svg{width:86px;height:86px}
#rh .pen small{display:block;font-size:12px;font-weight:700;letter-spacing:.2em;color:#ffffffa0}
#rh .pen b{display:block;font-size:clamp(22px,2.6vw,34px);font-weight:900;letter-spacing:.03em;line-height:1.05}
#rh .pen span{display:block;font-size:15px;font-weight:700;margin-top:4px;color:#ffd21f}
#rh .pen.ok b{color:#2fd673}#rh .pen.ok span{color:#ffffffc0}
#tower-tag.sc,#tower-tag.vsc{background:#ffd21f!important;color:#111!important}
#tower-tag.yellow{background:#ffd21f!important;color:#111!important}
#tower-tag.green{background:#1fb455!important;color:#fff!important}
@media (max-width:760px){#rh .rcol{top:auto;bottom:210px;right:8px;width:160px}#rh .car{display:none!important}#rh .rcq{width:92vw}}
`;
// The FIA's mark (a blue globe with the letters), for race control's messages.
export const FIA_LOGO = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-label="FIA"><defs><radialGradient id="fiaG" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#3b7fe0"/><stop offset=".6" stop-color="#14408f"/><stop offset="1" stop-color="#0a2459"/></radialGradient></defs>
  <circle cx="32" cy="32" r="30" fill="url(#fiaG)" stroke="#fff" stroke-width="2.2"/>
  <g fill="none" stroke="#a9ccff" stroke-width="1.1" opacity=".55"><ellipse cx="32" cy="32" rx="11" ry="29"/><ellipse cx="32" cy="32" rx="21" ry="29"/><path d="M5 21h54M3 32h58M5 43h54"/></g>
  <text x="32" y="39.5" text-anchor="middle" font-family="'Titillium Web',Arial,sans-serif" font-weight="900" font-size="21" fill="#fff" letter-spacing=".5">FIA</text></svg>`;
const KIND_COL = { penalty: '#e10600', inv: '#ff8a20', noted: '#ffb020', nfi: '#8a94a6', nfa: '#8a94a6', served: '#2fd673', sc: '#ffd21f', vsc: '#ffd21f', yellow: '#ffd21f', clear: '#1fb455', black: '#ffffff', bw: '#ffffff', limits: '#c0c6d0', info: '#3a8dff' };
const TYRE_COL = { S: '#e8213a', M: '#ffd21f', H: '#f4f4f6', I: '#2fd673', W: '#2f8cff' };
const health = (h) => (h > 0.85 ? '#2fd673' : h > 0.6 ? '#ffd21f' : h > 0.3 ? '#ff8a20' : '#ff2a2a');
const wearCol = (w) => (w > 0.6 ? '#2fd673' : w > 0.38 ? '#ffd21f' : w > 0.18 ? '#ff8a20' : '#ff2a2a');
const fmt = (t) => (t == null ? '—' : `${Math.floor(t / 60)}:${(t % 60).toFixed(3).padStart(6, '0')}`);

let shared = null;
/** The one race HUD (created on first use). */
export const raceHud = () => (shared ??= new RaceHud());

export class RaceHud {
  constructor() {
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    const el = (this.el = document.createElement('div'));
    el.id = 'rh';
    el.innerHTML = `<div class="lights">${'<div><i></i><i></i></div>'.repeat(5)}</div><div class="rh-go">LIGHTS OUT</div>
      <div class="banner"></div><div class="pit"></div>
      <div class="park"><small></small><b></b><div class="bar"><em></em><i></i></div></div>
      <div class="rcq"></div><div class="pen">${FIA_LOGO}<div><small></small><b></b><span></span></div></div>
      <div class="rcol"><div class="flags"></div>
      <div class="info"><div class="pos"><b>P1</b><span></span></div><div class="rows"></div></div>
      <div class="car"><div class="lbl"><span>CAR STATUS</span><b class="tyr"></b></div>${CAR_SVG}<div class="warn"></div></div></div>`;
    document.body.appendChild(el);
    this.q = (x) => el.querySelector(x);
    this.cache = {};
  }
  hideAll() {
    for (const k of ['.lights', '.rh-go', '.banner', '.pit', '.park', '.info', '.car', '.pen']) this.q(k).classList.remove('on');
    this.q('.flags').innerHTML = ''; this.cache.flags = '';
    this.q('.rcq').innerHTML = ''; this.rcQueue = []; this.rcShown = [];
  }

  /**
   * A race control message: { head ('RACE CONTROL' | 'FIA STEWARDS'), text, kind, lap, player }. Up to
   * three on screen, each for a few seconds; the rest wait their turn.
   */
  rcMessage(m) {
    this.rcQueue ??= []; this.rcShown ??= [];
    this.rcQueue.push(m);
    this.rcPump();
  }
  rcPump() {
    const box = this.q('.rcq');
    while (this.rcShown.length < 3 && this.rcQueue.length) {
      const m = this.rcQueue.shift();
      const el = document.createElement('div');
      el.className = `rcm ${m.player ? 'me' : ''}`;
      el.style.setProperty('--k', KIND_COL[m.kind] ?? '#3a8dff');
      el.innerHTML = `${FIA_LOGO}<div><div class="hd"><span>${m.head}${m.player ? '<em>YOU</em>' : ''}</span><span>LAP ${m.lap}</span></div><div class="tx"></div></div>`;
      el.querySelector('.tx').textContent = m.text;
      box.appendChild(el);
      this.rcShown.push(el);
      const life = (m.player || m.kind === 'penalty' || m.kind === 'sc' || m.kind === 'black' ? 8 : 6) * 1000 / (1 + this.rcQueue.length * 0.4);
      setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); this.rcShown = this.rcShown.filter((x) => x !== el); this.rcPump(); }, 400); }, life);
    }
  }
  /** The big FIA card for a decision about the player (ok: in their favour, e.g. no further action). */
  penalty(title, sub = '', ok = false, head = 'FIA STEWARDS · DECISION') {
    const p = this.q('.pen');
    p.querySelector('small').textContent = head;
    p.querySelector('b').textContent = title;
    p.querySelector('span').textContent = sub;
    p.className = `pen on ${ok ? 'ok' : ''}`;
    clearTimeout(this.penT); this.penT = setTimeout(() => p.classList.remove('on'), 4500);
  }
  /**
   * The track status and the player's flags: { status: 'green'|'sc'|'scIn'|'vsc'|'vscEnd', delta (s, or
   * null), yellow ('single'|'double'|null, with turn), blue (code), bw, giveBack (code), dt (laps left),
   * green (flash) }.
   */
  flags(d) {
    const key = JSON.stringify(d);
    if (key === this.cache.flags) return;
    this.cache.flags = key;
    const out = [], dl = d.delta == null ? '' : `<div class="dl"><span>DELTA</span><b class="${d.delta >= 0 ? 'ok' : 'bad'}">${d.delta >= 0 ? '+' : '−'}${Math.abs(d.delta).toFixed(1)}</b></div>`;
    if (d.status === 'sc' || d.status === 'scIn') out.push(`<div class="flag sc big ${d.status === 'scIn' ? 'end' : ''}"><div class="board"><b>SC</b><small>${d.status === 'scIn' ? 'IN THIS LAP' : 'SAFETY CAR'}</small></div>${dl}</div>`);
    if (d.status === 'vsc' || d.status === 'vscEnd') out.push(`<div class="flag sc big ${d.status === 'vscEnd' ? 'end' : ''}"><div class="board"><b>VSC</b><small>${d.status === 'vscEnd' ? 'ENDING' : 'VIRTUAL SAFETY CAR'}</small></div>${dl}</div>`);
    if (d.green) out.push('<div class="flag green"><span>TRACK CLEAR</span><small>GREEN</small></div>');
    if (d.yellow) out.push(`<div class="flag ${d.yellow === 'double' ? 'dyellow' : 'yellow'}"><span>${d.yellow === 'double' ? 'DOUBLE YELLOW' : 'YELLOW'}</span><small>${d.turn ?? ''}</small></div>`);
    if (d.blue) out.push(`<div class="flag blue"><span>BLUE FLAG</span><small>LET ${d.blue} BY</small></div>`);
    if (d.giveBack) out.push(`<div class="flag warn"><span>GIVE THE PLACE BACK</span><small>TO ${d.giveBack}</small></div>`);
    if (d.dt != null) out.push(`<div class="flag dt"><span>DRIVE THROUGH</span><small>${d.dt > 0 ? `${d.dt} LAP${d.dt > 1 ? 'S' : ''} TO TAKE IT` : 'BOX THIS LAP'}</small></div>`);
    if (d.bw) out.push('<div class="flag bw"><span>TRACK LIMITS</span><small>BLACK &amp; WHITE</small></div>');
    if (d.black) out.push('<div class="flag black"><span>BLACK FLAG</span><small>DISQUALIFIED</small></div>');
    this.q('.flags').innerHTML = out.join('');
  }

  lights(n) {
    const box = this.q('.lights');
    box.classList.toggle('on', n > 0);
    box.querySelectorAll('div').forEach((d, k) => d.querySelectorAll('i').forEach((i) => i.classList.toggle('on', k < n)));
  }
  lightsOut() { this.lights(0); const g = this.q('.rh-go'); g.classList.add('on'); clearTimeout(this.goT); this.goT = setTimeout(() => g.classList.remove('on'), 1600); }
  banner(text, kind = '') { const b = this.q('.banner'); b.textContent = text; b.className = `banner ${text ? 'on' : ''} ${kind}`; }
  pit(text, kind = '') { const b = this.q('.pit'); if (this.cache.pit === text + kind) return; this.cache.pit = text + kind; b.textContent = text; b.className = `pit ${text ? 'on' : ''} ${kind}`; }

  /** Parking guide: dist along to the box (m, + = still to go), lateral error (m), done. */
  park(on, { slot = 0, along = 0, lat = 0, done = false, verdict = '' } = {}) {
    const p = this.q('.park');
    p.classList.toggle('on', on);
    if (!on) return;
    p.classList.toggle('good', done);
    p.querySelector('small').textContent = done ? `PARKED IN P${slot}` : `GRID BOX P${slot}`;
    p.querySelector('b').textContent = done ? verdict : along > 30 ? `${Math.round(along)} m` : `${along.toFixed(1)} m`;
    p.querySelector('.bar i').style.left = `${50 + Math.max(-48, Math.min(48, lat * 20))}%`;
  }

  /** The race panel: { pos, of, lap, laps, ahead: {code, gap}, behind: {code, gap}, last, best }. */
  info(on, d = {}) {
    const box = this.q('.info');
    box.classList.toggle('on', on);
    if (!on) return;
    const key = JSON.stringify(d);
    if (key === this.cache.info) return;
    this.cache.info = key;
    box.querySelector('.pos b').textContent = d.finished ? `P${d.pos}` : `P${d.pos}`;
    box.querySelector('.pos span').textContent = d.finished ? 'FINISHED' : `LAP ${d.lap}/${d.laps}`;
    const row = (k, v, cls = '') => `<div class="row"><span>${k}</span><b class="${cls}">${v}</b></div>`;
    box.querySelector('.rows').innerHTML =
      (d.ahead ? row(`Ahead · ${d.ahead.code}`, `+${d.ahead.gap.toFixed(1)}`, 'dn') : row('Ahead', 'Leading', 'up')) +
      (d.behind ? row(`Behind · ${d.behind.code}`, `-${d.behind.gap.toFixed(1)}`, 'up') : '') +
      row('Last lap', fmt(d.last)) + row('Best lap', fmt(d.best)) + (d.pits != null ? row('Pit stops', d.pits) : '') + (d.penalty ? row('Penalty to serve', `+${d.penalty} s`, 'dn') : '') + (d.inv ? row('Stewards', 'Under investigation', 'dn') : '');
  }

  /** Car status: tyres { compound, wear (0..1 left), pct }, damage { part: health 0..1 }, warning text. */
  car(on, { tyres = null, damage = {}, warning = '' } = {}) {
    const box = this.q('.car');
    box.classList.toggle('on', on);
    if (!on) return;
    const key = JSON.stringify([tyres?.compound, Math.round((tyres?.wear ?? 1) * 50), damage, warning]);
    if (key === this.cache.car) return;
    this.cache.car = key;
    const svg = box.querySelector('svg');
    for (const id of ['fl', 'fr', 'rl', 'rr']) { const t = svg.getElementById(`t-${id}`); if (t) t.setAttribute('fill', wearCol(tyres?.wear ?? 1)); }
    for (const [part, h] of Object.entries(damage)) svg.querySelectorAll(`[data-p="${part}"]`).forEach((n) => n.setAttribute('fill', health(h)));
    box.querySelector('.tyr').innerHTML = tyres ? `<span style="color:${TYRE_COL[tyres.compound] ?? '#fff'}">${tyres.compound}</span> ${tyres.pct}%` : '';
    box.querySelector('.warn').textContent = warning;
  }
}

// The car from above (nose up): parts and tyres, coloured live.
const CAR_SVG = `<svg viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg">
  <rect data-p="frontWing" x="18" y="6" width="84" height="12" rx="3" fill="#2fd673"/>
  <rect data-p="chassis" x="52" y="16" width="16" height="44" rx="6" fill="#2fd673" opacity=".85"/>
  <rect id="t-fl" x="16" y="30" width="18" height="32" rx="5" fill="#2fd673"/>
  <rect id="t-fr" x="86" y="30" width="18" height="32" rx="5" fill="#2fd673"/>
  <rect data-p="suspension" x="34" y="42" width="18" height="5" fill="#2fd673"/><rect data-p="suspension" x="68" y="42" width="18" height="5" fill="#2fd673"/>
  <path data-p="sidepods" d="M38 78 h44 l4 56 h-52z" fill="#2fd673"/>
  <rect data-p="chassis" x="48" y="60" width="24" height="40" rx="8" fill="#2fd673"/>
  <rect data-p="engine" x="50" y="100" width="20" height="44" rx="5" fill="#2fd673"/>
  <path data-p="floor" d="M30 72 h60 v78 h-60z" fill="none" stroke="#2fd673" stroke-width="3" stroke-dasharray="5 3"/>
  <rect id="t-rl" x="12" y="140" width="22" height="36" rx="5" fill="#2fd673"/>
  <rect id="t-rr" x="86" y="140" width="22" height="36" rx="5" fill="#2fd673"/>
  <rect data-p="suspension" x="34" y="155" width="16" height="5" fill="#2fd673"/><rect data-p="suspension" x="70" y="155" width="16" height="5" fill="#2fd673"/>
  <rect data-p="rearWing" x="26" y="182" width="68" height="12" rx="3" fill="#2fd673"/>
</svg>`;
