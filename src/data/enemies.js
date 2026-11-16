'use strict';
// ===== Criaturas do folclore, chefes, fases e biomas =====

// ai: chase | blink | zigzag | charger | ranged | leaper | charmer | tank | stalker
const ENEMIES = {
  corposeco: { name: 'Caipora', sprite: 'caipora', r: 13, hp: 14, speed: 62, dmg: 6, xp: 1, ai: 'chase' },
  saci:      { name: 'Saci', sprite: 'saci', r: 11, hp: 11, speed: 95, dmg: 6, xp: 2, ai: 'blink' },
  curupira:  { name: 'Curupira', sprite: 'curupira', r: 12, hp: 16, speed: 125, dmg: 8, xp: 2, ai: 'zigzag' },
  mula:      { name: 'Mula sem Cabeça', sprite: 'mula', r: 17, hp: 45, speed: 70, dmg: 14, xp: 4, ai: 'charger' },
  iara:      { name: 'Iara', sprite: 'iara', r: 13, hp: 30, speed: 80, dmg: 9, xp: 3, ai: 'ranged' },
  lobisomem: { name: 'Lobisomem', sprite: 'lobisomem', r: 17, hp: 85, speed: 90, dmg: 16, xp: 5, ai: 'leaper', regen: 2 },
  boto:      { name: 'Boto', sprite: 'boto', r: 14, hp: 60, speed: 85, dmg: 12, xp: 4, ai: 'charmer' },
  mapinguari:{ name: 'Mapinguari', sprite: 'mapinguari', r: 26, hp: 320, speed: 48, dmg: 26, xp: 12, ai: 'tank', heavy: true },
  pisadeira: { name: 'Pisadeira', sprite: 'pisadeira', r: 13, hp: 70, speed: 105, dmg: 18, xp: 5, ai: 'stalker' },
};

// Chefes: padrões de ataque executados em ciclo (ver engine/enemyai.js)
const BOSSES = {
  saciboss: {
    name: 'Saci Redemoinho', sprite: 'saci', scale: 2.4, r: 26, hp: 480, speed: 115, dmg: 10,
    patterns: ['blinkStrike', 'whirlwinds', 'spread3', 'blinkStrike'],
    intro: 'Um redemoinho se forma... o Saci quer brincar!',
  },
  mulaboss: {
    name: 'Mula sem Cabeça', sprite: 'mula', scale: 2.1, r: 34, hp: 850, speed: 95, dmg: 14,
    patterns: ['charge', 'charge', 'ring10', 'charge'],
    intro: 'Um relincho sem cabeça ecoa. Cuidado com o rastro de fogo!',
  },
  iaraboss: {
    name: 'Iara, Mãe-d\'Água', sprite: 'iara', scale: 2.3, r: 30, hp: 1200, speed: 70, dmg: 14,
    patterns: ['spiral', 'spread5', 'ring14', 'pullSong'],
    intro: 'Um canto lindo vem do rio. Não se deixe levar!',
  },
  loboboss: {
    name: 'Lobisomem da Lua Cheia', sprite: 'lobisomem', scale: 2.2, r: 36, hp: 1800, speed: 115, dmg: 22, regen: 6,
    patterns: ['leap', 'leap', 'summonCuru', 'ring10'],
    intro: 'É sexta-feira de lua cheia. O uivo gela o sangue.',
  },
  cuca: {
    name: 'Cuca', sprite: 'cuca', scale: 2.4, r: 34, hp: 2900, speed: 78, dmg: 24,
    patterns: ['puddles', 'spread5', 'summonCorpo', 'puddles', 'ring14'],
    intro: '"Dorme, nenê..." A Cuca chegou com seu caldeirão!',
  },
  botoboss: {
    name: 'Boto Encantado', sprite: 'boto', scale: 2.3, r: 32, hp: 3600, speed: 100, dmg: 24,
    patterns: ['blinkStrike', 'hearts7', 'spiral', 'blinkStrike'],
    intro: 'De chapéu branco e terno, o Boto saiu do rio para o baile.',
  },
  mapinguariboss: {
    name: 'Mapinguari Ancião', sprite: 'mapinguari', scale: 1.9, r: 50, hp: 5600, speed: 58, dmg: 34, heavy: true,
    patterns: ['shockwave', 'leap', 'summonLobo', 'shockwave'],
    intro: 'A terra treme. A boca na barriga do Mapinguari se abre.',
  },
  pisadeiraboss: {
    name: 'Pisadeira', sprite: 'pisadeira', scale: 2.3, r: 30, hp: 6000, speed: 135, dmg: 30,
    patterns: ['blinkStrike', 'charge', 'ring14', 'blinkStrike', 'spread5'],
    intro: 'Quem dorme de barriga cheia recebe a visita da Pisadeira...',
  },
  curupiraboss: {
    name: 'Curupira, Guardião', sprite: 'curupira', scale: 2.3, r: 30, hp: 7400, speed: 155, dmg: 32,
    patterns: ['charge', 'whirlwinds', 'spread5', 'summonCuru', 'charge'],
    intro: 'Os pés virados confundem o caminho. O Guardião não perdoa quem fere a mata.',
  },
  boitata: {
    name: 'Boitatá', sprite: 'boitata', scale: 2, r: 40, hp: 12500, speed: 110, dmg: 36, serpent: true,
    patterns: ['fireline', 'ring14', 'fireline', 'spiral', 'puddles'],
    intro: 'Os olhos de fogo se acendem. A cobra de fogo protege o coração da mata!',
  },
};

const BIOMES = {
  mata:     { name: 'Mata Atlântica', ground: '#1f3a1c', ground2: '#2a4a24', speck: '#3d6a33', decor: ['arvore', 'arvore', 'jucara', 'jucara', 'ipe', 'embauba', 'samambaia', 'samambaia', 'bromelia', 'bromelia', 'tronco', 'flores', 'flores', 'pedra'],
    density: 260, litter: ['#6b4a2b', '#8a5a2b', '#b5762a', '#3f6b2f', '#c9a23a'], sun: 'rgba(255,240,170,0.07)' },
  sertao:   { sol: true, name: 'Sertão', ground: '#8a5a2b', ground2: '#9c6a36', speck: '#b8834a', decor: ['mandacaru', 'mandacaru', 'pedra', 'galhoseco'] },
  vila:     { name: 'Vila Assombrada', ground: '#2a2338', ground2: '#342a46', speck: '#4a3d63', decor: ['casinha', 'cerca', 'arvoreseca', 'pedra'] },
  pantanal: { sol: true, name: 'Pantanal', ground: '#2c4a36', ground2: '#35583f', speck: '#4f7a56', decor: ['agua', 'agua', 'buriti', 'buriti', 'capim', 'capim', 'vitoria', 'flores'], density: 210, litter: ['#6b7a3a', '#8a9a4a'], sun: 'rgba(255,240,170,0.06)' },
  amazonia: { name: 'Amazônia', ground: '#10261a', ground2: '#163222', speck: '#24502f', decor: ['arvore', 'arvore', 'jucara', 'embauba', 'samambaia', 'samambaia', 'cipo', 'cipo', 'bromelia', 'tronco', 'vitoria'],
    density: 280, litter: ['#3a2a18', '#5a3a22', '#2f5a2a', '#7a5a2a'], sun: 'rgba(200,255,200,0.04)' },
  coracao:  { name: 'Coração da Mata', ground: '#2e1410', ground2: '#3c1a12', speck: '#6a2a16', decor: ['arvoreseca', 'brasa', 'pedra', 'brasa'] },
};

// Fases: duração das ondas (s), criaturas possíveis [tipo, peso] e o chefe do fim
const PHASES = [
  { biome: 'mata',     dur: 55, pool: [['corposeco', 10], ['saci', 3]], boss: 'saciboss' },
  { biome: 'mata',     dur: 60, pool: [['corposeco', 8], ['saci', 4], ['curupira', 4]], boss: 'mulaboss' },
  { biome: 'sertao',   dur: 65, pool: [['corposeco', 6], ['curupira', 5], ['mula', 3], ['saci', 3]], boss: 'iaraboss' },
  { biome: 'sertao',   dur: 70, pool: [['curupira', 5], ['mula', 4], ['iara', 3], ['corposeco', 5]], boss: 'loboboss' },
  { biome: 'vila',     dur: 70, pool: [['corposeco', 6], ['mula', 3], ['iara', 3], ['lobisomem', 2], ['saci', 3]], boss: 'cuca' },
  { biome: 'pantanal', dur: 75, pool: [['iara', 5], ['lobisomem', 3], ['saci', 4], ['curupira', 4], ['mula', 3]], boss: 'botoboss' },
  { biome: 'pantanal', dur: 75, pool: [['boto', 4], ['lobisomem', 4], ['mula', 3], ['curupira', 4], ['iara', 3]], boss: 'mapinguariboss' },
  { biome: 'amazonia', dur: 80, pool: [['boto', 4], ['lobisomem', 4], ['mapinguari', 1], ['iara', 3], ['curupira', 4]], boss: 'pisadeiraboss' },
  { biome: 'amazonia', dur: 80, pool: [['mapinguari', 1.5], ['pisadeira', 4], ['boto', 3], ['lobisomem', 4], ['saci', 4]], boss: 'curupiraboss' },
  { biome: 'coracao',  dur: 85, pool: [['pisadeira', 3], ['mapinguari', 1.5], ['lobisomem', 4], ['mula', 4], ['boto', 3], ['curupira', 4]], boss: 'boitata' },
];
const NUM_PHASES = PHASES.length;

// ----- Apresentação: o que cada criatura faz (aparece na primeira vez que você encontra) -----
// Também diz qual ritmo toca em cada bioma.
const BESTIARIO = {
  corposeco: { faz: 'Guardiã baixinha e peluda da mata, de lança na mão. Vem em bando para cima de quem invade a floresta.', dica: 'Fraca sozinha, perigosa quando o bando cerca você. Não deixe fechar o círculo.' },
  saci: { faz: 'Some num redemoinho e reaparece perto de você para dar o bote.', dica: 'Quando ele parar e piscar em vermelho, vai teleportar: continue andando.' },
  curupira: { faz: 'Corre em ziguezague muito rápido — os pés virados para trás enganam.', dica: 'É difícil de acertar com golpes de mira. Ataques em área resolvem.' },
  mula: { faz: 'Mira em você, pisca em vermelho e dispara em linha reta deixando um rastro de fogo.', dica: 'Saia de lado na hora da investida e não pise no fogo que fica no chão.' },
  iara: { faz: 'Fica de longe e canta: atira corações que deixam você lento.', dica: 'Chegue perto e acabe com ela primeiro, ou desvie dos corações andando de lado.' },
  lobisomem: { faz: 'Marca o chão onde você está e salta em cima. Regenera vida com o tempo.', dica: 'Saia do círculo marcado. Bata sem parar para ele não se curar.' },
  boto: { faz: 'Galã de terno branco: atira corações em leque e se teletransporta para perto.', dica: 'Os corações deixam você lento. Fique em movimento e bata quando ele reaparecer.' },
  mapinguari: { faz: 'Gigante lento, com muita vida e uma boca na barriga. Solta um anel de pedras em volta.', dica: 'Não brigue colado quando ele se preparar: passe entre as pedras ou esquive.' },
  pisadeira: { faz: 'Quase invisível. Chega de mansinho e pula em cima quando você está parado.', dica: 'Fique de olho no vulto escuro e não pare de andar.' },
  saciboss: { faz: 'CHEFE. Teleporta para perto e solta um anel de brasas; lança redemoinhos que perseguem você.', dica: 'O círculo no chão mostra onde ele vai aparecer. Fuja dos redemoinhos em vez de atravessar.' },
  mulaboss: { faz: 'CHEFE. Investidas em linha reta com rastro de fogo e rajadas de brasas em leque.', dica: 'Esquive para o lado na investida. O fogo no chão dura alguns segundos.' },
  iaraboss: { faz: 'CHEFE. O canto puxa você para perto; depois vêm ondas de corações e poças no chão.', dica: 'Ande contra o puxão e guarde a esquiva para sair das poças.' },
  loboboss: { faz: 'CHEFE. Salta em cima de você, investe e chama a alcateia. Regenera vida.', dica: 'Saia do círculo marcado antes do salto. Dano constante impede a cura.' },
  cuca: { faz: 'CHEFE. A bruxa jacaré: espirais de feitiço, poças de poção e ajudantes invocados.', dica: 'Gire junto com a espiral, sempre no mesmo sentido, e limpe os ajudantes logo.' },
  botoboss: { faz: 'CHEFE. Dança, teleporta e enche a tela de corações que deixam lento.', dica: 'Procure os vãos entre os corações. Lento, você vira alvo fácil.' },
  mapinguariboss: { faz: 'CHEFE. Pisões que soltam ondas de pedras em volta e salto esmagador.', dica: 'Fique na distância em que dá para passar entre as pedras.' },
  pisadeiraboss: { faz: 'CHEFE. Some na escuridão, reaparece em cima de você e solta anéis de pesadelo.', dica: 'Nunca fique parado. O círculo no chão avisa onde ela cai.' },
  curupiraboss: { faz: 'CHEFE. Rápido demais: investidas seguidas, linhas de fogo e chama os filhotes.', dica: 'Guarde a esquiva para a segunda investida — ele sempre emenda outra.' },
  boitata: { faz: 'CHEFE FINAL. A cobra de fogo: o corpo inteiro queima, e ela cospe linhas de fogo, anéis e espirais.', dica: 'Não cruze o corpo da cobra. Fique perto da cabeça só o tempo de bater.' },
};
const BIOME_MUSIC = { mata: 'capoeira', sertao: 'baiao', vila: 'funk', pantanal: 'samba', amazonia: 'carimbo', coracao: 'maracatu' };

// ----- Mapas: cada um é uma fase INFINITA -----
// fase = de qual ponto da lista PHASES saem as criaturas e os chefes; k0 = ameaça inicial;
// chefes = quantos chefes do próprio mapa é preciso derrubar para liberar o mapa seguinte.
const MAPAS = [
  { id: 'mata', name: 'Mata Atlântica', biome: 'mata', fase: 0, k0: 0, chefes: 2, desc: 'Onde tudo começa. Caiporas, Sacis e Curupiras entre ipês e palmitos.' },
  { id: 'sertao', name: 'Sertão', biome: 'sertao', fase: 2, k0: 0.4, chefes: 2, desc: 'Sol de rachar e chão rachado. A Mula sem Cabeça corre solta.' },
  { id: 'vila', name: 'Vila Assombrada', biome: 'vila', fase: 4, k0: 0.8, chefes: 1, desc: 'Noite de lobisomem no calçamento de pedra. É aqui que mora a Cuca.' },
  { id: 'pantanal', name: 'Pantanal', biome: 'pantanal', fase: 5, k0: 1.1, chefes: 2, desc: 'Água pelo joelho. O Boto encanta e o Mapinguari esmaga.' },
  { id: 'amazonia', name: 'Amazônia', biome: 'amazonia', fase: 7, k0: 1.4, chefes: 2, desc: 'Mata fechada. A Pisadeira só espera você parar.' },
  { id: 'coracao', name: 'Coração da Mata', biome: 'coracao', fase: 9, k0: 1.7, chefes: 1, desc: 'Cinza e brasa. O Boitatá em pessoa.' },
];
const ETAPA_T = 100; // a cada 100s a ameaça sobe um degrau...
const CHEFE_EM = 65; // ...e aos 65s de cada etapa chega um chefe
