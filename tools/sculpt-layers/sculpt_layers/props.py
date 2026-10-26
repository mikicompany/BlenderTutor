"""Per-object layer list.

Kept small on purpose: anything that moves a vertex lives in bridge.
"""

import bpy
from bpy.props import (
    BoolProperty, CollectionProperty, FloatProperty, IntProperty, StringProperty,
)
from bpy.types import Object, PropertyGroup

from . import bridge


def _redraw_mesh(self, context):
    obj = context.object if context else None
    if obj is not None and bridge.is_active(obj):
        bridge.rebuild(obj)


def _solo_changed(self, context):
    # Solo is one-at-a-time; turning one on turns the rest off.
    if self.solo:
        st = bridge.settings(context.object) if context else None
        if st:
            for layer in st.layers:
                if layer != self:
                    layer["solo"] = False
    _redraw_mesh(self, context)


class SculptLayer(PropertyGroup):
    uid: StringProperty(
        name="UID",
        description="Internal identifier linking this layer to its vertex data",
    )
    name: StringProperty(name="Name", default="Layer", options=set())
    strength: FloatProperty(
        name="Strength",
        description=(
            "How much of this layer is applied. The active layer is always "
            "shown at full strength while you sculpt on it"
        ),
        default=1.0, soft_min=0.0, soft_max=1.0, min=-2.0, max=2.0,
        subtype='FACTOR', update=_redraw_mesh,
    )
    stored_strength: FloatProperty(
        name="Stored Strength",
        description="The strength to hand back when this layer stops being active",
        default=1.0, min=-2.0, max=2.0,
    )
    visible: BoolProperty(
        name="Visible", default=True,
        description="Show this layer's contribution",
        update=_redraw_mesh,
    )
    locked: BoolProperty(
        name="Locked", default=False,
        description="Keep strokes out of this layer, even when it is selected",
    )
    solo: BoolProperty(
        name="Solo", default=False,
        description="Show only this layer",
        update=_solo_changed,
    )


def _active_changed(self, context):
    obj = context.object if context else None
    if obj is None:
        return
    previous = self.get("_previous_index", -1)
    bridge.sync_active_strength(obj, previous if previous >= 0 else None)
    self["_previous_index"] = self.active_index
    bridge.rebuild(obj)


class SculptLayerSettings(PropertyGroup):
    enabled: BoolProperty(
        name="Layers Enabled", default=False,
        description="Whether this object is under layer control",
    )
    layers: CollectionProperty(type=SculptLayer)
    active_index: IntProperty(name="Active Layer", default=0, update=_active_changed)
    auto_capture: BoolProperty(
        name="Record Strokes", default=True,
        description=(
            "Send sculpt strokes to the active layer as you make them. "
            "Turn off to move vertices without recording"
        ),
    )


CLASSES = (SculptLayer, SculptLayerSettings)


def register():
    for cls in CLASSES:
        bpy.utils.register_class(cls)
    Object.sculpt_layers = bpy.props.PointerProperty(type=SculptLayerSettings)


def unregister():
    del Object.sculpt_layers
    for cls in reversed(CLASSES):
        bpy.utils.unregister_class(cls)
