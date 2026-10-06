/**
 * Synthesised sound: an engine built from firing-order harmonics (per-car
 * profile: V10 shriek, V8 burble...) through a throttle-driven filter, tire squeal from band-passed noise, wind, exhaust
 * pops and a horn. No audio files. Starts on the first user gesture.
 */
export class CarAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.started = false;
    this.profile = null;
  }

  /** Engine character: { firingPerRev, harmonics: [[mult, type, level]...], twin: [mult, level], brightness }. */
  setProfile(profile) {
    this.profile = profile;
    if (this.oscs) this.applyProfile();
  }

  applyProfile() {
    const p = this.profile;
    p.harmonics.forEach(([mult, type, level], i) => {
      const o = this.oscs[i];
      o.o.type = type;
      o.mult = mult;
      o.g.gain.value = level;
    });
    const twin = this.oscs[p.harmonics.length];
    twin.mult = p.twin[0];
    twin.g.gain.value = p.twin[1];
  }

  start() {
    if (this.started) return;
    this.started = true;
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    const master = (this.master = ctx.createGain());
    master.gain.value = this.muted ? 0 : 0.55;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);

    // --- Engine: harmonics of the firing frequency (5 pulses per rev for a V10).
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.Q.value = 2.5;
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeDrive(2.2);
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    shaper.connect(this.engineFilter).connect(this.engineGain).connect(master);

    // One oscillator per profile harmonic, plus a slightly detuned twin bank for the V-engine "beat".
    this.oscs = [];
    for (let i = 0; i <= this.profile.harmonics.length; i++) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      const g = ctx.createGain();
      o.connect(g).connect(shaper);
      o.start();
      this.oscs.push({ o, g, mult: 1 });
    }
    this.applyProfile();

    const noise = noiseBuffer(ctx);
    const src = (n) => { const s = ctx.createBufferSource(); s.buffer = n; s.loop = true; s.start(); return s; };

    // Intake roar: noise through a band that tracks rpm.
    this.intake = ctx.createBiquadFilter();
    this.intake.type = 'bandpass';
    this.intake.Q.value = 1.2;
    this.intakeGain = ctx.createGain();
    this.intakeGain.gain.value = 0;
    src(noise).connect(this.intake).connect(this.intakeGain).connect(master);

    // Tire squeal.
    this.squeal = ctx.createBiquadFilter();
    this.squeal.type = 'bandpass';
    this.squeal.frequency.value = 900;
    this.squeal.Q.value = 9;
    this.squealGain = ctx.createGain();
    this.squealGain.gain.value = 0;
    src(noise).connect(this.squeal).connect(this.squealGain).connect(master);

    // Wind.
    this.wind = ctx.createBiquadFilter();
    this.wind.type = 'lowpass';
    this.wind.frequency.value = 500;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    src(noise).connect(this.wind).connect(this.windGain).connect(master);

    // Combustion texture: noise pulsed at the firing frequency (each cylinder's bang), banded with rpm.
    // This is what makes the oscillator stack sound like an engine rather than a synth.
    this.comb = ctx.createBiquadFilter();
    this.comb.type = 'bandpass';
    this.comb.Q.value = 1.1;
    this.combGain = ctx.createGain();
    this.combGain.gain.value = 0;
    this.combAm = ctx.createGain();
    this.combAm.gain.value = 0.5;
    this.combLfo = ctx.createOscillator();
    this.combLfo.type = 'square';
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.5;
    this.combLfo.connect(lfoDepth).connect(this.combAm.gain);
    this.combLfo.start();
    src(noise).connect(this.comb).connect(this.combAm).connect(this.combGain).connect(master);

    // Bodywork scraping a barrier: gritty band-passed noise.
    this.scrapeFilter = ctx.createBiquadFilter();
    this.scrapeFilter.type = 'bandpass';
    this.scrapeFilter.frequency.value = 2400;
    this.scrapeFilter.Q.value = 0.9;
    this.scrapeGain = ctx.createGain();
    this.scrapeGain.gain.value = 0;
    src(noise).connect(this.scrapeFilter).connect(this.scrapeGain).connect(master);

    // Rain on the bodywork: bright hiss, a touch of low rumble.
    this.rainFilter = ctx.createBiquadFilter();
    this.rainFilter.type = 'bandpass';
    this.rainFilter.frequency.value = 3200;
    this.rainFilter.Q.value = 0.5;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = this.rainOn ? 0.09 : 0;
    src(noise).connect(this.rainFilter).connect(this.rainGain).connect(master);

    this.noise = noise;
  }

  setRain(on) {
    this.rainOn = on;
    if (this.rainGain) this.rainGain.gain.setTargetAtTime(on ? 0.09 : 0, this.ctx.currentTime, 0.4);
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.05);
  }

  update(vehicle) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const rpm = vehicle.rpm;
    const fire = (rpm / 60) * this.profile.firingPerRev;
    for (const { o, mult } of this.oscs) o.frequency.setTargetAtTime(fire * mult * 0.5, t, 0.012);
    const load = vehicle.throttle;
    const bright = this.profile.brightness;
    this.engineFilter.frequency.setTargetAtTime((500 + rpm * 0.35 + load * 2600) * bright + 250 * (1 - bright), t, 0.03);
    this.engineGain.gain.setTargetAtTime(0.16 + load * 0.26, t, 0.04);
    this.intake.frequency.setTargetAtTime(300 + rpm * 0.45, t, 0.03);
    this.intakeGain.gain.setTargetAtTime(load * 0.12 * (rpm / 8000), t, 0.05);

    let slide = 0;
    for (const w of vehicle.wheels) {
      if (!w.inContact) continue;
      slide = Math.max(slide, Math.min(1, Math.max(0, w.slip - 1.05) * 0.8) * Math.min(1, w.groundSpeed / 6));
    }
    this.squealGain.gain.setTargetAtTime(slide * 0.35, t, 0.05);
    this.squeal.frequency.setTargetAtTime(700 + slide * 500, t, 0.1);

    // Combustion pulses follow the firing frequency; louder and brighter under load.
    this.combLfo.frequency.setTargetAtTime(Math.min(1400, fire), t, 0.012);
    this.comb.frequency.setTargetAtTime(500 + rpm * 0.28 + load * 900, t, 0.03);
    this.combGain.gain.setTargetAtTime(this.profile?.electric ? 0 : (0.05 + load * 0.16) * (0.6 + 0.4 * bright), t, 0.04); // an electric motor has no combustion pulses

    const v = vehicle.speed;
    this.windGain.gain.setTargetAtTime(Math.min(0.35, (v * v) / 9000), t, 0.2);
    this.wind.frequency.setTargetAtTime(300 + v * 18, t, 0.2);
  }

  /** Impact: a low thump, crunching panels and a metallic clang, scaled by impact speed (m/s). */
  crash(speed) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const k = Math.min(1, (speed - 4) / 18);
    // Thump.
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.25);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.9 * k + 0.2, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(og).connect(this.master);
    o.start(t); o.stop(t + 0.4);
    // Crunch: a burst of noise through a falling band.
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.7;
    f.frequency.setValueAtTime(2200, t);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.3);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.8 * k + 0.15, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    n.connect(f).connect(ng).connect(this.master);
    n.start(t, Math.random() * 1.5, 0.5);
    // Clang: three inharmonic partials ringing out (struck metal).
    for (const [freq, lvl] of [[420, 0.18], [1130, 0.1], [2370, 0.06]]) {
      const c = ctx.createOscillator();
      c.type = 'triangle';
      c.frequency.value = freq * (0.92 + Math.random() * 0.16);
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(lvl * k, t);
      cg.gain.exponentialRampToValueAtTime(0.001, t + 0.6 + Math.random() * 0.3);
      c.connect(cg).connect(this.master);
      c.start(t); c.stop(t + 1);
    }
  }

  /** Continuous scrape along a barrier: amount ~ sliding speed (m/s) while touching, 0 otherwise. */
  scrape(amount) {
    if (!this.scrapeGain) return;
    const t = this.ctx.currentTime;
    this.scrapeGain.gain.setTargetAtTime(Math.min(0.35, amount * 0.018), t, amount > 0 ? 0.02 : 0.08);
    this.scrapeFilter.frequency.setTargetAtTime(1600 + Math.min(3000, amount * 90), t, 0.05);
  }

  pop() {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900 + Math.random() * 900;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random() * 1.5, 0.1);
  }

  horn(on) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    if (on && !this.hornNodes) {
      const g = ctx.createGain();
      g.gain.value = 0.18;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 2200;
      f.connect(g).connect(this.master);
      // Two-tone clown-car horn.
      const os = [415, 523].map((freq) => {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = freq;
        o.connect(f);
        o.start();
        return o;
      });
      this.hornNodes = { g, os };
    } else if (!on && this.hornNodes) {
      const { g, os } = this.hornNodes;
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      os.forEach((o) => o.stop(ctx.currentTime + 0.1));
      this.hornNodes = null;
    }
  }
}

function makeDrive(k) {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curve;
}

function noiseBuffer(ctx) {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
