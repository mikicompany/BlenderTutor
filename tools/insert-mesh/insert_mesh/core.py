"""Geometry for Insert Mesh + Live Boolean.

Everything here is free of operators, panels and context so it can be
exercised headless. It needs `bmesh` and `mathutils`, which Blender always
provides, but no `bpy.context` and no scene — the tests drive it directly.

The ZBrush ideas this maps onto
-------------------------------
Insert Mesh (IMM): pick a part, click on the surface, and it lands there
oriented to the surface normal and scaled by the drag. `placement_matrix`
is that click resolved to a transform.

Live Boolean: inserted parts carry a polarity — Add, Cut or Intersect — and
the combined result is shown live before anything is committed. The polarity
values map straight onto Blender's Boolean modifier operations, which is why
this prototype is non-destructive for free: nothing is baked until you ask.
"""

import bmesh
from mathutils import Matrix, Quaternion, Vector

# Insert part library. Each is built to sit inside a unit box, so a fresh
# insert is a sensible size before the user scales it.
KINDS = ("CUBE", "SPHERE", "CYLINDER", "CONE", "WEDGE")

# Polarity -> Boolean modifier operation.
POLARITY_OP = {
    "ADD": "UNION",
    "CUT": "DIFFERENCE",
    "TRIM": "INTERSECT",
}
POLARITIES = tuple(POLARITY_OP)


# ── placement ─────────────────────────────────────────────────────────

def placement_matrix(hit, normal, scale=1.0, roll=0.0, sink=0.0):
    """Where a click on the surface puts the insert.

    hit     world-space point the cursor ray struck
    normal  surface normal there (need not be unit length)
    scale   uniform scale, or an (x, y, z) triple
    roll    spin about the normal, in radians
    sink    push the insert into the surface by this much along -normal,
            so a cutter straddles the surface instead of resting on it

    The insert's convention is local +Z is "up out of the surface". The
    returned matrix maps local +Z onto the normal, regardless of roll.
    """
    n = Vector(normal)
    if n.length == 0.0:
        n = Vector((0.0, 0.0, 1.0))
    n = n.normalized()

    align = n.to_track_quat("Z", "Y")
    rot = align @ Quaternion(Vector((0.0, 0.0, 1.0)), roll)

    if isinstance(scale, (int, float)):
        scale = (scale, scale, scale)
    scale_m = Matrix.Diagonal(Vector((scale[0], scale[1], scale[2], 1.0)))

    origin = Vector(hit) - n * sink
    return Matrix.Translation(origin) @ rot.to_matrix().to_4x4() @ scale_m


# ── insert part library ───────────────────────────────────────────────

def build_primitive(kind):
    """A new bmesh for one library part. Caller owns it and must free it."""
    if kind not in KINDS:
        raise ValueError(f"unknown insert kind: {kind}")
    bm = bmesh.new()
    if kind == "CUBE":
        bmesh.ops.create_cube(bm, size=1.0)
    elif kind == "SPHERE":
        _uvsphere(bm, radius=0.5, u=28, v=16)
    elif kind == "CYLINDER":
        _cone(bm, r1=0.5, r2=0.5, depth=1.0, segments=28)
    elif kind == "CONE":
        _cone(bm, r1=0.5, r2=0.0, depth=1.0, segments=28)
    elif kind == "WEDGE":
        _wedge(bm)
    bm.normal_update()
    return bm


def _uvsphere(bm, radius, u, v):
    # bmesh renamed the radius argument between versions; try the modern
    # spelling first and fall back so the add-on survives on 3.x and 4.x.
    try:
        bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=radius)
    except TypeError:
        bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, diameter=radius)


def _cone(bm, r1, r2, depth, segments):
    bmesh.ops.create_cone(
        bm, cap_ends=True, cap_tris=False, segments=segments,
        radius1=r1, radius2=r2, depth=depth,
    )


def _wedge(bm):
    """A right-triangular prism — the part ZBrush users reach for to cut chamfers."""
    bmesh.ops.create_cube(bm, size=1.0)
    # Collapse the top edge to one side, turning the square profile into a
    # triangle while keeping the mesh closed.
    for vert in bm.verts:
        if vert.co.z > 0.0:
            vert.co.x = -0.5
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)


# ── measurement, for verifying booleans did what was asked ─────────────

def volume(bm):
    """Enclosed volume of a closed bmesh."""
    return bm.calc_volume(signed=False)


def is_closed(bm):
    """True when every edge borders exactly two faces (watertight).

    A cutter that is not closed produces unpredictable boolean results, so
    the library is tested against this rather than it being assumed.
    """
    return all(len(edge.link_faces) == 2 for edge in bm.edges)


def mesh_volume(mesh):
    """Enclosed volume of a bpy mesh datablock, via a throwaway bmesh."""
    bm = bmesh.new()
    bm.from_mesh(mesh)
    try:
        return bm.calc_volume(signed=False)
    finally:
        bm.free()
