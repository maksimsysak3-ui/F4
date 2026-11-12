import { SLOTS, COST_CAP, quote, designLoad, startProject, dirLabel, profileOf, fmtM } from '../game/rd.js';
import { LAB, TESTS, ISSUE_KIND, modelDir, newDesign, runTest, knownIssues, signOffPlan, testCost, costText, sevName, fmtMoney } from '../game/lab.js';
import { mountLab3d } from './labView3d.js';
import { blueprint } from './blueprint.js';

/*
 * The R&D Design page: the development lab. Pick the part, set the brief (what it's for), shape the
 * geometry, and test it: wind tunnel, CFD, the rig, the dyno, the simulator, live. Each test reads the
 * figures, estimates how much of the design's potential is there and points out what it can see wrong
 * (numbered on the view). Change the geometry, test again; when it's right, sign it off and it goes to
 * the factory as a project.
 */
const CSS = `
.lab .c31{grid-template-columns:240px minmax(0,1fr) 380px}
.lab .view{position:relative;border-radius:10px;overflow:hidden;border:1px solid var(--line);background:#05080f}
.lab .view>canvas{display:block;width:100%;height:clamp(340px,52vh,580px)}
.lab3d-hud{position:absolute;inset:0;pointer-events:none;font-family:'Titillium Web',Arial,sans-serif}
.lab3d-hud .h-t{position:absolute;left:16px;top:12px;text-shadow:0 2px 8px #000}.lab3d-hud .h-t b{display:block;font:800 15px var(--cond);letter-spacing:.16em}.lab3d-hud .h-t small{font:600 12px var(--cond);color:#ffffffb0;letter-spacing:.04em}
.lab3d-hud .h-live{position:absolute;right:16px;top:14px;font:800 12px var(--cond);letter-spacing:.14em;display:none;align-items:center;gap:7px;background:#000a;padding:4px 9px;border-radius:4px}.lab3d-hud.live .h-live{display:flex}
.lab3d-hud .h-live i{width:8px;height:8px;border-radius:50%;background:#ff3b30;animation:labblink 1s steps(2) infinite}@keyframes labblink{50%{opacity:.2}}
.lab3d-hud .h-figs{position:absolute;left:14px;bottom:14px;display:flex;gap:6px}.lab3d-hud .h-figs div{background:#000b;border:1px solid #ffffff22;border-left:3px solid var(--a);border-radius:5px;padding:5px 9px;min-width:84px}
.lab3d-hud .h-figs small{display:block;font:700 10px var(--cond);letter-spacing:.1em;text-transform:uppercase;color:#ffffffa0}.lab3d-hud .h-figs b{font:800 17px var(--cond);font-variant-numeric:tabular-nums}.lab3d-hud .h-figs em{font-style:normal;font-size:10.5px;color:#ffffff90;margin-left:4px}
.lab .lab3d-hud .h-chart{position:absolute;right:14px;bottom:14px;width:min(42%,360px);height:min(40%,170px);border:1px solid #ffffff22;border-radius:6px}
.lab3d-hud .h-sim,.lab3d-hud .h-radio{display:none}.lab3d-hud.sim .h-sim{display:grid}.lab3d-hud.sim .h-radio{display:flex}.lab3d-hud.sim .h-figs{display:none}
.lab3d-hud .h-sim{position:absolute;right:14px;top:44px;width:250px;gap:8px;background:#000c;border:1px solid #ffffff22;border-radius:8px;padding:10px 12px;font-variant-numeric:tabular-nums}
.lab3d-hud .h-sim small{display:block;font:700 10px var(--cond);letter-spacing:.12em;text-transform:uppercase;color:#ffffff90}.lab3d-hud .h-sim em{font-style:normal;font-weight:800;font-size:12px}
.lab3d-hud .h-sim .lt b{font:800 28px var(--cond);margin-right:8px}.lab3d-hud .h-sim .sc{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.lab3d-hud .h-sim .sc b{display:block;font:800 14px var(--cond)}
.lab3d-hud .h-sim .pu{color:#c77dff}.lab3d-hud .h-sim .up{color:#5fd38a}.lab3d-hud .h-sim .dn{color:#ff6b5a}
.lab3d-hud .h-sim .tel{display:grid;grid-template-columns:1fr 1fr 34px;gap:6px;align-items:end}.lab3d-hud .h-sim .tel b{font:800 22px var(--cond)}.lab3d-hud .h-sim .tel em{color:#ffffff90;font-weight:600;margin-left:3px}
.lab3d-hud .h-sim .pd{display:flex;gap:4px;height:34px;align-items:end}.lab3d-hud .h-sim .pd i{flex:1;border-radius:2px;transition:height .1s}
.lab3d-hud .h-sim .ref{display:flex;justify-content:space-between;font-size:11px;color:#ffffffa0;border-top:1px solid #ffffff1c;padding-top:6px}
.lab3d-hud .h-radio{position:absolute;left:14px;bottom:16px;width:min(46%,420px);flex-direction:column;gap:5px}
.lab3d-hud .h-radio div{background:#000c;border-left:3px solid var(--c);border-radius:5px;padding:6px 10px;font-size:13px;line-height:1.3;animation:radioin .3s ease-out}
.lab3d-hud .h-radio b{display:block;font:800 10px var(--cond);letter-spacing:.14em;color:var(--c)}@keyframes radioin{from{opacity:0;transform:translateX(-10px)}}
.lab3d-hud .h-bar{position:absolute;left:0;right:0;bottom:0;height:4px;background:#ffffff14}.lab3d-hud .h-bar i{display:block;height:100%;background:var(--a);transition:width .1s}
@media (max-width:900px){.lab3d-hud .h-figs div:nth-child(n+3){display:none}}
.lab .vtabs{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.lab .vtabs button{background:#ffffff12;border:1px solid var(--line);color:#fff;border-radius:6px;padding:7px 12px;font:700 13px var(--cond);letter-spacing:.06em;cursor:pointer}
.lab .vtabs button.on{background:var(--a);color:#000;border-color:var(--a)}
.lab .vtabs .sp{flex:1}
.lab .run{background:var(--a);color:#000;border:0;border-radius:6px;padding:8px 14px;font:800 13px var(--cond);letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
.lab .run:disabled{opacity:.4;cursor:default}
.lab .run small{display:block;font:600 10.5px var(--cond);letter-spacing:.04em;text-transform:none;opacity:.75}
.lab .find{display:grid;gap:7px}
.lab .find .is{display:grid;grid-template-columns:26px 1fr auto;gap:10px;align-items:start;background:#0006;border:1px solid var(--line);border-left:3px solid var(--c);border-radius:7px;padding:8px 10px;font-size:13.5px;line-height:1.35}
.lab .find .is i{width:22px;height:22px;border-radius:50%;background:var(--c);color:#000;font:800 12px/22px var(--cond);text-align:center;font-style:normal}
.lab .find .is small{display:block;color:#ffffff90;font-size:11.5px;margin-top:2px}
.lab .find .is b{font:800 11px var(--cond);letter-spacing:.1em;text-transform:uppercase;color:var(--c);white-space:nowrap}
.lab .ok{background:#2fd67314;border:1px solid #2fd67344;border-radius:7px;padding:9px 11px;font-size:13.5px;color:#bff5d4}
.lab .geo{display:grid;gap:9px}
.lab .gp{display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:center;background:#0005;border:1px solid var(--line);border-radius:8px;padding:8px 10px}
.lab .gp.ch{border-color:var(--a)}
.lab .gp span{font-size:13px;color:#ffffffc0}.lab .gp output{font:800 17px var(--cond);font-variant-numeric:tabular-nums}
.lab .gp .st{grid-column:1/3;display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
.lab .gp .st button{background:#ffffff14;border:1px solid var(--line);color:#fff;border-radius:5px;padding:5px 0;font:800 13px var(--cond);cursor:pointer}
.lab .gp .st button:hover{background:#ffffff26}
.lab .gp .tr{grid-column:1/3;height:4px;background:#ffffff12;border-radius:2px;position:relative}
.lab .gp .tr u{position:absolute;top:-3px;width:3px;height:10px;background:var(--a);border-radius:1px}
.lab .brief{display:grid;gap:10px}
.lab .brief .lbl{display:flex;justify-content:space-between;font-size:11.5px;color:#ffffffa0;font-weight:600;margin-bottom:4px}
.lab .brief .lbl b{color:#fff;font:800 12px var(--cond);letter-spacing:.08em;text-transform:uppercase}
.lab .seg{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.lab .seg button{height:26px;border-radius:5px;border:1px solid var(--line);background:#ffffff10;cursor:pointer}
.lab .seg button.on{background:var(--a);border-color:var(--a)}
.lab .seg.sm{grid-template-columns:repeat(4,1fr)}.lab .seg.sm button{color:#fff;font:700 12px var(--cond);height:28px}
.lab .seg.sm button.on{color:#000}
.lab .est{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center}
.lab .est b{font:800 30px var(--cond);line-height:1}
.lab .est .bar{height:10px;background:#ffffff12;border-radius:5px;position:relative}
.lab .est .bar i{position:absolute;left:0;top:0;bottom:0;border-radius:5px;background:linear-gradient(90deg,#ff6b5a,#ffc247 45%,#5fd38a)}
.lab .est .bar s{position:absolute;top:-3px;bottom:-3px;background:#ffffff40;border-radius:3px}
.lab .figs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}
.lab .figs div{background:#0006;border:1px solid var(--line);border-radius:7px;padding:7px 9px}
.lab .figs small{display:block;color:#ffffff90;font-size:11px}
.lab .figs b{font:800 17px var(--cond);font-variant-numeric:tabular-nums}
.lab .figs em{font-style:normal;font-size:11px;margin-left:4px}
.lab .tlog{width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums}
.lab .tlog td,.lab .tlog th{padding:5px 6px;border-bottom:1px solid #ffffff10;text-align:left}
.lab .tlog th{font:700 10.5px var(--cond);letter-spacing:.12em;color:#ffffff80;text-transform:uppercase}
.lab .spark{height:46px;width:100%;display:block;margin:4px 0 8px}
.lab .budget{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:#ffffffb0}.lab .budget b{color:#fff}
@media (max-width:1250px){.lab .c31{grid-template-columns:1fr}.lab .figs{grid-template-columns:repeat(2,1fr)}}
`;
let styled = false;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const SEV_COL = (sev) => (sev > 1.4 ? '#ff4d4d' : sev > 0.9 ? '#ff8a3d' : '#ffc247');
const fmtVal = (p, v) => `${Number.isInteger(p.step) ? Math.round(v) : v.toFixed(p.step < 0.5 ? 1 : 1)}${p.unit && !p.unit.startsWith(':') ? ' ' : ''}${p.unit}`;
const same = (t, d) => Object.keys(d.x).every((k) => t.x[k] === d.x[k]) && t.dir[0] === d.dir[0] && t.dir[1] === d.dir[1];

/** env: { ctx, st, T, team, next, nextName, sec, fxChips, img, slotList (html), slot } -> { body, wire(root) } */
export function designLab(env) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); styled = true; }
  const { ctx, st, T, team, next, nextName, sec, fxChips, slot } = env, S = SLOTS[slot], L = LAB[slot], S0 = ctx.state;
  st.lab ??= {};
  const d = (st.lab[slot] ??= newDesign(st, slot));
  S0.view = L.tests.includes(S0.view) ? S0.view : L.tests[0];
  S0.labPlan ??= { designers: 0.35, copies: 2 };
  const busy = T.projects.find((p) => p.slot === slot), blocked = quote(st, st.player, slot, signOffPlan(d)).blocked;
  const accent = team.colours[0];

  const body = `<div class="lab"><div class="row c31">
    <div class="rdc"><h3>Components</h3>${env.slotList}<div class="muted" style="margin-top:8px">The bar is the team's knowledge of each part: it grows with every design, and the next one starts closer.</div></div>
    <div class="row" style="align-content:start">
      <div class="rdc"><h3>Development lab <em>${esc(S.name)} · ${esc(S.code)}-${String(st.specs.filter((x) => x.slot === slot).length).padStart(2, '0')}</em></h3>
        <div class="vtabs">${L.tests.map((k) => `<button data-view="${k}" class="${k === S0.view ? 'on' : ''}">${TESTS[k].name}</button>`).join('')}<span class="sp"></span>
          <button class="run" data-run><span data-runlbl></span><small data-runcost></small></button></div>
        <div class="view"><canvas data-lab></canvas></div>
        <div class="budget" style="margin-top:8px"><span>Tunnel runs left <b data-atr-runs></b></span><span>CFD items left <b data-atr-cfd></b></span><span>Cost cap left <b data-cap></b></span><span>Spent on this design <b data-spent></b></span></div>
      </div>
      <div class="row c2" style="grid-template-columns:1.2fr 1fr">
        <div class="rdc"><h3>Findings <em data-find-h></em></h3><div class="find" data-find></div></div>
        <div class="rdc"><h3>Development <em data-est-h></em></h3><div data-est></div><canvas class="spark" data-spark></canvas><table class="tlog" data-log></table></div>
      </div>
      <div class="rdc"><h3>Drawings <em>${esc(dirLabel(slot, d.dir))}</em></h3><div data-bp></div></div>
    </div>
    <div class="row" style="align-content:start">
      <div class="rdc"><h3>1 · The brief <em>what it's for</em></h3><div class="brief">${S.axes.map((ax, i) => `<div><div class="lbl"><span>${esc(ax.lo)}</span><b>${esc(ax.name)}</b><span>${esc(ax.hi)}</span></div><div class="seg" data-axis="${i}">${[0, 0.25, 0.5, 0.75, 1].map((v) => `<button data-v="${v}" class="${Math.abs(d.dir[i] - v) < 0.01 ? 'on' : ''}" title="${v * 100}%"></button>`).join('')}</div></div>`).join('')}
        <div class="fx" data-fx></div><div class="muted">The brief moves where the best geometry is: change it and the tests start over.</div></div></div>
      <div class="rdc"><h3>2 · Geometry <em>what you build</em></h3><div class="geo" data-geo></div></div>
      <div class="rdc"><h3>3 · Sign off <em>to the factory</em></h3>
        <div class="muted" style="margin-bottom:6px">Design office share</div><div class="seg sm" data-designers>${[0.2, 0.35, 0.5, 0.7].map((v) => `<button data-v="${v}">${v * 100}%</button>`).join('')}</div>
        <div class="muted" style="margin:8px 0 6px">Copies to make</div><div class="seg sm" data-copies style="grid-template-columns:repeat(3,1fr)">${[1, 2, 3].map((v) => `<button data-v="${v}">${v}</button>`).join('')}</div>
        <div class="pred" data-pred style="margin-top:10px"></div>
        <button class="btn acc" data-sign>Sign off the design</button><div class="err" data-err></div></div>
    </div>
  </div></div>`;

  function wire(root) {
    const q = (sel) => root.querySelector(sel);
    const view = mountLab3d(q('[data-lab]'));
    let running = false;
    const known = () => knownIssues(d);
    const lastSame = () => [...d.tests].reverse().find((t) => same(t, d));
    const lastAny = () => d.tests[d.tests.length - 1];
    const changed = (k) => { const t = lastAny(); return t && t.x[k] !== d.x[k]; };
    const accentRGB = [1, 3, 5].map((i) => parseInt(accent.slice(i, i + 2), 16) / 255);
    const viewState = (progress = null, res = lastSame()) => ({ slot, x: d.x, kind: S0.view, team, n: st.specs.filter((x) => x.slot === slot).length, dir: modelDir(d), accentRGB, layout: ctx.trackLayout?.(next) ?? null, findings: (res ?? lastSame())?.found ?? [], issues: progress != null ? [] : known().list, progress, figures: (res ?? lastAny())?.figures, accent,
      sim: { track: nextName.replace(' Grand Prix', ''), ...simDelta(res) } });
    // What the team believes about the design: the latest estimate for this exact geometry and the issues
    // the tests have shown on it. The prediction on screen comes from this, never from the hidden truth.
    const believed = () => {
      const plan = signOffPlan(d, S0.labPlan), r = lastSame(), K = known();
      return { ...plan, lab: { ...plan.lab, score: r ? r.est : 0.45, open: K.list.reduce((s2, is) => s2 + Math.min(2, is.sev), 0) + (r ? 0 : 1.2) } };
    };
    const simDelta = (res) => {
      if (!next) return { delta: 0, fx: {} };
      // The driver feels what the design is: the full gain of a finished design, nothing at 30% of its
      // potential, and below that a part that is slower than the one on the car.
      const plan = believed(), est = res?.est ?? plan.lab.score, qq = quote(st, st.player, slot, { ...plan, lab: { ...plan.lab, score: 1 } });
      const f = (est - 0.3) / 0.7, fx = Object.fromEntries(Object.entries(qq.fx).map(([k, v]) => [k, v * f]));
      const at = Object.entries(profileOf(next)).reduce((s2, [k, w]) => s2 + w * (fx[k] ?? 0), 0) + (fx.weight ?? 0) * 0.08;
      return { delta: -at * 0.27, fx };
    };

    function renderTop() {
      const c = testCost(slot, S0.view), why = busy ? 'A project on this part is already running' : blocked ?? (c.runs > T.atr.runs ? 'No tunnel runs left this period' : c.cfd > T.atr.cfd ? 'No CFD items left this period' : T.spent + c.money > COST_CAP ? 'Over the cost cap' : '');
      q('[data-runlbl]').textContent = running ? 'Testing…' : TESTS[S0.view].verb;
      q('[data-runcost]').textContent = why || costText(c);
      q('[data-run]').disabled = running || !!why;
      q('[data-atr-runs]').textContent = T.atr.runs; q('[data-atr-cfd]').textContent = T.atr.cfd; q('[data-cap]').textContent = fmtM(COST_CAP - T.spent);
      q('[data-spent]').textContent = [d.spent.runs && `${d.spent.runs} runs`, d.spent.cfd && `${d.spent.cfd} CFD`, fmtMoney(d.spent.money)].filter(Boolean).join(' · ');
      root.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('on', b.dataset.view === S0.view));
    }
    function renderFindings() {
      const K = known(), box = q('[data-find]');
      q('[data-find-h]').textContent = K.tested ? `this geometry · ${K.kinds.map((k) => TESTS[k].name).join(', ')}` : 'not tested yet';
      if (!K.tested) { box.innerHTML = `<div class="muted">This geometry hasn't been tested. Run a test: each one sees different problems (the tunnel flow separation, CFD wakes and cooling, the rig and dyno the mechanical side, the simulator what the driver feels).</div>`; return; }
      const unseen = L.tests.filter((k) => !K.kinds.includes(k));
      box.innerHTML = K.list.map((is, k) => `<div class="is" style="--c:${SEV_COL(is.sev)}"><i>${k + 1}</i><div>${esc(is.text)}<small>${esc(L.params.find((p) => p.key === is.key).name)} · seen by ${[...new Set(is.by)].map((b) => TESTS[b].name).join(', ')}</small></div><b>${ISSUE_KIND[is.kind]} · ${sevName(is.sev)}</b></div>`).join('')
        + (K.list.length ? '' : `<div class="ok">Nothing wrong found by ${K.kinds.map((k) => TESTS[k].name.toLowerCase()).join(' or ')}.</div>`)
        + (unseen.length ? `<div class="muted">Not yet run on this geometry: ${unseen.map((k) => TESTS[k].name).join(', ')}. ${K.list.length ? '' : 'They may see what the others can\'t.'}</div>` : '');
    }
    function renderDev() {
      const r = lastSame() ?? lastAny(), box = q('[data-est]');
      if (!r) { box.innerHTML = '<div class="muted">No readings yet.</div>'; q('[data-est-h]').textContent = ''; }
      else {
        const prev = d.tests[d.tests.indexOf(r) - 1];
        q('[data-est-h]').textContent = `test ${r.n} · ${TESTS[r.kind].name}${same(r, d) ? '' : ' · older geometry'}`;
        box.innerHTML = `<div class="est"><b>${Math.round(r.est * 100)}%</b><div><div class="bar"><s style="left:${Math.max(0, r.est - r.sigma) * 100}%;width:${r.sigma * 200}%"></s><i style="width:${Math.min(100, r.est * 100)}%"></i></div><div class="muted" style="margin-top:4px">of the design's potential (±${Math.round(r.sigma * 100)}%)</div></div></div>
          <div class="figs">${L.metrics.map((m) => { const v = r.figures[m.key], pv = prev?.figures[m.key], dlt = pv != null ? v - pv : 0, good = m.lower ? dlt < 0 : dlt > 0;
            return `<div><small>${esc(m.name)}</small><b>${v.toFixed(m.d)}</b><em class="${Math.abs(dlt) < 1e-9 ? '' : good ? 'up' : 'dn'}">${pv != null && Math.abs(dlt) > 1e-9 ? `${dlt > 0 ? '▲' : '▼'}` : ''}</em><small>${esc(m.unit)}</small></div>`; }).join('')}</div>`;
      }
      // The estimate over the tests.
      const c = q('[data-spark]'), g = c.getContext('2d'), w = (c.width = c.clientWidth * 2), h = (c.height = 92);
      g.clearRect(0, 0, w, h);
      const pts = d.tests.map((t, k) => [d.tests.length < 2 ? w / 2 : (k / (d.tests.length - 1)) * (w - 20) + 10, h - 8 - t.est * (h - 16)]);
      g.strokeStyle = '#ffffff22'; g.beginPath(); g.moveTo(0, h - 8 - 0.8 * (h - 16)); g.lineTo(w, h - 8 - 0.8 * (h - 16)); g.stroke();
      if (pts.length) { g.strokeStyle = accent; g.lineWidth = 3; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); pts.forEach(([x, y]) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }); }
      q('[data-log]').innerHTML = d.tests.length ? `<tr><th>#</th><th>Test</th><th>Changed</th><th>Est.</th><th>Found</th></tr>${d.tests.slice(-6).reverse().map((t) => {
        const pi = d.tests.indexOf(t) - 1, pv = pi >= 0 ? d.tests[pi] : null;
        const ch = pv ? L.params.filter((p) => pv.x[p.key] !== t.x[p.key]).map((p) => `${p.name.split(' ')[0]} ${fmtVal(p, t.x[p.key])}`).join(', ') + (pv.dir.join() !== t.dir.join() ? ' brief' : '') : 'first';
        return `<tr><td>${t.n}</td><td>${TESTS[t.kind].name}</td><td>${esc(ch || '—')}</td><td>${Math.round(t.est * 100)}%</td><td>${t.found.length}</td></tr>`; }).join('')}` : '';
    }
    function renderGeo() {
      q('[data-geo]').innerHTML = L.params.map((p) => {
        const span = p.max - p.min, pos = ((d.x[p.key] - p.min) / span) * 100;
        return `<div class="gp ${changed(p.key) ? 'ch' : ''}"><span>${esc(p.name)}</span><output>${fmtVal(p, d.x[p.key])}</output><div class="tr"><u style="left:calc(${pos}% - 1px)"></u></div>
          <div class="st">${[-5, -1, 1, 5].map((k) => `<button data-p="${p.key}" data-k="${k}" ${running ? 'disabled' : ''}>${k > 0 ? '+' : '−'}${+(Math.abs(k) * p.step).toFixed(2)}</button>`).join('')}</div></div>`;
      }).join('');
      root.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => {
        const p = L.params.find((x) => x.key === b.dataset.p);
        d.x[p.key] = Math.round(Math.max(p.min, Math.min(p.max, d.x[p.key] + +b.dataset.k * p.step)) / p.step) * p.step;
        d.x[p.key] = +d.x[p.key].toFixed(3);
        update();
      }));
    }
    function renderSign() {
      const qq = quote(st, st.player, slot, believed()), Ld = designLoad(st), officeFree = Math.max(0, Ld.cap - Ld.used);
      root.querySelectorAll('[data-designers] button').forEach((b) => { b.classList.toggle('on', Math.abs(+b.dataset.v - S0.labPlan.designers) < 1e-6); b.disabled = +b.dataset.v > officeFree + 1e-6; });
      root.querySelectorAll('[data-copies] button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S0.labPlan.copies));
      const at = next ? Object.entries(profileOf(next)).reduce((s2, [k, w]) => s2 + w * (qq.fx[k] ?? 0), 0) + (qq.fx.weight ?? 0) * 0.08 : 0;
      const readyRound = st.round + qq.rounds + 1, gp = ctx.roundGp(readyRound), K = known();
      // What the team can tell from its tests (not the hidden truth): the estimate and the risk from what's been seen.
      const tested = d.tests.length > 0, rk = Math.round(qq.risk * 100), lvl = rk < 9 ? 'low' : rk < 17 ? 'mid' : 'high';
      q('[data-pred]').innerHTML = `<div class="kv"><span>At ${esc(nextName.replace(' Grand Prix', ''))}</span><b class="${at >= 0 ? 'up' : 'dn'}">${tested ? `${sec(at)} / lap` : '?'}</b><span>Cost</span><b>${fmtM(qq.cost)}</b><span>On the car</span><b>Round ${readyRound}${gp ? ` · ${esc(gp.replace(' Grand Prix', ''))}` : ''}</b><span>Uncertainty</span><b>±${Math.round(qq.spread * 100)}%</b></div>
        ${tested ? `<div class="fx">${fxChips(qq.fx)}</div>` : '<div class="muted" style="margin-top:6px">Untested: nobody knows what it will give.</div>'}
        <div class="risk ${lvl}"><div><span>Risk it doesn't work</span><b>${rk}%</b></div><div class="rbar"><i style="width:${Math.min(100, rk / 0.45)}%"></i></div><div class="muted">${K.list.length ? `${K.list.length} known issue${K.list.length > 1 ? 's' : ''} still in the design. ` : ''}${d.tests.length < 3 ? 'Little testing: problems may be hiding. ' : ''}Everything left wrong in it, seen or not, is the risk it's a dud or backfires on track.</div></div>`;
      const why = busy ? 'A project on this part is already running' : qq.blocked ?? (T.projects.length >= Ld.slots ? `All ${Ld.slots} project slots are in use` : S0.labPlan.designers > officeFree + 1e-6 ? 'Not enough of the design office free' : qq.cost + T.spent > COST_CAP ? 'That would go over the cost cap' : '');
      q('[data-sign]').disabled = !!why || running; q('[data-err]').textContent = why;
      q('[data-fx]').innerHTML = '';
    }
    function renderBp() {
      const nn = st.specs.filter((x) => x.slot === slot).length;
      q('[data-bp]').innerHTML = blueprint(slot, { dir: d.dir, n: nn, team, partName: S.name, name: `${S.code}-${String(nn).padStart(2, '0')} (DEVELOPMENT)`, label: dirLabel(slot, d.dir), round: st.round + 1 });
    }
    let bpT = null;
    function update() { renderTop(); renderFindings(); renderDev(); renderGeo(); renderSign(); view.set(viewState()); }

    root.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { if (running) return; S0.view = b.dataset.view; renderTop(); view.set(viewState()); }));
    root.querySelectorAll('[data-axis]').forEach((seg) => seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      if (running) return;
      d.dir[+seg.dataset.axis] = +b.dataset.v;
      seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      update(); clearTimeout(bpT); bpT = setTimeout(renderBp, 200);
    })));
    root.querySelectorAll('[data-designers] button').forEach((b) => b.addEventListener('click', () => { S0.labPlan.designers = +b.dataset.v; renderSign(); }));
    root.querySelectorAll('[data-copies] button').forEach((b) => b.addEventListener('click', () => { S0.labPlan.copies = +b.dataset.v; renderSign(); }));
    q('[data-run]').addEventListener('click', () => {
      if (running) return;
      const res = runTest(st, d, S0.view);
      if (typeof res === 'string') { q('[data-runcost]').textContent = res; return; }
      running = true; ctx.save(); renderTop(); renderGeo(); renderSign();
      const dur = S0.view === 'cfd' ? 4200 : S0.view === 'sim' ? 9000 : 3400, t0 = performance.now();
      const tick = () => {
        if (!root.isConnected) return;
        const p = Math.min(1, (performance.now() - t0) / dur);
        view.set(viewState(p, res));
        if (p < 1) requestAnimationFrame(tick);
        else { running = false; update(); }
      };
      tick();
    });
    q('[data-sign]').addEventListener('click', () => {
      const plan = signOffPlan(d, S0.labPlan), e = startProject(st, st.player, slot, plan);
      if (e) { q('[data-err]').textContent = e; return; }
      st.log.push({ round: st.round, kind: 'design', text: `${S.name} signed off after ${d.tests.length} test${d.tests.length === 1 ? '' : 's'} (${d.spent.runs} tunnel runs, ${d.spent.cfd} CFD items, ${fmtMoney(d.spent.money)} of rig and simulator time).` });
      delete st.lab[slot];
      ctx.save(); ctx.goSub(2);
    });
    update(); renderBp();
  }
  return { body, wire };
}
