extends Node3D
# Mundo 3D low-poly em terceira pessoa (câmera atrás do herói), com as 4 classes e seus golpes.

const ARENA := Lib.RAIO
const SPAWN_RAIO := 22.0

var estado := "menu"         # menu | jogo | fim
var levelup_aberto := false

var player: Jogador
var camera: Camera3D
var cam_dist := 12.0
var cam_yaw := 0.0
var cam_pitch := 0.56
var cam_fixa := false
var oclusores: Array = []    # [nó, x, z, raio] — árvores que somem quando tapam a câmera
var troncos: Array = []      # Vector3(x, z, raio) — o herói não atravessa
var enemies: Array = []
var fireflies: Array = []
var projectiles: Array = []  # [{node, vel:Vector3, raio, dmg, pierce, vida, homing, boom, cor, hits:{}}]

var time := 0.0
var spawn_t := 0.0
var elite_t := 10.0
var kills := 0
# fase: 10 minutos, chefe, 3 minutos para vencer, depois infinito
var fase := 0
var chefe_t := Dados.CHEFE_T
var chefe: Inimigo = null
var chefe_veio := false
var chefe_morto := false
var furia := false
var furia_t := Dados.FURIA_T
var extra_t := 0.0             # tempo sobrevivido depois do chefe
var moedas := 0.0
var dano_total := 0.0
var maior_dano := 0.0
var menus: Menus
var moldura: Panel            # borda vermelha: pisca ao levar dano e pulsa com a vida baixa
var _moldura_a := 0.0
var tremor := 0.0              # tremor da câmera (pancada forte, pisão do chefe)
var combo := 0                 # sequência de abates
var combo_t := 0.0
var objetos: Array = []        # potes, baús e oratórios espalhados pela fase
var bau_custo := 15
var _pote_t := 20.0
var loja_precos := {}
var pacto_feito := false
var npc_feito := {}            # ofertas de uma vez só já aceitas (Seu Zé, Pomba Gira)
var praga := 1.0               # Abre-Caminho: a bicharada fica mais forte
var _pombas: Array = []
var _pomba_a := 0.0
var _pomba_t := 0.0
var tut := -1                  # passo do tutorial (-1 = partida normal)
var tut_t := 0.0
var _tut_a := 0.0
var _tut_pos := Vector3.ZERO
var painel_tut: PanelContainer
var lbl_tut: Label
var poder := ""                # poder temporário ativo (ver Dados.PODERES)
var poder_t := 0.0
var _poder_tick := 0.0
var _boneco_seu: Boneco        # o boneco do herói, guardado enquanto ele está "virado" em outra coisa
var _fogos: Array = []         # rastro de fogo da Mula sem Cabeça
var _fila: Array = []          # escolhas de carta esperando a vez (nível, baú, oratório)
var _vida_lag := 1.0
var lbl_nv: Label
var lbl_dir: Label
var lbl_combo: Label
var lbl_nome: Label
var barra_lag: ColorRect
var retrato: Panel
var caixa_slots: HBoxContainer
var _slots: Array = []
var caixa_inv: HFlowContainer   # mini inventário: as cartas de atributo pegas
var _inv_n := -1
var minimapa: MiniMapa
var jogadores_rede := {}       # peer_id -> Jogador (só usado no co-op)
var enemies_por_net_id := {}   # net_id -> Inimigo (bicho replicado pela rede)
var _proximo_net_id := 0
var painel_info: PanelContainer
var caixa_placar: HBoxContainer
var pixel: ColorRect
var _start_ant := false
var tiros: Array = []          # bolas de fogo dos chefes
var sel_heroi := "capoeirista"
var sel_fase := 0
var _bot_lim := 300.0
var _env: Environment
var _psm: ProceduralSkyMaterial
var _sol: DirectionalLight3D
var lbl_sub: Label
var lbl_hab: Label
var barra_chefe_bg: ColorRect
var barra_chefe: ColorRect
const FOGO_ULT := {"tipo": "proj_teleguiado", "raio": 0.5, "vida": 3.0, "boom": 1.8, "cor": Color(0.31, 0.72, 0.95)}
const BALA_ULT := {"tipo": "proj_reto", "raio": 0.35, "vida": 0.9, "pierce": 1, "cor": Color(0.94, 0.71, 0.1)}
const TIRO_Q := {"tipo": "proj_reto", "raio": 0.5, "vida": 1.1, "pierce": 99, "crit": 1.0, "cor": Color(1.0, 0.85, 0.2)}

# UI
var hud: CanvasLayer
var lbl_topo: Label
var lbl_vida: Label
var lbl_centro: Label
var barra_vida: ColorRect
var barra_xp: ColorRect
var fogo: Node3D
var _nums := 0

func _ready() -> void:
	get_tree().root.close_requested.connect(func(): Input.mouse_mode = Input.MOUSE_MODE_VISIBLE)
	randomize()
	var a0 := OS.get_cmdline_user_args()
	Salvo.desligado = a0.size() > 0          # qualquer modo de teste: não mexe no save do jogador
	Salvo.carregar()
	get_tree().root.theme = Tela.tema()
	Tela.aplicar_opcoes()
	cam_dist = Tela.opc("camera")
	menus = Menus.new(); menus.w = self; add_child(menus)
	Som.ligar(self)
	pixel = Tela.camada_pixel(self)
	if "--melhorias" in a0:
		for hid in Dados.CLASSES:
			Salvo.d["melhorias"][hid] = {}
			for mid in Dados.MELHORIAS: Salvo.d["melhorias"][hid][mid] = mini(int(a0[a0.find("--melhorias") + 1]), int(Dados.MELHORIAS[mid]["max"]))
	if "--chefe-em" in a0: chefe_t = float(a0[a0.find("--chefe-em") + 1])
	if "--tempo" in a0: _bot_lim = float(a0[a0.find("--tempo") + 1])
	if "--fase" in a0: sel_fase = int(a0[a0.find("--fase") + 1]) - 1
	_montar_ceu()
	_montar_chao()
	_montar_mata()
	_montar_muralha()
	_montar_capim()
	_montar_agua()
	_montar_nuvens()
	_montar_arraial()
	_montar_camera()
	_montar_hud()
	Rede.partida_comecou.connect(iniciar_coop)
	_seguir_camera(1.0)
	var args := OS.get_cmdline_user_args()
	if "--shot" in args:
		_shot_debug(args[args.find("--shot") + 1] if args.find("--shot") + 1 < args.size() else "cangaceiro")
	elif "--bot" in args:
		_bot(args[args.find("--bot") + 1] if args.find("--bot") + 1 < args.size() else "capoeirista")
	elif "--teste-dash" in args:
		_teste_dash()
	elif "--coop-host" in args:
		_teste_coop_host()
	elif "--coop-join" in args:
		_teste_coop_join(args[args.find("--coop-join") + 1])
	elif "--borda" in args:
		_borda()
	elif "--menu" in args:
		sem_mouse = true; _montar_menu(); _salvar("shot_menu")
	elif "--tela" in args:
		_shot_tela(args[args.find("--tela") + 1])
	elif "--chefe" in args:
		_shot_chefe()
	elif "--galeria" in args:
		_galeria()
	elif "--teste" in args:
		_teste(args[args.find("--teste") + 1] if args.find("--teste") + 1 < args.size() else "capoeirista")
	else:
		_montar_menu()

# auto-teste sem clique: escolhe a classe, equipa todos os golpes da build e exercita por 6s.
var _teste_fim := 0.0
func _teste(cls: String) -> void:
	iniciar_jogo(cls, sel_fase)
	player.max_hp = 1e9; player.hp = 1e9   # herói de teste não morre
	player.ult = 1.0; usar_especial(player); usar_ultimate(player)
	for id in Dados.CLASSES[cls]["desbloqueia"]:
		player.aplicar_carta({"tipo": "golpe_novo", "id": id})
	for i in range(24):
		var a := i * TAU / 24.0
		_nascer("caipora" if i % 2 == 0 else "saci", 2.0, 1.0, null, false)
		enemies[-1].position = player.global_position + Vector3(cos(a) * (2.0 + i % 4), 0, sin(a) * (2.0 + i % 4))
	_teste_fim = 1.0

# robô que joga uma partida inteira (vida normal, pega cartas sozinho) e conta até onde foi
var _dano_tomado := 0.0
var _ze_n := 0
var _poder_teste := ""
var _poder_n := 0
var _dano_pombas := 0.0
func _bot(cls: String) -> void:
	var a := OS.get_cmdline_user_args()
	iniciar_jogo(cls, sel_fase, "--tut" in a)
	player.bot = true
	_teste_fim = 2.0
	if "--extras" in a:          # liga o que o robô não compra sozinho, para conferir que funciona
		player.pombas = 3; player.segunda_chance = true; player.pulos_extra += 1
	if "--poder" in a: _poder_teste = a[a.find("--poder") + 1]

func bot_dir() -> Vector3:
	var pp: Vector3 = player.global_position
	var quer: float = {"capoeirista": 2.2, "cangaceiro": 2.0 if player.golpes.size() < 2 else 5.0, "jiujitsu": 5.0, "benzedeira": 10.0, "frevista": 2.4, "cordelista": 9.0}[player.classe]
	if player.hp < player.max_hp * 0.35: quer += 5.0
	var dir := Vector3.ZERO
	var alvo = _nearest(pp, 80.0)
	if alvo:
		var dd: Vector3 = alvo.global_position - pp; dd.y = 0
		var l := dd.length()
		if l > quer + 0.6: dir = dd / maxf(l, 0.01)
		elif l > quer - 0.6: dir = (dd / maxf(l, 0.01)).cross(Vector3.UP)
		else: dir = -dd / maxf(l, 0.01) + (dd / maxf(l, 0.01)).cross(Vector3.UP) * 0.6
	# XP perto vale um desvio
	for fr in fireflies:
		var t: Vector3 = fr["node"].global_position - pp; t.y = 0
		if t.length() < 6.0 and t.length() > 0.1: dir += t.normalized() * 0.8; break
	var centro := Vector3(-pp.x, 0, -pp.z)
	if centro.length() > ARENA * 0.75: dir += centro.normalized() * 1.5
	return dir.normalized() if dir.length() > 0.1 else Vector3.ZERO

func _bot_fim(motivo: String) -> void:
	var gs := ""
	for g in player.golpes: gs += "%s%d " % [g["id"], g["nivel"]]
	var ch := "chefe não veio"
	if chefe_morto: ch = "CHEFE MORTO, extra %s" % _mmss(extra_t)
	elif chefe_veio: ch = "chefe vivo com %d%% (%s)" % [int(100.0 * chefe.hp / chefe.max_hp_cache) if is_instance_valid(chefe) else 0, "em fúria" if furia else "sem fúria"]
	print("BOT %s fase %d %s em %s — nivel:%d abates:%d vida:%d/%d moedas:%d %s golpes: %s crit:%d%% x%.1f maior:%s total:%s" % [player.classe, fase + 1, motivo, _mmss(time), player.level, kills, player.hp, player.max_hp, int(moedas), ch, gs, int(player.crit * 100), player.crit_dano, Tela.num(maior_dano), Tela.num(dano_total)] + (" | seu-zé segurou:%d pombas:%d dano-das-pombas:%s objetos:%d poderes:%d vel:%.2f atq:%.2f xpm:%.2f" % [_ze_n, _pombas.size(), Tela.num(_dano_pombas), objetos.size(), _poder_n, player.speed, player.atk_speed, player.xp_mult]))
	get_tree().quit()

func _teste_tick() -> void:
	if _poder_teste != "" and poder == "" and time > 5.0:      # robô: fica ganhando poderes para conferir que entram e saem direito
		_poder_n += 1
		dar_poder(Dados.PODERES.keys()[_poder_n % Dados.PODERES.size()] if _poder_teste == "todos" else _poder_teste)
	if _teste_fim == 2.0:
		if time > _bot_lim: _bot_fim("VIVO")
		return
	if _teste_fim > 0.0 and time > 6.0:
		print("TESTE %s OK — golpes:%d abates:%d projeteis:%d nivel:%d vida:%d/%d" % [player.classe, player.golpes.size(), kills, projectiles.size(), player.level, player.hp, player.max_hp])
		get_tree().quit()

# ---------------- cenário ----------------
func _montar_ceu() -> void:
	var env := Environment.new(); _env = env
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new(); var psm := ProceduralSkyMaterial.new(); _psm = psm
	psm.sky_top_color = Color(0.2, 0.5, 0.86); psm.sky_horizon_color = Color(0.78, 0.9, 0.88)
	psm.ground_horizon_color = Color(0.78, 0.9, 0.88); psm.ground_bottom_color = Color(0.25, 0.42, 0.25)
	sky.sky_material = psm; env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY; env.ambient_light_energy = 0.45
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.fog_enabled = true; env.fog_light_color = Color(0.55, 0.75, 0.8); env.fog_light_energy = 0.7; env.fog_density = 0.0045; env.fog_sky_affect = 0.25
	env.glow_enabled = true; env.glow_intensity = 0.3
	env.ssao_enabled = true
	var we := WorldEnvironment.new(); we.environment = env; add_child(we)
	var sol := DirectionalLight3D.new(); _sol = sol
	sol.rotation_degrees = Vector3(-48, -35, 0)
	sol.light_color = Color(1.0, 0.94, 0.8); sol.light_energy = 1.05
	sol.shadow_enabled = true; sol.directional_shadow_max_distance = 70.0
	add_child(sol)

func _cor_chao(p: Vector3, rng: RandomNumberGenerator) -> Color:
	var k := clampf((p.y + 2.2) / 4.4, 0.0, 1.0)
	var c := Color(0.2, 0.46, 0.16).lerp(Color(0.42, 0.66, 0.2), k)
	if sin(p.x * 0.13 + 2.0) * sin(p.z * 0.11) > 0.8: c = Color(0.6, 0.45, 0.28)   # clareira de terra
	if p.y > 4.0: c = Color(0.2, 0.4, 0.2)
	if p.y < -1.1: c = Color(0.82, 0.74, 0.5)   # areia na beira da água
	var j := 0.9 + rng.randf() * 0.2
	return Color(c.r * j, c.g * j, c.b * j)

func _tri(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, rng: RandomNumberGenerator) -> void:
	var n := (b - a).cross(c - a).normalized()
	if n.y < 0.0: n = -n
	var cor := _cor_chao((a + b + c) / 3.0, rng)
	for v in [a, b, c]:
		st.set_normal(n); st.set_color(cor); st.add_vertex(v)

func _montar_chao() -> void:
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rng := RandomNumberGenerator.new(); rng.seed = 7
	var L := ARENA + 34.0; var c := 2.5; var n := int(L * 2.0 / c)
	for i in range(n):
		for j in range(n):
			var x0 := -L + i * c; var z0 := -L + j * c
			var a := Vector3(x0, Lib.h(x0, z0), z0)
			var b := Vector3(x0 + c, Lib.h(x0 + c, z0), z0)
			var d := Vector3(x0 + c, Lib.h(x0 + c, z0 + c), z0 + c)
			var e := Vector3(x0, Lib.h(x0, z0 + c), z0 + c)
			_tri(st, a, b, d, rng); _tri(st, a, d, e, rng)
	var mesh := MeshInstance3D.new(); mesh.mesh = st.commit()
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true; mat.vertex_color_is_srgb = true; mat.roughness = 1.0
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mesh.material_override = mat
	add_child(mesh)

# Mata: árvores, ipês, palmeiras, moitas e pedras espalhadas (sempre iguais: semente fixa).
func _montar_mata() -> void:
	var rng := RandomNumberGenerator.new(); rng.seed = 2026
	var L := ARENA
	for i in range(190):
		var x := rng.randf_range(-L, L); var z := rng.randf_range(-L, L)
		if Vector2(x, z).length() < 11.0 or Vector2(x, z).length() > ARENA - 2.0 or Lib.h(x, z) < -1.2: continue
		var r := rng.randf()
		var tipo := 0
		if r < 0.36: tipo = 0
		elif r < 0.44: tipo = 1
		elif r < 0.50: tipo = 2
		elif r < 0.65: tipo = 3
		elif r < 0.80: tipo = 4
		elif r < 0.92: tipo = 5
		else: tipo = 6
		_planta(Vector3(x, Lib.h(x, z) - 0.05, z), tipo, rng)

func _planta(pos: Vector3, tipo: int, rng: RandomNumberGenerator) -> void:
	var n := Node3D.new(); n.position = pos; n.rotation.y = rng.randf() * TAU
	var s := 0.85 + rng.randf() * 0.75
	n.scale = Vector3(s, s, s); add_child(n)
	var tronco := Color(0.4, 0.27, 0.16)
	match tipo:
		0, 1, 2:
			var c1 := Color(0.16, 0.45, 0.18); var c2 := Color(0.24, 0.56, 0.2); var c3 := Color(0.33, 0.66, 0.24)
			if tipo == 1: c1 = Color(0.9, 0.68, 0.08); c2 = Color(0.98, 0.8, 0.12); c3 = Color(1.0, 0.88, 0.3)      # ipê-amarelo
			if tipo == 2: c1 = Color(0.55, 0.25, 0.62); c2 = Color(0.68, 0.34, 0.74); c3 = Color(0.8, 0.5, 0.84)   # quaresmeira
			Lib.cil(n, 0.17, 0.3, 2.6, Vector3(0, 1.3, 0), tronco, 6)
			Lib.esf(n, 1.45, Vector3(0, 3.3, 0), c1, Vector3(1, 0.8, 1), 6)
			Lib.esf(n, 1.0, Vector3(0.85, 2.9, 0.3), c2, Vector3(1, 0.85, 1), 6)
			Lib.esf(n, 0.9, Vector3(-0.6, 3.9, -0.35), c3, Vector3(1, 0.85, 1), 6)
			troncos.append(Vector3(pos.x, pos.z, 0.35 * s)); oclusores.append([n, pos.x, pos.z, 1.9 * s])
		3:
			Lib.cil(n, 0.1, 0.17, 4.0, Vector3(0, 2.0, 0), Color(0.55, 0.43, 0.28), 6)
			for k in range(7):
				var pv := Lib.pivo(n, Vector3(0, 4.0, 0)); pv.rotation.y = k * TAU / 7.0
				Lib.cx(pv, Vector3(0.42, 0.06, 1.9), Vector3(0, -0.3, 0.9), Color(0.2, 0.55, 0.2) if k % 2 == 0 else Color(0.3, 0.65, 0.22), Vector3(0.42, 0, 0))
			Lib.esf(n, 0.16, Vector3(0.14, 3.85, 0.1), Color(0.35, 0.22, 0.1), Vector3.ONE, 5)
			Lib.esf(n, 0.16, Vector3(-0.12, 3.82, -0.1), Color(0.35, 0.22, 0.1), Vector3.ONE, 5)
			troncos.append(Vector3(pos.x, pos.z, 0.22 * s)); oclusores.append([n, pos.x, pos.z, 1.6 * s])
		4:
			Lib.esf(n, 0.6, Vector3(0, 0.3, 0), Color(0.2, 0.5, 0.2), Vector3(1.2, 0.7, 1), 6)
			Lib.esf(n, 0.4, Vector3(0.5, 0.25, 0.2), Color(0.3, 0.62, 0.24), Vector3(1, 0.8, 1), 5)
			if rng.randf() < 0.4: Lib.esf(n, 0.1, Vector3(0.1, 0.72, 0.2), Color(0.9, 0.2, 0.3), Vector3.ONE, 4)
		6:   # bananeira
			Lib.cil(n, 0.13, 0.2, 2.0, Vector3(0, 1.0, 0), Color(0.45, 0.6, 0.25), 6)
			for k in range(6):
				var pb := Lib.pivo(n, Vector3(0, 2.0, 0)); pb.rotation.y = k * TAU / 6.0 + 0.3
				Lib.cx(pb, Vector3(0.6, 0.05, 1.7), Vector3(0, 0.45, 0.7), Color(0.35, 0.72, 0.2) if k % 2 == 0 else Color(0.45, 0.8, 0.25), Vector3(-0.55, 0, 0))
			Lib.esf(n, 0.2, Vector3(0.2, 1.75, 0.15), Color(0.95, 0.85, 0.2), Vector3(0.7, 1.3, 0.7), 5)
			troncos.append(Vector3(pos.x, pos.z, 0.25 * s)); oclusores.append([n, pos.x, pos.z, 1.5 * s])
		_:
			Lib.esf(n, 0.7, Vector3(0, 0.25, 0), Color(0.5, 0.5, 0.48), Vector3(1.2, 0.75, 1), 5)
			Lib.esf(n, 0.4, Vector3(0.6, 0.15, 0.3), Color(0.42, 0.42, 0.4), Vector3(1, 0.8, 1), 5)
			troncos.append(Vector3(pos.x, pos.z, 0.7 * s))

func empurrar(p: Node3D) -> void:
	for t in troncos:
		var dx: float = p.position.x - t.x; var dz: float = p.position.z - t.y
		var rr: float = t.z + 0.35
		var d2 := dx * dx + dz * dz
		if d2 < rr * rr and d2 > 0.0001:
			var d := sqrt(d2)
			p.position.x = t.x + dx / d * rr; p.position.z = t.y + dz / d * rr

func _montar_camera() -> void:
	camera = Camera3D.new(); camera.fov = 66.0; camera.current = true; camera.far = 220.0
	add_child(camera)

func _mouse(preso: bool) -> void:
	if DisplayServer.get_name() == "headless" or cam_fixa or sem_mouse: return
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED if preso else Input.MOUSE_MODE_VISIBLE
var sem_mouse := false

# ---------------- HUD ----------------
func _montar_hud() -> void:
	hud = CanvasLayer.new(); add_child(hud); hud.visible = false
	moldura = Panel.new(); moldura.set_anchors_preset(Control.PRESET_FULL_RECT); moldura.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sm := StyleBoxFlat.new(); sm.bg_color = Color(0, 0, 0, 0); sm.border_color = Color(0.85, 0.08, 0.05); sm.set_border_width_all(26); sm.border_blend = true
	moldura.add_theme_stylebox_override("panel", sm); moldura.modulate.a = 0.0; hud.add_child(moldura)
	lbl_topo = _label(34, HORIZONTAL_ALIGNMENT_CENTER)
	lbl_topo.anchor_right = 1; lbl_topo.offset_top = 6; hud.add_child(lbl_topo)
	lbl_sub = _label(16, HORIZONTAL_ALIGNMENT_CENTER)
	lbl_sub.anchor_right = 1; lbl_sub.offset_top = 46; hud.add_child(lbl_sub)
	barra_chefe_bg = ColorRect.new(); barra_chefe_bg.color = Tela.TINTA
	barra_chefe_bg.anchor_left = 0.5; barra_chefe_bg.anchor_right = 0.5
	barra_chefe_bg.offset_left = -250; barra_chefe_bg.offset_right = 250; barra_chefe_bg.offset_top = 72; barra_chefe_bg.offset_bottom = 90
	barra_chefe_bg.visible = false; hud.add_child(barra_chefe_bg)
	barra_chefe = ColorRect.new(); barra_chefe.color = Color(0.85, 0.2, 0.45)
	barra_chefe.position = Vector2(3, 3); barra_chefe.size = Vector2(494, 12); barra_chefe_bg.add_child(barra_chefe)
	# minimapa no canto de cima, à direita, com abates e moedas embaixo
	minimapa = MiniMapa.new(); minimapa.w = self; minimapa.mouse_filter = Control.MOUSE_FILTER_IGNORE
	minimapa.anchor_left = 1; minimapa.anchor_right = 1; minimapa.offset_left = -208; minimapa.offset_right = -14; minimapa.offset_top = 12; minimapa.offset_bottom = 206
	hud.add_child(minimapa)
	lbl_dir = _label(17, HORIZONTAL_ALIGNMENT_RIGHT)
	lbl_dir.anchor_left = 1; lbl_dir.anchor_right = 1; lbl_dir.offset_left = -400; lbl_dir.offset_right = -14; lbl_dir.offset_top = 210; hud.add_child(lbl_dir)
	# mini inventário: cartas de atributo pegas, no canto de cima à esquerda
	caixa_inv = HFlowContainer.new(); caixa_inv.position = Vector2(12, 12); caixa_inv.size = Vector2(300, 80)
	caixa_inv.add_theme_constant_override("h_separation", 4); caixa_inv.add_theme_constant_override("v_separation", 4)
	caixa_inv.mouse_filter = Control.MOUSE_FILTER_IGNORE; hud.add_child(caixa_inv)
	# retrato + vida + XP, embaixo à esquerda
	var canto := Control.new(); canto.anchor_top = 1; canto.anchor_bottom = 1; canto.offset_top = -84; canto.offset_left = 14
	canto.mouse_filter = Control.MOUSE_FILTER_IGNORE; hud.add_child(canto)
	retrato = Panel.new(); retrato.position = Vector2(0, 0); retrato.size = Vector2(68, 68); retrato.clip_contents = true; canto.add_child(retrato)
	lbl_nome = _label(14, HORIZONTAL_ALIGNMENT_LEFT); lbl_nome.position = Vector2(78, -4); canto.add_child(lbl_nome)
	lbl_nv = _label(14, HORIZONTAL_ALIGNMENT_RIGHT); lbl_nv.position = Vector2(78, -4); lbl_nv.size = Vector2(262, 20); canto.add_child(lbl_nv)
	var bg := Panel.new(); bg.add_theme_stylebox_override("panel", Tela.caixa(Tela.TINTA, 2, Tela.PAPEL, 3, 4))
	bg.position = Vector2(76, 18); bg.size = Vector2(266, 30); canto.add_child(bg)
	barra_lag = ColorRect.new(); barra_lag.color = Tela.PAPEL
	barra_lag.position = Vector2(80, 22); barra_lag.size = Vector2(258, 22); canto.add_child(barra_lag)
	barra_vida = ColorRect.new(); barra_vida.color = Tela.URUCUM
	barra_vida.position = Vector2(80, 22); barra_vida.size = Vector2(258, 22); canto.add_child(barra_vida)
	var brilho := ColorRect.new(); brilho.color = Color(1, 1, 1, 0.16); brilho.position = Vector2(80, 22); brilho.size = Vector2(258, 7); canto.add_child(brilho)
	lbl_vida = _label(16, HORIZONTAL_ALIGNMENT_CENTER)
	lbl_vida.position = Vector2(80, 20); lbl_vida.size = Vector2(258, 24); canto.add_child(lbl_vida)
	var bgx := Panel.new(); bgx.add_theme_stylebox_override("panel", Tela.caixa(Tela.TINTA, 2, Tela.PAPEL, 0, 3))
	bgx.position = Vector2(76, 52); bgx.size = Vector2(266, 14); canto.add_child(bgx)
	barra_xp = ColorRect.new(); barra_xp.color = Tela.IPE
	barra_xp.position = Vector2(79, 55); barra_xp.size = Vector2(0, 8); canto.add_child(barra_xp)
	# painel da build (segurar Tab)
	painel_info = Tela.painel(Color(1.0, 0.97, 0.86, 0.96), 3)
	painel_info.anchor_left = 0.5; painel_info.anchor_right = 0.5; painel_info.anchor_top = 0.08; painel_info.anchor_bottom = 0.08
	painel_info.grow_horizontal = Control.GROW_DIRECTION_BOTH; painel_info.grow_vertical = Control.GROW_DIRECTION_END
	caixa_placar = HBoxContainer.new(); caixa_placar.add_theme_constant_override("separation", 10); painel_info.add_child(caixa_placar)
	painel_info.visible = false; painel_info.mouse_filter = Control.MOUSE_FILTER_IGNORE; hud.add_child(painel_info)
	# quadrinhos dos golpes, do especial e do ultimate, embaixo no meio
	caixa_slots = HBoxContainer.new(); caixa_slots.anchor_left = 0.5; caixa_slots.anchor_right = 0.5; caixa_slots.anchor_top = 1; caixa_slots.anchor_bottom = 1
	caixa_slots.offset_top = -80; caixa_slots.offset_bottom = -14; caixa_slots.grow_horizontal = Control.GROW_DIRECTION_BOTH
	caixa_slots.alignment = BoxContainer.ALIGNMENT_CENTER; caixa_slots.add_theme_constant_override("separation", 10); hud.add_child(caixa_slots)
	lbl_combo = _label(28, HORIZONTAL_ALIGNMENT_RIGHT)
	lbl_combo.anchor_left = 1; lbl_combo.anchor_right = 1; lbl_combo.anchor_top = 0.36; lbl_combo.anchor_bottom = 0.36
	lbl_combo.offset_left = -420; lbl_combo.offset_right = -22
	lbl_combo.add_theme_color_override("font_color", Tela.IPE); hud.add_child(lbl_combo)
	lbl_centro = _label(40, HORIZONTAL_ALIGNMENT_CENTER)
	lbl_centro.anchor_right = 1; lbl_centro.anchor_top = 0.3; hud.add_child(lbl_centro)

# quadrinho de habilidade: gravura, sombra de recarga que desce, tecla e nível
func _quadro(arte: String, tecla: String, tam: float) -> Dictionary:
	var p := Panel.new(); p.custom_minimum_size = Vector2(tam, tam); p.size_flags_vertical = Control.SIZE_SHRINK_END
	p.add_theme_stylebox_override("panel", Tela.caixa(Tela.PAPEL, 3, Tela.TINTA, 4, 5))
	var im := Tela.imagem("a_" + arte, Vector2(tam - 8, tam - 8)); im.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	im.position = Vector2(4, 4); im.size = Vector2(tam - 8, tam - 8); im.clip_contents = true; p.add_child(im)
	var som := ColorRect.new(); som.color = Color(0.1, 0.07, 0.05, 0.74); som.position = Vector2(4, 4); som.size = Vector2(tam - 8, 0); p.add_child(som)
	var tx := _label(int(tam * 0.36), HORIZONTAL_ALIGNMENT_CENTER); tx.position = Vector2(0, tam * 0.24); tx.size = Vector2(tam, tam * 0.5); p.add_child(tx)
	var nv := _label(15, HORIZONTAL_ALIGNMENT_RIGHT); nv.position = Vector2(0, tam - 24); nv.size = Vector2(tam - 5, 20); p.add_child(nv)
	if tecla != "":
		var et := Panel.new(); et.add_theme_stylebox_override("panel", Tela.caixa(Tela.IPE, 2, Tela.TINTA, 0, 4))
		var lt := 22.0 + maxf(0.0, tecla.length() - 1.0) * 9.0
		et.position = Vector2(-7, -9); et.size = Vector2(lt, 22); p.add_child(et)
		var tk := Tela.rotulo(tecla, 13, Tela.TINTA, HORIZONTAL_ALIGNMENT_CENTER, true); tk.size = Vector2(lt, 20); et.add_child(tk)
	caixa_slots.add_child(p)
	return {"no": p, "som": som, "txt": tx, "nv": nv, "tam": tam}

func _refazer_slots() -> void:
	for c in caixa_slots.get_children(): c.queue_free()
	_slots = []
	for g in player.golpes: _slots.append(_quadro(Dados.GOLPES[g["id"]]["arte"], "", 50.0))
	var vao := Control.new(); vao.custom_minimum_size = Vector2(10, 0); caixa_slots.add_child(vao)
	var artes: Array = {"capoeirista": ["au", "roda"], "jiujitsu": ["mataleao", "faixapreta"], "benzedeira": ["banho", "vela"], "cangaceiro": ["mira", "rei"], "frevista": ["atabaque", "estrela"], "cordelista": ["mira", "sol"]}[player.classe]
	_slots.append(_quadro(artes[0], Ctrl.nome("q").left(3), 60.0)); _slots.append(_quadro(artes[1], Ctrl.nome("r").left(3), 60.0))

func _hud_heroi() -> void:
	var c: Dictionary = Dados.CLASSES[player.classe]
	retrato.add_theme_stylebox_override("panel", Tela.caixa(c["cor"], 4, Tela.TINTA, 4, 6))
	for f in retrato.get_children(): f.queue_free()
	var im := Tela.imagem("s_" + player.classe, Vector2(62, 78)); im.position = Vector2(3, 3); im.size = Vector2(62, 78); retrato.add_child(im)
	lbl_nome.text = String(c["apelido"]).to_upper()
	_refazer_slots()

func _label(tam: int, al: int) -> Label:
	var l := Label.new()
	l.add_theme_font_override("font", Tela.fonte())
	l.add_theme_font_size_override("font_size", tam)
	l.add_theme_color_override("font_color", Color(0.95, 0.9, 0.78))
	l.add_theme_color_override("font_outline_color", Color(0.1, 0.08, 0.05))
	l.add_theme_constant_override("outline_size", 6)
	l.horizontal_alignment = al
	return l

# ---------------- co-op por LAN: cada pessoa vira um Jogador sincronizado pela rede ----------------
func iniciar_coop() -> void:
	menus.fechar()
	fase = clampi(sel_fase, 0, Dados.FASES.size() - 1)
	_aplicar_luz(int(Dados.FASES[fase]["luz"]))
	hud.visible = true
	estado = "jogo"
	jogadores_rede.clear(); player = null
	lbl_centro.text = "CO-OP (LAN)"; _piscar_centro()
	Rede.apresentar_se(sel_heroi, String(Salvo.d["nome_jogador"]))
	_mouse(true)

func _coop_spawns() -> void:
	for id in Rede.ids():
		if not jogadores_rede.has(id) and Rede.heroi_por_id.has(id):
			_spawnar_jogador_rede(id, Rede.heroi_por_id[id])

func _spawnar_jogador_rede(id: int, heroi: String) -> void:
	var j := Jogador.new(); j.name = "Jogador_%d" % id; j.world = self; j.configurar(heroi)
	j.set_multiplayer_authority(id)
	var sinc := MultiplayerSynchronizer.new(); sinc.name = "Sincronia"
	var cfg := SceneReplicationConfig.new()
	for campo in ["position", "rotation", "level", "max_hp", "hp", "dano_mult", "crit", "crit_dano", "atk_speed", "area_mult", "armor", "regen", "golpes"]:
		var np := NodePath(".:%s" % campo)
		cfg.add_property(np); cfg.property_set_replication_mode(np, SceneReplicationConfig.REPLICATION_MODE_ALWAYS)
	sinc.replication_config = cfg
	sinc.set_multiplayer_authority(id)
	j.add_child(sinc)
	add_child(j)
	jogadores_rede[id] = j
	var etiqueta := Label3D.new(); etiqueta.name = "Nome"
	etiqueta.text = String(Rede.nome_por_id.get(id, "?")); etiqueta.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	etiqueta.font_size = 56; etiqueta.pixel_size = 0.0085; etiqueta.outline_size = 14; etiqueta.no_depth_test = true
	etiqueta.position = Vector3(0, 2.25, 0); j.add_child(etiqueta)
	if id == Rede.meu_id():
		player = j
		_hud_heroi()

# quem é o jogador vivo mais perto desse ponto (pra mirar e pra bicho perseguir, no co-op) — sozinho, é sempre "player"
func _alvo_mais_perto(pos: Vector3):
	if not Rede.ativo() or jogadores_rede.is_empty(): return player
	var melhor = player
	var bd: float = pos.distance_squared_to(player.global_position) if player != null else INF
	for id in jogadores_rede:
		var j = jogadores_rede[id]
		if j == null or not is_instance_valid(j) or j.hp <= 0.0: continue
		var d2 := pos.distance_squared_to(j.global_position)
		if d2 < bd: bd = d2; melhor = j
	return melhor

# ainda está na sala? (protege contra mandar RPC pra quem já desconectou no meio da luta)
func _peer_aqui(id: int) -> bool:
	return id == Rede.meu_id() or multiplayer.get_peers().has(id)

# dano em cima de um jogador: se for outra pessoa no co-op, manda pra máquina dela de verdade aplicar
func ferir_jogador(alvo, dmg: float) -> void:
	if alvo == null: return
	if Rede.ativo() and alvo != player:
		for id in jogadores_rede:
			if jogadores_rede[id] == alvo and id != Rede.meu_id():
				if _peer_aqui(id): _sofrer_dano.rpc_id(id, dmg)
				return
	alvo.hurt(dmg)

@rpc("authority", "call_remote", "reliable")
func _sofrer_dano(dmg: float) -> void:
	if player: player.hurt(dmg)

# ---------------- bicho pela rede: o anfitrião manda nascer/morrer pra todo mundo ver ----------------
func _replicar_bicho(e: Inimigo) -> void:
	if not (Rede.ativo() and Rede.sou_host()): return
	_proximo_net_id += 1
	e.net_id = _proximo_net_id
	enemies_por_net_id[e.net_id] = e
	_spawnar_inimigo_rede.rpc(e.net_id, e.tipo, e.raio / 0.45, e.hp, e.max_hp_cache, e.dmg, e.speed, e.xp_val, e.moeda_val, e.is_boss, e.chefe_tipo, e.elite)

@rpc("authority", "call_remote", "reliable")
func _spawnar_inimigo_rede(net_id: int, tipo: String, escala: float, hp: float, maxhp: float, dmg: float, speed: float, xp: float, moeda: float, chefe: bool, chefe_tipo: String, elite: bool) -> void:
	if Rede.sou_host(): return
	var e := Inimigo.new(); e.name = "Bicho_%d" % net_id; e.world = self; add_child(e)
	e.net_id = net_id
	e.setup(tipo, escala, null)
	e.position = Vector3.ZERO  # a posição de verdade já chega no próximo quadro, pela sincronia abaixo
	e.hp = hp; e.max_hp_cache = maxhp; e.dmg = dmg; e.speed = speed; e.xp_val = xp; e.moeda_val = moeda
	e.is_boss = chefe; e.chefe_tipo = chefe_tipo; e.elite = elite
	e.set_multiplayer_authority(1)
	var sinc := MultiplayerSynchronizer.new(); sinc.name = "Sincronia"
	var cfg := SceneReplicationConfig.new()
	for campo in ["position", "rotation", "hp"]:
		var np := NodePath(".:%s" % campo)
		cfg.add_property(np); cfg.property_set_replication_mode(np, SceneReplicationConfig.REPLICATION_MODE_ALWAYS)
	sinc.replication_config = cfg; sinc.set_multiplayer_authority(1)
	e.add_child(sinc)
	enemies.append(e); enemies_por_net_id[net_id] = e
	if chefe: chefe_veio = true; self.chefe = e

@rpc("authority", "call_remote", "reliable")
func _remover_inimigo_rede(net_id: int) -> void:
	var e = enemies_por_net_id.get(net_id)
	enemies_por_net_id.erase(net_id)
	if e == null or not is_instance_valid(e): return
	if e.is_boss and not Rede.sou_host(): chefe_morto = true; chefe = null
	enemies.erase(e)
	if not e.dead: e.dead = true; e.queue_free()   # cliente: só some; o anfitrião já tratou on_enemy_killed de verdade

@rpc("authority", "call_remote", "reliable")
func _marcar_furia_rede() -> void:
	furia = true

# quando o dono de verdade do bicho não é esta máquina, o golpe vira um pedido pro anfitrião (ver Inimigo.take_damage)
@rpc("any_peer", "call_remote", "reliable")
func retransmitir_dano(net_id: int, d: float, crit: int) -> void:
	if not Rede.sou_host(): return
	var quem := multiplayer.get_remote_sender_id()
	var e = enemies_por_net_id.get(net_id)
	if e == null or not is_instance_valid(e) or e.dead: return
	e.ultimo_atacante = quem
	e.take_damage(d, crit)

@rpc("authority", "call_remote", "reliable")
func _premiar_abate(xp: float, moeda_ganha: float) -> void:
	if player == null: return
	moedas += moeda_ganha
	player.gain_xp(xp)
	if player.roubo > 0.0 and player.hp > 0.0: player.hp = minf(player.max_hp, player.hp + player.roubo)
	if player.ult_t <= 0.0: player.ult = minf(1.0, player.ult + 1.0 / Dados.ULT_ABATES)

# ---------------- arraial (menu) ----------------
func _montar_menu() -> void:
	if Salvo.d.has("heroi") and Dados.CLASSES.has(Salvo.d["heroi"]): sel_heroi = Salvo.d["heroi"]
	sel_fase = clampi(int(Salvo.d["fase"]), 0, mini(int(Salvo.d["fase_max"]), Dados.FASES.size() - 1))
	estado = "menu"
	menus.titulo()

func iniciar_jogo(id: String, f: int = 0, tutorial: bool = false) -> void:
	menus.fechar()
	fase = clampi(f, 0, Dados.FASES.size() - 1)
	Salvo.d["heroi"] = id; Salvo.d["fase"] = fase; Salvo.salvar()
	_aplicar_luz(int(Dados.FASES[fase]["luz"]))
	player = Jogador.new(); player.world = self; player.configurar(id)
	add_child(player)
	hud.visible = true
	_hud_heroi()
	for it in Dados.LOJA: loja_precos[it["id"]] = int(it["preco"])
	estado = "jogo"
	if tutorial:
		tut = 0; tut_t = 0.0; _tut_pos = player.position; _tut_a = cam_yaw
	else:
		_montar_objetos()
		lbl_centro.text = "FASE %d — %s" % [fase + 1, String(Dados.FASES[fase]["nome"]).to_upper()]
		_piscar_centro()
	_mouse(true)

# Luz da fase: 0 dia, 1 noite de lua, 2 queimada (fim de tarde alaranjado)
func _aplicar_luz(modo: int) -> void:
	if modo == 1:
		_psm.sky_top_color = Color(0.03, 0.05, 0.16); _psm.sky_horizon_color = Color(0.13, 0.18, 0.34)
		_psm.ground_horizon_color = Color(0.13, 0.18, 0.34); _psm.ground_bottom_color = Color(0.03, 0.06, 0.08)
		_sol.light_color = Color(0.62, 0.72, 1.0); _sol.light_energy = 0.55
		_env.ambient_light_energy = 0.5; _env.fog_light_color = Color(0.1, 0.14, 0.28); _env.fog_density = 0.009
	elif modo == 3:
		_psm.sky_top_color = Color(0.16, 0.36, 0.74); _psm.sky_horizon_color = Color(1.0, 0.78, 0.55)
		_psm.ground_horizon_color = Color(1.0, 0.78, 0.55); _psm.ground_bottom_color = Color(0.2, 0.3, 0.3)
		_sol.light_color = Color(1.0, 0.88, 0.7); _sol.light_energy = 1.15; _sol.rotation_degrees = Vector3(-34, 18, 0)
		_env.fog_light_color = Color(0.75, 0.8, 0.9); _env.fog_density = 0.0016
	elif modo == 2:
		_psm.sky_top_color = Color(0.5, 0.25, 0.2); _psm.sky_horizon_color = Color(1.0, 0.6, 0.3)
		_psm.ground_horizon_color = Color(1.0, 0.6, 0.3); _psm.ground_bottom_color = Color(0.25, 0.12, 0.08)
		_sol.light_color = Color(1.0, 0.62, 0.38); _sol.light_energy = 0.95; _sol.rotation_degrees = Vector3(-22, -35, 0)
		_env.fog_light_color = Color(0.85, 0.45, 0.25); _env.fog_density = 0.012

# ---------------- laço ----------------
func _process(delta: float) -> void:
	if fogo: fogo.scale = Vector3.ONE * (1.0 + 0.12 * sin(Time.get_ticks_msec() * 0.011)) + Vector3(0, 0.2 * sin(Time.get_ticks_msec() * 0.017), 0)
	if estado == "menu": cam_yaw += delta * 0.12
	_seguir_camera(delta)
	var st := Ctrl.start()                    # Start do controle = ESC
	if st and not _start_ant:
		if estado == "jogo" and not levelup_aberto: pausar()
		else: menus.esc()
	_start_ant = st
	if Engine.get_process_frames() % 30 == 0: _pixel()
	if estado == "fim":
		if Input.is_physical_key_pressed(KEY_ENTER) or Input.is_physical_key_pressed(KEY_KP_ENTER):
			get_tree().reload_current_scene()
		return
	if estado != "jogo" or levelup_aberto: return
	if Rede.ativo(): _coop_spawns()
	if player == null: return       # co-op: esperando o próprio boneco chegar pela rede (dura um quadro só)
	time += delta
	if tut >= 0: _tutorial(delta)
	elif Rede.ativo() and not Rede.sou_host(): pass   # os bichos são mandados pelo anfitrião, chegam pela rede
	else: _dirigir(delta)
	_update_projectiles(delta)
	_tiros(delta)
	_hab_update(delta)
	_vaga_lumes(delta)
	_objetos(delta)
	_pombas_girando(delta)
	_poderes(delta)
	_hud()
	var cj := Ctrl.cam()                      # analógico direito gira a câmera
	if cj != Vector2.ZERO:
		cam_yaw -= cj.x * 2.6 * delta * Tela.opc("sens")
		cam_pitch = clampf(cam_pitch + cj.y * 1.6 * delta * Tela.opc("sens"), 0.08, 1.25)
	if chefe_morto and Ctrl.ap("sair"): _encerrar("FASE VENCIDA!", Color(1.0, 0.85, 0.3))
	_teste_tick()

# câmera em terceira pessoa: orbita o herói conforme o mouse
func _seguir_camera(delta: float) -> void:
	if cam_fixa: return
	var foco := Vector3(0, Lib.h(0, 0) + 1.4, 0)
	if player: foco = player.global_position + Vector3(0, 1.5, 0)
	var dir := Vector3(sin(cam_yaw) * cos(cam_pitch), sin(cam_pitch), cos(cam_yaw) * cos(cam_pitch))
	var alvo := foco + dir * cam_dist
	alvo.y = maxf(alvo.y, Lib.h(alvo.x, alvo.z) + 0.6)
	camera.global_position = camera.global_position.lerp(alvo, clampf(delta * 14.0, 0, 1))
	camera.look_at(foco, Vector3.UP)
	if tremor > 0.0:
		camera.global_position += Vector3(randf_range(-1, 1), randf_range(-1, 1), randf_range(-1, 1)) * tremor * 0.3
		tremor = maxf(0.0, tremor - delta * 2.6)
	# árvore no caminho entre a câmera e o herói some, para nunca tapar a visão
	var c2 := Vector2(camera.global_position.x, camera.global_position.z); var f2 := Vector2(foco.x, foco.z)
	for o in oclusores:
		var pt := Vector2(o[1], o[2])
		o[0].visible = pt.distance_to(Geometry2D.get_closest_point_to_segment(pt, c2, f2)) > o[3]

func _input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		var sens := Tela.opc("sens")
		cam_yaw -= event.relative.x * 0.0035 * sens
		cam_pitch = clampf(cam_pitch + event.relative.y * 0.003 * sens, 0.08, 1.25)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		if estado != "jogo" or levelup_aberto: return
		if event.button_index == MOUSE_BUTTON_WHEEL_UP: cam_dist = maxf(6.0, cam_dist - 0.8)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN: cam_dist = minf(22.0, cam_dist + 0.8)
		elif event.button_index == MOUSE_BUTTON_LEFT: _mouse(true)
	if event is InputEventKey and event.pressed and not event.echo and event.physical_keycode == KEY_ESCAPE:
		if estado == "jogo" and not levelup_aberto: pausar()
		else: menus.esc()

# ---------------- pausa (ESC) e opções ----------------
func pausar() -> void:
	if estado != "jogo" or levelup_aberto: return
	estado = "pausa"
	lbl_centro.text = ""
	_mouse(false)
	menus.pausa()

func continuar() -> void:
	if estado != "pausa": return
	menus.fechar()
	estado = "jogo"
	_mouse(true)

func sair_da_fase() -> void:
	if estado != "pausa": return
	if tut >= 0:
		_fim_tutorial(); return
	menus.fechar(); estado = "jogo"
	_encerrar("FASE VENCIDA!" if chefe_morto else "VOCÊ SAIU DA FASE", Color.WHITE)

func aplicar_opcoes() -> void:
	cam_dist = Tela.opc("camera")
	_pixel()

func _pixel() -> void:
	if pixel == null: return
	pixel.visible = Tela.opc("pixel") > 0.5 and estado != "menu"
	pixel.material.set_shader_parameter("px", maxf(2.0, round(DisplayServer.window_get_size().y / 300.0)))

func _notification(what: int) -> void:      # trocou de janela no meio da fase: pausa sozinho
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT and menus != null and estado == "jogo" and not levelup_aberto and _teste_fim == 0.0 and not sem_mouse:
		pausar()

# ---------------- diretor da fase ----------------
# Até o chefe: os bichos vão engrossando devagar. Chefe aos 10 minutos, com 3 para vencer; se não vencer,
# ele enfurece e a mata despeja bicho. Chefe vencido: fase infinita, cada vez mais bicho e mais forte.
func _dirigir(delta: float) -> void:
	if Rede.ativo() and not Rede.sou_host(): return   # só quem hospeda manda nos bichos
	var fm: float = Dados.FASES[fase]["mult"]
	# cada pessoa a mais no co-op deixa os bichos mais fortes e em mais quantidade, pra não ficar fácil demais
	var qtd_jogadores := (Rede.ids().size() if Rede.ativo() else 1)
	var mult_coop := 1.0 + 0.35 * (qtd_jogadores - 1)
	var forca := (1.0 + time / 75.0) * fm * praga * mult_coop
	var intervalo := maxf(0.2, 0.95 - time / 800.0) / (1.0 + 0.25 * (qtd_jogadores - 1))
	var teto := int(150 * (1.0 + 0.5 * (qtd_jogadores - 1)))
	var passo := 1.0
	if chefe_morto:
		extra_t += delta
		forca *= pow(1.0 + extra_t / 60.0, 1.6)
		intervalo = maxf(0.05, 0.3 - extra_t / 600.0) / (1.0 + 0.25 * (qtd_jogadores - 1)); teto = int(230 * (1.0 + 0.5 * (qtd_jogadores - 1)))
		passo = minf(1.8, 1.0 + extra_t / 300.0)
	elif furia:
		intervalo *= 0.3; teto = int(230 * (1.0 + 0.5 * (qtd_jogadores - 1))); passo = 1.25
	spawn_t -= delta
	if spawn_t <= 0.0 and enemies.size() < teto:
		spawn_t = intervalo
		var novo := _nascer(Dados.sortear_bicho(time, fase), forca, 1.0, null, false); novo.speed *= passo
		_replicar_bicho(novo)
	# elite: criatura normal, só que com mais vida e mais dano
	elite_t -= delta
	if elite_t <= 0.0:
		elite_t = 8.0 if chefe_morto else 20.0
		var el := _nascer(Dados.sortear_bicho(time, fase), forca, 1.5, Color(0.98, 0.85, 0.2), false, 6.0, 1.6, 8.0)
		el.moeda_val = 4.0; el.elite = true; _replicar_bicho(el)
	if not chefe_veio and time >= chefe_t:
		chefe_veio = true; furia_t = Dados.FURIA_T
		var f: Dictionary = Dados.FASES[fase]
		chefe = _nascer(f["chefe"], forca, {"mapinguari": 2.6, "mula": 2.1, "boitata": 2.0, "cuca": 1.8, "minhocao": 3.4}.get(f["chefe"], 2.1), null, true)
		chefe.chefe_tipo = f.get("ataque", f["chefe"])
		chefe.hp = 700.0 * forca; chefe.max_hp_cache = chefe.hp
		chefe.dmg = 14.0 * sqrt(forca); chefe.speed = 2.7; chefe.xp_val = 60.0; chefe.moeda_val = 150.0
		_replicar_bicho(chefe)
		lbl_centro.text = "%s\n%s\nVença em 3 minutos" % [f["chefe_nome"], f["chefe_titulo"]]; _piscar_centro()
		Som.tocar("chefe"); Som.voz("v_chefe"); tremor = 0.6
	if chefe_veio and not chefe_morto and not furia:
		furia_t -= delta
		if furia_t <= 0.0:
			furia = true
			if is_instance_valid(chefe):
				chefe.furia = true; chefe.dmg *= 2.5; chefe.speed *= 1.6
				chefe.hp += chefe.max_hp_cache * 0.5; chefe.max_hp_cache = maxf(chefe.max_hp_cache, chefe.hp)
			lbl_centro.text = "O CHEFE ENFURECEU!"; _piscar_centro(); Som.tocar("chefe"); Som.voz("v_furia")
			if Rede.ativo(): _marcar_furia_rede.rpc()

func _pos_spawn() -> Vector3:
	var a := randf() * TAU; var d := SPAWN_RAIO + randf() * 8.0
	var p := player.global_position + Vector3(cos(a) * d, 0, sin(a) * d)
	var r2 := Vector2(p.x, p.z)
	if r2.length() > ARENA + 1.5:        # os bichos saem de dentro da mata
		r2 = r2.normalized() * (ARENA + 1.5); p.x = r2.x; p.z = r2.y
	return p

func _nascer(tipo: String, forca: float, escala: float, cor, e_chefe: bool, mulhp := 1.0, muldmg := 1.0, xpv := 1.0) -> Inimigo:
	var e := Inimigo.new(); e.world = self; add_child(e)
	var bi: Dictionary = Dados.BICHOS.get(tipo, Dados.BICHOS["caipora"])
	e.setup(tipo, escala * float(bi["esc"]) if Dados.BICHOS.has(tipo) else escala, cor); e.position = _pos_spawn(); e.position.y = Lib.h(e.position.x, e.position.z)
	e.hp = float(bi["hp"]) * forca * mulhp; e.max_hp_cache = e.hp
	e.speed = float(bi["vel"]); e.dmg = 6.0 * sqrt(forca) * muldmg * float(bi["dano"]); e.xp_val = xpv * float(bi["xp"])
	e.is_boss = e_chefe
	enemies.append(e)
	if not Salvo.desligado and tut < 0 and Dados.LORE.has(tipo) and not Salvo.d["vistos"].has(tipo):      # primeira vez que aparece: ficha com a história
		Salvo.d["vistos"][tipo] = true
		abrir_escolha("lore:" + tipo)
	return e

# ---------------- GOLPES ----------------
func _nearest(pos: Vector3, maxd: float):
	var melhor = null; var bd := maxd * maxd
	for e in enemies:
		if not is_instance_valid(e) or e.dead: continue
		var dd: Vector3 = e.global_position - pos; dd.y = 0
		var d2 := dd.length_squared()
		if d2 < bd: bd = d2; melhor = e
	return melhor

func cast_golpe(p: Jogador, id: String, nivel: int) -> void:
	var def = Dados.GOLPES[id]
	Salvo.contar("uso_" + id)
	var dmg: float = Dados.dano_golpe(id, nivel) * p.dano_mult
	var cb: float = def.get("crit", 0.0)          # chance extra de crítico do próprio golpe
	if p.crit_certo:
		cb += 1.0; p.crit_certo = false
	var raio: float = def.get("raio", 1.0) * p.area_mult
	var cor: Color = Dados.CLASSES[p.classe]["cor"]
	var alcance: float = def.get("alcance", 20.0)
	match def["tipo"]:
		"ring":
			_ring(p.global_position, raio, dmg, def.get("stun", 0.0), def.get("knock", 0.0), cb)
			_efeito_anel(p.global_position, raio, cor)
		"arco":
			_arco(p, def, dmg, raio)
		"onda":
			_ring(p.global_position, raio, dmg, 0.0, def.get("knock", 0.0), cb)
			_efeito_anel(p.global_position, raio, cor)
			_efeito_anel(p.global_position, raio * 0.6, cor)
		"investida":
			var alvo = _nearest(p.global_position, alcance)
			if alvo == null: return
			var pos: Vector3 = alvo.global_position
			p.guarda_t = 1.0          # fecha a guarda já na entrada
			p.comecar_investida(pos, 18.0, func():
				var k := _ring(p.global_position, raio, dmg, def.get("stun", 0.0), 0.0, cb)
				_efeito_anel(p.global_position, raio, cor)
				p.guarda_t = 0.9
				if k > 0: p.curar(minf(p.max_hp * 0.04, k * (1.5 + p.max_hp * 0.007))))
		"proj_reto":
			var alvo2 = _nearest(p.global_position, alcance)
			var ang := atan2(alvo2.global_position.z - p.global_position.z, alvo2.global_position.x - p.global_position.x) if alvo2 else atan2(p.frente.z, p.frente.x)
			var n: int = int(def.get("n", 1))
			for i in range(n):
				var a := ang + (randf() - 0.5) * float(def.get("spread", 0.0))
				_disparar(p.global_position, Vector3(cos(a), 0, sin(a)) * float(def["vel"]), def, dmg)
		"proj_teleguiado":
			var alvo3 = _nearest(p.global_position, alcance)
			if alvo3 == null: return
			var dir: Vector3 = (alvo3.global_position - p.global_position); dir.y = 0
			dir = dir.normalized()
			var qtd := 1 + int((nivel - 1) / 2.0)     # a cada 2 níveis sai mais um fogo
			for i in range(qtd):
				var d2 := dir.rotated(Vector3.UP, (i - (qtd - 1) * 0.5) * 0.5)
				_disparar(p.global_position, d2 * float(def["vel"]), def, dmg, alvo3 if i == 0 else null)
		"proj_estoura":
			var alvo4 = _nearest(p.global_position, alcance)
			var dir2: Vector3 = (alvo4.global_position - p.global_position) if alvo4 else p.frente
			dir2.y = 0
			_disparar(p.global_position, dir2.normalized() * float(def["vel"]), def, dmg)

# devolve quantos bichos caíram com o golpe
# Todo dano do herói passa por aqui: sorteia o crítico. Chance acima de 100% vira crítico duplo, e triplo acima de 200%.
func ferir(e, dmg: float, bonus: float = 0.0) -> void:
	var ch: float = player.crit + bonus
	var n := int(ch)
	if randf() < ch - n: n += 1
	n = mini(n, 3)
	if n > 0: dmg *= pow(player.crit_dano, n)
	dano_total += dmg; maior_dano = maxf(maior_dano, dmg)
	Som.tocar("crit" if n > 0 else "hit", -6.0 if n == 0 else -2.0, 0.15, 0.06)
	if n > 0:
		Salvo.contar("criticos")
		if n > 1: tremor = maxf(tremor, 0.12 * n)
	e.take_damage(dmg, n)

func _ring(centro: Vector3, raio: float, dmg: float, stun: float, knock: float, cb: float = 0.0) -> int:
	var caiu := 0
	for e in enemies.duplicate():
		if not is_instance_valid(e) or e.dead: continue
		var dd: Vector3 = e.global_position - centro; dd.y = 0
		if dd.length() <= raio + e.raio * 0.5:
			ferir(e, dmg, cb)
			if e.dead: caiu += 1; continue
			if stun > 0.0: e.stun_t = maxf(e.stun_t, stun if not e.is_boss else stun * 0.2)
			if knock > 0.0 and not e.is_boss: e.position += dd.normalized() * knock
	return caiu

func _arco(p: Jogador, def: Dictionary, dmg: float, raio: float) -> void:
	var alvo = _nearest(p.global_position, raio + 1.5)
	var dir: Vector3 = p.frente
	if alvo: dir = (alvo.global_position - p.global_position); dir.y = 0; dir = dir.normalized()
	var meia: float = def.get("ang", 1.2) * 0.5
	for e in enemies.duplicate():
		if not is_instance_valid(e) or e.dead: continue
		var dd: Vector3 = e.global_position - p.global_position; dd.y = 0
		if dd.length() > raio + e.raio * 0.5: continue
		if dd.length() > 0.5 and dd.normalized().angle_to(dir) > meia: continue
		ferir(e, dmg, def.get("crit", 0.0))
		if e.dead: continue
		if def.has("stun"): e.stun_t = maxf(e.stun_t, def["stun"] if not e.is_boss else def["stun"] * 0.2)
		if def.has("knock") and not e.is_boss: e.position += dd.normalized() * def["knock"]
	_efeito_setor(p.global_position, atan2(dir.z, dir.x), raio, def.get("ang", 1.2), Dados.CLASSES[p.classe]["cor"])

# ---------------- projéteis ----------------
func _disparar(pos: Vector3, vel: Vector3, def: Dictionary, dmg: float, alvo = null) -> void:
	var n := MeshInstance3D.new()
	var sm := SphereMesh.new(); sm.radius = def["raio"]; sm.height = def["raio"] * 2.0
	n.mesh = sm
	sm.radial_segments = 8; sm.rings = 4
	n.material_override = Lib.mat(def.get("cor", Color.WHITE), 1.6)
	n.position = pos + Vector3(0, 0.9, 0)
	add_child(n)
	projectiles.append({
		"node": n, "vel": vel, "raio": def["raio"] + 0.4, "dmg": dmg,
		"pierce": def.get("pierce", 0), "vida": def.get("vida", 2.0),
		"homing": def["tipo"] == "proj_teleguiado", "alvo": alvo,
		"boom": def.get("boom", 0.0), "hits": {}, "cb": def.get("crit", 0.0)
	})

func _update_projectiles(delta: float) -> void:
	for pr in projectiles.duplicate():
		var n: Node3D = pr["node"]
		if not is_instance_valid(n): projectiles.erase(pr); continue
		pr["vida"] -= delta
		if pr["homing"]:
			if not is_instance_valid(pr["alvo"]) or pr["alvo"].dead:
				pr["alvo"] = _nearest(n.global_position, 12.0)
			if pr["alvo"]:
				var want: Vector3 = (pr["alvo"].global_position - n.global_position); want.y = 0
				pr["vel"] = pr["vel"].lerp(want.normalized() * pr["vel"].length(), 0.12)
		n.global_position += pr["vel"] * delta
		n.position.y = Lib.h(n.position.x, n.position.z) + 0.9
		for e in enemies:
			if not is_instance_valid(e) or e.dead or pr["hits"].has(e): continue
			var dd: Vector3 = e.global_position - n.global_position; dd.y = 0
			if dd.length() < pr["raio"] + 0.4:
				ferir(e, pr["dmg"], pr["cb"]); pr["hits"][e] = true
				if pr["boom"] > 0.0:
					_ring(n.global_position, pr["boom"], pr["dmg"] * 0.6, 0.0, 0.5)
					_efeito_anel(n.global_position, pr["boom"], Color(0.49, 0.78, 0.4)); pr["vida"] = 0
				if pr["pierce"] <= 0: pr["vida"] = 0
				else: pr["pierce"] -= 1
		if pr["vida"] <= 0:
			if pr["boom"] > 0.0 and pr["hits"].is_empty():
				_ring(n.global_position, pr["boom"], pr["dmg"] * 0.6, 0.0, 0.5)
				_efeito_anel(n.global_position, pr["boom"], Color(0.49, 0.78, 0.4))
			n.queue_free(); projectiles.erase(pr)

# ---------------- mortes, XP, nível ----------------
func on_enemy_killed(e) -> void:
	enemies.erase(e); kills += 1
	Som.tocar("morte", -8.0, 0.2, 0.07)
	_puff(e.global_position, e.boneco.cor_base, e.raio / 0.45)
	Salvo.contar("abates"); Salvo.contar("abates_" + e.tipo)
	var mm := 1.0 + 0.10 * Salvo.nivel("moedas")
	if chefe_morto: mm *= 1.0 + extra_t / 90.0        # quanto mais tempo depois do chefe, mais vale cada bicho
	var moeda_ganha: float = e.moeda_val * mm
	combo += 1; combo_t = 3.0
	if combo > int(Salvo.d["contadores"].get("combo_max", 0)): Salvo.d["contadores"]["combo_max"] = combo
	if Dados.COMBO_GRITOS.has(combo):
		lbl_centro.text = "%s\n×%d — ◉ +%d" % [Dados.COMBO_GRITOS[combo], combo, combo / 5]; _piscar_centro()
		moeda_ganha += combo / 5.0
	if e.chefe_tipo == "cuca": dar_poder("mula")
	elif e.elite and Dados.PODERES.has(e.tipo) and randf() < 0.4: dar_poder(e.tipo)
	if e.chefe_tipo == "cuca":
		_novo_objeto("bau", e.global_position + Vector3(1.4, 0, 0), 0); _novo_objeto("bau", e.global_position - Vector3(1.4, 0, 0), 0)
		lbl_centro.text = "A CUCA FOI EMBORA!\nO tesouro é seu"; _piscar_centro(); Som.tocar("venceu"); tremor = 0.7
	elif e.elite and randf() < 0.4: _novo_objeto("bau", e.global_position, 0)
	if e.is_boss:
		chefe_morto = true; chefe = null; tremor = 1.0; Som.tocar("venceu"); Som.voz("v_venceu")
		_novo_objeto("bau", e.global_position + Vector3(1.5, 0, 0), 0); _novo_objeto("bau", e.global_position - Vector3(1.5, 0, 0), 0)
		Salvo.contar("chefes")
		Salvo.d["fase_max"] = maxi(int(Salvo.d["fase_max"]), mini(fase + 1, Dados.FASES.size() - 1))
		Salvo.salvar()
		lbl_centro.text = "DERROTOU O CHEFE!\nAgora aguente o quanto der — %s para sair" % Ctrl.nome("sair"); _piscar_centro()
	# XP e moeda são compartilhados: todo mundo ganha, não só quem acertou o golpe final
	moedas += moeda_ganha
	if player.roubo > 0.0 and player.hp > 0.0: player.hp = minf(player.max_hp, player.hp + player.roubo)
	if player.ult_t <= 0.0: player.ult = minf(1.0, player.ult + 1.0 / Dados.ULT_ABATES)
	spawn_firefly(e.global_position, e.xp_val)   # continua: eu ando por cima do vaga-lume pra pegar o meu, como sempre foi
	if Rede.ativo():
		for id in jogadores_rede:
			if id != Rede.meu_id() and _peer_aqui(id): _premiar_abate.rpc_id(id, e.xp_val, moeda_ganha)
		enemies_por_net_id.erase(e.net_id)
		_remover_inimigo_rede.rpc(e.net_id)

func spawn_firefly(pos: Vector3, v: float) -> void:
	var f := MeshInstance3D.new()
	var sm := SphereMesh.new(); sm.radius = 0.12; sm.height = 0.24; f.mesh = sm
	sm.radial_segments = 6; sm.rings = 3
	f.material_override = Lib.mat(Color(1.0, 0.85, 0.2) if v < 5 else Color(1.0, 0.35, 0.2), 2.5)
	f.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	f.position = pos + Vector3(0, 0.3, 0); add_child(f)
	fireflies.append({"node": f, "v": v, "mag": false})

func _vaga_lumes(delta: float) -> void:
	var pp: Vector3 = player.global_position
	for fr in fireflies.duplicate():
		var n: Node3D = fr["node"]
		if not is_instance_valid(n): fireflies.erase(fr); continue
		var to: Vector3 = pp - n.global_position; to.y = 0
		var d := to.length()
		if fr["mag"] or d < 2.6 * player.ima:
			fr["mag"] = true; n.global_position += to.normalized() * (6.0 + delta * 40.0) * delta
		n.position.y = Lib.h(n.position.x, n.position.z) + 0.45 + sin(time * 5.0 + n.position.x) * 0.1
		if d < 0.7:
			player.gain_xp(fr["v"]); n.queue_free(); fireflies.erase(fr)
			Som.tocar("xp", -9.0, 0.25, 0.04)

func _ofertas(tipo: String) -> Array:
	if tipo == "bau": return player.ofertas(2, false)
	if tipo == "oratorio": return player.ofertas(1, true)
	if tipo == "contrabando": return player.ofertas(3, false)
	if tipo == "caminho": return player.ofertas(4, false)
	return player.ofertas()

# Abre a escolha de carta. Se já houver uma aberta, a nova espera na fila (nada se perde).
func abrir_escolha(tipo: String) -> void:
	var ficha := tipo.begins_with("lore:")
	if _teste_fim > 0.0:         # no auto-teste, pega uma carta sozinho
		if not ficha: player.aplicar_carta(_ofertas(tipo)[0])
		return
	if levelup_aberto or estado != "jogo":
		_fila.append(tipo); return
	levelup_aberto = true
	lbl_centro.text = ""
	if ficha:
		Som.tocar("carta"); menus.lore(tipo.substr(5)); _mouse(false); return
	Som.tocar({"bau": "bau", "oratorio": "bencao", "contrabando": "loja", "caminho": "bencao"}.get(tipo, "nivel"))
	if tipo == "bau": Som.voz("v_bau")
	menus.nivel(player, _ofertas(tipo), tipo)
	_mouse(false)

func _escolher_carta(p: Jogador, card: Dictionary) -> void:
	p.aplicar_carta(card)
	Som.tocar("carta")
	if card.get("rar", 0) == 5:
		lbl_centro.text = "CARTA MÍTICA!"; _piscar_centro(); Som.voz("v_mitica"); tremor = 0.6
	menus.fechar()
	levelup_aberto = false
	if not _fila.is_empty():
		abrir_escolha(_fila.pop_front()); return
	_mouse(true)

# ---------------- efeitos ----------------
func _efeito_anel(centro: Vector3, raio: float, cor: Color) -> void:
	_efeito_setor(centro, 0.0, raio, TAU, cor)

# Rastro do golpe: um leque (ou roda inteira) rente ao chão que abre e some.
func _efeito_setor(centro: Vector3, ang_dir: float, raio: float, abertura: float, cor: Color) -> void:
	if DisplayServer.get_name() == "headless": return
	var st := SurfaceTool.new(); st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var n := maxi(6, int(abertura / TAU * 40.0)); var ri := raio * 0.5
	var c_in := Color(cor.r, cor.g, cor.b, 0.0); var c_out := Color(minf(1.0, cor.r + 0.35), minf(1.0, cor.g + 0.35), minf(1.0, cor.b + 0.35), 0.95)
	for i in range(n):
		var a0 := ang_dir - abertura * 0.5 + abertura * i / n
		var a1 := ang_dir - abertura * 0.5 + abertura * (i + 1) / n
		var i0 := Vector3(cos(a0) * ri, 0, sin(a0) * ri); var o0 := Vector3(cos(a0) * raio, 0, sin(a0) * raio)
		var i1 := Vector3(cos(a1) * ri, 0, sin(a1) * ri); var o1 := Vector3(cos(a1) * raio, 0, sin(a1) * raio)
		for par in [[i0, c_in], [o0, c_out], [o1, c_out], [i0, c_in], [o1, c_out], [i1, c_in]]:
			st.set_color(par[1]); st.add_vertex(par[0])
	var m := MeshInstance3D.new(); m.mesh = st.commit()
	var mat := StandardMaterial3D.new(); mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.vertex_color_use_as_albedo = true; mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.material_override = mat; m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	m.position = Vector3(centro.x, Lib.h(centro.x, centro.z) + 0.55, centro.z); add_child(m)
	var tw := create_tween()
	tw.tween_property(m, "scale", Vector3(1.08, 1.0, 1.08), 0.24).from(Vector3(0.55, 1.0, 0.55))
	tw.parallel().tween_property(mat, "albedo_color:a", 0.0, 0.24)
	tw.tween_callback(m.queue_free)

# Número de dano / aviso que sobe e some.
func dano_num(pos: Vector3, txt: String, cor: Color, tam: int = 40, forcar: bool = false) -> void:
	if DisplayServer.get_name() == "headless" or Tela.opc("numeros") < 0.5: return
	if _nums > (90 if forcar else 50): return
	_nums += 1
	var l := Label3D.new(); l.text = txt
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED; l.no_depth_test = true
	l.font_size = tam; l.pixel_size = 0.008; l.outline_size = 12
	l.modulate = cor; l.outline_modulate = Color(0.1, 0.07, 0.05)
	l.position = pos + Vector3(randf_range(-0.3, 0.3), 2.1, randf_range(-0.3, 0.3)); add_child(l)
	var tw := create_tween()
	tw.tween_property(l, "position:y", l.position.y + 1.2, 0.55)
	tw.parallel().tween_property(l, "modulate:a", 0.0, 0.3).set_delay(0.25)
	tw.tween_callback(_fim_num.bind(l))

func _fim_num(l: Node) -> void:
	_nums -= 1
	l.queue_free()

func popup(pos: Vector3, txt: String) -> void:
	dano_num(pos, txt.to_upper() + "!", Color(1.0, 0.85, 0.2), 52)

# Estouro de cubinhos quando o bicho cai.
func _puff(pos: Vector3, cor: Color, esc: float) -> void:
	if DisplayServer.get_name() == "headless": return
	for i in range(6):
		var c := Lib.cx(self, Vector3(0.22, 0.22, 0.22) * esc, pos + Vector3(0, 0.9 * esc, 0), cor if i % 2 == 0 else Color(0.95, 0.92, 0.85))
		c.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		var d := Vector3(randf_range(-1, 1), randf_range(0.6, 1.6), randf_range(-1, 1)) * 1.3 * esc
		var tw := create_tween()
		tw.tween_property(c, "position", c.position + d, 0.38).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
		tw.parallel().tween_property(c, "scale", Vector3(0.05, 0.05, 0.05), 0.38)
		tw.parallel().tween_property(c, "rotation", Vector3(randf() * 6.0, randf() * 6.0, 0), 0.38)
		tw.tween_callback(c.queue_free)

# ---------------- enfeites do cenário ----------------
func _montar_capim() -> void:
	var rng := RandomNumberGenerator.new(); rng.seed = 99
	var mat := StandardMaterial3D.new(); mat.vertex_color_use_as_albedo = true; mat.vertex_color_is_srgb = true; mat.roughness = 1.0
	# tufos de capim
	var cm := CylinderMesh.new(); cm.top_radius = 0.0; cm.bottom_radius = 0.14; cm.height = 0.5; cm.radial_segments = 3; cm.rings = 1
	var mm := MultiMesh.new(); mm.transform_format = MultiMesh.TRANSFORM_3D; mm.use_colors = true
	mm.mesh = cm; mm.instance_count = 8600
	for i in range(6000):
		var x := rng.randf_range(-ARENA - 10.0, ARENA + 10.0); var z := rng.randf_range(-ARENA - 10.0, ARENA + 10.0)
		var y := Lib.h(x, z)
		var e := 0.6 + rng.randf() * 1.0
		if y < -1.25: e = 0.001
		var b := Basis(Vector3.UP, rng.randf() * TAU).scaled(Vector3(e, e, e))
		mm.set_instance_transform(i, Transform3D(b, Vector3(x, y + 0.22 * e, z)))
		mm.set_instance_color(i, Color(0.14 + rng.randf() * 0.18, 0.48 + rng.randf() * 0.28, 0.1))
	var mi := MultiMeshInstance3D.new(); mi.multimesh = mm; mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF; add_child(mi)
	# florzinhas
	var sm := SphereMesh.new(); sm.radius = 0.1; sm.height = 0.2; sm.radial_segments = 5; sm.rings = 3
	var mf := MultiMesh.new(); mf.transform_format = MultiMesh.TRANSFORM_3D; mf.use_colors = true
	mf.mesh = sm; mf.instance_count = 1700
	var cores := [Color(0.95, 0.2, 0.25), Color(1.0, 0.85, 0.15), Color(0.98, 0.98, 0.95), Color(0.98, 0.5, 0.75), Color(0.6, 0.4, 0.95), Color(1.0, 0.55, 0.1)]
	for i in range(1200):
		var x2 := rng.randf_range(-ARENA - 6.0, ARENA + 6.0); var z2 := rng.randf_range(-ARENA - 6.0, ARENA + 6.0)
		var y2 := Lib.h(x2, z2)
		var e2 := 0.7 + rng.randf() * 0.7
		if y2 < -1.25: e2 = 0.001
		mf.set_instance_transform(i, Transform3D(Basis().scaled(Vector3(e2, e2 * 0.7, e2)), Vector3(x2, y2 + 0.2, z2)))
		mf.set_instance_color(i, cores[rng.randi() % cores.size()])
	var mi2 := MultiMeshInstance3D.new(); mi2.multimesh = mf; mi2.material_override = mat
	mi2.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF; add_child(mi2)

func _montar_agua() -> void:
	var m := MeshInstance3D.new(); var pm := PlaneMesh.new(); pm.size = Vector2(200, 200); m.mesh = pm
	var mat := StandardMaterial3D.new(); mat.albedo_color = Color(0.12, 0.55, 0.78, 0.72)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA; mat.roughness = 0.12; mat.metallic = 0.25
	m.material_override = mat; m.position.y = -1.3
	m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF; add_child(m)

func _montar_nuvens() -> void:
	var rng := RandomNumberGenerator.new(); rng.seed = 5
	for i in range(18):
		var n := Node3D.new(); add_child(n)
		n.position = Vector3(rng.randf_range(-130, 130), rng.randf_range(34, 50), rng.randf_range(-130, 130))
		var e := 2.0 + rng.randf() * 3.0
		for k in range(4):
			var b := Lib.esf(n, e * (1.0 - k * 0.15), Vector3((k - 1.5) * e * 1.1, rng.randf() * e * 0.3, rng.randf_range(-1, 1) * e * 0.4), Color(1, 1, 1), Vector3(1.2, 0.6, 1), 6, 0.25)
			b.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

func _fio(a: Vector3, b: Vector3) -> void:
	var m := Lib.cx(self, Vector3(0.025, 0.025, a.distance_to(b)), (a + b) * 0.5, Color(0.2, 0.15, 0.1))
	m.look_at_from_position((a + b) * 0.5, b, Vector3.UP)
	m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

# Arraial de São João no meio do mapa: mastros com bandeirinhas e uma fogueira.
func _montar_arraial() -> void:
	var cores := [Color(0.9, 0.15, 0.15), Color(1.0, 0.82, 0.1), Color(0.15, 0.65, 0.3), Color(0.15, 0.45, 0.9), Color(0.98, 0.45, 0.7), Color(1.0, 0.5, 0.1)]
	var topos: Array = []
	for i in range(5):
		var a := i * TAU / 5.0 + 0.3
		var x := cos(a) * 8.5; var z := sin(a) * 8.5; var y := Lib.h(x, z)
		Lib.cil(self, 0.07, 0.1, 4.6, Vector3(x, y + 2.3, z), Color(0.5, 0.33, 0.18), 6)
		Lib.esf(self, 0.16, Vector3(x, y + 4.65, z), cores[i], Vector3.ONE, 6)
		troncos.append(Vector3(x, z, 0.15))
		topos.append(Vector3(x, y + 4.5, z))
	var k := 0
	for i in range(5):
		var A: Vector3 = topos[i]; var B: Vector3 = topos[(i + 1) % 5]
		var ant := A
		for j in range(1, 13):
			var t := j / 13.0
			var pt := A.lerp(B, t) - Vector3(0, sin(t * PI) * 0.9, 0)
			_fio(ant, pt); ant = pt
			var f := Lib.cil(self, 0.2, 0.0, 0.38, pt - Vector3(0, 0.21, 0), cores[k % cores.size()], 4)
			f.rotation.y = atan2(B.x - A.x, B.z - A.z) + PI / 4.0
			f.scale = Vector3(1, 1, 1)
			f.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			k += 1
		_fio(ant, B)
	# fogueira
	var fx := 3.6; var fz := -3.2; var fy := Lib.h(fx, fz)
	var base := Lib.pivo(self, Vector3(fx, fy, fz))
	for i in range(5):
		var a2 := i * TAU / 5.0
		Lib.cil(base, 0.11, 0.13, 1.5, Vector3(cos(a2) * 0.35, 0.55, sin(a2) * 0.35), Color(0.36, 0.22, 0.12), 6, Vector3(sin(a2) * 0.5, 0, -cos(a2) * 0.5))
	for i in range(7):
		var a3 := i * TAU / 7.0
		Lib.esf(base, 0.2, Vector3(cos(a3) * 0.85, 0.08, sin(a3) * 0.85), Color(0.55, 0.55, 0.52), Vector3(1, 0.7, 1), 5)
	fogo = Lib.pivo(base, Vector3(0, 0.3, 0))
	Lib.cil(fogo, 0.0, 0.5, 1.5, Vector3(0, 0.75, 0), Color(1.0, 0.35, 0.05), 6, Vector3.ZERO, 2.0).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	Lib.cil(fogo, 0.0, 0.32, 1.1, Vector3(0.1, 0.6, 0.05), Color(1.0, 0.7, 0.1), 5, Vector3.ZERO, 2.5).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	Lib.cil(fogo, 0.0, 0.18, 0.7, Vector3(-0.08, 0.45, -0.05), Color(1.0, 0.95, 0.5), 5, Vector3.ZERO, 3.0).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var luz := OmniLight3D.new(); luz.light_color = Color(1.0, 0.55, 0.2); luz.light_energy = 2.5; luz.omni_range = 9.0
	luz.position = Vector3(0, 1.3, 0); base.add_child(luz)
	troncos.append(Vector3(fx, fz, 0.9))

const COR_PAU := Color(0.45, 0.3, 0.16)
# ---------------- potes, baús e oratórios ----------------
func _pos_livre(rmin: float, rmax: float) -> Vector3:
	for i in range(30):
		var a := randf() * TAU; var d := randf_range(rmin, rmax)
		var x := cos(a) * d; var z := sin(a) * d
		if Lib.h(x, z) > -0.9: return Vector3(x, Lib.h(x, z), z)
	return Vector3(6, Lib.h(6, 6), 6)

func _montar_objetos() -> void:
	for i in range(14): _novo_objeto("pote", _pos_livre(6.0, ARENA - 4.0), 0)
	for i in range(3): _novo_objeto("oratorio", _pos_livre(14.0, ARENA - 6.0), 0)
	for i in range(4): _novo_objeto("bau", _pos_livre(10.0, ARENA - 5.0), 1)
	_novo_objeto("loja", _pos_livre(12.0, ARENA - 8.0), 0)
	_novo_objeto("portal", _pos_livre(16.0, ARENA - 8.0), 0)
	var gente: Array = Dados.NPCS.keys(); gente.shuffle()
	var so_um := OS.get_cmdline_user_args().find("--npc")
	if so_um >= 0: gente = [OS.get_cmdline_user_args()[so_um + 1]]
	for i in range(mini(3, gente.size())): _novo_objeto(gente[i], _pos_livre(12.0, ARENA - 8.0), 0)
	if Dados.FASES[fase].get("cristo", false): _montar_cristo()

# custo 0 = baú de graça (caiu de elite ou de chefe); custo 1 = trancado, paga com as moedas da partida
func _novo_objeto(tipo: String, pos: Vector3, custo: int) -> void:
	var n := Node3D.new(); n.position = Vector3(pos.x, Lib.h(pos.x, pos.z), pos.z); add_child(n)
	var o := {"tipo": tipo, "no": n, "custo": custo, "carga": 0.0, "usado": false, "aviso": 0.0, "lbl": null}
	match tipo:
		"pote":
			Lib.esf(n, 0.42, Vector3(0, 0.4, 0), Color(0.78, 0.42, 0.22), Vector3(1, 1.15, 1), 7)
			Lib.cil(n, 0.2, 0.26, 0.2, Vector3(0, 0.88, 0), Color(0.66, 0.33, 0.17), 7)
			Lib.cil(n, 0.43, 0.43, 0.07, Vector3(0, 0.45, 0), Color(0.95, 0.9, 0.78), 7)
		"bau":
			var mad := Color(0.5, 0.3, 0.14) if custo > 0 else Color(0.75, 0.2, 0.15)
			Lib.cx(n, Vector3(1.1, 0.6, 0.75), Vector3(0, 0.32, 0), mad)
			Lib.cx(n, Vector3(1.16, 0.26, 0.8), Vector3(0, 0.72, 0), mad.darkened(0.2))
			Lib.cx(n, Vector3(0.16, 0.9, 0.82), Vector3(-0.36, 0.45, 0), Color(1.0, 0.8, 0.2))
			Lib.cx(n, Vector3(0.16, 0.9, 0.82), Vector3(0.36, 0.45, 0), Color(1.0, 0.8, 0.2))
			Lib.cx(n, Vector3(0.2, 0.22, 0.1), Vector3(0, 0.58, 0.4), Color(1.0, 0.85, 0.3), Vector3.ZERO, 1.5)
			n.rotation.y = randf() * TAU
			o["lbl"] = _placa(n, 1.7, Color(1.0, 0.85, 0.3))
		"oratorio":
			Lib.cx(n, Vector3(1.3, 0.3, 1.3), Vector3(0, 0.15, 0), Color(0.6, 0.6, 0.58))
			Lib.cx(n, Vector3(0.9, 1.3, 0.8), Vector3(0, 0.95, 0), Color(0.96, 0.95, 0.9))
			Lib.cil(n, 0.0, 0.8, 0.7, Vector3(0, 1.95, 0), Color(0.15, 0.4, 0.75), 4)
			Lib.cx(n, Vector3(0.5, 0.7, 0.1), Vector3(0, 0.9, 0.38), Color(0.2, 0.25, 0.45))
			Lib.cx(n, Vector3(0.08, 0.45, 0.08), Vector3(0, 2.5, 0), Color(1.0, 0.85, 0.3)); Lib.cx(n, Vector3(0.28, 0.08, 0.08), Vector3(0, 2.56, 0), Color(1.0, 0.85, 0.3))
			Lib.esf(n, 0.12, Vector3(0, 0.95, 0.5), Color(1.0, 0.8, 0.3), Vector3(1, 1.5, 1), 5, 3.0)
			var luz := OmniLight3D.new(); luz.light_color = Color(0.6, 0.85, 1.0); luz.light_energy = 1.6; luz.omni_range = 6.0; luz.position = Vector3(0, 1.6, 0); n.add_child(luz)
			o["luz"] = luz
			o["lbl"] = _placa(n, 3.2, Color(0.7, 0.92, 1.0)); o["lbl"].text = "ORATÓRIO\nfique perto"
			troncos.append(Vector3(pos.x, pos.z, 0.6))
		"zepilintra":   # mesa de bar com Seu Zé ao lado
			Lib.cil(n, 0.7, 0.7, 0.08, Vector3(0.9, 0.85, 0), Color(0.5, 0.32, 0.18), 10)
			Lib.cil(n, 0.07, 0.1, 0.85, Vector3(0.9, 0.42, 0), Color(0.3, 0.2, 0.12), 6)
			Lib.cil(n, 0.07, 0.08, 0.3, Vector3(0.75, 1.04, 0.1), Color(0.25, 0.5, 0.25), 6)
			Lib.cx(n, Vector3(0.12, 0.12, 0.12), Vector3(1.1, 0.95, -0.1), Color.WHITE); Lib.cx(n, Vector3(0.12, 0.12, 0.12), Vector3(0.95, 0.95, 0.25), Color.WHITE, Vector3(0, 0.6, 0))
			var bz := Boneco.criar("zepilintra"); n.add_child(bz); bz.position = Vector3(-0.3, 0, 0)
			o["lbl"] = _placa(n, 2.9, Color.WHITE); o["lbl"].text = Dados.NPCS[tipo]["lugar"]
			n.rotation.y = atan2(-pos.x, -pos.z)
		"pombagira":    # encruzilhada com velas
			Lib.cx(n, Vector3(5.0, 0.04, 1.0), Vector3(0, 0.05, 0), Color(0.45, 0.33, 0.22)); Lib.cx(n, Vector3(1.0, 0.04, 5.0), Vector3(0, 0.06, 0), Color(0.45, 0.33, 0.22))
			for i in range(4):
				var av := i * TAU / 4.0 + 0.78
				Lib.cil(n, 0.05, 0.05, 0.3, Vector3(cos(av) * 1.1, 0.2, sin(av) * 1.1), Color(0.85, 0.1, 0.12), 6)
				Lib.esf(n, 0.06, Vector3(cos(av) * 1.1, 0.42, sin(av) * 1.1), Color(1.0, 0.8, 0.3), Vector3(1, 1.5, 1), 5, 3.0)
			var bp := Boneco.criar("pombagira"); n.add_child(bp)
			var lg := OmniLight3D.new(); lg.light_color = Color(1.0, 0.3, 0.3); lg.light_energy = 1.6; lg.omni_range = 6.0; lg.position = Vector3(0, 1.6, 0); n.add_child(lg)
			o["lbl"] = _placa(n, 2.9, Color(1.0, 0.45, 0.45)); o["lbl"].text = Dados.NPCS[tipo]["lugar"]
			n.rotation.y = atan2(-pos.x, -pos.z)
		"pretovelho", "baiana", "repentista", "vaqueiro":
			var bn := Boneco.criar(tipo); n.add_child(bn)
			match tipo:
				"pretovelho":
					Lib.cil(n, 0.3, 0.26, 0.4, Vector3(-0.9, 0.2, 0), Color(0.5, 0.33, 0.18), 8)                          # banquinho
					Lib.esf(n, 0.25, Vector3(-0.9, 0.2, 0.7), Color(0.25, 0.55, 0.25), Vector3(1, 0.8, 1), 6)             # ervas
				"baiana":
					Lib.cx(n, Vector3(1.4, 0.08, 0.8), Vector3(1.0, 0.8, 0), Color(0.6, 0.4, 0.22))                       # tabuleiro
					Lib.cx(n, Vector3(0.06, 0.8, 0.06), Vector3(0.4, 0.4, 0.3), COR_PAU); Lib.cx(n, Vector3(0.06, 0.8, 0.06), Vector3(1.6, 0.4, -0.3), COR_PAU)
					for k in range(5): Lib.esf(n, 0.12, Vector3(0.6 + k * 0.2, 0.92, 0.1 * (k % 2)), Color(0.85, 0.5, 0.15), Vector3(1, 0.7, 1), 6)
					Lib.cil(n, 0.2, 0.16, 0.2, Vector3(1.45, 0.94, -0.15), Color(0.2, 0.2, 0.22), 8)
				"repentista":
					Lib.cil(n, 0.28, 0.26, 0.45, Vector3(-0.9, 0.22, 0), Color(0.5, 0.33, 0.18), 8)
					Lib.cx(n, Vector3(0.5, 0.02, 0.35), Vector3(0.9, 0.03, 0.4), Color(0.9, 0.82, 0.6)); Lib.cx(n, Vector3(0.5, 0.02, 0.35), Vector3(1.1, 0.04, 0.1), Color(0.95, 0.6, 0.6), Vector3(0, 0.5, 0))
				"vaqueiro":
					for k in range(3): Lib.cil(n, 0.06, 0.07, 1.2, Vector3(1.0 + k * 0.9, 0.6, 0), COR_PAU, 5)
					Lib.cx(n, Vector3(2.0, 0.07, 0.07), Vector3(1.9, 0.9, 0), COR_PAU); Lib.cx(n, Vector3(2.0, 0.07, 0.07), Vector3(1.9, 0.5, 0), COR_PAU)
			o["lbl"] = _placa(n, 2.9, Color.WHITE); o["lbl"].text = Dados.NPCS[tipo]["lugar"]
			n.rotation.y = atan2(-pos.x, -pos.z)
		"portal":
			for i in range(8):
				var a := i * TAU / 8.0
				Lib.esf(n, 0.35, Vector3(cos(a) * 1.5, 0.2, sin(a) * 1.5), Color(0.4, 0.38, 0.45), Vector3(1, 0.8 + (i % 3) * 0.5, 1), 5)
			Lib.cil(n, 1.3, 1.3, 0.06, Vector3(0, 0.12, 0), Color(0.55, 0.2, 0.9), 16, Vector3.ZERO, 2.5)
			Lib.cil(n, 0.8, 0.8, 0.08, Vector3(0, 0.16, 0), Color(0.85, 0.5, 1.0), 12, Vector3.ZERO, 3.5)
			var lp := OmniLight3D.new(); lp.light_color = Color(0.7, 0.35, 1.0); lp.light_energy = 2.4; lp.omni_range = 7.0; lp.position = Vector3(0, 1.4, 0); n.add_child(lp)
			o["lbl"] = _placa(n, 2.6, Color(0.85, 0.6, 1.0)); o["lbl"].text = "PORTAL DA CUCA\nentre se tiver coragem"
		"loja":
			for sx in [-1.0, 1.0]:
				for sz in [-1.0, 1.0]: Lib.cil(n, 0.08, 0.1, 2.6, Vector3(sx * 1.5, 1.3, sz * 1.1), Color(0.45, 0.3, 0.16), 6)
			for k in range(6): Lib.cx(n, Vector3(0.56, 0.1, 2.7), Vector3(-1.4 + k * 0.56, 2.65 + (0.05 if k % 2 == 0 else 0.0), 0), Color(0.8, 0.18, 0.12) if k % 2 == 0 else Color(0.96, 0.9, 0.75))
			Lib.cx(n, Vector3(2.9, 0.9, 0.5), Vector3(0, 0.45, -0.9), Color(0.55, 0.36, 0.2))
			Lib.esf(n, 0.16, Vector3(-0.8, 1.05, -0.9), Color(0.85, 0.6, 0.2), Vector3.ONE, 6); Lib.esf(n, 0.16, Vector3(-0.45, 1.05, -0.9), Color(0.6, 0.25, 0.15), Vector3.ONE, 6)
			Lib.cil(n, 0.1, 0.12, 0.35, Vector3(0.7, 1.07, -0.9), Color(0.3, 0.55, 0.3), 6)
			Lib.esf(n, 0.14, Vector3(1.3, 2.2, 0.9), Color(1.0, 0.8, 0.3), Vector3(1, 1.4, 1), 6, 3.0)
			var lz := OmniLight3D.new(); lz.light_color = Color(1.0, 0.75, 0.35); lz.light_energy = 2.0; lz.omni_range = 7.0; lz.position = Vector3(0, 2.0, 0); n.add_child(lz)
			o["lbl"] = _placa(n, 3.5, Color(1.0, 0.8, 0.3)); o["lbl"].text = "BODEGA DO\nLAMPIÃO"
			n.rotation.y = atan2(-pos.x, -pos.z)
	objetos.append(o)
	_placas_bau()

func _placa(pai: Node3D, alt: float, cor: Color) -> Label3D:
	var l := Label3D.new(); l.billboard = BaseMaterial3D.BILLBOARD_ENABLED; l.font = Tela.fonte(true)
	l.font_size = 44; l.pixel_size = 0.008; l.outline_size = 12; l.modulate = cor; l.outline_modulate = Color(0.1, 0.07, 0.05)
	l.position = Vector3(0, alt, 0); pai.add_child(l)
	return l

func _placas_bau() -> void:
	for o in objetos:
		if o["tipo"] == "bau": o["lbl"].text = "BAÚ\n◉ %d" % bau_custo if o["custo"] > 0 else "BAÚ\nde graça"

func _objetos(delta: float) -> void:
	var pp: Vector3 = player.global_position
	var potes := 0
	for o in objetos.duplicate():
		var n: Node3D = o["no"]
		var d := Vector2(n.position.x - pp.x, n.position.z - pp.z).length()
		match o["tipo"]:
			"pote":
				potes += 1
				if d < 1.15 and player.alt < 0.9:
					_puff(n.position, Color(0.78, 0.42, 0.22), 1.0); Som.tocar("pote")
					var sorte := randf()
					if sorte < 0.3: player.curar(player.max_hp * 0.15)
					elif sorte < 0.4:
						for fr in fireflies: fr["mag"] = true
						dano_num(n.position, "LAMPARINA!", Color(0.6, 0.9, 1.0), 50, true)
					else:
						var v := randi_range(3, 6); moedas += v; Som.tocar("moeda", -4.0)
						dano_num(n.position, "◉ +%d" % v, Color(1.0, 0.85, 0.3), 46, true)
					n.queue_free(); objetos.erase(o)
			"bau":
				n.scale = Vector3.ONE * (1.0 + 0.05 * sin(time * 5.0))
				o["aviso"] = maxf(0.0, o["aviso"] - delta)
				if d < 1.5:
					var preco: int = bau_custo if o["custo"] > 0 else 0
					if moedas >= preco:
						moedas -= preco
						if o["custo"] > 0: bau_custo += 15
						Salvo.contar("baus")
						_puff(n.position, Color(1.0, 0.8, 0.2), 1.6); _efeito_anel(n.position, 3.0, Color(1.0, 0.85, 0.3)); tremor = maxf(tremor, 0.25)
						n.queue_free(); objetos.erase(o); _placas_bau()
						abrir_escolha("bau")
					elif o["aviso"] <= 0.0:
						o["aviso"] = 1.5; dano_num(n.position, "faltam ◉ %d" % int(ceil(preco - moedas)), Color(1.0, 0.5, 0.4), 44, true)
			"portal":
				n.rotation.y += delta * 1.5
				if d < 1.4:
					_puff(n.position, Color(0.7, 0.35, 1.0), 2.0); _efeito_anel(n.position, 5.0, Color(0.7, 0.35, 1.0)); tremor = 0.6
					var pos_p: Vector3 = n.position
					n.queue_free(); objetos.erase(o)
					_cuca(pos_p)
			"loja":
				if d > 4.5: o["usado"] = false
				elif d < 2.4 and not o["usado"]:
					o["usado"] = true; abrir_loja()
			"zepilintra", "pombagira", "pretovelho", "baiana", "repentista", "vaqueiro":
				if d > 4.5: o["usado"] = false
				elif d < 2.2 and not o["usado"]:
					o["usado"] = true; abrir_npc(o["tipo"])
			"oratorio":
				if o["usado"]: continue
				if d < 3.2:
					o["carga"] += delta
					o["lbl"].text = "ORATÓRIO\n%d%%" % int(o["carga"] / 4.0 * 100.0)
					if o["carga"] >= 4.0:
						o["usado"] = true; o["lbl"].text = ""; o["luz"].light_energy = 0.0
						Salvo.contar("oratorios")
						_efeito_anel(n.position, 4.0, Color(0.6, 0.9, 1.0)); _efeito_anel(n.position, 2.4, Color.WHITE)
						abrir_escolha("oratorio")
				elif o["carga"] > 0.0:
					o["carga"] = maxf(0.0, o["carga"] - delta * 2.0)
					o["lbl"].text = "ORATÓRIO\nfique perto"
	if potes < 14:
		_pote_t -= delta
		if _pote_t <= 0.0:
			_pote_t = 20.0; _novo_objeto("pote", _pos_livre(6.0, ARENA - 4.0), 0)

# ---------------- Bodega do Lampião ----------------
func loja_preco(id: String) -> int:
	return int(loja_precos.get(id, 0))

func _golpe_fraco():
	var m = null
	for g in player.golpes:
		if g["nivel"] < Dados.NIVEL_MAX and (m == null or g["nivel"] < m["nivel"]): m = g
	return m

func loja_pode(id: String) -> bool:
	if moedas < loja_preco(id): return false
	match id:
		"pacto": return not pacto_feito
		"amolar": return _golpe_fraco() != null
		"troca": return player.cartas_stat.size() > 0
		"cura": return player.hp < player.max_hp
	return true

func abrir_loja() -> void:
	if _teste_fim > 0.0 or levelup_aberto or estado != "jogo": return
	levelup_aberto = true; lbl_centro.text = ""
	Som.tocar("loja")
	menus.loja(); _mouse(false)

func fechar_loja() -> void:
	if not menus.tela in ["loja", "lore", "npc"]: return
	menus.fechar(); levelup_aberto = false
	if not _fila.is_empty():
		abrir_escolha(_fila.pop_front()); return
	_mouse(true)

func comprar_loja(id: String) -> void:
	if not loja_pode(id): return
	moedas -= loja_preco(id); Som.tocar("moeda")
	for it in Dados.LOJA:
		if it["id"] == id: loja_precos[id] = loja_preco(id) + int(it["sobe"])
	match id:
		"carta":
			_fila.push_front("contrabando"); fechar_loja(); return
		"troca":
			var n := player.troca_troca()
			lbl_centro.text = "TROCA-TROCA!\n%d cartas sorteadas de novo" % n; _piscar_centro()
		"amolar":
			var g = _golpe_fraco(); g["nivel"] += 1
			lbl_centro.text = "%s subiu para o nível %d" % [Dados.GOLPES[g["id"]]["nome"], g["nivel"]]; _piscar_centro()
		"cura": player.curar(player.max_hp)
		"ima":
			for fr in fireflies: fr["mag"] = true
		"pacto":
			pacto_feito = true; player.dano_mult += 0.4
			player.max_hp = maxf(20.0, player.max_hp * 0.75); player.hp = minf(player.hp, player.max_hp)
	menus.loja()

# ---------------- Seu Zé Pilintra e Pomba Gira ----------------
var npc_precos := {}
func abrir_npc(tipo: String) -> void:
	if _teste_fim > 0.0 or levelup_aberto or estado != "jogo": return
	levelup_aberto = true; lbl_centro.text = ""
	Som.tocar("bencao")
	var fala := int(Salvo.d["falas"].get(tipo, 0))          # a cada encontro, uma fala diferente
	Salvo.d["falas"][tipo] = fala + 1
	menus.npc(tipo, fala); _mouse(false)

func npc_preco(id: String, base: int) -> int:
	return int(npc_precos.get(id, base))

func npc_pode(id: String) -> bool:
	match id:
		"pomba": return player.pombas < 4
		"gole", "frio", "quente": return player.hp < player.max_hp or id == "quente"
		"mote": return player.cartas_stat.size() > 0
	return true

func npc_comprar(tipo: String, it: Dictionary, preco: int, fala: int) -> void:
	var id: String = it["id"]
	if moedas < preco or npc_feito.has(id) or not npc_pode(id): return
	moedas -= preco; Som.tocar("moeda")
	if it.get("vez", false): npc_feito[id] = true
	npc_precos[id] = preco + int(it.get("sobe", 0))
	var p := player
	match id:
		"dados":
			if randf() < 0.5:
				moedas += 50; lbl_centro.text = "DEU SORTE!\n◉ +50"; Som.tocar("bau")
			else: lbl_centro.text = "Hoje não, malandro."
			_piscar_centro()
		"guarda": p.segunda_chance = true
		"gole": p.curar(p.max_hp * 0.35)
		"rosa": p.crit += 0.10; p.crit_dano += 0.30
		"pomba": p.pombas += 1
		"caminho":
			praga *= 1.15; _fila.push_front("caminho"); fechar_loja(); return
		"benzer": p.regen += 1.5
		"conselho": p.gain_xp((p.xp_next - p.xp) / p.xp_mult + 0.01)
		"arruda": p.armor += 0.10
		"quente": p.curar(p.max_hp * 0.5); p.dano_mult += 0.10
		"frio": p.curar(p.max_hp * 0.5)
		"cocada": p.max_hp += 25.0; p.hp += 25.0
		"folheto":
			_fila.push_front("bau"); fechar_loja(); return
		"verso": p.atk_speed += 0.15
		"mote":
			lbl_centro.text = "MOTE NOVO!\n%d cartas sorteadas de novo" % p.troca_troca(); _piscar_centro()
		"gibao": p.armor += 0.12
		"aboio":
			for fr in fireflies: fr["mag"] = true
		"espora": p.speed *= 1.12
	if menus.tela == "npc": menus.npc(tipo, fala)

func seu_ze_segurou() -> void:
	_ze_n += 1
	lbl_centro.text = "SEU ZÉ TE SEGUROU!\nLevanta, que ainda tem jogo"; _piscar_centro()
	Som.tocar("bencao"); tremor = 0.5
	_ring(player.global_position, 6.0, 40.0 * _escala_hab(player), 1.5, 3.0)
	_efeito_anel(player.global_position, 6.0, Color.WHITE)

# Pomba Girando: pombas brancas em órbita que bicam quem encostar
func _pombas_girando(delta: float) -> void:
	var p := player
	while _pombas.size() < p.pombas:
		var n := Node3D.new(); add_child(n)
		Lib.esf(n, 0.2, Vector3.ZERO, Color.WHITE, Vector3(1, 0.9, 1.4), 6, 0.4)
		Lib.esf(n, 0.12, Vector3(0, 0.12, 0.26), Color.WHITE, Vector3.ONE, 5, 0.4)
		Lib.cx(n, Vector3(0.7, 0.03, 0.22), Vector3(0, 0.05, 0), Color(0.92, 0.92, 0.96))
		Lib.cil(n, 0.0, 0.03, 0.1, Vector3(0, 0.1, 0.4), Color(1.0, 0.6, 0.1), 4, Vector3(PI / 2.0, 0, 0))
		_pombas.append(n)
	if _pombas.is_empty(): return
	_pomba_a += delta * 3.2; _pomba_t -= delta
	var bica := _pomba_t <= 0.0
	if bica: _pomba_t = 0.35
	for i in range(_pombas.size()):
		var a := _pomba_a + i * TAU / _pombas.size()
		var n2: Node3D = _pombas[i]
		n2.position = p.global_position + Vector3(cos(a) * 2.8, 1.1 + 0.2 * sin(a * 2.0), sin(a) * 2.8)
		n2.rotation.y = -a
		if bica:
			for e in enemies.duplicate():
				if not is_instance_valid(e) or e.dead: continue
				var dd: Vector3 = e.global_position - n2.position; dd.y = 0
				if dd.length() < 1.1 + e.raio:
					_dano_pombas += 9.0 * _escala_hab(p); ferir(e, 9.0 * _escala_hab(p))

# Cristo Redentor no alto do morro, de braços abertos sobre a fase do Corcovado
func _montar_cristo() -> void:
	var pedra := Color(0.95, 0.94, 0.9); var sombra := Color(0.8, 0.8, 0.78)
	var n := Node3D.new(); n.position = Vector3(0, 6.0, -ARENA - 16.0); n.scale = Vector3(1.9, 1.9, 1.9); add_child(n)
	Lib.esf(n, 9.0, Vector3(0, -4.0, 0), Color(0.36, 0.42, 0.34), Vector3(1.4, 0.8, 1.2), 7)        # o morro
	Lib.cx(n, Vector3(4.2, 3.2, 4.2), Vector3(0, 4.2, 0), sombra)                                   # pedestal
	Lib.cil(n, 1.5, 2.3, 9.0, Vector3(0, 10.3, 0), pedra, 8)                                        # manto
	Lib.cx(n, Vector3(15.0, 1.5, 1.6), Vector3(0, 13.6, 0), pedra)                                  # braços abertos
	Lib.cx(n, Vector3(3.6, 2.4, 1.9), Vector3(0, 13.2, 0), pedra)
	for sx in [-1.0, 1.0]:
		Lib.cx(n, Vector3(1.5, 3.2, 1.7), Vector3(5.6 * sx, 12.4, 0), sombra)                       # mangas caindo
		Lib.cx(n, Vector3(1.0, 0.6, 1.0), Vector3(7.9 * sx, 13.6, 0), pedra)                        # mãos
	Lib.esf(n, 1.3, Vector3(0, 15.9, 0.1), pedra, Vector3(0.9, 1.1, 0.95), 8)                       # cabeça
	Lib.cx(n, Vector3(1.4, 1.2, 0.7), Vector3(0, 15.2, 0.6), sombra)                                # barba
	var luz := OmniLight3D.new(); luz.light_color = Color(1.0, 0.95, 0.8); luz.light_energy = 3.0; luz.omni_range = 26.0; luz.position = Vector3(0, 12.0, 8.0); n.add_child(luz)

# ---------------- poderes temporários ----------------
func dar_poder(tipo: String) -> void:
	if estado != "jogo": return
	if poder != "": _fim_poder()
	var d: Dictionary = Dados.PODERES[tipo]
	poder = tipo; poder_t = d["dur"]; _poder_tick = 0.0
	var p := player
	match tipo:
		"mula":
			p.speed *= 1.5
			_boneco_seu = p.boneco; _boneco_seu.visible = false
			p.boneco = Boneco.criar("mula"); p.add_child(p.boneco)
		"lobisomem": p.atk_speed *= 2.0
		"curupira": p.speed *= 1.6
		"boto": p.xp_mult *= 2.0
	lbl_centro.text = "%s\n%s" % [d["nome"], d["txt"]]; _piscar_centro()
	Som.tocar("ult"); tremor = maxf(tremor, 0.5)
	_efeito_anel(p.global_position, 5.0, d["cor"])

func _fim_poder() -> void:
	var p := player
	match poder:
		"mula":
			p.speed /= 1.5
			if is_instance_valid(_boneco_seu):
				p.boneco.queue_free(); p.boneco = _boneco_seu; p.boneco.visible = true
		"lobisomem": p.atk_speed /= 2.0
		"curupira": p.speed /= 1.6
		"boto": p.xp_mult /= 2.0
	poder = ""

func _poderes(delta: float) -> void:
	# o fogo que a mula deixou continua queimando mesmo depois que o poder acaba
	for f in _fogos.duplicate():
		f["t"] -= delta; f["tick"] -= delta
		if f["tick"] <= 0.0:
			f["tick"] = 0.3
			_ring(f["no"].position, 1.5, 9.0 * _escala_hab(player), 0.0, 0.0)
		if f["t"] <= 0.0:
			f["no"].queue_free(); _fogos.erase(f)
	if poder == "": return
	var p := player; var pos: Vector3 = p.global_position
	var s := _escala_hab(p)
	poder_t -= delta; _poder_tick -= delta
	match poder:
		"mula":
			p.iframes = maxf(p.iframes, 0.2)
			if _poder_tick <= 0.0:
				_poder_tick = 0.12
				var n := Node3D.new(); n.position = Vector3(pos.x, Lib.h(pos.x, pos.z), pos.z); add_child(n)
				Lib.cil(n, 0.0, 0.45, 1.1, Vector3(0, 0.55, 0), Color(1.0, 0.4, 0.05), 5, Vector3.ZERO, 2.2).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
				Lib.cil(n, 0.0, 0.25, 0.7, Vector3(0.1, 0.4, 0.1), Color(1.0, 0.8, 0.2), 5, Vector3.ZERO, 2.8).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
				_fogos.append({"no": n, "t": 3.0, "tick": 0.0})
		"iara":
			if _poder_tick <= 0.0:
				_poder_tick = 0.5
				for e in enemies:
					if is_instance_valid(e) and not e.dead and not e.is_boss and e.global_position.distance_to(pos) < 7.5: e.stun_t = maxf(e.stun_t, 0.9)
				_efeito_anel(pos, 7.5, Dados.PODERES[poder]["cor"])
		"saci":
			if _poder_tick <= 0.0:
				_poder_tick = 0.3
				_ring(pos, 4.2 * p.area_mult, 9.0 * s, 0.0, 0.4)
				_efeito_anel(pos, 4.2 * p.area_mult, Color(0.9, 0.9, 0.85)); p.boneco.girar()
		"curupira": p.dash_cd = 0.0
		"boto":
			for fr in fireflies: fr["mag"] = true
		"corposeco": p.iframes = maxf(p.iframes, 0.2)
		"caipora": p.hp = minf(p.max_hp, p.hp + p.max_hp * 0.05 * delta)
	if poder_t <= 0.0: _fim_poder()

# ---------------- pulos de cada herói ----------------
func efeito_pulo(p: Jogador) -> void:
	_efeito_anel(p.global_position, 1.2, Color.WHITE)

func pousou(p: Jogador) -> void:
	if estado != "jogo": return
	var s := _escala_hab(p)
	match p.classe:
		"capoeirista":
			_ring(p.global_position, 2.6 * p.area_mult, 12.0 * s, 0.0, 1.0)
			_efeito_anel(p.global_position, 2.6 * p.area_mult, Dados.CLASSES[p.classe]["cor"])
		"jiujitsu":
			_ring(p.global_position, 2.8 * p.area_mult, 5.0 * s, 0.9, 0.0)
			_efeito_anel(p.global_position, 2.8 * p.area_mult, Dados.CLASSES[p.classe]["cor"]); tremor = maxf(tremor, 0.15)
		"frevista":        # só empurra, não bate — como o texto do pulo avisa
			_ring(p.global_position, 3.0 * p.area_mult, 0.0, 0.0, 2.2)
			_efeito_anel(p.global_position, 3.0 * p.area_mult, Dados.CLASSES[p.classe]["cor"])
		"cordelista":
			_ring(p.global_position, 2.4 * p.area_mult, 6.0 * s, 0.8, 0.3)
			_efeito_anel(p.global_position, 2.4 * p.area_mult, Dados.CLASSES[p.classe]["cor"])

# ---------------- tutorial ----------------
const TUT := [
	"Ande com {cima}, {esq}, {baixo} e {dir} (ou as setas).",
	"Mexa o mouse para girar a câmera.\nA rodinha aproxima e afasta.",
	"{pulo} pula. Dá para pular por cima dos bichos pequenos.\n%s",
	"{dash} dá uma arrancada para onde você estiver andando.\nNão gasta nada: é só esperar recarregar.",
	"Os golpes saem sozinhos. Chegue perto dos bichos e derrube todos!",
	"Os bichos deixam vaga-lumes: é o XP. Passe por cima deles\npara subir de nível e escolher uma carta.",
	"{q} é o seu especial: %s. Use perto dos bichos!",
	"{r} é o ultimate: %s.\nEle carrega derrubando bichos. Solte agora!",
	"Pelo mapa: potes (moedas e cura), baús (cartas raras, pagos com moedas),\noratórios (fique perto para ganhar uma graça) e a Bodega do Lampião.",
	"É isso! Na fase de verdade: aguente 10 minutos, vença o chefe\ne depois veja até onde você aguenta. ESC pausa, {info} mostra a build.",
]

func _tut_bichos(n: int) -> void:
	for i in range(n):
		var a := i * TAU / n
		var e := _nascer("caipora" if i % 2 == 0 else "saci", 0.6, 1.0, null, false)
		e.position = player.global_position + Vector3(cos(a) * 9.0, 0, sin(a) * 9.0)
		e.dmg = 1.0

func _tutorial(delta: float) -> void:
	var p := player
	p.hp = p.max_hp
	if painel_tut == null:
		painel_tut = Tela.painel(Color(1.0, 0.97, 0.86), 4)
		painel_tut.anchor_left = 0.5; painel_tut.anchor_right = 0.5; painel_tut.offset_top = 96
		painel_tut.grow_horizontal = Control.GROW_DIRECTION_BOTH
		lbl_tut = Tela.texto("", 19, 640); painel_tut.add_child(lbl_tut); hud.add_child(painel_tut)
	var hb: Dictionary = Dados.HABILIDADES[p.classe]
	var txt: String = TUT[tut]
	for it in Ctrl.ACOES: txt = txt.replace("{%s}" % it[0], Ctrl.nome(it[0]).to_upper())
	if tut == 2: txt = txt % Dados.CLASSES[p.classe]["pulo"]
	elif tut == 6: txt = txt % hb["q"]["nome"]
	elif tut == 7: txt = txt % hb["r"]["nome"]
	lbl_tut.text = "TUTORIAL %d/%d\n%s" % [tut + 1, TUT.size(), txt]
	tut_t += delta
	var feito := false
	match tut:
		0: feito = p.position.distance_to(_tut_pos) > 5.0 or (p.bot and tut_t > 1.0)
		1: feito = absf(cam_yaw - _tut_a) > 1.0 or (p.bot and tut_t > 1.0)
		2: feito = p.alt > 0.6 or (p.bot and tut_t > 1.0)
		3:
			if Ctrl.ap("dash") and p.dash_cd <= 0.0 and p.dash_t <= 0.0: p.forcar_dash()
			feito = p.dash_t > 0.0 or (p.bot and tut_t > 1.0)
		4:
			if tut_t < delta * 1.5: _tut_bichos(8)
			feito = tut_t > 1.0 and enemies.is_empty()
		5:
			if tut_t < delta * 1.5: _tut_bichos(12)    # bichos de verdade: ao morrer, deixam os vaga-lumes (como o texto explica)
			if enemies.is_empty() and tut_t > 1.2:
				for fr in fireflies: fr["mag"] = true   # ninguém fica preso catando vaga-lume de longe (ex.: benzedeira só atira)
			feito = p.level >= 2 and not levelup_aberto and fireflies.size() < 4 and enemies.is_empty()
		6:
			if tut_t < delta * 1.5: p.q_cd = 0.0; _tut_bichos(8)
			if enemies.is_empty() and p.q_cd <= 0.0 and tut_t > 2.0: _tut_bichos(8)
			feito = p.q_cd > 0.0 and tut_t > 1.0
		7:
			if tut_t < delta * 1.5: p.ult = 1.0; _tut_bichos(12)
			feito = p.ult_t > 0.0
		8: feito = tut_t > 7.0
		9:
			if tut_t > 7.0: _fim_tutorial()
	if feito and tut_t > 0.8:
		tut += 1; tut_t = 0.0; Som.tocar("carta")

func _fim_tutorial() -> void:
	if _teste_fim > 0.0:
		print("TUTORIAL OK em %s — nivel:%d abates:%d" % [_mmss(time), player.level, kills]); get_tree().quit(); return
	Salvo.d["tutorial"] = true; Salvo.salvar()
	get_tree().reload_current_scene()

# mini-chefe do portal: a Cuca. Vencer rende muito XP, moedas e dois baús de graça.
func _cuca(pos: Vector3) -> void:
	var forca := (1.0 + time / 75.0) * float(Dados.FASES[fase]["mult"])
	var c := _nascer("cuca", forca, 1.7, null, false)
	c.position = pos + Vector3(4.0, 0, 0); c.chefe_tipo = "cuca"; c.elite = true
	c.hp = 320.0 * forca; c.max_hp_cache = c.hp; c.dmg = 9.0 * sqrt(forca); c.speed = 2.6
	c.xp_val = 30.0 + time / 12.0; c.moeda_val = 60.0
	lbl_centro.text = "A CUCA VEIO PEGAR!\nVença para levar o tesouro dela"; _piscar_centro()
	Som.tocar("chefe")

func game_over() -> void:
	_encerrar("VOCÊ CAIU NA MATA", Color(0.95, 0.4, 0.3))

# Fim da partida (caiu, ou saiu depois de vencer o chefe): paga as moedas, guarda recorde e volta ao arraial.
func _encerrar(titulo: String, cor: Color) -> void:
	if estado == "fim": return
	estado = "fim"
	Som.tocar("venceu" if titulo == "FASE VENCIDA!" else "caiu")
	if titulo == "VOCÊ CAIU NA MATA": Som.voz("v_caiu")
	_mouse(false)
	var ganho := int(moedas * (1.0 if chefe_morto else 0.5))
	Salvo.d["moedas"] = int(Salvo.d["moedas"]) + ganho
	var linha := "Não venceu o chefe: leva metade das moedas"
	if chefe_morto:
		linha = "Aguentou %s depois do chefe" % _mmss(extra_t)
		var k := str(fase)
		if extra_t > float(Salvo.d["recordes"].get(k, -1.0)):
			Salvo.d["recordes"][k] = extra_t; linha += " — NOVO RECORDE!"
	Salvo.salvar()
	if _teste_fim == 2.0: _bot_fim(titulo)
	lbl_centro.text = ""
	var img: String = {"FASE VENCIDA!": "t_venceu", "VOCÊ CAIU NA MATA": "t_caiu"}.get(titulo, "")
	var linhas := "Fase %d — %s\nTempo %s  ·  %d abates  ·  nível %d\nMaior golpe: %s  ·  Dano total: %s\n%s" % [
		fase + 1, Dados.FASES[fase]["nome"], _mmss(time), kills, player.level, Tela.num(maior_dano), Tela.num(dano_total), linha]
	menus.fim(titulo, img, linhas, ganho)

func tomou_dano() -> void:
	_moldura_a = 0.75; tremor = maxf(tremor, 0.3); Som.tocar("dano", -2.0)

func _piscar_centro() -> void:
	await get_tree().create_timer(1.6).timeout
	if estado != "fim" and not levelup_aberto: lbl_centro.text = ""

func _hud() -> void:
	var p := player
	var f: Dictionary = Dados.FASES[fase]
	var dt := get_process_delta_time()
	var larg := get_viewport().get_visible_rect().size.x
	lbl_topo.text = _mmss(time)
	lbl_nv.text = "NÍVEL %d" % p.level
	lbl_dir.text = "☠ %d   ◉ %d" % [kills, int(moedas)]
	# segurando Tab, o minimapa do canto só aumenta no lugar dele mesmo — não cobre a tela
	var mapa_ampliado: bool = Ctrl.ap("mapa") and not levelup_aberto
	var lado_map := (380.0 if mapa_ampliado else 194.0)
	minimapa.offset_right = -14; minimapa.offset_left = -14 - lado_map
	minimapa.offset_top = 12; minimapa.offset_bottom = 12 + lado_map
	lbl_dir.offset_top = 12 + lado_map + 4.0
	_inventario()
	painel_info.visible = Ctrl.ap("info")
	if painel_info.visible: _montar_placar()
	if chefe_morto: lbl_sub.text = "Tempo extra %s · moedas ×%.1f · F sai com o que ganhou" % [_mmss(extra_t), 1.0 + extra_t / 90.0]
	elif chefe_veio: lbl_sub.text = "%s, %s — %s" % [f["chefe_nome"], f["chefe_titulo"], "ENFURECIDO!" if furia else "enfurece em " + _mmss(furia_t)]
	elif tut >= 0: lbl_sub.text = "Tutorial"
	if poder != "": lbl_sub.text = "%s — %d s" % [Dados.PODERES[poder]["nome"], int(ceil(poder_t))]
	else: lbl_sub.text = "Chefe em " + _mmss(maxf(0.0, chefe_t - time))
	barra_chefe_bg.visible = chefe_veio and not chefe_morto and is_instance_valid(chefe)
	if barra_chefe_bg.visible: barra_chefe.size.x = 494.0 * clampf(chefe.hp / chefe.max_hp_cache, 0, 1)
	# vida: a parte clara mostra o que acabou de perder e vai sumindo
	var fr := clampf(p.hp / p.max_hp, 0, 1)
	_vida_lag = fr if fr > _vida_lag else maxf(fr, _vida_lag - dt * 0.35)
	barra_vida.size.x = 258.0 * fr; barra_lag.size.x = 258.0 * _vida_lag
	barra_vida.color = Tela.URUCUM if fr > 0.3 else Color(1.0, 0.2, 0.1).lerp(Tela.URUCUM, 0.5 + 0.5 * sin(time * 9.0))
	barra_xp.size.x = 260.0 * clampf(p.xp / p.xp_next, 0, 1)
	lbl_vida.text = "♥ %d / %d" % [ceil(p.hp), p.max_hp]
	_moldura_a = maxf(0.0, _moldura_a - dt * 1.6)
	var baixa := 0.0 if fr > 0.3 else (0.3 + 0.2 * sin(time * 7.0)) * (1.0 - fr / 0.3 * 0.5)
	moldura.modulate.a = maxf(_moldura_a, baixa)
	# quadrinhos
	if _slots.size() != p.golpes.size() + 2: _refazer_slots()
	for i in range(p.golpes.size()):
		var g: Dictionary = p.golpes[i]; var q: Dictionary = _slots[i]
		var cd := Dados.cd_golpe(g["id"], g["nivel"], p.atk_speed)
		q["som"].size.y = (q["tam"] - 8.0) * clampf(g["t"] / cd, 0, 1)
		q["nv"].text = "MÁX" if g["nivel"] >= Dados.NIVEL_MAX else str(g["nivel"])
	var hb: Dictionary = Dados.HABILIDADES[p.classe]
	var sq: Dictionary = _slots[-2]; var sr: Dictionary = _slots[-1]
	sq["som"].size.y = (sq["tam"] - 8.0) * clampf(p.q_cd / float(hb["q"]["cd"]), 0, 1)
	sq["txt"].text = "" if p.q_cd <= 0.0 else str(int(ceil(p.q_cd)))
	sr["som"].size.y = (sr["tam"] - 8.0) * (0.0 if p.ult_t > 0.0 else 1.0 - p.ult)
	sr["txt"].text = "" if p.ult >= 1.0 or p.ult_t > 0.0 else "%d%%" % int(p.ult * 100.0)
	var pulso := 1.0 + 0.25 * (0.5 + 0.5 * sin(time * 8.0))
	sr["no"].modulate = Color(pulso, pulso, 0.9) if p.ult >= 1.0 or p.ult_t > 0.0 else Color.WHITE
	sq["no"].modulate = Color.WHITE if p.q_cd > 0.0 else Color(1.12, 1.12, 1.0)
	# sequência de abates
	combo_t -= dt
	if combo_t <= 0.0: combo = 0
	lbl_combo.text = "" if combo < 5 else "×%d\nSEQUÊNCIA" % combo
	lbl_combo.modulate.a = clampf(combo_t / 1.2, 0.25, 1.0)

# mini inventário: um quadradinho por tipo de carta de atributo, com a quantidade
func _inventario() -> void:
	var p := player
	if _inv_n == p.cartas_stat.size(): return
	_inv_n = p.cartas_stat.size()
	for c in caixa_inv.get_children(): c.queue_free()
	var conta := {}; var melhor := {}
	for c in p.cartas_stat:
		conta[c["id"]] = int(conta.get(c["id"], 0)) + 1
		melhor[c["id"]] = maxi(int(melhor.get(c["id"], 0)), int(c["rar"]))
	for id in conta:
		var q := Panel.new(); q.custom_minimum_size = Vector2(34, 34)
		var cr: Color = Dados.RARIDADES[melhor[id]]["cor"] if melhor[id] > 0 else Tela.TINTA
		q.add_theme_stylebox_override("panel", Tela.caixa(Tela.PAPEL, 2, cr.darkened(0.2) if melhor[id] > 0 else cr, 0, 3))
		var im := Tela.imagem("a_" + String(Dados.STATS[id]["arte"]), Vector2(28, 28)); im.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		im.position = Vector2(3, 3); im.size = Vector2(28, 28); im.clip_contents = true; q.add_child(im)
		if conta[id] > 1:
			var l := _label(13, HORIZONTAL_ALIGNMENT_RIGHT); l.text = "×%d" % conta[id]; l.position = Vector2(0, 16); l.size = Vector2(33, 18); q.add_child(l)
		caixa_inv.add_child(q)

# placar estilo "ver build" (Tab): uma coluna por pessoa na sala; sozinho, é só a sua
func _montar_placar() -> void:
	for c in caixa_placar.get_children(): c.queue_free()
	var gente: Array = (Rede.ids() if Rede.ativo() else [0])
	for id in gente:
		var j = (jogadores_rede.get(id, null) if Rede.ativo() else player)
		if j == null or not is_instance_valid(j): continue
		caixa_placar.add_child(_coluna_placar(j, id))

func _coluna_placar(j: Jogador, id: int) -> PanelContainer:
	var c: Dictionary = Dados.CLASSES[j.classe]
	var p := PanelContainer.new(); p.custom_minimum_size = Vector2(230, 0)
	p.add_theme_stylebox_override("panel", Tela.caixa(Color(1.0, 0.97, 0.86), 3, c["cor"].darkened(0.2), 5))
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 3); p.add_child(v)
	var nome: String = Rede.nome_por_id.get(id, "") if Rede.ativo() else ""
	v.add_child(Tela.faixa((nome + " — " if nome != "" else "") + String(c["apelido"]).to_upper(), c["cor"], 13, Tela.TINTA))
	v.add_child(Tela.rotulo("NÍVEL %d" % j.level, 14, Tela.TINTA, HORIZONTAL_ALIGNMENT_CENTER, true))
	for g in j.golpes: v.add_child(Tela.rotulo("%s — nv %d" % [Dados.GOLPES[g["id"]]["nome"], g["nivel"]], 12, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT))
	var st := "Vida %d/%d  ·  Dano +%d%%\nCrítico %d%% (×%.1f)  ·  Atq +%d%%\nÁrea +%d%%  ·  Defesa %d%%  ·  Regen %.1f/s" % [
		int(ceil(j.hp)), int(j.max_hp), int(round((j.dano_mult - 1.0) * 100.0)), int(round(j.crit * 100.0)), j.crit_dano,
		int(round((j.atk_speed - 1.0) * 100.0)), int(round((j.area_mult - 1.0) * 100.0)), int(round(minf(0.7, j.armor) * 100.0)), j.regen]
	v.add_child(Tela.texto(st, 11, 214, Tela.TINTA, HORIZONTAL_ALIGNMENT_LEFT))
	if id == Rede.meu_id() or not Rede.ativo():
		v.add_child(Tela.texto("Maior golpe: %s\nDano total: %s\nSequência: ×%d" % [Tela.num(maior_dano), Tela.num(dano_total), combo], 11, 214, Tela.ANIL))
	return p

func _mmss(t: float) -> String:
	return "%d:%02d" % [int(t) / 60, int(t) % 60]

# prints de conferência
func _salvar(nome: String) -> void:
	await get_tree().create_timer(1.0).timeout
	var img := get_viewport().get_texture().get_image()
	img.save_png(ProjectSettings.globalize_path("res://%s.png" % nome))
	get_tree().quit()

func _shot_tela(nome: String) -> void:
	sem_mouse = true
	Salvo.d["moedas"] = 345; Salvo.d["fase_max"] = 1; Salvo.d["melhorias"] = {"capoeirista": {"dano": 3, "vida": 1}, "jiujitsu": {"dano": 7, "critico": 4}}; Salvo.d["recordes"] = {"0": 100.0}
	Salvo.d["contadores"] = {"abates": 812, "abates_saci": 150, "chefes": 1, "uso_kimura": 40, "criticos": 300}
	if nome in ["herois", "melhorias", "opcoes", "titulo", "feitos", "controles", "pergtut", "herois_tut", "coop"]:
		_montar_menu()
		if nome == "herois": menus.herois()
		elif nome == "herois_tut": menus._so_tutorial = true; menus.herois()
		elif nome == "melhorias": menus.melhorias()
		elif nome == "feitos": menus.feitos()
		elif nome == "opcoes": menus.opcoes(menus.titulo)
		elif nome == "controles": menus._aba = "controles"; menus.opcoes(menus.titulo)
		elif nome == "coop": menus.coop()
		elif nome == "pergtut": _montar_menu(); menus.herois(); menus.perguntar_tutorial()
	else:
		iniciar_jogo("capoeirista" if nome != "nivel2" else "cangaceiro", 3 if nome == "cristo" else 0)
		player.aplicar_carta({"tipo": "golpe_novo", "id": Dados.CLASSES[player.classe]["desbloqueia"].keys()[0]})
		player.level = 4
		for i in range(14):
			var a := i * TAU / 14.0
			_nascer("caipora" if i % 2 == 0 else "saci", 1.0, 1.0, null, false)
			enemies[-1].position = player.global_position + Vector3(cos(a) * (4.0 + i % 3 * 2.0), 0, sin(a) * (4.0 + i % 3 * 2.0))
			enemies[-1].hp = 9999
		await get_tree().create_timer(1.3).timeout
		dano_total = 48213.0; maior_dano = 1840.0
		if nome == "pausa": estado = "pausa"; menus.pausa()
		elif nome == "fim": _encerrar("VOCÊ CAIU NA MATA", Color.WHITE)
		elif nome == "jogo": pass
		elif nome == "bau": abrir_escolha("bau")
		elif nome == "loja": moedas = 60.0; abrir_loja()
		elif nome == "tutorial": tut = 2
		elif nome == "mula":
			dar_poder("mula"); player.position += Vector3(3, 0, 0)
			await get_tree().create_timer(0.5).timeout
			player.position += Vector3(2, 0, 2)
		elif nome == "cristo":
			player.position = Vector3(0, 0, 4); cam_yaw = 0.0; cam_pitch = 0.2; cam_dist = 20.0
		elif nome == "placar":
			var ek := InputEventKey.new(); ek.physical_keycode = Ctrl.tecla("info"); ek.pressed = true
			Input.parse_input_event(ek)
		elif nome == "mapagrande":
			_montar_objetos()
			var ek := InputEventKey.new(); ek.physical_keycode = Ctrl.tecla("mapa"); ek.pressed = true
			Input.parse_input_event(ek)
		elif Dados.NPCS.has(nome):
			moedas = 70.0; _teste_fim = 0.0; Salvo.d["falas"][nome] = randi() % 5; abrir_npc(nome)
		elif nome == "lore": abrir_escolha("lore:lobisomem")
		elif nome == "inv":
			for sid in ["dano", "dano", "critico", "vermes", "pulo", "area", "vida"]: player.aplicar_carta({"tipo": "stat", "id": sid, "rar": randi() % 5})
		elif nome == "feitos": pass
		else: abrir_escolha("nivel")
	_salvar("shot_" + nome)

func _shot_debug(cls: String) -> void:
	sem_mouse = true
	iniciar_jogo(cls)
	for id in Dados.CLASSES[cls]["desbloqueia"]:
		player.aplicar_carta({"tipo": "golpe_novo", "id": id})
	player.max_hp = 1e6; player.hp = 1e6
	for i in range(14):
		var a := i * TAU / 14.0
		_nascer("caipora" if i % 2 == 0 else "saci", 1.0, 1.0 if i != 5 else 1.5, null if i != 5 else Color(0.98, 0.85, 0.2), false)
		enemies[-1].position = player.global_position + Vector3(cos(a) * (5.5 + i % 3 * 2.0), 0, sin(a) * (5.5 + i % 3 * 2.0))
		enemies[-1].hp = 9999
	_salvar("shot_" + cls)

# confere, sem precisar da tela toda, que a arrancada do tutorial funciona mesmo parado
func _teste_coop_host() -> void:
	sem_mouse = true    # teste automático: nunca prende o mouse do jogador de verdade
	Salvo.d["nome_jogador"] = "Anfitriao"
	sel_heroi = "capoeirista"; sel_fase = 0
	var erro := Rede.hospedar()
	if erro != "": print("ERRO HOST: ", erro); get_tree().quit(); return
	var espera := 0
	while Rede.ids().size() < 2 and espera < 12:
		await get_tree().create_timer(1.0).timeout
		espera += 1
	print("HOST viu %d na sala depois de %ds: %s" % [Rede.ids().size(), espera, str(Rede.ids())])
	Rede.comecar()
	_teste_coop_relatar()

func _teste_coop_join(ip: String) -> void:
	sem_mouse = true    # teste automático: nunca prende o mouse do jogador de verdade
	Salvo.d["nome_jogador"] = "Convidado"
	sel_heroi = "jiujitsu"; sel_fase = 0
	var erro := Rede.entrar(ip)
	if erro != "": print("ERRO JOIN: ", erro); get_tree().quit(); return
	_teste_coop_relatar()

func _teste_coop_relatar() -> void:
	for i in range(16):
		await get_tree().create_timer(1.0).timeout
		if estado != "jogo" or player == null:
			print("COOP eu=%s tick=%d AINDA SEM JOGO (estado=%s)" % [sel_heroi, i, estado]); continue
		if not Rede.sou_host() and i == 0: player.position = Vector3(20, 0, 20)   # longe do anfitrião, pra isolar o teste
		if Rede.sou_host() and i == 3 and jogadores_rede.size() >= 2:
			var alvo_pos: Vector3 = player.global_position
			for id in jogadores_rede:
				if id != Rede.meu_id(): alvo_pos = jogadores_rede[id].global_position
			var bicho := _nascer("caipora", 0.3, 1.0, null, false)
			bicho.position = alvo_pos; bicho.hp = 400.0; bicho.max_hp_cache = 400.0; bicho.dmg = 8.0
			_replicar_bicho(bicho)
			print("HOST criou bicho de teste (aguenta apanhar) em %s hp=%.0f net_id=%d" % [str(alvo_pos), bicho.hp, bicho.net_id])
		if not Rede.sou_host() and i == 9 and enemies.size() > 0:
			var k := _ring(player.global_position, 6.0, 1000.0, 0.0, 0.0)
			print("CLIENTE atacou — _ring acertou %d bicho(s)" % k)
		print("COOP eu=%s id=%d tick=%d jogadores=%d bichos=%d nivel=%d xp=%.1f moedas=%.1f vida=%.1f/%.1f" % [
			sel_heroi, Rede.meu_id(), i, jogadores_rede.size(), enemies.size(), player.level, player.xp, moedas, player.hp, player.max_hp])
	get_tree().quit()

func _teste_dash() -> void:
	iniciar_jogo("capoeirista")
	player.frente = Vector3(0, 0, 1)
	player.forcar_dash()
	print("TESTE ARRANCADA — dash_t:%.2f dash_dir:%s (esperado dash_t > 0)" % [player.dash_t, player.dash_dir])
	get_tree().quit()

func _galeria() -> void:
	cam_fixa = true
	var nomes := ["frevista", "cordelista", "capoeirista", "jiujitsu", "benzedeira", "cangaceiro"]
	for i in range(nomes.size()):
		var b := Boneco.criar(nomes[i]); add_child(b)
		var x := (i - 3.5) * 1.5
		b.position = Vector3(x, Lib.h(x, 0), 0); b.rotation.y = 0.35
	camera.fov = 40.0; sem_mouse = true
	camera.global_position = Vector3(0, Lib.h(0, 0) + 1.9, 9.5)
	camera.look_at(Vector3(0, Lib.h(0, 0) + 1.0, 0), Vector3.UP)
	_salvar("shot_galeria")

# Muralha de mata amazônica em volta da clareira: árvores gigantes coladas, com sapopemba e cipó.
func _montar_muralha() -> void:
	var rng := RandomNumberGenerator.new(); rng.seed = 314
	var verdes := [Color(0.05, 0.3, 0.12), Color(0.08, 0.37, 0.14), Color(0.12, 0.44, 0.16), Color(0.04, 0.24, 0.1)]
	var casca := Color(0.3, 0.2, 0.13)
	for anel in range(3):
		var r := ARENA + 1.5 + anel * 4.5
		var n := int(TAU * r / (3.3 + anel * 0.9))
		for i in range(n):
			var a := i * TAU / n + rng.randf() * 0.05 + anel * 0.37
			var rr := r + rng.randf_range(-0.7, 0.7)
			var x := cos(a) * rr; var z := sin(a) * rr
			var t := Node3D.new(); t.position = Vector3(x, Lib.h(x, z) - 0.3, z); t.rotation.y = rng.randf() * TAU
			var e := 1.0 + rng.randf() * 0.5 + anel * 0.3
			t.scale = Vector3(e, e, e); add_child(t); oclusores.append([t, x, z, 3.7 * e])
			var alt := 7.0 + rng.randf() * 3.5
			Lib.cil(t, 0.35, 0.62, alt, Vector3(0, alt * 0.5, 0), casca, 6)
			Lib.esf(t, 3.3, Vector3(0, alt + 0.6, 0), verdes[rng.randi() % 4], Vector3(1, 0.62, 1), 6)
			Lib.esf(t, 2.4, Vector3(1.7, alt - 0.9, 0.6), verdes[rng.randi() % 4], Vector3(1, 0.62, 1), 6)
			if anel == 0:
				for k in range(3):                                          # sapopemba
					Lib.cx(t, Vector3(0.14, 1.7, 1.9), Vector3(0, 0.6, 0), casca, Vector3(0, k * TAU / 6.0, 0))
				for k in range(3):                                          # cipós
					Lib.cil(t, 0.035, 0.035, alt * 0.55, Vector3(rng.randf_range(-2.2, 2.2), alt * 0.62, rng.randf_range(-2.2, 2.2)), Color(0.22, 0.42, 0.15), 4)
				Lib.esf(t, 1.7, Vector3(1.5, 0.8, 0.3), verdes[rng.randi() % 4], Vector3(1.25, 1.0, 1.25), 6)   # moita fechando o vão
				Lib.esf(t, 1.3, Vector3(-1.4, 0.6, -0.4), verdes[rng.randi() % 4], Vector3(1.2, 1.0, 1.2), 6)

func _borda() -> void:
	sem_mouse = true
	iniciar_jogo("benzedeira")
	player.position = Vector3(ARENA - 10.0, 0, -14.0)
	player.frente = Vector3(-1, 0, 0.3)
	cam_yaw = -PI / 2.0; cam_pitch = 0.3; cam_dist = 9.0
	_salvar("shot_borda")

# ---------------- especial (Q) e ultimate (R) ----------------
func _escala_hab(p: Jogador) -> float:
	return p.dano_mult * (1.0 + 0.06 * (p.level - 1))

func _mais_forte(pos: Vector3, maxd: float):
	var melhor = null; var bh := 0.0
	for e in enemies:
		if not is_instance_valid(e) or e.dead: continue
		var dd: Vector3 = e.global_position - pos; dd.y = 0
		if dd.length() <= maxd and e.hp > bh: bh = e.hp; melhor = e
	return melhor

func usar_especial(p: Jogador) -> void:
	if p.q_cd > 0.0 or p.lunge_t > 0.0: return
	var hq: Dictionary = Dados.HABILIDADES[p.classe]["q"]
	var s := _escala_hab(p); var pos: Vector3 = p.global_position
	var cor: Color = Dados.CLASSES[p.classe]["cor"]
	match p.classe:
		"capoeirista":
			p.iframes = 0.8; p.dash_t = 0.25; p.dash_dir = p.frente; p.boneco.girar()
			_ring(pos, 4.0 * p.area_mult, 38.0 * s, 0.6, 2.0)
			_efeito_anel(pos, 4.2 * p.area_mult, cor); _efeito_anel(pos, 2.6, Color.WHITE)
		"jiujitsu":
			var alvo = _mais_forte(pos, 9.0)
			if alvo == null: return
			p.guarda_t = 1.5
			var alvo_id: int = alvo.get_instance_id()
			p.comecar_investida(alvo.global_position, 22.0, func():
				_efeito_anel(p.global_position, 2.2, cor)
				var al = instance_from_id(alvo_id)
				if al != null and is_instance_valid(al) and not al.dead:
					al.stun_t = maxf(al.stun_t, 0.6 if al.is_boss else 2.5)
					ferir(al, 160.0 * s)
					if al.dead: p.curar(p.max_hp * 0.10))
		"benzedeira":
			p.curar(p.max_hp * 0.3)
			_ring(pos, 5.5 * p.area_mult, 20.0 * s, 0.8, 3.5)
			_efeito_anel(pos, 5.5 * p.area_mult, Color(0.5, 1.0, 0.6))
		"cangaceiro":
			var alvo2 = _mais_forte(pos, 28.0)
			var dir: Vector3 = p.frente
			if alvo2:
				dir = alvo2.global_position - pos; dir.y = 0; dir = dir.normalized()
			_disparar(pos, dir * 32.0, TIRO_Q, 210.0 * s)
			p.boneco.atacar()
		"frevista":
			p.iframes = 0.7; p.dash_t = 0.22; p.dash_dir = p.frente; p.boneco.girar()
			_ring(pos, 4.0 * p.area_mult, 34.0 * s, 0.5, 1.8)
			_efeito_anel(pos, 4.0 * p.area_mult, cor); _efeito_anel(pos, 2.4, Color.WHITE)
		"cordelista":
			var alvo3q = _mais_forte(pos, 28.0)
			var dir3: Vector3 = p.frente
			if alvo3q:
				dir3 = alvo3q.global_position - pos; dir3.y = 0; dir3 = dir3.normalized()
			_disparar(pos, dir3 * 30.0, TIRO_Q, 220.0 * s)
			p.boneco.atacar()
	p.q_cd = hq["cd"]
	Som.tocar("especial")
	Salvo.contar("uso_especial_" + p.classe)
	popup(pos, hq["nome"])

func usar_ultimate(p: Jogador) -> void:
	if p.ult < 1.0 or p.ult_t > 0.0: return
	var hr: Dictionary = Dados.HABILIDADES[p.classe]["r"]
	p.ult = 0.0; p.ult_tick = 0.0; p.ult_t = hr["dur"]
	Som.tocar("ult")
	var voz_ult: String = {"capoeirista": "v_cap", "jiujitsu": "v_jiu", "benzedeira": "v_ben", "cangaceiro": "v_can"}.get(p.classe, "")
	if voz_ult != "": Som.voz(voz_ult)
	tremor = 0.4
	if p.classe == "capoeirista": p.guarda_t = hr["dur"]
	Salvo.contar("uso_ultimate_" + p.classe)
	lbl_centro.text = String(hr["nome"]).to_upper(); _piscar_centro()

func _hab_update(delta: float) -> void:
	var p := player
	if p.ult_t <= 0.0: return
	p.ult_t -= delta; p.ult_tick -= delta
	if p.ult_tick > 0.0: return
	var s := _escala_hab(p); var pos: Vector3 = p.global_position
	var cor: Color = Dados.CLASSES[p.classe]["cor"]
	match p.classe:
		"capoeirista":
			p.ult_tick = 0.3; p.boneco.girar()
			_ring(pos, 4.6 * p.area_mult, 16.0 * s, 0.0, 0.6)
			_efeito_anel(pos, 4.6 * p.area_mult, cor)
		"jiujitsu":
			p.ult_tick = 0.2; p.iframes = 0.45
			var alvo = _nearest(pos, 14.0)
			if alvo:
				var d: Vector3 = alvo.global_position - pos; d.y = 0
				p.position += d * 0.85
				if d.length() > 0.1: p.frente = d.normalized()
				p.boneco.atacar()
				var k := _ring(p.global_position, 2.2, 110.0 * s, 1.0, 0.0)
				_efeito_anel(p.global_position, 2.2, cor)
				if k > 0: p.curar(p.max_hp * 0.02 * k)
		"benzedeira":
			p.ult_tick = 0.15
			var a := randf() * TAU
			_disparar(pos, Vector3(cos(a), 0, sin(a)) * 12.0, FOGO_ULT, 22.0 * s, _nearest(pos, 30.0))
		"cangaceiro":
			p.ult_tick = 0.25; p.boneco.atacar()
			for i in range(8):
				var a2 := i * TAU / 8.0 + time * 2.0
				_disparar(pos, Vector3(cos(a2), 0, sin(a2)) * 16.0, BALA_ULT, 14.0 * s)
		"frevista":
			p.ult_tick = 0.28; p.boneco.girar()
			_ring(pos, 4.2 * p.area_mult, 15.0 * s, 0.0, 0.5)
			_efeito_anel(pos, 4.2 * p.area_mult, cor)
		"cordelista":
			p.ult_tick = 0.25; p.boneco.atacar()
			for i in range(8):
				var a3 := i * TAU / 8.0 + time * 2.0
				_disparar(pos, Vector3(cos(a3), 0, sin(a3)) * 16.0, BALA_ULT, 13.0 * s)

# ---------------- ataques dos chefes ----------------
func aviso_chefe(pos: Vector3, raio: float, txt: String) -> void:
	_efeito_anel(pos, raio, Color(1.0, 0.15, 0.1))
	dano_num(pos + Vector3(0, 2.0, 0), txt, Color(1.0, 0.3, 0.2), 64)

func efeito_chefe(pos: Vector3, raio: float) -> void:
	Som.tocar("pisao")
	_efeito_anel(pos, raio, Color(1.0, 0.5, 0.1)); _efeito_anel(pos, raio * 0.6, Color(1.0, 0.9, 0.4))

func tiro_inimigo(pos: Vector3, vel: Vector3, dmg: float, cor: Color = Color(1.0, 0.45, 0.1)) -> void:
	var n := Lib.esf(self, 0.35, pos + Vector3(0, 0.9, 0), cor, Vector3.ONE, 6, 2.5)
	n.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	tiros.append({"node": n, "vel": vel, "dmg": dmg, "vida": 3.5})

func _tiros(delta: float) -> void:
	for t in tiros.duplicate():
		var n: Node3D = t["node"]
		t["vida"] -= delta
		n.position += t["vel"] * delta
		n.position.y = Lib.h(n.position.x, n.position.z) + 0.9
		var alvo_tiro = _alvo_mais_perto(n.position)
		var dd: Vector3 = alvo_tiro.global_position - n.position if alvo_tiro else Vector3(99, 0, 99); dd.y = 0
		if alvo_tiro and dd.length() < 0.8 and alvo_tiro.alt < 1.3:
			ferir_jogador(alvo_tiro, t["dmg"]); t["vida"] = 0.0
		if t["vida"] <= 0.0:
			n.queue_free(); tiros.erase(t)

# print dos três chefes lado a lado
func _shot_chefe() -> void:
	cam_fixa = true
	var nomes := ["mapinguari", "mula", "boitata", "cuca", "minhocao"]
	for i in range(nomes.size()):
		var b := Boneco.criar(nomes[i]); add_child(b)
		var x := (i - 2) * 4.2
		b.position = Vector3(x, Lib.h(x, 0), 0); b.rotation.y = 0.55; b.scale = Vector3(1.6, 1.6, 1.6)
	var h0 := Boneco.criar("capoeirista"); add_child(h0); h0.position = Vector3(-10.8, Lib.h(-10.8, 0), 0.5); h0.rotation.y = 0.5
	camera.fov = 65.0
	camera.global_position = Vector3(-0.5, Lib.h(0, 0) + 4.5, 20.0)
	camera.look_at(Vector3(-0.5, Lib.h(0, 0) + 1.7, 0), Vector3.UP)
	_salvar("shot_chefes")
