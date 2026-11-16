'use strict';
// ===== Mundo: estado da corrida, simulação e fluxo de fases =====
// Não usa DOM: roda igual no navegador e no simulador (Node).

const ARENA = { w: 2600, h: 2600 };
// Dificuldade geral. Calibrada para a PRIMEIRA corrida ser dura (quase não passa do 1º chefe)
// e o treino permanente (patacas) ir equilibrando a luta.
const DIFF = { hp: 2, dmg: 1.5, bossHp: 7.6, bossDmg: 3, late: 0.12 };
const xpForLevel = l => Math.round(5 + l * 6 + 0.9 * l * l);
// Escala por ciclo cresce mais que exponencialmente: no infinito sempre existe uma parede
// Dificuldade contínua: k = fases completas desde o início (ciclo 2 fase 1 → k=10).
// Até a fase 10 cresce devagar; depois cada fase multiplica vida ×1,8 e dano ×1,25.
const hpBase = k => 1 + 0.65 * k + 0.3 * k * k;
const dmgBase = k => 1 + 0.24 * k;
function hpScaleK(k) {
  if (k <= 9) return hpBase(k);
  return hpBase(9) * Math.pow(1.8, k - 9);
}
function dmgScaleK(k) {
  if (k <= 9) return dmgBase(k);
  return dmgBase(9) * Math.pow(1.25, k - 9);
}

class World {
  constructor(classId, opts = {}) {
    this.headless = !!opts.headless;
    RNG.setSeed(opts.seed != null ? opts.seed : Date.now());
    this.seed = RNG.seed;
    this.classId = classId;
    this.sfxHook = opts.sfx || null;
    this.time = 0;
    this.mapIdx = clamp(opts.mapa | 0, 0, MAPAS.length - 1);
    this.mapa = MAPAS[this.mapIdx];
    this.nPlayers = clamp((opts.players | 0) || 1, 1, 5); // dificuldade 1 a 5 conforme o número de jogadores
    this.etapa = 0;                 // degrau de ameaça (sobe a cada ETAPA_T segundos)
    this.phaseIdx = this.mapa.fase; // de onde saem as criaturas e o chefe da etapa
    this.cycle = 1;
    this.level = 1; this.xp = 0; this.xpNext = xpForLevel(1);
    this.pendingLevels = 0;
    this.tutorial = !!opts.tutorial; // fase de tutorial: sem ondas, sem chefe, sem relógio
    this.meta = opts.meta || {};
    this.coins = 3 * (this.meta.mesada || 0); this.rerolls = 3 + (this.meta.manha || 0);
    this.ativo = null;      // item ativo: { id, t } (t = recarga restante)
    this.specialT = 2;      // recarga do especial da classe
    this.ultT = 25;         // recarga do ultimate (começa pela metade)
    this.runKills = 0; this.phaseKills = 0;
    this.totalDamage = 0; this.dmgBySrc = {}; this.damageTaken = 0;
    this.phasesCleared = 0;
    this.golpes = [{ id: CLASSES[classId].golpe, level: 1, t: 0.4, state: {} }];
    this.dons = []; this.encantos = [];
    this.donF = []; this.donR = []; // força e raridade de cada carta em this.dons (mesmo índice)
    this.player = {
      x: ARENA.w / 2, y: ARENA.h / 2, r: 14, hp: 1, facing: 0, moving: false, iframes: 0,
      dashCd: 0, dashT: 0, dashVx: 0, dashVy: 0, slowT: 0, barrier: 0, barrierDmg: 0,
      pullX: 0, pullY: 0, auT: 0, revivedThisPhase: false, hazardT: 0, flash: 0, walk: 0,
    };
    this.stats = null;
    computeStats(this);
    this.player.hp = this.stats.maxHp;
    this.input = { x: 0, y: 0, dash: false, special: false, item: false, ult: false };
    this.events = [];
    this.grid = new SpatialHash(64);
    this.timers = [];
    this.eid = 0;
    this.shakeAmt = 0;
    this.startPhase();
  }

  // ---------- utilidades ----------
  sfx(name) { if (this.sfxHook) this.sfxHook(name); }
  emit(type, data = {}) { this.events.push({ type, ...data }); }
  later(t, fn) { this.timers.push({ t, fn }); }
  shake(v) { this.shakeAmt = Math.max(this.shakeAmt, v); }

  // ---------- animação, investida, especial e item ativo ----------
  // act: o boneco faz o movimento do golpe (giro, chute, tiro...). Só visual.
  act(kind, dur, ang) {
    const p = this.player;
    if (p.anim && p.anim.t > 0.6 && dur < 0.6) return; // não corta animações longas (roda de capoeira)
    p.anim = { kind, t: dur, max: dur, ang: ang == null ? null : ang };
  }
  // investida até um inimigo; ao chegar, chama onEnd. Devolve false se já está investindo.
  lungeTo(e, speed, onEnd) {
    const p = this.player;
    if (p.lunge) return false;
    const a = Math.atan2(e.y - p.y, e.x - p.x);
    const d = Math.max(0, dist(e, p) - e.r - p.r - 4);
    const t = d / speed;
    if (t < 0.02) { onEnd(); return true; }
    p.lunge = { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, t, ang: a, onEnd };
    this.fx.push({ kind: 'dash', x: p.x, y: p.y, ang: a, life: 0.25, max: 0.25 });
    return true;
  }
  // patacas ganhas na corrida (moeda do treino permanente)
  patacas() { return 3 + this.level + this.phasesCleared * 10 + Math.floor(this.runKills / 25) + Math.floor(this.time / 40); }
  specialCd() { return CLASSES[this.classId].special.cd * (1 - 0.06 * Math.min(5, this.meta.folego2 || 0)); }
  useSpecial() {
    if (this.state !== 'play' && this.state !== 'clearing') return false;
    if (this.specialT > 0 || this.player.hp <= 0) return false;
    this.specialT = this.specialCd();
    SPECIALS[this.classId](this);
    this.emit('special');
    return true;
  }
  ultCd() { return CLASSES[this.classId].ult.cd; }
  useUltimate() {
    if (this.state !== 'play' && this.state !== 'clearing') return false;
    if (this.ultT > 0 || this.player.hp <= 0) return false;
    this.ultT = this.ultCd();
    ULTIMATES[this.classId](this);
    this.emit('ultimate', { name: CLASSES[this.classId].ult.name });
    this.sfx('ult:' + this.classId);
    return true;
  }
  useItem() {
    if (this.state !== 'play' && this.state !== 'clearing') return false;
    const it = this.ativo;
    if (!it || it.t > 0 || this.player.hp <= 0) return false;
    if (it.id === 'cha' && this.player.hp >= this.stats.maxHp) return false;
    it.t = ATIVO_BY_ID[it.id].cd;
    ATIVO_USE[it.id](this);
    this.emit('item');
    return true;
  }
  clampArena(e) { e.x = clamp(e.x, e.r, ARENA.w - e.r); e.y = clamp(e.y, e.r, ARENA.h - e.r); }
  clampPoint(pt) { pt.x = clamp(pt.x, 40, ARENA.w - 40); pt.y = clamp(pt.y, 40, ARENA.h - 40); return pt; }
  queryEnemies(x, y, r) {
    const out = [];
    for (const e of this.grid.query(x, y, r)) {
      if (e.dead) continue;
      const rr = r + e.r;
      if ((e.x - x) ** 2 + (e.y - y) ** 2 <= rr * rr) out.push(e);
    }
    return out;
  }
  nearest(x, y, range) {
    let best = null, bd = range * range;
    for (const e of this.grid.query(x, y, range)) {
      if (e.dead) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  golpeCd(g) {
    const def = GOLPES[g.id];
    const base = def.cd[Math.min(g.level, def.cd.length) - 1];
    const atk = this.stats.atkSpeed + (def.tag ? (this.stats.tagAtk[def.tag] || 0) : 0);
    return Math.max(0.1, base / atk / (this.player.buffAtkT > 0 ? 1.4 : 1));
  }
  golpeArea(g) {
    const tag = GOLPES[g.id].tag;
    return this.stats.area * (1 + (tag ? (this.stats.tagArea[tag] || 0) : 0));
  }
  // Ameaça: degrau por etapa, com uma rampa leve dentro dela. Cresce para sempre.
  diffK() { return this.mapa.k0 + this.etapa + 0.4 * ((this.time - this.etapa * ETAPA_T) / ETAPA_T); }
  scaling() {
    const k = this.diffK(), late = Math.min(k, 9), n = this.nPlayers - 1;
    return { hp: hpScaleK(k) * DIFF.hp * (1 + DIFF.late * late) * (1 + 0.45 * n), dmg: dmgScaleK(k) * DIFF.dmg * (1 + DIFF.late * 0.4 * late) * (1 + 0.08 * n) };
  }
  // chefes: a vida "de fábrica" de cada um foi pensada para a fase de origem dele (nativo);
  // aqui ela é levada para a ameaça atual, e cresce com o número de jogadores.
  bossScale(nativo) {
    const kb = this.mapa.k0 + this.etapa, late = Math.min(kb, 9), n = this.nPlayers - 1;
    return { hp: hpScaleK(kb) / hpScaleK(nativo) * DIFF.bossHp * (1 + DIFF.late * late) * (1 + 0.9 * n), dmg: dmgScaleK(kb) / dmgScaleK(nativo) * DIFF.bossDmg * (1 + DIFF.late * 0.4 * late) * (1 + 0.08 * n) };
  }
  bossesAlive() { let n = 0; for (const e of this.enemies) if (e.boss && !e.dead) n++; return n; }

  // ---------- fases ----------
  startPhase() { // começo da corrida no mapa
    const p = this.player;
    this.enemies = []; this.projectiles = []; this.ebullets = []; this.areas = [];
    this.hazards = []; this.pickups = []; this.fx = []; this.floats = []; this.timers = [];
    p.x = ARENA.w / 2; p.y = ARENA.h / 2; p.barrier = 0; p.slowT = 0; p.iframes = 1;
    p.revivedThisPhase = false; p.pullX = p.pullY = 0;
    computeStats(this);
    this.spawnAcc = 0; this.eliteT = 22;
    this.boss = null; this.bossSpawned = false; this.hordeDone = false; this.bossT = 0; this.bossDaEtapa = false;
    this.phaseKills = 0; this.elitesMortos = 0; this.chest = null; this.shop = null; this.feiraAberta = false;
    this.state = 'play';
    this.makeDecor();
    this.makeInterativos();
    if (!this.tutorial) this.abrirFeira(true);
    this.emit('phaseStart', { phase: 1, cycle: 1 });
  }

  makeDecor() {
    const biome = BIOMES[this.mapa.biome];
    this.decor = [];
    for (let i = 0; i < (biome.density || 170); i++) {
      const x = RNG.range(0, ARENA.w), y = RNG.range(0, ARENA.h);
      if (Math.abs(x - ARENA.w / 2) < 120 && Math.abs(y - ARENA.h / 2) < 120) continue;
      this.decor.push({ x, y, kind: RNG.pick(biome.decor), s: RNG.range(0.8, 1.35), flip: RNG.chance(0.5) });
    }
    this.decor.sort((a, b) => a.y - b.y);
  }

  spawnPoint() {
    const p = this.player;
    for (let i = 0; i < 8; i++) {
      const a = RNG.range(0, TAU), d = RNG.range(560, 700);
      const pt = { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d };
      if (pt.x > 30 && pt.y > 30 && pt.x < ARENA.w - 30 && pt.y < ARENA.h - 30) return pt;
    }
    return this.safePoint(p.x, p.y, 560);
  }

  // Devolve um ponto dentro da arena a pelo menos minD do jogador.
  // Primeiro empurra o ponto para fora na mesma direção; se a borda impedir, procura outro ângulo
  // começando pelo lado do centro da arena (onde sempre há espaço).
  safePoint(x, y, minD) {
    const p = this.player;
    let pt = this.clampPoint({ x, y });
    if (dist(pt, p) >= minD) return pt;
    const d0 = dist({ x, y }, p);
    if (d0 > 1) {
      const a = Math.atan2(y - p.y, x - p.x);
      pt = this.clampPoint({ x: p.x + Math.cos(a) * minD, y: p.y + Math.sin(a) * minD });
      if (dist(pt, p) >= minD * 0.95) return pt;
    }
    const base = Math.atan2(ARENA.h / 2 - p.y, ARENA.w / 2 - p.x);
    for (let i = 0; i < 12; i++) {
      const a = base + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (TAU / 12) + RNG.range(-0.2, 0.2);
      pt = this.clampPoint({ x: p.x + Math.cos(a) * minD, y: p.y + Math.sin(a) * minD });
      if (dist(pt, p) >= minD * 0.95) return pt;
    }
    return pt;
  }

  spawnEnemy(type, x, y, opts = {}) {
    const d = ENEMIES[type];
    if (x === undefined) { const pt = this.spawnPoint(); x = pt.x; y = pt.y; }
    else {
      // nunca nasce em cima do jogador (invocações de chefe, hordas perto da borda...)
      const pt = this.safePoint(x, y, (opts.summoned ? 150 : 360) + d.r);
      x = pt.x; y = pt.y;
    }
    const sc = this.scaling();
    const elite = !!opts.elite;
    // bicho grande chega mais fraco no começo de cada mapa (o herói ainda está no nível 1)
    const cria = d.hp > 40 ? clamp(0.45 + 0.14 * this.etapa, 0.45, 1) : 1;
    const hp = d.hp * sc.hp * cria * (elite ? 7 : 1);
    const e = {
      id: ++this.eid, type, sprite: d.sprite, name: d.name, x, y, r: d.r * (elite ? 1.45 : 1),
      hp, maxHp: hp, speed: d.speed * (1 + 0.03 * Math.min(this.diffK(), 12)) * (elite ? 0.9 : 1),
      dmg: d.dmg * sc.dmg * (0.5 + 0.5 * cria) * (elite ? 1.5 : 1),
      xpVal: d.xp * (elite ? 10 : 1) * (opts.summoned ? 0.5 : 1), ai: d.ai, elite, boss: false,
      heavy: !!d.heavy, regen: (d.regen || 0) * sc.hp, stunT: 0, slowT: 0, kvx: 0, kvy: 0,
      hitCd: {}, flash: 0, burn: null, st: '', tA: RNG.range(1, 3), tB: 0, seed: RNG.next(),
      mx: 0, my: 0, dash: null, alpha: 1, summoned: !!opts.summoned, scale: elite ? 1.45 : 1, face: 1,
    };
    this.clampArena(e);
    this.enemies.push(e);
    return e;
  }

  spawnBoss() {
    const nat = this.phaseIdx % NUM_PHASES, tipo = PHASES[nat].boss, def = BOSSES[tipo];
    const a = RNG.range(0, TAU);
    const pt = this.safePoint(this.player.x + Math.cos(a) * 430, this.player.y + Math.sin(a) * 430, 400);
    const bs = this.bossScale(nat), kb = this.mapa.k0 + this.etapa;
    const hp = def.hp * bs.hp * (1 + 0.12 * kb);
    const e = {
      id: ++this.eid, type: tipo, sprite: def.sprite, name: def.name, x: pt.x, y: pt.y, r: def.r,
      hp, maxHp: hp, speed: def.speed, dmg: def.dmg * bs.dmg * (1 + 0.08 * kb),
      xpVal: 25 + kb * 10, ai: 'boss', elite: false, boss: true, heavy: true,
      regen: (def.regen || 0) * bs.hp, stunT: 0, slowT: 0, kvx: 0, kvy: 0, hitCd: {}, flash: 0, burn: null,
      st: '', tA: 1.6, tB: 0, seed: RNG.next(), mx: 0, my: 0, dash: null, alpha: 1,
      patterns: def.patterns, pi: 0, pat: null, scale: def.scale, serpent: !!def.serpent, trail: [], face: 1,
    };
    this.enemies.push(e);
    this.boss = e; this.bossSpawned = true;
    this.emit('boss', { name: def.name, intro: def.intro });
    this.sfx('boss');
    this.shake(10);
    return e;
  }

  // Diretor: decide o que nasce e quando. O tempo nunca para de apertar.
  updateDirector(dt) {
    if (this.state !== 'play' || this.tutorial) return;
    const et = Math.floor(this.time / ETAPA_T);
    if (et > this.etapa) { // novo degrau de ameaça
      this.etapa = et; this.phaseIdx = this.mapa.fase + et;
      this.hordeDone = false; this.bossDaEtapa = false;
      this.abrirFeira();
      this.emit('etapa', { n: et + 1 });
    }
    const tIn = this.time - this.etapa * ETAPA_T;
    const ph = PHASES[Math.min(NUM_PHASES - 1, this.phaseIdx)];
    const k = this.diffK(), nP = this.nPlayers - 1;
    const prog = Math.min(1, tIn / CHEFE_EM);
    const vivos = this.bossesAlive();
    let rate = (0.85 + 0.26 * Math.min(k, 30)) * (1 + 1.4 * prog) * (1 + 0.5 * nP);
    const cap = (vivos ? 45 : 200) + 30 * nP;
    if (vivos) { rate *= 0.35; this.bossT += dt; } else this.bossT = 0;
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.enemies.length < cap) this.spawnEnemy(RNG.weighted(ph.pool));
    }
    if (!this.hordeDone && tIn >= 32 && !vivos) {
      this.hordeDone = true;
      const type = ph.pool[0][0], n = 14 + Math.min(this.etapa, 20) * 2 + 4 * nP;
      const p = this.player;
      for (let i = 0; i < n; i++) {
        const a = i * TAU / n;
        this.spawnEnemy(type, p.x + Math.cos(a) * 520, p.y + Math.sin(a) * 520);
      }
      this.emit('horde');
    }
    this.eliteT -= dt;
    if (this.eliteT <= 0 && !vivos) {
      this.eliteT = 24;
      const types = ph.pool.map(x => x[0]);
      this.spawnEnemy(types[types.length - 1], undefined, undefined, { elite: true });
      this.emit('elite');
    }
    if (!this.bossDaEtapa && tIn >= CHEFE_EM) { this.bossDaEtapa = true; this.spawnBoss(); }
    // potes de barro voltam a aparecer aos poucos
    this.poteT -= dt;
    if (this.poteT <= 0) { this.poteT = 20; if (this.interativos.filter(i => i.kind === 'pote').length < 16) this.addPote(); }
  }

  onBossKilled(e) {
    this.phasesCleared++;
    const outros = this.bossesAlive();
    this.boss = outros ? this.enemies.find(o => o.boss && !o.dead) : null;
    this.bossSpawned = !!outros;
    if (!outros) { // respiro: a horda comum some junto com o chefe
      for (const o of this.enemies) if (!o.dead && !o.boss && !o.elite) this.killEnemy(o, true);
      this.ebullets = [];
      for (const h of this.hazards) h.life = Math.min(h.life, 0.3);
    }
    const p = this.player;
    const coins = 6 + Math.min(this.etapa, 14);
    for (let i = 0; i < coins; i++) this.dropPickup('coin', e.x + RNG.range(-40, 40), e.y + RNG.range(-40, 40), 1);
    this.dropPickup('bau', e.x, e.y, 1); // o baú do chefe fica no chão: é só ir buscar
    p.hp = Math.min(this.stats.maxHp, p.hp + this.stats.maxHp * 0.15);
    p.revivedThisPhase = false; this.phaseKills = 0; this.rerolls += 1;
    this.emit('bossDead', { name: e.name });
    if (this.phasesCleared === this.mapa.chefes) this.emit('mapaVencido', { mapa: this.mapIdx });
    this.sfx('bossDead');
    this.shake(14);
  }

  // baú (do chefe ou trancado): escolhe 1 de 3 tesouros
  openChest() {
    const n = 3;
    let offer = [];
    if (this.encantos.length < MAX_ENCANTOS) offer = rollEncantos(this, 2);
    offer = offer.concat(rollCards(this, n - offer.length, { donsOnly: true, minRarity: 'raro' }));
    // o primeiro baú sempre traz um item ativo; depois, às vezes
    if (offer.length && (!this.ativo || RNG.chance(0.35))) {
      const pool = ATIVOS.filter(a => !this.ativo || a.id !== this.ativo.id);
      offer[offer.length - 1] = { kind: 'ativo', id: RNG.pick(pool).id };
    }
    if (!offer.length) return;
    this.chest = offer;
    this.state = 'chest';
    this.emit('chest');
  }
  chooseChest(i) {
    if (this.state !== 'chest') return;
    const c = this.chest && this.chest[i];
    if (c) this.applyCard(c);
    this.chest = null;
    this.state = 'play';
    this.player.iframes = Math.max(this.player.iframes, 0.8);
  }

  // balaio (cai de elite): um reforço surpresa na hora
  balaio() {
    const ups = this.golpes.filter(g => !g.hidden && g.level < 5);
    let card = null;
    if (ups.length && RNG.chance(0.7)) { const g = RNG.pick(ups); card = { kind: 'golpe', id: g.id, level: g.level + 1, rarity: 'incomum' }; }
    else card = rollCards(this, 1, { donsOnly: true, minRarity: 'incomum' })[0] || null;
    this.coins += 2;
    if (card) { this.applyCard(card); const inf = cardInfo(card); this.emit('balaio', { name: inf.name, tipo: inf.type }); }
    this.sfx('level');
  }
  // sino da capela: varre a tela
  sino() {
    const p = this.player;
    for (const e of this.queryEnemies(p.x, p.y, 720)) {
      if (e.dead) continue;
      this.applyDamage(e, e.boss ? e.maxHp * 0.06 : e.elite ? e.maxHp * 0.4 : e.hp + 1, false, 'sino');
    }
    this.ebullets = [];
    this.fx.push({ kind: 'ring', x: p.x, y: p.y, r: 700, life: 0.6, max: 0.6, color: '#f0b429' });
    this.fx.push({ kind: 'boom', x: p.x, y: p.y, r: 260, life: 0.45, max: 0.45, color: '#f0b429' });
    this.shake(12); this.sfx('bossDead'); this.emit('sino');
  }

  // ---------- elementos do mapa: barraca da Feira, potes, oratórios e baús trancados ----------
  makeInterativos() {
    this.interativos = []; this.bausAbertos = 0; this.poteT = 20;
    if (this.tutorial) return;
    const cx = ARENA.w / 2, cy = ARENA.h / 2;
    this.interativos.push({ kind: 'feira', x: cx + 190, y: cy - 150, r: 40 });
    for (let i = 0; i < 16; i++) this.addPote();
    for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + RNG.range(0, 1), d = RNG.range(480, 880); this.interativos.push({ kind: 'oratorio', x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: 58, carga: 0, espera: 0 }); }
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + RNG.range(0.2, 1.2), d = RNG.range(360, 980); this.interativos.push({ kind: 'bau', x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: 20, aviso: 0 }); }
  }
  addPote() {
    for (let t = 0; t < 12; t++) {
      const x = RNG.range(90, ARENA.w - 90), y = RNG.range(90, ARENA.h - 90);
      if (dist2({ x, y }, this.player) < 220 * 220) continue;
      this.interativos.push({ kind: 'pote', x, y, r: 15 });
      return;
    }
  }
  precoBau() { return 12 + 8 * this.bausAbertos; }
  quebrarPote(it) {
    const r = RNG.next();
    this.fx.push({ kind: 'puff', x: it.x, y: it.y, life: 0.35, max: 0.35, color: '#c9703a' });
    this.sfx('kill');
    if (r < 0.5) this.dropPickup('coin', it.x, it.y, RNG.int(1, 3));
    else if (r < 0.66) this.dropPickup('heal', it.x, it.y, 0.15);
    else if (r < 0.82) this.dropPickup('berrante', it.x, it.y, 1);
    else if (r < 0.88) this.dropPickup('sino', it.x, it.y, 1);
    else this.dropPickup('xp', it.x, it.y, 3 + this.etapa);
    this.potesQuebrados = (this.potesQuebrados || 0) + 1;
  }
  bencao(it) {
    const p = this.player, h = this.stats.maxHp * 0.25;
    p.hp = Math.min(this.stats.maxHp, p.hp + h);
    p.bencaoT = 30;
    this.floats.push({ x: p.x, y: p.y - 24, text: '+' + fmt(h), color: '#6aff8a', life: 0.8, max: 0.8 });
    this.fx.push({ kind: 'ring', x: it.x, y: it.y, r: it.r, life: 0.6, max: 0.6, color: '#7cffe0' });
    this.sfx('heal'); this.emit('bencao');
  }
  updateInterativos(dt) {
    if (this.state !== 'play') return;
    const p = this.player;
    for (const it of this.interativos) {
      const d2 = dist2(it, p), toca = d2 < (it.r + p.r) * (it.r + p.r);
      if (it.kind === 'pote') { if (toca) { it.dead = true; this.quebrarPote(it); } }
      else if (it.kind === 'feira') { if (toca && this.feiraAberta) { this.openShop(); break; } }
      else if (it.kind === 'bau') {
        it.aviso = Math.max(0, it.aviso - dt);
        if (toca) {
          const preco = this.precoBau();
          if (this.coins >= preco) { this.coins -= preco; this.bausAbertos++; it.dead = true; this.sfx('buy'); this.openChest(); break; }
          if (it.aviso <= 0) { it.aviso = 1.4; this.floats.push({ x: it.x, y: it.y - 26, text: 'R$ ' + preco, crit: true, life: 1, max: 1 }); }
        }
      } else if (it.kind === 'oratorio') {
        if (it.espera > 0) { it.espera -= dt; continue; }
        if (d2 < it.r * it.r) { it.carga += dt / 2.5; if (it.carga >= 1) { it.carga = 0; it.espera = 120; this.bencao(it); } }
        else it.carga = Math.max(0, it.carga - dt * 0.8);
      }
    }
    this.interativos = this.interativos.filter(it => !it.dead);
  }

  interest() {
    const per = this.stats.flags.juros2 ? 2 : 1, cap = this.stats.flags.juros2 ? 10 : 5;
    return Math.min(cap, Math.floor(this.coins / 5) * per);
  }

  // A Feira fica numa barraca no mapa. Ela reabastece (e paga os juros) a cada etapa.
  abrirFeira(semBonus) {
    const bonus = semBonus ? 0 : 3, juros = semBonus ? 0 : this.interest();
    this.coins += bonus + juros;
    this.lastIncome = { bonus, juros };
    this.shop = { cards: [], encantos: [], heal: null, rerollCost: 3 };
    this.restockShop();
    this.shop.heal = { price: 5 + Math.min(this.etapa, 20), sold: false };
    this.feiraAberta = true;
    if (!semBonus) this.emit('feira');
  }
  openShop() {
    if (!this.shop || this.state !== 'play') return;
    this.state = 'shop';
    this.emit('shop');
  }

  restockShop() {
    this.shop.cards = rollCards(this, 4).map(c => ({ ...c, price: cardPrice(this, c), sold: false }));
    this.shop.encantos = rollEncantos(this, 2).map(c => ({ ...c, price: cardPrice(this, c), sold: false }));
    const pool = ATIVOS.filter(a => !this.ativo || a.id !== this.ativo.id);
    const at = { kind: 'ativo', id: RNG.pick(pool).id };
    this.shop.ativo = { ...at, price: cardPrice(this, at), sold: false };
  }

  buy(kind, i) {
    if (this.state !== 'shop') return false;
    let item;
    if (kind === 'card') item = this.shop.cards[i];
    else if (kind === 'encanto') item = this.shop.encantos[i];
    else if (kind === 'heal') item = this.shop.heal;
    else if (kind === 'ativo') item = this.shop.ativo;
    if (!item || item.sold || this.coins < item.price) return false;
    if (kind === 'encanto' && this.encantos.length >= MAX_ENCANTOS) return false;
    if (kind === 'heal' && this.player.hp >= this.stats.maxHp) return false;
    if (kind === 'card' && item.kind === 'golpe') {
      const g = this.golpes.find(x => x.id === item.id);
      if (g && g.level >= 5) return false;
      if (!g && this.golpes.filter(x => !x.hidden).length >= MAX_GOLPES) return false;
    }
    this.coins -= item.price;
    item.sold = true;
    if (kind === 'heal') this.player.hp = Math.min(this.stats.maxHp, this.player.hp + this.stats.maxHp * 0.5);
    else this.applyCard(item);
    this.sfx('buy');
    return true;
  }

  shopReroll() {
    if (this.state !== 'shop' || this.coins < this.shop.rerollCost) return false;
    this.coins -= this.shop.rerollCost;
    this.shop.rerollCost += 2;
    this.restockShop();
    this.sfx('reroll');
    return true;
  }

  leaveShop() {
    if (this.state !== 'shop') return;
    this.state = 'play';
    this.feiraAberta = false; // só volta a abrir quando reabastecer
    this.player.iframes = Math.max(this.player.iframes, 1);
  }

  // ---------- cartas e níveis ----------
  gainXp(v) {
    this.xp += v * this.stats.xpMult;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = xpForLevel(this.level);
      this.pendingLevels++;
      if (this.classId === 'jiujitsu' && beltIndex(this.level) > beltIndex(this.level - 1)) {
        computeStats(this);
        this.emit('belt', { belt: BELTS[beltIndex(this.level)] });
      }
    }
  }

  openLevelUp() {
    this.offer = rollCards(this, this.stats.options);
    if (!this.offer.length) { this.pendingLevels = 0; return; }
    this.state = 'levelup';
    this.emit('levelup');
    this.sfx('level');
  }

  chooseCard(i) {
    if (this.state !== 'levelup') return;
    const c = this.offer && this.offer[i];
    if (!c) return;
    this.applyCard(c);
    this.afterOffer();
  }
  skipCard() {
    if (this.state !== 'levelup') return;
    this.coins += 3 + Math.min(this.etapa, 12);
    this.afterOffer();
  }
  afterOffer() {
    this.pendingLevels = Math.max(0, this.pendingLevels - 1);
    this.offer = null;
    this.state = this.resumeState || 'play';
    this.player.iframes = Math.max(this.player.iframes, 0.5);
    if (this.pendingLevels > 0) this.openLevelUp();
  }
  rerollOffer() {
    if (this.state !== 'levelup' || this.rerolls <= 0) return false;
    this.rerolls--;
    this.offer = rollCards(this, this.stats.options);
    this.sfx('reroll');
    return true;
  }

  applyCard(c) {
    if (c.kind === 'golpe') {
      const g = this.golpes.find(x => x.id === c.id);
      if (g) g.level = Math.min(5, g.level + 1);
      else if (this.golpes.filter(x => !x.hidden).length < MAX_GOLPES) this.golpes.push({ id: c.id, level: 1, t: 0.3, state: {} });
    } else if (c.kind === 'don') {
      const d = DON_BY_ID[c.id];
      if (d.unique && this.dons.includes(d.id)) return;
      this.dons.push(c.id);
      this.donF.push(c.f || 1); this.donR.push(c.rarity || d.rarity);
      if (d.onPick) d.onPick(this);
    } else if (c.kind === 'encanto') {
      if (this.encantos.includes(c.id) || this.encantos.length >= MAX_ENCANTOS) return;
      this.encantos.push(c.id);
    } else if (c.kind === 'ativo') {
      this.ativo = { id: c.id, t: 0 }; // troca o item que você tinha
    }
    computeStats(this);
    this.emit('card', { card: c });
  }

  // ---------- combate ----------
  hit(e, base, tag, o = {}) {
    if (!e || e.dead) return 0;
    const { dmg, crit } = calcDamage(this, base, tag, e, o.extraCrit || 0);
    if (o.stun) {
      const st = o.stun * this.stats.stunMult;
      e.stunT = Math.max(e.stunT, e.boss ? Math.min(0.3, st * 0.15) : e.elite ? st * 0.5 : st);
    }
    if (o.slow) e.slowT = Math.max(e.slowT, o.slow);
    if (o.knock && !e.heavy && !e.boss) {
      const k = o.knock * (e.elite ? 0.35 : 1);
      e.kvx += (o.kx || 0) * k; e.kvy += (o.ky || 0) * k;
    }
    this.applyDamage(e, dmg, crit, o.src);
    if (crit && this.stats.flags.burnCrit && !e.dead) e.burn = { dps: dmg * 0.2, t: 2 };
    if (this.stats.flags.finaliza && !e.dead && !e.boss && !e.elite && e.hp < e.maxHp * 0.15) {
      this.applyDamage(e, e.hp, false, 'finalizacao');
      this.fx.push({ kind: 'puff', x: e.x, y: e.y, life: 0.35, max: 0.35, color: '#c9b3ff' });
    }
    return dmg;
  }

  applyDamage(e, dmg, crit, src, quiet) {
    if (e.dead) return;
    dmg = clamp(finite(dmg, 0), 0, DMG_CAP);
    e.hp -= dmg;
    e.flash = 0.1;
    this.totalDamage += dmg;
    const k = src || 'outros';
    this.dmgBySrc[k] = (this.dmgBySrc[k] || 0) + dmg;
    // roubo de vida (limitado para não virar imortal)
    if (this.stats.lifesteal > 0 && src !== 'pimenta') {
      const p = this.player;
      const h = Math.min(dmg * this.stats.lifesteal, p.lsBudget);
      if (p.hp > 0 && h > 0) { p.hp = Math.min(this.stats.maxHp, p.hp + h); p.lsBudget -= h; }
    }
    if (!this.headless && !quiet && (crit || this.floats.length < 90)) {
      this.floats.push({ x: e.x + RNG.range(-8, 8), y: e.y - e.r, text: fmt(dmg), crit, life: 0.75, max: 0.75 });
    }
    if (e.hp <= 0) { e.killSrc = src; this.killEnemy(e); }
  }

  killEnemy(e, silent) {
    // vantagem de classe: abater com golpe da própria build cura (com teto por segundo)
    if (!silent && e.killSrc) {
      const cls = CLASSES[this.classId], g = GOLPES[e.killSrc];
      const tag = g ? g.tag : (e.killSrc === 'especial' ? cls.tag : null);
      const pctHeal = this.classId === 'jiujitsu' && tag === 'jiujitsu' ? 0.015 : this.classId === 'benzedeira' && tag === 'mandinga' ? 0.005 : 0;
      const p = this.player;
      if (pctHeal && p.hp > 0) {
        const h = Math.min(this.stats.maxHp * pctHeal, p.perkBudget || 0);
        if (h > 0.01) { p.hp = Math.min(this.stats.maxHp, p.hp + h); p.perkBudget -= h; }
      }
    }
    if (e.dead) return;
    e.dead = true; e.hp = 0;
    this.runKills++; this.phaseKills++;
    if (!e.boss) {
      this.dropPickup('xp', e.x, e.y, e.xpVal);
      const cm = this.stats.coinMult;
      if (e.elite) {
        for (let i = 0; i < 3; i++) this.dropPickup('coin', e.x + RNG.range(-20, 20), e.y + RNG.range(-20, 20), 1);
        this.dropPickup('heal', e.x, e.y, 0.25);
        this.elitesMortos = (this.elitesMortos || 0) + 1;
        if (this.elitesMortos % 3 === 0) this.dropPickup('balaio', e.x + 14, e.y, 1);
      } else {
        const ch = 0.07 * cm;
        const n = Math.floor(ch) + (RNG.chance(ch % 1) ? 1 : 0);
        if (n > 0) this.dropPickup('coin', e.x, e.y, n);
        if (RNG.chance(0.006)) this.dropPickup('heal', e.x, e.y, 0.2);
      }
    } else {
      this.dropPickup('xp', e.x, e.y, e.xpVal);
    }
    if (!silent) {
      this.fx.push({ kind: 'puff', x: e.x, y: e.y, life: 0.3, max: 0.3, color: e.elite ? '#ffd23f' : '#ffffff' });
      if (this.stats.flags.fatuoOnKill && RNG.chance(0.15)) {
        const t = this.nearest(e.x, e.y, 400);
        if (t) {
          const a = Math.atan2(t.y - e.y, t.x - e.x);
          this.projectiles.push({
            kind: 'fatuo', x: e.x, y: e.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, speed: 300, r: 7,
            base: 8 + 1.2 * this.level, tag: 'mandinga', src: 'fatuoOnKill', pierce: 0, life: 2,
            homing: 7, target: t, hitSet: new Set(),
          });
        }
      }
    }
    if (e.boss) this.onBossKilled(e);
    else if (!silent && RNG.chance(0.25)) this.sfx('kill');
  }

  dropPickup(kind, x, y, v) {
    if (kind === 'xp' && this.pickups.length > 320) {
      // junta XP numa gema existente para não pesar
      for (let i = 0; i < 6; i++) {
        const g = this.pickups[RNG.int(0, this.pickups.length - 1)];
        if (g.kind === 'xp') { g.v += v; return; }
      }
    }
    this.pickups.push({ kind, x, y, v, mag: false, sp: 0 });
  }

  damagePlayer(amount, src, cause, opts = {}) {
    const p = this.player, s = this.stats;
    if (this.state !== 'play' && this.state !== 'clearing') return;
    if (p.iframes > 0 || p.dashT > 0) return;
    amount = clamp(finite(amount, 0), 0, 1e100);
    const ifr = opts.noIframes ? 0 : (opts.iframes || 0.45);
    if (RNG.chance(s.dodge + (this.classId === 'capoeirista' && p.ultT > 0 ? 0.3 : 0))) {
      p.iframes = Math.max(p.iframes, ifr * 0.6);
      this.floats.push({ x: p.x, y: p.y - 24, text: 'esquiva!', color: '#f2c14e', life: 0.6, max: 0.6 });
      this.onDodge();
      return;
    }
    if (RNG.chance(s.nullify)) {
      p.iframes = Math.max(p.iframes, ifr * 0.6);
      this.floats.push({ x: p.x, y: p.y - 24, text: 'corpo fechado!', color: '#4fd1c5', life: 0.6, max: 0.6 });
      return;
    }
    let dmg = amount * (1 - s.armor);
    if (p.barrier > 0) { const ab = Math.min(p.barrier, dmg); p.barrier -= ab; dmg -= ab; }
    if (src && !src.dead && s.thorns > 0) this.hit(src, amount * s.thorns, 'jiujitsu', { src: 'tatame' });
    p.iframes = Math.max(p.iframes, ifr);
    if (dmg <= 0) return;
    p.hp -= dmg;
    p.flash = 0.15;
    this.damageTaken += dmg;
    this.shake(Math.min(10, 3 + (dmg / s.maxHp) * 30));
    this.floats.push({ x: p.x, y: p.y - 24, text: '-' + fmt(dmg), color: '#ff5c5c', life: 0.7, max: 0.7 });
    this.sfx('hurt');
    if (p.hp <= 0) {
      if (s.flags.revive && !p.revivedThisPhase) {
        p.revivedThisPhase = true;
        p.hp = s.maxHp * 0.5;
        p.iframes = 2;
        for (const e of this.queryEnemies(p.x, p.y, 220)) {
          const a = Math.atan2(e.y - p.y, e.x - p.x);
          e.kvx += Math.cos(a) * 600; e.kvy += Math.sin(a) * 600;
        }
        this.fx.push({ kind: 'ring', x: p.x, y: p.y, r: 220, life: 0.6, max: 0.6, color: '#7bc950' });
        this.emit('revive');
        this.sfx('level');
      } else {
        p.hp = 0;
        this.state = 'dead';
        this.deathCause = cause || 'a mata';
        this.emit('dead');
        this.sfx('death');
      }
    }
  }

  onDodge() {
    const s = this.stats, p = this.player;
    if (s.flags.au) p.auT = 1.5;
    if (s.flags.auMeiaLua && (p.auMeiaCd || 0) <= this.time) {
      p.auMeiaCd = this.time + 0.4;
      const r = 115 * s.area * (1 + (s.tagArea.capoeira || 0));
      for (const e of this.queryEnemies(p.x, p.y, r)) {
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        this.hit(e, 20 + 4 * this.level, 'capoeira', { knock: 260, kx: Math.cos(a), ky: Math.sin(a), src: 'au' });
      }
      this.fx.push({ kind: 'spin', x: p.x, y: p.y, r, life: 0.25, max: 0.25, color: '#ffe08a', follow: true });
    }
  }

  enemyShoot(x, y, ang, speed, dmg, opts = {}) {
    if (this.ebullets.length > 500) return;
    this.ebullets.push({
      x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: opts.r || 7, dmg, life: 5,
      kind: opts.kind || 'orb', slow: opts.slow || 0, color: opts.color || '#ff6b5a',
    });
  }
  addHazard(h) {
    if (this.hazards.length > 400) return;
    h.max = h.life;
    this.hazards.push(h);
  }

  // ---------- atualização ----------
  update(dt) {
    if (this.state !== 'play' && this.state !== 'clearing') return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    for (const t of this.timers) { t.t -= dt; if (t.t <= 0 && !t.done) { t.done = true; t.fn(); } }
    this.timers = this.timers.filter(t => !t.done);
    this.updatePlayer(dt);
    this.grid.clear();
    for (const e of this.enemies) if (!e.dead) this.grid.insert(e);
    if (this.state === 'play') this.updateGolpes(dt);
    this.updateProjectiles(dt);
    this.updateAreas(dt);
    this.updateEnemies(dt);
    this.updateEnemyBullets(dt);
    this.updateHazards(dt);
    this.updatePickups(dt);
    this.updateFx(dt);
    this.updateInterativos(dt);
    this.updateDirector(dt);
    if ((this.state === 'play' || this.state === 'clearing') && this.pendingLevels > 0) {
      this.resumeState = this.state;
      this.openLevelUp();
    }
  }

  updatePlayer(dt) {
    const p = this.player, s = this.stats, inp = this.input;
    let ix = finite(inp.x), iy = finite(inp.y);
    const l = Math.hypot(ix, iy);
    if (l > 1) { ix /= l; iy /= l; }
    p.moving = l > 0.1;
    if (p.moving) p.facing = Math.atan2(iy, ix);
    p.iframes = Math.max(0, p.iframes - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.slowT = Math.max(0, p.slowT - dt);
    p.auT = Math.max(0, p.auT - dt);
    p.flash = Math.max(0, p.flash - dt);
    // roubo de vida cura no máximo 4% da vida máxima por segundo
    p.lsBudget = Math.min(s.maxHp * 0.04, (p.lsBudget || 0) + s.maxHp * 0.04 * dt);
    p.bencaoT = Math.max(0, (p.bencaoT || 0) - dt); // bênção do oratório
    p.perkBudget = Math.min(s.maxHp * 0.03, (p.perkBudget || 0) + s.maxHp * 0.02 * dt); // cura da vantagem de classe: até 2% da vida por segundo
    const sp = s.speed * (p.slowT > 0 ? 0.6 : 1) * (p.auT > 0 ? 1.3 : 1);
    if (inp.dash && p.dashCd <= 0 && p.dashT <= 0) {
      p.dashT = 0.18;
      p.dashVx = Math.cos(p.facing) * Math.max(sp, 210) * 3.3;
      p.dashVy = Math.sin(p.facing) * Math.max(sp, 210) * 3.3;
      p.dashCd = this.classId === 'capoeirista' ? 1.4 : 2.0;
      this.fx.push({ kind: 'dash', x: p.x, y: p.y, ang: p.facing, life: 0.25, max: 0.25 });
      this.sfx('dash');
    }
    if (inp.dash && p.lunge && p.dashT > 0) p.lunge = null; // a esquiva cancela a investida
    inp.dash = false;
    if (p.anim) { p.anim.t -= dt; if (p.anim.t <= 0) p.anim = null; }
    p.buffAtkT = Math.max(0, (p.buffAtkT || 0) - dt);
    this.specialT = Math.max(0, this.specialT - dt);
    if (this.ativo) this.ativo.t = Math.max(0, this.ativo.t - dt);
    this.ultT = Math.max(0, this.ultT - dt);
    p.ultT = Math.max(0, (p.ultT || 0) - dt);
    if (inp.ult) { inp.ult = false; this.useUltimate(); }
    if (inp.special) { inp.special = false; this.useSpecial(); }
    if (inp.item) { inp.item = false; this.useItem(); }
    if (p.lunge) {
      const L = p.lunge, step = Math.min(dt, L.t);
      p.x += L.vx * step; p.y += L.vy * step;
      L.t -= dt;
      if (L.t <= 0) { p.lunge = null; this.clampArena(p); L.onEnd(); }
    } else if (p.dashT > 0) {
      p.dashT -= dt;
      p.x += p.dashVx * dt; p.y += p.dashVy * dt;
    } else {
      p.x += ix * sp * dt; p.y += iy * sp * dt;
    }
    p.x += p.pullX * dt; p.y += p.pullY * dt;
    p.pullX = p.pullY = 0;
    if (p.moving) p.walk += dt * sp / 30;
    this.clampArena(p);
    const regen = s.regen * (s.flags.rede && !p.moving ? 3 : 1);
    if (p.hp > 0) p.hp = Math.min(s.maxHp, p.hp + regen * dt);
  }

  updateGolpes(dt) {
    for (const g of this.golpes) {
      const def = GOLPES[g.id];
      if (def.tick) def.tick(this, g, g.level, dt);
      if (def.cd) {
        g.t -= dt;
        if (g.t <= 0) {
          const cd = this.golpeCd(g);
          g.t = Math.max(g.t + cd, cd * 0.5);
          def.fire(this, g, g.level);
        }
      }
    }
  }

  updateProjectiles(dt) {
    const p = this.player;
    for (const pr of this.projectiles) {
      pr.life -= dt;
      if (pr.kind === 'bottle') {
        pr.t += dt;
        const k = Math.min(1, pr.t / pr.dur);
        pr.x = lerp(pr.sx, pr.tx, k); pr.y = lerp(pr.sy, pr.ty, k);
        pr.h = Math.sin(k * Math.PI) * 60;
        if (k >= 1) {
          for (const e of this.queryEnemies(pr.tx, pr.ty, pr.boom)) {
            const a = Math.atan2(e.y - pr.ty, e.x - pr.tx);
            this.hit(e, pr.base, pr.tag, { src: pr.src, knock: 140, kx: Math.cos(a), ky: Math.sin(a) });
          }
          this.areas.push({
            kind: 'puddle', x: pr.tx, y: pr.ty, r: pr.boom * 0.8, life: 2 * this.stats.duration, max: 2 * this.stats.duration,
            tick: 0.5, timer: 0.25, base: pr.puddle, tag: pr.tag, src: pr.src,
          });
          this.fx.push({ kind: 'boom', x: pr.tx, y: pr.ty, r: pr.boom, life: 0.3, max: 0.3, color: '#7cffb2' });
          pr.dead = true;
        }
        continue;
      }
      if (pr.kind === 'hat') {
        pr.spin += dt * 18;
        const sp = Math.hypot(pr.vx, pr.vy);
        pr.traveled += sp * dt;
        if (pr.out && pr.traveled >= pr.range) { pr.out = false; pr.hitSet.clear(); }
        if (!pr.out) {
          const a = Math.atan2(p.y - pr.y, p.x - pr.x);
          pr.vx = Math.cos(a) * 460; pr.vy = Math.sin(a) * 460;
          if (dist2(pr, p) < 400) pr.dead = true;
        }
      } else if (pr.homing) {
        if (!pr.target || pr.target.dead) pr.target = this.nearest(pr.x, pr.y, 420);
        if (pr.target) {
          const want = Math.atan2(pr.target.y - pr.y, pr.target.x - pr.x);
          const cur = Math.atan2(pr.vy, pr.vx);
          const na = cur + clamp(angDiff(cur, want), -pr.homing * dt, pr.homing * dt);
          pr.vx = Math.cos(na) * pr.speed; pr.vy = Math.sin(na) * pr.speed;
        }
        if (pr.spin !== undefined) pr.spin += dt * 20;
      }
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      if (pr.x < -50 || pr.y < -50 || pr.x > ARENA.w + 50 || pr.y > ARENA.h + 50) pr.dead = true;
      if (!pr.noCollide && !pr.dead) {
        const sp = Math.hypot(pr.vx, pr.vy) || 1;
        for (const e of this.queryEnemies(pr.x, pr.y, pr.r)) {
          if (pr.hitSet.has(e.id)) continue;
          pr.hitSet.add(e.id);
          this.hit(e, pr.base, pr.tag, { src: pr.src, knock: pr.knock || 60, kx: pr.vx / sp, ky: pr.vy / sp, extraCrit: pr.extraCrit || 0 });
          if (pr.pierce <= 0) { pr.dead = true; break; }
          pr.pierce--;
        }
      }
      if (pr.life <= 0) pr.dead = true;
    }
    this.projectiles = this.projectiles.filter(pr => !pr.dead);
    if (this.projectiles.length > 600) this.projectiles.splice(0, this.projectiles.length - 600);
  }

  updateAreas(dt) {
    for (const a of this.areas) {
      a.life -= dt;
      if (a.kind === 'wave') {
        a.r = Math.min(a.maxR, a.r + a.grow * dt);
        for (const e of this.queryEnemies(a.x, a.y, a.r)) {
          if (a.hitSet.has(e.id)) continue;
          a.hitSet.add(e.id);
          const an = Math.atan2(e.y - a.y, e.x - a.x);
          this.hit(e, a.base, a.tag, { src: a.src, knock: a.knock, kx: Math.cos(an), ky: Math.sin(an) });
        }
      } else {
        a.timer -= dt;
        if (a.timer <= 0) {
          a.timer += a.tick;
          // poças/fumaças sobrepostas não acumulam no mesmo inimigo
          for (const e of this.queryEnemies(a.x, a.y, a.r)) {
            if ((e.hitCd[a.kind] || 0) > this.time) continue;
            e.hitCd[a.kind] = this.time + a.tick * 0.9;
            this.hit(e, a.base, a.tag, { src: a.src, slow: a.slow ? 0.5 : 0 });
          }
        }
      }
    }
    this.areas = this.areas.filter(a => a.life > 0);
  }

  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.flash -= dt;
      if (e.burn) {
        e.burn.t -= dt;
        this.applyDamage(e, e.burn.dps * dt, false, 'pimenta', true);
        if (e.burn && e.burn.t <= 0) e.burn = null;
        if (e.dead) continue;
      }
      if (e.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.regen * dt);
      let mvx = 0, mvy = 0;
      if (e.dash) {
        e.dash.t -= dt;
        mvx = e.dash.vx; mvy = e.dash.vy;
        if (e.dash.fire) {
          e.dash.fireT -= dt;
          if (e.dash.fireT <= 0) {
            e.dash.fireT = 0.07;
            this.addHazard({ x: e.x, y: e.y, r: 20, dps: e.dash.fire, life: 2.2, delay: 0, kind: 'fire' });
          }
        }
        if (e.dash.t <= 0) {
          const land = e.dash.land;
          e.dash = null;
          if (land) {
            this.fx.push({ kind: 'ring', x: e.x, y: e.y, r: land.r, life: 0.35, max: 0.35, color: '#ddd' });
            if (dist(e, p) < land.r + p.r) this.damagePlayer(land.dmg, e, e.name);
            if (land.ring) bulletRing(this, e, land.ring, 180, 0.5, RNG.range(0, 1), { color: '#ccc' });
            this.shake(6);
          }
        }
      } else if (e.stunT > 0) {
        e.stunT -= dt;
      } else {
        updateEnemyAI(this, e, dt);
        mvx = e.mx; mvy = e.my;
        if (e.slowT > 0) { mvx *= 0.55; mvy *= 0.55; }
      }
      e.slowT = Math.max(0, e.slowT - dt);
      if (mvx) e.face = mvx > 0 ? 1 : -1;
      e.x += (mvx + e.kvx) * dt; e.y += (mvy + e.kvy) * dt;
      const decay = Math.exp(-8 * dt);
      e.kvx *= decay; e.kvy *= decay;
      if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) { e.x = p.x + 600; e.y = p.y; }
      this.clampArena(e);
      if (e.serpent) {
        e.trail.unshift({ x: e.x, y: e.y });
        if (e.trail.length > 90) e.trail.length = 90;
      }

      // contato com o jogador
      if (!(e.dash && e.dash.ghost)) {
        let touching = dist2(e, p) < (e.r + p.r) ** 2;
        if (!touching && e.serpent) {
          for (let i = 8; i < e.trail.length; i += 8) {
            const t = e.trail[i];
            if ((t.x - p.x) ** 2 + (t.y - p.y) ** 2 < (e.r * 0.7 + p.r) ** 2) { touching = true; break; }
          }
        }
        if (touching) {
          if (p.barrier > 0 && p.barrierDmg && (e.hitCd.guarda || 0) <= this.time) {
            e.hitCd.guarda = this.time + 0.5;
            const a = Math.atan2(e.y - p.y, e.x - p.x);
            this.hit(e, p.barrierDmg, 'jiujitsu', { src: 'guarda', knock: 180, kx: Math.cos(a), ky: Math.sin(a) });
          }
          if (this.stats.flags.contactStun && !e.boss && !e.dead && (e.hitCd.cstun || 0) <= this.time) {
            e.hitCd.cstun = this.time + 2;
            e.stunT = Math.max(e.stunT, 0.6 * this.stats.stunMult);
          }
          if (!e.dead && e.stunT <= 0) this.damagePlayer(e.boss ? e.dmg * 0.7 : e.dmg, e, e.name, { iframes: e.boss ? 0.9 : 0.45 });
        }
      }
      // criaturas que ficaram muito longe reaparecem perto
      if (!e.boss && dist2(e, p) > 1350 * 1350) {
        const pt = this.spawnPoint();
        e.x = pt.x; e.y = pt.y;
      }
    }
    // separação entre criaturas
    for (const e of this.enemies) {
      if (e.dead || (e.dash && e.dash.ghost)) continue;
      const near = this.grid.query(e.x, e.y, e.r * 2);
      let n = 0;
      for (const o of near) {
        if (o === e || o.dead) continue;
        const dx = e.x - o.x, dy = e.y - o.y;
        const rr = e.r + o.r, d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 === 0) continue;
        const d = Math.sqrt(d2), push = (rr - d) * 0.5;
        const wE = e.boss ? 0.1 : e.heavy ? 0.3 : 1;
        e.x += dx / d * push * wE; e.y += dy / d * push * wE;
        if (++n > 6) break;
      }
    }
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  updateEnemyBullets(dt) {
    const p = this.player;
    for (const b of this.ebullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.x < 0 || b.y < 0 || b.x > ARENA.w || b.y > ARENA.h) b.life = 0;
      if (b.life > 0 && (b.x - p.x) ** 2 + (b.y - p.y) ** 2 < (b.r + p.r * 0.8) ** 2) {
        if (p.iframes <= 0 && p.dashT <= 0) {
          if (b.slow) p.slowT = Math.max(p.slowT, b.slow);
          this.damagePlayer(b.dmg, null, 'um projétil');
          b.life = 0;
        }
      }
    }
    this.ebullets = this.ebullets.filter(b => b.life > 0);
  }

  updateHazards(dt) {
    const p = this.player;
    p.hazardT -= dt;
    for (const h of this.hazards) {
      h.life -= dt;
      if (h.delay > 0) { h.delay -= dt; continue; }
      if (h.chase) {
        const a = Math.atan2(p.y - h.y, p.x - h.x);
        h.x += Math.cos(a) * h.chase * dt; h.y += Math.sin(a) * h.chase * dt;
      }
      if (h.dps > 0 && p.hazardT <= 0 && (h.x - p.x) ** 2 + (h.y - p.y) ** 2 < (h.r + p.r * 0.5) ** 2) {
        p.hazardT = 0.3;
        this.damagePlayer(h.dps * 0.3, null, h.kind === 'fire' ? 'o fogo' : h.kind === 'poison' ? 'o veneno da Cuca' : 'um redemoinho', { noIframes: true });
      }
    }
    this.hazards = this.hazards.filter(h => h.life > 0);
  }

  updatePickups(dt) {
    const p = this.player, R = this.stats.pickup;
    const vacuum = false;
    let tocarSino = false, abrirBalaio = false, abrirBau = false;
    for (const g of this.pickups) {
      const d2 = dist2(g, p);
      if (vacuum || g.mag || d2 < R * R) {
        g.mag = true;
        g.sp += 1500 * dt;
        const d = Math.sqrt(d2) || 1;
        const step = Math.min(d, (300 + g.sp) * dt);
        g.x += (p.x - g.x) / d * step; g.y += (p.y - g.y) / d * step;
      }
      if (dist2(g, p) < (p.r + 10) ** 2) {
        g.got = true;
        if (g.kind === 'xp') { this.gainXp(g.v); if (!this.headless && RNG.chance(0.3)) this.sfx('xp'); }
        else if (g.kind === 'coin') { this.coins += g.v; this.sfx('coin'); }
        else if (g.kind === 'heal') {
          const h = this.stats.maxHp * g.v;
          p.hp = Math.min(this.stats.maxHp, p.hp + h);
          this.floats.push({ x: p.x, y: p.y - 24, text: '+' + fmt(h), color: '#6aff8a', life: 0.7, max: 0.7 });
          this.sfx('heal');
        }
        else if (g.kind === 'berrante') { for (const o of this.pickups) if (o.kind === 'xp' || o.kind === 'coin') o.mag = true; this.sfx('berimbau'); this.emit('berrante'); }
        else if (g.kind === 'sino') tocarSino = true;
        else if (g.kind === 'balaio') abrirBalaio = true;
        else if (g.kind === 'bau') abrirBau = true;
      }
    }
    this.pickups = this.pickups.filter(g => !g.got);
    if (tocarSino) this.sino();
    if (abrirBalaio) this.balaio();
    if (abrirBau && this.state === 'play') this.openChest();
  }

  updateFx(dt) {
    if (this.headless) { this.fx.length = 0; this.floats.length = 0; return; }
    for (const f of this.fx) f.life -= dt;
    this.fx = this.fx.filter(f => f.life > 0);
    for (const f of this.floats) { f.life -= dt; f.y -= 40 * dt; }
    this.floats = this.floats.filter(f => f.life > 0);
    this.shakeAmt *= Math.exp(-10 * dt);
  }

  // ---------- verificação (usada nos testes) ----------
  validate() {
    const bad = [];
    const chk = (name, v) => { if (!Number.isFinite(v)) bad.push(`${name}=${v}`); };
    const p = this.player;
    chk('player.x', p.x); chk('player.y', p.y); chk('player.hp', p.hp); chk('player.barrier', p.barrier);
    for (const k of ['maxHp', 'speed', 'dmgMult', 'dmgAdd', 'critMult', 'critChance', 'atkSpeed', 'area', 'regen']) chk('stats.' + k, this.stats[k]);
    for (const e of this.enemies) { chk(`enemy(${e.type}).x`, e.x); chk(`enemy(${e.type}).hp`, e.hp); }
    for (const pr of this.projectiles) { chk(`proj(${pr.kind}).x`, pr.x); }
    chk('xp', this.xp); chk('coins', this.coins); chk('totalDamage', this.totalDamage);
    if (p.hp > this.stats.maxHp + 0.001) bad.push('hp > maxHp');
    if (this.golpes.filter(g => !g.hidden).length > MAX_GOLPES) bad.push('golpes demais');
    if (this.encantos.length > MAX_ENCANTOS) bad.push('encantos demais');
    if (this.golpes.some(g => g.level > 5 || g.level < 1)) bad.push('nível de golpe inválido');
    return bad;
  }
}
