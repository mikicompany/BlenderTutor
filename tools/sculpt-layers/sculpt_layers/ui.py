"""The panel.

Two things drive the layout:

  1. It sits in the 3D viewport sidebar, so it is one N keypress away
     while sculpting rather than a trip to the Properties editor.
  2. Every layer's strength slider is on its own row. Scrubbing a layer
     you are not currently on is the whole point of layered sculpting,
     and making that cost a click to select first would undo the idea.
"""

import bpy
from bpy.types import Panel, UIList

from . import bridge

# Above this, the per-update capture starts to be noticeable. Measured on
# nothing — it is a prototype's honest guess, not a benchmark.
DENSE_MESH_VERTS = 300_000


class SCULPTLAYERS_UL_layers(UIList):
    def draw_item(self, context, layout, data, item, icon, active_data, active_prop, index):
        st = data
        is_active = index == st.active_index
        soloed = any(l.solo for l in st.layers)

        row = layout.row(align=True)
        row.prop(item, "visible", text="",
                 icon='HIDE_OFF' if item.visible else 'HIDE_ON', emboss=False)
        row.prop(item, "name", text="", emboss=False,
                 icon='GREASEPENCIL' if is_active else 'NONE')

        # The active layer records at full strength, so its slider is shown
        # locked rather than hidden — hiding it looks like a bug.
        sub = row.row(align=True)
        sub.scale_x = 0.62
        sub.enabled = not is_active and not soloed
        sub.prop(item, "strength", text="", slider=True)

        row.prop(item, "solo", text="",
                 icon='SOLO_ON' if item.solo else 'SOLO_OFF', emboss=False)
        row.prop(item, "locked", text="",
                 icon='LOCKED' if item.locked else 'UNLOCKED', emboss=False)


class SCULPTLAYERS_PT_panel(Panel):
    bl_label = "Sculpt Layers"
    bl_idname = "SCULPTLAYERS_PT_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Layers"

    @classmethod
    def poll(cls, context):
        return context.object is not None and context.object.type == 'MESH'

    def draw(self, context):
        layout = self.layout
        obj = context.object
        st = obj.sculpt_layers

        if bridge.vertex_count_changed(obj):
            self._draw_broken(layout)
            return

        if not st.enabled or not st.layers:
            self._draw_empty(layout)
            return

        self._draw_recording_banner(layout, context, st)

        row = layout.row()
        row.template_list(
            "SCULPTLAYERS_UL_layers", "", st, "layers", st, "active_index", rows=4,
        )

        side = row.column(align=True)
        side.operator("sculpt_layers.add", icon='ADD', text="")
        side.operator("sculpt_layers.remove", icon='REMOVE', text="")
        side.separator()
        side.operator("sculpt_layers.move", icon='TRIA_UP', text="").direction = 'UP'
        side.operator("sculpt_layers.move", icon='TRIA_DOWN', text="").direction = 'DOWN'
        side.separator()
        side.operator("sculpt_layers.duplicate", icon='DUPLICATE', text="")

        col = layout.column(align=True)
        col.operator("sculpt_layers.merge_down", icon='TRIA_DOWN_BAR')
        col.operator("sculpt_layers.clear", icon='X')

        layout.prop(st, "auto_capture", toggle=True,
                    icon='REC' if st.auto_capture else 'PAUSE')

    # ── states ────────────────────────────────────────────────────────

    def _draw_empty(self, layout):
        col = layout.column(align=True)
        col.scale_y = 1.4
        col.operator("sculpt_layers.add", icon='ADD', text="Start Sculpting In Layers")
        note = layout.column(align=True)
        note.scale_y = 0.8
        note.label(text="Your current shape becomes the base.", icon='INFO')
        note.label(text="Everything after that is undoable per layer.")

    def _draw_broken(self, layout):
        box = layout.box()
        col = box.column(align=True)
        col.label(text="Vertex count changed", icon='ERROR')
        col.scale_y = 0.85
        col.label(text="Layers store a position per vertex, so")
        col.label(text="Dyntopo and remeshing break the link.")
        box.operator("sculpt_layers.rebase", icon='FILE_REFRESH')

    def _draw_recording_banner(self, layout, context, st):
        """Say where strokes are going. Guessing is the thing that burns people."""
        idx = max(0, min(st.active_index, len(st.layers) - 1))
        layer = st.layers[idx]
        box = layout.box()
        row = box.row(align=True)
        if context.mode != 'SCULPT':
            row.label(text="Not in Sculpt Mode", icon='INFO')
        elif not st.auto_capture:
            row.label(text="Recording paused", icon='PAUSE')
        elif layer.locked:
            row.label(text=f"{layer.name} is locked", icon='LOCKED')
        elif not layer.visible:
            row.label(text=f"{layer.name} is hidden", icon='HIDE_ON')
        else:
            row.label(text=f"Recording to: {layer.name}", icon='REC')

        # Capture reads every vertex position after each depsgraph update.
        # That is fine at sculpting densities most people work at and gets
        # expensive well before Blender itself does, so say so rather than
        # letting it be discovered as mystery lag.
        if len(context.object.data.vertices) > DENSE_MESH_VERTS:
            note = box.column(align=True)
            note.scale_y = 0.8
            note.label(text="Dense mesh — recording may lag", icon='INFO')


class SCULPTLAYERS_PT_manage(Panel):
    bl_label = "Manage"
    bl_parent_id = "SCULPTLAYERS_PT_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "Layers"
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(cls, context):
        obj = context.object
        return obj is not None and obj.type == 'MESH' and obj.sculpt_layers.enabled

    def draw(self, context):
        col = self.layout.column(align=True)
        col.operator("sculpt_layers.apply_all", icon='CHECKMARK')
        col.operator("sculpt_layers.discard", icon='TRASH')


CLASSES = (SCULPTLAYERS_UL_layers, SCULPTLAYERS_PT_panel, SCULPTLAYERS_PT_manage)


def register():
    for cls in CLASSES:
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(CLASSES):
        bpy.utils.unregister_class(cls)
