'use strict';
// ===== Lógica do jogo: mapa, turnos, combate, criaturas =====
const W = 56, H = 32, MAX_FLOOR = 5, INV_MAX = 6;
const DIRS8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
const idx = (x, y) => y * W + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const sign = v => (v > 0) - (v < 0);

let G = null;
const FX = { floats: [], shake: 0 }; // efeitos visuais lidos pelo ui.js

// --- texto ---
const the = m => `${m.art} ${m.name}`;
const The = m => { const s = the(m); return s[0].toUpperCase() + s.slice(1); };
const ofThe = m => `${m.art === 'a' ? 'da' : 'do'} ${m.name}`;
function log(text, cls = '') {
  G.log.push({ text, cls });
  if (G.log.length > 80) G.log.shift();
}
function floatText(x, y, text, color) {
  FX.floats.push({ x, y, text, color, born: performance.now() });
}

// --- consultas do mapa ---
const walkable = (x, y) => inb(x, y) && TILE_INFO[G.map.tiles[idx(x, y)]].walk;
const opaque = (x, y) => !inb(x, y) || TILE_INFO[G.map.tiles[idx(x, y)]].opaque;
const monsterAt = (x, y) => G.monsters.find(m => m.hp > 0 && m.x === x && m.y === y);
const occupied = (x, y) => (G.player.x === x && G.player.y === y) || !!monsterAt(x, y);

// ===== Novo jogo =====
function makePlayer() {
  return {
    x: 0, y: 0, hp: 36, maxHp: 36, atk: 4, def: 1, crit: 0.05, dodge: 0.05, vision: 8,
    level: 1, xp: 0, xpNext: 16, inv: [], shield: 0,
    regenEvery: 0, killHeal: 0, doubleHit: 0, potionBonus: 0, perks: {}, flash: 0,
  };
}

function newGame() {
  RNG.seed = (Date.now() % 2147483646) + 1;
  G = {
    floor: 1, turn: 0, kills: 0, player: makePlayer(), map: null, monsters: [], items: [],
    log: [], seenTypes: new Set(), state: 'play', perkChoices: null, pendingLevels: 0, dmap: null,
  };
  buildFloor();
  log('Você entra na mata. Dizem que quem chegar ao coração dela e acalmar o Boitatá quebra a maldição.', 'lore');
}

// ===== Geração de mapa (autômato celular) =====
function largestRegion(t) {
  const mark = new Uint8Array(W * H);
  let best = [];
  for (let s = 0; s < W * H; s++) {
    if (t[s] === TILE.WALL || mark[s]) continue;
    const q = [s]; mark[s] = 1;
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of DIRS8) {
        const nx = x + dx, ny = y + dy;
        if (!inb(nx, ny)) continue;
        const j = idx(nx, ny);
        if (t[j] !== TILE.WALL && !mark[j]) { mark[j] = 1; q.push(j); }
      }
    }
    if (q.length > best.length) best = q;
  }
  return best;
}

function blob(m, region, tile, len) {
  const start = RNG.pick(region);
  let x = start % W, y = (start / W) | 0;
  for (let s = 0; s < len; s++) {
    const j = idx(x, y);
    if (m.tiles[j] === TILE.FLOOR) m.tiles[j] = tile;
    const [dx, dy] = RNG.pick(DIRS8);
    const nx = x + dx, ny = y + dy;
    if (inb(nx, ny) && m.tiles[idx(nx, ny)] !== TILE.WALL) { x = nx; y = ny; }
  }
}

function generateMap(floor) {
  let best = null;
  for (let attempt = 0; attempt < 200; attempt++) {
    const t = new Uint8Array(W * H);
    const fill = floor === MAX_FLOOR ? 0.40 : 0.46;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      t[idx(x, y)] = edge || RNG.next() < fill ? TILE.WALL : TILE.FLOOR;
    }
    for (let it = 0; it < 5; it++) {
      const n = new Uint8Array(t);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        let c = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (t[idx(x + dx, y + dy)] === TILE.WALL) c++;
        n[idx(x, y)] = c >= 5 ? TILE.WALL : TILE.FLOOR;
      }
      t.set(n);
    }
    const region = largestRegion(t);
    if (!best || region.length > best.region.length) best = { t, region };
    if (region.length >= W * H * 0.40) break;
  }
  const m = {
    tiles: best.t, variant: new Uint8Array(W * H), seen: new Uint8Array(W * H),
    visible: new Uint8Array(W * H), fire: new Uint8Array(W * H), region: best.region,
  };
  const keep = new Uint8Array(W * H);
  for (const i of best.region) keep[i] = 1;
  for (let i = 0; i < W * H; i++) {
    if (!keep[i]) m.tiles[i] = TILE.WALL;
    m.variant[i] = RNG.int(0, 3);
  }
  const lakes = floor <= 2 ? 1 : floor < MAX_FLOOR ? 4 : 0;
  for (let l = 0; l < lakes; l++) blob(m, m.region, TILE.WATER, RNG.int(25, 55));
  const patches = floor === MAX_FLOOR ? 2 : 6;
  for (let g = 0; g < patches; g++) blob(m, m.region, TILE.GRASS, RNG.int(12, 28));
  return m;
}

function bfs(m, sx, sy) {
  const d = new Int32Array(W * H).fill(-1);
  const q = [idx(sx, sy)];
  d[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of DIRS8) {
      const nx = x + dx, ny = y + dy;
      if (!inb(nx, ny)) continue;
      const j = idx(nx, ny);
      if (d[j] !== -1 || !TILE_INFO[m.tiles[j]].walk) continue;
      d[j] = d[i] + 1; q.push(j);
    }
  }
  return d;
}

function nearWater(m, i) {
  const x = i % W, y = (i / W) | 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (inb(x + dx, y + dy) && m.tiles[idx(x + dx, y + dy)] === TILE.WATER) return true;
  }
  return false;
}

function pickMonsterType(f) {
  const pool = Object.entries(MONSTERS)
    .filter(([, d]) => !d.boss && d.minFloor <= f && (d.maxFloor || 99) >= f)
    .map(([k, d]) => [k, d.weight]);
  return RNG.weighted(pool);
}

function makeMonster(type, x, y) {
  const d = MONSTERS[type];
  const depth = d.boss ? 0 : Math.max(0, G.floor - d.minFloor);
  const hp = Math.round(d.hp * (1 + 0.12 * depth));
  return {
    type, x, y, name: d.name, art: d.art, glyph: d.glyph, color: d.color,
    hp, maxHp: hp, atk: d.atk + Math.floor(depth / 2), def: d.def, dodge: d.dodge || 0,
    speed: d.speed || 1, energy: 0, xp: Math.round(d.xp * (1 + 0.1 * depth)), ai: d.ai || 'basic',
    cd: 0, alert: false, lastSeen: -99, pacified: 0, loot: [], boss: !!d.boss,
    fireImmune: !!d.fireImmune, regen: d.regen || 0, flash: 0,
  };
}

function buildFloor() {
  const f = G.floor;
  const m = generateMap(f);
  G.map = m; G.monsters = []; G.items = [];
  const floorCells = m.region.filter(i => m.tiles[i] === TILE.FLOOR);
  const start = RNG.pick(floorCells.length ? floorCells : m.region);
  const p = G.player;
  p.x = start % W; p.y = (start / W) | 0;
  if (m.tiles[start] !== TILE.FLOOR) m.tiles[start] = TILE.FLOOR;

  const dist = bfs(m, p.x, p.y);
  let far = start;
  for (const i of m.region) if (dist[i] > dist[far]) far = i;
  if (f < MAX_FLOOR) m.tiles[far] = TILE.STAIRS;
  m.stairs = far;

  const used = new Set([start, far]);
  const candidates = RNG.shuffle(m.region.filter(i => dist[i] >= 9));
  const takeCell = pred => {
    for (const i of candidates) {
      if (used.has(i) || (pred && !pred(i))) continue;
      used.add(i); return i;
    }
    return -1;
  };

  if (f === MAX_FLOOR) G.monsters.push(makeMonster('boitata', far % W, (far / W) | 0));
  const count = f === MAX_FLOOR ? 5 : 4 + f * 2;
  for (let n = 0; n < count; n++) {
    const type = pickMonsterType(f);
    const cell = MONSTERS[type].nearWater ? takeCell(i => nearWater(m, i)) : takeCell();
    if (cell < 0) continue;
    G.monsters.push(makeMonster(type, cell % W, (cell / W) | 0));
  }

  const itemCells = RNG.shuffle(m.region.filter(i => !used.has(i) && m.tiles[i] !== TILE.STAIRS));
  let k = 0;
  const nItems = RNG.int(3, 5);
  for (let n = 0; n < nItems && k < itemCells.length; n++, k++) {
    G.items.push({ x: itemCells[k] % W, y: (itemCells[k] / W) | 0, key: RNG.weighted(CONSUMABLE_WEIGHTS) });
  }
  if (f < MAX_FLOOR && RNG.chance(0.6) && k < itemCells.length) {
    G.items.push({ x: itemCells[k] % W, y: (itemCells[k] / W) | 0, key: RNG.pick(['facao', 'gibao']) });
  }
  computeFOV();
  noticeMonsters();
}

// ===== Campo de visão (raycasting) =====
function computeFOV() {
  const m = G.map, p = G.player, r = p.vision;
  m.visible.fill(0);
  m.visible[idx(p.x, p.y)] = 1; m.seen[idx(p.x, p.y)] = 1;
  for (let a = 0; a < 360; a += 1) {
    const rad = a * Math.PI / 180, dx = Math.cos(rad) * 0.5, dy = Math.sin(rad) * 0.5;
    let x = p.x + 0.5, y = p.y + 0.5;
    for (let s = 0; s < r * 2; s++) {
      x += dx; y += dy;
      const ix = Math.floor(x), iy = Math.floor(y);
      if (!inb(ix, iy)) break;
      const i = idx(ix, iy);
      m.visible[i] = 1; m.seen[i] = 1;
      if (TILE_INFO[m.tiles[i]].opaque && !(ix === p.x && iy === p.y)) break;
    }
  }
}

function noticeMonsters() {
  for (const m of G.monsters) {
    if (!G.map.visible[idx(m.x, m.y)]) continue;
    m.alert = true; m.lastSeen = G.turn;
    if (!G.seenTypes.has(m.type)) {
      G.seenTypes.add(m.type);
      log(MONSTERS[m.type].lore, 'lore');
    }
  }
}

function line(x0, y0, x1, y1) {
  const pts = [];
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  for (;;) {
    pts.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return pts;
}

function clearLine(a, b) {
  const pts = line(a.x, a.y, b.x, b.y);
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    if (!walkable(x, y) || opaque(x, y) || occupied(x, y)) return false;
  }
  return true;
}

// ===== Combate =====
function attack(att, def, bonus = 0) {
  const p = G.player, isP = att === p;
  if (RNG.chance(Math.min(0.6, def.dodge || 0))) {
    floatText(def.x, def.y, 'esquiva', '#9ac');
    log(isP ? `${The(def)} se esquiva do seu golpe.` : `Você se esquiva do ataque ${ofThe(att)}.`, isP ? '' : 'good');
    SFX.miss();
    return;
  }
  let dmg = Math.max(1, att.atk + bonus + RNG.int(-1, 2) - (def.def || 0));
  let crit = false;
  if (isP && RNG.chance(p.crit)) { dmg *= 2; crit = true; }
  if (isP) {
    log(crit ? `CRÍTICO! Você acerta ${the(def)} (${dmg}).` : `Você acerta ${the(def)} (${dmg}).`, crit ? 'good' : '');
    SFX.hit();
  } else {
    log(`${The(att)} te acerta (${dmg}).`, 'bad');
  }
  damage(def, dmg, crit);
  return true;
}

function damage(t, dmg, crit = false) {
  const p = G.player;
  if (t === p) {
    if (p.shield > 0) {
      const ab = Math.min(p.shield, dmg);
      p.shield -= ab; dmg -= ab;
      floatText(p.x, p.y, `(${ab})`, '#ffd84a');
      if (p.shield === 0) log('Seu patuá se desfaz.', 'bad');
    }
    if (dmg <= 0) return;
    p.hp -= dmg; p.flash = performance.now();
    FX.shake = Math.min(9, 2 + dmg / 2);
    floatText(p.x, p.y, `-${dmg}`, '#ff5c5c');
    SFX.hurt();
    if (p.hp <= 0) { p.hp = 0; die(); }
  } else {
    if (t.hp <= 0) return;
    t.hp -= dmg; t.flash = performance.now(); t.alert = true; t.lastSeen = G.turn; t.pacified = 0;
    floatText(t.x, t.y, crit ? `${dmg}!` : `${dmg}`, crit ? '#ffd23f' : '#ffffff');
    if (crit) FX.shake = 4;
    if (t.hp <= 0) killMonster(t);
  }
}

function heal(n) {
  const p = G.player;
  const real = Math.min(n, p.maxHp - p.hp);
  if (real <= 0) return;
  p.hp += real;
  floatText(p.x, p.y, `+${real}`, '#6aff8a');
}

function dropItem(x, y, key) { G.items.push({ x, y, key }); }

function killMonster(m) {
  m.hp = 0;
  G.monsters = G.monsters.filter(x => x !== m);
  G.kills++;
  log(`${The(m)} foi derrotad${m.art === 'a' ? 'a' : 'o'}!${m.xp ? ` (+${m.xp} XP)` : ''}`, 'good');
  SFX.kill();
  if (m.loot.length) log(`${The(m)} deixou cair o que tinha roubado.`, 'good');
  for (const key of m.loot) dropItem(m.x, m.y, key);
  if (!m.boss && RNG.chance(0.12)) dropItem(m.x, m.y, 'garrafada');
  if (G.player.killHeal) heal(G.player.killHeal);
  if (m.boss) { win(); return; }
  gainXp(m.xp);
}

function gainXp(n) {
  const p = G.player;
  p.xp += n;
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.level++;
    p.xpNext = Math.round(p.xpNext * 1.4);
    p.maxHp += 4; p.hp = Math.min(p.maxHp, p.hp + 4);
    G.pendingLevels++;
    log(`Você subiu para o nível ${p.level}!`, 'level');
  }
}

function openPerk() {
  G.pendingLevels--;
  G.perkChoices = RNG.shuffle(PERKS.slice()).slice(0, 3);
  G.state = 'perk';
  SFX.level();
}

function choosePerk(i) {
  if (G.state !== 'perk' || !G.perkChoices[i]) return;
  const perk = G.perkChoices[i], p = G.player;
  perk.apply(p);
  p.perks[perk.id] = (p.perks[perk.id] || 0) + 1;
  log(`Talento: ${perk.name} — ${perk.desc}.`, 'level');
  G.perkChoices = null;
  G.state = 'play';
  if (G.pendingLevels > 0) openPerk();
}

function die() {
  G.state = 'dead';
  SFX.death();
  log('Você caiu na mata...', 'bad');
  const best = +(localStorage.getItem('mata-best') || 0);
  if (G.floor > best) localStorage.setItem('mata-best', G.floor);
}

function win() {
  G.state = 'won';
  SFX.win();
  log('O Boitatá se apaga lentamente. A mata respira de novo. A maldição foi quebrada!', 'level');
  localStorage.setItem('mata-best', MAX_FLOOR + 1);
}

// ===== Ações do jogador =====
function pickup() {
  const p = G.player;
  const here = G.items.filter(it => it.x === p.x && it.y === p.y);
  let got = false;
  for (const it of here) {
    const d = ITEMS[it.key];
    if (d.equip) {
      d.apply(p);
      log(`Você pega: ${d.name} (${d.desc}).`, 'good');
    } else if (p.inv.length < INV_MAX) {
      p.inv.push(it.key);
      log(`Você pega: ${d.name}.`, 'good');
    } else {
      log(`Mochila cheia! ${d.name} fica no chão.`, 'hint');
      continue;
    }
    G.items.splice(G.items.indexOf(it), 1);
    got = true;
  }
  if (got) SFX.pickup();
}

function tryMove(dx, dy) {
  if (G.state !== 'play') return;
  const p = G.player, nx = p.x + dx, ny = p.y + dy;
  const m = monsterAt(nx, ny);
  if (m) {
    attack(p, m);
    if (m.hp > 0 && p.doubleHit > 0 && RNG.chance(p.doubleHit)) {
      log('Golpe duplo!', 'good');
      attack(p, m);
    }
    endTurn();
    return;
  }
  if (!walkable(nx, ny)) return;
  p.x = nx; p.y = ny;
  pickup();
  if (G.map.tiles[idx(nx, ny)] === TILE.STAIRS) log('Uma trilha desce mais fundo na mata. Aperte Enter para descer.', 'hint');
  endTurn();
}

function waitTurn() { if (G.state === 'play') endTurn(); }

function useItem(i) {
  if (G.state !== 'play') return;
  const p = G.player, key = p.inv[i];
  if (!key) return;
  if (ITEMS[key].use(p) === false) return;
  p.inv.splice(i, 1);
  SFX.use();
  endTurn();
}

function descend() {
  if (G.state !== 'play') return;
  const p = G.player;
  if (G.map.tiles[idx(p.x, p.y)] !== TILE.STAIRS) { log('Não há trilha para descer aqui. Procure o ▼.', 'hint'); return; }
  G.floor++;
  buildFloor();
  heal(Math.round(p.maxHp * 0.15));
  SFX.descend();
  log(`— Andar ${G.floor}: ${biomeOf(G.floor).name} —`, 'level');
  if (G.floor === MAX_FLOOR) log('O ar está quente. Você sente o Boitatá por perto...', 'lore');
}

// ===== Turno das criaturas =====
function endTurn() {
  if (G.state === 'dead' || G.state === 'won') return;
  G.turn++;
  const p = G.player;
  if (p.regenEvery > 0 && G.turn % p.regenEvery === 0 && p.hp < p.maxHp) p.hp++;
  G.dmap = bfs(G.map, p.x, p.y);

  for (const m of G.monsters.slice()) {
    if (m.hp <= 0) continue;
    if (m.cd > 0) m.cd--;
    if (m.pacified > 0) m.pacified--;
    if (m.regen && m.hp < m.maxHp) m.hp = Math.min(m.maxHp, m.hp + m.regen);
    const speed = m.boss && m.hp < m.maxHp / 2 ? 1.5 : m.speed;
    m.energy += speed;
    while (m.energy >= 1 && m.hp > 0 && G.state !== 'dead' && G.state !== 'won') {
      m.energy -= 1;
      monsterAct(m);
    }
    if (G.state === 'dead') break;
  }

  // fogo
  const fire = G.map.fire;
  if (G.state !== 'dead' && fire[idx(p.x, p.y)] > 0) {
    log('Você está pegando fogo!', 'bad');
    damage(p, 3);
  }
  for (const m of G.monsters.slice()) {
    if (m.hp > 0 && !m.fireImmune && fire[idx(m.x, m.y)] > 0) damage(m, 3);
  }
  for (let i = 0; i < fire.length; i++) if (fire[i] > 0) fire[i]--;

  computeFOV();
  noticeMonsters();
  if (G.state === 'play' && G.pendingLevels > 0) openPerk();
}

function wander(m) {
  const opts = DIRS8.map(([dx, dy]) => [m.x + dx, m.y + dy]).filter(([x, y]) => walkable(x, y) && !occupied(x, y));
  if (opts.length) { const [x, y] = RNG.pick(opts); m.x = x; m.y = y; }
}

function moveToward(m) {
  const d = G.dmap;
  let bestV = d[idx(m.x, m.y)], best = null;
  if (bestV < 0) { wander(m); return; }
  for (const [dx, dy] of DIRS8) {
    const x = m.x + dx, y = m.y + dy;
    if (!inb(x, y)) continue;
    const v = d[idx(x, y)];
    if (v < 0 || occupied(x, y)) continue;
    if (v < bestV) { bestV = v; best = [x, y]; }
  }
  if (best) { m.x = best[0]; m.y = best[1]; }
}

function teleportNear(m) {
  const p = G.player;
  const opts = DIRS8.map(([dx, dy]) => [p.x + dx, p.y + dy]).filter(([x, y]) => walkable(x, y) && !occupied(x, y));
  if (!opts.length) return false;
  floatText(m.x, m.y, '~', '#ff4a3a');
  [m.x, m.y] = RNG.pick(opts);
  return true;
}

function teleportFar(m) {
  const p = G.player;
  const opts = G.map.region.filter(i => {
    const x = i % W, y = (i / W) | 0;
    return Math.max(Math.abs(x - p.x), Math.abs(y - p.y)) >= 8 && !occupied(x, y);
  });
  if (!opts.length) return;
  const i = RNG.pick(opts);
  m.x = i % W; m.y = (i / W) | 0;
}

function monsterAct(m) {
  const p = G.player;
  const dist = cheb(m, p);
  const sees = G.map.visible[idx(m.x, m.y)] === 1;
  if (sees) { m.alert = true; m.lastSeen = G.turn; }
  else if (m.alert && G.turn - m.lastSeen > 12) m.alert = false;

  if (m.pacified > 0) { if (RNG.chance(0.5)) wander(m); return; }
  if (!m.alert) { if (RNG.chance(0.5)) wander(m); return; }

  switch (m.ai) {
    case 'saci':
      if (m.cd <= 0 && sees && dist > 2 && teleportNear(m)) {
        m.cd = 5;
        log('O Saci some num redemoinho e aparece do seu lado!', 'bad');
        SFX.whoosh();
        return;
      }
      break;
    case 'charge': {
      const aligned = m.x === p.x || m.y === p.y || Math.abs(m.x - p.x) === Math.abs(m.y - p.y);
      if (m.cd <= 0 && sees && dist >= 2 && dist <= 7 && aligned && clearLine(m, p)) {
        charge(m); m.cd = 6; return;
      }
      break;
    }
    case 'iara':
      if (m.cd <= 0 && sees && dist >= 2 && dist <= 7) { pull(m); m.cd = 5; return; }
      break;
    case 'boss':
      if (m.cd <= 0 && sees && dist >= 2 && dist <= 7 && clearLine(m, p)) {
        breath(m); m.cd = m.hp < m.maxHp / 2 ? 2 : 3; return;
      }
      break;
  }

  if (dist === 1) {
    const hit = attack(m, p);
    if (hit && m.ai === 'saci' && p.inv.length && G.state === 'play' && RNG.chance(0.35)) {
      const [key] = p.inv.splice(RNG.int(0, p.inv.length - 1), 1);
      m.loot.push(key);
      log(`O Saci roubou sua ${ITEMS[key].name} e sumiu dando risada!`, 'bad');
      SFX.whoosh();
      teleportFar(m);
      m.cd = 6;
    }
    return;
  }
  moveToward(m);
}

function charge(m) {
  const p = G.player;
  const path = line(m.x, m.y, p.x, p.y).slice(1, -1);
  log(`${The(m)} dispara na sua direção, cuspindo fogo!`, 'bad');
  for (const [x, y] of path) G.map.fire[idx(x, y)] = Math.max(G.map.fire[idx(x, y)], 4);
  const [lx, ly] = path[path.length - 1];
  m.x = lx; m.y = ly;
  FX.shake = 6;
  SFX.charge();
  attack(m, p, 3);
}

function pull(m) {
  const p = G.player;
  log(`${The(m)} canta... a voz dela te puxa para perto!`, 'bad');
  SFX.sing();
  for (let s = 0; s < 2; s++) {
    const nx = p.x + sign(m.x - p.x), ny = p.y + sign(m.y - p.y);
    if (!walkable(nx, ny) || occupied(nx, ny)) break;
    p.x = nx; p.y = ny;
  }
  computeFOV();
  G.dmap = bfs(G.map, p.x, p.y);
}

function breath(m) {
  const p = G.player;
  log('O Boitatá abre a boca e cospe fogo!', 'bad');
  SFX.fire();
  FX.shake = 5;
  let hitPlayer = false;
  for (const [x, y] of line(m.x, m.y, p.x, p.y).slice(1)) {
    G.map.fire[idx(x, y)] = Math.max(G.map.fire[idx(x, y)], 4);
    if (x === p.x && y === p.y) hitPlayer = true;
  }
  if (!hitPlayer) return;
  if (RNG.chance(p.dodge)) log('Você se joga no chão e escapa das chamas!', 'good');
  else damage(p, 7 + RNG.int(0, 3));
}
