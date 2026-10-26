"""Insert Mesh + Live Boolean — ZBrush-style part insertion for Blender.

Prototype. See README.md for what works, what does not, and why.
"""

bl_info = {
    "name": "Insert Mesh + Live Boolean",
    "author": "Blender Tutoring",
    "version": (0, 1, 0),
    "blender": (4, 0, 0),
    "location": "3D Viewport > Sidebar (N) > Insert",
    "description": "Stamp library parts onto a surface and boolean them live",
    "category": "Modeling",
}

from . import ops, props, ui  # noqa: E402

MODULES = (props, ops, ui)


def register():
    for module in MODULES:
        module.register()


def unregister():
    for module in reversed(MODULES):
        module.unregister()


if __name__ == "__main__":
    register()
