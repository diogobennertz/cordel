'use strict';
// ===== Utilitários gerais (sem DOM — também rodam no simulador Node) =====

const RNG = {
  seed: 1,
  setSeed(s) { this.seed = (Math.abs(Math.floor(s)) % 2147483646) + 1; },
  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  },
  range(a, b) { return a + this.next() * (b - a); },
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); },
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; },
  chance(p) { return this.next() < p; },
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },
  weighted(entries) { // [[valor, peso], ...]
    let total = 0;
    for (const e of entries) total += Math.max(0, e[1]);
    if (total <= 0) return entries.length ? entries[0][0] : undefined;
    let r = this.next() * total;
    for (const [v, w] of entries) { r -= Math.max(0, w); if (r <= 0) return v; }
    return entries[entries.length - 1][0];
  },
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const dist = (a, b) => Math.sqrt(dist2(a, b));
const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const finite = (v, fb = 0) => (Number.isFinite(v) ? v : fb);
const TAU = Math.PI * 2;

// diferença angular em [-PI, PI]
function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

// Formata números grandes: 950 · 1.2K · 3.4M · 5.6B · 7.8T · 1.2e15
function fmt(n) {
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '0';
  const a = Math.abs(n);
  if (a < 10 && a % 1 !== 0) return n.toFixed(1);
  if (a < 1000) return String(Math.round(n));
  const units = [['T', 1e12], ['B', 1e9], ['M', 1e6], ['K', 1e3]];
  if (a >= 1e15) return n.toExponential(1).replace('+', '');
  for (const [u, v] of units) if (a >= v) return (n / v).toFixed(a / v < 100 ? 1 : 0) + u;
  return String(Math.round(n));
}
const pct = v => `${Math.round(v * 100)}%`;

// Grade espacial para colisões rápidas
class SpatialHash {
  constructor(cell = 64) { this.cell = cell; this.map = new Map(); }
  clear() { this.map.clear(); }
  key(cx, cy) { return cx * 73856093 ^ cy * 19349663; }
  insert(e) {
    const c = this.cell;
    const x0 = Math.floor((e.x - e.r) / c), x1 = Math.floor((e.x + e.r) / c);
    const y0 = Math.floor((e.y - e.r) / c), y1 = Math.floor((e.y + e.r) / c);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const k = this.key(cx, cy);
      let b = this.map.get(k);
      if (!b) { b = []; this.map.set(k, b); }
      b.push(e);
    }
  }
  // devolve entidades cujas células tocam o círculo (x, y, r) — sem duplicatas
  query(x, y, r, out = []) {
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    const stamp = ++SpatialHash.stamp;
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const b = this.map.get(this.key(cx, cy));
      if (!b) continue;
      for (const e of b) if (e._q !== stamp) { e._q = stamp; out.push(e); }
    }
    return out;
  }
}
SpatialHash.stamp = 0;
