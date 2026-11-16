'use strict';
// ===== Som: efeitos sintetizados + trilha de ritmos brasileiros gerada por código =====
const Som = (() => {
  let ac = null, master = null, sfxBus = null, musicBus = null;
  let muted = false, musicOn = true;
  try { muted = localStorage.getItem('mata-mudo') === '1'; } catch (e) { /* sem armazenamento */ }
  const last = {};
  function ctx() {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ac.destination);
      sfxBus = ac.createGain(); sfxBus.gain.value = 0.7; sfxBus.connect(master);
      musicBus = ac.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, dur, type = 'square', vol = 0.06, slide = 0, delay = 0, bus) {
    const a = ctx(), t0 = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bus || sfxBus); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  let noiseBuf = null;
  function noise(dur, vol = 0.05, delay = 0, hp = 0, bus, at) {
    const a = ctx(), t0 = at != null ? at : a.currentTime + delay;
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = a.createBufferSource(), g = a.createGain();
    s.buffer = noiseBuf;
    let node = s;
    if (hp) { const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; s.connect(f); node = f; }
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    node.connect(g); g.connect(bus || sfxBus); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02);
  }

  const SFX = {
    swing: () => noise(0.12, 0.05, 0, 1500),
    slash: () => { noise(0.08, 0.05, 0, 3000); tone(900, 0.05, 'triangle', 0.02, -400); },
    berimbau: () => { tone(196, 0.5, 'triangle', 0.08, 30); tone(392, 0.2, 'sine', 0.03, 0, 0.02); },
    grab: () => { tone(150, 0.12, 'square', 0.05, -60); noise(0.06, 0.04); },
    shield: () => tone(330, 0.3, 'sine', 0.05, 330),
    magic: () => tone(660 + Math.random() * 120, 0.18, 'sine', 0.035, 500),
    throw: () => noise(0.15, 0.04, 0, 800),
    shot: () => { noise(0.18, 0.09, 0, 200); tone(90, 0.12, 'square', 0.05, -40); },
    hurt: () => { tone(160, 0.2, 'sawtooth', 0.07, -80); noise(0.1, 0.05); },
    kill: () => tone(500 + Math.random() * 200, 0.06, 'square', 0.025, -200),
    xp: () => tone(1200 + Math.random() * 400, 0.04, 'sine', 0.015),
    coin: () => { tone(988, 0.06, 'square', 0.03); tone(1318, 0.1, 'square', 0.03, 0, 0.05); },
    heal: () => [523, 659, 784].forEach((f, i) => tone(f, 0.12, 'triangle', 0.04, 0, i * 0.05)),
    level: () => [392, 494, 587, 784].forEach((f, i) => tone(f, 0.16, 'triangle', 0.06, 0, i * 0.07)),
    buy: () => { tone(784, 0.08, 'square', 0.04); tone(1046, 0.12, 'square', 0.04, 0, 0.07); },
    reroll: () => [600, 700, 800, 900].forEach((f, i) => tone(f, 0.05, 'square', 0.025, 0, i * 0.03)),
    dash: () => noise(0.18, 0.05, 0, 2000),
    whoosh: () => { noise(0.35, 0.05, 0, 600); tone(250, 0.3, 'sine', 0.03, 500); },
    charge: () => { noise(0.35, 0.07); tone(110, 0.35, 'sawtooth', 0.05, -40); },
    fire: () => { noise(0.6, 0.09, 0, 300); tone(80, 0.5, 'sawtooth', 0.04, 50); },
    boss: () => { tone(98, 0.9, 'sawtooth', 0.07, -30); tone(147, 0.9, 'sawtooth', 0.05, -40, 0.1); noise(0.5, 0.06, 0, 100); },
    bossDead: () => [392, 330, 392, 494, 587, 784].forEach((f, i) => tone(f, 0.25, 'triangle', 0.07, 0, i * 0.11)),
    win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.07, 0, i * 0.15)),
    death: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, 'sawtooth', 0.06, -20, i * 0.25)),
    click: () => tone(700, 0.04, 'square', 0.025),
  };

  // ---------- Música: ritmos brasileiros gerados por código ----------
  // Sequenciador de 16 semicolcheias por compasso. Cada estilo é uma função que toca o passo `s`.
  // Biomas: Mata = capoeira (berimbau) · Sertão = baião · Vila = funk · Pantanal = samba ·
  // Amazônia = carimbó · Coração da Mata = maracatu. No chefe o andamento sobe.
  const music = { playing: false, next: 0, step: 0, style: 'capoeira', pending: null, intense: false, timer: null };
  const on = (arr, s) => arr.indexOf(s) >= 0;
  const STYLES = {
    capoeira: {
      bpm: 96, name: 'Toque de berimbau',
      step(s, bar, t) {
        // berimbau: "dong" grave, "ding" agudo e o chiado da moeda
        if (on([0, 8], s)) berimbau(t, 147, 0.16);
        if (on([4, 12], s)) berimbau(t, 165, 0.14);
        if (on([6, 7, 14, 15], s)) noise(0.03, 0.035, 0, 3500, musicBus, t);
        if (bar % 4 === 3 && on([10, 11], s)) berimbau(t, 165, 0.1);
        // atabaque
        if (on([0, 6, 8], s)) drum(t, 0.13, 190, 95, 0.16);
        if (on([3, 11, 12], s)) drum(t, 0.08, 260, 150, 0.1);
        // pandeiro e agogô
        noise(s % 4 === 2 ? 0.07 : 0.02, s % 4 === 2 ? 0.03 : 0.012, 0, 6000, musicBus, t);
        if (s === 2) bell(t, 880, 0.035); if (s === 10) bell(t, 660, 0.035);
        // coro: nota longa a cada dois compassos
        if (s === 0 && bar % 2 === 0) sanfona(t, bar % 4 === 0 ? 294 : 330, 0.7, 0.008);
      },
    },
    baiao: {
      bpm: 112, name: 'Baião',
      step(s, bar, t) {
        const h = s % 8, chord = bar % 4 < 2 ? 0 : 1;
        const roots = [98, 87.3], chords = [[392, 494, 587], [349, 440, 523]];
        if (h === 0 || h === 3 || h === 4) drum(t, h === 0 ? 0.22 : 0.15);
        if (h === 6) noise(0.05, 0.05, 0, 1800, musicBus, t);
        noise(h % 4 === 3 ? 0.12 : 0.03, h % 4 === 3 ? 0.035 : 0.018, 0, 7000, musicBus, t); // triângulo
        if (h === 0) pluck(t, roots[chord], 0.25, 0.13);
        if (h === 3) pluck(t, roots[chord] * 1.5, 0.15, 0.09);
        if (h === 4) pluck(t, roots[chord] * 2, 0.2, 0.09);
        if (h === 2 || h === 6) for (const f of chords[chord]) sanfona(t, f, 0.12);
        // frase de sanfona (mixolídio) de vez em quando
        if (bar % 4 === 3) { const riff = [587, 523, 494, 440, 392, 440, 494, 587]; if (s % 2 === 0) sanfona(t, riff[s / 2], 0.1, 0.014); }
      },
    },
    funk: {
      bpm: 130, name: 'Funk (tamborzão)',
      step(s, bar, t) {
        const root = bar % 4 < 2 ? 55 : 49;
        // tamborzão: bumbo grave + palmas + "conga" eletrônica
        if (on([0, 3, 8, 11], s)) { drum(t, 0.26, 150, 42, 0.2); pluck(t, root, 0.16, 0.12, 'square', 300); }
        if (on([4, 12], s)) clap(t, 0.09);
        if (on([7, 14], s)) clap(t, 0.045);
        if (on([6, 10, 15], s)) drum(t, 0.09, 420, 300, 0.07);
        if (on([2, 9], s)) drum(t, 0.06, 330, 250, 0.06);
        if (s % 2 === 0) noise(0.02, 0.012, 0, 8000, musicBus, t);
        // sintetizador: riff menor e seco
        const riff = [220, 0, 0, 262, 0, 220, 0, 0, 196, 0, 0, 220, 0, 0, 262, 294];
        if (bar % 2 === 1 && riff[s]) pluck(t, riff[s] * 2, 0.09, 0.035, 'square', 2200);
      },
    },
    samba: {
      bpm: 104, name: 'Samba',
      step(s, bar, t) {
        const prog = [[130.8, [262, 330, 392]], [110, [277, 330, 392]], [146.8, [294, 349, 440]], [98, [294, 349, 392]]];
        const [root, chord] = prog[bar % 4];
        // surdo: marcação no 2º tempo (aberto) e resposta abafada
        if (s === 4 || s === 12) drum(t, 0.22, 95, 52, 0.28);
        if (s === 0 || s === 8) drum(t, 0.1, 110, 70, 0.1);
        // tamborim (teleco-teco) e ganzá
        if (on([0, 3, 5, 7, 8, 10, 12, 15], s)) noise(0.025, 0.035, 0, 4500, musicBus, t);
        noise(0.02, s % 2 ? 0.02 : 0.01, 0, 8000, musicBus, t);
        if (s === 6 || s === 14) bell(t, s === 6 ? 990 : 740, 0.03); // agogô
        // cavaquinho e baixo
        if (on([0, 3, 6, 8, 11, 14], s)) for (const f of chord) sanfona(t, f * 2, 0.06, 0.009);
        if (s === 0 || s === 8) pluck(t, root, 0.2, 0.11);
        if (s === 6 || s === 14) pluck(t, root * 1.5, 0.12, 0.08);
      },
    },
    carimbo: {
      bpm: 120, name: 'Carimbó',
      step(s, bar, t) {
        const h = s % 8, root = bar % 4 < 2 ? 110 : 98;
        // curimbó (tambor de tronco) e maracas
        if (h === 0 || h === 3 || h === 5 || h === 6) drum(t, h === 0 ? 0.2 : 0.12, 160, 70, 0.16);
        noise(0.03, h % 2 ? 0.028 : 0.014, 0, 5500, musicBus, t);
        if (h === 0) pluck(t, root, 0.22, 0.11);
        if (h === 4) pluck(t, root * 1.5, 0.16, 0.08);
        // flauta: frase pentatônica que muda a cada compasso
        const scale = [440, 494, 554, 659, 740, 880];
        const seq = [0, 2, 3, 2, 4, 3, 2, 0, 3, 4, 5, 4, 3, 2, 3, 1];
        if (s % 2 === 0 && (bar % 4 !== 3 || s < 8)) flute(t, scale[seq[(s / 2 + bar * 3) % 16]], 0.16, 0.03);
      },
    },
    maracatu: {
      bpm: 100, name: 'Maracatu',
      step(s, bar, t) {
        // alfaias (tambores graves) em baque virado, gonguê e caixa
        if (on([0, 3, 6, 8, 11, 14], s)) drum(t, s === 0 || s === 8 ? 0.26 : 0.16, 120, 45, 0.24);
        if (on([0, 2, 5, 8, 10, 13], s)) bell(t, s % 8 === 0 ? 520 : 690, 0.035);
        noise(0.03, on([2, 6, 10, 14], s) ? 0.04 : 0.015, 0, 2500, musicBus, t);
        if (s === 0) pluck(t, bar % 4 < 2 ? 73.4 : 65.4, 0.5, 0.12);
        if (s === 0 && bar % 2 === 0) for (const f of (bar % 4 < 2 ? [294, 349, 440] : [262, 311, 392])) sanfona(t, f, 0.9, 0.006);
      },
    },
  };
  function schedule() {
    const a = ctx();
    while (music.next < a.currentTime + 0.15) {
      const s = music.step % 16, bar = Math.floor(music.step / 16);
      if (s === 0 && music.pending) { music.style = music.pending; music.pending = null; music.step = 0; }
      if (music.hold && music.next < music.hold) { music.next += 0.1; continue; } // tema do ultimate tocando
      music.hold = 0;
      const st = STYLES[music.style] || STYLES.baiao;
      const spb = 60 / (st.bpm * (music.intense ? 1.1 : 1)) / 4;
      try { st.step(music.step % 16, Math.floor(music.step / 16), music.next); } catch (e) { /* sem áudio */ }
      music.next += spb; music.step++;
    }
  }
  function drum(t, vol, f0 = 130, f1 = 48, dur = 0.22) {
    const a = ctx(), o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.03);
  }
  function pluck(t, f, dur, vol, type = 'sawtooth', cut = 500) {
    const a = ctx(), o = a.createOscillator(), g = a.createGain(), fl = a.createBiquadFilter();
    o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = cut;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.02);
  }
  function sanfona(t, f, dur, vol = 0.018) {
    const a = ctx();
    for (const det of [-6, 6]) {
      const o = a.createOscillator(), g = a.createGain(), fl = a.createBiquadFilter();
      o.type = 'square'; o.frequency.value = f; o.detune.value = det;
      fl.type = 'lowpass'; fl.frequency.value = 1800;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(fl); fl.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.02);
    }
  }
  // berimbau: corda de aço percutida, com um leve "wah" da cabaça
  function berimbau(t, f, vol) {
    const a = ctx(), o = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain(), fl = a.createBiquadFilter();
    o.type = 'triangle'; o.frequency.setValueAtTime(f * 1.02, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
    o2.type = 'sawtooth'; o2.frequency.value = f * 2;
    fl.type = 'bandpass'; fl.Q.value = 3; fl.frequency.setValueAtTime(900, t); fl.frequency.exponentialRampToValueAtTime(350, t + 0.3);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    const g2 = a.createGain(); g2.gain.value = 0.25;
    o.connect(fl); o2.connect(g2); g2.connect(fl); fl.connect(g); g.connect(musicBus);
    o.start(t); o2.start(t); o.stop(t + 0.45); o2.stop(t + 0.45);
  }
  function bell(t, f, vol) { // agogô / gonguê
    const a = ctx();
    for (const m of [1, 2.76]) {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'square'; o.frequency.value = f * m;
      g.gain.setValueAtTime(vol / m, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.14);
    }
  }
  function clap(t, vol) { for (let i = 0; i < 3; i++) noise(i === 2 ? 0.1 : 0.015, vol, 0, 1200, musicBus, t + i * 0.012); }
  function flute(t, f, dur, vol) {
    const a = ctx(), o = a.createOscillator(), g = a.createGain(), l = a.createOscillator(), lg = a.createGain();
    o.type = 'sine'; o.frequency.value = f; l.frequency.value = 6; lg.gain.value = f * 0.012;
    l.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(musicBus); o.start(t); l.start(t); o.stop(t + dur + 0.02); l.stop(t + dur + 0.02);
  }

  // ---------- voz: o lutador grita o nome do golpe (voz do próprio navegador, em português) ----------
  let lastSay = 0;
  function say(text, force, narr) {
    try {
      if (muted || typeof speechSynthesis === 'undefined') return;
      const now = performance.now();
      if (!force && now - lastSay < 4500) return; // sem tagarelar: no máximo um grito a cada 4,5s
      lastSay = now;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'pt-BR'; u.rate = 1.25; u.pitch = 0.9; u.volume = 0.9;
      const v = speechSynthesis.getVoices().find(x => /^pt[-_]BR/i.test(x.lang)) || speechSynthesis.getVoices().find(x => /^pt/i.test(x.lang));
      if (v) u.voice = v;
      else if (narr) return; // narração longa só com voz em português instalada (senão fica só o texto)
      if (narr) { u.rate = 1.05; u.pitch = 0.8; }
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { /* navegador sem voz */ }
  }
  // ---------- voz gravada do ultimate ----------
  // Coloque uma gravação de verdade em sons/ult-capoeirista.mp3, sons/ult-jiujitsu.mp3,
  // sons/ult-benzedeira.mp3 e sons/ult-cangaceiro.mp3: o jogo passa a usar a gravação no lugar da voz do navegador.
  const gravadas = {};
  function carregarVoz(cls) {
    if (gravadas[cls] !== undefined) return;
    try {
      const a = new window.Audio('sons/ult-' + cls + '.mp3');
      a.preload = 'auto';
      a.addEventListener('error', () => { gravadas[cls] = null; });
      gravadas[cls] = a;
    } catch (e) { gravadas[cls] = null; }
  }
  function vozUlt(cls, fala) {
    carregarVoz(cls);
    const a = gravadas[cls];
    if (a && a.readyState >= 2) { try { a.currentTime = 0; a.volume = 1; a.play().catch(() => {}); return; } catch (e) { /* cai na fala */ } }
    say(fala, true);
  }
  // ---------- berimbau nos golpes de capoeira: "tum, tum, dim, dom-dom" ----------
  let lastGinga = 0;
  function ginga() {
    const now = performance.now();
    if (now - lastGinga < 2600) return;
    lastGinga = now;
    try {
      const t = ctx().currentTime + 0.02;
      [[0, 147], [0.16, 147], [0.32, 165], [0.5, 147], [0.62, 147]].forEach(([d, f]) => berimbau(t + d, f, 0.22));
      noise(0.03, 0.05, 0, 3500, sfxBus, t + 0.4);
    } catch (e) { /* sem áudio */ }
  }
  // ---------- tema do ultimate: uma frase musical de cada personagem, por cima da trilha ----------
  function ultTheme(cls) {
    try {
      const a = ctx(), t = a.currentTime + 0.03;
      music.hold = t + ({ capoeirista: 4, jiujitsu: 1.6, benzedeira: 5, cangaceiro: 4 }[cls] || 3); // a trilha da fase espera o tema acabar
      if (cls === 'capoeirista') {
        // toque rápido de roda: berimbau + atabaque + agogô + coro respondendo
        const q = 0.115;
        for (let i = 0; i < 34; i++) {
          const s = i % 8, tt = t + i * q;
          if (s === 0 || s === 3) berimbau(tt, 147, 0.26);
          if (s === 4 || s === 6) berimbau(tt, 165, 0.24);
          if (s === 2 || s === 7) noise(0.03, 0.05, 0, 3500, musicBus, tt);
          if (s === 0 || s === 2 || s === 4 || s === 5) drum(tt, 0.18, 200, 95, 0.14);
          if (s === 2) bell(tt, 880, 0.05); if (s === 6) bell(tt, 660, 0.05);
        }
        [[0, 294], [0.46, 330], [0.92, 392], [1.38, 330], [1.84, 294], [2.3, 330], [2.76, 392], [3.22, 440]].forEach(([d, f]) => { sanfona(t + d, f, 0.4, 0.02); sanfona(t + d, f * 1.5, 0.4, 0.012); });
        vozUlt(cls, 'Iê! Capoeira!');
      } else if (cls === 'jiujitsu') {
        // tambor de dojo + gongo
        [0, 0.14, 0.28, 0.5, 0.62, 0.74, 0.86].forEach((d, i) => drum(t + d, 0.3, 140 - i * 6, 48, 0.3));
        for (const m of [1, 1.5, 2.02, 2.74]) { const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = 196 * m; g.gain.setValueAtTime(0.09 / m, t + 0.95); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6); o.connect(g); g.connect(musicBus); o.start(t + 0.95); o.stop(t + 2.7); }
        noise(0.5, 0.06, 0.95, 400, musicBus);
        vozUlt(cls, 'Finalização! Oss!');
      } else if (cls === 'benzedeira') {
        // sino de igreja + coro em terças (ladainha)
        for (let i = 0; i < 5; i++) for (const m of [1, 2.4, 3.9]) { const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = 330 * m; g.gain.setValueAtTime(0.07 / m, t + i); g.gain.exponentialRampToValueAtTime(0.0001, t + i + 0.95); o.connect(g); g.connect(musicBus); o.start(t + i); o.stop(t + i + 1); }
        [[0, [262, 330]], [1, [294, 349]], [2, [330, 392]], [3, [294, 349]], [4, [262, 330, 392]]].forEach(([d, ch]) => ch.forEach(f => sanfona(t + d, f, 0.95, 0.014)));
        vozUlt(cls, 'Valei-me!');
      } else {
        // xaxado acelerado: zabumba, triângulo e sanfona + tiros
        const q = 0.105;
        const riff = [392, 494, 587, 494, 440, 523, 587, 659, 587, 523, 494, 440, 392, 440, 494, 587];
        for (let i = 0; i < 38; i++) {
          const s = i % 8, tt = t + i * q;
          if (s === 0 || s === 3 || s === 4) drum(tt, 0.24);
          noise(s % 4 === 3 ? 0.1 : 0.03, 0.03, 0, 7000, musicBus, tt);
          if (i % 2 === 0) sanfona(tt, riff[(i / 2) % 16], 0.16, 0.022);
        }
        vozUlt(cls, 'É o bando de Lampião!');
      }
    } catch (e) { /* sem áudio */ }
  }

  return {
    play(name) {
      if (muted) return;
      if (name.startsWith('voz:')) { say(name.slice(4)); return; }
      if (name.startsWith('ult:')) { ultTheme(name.slice(4)); return; }
      if (name === 'ginga') { ginga(); return; }
      if (!SFX[name]) return;
      const now = performance.now();
      if (last[name] && now - last[name] < 45) return; // evita empilhar o mesmo som
      last[name] = now;
      try { SFX[name](); } catch (e) { /* sem áudio */ }
    },
    startMusic() {
      if (music.playing || muted || !musicOn) return;
      try {
        const a = ctx();
        music.playing = true; music.next = a.currentTime + 0.05; music.step = 0;
        music.timer = setInterval(schedule, 40);
      } catch (e) { /* sem áudio */ }
    },
    stopMusic() { music.playing = false; clearInterval(music.timer); },
    setIntense(v) { music.intense = v; },
    narrate(text) { say(text, true, true); },
    // troca de ritmo (entra no começo do próximo compasso)
    setStyle(name) { if (STYLES[name] && name !== music.style) { if (music.playing) music.pending = name; else music.style = name; } },
    get style() { return music.pending || music.style; },
    get styleName() { return (STYLES[music.pending || music.style] || {}).name || ''; },
    toggleMute() {
      muted = !muted;
      // corta o som na hora (inclusive notas que já estavam tocando) e lembra a escolha
      try { if (ac && master) master.gain.setValueAtTime(muted ? 0 : 0.8, ac.currentTime); } catch (e) { /* sem áudio */ }
      try { localStorage.setItem('mata-mudo', muted ? '1' : '0'); } catch (e) { /* sem armazenamento */ }
      if (muted) this.stopMusic(); else this.startMusic();
      return muted;
    },
    toggleMusic() { musicOn = !musicOn; if (!musicOn) this.stopMusic(); else this.startMusic(); return musicOn; },
    get muted() { return muted; },
    get musicOn() { return musicOn; },
  };
})();
