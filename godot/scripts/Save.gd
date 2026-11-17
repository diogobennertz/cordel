extends Node
class_name Salvo
# O que fica guardado entre as partidas: moedas, fases liberadas, melhorias, recordes, opções e contadores
# (os contadores vão servir para liberar personagens: "mate 150 sacis", "aplique 150 kimuras"...).

const CAMINHO := "user://cordelame_save.json"       # nome antigo do jogo, de propósito: mudar aqui perderia o save de quem já jogou
const CAMINHO_MUNDOS := "user://cordelame_mundos.json"
const OPCOES := {"geral": 1.0, "musica": 0.7, "efeitos": 0.8, "sens": 1.0, "camera": 12.0, "cheia": 0.0, "numeros": 1.0, "pixel": 1.0}
static var d := {}
static var desligado := false     # nos testes automáticos não lê nem grava o save do jogador
# Progresso do co-op é de cada MUNDO, separado do save sozinho (igual mundo salvo de Minecraft):
# quem hospeda escolhe o nome do mundo e o progresso daquele mundo fica guardado à parte; quem entra
# na sala de outra pessoa usa o progresso daquele mundo emprestado, sem mexer no save sozinho dele.
static var modo_mundo := ""       # "" = save sozinho; "*visita*" = entrou no mundo de outra pessoa; outro = dono deste mundo
static var _d_solo := {}          # guarda o save sozinho enquanto está dentro de um mundo de co-op

static func padrao() -> Dictionary:
	return {"moedas": 0, "fase_max": 0, "melhorias": {}, "recordes": {}, "contadores": {}, "heroi": "capoeirista", "fase": 0, "feitos": {}, "tutorial": false, "vistos": {}, "falas": {}, "teclas": {}, "nome_jogador": "", "opcoes": OPCOES.duplicate(), "maior_dano_run": 0.0}

# O jogo já se chamou "Cordel" e "Peleja": se existir um save daquela época, ele é aproveitado (nada se perde na troca de nome).
static func _antigo() -> String:
	var base := OS.get_user_data_dir().get_base_dir()
	for c in ["Cordel/cordel_save.json", "Peleja/peleja_save.json"]:
		if FileAccess.file_exists(base.path_join(c)): return base.path_join(c)
	return ""

static func carregar() -> void:
	d = padrao()
	if desligado: return
	var cam := CAMINHO
	if not FileAccess.file_exists(cam):
		cam = _antigo()
		if cam == "": return
	var f := FileAccess.open(cam, FileAccess.READ)
	if f == null: return
	var j = JSON.parse_string(f.get_as_text())
	if j is Dictionary:
		for k in j:
			if not d.has(k): continue
			if k == "opcoes":
				if j[k] is Dictionary:
					for o in j[k]:
						if OPCOES.has(o): d[k][o] = float(j[k][o])
			else: d[k] = j[k]
	_migrar()
	if cam != CAMINHO: salvar()

static func salvar() -> void:
	if modo_mundo != "":
		for k in CAMPOS_PESSOAIS: _d_solo[k] = d[k]     # nome/teclas/opções sempre acompanham a pessoa, não o mundo
		if modo_mundo == "*visita*": return             # o resto do progresso de mundo visitado não é nosso pra gravar
		var todos := _ler_mundos()
		todos[modo_mundo] = d
		var fm := FileAccess.open(CAMINHO_MUNDOS, FileAccess.WRITE)
		if fm: fm.store_string(JSON.stringify(todos))
		return
	if desligado: return       # só o save sozinho de verdade é protegido nos testes automáticos
	var f := FileAccess.open(CAMINHO, FileAccess.WRITE)
	if f: f.store_string(JSON.stringify(d))

static func _ler_mundos() -> Dictionary:
	if not FileAccess.file_exists(CAMINHO_MUNDOS): return {}
	var f := FileAccess.open(CAMINHO_MUNDOS, FileAccess.READ)
	if f == null: return {}
	var j = JSON.parse_string(f.get_as_text())
	return j if j is Dictionary else {}

# esses campos são da PESSOA, não do mundo: continuam os mesmos em qualquer mundo que ela entrar
const CAMPOS_PESSOAIS := ["nome_jogador", "teclas", "opcoes", "tutorial"]

# anfitrião: entra no progresso daquele mundo (cria do zero se for a 1ª vez com esse nome)
static func entrar_mundo(nome: String) -> void:
	_d_solo = d; modo_mundo = nome
	var todos := _ler_mundos()
	var m: Dictionary = todos.get(nome, {})
	d = padrao()
	if m is Dictionary:
		for k in m:
			if d.has(k) and not CAMPOS_PESSOAIS.has(k): d[k] = m[k]
	for k in CAMPOS_PESSOAIS: d[k] = _d_solo[k]

# convidado: usa emprestado o progresso que o anfitrião mandou, sem gravar nada no save dele
static func entrar_mundo_visitante(dados: Dictionary) -> void:
	_d_solo = d; modo_mundo = "*visita*"
	d = padrao()
	for k in dados:
		if d.has(k) and not CAMPOS_PESSOAIS.has(k): d[k] = dados[k]
	for k in CAMPOS_PESSOAIS: d[k] = _d_solo[k]

# volta pro save de sempre (sozinho); se era dono de um mundo, grava o progresso dele antes
static func sair_mundo() -> void:
	if modo_mundo == "": return
	if modo_mundo != "*visita*": salvar()
	modo_mundo = ""; d = _d_solo

# As melhorias são de cada personagem: quem você não treinou continua do zero.
static func nivel(id: String) -> int:
	var m = d["melhorias"].get(d["heroi"], {})
	return int(m.get(id, 0)) if m is Dictionary else 0

static func subir(id: String) -> void:
	if not (d["melhorias"].get(d["heroi"]) is Dictionary): d["melhorias"][d["heroi"]] = {}
	d["melhorias"][d["heroi"]][id] = nivel(id) + 1

# save antigo guardava uma lista só para todos: ela passa a valer para o herói que estava escolhido
static func _migrar() -> void:
	var m: Dictionary = d["melhorias"]
	for k in m:
		if not (m[k] is Dictionary):
			d["melhorias"] = {String(d["heroi"]): m.duplicate()}; return

static func contar(id: String, n: int = 1) -> void:
	d["contadores"][id] = int(d["contadores"].get(id, 0)) + n
