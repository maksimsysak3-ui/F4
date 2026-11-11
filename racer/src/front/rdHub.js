import { TEAMS } from './teams.js';
import {
  COST_CAP, RUN_COST, ATR_BASE, ATR_ROUNDS, ATTRS, ATTR_NAMES, PARTS, APPROACH, FACILITIES, FACILITY_COST, PU, PU_NAME,
  newRD, overall, trackRating, quote, resources, startProject, upgradeFacility, rankings, atrFactor, profileOf, fmtM,
} from '../game/rd.js';

/*
 * The R&D tab of the season hub: the car's development as a team would run it.
 *
 *   Overview     the car's attributes against the best and the average of the grid, how it suits the
 *                next circuit, the cost cap, the aero testing allowance, the latest news
 *   Design       the departments and their parts: pick a part and an approach (a quote for each:
 *                expected gain as a range, cost, wind tunnel runs, CFD items, rounds to the car)
 *   Factory      the projects in design and in manufacturing; the parts fitted, their correlation
 *   Facilities   wind tunnel, CFD, factory, simulator (capital spending outside the cap)
 *   Rankings     every car's performance; the development race over the season (a chart)
 *   Budget       the cost cap: running costs, development, repairs, the projection to the end
 */
const PAGES = ['Overview', 'Design', 'Factory', 'Facilities', 'Rankings', 'Budget'];
const CSS = `
.rd{display:grid;gap:16px;max-width:1280px}
.rd .row{display:grid;gap:16px}
.rd .c2{grid-template-columns:1.25fr 1fr}.rd .c3{grid-template-columns:repeat(3,1fr)}.rd .c4{grid-template-columns:repeat(4,1fr)}
.rd .rdc{background:#00000038;border:1px solid #ffffff1c;border-radius:8px;padding:16px 18px;min-width:0}
.rd h3{margin:0 0 12px;font:700 13px var(--cond);letter-spacing:.16em;text-transform:uppercase;color:#ffffffb0;display:flex;justify-content:space-between;align-items:baseline}
.rd h3 em{font-style:normal;letter-spacing:.04em;color:#fff}
.rd .big{font:800 46px/1 var(--cond)}.rd .big small{font:600 15px var(--cond);color:#ffffffb0;margin-left:8px;letter-spacing:.06em}
.rd .muted{color:#ffffffa0;font-size:13px}
.rd .attr{display:grid;grid-template-columns:150px 1fr 54px;gap:12px;align-items:center;padding:6px 0;font-size:14px}
.rd .attr .bar{position:relative;height:12px;background:#ffffff14;border-radius:6px}
.rd .attr .bar i{position:absolute;left:0;top:0;bottom:0;border-radius:6px;background:var(--a)}
.rd .attr .bar b{position:absolute;top:-4px;width:2px;height:20px;background:#fff}
.rd .attr .bar s{position:absolute;top:-2px;width:2px;height:16px;background:#ffffff70}
.rd .attr span{font-weight:700;text-align:right;font-variant-numeric:tabular-nums}
.rd .legend{display:flex;gap:16px;font-size:12px;color:#ffffffb0;margin-top:8px}
.rd .legend i{display:inline-block;width:12px;height:4px;margin-right:6px;vertical-align:middle;border-radius:2px}
.rd .gauge{height:14px;background:#ffffff14;border-radius:7px;overflow:hidden;display:flex}
.rd .gauge i{height:100%}
.rd .kv{display:grid;grid-template-columns:1fr auto;gap:6px 14px;font-size:14px}
.rd .kv span{color:#ffffffa8}.rd .kv b{text-align:right;font-variant-numeric:tabular-nums}
.rd .log div{padding:6px 0;border-bottom:1px solid #ffffff12;font-size:13.5px;line-height:1.35}
.rd .log small{color:#ffffff80;margin-right:8px;font-weight:700}
.rd .parts{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
.rd .part{background:#00000030;border:1px solid #ffffff1c;border-radius:8px;padding:12px 14px;text-align:left;color:#fff;cursor:pointer;font:inherit;transition:border-color .15s,transform .15s}
.rd .part:hover,.rd .part.on{border-color:#fff;transform:translateY(-2px)}

.rd .part b{display:block;font:700 18px var(--cond);margin:3px 0 6px}
.rd .part .fx{display:flex;flex-wrap:wrap;gap:4px}
.rd .rdt{font-size:11px;padding:2px 7px;border-radius:10px;background:#ffffff1a;white-space:nowrap}
.rd .rdt.neg{background:#ff4d4d33}.rd .rdt.busy{background:#ffd21f33}.rd .rdt.ok{background:#2fd67333}
.rd .quote{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.rd .q{background:#00000030;border:1px solid #ffffff22;border-radius:8px;padding:14px}
.rd .q h4{margin:0 0 8px;font:800 20px var(--cond);text-transform:uppercase}
.rd .q .range{position:relative;height:10px;background:#ffffff14;border-radius:5px;margin:10px 0 4px}
.rd .q .range i{position:absolute;top:0;bottom:0;background:linear-gradient(90deg,#ffffff40,var(--a),#ffffff40);border-radius:5px}
.rd .q .range b{position:absolute;top:-3px;width:2px;height:16px;background:#fff}
.rd .btn{background:#eef0f4;color:#14161c;border:0;border-radius:6px;font:800 14px var(--cond);letter-spacing:.08em;text-transform:uppercase;padding:10px 14px;cursor:pointer;width:100%;margin-top:10px}
.rd .btn:disabled{opacity:.4;cursor:default}
.rd .btn.ghost{background:#ffffff1a;color:#fff}
.rd .err{color:#ff8a80;font-size:12px;margin-top:6px;min-height:15px}
.rd .proj{display:grid;grid-template-columns:1fr 150px 110px;gap:14px;align-items:center;padding:10px 0;border-bottom:1px solid #ffffff14}
.rd .proj b{display:block;font:700 17px var(--cond)}
.rd .steps{display:flex;gap:3px}.rd .steps i{flex:1;height:8px;border-radius:2px;background:#ffffff1c}.rd .steps i.d{background:var(--a)}.rd .steps i.m{background:#ffd21f}
.rd table{width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums}
.rd th{font:700 11px var(--cond);letter-spacing:.14em;text-transform:uppercase;color:#ffffff90;text-align:left;padding:6px 8px;border-bottom:1px solid #ffffff22}
.rd td{padding:7px 8px;border-bottom:1px solid #ffffff10}
.rd tr.me td{background:#ffffff1f}
.rd td .rdsw{display:inline-block;width:4px;height:14px;margin-right:8px;vertical-align:middle;border-radius:1px}
.rd .up{color:#2fd673}.rd .dn{color:#ff6b6b}
.rd .fac{display:grid;gap:8px}.rd .pips{display:flex;gap:5px}.rd .pips i{width:22px;height:8px;border-radius:2px;background:#ffffff1c}.rd .pips i.on{background:var(--a)}
.rd .chart{position:relative}.rd .chart canvas{width:100%;height:280px;display:block}
.rd .tip{position:absolute;pointer-events:none;background:#0b0d12ee;border:1px solid #ffffff30;border-radius:6px;padding:8px 10px;font-size:12px;display:none;min-width:150px}
.rd .tip div{display:flex;justify-content:space-between;gap:12px}
@media (max-width:1000px){.rd .c2,.rd .c3,.rd .c4,.rd .quote{grid-template-columns:1fr}}
`;
let styled = false;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sec = (pts) => `${pts >= 0 ? '−' : '+'}${Math.abs(pts * 0.27).toFixed(2)} s`;   // ~0.3% of a ~90 s lap per rating point

/**
 * Render the R&D tab. ctx: { fe, season, sub, next (the next circuit id), gpName, goSub(k), save() }.
 * Returns { html, wire(root) }.
 */
export function rdPage(ctx) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); styled = true; }
  const s = ctx.season;
  s.rd ??= newRD(s.team);
  if (s.rd.player !== s.team) s.rd = newRD(s.team);
  const st = s.rd, T = st.teams[st.player], team = TEAMS.find((t) => t.id === st.player);
  const sub = Math.max(0, Math.min(PAGES.length - 1, ctx.sub ?? 0));
  const nav = `<div class="hub-sub">${PAGES.map((p, k) => `<button data-rdsub="${k}" class="${k === sub ? 'on' : ''}">${p}</button>`).join('')}</div>`;
  const res = resources(st, st.player), ranks = rankings(st), myRank = ranks.findIndex((r) => r.t.id === st.player) + 1;
  let body = '';
  const wires = [];

  if (sub === 0) {
    // ---- Overview ----
    const best = Object.fromEntries(ATTRS.map((a) => [a, Math.max(...TEAMS.map((t) => attrOf(st, t.id, a)))]));
    const avg = Object.fromEntries(ATTRS.map((a) => [a, TEAMS.reduce((x, t) => x + attrOf(st, t.id, a), 0) / TEAMS.length]));
    const scale = (v) => Math.max(0, Math.min(100, (v - 88) * (100 / 16)));   // 88..104 across the bar
    const nextR = ctx.next ? TEAMS.map((t) => ({ id: t.id, r: trackRating(st, t.id, ctx.next) })).sort((a, b) => b.r - a.r) : [];
    const nextPos = nextR.findIndex((x) => x.id === st.player) + 1, prof = ctx.next ? profileOf(ctx.next) : null;
    const spentPct = (T.spent / COST_CAP) * 100, runPct = (RUN_COST * Math.max(0, 24 - st.round) / COST_CAP) * 100;
    const period = Math.floor(Math.max(0, st.round - 1) / ATR_ROUNDS), roundsLeft = ATR_ROUNDS - (Math.max(0, st.round - 1) % ATR_ROUNDS);
    body = `<div class="row c2">
      <div class="rdc"><h3>Car performance <em>P${myRank} of ${TEAMS.length} · ${overall(st, st.player).toFixed(1)}</em></h3>
        ${ATTRS.map((a) => { const v = attrOf(st, st.player, a); return `<div class="attr"><span style="text-align:left;font-weight:600">${ATTR_NAMES[a]}</span><div class="bar"><i style="width:${scale(v)}%"></i><s style="left:${scale(avg[a])}%"></s><b style="left:${scale(best[a])}%"></b></div><span>${v.toFixed(1)}</span></div>`; }).join('')}
        <div class="legend"><span><i style="background:var(--a)"></i>${esc(team.name)}</span><span><i style="background:#fff;width:2px;height:12px"></i>Best on the grid</span><span><i style="background:#ffffff70;width:2px;height:12px"></i>Grid average</span></div></div>
      <div class="row">
        <div class="rdc"><h3>Next: ${esc(ctx.gpName(ctx.next ?? ''))} <em>${nextPos ? `P${nextPos} car` : ''}</em></h3>
          ${prof ? `<div class="muted" style="margin-bottom:8px">What this circuit rewards</div>${Object.entries(prof).sort((a, b) => b[1] - a[1]).map(([k, w]) => `<div class="attr" style="grid-template-columns:150px 1fr 54px"><span style="text-align:left;font-weight:600">${ATTR_NAMES[k]}</span><div class="bar"><i style="width:${w * 220}%;background:#ffffffa0"></i></div><span>${Math.round(w * 100)}%</span></div>`).join('')}` : ''}
          ${nextR.length ? `<div class="muted" style="margin-top:8px">Fastest cars here: ${nextR.slice(0, 3).map((x) => esc(TEAMS.find((t) => t.id === x.id).name)).join(', ')}</div>` : ''}</div>
        <div class="rdc"><h3>Cost cap <em>${fmtM(COST_CAP - T.spent)} left</em></h3>
          <div class="gauge"><i style="width:${spentPct}%;background:var(--a)"></i><i style="width:${runPct}%;background:#ffffff40"></i></div>
          <div class="legend"><span><i style="background:var(--a)"></i>Spent ${fmtM(T.spent)}</span><span><i style="background:#ffffff40"></i>Committed: running the rest of the season ${fmtM(RUN_COST * Math.max(0, 24 - st.round))}</span></div>
          <div class="kv" style="margin-top:10px"><span>Free for development</span><b class="${COST_CAP - T.spent - RUN_COST * Math.max(0, 24 - st.round) < 0 ? 'dn' : ''}">${fmtM(COST_CAP - T.spent - RUN_COST * Math.max(0, 24 - st.round))}</b></div></div>
      </div></div>
      <div class="row c2">
        <div class="rdc"><h3>Aero testing (ATR) <em>${Math.round(atrFactor(myConstructorPos(ctx)) * 100)}% allowance</em></h3>
          <div class="kv"><span>Wind tunnel runs left</span><b>${res.runs}</b><span>CFD items left</span><b>${res.cfd}</b><span>Testing period</span><b>${period + 1} · ends in ${roundsLeft} round${roundsLeft > 1 ? 's' : ''}</b></div>
          <div class="muted" style="margin-top:8px">The allowance follows the constructors' standings: the leader gets ${Math.round(ATR_BASE.runs * 0.7)} runs a period, last place ${Math.round(ATR_BASE.runs * 1.2)}.${T.overspend ? ' <span class="dn">Cut by 10%: over the cost cap.</span>' : ''}</div></div>
        <div class="rdc log"><h3>Team news</h3>${st.log.slice(-6).reverse().map((l) => `<div><small>R${l.round}</small>${esc(l.text)}</div>`).join('') || '<div class="muted">No developments yet. Start a project in Design.</div>'}</div>
      </div>`;
  } else if (sub === 1) {
    // ---- Design ----
    const pick = ctx.state.part ?? null;
    const depts = [...new Set(PARTS.map((p) => p.dept))];
    body = `<div class="rdc"><h3>Departments <em>${res.slots} of 3 project slots free · ${res.runs} runs · ${res.cfd} CFD · ${fmtM(res.budget)}</em></h3>
      ${depts.map((d) => `<div class="muted" style="margin:10px 0 6px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">${d} · expertise ${Math.round((T.expertise[d] ?? 0.9) * 100)}</div><div class="parts">${PARTS.filter((p) => p.dept === d).map((p) => {
        const busy = T.projects.some((x) => x.partId === p.id), q = quote(st, st.player, p.id);
        return `<button class="part ${pick === p.id ? 'on' : ''}" data-part="${p.id}"><b>${esc(p.name)}</b><div class="fx">${Object.entries(p.fx).map(([k, w]) => `<span class="rdt ${w < 0 ? 'neg' : ''}">${w < 0 ? '−' : '+'} ${ATTR_NAMES[k]}</span>`).join('')}${busy ? '<span class="rdt busy">In development</span>' : ''}${q.blocked ? `<span class="rdt neg">${esc(q.blocked)}</span>` : ''}</div></button>`;
      }).join('')}</div>`).join('')}</div>
      ${pick ? quoteCard(st, pick) : '<div class="rdc muted">Pick a part to see the options.</div>'}`;
    wires.push((root) => {
      root.querySelectorAll('[data-part]').forEach((b) => b.addEventListener('click', () => { ctx.state.part = b.dataset.part; ctx.rerender(); }));
      root.querySelectorAll('[data-start]').forEach((b) => b.addEventListener('click', () => {
        const err = startProject(st, st.player, pick, b.dataset.start);
        if (err) { root.querySelector(`[data-err="${b.dataset.start}"]`).textContent = err; return; }
        ctx.save(); ctx.state.part = null; ctx.goSub(2);
      }));
    });
  } else if (sub === 2) {
    // ---- Factory ----
    body = `<div class="row c2"><div class="rdc"><h3>In the factory <em>${T.projects.length} of 3</em></h3>
      ${T.projects.map((p) => { const tot = p.design + p.make, done = tot - p.left; return `<div class="proj"><div><b>${esc(p.name)}</b><span class="muted">${APPROACH[p.approach].name} · ${p.stage} · ready in ${p.left} round${p.left === 1 ? '' : 's'}</span></div><div class="steps">${Array.from({ length: tot }, (_, k) => `<i class="${k < done ? (k < p.design ? 'd' : 'm') : ''}"></i>`).join('')}</div><span class="rdt">${sec(p.lo)} … ${sec(p.hi)}</span></div>`; }).join('') || '<div class="muted">Nothing in development. Start a project in Design.</div>'}
      <div class="legend" style="margin-top:10px"><span><i style="background:var(--a)"></i>Design (CFD, wind tunnel)</span><span><i style="background:#ffd21f"></i>Manufacturing</span><span>Ranges: lap time per lap at an average circuit</span></div></div>
      <div class="rdc"><h3>On the car <em>${T.parts.length} upgrade${T.parts.length === 1 ? '' : 's'}</em></h3>
      ${T.parts.slice().reverse().map((p) => `<div class="proj" style="grid-template-columns:1fr auto"><div><b>${esc(p.name)}</b><span class="muted">Fitted round ${p.fitted} · ${APPROACH[p.approach].name}</span></div>${p.validated ? `<span class="rdt ${p.actual >= p.mean * 0.9 ? 'ok' : 'neg'}">${esc(p.verdict ?? 'Correlated')} · ${sec(p.actual)}</span>` : '<span class="rdt busy">Run it in practice to correlate</span>'}</div>`).join('') || '<div class="muted">No upgrades yet.</div>'}</div></div>`;
  } else if (sub === 3) {
    // ---- Facilities ----
    body = `<div class="rdc"><h3>Facilities <em>Capital allowance ${fmtM(st.capex)}</em></h3><div class="muted" style="margin-bottom:12px">Capital spending is outside the cost cap, but limited: choose what makes every future part better.</div>
      <div class="row c4">${Object.entries(FACILITIES).map(([k, f]) => { const lvl = T.facilities[k]; return `<div class="rdc fac"><b style="font:800 20px var(--cond)">${f.name}</b><div class="pips">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= lvl ? 'on' : ''}"></i>`).join('')}</div><span class="muted">${f.what}</span><span class="muted">Level ${lvl}${lvl < 5 ? ` · next ${fmtM(FACILITY_COST[lvl])}` : ' · top level'}</span><button class="btn" data-fac="${k}" ${lvl >= 5 || st.capex < FACILITY_COST[lvl] ? 'disabled' : ''}>Upgrade</button><div class="err" data-faerr="${k}"></div></div>`; }).join('')}</div></div>`;
    wires.push((root) => root.querySelectorAll('[data-fac]').forEach((b) => b.addEventListener('click', () => { const e = upgradeFacility(st, st.player, b.dataset.fac); if (e) root.querySelector(`[data-faerr="${b.dataset.fac}"]`).textContent = e; else { ctx.save(); ctx.rerender(); } })));
  } else if (sub === 4) {
    // ---- Rankings ----
    const trend = (id) => { const h = st.teams[id].history; return h.length > 1 ? h[h.length - 1].rating - h[Math.max(0, h.length - 4)].rating : 0; };
    const leaders = ATTRS.map((a) => { const b = TEAMS.map((t) => ({ t, v: attrOf(st, t.id, a) })).sort((x, y) => y.v - x.v)[0]; return `<div class="kv"><span>${ATTR_NAMES[a]}</span><b><span class="rdsw" style="display:inline-block;width:4px;height:12px;margin-right:6px;background:${accent(b.t)}"></span>${esc(b.t.name)}</b></div>`; }).join('');
    body = `<div class="row c2"><div class="rdc"><h3>Car performance ranking</h3><table><thead><tr><th>#</th><th>Team</th><th>Rating</th><th>Gap</th><th>Last 3 rounds</th><th>Power unit</th></tr></thead><tbody>
      ${ranks.map((r, k) => { const tr = trend(r.t.id); return `<tr class="${r.t.id === st.player ? 'me' : ''}"><td>${k + 1}</td><td><span class="rdsw" style="background:${accent(r.t)}"></span>${esc(r.t.name)}</td><td><b>${r.rating.toFixed(2)}</b></td><td>${k ? `${sec(r.rating - ranks[0].rating).replace('+', '+')}` : '—'}</td><td class="${tr > 0.05 ? 'up' : tr < -0.05 ? 'dn' : ''}">${tr >= 0 ? '+' : ''}${tr.toFixed(2)}</td><td>${PU_NAME[PU[r.t.id]]}</td></tr>`; }).join('')}</tbody></table>
      <div class="muted" style="margin-top:8px">Gap: the lap time a car is down on the fastest at an average circuit.</div></div>
      <div class="row"><div class="rdc"><h3>Development race</h3><div class="chart"><canvas width="900" height="560"></canvas><div class="tip"></div></div><div class="legend chartleg"></div></div>
      <div class="rdc"><h3>Best in class</h3>${leaders}</div></div></div>`;
    wires.push((root) => drawTrend(root.querySelector('.chart'), root.querySelector('.chartleg'), st, ranks));
  } else if (sub === 5) {
    // ---- Budget ----
    const dev = T.projects.reduce((a, p) => a + p.cost, 0) + T.parts.reduce((a, p) => a + p.cost, 0);
    const run = RUN_COST * st.round, rep = Math.max(0, T.spent - dev - run);
    const proj = T.spent + RUN_COST * Math.max(0, 24 - st.round);
    const seg = (v, c) => `<i style="width:${(v / COST_CAP) * 100}%;background:${c}"></i>`;
    body = `<div class="row c2"><div class="rdc"><h3>Cost cap 2026 <em>${fmtM(COST_CAP)}</em></h3>
      <div class="gauge" style="height:22px">${seg(run, '#ffffff60')}${seg(dev, 'var(--a)')}${seg(rep, '#ff6b6b')}</div>
      <div class="legend"><span><i style="background:#ffffff60"></i>Running the team ${fmtM(run)}</span><span><i style="background:var(--a)"></i>Development ${fmtM(dev)}</span><span><i style="background:#ff6b6b"></i>Crash repairs ${fmtM(rep)}</span></div>
      <div class="kv" style="margin-top:14px"><span>Spent so far</span><b>${fmtM(T.spent)}</b><span>Running costs to the end of the season</span><b>${fmtM(RUN_COST * Math.max(0, 24 - st.round))}</b><span>Projected end of season (no more development)</span><b class="${proj > COST_CAP ? 'dn' : ''}">${fmtM(proj)}</b><span>Room for development</span><b class="${COST_CAP - proj < 0 ? 'dn' : 'up'}">${fmtM(COST_CAP - proj)}</b></div></div>
      <div class="rdc"><h3>How the money goes</h3><div class="muted" style="line-height:1.55">Everything that makes the car go faster is inside the cap: the people, the design work, every part made, and the repairs after a crash (a front wing is about $0.2M, a floor $0.5M). Running the team at a race weekend costs about ${fmtM(RUN_COST)}. Go over and the FIA cuts the team's aero testing. Facilities are paid from a separate, limited capital allowance.</div>
        <div class="kv" style="margin-top:14px">${ranks.slice(0, 6).map((r) => `<span>${esc(r.t.name)}</span><b>${fmtM(st.teams[r.t.id].spent)}</b>`).join('')}</div><div class="muted" style="margin-top:6px">Spent so far by the leading cars.</div></div></div>`;
  }
  return {
    html: `<div class="rd" style="--a:${accent(team)}">${nav}${body}</div>`,
    wire(root) {
      root.querySelectorAll('[data-rdsub]').forEach((b) => b.addEventListener('click', () => ctx.goSub(+b.dataset.rdsub)));
      for (const w of wires) w(root);
    },
    pages: PAGES.length,
  };

  function quoteCard(st2, partId) {
    const part = PARTS.find((p) => p.id === partId);
    const qs = Object.keys(APPROACH).map((a) => quote(st2, st2.player, partId, a));
    const max = Math.max(...qs.map((q) => q.hi)) * 1.1;
    return `<div class="rdc"><h3>${esc(part.name)} <em>${esc(part.dept)}</em></h3><div class="quote">${qs.map((q) => {
      const why = q.blocked ?? (T.projects.some((x) => x.partId === partId) ? 'Already in development' : res.slots <= 0 ? 'All three project slots are in use'
        : q.runs > res.runs ? `Needs ${q.runs} tunnel runs: ${res.runs} left this period` : q.cfd > res.cfd ? `Needs ${q.cfd} CFD items: ${res.cfd} left this period` : q.cost > res.budget ? 'Over the cost cap' : '');
      const ok = !why;
      return `<div class="q"><h4>${APPROACH[q.approach].name}</h4><div class="kv"><span>Expected gain</span><b>${sec(q.mean)} / lap</b><span>Cost</span><b>${fmtM(q.cost)}</b><span>Wind tunnel runs</span><b>${q.runs}</b><span>CFD items</span><b>${q.cfd}</b><span>On the car in</span><b>${q.rounds} rounds</b></div>
        <div class="range"><i style="left:${(Math.max(0, q.lo) / max) * 100}%;right:${100 - (q.hi / max) * 100}%"></i><b style="left:${(q.mean / max) * 100}%"></b></div><div class="muted">Likely range ${sec(q.lo)} … ${sec(q.hi)}</div>
        <button class="btn" data-start="${q.approach}" ${ok ? '' : 'disabled'}>Start development</button><div class="err" data-err="${q.approach}">${esc(why)}</div></div>`;
    }).join('')}</div><div class="muted" style="margin-top:10px">Aggressive designs promise more but correlate less reliably; better facilities narrow the range. The real gain is only known once the part has run in practice.</div></div>`;
  }
}
/** The team colour that reads on the dark hub: its brightest colour that isn't white, lifted if it's dark. */
function accent(team) {
  const lum = (h) => { const k = parseInt(h.slice(1), 16); return (0.299 * (k >> 16) + 0.587 * ((k >> 8) & 255) + 0.114 * (k & 255)) / 255; };
  const c = team.colours.find((h) => lum(h) > 0.25 && lum(h) < 0.9) ?? team.colours[0];   // the primary colour when it reads
  const l = lum(c);
  if (l >= 0.38) return c;
  const k = parseInt(c.slice(1), 16), f = (0.5 - l) / (1 - l);       // mix towards white until it reads
  return '#' + [k >> 16, (k >> 8) & 255, k & 255].map((v) => Math.round(v + (255 - v) * f).toString(16).padStart(2, '0')).join('');
}
const attrOf = (st, id, a) => (a === 'power' ? st.teams[id].attrs.power + (st.pu[PU[id]] ?? 0) : st.teams[id].attrs[a]);
function myConstructorPos(ctx) {
  const s = ctx.season, pts = s.points ?? {}, me = s.manager?.name || 'Player';
  const order = TEAMS.map((t) => ({ id: t.id, p: t.drivers.reduce((a, d, k) => a + (pts[t.id === s.team && k === 0 ? me : d.name] ?? 0), 0) })).sort((a, b) => b.p - a.p);
  return order.findIndex((x) => x.id === s.team) + 1;
}

/**
 * The development race: each car's rating round by round (the player's team and the four best other
 * cars; one axis, thin lines, direct labels at the end, a legend, a hover readout per round).
 */
function drawTrend(box, legend, st, ranks) {
  const cv = box.querySelector('canvas'), tip = box.querySelector('.tip'), g = cv.getContext('2d');
  const ids = [st.player, ...ranks.map((r) => r.t.id).filter((id) => id !== st.player).slice(0, 4)];
  const series = ids.map((id) => { const t = TEAMS.find((x) => x.id === id); return { id, t, c: accent(t), pts: st.teams[id].history }; });
  const W = cv.width, H = cv.height, padL = 64, padR = 200, padT = 20, padB = 44;
  const rounds = Math.max(1, ...series.map((s) => s.pts.length - 1));
  const vals = series.flatMap((s) => s.pts.map((p) => p.rating));
  const lo = Math.floor(Math.min(...vals) - 0.3), hi = Math.ceil(Math.max(...vals) + 0.3);
  const X = (r) => padL + (r / rounds) * (W - padL - padR), Y = (v) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const draw = (hover = null) => {
    g.clearRect(0, 0, W, H);
    g.font = '22px "Titillium Web", Arial'; g.fillStyle = '#ffffff90'; g.strokeStyle = '#ffffff1a'; g.lineWidth = 1;
    for (let v = lo; v <= hi; v += Math.max(0.5, Math.round((hi - lo) / 5 * 2) / 2)) { g.beginPath(); g.moveTo(padL, Y(v)); g.lineTo(W - padR, Y(v)); g.stroke(); g.textAlign = 'right'; g.fillText(v.toFixed(1), padL - 10, Y(v) + 7); }
    g.textAlign = 'center';
    for (let r = 0; r <= rounds; r += Math.max(1, Math.ceil(rounds / 8))) g.fillText(r === 0 ? 'Start' : `R${r}`, X(r), H - 12);
    for (const s of series.slice().reverse()) {
      const mine = s.id === st.player;
      g.strokeStyle = s.c; g.lineWidth = mine ? 5 : 3; g.lineJoin = 'round';
      g.beginPath(); s.pts.forEach((p, k) => (k ? g.lineTo(X(p.round), Y(p.rating)) : g.moveTo(X(p.round), Y(p.rating)))); g.stroke();
      const last = s.pts[s.pts.length - 1];
      g.fillStyle = s.c; g.beginPath(); g.arc(X(last.round), Y(last.rating), mine ? 8 : 6, 0, 7); g.fill();
    }
    // Direct labels at the line ends, pushed apart so they never overlap.
    const labels = series.map((s) => { const last = s.pts[s.pts.length - 1]; return { s, x: X(last.round) + 14, y: Y(last.rating) + 7 }; }).sort((a, b) => a.y - b.y);
    for (let k = 1; k < labels.length; k++) labels[k].y = Math.max(labels[k].y, labels[k - 1].y + 24);
    for (const l of labels) { g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = `${l.s.id === st.player ? 700 : 600} 22px "Titillium Web", Arial`; g.fillText(l.s.t.name, l.x, l.y); }
    if (hover != null) { g.strokeStyle = '#ffffff60'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(hover), padT); g.lineTo(X(hover), H - padB); g.stroke(); }
  };
  draw();
  legend.innerHTML = series.map((s) => `<span><i style="background:${s.c}"></i>${esc(s.t.name)}${s.id === st.player ? ' (you)' : ''}</span>`).join('');
  cv.addEventListener('pointermove', (e) => {
    const r = cv.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * W;
    const round = Math.max(0, Math.min(rounds, Math.round(((x - padL) / (W - padL - padR)) * rounds)));
    draw(round);
    tip.style.display = 'block';
    tip.style.left = `${Math.min(r.width - 170, (X(round) / W) * r.width + 12)}px`; tip.style.top = '10px';
    tip.innerHTML = `<b>${round === 0 ? 'Start of season' : `After round ${round}`}</b>${series.map((s) => { const p = s.pts.find((q) => q.round === round); return p ? `<div><span>${esc(s.t.name)}</span><b>${p.rating.toFixed(2)}</b></div>` : ''; }).join('')}`;
  });
  cv.addEventListener('pointerleave', () => { tip.style.display = 'none'; draw(); });
}
export const RD_PAGES = PAGES.length;
