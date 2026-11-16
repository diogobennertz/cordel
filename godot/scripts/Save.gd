extends Node
class_name Salvo
# O que fica guardado entre as partidas: moedas, fases liberadas, melhorias, recordes, opções e contadores
# (os contadores vão servir para liberar personagens: "mate 150 sacis", "aplique 150 kimuras"...).

const CAMINHO := "user://cordelame_save.json"
const OPCOES := {"geral": 1.0, "musica": 0.7, "efeitos": 0.8, "sens": 1.0, "camera": 12.0, "cheia": 0.0, "numeros": 1.0, "pixel": 1.0}
static var d := {}
static var desligado := false     # nos testes automáticos não lê nem grava o save do jogador

static func padrao() -> Dictionary:
	return {"moedas": 0, "fase_max": 0, "melhorias": {}, "recordes": {}, "contadores": {}, "heroi": "capoeirista", "fase": 0, "feitos": {}, "tutorial": false, "vistos": {}, "falas": {}, "teclas": {}, "opcoes": OPCOES.duplicate()}

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
	if desligado: return
	var f := FileAccess.open(CAMINHO, FileAccess.WRITE)
	if f: f.store_string(JSON.stringify(d))

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
