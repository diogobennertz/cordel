extends CanvasLayer
class_name Menus
# Todas as telas do jogo no estilo folheto de cordel: capa (título), escolha do herói e da fase,
# melhorias, opções, pausa (ESC), cartas de subir de nível e fim da partida.

var w                         # o mundo
var raiz: Control
var tela := ""                # titulo | herois | melhorias | opcoes | pausa | nivel | fim | ""
var _volta: Callable          # para onde as opções voltam
var _aba := "som"
var _cartas: Array = []       # [carta, botão] da tela de nível, para as teclas 1, 2, 3
var _heroi_nv                 # herói que está subindo de nível
var _abriu := 0
var _capt := ""               # ação esperando uma tecla nova (opções > controles)               # quando a tela de nível abriu (evita clique sem querer)
var _so_tutorial := false     # true: foi pro "escolha de herói" só pra fazer o tutorial (não pra jogar a fase)
var _scr_herois: ScrollContainer   # só pra debug/teste
var _painel_dica: PanelContainer   # dica de como liberar o herói trancado (some ao passar o mouse)
var _lbl_dica: Label

func _init() -> void:
	layer = 10

var _rede_erro := ""
func _ready() -> void:
	raiz = Control.new(); raiz.set_anchors_preset(Control.PRESET_FULL_RECT)
	raiz.theme = Tela.tema(); raiz.visible = false
	add_child(raiz)
	Rede.entrou.connect(func(_id): if tela == "coop": coop())
	Rede.saiu.connect(func(_id): if tela == "coop": coop())
	Rede.falhou.connect(func(msg): _rede_erro = msg; coop())
	Rede.mundos_mudaram.connect(func(): if tela == "coop" and not Rede.ativo(): coop())

func _limpar(nome: String) -> void:
	for c in raiz.get_children(): c.queue_free()
	_cartas = []
	tela = nome
	raiz.visible = nome != ""
	if nome != "" and Ctrl.tem_controle(): _foco.call_deferred()

# com controle ligado, o primeiro botão da tela já fica escolhido (A confirma, direcional anda)
func _foco() -> void:
	var b := _primeiro(raiz)
	if b: b.grab_focus()

func _primeiro(n: Node) -> Button:
	for c in n.get_children():
		if c.is_queued_for_deletion(): continue
		if c is Button and not c.disabled:
			c.focus_mode = Control.FOCUS_ALL; return c
		var r := _primeiro(c)
		if r: return r
	return null

func fechar() -> void:
	_limpar("")

func _centro(sep: int = 10) -> VBoxContainer:
	var cc := CenterContainer.new(); cc.set_anchors_preset(Control.PRESET_FULL_RECT); raiz.add_child(cc)
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", sep); cc.add_child(vb)
	return vb

func _linha(pai: Control, sep: int = 14) -> HBoxContainer:
	var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", sep)
	hb.alignment = BoxContainer.ALIGNMENT_CENTER; pai.add_child(hb)
	return hb

func _moedas_tag() -> void:
	var p := PanelContainer.new()
	var s := Tela.caixa(Tela.IPE, 3, Tela.TINTA, 4); s.set_content_margin_all(8); s.content_margin_left = 16; s.content_margin_right = 16
	p.add_theme_stylebox_override("panel", s)
	p.add_child(Tela.rotulo("◉ %d moedas" % int(Salvo.d["moedas"]), 20, Tela.TINTA, HORIZONTAL_ALIGNMENT_CENTER, true))
	p.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	p.offset_left = -250; p.offset_right = -38; p.offset_top = 36; p.offset_bottom = 80
	p.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	raiz.add_child(p)

# ---------------- capa ----------------
func titulo() -> void:
	_limpar("titulo")
	Tela.fundo_papel(raiz)
	var vb := _centro(6)
	var logo := Tela.imagem("logo", Vector2(480, 257)); logo.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	vb.add_child(logo)
	var ac_opc := func(): opcoes(titulo)
	var ac_sair := func(): get_tree().quit()
	var ac_tut := func(): _so_tutorial = true; herois()
	var ac_jogar_menu := func(): _so_tutorial = false; herois()
	var itens := [
		["UM JOGADOR", ac_jogar_menu, Tela.URUCUM, 24, 340.0, 50.0],
		["MULTIJOGADOR (LAN)", coop, Tela.ANIL, 24, 340.0, 50.0],
		["MELHORIAS", melhorias, Tela.ANIL, 18, 340.0, 40.0],
		["FEITOS" + (" (%d)" % Dados.feitos_prontos() if Dados.feitos_prontos() > 0 else ""), feitos, Tela.BARRO, 18, 340.0, 40.0],
		["TUTORIAL", ac_tut, Tela.MATA, 16, 340.0, 36.0],
		["OPÇÕES", ac_opc, Tela.MATA, 16, 340.0, 36.0],
		["SAIR", ac_sair, Tela.PARDO, 16, 340.0, 36.0],
	]
	for it in itens:
		var b := Tela.botao(it[0], it[1], it[3], it[2], it[4], it[5]); b.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		vb.add_child(b)
	_moedas_tag()
	var rod := Tela.rotulo("Sobreviva 10 minutos, vença o chefe e aguente o quanto der.", 14, Tela.TINTA)
	rod.set_anchors_preset(Control.PRESET_BOTTOM_WIDE); rod.offset_top = -46; rod.offset_bottom = -26
	raiz.add_child(rod)

# ---------------- escolha do herói e da fase ----------------
func herois() -> void:
	if not Dados.heroi_desbloqueado(w.sel_heroi): w.sel_heroi = "capoeirista"   # nunca fica selecionado um herói trancado
	_limpar("herois")
	Tela.fundo_papel(raiz)
	var vb := _centro(8)
	vb.add_child(Tela.titulo("t_heroi", 46))
	if _so_tutorial: vb.add_child(Tela.rotulo("escolha quem vai fazer o tutorial", 16, Tela.URUCUM, HORIZONTAL_ALIGNMENT_CENTER, true))
	var corpo := _linha(vb, 16)
	# esquerda: grade dos heróis (rola quando tiver muitos — hoje são poucos, mas vão chegar a ~20)
	var scr := ScrollContainer.new(); scr.custom_minimum_size = Vector2(356, 424)
	scr.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; corpo.add_child(scr)
	_scr_herois = scr   # só pra debug/teste (rolar até os trancados num print)
	var gr := GridContainer.new(); gr.columns = 3
	gr.add_theme_constant_override("h_separation", 8); gr.add_theme_constant_override("v_separation", 8); scr.add_child(gr)
	for id in Dados.CLASSES: gr.add_child(_icone_heroi(id))
	# direita: ficha completa de quem está selecionado
	corpo.add_child(_carta_heroi(w.sel_heroi))
	# dica de como liberar herói trancado: espaço reservado sempre, só preenche ao passar o mouse
	_lbl_dica = Tela.rotulo("", 14, Tela.PAPEL, HORIZONTAL_ALIGNMENT_CENTER, true)
	_painel_dica = PanelContainer.new(); _painel_dica.custom_minimum_size = Vector2(0, 34)
	_painel_dica.add_theme_stylebox_override("panel", StyleBoxEmpty.new())
	_painel_dica.add_child(_lbl_dica); _painel_dica.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vb.add_child(_painel_dica)
	# fileira de fases: rola na horizontal, porque já são 15 e não cabem todas na tela de uma vez
	var scrf := ScrollContainer.new(); scrf.custom_minimum_size = Vector2(980, 100)
	scrf.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; vb.add_child(scrf)
	var hf := HBoxContainer.new(); hf.add_theme_constant_override("separation", 12); scrf.add_child(hf)
	var fmax: int = mini(int(Salvo.d["fase_max"]), Dados.FASES.size() - 1)
	w.sel_fase = clampi(w.sel_fase, 0, fmax)
	for i in range(Dados.FASES.size()): hf.add_child(_carta_fase(i, fmax))
	var hbt := _linha(vb, 16)
	hbt.add_child(Tela.botao("VOLTAR", titulo, 18, Tela.PARDO, 200.0, 50.0))
	var ac_jogar := func():
		if _so_tutorial:
			Salvo.d["tutorial"] = true; Salvo.salvar(); w.iniciar_jogo(w.sel_heroi, 0, true)
		elif bool(Salvo.d["tutorial"]): w.iniciar_jogo(w.sel_heroi, w.sel_fase, false)
		else: perguntar_tutorial()
	hbt.add_child(Tela.botao("FAZER O TUTORIAL" if _so_tutorial else "JOGAR", ac_jogar, 26, Tela.URUCUM, 360.0, 50.0))
	_moedas_tag()

# quadradinho clicável de cada herói na grade (a ficha grande fica à direita, só do escolhido)
func _icone_heroi(id: String) -> Button:
	var c: Dictionary = Dados.CLASSES[id]
	var sel: bool = id == w.sel_heroi
	var trancado: bool = not Dados.heroi_desbloqueado(id)
	var b := Button.new(); b.custom_minimum_size = Vector2(112, 148); b.clip_contents = true
	_estilo_carta(b, sel)
	var v := _miolo(b, 6, 2)
	var ret := _retrato_heroi(id, Vector2(70, 88))
	if trancado: ret.modulate = Color(0.03, 0.03, 0.03)   # silhueta preta até cumprir o feito
	v.add_child(ret)
	v.add_child(Tela.texto(String(c["apelido"]), 12, 96, Tela.TINTA if not sel else Tela.URUCUM))
	Tela.ignora_mouse(b)
	if trancado:
		var req := "🔒 Para liberar " + String(c["apelido"]) + ": " + Dados.requisito_heroi(id)
		b.tooltip_text = req
		b.mouse_entered.connect(func():
			_lbl_dica.text = req
			_painel_dica.add_theme_stylebox_override("panel", Tela.caixa(Tela.TINTA, 3, Tela.URUCUM, 4)))
		b.mouse_exited.connect(func():
			_lbl_dica.text = ""
			_painel_dica.add_theme_stylebox_override("panel", StyleBoxEmpty.new()))
	else:
		b.pressed.connect(func():
			w.sel_heroi = id; Salvo.d["heroi"] = id; herois())
	return b

# pergunta (só na primeira vez) se a pessoa quer fazer o tutorial antes da 1ª fase
func perguntar_tutorial() -> void:
	_limpar("pergtut")
	Tela.escuro(raiz, 0.72)
	var cc := CenterContainer.new(); cc.set_anchors_preset(Control.PRESET_FULL_RECT); raiz.add_child(cc)
	var p := Tela.painel(Color(1.0, 0.97, 0.86)); cc.add_child(p)
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", 16); p.add_child(vb)
	vb.add_child(Tela.rotulo("Quer fazer um tutorial rápido antes de começar?", 22, Tela.TINTA, HORIZONTAL_ALIGNMENT_CENTER, true))
	vb.add_child(Tela.texto("Ensina os controles e como o jogo funciona. Pode jogar de novo quando quiser, pelo menu principal.", 14, 480))
	var hb := _linha(vb, 16)
	var ac_sim := func():
		Salvo.d["tutorial"] = true; Salvo.salvar(); w.iniciar_jogo(w.sel_heroi, w.sel_fase, true)
	var ac_nao := func():
		Salvo.d["tutorial"] = true; Salvo.salvar(); w.iniciar_jogo(w.sel_heroi, w.sel_fase, false)
	hb.add_child(Tela.botao("SIM", ac_sim, 20, Tela.URUCUM, 190.0, 50.0))
	hb.add_child(Tela.botao("NÃO", ac_nao, 20, Tela.PARDO, 190.0, 50.0))

func _estilo_carta(b: Button, marcado: bool, fundo: Color = Tela.PAPEL) -> void:
	var claro := Color(1.0, 0.97, 0.86)
	b.add_theme_stylebox_override("normal", Tela.caixa(claro if marcado else fundo, 7 if marcado else 4, Tela.URUCUM if marcado else Tela.TINTA, 8 if marcado else 5))
	b.add_theme_stylebox_override("hover", Tela.caixa(claro, 7 if marcado else 5, Tela.URUCUM if marcado else Tela.IPE.darkened(0.15), 8))
	b.add_theme_stylebox_override("pressed", Tela.caixa(claro, 6, Tela.URUCUM, 2))
	b.add_theme_stylebox_override("disabled", Tela.caixa(Tela.PARDO, 3, Color(0.1, 0.07, 0.05, 0.5), 0))
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())

func _miolo(b: Button, margem: int = 10, sep: int = 5) -> VBoxContainer:
	var m := MarginContainer.new(); m.set_anchors_preset(Control.PRESET_FULL_RECT)
	for lado in ["left", "right", "top", "bottom"]: m.add_theme_constant_override("margin_" + lado, margem)
	b.add_child(m)
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", sep); m.add_child(v)
	return v

func _pct(v: float) -> String:
	return "%d%%" % int(round(v * 100.0))

func _carta_heroi(id: String) -> Button:
	var c: Dictionary = Dados.CLASSES[id]
	var sel: bool = id == w.sel_heroi
	var b := Button.new(); b.custom_minimum_size = Vector2(292, 424); b.clip_contents = true
	_estilo_carta(b, sel)
	var v := _miolo(b, 11, 5)
	v.add_child(Tela.faixa(String(c["apelido"]).to_upper(), c["cor"], 16, Tela.TINTA))
	v.add_child(Tela.rotulo(c["nome"], 13, Tela.URUCUM, HORIZONTAL_ALIGNMENT_CENTER, true))
	v.add_child(Tela.texto(c["desc"], 13, 262, Tela.ANIL))      # breve descrição logo em cima, antes das estatísticas
	var topo := HBoxContainer.new(); topo.add_theme_constant_override("separation", 8); v.add_child(topo)
	topo.add_child(_retrato_heroi(id, Vector2(86, 108)))
	var st := "Vida %d\nVelocidade %.1f\nCrítico %s" % [int(c["maxhp"]), c["speed"], _pct(Dados.CRIT_BASE + c.get("crit", 0.0))]
	if c.has("dodge"): st += "\nEsquiva " + _pct(c["dodge"])
	if c.has("armor"): st += "\nDefesa " + _pct(c["armor"])
	if c.has("regen"): st += "\nRegenera %.0f/s" % c["regen"]
	var lst := Tela.rotulo(st, 15, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT); lst.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	topo.add_child(lst)
	var g: Dictionary = Dados.GOLPES[c["inicial"]]
	var hg := HBoxContainer.new(); hg.add_theme_constant_override("separation", 8); v.add_child(hg)
	hg.add_child(Tela.imagem("a_" + String(g["arte"]), Vector2(84, 55)))
	var lg := Tela.rotulo("Começa com\n" + String(g["nome"]), 14, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT); lg.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	hg.add_child(lg)
	var hab: Dictionary = Dados.HABILIDADES[id]
	v.add_child(Tela.texto("[Q] %s — %s" % [hab["q"]["nome"], hab["q"]["txt"]], 12, 262, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT))
	v.add_child(Tela.texto("[R] %s — %s" % [hab["r"]["nome"], hab["r"]["txt"]], 12, 262, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT))
	v.add_child(Tela.texto("★ " + String(c["pulo"]), 12, 262, Tela.ANIL, HORIZONTAL_ALIGNMENT_LEFT))
	Tela.ignora_mouse(b)
	b.pressed.connect(func():
		w.sel_heroi = id; Salvo.d["heroi"] = id; herois())
	return b

func _carta_fase(i: int, fmax: int) -> Button:
	var f: Dictionary = Dados.FASES[i]
	var fechada := i > fmax
	var b := Button.new(); b.custom_minimum_size = Vector2(298, 86); b.disabled = fechada; b.clip_contents = true
	_estilo_carta(b, i == w.sel_fase and not fechada, Tela.PAPEL2)
	var m := MarginContainer.new(); m.set_anchors_preset(Control.PRESET_FULL_RECT)
	for lado in ["left", "right", "top", "bottom"]: m.add_theme_constant_override("margin_" + lado, 9)
	b.add_child(m)
	var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 10); m.add_child(hb)
	var im := _retrato_bicho(String(f["chefe"]), Vector2(52, 62))
	if fechada: im.modulate = Color(0.1, 0.08, 0.06, 0.75)
	hb.add_child(im)
	var v := VBoxContainer.new(); v.alignment = BoxContainer.ALIGNMENT_CENTER; v.add_theme_constant_override("separation", 2); hb.add_child(v)
	v.add_child(Tela.rotulo("%d · %s" % [i + 1, f["nome"]], 14, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT, true))
	var l2 := "Chefe: %s" % String(f["chefe_nome"]).capitalize()
	var rec := float(Salvo.d["recordes"].get(str(i), -1.0))
	if rec >= 0.0: l2 += "\nRecorde extra: %s" % w._mmss(rec)
	if fechada: l2 = "Fechada — vença o\nchefe da fase anterior"
	v.add_child(Tela.rotulo(l2, 12, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT))
	Tela.ignora_mouse(b)
	b.pressed.connect(func():
		w.sel_fase = i; Salvo.d["fase"] = i; herois())
	return b

# ---------------- co-op por LAN (base: anda junto, bicho/carta vêm depois) ----------------
func coop() -> void:
	_limpar("coop")
	Tela.fundo_papel(raiz)
	var vb := _centro(12)
	vb.add_child(Tela.rotulo("CO-OP (LAN) — EXPERIMENTAL", 32, Tela.TINTA, HORIZONTAL_ALIGNMENT_CENTER, true))
	vb.add_child(Tela.texto("Anda junto com os amigos na mesma rede (Wi-Fi ou cabo), até 5 pessoas. Esta primeira versão só sincroniza o movimento de todo mundo — bicho, chefe e carta ainda são só da partida sozinho.", 14, 560))
	if _rede_erro != "":
		vb.add_child(Tela.faixa(_rede_erro, Tela.URUCUM, 14, Tela.PAPEL)); _rede_erro = ""
	var le_nome := LineEdit.new(); le_nome.placeholder_text = "seu nome (aparece em cima do seu boneco)"
	le_nome.text = String(Salvo.d["nome_jogador"]); le_nome.max_length = 16
	le_nome.custom_minimum_size = Vector2(380, 42); le_nome.alignment = HORIZONTAL_ALIGNMENT_CENTER
	le_nome.add_theme_font_size_override("font_size", 16)
	le_nome.text_changed.connect(func(t): Salvo.d["nome_jogador"] = t; Salvo.salvar())
	vb.add_child(le_nome)
	if not Rede.ativo():
		var le_mundo := LineEdit.new(); le_mundo.placeholder_text = "nome do seu mundo (ex.: Mundo do Diogo)"
		le_mundo.custom_minimum_size = Vector2(380, 42); le_mundo.alignment = HORIZONTAL_ALIGNMENT_CENTER
		le_mundo.add_theme_font_size_override("font_size", 16); le_mundo.max_length = 24
		vb.add_child(le_mundo)
		vb.add_child(Tela.texto("O progresso do co-op é só desse mundo — não mexe no seu jogo sozinho. Usar o mesmo nome continua de onde parou; nome novo começa um mundo do zero.", 12, 380, Tela.PARDO))
		var ac_host := func():
			var erro := Rede.hospedar(le_mundo.text)
			if erro != "": _rede_erro = erro
			coop()
		vb.add_child(Tela.botao("HOSPEDAR (ser o anfitrião)", ac_host, 18, Tela.URUCUM, 380.0, 48.0))
		vb.add_child(Tela.rotulo("— ou —", 13, Tela.PARDO))
		var achados: Array = Rede.mundos_disponiveis()
		if achados.size() > 0:
			vb.add_child(Tela.rotulo("Mundos achados na sua rede:", 14, Tela.PARDO))
			for m in achados:
				var ip: String = m["ip"]; var nome_m: String = m["nome"]
				var ac_entrar_achado := func():
					var erro3 := Rede.entrar(ip)
					if erro3 != "": _rede_erro = erro3
					coop()
				vb.add_child(Tela.botao("ENTRAR EM: %s" % nome_m, ac_entrar_achado, 17, Tela.ANIL, 380.0, 44.0))
			vb.add_child(Tela.rotulo("— ou digite o endereço na mão —", 12, Tela.PARDO))
		var le := LineEdit.new(); le.placeholder_text = "endereço de quem hospedou (ex.: 192.168.0.12)"
		le.custom_minimum_size = Vector2(380, 42); le.alignment = HORIZONTAL_ALIGNMENT_CENTER
		le.add_theme_font_size_override("font_size", 16)
		vb.add_child(le)
		var ac_join := func():
			var erro2 := Rede.entrar(le.text)
			if erro2 != "": _rede_erro = erro2
			coop()
		vb.add_child(Tela.botao("ENTRAR", ac_join, 18, Tela.ANIL, 380.0, 46.0))
	else:
		if Rede.sou_host():
			var ips: Array = Rede.meus_enderecos()
			var txt_ips := "(sem endereço de rede local — confira o Wi-Fi)"
			if ips.size() > 0:
				txt_ips = String(ips[0])
				for i in range(1, ips.size()): txt_ips += ", " + String(ips[i])
			vb.add_child(Tela.faixa("Passe pros amigos: %s  ·  porta %d" % [txt_ips, Rede.PORTA], Tela.IPE, 15, Tela.TINTA))
		vb.add_child(Tela.rotulo("%d na sala" % Rede.ids().size(), 20, Tela.TINTA, HORIZONTAL_ALIGNMENT_CENTER, true))
		if Rede.sou_host():
			vb.add_child(Tela.botao("COMEÇAR", Rede.comecar, 22, Tela.URUCUM, 300.0, 52.0))
		else:
			vb.add_child(Tela.rotulo("Esperando o anfitrião começar…", 15, Tela.PARDO, HORIZONTAL_ALIGNMENT_CENTER, true))
		var ac_sair := func(): Rede.sair(); coop()
		vb.add_child(Tela.botao("SAIR DA SALA", ac_sair, 15, Tela.PARDO, 300.0, 42.0))
	var ac_voltar := func(): Rede.sair(); titulo()
	vb.add_child(Tela.botao("VOLTAR", ac_voltar, 16, Tela.PARDO, 220.0, 42.0))

# ---------------- melhorias permanentes ----------------
func melhorias() -> void:
	_limpar("melhorias")
	Tela.fundo_papel(raiz)
	var vb := _centro(12)
	vb.add_child(Tela.titulo("t_melhorias", 58))
	vb.add_child(Tela.rotulo("Cada herói tem as suas: quem você não treinou continua do zero.", 15))
	var scrh := ScrollContainer.new(); scrh.custom_minimum_size = Vector2(1180, 56)
	scrh.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; vb.add_child(scrh)
	var hh := HBoxContainer.new(); hh.add_theme_constant_override("separation", 10); scrh.add_child(hh)
	for hid in Dados.CLASSES:
		if not Dados.heroi_desbloqueado(hid): continue   # treino só vale pra quem já tem o herói liberado
		var hsel: String = hid
		var ac_h := func():
			w.sel_heroi = hsel; Salvo.d["heroi"] = hsel; Salvo.salvar(); melhorias()
		var ch: Dictionary = Dados.CLASSES[hid]
		var bh := Tela.botao(String(ch["apelido"]).to_upper(), ac_h, 15, ch["cor"] if hid == Salvo.d["heroi"] else Tela.PARDO, 270.0, 40.0)
		hh.add_child(bh)
	var gr := GridContainer.new(); gr.columns = 3
	gr.add_theme_constant_override("h_separation", 14); gr.add_theme_constant_override("v_separation", 14); vb.add_child(gr)
	for id in Dados.MELHORIAS:
		var m: Dictionary = Dados.MELHORIAS[id]
		var nv := Salvo.nivel(id); var custo := Dados.custo_melhoria(id, nv)
		var cheio: bool = nv >= int(m["max"])
		var p := PanelContainer.new(); p.custom_minimum_size = Vector2(376, 132)
		var s := Tela.caixa(Color(1.0, 0.97, 0.86), 4, Tela.TINTA, 6); s.set_content_margin_all(12)
		p.add_theme_stylebox_override("panel", s); gr.add_child(p)
		var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 12); p.add_child(hb)
		var im := Tela.imagem("a_" + String(m["arte"]), Vector2(138, 90)); im.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		hb.add_child(im)
		var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 4); v.alignment = BoxContainer.ALIGNMENT_CENTER; hb.add_child(v)
		v.add_child(Tela.rotulo(m["nome"], 17, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT, true))
		v.add_child(Tela.texto(String(m["txt"]) + " por nível", 13, 200, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT))
		v.add_child(Tela.rotulo("●".repeat(nv) + "○".repeat(int(m["max"]) - nv), 15, Tela.URUCUM, HORIZONTAL_ALIGNMENT_LEFT))
		var ac_compra := func():
			Salvo.d["moedas"] = int(Salvo.d["moedas"]) - custo
			Salvo.subir(id)
			Salvo.salvar(); melhorias()
		var bt := Tela.botao("NO MÁXIMO" if cheio else "COMPRAR  ◉ %d" % custo, ac_compra, 15, Tela.ANIL, 196.0, 38.0)
		bt.disabled = cheio or int(Salvo.d["moedas"]) < custo
		v.add_child(bt)
	var volta := Tela.botao("VOLTAR", titulo, 18, Tela.PARDO, 220.0, 48.0); volta.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	vb.add_child(volta)
	_moedas_tag()

# ---------------- feitos (metas que pagam moedas) ----------------
func feitos() -> void:
	_limpar("feitos")
	Tela.fundo_papel(raiz)
	var vb := _centro(10)
	vb.add_child(Tela.rotulo("FEITOS", 46, Tela.TINTA, HORIZONTAL_ALIGNMENT_CENTER, true))
	vb.add_child(Tela.rotulo("Cumpra as metas jogando e pegue as moedas aqui.", 15))
	var gr := GridContainer.new(); gr.columns = 2
	gr.add_theme_constant_override("h_separation", 14); gr.add_theme_constant_override("v_separation", 9); vb.add_child(gr)
	for f in Dados.FEITOS:
		var tem := int(Salvo.d["contadores"].get(f["c"], 0)); var meta := int(f["meta"])
		var pego: bool = Salvo.d["feitos"].has(f["id"])
		var pronto: bool = tem >= meta and not pego
		var p := PanelContainer.new(); p.custom_minimum_size = Vector2(590, 70)
		var st := Tela.caixa(Color(1.0, 0.97, 0.86) if not pego else Tela.PAPEL2, 5 if pronto else 3, Tela.URUCUM if pronto else Tela.TINTA, 5); st.set_content_margin_all(9)
		p.add_theme_stylebox_override("panel", st); gr.add_child(p)
		var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 10); p.add_child(hb)
		var v := VBoxContainer.new(); v.size_flags_horizontal = Control.SIZE_EXPAND_FILL; v.add_theme_constant_override("separation", 1); hb.add_child(v)
		v.add_child(Tela.rotulo(f["nome"], 18, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT, true))
		v.add_child(Tela.rotulo("%s  ·  %d / %d" % [f["txt"], mini(tem, meta), meta], 14, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT))
		var barra := ProgressBar.new(); barra.max_value = meta; barra.value = mini(tem, meta); barra.show_percentage = false; barra.custom_minimum_size = Vector2(0, 8)
		var bf := StyleBoxFlat.new(); bf.bg_color = Tela.PARDO; var bc := StyleBoxFlat.new(); bc.bg_color = Tela.MATA if pego else Tela.URUCUM
		barra.add_theme_stylebox_override("background", bf); barra.add_theme_stylebox_override("fill", bc); v.add_child(barra)
		var id: String = f["id"]; var premio := int(f["premio"])
		var ac := func():
			Salvo.d["feitos"][id] = true
			Salvo.d["moedas"] = int(Salvo.d["moedas"]) + premio
			Salvo.salvar(); feitos()
		var bt := Tela.botao("FEITO ✔" if pego else "PEGAR ◉ %d" % premio if pronto else "◉ %d" % premio, ac, 15, Tela.URUCUM if pronto else Tela.PARDO, 150.0, 40.0)
		bt.disabled = not pronto; bt.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		hb.add_child(bt)
	var volta := Tela.botao("VOLTAR", titulo, 18, Tela.PARDO, 220.0, 46.0); volta.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	vb.add_child(volta)
	_moedas_tag()

# ---------------- opções ----------------
func opcoes(volta: Callable) -> void:
	_volta = volta
	_limpar("opcoes")
	if w.estado == "menu": Tela.fundo_papel(raiz)
	else: Tela.escuro(raiz, 0.7)
	var cc := CenterContainer.new(); cc.set_anchors_preset(Control.PRESET_FULL_RECT); raiz.add_child(cc)
	var p := Tela.painel(Color(1.0, 0.97, 0.86)); cc.add_child(p)
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", 14); p.add_child(vb)
	vb.add_child(Tela.titulo("t_opcoes", 56))
	var abas := _linha(vb, 8)
	for par in [["som", "SOM"], ["jogo", "JOGO"], ["controles", "CONTROLES"], ["idioma", "IDIOMA (em breve)"]]:
		var k: String = par[0]
		var ac_aba := func():
			_aba = k; opcoes(_volta)
		abas.add_child(Tela.botao(par[1], ac_aba, 15, Tela.IPE if k == _aba else Tela.PARDO, 168.0 if k != "idioma" else 190.0, 40.0))
	var corpo := VBoxContainer.new(); corpo.custom_minimum_size = Vector2(720, 240); corpo.add_theme_constant_override("separation", 11)
	vb.add_child(corpo)
	match _aba:
		"som":
			_deslizante(corpo, "Volume geral", "geral", 0.0, 1.0, true)
			_deslizante(corpo, "Música", "musica", 0.0, 1.0, true)
			_deslizante(corpo, "Efeitos sonoros", "efeitos", 0.0, 1.0, true)
			corpo.add_child(Tela.texto("Sons, vozes e música são provisórios — servem para sentir o jogo; os definitivos entram depois.", 13, 620))
		"jogo":
			_deslizante(corpo, "Sensibilidade do mouse", "sens", 0.3, 2.5, false)
			_deslizante(corpo, "Distância da câmera", "camera", 7.0, 22.0, false)
			_chave(corpo, "Tela cheia", "cheia")
			_chave(corpo, "Números de dano", "numeros")
			_chave(corpo, "Visual pixelado", "pixel")
			if w.estado == "menu":
				var ac_tut := func(): _so_tutorial = true; herois()
				var bt_tut := Tela.botao("JOGAR O TUTORIAL DE NOVO", ac_tut, 15, Tela.ANIL, 300.0, 38.0); bt_tut.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
				corpo.add_child(bt_tut)
		"controles":
			var gr := GridContainer.new(); gr.columns = 4
			gr.add_theme_constant_override("h_separation", 10); gr.add_theme_constant_override("v_separation", 6); corpo.add_child(gr)
			for it in Ctrl.ACOES:
				var a: String = it[0]
				var l := Tela.rotulo(it[1], 14, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT); l.custom_minimum_size = Vector2(226, 0); gr.add_child(l)
				var ac_tecla := func():
					_capt = a; opcoes(_volta)
				gr.add_child(Tela.botao("aperte uma tecla…" if _capt == a else Ctrl.nome(a), ac_tecla, 14, Tela.IPE if _capt == a else Tela.PAPEL2, 116.0, 32.0))
			var ac_pad := func():
				Salvo.d["teclas"] = {}; _capt = ""; Salvo.salvar(); opcoes(_volta)
			var bp := Tela.botao("VOLTAR AO PADRÃO", ac_pad, 13, Tela.PARDO, 220.0, 32.0); bp.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
			corpo.add_child(bp)
			corpo.add_child(Tela.texto("As setas também andam. Controle de Xbox ou PlayStation: analógico esquerdo anda, direito gira a câmera, A/✕ pula, B/○ arranca, X/□ especial, Y/△ ultimate, LB/L1 mostra a build, Start pausa.", 12, 700))
		"idioma":
			corpo.add_child(Tela.rotulo("✔ Português (Brasil)", 20, Tela.MATA, HORIZONTAL_ALIGNMENT_CENTER, true))
			corpo.add_child(Tela.faixa("EM BREVE", Tela.URUCUM, 16))
			corpo.add_child(Tela.texto("English · Español · Français · Deutsch · Русский · e mais", 17, 620, Color(0.1, 0.07, 0.05, 0.55)))
			corpo.add_child(Tela.texto("A tradução entra antes do lançamento na Steam.", 14, 620))
	var ac_volta := func():
		_capt = ""; Salvo.salvar(); _volta.call()
	var bv := Tela.botao("VOLTAR", ac_volta, 18, Tela.URUCUM, 240.0, 48.0)
	bv.size_flags_horizontal = Control.SIZE_SHRINK_CENTER; vb.add_child(bv)

func _mudou(k: String, v: float) -> void:
	Salvo.d["opcoes"][k] = v
	Tela.aplicar_opcoes(); w.aplicar_opcoes()

func _deslizante(pai: Control, nome: String, k: String, mn: float, mx: float, pct: bool) -> void:
	var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 14); pai.add_child(hb)
	var l := Tela.rotulo(nome, 18, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT); l.custom_minimum_size = Vector2(250, 0); hb.add_child(l)
	var sl := HSlider.new(); sl.min_value = mn; sl.max_value = mx; sl.step = 0.05 if mx <= 3.0 else 0.5
	sl.value = Tela.opc(k); sl.custom_minimum_size = Vector2(290, 30); sl.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var trilho := StyleBoxFlat.new(); trilho.bg_color = Tela.TINTA; trilho.set_corner_radius_all(3); trilho.content_margin_top = 4; trilho.content_margin_bottom = 4
	var cheio := StyleBoxFlat.new(); cheio.bg_color = Tela.URUCUM; cheio.set_corner_radius_all(3); cheio.border_color = Tela.TINTA; cheio.set_border_width_all(2)
	sl.add_theme_stylebox_override("slider", trilho)
	sl.add_theme_stylebox_override("grabber_area", cheio); sl.add_theme_stylebox_override("grabber_area_highlight", cheio)
	hb.add_child(sl)
	var val := Tela.rotulo("", 18, Tela.TINTA, HORIZONTAL_ALIGNMENT_RIGHT, true); val.custom_minimum_size = Vector2(70, 0); hb.add_child(val)
	var mostra := func(v: float): val.text = _pct(v) if pct else ("%.1f" % v)
	mostra.call(sl.value)
	sl.value_changed.connect(func(v: float):
		mostra.call(v); _mudou(k, v))
	sl.drag_ended.connect(func(_m: bool): Salvo.salvar())

func _chave(pai: Control, nome: String, k: String) -> void:
	var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 14); pai.add_child(hb)
	var l := Tela.rotulo(nome, 18, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT); l.custom_minimum_size = Vector2(250, 0); hb.add_child(l)
	var lig := Tela.opc(k) > 0.5
	var ac_chave := func():
		_mudou(k, 0.0 if lig else 1.0); Salvo.salvar(); opcoes(_volta)
	hb.add_child(Tela.botao("LIGADO" if lig else "DESLIGADO", ac_chave, 15, Tela.MATA if lig else Tela.PARDO, 180.0, 38.0))

# ---------------- pausa (ESC) ----------------
func pausa() -> void:
	_limpar("pausa")
	Tela.escuro(raiz, 0.62)
	var cc := CenterContainer.new(); cc.set_anchors_preset(Control.PRESET_FULL_RECT); raiz.add_child(cc)
	var p := Tela.painel(Color(1.0, 0.97, 0.86)); cc.add_child(p)
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", 14); p.add_child(vb)
	vb.add_child(Tela.titulo("t_pausa", 58))
	var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 26); vb.add_child(hb)
	var esq := VBoxContainer.new(); esq.custom_minimum_size = Vector2(400, 0); esq.add_theme_constant_override("separation", 6); hb.add_child(esq)
	var j = w.player
	var f: Dictionary = Dados.FASES[w.fase]
	esq.add_child(Tela.faixa("%s · NÍVEL %d" % [String(Dados.CLASSES[j.classe]["apelido"]).to_upper(), j.level], Dados.CLASSES[j.classe]["cor"], 15, Tela.TINTA))
	for g in j.golpes:
		var lg := HBoxContainer.new(); lg.add_theme_constant_override("separation", 8); esq.add_child(lg)
		lg.add_child(Tela.imagem("a_" + String(Dados.GOLPES[g["id"]]["arte"]), Vector2(56, 36)))
		var nm := Tela.rotulo(Dados.GOLPES[g["id"]]["nome"], 16, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT); nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		lg.add_child(nm)
		lg.add_child(Tela.rotulo("MÁX" if g["nivel"] >= Dados.NIVEL_MAX else "Nv %d" % g["nivel"], 16, Tela.URUCUM, HORIZONTAL_ALIGNMENT_RIGHT, true))
	var at := "Vida %d / %d  ·  Dano +%s\nCrítico %s (×%.1f)  ·  Vel. de ataque +%s\nÁrea +%s  ·  Defesa %s  ·  Regenera %.1f/s" % [
		int(ceil(j.hp)), int(j.max_hp), _pct(j.dano_mult - 1.0), _pct(j.crit), j.crit_dano, _pct(j.atk_speed - 1.0),
		_pct(j.area_mult - 1.0), _pct(j.armor), j.regen]
	esq.add_child(Tela.texto(at, 14, 400, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT))
	esq.add_child(Tela.faixa("FASE %d · %s" % [w.fase + 1, String(f["nome"]).to_upper()], Tela.PAPEL2, 14, Tela.TINTA))
	esq.add_child(Tela.texto("Tempo %s  ·  %d abates  ·  ◉ %d moedas\nMaior golpe: %s  ·  Dano total: %s" % [
		w._mmss(w.time), w.kills, int(w.moedas), Tela.num(w.maior_dano), Tela.num(w.dano_total)], 14, 400, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT))
	var dir := VBoxContainer.new(); dir.add_theme_constant_override("separation", 12); dir.alignment = BoxContainer.ALIGNMENT_CENTER; hb.add_child(dir)
	dir.add_child(Tela.botao("CONTINUAR", w.continuar, 22, Tela.URUCUM, 300.0, 56.0))
	var ac_opc := func(): opcoes(pausa)
	var ac_fechar := func(): get_tree().quit()
	dir.add_child(Tela.botao("OPÇÕES", ac_opc, 18, Tela.MATA, 300.0, 46.0))
	dir.add_child(Tela.botao("SAIR PARA O ARRAIAL", w.sair_da_fase, 16, Tela.ANIL, 300.0, 46.0))
	dir.add_child(Tela.botao("FECHAR O JOGO", ac_fechar, 16, Tela.PARDO, 300.0, 42.0))
	if not w.chefe_morto:
		dir.add_child(Tela.texto("Sair antes de vencer o chefe leva só metade das moedas.", 12, 300))
	vb.add_child(Tela.texto("%s%s%s%s anda · mouse gira a câmera · rodinha aproxima · %s pula · %s arranca · %s especial · %s ultimate · %s mostra a build" % [
		Ctrl.nome("cima"), Ctrl.nome("esq"), Ctrl.nome("baixo"), Ctrl.nome("dir"), Ctrl.nome("pulo"), Ctrl.nome("dash"), Ctrl.nome("q"), Ctrl.nome("r"), Ctrl.nome("info")], 13, 720))

# ---------------- subir de nível: folhetos no varal ----------------
func nivel(p, ofertas: Array, tipo: String = "nivel") -> void:
	_limpar("nivel")
	_heroi_nv = p; _abriu = Time.get_ticks_msec()
	Tela.escuro(raiz, 0.8)
	var vb := _centro(6)
	if tipo == "bau":
		vb.add_child(Tela.rotulo("BAÚ ABERTO!", 50, Tela.IPE, HORIZONTAL_ALIGNMENT_CENTER, true))
		vb.add_child(Tela.rotulo("Folhetos de sorte: no mínimo raros — escolha um", 20, Tela.PAPEL))
	elif tipo == "contrabando":
		vb.add_child(Tela.rotulo("CONTRABANDO", 50, Tela.IPE, HORIZONTAL_ALIGNMENT_CENTER, true))
		vb.add_child(Tela.rotulo("Mercadoria fina: épica ou melhor — escolha uma", 20, Tela.PAPEL))
	elif tipo == "caminho":
		vb.add_child(Tela.rotulo("ABRE-CAMINHO", 50, Color(1.0, 0.4, 0.4), HORIZONTAL_ALIGNMENT_CENTER, true))
		vb.add_child(Tela.rotulo("A Pomba Gira abriu o caminho: escolha uma", 20, Tela.PAPEL))
	elif tipo == "oratorio":
		vb.add_child(Tela.rotulo("BENÇÃO DO ORATÓRIO", 46, Color(0.6, 0.9, 1.0), HORIZONTAL_ALIGNMENT_CENTER, true))
		vb.add_child(Tela.rotulo("Escolha uma graça", 20, Tela.PAPEL))
	else:
		vb.add_child(Tela.titulo("t_nivel", 62))
		vb.add_child(Tela.rotulo("Nível %d — escolha um folheto" % p.level, 20, Tela.PAPEL))
	var larg := 270.0; var vao := 34.0
	var area := Control.new(); area.custom_minimum_size = Vector2(ofertas.size() * larg + (ofertas.size() - 1) * vao, 450); vb.add_child(area)
	var corda := ColorRect.new(); corda.color = Tela.PAPEL2; corda.position = Vector2(-60, 12); corda.size = Vector2(area.custom_minimum_size.x + 120, 4)
	area.add_child(corda)
	for i in range(ofertas.size()):
		var b := _folheto(p, ofertas[i], i, Vector2(larg, 414))
		b.position = Vector2(i * (larg + vao), 26); area.add_child(b)
		var preg := Panel.new(); preg.position = Vector2(i * (larg + vao) + larg * 0.5 - 9, 0); preg.size = Vector2(18, 42)
		preg.add_theme_stylebox_override("panel", Tela.caixa(Tela.PARDO, 2, Tela.TINTA, 0, 3)); preg.mouse_filter = Control.MOUSE_FILTER_IGNORE
		area.add_child(preg)
		_cartas.append([ofertas[i], b])

func _folheto(p, card: Dictionary, i: int, tam: Vector2) -> Button:
	var ri: int = card.get("rar", 0)
	var r: Dictionary = Dados.RARIDADES[ri]
	var info: Dictionary = p.info_carta(card)
	var cor_r: Color = r["cor"] if ri > 0 else Tela.PAPEL2
	var mitica := ri == 5
	var b := Button.new(); b.custom_minimum_size = tam; b.size = tam; b.pivot_offset = tam * 0.5; b.clip_contents = true
	var papel := Color(1.0, 0.97, 0.86)
	var borda: Color = Tela.TINTA if ri == 0 else cor_r.darkened(0.25)
	b.add_theme_stylebox_override("normal", Tela.caixa(papel, 8 if mitica else 5, borda, 7))
	b.add_theme_stylebox_override("hover", Tela.caixa(Color(1, 1, 0.94), 8 if mitica else 6, Tela.URUCUM, 10))
	b.add_theme_stylebox_override("pressed", Tela.caixa(Color(1, 1, 0.94), 6, Tela.URUCUM, 2))
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	var v := _miolo(b, 12, 6)
	var nome_r := String(r["nome"]).to_upper()
	if card["tipo"] == "golpe_novo": nome_r = "GOLPE NOVO"; cor_r = Tela.URUCUM
	v.add_child(Tela.faixa(("✦ %s ✦" % nome_r) if mitica else nome_r, cor_r, 15, Tela.PAPEL if cor_r.get_luminance() < 0.45 else Tela.TINTA))
	v.add_child(Tela.imagem("a_" + String(info["arte"]), Vector2(tam.x - 24, (tam.x - 24) * 0.65)))
	var nm := Tela.texto(info["nome"], 21, tam.x - 28); nm.add_theme_font_override("font", Tela.fonte(true)); v.add_child(nm)
	if card["tipo"] != "golpe_novo": v.add_child(Tela.rotulo(info["selo"], 14, Tela.URUCUM, HORIZONTAL_ALIGNMENT_CENTER, true))
	v.add_child(Tela.texto(info["txt"], 15, tam.x - 28))
	var esp := Control.new(); esp.size_flags_vertical = Control.SIZE_EXPAND_FILL; v.add_child(esp)
	if Dados.PIADAS.has(card["id"]): v.add_child(Tela.texto("“%s”" % Dados.PIADAS[card["id"]], 12, tam.x - 28, Tela.ANIL))
	v.add_child(Tela.rotulo("tecla %d" % (i + 1), 12, Tela.PARDO.darkened(0.2)))
	Tela.ignora_mouse(b)
	b.mouse_entered.connect(func(): create_tween().tween_property(b, "scale", Vector2(1.06, 1.06), 0.08))
	b.mouse_exited.connect(func(): create_tween().tween_property(b, "scale", Vector2.ONE, 0.08))
	b.pressed.connect(func(): _pegar(card))
	if mitica:
		var tw := b.create_tween().set_loops()
		tw.tween_property(b, "modulate", Color(1.25, 1.1, 1.1), 0.45); tw.tween_property(b, "modulate", Color.WHITE, 0.45)
	return b

func _pegar(card: Dictionary) -> void:
	if tela != "nivel" or Time.get_ticks_msec() - _abriu < 350: return
	w._escolher_carta(_heroi_nv, card)

func _input(event: InputEvent) -> void:
	if _capt != "" and event is InputEventKey and event.pressed and not event.echo:
		if event.physical_keycode != KEY_ESCAPE:
			Salvo.d["teclas"][_capt] = int(event.physical_keycode); Salvo.salvar()
		_capt = ""; get_viewport().set_input_as_handled()
		if tela == "opcoes": opcoes(_volta)
		return
	if event is InputEventJoypadButton and event.pressed and event.button_index == JOY_BUTTON_B and tela in ["opcoes", "herois", "melhorias", "feitos", "loja", "lore", "npc", "pausa", "pergtut"]:
		esc(); return
	if tela == "lore" and event is InputEventKey and event.pressed and not event.echo and event.physical_keycode in [KEY_ENTER, KEY_KP_ENTER, KEY_SPACE]:
		get_viewport().set_input_as_handled(); w.fechar_loja(); return
	if tela == "nivel" and event is InputEventKey and event.pressed and not event.echo:
		var n: int = [KEY_1, KEY_2, KEY_3].find(event.physical_keycode)
		if n < 0: n = [KEY_KP_1, KEY_KP_2, KEY_KP_3].find(event.physical_keycode)
		if n >= 0 and n < _cartas.size(): _pegar(_cartas[n][0])

# ---------------- Bodega do Lampião ----------------
func loja() -> void:
	_limpar("loja")
	Tela.escuro(raiz, 0.72)
	var cc := CenterContainer.new(); cc.set_anchors_preset(Control.PRESET_FULL_RECT); raiz.add_child(cc)
	var p := Tela.painel(Color(1.0, 0.97, 0.86)); cc.add_child(p)
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", 9); p.add_child(vb)
	vb.add_child(Tela.rotulo("BODEGA DO LAMPIÃO", 40, Tela.TINTA, HORIZONTAL_ALIGNMENT_CENTER, true))
	vb.add_child(Tela.faixa("Você tem ◉ %d moedas nesta partida" % int(w.moedas), Tela.IPE, 16, Tela.TINTA))
	for it in Dados.LOJA:
		var id: String = it["id"]
		var preco: int = w.loja_preco(id)
		var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 14); vb.add_child(hb)
		var v := VBoxContainer.new(); v.custom_minimum_size = Vector2(560, 0); v.add_theme_constant_override("separation", 0); hb.add_child(v)
		v.add_child(Tela.rotulo(it["nome"], 18, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT, true))
		v.add_child(Tela.texto(it["txt"], 13, 560, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT))
		var ac := func(): w.comprar_loja(id)
		var txt := "◉ %d" % preco if preco > 0 else "DE GRAÇA"
		if id == "pacto" and w.pacto_feito: txt = "FEITO"
		var bt := Tela.botao(txt, ac, 16, Tela.URUCUM, 150.0, 42.0); bt.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		bt.disabled = not w.loja_pode(id)
		hb.add_child(bt)
	var bs := Tela.botao("SEGUIR VIAGEM  (Esc)", w.fechar_loja, 18, Tela.PARDO, 300.0, 46.0); bs.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	vb.add_child(bs)

# ---------------- gente do mapa: retrato, balão de fala e o que oferece ----------------
# nome de arquivo mais curto pra quem tem o "id" comprido — o caminho completo do cache de import
# do Godot pode passar dos 260 caracteres do Windows com o id inteiro (aconteceu de verdade aqui)
const APELIDO_ARQUIVO := {"maracatuzeiro": "maracatu", "cangaceiro_chefe": "cangchefe"}
# retrato: usa a arte 2D (desenhada à mão ou gerada) se já existir; senão cai pro boneco 3D ao vivo
func _retrato_heroi(id: String, tam: Vector2) -> Control:
	var arq: String = APELIDO_ARQUIVO.get(id, id)
	if Tela.tex("s_" + arq): return Tela.imagem("s_" + arq, tam)
	return _retrato3d(id, tam)

# bicho/chefe: usa o retrato 2D se já existir; senão (chefes novos, tipo o Minhocão) mostra o boneco 3D
func _retrato_bicho(tipo: String, tam: Vector2) -> Control:
	if Tela.tex("s_" + tipo): return Tela.imagem("s_" + tipo, tam)
	return _retrato3d(tipo, tam)

func _retrato3d(tipo: String, tam: Vector2) -> SubViewportContainer:
	var c := SubViewportContainer.new(); c.custom_minimum_size = tam; c.stretch = true; c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sv := SubViewport.new(); sv.own_world_3d = true; sv.transparent_bg = true; sv.size = Vector2i(tam)
	sv.render_target_update_mode = SubViewport.UPDATE_ALWAYS; c.add_child(sv)
	var b := Boneco.criar(tipo)
	sv.add_child(b)
	# bichos gigantes (corpo comprido, saindo da origem) precisam encolher, recentralizar e virar de frente pra caber no retrato
	var ajuste: Dictionary = {"minhocao": {"esc": 0.3, "pos": Vector3(0, -0.4, 2.0), "rot": 0.0, "cam_y": 0.35}}.get(tipo, {"esc": 1.0, "pos": Vector3.ZERO, "rot": 0.4, "cam_y": 1.12})
	b.scale = Vector3.ONE * float(ajuste["esc"]); b.position = ajuste["pos"]; b.rotation.y = float(ajuste["rot"])
	var cam := Camera3D.new(); cam.fov = 30.0; cam.position = Vector3(0, float(ajuste["cam_y"]), 4.6); sv.add_child(cam)
	# luz de três pontos (tipo foto de produto): principal + preenchimento + contorno por trás
	var l := DirectionalLight3D.new(); l.rotation_degrees = Vector3(-32, 28, 0); l.light_energy = 1.25; l.light_color = Color(1.0, 0.98, 0.92); sv.add_child(l)
	var fill := DirectionalLight3D.new(); fill.rotation_degrees = Vector3(-18, -150, 0); fill.light_energy = 0.45; fill.light_color = Color(0.75, 0.85, 1.0); sv.add_child(fill)
	var rim := DirectionalLight3D.new(); rim.rotation_degrees = Vector3(25, 165, 0); rim.light_energy = 0.55; rim.light_color = Color(1.0, 0.95, 0.8); sv.add_child(rim)
	var env := Environment.new(); env.background_mode = Environment.BG_CLEAR_COLOR
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR; env.ambient_light_color = Color.WHITE; env.ambient_light_energy = 0.55
	var we := WorldEnvironment.new(); we.environment = env; sv.add_child(we)
	# sombra suave no chão (gradiente radial via shader), pra dar um ar de "foto de produto" em vez de flutuar no vazio
	var sombra := MeshInstance3D.new(); var qm := QuadMesh.new(); qm.size = Vector2(1.5, 1.5) * float(ajuste["esc"])
	sombra.mesh = qm; sombra.rotation.x = -PI / 2.0; sombra.position = Vector3(ajuste["pos"].x, -0.02, ajuste["pos"].z)
	var ssh := Shader.new(); ssh.code = """
shader_type spatial;
render_mode unshaded, cull_disabled, blend_mix, depth_draw_never;
void fragment() {
	float d = length(UV - vec2(0.5));
	ALBEDO = vec3(0.08, 0.06, 0.05);
	ALPHA = smoothstep(0.5, 0.1, d) * 0.3;
}
"""
	var sm := ShaderMaterial.new(); sm.shader = ssh
	sombra.material_override = sm; sv.add_child(sombra)
	return c

func npc(tipo: String, fala: int) -> void:
	_limpar("npc")
	Tela.escuro(raiz, 0.72)
	var d: Dictionary = Dados.NPCS[tipo]
	var cc := CenterContainer.new(); cc.set_anchors_preset(Control.PRESET_FULL_RECT); raiz.add_child(cc)
	var p := Tela.painel(Color(1.0, 0.97, 0.86)); cc.add_child(p)
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", 8); p.add_child(vb)
	var topo := HBoxContainer.new(); topo.add_theme_constant_override("separation", 16); vb.add_child(topo)
	var qd := PanelContainer.new(); qd.add_theme_stylebox_override("panel", Tela.caixa(Tela.PAPEL2, 3, Tela.TINTA, 4)); topo.add_child(qd)
	qd.add_child(_retrato3d(tipo, Vector2(150, 176)))
	var dv := VBoxContainer.new(); dv.add_theme_constant_override("separation", 6); dv.alignment = BoxContainer.ALIGNMENT_CENTER; topo.add_child(dv)
	dv.add_child(Tela.rotulo(String(d["nome"]).to_upper(), 34, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT, true))
	dv.add_child(Tela.rotulo(d["de"], 14, Tela.URUCUM, HORIZONTAL_ALIGNMENT_LEFT, true))
	var balao := PanelContainer.new()
	var sb := Tela.caixa(Color.WHITE, 3, Tela.TINTA, 4, 14); sb.set_content_margin_all(12); sb.corner_radius_bottom_left = 0
	balao.add_theme_stylebox_override("panel", sb); dv.add_child(balao)
	var falas: Array = d["falas"]
	balao.add_child(Tela.texto("“%s”" % falas[fala % falas.size()], 18, 520, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT))
	vb.add_child(Tela.texto(d["txt"], 13, 720, Color(0.1, 0.07, 0.05, 0.8)))
	vb.add_child(Tela.faixa("Você tem ◉ %d moedas nesta partida" % int(w.moedas), Tela.IPE, 15, Tela.TINTA))
	for it in d["itens"]:
		var id: String = it["id"]
		var preco: int = w.npc_preco(id, int(it["preco"]))
		var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 14); vb.add_child(hb)
		var v := VBoxContainer.new(); v.custom_minimum_size = Vector2(556, 0); v.add_theme_constant_override("separation", 0); hb.add_child(v)
		v.add_child(Tela.rotulo(String(it["nome"]) + ("  (só uma vez)" if it.get("vez", false) else ""), 17, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT, true))
		v.add_child(Tela.texto(it["txt"], 13, 556, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT))
		var ac := func(): w.npc_comprar(tipo, it, preco, fala)
		var txt := "◉ %d" % preco if preco > 0 else "ACEITAR"
		if w.npc_feito.has(id): txt = "FEITO"
		var bt := Tela.botao(txt, ac, 16, Tela.URUCUM, 150.0, 40.0); bt.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		bt.disabled = w.npc_feito.has(id) or w.moedas < preco or not w.npc_pode(id)
		hb.add_child(bt)
	var bs := Tela.botao("AGRADECER E SEGUIR  (Esc)", w.fechar_loja, 17, Tela.PARDO, 320.0, 44.0); bs.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	vb.add_child(bs)

# ---------------- ficha de apresentação de criatura ----------------
func lore(tipo: String) -> void:
	_limpar("lore")
	Tela.escuro(raiz, 0.7)
	var l: Dictionary = Dados.LORE[tipo]
	var cc := CenterContainer.new(); cc.set_anchors_preset(Control.PRESET_FULL_RECT); raiz.add_child(cc)
	var p := Tela.painel(Color(1.0, 0.97, 0.86)); cc.add_child(p)
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", 10); p.add_child(vb)
	var topo := HBoxContainer.new(); vb.add_child(topo)
	var tit := Tela.rotulo(String(l["nome"]).to_upper(), 38, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT, true); tit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	topo.add_child(tit)
	topo.add_child(Tela.botao("X", w.fechar_loja, 18, Tela.PARDO, 44.0, 40.0))
	vb.add_child(Tela.faixa(l["de"], Tela.URUCUM, 14))
	var hb := HBoxContainer.new(); hb.add_theme_constant_override("separation", 18); vb.add_child(hb)
	var qd := PanelContainer.new(); qd.add_theme_stylebox_override("panel", Tela.caixa(Tela.PAPEL2, 3, Tela.TINTA, 4)); hb.add_child(qd)
	qd.add_child(_retrato_bicho(tipo, Vector2(170, 200)))
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 12); v.alignment = BoxContainer.ALIGNMENT_CENTER; hb.add_child(v)
	v.add_child(Tela.texto(l["txt"], 17, 470, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT))
	v.add_child(Tela.texto("No jogo: " + String(l["jeito"]), 15, 470, Tela.ANIL, HORIZONTAL_ALIGNMENT_LEFT))
	var ok := Tela.botao("OK", w.fechar_loja, 22, Tela.URUCUM, 220.0, 50.0); ok.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	vb.add_child(ok)

# ---------------- fim da partida ----------------
func fim(titulo_txt: String, img: String, linhas: String, ganho: int) -> void:
	_limpar("fim")
	Tela.escuro(raiz, 0.7)
	var cc := CenterContainer.new(); cc.set_anchors_preset(Control.PRESET_FULL_RECT); raiz.add_child(cc)
	var p := Tela.painel(Color(1.0, 0.97, 0.86)); cc.add_child(p)
	var vb := VBoxContainer.new(); vb.add_theme_constant_override("separation", 14); p.add_child(vb)
	if img != "" and Tela.tex(img): vb.add_child(Tela.titulo(img, 60))
	else: vb.add_child(Tela.rotulo(titulo_txt, 34, Tela.URUCUM, HORIZONTAL_ALIGNMENT_CENTER, true))
	vb.add_child(Tela.texto(linhas, 17, 560))
	var fx := Tela.faixa("◉ +%d moedas" % ganho, Tela.IPE, 24, Tela.TINTA); vb.add_child(fx)
	var ac_arraial := func(): get_tree().reload_current_scene()
	var bt := Tela.botao("VOLTAR AO ARRAIAL  (Enter)", ac_arraial, 18, Tela.URUCUM, 360.0, 52.0)
	bt.size_flags_horizontal = Control.SIZE_SHRINK_CENTER; vb.add_child(bt)

# ESC: volta um passo na tela em que estiver
func esc() -> void:
	match tela:
		"pausa": w.continuar()
		"loja", "lore", "npc": w.fechar_loja()
		"opcoes": Salvo.salvar(); _volta.call()
		"herois", "melhorias", "feitos": titulo()
		"coop": Rede.sair(); titulo()
		"pergtut": herois()
