"""Glue between a Blender object and the numpy arrays in core.

Operators, panels and handlers all go through here, so there is exactly
one place that knows how an object's layer list maps onto cached arrays.
"""

import uuid

import numpy as np

from . import core

# Set while the add-on is the one moving vertices. The depsgraph handler
# checks it and stands down, otherwise a rebuild would immediately be read
# back as if the user had sculpted it.
_suspend = 0


class suspended:
    """Context manager: changes made inside are not captured as strokes."""

    def __enter__(self):
        global _suspend
        _suspend += 1

    def __exit__(self, *exc):
        global _suspend
        _suspend -= 1


def is_suspended():
    return _suspend > 0


def new_uid():
    return uuid.uuid4().hex


def object_uid(obj, create=False):
    uid = obj.get(core.UID_KEY)
    if not uid and create:
        uid = obj[core.UID_KEY] = new_uid()
    return uid


def settings(obj):
    return getattr(obj, "sculpt_layers", None)


def is_active(obj):
    """True when this object is under layer control and still coherent."""
    st = settings(obj)
    if obj is None or obj.type != 'MESH' or st is None or not st.enabled:
        return False
    entry = core.cache_for(object_uid(obj))
    if entry is None or entry["base"] is None:
        return core.rehydrate(object_uid(obj), obj) if object_uid(obj) else False
    return entry["base"].shape[0] == len(obj.data.vertices)


def vertex_count_changed(obj):
    """The one failure mode worth naming out loud in the UI."""
    st = settings(obj)
    if st is None or not st.enabled:
        return False
    entry = core.cache_for(object_uid(obj))
    if entry is None or entry["base"] is None:
        return False
    return entry["base"].shape[0] != len(obj.data.vertices)


# ── enabling / disabling ──────────────────────────────────────────────

def enable(obj):
    """Snapshot the current mesh as the base everything else sits on."""
    uid = object_uid(obj, create=True)
    entry = core.cache_for(uid, create=True)
    entry["base"] = core.read_coords(obj.data)
    entry["offsets"] = {}
    st = settings(obj)
    st.layers.clear()
    st.active_index = 0
    st.enabled = True


def disable(obj, keep_shape=True):
    """Drop layer control. The mesh keeps whatever it currently looks like."""
    uid = object_uid(obj)
    st = settings(obj)
    if not keep_shape and uid:
        entry = core.cache_for(uid)
        if entry and entry["base"] is not None:
            with suspended():
                core.write_coords(obj.data, entry["base"])
    if uid:
        core.forget(uid)
    st.layers.clear()
    st.active_index = 0
    st.enabled = False
    for key in (core.BASE_KEY, core.OFFSET_KEY, core.COUNT_KEY):
        if key in obj:
            del obj[key]


# ── layer arrays ──────────────────────────────────────────────────────

def _entry(obj):
    return core.cache_for(object_uid(obj), create=True)


def zeros(obj):
    return np.zeros((len(obj.data.vertices), 3), dtype=core.DTYPE)


def offset_of(obj, layer):
    entry = _entry(obj)
    off = entry["offsets"].get(layer.uid)
    if off is None:
        off = entry["offsets"][layer.uid] = zeros(obj)
    return off


def set_offset(obj, layer, arr):
    _entry(obj)["offsets"][layer.uid] = arr.astype(core.DTYPE)


def drop_offset(obj, layer):
    _entry(obj)["offsets"].pop(layer.uid, None)


def stack(obj):
    """(base, offsets, strengths, visible) in bottom-to-top order."""
    st = settings(obj)
    entry = _entry(obj)
    offsets, strengths, visible = [], [], []
    solo = next((i for i, l in enumerate(st.layers) if l.solo), None)
    for i, layer in enumerate(st.layers):
        offsets.append(offset_of(obj, layer))
        strengths.append(layer.strength)
        # Solo shows one layer alone; without it, the eye icon decides.
        visible.append(i == solo if solo is not None else layer.visible)
    return entry["base"], offsets, strengths, visible


# ── the two operations that move vertices ─────────────────────────────

def rebuild(obj):
    """Recompute the mesh from base + layers."""
    if not is_active(obj):
        return
    base, offsets, strengths, visible = stack(obj)
    with suspended():
        core.write_coords(obj.data, core.composite(base, offsets, strengths, visible))


def capture_active(obj):
    """Record whatever moved into the active layer."""
    st = settings(obj)
    if not is_active(obj) or not st.layers:
        return False
    idx = max(0, min(st.active_index, len(st.layers) - 1))
    layer = st.layers[idx]
    if layer.locked or not layer.visible:
        return False
    base, offsets, strengths, visible = stack(obj)
    current = core.read_coords(obj.data)
    new = core.capture(current, base, offsets, strengths, visible, idx)
    existing = offsets[idx]
    if existing is not None and np.array_equal(existing, new):
        return False
    set_offset(obj, layer, new)
    return True


# ── strength handling for the active layer ────────────────────────────
#
# The layer being sculpted is always recorded and shown at full strength.
# The value the user picked is parked in stored_strength and handed back
# the moment another layer takes over, so the slider is not destroyed by
# selecting the layer.

def hold_strength(layer):
    if layer.strength != 1.0:
        layer.stored_strength = layer.strength
        layer.strength = 1.0


def release_strength(layer):
    if layer.stored_strength != 1.0:
        layer.strength = layer.stored_strength
        layer.stored_strength = 1.0


def sync_active_strength(obj, previous=None):
    st = settings(obj)
    if not st or not st.layers:
        return
    idx = max(0, min(st.active_index, len(st.layers) - 1))
    if previous is not None and 0 <= previous < len(st.layers) and previous != idx:
        release_strength(st.layers[previous])
    hold_strength(st.layers[idx])


def unique_name(st, base_name):
    taken = {l.name for l in st.layers}
    if base_name not in taken:
        return base_name
    i = 2
    while f"{base_name} {i}" in taken:
        i += 1
    return f"{base_name} {i}"
