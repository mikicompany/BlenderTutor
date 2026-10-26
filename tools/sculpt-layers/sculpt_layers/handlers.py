"""App handlers: capture strokes, and keep layer data across save/load."""

import bpy
from bpy.app.handlers import persistent

from . import bridge, core


@persistent
def on_depsgraph_update(scene, depsgraph):
    """Route whatever just moved into the active layer.

    Runs after every depsgraph evaluation, which during a sculpt stroke is
    often. The early returns below are therefore ordered cheapest first.
    """
    if bridge.is_suspended():
        return
    obj = bpy.context.object if bpy.context else None
    if obj is None or obj.mode != 'SCULPT' or obj.type != 'MESH':
        return
    st = bridge.settings(obj)
    if st is None or not st.enabled or not st.auto_capture or not st.layers:
        return
    if bridge.vertex_count_changed(obj):
        return                      # the panel explains this one
    bridge.capture_active(obj)


@persistent
def on_save_pre(path):
    """Flush the in-memory arrays onto objects so the .blend carries them."""
    for obj in bpy.data.objects:
        st = bridge.settings(obj)
        if obj.type != 'MESH' or st is None or not st.enabled:
            continue
        uid = bridge.object_uid(obj)
        if uid:
            core.flush(uid, obj, [layer.uid for layer in st.layers])


@persistent
def on_load_post(path):
    """Start from a clean cache; objects rehydrate lazily on first use."""
    core.clear_cache()


HANDLERS = (
    (bpy.app.handlers.depsgraph_update_post, on_depsgraph_update),
    (bpy.app.handlers.save_pre, on_save_pre),
    (bpy.app.handlers.load_post, on_load_post),
)


def register():
    for queue, fn in HANDLERS:
        if fn not in queue:
            queue.append(fn)


def unregister():
    for queue, fn in HANDLERS:
        if fn in queue:
            queue.remove(fn)
