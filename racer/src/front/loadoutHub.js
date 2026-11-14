import { SLOTS, SLOT_IDS, COST_CAP, specById, fmtM } from '../game/rd.js?v=1a016bc';
import { PU_ELEMENTS, PU_IDS, KM_WEEKEND, unitOf, wearOf, powerFactor, failRisk, fitUnit, fitNew, newUnitPenalty, batchQuote, orderBatch, factoryCapacity, inProduction } from '../game/loadout.js?v=1a016bc';
import { gridPenalties } from '../game/fia.js?v=1a016bc';

/*
 * The R&D tab's Loadout page: what's on the car and in the stores. The power unit (each element's units,
 * their mileage and health, the season allocation, fitting from the pool or a new one and what that
 * costs on the grid), what the wear does to the power and the chance of a failure, and the chassis
 * parts: copies in stock, batches in the factory, ordering more (the tooling, the cost per part
 * falling with the size of the batch, the factory's capacity).
 */
const CSS = `
.lo .stat4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.lo .big{font:800 30px var(--cond);line-height:1}.lo .big small{font:600 13px var(--cond);color:#ffffffa0;margin-left:6px}
.lo .pu{display:grid;gap:8px}
.lo .el{display:grid;grid-template-columns:230px 150px 1fr 170px;gap:14px;align-items:center;background:#0006;border:1px solid var(--line);border-radius:9px;padding:10px 12px}
.lo .el b{font:800 15px var(--cond)}.lo .el small{display:block;color:#ffffff90;font-size:11.5px;line-height:1.3;margin-top:2px}
.lo .alloc{display:flex;gap:4px;flex-wrap:wrap}.lo .alloc i{width:18px;height:22px;border-radius:3px;background:#ffffff16;border:1px solid #ffffff22}
.lo .alloc i.used{background:var(--a);border-color:var(--a)}.lo .alloc i.over{background:#ff4d4d;border-color:#ff4d4d}
.lo .alloc em{font-style:normal;font-size:11.5px;color:#ffffffa0;width:100%}
.lo .units{display:flex;gap:6px;flex-wrap:wrap}
.lo .unit{min-width:96px;background:#ffffff0d;border:1px solid var(--line);border-radius:7px;padding:6px 8px;font-size:12px;color:#fff;text-align:left;font-family:inherit;cursor:pointer}
.lo .unit.fit{border-color:var(--a);box-shadow:0 0 0 1px var(--a) inset;cursor:default}.lo .unit.dead{opacity:.45;cursor:default;text-decoration:line-through}
.lo .unit b{font:800 13px var(--cond)}.lo .unit .wb{height:5px;border-radius:3px;background:#ffffff18;margin:4px 0 3px;overflow:hidden}.lo .unit .wb i{display:block;height:100%}
.lo .parts{width:100%;border-collapse:collapse;font-size:13.5px}
.lo .parts td{padding:8px 8px;border-bottom:1px solid #ffffff10;vertical-align:middle}
.lo .parts th{font:700 11px var(--cond);letter-spacing:.12em;text-transform:uppercase;color:#ffffff80;text-align:left;padding:6px 8px;border-bottom:1px solid #ffffff22}
.lo .parts img{width:84px;height:52px;object-fit:cover;border-radius:6px;background:#0b0d12;display:block}
.lo .qty{display:flex;gap:5px}.lo .qty button{background:#ffffff12;border:1px solid var(--line);color:#fff;border-radius:6px;padding:5px 8px;font:700 12px var(--cond);cursor:pointer;line-height:1.15;text-align:center}
.lo .qty button small{display:block;font-weight:600;font-size:10.5px;color:#ffffffa0}.lo .qty button:hover{border-color:var(--a)}
.lo .pen{display:grid;gap:4px}.lo .pen div{background:#ff4d4d1f;border-left:3px solid #ff4d4d;border-radius:5px;padding:6px 9px;font-size:13px}
@media (max-width:1200px){.lo .stat4{grid-template-columns:1fr 1fr}.lo .el{grid-template-columns:1fr 1fr}}
`;
let styled = false;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const wearCol = (w) => (w > 1 ? '#ff4d4d' : w > 0.8 ? '#ff8a3d' : w > 0.55 ? '#ffc247' : '#5fd38a');
/** How often a part is broken in a weekend (contact, kerbs, crashes): a guide to how many spares to carry. */
const BREAKS = { frontWing: 0.32, rearWing: 0.12, floor: 0.14, sidepods: 0.06, suspension: 0.1, brakes: 0.04, chassis: 0.02, pu: 0 };

/** env: { ctx, st (rd), season, team, img(slot, spec, team, w, h) } -> { body, wire(root) } */
export function loadoutPage(env) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); styled = true; }
  const { ctx, st, season, team, img } = env, lo = season.loadout, T = st.teams[st.player], round = season.round ?? 0;
  const risk = failRisk(lo), pf = powerFactor(lo), pens = gridPenalties(season, round).filter((p) => p.id === `${season.team}-0`);
  const body = `<div class="lo">
    <div class="stat4">
      <div class="rdc"><h3>Failure risk <em>this race</em></h3><div class="big" style="color:${risk.p > 0.08 ? '#ff6b5a' : risk.p > 0.04 ? '#ffc247' : '#5fd38a'}">${(risk.p * 100).toFixed(1)}%</div><div class="muted" style="margin-top:6px">Most at risk: ${esc(PU_ELEMENTS[risk.per[0].el].name)} (${Math.round(wearOf(risk.per[0].el, unitOf(lo, risk.per[0].el)) * 100)}% of its life)</div></div>
      <div class="rdc"><h3>Power <em>wear</em></h3><div class="big">${pf >= 0.9995 ? 'Full' : `−${((1 - pf) * 100).toFixed(2)}%`}<small>${pf >= 0.9995 ? '' : `≈ ${((1 - pf) * 0.32 * 90).toFixed(2)} s a lap`}</small></div><div class="muted" style="margin-top:6px">Worn units lose power: fresh ones for the power circuits.</div></div>
      <div class="rdc"><h3>Grid penalties <em>next race</em></h3>${pens.length ? `<div class="pen">${pens.map((p) => `<div><b>${p.back ? 'Back of the grid' : `${p.places} places`}</b> · ${esc(p.reasons.join('; '))}</div>`).join('')}</div>` : '<div class="big" style="color:#5fd38a">None</div>'}</div>
      <div class="rdc"><h3>Factory <em>${inProduction(st)} of ${factoryCapacity(st)} in production</em></h3><div class="big">${fmtM(COST_CAP - T.spent)}<small>cost cap left</small></div><div class="muted" style="margin-top:6px">Each batch pays its tooling once: the more parts in it, the cheaper each one.</div></div>
    </div>
    <div class="rdc"><h3>Power unit <em>2026 allocation per driver · about ${KM_WEEKEND} km a weekend</em></h3><label class="muted" style="display:flex;gap:8px;align-items:center;margin:-4px 0 10px;cursor:pointer"><input type="checkbox" data-auto ${lo.auto !== false ? 'checked' : ''}> The team manages the units within the allocation (a worn unit is changed for the freshest in the pool, or a new one while the allocation allows). Untick to run it yourself.</label><div class="pu">${PU_IDS.map((el) => {
      const E = PU_ELEMENTS[el], U = lo.units[el], pen = newUnitPenalty(lo, el);
      return `<div class="el"><div><b>${esc(E.name)}</b><small>${esc(E.what)}</small></div>
        <div><div class="alloc">${Array.from({ length: Math.max(E.alloc, U.length) }, (_, k) => `<i class="${k < U.length ? (k < E.alloc ? 'used' : 'over') : ''}"></i>`).join('')}<em>${U.length} of ${E.alloc} used</em></div></div>
        <div class="units">${U.map((u) => { const w = wearOf(el, u), fit = lo.fitted[el] === u.n;
          return `<button class="unit ${fit ? 'fit' : ''} ${u.dead ? 'dead' : ''}" ${fit || u.dead ? 'disabled' : ''} data-fit="${el}:${u.n}"><b>#${u.n}</b> ${fit ? 'fitted' : u.dead ? 'finished' : 'pool'}<div class="wb"><i style="width:${Math.min(100, w * 100)}%;background:${wearCol(w)}"></i></div>${Math.round(u.km)} km · ${Math.max(0, Math.round((1 - w) * 100))}% left</button>`; }).join('')}</div>
        <div><button class="btn ${pen ? 'ghost' : 'acc'} sm" data-new="${el}" style="width:100%">Fit new #${U.length + 1}</button><small style="margin-top:5px;color:${pen ? '#ff8a7c' : '#ffffff90'}">${pen ? `${pen}-place grid penalty next race` : 'Inside the allocation'}</small></div></div>`;
    }).join('')}</div><div class="err" data-pu-err></div></div>
    <div class="rdc"><h3>Chassis parts <em>copies in stock and the factory</em></h3>
      <table class="parts"><tr><th></th><th>Part</th><th>Fitted</th><th>In stock</th><th>In the factory</th><th>Breaks</th><th>Order a batch of the fitted spec</th></tr>
      ${SLOT_IDS.filter((s) => s !== 'pu').map((slot) => {
        const sp = specById(st, st.fitted[slot]), copies = sp?.n ? sp.copies : '∞', prod = (st.pending ?? []).filter((p) => specById(st, p.specId)?.slot === slot);
        const spares = st.specs.filter((x) => x.slot === slot && x.n > 0 && x.id !== sp?.id && x.copies > 0).map((x) => `${x.name} ×${x.copies}`).join(', ');
        return `<tr><td><img alt="" src="${img(slot, sp, team, 168, 104)}"></td><td><b>${esc(SLOTS[slot].name)}</b><div class="muted" style="font-size:11.5px">${spares ? `Also: ${esc(spares)}` : 'Fallback: the launch spec'}</div></td>
          <td><span class="rdt acc">${esc(sp?.name ?? '')}</span></td>
          <td><b style="color:${sp?.n && sp.copies < 2 ? '#ff8a7c' : '#fff'}">${copies}</b></td>
          <td>${prod.length ? `${prod.length} · ready R${Math.min(...prod.map((p) => p.ready)) + 1}` : '—'}</td>
          <td>${Math.round(BREAKS[slot] * 100)}% of weekends</td>
          <td>${sp?.n ? `<div class="qty">${[1, 2, 4, 6].map((q) => { const Q = batchQuote(st, sp.id, q); return `<button data-order="${sp.id}:${q}" title="Tooling ${fmtM(Q.setup)} + ${q} × ${fmtM(Q.per)}, ${Q.rounds} round${Q.rounds > 1 ? 's' : ''}">×${q}<small>${fmtM(Q.total)} · ${fmtM(Q.perUnit)} ea</small></button>`; }).join('')}</div>` : '<span class="muted">Always available</span>'}</td></tr>`;
      }).join('')}</table><div class="err" data-order-err></div>
      <div class="muted">A broken part is replaced from the stores; with no copy of its spec left the next best spec goes on, and with nothing left the launch spec. Parts of a spec that is overtaken stay on the shelf: build what the next races need.</div></div>
    <div class="row c2"><div class="rdc log"><h3>Power unit log</h3>${lo.log.slice(-8).reverse().map((l) => `<div><small>R${l.round + 1}</small><span>${esc(l.text)}</span></div>`).join('') || '<p class="muted" style="margin:0">Every unit on the car is the first of its kind.</p>'}</div>
      <div class="rdc log"><h3>The factory</h3>${(st.pending ?? []).length ? Object.values((st.pending ?? []).reduce((a, p) => { const k = `${p.specId}|${p.ready}`; (a[k] ??= { ...p, n: 0 }).n++; return a; }, {})).map((p) => `<div><small>R${p.ready + 1}</small><span>${p.n} × ${esc(specById(st, p.specId)?.name ?? '')} ${esc(SLOTS[specById(st, p.specId)?.slot]?.name.toLowerCase() ?? '')}</span></div>`).join('') : '<p class="muted" style="margin:0">Nothing in production.</p>'}</div></div>
  </div>`;
  function wire(root) {
    root.querySelector('[data-auto]')?.addEventListener('change', (e) => { lo.auto = e.target.checked; ctx.save(); });
    root.querySelectorAll('[data-fit]').forEach((b) => b.addEventListener('click', () => { const [el, n] = b.dataset.fit.split(':'); const e = fitUnit(lo, el, +n); if (e) { root.querySelector('[data-pu-err]').textContent = e; return; } ctx.save(); ctx.rerender(); }));
    root.querySelectorAll('[data-new]').forEach((b) => b.addEventListener('click', () => {
      const el = b.dataset.new, pen = newUnitPenalty(lo, el);
      if (pen && b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = `Confirm: ${pen} places`; return; }
      fitNew(lo, el, round); ctx.save(); ctx.rerender();
    }));
    root.querySelectorAll('[data-order]').forEach((b) => b.addEventListener('click', () => { const [id, q] = b.dataset.order.split(':'); const e = orderBatch(st, id, +q); if (e) { root.querySelector('[data-order-err]').textContent = e; return; } ctx.save(); ctx.rerender(); }));
  }
  return { body, wire };
}
