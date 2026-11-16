'use strict';
// Gerador pseudoaleatório simples com semente (Park–Miller)
const RNG = {
  seed: 1,
  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  },
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
    const total = entries.reduce((s, e) => s + e[1], 0);
    let r = this.next() * total;
    for (const [v, w] of entries) { r -= w; if (r <= 0) return v; }
    return entries[entries.length - 1][0];
  },
};
