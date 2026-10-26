"""Layer storage and the arithmetic that stacks layers into a mesh.

Everything in here is deliberately free of operators, panels and context so
it can be exercised headless. The Blender-facing modules are thin wrappers
around these functions.

The model
---------
An object under layer control keeps a BASE: the vertex positions as they
were when layers were switched on. Each layer holds a per-vertex OFFSET
from that base. What you see in the viewport is

    coords = base + sum(offset_i * strength_i)   for visible layers

Sculpting does not write to the mesh in any special way — it just moves
vertices, like it always does. After each change the active layer's offset
is recomputed as "whatever is left once every other layer is accounted
for", which is what makes strokes land on the active layer and nowhere
else.

The active layer is always recorded and displayed at full strength. Its
strength slider is disabled while it is active, and the value the user
chose is kept and reapplied the moment another layer takes over. That is
ZBrush's behaviour, and it avoids dividing a captured stroke by a small
strength, which turns rounding error into visible noise.

Limits, stated rather than hidden: the vertex count must not change, so
Dyntopo and remeshing are out, and multires is not handled.
"""

import base64

import numpy as np

# float32 keeps the stored arrays half the size of Blender's own doubles
# and is far finer than anything a sculpt stroke resolves.
DTYPE = np.float32

UID_KEY = "sculpt_layers_uid"
BASE_KEY = "sculpt_layers_base"
OFFSET_KEY = "sculpt_layers_offsets"
COUNT_KEY = "sculpt_layers_vcount"


# ── mesh <-> numpy ────────────────────────────────────────────────────

def read_coords(mesh):
    """Vertex positions as an (n, 3) array."""
    n = len(mesh.vertices)
    flat = np.empty(n * 3, dtype=np.float64)
    mesh.vertices.foreach_get("co", flat)
    return flat.reshape(n, 3).astype(DTYPE)


def write_coords(mesh, coords):
    """Push an (n, 3) array back onto the mesh."""
    flat = np.ascontiguousarray(coords, dtype=np.float64).reshape(-1)
    mesh.vertices.foreach_set("co", flat)
    mesh.update()


# ── the arithmetic ────────────────────────────────────────────────────

def composite(base, offsets, strengths, visible):
    """Stack visible layers onto the base.

    offsets, strengths and visible are parallel sequences, bottom layer
    first. A layer contributes nothing when hidden or at zero strength.
    """
    out = base.astype(DTYPE, copy=True)
    for offset, strength, shown in zip(offsets, strengths, visible):
        if not shown or strength == 0.0 or offset is None:
            continue
        out += offset * DTYPE(strength)
    return out


def others_total(base, offsets, strengths, visible, active):
    """Where the surface would sit with every layer BUT the active one."""
    masked = [
        None if i == active else off
        for i, off in enumerate(offsets)
    ]
    return composite(base, masked, strengths, visible)


def capture(current, base, offsets, strengths, visible, active):
    """The active layer's new offset, given where the mesh now sits.

    Recording is at full strength, so this is a plain subtraction — no
    division by the layer's own strength, and therefore no amplification
    of rounding error at low strengths.
    """
    return (current - others_total(base, offsets, strengths, visible, active)).astype(DTYPE)


def merge(lower_offset, lower_strength, upper_offset, upper_strength):
    """Flatten two layers into one, preserving what the viewport showed."""
    lo = np.zeros_like(upper_offset) if lower_offset is None else lower_offset
    up = np.zeros_like(lo) if upper_offset is None else upper_offset
    return (lo * DTYPE(lower_strength) + up * DTYPE(upper_strength)).astype(DTYPE)


# ── persistence ───────────────────────────────────────────────────────
#
# Arrays live in a module-level cache while Blender is running and are
# flushed into ID properties on save. They are stored base64-encoded
# rather than as ID property arrays because a float-array ID property of
# a few hundred thousand entries is painfully slow to read back.

_cache = {}        # uid -> {"base": ndarray, "offsets": {layer_uid: ndarray}}


def encode(arr):
    return base64.b64encode(np.ascontiguousarray(arr, dtype=DTYPE).tobytes()).decode("ascii")


def decode(text, n):
    arr = np.frombuffer(base64.b64decode(text.encode("ascii")), dtype=DTYPE)
    if arr.size != n * 3:
        raise ValueError(f"expected {n * 3} floats, got {arr.size}")
    return arr.reshape(n, 3).copy()


def cache_for(uid, create=False):
    entry = _cache.get(uid)
    if entry is None and create:
        entry = _cache[uid] = {"base": None, "offsets": {}}
    return entry


def forget(uid):
    _cache.pop(uid, None)


def clear_cache():
    _cache.clear()


def flush(uid, obj, layer_uids):
    """Write the cached arrays onto the object as ID properties."""
    entry = _cache.get(uid)
    if entry is None or entry["base"] is None:
        return False
    obj[BASE_KEY] = encode(entry["base"])
    obj[COUNT_KEY] = int(entry["base"].shape[0])
    obj[OFFSET_KEY] = {
        luid: encode(entry["offsets"][luid])
        for luid in layer_uids
        if entry["offsets"].get(luid) is not None
    }
    return True


def rehydrate(uid, obj):
    """Rebuild the cache from ID properties after a file load.

    Returns False when the object carries no stored layer data, or when
    what it carries no longer matches the mesh.
    """
    raw_base = obj.get(BASE_KEY)
    if not raw_base:
        return False
    n = int(obj.get(COUNT_KEY, 0))
    if n != len(obj.data.vertices):
        return False
    try:
        entry = {"base": decode(raw_base, n), "offsets": {}}
        for luid, text in dict(obj.get(OFFSET_KEY, {})).items():
            entry["offsets"][luid] = decode(text, n)
    except (ValueError, TypeError):
        return False
    _cache[uid] = entry
    return True
