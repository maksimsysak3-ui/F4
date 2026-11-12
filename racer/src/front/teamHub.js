import { TEAMS } from './teams.js';
import { DRIVERS } from '../game/grid.js';
import { NUMBERS } from '../game/raceControl.js';
import { ROLES, ROLE_IDS, newStaff, hire, effectText, staffMods } from '../game/staff.js';
import { COST_CAP, fmtM, PU, PU_NAME } from '../game/rd.js';
import { accent } from './rdHub.js';
import { faceImage } from './faces.js';

/*
 * The Team tab of the season hub: the drivers and the people who run the team.
 *
 *   Drivers   both cars' drivers: number, ratings, the season so far (points, wins, podiums, best and
 *             average finish, retirements), the head-to-head with the team-mate (grid and race), every
 *             round's result as a strip
 *   Staff     the team principal and the seven department heads: rating against potential, morale,
 *             contract, salary, and what each one does to the car and the races
 *   Market    people looking for a seat, by role: sign one (a fee inside the cost cap) and the one in
 *             the role now leaves
 *   Team      the organisation: base, power unit, principal, the car, the season's record
 */
const PAGES = ['Drivers', 'Staff', 'Market', 'The team'];
const CSS = `
.tm{display:grid;gap:14px;max-width:1360px;--line:#ffffff1c;--panel:linear-gradient(180deg,#ffffff0d,#ffffff05)}
.tm .tmrow{display:grid;gap:14px}.tm .c2{grid-template-columns:1fr 1fr}.tm .c4{grid-template-columns:repeat(4,1fr)}
.tm .tmc{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px 18px;min-width:0;position:relative;box-shadow:0 10px 30px #0004;overflow:hidden}
.tm h3{margin:0 0 12px;font:700 12.5px var(--cond);letter-spacing:.18em;text-transform:uppercase;color:#ffffffa8;display:flex;justify-content:space-between;gap:10px}
.tm h3 em{font-style:normal;color:#fff;letter-spacing:.04em}
.tm .muted{color:#ffffff99;font-size:13px;line-height:1.45}
.tm .drv{display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center;margin:-16px -18px 14px;padding:18px;background:linear-gradient(110deg,color-mix(in srgb,var(--a) 55%,#000) 0%,#0000 70%);border-bottom:1px solid var(--line)}
.tm .num{font:900 64px/0.9 var(--cond);color:#fff;text-shadow:0 4px 18px #0008;min-width:84px;text-align:center}
.tm .drv b{display:block;font:900 30px/1 var(--cond);text-transform:uppercase}
.tm .drv small{font:700 12px var(--cond);letter-spacing:.16em;color:#ffffffc0;text-transform:uppercase}
.tm .tmstats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:6px 0 14px}
.tm .tmstats div{background:#0006;border:1px solid var(--line);border-radius:8px;padding:9px 10px}
.tm .tmstats small{display:block;font:700 10.5px var(--cond);letter-spacing:.14em;color:#ffffff90;text-transform:uppercase}
.tm .tmstats b{display:block;font:800 26px var(--cond);line-height:1.1}
.tm .tmbars{display:grid;gap:7px}
.tm .tmbar{display:grid;grid-template-columns:120px 1fr 40px;gap:10px;align-items:center;font-size:13.5px}
.tm .tmbar i{height:8px;border-radius:4px;background:#ffffff14;position:relative}.tm .tmbar i u{position:absolute;inset:0 auto 0 0;border-radius:4px;background:var(--a)}
.tm .tmbar b{text-align:right;font-variant-numeric:tabular-nums}
.tm .strip{display:flex;gap:4px;flex-wrap:wrap;margin-top:12px}
.tm .strip span{width:30px;height:30px;border-radius:5px;display:grid;place-items:center;font:800 13px var(--cond);background:#ffffff12}
.tm .strip span.p1{background:#ffd21f;color:#111}.tm .strip span.pod{background:#ffffffd0;color:#111}.tm .strip span.pts{background:color-mix(in srgb,var(--a) 70%,#000)}.tm .strip span.dnf{background:#ff4d4d55}
.tm .h2h{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;text-align:center;font:800 28px var(--cond)}
.tm .h2h small{display:block;font:700 11px var(--cond);letter-spacing:.14em;color:#ffffff90}
.tm .people{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.tm .person{display:grid;grid-template-columns:64px 1fr 74px;gap:12px;align-items:center;background:#0006;border:1px solid var(--line);border-radius:10px;padding:12px}
.tm .av{width:64px;height:64px;border-radius:50%;overflow:hidden;display:grid;place-items:center;font:900 22px var(--cond);color:#fff;background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--a) 85%,#fff),color-mix(in srgb,var(--a) 50%,#000));box-shadow:0 0 0 3px #ffffff18}
.tm .person b{display:block;font:800 17px var(--cond)}.tm .person small{display:block;font:700 10.5px var(--cond);letter-spacing:.14em;color:#ffffff99;text-transform:uppercase}
.tm .person .fx{font-size:12px;color:#9ff0c0;margin-top:4px}
.tm .person .meta{font-size:12px;color:#ffffffa0;margin-top:3px}
.tm .tmring{width:74px;height:74px}
.tm .mor{height:4px;border-radius:2px;background:#ffffff14;margin-top:5px}.tm .mor u{display:block;height:100%;border-radius:2px;background:#2fd673}
.tm .btn{background:#eef0f4;color:#14161c;border:0;border-radius:6px;font:800 12.5px var(--cond);letter-spacing:.08em;text-transform:uppercase;padding:7px 10px;cursor:pointer}
.tm .btn.acc{background:var(--a);color:#000}.tm .btn:disabled{opacity:.4;cursor:default}
.tm .tmchips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.tm .tmchips button{background:#ffffff14;border:1px solid var(--line);color:#fff;border-radius:16px;padding:5px 12px;font:700 12.5px var(--cond);letter-spacing:.06em;cursor:pointer}
.tm .tmchips button.on{background:var(--a);color:#000}
.tm table{width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums}
.tm th{font:700 11px var(--cond);letter-spacing:.14em;text-transform:uppercase;color:#ffffff90;text-align:left;padding:6px 8px;border-bottom:1px solid #ffffff22}
.tm td{padding:8px;border-bottom:1px solid #ffffff10;vertical-align:middle}
.tm .kv{display:grid;grid-template-columns:1fr auto;gap:7px 14px;font-size:14px}.tm .kv span{color:#ffffffa0}.tm .kv b{text-align:right}
.tm .err{color:#ff8a80;font-size:12.5px;min-height:15px;margin-top:6px}
@media (max-width:1100px){.tm .c2,.tm .c4{grid-template-columns:1fr}.tm .tmstats{grid-template-columns:repeat(2,1fr)}}
`;
let styled = false;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const initials = (n) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
/** A person's face (3D render) in the team's polo, as an avatar. */
const face = (p, team, size = 64) => `<img alt="" src="${faceImage(p, { kind: 'polo', main: team.colours[0], accent: team.colours[1] ?? '#fff' })}" style="width:${size}px;height:${size}px;object-fit:cover;display:block">`;
/** A rating ring: the rating against 100, the potential as a faint outer arc. */
function ring(r, pot = null) {
  const C = 2 * Math.PI * 30, f = Math.max(0, Math.min(1, r / 100)), fp = pot ? Math.max(0, Math.min(1, pot / 100)) : 0;
  const col = r >= 85 ? '#2fd673' : r >= 72 ? '#ffd21f' : r >= 60 ? '#ff8a20' : '#ff4d4d';
  return `<svg class="tmring" viewBox="0 0 74 74"><circle cx="37" cy="37" r="30" fill="none" stroke="#ffffff14" stroke-width="6"/>${pot ? `<circle cx="37" cy="37" r="30" fill="none" stroke="#ffffff38" stroke-width="6" stroke-dasharray="${C * fp} ${C}" transform="rotate(-90 37 37)" stroke-linecap="round"/>` : ''}<circle cx="37" cy="37" r="30" fill="none" stroke="${col}" stroke-width="6" stroke-dasharray="${C * f} ${C}" transform="rotate(-90 37 37)" stroke-linecap="round"/><text x="37" y="44" text-anchor="middle" font-size="21" font-weight="800" fill="#fff" font-family="Titillium Web,Arial">${Math.round(r)}</text></svg>`;
}

/** Render the Team tab. ctx: { season, sub, state, goSub(k), rerender(), save(), pay($) -> error|null }. */
export function teamPage(ctx) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); styled = true; }
  const s = ctx.season, team = TEAMS.find((t) => t.id === s.team), A = accent(team);
  if (!s.staff || s.staff.team !== s.team) { s.staff = newStaff(s.team); s.staff.team = s.team; }
  const staff = s.staff, sub = Math.max(0, Math.min(PAGES.length - 1, ctx.sub ?? 0)), S0 = ctx.state;
  const me = s.manager?.name || 'Player';
  const nav = `<div class="hub-sub">${PAGES.map((p, k) => `<button data-tmsub="${k}" class="${k === sub ? 'on' : ''}">${p}</button>`).join('')}</div>`;
  const history = s.history ?? [];
  let body = '';
  const wires = [];

  if (sub === 0) {
    // ---- Drivers ----
    const seats = team.drivers.map((d, k) => ({ name: k === 0 ? me : d.name, real: d.name, k, info: DRIVERS[d.name] ?? null }));
    const statsOf = (name) => {
      const res = history.map((h) => h.R?.find((r) => r[0] === name)).filter(Boolean);
      const fin = res.filter((r) => !r[3]);
      return { races: res.length, pts: s.points?.[name] ?? 0, wins: res.filter((r) => r[1] === 1 && !r[3]).length, podiums: res.filter((r) => r[1] <= 3 && !r[3]).length,
        best: fin.length ? Math.min(...fin.map((r) => r[1])) : null, avg: fin.length ? fin.reduce((a, r) => a + r[1], 0) / fin.length : null, dnf: res.filter((r) => r[3]).length, strip: res.map((r) => (r[3] ? 'DNF' : r[1])) };
    };
    const st = seats.map((d) => statsOf(d.name));
    const h2h = (key) => history.reduce((acc, h) => { const a = h.R?.find((r) => r[0] === seats[0].name), b = h.R?.find((r) => r[0] === seats[1].name); if (!a || !b) return acc; const va = key === 'grid' ? a[2] : a[3] ? 99 : a[1], vb = key === 'grid' ? b[2] : b[3] ? 99 : b[1]; if (va < vb) acc[0]++; else if (vb < va) acc[1]++; return acc; }, [0, 0]);
    const champ = Object.entries(s.points ?? {}).sort((a, b) => b[1] - a[1]);
    const rank = (n) => champ.findIndex(([x]) => x === n) + 1 || '—';
    const ratingBars = (d) => {
      const r = d.k === 0 ? null : d.info;
      if (!r) return `<div class="muted">You drive the first car: your speed is your own. The team-mate is rated against the grid.</div>`;
      return `<div class="tmbars">${[['Pace', r.pace], ['Racecraft', r.craft], ['Aggression', r.aggr]].map(([k, v]) => `<div class="tmbar"><span>${k}</span><i><u style="width:${v}%"></u></i><b>${v}</b></div>`).join('')}</div>`;
    };
    body = `<div class="tmrow c2">${seats.map((d, i) => {
      const x = st[i], code = d.k === 0 ? (DRIVERS[d.real]?.code ?? 'YOU') : d.info?.code ?? '';
      return `<div class="tmc"><div class="drv"><div class="num">${NUMBERS[code] ?? 0}</div><div><small>${d.k === 0 ? 'Car 1 · You' : 'Car 2 · Team-mate'} · P${rank(d.name)} in the championship</small><b>${esc(d.name)}</b><small>${esc(team.full)}</small></div></div>
        <div class="tmstats"><div><small>Points</small><b>${x.pts}</b></div><div><small>Wins</small><b>${x.wins}</b></div><div><small>Podiums</small><b>${x.podiums}</b></div><div><small>Best</small><b>${x.best ? `P${x.best}` : '—'}</b></div>
          <div><small>Races</small><b>${x.races}</b></div><div><small>Average</small><b>${x.avg ? x.avg.toFixed(1) : '—'}</b></div><div><small>DNF</small><b>${x.dnf}</b></div><div><small>Contract</small><b>${d.k === 0 ? '2027' : '2026'}</b></div></div>
        ${ratingBars(d)}
        <div class="strip">${x.strip.map((p) => `<span class="${p === 'DNF' ? 'dnf' : p === 1 ? 'p1' : p <= 3 ? 'pod' : p <= 10 ? 'pts' : ''}">${p === 'DNF' ? '×' : p}</span>`).join('') || '<span class="muted" style="width:auto;background:none">No races yet</span>'}</div></div>`;
    }).join('')}</div>
    <div class="tmrow c2"><div class="tmc"><h3>Head to head <em>${history.length} races</em></h3><div class="h2h"><div>${h2h('grid')[0]}<small>${esc(seats[0].name)}</small></div><div><small>ON THE GRID</small></div><div>${h2h('grid')[1]}<small>${esc(seats[1].name)}</small></div></div>
      <div class="h2h" style="margin-top:14px"><div>${h2h('race')[0]}</div><div><small>IN THE RACE</small></div><div>${h2h('race')[1]}</div></div></div>
      <div class="tmc"><h3>Team in the championship</h3><div class="kv"><span>Points</span><b>${st[0].pts + st[1].pts}</b><span>Wins</span><b>${st[0].wins + st[1].wins}</b><span>Podiums</span><b>${st[0].podiums + st[1].podiums}</b><span>Retirements</span><b>${st[0].dnf + st[1].dnf}</b></div></div></div>`;
  } else if (sub === 1) {
    // ---- Staff ----
    body = `<div class="tmc"><h3>Senior staff <em>Team principal: ${esc(staff.principal)}</em></h3><div class="muted" style="margin-bottom:12px">Ratings grow towards each person's potential (the faint ring) with every weekend, faster when morale is high. Each one changes something real: hover a card for what.</div>
      <div class="people">${ROLE_IDS.map((role) => {
        const p = staff.people[role];
        return `<div class="person" title="${esc(ROLES[role].effect)}"><div class="av">${face(p, team)}</div><div><small>${esc(ROLES[role].name)}</small><b>${esc(p.name)}</b><div class="meta">${p.flag} · ${p.age} · ${p.years} yr${p.years > 1 ? 's' : ''} · $${p.salary.toFixed(1)}M</div><div class="fx">${esc(effectText(role, staff))}</div><div class="mor"><u style="width:${Math.round(p.morale * 100)}%"></u></div></div><div>${ring(p.rating, p.potential)}<button class="btn" style="width:100%;margin-top:6px" data-repl="${role}">Replace</button></div></div>`;
      }).join('')}</div></div>`;
    wires.push((root) => root.querySelectorAll('[data-repl]').forEach((b) => b.addEventListener('click', () => { S0.role = b.dataset.repl; ctx.goSub(2); })));
  } else if (sub === 2) {
    // ---- Market ----
    const role = S0.role && ROLES[S0.role] ? S0.role : null;
    const list = staff.market.filter((p) => !role || p.role === role).sort((a, b) => b.rating - a.rating);
    body = `<div class="tmc"><h3>Staff market <em>Fees come out of the cost cap</em></h3>
      <div class="tmchips"><button data-role="" class="${role ? '' : 'on'}">All roles</button>${ROLE_IDS.map((r) => `<button data-role="${r}" class="${role === r ? 'on' : ''}">${ROLES[r].name}</button>`).join('')}</div>
      <table><thead><tr><th></th><th>Name</th><th>Role</th><th>Rating</th><th>Potential</th><th>Age</th><th>vs yours</th><th>Fee</th><th></th></tr></thead><tbody>
      ${list.map((p) => { const cur = staff.people[p.role], diff = Math.round(p.rating - cur.rating); return `<tr><td><div class="av" style="width:44px;height:44px;font-size:13px">${face(p, { colours: ['#2a2d35', '#9aa0aa'] }, 44)}</div></td><td><b>${esc(p.name)}</b> <span class="muted">${p.flag}</span></td><td>${esc(ROLES[p.role].name)}</td><td>${ring(p.rating).replace('class="tmring"', 'class="tmring" style="width:44px;height:44px"')}</td><td>${p.potential}</td><td>${p.age}</td><td style="color:${diff > 0 ? '#2fd673' : diff < 0 ? '#ff6b6b' : '#fff'};font-weight:800">${diff > 0 ? '+' : ''}${diff}</td><td>${fmtM(p.fee * 1e6)}</td><td><button class="btn acc" data-hire="${p.id}">Sign</button></td></tr>`; }).join('') || '<tr><td colspan="9" class="muted">Nobody available for this role right now. The market changes every few rounds.</td></tr>'}</tbody></table><div class="err" data-err></div></div>`;
    wires.push((root) => {
      root.querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', () => { S0.role = b.dataset.role || null; ctx.rerender(); }));
      root.querySelectorAll('[data-hire]').forEach((b) => b.addEventListener('click', () => {
        const p = staff.market.find((x) => x.id === b.dataset.hire);
        if (!p || !confirm(`Sign ${p.name} as ${ROLES[p.role].name} for ${fmtM(p.fee * 1e6)}? ${staff.people[p.role].name} leaves.`)) return;
        const e = hire(staff, p.id, ctx.pay);
        if (e) { root.querySelector('[data-err]').textContent = e; return; }
        if (s.rd) s.rd.mods = staffMods(staff);
        ctx.save(); ctx.goSub(1);
      }));
    });
  } else {
    // ---- The team ----
    const pts = s.points ?? {}, tp = team.drivers.reduce((a, d, k) => a + (pts[k === 0 ? me : d.name] ?? 0), 0);
    const order = TEAMS.map((t) => ({ t, p: t.drivers.reduce((a, d, k) => a + (pts[t.id === s.team && k === 0 ? me : d.name] ?? 0), 0) })).sort((a, b) => b.p - a.p);
    body = `<div class="tmrow c2"><div class="tmc"><h3>${esc(team.full)}</h3><div class="kv"><span>Team principal</span><b>${esc(staff.principal)}</b><span>Team manager</span><b>${esc(me)}</b><span>Base</span><b>${esc(team.base)}</b><span>Power unit</span><b>${PU_NAME[PU[team.id]]}${PU[team.id] === team.id || ['mercedes', 'ferrari', 'redbull'].includes(team.id) ? ' (works)' : ' (customer)'}</b><span>Car</span><b>2026 · ${esc(team.name)}</b><span>Constructors'</span><b>P${order.findIndex((x) => x.t === team) + 1} · ${tp} pts</b><span>Cost cap used</span><b>${s.rd ? fmtM(s.rd.teams[s.team].spent) : '—'} of ${fmtM(COST_CAP)}</b></div></div>
      <div class="tmc"><h3>Season so far <em>${history.length} race${history.length === 1 ? '' : 's'}</em></h3>${history.slice().reverse().slice(0, 8).map((h) => { const mine = h.R.filter((r) => r[5] === s.team); return `<div class="kv" style="padding:5px 0;border-bottom:1px solid #ffffff10"><span>Round ${h.round + 1} · ${esc(h.track)}</span><b>${mine.map((r) => (r[3] ? 'DNF' : `P${r[1]}`)).join(' · ')}</b></div>`; }).join('') || '<div class="muted">No races yet.</div>'}</div></div>`;
  }
  return {
    html: `<div class="tm" style="--a:${A}">${nav}${body}</div>`,
    wire(root) { root.querySelectorAll('[data-tmsub]').forEach((b) => b.addEventListener('click', () => ctx.goSub(+b.dataset.tmsub))); for (const w of wires) w(root); },
    pages: PAGES.length,
  };
}
