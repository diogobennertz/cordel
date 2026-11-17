extends Node
class_name Tela
# Estilo de folheto de cordel para todas as telas: papel, tinta preta grossa, cores chapadas.
# A arte (logo, gravuras das cartas, bonecos, títulos entalhados) veio da versão 2D e fica em art/cordel.

const TINTA := Color("1a130e")
const PAPEL := Color("f2e4c4")
const PAPEL2 := Color("e2cfa3")
const PARDO := Color("b89a6a")
const URUCUM := Color("c5361d")
const IPE := Color("f0b429")
const ANIL := Color("22577a")
const MATA := Color("2f6d43")
const BARRO := Color("d9772b")

static var _tex := {}
static var _tema: Theme
static var _f_txt: Font
static var _f_tit: Font

static func tex(nome: String) -> Texture2D:
	if _tex.has(nome): return _tex[nome]
	var cam := "res://art/cordel/%s.png" % nome
	var t: Texture2D = load(cam) if ResourceLoader.exists(cam) else null
	_tex[nome] = t
	return t

static func fonte(titulo: bool = false) -> Font:
	if _f_txt == null:
		var a := SystemFont.new(); a.font_names = PackedStringArray(["Rockwell", "Georgia", "Times New Roman"]); a.font_weight = 700
		_f_txt = a
		var b := SystemFont.new(); b.font_names = PackedStringArray(["Rockwell Extra Bold", "Rockwell", "Georgia"]); b.font_weight = 800
		_f_tit = b
	return _f_tit if titulo else _f_txt

static func tema() -> Theme:
	if _tema == null:
		_tema = Theme.new(); _tema.default_font = fonte(); _tema.default_font_size = 16
	return _tema

# caixa de papel com borda de tinta e sombra dura (fora de registro, como na gravura)
static func caixa(fundo: Color, borda: int = 4, cor_borda: Color = TINTA, sombra: int = 5, raio: int = 5) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = fundo; s.border_color = cor_borda
	s.set_border_width_all(borda); s.set_corner_radius_all(raio)
	s.set_content_margin_all(10)
	if sombra > 0:
		s.shadow_color = Color(TINTA.r, TINTA.g, TINTA.b, 0.55); s.shadow_size = 1; s.shadow_offset = Vector2(sombra, sombra)
	s.anti_aliasing = true
	return s

static func rotulo(txt: String, tam: int = 16, cor: Color = TINTA, al: int = HORIZONTAL_ALIGNMENT_CENTER, titulo: bool = false) -> Label:
	var l := Label.new(); l.text = txt
	l.add_theme_font_override("font", fonte(titulo))
	l.add_theme_font_size_override("font_size", tam)
	l.add_theme_color_override("font_color", cor)
	l.horizontal_alignment = al
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l

static func texto(txt: String, tam: int, largura: float, cor: Color = TINTA, al: int = HORIZONTAL_ALIGNMENT_CENTER) -> Label:
	var l := rotulo(txt, tam, cor, al)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size = Vector2(largura, 0)
	return l

static func botao(txt: String, acao: Callable, tam: int = 20, fundo: Color = URUCUM, largura: float = 280.0, altura: float = 50.0) -> Button:
	var b := Button.new(); b.text = txt
	b.custom_minimum_size = Vector2(largura, altura)
	b.add_theme_font_override("font", fonte(true)); b.add_theme_font_size_override("font_size", tam)
	b.add_theme_stylebox_override("normal", caixa(fundo, 3))
	b.add_theme_stylebox_override("hover", caixa(IPE, 3))
	b.add_theme_stylebox_override("pressed", caixa(IPE, 3, TINTA, 1))
	b.add_theme_stylebox_override("disabled", caixa(PARDO, 3, Color(TINTA.r, TINTA.g, TINTA.b, 0.5), 0))
	var foco := StyleBoxFlat.new(); foco.draw_center = false; foco.border_color = Color.WHITE; foco.set_border_width_all(4); foco.set_corner_radius_all(6); foco.set_expand_margin_all(4)
	b.add_theme_stylebox_override("focus", foco)
	b.focus_mode = Control.FOCUS_ALL if Ctrl.tem_controle() else Control.FOCUS_NONE
	var claro := fundo.get_luminance() < 0.5
	b.add_theme_color_override("font_color", PAPEL if claro else TINTA)
	for c in ["font_hover_color", "font_pressed_color", "font_focus_color", "font_hover_pressed_color"]:
		b.add_theme_color_override(c, TINTA)
	b.add_theme_color_override("font_focus_color", PAPEL if claro else TINTA)
	b.add_theme_color_override("font_disabled_color", Color(TINTA.r, TINTA.g, TINTA.b, 0.6))
	b.pressed.connect(func(): Som.tocar("clique"))
	b.pressed.connect(acao)
	return b

static func imagem(nome: String, tam: Vector2) -> TextureRect:
	var t := TextureRect.new(); t.texture = tex(nome)
	t.expand_mode = TextureRect.EXPAND_IGNORE_SIZE; t.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	t.custom_minimum_size = tam; t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return t

# título entalhado (imagem pronta); altura em px
static func titulo(nome: String, altura: float) -> TextureRect:
	var tx := tex(nome)
	var larg := altura * 4.0
	if tx: larg = altura * tx.get_width() / float(tx.get_height())
	var t := imagem(nome, Vector2(larg, altura))
	t.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	return t

# fundo de papel de folheto cobrindo a tela, com um filete de tinta em volta
static func fundo_papel(pai: Control, cor: Color = Color(1, 1, 1)) -> void:
	var base := ColorRect.new(); base.color = PAPEL; base.set_anchors_preset(Control.PRESET_FULL_RECT); pai.add_child(base)
	var p := TextureRect.new(); p.texture = tex("papel"); p.stretch_mode = TextureRect.STRETCH_TILE
	p.set_anchors_preset(Control.PRESET_FULL_RECT); p.modulate = cor; p.mouse_filter = Control.MOUSE_FILTER_IGNORE; pai.add_child(p)
	var fil := Panel.new(); fil.set_anchors_preset(Control.PRESET_FULL_RECT)
	fil.offset_left = 10; fil.offset_top = 10; fil.offset_right = -10; fil.offset_bottom = -10
	var s := StyleBoxFlat.new(); s.bg_color = Color(0, 0, 0, 0); s.border_color = TINTA; s.set_border_width_all(5); s.set_corner_radius_all(4)
	fil.add_theme_stylebox_override("panel", s); fil.mouse_filter = Control.MOUSE_FILTER_IGNORE; pai.add_child(fil)
	var fil2 := Panel.new(); fil2.set_anchors_preset(Control.PRESET_FULL_RECT)
	fil2.offset_left = 19; fil2.offset_top = 19; fil2.offset_right = -19; fil2.offset_bottom = -19
	var s2 := StyleBoxFlat.new(); s2.bg_color = Color(0, 0, 0, 0); s2.border_color = TINTA; s2.set_border_width_all(2)
	fil2.add_theme_stylebox_override("panel", s2); fil2.mouse_filter = Control.MOUSE_FILTER_IGNORE; pai.add_child(fil2)
	_cantos_cordel(pai)

# enfeite nos 4 cantos, tipo xilogravura de folheto de cordel (estrela, sol, cacto, passarinho)
static func _cantos_cordel(pai: Control) -> void:
	var cantos := [
		["orna_passaro", Control.PRESET_TOP_LEFT, Vector2(26, 24), Vector2(76, 60)],
		["orna_sol", Control.PRESET_TOP_RIGHT, Vector2(-60, 6), Vector2(34, 34)],
		["orna_cacto", Control.PRESET_BOTTOM_LEFT, Vector2(30, -148), Vector2(60, 90)],
		["orna_estrela", Control.PRESET_BOTTOM_RIGHT, Vector2(-80, -84), Vector2(56, 56)],
	]
	for c in cantos:
		var t := imagem(c[0], c[3]); t.set_anchors_preset(c[1])
		t.position = c[2]; t.modulate = Color(TINTA.r, TINTA.g, TINTA.b, 0.8)
		pai.add_child(t)

static func escuro(pai: Control, a: float = 0.72) -> void:
	var f := ColorRect.new(); f.color = Color(TINTA.r, TINTA.g, TINTA.b, a)
	f.set_anchors_preset(Control.PRESET_FULL_RECT); pai.add_child(f)

static func painel(fundo: Color = PAPEL, borda: int = 5) -> PanelContainer:
	var p := PanelContainer.new()
	var s := caixa(fundo, borda, TINTA, 8); s.set_content_margin_all(22)
	p.add_theme_stylebox_override("panel", s)
	return p

static func faixa(txt: String, fundo: Color, tam: int = 16, cor_txt: Color = PAPEL) -> PanelContainer:
	var p := PanelContainer.new()
	var s := StyleBoxFlat.new(); s.bg_color = fundo; s.border_color = TINTA; s.border_width_bottom = 3; s.border_width_top = 3
	s.set_content_margin_all(4)
	p.add_theme_stylebox_override("panel", s); p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.add_child(rotulo(txt, tam, cor_txt, HORIZONTAL_ALIGNMENT_CENTER, true))
	return p

static func ignora_mouse(n: Node) -> void:
	for c in n.get_children():
		if c is Control: c.mouse_filter = Control.MOUSE_FILTER_IGNORE
		ignora_mouse(c)

# número grande legível: 950, 12.4 mil, 3.25 mi, 1.2 bi
static func num(v: float) -> String:
	if v < 1000.0: return str(int(round(v)))
	if v < 1e6: return "%.1f mil" % (v / 1e3)
	if v < 1e9: return "%.2f mi" % (v / 1e6)
	return "%.2f bi" % (v / 1e9)

# ---- opções (volume, mouse, câmera, tela cheia) ----
static func opc(k: String) -> float:
	return float(Salvo.d["opcoes"].get(k, Salvo.OPCOES[k]))

static func _bus(nome: String) -> int:
	var i := AudioServer.get_bus_index(nome)
	if i < 0:
		AudioServer.add_bus(); i = AudioServer.bus_count - 1
		AudioServer.set_bus_name(i, nome); AudioServer.set_bus_send(i, "Master")
	return i

static func aplicar_opcoes() -> void:
	for par in [["Master", "geral"], ["Musica", "musica"], ["Efeitos", "efeitos"]]:
		var i := _bus(par[0]); var v := opc(par[1])
		AudioServer.set_bus_mute(i, v <= 0.001)
		AudioServer.set_bus_volume_db(i, linear_to_db(maxf(v, 0.001)))
	TranslationServer.set_locale(String(Salvo.d.get("idioma", "pt_BR")))
	if DisplayServer.get_name() != "headless" and not Salvo.desligado:
		var quer := DisplayServer.WINDOW_MODE_FULLSCREEN if opc("cheia") > 0.5 else DisplayServer.WINDOW_MODE_WINDOWED
		if DisplayServer.window_get_mode() != quer and not (quer == DisplayServer.WINDOW_MODE_WINDOWED and DisplayServer.window_get_mode() == DisplayServer.WINDOW_MODE_MAXIMIZED):
			DisplayServer.window_set_mode(quer)

# ---- visual "pixelado" (estilo PS1): pixels grandes, paleta mais curta e pontilhado ----
const PIXEL_SHADER := """
shader_type canvas_item;
uniform sampler2D tela : hint_screen_texture, filter_nearest;
uniform float px = 3.0;
void fragment() {
	vec2 tam = 1.0 / SCREEN_PIXEL_SIZE;
	vec2 cel = floor(SCREEN_UV * tam / px);
	vec2 uv = (cel + 0.5) * px / tam;
	vec3 c = texture(tela, uv).rgb;
	float d = mod(cel.x + cel.y * 2.0, 4.0) / 4.0 - 0.375;
	c = floor(c * 20.0 + 0.5 + d * 0.9) / 20.0;
	COLOR = vec4(c, 1.0);
}
"""
static func camada_pixel(pai: Node) -> ColorRect:
	var cl := CanvasLayer.new(); cl.layer = 0; pai.add_child(cl)
	var r := ColorRect.new(); r.set_anchors_preset(Control.PRESET_FULL_RECT); r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sh := Shader.new(); sh.code = PIXEL_SHADER
	var m := ShaderMaterial.new(); m.shader = sh; r.material = m
	cl.add_child(r)
	return r
