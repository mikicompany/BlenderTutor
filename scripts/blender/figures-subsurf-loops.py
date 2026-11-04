"""Figure for "Subdivision Surface & Support Loops".

Three states of the same cube, with the Subdivision Surface modifier:
  1. SHARP        the raw cube.
  2. SUBDIVIDED   subsurf with nothing to hold the edges — melts to a pillow.
  3. SUPPORT LOOPS  the same subsurf, but holding loops near each edge keep it
                    crisp.

Each subdivided panel also shows its control cage as an emissive wireframe,
floating just outside the smooth surface the way Blender draws it in edit
mode — so you can see *why* one melts and one holds.

Run: blender -b -P scripts/blender/figures-subsurf-loops.py
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
    S.cycles.samples = 110
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


def emis_mat(rgb=(0.95, 0.52, 0.12)):
    m = bpy.data.materials.new("wire")
    m.use_nodes = True
    nt = m.node_tree
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    for n in list(nt.nodes):
        if n is not out:
            nt.nodes.remove(n)
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs[0].default_value = (*rgb, 1)
    em.inputs[1].default_value = 2.2
    nt.links.new(em.outputs[0], out.inputs[0])
    return m


def base_cube():
    bpy.ops.mesh.primitive_cube_add(size=2.0)
    return bpy.context.object


def cube_with_loops():
    """A cube with holding geometry near every edge, via a bevel."""
    ob = base_cube()
    bev = ob.modifiers.new("b", 'BEVEL')
    bev.width = 0.14
    bev.segments = 2
    solo(ob)
    bpy.ops.object.modifier_apply(modifier=bev.name)
    return ob


def cage_wire_of(cage_ob):
    """The CONTROL cage — the pre-subsurf mesh — rendered as emissive wire,
    floating just outside the smooth surface the way Blender draws it."""
    dup = cage_ob.copy()
    dup.data = cage_ob.data.copy()
    bpy.context.collection.objects.link(dup)
    dup.modifiers.clear()        # drop subsurf etc: we want the control hull
    wf = dup.modifiers.new("wf", 'WIREFRAME')
    wf.thickness = 0.03
    dup.data.materials.clear()
    dup.data.materials.append(emis_mat())
    return dup


def lights():
    for loc, en, sz in (((3.0, -2.6, 3.0), 650, 2.0),
                        ((-3.2, -1.6, 1.0), 150, 3.0),
                        ((-1.0, 3.2, 2.2), 420, 1.6)):
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
    c.location = (3.6, -4.2, 2.9)
    cd.lens = 52
    v = Vector((0, 0, 0)) - c.location
    c.rotation_euler = v.to_track_quat('-Z', 'Y').to_euler()


def shoot(S, name):
    S.render.filepath = OUT + name
    bpy.ops.render.render(write_still=True)
    print("WROTE", name)


# ── 1. sharp cube ─────────────────────────────────────────────────────
S = reset()
ob = base_cube()
ob.data.materials.append(grey_mat())
cage_wire_of(ob)
lights()
camera(S)
shoot(S, "ss_sharp.png")

# ── 2. subdivided, nothing to hold the edges ──────────────────────────
S = reset()
ob = base_cube()
sub = ob.modifiers.new("s", 'SUBSURF')
sub.levels = sub.render_levels = 3
solo(ob)
bpy.ops.object.shade_smooth()
ob.data.materials.append(grey_mat())
cage_wire_of(ob)        # cage = the plain cube, far from the melted surface
lights()
camera(S)
shoot(S, "ss_melted.png")

# ── 3. same subsurf, with support loops ───────────────────────────────
S = reset()
ob = cube_with_loops()
sub = ob.modifiers.new("s", 'SUBSURF')
sub.levels = sub.render_levels = 3
solo(ob)
bpy.ops.object.shade_smooth()
ob.data.materials.append(grey_mat())
cage_wire_of(ob)        # cage shows the holding loops hugging the edges
lights()
camera(S)
shoot(S, "ss_loops.png")

print("DONE")
