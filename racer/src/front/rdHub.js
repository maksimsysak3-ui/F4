import { TEAMS } from './teams.js';
import {
  COST_CAP, RUN_COST, ATR_BASE, ATR_ROUNDS, ATTRS, ATTR_NAMES, ATTR_SHORT, SLOTS, SLOT_IDS, FACILITIES, FACILITY_COST, PU, PU_NAME,
  newRD, upgradeRD, overall, trackRating, attrsOf, quote, defaultPlan, resources, designLoad, startProject, cancelProject, dirLabel, directionFx,
  fitSpec, bestFit, specValue, specById, makeCopy, upgradeFacility, rankings, atrFactor, profileOf, fmtM,
} from '../game/rd.js';
import { partImage } from './parts3d.js';
import { blueprint } from './blueprint.js';

/*
 * The R&D tab of the season hub: the car's development as a team runs it (laid out like F1 Manager's
 * car development screens).
 *
 *   Overview      the car's components (rendered, with the spec fitted and anything in the factory),
 *                 its attributes against the best and the average, how it suits the next circuit, the
 *                 cost cap, the testing allowance, the design office, the news
 *   Design        a design project: the component, the brief (two trade-offs, the attribute changes
 *                 live), the resources (designers, wind tunnel runs, CFD items, copies), the prediction
 *                 (gain and its range, at the next circuit and overall), cost and time; the rendered
 *                 proposal and the design office's drawing of it
 *   Projects      what's in the design office and the factory: stage, progress, when it reaches the car
 *   Car & parts   each component's specs: fit what suits the next circuit, make spare copies
 *   Facilities    wind tunnel, CFD, factory, simulator (capital spending outside the cap)
 *   Rankings      every car's performance; the development race over the season
 *   Budget        the cost cap: running costs, development, repairs, the projection
 */
const PAGES = ['Overview', 'Design', 'Projects', 'Car & parts', 'Facilities', 'Rankings', 'Budget'];
const CSS = `
.rd{display:grid;gap:14px;max-width:1360px;--line:#ffffff1c;--panel:linear-gradient(180deg,#ffffff0d,#ffffff05)}
.rd .row{display:grid;gap:14px}
.rd .c2{grid-template-columns:1.3fr 1fr}.rd .c3{grid-template-columns:repeat(3,1fr)}.rd .c4{grid-template-columns:repeat(4,1fr)}.rd .c31{grid-template-columns:260px 1fr 360px}
.rd .rdc{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px 18px;min-width:0;position:relative;box-shadow:0 10px 30px #0004}
.rd .rdc.hl{border-color:var(--a)}
.rd h3{margin:0 0 12px;font:700 12.5px var(--cond);letter-spacing:.18em;text-transform:uppercase;color:#ffffffa8;display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.rd h3 em{font-style:normal;letter-spacing:.04em;color:#fff;font-size:13.5px}
.rd .muted{color:#ffffff99;font-size:13px;line-height:1.45}
.rd .attr{display:grid;grid-template-columns:150px 1fr 54px;gap:12px;align-items:center;padding:5px 0;font-size:14px}
.rd .attr .bar{position:relative;height:10px;background:#ffffff12;border-radius:5px}
.rd .attr .bar i{position:absolute;left:0;top:0;bottom:0;border-radius:5px;background:linear-gradient(90deg,color-mix(in srgb,var(--a) 55%,#000),var(--a))}
.rd .attr .bar b{position:absolute;top:-4px;width:2px;height:18px;background:#fff}
.rd .attr .bar s{position:absolute;top:-2px;width:2px;height:14px;background:#ffffff70}
.rd .attr span{font-weight:700;text-align:right;font-variant-numeric:tabular-nums}
.rd .legend{display:flex;flex-wrap:wrap;gap:14px;font-size:12px;color:#ffffffa8;margin-top:8px}
.rd .legend i{display:inline-block;width:12px;height:4px;margin-right:6px;vertical-align:middle;border-radius:2px}
.rd .gauge{height:12px;background:#ffffff12;border-radius:6px;overflow:hidden;display:flex}
.rd .gauge i{height:100%}
.rd .kv{display:grid;grid-template-columns:1fr auto;gap:6px 14px;font-size:14px}
.rd .kv span{color:#ffffffa0}.rd .kv b{text-align:right;font-variant-numeric:tabular-nums}
.rd .log div{padding:7px 0;border-bottom:1px solid #ffffff10;font-size:13.5px;line-height:1.35;display:grid;grid-template-columns:42px 1fr;gap:8px}
.rd .log small{color:var(--a);font-weight:800}
.rd .comps{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.rd .comp{background:radial-gradient(120% 90% at 50% 30%,#2a2f3a,#0b0d12);border:1px solid var(--line);border-radius:10px;overflow:hidden;cursor:pointer;color:#fff;text-align:left;font:inherit;padding:0;transition:border-color .15s,transform .15s}
.rd .comp:hover,.rd .comp.on{border-color:var(--a);transform:translateY(-2px)}
.rd .comp img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover}
.rd .comp .t{padding:8px 11px 10px;border-top:1px solid var(--line);background:#0008}
.rd .comp small{display:block;font:700 10.5px var(--cond);letter-spacing:.14em;text-transform:uppercase;color:#ffffff90}
.rd .comp b{display:block;font:800 16px var(--cond);margin-top:1px}
.rd .comp .st{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}
.rd .rdt{font-size:11px;padding:2px 7px;border-radius:10px;background:#ffffff1a;white-space:nowrap;font-weight:600}
.rd .rdt.neg{background:#ff4d4d2e;color:#ffb3ad}.rd .rdt.pos{background:#2fd67326;color:#9ff0c0}.rd .rdt.busy{background:#ffd21f2e;color:#ffe38a}.rd .rdt.acc{background:var(--a);color:#000}
.rd .slots{display:flex;flex-direction:column;gap:6px}
.rd .slot{display:grid;grid-template-columns:72px 1fr;gap:10px;align-items:center;background:#0006;border:1px solid var(--line);border-radius:8px;padding:6px;cursor:pointer;color:#fff;text-align:left;font:inherit}
.rd .slot.on{border-color:var(--a);background:#ffffff10}
.rd .slot img{width:72px;height:45px;object-fit:cover;border-radius:5px;background:#0b0d12}
.rd .slot b{display:block;font:700 14px var(--cond)}.rd .slot small{color:#ffffff90;font-size:11.5px}
.rd .xp{height:4px;background:#ffffff14;border-radius:2px;margin-top:4px}.rd .xp i{display:block;height:100%;background:var(--a);border-radius:2px}
.rd .stage{position:relative;border-radius:10px;overflow:hidden;background:radial-gradient(120% 90% at 50% 35%,#2b313d,#0a0c11);border:1px solid var(--line)}
.rd .stage img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover}
.rd .stage .cap{position:absolute;left:14px;top:12px;font:800 22px var(--cond);text-shadow:0 2px 8px #000}
.rd .stage .cap small{display:block;font:700 11px var(--cond);letter-spacing:.16em;color:#ffffffb0}
.rd .bp{width:100%;height:auto;display:block;border-radius:10px;border:1px solid var(--line)}
.rd .ax{margin:4px 0 14px}
.rd .ax .lbl{display:flex;justify-content:space-between;font-size:12px;color:#ffffffa0;font-weight:600;margin-bottom:4px}
.rd .ax .lbl b{color:#fff;font:800 13px var(--cond);letter-spacing:.08em;text-transform:uppercase}
.rd input[type=range]{width:100%;accent-color:var(--a)}
.rd .fx{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
.rd .res{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center;font-size:13px;margin-bottom:10px}
.rd .res span{color:#ffffffb0}.rd .res b{font-variant-numeric:tabular-nums}
.rd .res input{grid-column:1/3}
.rd .pred{background:#0007;border:1px solid var(--line);border-radius:8px;padding:12px;margin-top:6px}
.rd .range{position:relative;height:10px;background:#ffffff12;border-radius:5px;margin:8px 0 4px}
.rd .range i{position:absolute;top:0;bottom:0;background:linear-gradient(90deg,#ffffff30,var(--a),#ffffff30);border-radius:5px}
.rd .range b{position:absolute;top:-3px;width:2px;height:16px;background:#fff}
.rd .btn{background:#eef0f4;color:#14161c;border:0;border-radius:6px;font:800 14px var(--cond);letter-spacing:.08em;text-transform:uppercase;padding:11px 14px;cursor:pointer;width:100%;margin-top:10px}
.rd .btn.acc{background:var(--a);color:#000}
.rd .btn:disabled{opacity:.4;cursor:default}
.rd .btn.ghost{background:#ffffff1a;color:#fff}.rd .btn.sm{width:auto;padding:6px 10px;font-size:12px;margin:0}
.rd .err{color:#ff8a80;font-size:12.5px;margin-top:6px;min-height:15px}
.rd .proj{display:grid;grid-template-columns:200px 1fr 220px;gap:16px;align-items:center;padding:12px 0;border-bottom:1px solid #ffffff12}
.rd .proj img{width:200px;aspect-ratio:16/10;object-fit:cover;border-radius:8px;background:#0b0d12;border:1px solid var(--line)}
.rd .proj b{display:block;font:800 19px var(--cond)}
.rd .pipe{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:8px}
.rd .pipe div{font:700 10px var(--cond);letter-spacing:.12em;color:#ffffff80;text-transform:uppercase}
.rd .pipe i{display:block;height:6px;border-radius:3px;background:#ffffff16;margin-top:3px;overflow:hidden}
.rd .pipe i u{display:block;height:100%;background:var(--a)}
.rd .pipe div.done{color:#fff}
.rd .specs{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.rd .spec{background:#0007;border:1px solid var(--line);border-radius:9px;overflow:hidden}
.rd .spec.fit{border-color:var(--a);box-shadow:0 0 0 1px var(--a) inset}
.rd .spec img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:radial-gradient(#2a2f3a,#0b0d12)}
.rd .spec .t{padding:8px 10px}
.rd .spec .t b{font:800 15px var(--cond)}.rd .spec .t small{display:block;color:#ffffffa0;font-size:11.5px;margin:2px 0 5px}
.rd .spec .acts{display:flex;gap:6px;margin-top:8px}
.rd table{width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums}
.rd th{font:700 11px var(--cond);letter-spacing:.14em;text-transform:uppercase;color:#ffffff90;text-align:left;padding:6px 8px;border-bottom:1px solid #ffffff22}
.rd td{padding:7px 8px;border-bottom:1px solid #ffffff10}
.rd tr.me td{background:#ffffff1c}
.rd td .rdsw{display:inline-block;width:4px;height:14px;margin-right:8px;vertical-align:middle;border-radius:1px}
.rd .up{color:#2fd673}.rd .dn{color:#ff6b6b}
.rd .pips{display:flex;gap:5px}.rd .pips i{width:22px;height:8px;border-radius:2px;background:#ffffff1c}.rd .pips i.on{background:var(--a)}
.rd .chart{position:relative}.rd .chart canvas{width:100%;height:280px;display:block}
.rd .tip{position:absolute;pointer-events:none;background:#0b0d12ee;border:1px solid #ffffff30;border-radius:6px;padding:8px 10px;font-size:12px;display:none;min-width:150px}
.rd .tip div{display:flex;justify-content:space-between;gap:12px}
.rd .ring{width:92px;height:92px}
.rd .stat{display:flex;gap:14px;align-items:center}
.rd .stat b{display:block;font:800 30px var(--cond);line-height:1}.rd .stat small{color:#ffffff99;font-size:12px}
@media (max-width:1100px){.rd .c2,.rd .c3,.rd .c4,.rd .c31{grid-template-columns:1fr}.rd .comps{grid-template-columns:repeat(2,1fr)}.rd .proj{grid-template-columns:1fr}}
`;
let styled = false;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const sec = (pts) => `${pts >= 0 ? '−' : '+'}${Math.abs(pts * 0.27).toFixed(2)} s`;   // ~0.3% of a ~90 s lap per rating point
const sgn = (x, d = 2) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(d)}`;
const img = (slot, sp, team, w = 640, h = 400) => partImage(slot, { dir: sp?.dir ?? [0.5, 0.5], n: sp?.n ?? 0, team }, { view: 'hero', w, h });
const fxChips = (fx, scale = 1) => Object.entries(fx).filter(([, v]) => Math.abs(v * scale) >= 0.01).sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `<span class="rdt ${v < 0 ? 'neg' : 'pos'}">${ATTR_SHORT[k]} ${sgn(v * scale)}</span>`).join('');

/**
 * Render the R&D tab. ctx: { season, sub, next (the next circuit id), gpName(id), roundGp(round) (the
 * Grand Prix of a round), state (kept across renders), goSub(k), rerender(), save() }. Returns
 * { html, wire(root), pages }.
 */
export function rdPage(ctx) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); styled = true; }
  const s = ctx.season;
  s.rd ??= newRD(s.team);
  if (s.rd.player !== s.team) s.rd = newRD(s.team);
  upgradeRD(s.rd);
  const st = s.rd, T = st.teams[st.player], team0 = TEAMS.find((t) => t.id === st.player), S0 = ctx.state;
  const team = { ...team0, colours: [accent(team0), ...team0.colours.slice(1)] };   // the parts painted in a colour that reads
  const sub = Math.max(0, Math.min(PAGES.length - 1, ctx.sub ?? 0));
  const nav = `<div class="hub-sub">${PAGES.map((p, k) => `<button data-rdsub="${k}" class="${k === sub ? 'on' : ''}">${p}</button>`).join('')}</div>`;
  const res = resources(st), ranks = rankings(st), myRank = ranks.findIndex((r) => r.t.id === st.player) + 1;
  const next = ctx.next, nextName = ctx.gpName(next ?? '');
  const A = attrsOf(st, st.player);
  let body = '';
  const wires = [];
  const fitted = (slot) => specById(st, st.fitted[slot]);
  const proj = (slot) => T.projects.find((p) => p.slot === slot);

  if (sub === 0) {
    // ---- Overview ----
    const best = Object.fromEntries(ATTRS.map((a) => [a, Math.max(...TEAMS.map((t) => attrOf(st, t.id, a)))]));
    const avg = Object.fromEntries(ATTRS.map((a) => [a, TEAMS.reduce((x, t) => x + attrOf(st, t.id, a), 0) / TEAMS.length]));
    const scale = (v) => Math.max(0, Math.min(100, (v - 88) * (100 / 16)));
    const nextR = next ? TEAMS.map((t) => ({ id: t.id, r: trackRating(st, t.id, next) })).sort((a, b) => b.r - a.r) : [];
    const nextPos = nextR.findIndex((x) => x.id === st.player) + 1;
    const committed = RUN_COST * Math.max(0, 24 - st.round), free = COST_CAP - T.spent - committed;
    const L = designLoad(st);
    const period = Math.floor(Math.max(0, st.round - 1) / ATR_ROUNDS), roundsLeft = ATR_ROUNDS - (Math.max(0, st.round - 1) % ATR_ROUNDS);
    body = `<div class="rdc"><h3>The car <em>P${myRank} of ${TEAMS.length} on performance · ${overall(st, st.player).toFixed(1)}</em></h3><div class="comps">${SLOT_IDS.map((slot) => {
      const sp = fitted(slot), p = proj(slot), S = SLOTS[slot];
      return `<button class="comp" data-goslot="${slot}"><img alt="" src="${img(slot, sp, team, 480, 300)}"><div class="t"><small>${esc(S.dept)}</small><b>${esc(S.name)}</b><div class="st"><span class="rdt acc">${esc(sp?.name ?? '')}</span>${sp && !sp.validated ? '<span class="rdt busy">To correlate</span>' : ''}${p ? `<span class="rdt busy">${esc(p.stage)} · ${p.left}R</span>` : ''}${sp && sp.n && sp.copies < 2 ? `<span class="rdt neg">${sp.copies} cop${sp.copies === 1 ? 'y' : 'ies'}</span>` : ''}</div></div></button>`;
    }).join('')}</div></div>
    <div class="row c3">
      <div class="rdc"><h3>Performance <em>vs the grid</em></h3>
        ${ATTRS.map((a) => { const v = attrOf(st, st.player, a); return `<div class="attr"><span style="text-align:left;font-weight:600">${ATTR_NAMES[a]}</span><div class="bar"><i style="width:${scale(v)}%"></i><s style="left:${scale(avg[a])}%"></s><b style="left:${scale(best[a])}%"></b></div><span>${v.toFixed(1)}</span></div>`; }).join('')}
        <div class="legend"><span><i style="background:var(--a)"></i>${esc(team.name)}</span><span><i style="background:#fff;width:2px;height:12px"></i>Best</span><span><i style="background:#ffffff70;width:2px;height:12px"></i>Average</span></div></div>
      <div class="rdc"><h3>Next · ${esc(nextName)} <em>${nextPos ? `P${nextPos} car` : ''}</em></h3>
        ${next ? `<div class="muted" style="margin-bottom:6px">What the circuit rewards</div>${Object.entries(profileOf(next)).sort((a, b) => b[1] - a[1]).map(([k, w]) => `<div class="attr" style="grid-template-columns:130px 1fr 44px"><span style="text-align:left;font-weight:600">${ATTR_NAMES[k]}</span><div class="bar"><i style="width:${w * 220}%;background:#ffffffa0"></i></div><span>${Math.round(w * 100)}%</span></div>`).join('')}
        <div class="muted" style="margin-top:8px">Fastest here: ${nextR.slice(0, 3).map((x) => esc(TEAMS.find((t) => t.id === x.id).name)).join(', ')}</div>` : ''}
        <button class="btn ghost" data-goto="3">Choose the parts for ${esc(nextName.replace(' Grand Prix', ''))}</button></div>
      <div class="rdc"><h3>Resources</h3>
        <div class="kv" style="margin-bottom:10px"><span>Cost cap left</span><b>${fmtM(COST_CAP - T.spent)}</b><span>Free for development</span><b class="${free < 0 ? 'dn' : 'up'}">${fmtM(free)}</b></div>
        <div class="gauge"><i style="width:${(T.spent / COST_CAP) * 100}%;background:var(--a)"></i><i style="width:${(committed / COST_CAP) * 100}%;background:#ffffff40"></i></div>
        <div class="kv" style="margin-top:12px"><span>Wind tunnel runs</span><b>${res.runs}</b><span>CFD items</span><b>${res.cfd}</b><span>Testing period ${period + 1}</span><b>${roundsLeft} round${roundsLeft > 1 ? 's' : ''} left</b><span>ATR allowance</span><b>${Math.round(atrFactor(myConstructorPos(ctx)) * 100)}%</b><span>Design office in use</span><b>${Math.round(L.used * 100)}%</b><span>Projects</span><b>${T.projects.length} of ${L.slots}</b></div></div>
    </div>
    <div class="rdc log"><h3>Development news</h3>${st.log.slice(-7).reverse().map((l) => `<div><small>R${l.round}</small><span>${esc(l.text)}</span></div>`).join('') || '<div class="muted">Nothing yet. Start a design project.</div>'}</div>`;
    wires.push((root) => {
      root.querySelectorAll('[data-goslot]').forEach((b) => b.addEventListener('click', () => { S0.slot = b.dataset.goslot; S0.plan = null; ctx.goSub(1); }));
      root.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => ctx.goSub(+b.dataset.goto)));
    });
  } else if (sub === 1) {
    // ---- Design ----
    const slot = S0.slot && SLOTS[S0.slot] ? S0.slot : 'frontWing', S = SLOTS[slot];
    S0.slot = slot;
    if (!S0.plan || S0.plan.slot !== slot) S0.plan = { slot, ...defaultPlan(st, slot) };
    const plan = S0.plan, busy = proj(slot);
    const L = designLoad(st), officeFree = Math.max(0, L.cap - L.used);
    plan.designers = Math.min(plan.designers, Math.max(0.1, officeFree));
    plan.runs = Math.min(plan.runs, res.runs); plan.cfd = Math.min(plan.cfd, res.cfd);
    body = `<div class="row c31">
      <div class="rdc"><h3>Components</h3><div class="slots">${SLOT_IDS.map((k) => {
        const sp = fitted(k), p = proj(k);
        return `<button class="slot ${k === slot ? 'on' : ''}" data-slot="${k}"><img alt="" src="${img(k, sp, team, 288, 180)}"><div><b>${esc(SLOTS[k].name)}</b><small>${esc(sp?.name ?? '')}${p ? ` · in ${p.stage.toLowerCase()}` : ''}</small><div class="xp"><i style="width:${Math.round((T.expertise[k] ?? 0) * 100)}%"></i></div></div></button>`;
      }).join('')}</div><div class="muted" style="margin-top:8px">The bar is the team's knowledge of each part: it grows with every design, and the next one is better and surer.</div></div>
      <div class="row" style="align-content:start">
        <div class="stage"><img class="hero" alt="" src="${img(slot, { dir: plan.dir, n: specsOf(st, slot).length }, team, 960, 600)}"><div class="cap"><small>${esc(S.dept)} · proposal ${esc(S.code)}-${String(specsOf(st, slot).length).padStart(2, '0')}</small>${esc(S.name)}</div></div>
        <div class="bpbox">${blueprint(slot, { dir: plan.dir, n: specsOf(st, slot).length, team, partName: S.name, name: `${S.code}-${String(specsOf(st, slot).length).padStart(2, '0')} (PROPOSAL)`, label: dirLabel(slot, plan.dir), round: st.round + 1 })}</div>
      </div>
      <div class="rdc"><h3>Design brief <em>${esc(S.name)}</em></h3>
        ${S.axes.map((ax, i) => `<div class="ax"><div class="lbl"><span>${esc(ax.lo)}</span><b>${esc(ax.name)}</b><span>${esc(ax.hi)}</span></div><input type="range" min="0" max="100" value="${Math.round(plan.dir[i] * 100)}" data-axis="${i}"></div>`).join('')}
        <h3 style="margin-top:6px">Resources</h3>
        <div class="res"><span>Designers</span><b data-v="designers"></b><input type="range" min="10" max="${Math.max(10, Math.round(officeFree * 100))}" value="${Math.round(plan.designers * 100)}" data-res="designers"></div>
        ${S.runs ? `<div class="res"><span>Wind tunnel runs</span><b data-v="runs"></b><input type="range" min="0" max="${Math.max(0, Math.min(res.runs, S.runs * 2))}" value="${plan.runs}" data-res="runs"></div>` : ''}
        <div class="res"><span>CFD items</span><b data-v="cfd"></b><input type="range" min="0" max="${Math.max(0, Math.min(res.cfd, S.cfd * 2))}" value="${plan.cfd}" data-res="cfd"></div>
        <div class="res"><span>Copies to make</span><b data-v="copies"></b><input type="range" min="1" max="3" value="${plan.copies}" data-res="copies"></div>
        <div class="pred" data-pred></div>
        <button class="btn acc" data-start>Start the project</button><div class="err" data-err></div>
      </div></div>`;
    wires.push((root) => {
      root.querySelectorAll('[data-slot]').forEach((b) => b.addEventListener('click', () => { S0.slot = b.dataset.slot; S0.plan = null; ctx.rerender(); }));
      const pred = root.querySelector('[data-pred]'), err = root.querySelector('[data-err]'), go = root.querySelector('[data-start]');
      const hero = root.querySelector('.stage img.hero'), bpbox = root.querySelector('.bpbox');
      let imgT = null;
      const update = (redraw) => {
        const q = quote(st, st.player, slot, plan), at = next ? Object.entries(profileOf(next)).reduce((s2, [k, w]) => s2 + w * (q.fx[k] ?? 0), 0) + (q.fx.weight ?? 0) * 0.08 : 0;
        const ovr = Object.keys(q.fx).reduce((s2, k) => s2 + (q.fx[k] ?? 0) * (k === 'weight' ? 0.08 : k === 'reliability' ? 0 : 0.2), 0);
        const readyRound = st.round + q.rounds + 1, gp = ctx.roundGp(readyRound);
        root.querySelector('[data-v="designers"]').textContent = `${Math.round(plan.designers * 100)}% · ${q.designRounds} round${q.designRounds > 1 ? 's' : ''} to design`;
        const r = root.querySelector('[data-v="runs"]'); if (r) r.textContent = `${plan.runs} of ${S.runs} for a thorough design`;
        root.querySelector('[data-v="cfd"]').textContent = `${plan.cfd} of ${S.cfd}`;
        root.querySelector('[data-v="copies"]').textContent = `${plan.copies} (${plan.copies - 1} spare${plan.copies === 2 ? '' : 's'}) · ${fmtM(q.copyCost)} each`;
        const max = Math.max(0.3, q.hi * 1.15);
        pred.innerHTML = `<div class="kv"><span>At ${esc(nextName.replace(' Grand Prix', ''))}</span><b class="${at >= 0 ? 'up' : 'dn'}">${sec(at)} / lap</b><span>Across the calendar</span><b class="${ovr >= 0 ? 'up' : 'dn'}">${sec(ovr)} / lap</b><span>Cost</span><b>${fmtM(q.cost)}</b><span>On the car</span><b>Round ${readyRound}${gp ? ` · ${esc(gp.replace(' Grand Prix', ''))}` : ''}</b><span>Uncertainty</span><b>±${Math.round(q.spread * 100)}%</b></div>
          <div class="fx">${fxChips(q.fx)}</div>
          <div class="range"><i style="left:${(Math.max(0, q.lo) / max) * 100}%;right:${100 - (q.hi / max) * 100}%"></i><b style="left:${(q.mean / max) * 100}%"></b></div><div class="muted">Design quality ${Math.round(q.quality * 100)}% · knowledge ${Math.round(q.exp * 100)}%. Gains in rating points: ${q.lo.toFixed(2)} to ${q.hi.toFixed(2)}.</div>`;
        const why = busy ? 'A project on this part is already running' : q.blocked ?? (T.projects.length >= L.slots ? `All ${L.slots} project slots are in use` : plan.designers > officeFree + 1e-6 ? 'Not enough of the design office free' : q.cost + T.spent > COST_CAP ? 'That would go over the cost cap' : '');
        go.disabled = !!why; err.textContent = why;
        if (redraw) { clearTimeout(imgT); imgT = setTimeout(() => { const nn = specsOf(st, slot).length; hero.src = img(slot, { dir: plan.dir, n: nn }, team, 960, 600); bpbox.innerHTML = blueprint(slot, { dir: plan.dir, n: nn, team, partName: S.name, name: `${S.code}-${String(nn).padStart(2, '0')} (PROPOSAL)`, label: dirLabel(slot, plan.dir), round: st.round + 1 }); }, 160); }
      };
      root.querySelectorAll('[data-axis]').forEach((inp) => inp.addEventListener('input', () => { plan.dir[+inp.dataset.axis] = inp.value / 100; update(true); }));
      root.querySelectorAll('[data-res]').forEach((inp) => inp.addEventListener('input', () => { const k = inp.dataset.res; plan[k] = k === 'designers' ? inp.value / 100 : +inp.value; update(false); }));
      go.addEventListener('click', () => { const e = startProject(st, st.player, slot, plan); if (e) { err.textContent = e; return; } ctx.save(); S0.plan = null; ctx.goSub(2); });
      update(false);
    });
  } else if (sub === 2) {
    // ---- Projects ----
    const L = designLoad(st);
    body = `<div class="rdc"><h3>Design office and factory <em>${T.projects.length} of ${L.slots} projects · office ${Math.round(L.used * 100)}% in use</em></h3>
      ${T.projects.map((p) => {
        const tot = p.design + p.make, done = tot - p.left, dDone = Math.min(p.design, done), mDone = Math.max(0, done - p.design);
        const stg = [['Concept & CFD', Math.min(1, (dDone / p.design) * 2)], ['Wind tunnel', Math.max(0, Math.min(1, (dDone / p.design) * 2 - 1))], ['Manufacturing', mDone / p.make], ['On the car', p.left <= 0 ? 1 : 0]];
        const gp = ctx.roundGp(st.round + p.left + 1);
        return `<div class="proj"><img alt="" src="${img(p.slot, { dir: p.plan.dir, n: specsOf(st, p.slot).length }, team, 400, 250)}"><div><b>${esc(SLOTS[p.slot].name)} · ${esc(SLOTS[p.slot].code)}-${String(specsOf(st, p.slot).length).padStart(2, '0')}</b><span class="muted">${esc(dirLabel(p.slot, p.plan.dir))} · ${Math.round(p.designers * 100)}% of the office · ${p.copies} cop${p.copies === 1 ? 'y' : 'ies'}</span>
          <div class="pipe">${stg.map(([n, f]) => `<div class="${f >= 1 ? 'done' : ''}">${n}<i><u style="width:${Math.round(f * 100)}%"></u></i></div>`).join('')}</div><div class="fx">${fxChips(p.fx)}</div></div>
          <div><div class="kv"><span>Stage</span><b>${esc(p.stage)}</b><span>On the car</span><b>Round ${st.round + p.left + 1}${gp ? ` · ${esc(gp.replace(' Grand Prix', ''))}` : ''}</b><span>Predicted</span><b>${sec(p.lo)} … ${sec(p.hi)}</b><span>Cost</span><b>${fmtM(p.cost)}</b></div><button class="btn ghost sm" style="margin-top:8px" data-cancel="${p.slot}">Cancel</button></div></div>`;
      }).join('') || '<div class="muted">Nothing in development. Open Design to start a project.</div>'}</div>
      ${st.pending.length ? `<div class="rdc"><h3>Copies in the factory</h3>${st.pending.map((c) => { const sp = specById(st, c.specId); return `<div class="kv"><span>${esc(sp?.name)} ${esc(SLOTS[sp?.slot]?.name ?? '')}</span><b>Round ${c.ready}</b></div>`; }).join('')}</div>` : ''}`;
    wires.push((root) => root.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', () => { if (confirm('Cancel this project? What has been spent is gone.')) { cancelProject(st, b.dataset.cancel); ctx.save(); ctx.rerender(); } })));
  } else if (sub === 3) {
    // ---- Car & parts ----
    const bf = next ? bestFit(st, next) : {};
    const curR = next ? trackRating(st, st.player, next) : 0;
    const bestR = next ? (() => { const keep = { ...st.fitted }; Object.assign(st.fitted, bf); const r = trackRating(st, st.player, next); Object.assign(st.fitted, keep); return r; })() : 0;
    body = `<div class="rdc hl"><h3>Set-up for ${esc(nextName)} <em>${sec(curR - bestR).replace('−', '').replace('+', '')} from the best combination</em></h3>
      <div class="muted">Each component's specs, and what each is worth here. A new part's gain is a prediction until it has run in practice. Crashes write copies off: keep spares.</div>
      <button class="btn acc" style="max-width:360px" data-bestfit ${Math.abs(curR - bestR) < 1e-6 ? 'disabled' : ''}>Fit the best for ${esc(nextName.replace(' Grand Prix', ''))}</button></div>
      ${SLOT_IDS.map((slot) => {
        const list = specsOf(st, slot).slice().sort((a, b) => b.n - a.n);
        return `<div class="rdc"><h3>${esc(SLOTS[slot].name)} <em>${list.length} spec${list.length > 1 ? 's' : ''}</em></h3><div class="specs">${list.map((sp) => {
          const v = next ? specValue(st, sp, next) : 0, isFit = st.fitted[slot] === sp.id, d = sp.validated ? sp.actual : sp.delta;
          return `<div class="spec ${isFit ? 'fit' : ''}"><img alt="" src="${img(slot, sp, team, 420, 236)}"><div class="t"><b>${esc(sp.name)}</b>${isFit ? ' <span class="rdt acc">Fitted</span>' : ''}<small>${esc(sp.label)}</small>
            <div class="fx">${fxChips(d, sp.validated ? 1 : 0.85)}</div>
            <div class="kv" style="margin-top:6px;font-size:12.5px"><span>Here</span><b class="${v >= 0 ? 'up' : 'dn'}">${sec(v)}</b><span>Copies</span><b class="${sp.copies < 1 ? 'dn' : ''}">${sp.n === 0 ? '∞' : sp.copies}</b><span>Data</span><b>${sp.validated ? esc(sp.verdict ?? 'Baseline') : 'Not correlated'}</b></div>
            <div class="acts">${isFit ? '' : `<button class="btn sm" data-fit="${sp.id}" ${sp.copies < 1 ? 'disabled' : ''}>Fit</button>`}${sp.n ? `<button class="btn ghost sm" data-copy="${sp.id}">Make a copy · ${fmtM(SLOTS[slot].copy)}</button>` : ''}</div></div></div>`;
        }).join('')}</div></div>`;
      }).join('')}`;
    wires.push((root) => {
      root.querySelector('[data-bestfit]')?.addEventListener('click', () => { Object.assign(st.fitted, bf); ctx.save(); ctx.rerender(); });
      root.querySelectorAll('[data-fit]').forEach((b) => b.addEventListener('click', () => { fitSpec(st, b.dataset.fit); ctx.save(); ctx.rerender(); }));
      root.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => { const e = makeCopy(st, b.dataset.copy); if (e) alert(e); ctx.save(); ctx.rerender(); }));
    });
  } else if (sub === 4) {
    // ---- Facilities ----
    body = `<div class="rdc"><h3>Facilities <em>Capital allowance ${fmtM(st.capex)}</em></h3><div class="muted" style="margin-bottom:12px">Capital spending sits outside the cost cap but is limited: choose what makes every future part better.</div>
      <div class="row c4">${Object.entries(FACILITIES).map(([k, f]) => { const lvl = T.facilities[k]; return `<div class="rdc"><b style="font:800 20px var(--cond)">${f.name}</b><div class="pips" style="margin:8px 0">${[1, 2, 3, 4, 5].map((nn) => `<i class="${nn <= lvl ? 'on' : ''}"></i>`).join('')}</div><div class="muted">${f.what}</div><div class="muted" style="margin-top:6px">Level ${lvl}${lvl < 5 ? ` · next ${fmtM(FACILITY_COST[lvl])}` : ' · top level'}</div><button class="btn" data-fac="${k}" ${lvl >= 5 || st.capex < FACILITY_COST[lvl] ? 'disabled' : ''}>Upgrade</button><div class="err" data-faerr="${k}"></div></div>`; }).join('')}</div></div>`;
    wires.push((root) => root.querySelectorAll('[data-fac]').forEach((b) => b.addEventListener('click', () => { const e = upgradeFacility(st, st.player, b.dataset.fac); if (e) root.querySelector(`[data-faerr="${b.dataset.fac}"]`).textContent = e; else { ctx.save(); ctx.rerender(); } })));
  } else if (sub === 5) {
    // ---- Rankings ----
    const trend = (id) => { const h = st.teams[id].history; return h.length > 1 ? h[h.length - 1].rating - h[Math.max(0, h.length - 4)].rating : 0; };
    const leaders = ATTRS.map((a) => { const bb = TEAMS.map((t) => ({ t, v: attrOf(st, t.id, a) })).sort((x, y) => y.v - x.v)[0]; return `<div class="kv"><span>${ATTR_NAMES[a]}</span><b><span style="display:inline-block;width:4px;height:12px;margin-right:6px;background:${accent(bb.t)}"></span>${esc(bb.t.name)}</b></div>`; }).join('');
    body = `<div class="row c2"><div class="rdc"><h3>Car performance ranking</h3><table><thead><tr><th>#</th><th>Team</th><th>Rating</th><th>Gap</th><th>Last 3 rounds</th><th>Power unit</th></tr></thead><tbody>
      ${ranks.map((r, k) => { const tr = trend(r.t.id); return `<tr class="${r.t.id === st.player ? 'me' : ''}"><td>${k + 1}</td><td><span class="rdsw" style="background:${accent(r.t)}"></span>${esc(r.t.name)}</td><td><b>${r.rating.toFixed(2)}</b></td><td>${k ? sec(r.rating - ranks[0].rating) : '—'}</td><td class="${tr > 0.05 ? 'up' : tr < -0.05 ? 'dn' : ''}">${tr >= 0 ? '+' : ''}${tr.toFixed(2)}</td><td>${PU_NAME[PU[r.t.id]]}</td></tr>`; }).join('')}</tbody></table>
      <div class="muted" style="margin-top:8px">Gap: the lap time a car is down on the fastest at an average circuit.</div></div>
      <div class="row"><div class="rdc"><h3>Development race</h3><div class="chart"><canvas width="900" height="560"></canvas><div class="tip"></div></div><div class="legend chartleg"></div></div>
      <div class="rdc"><h3>Best in class</h3>${leaders}</div></div></div>`;
    wires.push((root) => drawTrend(root.querySelector('.chart'), root.querySelector('.chartleg'), st, ranks));
  } else if (sub === 6) {
    // ---- Budget ----
    const dev = T.projects.reduce((a, p) => a + p.cost, 0) + st.specs.reduce((a, p) => a + (p.cost ?? 0), 0);
    const run = RUN_COST * st.round, rep = Math.max(0, T.spent - dev - run);
    const proj2 = T.spent + RUN_COST * Math.max(0, 24 - st.round);
    const seg = (v, c) => `<i style="width:${(v / COST_CAP) * 100}%;background:${c}"></i>`;
    body = `<div class="row c2"><div class="rdc"><h3>Cost cap 2026 <em>${fmtM(COST_CAP)}</em></h3>
      <div class="gauge" style="height:22px">${seg(run, '#ffffff60')}${seg(dev, 'var(--a)')}${seg(rep, '#ff6b6b')}</div>
      <div class="legend"><span><i style="background:#ffffff60"></i>Running the team ${fmtM(run)}</span><span><i style="background:var(--a)"></i>Development and parts ${fmtM(dev)}</span><span><i style="background:#ff6b6b"></i>Repairs and copies ${fmtM(rep)}</span></div>
      <div class="kv" style="margin-top:14px"><span>Spent so far</span><b>${fmtM(T.spent)}</b><span>Running costs to the end of the season</span><b>${fmtM(RUN_COST * Math.max(0, 24 - st.round))}</b><span>Projected end of season (no more development)</span><b class="${proj2 > COST_CAP ? 'dn' : ''}">${fmtM(proj2)}</b><span>Room for development</span><b class="${COST_CAP - proj2 < 0 ? 'dn' : 'up'}">${fmtM(COST_CAP - proj2)}</b></div></div>
      <div class="rdc"><h3>How the money goes</h3><div class="muted">Everything that makes the car faster is inside the cap: the people, the design work, every part and copy made, and the repairs after a crash. Running the team at a race weekend costs about ${fmtM(RUN_COST)}. Go over and the FIA cuts the team's aero testing. Facilities come from a separate, limited capital allowance.</div>
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
}
const specsOf = (st, slot) => st.specs.filter((x) => x.slot === slot);
/** The team colour that reads on the dark hub: its primary when it reads, otherwise lifted towards white. */
export function accent(team) {
  const lum = (h) => { const k = parseInt(h.slice(1), 16); return (0.299 * (k >> 16) + 0.587 * ((k >> 8) & 255) + 0.114 * (k & 255)) / 255; };
  const c = team.colours.find((h) => lum(h) > 0.25 && lum(h) < 0.9) ?? team.colours[0];
  const l = lum(c);
  if (l >= 0.38) return c;
  const k = parseInt(c.slice(1), 16), f = (0.5 - l) / (1 - l);
  return '#' + [k >> 16, (k >> 8) & 255, k & 255].map((v) => Math.round(v + (255 - v) * f).toString(16).padStart(2, '0')).join('');
}
const attrOf = (st, id, a) => (a === 'power' ? attrsOf(st, id).power + (st.pu[PU[id]] ?? 0) : attrsOf(st, id)[a]);
function myConstructorPos(ctx) {
  const s = ctx.season, pts = s.points ?? {}, me = s.manager?.name || 'Player';
  const order = TEAMS.map((t) => ({ id: t.id, p: t.drivers.reduce((a, d, k) => a + (pts[t.id === s.team && k === 0 ? me : d.name] ?? 0), 0) })).sort((a, b) => b.p - a.p);
  return order.findIndex((x) => x.id === s.team) + 1;
}

/** The development race: the player's team and the four best other cars, round by round. */
function drawTrend(box, legend, st, ranks) {
  const cv = box.querySelector('canvas'), tip = box.querySelector('.tip'), g = cv.getContext('2d');
  const ids = [st.player, ...ranks.map((r) => r.t.id).filter((id) => id !== st.player).slice(0, 4)];
  const series = ids.map((id) => { const t = TEAMS.find((x) => x.id === id); return { id, t, c: accent(t), pts: st.teams[id].history }; });
  const W = cv.width, H = cv.height, padL = 64, padR = 200, padT = 20, padB = 44;
  const rounds = Math.max(1, ...series.map((s2) => s2.pts.length - 1));
  const vals = series.flatMap((s2) => s2.pts.map((p) => p.rating));
  const lo = Math.floor(Math.min(...vals) - 0.3), hi = Math.ceil(Math.max(...vals) + 0.3);
  const X = (r) => padL + (r / rounds) * (W - padL - padR), Y = (v) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const draw = (hover = null) => {
    g.clearRect(0, 0, W, H);
    g.font = '22px "Titillium Web", Arial'; g.fillStyle = '#ffffff90'; g.strokeStyle = '#ffffff1a'; g.lineWidth = 1;
    for (let v = lo; v <= hi; v += Math.max(0.5, Math.round(((hi - lo) / 5) * 2) / 2)) { g.beginPath(); g.moveTo(padL, Y(v)); g.lineTo(W - padR, Y(v)); g.stroke(); g.textAlign = 'right'; g.fillText(v.toFixed(1), padL - 10, Y(v) + 7); }
    g.textAlign = 'center';
    for (let r = 0; r <= rounds; r += Math.max(1, Math.ceil(rounds / 8))) g.fillText(r === 0 ? 'Start' : `R${r}`, X(r), H - 12);
    for (const s2 of series.slice().reverse()) {
      const mine = s2.id === st.player;
      g.strokeStyle = s2.c; g.lineWidth = mine ? 5 : 3; g.lineJoin = 'round';
      g.beginPath(); s2.pts.forEach((p, k) => (k ? g.lineTo(X(p.round), Y(p.rating)) : g.moveTo(X(p.round), Y(p.rating)))); g.stroke();
      const last = s2.pts[s2.pts.length - 1];
      g.fillStyle = s2.c; g.beginPath(); g.arc(X(last.round), Y(last.rating), mine ? 8 : 6, 0, 7); g.fill();
    }
    const labels = series.map((s2) => { const last = s2.pts[s2.pts.length - 1]; return { s: s2, x: X(last.round) + 14, y: Y(last.rating) + 7 }; }).sort((a, b) => a.y - b.y);
    for (let k = 1; k < labels.length; k++) labels[k].y = Math.max(labels[k].y, labels[k - 1].y + 24);
    for (const l of labels) { g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = `${l.s.id === st.player ? 700 : 600} 22px "Titillium Web", Arial`; g.fillText(l.s.t.name, l.x, l.y); }
    if (hover != null) { g.strokeStyle = '#ffffff60'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(hover), padT); g.lineTo(X(hover), H - padB); g.stroke(); }
  };
  draw();
  legend.innerHTML = series.map((s2) => `<span><i style="background:${s2.c}"></i>${esc(s2.t.name)}${s2.id === st.player ? ' (you)' : ''}</span>`).join('');
  cv.addEventListener('pointermove', (e) => {
    const r = cv.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * W;
    const round = Math.max(0, Math.min(rounds, Math.round(((x - padL) / (W - padL - padR)) * rounds)));
    draw(round);
    tip.style.display = 'block';
    tip.style.left = `${Math.min(r.width - 170, (X(round) / W) * r.width + 12)}px`; tip.style.top = '10px';
    tip.innerHTML = `<b>${round === 0 ? 'Start of season' : `After round ${round}`}</b>${series.map((s2) => { const p = s2.pts.find((q) => q.round === round); return p ? `<div><span>${esc(s2.t.name)}</span><b>${p.rating.toFixed(2)}</b></div>` : ''; }).join('')}`;
  });
  cv.addEventListener('pointerleave', () => { tip.style.display = 'none'; draw(); });
}
export const RD_PAGES = PAGES.length;
void ATR_BASE; void directionFx;
