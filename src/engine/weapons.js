'use strict';
// ===== Golpes: ataques automáticos. Cada um tem 5 níveis. =====
// dmg[n] e cd[n] por nível (índice 0 = nível 1). notes[n] = o que muda naquele nível.

function aimAt(w, range = 600) {
  const p = w.player;
  const e = w.nearest(p.x, p.y, range);
  return e ? Math.atan2(e.y - p.y, e.x - p.x) : p.facing;
}

// golpe em arco (meia-lua, peixeira, queda...)
function arcHit(w, g, ang, spread, range, base, opts = {}) {
  const p = w.player;
  const hits = w.queryEnemies(p.x, p.y, range);
  for (const e of hits) {
    const a = Math.atan2(e.y - p.y, e.x - p.x);
    const d = Math.sqrt(dist2(e, p));
    if (d > e.r + 10 && Math.abs(angDiff(ang, a)) > spread / 2) continue;
    w.hit(e, base, GOLPES[g.id].tag, { ...opts, kx: Math.cos(a), ky: Math.sin(a), src: g.id });
  }
  w.fx.push({ kind: 'arc', x: p.x, y: p.y, ang, spread, r: range, life: 0.18, max: 0.18, color: opts.color || '#fff', follow: true });
}

function ringHit(w, g, radius, base, opts = {}) {
  const p = w.player;
  for (const e of w.queryEnemies(p.x, p.y, radius)) {
    const a = Math.atan2(e.y - p.y, e.x - p.x);
    w.hit(e, base, GOLPES[g.id].tag, { ...opts, kx: Math.cos(a), ky: Math.sin(a), src: g.id });
  }
}

const GOLPES = {
  // ---------------- CAPOEIRA ----------------
  armada: {
    name: 'Armada', tag: 'capoeira', art: 'armada',
    desc: 'Giro com a perna esticada: acerta tudo ao seu redor e empurra.',
    dmg: [19, 25, 33, 42, 57], cd: [1.15, 1.08, 1.01, 0.94, 0.84],
    notes: ['', '+dano', 'Gira duas vezes', '+dano, recarga menor', '+25% de alcance'],
    fire(w, g, lv) {
      const r = 98 * w.golpeArea(g) * (lv >= 5 ? 1.25 : 1);
      const spin = () => {
        ringHit(w, g, r, this.dmg[lv - 1], { knock: 200 });
        w.act('spin', 0.28);
        w.fx.push({ kind: 'spin', x: w.player.x, y: w.player.y, r, life: 0.25, max: 0.25, color: '#f2c14e', follow: true });
      };
      spin();
      if (lv >= 3) w.later(0.22, spin);
      w.sfx('swing'); w.sfx('ginga');
    },
  },
  meialua: {
    name: 'Meia-Lua de Compasso', tag: 'capoeira', art: 'meialua',
    desc: 'Chute giratório em arco na direção do inimigo mais próximo. Empurra forte.',
    dmg: [27, 35, 45, 58, 76], cd: [1.3, 1.22, 1.14, 1.06, 0.95],
    notes: ['', '+dano', 'Chuta para frente e para trás', '+dano', '+30% de alcance'],
    fire(w, g, lv) {
      const ang = aimAt(w), r = 115 * w.golpeArea(g) * (lv >= 5 ? 1.3 : 1);
      arcHit(w, g, ang, 2.4, r, this.dmg[lv - 1], { knock: 300, color: '#f2c14e' });
      w.act('kick', 0.26, ang);
      if (lv >= 3) arcHit(w, g, ang + Math.PI, 2.4, r, this.dmg[lv - 1], { knock: 300, color: '#f2c14e' });
      w.sfx('swing'); w.sfx('ginga');
    },
  },
  rasteira: {
    name: 'Rasteira', tag: 'capoeira', art: 'rasteira',
    desc: 'Varre o chão em volta: pouco dano, mas derruba (atordoa) os inimigos.',
    dmg: [10, 13, 17, 22, 29], cd: [2.6, 2.45, 2.3, 2.15, 2.0],
    notes: ['', '+dano', '+atordoamento', '+dano', 'Atordoa por muito mais tempo'],
    fire(w, g, lv) {
      const r = 100 * w.golpeArea(g);
      const stun = (lv >= 5 ? 1.6 : lv >= 3 ? 1.1 : 0.8);
      ringHit(w, g, r, this.dmg[lv - 1], { stun, knock: 40 });
      w.act('sweep', 0.32);
      w.fx.push({ kind: 'ring', x: w.player.x, y: w.player.y, r, life: 0.3, max: 0.3, color: '#ffe08a' });
      w.sfx('swing');
    },
  },
  berimbau: {
    name: 'Toque de Berimbau', tag: 'capoeira', art: 'berimbau',
    desc: 'Uma onda sonora se espalha, ferindo e afastando todo mundo.',
    dmg: [14, 19, 25, 32, 42], cd: [3.6, 3.4, 3.2, 3.0, 2.7],
    notes: ['', '+dano', 'Duas ondas', '+dano', 'Onda muito maior'],
    fire(w, g, lv) {
      const r = 260 * w.golpeArea(g) * (lv >= 5 ? 1.35 : 1);
      const wave = () => w.areas.push({
        kind: 'wave', x: w.player.x, y: w.player.y, r: 0, maxR: r, grow: r / 0.6, life: 0.6,
        base: this.dmg[lv - 1], tag: 'capoeira', src: g.id, hitSet: new Set(), knock: 260, color: '#f2c14e',
      });
      wave();
      w.act('cast', 0.35);
      if (lv >= 3) w.later(0.35, wave);
      w.sfx('berimbau');
    },
  },

  // ---------------- JIU-JITSU ----------------
  kimura: {
    name: 'Kimura', tag: 'jiujitsu', art: 'kimura',
    desc: 'Avança no inimigo mais próximo, agarra, trava o braço e atordoa.',
    dmg: [30, 40, 52, 66, 88], cd: [1.7, 1.6, 1.5, 1.4, 1.25],
    notes: ['', '+dano', 'Agarra 2 inimigos', '+dano', 'Agarra 3 inimigos'],
    fire(w, g, lv) {
      const p = w.player, n = lv >= 5 ? 3 : lv >= 3 ? 2 : 1;
      const range = 170 * w.golpeArea(g);
      const first = w.nearest(p.x, p.y, range);
      if (!first) return;
      const grab = () => {
        let targets = w.queryEnemies(p.x, p.y, 80 * w.golpeArea(g)).sort((a, b) => dist2(a, p) - dist2(b, p));
        if (!first.dead) targets = [first, ...targets.filter(e => e !== first)];
        targets = targets.slice(0, n);
        for (const e of targets) {
          w.hit(e, this.dmg[lv - 1], 'jiujitsu', { stun: 0.9, src: g.id });
          w.fx.push({ kind: 'grab', x: p.x, y: p.y, tx: e.x, ty: e.y, life: 0.3, max: 0.3, color: '#9b7bff' });
        }
        w.act('grab', 0.3, Math.atan2(first.y - p.y, first.x - p.x));
        if (targets.length) w.sfx('grab');
      };
      if (!w.lungeTo(first, 640, grab)) grab();
    },
  },
  mataleao: {
    name: 'Mata-Leão', tag: 'jiujitsu', art: 'mataleao',
    desc: 'Pula nas costas do inimigo mais ferido por perto e estrangula. Tira % da vida máxima dele.',
    dmg: [28, 36, 45, 56, 72], cd: [2.8, 2.6, 2.4, 2.2, 2.0],
    pctHp: [0.06, 0.07, 0.08, 0.09, 0.12],
    notes: ['', '+dano', '+% de vida', '+dano', 'Muito mais % de vida'],
    fire(w, g, lv) {
      const p = w.player, range = 190 * w.golpeArea(g);
      const cands = w.queryEnemies(p.x, p.y, range);
      if (!cands.length) return;
      cands.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
      const e = cands[0];
      const choke = () => {
        if (e.dead) return;
        const pctv = this.pctHp[lv - 1] * (e.boss ? 0.15 : e.elite ? 0.4 : 1);
        w.hit(e, this.dmg[lv - 1] + e.maxHp * pctv, 'jiujitsu', { stun: 0.6, src: g.id });
        w.fx.push({ kind: 'grab', x: p.x, y: p.y, tx: e.x, ty: e.y, life: 0.35, max: 0.35, color: '#c9b3ff' });
        w.act('grab', 0.35, Math.atan2(e.y - p.y, e.x - p.x));
        w.sfx('grab');
      };
      if (!w.lungeTo(e, 640, choke)) choke();
    },
  },
  guarda: {
    name: 'Guarda Fechada', tag: 'jiujitsu', art: 'guarda',
    desc: 'Cria uma barreira que absorve dano. Quem encosta nela apanha.',
    dmg: [10, 14, 18, 23, 30], cd: [7, 6.5, 6, 5.5, 5],
    shield: [14, 20, 27, 35, 46],
    notes: ['', '+barreira', '+barreira e +dano', '+barreira', 'Barreira enorme'],
    fire(w, g, lv) {
      const p = w.player;
      const cap = w.stats.maxHp * 0.5;
      p.barrier = Math.min(cap, p.barrier + this.shield[lv - 1] * (1 + w.stats.armor));
      p.barrierDmg = this.dmg[lv - 1];
      w.act('guard', 0.4);
      w.fx.push({ kind: 'ring', x: p.x, y: p.y, r: 30, life: 0.4, max: 0.4, color: '#9b7bff' });
      w.sfx('shield');
    },
  },
  queda: {
    name: 'Queda de Baiana', tag: 'jiujitsu', art: 'queda',
    desc: 'Investida: corre até o inimigo mais próximo, derruba e o impacto atordoa todos em volta (área).',
    dmg: [24, 32, 42, 54, 72], cd: [2.2, 2.05, 1.9, 1.75, 1.6],
    notes: ['', '+dano', 'Impacto 25% maior', '+dano', 'Atordoa mais e investe de mais longe'],
    fire(w, g, lv) {
      const p = w.player;
      const e = w.nearest(p.x, p.y, (lv >= 5 ? 330 : 260) * w.golpeArea(g));
      if (!e) return;
      const slam = () => {
        const r = 100 * w.golpeArea(g) * (lv >= 3 ? 1.25 : 1);
        ringHit(w, g, r, this.dmg[lv - 1], { stun: lv >= 5 ? 1.5 : 1, knock: 160 });
        w.fx.push({ kind: 'boom', x: p.x, y: p.y, r, life: 0.3, max: 0.3, color: '#9b7bff' });
        w.act('slam', 0.34, Math.atan2(e.y - p.y, e.x - p.x));
        w.shake(4);
        w.sfx('swing');
      };
      if (!w.lungeTo(e, 760, slam)) slam();
    },
  },

  // ---------------- MANDINGA ----------------
  fogofatuo: {
    name: 'Fogo-Fátuo', tag: 'mandinga', art: 'fogofatuo',
    desc: 'Chamas azuis que perseguem os inimigos.',
    dmg: [11, 14, 18, 23, 31], cd: [1.05, 1.0, 0.95, 0.9, 0.8],
    notes: ['', '+dano', '+1 chama', '+dano', 'Atravessa inimigos'],
    fire(w, g, lv) {
      const p = w.player;
      const n = 1 + (lv >= 3 ? 1 : 0) + w.stats.projectiles;
      const targets = w.queryEnemies(p.x, p.y, 430).sort((a, b) => dist2(a, p) - dist2(b, p));
      if (!targets.length) return;
      for (let i = 0; i < n; i++) {
        const t = targets[i % targets.length];
        const a = Math.atan2(t.y - p.y, t.x - p.x) + (i - (n - 1) / 2) * 0.35;
        w.projectiles.push({
          kind: 'fatuo', x: p.x, y: p.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, speed: 300, r: 7,
          base: this.dmg[lv - 1], tag: 'mandinga', src: g.id, pierce: (lv >= 5 ? 2 : 0) + w.stats.pierce,
          life: 2.4 * w.stats.duration, homing: 7, target: t, hitSet: new Set(),
        });
      }
      w.act('cast', 0.25, Math.atan2(targets[0].y - p.y, targets[0].x - p.x));
      w.sfx('magic');
    },
  },
  patua: {
    name: 'Patuá Protetor', tag: 'mandinga', art: 'patua',
    desc: 'Amuletos giram ao seu redor e ferem quem tocar neles.',
    dmg: [9, 12, 16, 21, 28], cd: null,
    notes: ['', '+dano', '+1 amuleto', '+dano', '+1 amuleto e gira mais rápido'],
    count(w, lv) { return Math.min(12, 2 + (lv >= 3 ? 1 : 0) + (lv >= 5 ? 1 : 0) + w.stats.projectiles); },
    tick(w, g, lv, dt) {
      const p = w.player;
      g.state.ang = ((g.state.ang || 0) + dt * (lv >= 5 ? 4.2 : 3.2)) % TAU;
      const n = this.count(w, lv), R = 88 * w.golpeArea(g);
      g.state.orbs = [];
      for (let i = 0; i < n; i++) {
        const a = g.state.ang + i * TAU / n;
        const ox = p.x + Math.cos(a) * R, oy = p.y + Math.sin(a) * R;
        g.state.orbs.push([ox, oy]);
        for (const e of w.queryEnemies(ox, oy, 11)) {
          const k = 'patua';
          if ((e.hitCd[k] || 0) > w.time) continue;
          e.hitCd[k] = w.time + 0.45;
          w.hit(e, this.dmg[lv - 1], 'mandinga', { knock: 120, kx: Math.cos(a), ky: Math.sin(a), src: g.id });
        }
      }
    },
  },
  defumacao: {
    name: 'Defumação', tag: 'mandinga', art: 'defumacao',
    desc: 'Nuvens de fumaça de ervas que ferem e deixam lentos os inimigos.',
    dmg: [7, 9, 12, 15, 20], cd: [3.0, 2.85, 2.7, 2.55, 2.3],
    notes: ['', '+dano', 'Nuvens maiores', '+1 nuvem', '+1 nuvem e +dano'],
    fire(w, g, lv) {
      const p = w.player;
      const n = 1 + (lv >= 4 ? 1 : 0) + (lv >= 5 ? 1 : 0);
      const cands = w.queryEnemies(p.x, p.y, 340);
      for (let i = 0; i < n; i++) {
        const t = cands.length ? RNG.pick(cands) : null;
        const x = t ? t.x : p.x + RNG.range(-120, 120), y = t ? t.y : p.y + RNG.range(-120, 120);
        w.areas.push({
          kind: 'smoke', x, y, r: 62 * w.golpeArea(g) * (lv >= 3 ? 1.25 : 1), life: 3 * w.stats.duration,
          max: 3 * w.stats.duration, tick: 0.4, timer: 0, base: this.dmg[lv - 1], tag: 'mandinga', src: g.id, slow: 0.45,
        });
      }
      w.act('cast', 0.3);
      w.sfx('magic');
    },
  },
  garrafada: {
    name: 'Garrafada', tag: 'mandinga', art: 'garrafada',
    desc: 'Arremessa garrafadas que explodem e deixam uma poça que queima.',
    dmg: [24, 32, 42, 54, 72], cd: [2.4, 2.25, 2.1, 1.95, 1.75],
    notes: ['', '+dano', '+1 garrafa', '+dano', 'Explosão maior'],
    fire(w, g, lv) {
      const p = w.player;
      const n = 1 + (lv >= 3 ? 1 : 0) + Math.floor(w.stats.projectiles / 2);
      const cands = w.queryEnemies(p.x, p.y, 380);
      for (let i = 0; i < n; i++) {
        const t = cands.length ? RNG.pick(cands) : null;
        const a = RNG.range(0, TAU);
        const tx = t ? t.x : p.x + Math.cos(a) * 150, ty = t ? t.y : p.y + Math.sin(a) * 150;
        w.projectiles.push({
          kind: 'bottle', x: p.x, y: p.y, sx: p.x, sy: p.y, tx, ty, t: 0, dur: 0.45, r: 6, noCollide: true,
          base: this.dmg[lv - 1], tag: 'mandinga', src: g.id, life: 0.45,
          boom: 70 * w.golpeArea(g) * (lv >= 5 ? 1.35 : 1), puddle: this.dmg[lv - 1] * 0.3,
        });
      }
      w.act('throw', 0.28);
      w.sfx('throw');
    },
  },

  // ---------------- CANGAÇO ----------------
  peixeira: {
    name: 'Peixeira', tag: 'cangaco', art: 'peixeira',
    desc: 'Golpes rápidos de faca em arco. +15% de chance de crítico.',
    dmg: [16, 21, 28, 36, 48], cd: [0.7, 0.66, 0.62, 0.58, 0.52],
    notes: ['', '+dano', 'Corte duplo', '+dano', '+30% de alcance'],
    fire(w, g, lv) {
      const ang = aimAt(w, 300), r = 80 * w.golpeArea(g) * (lv >= 5 ? 1.3 : 1);
      arcHit(w, g, ang, 1.8, r, this.dmg[lv - 1], { extraCrit: 0.15, knock: 90, color: '#ffd0b0' });
      w.act('slash', 0.2, ang);
      if (lv >= 3) w.later(0.12, () => arcHit(w, g, ang, 1.8, r, this.dmg[lv - 1], { extraCrit: 0.15, knock: 90, color: '#ffd0b0' }));
      w.sfx('slash');
    },
  },
  bacamarte: {
    name: 'Bacamarte', tag: 'cangaco', art: 'bacamarte',
    desc: 'Espingarda antiga: dispara uma rajada de chumbinho em leque.',
    dmg: [9, 12, 15, 19, 25], cd: [1.5, 1.42, 1.34, 1.26, 1.15],
    notes: ['', '+dano', '+2 chumbos', '+dano', 'Atravessa mais inimigos'],
    fire(w, g, lv) {
      const p = w.player, ang = aimAt(w, 420);
      const n = 5 + (lv >= 3 ? 2 : 0) + w.stats.projectiles * 2;
      for (let i = 0; i < n; i++) {
        const a = ang + RNG.range(-0.38, 0.38), sp = RNG.range(480, 600);
        w.projectiles.push({
          kind: 'pellet', x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 4,
          base: this.dmg[lv - 1], tag: 'cangaco', src: g.id, pierce: 1 + (lv >= 5 ? 2 : 0) + w.stats.pierce,
          life: 0.42 * w.stats.duration, hitSet: new Set(), knock: 70,
        });
      }
      w.act('shoot', 0.22, ang);
      w.sfx('shot');
    },
  },
  chapeu: {
    name: 'Chapéu de Couro', tag: 'cangaco', art: 'chapeu',
    desc: 'Arremessa o chapéu como bumerangue: vai e volta atravessando tudo.',
    dmg: [18, 24, 31, 40, 54], cd: [2.0, 1.9, 1.8, 1.7, 1.55],
    notes: ['', '+dano', 'Vai mais longe', '+dano', '+1 chapéu'],
    fire(w, g, lv) {
      const p = w.player, ang = aimAt(w, 500);
      const n = 1 + (lv >= 5 ? 1 : 0) + Math.floor(w.stats.projectiles / 2);
      for (let i = 0; i < n; i++) {
        const a = ang + (i - (n - 1) / 2) * 0.5;
        w.projectiles.push({
          kind: 'hat', x: p.x, y: p.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, r: 12, out: true,
          range: (lv >= 3 ? 330 : 260) * w.golpeArea(g), traveled: 0, pierce: 999, spin: 0,
          base: this.dmg[lv - 1], tag: 'cangaco', src: g.id, life: 4, hitSet: new Set(), knock: 80,
        });
      }
      w.act('throw', 0.28, ang);
      w.sfx('throw');
    },
  },

  papoamarelo: {
    name: 'Rifle Papo-Amarelo', tag: 'cangaco', art: 'papoamarelo',
    desc: 'Tiro certeiro no inimigo mais forte por perto: atravessa a fila inteira. +20% de crítico.',
    dmg: [30, 40, 52, 66, 88], cd: [1.8, 1.7, 1.6, 1.5, 1.35],
    notes: ['', '+dano', 'Dois tiros', '+dano', 'Três tiros'],
    fire(w, g, lv) {
      const p = w.player;
      const cands = w.queryEnemies(p.x, p.y, 620);
      if (!cands.length) return;
      cands.sort((a, b) => b.hp - a.hp);
      const n = lv >= 5 ? 3 : lv >= 3 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const t = cands[i % cands.length];
        const a = Math.atan2(t.y - p.y, t.x - p.x);
        w.projectiles.push({
          kind: 'rifle', x: p.x, y: p.y, vx: Math.cos(a) * 950, vy: Math.sin(a) * 950, r: 5,
          base: this.dmg[lv - 1], tag: 'cangaco', src: g.id, pierce: 99, life: 0.75, hitSet: new Set(),
          knock: 120, extraCrit: 0.2,
        });
      }
      w.act('shoot', 0.25, Math.atan2(cands[0].y - p.y, cands[0].x - p.x));
      w.sfx('shot');
    },
  },

  // ---------------- ESPECIAIS (de encantos/sinergias — não aparecem como carta) ----------------
  chinelo: {
    name: 'Chinelo da Mãe', tag: null, art: 'chinelo', hidden: true,
    dmg: [20], cd: [2.0],
    fire(w, g) {
      const p = w.player;
      const cands = w.queryEnemies(p.x, p.y, 520);
      if (!cands.length) return;
      cands.sort((a, b) => b.hp - a.hp);
      const t = cands[0];
      const a = Math.atan2(t.y - p.y, t.x - p.x);
      w.projectiles.push({
        kind: 'chinelo', x: p.x, y: p.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, speed: 520, r: 9,
        base: 20 + 7 * w.level, tag: null, src: 'chinelo', pierce: 0, life: 2, homing: 12, target: t,
        hitSet: new Set(), knock: 220, spin: 0,
      });
      w.sfx('throw');
    },
  },
};
const GOLPE_IDS = Object.keys(GOLPES).filter(k => !GOLPES[k].hidden);

// ===== Especiais: o ataque em área de cada personagem (tecla Q / botão direito) =====
// Dano base cresce com o nível e passa pela mesma fórmula dos golpes (bônus, multiplicadores, crítico).
function specialBase(w) { return 18 + 4 * w.level; }
function areaBlast(w, x, y, r, base, tag, src, opts = {}) {
  for (const e of w.queryEnemies(x, y, r)) {
    const a = Math.atan2(e.y - y, e.x - x);
    w.hit(e, base, tag, { ...opts, kx: Math.cos(a), ky: Math.sin(a), src });
  }
}
const SPECIALS = {
  capoeirista(w) {
    const p = w.player, base = specialBase(w) * 0.55;
    const r = 150 * w.stats.area;
    p.auT = Math.max(p.auT, 1.6);
    w.act('spin', 1.5);
    for (let i = 0; i < 6; i++) w.later(i * 0.25, () => {
      areaBlast(w, p.x, p.y, r, base, 'capoeira', 'especial', { knock: 140 });
      w.fx.push({ kind: 'spin', x: p.x, y: p.y, r, life: 0.25, max: 0.25, color: '#f2c14e', follow: true });
      if (i % 2 === 0) w.sfx('swing');
    });
  },
  jiujitsu(w) {
    const p = w.player, base = specialBase(w) * 1.2;
    // alvo: o inimigo com mais vizinhos (o meio do bolo)
    const cands = w.queryEnemies(p.x, p.y, 420);
    let best = null, bestN = -1;
    for (const e of cands.slice(0, 40)) {
      const n = w.queryEnemies(e.x, e.y, 150).length + (e.boss ? 6 : 0);
      if (n > bestN) { bestN = n; best = e; }
    }
    const land = () => {
      const r = 185 * w.stats.area;
      areaBlast(w, p.x, p.y, r, base, 'jiujitsu', 'especial', { stun: 1.2, knock: 120 });
      p.barrier = Math.min(w.stats.maxHp * 0.5, p.barrier + w.stats.maxHp * 0.08);
      w.fx.push({ kind: 'boom', x: p.x, y: p.y, r, life: 0.4, max: 0.4, color: '#9b7bff' });
      w.fx.push({ kind: 'ring', x: p.x, y: p.y, r, life: 0.5, max: 0.5, color: '#c9b3ff' });
      w.act('slam', 0.45);
      w.shake(10); w.sfx('bossDead');
    };
    if (!best || !w.lungeTo(best, 900, land)) land();
  },
  benzedeira(w) {
    const p = w.player, s = w.stats;
    w.areas.push({
      kind: 'wave', x: p.x, y: p.y, r: 0, maxR: 310 * s.area, grow: 310 * s.area / 0.55, life: 0.55,
      base: specialBase(w) * 1.8, tag: 'mandinga', src: 'especial', hitSet: new Set(), knock: 200, color: '#7cffe0',
    });
    const h = s.maxHp * 0.08;
    p.hp = Math.min(s.maxHp, p.hp + h);
    w.floats.push({ x: p.x, y: p.y - 24, text: '+' + fmt(h), color: '#6aff8a', life: 0.7, max: 0.7 });
    w.act('cast', 0.6);
    w.sfx('magic'); w.sfx('heal');
  },
  cangaceiro(w) {
    const p = w.player, base = specialBase(w) * 0.75;
    w.act('spin', 0.5);
    for (let v = 0; v < 3; v++) w.later(v * 0.16, () => {
      const n = 14, off = v * 0.22;
      for (let i = 0; i < n; i++) {
        const a = off + i * TAU / n;
        w.projectiles.push({
          kind: 'pellet', x: p.x, y: p.y, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, r: 5,
          base, tag: 'cangaco', src: 'especial', pierce: 3 + w.stats.pierce, life: 0.6 * w.stats.duration,
          hitSet: new Set(), knock: 90, extraCrit: 0.1,
        });
      }
      w.sfx('shot');
    });
  },
};

// ===== Itens ativos (tecla E) =====
const ATIVO_USE = {
  fogos(w) {
    const p = w.player, base = 26 + 6 * w.level;
    const cands = w.queryEnemies(p.x, p.y, 520);
    RNG.shuffle(cands);
    const n = Math.min(8, Math.max(3, cands.length));
    for (let i = 0; i < n; i++) {
      const t = cands[i];
      const x = t ? t.x : p.x + RNG.range(-200, 200), y = t ? t.y : p.y + RNG.range(-200, 200);
      w.later(0.1 + i * 0.09, () => {
        const tx = t && !t.dead ? t.x : x, ty = t && !t.dead ? t.y : y;
        areaBlast(w, tx, ty, 85, base, null, 'fogos', { knock: 160 });
        w.fx.push({ kind: 'boom', x: tx, y: ty, r: 85, life: 0.35, max: 0.35, color: RNG.pick(['#ff6b5a', '#ffd23f', '#7cffb2', '#7ab8ff', '#ff7eb6']) });
        w.sfx('shot');
      });
    }
  },
  rede(w) {
    const p = w.player;
    for (const e of w.queryEnemies(p.x, p.y, 250)) w.hit(e, 8 + 2 * w.level, null, { stun: e.boss ? 0.9 : 2.2, src: 'rede' });
    w.fx.push({ kind: 'ring', x: p.x, y: p.y, r: 250, life: 0.5, max: 0.5, color: '#d9d2c0' });
    w.sfx('grab');
  },
  cha(w) {
    const p = w.player, h = w.stats.maxHp * 0.3;
    p.hp = Math.min(w.stats.maxHp, p.hp + h);
    w.floats.push({ x: p.x, y: p.y - 24, text: '+' + fmt(h), color: '#6aff8a', life: 0.8, max: 0.8 });
    w.sfx('heal');
  },
  pandeiro(w) {
    const p = w.player;
    areaBlast(w, p.x, p.y, 270, 14 + 4 * w.level, null, 'pandeiro', { knock: 520 });
    p.iframes = Math.max(p.iframes, 1.5);
    w.fx.push({ kind: 'ring', x: p.x, y: p.y, r: 270, life: 0.45, max: 0.45, color: '#ffe08a' });
    w.shake(6); w.sfx('berimbau');
  },
  chimarrao(w) {
    w.player.buffAtkT = 6;
    w.fx.push({ kind: 'ring', x: w.player.x, y: w.player.y, r: 40, life: 0.5, max: 0.5, color: '#7bc950' });
    w.sfx('heal');
  },
};

// ===== Ultimates (tecla R): recarga longa, um por personagem =====
const ULTIMATES = {
  capoeirista(w) {
    const p = w.player, base = specialBase(w) * 1.1, r = 185 * w.stats.area;
    p.auT = Math.max(p.auT, 4.2); p.ultT = 4;
    w.act('spin', 4);
    for (let i = 0; i < 20; i++) w.later(i * 0.2, () => {
      areaBlast(w, p.x, p.y, r, base, 'capoeira', 'ultimate', { knock: 180 });
      w.fx.push({ kind: 'spin', x: p.x, y: p.y, r, life: 0.22, max: 0.22, color: i % 2 ? '#f2c14e' : '#3aa655', follow: true });
    });
  },
  jiujitsu(w) {
    const p = w.player, r = 270 * w.stats.area;
    p.ultT = 1.2;
    areaBlast(w, p.x, p.y, r, specialBase(w) * 3.2, 'jiujitsu', 'ultimate', { stun: 3 });
    for (const e of w.queryEnemies(p.x, p.y, r).slice(0, 30)) w.fx.push({ kind: 'grab', x: p.x, y: p.y, tx: e.x, ty: e.y, life: 0.45, max: 0.45, color: '#c9b3ff' });
    p.barrier = Math.min(w.stats.maxHp * 0.5, p.barrier + w.stats.maxHp * 0.2);
    w.fx.push({ kind: 'boom', x: p.x, y: p.y, r, life: 0.5, max: 0.5, color: '#9b7bff' });
    w.fx.push({ kind: 'ring', x: p.x, y: p.y, r, life: 0.6, max: 0.6, color: '#ffffff' });
    w.act('slam', 0.6); w.shake(14);
  },
  benzedeira(w) {
    const p = w.player, s = w.stats, base = specialBase(w) * 0.6;
    p.ultT = 5;
    w.act('cast', 5);
    for (let i = 0; i < 25; i++) w.later(i * 0.2, () => {
      p.hp = Math.min(s.maxHp, p.hp + s.maxHp * 0.02 * 0.2);
      const targets = w.queryEnemies(p.x, p.y, 480);
      for (let k = 0; k < 2; k++) {
        const t = targets.length ? RNG.pick(targets) : null;
        const a = t ? Math.atan2(t.y - p.y, t.x - p.x) + RNG.range(-0.5, 0.5) : RNG.range(0, TAU);
        w.projectiles.push({
          kind: 'fatuo', x: p.x, y: p.y, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, speed: 340, r: 8,
          base, tag: 'mandinga', src: 'ultimate', pierce: 1 + s.pierce, life: 2.2, homing: 8, target: t, hitSet: new Set(),
        });
      }
    });
  },
  cangaceiro(w) {
    const p = w.player, base = specialBase(w) * 1.0;
    p.ultT = 4;
    for (let i = 0; i < 32; i++) w.later(i * 0.125, () => {
      const cands = w.queryEnemies(p.x, p.y, 620);
      const t = cands.length ? RNG.pick(cands) : null;
      const a = t ? Math.atan2(t.y - p.y, t.x - p.x) : RNG.range(0, TAU);
      const ox = RNG.range(-26, 26), oy = RNG.range(-26, 26); // os tiros saem do "bando" em volta
      w.projectiles.push({
        kind: 'rifle', x: p.x + ox, y: p.y + oy, vx: Math.cos(a) * 950, vy: Math.sin(a) * 950, r: 5,
        base, tag: 'cangaco', src: 'ultimate', pierce: 99, life: 0.7, hitSet: new Set(), knock: 110, extraCrit: 0.3,
      });
      if (i % 2 === 0) { w.act('shoot', 0.12, a); w.sfx('shot'); }
    });
  },
};
