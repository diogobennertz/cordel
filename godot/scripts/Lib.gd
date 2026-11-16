extends Node
class_name Lib
# Ajudantes compartilhados: peças low-poly (caixa, esfera, cápsula, cilindro), materiais e a altura do terreno.

static var _mats := {}
const RAIO := 42.0             # raio da clareira jogável; depois disso é mata fechada
static var toon := false     # ligado enquanto se monta um boneco: sombra chapada + contorno escuro

# Material liso, sem brilho. Um por cor, reaproveitado.
static func mat(cor: Color, brilho: float = 0.0) -> StandardMaterial3D:
	var k := cor.to_html() + ":" + str(brilho) + ":" + str(toon)
	if _mats.has(k): return _mats[k]
	var m := StandardMaterial3D.new()
	m.albedo_color = cor
	m.roughness = 1.0
	if brilho > 0.0:
		m.emission_enabled = true
		m.emission = cor
		m.emission_energy_multiplier = brilho
	if toon:
		m.diffuse_mode = BaseMaterial3D.DIFFUSE_TOON
		m.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
		var o := StandardMaterial3D.new()          # contorno: casca escura um pouco maior, vista por dentro
		o.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		o.albedo_color = Color(0.13, 0.08, 0.06)
		o.cull_mode = BaseMaterial3D.CULL_FRONT
		o.grow = true; o.grow_amount = 0.02
		m.next_pass = o
	_mats[k] = m
	return m

static func pivo(pai: Node3D, pos: Vector3) -> Node3D:
	var n := Node3D.new(); n.position = pos; pai.add_child(n); return n

static func _inst(pai: Node3D, mesh: Mesh, pos: Vector3, cor: Color, brilho: float) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	m.mesh = mesh; m.material_override = mat(cor, brilho); m.position = pos
	pai.add_child(m); return m

static func cx(pai: Node3D, tam: Vector3, pos: Vector3, cor: Color, rot: Vector3 = Vector3.ZERO, brilho: float = 0.0) -> MeshInstance3D:
	var b := BoxMesh.new(); b.size = tam
	var m := _inst(pai, b, pos, cor, brilho); m.rotation = rot; return m

static func esf(pai: Node3D, r: float, pos: Vector3, cor: Color, esc: Vector3 = Vector3.ONE, seg: int = 7, brilho: float = 0.0, meia: bool = false) -> MeshInstance3D:
	var s := SphereMesh.new(); s.radius = r; s.height = r if meia else r * 2.0
	s.radial_segments = seg; s.rings = maxi(2, seg / 2); s.is_hemisphere = meia
	var m := _inst(pai, s, pos, cor, brilho); m.scale = esc; return m

static func caps(pai: Node3D, r: float, alt: float, pos: Vector3, cor: Color, esc: Vector3 = Vector3.ONE, rot: Vector3 = Vector3.ZERO) -> MeshInstance3D:
	var c := CapsuleMesh.new(); c.radius = r; c.height = alt; c.radial_segments = 10; c.rings = 3
	var m := _inst(pai, c, pos, cor, 0.0); m.scale = esc; m.rotation = rot; return m

static func cil(pai: Node3D, r_topo: float, r_base: float, alt: float, pos: Vector3, cor: Color, lados: int = 6, rot: Vector3 = Vector3.ZERO, brilho: float = 0.0) -> MeshInstance3D:
	var c := CylinderMesh.new(); c.top_radius = r_topo; c.bottom_radius = r_base; c.height = alt
	c.radial_segments = lados; c.rings = 1
	var m := _inst(pai, c, pos, cor, brilho); m.rotation = rot; return m

# Altura do terreno (morros suaves; fora da arena vira serra).
static func h(x: float, z: float) -> float:
	var v := 1.5 * sin(x * 0.085) * cos(z * 0.07) + 0.7 * sin(x * 0.19 + 1.3) * sin(z * 0.23 + 0.4)
	var m := sqrt(x * x + z * z) - RAIO
	if m > 0.0: v += m * m * 0.02 + m * 0.3
	return v
