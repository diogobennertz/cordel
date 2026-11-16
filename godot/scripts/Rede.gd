extends Node
# Rede: a base do co-op por LAN (rede local), até 5 pessoas — 1 anfitrião + 4 convidados.
# Autoload (acessa-se por "Rede" de qualquer script). Usa o sistema de multiplayer de alto nível do Godot (ENet).
#
# ESTADO DE VERDADE (pra não enganar ninguém): isso aqui já conecta de verdade — bicho, chefe (de fase e a Cuca
# do portal), mapa (pote/baú/oratório/loja/portal/gente), dano, XP e moeda já são compartilhados de verdade
# (autoridade do anfitrião, ver World.gd). O que AINDA NÃO FOI FEITO: a carta de nível de cada um não aparece
# visualmente pro parceiro (hoje cada um ainda sobe sozinho, sem avisar o outro — funciona, só não é visto).

const PORTA := 7777
const MAX_JOGADORES := 5     # contando o anfitrião
const PORTA_DESCOBERTA := 7778   # UDP à parte, só pra anunciar/achar mundo hospedado na rede local

var _udp_escuta: PacketPeerUDP    # sempre ligado: escuta quem está anunciando mundo na rede
var _udp_anuncio: PacketPeerUDP  # só quando eu sou o anfitrião: manda o anúncio
var _anuncio_t := 0.0
var _nome_mundo_host := ""
var mundos_vistos := {}          # ip (String) -> {"nome": String, "visto": float}
signal mundos_mudaram()

var heroi_por_id := {}       # peer_id (int) -> id da classe escolhida por essa pessoa
var nome_por_id := {}        # peer_id (int) -> nome que a pessoa digitou
var _ligado := false         # o Godot sempre bota um "OfflineMultiplayerPeer" por padrão, então
                              # não dá pra usar "multiplayer_peer != null" pra saber se o co-op tá de verdade ligado

signal entrou(id: int)
signal saiu(id: int)
signal partida_comecou()
signal falhou(motivo: String)

func _ready() -> void:
	multiplayer.peer_connected.connect(func(id):
		entrou.emit(id)
		if sou_host(): _mandar_mundo.rpc_id(id, Salvo.d))     # novo convidado: recebe o progresso deste mundo emprestado
	multiplayer.peer_disconnected.connect(func(id):
		heroi_por_id.erase(id); nome_por_id.erase(id); saiu.emit(id))
	multiplayer.connection_failed.connect(func(): _ligado = false; Salvo.sair_mundo(); falhou.emit("Não consegui conectar. Confira o endereço e se os dois estão na mesma rede."))
	multiplayer.server_disconnected.connect(func(): _ligado = false; Salvo.sair_mundo(); falhou.emit("O anfitrião saiu da sala."))
	_udp_escuta = PacketPeerUDP.new()
	if _udp_escuta.bind(PORTA_DESCOBERTA) != OK: _udp_escuta = null   # porta já em uso (ex.: 2 instâncias no mesmo PC) — sem problema, só não descobre sozinho

func _process(delta: float) -> void:
	if ativo() and sou_host():
		_anuncio_t -= delta
		if _anuncio_t <= 0.0: _anuncio_t = 1.5; _anunciar()
	_escutar_anuncios()
	var agora := Time.get_ticks_msec() / 1000.0
	for ip in mundos_vistos.keys().duplicate():
		if agora - mundos_vistos[ip]["visto"] > 4.0: mundos_vistos.erase(ip); mundos_mudaram.emit()

func _anunciar() -> void:
	if _udp_anuncio == null:
		_udp_anuncio = PacketPeerUDP.new()
		_udp_anuncio.set_broadcast_enabled(true)
		_udp_anuncio.set_dest_address("255.255.255.255", PORTA_DESCOBERTA)
	_udp_anuncio.put_packet(("CORDELAME_MUNDO:" + _nome_mundo_host).to_utf8_buffer())

func _escutar_anuncios() -> void:
	if _udp_escuta == null: return
	while _udp_escuta.get_available_packet_count() > 0:
		var pct := _udp_escuta.get_packet()
		var ip := _udp_escuta.get_packet_ip()
		var txt := pct.get_string_from_utf8()
		if txt.begins_with("CORDELAME_MUNDO:") and ip != "":
			var nome := txt.substr(17)
			var novo := not mundos_vistos.has(ip)
			mundos_vistos[ip] = {"nome": nome, "visto": Time.get_ticks_msec() / 1000.0}
			if novo: mundos_mudaram.emit()

@rpc("authority", "call_remote", "reliable")
func _mandar_mundo(dados: Dictionary) -> void:
	Salvo.entrar_mundo_visitante(dados)

func hospedar(nome_mundo: String) -> String:
	if nome_mundo.strip_edges() == "": return "Dê um nome para o seu mundo."
	var peer := ENetMultiplayerPeer.new()
	var erro := peer.create_server(PORTA, MAX_JOGADORES - 1)
	if erro != OK: return "Não consegui abrir a porta %d (erro %d). Outro programa já está usando ela?" % [PORTA, erro]
	multiplayer.multiplayer_peer = peer
	_ligado = true
	_nome_mundo_host = nome_mundo.strip_edges()
	Salvo.entrar_mundo(_nome_mundo_host)
	heroi_por_id.clear(); nome_por_id.clear()
	return ""

func entrar(ip: String) -> String:
	if ip.strip_edges() == "": return "Digite o endereço de quem hospedou."
	var peer := ENetMultiplayerPeer.new()
	var erro := peer.create_client(ip.strip_edges(), PORTA)
	if erro != OK: return "Endereço inválido."
	multiplayer.multiplayer_peer = peer
	_ligado = true
	heroi_por_id.clear(); nome_por_id.clear()
	return ""

func sair() -> void:
	if multiplayer.multiplayer_peer: multiplayer.multiplayer_peer.close()
	multiplayer.multiplayer_peer = null
	_ligado = false
	_nome_mundo_host = ""
	if _udp_anuncio: _udp_anuncio.close(); _udp_anuncio = null
	Salvo.sair_mundo()
	heroi_por_id.clear(); nome_por_id.clear()

func ativo() -> bool:
	return _ligado

func sou_host() -> bool:
	return ativo() and multiplayer.is_server()

func meu_id() -> int:
	return multiplayer.get_unique_id()

# todo mundo conectado (inclusive eu), sempre na mesma ordem em todas as máquinas
func ids() -> Array:
	if not ativo(): return [meu_id()]
	var r: Array = multiplayer.get_peers()
	r.append(meu_id())
	r.sort()
	return r

# endereços desta máquina na rede local (pra mostrar pro anfitrião passar pros amigos)
static func meus_enderecos() -> Array:
	var r := []
	for ip in IP.get_local_addresses():
		if ip.begins_with("192.168.") or ip.begins_with("10.") or ip.begins_with("172."):
			r.append(ip)
	return r

# mundos hospedados vistos agora na rede local, pra listar na tela de entrar em vez de pedir o IP na mão
func mundos_disponiveis() -> Array:
	var r := []
	for ip in mundos_vistos: r.append({"ip": ip, "nome": mundos_vistos[ip]["nome"]})
	r.sort_custom(func(a, b): return a["nome"] < b["nome"])
	return r

@rpc("any_peer", "call_local", "reliable")
func _apresentar(id: int, heroi: String, nome: String) -> void:
	heroi_por_id[id] = heroi
	nome_por_id[id] = nome if nome.strip_edges() != "" else ("Jogador %d" % (ids().find(id) + 1))

func apresentar_se(heroi: String, nome: String) -> void:
	_apresentar.rpc(meu_id(), heroi, nome)

@rpc("authority", "call_local", "reliable")
func _comecar() -> void:
	partida_comecou.emit()

# só o anfitrião manda começar, pra todo mundo ao mesmo tempo
func comecar() -> void:
	if sou_host(): _comecar.rpc()
