'use strict';
// ===== Sprites desenhados por código (personagens, criaturas, cenário, itens) =====
// Cada sprite é pré-renderizado num canvas. Todos olham para a DIREITA (o jogo espelha).

const SPR_SCALE = 3;
const SPR_VIS = 1.25; // personagens e criaturas desenhados 25% maiores que o tamanho base // resolução interna (nitidez)
const INK = '#1b130d';

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// cria sprite w×h (em pixels do jogo) com origem no centro dos "pés"
function makeSprite(w, h, draw, seed = 1, amp = 2.2) {
  const c = mkCanvas(w * SPR_SCALE, h * SPR_SCALE);
  const g = c.getContext('2d');
  // gravura não tem brilho: qualquer shadowBlur pedido pelos desenhos é ignorado
  try { Object.defineProperty(g, 'shadowBlur', { get: () => 0, set: () => {} }); } catch (e) { /* segue sem */ }
  g.scale(SPR_SCALE, SPR_SCALE);
  g.translate(w / 2, h - 4);
  g.lineJoin = 'round'; g.lineCap = 'round';
  draw(g);
  // "entalha" o desenho: a linha treme como corte de goiva e a tinta falha aqui e ali
  const fin = entalhar(c, amp, seed, 0.07);
  return { c: fin, w, h, white: whiteVersion(fin) };
}
function whiteVersion(src) {
  const c = mkCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = 0.82;
  g.fillStyle = '#fff6e0';
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

// ---- primitivas com contorno ----
function shape(g, fill, path, lw = 2) {
  g.beginPath(); path(g);
  g.fillStyle = fill; g.fill();
  g.strokeStyle = INK; g.lineWidth = lw; g.stroke();
}
const ell = (x, y, rx, ry, rot = 0) => g => g.ellipse(x, y, rx, ry, rot, 0, TAU);
const circ = (x, y, r) => g => g.arc(x, y, r, 0, TAU);
const poly = pts => g => { g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); };
const rrect = (x, y, w, h, r) => g => { g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };
function limb(g, color, x1, y1, x2, y2, w) {
  g.strokeStyle = INK; g.lineWidth = w + 3; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  g.strokeStyle = color; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
}
function eye(g, x, y, r = 1.6, color = INK) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
function glowEye(g, x, y, r, color) {
  eye(g, x, y, r + 0.9, INK); eye(g, x, y, r, color); // olho aceso: disco de cor com aro de tinta
}

const SKIN = { morena: '#9a6240', escura: '#5b3a24', clara: '#d9a57a', palida: '#cfc3b0' };

// ---- tons e sombreado (luz vindo de cima/direita) ----
function tone(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
// forma com gradiente: box = [x, y, w, h] aproximado da forma
function sh(g, fill, path, box, lw = 2, o) {
  const [x, y, w, h] = box;
  g.beginPath(); path(g);
  g.fillStyle = fill; g.fill();
  if (!(o && o.liso) && w >= 9 && h >= 9 && fill[0] === '#') {
    // hachura: riscos paralelos no canto de baixo/esquerda. Em cor escura o risco é "entalhado" (cor de papel).
    g.save(); g.clip();
    g.strokeStyle = gLum(fill) < 0.36 ? 'rgba(242,228,196,0.5)' : 'rgba(26,19,14,0.4)';
    g.lineWidth = 0.8; g.lineCap = 'butt';
    const D = (w + h) * 0.36;
    for (let d = 1.6; d < D; d += 2.5) { g.beginPath(); g.moveTo(x - 1, y + h - d); g.lineTo(x + d, y + h + 1); g.stroke(); }
    g.restore();
    g.beginPath(); path(g);
  }
  if (lw) { g.strokeStyle = INK; g.lineWidth = lw * 1.1; g.stroke(); }
}
// membro com contorno, cor e brilho; aceita vários pontos (cotovelo/joelho)
function limbs(g, color, pts, w) {
  const path = () => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); };
  g.strokeStyle = INK; g.lineWidth = w + 3; path(); g.stroke();
  g.strokeStyle = color; g.lineWidth = w; path(); g.stroke();
}
function line(g, color, lw, pts) {
  g.strokeStyle = color; g.lineWidth = lw; g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.stroke();
}
function dot(g, x, y, r, color) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
// perna andando: f = -1/0/1 (passo), side = -1 (de trás) / 1 (da frente)
function leg(g, color, hx, hy, f, side, w, foot, len = 1) {
  const s = f * side;
  const fx = hx + s * 4, kx = hx + s * 2.5 + 1.5, ky = hy * 0.5 - Math.abs(f) * 0.6;
  limbs(g, color, [hx, hy, kx, ky * len, fx, -1.5 - (s > 0 ? 0 : Math.abs(f) * 1.2)], w);
  if (foot) sh(g, foot, ell(fx + 2, -1.2 - (s > 0 ? 0 : Math.abs(f) * 1.2), w * 0.55 + 1.5, 1.8), [fx - 2, -4, 8, 4], 1.3);
}
// cabeça humana virada para a direita
function head(g, x, y, r, skin, o = {}) {
  sh(g, skin, circ(x, y, r), [x - r, y - r, r * 2, r * 2], 2, { liso: true });
  // orelha
  sh(g, skin, ell(x - r * 0.25, y + 0.5, 1.8, 2.6), [x - 3, y - 3, 4, 6], 1.2);
  // nariz
  g.fillStyle = tone(skin, -0.25); g.beginPath(); g.moveTo(x + r - 0.5, y - 1); g.lineTo(x + r + 1.8, y + 1.6); g.lineTo(x + r - 0.6, y + 2.2); g.fill();
  // olho com brilho
  if (!o.noEye) {
    dot(g, x + r * 0.45, y - 1, o.eyeR || 1.5, '#fff');
    dot(g, x + r * 0.5 + 0.3, y - 1, (o.eyeR || 1.5) * 0.7, o.iris || INK);
    dot(g, x + r * 0.5 + 0.6, y - 1.6, 0.45, '#fff');
    line(g, o.brow || INK, 1.2, [x + r * 0.15, y - 3.6 + (o.angry ? -0.6 : 0), x + r * 0.8, y - 3.3 + (o.angry ? 1 : 0)]);
  }
  // boca
  g.strokeStyle = INK; g.lineWidth = 1;
  g.beginPath();
  if (o.smile) g.arc(x + r * 0.45, y + 3, 1.8, 0.2, Math.PI - 0.6); else { g.moveTo(x + r * 0.25, y + 3.8); g.lineTo(x + r * 0.75, y + 3.6); }
  g.stroke();
  if (o.blush) { g.fillStyle = 'rgba(230,90,90,0.35)'; g.beginPath(); g.arc(x + r * 0.2, y + 2, 1.6, 0, TAU); g.fill(); }
}
function flagPatch(g, x, y) {
  g.fillStyle = '#1e9a45'; g.fillRect(x, y, 6, 4);
  g.fillStyle = '#f2d021'; g.beginPath(); g.moveTo(x + 3, y + 0.4); g.lineTo(x + 5.6, y + 2); g.lineTo(x + 3, y + 3.6); g.lineTo(x + 0.4, y + 2); g.fill();
  dot(g, x + 3, y + 2, 1, '#23408e');
  g.strokeStyle = INK; g.lineWidth = 0.6; g.strokeRect(x, y, 6, 4);
}
function furTufts(g, cx, cy, rx, ry, n, color) {
  g.strokeStyle = color; g.lineWidth = 1.2;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, x = cx + Math.cos(a) * rx * 0.75, y = cy + Math.sin(a) * ry * 0.75;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a + 0.6) * 3, y + Math.sin(a + 0.6) * 3); g.stroke();
  }
}

// ---------------- PERSONAGENS ----------------
// Cada função recebe (g, f): f = -1, 0 ou 1 = quadro do passo (0 = parado).
const SPRITE_DRAW = {
  capoeirista(g, f) {
    // abadá branco, torso nu, cordão verde-amarelo, guarda alta da ginga
    limbs(g, SKIN.morena, [-5, -30, -11, -25, -12, -19], 3.6);           // braço de trás
    leg(g, '#e4dccb', -3, -16, f, -1, 6.5, SKIN.morena);
    leg(g, '#f3efe4', 3, -16, f, 1, 6.5, SKIN.morena);
    sh(g, '#f3efe4', rrect(-8, -20, 16, 7, 3), [-8, -20, 16, 7]);       // cós da calça
    sh(g, SKIN.morena, rrect(-7, -34, 14, 16, 5), [-7, -34, 14, 16]);  // torso
    g.strokeStyle = tone(SKIN.morena, -0.35); g.lineWidth = 0.9;
    g.beginPath(); g.arc(-1, -30, 3.2, 0.3, Math.PI - 0.3); g.arc(5, -30, 3, 0.3, Math.PI - 0.6); g.stroke(); // peitoral
    line(g, tone(SKIN.morena, -0.35), 0.8, [2, -25, 2, -20]); line(g, tone(SKIN.morena, -0.35), 0.8, [-1, -23, 5, -23]);
    // cordão trançado
    for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#3aa655' : '#f2c14e'; g.fillRect(-7 + i * 2, -19.5, 2, 2.6); }
    line(g, '#f2c14e', 1.6, [4, -17, 5, -11]); line(g, '#3aa655', 1.6, [5.5, -17, 6.8, -11.5]);
    dot(g, 5.6, -10.5, 1.4, '#f2c14e');
    limbs(g, SKIN.morena, [5, -31, 11, -26, 11, -35], 3.8);           // braço da frente em guarda
    dot(g, 11, -36, 2.2, SKIN.morena); g.strokeStyle = INK; g.lineWidth = 1; g.beginPath(); g.arc(11, -36, 2.2, 0, TAU); g.stroke();
    head(g, 0, -40, 7, SKIN.morena, { smile: true });
    sh(g, '#1b130d', g2 => { g2.arc(0, -41.5, 7.4, Math.PI * 1.02, -0.15); g2.lineTo(-5, -40); g2.closePath(); }, [-7, -49, 14, 9], 1);
    g.fillStyle = '#3a2a20'; for (let i = 0; i < 5; i++) dot(g, -4 + i * 2.2, -46.2 + Math.abs(i - 2) * 0.5, 0.8, '#3a2a20');
  },
  jiujitsu(g, f) {
    // quimono azul, gola reforçada, faixa roxa com pontas, remendo da bandeira, coque
    limbs(g, '#28529c', [-6, -30, -11, -24, -10, -18], 5.5);
    dot(g, -10, -17.5, 2.2, SKIN.clara);
    leg(g, '#28529c', -3, -15, f, -1, 7.5, SKIN.clara);
    leg(g, '#2f5fb3', 3, -15, f, 1, 7.5, SKIN.clara);
    sh(g, '#2f5fb3', rrect(-9, -34, 18, 21, 5), [-9, -34, 18, 21]);
    // gola cruzada
    g.fillStyle = '#1f4688'; g.beginPath(); g.moveTo(-4, -34); g.lineTo(3, -22); g.lineTo(6, -22); g.lineTo(-1, -34); g.fill();
    g.beginPath(); g.moveTo(4, -34); g.lineTo(-1, -27); g.lineTo(1, -25); g.lineTo(7, -34); g.fill();
    line(g, INK, 0.8, [-4, -34, 3, -22]); line(g, INK, 0.8, [4, -34, -1, -27]);
    // costura
    g.setLineDash([1.2, 1.2]); line(g, '#9fbbe8', 0.6, [-7.5, -31, -7.5, -16]); g.setLineDash([]);
    flagPatch(g, -7, -31);
    // faixa roxa com nó e ponta preta
    sh(g, '#8b6bef', rrect(-9.5, -20, 19, 4, 1), [-9, -20, 19, 4], 1.2);
    sh(g, '#8b6bef', poly([3, -18, 7, -10, 9, -11, 6, -18]), [3, -18, 6, 8], 1);
    g.fillStyle = INK; g.fillRect(6.4, -12.5, 2.4, 2);
    sh(g, '#8b6bef', rrect(1.5, -20.5, 4, 5, 1), [1, -20, 4, 5], 1);
    limbs(g, '#2f5fb3', [7, -31, 12, -26, 15, -23], 6);
    dot(g, 15.5, -22.5, 2.6, SKIN.clara); g.strokeStyle = INK; g.lineWidth = 1; g.beginPath(); g.arc(15.5, -22.5, 2.6, 0, TAU); g.stroke();
    head(g, 0, -40, 7, SKIN.clara, { angry: true });
    sh(g, '#3b2416', g2 => { g2.arc(0, -42, 7.4, Math.PI * 0.92, -0.05); g2.lineTo(-3, -42); g2.closePath(); }, [-7, -49, 14, 8], 1);
    sh(g, '#3b2416', circ(-5.5, -47.5, 3.6), [-9, -51, 7, 7], 1.4);
    line(g, '#d84a3a', 1.6, [-4, -45.5, -3, -48]);
    line(g, '#6b4a33', 0.7, [-7, -48, -4, -46]);
  },
  benzedeira(g, f) {
    // saia rodada florida, avental, xale, lenço, óculos redondos, arruda e terço
    const sway = f * 1.5;
    if (f) { dot(g, -4 - f * 2, -1.5, 2, '#6b4a2b'); dot(g, 4 + f * 2, -1.5, 2, '#6b4a2b'); }
    sh(g, '#7a3b8f', poly([-13 + sway, -2, 13 + sway, -2, 7, -21, -7, -21]), [-13, -21, 26, 19]);
    g.strokeStyle = tone('#7a3b8f', -0.4); g.lineWidth = 0.8;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 2.4, -20); g.lineTo(i * 4.5 + sway, -2.5); g.stroke(); }
    for (const [x, y, c] of [[-8, -6, '#f2c14e'], [3, -12, '#ff7eb6'], [8, -5, '#f2c14e'], [-2, -16, '#ff7eb6'], [-4, -9, '#f3efe4'], [5, -17, '#f3efe4']]) {
      for (let k = 0; k < 4; k++) dot(g, x + sway * 0.5 + Math.cos(k * 1.57) * 1.1, y + Math.sin(k * 1.57) * 1.1, 0.9, c);
      dot(g, x + sway * 0.5, y, 0.6, '#d84a3a');
    }
    sh(g, '#f3efe4', poly([-3, -20, 7, -20, 9 + sway * 0.6, -5, 1 + sway * 0.6, -5]), [-3, -20, 12, 15], 1.2); // avental
    g.setLineDash([1, 1.3]); line(g, '#c9c0ad', 0.7, [1 + sway * 0.6, -6, 9 + sway * 0.6, -6]); g.setLineDash([]);
    limbs(g, SKIN.escura, [-5, -30, -9, -24, -8, -18], 3.4);
    // terço pendurado na mão de trás
    g.strokeStyle = '#8a5a2b'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-8, -17); g.quadraticCurveTo(-10, -11, -7, -9); g.stroke();
    for (let i = 0; i < 5; i++) dot(g, -8.8 + i * 0.35, -15.5 + i * 1.4, 0.8, '#d9b26a');
    line(g, '#d9b26a', 0.9, [-7, -9, -7, -6]); line(g, '#d9b26a', 0.9, [-8, -7.8, -6, -7.8]);
    sh(g, '#f3efe4', rrect(-7, -34, 14, 15, 5), [-7, -34, 14, 15]);
    for (let i = 0; i < 4; i++) dot(g, -4 + i * 2.6, -21.5, 0.7, '#c9c0ad');               // renda
    sh(g, '#c7563f', poly([-8, -33, 8, -33, 4, -24, -9, -26]), [-9, -33, 17, 9], 1.2);   // xale
    g.strokeStyle = '#f2c14e'; g.lineWidth = 0.7; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-8 + i * 2.6, -25.5 + i * 0.3); g.lineTo(-8.3 + i * 2.6, -23.5 + i * 0.3); g.stroke(); }
    limbs(g, SKIN.escura, [6, -30, 11, -27, 13, -26], 3.8);
    dot(g, 13.5, -26, 2.2, SKIN.escura);
    // galho de arruda
    line(g, '#2e7d32', 1.6, [13, -25, 17, -38]);
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#4caf50' : '#66bb6a'; g.beginPath(); g.ellipse(14 + i * 0.7 + (i % 2 ? 2 : -1.5), -28 - i * 1.9, 2.3, 1.1, i % 2 ? 0.6 : -0.6, 0, TAU); g.fill(); }
    head(g, 0, -39, 7, SKIN.escura, { smile: true, blush: true });
    // óculos redondos
    g.strokeStyle = '#d9b26a'; g.lineWidth = 0.9; g.beginPath(); g.arc(3.6, -40, 2.2, 0, TAU); g.stroke(); line(g, '#d9b26a', 0.8, [1.4, -40, -1.5, -41]);
    // cabelo grisalho saindo do lenço
    line(g, '#d6d0c4', 1.3, [-6.5, -38, -7.2, -33]); line(g, '#bdb6a8', 1.1, [-5.5, -37, -6, -33.5]);
    sh(g, '#d84a3a', g2 => { g2.arc(0, -40, 7.8, Math.PI * 1.02, -0.08); g2.lineTo(-9, -37); g2.closePath(); }, [-9, -48, 17, 11], 1.4);
    for (let i = 0; i < 4; i++) dot(g, -4 + i * 2.8, -44.5 + Math.abs(i - 1.5) * 0.6, 0.8, '#f3efe4');
    sh(g, '#d84a3a', poly([-8, -38, -12, -35, -10, -33, -7, -36]), [-12, -38, 5, 5], 1); // nó do lenço
  },
  cangaceiro(g, f) {
    // chapéu de couro com estrelas, gibão, cartucheiras com balas, lenço vermelho, bigode, peixeira e rifle nas costas
    sh(g, '#5a3a22', poly([-12, -40, -10, -42, 10, -10, 8, -8]), [-12, -42, 22, 34], 1.5);   // rifle nas costas
    line(g, '#9aa0a8', 1.4, [-11.5, -41.5, -14, -45]);
    limbs(g, '#7a4f25', [-6, -30, -10, -24, -9, -18], 4.6);
    dot(g, -9, -17.5, 2.2, SKIN.morena);
    leg(g, '#a08a5c', -3, -15, f, -1, 6.5, '#5a3a22');
    leg(g, '#b59c6a', 3, -15, f, 1, 6.5, '#5a3a22');
    sh(g, '#8a5a2b', rrect(-9, -34, 18, 21, 4), [-9, -34, 18, 21]);
    g.setLineDash([1.2, 1]); g.strokeStyle = '#d9b26a'; g.lineWidth = 0.6; g.strokeRect(-7.5, -32.5, 15, 18); g.setLineDash([]);
    // cartucheiras cruzadas com balas
    for (const s of [1, -1]) {
      line(g, INK, 4.2, [-8 * s, -33, 8 * s, -16]); line(g, '#6b4a2b', 3, [-8 * s, -33, 8 * s, -16]);
      for (let i = 1; i < 6; i++) dot(g, -8 * s + i * 2.7 * s, -33 + i * 2.85, 0.9, '#f2c14e');
    }
    sh(g, '#6b4a2b', rrect(-9.5, -16, 19, 3.5, 1), [-9, -16, 19, 3], 1.2);
    sh(g, '#d9b26a', rrect(-1.8, -16.3, 3.6, 4, 0.8), [-2, -16, 4, 4], 0.8);           // fivela
    sh(g, '#c0392b', poly([-5, -33, 5, -33, 2, -28, 0, -26, -2, -28]), [-5, -33, 10, 7], 1); // lenço
    limbs(g, '#8a5a2b', [7, -31, 12, -26, 15, -24], 5);
    dot(g, 15.5, -24, 2.4, SKIN.morena);
    // peixeira
    sh(g, '#d9dde2', poly([16, -26, 26, -29, 27, -28, 17, -23.5]), [16, -29, 11, 6], 1);
    sh(g, '#6b4a2b', rrect(13, -26, 4, 3, 1), [13, -26, 4, 3], 0.8);
    head(g, 0, -40, 7, SKIN.morena, { angry: true });
    // bigode e barba por fazer
    g.fillStyle = INK; g.beginPath(); g.moveTo(1, -37.2); g.quadraticCurveTo(5, -38.5, 8.5, -36.2); g.quadraticCurveTo(5, -36.6, 1, -36); g.fill();
    for (let i = 0; i < 6; i++) dot(g, 1 + i * 1.2, -34.6 + (i % 2) * 0.6, 0.35, '#3a2a20');
    line(g, '#6b4a2b', 0.8, [-5, -38, -3, -33, 4, -33]); // barbicacho
    // chapéu meia-lua de couro
    sh(g, '#a0703a', g2 => { g2.ellipse(0, -45, 12.5, 6.5, 0, Math.PI, 0); g2.closePath(); }, [-12, -52, 25, 7]);
    sh(g, '#b58045', g2 => { g2.moveTo(-15, -45); g2.quadraticCurveTo(0, -38.5, 15, -45); g2.lineTo(13, -47.5); g2.quadraticCurveTo(0, -42, -13, -47.5); g2.closePath(); }, [-15, -48, 30, 9], 1.5);
    g.setLineDash([1, 1]); g.strokeStyle = '#e8c890'; g.lineWidth = 0.6; g.beginPath(); g.ellipse(0, -45, 10.5, 5, 0, Math.PI + 0.2, -0.2); g.stroke(); g.setLineDash([]);
    drawStar(g, 0, -48.5, 3.2, '#f2c14e');
    drawStar(g, -7, -46.5, 1.6, '#f3efe4'); drawStar(g, 7, -46.5, 1.6, '#f3efe4');
  },

  // ---------------- CRIATURAS ----------------
  corposeco(g, f) {
    // morto ressecado: costelas, tanga rasgada, braços estendidos
    leg(g, '#7a6a4c', -3, -14, f, -1, 4, '#6b5c40');
    leg(g, '#8c7b5c', 3, -14, f, 1, 4, '#7a6a4c');
    limbs(g, '#7a6a4c', [-4, -27, 3, -25, 11, -26], 3);
    sh(g, '#8c7b5c', poly([-6, -31, 7, -29, 5, -13, -5, -13]), [-6, -31, 13, 18]);
    g.strokeStyle = '#4a3d28'; g.lineWidth = 0.9;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-4, -27 + i * 3.2); g.quadraticCurveTo(0.5, -25.5 + i * 3.2, 5, -27 + i * 3.2); g.stroke(); }
    line(g, '#4a3d28', 0.9, [0.5, -29, 0.5, -16]);
    sh(g, '#5a4632', poly([-6, -15, 6, -15, 7, -9, 3, -11, 1, -8, -2, -11, -6, -9]), [-6, -15, 13, 7], 1.2); // tanga
    limbs(g, '#8c7b5c', [5, -28, 11, -27, 16, -25], 3);
    g.strokeStyle = INK; g.lineWidth = 0.9; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(16, -25); g.lineTo(19, -27 + i * 1.6); g.stroke(); }
    sh(g, '#a8987a', ell(2, -36, 6, 7), [-4, -43, 12, 14]);
    dot(g, 4.5, -37, 2.1, '#1b130d'); dot(g, 0.4, -37, 1.8, '#1b130d');
    dot(g, 4.8, -37, 0.7, '#e8ff9a'); dot(g, 0.7, -37, 0.6, '#e8ff9a');
    g.fillStyle = INK; g.fillRect(1, -32.4, 5, 1.4);
    g.fillStyle = '#e8e0c8'; for (let i = 0; i < 3; i++) g.fillRect(1.5 + i * 1.6, -32.4, 0.9, 1.1);
    line(g, '#4a3d28', 0.8, [-2, -40, -1, -35]);
    g.strokeStyle = '#3a3026'; g.lineWidth = 0.9; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-3 + i * 1.5, -42.5); g.quadraticCurveTo(-6 + i, -38, -5 + i * 0.6, -33); g.stroke(); }
  },
  saci(g, f) {
    // uma perna só (pula), gorro vermelho, cachimbo, furo nas mãos, sorriso maroto
    const hop = Math.abs(f) * 2;
    g.save(); g.translate(0, -hop);
    limbs(g, '#3a2418', [0, -14, 1.5 + f, -7, 1, -1], 5);
    sh(g, '#3a2418', ell(3, -1, 4, 1.8), [-1, -3, 8, 4], 1.2);
    sh(g, '#c0392b', rrect(-6.5, -19, 13, 7, 2), [-6, -19, 13, 7]);                          // bermuda
    limbs(g, '#2b1a12', [-5, -27, -9, -23, -9, -19], 3.4);
    sh(g, '#3a2418', rrect(-6, -31, 12, 14, 5), [-6, -31, 12, 14]);
    line(g, tone('#3a2418', -0.4), 0.8, [-1, -27, 3, -27]);
    limbs(g, '#3a2418', [5, -28, 10, -23, 12, -26], 3.4);
    dot(g, 12.5, -26.5, 2, '#3a2418'); dot(g, 12.5, -26.5, 0.7, '#ffcf8a');                // furo na mão
    head(g, 0, -36, 6.5, '#3a2418', { smile: true, iris: '#7a2a10' });
    g.fillStyle = '#fff'; g.beginPath(); g.arc(3.2, -33, 1.6, 0.1, Math.PI - 0.5); g.fill();
    // cachimbo e fumaça
    line(g, '#7a4a2a', 1.8, [4.5, -32.5, 10, -31.5]); sh(g, '#7a4a2a', rrect(9, -35, 3, 4, 1), [9, -35, 3, 4], 1);
    dot(g, 10.5, -35, 0.9, '#ff7a1a');
    g.fillStyle = 'rgba(230,230,230,0.65)'; for (const [x, y, r] of [[11, -38, 1.8], [13, -41.5, 2.4], [11.5, -45.5, 2.8]]) { g.beginPath(); g.arc(x + f * 0.5, y, r, 0, TAU); g.fill(); }
    // gorro com dobra
    sh(g, '#e0392b', g2 => { g2.moveTo(-7.5, -37); g2.quadraticCurveTo(-3, -52, -14, -50 - f); g2.quadraticCurveTo(-7, -45, 7.5, -38); g2.closePath(); }, [-14, -52, 21, 15]);
    sh(g, '#b02a1e', g2 => { g2.ellipse(0, -38, 7.8, 2.4, -0.1, 0, TAU); }, [-8, -40, 16, 4], 1.2);
    dot(g, -14, -50 - f, 1.6, '#f3efe4');
    g.restore();
  },
  curupira(g, f) {
    // pés virados para trás, cabelo de fogo em camadas, tanga de folhas, pintura de folhas
    for (const s of [-1, 1]) {
      const fx = s * 2 + f * s * 3;
      limbs(g, s < 0 ? '#447033' : '#4f7a3a', [s * 2.5, -12, fx + 0.5, -6, fx, -1.5], 4);
      sh(g, '#4f7a3a', ell(fx - 3, -1.2, 4, 1.8), [fx - 7, -3, 8, 4], 1.2);            // pé para trás
    }
    sh(g, '#5f8f44', rrect(-6, -27, 12, 15, 5), [-6, -27, 12, 15]);
    g.fillStyle = '#c9e67a'; g.beginPath(); g.ellipse(-1, -22, 2.4, 1, -0.7, 0, TAU); g.ellipse(2.5, -24.5, 2, 0.9, 0.7, 0, TAU); g.fill();
    for (let i = 0; i < 6; i++) sh(g, i % 2 ? '#3f8a35' : '#6aa84f', g2 => g2.ellipse(-5 + i * 2, -12, 1.8, 3.4, (i - 2.5) * 0.15, 0, TAU), [-6 + i * 2, -16, 4, 7], 0.8);
    limbs(g, '#5f8f44', [5, -24, 9, -18, 12, -21], 3.4);
    head(g, 0, -32, 6, '#5f8f44', { angry: true, iris: '#7a2a10' });
    flame(g, -1, -36, 13, 9, '#d6451a', '#ff9a2a');
    flame(g, 0, -37, 10, 13 + f, '#ff7a1a', '#ffd23f');
    flame(g, -4, -37, 5, 8, '#ff9a2a', '#fff2a0');
  },
  mula(g, f) {
    // Mula sem Cabeça: corpo escuro e forte, cascos em brasa, rabo de fogo, freio de ferro
    // flutuando dentro da labareda que sai do pescoço
    const coat = '#3d2a20', dark = '#2a1c15';
    // rabo de fogo
    flame(g, -24 - f * 1.5, -8, 9, 20, '#d6451a', '#ff9a2a');
    flame(g, -23 - f * 1.5, -9, 5, 13, '#ffb347', '#fff2a0');
    // pernas de trás e da frente, com joelho, casco de ferro e brasa
    for (const [x, s2, c] of [[-13, -1, dark], [-7, 1, coat], [9, -1, dark], [14, 1, coat]]) {
      const fx = x + f * s2 * 3.5;
      limbs(g, c, [x, -14, x + f * s2 * 2 + (x < 0 ? -1.5 : 1.5), -7, fx, -2.5], 4.4);
      sh(g, '#8a8f98', poly([fx - 3, -3.2, fx + 3, -3.2, fx + 3.6, 0, fx - 3.6, 0]), [fx - 4, -3, 8, 3], 1);
      g.fillStyle = 'rgba(255,140,40,0.85)'; g.beginPath(); g.ellipse(fx, 0.4, 3.4, 1.1, 0, 0, TAU); g.fill();
    }
    // corpo: anca, barriga e peito
    sh(g, coat, g2 => { g2.moveTo(-19, -16); g2.quadraticCurveTo(-21, -28, -8, -28); g2.quadraticCurveTo(4, -29, 12, -31); g2.quadraticCurveTo(21, -27, 19, -15); g2.quadraticCurveTo(8, -8, -6, -10); g2.quadraticCurveTo(-16, -9, -19, -16); g2.closePath(); }, [-21, -31, 42, 23]);
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.arc(-10, -18, 7, -0.6, 1.2); g.stroke(); g.beginPath(); g.arc(11, -19, 6, 2.2, 4); g.stroke();
    // arreio: manta vermelha com franja e sela
    sh(g, '#a8321f', poly([-9, -28, 5, -29.5, 6, -19, -8, -18]), [-9, -30, 15, 12], 1.2);
    g.strokeStyle = '#f2c14e'; g.lineWidth = 1; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-7 + i * 2.4, -18.4 - i * 0.2); g.lineTo(-7 + i * 2.4, -15.6 - i * 0.2); g.stroke(); }
    sh(g, '#6b4a2b', g2 => g2.ellipse(-2, -29.5, 6.5, 2.6, -0.1, Math.PI, 0), [-9, -32, 14, 3], 1.2);
    dot(g, -6, -23, 1.2, '#f2c14e'); dot(g, 2, -24, 1.2, '#f2c14e');
    // pescoço erguido que termina num toco em brasa
    sh(g, coat, poly([10, -26, 16, -43, 23, -40, 19, -20]), [10, -43, 13, 23]);
    g.strokeStyle = dark; g.lineWidth = 1.4; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(12 + i * 1.6, -30 - i * 3.4); g.lineTo(9 + i * 1.6, -32 - i * 3.4); g.stroke(); } // crina
    sh(g, '#ff7a1a', g2 => g2.ellipse(19.5, -42, 4.6, 2, -0.4, 0, TAU), [15, -44, 9, 4], 1.2);
    // labareda em forma de cabeça, com olhos de brasa e o freio de ferro dentro
    g.save(); g.shadowColor = '#ff7a1a'; g.shadowBlur = 12;
    flame(g, 21, -41, 17, 24 + f * 2, '#c8321a', '#ff7a1a');
    g.restore();
    flame(g, 22, -42, 12, 19 + f * 1.5, '#ff7a1a', '#ffd23f');
    flame(g, 24, -43, 6, 11, '#ffd23f', '#fffbe0');
    glowEye(g, 20, -50, 1.5, '#fffbe0'); glowEye(g, 26, -50, 1.5, '#fffbe0');
    g.strokeStyle = '#9aa0a8'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(17, -46); g.lineTo(28, -45); g.stroke();
    g.strokeStyle = INK; g.lineWidth = 0.8; for (const x of [17, 28]) { g.beginPath(); g.arc(x, -45.5 + (x > 20 ? 0.5 : 0), 1.8, 0, TAU); g.stroke(); }
    line(g, '#6b4a2b', 1.2, [28, -44, 14, -33]); // rédea solta
    dot(g, 30, -62 - f, 1, '#ffd23f'); dot(g, 15, -60 + f, 0.8, '#ff9a2a'); dot(g, 26, -68, 0.7, '#ffd23f');
  },
  caipora(g, f) {
    // Caipora: guardiã baixinha da mata, peluda e ruiva, saiote de folhas, lança e cachimbinho
    const fur = '#a8502a', furD = '#7a3618';
    leg(g, furD, -3, -11, f, -1, 4.6, furD);
    leg(g, fur, 3, -11, f, 1, 4.6, fur);
    limbs(g, furD, [-5, -22, -9, -17, -8, -12], 3.4);
    sh(g, fur, ell(0, -19, 8.5, 9.5), [-9, -29, 18, 19]);
    furTufts(g, 0, -19, 8.5, 9.5, 12, furD);
    sh(g, '#e0b88a', ell(1.5, -18, 4, 5), [-2, -23, 8, 10], 0.9);
    for (let i = 0; i < 7; i++) sh(g, i % 2 ? '#3f8a35' : '#6aa84f', g2 => g2.ellipse(-6 + i * 2, -10, 1.8, 3.6, (i - 3) * 0.14, 0, TAU), [-7 + i * 2, -14, 4, 7], 0.8);
    // lança
    line(g, INK, 3, [12, -2, 13, -42]); line(g, '#8a5a2b', 1.6, [12, -2, 13, -42]);
    sh(g, '#d9dde2', poly([13, -50, 10.5, -42, 15.5, -42]), [10, -50, 6, 8], 1);
    line(g, '#c0392b', 1.4, [11, -41, 15, -41]);
    limbs(g, fur, [5, -22, 10, -19, 12.5, -23], 3.4);
    // cabeça grande, cabelo ruivo espetado e pintura no rosto
    sh(g, '#c98a5a', circ(0, -32, 7), [-7, -39, 14, 14]);
    sh(g, '#c0421f', g2 => { g2.moveTo(-8, -32); g2.lineTo(-10, -41); g2.lineTo(-5, -38); g2.lineTo(-4, -45); g2.lineTo(0, -39); g2.lineTo(3, -46); g2.lineTo(5, -39); g2.lineTo(9, -42); g2.lineTo(7, -33); g2.quadraticCurveTo(0, -38, -8, -32); g2.closePath(); }, [-10, -46, 19, 14], 1.4);
    dot(g, 3, -32, 1.6, '#fff'); dot(g, 3.4, -32, 0.9, INK); dot(g, -1.5, -32, 1.4, '#fff'); dot(g, -1.2, -32, 0.8, INK);
    line(g, INK, 1.1, [0.5, -34.6, 5, -33.8]); line(g, INK, 1.1, [-3.5, -34.2, -0.5, -34.8]);
    line(g, '#f3efe4', 1, [0, -29.5, 5.5, -29.8]); line(g, '#e0392b', 1, [0, -28, 5.5, -28.3]);
    line(g, INK, 0.9, [1, -27, 4.5, -27.2]);
    line(g, '#6b4a2b', 1.4, [4.5, -27.2, 9, -26.6]); dot(g, 9.3, -27.2, 1.3, '#6b4a2b'); dot(g, 9.3, -28.2, 0.7, '#ff7a1a');
  },
  iara(g, f) {
    // cauda de peixe com escamas, cabelo longo com flor, colar de conchas
    const tw = f * 2;
    sh(g, '#2a9d8f', g2 => { g2.moveTo(-6, -19); g2.quadraticCurveTo(-1, -6, 6 + tw, -4); g2.quadraticCurveTo(-4, 0, -10, -2); g2.quadraticCurveTo(-11, -12, -6, -19); g2.closePath(); }, [-11, -19, 17, 19]);
    g.strokeStyle = 'rgba(200,255,240,0.55)'; g.lineWidth = 0.8;
    for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(-7 + i * 2.6 + r * 1.3, -15 + r * 4, 1.4, 0, Math.PI); g.stroke(); }
    sh(g, '#5ad2ff', poly([6 + tw, -4, 15 + tw * 1.5, -10, 12 + tw, -3.5, 14 + tw * 1.5, 2]), [6, -10, 9, 12], 1.4);
    line(g, 'rgba(255,255,255,0.5)', 0.6, [8 + tw, -4, 13 + tw * 1.5, -8]); line(g, 'rgba(255,255,255,0.5)', 0.6, [8 + tw, -3.5, 13 + tw * 1.5, 0.5]);
    sh(g, '#16110c', g2 => { g2.moveTo(-6, -41); g2.quadraticCurveTo(-16, -27, -11, -13); g2.quadraticCurveTo(-8, -18, -5, -22); g2.lineTo(5, -39); g2.closePath(); }, [-16, -41, 21, 28], 1.4);
    sh(g, SKIN.morena, rrect(-6, -32, 11, 14, 5), [-6, -32, 11, 14]);
    for (let i = 0; i < 4; i++) sh(g, i % 2 ? '#ffd6c0' : '#f3efe4', circ(-3.5 + i * 2.3, -29 + Math.abs(i - 1.5) * 0.8, 1.2), [-5 + i * 2.3, -30, 2, 2], 0.6);
    limbs(g, SKIN.morena, [4, -29, 8, -33, 11, -36], 3);
    head(g, 0, -37, 6, SKIN.morena, { smile: true, blush: true, iris: '#2a9d8f' });
    sh(g, '#16110c', g2 => { g2.arc(0, -39, 6.5, Math.PI, -0.25); g2.lineTo(-2, -38); g2.closePath(); }, [-6, -45, 12, 7], 1);
    g.strokeStyle = '#3a2a20'; g.lineWidth = 0.6; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-6 - i * 0.5, -36 + i * 3); g.quadraticCurveTo(-10, -28 + i * 3, -9 - i * 0.4, -20 + i * 2); g.stroke(); }
    for (let k = 0; k < 5; k++) dot(g, -3 + Math.cos(k * 1.256) * 1.6, -43 + Math.sin(k * 1.256) * 1.6, 1.2, '#ff7eb6');
    dot(g, -3, -43, 0.9, '#ffd23f');
  },
  lobisomem(g, f) {
    // pelagem com tufos, focinho com presas, camisa rasgada, garras
    leg(g, '#5e5e5e', -4, -14, f, -1, 6.5, '#4a4a4a');
    leg(g, '#6b6b6b', 4, -14, f, 1, 6.5, '#5a5a5a');
    sh(g, '#5a6a8a', poly([-9, -16, 9, -16, 7, -10, 4, -13, 1, -9, -2, -12, -6, -9]), [-9, -16, 18, 7], 1.2); // calça rasgada
    limbs(g, '#666666', [-7, -30, -13, -24, -13, -18], 5);
    sh(g, '#7d7d7d', ell(0, -25, 10.5, 13), [-10, -38, 21, 26]);
    sh(g, '#a9a9a9', ell(2.5, -22, 5, 8), [-2, -30, 10, 16], 1);
    sh(g, '#8a3a2a', poly([-9, -32, -3, -35, -1, -26, -6, -22, -9.5, -26]), [-9, -35, 9, 13], 1);  // trapo de camisa
    furTufts(g, 0, -25, 10.5, 13, 14, '#4f4f4f');
    limbs(g, '#7d7d7d', [8, -31, 14, -27, 17, -21], 5.5);
    g.strokeStyle = '#f3efe4'; g.lineWidth = 1.3; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(17 + i * 1.2, -21); g.quadraticCurveTo(19 + i * 1.2, -19, 19.5 + i, -16.5); g.stroke(); }
    // cabeça de lobo
    sh(g, '#7d7d7d', g2 => { g2.moveTo(-7, -37); g2.lineTo(-6, -48); g2.lineTo(-1.5, -42); g2.lineTo(2.5, -49); g2.lineTo(5, -41); g2.lineTo(15, -38.5); g2.lineTo(15.5, -34); g2.lineTo(3, -31); g2.lineTo(-7.5, -32); g2.closePath(); }, [-8, -49, 24, 18]);
    sh(g, '#c98a8a', poly([-5, -45.5, -4.5, -41, -2.5, -42.5]), [-5, -46, 3, 5], 0.6);
    sh(g, '#a9a9a9', poly([5, -36, 15.5, -35, 15, -33, 4, -32]), [4, -36, 11, 4], 0.8);
    dot(g, 15.5, -37.5, 1.3, INK);
    glowEye(g, 5, -40, 1.9, '#ffd23f'); dot(g, 5.3, -40, 0.7, INK);
    line(g, INK, 1.2, [2.5, -42.5, 7, -41.5]);
    g.fillStyle = '#f3efe4'; for (const x of [8, 12]) { g.beginPath(); g.moveTo(x, -33.5); g.lineTo(x + 1, -30.5); g.lineTo(x + 2, -33.5); g.fill(); }
  },
  boto(g, f) {
    // terno branco, gravata rosa, flor na lapela, chapéu com fita, cabeça de boto
    leg(g, '#e4dccb', -3, -14, f, -1, 6.5, '#f3efe4');
    leg(g, '#f3efe4', 3, -14, f, 1, 6.5, '#f3efe4');
    limbs(g, '#e4dccb', [-7, -30, -11, -24, -10, -18], 4.4);
    sh(g, '#f3efe4', rrect(-8, -33, 16, 21, 4), [-8, -33, 16, 21]);
    g.fillStyle = '#d6cfbf'; g.beginPath(); g.moveTo(-3, -33); g.lineTo(0, -24); g.lineTo(-5, -28); g.fill(); g.beginPath(); g.moveTo(4, -33); g.lineTo(1, -24); g.lineTo(6, -28); g.fill();
    line(g, INK, 0.7, [-3, -33, 0, -24, 4, -33]);
    sh(g, '#ff7eb6', poly([-0.5, -32, 1.5, -32, 2, -24, 0.5, -22.5, -1, -24]), [-1, -32, 3, 10], 0.8);
    for (let k = 0; k < 5; k++) dot(g, 5 + Math.cos(k * 1.256) * 1.3, -29 + Math.sin(k * 1.256) * 1.3, 0.9, '#d84a3a');
    dot(g, 5, -29, 0.6, '#ffd23f');
    dot(g, 0.5, -18, 0.6, '#c9c0ad'); dot(g, 0.5, -15, 0.6, '#c9c0ad');
    limbs(g, '#f3efe4', [7, -30, 12, -25, 13, -20], 4.6);
    dot(g, 13.5, -19.5, 2, '#f4a6c4');
    sh(g, '#f4a6c4', ell(2, -39, 7, 6), [-5, -45, 14, 12]);
    sh(g, '#f4a6c4', ell(11.5, -37, 6.5, 2.6), [5, -40, 13, 5], 1.6);
    line(g, INK, 0.8, [8, -36, 16.5, -36.5]);
    dot(g, 5.5, -40, 1.4, '#fff'); dot(g, 5.8, -40, 0.8, INK); dot(g, 6, -40.4, 0.35, '#fff');
    g.fillStyle = 'rgba(230,90,120,0.35)'; g.beginPath(); g.arc(6, -37, 1.5, 0, TAU); g.fill();
    sh(g, '#f3efe4', rrect(-10, -47, 20, 3, 1.4), [-10, -47, 20, 3]);
    sh(g, '#f3efe4', rrect(-5.5, -55, 11, 9, 2), [-5, -55, 11, 9]);
    g.fillStyle = '#1b130d'; g.fillRect(-5.5, -48.5, 11, 2.2);
  },
  mapinguari(g, f) {
    // gigante peludo, um olho na testa, boca na barriga com língua, garras enormes
    for (const s of [-1, 1]) {
      const fx = s * 10 + f * s * 3;
      limbs(g, s < 0 ? '#4a2516' : '#5a2f1c', [s * 8, -14, fx, -6, fx, -2], 9);
      g.strokeStyle = '#e8dcc0'; g.lineWidth = 1.3; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(fx - 3 + i * 3, -1); g.lineTo(fx - 4 + i * 3, 1); g.stroke(); }
    }
    limbs(g, '#653420', [-15, -38, -23, -30, -22, -20], 7);
    sh(g, '#7a3f22', ell(0, -31, 18, 22), [-18, -53, 36, 44]);
    furTufts(g, 0, -31, 18, 22, 22, '#4a2512');
    g.strokeStyle = '#5a2c16'; g.lineWidth = 1; for (let i = 0; i < 10; i++) { const x = -12 + (i * 7.3) % 24, y = -46 + (i * 11) % 30; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1.5, y + 3); g.stroke(); }
    // boca na barriga
    sh(g, '#2a0d06', ell(2, -24, 10, 7), [-8, -31, 20, 14], 2);
    sh(g, '#c0392b', ell(3, -21.5, 5, 2.5), [-2, -24, 10, 5], 0);
    g.fillStyle = '#f3efe4';
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(2 + i * 2.6, -30.5); g.lineTo(3.2 + i * 2.6, -26); g.lineTo(4.4 + i * 2.6, -30.5); g.fill(); }
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(2.5 + i * 3, -17.5); g.lineTo(3.7 + i * 3, -21); g.lineTo(4.9 + i * 3, -17.5); g.fill(); }
    limbs(g, '#7a3f22', [15, -38, 24, -30, 25, -21], 7.5);
    g.strokeStyle = '#e8dcc0'; g.lineWidth = 1.6; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(24 + i * 1.8, -20); g.quadraticCurveTo(27 + i * 1.6, -17, 26 + i * 1.6, -13); g.stroke(); }
    // olho único
    sh(g, '#f3efe4', ell(3, -45, 5.5, 4.2), [-2, -49, 11, 8], 1.4);
    glowEye(g, 3.8, -45, 3, '#ffb347'); dot(g, 4.2, -45, 1.3, INK); dot(g, 4.8, -45.8, 0.6, '#fff');
    line(g, INK, 1.8, [-3, -50.5, 9, -49]);
  },
  pisadeira(g, f) {
    // magra e curvada, vestido cinza em farrapos, cabelo enorme, unhas compridas
    const sway = f;
    sh(g, '#4a4a5a', poly([-7 + sway, -1, -4 + sway, -3, -2 + sway, 0, 1 + sway, -3, 4 + sway, -0.5, 7 + sway, -2, 4, -29, -4, -29]), [-7, -29, 14, 29]);
    line(g, tone('#4a4a5a', -0.4), 0.8, [-1, -27, -2 + sway, -3]); line(g, tone('#4a4a5a', -0.4), 0.8, [2, -27, 3 + sway, -3]);
    limbs(g, '#b8ac98', [-3, -26, -7, -18, -6, -12], 2.3);
    limbs(g, '#cfc3b0', [3, -26, 9, -22, 13, -19], 2.5);
    g.strokeStyle = '#e0e0e0'; g.lineWidth = 1.1; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(13, -19); g.quadraticCurveTo(17 + i, -19 + i, 19 + i * 0.6, -14 + i * 1.8); g.stroke(); }
    sh(g, '#1b130d', g2 => { g2.moveTo(-6, -41); g2.quadraticCurveTo(-14, -20, -7, -6); g2.quadraticCurveTo(-5, -14, -2, -26); g2.lineTo(6, -38); g2.closePath(); }, [-14, -41, 20, 35], 1.4);
    g.strokeStyle = '#3a3040'; g.lineWidth = 0.7; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-5 + i, -38); g.quadraticCurveTo(-11 + i, -24, -7 + i * 0.8, -9); g.stroke(); }
    sh(g, '#cfc3b0', ell(1.5, -35, 5, 6.2), [-3, -41, 10, 12]);
    g.fillStyle = 'rgba(60,40,60,0.45)'; g.beginPath(); g.ellipse(3.8, -35.5, 2.4, 2, 0, 0, TAU); g.fill();
    glowEye(g, 3.8, -36, 1.6, '#ff3b3b');
    line(g, INK, 1, [-0.5, -31, 2, -31.5, 4.5, -30.8]);
    g.fillStyle = '#f3efe4'; g.fillRect(2.2, -31.3, 0.8, 1.2); g.fillRect(3.6, -31.1, 0.8, 1.1);
  },
  cuca(g, f) {
    // bruxa jacaré: focinho com dentes, escamas, cabelo loiro desgrenhado, vestido roxo com luas, colher de pau
    const sway = f;
    sh(g, '#5a2a7a', poly([-12 + sway, -1, 12 + sway, -1, 8, -27, -8, -27]), [-12, -27, 24, 26]);
    for (const [x, y] of [[-6, -8], [4, -15], [6, -5], [-2, -21]]) { g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(x + sway * 0.5, y, 1.7, 0.6, Math.PI * 1.7); g.arc(x + sway * 0.5 + 0.8, y - 0.4, 1.3, Math.PI * 1.7, 0.6, true); g.fill(); }
    g.fillStyle = '#3a1a52'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-12 + i * 4 + sway, -1); g.lineTo(-10 + i * 4 + sway, 1.5); g.lineTo(-8 + i * 4 + sway, -1); g.fill(); }
    sh(g, '#3d6a2a', poly([-9, -27, 9, -27, 6, -20, -9, -22]), [-9, -27, 18, 7], 1.2);     // xale verde
    limbs(g, '#7a9a3a', [7, -24, 12, -19, 15, -22], 4);
    line(g, '#8a5a2b', 2, [15, -21, 21, -33]); sh(g, '#8a5a2b', ell(21.5, -34.5, 2.4, 3.4, 0.4), [19, -38, 5, 7], 1);   // colher de pau
    sh(g, '#7a9a3a', ell(1, -34, 8.5, 7.5), [-8, -42, 17, 15]);
    sh(g, '#7a9a3a', g2 => { g2.moveTo(4, -38); g2.lineTo(20, -35.5); g2.lineTo(20.5, -31.5); g2.lineTo(4, -28.5); g2.closePath(); }, [4, -38, 17, 10]);
    line(g, INK, 0.9, [6, -32.5, 20.5, -33.2]);
    g.fillStyle = '#f3efe4'; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(7 + i * 2.8, -33); g.lineTo(8 + i * 2.8, -30.6); g.lineTo(9 + i * 2.8, -33); g.fill(); }
    dot(g, 19, -36, 0.7, INK);
    g.strokeStyle = '#5a7a2a'; g.lineWidth = 0.8; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(-3 + (i % 3) * 3.5, -37 + Math.floor(i / 3) * 4, 1.4, Math.PI, 0); g.stroke(); }
    sh(g, '#f2d14e', g2 => { g2.moveTo(-8, -39); g2.quadraticCurveTo(-18, -28, -12, -15); g2.quadraticCurveTo(-9, -22, -6, -28); g2.lineTo(3, -41); g2.quadraticCurveTo(-2, -45, -8, -39); g2.closePath(); }, [-18, -45, 21, 30], 1.4);
    g.strokeStyle = '#c9a030'; g.lineWidth = 0.7; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-6 + i, -40); g.quadraticCurveTo(-13 + i, -30, -11 + i * 0.6, -18); g.stroke(); }
    glowEye(g, 3.5, -37, 2.2, '#ffd23f'); dot(g, 3.9, -37, 0.8, INK);
    line(g, INK, 1.2, [0.5, -40.5, 6, -39.5]);
  },
  boitata(g, f) {
    // só a cabeça (o corpo é desenhado à parte, seguindo o rastro)
    g.save(); g.shadowColor = '#4ab4ff'; g.shadowBlur = 16;
    sh(g, '#1f6fb2', ell(0, -14, 15, 11), [-15, -25, 30, 22]);
    g.restore();
    g.strokeStyle = 'rgba(160,220,255,0.5)'; g.lineWidth = 0.8;
    for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(-9 + (i % 4) * 4.5, -17 + Math.floor(i / 4) * 5, 2, Math.PI, 0); g.stroke(); }
    sh(g, '#2f8fd8', ell(9, -12.5, 10, 7), [-1, -20, 20, 14]);
    dot(g, 17, -14, 0.9, INK);
    g.fillStyle = '#f3efe4'; for (const x of [10, 14]) { g.beginPath(); g.moveTo(x, -7.5); g.lineTo(x + 1, -4.5); g.lineTo(x + 2, -7.5); g.fill(); }
    flame(g, -6, -22, 12, 14 + f * 1.5, '#2a7ad8', '#9ad8ff');
    flame(g, -3, -22, 9, 11, '#4ab4ff', '#d9f2ff');
    glowEye(g, 3, -18, 4, '#ffd23f'); dot(g, 3.6, -18, 1.6, '#7a2a00');
    glowEye(g, 10.5, -17, 3.2, '#ffd23f'); dot(g, 11, -17, 1.2, '#7a2a00');
    g.fillStyle = '#ff7a1a'; g.beginPath(); g.moveTo(18, -10); g.lineTo(25, -9 - f); g.lineTo(23, -8); g.lineTo(26, -6.5 + f); g.lineTo(18, -8); g.fill();
  },
};

function flame(g, x, y, w, h, c1, c2) {
  shape(g, c1, g2 => { g2.moveTo(x - w / 2, y); g2.quadraticCurveTo(x - w / 2, y - h * 0.6, x - w * 0.2, y - h); g2.quadraticCurveTo(x, y - h * 0.5, x + w * 0.15, y - h * 0.8); g2.quadraticCurveTo(x + w / 2, y - h * 0.5, x + w / 2, y); g2.closePath(); }, 1.5);
  g.fillStyle = c2; g.beginPath(); g.ellipse(x, y - h * 0.3, w * 0.22, h * 0.3, 0, 0, TAU); g.fill();
}
function drawStar(g, x, y, r, color) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath(); g.fillStyle = color; g.fill(); g.strokeStyle = INK; g.lineWidth = 1; g.stroke();
}

// ---------------- CENÁRIO ----------------
const DECOR_DRAW = {
  arvore(g) {
    shape(g, '#5a3a22', rrect(-4, -26, 8, 26, 2));
    shape(g, '#2f6b35', circ(-10, -34, 12)); shape(g, '#2f6b35', circ(10, -34, 12)); shape(g, '#3a8a40', circ(0, -44, 15));
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.arc(-4, -48, 6, 0, TAU); g.fill();
  },
  samambaia(g) {
    g.strokeStyle = '#3a8a40'; g.lineWidth = 2;
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(i * 4, -14, i * 7, -18 + Math.abs(i) * 2); g.stroke(); }
  },
  pedra(g) { shape(g, '#6b6b62', poly([-12, 0, -9, -9, 0, -13, 10, -8, 12, 0])); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(-5, -10, 6, 3); },
  mandacaru(g) {
    shape(g, '#3f7a4a', rrect(-5, -42, 10, 42, 5));
    shape(g, '#3f7a4a', rrect(-17, -30, 8, 18, 4)); shape(g, '#3f7a4a', rrect(-13, -16, 9, 6, 3), 0);
    shape(g, '#3f7a4a', rrect(9, -36, 8, 20, 4)); shape(g, '#3f7a4a', rrect(4, -20, 9, 6, 3), 0);
    g.fillStyle = '#ff7eb6'; g.beginPath(); g.arc(0, -43, 3, 0, TAU); g.fill();
  },
  galhoseco(g) { g.strokeStyle = '#4a3020'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(2, -18); g.lineTo(-6, -28); g.moveTo(2, -18); g.lineTo(10, -26); g.stroke(); },
  casinha(g) {
    shape(g, '#c9a27a', rrect(-16, -22, 32, 22, 1));
    shape(g, '#8a3a2a', poly([-20, -22, 0, -38, 20, -22]));
    shape(g, '#ffd86a', rrect(-11, -16, 7, 7, 1), 1.5);
    shape(g, '#5a3a22', rrect(4, -14, 7, 14, 1), 1.5);
  },
  cerca(g) { g.strokeStyle = '#6b4a2b'; g.lineWidth = 3; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 8, 0); g.lineTo(i * 8, -14); g.stroke(); } g.beginPath(); g.moveTo(-18, -9); g.lineTo(18, -9); g.stroke(); },
  arvoreseca(g) {
    g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -30); g.stroke();
    g.strokeStyle = '#3a2a22'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -30); g.lineTo(-12, -44); g.moveTo(0, -24); g.lineTo(14, -40); g.moveTo(-6, -36); g.lineTo(-14, -36); g.stroke();
  },
  agua(g) { shape(g, '#2a6a8a', ell(0, -4, 26, 9), 1.5); g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-10, -5); g.lineTo(-2, -5); g.moveTo(4, -2); g.lineTo(12, -2); g.stroke(); },
  buriti(g) {
    shape(g, '#6b4a2b', rrect(-3, -40, 6, 40, 2));
    g.strokeStyle = '#3a8a40'; g.lineWidth = 3;
    for (let i = 0; i < 7; i++) { const a = Math.PI + i * Math.PI / 6; g.beginPath(); g.moveTo(0, -40); g.quadraticCurveTo(Math.cos(a) * 12, -46 + Math.sin(a) * 6, Math.cos(a) * 22, -36 - Math.sin(a) * -10); g.stroke(); }
  },
  capim(g) { g.strokeStyle = '#7a9a3a'; g.lineWidth = 1.5; for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(i * 2, 0); g.lineTo(i * 3.2, -12 - (i % 2) * 4); g.stroke(); } },
  cipo(g) { g.strokeStyle = '#2f6b35'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-10, 0); g.bezierCurveTo(-14, -16, 10, -14, 4, -30); g.stroke(); g.fillStyle = '#4caf50'; g.beginPath(); g.ellipse(-6, -12, 3, 1.5, 0.5, 0, TAU); g.ellipse(5, -22, 3, 1.5, -0.5, 0, TAU); g.fill(); },
  brasa(g) { g.save(); g.shadowColor = '#ff7a1a'; g.shadowBlur = 10; g.fillStyle = '#ff7a1a'; g.beginPath(); g.ellipse(0, -2, 8, 3, 0, 0, TAU); g.fill(); g.fillStyle = '#ffd23f'; g.beginPath(); g.ellipse(2, -2, 3, 1.5, 0, 0, TAU); g.fill(); g.restore(); },
};

// Mata Atlântica / Amazônia: árvores grandes com raízes, palmito-juçara, ipê-amarelo, embaúba, bromélia...
Object.assign(DECOR_DRAW, {
  barraca(g) { // barraca de feira com toldo listrado
    for (const x of [-26, 26]) line(g, '#6b4a2b', 4, [x, 0, x, -34]);
    sh(g, '#c5361d', g2 => { g2.moveTo(-34, -34); g2.lineTo(34, -34); g2.lineTo(30, -24); g2.lineTo(-30, -24); g2.closePath(); }, [-34, -34, 68, 10]);
    for (let i = -3; i < 3; i++) { sh(g, i % 2 ? '#f2e4c4' : '#c5361d', g2 => { g2.moveTo(-30 + i * 10, -24); g2.lineTo(-20 + i * 10, -24); g2.lineTo(-25 + i * 10, -16); g2.closePath(); }, [-30 + i * 10, -24, 10, 8], 1); }
    sh(g, '#8a5a2b', rrect(-24, -24, 48, 10, 1), [-24, -24, 48, 10]); // balcão
    sh(g, '#f0b429', ell(-12, -24, 4, 3), [-16, -27, 8, 6], 1); sh(g, '#3aa39b', rrect(4, -30, 7, 6, 1), [4, -30, 7, 6], 1); // mercadoria
    g.fillStyle = INK; g.font = 'bold 7px Georgia'; g.textAlign = 'center'; g.fillText('FEIRA', 0, -36);
  },
  pote(g) { // pote de barro
    sh(g, '#c9703a', g2 => { g2.moveTo(-9, -2); g2.quadraticCurveTo(-13, -14, -6, -20); g2.lineTo(6, -20); g2.quadraticCurveTo(13, -14, 9, -2); g2.closePath(); }, [-13, -20, 26, 18]);
    sh(g, '#a85a2a', ell(0, -20, 7, 2.4), [-7, -23, 14, 5], 1.5);
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-10, -9); g.quadraticCurveTo(0, -7, 10, -9); g.stroke();
  },
  oratorio(g) { // oratório/capela com santo e velas
    sh(g, '#d9b98a', g2 => { g2.moveTo(-16, 0); g2.lineTo(-16, -30); g2.lineTo(0, -42); g2.lineTo(16, -30); g2.lineTo(16, 0); g2.closePath(); }, [-16, -42, 32, 42]);
    sh(g, '#6b4a2b', rrect(-11, -28, 22, 26, 1), [-11, -28, 22, 26]);
    sh(g, '#f2e4c4', g2 => { g2.moveTo(-8, -4); g2.lineTo(-8, -20); g2.quadraticCurveTo(0, -26, 8, -20); g2.lineTo(8, -4); g2.closePath(); }, [-8, -26, 16, 22], 1.5);
    sh(g, '#7cffe0', circ(0, -17, 4), [-4, -21, 8, 8], 1);
    line(g, '#f0b429', 3, [-6, -4, -6, -10]); line(g, '#f0b429', 3, [6, -4, 6, -10]);
    g.fillStyle = '#ff7a1a'; g.beginPath(); g.arc(-6, -11, 1.5, 0, TAU); g.arc(6, -11, 1.5, 0, TAU); g.fill();
    line(g, '#8a2a1a', 2.5, [0, -42, 0, -48]); line(g, '#8a2a1a', 2.5, [-3, -45, 3, -45]); // cruz no topo
  },
  baumapa(g) { // baú trancado (grande, no mapa)
    sh(g, '#7a4a22', rrect(-16, -18, 32, 18, 1), [-16, -18, 32, 18]);
    sh(g, '#8a5a2b', g2 => { g2.moveTo(-16, -18); g2.quadraticCurveTo(0, -34, 16, -18); g2.closePath(); }, [-16, -34, 32, 16]);
    for (const x of [-9, 9]) line(g, '#d9b26a', 2.5, [x, -30, x, 0]);
    line(g, '#5a3a1c', 3, [-16, -9, 16, -9]);
    sh(g, '#f2c14e', rrect(-4, -14, 8, 9, 1), [-4, -14, 8, 9], 1.5);
    g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.arc(0, -13, 2, 0, TAU); g.stroke();
  },
  arvore(g) {
    // tronco com sapopemas (raízes em tábua), cipó e copa em camadas
    sh(g, '#5a3a22', poly([-16, 0, -6, -10, -5, -46, 5, -46, 6, -10, 16, 0, 6, -3, 0, 0, -6, -3]), [-16, -46, 32, 46]);
    line(g, '#3a2414', 1, [-2, -40, -3, -12]); line(g, '#3a2414', 1, [2, -36, 3, -16]);
    dot(g, -1, -22, 2.2, '#3a2414');
    g.strokeStyle = '#2f6b35'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(5, -44); g.bezierCurveTo(12, -34, 2, -24, 8, -10); g.stroke();
    for (const [x, y, r, c] of [[-20, -52, 17, '#234f2a'], [20, -54, 18, '#234f2a'], [0, -48, 20, '#2f6b35'], [-12, -68, 17, '#2f6b35'], [13, -70, 17, '#357a3c'], [0, -82, 18, '#3f8f45']]) sh(g, c, circ(x, y, r), [x - r, y - r, r * 2, r * 2], 1.6);
    g.fillStyle = 'rgba(255,255,220,0.13)'; for (const [x, y] of [[-6, -88], [10, -76], [-16, -72], [4, -56]]) { g.beginPath(); g.ellipse(x, y, 7, 4, -0.4, 0, TAU); g.fill(); }
    for (const [x, y] of [[-22, -44], [18, -46], [-4, -40]]) dot(g, x, y, 2, '#c0392b'); // frutinhas
  },
  ipe(g) {
    // ipê-amarelo florido
    sh(g, '#6b4a33', poly([-5, 0, -3, -44, -12, -58, -9, -60, 0, -48, 9, -62, 12, -60, 3, -44, 5, 0]), [-12, -62, 24, 62]);
    for (const [x, y, r, c] of [[-16, -64, 15, '#e6b800'], [16, -66, 15, '#e6b800'], [0, -62, 16, '#f2c81e'], [-8, -80, 14, '#f7d94a'], [10, -82, 14, '#f2c81e'], [0, -92, 12, '#ffe36b']]) sh(g, c, circ(x, y, r), [x - r, y - r, r * 2, r * 2], 1.4);
    for (let i = 0; i < 16; i++) dot(g, -24 + (i * 37) % 48, -98 + (i * 23) % 44, 1.6, i % 3 ? '#fff3a0' : '#c99400');
    for (const [x, y] of [[-14, -3], [9, -2], [18, -6], [-22, -7], [2, -5]]) dot(g, x, y, 1.8, '#f2c81e'); // flores caídas
  },
  jucara(g) {
    // palmito-juçara: tronco fino e anelado, folhas em pluma, cacho de frutos roxos
    for (let i = 0; i < 9; i++) sh(g, i % 2 ? '#8a8a6a' : '#9a9a7a', rrect(-3, -8 - i * 8, 6, 8, 1), [-3, -80, 6, 80], 0.8);
    sh(g, '#4f8a3a', rrect(-3.5, -90, 7, 12, 3), [-4, -90, 8, 12], 1.2);
    for (let i = 0; i < 8; i++) {
      const a = Math.PI + 0.25 + i * 0.37, ex = Math.cos(a) * 44, ey = -92 + Math.sin(a) * 26 + 16;
      g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -90); g.quadraticCurveTo(ex * 0.5, -108 + Math.abs(ex) * 0.1, ex, ey); g.stroke();
      g.strokeStyle = i % 2 ? '#3f8f45' : '#2f6b35'; g.lineWidth = 2.6; g.stroke();
      g.lineWidth = 1; for (let k = 1; k < 6; k++) { const t = k / 6, px = ex * t, py = -90 + (ey + 90) * t - Math.sin(t * Math.PI) * 16; g.beginPath(); g.moveTo(px, py); g.lineTo(px + (ex > 0 ? -2 : 2), py + 9); g.stroke(); }
    }
    for (let i = 0; i < 7; i++) dot(g, -4 + (i % 3) * 4, -76 + Math.floor(i / 3) * 4, 1.9, '#4a2a6a');
  },
  embauba(g) {
    // embaúba: tronco claro e folhas grandes em forma de mão
    sh(g, '#c9c2ae', poly([-4, 0, -3, -62, 3, -62, 4, 0]), [-4, -62, 8, 62]);
    for (let i = 1; i < 7; i++) line(g, '#8a8474', 1, [-3.5, -i * 9, 3.5, -i * 9]);
    for (const [bx, by] of [[-18, -66], [16, -70], [0, -84], [-10, -52], [12, -54]]) {
      line(g, '#8a8474', 2, [0, -60, bx, by]);
      for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; sh(g, k % 2 ? '#5aa04a' : '#6ab85a', g2 => g2.ellipse(bx + Math.cos(a) * 8, by + Math.sin(a) * 8, 8, 3.2, a, 0, TAU), [bx - 16, by - 16, 32, 32], 1); }
      dot(g, bx, by, 2, '#e8e0c0');
    }
  },
  bromelia(g) {
    for (let i = 0; i < 9; i++) { const a = Math.PI + (i + 0.5) / 9 * Math.PI; sh(g, i % 2 ? '#3f8f45' : '#2f6b35', poly([-2, 0, 2, 0, Math.cos(a) * 16, Math.sin(a) * 15 - 2]), [-16, -17, 32, 17], 1); }
    sh(g, '#e0392b', poly([-3, -4, 3, -4, 0, -20]), [-3, -20, 6, 16], 1.2);
    dot(g, 0, -20, 2.2, '#ffd23f');
  },
  tronco(g) {
    // tronco caído com musgo e cogumelos
    sh(g, '#5a3a22', rrect(-26, -14, 52, 14, 6), [-26, -14, 52, 14]);
    sh(g, '#8a6a4a', ell(26, -7, 4, 7), [22, -14, 8, 14], 1.4); g.strokeStyle = '#5a3a22'; g.lineWidth = 0.8; g.beginPath(); g.arc(26, -7, 2, 0, TAU); g.stroke();
    g.fillStyle = '#4f8a3a'; for (const [x, w] of [[-20, 12], [-2, 9], [10, 7]]) { g.beginPath(); g.ellipse(x, -13, w / 2, 2.6, 0, Math.PI, 0); g.fill(); }
    for (const [x, c] of [[-10, '#e0392b'], [-5, '#f3efe4'], [16, '#e0392b']]) { line(g, '#e8e0c0', 1.6, [x, -14, x, -18]); sh(g, c, g2 => g2.ellipse(x, -18, 3.4, 2.4, 0, Math.PI, 0), [x - 3, -21, 7, 3], 0.9); }
  },
  flores(g) {
    for (const [x, c] of [[-14, '#ff7eb6'], [-5, '#ffd23f'], [4, '#c77dff'], [13, '#ff9a2a'], [-9, '#f3efe4'], [9, '#ff7eb6']]) {
      const h = 7 + ((x * 7) % 6 + 6) % 6;
      line(g, '#3a8a40', 1.3, [x, 0, x + 1, -h]);
      for (let k = 0; k < 5; k++) dot(g, x + 1 + Math.cos(k * 1.256) * 2, -h + Math.sin(k * 1.256) * 2, 1.5, c);
      dot(g, x + 1, -h, 1, '#fff3a0');
    }
  },
  vitoria(g) {
    // vitória-régia numa poça
    sh(g, '#2a6a8a', ell(0, -6, 30, 10), [-30, -16, 60, 20], 1.4);
    for (const [x, y, r] of [[-12, -7, 9], [8, -4, 7], [10, -11, 5]]) { sh(g, '#3f8f45', g2 => g2.ellipse(x, y, r, r * 0.42, 0, 0.3, TAU), [x - r, y - r, r * 2, r], 1); }
    for (let k = 0; k < 6; k++) dot(g, -12 + Math.cos(k) * 2.4, -9 + Math.sin(k) * 1.2, 1.6, '#f9d6e6');
  },
});

// ---------------- ITENS NO CHÃO ----------------
const PICKUP_DRAW = {
  coin(g) { shape(g, '#f2c14e', circ(0, -6, 6), 1.5); g.fillStyle = '#9a6a10'; g.font = 'bold 7px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('R$', 0, -5.5); },
  heal(g) { // coxinha!
    shape(g, '#d9822b', g2 => { g2.moveTo(0, -16); g2.quadraticCurveTo(9, -4, 6, -1); g2.quadraticCurveTo(0, 1, -6, -1); g2.quadraticCurveTo(-9, -4, 0, -16); g2.closePath(); }, 1.5);
    g.fillStyle = 'rgba(255,230,160,0.6)'; g.beginPath(); g.arc(-2, -7, 2, 0, TAU); g.fill();
  },
  bau(g) { // baú de madeira com tampa arqueada e cadeado dourado
    sh(g, '#8a5a2b', rrect(-12, -14, 24, 14, 1), [-12, -14, 24, 14]);
    sh(g, '#9a6a35', g2 => { g2.moveTo(-12, -14); g2.quadraticCurveTo(0, -26, 12, -14); g2.closePath(); }, [-12, -26, 24, 12]);
    line(g, '#5a3a1c', 2.5, [-12, -7, 12, -7]);
    for (const x of [-7, 7]) { line(g, '#d9b26a', 2, [x, -22, x, 0]); }
    sh(g, '#f2c14e', rrect(-3, -11, 6, 7, 1), [-3, -11, 6, 7], 1.2);
    g.strokeStyle = INK; g.lineWidth = 1; g.beginPath(); g.arc(0, -10, 1.3, 0, TAU); g.stroke();
  },
  balaio(g) { // cesto de palha trançada
    sh(g, '#d9a34a', g2 => { g2.moveTo(-11, -16); g2.lineTo(11, -16); g2.lineTo(8, -1); g2.lineTo(-8, -1); g2.closePath(); }, [-11, -16, 22, 16]);
    g.strokeStyle = '#8a5a2b'; g.lineWidth = 1; for (let i = 1; i < 4; i++) line(g, '#8a5a2b', 1, [-11 + i, -16 + i * 4, 11 - i, -16 + i * 4]);
    for (let i = -2; i <= 2; i++) line(g, '#8a5a2b', 1, [i * 4, -16, i * 3, -1]);
    sh(g, '#c5361d', ell(-3, -17, 3, 2), [-6, -19, 6, 4], 1); sh(g, '#f0b429', ell(4, -18, 3, 2), [1, -20, 6, 4], 1); // frutinhas no topo
  },
  berrante(g) { // chifre de boiadeiro
    sh(g, '#e8dcc0', g2 => { g2.moveTo(-14, -2); g2.quadraticCurveTo(6, -6, 12, -18); g2.quadraticCurveTo(8, -4, -12, 2); g2.closePath(); }, [-14, -18, 26, 20]);
    line(g, '#8a5a2b', 2, [-14, 0, -16, 2]);
    g.strokeStyle = INK; g.lineWidth = 0.8; for (let i = 0; i < 3; i++) { const t = i / 3; g.beginPath(); g.moveTo(-10 + t * 18, -1 - t * 8); g.lineTo(-9 + t * 18, 1 - t * 8); g.stroke(); }
  },
  sino(g) { // sino de igreja
    sh(g, '#d9b24a', g2 => { g2.moveTo(-10, -2); g2.quadraticCurveTo(-9, -18, 0, -20); g2.quadraticCurveTo(9, -18, 10, -2); g2.closePath(); }, [-10, -20, 20, 18]);
    sh(g, '#d9b24a', ell(0, -2, 11, 3), [-11, -5, 22, 6], 1.5);
    g.fillStyle = INK; g.beginPath(); g.arc(0, -1, 2, 0, TAU); g.fill();
    line(g, '#8a5a2b', 2, [0, -20, 0, -24]); g.strokeStyle = INK; g.lineWidth = 1.5; g.beginPath(); g.arc(0, -24, 2.5, Math.PI, 0); g.stroke();
  },
};

// ---------------- REGISTRO ----------------
const SPRITES = {};
function buildSprites() {
  const size = { capoeirista: [44, 60], jiujitsu: [44, 60], benzedeira: [48, 60], cangaceiro: [48, 62],
    corposeco: [36, 48], caipora: [40, 56], saci: [36, 56], curupira: [34, 52], mula: [70, 76], iara: [38, 52], lobisomem: [44, 56],
    boto: [40, 62], mapinguari: [60, 72], pisadeira: [42, 50], cuca: [48, 50], boitata: [52, 40] };
  // 3 quadros por personagem/criatura: parado (k), passo A (k+'+') e passo B (k+'-')
  let sd = 3;
  for (const k in SPRITE_DRAW) {
    const [w0, h0] = size[k] || [48, 56], w = w0 + 8, h = h0 + 8; // margem p/ contorno, fogo e chapéus
    sd += 7;
    SPRITES[k] = makeSprite(w, h, g => SPRITE_DRAW[k](g, 0), sd);
    SPRITES[k + '+'] = makeSprite(w, h, g => SPRITE_DRAW[k](g, 1), sd + 1);
    SPRITES[k + '-'] = makeSprite(w, h, g => SPRITE_DRAW[k](g, -1), sd + 2);
  }
  for (const k in DECOR_DRAW) SPRITES['d_' + k] = makeSprite(110, 124, DECOR_DRAW[k], (sd += 5), 2.8);
  for (const k in PICKUP_DRAW) SPRITES['p_' + k] = makeSprite(24, 24, PICKUP_DRAW[k], (sd += 5), 1.4);
}

// quadro da caminhada: ciclo passo A → parado → passo B → parado
function walkKey(key, phase, moving) {
  if (!moving) return key;
  const i = ((Math.floor(phase / (Math.PI / 2)) % 4) + 4) % 4;
  return i === 0 ? key + '+' : i === 2 ? key + '-' : key;
}

// desenha um sprite com os pés em (x, y)
function drawSprite(ctx, key, x, y, opts = {}) {
  const s = SPRITES[key];
  if (!s) return;
  const sc = opts.scale || 1;
  const w = s.w * sc, h = s.h * sc;
  ctx.save();
  ctx.translate(x, y);
  if (opts.rot) ctx.rotate(opts.rot);
  if (opts.flip) ctx.scale(-1, 1);
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  const sy = opts.squash || 1;
  ctx.drawImage(opts.white ? s.white : s.c, -w / 2, -(h - 4 * sc) * sy, w, h * sy);
  ctx.restore();
}
