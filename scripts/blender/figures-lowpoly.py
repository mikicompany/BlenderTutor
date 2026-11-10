"""Hero for "Low Poly Modeling in Blender".

A small flat-shaded low-poly diorama — ground, trees, rocks, a little house,
a pond — in bold flat colours, the way the article describes the style.

Run: blender -b -P scripts/blender/figures-lowpoly.py
"""

import bpy, math, random
from mathutils import Vector

OUT = "/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/lp/"
random.seed(7)


def reset(res=(1600, 900)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = bpy.context.scene
    S.render.engine = 'CYCLES'
    S.cycles.device = 'CPU'
    S.cycles.use_denoising = False
    S.cycles.samples = 200
    S.render.resolution_x, S.render.resolution_y = res
    S.world = bpy.data.worlds.new("w")
    S.world.use_nodes = True
    bg = S.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.52, 0.72, 0.92, 1)   # soft sky blue
    bg.inputs[1].default_value = 0.7
    return S


def solo(ob):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def flat(ob):
    solo(ob)
    bpy.ops.object.shade_flat()


_mats = {}
def mat(name, rgb, rough=0.75):
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    _mats[name] = m
    return m


def put(ob, m):
    ob.data.materials.append(m)
    flat(ob)


def tree(x, y, h=1.2, r=0.5):
    bpy.ops.mesh.primitive_cylinder_add(vertices=7, radius=0.1, depth=0.5,
                                         location=(x, y, 0.25))
    put(bpy.context.object, mat("bark", (0.42, 0.26, 0.15)))
    # two stacked cones for foliage
    for i, (cz, cr) in enumerate(((0.65, r), (1.05, r * 0.7))):
        bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=cr, radius2=0,
                                        depth=h * 0.6, location=(x, y, cz + h * 0.1))
        shade = (0.20 + i * 0.06, 0.52 + i * 0.05, 0.22)
        put(bpy.context.object, mat(f"leaf{i}", shade))


def rock(x, y, s=0.4):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=s, location=(x, y, s * 0.55))
    o = bpy.context.object
    o.scale = (1.0, 0.8, 0.6)
    for v in o.data.vertices:
        v.co.x += random.uniform(-0.05, 0.05)
        v.co.y += random.uniform(-0.05, 0.05)
    put(o, mat("rock", (0.5, 0.52, 0.55)))


def house(x, y):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, 0.5))
    b = bpy.context.object
    b.scale = (0.9, 1.1, 0.5)
    solo(b); bpy.ops.object.transform_apply(scale=True)
    put(b, mat("wall", (0.92, 0.88, 0.78)))
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.95, radius2=0,
                                    depth=0.7, location=(x, y, 1.15), rotation=(0, 0, math.pi / 4))
    put(bpy.context.object, mat("roof", (0.86, 0.30, 0.20)))


# ── scene ─────────────────────────────────────────────────────────────
S = reset()

# ground (two tone, faceted)
bpy.ops.mesh.primitive_plane_add(size=14, location=(0, 0, 0))
put(bpy.context.object, mat("grass", (0.38, 0.66, 0.24)))

# pond
bpy.ops.mesh.primitive_circle_add(vertices=8, radius=1.3, fill_type='NGON',
                                   location=(2.0, 1.5, 0.02))
put(bpy.context.object, mat("water", (0.20, 0.54, 0.82)))

house(-1.3, 0.5)
tree(1.1, -0.7, h=1.2, r=0.58)
tree(-2.4, -0.6, h=1.0, r=0.5)
tree(2.6, 0.3, h=1.1, r=0.5)
rock(0.1, -1.7, 0.42)
rock(-0.6, 1.7, 0.33)
rock(-2.7, 1.1, 0.3)

# sun
bpy.ops.object.light_add(type='SUN', location=(4, -3, 7))
sun = bpy.context.object.data
sun.energy = 3.2
sun.angle = 0.1
bpy.context.object.rotation_euler = (math.radians(52), math.radians(14), math.radians(40))

# soft fill
bpy.ops.object.light_add(type='AREA', location=(-4, -2, 3))
bpy.context.object.data.energy = 180
bpy.context.object.data.size = 6

# camera — slightly high 3/4
cd = bpy.data.cameras.new("c")
c = bpy.data.objects.new("c", cd)
bpy.context.collection.objects.link(c)
S.camera = c
c.location = (6.6, -6.2, 5.0)
cd.lens = 60
v = Vector((0, 0, 0.3)) - c.location
c.rotation_euler = v.to_track_quat('-Z', 'Y').to_euler()

S.render.filepath = OUT + "lp_hero.png"
bpy.ops.render.render(write_still=True)
print("DONE")
