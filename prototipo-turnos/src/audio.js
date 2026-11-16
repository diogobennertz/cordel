'use strict';
// Efeitos sonoros sintetizados (sem arquivos de áudio)
const SFX = (() => {
  let ac = null, muted = false;
  function ctx() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, dur, type = 'square', vol = 0.06, slide = 0, delay = 0) {
    if (muted) return;
    try {
      const a = ctx(), t0 = a.currentTime + delay;
      const o = a.createOscillator(), g = a.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(a.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) { /* áudio indisponível */ }
  }
  function noise(dur, vol = 0.05, delay = 0) {
    if (muted) return;
    try {
      const a = ctx(), t0 = a.currentTime + delay;
      const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = a.createBufferSource(), g = a.createGain();
      s.buffer = buf; g.gain.value = vol;
      s.connect(g); g.connect(a.destination);
      s.start(t0);
    } catch (e) { /* áudio indisponível */ }
  }
  return {
    toggle() { muted = !muted; return muted; },
    get muted() { return muted; },
    hit: () => { tone(260, 0.08, 'square', 0.05, -120); noise(0.05, 0.03); },
    miss: () => tone(500, 0.06, 'triangle', 0.03, 200),
    hurt: () => { tone(140, 0.18, 'sawtooth', 0.06, -70); noise(0.08, 0.04); },
    kill: () => { tone(330, 0.08, 'square', 0.05); tone(220, 0.14, 'square', 0.05, -100, 0.07); },
    pickup: () => { tone(660, 0.06, 'triangle', 0.05); tone(990, 0.08, 'triangle', 0.05, 0, 0.06); },
    use: () => tone(440, 0.12, 'sine', 0.06, 220),
    level: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.05, 0, i * 0.09)),
    descend: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.16, 'sine', 0.06, 0, i * 0.1)),
    death: () => [330, 262, 196, 131].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.05, -20, i * 0.22)),
    win: () => [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.06, 0, i * 0.14)),
    whoosh: () => { noise(0.3, 0.04); tone(300, 0.3, 'sine', 0.03, 600); },
    charge: () => { noise(0.25, 0.06); tone(120, 0.25, 'sawtooth', 0.05, -40); },
    sing: () => [880, 988, 880, 784].forEach((f, i) => tone(f, 0.2, 'sine', 0.035, 0, i * 0.12)),
    fire: () => { noise(0.45, 0.07); tone(90, 0.4, 'sawtooth', 0.04, 60); },
  };
})();
