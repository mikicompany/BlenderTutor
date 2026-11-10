"""Hero for "How to Make Lava in Blender".

A procedural lava material — dark rock crust with glowing cracks — built from
a single Noise Texture and a ColorRamp driving the Principled BSDF's emission,
on a displaced plane, with a compositor Glare node for the bloom. Exactly the
node setup the article walks through.

Run: blender -b -P scripts/blender/figures-lava.py
"""

import bpy
from mathutils import Vector

OUT = "/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/lava/"


def reset(res=(1600, 900)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = bpy.context.scene
    S.render.engine = 'CYCLES'
    S.cycles.device = 'CPU'
    S.cycles.use_denoising = False
    S.cycles.samples = 320
    S.render.resolution_x, S.render.resolution_y = res
    S.world = bpy.data.worlds.new("w")
    S.world.use_nodes = True
    bg = S.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.012, 0.012, 0.016, 1)  # near-black, faint cool
    bg.inputs[1].default_value = 0.25
    return S


def lava_material():
    m = bpy.data.materials.new("lava")
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.02, 0.014, 0.010, 1)  # dark rock
    bsdf.inputs["Roughness"].default_value = 0.72
    bsdf.inputs["Emission Strength"].default_value = 6.0

    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 3.4
    noise.inputs["Detail"].default_value = 7.0
    noise.inputs["Roughness"].default_value = 0.62

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    cr = ramp.color_ramp
    cr.interpolation = 'LINEAR'
    # the bottom two-thirds is pure black crust; lava only in the top band
    cr.elements[0].position = 0.0
    cr.elements[0].color = (0, 0, 0, 1)
    cr.elements[1].position = 0.50
    cr.elements[1].color = (0, 0, 0, 1)
    def add(pos, col):
        e = cr.elements.new(pos)
        e.color = (*col, 1)
    add(0.56, (0.30, 0.010, 0.0))     # ember red (cooling edges)
    add(0.66, (0.85, 0.09, 0.0))      # red-orange
    add(0.78, (1.0, 0.28, 0.01))      # orange
    add(0.90, (1.0, 0.52, 0.06))      # hot orange
    cr.elements[-1].position = 1.0
    cr.elements[-1].color = (1.0, 0.80, 0.28, 1)  # yellow core

    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Emission Color"])
    return m


def lava_plane():
    bpy.ops.mesh.primitive_plane_add(size=10, location=(0, 0, 0))
    ob = bpy.context.object
    # dense geometry for displacement
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.subdivide(number_cuts=160)
    bpy.ops.object.mode_set(mode='OBJECT')
    # molten lumps via a Displace modifier driven by a clouds texture
    tex = bpy.data.textures.new("molten", 'CLOUDS')
    tex.noise_scale = 0.55
    tex.noise_depth = 4
    d = ob.modifiers.new("disp", 'DISPLACE')
    d.texture = tex
    d.strength = 0.5
    d.mid_level = 0.4
    ob.data.materials.append(lava_material())
    # smooth shading so the molten surface isn't faceted
    bpy.ops.object.shade_smooth()
    return ob


def compositor_glare(S):
    S.use_nodes = True
    nt = S.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    rl = nt.nodes.new("CompositorNodeRLayers")
    glare = nt.nodes.new("CompositorNodeGlare")
    glare.glare_type = 'FOG_GLOW'
    glare.quality = 'HIGH'
    glare.threshold = 1.4
    glare.size = 6
    comp = nt.nodes.new("CompositorNodeComposite")
    nt.links.new(rl.outputs["Image"], glare.inputs["Image"])
    nt.links.new(glare.outputs["Image"], comp.inputs["Image"])


S = reset()
lava_plane()

# a faint cool rim light so the crust edges read against the dark
bpy.ops.object.light_add(type='AREA', location=(-4, 3, 3))
L = bpy.context.object.data
L.energy = 60
L.size = 6
L.color = (0.4, 0.55, 1.0)
v = Vector((0, 0, 0)) - bpy.context.object.location
bpy.context.object.rotation_euler = v.to_track_quat('-Z', 'Y').to_euler()

# camera — low, raking across the surface to catch the glow
cd = bpy.data.cameras.new("c")
c = bpy.data.objects.new("c", cd)
bpy.context.collection.objects.link(c)
S.camera = c
c.location = (0.2, -4.6, 1.75)
cd.lens = 50
v = Vector((0.1, 0.6, 0.15)) - c.location
c.rotation_euler = v.to_track_quat('-Z', 'Y').to_euler()

compositor_glare(S)

S.render.filepath = OUT + "lava_hero.png"
bpy.ops.render.render(write_still=True)
print("DONE")
