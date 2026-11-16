'use strict';
// Verifica que as quedas do Jiu-Jitsu são investidas de verdade (o boneco se desloca até o alvo)
// e que especial e itens ativos funcionam para todas as classes.
const { E } = require('./sim.js');
let bad = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FALHA') + ' ' + msg); if (!ok) bad++; };
for (const id of ['queda', 'kimura', 'mataleao']) {
  const w = new E.World('jiujitsu', { headless: true, seed: 7 });
  w.golpes = [{ id, level: 1, t: 0.05, state: {} }];
  E.computeStats(w);
  w.enemies.length = 0;
  const p = w.player, e = w.spawnEnemy('mapinguari');
  e.x = p.x + 150; e.y = p.y; e.speed = 0; e.hp = e.maxHp = 1e6; e.dmg = 0;
  const x0 = p.x; let lunged = false;
  for (let i = 0; i < 40; i++) { w.update(1 / 60); if (p.lunge) lunged = true; }
  const gap = Math.hypot(e.x - p.x, e.y - p.y) - e.r - p.r;
  check(lunged && p.x - x0 > 60 && gap < 30, `${id}: investiu ${(p.x - x0).toFixed(0)} px, parou a ${gap.toFixed(0)} px do alvo, causou ${E.fmt(w.dmgBySrc[id] || 0)}`);
  check((w.dmgBySrc[id] || 0) > 0, `${id}: acertou depois da investida`);
}
for (const cls of Object.keys(E.CLASSES)) {
  const w = new E.World(cls, { headless: true, seed: 11 });
  w.golpes = []; w.enemies.length = 0;
  const p = w.player;
  for (let i = 0; i < 8; i++) { const e = w.spawnEnemy('corposeco'); e.x = p.x + Math.cos(i) * 90; e.y = p.y + Math.sin(i) * 90; e.speed = 0; e.dmg = 0; e.hp = e.maxHp = 1e6; }
  w.update(1 / 60); // monta a grade de colisão antes de apertar a tecla
  w.specialT = 0; w.input.special = true;
  for (let i = 0; i < 120; i++) w.update(1 / 60);
  check((w.dmgBySrc.especial || 0) > 0 && w.specialT > 0, `${cls}: especial em área causou ${E.fmt(w.dmgBySrc.especial || 0)} e entrou em recarga`);
}
for (const cls of Object.keys(E.CLASSES)) {
  const w = new E.World(cls, { headless: true, seed: 17 });
  w.golpes = []; w.enemies.length = 0;
  const p = w.player;
  for (let i = 0; i < 8; i++) { const e = w.spawnEnemy('corposeco'); e.x = p.x + Math.cos(i) * 90; e.y = p.y + Math.sin(i) * 90; e.speed = 0; e.dmg = 0; e.hp = e.maxHp = 1e6; }
  w.update(1 / 60);
  check(w.ultT > 0 && !w.useUltimate(), `${cls}: ultimate começa em recarga e não dispara antes da hora`);
  w.ultT = 0; w.input.ult = true;
  for (let i = 0; i < 360; i++) w.update(1 / 60);
  check((w.dmgBySrc.ultimate || 0) > (w.dmgBySrc.especial || 0) && w.ultT > 40 && !w.validate().length, `${cls}: ultimate causou ${E.fmt(w.dmgBySrc.ultimate || 0)} e entrou em recarga longa`);
}
for (const a of E.ATIVOS) {
  const w = new E.World('cangaceiro', { headless: true, seed: 13 });
  w.golpes = []; w.enemies.length = 0;
  const p = w.player; p.hp = w.stats.maxHp * 0.5;
  for (let i = 0; i < 8; i++) { const e = w.spawnEnemy('corposeco'); e.x = p.x + Math.cos(i) * 90; e.y = p.y + Math.sin(i) * 90; e.speed = 0; e.dmg = 0; e.hp = e.maxHp = 1e6; }
  w.update(1 / 60);
  w.ativo = { id: a.id, t: 0 }; w.input.item = true;
  const hp0 = p.hp;
  for (let i = 0; i < 90; i++) w.update(1 / 60);
  const did = (w.dmgBySrc[a.id] || 0) > 0 || p.hp > hp0 + 5 || p.buffAtkT > 0;
  check(did && w.ativo.t > 0 && !w.validate().length, `item ${a.name}: fez efeito e entrou em recarga`);
}
console.log(bad ? `${bad} falha(s)` : 'Investidas, especiais e itens funcionando.');
process.exitCode = bad ? 1 : 0;
