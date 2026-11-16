'use strict';
// ===== Ilustrações das cartas em estilo xilogravura de cordel =====
// Tinta preta sobre papel creme. Área de desenho: 200 × 130.

const ART_W = 200, ART_H = 130;
const PAPER = '#efe3c8', INKC = '#1b130d';
const artCache = new Map();

// ---- ferramentas de "gravura" ----
function ink(g, lw = 5) { g.strokeStyle = INKC; g.fillStyle = INKC; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; }
function L(g, ...pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); }
function C(g, x, y, r, fill = true) { g.beginPath(); g.arc(x, y, r, 0, TAU); fill ? g.fill() : g.stroke(); }
function E(g, x, y, rx, ry, rot = 0, fill = true) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); fill ? g.fill() : g.stroke(); }
function P(g, pts, fill = true) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); fill ? g.fill() : g.stroke(); }
function rays(g, x, y, n = 16, r0 = 30, r1 = 140, lw = 2) {
  g.save(); g.strokeStyle = INKC; g.lineWidth = lw; g.globalAlpha = 0.35;
  for (let i = 0; i < n; i++) { const a = i * TAU / n; L(g, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1); }
  g.restore();
}
function ground(g, y = 118) { ink(g, 3); L(g, 10, y, 190, y); g.lineWidth = 1.5; for (let x = 16; x < 190; x += 14) L(g, x, y + 4, x + 6, y + 4); }
function sun(g, x, y, r) { ink(g, 3); C(g, x, y, r, false); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; L(g, x + Math.cos(a) * (r + 4), y + Math.sin(a) * (r + 4), x + Math.cos(a) * (r + 10), y + Math.sin(a) * (r + 10)); } }

// boneco de gravura: j = {h:[x,y], n, q (quadril), mE, mD (mãos), cE, cD (cotovelos), jE, jD (joelhos), pE, pD (pés)}
function fig(g, j, lw = 7) {
  ink(g, lw);
  L(g, ...j.n, ...j.q);
  L(g, ...j.n, ...(j.cE || j.mE), ...j.mE);
  L(g, ...j.n, ...(j.cD || j.mD), ...j.mD);
  L(g, ...j.q, ...(j.jE || j.pE), ...j.pE);
  L(g, ...j.q, ...(j.jD || j.pD), ...j.pD);
  C(g, j.h[0], j.h[1], lw * 1.25);
}

// ---- desenhos ----
const ART = {
  // GOLPES — Capoeira
  armada(g) {
    rays(g, 100, 70);
    fig(g, { h: [92, 32], n: [95, 44], q: [100, 72], mE: [72, 50], mD: [118, 46], jE: [96, 96], pE: [94, 118], jD: [128, 70], pD: [160, 58] });
    ink(g, 2); g.setLineDash([4, 5]); g.beginPath(); g.arc(100, 72, 62, -2.6, -0.2); g.stroke(); g.setLineDash([]);
    ground(g);
  },
  meialua(g) {
    ink(g, 4); g.beginPath(); g.arc(100, 70, 55, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    fig(g, { h: [70, 64], n: [80, 70], q: [104, 84], mE: [70, 100], mD: [90, 100], jE: [110, 104], pE: [112, 118], jD: [130, 60], pD: [150, 36] });
    ground(g);
  },
  rasteira(g) {
    fig(g, { h: [58, 72], n: [68, 80], q: [92, 96], mE: [60, 110], mD: [78, 114], jE: [94, 112], pE: [100, 118], jD: [120, 108], pD: [150, 114] });
    fig(g, { h: [150, 54], n: [146, 64], q: [150, 88], mE: [130, 58], mD: [172, 52], jE: [140, 104], pE: [150, 118], jD: [166, 98], pD: [176, 92] }, 6);
    ink(g, 2); for (let i = 0; i < 3; i++) L(g, 112 + i * 8, 102 - i * 4, 124 + i * 8, 98 - i * 4);
    ground(g);
  },
  berimbau(g) {
    ink(g, 4); g.beginPath(); g.arc(150, 70, 70, Math.PI * 0.72, Math.PI * 1.28); g.stroke();
    ink(g, 1.5); L(g, 94, 22, 96, 118);
    ink(g, 3); C(g, 96, 96, 14, false); ink(g, 2); L(g, 88, 90, 104, 90);
    for (let r = 20; r <= 50; r += 15) { g.globalAlpha = 0.5; ink(g, 2); g.beginPath(); g.arc(96, 70, r, -0.6, 0.6); g.stroke(); g.globalAlpha = 1; }
    ink(g, 3); L(g, 60, 70, 82, 76); C(g, 58, 70, 4);
  },
  // GOLPES — Jiu-Jitsu
  kimura(g) {
    fig(g, { h: [70, 40], n: [76, 52], q: [86, 82], mE: [118, 64], cE: [96, 70], mD: [124, 56], cD: [104, 50], jE: [76, 100], pE: [66, 118], jD: [100, 100], pD: [108, 118] });
    fig(g, { h: [150, 70], n: [140, 74], q: [150, 100], mE: [120, 60], cE: [128, 70], mD: [166, 88], jE: [140, 112], pE: [130, 118], jD: [164, 112], pD: [176, 118] }, 6);
    ink(g, 3); C(g, 120, 60, 8, false);
  },
  mataleao(g) {
    fig(g, { h: [104, 50], n: [100, 62], q: [104, 92], mE: [80, 80], mD: [124, 84], jE: [92, 108], pE: [84, 118], jD: [116, 108], pD: [124, 118] }, 6);
    fig(g, { h: [120, 36], n: [126, 48], q: [138, 80], mE: [98, 56], cE: [108, 66], mD: [112, 50], cD: [112, 40], jE: [140, 104], pE: [134, 118], jD: [160, 98], pD: [170, 112] });
    ink(g, 3); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.35; L(g, 70 + Math.cos(a) * 14, 30 + Math.sin(a) * 14, 70 + Math.cos(a) * 22, 30 + Math.sin(a) * 22); }
  },
  guarda(g) {
    ink(g, 4); g.beginPath(); g.arc(100, 70, 52, 0, TAU); g.stroke(); g.lineWidth = 2; g.beginPath(); g.arc(100, 70, 44, 0, TAU); g.stroke();
    fig(g, { h: [64, 98], n: [74, 96], q: [100, 100], mE: [92, 76], mD: [110, 80], jE: [116, 80], pE: [136, 92], jD: [120, 108], pD: [140, 100] });
    fig(g, { h: [128, 52], n: [122, 62], q: [130, 86], mE: [98, 74], mD: [104, 68], jE: [144, 100], pE: [150, 112], jD: [118, 104], pD: [110, 114] }, 6);
  },
  queda(g) {
    rays(g, 120, 100, 12, 20, 120);
    fig(g, { h: [74, 60], n: [84, 66], q: [108, 76], mE: [126, 86], mD: [128, 70], jE: [100, 98], pE: [90, 118], jD: [120, 96], pD: [112, 118] });
    fig(g, { h: [160, 104], n: [148, 98], q: [126, 70], mE: [168, 82], mD: [156, 116], jE: [130, 48], pE: [120, 30], jD: [142, 52], pD: [150, 34] }, 6);
    ground(g);
  },
  // GOLPES — Mandinga
  fogofatuo(g) {
    for (const [x, y, s] of [[70, 80, 1.3], [118, 52, 1], [150, 90, 0.8]]) {
      ink(g, 3);
      g.beginPath(); g.moveTo(x - 14 * s, y + 10 * s); g.quadraticCurveTo(x - 16 * s, y - 10 * s, x - 2 * s, y - 30 * s); g.quadraticCurveTo(x + 2 * s, y - 12 * s, x + 8 * s, y - 20 * s); g.quadraticCurveTo(x + 18 * s, y - 4 * s, x + 14 * s, y + 10 * s); g.closePath(); g.stroke();
      E(g, x, y + 2 * s, 6 * s, 9 * s);
    }
    ink(g, 1.5); g.setLineDash([2, 4]); L(g, 40, 120, 70, 92); L(g, 90, 120, 118, 66); g.setLineDash([]);
  },
  patua(g) {
    ink(g, 3); L(g, 70, 10, 100, 44, 130, 10);
    P(g, [76, 44, 124, 44, 128, 100, 72, 100], false);
    ink(g, 2); P(g, [84, 52, 116, 52, 118, 92, 82, 92], false);
    drawCross(g, 100, 72, 12);
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ink(g, 2); L(g, 100 + Math.cos(a) * 52, 72 + Math.sin(a) * 40, 100 + Math.cos(a) * 62, 72 + Math.sin(a) * 48); }
  },
  defumacao(g) {
    ink(g, 3); P(g, [80, 100, 120, 100, 112, 120, 88, 120], false); L(g, 100, 100, 100, 92);
    ink(g, 4); g.beginPath(); g.moveTo(100, 90); g.bezierCurveTo(70, 70, 130, 50, 96, 30); g.bezierCurveTo(80, 18, 110, 10, 104, 4); g.stroke();
    ink(g, 3); g.beginPath(); g.moveTo(104, 88); g.bezierCurveTo(140, 70, 150, 50, 140, 30); g.stroke();
    g.beginPath(); g.moveTo(96, 88); g.bezierCurveTo(60, 74, 50, 52, 64, 36); g.stroke();
    ink(g, 2); for (const [x, y] of [[130, 60], [60, 70], [118, 22]]) { E(g, x, y, 6, 3, 0.6); }
  },
  garrafada(g) {
    ink(g, 4); P(g, [86, 40, 114, 40, 120, 60, 120, 116, 80, 116, 80, 60], false);
    L(g, 92, 40, 92, 18, 108, 18, 108, 40); ink(g, 2); P(g, [88, 14, 112, 14, 112, 20, 88, 20], true);
    ink(g, 2); for (let y = 70; y < 112; y += 8) L(g, 84, y, 116, y - 4);
    ink(g, 3); E(g, 100, 84, 10, 14, 0, false);
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.4; L(g, 100 + Math.cos(a) * 70, 130 + Math.sin(a) * 70, 100 + Math.cos(a) * 82, 130 + Math.sin(a) * 82); }
  },
  // GOLPES — Cangaço
  peixeira(g) {
    rays(g, 100, 65, 18);
    ink(g, 3); P(g, [40, 80, 150, 54, 160, 56, 46, 88], true);
    g.fillStyle = PAPER; P(g, [60, 80, 140, 60, 142, 62, 64, 82], true);
    ink(g, 3); P(g, [150, 50, 184, 46, 186, 62, 154, 64], true);
    g.fillStyle = PAPER; for (let x = 160; x < 182; x += 8) C(g, x, 55, 2);
  },
  bacamarte(g) {
    ink(g, 6); L(g, 30, 84, 120, 60);
    ink(g, 3); P(g, [116, 56, 146, 44, 150, 64, 120, 70], false);
    ink(g, 5); P(g, [20, 82, 52, 76, 58, 96, 24, 102], true);
    for (let i = 0; i < 7; i++) { const a = -0.6 + i * 0.14; ink(g, 2); L(g, 156 + Math.cos(a) * 6, 54 + Math.sin(a) * 6, 156 + Math.cos(a) * 34, 54 + Math.sin(a) * 34); }
    for (let i = 0; i < 5; i++) C(g, 170 + i * 4, 40 + i * 6, 2.5);
  },
  chapeu(g) {
    ink(g, 4); g.beginPath(); g.ellipse(100, 76, 70, 22, 0, Math.PI, 0); g.stroke();
    g.beginPath(); g.moveTo(30, 76); g.quadraticCurveTo(100, 104, 170, 76); g.stroke();
    ink(g, 2); g.beginPath(); g.ellipse(100, 70, 50, 12, 0, Math.PI, 0); g.stroke();
    drawStarInk(g, 100, 58, 13);
    for (let x = 50; x <= 150; x += 12) C(g, x, 84 + Math.sin((x - 50) / 100 * Math.PI) * 8, 2);
    ink(g, 2); g.setLineDash([3, 6]); g.beginPath(); g.arc(100, 70, 60, 0.3, 1.2); g.stroke(); g.setLineDash([]);
  },
  papoamarelo(g) {
    rays(g, 160, 50, 14, 10, 60);
    ink(g, 5); L(g, 26, 92, 150, 48);
    ink(g, 3); L(g, 150, 48, 178, 38);
    ink(g, 4); P(g, [18, 88, 46, 80, 54, 98, 22, 108], true);
    ink(g, 3); P(g, [70, 74, 104, 62, 108, 74, 76, 86], false);
    g.fillStyle = INKC; for (let i = 0; i < 4; i++) C(g, 80 + i * 7, 74 - i * 2.5, 2);
    ink(g, 2); g.beginPath(); g.arc(70, 88, 8, 0.2, 2.6); g.stroke();
    ink(g, 2); g.setLineDash([3, 6]); L(g, 180, 37, 196, 31); g.setLineDash([]);
  },
  chinelo(g) {
    ink(g, 3); g.beginPath(); g.ellipse(100, 66, 28, 52, 0.5, 0, TAU); g.stroke();
    ink(g, 4); L(g, 82, 44, 106, 58, 128, 52);
    ink(g, 2); for (let i = 0; i < 4; i++) L(g, 150 + i * 6, 20 + i * 10, 170 + i * 6, 14 + i * 10);
    ink(g, 2); g.font = 'bold 18px serif'; g.fillText('PÁ!', 140, 112);
  },

  // DONS — Raiz
  feijoada(g) {
    ink(g, 4); g.beginPath(); g.ellipse(100, 70, 60, 16, 0, 0, Math.PI); g.stroke();
    L(g, 40, 70, 46, 110, 154, 110, 160, 70);
    ink(g, 3); L(g, 30, 74, 40, 70); L(g, 160, 70, 170, 74);
    g.beginPath(); g.ellipse(100, 70, 60, 14, 0, Math.PI, 0); g.stroke();
    for (let i = 0; i < 9; i++) E(g, 66 + i * 8, 66 + (i % 2) * 4, 4, 3);
    ink(g, 2); for (const x of [80, 100, 120]) { g.beginPath(); g.moveTo(x, 50); g.bezierCurveTo(x - 8, 40, x + 8, 30, x, 18); g.stroke(); }
  },
  acai(g) {
    ink(g, 4); g.beginPath(); g.arc(100, 64, 52, 0.1, Math.PI - 0.1); g.stroke(); L(g, 46, 66, 154, 66);
    for (let i = 0; i < 14; i++) C(g, 58 + i * 6.4, 58 - Math.abs(i - 7) * 1.2, 5);
    ink(g, 3); g.fillStyle = PAPER; for (const [x, y] of [[80, 50], [112, 48], [96, 44]]) { C(g, x, y, 6, true); g.strokeStyle = INKC; C(g, x, y, 6, false); }
    ink(g, 3); L(g, 130, 40, 160, 12);
  },
  paodequeijo(g) {
    for (const [x, y, r] of [[70, 80, 26], [126, 84, 24], [98, 50, 22]]) {
      ink(g, 4); g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
      ink(g, 2); for (let i = 0; i < 6; i++) { const a = i * 1.1; C(g, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, 2); }
    }
    ink(g, 2); for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(80 + i * 20, 22); g.bezierCurveTo(74 + i * 20, 14, 86 + i * 20, 8, 80 + i * 20, 0); g.stroke(); }
  },
  guarana(g) {
    for (const [x, y] of [[74, 64], [126, 64], [100, 96]]) {
      ink(g, 4); C(g, x, y, 24, false);
      ink(g, 3); g.fillStyle = INKC; E(g, x, y + 2, 13, 15);
      g.fillStyle = PAPER; E(g, x, y + 2, 9, 11);
      g.fillStyle = INKC; C(g, x, y + 2, 5);
    }
    ink(g, 3); L(g, 100, 40, 100, 14); E(g, 112, 18, 12, 5, -0.4);
  },
  cafe(g) {
    ink(g, 4); P(g, [62, 56, 134, 56, 126, 104, 70, 104], false);
    g.beginPath(); g.arc(138, 76, 12, -1.2, 1.2); g.stroke();
    L(g, 44, 110, 156, 110);
    ink(g, 2); for (const x of [80, 98, 116]) { g.beginPath(); g.moveTo(x, 48); g.bezierCurveTo(x - 10, 36, x + 10, 24, x, 10); g.stroke(); }
    g.fillStyle = INKC; for (let i = 0; i < 4; i++) E(g, 76 + i * 14, 80, 4, 6, 0.3);
  },
  caldodecana(g) {
    ink(g, 4); P(g, [76, 30, 124, 30, 118, 116, 82, 116], false);
    ink(g, 2); for (let y = 50; y < 112; y += 7) L(g, 80, y, 120, y);
    ink(g, 5); L(g, 150, 118, 168, 10); ink(g, 2); for (let y = 24; y < 118; y += 18) L(g, 152 + (118 - y) / 6, y, 166 + (118 - y) / 6 * 0.2, y + 4);
    ink(g, 3); L(g, 110, 30, 130, 6);
  },
  brigadeiro(g) {
    for (const [x, y] of [[66, 82], [100, 66], [134, 82]]) {
      ink(g, 3); P(g, [x - 22, y + 10, x + 22, y + 10, x + 16, y + 30, x - 16, y + 30], false);
      for (let i = -3; i <= 3; i++) L(g, x + i * 6, y + 12, x + i * 5, y + 28);
      g.fillStyle = INKC; C(g, x, y, 18);
      g.fillStyle = PAPER; for (let i = 0; i < 10; i++) { const a = i * 2.4; E(g, x + Math.cos(a) * 11, y + Math.sin(a) * 11, 2.5, 1, a); }
    }
  },
  tapioca(g) {
    ink(g, 4); g.beginPath(); g.arc(100, 70, 56, Math.PI * 0.1, Math.PI * 1.1); g.closePath(); g.stroke();
    ink(g, 2); for (let i = 0; i < 12; i++) C(g, 70 + (i * 37) % 60, 60 + (i * 23) % 40, 2);
    ink(g, 3); g.beginPath(); g.arc(100, 70, 46, Math.PI * 0.2, Math.PI * 1.0); g.stroke();
  },
  pf(g) {
    ink(g, 4); E(g, 100, 74, 80, 40, 0, false); ink(g, 2); E(g, 100, 74, 64, 30, 0, false);
    g.fillStyle = INKC; for (let i = 0; i < 18; i++) E(g, 72 + (i % 6) * 6, 62 + Math.floor(i / 6) * 7, 3, 2);
    ink(g, 2); for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(120 + (i % 3) * 9, 66 + Math.floor(i / 3) * 10, 4, 2.5, 0.4, 0, TAU); g.stroke(); }
    ink(g, 3); E(g, 100, 92, 16, 7, 0, false); C(g, 100, 92, 5);
    L(g, 20, 40, 34, 110); L(g, 180, 40, 168, 110);
  },
  churrasco(g) {
    ink(g, 4); L(g, 30, 30, 176, 104);
    for (let i = 0; i < 4; i++) { const x = 58 + i * 30, y = 44 + i * 15; g.fillStyle = INKC; E(g, x, y, 16, 11, 0.47); g.fillStyle = PAPER; L(g, x - 8, y - 2, x + 6, y + 4); }
    ink(g, 2); for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(40 + i * 40, 128); g.bezierCurveTo(30 + i * 40, 116, 50 + i * 40, 110, 40 + i * 40, 98); g.stroke(); }
  },
  // DONS — Capoeira
  ginga(g) {
    fig(g, { h: [80, 42], n: [86, 54], q: [100, 82], mE: [62, 50], mD: [120, 68], jE: [80, 100], pE: [70, 118], jD: [124, 96], pD: [140, 118] });
    ink(g, 2); g.setLineDash([3, 5]); g.beginPath(); g.ellipse(100, 116, 60, 8, 0, 0, TAU); g.stroke(); g.setLineDash([]);
    ink(g, 3); L(g, 150, 60, 170, 60); L(g, 156, 70, 176, 70); L(g, 40, 76, 24, 76);
  },
  cordao(g) {
    ink(g, 6); g.beginPath(); g.moveTo(30, 40); g.bezierCurveTo(80, 90, 120, 10, 170, 60); g.stroke();
    ink(g, 3); g.beginPath(); g.moveTo(170, 60); g.lineTo(160, 110); g.moveTo(170, 60); g.lineTo(182, 108); g.stroke();
    for (const [x, y] of [[160, 110], [182, 108]]) { for (let i = 0; i < 5; i++) L(g, x, y, x - 6 + i * 3, y + 14); }
    ink(g, 2); g.fillStyle = PAPER; for (let t = 0.1; t < 1; t += 0.12) { const x = 30 + t * 140, y = 40 + Math.sin(t * 6) * 18 + t * 20; L(g, x - 4, y - 4, x + 4, y + 4); }
  },
  au(g) {
    fig(g, { h: [100, 98], n: [100, 86], q: [100, 56], mE: [78, 112], mD: [122, 112], jE: [76, 40], pE: [56, 24], jD: [124, 40], pD: [144, 24] });
    ink(g, 2); g.setLineDash([4, 5]); g.beginPath(); g.arc(100, 70, 58, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.setLineDash([]);
    ground(g);
  },
  atabaque(g) {
    ink(g, 4); P(g, [70, 20, 130, 20, 122, 116, 78, 116], false); g.beginPath(); g.ellipse(100, 20, 30, 8, 0, 0, TAU); g.stroke();
    ink(g, 2); for (let i = 0; i < 6; i++) L(g, 72 + i * 11, 26, 80 + i * 8, 110);
    L(g, 72, 60, 128, 60); L(g, 76, 90, 124, 90);
    ink(g, 3); for (let r = 14; r < 40; r += 10) { g.globalAlpha = 0.6; g.beginPath(); g.arc(100, 14, r + 20, -2.6, -0.5); g.stroke(); } g.globalAlpha = 1;
  },
  roda(g) {
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8, x = 100 + Math.cos(a) * 66, y = 72 + Math.sin(a) * 34;
      ink(g, 4); C(g, x, y - 12, 6); L(g, x, y - 6, x, y + 10); L(g, x - 6, y + 2, x + 6, y + 2);
    }
    fig(g, { h: [86, 52], n: [90, 60], q: [98, 80], mE: [76, 66], mD: [104, 58], jE: [94, 96], pE: [90, 104], jD: [116, 70], pD: [130, 62] }, 5);
  },
  mestre(g) {
    rays(g, 100, 60, 20, 30, 120, 2.5);
    fig(g, { h: [92, 30], n: [94, 44], q: [96, 78], mE: [78, 70], cE: [80, 54], mD: [120, 56], jE: [86, 98], pE: [80, 118], jD: [106, 98], pD: [112, 118] });
    ink(g, 3); g.beginPath(); g.arc(150, 64, 54, Math.PI * 0.7, Math.PI * 1.3); g.stroke(); C(g, 110, 92, 9, false);
    ink(g, 2); L(g, 104, 10, 108, 118);
  },
  // DONS — Jiu-Jitsu (faixas)
  faixaazul(g) { belt(g, false); },
  faixaroxa(g) { belt(g, false); ink(g, 2); for (let i = 0; i < 3; i++) L(g, 60 + i * 30, 50, 66 + i * 30, 64); },
  faixapreta(g) { rays(g, 100, 66, 22); belt(g, true); },
  faixacoral(g) { belt(g, false); g.fillStyle = INKC; for (let i = 0; i < 6; i++) P(g, [40 + i * 22, 50, 50 + i * 22, 50, 50 + i * 22, 66, 40 + i * 22, 66]); },
  pegada(g) {
    ink(g, 4); g.beginPath(); g.ellipse(100, 70, 34, 26, 0, 0, TAU); g.stroke();
    for (let i = 0; i < 4; i++) { ink(g, 5); L(g, 76 + i * 14, 52, 74 + i * 14, 30); C(g, 74 + i * 14, 28, 6, false); }
    ink(g, 5); L(g, 130, 76, 150, 60); ink(g, 3); L(g, 40, 100, 70, 90);
    ink(g, 2); for (let i = 0; i < 4; i++) L(g, 30 + i * 6, 20, 40 + i * 6, 34);
  },
  tatame(g) {
    ink(g, 3); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { g.strokeRect(24 + i * 38, 22 + j * 30, 38, 30); if ((i + j) % 2) { g.globalAlpha = 0.25; g.fillRect(24 + i * 38, 22 + j * 30, 38, 30); g.globalAlpha = 1; } }
    ink(g, 4); C(g, 100, 66, 18, false); ink(g, 3); L(g, 92, 58, 108, 74); L(g, 108, 58, 92, 74);
  },
  kimono(g) {
    ink(g, 4); P(g, [60, 20, 140, 20, 160, 50, 146, 60, 136, 46, 136, 118, 64, 118, 64, 46, 54, 60, 40, 50], false);
    L(g, 86, 20, 100, 60, 114, 20);
    ink(g, 2); for (let y = 66; y < 116; y += 8) for (let x = 70; x < 132; x += 8) L(g, x, y, x + 4, y + 4);
    g.fillStyle = INKC; g.fillRect(64, 70, 72, 9);
  },
  // DONS — Mandinga
  reza(g) {
    ink(g, 4); L(g, 90, 110, 90, 60, 80, 40); L(g, 110, 110, 110, 60, 120, 40);
    g.beginPath(); g.moveTo(80, 40); g.quadraticCurveTo(100, 20, 120, 40); g.stroke();
    ink(g, 2); for (let i = 0; i < 12; i++) C(g, 100 + Math.cos(i * 0.52) * 30, 92 + Math.sin(i * 0.52) * 14, 3);
    rays(g, 100, 36, 12, 24, 80);
  },
  vela(g) {
    ink(g, 4); g.strokeRect(84, 50, 32, 66); ink(g, 2); L(g, 84, 60, 116, 60);
    for (let i = 0; i < 7; i++) { ink(g, 1.5); g.strokeText ? null : 0; L(g, 88 + i * 4, 64, 88 + i * 4, 112); }
    ink(g, 3); L(g, 100, 50, 100, 42);
    g.beginPath(); g.moveTo(92, 36); g.quadraticCurveTo(94, 16, 100, 8); g.quadraticCurveTo(106, 16, 108, 36); g.quadraticCurveTo(100, 44, 92, 36); g.fill();
    rays(g, 100, 28, 14, 18, 70);
  },
  simpatia(g) {
    ink(g, 3); for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(60 + i * 40, 70, 18, 0, TAU); g.stroke(); C(g, 60 + i * 40, 70, 6); }
    ink(g, 2); g.setLineDash([3, 4]); L(g, 30, 30, 170, 110); L(g, 30, 110, 170, 30); g.setLineDash([]);
    ink(g, 4); L(g, 100, 20, 100, 6); L(g, 94, 12, 106, 12);
  },
  arruda(g) {
    ink(g, 4); g.beginPath(); g.moveTo(100, 120); g.quadraticCurveTo(96, 70, 110, 14); g.stroke();
    for (let i = 0; i < 9; i++) {
      const y = 100 - i * 10, s = i % 2 ? 1 : -1, x = 100 + (120 - y) * 0.08;
      g.fillStyle = INKC; E(g, x + s * 14, y - 4, 10, 4, s * -0.6);
    }
  },
  banho(g) {
    ink(g, 4); g.beginPath(); g.ellipse(100, 92, 70, 20, 0, 0, Math.PI); g.stroke(); L(g, 30, 92, 170, 92);
    ink(g, 2); for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(50 + i * 20, 86); g.bezierCurveTo(44 + i * 20, 70, 56 + i * 20, 60, 50 + i * 20, 46); g.stroke(); }
    g.fillStyle = INKC; for (const [x, y] of [[70, 96], [100, 100], [130, 96]]) E(g, x, y, 8, 3, 0.3);
    E(g, 60, 30, 8, 4, 0.5); E(g, 140, 26, 8, 4, -0.5);
  },
  benzedeiramor(g) {
    rays(g, 100, 60, 24, 30, 130, 2.5);
    ink(g, 5); P(g, [70, 118, 130, 118, 116, 70, 84, 70], false);
    C(g, 100, 52, 14, false);
    g.beginPath(); g.moveTo(84, 48); g.quadraticCurveTo(100, 26, 118, 48); g.lineTo(122, 58); g.lineTo(80, 58); g.closePath(); g.fill();
    ink(g, 4); L(g, 116, 80, 140, 62, 150, 36);
    for (let i = 0; i < 5; i++) { g.fillStyle = INKC; E(g, 146 + (i % 2 ? 6 : -6), 40 + i * 6, 6, 2.5, i % 2 ? 0.6 : -0.6); }
  },
  // DONS — Cangaço
  sol(g) { sun(g, 100, 54, 24); ink(g, 3); L(g, 20, 112, 60, 96, 90, 106, 130, 90, 180, 110); drawCactus(g, 150, 112, 0.7); },
  mira(g) {
    ink(g, 3); C(g, 100, 66, 44, false); C(g, 100, 66, 26, false); C(g, 100, 66, 8);
    L(g, 100, 10, 100, 122); L(g, 44, 66, 156, 66);
  },
  gibao(g) {
    ink(g, 4); P(g, [64, 22, 136, 22, 150, 118, 50, 118], false);
    L(g, 100, 22, 100, 118);
    ink(g, 2); for (let i = 0; i < 5; i++) { drawStarInk(g, 76, 40 + i * 18, 5); drawStarInk(g, 124, 40 + i * 18, 5); }
  },
  amolada(g) {
    ink(g, 3); P(g, [30, 90, 140, 66, 150, 68, 36, 98], true);
    ink(g, 4); P(g, [140, 62, 176, 58, 178, 74, 144, 76], true);
    ink(g, 2); for (let i = 0; i < 5; i++) { L(g, 60 + i * 16, 62 - i * 4, 70 + i * 16, 56 - i * 4); }
    g.fillStyle = PAPER; C(g, 100, 74, 3);
    ink(g, 3); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.3; L(g, 44 + Math.cos(a) * 12, 90 + Math.sin(a) * 12, 44 + Math.cos(a) * 22, 90 + Math.sin(a) * 22); }
  },
  xaxado(g) {
    fig(g, { h: [70, 34], n: [72, 46], q: [76, 76], mE: [52, 60], mD: [96, 40], jE: [62, 96], pE: [64, 118], jD: [90, 92], pD: [96, 106] });
    fig(g, { h: [134, 34], n: [132, 46], q: [128, 76], mE: [110, 40], mD: [152, 60], jE: [116, 92], pE: [108, 106], jD: [140, 96], pD: [140, 118] });
    ground(g);
  },
  rei(g) {
    rays(g, 100, 70, 26, 30, 140, 3);
    ink(g, 4); g.beginPath(); g.ellipse(100, 70, 74, 20, 0, Math.PI, 0); g.stroke();
    g.beginPath(); g.moveTo(26, 70); g.quadraticCurveTo(100, 100, 174, 70); g.stroke();
    drawStarInk(g, 100, 50, 16);
    for (let i = 0; i < 3; i++) { ink(g, 3); P(g, [70 + i * 30, 26, 76 + i * 30, 12, 82 + i * 30, 26], false); }
  },
  // DONS — Sem tag
  arretado(g) {
    rays(g, 100, 66, 28, 20, 140, 3);
    g.font = 'bold 54px Georgia, serif'; g.textAlign = 'center'; g.fillStyle = INKC; g.fillText('×1,2', 100, 86);
  },
  gol(g) {
    ink(g, 3); g.strokeRect(30, 30, 140, 80);
    ink(g, 1.5); for (let x = 40; x < 170; x += 10) L(g, x, 30, x, 110); for (let y = 40; y < 110; y += 10) L(g, 30, y, 170, y);
    ink(g, 3); g.fillStyle = PAPER; C(g, 150, 46, 14, true); g.strokeStyle = INKC; C(g, 150, 46, 14, false);
    g.fillStyle = INKC; P(g, [150, 38, 158, 44, 155, 53, 145, 53, 142, 44]);
  },
  saudade(g) {
    ink(g, 3); L(g, 20, 100, 180, 100);
    g.beginPath(); for (let x = 20; x <= 180; x += 4) g.lineTo(x, 104 + Math.sin(x / 8) * 3); g.stroke();
    ink(g, 4); P(g, [60, 100, 70, 80, 84, 100], false); L(g, 70, 80, 70, 40); P(g, [70, 44, 100, 70, 70, 70], false);
    sun(g, 150, 54, 16);
  },
  carnaval(g) {
    ink(g, 3); g.beginPath(); g.moveTo(40, 60); g.quadraticCurveTo(100, 30, 160, 60); g.quadraticCurveTo(150, 90, 120, 84); g.quadraticCurveTo(100, 70, 80, 84); g.quadraticCurveTo(50, 90, 40, 60); g.closePath(); g.stroke();
    E(g, 76, 66, 10, 6); E(g, 124, 66, 10, 6);
    for (let i = 0; i < 5; i++) { ink(g, 2); g.beginPath(); g.moveTo(60 + i * 20, 42); g.quadraticCurveTo(50 + i * 22, 10, 70 + i * 18, 4); g.stroke(); }
    g.fillStyle = INKC; for (let i = 0; i < 20; i++) C(g, 20 + (i * 47) % 160, 100 + (i * 13) % 26, 2);
  },
  jeitinho(g) {
    ink(g, 4); g.beginPath(); g.arc(100, 66, 40, 0, TAU); g.stroke();
    C(g, 86, 56, 5); C(g, 116, 56, 5);
    ink(g, 4); g.beginPath(); g.arc(100, 66, 24, 0.3, Math.PI - 0.6); g.stroke();
    ink(g, 3); L(g, 150, 40, 170, 20); L(g, 160, 30, 176, 34);
    ink(g, 2); g.font = 'bold 22px Georgia, serif'; g.fillText('?!', 30, 40);
  },

  // ENCANTOS
  figa(g) {
    ink(g, 4); g.beginPath(); g.moveTo(80, 120); g.lineTo(80, 70); g.quadraticCurveTo(76, 40, 100, 30); g.quadraticCurveTo(126, 30, 124, 64); g.lineTo(122, 120); g.stroke();
    g.beginPath(); g.ellipse(100, 52, 8, 14, 0.3, 0, TAU); g.fill();
    ink(g, 2); for (let i = 0; i < 3; i++) L(g, 86, 74 + i * 10, 118, 74 + i * 10);
    ink(g, 3); L(g, 100, 30, 100, 10);
  },
  fitinha(g) {
    ink(g, 3);
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(30 + i * 8, 20 + i * 4); g.bezierCurveTo(80, 60 + i * 10, 120, 0 + i * 10, 176 - i * 6, 110 - i * 8); g.stroke(); }
    g.font = 'italic bold 12px Georgia, serif'; g.fillStyle = INKC; g.fillText('lembrança', 70, 112);
  },
  galo(g) {
    ink(g, 4); g.beginPath(); g.ellipse(96, 76, 34, 26, -0.2, 0, TAU); g.stroke();
    C(g, 132, 44, 14, false); P(g, [144, 44, 160, 48, 144, 52]);
    P(g, [124, 30, 128, 18, 134, 28, 138, 16, 142, 30]);
    g.beginPath(); g.moveTo(64, 70); g.quadraticCurveTo(30, 30, 40, 90); g.quadraticCurveTo(50, 60, 64, 80); g.fill();
    L(g, 90, 100, 86, 120); L(g, 104, 100, 108, 120); C(g, 134, 42, 2);
  },
  ferradura(g) {
    ink(g, 12); g.beginPath(); g.arc(100, 60, 38, Math.PI * 0.85, Math.PI * 0.15 + TAU); g.stroke();
    g.fillStyle = PAPER; for (let i = 0; i < 7; i++) { const a = Math.PI * 0.9 + i * 0.32; C(g, 100 + Math.cos(a) * 38, 60 + Math.sin(a) * 38, 2.6); }
    rays(g, 100, 60, 12, 54, 90);
  },
  rede(g) {
    ink(g, 3); L(g, 20, 30, 40, 40); L(g, 180, 30, 160, 40);
    g.beginPath(); g.moveTo(40, 40); g.quadraticCurveTo(100, 120, 160, 40); g.stroke();
    g.beginPath(); g.moveTo(40, 40); g.quadraticCurveTo(100, 90, 160, 40); g.stroke();
    ink(g, 1.5); for (let i = 1; i < 10; i++) { const t = i / 10; L(g, 40 + t * 120, 40 + Math.sin(t * Math.PI) * 28, 40 + t * 120, 40 + Math.sin(t * Math.PI) * 52); }
    g.font = 'bold 18px Georgia, serif'; g.fillStyle = INKC; g.fillText('z z z', 120, 24);
  },
  bornal(g) {
    ink(g, 4); P(g, [56, 50, 144, 50, 150, 118, 50, 118], false);
    g.beginPath(); g.moveTo(56, 50); g.quadraticCurveTo(100, 10, 144, 50); g.stroke();
    P(g, [56, 50, 144, 50, 140, 76, 60, 76], false);
    for (let i = 0; i < 5; i++) { g.fillStyle = PAPER; C(g, 76 + i * 12, 96, 7); g.strokeStyle = INKC; ink(g, 2); C(g, 76 + i * 12, 96, 7, false); }
  },
  cofrinho(g) {
    ink(g, 4); g.beginPath(); g.ellipse(100, 74, 54, 36, 0, 0, TAU); g.stroke();
    P(g, [146, 64, 166, 60, 166, 80, 150, 82], false); C(g, 158, 70, 2);
    L(g, 72, 106, 70, 120); L(g, 128, 106, 130, 120);
    ink(g, 5); L(g, 88, 42, 112, 42);
    ink(g, 2); C(g, 132, 60, 3);
  },
  carranca(g) {
    ink(g, 4); g.beginPath(); g.moveTo(60, 120); g.lineTo(64, 40); g.quadraticCurveTo(100, 0, 136, 40); g.lineTo(140, 120); g.stroke();
    for (let i = 0; i < 6; i++) L(g, 66 + i * 14, 20 + Math.abs(i - 2.5) * 6, 60 + i * 16, 8);
    C(g, 84, 58, 7); C(g, 116, 58, 7);
    ink(g, 3); P(g, [100, 62, 108, 84, 92, 84], false);
    P(g, [78, 96, 122, 96, 116, 110, 84, 110], false);
    for (let i = 0; i < 5; i++) L(g, 84 + i * 8, 96, 84 + i * 8, 104);
  },
  pimenta(g) {
    for (const [x, r] of [[80, -0.4], [118, 0.3]]) {
      g.save(); g.translate(x, 70); g.rotate(r);
      ink(g, 3); g.beginPath(); g.moveTo(0, -40); g.quadraticCurveTo(22, -20, 6, 46); g.quadraticCurveTo(-18, -10, 0, -40); g.fill();
      L(g, 0, -40, 4, -54); g.restore();
    }
    ink(g, 2); for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(150 + i * 6, 100); g.quadraticCurveTo(140 + i * 6, 80, 156 + i * 6, 64); g.stroke(); }
  },
  sombrinha(g) {
    ink(g, 3); g.beginPath(); g.arc(100, 64, 56, Math.PI, 0); g.closePath(); g.stroke();
    for (let i = 0; i < 6; i++) { const a = Math.PI + i * Math.PI / 6; L(g, 100, 64, 100 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); if (i % 2 === 0) { g.beginPath(); g.moveTo(100, 64); g.arc(100, 64, 56, a, a + Math.PI / 6); g.closePath(); g.fill(); } }
    ink(g, 4); L(g, 100, 64, 100, 120); C(g, 100, 6, 4);
  },
  estrela(g) { rays(g, 100, 66, 20); drawStarInk(g, 100, 66, 44); g.fillStyle = PAPER; drawStarFill(g, 100, 66, 22); },
  panela(g) {
    ink(g, 4); g.beginPath(); g.ellipse(100, 56, 56, 12, 0, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(44, 56); g.quadraticCurveTo(50, 118, 100, 118); g.quadraticCurveTo(150, 118, 156, 56); g.stroke();
    L(g, 30, 60, 44, 60); L(g, 156, 60, 170, 60);
    ink(g, 2); for (let x = 54; x < 150; x += 12) L(g, x, 70, x + 4, 106);
    ink(g, 2); for (const x of [80, 100, 120]) { g.beginPath(); g.moveTo(x, 40); g.bezierCurveTo(x - 8, 30, x + 8, 22, x, 10); g.stroke(); }
  },
};
ART.patuaouro = ART.patua;

function belt(g, dark) {
  ink(g, 4);
  g.beginPath(); g.moveTo(20, 50); g.lineTo(180, 50); g.lineTo(180, 66); g.lineTo(20, 66); g.closePath(); dark ? g.fill() : g.stroke();
  P(g, [86, 44, 114, 44, 114, 72, 86, 72], true);
  ink(g, 5); L(g, 94, 72, 76, 116); L(g, 106, 72, 126, 116);
  if (dark) { g.fillStyle = PAPER; g.fillRect(150, 52, 18, 12); }
}
function drawCross(g, x, y, r) { ink(g, 4); L(g, x, y - r, x, y + r); L(g, x - r * 0.7, y - r * 0.3, x + r * 0.7, y - r * 0.3); }
function drawStarInk(g, x, y, r) { ink(g, 2); drawStarFill(g, x, y, r); }
function drawStarFill(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}
function drawCactus(g, x, y, s) {
  ink(g, 4 * s); L(g, x, y, x, y - 60 * s); L(g, x, y - 30 * s, x - 16 * s, y - 30 * s, x - 16 * s, y - 46 * s); L(g, x, y - 38 * s, x + 14 * s, y - 38 * s, x + 14 * s, y - 52 * s);
}

// ---- textura de impressão ----
function printTexture(g, seed) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  g.save();
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = PAPER;
  for (let i = 0; i < 260; i++) { g.globalAlpha = 0.5; g.fillRect(rnd() * ART_W, rnd() * ART_H, 1 + rnd() * 2, 1); }
  g.restore();
}

// Gera (e guarda em cache) a ilustração como dataURL
function cardArtURL(art, accent) {
  const key = art + '|' + accent;
  if (artCache.has(key)) return artCache.get(key);
  const sc = 2, seed = [...art].reduce((a, ch) => a + ch.charCodeAt(0), 7);
  const c = gCanvas(ART_W * sc, ART_H * sc), g = c.getContext('2d');
  g.scale(sc, sc);
  // 1ª matriz: o papel
  g.fillStyle = COR.papel; g.fillRect(0, 0, ART_W, ART_H);
  // 2ª matriz: a cor do folheto, chapada e um pouco fora de registro
  const tipo = seed % 3, dx = 3 + seed % 4, dy = 2 + seed % 3;
  g.fillStyle = accent || COR.ipe;
  g.beginPath();
  if (tipo === 0) g.arc(100 + dx, 62 + dy, 50, 0, TAU);                                        // disco (sol ou lua)
  else if (tipo === 1) { g.rect(0, 94 + dy, ART_W, 40); g.moveTo(58 + dx, 30); g.arc(40 + dx, 30, 18, 0, TAU); } // chão + sol pequeno
  else { g.moveTo(-10, 130); g.lineTo(56 + dx, 18 + dy); g.lineTo(144 + dx, 18 + dy); g.lineTo(210, 130); g.closePath(); } // facho
  g.fill();
  // 3ª matriz: a tinta preta, numa camada própria para receber a textura
  const inkC = gCanvas(c.width, c.height), ig = inkC.getContext('2d');
  ig.scale(sc, sc);
  (ART[art] || ART.arretado)(ig);
  printTexture(ig, seed);
  g.drawImage(inkC, 0, 0, ART_W, ART_H);
  g.strokeStyle = COR.tinta; g.lineWidth = 1.6; g.strokeRect(4.5, 4.5, ART_W - 9, ART_H - 9); // filete da gravura
  const url = entalhar(c, 2.6, seed, 0.05).toDataURL();
  artCache.set(key, url);
  return url;
}

// ---- ícones (itens ativos, coxinha e as melhorias do Treino) ----
Object.assign(ART, {
  i_fogos(g) {
    const estouro = (x, y, r, n) => { for (let i = 0; i < n; i++) { const a = i * TAU / n; L(g, x + Math.cos(a) * r * 0.36, y + Math.sin(a) * r * 0.36, x + Math.cos(a) * r, y + Math.sin(a) * r); } C(g, x, y, 4); };
    ink(g, 4); estouro(66, 46, 34, 12); estouro(138, 38, 26, 10); ink(g, 3); estouro(108, 86, 20, 8);
    ink(g, 3); g.setLineDash([5, 6]); L(g, 66, 122, 66, 84); L(g, 138, 122, 138, 68); g.setLineDash([]);
    ground(g, 122);
  },
  i_rede(g) {
    ink(g, 5);
    g.save(); g.beginPath(); g.moveTo(40, 40); g.quadraticCurveTo(100, 14, 160, 40); g.quadraticCurveTo(178, 90, 150, 112); g.quadraticCurveTo(100, 124, 50, 112); g.quadraticCurveTo(22, 90, 40, 40); g.closePath(); g.stroke(); g.clip();
    g.lineWidth = 2; for (let i = -8; i < 16; i++) { L(g, i * 16, 0, i * 16 + 130, 130); L(g, i * 16 + 130, 0, i * 16, 130); }
    g.restore();
    ink(g, 3); for (const x of [56, 84, 116, 144]) C(g, x, 117, 5);
    ink(g, 4); L(g, 100, 22, 120, 4);
  },
  i_cha(g) {
    ink(g, 5); P(g, [58, 58, 132, 58, 122, 104, 68, 104], false); g.beginPath(); g.arc(136, 78, 16, -1.2, 1.3); g.stroke();
    ink(g, 4); L(g, 44, 114, 148, 114);
    ink(g, 3); for (const x of [76, 96, 116]) { g.beginPath(); g.moveTo(x, 48); g.bezierCurveTo(x - 8, 38, x + 8, 30, x, 18); g.stroke(); }
    ink(g, 3); E(g, 94, 82, 12, 6, -0.5, false); L(g, 84, 88, 104, 76);
  },
  i_pandeiro(g) {
    ink(g, 6); C(g, 100, 66, 46, false); ink(g, 2.5); C(g, 100, 66, 35, false);
    ink(g, 3); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.3; E(g, 100 + Math.cos(a) * 41, 66 + Math.sin(a) * 41, 7.5, 3.6, a + Math.PI / 2); }
    ink(g, 3); for (let i = 0; i < 5; i++) { const a = -2.3 + i * 0.3; L(g, 100 + Math.cos(a) * 55, 66 + Math.sin(a) * 55, 100 + Math.cos(a) * 65, 66 + Math.sin(a) * 65); }
  },
  i_chimarrao(g) {
    ink(g, 5); g.beginPath(); g.moveTo(74, 52); g.quadraticCurveTo(54, 100, 100, 112); g.quadraticCurveTo(146, 100, 126, 52); g.closePath(); g.stroke();
    ink(g, 6); L(g, 66, 52, 134, 52);
    ink(g, 4); L(g, 104, 52, 142, 14, 154, 18);
    ink(g, 2.5); for (let i = 0; i < 4; i++) L(g, 80 + i * 12, 64, 78 + i * 12, 98);
    ink(g, 3); for (const x of [76, 92]) { g.beginPath(); g.moveTo(x, 42); g.bezierCurveTo(x - 6, 34, x + 6, 28, x, 18); g.stroke(); }
    ink(g, 4); L(g, 68, 120, 132, 120);
  },
  coxinha(g) {
    rays(g, 100, 62, 14, 62, 92, 2);
    ink(g, 5); g.beginPath(); g.moveTo(100, 20); g.quadraticCurveTo(152, 80, 128, 104); g.quadraticCurveTo(100, 116, 72, 104); g.quadraticCurveTo(48, 80, 100, 20); g.closePath(); g.stroke();
    ink(g, 3); for (const [x, y] of [[92, 60], [108, 74], [88, 86], [112, 94], [100, 44], [120, 84]]) C(g, x, y, 2.4);
    ink(g, 4); E(g, 100, 113, 62, 9, 0, false);
  },
  t_folego(g) {
    ink(g, 6); g.beginPath(); g.moveTo(100, 110); g.bezierCurveTo(28, 62, 58, 12, 100, 46); g.bezierCurveTo(142, 12, 172, 62, 100, 110); g.closePath(); g.stroke();
    ink(g, 4); L(g, 60, 66, 84, 66, 92, 48, 104, 86, 112, 66, 140, 66);
  },
  t_forca(g) { // braço dobrado mostrando o muque
    ink(g, 14); L(g, 44, 104, 98, 96, 120, 52);
    ink(g, 9); C(g, 126, 40, 13);
    ink(g, 3); g.strokeStyle = PAPER; g.beginPath(); g.arc(86, 86, 14, Math.PI * 1.1, Math.PI * 1.8); g.stroke();
    ink(g, 3); for (let i = 0; i < 4; i++) { const a = -1.9 + i * 0.42; L(g, 126 + Math.cos(a) * 24, 40 + Math.sin(a) * 24, 126 + Math.cos(a) * 35, 40 + Math.sin(a) * 35); }
  },
  t_couro(g) {
    ink(g, 6); P(g, [58, 20, 142, 20, 142, 70, 100, 114, 58, 70], false);
    ink(g, 2.5); P(g, [69, 31, 131, 31, 131, 66, 100, 99, 69, 66], false);
    const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 7.5 : 17; pts.push(100 + Math.cos(a) * r, 58 + Math.sin(a) * r); }
    ink(g, 2); P(g, pts);
  },
  t_reza(g) {
    ink(g, 3); for (let i = 0; i < 16; i++) { const a = i * TAU / 16 - Math.PI / 2; C(g, 100 + Math.cos(a) * 42, 52 + Math.sin(a) * 36, 4.4); }
    ink(g, 7); L(g, 100, 88, 100, 124); L(g, 86, 101, 114, 101);
  },
  t_pernas(g) {
    fig(g, { h: [110, 30], n: [106, 42], q: [96, 72], mE: [132, 56], cE: [122, 46], mD: [78, 66], cD: [84, 52], jE: [118, 88], pE: [106, 112], jD: [74, 84], pD: [50, 98] });
    ink(g, 3); for (let i = 0; i < 3; i++) L(g, 18, 48 + i * 16, 46 - i * 5, 48 + i * 16);
    ground(g);
  },
  t_mira(g) {
    ink(g, 5); C(g, 92, 68, 44, false); ink(g, 4); C(g, 92, 68, 27, false); ink(g, 5); C(g, 92, 68, 9);
    ink(g, 4); L(g, 92, 68, 172, 20); P(g, [92, 68, 112, 64, 104, 52]); L(g, 162, 12, 180, 30); L(g, 152, 20, 170, 38);
  },
  t_estudo(g) {
    ink(g, 5); P(g, [100, 36, 40, 24, 40, 100, 100, 112], false); P(g, [100, 36, 160, 24, 160, 100, 100, 112], false);
    ink(g, 2.5); for (let i = 0; i < 4; i++) { L(g, 52, 44 + i * 13, 90, 51 + i * 13); L(g, 110, 51 + i * 13, 148, 44 + i * 13); }
  },
  t_mesada(g) {
    ink(g, 4); for (let i = 0; i < 4; i++) { g.fillStyle = PAPER; g.beginPath(); g.ellipse(84, 104 - i * 14, 38, 11, 0, 0, TAU); g.fill(); g.stroke(); }
    ink(g, 5); C(g, 144, 48, 25, false); ink(g, 4); L(g, 154, 38, 138, 38, 135, 48, 152, 50, 151, 60, 134, 60); L(g, 144, 30, 144, 66);
  },
  t_manha(g) {
    g.save(); g.translate(84, 66); g.rotate(-0.22); ink(g, 5); g.strokeRect(-30, -30, 60, 60); for (const [x, y] of [[-15, -15], [15, 15], [0, 0], [15, -15], [-15, 15]]) C(g, x, y, 5.5); g.restore();
    g.save(); g.translate(148, 86); g.rotate(0.3); ink(g, 4); g.strokeRect(-20, -20, 40, 40); for (const [x, y] of [[-8, -8], [8, 8]]) C(g, x, y, 4.2); g.restore();
  },
  t_raio(g) {
    rays(g, 100, 66, 14, 66, 98, 2.5);
    ink(g, 4); P(g, [114, 10, 62, 72, 96, 72, 80, 122, 142, 50, 106, 50]);
  },
});
