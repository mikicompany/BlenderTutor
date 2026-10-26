"""Operators.

Two kinds: plain-execute ones that the tests drive directly, and one modal
placement operator that does the ZBrush-style click-on-surface and therefore
cannot run headless. The placement maths it relies on lives in core and is
tested on its own.
"""

import bpy
from bpy.props import EnumProperty
from bpy.types import Operator
from mathutils import Vector

from . import bridge, core


def _poll_mesh(context):
    obj = context.object
    return obj is not None and obj.type == "MESH"


class _MeshOperator(Operator):
    bl_options = {"REGISTER", "UNDO"}

    @classmethod
    def poll(cls, context):
        return _poll_mesh(context)


class INSERTMESH_OT_add_at_cursor(_MeshOperator):
    """Drop the current part at the 3D cursor"""
    bl_idname = "insert_mesh.add_at_cursor"
    bl_label = "Insert at Cursor"

    def execute(self, context):
        obj = context.object
        st = obj.insert_mesh
        cursor = context.scene.cursor.location.copy()
        # In target-local terms the cursor sits here; place standing up.
        local = obj.matrix_world.inverted() @ cursor
        matrix = obj.matrix_world @ core.placement_matrix(
            local, Vector((0.0, 0.0, 1.0)), scale=0.5,
        )
        bridge.place_insert(
            obj, st.new_kind, matrix, polarity=st.new_polarity, solver=st.new_solver,
        )
        return {"FINISHED"}


class INSERTMESH_OT_place(_MeshOperator):
    """Click the surface to place the part; move to scale, wheel to spin, Tab flips Add/Cut"""
    bl_idname = "insert_mesh.place"
    bl_label = "Place Insert"

    def invoke(self, context, event):
        if context.space_data is None or context.space_data.type != "VIEW_3D":
            self.report({"WARNING"}, "Run this in the 3D viewport")
            return {"CANCELLED"}
        self.target = context.object
        self.polarity = context.object.insert_mesh.new_polarity
        self.roll = 0.0
        self.item = None
        context.window_manager.modal_handler_add(self)
        return {"RUNNING_MODAL"}

    def _ray(self, context, event):
        """Raycast the mouse into the scene; return (hit, location, normal)."""
        from bpy_extras import view3d_utils
        region = context.region
        rv3d = context.region_data
        coord = (event.mouse_region_x, event.mouse_region_y)
        origin = view3d_utils.region_2d_to_origin_3d(region, rv3d, coord)
        direction = view3d_utils.region_2d_to_vector_3d(region, rv3d, coord)
        depsgraph = context.evaluated_depsgraph_get()
        hit, loc, normal, *_ = context.scene.ray_cast(depsgraph, origin, direction)
        return hit, loc, normal

    def modal(self, context, event):
        st = self.target.insert_mesh
        if event.type == "MOUSEMOVE":
            hit, loc, normal = self._ray(context, event)
            if hit:
                matrix = core.placement_matrix(loc, normal, scale=0.4, roll=self.roll, sink=0.2)
                if self.item is None:
                    self.item = bridge.place_insert(
                        self.target, st.new_kind, matrix,
                        polarity=self.polarity, solver=st.new_solver,
                    )
                else:
                    self.item.cutter.matrix_world = matrix
            return {"RUNNING_MODAL"}
        if event.type == "WHEELUPMOUSE":
            self.roll += 0.1
            return {"RUNNING_MODAL"}
        if event.type == "WHEELDOWNMOUSE":
            self.roll -= 0.1
            return {"RUNNING_MODAL"}
        if event.type == "TAB" and event.value == "PRESS":
            self.polarity = "ADD" if self.polarity == "CUT" else "CUT"
            if self.item is not None:
                bridge.set_polarity(self.target, self.item, self.polarity)
            return {"RUNNING_MODAL"}
        if event.type in {"LEFTMOUSE", "RET"} and event.value == "PRESS":
            return {"FINISHED"} if self.item is not None else {"CANCELLED"}
        if event.type in {"RIGHTMOUSE", "ESC"} and event.value == "PRESS":
            if self.item is not None:
                bridge.remove_insert(self.target, len(st.inserts) - 1)
            return {"CANCELLED"}
        return {"RUNNING_MODAL"}


class INSERTMESH_OT_set_polarity(_MeshOperator):
    """Set the active insert's mode"""
    bl_idname = "insert_mesh.set_polarity"
    bl_label = "Set Mode"

    polarity: EnumProperty(items=[(p, p.title(), "") for p in core.POLARITIES])

    @classmethod
    def poll(cls, context):
        return _poll_mesh(context) and len(context.object.insert_mesh.inserts) > 0

    def execute(self, context):
        st = context.object.insert_mesh
        bridge.set_polarity(context.object, st.inserts[st.active_index], self.polarity)
        return {"FINISHED"}


class INSERTMESH_OT_remove(_MeshOperator):
    """Delete the active insert"""
    bl_idname = "insert_mesh.remove"
    bl_label = "Delete Insert"

    @classmethod
    def poll(cls, context):
        return _poll_mesh(context) and len(context.object.insert_mesh.inserts) > 0

    def execute(self, context):
        bridge.remove_insert(context.object, context.object.insert_mesh.active_index)
        return {"FINISHED"}


class INSERTMESH_OT_commit(_MeshOperator):
    """Bake the boolean into the mesh and clear the inserts"""
    bl_idname = "insert_mesh.commit"
    bl_label = "Make Boolean"

    @classmethod
    def poll(cls, context):
        return _poll_mesh(context) and len(context.object.insert_mesh.inserts) > 0

    def execute(self, context):
        n = len(context.object.insert_mesh.inserts)
        bridge.commit(context.object)
        self.report({"INFO"}, f"Baked {n} insert(s) into the mesh")
        return {"FINISHED"}


class INSERTMESH_OT_discard(_MeshOperator):
    """Remove every insert and leave the mesh as it was"""
    bl_idname = "insert_mesh.discard"
    bl_label = "Discard Inserts"

    @classmethod
    def poll(cls, context):
        return _poll_mesh(context) and len(context.object.insert_mesh.inserts) > 0

    def invoke(self, context, event):
        return context.window_manager.invoke_confirm(self, event)

    def execute(self, context):
        bridge.clear(context.object, keep_shape=False)
        self.report({"INFO"}, "Inserts discarded")
        return {"FINISHED"}


CLASSES = (
    INSERTMESH_OT_add_at_cursor,
    INSERTMESH_OT_place,
    INSERTMESH_OT_set_polarity,
    INSERTMESH_OT_remove,
    INSERTMESH_OT_commit,
    INSERTMESH_OT_discard,
)


def register():
    for cls in CLASSES:
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(CLASSES):
        bpy.utils.unregister_class(cls)
