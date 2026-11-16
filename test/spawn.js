'use strict';
// Verifica que nenhum inimigo nasce ou se teletransporta colado no jogador.
// Uso: node test/spawn.js [corridas por classe]
const { runOne, E } = require('./sim.js');
const P = E.World.prototype;
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const res = { nasce: { n: 0, min: Infinity, perto: 0 }, teleporte: { n: 0, min: Infinity, perto: 0 } };
const MIN = 100; // bem mais que o raio de contato (jogador 14 + inimigo até ~50)
const origSpawn = P.spawnEnemy;
P.spawnEnemy = function (...a) {
  const e = origSpawn.apply(this, a);
  const dd = d(e, this.player) - e.r;
  res.nasce.n++; res.nasce.min = Math.min(res.nasce.min, dd); if (dd < MIN) res.nasce.perto++;
  return e;
};
const origUpd = P.updateEnemies;
P.updateEnemies = function (dt) {
  const before = new Map(this.enemies.map(e => [e, { x: e.x, y: e.y }]));
  origUpd.call(this, dt);
  for (const e of this.enemies) {
    const b = before.get(e);
    if (!b || e.dash || e.boss) continue; // investidas/saltos de chefe são ataques telegrafados
    if (d(b, e) > 60) {
      const dd = d(e, this.player) - e.r;
      res.teleporte.n++; res.teleporte.min = Math.min(res.teleporte.min, dd); if (dd < MIN) res.teleporte.perto++;
    }
  }
};
const N = +(process.argv[2] || 4);
for (const c of Object.keys(E.CLASSES)) for (let s = 1; s <= N; s++) runOne(c, 9000 + s, 'foco', 2);
for (const k in res) res[k].min = res[k].min.toFixed(0);
console.table(res);
const bad = res.nasce.perto + res.teleporte.perto;
console.log(bad ? `${bad} nascimento(s)/teleporte(s) perto demais do jogador` : 'Nenhum bicho nasceu colado no jogador.');
process.exitCode = bad ? 1 : 0;
