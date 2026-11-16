extends Node3D
class_name Jogador
# O herói, agora com as 4 classes e seus golpes (portados do 2D).

var world
var boneco: Boneco
var frente := Vector3(0, 0, 1)   # para onde o herói olha
var alt := 0.0                   # altura do pulo
var vy := 0.0

var classe := "capoeirista"
var max_hp := 125.0
var hp := 125.0
var speed := 6.4
var dodge := 0.0
var armor := 0.0
var regen := 0.0
var crit := 0.05
var crit_dano := 2.0             # multiplicador do golpe crítico
var dano_mult := 1.0
var atk_speed := 1.0
var area_mult := 1.0
var ima := 1.0
var bot := false                 # robô de teste: anda sozinho
var q_cd := 0.0                  # recarga do especial (Q)
var ult := 0.0                   # carga do ultimate (R), de 0 a 1
var ult_t := 0.0                 # ultimate em andamento
var ult_tick := 0.0
var xp_mult := 1.0
var pulos_extra := 0            # pulos no ar (carta Pulo do Saci; o capoeirista já nasce com 1)
var pulos_feitos := 0
var _esp_ant := false
var crit_certo := false         # cangaceiro: depois do rolamento, o próximo golpe é crítico
var segunda_chance := false    # Guarda do Malandro (Seu Zé Pilintra)
var pombas := 0                # carta Pomba Girando
var roubo := 0.0                # vida curada por abate (carta Vermes que Comem Carne)
var cartas_stat: Array = []     # cartas de atributo pegas na partida [{id, v, rar}]
var guarda_t := 0.0             # jiu-jitsu: guarda fechada logo depois da investida

var level := 1
var xp := 0.0
var xp_next := 8.0
var golpes: Array = []    # [{id, nivel, t}]

var dash_t := 0.0
var dash_cd := 0.0
var dash_dir := Vector3.ZERO
var iframes := 0.0
# investida (kimura/queda): o herói corre até o alvo e então acerta
var lunge_t := 0.0
var lunge_vel := Vector3.ZERO
var lunge_cb := Callable()

func configurar(id: String) -> void:
	classe = id
	var c = Dados.CLASSES[id]
	max_hp = c["maxhp"]; hp = max_hp; speed = c["speed"]
	dodge = c.get("dodge", 0.0); armor = c.get("armor", 0.0)
	regen = c.get("regen", 0.0); crit = Dados.CRIT_BASE + c.get("crit", 0.0) + 0.02 * Salvo.nivel("critico")
	crit_dano = Dados.CRIT_DANO
	golpes = [{"id": c["inicial"], "nivel": 1, "t": 0.4}]
	# melhorias permanentes compradas no arraial
	dano_mult += 0.05 * Salvo.nivel("dano")
	max_hp += 12.0 * Salvo.nivel("vida"); hp = max_hp
	speed *= 1.0 + 0.02 * Salvo.nivel("velocidade")
	xp_mult = 1.0 + 0.06 * Salvo.nivel("xp")
	ima += 0.10 * Salvo.nivel("ima")
	if classe == "capoeirista": pulos_extra = 1

func _ready() -> void:
	boneco = Boneco.criar(classe)
	add_child(boneco)

func _process(delta: float) -> void:
	if world.levelup_aberto or world.estado != "jogo":
		return
	if Rede.ativo() and get_multiplayer_authority() != multiplayer.get_unique_id():
		return   # boneco de outra pessoa no co-op: a posição dela já chega pronta pela rede
	iframes = maxf(0.0, iframes - delta)
	dash_cd = maxf(0.0, dash_cd - delta)
	guarda_t = maxf(0.0, guarda_t - delta)
	q_cd = maxf(0.0, q_cd - delta)
	if Ctrl.ap("q"): world.usar_especial(self)
	if Ctrl.ap("r"): world.usar_ultimate(self)
	if bot:
		if world._nearest(global_position, 4.5) != null and (classe != "benzedeira" or hp < max_hp * 0.7 or world.tut >= 0): world.usar_especial(self)
		if world.enemies.size() > 12 or (world.tut >= 0 and world.enemies.size() > 3): world.usar_ultimate(self)
	if hp > 0.0 and regen > 0.0:
		hp = minf(max_hp, hp + regen * delta)
	# pulo
	if alt > 0.0 or vy > 0.0:
		var grav := 22.0
		if classe == "benzedeira" and vy < 0.0 and Ctrl.ap("pulo"): grav = 4.5   # plana
		vy -= grav * delta
		if classe == "benzedeira" and grav < 10.0: vy = maxf(vy, -2.2)
		alt += vy * delta
		if alt <= 0.0:
			alt = 0.0; vy = 0.0; pulos_feitos = 0
			world.pousou(self)

	# investida em andamento: ignora o controle até chegar
	if lunge_t > 0.0:
		lunge_t -= delta
		position += lunge_vel * delta
		iframes = maxf(iframes, 0.1)
		if lunge_t <= 0.0 and lunge_cb.is_valid():
			lunge_cb.call()
		_clamp(); _anim(delta, true); _firar(delta); return

	# andar em relação à câmera (W = para onde a câmera olha)
	var ix := 0.0; var iz := 0.0
	var cm := Ctrl.mov()
	ix = cm.x; iz = cm.y
	var yaw: float = world.cam_yaw
	var mv := Vector3(-sin(yaw), 0, -cos(yaw)) * iz + Vector3(cos(yaw), 0, -sin(yaw)) * ix
	if bot: mv = world.bot_dir()
	var moving := mv.length() > 0.1
	if moving:
		mv = mv.normalized()
		frente = mv

	var esp := Ctrl.ap("pulo")
	if esp and not _esp_ant:
		var forca: float = {"capoeirista": 10.0, "jiujitsu": 7.4, "benzedeira": 8.5, "cangaceiro": 8.5, "frevista": 11.0, "cordelista": 8.0,
			"sambista": 9.0, "maracatuzeiro": 7.0, "violeiro": 8.5, "carimbozeiro": 10.5,
			"forrozeiro": 9.5, "angoleiro": 7.2, "marujo": 8.5}[classe]
		if alt <= 0.0:
			vy = forca; alt = 0.01; pulos_feitos = 0; Som.tocar("pulo")
			if classe == "capoeirista": boneco.girar()
		elif pulos_feitos < pulos_extra:
			pulos_feitos += 1; vy = forca * 0.92; boneco.girar(); Som.tocar("pulo", 0.0, 0.2)
			world.efeito_pulo(self)
	_esp_ant = esp
	if Ctrl.ap("dash") and dash_cd <= 0.0 and dash_t <= 0.0 and moving:
		dash_t = 0.18; dash_cd = 1.4; dash_dir = mv; iframes = 0.3; Som.tocar("dash")
		match classe:
			"capoeirista": iframes = 0.5; boneco.girar()
			"jiujitsu": guarda_t = maxf(guarda_t, 1.0)
			"cangaceiro": crit_certo = true
			"benzedeira": dash_t = 0.24
	if dash_t > 0.0:
		dash_t -= delta
		position += dash_dir * speed * 3.2 * delta
	elif moving:
		position += mv * speed * delta

	_clamp()
	_anim(delta, moving)
	_firar(delta)

func _firar(delta: float) -> void:
	for g in golpes:
		g["t"] -= delta
		if g["t"] <= 0.0:
			g["t"] = Dados.cd_golpe(g["id"], g["nivel"], atk_speed)
			world.cast_golpe(self, g["id"], g["nivel"])
			var tp: String = Dados.GOLPES[g["id"]]["tipo"]
			if tp == "ring" or tp == "onda": boneco.girar()
			else: boneco.atacar()

func _clamp() -> void:
	var r2 := Vector2(position.x, position.z)
	if r2.length() > world.ARENA - 1.2:      # a mata fechada não deixa passar
		r2 = r2.normalized() * (world.ARENA - 1.2)
		position.x = r2.x; position.z = r2.y
	world.empurrar(self)
	position.y = Lib.h(position.x, position.z) + alt

func _anim(delta: float, moving: bool) -> void:
	boneco.rotation.y = lerp_angle(boneco.rotation.y, atan2(frente.x, frente.z), clampf(delta * 14.0, 0, 1))
	boneco.animar(delta, moving and alt <= 0.0, speed / 5.5)

# usado pelo tutorial: a arrancada funciona mesmo parado, na direção para onde o herói está olhando
func forcar_dash() -> void:
	if dash_cd > 0.0 or dash_t > 0.0: return
	dash_t = 0.18; dash_cd = 1.4
	dash_dir = frente if frente.length() > 0.1 else Vector3(0, 0, 1)
	iframes = 0.3; Som.tocar("dash")

func comecar_investida(alvo: Vector3, vel: float, aoChegar: Callable) -> void:
	var dir: Vector3 = alvo - global_position; dir.y = 0
	var d := dir.length()
	if d < 0.4: aoChegar.call(); return
	lunge_vel = dir.normalized() * vel
	lunge_t = d / vel
	lunge_cb = aoChegar
	frente = dir.normalized()

func hurt(d: float) -> void:
	if iframes > 0.0 or dash_t > 0.0 or lunge_t > 0.0: return
	if randf() < dodge:
		world.popup(global_position, "desvio"); return
	if guarda_t > 0.0: d *= 0.65
	hp -= d * (1.0 - minf(0.7, armor))
	boneco.bater()
	world.tomou_dano()
	iframes = 0.5
	if hp <= 0.0 and segunda_chance:
		segunda_chance = false; hp = max_hp * 0.5; iframes = 2.5
		world.seu_ze_segurou()
	elif hp <= 0.0:
		hp = 0.0
		world.game_over()

func gain_xp(v: float) -> void:
	xp += v * xp_mult
	while xp >= xp_next:
		xp -= xp_next
		level += 1
		xp_next = round(8 + level * 6 + 0.9 * level * level)
		hp = minf(max_hp, hp + max_hp * 0.08)
		world.abrir_escolha("nivel")

# cartas oferecidas ao subir de nível (3 à escolha)
# min_rar: raridade mínima (baú = Rara, oratório = Incomum); so_stats: só cartas de atributo (oratório)
func ofertas(min_rar: int = 0, so_stats: bool = false) -> Array:
	var armas := []
	var tem := {}
	for g in golpes:
		tem[g["id"]] = true
		if g["nivel"] < Dados.NIVEL_MAX: armas.append({"tipo": "golpe_up", "id": g["id"]})
	var desb: Dictionary = Dados.CLASSES[classe]["desbloqueia"]
	for id in desb:
		if not tem.has(id) and level >= int(desb[id]): armas.append({"tipo": "golpe_novo", "id": id})
	var stats := []
	for st in Dados.STATS:
		if st == "pulo" and pulos_extra >= 3: continue
		stats.append({"tipo": "stat", "id": st})
	armas.shuffle(); stats.shuffle()
	var cards := []
	if so_stats: armas = []
	if armas.size() > 0: cards.append(armas.pop_front())
	if armas.size() > 0 and randf() < 0.5: cards.append(armas.pop_front())
	while cards.size() < 3: cards.append(stats.pop_front())
	for c in cards:
		c["rar"] = 0 if c["tipo"] == "golpe_novo" else maxi(min_rar, Dados.sortear_raridade())
		if c["tipo"] == "stat" and Dados.STATS[c["id"]].get("fixo", false): c["rar"] = 3
	cards.shuffle()
	return cards

static func niveis_da_carta(card: Dictionary) -> int:
	var r: int = card.get("rar", 0)
	return 1 if r < 2 else (2 if r < 4 else (3 if r < 5 else 5))

func aplicar_carta(card: Dictionary) -> void:
	var m: float = Dados.RARIDADES[card.get("rar", 0)]["mult"]
	match card["tipo"]:
		"golpe_novo":
			golpes.append({"id": card["id"], "nivel": 1, "t": 0.3})
		"golpe_up":
			for g in golpes:
				if g["id"] == card["id"]: g["nivel"] = mini(Dados.NIVEL_MAX, g["nivel"] + niveis_da_carta(card))
		"stat":
			var st: Dictionary = Dados.STATS[card["id"]]
			var v: float = st["v"] * (1.0 if st.get("fixo", false) else m)
			_stat(card["id"], v, 1.0)
			cartas_stat.append({"id": card["id"], "v": v, "rar": card.get("rar", 0)})

# soma (sinal 1) ou desfaz (sinal -1) o efeito de uma carta de atributo
func _stat(id: String, v: float, sinal: float) -> void:
	match id:
		"dano": dano_mult += v * sinal
		"vida":
			max_hp = maxf(20.0, max_hp + v * sinal)
			hp = clampf(hp + (v if sinal > 0.0 else 0.0), 1.0, max_hp)
		"velocidade": speed = speed * (1.0 + v) if sinal > 0.0 else speed / (1.0 + v)
		"ataque": atk_speed += v * sinal
		"critico": crit += v * sinal
		"critdano": crit_dano += v * sinal
		"armadura": armor += v * sinal
		"regen": regen += v * sinal
		"ima": ima += v * sinal
		"area": area_mult += v * sinal
		"vermes": roubo += v * sinal
		"pulo": pulos_extra += int(sinal)

# Troca-Troca da bodega: devolve todas as cartas de atributo e sorteia o mesmo tanto de novo.
func troca_troca() -> int:
	var n := cartas_stat.size()
	for c in cartas_stat: _stat(c["id"], c["v"], -1.0)
	cartas_stat = []
	var ids: Array = Dados.STATS.keys()
	for i in range(n):
		var id: String = ids[randi() % ids.size()]
		if id == "pulo" and pulos_extra >= 3: id = "dano"
		aplicar_carta({"tipo": "stat", "id": id, "rar": Dados.sortear_raridade()})
	return n

func curar(v: float) -> void:
	if v <= 0.0 or hp <= 0.0: return
	hp = minf(max_hp, hp + v)
	world.dano_num(global_position, "+%d" % int(ceil(v)), Color(0.4, 1.0, 0.45), 48)

func nivel_do_golpe(id: String) -> int:
	for g in golpes:
		if g["id"] == id: return g["nivel"]
	return 0

# nome, descrição e gravura de uma carta (a tela de subir de nível monta o folheto com isso)
func info_carta(card: Dictionary) -> Dictionary:
	var r: Dictionary = Dados.RARIDADES[card.get("rar", 0)]
	match card["tipo"]:
		"golpe_novo":
			var g: Dictionary = Dados.GOLPES[card["id"]]
			return {"nome": g["nome"], "selo": "GOLPE NOVO", "txt": g["txt"], "arte": g["arte"]}
		"golpe_up":
			var g2: Dictionary = Dados.GOLPES[card["id"]]
			var de := nivel_do_golpe(card["id"]); var para := mini(Dados.NIVEL_MAX, de + niveis_da_carta(card))
			return {"nome": g2["nome"], "selo": "Nível %d → %d" % [de, para], "arte": g2["arte"],
				"txt": "+%d%% de dano e ataca mais rápido.\n%s" % [25 * (para - de), g2["txt"]]}
		"stat":
			var st: Dictionary = Dados.STATS[card["id"]]
			var v: float = st["v"] * (1.0 if st.get("fixo", false) else r["mult"])
			return {"nome": st["nome"], "selo": "ATRIBUTO", "txt": st["txt"] % (v * 100.0 if st["pct"] else v), "arte": st["arte"]}
	return {"nome": "?", "selo": "", "txt": "", "arte": "arretado"}
