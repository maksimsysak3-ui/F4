import { sectorColour } from './game/session.js';

/**
 * The qualifying graphics of the TV feed, the way the broadcast does them: the timing tower with
 * live sector bars for every car on a flying lap, the chequered flag on a lap finished under the
 * flag, the drop zone in red and the driver at risk on the cut line; the timing box of the car on
 * screen (its live gap to pole at each sector and where that would put it) and two smaller boxes
 * for the other flying laps.
 */
const CSS = `
#spec .qt, #spec .qbox, #spec .qside { display: none; }
#spec.quali .qt, #spec.quali .qside { display: block; }
#spec.quali .qbox.on { display: block; }
#spec.quali .card { display: none !important; }
body.spectating.specq #tower { display: none !important; }
#spec .qt { position: absolute; left: 22px; top: 22px; width: 236px; font-variant-numeric: tabular-nums; transform-origin: top left; }
#spec .qt .hd { display: flex; align-items: center; height: 34px; background: rgba(10,12,18,.92); border-bottom: 2px solid #e10600; padding: 0 10px; gap: 10px; font-weight: 900; letter-spacing: 1.5px; }
#spec .qt .hd .fl { width: 22px; height: 16px; background: conic-gradient(#fff 25%, #111 0 50%, #fff 0 75%, #111 0) 0 0 / 8px 8px; opacity: 0; }
#spec .qt .hd .fl.on { opacity: 1; }
#spec .qt .hd .ck { margin-left: auto; color: #e10600; font-size: 15px; }
#spec .qt .hd .ck.ok { color: #eef0f4; }
#spec .qt ol { list-style: none; margin: 0; padding: 0; background: rgba(10,12,18,.84); }
#spec .qt li { display: grid; grid-template-columns: 26px 24px 4px 46px 1fr; align-items: center; height: 21px; gap: 5px; padding-right: 8px; font-size: 12.5px; font-weight: 800; letter-spacing: .8px; }
#spec .qt li + li { border-top: 1px solid #ffffff0d; }
#spec .qt .st { display: flex; gap: 2px; justify-content: center; }
#spec .qt .st i { width: 4px; height: 13px; background: #ffffff1c; }
#spec .qt .st .flag { width: 15px; height: 11px; background: conic-gradient(#fff 25%, #111 0 50%, #fff 0 75%, #111 0) 0 0 / 5px 5px; }
#spec .qt .p { display: grid; place-items: center; height: 17px; background: #eef0f4; color: #0b0c10; font-weight: 900; font-size: 12px; }
#spec .qt .p.drop { background: #b3001b; color: #fff; }
#spec .qt .p.imp { background: #2fd15b; color: #0b0c10; }
#spec .qt .p.pur { background: #a64dff; color: #fff; }
#spec .qt .c { height: 13px; }
#spec .qt .t { text-align: right; color: #dfe2e8; }
#spec .qt .t.nt { color: #8a909c; font-size: 11px; }
#spec .qt .t.g { color: #2fd15b; } #spec .qt .t.pu { color: #c77dff; }
#spec .qt .risk { background: rgba(10,12,18,.94); border-top: 2px solid #e10600; border-bottom: 2px solid #e10600; padding: 4px 8px 6px; }
#spec .qt .risk small { display: block; text-align: center; font-size: 10.5px; font-weight: 900; letter-spacing: 2px; color: #eef0f4; }
#spec .qt .risk div { display: grid; grid-template-columns: 24px 4px 1fr auto; gap: 7px; align-items: center; margin-top: 3px; font-weight: 900; letter-spacing: 1.2px; }
#spec .qt .risk div .p { height: 20px; }
#spec .qt .risk div span:nth-child(3) { font-size: 14px; text-transform: uppercase; }
#spec .qt .risk div b { font-size: 17px; }
#spec .sx { display: flex; gap: 2px; }
#spec .sx i { flex: 1; height: 15px; font-style: normal; font-size: 9.5px; font-weight: 900; letter-spacing: 1px; display: grid; place-items: center; background: #ffffff18; color: #0b0c10; }
#spec .sx .p { background: #a64dff; color: #fff; } #spec .sx .g { background: #2fd15b; } #spec .sx .y { background: #ffd21f; }
#spec .qbox { position: absolute; left: 50%; bottom: 22px; transform: translateX(-62%); width: 340px; background: rgba(10,12,18,.9); box-shadow: 0 8px 26px #0008; font-variant-numeric: tabular-nums; }
#spec .qhead { display: grid; grid-template-columns: 34px 4px 1fr 26px; align-items: center; gap: 8px; height: 36px; padding-right: 8px; border-bottom: 1px solid #ffffff14; }
#spec .qhead .p { display: grid; place-items: center; height: 100%; background: #eef0f4; color: #0b0c10; font-weight: 900; font-size: 18px; }
#spec .qhead .p.imp { background: #2fd15b; } #spec .qhead .p.pur { background: #a64dff; color: #fff; } #spec .qhead .p.drop { background: #b3001b; color: #fff; }
#spec .qhead .c { height: 20px; }
#spec .qhead b { font-size: 19px; letter-spacing: 1.6px; text-transform: uppercase; white-space: nowrap; overflow: hidden; }
#spec .ty { width: 22px; height: 22px; border-radius: 50%; border: 3px solid var(--t, #ffd21f); display: grid; place-items: center; font-size: 10px; font-weight: 900; }
#spec .qmid { display: grid; grid-template-columns: 1fr auto; align-items: center; padding: 6px 12px; gap: 12px; }
#spec .qmid .big { font-size: 30px; font-weight: 900; letter-spacing: .5px; }
#spec .qmid .big.g { color: #2fd15b; } #spec .qmid .big.y { color: #ffd21f; } #spec .qmid .big.pu { color: #c77dff; }
#spec .qmid .ref { text-align: right; border-left: 1px solid #ffffff22; padding-left: 12px; }
#spec .qmid .ref small { display: block; font-size: 11px; font-weight: 800; letter-spacing: 1.4px; color: #9aa0ad; text-transform: uppercase; }
#spec .qmid .ref span { font-size: 19px; font-weight: 800; }
#spec .qbox .sx { padding: 0 0 0; }
#spec .qside { position: absolute; right: 22px; bottom: 70px; display: flex; flex-direction: column; gap: 8px; width: 250px; font-variant-numeric: tabular-nums; }
#spec .qs { background: rgba(10,12,18,.9); box-shadow: 0 6px 20px #0007; }
#spec .qs .qhead { height: 30px; grid-template-columns: 30px 4px 1fr 24px; }
#spec .qs .qhead .p { font-size: 15px; } #spec .qs .qhead b { font-size: 15px; }
#spec .qs .tm { text-align: center; font-size: 20px; font-weight: 800; padding: 3px 0 4px; }
#spec .qs .pg { position: relative; height: 5px; background: #ffffff14; }
#spec .qs .pg u { position: absolute; left: 0; top: 0; bottom: 0; background: #eef0f4aa; text-decoration: none; }
#spec .qs .pg .sx { position: absolute; inset: 0; } #spec .qs .pg .sx i { height: 5px; background: transparent; }
#spec .qs .pg .sx .p { background: #a64dff; } #spec .qs .pg .sx .g { background: #2fd15b; } #spec .qs .pg .sx .y { background: #ffd21f; }
@media (max-height: 760px) { #spec .qt { transform: scale(.86); } }
@media (max-height: 620px) { #spec .qt { transform: scale(.72); } }
@media (max-width: 900px) { #spec .qside { display: none !important; } #spec .qbox { transform: translateX(-50%); width: 300px; } }
@media (max-width: 720px) { #spec .qt { transform: scale(.62); left: 8px; top: 8px; } #spec .qbox { bottom: 64px; } }
`;

const TYRE = { S: '#e8002d', M: '#ffd21f', H: '#f0f0f0', I: '#3fbf5a', W: '#2d7fe0' };
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const surname = (e) => { const n = (e.name ?? e.code ?? '').trim().split(/\s+/); return n.length > 1 ? n.slice(1).join(' ') : n[0]; };
const lapFmt = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s.toFixed(3).padStart(6, '0')}`; };
const runFmt = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s.toFixed(1).padStart(4, '0')}`; };
const delta = (d) => `${d < 0 ? '-' : '+'}${Math.abs(d).toFixed(3)}`;
const sum = (xs, n) => xs.slice(0, n).reduce((x, y) => x + y, 0);
const RECENT = 7;   // seconds a just-set time stays lit

export class QualiGraphics {
  constructor(root) {
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    this.root = root;
    root.insertAdjacentHTML('beforeend', '<div class="qt"><div class="hd"><span class="lb"></span><span class="fl"></span><span class="ck"></span></div><div class="rows"></div></div><div class="qbox"></div><div class="qside"></div>');
    this.q = (c) => root.querySelector(c);
    this.cache = {};
  }

  set(on) {
    this.root.classList.toggle('quali', on);
    document.body.classList.toggle('specq', on);
  }

  /** Redraw from the session S (a qualifying one), the field and the car on screen. */
  update(S, field, target, L) {
    const seg = S.segment, now = S.elapsed, t = field.time;
    const order = S.standings().filter((r) => !S.out.has(r.id));
    const key = (r) => r.segBest[seg];
    const pole = order[0] && key(order[0]) != null ? order[0] : null;
    const cut = seg < 2 && order.length > (seg === 0 ? 16 : 10) ? (seg === 0 ? 16 : 10) : null;
    const posOf = new Map(order.map((r, k) => [r, k + 1]));
    const flying = (a) => a && a.state === 'track' && a.lapType === 'push';
    const recent = (r) => r.lastRec && r.lastRec.improved && now - r.lastRec.at < RECENT && now >= r.lastRec.at;
    // A car's live sector colours (the bests are only updated at the end of its lap).
    const liveCols = (r, a) => a.sectors.map((x, k) => sectorColour(x, S.overall.sectors[k], r.bestSectors[k]));
    const posCls = (r, p) => (recent(r) ? (r.lastRec.fastest ? 'pur' : 'imp') : cut && p > cut ? 'drop' : '');

    // ---- the tower ----
    this.q('.qt .lb').textContent = S.label;
    const ck = this.q('.qt .ck');
    ck.textContent = S.state === 'break' ? 'END' : runFmt(Math.max(0, S.remaining)).replace(/\.\d$/, '');
    ck.classList.toggle('ok', S.remaining > 60 && S.state === 'green');
    this.q('.qt .fl').classList.toggle('on', S.state === 'chequer' || S.state === 'break');
    const row = (r, p) => {
      const a = r.ai;
      let st = '';
      if (flying(a) && S.state !== 'break' && !r.flagDone) st = liveCols(r, a).map((c) => `<i style="${c ? `background:${c === 'p' ? '#a64dff' : c === 'g' ? '#2fd15b' : '#ffd21f'}` : ''}"></i>`).join('');
      else if (r.flagDone || (S.state === 'break' && key(r) != null)) st = '<span class="flag"></span>';
      const k = key(r), rc = recent(r);
      const tm = k == null ? '<span class="t nt">NO TIME</span>'
        : rc ? `<span class="t ${r.lastRec.fastest ? 'pu' : 'g'}">${lapFmt(k)}</span>`
          : p === 1 ? `<span class="t">${lapFmt(k)}</span>` : `<span class="t">${pole ? delta(k - key(pole)) : lapFmt(k)}</span>`;
      return `<li><span class="st">${st}</span><span class="p ${posCls(r, p)}">${p}</span><span class="c" style="background:${esc(r.e.colour)}"></span><span>${esc(r.e.code)}</span>${tm}</li>`;
    };
    let html = '';
    order.forEach((r, k) => {
      const p = k + 1;
      if (cut && p === cut) {
        html += `</ol><div class="risk"><small>DRIVER AT RISK</small><div><span class="p ${posCls(r, p)}">${p}</span><span class="c" style="background:${esc(r.e.colour)};height:20px"></span><span>${esc(surname(r.e))}</span><b>${key(r) != null ? lapFmt(key(r)) : 'NO TIME'}</b></div></div><ol>`;
      } else html += row(r, p);
    });
    if (html !== this.cache.tower) { this.cache.tower = html; this.q('.qt .rows').innerHTML = `<ol>${html}</ol>`; }

    // ---- the box of the car on screen ----
    const box = this.q('.qbox');
    const r = target ? S.row(target.entry.id) : null;
    if (!r) { box.classList.remove('on'); } else {
      const a = target, e = r.e, p = posOf.get(r) ?? '–';
      const head = (pos, cls) => `<div class="qhead"><span class="p ${cls}">${pos}</span><span class="c" style="background:${esc(e.colour)}"></span><b>${esc(surname(e))}</b><span class="ty" style="--t:${TYRE[a.compound] ?? '#ffd21f'}">${esc(a.compound ?? 'S')}</span></div>`;
      const strip = (cols) => `<div class="sx">${[0, 1, 2].map((k) => `<i class="${cols[k] ?? ''}">${k === 2 ? 'SECTOR 3' : `S${k + 1}`}</i>`).join('')}</div>`;
      const ref = pole && pole !== r ? `<div class="ref"><small>${esc(surname(pole.e))}</small><span>${lapFmt(key(pole))}</span></div>` : pole === r ? '<div class="ref"><small>Provisional</small><span>POLE</span></div>' : '';
      let inner;
      const done = r.lastRec && now - r.lastRec.at < RECENT && now >= r.lastRec.at;
      if (flying(a) && !(done && t - a.lapStart < 6)) {
        const n = a.sectors.filter((x) => x != null).length, cols = liveCols(r, a);
        const ps = pole?.segSectors?.[seg];
        if (n > 0 && ps && pole !== r) {
          // The gap to pole at the last split, and where the lap would put it if the rest went like pole's.
          const d = sum(a.sectors, n) - sum(ps, n), proj = key(pole) + d;
          const pp = 1 + order.filter((o) => o !== r && key(o) != null && key(o) < proj).length;
          const better = key(r) == null || proj < key(r);
          inner = head(pp, d < 0 ? 'pur' : better ? 'imp' : cut && pp > cut ? 'drop' : '') + `<div class="qmid"><span class="big ${d < 0 ? 'pu' : 'y'}">${delta(d)}</span>${ref}</div>` + strip(cols);
        } else inner = head(p, posCls(r, p)) + `<div class="qmid"><span class="big">${runFmt(t - a.lapStart)}</span>${ref}</div>` + strip(cols);
      } else if (done) {
        const lr = r.lastRec, d = pole && pole !== r ? lr.time - key(pole) : null;
        inner = head(p, lr.improved ? (lr.fastest ? 'pur' : 'imp') : posCls(r, p)) + `<div class="qmid"><span class="big ${lr.fastest ? 'pu' : lr.improved ? 'g' : 'y'}">${lapFmt(lr.time)}</span>${d != null ? `<div class="ref"><small>Gap to pole</small><span>${delta(d)}</span></div>` : ref}</div>` + strip(lr.cols);
      } else {
        const what = a.state === 'pitOut' ? 'PIT EXIT' : a.state === 'pitIn' || a.state === 'stop' ? 'IN THE PITS' : a.lapType === 'out' ? 'OUT LAP' : a.lapType === 'in' ? 'IN LAP' : 'COOL-DOWN';
        inner = head(p, posCls(r, p)) + `<div class="qmid"><span class="big" style="font-size:20px;letter-spacing:2px">${what}</span><div class="ref"><small>Best</small><span>${key(r) != null ? lapFmt(key(r)) : '—'}</span></div></div>`;
      }
      if (inner !== this.cache.box) { this.cache.box = inner; box.innerHTML = inner; }
      box.classList.add('on');
    }

    // ---- the other flying laps: the ones on the cut line first, then the nearest the line ----
    const others = order.filter((o) => o.ai && o.ai !== target && flying(o.ai) && !o.flagDone);
    const prog = (a) => (((a.car.s % L.length) + L.length) % L.length) / L.length;
    const prio = (o) => { const p = posOf.get(o); return (key(o) == null || (cut && p >= cut - 2) ? 1 : 0) + prog(o.ai); };
    const side = others.sort((x, y) => prio(y) - prio(x)).slice(0, 2).map((o) => {
      const a = o.ai, p = posOf.get(o), cols = liveCols(o, a);
      return `<div class="qs"><div class="qhead"><span class="p ${posCls(o, p)}">${p}</span><span class="c" style="background:${esc(o.e.colour)}"></span><b>${esc(surname(o.e))}</b><span class="ty" style="--t:${TYRE[a.compound] ?? '#ffd21f'}">${esc(a.compound ?? 'S')}</span></div><div class="tm">${runFmt(t - a.lapStart)}</div><div class="pg"><u style="width:${(prog(a) * 100).toFixed(1)}%"></u><div class="sx">${cols.map((c) => `<i class="${c}"></i>`).join('')}</div></div></div>`;
    }).join('');
    if (side !== this.cache.side) { this.cache.side = side; this.q('.qside').innerHTML = side; }
  }
}
