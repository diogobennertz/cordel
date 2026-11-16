'use strict';
// ===== Laço principal, entrada (teclado/controle) e ligação entre motor e telas =====

const Game = { w: null, classId: 'capoeirista', paused: false, last: 0, acc: 0, deadT: 0, keys: new Set() };

// ---------- treino permanente (patacas) ----------
function loadMeta() {
  try {
    const m = JSON.parse(localStorage.getItem('mata-meta') || '{}');
    return { patacas: Math.max(0, +m.patacas || 0), ups: m.ups && typeof m.ups === 'object' ? m.ups : {} };
  } catch (e) { return { patacas: 0, ups: {} }; }
}
function saveMeta(m) { try { localStorage.setItem('mata-meta', JSON.stringify(m)); } catch (e) { /* sem armazenamento */ } }
function buyMeta(id) {
  const m = loadMeta(), up = META_BY_ID[id];
  if (!up) return false;
  const lv = m.ups[id] || 0;
  if (lv >= up.max || m.patacas < up.cost(lv)) return false;
  m.patacas -= up.cost(lv); m.ups[id] = lv + 1;
  saveMeta(m);
  return true;
}

function startRun(classId, extra = {}) {
  Game.classId = classId;
  Tut.active = false; if (Tut.el) Tut.el.hidden = true;
  Game.lastMapa = extra.mapa || 0; Game.lastPlayers = extra.players || 1;
  Game.w = new World(classId, { sfx: name => Som.play(name), meta: extra.tutorial ? {} : loadMeta().ups, ...extra });
  Game.paused = false; Game.deadT = 0; UI.newRecord = false;
  Game.intro = null; R.focus = null;
  R.cam.x = Game.w.player.x; R.cam.y = Game.w.player.y;
  hideOverlay();
  Som.startMusic();
}

function onAction(act, arg) {
  const w = Game.w;
  switch (act) {
    case 'menu': Game.w = null; showMenu(); break;
    case 'howto': showHowTo(); break;
    case 'tutorial': startTutorial(); break;
    case 'introOk': closeIntro(); break;
    case 'treino': Game.w = null; showTreino(); break;
    case 'buyMeta': if (buyMeta(arg)) { Som.play('buy'); showTreino(); } break;
    case 'buyAtivo': if (w.buy('ativo')) UI.shown = ''; break;
    case 'classSelect': Game.w = null; showClassSelect(); break;
    case 'pickMap': Game.w = null; showMapSelect(arg); break;
    case 'setPlayers': Game.players = +arg; showMapSelect(Game.pickClass); break;
    case 'startMap': startRun(Game.pickClass, { mapa: +arg, players: Game.players || 1 }); break;
    case 'again': startRun(Game.classId, { mapa: Game.lastMapa || 0, players: Game.lastPlayers || 1 }); break;
    case 'card': w.chooseCard(+arg); break;
    case 'reroll': w.rerollOffer(); UI.shown = ''; break;
    case 'skip': w.skipCard(); break;
    case 'chest': w.chooseChest(+arg); break;
    case 'chestSkip': w.chooseChest(-1); break;
    case 'buyCard': if (w.buy('card', +arg)) UI.shown = ''; break;
    case 'buyEnc': if (w.buy('encanto', +arg)) UI.shown = ''; break;
    case 'buyHeal': if (w.buy('heal')) UI.shown = ''; break;
    case 'shopReroll': if (w.shopReroll()) UI.shown = ''; break;
    case 'leaveShop': w.leaveShop(); break;
    case 'resume': Game.paused = false; hideOverlay(); break;
    case 'quit': if (Tut.active) { tutEnd(false); break; } recordRun(w); Game.paused = false; w.state = 'dead'; w.deathCause = 'desistência'; Game.deadT = 0.01; break;
    case 'endRun': recordRun(w); Game.w = null; showMenu(); break;
  }
}

function recordRun(w) {
  if (!w || w._recorded || w.tutorial) return; // o tutorial não conta recorde nem patacas
  w._recorded = true;
  // recorde de sobrevida por mapa
  const mp = loadMapas(); const prev = mp.best[w.mapa.id] || 0;
  UI.newRecord = w.time > prev;
  if (UI.newRecord) { mp.best[w.mapa.id] = Math.floor(w.time); saveMapas(mp); }
  // paga só as patacas ainda não pagas desta corrida (a corrida pode continuar depois de zerar)
  const total = w.patacas(), pay = Math.max(0, total - (w._paid || 0));
  w._paid = total;
  const m = loadMeta(); m.patacas += pay; saveMeta(m);
  UI.earned = pay; UI.patacas = m.patacas;
}

// ---------- apresentação de criatura nova (zoom + nome + o que faz + OK) ----------
// cada criatura é apresentada UMA vez na vida (fica salvo). A Caipora substituiu o Corpo-Seco, por isso tem chave própria.
const seenKey = e => (e.type === 'corposeco' ? 'caipora' : e.type);
function loadSeen() { try { return JSON.parse(localStorage.getItem('mata-vistos') || '{}') || {}; } catch (e) { return {}; } }
function checkIntro(w) {
  if (Game.intro || Game.paused || w.state !== 'play' || w.tutorial) return;
  if (!Game.seen) Game.seen = loadSeen();
  const p = w.player, hw = R.W / 2 / R.zoom - 50, hh = R.H / 2 / R.zoom - 60;
  for (const e of w.enemies) {
    if (e.dead || Game.seen[seenKey(e)] || !BESTIARIO[e.type]) continue;
    if (Math.abs(e.x - p.x) > hw || Math.abs(e.y - p.y) > hh) continue; // só quando já está na tela
    Game.intro = e; R.focus = e;
    Game.keys.clear();
    showIntro(e);
    Som.play('boss');
    return;
  }
}
function closeIntro() {
  const e = Game.intro;
  if (!e) return;
  Game.seen[seenKey(e)] = 1;
  try { localStorage.setItem('mata-vistos', JSON.stringify(Game.seen)); } catch (err) { /* sem armazenamento */ }
  Game.intro = null; R.focus = null;
  if (Game.w) Game.w.player.iframes = Math.max(Game.w.player.iframes, 0.8); // um respiro ao voltar
  hideOverlay();
}

// ---------- botões de som na tela ----------
function refreshSnd() {
  const m = document.getElementById('btn-mute'), mu = document.getElementById('btn-music');
  if (!m) return;
  const alto = '<path d="M2 7h5l6-5v16l-6-5H2z" fill="currentColor"/>';
  m.innerHTML = `<svg viewBox="0 0 24 20">${alto}${Som.muted
    ? '<path d="M16 6l6 8M22 6l-6 8" fill="none" stroke="#c5361d" stroke-width="2.6" stroke-linecap="round"/>'
    : '<path d="M16 5.5q3.6 4.5 0 9M19 2.5q6.5 7.5 0 15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'}</svg>`;
  m.classList.toggle('off', Som.muted);
  const semMusica = !Som.musicOn || Som.muted;
  mu.innerHTML = `<svg viewBox="0 0 24 20"><path d="M8.5 15V3.5l11-2V13" fill="none" stroke="currentColor" stroke-width="2.4"/><ellipse cx="6" cy="15" rx="3.6" ry="2.7" fill="currentColor"/><ellipse cx="17" cy="13" rx="3.6" ry="2.7" fill="currentColor"/>${semMusica ? '<path d="M3 2l18 16" stroke="#c5361d" stroke-width="2.6" stroke-linecap="round"/>' : ''}</svg>`;
  m.title = Som.muted ? 'Som desligado (clique ou tecla M para ligar)' : 'Silenciar tudo (tecla M)';
  mu.classList.toggle('off', !Som.musicOn || Som.muted);
  mu.title = (Som.musicOn ? 'Desligar' : 'Ligar') + ' a música (tecla N)' + (Som.styleName ? ' — tocando: ' + Som.styleName : '');
}

// ---------- eventos do mundo → efeitos de tela ----------
function handleEvents(w) {
  for (const ev of w.events) {
    switch (ev.type) {
      case 'phaseStart': {
        R.banners = [];
        if (w.tutorial) banner('Tutorial', 'com Seu Biu, cantador de cordel', '#f2c14e', 2.5);
        else { banner(w.mapa.name.toUpperCase(), w.nPlayers > 1 ? `${w.nPlayers} jogadores · dificuldade ${w.nPlayers}` : 'sobreviva o máximo que puder', '#efe3c8', 3.2); banner('WASD para andar', 'os golpes são automáticos · Espaço esquiva · Q especial · R ultimate · E item', '#d4ff6a', 5.5); }
        Som.setIntense(false); Som.setStyle(BIOME_MUSIC[w.mapa.biome] || 'baiao'); refreshSnd();
        break;
      }
      case 'etapa': banner('Etapa ' + ev.n, 'a mata esquentou: criaturas mais fortes e um novo chefe a caminho', '#ffb347', 3); break;
      case 'feira': banner('A FEIRA ABRIU', 'passe na barraca para comprar', '#f0b429', 2); break;
      case 'mapaVencido': { const mp = loadMapas(); if (ev.mapa + 2 > mp.unlocked) { mp.unlocked = ev.mapa + 2; saveMapas(mp); banner('MAPA ABERTO!', (MAPAS[ev.mapa + 1] ? MAPAS[ev.mapa + 1].name + ' liberado' : 'você venceu todos os mapas!'), '#7bc950', 4); Som.play('win'); } else banner('CHEFES DERROTADOS!', 'o mapa seguinte já estava aberto', '#7bc950', 2.5); break; }
      case 'balaio': banner('BALAIO!', `ganhou: ${ev.name}`, '#f0b429', 2); break;
      case 'sino': banner('BADALOU O SINO', 'a praga foi varrida', '#f0b429', 1.8); break;
      case 'bencao': banner('BÊNÇÃO', '+dano e cura por um tempo', '#7cffe0', 1.8); break;
      case 'berrante': banner('BERRANTE', 'juntou tudo do chão', '#d9772b', 1.5); break;
      case 'belt': banner(ev.belt.name.toUpperCase() + '!', '+6% de dano de Jiu-Jitsu, +6 de vida, +1% de defesa', '#c9b3ff', 3.5); Som.play('level'); break;
      case 'ultimate': banner(ev.name.toUpperCase() + '!', '', CLASSES[w.classId].color, 1.8); break;
      case 'boss': banner(ev.name.toUpperCase(), ev.intro, '#ff6b5a', 4); Som.setIntense(true); break;
      case 'bossDead': banner(`${ev.name} foi derrotado!`, 'o baú ficou no chão', '#7bc950', 2.5); if (!w.bossesAlive || !w.bossesAlive()) Som.setIntense(false); break;
      case 'horde': banner('HORDA!', 'Estão vindo de todo lado!', '#ffb347', 2); break;
      case 'elite': banner('Criatura de elite!', 'Mais forte, mas deixa moedas e coxinha', '#ffd23f', 1.8); break;
      case 'revive': banner('LEVANTOU!', 'A força da Raiz te pôs de pé', '#7bc950', 2.2); break;
    }
  }
  w.events.length = 0;
}

// ---------- telas que dependem do estado do mundo ----------
function syncOverlay(w) {
  if (!w) return;
  if (Game.intro) return; // a apresentação da criatura fica na tela até o OK
  if (Game.paused) { if (UI.shown !== 'pause') showPause(w); return; }
  const st = w.state;
  if (st === 'levelup') { if (UI.shown !== 'levelup' || UI.ref !== w.offer) { UI.ref = w.offer; showLevelUp(w); } }
  else if (st === 'chest') { if (UI.shown !== 'chest' || UI.ref !== w.chest) { UI.ref = w.chest; showChest(w); } }
  else if (st === 'shop') { if (UI.shown !== 'shop') showShop(w); }
  else if (st === 'dead') {
    if (UI.shown !== 'dead' && Game.deadT > 1.3) { recordRun(w); showGameOver(w); Som.stopMusic(); }
  } else if (UI.shown && UI.shown !== 'menu') hideOverlay();
}

// ---------- entrada ----------
const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};
function readInput(w) {
  let x = 0, y = 0;
  for (const k of Game.keys) { const m = MOVE_KEYS[k]; if (m) { x += m[0]; y += m[1]; } }
  // controle
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads) {
    if (!gp) continue;
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    if (Math.hypot(ax, ay) > 0.25) { x += ax; y += ay; }
    if (gp.buttons[12] && gp.buttons[12].pressed) y -= 1;
    if (gp.buttons[13] && gp.buttons[13].pressed) y += 1;
    if (gp.buttons[14] && gp.buttons[14].pressed) x -= 1;
    if (gp.buttons[15] && gp.buttons[15].pressed) x += 1;
    const a = gp.buttons[0] && gp.buttons[0].pressed;
    if (a && !Game.padA && w.state === 'play') w.input.dash = true;
    const bx = gp.buttons[2] && gp.buttons[2].pressed, by = gp.buttons[3] && gp.buttons[3].pressed;
    if (bx && !Game.padX) w.input.special = true;
    if (by && !Game.padY) w.input.item = true;
    const rb = gp.buttons[5] && gp.buttons[5].pressed;
    if (rb && !Game.padRB) w.input.ult = true;
    Game.padX = bx; Game.padY = by; Game.padRB = rb;
    const start = gp.buttons[9] && gp.buttons[9].pressed;
    if (start && !Game.padStart) togglePause();
    Game.padA = a; Game.padStart = start;
  }
  w.input.x = x; w.input.y = y;
}

function togglePause() {
  const w = Game.w;
  if (!w || Game.intro || (w.state !== 'play' && w.state !== 'clearing')) return;
  Game.paused = !Game.paused;
  if (!Game.paused) hideOverlay();
}

document.addEventListener('keydown', ev => {
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const code = ev.code;
  Game.keys.add(code);
  const w = Game.w;
  if (code === 'KeyM') { Som.toggleMute(); refreshSnd(); if (Game.paused) UI.shown = ''; return; }
  if (code === 'KeyN') { Som.toggleMusic(); refreshSnd(); if (Game.paused) UI.shown = ''; return; }
  if (Game.intro) { if (code === 'Enter' || code === 'Space' || code === 'Escape') { ev.preventDefault(); closeIntro(); } return; }
  if (Tut.active && Tut.talking) { if (code === 'Enter' || code === 'Space') { ev.preventDefault(); tutNext(); } return; }
  if (MOVE_KEYS[code] || code === 'Space') ev.preventDefault();
  if (!w) {
    if (UI.shown === 'menu' && (code === 'Enter' || code === 'Space')) showClassSelect();
    else if (UI.shown === 'classSelect') {
      const n = +code.replace('Digit', '') - 1, ids = Object.keys(CLASSES);
      if (/^Digit[1-4]$/.test(code)) startRun(ids[n]);
      if (code === 'Escape') showMenu();
    } else if ((UI.shown === 'howto' || UI.shown === 'treino') && code === 'Escape') showMenu();
    return;
  }
  if (code === 'Escape' || code === 'KeyP') { togglePause(); return; }
  const num = /^(Digit|Numpad)[1-5]$/.test(code) ? +code.slice(-1) - 1 : -1;
  const playing = (w.state === 'play' || w.state === 'clearing') && !Game.paused;
  if (playing && code === 'KeyQ') { w.input.special = true; return; }
  if (playing && code === 'KeyE') { w.input.item = true; return; }
  if (playing && code === 'KeyR') { w.input.ult = true; return; }
  if (w.state === 'play' && (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight')) w.input.dash = true;
  else if (w.state === 'levelup') {
    if (num >= 0) w.chooseCard(num);
    else if (code === 'KeyR') { if (w.rerollOffer()) UI.shown = ''; }
    else if (code === 'KeyX') w.skipCard();
  } else if (w.state === 'chest' && num >= 0) w.chooseChest(num);
  else if (w.state === 'shop') {
    if (code === 'KeyR') { if (w.shopReroll()) UI.shown = ''; }
    else if (code === 'Enter') w.leaveShop();
  } else if (w.state === 'dead' && UI.shown === 'dead' && code === 'Enter') startRun(Game.classId);
});
document.addEventListener('keyup', ev => Game.keys.delete(ev.code));
// botão direito do mouse = especial (e não abre o menu do navegador durante a partida)
document.addEventListener('contextmenu', ev => { if (Game.w) ev.preventDefault(); });
document.addEventListener('mousedown', ev => {
  const w = Game.w;
  if (w && ev.button === 2 && (w.state === 'play' || w.state === 'clearing') && !Game.paused) w.input.special = true;
});
window.addEventListener('blur', () => { Game.keys.clear(); if (Game.w && Game.w.state === 'play' && !Game.paused) togglePause(); });

// ---------- laço ----------
const STEP = 1 / 60;
function frame(now) {
  requestAnimationFrame(frame); // agenda primeiro: um erro numa tela nunca congela o jogo
  const dt = Math.min(0.1, (now - (Game.last || now)) / 1000);
  Game.last = now;
  const w = Game.w;
  if (w) {
    readInput(w);
    checkIntro(w);
    tutUpdate(w, dt);
    if (!Game.paused && !Game.intro && !(Tut.active && Tut.talking) && Game.w && (w.state === 'play' || w.state === 'clearing')) {
      Game.acc += dt;
      let n = 0;
      while (Game.acc >= STEP && n < 5) { w.update(STEP); Game.acc -= STEP; n++; }
      if (n === 5) Game.acc = 0;
    } else Game.acc = 0;
    if (w.state === 'dead') Game.deadT += dt;
    if (Game.w) { handleEvents(w); syncOverlay(w); }
  }
  render(Game.w, dt);
}

// ---------- início ----------
window.addEventListener('load', () => {
  initRender(document.getElementById('game'));
  initUI(document.getElementById('overlay'), onAction);
  initTips();
  try { document.documentElement.style.setProperty('--fibras', 'url(' + fibrasURL() + ')'); } catch (e) { /* sem textura */ }
  document.getElementById('btn-mute').addEventListener('click', ev => { Som.toggleMute(); refreshSnd(); ev.currentTarget.blur(); });
  document.getElementById('btn-music').addEventListener('click', ev => { Som.toggleMusic(); refreshSnd(); ev.currentTarget.blur(); });
  refreshSnd();
  // o navegador só libera o som depois de um clique/tecla
  const unlock = () => { Som.startMusic(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
  showMenu();
  requestAnimationFrame(frame);
});
