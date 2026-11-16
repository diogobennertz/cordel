'use strict';
// ===== Desenho, interface e controles =====
const CELL = 20;
const FONT = '"Cascadia Mono", Consolas, "DejaVu Sans Mono", "Segoe UI Symbol", monospace';
const $ = id => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
canvas.width = W * CELL * dpr;
canvas.height = H * CELL * dpr;

const WALL_GLYPHS = ['♣', '♠', '♣', '♠'];
const FLOOR_GLYPHS = ['·', ',', '·', ' '];

function glyph(ch, color, x, y, size = CELL - 3) {
  ctx.font = `${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.fillText(ch, x * CELL + CELL / 2, y * CELL + CELL / 2 + 1);
}

function tileLook(t, pal, v, x, y, now) {
  switch (t) {
    case TILE.WALL: return { bg: pal.wallBg, fg: pal.wallFg[v], ch: WALL_GLYPHS[v] };
    case TILE.FLOOR: return { bg: pal.floorBg, fg: pal.floorFg, ch: FLOOR_GLYPHS[v] };
    case TILE.GRASS: return { bg: pal.grassBg, fg: pal.grassFg, ch: '"' };
    case TILE.WATER: {
      const s = Math.sin(now / 700 + x * 0.8 + y * 0.5);
      const b = 140 + Math.round(s * 40);
      return { bg: '#0a1c30', fg: `rgb(50,${b},${b + 70})`, ch: s > 0 ? '≈' : '~' };
    }
    case TILE.STAIRS: return { bg: '#2a220c', fg: '#ffd86a', ch: '▼' };
  }
}

function draw(now) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#040604';
  ctx.fillRect(0, 0, W * CELL, H * CELL);
  if (!G) return;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let sx = 0, sy = 0;
  if (FX.shake > 0.3) {
    sx = (Math.random() - 0.5) * FX.shake; sy = (Math.random() - 0.5) * FX.shake;
    FX.shake *= 0.86;
  } else FX.shake = 0;
  ctx.save();
  ctx.translate(sx, sy);

  const m = G.map, pal = biomeOf(G.floor);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    if (!m.seen[i]) continue;
    const look = tileLook(m.tiles[i], pal, m.variant[i], x, y, now);
    const vis = m.visible[i];
    ctx.fillStyle = look.bg;
    ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    if (look.ch !== ' ') glyph(look.ch, look.fg, x, y);
    if (vis && m.fire[i] > 0) {
      const f = Math.random();
      ctx.fillStyle = `rgba(255,${70 + (f * 70) | 0},0,${0.25 + f * 0.2})`;
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      glyph('^', f > 0.5 ? '#ffd23f' : '#ff7a1a', x, y);
    }
    if (!vis) {
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }

  for (const it of G.items) {
    if (!m.visible[idx(it.x, it.y)]) continue;
    const d = ITEMS[it.key];
    const pulse = 0.5 + 0.5 * Math.sin(now / 300 + it.x);
    ctx.fillStyle = `rgba(255,255,200,${0.06 + pulse * 0.08})`;
    ctx.fillRect(it.x * CELL, it.y * CELL, CELL, CELL);
    glyph(d.glyph, d.color, it.x, it.y);
  }

  for (const mo of G.monsters) {
    if (!m.visible[idx(mo.x, mo.y)]) continue;
    const flashing = now - mo.flash < 120;
    if (mo.boss) {
      const g = 0.5 + 0.5 * Math.sin(now / 200);
      ctx.fillStyle = `rgba(70,160,255,${0.15 + g * 0.2})`;
      ctx.fillRect(mo.x * CELL - 2, mo.y * CELL - 2, CELL + 4, CELL + 4);
    }
    glyph(mo.glyph, flashing ? '#ffffff' : mo.color, mo.x, mo.y, mo.boss ? CELL : CELL - 3);
    if (mo.hp < mo.maxHp) {
      ctx.fillStyle = '#300';
      ctx.fillRect(mo.x * CELL + 2, mo.y * CELL + CELL - 3, CELL - 4, 2);
      ctx.fillStyle = '#f44';
      ctx.fillRect(mo.x * CELL + 2, mo.y * CELL + CELL - 3, (CELL - 4) * mo.hp / mo.maxHp, 2);
    }
    if (mo.pacified > 0) glyph('♪', '#8f8', mo.x + 0.35, mo.y - 0.35, 10);
  }

  const p = G.player;
  if (G.state !== 'dead') {
    ctx.fillStyle = 'rgba(255,233,168,0.12)';
    ctx.fillRect(p.x * CELL, p.y * CELL, CELL, CELL);
    if (p.shield > 0) {
      ctx.strokeStyle = 'rgba(255,216,74,0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x * CELL + CELL / 2, p.y * CELL + CELL / 2, CELL / 2 + 1, 0, Math.PI * 2);
      ctx.stroke();
    }
    glyph('@', now - p.flash < 120 ? '#ff4040' : '#ffe9a8', p.x, p.y, CELL - 1);
  } else {
    glyph('%', '#a33', p.x, p.y);
  }

  // números flutuantes
  ctx.font = `bold 13px ${FONT}`;
  FX.floats = FX.floats.filter(f => now - f.born < 900);
  for (const f of FX.floats) {
    const age = (now - f.born) / 900;
    ctx.globalAlpha = 1 - age;
    ctx.fillStyle = '#000';
    ctx.fillText(f.text, f.x * CELL + CELL / 2 + 1, f.y * CELL - age * 16 + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x * CELL + CELL / 2, f.y * CELL - age * 16);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function loop(now) {
  draw(now);
  requestAnimationFrame(loop);
}

// ===== HUD =====
function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

function updateHUD() {
  const p = G.player;
  $('floor-name').textContent = `Andar ${G.floor}/${MAX_FLOOR} · ${biomeOf(G.floor).name}`;
  $('hp-fill').style.width = `${(p.hp / p.maxHp) * 100}%`;
  $('shield-fill').style.width = `${Math.min(100, (p.shield / p.maxHp) * 100)}%`;
  $('hp-text').textContent = `${p.hp}/${p.maxHp}${p.shield ? `  +${p.shield}` : ''}`;
  $('lvl-text').textContent = `Nv ${p.level}`;
  $('xp-fill').style.width = `${(p.xp / p.xpNext) * 100}%`;
  $('xp-text').textContent = `${p.xp}/${p.xpNext} XP`;
  $('stats').innerHTML =
    `<span title="Ataque">⚔ ${p.atk}</span><span title="Defesa">⛨ ${p.def}</span>` +
    `<span title="Esquiva">↯ ${Math.round(p.dodge * 100)}%</span><span title="Crítico">✦ ${Math.round(p.crit * 100)}%</span>`;

  let inv = '';
  for (let i = 0; i < INV_MAX; i++) {
    const key = p.inv[i];
    if (key) {
      const d = ITEMS[key];
      inv += `<li><button data-use="${i}" title="${esc(d.desc)}"><kbd>${i + 1}</kbd><span style="color:${d.color}">${esc(d.glyph)}</span> ${esc(d.name)}<small>${esc(d.desc)}</small></button></li>`;
    } else inv += `<li class="empty"><kbd>${i + 1}</kbd> —</li>`;
  }
  $('inv').innerHTML = inv;

  const perks = Object.entries(p.perks).map(([id, n]) => {
    const pk = PERKS.find(x => x.id === id);
    return `<li title="${esc(pk.desc)}">${esc(pk.name)}${n > 1 ? ` <b>×${n}</b>` : ''}</li>`;
  }).join('');
  $('perks').innerHTML = perks || '<li class="empty">Suba de nível para ganhar talentos</li>';

  const near = G.monsters.filter(m => G.map.visible[idx(m.x, m.y)]).sort((a, b) => cheb(a, p) - cheb(b, p));
  $('near').innerHTML = near.length
    ? near.map(m => `<li><span style="color:${m.color}">${esc(m.glyph)}</span> ${esc(m.name)} <small>${m.hp}/${m.maxHp}${m.pacified ? ' · calmo' : ''}</small></li>`).join('')
    : '<li class="empty">Nada à vista</li>';

  $('log').innerHTML = G.log.slice(-7).map((l, i, arr) =>
    `<p class="${l.cls}" style="opacity:${0.45 + 0.55 * (i + 1) / arr.length}">${esc(l.text)}</p>`).join('');

  updateOverlay();
}

let overlayKey = '';
function updateOverlay() {
  const ov = $('overlay');
  const key = G.state + (G.perkChoices ? G.perkChoices.map(x => x.id).join() : '');
  if (key === overlayKey) return;
  overlayKey = key;
  const p = G.player;
  const best = +(localStorage.getItem('mata-best') || 0);
  const stats = `<div class="stats">Andar ${G.floor} · Nível ${p.level} · ${G.kills} criaturas · ${G.turn} turnos</div>`;
  let html = '';
  if (G.state === 'title') {
    html = `<h1>MATA ADENTRO</h1>
      <p class="sub">um roguelike do folclore brasileiro</p>
      <p>Uma maldição tomou conta da mata. Saci, Curupira, Mula sem Cabeça, Iara e coisa pior
      andam soltos. Desça ${MAX_FLOOR} andares até o coração da floresta e enfrente o <b>Boitatá</b>.</p>
      <div class="keys">
        <div><kbd>WASD</kbd> / <kbd>setas</kbd> mover e atacar (encoste no inimigo)</div>
        <div><kbd>Q</kbd><kbd>E</kbd><kbd>Z</kbd><kbd>C</kbd> / <kbd>numpad</kbd> diagonais</div>
        <div><kbd>Espaço</kbd> esperar · <kbd>Enter</kbd> descer no ▼ · <kbd>1</kbd>–<kbd>6</kbd> usar item · <kbd>M</kbd> som</div>
      </div>
      ${best ? `<p class="sub">Seu recorde: ${best > MAX_FLOOR ? 'venceu o Boitatá!' : `andar ${best}`}</p>` : ''}
      <button class="big" data-act="start">Entrar na mata <kbd>Enter</kbd></button>`;
  } else if (G.state === 'perk') {
    html = `<h2>Nível ${p.level}!</h2><p class="sub">Escolha um talento</p><div class="cards">` +
      G.perkChoices.map((pk, i) => `<button class="card" data-perk="${i}"><kbd>${i + 1}</kbd><b>${esc(pk.name)}</b><span>${esc(pk.desc)}</span>${p.perks[pk.id] ? `<small>você tem ×${p.perks[pk.id]}</small>` : ''}</button>`).join('') +
      '</div>';
  } else if (G.state === 'dead') {
    html = `<h2 class="bad">Você caiu na mata...</h2>${stats}
      <p class="sub">${esc(G.log.filter(l => l.cls === 'bad').slice(-2, -1)[0]?.text || '')}</p>
      <button class="big" data-act="restart">Tentar de novo <kbd>R</kbd></button>`;
  } else if (G.state === 'won') {
    html = `<h2 class="good">A maldição foi quebrada!</h2>
      <p>O Boitatá se apaga lentamente e a mata respira de novo.</p>${stats}
      <button class="big" data-act="restart">Jogar de novo <kbd>R</kbd></button>`;
  }
  ov.innerHTML = html;
  ov.classList.toggle('hidden', !html);
}

// ===== Controles =====
const MOVES = {
  ArrowUp: [0, -1], KeyW: [0, -1], Numpad8: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1], Numpad2: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], Numpad4: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0], Numpad6: [1, 0],
  KeyQ: [-1, -1], Numpad7: [-1, -1], KeyE: [1, -1], Numpad9: [1, -1],
  KeyZ: [-1, 1], Numpad1: [-1, 1], KeyC: [1, 1], Numpad3: [1, 1],
};

function startGame() { newGame(); overlayKey = ''; updateHUD(); }

function handleKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const code = e.code;
  if (code === 'KeyM') { const mu = SFX.toggle(); log(mu ? 'Som desligado.' : 'Som ligado.', 'hint'); updateHUD(); return; }
  if (G.state === 'title') {
    if (code === 'Enter' || code === 'Space' || code === 'NumpadEnter') { e.preventDefault(); G.state = 'play'; SFX.descend(); }
  } else if (G.state === 'dead' || G.state === 'won') {
    if (code === 'KeyR' || code === 'Enter') { e.preventDefault(); startGame(); G.state = 'play'; }
  } else if (G.state === 'perk') {
    const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[code];
    if (n !== undefined) { e.preventDefault(); choosePerk(n); }
  } else if (MOVES[code]) {
    e.preventDefault(); tryMove(...MOVES[code]);
  } else if (code === 'Space' || code === 'Period' || code === 'Numpad5') {
    e.preventDefault(); waitTurn();
  } else if (code === 'Enter' || code === 'NumpadEnter' || e.key === '>') {
    e.preventDefault(); descend();
  } else if (/^Digit[1-6]$/.test(code)) {
    e.preventDefault(); useItem(+code.slice(5) - 1);
  } else return;
  updateHUD();
}

document.addEventListener('keydown', handleKey);
document.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.use !== undefined) useItem(+b.dataset.use);
  else if (b.dataset.perk !== undefined) choosePerk(+b.dataset.perk);
  else if (b.dataset.act === 'start') { G.state = 'play'; SFX.descend(); }
  else if (b.dataset.act === 'restart') { startGame(); G.state = 'play'; }
  b.blur();
  updateHUD();
});

// ===== Início =====
newGame();
G.state = 'title';
updateHUD();
requestAnimationFrame(loop);
