"""Figure for "Blender Booleans and the Topology They Leave".

One boolean cut, shown three ways:
  1. THE RESULT     shaded — a clean-looking cube with a hole.
  2. THE TOPOLOGY   the same mesh as wireframe — the n-gon and triangle mess
                    the boolean actually left behind.
  3. SUBDIVIDED     the same mesh with a Subdivision Surface modifier — the
                    mess bites, pinching the surface around the cut.

Run: blender -b -P scripts/blender/figures-boolean.py
"""

import bpy
from mathutils import Vector

OUT = "/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/bl/"


def reset(res=(820, 820)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = bpy.context.scene
    S.render.engine = 'CYCLES'
    S.cycles.device = 'CPU'
    S.cycles.use_denoising = False
    S.cycles.samples = 120
    S.render.resolution_x, S.render.resolution_y = res
    S.render.film_transparent = True
    S.world = bpy.data.worlds.new("w")
    S.world.use_nodes = True
    bg = S.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.04, 0.04, 0.045, 1)
    bg.inputs[1].default_value = 0.6
    return S


def solo(ob):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def grey_mat():
    m = bpy.data.materials.new("surf")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.42, 0.43, 0.46, 1)
    b.inputs["Roughness"].default_value = 0.4
    return m


def emis_mat(rgb=(0.95, 0.94, 0.9)):
    m = bpy.data.materials.new("wire")
    m.use_nodes = True
    nt = m.node_tree
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    for n in list(nt.nodes):
        if n is not out:
            nt.nodes.remove(n)
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs[0].default_value = (*rgb, 1)
    em.inputs[1].default_value = 1.8
    nt.links.new(em.outputs[0], out.inputs[0])
    return m


def booleaned_cube():
    """A cube with a cylindrical hole bored through — the classic boolean."""
    bpy.ops.mesh.primitive_cube_add(size=2.0)
    cube = bpy.context.object
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.62, depth=4.0)
    cutter = bpy.context.object
    mod = cube.modifiers.new("bool", 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object = cutter
    mod.solver = 'EXACT'
    solo(cube)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)
    return cube


def add_wire_overlay(ob, thickness=0.012):
    ob.data.materials.append(emis_mat())
    wf = ob.modifiers.new("wf", 'WIREFRAME')
    wf.thickness = thickness
    wf.use_replace = False
    wf.material_offset = 1


def lights():
    for loc, en, sz in (((3.0, -2.6, 3.4), 650, 2.0),
                        ((-3.2, -1.6, 1.0), 150, 3.0),
                        ((-1.0, 3.2, 2.4), 420, 1.6)):
        bpy.ops.object.light_add(type='AREA', location=loc)
        d = bpy.context.object.data
        d.energy, d.size = en, sz
        v = Vector((0, 0, 0)) - bpy.context.object.location
        bpy.context.object.rotation_euler = v.to_track_quat('-Z', 'Y').to_euler()


def camera(S):
    cd = bpy.data.cameras.new("c")
    c = bpy.data.objects.new("c", cd)
    bpy.context.collection.objects.link(c)
    S.camera = c
    c.location = (2.9, -3.6, 3.4)
    cd.lens = 58
    v = Vector((0, 0, -0.05)) - c.location
    c.rotation_euler = v.to_track_quat('-Z', 'Y').to_euler()


def shoot(S, name):
    S.render.filepath = OUT + name
    bpy.ops.render.render(write_still=True)
    print("WROTE", name)


# ── 1. the result, shaded — looks clean ───────────────────────────────
S = reset()
ob = booleaned_cube()
solo(ob)
ob.data.materials.append(grey_mat())
print("boolean result faces:", len(ob.data.polygons))
lights()
camera(S)
shoot(S, "bl_result.png")

# ── 2. the same mesh, wireframe — the mess it left ────────────────────
S = reset()
ob = booleaned_cube()
solo(ob)
ob.data.materials.append(grey_mat())
add_wire_overlay(ob)
lights()
camera(S)
shoot(S, "bl_wire.png")

# ── 3. the same mesh + subdivision — the mess bites ───────────────────
# A bevel (= support loops) holds the OUTER cube edges crisp, so the only
# thing left to distort is the boolean cut itself: the triangle fan and the
# n-gon round-trip pinch and crawl around the hole. That isolates the lesson
# — this is the boolean's topology biting, not a bare cube melting.
S = reset()
ob = booleaned_cube()
bev = ob.modifiers.new("b", 'BEVEL')
bev.width = 0.06
bev.segments = 2
bev.limit_method = 'ANGLE'
bev.angle_limit = 0.785  # ~45°: bevel the sharp box edges, leave flats alone
sub = ob.modifiers.new("s", 'SUBSURF')
sub.levels = sub.render_levels = 2
solo(ob)
bpy.ops.object.shade_smooth()
ob.data.materials.append(grey_mat())
lights()
camera(S)
shoot(S, "bl_subsurf.png")

print("DONE")
