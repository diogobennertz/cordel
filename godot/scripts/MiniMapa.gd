extends Control
class_name MiniMapa
# Minimapa redondo: a clareira inteira, girando junto com a câmera (para cima = para onde você olha).
# Só ícone, sem nome escrito: com nome escrito polui e não dá pra ler de relance.

var w
var grande := false          # true = versão grande no meio da tela (segurando Tab)
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
		var k := (6.0 if not grande else 9.0)
		match o["tipo"]:
			"bau": _icone(p, k, Color(1.0, 0.85, 0.3), 0)                              # quadrado dourado
			"oratorio":
				if not o["usado"]: _icone(p, k, Color(0.55, 0.85, 1.0), 1)             # losango azul
			"loja": _icone(p, k * 1.2, Color(1.0, 0.55, 0.15), 2)                       # triângulo laranja
			"portal": draw_circle(p, k * 0.85, Color(0.75, 0.4, 1.0))                   # bolinha roxa
			_:
				if Dados.NPCS.has(o["tipo"]): _icone(p, k, Color.WHITE, 1)             # losango branco (gente)
	var pp: Vector3 = w.player.position
	var pj := _p(pp.x, pp.z, r)
	draw_circle(pj, 5.5, Tela.TINTA); draw_circle(pj, 3.8, Color.WHITE)
	var seta: Vector2 = Vector2(0, -1)
	draw_line(pj, pj + seta * (9.0 if not grande else 16.0), Color.WHITE, 2.5 if not grande else 3.5)

# ícone com contorno escuro, pra não sumir em cima do verde: 0 quadrado, 1 losango, 2 triângulo
func _icone(p: Vector2, k: float, cor: Color, forma: int) -> void:
	var pts: PackedVector2Array
	match forma:
		1: pts = PackedVector2Array([p + Vector2(0, -k), p + Vector2(k, 0), p + Vector2(0, k), p + Vector2(-k, 0)])
		2: pts = PackedVector2Array([p + Vector2(0, -k), p + Vector2(k * 0.9, k * 0.8), p + Vector2(-k * 0.9, k * 0.8)])
		_: pts = PackedVector2Array([p + Vector2(-k, -k), p + Vector2(k, -k), p + Vector2(k, k), p + Vector2(-k, k)])
	draw_colored_polygon(pts, cor)
	var fechado: PackedVector2Array = pts.duplicate(); fechado.append(pts[0])
	draw_polyline(fechado, Tela.TINTA, 1.4, true)
