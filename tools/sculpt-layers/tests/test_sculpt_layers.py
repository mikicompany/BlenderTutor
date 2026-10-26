"""Headless tests for the Sculpt Layers prototype.

Run:  blender -b -P tools/sculpt-layers/tests/test_sculpt_layers.py

Sculpting itself cannot be driven without a window, so strokes are
simulated the way the add-on actually sees them: vertices move, then the
capture step runs. That is exactly what the depsgraph handler does, so
the arithmetic under test is the real thing rather than a stand-in.
"""

import os
import sys
import traceback

import bpy
import numpy as np

ADDON_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ADDON_DIR not in sys.path:
    sys.path.insert(0, ADDON_DIR)

import sculpt_layers                      # noqa: E402
from sculpt_layers import bridge, core    # noqa: E402

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


def eq(a, b, msg="", tol=1e-5):
    a, b = np.asarray(a), np.asarray(b)
    if a.shape != b.shape:
        raise AssertionError(f"{msg}: shape {a.shape} != {b.shape}")
    worst = float(np.abs(a - b).max()) if a.size else 0.0
    if worst > tol:
        raise AssertionError(f"{msg}: largest difference {worst:.6g} exceeds {tol}")


def truth(cond, msg):
    if not cond:
        raise AssertionError(msg)


def fresh_object(verts_x=4):
    """A small grid, made active, with layers off."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    core.clear_cache()
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=verts_x, y_subdivisions=verts_x, size=2)
    obj = bpy.context.object
    bpy.context.view_layer.objects.active = obj
    return obj


def sculpt(obj, delta):
    """Move every vertex by delta, as a stroke would, then let the add-on see it."""
    coords = core.read_coords(obj.data)
    with bridge.suspended():
        core.write_coords(obj.data, coords + delta)
    bridge.capture_active(obj)


sculpt_layers.register()


# ── core arithmetic, no operators involved ────────────────────────────

@check("composite stacks visible layers only")
def _():
    base = np.zeros((3, 3), dtype=core.DTYPE)
    a = np.ones((3, 3), dtype=core.DTYPE)
    b = np.full((3, 3), 2.0, dtype=core.DTYPE)
    eq(core.composite(base, [a, b], [1.0, 1.0], [True, True]), base + 3.0, "both on")
    eq(core.composite(base, [a, b], [1.0, 1.0], [True, False]), base + 1.0, "upper hidden")
    eq(core.composite(base, [a, b], [0.5, 0.25], [True, True]), base + 1.0, "scaled")
    eq(core.composite(base, [a, b], [0.0, 1.0], [True, True]), base + 2.0, "zero strength")


@check("capture isolates the active layer")
def _():
    base = np.zeros((4, 3), dtype=core.DTYPE)
    lower = np.full((4, 3), 1.0, dtype=core.DTYPE)
    active = np.zeros((4, 3), dtype=core.DTYPE)
    # The mesh sits at base + lower*0.5 + a 2.0 stroke on the active layer.
    current = base + lower * 0.5 + 2.0
    got = core.capture(current, base, [lower, active], [0.5, 1.0], [True, True], active=1)
    eq(got, np.full((4, 3), 2.0), "stroke should not absorb the lower layer")


@check("merge preserves what the viewport showed")
def _():
    lower = np.full((2, 3), 1.0, dtype=core.DTYPE)
    upper = np.full((2, 3), 4.0, dtype=core.DTYPE)
    eq(core.merge(lower, 0.5, upper, 0.25), np.full((2, 3), 1.5), "0.5*1 + 0.25*4")


@check("encode/decode round-trips exactly")
def _():
    arr = (np.random.default_rng(7).random((50, 3)) * 10).astype(core.DTYPE)
    eq(core.decode(core.encode(arr), 50), arr, "base64 round trip", tol=0.0)


# ── the add-on, driven through its operators ──────────────────────────

@check("first Add snapshots the base and creates one layer")
def _():
    obj = fresh_object()
    before = core.read_coords(obj.data)
    bpy.ops.sculpt_layers.add()
    st = obj.sculpt_layers
    truth(st.enabled, "layers should be enabled")
    truth(len(st.layers) == 1, f"expected 1 layer, got {len(st.layers)}")
    truth(st.active_index == 0, "new layer should be active")
    eq(bridge.stack(obj)[0], before, "base should equal the mesh at enable time")
    eq(core.read_coords(obj.data), before, "adding a layer must not move anything")


@check("a stroke lands on the active layer and nowhere else")
def _():
    obj = fresh_object()
    bpy.ops.sculpt_layers.add()
    base = bridge.stack(obj)[0].copy()
    sculpt(obj, np.array([0.0, 0.0, 0.5], dtype=core.DTYPE))

    first = obj.sculpt_layers.layers[0]
    eq(bridge.offset_of(obj, first)[:, 2], np.full(len(obj.data.vertices), 0.5), "layer 1 raised")

    bpy.ops.sculpt_layers.add()
    sculpt(obj, np.array([0.0, 0.0, 0.25], dtype=core.DTYPE))
    second = obj.sculpt_layers.layers[1]
    eq(bridge.offset_of(obj, second)[:, 2], np.full(len(obj.data.vertices), 0.25),
       "layer 2 should hold only its own stroke")
    eq(bridge.offset_of(obj, first)[:, 2], np.full(len(obj.data.vertices), 0.5),
       "layer 1 must be untouched by a stroke made on layer 2")
    eq(core.read_coords(obj.data)[:, 2], base[:, 2] + 0.75, "both layers show")


@check("strength scales a layer live")
def _():
    obj = fresh_object()
    bpy.ops.sculpt_layers.add()
    base = bridge.stack(obj)[0].copy()
    sculpt(obj, np.array([0.0, 0.0, 1.0], dtype=core.DTYPE))
    bpy.ops.sculpt_layers.add()           # move off it so its slider is live again

    obj.sculpt_layers.layers[0].strength = 0.5
    bridge.rebuild(obj)
    eq(core.read_coords(obj.data)[:, 2], base[:, 2] + 0.5, "half strength")

    obj.sculpt_layers.layers[0].strength = 0.0
    bridge.rebuild(obj)
    eq(core.read_coords(obj.data)[:, 2], base[:, 2], "zero strength is the base")


@check("hiding a layer removes its contribution")
def _():
    obj = fresh_object()
    bpy.ops.sculpt_layers.add()
    base = bridge.stack(obj)[0].copy()
    sculpt(obj, np.array([0.0, 0.0, 0.8], dtype=core.DTYPE))
    obj.sculpt_layers.layers[0].visible = False
    bridge.rebuild(obj)
    eq(core.read_coords(obj.data)[:, 2], base[:, 2], "hidden layer should contribute nothing")
    obj.sculpt_layers.layers[0].visible = True
    bridge.rebuild(obj)
    eq(core.read_coords(obj.data)[:, 2], base[:, 2] + 0.8, "and come back unchanged")


@check("solo shows one layer alone")
def _():
    obj = fresh_object()
    bpy.ops.sculpt_layers.add()
    base = bridge.stack(obj)[0].copy()
    sculpt(obj, np.array([0.0, 0.0, 1.0], dtype=core.DTYPE))
    bpy.ops.sculpt_layers.add()
    sculpt(obj, np.array([0.0, 0.0, 2.0], dtype=core.DTYPE))

    obj.sculpt_layers.layers[1].solo = True
    bridge.rebuild(obj)
    eq(core.read_coords(obj.data)[:, 2], base[:, 2] + 2.0, "only the soloed layer")

    obj.sculpt_layers.layers[0].solo = True       # solo is one at a time
    bridge.rebuild(obj)
    truth(not obj.sculpt_layers.layers[1].solo, "soloing one layer should clear the other")
    eq(core.read_coords(obj.data)[:, 2], base[:, 2] + 1.0, "solo moved")


@check("the active layer holds full strength and hands the value back")
def _():
    obj = fresh_object()
    bpy.ops.sculpt_layers.add()
    bpy.ops.sculpt_layers.add()
    st = obj.sculpt_layers

    st.active_index = 0
    st.layers[0].strength = 1.0           # active layers record at full strength
    st.layers[1].strength = 0.3
    st.active_index = 1                   # selecting it should park 0.3 and show 1.0
    truth(abs(st.layers[1].strength - 1.0) < 1e-6,
          f"active layer strength should read 1.0, got {st.layers[1].strength}")
    truth(abs(st.layers[1].stored_strength - 0.3) < 1e-6,
          f"0.3 should be parked, got {st.layers[1].stored_strength}")

    st.active_index = 0                   # leaving it should hand 0.3 back
    truth(abs(st.layers[1].strength - 0.3) < 1e-6,
          f"strength should be restored to 0.3, got {st.layers[1].strength}")


@check("merge down flattens two layers into the shape on screen")
def _():
    obj = fresh_object()
    bpy.ops.sculpt_layers.add()
    base = bridge.stack(obj)[0].copy()
    sculpt(obj, np.array([0.0, 0.0, 1.0], dtype=core.DTYPE))
    bpy.ops.sculpt_layers.add()
    sculpt(obj, np.array([0.0, 0.0, 2.0], dtype=core.DTYPE))

    before = core.read_coords(obj.data).copy()
    bpy.ops.sculpt_layers.merge_down()
    truth(len(obj.sculpt_layers.layers) == 1, "two layers should become one")
    eq(core.read_coords(obj.data), before, "merging must not change the shape")
    eq(core.read_coords(obj.data)[:, 2], base[:, 2] + 3.0, "sum preserved")


@check("duplicate copies the shape and sits above the original")
def _():
    obj = fresh_object()
    bpy.ops.sculpt_layers.add()
    base = bridge.stack(obj)[0].copy()
    sculpt(obj, np.array([0.0, 0.0, 1.0], dtype=core.DTYPE))
    bpy.ops.sculpt_layers.duplicate()
    st = obj.sculpt_layers
    truth(len(st.layers) == 2, "should now be two layers")
    truth(st.active_index == 1, "the copy should be active")
    eq(core.read_coords(obj.data)[:, 2], base[:, 2] + 2.0, "the shape is applied twice")


@check("clear empties a layer without removing it")
def _():
    obj = fresh_object()
    bpy.ops.sculpt_layers.add()
    base = bridge.stack(obj)[0].copy()
    sculpt(obj, np.array([0.0, 0.0, 1.0], dtype=core.DTYPE))
    bpy.ops.sculpt_layers.clear()
    truth(len(obj.sculpt_layers.layers) == 1, "the layer should still be there")
    eq(core.read_coords(obj.data), base, "but its contribution should be gone")


@check("delete removes a layer's contribution and leaves the rest")
def _():
    obj = fresh_object()
    bpy.ops.sculpt_layers.add()
    base = bridge.stack(obj)[0].copy()
    sculpt(obj, np.array([0.0, 0.0, 1.0], dtype=core.DTYPE))
    bpy.ops.sculpt_layers.add()
    sculpt(obj, np.array([0.0, 0.0, 2.0], dtype=core.DTYPE))
    bpy.ops.sculpt_layers.remove()        # removes the active (upper) layer
    eq(core.read_coords(obj.data)[:, 2], base[:, 2] + 1.0, "only the lower layer remains")


@check("apply bakes the shape; discard returns to base")
def _():
    obj = fresh_object()
    bpy.ops.sculpt_layers.add()
    base = bridge.stack(obj)[0].copy()
    sculpt(obj, np.array([0.0, 0.0, 1.5], dtype=core.DTYPE))
    shown = core.read_coords(obj.data).copy()
    bpy.ops.sculpt_layers.apply_all()
    truth(not obj.sculpt_layers.enabled, "apply should switch layers off")
    eq(core.read_coords(obj.data), shown, "apply must keep the shape")

    obj2 = fresh_object()
    bpy.ops.sculpt_layers.add()
    base2 = bridge.stack(obj2)[0].copy()
    sculpt(obj2, np.array([0.0, 0.0, 1.5], dtype=core.DTYPE))
    bpy.ops.sculpt_layers.discard('EXEC_DEFAULT')
    eq(core.read_coords(obj2.data), base2, "discard must restore the base shape")


@check("layer data survives a save and reload")
def _():
    obj = fresh_object()
    bpy.ops.sculpt_layers.add()
    base = bridge.stack(obj)[0].copy()
    sculpt(obj, np.array([0.0, 0.0, 1.25], dtype=core.DTYPE))
    uid = bridge.object_uid(obj)
    layer_uids = [l.uid for l in obj.sculpt_layers.layers]

    truth(core.flush(uid, obj, layer_uids), "flush should report success")
    core.clear_cache()                      # as if the file had just been opened
    truth(core.rehydrate(uid, obj), "rehydrate should find the stored arrays")
    eq(bridge.stack(obj)[0], base, "base survived")
    eq(bridge.offset_of(obj, obj.sculpt_layers.layers[0])[:, 2],
       np.full(len(obj.data.vertices), 1.25), "offsets survived")


@check("a changed vertex count is detected rather than corrupting the mesh")
def _():
    obj = fresh_object()
    bpy.ops.sculpt_layers.add()
    sculpt(obj, np.array([0.0, 0.0, 1.0], dtype=core.DTYPE))
    truth(not bridge.vertex_count_changed(obj), "should be coherent to start with")

    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.subdivide()
    bpy.ops.object.mode_set(mode='OBJECT')

    truth(bridge.vertex_count_changed(obj), "subdividing should be flagged")
    truth(not bridge.is_active(obj), "and layers should stop applying")
    bridge.rebuild(obj)                      # must be a no-op, not a crash


@check("rehydrate refuses data that no longer matches the mesh")
def _():
    obj = fresh_object()
    bpy.ops.sculpt_layers.add()
    sculpt(obj, np.array([0.0, 0.0, 1.0], dtype=core.DTYPE))
    uid = bridge.object_uid(obj)
    core.flush(uid, obj, [l.uid for l in obj.sculpt_layers.layers])
    obj[core.COUNT_KEY] = 999999             # pretend the mesh changed under us
    core.clear_cache()
    truth(not core.rehydrate(uid, obj), "a count mismatch must be rejected")


# ── report ────────────────────────────────────────────────────────────

print("\n" + "=" * 68)
for name in PASSED:
    print(f"  PASS  {name}")
for name, tb in FAILED:
    print(f"  FAIL  {name}")
    print("        " + tb.replace("\n", "\n        ").rstrip())
print("=" * 68)
print(f"{len(PASSED)} passed, {len(FAILED)} failed")

sculpt_layers.unregister()
sys.exit(1 if FAILED else 0)
