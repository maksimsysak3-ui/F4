import { TEAMS } from './teams.js?v=1a016bc';
import { newsFeed, OUTLETS } from '../game/news.js?v=1a016bc';
import { partImage, objectImage } from './parts3d.js?v=1a016bc';
import { buildPerson, setPose } from './people.js?v=1a016bc';
import { accent } from './rdHub.js?v=1a016bc';

/*
 * The News tab: the paddock press covering your season (laid out like FC's news centre): a breaking
 * ticker, the lead story big, filters by kind, a wall of stories, and a reader for each one. Every story
 * has its picture: the circuit for race reports and previews, a render of the part for technical
 * stories (in that team's colours), a 3D portrait of the driver or the team principal for interviews,
 * transfers and features, a social post for paddock rumours.
 */
const KINDS = [['all', 'All'], ['report', 'Race reports'], ['preview', 'Previews'], ['transfer', 'Transfers'], ['rumour', 'Rumours'], ['tech', 'Technical'], ['interview', 'Interviews'], ['stewards', 'Stewards'], ['feature', 'Features']];
const KIND_NAME = Object.fromEntries(KINDS);
const KIND_COL = { report: '#e10600', preview: '#3a8dff', transfer: '#ffd21f', rumour: '#c77dff', tech: '#2fd673', interview: '#ff8a20', stewards: '#ffffff', feature: '#ff5fa2' };
const CSS = `
.nw{display:grid;gap:14px;max-width:1360px;--line:#ffffff1c}
.nw .tick{display:flex;align-items:center;gap:12px;background:#000a;border:1px solid var(--line);border-radius:8px;overflow:hidden;height:38px}
.nw .tick b{background:#e10600;color:#fff;font:900 13px var(--cond);letter-spacing:.14em;padding:0 14px;height:100%;display:grid;place-items:center}
.nw .tick div{white-space:nowrap;animation:nwtick 60s linear infinite;font:600 14px var(--cond);color:#ffffffd0}
.nw .tick div span{margin-right:48px}.nw .tick div span i{font-style:normal;color:var(--a);margin-right:8px;font-weight:800}
@keyframes nwtick{from{transform:translateX(30%)}to{transform:translateX(-100%)}}
.nw .nwchips{display:flex;gap:6px;flex-wrap:wrap}
.nw .nwchips button{background:#ffffff12;border:1px solid var(--line);color:#fff;border-radius:16px;padding:6px 13px;font:700 13px var(--cond);letter-spacing:.06em;cursor:pointer}
.nw .nwchips button.on{background:var(--a);color:#000}
.nw .lead{display:grid;grid-template-columns:1.45fr 1fr;border-radius:12px;overflow:hidden;border:1px solid var(--line);background:#0009;cursor:pointer;min-height:340px}
.nw .lead .tx{padding:24px 26px;display:flex;flex-direction:column;gap:10px}
.nw .lead h2{margin:0;font:900 clamp(26px,2.6vw,40px)/1.05 var(--cond)}
.nw .lead p{margin:0;color:#ffffffc8;font-size:16px;line-height:1.45}
.nw .media{position:relative;overflow:hidden;background:#0b0d12}
.nw .media img{width:100%;height:100%;object-fit:cover;display:block}
.nw .media .shade{position:absolute;inset:0;background:linear-gradient(180deg,#0000 55%,#000b)}
.nw .media.port{background:radial-gradient(90% 90% at 50% 25%,color-mix(in srgb,var(--tc) 70%,#fff),color-mix(in srgb,var(--tc) 55%,#000) 60%,#050608)}
.nw .media.port img{object-fit:contain;object-position:50% 100%}
.nw .media.part{background:radial-gradient(110% 90% at 50% 35%,#2b313d,#07080b)}
.nw .media .stripe{position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--tc)}
.nw .media .badge{position:absolute;left:14px;top:12px;font:900 11px var(--cond);letter-spacing:.16em;padding:4px 8px;border-radius:3px;color:#111}
.nw .post{position:absolute;inset:14px;background:#15171d;border:1px solid #ffffff22;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;font-size:14px}
.nw .post .hd{display:flex;gap:10px;align-items:center}.nw .post .hd i{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font:900 13px var(--cond);font-style:normal;background:var(--tc);color:#111}
.nw .post .hd b{display:block;font-size:14px}.nw .post .hd small{color:#ffffff80;font-size:12px}
.nw .post p{margin:0;font-size:15px;line-height:1.35;color:#fff}
.nw .post .eng{display:flex;gap:18px;color:#ffffff80;font-size:12.5px;margin-top:auto}
.nw .kind{font:800 11px var(--cond);letter-spacing:.16em;text-transform:uppercase}
.nw .by{display:flex;gap:10px;align-items:center;margin-top:auto;color:#ffffffa8;font-size:13px}
.nw .by i{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#ffffff22;font:800 11px var(--cond);font-style:normal;color:#fff}
.nw .by b{color:#fff}
.nw .wall{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.nw .nwc{border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#0008;cursor:pointer;display:flex;flex-direction:column;transition:transform .15s,border-color .15s}
.nw .nwc:hover{transform:translateY(-3px);border-color:var(--a)}
.nw .nwc .media{aspect-ratio:16/9}
.nw .nwc .tx{padding:12px 14px;display:flex;flex-direction:column;gap:6px;flex:1}
.nw .nwc h4{margin:0;font:800 19px/1.15 var(--cond)}
.nw .nwc p{margin:0;color:#ffffffb0;font-size:13.5px;line-height:1.4}
.nw .stars{color:#ffd21f;letter-spacing:2px;font-size:12px}
.nw .reader{display:grid;grid-template-columns:1fr 330px;gap:16px}
.nw .art{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#0009}
.nw .art .media{aspect-ratio:21/9}
.nw .art .tx{padding:22px 28px 26px}
.nw .art h1{margin:6px 0 10px;font:900 clamp(30px,3vw,46px)/1.05 var(--cond)}
.nw .art .sf{font-size:18px;color:#ffffffd8;line-height:1.45;margin:0 0 16px}
.nw .art .body p{font-size:16px;line-height:1.65;color:#ffffffd0;margin:0 0 14px;max-width:760px}
.nw .art .by{margin:0 0 18px;padding-bottom:14px;border-bottom:1px solid var(--line)}
.nw .side{display:flex;flex-direction:column;gap:10px}
.nw .mini{display:grid;grid-template-columns:96px 1fr;gap:10px;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:#0008;cursor:pointer}
.nw .mini .media{height:64px}.nw .mini div.t,.nw .mini div.mt{padding:6px 8px 6px 0;font:700 13.5px/1.2 var(--cond)}
.nw .back{background:#ffffff14;border:1px solid var(--line);color:#fff;border-radius:6px;padding:7px 12px;font:700 13px var(--cond);letter-spacing:.08em;cursor:pointer;justify-self:start}
@media (max-width:1100px){.nw .lead,.nw .reader{grid-template-columns:1fr}.nw .wall{grid-template-columns:1fr 1fr}}
@media (max-width:700px){.nw .wall{grid-template-columns:1fr}}
`;
let styled = false;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ini = (n) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const teamOf = (id) => TEAMS.find((t) => t.id === id);

/** A 3D portrait of a driver (race suit) or a team principal (team polo), head and shoulders. */
function portrait(person) {
  const t = teamOf(person.team);
  if (!t) return '';
  const look = person.principal ? t.principal : t.drivers.find((d) => d.name === person.name) ?? t.drivers[0];
  const light = (c) => { const k = parseInt(c.slice(1), 16); return (0.299 * (k >> 16) + 0.587 * ((k >> 8) & 255) + 0.114 * (k & 255)) / 255 > 0.85; };
  const outfit = person.principal ? { kind: 'polo', main: light(t.colours[0]) ? t.colours[1] : t.colours[0], accent: t.colours[2] ?? '#fff' } : { kind: 'race', main: t.colours[0], accent: t.colours[1], patch: t.colours[2] };
  return objectImage(`portrait-${t.id}-${person.principal ? 'tp' : look.name}`, () => { const p = buildPerson(look, outfit); setPose(p, person.principal ? 'clasp' : 'idle'); p.rotation.y = -0.35; return p; },
    { dir: [0.18, 0.08, 1], fov: 20, w: 640, h: 400, frame: (box) => [box.max.y - (box.max.y - box.min.y) * 0.24, (box.max.y - box.min.y) * 0.55] });
}
/** The picture of a story. */
function media(a, ctx, cls = '') {
  const t = teamOf(a.team), tc = t ? accent(t) : '#3a8dff';
  const badge = `<span class="badge" style="background:${KIND_COL[a.kind] ?? '#fff'}">${esc(KIND_NAME[a.kind] ?? a.kind).toUpperCase()}</span>`;
  if (a.kind === 'rumour') {
    const o = OUTLETS[a.by.outlet], seed = a.title.length * 97 + a.round * 13;
    return `<div class="media ${cls}" style="--tc:${tc}"><div class="post"><div class="hd"><i>${ini(o)}</i><div><b>${esc(o)} <span style="color:#3a8dff">✔</span></b><small>@${o.replace(/\W/g, '')} · Round ${a.round}</small></div></div><p>${esc(a.title)} 👀</p><p style="color:#ffffffa0;font-size:13px">${esc(a.standfirst)}</p><div class="eng"><span>💬 ${(seed % 900) + 120}</span><span>🔁 ${(seed * 7) % 2400 + 300}</span><span>❤️ ${((seed * 13) % 9000 + 1200).toLocaleString()}</span></div></div></div>`;
  }
  if (a.kind === 'tech' && a.slot && t) {
    const team = { ...t, colours: [accent(t), ...t.colours.slice(1)] };
    return `<div class="media part ${cls}" style="--tc:${tc}"><img alt="" src="${partImage(a.slot, { dir: a.dir ?? [0.5, 0.5], n: a.n ?? 0, team }, { view: 'hero', w: 800, h: 450 })}"><div class="stripe"></div>${badge}</div>`;
  }
  if (a.person) return `<div class="media port ${cls}" style="--tc:${tc}"><img alt="" src="${portrait(a.person)}"><div class="shade"></div><div class="stripe"></div>${badge}</div>`;
  const tr = a.track ? ctx.trackImg(a.track, a.kind === 'preview' || a.kind === 'stewards' ? 'wide' : 'hero') : '';
  if (tr) return `<div class="media ${cls}" style="--tc:${tc}"><img alt="" src="${tr}"><div class="shade"></div><div class="stripe"></div>${badge}</div>`;
  return `<div class="media port ${cls}" style="--tc:${tc}">${t ? `<img alt="" src="${t.logo}" style="object-fit:contain;padding:12%;background:${t.logoBg}">` : ''}<div class="stripe"></div>${badge}</div>`;
}
const byline = (a) => `<div class="by"><i>${ini(a.by.name)}</i><div><b>${esc(a.by.name)}</b> · ${esc(OUTLETS[a.by.outlet])}<br><small>${esc(a.by.beat)} · Round ${a.round || 'pre-season'}</small></div></div>`;

/** Render the News tab. ctx: { season, state, gpName, calendar, trackImg(id), rerender() }. */
export function newsPage(ctx) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); styled = true; }
  const s = ctx.season, S0 = ctx.state, me = TEAMS.find((t) => t.id === s.team);
  const all = newsFeed(s, { gpName: ctx.gpName, calendar: ctx.calendar });
  const kind = S0.kind ?? 'all', list = all.filter((a) => kind === 'all' || a.kind === kind);
  const open = S0.open ? all.find((a) => a.id === S0.open) : null;
  let body;
  if (open) {
    const rel = all.filter((a) => a !== open && (a.team === open.team || a.kind === open.kind)).slice(0, 5);
    body = `<button class="back" data-back>‹ All the news</button><div class="reader"><div class="art">${media(open, ctx)}<div class="tx"><div class="kind" style="color:${KIND_COL[open.kind]}">${esc(KIND_NAME[open.kind])}${open.reliability ? ` · <span class="stars">${'★'.repeat(open.reliability)}${'☆'.repeat(5 - open.reliability)}</span>` : ''}</div><h1>${esc(open.title)}</h1><p class="sf">${esc(open.standfirst)}</p>${byline(open)}<div class="body">${open.body.filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('')}</div></div></div>
      <div class="side"><div class="kind" style="color:#ffffffa0">More like this</div>${rel.map((a) => `<div class="mini" data-open="${a.id}">${media(a, ctx)}<div class="t">${esc(a.title)}</div></div>`).join('')}</div></div>`;
  } else {
    const lead = list.find((a) => a.hot) ?? list[0], rest = list.filter((a) => a !== lead);
    body = `<div class="tick"><b>LATEST</b><div>${all.slice(0, 8).map((a) => `<span><i>${esc(KIND_NAME[a.kind]).toUpperCase()}</i>${esc(a.title)}</span>`).join('')}</div></div>
      <div class="nwchips">${KINDS.map(([k, n]) => `<button data-kind="${k}" class="${k === kind ? 'on' : ''}">${n} <span style="opacity:.6">${k === 'all' ? all.length : all.filter((a) => a.kind === k).length}</span></button>`).join('')}</div>
      ${lead ? `<div class="lead" data-open="${lead.id}">${media(lead, ctx)}<div class="tx"><div class="kind" style="color:${KIND_COL[lead.kind]}">${esc(KIND_NAME[lead.kind])}</div><h2>${esc(lead.title)}</h2><p>${esc(lead.standfirst)}</p>${byline(lead)}</div></div>` : '<div class="muted">No stories yet.</div>'}
      <div class="wall">${rest.slice(0, 30).map((a) => `<div class="nwc" data-open="${a.id}">${media(a, ctx)}<div class="tx"><div class="kind" style="color:${KIND_COL[a.kind]}">${esc(KIND_NAME[a.kind])}${a.reliability ? ` <span class="stars">${'★'.repeat(a.reliability)}${'☆'.repeat(5 - a.reliability)}</span>` : ''}</div><h4>${esc(a.title)}</h4><p>${esc(a.standfirst)}</p>${byline(a)}</div></div>`).join('')}</div>`;
  }
  return {
    html: `<div class="nw" style="--a:${accent(me)}">${body}</div>`,
    wire(root) {
      root.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => { S0.kind = b.dataset.kind; ctx.rerender(); }));
      root.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => { S0.open = b.dataset.open; ctx.rerender(); root.closest('.hub-page')?.scrollTo(0, 0); }));
      root.querySelector('[data-back]')?.addEventListener('click', () => { S0.open = null; ctx.rerender(); });
    },
    pages: 1,
  };
}

/** The latest stories as compact rows (the hub's home page). */
export function latestNews(ctx, n = 3) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); styled = true; }
  const all = newsFeed(ctx.season, { gpName: ctx.gpName, calendar: ctx.calendar }).slice(0, n);
  return `<div class="nw" style="gap:8px">${all.map((a) => `<div class="mini" style="grid-template-columns:120px 1fr">${media(a, ctx)}<div class="mt"><div class="kind" style="color:${KIND_COL[a.kind]};font-size:10px">${esc(KIND_NAME[a.kind])}</div>${esc(a.title)}</div></div>`).join('')}</div>`;
}
