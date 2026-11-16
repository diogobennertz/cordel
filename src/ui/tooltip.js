'use strict';
// ===== Dicas ao passar o mouse: mostram exatamente o que cada carta/golpe/encanto faz na SUA build =====

const TIP = { el: null, map: new Map(), n: 0 };

// registra o HTML de uma dica e devolve o atributo para colocar no elemento
function tipAttr(html) {
  if (!html) return '';
  if (TIP.map.size > 400) TIP.map.clear();
  const id = 't' + (++TIP.n);
  TIP.map.set(id, html);
  return ` data-tip="${id}"`;
}

function initTips() {
  TIP.el = document.createElement('div');
  TIP.el.className = 'tip';
  TIP.el.hidden = true;
  document.body.appendChild(TIP.el);
  let cur = null;
  document.addEventListener('mousemove', ev => {
    const t = ev.target.closest && ev.target.closest('[data-tip]');
    const html = t && TIP.map.get(t.dataset.tip);
    if (!html) { TIP.el.hidden = true; cur = null; return; }
    if (cur !== t) { TIP.el.innerHTML = html; cur = t; }
    TIP.el.hidden = false;
    const r = TIP.el.getBoundingClientRect(), pad = 16;
    let x = ev.clientX + pad, y = ev.clientY + pad;
    if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - pad;
    if (y + r.height > innerHeight - 8) y = innerHeight - r.height - 8;
    TIP.el.style.left = Math.max(8, x) + 'px';
    TIP.el.style.top = Math.max(8, y) + 'px';
  });
  document.addEventListener('mousedown', () => { TIP.el.hidden = true; cur = null; });
}
function hideTip() { if (TIP.el) TIP.el.hidden = true; }

// ---- comparação de atributos: como a build fica se você pegar a carta ----
const n2 = v => (Math.round(v * 100) / 100).toString().replace('.', ',');
const STAT_ROWS = [
  ['maxHp', 'Vida máxima', v => fmt(Math.round(v))],
  ['regen', 'Regeneração', v => n2(v) + '/s'],
  ['armor', 'Redução de dano', pct],
  ['dodge', 'Esquiva', pct],
  ['nullify', 'Corpo fechado (anula golpe)', pct],
  ['speed', 'Velocidade', v => Math.round(v)],
  ['dmgAdd', 'Bônus de dano (soma)', v => '+' + pct(v)],
  ['dmgMult', 'Multiplicador de dano', v => '×' + n2(v)],
  ['critChance', 'Chance de crítico', pct],
  ['critMult', 'Dano crítico', v => '×' + n2(v)],
  ['atkSpeed', 'Velocidade de ataque', v => '×' + n2(v)],
  ['area', 'Área', v => '×' + n2(v)],
  ['projectiles', 'Projéteis extras', v => '+' + v],
  ['duration', 'Duração', v => '×' + n2(v)],
  ['pierce', 'Perfuração', v => '+' + v],
  ['pickup', 'Alcance de coleta', v => Math.round(v)],
  ['luck', 'Sorte', v => '+' + pct(v)],
  ['lifesteal', 'Roubo de vida', pct],
  ['thorns', 'Espinhos', pct],
  ['coinMult', 'Moedas', v => '×' + n2(v)],
  ['xpMult', 'Experiência', v => '×' + n2(v)],
  ['options', 'Cartas por nível', v => v],
  ['eliteMult', 'Dano em elites e chefes', v => '×' + n2(v)],
  ['stunMult', 'Duração do atordoamento', v => '×' + n2(v)],
  ['stunnedAdd', 'Dano em atordoados (soma)', v => '+' + pct(v)],
  ['stunnedMult', 'Dano em atordoados', v => '×' + n2(v)],
];
const TAG_ROWS = [['tagAdd', 'Dano de %', v => '+' + pct(v), 0], ['tagMult', 'Mult. de %', v => '×' + n2(v), 1],
  ['tagAtk', 'Vel. de ataque de %', v => '+' + pct(v), 0], ['tagArea', 'Área de %', v => '+' + pct(v), 0]];

// cópia "de mentira" do mundo com a carta aplicada, só para comparar números
function previewWorld(w, card) {
  const fw = Object.create(w);
  fw.player = null;
  fw.dons = [...w.dons]; fw.encantos = [...w.encantos];
  fw.donF = w.dons.map((_, i) => (w.donF && w.donF[i]) || 1);
  fw.golpes = w.golpes.map(g => ({ ...g }));
  if (card.kind === 'don') { fw.dons.push(card.id); fw.donF.push(card.f || 1); }
  else if (card.kind === 'encanto') { if (!fw.encantos.includes(card.id)) fw.encantos.push(card.id); }
  else if (card.kind === 'golpe') {
    const g = fw.golpes.find(x => x.id === card.id);
    if (g) g.level = card.level; else fw.golpes.push({ id: card.id, level: 1, t: 0, state: {} });
  }
  computeStats(fw);      // sem jogador: não mexe na vida de verdade
  fw.player = w.player;  // depois, as contas de recarga podem consultar o jogador
  return fw;
}

function statDiffHTML(w, fw) {
  const a = w.stats, b = fw.stats, rows = [];
  const row = (label, va, vb, f) => rows.push(`<tr><td>${esc(label)}</td><td>${esc(f(va))}</td><td>→</td><td class="up">${esc(f(vb))}</td></tr>`);
  for (const [k, label, f] of STAT_ROWS) if (Math.abs((b[k] || 0) - (a[k] || 0)) > 1e-6) row(label, a[k] || 0, b[k] || 0, f);
  for (const [k, label, f, def] of TAG_ROWS) for (const t in TAGS) {
    const va = a[k][t] ?? def, vb = b[k][t] ?? def;
    if (Math.abs(vb - va) > 1e-6) row(label.replace('%', TAGS[t].name), va, vb, f);
  }
  let html = rows.length ? `<table class="tip-diff">${rows.join('')}</table>` : '';
  for (const t in TAGS) {
    const ta = w.tagTiers[t] || 0, tb = fw.tagTiers[t] || 0;
    for (let i = ta; i < tb; i++) html += `<div class="tip-syn" style="--accent:${TAGS[t].color}">★ Ativa ${esc(TAGS[t].name)} (${TAG_TIERS[i]}): ${esc(TAGS[t].bonus[i])}</div>`;
  }
  return html;
}

function tagLadderHTML(w, tag) {
  if (!tag || !TAGS[tag]) return '';
  const t = TAGS[tag], n = w && w.tagCounts ? (w.tagCounts[tag] || 0) : 0;
  return `<div class="tip-ladder" style="--accent:${t.color}"><b>Sinergia ${esc(t.name)}</b> (você tem ${n})
    <ul>${t.bonus.map((b, i) => `<li class="${n >= TAG_TIERS[i] ? 'on' : ''}">${TAG_TIERS[i]}: ${esc(b)}</li>`).join('')}</ul></div>`;
}

function golpeTableHTML(id, hl, owned) {
  const d = GOLPES[id];
  const rows = d.dmg.map((dm, i) => {
    const lv = i + 1, cd = d.cd ? d.cd[i] : null;
    return `<tr class="${lv === hl ? 'hl' : ''} ${owned && lv <= owned ? 'own' : ''}"><td>Nv ${lv}</td><td>${dm}</td><td>${cd != null ? n2(cd) + 's' : '—'}</td><td>${esc(lv === 1 ? 'golpe novo' : (d.notes[i] || '+dano'))}</td></tr>`;
  }).join('');
  return `<table class="tip-golpe"><tr><th></th><th>Dano</th><th>Recarga</th><th>O que muda</th></tr>${rows}</table>`;
}

function golpeNowHTML(w, id, level) {
  if (!w || !w.stats) return '';
  const fw = previewWorld(w, { kind: 'golpe', id, level });
  const info = golpeDpsInfo(fw, { id, level });
  const s = fw.stats;
  const crit = info.hit * s.critMult;
  return `<div class="tip-now">Com a sua build: <b>~${fmt(info.hit)}</b> de dano por acerto${info.cd ? `, a cada <b>${n2(info.cd)}s</b>` : ''}
    <br><small>Crítico: ${pct(Math.min(1, s.critChance + (GOLPES[id].extraCrit || 0)))} de chance, ~${fmt(crit)} · conta: base × ${n2(info.add)} (bônus somados) × ${n2(info.mult)} (multiplicadores)</small></div>`;
}

// dica completa de uma carta oferecida (nível, baú ou Feira)
function cardTipHTML(w, card) {
  const info = cardInfo(card);
  const tag = info.tag ? TAGS[info.tag] : null;
  let body = '';
  if (card.kind === 'golpe') {
    const d = GOLPES[card.id];
    const own = w ? w.golpes.find(g => g.id === card.id) : null;
    body += `<p>${esc(d.desc)}</p>`;
    body += golpeTableHTML(card.id, card.level, own ? own.level : 0);
    body += golpeNowHTML(w, card.id, card.level);
    if (card.level === 5) body += `<div class="tip-note">No nível 5, este golpe conta como 2 cartas para a sinergia de ${esc(tag ? tag.name : '')}.</div>`;
  } else {
    body += `<p>${esc(info.desc)}</p>`;
    if (card.kind === 'don') {
      const base = info.baseRarity, from = RARITY_ORDER.indexOf(base);
      const ladder = RARITY_ORDER.slice(from).map(r => {
        const f = RARITY_POWER[r] / RARITY_POWER[base];
        const txt = f === 1 ? info.baseDesc : (donScaledText(DON_BY_ID[card.id], f).text || info.baseDesc);
        return `<tr class="${r === info.rarity ? 'hl' : ''}"><td style="color:${RARITY[r].color}">${RARITY[r].name}</td><td>${esc(txt)}</td></tr>`;
      }).join('');
      body += `<h4>Versões desta carta</h4><table class="tip-golpe">${ladder}</table>`;
      if (info.f > 1) body += `<div class="tip-note">Esta é uma versão ${esc(RARITY[info.rarity].name)}: os números valem ${n2(info.f)}× a versão ${esc(RARITY[base].name)}.</div>`;
    }
    if (card.kind === 'don' && DON_BY_ID[card.id].unique) body += `<div class="tip-note">Carta única: só dá para pegar uma vez.</div>`;
  }
  if (w && w.stats) {
    const diff = statDiffHTML(w, previewWorld(w, card));
    body += diff ? `<h4>Se você pegar:</h4>${diff}` : (card.kind === 'golpe' ? '' : `<div class="tip-note">Efeito especial: não muda os números da tabela de atributos.</div>`);
  }
  body += tagLadderHTML(w, info.tag);
  return `<div class="tip-head" style="--accent:${tag ? tag.color : '#f2c14e'}"><b>${esc(info.name)}</b><span>${esc(info.type)}${tag ? ' · ' + esc(tag.name) : ''}</span></div>${body}`;
}

// dicas da tela de pausa / resumo (o que você já tem)
function ownedGolpeTipHTML(w, g) {
  const d = GOLPES[g.id], tag = d.tag ? TAGS[d.tag] : null;
  return `<div class="tip-head" style="--accent:${tag ? tag.color : '#f2c14e'}"><b>${esc(d.name)}</b><span>${g.hidden ? 'Encanto' : 'Nível ' + g.level}${tag ? ' · ' + esc(tag.name) : ''}</span></div>
    <p>${esc(d.desc)}</p>${d.dmg.length > 1 && !g.hidden ? golpeTableHTML(g.id, g.level, g.level) : ''}${golpeNowHTML(w, g.id, g.level)}
    ${w.dmgBySrc && w.dmgBySrc[g.id] ? `<div class="tip-note">Dano causado nesta corrida: ${fmt(w.dmgBySrc[g.id])}</div>` : ''}`;
}
function simpleTipHTML(name, type, desc, color) {
  return `<div class="tip-head" style="--accent:${color || '#f2c14e'}"><b>${esc(name)}</b><span>${esc(type)}</span></div><p>${esc(desc)}</p>`;
}
