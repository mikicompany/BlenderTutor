"""Figure for the beginner's guide: one object, three lighting setups.

The guide's week-three exercise is "light the same object three ways and
compare", so the figure is literally that exercise. Same mug, same
material, same camera — only the lights move.

Renders three PNGs; they are composed into one labelled strip afterwards
rather than in Blender, because three lighting rigs in one scene would
leak light across the panels.

Run: blender -b -P scripts/blender/figures-beginners-lighting.py
"""
import bpy, math

OUT = "/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/bl/"


def solo(ob):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def reset(res=(620, 700)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = bpy.context.scene
    S.render.engine = 'CYCLES'
    S.cycles.device = 'CPU'
    S.cycles.use_denoising = False
    S.cycles.samples = 220
    S.render.resolution_x, S.render.resolution_y = res
    S.world = bpy.data.worlds.new("w")
    S.world.use_nodes = True
    bg = S.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.035, 0.035, 0.04, 1)
    bg.inputs[1].default_value = 1.0
    return S


def mat(ob, rgba, rough):
    m = bpy.data.materials.new("m")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = rgba
    b.inputs["Roughness"].default_value = rough
    ob.data.materials.clear()
    ob.data.materials.append(m)


def mug():
    """Cylinder plus a torus handle — the kind of object week two builds."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.55, depth=1.25,
                                        location=(0, 0, 0.625))
    body = bpy.context.object
    solo(body)
    bpy.ops.object.shade_smooth()
    body.data.use_auto_smooth = True            # 4.0 spelling
    body.data.auto_smooth_angle = math.radians(40)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.30, minor_radius=0.075,
                                     location=(0.66, 0, 0.70),
                                     rotation=(math.radians(90), 0, 0),
                                     major_segments=48, minor_segments=20)
    handle = bpy.context.object
    bpy.ops.object.shade_smooth()

    for ob in (body, handle):
        mat(ob, (0.74, 0.76, 0.80, 1), 0.33)

    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
    mat(bpy.context.object, (0.10, 0.10, 0.11, 1), 0.85)
    return body


def area(loc, energy, size, rot=(0, 0, 0)):
    bpy.ops.object.light_add(type='AREA', location=loc, rotation=rot)
    d = bpy.context.object.data
    d.energy = energy
    d.size = size
    return bpy.context.object


def aim(ob, target=(0, 0, 0.6)):
    """Point a light at the mug without needing a constraint."""
    import mathutils
    v = mathutils.Vector(target) - ob.location
    ob.rotation_euler = v.to_track_quat('-Z', 'Y').to_euler()


def cam(S):
    cd = bpy.data.cameras.new("c")
    c = bpy.data.objects.new("c", cd)
    bpy.context.collection.objects.link(c)
    S.camera = c
    c.location = (0, -4.6, 1.5)
    cd.lens = 70
    aim(c, (0, 0, 0.62))


def shoot(S, n):
    S.render.filepath = OUT + n
    bpy.ops.render.render(write_still=True)
    print("WROTE", n)


# ── 1. One big light, straight on: no shadow side, no form ────────────
S = reset()
mug()
aim(area((0, -4.2, 1.6), 900, 6.0))
cam(S)
shoot(S, "fig_light_flat.png")

# ── 2. Three-point: key, fill, rim ────────────────────────────────────
S = reset()
mug()
aim(area((2.6, -2.6, 2.6), 420, 1.6))     # key, high and to one side
aim(area((-3.0, -1.6, 0.9), 90, 2.6))     # fill, weak, opposite
aim(area((-1.4, 3.2, 2.4), 520, 1.2))     # rim, behind
cam(S)
shoot(S, "fig_light_three.png")

# ── 3. Rim-led: shape read almost entirely from behind ────────────────
S = reset()
mug()
aim(area((-1.8, 3.0, 2.2), 900, 1.0))
aim(area((2.2, 2.6, 1.8), 500, 1.0))
aim(area((-2.4, -2.8, 1.2), 42, 3.0))     # just enough to lift the front
cam(S)
shoot(S, "fig_light_rim.png")

print("DONE")
