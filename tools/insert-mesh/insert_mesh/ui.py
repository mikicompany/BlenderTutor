"""The panel: a part palette, a mode switch, the live-boolean toggle, and the stack."""

import bpy
from bpy.types import Panel, UIList

from . import bridge
from .props import KIND_ITEMS, POLARITY_ITEMS

# lucide-free icon hints by polarity, reused by the list and the banner.
POLARITY_ICON = {"ADD": "ADD", "CUT": "REMOVE", "TRIM": "SELECT_INTERSECT"}


class INSERTMESH_UL_inserts(UIList):
    def draw_item(self, context, layout, data, item, icon, active_data, active_prop, index):
        kind_icon = next((k[3] for k in KIND_ITEMS if k[0] == item.kind), "MESH_CUBE")
        row = layout.row(align=True)
        row.label(text="", icon=kind_icon)
        row.prop(item, "name", text="", emboss=False)
        # The mode toggle sits on the row: flipping Add/Cut is the most common
        # edit after placing, so it should not need a trip to a sub-panel.
        row.prop_enum(item, "polarity", "ADD", text="")
        row.prop_enum(item, "polarity", "CUT", text="")
        row.prop_enum(item, "polarity", "TRIM", text="")


class INSERTMESH_PT_panel(Panel):
    bl_label = "Insert Mesh"
    bl_idname = "INSERTMESH_PT_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Insert"

    @classmethod
    def poll(cls, context):
        return context.object is not None and context.object.type == "MESH"

    def draw(self, context):
        layout = self.layout
        obj = context.object
        st = obj.insert_mesh

        # Part palette — the IMM shelf. Big buttons, pick then place.
        box = layout.box()
        box.label(text="Part", icon="MESH_DATA")
        grid = box.grid_flow(row_major=True, columns=5, align=True)
        for kind, label, _desc, kicon, _i in KIND_ITEMS:
            cell = grid.column(align=True)
            cell.prop_enum(st, "new_kind", kind, text="", icon=kicon)

        # Mode — the polarity you place with. Colour-cued by Blender's icons.
        row = box.row(align=True)
        for pol, label, _d, picon, _i in POLARITY_ITEMS:
            row.prop_enum(st, "new_polarity", pol, text=label, icon=picon)

        col = layout.column(align=True)
        col.scale_y = 1.3
        col.operator("insert_mesh.place", icon="RESTRICT_SELECT_OFF", text="Place on Surface")
        col.operator("insert_mesh.add_at_cursor", icon="PIVOT_CURSOR", text="Drop at Cursor")

        if not st.inserts:
            note = layout.column(align=True)
            note.scale_y = 0.8
            note.label(text="Pick a part, place it, pick another.", icon="INFO")
            note.label(text="Nothing is baked until you commit.")
            return

        layout.prop(st, "live", toggle=True,
                    icon="HIDE_OFF" if st.live else "HIDE_ON",
                    text="Live Boolean" if st.live else "Live Boolean (off)")

        row = layout.row()
        row.template_list("INSERTMESH_UL_inserts", "", st, "inserts", st, "active_index", rows=4)
        side = row.column(align=True)
        side.operator("insert_mesh.remove", icon="X", text="")

        if 0 <= st.active_index < len(st.inserts):
            active = st.inserts[st.active_index]
            sub = layout.row(align=True)
            sub.prop(active, "solver", text="Solver")

        box = layout.box()
        box.scale_y = 1.2
        box.operator("insert_mesh.commit", icon="CHECKMARK", text="Make Boolean (bake)")
        box.operator("insert_mesh.discard", icon="TRASH", text="Discard All")


CLASSES = (INSERTMESH_UL_inserts, INSERTMESH_PT_panel)


def register():
    for cls in CLASSES:
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(CLASSES):
        bpy.utils.unregister_class(cls)
