"""Sculpt Layers — non-destructive layers for Blender's sculpt mode.

Prototype. See README.md for what works, what does not, and why.
"""

bl_info = {
    "name": "Sculpt Layers",
    "author": "Blender Tutoring",
    "version": (0, 1, 0),
    "blender": (4, 0, 0),
    "location": "3D Viewport > Sidebar (N) > Layers",
    "description": "Non-destructive sculpt layers with per-layer strength",
    "category": "Sculpting",
}

from . import bridge, core, handlers, ops, props, ui  # noqa: E402

MODULES = (props, ops, ui, handlers)


def register():
    for module in MODULES:
        module.register()


def unregister():
    for module in reversed(MODULES):
        module.unregister()
    core.clear_cache()


if __name__ == "__main__":
    register()
