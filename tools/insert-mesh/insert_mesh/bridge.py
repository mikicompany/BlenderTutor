"""Glue between a target object and its inserts.

An insert is a separate "cutter" object plus a Boolean modifier on the
target that references it. That is the same technique you would build by
hand for a live boolean in Blender, which is the point: the prototype is
the real workflow with the bookkeeping automated, not a private hack.

  - Cutters display as wireframe and are hidden from render, so the viewport
    shows the boolean result while you still have the parts to move.
  - Modifiers are applied top-down, so creation order is boolean order.
  - Nothing is baked until commit(); until then every insert is reversible.
"""

import bpy

from . import core

CUTTER_TAG = "insert_mesh_cutter"      # marks an object as one of our cutters
TARGET_TAG = "insert_mesh_target"      # marks the object the stack belongs to


def settings(obj):
    return getattr(obj, "insert_mesh", None)


def is_target(obj):
    st = settings(obj)
    return obj is not None and obj.type == "MESH" and st is not None and len(st.inserts) > 0


def _collections_of(obj):
    cols = list(obj.users_collection)
    return cols or [bpy.context.scene.collection]


def place_insert(target, kind, matrix, polarity="CUT", solver="EXACT", name=None):
    """Create a cutter for `kind` at `matrix` and boolean it onto `target`.

    `matrix` is a world-space transform, usually from core.placement_matrix.
    Returns the new insert property entry.
    """
    if kind not in core.KINDS:
        raise ValueError(f"unknown insert kind: {kind}")
    if polarity not in core.POLARITY_OP:
        raise ValueError(f"unknown polarity: {polarity}")

    st = settings(target)
    target[TARGET_TAG] = True

    bm = core.build_primitive(kind)
    me = bpy.data.meshes.new(f"{target.name}_insert_{kind.lower()}")
    bm.to_mesh(me)
    bm.free()

    cutter = bpy.data.objects.new(name or f"Insert {kind.title()}", me)
    cutter[CUTTER_TAG] = True
    cutter.display_type = "WIRE"
    cutter.hide_render = True
    cutter.show_in_front = True
    for col in _collections_of(target):
        col.objects.link(cutter)

    # Parent so the parts travel with the target, but place in world space.
    cutter.parent = target
    cutter.matrix_parent_inverse = target.matrix_world.inverted()
    cutter.matrix_world = matrix

    mod = target.modifiers.new(name=f"InsertBool_{len(st.inserts)}", type="BOOLEAN")
    mod.object = cutter
    mod.operation = core.POLARITY_OP[polarity]
    mod.solver = solver
    # The live boolean shows in both the viewport and renders — a test render
    # should reflect what you have built. Both follow the Live toggle; the
    # cutter objects themselves stay hidden from render (hide_render above).
    mod.show_viewport = st.live
    mod.show_render = st.live

    item = st.inserts.add()
    # Identity fields first, so that assigning polarity/solver below fires the
    # property-update callbacks with the cutter and modifier already wired up.
    item.name = cutter.name
    item.kind = kind
    item.cutter = cutter
    item.modifier = mod.name
    item.polarity = polarity
    item.solver = solver
    st.active_index = len(st.inserts) - 1
    return item


def _modifier_of(target, item):
    return target.modifiers.get(item.modifier)


def _target_of(item):
    """The object an insert belongs to, found through its cutter's parent.

    Context-free on purpose: the property-update callbacks must not depend on
    which object happens to be active when a slider moves.
    """
    cutter = item.cutter
    return cutter.parent if cutter is not None else None


def sync_modifier(item):
    """Push an insert's polarity and solver onto its Boolean modifier.

    This is the ONLY place the modifier is synced, and it never writes back to
    the item's properties — so the property-update callbacks that call it
    cannot re-fire themselves. (An earlier version looped here.)
    """
    target = _target_of(item)
    if target is None:
        return
    mod = target.modifiers.get(item.modifier)
    if mod is None:
        return
    mod.operation = core.POLARITY_OP[item.polarity]
    mod.solver = item.solver


def sync_live(st):
    """Show or hide every insert's modifier (viewport and render) to match st.live."""
    for item in st.inserts:
        target = _target_of(item)
        if target is None:
            continue
        mod = target.modifiers.get(item.modifier)
        if mod is not None:
            mod.show_viewport = st.live
            mod.show_render = st.live


def set_polarity(target, item, polarity):
    item.polarity = polarity        # the update callback syncs the modifier
    sync_modifier(item)             # and sync directly too, for callers with no context


def set_solver(target, item, solver):
    item.solver = solver
    sync_modifier(item)


def set_live(target, live):
    st = settings(target)
    st.live = live                  # the update callback runs sync_live
    sync_live(st)                   # and sync directly too, for callers with no context


def remove_insert(target, index):
    st = settings(target)
    if not 0 <= index < len(st.inserts):
        return
    item = st.inserts[index]
    mod = _modifier_of(target, item)
    if mod:
        target.modifiers.remove(mod)
    cutter = item.cutter
    if cutter is not None and cutter.get(CUTTER_TAG):
        _delete_object(cutter)
    st.inserts.remove(index)
    st.active_index = min(index, len(st.inserts) - 1) if len(st.inserts) else 0


def clear(target, keep_shape=False):
    """Drop every insert. keep_shape=True bakes the result first (= commit)."""
    st = settings(target)
    if keep_shape:
        _bake(target)
    for item in list(st.inserts):
        mod = _modifier_of(target, item)
        if mod:
            target.modifiers.remove(mod)
        if item.cutter is not None and item.cutter.get(CUTTER_TAG):
            _delete_object(item.cutter)
    st.inserts.clear()
    st.active_index = 0
    if TARGET_TAG in target:
        del target[TARGET_TAG]


def commit(target):
    """Bake the live boolean into the mesh and remove all inserts."""
    clear(target, keep_shape=True)


def _bake(target):
    """Replace the target mesh with its fully evaluated (booleaned) form."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = target.evaluated_get(depsgraph)
    baked = bpy.data.meshes.new_from_object(evaluated)
    old = target.data
    target.data = baked
    if old.users == 0:
        bpy.data.meshes.remove(old)


def _delete_object(obj):
    me = obj.data
    bpy.data.objects.remove(obj, do_unlink=True)
    if me is not None and me.users == 0:
        bpy.data.meshes.remove(me)


def preview_volume(target):
    """Volume of the current live boolean result, for tests and the panel."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = target.evaluated_get(depsgraph)
    me = bpy.data.meshes.new_from_object(evaluated)
    try:
        return core.mesh_volume(me)
    finally:
        bpy.data.meshes.remove(me)


def unique_insert_name(st, base):
    taken = {i.name for i in st.inserts}
    if base not in taken:
        return base
    n = 2
    while f"{base} {n}" in taken:
        n += 1
    return f"{base} {n}"
