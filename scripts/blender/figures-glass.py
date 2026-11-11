"""Hero for "How to Make Glass in Blender".

Clear and tinted glass built the way the article teaches: a Principled BSDF
with Transmission 1, Roughness 0 and IOR 1.45, on a few shapes, with a Nishita
sky for reflections and some colourful objects behind the glass to show the
refraction (the whole point of glass).

Run: blender -b -P scripts/blender/figures-glass.py
"""

import bpy, math
from mathutils import Vector

OUT = "/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/glass/"


def reset(res=(1600, 900)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = bpy.context.scene
    S.render.engine = 'CYCLES'
    S.cycles.device = 'CPU'
    S.cycles.use_denoising = False
    S.cycles.samples = 400
    S.cycles.transmission_bounces = 24
    S.cycles.max_bounces = 24
    S.render.resolution_x, S.render.resolution_y = res
    return S


def sky(S):
    S.world = bpy.data.worlds.new("w")
    S.world.use_nodes = True
    nt = S.world.node_tree
    bg = nt.nodes["Background"]
    t = nt.nodes.new("ShaderNodeTexSky")
    t.sky_type = 'NISHITA'
    t.sun_elevation = math.radians(35)
    t.sun_rotation = math.radians(40)
    bg.inputs[1].default_value = 0.55
    nt.links.new(t.outputs[0], bg.inputs[0])


def glass_mat(tint=(1, 1, 1), rough=0.0):
    m = bpy.data.materials.new("glass")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*tint, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["IOR"].default_value = 1.45
    b.inputs["Transmission Weight"].default_value = 1.0
    return m


def matte(rgb, rough=0.6):
    m = bpy.data.materials.new("m")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    return m


def solo(ob):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def put(ob, m, smooth=True):
    ob.data.materials.append(m)
    if smooth:
        solo(ob)
        bpy.ops.object.shade_smooth()


S = reset()
sky(S)

# floor — pale, lightly glossy
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
put(bpy.context.object, matte((0.33, 0.34, 0.37), rough=0.3), smooth=False)

# colourful matte shapes BEHIND the glass — the thing it refracts
for (x, y, z, r, col) in ((-1.3, 2.4, 0.5, 0.5, (0.92, 0.26, 0.2)),
                          (0.2, 2.9, 0.45, 0.45, (0.95, 0.62, 0.12)),
                          (1.5, 2.5, 0.55, 0.55, (0.15, 0.6, 0.65))):
    bpy.ops.mesh.primitive_cube_add(size=r * 2, location=(x, y, z), rotation=(0, 0, math.radians(20)))
    bev = bpy.context.object.modifiers.new("b", 'BEVEL')
    bev.width = 0.06; bev.segments = 3
    put(bpy.context.object, matte(col))

# ── the glass, front row ──────────────────────────────────────────────
# clear sphere
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.62, location=(-1.45, 0.05, 0.62), segments=64, ring_count=32)
put(bpy.context.object, glass_mat((0.97, 0.98, 1.0)))

# faceted gem (ico-sphere, flat-shaded for crisp facets)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.58, location=(0.15, -0.05, 0.58))
g = bpy.context.object
g.data.materials.append(glass_mat((0.98, 0.98, 1.0)))

# tinted sphere (amber)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.58, location=(1.65, 0.05, 0.58), segments=64, ring_count=32)
put(bpy.context.object, glass_mat((1.0, 0.72, 0.32)))

# a soft key light for glints
bpy.ops.object.light_add(type='AREA', location=(-2.5, -3, 4))
L = bpy.context.object.data
L.energy = 240; L.size = 4
v = Vector((0, 0, 0.4)) - bpy.context.object.location
bpy.context.object.rotation_euler = v.to_track_quat('-Z', 'Y').to_euler()

# camera — low 3/4, close to catch the refraction
cd = bpy.data.cameras.new("c")
c = bpy.data.objects.new("c", cd)
bpy.context.collection.objects.link(c)
S.camera = c
c.location = (0.1, -5.0, 1.55)
cd.lens = 52
v = Vector((0.1, 0.5, 0.48)) - c.location
c.rotation_euler = v.to_track_quat('-Z', 'Y').to_euler()

S.render.filepath = OUT + "glass_hero.png"
bpy.ops.render.render(write_still=True)
print("DONE")
