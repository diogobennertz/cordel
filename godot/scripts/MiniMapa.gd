extends Control
class_name MiniMapa
# Minimapa redondo: a clareira inteira, girando junto com a câmera (para cima = para onde você olha).

var w
var grande := false          # true = versão grande no meio da tela, com os nomes do que tem no mapa
var _n := 0

func _process(_d: float) -> void:
	_n += 1
	if _n % 3 == 0 and is_visible_in_tree(): queue_redraw()

func _p(x: float, z: float, r: float) -> Vector2:
	var v: Vector2 = Vector2(x, z).rotated(w.cam_yaw) / (float(w.ARENA) + 2.0) * r
	return size * 0.5 + v

func _draw() -> void:
	if w == null or w.player == null: return
	var c := size * 0.5; var r := size.x * 0.5 - 3.0
	draw_circle(c, r + 3.0, Tela.PAPEL)
	draw_circle(c, r, Color(0.13, 0.3, 0.17))
	draw_arc(c, r + 1.5, 0, TAU, 40, Tela.TINTA, 3.0, true)
	var n := 0
	for e in w.enemies:
		if not is_instance_valid(e): continue
		n += 1
		if n > 140 and not e.is_boss: continue
		if e.is_boss: draw_circle(_p(e.position.x, e.position.z, r), 7.0, Color(1.0, 0.2, 0.6))
		elif e.elite: draw_circle(_p(e.position.x, e.position.z, r), 4.2, Color(1.0, 0.85, 0.2))
		else: draw_circle(_p(e.position.x, e.position.z, r), 2.2, Color(0.95, 0.3, 0.2))
	for o in w.objetos:
		var p: Vector2 = _p(o["no"].position.x, o["no"].position.z, r)
		match o["tipo"]:
			"bau": draw_rect(Rect2(p - Vector2(3, 3), Vector2(6, 6)), Color(1.0, 0.85, 0.3)); _rotula(p, "Baú", Color(1.0, 0.85, 0.3))
			"oratorio":
				if not o["usado"]:
					draw_rect(Rect2(p - Vector2(3, 3), Vector2(6, 6)), Color(0.55, 0.85, 1.0)); _rotula(p, "Oratório", Color(0.55, 0.85, 1.0))
			"loja": draw_rect(Rect2(p - Vector2(4, 4), Vector2(8, 8)), Color(1.0, 0.55, 0.15)); _rotula(p, "Bodega", Color(1.0, 0.65, 0.3))
			"portal": draw_circle(p, 5.0, Color(0.75, 0.4, 1.0)); _rotula(p, "Portal", Color(0.85, 0.6, 1.0))
			_:
				if Dados.NPCS.has(o["tipo"]):
					draw_rect(Rect2(p - Vector2(4, 4), Vector2(8, 8)), Color.WHITE); _rotula(p, Dados.NPCS[o["tipo"]]["nome"], Color.WHITE)
	var pp: Vector3 = w.player.position
	var pj := _p(pp.x, pp.z, r)
	draw_circle(pj, 5.5, Tela.TINTA); draw_circle(pj, 3.8, Color.WHITE)
	var seta: Vector2 = Vector2(0, -1)
	draw_line(pj, pj + seta * (9.0 if not grande else 16.0), Color.WHITE, 2.5 if not grande else 3.5)
	if grande: _rotula(pj, "Você", Tela.TINTA)

# nome ao lado do ícone, só no mapa grande (no mini ficaria poluído)
func _rotula(pos: Vector2, txt: String, cor: Color) -> void:
	if not grande: return
	draw_string(Tela.fonte(true), pos + Vector2(9, 4), txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Tela.TINTA)
	draw_string(Tela.fonte(true), pos + Vector2(8, 3), txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, cor)
