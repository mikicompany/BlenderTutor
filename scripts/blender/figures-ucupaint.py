"""Hero for the Ucupaint article: a real rust-and-metal textured object,
rendered in Cycles with a procedural layered material (steel base + rust in
cavities + edge wear). Alpha output; framed with a layer panel in HTML."""
import bpy, math
from mathutils import Vector
OUT="/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/ucu/"
import os; os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
S=bpy.context.scene
S.render.engine='CYCLES'; S.cycles.device='CPU'; S.cycles.use_denoising=False
S.cycles.samples=240
S.render.film_transparent=True
S.view_settings.view_transform='Filmic'
S.view_settings.exposure=0.0
S.render.resolution_x=900; S.render.resolution_y=900

# sky for reflections
S.world=bpy.data.worlds.new("w"); S.world.use_nodes=True
wbg=S.world.node_tree.nodes["Background"]; wbg.inputs[0].default_value=(0.05,0.055,0.07,1); wbg.inputs[1].default_value=1.0

# object: beveled, subdivided cube (gives pointiness gradients for edge wear)
bpy.ops.mesh.primitive_cube_add(size=2.0, location=(0,0,0))
ob=bpy.context.object
bev=ob.modifiers.new("b",'BEVEL'); bev.width=0.12; bev.segments=4
sub=ob.modifiers.new("s",'SUBSURF'); sub.levels=2; sub.render_levels=2
bpy.ops.object.shade_smooth()
ob.rotation_euler=(math.radians(8),math.radians(0),math.radians(28))

# ---- procedural layered material ----
m=bpy.data.materials.new("layered"); m.use_nodes=True
nt=m.node_tree; nodes=nt.nodes; links=nt.links
bsdf=nodes["Principled BSDF"]
geo=nodes.new("ShaderNodeNewGeometry")
# rust mask: driven directly by noise so it is always visible
noise=nodes.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value=2.0
noise.inputs["Detail"].default_value=6; noise.inputs["Roughness"].default_value=0.6
rramp=nodes.new("ShaderNodeValToRGB")
links.new(noise.outputs["Fac"], rramp.inputs[0])
rramp.color_ramp.elements[0].position=0.40; rramp.color_ramp.elements[1].position=0.58
rust_m=rramp.outputs["Color"]
# edge wear from pointiness (bevels read as convex edges)
ptr=nodes.new("ShaderNodeValToRGB")
links.new(geo.outputs["Pointiness"], ptr.inputs[0])
ptr.color_ramp.elements[0].position=0.46; ptr.color_ramp.elements[1].position=0.56
# colours
steel=(0.30,0.31,0.34,1); edge=(0.66,0.64,0.60,1); rust=(0.42,0.17,0.07,1)
mix1=nodes.new("ShaderNodeMixRGB"); mix1.inputs["Color1"].default_value=steel; mix1.inputs["Color2"].default_value=edge
links.new(ptr.outputs["Color"], mix1.inputs["Fac"])
mix2=nodes.new("ShaderNodeMixRGB"); mix2.inputs["Color2"].default_value=rust
links.new(mix1.outputs["Color"], mix2.inputs["Color1"])
links.new(rust_m, mix2.inputs["Fac"])
links.new(mix2.outputs["Color"], bsdf.inputs["Base Color"])
# metallic 1 for metal, 0 where rust
minv=nodes.new("ShaderNodeMath"); minv.operation='SUBTRACT'; minv.inputs[0].default_value=1.0
links.new(rust_m, minv.inputs[1])
links.new(minv.outputs[0], bsdf.inputs["Metallic"])
# roughness: metal low, rust high
rgh=nodes.new("ShaderNodeMixRGB"); rgh.inputs["Color1"].default_value=(0.38,0.38,0.38,1); rgh.inputs["Color2"].default_value=(0.92,0.92,0.92,1)
links.new(rust_m, rgh.inputs["Fac"]); links.new(rgh.outputs["Color"], bsdf.inputs["Roughness"])
# surface bump so it is not a mirror
bnoise=nodes.new("ShaderNodeTexNoise"); bnoise.inputs["Scale"].default_value=14; bnoise.inputs["Detail"].default_value=6
bump=nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value=0.10
links.new(bnoise.outputs["Fac"], bump.inputs["Height"]); links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
ob.data.materials.append(m)

# floor (keeps it grounded; transparent film so only subtle shadow catcher)
bpy.ops.mesh.primitive_plane_add(size=30, location=(0,0,-1.25))
pm=bpy.data.materials.new("floor"); pm.use_nodes=True
pm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value=(0.05,0.05,0.06,1)
pm.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value=0.5
bpy.context.object.data.materials.append(pm)

# key light
bpy.ops.object.light_add(type='AREA', location=(-3.2,-3.2,4.8)); L=bpy.context.object.data
L.energy=1500; L.size=6
k=bpy.context.object; v=Vector((0,0,0))-k.location; k.rotation_euler=v.to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='AREA', location=(4.2,1.5,2.0)); L2=bpy.context.object.data
L2.energy=600; L2.size=4
r=bpy.context.object; v=Vector((0,0,0.2))-r.location; r.rotation_euler=v.to_track_quat('-Z','Y').to_euler()

# camera
cd=bpy.data.cameras.new("c"); cd.lens=78
cam=bpy.data.objects.new("c",cd); S.collection.objects.link(cam); S.camera=cam
cam.location=(3.2,-4.6,2.4)
v=Vector((0,0,0.05))-cam.location; cam.rotation_euler=v.to_track_quat('-Z','Y').to_euler()

S.render.filepath=OUT+"ucu_obj.png"
bpy.ops.render.render(write_still=True)
print("DONE")
