'use strict';
// Confere as versões das cartas (comum → lendária): os números escalam certo, nada vira NaN/infinito,
// e a chance de cada versão bate com o esperado.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', 'src');
const files = ['util.js', 'data/cards.js', 'data/enemies.js', 'engine/weapons.js', 'engine/stats.js', 'engine/enemyai.js', 'engine/world.js'];
const src = files.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') +
  '\n;globalThis.__T = { World, DONS, RARITY_POWER, RARITY_ORDER, cardInfo, rollCards, computeStats, donScaledText };';
const ctx = { console, Math, Date, Set, Map, Object, Array, Number, String, JSON };
ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(src, ctx);
const T = ctx.__T;
let bad = 0;
const fail = m => { bad++; console.log('FALHA', m); };
// 1) toda carta, em toda versão, sozinha e empilhada 30x
for (const d of T.DONS) for (const r of T.RARITY_ORDER.slice(T.RARITY_ORDER.indexOf(d.rarity))) {
  const f = T.RARITY_POWER[r] / T.RARITY_POWER[d.rarity];
  const w = new T.World('capoeirista', { headless: true, seed: 3 });
  const n = d.unique ? 1 : 30;
  for (let i = 0; i < n; i++) w.applyCard({ kind: 'don', id: d.id, rarity: r, f });
  const v = w.validate();
  if (v.length) fail(`${d.id} ${r}: ${v.join(', ')}`);
  const info = T.cardInfo({ kind: 'don', id: d.id, rarity: r, f });
  if (!info.desc || /NaN|undefined|Infinity/.test(info.desc)) fail(`${d.id} ${r}: texto ruim "${info.desc}"`);
}
// 2) exemplo do pedido: carta comum de velocidade → lendária vale 12,5×
const g = T.DONS.find(d => d.id === 'guarana');
console.log(`Exemplo — ${g.name}: comum "${g.desc}" | lendária "${T.cardInfo({ kind: 'don', id: g.id, rarity: 'lendario', f: 12.5 }).desc}"`);
const w1 = new T.World('capoeirista', { headless: true, seed: 3 }), sp0 = w1.stats.speed;
w1.applyCard({ kind: 'don', id: 'guarana', rarity: 'lendario', f: 12.5 });
if (!(w1.stats.speed > sp0 * 1.9)) fail(`guaraná lendário não dobrou a velocidade (${sp0} → ${w1.stats.speed})`);
// 3) distribuição das versões em 60 mil cartas sorteadas
const w = new T.World('cangaceiro', { headless: true, seed: 9 });
const count = {}; let total = 0;
for (let i = 0; i < 20000; i++) for (const c of T.rollCards(w, 3, { donsOnly: true })) { count[c.rarity] = (count[c.rarity] || 0) + 1; total++; if (c.f < 1 || !isFinite(c.f)) fail('fator inválido'); }
console.log('Versões sorteadas:', T.RARITY_ORDER.map(r => `${r} ${((count[r] || 0) / total * 100).toFixed(2)}%`).join(' · '));
if (!count.lendario || count.lendario / total > 0.04) fail('chance de lendária fora do esperado');
console.log(bad ? `${bad} falha(s)` : 'Raridades ok.');
process.exitCode = bad ? 1 : 0;
