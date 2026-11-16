'use strict';
// ===== Gravura: a identidade visual do jogo =====
// Tudo aqui imita a XILOGRAVURA COLORIDA DE CORDEL: tinta preta de contorno grosso, cores chapadas
// (sem degradê nem brilho), hachuras entalhadas, papel colorido de folheto e as imperfeições da
// impressão manual (linha tremida, falha de tinta, cor fora de registro).

const COR = {
  tinta: '#1a130e', papel: '#f2e4c4', papel2: '#e2cfa3', pardo: '#b89a6a',
  urucum: '#c5361d', ipe: '#f0b429', anil: '#22577a', mata: '#2f6d43', chita: '#e2557f', barro: '#d9772b', agua: '#3aa39b',
};

function gCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
function gRand(seed) { let s = (Math.abs(seed | 0) * 9301 + 49297) % 233280 + 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
function gLum(hex) { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; }

// ---- entalhar: dá à imagem a cara de matriz de madeira impressa ----
// amp = quanto a linha "treme" (em px da imagem); falha = fração da tinta preta que falha na impressão
function entalhar(src, amp = 1.5, seed = 7, falha = 0.07) {
  const w = src.width, h = src.height;
  const s = src.getContext('2d').getImageData(0, 0, w, h).data;
  const out = gCanvas(w, h), og = out.getContext('2d'), od = og.createImageData(w, h), o = od.data;
  const cell = 13, gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
  const rnd = gRand(seed), nx = new Float32Array(gw * gh), ny = new Float32Array(gw * gh);
  for (let i = 0; i < nx.length; i++) { nx[i] = rnd() * 2 - 1; ny[i] = rnd() * 2 - 1; }
  const lim = Math.round(falha * 1000);
  for (let y = 0; y < h; y++) {
    const gy = y / cell, y0 = gy | 0, fy = gy - y0;
    for (let x = 0; x < w; x++) {
      const gx = x / cell, x0 = gx | 0, fx = gx - x0, i00 = y0 * gw + x0;
      const dx = ((nx[i00] * (1 - fx) + nx[i00 + 1] * fx) * (1 - fy) + (nx[i00 + gw] * (1 - fx) + nx[i00 + gw + 1] * fx) * fy) * amp;
      const dy = ((ny[i00] * (1 - fx) + ny[i00 + 1] * fx) * (1 - fy) + (ny[i00 + gw] * (1 - fx) + ny[i00 + gw + 1] * fx) * fy) * amp;
      const sx = Math.round(x + dx), sy = Math.round(y + dy);
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      const si = (sy * w + sx) * 4, di = (y * w + x) * 4;
      let r = s[si], g = s[si + 1], b = s[si + 2];
      const a = s[si + 3];
      if (lim && a > 200 && r + g + b < 150) { // falha de tinta em blocos pequenos
        let hsh = ((x >> 1) * 73856093) ^ ((y >> 1) * 19349663) ^ (seed * 83492791);
        hsh = (hsh ^ (hsh >>> 13)) * 1274126177;
        if (((hsh >>> 8) % 1000) < lim) { r = 104; g = 86; b = 64; }
      }
      o[di] = r; o[di + 1] = g; o[di + 2] = b; o[di + 3] = a;
    }
  }
  og.putImageData(od, 0, 0);
  return out;
}

// ---- papel: textura de fibras para fundos (padrão que emenda nas bordas) ----
const papelCache = new Map();
function papelCanvas(cor, seed = 3, tam = 256) {
  const key = cor + seed + tam;
  if (papelCache.has(key)) return papelCache.get(key);
  const c = gCanvas(tam, tam), g = c.getContext('2d'), rnd = gRand(seed);
  if (cor) { g.fillStyle = cor; g.fillRect(0, 0, tam, tam); } // cor nula = só as fibras, transparente
  const claro = !cor || gLum(cor) > 0.45;
  for (let i = 0; i < tam * 2.2; i++) { // fibras
    const x = rnd() * tam, y = rnd() * tam, a = rnd() * TAU, l = 3 + rnd() * 9;
    g.strokeStyle = claro ? `rgba(60,40,10,${0.035 + rnd() * 0.05})` : `rgba(255,240,200,${0.03 + rnd() * 0.04})`;
    g.lineWidth = 0.6 + rnd() * 0.6;
    for (const ox of [-tam, 0, tam]) for (const oy of [-tam, 0, tam]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke(); }
  }
  for (let i = 0; i < tam * 1.4; i++) { // pontinhos
    g.fillStyle = claro ? `rgba(40,25,5,${0.03 + rnd() * 0.06})` : `rgba(255,245,215,${0.03 + rnd() * 0.05})`;
    g.fillRect(rnd() * tam, rnd() * tam, 1 + rnd() * 1.4, 1 + rnd() * 1.4);
  }
  papelCache.set(key, c);
  return c;
}
function papelURL(cor, seed) { return papelCanvas(cor, seed).toDataURL(); }
function fibrasURL() { return papelCanvas(null, 5, 256).toDataURL(); }

// ---- XILO: alfabeto de título entalhado (só maiúsculas, traço grosso, curvas chanfradas) ----
// Cada letra é um conjunto de traços numa grade de 4 × 6. w = largura da letra na grade.
const XILO = {
  A: { s: [[0, 6, 0, 2, 1.5, 0, 2.5, 0, 4, 2, 4, 6], [0, 4, 4, 4]] },
  B: { s: [[0, 6, 0, 0, 3, 0, 4, 1, 4, 2, 3, 3, 0, 3], [3, 3, 4, 4, 4, 5, 3, 6, 0, 6]] },
  C: { s: [[4, 1.2, 3, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 4.8]] },
  D: { s: [[0, 0, 0, 6, 2.6, 6, 4, 4.6, 4, 1.4, 2.6, 0, 0, 0]] },
  E: { s: [[4, 0, 0, 0, 0, 6, 4, 6], [0, 3, 3, 3]] },
  F: { s: [[4, 0, 0, 0, 0, 6], [0, 3, 3, 3]] },
  G: { s: [[4, 1.2, 3, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5, 4, 3.2, 2.3, 3.2]] },
  H: { s: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 3, 4, 3]] },
  I: { w: 2, s: [[1, 0, 1, 6], [0, 0, 2, 0], [0, 6, 2, 6]] },
  J: { s: [[4, 0, 4, 5, 3, 6, 1, 6, 0, 5, 0, 4.2]] },
  K: { s: [[0, 0, 0, 6], [4, 0, 0.4, 3, 4, 6]] },
  L: { s: [[0, 0, 0, 6, 4, 6]] },
  M: { w: 5, s: [[0, 6, 0, 0, 2.5, 3.2, 5, 0, 5, 6]] },
  N: { s: [[0, 6, 0, 0, 4, 6, 4, 0]] },
  O: { s: [[1, 0, 3, 0, 4, 1, 4, 5, 3, 6, 1, 6, 0, 5, 0, 1, 1, 0]] },
  P: { s: [[0, 6, 0, 0, 3, 0, 4, 1, 4, 2.4, 3, 3.4, 0, 3.4]] },
  Q: { s: [[1, 0, 3, 0, 4, 1, 4, 5, 3, 6, 1, 6, 0, 5, 0, 1, 1, 0], [2.5, 4.3, 4.3, 6.5]] },
  R: { s: [[0, 6, 0, 0, 3, 0, 4, 1, 4, 2.4, 3, 3.4, 0, 3.4], [2, 3.4, 4, 6]] },
  S: { s: [[4, 1.1, 3, 0, 1, 0, 0, 1, 0, 2, 1, 3, 3, 3, 4, 4, 4, 5, 3, 6, 1, 6, 0, 4.9]] },
  T: { s: [[0, 0, 4, 0], [2, 0, 2, 6]] },
  U: { s: [[0, 0, 0, 5, 1, 6, 3, 6, 4, 5, 4, 0]] },
  V: { s: [[0, 0, 2, 6, 4, 0]] },
  W: { w: 5, s: [[0, 0, 1.2, 6, 2.5, 2.6, 3.8, 6, 5, 0]] },
  X: { s: [[0, 0, 4, 6], [4, 0, 0, 6]] },
  Y: { s: [[0, 0, 2, 3, 4, 0], [2, 3, 2, 6]] },
  Z: { s: [[0, 0, 4, 0, 0, 6, 4, 6]] },
  0: { s: [[1, 0, 3, 0, 4, 1, 4, 5, 3, 6, 1, 6, 0, 5, 0, 1, 1, 0]] },
  1: { w: 3, s: [[0.2, 1.4, 1.6, 0, 1.6, 6], [0.2, 6, 3, 6]] },
  2: { s: [[0, 1.2, 1, 0, 3, 0, 4, 1, 4, 2.3, 0, 6, 4, 6]] },
  3: { s: [[0, 1, 1, 0, 3, 0, 4, 1, 4, 2, 3, 3, 1.6, 3], [3, 3, 4, 4, 4, 5, 3, 6, 1, 6, 0, 5]] },
  4: { s: [[3, 6, 3, 0, 0, 4, 4, 4]] },
  5: { s: [[4, 0, 0, 0, 0, 2.6, 3, 2.6, 4, 3.6, 4, 5, 3, 6, 1, 6, 0, 5]] },
  6: { s: [[4, 1, 3, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5, 4, 3.7, 3, 2.8, 0, 2.8]] },
  7: { s: [[0, 0, 4, 0, 1.6, 6]] },
  8: { s: [[1, 0, 3, 0, 4, 1, 4, 2, 3, 3, 1, 3, 0, 2, 0, 1, 1, 0], [1, 3, 0, 4, 0, 5, 1, 6, 3, 6, 4, 5, 4, 4, 3, 3]] },
  9: { s: [[0, 5, 1, 6, 3, 6, 4, 5, 4, 1, 3, 0, 1, 0, 0, 1, 0, 2.3, 1, 3.2, 4, 3.2]] },
  '!': { w: 1, s: [[0.5, 0, 0.5, 3.7], [0.5, 5.5, 0.5, 6]] },
  '?': { s: [[0, 1.1, 1, 0, 3, 0, 4, 1, 4, 2.2, 2, 3.5, 2, 4.1], [2, 5.5, 2, 6]] },
  '.': { w: 1, s: [[0.5, 5.5, 0.5, 6]] },
  ',': { w: 1, s: [[0.7, 5.3, 0.3, 6.9]] },
  ':': { w: 1, s: [[0.5, 1.9, 0.5, 2.4], [0.5, 5.1, 0.5, 5.6]] },
  '-': { w: 3, s: [[0.2, 3, 2.8, 3]] },
  '—': { s: [[0, 3, 4, 3]] },
  '+': { s: [[0.4, 3, 3.6, 3], [2, 1.4, 2, 4.6]] },
  '×': { w: 3.4, s: [[0.3, 1.6, 3.1, 4.4], [3.1, 1.6, 0.3, 4.4]] },
  '/': { w: 3, s: [[0.2, 6, 2.8, 0]] },
  '%': { s: [[0.2, 6, 3.8, 0], [0.5, 0.5, 0.5, 1.2], [3.5, 4.8, 3.5, 5.5]] },
  '$': { s: [[4, 1.1, 3, 0, 1, 0, 0, 1, 0, 2, 1, 3, 3, 3, 4, 4, 4, 5, 3, 6, 1, 6, 0, 4.9], [2, -0.8, 2, 6.8]] },
  '(': { w: 2, s: [[1.8, 0, 0.4, 1.4, 0.4, 4.6, 1.8, 6]] },
  ')': { w: 2, s: [[0.2, 0, 1.6, 1.4, 1.6, 4.6, 0.2, 6]] },
  "'": { w: 1, s: [[0.6, 0, 0.4, 1.4]] },
  '·': { w: 1.6, s: [[0.8, 2.8, 0.8, 3.3]] },
  '>': { w: 3, s: [[0.3, 1.2, 2.8, 3, 0.3, 4.8]] },
  '<': { w: 3, s: [[2.7, 1.2, 0.2, 3, 2.7, 4.8]] },
  '→': { s: [[0, 3, 4, 3], [2.4, 1.3, 4, 3, 2.4, 4.7]] },
  '★': { star: true },
};
const XILO_MARCA = { // acentos (traços acima ou abaixo da letra)
  '́': [[1.5, -0.7, 2.8, -1.9]], '̀': [[2.5, -0.7, 1.2, -1.9]], '̂': [[0.9, -0.7, 2, -1.8, 3.1, -0.7]],
  '̃': [[0.7, -0.9, 1.6, -1.6, 2.4, -0.9, 3.3, -1.6]], '̧': [[2, 6.6, 2.5, 7.3, 1.6, 7.8]],
};
function xiloLayout(text) {
  const out = [];
  for (const ch of String(text).toUpperCase().normalize('NFD')) {
    if (XILO_MARCA[ch]) { if (out.length) out[out.length - 1].m.push(XILO_MARCA[ch]); continue; }
    if (ch === ' ') { out.push({ sp: true, w: 1.4, m: [] }); continue; }
    const g = XILO[ch];
    out.push(g ? { g, w: g.w != null ? g.w : 4, m: [] } : { sp: true, w: 2, m: [] });
  }
  return out;
}
// largura do texto em px para uma altura de maiúscula `size`
function xiloWidth(text, size, o = {}) {
  const u = size / 6, peso = o.peso || 1.25, gap = o.gap != null ? o.gap : 0.6;
  let w = 0;
  for (const q of xiloLayout(text)) w += q.sp ? q.w * u : (q.w + peso + gap) * u;
  return Math.max(0, w - gap * u);
}
// desenha texto entalhado. (x, y) = canto superior esquerdo da altura de maiúscula (ou centro/direita conforme align)
// o: cor, contorno (cor), cw (espessura do contorno), sombra (cor fora de registro), align, peso, gap, treme (0..1)
function xiloText(ctx, text, x, y, size, o = {}) {
  const u = size / 6, peso = o.peso || 1.25, gap = o.gap != null ? o.gap : 0.6, lw = peso * u;
  const lay = xiloLayout(text), total = xiloWidth(text, size, o);
  let x0 = x + lw / 2;
  if (o.align === 'center') x0 -= total / 2; else if (o.align === 'right') x0 -= total;
  const treme = o.treme || 0;
  const pass = (cor, largura, ox, oy) => {
    ctx.strokeStyle = cor; ctx.fillStyle = cor; ctx.lineWidth = largura;
    let cx = x0, i = 0;
    for (const q of lay) {
      if (q.sp) { cx += q.w * u; i++; continue; }
      let jx = 0, jy = 0, jr = 0;
      if (treme) { const hsh = Math.sin((i + 1) * 12.9898 + q.w * 78.233 + text.length) * 43758.5453; const f = hsh - Math.floor(hsh); jy = (f - 0.5) * u * 0.9 * treme; jr = (f - 0.5) * 0.09 * treme; jx = ((f * 7) % 1 - 0.5) * u * 0.3 * treme; }
      ctx.save(); ctx.translate(cx + ox + jx + q.w * u / 2, y + oy + jy + size / 2); ctx.rotate(jr); ctx.translate(-q.w * u / 2, -size / 2);
      if (q.g.star) {
        ctx.beginPath();
        for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = (k % 2 ? 1.25 : 2.9) * u + (largura - lw) / 2; ctx.lineTo(2 * u + Math.cos(a) * rr, 3 * u + Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill();
      } else for (const s of q.g.s.concat(...q.m)) {
        ctx.beginPath(); ctx.moveTo(s[0] * u, s[1] * u);
        for (let k = 2; k < s.length; k += 2) ctx.lineTo(s[k] * u, s[k + 1] * u);
        if (s.length > 4 && s[0] === s[s.length - 2] && s[1] === s[s.length - 1]) ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
      cx += (q.w + peso + gap) * u; i++;
    }
  };
  ctx.save();
  ctx.lineJoin = 'miter'; ctx.miterLimit = 2.3; ctx.lineCap = 'square'; ctx.setLineDash([]);
  if (o.sombra) pass(o.sombra, lw + (o.contorno ? 2 * (o.cw || u * 0.5) : 0), o.sx != null ? o.sx : u * 0.7, o.sy != null ? o.sy : u * 0.7);
  if (o.contorno) pass(o.contorno, lw + 2 * (o.cw || u * 0.5), 0, 0);
  pass(o.cor || COR.tinta, lw, 0, 0);
  ctx.restore();
  return total;
}

// título entalhado como imagem (para as telas em HTML): devolve <img> com a largura certa
const xiloCache = new Map();
function xiloImg(text, size = 40, o = {}) {
  const key = text + '|' + size + '|' + JSON.stringify(o);
  let it = xiloCache.get(key);
  if (!it) {
    const S = 2, u = size / 6, pad = Math.ceil(u * 3.2);
    const wpx = xiloWidth(text, size, o) + pad * 2, hpx = size + pad * 2;
    const c = gCanvas(wpx * S, hpx * S), g = c.getContext('2d');
    g.scale(S, S);
    xiloText(g, text, pad, pad, size, { treme: 1, ...o });
    const fin = entalhar(c, Math.max(1.2, size * 0.035) * S, text.length + size, o.falha != null ? o.falha : 0.06);
    it = { url: fin.toDataURL(), w: Math.round(wpx), h: Math.round(hpx) };
    xiloCache.set(key, it);
  }
  const alt = String(text).replace(/"/g, '&quot;');
  return `<img class="xilo" src="${it.url}" width="${it.w}" height="${it.h}" alt="${alt}">`;
}

// ---- peças de cenário da gravura ----
// sombra hachurada (pré-desenhada uma vez; cada boneco só estica a imagem)
let SOMBRA_IMG = null;
function sombraImg() {
  if (SOMBRA_IMG) return SOMBRA_IMG;
  const c = gCanvas(96, 40), g = c.getContext('2d');
  g.beginPath(); g.ellipse(48, 20, 46, 18, 0, 0, TAU); g.clip();
  g.strokeStyle = COR.tinta; g.lineWidth = 3;
  for (let i = -6; i < 30; i++) { g.beginPath(); g.moveTo(i * 6.5, 40); g.lineTo(i * 6.5 + 26, 0); g.stroke(); }
  SOMBRA_IMG = c;
  return c;
}
// estrela e explosão de gravura
function estrela(ctx, x, y, r, pontas = 5, dentro = 0.45, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < pontas * 2; i++) { const a = rot + i * Math.PI / pontas, rr = i % 2 ? r * dentro : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath();
}
// bandeirinha de festa junina (retângulo com corte em V embaixo)
function bandeirinha(ctx, x, y, w, h) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w / 2, y + h * 0.68); ctx.lineTo(x, y + h); ctx.closePath();
}
const BANDEIRAS = [COR.urucum, COR.ipe, COR.anil, COR.mata, COR.chita, COR.barro];
