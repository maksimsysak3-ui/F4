import { TEAMS } from './teams.js?v=1a016bc';
import { COST_CAP, fmtM } from '../game/rd.js?v=1a016bc';
import { CHAPTERS, RULES, licences, gridPenalties, capStatus, driverName } from '../game/fia.js?v=1a016bc';
import { PU_ELEMENTS, PU_IDS } from '../game/loadout.js?v=1a016bc';

/*
 * The FIA tab of the season hub: the rule book (searchable, by chapter, each rule's usual penalty and
 * licence points, marked where the game enforces it), every driver's super licence, the penalties of
 * the season and the grid penalties for the next race, everyone's power unit usage against the
 * allocation, and the cost cap.
 */
const PAGES = ['Rule book', 'Licences', 'Penalties', 'Power units', 'Cost cap'];
const CSS = `
.fia{display:grid;gap:14px;max-width:1500px;--line:#ffffff1c}
.fia .fc{background:linear-gradient(180deg,#ffffff0d,#ffffff05);border:1px solid var(--line);border-radius:10px;padding:16px 18px;min-width:0}
.fia h3{margin:0 0 12px;font:700 12.5px var(--cond);letter-spacing:.18em;text-transform:uppercase;color:#ffffffa8;display:flex;justify-content:space-between;gap:10px}
.fia h3 em{font-style:normal;letter-spacing:.04em;color:#fff;font-size:13.5px}
.fia .bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.fia .bar input{flex:1;min-width:220px;background:#0008;border:1px solid var(--line);border-radius:7px;color:#fff;padding:9px 12px;font:600 14px "Titillium Web",Arial,sans-serif}
.fia .chip{background:#ffffff12;border:1px solid var(--line);color:#fff;border-radius:16px;padding:6px 12px;font:700 12.5px var(--cond);cursor:pointer}
.fia .chip.on{background:#fff;color:#000}
.fia .logo{display:flex;align-items:center;gap:14px}.fia .logo svg{width:54px;height:54px}
.fia .rules{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.fia .rule{background:#0007;border:1px solid var(--line);border-left:3px solid #2b5aa8;border-radius:8px;padding:11px 13px}
.fia .rule.game{border-left-color:#ffd21f}
.fia .rule b{font:800 16px var(--cond)}.fia .rule p{margin:5px 0 8px;font-size:13.5px;line-height:1.45;color:#ffffffd0}
.fia .rule .pn{display:flex;gap:8px;flex-wrap:wrap;font-size:12.5px}
.fia .ftag{padding:2px 8px;border-radius:10px;background:#ffffff16;font-weight:700;font-size:11.5px}
.fia .ftag.pen{background:#e1060026;color:#ffb3ad}.fia .ftag.pts{background:#2b5aa833;color:#a8c4ff}.fia .ftag.game{background:#ffd21f2e;color:#ffe38a}
.fia table{width:100%;border-collapse:collapse;font-size:13.5px;font-variant-numeric:tabular-nums}
.fia th{font:700 11px var(--cond);letter-spacing:.12em;text-transform:uppercase;color:#ffffff80;text-align:left;padding:6px 8px;border-bottom:1px solid #ffffff22}
.fia td{padding:7px 8px;border-bottom:1px solid #ffffff10}.fia tr.me td{background:#ffffff16}
.fia .pbar{height:8px;border-radius:4px;background:#ffffff14;position:relative;min-width:140px}.fia .pbar i{position:absolute;left:0;top:0;bottom:0;border-radius:4px}
.fia .pbar s{position:absolute;right:0;top:-3px;bottom:-3px;width:2px;background:#ff4d4d}
.fia .fsw{display:inline-block;width:4px;height:14px;margin-right:8px;vertical-align:middle;border-radius:1px}
.fia .over{color:#ff6b5a;font-weight:800}
.fia .src{font-size:12px;color:#ffffff90;line-height:1.5}
@media (max-width:1000px){.fia .rules{grid-template-columns:1fr}}
`;
let styled = false;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const PEN = { t5: '5 s time penalty', t10: '10 s time penalty', dt: 'Drive-through', dsq: 'Disqualified', nfa: 'No further action' };
const LOGO = '<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="#0b2a5b" stroke="#fff" stroke-width="2"/><text x="30" y="37" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="18" fill="#fff">FIA</text></svg>';
const driverIds = () => TEAMS.flatMap((t) => t.drivers.map((_, k) => `${t.id}-${k}`));
const teamOf = (id) => TEAMS.find((t) => t.id === id.split('-')[0]);

/** ctx: { season, sub, state, goSub(k), rerender() } -> { html, wire(root) } */
export function fiaPage(ctx) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); styled = true; }
  const s = ctx.season, sub = Math.max(0, Math.min(PAGES.length - 1, ctx.sub ?? 0)), S0 = ctx.state, round = s.round ?? 0, me = `${s.team}-0`;
  const nav = `<div class="hub-sub">${PAGES.map((p, k) => `<button data-fiasub="${k}" class="${k === sub ? 'on' : ''}">${p}</button>`).join('')}</div>`;
  let body = '';
  if (sub === 0) {
    S0.ch ??= 'all'; S0.q ??= '';
    body = `<div class="fc"><div class="logo">${LOGO}<div><b style="font:800 22px var(--cond)">Formula 1 Sporting Regulations</b><div class="src">The rules of the championship and the penalties for breaking them. <span class="ftag game">In the game</span> marks the ones the game enforces.</div></div></div></div>
      <div class="fc"><div class="bar"><input data-q placeholder="Search the rules (e.g. collision, gearbox, cost cap)" value="${esc(S0.q)}">${[['all', 'All'], ...CHAPTERS].map(([k, n]) => `<button class="chip ${S0.ch === k ? 'on' : ''}" data-ch="${k}">${n}</button>`).join('')}</div></div>
      <div class="rules" data-rules></div>
      <div class="fc src">Sources: the FIA 2026 Formula 1 Sporting Regulations and Power Unit Sporting Regulations (power unit allocations, the grid penalty ladder), the FIA International Sporting Code (penalties, super licence points) and the Financial Regulations (cost cap breaches). The penalty for an offence is for the stewards to decide: the figures are the usual ones. The 2026 gearbox allocation is taken from the rules published for 2024–25.</div>`;
  } else if (sub === 1) {
    const L = licences(s), rows = driverIds().map((id) => ({ id, t: teamOf(id), L: L[id] ?? { points: 0, list: [] } })).sort((a, b) => b.L.points - a.L.points);
    const bans = (s.fia?.bans ?? []);
    body = `<div class="fc"><h3>Super licence penalty points <em>12 in twelve months: a race ban</em></h3>
      <table><tr><th>Driver</th><th>Points</th><th></th><th>Most recent</th></tr>${rows.map((r) => `<tr class="${r.id === me ? 'me' : ''}"><td><span class="fsw" style="background:${r.t.colours[0]}"></span>${esc(driverName(r.id, s))}</td><td><b class="${r.L.points >= 9 ? 'over' : ''}">${r.L.points}</b></td>
        <td><div class="pbar"><i style="width:${Math.min(100, (r.L.points / 12) * 100)}%;background:${r.L.points >= 9 ? '#ff4d4d' : r.L.points >= 6 ? '#ffc247' : '#5fd38a'}"></i><s></s></div></td>
        <td class="src">${r.L.list.slice(-2).map((x) => `R${x.round} ${esc(x.reason.toLowerCase())} (+${x.pts})`).join(' · ') || '—'}</td></tr>`).join('')}</table></div>
      <div class="fc"><h3>Race bans</h3>${bans.length ? bans.map((b) => `<div>${esc(driverName(b.id, s))}: suspended for round ${b.round + 1}</div>`).join('') : '<div class="src">Nobody has reached 12 points.</div>'}</div>`;
  } else if (sub === 2) {
    const pens = gridPenalties(s, round), dec = (s.history ?? []).flatMap((h) => (h.rc?.decisions ?? []).map((d) => ({ ...d, round: h.round, track: h.track }))).reverse();
    body = `<div class="fc"><h3>Grid penalties <em>next race · round ${round + 1}</em></h3>${pens.length ? `<table><tr><th>Driver</th><th>Penalty</th><th>Why</th></tr>${pens.map((p) => `<tr class="${p.id === me ? 'me' : ''}"><td><span class="fsw" style="background:${teamOf(p.id)?.colours[0]}"></span>${esc(driverName(p.id, s))}</td><td><b class="over">${p.back ? 'Back of the grid' : `${p.places} places`}</b></td><td class="src">${esc(p.reasons.join('; '))}</td></tr>`).join('')}</table>` : '<div class="src">No grid penalties for the next race.</div>'}</div>
      <div class="fc"><h3>The stewards' decisions <em>this season</em></h3>${dec.length ? `<table><tr><th>Round</th><th>Driver</th><th>Offence</th><th>Penalty</th></tr>${dec.slice(0, 40).map((d) => `<tr class="${d.id === me ? 'me' : ''}"><td>R${d.round}</td><td><span class="fsw" style="background:${teamOf(d.id)?.colours[0]}"></span>${esc(driverName(d.id, s))}</td><td>${esc(d.reason)}</td><td>${esc(PEN[d.pen] ?? d.pen)}</td></tr>`).join('')}</table>` : '<div class="src">No decisions yet.</div>'}</div>`;
  } else if (sub === 3) {
    const lo = s.loadout;
    const usage = (id, el) => (id === me ? lo?.units[el].length ?? 1 : lo?.ai[id]?.[el]?.used ?? 1);
    body = `<div class="fc"><h3>Power unit elements used <em>per driver, against the 2026 allocation</em></h3>
      <table><tr><th>Driver</th>${PU_IDS.map((el) => `<th>${PU_ELEMENTS[el].short} <span style="opacity:.6">/${PU_ELEMENTS[el].alloc}</span></th>`).join('')}</tr>
      ${driverIds().map((id) => `<tr class="${id === me ? 'me' : ''}"><td><span class="fsw" style="background:${teamOf(id).colours[0]}"></span>${esc(driverName(id, s))}</td>${PU_IDS.map((el) => { const u = usage(id, el); return `<td class="${u > PU_ELEMENTS[el].alloc ? 'over' : ''}">${u}</td>`; }).join('')}</tr>`).join('')}</table>
      <div class="src" style="margin-top:8px">Beyond the allocation: 10 grid places for the first unit of an element, 5 for each after; more than 15 places, the back of the grid. Gearbox: 5 places.</div></div>`;
  } else {
    const rows = TEAMS.map((t) => ({ t, c: capStatus(s.rd, t.id) })).filter((x) => x.c).sort((a, b) => b.c.spent - a.c.spent);
    body = `<div class="fc"><h3>The cost cap <em>${fmtM(COST_CAP)} a season</em></h3><table><tr><th>Team</th><th>Spent</th><th></th><th>Status</th><th>Aero testing</th></tr>
      ${rows.map(({ t, c }) => `<tr class="${t.id === s.team ? 'me' : ''}"><td><span class="fsw" style="background:${t.colours[0]}"></span>${esc(t.name)}</td><td>${fmtM(c.spent)}</td>
        <td><div class="pbar"><i style="width:${Math.min(100, (c.spent / COST_CAP) * 100)}%;background:${c.over > 0 ? '#ff4d4d' : '#5fd38a'}"></i><s></s></div></td><td class="${c.over > 0 ? 'over' : ''}">${c.cls}${c.over > 0 ? ` (+${c.pct.toFixed(1)}%)` : ''}</td>
        <td>${s.rd.teams[t.id].atr.runs} runs · ${s.rd.teams[t.id].atr.cfd} CFD${s.rd.teams[t.id].overspend ? ' <span class="over">(cut 10%)</span>' : ''}</td></tr>`).join('')}</table>
      <div class="src" style="margin-top:8px">Overspending up to 5% is a minor breach (a fine, a smaller aerodynamic testing allowance, possibly championship points); 5% or more is a material breach (championship points and a lower cap the next year). In 2022 Red Bull's minor breach for 2021 cost a $7m fine and 10% of its aero testing for twelve months.</div></div>`;
  }
  return {
    html: `<div class="fia">${nav}${body}</div>`,
    wire(root) {
      root.querySelectorAll('[data-fiasub]').forEach((b) => b.addEventListener('click', () => ctx.goSub(+b.dataset.fiasub)));
      const box = root.querySelector('[data-rules]');
      if (!box) return;
      const draw = () => {
        const q = S0.q.trim().toLowerCase(), list = RULES.filter((r) => (S0.ch === 'all' || r.ch === S0.ch) && (!q || `${r.title} ${r.rule} ${r.pen}`.toLowerCase().includes(q)));
        box.innerHTML = list.map((r) => `<div class="rule ${r.game ? 'game' : ''}"><b>${esc(r.title)}</b><p>${esc(r.rule)}</p><div class="pn"><span class="ftag pen">${esc(r.pen)}</span>${r.pts && r.pts !== '—' && r.pts !== '0' ? `<span class="ftag pts">${esc(r.pts)} licence point${r.pts === '1' ? '' : 's'}</span>` : ''}${r.game ? '<span class="ftag game">In the game</span>' : ''}<span class="ftag">${esc(CHAPTERS.find((c) => c[0] === r.ch)[1])}</span></div></div>`).join('') || '<div class="fc src">No rule matches.</div>';
      };
      root.querySelector('[data-q]').addEventListener('input', (e) => { S0.q = e.target.value; draw(); });
      root.querySelectorAll('[data-ch]').forEach((b) => b.addEventListener('click', () => { S0.ch = b.dataset.ch; root.querySelectorAll('[data-ch]').forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
      draw();
    },
  };
}
