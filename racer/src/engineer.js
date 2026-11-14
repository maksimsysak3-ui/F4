/*
 * The race engineer: the third tab of the telemetry pop-up. Ask by tapping a quick question, typing,
 * or talking (where the browser can listen); the answer comes over the radio, written as it arrives
 * and read aloud, with the voice shown as a moving wave.
 *
 * With a Claude API key (the player's own, kept in this browser only and sent only to
 * api.anthropic.com) the answers come from Claude, given the live data of the car and the session.
 * Without one, an offline engineer answers from the same data. Either way the engineer calls each
 * timed lap over the radio in a race weekend.
 *
 * getContext() (from main) returns the live data: see dataBlock() for the fields.
 */
import { EngineerBrain, analyseLap } from './engineerBrain.js?v=1a016bc';

const KEY = 'tiny-f1:anthropic-key', RADIO = 'tiny-f1:engineer-radio';
const SDK_URL = '../vendor/anthropic-sdk/anthropic-sdk-1.8.0.mjs';
const MODEL = 'claude-opus-5-5';
const QUICK = [['Pace?', 'How is my pace compared to the others?'], ['Tyres?', 'How are the tyres, and are we on the right compound?'], ['Weather?', 'What is the weather doing for the rest of the session?'], ['Where am I slow?', 'Where am I losing time on this lap?']];

const CSS = `
#engineer{left:22px;bottom:210px;width:420px;display:none;user-select:text;padding:10px 12px 12px;box-sizing:border-box;pointer-events:auto;font-family:"Titillium Web",system-ui,sans-serif;color:#eef0f4}
#engineer .tabs{display:flex;gap:22px;font-size:11px;font-weight:700;letter-spacing:.06em;margin-bottom:8px}
#engineer .tabs button{background:none;border:0;padding:0 0 4px;color:rgba(255,255,255,.4);font:inherit;cursor:pointer;border-bottom:2px solid transparent}
#engineer .tabs button.on{color:#fff;border-color:#ffc21a}
#engineer .tabs span{margin-left:auto;color:rgba(255,255,255,.35);font-weight:600}
#engineer .wave{position:relative;height:58px;background:#0b0d12cc;border:1px solid #ffffff1a;border-radius:6px;overflow:hidden}
#engineer .wave canvas{width:100%;height:100%;display:block}
#engineer .wave b{position:absolute;left:10px;top:6px;font-size:10px;letter-spacing:.16em;color:#ffffff99}
#engineer .wave i{position:absolute;right:10px;top:6px;font-size:10px;letter-spacing:.16em;font-style:normal;color:#ffc21a}
#engineer .log{max-height:112px;overflow:auto;margin:8px 0;font-size:13px;line-height:1.35}
#engineer .log p{margin:0 0 5px}
#engineer .log p small{font-size:10px;font-weight:700;letter-spacing:.12em;margin-right:6px;color:#ffffff80}
#engineer .log p.eng small{color:#ffc21a}
#engineer .log p.err{color:#ff8a80}
#engineer .chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:7px}
#engineer button.c{background:#ffffff12;border:1px solid #ffffff26;color:#fff;font:600 12px "Titillium Web",system-ui;padding:3px 9px;border-radius:12px;cursor:pointer}
#engineer button.c:hover{background:#ffffff26}
#engineer .ask{display:flex;gap:6px}
#engineer input{flex:1;min-width:0;background:#0b0d12cc;border:1px solid #ffffff2e;border-radius:4px;color:#fff;font:13px "Titillium Web",system-ui;padding:6px 8px;outline:none}
#engineer input:focus{border-color:#ffc21a}
#engineer button.b{background:#ffc21a;border:0;border-radius:4px;color:#111;font:700 12px "Titillium Web",system-ui;padding:0 11px;cursor:pointer;letter-spacing:.04em}
#engineer button.b.mic{background:#ffffff1f;color:#fff}
#engineer button.b.mic.on{background:#e10600}
#engineer .foot{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:11px;color:#ffffff8c}
#engineer .foot a{color:#ffc21a;cursor:pointer;text-decoration:underline}
#engineer .foot label{display:flex;align-items:center;gap:4px;margin-left:auto;cursor:pointer}
#engineer .keyform{display:none;margin-top:8px;font-size:11px;color:#ffffff99;line-height:1.4}
#engineer .keyform.on{display:block}
#engineer .keyform div{display:flex;gap:6px;margin-bottom:4px}
@media (max-width:700px){#engineer{width:calc(100% - 24px);left:12px}}
`;

const readKey = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = (t) => (t == null ? null : `${Math.floor(t / 60)}:${(t % 60).toFixed(3).padStart(6, '0')}`);

/** Lap times the way an engineer says them: 1:05.432 -> "one oh five four". */
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty'];
const two = (n) => (n < 10 ? `oh ${NUM[n]}` : n < 20 ? NUM[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + NUM[n % 10] : ''}`);
export function speakable(text) {
  return text.replace(/\b(\d):(\d{2})\.(\d)\d*\b/g, (_, m, s, d) => `${NUM[+m]} ${two(+s)} ${NUM[+d]}`).replace(/\bP(\d{1,2})\b/g, 'P $1');
}

export class Engineer {
  constructor({ getContext, onTab }) {
    this.getContext = getContext;
    this.onTab = onTab;
    this.history = [];       // the conversation with Claude (MessageParam[])
    this.brain = new EngineerBrain(); // the built-in engineer (no key needed)
    this.state = 'idle';     // idle | listening | thinking | speaking
    this.level = 0;
    try { this.radioOn = localStorage.getItem(RADIO) !== 'off'; } catch { this.radioOn = true; }
    this.build();
  }

  // ------------------------------------------------------------------------------------------ DOM
  build() {
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    const el = (this.el = document.createElement('div'));
    el.id = 'engineer'; el.className = 'hud panel';
    el.innerHTML = `<div class="tabs"><button data-t="physics">PHYSICS</button><button data-t="lap">LAP</button><button data-t="engineer" class="on">ENGINEER</button><span>4 / X: next</span></div>
      <div class="wave"><canvas width="792" height="116"></canvas><b>TEAM RADIO</b><i></i></div>
      <div class="log"></div>
      <div class="chips">${QUICK.map(([l], k) => `<button class="c" data-q="${k}">${l}</button>`).join('')}</div>
      <div class="ask"><input type="text" maxlength="300" placeholder="Ask your engineer…" aria-label="Question for the race engineer"><button class="b mic" title="Talk (hold a question in your voice)">TALK</button><button class="b send">SEND</button></div>
      <div class="foot"><span class="mode"></span><a class="setkey"></a><label><input type="checkbox" class="radio"> Lap radio</label></div>
      <div class="keyform"><div><input type="password" class="key" placeholder="sk-ant-…" autocomplete="off" aria-label="Claude API key"><button class="b save">SAVE</button><button class="b mic forget">FORGET</button></div>
        Your own Claude API key: kept in this browser only and sent only to api.anthropic.com, to answer your questions. Optional: without one, the free built-in engineer answers from the car's data.</div>`;
    document.body.appendChild(el);
    const q = (x) => el.querySelector(x);
    this.log = q('.log'); this.input = q('.ask input'); this.status = q('.wave i'); this.canvas = q('.wave canvas');
    el.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => this.onTab?.(b.dataset.t)));
    el.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => this.ask(QUICK[+b.dataset.q][1], QUICK[+b.dataset.q][0])));
    const send = () => { const t = this.input.value.trim(); if (t) { this.input.value = ''; this.ask(t); } };
    q('.send').addEventListener('click', send);
    this.input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') send(); if (e.key === 'Escape') this.input.blur(); });
    q('.key').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') q('.save').click(); });
    q('.setkey').addEventListener('click', () => q('.keyform').classList.toggle('on'));
    q('.save').addEventListener('click', () => { const v = q('.key').value.trim(); if (!v) return; try { localStorage.setItem(KEY, v); } catch { /* storage off */ } q('.key').value = ''; q('.keyform').classList.remove('on'); this.client = null; this.refreshFoot(); this.line('eng', 'Copy, radio check complete. Ask away.'); });
    q('.forget').addEventListener('click', () => { try { localStorage.removeItem(KEY); } catch { /* storage off */ } this.client = null; this.history = []; this.refreshFoot(); });
    const radio = q('.radio');
    radio.checked = this.radioOn;
    radio.addEventListener('change', () => { this.radioOn = radio.checked; try { localStorage.setItem(RADIO, radio.checked ? 'on' : 'off'); } catch { /* storage off */ } });
    // Voice questions, where the browser can listen.
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition, mic = q('.mic:not(.forget)');
    if (!SR) mic.style.display = 'none';
    else mic.addEventListener('click', () => this.listen(SR, mic));
    this.refreshFoot();
  }
  refreshFoot() {
    const has = !!readKey();
    this.el.querySelector('.mode').textContent = has ? 'Claude engineer' : 'Built-in engineer (free)';
    this.el.querySelector('.setkey').textContent = has ? 'API key' : 'Add a Claude API key';
  }
  set visible(v) {
    this.el.style.display = v ? 'block' : 'none';
    if (v && !this.raf) this.animate();
  }
  get visible() { return this.el.style.display === 'block'; }

  line(kind, text) {
    const p = document.createElement('p');
    p.className = kind;
    p.innerHTML = `<small>${kind === 'you' ? 'YOU' : kind === 'eng' ? 'ENG' : '!'}</small>${esc(text)}`;
    this.log.appendChild(p);
    while (this.log.children.length > 24) this.log.firstChild.remove();
    this.log.scrollTop = this.log.scrollHeight;
    return p;
  }
  setState(s) { this.state = s; this.status.textContent = s === 'idle' ? '' : s.toUpperCase(); }

  // --------------------------------------------------------------------------------------- voice
  listen(SR, mic) {
    if (this.rec) { this.rec.stop(); return; }
    const rec = (this.rec = new SR());
    rec.lang = 'en-GB'; rec.interimResults = false; rec.maxAlternatives = 1;
    mic.classList.add('on'); this.setState('listening'); speechSynthesis?.cancel();
    rec.onresult = (e) => { const t = e.results[0]?.[0]?.transcript; if (t) this.ask(t); };
    rec.onerror = () => {};
    rec.onend = () => { this.rec = null; mic.classList.remove('on'); if (this.state === 'listening') this.setState('idle'); };
    try { rec.start(); } catch { rec.onend(); }
  }
  /** Read a sentence out over the radio (queued after the last one). */
  say(text) {
    if (!('speechSynthesis' in window) || !text.trim()) return;
    const u = new SpeechSynthesisUtterance(speakable(text));
    const voices = speechSynthesis.getVoices();
    u.voice = voices.find((v) => /en-GB/i.test(v.lang) && /male|daniel|george|arthur/i.test(v.name)) ?? voices.find((v) => /en-GB/i.test(v.lang)) ?? null;
    u.rate = 1.06; u.pitch = 0.92;
    u.onstart = () => this.setState('speaking');
    u.onboundary = () => { this.level = 1; };
    u.onend = () => { if (!speechSynthesis.speaking && !speechSynthesis.pending) this.setState(this.busy ? 'thinking' : 'idle'); };
    speechSynthesis.speak(u);
  }
  /** The wave: still when quiet, a slow pulse while thinking, a moving voice while speaking. */
  animate() {
    const g = this.canvas.getContext('2d'), W = this.canvas.width, H = this.canvas.height;
    let t = 0;
    const tick = () => {
      if (!this.visible) { this.raf = null; return; }
      t += 1 / 60;
      const target = this.state === 'speaking' ? 0.55 + 0.45 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 2.9)) : this.state === 'thinking' ? 0.18 + 0.1 * Math.sin(t * 3) : this.state === 'listening' ? 0.3 + 0.2 * Math.abs(Math.sin(t * 5)) : 0.04;
      this.level += (Math.max(target, this.level * 0.9) - this.level) * 0.25;
      g.clearRect(0, 0, W, H);
      const n = 64, bw = W / n;
      for (let k = 0; k < n; k++) {
        const env = Math.sin((Math.PI * (k + 0.5)) / n);
        const wob = 0.55 + 0.45 * Math.sin(k * 0.9 + t * 11) * Math.cos(k * 0.37 - t * 6.5);
        const h = Math.max(3, H * 0.86 * this.level * env * wob);
        g.fillStyle = this.state === 'listening' ? '#e10600' : this.state === 'idle' ? '#ffffff40' : '#ffc21a';
        g.fillRect(k * bw + bw * 0.2, (H - h) / 2, bw * 0.6, h);
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  // ------------------------------------------------------------------------------------ questions
  async ask(question, shown = question) {
    if (this.state === 'listening') this.rec?.stop();
    speechSynthesis?.cancel();
    this.stream?.abort();
    this.line('you', shown);
    const ctx = this.getContext();
    if (!readKey()) { const a = this.brain.answer(question, ctx); this.line('eng', a); this.say(a); return; }
    this.busy = true; this.setState('thinking');
    const p = this.line('eng', '…');
    try {
      const reply = await this.claude(question, ctx, (text) => { p.innerHTML = `<small>ENG</small>${esc(text)}`; this.log.scrollTop = this.log.scrollHeight; });
      p.innerHTML = `<small>ENG</small>${esc(reply)}`;
    } catch (err) {
      const msg = this.errorText(err);
      if (msg === null) return; // superseded by a newer question
      p.className = 'err'; p.innerHTML = `<small>!</small>${esc(msg)}`;
      const a = this.brain.answer(question, ctx); this.line('eng', a); this.say(a);
    } finally { this.busy = false; if (this.state === 'thinking') this.setState('idle'); }
  }

  async client_() {
    if (this.client) return this.client;
    const { default: Anthropic } = await import(SDK_URL);
    this.Anthropic = Anthropic;
    this.client = new Anthropic({ apiKey: readKey(), dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 30_000 });
    return this.client;
  }

  /** One question to Claude, streamed: each finished sentence is read out as soon as it arrives. */
  async claude(question, ctx, onText) {
    const client = await this.client_();
    const mine = { role: 'user', content: `<car_data>\n${dataBlock(ctx)}\n</car_data>\n\n${question}` };
    this.history.push(mine);
    try { return await this.send(client, ctx, onText); } catch (err) {
      const i = this.history.indexOf(mine); // a failed question leaves no trace in the conversation
      if (i >= 0) this.history.splice(i, 1);
      throw err;
    }
  }
  async send(client, ctx, onText) {
    while (this.history.length > 12) this.history.splice(0, 2); // keep the last few exchanges (starting with the driver)
    const stream = (this.stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 2048,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: systemPrompt(ctx),
      messages: this.history,
    }));
    let text = '', spoken = 0;
    stream.on('text', (d) => {
      text += d; onText(text);
      // Speak each sentence as it completes (shorter wait than reading the whole reply at the end).
      const m = /^[\s\S]*[.!?](?=\s)/.exec(text.slice(spoken));
      if (m) { this.say(m[0]); spoken += m[0].length; }
    });
    const msg = await stream.finalMessage();
    if (this.stream === stream) this.stream = null;
    if (msg.stop_reason === 'refusal') throw new Error('refusal');
    const reply = text.trim() || 'Say again, didn’t copy.';
    this.say(text.slice(spoken));
    this.history.push({ role: 'assistant', content: msg.content });
    return reply;
  }
  errorText(err) {
    const A = this.Anthropic;
    if (A && err instanceof A.APIUserAbortError) return null;
    if (A && err instanceof A.AuthenticationError) return 'The API key was rejected. Check it under "API key".';
    if (A && err instanceof A.PermissionDeniedError) return 'This API key can’t use the model.';
    if (A && err instanceof A.RateLimitError) return 'Rate limited by the API. Offline answer for now.';
    if (A && err instanceof A.APIConnectionError) return 'No connection to the API. Offline answer for now.';
    if (A && err instanceof A.APIError) return `API error ${err.status ?? ''}. Offline answer for now.`;
    if (err?.message === 'refusal') return 'The engineer couldn’t answer that one.';
    return 'The engineer couldn’t be reached. Offline answer for now.';
  }

  /** A call the driver must hear (race strategy, the start): always written and read out. */
  call(text) { this.line('eng', text); this.say(text); }

  /** A radio call from the pit wall (after a lap, say): written and read out, no question needed. */
  radio(text) {
    if (!this.radioOn) return;
    this.line('eng', text);
    this.say(text);
  }
}

// ------------------------------------------------------------------------------------- the data
function systemPrompt(ctx) {
  return `You are the race engineer for ${ctx.team ?? 'the team'} in a Formula 1 game, on team radio with your driver, ${ctx.driver ?? 'the driver'}. Talk like a real F1 race engineer: calm, direct and specific. Your replies are read aloud while the driver is driving, so keep each one to one to three short sentences (under 45 words), with no markdown, lists or emoji.

Each message from the driver starts with a <car_data> block: the live data from the car and the session at the moment they asked. Base every number you give on that block; if what they ask about isn't in it, say you don't have that data rather than guessing. Lap and sector times are in seconds or m:ss.sss. Gaps are to the fastest car unless stated. Corner numbers in the data are counted by the game from the layout and may not match the official turn numbers, so name corners by their kind, direction and distance into the lap. Give advice the driver can act on now (where to find time, which tyre, when to push or come in).`;
}

/** The live data as plain lines for the model. */
export function dataBlock(c) {
  const L = [];
  L.push(`circuit: ${c.track}`);
  if (c.session) L.push(`session: ${c.session.name} (${c.session.label}), ${c.session.remaining} remaining, ${c.session.flag}`);
  else L.push('session: free practice on an empty track (no timing against other cars)');
  if (c.race) {
    L.push(`race: P${c.position} of ${c.cars}, ${c.lapsLeft} of ${c.laps} laps to go${c.penalty ? `, ${c.penalty} s penalty` : ''}`);
    if (c.aheadRace) L.push(`car ahead on the road: ${c.aheadRace.code}, ${c.aheadRace.gap.toFixed(1)} s ahead`);
    if (c.behindRace) L.push(`car behind: ${c.behindRace.code}, ${c.behindRace.gap.toFixed(1)} s behind`);
    L.push(`tyres: ${c.compound}, ${c.tyreWear}% tread left after ${c.tyreLaps} laps; pit stops so far ${c.pits}; plan: ${c.nextStopLap ? `stop on lap ${c.nextStopLap} for ${c.nextCompound}` : 'no more stops'}${c.wantsPit ? ' (box now)' : ''}`);
  }
  else if (c.position) L.push(`position: P${c.position} of ${c.cars}${c.knockedOut ? ' (knocked out)' : ''}${c.cutLine ? `, the cut line is P${c.cutLine}` : ''}`);
  if (c.leader) L.push(`fastest: ${c.leader.code} ${fmt(c.leader.time)}`);
  L.push(`driver best lap: ${fmt(c.best) ?? 'none yet'}${c.gap != null ? ` (+${c.gap.toFixed(3)} to the fastest)` : ''}`);
  if (c.ahead) L.push(`car ahead on the timesheet: ${c.ahead.code} ${fmt(c.ahead.time)} (${(c.best - c.ahead.time).toFixed(3)} s quicker)`);
  if (c.last) L.push(`last lap: ${fmt(c.last.time)}, sectors ${c.last.sectors.map((x) => (x == null ? '—' : x.toFixed(3))).join(' / ')}${c.last.valid === false ? ' (deleted: track limits)' : ''}`);
  if (c.bestSectors?.some((x) => x != null)) L.push(`driver best sectors: ${c.bestSectors.map((x) => (x == null ? '—' : x.toFixed(3))).join(' / ')}`);
  if (c.fastestSectors?.some((x) => x != null)) L.push(`session fastest sectors: ${c.fastestSectors.map((x) => (x == null ? '—' : x.toFixed(3))).join(' / ')}`);
  if (c.lapStatus) L.push(`now: ${c.lapStatus}, ${Math.round(c.speed)} km/h in gear ${c.gear}`);
  L.push(`tyres: ${{ S: 'soft', M: 'medium', H: 'hard', I: 'intermediate', W: 'full wet' }[c.compound] ?? 'standard'}${c.sessionLaps != null ? `; laps completed this session: ${c.sessionLaps}` : ''}`);
  L.push(`weather: ${c.weather}, track ${c.wetness > 0.6 ? 'wet' : c.wetness > 0.2 ? 'damp' : 'dry'} (wetness ${c.wetness.toFixed(2)})${c.forecast ? `; forecast: ${c.forecast}` : ''}`);
  const a = analyseLap(c);
  if (a) {
    const name = (k) => `corner ${k.n} (${k.kind} ${k.dir > 0 ? 'left' : 'right'}, ${Math.round(k.s)} m into the lap)`;
    const top = a.corners.filter((k) => k.total > 0.03).sort((p, q) => q.total - p.total).slice(0, 3);
    L.push(`last lap vs the driver's previous best: ${a.total >= 0 ? '+' : ''}${a.total.toFixed(3)} s overall`);
    for (const k of top) L.push(`  lost ${k.total.toFixed(3)} s at ${name(k)}: entry ${k.entry.toFixed(3)}, apex ${k.mid.toFixed(3)}, exit ${k.exit.toFixed(3)}; min speed ${Math.round(k.vMin)} vs ${Math.round(k.vMinRef)} km/h; braking ${Math.round(-k.brakeGap)} m ${k.brakeGap < 0 ? 'earlier' : 'later'}`);
  }
  if (c.damage) L.push(`damage: ${c.damage}`);
  return L.join('\n');
}
