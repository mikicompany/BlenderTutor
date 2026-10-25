"""Figures for "Blender Texture Not Showing".

Two Cycles renders:

  fig_tex_states.png   the three things people actually see — magenta,
                       black, and the texture working — side by side.
  fig_tex_uv.png       the same colour grid on a properly unwrapped mesh
                       and on one whose UVs are collapsed to a point.

The magenta panel is not painted on. The image datablock points at a file
that does not exist, which is the real failure, so Blender produces the
real colour rather than my guess at it.

Run: blender -b -P scripts/blender/figures-texture-not-showing.py
"""
import bpy, math

OUT = "/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/bl/"


def solo(ob):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def reset(res=(1200, 620)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = bpy.context.scene
    S.render.engine = 'CYCLES'
    S.cycles.device = 'CPU'
    S.cycles.use_denoising = False          # this build has no OpenImageDenoise
    S.cycles.samples = 160
    S.render.resolution_x, S.render.resolution_y = res
    S.render.film_transparent = True
    S.world = bpy.data.worlds.new("w")
    S.world.use_nodes = True
    bg = S.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.05, 0.05, 0.055, 1)
    bg.inputs[1].default_value = 0.35
    return S


def lights():
    for loc, en, sz in (((4.2, -4.0, 4.4), 1600, 2.4),
                        ((-4.6, -3.0, 1.2), 420, 3.4),
                        ((-2.0, 4.2, 3.0), 1200, 2.2)):
        bpy.ops.object.light_add(type='AREA', location=loc)
        bpy.context.object.data.energy = en
        bpy.context.object.data.size = sz


def cam(S, loc, lens, rx=84):
    cd = bpy.data.cameras.new("c")
    c = bpy.data.objects.new("c", cd)
    bpy.context.collection.objects.link(c)
    S.camera = c
    c.location = loc
    c.rotation_euler = (math.radians(rx), 0, 0)
    cd.lens = lens


def suzanne(x, subsurf=2):
    bpy.ops.mesh.primitive_monkey_add(size=2.0, location=(x, 0, 0.0))
    ob = bpy.context.object
    s = ob.modifiers.new("s", 'SUBSURF')
    s.levels = s.render_levels = subsurf
    solo(ob)
    bpy.ops.object.modifier_apply(modifier=s.name)
    bpy.ops.object.shade_smooth()
    return ob


def grid_image(name="grid", size=1024):
    img = bpy.data.images.new(name, size, size)
    img.generated_type = 'COLOR_GRID'       # set after; not a new() kwarg
    return img


def missing_image(name="missing"):
    """An image datablock whose file is not there — the real magenta case."""
    img = bpy.data.images.new(name, 8, 8)
    img.source = 'FILE'
    img.filepath = "//textures/this-file-was-moved.png"
    return img


def textured(ob, img, rough=0.45):
    m = bpy.data.materials.new("m")
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = rough
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    tex.location = (-340, 220)
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    ob.data.materials.clear()
    ob.data.materials.append(m)
    return m


def flat(ob, rgba, rough=0.45):
    m = bpy.data.materials.new("m")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = rgba
    b.inputs["Roughness"].default_value = rough
    ob.data.materials.clear()
    ob.data.materials.append(m)


def floor():
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, -1.35))
    flat(bpy.context.object, (0.085, 0.085, 0.095, 1), rough=0.9)


def label(text, x, z=-1.26, size=0.21, y=-1.8):
    """Caption standing in the scene, emissive so the lighting can't dim it."""
    bpy.ops.object.text_add(location=(x, y, z))
    ob = bpy.context.object
    ob.data.body = text
    ob.data.align_x = 'CENTER'
    ob.data.size = size
    ob.rotation_euler = (math.radians(90), 0, 0)
    m = bpy.data.materials.new("label")
    m.use_nodes = True
    nt = m.node_tree
    out = nt.nodes["Material Output"]
    for n in list(nt.nodes):
        if n != out:
            nt.nodes.remove(n)
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs[0].default_value = (0.86, 0.87, 0.90, 1)
    em.inputs[1].default_value = 1.6
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    ob.data.materials.append(m)
    return ob


def shoot(S, n):
    S.render.filepath = OUT + n
    bpy.ops.render.render(write_still=True)
    print("WROTE", n)


# ── 1. The three things people see ────────────────────────────────────
# Left: image file missing. Middle: texture node present but nothing
# reaching Base Color. Right: the same grid, working.
S = reset((1400, 620))

a = suzanne(-4.3)
textured(a, missing_image())

b = suzanne(0.0)
m = textured(b, grid_image("grid_unlinked"))
# unplug Base Color — the "I added the node and nothing happened" case
nt = m.node_tree
bsdf = nt.nodes["Principled BSDF"]
for link in list(nt.links):
    if link.to_socket == bsdf.inputs["Base Color"]:
        nt.links.remove(link)
bsdf.inputs["Base Color"].default_value = (0, 0, 0, 1)

c = suzanne(4.3)
textured(c, grid_image("grid_ok"))

label("FILE MISSING", -4.3)
label("NOT LINKED", 0.0)
label("WORKING", 4.3)

floor()
lights()
cam(S, (0, -23.0, 0.2), 66, rx=89)
shoot(S, "fig_tex_states.png")


# ── 2. Same texture, UVs unwrapped vs collapsed ───────────────────────
S = reset((1100, 620))

img = grid_image("grid_uv")

left = suzanne(-2.6)
textured(left, img)
# Smart UV Project: real islands, so the grid reads across the surface
solo(left)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02)
bpy.ops.object.mode_set(mode='OBJECT')

right = suzanne(2.6)
textured(right, img)
# every UV on one point: the whole mesh samples a single texel, so the
# surface comes back as one flat colour and looks untextured
solo(right)
me = right.data
uv = me.uv_layers.active.data
for loop in uv:
    loop.uv = (0.5, 0.5)

label("UNWRAPPED", -2.6)
label("UVs COLLAPSED", 2.6)

floor()
lights()
cam(S, (0, -15.6, 0.2), 61, rx=89)
shoot(S, "fig_tex_uv.png")

print("DONE")
