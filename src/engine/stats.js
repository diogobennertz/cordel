'use strict';
// ===== Atributos, sinergias, fórmula de dano e sorteio de cartas =====

const DMG_CAP = 1e100;

function countTags(w, s) {
  const counts = { capoeira: 0, jiujitsu: 0, mandinga: 0, cangaco: 0, raiz: 0 };
  for (const id of w.dons) { const t = DON_BY_ID[id].tag; if (t) counts[t]++; }
  for (const g of w.golpes) {
    const t = GOLPES[g.id].tag;
    if (t) counts[t] += g.level >= 5 ? 2 : 1; // golpe no nível máximo conta como 2
  }
  for (const t in s.tagCountBonus) counts[t] = (counts[t] || 0) + s.tagCountBonus[t];
  return counts;
}

// ----- versões melhores das cartas (incomum → lendária) -----
// Descobre o que a carta faz aplicando-a em atributos de teste: somas são escaladas direto,
// multiplicadores (×1,2) escalam só a parte acima de 1, e efeitos especiais (flags) ficam iguais.
function donEffects(d) {
  if (d._fx) return d._fx;
  const a0 = baseStats(), a1 = baseStats(), b0 = baseStats(), b1 = baseStats();
  for (const k in b0) if (typeof b0[k] === 'number') { b0[k] += 1; b1[k] += 1; }
  d.apply(a1); d.apply(b1);
  const fx = [];
  for (const k in a0) {
    if (typeof a0[k] === 'number') {
      const da = a1[k] - a0[k], db = b1[k] - b0[k];
      if (Math.abs(da) < 1e-9 && Math.abs(db) < 1e-9) continue;
      if (Math.abs(da - db) < 1e-9) fx.push([k, null, 'add', da]);
      else fx.push([k, null, 'mul', a1[k] / a0[k]]);
    } else if (k === 'flags') { for (const f in a1.flags) fx.push(['flags', f, 'flag', a1.flags[f]]); }
    else for (const t in a1[k]) fx.push([k, t, k === 'tagMult' ? 'mul' : 'add', a1[k][t]]);
  }
  return (d._fx = fx);
}
const INT_STATS = { projectiles: 1, options: 1, pierce: 1, tagCountBonus: 1 };
function applyDon(s, d, f) {
  if (!f || f === 1) { d.apply(s); return; }
  for (const [k, t, kind, v] of donEffects(d)) {
    if (kind === 'flag') s.flags[t] = v;
    else if (t == null) {
      if (kind === 'mul') s[k] *= 1 + (v - 1) * f;
      else s[k] += INT_STATS[k] ? Math.round(v * f) : v * f;
    } else if (kind === 'mul') s[k][t] = (s[k][t] || 1) * (1 + (v - 1) * f);
    else s[k][t] = (s[k][t] || 0) + (INT_STATS[k] ? Math.round(v * f) : v * f);
  }
}
// texto dos números de uma carta em versão melhor
const FX_LABEL = {
  maxHp: ['de vida máxima', 0], hpPct: ['de vida máxima', 1], regen: ['de regeneração por segundo', 0], armor: ['de redução de dano', 1],
  dodge: ['de esquiva', 1], speed: ['de velocidade', 0], speedPct: ['de velocidade', 1], dmgAdd: ['de dano', 1], dmgMult: ['de dano', 2],
  critChance: ['de chance de crítico', 1], critMult: ['de dano crítico', 1], atkSpeed: ['de velocidade de ataque', 1], area: ['de área', 1],
  projectiles: ['projétil(eis)', 0], duration: ['de duração', 1], pierce: ['de perfuração', 0], pickup: ['de alcance de coleta', 0],
  luck: ['de sorte', 1], lifesteal: ['de roubo de vida', 1], thorns: ['de espinhos', 1], coinMult: ['de moedas', 1], xpMult: ['de experiência', 1],
  options: ['opção(ões) de carta', 0], nullify: ['de chance de anular dano', 1], eliteMult: ['de dano em elites e chefes', 1],
  stunMult: ['de duração de atordoamento', 1], stunnedAdd: ['de dano em atordoados', 1], stunnedMult: ['de dano em atordoados', 2],
  tagAdd: ['de dano de %', 1], tagMult: ['de dano de %', 2], tagAtk: ['de velocidade de ataque de %', 1], tagArea: ['de área de %', 1],
  tagCountBonus: ['carta(s) de % nas sinergias', 0],
};
function donScaledText(d, f) {
  const num = v => (Math.round(v * 100) / 100).toString().replace('.', ',');
  const parts = [];
  let special = false;
  for (const [k, t, kind, v] of donEffects(d)) {
    if (kind === 'flag') { special = true; continue; }
    const L = FX_LABEL[k]; if (!L) continue;
    const label = L[0].replace('%', t && TAGS[t] ? TAGS[t].name : '');
    if (kind === 'mul') parts.push(`×${num(1 + (v - 1) * f)} ${label}`);
    else {
      const val = INT_STATS[k] ? Math.round(v * f) : v * f;
      parts.push(L[1] === 1 ? `${val < 0 ? '' : '+'}${Math.round(val * 100)}% ${label}` : `${val < 0 ? '' : '+'}${num(val)} ${label}`);
    }
  }
  return { text: parts.join(', '), special };
}
// sorteia a versão da carta: nunca abaixo da raridade base dela
function rollQuality(w, base) {
  const luck = Math.max(0, w.stats.luck || 0), k = { comum: 0, incomum: 1, raro: 1.5, epico: 2, lendario: 2.5 };
  const q = RNG.weighted(RARITY_ORDER.map(r => [r, QUALITY_ODDS[r] * (1 + luck * k[r])]));
  return RARITY_ORDER.indexOf(q) > RARITY_ORDER.indexOf(base) ? q : base;
}

function computeStats(w) {
  const s = baseStats();
  const cls = CLASSES[w.classId];
  s.maxHp = cls.base.maxHp;
  s.speed = cls.base.speed;
  s.dodge += cls.base.dodge || 0;
  s.armor += cls.base.armor || 0;
  s.regen += cls.base.regen || 0;
  if (cls.base.critChance) s.critChance = cls.base.critChance;
  s.lifesteal += cls.base.lifesteal || 0;

  // vantagem própria de cada personagem: vale mais a pena seguir a build dele
  if (w.classId === 'capoeirista') { addTag(s, 'capoeira', 'tagAtk', 0.20); addTag(s, 'capoeira', 'tagAdd', 0.10); }
  else if (w.classId === 'benzedeira') addTag(s, 'mandinga', 'tagArea', 0.20);
  else if (w.classId === 'cangaceiro') {
    addTag(s, 'cangaco', 'tagAdd', BIOMES[w.mapa ? w.mapa.biome : 'mata'].sol ? 0.30 : 0.10);
  } else if (w.classId === 'jiujitsu') {
    const b = beltIndex(w.level || 1);
    addTag(s, 'jiujitsu', 'tagAdd', 0.06 * b); s.maxHp += 6 * b; s.armor += 0.01 * b;
    if (b >= 4) mulTag(s, 'jiujitsu', 1.2);
  }

  // treino permanente (evolução entre corridas)
  const meta = w.meta || {};
  for (const id in meta) if (META_BY_ID[id] && meta[id] > 0) META_BY_ID[id].apply(s, Math.min(META_BY_ID[id].max, meta[id]));

  for (let i = 0; i < w.dons.length; i++) applyDon(s, DON_BY_ID[w.dons[i]], w.donF ? w.donF[i] : 1);
  for (const id of w.encantos) ENCANTO_BY_ID[id].apply(s);

  const counts = countTags(w, s);
  const tiers = {};
  for (const t in TAGS) tiers[t] = TAG_TIERS.filter(n => counts[t] >= n).length;

  // bônus das sinergias
  if (tiers.capoeira >= 1) { s.speedPct += 0.15; s.dodge += 0.06; }
  if (tiers.capoeira >= 2) s.flags.auMeiaLua = true;
  if (tiers.capoeira >= 3) s.flags.ginga = true;
  if (tiers.jiujitsu >= 1) s.armor += 0.12;
  if (tiers.jiujitsu >= 2) s.flags.contactStun = true;
  if (tiers.jiujitsu >= 3) s.flags.finaliza = true;
  if (tiers.mandinga >= 1) { addTag(s, 'mandinga', 'tagAdd', 0.15); s.area += 0.10; }
  if (tiers.mandinga >= 2) { s.projectiles += 1; s.flags.fatuoOnKill = true; }
  if (tiers.mandinga >= 3) { mulTag(s, 'mandinga', 1.6); addTag(s, 'mandinga', 'tagArea', 0.30); }
  if (tiers.cangaco >= 1) s.dmgAdd += 0.20;
  if (tiers.cangaco >= 2) { s.critChance += 0.15; s.critMult += 0.5; }
  if (tiers.cangaco >= 3) s.flags.cangacoKills = true;
  if (tiers.raiz >= 1) s.regen += 1.5;
  if (tiers.raiz >= 2) s.hpPct += 0.25;
  if (tiers.raiz >= 3) s.flags.revive = true;

  if (s.flags.carnaval) {
    const active = Object.values(tiers).filter(t => t >= 1).length;
    s.dmgMult *= Math.pow(1.15, active);
  }

  // limites — impedem números absurdos, NaN e Infinity
  s.maxHp = Math.round(clamp(finite(s.maxHp * (1 + s.hpPct), 100), 1, 1e7));
  s.speed = clamp(finite(s.speed * (1 + s.speedPct), 210), 80, 520);
  s.dodge = clamp(finite(s.dodge), 0, 0.45);
  s.options = clamp(Math.round(finite(s.options, 3)), 1, 5);
  s.armor = clamp(finite(s.armor), 0, 0.55);
  s.nullify = clamp(finite(s.nullify), 0, 0.25);
  s.critChance = clamp(finite(s.critChance), 0, 1);
  s.critMult = clamp(finite(s.critMult, 1.5), 1, 1e4);
  s.dmgMult = clamp(finite(s.dmgMult, 1), 0, 1e9);
  s.dmgAdd = clamp(finite(s.dmgAdd), -0.9, 1e6);
  for (const t in s.tagMult) s.tagMult[t] = clamp(finite(s.tagMult[t], 1), 0, 1e9);
  for (const t in s.tagAdd) s.tagAdd[t] = clamp(finite(s.tagAdd[t]), -0.9, 1e6);
  s.atkSpeed = clamp(finite(s.atkSpeed, 1), 0.2, 8);
  s.area = clamp(finite(s.area, 1), 0.3, 4);
  s.projectiles = clamp(Math.floor(finite(s.projectiles)), 0, 6);
  s.pierce = clamp(Math.floor(finite(s.pierce)), 0, 20);
  s.duration = clamp(finite(s.duration, 1), 0.3, 2.5);
  s.regen = clamp(finite(s.regen), 0, 1e6);
  s.thorns = clamp(finite(s.thorns), 0, 50);
  s.lifesteal = clamp(finite(s.lifesteal), 0, 0.25);
  s.luck = clamp(finite(s.luck), 0, 10);
  s.pickup = clamp(finite(s.pickup, 95), 40, 600);
  s.options = clamp(s.options, 3, 5);
  s.stunMult = clamp(finite(s.stunMult, 1), 0.2, 4);
  s.stunnedMult = clamp(finite(s.stunnedMult, 1), 1, 1e6);

  const prevMax = w.stats ? w.stats.maxHp : s.maxHp;
  w.stats = s;
  w.tagCounts = counts;
  w.tagTiers = tiers;
  w.distinctCards = new Set([...w.dons, ...w.golpes.map(g => g.id)]).size;
  const p = w.player;
  if (p) {
    // ganhar vida máxima NÃO cura: a barra só fica maior (curar é papel de comida, regeneração e roubo de vida)
    p.hp = clamp(p.hp, 0, s.maxHp);
    if (p.healPct) { p.hp = Math.min(s.maxHp, p.hp + s.maxHp * p.healPct); p.healPct = 0; }
  }
  // encantos que viram golpes escondidos
  const hasChinelo = w.golpes.some(g => g.id === 'chinelo');
  if (s.flags.chinelo && !hasChinelo) w.golpes.push({ id: 'chinelo', level: 1, t: 1, state: {}, hidden: true });
  return s;
}

// Fórmula: base × (1 + bônus somados) × multiplicadores × crítico
function calcDamage(w, base, tag, target, extraCrit = 0) {
  const s = w.stats;
  let add = 1 + s.dmgAdd + (tag ? (s.tagAdd[tag] || 0) : 0);
  if (target && target.stunT > 0) add += s.stunnedAdd;
  if (s.flags.cangacoKills) add += Math.min(1.5, w.phaseKills * 0.01);
  if (w.player && w.player.bencaoT > 0) add += 0.25; // bênção do oratório
  if (s.flags.galo) add += Math.min(2, Math.floor(w.runKills / 5) * 0.01);
  if (s.flags.saudade) add += 0.04 * w.distinctCards;
  let mult = s.dmgMult * (tag ? (s.tagMult[tag] || 1) : 1);
  if (s.flags.ginga && w.player.moving) mult *= 1.5;
  if (target && target.stunT > 0) mult *= s.stunnedMult;
  if (target && (target.boss || target.elite)) mult *= s.eliteMult;
  // chefe cansado: depois de 60s de luta, ele recebe cada vez mais dano
  if (target && target.boss && w.bossT > 60) mult *= Math.min(2.5, 1 + (w.bossT - 60) * 0.03);
  let dmg = base * Math.max(0.1, add) * mult;
  let crit = false;
  if (RNG.next() < s.critChance + extraCrit) { crit = true; dmg *= s.critMult; }
  dmg = clamp(finite(dmg, 1), 0, DMG_CAP);
  return { dmg, crit };
}

// Resumo para a tela de pausa: dano "típico" de cada golpe (sem crítico, sem condições)
function golpeDpsInfo(w, g) {
  const def = GOLPES[g.id];
  const s = w.stats, tag = def.tag;
  const add = 1 + s.dmgAdd + (tag ? (s.tagAdd[tag] || 0) : 0);
  const mult = s.dmgMult * (tag ? (s.tagMult[tag] || 1) : 1);
  const base = def.dmg[Math.min(g.level, def.dmg.length) - 1];
  const hit = base * add * mult;
  const cd = def.cd ? w.golpeCd(g) : null;
  return { hit: finite(hit), cd, add, mult };
}

// ----- sorteio de cartas -----
function rarityWeight(r, luck) {
  const base = RARITY[r].weight;
  if (r === 'comum') return base / (1 + luck);
  if (r === 'incomum') return base * (1 + luck * 0.6);
  if (r === 'raro') return base * (1 + luck * 1.2);
  return base * (1 + luck * 2);
}

function cardPool(w, opts = {}) {
  const s = w.stats, cls = CLASSES[w.classId];
  const pool = [];
  const owned = new Map(w.golpes.map(g => [g.id, g]));
  const visibleGolpes = w.golpes.filter(g => !g.hidden).length;
  const boostTag = t => (t && t === cls.tag ? 1.35 : 1) * (t && w.tagCounts[t] >= 2 ? 1.25 : 1);
  if (!opts.donsOnly) {
    for (const id of GOLPE_IDS) {
      const def = GOLPES[id], g = owned.get(id);
      if (g) {
        if (g.level < 5) pool.push([{ kind: 'golpe', id, level: g.level + 1, rarity: 'incomum' }, 34 * boostTag(def.tag)]);
      } else if (visibleGolpes < MAX_GOLPES) {
        pool.push([{ kind: 'golpe', id, level: 1, rarity: 'incomum' }, 9 * boostTag(def.tag)]);
      }
    }
  }
  for (const d of DONS) {
    if (d.unique && w.dons.includes(d.id)) continue;
    if (opts.minRarity && RARITY_ORDER.indexOf(d.rarity) < RARITY_ORDER.indexOf(opts.minRarity)) continue;
    pool.push([{ kind: 'don', id: d.id, rarity: d.rarity }, rarityWeight(d.rarity, s.luck) * boostTag(d.tag) * 0.55]);
  }
  return pool;
}
const RARITY_ORDER = ['comum', 'incomum', 'raro', 'epico', 'lendario'];

function rollCards(w, n, opts = {}) {
  const pool = cardPool(w, opts);
  const out = [];
  while (out.length < n && pool.length) {
    const card = RNG.weighted(pool);
    const i = pool.findIndex(e => e[0] === card);
    pool.splice(i, 1);
    if (card.kind === 'don') {
      const base = DON_BY_ID[card.id].rarity;
      card.rarity = rollQuality(w, base);
      card.f = RARITY_POWER[card.rarity] / RARITY_POWER[base];
    }
    out.push(card);
  }
  return out;
}

function rollEncantos(w, n) {
  const free = ENCANTOS.filter(e => !w.encantos.includes(e.id));
  return RNG.shuffle(free.slice()).slice(0, n).map(e => ({ kind: 'encanto', id: e.id, rarity: 'raro' }));
}

function cardInfo(card) {
  if (card.kind === 'golpe') {
    const d = GOLPES[card.id];
    return {
      name: d.name, tag: d.tag, art: d.art, rarity: card.rarity,
      type: card.level === 1 ? 'Novo golpe' : `Golpe · Nível ${card.level}`,
      desc: card.level === 1 ? d.desc : `${d.notes[card.level - 1] || '+dano'} (dano ${d.dmg[card.level - 2]} → ${d.dmg[card.level - 1]})`,
    };
  }
  if (card.kind === 'don') {
    const d = DON_BY_ID[card.id];
    const r = card.rarity && RARITY[card.rarity] ? card.rarity : d.rarity, f = card.f || 1;
    let desc = d.desc;
    if (f > 1) {
      const sc = donScaledText(d, f);
      desc = sc.special ? `${sc.text}${sc.text ? ' · ' : ''}mais o efeito especial da carta (${d.desc})` : sc.text;
    }
    return { name: d.name, tag: d.tag, art: d.art, rarity: r, type: RARITY[r].name, desc, f, baseRarity: d.rarity, baseDesc: d.desc };
  }
  if (card.kind === 'ativo') {
    const a = ATIVO_BY_ID[card.id];
    return { name: a.name, tag: null, art: a.art, rarity: 'ativo', type: 'Item ativo', desc: `${a.desc} Recarga: ${a.cd}s. Use com a tecla E.` };
  }
  const e = ENCANTO_BY_ID[card.id];
  return { name: e.name, tag: null, art: e.art, rarity: 'encanto', type: 'Item passivo (encanto)', desc: e.desc };
}

function cardPrice(w, card) {
  const scale = 1 + 0.06 * Math.min(40, w.diffK ? w.diffK() : 0);
  if (card.kind === 'encanto') return Math.round(ENCANTO_BY_ID[card.id].price * scale);
  if (card.kind === 'ativo') return Math.round(ATIVO_BY_ID[card.id].price * scale);
  if (card.kind === 'golpe') return Math.round((card.level === 1 ? 16 : 12) * scale);
  return Math.round(RARITY[card.rarity].price * scale);
}
