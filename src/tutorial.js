'use strict';
// ===== Tutorial com narrador: Seu Biu, cantador de cordel =====
// Primeiro ele conta a história (folclore), depois ensina a jogar em lições curtas e jogáveis.
// "fala" pausa o jogo e espera OK; "tarefa" deixa jogar até cumprir o objetivo.

// retrato do narrador (desenhado por código, como os outros personagens)
Object.assign(SPRITE_DRAW, {
  narrador(g) {
    // cantador: chapéu de palha, barba branca, camisa xadrez e viola
    limbs(g, '#3a4a6a', [-3, -15, -5, -8, -5, -1], 6.5); limbs(g, '#46587c', [3, -15, 6, -8, 6, -1], 6.5);
    sh(g, '#5a3a22', ell(-4, -1, 5, 2), [-9, -3, 10, 4], 1.2); sh(g, '#5a3a22', ell(8, -1, 5, 2), [3, -3, 10, 4], 1.2);
    sh(g, '#b8402a', rrect(-9, -34, 18, 21, 4), [-9, -34, 18, 21]);
    g.strokeStyle = 'rgba(255,240,200,0.55)'; g.lineWidth = 0.8;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 3.4, -33); g.lineTo(i * 3.4, -14); g.stroke(); }
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-8.5, -31 + i * 4); g.lineTo(8.5, -31 + i * 4); g.stroke(); }
    // viola
    sh(g, '#c98a3a', ell(4, -19, 7.5, 6), [-4, -25, 16, 12], 1.4);
    sh(g, '#c98a3a', ell(9, -24, 4.5, 4), [4, -28, 10, 8], 1.4);
    dot(g, 5, -20, 2, '#3a2414');
    line(g, INK, 3.4, [11, -27, 22, -38]); line(g, '#6b4a2b', 2, [11, -27, 22, -38]);
    line(g, '#f3efe4', 0.5, [0, -17, 21, -37]); line(g, '#f3efe4', 0.5, [1, -19, 22, -38]);
    limbs(g, '#b8402a', [-7, -30, -4, -23, 3, -19], 4.4); dot(g, 3.6, -19, 2.2, SKIN.morena);
    limbs(g, '#b8402a', [7, -30, 13, -29, 16, -32], 4.4); dot(g, 16.5, -32.5, 2.2, SKIN.morena);
    head(g, 0, -40, 7, SKIN.morena, { smile: true, brow: '#e8e0d0' });
    // barba e bigode brancos
    sh(g, '#f1ece0', g2 => { g2.moveTo(-5, -38); g2.quadraticCurveTo(-5, -29, 2, -29.5); g2.quadraticCurveTo(8, -30, 7.5, -37); g2.quadraticCurveTo(3, -34.5, -5, -38); g2.closePath(); }, [-5, -38, 13, 9], 1.1);
    line(g, '#f1ece0', 1.6, [1, -37.2, 8, -36.4]);
    // chapéu de palha
    sh(g, '#e0c070', g2 => g2.ellipse(0, -44.5, 14, 3.6, 0, 0, TAU), [-14, -48, 28, 7], 1.4);
    sh(g, '#e8cc80', g2 => { g2.ellipse(0, -46, 7.5, 6, 0, Math.PI, 0); g2.closePath(); }, [-8, -52, 16, 7], 1.4);
    line(g, '#a8321f', 1.6, [-7.3, -46.4, 7.3, -46.4]);
    g.strokeStyle = 'rgba(120,90,30,0.5)'; g.lineWidth = 0.6; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 3.6, -47); g.lineTo(i * 4, -42.4); g.stroke(); }
  },
});

const Tut = { active: false, i: 0, line: 0, talking: false, el: null, acc: 0, n: 0, last: null, doneT: 0 };

function tutSpawn(w, n, dist, hp = 26) {
  const p = w.player;
  for (let i = 0; i < n; i++) {
    const a = i * TAU / n + 0.4;
    const e = w.spawnEnemy('corposeco', p.x + Math.cos(a) * dist, p.y + Math.sin(a) * dist, { summoned: true });
    e.hp = e.maxHp = hp; e.dmg = 3; e.speed = 34; e.xpVal = 0;
  }
}
const tutAlive = w => w.enemies.filter(e => !e.dead).length;

const TUT_STEPS = [
  { // ---------- a história ----------
    fala: [
      'Boa noite, meu povo! Eu sou Seu Biu, cantador de cordel. Puxe um banco, que a história de hoje é de arrepiar o cabelo.',
      'Antes de ter cidade, o Brasil já tinha dono. O povo antigo chama esses donos de ENCANTADOS: o Saci, que viaja no redemoinho; o Curupira dos pés virados, que protege os bichos; a Caipora, a Iara que canta no rio, o Boto que vira moço bonito em noite de festa...',
      'E tem o BOITATÁ, a cobra de fogo. Contam que, depois de uma noite sem fim e de um grande dilúvio, ela comeu os olhos dos bichos que morreram — por isso brilha tanto. Desde então, castiga quem bota fogo na mata.',
      'Só que alguém queimou mata demais. O Boitatá enlouqueceu de raiva, e os encantados, assustados, passaram a atacar todo vivente que pisa na floresta.',
      'É aí que entra você: gente do povo, que conhece a mata e sabe brigar. Entre na floresta, acalme os encantados um por um e apague a fúria do Boitatá. Mas antes, deixe eu lhe ensinar a não cair no primeiro passo!',
    ],
  },
  { // ---------- andar ----------
    fala: ['Primeira lição: perna. Na mata, quem fica parado vira janta. Ande com as teclas W, A, S, D ou com as setas.'],
    tarefa: 'Ande pela mata com WASD ou as setas',
    setup() { Tut.acc = 0; Tut.last = null; },
    done(w) {
      const p = w.player;
      if (Tut.last) Tut.acc += Math.hypot(p.x - Tut.last.x, p.y - Tut.last.y);
      Tut.last = { x: p.x, y: p.y };
      return Tut.acc > 420;
    },
    prog: () => Math.min(1, Tut.acc / 420),
  },
  { // ---------- golpes automáticos ----------
    fala: [
      'Olhe as Caiporas chegando! São as guardiãs baixinhas da mata, de lança na mão.',
      'Você não precisa apertar nada para bater: os GOLPES saem sozinhos, cada um no seu tempo. O seu trabalho é se posicionar. Chegue perto delas e deixe a Armada trabalhar!',
    ],
    tarefa: 'Derrote as Caiporas (chegue perto: o golpe sai sozinho)',
    setup(w) { tutSpawn(w, 4, 230); Tut.n = 4; },
    done: w => tutAlive(w) === 0,
    prog: w => 1 - tutAlive(w) / 4,
  },
  { // ---------- esquiva ----------
    fala: ['Agora a malandragem: a ESQUIVA. Aperte ESPAÇO e você dá um bote na direção em que está andando — e fica intocável por um instante. Ela precisa de um tempinho para recarregar (o círculo no seu pé mostra).'],
    tarefa: 'Esquive 2 vezes com a tecla Espaço',
    setup() { Tut.n = 0; Tut.last = false; },
    done(w) {
      const d = w.player.dashT > 0;
      if (d && !Tut.last) Tut.n++;
      Tut.last = d;
      return Tut.n >= 2;
    },
    prog: () => Tut.n / 2,
  },
  { // ---------- XP e cartas ----------
    fala: [
      'Está vendo os vaga-lumes? Cada encantado derrotado deixa um. Eles são a sua EXPERIÊNCIA: junte o bastante e você sobe de nível.',
      'A cada nível você escolhe UMA CARTA. Tem carta de golpe novo, de atributo e de comida. Cartas da mesma turma — Capoeira, Jiu-Jitsu, Mandinga, Cangaço, Raiz — somam: com 2, 4 e 6 delas você ativa a SINERGIA. Passe o mouse em cima de uma carta para ver tudo o que ela faz.',
      'Ah, e subir de nível não cura ninguém. Vida se recupera com comida, regeneração e sorte.',
    ],
    tarefa: 'Junte os vaga-lumes e escolha uma carta',
    setup(w) {
      const p = w.player;
      for (let i = 0; i < 9; i++) { const a = i * TAU / 9; w.dropPickup('xp', p.x + Math.cos(a) * 120, p.y + Math.sin(a) * 90, Math.ceil(w.xpNext / 8)); }
    },
    done: w => w.level >= 2 && w.state === 'play' && w.pendingLevels === 0,
    prog: w => (w.level >= 2 ? 0.9 : Math.min(0.8, w.xp / w.xpNext)),
  },
  { // ---------- especial ----------
    fala: ['Cercaram você? Então use o ESPECIAL: aperte Q (ou o botão direito do mouse). É o ataque em área do seu personagem — o do Capoeirista é a Roda de Capoeira. Ele recarrega em poucos segundos; o quadradinho Q lá embaixo avisa.'],
    tarefa: 'Aperte Q no meio do bando',
    setup(w) { tutSpawn(w, 9, 150, 40); w.specialT = 0; },
    done: w => w.specialT > 0 && tutAlive(w) === 0,
    prog: w => (w.specialT > 0 ? 0.5 + 0.5 * (1 - tutAlive(w) / 9) : 0),
  },
  { // ---------- ultimate ----------
    fala: ['Agora a carta na manga: o ULTIMATE, na tecla R. É o golpe mais forte do personagem, mas demora quase um minuto para voltar. Guarde para a hora do aperto... ou para o chefe. Dessa vez eu deixei pronto: solte a Roda Grande e escute o berimbau!'],
    tarefa: 'Aperte R para soltar o ultimate',
    setup(w) { tutSpawn(w, 14, 190, 90); w.ultT = 0; },
    done: w => w.ultT > 0 && w.player.ultT <= 0 && tutAlive(w) === 0,
    prog: w => (w.ultT > 0 ? 0.4 + 0.6 * (1 - tutAlive(w) / 14) : 0),
  },
  { // ---------- item ativo ----------
    fala: ['Tome aqui um presente: FOGOS DE SÃO JOÃO. É um ITEM ATIVO — você carrega um por vez e usa com a tecla E. Eles vêm nos baús do mapa. Já os ENCANTOS são itens passivos: funcionam sozinhos, o tempo todo.'],
    tarefa: 'Aperte E para soltar os Fogos de São João',
    setup(w) { tutSpawn(w, 8, 210, 60); w.ativo = { id: 'fogos', t: 0 }; },
    done: w => w.ativo && w.ativo.t > 0 && tutAlive(w) === 0,
    prog: w => (w.ativo && w.ativo.t > 0 ? 0.4 + 0.6 * (1 - tutAlive(w) / 8) : 0),
  },
  { // ---------- o resto do jogo ----------
    fala: [
      'Muito bem! Agora a jornada. Cada MAPA é SEM FIM: você aguenta as ondas e, de tempos em tempos, a mata esquenta e manda um CHEFE. Não precisa derrotar ninguém para continuar — só sobreviver o quanto aguentar. Seu recorde é o tempo que durou.',
      'Pelo mapa tem coisa boa: a BARRACA DA FEIRA, para gastar seu dinheiro; POTES DE BARRO para quebrar; ORATÓRIOS que abençoam quem reza um instante; e BAÚS trancados que você abre pagando. O chefe derrotado também deixa um baú no chão.',
      'Vencer os chefes de um mapa ABRE O MAPA SEGUINTE: Sertão, Vila Assombrada, Pantanal, Amazônia e o Coração da Mata, onde mora o Boitatá. E cada personagem tem a sua VANTAGEM: siga o caminho dele e vá mais longe.',
      'E não se avexe se cair. No começo a mata é braba. Cada tentativa rende PILA, que você gasta no TREINO em melhorias que ficam para sempre. É apanhando que se aprende — e uma hora é você quem dá a rasteira. Ah, e quanto mais gente jogar junto, mais difícil fica!',
      'Agora vá, que a mata está chamando. E quando voltar, me conte como foi, que eu faço um cordel!',
    ],
  },
];

function tutEnsureEl() {
  if (Tut.el) return;
  Tut.el = document.createElement('div');
  Tut.el.id = 'narrador';
  Tut.el.hidden = true;
  document.body.appendChild(Tut.el);
  Tut.el.addEventListener('click', ev => {
    const b = ev.target.closest('[data-tut]');
    if (!b) return;
    Som.play('click');
    if (b.dataset.tut === 'ok') tutNext(); else tutEnd(false);
  });
}
function tutPortrait() { const s = SPRITES.narrador; return s ? s.c.toDataURL() : ''; }

function startTutorial() {
  tutEnsureEl();
  startRun('capoeirista', { tutorial: true });
  Tut.active = true; Tut.i = 0; Tut.line = 0; Tut.doneT = 0;
  tutShowFala();
}

function tutShowFala() {
  const st = TUT_STEPS[Tut.i], text = st.fala[Tut.line];
  Tut.talking = true;
  if (Game.w) { Game.keys.clear(); Game.w.input.x = Game.w.input.y = 0; }
  const last = Tut.i === TUT_STEPS.length - 1 && Tut.line === st.fala.length - 1;
  Tut.el.className = 'fala';
  Tut.el.innerHTML = `
    <div class="nar-face"><img src="${tutPortrait()}" alt=""></div>
    <div class="nar-body">
      <div class="nar-name">Seu Biu, cantador de cordel <span>${Tut.i === 0 ? 'a história' : `lição ${Tut.i} de ${TUT_STEPS.length - 1}`}</span></div>
      <p>${esc(text)}</p>
      <div class="nar-btns">
        <button class="btn big" data-tut="ok">${last ? 'Terminar' : 'Continuar'} <kbd>Enter</kbd></button>
        ${last ? '' : '<button class="btn ghost" data-tut="sair">Pular o tutorial</button>'}
      </div>
    </div>`;
  Tut.el.hidden = false;
  Som.narrate(text);
}

function tutShowTarefa() {
  const st = TUT_STEPS[Tut.i];
  Tut.talking = false;
  Tut.el.className = 'tarefa';
  Tut.el.innerHTML = `<div class="nar-task"><b>Sua vez:</b> ${esc(st.tarefa)}<div class="nar-bar"><i></i></div></div>`;
  Tut.el.hidden = false;
}

function tutNext() {
  if (!Tut.active || !Tut.talking) return;
  const st = TUT_STEPS[Tut.i];
  if (Tut.line < st.fala.length - 1) { Tut.line++; tutShowFala(); return; }
  if (st.tarefa) {
    if (st.setup) st.setup(Game.w);
    Tut.doneT = 0;
    tutShowTarefa();
  } else tutAdvance();
}
function tutAdvance() {
  Tut.i++; Tut.line = 0;
  if (Tut.i >= TUT_STEPS.length) { tutEnd(true); return; }
  tutShowFala();
}

// chamado a cada quadro pelo laço principal
function tutUpdate(w, dt) {
  if (!Tut.active || !w) return;
  if (w.state === 'dead') { tutEnd(false); return; }
  const p = w.player;
  p.hp = Math.max(p.hp, w.stats.maxHp * 0.6); // no tutorial ninguém morre
  if (Tut.talking || Game.paused) return;
  const st = TUT_STEPS[Tut.i];
  if (!st.tarefa) return;
  const bar = Tut.el.querySelector('.nar-bar i');
  if (bar && st.prog) bar.style.width = Math.round(clamp(st.prog(w), 0, 1) * 100) + '%';
  if (w.state !== 'play') return; // escolhendo carta
  if (Tut.doneT > 0) { Tut.doneT -= dt; if (Tut.doneT <= 0) tutAdvance(); return; }
  if (st.done(w)) {
    Tut.doneT = 0.9; // um respiro antes da próxima fala
    if (bar) bar.style.width = '100%';
    Tut.el.querySelector('.nar-task').classList.add('ok');
    Som.play('level');
  }
}

function tutEnd(completed) {
  Tut.active = false; Tut.talking = false;
  if (Tut.el) Tut.el.hidden = true;
  try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); } catch (e) { /* sem voz */ }
  try { if (completed) localStorage.setItem('mata-tutorial', '1'); } catch (e) { /* sem armazenamento */ }
  Game.w = null; Game.paused = false;
  showMenu();
}
const tutDone = () => { try { return localStorage.getItem('mata-tutorial') === '1'; } catch (e) { return false; } };
