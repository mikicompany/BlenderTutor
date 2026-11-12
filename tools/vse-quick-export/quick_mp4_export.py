bl_info = {
    "name": "Quick MP4 Export (VSE)",
    "author": "Blender Tutoring",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "Video Sequencer > Sidebar (N) > Export",
    "description": "One click sets Output to a standard MP4 (H.264 + AAC) so your edit renders as a video, not a folder of stills.",
    "doc_url": "https://www.blendertutoring.com/blog/video-editing-in-blender",
    "category": "Sequencer",
}

import bpy

# Quality maps to H.264's constant rate factor: lower CRF = better/bigger.
QUALITY_ITEMS = [
    ('HIGH', "High (larger file)", "Best quality, bigger file"),
    ('MEDIUM', "Medium (recommended)", "Good quality at a reasonable size"),
    ('LOW', "Small (smaller file)", "Lower quality, smallest file"),
]


def apply_mp4_output(scene, quality='MEDIUM', with_audio=True):
    """Configure a scene to render its VSE edit as an MP4 (H.264 + AAC)."""
    r = scene.render
    # The #1 beginner trap: without this the VSE edit is ignored and the empty
    # 3D scene renders instead.
    r.use_sequencer = True
    # FFmpeg Video — otherwise you get a folder of PNGs, not a movie.
    r.image_settings.file_format = 'FFMPEG'
    ff = r.ffmpeg
    ff.format = 'MPEG4'          # .mp4 container
    ff.codec = 'H264'           # the plays-everywhere video codec
    ff.constant_rate_factor = quality
    ff.ffmpeg_preset = 'GOOD'
    ff.gopsize = 18
    if with_audio:
        ff.audio_codec = 'AAC'   # without this the export is silent
        ff.audio_bitrate = 192
    else:
        ff.audio_codec = 'NONE'


def is_ready(scene):
    r = scene.render
    ff = r.ffmpeg
    return (r.use_sequencer
            and r.image_settings.file_format == 'FFMPEG'
            and ff.format == 'MPEG4'
            and ff.codec == 'H264')


class SEQUENCER_OT_quick_mp4_setup(bpy.types.Operator):
    bl_idname = "sequencer.quick_mp4_setup"
    bl_label = "Set Up MP4 Export"
    bl_description = ("Configure Output to render this edit as an MP4 "
                     "(FFmpeg Video / MPEG-4 / H.264 / AAC)")
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        s = context.scene
        apply_mp4_output(s, s.quick_mp4_quality, s.quick_mp4_audio)
        self.report({'INFO'},
                    "Output set to MP4 (H.264 + AAC). Now use Render > Render Animation.")
        return {'FINISHED'}


class SEQUENCER_OT_quick_mp4_render(bpy.types.Operator):
    bl_idname = "sequencer.quick_mp4_render"
    bl_label = "Set Up & Render MP4"
    bl_description = "Configure MP4 output, then render the animation now"
    bl_options = {'REGISTER'}

    def execute(self, context):
        s = context.scene
        apply_mp4_output(s, s.quick_mp4_quality, s.quick_mp4_audio)
        if not s.render.filepath or s.render.filepath.strip() in ("", "/tmp\\", "//"):
            self.report({'WARNING'},
                        "Pick an output location in Output Properties first, then render.")
            return {'CANCELLED'}
        bpy.ops.render.render('INVOKE_DEFAULT', animation=True)
        return {'FINISHED'}


class SEQUENCER_PT_quick_mp4(bpy.types.Panel):
    bl_label = "Quick MP4 Export"
    bl_space_type = 'SEQUENCE_EDITOR'
    bl_region_type = 'UI'
    bl_category = "Export"

    def draw(self, context):
        layout = self.layout
        s = context.scene

        col = layout.column(align=True)
        col.prop(s, "quick_mp4_quality")
        col.prop(s, "quick_mp4_audio")

        layout.operator("sequencer.quick_mp4_setup", icon='SETTINGS')
        layout.operator("sequencer.quick_mp4_render", icon='RENDER_ANIMATION')

        box = layout.box()
        if is_ready(s):
            box.label(text="Ready: MP4 / H.264 + AAC", icon='CHECKMARK')
        else:
            box.label(text="Not set up yet — click above", icon='INFO')


classes = (
    SEQUENCER_OT_quick_mp4_setup,
    SEQUENCER_OT_quick_mp4_render,
    SEQUENCER_PT_quick_mp4,
)


def register():
    bpy.types.Scene.quick_mp4_quality = bpy.props.EnumProperty(
        name="Quality", items=QUALITY_ITEMS, default='MEDIUM')
    bpy.types.Scene.quick_mp4_audio = bpy.props.BoolProperty(
        name="Include audio (AAC)", default=True)
    for c in classes:
        bpy.utils.register_class(c)


def unregister():
    for c in reversed(classes):
        bpy.utils.unregister_class(c)
    del bpy.types.Scene.quick_mp4_quality
    del bpy.types.Scene.quick_mp4_audio


if __name__ == "__main__":
    register()
