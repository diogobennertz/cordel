'use strict';
// Teste de estresse dos multiplicadores e das cartas.
// Uso: node test/stress.js
const { loadEngine } = require('./sim.js');
const E = loadEngine();
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log('FALHOU:', msg); } };

// 1) fmt: números grandes, pequenos, infinitos e negativos
for (const [v, want] of [[0, '0'], [999, '999'], [1500, '1.5K'], [2.5e6, '2.5M'], [3e9, '3.0B'], [7e12, '7.0T'], [Infinity, '∞'], [NaN, '0'], [-1500, '-1.5K'], [0.5, '0.5']]) {
  ok(E.fmt(v) === want, `fmt(${v}) = ${E.fmt(v)}, esperado ${want}`);
}
ok(/e15|e16/.test(E.fmt(1.2e15)) || E.fmt(1.2e15).length < 10, `fmt(1.2e15) = ${E.fmt(1.2e15)}`);

// 2) Empilhar centenas de cartas aleatórias em cada classe
for (const cls of Object.keys(E.CLASSES)) {
  for (let seed = 1; seed <= 25; seed++) {
    const w = new E.World(cls, { headless: true, seed: seed * 101 });
    for (let i = 0; i < 400; i++) {
      const offer = E.rollCards(w, 3);
      if (!offer.length) break;
      w.applyCard(offer[Math.floor(Math.random() * offer.length)]);
    }
    // encantos todos que couberem
    for (const en of E.ENCANTOS) w.applyCard({ kind: 'encanto', id: en.id });
    const bad = w.validate();
    ok(!bad.length, `${cls}/${seed} depois de 400 cartas: ${bad.join(', ')}`);
    ok(w.encantos.length <= 6, `${cls}/${seed}: ${w.encantos.length} encantos`);
    const vis = w.golpes.filter(g => !g.hidden).length;
    ok(vis <= 6, `${cls}/${seed}: ${vis} golpes`);
    // um dano de exemplo contra um inimigo comum, um atordoado e um chefe
    const dummy = { hp: 1e300, maxHp: 1e300, stunT: 0, boss: false, elite: false };
    const stunned = { ...dummy, stunT: 5 }, boss = { ...dummy, boss: true };
    w.phaseKills = 1e6; w.runKills = 1e7; w.bossT = 1e6; w.player.moving = true;
    for (const t of [dummy, stunned, boss]) {
      for (let k = 0; k < 50; k++) {
        const r = E.calcDamage(w, 1e6, 'mandinga', t, 0.5);
        ok(Number.isFinite(r.dmg) && r.dmg >= 0 && r.dmg <= 1e100, `${cls}/${seed} calcDamage = ${r.dmg}`);
      }
    }
    // roda 20 segundos de jogo com essa build absurda, cheio de inimigos
    w.input.x = 1; w.input.y = 0.3;
    for (let i = 0; i < 150; i++) w.spawnEnemy('corposeco');
    w.spawnBoss();
    for (let f = 0; f < 600; f++) {
      if (w.state === 'levelup') w.chooseCard(0);
      if (w.state === 'chest') w.chooseChest(0);
      if (w.state === 'shop') w.leaveShop();
      if (w.state === 'victory') w.continueCycle();
      if (w.state === 'dead') break;
      w.update(1 / 30);
      if (f % 30 === 0) { const b = w.validate(); if (b.length) { ok(false, `${cls}/${seed} jogo: ${b.join(', ')}`); break; } }
    }
  }
}

// 3) Fase infinita: muito tempo no mapa — a escala dos inimigos e dos chefes continua finita?
for (const etapa of [1, 5, 10, 20, 40, 80, 150]) {
  const w = new E.World('cangaceiro', { headless: true, seed: 7, mapa: 5 });
  w.time = (etapa - 1) * E.ETAPA_T + 70; w.etapa = etapa - 1; w.phaseIdx = w.mapa.fase + w.etapa;
  const s = w.scaling();
  ok(Number.isFinite(s.hp) && Number.isFinite(s.dmg), `etapa ${etapa}: escala ${s.hp} / ${s.dmg}`);
  const b = w.spawnBoss();
  ok(Number.isFinite(b.maxHp) && Number.isFinite(b.dmg), `etapa ${etapa}: chefe ${b.maxHp}`);
  for (let f = 0; f < 120; f++) w.update(1 / 30);
  ok(!w.validate().length, `etapa ${etapa}: jogo continua válido (${w.validate().join(', ')})`);
  console.log(`etapa ${etapa} (${Math.round(w.time / 60)} min): vida ×${E.fmt(s.hp)}, dano ×${E.fmt(s.dmg)}, chefe ${b.name} ${E.fmt(b.maxHp)}`);
}
// 3b) todos os mapas e de 1 a 5 jogadores: começam, andam e ficam mais difíceis com mais gente
for (let m = 0; m < E.MAPAS.length; m++) {
  let ant = 0;
  for (let n = 1; n <= 5; n++) {
    const w = new E.World('benzedeira', { headless: true, seed: 11, mapa: m, players: n });
    for (let f = 0; f < 150; f++) w.update(1 / 30);
    const s = w.scaling();
    ok(!w.validate().length && s.hp > ant, `${E.MAPAS[m].name} com ${n} jogador(es): escala ${s.hp.toFixed(2)}`);
    ant = s.hp;
  }
}

// 4) Feira no mapa, baús e elementos interativos
{
  const w = new E.World('benzedeira', { headless: true, seed: 3 });
  ok(w.feiraAberta && w.shop && w.state === 'play', 'a Feira começa aberta no mapa');
  w.openShop();
  ok(w.state === 'shop', 'entrar na barraca abre a Feira');
  w.coins = 0;
  ok(!w.buy('card', 0), 'não compra sem dinheiro');
  w.coins = 9999;
  for (const en of E.ENCANTOS.slice(0, 6)) w.applyCard({ kind: 'encanto', id: en.id });
  const free = w.shop.encantos.findIndex(c => !w.encantos.includes(c.id));
  if (free >= 0) ok(!w.buy('encanto', free), 'não compra 7º encanto');
  w.leaveShop();
  ok(w.state === 'play' && !w.feiraAberta, 'sair da Feira volta para o mapa e fecha a barraca até reabastecer');
  w.openChest();
  ok(w.state === 'chest' && w.chest.length === 3, 'baú oferece 3 tesouros');
  w.chooseChest(0);
  ok(w.state === 'play', 'escolher no baú volta para o mapa');
  const potes = w.interativos.filter(i => i.kind === 'pote').length;
  ok(potes === 16 && w.interativos.some(i => i.kind === 'oratorio') && w.interativos.some(i => i.kind === 'bau') && w.interativos.some(i => i.kind === 'feira'), `mapa tem potes (${potes}), oratórios, baús trancados e a barraca`);
  const pt = w.interativos.find(i => i.kind === 'pote'); w.player.x = pt.x; w.player.y = pt.y; w.update(1 / 30);
  ok(w.interativos.filter(i => i.kind === 'pote').length === potes - 1, 'encostar no pote quebra o pote');
  for (const k of ['berrante', 'sino', 'balaio']) w.dropPickup(k, w.player.x, w.player.y, 1);
  for (let i = 0; i < 6; i++) w.spawnEnemy('corposeco');
  w.update(1 / 30); w.update(1 / 30);
  ok(!w.validate().length && w.pickups.every(g => g.kind !== 'sino' && g.kind !== 'balaio' && g.kind !== 'berrante'), 'berrante, sino e balaio funcionam ao pegar');
  const or = w.interativos.find(i => i.kind === 'oratorio'); w.enemies.length = 0; w.player.x = or.x; w.player.y = or.y; w.player.hp = 1;
  for (let f = 0; f < 100; f++) { w.enemies.length = 0; w.update(1 / 30); }
  ok(w.player.bencaoT > 0 && w.player.hp > 1, 'ficar no oratório dá a bênção');
  // chefes acumulam se não forem derrotados, e derrotar os do mapa libera o próximo
  const w2 = new E.World('cangaceiro', { headless: true, seed: 5 });
  let venceu = false;
  w2.spawnBoss(); w2.spawnBoss();
  ok(w2.bossesAlive() === 2, 'dois chefes podem ficar vivos ao mesmo tempo');
  for (const e of w2.enemies.filter(x => x.boss)) { w2.applyDamage(e, e.hp + 1, false, 'teste'); }
  venceu = w2.events.some(ev => ev.type === 'mapaVencido');
  ok(w2.phasesCleared === 2 && venceu && w2.pickups.filter(g => g.kind === 'bau').length === 2, 'derrotar os 2 chefes da Mata libera o próximo mapa e deixa 2 baús no chão');
}

console.log(fails ? `${fails} falha(s)` : 'Todos os testes de estresse passaram.');
process.exitCode = fails ? 1 : 0;
