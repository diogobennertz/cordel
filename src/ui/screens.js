'use strict';
// ===== Telas (DOM): menu, classes, cartas, baú, Feira, pausa, fim de jogo =====

const UI = { el: null, shown: '', onAction: null };
// títulos nas letras entalhadas: XT = tinta sobre papel; XC = claro, para ficar por cima do jogo
const XT = { cor: '#1a130e', sombra: '#c5361d' }, XC = { cor: '#f2e4c4', contorno: '#1a130e', sombra: '#c5361d' };
const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function initUI(el, onAction) {
  UI.el = el; UI.onAction = onAction;
  el.addEventListener('click', ev => {
    const b = ev.target.closest('[data-act]');
    if (!b || b.classList.contains('disabled')) return;
    Som.play('click');
    onAction(b.dataset.act, b.dataset.arg);
  });
}
function showOverlay(name, html, cls = '') {
  hideTip();
  UI.shown = name;
  UI.el.className = 'overlay ' + cls + ' t-' + name;
  UI.el.innerHTML = html;
  UI.el.hidden = false;
}
function hideOverlay() { hideTip(); UI.shown = ''; UI.el.hidden = true; UI.el.innerHTML = ''; }

// ---------- carta (estilo folheto de cordel) ----------
function cardHTML(w, card, i, extra = {}) {
  const info = cardInfo(card);
  const tag = info.tag ? TAGS[info.tag] : null;
  const accent = tag ? tag.color : (card.kind === 'encanto' ? '#f2c14e' : card.kind === 'ativo' ? '#7ab8ff' : '#c9b3ff');
  const rar = card.kind === 'encanto' ? { name: 'Encanto', color: '#f2c14e' } : card.kind === 'ativo' ? { name: 'Item ativo', color: '#7ab8ff' } : RARITY[info.rarity];
  let syn = '';
  if (tag && w) {
    const n = w.tagCounts[info.tag] || 0, add = card.kind === 'golpe' && card.level === 4 ? 2 : (card.kind === 'golpe' && card.level > 1 ? 0 : 1);
    const next = TAG_TIERS.find(x => x > n);
    if (add > 0 && next && n + add >= next) syn = `<div class="card-syn">Ativa: ${esc(tag.bonus[TAG_TIERS.indexOf(next)])}</div>`;
    else if (next) syn = `<div class="card-syn dim">${esc(tag.name)} ${n}${add ? '→' + (n + add) : ''} / ${next}</div>`;
  }
  const owned = card.kind === 'don' && w ? w.dons.filter(x => x === card.id).length : 0;
  const lvl = card.kind === 'golpe' ? `<div class="card-pips">${[1, 2, 3, 4, 5].map(k => `<i class="${k <= card.level ? 'on' : ''}"></i>`).join('')}</div>` : '';
  let tipHtml = '';
  try { tipHtml = cardTipHTML(w, card); } catch (err) { console.error('dica da carta falhou', err); }
  const tip = tipAttr(tipHtml);
  return `<div class="card rar-${info.rarity} ${extra.cls || ''}" data-act="${extra.act || 'card'}" data-arg="${i}"${tip} style="--accent:${accent};--rar:${rar.color}">
    <div class="card-head"><span class="card-type">${esc(info.type)}</span>${tag ? `<span class="card-tag">${esc(tag.name)}</span>` : ''}</div>
    ${info.art ? `<div class="card-art"><img src="${cardArtURL(info.art, accent)}" alt=""></div>` : `<div class="card-art"><img src="${cardArtURL('arretado', accent)}" alt=""></div>`}
    <div class="card-name">${esc(info.name)}</div>
    ${lvl}
    <div class="card-desc">${esc(info.desc)}</div>
    ${syn}
    ${owned ? `<div class="card-owned">você tem ×${owned}</div>` : ''}
    ${extra.price != null ? `<div class="card-price ${extra.cant ? 'cant' : ''}">R$ ${extra.price}</div>` : ''}
    ${extra.key ? `<kbd class="card-key">${extra.key}</kbd>` : ''}
  </div>`;
}

// ---------- menu ----------
function showMenu() {
  const prog = loadMapas();
  const melhor = Math.max(0, ...Object.values(prog.best || {}));
  showOverlay('menu', `
    <div class="menu">
      <div class="logo">
        <img class="logo-img" src="${logoURL()}" alt="Encantados — Lendas do Brasil">
        <div class="logo-sub">um roguelike de cartas do folclore brasileiro</div>
      </div>
      <div class="menu-btns">
        <button class="btn big" data-act="classSelect">Jogar</button>
        <button class="btn" data-act="treino">Treino <small>(${loadMeta().patacas} pila)</small></button>
        <button class="btn ${tutDone() ? '' : 'novo'}" data-act="tutorial">Tutorial <small>(a história e como jogar)</small></button>
        <button class="btn" data-act="howto">Como jogar <small>(resumo)</small></button>
      </div>
      ${melhor > 0 ? `<div class="menu-rec">Maior sobrevida: ${mmss(melhor)}</div>` : ''}
      <div class="menu-foot">Saci · Curupira · Mula sem Cabeça · Iara · Lobisomem · Cuca · Boto · Mapinguari · Pisadeira · Boitatá</div>
    </div>`, 'dark');
}
function recordText(k) {
  const c = Math.floor((k - 1) / NUM_PHASES) + 1, f = ((k - 1) % NUM_PHASES) + 1;
  return c > 1 ? `Ciclo ${c}, Fase ${f}` : `Fase ${f}`;
}
function loadRecords() { try { return JSON.parse(localStorage.getItem('mata-recordes') || '{}'); } catch (e) { return {}; } }
function saveRecord(classId, k) {
  const r = loadRecords();
  if (!r[classId] || k > r[classId]) { r[classId] = k; try { localStorage.setItem('mata-recordes', JSON.stringify(r)); } catch (e) { /* sem armazenamento */ } return true; }
  return false;
}

function showHowTo() {
  showOverlay('howto', `
    <div class="panel paper howto">
      <h2>${xiloImg('Como jogar', 40, XT)}</h2>
      <div class="cols">
        <div>
          <h3>Controles</h3>
          <p><kbd>WASD</kbd> ou <kbd>setas</kbd> — andar (os golpes são automáticos)</p>
          <p><kbd>Espaço</kbd> — esquiva rápida (fica invencível por um instante)</p>
          <p><kbd>Q</kbd> ou botão direito — <b>especial</b> do personagem (ataque em área)</p>
          <p><kbd>R</kbd> — <b>ultimate</b>: o golpe mais forte do personagem, recarga de 50s</p>
          <p><kbd>E</kbd> — usar o <b>item ativo</b> (vem no baú do chefe ou na Feira)</p>
          <p><kbd>Esc</kbd> ou <kbd>P</kbd> — pausa e ver sua build</p>
          <p><kbd>1</kbd>–<kbd>5</kbd> escolher carta · <kbd>R</kbd> rerrolar</p>
          <p><kbd>M</kbd> silenciar · <kbd>N</kbd> música liga/desliga</p>
          <p>Controle de videogame também funciona.</p>
        </div>
        <div>
          <h3>A corrida</h3>
          <p>São <b>10 fases</b>. Sobreviva às ondas até o <b>chefe</b> aparecer e derrote-o.</p>
          <p>Junte <b>vaga-lumes</b> (XP) para subir de nível e escolher <b>cartas</b>.</p>
          <p>Depois de cada chefe tem um <b>baú</b> e a <b>Feira</b>, onde você gasta seus R$. Guardar dinheiro rende juros!</p>
          <p>Zerou? Continue no <b>Ciclo 2, 3...</b> — infinito e cada vez mais difícil.</p>
          <p>Caiu? Você ganha <b>pila</b> e gasta no <b>Treino</b>: melhorias que valem para sempre. No começo o primeiro chefe é quase impossível — é treinando que você alcança ele.</p>
        </div>
        <div>
          <h3>Builds</h3>
          ${Object.values(TAGS).map(t => `<p><b style="color:${t.color}">${t.name}</b> — ${t.style}. Junte 2, 4 e 6 cartas para ativar bônus.</p>`).join('')}
          <p>Dano = base × (1 + bônus somados) × multiplicadores × crítico.</p>
        </div>
      </div>
      <button class="btn" data-act="menu">Voltar</button>
    </div>`, 'dark');
}

// ---------- escolha de classe ----------
function spritePreview(key) {
  const s = SPRITES[key];
  return s ? s.c.toDataURL() : '';
}
function showClassSelect() {
  const rec = loadRecords();
  showOverlay('classSelect', `
    <div class="classes">
      <h2>${xiloImg('Escolha seu personagem', 38, XT)}</h2>
      <div class="class-row">
        ${Object.entries(CLASSES).map(([id, c], i) => {
          const tag = TAGS[c.tag], g = GOLPES[c.golpe];
          return `<div class="class-card" data-act="pickMap" data-arg="${id}" style="--accent:${c.color}">
            <kbd class="card-key">${i + 1}</kbd>
            <div class="class-sprite"><img src="${spritePreview(id)}" alt=""></div>
            <div class="class-name">${esc(c.name)}</div>
            <div class="class-tag" style="background:${tag.color}">${esc(tag.name)} · ${esc(tag.style)}</div>
            <div class="class-desc">${esc(c.desc)}</div>
            <div class="class-stats">Vida ${c.base.maxHp} · Velocidade ${c.base.speed}${c.base.dodge ? ` · Esquiva ${pct(c.base.dodge)}` : ''}${c.base.armor ? ` · Defesa ${pct(c.base.armor)}` : ''}${c.base.regen ? ` · Regenera ${c.base.regen}/s` : ''}${c.base.critChance ? ` · Crítico ${pct(c.base.critChance)}` : ''}</div>
            <div class="class-golpe"><img src="${cardArtURL(g.art, tag.color)}" alt=""><span>Começa com <b>${esc(g.name)}</b></span></div>
            <div class="class-special">★ <b>${esc(c.perk.name)}</b>: ${esc(c.perk.desc)}</div>
            <div class="class-special"><kbd>R</kbd> <b>${esc(c.ult.name)}</b>: ${esc(c.ult.desc)}</div>
            <div class="class-special"><kbd>Q</kbd> <b>${esc(c.special.name)}</b>: ${esc(c.special.desc)}</div>

          </div>`;
        }).join('')}
      </div>
      <button class="btn" data-act="menu">Voltar</button>
    </div>`, 'dark');
}

// ---------- subir de nível ----------
function showLevelUp(w) {
  const offer = w.offer || [];
  showOverlay('levelup', `
    <div class="pick">
      <h2>${xiloImg('Nível ' + w.level + '!', 50, XC)}</h2>
      <div class="pick-sub">Escolha uma carta${w.pendingLevels > 1 ? ` · mais ${w.pendingLevels - 1} na fila` : ''}</div>
      <div class="cards">${offer.map((c, i) => cardHTML(w, c, i, { key: i + 1 })).join('')}</div>
      <div class="pick-btns">
        <button class="btn ${w.rerolls > 0 ? '' : 'disabled'}" data-act="reroll"><kbd>R</kbd> Rerrolar (${w.rerolls})</button>
        <button class="btn ghost" data-act="skip"><kbd>X</kbd> Pular (+R$ ${3 + Math.max(0, w.phaseIdx)})</button>
      </div>
    </div>`);
}

function showChest(w) {
  const offer = w.chest || [];
  showOverlay('chest', `
    <div class="pick">
      <h2>${xiloImg('Baú do chefe', 46, XC)}</h2>
      <div class="pick-sub">Leve um tesouro</div>
      <div class="cards">${offer.map((c, i) => cardHTML(w, c, i, { key: i + 1, act: 'chest' })).join('')}</div>
      <div class="pick-btns"><button class="btn ghost" data-act="chestSkip">Não levar nada</button></div>
    </div>`);
}

// ---------- Feira ----------
function showShop(w) {
  const sh = w.shop;
  if (!sh) return;
  const fullEnc = w.encantos.length >= MAX_ENCANTOS;
  const cards = sh.cards.map((c, i) => c.sold
    ? `<div class="card sold"><div class="sold-label">VENDIDO</div></div>`
    : cardHTML(w, c, i, { act: 'buyCard', price: c.price, cant: w.coins < c.price, cls: w.coins < c.price ? 'poor' : '' })).join('');
  const encs = sh.encantos.map((c, i) => c.sold
    ? `<div class="card sold"><div class="sold-label">VENDIDO</div></div>`
    : cardHTML(w, c, i, { act: 'buyEnc', price: c.price, cant: w.coins < c.price || fullEnc, cls: (w.coins < c.price || fullEnc) ? 'poor' : '' })).join('');
  const inc = w.lastIncome || { bonus: 0, juros: 0 };
  showOverlay('shop', `
    <div class="shop">
      <div class="shop-head">
        <div><h2>${xiloImg('A Feira', 50, XT)}</h2><div class="pick-sub">"Olha a pamonha, olha o patuá!" — compre, ou guarde para render juros.</div></div>
        <div class="shop-money">R$ ${w.coins}<small>${inc.bonus ? `+${inc.bonus} + ${inc.juros} de juros · ` : ""}a banca renova a cada etapa</small></div>
      </div>
      <h3>Cartas</h3>
      <div class="cards small">${cards}</div>
      <h3>Encantos ${fullEnc ? '(cheio: 6/6)' : `(${w.encantos.length}/${MAX_ENCANTOS})`}</h3>
      <div class="cards small">${encs}
        <div class="card heal ${sh.heal.sold || w.coins < sh.heal.price || w.player.hp >= w.stats.maxHp ? 'poor' : ''}" data-act="buyHeal" style="--accent:#d9822b;--rar:#d9822b">
          <div class="card-head"><span class="card-type">Comida</span></div>
          <div class="card-art"><img src="${cardArtURL('coxinha', '#d9772b')}" alt=""></div>
          <div class="card-name">Coxinha com Caldo de Cana</div>
          <div class="card-desc">${sh.heal.sold ? 'Já comeu!' : `Cura 50% da vida (agora ${Math.ceil(w.player.hp)}/${w.stats.maxHp})`}</div>
          ${sh.heal.sold ? '' : `<div class="card-price">R$ ${sh.heal.price}</div>`}
        </div>
      </div>
      <h3>Item ativo (tecla E) — ${w.ativo ? `você tem: ${esc(ATIVO_BY_ID[w.ativo.id].name)} (comprar troca)` : 'você não tem nenhum'}</h3>
      <div class="cards small">${sh.ativo ? (sh.ativo.sold ? `<div class="card sold"><div class="sold-label">VENDIDO</div></div>`
        : cardHTML(w, sh.ativo, 0, { act: 'buyAtivo', price: sh.ativo.price, cant: w.coins < sh.ativo.price, cls: w.coins < sh.ativo.price ? 'poor' : '' })) : ''}</div>
      <div class="pick-btns">
        <button class="btn ${w.coins >= sh.rerollCost ? '' : 'disabled'}" data-act="shopReroll"><kbd>R</kbd> Renovar a banca (R$ ${sh.rerollCost})</button>
        <button class="btn big" data-act="leaveShop">Voltar para a mata →</button>
      </div>
      ${buildSummary(w, true)}
    </div>`, 'dark');
}

// ---------- resumo da build ----------
function buildSummary(w, compact) {
  const golpes = w.golpes.map(g => {
    const d = GOLPES[g.id], t = d.tag ? TAGS[d.tag] : null;
    const info = golpeDpsInfo(w, g);
    return `<div class="sum-golpe"${tipAttr(ownedGolpeTipHTML(w, g))} style="--accent:${t ? t.color : '#f2c14e'}"><img src="${cardArtURL(d.art, t ? t.color : '#f2c14e')}"><div><b>${esc(d.name)}</b> ${g.hidden ? '' : `Nv ${g.level}`}<br><small>~${fmt(info.hit)} por acerto${info.cd ? ` · a cada ${info.cd.toFixed(2)}s` : ''}</small></div></div>`;
  }).join('');
  const syn = Object.entries(TAGS).map(([k, t]) => {
    const n = w.tagCounts[k] || 0, tier = w.tagTiers[k];
    return `<div class="sum-syn ${tier ? 'on' : ''}" style="--accent:${t.color}"><b>${t.name}</b> <span>${n}</span>
      <ul>${t.bonus.map((b, i) => `<li class="${i < tier ? 'on' : ''}">${TAG_TIERS[i]}: ${esc(b)}</li>`).join('')}</ul></div>`;
  }).join('');
  const enc = w.encantos.length ? w.encantos.map(id => `<span class="chip"${tipAttr(simpleTipHTML(ENCANTO_BY_ID[id].name, 'Encanto', ENCANTO_BY_ID[id].desc))}>${esc(ENCANTO_BY_ID[id].name)}</span>`).join('') : '<span class="dim">nenhum</span>';
  const dons = {};
  w.dons.forEach((id, i) => { const k = id + '|' + ((w.donR && w.donR[i]) || DON_BY_ID[id].rarity) + '|' + ((w.donF && w.donF[i]) || 1); dons[k] = (dons[k] || 0) + 1; });
  const donList = Object.entries(dons).map(([k, n]) => { const [id, r, f] = k.split('|'); const ci = cardInfo({ kind: 'don', id, rarity: r, f: +f });
    return `<span class="chip" style="border-color:${RARITY[r].color}"${tipAttr(simpleTipHTML(ci.name, RARITY[r].name + (n > 1 ? ' · você tem ×' + n : ''), ci.desc, RARITY[r].color))}>${esc(ci.name)}${+f > 1 ? ' ★' : ''}${n > 1 ? ' ×' + n : ''}</span>`; }).join('') || '<span class="dim">nenhuma</span>';
  const sp = CLASSES[w.classId].special;
  const spChip = `<span class="chip"${tipAttr(simpleTipHTML(sp.name, `Especial · tecla Q · recarga ${w.specialCd().toFixed(1)}s`, sp.desc))}>Q · ${esc(sp.name)}</span>`;
  const pk = CLASSES[w.classId].perk;
  const pkChip = `<span class="chip"${tipAttr(simpleTipHTML(pk.name, 'Vantagem do personagem', pk.desc))}>★ ${esc(pk.name)}${w.classId === 'jiujitsu' ? ' · ' + BELTS[beltIndex(w.level)].name : ''}</span>`;
  const ul = CLASSES[w.classId].ult;
  const ulChip = `<span class="chip" style="border-color:#ff5fa2"${tipAttr(simpleTipHTML(ul.name, `Ultimate · tecla R · recarga ${ul.cd}s`, ul.desc, '#ff5fa2'))}>R · ${esc(ul.name)}</span>`;
  const at = w.ativo ? ATIVO_BY_ID[w.ativo.id] : null;
  const atChip = at ? `<span class="chip"${tipAttr(simpleTipHTML(at.name, `Item ativo · tecla E · recarga ${at.cd}s`, at.desc, '#7ab8ff'))}>E · ${esc(at.name)}</span>` : '<span class="dim">E · nenhum item ativo</span>';
  if (compact) return `<div class="summary compact"><div class="sum-golpes">${golpes}</div><div class="sum-chips"><b>Especial e item:</b> ${pkChip} ${spChip} ${ulChip} ${atChip}</div><div class="sum-chips"><b>Itens passivos (encantos):</b> ${enc}</div></div>`;
  return `<div class="summary"><h3>Golpes</h3><div class="sum-golpes">${golpes}</div><h3>Vantagem, especial e item ativo</h3><div class="sum-chips">${pkChip} ${spChip} ${ulChip} ${atChip}</div><h3>Sinergias</h3><div class="sum-syns">${syn}</div>
    <h3>Itens passivos (encantos)</h3><div class="sum-chips">${enc}</div><h3>Cartas</h3><div class="sum-chips">${donList}</div></div>`;
}

function statsTable(w) {
  const s = w.stats;
  const add = 1 + s.dmgAdd;
  const rows = [
    ['Vida', `${fmt(Math.ceil(w.player.hp))} / ${fmt(s.maxHp)}`], ['Regeneração', `${s.regen.toFixed(1)}/s`],
    ['Redução de dano', pct(s.armor)], ['Esquiva', pct(s.dodge)], ['Corpo fechado', pct(s.nullify)],
    ['Velocidade', Math.round(s.speed)], ['Bônus de dano (soma)', `+${pct(add - 1)}`], ['Multiplicador de dano', `×${fmt(s.dmgMult)}`],
    ['Chance de crítico', pct(s.critChance)], ['Dano crítico', `×${s.critMult.toFixed(2)}`],
    ['Velocidade de ataque', `×${s.atkSpeed.toFixed(2)}`], ['Área', `×${s.area.toFixed(2)}`], ['Projéteis extras', `+${s.projectiles}`],
    ['Duração', `×${s.duration.toFixed(2)}`], ['Roubo de vida', pct(s.lifesteal)], ['Espinhos', pct(s.thorns)], ['Sorte', `+${pct(s.luck)}`],
  ];
  for (const t in s.tagAdd) if (s.tagAdd[t]) rows.push([`Dano de ${TAGS[t].name}`, `+${pct(s.tagAdd[t])}`]);
  for (const t in s.tagMult) if (s.tagMult[t] !== 1) rows.push([`Mult. de ${TAGS[t].name}`, `×${fmt(s.tagMult[t])}`]);
  return `<table class="stats">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`;
}

function damageTable(w) {
  const total = w.totalDamage || 1;
  const names = { ultimate: 'Ultimate (R)', especial: 'Especial (Q)', fogos: 'Fogos de São João', rede: 'Rede de Pesca', pandeiro: 'Pandeiro', finalizacao: 'Finalização', pimenta: 'Pimenta (queimadura)', tatame: 'Tatame (espinhos)', guarda: 'Guarda Fechada (barreira)', au: 'Meia-lua da esquiva', fatuoOnKill: 'Fogo-fátuo de abate' };
  const rows = Object.entries(w.dmgBySrc).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return `<table class="stats">${rows.map(([k, v]) => `<tr><td>${esc(GOLPES[k] ? GOLPES[k].name : (names[k] || k))}</td><td>${fmt(v)} <small>(${Math.round(v / total * 100)}%)</small></td></tr>`).join('')}</table>`;
}

function showPause(w) {
  showOverlay('pause', `
    <div class="panel pause">
      <div class="pause-head"><h2>${xiloImg('Pausa', 44, XT)}</h2>
        <div><button class="btn big" data-act="resume">Continuar <kbd>Esc</kbd></button>
        <button class="btn ghost" data-act="quit">Desistir da corrida</button></div></div>
      <div class="pause-cols">
        <div><h3>Atributos</h3>${statsTable(w)}<h3>Dano causado</h3>${damageTable(w)}</div>
        <div>${buildSummary(w, false)}</div>
      </div>
      <div class="pause-foot">Som: <b>${Som.muted ? 'mudo' : 'ligado'}</b> (M) · Música: <b>${Som.musicOn ? 'ligada' : 'desligada'}</b> (N)</div>
    </div>`, 'dark');
}

function runStats(w) {
  return `<div class="end-stats">
    <div><b>${mmss(w.time)}</b><small>sobreviveu</small></div>
    <div><b>${w.mapa.name}</b><small>mapa · etapa ${w.etapa + 1}</small></div>
    <div><b>${w.phasesCleared}</b><small>chefes</small></div>
    <div><b>${w.level}</b><small>nível</small></div>
    <div><b>${w.runKills}</b><small>criaturas</small></div>
  </div>${UI.newRecord ? '<div class="new-rec">★ Novo recorde de sobrevida! ★</div>' : ''}
  <div class="earned">+${UI.earned || 0} pila <small>(você tem ${UI.patacas || 0} — gaste no Treino para ficar mais forte)</small></div>`;
}

function showGameOver(w) {
  showOverlay('dead', `
    <div class="panel paper end">
      <h2 class="bad">${xiloImg('Você caiu na mata', 38, { cor: '#c5361d', sombra: '#1a130e' })}</h2>
      <div class="pick-sub">Derrubado por ${esc(w.deathCause || 'a mata')}.</div>
      ${runStats(w)}
      <div class="pause-cols"><div><h3>Dano por golpe</h3>${damageTable(w)}</div><div>${buildSummary(w, true)}</div></div>
      <div class="pick-btns">
        <button class="btn big" data-act="again">Tentar de novo</button>
        <button class="btn" data-act="pickMap" data-arg="${w.classId}">Trocar mapa</button>
        <button class="btn" data-act="treino">Treino</button>
        <button class="btn ghost" data-act="menu">Menu</button>
      </div>
    </div>`, 'dark');
}

// ---------- seleção de mapa + número de jogadores (dificuldade) ----------
function loadMapas() {
  try { const m = JSON.parse(localStorage.getItem('mata-mapas') || '{}'); return { unlocked: Math.max(1, m.unlocked | 0), best: m.best && typeof m.best === 'object' ? m.best : {} }; }
  catch (e) { return { unlocked: 1, best: {} }; }
}
function saveMapas(m) { try { localStorage.setItem('mata-mapas', JSON.stringify(m)); } catch (e) { /* sem armazenamento */ } }

function showMapSelect(classId) {
  Game.pickClass = classId;
  if (!Game.players) Game.players = 1;
  const prog = loadMapas(), c = CLASSES[classId];
  const cards = MAPAS.map((m, i) => {
    const aberto = i < prog.unlocked, best = prog.best[m.id] || 0;
    return `<div class="map-card ${aberto ? '' : 'locked'}" ${aberto ? `data-act="startMap" data-arg="${i}"` : ''} style="--accent:${['#2f6d43', '#f0b429', '#8a5aa8', '#3aa39b', '#2f6d43', '#c5361d'][i]}">
      <kbd class="card-key">${i + 1}</kbd>
      <div class="map-art" style="background:var(--accent)"></div>
      <div class="map-name">${esc(m.name)}</div>
      <div class="map-desc">${aberto ? esc(m.desc) : 'Vença os chefes do mapa anterior para abrir.'}</div>
      <div class="map-foot">${aberto ? (best > 0 ? 'Recorde: ' + mmss(best) : 'Ainda não jogado') : '🔒 trancado'} · ${m.chefes} chefe${m.chefes > 1 ? 's' : ''}</div>
    </div>`;
  }).join('');
  const nums = [1, 2, 3, 4, 5].map(n => `<button class="pbtn ${Game.players === n ? 'on' : ''}" data-act="setPlayers" data-arg="${n}">${n}</button>`).join('');
  showOverlay('mapSelect', `
    <div class="classes mapsel">
      <h2>${xiloImg('Escolha o mapa', 38, XT)}</h2>
      <div class="pick-sub">Jogando de <b>${esc(c.name)}</b>. Cada mapa é infinito: sobreviva o máximo que puder, bata os chefes e abra o próximo.</div>
      <div class="players"><span>Jogadores (dificuldade):</span> ${nums} <small>mais gente, mais apertado — e no coop cada um entra na Steam (em breve).</small></div>
      <div class="map-row">${cards}</div>
      <div class="pick-btns"><button class="btn ghost" data-act="classSelect">Trocar personagem</button></div>
    </div>`, 'dark');
}

// ---------- Treino: evolução permanente ----------
function showTreino() {
  const m = loadMeta();
  const rows = META_UPS.map(u => {
    const lv = m.ups[u.id] || 0, full = lv >= u.max, cost = full ? 0 : u.cost(lv), can = !full && m.patacas >= cost;
    return `<div class="meta-row ${full ? 'full' : ''}">
      <div class="meta-icon"><img src="${cardArtURL(u.art, '#f0b429')}" alt=""></div>
      <div class="meta-info"><b>${esc(u.name)}</b> <span class="meta-lv">${lv}/${u.max}</span>
        <div class="meta-pips">${Array.from({ length: u.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div>
        <small>${esc(u.desc)}</small></div>
      <button class="btn ${can ? '' : 'disabled'}" data-act="buyMeta" data-arg="${u.id}">${full ? 'Completo' : `${cost} pila`}</button>
    </div>`;
  }).join('');
  showOverlay('treino', `
    <div class="panel treino">
      <div class="pause-head"><div><h2>${xiloImg('Treino', 46, XT)}</h2>
        <div class="pick-sub">Melhorias que valem para sempre, em todas as corridas e com todos os personagens. Cada corrida rende pila — quanto mais longe, mais.</div></div>
        <div class="shop-money">${m.patacas}<small>pila</small></div></div>
      <div class="meta-grid">${rows}</div>
      <div class="pick-btns"><button class="btn big" data-act="classSelect">Jogar</button><button class="btn ghost" data-act="menu">Voltar</button></div>
    </div>`, 'dark');
}

// ---------- apresentação de criatura nova ----------
function showIntro(e) {
  const info = BESTIARIO[e.type] || { faz: '', dica: '' };
  showOverlay('intro', `
    <div class="intro-card ${e.boss ? 'boss' : ''}">
      <div class="intro-sprite"><img src="${spritePreview(e.sprite)}" alt=""></div>
      <div class="intro-text">
        <div class="intro-kind">${e.boss ? 'Chefe' : 'Criatura nova'}</div>
        <h2>${xiloImg(e.name, 28, XT)}</h2>
        <p>${esc(info.faz)}</p>
        <p class="intro-tip"><b>Dica:</b> ${esc(info.dica)}</p>
      </div>
      <button class="btn big" data-act="introOk">OK <kbd>Enter</kbd></button>
    </div>`, 'intro');
}
