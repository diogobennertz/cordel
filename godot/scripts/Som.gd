extends Node
class_name Som
# Efeitos, vozes e música. Os .wav ficam em res://som (gerados por script; dá para trocar por gravações de verdade
# mantendo o mesmo nome de arquivo). Efeitos saem no canal "Efeitos" e a música no canal "Musica" (volumes nas opções).

static var _no: Node
static var _cache := {}
static var _ult := {}
static var _pool: Array = []
static var _i := 0
static var _musica: AudioStreamPlayer

static func ligar(pai: Node) -> void:
	if DisplayServer.get_name() == "headless": return
	_no = Node.new(); pai.add_child(_no); _pool = []
	for i in range(16):
		var p := AudioStreamPlayer.new(); p.bus = "Efeitos"; _no.add_child(p); _pool.append(p)
	_musica = AudioStreamPlayer.new(); _musica.bus = "Musica"; _musica.volume_db = -9.0; _no.add_child(_musica)
	var st := _s("musica")
	if st:
		_musica.stream = st
		_musica.finished.connect(_musica.play)
		_musica.play()

static func _s(nome: String) -> AudioStream:
	if _cache.has(nome): return _cache[nome]
	var cam := "res://som/%s.wav" % nome
	var st: AudioStream = load(cam) if ResourceLoader.exists(cam) else null
	_cache[nome] = st
	return st

# intervalo: tempo mínimo (s) entre duas vezes do mesmo som, para a horda não virar barulheira
static func tocar(nome: String, vol_db: float = 0.0, var_tom: float = 0.08, intervalo: float = 0.05) -> void:
	if _no == null or not is_instance_valid(_no): return
	var agora := Time.get_ticks_msec()
	if agora - int(_ult.get(nome, -99999)) < int(intervalo * 1000.0): return
	_ult[nome] = agora
	var st := _s(nome)
	if st == null: return
	var p: AudioStreamPlayer = _pool[_i]; _i = (_i + 1) % _pool.size()
	p.stream = st; p.volume_db = vol_db; p.pitch_scale = 1.0 + randf_range(-var_tom, var_tom); p.play()

static func voz(nome: String) -> void:
	tocar(nome, 3.0, 0.0, 0.6)
