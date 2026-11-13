import { TONES } from '../game/interviews.js';

/**
 * The interview screen: a live TV-style frame over the garage scene (the pit lane outside): the
 * reporter's caption, the question, three answers in different tones; a short reply, then the next
 * reporter. items: from buildInterview; onAnswer(item, answer); onDone().
 */
const CSS = `
.ivw { position: fixed; inset: 0; z-index: 2000; display: flex; flex-direction: column; justify-content: flex-end; padding: 0 0 78px; pointer-events: none; font-family: inherit; }
.ivw .live { position: absolute; left: 26px; top: 22px; display: flex; gap: 8px; align-items: center; }
.ivw .live b { background: #e10600; color: #fff; font-size: 12px; font-weight: 900; letter-spacing: 2px; padding: 5px 10px; }
.ivw .live span { background: rgba(10,12,18,.82); color: #eef0f4; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; padding: 5px 10px; text-transform: uppercase; }
.ivw .live i { width: 8px; height: 8px; border-radius: 50%; background: #ff3b30; animation: ivwb 1s infinite; }
@keyframes ivwb { 50% { opacity: .2 } }
.ivw .card { margin: 0 auto; width: min(860px, calc(100% - 32px)); pointer-events: auto; }
.ivw .who { display: inline-flex; align-items: stretch; box-shadow: 0 6px 22px #0007; }
.ivw .who i { width: 6px; background: var(--c); }
.ivw .who div { background: #f4f5f8; color: #0b0c10; padding: 7px 14px; }
.ivw .who b { display: block; font-size: 16px; letter-spacing: 1px; text-transform: uppercase; }
.ivw .who small { font-size: 11px; letter-spacing: 1.2px; color: #555b66; text-transform: uppercase; }
.ivw .q { background: rgba(10,12,18,.9); color: #fff; font-size: 19px; line-height: 1.35; padding: 16px 18px; border-left: 6px solid var(--c); }
.ivw .ans { display: grid; gap: 8px; margin-top: 10px; }
.ivw .ans button { text-align: left; font: inherit; font-size: 15px; color: #eef0f4; background: rgba(18,20,28,.9); border: 1px solid #ffffff22; padding: 11px 14px; cursor: pointer; display: flex; gap: 12px; align-items: baseline; }
.ivw .ans button:hover, .ivw .ans button.sel { background: #262a36; border-color: var(--c); }
.ivw .ans button em { font-style: normal; font-size: 10.5px; font-weight: 800; letter-spacing: 1.3px; text-transform: uppercase; color: #9aa0ad; min-width: 78px; }
.ivw .ans button kbd { font: inherit; font-size: 11px; color: #7d828e; }
.ivw .reply { background: rgba(10,12,18,.9); color: #cfd3dc; font-size: 15px; font-style: italic; padding: 12px 16px; margin-top: 10px; }
.ivw .bar { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; color: #eef0f4; text-shadow: 0 1px 3px #000; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
.ivw .bar button { pointer-events: auto; font: inherit; font-size: 12px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: #fff; background: #e10600; border: 0; padding: 9px 14px; cursor: pointer; }
.ivw .bar button.skip { background: transparent; border: 1px solid #ffffff33; }
@media (max-width: 720px) { .ivw .q { font-size: 16px; } .ivw .ans button { font-size: 14px; } }
`;
let styled = false;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const REPLIES = {
  confident: ['Bold words. We will hold you to that.', 'Plenty of confidence there, then.', 'A strong message to the rest of the grid.'],
  measured: ['Sensible. Thanks for that.', 'Calm as ever.', 'A very team-first answer.'],
  deflect: ['Giving nothing away, I see.', "We'll take that as a no comment.", 'Straight past that one.'],
  fiery: ['That will get a reaction in the paddock.', 'Strong stuff. The fans will love that.', 'There is some fire in that answer.'],
};

export function renderInterview(_anchor, { kind, items, onAnswer, onDone: done, frame }) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); styled = true; }
  // On the page itself (the front end's panels are transformed and clipped): removed when it ends.
  document.querySelectorAll('.ivw-host').forEach((x) => x.remove());
  const root = document.createElement('div'); root.className = 'ivw-host'; document.body.appendChild(root);
  const onDone = () => { root.remove(); removeEventListener('keydown', onKey); done(); };
  let k = 0, sel = 0, answered = null;
  const draw = () => {
    const it = items[k], c = it.reporter.colour;
    root.innerHTML = `<div class="ivw" style="--c:${c}"><div class="live"><i></i><b>LIVE</b><span>${kind === 'pre' ? 'Pit lane · before practice' : 'Media pen · after the race'}</span></div>
      <div class="card"><div class="who"><i></i><div><b>${esc(it.reporter.name)}</b><small>${esc(it.reporter.outlet)} · ${esc(it.reporter.role)}</small></div></div>
      <div class="q">${esc(it.text)}</div>
      ${answered ? `<div class="reply">"${esc(answered.a.text)}"<br><span style="font-style:normal;color:#9aa0ad">${esc(it.reporter.name.split(' ')[0])}: ${esc(answered.reply)}</span></div>`
        : `<div class="ans">${it.answers.map((a, j) => `<button data-j="${j}" class="${j === sel ? 'sel' : ''}"><em>${TONES[a.tone]}</em><span>${esc(a.text)}</span><kbd>${j + 1}</kbd></button>`).join('')}</div>`}
      <div class="bar"><span>Question ${k + 1} of ${items.length}</span><span>${answered ? `<button data-a="next">${k + 1 < items.length ? 'Next reporter ›' : 'Finish ›'}</button>` : '<button class="skip" data-a="skip">Skip the interviews</button>'}</span></div></div></div>`;
    root.querySelectorAll('[data-j]').forEach((b) => b.addEventListener('click', () => answer(+b.dataset.j)));
    root.querySelector('[data-a="next"]')?.addEventListener('click', next);
    root.querySelector('[data-a="skip"]')?.addEventListener('click', () => onDone());
    frame?.([['a', answered ? 'Next' : 'Answer', () => (answered ? next() : answer(sel))], ['b', 'Skip', () => onDone()]], (d) => { if (!answered) { sel = (sel + d + 3) % 3; draw(); } });
  };
  const answer = (j) => {
    const it = items[k], a = it.answers[j], pool = REPLIES[a.tone];
    answered = { a, reply: pool[Math.floor(Math.random() * pool.length)] };
    onAnswer(it, a);
    draw();
  };
  const next = () => { k++; answered = null; sel = 0; if (k >= items.length) onDone(); else draw(); };
  function onKey(e) { if (!root.isConnected) { removeEventListener('keydown', onKey); return; } if (!answered && /^Digit[123]$/.test(e.code)) answer(+e.code.slice(5) - 1); }
  addEventListener('keydown', onKey);
  draw();
}
