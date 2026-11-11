"""Hero for "How to Make Water in Blender".

An ocean surface built the way the article teaches: a plane with the Ocean
modifier for the waves, a transmissive Principled shader for the water, a
Nishita sky for something to reflect, and a dark floor below for depth colour.

Run: blender -b -P scripts/blender/figures-water.py
"""

import bpy, math
from mathutils import Vector

OUT = "/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/water/"


def reset(res=(1600, 900)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = bpy.context.scene
    S.render.engine = 'CYCLES'
    S.cycles.device = 'CPU'
    S.cycles.use_denoising = False
    S.cycles.samples = 350
    S.render.resolution_x, S.render.resolution_y = res
    return S


def sky_world(S):
    S.world = bpy.data.worlds.new("w")
    S.world.use_nodes = True
    nt = S.world.node_tree
    bg = nt.nodes["Background"]
    sky = nt.nodes.new("ShaderNodeTexSky")
    sky.sky_type = 'NISHITA'
    sky.sun_elevation = math.radians(16)   # low sun → golden sparkle on the water
    sky.sun_rotation = math.radians(-35)
    sky.altitude = 200
    bg.inputs[1].default_value = 1.0
    nt.links.new(sky.outputs[0], bg.inputs[0])


def water_mat():
    m = bpy.data.materials.new("water")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.02, 0.09, 0.12, 1)  # deep teal
    b.inputs["Roughness"].default_value = 0.02
    b.inputs["IOR"].default_value = 1.333
    b.inputs["Transmission Weight"].default_value = 1.0
    return m


def ocean():
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    ob = bpy.context.object
    mod = ob.modifiers.new("ocean", 'OCEAN')
    mod.geometry_mode = 'GENERATE'
    mod.resolution = 16
    mod.viewport_resolution = 16
    mod.spatial_size = 24
    mod.wave_scale = 1.1
    mod.choppiness = 1.1
    mod.wave_alignment = 0.0
    mod.random_seed = 3
    ob.data.materials.append(water_mat())
    bpy.ops.object.shade_smooth()
    return ob


def floor():
    # a dark seabed below gives the transmissive water its depth colour
    bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, -2.2))
    m = bpy.data.materials.new("bed")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.01, 0.035, 0.045, 1)
    b.inputs["Roughness"].default_value = 0.9
    bpy.context.object.data.materials.append(m)


S = reset()
sky_world(S)
ocean()
floor()

# sun matching the sky direction, for the specular glint
bpy.ops.object.light_add(type='SUN', location=(0, 0, 10))
sun = bpy.context.object.data
sun.energy = 2.0
sun.angle = math.radians(2.0)
bpy.context.object.rotation_euler = (math.radians(74), 0, math.radians(-35))

# camera low over the water, looking toward the horizon
cd = bpy.data.cameras.new("c")
c = bpy.data.objects.new("c", cd)
bpy.context.collection.objects.link(c)
S.camera = c
c.location = (0, -11, 1.15)
cd.lens = 45
v = Vector((0, 6, 0.6)) - c.location
c.rotation_euler = v.to_track_quat('-Z', 'Y').to_euler()

S.render.filepath = OUT + "water_hero.png"
bpy.ops.render.render(write_still=True)
print("DONE")
