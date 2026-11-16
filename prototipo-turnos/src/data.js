'use strict';

const TILE = { WALL: 0, FLOOR: 1, WATER: 2, GRASS: 3, STAIRS: 4 };

const TILE_INFO = {
  [TILE.WALL]:   { walk: false, opaque: true },
  [TILE.FLOOR]:  { walk: true,  opaque: false },
  [TILE.WATER]:  { walk: true,  opaque: false },
  [TILE.GRASS]:  { walk: true,  opaque: true },
  [TILE.STAIRS]: { walk: true,  opaque: false },
};

const BIOMES = {
  mata: {
    name: 'Mata Atlântica',
    wallFg: ['#2f7a3a', '#25632f', '#3a8a40', '#2a6e35'], wallBg: '#0a170c',
    floorFg: '#34452c', floorBg: '#111a0f', grassFg: '#5f9a3a', grassBg: '#132310',
  },
  varzea: {
    name: 'Várzea Encantada',
    wallFg: ['#2a7a6a', '#1f6357', '#358a77', '#246e60'], wallBg: '#08161a',
    floorFg: '#2f4440', floorBg: '#0e1918', grassFg: '#4f9a7a', grassBg: '#0f2420',
  },
  coracao: {
    name: 'Coração da Mata',
    wallFg: ['#8a4a2a', '#6e3a22', '#9a5a30', '#7a4026'], wallBg: '#1a0c08',
    floorFg: '#4a3026', floorBg: '#1a110d', grassFg: '#a0703a', grassBg: '#24160c',
  },
};
function biomeOf(floor) {
  if (floor <= 2) return BIOMES.mata;
  if (floor <= 4) return BIOMES.varzea;
  return BIOMES.coracao;
}

// art = artigo ("o"/"a") para montar as frases em português
const MONSTERS = {
  corposeco: {
    name: 'Corpo-Seco', art: 'o', glyph: 'z', color: '#b8a878',
    hp: 10, atk: 3, def: 0, speed: 0.75, xp: 5, minFloor: 1, maxFloor: 3, weight: 5,
    lore: 'Corpo-Seco: alma tão ruim que nem a terra quis. Lento, mas não desiste.',
  },
  saci: {
    name: 'Saci', art: 'o', glyph: 's', color: '#ff4a3a',
    hp: 8, atk: 3, def: 0, dodge: 0.3, xp: 7, minFloor: 1, weight: 4, ai: 'saci',
    lore: 'Saci: moleque de uma perna só e gorro vermelho. Some num redemoinho, aparece do seu lado e ROUBA seus itens. Mate-o para recuperá-los.',
  },
  curupira: {
    name: 'Curupira', art: 'o', glyph: 'c', color: '#ff9a2a',
    hp: 10, atk: 3, def: 0, speed: 1.6, xp: 10, minFloor: 2, weight: 4,
    lore: 'Curupira: guardião da mata com os pés virados para trás. Rápido demais — age duas vezes por turno.',
  },
  mula: {
    name: 'Mula sem Cabeça', art: 'a', glyph: 'M', color: '#ffc23a',
    hp: 16, atk: 4, def: 1, xp: 14, minFloor: 2, weight: 3, ai: 'charge', fireImmune: true,
    lore: 'Mula sem Cabeça: solta fogo pelo pescoço e dispara em linha reta, deixando um rastro de chamas. Saia da linha dela!',
  },
  iara: {
    name: 'Iara', art: 'a', glyph: 'I', color: '#5ad2ff',
    hp: 14, atk: 5, def: 0, xp: 14, minFloor: 3, weight: 4, ai: 'iara', nearWater: true,
    lore: 'Iara: a mãe-d\'água. Seu canto puxa os incautos para perto dela.',
  },
  lobisomem: {
    name: 'Lobisomem', art: 'o', glyph: 'L', color: '#c9c3a0',
    hp: 24, atk: 7, def: 2, xp: 22, minFloor: 3, weight: 3, regen: 1,
    lore: 'Lobisomem: o sétimo filho que vira bicho na lua cheia. Suas feridas se fecham sozinhas — não dê trégua.',
  },
  mapinguari: {
    name: 'Mapinguari', art: 'o', glyph: 'Ω', color: '#a0703a',
    hp: 40, atk: 9, def: 4, speed: 0.5, xp: 30, minFloor: 4, weight: 2,
    lore: 'Mapinguari: gigante peludo com uma boca na barriga. Lento, mas quase indestrutível.',
  },
  boitata: {
    name: 'Boitatá', art: 'o', glyph: 'B', color: '#4ab4ff',
    hp: 75, atk: 8, def: 3, xp: 0, minFloor: 99, weight: 0, ai: 'boss', boss: true, fireImmune: true,
    lore: 'Boitatá: a cobra de fogo que guarda a mata. Cospe chamas em linha reta e fica furiosa quando ferida.',
  },
};

const ITEMS = {
  garrafada: {
    name: 'Garrafada', glyph: '!', color: '#ff6a6a', desc: 'cura 40% da vida',
    use(p) {
      if (p.hp >= p.maxHp) { log('Você já está com a vida cheia.', 'hint'); return false; }
      const amt = Math.round(p.maxHp * 0.4 * (1 + p.potionBonus));
      heal(amt);
      log(`Você toma a garrafada e recupera ${amt} de vida.`, 'good');
    },
  },
  fumo: {
    name: 'Fumo de rolo', glyph: '&', color: '#c09060', desc: 'oferenda: acalma as criaturas à vista',
    use() {
      const seen = G.monsters.filter(m => G.map.visible[idx(m.x, m.y)]);
      if (!seen.length) { log('Não há ninguém à vista para receber a oferenda.', 'hint'); return false; }
      let n = 0;
      for (const m of seen) {
        if (m.boss) { log('O Boitatá não aceita oferendas!', 'bad'); continue; }
        m.pacified = 10; n++;
      }
      if (n) log(`Você deixa o fumo como oferenda. ${n} criatura(s) se acalmam por um tempo.`, 'good');
    },
  },
  patua: {
    name: 'Patuá', glyph: 'o', color: '#ffd84a', desc: 'escudo que absorve 15 de dano',
    use(p) { p.shield += 15; log('Você aperta o patuá. Uma proteção te envolve.', 'good'); },
  },
  sal: {
    name: 'Sal grosso', glyph: '*', color: '#f0f0f0', desc: '12 de dano em quem estiver colado em você',
    use(p) {
      const adj = G.monsters.filter(m => cheb(m, p) === 1);
      if (!adj.length) { log('Ninguém por perto para o círculo de sal.', 'hint'); return false; }
      log('Você joga sal grosso em volta! As criaturas queimam.', 'good');
      for (const m of adj) damage(m, 12);
    },
  },
  // equipamentos: aplicados na hora em que você pega
  facao: {
    name: 'Facão afiado', glyph: '/', color: '#d0d8e0', desc: '+2 de ataque', equip: true,
    apply(p) { p.atk += 2; },
  },
  gibao: {
    name: 'Gibão de couro', glyph: '[', color: '#c08a50', desc: '+1 de defesa', equip: true,
    apply(p) { p.def += 1; },
  },
};
const CONSUMABLE_WEIGHTS = [['garrafada', 5], ['fumo', 2], ['patua', 2], ['sal', 2]];

const PERKS = [
  { id: 'forca', name: 'Força do Mato', desc: '+3 de ataque', apply: p => { p.atk += 3; } },
  { id: 'couro', name: 'Couro Grosso', desc: '+2 de defesa', apply: p => { p.def += 2; } },
  { id: 'folego', name: 'Fôlego de Caboclo', desc: '+12 de vida máxima e cura total', apply: p => { p.maxHp += 12; p.hp = p.maxHp; } },
  { id: 'olho', name: 'Olho de Coruja', desc: '+2 de visão e +10% de crítico', apply: p => { p.vision += 2; p.crit += 0.10; } },
  { id: 'reza', name: 'Reza Forte', desc: 'regenera vida com o tempo (acumula: mais rápido)', apply: p => { p.regenEvery = p.regenEvery ? Math.max(1, p.regenEvery - 2) : 6; } },
  { id: 'ligeiro', name: 'Pé Ligeiro', desc: '+12% de esquiva', apply: p => { p.dodge = Math.min(0.5, p.dodge + 0.12); } },
  { id: 'onca', name: 'Espírito da Onça', desc: 'cura 4 de vida a cada criatura derrotada', apply: p => { p.killHeal += 4; } },
  { id: 'duplo', name: 'Facão Rápido', desc: '+20% de chance de golpe duplo', apply: p => { p.doubleHit += 0.2; } },
  { id: 'benzedura', name: 'Benzedura', desc: 'garrafadas curam 50% a mais', apply: p => { p.potionBonus += 0.5; } },
];
