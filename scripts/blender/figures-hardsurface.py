"""Hero for "Hard Surface Modeling in Blender".

A small hard-surface panel built the way the article describes: a bevelled
slab, boolean-cut panel lines and a recessed port, raised greeble details,
bolts, and one painted accent part — all with bevelled edges so the light
catches them. Studio three-point lighting, shaded in Cycles.

Run: blender -b -P scripts/blender/figures-hardsurface.py
"""

import bpy
from mathutils import Vector

OUT = "/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/hs/"


def reset(res=(1600, 900)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = bpy.context.scene
    S.render.engine = 'CYCLES'
    S.cycles.device = 'CPU'
    S.cycles.use_denoising = False
    S.cycles.samples = 450
    S.render.resolution_x, S.render.resolution_y = res
    S.render.film_transparent = False
    S.world = bpy.data.worlds.new("w")
    S.world.use_nodes = True
    bg = S.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.055, 0.057, 0.065, 1)
    bg.inputs[1].default_value = 0.5
    return S


def solo(ob):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def metal(rgb, rough=0.35, metal=1.0):
    m = bpy.data.materials.new("m")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m


def bevel(ob, width=0.015, segs=2, angle=0.52):
    b = ob.modifiers.new("b", 'BEVEL')
    b.width = width
    b.segments = segs
    b.limit_method = 'ANGLE'
    b.angle_limit = angle
    solo(ob)
    bpy.ops.object.modifier_apply(modifier=b.name)


def cube(sx, sy, sz, loc):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.scale = (sx, sy, sz)
    solo(o)
    bpy.ops.object.transform_apply(scale=True)
    return o


def cyl(r, depth, loc, verts=48, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth,
                                         location=loc, rotation=rot)
    return bpy.context.object


def boolean(target, cutter, op='DIFFERENCE'):
    m = target.modifiers.new("bool", 'BOOLEAN')
    m.operation = op
    m.object = cutter
    m.solver = 'EXACT'
    solo(target)
    bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


# ── base slab ─────────────────────────────────────────────────────────
S = reset()
slab = cube(2.4, 1.7, 0.34, (0, 0, 0))

# panel-line grooves (thin boolean cuts across the top)
for gy in (-0.45, 0.4):
    g = cube(2.9, 0.045, 0.1, (0, gy, 0.17))
    boolean(slab, g)
# a long vertical seam
seam = cube(0.045, 2.2, 0.1, (0.7, 0, 0.17))
boolean(slab, seam)

# recessed circular port
port = cyl(0.33, 0.3, (-0.72, 0.42, 0.17))
boolean(slab, port)
bevel(slab, width=0.02, segs=2)
slab.data.materials.append(metal((0.40, 0.42, 0.47), rough=0.33))

# ── raised greeble block (accent painted part) ────────────────────────
g1 = cube(0.78, 0.92, 0.17, (-0.72, 0.42, 0.255))
bevel(g1, width=0.02, segs=2)
g1.data.materials.append(metal((0.92, 0.45, 0.10), rough=0.42, metal=0.2))

# small raised detail boxes
for (x, y, sx, sy) in ((0.55, 0.5, 0.5, 0.5), (0.95, -0.45, 0.28, 0.72),
                       (0.2, -0.5, 0.22, 0.22)):
    d = cube(sx, sy, 0.1, (x, y, 0.22))
    bevel(d, width=0.014, segs=2)
    d.data.materials.append(metal((0.52, 0.54, 0.58), rough=0.28))

# a raised cylinder housing
hz = cyl(0.26, 0.2, (-0.72, 0.42, 0.44))
bevel(hz, width=0.02, segs=2)
hz.data.materials.append(metal((0.30, 0.31, 0.34), rough=0.3))

# bolts around the port housing
import math
for i in range(6):
    a = i / 6 * math.tau
    b = cyl(0.045, 0.1, (-0.72 + 0.37 * math.cos(a), 0.42 + 0.37 * math.sin(a), 0.37), verts=16)
    bevel(b, width=0.008, segs=1)
    b.data.materials.append(metal((0.68, 0.70, 0.72), rough=0.25))

# ── lighting: three-point ─────────────────────────────────────────────
def area(loc, en, sz, warm=1.0):
    bpy.ops.object.light_add(type='AREA', location=loc)
    d = bpy.context.object.data
    d.energy, d.size = en, sz
    d.color = (1.0, warm, warm * 0.9)
    v = Vector((0, 0, 0.2)) - bpy.context.object.location
    bpy.context.object.rotation_euler = v.to_track_quat('-Z', 'Y').to_euler()

area((3.4, -3.0, 4.2), 900, 3.0, warm=0.96)   # key
area((-3.6, -1.4, 1.6), 240, 3.5, warm=1.0)   # fill
area((-1.2, 3.4, 2.6), 520, 2.2, warm=0.9)    # rim

# floor
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.18))
fm = bpy.data.materials.new("floor")
fm.use_nodes = True
fb = fm.node_tree.nodes["Principled BSDF"]
fb.inputs["Base Color"].default_value = (0.05, 0.05, 0.06, 1)
fb.inputs["Roughness"].default_value = 0.6
bpy.context.object.data.materials.append(fm)

# camera — 3/4 hero angle
cd = bpy.data.cameras.new("c")
c = bpy.data.objects.new("c", cd)
bpy.context.collection.objects.link(c)
S.camera = c
c.location = (4.3, -4.3, 3.05)
cd.lens = 58
v = Vector((0.0, 0.05, 0.26)) - c.location
c.rotation_euler = v.to_track_quat('-Z', 'Y').to_euler()

S.render.filepath = OUT + "hs_hero.png"
bpy.ops.render.render(write_still=True)
print("DONE")
