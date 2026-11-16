'use strict';
// ===== Logo do menu: capa de folheto de cordel =====
// Sol de gravura com rosto, título nas letras entalhadas, fita, varal de bandeirinhas,
// o Boitatá serpenteando atrás dos heróis. Tudo chapado e impresso "na madeira".

let LOGO_URL = null;
function logoURL() {
  if (LOGO_URL) return LOGO_URL;
  const W = 980, H = 524, S = 2, T = COR.tinta;
  const c = gCanvas(W * S, H * S), g = c.getContext('2d');
  g.scale(S, S);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const cx = W / 2, cy = 190;

  // --- varal de bandeirinhas ---
  g.strokeStyle = T; g.lineWidth = 3; g.beginPath(); g.moveTo(8, 14); g.quadraticCurveTo(cx, 38, W - 8, 14); g.stroke();
  for (let i = 0; i < 27; i++) {
    const t = (i + 0.5) / 27, x = 8 + t * (W - 16), y = 14 + 48 * t * (1 - t);
    g.save(); g.translate(x, y); g.rotate((0.5 - t) * 0.1);
    bandeirinha(g, -12, 0, 24, 30); g.fillStyle = BANDEIRAS[i % BANDEIRAS.length]; g.fill(); g.strokeStyle = T; g.lineWidth = 2.5; g.stroke();
    g.restore();
  }

  // --- sol de cordel: raios em triângulo, disco e rosto ---
  for (let i = 0; i < 24; i++) {
    const a = i * TAU / 24 - Math.PI / 2, r1 = i % 2 ? 150 : 176, d = 0.105;
    g.beginPath(); g.moveTo(cx + Math.cos(a - d) * 100, cy + Math.sin(a - d) * 100); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a + d) * 100, cy + Math.sin(a + d) * 100); g.closePath();
    g.fillStyle = i % 2 ? COR.ipe : COR.urucum; g.fill(); g.strokeStyle = T; g.lineWidth = 3; g.stroke();
  }
  g.beginPath(); g.arc(cx, cy, 98, 0, TAU); g.fillStyle = COR.ipe; g.fill();
  g.save(); g.clip(); g.strokeStyle = 'rgba(26,19,14,0.35)'; g.lineWidth = 2;
  for (let d = 8; d < 150; d += 8) { g.beginPath(); g.moveTo(cx - 100, cy + 100 - d); g.lineTo(cx - 100 + d, cy + 100); g.stroke(); }
  g.restore();
  g.beginPath(); g.arc(cx, cy, 98, 0, TAU); g.strokeStyle = T; g.lineWidth = 5; g.stroke();
  // rosto
  g.fillStyle = T;
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 34, cy - 30, 9, 13, 0, 0, TAU); g.fill(); }
  g.fillStyle = COR.papel; for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * 34 + 3, cy - 34, 3.2, 0, TAU); g.fill(); }
  g.strokeStyle = T; g.lineWidth = 5;
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 18, cy - 54); g.quadraticCurveTo(cx + s * 34, cy - 66, cx + s * 52, cy - 52); g.stroke(); }
  g.fillStyle = COR.urucum; for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * 58, cy - 4, 11, 0, TAU); g.fill(); g.lineWidth = 2.5; g.stroke(); }
  g.lineWidth = 5; g.beginPath(); g.moveTo(cx - 3, cy - 26); g.lineTo(cx - 8, cy - 2); g.lineTo(cx + 5, cy - 1); g.stroke();
  g.beginPath(); g.arc(cx, cy + 4, 34, 0.25, Math.PI - 0.25); g.stroke();

  // --- chão e o Boitatá serpenteando atrás dos heróis ---
  const gy = 506;
  for (let i = 0; i <= 46; i++) {
    const t = i / 46, x = 150 + t * 660, y = gy - 34 + Math.sin(t * Math.PI * 5) * 14, r = 9 + 9 * Math.sin(t * Math.PI);
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = i % 2 ? COR.anil : '#2f7fb0'; g.fill(); g.strokeStyle = T; g.lineWidth = 2.5; g.stroke();
    g.beginPath(); g.arc(x, y, r * 0.42, 0, TAU); g.fillStyle = i % 2 ? COR.ipe : COR.barro; g.fill();
  }
  const spr = (k, x, y, sc, flip) => {
    const s = SPRITES[k]; if (!s) return;
    g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
    g.drawImage(s.c, -s.w * sc / 2, -(s.h - 4) * sc, s.w * sc, s.h * sc); g.restore();
  };
  spr('boitata', 838, gy - 18, 2.1, false);
  spr('d_jucara', 96, gy, 2.75, false); spr('d_arvore', 30, gy, 1.9, false);
  spr('d_jucara', 890, gy, 2.6, true); spr('d_mandacaru', 950, gy, 2.2, false);
  spr('saci', 236, gy, 1.9, false); spr('capoeirista', 318, gy, 1.9, false); spr('jiujitsu', 404, gy, 1.9, false);
  spr('benzedeira', 578, gy, 1.9, true); spr('cangaceiro', 664, gy, 1.9, true); spr('cuca', 752, gy, 1.9, true);
  g.strokeStyle = T; g.lineWidth = 4; g.beginPath(); g.moveTo(6, gy); g.lineTo(W - 6, gy); g.stroke();
  g.lineWidth = 2; for (let x = 14; x < W - 20; x += 17) { g.beginPath(); g.moveTo(x, gy + 7); g.lineTo(x + 8, gy + 7); g.stroke(); }

  // --- título entalhado ---
  let size = 92;
  const larg = xiloWidth('ENCANTADOS', size);
  if (larg > W - 60) size *= (W - 60) / larg;
  xiloText(g, 'ENCANTADOS', cx, 236, size, { align: 'center', cor: T, contorno: COR.papel, cw: 7, sombra: COR.urucum, sx: 7, sy: 7, treme: 1 });

  // --- fita ---
  const ry = 348, rw = 400, rh = 38;
  g.fillStyle = '#8f2513'; g.strokeStyle = T; g.lineWidth = 3;
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(cx + s * (rw / 2 - 12), ry + 8); g.lineTo(cx + s * (rw / 2 + 46), ry + 8); g.lineTo(cx + s * (rw / 2 + 30), ry + 8 + rh / 2);
    g.lineTo(cx + s * (rw / 2 + 46), ry + 8 + rh); g.lineTo(cx + s * (rw / 2 - 12), ry + 8 + rh); g.closePath(); g.fill(); g.stroke();
  }
  g.beginPath(); g.rect(cx - rw / 2, ry, rw, rh); g.fillStyle = COR.urucum; g.fill(); g.stroke();
  xiloText(g, 'LENDAS DO BRASIL', cx, ry + 10.5, 17, { align: 'center', cor: COR.papel, gap: 0.9 });
  for (const s of [-1, 1]) { estrela(g, cx + s * (rw / 2 - 20), ry + rh / 2, 9); g.fillStyle = COR.ipe; g.fill(); g.strokeStyle = T; g.lineWidth = 1.8; g.stroke(); }

  LOGO_URL = entalhar(c, 3.4, 21, 0.05).toDataURL();
  return LOGO_URL;
}
