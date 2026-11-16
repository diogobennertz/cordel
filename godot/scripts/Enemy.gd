extends Node3D
class_name Inimigo
# Criatura 3D: persegue o herói, dá dano ao encostar, e ao morrer deixa um vaga-lume (XP).
# Os chefes (chefe_tipo) têm, além disso, um ataque próprio.

var world
var boneco: Boneco
var tipo := "caipora"
var hp := 26.0
var speed := 2.2
var dmg := 6.0
var xp_val := 1.0
var moeda_val := 0.3
var hit_cd := 0.0
var is_boss := false
var elite := false
var stun_t := 0.0
var max_hp_cache := 1.0
var dead := false
var raio := 0.45
# chefes
var net_id := -1               # no co-op: identifica esse bicho nas duas máquinas
var ultimo_atacante := 0       # no co-op: quem acertou o golpe (0 = eu mesmo/anfitrião) — pra creditar o abate certo
var chefe_tipo := ""
var furia := false
var hab_t := 3.0
var prep_t := 0.0
var carga_t := 0.0
var carga_dir := Vector3.ZERO

func setup(t: String, escala: float, destaque = null) -> void:
	tipo = t
	boneco = Boneco.criar(t, destaque)
	var s := escala * 0.82
	boneco.scale = Vector3(s, s, s)
	raio = 0.45 * escala
	add_child(boneco)

func _process(delta: float) -> void:
	if world.estado != "jogo" or world.levelup_aberto: return
	if Rede.ativo() and not is_multiplayer_authority(): return   # bicho de outra máquina: só mostra onde a rede mandou
	hit_cd = maxf(0.0, hit_cd - delta)
	stun_t = maxf(0.0, stun_t - delta)
	var p = world._alvo_mais_perto(global_position)
	if p == null: return
	var to: Vector3 = p.global_position - global_position
	to.y = 0
	var d := to.length()
	var parado := stun_t > 0.0
	var andando := false
	var travado := false
	if chefe_tipo != "" and not parado and d > 0.001:
		travado = _chefe(delta, p, to, d)
	if d > 0.001 and not parado and not travado:
		var dir := to / d
		boneco.rotation.y = lerp_angle(boneco.rotation.y, atan2(dir.x, dir.z), clampf(delta * 10.0, 0, 1))
		var vel := speed
		var anda := d > 0.5 + raio
		if chefe_tipo == "":
			match tipo:
				"iara":           # fica de longe jogando água
					hab_t -= delta
					if d < 6.0: dir = -dir; vel *= 0.5
					elif d < 9.5: anda = false
					if hab_t <= 0.0 and d < 15.0:
						hab_t = 4.2
						world.tiro_inimigo(global_position, to / d * 7.0, dmg * 0.6, Color(0.3, 0.75, 1.0)); boneco.atacar()
				"lobisomem":      # de tempos em tempos dá um bote
					hab_t -= delta
					if hab_t <= 0.0 and d < 10.0 and d > 3.0: hab_t = 4.5; carga_t = 0.55
					if carga_t > 0.0: carga_t -= delta; vel *= 3.2
				"boto":           # chega dançando de lado
					dir = dir.rotated(Vector3.UP, sin(Time.get_ticks_msec() * 0.004 + position.x) * 0.8)
		if anda:
			position += dir * vel * delta
			andando = true
	# não empilhar: afasta de alguns vizinhos sorteados
	var n: int = world.enemies.size()
	if not is_boss:
		for i in range(mini(5, n)):
			var o = world.enemies[randi() % n]
			if o == self or not is_instance_valid(o): continue
			var dd: Vector3 = position - o.position; dd.y = 0
			var m: float = raio + o.raio + 0.15
			var l := dd.length()
			if l < m and l > 0.001: position += dd / l * (m - l) * 0.5
	position.y = Lib.h(position.x, position.z)
	boneco.tonto = parado
	boneco.animar(delta, andando or carga_t > 0.0, speed / 2.6)
	# dano de contato (dá para pular por cima dos pequenos)
	if d < 0.75 + raio and hit_cd <= 0.0 and p.alt < 1.0 + raio:
		hit_cd = 0.6
		boneco.atacar()
		world.ferir_jogador(p, dmg)

# Ataque próprio de cada chefe. Devolve true quando o chefe está ocupado (não anda atrás do herói).
func _chefe(delta: float, p, to: Vector3, d: float) -> bool:
	hab_t -= delta
	match chefe_tipo:
		"mapinguari":      # pisão: avisa no chão e estoura em volta — dá para escapar pulando
			if prep_t > 0.0:
				prep_t -= delta
				if prep_t <= 0.0:
					world.efeito_chefe(global_position, 6.5); world.tremor = 0.7
					if d < 6.5 and p.alt < 0.6: world.ferir_jogador(p, dmg * 1.8)
				return true
			if hab_t <= 0.0 and d < 7.5:
				hab_t = 3.0 if furia else 5.0
				prep_t = 0.9; boneco.girar()
				world.aviso_chefe(global_position, 6.5, "PISÃO!")
				return true
		"mula":            # disparada em linha reta
			if carga_t > 0.0:
				carga_t -= delta
				position += carga_dir * 15.0 * delta
				var r2 := Vector2(position.x, position.z)
				if r2.length() > world.ARENA - 1.5:
					r2 = r2.normalized() * (world.ARENA - 1.5); position.x = r2.x; position.z = r2.y; carga_t = 0.0
				return true
			if prep_t > 0.0:
				prep_t -= delta
				if prep_t <= 0.0: carga_t = 1.1
				return true
			if hab_t <= 0.0 and d > 3.5:
				hab_t = 3.5 if furia else 6.0
				prep_t = 0.7; carga_dir = to / d
				boneco.rotation.y = atan2(carga_dir.x, carga_dir.z)
				world.aviso_chefe(global_position, 2.5, "DISPARADA!")
				return true
		"cuca":            # joga poções para todo lado
			if hab_t <= 0.0:
				hab_t = 3.0
				for i in range(8):
					var a := i * TAU / 8.0 + randf() * 0.4
					world.tiro_inimigo(global_position, Vector3(cos(a), 0, sin(a)) * 7.0, dmg * 0.7, Color(0.7, 0.3, 1.0))
				boneco.atacar()
		"boitata":         # cospe bolas de fogo em leque
			if hab_t <= 0.0:
				hab_t = 1.5 if furia else 2.6
				var dir := to / d
				for i in range(-1, 2):
					world.tiro_inimigo(global_position, dir.rotated(Vector3.UP, i * 0.32) * 9.0, dmg * 0.8)
				boneco.atacar()
	return false

const COR_CRIT := [Color(1, 1, 1), Color(1.0, 0.85, 0.2), Color(1.0, 0.55, 0.1), Color(1.0, 0.25, 0.3)]

func take_damage(d: float, crit: int = 0) -> void:
	if dead: return
	if Rede.ativo() and not is_multiplayer_authority():
		world.retransmitir_dano.rpc_id(1, net_id, d, crit)
		return
	hp -= d
	boneco.bater()
	world.dano_num(global_position + Vector3(0, raio * 2.0, 0), Tela.num(d) + "!".repeat(crit), COR_CRIT[crit], 40 + crit * 16, crit > 0)
	if hp <= 0.0:
		dead = true
		world.on_enemy_killed(self)
		queue_free()
