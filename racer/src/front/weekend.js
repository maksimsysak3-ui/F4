import { TEAMS } from './teams.js';
import { newWeekend, sessionWeather, LENGTHS, fmtLap, fmtClock } from '../game/session.js';
import { raceLaps, RACE_LENGTHS, POINTS } from '../game/race.js';
import { planStrategy, COMPOUNDS } from '../game/tyres.js';
import { buildParcFerme, buildPodium, buildGarageFinish, buildMediaPen } from './ceremony.js';
import { FIA_LOGO as FIA_MARK } from '../raceHud.js';
import { ratingsAt, playerCarFactors, advance as rdAdvance } from '../game/rd.js';
import { staffMods, staffWeekend } from '../game/staff.js';
import { ensureSeasonState } from '../game/seasonState.js';
import { powerFactor, failRisk, loadoutWeekend } from '../game/loadout.js';
import { gridPenalties, fiaWeekend, bannedAt } from '../game/fia.js';
import { buildInterview, interviewContext, recordAnswer, interviewDone } from '../game/interviews.js';
import { renderInterview } from './interviews.js';

/*
 * The race weekend's screens, on top of the garage scene:
 *
 *   loading   the circuit and the field load behind the Grand Prix's title card
 *   garage    the team's garage; the player's monitor shows the weekend (click it, or A)
 *   monitor   the weekend on the pit wall software: the schedule as boxes, a session's tabs
 *             (overview, weather, tyres, results), the live timing while a session runs
 *   incar     sat in the car on its stands: pick the tyres, GO OUT TO TRACK
 *
 * fe is the Frontend; fe.weekend is main's API (prepare / start / goOut / leave, run = WeekendRun).
 */
const CSS = `
#front .wk .ban,.ban{background:#e1060026;border-left:3px solid #e10600;border-radius:6px;padding:9px 12px;font:600 14px "Titillium Web",Arial,sans-serif;margin-bottom:8px}
#front .wk{position:absolute;inset:0;display:none;font-family:"Titillium Web",Arial,sans-serif;color:#eef0f4;z-index:6}
#front.wkmode .wk{display:block}
#front.wkmode .photo,#front.wkmode .block,#front.wkmode .streaks,#front.wkmode .bigname,#front.wkmode .card,#front.wkmode .cards,#front.wkmode .credit,#front.wkmode .brand{display:none}
#front.wkmode{background:#000}
#front.wkmode .hd .tag{background:var(--a);color:var(--ink,#fff)}
#front.wkmode canvas.stage.hot{cursor:pointer}
#front.wkmode .hints{z-index:8}
#front.wkmode .hd .tag:empty{display:none}
.wk.dim{background:#05060acc;backdrop-filter:blur(6px)}
.wk .load{position:absolute;inset:0;background:#07080b center/cover no-repeat;display:flex;align-items:flex-end}
.wk .load:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#07080bf2 0%,#07080bb0 45%,#07080b30 100%),linear-gradient(0deg,#07080b 0%,transparent 40%)}
.wk .load .in{position:relative;padding:0 6% 7%;width:min(760px,90%)}
.wk .load small{display:inline-block;font-weight:700;letter-spacing:.18em;text-transform:uppercase;font-size:13px;color:#c9ccd4}
.wk .load small b{background:var(--a);color:var(--ink);padding:3px 9px;margin-left:10px;letter-spacing:.12em}
.wk .load h1{font-size:clamp(38px,5.4vw,78px);font-weight:900;text-transform:uppercase;line-height:.92;margin:14px 0 8px;letter-spacing:-.01em}
.wk .load p{margin:0 0 30px;color:#c9ccd4;font-size:16px;text-transform:uppercase;letter-spacing:.06em}
.wk .load canvas{position:absolute;right:6%;bottom:9%;width:min(34vw,460px);opacity:.95}
.wk .bar{height:4px;background:#ffffff1c;overflow:hidden;position:relative}
.wk .bar i{position:absolute;inset:0 auto 0 0;width:0;background:var(--a);transition:width .5s}
.wk .step{margin-top:12px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#9a9fab}
.wk .tip{margin-top:26px;font-size:14px;color:#b9bdc7;max-width:560px;border-left:3px solid var(--a);padding-left:12px}
.wk .mon{position:absolute;inset:6.5% 5.5% 9% 5.5%;background:linear-gradient(180deg,#0e1118f5,#090b10f7);border:1px solid #ffffff1f;box-shadow:0 30px 90px #000c,0 0 0 1px #000;display:flex;flex-direction:column;overflow:hidden;animation:wkin .35s ease-out}
@keyframes wkin{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:none}}
.wk .mon>header{display:flex;align-items:center;gap:18px;padding:14px 22px;border-bottom:1px solid #ffffff14;background:linear-gradient(90deg,var(--a) 0 6px,#ffffff06 6px)}
.wk .mon>header .t{flex:1;min-width:0}
.wk .mon>header small{display:block;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#9ca1ad}
.wk .mon>header b{display:block;font-size:24px;font-weight:900;text-transform:uppercase;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wk .chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:4px 10px;border:1px solid #ffffff2a;color:#d8dbe2;background:#ffffff08}
.wk .chip.hot{background:var(--a);color:var(--ink);border-color:transparent}
.wk .seg{display:inline-flex;border:1px solid #ffffff26}
.wk .seg button{background:none;border:0;color:#aeb3be;font:700 12px "Titillium Web",Arial;letter-spacing:.08em;text-transform:uppercase;padding:5px 11px;cursor:pointer}
.wk .seg button.on{background:#ffffff1f;color:#fff}
.wk .seg button:hover{color:#fff}
.wk .opt{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8d929e}
.wk .body{flex:1;min-height:0;overflow:auto;padding:20px 22px}
.wk .sched{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;height:100%;min-height:300px}
.wk .sess{position:relative;text-align:left;background:linear-gradient(180deg,#171b24,#11141b);border:1px solid #ffffff14;color:#fff;font-family:inherit;padding:16px;display:flex;flex-direction:column;gap:6px;cursor:pointer;transition:transform .15s,border-color .15s,background .15s;overflow:hidden}
.wk .sess:hover,.wk .sess.sel{border-color:var(--a);transform:translateY(-2px);background:linear-gradient(180deg,#1c212c,#141821)}
.wk .sess .day{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#9ca1ad}
.wk .sess .day b{color:#fff;margin-right:8px}
.wk .sess h3{margin:2px 0 0;font-size:clamp(17px,1.6vw,24px);font-weight:900;text-transform:uppercase;line-height:1.05}
.wk .sess .len{font-size:13px;color:#aeb3be}
.wk .sess .wx{font-size:13px;color:#c9ccd4}
.wk .sess .strip{display:grid;grid-template-columns:repeat(5,1fr);gap:2px;margin-top:auto;padding:8px 4px;background:#ffffff06;border:1px solid #ffffff0d}
.wk .sess .strip i{display:flex;flex-direction:column;align-items:center;font-style:normal}
.wk .sess .strip svg{width:100%;max-width:30px;height:auto}
.wk .sess .strip small{font-size:10.5px;color:#5fb4ff}
.wk .sess .pod{display:flex;flex-direction:column;gap:3px;margin-top:10px}
.wk .sess .pod i{display:flex;align-items:center;gap:6px;font-style:normal;font-size:13px;font-weight:700}
.wk .sess .pod em{width:3px;height:13px}
.wk .sess .pod small{margin-left:auto;font-weight:400;color:#aeb3be;font-variant-numeric:tabular-nums}
.wk .sess .soon{margin-top:auto;font-size:13px;color:#8d929e}
.wk .sess .st{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:6px 0 0;border-top:1px solid #ffffff14;color:#9ca1ad}
.wk .sess .st b{display:block;color:#fff;font-size:20px;letter-spacing:0;font-weight:900}
.wk .sess.next{border-color:var(--a)}
.wk .sess.next:after{content:"UP NEXT";position:absolute;top:12px;right:-30px;transform:rotate(35deg);background:var(--a);color:var(--ink);font-size:10px;font-weight:900;letter-spacing:.14em;padding:3px 34px}
.wk .sess.live:after{content:"LIVE";background:#e10600;color:#fff}
.wk .sess.locked{opacity:.5;cursor:default}
.wk .sess.locked:hover{transform:none;border-color:#ffffff14}
.wk .sess.done .st b{color:#2fd673}
.wk .tabs{display:flex;gap:2px;padding:0 22px;border-bottom:1px solid #ffffff14;background:#ffffff04}
.wk .tabs button{background:none;border:0;border-bottom:3px solid transparent;color:#9ca1ad;font:700 13px "Titillium Web",Arial;letter-spacing:.12em;text-transform:uppercase;padding:12px 16px 9px;cursor:pointer}
.wk .tabs button.on{color:#fff;border-color:var(--a)}
.wk .tabs button:hover{color:#fff}
.wk .grid2{display:grid;grid-template-columns:1.1fr 1fr;gap:22px}
.wk .kv{display:grid;grid-template-columns:auto 1fr;gap:9px 22px;font-size:15px;align-content:start}
.wk .kv span{color:#8d929e;text-transform:uppercase;letter-spacing:.1em;font-size:12px;padding-top:3px}
.wk .kv b{font-weight:700}
.wk .note{margin-top:18px;padding:14px 16px;background:#ffffff08;border-left:3px solid var(--a);font-size:15px;line-height:1.45;color:#d8dbe2}
.wk .note small{display:block;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8d929e;margin-bottom:4px}
.wk .fc{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.wk .fc div{background:#ffffff08;border:1px solid #ffffff12;padding:14px 10px;text-align:center}
.wk .fc small{display:block;font-size:12px;color:#8d929e;letter-spacing:.1em}
.wk .fc svg{width:54px;height:54px;margin:8px auto 4px;display:block}
.wk .fc b{display:block;font-size:14px}
.wk .fc em{display:block;font-style:normal;font-size:13px;color:#5fb4ff;margin-top:2px}
.wk .tyres{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.wk .tyre{background:#ffffff08;border:1px solid #ffffff12;padding:14px;text-align:center;color:#fff;font-family:inherit;cursor:default}
.wk .tyre .ring{width:70px;height:70px;border-radius:50%;margin:4px auto 10px;background:radial-gradient(circle,#2a2b30 0 38%,var(--c) 39% 47%,#1a1b1f 48% 66%,#0f1013 67%);display:grid;place-items:center;font-weight:900;font-size:20px;color:var(--c);box-shadow:0 6px 16px #0008}
.wk .tyre b{display:block;text-transform:uppercase;letter-spacing:.06em}
.wk .tyre p{margin:6px 0 10px;font-size:12.5px;color:#aeb3be;line-height:1.35;min-height:52px}
.wk .meter{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#8d929e;margin-top:4px}
.wk .meter i{flex:1;height:4px;background:#ffffff14;position:relative}
.wk .meter i:after{content:"";position:absolute;inset:0 auto 0 0;width:var(--v);background:var(--c)}
.wk table{width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums}
.wk th{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8d929e;text-align:left;padding:6px 8px;border-bottom:1px solid #ffffff14;font-weight:700}
.wk td{padding:5px 8px;border-bottom:1px solid #ffffff0a;white-space:nowrap}
.wk tr.me td{background:color-mix(in srgb,var(--a) 24%,transparent)}
.wk tr.ko td{color:#7d828e}
.wk tr.cut td{border-top:2px solid #e10600}
.wk td.p{font-weight:900;width:34px}
.wk td.c i{display:inline-block;width:4px;height:16px;vertical-align:middle;margin-right:8px}
.wk td.n{font-weight:700}
.wk td.purple{color:#c77dff;font-weight:700}
.wk td.green{color:#2fd673}
.wk .tc{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;border:2.5px solid var(--c);font-size:10px;font-weight:900;color:var(--c)}
.wk .acts{display:flex;gap:10px;padding:14px 22px;border-top:1px solid #ffffff14;background:#ffffff04;align-items:center;flex-wrap:wrap}
.wk .btn{background:#ffffff10;border:1px solid #ffffff26;color:#fff;font:700 14px "Titillium Web",Arial;letter-spacing:.1em;text-transform:uppercase;padding:10px 18px;cursor:pointer;transition:background .15s}
.wk .btn:hover{background:#ffffff22}
.wk .btn.primary{background:var(--a);color:var(--ink);border-color:transparent;font-weight:900}
.wk .btn.primary:hover{filter:brightness(1.1)}
.wk .btn:disabled{opacity:.4;cursor:default}
.wk .sp{flex:1}
.wk .live{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(260px,1fr);gap:20px;height:100%;min-height:0}
.wk .live .tw{overflow:auto;min-height:0}
.wk .live .side{display:flex;flex-direction:column;gap:14px;min-height:0}
.wk .clock{background:#ffffff08;border:1px solid #ffffff12;padding:14px 16px;display:flex;align-items:center;gap:14px}
.wk .clock b{font-size:44px;font-weight:900;line-height:1;font-variant-numeric:tabular-nums}
.wk .clock small{display:block;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#8d929e}
.wk .clock .flag{margin-left:auto;width:16px;align-self:stretch;background:#2fd673}
.wk .clock .flag.chequer{background:repeating-conic-gradient(#fff 0 25%,#111 0 50%) 0 0/10px 10px}
.wk .clock .flag.break,.wk .clock .flag.done{background:#e10600}
.wk .mine{background:#ffffff08;border:1px solid #ffffff12;padding:14px 16px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.wk .mine div small{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8d929e}
.wk .mine div b{font-size:22px;font-weight:900;font-variant-numeric:tabular-nums}
.wk .feed{flex:1;min-height:80px;overflow:auto;background:#ffffff05;border:1px solid #ffffff10;padding:8px 12px;font-size:13px}
.wk .feed div{padding:4px 0;border-bottom:1px solid #ffffff08;color:#c9ccd4}
.wk .feed div span{color:#7d828e;margin-right:8px;font-variant-numeric:tabular-nums}
.wk .feed .purple{color:#c77dff}.wk .feed .green{color:#2fd673}.wk .feed .out{color:#ff6b6b}
.wk .res .sum{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:18px}
.wk .res .sum div{background:#ffffff08;border:1px solid #ffffff12;padding:12px 14px;min-width:0}
.wk .res .sum small{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8d929e}
.wk .res .sum b{display:block;font-size:24px;font-weight:900;font-variant-numeric:tabular-nums;margin:2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wk .res .sum b:has(i){white-space:normal;line-height:1.5}
.wk .res .sum b i{font-style:normal;font-size:16px;font-weight:700;margin-right:4px}
.wk .res .sum b i.pu{color:#c77dff}
.wk .res .sum em{display:block;font-style:normal;font-size:12px;color:#aeb3be}
@media (max-width:900px){.wk .res .sum{grid-template-columns:repeat(2,1fr)}}
.wk .rgrid{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:18px;align-items:start}
.wk .rcbox{margin-top:14px;background:#ffffff08;border:1px solid #ffffff12;padding:10px 14px}
.wk .rcbox h4{display:flex;align-items:center;gap:8px;margin:0 0 8px}.wk .rcbox h4 svg{width:24px;height:24px}
.wk .rcbox .per{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.wk .rcbox .dec div{padding:4px 0;border-top:1px solid #ffffff10;font-size:14px}.wk .rcbox .dec em{color:#ffffff80;font-style:normal;margin-left:6px}
.wk .champ{background:#ffffff08;border:1px solid #ffffff12;padding:10px 12px}
.wk .champ h4{margin:0 0 8px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#8d929e}
.wk .champ div{display:grid;grid-template-columns:22px 4px 1fr auto 34px;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid #ffffff0a;font-size:13px}
.wk .champ div.me{background:color-mix(in srgb,var(--a) 24%,transparent)}
.wk .champ i{height:14px}.wk .champ em{font-style:normal;font-weight:900}.wk .champ small{color:#2fd673;font-weight:700;text-align:right}
@media (max-width:900px){.wk .rgrid{grid-template-columns:1fr}}
.wk .cer{position:absolute;left:5%;bottom:12%;padding:14px 24px;background:linear-gradient(90deg,#000c,#0000);border-left:5px solid var(--a);animation:wkin .6s ease-out}
.wk .cer small{display:block;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#c9ccd4}
.wk .cer b{display:block;font-size:clamp(30px,4vw,60px);font-weight:900;text-transform:uppercase;line-height:1}
.wk .cer.gold b{color:#ffd54a;text-shadow:0 0 24px #ffd54a66}
.wk .cer.pod{display:flex;gap:28px;border:0;background:linear-gradient(0deg,#000c,#0000);left:0;right:0;bottom:0;padding:18px 5% 70px}
.wk .cer.pod div{flex:1;border-left:4px solid #fff3;padding-left:12px}
.wk .cer.pod i{display:block;width:40px;height:4px;margin-bottom:6px}
.wk .cer.pod b{font-size:clamp(18px,2vw,30px)}
.wk .cer.pod .win b{color:#ffd54a}
.wk .cer.pod span{font-size:13px;color:#c9ccd4;letter-spacing:.08em;text-transform:uppercase}
.wk .incar{position:absolute;left:0;right:0;bottom:0;padding:0 5% 7%;background:linear-gradient(0deg,#000d 0%,#0009 55%,transparent);display:flex;align-items:flex-end;gap:26px;animation:wkin .4s ease-out}
.wk .incar .info{flex:1;min-width:0}
.wk .incar .info small{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#c9ccd4}
.wk .incar .info h2{margin:6px 0 14px;font-size:clamp(26px,3vw,44px);font-weight:900;text-transform:uppercase;line-height:1}
.wk .incar .tyres{grid-template-columns:repeat(5,minmax(0,110px));gap:8px}
.wk .incar .tyre{cursor:pointer;padding:10px 6px;background:#0009;transition:border-color .15s,transform .15s}
.wk .incar .tyre:hover{transform:translateY(-2px)}
.wk .incar .tyre.on{border-color:var(--c);background:#000c}
.wk .incar .tyre .ring{width:52px;height:52px;font-size:16px;margin-bottom:6px}
.wk .incar .tyre small{display:block;font-size:10px;letter-spacing:.1em;color:#8d929e;text-transform:uppercase;margin-top:2px}
.wk .incar .tyre.rec small{color:#2fd673}
.wk .goout{background:var(--a);color:var(--ink);border:0;font:900 clamp(18px,1.8vw,26px) "Titillium Web",Arial;letter-spacing:.06em;text-transform:uppercase;padding:22px 34px;cursor:pointer;clip-path:polygon(14px 0,100% 0,calc(100% - 14px) 100%,0 100%);box-shadow:0 10px 40px #0009;white-space:nowrap}
.wk .goout:hover{filter:brightness(1.12)}
.wk .goout:disabled{filter:grayscale(1);opacity:.5;cursor:default}
.wk .goout small{display:block;font-size:12px;letter-spacing:.14em;font-weight:700;opacity:.8}
@media (max-width:900px){.wk .sched,.wk .fc,.wk .tyres{grid-template-columns:repeat(2,1fr)}.wk .grid2,.wk .live{grid-template-columns:1fr}.wk .mon{inset:3% 2% 9% 2%}.wk .incar{flex-direction:column;align-items:stretch}}
`;
let styled = false;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Weather icons (the forecast's icon ids) as small inline SVGs. */
const SUN = '<circle cx="24" cy="24" r="8" fill="#ffc533"/><g stroke="#ffc533" stroke-width="3" stroke-linecap="round">' + [0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = (a * Math.PI) / 180; return `<line x1="${24 + Math.cos(r) * 13}" y1="${24 + Math.sin(r) * 13}" x2="${24 + Math.cos(r) * 18}" y2="${24 + Math.sin(r) * 18}"/>`; }).join('') + '</g>';
const CLOUD = (c, x = 0, y = 0) => `<path transform="translate(${x} ${y})" d="M14 36h22a8 8 0 0 0 0-16 11 11 0 0 0-21-2 8 8 0 0 0-1 18z" fill="${c}"/>`;
const DROPS = (n, c = '#5fb4ff') => `<g stroke="${c}" stroke-width="2.5" stroke-linecap="round">${Array.from({ length: n }, (_, k) => `<line x1="${16 + k * 7}" y1="${39 + (k % 2) * 2}" x2="${13 + k * 7}" y2="${45 + (k % 2) * 2}"/>`).join('')}</g>`;
export const WX_ICON = {
  sun: `<svg viewBox="0 0 48 48">${SUN}</svg>`,
  suncloud: `<svg viewBox="0 0 48 48"><g transform="translate(-6 -6) scale(.85)">${SUN}</g>${CLOUD('#dfe3ea', 2, 4)}</svg>`,
  cloud: `<svg viewBox="0 0 48 48">${CLOUD('#c9ced8')}</svg>`,
  darkcloud: `<svg viewBox="0 0 48 48">${CLOUD('#7a808c')}</svg>`,
  drizzle: `<svg viewBox="0 0 48 48">${CLOUD('#9aa0ab', 0, -4)}${DROPS(2)}</svg>`,
  rain: `<svg viewBox="0 0 48 48">${CLOUD('#7a808c', 0, -4)}${DROPS(4)}</svg>`,
  storm: `<svg viewBox="0 0 48 48">${CLOUD('#565b66', 0, -5)}${DROPS(4)}<path d="M26 30l-5 8h5l-3 7 8-10h-5l3-5z" fill="#ffd21f"/></svg>`,
};

/** The tyres: compound, colour, and what they're for. */
export const TYRES = [
  { id: 'S', name: 'Soft', c: '#e8213a', grip: 100, life: 35, p: 'The most grip, for the fewest laps. The qualifying tyre.' },
  { id: 'M', name: 'Medium', c: '#ffd21f', grip: 86, life: 62, p: 'The balance of grip and life. Long runs in practice.' },
  { id: 'H', name: 'Hard', c: '#f4f4f6', grip: 72, life: 90, p: 'Durable and slow to warm up. For the longest stints.' },
  { id: 'I', name: 'Intermediate', c: '#2fd673', grip: 60, life: 55, p: 'Grooved, for a damp or drying track and light rain.' },
  { id: 'W', name: 'Wet', c: '#2f8cff', grip: 48, life: 60, p: 'Full wets clear standing water in heavy rain.' },
];
const tyreChip = (id) => { const t = TYRES.find((x) => x.id === id) ?? TYRES[1]; return `<span class="tc" style="--c:${t.c}">${t.id}</span>`; };
const recommend = (wetness) => (wetness > 0.58 ? 'W' : wetness > 0.22 ? 'I' : 'S');

const TIPS = [
  'In qualifying the slowest six drop out after Q1 and again after Q2. Q3 decides the top ten.',
  'Track limits: all four wheels beyond the white line for a moment deletes the lap.',
  'Respect the pit lane speed limit. The limiter comes on as you cross the line.',
  'A car on a flying lap has priority: the others move aside on the straights.',
  'The track rubbers in through a session. The last minutes of qualifying are the quickest.',
  'Showers build gradually: clouds first, then drizzle. Watch the forecast before you go out.',
];

/** The circuit's outline into a canvas. */
function outline(canvas, L, colour, width) {
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  g.clearRect(0, 0, W, H);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < L.N; i++) { x0 = Math.min(x0, L.x[i]); x1 = Math.max(x1, L.x[i]); z0 = Math.min(z0, L.z[i]); z1 = Math.max(z1, L.z[i]); }
  const pad = width * 3, k = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (z1 - z0));
  const ox = (W - (x1 - x0) * k) / 2, oz = (H - (z1 - z0) * k) / 2;
  g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath();
  for (let i = 0; i <= L.N; i += 2) { const X = ox + (L.x[i % L.N] - x0) * k, Y = oz + (L.z[i % L.N] - z0) * k; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }
  g.closePath(); g.strokeStyle = colour; g.lineWidth = width; g.stroke();
  const X = ox + (L.x[0] - x0) * k, Y = oz + (L.z[0] - z0) * k;
  g.fillStyle = '#fff'; g.fillRect(X - width, Y - width * 1.6, width * 2, width * 3.2);
}

/** Weekend helpers bound to the front end. */
export function weekendScreens(fe, H) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); styled = true; }
  let root = fe.q('.wk');
  if (!root) { root = document.createElement('div'); root.className = 'wk'; fe.el.insertBefore(root, fe.q('.hints')); }
  const api = fe.weekend, run = api?.run;
  const season = () => fe.season;
  const team = () => TEAMS[Math.max(0, TEAMS.findIndex((t) => t.id === season()?.team))];
  const track = () => fe.tracks.find((t) => t.id === season()?.weekend?.trackId);
  const prefs = () => { const p = (season().weekendPrefs ??= { length: 'short', difficulty: 90 }); p.raceLength ??= 'medium'; return p; };
  const lapsOf = (d) => raceLaps(season().weekend.trackId, d.id === 'S' ? 'S' : 'R', prefs().raceLength);
  const lenText = (d) => (d.type === 'race' ? `${lapsOf(d)} laps` : `${d.minutes} min`);
  const gp = () => H.gpName(season().weekend.trackId);
  const mode = (on) => {
    fe.el.classList.add('wkmode');
    const t = team();
    fe.el.style.setProperty('--a', t.colours[0]);
    fe.el.style.setProperty('--ink', H.contrast(t.colours[0]));
    root.innerHTML = on ?? '';
    root.classList.toggle('dim', !!on && on.includes('class="mon"'));
    fe.tick = null;
  };
  const sessionsList = () => run.sessions();
  const nextSession = () => sessionsList().find((d) => d.status === 'open');
  const isNextId = (d) => d && nextSession()?.id === d.id;
  const liveDef = () => (run.session && run.session.state !== 'done' ? run.def : null);

  // ------------------------------------------------------------------------------- loading
  async function loading() {
    const s = season(), round = s.round ?? 0, [trackId] = H.calendar[Math.min(round, H.calendar.length - 1)];
    if (!s.weekend || s.weekend.trackId !== trackId || s.weekend.round !== round) { s.weekend = newWeekend(trackId, round); fe.saveSeason(); }
    const t = fe.tracks.find((x) => x.id === trackId), sprint = s.weekend.format === 'sprint';
    fe.frame({ tag: '', title: '', sub: '', hints: [] });
    mode(`<div class="load" style="background-image:url('${t ? H.trackImage(t) : ''}')"><canvas width="920" height="620"></canvas><div class="in">
      <small>Round ${round + 1} · ${esc(H.calendar[round][1])}${sprint ? '<b>Sprint weekend</b>' : ''}</small>
      <h1>${esc(H.gpName(trackId))}</h1><p>${esc(t?.name ?? '')} · ${t?.layout ? (t.layout.length / 1000).toFixed(3) + ' km' : ''} · ${H.turns[trackId] ?? '—'} turns</p>
      <div class="bar"><i></i></div><div class="step">Loading the circuit</div><div class="tip">${esc(TIPS[Math.floor(Math.random() * TIPS.length)])}</div></div></div>`);
    if (t?.layout) outline(root.querySelector('canvas'), t.layout, team().colours[0], 9);
    const bar = root.querySelector('.bar i'), step = root.querySelector('.step');
    const at = (p, txt) => { bar.style.width = `${p}%`; step.textContent = txt; };
    at(12, 'Loading the circuit');
    await new Promise((r) => setTimeout(r, 60));
    try {
      const ti = TEAMS.findIndex((x) => x.id === s.team);
      // The season's R&D: every car's rating at this circuit (the AI's pace) and the player's car in the physics.
      ensureSeasonState(s);
      fe.saveSeason();
      await api.prepare(s.weekend, { teamId: s.team, playerName: s.manager?.name || 'Player', difficulty: prefs().difficulty, length: prefs().length, paint: 1 + fe.liveryIndex(ti), onStep: at,
        ratings: ratingsAt(s.rd, trackId), car: (() => { const f = playerCarFactors(s.rd, trackId); return { ...f, power: f.power * powerFactor(s.loadout) }; })(), rd: s.rd, staff: staffMods(s.staff),
        // The rules: grid penalties for this round, the power unit's wear (power and the chance it fails), a race ban.
        gridPens: gridPenalties(s, s.round ?? 0), pu: { power: powerFactor(s.loadout), risk: failRisk(s.loadout) }, banned: bannedAt(s, `${s.team}-0`, s.round ?? 0) });
    } catch (err) {
      console.error(err);
      step.textContent = 'The weekend could not be loaded'; return;
    }
    at(100, 'Into the garage');
    await new Promise((r) => setTimeout(r, 350));
    if (fe.screen === 'loading') fe.go('garage');
  }

  // -------------------------------------------------------------------------------- garage
  function garage(view) {
    mode('');
    const t = team(), round = season().round ?? 0;
    fe.frame({ tag: `Round ${round + 1} · ${season().weekend.format === 'sprint' ? 'Sprint weekend' : 'Race weekend'}`, title: gp(), sub: `${t.full} garage · ${track()?.name ?? ''}`,
      hints: [['a', 'Use the monitor', () => fe.openMonitor()], ['y', 'Get in the car', () => (liveDef() ? fe.go('incar') : fe.openMonitor())], ['b', 'Leave the weekend', () => leave()]] });
    if (fe.stage?.which !== 'garage') fe.setScene('garage');
    const S = fe.stage;
    if (S?.garage) {
      drawMonitor();
      const { desk, screen } = S.garage.views;
      if (view === 'return' && liveDef()) { fe.placeCamera(screen); fe.go('monitor', 'live'); return; } // back from the track: straight to the timing
      if (view === 'back') { fe.placeCamera(screen); fe.tweenCamera(desk, 1.0); } else if (view === 'fromcar') { fe.placeCamera(S.garage.views.cockpit); fe.tweenCamera(desk, 1.2); } else if (!S.tween) fe.placeCamera(desk);
    }
    let k = 0;
    fe.tick = (dt) => { k += dt; if (k > 1) { k = 0; drawMonitor(); } };
  }
  function leave() {
    if (liveDef() && !confirm('Leave the weekend? The session in progress will be lost.')) return;
    api.leave();
    fe.go('office', 'back');
  }
  /** The weekend on the player's 3D monitor (seen from the desk). */
  function drawMonitor() {
    const G = fe.stage?.garage;
    if (!G) return;
    const t = team(), A = t.colours[0], list = sessionsList(), live = liveDef(), S = run.session;
    G.drawScreen((g, w, h) => {
      g.fillStyle = '#0b0d12'; g.fillRect(0, 0, w, h);
      g.fillStyle = A; g.fillRect(0, 0, 10, 92);
      g.fillStyle = '#9ca1ad'; g.font = '700 22px "Titillium Web", Arial'; g.fillText(`ROUND ${(season().round ?? 0) + 1} · ${season().weekend.format === 'sprint' ? 'SPRINT WEEKEND' : 'RACE WEEKEND'}`, 34, 38);
      g.fillStyle = '#fff'; g.font = '900 44px "Titillium Web", Arial'; g.fillText(gp().toUpperCase(), 34, 82, w - 60);
      const bw = (w - 60 - 4 * 12) / 5;
      list.forEach((d, i) => {
        const x = 30 + i * (bw + 12), y = 120, isLive = live && live.id === d.id, res = season().weekend.results[d.id], me = res?.find((r) => r.id === run.playerEntry?.id);
        g.fillStyle = isLive ? '#1d2230' : '#151922'; g.fillRect(x, y, bw, 300);
        g.strokeStyle = isLive || isNextId(d) ? A : '#2a2f3a'; g.lineWidth = isLive ? 5 : 2; g.strokeRect(x, y, bw, 300);
        g.globalAlpha = d.status === 'locked' ? 0.45 : 1;
        g.fillStyle = '#9ca1ad'; g.font = '700 20px "Titillium Web", Arial'; g.fillText(`${d.day.toUpperCase()} ${d.time}`, x + 14, y + 34);
        g.fillStyle = '#fff'; g.font = '900 30px "Titillium Web", Arial'; g.fillText(d.short, x + 14, y + 78);
        g.font = '600 18px "Titillium Web", Arial'; g.fillStyle = '#c9ccd4'; g.fillText(d.name.toUpperCase(), x + 14, y + 106, bw - 24);
        g.font = '900 26px "Titillium Web", Arial';
        if (isLive) { g.fillStyle = '#e10600'; g.fillText('LIVE', x + 14, y + 200); g.fillStyle = '#fff'; g.fillText(S.state === 'break' ? `NEXT ${fmtClock(S.breakLeft)}` : fmtClock(S.remaining), x + 14, y + 240); }
        else if (d.status === 'done') { g.fillStyle = '#2fd673'; g.fillText(me ? `P${me.pos}` : 'DONE', x + 14, y + 200); g.fillStyle = '#c9ccd4'; g.font = '600 22px "Titillium Web", Arial'; g.fillText(fmtLap(me?.best), x + 14, y + 236); }
        else if (d.status === 'locked') { g.fillStyle = '#9ca1ad'; g.fillText('SOON', x + 14, y + 200); }
        else { g.fillStyle = isNextId(d) ? A : '#9ca1ad'; g.fillText(isNextId(d) ? 'NEXT' : '—', x + 14, y + 200); g.fillStyle = '#c9ccd4'; g.font = '600 22px "Titillium Web", Arial'; g.fillText(lenText(d).toUpperCase(), x + 14, y + 236); }
        g.globalAlpha = 1;
      });
      g.fillStyle = '#7d828e'; g.font = '600 20px "Titillium Web", Arial'; g.fillText('CLICK THE SCREEN TO OPEN', 34, h - 40);
    });
  }

  // ------------------------------------------------------------------------------- monitor
  function monitor(page = 'schedule', arg = null) {
    if (page === 'schedule' && liveDef()) page = 'live';
    if (page === 'session') return sessionPage(arg ?? nextSession()?.id ?? 'FP1');
    if (page === 'live') return livePage();
    return schedulePage();
  }
  const header = (sub, right = '') => `<header><div class="t"><small>${esc(sub)}</small><b>${esc(gp())}</b></div>${right}</header>`;

  function schedulePage() {
    const list = sessionsList(), nxt = nextSession(), P = prefs(), sprint = season().weekend.format === 'sprint';
    const opts = `<div class="opt">Session length <div class="seg" data-o="length">${Object.entries(LENGTHS).map(([k, v]) => `<button data-v="${k}" class="${P.length === k ? 'on' : ''}">${v.name}</button>`).join('')}</div></div>
      <div class="opt">AI level <div class="seg" data-o="difficulty">${[70, 80, 90, 100, 110].map((v) => `<button data-v="${v}" class="${P.difficulty === v ? 'on' : ''}">${v}</button>`).join('')}</div></div>`;
    mode(`<div class="mon">${header(`Round ${(season().round ?? 0) + 1} · ${esc(track()?.name ?? '')}`, `${sprint ? '<span class="chip hot">Sprint weekend</span>' : ''}${opts}`)}
      <div class="body"><div class="sched">${list.map((d) => {
        const fc = sessionWeather(season().weekend, d).forecast, wx = fc[0], res = season().weekend.results[d.id], me = res?.find((r) => r.id === run.playerEntry?.id);
        const st = d.status === 'done' ? `Completed<b>${me ? 'P' + me.pos : '—'} · ${d.type === 'race' ? `${me?.points ?? 0} pts` : fmtLap(me?.best)}</b>` : d.status === 'locked' ? 'Coming soon<b>Locked</b>' : d.id === nxt?.id ? `Up next<b>${d.segments ? d.segments.map((m) => m + "'").join(' · ') : lenText(d)}</b>` : `Later<b>${lenText(d)}</b>`;
        return `<button class="sess ${d.status} ${d.id === nxt?.id ? 'next' : ''} ${liveDef()?.id === d.id ? 'live' : ''}" data-id="${d.id}"><span class="day"><b>${d.day}</b>${d.time}</span><h3>${esc(d.name)}</h3>
          <span class="len">${d.type === 'quali' ? `${d.prefix}1 · ${d.prefix}2 · ${d.prefix}3 knockout` : d.type === 'race' ? `${lapsOf(d)} laps · ${RACE_LENGTHS[prefs().raceLength].name} distance` : 'Free practice'}</span>
          ${res ? `<span class="pod">${res.slice(0, 3).map((r) => `<i><em style="background:${TEAMS.find((x) => x.id === r.team)?.colours[0]}"></em>${r.pos}. ${esc(r.code)}<small>${fmtLap(r.best)}</small></i>`).join('')}</span>` : ''}
          ${d.status === 'locked' ? '<span class="soon">The Grand Prix is coming soon</span>' : `<span class="strip">${fc.map((f) => `<i title="${esc(f.name)}">${WX_ICON[f.icon]}<small>${f.rain}%</small></i>`).join('')}</span>
          <span class="wx">${esc(wx.name)} at the start</span>`}<span class="st">${st}</span></button>`;
      }).join('')}</div></div>
      <div class="acts"><button class="btn" data-a="back">Back to the garage</button><span class="sp"></span>${list[0]?.status !== 'done' && !interviewDone(season(), 'pre') ? '<button class="btn" data-a="ivw">Pit lane interview · optional</button>' : ''}${nxt ? `<button class="btn primary" data-a="open">${esc(nxt.name)} ›</button>` : weekendOver() ? '<button class="btn primary" data-a="finish">Finish the weekend ›</button>' : ''}</div></div>`);
    root.querySelectorAll('.sess').forEach((b) => b.addEventListener('click', () => { if (!b.classList.contains('locked')) fe.go('monitor', 'session', b.dataset.id); }));
    root.querySelectorAll('.seg').forEach((seg) => seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      const o = seg.dataset.o, v = o === 'difficulty' ? +b.dataset.v : b.dataset.v;
      prefs()[o] = v; fe.saveSeason();
      if (o === 'length') run.length = v; else run.setDifficulty?.(v);
      schedulePage();
    })));
    wire({ back: () => fe.closeMonitor(), open: () => fe.go('monitor', 'session', nxt.id), finish: finishWeekend, ivw: () => interview('pre', () => schedulePage()) });
    fe.frame({ tag: '', title: '', sub: '', hints: [['a', nxt ? nxt.name : 'Garage', () => (nxt ? fe.go('monitor', 'session', nxt.id) : fe.closeMonitor())], ['b', 'Garage', () => fe.closeMonitor()]] });
    let sel = Math.max(0, list.findIndex((d) => d.id === nxt?.id));
    const els = [...root.querySelectorAll('.sess')];
    const pick = (i) => { sel = i; els.forEach((x, j) => x.classList.toggle('sel', j === i)); };
    fe.onStep = (d) => pick((sel + d + els.length) % els.length);
  }
  const weekendOver = () => sessionsList().every((d) => d.status !== 'open');
  function finishWeekend() {
    const s = season();
    if (s.rd) {
      // The constructors' order (for the aero testing allowance), the circuits coming up, the repair bills.
      const pts = s.points ?? {}, me = s.manager?.name || 'Player';
      const order = TEAMS.map((tm) => ({ id: tm.id, p: tm.drivers.reduce((a, d, k) => a + (pts[tm.id === s.team && k === 0 ? me : d.name] ?? 0), 0) })).sort((a, b) => b.p - a.p).map((x) => x.id);
      const upcoming = H.calendar.slice((s.round ?? 0) + 1).map(([id]) => id);
      const repairs = Object.fromEntries(TEAMS.map((tm) => [tm.id, tm.id === s.team ? s.weekend?.repairs ?? 0 : Math.random() < 0.35 ? Math.random() * 0.8e6 : 0]));
      rdAdvance(s.rd, { standings: order, upcoming, repairs, broken: s.weekend?.broken ?? {} });
    }
    s.round = Math.min((s.round ?? 0) + 1, H.calendar.length - 1);
    // The season's record: every race's classification (the team pages' stats), and the staff's weekend.
    const R = s.weekend?.results?.R, me = `${s.team}-0`;
    if (R) {
      const pack = (res) => res?.map((r) => [r.name, r.pos, r.grid, r.retired ? 1 : 0, r.points ?? 0, r.team]);
      (s.history ??= []).push({ round: s.round ?? 0, track: s.weekend.trackId, R: pack(R), S: pack(s.weekend.results.S), rc: s.weekend.raceControl?.R ?? null });
    }
    if (s.staff) staffWeekend(s.staff, { pos: R?.find((r) => r.id === me)?.pos ?? null, round: s.round ?? 0 });
    // The power units' mileage (a failure finishes the element), everyone's allocations, the licences.
    if (s.loadout) loadoutWeekend(s.loadout, { round: (s.round ?? 1) - 1, failed: s.weekend?.puFailed ?? null });
    fiaWeekend(s, (s.round ?? 1) - 1);
    s.weekend = null; fe.saveSeason();
    api.leave();
    fe.go('office', 'back');
  }
  function wire(map) { root.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => map[b.dataset.a]?.())); }

  function sessionPage(id, tab = 'overview') {
    const d = sessionsList().find((x) => x.id === id), t = track(), L = t?.layout;
    const wx = sessionWeather(season().weekend, d), res = season().weekend.results[d.id];
    const isNext = isNextId(d), wetNow = STAGE_RAIN(wx.forecast[0].stage);
    const tabs = [['overview', 'Overview'], ['weather', 'Weather'], ['tyres', 'Tyres'], ...(res ? [['results', 'Results']] : [])];
    let body = '';
    if (tab === 'overview' && d.type === 'race') {
      const gridRes = season().weekend.results[d.id === 'S' ? 'SQ' : 'Q'], me = gridRes?.find((r) => r.id === run.playerEntry?.id);
      const laps = lapsOf(d), real = raceLaps(season().weekend.trackId, d.id === 'S' ? 'S' : 'R', 'full');
      const plan = planStrategy(laps, { trackId: season().weekend.trackId, wearScale: Math.max(1, Math.min(6, real / laps)), wetness: wetNow ? 0.7 : 0, rand: () => 0.3 });
      const planTxt = plan.map((x) => `${COMPOUNDS[x.c].name} (${x.laps} laps)`).join(' → ');
      body = `<div class="grid2"><div class="kv">
          <span>Session</span><b>${esc(d.name)}</b><span>When</span><b>${d.day} ${d.time} local</b>
          <span>Distance</span><b>${laps} laps${L ? ` · ${((laps * L.length) / 1000).toFixed(1)} km` : ''}</b>
          <span>Your grid slot</span><b>${me ? `P${me.pos}` : 'Back of the grid'}</b>
          <span>Start</span><b><span class="seg rform"><button data-form="1" class="${prefs().formation !== false ? 'on' : ''}">Formation lap</button><button data-form="0" class="${prefs().formation === false ? 'on' : ''}">Straight to the lights</button></span></b>
          <span>Points</span><b>${POINTS[d.id === 'S' ? 'S' : 'R'].slice(0, 3).join(' · ')} … top ${POINTS[d.id === 'S' ? 'S' : 'R'].length}</b>
          <span>Conditions</span><b>${esc(wx.forecast[0].name)}${wetNow ? ' · wet track' : ''}</b>
          <span>Race length</span><b><span class="seg rlen">${Object.entries(RACE_LENGTHS).map(([k, v]) => `<button data-len="${k}" class="${prefs().raceLength === k ? 'on' : ''}">${v.name} · ${raceLaps(season().weekend.trackId, d.id === 'S' ? 'S' : 'R', k)}</button>`).join('')}</span></b>
        </div><div><canvas class="ol" width="640" height="340" style="width:100%;max-height:34vh;object-fit:contain"></canvas></div></div>
        <div class="note"><small>Race engineer · strategy</small>${esc(`Suggested: ${planTxt}. The formation lap first: warm the tyres, no overtaking, back to your box and park as close to it as you can. At the start hold SPACE (the clutch) with the revs up and let go when the lights go out. Box when I call it.`)}</div>`;
    } else if (tab === 'overview') {
      const brief = d.type === 'quali'
        ? `${d.segments.length} knockout segments of ${d.segments.map((m) => m + ' min').join(', ')}. The slowest six drop out after ${d.prefix}1 and ${d.prefix}2 (P17–22, then P11–16); ${d.prefix}3 sets the top ten. ${d.id === 'SQ' ? 'Sets the grid for the Sprint.' : 'Sets the grid for the Grand Prix.'}`
        : `${d.minutes} minutes of free practice. Learn the circuit, try the compounds, and set a representative lap. Out laps, in laps and laps that break track limits don't count.`;
      body = `<div class="grid2"><div class="kv">
          <span>Session</span><b>${esc(d.name)}</b><span>When</span><b>${d.day} ${d.time} local</b>
          <span>Length</span><b>${d.type === 'quali' ? d.segments.map((m, k) => `${d.prefix}${k + 1} ${m}'`).join(' · ') : d.minutes + ' minutes'}</b>
          <span>Circuit</span><b>${esc(t?.name ?? '')}</b><span>Lap</span><b>${L ? (L.length / 1000).toFixed(3) + ' km' : '—'} · ${H.turns[t?.id] ?? '—'} turns</b>
          <span>Pit lane limit</span><b>${L?.pit?.speedLimit ? Math.round(L.pit.speedLimit * 3.6) : 80} km/h</b><span>Conditions</span><b>${esc(wx.forecast[0].name)}${wetNow ? ' · wet track' : ''}</b>
          <span>Field</span><b>22 cars · AI level ${prefs().difficulty}</b>
        </div><div><canvas class="ol" width="640" height="340" style="width:100%;max-height:34vh;object-fit:contain"></canvas></div></div>
        <div class="note"><small>Race engineer</small>${esc(brief)}</div>`;
    } else if (tab === 'weather') {
      const step = Math.max(1, Math.round(d.minutes / 5));
      body = `<div class="fc">${wx.forecast.map((f, k) => `<div><small>${k === 0 ? 'START' : `+${k * step} MIN`}</small>${WX_ICON[f.icon]}<b>${esc(f.name)}</b><em>${f.rain}% rain</em></div>`).join('')}</div>
        <div class="note"><small>Outlook</small>${esc(outlook(wx.forecast))}</div>`;
    } else if (tab === 'tyres') {
      const rec = recommend(wetNow ? 0.7 : 0);
      body = `<div class="tyres">${TYRES.map((y) => `<div class="tyre" style="--c:${y.c}"><div class="ring">${y.id}</div><b>${y.name}</b><p>${esc(y.p)}</p>
        <div class="meter">Grip<i style="--v:${y.grip}%"></i></div><div class="meter">Life<i style="--v:${y.life}%"></i></div>${y.id === rec ? '<div class="meter" style="color:#2fd673">Recommended</div>' : ''}</div>`).join('')}</div>`;
    } else if (tab === 'results') body = resultsTable(d, res);
    const canStart = isNext && !liveDef();
    mode(`<div class="mon">${header(`${d.day} ${d.time} · ${d.name}`, `<span class="chip">${d.status === 'done' ? 'Completed' : isNext ? 'Up next' : d.status === 'locked' ? 'Locked' : 'Later'}</span>`)}
      <nav class="tabs">${tabs.map(([k, n]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('')}</nav>
      <div class="body">${body}</div>
      <div class="acts"><button class="btn" data-a="back">‹ Weekend</button><span class="sp"></span>
        ${canStart ? (d.type === 'race' ? (bannedAt(season(), `${season().team}-0`, season().round ?? 0) ? '<div class="ban">Super licence suspended: 12 penalty points. The reserve driver races this one.</div><button class="btn primary" data-a="simrace">Simulate the race ›</button>' : '<button class="btn" data-a="simrace">Simulate race</button><button class="btn primary" data-a="race">Onto the grid ›</button>') : '<button class="btn" data-a="sim">Simulate session</button><button class="btn primary" data-a="start">Start session ›</button>') : ''}</div></div>`);
    if (tab === 'overview' && L) outline(root.querySelector('canvas.ol'), L, team().colours[0], 8);
    root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => sessionPage(id, b.dataset.tab)));
    wire({ back: () => fe.go('monitor', 'schedule'), start: () => startSession(d), sim: () => simulate(d), race: () => startRace(d), simrace: () => simulateRace(d) });
    root.querySelectorAll('[data-len]').forEach((b) => b.addEventListener('click', () => { prefs().raceLength = b.dataset.len; fe.saveSeason(); sessionPage(id, tab); }));
    root.querySelectorAll('[data-form]').forEach((b) => b.addEventListener('click', () => { prefs().formation = b.dataset.form === '1'; fe.saveSeason(); sessionPage(id, tab); }));
    const order = tabs.map(([k]) => k), k0 = order.indexOf(tab);
    fe.onStep = (dd) => sessionPage(id, order[(k0 + dd + order.length) % order.length]);
    fe.frame({ tag: '', title: '', sub: '', hints: [...(canStart ? [['a', d.type === 'race' ? 'Onto the grid' : 'Start session', () => (d.type === 'race' ? startRace(d) : startSession(d))]] : []), ['b', 'Weekend', () => fe.go('monitor', 'schedule')]] });
  }
  /** Onto the grid: the race starts with the formation lap. */
  function startRace(d) {
    fe.tick = null;
    fe.hide();
    api.startRace(d, prefs().raceLength, { formation: prefs().formation !== false });
  }
  function simulateRace(d) {
    api.simulateRace(d, prefs().raceLength);
    fe.go('podium', d.id);
  }
  const STAGE_RAIN = (stage) => stage >= 5;
  function outlook(fc) {
    const wet = fc.map((f) => f.stage >= 5), first = wet.indexOf(true);
    if (first < 0) return fc.some((f) => f.stage >= 4) ? 'Dark clouds around, but the radar shows no rain for the session. Slicks.' : 'A dry session expected. Slicks all the way.';
    if (first === 0) return wet.every(Boolean) ? 'Rain throughout. Intermediates or full wets depending on the intensity.' : 'Wet at the start, drying later. Inters first; watch for the crossover to slicks.';
    return `Dry to start, with rain expected around a ${['', 'fifth', 'third', 'half', 'two thirds'][first] ?? 'late'} of the way in. Get a lap in early.`;
  }
  function resultsTable(d, res) {
    if (d.type === 'race') {
      const me = run.playerEntry?.id;
      const penTxt = (r) => (r.dsq ? 'DSQ' : (r.pens ?? []).map((p) => (p.pen === 't5' ? '+5s' : p.pen === 't10' ? '+10s' : p.pen === 'dt' ? 'DT' : '')).filter(Boolean).join(' '));
      return `<table><thead><tr><th>Pos</th><th>Driver</th><th>Team</th><th>Grid</th><th>Laps</th><th>Time / gap</th><th>Pits</th><th>Pen</th><th>Best lap</th><th>Pts</th></tr></thead><tbody>${res.map((r) => {
        const tm = TEAMS.find((x) => x.id === r.team), moved = r.grid - r.pos;
        const pt = penTxt(r);
        return `<tr class="${r.id === me ? 'me' : ''}"><td class="p">${r.dsq ? 'DSQ' : r.retired ? 'DNF' : r.pos}</td><td class="c n"><i style="background:${tm?.colours[0]}"></i>${esc(r.name)}</td><td>${esc(tm?.name ?? '')}</td>
          <td>${r.grid}${moved ? ` <span style="color:${moved > 0 ? '#2fd673' : '#ff6b6b'}">${moved > 0 ? '▲' : '▼'}${Math.abs(moved)}</span>` : ''}</td><td>${r.laps}</td><td>${r.pos === 1 && r.time != null ? fmtLap(r.time) : esc(r.gap ?? '')}</td><td>${r.pits}</td><td title="${esc((r.pens ?? []).map((p) => `${p.reason.toLowerCase()} (lap ${p.lap})`).join(', '))}" style="color:#ff8a80;font-weight:700">${esc(pt)}</td>
          <td class="${r.fastest ? 'purple' : ''}">${fmtLap(r.best)}</td><td><b>${r.points || ''}</b></td></tr>`;
      }).join('')}</tbody></table>`;
    }
    const quali = d.type === 'quali', me = run.playerEntry?.id;
    const best = Math.min(...res.map((r) => r.best ?? 1e9));
    return `<table><thead><tr><th>Pos</th><th>Driver</th><th>Team</th>${quali ? `<th>${d.prefix}1</th><th>${d.prefix}2</th><th>${d.prefix}3</th>` : '<th>Best</th><th>Gap</th>'}<th>Laps</th></tr></thead><tbody>${res.map((r) => {
      const tm = TEAMS.find((x) => x.id === r.team);
      return `<tr class="${r.id === me ? 'me' : ''} ${quali && (r.pos === 11 || r.pos === 17) ? 'cut' : ''}"><td class="p">${r.pos}</td><td class="c n"><i style="background:${tm?.colours[0]}"></i>${esc(r.name)}</td><td>${esc(tm?.name ?? '')}</td>
        ${quali ? r.q.map((x) => `<td>${x == null ? '' : fmtLap(x)}</td>`).join('') : `<td class="${r.best === best ? 'purple' : ''}">${fmtLap(r.best)}</td><td>${r.best == null || r.best === best ? '' : '+' + (r.best - best).toFixed(3)}</td>`}<td>${r.laps}</td></tr>`;
    }).join('')}</tbody></table>`;
  }

  function startSession(d) {
    api.start(d);
    fe.go('monitor', 'live');
  }
  /** Run a whole session without driving it (the field's laps worked out from their pace). */
  function simulate(d) {
    api.start(d);
    const S = run.session;
    for (let guard = 0; S.state !== 'done' && guard < 400; guard++) {
      if (S.state === 'green') S.autoPlayer();   // simulated: the player's car sets its times too
      if (S.state === 'break') S.startSegment(S.segment + 1);
      else if (S.state === 'chequer') S.endSegment();
      else S.skip(Math.max(30, S.lapEst * 3));
    }
    S.resultsShown = true;
    fe.go('results', d.id);
  }

  /**
   * The end of a session: the classification and the key numbers for the player (position, best lap,
   * gap, laps, the best sectors against the session's fastest). Closing it goes back to the garage.
   */
  function results(id) {
    const d = sessionsList().find((x) => x.id === id), res = season().weekend.results[id];
    if (!d || !res) { fe.go('garage'); return; }
    if (d.type === 'race') awardPoints(id, res);
    const me = res.find((r) => r.id === run.playerEntry?.id), quali = d.type === 'quali';
    if (d.type === 'race') return raceResults(d, res, me);
    const fastest = [0, 1, 2].map((k) => Math.min(...res.map((r) => r.sectors?.[k] ?? 1e9)));
    const lead = res[0];
    const theo = me?.sectors?.every((x) => x != null) ? me.sectors.reduce((a, b) => a + b, 0) : null;
    const card = (label, value, sub = '') => `<div><small>${label}</small><b>${value}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
    const verdict = !me ? '' : quali ? (me.pos <= 10 ? `Into ${d.prefix}3: starts P${me.pos}` : me.pos <= 16 ? `Out in ${d.prefix}2: starts P${me.pos}` : `Out in ${d.prefix}1: starts P${me.pos}`) : me.best == null ? 'No timed lap' : me.pos === 1 ? 'Fastest in the session' : `${tenthsTxt(me.best - lead.best)} off the fastest`;
    mode(`<div class="mon res">${header(`${d.name} · Classification`, '<span class="chip hot">Session over</span>')}
      <div class="body">
        <div class="sum">${card('Position', me ? `P${me.pos}` : '—', esc(verdict))}${card('Best lap', fmtLap(me?.best), me?.best != null && lead.best != null && me !== lead ? `+${(me.best - lead.best).toFixed(3)} to ${esc(lead.code)}` : '')}
          ${card('Laps', me?.laps ?? 0)}${card('Your best sectors', me?.sectors?.some((x) => x != null) ? me.sectors.map((x, k) => `<i class="${x != null && x <= fastest[k] + 1e-6 ? 'pu' : ''}">${x == null ? '—' : x.toFixed(3)}</i>`).join(' ') : '—', theo ? `Ideal lap ${fmtLap(theo)}` : '')}
          ${card('Fastest sectors', fastest.map((x) => `<i>${x >= 1e9 ? '—' : x.toFixed(3)}</i>`).join(' '), `Fastest lap ${esc(lead.code)} ${fmtLap(lead.best)}`)}</div>
        <div class="rgrid">${resultsTable(d, res)}${champTable(res)}</div></div>
      <div class="acts"><button class="btn" data-a="sched">Weekend schedule</button><span class="sp"></span><button class="btn primary" data-a="garage">Back to the garage ›</button></div></div>`);
    wire({ garage: () => fe.go('garage', 'back'), sched: () => fe.go('monitor', 'schedule') });
    fe.onStep = null;
    fe.frame({ tag: '', title: '', sub: '', hints: [['a', 'Back to the garage', () => fe.go('garage', 'back')], ['b', 'Schedule', () => fe.go('monitor', 'schedule')]] });
    fe.saveSeason();
  }
  const tenthsTxt = (x) => `${x.toFixed(3)} s`;
  /** The race's points into the season's tables (once per session). */
  function awardPoints(id, res) {
    const w = season().weekend, s = season();
    w.awarded ??= {};
    if (w.awarded[id]) return;
    w.awarded[id] = true;
    s.points ??= {};
    for (const r of res) if (r.points) s.points[r.name] = (s.points[r.name] ?? 0) + r.points;
    fe.saveSeason();
  }
  function raceResults(d, res, me) {
    const card = (label, value, sub = '') => `<div><small>${label}</small><b>${value}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
    const win = res[0], fl = res.find((r) => r.fastest), moved = me ? me.grid - me.pos : 0;
    const champ = Object.entries(season().points ?? {}).sort((a, b) => b[1] - a[1]), myChamp = champ.findIndex(([n]) => n === me?.name) + 1;
    mode(`<div class="mon res">${header(`${d.name} · Classification`, '<span class="chip hot">Chequered flag</span>')}
      <div class="body">
        <div class="sum">${card('Finished', me ? (me.retired ? 'DNF' : `P${me.pos}`) : '—', me ? `From P${me.grid}${moved ? ` · ${moved > 0 ? '+' : ''}${moved} places` : ''}` : '')}${card('Points', me?.points ?? 0, myChamp ? `P${myChamp} in the championship` : '')}
          ${card('Winner', esc(win.code), win.time != null ? fmtLap(win.time) : '')}${card('Fastest lap', fl ? esc(fl.code) : '—', fl ? fmtLap(fl.best) : '')}${card('Your race', me ? `${me.pits} stop${me.pits === 1 ? '' : 's'}` : '—', me?.stints?.length ? me.stints.map((c) => c).join(' → ') : '')}</div>
        <div class="rgrid">${resultsTable(d, res)}${champTable(res)}</div>${raceControlBox(d)}</div>
      <div class="acts"><button class="btn" data-a="sched">Weekend schedule</button><span class="sp"></span>${d.id === 'R' && !interviewDone(season(), 'post') ? '<button class="btn" data-a="ivw">Post-race interview · optional</button>' : ''}<button class="btn primary" data-a="garage">Back to the garage ›</button></div></div>`);
    wire({ garage: () => fe.go('garage', 'back'), sched: () => fe.go('monitor', 'schedule'), ivw: () => interview('post', () => fe.go('results', d.id)) });
    fe.onStep = null;
    fe.frame({ tag: '', title: '', sub: '', hints: [['a', 'Back to the garage', () => fe.go('garage', 'back')], ['b', 'Schedule', () => fe.go('monitor', 'schedule')]] });
    fe.saveSeason();
  }
  /**
   * Live interviews (optional): in the pit lane before first practice, in the media pen after the
   * Grand Prix. Three reporters, a question each, three answers; what's said goes in the news.
   */
  function interview(kind, back) {
    const s = season(), fp1 = sessionsList()[0];
    const wet = fp1 ? Math.round((sessionWeather(s.weekend, fp1).wet ?? 0) * 100) : 0;
    const newParts = s.rd?.specs ? Object.values(s.rd.fitted ?? {}).map((id) => s.rd.specs.find((x) => x.id === id)).filter((x) => x && !x.validated).length : 0;
    const ctx = interviewContext(s, kind, { gpName: H.gpName, playerId: run.playerEntry?.id, wetChance: wet, newParts });
    const items = buildInterview(s, kind, ctx);
    // The scene: the player behind a lectern, the press pack crowding in (front/ceremony.js).
    let pen = null;
    const me = { id: run.playerEntry?.id, name: s.manager?.name, team: s.team };
    fe.setScene('custom', (g) => (pen = buildMediaPen(g, { team: team(), look: lookOf(me), kind, reporters: items.map((x) => x.reporter) })));
    fe.tick = null;
    mode('<div class="ivwroot" style="position:absolute;inset:0"></div>');
    renderInterview(root.querySelector('.ivwroot'), {
      kind, items, onQuestion: (k) => pen?.setSpeaker(k),
      onAnswer: (it, a) => { recordAnswer(s, kind, it, a); fe.saveSeason(); },
      onDone: () => { if (!interviewDone(s, kind)) (s.interviews ??= []).push({ round: s.round ?? 0, kind, skipped: true }); fe.saveSeason(); fe.onStep = null; fe.setScene('garage'); back(); },
      frame: (hints, step) => { fe.frame({ tag: '', title: '', sub: '', hints }); fe.onStep = step; },
    });
  }
  /** Race control's summary: the Safety Car and VSC periods, the stewards' decisions. */
  function raceControlBox(d) {
    const rc = run.weekend?.raceControl?.[d.id];
    if (!rc) return '';
    const per = rc.periods.map((p) => `<span class="chip">${p.kind} · lap${p.to > p.from ? `s ${p.from}–${p.to}` : ` ${p.from}`}</span>`).join(' ');
    const dec = rc.decisions.map((x) => `<div><b>${esc(x.code)}</b> ${x.pen === 't5' ? '5 s time penalty' : x.pen === 't10' ? '10 s time penalty' : x.pen === 'dt' ? 'drive-through' : 'disqualified'} · ${esc(x.reason.toLowerCase())} <em>lap ${x.lap}</em></div>`).join('');
    return `<div class="rcbox"><h4>${FIA_MARK}Race control</h4><div class="per">${per || '<span class="chip">No Safety Car or VSC</span>'}</div><div class="dec">${dec || '<div>No penalties from the stewards.</div>'}</div></div>`;
  }
  /** The drivers' championship after this race: points and what this race added. */
  function champTable(res) {
    const pts = season().points ?? {}, me = season().manager?.name || 'Player';
    const gained = Object.fromEntries(res.map((r) => [r.name, r.points ?? 0]));
    const all = TEAMS.flatMap((tm) => tm.drivers.map((dd, k) => { const n = tm.id === season().team && k === 0 ? me : dd.name; return { n, tm, p: pts[n] ?? 0 }; })).sort((a, b) => b.p - a.p);
    return `<div class="champ"><h4>Drivers' championship</h4>${all.slice(0, 12).map((x, k) => `<div class="${x.n === me ? 'me' : ''}"><span>${k + 1}</span><i style="background:${x.tm.colours[0]}"></i><b>${esc(x.n)}</b><em>${x.p}</em>${gained[x.n] ? `<small>+${gained[x.n]}</small>` : '<small></small>'}</div>`).join('')}</div>`;
  }

  function livePage() {
    const S = run.session, d = run.def;
    mode(`<div class="mon">${header(`${d.day} ${d.time} · ${d.name}`, '<span class="chip hot">Live timing</span>')}
      <div class="body"><div class="live"><div class="tw"></div><div class="side">
        <div class="clock"><div><small class="lbl"></small><b class="clk"></b></div><div class="flag"></div></div>
        <div class="mine"></div><div class="feed"></div></div></div></div>
      <div class="acts"><button class="btn" data-a="back">‹ Weekend</button><button class="btn" data-a="s1">+1 min</button><button class="btn" data-a="s5">+5 min</button><button class="btn" data-a="flag">Skip to the flag</button>
        <span class="sp"></span><button class="btn" data-a="watch">Watch live</button><button class="btn primary" data-a="car">Get in the car ›</button></div></div>`);
    // The TV feed: the director's cameras over the field (onboards, trackside, the battles).
    const watch = () => { if (!run.session || run.racing || S.state === 'done') return; fe.tick = null; fe.hide(); if (!api.watch()) fe.show('monitor', 'live'); };
    wire({ back: () => schedulePage(), s1: () => { skip(60); draw(); }, s5: () => { skip(300); draw(); }, flag: () => { skip(1e6); draw(); }, watch });
    const tw = root.querySelector('.tw'), clk = root.querySelector('.clk'), lbl = root.querySelector('.lbl'), flag = root.querySelector('.flag'), mine = root.querySelector('.mine'), feed = root.querySelector('.feed');
    const carBtn = root.querySelector('[data-a="car"]'), watchBtn = root.querySelector('[data-a="watch"]'), skips = [...root.querySelectorAll('[data-a^="s"],[data-a="flag"]')];
    const draw = () => {
      if (S !== run.session) return;
      const quali = d.type === 'quali', seg = S.segment;
      S.refreshStatus('GARAGE');
      const order = S.standings(), key = (r) => (quali ? r.segBest[seg] : r.best), lead = key(order[0]);
      const cutAt = quali && seg < 2 ? (seg === 0 ? 16 : 10) : -1;
      tw.innerHTML = `<table><thead><tr><th>Pos</th><th>Driver</th><th>Best</th><th>Gap</th><th>Tyre</th><th>Laps</th><th>Status</th></tr></thead><tbody>${order.map((r, k) => {
        const out = S.out.has(r.id), t = out ? null : key(r);
        return `<tr class="${r.e.player ? 'me' : ''} ${out ? 'ko' : ''} ${k === cutAt ? 'cut' : ''}"><td class="p">${k + 1}</td><td class="c n"><i style="background:${r.e.colour}"></i>${esc(r.e.code)} <span style="color:#7d828e;font-weight:400">${esc(r.e.team.name)}</span></td>
          <td class="${t != null && t === S.overall.best ? 'purple' : ''}">${t == null ? (out ? fmtLap(r.segBest[r.outPos >= 17 ? 0 : 1]) : '—') : fmtLap(t)}</td><td>${t == null || k === 0 || lead == null ? '' : '+' + (t - lead).toFixed(3)}</td>
          <td>${tyreChip(r.e.player ? run.compound : r.compound)}</td><td>${r.laps}</td><td style="color:${r.status === 'FLYING' ? '#c77dff' : r.status === 'GARAGE' || r.status === 'OUT' ? '#7d828e' : '#d8dbe2'}">${r.status}</td></tr>`;
      }).join('')}</tbody></table>`;
      lbl.textContent = S.state === 'break' ? `${S.label} over · next segment` : S.state === 'done' ? 'Session over' : `${S.label} · remaining`;
      clk.textContent = S.state === 'break' ? fmtClock(S.breakLeft) : S.state === 'done' ? 'FINAL' : fmtClock(S.remaining);
      flag.className = `flag ${S.state === 'chequer' ? 'chequer' : S.state === 'break' ? 'break' : S.state === 'done' ? 'done' : ''}`;
      const p = S.player, pos = order.indexOf(p) + 1, knocked = S.out.has(p.id);
      mine.innerHTML = `<div><small>Position</small><b>${knocked ? 'OUT · P' + (p.outPos ?? pos) : 'P' + pos}</b></div><div><small>Best lap</small><b>${fmtLap(p.best)}</b></div><div><small>Laps</small><b>${p.laps}</b></div><div><small>Weather</small><b style="font-size:16px">${esc(run.weather.name)}</b></div>`;
      feed.innerHTML = S.events.slice().reverse().map((e) => `<div class="${e.kind}"><span>${fmtClock(e.t)}</span>${esc(e.text)}</div>`).join('');
      // Knocked out: the car stays in the garage; the main action is the TV feed of the rest of it.
      carBtn.textContent = S.state === 'break' && !knocked ? 'Next segment ›' : S.state === 'done' ? 'Results ›' : knocked ? 'Watch the session ›' : 'Get in the car ›';
      carBtn.disabled = !knocked && S.state === 'chequer';
      watchBtn.style.display = knocked || S.state === 'done' ? 'none' : '';
      skips.forEach((b) => { b.disabled = S.state !== 'green'; });
    };
    // The main action follows the session: drive, start the next segment, or see the results.
    const primary = () => {
      if (S.state === 'done') fe.go('results', d.id);
      else if (S.out.has(S.player.id)) watch();
      else if (S.state === 'break') { S.breakLeft = 0; draw(); }
      else if (S.state === 'green') fe.go('incar');
    };
    carBtn.addEventListener('click', primary);
    draw();
    let k = 0;
    fe.tick = (dt) => { k += dt; if (k > 0.5) { k = 0; draw(); if (S.state === 'done' && !S.resultsShown) { S.resultsShown = true; fe.go('results', d.id); } } };
    fe.frame({ tag: '', title: '', sub: '', hints: [['a', 'Continue', primary], ['b', 'Weekend', () => schedulePage()]] });
  }
  function skip(seconds) {
    const S = run.session;
    if (!S || S.state !== 'green') return;
    S.skip(Math.min(seconds, S.remaining + 1));
  }

  // --------------------------------------------------------------------------------- in car
  function incar() {
    const S = run.session, d = run.def;
    if (!S || S.state !== 'green') { fe.go('monitor', 'live'); return; }
    mode('');
    if (fe.stage?.which !== 'garage') fe.setScene('garage');
    const G = fe.stage?.garage;
    if (G) fe.tweenCamera(G.views.cockpit, 1.3);
    const wet = run.weather.wetness, rec = recommend(wet);
    let pick = run.compound && (run.compound === rec || (rec === 'S' && 'SMH'.includes(run.compound))) ? run.compound : rec;
    const draw = () => {
      root.innerHTML = `<div class="incar"><div class="info"><small>${esc(d.name)} · ${esc(S.label)} · ${fmtClock(S.remaining)} remaining · ${esc(run.weather.name)}</small><h2>Choose your tyres</h2>
        <div class="tyres">${TYRES.map((y) => `<button class="tyre ${y.id === pick ? 'on' : ''} ${y.id === rec ? 'rec' : ''}" data-t="${y.id}" style="--c:${y.c}"><div class="ring">${y.id}</div><b>${y.name}</b><small>${y.id === rec ? 'Recommended' : y.id === 'I' || y.id === 'W' ? 'Wet weather' : 'Slick'}</small></button>`).join('')}</div></div>
        <button class="goout" data-a="go"><small>${esc(gp())} · ${esc(S.label)}</small>Go out to track</button></div>`;
      root.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => { pick = b.dataset.t; draw(); }));
      wire({ go });
    };
    const go = () => {
      if (run.session?.state !== 'green') { fe.go('monitor', 'live'); return; }
      fe.tick = null;
      fe.hide();
      api.goOut(pick);
    };
    draw();
    const order = TYRES.map((y) => y.id);
    fe.onStep = (dd) => { pick = order[(order.indexOf(pick) + dd + order.length) % order.length]; draw(); };
    let k = 0;
    fe.tick = (dt) => { k += dt; if (k > 1) { k = 0; const sm = root.querySelector('.info small'); if (sm) sm.textContent = `${d.name} · ${S.label} · ${fmtClock(S.remaining)} remaining · ${run.weather.name}`; if (S.state !== 'green') fe.go('monitor', 'live'); } };
    fe.frame({ tag: '', title: '', sub: '', hints: [['a', 'Go out to track', go], ['b', 'Get out of the car', () => { fe.go('garage', 'fromcar'); }]] });
  }

  // ------------------------------------------------------------------------ after the race
  const lookOf = (r) => {
    if (r.id === run.playerEntry?.id) { const m = season().manager ?? {}; return { skin: m.skin ?? '#d6a476', hair: m.hair ?? 'short', hairCol: m.hairCol ?? '#2a1d14', facial: m.facial ?? 'none', glasses: m.glasses }; }
    const tm = TEAMS.find((x) => x.id === r.team);
    return tm?.drivers.find((x) => x.name === r.name) ?? tm?.drivers[0] ?? { skin: '#d6a476', hair: 'short', hairCol: '#2a1d14' };
  };
  const lower = (title, sub, cls = '') => `<div class="cer ${cls}"><small>${esc(sub)}</small><b>${esc(title)}</b></div>`;
  /** Parc fermé: out of the car (and the celebrations, after a podium). */
  function parc(id) {
    const res = season().weekend.results[id];
    const me = res?.find((r) => r.id === run.playerEntry?.id);
    if (!res || !me) { fe.go('podium', id); return; }
    const t = team(), ti = TEAMS.indexOf(t), next = () => fe.go('podium', id);
    fe.frame({ tag: '', title: '', sub: '', hints: [['a', 'Skip', next]] });
    // A podium: parc fermé, the P1-P3 spots and the celebrations. Otherwise (or out of the race): back
    // into the garage, out of the car, the crew and the engineer.
    if (me.pos <= 3 && !me.retired) {
      mode(lower(me.pos === 1 ? 'Winner!' : `P${me.pos} · Podium!`, `${gp()} · Parc fermé`, 'gold'));
      fe.setScene('custom', (g) => { const sc = buildParcFerme(g, { car: fe.makeCar(1 + fe.liveryIndex(ti)), team: t, look: lookOf(me), pos: me.pos }); sc.onDone = next; return sc; });
    } else {
      mode(lower(me.retired ? 'Out of the race' : `P${me.pos}${me.points ? ` · ${me.points} point${me.points > 1 ? 's' : ''}` : ''}`, `${gp()} · Back in the garage`));
      fe.setScene('custom', (g) => { const sc = buildGarageFinish(g, { car: fe.makeCar(1 + fe.liveryIndex(ti)), team: t, look: lookOf(me), pos: me.pos, points: me.points, dnf: me.retired }); sc.onDone = next; return sc; });
    }
  }
  /** The podium: the anthem, the trophies, the champagne. */
  function podium(id) {
    const res = season().weekend.results[id];
    if (!res) { fe.go('garage'); return; }
    const top = res.slice(0, 3).map((r) => ({ team: TEAMS.find((x) => x.id === r.team) ?? TEAMS[0], look: lookOf(r), code: r.code, name: r.name }));
    // Captions in the steps' order as seen from the crowd: second, the winner, third.
    mode(`<div class="cer pod">${[1, 0, 2].filter((k) => top[k]).map((k) => { const d = top[k]; return `<div class="${k === 0 ? 'win' : ''}"><i style="background:${d.team.colours[0]}"></i><small>P${k + 1}</small><b>${esc(d.name)}</b><span>${esc(d.team.name)}</span></div>`; }).join('')}</div>`);
    const next = () => fe.go('results', id);
    fe.frame({ tag: '', title: '', sub: '', hints: [['a', 'Results', next]] });
    fe.setScene('custom', (g) => { const sc = buildPodium(g, { top, gp: gp() }); sc.onDone = next; return sc; });
  }

  return { loading, garage, monitor, incar, results, parc, podium, drawMonitor };
}
