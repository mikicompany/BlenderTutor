"""Render the layer stack, using the add-on's own arithmetic.

The four panels are not illustrations of what layers would do. The vertex
positions in each one come out of sculpt_layers.core.composite(), the same
function the add-on calls to draw the mesh, with nothing between it and the
render but the strengths being passed in.

Run: blender -b -P tools/sculpt-layers/tests/make_demo_renders.py
"""

import os
import sys

import bpy
import numpy as np
from mathutils import Vector, noise

ADDON_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ADDON_DIR not in sys.path:
    sys.path.insert(0, ADDON_DIR)

from sculpt_layers import core  # noqa: E402

OUT = "/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/bl/"


def scene(res=(680, 760)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = bpy.context.scene
    S.render.engine = 'CYCLES'
    S.cycles.device = 'CPU'
    S.cycles.use_denoising = False
    S.cycles.samples = 180
    S.render.resolution_x, S.render.resolution_y = res
    S.world = bpy.data.worlds.new("w")
    S.world.use_nodes = True
    bg = S.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.03, 0.03, 0.035, 1)
    bg.inputs[1].default_value = 1.0
    return S


def clay(ob):
    m = bpy.data.materials.new("clay")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.62, 0.60, 0.58, 1)
    b.inputs["Roughness"].default_value = 0.52
    ob.data.materials.clear()
    ob.data.materials.append(m)


def lights():
    for loc, en, sz in (((3.2, -3.0, 3.2), 520, 1.8),
                        ((-3.6, -2.0, 0.8), 110, 3.0),
                        ((-1.6, 3.4, 2.6), 620, 1.4)):
        bpy.ops.object.light_add(type='AREA', location=loc)
        d = bpy.context.object.data
        d.energy, d.size = en, sz
        v = Vector((0, 0, 0.05)) - bpy.context.object.location
        bpy.context.object.rotation_euler = v.to_track_quat('-Z', 'Y').to_euler()


def camera(S):
    cd = bpy.data.cameras.new("c")
    c = bpy.data.objects.new("c", cd)
    bpy.context.collection.objects.link(c)
    S.camera = c
    c.location = (0, -10.0, 0.9)
    cd.lens = 78
    v = Vector((0, 0, 0.0)) - c.location
    c.rotation_euler = v.to_track_quat('-Z', 'Y').to_euler()


def normals_of(mesh):
    n = len(mesh.vertices)
    flat = np.empty(n * 3, dtype=np.float64)
    mesh.vertices.foreach_get("normal", flat)
    return flat.reshape(n, 3).astype(core.DTYPE)


def displace(base, norms, freq, amp, octaves, ridged):
    """A layer's worth of offsets: noise along the base normals."""
    out = np.empty(len(base), dtype=core.DTYPE)
    for i, co in enumerate(base):
        v = noise.turbulence((float(co[0]) * freq, float(co[1]) * freq, float(co[2]) * freq),
                             octaves, ridged)
        out[i] = v
    out -= out.mean()
    return (norms * (out * amp)[:, None]).astype(core.DTYPE)


S = scene()
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=7, radius=1.4)
ob = bpy.context.object
bpy.ops.object.shade_smooth()
clay(ob)
lights()
camera(S)

base = core.read_coords(ob.data)
norms = normals_of(ob.data)
print(f"demo mesh: {len(base)} vertices")

# Two layers, deliberately different in scale — the thing layers are for.
big = displace(base, norms, freq=0.75, amp=0.26, octaves=3, ridged=False)
fine = displace(base, norms, freq=7.0, amp=0.055, octaves=4, ridged=True)

PANELS = [
    ("layers_00_base.png",  [0.0, 0.0], [True,  True]),
    ("layers_01_big.png",   [1.0, 0.0], [True,  True]),
    ("layers_02_both.png",  [1.0, 1.0], [True,  True]),
    ("layers_03_dialed.png", [1.0, 0.35], [True, True]),
]

for name, strengths, visible in PANELS:
    coords = core.composite(base, [big, fine], strengths, visible)
    core.write_coords(ob.data, coords)
    S.render.filepath = OUT + name
    bpy.ops.render.render(write_still=True)
    print("WROTE", name, "strengths", strengths)

# A transparent-background version for compositing into the interface
# mockup, so the render drops onto the viewport without a visible
# rectangle of its own background.
S.render.film_transparent = True
S.render.resolution_x, S.render.resolution_y = 1100, 900
core.write_coords(ob.data, core.composite(base, [big, fine], [1.0, 1.0], [True, True]))
S.render.filepath = OUT + "layers_hero.png"
bpy.ops.render.render(write_still=True)
print("WROTE layers_hero.png (alpha)")

print("DONE")
