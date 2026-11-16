'use strict';
// Gera a dica (tooltip) de TODAS as cartas, golpes em todos os níveis, encantos e itens ativos,
// em builds vazias e cheias, e confere que nada quebra nem altera a vida do jogador.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', 'src');
const files = ['util.js', 'data/cards.js', 'data/enemies.js', 'engine/weapons.js', 'engine/stats.js', 'engine/enemyai.js', 'engine/world.js', 'ui/tooltip.js'];
const src = files.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') +
  '\n;const esc = s => String(s);\n;globalThis.__T = { World, RNG, CLASSES, DONS, ENCANTOS, GOLPE_IDS, ATIVOS, cardTipHTML, ownedGolpeTipHTML, rollCards, computeStats };';
const ctx = { console, Math, Date, Set, Map, Object, Array, Number, String, JSON, document: {} };
ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(src, ctx);
const T = ctx.__T;
let n = 0, bad = 0;
for (const cls of Object.keys(T.CLASSES)) for (const full of [false, true]) {
  const w = new T.World(cls, { headless: true, seed: 5 });
  if (full) { for (let i = 0; i < 60; i++) { const o = T.rollCards(w, 3); if (o[0]) w.applyCard(o[0]); } w.ativo = { id: 'fogos', t: 0 }; }
  w.player.hp = w.stats.maxHp * 0.4;
  const hp0 = w.player.hp, dons0 = w.dons.length, max0 = w.stats.maxHp;
  const cards = [
    ...T.DONS.map(d => ({ kind: 'don', id: d.id, rarity: d.rarity })),
    ...T.ENCANTOS.map(e => ({ kind: 'encanto', id: e.id })),
    ...T.ATIVOS.map(a => ({ kind: 'ativo', id: a.id })),
    ...T.GOLPE_IDS.flatMap(id => [1, 2, 3, 4, 5].map(level => ({ kind: 'golpe', id, level, rarity: 'comum' }))),
  ];
  for (const c of cards) {
    try { const h = T.cardTipHTML(w, c); n++; if (!h || /NaN|undefined|Infinity/.test(h)) { bad++; console.log('TEXTO RUIM', cls, c.kind, c.id, c.level || ''); } }
    catch (e) { bad++; console.log('ERRO', cls, c.kind, c.id, c.level || '', e.message); }
  }
  for (const g of w.golpes) { try { T.ownedGolpeTipHTML(w, g); n++; } catch (e) { bad++; console.log('ERRO golpe', g.id, e.message); } }
  if (w.player.hp !== hp0 || w.dons.length !== dons0 || w.stats.maxHp !== max0) { bad++; console.log('A DICA ALTEROU O JOGO', cls); }
}
console.log(bad ? `${bad} problema(s) em ${n} dicas` : `${n} dicas geradas sem erro e sem alterar o jogo.`);
process.exitCode = bad ? 1 : 0;
