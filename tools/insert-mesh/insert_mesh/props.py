"""Per-object insert stack."""

import bpy
from bpy.props import (
    BoolProperty, CollectionProperty, EnumProperty, IntProperty,
    PointerProperty, StringProperty,
)
from bpy.types import Object, PropertyGroup

from . import bridge, core

KIND_ITEMS = [
    ("CUBE", "Cube", "Box part", "MESH_CUBE", 0),
    ("SPHERE", "Sphere", "Sphere part", "MESH_UVSPHERE", 1),
    ("CYLINDER", "Cylinder", "Cylinder part", "MESH_CYLINDER", 2),
    ("CONE", "Cone", "Cone part", "MESH_CONE", 3),
    ("WEDGE", "Wedge", "Triangular prism, for chamfers", "MOD_BEVEL", 4),
]

# Colour cues follow the ZBrush convention: additive green, subtractive red.
POLARITY_ITEMS = [
    ("ADD", "Add", "Union: fuse this part onto the surface", "ADD", 0),
    ("CUT", "Cut", "Difference: carve this part out of the surface", "REMOVE", 1),
    ("TRIM", "Intersect", "Keep only where this part overlaps the surface", "SELECT_INTERSECT", 2),
]

SOLVER_ITEMS = [
    ("EXACT", "Exact", "Slower, handles coplanar faces and touching geometry"),
    ("FAST", "Fast", "Quicker, best when parts clearly overlap"),
]


# These callbacks sync the modifier directly and never write back to a
# property, so they cannot re-trigger themselves. `self` is the InsertItem for
# the first two and the InsertMeshSettings for the third.
def _polarity_changed(self, context):
    bridge.sync_modifier(self)


def _solver_changed(self, context):
    bridge.sync_modifier(self)


def _live_changed(self, context):
    bridge.sync_live(self)


class InsertItem(PropertyGroup):
    name: StringProperty(name="Name", default="Insert")
    kind: EnumProperty(name="Part", items=KIND_ITEMS, default="CUBE")
    polarity: EnumProperty(
        name="Mode", items=POLARITY_ITEMS, default="CUT", update=_polarity_changed,
    )
    solver: EnumProperty(
        name="Solver", items=SOLVER_ITEMS, default="EXACT", update=_solver_changed,
    )
    cutter: PointerProperty(type=Object)
    modifier: StringProperty()


class InsertMeshSettings(PropertyGroup):
    inserts: CollectionProperty(type=InsertItem)
    active_index: IntProperty(name="Active Insert", default=0)
    live: BoolProperty(
        name="Live Boolean", default=True,
        description="Show the combined boolean result in the viewport",
        update=_live_changed,
    )
    # Defaults for the next insert placed.
    new_kind: EnumProperty(name="Part", items=KIND_ITEMS, default="CUBE")
    new_polarity: EnumProperty(name="Mode", items=POLARITY_ITEMS, default="CUT")
    new_solver: EnumProperty(name="Solver", items=SOLVER_ITEMS, default="EXACT")


CLASSES = (InsertItem, InsertMeshSettings)


def register():
    for cls in CLASSES:
        bpy.utils.register_class(cls)
    Object.insert_mesh = PointerProperty(type=InsertMeshSettings)


def unregister():
    del Object.insert_mesh
    for cls in reversed(CLASSES):
        bpy.utils.unregister_class(cls)
