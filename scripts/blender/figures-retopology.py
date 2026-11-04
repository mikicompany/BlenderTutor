"""Figure for "Retopology in Blender".

Same form, two topologies: a dense triangulated "sculpt" and a clean
quad-flow "retopo", each rendered as a grey surface with its real edges
drawn on top. Retopology changes the topology, not the shape — the whole
article in one image.

Edges are drawn with the Wireframe MODIFIER (which follows the true mesh
edges, quads included), not the Wireframe shader node (which would show
Cycles' internal triangulation and make every quad look like two tris).

Run: blender -b -P scripts/blender/figures-retopology.py
"""

import bpy
from mathutils import Vector

OUT = "/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/bl/"


def reset(res=(860, 860)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = bpy.context.scene
    S.render.engine = 'CYCLES'
    S.cycles.device = 'CPU'
    S.cycles.use_denoising = False
    S.cycles.samples = 90
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


def surface_mat():
    m = bpy.data.materials.new("surf")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.33, 0.34, 0.37, 1)
    b.inputs["Roughness"].default_value = 0.62
    return m


def wire_mat(rgb=(0.96, 0.94, 0.9)):
    m = bpy.data.materials.new("wire")
    m.use_nodes = True
    nt = m.node_tree
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    for n in list(nt.nodes):
        if n is not out:
            nt.nodes.remove(n)
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs[0].default_value = (*rgb, 1)
    em.inputs[1].default_value = 1.7
    nt.links.new(em.outputs[0], out.inputs[0])   # input 0 is Surface
    return m


def overlay_wire(ob, thickness):
    """Shaded surface in slot 0, emissive wire edges added on top in slot 1."""
    ob.data.materials.clear()
    ob.data.materials.append(surface_mat())
    ob.data.materials.append(wire_mat())
    wf = ob.modifiers.new("wf", 'WIREFRAME')
    wf.thickness = thickness
    wf.use_replace = False        # keep the faces, add wire geometry
    wf.material_offset = 1        # wire geometry uses slot 1 (emission)
    wf.use_even_offset = True


def lights():
    for loc, en, sz in (((3.0, -2.6, 3.0), 500, 2.0),
                        ((-3.2, -1.6, 1.0), 120, 3.0),
                        ((-1.0, 3.2, 2.2), 380, 1.6)):
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
    c.location = (0, -4.5, 0.9)
    cd.lens = 52
    v = Vector((0, 0, 0.1)) - c.location
    c.rotation_euler = v.to_track_quat('-Z', 'Y').to_euler()


def shoot(S, name):
    S.render.filepath = OUT + name
    bpy.ops.render.render(write_still=True)
    print("WROTE", name)


# ── dense "sculpt": subdivided and triangulated into a mess ───────────
S = reset()
bpy.ops.mesh.primitive_monkey_add(size=2.0)
hi = bpy.context.object
sub = hi.modifiers.new("s", 'SUBSURF')
sub.levels = sub.render_levels = 2
solo(hi)
bpy.ops.object.modifier_apply(modifier=sub.name)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.quads_convert_to_tris()
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.shade_smooth()
overlay_wire(hi, thickness=0.004)
print("sculpt faces:", len(hi.data.polygons))
lights()
camera(S)
shoot(S, "rt_sculpt.png")

# ── clean "retopo": the base monkey, all quads, same form ─────────────
S = reset()
bpy.ops.mesh.primitive_monkey_add(size=2.0)
lo = bpy.context.object
bpy.ops.object.shade_smooth()
overlay_wire(lo, thickness=0.012)
print("retopo faces:", len(lo.data.polygons))
lights()
camera(S)
shoot(S, "rt_retopo.png")

print("DONE")
