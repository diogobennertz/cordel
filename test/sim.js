'use strict';
// Simulador sem tela: um bot joga várias corridas para achar bugs e medir o equilíbrio.
// Uso: node test/sim.js [corridas por classe] [estratégia: foco|aleatorio] [ciclos máx]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'src/util.js', 'src/data/cards.js', 'src/data/enemies.js', 'src/engine/weapons.js',
  'src/engine/stats.js', 'src/engine/enemyai.js', 'src/engine/world.js',
];
function loadEngine() {
  const src = FILES.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') +
    '\n;globalThis.__E = { World, RNG, CLASSES, DONS, ENCANTOS, GOLPES, GOLPE_IDS, PHASES, NUM_PHASES, computeStats, calcDamage, rollCards, fmt, TAGS, ARENA, cardInfo, META_UPS, ATIVOS, DIFF, MAPAS, ETAPA_T };';
  const ctx = { console, Math, Date, Set, Map, Object, Array, Number, String, JSON, globalThis: null };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: 'engine.js' });
  return ctx.__E;
}
const E = loadEngine();

// ---------- bot ----------
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
// SKILL: 1 = reação rápida e boa leitura; 0 = jogador iniciante. Padrão 0.5 (jogador médio).
const SKILL = +(process.env.SKILL || 0.5);
function botInput(w) {
  const p = w.player;
  w._botT = (w._botT || 0) - 1 / 30;
  if (w._botT > 0) return; // tempo de reação
  w._botT = 0.08 + (1 - SKILL) * 0.3;
  const sense = 140 + SKILL * 160;
  let vx = 0, vy = 0;
  for (const e of w.enemies) {
    const dx = p.x - e.x, dy = p.y - e.y, d2 = dx * dx + dy * dy;
    if (d2 > sense * sense) continue;
    const d = Math.sqrt(d2) || 1;
    const k = (e.boss ? 3 : e.elite ? 2 : 1) * 4000 / (d2 + 400);
    vx += dx / d * k; vy += dy / d * k;
  }
  for (const b of w.ebullets) {
    const dx = p.x - b.x, dy = p.y - b.y, d2 = dx * dx + dy * dy;
    if (d2 > (60 + SKILL * 80) ** 2 || Math.random() > 0.3 + SKILL * 0.7) continue;
    const d = Math.sqrt(d2) || 1;
    vx += dx / d * 2500 / (d2 + 200); vy += dy / d * 2500 / (d2 + 200);
  }
  for (const h of w.hazards) {
    if (h.dps <= 0 && h.kind !== 'mark') continue;
    const dx = p.x - h.x, dy = p.y - h.y, d2 = dx * dx + dy * dy;
    const R = h.r + 50;
    if (d2 > R * R) continue;
    const d = Math.sqrt(d2) || 1;
    vx += dx / d * 3; vy += dy / d * 3;
  }
  // encara o chefe (corpo a corpo chega perto; à distância mantém ~220px)
  const melee = w.classId !== 'benzedeira';
  const hpRatio = p.hp / w.stats.maxHp;
  const target = w.boss && !w.boss.dead ? w.boss
    : (melee && hpRatio > 0.4 ? w.enemies.reduce((b, e) => (!b || (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (b.x - p.x) ** 2 + (b.y - p.y) ** 2 ? e : b), null) : null);
  if (target) {
    const dx = target.x - p.x, dy = target.y - p.y, d = Math.hypot(dx, dy) || 1;
    const want = melee ? target.r + 45 : 230;
    const k = clampN((d - want) / 80, -1, 1) * (hpRatio > 0.35 ? (target.boss ? 1.4 : 0.9) : 0.3);
    vx += dx / d * k; vy += dy / d * k;
  }
  // gemas de XP quando está tranquilo
  const danger = Math.hypot(vx, vy);
  if (danger < 0.6) {
    let best = null, bd = 400 * 400;
    for (const g of w.pickups) { const d = (g.x - p.x) ** 2 + (g.y - p.y) ** 2; if (d < bd) { bd = d; best = g; } }
    if (best) { const d = Math.sqrt(bd) || 1; vx += (best.x - p.x) / d * 0.8; vy += (best.y - p.y) / d * 0.8; }
  }
  // baú do chefe e balaio no chão; barraca da Feira aberta; baú trancado que dá para pagar: vai buscar quando dá
  if (danger < 1.1) {
    let alvo = null, bd = 950 * 950;
    for (const g of w.pickups) if (g.kind === 'bau' || g.kind === 'balaio') { const d = (g.x - p.x) ** 2 + (g.y - p.y) ** 2; if (d < bd) { bd = d; alvo = g; } }
    if (!alvo && !w.bossSpawned) {
      if (w.feiraAberta && w.coins >= 12) alvo = w.interativos.find(i => i.kind === 'feira');
      else if (w.coins >= w.precoBau()) { let b2 = 800 * 800; for (const it of w.interativos) if (it.kind === 'bau') { const d = (it.x - p.x) ** 2 + (it.y - p.y) ** 2; if (d < b2) { b2 = d; alvo = it; } } }
    }
    if (alvo) { const d = Math.hypot(alvo.x - p.x, alvo.y - p.y) || 1; vx += (alvo.x - p.x) / d * 1.3; vy += (alvo.y - p.y) / d * 1.3; }
  }
  // fica longe das bordas
  const cx = E.ARENA.w / 2 - p.x, cy = E.ARENA.h / 2 - p.y;
  const edge = Math.max(Math.abs(cx), Math.abs(cy)) / (E.ARENA.w / 2);
  if (edge > 0.6) { vx += cx / 1000 * edge * 3; vy += cy / 1000 * edge * 3; }
  // desvia em círculo (orbita) para não ficar parado
  vx += -Math.sin(w.time * 0.4) * 0.15; vy += Math.cos(w.time * 0.4) * 0.15;
  const l = Math.hypot(vx, vy) || 1;
  w.input.x = vx / l; w.input.y = vy / l;
  const close = w.enemies.some(e => (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (e.r + 30) ** 2);
  w.input.dash = close && p.dashCd <= 0;
  // especial em área: com bastante gente perto ou chefe por perto
  let near = 0;
  for (const e of w.enemies) if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 170 * 170) near += e.boss ? 5 : e.elite ? 3 : 1;
  if (w.specialT <= 0 && near >= 4) w.input.special = true;
  if (w.ultT <= 0 && near >= 6) w.input.ult = true;
  if (w.ativo && w.ativo.t <= 0) {
    if (w.ativo.id === 'cha') { if (hpRatio < 0.55) w.input.item = true; }
    else if (near >= 5 || (hpRatio < 0.4 && near >= 2)) w.input.item = true;
  }
}

// META: quantos níveis de treino permanente o "jogador" já comprou (sempre o mais barato primeiro).
// META=0 → primeira corrida da vida; META=full → tudo comprado.
function metaFor(n) {
  const meta = {};
  if (n === 'full') { for (const m of E.META_UPS) meta[m.id] = m.max; return meta; }
  for (let i = 0; i < +n; i++) {
    let best = null;
    for (const m of E.META_UPS) {
      const lv = meta[m.id] || 0;
      if (lv >= m.max) continue;
      if (!best || m.cost(lv) < best.cost((meta[best.id] || 0))) best = m;
    }
    if (!best) break;
    meta[best.id] = (meta[best.id] || 0) + 1;
  }
  return meta;
}
const META = metaFor(process.env.META || 0);
if (process.env.DIFF) { const [a, b, c, d, l] = process.env.DIFF.split(',').map(Number); Object.assign(E.DIFF, { hp: a, dmg: b, bossHp: c, bossDmg: d, late: l }); }

function scoreCard(w, c, strategy) {
  if (strategy === 'aleatorio') return Math.random();
  const cls = E.CLASSES[w.classId];
  const info = E.cardInfo(c);
  let s = 1;
  if (c.kind === 'golpe') s += c.level > 1 ? 3 + c.level : (info.tag === cls.tag ? 2.5 : 1.2);
  if (info.tag === cls.tag) s += 2;
  if (info.tag && w.tagCounts[info.tag] >= 1) s += 1;
  s += { comum: 0, incomum: 0.5, raro: 1.5, epico: 2.5, lendario: 4, encanto: 2, ativo: 2.5 }[info.rarity] || 0;
  if (w.player.hp < w.stats.maxHp * 0.5 && /vida|regenera/.test(info.desc)) s += 2;
  return s + Math.random();
}

function botDecisions(w, strategy) {
  if (w.state === 'levelup') {
    const scores = w.offer.map(c => scoreCard(w, c, strategy));
    const best = scores.indexOf(Math.max(...scores));
    if (scores[best] < 2.2 && w.rerolls > 0 && strategy !== 'aleatorio') w.rerollOffer();
    else w.chooseCard(best);
  } else if (w.state === 'chest') {
    const scores = w.chest.map(c => scoreCard(w, c, strategy));
    w.chooseChest(scores.indexOf(Math.max(...scores)));
  } else if (w.state === 'shop') {
    if (w.player.hp < w.stats.maxHp * 0.6) w.buy('heal');
    if (!w.ativo) w.buy('ativo');
    const items = [...w.shop.cards.map((c, i) => ['card', i, c]), ...w.shop.encantos.map((c, i) => ['encanto', i, c])]
      .filter(x => !x[2].sold).sort((a, b) => scoreCard(w, b[2], strategy) - scoreCard(w, a[2], strategy));
    for (const [k, i] of items) w.buy(k, i);
    if (w.coins > 25) w.shopReroll();
    const items2 = [...w.shop.cards.map((c, i) => ['card', i, c])].filter(x => !x[2].sold);
    for (const [k, i] of items2) if (w.coins > 15) w.buy(k, i);
    w.leaveShop();
  }
}

function runOne(classId, seed, strategy, maxMin = 15, maxTime = maxMin * 60) {
  const w = new E.World(classId, { headless: true, seed, meta: META, mapa: +(process.env.MAPA || 0), players: +(process.env.JOGADORES || 1) });
  const dt = 1 / 30;
  const log = { classId, seed, phases: [], errors: [], frames: 0 };
  let lastPhase = -2, phaseStartT = 0, simT = 0, worst = 0;
  const t0 = Date.now();
  try {
    while (simT < maxTime) {
      if (w.state === 'dead') break;
      if (w.state === 'play' || w.state === 'clearing') {
        botInput(w);
        const f0 = process.hrtime.bigint();
        w.update(dt);
        const ms = Number(process.hrtime.bigint() - f0) / 1e6;
        if (ms > worst) worst = ms;
        const hr = w.player.hp / w.stats.maxHp; if (hr < (log.minHp ?? 1)) log.minHp = hr;
        simT += dt; log.frames++;
        if (log.frames % 15 === 0) {
          const bad = w.validate();
          if (bad.length) { log.errors.push(`[fase ${w.phaseIdx + 1} c${w.cycle}] ${bad.join(', ')}`); break; }
        }
      } else botDecisions(w, strategy);
      const key = w.cycle * 100 + w.phaseIdx;
      if (key !== lastPhase && w.state === 'play') {
        if (lastPhase !== -2) log.phases.push({ t: simT - phaseStartT });
        lastPhase = key; phaseStartT = simT;
      }
      if (w.events.length > 1000) w.events.length = 0;
    }
  } catch (err) {
    log.errors.push(`EXCEÇÃO [fase ${w.phaseIdx + 1}]: ${err.stack.split('\n').slice(0, 4).join(' | ')}`);
  }
  log.state = w.state; log.phase = w.phaseIdx + 1; log.cycle = w.cycle; log.level = w.level;
  log.time = w.time; log.bosses = w.phasesCleared; log.venceu = w.phasesCleared >= w.mapa.chefes; log.etapa = w.etapa + 1;
  log.patacas = w.patacas(); log.cause = w.deathCause; log.simT = simT; log.realMs = Date.now() - t0; log.worstFrameMs = worst;
  log.dmg = w.totalDamage; log.taken = w.damageTaken; log.kills = w.runKills; log.dons = w.dons.length; log.encantos = w.encantos.slice();
  log.golpes = w.golpes.map(g => `${g.id}${g.level}`).join(' ');
  log.tiers = Object.entries(w.tagTiers).filter(([, v]) => v).map(([k, v]) => `${k}${v}`).join(' ');
  log.dmgMult = w.stats.dmgMult; log.maxHp = w.stats.maxHp; log.cards = w.dons.length + w.golpes.reduce((a, g) => a + g.level, 0);
  log.topSrc = Object.entries(w.dmgBySrc).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}:${E.fmt(v)}`).join(' ');
  return log;
}

if (require.main === module) {
  const N = +(process.argv[2] || 6);
  const strategy = process.argv[3] || 'foco';
  const maxMin = +(process.argv[4] || 15); // minutos de jogo simulados por corrida, no máximo
  const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const summary = {};
  let errors = 0;
  for (const cls of Object.keys(E.CLASSES)) {
    const runs = [];
    for (let i = 0; i < N; i++) runs.push(runOne(cls, 1000 + i * 7919, strategy, maxMin));
    for (const r of runs) {
      for (const e of r.errors) { errors++; console.log(`ERRO ${cls} seed=${r.seed}: ${e}`); }
    }
    const tempos = runs.map(r => r.time).sort((a, b) => a - b);
    summary[cls] = {
      tempo_mediano: mmss(tempos[Math.floor(tempos.length / 2)]),
      tempos: tempos.map(mmss).join(' '),
      chefes: (runs.reduce((a, r) => a + r.bosses, 0) / runs.length).toFixed(1),
      venceu_mapa: runs.filter(r => r.venceu).length,
      morreu: runs.filter(r => r.state === 'dead').length,
      nivel: (runs.reduce((a, r) => a + r.level, 0) / runs.length).toFixed(1),
      patacas: (runs.reduce((a, r) => a + r.patacas, 0) / runs.length).toFixed(0),
      pior_frame_ms: Math.max(...runs.map(r => r.worstFrameMs)).toFixed(1),
      causas: [...new Set(runs.map(r => r.cause).filter(Boolean))].slice(0, 4).join(' | '),
    };
    if (process.env.VERBOSE) for (const r of runs) console.log(cls, r.seed, mmss(r.time), `chefes${r.bosses}`, `nv${r.level}`, `cartas${r.cards}`, r.golpes, '|', r.tiers, '|', r.topSrc, '| morte:', r.cause, `| vidaMin ${((r.minHp ?? 1) * 100).toFixed(0)}% dano recebido ${E.fmt(r.taken)}`, '| tempo de fase:', r.phases.map(p => p.t.toFixed(0)).join(','));
  }
  console.table(summary);
  console.log(errors ? `${errors} erro(s) encontrados` : 'Nenhum erro encontrado.');
  process.exitCode = errors ? 1 : 0;
}
module.exports = { loadEngine, runOne, E, metaFor };
