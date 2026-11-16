'use strict';
// ===== Desenho do mundo e do HUD — tudo em estilo de xilogravura colorida de cordel =====
// Regras da casa: cor chapada, contorno de tinta, hachura no lugar de sombra, nada de brilho ou degradê.

const R = {
  canvas: null, ctx: null, dpr: 1, W: 0, H: 0, zoom: 1, cam: { x: 0, y: 0 },
  patterns: {}, icons: new Map(), banners: [], t: 0,
};

function initRender(canvas) {
  R.canvas = canvas;
  R.ctx = canvas.getContext('2d');
  buildSprites();
  resizeRender();
  window.addEventListener('resize', resizeRender);
}
function resizeRender() {
  R.dpr = Math.min(2, window.devicePixelRatio || 1);
  R.W = window.innerWidth; R.H = window.innerHeight;
  R.canvas.width = Math.round(R.W * R.dpr); R.canvas.height = Math.round(R.H * R.dpr);
  R.canvas.style.width = R.W + 'px'; R.canvas.style.height = R.H + 'px';
  // câmera próxima: bonecos grandes, como nos "survivors" (os bichos ainda nascem fora da tela)
  R.zoom = clamp(Math.min(R.W / 1280, R.H / 760) * 1.55, 0.8, 2.4);
  // em telas muito largas, aproxima o suficiente para os bichos (nascem a 560+) continuarem fora da tela
  R.zoom = Math.max(R.zoom, R.W / 1060, R.H / 900);
}

function iconImg(art, accent) {
  const k = art + accent;
  if (!R.icons.has(k)) { const im = new Image(); im.src = cardArtURL(art, accent); R.icons.set(k, im); }
  return R.icons.get(k);
}
function banner(text, sub = '', color = '#f2c14e', dur = 2.6) {
  R.banners.push({ text, sub, color, life: dur, max: dur });
}

// ---------------- CHÃO: cada bioma é um papel colorido de folheto, com a sua estampa ----------------
const CHAO = {
  mata: { papel: '#a9c98a', tom: '#95ba74', tipo: 'folhas', folhas: ['#c5361d', '#f0b429', '#2f6d43', '#d9772b', '#8a5a2b'] },
  sertao: { papel: '#eecb72', tom: '#dfb656', tipo: 'rachado' },
  vila: { papel: '#b6aadb', tom: '#a093ca', tipo: 'pedras' },
  pantanal: { papel: '#92cfc0', tom: '#7bbdac', tipo: 'alagado' },
  amazonia: { papel: '#7fb58a', tom: '#6ba277', tipo: 'folhas', folhas: ['#1f4f33', '#2f6d43', '#f0b429', '#8a5a2b'] },
  coracao: { papel: '#e4987c', tom: '#d07f64', tipo: 'cinzas' },
};
function groundPattern(biomeKey) {
  if (R.patterns[biomeKey]) return R.patterns[biomeKey];
  const b = CHAO[biomeKey] || CHAO.mata, T = 512;
  const c = gCanvas(T, T), g = c.getContext('2d'), rnd = gRand(biomeKey.length * 977 + biomeKey.charCodeAt(0));
  const wrap = fn => { for (const ox of [-T, 0, T]) for (const oy of [-T, 0, T]) { g.save(); g.translate(ox, oy); fn(); g.restore(); } };
  g.drawImage(papelCanvas(b.papel, 11, T), 0, 0);
  g.lineCap = 'round'; g.lineJoin = 'round';
  // manchas de impressão (tom um pouco mais escuro, de borda dura)
  for (let i = 0; i < 16; i++) {
    const x = rnd() * T, y = rnd() * T, rx = 30 + rnd() * 70, ry = rx * (0.4 + rnd() * 0.4), rot = rnd() * 3;
    g.fillStyle = b.tom; g.globalAlpha = 0.5;
    wrap(() => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill(); });
  }
  g.globalAlpha = 1;
  const tufo = (x, y, s, cor) => { // capim entalhado: três riscos em leque
    g.strokeStyle = cor; g.lineWidth = 1.4;
    wrap(() => { for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + k * 3.2 * s, y - (7 - Math.abs(k) * 2) * s); g.stroke(); } });
  };
  const tinta = a => `rgba(26,19,14,${a})`;
  if (b.tipo === 'folhas') {
    for (let i = 0; i < 70; i++) tufo(rnd() * T, rnd() * T, 0.7 + rnd() * 0.7, tinta(0.32));
    for (let i = 0; i < 120; i++) { // folhas caídas, com nervura
      const x = rnd() * T, y = rnd() * T, a = rnd() * TAU, l = 4 + rnd() * 5, cor = b.folhas[Math.floor(rnd() * b.folhas.length)], cheia = rnd() < 0.6;
      wrap(() => {
        g.save(); g.translate(x, y); g.rotate(a);
        g.beginPath(); g.moveTo(-l, 0); g.quadraticCurveTo(0, -l * 0.62, l, 0); g.quadraticCurveTo(0, l * 0.62, -l, 0);
        if (cheia) { g.fillStyle = cor; g.fill(); }
        g.strokeStyle = tinta(0.6); g.lineWidth = 1; g.stroke();
        g.beginPath(); g.moveTo(-l, 0); g.lineTo(l + 2, 0); g.stroke();
        g.restore();
      });
    }
    for (let i = 0; i < 12; i++) { const x = rnd() * T, y = rnd() * T, a = rnd() * TAU; g.strokeStyle = tinta(0.45); g.lineWidth = 2; wrap(() => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); g.lineTo(x + Math.cos(a + 0.6) * 21, y + Math.sin(a + 0.6) * 21); g.stroke(); }); }
  } else if (b.tipo === 'rachado') {
    for (let i = 0; i < 26; i++) { // chão rachado do sertão
      let x = rnd() * T, y = rnd() * T, a = rnd() * TAU; const pts = [x, y];
      for (let k = 0; k < 5 + rnd() * 4; k++) { a += (rnd() - 0.5) * 1.5; x += Math.cos(a) * (12 + rnd() * 16); y += Math.sin(a) * (12 + rnd() * 16); pts.push(x, y); }
      g.strokeStyle = tinta(0.5); g.lineWidth = 1.3 + rnd() * 1.2;
      wrap(() => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k], pts[k + 1]); g.stroke(); });
    }
    for (let i = 0; i < 30; i++) { const x = rnd() * T, y = rnd() * T, r = 2 + rnd() * 4; g.fillStyle = '#c99a48'; g.strokeStyle = tinta(0.55); g.lineWidth = 1; wrap(() => { g.beginPath(); g.ellipse(x, y, r * 1.3, r, 0, 0, TAU); g.fill(); g.stroke(); }); }
    for (let i = 0; i < 26; i++) tufo(rnd() * T, rnd() * T, 0.6 + rnd() * 0.5, tinta(0.4));
  } else if (b.tipo === 'pedras') {
    const n = 8, cell = T / n; // calçamento "pé de moleque" das vilas antigas
    for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
      const cx = (ix + 0.5 + (iy % 2 ? 0.25 : -0.25)) * cell + (rnd() - 0.5) * 10, cy = (iy + 0.5) * cell + (rnd() - 0.5) * 10;
      const rx = cell * (0.3 + rnd() * 0.14), ry = cell * (0.26 + rnd() * 0.12), rot = (rnd() - 0.5) * 0.9, k = 5 + Math.floor(rnd() * 3), off = rnd() * 6;
      g.fillStyle = rnd() < 0.5 ? b.tom : '#c4b9e4'; g.strokeStyle = tinta(0.5); g.lineWidth = 1.4;
      wrap(() => {
        g.beginPath();
        for (let q = 0; q < k; q++) { const a = off + q * TAU / k; const px = cx + Math.cos(a) * rx * Math.cos(rot) - Math.sin(a) * ry * Math.sin(rot), py = cy + Math.cos(a) * rx * Math.sin(rot) + Math.sin(a) * ry * Math.cos(rot); q ? g.lineTo(px, py) : g.moveTo(px, py); }
        g.closePath(); g.fill(); g.stroke();
      });
    }
  } else if (b.tipo === 'alagado') {
    for (let i = 0; i < 90; i++) { // marolas
      const x = rnd() * T, y = rnd() * T, l = 6 + rnd() * 9;
      g.strokeStyle = 'rgba(34,87,122,0.55)'; g.lineWidth = 1.5;
      wrap(() => { g.beginPath(); g.moveTo(x - l, y); g.quadraticCurveTo(x - l / 2, y - 3.5, x, y); g.quadraticCurveTo(x + l / 2, y + 3.5, x + l, y); g.stroke(); });
    }
    for (let i = 0; i < 46; i++) tufo(rnd() * T, rnd() * T, 0.8 + rnd() * 0.8, 'rgba(47,109,67,0.75)');
    for (let i = 0; i < 16; i++) { const x = rnd() * T, y = rnd() * T, r = 5 + rnd() * 4; g.fillStyle = '#3f8f52'; g.strokeStyle = tinta(0.6); g.lineWidth = 1.2; wrap(() => { g.beginPath(); g.ellipse(x, y, r, r * 0.55, 0, 0.5, TAU); g.lineTo(x, y); g.closePath(); g.fill(); g.stroke(); }); }
  } else { // cinzas e brasas do Coração da Mata
    for (let i = 0; i < 18; i++) {
      let x = rnd() * T, y = rnd() * T, a = rnd() * TAU; const pts = [x, y];
      for (let k = 0; k < 4 + rnd() * 3; k++) { a += (rnd() - 0.5) * 1.4; x += Math.cos(a) * (14 + rnd() * 14); y += Math.sin(a) * (14 + rnd() * 14); pts.push(x, y); }
      g.strokeStyle = tinta(0.55); g.lineWidth = 1.6;
      wrap(() => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k], pts[k + 1]); g.stroke(); });
    }
    for (let i = 0; i < 70; i++) { const x = rnd() * T, y = rnd() * T, r = 1.5 + rnd() * 2.5, rot = rnd() * 3; g.fillStyle = rnd() < 0.5 ? COR.ipe : COR.urucum; g.strokeStyle = tinta(0.6); g.lineWidth = 0.9; wrap(() => { estrela(g, x, y, r * 1.6, 4, 0.4, rot); g.fill(); g.stroke(); }); }
    for (let i = 0; i < 30; i++) tufo(rnd() * T, rnd() * T, 0.6, tinta(0.45));
  }
  return (R.patterns[biomeKey] = R.ctx.createPattern(c, 'repeat'));
}

// texto comum (não entalhado) com um filete de papel em volta para ler sobre qualquer chão
function txt(ctx, s, x, y, font, cor = COR.tinta, halo = COR.papel, hw = 3) {
  ctx.font = font;
  if (halo) { ctx.lineJoin = 'round'; ctx.lineWidth = hw; ctx.strokeStyle = halo; ctx.strokeText(s, x, y); }
  ctx.fillStyle = cor; ctx.fillText(s, x, y);
}
// forma de gravura: cor chapada + contorno de tinta (o caminho já deve estar traçado)
function gravar(ctx, cor, lw = 2) { if (cor) { ctx.fillStyle = cor; ctx.fill(); } if (lw) { ctx.strokeStyle = COR.tinta; ctx.lineWidth = lw; ctx.stroke(); } }
function chama(ctx, x, y, w, h, c1, c2) { // labareda chapada
  ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x - w / 2, y - h * 0.55, x - w * 0.15, y - h); ctx.quadraticCurveTo(x, y - h * 0.5, x + w * 0.18, y - h * 0.78);
  ctx.quadraticCurveTo(x + w / 2, y - h * 0.45, x + w / 2, y); ctx.closePath(); gravar(ctx, c1, 1.5);
  ctx.beginPath(); ctx.ellipse(x, y - h * 0.26, w * 0.2, h * 0.26, 0, 0, TAU); ctx.fillStyle = c2; ctx.fill();
}
function coracao(ctx, x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.9); ctx.bezierCurveTo(x - s * 1.5, y - s * 0.2, x - s * 0.7, y - s * 1.2, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 1.2, x + s * 1.5, y - s * 0.2, x, y + s * 0.9); ctx.closePath();
}
function notaMusical(ctx, x, y, s, cor) {
  ctx.beginPath(); ctx.ellipse(x - s * 0.3, y + s * 0.6, s * 0.5, s * 0.36, -0.4, 0, TAU); gravar(ctx, cor, 1.4);
  ctx.strokeStyle = COR.tinta; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + s * 0.15, y + s * 0.5); ctx.lineTo(x + s * 0.15, y - s * 0.9); ctx.lineTo(x + s * 0.8, y - s * 0.5); ctx.stroke();
}

// ---------------- MUNDO ----------------
function render(w, dt) {
  const ctx = R.ctx;
  R.t += dt;
  ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
  ctx.fillStyle = COR.tinta;
  ctx.fillRect(0, 0, R.W, R.H);
  if (!w) return;

  const p = w.player;
  // durante a apresentação de uma criatura nova, a câmera vai até ela e aproxima
  const tgt = R.focus || p;
  R.cam.x = lerp(R.cam.x || p.x, tgt.x, Math.min(1, dt * (R.focus ? 5 : 10)));
  R.cam.y = lerp(R.cam.y || p.y, tgt.y - (R.focus ? 24 : 0), Math.min(1, dt * (R.focus ? 5 : 10)));
  R.zoomMul = lerp(R.zoomMul || 1, R.focus ? 1.75 : 1, Math.min(1, dt * 5));
  const sh = R.focus ? 0 : (w.shakeAmt || 0);
  const z = R.zoom * R.zoomMul;
  const ox = R.W / 2 - R.cam.x * z + (Math.random() - 0.5) * sh;
  const oy = R.H / 2 - R.cam.y * z + (Math.random() - 0.5) * sh;
  const view = { x0: R.cam.x - R.W / 2 / z - 80, x1: R.cam.x + R.W / 2 / z + 80, y0: R.cam.y - R.H / 2 / z - 80, y1: R.cam.y + R.H / 2 / z + 130 };
  const inView = (x, y) => x > view.x0 && x < view.x1 && y > view.y0 && y < view.y1;

  ctx.setTransform(R.dpr * z, 0, 0, R.dpr * z, ox * R.dpr, oy * R.dpr);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const phase = PHASES[Math.max(0, w.phaseIdx)];
  const biome = phase ? phase.biome : 'mata';
  ctx.fillStyle = groundPattern(biome);
  ctx.fillRect(0, 0, ARENA.w, ARENA.h);
  // moldura da arena, como a barra de um folheto
  ctx.strokeStyle = COR.tinta; ctx.lineWidth = 60; ctx.strokeRect(-30, -30, ARENA.w + 60, ARENA.h + 60);
  ctx.lineWidth = 3; ctx.strokeRect(14, 14, ARENA.w - 28, ARENA.h - 28);

  // perigos no chão
  for (const h of w.hazards) {
    if (!inView(h.x, h.y)) continue;
    const a = h.max ? h.life / h.max : 1;
    if (h.delay > 0 || h.kind === 'mark') { // aviso: aqui vai cair alguma coisa
      const k = 1 - Math.max(0, h.delay) / (h.max || 1);
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r * k, 0, TAU); ctx.fillStyle = `rgba(197,54,29,${0.25 + 0.3 * k})`; ctx.fill();
      ctx.setLineDash([9, 7]); ctx.lineDashOffset = -R.t * 30;
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.strokeStyle = COR.tinta; ctx.lineWidth = 3.5; ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(h.x, h.y, Math.max(1, h.r - 5), 0, TAU); ctx.strokeStyle = COR.urucum; ctx.lineWidth = 2; ctx.stroke();
      continue;
    }
    ctx.globalAlpha = Math.min(1, a * 2.5);
    if (h.kind === 'fire') {
      const f = 0.8 + 0.2 * Math.sin(R.t * 18 + h.x);
      chama(ctx, h.x, h.y + h.r * 0.35, h.r * 1.5 * f, h.r * 1.9 * f, COR.urucum, COR.ipe);
    } else if (h.kind === 'poison') {
      ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.75, 0, 0, TAU); ctx.fillStyle = 'rgba(96,160,60,0.75)'; ctx.fill();
      ctx.setLineDash([6, 5]); ctx.strokeStyle = COR.tinta; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < 3; i++) { const an = R.t * 2 + i * 2; ctx.beginPath(); ctx.arc(h.x + Math.cos(an) * h.r * 0.5, h.y + Math.sin(an * 1.3) * h.r * 0.35, 3.5, 0, TAU); gravar(ctx, '#c9e67a', 1.2); }
    } else if (h.kind === 'whirl') {
      ctx.strokeStyle = COR.tinta; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(h.x, h.y - i * 9, h.r * (1 - i * 0.25), R.t * 9 + i, R.t * 9 + i + 4.2); ctx.stroke(); }
      ctx.strokeStyle = COR.papel; ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(h.x, h.y - i * 9, h.r * (1 - i * 0.25), R.t * 9 + i + 0.4, R.t * 9 + i + 3.6); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }

  // áreas dos golpes
  for (const a of w.areas) {
    if (!inView(a.x, a.y)) continue;
    if (a.kind === 'wave') {
      ctx.globalAlpha = clamp(a.life / 0.35, 0, 1);
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, TAU); ctx.strokeStyle = COR.tinta; ctx.lineWidth = 8; ctx.stroke();
      ctx.strokeStyle = a.color; ctx.lineWidth = 4; ctx.stroke();
      ctx.setLineDash([10, 9]); ctx.beginPath(); ctx.arc(a.x, a.y, Math.max(0, a.r - 13), 0, TAU); ctx.strokeStyle = COR.tinta; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    } else if (a.kind === 'smoke') {
      ctx.globalAlpha = 0.55 * Math.min(1, a.life / 0.5);
      for (let i = 0; i < 5; i++) {
        const an = i * 1.3 + R.t * 0.6;
        ctx.beginPath(); ctx.arc(a.x + Math.cos(an) * a.r * 0.4, a.y + Math.sin(an) * a.r * 0.32, a.r * 0.5, 0, TAU);
        ctx.fillStyle = '#dfe6cf'; ctx.fill(); ctx.setLineDash([5, 5]); ctx.strokeStyle = COR.tinta; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.globalAlpha = 1;
    } else if (a.kind === 'puddle') {
      ctx.globalAlpha = 0.7 * Math.min(1, a.life / 0.5);
      ctx.beginPath(); ctx.ellipse(a.x, a.y, a.r, a.r * 0.7, 0, 0, TAU); ctx.fillStyle = '#6fc98e'; ctx.fill();
      ctx.setLineDash([7, 5]); ctx.strokeStyle = COR.tinta; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }

  // itens no chão: vaga-lumes (XP) são estrelinhas de quatro pontas
  for (const g of w.pickups) {
    if (!inView(g.x, g.y)) continue;
    if (g.kind === 'xp') {
      const big = g.v >= 5, r = (big ? 7 : 4.6) * (0.85 + 0.15 * Math.sin(R.t * 6 + g.x));
      estrela(ctx, g.x, g.y, r, 4, 0.42, R.t * 1.5 + g.x);
      gravar(ctx, big ? COR.urucum : COR.ipe, 1.3);
      if (big) { ctx.beginPath(); ctx.arc(g.x, g.y, 1.8, 0, TAU); ctx.fillStyle = COR.ipe; ctx.fill(); }
    } else drawSprite(ctx, 'p_' + g.kind, g.x, g.y + 6 + Math.sin(R.t * 4 + g.x) * 2);
  }

  // corpo do Boitatá: gomos de cobra com labareda
  for (const e of w.enemies) {
    if (!e.serpent || !e.trail) continue;
    for (let i = e.trail.length - 1; i >= 4; i -= 4) {
      const t = e.trail[i], k = 1 - i / e.trail.length, rr = e.r * (0.35 + 0.5 * k);
      ctx.beginPath(); ctx.arc(t.x, t.y - 10, rr, 0, TAU); gravar(ctx, i % 8 ? COR.anil : '#2f7fb0', 2);
      ctx.beginPath(); ctx.arc(t.x, t.y - 10, rr * 0.45, 0, TAU); ctx.fillStyle = i % 8 ? COR.ipe : COR.barro; ctx.fill();
    }
  }

  // ordena cenário + entidades por y (profundidade)
  const list = [];
  for (const d of w.decor) if (inView(d.x, d.y)) list.push({ y: d.y, d });
  for (const it of (w.interativos || [])) if (inView(it.x, it.y)) list.push({ y: it.y, it });
  for (const e of w.enemies) if (inView(e.x, e.y)) list.push({ y: e.y, e });
  list.push({ y: p.y, p });
  list.sort((a, b) => a.y - b.y);
  for (const it of list) {
    if (it.d) {
      if (it.d.kind === 'agua' || it.d.kind === 'brasa' || it.d.kind === 'capim' || it.d.kind === 'vitoria' || it.d.kind === 'flores') drawSprite(ctx, 'd_' + it.d.kind, it.d.x, it.d.y, { scale: it.d.s, flip: it.d.flip });
      else drawSprite(ctx, 'd_' + it.d.kind, it.d.x, it.d.y, { scale: it.d.s, flip: it.d.flip, alpha: dist2(it.d, p) < 90 * 90 ? 0.4 : 1 });
    } else if (it.it) drawInterativo(ctx, it.it, w);
    else if (it.e) drawEnemy(ctx, it.e, w);
    else drawPlayer(ctx, w);
  }

  // patuás orbitando
  for (const g of w.golpes) {
    if (g.id !== 'patua' || !g.state.orbs) continue;
    for (const [x, y] of g.state.orbs) {
      ctx.beginPath(); ctx.rect(x - 6, y - 17, 12, 13); gravar(ctx, '#c08a50', 2);
      ctx.fillStyle = COR.agua; ctx.fillRect(x - 1.5, y - 15, 3, 9); ctx.fillRect(x - 4, y - 12, 8, 2.5);
    }
  }

  // projéteis do jogador
  for (const pr of w.projectiles) {
    if (!inView(pr.x, pr.y)) continue;
    drawProjectile(ctx, pr);
  }
  // projéteis inimigos
  for (const b of w.ebullets) {
    if (!inView(b.x, b.y)) continue;
    if (b.kind === 'note') notaMusical(ctx, b.x, b.y - 8, 8, b.color);
    else if (b.kind === 'heart') { coracao(ctx, b.x, b.y - 8, 7); gravar(ctx, b.color, 1.8); }
    else {
      ctx.beginPath(); ctx.arc(b.x, b.y - 8, b.r + 1, 0, TAU); gravar(ctx, b.color, 2.2);
      ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - 8 - b.r * 0.3, b.r * 0.3, 0, TAU); ctx.fillStyle = COR.papel; ctx.fill();
    }
  }

  // efeitos
  for (const f of w.fx) drawFx(ctx, f, w);

  // números de dano, nas letras entalhadas
  for (const f of w.floats) {
    if (!inView(f.x, f.y)) continue;
    const k = f.life / f.max;
    ctx.globalAlpha = Math.min(1, k * 2.2);
    const size = f.crit ? 13 : f.color ? 10 : 8.5, yy = f.y - 26 - (1 - k) * 4;
    xiloText(ctx, f.text, f.x, yy - size / 2, size, {
      align: 'center', cor: f.color ? COR.mata : f.crit ? COR.urucum : COR.tinta, contorno: f.crit ? COR.ipe : COR.papel, cw: f.crit ? 1.6 : 1.3,
    });
  }
  ctx.globalAlpha = 1;

  // ---- tela (HUD) ----
  ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
  drawHUD(ctx, w, dt);
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${clamp(a, 0, 1)})`;
}

// elementos do mapa: barraca da Feira, potes, oratórios e baús trancados
const INTER_SPR = { feira: 'd_barraca', pote: 'd_pote', oratorio: 'd_oratorio', bau: 'd_baumapa' };
function drawInterativo(ctx, it, w) {
  const p = w.player, perto = dist2(it, p) < (it.r + 60) ** 2;
  drawShadow(ctx, it.x, it.y, it.r * 0.8);
  const sc = it.kind === 'pote' ? 1 : it.kind === 'bau' ? 1.1 : 1.35;
  drawSprite(ctx, INTER_SPR[it.kind], it.x, it.y, { scale: sc });
  if (it.kind === 'feira' && w.feiraAberta && Math.floor(R.t * 2) % 2 === 0) { // "aberto": estrelinha
    estrela(ctx, it.x + 34, it.y - 54, 6, 5, 0.45, R.t); gravar(ctx, COR.ipe, 1.2);
  }
  if (it.kind === 'oratorio' && it.carga > 0) { // barra de carga da bênção
    const bw = 44; ctx.beginPath(); ctx.rect(it.x - bw / 2, it.y + 6, bw, 6); gravar(ctx, COR.papel, 1.5);
    ctx.fillStyle = '#2fb89a'; ctx.fillRect(it.x - bw / 2 + 1, it.y + 7, (bw - 2) * clamp(it.carga, 0, 1), 4);
  }
  if (it.kind === 'oratorio' && it.espera > 0) { txt(ctx, 'descansando', it.x, it.y + 14, 'italic 700 11px Georgia, serif', '#8a7a5a'); }
  if (it.kind === 'bau' && perto) { // preço por cima quando chega perto
    const preco = w.precoBau(), pode = w.coins >= preco;
    xiloText(ctx, 'R$ ' + preco, it.x, it.y - 44, 11, { align: 'center', cor: pode ? COR.mata : COR.urucum, contorno: COR.papel, cw: 1.8 });
  }
}

function drawShadow(ctx, x, y, r) { // sombra hachurada
  ctx.globalAlpha = 0.5;
  ctx.drawImage(sombraImg(), x - r * 1.05, y - r * 0.42, r * 2.1, r * 0.84);
  ctx.globalAlpha = 1;
}

function drawEnemy(ctx, e, w) {
  const moving = Math.abs(e.mx) + Math.abs(e.my) > 1 || e.dash;
  const bob = moving ? Math.abs(Math.sin(R.t * 10 + e.seed * 9)) * 3 : Math.sin(R.t * 2 + e.seed * 5);
  const sc = (e.scale || 1) * (e.boss ? 1.1 : SPR_VIS);
  drawShadow(ctx, e.x, e.y, e.r * 0.95);
  if (e.elite || e.boss) { // roda de marca: elite amarela, chefe vermelha
    ctx.setLineDash([7, 5]); ctx.lineDashOffset = R.t * 14;
    ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r * 1.2, e.r * 0.5, 0, 0, TAU);
    ctx.strokeStyle = COR.tinta; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = e.boss ? COR.urucum : COR.ipe; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.setLineDash([]);
  }
  if (e.st === 'prep' || (e.pat && e.pat.P && e.pat.P.st === 'prep')) { // vai atacar: estouro vermelho piscando
    if (Math.floor(R.t * 14) % 2 === 0) { estrela(ctx, e.x, e.y - e.r * 2.6 * sc / 1.25 - 8, 9, 8, 0.5, R.t * 3); gravar(ctx, COR.urucum, 1.8); }
  }
  const wob = moving ? Math.sin(R.t * 12 + e.seed * 7) * 0.08 : 0;
  const ek = e.sprite === 'boitata' ? e.sprite : walkKey(e.sprite, R.t * (e.boss ? 9 : 12) + e.seed * 20, moving);
  drawSprite(ctx, ek, e.x, e.y - bob, {
    scale: sc, flip: e.face < 0, white: e.flash > 0, alpha: e.alpha < 1 ? e.alpha : null, rot: wob,
  });
  if (e.stunT > 0) {
    for (let i = 0; i < 3; i++) { const a = R.t * 6 + i * TAU / 3; estrela(ctx, e.x + Math.cos(a) * 13, e.y - e.r * 2.6 * sc / 1.2 - 8 + Math.sin(a) * 4, 4.5, 5, 0.45, a); gravar(ctx, COR.ipe, 1.1); }
  }
  if (e.burn) chama(ctx, e.x + Math.sin(R.t * 20) * 3, e.y - e.r * 1.2, 8, 12, COR.urucum, COR.ipe);
  if (e.elite && e.hp < e.maxHp) {
    const bw = e.r * 2.4;
    ctx.beginPath(); ctx.rect(e.x - bw / 2, e.y + 7, bw, 5); gravar(ctx, COR.papel, 1.5);
    ctx.fillStyle = COR.ipe; ctx.fillRect(e.x - bw / 2 + 0.8, e.y + 7.8, (bw - 1.6) * clamp(e.hp / e.maxHp, 0, 1), 3.4);
  }
}

function drawPlayer(ctx, w) {
  const p = w.player;
  if (w.state === 'dead') return;
  drawShadow(ctx, p.x, p.y, 14);
  if (p.dashT > 0) {
    for (let i = 1; i <= 3; i++) drawSprite(ctx, w.classId, p.x - p.dashVx * 0.012 * i, p.y - p.dashVy * 0.012 * i, { scale: SPR_VIS, alpha: 0.3 / i, flip: Math.cos(p.facing) < 0 });
  }
  const blink = p.iframes > 0 && Math.floor(R.t * 20) % 2 === 0;
  const bob = p.moving ? Math.abs(Math.sin(p.walk * 1.2)) * 3 : Math.sin(R.t * 2.5) * 0.8;
  // o boneco faz o movimento do golpe: gira, chuta, rasteira, atira, lança...
  let flip = Math.cos(p.facing) < 0, rot = p.moving ? Math.sin(p.walk * 1.2) * 0.06 : 0, squash = 1, lift = 0, ox = 0;
  let key = walkKey(w.classId, p.walk * 1.2, p.moving);
  const an = p.anim;
  if (an) {
    const k = 1 - an.t / an.max, side = an.ang != null ? (Math.cos(an.ang) < 0 ? -1 : 1) : (flip ? -1 : 1);
    if (an.ang != null) flip = side < 0;
    const pulse = Math.sin(k * Math.PI);
    if (an.kind === 'spin') { flip = Math.floor((an.max - an.t) * 14) % 2 === 0; rot = Math.sin(k * TAU * Math.max(1, an.max * 3)) * 0.35; lift = pulse * 4; }
    else if (an.kind === 'kick') { rot = -side * pulse * 0.75; ox = side * pulse * 8; lift = pulse * 5; }
    else if (an.kind === 'sweep') { squash = 1 - pulse * 0.38; rot = side * pulse * 0.5; flip = Math.floor(k * 4) % 2 === 0 ? flip : !flip; }
    else if (an.kind === 'slam') { squash = 1 - pulse * 0.3; lift = k < 0.3 ? (0.3 - k) * 40 : 0; rot = side * pulse * 0.3; }
    else if (an.kind === 'grab') { ox = side * pulse * 9; rot = side * pulse * 0.4; }
    else if (an.kind === 'slash') { ox = side * pulse * 8; rot = side * pulse * 0.45; }
    else if (an.kind === 'shoot') { ox = -side * pulse * 6; rot = -side * pulse * 0.22; }
    else if (an.kind === 'throw') { rot = side * (k < 0.4 ? -k : (k - 0.4)) * 0.9; ox = side * pulse * 4; }
    else if (an.kind === 'cast') { lift = pulse * 7; squash = 1 + pulse * 0.08; }
    else if (an.kind === 'guard') { squash = 1 - pulse * 0.15; }
    if (an.kind === 'cast') { // reza: raios de gravura saindo do chão
      ctx.strokeStyle = COR.agua; ctx.lineWidth = 2.5;
      for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + R.t; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * 14, p.y + Math.sin(a) * 6); ctx.lineTo(p.x + Math.cos(a) * (18 + 16 * pulse), p.y + Math.sin(a) * (8 + 7 * pulse)); ctx.stroke(); }
    }
    key = w.classId;
  }
  if (p.lunge) {
    rot = Math.cos(p.lunge.ang) * 0.5; flip = Math.cos(p.lunge.ang) < 0; key = w.classId + '+';
    for (let i = 1; i <= 3; i++) drawSprite(ctx, key, p.x - p.lunge.vx * 0.012 * i, p.y - p.lunge.vy * 0.012 * i, { scale: SPR_VIS, alpha: 0.3 / i, flip, rot });
  }
  if (p.ultT > 0) { // ultimate: sol de gravura girando no chão
    const c = CLASSES[w.classId].color;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.42);
    estrela(ctx, 0, 0, 40 + 3 * Math.sin(R.t * 12), 14, 0.72, R.t * 3); ctx.fillStyle = c; ctx.globalAlpha = 0.8; ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = COR.tinta; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }
  if (p.buffAtkT > 0) { ctx.setLineDash([5, 4]); ctx.lineDashOffset = -R.t * 30; ctx.beginPath(); ctx.ellipse(p.x, p.y, 21, 9, 0, 0, TAU); ctx.strokeStyle = COR.mata; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]); }
  drawSprite(ctx, key, p.x + ox, p.y - bob - lift, { scale: SPR_VIS, flip, white: p.flash > 0, alpha: blink ? 0.45 : null, rot, squash });
  if (p.barrier > 0) { // barreira: aro tracejado
    ctx.setLineDash([8, 5]); ctx.lineDashOffset = R.t * 20;
    ctx.beginPath(); ctx.arc(p.x, p.y - 22, 31, 0, TAU); ctx.strokeStyle = COR.tinta; ctx.lineWidth = 4.5; ctx.stroke();
    ctx.strokeStyle = '#9b7bff'; ctx.lineWidth = 2.2; ctx.stroke(); ctx.setLineDash([]);
  }
  if (p.dashCd > 0) {
    const cd = w.classId === 'capoeirista' ? 1.4 : 2.0;
    ctx.beginPath(); ctx.arc(p.x, p.y + 11, 8, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p.dashCd / cd));
    ctx.strokeStyle = COR.tinta; ctx.lineWidth = 4.5; ctx.stroke(); ctx.strokeStyle = COR.papel; ctx.lineWidth = 2; ctx.stroke();
  }
  if (p.slowT > 0) notaMusical(ctx, p.x + 18, p.y - 62, 7, COR.chita);
}

function drawProjectile(ctx, pr) {
  const ang = Math.atan2(pr.vy || 0, pr.vx || 1);
  switch (pr.kind) {
    case 'fatuo': { // fogo-fátuo: gota de fogo azul apontando para onde vai
      ctx.save(); ctx.translate(pr.x, pr.y - 10); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(7, 0); ctx.quadraticCurveTo(2, -7, -5, -4); ctx.lineTo(-15, 0); ctx.lineTo(-5, 4); ctx.quadraticCurveTo(2, 7, 7, 0); ctx.closePath();
      gravar(ctx, '#4fb3e8', 1.6);
      ctx.beginPath(); ctx.arc(1.5, 0, 2.6, 0, TAU); ctx.fillStyle = COR.papel; ctx.fill();
      ctx.restore();
      break;
    }
    case 'pellet':
      ctx.strokeStyle = COR.tinta; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(pr.x, pr.y - 10); ctx.lineTo(pr.x - Math.cos(ang) * 11, pr.y - 10 - Math.sin(ang) * 11); ctx.stroke();
      ctx.beginPath(); ctx.arc(pr.x, pr.y - 10, 3, 0, TAU); gravar(ctx, COR.ipe, 1.3);
      break;
    case 'hat':
      ctx.save(); ctx.translate(pr.x, pr.y - 12); ctx.rotate(pr.spin);
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 7, 0, 0, TAU); gravar(ctx, '#a0703a', 2);
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 3.4, 0, 0, TAU); ctx.strokeStyle = COR.tinta; ctx.lineWidth = 1.2; ctx.stroke();
      estrela(ctx, 0, 0, 3.4); gravar(ctx, COR.ipe, 0.8);
      ctx.restore();
      break;
    case 'bottle': {
      const h = pr.h || 0;
      drawShadow(ctx, pr.x, pr.y, 6);
      ctx.save(); ctx.translate(pr.x, pr.y - 10 - h); ctx.rotate(R.t * 12);
      ctx.beginPath(); ctx.rect(-4, -6, 8, 12); gravar(ctx, '#3f9c5a', 1.6);
      ctx.beginPath(); ctx.rect(-2, -10, 4, 4); gravar(ctx, '#c08a50', 1.2);
      ctx.restore();
      break;
    }
    case 'rifle':
      ctx.strokeStyle = COR.tinta; ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(pr.x, pr.y - 12); ctx.lineTo(pr.x - Math.cos(ang) * 30, pr.y - 12 - Math.sin(ang) * 30); ctx.stroke();
      ctx.strokeStyle = COR.ipe; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pr.x, pr.y - 12); ctx.lineTo(pr.x - Math.cos(ang) * 28, pr.y - 12 - Math.sin(ang) * 28); ctx.stroke();
      break;
    case 'chinelo':
      ctx.save(); ctx.translate(pr.x, pr.y - 12); ctx.rotate(pr.spin || 0);
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 6, 0, 0, TAU); gravar(ctx, '#2f8fd8', 2);
      ctx.strokeStyle = COR.papel; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(2, 0); ctx.lineTo(-4, 4); ctx.stroke();
      ctx.restore();
      break;
    default:
      ctx.beginPath(); ctx.arc(pr.x, pr.y - 10, 4, 0, TAU); gravar(ctx, COR.papel, 1.5);
  }
}

function drawFx(ctx, f, w) {
  const k = f.life / f.max;
  const p = w.player;
  const x = f.follow ? p.x : f.x, y = (f.follow ? p.y : f.y) - 14;
  ctx.globalAlpha = clamp(k * 1.6, 0, 1);
  switch (f.kind) {
    case 'arc': { // golpe em arco: fatia chapada com riscos de movimento
      const a0 = f.ang - f.spread / 2, a1 = f.ang + f.spread / 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, f.r, a0, a1); ctx.closePath(); ctx.fillStyle = hexA(f.color, 0.55); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, f.r, a0, a1); ctx.strokeStyle = COR.tinta; ctx.lineWidth = 4.5; ctx.stroke();
      ctx.strokeStyle = COR.tinta; ctx.lineWidth = 1.6;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.arc(x, y, f.r * (1 - i * 0.2), a0 + 0.15 * i, a1 - 0.15 * i); ctx.stroke(); }
      break;
    }
    case 'spin': {
      const a0 = (1 - k) * TAU * 1.2;
      ctx.beginPath(); ctx.arc(x, y, f.r, a0, a0 + Math.PI * 1.35); ctx.strokeStyle = COR.tinta; ctx.lineWidth = 9; ctx.stroke();
      ctx.strokeStyle = f.color; ctx.lineWidth = 4.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, f.r * 0.78, a0 + 0.5, a0 + Math.PI); ctx.strokeStyle = COR.tinta; ctx.lineWidth = 2; ctx.stroke();
      break;
    }
    case 'ring': {
      const rr = f.r * (1.15 - k * 0.15);
      ctx.beginPath(); ctx.arc(f.x, f.y - 10, rr, 0, TAU); ctx.strokeStyle = COR.tinta; ctx.lineWidth = 6.5; ctx.stroke();
      ctx.strokeStyle = f.color; ctx.lineWidth = 3; ctx.stroke();
      break;
    }
    case 'grab':
      ctx.beginPath(); ctx.moveTo(f.x, f.y - 20); ctx.lineTo(f.tx, f.ty - 14); ctx.strokeStyle = COR.tinta; ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = f.color; ctx.lineWidth = 3.5; ctx.stroke();
      estrela(ctx, f.tx, f.ty - 14, 15 * (1.3 - k * 0.3), 8, 0.55, f.tx); gravar(ctx, f.color, 2);
      break;
    case 'puff':
      for (let i = 0; i < 5; i++) {
        const a = i * TAU / 5 + f.x;
        ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * (1 - k) * 22, f.y - 12 + Math.sin(a) * (1 - k) * 14, 5 * k + 1.5, 0, TAU); gravar(ctx, f.color, 1.4);
      }
      break;
    case 'boom': { // estouro: explosão de pontas, como nos cartazes
      const rr = f.r * (1.1 - k * 0.4);
      estrela(ctx, f.x, f.y - 6, rr, 14, 0.7, f.x * 0.1); ctx.fillStyle = hexA(f.color, 0.75); ctx.fill();
      ctx.strokeStyle = COR.tinta; ctx.lineWidth = 3; ctx.stroke();
      estrela(ctx, f.x, f.y - 6, rr * 0.5, 10, 0.6, f.x * 0.1 + 0.3); ctx.fillStyle = COR.papel; ctx.fill();
      break;
    }
    case 'line': { // linha de fogo anunciada
      ctx.globalAlpha = 0.45 + 0.4 * Math.abs(Math.sin(R.t * 14));
      ctx.strokeStyle = f.color; ctx.lineWidth = 34; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(f.ang) * f.len, f.y + Math.sin(f.ang) * f.len); ctx.stroke();
      ctx.setLineDash([12, 8]); ctx.strokeStyle = COR.tinta; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = 'round';
      break;
    }
    case 'dash':
      ctx.strokeStyle = COR.tinta; ctx.lineWidth = 2.6;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(f.x + i * 6, f.y - 18 + i * 6); ctx.lineTo(f.x - Math.cos(f.ang) * (34 - Math.abs(i) * 10) + i * 6, f.y - 18 - Math.sin(f.ang) * (34 - Math.abs(i) * 10) + i * 6); ctx.stroke(); }
      break;
  }
  ctx.globalAlpha = 1;
}

// ---------------- HUD ----------------
function rrPath(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
// fita (como a do Senhor do Bonfim): faixa com ponta em rabo de andorinha
function fita(ctx, x, y, w, h) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w + 9, y); ctx.lineTo(x + w + 2, y + h / 2); ctx.lineTo(x + w + 9, y + h); ctx.lineTo(x, y + h); ctx.closePath();
}

function drawHUD(ctx, w, dt) {
  const p = w.player, s = w.stats;
  const W = R.W, H = R.H;
  ctx.textBaseline = 'middle'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // vida baixa: moldura vermelha pulsando
  const hr = p.hp / s.maxHp;
  if (hr < 0.35 && w.state !== 'dead') {
    ctx.strokeStyle = `rgba(197,54,29,${(0.35 - hr) * 2.2 * (0.6 + 0.4 * Math.sin(R.t * 6))})`; ctx.lineWidth = 34;
    ctx.strokeRect(0, 0, W, H);
  }

  // experiência: varal de bandeirinhas de São João que vai colorindo
  const fw = clamp(W / 44, 15, 24), n = Math.ceil(W / fw), cheias = clamp(w.xp / w.xpNext, 0, 1) * n;
  for (let i = 0; i < n; i++) {
    bandeirinha(ctx, i * fw + 1.5, 3, fw - 3, 15);
    ctx.fillStyle = i < Math.floor(cheias) ? BANDEIRAS[i % BANDEIRAS.length] : COR.papel; ctx.fill();
    if (i === Math.floor(cheias) && cheias % 1 > 0.05) { ctx.save(); ctx.clip(); ctx.fillStyle = BANDEIRAS[i % BANDEIRAS.length]; ctx.fillRect(i * fw, 0, fw * (cheias % 1), 20); ctx.restore(); bandeirinha(ctx, i * fw + 1.5, 3, fw - 3, 15); }
    ctx.strokeStyle = COR.tinta; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.strokeStyle = COR.tinta; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(W, 3); ctx.stroke();

  // vida: fita vermelha
  const hx = 16, hy = 28, hw = Math.min(300, W * 0.28), hh = 22;
  fita(ctx, hx, hy, hw, hh); ctx.fillStyle = COR.papel; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = COR.urucum; ctx.fillRect(hx, hy, (hw + 9) * clamp(hr, 0, 1), hh);
  if (p.barrier > 0) { ctx.fillStyle = '#7d63d8'; ctx.fillRect(hx, hy + hh - 6, (hw + 9) * clamp(p.barrier / s.maxHp, 0, 1), 6); }
  ctx.restore();
  fita(ctx, hx, hy, hw, hh); ctx.strokeStyle = COR.tinta; ctx.lineWidth = 2.5; ctx.stroke();
  xiloText(ctx, `${fmt(Math.ceil(p.hp))} / ${fmt(s.maxHp)}`, hx + hw / 2, hy + 6.5, 9.5, { align: 'center', cor: COR.tinta, contorno: COR.papel, cw: 1.6 });

  // nível, dinheiro e rerrolagens
  let lx = hx; const ly = hy + hh + 9;
  lx += xiloText(ctx, `NV ${w.level}`, lx, ly, 11, { cor: COR.tinta, contorno: COR.papel, cw: 1.8 }) + 16;
  ctx.beginPath(); ctx.arc(lx + 7, ly + 5.5, 7.5, 0, TAU); gravar(ctx, COR.ipe, 2);
  xiloText(ctx, '$', lx + 4.3, ly + 2, 7, { cor: COR.tinta, peso: 1.1 });
  lx += 19 + xiloText(ctx, String(w.coins), lx + 19, ly, 11, { cor: COR.tinta, contorno: COR.papel, cw: 1.8 }) + 16;
  ctx.beginPath(); ctx.arc(lx + 7, ly + 5.5, 6, 0.6, TAU - 0.5); ctx.strokeStyle = COR.papel; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = COR.anil; ctx.lineWidth = 2.6; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lx + 14.5, ly - 1); ctx.lineTo(lx + 14, ly + 5.5); ctx.lineTo(lx + 8.5, ly + 3); ctx.closePath(); ctx.fillStyle = COR.anil; ctx.fill();
  xiloText(ctx, String(w.rerolls), lx + 19, ly, 11, { cor: COR.tinta, contorno: COR.papel, cw: 1.8 });

  // vantagem de classe visível: faixa da Lutadora e sol do Cangaceiro
  ctx.textAlign = 'left';
  if (w.classId === 'jiujitsu') {
    const bl = BELTS[beltIndex(w.level)];
    fita(ctx, hx, ly + 20, 104, 16); gravar(ctx, bl.color, 2);
    xiloText(ctx, bl.name, hx + 7, ly + 24.5, 7, { cor: beltIndex(w.level) === 0 ? COR.tinta : COR.papel });
  } else if (w.classId === 'cangaceiro') {
    const sol = BIOMES[PHASES[Math.max(0, w.phaseIdx)].biome].sol;
    estrela(ctx, hx + 9, ly + 28, 9, 10, 0.62, R.t * 0.6); gravar(ctx, sol ? COR.ipe : COR.papel2, 1.6);
    txt(ctx, sol ? 'Sol forte: +30% de Cangaço' : 'Sem sol forte: +10% de Cangaço', hx + 24, ly + 28, 'italic 700 12px Georgia, serif');
  }

  // mapa / etapa / tempo até o chefe
  const topo = w.tutorial ? 'TUTORIAL' : `${w.mapa.name.toUpperCase()} · ETAPA ${w.etapa + 1}${w.nPlayers > 1 ? ' · ' + w.nPlayers + ' JOG.' : ''}`;
  xiloText(ctx, topo, W / 2, 27, 10, { align: 'center', cor: COR.tinta, contorno: COR.papel, cw: 2 });
  ctx.textAlign = 'center';
  const vivos = w.bossesAlive ? w.bossesAlive() : 0;
  if (w.tutorial) {
    txt(ctx, 'com Seu Biu', W / 2, 48, 'italic 700 13px Georgia, serif');
  } else if (!vivos) {
    const tIn = w.time - w.etapa * ETAPA_T, left = Math.max(0, CHEFE_EM - tIn);
    xiloText(ctx, `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`, W / 2, 46, 20, { align: 'center', cor: left < 10 ? COR.urucum : COR.tinta, contorno: COR.papel, cw: 2.6 });
    txt(ctx, 'até o chefe', W / 2, 80, 'italic 700 12px Georgia, serif');
  }
  if (vivos && w.boss && !w.boss.dead) {
    const b = w.boss, bw = Math.min(520, W * 0.6), bx = W / 2 - bw / 2, by = 46;
    fita(ctx, bx, by, bw, 20); ctx.fillStyle = COR.papel; ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = COR.urucum; ctx.fillRect(bx, by, (bw + 9) * clamp(b.hp / b.maxHp, 0, 1), 20); ctx.restore();
    fita(ctx, bx, by, bw, 20); ctx.strokeStyle = COR.tinta; ctx.lineWidth = 2.5; ctx.stroke();
    xiloText(ctx, `${b.name} · ${fmt(Math.max(0, b.hp))}`, W / 2, by + 5.5, 9, { align: 'center', cor: COR.tinta, contorno: COR.papel, cw: 1.6 });
    if (w.bossT > 60) txt(ctx, `cansado: recebe ×${Math.min(2.5, 1 + (w.bossT - 60) * 0.03).toFixed(1)} de dano`, W / 2, by + 33, 'italic 700 12px Georgia, serif', COR.urucum);
  }

  // abates: caveirinha
  const kx = W - 16, kt = String(w.runKills), kw = xiloWidth(kt, 11);
  xiloText(ctx, kt, kx, 23, 11, { align: 'right', cor: COR.tinta, contorno: COR.papel, cw: 1.8 });
  const cx = kx - kw - 15;
  ctx.beginPath(); ctx.arc(cx, 27, 6.5, 0, TAU); gravar(ctx, COR.papel, 2);
  ctx.beginPath(); ctx.rect(cx - 3.5, 31, 7, 4.5); gravar(ctx, COR.papel, 2);
  ctx.fillStyle = COR.tinta; ctx.beginPath(); ctx.arc(cx - 2.4, 27, 1.7, 0, TAU); ctx.arc(cx + 2.4, 27, 1.7, 0, TAU); ctx.fill();

  // golpes (canto inferior esquerdo): folhetinhos
  const gs = w.golpes;
  const iw = 58, ih = 40, gap = 9;
  let gx = 16;
  const gy = H - ih - 20;
  for (const g of gs) {
    const def = GOLPES[g.id];
    const tagc = def.tag ? TAGS[def.tag].color : COR.ipe;
    ctx.fillStyle = COR.tinta; ctx.fillRect(gx + 3, gy + 3, iw, ih); // sombra dura
    const img = iconImg(def.art, tagc);
    if (img.complete && img.naturalWidth) ctx.drawImage(img, gx, gy, iw, ih); else { ctx.fillStyle = COR.papel; ctx.fillRect(gx, gy, iw, ih); }
    if (def.cd) {
      const k = clamp(g.t / w.golpeCd(g), 0, 1);
      ctx.fillStyle = 'rgba(26,19,14,0.62)'; ctx.fillRect(gx, gy, iw, ih * k);
    }
    ctx.strokeStyle = COR.tinta; ctx.lineWidth = 2.5; ctx.strokeRect(gx, gy, iw, ih);
    for (let i = 0; i < 5 && !g.hidden; i++) {
      ctx.beginPath(); ctx.rect(gx + 2 + i * 11, gy + ih + 5, 7.5, 7.5); gravar(ctx, i < g.level ? tagc : COR.papel, 1.5);
    }
    gx += iw + gap;
  }

  // especial (Q), ultimate (R) e item ativo (E): carimbos
  gx += 8;
  const slot = (key, label, k, ready, color, icon) => {
    ctx.fillStyle = COR.tinta; ctx.fillRect(gx + 3, gy + 3, 44, ih);
    ctx.beginPath(); ctx.rect(gx, gy, 44, ih); gravar(ctx, ready ? color : COR.papel2, 2.5);
    ctx.save(); ctx.translate(gx + 22, gy + ih / 2); if (!ready) ctx.globalAlpha = 0.5; icon(); ctx.restore();
    if (k > 0) {
      ctx.fillStyle = 'rgba(26,19,14,0.62)'; ctx.fillRect(gx + 1.2, gy + 1.2, 41.6, (ih - 2.4) * clamp(k, 0, 1));
      xiloText(ctx, label, gx + 22, gy + ih / 2 - 5.5, 11, { align: 'center', cor: COR.papel, contorno: COR.tinta, cw: 1.6 });
    }
    xiloText(ctx, key, gx + 22, gy + ih + 5, 8, { align: 'center', cor: COR.tinta, contorno: COR.papel, cw: 1.5 });
    gx += 54;
  };
  slot('Q', String(Math.ceil(w.specialT)), w.specialT / w.specialCd(), w.specialT <= 0, CLASSES[w.classId].color, () => { // redemoinho
    ctx.strokeStyle = COR.tinta; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 11, 0.4, 4.6); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 5.5, 3.5, 7.8); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, TAU); ctx.fillStyle = COR.tinta; ctx.fill();
  });
  slot('R', String(Math.ceil(w.ultT)), w.ultT / w.ultCd(), w.ultT <= 0, COR.chita, () => { // sol de cordel
    estrela(ctx, 0, 0, 14, 10, 0.6, w.ultT <= 0 ? R.t : 0); gravar(ctx, COR.ipe, 1.8);
    ctx.fillStyle = COR.tinta; ctx.beginPath(); ctx.arc(-2.6, -1, 1.2, 0, TAU); ctx.arc(2.6, -1, 1.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 1.2, 3.2, 0.2, Math.PI - 0.2); ctx.strokeStyle = COR.tinta; ctx.lineWidth = 1.2; ctx.stroke();
  });
  if (w.ativo) {
    const at = ATIVO_BY_ID[w.ativo.id], img = iconImg(at.art, '#7ab8ff');
    slot('E', String(Math.ceil(w.ativo.t)), w.ativo.t / at.cd, w.ativo.t <= 0, '#8fc4ee', () => { if (img.complete && img.naturalWidth) ctx.drawImage(img, -20, -13, 40, 26); });
  } else slot('E', '', 0, false, COR.papel2, () => { ctx.strokeStyle = COR.tinta; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke(); });

  // sinergias (canto inferior direito): etiquetas
  let sy = H - 24;
  const tagsOrder = Object.keys(TAGS).filter(t => (w.tagCounts[t] || 0) > 0).sort((a, b) => w.tagCounts[b] - w.tagCounts[a]);
  for (const t of tagsOrder) {
    const nT = w.tagCounts[t], tier = w.tagTiers[t], info = TAGS[t];
    const next = TAG_TIERS.find(x => x > nT);
    const label = `${info.name} ${nT}${next ? '/' + next : ''}`;
    const tw = xiloWidth(label, 8.5) + 46;
    ctx.fillStyle = COR.tinta; ctx.fillRect(W - 16 - tw + 3, sy - 9, tw, 22);
    ctx.beginPath(); ctx.rect(W - 16 - tw, sy - 12, tw, 22); gravar(ctx, tier > 0 ? info.color : COR.papel, 2.2);
    xiloText(ctx, label, W - 24, sy - 5.2, 8.5, { align: 'right', cor: COR.tinta });
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.rect(W - 16 - tw + 7 + i * 9, sy - 4, 6, 6); gravar(ctx, i < tier ? COR.tinta : COR.papel, 1.3); }
    sy -= 30;
  }

  // faixas de aviso (fase, chefe, horda...)
  R.banners = R.banners.filter(b => (b.life -= dt) > 0);
  let by = H * 0.2;
  for (const b of R.banners) {
    const k = b.life / b.max;
    ctx.globalAlpha = Math.min(1, k * 4, (1 - k) * 8);
    let size = Math.min(40, W / 22);
    const larg = xiloWidth(b.text, size);
    if (larg > W * 0.9) size *= W * 0.9 / larg;
    xiloText(ctx, b.text, W / 2, by - size / 2, size, { align: 'center', cor: b.color, contorno: COR.tinta, cw: size * 0.11, sombra: COR.urucum, sx: size * 0.09, sy: size * 0.09, treme: 0.7 });
    if (b.sub) { ctx.textAlign = 'center'; txt(ctx, b.sub, W / 2, by + size / 2 + 22, `italic 700 ${Math.min(19, W / 40)}px Georgia, serif`, COR.tinta, COR.papel, 5); }
    by += size + 62;
  }
  ctx.globalAlpha = 1;
}
