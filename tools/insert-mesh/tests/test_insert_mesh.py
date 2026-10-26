"""Headless tests for the Insert Mesh + Live Boolean prototype.

Run:  blender -b -P tools/insert-mesh/tests/test_insert_mesh.py

The interactive click-to-place operator cannot run without a window, so the
placement it depends on is tested as pure maths, and the boolean behaviour
is driven through bridge.place_insert — the exact call the modal makes once
the cursor ray has resolved to a transform.
"""

import math
import os
import sys
import traceback

import bpy
from mathutils import Vector

ADDON_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ADDON_DIR not in sys.path:
    sys.path.insert(0, ADDON_DIR)

import insert_mesh                          # noqa: E402
from insert_mesh import bridge, core        # noqa: E402

PASSED, FAILED = [], []


def check(name):
    def wrap(fn):
        try:
            fn()
        except Exception:
            FAILED.append((name, traceback.format_exc()))
        else:
            PASSED.append(name)
        return fn
    return wrap


def close(a, b, tol, msg):
    if abs(a - b) > tol:
        raise AssertionError(f"{msg}: {a:.6g} vs {b:.6g} (tol {tol})")


def truth(cond, msg):
    if not cond:
        raise AssertionError(msg)


def fresh_sphere(radius=1.0, name="Target"):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=48, ring_count=24)
    obj = bpy.context.object
    obj.name = name
    bpy.context.view_layer.objects.active = obj
    return obj


def count_cutters():
    return sum(1 for o in bpy.data.objects if o.get(bridge.CUTTER_TAG))


insert_mesh.register()


# ── placement maths ───────────────────────────────────────────────────

@check("placement maps local +Z onto the surface normal")
def _():
    for normal in [(0, 0, 1), (1, 0, 0), (0.3, -0.7, 0.5), (0, -1, 0)]:
        m = core.placement_matrix((2, 3, 4), normal, scale=1.0)
        mapped = (m.to_3x3() @ Vector((0, 0, 1))).normalized()
        want = Vector(normal).normalized()
        close((mapped - want).length, 0.0, 1e-5, f"Z should align to {normal}")


@check("placement positions at the hit point and applies scale")
def _():
    m = core.placement_matrix((5, -2, 1), (0, 0, 1), scale=3.0)
    close((m.to_translation() - Vector((5, -2, 1))).length, 0.0, 1e-5, "origin at hit")
    close(m.to_scale().x, 3.0, 1e-5, "uniform scale applied")


@check("roll spins about the normal but keeps Z aligned")
def _():
    n = Vector((0, 1, 0))
    a = core.placement_matrix((0, 0, 0), n, scale=1.0, roll=0.0)
    b = core.placement_matrix((0, 0, 0), n, scale=1.0, roll=math.radians(40))
    za = (a.to_3x3() @ Vector((0, 0, 1))).normalized()
    zb = (b.to_3x3() @ Vector((0, 0, 1))).normalized()
    close((za - n).length, 0.0, 1e-5, "unrolled Z aligned")
    close((zb - n).length, 0.0, 1e-5, "rolled Z still aligned")
    xa = (a.to_3x3() @ Vector((1, 0, 0))).normalized()
    xb = (b.to_3x3() @ Vector((1, 0, 0))).normalized()
    truth((xa - xb).length > 0.1, "roll should move the local X axis")


@check("sink pushes the insert below the surface")
def _():
    m = core.placement_matrix((0, 0, 0), (0, 0, 1), scale=1.0, sink=0.25)
    close(m.to_translation().z, -0.25, 1e-5, "sunk along -normal")


# ── the part library ──────────────────────────────────────────────────

@check("every library part is a closed, positive-volume mesh")
def _():
    # A cutter that is not watertight makes booleans unpredictable, so this
    # is the property the whole tool leans on.
    for kind in core.KINDS:
        bm = core.build_primitive(kind)
        try:
            truth(core.is_closed(bm), f"{kind} must be watertight")
            truth(core.volume(bm) > 1e-4, f"{kind} must enclose volume")
        finally:
            bm.free()


@check("the wedge really is a triangular prism, not still a cube")
def _():
    cube = core.build_primitive("CUBE")
    wedge = core.build_primitive("WEDGE")
    try:
        truth(len(wedge.verts) < len(cube.verts), "wedge should have fewer verts than the cube")
        truth(core.volume(wedge) < core.volume(cube) - 1e-3, "wedge should enclose less than the cube")
    finally:
        cube.free()
        wedge.free()


# ── booleans through the bridge ───────────────────────────────────────

@check("a Cut insert removes volume")
def _():
    obj = fresh_sphere(radius=1.0)
    before = bridge.preview_volume(obj)
    m = core.placement_matrix((0, 0, 1.0), (0, 0, 1), scale=0.9, sink=0.3)
    bridge.place_insert(obj, "CUBE", m, polarity="CUT")
    after = bridge.preview_volume(obj)
    truth(after < before - 1e-3, f"Cut should shrink volume ({before:.3f} -> {after:.3f})")


@check("an Add insert increases volume")
def _():
    obj = fresh_sphere(radius=1.0)
    before = bridge.preview_volume(obj)
    # A cube half outside the surface, fused on.
    m = core.placement_matrix((0, 0, 1.0), (0, 0, 1), scale=0.6, sink=-0.3)
    bridge.place_insert(obj, "CUBE", m, polarity="ADD")
    after = bridge.preview_volume(obj)
    truth(after > before + 1e-3, f"Add should grow volume ({before:.3f} -> {after:.3f})")


@check("an Intersect insert keeps only the overlap")
def _():
    obj = fresh_sphere(radius=1.0)
    before = bridge.preview_volume(obj)          # ~4.19
    m = core.placement_matrix((0, 0, 0), (0, 0, 1), scale=1.2)   # cube 1.2 across, centred
    bridge.place_insert(obj, "CUBE", m, polarity="TRIM")
    after = bridge.preview_volume(obj)
    truth(after < before, "intersect keeps less than the sphere alone")
    truth(after > 0.1, "but the overlap is non-empty")


@check("live boolean is non-destructive until commit")
def _():
    obj = fresh_sphere(radius=1.0)
    base_verts = len(obj.data.vertices)
    m = core.placement_matrix((0, 0, 1.0), (0, 0, 1), scale=0.9, sink=0.3)
    bridge.place_insert(obj, "CUBE", m, polarity="CUT")

    truth(len(obj.data.vertices) == base_verts, "base mesh must be untouched before commit")
    truth(count_cutters() == 1, "the cutter should exist as its own object")
    truth(len(obj.modifiers) == 1, "a boolean modifier should be present")
    preview = bridge.preview_volume(obj)

    bridge.commit(obj)
    truth(len(obj.insert_mesh.inserts) == 0, "inserts cleared after commit")
    truth(count_cutters() == 0, "cutters deleted after commit")
    truth(len(obj.modifiers) == 0, "modifiers removed after commit")
    close(core.mesh_volume(obj.data), preview, 1e-3, "committed mesh matches the live preview")


@check("discard restores the original mesh and deletes cutters")
def _():
    obj = fresh_sphere(radius=1.0)
    before = core.mesh_volume(obj.data)
    m = core.placement_matrix((0, 0, 1.0), (0, 0, 1), scale=0.9, sink=0.3)
    bridge.place_insert(obj, "CUBE", m, polarity="CUT")
    bridge.clear(obj, keep_shape=False)
    close(core.mesh_volume(obj.data), before, 1e-4, "mesh volume restored")
    truth(count_cutters() == 0, "cutters gone")
    truth(len(obj.modifiers) == 0, "modifiers gone")


@check("flipping polarity changes the modifier operation and the result")
def _():
    obj = fresh_sphere(radius=1.0)
    m = core.placement_matrix((0, 0, 1.0), (0, 0, 1), scale=0.6, sink=-0.3)
    item = bridge.place_insert(obj, "CUBE", m, polarity="ADD")
    added = bridge.preview_volume(obj)
    bridge.set_polarity(obj, item, "CUT")
    truth(obj.modifiers[item.modifier].operation == "DIFFERENCE", "modifier op should flip to DIFFERENCE")
    cut = bridge.preview_volume(obj)
    truth(cut < added, "cutting the same part should give less than adding it")


@check("several inserts stack, and removing one leaves the rest")
def _():
    obj = fresh_sphere(radius=1.0)
    for x in (-0.7, 0.0, 0.7):
        m = core.placement_matrix((x, 0, 1.0), (0, 0, 1), scale=0.4, sink=0.25)
        bridge.place_insert(obj, "CYLINDER", m, polarity="CUT")
    truth(len(obj.insert_mesh.inserts) == 3, "three inserts")
    truth(count_cutters() == 3, "three cutters")
    three = bridge.preview_volume(obj)
    bridge.remove_insert(obj, 1)
    truth(len(obj.insert_mesh.inserts) == 2, "two inserts after removing one")
    truth(count_cutters() == 2, "two cutters after removing one")
    truth(bridge.preview_volume(obj) > three, "removing a Cut should give back some volume")


@check("assigning polarity straight on the item (as the UI does) does not recurse")
def _():
    # Regression: the property-update callbacks used to re-assign a property,
    # which re-fired them — a RecursionError once a few inserts were placed.
    obj = fresh_sphere(radius=1.0)
    items = []
    for x in (-0.6, 0.0, 0.6):
        m = core.placement_matrix((x, 0, 1.0), (0, 0, 1), scale=0.4, sink=0.25)
        items.append(bridge.place_insert(obj, "CUBE", m, polarity="CUT"))
    # Flip modes by writing the property directly, the way prop_enum in the
    # panel does — no bridge call in between.
    for item, pol in zip(items, ("ADD", "TRIM", "ADD")):
        item.polarity = pol
    ops = [obj.modifiers[i.modifier].operation for i in items]
    truth(ops == ["UNION", "INTERSECT", "UNION"], f"modifiers should track the items: {ops}")


@check("toggling Live off hides the preview without baking")
def _():
    obj = fresh_sphere(radius=1.0)
    m = core.placement_matrix((0, 0, 1.0), (0, 0, 1), scale=0.9, sink=0.3)
    item = bridge.place_insert(obj, "CUBE", m, polarity="CUT")
    bridge.set_live(obj, False)
    truth(obj.modifiers[item.modifier].show_viewport is False, "modifier hidden in viewport")
    truth(len(obj.insert_mesh.inserts) == 1, "insert still present, nothing baked")
    bridge.set_live(obj, True)
    truth(obj.modifiers[item.modifier].show_viewport is True, "shown again")


# ── report ────────────────────────────────────────────────────────────

print("\n" + "=" * 68)
for name in PASSED:
    print(f"  PASS  {name}")
for name, tb in FAILED:
    print(f"  FAIL  {name}")
    print("        " + tb.replace("\n", "\n        ").rstrip())
print("=" * 68)
print(f"{len(PASSED)} passed, {len(FAILED)} failed")

insert_mesh.unregister()
sys.exit(1 if FAILED else 0)
