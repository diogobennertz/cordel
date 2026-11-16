extends Node3D
class_name Boneco
# Boneco 3D estilo "toy" (cabeção redondo, corpo de cápsula, contorno escuro), montado por código.
# O modelo olha para +Z. Quem usa gira o Boneco (rotation.y) e chama animar() todo quadro.

var corpo: Node3D
var perna_e: Node3D
var perna_d: Node3D
var braco_e: Node3D
var braco_d: Node3D
var saltita := false      # saci: anda pulando numa perna só
var cor_base := Color.WHITE
var t := 0.0
var atk_t := 0.0
var giro_t := 0.0
var bate_t := 0.0
var tonto := false

const PRETO := Color(0.1, 0.08, 0.07)
const BRANCO := Color(0.97, 0.96, 0.92)
const COURO := Color(0.6, 0.39, 0.2)
const COURO_ESC := Color(0.38, 0.24, 0.13)
const OURO := Color(0.98, 0.76, 0.15)
const CY := 1.52          # altura do centro da cabeça
const CR := 0.42          # raio da cabeça

static func criar(tipo: String, destaque = null) -> Boneco:
	var b := Boneco.new()
	Lib.toon = true
	b._montar(tipo, destaque)
	Lib.toon = false
	return b

# Corpo básico: pernas, tronco, braços e cabeção com rosto.
# bravo = sobrancelha franzida e olho aceso (bichos).
func _humano(pele: Color, camisa: Color, calca: Color, pe: Color, manga: Color, bravo: bool = false, olho: Color = BRANCO) -> void:
	cor_base = camisa
	corpo = Lib.pivo(self, Vector3.ZERO)
	perna_e = Lib.pivo(corpo, Vector3(-0.17, 0.55, 0))
	perna_d = Lib.pivo(corpo, Vector3(0.17, 0.55, 0))
	for p in [perna_e, perna_d]:
		Lib.caps(p, 0.14, 0.52, Vector3(0, -0.22, 0), calca)
		Lib.esf(p, 0.17, Vector3(0, -0.47, 0.07), pe, Vector3(1, 0.62, 1.5), 8)
	Lib.caps(corpo, 0.34, 0.78, Vector3(0, 0.9, 0), camisa, Vector3(1, 1, 0.8))
	braco_e = Lib.pivo(corpo, Vector3(-0.43, 1.1, 0))
	braco_d = Lib.pivo(corpo, Vector3(0.43, 1.1, 0))
	for b in [braco_e, braco_d]:
		Lib.caps(b, 0.105, 0.5, Vector3(0, -0.2, 0), manga)
		Lib.esf(b, 0.125, Vector3(0, -0.48, 0), pele, Vector3.ONE, 8)
	# cabeça e rosto
	Lib.esf(corpo, CR, Vector3(0, CY, 0), pele, Vector3(1, 0.95, 0.96), 14)
	for sx in [-1.0, 1.0]:
		if bravo:
			Lib.esf(corpo, 0.095, Vector3(0.16 * sx, CY + 0.03, 0.36), olho, Vector3(1, 0.8, 0.4), 8, 2.2)
			Lib.cx(corpo, Vector3(0.2, 0.05, 0.05), Vector3(0.16 * sx, CY + 0.15, 0.38), PRETO, Vector3(0, 0, -0.45 * sx))
		else:
			Lib.esf(corpo, 0.095, Vector3(0.16 * sx, CY + 0.03, 0.355), BRANCO, Vector3(1, 1.2, 0.4), 8)
			Lib.esf(corpo, 0.055, Vector3(0.16 * sx, CY + 0.02, 0.39), PRETO, Vector3(1, 1.2, 0.4), 6)
			Lib.cx(corpo, Vector3(0.15, 0.035, 0.04), Vector3(0.16 * sx, CY + 0.2, 0.36), PRETO, Vector3(0, 0, 0.12 * sx))
		Lib.esf(corpo, 0.09, Vector3(0.41 * sx, CY - 0.02, 0), pele, Vector3(0.5, 1, 0.8), 6)   # orelha

func _cabelo(cor: Color, r: float = CR + 0.035, incl: float = -0.3) -> MeshInstance3D:
	var c := Lib.esf(corpo, r, Vector3(0, CY + 0.02, -0.02), cor, Vector3(1, 0.95, 1), 12, 0.0, true)
	c.rotation.x = incl
	return c

func _boca(cor: Color, larg: float = 0.16) -> void:
	Lib.cx(corpo, Vector3(larg, 0.04, 0.04), Vector3(0, CY - 0.17, 0.375), cor)

func _cinto(cor: Color, y: float = 0.68, r: float = 0.35) -> void:
	var c := Lib.cil(corpo, r, r, 0.09, Vector3(0, y, 0), cor, 12)
	c.scale = Vector3(1, 1, 0.8)

func _montar(tipo: String, destaque) -> void:
	match tipo:
		"capoeirista":
			var pele := Color(0.55, 0.36, 0.21)
			_humano(pele, pele, BRANCO, pele, pele)
			Lib.esf(corpo, 0.36, Vector3(0, 0.66, 0), BRANCO, Vector3(1, 0.62, 0.82), 10)        # calça do abadá
			_cinto(OURO, 0.74)
			Lib.caps(corpo, 0.035, 0.34, Vector3(0.22, 0.56, 0.24), OURO)                        # ponta do cordão
			_cabelo(PRETO)
			var faixa := Lib.cil(corpo, CR + 0.02, CR + 0.02, 0.08, Vector3(0, CY + 0.14, 0), Color(0.12, 0.62, 0.3), 14)
			faixa.rotation.x = -0.12
			Lib.cx(corpo, Vector3(0.2, 0.06, 0.04), Vector3(0, CY - 0.17, 0.375), BRANCO)        # sorriso
			# berimbau nas costas
			Lib.cil(corpo, 0.03, 0.03, 1.7, Vector3(0.08, 1.1, -0.34), COURO, 6, Vector3(0, 0, 0.4))
			Lib.cil(corpo, 0.008, 0.008, 1.55, Vector3(0.16, 1.1, -0.36), BRANCO, 4, Vector3(0, 0, 0.47))
			Lib.esf(corpo, 0.2, Vector3(-0.14, 0.72, -0.4), Color(0.85, 0.62, 0.3), Vector3.ONE, 8)
		"jiujitsu":
			var pele2 := Color(0.9, 0.7, 0.55)
			var gi := Color(0.96, 0.96, 0.94)
			var faixa2 := Color(0.47, 0.3, 0.8)
			_humano(pele2, gi, gi, pele2, gi)
			_cinto(faixa2, 0.7)
			Lib.cx(corpo, Vector3(0.14, 0.12, 0.08), Vector3(0, 0.7, 0.29), faixa2)              # nó
			Lib.cx(corpo, Vector3(0.08, 0.3, 0.05), Vector3(-0.08, 0.53, 0.3), faixa2, Vector3(0, 0, 0.25))
			Lib.cx(corpo, Vector3(0.08, 0.3, 0.05), Vector3(0.08, 0.53, 0.3), faixa2, Vector3(0, 0, -0.25))
			Lib.cx(corpo, Vector3(0.09, 0.52, 0.05), Vector3(-0.1, 0.98, 0.27), Color(0.8, 0.8, 0.86), Vector3(0, 0, -0.38))  # gola
			Lib.cx(corpo, Vector3(0.09, 0.52, 0.05), Vector3(0.1, 0.98, 0.27), Color(0.8, 0.8, 0.86), Vector3(0, 0, 0.38))
			var cab := Color(0.3, 0.16, 0.09)
			_cabelo(cab)
			Lib.esf(corpo, 0.17, Vector3(0, CY + 0.36, -0.28), cab, Vector3.ONE, 8)              # coque
			Lib.caps(corpo, 0.09, 0.5, Vector3(0, CY - 0.05, -0.4), cab)                         # rabo
			_boca(Color(0.75, 0.3, 0.3), 0.12)
		"benzedeira":
			var pele3 := Color(0.45, 0.29, 0.18)
			var saia := Color(0.13, 0.68, 0.64)
			_humano(pele3, BRANCO, saia, COURO_ESC, BRANCO)
			Lib.cil(corpo, 0.33, 0.66, 0.66, Vector3(0, 0.38, 0), saia, 12)                      # saia rodada
			Lib.cil(corpo, 0.66, 0.68, 0.08, Vector3(0, 0.08, 0), OURO, 12)
			Lib.cil(corpo, 0.5, 0.52, 0.05, Vector3(0, 0.36, 0), Color(0.95, 0.4, 0.5), 12)      # fita rosa
			_cabelo(saia, CR + 0.05, -0.2)                                                       # lenço
			Lib.esf(corpo, 0.14, Vector3(0, CY + 0.1, -0.46), saia, Vector3.ONE, 6)
			Lib.cx(corpo, Vector3(0.1, 0.3, 0.05), Vector3(0, CY - 0.12, -0.46), saia, Vector3(0.3, 0, 0))
			for i in range(7):                                                                   # colar de contas
				var a := (i - 3) * 0.28
				Lib.esf(corpo, 0.05, Vector3(sin(a) * 0.3, 1.2 - cos(a) * 0.06, 0.22 + cos(a) * 0.06), Color(0.9, 0.2, 0.15), Vector3.ONE, 5)
			for sx in [-1.0, 1.0]:
				Lib.esf(corpo, 0.05, Vector3(0.43 * sx, CY - 0.14, 0.02), OURO, Vector3.ONE, 5)  # brincos
			_boca(Color(0.7, 0.25, 0.25), 0.12)
			# galho de arruda na mão
			Lib.cil(braco_d, 0.02, 0.02, 0.55, Vector3(0, -0.48, 0.25), COURO_ESC, 5, Vector3(PI / 2.0, 0, 0))
			Lib.esf(braco_d, 0.16, Vector3(0, -0.48, 0.55), Color(0.3, 0.78, 0.3), Vector3(1, 1, 1.5), 6)
			Lib.esf(braco_d, 0.11, Vector3(0.1, -0.4, 0.42), Color(0.4, 0.85, 0.35), Vector3.ONE, 5)
		"cangaceiro":
			var pele4 := Color(0.76, 0.53, 0.36)
			_humano(pele4, COURO, Color(0.36, 0.28, 0.2), COURO_ESC, COURO)
			# chapéu de couro: copa + aba meia-lua em pé, com estrelas
			_cabelo(COURO_ESC, CR + 0.04, -0.12)
			Lib.esf(corpo, 0.74, Vector3(0, CY + 0.1, 0.1), COURO, Vector3(1, 0.85, 0.12), 14, 0.0, true)
			Lib.esf(corpo, 0.7, Vector3(0, CY + 0.1, -0.12), COURO_ESC, Vector3(1, 0.8, 0.12), 14, 0.0, true)
			for sx in [-0.38, 0.0, 0.38]:
				Lib.cx(corpo, Vector3(0.13, 0.13, 0.05), Vector3(sx, CY + (0.4 if sx == 0.0 else 0.27), 0.18), OURO, Vector3(0, 0, PI / 4.0))
			Lib.cil(corpo, 0.46, 0.46, 0.05, Vector3(0, CY + 0.13, 0.19), OURO, 14, Vector3(PI / 2.0, 0, 0)).scale = Vector3(1.5, 0.3, 0.12)
			var lenco := Lib.cil(corpo, 0.3, 0.34, 0.13, Vector3(0, 1.2, 0), Color(0.85, 0.15, 0.1), 10)
			lenco.scale = Vector3(1, 1, 0.85)
			Lib.cx(corpo, Vector3(0.1, 0.9, 0.58), Vector3(0, 0.9, 0), COURO_ESC, Vector3(0, 0, 0.72))   # cartucheiras
			Lib.cx(corpo, Vector3(0.1, 0.9, 0.58), Vector3(0, 0.9, 0), COURO_ESC, Vector3(0, 0, -0.72))
			for i in range(4):
				Lib.cx(corpo, Vector3(0.06, 0.1, 0.05), Vector3(-0.21 + i * 0.14, 1.08 - i * 0.12, 0.3), OURO, Vector3(0, 0, -0.72))
			_cinto(COURO_ESC, 0.62)
			Lib.cx(corpo, Vector3(0.16, 0.14, 0.06), Vector3(0, 0.62, 0.29), OURO)
			Lib.cx(corpo, Vector3(0.34, 0.07, 0.05), Vector3(0, CY - 0.15, 0.385), PRETO)        # bigode
			# rifle
			Lib.cx(braco_d, Vector3(0.07, 0.09, 1.05), Vector3(0, -0.48, 0.34), Color(0.22, 0.18, 0.16))
			Lib.cx(braco_d, Vector3(0.1, 0.17, 0.34), Vector3(0, -0.52, -0.12), COURO_ESC)
		"curupira":     # menino da mata: cabelo de fogo e os pés virados para trás
			var pc := Color(0.62, 0.4, 0.24)
			_humano(pc, pc, Color(0.2, 0.5, 0.2), pc, pc, true, Color(1.0, 0.9, 0.3))
			cor_base = Color(1.0, 0.35, 0.1) if destaque == null else destaque
			Lib.cil(corpo, 0.3, 0.42, 0.3, Vector3(0, 0.62, 0), Color(0.2, 0.5, 0.2), 8)
			for i in range(7):
				var a := i * TAU / 7.0
				Lib.cil(corpo, 0.0, 0.14, 0.55, Vector3(cos(a) * 0.22, CY + 0.5, sin(a) * 0.22), cor_base if i % 2 == 0 else Color(1.0, 0.7, 0.1), 5, Vector3(sin(a) * 0.4, 0, -cos(a) * 0.4), 1.5)
			Lib.cil(corpo, 0.0, 0.2, 0.7, Vector3(0, CY + 0.62, 0), Color(1.0, 0.8, 0.2), 5, Vector3.ZERO, 1.8)
			for pp in [perna_e, perna_d]:
				pp.rotation.y = PI                                                           # pernas viradas: os pés apontam para trás
				Lib.esf(pp, 0.09, Vector3(0, -0.2, 0.15), pc.darkened(0.15), Vector3.ONE, 6)  # joelho do lado errado
			_boca(BRANCO, 0.2)
		"corposeco":    # o morto que nem a terra quis: pele e osso_c
			var osso_c: Color = Color(0.78, 0.74, 0.6) if destaque == null else destaque
			_humano(osso_c, Color(0.35, 0.3, 0.24), Color(0.28, 0.24, 0.2), osso_c, osso_c, true, Color(1.0, 0.2, 0.15))
			cor_base = osso_c
			for i in range(3):
				Lib.cx(corpo, Vector3(0.5, 0.045, 0.06), Vector3(0, 0.82 + i * 0.13, 0.27), osso_c)        # costelas
			Lib.cx(corpo, Vector3(0.26, 0.1, 0.05), Vector3(0, CY - 0.18, 0.37), PRETO)                  # boca seca
			for i in range(4): Lib.cx(corpo, Vector3(0.035, 0.08, 0.03), Vector3(-0.09 + i * 0.06, CY - 0.17, 0.395), BRANCO)
			Lib.cx(corpo, Vector3(0.5, 0.5, 0.06), Vector3(0, 0.45, -0.2), Color(0.3, 0.26, 0.2), Vector3(0.15, 0, 0))   # mortalha rasgada
			braco_e.rotation.x = -1.2; braco_d.rotation.x = -1.2
		"iara":         # mãe-d'água: cauda_i de peixe, cabelo comprido e flor no cabelo
			var pi := Color(0.72, 0.5, 0.34)
			var cauda_i: Color = Color(0.1, 0.62, 0.6) if destaque == null else destaque
			_humano(pi, Color(0.15, 0.7, 0.55), cauda_i, cauda_i, pi, true, Color(0.4, 1.0, 0.9))
			cor_base = cauda_i
			Lib.cil(corpo, 0.34, 0.2, 0.7, Vector3(0, 0.35, 0), cauda_i, 8)
			Lib.cx(corpo, Vector3(0.7, 0.06, 0.3), Vector3(0, 0.05, -0.1), Color(0.2, 0.8, 0.7), Vector3(0.3, 0, 0))    # nadadeira
			_cabelo(Color(0.08, 0.2, 0.16), CR + 0.05, -0.25)
			Lib.caps(corpo, 0.2, 1.0, Vector3(0, CY - 0.35, -0.36), Color(0.08, 0.2, 0.16), Vector3(1.4, 1, 0.6))
			Lib.esf(corpo, 0.1, Vector3(0.3, CY + 0.28, 0.2), Color(1.0, 0.45, 0.7), Vector3.ONE, 6)
			_boca(Color(0.8, 0.25, 0.4), 0.12)
		"lobisomem":    # sétimo filho em noite de lua cheia
			var pelo_l: Color = Color(0.3, 0.28, 0.3) if destaque == null else destaque
			_humano(pelo_l, pelo_l, Color(0.25, 0.2, 0.5), pelo_l, pelo_l, true, Color(1.0, 0.85, 0.2))
			cor_base = pelo_l
			Lib.cx(corpo, Vector3(0.26, 0.2, 0.34), Vector3(0, CY - 0.1, 0.42), pelo_l.lightened(0.15))                   # focinho
			Lib.esf(corpo, 0.07, Vector3(0, CY - 0.04, 0.6), PRETO, Vector3.ONE, 6)
			for sx in [-1.0, 1.0]:
				Lib.cil(corpo, 0.0, 0.13, 0.36, Vector3(0.24 * sx, CY + 0.45, 0), pelo_l, 4, Vector3(0, 0, -0.25 * sx))   # orelhas
				Lib.cx(corpo, Vector3(0.04, 0.12, 0.04), Vector3(0.08 * sx, CY - 0.22, 0.56), BRANCO)                  # presas
			for bb in [braco_e, braco_d]:
				for i in range(3): Lib.cil(bb, 0.0, 0.035, 0.2, Vector3(-0.07 + i * 0.07, -0.62, 0.05), BRANCO, 4, Vector3(PI, 0, 0))
			Lib.esf(corpo, 0.4, Vector3(0, 1.12, -0.1), pelo_l.darkened(0.15), Vector3(1.1, 0.8, 0.9), 8)                 # corcunda peluda
		"boto":         # o boto-cor-de-rosa em forma de moço: cabeça de boto, bico comprido e chapéu de palha
			var rosa_b: Color = Color(0.98, 0.58, 0.7) if destaque == null else destaque
			var palha := Color(0.9, 0.76, 0.42)
			_humano(rosa_b, BRANCO, BRANCO, rosa_b, BRANCO, true, Color(0.2, 0.25, 0.35))
			cor_base = rosa_b
			Lib.esf(corpo, CR * 0.8, Vector3(0, CY + 0.12, 0.12), rosa_b.lightened(0.12), Vector3(1, 0.8, 1), 10)       # testa de boto
			Lib.cx(corpo, Vector3(0.17, 0.11, 0.8), Vector3(0, CY - 0.1, 0.72), rosa_b.lightened(0.08))                 # bico comprido
			Lib.cx(corpo, Vector3(0.15, 0.05, 0.7), Vector3(0, CY - 0.19, 0.66), rosa_b.darkened(0.12), Vector3(0.1, 0, 0))
			Lib.cil(corpo, 0.74, 0.74, 0.05, Vector3(0, CY + 0.32, 0), palha, 14)                                        # chapéu de palha
			Lib.cil(corpo, 0.3, 0.36, 0.28, Vector3(0, CY + 0.47, 0), palha, 12)
			Lib.cil(corpo, 0.365, 0.365, 0.06, Vector3(0, CY + 0.37, 0), Color(0.2, 0.5, 0.75), 12)
			Lib.cx(corpo, Vector3(0.1, 0.28, 0.05), Vector3(0, 1.0, 0.28), Color(0.95, 0.5, 0.65))                       # gravata cor-de-rosa
			Lib.cil(corpo, 0.0, 0.16, 0.42, Vector3(0, 1.3, -0.34), rosa_b, 4, Vector3(-0.6, 0, 0))                      # barbatana nas costas
			Lib.cx(corpo, Vector3(0.6, 0.06, 0.3), Vector3(0, 0.5, -0.42), rosa_b, Vector3(0.5, 0, 0))                   # rabo de boto
		"cuca":         # a bruxa jacaré (mini-chefe do portal)
			var jac: Color = Color(0.3, 0.6, 0.25) if destaque == null else destaque
			var vest := Color(0.5, 0.2, 0.6)
			_humano(jac, vest, vest, jac, jac, true, Color(1.0, 0.9, 0.2))
			cor_base = jac
			Lib.cil(corpo, 0.34, 0.62, 0.7, Vector3(0, 0.4, 0), vest, 10)                                                # vestido
			Lib.cx(corpo, Vector3(0.4, 0.2, 0.62), Vector3(0, CY - 0.06, 0.58), jac)                                     # bocarra
			Lib.cx(corpo, Vector3(0.38, 0.1, 0.58), Vector3(0, CY - 0.22, 0.54), jac.darkened(0.2), Vector3(0.22, 0, 0))
			for i in range(4):
				for sx in [-1.0, 1.0]: Lib.cil(corpo, 0.0, 0.035, 0.11, Vector3(0.16 * sx, CY - 0.17, 0.4 + i * 0.14), BRANCO, 4, Vector3(PI, 0, 0))
			_cabelo(Color(0.95, 0.8, 0.25), CR + 0.07, -0.35)
			Lib.caps(corpo, 0.16, 0.9, Vector3(0, CY - 0.35, -0.4), Color(0.95, 0.8, 0.25), Vector3(1.6, 1, 0.6))
			Lib.cil(corpo, 0.26, 0.05, 1.3, Vector3(0, 0.35, -0.75), jac, 6, Vector3(1.25, 0, 0))                        # rabo
			Lib.cil(braco_d, 0.035, 0.035, 1.3, Vector3(0, -0.3, 0.2), COURO_ESC, 5)                                     # cajado
			Lib.esf(braco_d, 0.14, Vector3(0, 0.4, 0.2), Color(0.7, 0.3, 1.0), Vector3.ONE, 6, 2.5)
		"frevista":     # passista de frevo: calça/camisa listrada de Carnaval e sombrinha colorida
			var pf := Color(0.86, 0.68, 0.5)
			_humano(pf, Color(0.95, 0.9, 0.85), Color(0.2, 0.55, 0.85), pf, Color(0.95, 0.9, 0.85))
			cor_base = Color(0.95, 0.35, 0.55)
			for i in range(5):                                                                        # camisa listrada
				var corl := Color(0.95, 0.35, 0.55) if i % 2 == 0 else Color(1.0, 0.82, 0.15)
				Lib.cx(corpo, Vector3(0.7, 0.1, 0.42), Vector3(0, 0.78 + i * 0.16, 0.08), corl)
			Lib.cil(corpo, 0.4, 0.44, 0.08, Vector3(0, 0.08, 0), Color(1.0, 0.82, 0.15), 12)             # barra da calça
			_cabelo(PRETO, CR + 0.02, -0.3)
			Lib.cil(corpo, 0.56, 0.6, 0.06, Vector3(0, CY + 0.3, 0), BRANCO, 14)                         # panamá
			Lib.cil(corpo, 0.26, 0.3, 0.22, Vector3(0, CY + 0.42, 0), BRANCO, 12)
			Lib.cil(corpo, 0.365, 0.365, 0.06, Vector3(0, CY + 0.34, 0), Color(0.95, 0.35, 0.55), 12)
			Lib.cx(braco_d, Vector3(0.05, 0.9, 0.05), Vector3(0, -0.3, 0.1), Color(0.3, 0.2, 0.1))        # cabo da sombrinha
			Lib.cil(braco_d, 0.42, 0.0, 0.3, Vector3(0, 0.16, 0.1), Color(1.0, 0.82, 0.15), 10)
			for k in range(5): Lib.cx(braco_d, Vector3(0.02, 0.3, 0.17), Vector3(0, 0.3, 0.1), Color(0.95, 0.35, 0.55) if k % 2 == 0 else Color(0.2, 0.7, 0.9), Vector3(0, k * TAU / 5.0, 0))
		"cordelista":   # repentista de cordel: viola nas costas, chapéu de couro, folheto no cinto
			var pc2 := Color(0.74, 0.52, 0.34)
			_humano(pc2, Color(0.92, 0.85, 0.65), Color(0.35, 0.26, 0.16), COURO_ESC, Color(0.92, 0.85, 0.65))
			cor_base = Color(0.8, 0.58, 0.2)
			_cinto(COURO_ESC, 0.68)
			Lib.cx(corpo, Vector3(0.18, 0.24, 0.05), Vector3(0.12, 0.66, 0.3), Color(0.95, 0.9, 0.72), Vector3(0, 0, -0.18))   # folheto de cordel no cinto
			Lib.cx(corpo, Vector3(0.18, 0.24, 0.06), Vector3(0.12, 0.66, 0.29), PRETO, Vector3(0, 0, -0.18))
			_cabelo(Color(0.3, 0.2, 0.12), CR + 0.03, -0.25)
			Lib.cil(corpo, 0.56, 0.6, 0.05, Vector3(0, CY + 0.3, 0), COURO, 14)                            # chapéu de couro
			Lib.esf(corpo, 0.3, Vector3(0, CY + 0.3, 0), COURO, Vector3(1, 0.7, 1), 10, 0.0, true)
			Lib.cx(corpo, Vector3(0.3, 0.06, 0.05), Vector3(0, CY - 0.14, 0.385), PRETO)                   # bigode
			Lib.esf(corpo, 0.3, Vector3(-0.12, 0.82, -0.36), Color(0.75, 0.5, 0.25), Vector3(1, 1.25, 0.35), 8)   # viola nas costas
			Lib.esf(corpo, 0.08, Vector3(-0.12, 0.84, -0.47), PRETO, Vector3(1, 1, 0.3), 6)
			Lib.cil(corpo, 0.03, 0.03, 0.78, Vector3(0.04, 1.08, -0.3), COURO_ESC, 5)                      # pena/caneta na mão
			Lib.cx(corpo, Vector3(0.1, 0.03, 0.1), Vector3(0.13, 1.4, -0.37), BRANCO)
		"sambista":     # sambista: camisa branca, calça e fita verde-rosa (cores da Mangueira), pandeiro na mão
			var ps := Color(0.42, 0.27, 0.17)
			_humano(ps, BRANCO, Color(0.1, 0.5, 0.25), ps, BRANCO)
			cor_base = Color(0.95, 0.2, 0.25)
			_cinto(Color(0.92, 0.3, 0.55), 0.68)
			Lib.cil(corpo, 0.56, 0.6, 0.05, Vector3(0, CY + 0.3, 0), BRANCO, 14)                           # panamá
			Lib.cil(corpo, 0.365, 0.365, 0.07, Vector3(0, CY + 0.34, 0), Color(0.1, 0.5, 0.25), 12)
			Lib.cil(braco_d, 0.3, 0.3, 0.05, Vector3(0, -0.3, 0.14), Color(0.92, 0.85, 0.65), 12).rotation.x = 1.57   # pandeiro
			Lib.cil(braco_d, 0.3, 0.3, 0.015, Vector3(0, -0.3, 0.1), COURO, 12).rotation.x = 1.57
		"maracatuzeiro": # corte de maracatu: manto roxo e dourado, coroa, alfaia (tambor grande) a tiracolo
			var pm2 := Color(0.3, 0.19, 0.12)
			_humano(pm2, Color(0.5, 0.15, 0.6), Color(0.85, 0.72, 0.15), pm2, Color(0.5, 0.15, 0.6))
			cor_base = Color(0.55, 0.15, 0.55)
			Lib.cx(corpo, Vector3(0.78, 0.5, 0.2), Vector3(0, 0.8, -0.05), Color(0.5, 0.15, 0.6))           # manto
			Lib.cil(corpo, 0.42, 0.46, 0.22, Vector3(0, CY + 0.38, 0), Color(0.85, 0.72, 0.15), 12)         # coroa
			for k in range(6):
				var ak := k * TAU / 6.0
				Lib.cil(corpo, 0.0, 0.05, 0.22, Vector3(cos(ak) * 0.4, CY + 0.52, sin(ak) * 0.4), Color(0.85, 0.72, 0.15), 4)
			Lib.cil(corpo, 0.4, 0.44, 0.34, Vector3(0, 0.8, -0.5), Color(0.7, 0.45, 0.2), 10, Vector3(1.57, 0, 0))   # alfaia (tambor) nas costas
			Lib.cil(corpo, 0.44, 0.44, 0.03, Vector3(0, 0.8, -0.67), Color(0.92, 0.85, 0.65), 10, Vector3(1.57, 0, 0))
		"violeiro":     # violeiro caipira: camisa xadrez, chapéu de palha, viola caipira nas costas
			var pv := Color(0.78, 0.56, 0.36)
			_humano(pv, Color(0.9, 0.85, 0.7), Color(0.25, 0.18, 0.1), COURO_ESC, Color(0.9, 0.85, 0.7))
			cor_base = Color(0.55, 0.38, 0.15)
			for i in range(4):
				Lib.cx(corpo, Vector3(0.7, 0.07, 0.42), Vector3(0, 0.74 + i * 0.16, 0.08), Color(0.6, 0.15, 0.15))   # xadrez
			_cinto(COURO_ESC, 0.68)
			Lib.cil(corpo, 0.5, 0.56, 0.05, Vector3(0, CY + 0.3, 0), Color(0.88, 0.78, 0.5), 14)            # chapéu de palha
			Lib.cil(corpo, 0.24, 0.28, 0.2, Vector3(0, CY + 0.4, 0), Color(0.88, 0.78, 0.5), 12)
			Lib.esf(corpo, 0.26, Vector3(-0.1, 0.84, -0.38), Color(0.78, 0.52, 0.28), Vector3(1, 1.3, 0.3), 8)   # viola caipira nas costas
			Lib.esf(corpo, 0.07, Vector3(-0.1, 0.86, -0.49), PRETO, Vector3(1, 1, 0.3), 6)
		"carimbozeiro": # carimbozeiro: colete colorido, chapéu de palha, curimbó (tambor) nas costas
			var pcb := Color(0.5, 0.32, 0.18)
			_humano(pcb, Color(1.0, 0.75, 0.1), pcb, pcb, pcb)
			cor_base = Color(0.15, 0.65, 0.6)
			Lib.cx(corpo, Vector3(0.78, 0.5, 0.21), Vector3(0, 0.84, 0.0), Color(0.15, 0.65, 0.6))          # colete por cima
			_cinto(Color(0.9, 0.2, 0.2), 0.66)
			Lib.cil(corpo, 0.5, 0.56, 0.05, Vector3(0, CY + 0.28, 0), Color(0.88, 0.78, 0.5), 14)           # chapéu de palha
			Lib.cil(corpo, 0.24, 0.28, 0.18, Vector3(0, CY + 0.37, 0), Color(0.88, 0.78, 0.5), 12)
			Lib.cil(corpo, 0.3, 0.33, 0.5, Vector3(0, 0.6, -0.42), Color(0.68, 0.42, 0.2), 10, Vector3(1.57, 0, 0))  # curimbó (tambor comprido)
			Lib.cil(corpo, 0.33, 0.33, 0.03, Vector3(0, 0.6, -0.67), Color(0.92, 0.85, 0.65), 10, Vector3(1.57, 0, 0))
		"forrozeiro":   # pandeirista de forró: chapéu de couro de cangaceiro-sertanejo (sol), colete, pandeiro na mão
			var pfo := Color(0.72, 0.5, 0.3)
			_humano(pfo, Color(0.95, 0.9, 0.8), Color(0.5, 0.3, 0.15), COURO_ESC, Color(0.95, 0.9, 0.8))
			cor_base = Color(0.95, 0.65, 0.1)
			_cinto(COURO_ESC, 0.68)
			Lib.cx(corpo, Vector3(0.78, 0.5, 0.21), Vector3(0, 0.84, 0.0), Color(0.95, 0.65, 0.1))      # colete
			Lib.cil(corpo, 0.5, 0.56, 0.05, Vector3(0, CY + 0.3, 0), Color(0.55, 0.35, 0.18), 14)       # chapéu de couro
			Lib.cil(corpo, 0.24, 0.28, 0.2, Vector3(0, CY + 0.4, 0), Color(0.55, 0.35, 0.18), 12)
			Lib.cil(braco_d, 0.3, 0.3, 0.05, Vector3(0, -0.3, 0.14), Color(0.92, 0.85, 0.65), 12).rotation.x = 1.57   # pandeiro
			Lib.cil(braco_d, 0.3, 0.3, 0.015, Vector3(0, -0.3, 0.1), COURO, 12).rotation.x = 1.57
		"angoleiro":    # mestre de capoeira angola: calça/camisa branca com faixa preta e dourada, boina
			var pan := Color(0.4, 0.23, 0.13)
			_humano(pan, BRANCO, BRANCO, pan, BRANCO)
			cor_base = Color(0.15, 0.15, 0.17)
			_cinto(Color(0.15, 0.15, 0.17), 0.68)
			Lib.cil(corpo, 0.42, 0.44, 0.1, Vector3(0, CY + 0.32, 0), Color(0.15, 0.15, 0.17), 12)      # boina preta
			Lib.esf(corpo, 0.34, Vector3(0, CY + 0.38, 0), Color(0.15, 0.15, 0.17), Vector3(1, 0.6, 1), 10)
			Lib.cx(corpo, Vector3(0.3, 0.06, 0.05), Vector3(0, CY - 0.14, 0.385), BRANCO)               # bigode e barba grisalha
			Lib.cx(corpo, Vector3(0.22, 0.14, 0.05), Vector3(0, CY - 0.26, 0.37), BRANCO)
		"marujo":       # marujo da Bahia: camisa listrada branca e azul, boné de marinheiro, lenço no pescoço
			var pmj := Color(0.68, 0.46, 0.28)
			_humano(pmj, BRANCO, Color(0.15, 0.3, 0.55), pmj, BRANCO)
			cor_base = Color(0.15, 0.35, 0.65)
			for i in range(4):
				Lib.cx(corpo, Vector3(0.7, 0.06, 0.42), Vector3(0, 0.78 + i * 0.14, 0.08), Color(0.15, 0.35, 0.65))   # listras
			Lib.cx(corpo, Vector3(0.3, 0.08, 0.05), Vector3(0, 1.1, 0.3), Color(0.85, 0.2, 0.15))       # lenço vermelho no pescoço
			Lib.cil(corpo, 0.4, 0.44, 0.1, Vector3(0, CY + 0.3, 0), BRANCO, 12)                         # boné de marinheiro
			Lib.cil(corpo, 0.34, 0.34, 0.03, Vector3(0, CY + 0.36, 0), Color(0.15, 0.35, 0.65), 12)
		"jongueira":    # jongueira: saia rodada estampada, turbante na cabeça, tambor caxambu a tiracolo
			var pj := Color(0.35, 0.2, 0.12)
			_humano(pj, Color(0.85, 0.6, 0.2), Color(0.6, 0.15, 0.15), pj, Color(0.85, 0.6, 0.2))
			cor_base = Color(0.5, 0.25, 0.12)
			Lib.cil(corpo, 0.42, 0.5, 0.5, Vector3(0, 0.46, 0), Color(0.6, 0.15, 0.15), 10)             # saia rodada
			Lib.cil(corpo, 0.34, 0.36, 0.1, Vector3(0, CY + 0.3, 0), Color(0.85, 0.6, 0.2), 12)          # turbante
			Lib.esf(corpo, 0.3, Vector3(0, CY + 0.34, 0), Color(0.85, 0.6, 0.2), Vector3(1, 0.7, 1), 10, 0.0, true)
			Lib.cil(corpo, 0.3, 0.33, 0.3, Vector3(0, 0.75, -0.42), Color(0.6, 0.4, 0.2), 10, Vector3(1.57, 0, 0))   # caxambu nas costas
			Lib.cil(corpo, 0.33, 0.33, 0.03, Vector3(0, 0.75, -0.57), Color(0.9, 0.82, 0.6), 10, Vector3(1.57, 0, 0))
		"chorao":       # chorão: terno claro, chapéu panamá, flautim na mão
			var pch := Color(0.6, 0.38, 0.22)
			_humano(pch, Color(0.92, 0.88, 0.78), Color(0.3, 0.25, 0.18), COURO_ESC, Color(0.92, 0.88, 0.78))
			cor_base = Color(0.85, 0.65, 0.15)
			_cinto(COURO_ESC, 0.68)
			Lib.cil(corpo, 0.5, 0.56, 0.05, Vector3(0, CY + 0.3, 0), Color(0.92, 0.88, 0.78), 14)        # panamá
			Lib.cil(corpo, 0.24, 0.28, 0.2, Vector3(0, CY + 0.4, 0), Color(0.92, 0.88, 0.78), 12)
			Lib.cil(braco_d, 0.025, 0.03, 0.7, Vector3(0, -0.4, 0.16), Color(0.85, 0.72, 0.2), 6, Vector3(0, 0, 1.3))   # flautim
		"ceramista":    # ceramista de Caruaru: roupa de couro clara, chapéu de palha, boneco de barro na mão
			var pce := Color(0.65, 0.42, 0.24)
			_humano(pce, Color(0.88, 0.8, 0.6), COURO_ESC, pce, Color(0.88, 0.8, 0.6))
			cor_base = Color(0.72, 0.42, 0.22)
			_cinto(COURO_ESC, 0.68)
			Lib.cil(corpo, 0.5, 0.56, 0.05, Vector3(0, CY + 0.3, 0), Color(0.88, 0.78, 0.5), 14)         # chapéu de palha
			Lib.cil(corpo, 0.24, 0.28, 0.18, Vector3(0, CY + 0.39, 0), Color(0.88, 0.78, 0.5), 12)
			Lib.esf(braco_d, 0.1, Vector3(0, -0.48, 0.1), Color(0.72, 0.42, 0.22), Vector3(1, 1.1, 0.9), 8)   # boneco de barro na mão
			Lib.esf(braco_d, 0.04, Vector3(0, -0.56, 0.17), PRETO, Vector3(1, 1, 0.5), 6)
		"cantora":      # cantora de MPB: vestido longo estampado, cabelo solto, microfone na mão
			var pca := Color(0.78, 0.56, 0.38)
			_humano(pca, Color(0.68, 0.2, 0.55), Color(0.68, 0.2, 0.55), pca, Color(0.68, 0.2, 0.55))
			cor_base = Color(0.68, 0.2, 0.55)
			Lib.cil(corpo, 0.42, 0.5, 0.5, Vector3(0, 0.46, 0), Color(0.55, 0.15, 0.45), 10)             # vestido longo
			_cabelo(Color(0.2, 0.12, 0.08), CR + 0.03, -0.2)
			Lib.cil(braco_d, 0.07, 0.1, 0.26, Vector3(0, -0.48, 0.12), Color(0.1, 0.1, 0.1), 8)           # microfone
			Lib.esf(braco_d, 0.1, Vector3(0, -0.62, 0.15), Color(0.2, 0.2, 0.2), Vector3.ONE, 8)
		"zepilintra":   # Seu Zé Pilintra: terno branco, chapéu de fita vermelha, gravata vermelha e bengala
			var pz := Color(0.28, 0.17, 0.1)
			_humano(pz, BRANCO, BRANCO, BRANCO, BRANCO)
			cor_base = BRANCO
			Lib.cil(corpo, 0.6, 0.6, 0.05, Vector3(0, CY + 0.3, 0), BRANCO, 14).rotation.z = 0.12
			Lib.cil(corpo, 0.31, 0.35, 0.28, Vector3(-0.03, CY + 0.46, 0), BRANCO, 12)
			Lib.cil(corpo, 0.355, 0.355, 0.08, Vector3(-0.02, CY + 0.36, 0), Color(0.82, 0.1, 0.1), 12)
			Lib.cx(corpo, Vector3(0.1, 0.34, 0.05), Vector3(0, 1.0, 0.28), Color(0.82, 0.1, 0.1))
			Lib.cx(corpo, Vector3(0.1, 0.5, 0.05), Vector3(-0.13, 0.98, 0.27), Color(0.9, 0.9, 0.88), Vector3(0, 0, -0.4))   # lapelas
			Lib.cx(corpo, Vector3(0.1, 0.5, 0.05), Vector3(0.13, 0.98, 0.27), Color(0.9, 0.9, 0.88), Vector3(0, 0, 0.4))
			Lib.esf(corpo, 0.06, Vector3(-0.2, 1.12, 0.3), Color(0.82, 0.1, 0.1), Vector3.ONE, 6)                           # cravo na lapela
			Lib.cx(corpo, Vector3(0.2, 0.05, 0.04), Vector3(0, CY - 0.17, 0.375), BRANCO)                                   # sorriso
			Lib.cx(corpo, Vector3(0.22, 0.04, 0.04), Vector3(0, CY - 0.1, 0.385), PRETO)                                    # bigodinho
			for pp in [perna_e, perna_d]: Lib.esf(pp, 0.1, Vector3(0, -0.47, 0.16), PRETO, Vector3(1, 0.6, 1), 6)           # sapato bicolor
			Lib.cil(braco_d, 0.03, 0.03, 1.0, Vector3(0, -0.85, 0.12), PRETO, 5)                                            # bengala
			Lib.esf(braco_d, 0.06, Vector3(0, -0.36, 0.12), OURO, Vector3.ONE, 6)
		"pombagira":    # Pomba Gira: vestido vermelho rodado, cabelo solto, rosa e ouro
			var pg := Color(0.5, 0.31, 0.2)
			var vermelho := Color(0.8, 0.08, 0.12)
			_humano(pg, vermelho, vermelho, PRETO, pg)
			cor_base = vermelho
			Lib.cil(corpo, 0.3, 0.78, 0.7, Vector3(0, 0.38, 0), vermelho, 12)
			Lib.cil(corpo, 0.78, 0.82, 0.08, Vector3(0, 0.06, 0), PRETO, 12)
			Lib.cil(corpo, 0.56, 0.58, 0.05, Vector3(0, 0.36, 0), PRETO, 12)
			_cabelo(PRETO, CR + 0.06, -0.3)
			Lib.caps(corpo, 0.2, 1.1, Vector3(0, CY - 0.4, -0.36), PRETO, Vector3(1.5, 1, 0.6))
			Lib.esf(corpo, 0.11, Vector3(0.32, CY + 0.26, 0.18), Color(0.9, 0.1, 0.15), Vector3.ONE, 6)                     # rosa no cabelo
			for sx in [-1.0, 1.0]: Lib.cil(corpo, 0.07, 0.07, 0.02, Vector3(0.44 * sx, CY - 0.16, 0.02), OURO, 8, Vector3(0, 0, PI / 2.0))   # argolas
			for i in range(7):
				var ag := (i - 3) * 0.28
				Lib.esf(corpo, 0.045, Vector3(sin(ag) * 0.3, 1.2 - cos(ag) * 0.06, 0.22 + cos(ag) * 0.06), OURO, Vector3.ONE, 5)
			_boca(Color(0.85, 0.1, 0.15), 0.14)
			Lib.cil(braco_d, 0.07, 0.03, 0.2, Vector3(0, -0.56, 0.1), OURO, 6)                                              # taça
		"pretovelho":   # Preto Velho: roupa branca, barba branca, chapéu de palha, cachimbo e bengala
			var pv_v := Color(0.24, 0.15, 0.1)
			_humano(pv_v, BRANCO, BRANCO, pv_v, BRANCO)
			cor_base = BRANCO
			Lib.esf(corpo, CR * 0.62, Vector3(0, CY - 0.34, 0.16), BRANCO, Vector3(1.1, 0.55, 0.7), 8)                       # barba
			_cabelo(BRANCO, CR + 0.02, -0.5)
			Lib.cil(corpo, 0.7, 0.72, 0.05, Vector3(0, CY + 0.3, 0), Color(0.9, 0.76, 0.42), 14)
			Lib.cil(corpo, 0.3, 0.38, 0.24, Vector3(0, CY + 0.44, 0), Color(0.9, 0.76, 0.42), 12)
			Lib.cil(corpo, 0.03, 0.03, 0.3, Vector3(0.14, CY - 0.18, 0.5), COURO_ESC, 5, Vector3(PI / 2.0, 0, 0))        # cachimbo
			Lib.cil(corpo, 0.06, 0.05, 0.1, Vector3(0.14, CY - 0.14, 0.66), COURO_ESC, 6)
			Lib.cil(braco_d, 0.03, 0.03, 1.0, Vector3(0, -0.85, 0.12), COURO, 5)                                         # bengala
			for i in range(5):
				var ac := (i - 2) * 0.3
				Lib.esf(corpo, 0.045, Vector3(sin(ac) * 0.28, 1.2 - cos(ac) * 0.06, 0.24), Color(0.15, 0.15, 0.15) if i % 2 == 0 else BRANCO, Vector3.ONE, 5)
			corpo.rotation.x = 0.12
		"baiana":       # Baiana do acarajé: saia rodada branca, torço e colares
			var pb2 := Color(0.42, 0.27, 0.17)
			_humano(pb2, BRANCO, BRANCO, pb2, BRANCO)
			cor_base = BRANCO
			Lib.cil(corpo, 0.3, 0.9, 0.72, Vector3(0, 0.38, 0), BRANCO, 14)
			Lib.cil(corpo, 0.9, 0.93, 0.07, Vector3(0, 0.05, 0), Color(0.3, 0.6, 0.9), 14)
			_cabelo(BRANCO, CR + 0.07, -0.15)                                                                            # torço
			Lib.esf(corpo, 0.2, Vector3(0, CY + 0.4, -0.1), BRANCO, Vector3(1.2, 0.8, 1), 8)
			var cores_c := [Color(0.9, 0.15, 0.15), Color(1.0, 0.8, 0.15), Color(0.2, 0.5, 0.9)]
			for k in range(3):
				for i in range(7):
					var ab := (i - 3) * 0.28
					Lib.esf(corpo, 0.04, Vector3(sin(ab) * (0.3 + k * 0.03), 1.22 - k * 0.09 - cos(ab) * 0.06, 0.22 + cos(ab) * 0.07), cores_c[k], Vector3.ONE, 5)
			for sx in [-1.0, 1.0]: Lib.cil(corpo, 0.08, 0.08, 0.02, Vector3(0.44 * sx, CY - 0.16, 0.02), OURO, 8, Vector3(0, 0, PI / 2.0))
			_boca(Color(0.8, 0.2, 0.25), 0.16)
		"repentista":   # cantador de viola: camisa xadrez, chapéu de couro pequeno e a viola
			var pr_r := Color(0.7, 0.48, 0.32)
			_humano(pr_r, Color(0.2, 0.42, 0.7), Color(0.3, 0.26, 0.22), COURO_ESC, Color(0.2, 0.42, 0.7))
			cor_base = Color(0.2, 0.42, 0.7)
			for i in range(3): Lib.cx(corpo, Vector3(0.66, 0.04, 0.02), Vector3(0, 0.75 + i * 0.16, 0.28), Color(0.9, 0.9, 0.95))
			for i in range(3): Lib.cx(corpo, Vector3(0.04, 0.5, 0.02), Vector3(-0.18 + i * 0.18, 0.92, 0.285), Color(0.9, 0.9, 0.95))
			_cabelo(PRETO, CR + 0.03, -0.3)
			Lib.cil(corpo, 0.55, 0.57, 0.05, Vector3(0, CY + 0.3, 0), COURO, 12)
			Lib.esf(corpo, 0.34, Vector3(0, CY + 0.3, 0), COURO, Vector3(1, 0.7, 1), 10, 0.0, true)
			Lib.cx(corpo, Vector3(0.3, 0.06, 0.05), Vector3(0, CY - 0.14, 0.385), PRETO)                                 # bigode
			Lib.esf(corpo, 0.3, Vector3(0.12, 0.82, 0.36), Color(0.75, 0.5, 0.25), Vector3(1, 1.25, 0.35), 8)            # viola
			Lib.esf(corpo, 0.08, Vector3(0.12, 0.84, 0.47), PRETO, Vector3(1, 1, 0.3), 6)
			Lib.cx(corpo, Vector3(0.07, 0.75, 0.05), Vector3(-0.22, 1.2, 0.36), COURO_ESC, Vector3(0, 0, 0.75))
			braco_e.rotation.x = -0.9; braco_d.rotation.x = -0.6
		"vaqueiro":     # vaqueiro encourado: gibão, perneira e chapéu de couro redondo
			var pq_v := Color(0.66, 0.44, 0.28)
			_humano(pq_v, COURO, COURO_ESC, COURO_ESC, COURO)
			cor_base = COURO
			Lib.cx(corpo, Vector3(0.5, 0.6, 0.06), Vector3(0, 0.95, 0.27), COURO_ESC)                                     # peitoral do gibão
			for i in range(3): Lib.esf(corpo, 0.04, Vector3(0, 0.78 + i * 0.16, 0.31), OURO, Vector3.ONE, 5)
			_cabelo(COURO_ESC, CR + 0.04, -0.2)
			Lib.cil(corpo, 0.66, 0.66, 0.05, Vector3(0, CY + 0.28, 0), COURO, 14)
			Lib.esf(corpo, 0.36, Vector3(0, CY + 0.28, 0), COURO, Vector3(1, 0.75, 1), 10, 0.0, true)
			Lib.cx(corpo, Vector3(0.03, 0.4, 0.03), Vector3(0.3, CY - 0.1, 0.2), COURO_ESC); Lib.cx(corpo, Vector3(0.03, 0.4, 0.03), Vector3(-0.3, CY - 0.1, 0.2), COURO_ESC)   # barbicacho
			Lib.cil(corpo, 0.2, 0.2, 0.05, Vector3(0.4, 0.75, 0.05), Color(0.8, 0.7, 0.5), 10, Vector3(0, 0, PI / 2.0))  # laço enrolado
			Lib.cx(corpo, Vector3(0.24, 0.05, 0.05), Vector3(0, CY - 0.15, 0.385), PRETO)
		"saci":
			var pele5 := Color(0.23, 0.15, 0.11)
			var verm: Color = Color(0.9, 0.14, 0.1) if destaque == null else destaque
			_humano(pele5, pele5, pele5, pele5, pele5, true, Color(1, 0.95, 0.6))
			cor_base = verm
			perna_d.queue_free(); perna_d = null
			perna_e.position.x = 0.0
			saltita = true
			Lib.esf(corpo, 0.36, Vector3(0, 0.64, 0), verm, Vector3(1, 0.6, 0.82), 10)           # calção
			_cabelo(verm, CR + 0.04, -0.25)                                                      # gorro
			Lib.cil(corpo, 0.03, 0.3, 0.6, Vector3(0, CY + 0.6, -0.16), verm, 8, Vector3(-0.5, 0, 0))
			Lib.esf(corpo, 0.07, Vector3(0, CY + 0.84, -0.33), BRANCO, Vector3.ONE, 5)
			Lib.cx(corpo, Vector3(0.24, 0.07, 0.04), Vector3(0, CY - 0.17, 0.375), BRANCO)       # risada
			Lib.cil(corpo, 0.025, 0.025, 0.28, Vector3(0.14, CY - 0.2, 0.5), COURO, 5, Vector3(PI / 2.0, 0, 0))   # cachimbo
			Lib.cil(corpo, 0.07, 0.05, 0.12, Vector3(0.14, CY - 0.15, 0.64), COURO_ESC, 6)
		"mapinguari":
			var pelo := Color(0.42, 0.24, 0.12); var pelo2 := Color(0.3, 0.16, 0.08)
			_humano(pelo, pelo, pelo2, PRETO, pelo, true, Color(1, 0.3, 0.1))
			cor_base = pelo
			Lib.esf(corpo, 0.5, Vector3(0, 0.95, 0.02), pelo, Vector3(1.15, 1.1, 1.0), 10)                  # barrigão
			Lib.esf(corpo, 0.3, Vector3(0, CY + 0.02, 0.2), pelo2, Vector3(1, 0.9, 0.7), 10)                # tapa os dois olhos
			Lib.esf(corpo, 0.2, Vector3(0, CY + 0.05, 0.38), Color(1.0, 0.9, 0.3), Vector3(1, 1, 0.5), 10, 2.0)   # olho único
			Lib.esf(corpo, 0.09, Vector3(0, CY + 0.05, 0.47), PRETO, Vector3(0.6, 1.3, 0.4), 6)
			Lib.cx(corpo, Vector3(0.62, 0.3, 0.1), Vector3(0, 0.88, 0.5), Color(0.45, 0.05, 0.08))          # boca na barriga
			for i in range(5):
				Lib.cil(corpo, 0.0, 0.05, 0.14, Vector3(-0.24 + i * 0.12, 0.99, 0.54), BRANCO, 4, Vector3(PI, 0, 0))
				Lib.cil(corpo, 0.0, 0.05, 0.14, Vector3(-0.24 + i * 0.12, 0.77, 0.54), BRANCO, 4)
			for i in range(10):                                                                             # tufos de pelo
				var a3 := i * TAU / 10.0
				Lib.cil(corpo, 0.0, 0.14, 0.4, Vector3(cos(a3) * 0.42, 1.3 + (i % 2) * 0.12, sin(a3) * 0.36), pelo2, 4, Vector3(sin(a3) * 0.9, 0, -cos(a3) * 0.9))
			for bm in [braco_e, braco_d]:
				bm.scale = Vector3(1.5, 1.5, 1.5)
				for k in range(3):                                                                          # garras
					Lib.cil(bm, 0.0, 0.035, 0.2, Vector3(-0.07 + k * 0.07, -0.62, 0.05), BRANCO, 4, Vector3(PI, 0, 0))
		"mula":
			var pm := Color(0.2, 0.13, 0.1); var fogo1 := Color(1.0, 0.45, 0.05); var fogo2 := Color(1.0, 0.85, 0.2)
			cor_base = fogo1
			corpo = Lib.pivo(self, Vector3.ZERO)
			Lib.caps(corpo, 0.36, 1.5, Vector3(0, 1.05, 0), pm, Vector3.ONE, Vector3(PI / 2.0, 0, 0))
			perna_e = Lib.pivo(corpo, Vector3(-0.2, 0.9, 0.5)); perna_d = Lib.pivo(corpo, Vector3(0.2, 0.9, 0.5))
			braco_e = Lib.pivo(corpo, Vector3(-0.2, 0.9, -0.5)); braco_d = Lib.pivo(corpo, Vector3(0.2, 0.9, -0.5))
			for pt in [perna_e, perna_d, braco_e, braco_d]:
				Lib.caps(pt, 0.1, 0.9, Vector3(0, -0.42, 0), pm)
				Lib.cil(pt, 0.12, 0.14, 0.14, Vector3(0, -0.85, 0), OURO, 6)                                # casco
			Lib.caps(corpo, 0.22, 0.9, Vector3(0, 1.45, 0.75), pm, Vector3.ONE, Vector3(0.7, 0, 0))         # pescoço
			for i in range(6):                                                                              # fogo no lugar da cabeça
				var a4 := i * TAU / 6.0
				Lib.cil(corpo, 0.0, 0.2, 0.7, Vector3(cos(a4) * 0.14, 2.05, 1.0 + sin(a4) * 0.14), fogo1 if i % 2 == 0 else fogo2, 5, Vector3(sin(a4) * 0.4, 0, -cos(a4) * 0.4), 2.5)
			Lib.cil(corpo, 0.0, 0.26, 1.0, Vector3(0, 2.25, 1.0), fogo2, 5, Vector3.ZERO, 3.0)
			Lib.cil(corpo, 0.0, 0.16, 0.9, Vector3(0, 1.1, -1.05), fogo1, 5, Vector3(-2.0, 0, 0), 2.5)      # rabo de fogo
			Lib.cx(corpo, Vector3(0.78, 0.08, 0.5), Vector3(0, 1.42, 0), Color(0.7, 0.1, 0.1))              # manta
		"minhocao":     # o bicho fodão do fim: verme gigante de couro grosso
			var t1 := Color(0.42, 0.3, 0.18); var t2 := Color(0.3, 0.21, 0.12)
			cor_base = t1
			corpo = Lib.pivo(self, Vector3.ZERO)
			for i in range(14):                                                                             # corpo de verme bem comprido e grosso
				var rs2 := 0.95 - i * 0.045
				Lib.esf(corpo, rs2, Vector3(sin(i * 0.55) * 0.55, rs2 * 0.85, -0.3 - i * 0.78), t1 if i % 2 == 0 else t2, Vector3(1, 0.9, 1.15), 10, 1.0)
				if i % 2 == 1:                                                                              # placas de couro no dorso
					Lib.cx(corpo, Vector3(rs2 * 0.9, 0.12, rs2 * 1.1), Vector3(sin(i * 0.55) * 0.55, rs2 * 1.6, -0.3 - i * 0.78), Color(0.22, 0.15, 0.09))
			Lib.esf(corpo, 1.15, Vector3(0, 1.1, 0.55), t1, Vector3(1.1, 1.0, 1.25), 12, 1.0)                # cabeção erguido
			Lib.cx(corpo, Vector3(0.85, 0.5, 0.2), Vector3(0, 0.78, 1.25), Color(0.5, 0.08, 0.1))            # boca enorme escancarada
			for k in range(6):                                                                              # dentões
				var sxk := -1.0 if k % 2 == 0 else 1.0
				Lib.cil(corpo, 0.0, 0.08, 0.26, Vector3(sxk * (0.1 + k / 2 * 0.22), 0.95 - (k / 2) * 0.1, 1.42), BRANCO, 4, Vector3(PI, 0, 0))
			for sx in [-1.0, 1.0]:
				Lib.esf(corpo, 0.14, Vector3(0.45 * sx, 1.5, 1.0), Color(1.0, 0.85, 0.15), Vector3(1, 1, 0.5), 8, 1.8)   # olhos pequenos, acesos
				Lib.esf(corpo, 0.06, Vector3(0.45 * sx, 1.5, 1.08), PRETO, Vector3(0.5, 1.4, 0.4), 6)
		"boitata":
			var f1 := Color(1.0, 0.4, 0.05); var f2 := Color(1.0, 0.8, 0.15)
			cor_base = f1
			corpo = Lib.pivo(self, Vector3.ZERO)
			for i in range(11):                                                                             # corpo de cobra de fogo
				var rs := 0.5 - i * 0.035
				Lib.esf(corpo, rs, Vector3(sin(i * 0.9) * 0.45, rs * 0.9, -0.2 - i * 0.55), f1 if i % 2 == 0 else f2, Vector3.ONE, 8, 1.2)
			Lib.caps(corpo, 0.4, 1.1, Vector3(0, 0.6, 0.15), f2, Vector3.ONE, Vector3(0.5, 0, 0))
			Lib.esf(corpo, 0.62, Vector3(0, 1.0, 0.45), f1, Vector3(1, 0.85, 1.2), 10, 1.0)                 # cabeça erguida
			for sx in [-1.0, 1.0]:
				Lib.esf(corpo, 0.2, Vector3(0.3 * sx, 1.2, 0.9), BRANCO, Vector3(1, 1, 0.5), 8, 2.5)        # olhões de fogo
				Lib.esf(corpo, 0.08, Vector3(0.3 * sx, 1.2, 1.0), PRETO, Vector3(0.5, 1.4, 0.4), 6)
				Lib.cil(corpo, 0.0, 0.14, 0.6, Vector3(0.3 * sx, 1.65, 0.3), f2, 5, Vector3(-0.4, 0, -0.3 * sx), 2.5)
			Lib.cx(corpo, Vector3(0.5, 0.06, 0.1), Vector3(0, 0.82, 1.12), PRETO)
			Lib.cil(corpo, 0.0, 0.05, 0.16, Vector3(-0.16, 0.74, 1.12), BRANCO, 4, Vector3(PI, 0, 0))
			Lib.cil(corpo, 0.0, 0.05, 0.16, Vector3(0.16, 0.74, 1.12), BRANCO, 4, Vector3(PI, 0, 0))
		_:  # caipora
			var pele6 := Color(0.66, 0.32, 0.18)
			var cabelo: Color = Color(0.98, 0.42, 0.08) if destaque == null else destaque
			_humano(pele6, pele6, pele6, pele6, pele6, true, Color(1, 0.9, 0.25))
			cor_base = cabelo
			Lib.cil(corpo, 0.33, 0.56, 0.36, Vector3(0, 0.56, 0), Color(0.22, 0.6, 0.2), 9)      # saia de folhas
			Lib.cil(corpo, 0.3, 0.44, 0.14, Vector3(0, 1.16, 0), Color(0.3, 0.7, 0.25), 9).scale = Vector3(1, 1, 0.85)   # gola de folhas
			_cabelo(cabelo, CR + 0.03, -0.3)
			for i in range(8):                                                                   # cabelo de fogo
				var a2 := i * TAU / 8.0
				Lib.cil(corpo, 0.0, 0.17, 0.62, Vector3(cos(a2) * 0.27, CY + 0.42, sin(a2) * 0.25 - 0.04), cabelo.lightened(0.15 if i % 2 == 0 else 0.0), 5, Vector3(sin(a2) * 0.6, 0, -cos(a2) * 0.6), 0.25)
			Lib.cil(corpo, 0.0, 0.2, 0.8, Vector3(0, CY + 0.66, -0.03), cabelo.lightened(0.3), 5, Vector3.ZERO, 0.35)
			Lib.cx(corpo, Vector3(0.22, 0.05, 0.04), Vector3(0, CY - 0.17, 0.375), PRETO)
			Lib.cil(corpo, 0.0, 0.035, 0.1, Vector3(-0.07, CY - 0.13, 0.385), BRANCO, 4)         # presas
			Lib.cil(corpo, 0.0, 0.035, 0.1, Vector3(0.07, CY - 0.13, 0.385), BRANCO, 4)
			# lança
			Lib.cil(braco_d, 0.03, 0.03, 1.8, Vector3(0, -0.44, 0.25), COURO_ESC, 5, Vector3(PI / 2.0 - 0.5, 0, 0))
			Lib.cil(braco_d, 0.0, 0.08, 0.28, Vector3(0, 0.05, 1.13), Color(0.85, 0.85, 0.82), 4, Vector3(PI / 2.0 - 0.5, 0, 0))

# ---------- animação ----------
func atacar() -> void: atk_t = 0.28
func girar() -> void: giro_t = 0.32
func bater() -> void: bate_t = 0.12

func animar(delta: float, andando: bool, ritmo: float = 1.0) -> void:
	t += delta * (10.0 * ritmo if andando else 2.2)
	atk_t = maxf(0.0, atk_t - delta)
	giro_t = maxf(0.0, giro_t - delta)
	bate_t = maxf(0.0, bate_t - delta)
	var s := sin(snappedf(t, 0.78)) * 0.95 if andando else 0.0
	var a := atk_t / 0.28
	if perna_e: perna_e.rotation.x = s if not saltita else 0.0
	if perna_d: perna_d.rotation.x = -s
	if braco_e: braco_e.rotation.x = -s * 0.8 - a * 1.2
	if braco_d: braco_d.rotation.x = s * 0.8 - sin(a * PI) * 2.3
	if braco_e: braco_e.rotation.z = -0.12 - (0.9 if giro_t > 0.0 else 0.0)
	if braco_d: braco_d.rotation.z = 0.12 + (0.9 if giro_t > 0.0 else 0.0)
	var pulinho := absf(sin(t)) * (0.32 if saltita else 0.07) if andando else sin(t) * 0.015
	corpo.position.y = pulinho
	corpo.rotation.y = (1.0 - giro_t / 0.32) * TAU if giro_t > 0.0 else 0.0
	corpo.rotation.z = 0.35 if tonto else 0.0
	corpo.rotation.x = 0.12 if andando and not saltita else 0.0
	var e := 1.0 + 0.22 * (bate_t / 0.12)
	corpo.scale = Vector3(e, 2.0 - e, e)
