'use strict';
// ===== Builds (tags), classes, cartas de atributo (dons) e encantos =====

const TAGS = {
  capoeira: {
    name: 'Capoeira', color: '#f2c14e', dark: '#5a4210', style: 'Velocidade e esquiva',
    bonus: [
      '+15% de velocidade e +6% de esquiva',
      'Ao esquivar, você solta uma meia-lua automática',
      'Ginga: ×1,5 de dano enquanto estiver se movendo',
    ],
  },
  jiujitsu: {
    name: 'Jiu-Jitsu', color: '#9b7bff', dark: '#33215e', style: 'Controle e defesa',
    bonus: [
      '+12% de redução de dano',
      'Quem encosta em você fica atordoado (0,6s)',
      'Finalização: inimigos comuns abaixo de 15% de vida morrem na hora',
    ],
  },
  mandinga: {
    name: 'Mandinga', color: '#4fd1c5', dark: '#0f4a45', style: 'Magia e área',
    bonus: [
      '+15% de dano de Mandinga e +10% de área',
      '+1 projétil e inimigos derrotados podem soltar um fogo-fátuo (15%)',
      '×1,6 de dano e +30% de área nos golpes de Mandinga',
    ],
  },
  cangaco: {
    name: 'Cangaço', color: '#e4572e', dark: '#5a1a0a', style: 'Força e crítico',
    bonus: [
      '+20% de dano',
      '+15% de chance de crítico e +50% de dano crítico',
      'Cada abate na fase dá +1% de dano (até +150%)',
    ],
  },
  raiz: {
    name: 'Raiz', color: '#7bc950', dark: '#26461a', style: 'Vida e regeneração',
    bonus: [
      '+1,5 de regeneração por segundo',
      '+25% de vida máxima',
      'Uma vez por fase, ao cair, você levanta com 50% de vida',
    ],
  },
};
const TAG_TIERS = [2, 4, 6];
const MAX_GOLPES = 6;
const MAX_ENCANTOS = 6;

const RARITY = {
  comum:    { name: 'Comum',    color: '#b9b4a0', weight: 60, price: 8 },
  incomum:  { name: 'Incomum',  color: '#5fb8ff', weight: 28, price: 12 },
  raro:     { name: 'Raro',     color: '#c77dff', weight: 10, price: 18 },
  epico:    { name: 'Épico',    color: '#ff5fa2', weight: 0, price: 24 },
  lendario: { name: 'Lendário', color: '#ffb627', weight: 2.5, price: 30 },
};
// Toda carta de atributo existe em versões melhores, da raridade dela até a Lendária.
// O número é quanto o efeito vale em relação à versão Comum (Ginga comum +8% → lendária +100%).
const RARITY_POWER = { comum: 1, incomum: 1.5, raro: 2.5, epico: 5, lendario: 12.5 };
// Chance de a carta oferecida vir numa versão melhor (a sorte aumenta as de cima).
const QUALITY_ODDS = { comum: 100, incomum: 16, raro: 5, epico: 1.5, lendario: 0.35 };

// ----- Classes -----
const CLASSES = {
  capoeirista: {
    name: 'Capoeirista', tag: 'capoeira', golpe: 'armada', color: '#f2c14e',
    desc: 'Ginga sem parar. Rápido, esquivo e frágil. Golpes giratórios em área.',
    base: { maxHp: 125, speed: 240, dodge: 0.18 },
    perk: { name: 'Dono da Roda', desc: 'Golpes de Capoeira recarregam 20% mais rápido e dão +10% de dano.' },
    ult: { name: 'Roda Grande', cd: 50, dur: 4, desc: 'Por 4s vira um redemoinho de chutes: o dobro do dano da Roda de Capoeira, área maior, +30% de esquiva e muito mais velocidade. Toca o berimbau!' },
    special: { name: 'Roda de Capoeira', cd: 10, desc: 'Gira sem parar por 1,5s: chutes em área em volta de você, e você corre mais rápido.' },
  },
  jiujitsu: {
    name: 'Lutadora de Jiu-Jitsu', tag: 'jiujitsu', golpe: 'kimura', color: '#9b7bff',
    desc: 'Luta colada: investe no inimigo, agarra e derruba. Por isso tem muita vida e defesa.',
    base: { maxHp: 150, speed: 205, armor: 0.10 },
    perk: { name: 'Sangue no Olho', desc: 'Abater com golpe de Jiu-Jitsu cura 1,5% da vida (até 2% por segundo). E a FAIXA evolui com o nível: Branca → Azul (nv 5) → Roxa (nv 10) → Marrom (nv 16) → Preta (nv 23), cada uma com +6% de dano de Jiu-Jitsu, +6 de vida e +1% de defesa; a Preta ainda dá ×1,2.' },
    ult: { name: 'Finalização Geral', cd: 50, dur: 1.2, desc: 'Agarra TODO MUNDO em volta de uma vez: dano pesado, atordoa por 3s (chefes, menos) e ganha uma barreira de 20% da vida.' },
    special: { name: 'Arrastão', cd: 9, desc: 'Salta no meio do maior grupo de inimigos e derruba todos em volta: dano em área, atordoamento e barreira.' },
  },
  benzedeira: {
    name: 'Benzedeira', tag: 'mandinga', golpe: 'fogofatuo', color: '#4fd1c5',
    desc: 'Reza, simpatia e fogo-fátuo. Ataca de longe e se cura com o tempo.',
    base: { maxHp: 82, speed: 215, regen: 1 },
    perk: { name: 'Fé que Cura', desc: 'Golpes de Mandinga têm +20% de área, e cada abate com eles cura 0,5% da vida.' },
    ult: { name: 'Procissão das Almas', cd: 50, dur: 5, desc: 'Por 5s uma procissão de fogos-fátuos sai de você caçando os inimigos, e você se cura 2% da vida por segundo.' },
    special: { name: 'Reza Forte', cd: 11, desc: 'Um círculo de luz se abre em volta de você: dano em área enorme e cura 8% da vida.' },
  },
  cangaceiro: {
    name: 'Cangaceiro', tag: 'cangaco', golpe: 'peixeira', color: '#e4572e',
    desc: 'Valente do sertão. Dano bruto, críticos devastadores e rouba um pouco de vida.',
    base: { maxHp: 120, speed: 215, critChance: 0.12, lifesteal: 0.03 },
    perk: { name: 'Filho do Sol', desc: 'Golpes de Cangaço dão +30% de dano nas fases de sol forte (Sertão e Pantanal) e +10% nas outras.' },
    ult: { name: 'Bando de Lampião', cd: 50, dur: 4, desc: 'Por 4s o bando atira junto com você: uma chuva de tiros certeiros que atravessam tudo, com +30% de chance de crítico.' },
    special: { name: 'Tiroteio', cd: 10, desc: 'Três rajadas de balas para todos os lados, atravessando os inimigos.' },
  },
};

// ----- Atributos base -----
function baseStats() {
  return {
    maxHp: 100, hpPct: 0, regen: 0, armor: 0, dodge: 0, speed: 210, speedPct: 0,
    dmgAdd: 0, dmgMult: 1, tagAdd: {}, tagMult: {}, tagAtk: {}, tagArea: {},
    critChance: 0.05, critMult: 1.5, atkSpeed: 1, area: 1, projectiles: 0, duration: 1,
    pierce: 0, pickup: 95, luck: 0, lifesteal: 0, thorns: 0, stunMult: 1, coinMult: 1,
    xpMult: 1, options: 3, nullify: 0, eliteMult: 1, stunnedAdd: 0, stunnedMult: 1,
    tagCountBonus: {}, flags: {},
  };
}
const addTag = (s, tag, key, v) => { s[key][tag] = (s[key][tag] || 0) + v; };
const mulTag = (s, tag, v) => { s.tagMult[tag] = (s.tagMult[tag] || 1) * v; };

// ----- Dons (cartas de atributo) -----
// apply(s) altera os atributos; onPick(world) roda uma vez quando a carta é pega.
const DONS = [
  // Raiz — comida e bebida brasileira
  { id: 'feijoada', name: 'Feijoada', tag: 'raiz', rarity: 'comum', art: 'feijoada',
    desc: '+25 de vida máxima', apply: s => { s.maxHp += 25; } },
  { id: 'acai', name: 'Açaí na Tigela', tag: 'raiz', rarity: 'comum', art: 'acai',
    desc: '+1 de regeneração por segundo', apply: s => { s.regen += 1; } },
  { id: 'paodequeijo', name: 'Pão de Queijo', tag: 'raiz', rarity: 'comum', art: 'paodequeijo',
    desc: '+12 de vida máxima e +0,5 de regeneração', apply: s => { s.maxHp += 12; s.regen += 0.5; } },
  { id: 'guarana', name: 'Guaraná', tag: 'raiz', rarity: 'comum', art: 'guarana',
    desc: '+10% de velocidade de movimento', apply: s => { s.speedPct += 0.10; } },
  { id: 'cafezinho', name: 'Cafezinho', tag: 'raiz', rarity: 'comum', art: 'cafe',
    desc: '+12% de velocidade de ataque', apply: s => { s.atkSpeed += 0.12; } },
  { id: 'caldodecana', name: 'Caldo de Cana', tag: 'raiz', rarity: 'incomum', art: 'caldodecana',
    desc: '+15 de vida máxima e cura 25% da vida', apply: s => { s.maxHp += 15; },
    onPick: w => { w.player.healPct = 0.25; } },
  { id: 'brigadeiro', name: 'Brigadeiro', tag: 'raiz', rarity: 'incomum', art: 'brigadeiro',
    desc: '+20% de sorte (cartas mais raras) e +10 de vida', apply: s => { s.luck += 0.2; s.maxHp += 10; } },
  { id: 'tapioca', name: 'Tapioca', tag: 'raiz', rarity: 'comum', art: 'tapioca',
    desc: '+30% de alcance de coleta e +10% de XP', apply: s => { s.pickup += 28; s.xpMult += 0.10; } },
  { id: 'pf', name: 'Prato Feito', tag: 'raiz', rarity: 'incomum', art: 'pf',
    desc: '+10 de vida, +0,5 de regeneração e +6% de dano', apply: s => { s.maxHp += 10; s.regen += 0.5; s.dmgAdd += 0.06; } },
  { id: 'churrasco', name: 'Churrasco de Domingo', tag: 'raiz', rarity: 'raro', art: 'churrasco',
    desc: '+40 de vida máxima e +5% de redução de dano', apply: s => { s.maxHp += 40; s.armor += 0.05; } },

  // Capoeira
  { id: 'ginga', name: 'Ginga', tag: 'capoeira', rarity: 'comum', art: 'ginga',
    desc: '+8% de velocidade e +5% de esquiva', apply: s => { s.speedPct += 0.08; s.dodge += 0.05; } },
  { id: 'cordao', name: 'Cordão Graduado', tag: 'capoeira', rarity: 'comum', art: 'cordao',
    desc: '+15% de dano nos golpes de Capoeira', apply: s => addTag(s, 'capoeira', 'tagAdd', 0.15) },
  { id: 'au', name: 'Aú', tag: 'capoeira', rarity: 'incomum', art: 'au',
    desc: '+7% de esquiva. Ao esquivar, +30% de velocidade por 1,5s', apply: s => { s.dodge += 0.07; s.flags.au = true; } },
  { id: 'atabaque', name: 'Atabaque', tag: 'capoeira', rarity: 'incomum', art: 'atabaque',
    desc: '+20% de velocidade de ataque nos golpes de Capoeira', apply: s => addTag(s, 'capoeira', 'tagAtk', 0.20) },
  { id: 'roda', name: 'Roda de Capoeira', tag: 'capoeira', rarity: 'raro', art: 'roda',
    desc: '+30% de dano e +20% de área nos golpes de Capoeira',
    apply: s => { addTag(s, 'capoeira', 'tagAdd', 0.30); addTag(s, 'capoeira', 'tagArea', 0.20); } },
  { id: 'mestre', name: 'Mestre de Capoeira', tag: 'capoeira', rarity: 'lendario', art: 'mestre', unique: true,
    desc: '×1,5 de dano nos golpes de Capoeira e +15% de velocidade',
    apply: s => { mulTag(s, 'capoeira', 1.5); s.speedPct += 0.15; } },

  // Jiu-Jitsu
  { id: 'faixaazul', name: 'Faixa Azul', tag: 'jiujitsu', rarity: 'comum', art: 'faixaazul',
    desc: '+6% de redução de dano e +10 de vida', apply: s => { s.armor += 0.06; s.maxHp += 10; } },
  { id: 'pegada', name: 'Pegada Forte', tag: 'jiujitsu', rarity: 'comum', art: 'pegada',
    desc: '+20% de dano contra inimigos atordoados', apply: s => { s.stunnedAdd += 0.20; } },
  { id: 'faixaroxa', name: 'Faixa Roxa', tag: 'jiujitsu', rarity: 'incomum', art: 'faixaroxa',
    desc: '+15% de dano de Jiu-Jitsu e +25% de duração de atordoamento',
    apply: s => { addTag(s, 'jiujitsu', 'tagAdd', 0.15); s.stunMult += 0.25; } },
  { id: 'tatame', name: 'Tatame', tag: 'jiujitsu', rarity: 'incomum', art: 'tatame',
    desc: 'Devolve 40% do dano recebido a quem te atacou', apply: s => { s.thorns += 0.40; } },
  { id: 'kimono', name: 'Kimono Trançado', tag: 'jiujitsu', rarity: 'raro', art: 'kimono',
    desc: '+12% de redução de dano e +25 de vida', apply: s => { s.armor += 0.12; s.maxHp += 25; } },
  { id: 'faixapreta', name: 'Faixa Preta', tag: 'jiujitsu', rarity: 'lendario', art: 'faixapreta', unique: true,
    desc: '×1,4 de dano. Inimigos atordoados recebem ×2', apply: s => { s.dmgMult *= 1.4; s.stunnedMult *= 2; } },

  // Mandinga
  { id: 'reza', name: 'Reza Forte', tag: 'mandinga', rarity: 'comum', art: 'reza',
    desc: '+15% de dano de Mandinga e +0,3 de regeneração', apply: s => { addTag(s, 'mandinga', 'tagAdd', 0.15); s.regen += 0.3; } },
  { id: 'vela', name: 'Vela de Sete Dias', tag: 'mandinga', rarity: 'comum', art: 'vela',
    desc: '+15% de duração e +10% de área', apply: s => { s.duration += 0.15; s.area += 0.10; } },
  { id: 'simpatia', name: 'Simpatia', tag: 'mandinga', rarity: 'incomum', art: 'simpatia',
    desc: '+1 projétil em todos os golpes que atiram', apply: s => { s.projectiles += 1; } },
  { id: 'arruda', name: 'Galho de Arruda', tag: 'mandinga', rarity: 'incomum', art: 'arruda',
    desc: 'Corpo fechado: 8% de chance de anular qualquer dano', apply: s => { s.nullify += 0.08; } },
  { id: 'banhoervas', name: 'Banho de Ervas', tag: 'mandinga', rarity: 'raro', art: 'banho',
    desc: '+30% de dano e +15% de área nos golpes de Mandinga',
    apply: s => { addTag(s, 'mandinga', 'tagAdd', 0.30); addTag(s, 'mandinga', 'tagArea', 0.15); } },
  { id: 'benzedeiramor', name: 'Benzedeira-Mor', tag: 'mandinga', rarity: 'lendario', art: 'benzedeiramor', unique: true,
    desc: '×1,6 de dano nos golpes de Mandinga e +1 projétil', apply: s => { mulTag(s, 'mandinga', 1.6); s.projectiles += 1; } },

  // Cangaço
  { id: 'sol', name: 'Sol do Sertão', tag: 'cangaco', rarity: 'comum', art: 'sol',
    desc: '+10% de dano', apply: s => { s.dmgAdd += 0.10; } },
  { id: 'mira', name: 'Mira de Cangaceiro', tag: 'cangaco', rarity: 'comum', art: 'mira',
    desc: '+6% de chance de crítico', apply: s => { s.critChance += 0.06; } },
  { id: 'gibao', name: 'Gibão de Couro', tag: 'cangaco', rarity: 'comum', art: 'gibao',
    desc: '+5% de redução de dano e +15 de vida', apply: s => { s.armor += 0.05; s.maxHp += 15; } },
  { id: 'amolada', name: 'Peixeira Amolada', tag: 'cangaco', rarity: 'incomum', art: 'amolada',
    desc: '+40% de dano crítico', apply: s => { s.critMult += 0.40; } },
  { id: 'xaxado', name: 'Xaxado', tag: 'cangaco', rarity: 'incomum', art: 'xaxado',
    desc: '+12% de velocidade de ataque e +8% de dano', apply: s => { s.atkSpeed += 0.12; s.dmgAdd += 0.08; } },
  { id: 'reicangaco', name: 'Rei do Cangaço', tag: 'cangaco', rarity: 'lendario', art: 'rei', unique: true,
    desc: '×1,3 de dano e dano crítico ×2', apply: s => { s.dmgMult *= 1.3; s.critMult *= 2; } },

  // Sem tag — multiplicadores
  { id: 'arretado', name: 'Arretado!', tag: null, rarity: 'raro', art: 'arretado',
    desc: '×1,2 de dano (acumula)', apply: s => { s.dmgMult *= 1.2; } },
  { id: 'golplaca', name: 'Gol de Placa', tag: null, rarity: 'raro', art: 'gol',
    desc: '+6% de crítico e +30% de dano crítico', apply: s => { s.critChance += 0.06; s.critMult += 0.30; } },
  { id: 'saudade', name: 'Saudade', tag: null, rarity: 'raro', art: 'saudade', unique: true,
    desc: '+4% de dano para cada carta diferente que você tem', apply: s => { s.flags.saudade = true; } },
  { id: 'carnaval', name: 'Carnaval', tag: null, rarity: 'lendario', art: 'carnaval', unique: true,
    desc: '×1,15 de dano para cada build ativa (2+ cartas)', apply: s => { s.flags.carnaval = true; } },
  { id: 'jeitinho', name: 'Jeitinho', tag: null, rarity: 'lendario', art: 'jeitinho', unique: true,
    desc: '+1 opção de carta e +3 rerrolagens', apply: s => { s.options += 1; },
    onPick: w => { w.rerolls += 3; } },
];
const DON_BY_ID = Object.fromEntries(DONS.map(d => [d.id, d]));

// ----- Encantos (relíquias únicas, vêm da Feira e dos baús dos chefes) -----
const ENCANTOS = [
  { id: 'figa', name: 'Figa de Guiné', art: 'figa', price: 22,
    desc: '10% de chance de anular qualquer dano', apply: s => { s.nullify += 0.10; } },
  { id: 'fitinha', name: 'Fitinha do Bonfim', art: 'fitinha', price: 24,
    desc: '+1 opção de carta ao subir de nível', apply: s => { s.options += 1; } },
  { id: 'galo', name: 'Galo de Briga', art: 'galo', price: 26,
    desc: '+1% de dano a cada 5 abates na corrida (até +200%)', apply: s => { s.flags.galo = true; } },
  { id: 'ferradura', name: 'Ferradura', art: 'ferradura', price: 18,
    desc: '+35% de sorte (cartas mais raras)', apply: s => { s.luck += 0.35; } },
  { id: 'rede', name: 'Rede de Dormir', art: 'rede', price: 18,
    desc: 'Regeneração ×3 enquanto estiver parado', apply: s => { s.flags.rede = true; } },
  { id: 'chinelo', name: 'Chinelo da Mãe', art: 'chinelo', price: 26,
    desc: 'A cada 2s, um chinelo voa no inimigo mais forte. Ninguém escapa.', apply: s => { s.flags.chinelo = true; } },
  { id: 'bornal', name: 'Bornal Cheio', art: 'bornal', price: 16,
    desc: '+50% de moedas', apply: s => { s.coinMult += 0.5; } },
  { id: 'cofrinho', name: 'Cofrinho de Barro', art: 'cofrinho', price: 16,
    desc: 'Juros da Feira dobrados (até 10 por fase)', apply: s => { s.flags.juros2 = true; } },
  { id: 'carranca', name: 'Carranca', art: 'carranca', price: 24,
    desc: '+40% de dano contra chefes e elites', apply: s => { s.eliteMult += 0.4; } },
  { id: 'pimenta', name: 'Pimenta Malagueta', art: 'pimenta', price: 22,
    desc: 'Acertos críticos queimam: +40% do dano ao longo de 2s', apply: s => { s.flags.burnCrit = true; } },
  { id: 'sombrinha', name: 'Sombrinha de Frevo', art: 'sombrinha', price: 20,
    desc: '+12% de esquiva', apply: s => { s.dodge += 0.12; } },
  { id: 'berimbauouro', name: 'Berimbau de Ouro', art: 'berimbau', price: 20,
    desc: 'Conta como +1 carta de Capoeira nas sinergias', apply: s => { s.tagCountBonus.capoeira = (s.tagCountBonus.capoeira || 0) + 1; } },
  { id: 'faixacoral', name: 'Faixa Coral', art: 'faixacoral', price: 20,
    desc: 'Conta como +1 carta de Jiu-Jitsu nas sinergias', apply: s => { s.tagCountBonus.jiujitsu = (s.tagCountBonus.jiujitsu || 0) + 1; } },
  { id: 'patuaouro', name: 'Patuá Dourado', art: 'patua', price: 20,
    desc: 'Conta como +1 carta de Mandinga nas sinergias', apply: s => { s.tagCountBonus.mandinga = (s.tagCountBonus.mandinga || 0) + 1; } },
  { id: 'estrela', name: 'Estrela de Couro', art: 'estrela', price: 20,
    desc: 'Conta como +1 carta de Cangaço nas sinergias', apply: s => { s.tagCountBonus.cangaco = (s.tagCountBonus.cangaco || 0) + 1; } },
  { id: 'panela', name: 'Panela de Barro', art: 'panela', price: 20,
    desc: 'Conta como +1 carta de Raiz nas sinergias', apply: s => { s.tagCountBonus.raiz = (s.tagCountBonus.raiz || 0) + 1; } },
];
const ENCANTO_BY_ID = Object.fromEntries(ENCANTOS.map(e => [e.id, e]));

// ----- Itens ativos (1 por vez; tecla E). Os encantos são os itens PASSIVOS. -----
const ATIVOS = [
  { id: 'fogos', art: 'i_fogos', name: 'Fogos de São João', icon: '🎆', cd: 14, price: 14,
    desc: 'Rojões caem em até 8 inimigos por perto e explodem em área.' },
  { id: 'rede', art: 'i_rede', name: 'Rede de Pesca', icon: '🕸️', cd: 16, price: 12,
    desc: 'Prende todo mundo em volta: atordoa por 2,2s (chefes, menos).' },
  { id: 'cha', art: 'i_cha', name: 'Chá da Vó', icon: '🍵', cd: 30, price: 14,
    desc: 'Cura 30% da vida na hora.' },
  { id: 'pandeiro', art: 'i_pandeiro', name: 'Pandeiro', icon: '🪘', cd: 18, price: 12,
    desc: 'Uma batida joga todos os inimigos para longe e deixa você intocável por 1,5s.' },
  { id: 'chimarrao', art: 'i_chimarrao', name: 'Cuia de Chimarrão', icon: '🧉', cd: 22, price: 14,
    desc: 'Por 6s seus golpes saem 40% mais rápido.' },
];
const ATIVO_BY_ID = Object.fromEntries(ATIVOS.map(a => [a.id, a]));

// ----- Treino (evolução permanente entre corridas, paga com patacas) -----
// apply(s, n): n = nível comprado. cost(n) = preço do nível n+1.
const META_UPS = [
  { id: 'folego', art: 't_folego', name: 'Fôlego', icon: '❤', max: 10, cost: n => 6 + n * 5, desc: '+10 de vida máxima por nível', apply: (s, n) => { s.maxHp += 10 * n; } },
  { id: 'forca', art: 't_forca', name: 'Força', icon: '💪', max: 10, cost: n => 6 + n * 5, desc: '+6% de dano por nível', apply: (s, n) => { s.dmgAdd += 0.06 * n; } },
  { id: 'couro', art: 't_couro', name: 'Couro Grosso', icon: '🛡', max: 5, cost: n => 8 + n * 7, desc: '+3% de redução de dano por nível', apply: (s, n) => { s.armor += 0.03 * n; } },
  { id: 'reza', art: 't_reza', name: 'Reza Braba', icon: '✚', max: 5, cost: n => 8 + n * 6, desc: '+0,4 de regeneração por nível', apply: (s, n) => { s.regen += 0.4 * n; } },
  { id: 'pernas', art: 't_pernas', name: 'Pernas Ligeiras', icon: '👟', max: 5, cost: n => 6 + n * 5, desc: '+3% de velocidade por nível', apply: (s, n) => { s.speedPct += 0.03 * n; } },
  { id: 'mira', art: 't_mira', name: 'Olho Bom', icon: '🎯', max: 5, cost: n => 8 + n * 6, desc: '+3% de chance de crítico por nível', apply: (s, n) => { s.critChance += 0.03 * n; } },
  { id: 'estudo', art: 't_estudo', name: 'Estudo', icon: '📖', max: 5, cost: n => 8 + n * 6, desc: '+6% de experiência por nível', apply: (s, n) => { s.xpMult += 0.06 * n; } },
  { id: 'mesada', art: 't_mesada', name: 'Mesada', icon: '💰', max: 5, cost: n => 5 + n * 5, desc: 'Começa a corrida com +R$ 3 por nível', apply: () => {} },
  { id: 'manha', art: 't_manha', name: 'Manha', icon: '🎲', max: 3, cost: n => 10 + n * 10, desc: '+1 rerrolagem no começo por nível', apply: () => {} },
  { id: 'folego2', art: 't_raio', name: 'Especial Afiado', icon: '⚡', max: 5, cost: n => 8 + n * 6, desc: 'Especial recarrega 6% mais rápido por nível', apply: () => {} },
];
const META_BY_ID = Object.fromEntries(META_UPS.map(m => [m.id, m]));

// ----- Faixas do Jiu-Jitsu (só a Lutadora): evoluem sozinhas com o nível -----
const BELTS = [
  { name: 'Faixa Branca', level: 1, color: '#f3efe4' },
  { name: 'Faixa Azul', level: 5, color: '#3f7fe0' },
  { name: 'Faixa Roxa', level: 10, color: '#9b5fe0' },
  { name: 'Faixa Marrom', level: 16, color: '#8a5a2b' },
  { name: 'Faixa Preta', level: 23, color: '#1b130d' },
];
function beltIndex(level) { let b = 0; for (let i = 0; i < BELTS.length; i++) if (level >= BELTS[i].level) b = i; return b; }
