"""Figure for "Texel Density".

Three boxes of different sizes sharing one checker texture. Texel density is
texture pixels per unit of surface: when it is consistent, every checker
square is the same real-world size on every object; when it is not, the big
box gets big blurry squares and the small box gets tiny sharp ones.

Panel A: each box UV-unwrapped to fill 0-1 (the default, and the mistake) —
inconsistent density. Panel B: each box's UVs scaled by its real size, so the
checker is the same size everywhere — consistent density.

Run: blender -b -P scripts/blender/figures-texel-density.py
"""

import math
import bpy
from mathutils import Vector

OUT = "/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/bl/"
SIZES = (0.65, 1.05, 1.7)
XS = (-2.3, 0.1, 2.9)


def reset(res=(1200, 640)):
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
    bg.inputs[0].default_value = (0.03, 0.03, 0.035, 1)
    bg.inputs[1].default_value = 0.4
    return S


def solo(ob):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def checker_mat():
    m = bpy.data.materials.new("checker")
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.5
    coord = nt.nodes.new('ShaderNodeTexCoord')
    chk = nt.nodes.new('ShaderNodeTexChecker')
    chk.inputs["Scale"].default_value = 10.0
    chk.inputs["Color1"].default_value = (0.90, 0.46, 0.09, 1)   # orange
    chk.inputs["Color2"].default_value = (0.045, 0.05, 0.06, 1)  # near-black
    nt.links.new(coord.outputs["UV"], chk.inputs["Vector"])
    nt.links.new(chk.outputs["Color"], bsdf.inputs["Base Color"])
    return m


def box(size, x, mat):
    bpy.ops.mesh.primitive_cube_add(size=size, location=(x, 0, size / 2))
    ob = bpy.context.object
    solo(ob)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.0)
    bpy.ops.object.mode_set(mode='OBJECT')
    ob.data.materials.append(mat)
    return ob


def scale_uvs(ob, factor):
    """Scale every UV coord about the origin — makes texel density track size."""
    uv = ob.data.uv_layers.active.data
    for loop in uv:
        loop.uv = (loop.uv[0] * factor, loop.uv[1] * factor)


def floor():
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
    m = bpy.data.materials.new("floor")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.07, 0.07, 0.08, 1)
    b.inputs["Roughness"].default_value = 0.9
    bpy.context.object.data.materials.append(m)


def lights():
    for loc, en, sz in (((3.4, -3.0, 4.0), 650, 3.0),
                        ((-3.6, -2.0, 1.4), 150, 3.5),
                        ((-1.0, 3.6, 2.6), 320, 2.0)):
        bpy.ops.object.light_add(type='AREA', location=loc)
        d = bpy.context.object.data
        d.energy, d.size = en, sz
        v = Vector((0, 0, 0.4)) - bpy.context.object.location
        bpy.context.object.rotation_euler = v.to_track_quat('-Z', 'Y').to_euler()


def camera(S):
    cd = bpy.data.cameras.new("c")
    c = bpy.data.objects.new("c", cd)
    bpy.context.collection.objects.link(c)
    S.camera = c
    c.location = (0.3, -9.4, 3.2)
    cd.lens = 58
    v = Vector((0.3, 0, 0.75)) - c.location
    c.rotation_euler = v.to_track_quat('-Z', 'Y').to_euler()


def build(consistent):
    S = reset()
    mat = checker_mat()
    for size, x in zip(SIZES, XS):
        ob = box(size, x, mat)
        if consistent:
            # UV units -> constant world distance, so the checker is the same
            # real size on every box regardless of how big the box is.
            scale_uvs(ob, size)
    floor()
    lights()
    camera(S)
    name = "td_consistent.png" if consistent else "td_inconsistent.png"
    S.render.filepath = OUT + name
    bpy.ops.render.render(write_still=True)
    print("WROTE", name)


build(False)
build(True)
print("DONE")
