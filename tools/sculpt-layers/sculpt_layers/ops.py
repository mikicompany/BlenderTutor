"""Operators. One job each, and every one of them undoable."""

import bpy
from bpy.props import BoolProperty, EnumProperty
from bpy.types import Operator

from . import bridge, core


def _poll_mesh(context):
    obj = context.object
    return obj is not None and obj.type == 'MESH'


class _MeshOperator(Operator):
    bl_options = {'REGISTER', 'UNDO'}

    @classmethod
    def poll(cls, context):
        return _poll_mesh(context)


class SCULPTLAYERS_OT_add(_MeshOperator):
    """Add a layer. Strokes land here until you pick another one"""
    bl_idname = "sculpt_layers.add"
    bl_label = "Add Layer"

    def execute(self, context):
        obj = context.object
        st = obj.sculpt_layers
        # One click should be enough from a standing start, so adding the
        # first layer also snapshots the base.
        if not st.enabled or bridge.vertex_count_changed(obj):
            bridge.enable(obj)
        previous = st.active_index if st.layers else None
        layer = st.layers.add()
        layer.uid = bridge.new_uid()
        layer.name = bridge.unique_name(st, "Layer")
        bridge.set_offset(obj, layer, bridge.zeros(obj))
        st.active_index = len(st.layers) - 1
        bridge.sync_active_strength(obj, previous)
        return {'FINISHED'}


class SCULPTLAYERS_OT_remove(_MeshOperator):
    """Delete the active layer and the shape it contributed"""
    bl_idname = "sculpt_layers.remove"
    bl_label = "Delete Layer"

    @classmethod
    def poll(cls, context):
        return _poll_mesh(context) and len(context.object.sculpt_layers.layers) > 0

    def execute(self, context):
        obj = context.object
        st = obj.sculpt_layers
        idx = st.active_index
        bridge.drop_offset(obj, st.layers[idx])
        st.layers.remove(idx)
        st.active_index = min(idx, len(st.layers) - 1) if st.layers else 0
        bridge.rebuild(obj)
        return {'FINISHED'}


class SCULPTLAYERS_OT_move(_MeshOperator):
    """Move the active layer up or down the stack"""
    bl_idname = "sculpt_layers.move"
    bl_label = "Move Layer"

    direction: EnumProperty(items=[('UP', "Up", ""), ('DOWN', "Down", "")])

    @classmethod
    def poll(cls, context):
        return _poll_mesh(context) and len(context.object.sculpt_layers.layers) > 1

    def execute(self, context):
        st = context.object.sculpt_layers
        idx = st.active_index
        new = idx - 1 if self.direction == 'UP' else idx + 1
        if not 0 <= new < len(st.layers):
            return {'CANCELLED'}
        st.layers.move(idx, new)
        st.active_index = new
        # Order does not change the sum, so no rebuild is needed — this is
        # purely how the list reads to the user.
        return {'FINISHED'}


class SCULPTLAYERS_OT_duplicate(_MeshOperator):
    """Copy the active layer, including its shape"""
    bl_idname = "sculpt_layers.duplicate"
    bl_label = "Duplicate Layer"

    @classmethod
    def poll(cls, context):
        return _poll_mesh(context) and len(context.object.sculpt_layers.layers) > 0

    def execute(self, context):
        obj = context.object
        st = obj.sculpt_layers
        src = st.layers[st.active_index]
        src_offset = bridge.offset_of(obj, src).copy()
        previous = st.active_index

        new = st.layers.add()
        new.uid = bridge.new_uid()
        new.name = bridge.unique_name(st, src.name + " Copy")
        new.strength = src.strength
        new.visible = src.visible
        bridge.set_offset(obj, new, src_offset)

        st.layers.move(len(st.layers) - 1, st.active_index + 1)
        st.active_index = previous + 1
        bridge.sync_active_strength(obj, previous)
        bridge.rebuild(obj)
        return {'FINISHED'}


class SCULPTLAYERS_OT_merge_down(_MeshOperator):
    """Flatten the active layer into the one below it"""
    bl_idname = "sculpt_layers.merge_down"
    bl_label = "Merge Down"

    @classmethod
    def poll(cls, context):
        st = context.object.sculpt_layers if _poll_mesh(context) else None
        return bool(st and st.active_index > 0 and len(st.layers) > 1)

    def execute(self, context):
        obj = context.object
        st = obj.sculpt_layers
        idx = st.active_index
        upper, lower = st.layers[idx], st.layers[idx - 1]
        combined = core.merge(
            bridge.offset_of(obj, lower), lower.strength,
            bridge.offset_of(obj, upper), upper.strength,
        )
        bridge.set_offset(obj, lower, combined)
        # The merged result already carries both strengths.
        lower.strength = 1.0
        lower.stored_strength = 1.0
        bridge.drop_offset(obj, upper)
        st.layers.remove(idx)
        st.active_index = idx - 1
        bridge.rebuild(obj)
        return {'FINISHED'}


class SCULPTLAYERS_OT_clear(_MeshOperator):
    """Empty the active layer without deleting it"""
    bl_idname = "sculpt_layers.clear"
    bl_label = "Clear Layer"

    @classmethod
    def poll(cls, context):
        return _poll_mesh(context) and len(context.object.sculpt_layers.layers) > 0

    def execute(self, context):
        obj = context.object
        st = obj.sculpt_layers
        bridge.set_offset(obj, st.layers[st.active_index], bridge.zeros(obj))
        bridge.rebuild(obj)
        return {'FINISHED'}


class SCULPTLAYERS_OT_apply_all(_MeshOperator):
    """Bake every layer into the mesh and stop tracking layers"""
    bl_idname = "sculpt_layers.apply_all"
    bl_label = "Apply All Layers"

    @classmethod
    def poll(cls, context):
        return _poll_mesh(context) and context.object.sculpt_layers.enabled

    def execute(self, context):
        obj = context.object
        bridge.rebuild(obj)             # make sure the mesh is current first
        bridge.disable(obj, keep_shape=True)
        self.report({'INFO'}, "Layers applied to the mesh")
        return {'FINISHED'}


class SCULPTLAYERS_OT_discard(_MeshOperator):
    """Throw away every layer and return the mesh to its base shape"""
    bl_idname = "sculpt_layers.discard"
    bl_label = "Discard All Layers"

    @classmethod
    def poll(cls, context):
        return _poll_mesh(context) and context.object.sculpt_layers.enabled

    def invoke(self, context, event):
        return context.window_manager.invoke_confirm(self, event)

    def execute(self, context):
        bridge.disable(context.object, keep_shape=False)
        self.report({'INFO'}, "Layers discarded, mesh returned to base")
        return {'FINISHED'}


class SCULPTLAYERS_OT_rebase(_MeshOperator):
    """Take the current mesh as the new base after a topology change"""
    bl_idname = "sculpt_layers.rebase"
    bl_label = "Reset Base To Current Mesh"

    def execute(self, context):
        bridge.enable(context.object)
        self.report({'WARNING'}, "Base reset — previous layers were discarded")
        return {'FINISHED'}


CLASSES = (
    SCULPTLAYERS_OT_add,
    SCULPTLAYERS_OT_remove,
    SCULPTLAYERS_OT_move,
    SCULPTLAYERS_OT_duplicate,
    SCULPTLAYERS_OT_merge_down,
    SCULPTLAYERS_OT_clear,
    SCULPTLAYERS_OT_apply_all,
    SCULPTLAYERS_OT_discard,
    SCULPTLAYERS_OT_rebase,
)


def register():
    for cls in CLASSES:
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(CLASSES):
        bpy.utils.unregister_class(cls)
