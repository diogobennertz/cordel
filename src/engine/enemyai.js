'use strict';
// ===== Comportamento das criaturas e padrões dos chefes =====
// A IA define e.mx/e.my (velocidade desejada). Investidas/saltos usam e.dash.

function dirTo(e, p) {
  const dx = p.x - e.x, dy = p.y - e.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  return [dx / d, dy / d, d];
}

function startDash(e, ang, speed, t, opts = {}) {
  e.dash = { vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, t, fire: opts.fire || 0, fireT: 0, ghost: !!opts.ghost };
}

const MINION_AI = {
  chase(w, e) {
    const [dx, dy] = dirTo(e, w.player);
    e.mx = dx * e.speed; e.my = dy * e.speed;
  },
  blink(w, e, dt) {
    MINION_AI.chase(w, e);
    e.tA -= dt;
    if (e.st === 'prep') {
      e.mx = e.my = 0; e.tB -= dt;
      if (e.tB <= 0) {
        const a = RNG.range(0, TAU), r = RNG.range(150, 200);
        w.fx.push({ kind: 'puff', x: e.x, y: e.y, life: 0.4, max: 0.4, color: '#c0392b' });
        const to = w.safePoint(w.player.x + Math.cos(a) * r, w.player.y + Math.sin(a) * r, 140);
        e.x = to.x; e.y = to.y;
        w.clampArena(e);
        w.fx.push({ kind: 'puff', x: e.x, y: e.y, life: 0.4, max: 0.4, color: '#c0392b' });
        e.st = ''; e.tA = RNG.range(3.5, 5.5);
      }
    } else if (e.tA <= 0 && dist(e, w.player) < 520) { e.st = 'prep'; e.tB = 0.45; }
  },
  zigzag(w, e) {
    const [dx, dy] = dirTo(e, w.player);
    const s = Math.sin(w.time * 5 + e.seed * 10) * 0.9;
    let vx = dx - dy * s, vy = dy + dx * s;
    const l = Math.sqrt(vx * vx + vy * vy) || 1;
    e.mx = vx / l * e.speed; e.my = vy / l * e.speed;
  },
  charger(w, e, dt) {
    e.tA -= dt;
    if (e.st === 'prep') {
      e.mx = e.my = 0; e.tB -= dt;
      if (e.tB <= 0) { e.st = ''; startDash(e, e.lockAng, 430, 0.7, { fire: e.dmg * 0.5 }); w.sfx('charge'); }
      return;
    }
    MINION_AI.chase(w, e);
    if (e.tA <= 0 && dist(e, w.player) < 330) {
      e.st = 'prep'; e.tB = 0.6; e.lockAng = angleTo(e, w.player); e.tA = RNG.range(3.5, 5);
    }
  },
  ranged(w, e, dt) {
    const [dx, dy, d] = dirTo(e, w.player);
    const want = 230;
    const k = d > want + 30 ? 1 : d < want - 40 ? -1 : 0;
    e.mx = (dx * k - dy * 0.5) * e.speed; e.my = (dy * k + dx * 0.5) * e.speed;
    e.tA -= dt;
    if (e.tA <= 0 && d < 420) {
      e.tA = RNG.range(2.2, 2.8);
      w.enemyShoot(e.x, e.y, Math.atan2(dy, dx), 175, e.dmg, { kind: 'note', slow: 1.2, color: '#5ad2ff' });
    }
  },
  leaper(w, e, dt) {
    e.tA -= dt;
    if (e.st === 'prep') {
      e.mx = e.my = 0; e.tB -= dt;
      if (e.tB <= 0) {
        e.st = '';
        const d = dist(e, e.leapTo);
        startDash(e, angleTo(e, e.leapTo), d / 0.45, 0.45, { ghost: true });
        e.dash.land = { r: 55, dmg: e.dmg };
      }
      return;
    }
    MINION_AI.chase(w, e);
    if (e.tA <= 0 && dist(e, w.player) < 300) {
      e.st = 'prep'; e.tB = 0.45; e.leapTo = { x: w.player.x, y: w.player.y }; e.tA = RNG.range(4, 5.5);
      w.addHazard({ x: e.leapTo.x, y: e.leapTo.y, r: 55, dps: 0, life: 0.9, delay: 0.9, kind: 'mark' });
    }
  },
  charmer(w, e, dt) {
    const [dx, dy, d] = dirTo(e, w.player);
    const k = d > 290 ? 1 : d < 210 ? -1 : 0;
    e.mx = (dx * k + dy * 0.4) * e.speed; e.my = (dy * k - dx * 0.4) * e.speed;
    e.tA -= dt; e.tB -= dt;
    if (e.tA <= 0 && d < 450) {
      e.tA = RNG.range(2.8, 3.4);
      const a = Math.atan2(dy, dx);
      for (let i = -1; i <= 1; i++) w.enemyShoot(e.x, e.y, a + i * 0.25, 190, e.dmg, { kind: 'heart', slow: 0.8, color: '#ff7eb6' });
    }
    if (e.tB <= 0) {
      e.tB = RNG.range(6, 8);
      const a = RNG.range(0, TAU);
      w.fx.push({ kind: 'puff', x: e.x, y: e.y, life: 0.4, max: 0.4, color: '#ff9ec8' });
      const to = w.safePoint(w.player.x + Math.cos(a) * 260, w.player.y + Math.sin(a) * 260, 220);
      e.x = to.x; e.y = to.y;
      w.clampArena(e);
    }
  },
  tank(w, e, dt) {
    MINION_AI.chase(w, e);
    e.tA -= dt;
    if (e.tA <= 0 && dist(e, w.player) < 420) {
      e.tA = RNG.range(5.5, 7);
      const off = RNG.range(0, TAU);
      for (let i = 0; i < 12; i++) w.enemyShoot(e.x, e.y, off + i * TAU / 12, 150, e.dmg * 0.6, { kind: 'rock', color: '#a0703a' });
      w.fx.push({ kind: 'ring', x: e.x, y: e.y, r: 60, life: 0.4, max: 0.4, color: '#a0703a' });
    }
  },
  stalker(w, e, dt) {
    const d = dist(e, w.player);
    e.alpha = d > 170 ? 0.18 : 1;
    e.tA -= dt;
    if (e.st === 'prep') {
      e.mx = e.my = 0; e.tB -= dt; e.alpha = 1;
      if (e.tB <= 0) { e.st = ''; startDash(e, e.lockAng, 480, 0.35); }
      return;
    }
    MINION_AI.chase(w, e);
    if (e.tA <= 0 && d < 190) { e.st = 'prep'; e.tB = 0.35; e.lockAng = angleTo(e, w.player); e.tA = RNG.range(3, 4.5); }
  },
};

// ---------------- Chefes ----------------
function bulletRing(w, e, n, speed, dmgK, off = 0, opts = {}) {
  for (let i = 0; i < n; i++) w.enemyShoot(e.x, e.y, off + i * TAU / n, speed, e.dmg * dmgK, opts);
}
function bulletFan(w, e, n, spread, speed, dmgK, opts = {}) {
  const a = angleTo(e, w.player);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    w.enemyShoot(e.x, e.y, a + t * spread, speed, e.dmg * dmgK, opts);
  }
}
function summon(w, e, type, n) {
  for (let i = 0; i < n; i++) {
    const a = i * TAU / n;
    w.spawnEnemy(type, e.x + Math.cos(a) * (e.r + 40), e.y + Math.sin(a) * (e.r + 40), { summoned: true });
  }
  w.fx.push({ kind: 'ring', x: e.x, y: e.y, r: e.r + 50, life: 0.5, max: 0.5, color: '#b388ff' });
}

// Cada padrão: start(w, e, P) prepara o estado P; update(w, e, P, dt) devolve true quando termina.
const BOSS_PATTERNS = {
  blinkStrike: {
    start(w, e, P) {
      const a = RNG.range(0, TAU), r = RNG.range(120, 170) + e.r;
      P.to = w.safePoint(w.player.x + Math.cos(a) * r, w.player.y + Math.sin(a) * r, 100 + e.r);
      P.t = 0.65;
      w.addHazard({ x: P.to.x, y: P.to.y, r: e.r + 10, dps: 0, life: 0.65, delay: 0.65, kind: 'mark' });
    },
    update(w, e, P, dt) {
      e.mx = e.my = 0;
      P.t -= dt;
      if (P.t > 0) return false;
      w.fx.push({ kind: 'puff', x: e.x, y: e.y, life: 0.5, max: 0.5, color: '#ffffff' });
      e.x = P.to.x; e.y = P.to.y;
      bulletRing(w, e, 10, 200, 0.6, RNG.range(0, 1), { color: '#ff6b5a' });
      w.sfx('whoosh');
      return true;
    },
  },
  whirlwinds: {
    start(w, e, P) {
      for (let i = 0; i < 3; i++) {
        const a = i * TAU / 3 + RNG.range(0, 1);
        w.addHazard({ x: e.x + Math.cos(a) * 60, y: e.y + Math.sin(a) * 60, r: 26, dps: e.dmg * 0.7, life: 6, delay: 0, kind: 'whirl', chase: 85 });
      }
      P.t = 0.6; w.sfx('whoosh');
    },
    update(w, e, P, dt) { P.t -= dt; return P.t <= 0; },
  },
  spread3: fanPattern(3, 0.5, 230, 3, 0.4),
  spread5: fanPattern(5, 0.9, 220, 3, 0.45),
  hearts7: fanPattern(7, 1.3, 200, 2, 0.6, { kind: 'heart', slow: 0.8, color: '#ff7eb6' }),
  ring10: ringPattern(10, 190, 2, 0.5),
  ring14: ringPattern(14, 180, 3, 0.55),
  spiral: {
    start(w, e, P) { P.t = 2.4; P.k = 0; P.a = RNG.range(0, TAU); },
    update(w, e, P, dt) {
      e.mx = e.my = 0;
      P.t -= dt; P.k -= dt;
      while (P.k <= 0) {
        P.k += 0.09; P.a += 0.33;
        w.enemyShoot(e.x, e.y, P.a, 170, e.dmg * 0.5, { color: '#5ad2ff' });
        w.enemyShoot(e.x, e.y, P.a + Math.PI, 170, e.dmg * 0.5, { color: '#5ad2ff' });
      }
      return P.t <= 0;
    },
  },
  charge: {
    start(w, e, P) { P.n = 2; P.st = 'prep'; P.t = 0.65; P.ang = angleTo(e, w.player); },
    update(w, e, P, dt) {
      if (e.dash) return false;
      e.mx = e.my = 0;
      if (P.st === 'prep') {
        P.t -= dt;
        P.ang = angleTo(e, w.player);
        if (P.t <= 0.2) e.flash = Math.max(e.flash, 0.05);
        if (P.t <= 0) { startDash(e, P.ang, 560, 0.7, { fire: e.dmg * 0.4 }); P.st = 'dash'; w.sfx('charge'); }
        return false;
      }
      P.n--;
      if (P.n <= 0) return true;
      P.st = 'prep'; P.t = 0.55;
      return false;
    },
  },
  pullSong: {
    start(w, e, P) { P.t = 1.8; P.k = 0; },
    update(w, e, P, dt) {
      e.mx = e.my = 0;
      P.t -= dt; P.k -= dt;
      const [dx, dy] = dirTo(w.player, e);
      w.player.pullX = dx * 95; w.player.pullY = dy * 95;
      if (P.k <= 0) { P.k = 0.45; bulletFan(w, e, 3, 0.6, 160, 0.5, { kind: 'note', slow: 1, color: '#5ad2ff' }); }
      if (P.t <= 0) { w.player.pullX = 0; w.player.pullY = 0; return true; }
      return false;
    },
  },
  leap: {
    start(w, e, P) {
      P.st = 'prep'; P.t = 0.6; P.to = { x: w.player.x, y: w.player.y };
      w.addHazard({ x: P.to.x, y: P.to.y, r: 95, dps: 0, life: 1.15, delay: 1.15, kind: 'mark' });
    },
    update(w, e, P, dt) {
      if (e.dash) return false;
      e.mx = e.my = 0;
      if (P.st === 'prep') {
        P.t -= dt;
        if (P.t <= 0) {
          const d = dist(e, P.to);
          startDash(e, angleTo(e, P.to), Math.max(1, d) / 0.55, 0.55, { ghost: true });
          e.dash.land = { r: 95, dmg: e.dmg, ring: 10 };
          P.st = 'air';
        }
        return false;
      }
      return true;
    },
  },
  summonCuru: summonPattern('curupira', 5),
  summonCorpo: summonPattern('corposeco', 8),
  summonLobo: summonPattern('lobisomem', 3),
  puddles: {
    start(w, e, P) {
      for (let i = 0; i < 5; i++) {
        const a = RNG.range(0, TAU), r = i === 0 ? 0 : RNG.range(50, 170);
        const x = w.player.x + Math.cos(a) * r, y = w.player.y + Math.sin(a) * r;
        w.addHazard({ x, y, r: 55, dps: e.dmg * 0.9, life: 4.5, delay: 0.85, kind: e.type === 'boitata' ? 'fire' : 'poison' });
      }
      P.t = 0.9; w.sfx('throw');
    },
    update(w, e, P, dt) { e.mx = e.my = 0; P.t -= dt; return P.t <= 0; },
  },
  shockwave: {
    start(w, e, P) { P.n = 3; P.t = 0; },
    update(w, e, P, dt) {
      e.mx = e.my = 0;
      P.t -= dt;
      if (P.t <= 0) {
        if (P.n <= 0) return true;
        P.t = 0.45; P.n--;
        bulletRing(w, e, 14, 135, 0.42, P.n * 0.22, { kind: 'rock', color: '#a0703a', r: 9 });
        w.fx.push({ kind: 'ring', x: e.x, y: e.y, r: e.r + 30, life: 0.4, max: 0.4, color: '#a0703a' });
        w.shake(6);
      }
      return false;
    },
  },
  fireline: {
    start(w, e, P) {
      P.st = 'aim'; P.t = 0.8; P.ang = angleTo(e, w.player);
      w.fx.push({ kind: 'line', x: e.x, y: e.y, ang: P.ang, len: 720, life: 0.8, max: 0.8, color: '#ff7a1a' });
    },
    update(w, e, P, dt) {
      e.mx = e.my = 0;
      P.t -= dt;
      if (P.t > 0) return false;
      const cx = Math.cos(P.ang), cy = Math.sin(P.ang);
      for (let d = 30; d <= 720; d += 32) {
        w.addHazard({ x: e.x + cx * d, y: e.y + cy * d, r: 24, dps: e.dmg * 0.9, life: 2.6, delay: 0, kind: 'fire' });
      }
      w.shake(8); w.sfx('fire');
      return true;
    },
  },
};

function fanPattern(n, spread, speed, reps, gap, opts = { color: '#ff6b5a' }) {
  return {
    start(w, e, P) { P.n = reps; P.t = 0; },
    update(w, e, P, dt) {
      e.mx *= 0.3; e.my *= 0.3;
      P.t -= dt;
      if (P.t <= 0) {
        if (P.n <= 0) return true;
        P.t = gap; P.n--; bulletFan(w, e, n, spread, speed, 0.6, opts);
      }
      return false;
    },
  };
}
function ringPattern(n, speed, reps, gap) {
  return {
    start(w, e, P) { P.n = reps; P.t = 0; P.off = RNG.range(0, TAU); },
    update(w, e, P, dt) {
      e.mx = e.my = 0;
      P.t -= dt;
      if (P.t <= 0) {
        if (P.n <= 0) return true;
        P.t = gap; P.n--; P.off += Math.PI / n; bulletRing(w, e, n, speed, 0.6, P.off, { color: '#ffb347' });
      }
      return false;
    },
  };
}
function summonPattern(type, n) {
  return {
    start(w, e, P) { summon(w, e, type, n); P.t = 0.8; },
    update(w, e, P, dt) { e.mx = e.my = 0; P.t -= dt; return P.t <= 0; },
  };
}

function bossAI(w, e, dt) {
  if (!e.pat) {
    MINION_AI.chase(w, e);
    e.tA -= dt;
    if (e.tA <= 0) {
      const name = e.patterns[e.pi % e.patterns.length];
      e.pi++;
      e.pat = { name, P: {} };
      BOSS_PATTERNS[name].start(w, e, e.pat.P);
    }
    return;
  }
  e.pat.age = (e.pat.age || 0) + dt;
  const done = BOSS_PATTERNS[e.pat.name].update(w, e, e.pat.P, dt) || e.pat.age > 8;
  if (done) {
    e.pat = null;
    // fica mais agressivo com pouca vida
    e.tA = e.hp < e.maxHp * 0.4 ? 0.7 : 1.3;
  }
}

function updateEnemyAI(w, e, dt) {
  if (e.boss) bossAI(w, e, dt);
  else MINION_AI[e.ai](w, e, dt);
}
