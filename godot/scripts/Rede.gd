extends Node
# Rede: a base do co-op por LAN (rede local), até 5 pessoas — 1 anfitrião + 4 convidados.
# Autoload (acessa-se por "Rede" de qualquer script). Usa o sistema de multiplayer de alto nível do Godot (ENet).
#
# ESTADO DE VERDADE (pra não enganar ninguém): isso aqui já conecta de verdade, já bota o boneco de cada pessoa
# andando junto no mesmo mapa, sincronizado pela rede. O que AINDA NÃO FOI FEITO: bicho, carta, baú, chefe, moeda —
# nada disso está em rede ainda. Hoje o co-op serve pra andar junto e ver todo mundo; o resto é o próximo passo.

const PORTA := 7777
const MAX_JOGADORES := 5     # contando o anfitrião

var heroi_por_id := {}       # peer_id (int) -> id da classe escolhida por essa pessoa
var nome_por_id := {}        # peer_id (int) -> nome que a pessoa digitou

signal entrou(id: int)
signal saiu(id: int)
signal partida_comecou()
signal falhou(motivo: String)

func _ready() -> void:
	multiplayer.peer_connected.connect(func(id): entrou.emit(id))
	multiplayer.peer_disconnected.connect(func(id):
		heroi_por_id.erase(id); nome_por_id.erase(id); saiu.emit(id))
	multiplayer.connection_failed.connect(func(): falhou.emit("Não consegui conectar. Confira o endereço e se os dois estão na mesma rede."))
	multiplayer.server_disconnected.connect(func(): falhou.emit("O anfitrião saiu da sala."))

func hospedar() -> String:
	var peer := ENetMultiplayerPeer.new()
	var erro := peer.create_server(PORTA, MAX_JOGADORES - 1)
	if erro != OK: return "Não consegui abrir a porta %d (erro %d). Outro programa já está usando ela?" % [PORTA, erro]
	multiplayer.multiplayer_peer = peer
	heroi_por_id.clear(); nome_por_id.clear()
	return ""

func entrar(ip: String) -> String:
	if ip.strip_edges() == "": return "Digite o endereço de quem hospedou."
	var peer := ENetMultiplayerPeer.new()
	var erro := peer.create_client(ip.strip_edges(), PORTA)
	if erro != OK: return "Endereço inválido."
	multiplayer.multiplayer_peer = peer
	heroi_por_id.clear(); nome_por_id.clear()
	return ""

func sair() -> void:
	if multiplayer.multiplayer_peer: multiplayer.multiplayer_peer.close()
	multiplayer.multiplayer_peer = null
	heroi_por_id.clear(); nome_por_id.clear()

func ativo() -> bool:
	return multiplayer.multiplayer_peer != null

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
