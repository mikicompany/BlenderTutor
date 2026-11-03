"""Figure for "Blender Normal Map Baking".

A real bake, not an illustration: a detailed high-poly panel is baked onto a
flat low-poly box with bpy.ops.object.bake(type='NORMAL'), and the low-poly is
then rendered with that baked map applied. The third panel is a few hundred
triangles wearing the detail of the first.

Produces three transparent renders (high, low, low+normal) composed into a
strip afterwards, and saves the baked normal map itself.

Run: blender -b -P scripts/blender/figures-normal-bake.py
"""

import math
import bpy
from mathutils import Vector

OUT = "/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/bl/"
IMG = 1024


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = bpy.context.scene
    S.render.engine = 'CYCLES'
    S.cycles.device = 'CPU'
    S.cycles.use_denoising = False
    S.cycles.samples = 64
    return S


def solo(ob):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob


def apply_mods(ob):
    solo(ob)
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


# ── build the two meshes ──────────────────────────────────────────────

def build_highpoly():
    """A rounded panel with bolts and a raised inner plate — lots of relief."""
    parts = []
    # base slab
    bpy.ops.mesh.primitive_cube_add(size=1)
    base = bpy.context.object
    base.scale = (1.6, 1.6, 0.18)
    apply_mods(base)
    parts.append(base)

    # A 4x4 rivet grid covering the whole top face (base spans +/-0.8, top
    # z=0.09). Detail spread across the face reads far better than a few
    # features crammed into a margin.
    # Dome bumps, not flat-topped rivets: a flat top shares the face's normal
    # and bakes almost nothing, whereas a dome's normals sweep through every
    # direction and read strongly in the map.
    coords = (-0.55, -0.18, 0.18, 0.55)
    for sx in coords:
        for sy in coords:
            bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12,
                                                 radius=0.11, location=(sx, sy, 0.09))
            parts.append(bpy.context.object)

    # two bold recessed... raised panel-line ridges between the rivet columns
    for x in (-0.37, 0.37):
        bpy.ops.mesh.primitive_cube_add(size=1)
        r = bpy.context.object
        r.scale = (0.03, 1.3, 0.06)
        r.location = (x, 0, 0.11)
        apply_mods(r)
        parts.append(r)

    # join everything into one high-poly object
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = base
    bpy.ops.object.join()
    hp = bpy.context.object
    hp.name = "highpoly"

    # round every edge and smooth, so the bake carries soft bevels
    bev = hp.modifiers.new("bev", 'BEVEL')
    bev.width = 0.02
    bev.segments = 3
    sub = hp.modifiers.new("sub", 'SUBSURF')
    sub.levels = sub.render_levels = 1
    apply_mods(hp)
    solo(hp)
    bpy.ops.object.shade_smooth()
    return hp


def build_lowpoly():
    """Just the outer slab — no bolts, no plate. The cage the detail bakes onto."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    lp = bpy.context.object
    lp.name = "lowpoly"
    lp.scale = (1.6, 1.6, 0.18)
    apply_mods(lp)
    bev = lp.modifiers.new("bev", 'BEVEL')
    bev.width = 0.03
    bev.segments = 2
    apply_mods(lp)
    solo(lp)
    bpy.ops.object.shade_smooth()
    # UVs
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.03)
    bpy.ops.object.mode_set(mode='OBJECT')
    return lp


# ── bake ──────────────────────────────────────────────────────────────

def bake_normal(lp, hp):
    img = bpy.data.images.new("baked_normal", IMG, IMG, alpha=False, float_buffer=False)
    img.colorspace_settings.name = 'Non-Color'

    # low-poly needs a material carrying the target image node, set active
    m = bpy.data.materials.new("lp_bakemat")
    m.use_nodes = True
    node = m.node_tree.nodes.new('ShaderNodeTexImage')
    node.image = img
    m.node_tree.nodes.active = node
    lp.data.materials.clear()
    lp.data.materials.append(m)

    # selection: high + low selected, low active == bake target
    bpy.ops.object.select_all(action='DESELECT')
    hp.select_set(True)
    lp.select_set(True)
    bpy.context.view_layer.objects.active = lp

    bpy.context.scene.cycles.bake_type = 'NORMAL'
    bpy.ops.object.bake(
        type='NORMAL',
        normal_space='TANGENT',
        use_selected_to_active=True,
        cage_extrusion=0.25,
        max_ray_distance=0.6,
        margin=16,
        margin_type='ADJACENT_FACES',
    )
    img.filepath_raw = OUT + "baked_normal_map.png"
    img.file_format = 'PNG'
    img.save()
    print("BAKED", img.filepath_raw)
    return img, m, node


# ── render the three beauty shots ─────────────────────────────────────

def clay(ob, rgba=(0.52, 0.53, 0.56, 1)):
    m = bpy.data.materials.new("clay")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = rgba
    b.inputs["Roughness"].default_value = 0.5
    ob.data.materials.clear()
    ob.data.materials.append(m)
    return m


def clay_with_normal(ob, img):
    m = clay(ob)
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    tex.interpolation = 'Smart'
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(tex.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    return m


def lights():
    # A strong key raking nearly parallel to the top face reveals the
    # normal-map relief; normal maps only show through the shadows the
    # lighting angle casts, and a grazing angle casts the most.
    for loc, en, sz in (((3.4, -1.1, 0.9), 1300, 1.0),
                        ((-3.0, -0.8, 1.0), 120, 3.0),
                        ((-1.0, 3.0, 2.0), 320, 1.6)):
        bpy.ops.object.light_add(type='AREA', location=loc)
        d = bpy.context.object.data
        d.energy, d.size = en, sz
        v = Vector((0, 0, 0.12)) - bpy.context.object.location
        bpy.context.object.rotation_euler = v.to_track_quat('-Z', 'Y').to_euler()


def camera(S):
    cd = bpy.data.cameras.new("c")
    c = bpy.data.objects.new("c", cd)
    bpy.context.collection.objects.link(c)
    S.camera = c
    # Steeper, more top-down so the detailed top face reads.
    c.location = (0, -2.1, 3.7)
    cd.lens = 62
    v = Vector((0, 0, 0)) - c.location
    c.rotation_euler = v.to_track_quat('-Z', 'Y').to_euler()


def render_one(mesh, name, S):
    # show only this object
    for o in bpy.data.objects:
        if o.type == 'MESH':
            o.hide_render = (o is not mesh)
    S.render.filepath = OUT + name
    bpy.ops.render.render(write_still=True)
    print("WROTE", name)


# ── drive ─────────────────────────────────────────────────────────────

S = reset()
hp = build_highpoly()
lp = build_lowpoly()
print("highpoly tris approx:", len(hp.data.polygons), "lowpoly faces:", len(lp.data.polygons))

img, lp_mat, lp_node = bake_normal(lp, hp)

# three display objects, overlapping is fine since we render one at a time
clay(hp)
# low-poly flat: give it a clean clay material (drop the bake material)
lp_flat = lp.copy()
lp_flat.data = lp.data.copy()
bpy.context.collection.objects.link(lp_flat)
clay(lp_flat)
# low-poly + normal: the original lp, swap to a normal-mapped clay
clay_with_normal(lp, img)

# transparent background for compositing
S.render.film_transparent = True
S.render.resolution_x = S.render.resolution_y = 900
lights()
camera(S)

render_one(hp, "nb_high.png", S)
render_one(lp_flat, "nb_low.png", S)
render_one(lp, "nb_lownormal.png", S)

print("DONE")
