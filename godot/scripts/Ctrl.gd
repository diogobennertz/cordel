extends Node
class_name Ctrl
# Controles: teclado (teclas trocáveis nas opções, guardadas no save) e controle de Xbox/PlayStation.
# Controle: analógico esquerdo anda, direito gira a câmera, A/✕ pula, B/○ ou RB/R1 arranca,
# X/□ especial, Y/△ ultimate, LB/L1 mostra a build, Select sai da fase, Start pausa.

const ACOES := [
	["cima", "Andar para a frente", KEY_W], ["baixo", "Andar para trás", KEY_S],
	["esq", "Andar para a esquerda", KEY_A], ["dir", "Andar para a direita", KEY_D],
	["pulo", "Pular", KEY_SPACE], ["dash", "Arrancada", KEY_SHIFT],
	["q", "Especial", KEY_Q], ["r", "Ultimate", KEY_R],
	["info", "Ver a build (segurar)", KEY_TAB], ["sair", "Sair da fase (depois do chefe)", KEY_F],
	["mapa", "Mapa grande (segurar)", KEY_TAB],
]
const JOY := {"pulo": [JOY_BUTTON_A], "dash": [JOY_BUTTON_B, JOY_BUTTON_RIGHT_SHOULDER], "q": [JOY_BUTTON_X], "r": [JOY_BUTTON_Y],
	"info": [JOY_BUTTON_LEFT_SHOULDER], "sair": [JOY_BUTTON_BACK]}

static func padrao(a: String) -> int:
	for it in ACOES:
		if it[0] == a: return it[2]
	return KEY_NONE

static func tecla(a: String) -> int:
	return int(Salvo.d["teclas"].get(a, padrao(a)))

static func nome(a: String) -> String:
	var n := OS.get_keycode_string(tecla(a))
	return {"Space": "Espaço", "Shift": "Shift", "Up": "↑", "Down": "↓", "Left": "←", "Right": "→"}.get(n, n)

static func tem_controle() -> bool:
	return Input.get_connected_joypads().size() > 0

static func ap(a: String) -> bool:
	if Input.is_physical_key_pressed(tecla(a)): return true
	if JOY.has(a):
		for d in Input.get_connected_joypads():
			for b in JOY[a]:
				if Input.is_joy_button_pressed(d, b): return true
	return false

static func _eixo(ex: int, ey: int) -> Vector2:
	for d in Input.get_connected_joypads():
		var v := Vector2(Input.get_joy_axis(d, ex), Input.get_joy_axis(d, ey))
		if v.length() > 0.22: return v
	return Vector2.ZERO

# x = direita, y = frente
static func mov() -> Vector2:
	var v := Vector2.ZERO
	if ap("cima") or Input.is_physical_key_pressed(KEY_UP): v.y += 1
	if ap("baixo") or Input.is_physical_key_pressed(KEY_DOWN): v.y -= 1
	if ap("esq") or Input.is_physical_key_pressed(KEY_LEFT): v.x -= 1
	if ap("dir") or Input.is_physical_key_pressed(KEY_RIGHT): v.x += 1
	if v == Vector2.ZERO:
		var j := _eixo(JOY_AXIS_LEFT_X, JOY_AXIS_LEFT_Y)
		v = Vector2(j.x, -j.y)
	return v

static func cam() -> Vector2:
	return _eixo(JOY_AXIS_RIGHT_X, JOY_AXIS_RIGHT_Y)

static func start() -> bool:
	for d in Input.get_connected_joypads():
		if Input.is_joy_button_pressed(d, JOY_BUTTON_START): return true
	return false
