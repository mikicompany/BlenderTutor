"""Render the insert + live boolean workflow, driven by the add-on itself.

Every booleaned shape here is produced by bridge.place_insert and committed
with bridge.commit — the same calls the panel makes. The pictures are the
tool running, not drawings of it.

Run: blender -b -P tools/insert-mesh/tests/make_demo_renders.py
"""

import math
import os
import sys

import bpy
from mathutils import Vector

ADDON_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ADDON_DIR not in sys.path:
    sys.path.insert(0, ADDON_DIR)

import insert_mesh                      # noqa: E402
from insert_mesh import bridge, core    # noqa: E402

OUT = "/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/bl/"


def scene(res=(700, 760), transparent=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = bpy.context.scene
    S.render.engine = "CYCLES"
    S.cycles.device = "CPU"
    S.cycles.use_denoising = False
    S.cycles.samples = 150
    S.render.resolution_x, S.render.resolution_y = res
    S.render.film_transparent = transparent
    S.world = bpy.data.worlds.new("w")
    S.world.use_nodes = True
    bg = S.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.03, 0.03, 0.035, 1)
    bg.inputs[1].default_value = 1.0
    return S


def clay(ob, rgba=(0.60, 0.58, 0.55, 1)):
    m = bpy.data.materials.new("clay")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = rgba
    b.inputs["Roughness"].default_value = 0.5
    ob.data.materials.clear()
    ob.data.materials.append(m)


def lights():
    for loc, en, sz in (((3.4, -3.0, 3.4), 560, 1.8),
                        ((-3.6, -2.0, 0.8), 120, 3.0),
                        ((-1.6, 3.4, 2.6), 650, 1.4)):
        bpy.ops.object.light_add(type="AREA", location=loc)
        d = bpy.context.object.data
        d.energy, d.size = en, sz
        v = Vector((0, 0, 0.05)) - bpy.context.object.location
        bpy.context.object.rotation_euler = v.to_track_quat("-Z", "Y").to_euler()


def camera(S, dist=7.6):
    cd = bpy.data.cameras.new("c")
    c = bpy.data.objects.new("c", cd)
    bpy.context.collection.objects.link(c)
    S.camera = c
    c.location = (dist * 0.1, -dist, dist * 0.22)
    cd.lens = 80
    v = Vector((0, 0, 0.0)) - c.location
    c.rotation_euler = v.to_track_quat("-Z", "Y").to_euler()


def base_sphere(radius=1.3):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=64, ring_count=32)
    ob = bpy.context.object
    bpy.ops.object.shade_smooth()
    clay(ob)
    return ob


def shoot(S, name):
    S.render.filepath = OUT + name
    bpy.ops.render.render(write_still=True)
    print("WROTE", name)


def on_surface(ob, theta, phi, radius, **kw):
    """A placement matrix for a point on the sphere, given spherical angles."""
    n = Vector((math.sin(phi) * math.cos(theta),
                math.sin(phi) * math.sin(theta),
                math.cos(phi)))
    hit = n * radius
    return core.placement_matrix(hit, n, **kw)


insert_mesh.register()

# ── Panel 1: the bare base ────────────────────────────────────────────
S = scene()
ob = base_sphere()
lights()
camera(S)
shoot(S, "insert_0_base.png")

R = 1.3
# The camera looks down the +Y axis, so the hemisphere facing it points along
# -Y, which is theta = -90 degrees. Everything is placed around that so the
# booleans are on the side we can actually see.
FACE = math.radians(-90)


def cut_portholes(ob):
    for d in (-0.6, 0.0, 0.6):
        m = on_surface(ob, FACE + d, math.radians(82), R,
                       scale=(0.34, 0.34, 1.1), sink=0.55)
        bridge.place_insert(ob, "CYLINDER", m, polarity="CUT")


# ── Panel 2: cut a row of portholes with cylinders ────────────────────
S = scene()
ob = base_sphere()
cut_portholes(ob)
lights()
camera(S)
shoot(S, "insert_1_cut.png")          # live boolean, not yet committed

# ── Panel 3: add a raised dome, bore a cone, carve a slot ─────────────
S = scene()
ob = base_sphere()
# Add: a sphere bump fused onto the left of the face — half protruding.
m = on_surface(ob, FACE - 0.55, math.radians(72), R, scale=(0.8, 0.8, 0.8), sink=0.14)
bridge.place_insert(ob, "SPHERE", m, polarity="ADD")
# Cut: a wide cone crater bored into the upper-right of the face.
# sink must stay below the cutter's half-height (here 0.5*1.5=0.75) or the
# whole part buries itself and carves nothing.
m = on_surface(ob, FACE + 0.5, math.radians(70), R, scale=(1.1, 1.1, 1.5), sink=0.35)
bridge.place_insert(ob, "CONE", m, polarity="CUT")
# Cut: a box notch carved across the lower face.
m = on_surface(ob, FACE, math.radians(98), R, scale=(1.1, 0.5, 0.9), sink=0.2)
bridge.place_insert(ob, "CUBE", m, polarity="CUT")
lights()
camera(S)
shoot(S, "insert_2_mixed.png")

# ── Panel 4: the same stack, committed (baked) ───────────────────────
bridge.commit(ob)
clay(ob, (0.62, 0.45, 0.30, 1))       # recolour to signal "baked, one mesh now"
shoot(S, "insert_3_committed.png")

# ── Hero: transparent, for the interface mockup ──────────────────────
S = scene((1100, 950), transparent=True)
ob = base_sphere()
cut_portholes(ob)
m = on_surface(ob, FACE, math.radians(32), R, scale=(0.7, 0.7, 0.55), sink=0.12)
bridge.place_insert(ob, "SPHERE", m, polarity="ADD")
lights()
camera(S)
shoot(S, "insert_hero.png")

print("DONE")
