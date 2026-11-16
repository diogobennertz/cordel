extends Node
class_name Dados
# Classes e golpes portados da versão 2D. Os números seguem o jogo original.
# Cada golpe tem um "tipo" e o World sabe executar cada tipo (ring, arco, onda, investida, projétil...).

const CLASSES := {
	"capoeirista": {
		"nome": "Capoeirista", "apelido": "Mestre Besouro", "pulo": "Pulo alto com mortal que acerta ao cair. Já começa com pulo duplo.", "cor": Color(0.94, 0.76, 0.3), "maxhp": 140.0, "speed": 6.4, "dodge": 0.20,
		"inicial": "armada", "desbloqueia": {"meialua": 3, "rasteira": 5, "berimbau": 7},
		"desc": "Ginga e giros largos que varrem tudo em volta. Rápido e esquivo."
	},
	"jiujitsu": {
		"nome": "Lutadora de Jiu-Jitsu", "apelido": "Bia Gracie", "pulo": "Pulo curto e pesado: a queda deixa tonto quem estiver por perto.", "cor": Color(0.61, 0.48, 0.9), "maxhp": 150.0, "speed": 5.3, "armor": 0.20,
		"inicial": "kimura", "desbloqueia": {"queda": 3, "raspagem": 6},
		"desc": "Luta colada: investe, fecha a guarda e se cura ao finalizar."
	},
	"benzedeira": {
		"nome": "Benzedeira", "apelido": "Maria das Dores", "pulo": "Segure o pulo para planar devagar por cima da bicharada.", "cor": Color(0.31, 0.82, 0.77), "maxhp": 102.0, "speed": 5.7, "regen": 1.0,
		"inicial": "fogofatuo", "desbloqueia": {"garrafada": 3, "reza": 6},
		"desc": "Ataca de bem longe: fogo-fátuo teleguiado, garrafada e reza."
	},
	"cangaceiro": {
		"nome": "Cangaceiro", "apelido": "Capitão Gonzaga", "pulo": "A arrancada é um rolamento: o golpe seguinte sai crítico na certa.", "cor": Color(0.89, 0.34, 0.18), "maxhp": 125.0, "speed": 5.6, "crit": 0.10,
		"inicial": "peixeira", "desbloqueia": {"bacamarte": 3, "rifle": 6},
		"desc": "Dano bruto e muito crítico: faca, bacamarte e rifle."
	},
	"frevista": {
		"nome": "Passista de Frevo", "apelido": "Capiba", "pulo": "Pulo alto de bailarino: ao cair, empurra tudo em volta — sem bater.", "cor": Color(0.95, 0.35, 0.55), "maxhp": 108.0, "speed": 7.0, "dodge": 0.22,
		"inicial": "tesoura", "desbloqueia": {"parafuso": 3, "ferrugem": 6},
		"desc": "O mais rápido de todos: passos de frevo que varrem a roda com a sombrinha."
	},
	"cordelista": {
		"nome": "Repentista de Cordel", "apelido": "Patativa do Assaré", "pulo": "Pulo comum, mas ao cair solta um verso que atordoa quem está perto.", "cor": Color(0.8, 0.58, 0.2), "maxhp": 130.0, "speed": 5.8, "crit": 0.08, "regen": 0.4,
		"inicial": "repente", "desbloqueia": {"glosa": 3, "desafio": 6},
		"desc": "Ataca com verso na ponta da língua: rápido de perto, teleguiado e em desafio."
	},
	"sambista": {
		"nome": "Sambista", "apelido": "Cartola", "pulo": "Pulo de samba, leve e malemolente — nada de especial ao cair.", "cor": Color(0.95, 0.2, 0.25), "maxhp": 118.0, "speed": 6.6, "crit": 0.07,
		"inicial": "batucada", "desbloqueia": {"sapateado": 3, "pandeirada": 6},
		"desc": "Batucada, sapateado e pandeirada: gira e acerta tudo em volta, rápido e ligeiro."
	},
	"maracatuzeiro": {
		"nome": "Maracatuzeiro", "apelido": "Dona Santa", "pulo": "Pulo pesado de quem carrega o alfaia: a queda tremenda acerta em volta.", "cor": Color(0.55, 0.15, 0.55), "maxhp": 145.0, "speed": 5.2, "armor": 0.18,
		"inicial": "alfaia", "desbloqueia": {"calunga": 3, "cortejo": 6},
		"desc": "Alfaia, calunga e cortejo: tanque de corte real, bate forte e aguenta pancada."
	},
	"violeiro": {
		"nome": "Violeiro", "apelido": "Tião Carreiro", "pulo": "Pulo comum de violeiro — nada de especial ao cair.", "cor": Color(0.55, 0.38, 0.15), "maxhp": 112.0, "speed": 5.6, "regen": 0.6,
		"inicial": "dedilhado", "desbloqueia": {"caterete": 3, "toada": 6},
		"desc": "Dedilhado, cateretê e toada: ataca de longe com a viola, sustenta a lida."
	},
	"carimbozeiro": {
		"nome": "Carimbozeiro", "apelido": "Mestre Verequete", "pulo": "Pulo de carimbó: gira no ar e, ao cair, empurra tudo em volta sem bater.", "cor": Color(0.15, 0.65, 0.6), "maxhp": 110.0, "speed": 6.8, "dodge": 0.20,
		"inicial": "carimbo", "desbloqueia": {"banda_couro": 3, "pisada_forte": 6},
		"desc": "Carimbó, banda de couro e pisada forte: o mais ligeiro na dança, difícil de pegar."
	},
	# ---- desbloqueáveis (por feito — ver DESBLOQUEIOS) ----
	"forrozeiro": {
		"nome": "Pandeirista de Forró", "apelido": "Jackson do Pandeiro", "pulo": "Pulo comum de forrozeiro — nada de especial ao cair.", "cor": Color(0.95, 0.65, 0.1), "maxhp": 115.0, "speed": 6.9, "crit": 0.06,
		"inicial": "pandeirao", "desbloqueia": {"coco_embolada": 3, "baiao_rapido": 6},
		"desc": "Pandeirão, coco de embolada e baião rápido: o mais veloz de pé no chão."
	},
	"angoleiro": {
		"nome": "Mestre de Capoeira Angola", "apelido": "Mestre Pastinha", "pulo": "Pulo baixo e manhoso: a cabeçada ao cair atordoa quem está perto.", "cor": Color(0.15, 0.15, 0.17), "maxhp": 135.0, "speed": 5.0, "armor": 0.15,
		"inicial": "cocorinha", "desbloqueia": {"cabecada": 3, "negativa": 6},
		"desc": "Cocorinha, cabeçada e negativa: devagar no chão, manha e defesa de mestre."
	},
	"marujo": {
		"nome": "Marujo da Bahia", "apelido": "Dorival Caymmi", "pulo": "Pulo comum de marujo — nada de especial ao cair.", "cor": Color(0.15, 0.35, 0.65), "maxhp": 108.0, "speed": 5.9, "regen": 0.5,
		"inicial": "rede_pesca", "desbloqueia": {"mare_cheia": 3, "canto_mar": 6},
		"desc": "Rede de pesca, maré cheia e canto do mar: ataca de longe, sustenta a travessia."
	},
}

# Heróis desbloqueáveis: ficam de contorno preto na grade até cumprir o feito. "ach" já é o nome
# pronto pra virar conquista da Steam no futuro (hoje só paga a liberação, sem integração nenhuma ainda).
const DESBLOQUEIOS := {
	"forrozeiro": {"txt": "Dê 2.000.000 de dano numa única corrida", "ach": "ACH_HEROI_FORROZEIRO", "tipo": "dano_run", "meta": 2000000.0},
	"angoleiro":  {"txt": "Vença 10 chefes", "ach": "ACH_HEROI_ANGOLEIRO", "tipo": "contador", "c": "chefes", "meta": 10},
	"marujo":     {"txt": "Derrube 10.000 bichos", "ach": "ACH_HEROI_MARUJO", "tipo": "contador", "c": "abates", "meta": 10000},
}
static func heroi_desbloqueado(id: String) -> bool:
	if not DESBLOQUEIOS.has(id): return true
	var r: Dictionary = DESBLOQUEIOS[id]
	match r["tipo"]:
		"contador": return int(Salvo.d["contadores"].get(r["c"], 0)) >= int(r["meta"])
		"dano_run": return float(Salvo.d.get("maior_dano_run", 0.0)) >= float(r["meta"])
	return false
static func requisito_heroi(id: String) -> String:
	return String(DESBLOQUEIOS.get(id, {}).get("txt", ""))

const GOLPES := {
	# Capoeira
	"armada":   {"nome": "Armada", "build": "capoeira", "tipo": "ring", "dmg": 20.0, "cd": 1.0, "raio": 3.0, "knock": 1.2, "arte": "armada", "txt": "Giro que acerta e empurra todos em volta."},
	"meialua":  {"nome": "Meia-Lua de Compasso", "build": "capoeira", "tipo": "arco", "dmg": 28.0, "cd": 1.3, "raio": 3.7, "ang": 1.8, "knock": 1.4, "arte": "meialua", "txt": "Chute largo e forte na direção do bicho mais perto."},
	"rasteira": {"nome": "Rasteira", "build": "capoeira", "tipo": "ring", "dmg": 12.0, "cd": 2.30, "raio": 3.2, "stun": 1.2, "knock": 0.3, "arte": "rasteira", "txt": "Derruba e deixa tontos os bichos em volta."},
	"berimbau": {"nome": "Toque de Berimbau", "build": "capoeira", "tipo": "onda", "dmg": 18.0, "cd": 3.20, "raio": 6.2, "knock": 2.4, "arte": "berimbau", "txt": "Onda de som que joga a bicharada para longe."},
	# Jiu-Jitsu
	"kimura":   {"nome": "Kimura", "build": "jiujitsu", "tipo": "investida", "dmg": 34.0, "cd": 1.50, "raio": 1.7, "alcance": 7.0, "stun": 1.2, "arte": "kimura", "txt": "Investe no bicho mais perto, torce e atordoa. Finalizar cura."},
	"queda":    {"nome": "Queda de Baiana", "build": "jiujitsu", "tipo": "arco", "dmg": 24.0, "cd": 1.90, "raio": 2.7, "ang": 1.7, "stun": 1.0, "knock": 1.3, "arte": "queda", "txt": "Arremessa quem está na frente: atordoa e empurra."},
	"raspagem": {"nome": "Raspagem", "build": "jiujitsu", "tipo": "ring", "dmg": 14.0, "cd": 2.40, "raio": 2.6, "stun": 1.3, "knock": 0.2, "arte": "guarda", "txt": "Varre o chão em volta e deixa todo mundo tonto."},
	# Mandinga
	"fogofatuo":{"nome": "Fogo-Fátuo", "build": "mandinga", "tipo": "proj_teleguiado", "dmg": 17.0, "cd": 0.85, "vel": 12.0, "raio": 0.5, "vida": 3.4, "alcance": 26.0, "n": 1, "boom": 1.5, "cor": Color(0.31, 0.72, 0.95), "arte": "fogofatuo", "txt": "Fogo azul que persegue o bicho e estoura. Ganha mais fogos a cada 2 níveis."},
	"garrafada":{"nome": "Garrafada", "build": "mandinga", "tipo": "proj_estoura", "dmg": 24.0, "cd": 2.00, "vel": 11.0, "raio": 0.45, "vida": 1.9, "alcance": 21.0, "boom": 2.7, "cor": Color(0.25, 0.62, 0.35), "arte": "garrafada", "txt": "Garrafa de erva que estoura numa área grande."},
	"reza":     {"nome": "Reza Forte", "build": "mandinga", "tipo": "onda", "dmg": 16.0, "cd": 3.00, "raio": 5.6, "knock": 2.2, "arte": "reza", "txt": "Reza forte: fere e afasta tudo que chegou perto."},
	# Cangaço
	"peixeira": {"nome": "Peixeira", "build": "cangaco", "tipo": "arco", "dmg": 16.0, "cd": 0.65, "raio": 2.7, "ang": 1.2, "crit": 0.12, "arte": "peixeira", "txt": "Facada rápida na frente, com +12% de chance de crítico."},
	# Frevo
	"tesoura":  {"nome": "Tesoura", "build": "frevo", "tipo": "arco", "dmg": 22.0, "cd": 1.0, "raio": 3.0, "ang": 1.5, "knock": 1.0, "arte": "arretado", "txt": "Passo de frevo em tesoura: varre a sombrinha na frente."},
	"parafuso": {"nome": "Parafuso", "build": "frevo", "tipo": "ring", "dmg": 16.0, "cd": 1.6, "raio": 3.4, "stun": 1.0, "knock": 0.6, "arte": "arretado", "txt": "Gira feito pião e atordoa quem está em volta."},
	"ferrugem": {"nome": "Ferrugem", "build": "frevo", "tipo": "onda", "dmg": 15.0, "cd": 2.6, "raio": 5.0, "knock": 1.8, "arte": "arretado", "txt": "Passo forte que empurra toda a roda para longe."},
	# Cordel
	"repente":  {"nome": "Repente", "build": "cordel", "tipo": "proj_reto", "dmg": 20.0, "cd": 0.9, "vel": 16.0, "raio": 0.35, "vida": 0.9, "n": 1, "pierce": 1, "cor": Color(0.9, 0.85, 0.6), "arte": "arretado", "txt": "Atira um verso afiado que atravessa um bicho."},
	"glosa":    {"nome": "Glosa", "build": "cordel", "tipo": "proj_teleguiado", "dmg": 16.0, "cd": 1.3, "vel": 11.0, "raio": 0.4, "vida": 3.0, "alcance": 24.0, "boom": 1.3, "cor": Color(0.9, 0.85, 0.6), "arte": "arretado", "txt": "Verso teleguiado que responde a quem provocou."},
	"desafio":  {"nome": "Desafio", "build": "cordel", "tipo": "onda", "dmg": 18.0, "cd": 2.8, "raio": 5.2, "knock": 1.8, "arte": "arretado", "txt": "Grito de desafio em verso: estoura em volta e empurra."},
	"bacamarte":{"nome": "Bacamarte", "build": "cangaco", "tipo": "proj_reto", "dmg": 9.0, "cd": 1.40, "vel": 13.0, "raio": 0.4, "vida": 0.7, "n": 5, "spread": 0.5, "pierce": 1, "cor": Color(0.2, 0.15, 0.1), "arte": "bacamarte", "txt": "Tiro de chumbo espalhado: 5 balas em leque."},
	"rifle":    {"nome": "Rifle Papo-Amarelo", "build": "cangaco", "tipo": "proj_reto", "dmg": 30.0, "cd": 1.60, "vel": 24.0, "raio": 0.32, "vida": 0.8, "n": 1, "spread": 0.0, "pierce": 99, "crit": 0.10, "cor": Color(0.94, 0.71, 0.1), "arte": "papoamarelo", "txt": "Bala que atravessa a fila inteira. +10% de crítico."},
	# Samba
	"batucada":    {"nome": "Batucada", "build": "samba", "tipo": "ring", "dmg": 20.0, "cd": 1.1, "raio": 3.1, "knock": 1.1, "arte": "arretado", "txt": "Roda de batucada: acerta todo mundo em volta."},
	"sapateado":   {"nome": "Sapateado", "build": "samba", "tipo": "arco", "dmg": 26.0, "cd": 1.2, "raio": 3.3, "ang": 1.6, "knock": 1.2, "arte": "arretado", "txt": "Passo de samba na frente, rápido e forte."},
	"pandeirada":  {"nome": "Pandeirada", "build": "samba", "tipo": "onda", "dmg": 17.0, "cd": 2.9, "raio": 5.4, "knock": 2.0, "arte": "arretado", "txt": "Pandeiro no alto: onda de som que empurra tudo em volta."},
	# Maracatu
	"alfaia":      {"nome": "Alfaia", "build": "maracatu", "tipo": "ring", "dmg": 24.0, "cd": 1.3, "raio": 3.4, "stun": 0.8, "knock": 0.8, "arte": "arretado", "txt": "Tambor fundo que estremece e atordoa a bicharada em volta."},
	"calunga":     {"nome": "Calunga", "build": "maracatu", "tipo": "arco", "dmg": 26.0, "cd": 1.6, "raio": 3.2, "ang": 1.6, "stun": 0.6, "knock": 1.0, "arte": "arretado", "txt": "A boneca sagrada abençoa o golpe na frente: atordoa quem recebe."},
	"cortejo":     {"nome": "Cortejo", "build": "maracatu", "tipo": "onda", "dmg": 19.0, "cd": 2.7, "raio": 5.8, "knock": 2.6, "arte": "arretado", "txt": "O cortejo real avança e abre caminho, empurrando tudo para longe."},
	# Viola
	"dedilhado":   {"nome": "Dedilhado", "build": "viola", "tipo": "proj_reto", "dmg": 18.0, "cd": 0.8, "vel": 15.0, "raio": 0.33, "vida": 0.85, "n": 1, "pierce": 1, "cor": Color(0.75, 0.55, 0.2), "arte": "arretado", "txt": "Corda dedilhada rápido: atira uma nota afiada na frente."},
	"caterete":    {"nome": "Cateretê", "build": "viola", "tipo": "proj_teleguiado", "dmg": 17.0, "cd": 1.1, "vel": 12.0, "raio": 0.42, "vida": 3.2, "alcance": 25.0, "boom": 1.4, "cor": Color(0.75, 0.55, 0.2), "arte": "arretado", "txt": "Nota de desafio que persegue o bicho até estourar."},
	"toada":       {"nome": "Toada", "build": "viola", "tipo": "proj_estoura", "dmg": 23.0, "cd": 2.1, "vel": 10.0, "raio": 0.42, "vida": 2.0, "alcance": 20.0, "boom": 2.6, "cor": Color(0.75, 0.55, 0.2), "arte": "arretado", "txt": "Acorde pesado que estoura numa área grande."},
	# Carimbó
	"carimbo":     {"nome": "Carimbó", "build": "carimbo", "tipo": "ring", "dmg": 19.0, "cd": 1.0, "raio": 3.0, "knock": 1.3, "arte": "arretado", "txt": "Giro de carimbó: empurra todo mundo em volta."},
	"banda_couro": {"nome": "Banda de Couro", "build": "carimbo", "tipo": "arco", "dmg": 25.0, "cd": 1.3, "raio": 3.4, "ang": 1.5, "knock": 1.1, "arte": "arretado", "txt": "Tapa no couro do tambor, na direção do bicho mais perto."},
	"pisada_forte":{"nome": "Pisada Forte", "build": "carimbo", "tipo": "onda", "dmg": 16.0, "cd": 2.6, "raio": 5.2, "knock": 2.0, "arte": "arretado", "txt": "Pisada forte que sacode o chão e afasta a bicharada."},
	# Forró
	"pandeirao":     {"nome": "Pandeirão", "build": "forro", "tipo": "ring", "dmg": 19.0, "cd": 1.0, "raio": 3.0, "knock": 1.2, "arte": "arretado", "txt": "Giro de pandeiro: acerta e empurra todo mundo em volta."},
	"coco_embolada": {"nome": "Coco de Embolada", "build": "forro", "tipo": "onda", "dmg": 16.0, "cd": 2.8, "raio": 5.3, "knock": 1.9, "arte": "arretado", "txt": "Verso cantado rápido: onda que afasta a bicharada."},
	"baiao_rapido":  {"nome": "Baião Rápido", "build": "forro", "tipo": "arco", "dmg": 25.0, "cd": 1.1, "raio": 3.2, "ang": 1.6, "knock": 1.1, "arte": "arretado", "txt": "Passo rápido de baião na direção do bicho mais perto."},
	# Capoeira Angola
	"cocorinha":     {"nome": "Cocorinha", "build": "angola", "tipo": "ring", "dmg": 22.0, "cd": 1.2, "raio": 2.9, "stun": 0.7, "knock": 0.6, "arte": "arretado", "txt": "Agacha e varre baixo: atordoa quem chega perto."},
	"cabecada":      {"nome": "Cabeçada", "build": "angola", "tipo": "investida", "dmg": 32.0, "cd": 1.6, "raio": 1.6, "alcance": 6.5, "stun": 1.3, "arte": "arretado", "txt": "Investe de cabeça baixa no bicho mais perto e atordoa."},
	"negativa":      {"nome": "Negativa", "build": "angola", "tipo": "onda", "dmg": 17.0, "cd": 2.9, "raio": 5.5, "knock": 2.1, "arte": "arretado", "txt": "Esquiva rasteira que sacode e empurra tudo em volta."},
	# Marujo
	"rede_pesca":    {"nome": "Rede de Pesca", "build": "maruja", "tipo": "ring", "dmg": 21.0, "cd": 1.15, "raio": 3.2, "knock": 1.0, "arte": "arretado", "txt": "Lança a rede em volta, prende e machuca a bicharada."},
	"mare_cheia":    {"nome": "Maré Cheia", "build": "maruja", "tipo": "onda", "dmg": 17.0, "cd": 2.8, "raio": 5.6, "knock": 2.3, "arte": "arretado", "txt": "Onda de maré que empurra tudo para longe."},
	"canto_mar":     {"nome": "Canto do Mar", "build": "maruja", "tipo": "proj_teleguiado", "dmg": 17.0, "cd": 1.2, "vel": 11.0, "raio": 0.42, "vida": 3.3, "alcance": 25.0, "boom": 1.4, "cor": Color(0.3, 0.55, 0.85), "arte": "arretado", "txt": "Nota que ecoa n'água e persegue o bicho até estourar."},
}

# Dano do golpe no nível atual (sobe 25% por nível acima do 1).
static func dano_golpe(id: String, nivel: int) -> float:
	return GOLPES[id]["dmg"] * (1.0 + 0.25 * (nivel - 1))
static func cd_golpe(id: String, nivel: int, atk_speed: float) -> float:
	return maxf(0.25, GOLPES[id]["cd"] * (1.0 - 0.04 * (nivel - 1)) / atk_speed)

const NIVEL_MAX := 8

# Cartas de atributo (valem para qualquer classe). "v" é o valor na raridade comum.
const STATS := {
	"dano":       {"nome": "Mão Pesada",      "v": 0.10, "txt": "+%d%% de dano", "pct": true, "arte": "t_forca"},
	"vida":       {"nome": "Sustança",        "v": 20.0, "txt": "+%d de vida máxima", "pct": false, "arte": "t_folego"},
	"velocidade": {"nome": "Pé Ligeiro",      "v": 0.06, "txt": "+%d%% de velocidade", "pct": true, "arte": "t_pernas"},
	"ataque":     {"nome": "Sangue Quente",   "v": 0.08, "txt": "+%d%% de velocidade de ataque", "pct": true, "arte": "t_raio"},
	"critico":    {"nome": "Olho de Cobra",   "v": 0.06, "txt": "+%d%% de chance de crítico", "pct": true, "arte": "t_mira"},
	"critdano":   {"nome": "Peixeira Amolada","v": 0.30, "txt": "+%d%% de dano crítico", "pct": true, "arte": "amolada"},
	"armadura":   {"nome": "Couro Curtido",   "v": 0.04, "txt": "-%d%% de dano recebido", "pct": true, "arte": "t_couro"},
	"regen":      {"nome": "Chá de Boldo",    "v": 0.5,  "txt": "+%.1f de vida por segundo", "pct": false, "arte": "i_cha"},
	"ima":        {"nome": "Chama Vaga-Lume", "v": 0.25, "txt": "+%d%% de alcance para pegar XP", "pct": true, "arte": "estrela"},
	"area":       {"nome": "Roda Grande",     "v": 0.08, "txt": "+%d%% de área dos golpes", "pct": true, "arte": "atabaque"},
	"vermes":     {"nome": "Vermes que Comem Carne", "v": 0.4, "txt": "Cura %.1f de vida a cada bicho derrubado", "pct": false, "arte": "arretado"},
	"pulo":       {"nome": "Pulo do Saci",    "v": 1.0, "txt": "+%d pulo no ar", "pct": false, "arte": "chinelo", "fixo": true},
}

const RARIDADES := [
	{"nome": "Comum",    "peso": 59.0, "mult": 1.0, "cor": Color(0.92, 0.9, 0.82)},
	{"nome": "Incomum",  "peso": 25.0, "mult": 1.5, "cor": Color(0.45, 0.85, 0.4)},
	{"nome": "Rara",     "peso": 10.0, "mult": 2.0, "cor": Color(0.35, 0.65, 1.0)},
	{"nome": "Épica",    "peso": 4.0,  "mult": 3.0, "cor": Color(0.75, 0.45, 1.0)},
	{"nome": "Lendária", "peso": 1.0,  "mult": 5.0, "cor": Color(1.0, 0.75, 0.15)},
	# roubada de propósito: 1 carta em cada 100
	{"nome": "MÍTICA",   "peso": 1.0,  "mult": 12.0, "cor": Color(1.0, 0.25, 0.35)},
]

static func sortear_raridade() -> int:
	var r := randf() * 100.0
	for i in range(RARIDADES.size()):
		r -= RARIDADES[i]["peso"]
		if r <= 0.0: return i
	return 0

# Crítico: vale para todas as classes. Chance acima de 100% vira crítico em dobro (e em triplo acima de 200%):
# cada degrau multiplica de novo pelo dano crítico — é daí que saem os números absurdos.
const CRIT_BASE := 0.05
const CRIT_DANO := 2.0
const CRIT_NOMES := ["", "CRÍTICO", "CRÍTICO DUPLO", "CRÍTICO TRIPLO"]

# Especial (Q, com recarga) e ultimate (R, carrega com abates) de cada classe.
const HABILIDADES := {
	"capoeirista": {"q": {"nome": "Aú", "cd": 8.0, "txt": "estrela giratória: acerta em volta e fica intocável"},
		"r": {"nome": "Roda de Capoeira", "dur": 6.0, "txt": "6 s girando sem parar, com a guarda fechada"}},
	"jiujitsu": {"q": {"nome": "Mata-Leão", "cd": 9.0, "txt": "agarra o bicho mais forte por perto; cura se finalizar"},
		"r": {"nome": "Finalização!", "dur": 2.4, "txt": "salta de bicho em bicho finalizando, intocável"}},
	"benzedeira": {"q": {"nome": "Benção", "cd": 12.0, "txt": "cura 30% da vida e empurra tudo para longe"},
		"r": {"nome": "Chuva de Fogo-Fátuo", "dur": 4.0, "txt": "4 s soltando fogos teleguiados sem parar"}},
	"cangaceiro": {"q": {"nome": "Tiro Certeiro", "cd": 7.0, "txt": "um tiro crítico que atravessa tudo"},
		"r": {"nome": "Bando de Lampião", "dur": 5.0, "txt": "5 s atirando para todos os lados"}},
	"frevista": {"q": {"nome": "Parafuso Aéreo", "cd": 8.0, "txt": "gira no ar feito pião, intocável, e acerta todo mundo em volta"},
		"r": {"nome": "Bloco de Carnaval", "dur": 5.0, "txt": "5 s dançando sem parar, batendo em quem chega perto"}},
	"cordelista": {"q": {"nome": "Mote Cortante", "cd": 7.0, "txt": "um verso certeiro que atravessa tudo"},
		"r": {"nome": "Cantoria Infinita", "dur": 5.0, "txt": "5 s soltando versos para todo lado"}},
	"sambista": {"q": {"nome": "Malandragem", "cd": 8.0, "txt": "giro de samba intocável que acerta todo mundo em volta"},
		"r": {"nome": "Roda de Samba", "dur": 6.0, "txt": "6 s girando sem parar, de pandeiro na mão"}},
	"maracatuzeiro": {"q": {"nome": "Chamada do Rei", "cd": 9.0, "txt": "agarra o bicho mais forte por perto e acerta com tudo"},
		"r": {"nome": "Batuque Real", "dur": 4.5, "txt": "4,5 s de tambor pesado acertando em volta sem parar"}},
	"violeiro": {"q": {"nome": "Ponteado Certeiro", "cd": 7.0, "txt": "uma nota afiada que atravessa tudo"},
		"r": {"nome": "Desafio de Viola", "dur": 5.0, "txt": "5 s soltando notas para todos os lados"}},
	"carimbozeiro": {"q": {"nome": "Giro de Carimbó", "cd": 8.0, "txt": "gira no ar, intocável, e acerta todo mundo em volta"},
		"r": {"nome": "Roda de Carimbó", "dur": 6.0, "txt": "6 s dançando sem parar, batendo em quem chega perto"}},
	"forrozeiro": {"q": {"nome": "Xote Veloz", "cd": 8.0, "txt": "giro de forró intocável que acerta todo mundo em volta"},
		"r": {"nome": "Arrasta-Pé", "dur": 6.0, "txt": "6 s dançando sem parar, de pandeiro na mão"}},
	"angoleiro": {"q": {"nome": "Rasteira de Mestre", "cd": 9.0, "txt": "agarra o bicho mais forte por perto e dá uma cabeçada"},
		"r": {"nome": "Roda de Angola", "dur": 4.5, "txt": "4,5 s de ginga baixa acertando em volta sem parar"}},
	"marujo": {"q": {"nome": "Rede Certeira", "cd": 7.0, "txt": "uma nota que atravessa tudo na frente"},
		"r": {"nome": "Canto da Maré", "dur": 5.0, "txt": "5 s soltando notas para todos os lados"}},
}
const ULT_ABATES := 60          # abates para carregar o ultimate

# Fases: 10 minutos até o chefe; depois de vencer o chefe a fase vira infinita.
const CHEFE_T := 600.0
const FURIA_T := 180.0
const FASES := [
	{"nome": "Mata Atlântica", "chefe": "mapinguari", "chefe_nome": "MAPINGUARI", "chefe_titulo": "o Bocão da Mata", "mult": 1.0, "luz": 0},
	{"nome": "Noite de Lua Cheia", "chefe": "mula", "chefe_nome": "MULA SEM CABEÇA", "chefe_titulo": "a Desembestada", "mult": 1.7, "luz": 1},
	{"nome": "Queimada", "chefe": "boitata", "chefe_nome": "BOITATÁ", "chefe_titulo": "o Fogo que Corre", "mult": 2.6, "luz": 2},
	{"nome": "Corcovado", "chefe": "lobisomem", "ataque": "mula", "chefe_nome": "LOBISOMEM", "chefe_titulo": "o Sétimo Filho", "mult": 3.6, "luz": 3, "cristo": true},
	{"nome": "Pantanal", "chefe": "mapinguari", "chefe_nome": "MAPINGUARI DAS CHEIAS", "chefe_titulo": "o Fôlego do Pantanal", "mult": 4.8, "luz": 1},
	{"nome": "Caatinga em Chamas", "chefe": "boitata", "chefe_nome": "BOITATÁ DA SECA", "chefe_titulo": "o Fogo que Não Apaga", "mult": 6.2, "luz": 2},
	{"nome": "Serra da Cuca", "chefe": "cuca", "chefe_nome": "CUCA VELHA", "chefe_titulo": "a Que Não Dorme", "mult": 7.8, "luz": 3},
	{"nome": "Encruzilhada da Meia-Noite", "chefe": "mula", "chefe_nome": "MULA SEM CABEÇA", "chefe_titulo": "a Foragida", "mult": 9.6, "luz": 0},
	{"nome": "Chapada Diamantina", "chefe": "mapinguari", "chefe_nome": "MAPINGUARI DE PEDRA", "chefe_titulo": "o Gigante da Chapada", "mult": 11.6, "luz": 1},
	{"nome": "Rio São Francisco", "chefe": "boitata", "chefe_nome": "BOITATÁ DO VELHO CHICO", "chefe_titulo": "a Cobra do Rio", "mult": 13.8, "luz": 2},
	{"nome": "Ilha de Marajó", "chefe": "cuca", "chefe_nome": "CUCA DO MANGUEZAL", "chefe_titulo": "a Jacaré-Bruxa", "mult": 16.2, "luz": 3},
	{"nome": "Lençóis Maranhenses", "chefe": "mula", "chefe_nome": "MULA DAS DUNAS", "chefe_titulo": "a Desembestada do Deserto", "mult": 18.8, "luz": 0},
	{"nome": "Pampa Gaúcho", "chefe": "mapinguari", "chefe_nome": "MAPINGUARI DO SUL", "chefe_titulo": "o Último Gigante", "mult": 21.6, "luz": 1},
	{"nome": "Serra do Mar", "chefe": "boitata", "chefe_nome": "BOITATÁ ANCESTRAL", "chefe_titulo": "a Chama Mais Velha", "mult": 24.6, "luz": 2},
	{"nome": "Coração da Amazônia", "chefe": "minhocao", "chefe_nome": "MINHOCÃO", "chefe_titulo": "o Verme que Move Montanhas", "mult": 28.6, "luz": 1, "final": true},
]

# Melhorias permanentes, compradas com moedas no arraial (fora da fase).
const MELHORIAS := {
	"dano":       {"nome": "Mão Calejada",     "txt": "+5% de dano",       "custo": 40, "max": 10, "arte": "t_forca"},
	"vida":       {"nome": "Feijão com Arroz", "txt": "+12 de vida",       "custo": 40, "max": 10, "arte": "feijoada"},
	"critico":    {"nome": "Olho Vivo",        "txt": "+2% de chance de crítico", "custo": 50, "max": 10, "arte": "t_mira"},
	"velocidade": {"nome": "Sandália Boa",     "txt": "+2% de velocidade", "custo": 50, "max": 5, "arte": "chinelo"},
	"xp":         {"nome": "Sabedoria de Vó",  "txt": "+6% de XP",         "custo": 60, "max": 5, "arte": "t_estudo"},
	"moedas":     {"nome": "Mão de Feirante",  "txt": "+10% de moedas",    "custo": 60, "max": 5, "arte": "t_mesada"},
	"ima":        {"nome": "Lamparina",        "txt": "+10% de alcance de XP", "custo": 40, "max": 5, "arte": "estrela"},
}
static func custo_melhoria(id: String, nivel: int) -> int:
	return int(MELHORIAS[id]["custo"]) * (nivel + 1)

# Sequência de abates: a cada marca sai um grito e umas moedas.
const COMBO_GRITOS := {25: "ARRETADO!", 50: "VIXE MARIA!", 100: "EITA PREULA!", 200: "OXENTE, É O CÃO!", 400: "LAMPIÃO TÁ VENDO!", 800: "VIROU LENDA!"}

# Feitos: metas que pagam moedas (contadores ficam no save). Mais tarde também liberam personagens.
const FEITOS := [
	{"id": "abates1", "nome": "Limpa-Mata", "txt": "Derrube 500 bichos", "c": "abates", "meta": 500, "premio": 40},
	{"id": "abates2", "nome": "Terror da Bicharada", "txt": "Derrube 5.000 bichos", "c": "abates", "meta": 5000, "premio": 150},
	{"id": "saci", "nome": "Caçador de Saci", "txt": "Derrube 150 sacis", "c": "abates_saci", "meta": 150, "premio": 50},
	{"id": "lobis", "nome": "Bala de Prata", "txt": "Derrube 100 lobisomens", "c": "abates_lobisomem", "meta": 100, "premio": 80},
	{"id": "cuca", "nome": "A Cuca Não Pega", "txt": "Vença a Cuca 3 vezes", "c": "abates_cuca", "meta": 3, "premio": 120},
	{"id": "caipora", "nome": "Amansa Caipora", "txt": "Derrube 300 caiporas", "c": "abates_caipora", "meta": 300, "premio": 50},
	{"id": "chefe1", "nome": "Valente", "txt": "Vença um chefe", "c": "chefes", "meta": 1, "premio": 80},
	{"id": "chefe5", "nome": "Cabra da Peste", "txt": "Vença 5 chefes", "c": "chefes", "meta": 5, "premio": 200},
	{"id": "kimura", "nome": "Rumo à Faixa Preta", "txt": "Aplique 150 kimuras", "c": "uso_kimura", "meta": 150, "premio": 60},
	{"id": "armada", "nome": "Mestre de Roda", "txt": "Solte 300 armadas", "c": "uso_armada", "meta": 300, "premio": 60},
	{"id": "bau", "nome": "Caça-Tesouro", "txt": "Abra 20 baús", "c": "baus", "meta": 20, "premio": 60},
	{"id": "oratorio", "nome": "Devoto", "txt": "Receba 10 bençãos de oratório", "c": "oratorios", "meta": 10, "premio": 60},
	{"id": "critico", "nome": "Mão Certeira", "txt": "Acerte 1.000 críticos", "c": "criticos", "meta": 1000, "premio": 70},
	{"id": "combo", "nome": "Eita Preula!", "txt": "Faça uma sequência de 100 abates", "c": "combo_max", "meta": 100, "premio": 100},
]
static func feitos_prontos() -> int:
	var n := 0
	for f in FEITOS:
		if not Salvo.d["feitos"].has(f["id"]) and int(Salvo.d["contadores"].get(f["c"], 0)) >= int(f["meta"]): n += 1
	return n

# Frase de rodapé das cartas (a piada do folheto).
const PIADAS := {
	"vermes": "Machado de Assis que o diga.", "pulo": "Com uma perna só ele já pulava assim.",
	"dano": "Quem bate esquece. Quem apanha, não.", "vida": "Saco vazio não para em pé.",
	"velocidade": "Deus ajuda quem cedo madruga. E quem corre.", "ataque": "Devagar se vai ao longe. Mas quem tem tempo?",
	"critico": "Um olho no peixe, outro no gato.", "critdano": "Em casa de ferreiro, a faca é das boas.",
	"armadura": "Gato escaldado tem medo de água fria.", "regen": "Receita de vó não tem bula.",
	"ima": "Vaga-lume não tem conta de luz.", "area": "Onde come um, comem dez.",
	"armada": "Quem não pode com mandinga não carrega patuá.", "meialua": "A lua é meia, o chute é inteiro.",
	"rasteira": "Quanto maior o bicho, maior o tombo.", "berimbau": "Um arame, uma cabaça e muito respeito.",
	"kimura": "Bate três vezes que eu solto. Talvez.", "queda": "A baiana tem o quê? Tem queda, viu.",
	"raspagem": "Por baixo também se ganha.", "fogofatuo": "Nem toda luz no fim do túnel é boa notícia.",
	"garrafada": "Se não curar, pelo menos estoura.", "reza": "Fé em Deus e pé na tábua.",
	"peixeira": "Conversa fiada não corta nada.", "bacamarte": "Mirar pra quê?", "rifle": "Papo reto, bala reta.",
	"batucada": "Quem não tem ginga, enche o pandeiro.", "sapateado": "Pé no chão e coração no alto.",
	"pandeirada": "Bateu, levou — e ainda dançou.", "alfaia": "Tambor que não erra o tom.",
	"calunga": "Boneca que carrega rei e rainha.", "cortejo": "Corte real não pede licença.",
	"dedilhado": "Corda de aço, dedo calejado.", "caterete": "Desafio na viola, ninguém leva desaforo.",
	"toada": "Toada boa dói de bonito.", "carimbo": "Quem carimba não erra o passo.",
	"banda_couro": "Couro bom aguenta o tranco.", "pisada_forte": "Pisa forte quem tem raiz.",
	"pandeirao": "Pandeiro bom não erra o tom.", "coco_embolada": "Embolou, não desemola fácil.",
	"baiao_rapido": "Baião que é bom não para quieto.", "cocorinha": "Quem se abaixa, escapa.",
	"cabecada": "Na cabeça é que a ideia bate.", "negativa": "Na negativa é que mora a manha.",
	"rede_pesca": "Rede bem lançada não volta vazia.", "mare_cheia": "Maré cheia não espera ninguém.",
	"canto_mar": "Canto do mar, ninguém esquece.",
}

# Bodega do Lampião: o que se compra com as moedas da partida.
const LOJA := [
	{"id": "carta", "nome": "Folheto de Contrabando", "txt": "Escolha 1 entre 3 cartas — todas épicas ou melhores.", "preco": 40, "sobe": 25},
	{"id": "troca", "nome": "Troca-Troca", "txt": "Entrega todas as suas cartas de atributo e recebe o mesmo tanto, sorteadas de novo.", "preco": 25, "sobe": 15},
	{"id": "amolar", "nome": "Amolar o Golpe", "txt": "+1 nível no seu golpe mais fraco.", "preco": 35, "sobe": 20},
	{"id": "cura", "nome": "Rapadura", "txt": "Enche a vida inteira.", "preco": 15, "sobe": 10},
	{"id": "ima", "nome": "Lamparina Acesa", "txt": "Puxa todos os vaga-lumes (XP) do mapa.", "preco": 10, "sobe": 5},
	{"id": "pacto", "nome": "Pacto do Cangaço", "txt": "+40% de dano para sempre nesta partida, mas perde 25% da vida máxima. Só uma vez.", "preco": 0, "sobe": 0},
]

# Bicharada comum. "desde" = segundo da fase em que começa a aparecer; "peso" = chance no sorteio.
const BICHOS := {
	"caipora":   {"nome": "Caipora",    "hp": 16.0, "vel": 2.3, "dano": 1.0, "xp": 1.0, "desde": 0.0,   "peso": 6.0, "esc": 1.0},
	"saci":      {"nome": "Saci",       "hp": 11.0, "vel": 3.4, "dano": 1.0, "xp": 1.0, "desde": 0.0,   "peso": 4.0, "esc": 1.0},
	"curupira":  {"nome": "Curupira",   "hp": 14.0, "vel": 4.0, "dano": 1.1, "xp": 1.5, "desde": 80.0,  "peso": 3.0, "esc": 0.95},
	"corposeco": {"nome": "Corpo-Seco", "hp": 48.0, "vel": 1.5, "dano": 1.4, "xp": 3.0, "desde": 170.0, "peso": 2.0, "esc": 1.25},
	"iara":      {"nome": "Iara",       "hp": 18.0, "vel": 2.4, "dano": 1.0, "xp": 2.0, "desde": 260.0, "peso": 2.0, "esc": 1.05},
	"lobisomem": {"nome": "Lobisomem",  "hp": 32.0, "vel": 2.9, "dano": 1.3, "xp": 3.0, "desde": 350.0, "peso": 2.0, "esc": 1.2},
	"boto":      {"nome": "Boto",       "hp": 24.0, "vel": 3.5, "dano": 1.2, "xp": 2.0, "desde": 440.0, "peso": 2.0, "esc": 1.05},
}
static func sortear_bicho(t: float, fase: int) -> String:
	var total := 0.0
	for k in BICHOS:
		if t >= BICHOS[k]["desde"] or (fase == 1 and k == "lobisomem") or (fase == 2 and k == "corposeco"): total += BICHOS[k]["peso"]
	var r := randf() * total
	for k in BICHOS:
		if t >= BICHOS[k]["desde"] or (fase == 1 and k == "lobisomem") or (fase == 2 and k == "corposeco"):
			r -= BICHOS[k]["peso"]
			if r <= 0.0: return k
	return "caipora"

# Ficha de apresentação: aparece na primeira vez que a criatura surge (quem é de fora do Brasil não conhece).
# "jeito" conta como ela se comporta no jogo. Tudo aqui vai para a tradução depois.
const LORE := {
	"caipora": {"nome": "Caipora", "de": "Lenda tupi, do Brasil inteiro",
		"txt": "Protetora dos bichos da mata. Persegue caçador que mata por maldade ou mais do que precisa, e faz o sujeito se perder na floresta. Dizem que se acalma com fumo de corda deixado num toco.",
		"jeito": "Vem em bando, devagar e sempre."},
	"saci": {"nome": "Saci-Pererê", "de": "Lenda do Sul e Sudeste",
		"txt": "Moleque de uma perna só, gorro vermelho e cachimbo, que viaja dentro de redemoinhos. Vive de aprontar: azeda o leite, esconde objetos, dá nó em crina de cavalo. Quem pega o gorro dele manda no Saci.",
		"jeito": "Rápido e frágil; chega pulando."},
	"curupira": {"nome": "Curupira", "de": "Um dos mitos mais antigos do Brasil, registrado em 1560",
		"txt": "Menino de cabelo de fogo com os pés virados para trás. As pegadas ao contrário enganam quem tenta segui-lo: o caçador acha que ele foi embora quando, na verdade, está chegando.",
		"jeito": "O mais veloz da mata."},
	"corposeco": {"nome": "Corpo-Seco", "de": "Assombração do interior de São Paulo e Minas",
		"txt": "Homem tão ruim em vida que, quando morreu, nem o céu, nem o inferno, nem a própria terra quiseram ficar com ele. O corpo ressecou e saiu vagando pelas estradas atrás de quem passa.",
		"jeito": "Lento, mas aguenta muita pancada e bate forte."},
	"iara": {"nome": "Iara", "de": "A mãe-d'água dos rios da Amazônia",
		"txt": "Metade mulher, metade peixe. Canta tão bonito que o pescador larga a canoa e entra no rio atrás dela, para nunca mais voltar. Quem escapa, dizem, fica de juízo fraco.",
		"jeito": "Não chega perto: fica de longe atirando água."},
	"lobisomem": {"nome": "Lobisomem", "de": "Veio com os portugueses e pegou no sertão",
		"txt": "No Brasil, a sina cai no sétimo filho homem de uma família. Em noite de sexta-feira de lua cheia ele vira lobo numa encruzilhada e corre sete cemitérios antes de o galo cantar.",
		"jeito": "Forte, e de tempos em tempos dá um bote."},
	"boto": {"nome": "Boto", "de": "Lenda dos rios da Amazônia",
		"txt": "O boto-cor-de-rosa que, nas noites de festa junina, sai do rio em forma de moço bem-vestido. Dança, encanta as moças e some antes do sol nascer. Nunca tira o chapéu: é ele que esconde o furo no alto da cabeça.",
		"jeito": "Chega dançando de lado, difícil de acertar."},
	"cuca": {"nome": "Cuca", "de": "Bicho-papão das cantigas de ninar",
		"txt": "Bruxa velha com cara de jacaré que leva embora criança que não quer dormir. \"Nana, neném, que a Cuca vem pegar\" — todo brasileiro já ouviu essa. Dizem que ela só dorme uma noite a cada sete anos.",
		"jeito": "Mini-chefe: espalha poções para todo lado. Vencê-la rende tesouro."},
	"mapinguari": {"nome": "Mapinguari", "de": "O terror dos seringais da Amazônia",
		"txt": "Gigante peludo de um olho só, com a boca na barriga e um fedor que derruba caçador. Bala não atravessa o couro dele. Há quem diga que a lenda nasceu da lembrança das preguiças-gigantes.",
		"jeito": "Chefe: o pisão dele estoura em volta. Pule na hora certa."},
	"mula": {"nome": "Mula sem Cabeça", "de": "Assombração de todo o interior do Brasil",
		"txt": "Mulher amaldiçoada que, na noite de quinta para sexta, vira uma mula que solta fogo no lugar da cabeça e galopa por sete povoados. O tropel dos cascos de ferro se ouve de longe.",
		"jeito": "Chefe: dispara em linha reta. Saia da frente."},
	"boitata": {"nome": "Boitatá", "de": "A cobra de fogo — primeiro mito escrito no Brasil, em 1560",
		"txt": "Cobra enorme feita de fogo que protege os campos de quem põe queimada. Sobreviveu a um grande dilúvio comendo os olhos dos bichos mortos, e de tanta luz que engoliu o corpo dela acendeu.",
		"jeito": "Chefe: cospe bolas de fogo em leque."},
	"minhocao": {"nome": "Minhocão", "de": "Avistado de verdade em jornais do interior de SP e PR, no século 19",
		"txt": "Verme gigante de couro grosso que mora bem fundo na terra. Abre buracos enormes nas margens de rio, derruba árvores e engole o chão por onde passa. Diz a lenda que, quando ele se move de verdade, a terra inteira estremece.",
		"jeito": "Chefão final: alterna pisão que estremece tudo e arrancada por baixo da terra; enfurecido, também cospe fogo de dentro do buraco."},
}

# Gente que aparece pelo mapa para AJUDAR (não são bichos: ninguém bate neles). Cada partida sorteia três.
# "falas": o que a pessoa diz no balão; troca a cada encontro. "vez": só uma vez por partida. "sobe": quanto o preço sobe.
const NPCS := {
	"zepilintra": {"nome": "Seu Zé Pilintra", "de": "Entidade da Umbanda e do Catimbó", "lugar": "MESA DO\nSEU ZÉ",
		"txt": "O malandro de terno branco e chapéu de lado. Protetor de quem vive na rua, nos bares e na boemia; boa-praça, bom de conversa e de jogo.",
		"falas": ["Chegou na hora boa, moço. Senta aí que a noite é uma criança.", "Malandro que é malandro não corre: desvia.",
			"Dinheiro vai e vem. O que não pode ir embora é a palavra.", "Quem anda comigo não anda só. Mas também não anda errado.",
			"Sorte é coragem de terno passado."],
		"itens": [
			{"id": "dados", "nome": "Jogo de Dados", "txt": "Aposta ◉ 20. Metade das vezes você leva ◉ 50 de volta.", "preco": 20},
			{"id": "guarda", "nome": "Guarda do Malandro", "txt": "Quando você cair, Seu Zé te levanta com metade da vida.", "preco": 60, "vez": true},
			{"id": "gole", "nome": "Um Gole e um Conselho", "txt": "Recupera 35% da vida.", "preco": 0, "vez": true},
		]},
	"pombagira": {"nome": "Pomba Gira", "de": "Entidade da Umbanda e da Quimbanda", "lugar": "ENCRUZILHADA",
		"txt": "Senhora das encruzilhadas, dona dos caminhos, do amor e da própria vontade. Abre caminho para quem chega com respeito e cobra de quem promete e não cumpre.",
		"falas": ["Chegou na encruzilhada? Então escolhe, meu bem. Ficar parado é que não dá.", "Caminho fechado eu abro. Promessa quebrada eu cobro.",
			"Quem se dá valor não pede licença para passar.", "Gargalhada espanta mais quebranto que muita cara fechada.",
			"Todo caminho tem preço. O meu, pelo menos, eu aviso antes."],
		"itens": [
			{"id": "caminho", "nome": "Abre-Caminho", "txt": "Escolha 1 entre 3 cartas lendárias ou míticas. Em troca, a bicharada fica 15% mais forte até o fim.", "preco": 0, "vez": true},
			{"id": "rosa", "nome": "Rosa Vermelha", "txt": "+10% de chance de crítico e +30% de dano crítico.", "preco": 30, "vez": true},
			{"id": "pomba", "nome": "Pomba Girando", "txt": "Uma pomba branca fica girando à sua volta e bica quem chegar perto. Até 4.", "preco": 25, "sobe": 15},
		]},
	"pretovelho": {"nome": "Preto Velho", "de": "Entidade da Umbanda", "lugar": "BANQUINHO DO\nPRETO VELHO",
		"txt": "O espírito dos velhos sábios africanos escravizados no Brasil. Fala manso, fuma cachimbo no seu banquinho e cura com reza, erva e paciência. Ninguém sai de perto dele do mesmo jeito que chegou.",
		"falas": ["Senta aqui, meu filho. Pressa nunca chegou cedo em lugar nenhum.", "Quem carrega muita raiva anda de costas curvadas.",
			"Devagar com o andor, que o santo é de barro.", "Nêgo véio já viu muita lua. Essa aí também passa.",
			"Erva boa, reza curta e coração limpo. O resto é enfeite."],
		"itens": [
			{"id": "benzer", "nome": "Benzimento", "txt": "+1,5 de vida por segundo até o fim da partida.", "preco": 25, "vez": true},
			{"id": "conselho", "nome": "Conselho de Vô", "txt": "Sobe um nível na hora.", "preco": 0, "vez": true},
			{"id": "arruda", "nome": "Arruda Atrás da Orelha", "txt": "-10% de dano recebido.", "preco": 30, "vez": true},
		]},
	"baiana": {"nome": "Baiana do Acarajé", "de": "Tabuleiro das ruas de Salvador", "lugar": "TABULEIRO\nDA BAIANA",
		"txt": "De saia rodada, torço e colares, frita o acarajé no dendê ali na hora. O ofício das baianas é patrimônio cultural do Brasil — e o \"quente\" quer dizer com pimenta.",
		"falas": ["Vai querer quente ou frio, meu rei?", "Dendê é que nem coragem: na medida certa, levanta defunto.",
			"Aqui ninguém briga de barriga vazia, não.", "Oxente, tá magro! Come mais um.", "Tabuleiro arrumado, freguês abençoado."],
		"itens": [
			{"id": "quente", "nome": "Acarajé Quente", "txt": "Cura metade da vida e dá +10% de dano. A pimenta é por sua conta.", "preco": 25, "sobe": 15},
			{"id": "frio", "nome": "Acarajé Frio", "txt": "Cura metade da vida.", "preco": 10, "sobe": 5},
			{"id": "cocada", "nome": "Cocada", "txt": "+25 de vida máxima.", "preco": 25, "sobe": 10},
		]},
	"repentista": {"nome": "Zé do Repente", "de": "Cantador de viola das feiras do sertão", "lugar": "CANTORIA",
		"txt": "O repentista improvisa verso na hora, em desafio com outro cantador, e quem gaguejar perde. É dessa peleja de versos que nasceram os folhetos de cordel que dão nome a este jogo.",
		"falas": ["Me dê um mote, cabra, que eu lhe devolvo uma glosa!", "Viola afinada e língua afiada: foi o que eu trouxe de casa.",
			"Quem não sabe rimar apanha calado.", "Já pelejei com o Cão num desafio. Empatamos.", "Verso bom é que nem faca: curto e chega ligeiro."],
		"itens": [
			{"id": "folheto", "nome": "Folheto Novo", "txt": "Escolha 1 entre 3 cartas raras ou melhores.", "preco": 30, "sobe": 20},
			{"id": "verso", "nome": "Verso Ligeiro", "txt": "+15% de velocidade de ataque.", "preco": 30, "vez": true},
			{"id": "mote", "nome": "Mudar o Mote", "txt": "Entrega suas cartas de atributo e recebe o mesmo tanto, sorteadas de novo.", "preco": 15, "sobe": 10},
		]},
	"vaqueiro": {"nome": "Vaqueiro Aboiador", "de": "O encourado da caatinga", "lugar": "RANCHO DO\nVAQUEIRO",
		"txt": "Vestido de couro da cabeça aos pés para furar a caatinga de espinho atrás do gado. O aboio é o canto comprido, sem palavra, com que ele chama a boiada de longe.",
		"falas": ["Êêê, boi! ...Desculpe, é o costume.", "No meio do espinho, quem não tem couro deixa o couro.",
			"Boi brabo se pega é na carreira, não na conversa.", "O sertanejo é, antes de tudo, um forte. Li isso num livro.",
			"Chuva no sertão e sorte no jogo: quando vem, aproveite."],
		"itens": [
			{"id": "gibao", "nome": "Gibão de Couro", "txt": "-12% de dano recebido.", "preco": 35, "vez": true},
			{"id": "aboio", "nome": "Aboio", "txt": "Chama todos os vaga-lumes (XP) do mapa para você.", "preco": 15, "sobe": 5},
			{"id": "espora", "nome": "Espora", "txt": "+12% de velocidade.", "preco": 30, "vez": true},
		]},
}

# Poderes temporários: derrubar certos bichos fortes faz o herói "virar" o bicho por alguns segundos.
const PODERES := {
	"mula":      {"nome": "VOCÊ VIROU A MULA SEM CABEÇA!", "txt": "Corra: o fogo fica por onde você passa", "dur": 14.0, "cor": Color(1.0, 0.45, 0.1)},
	"lobisomem": {"nome": "FÚRIA DO LOBISOMEM", "txt": "Seus golpes saem duas vezes mais rápido", "dur": 12.0, "cor": Color(0.7, 0.7, 0.9)},
	"iara":      {"nome": "CANTO DA IARA", "txt": "Quem chega perto fica encantado e para", "dur": 10.0, "cor": Color(0.3, 0.9, 0.85)},
	"curupira":  {"nome": "PÉ DE CURUPIRA", "txt": "Muito mais veloz, e a arrancada não tem espera", "dur": 12.0, "cor": Color(1.0, 0.6, 0.1)},
	"saci":      {"nome": "REDEMOINHO DO SACI", "txt": "Um redemoinho gira em volta de você", "dur": 12.0, "cor": Color(0.9, 0.2, 0.15)},
	"boto":      {"nome": "ENCANTO DO BOTO", "txt": "XP em dobro e todos os vaga-lumes vêm até você", "dur": 12.0, "cor": Color(1.0, 0.6, 0.75)},
	"corposeco": {"nome": "COURO DE CORPO-SECO", "txt": "Por alguns segundos nada te fere", "dur": 8.0, "cor": Color(0.85, 0.82, 0.65)},
	"caipora":   {"nome": "PROTEGIDO DA MATA", "txt": "A vida volta sozinha", "dur": 12.0, "cor": Color(0.3, 0.85, 0.3)},
}
