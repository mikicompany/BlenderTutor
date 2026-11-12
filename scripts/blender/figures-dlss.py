"""Hero for the DLSS-in-Blender article: an honest noisy-vs-clean illustration
of what a viewport denoiser does — few path-traced samples (grainy) on one
side, the resolved clean image on the other. Renders the SAME scene twice.

Run: blender -b -P scripts/blender/figures-dlss.py
"""
import bpy, math
from mathutils import Vector
OUT = "/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/dlss/"

def scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = bpy.context.scene
    S.render.engine = 'CYCLES'
    S.cycles.device = 'CPU'
    S.cycles.use_denoising = False
    S.render.resolution_x = S.render.resolution_y = 900
    S.world = bpy.data.worlds.new("w"); S.world.use_nodes = True
    bg = S.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.03, 0.035, 0.05, 1); bg.inputs[1].default_value = 0.4
    def mat(rgb, rough, metal=0.0):
        m = bpy.data.materials.new("m"); m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (*rgb, 1)
        b.inputs["Roughness"].default_value = rough
        b.inputs["Metallic"].default_value = metal
        return m
    # warm floor (bounces colour = visible GI noise)
    bpy.ops.mesh.primitive_plane_add(size=20)
    bpy.context.object.data.materials.append(mat((0.55, 0.32, 0.18), 0.7))
    # back wall for bounce/occlusion
    bpy.ops.mesh.primitive_plane_add(size=20, location=(0,3.2,0), rotation=(math.radians(90),0,0))
    bpy.context.object.data.materials.append(mat((0.3,0.35,0.45), 0.8))
    def sphere(x,y,z,r,m):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z), segments=48, ring_count=24)
        o=bpy.context.object; o.data.materials.append(m)
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
        bpy.context.view_layer.objects.active=o; bpy.ops.object.shade_smooth()
    sphere(-0.95,0.4,0.6,0.6, mat((0.75,0.75,0.78),0.12,1.0))   # metal
    sphere(0.5,-0.2,0.5,0.5, mat((0.85,0.2,0.15),0.35))          # red
    sphere(1.35,0.8,0.42,0.42, mat((0.2,0.45,0.75),0.2))         # blue glossy
    bpy.ops.mesh.primitive_cube_add(size=0.9, location=(-0.1,1.0,0.45))
    bev=bpy.context.object.modifiers.new("b",'BEVEL'); bev.width=0.04; bev.segments=3
    bpy.context.object.data.materials.append(mat((0.85,0.7,0.25),0.4))
    # a single soft area light → soft shadows + GI (noisy at low samples)
    bpy.ops.object.light_add(type='AREA', location=(-2.2,-2.4,3.4))
    L=bpy.context.object.data; L.energy=1400; L.size=2.5
    v=Vector((0,0,0.3))-bpy.context.object.location
    bpy.context.object.rotation_euler=v.to_track_quat('-Z','Y').to_euler()
    cd=bpy.data.cameras.new("c"); c=bpy.data.objects.new("c",cd)
    bpy.context.collection.objects.link(c); S.camera=c
    c.location=(0.2,-3.9,1.7); cd.lens=50
    v=Vector((0.1,0.3,0.4))-c.location; c.rotation_euler=v.to_track_quat('-Z','Y').to_euler()
    return S

S=scene(); S.cycles.samples=6
S.render.filepath=OUT+"dlss_noisy.png"; bpy.ops.render.render(write_still=True); print("NOISY DONE")
S.cycles.samples=320
S.render.filepath=OUT+"dlss_clean.png"; bpy.ops.render.render(write_still=True); print("CLEAN DONE")
print("DONE")
