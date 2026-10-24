import bpy, math
OUT = "/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/bl/"
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene

def solo(ob):
    # transform_apply and modifier_apply act on the SELECTION, not just the
    # active object, so every such call gets an explicit selection of one.
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob

tex = bpy.data.textures.new("bump", type='CLOUDS')
tex.noise_scale = 0.55

def displace(ob, strength=0.22):
    m = ob.modifiers.new("d", 'DISPLACE')
    m.texture = tex; m.strength = strength; m.mid_level = 0.5
    solo(ob); bpy.ops.object.modifier_apply(modifier=m.name)

bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5, radius=1, location=(0,0,0))
messy = bpy.context.object; messy.name = "generated"
displace(messy)

bpy.ops.mesh.primitive_cube_add(size=1.4, location=(0,0,0))
clean = bpy.context.object; clean.name = "retopologised"
sub = clean.modifiers.new("s",'SUBSURF'); sub.levels=4; sub.render_levels=4
solo(clean); bpy.ops.object.modifier_apply(modifier=sub.name)
displace(clean)

# same on-screen size, so topology is the only visible variable
for ob in (messy, clean):
    r = max(ob.dimensions) / 2.0
    ob.scale = (1.0/r, 1.0/r, 1.0/r)
    solo(ob); bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.shade_smooth()

messy.location.x, clean.location.x = -1.42, 1.42
print("FACES generated:", len(messy.data.polygons), "| retopologised:", len(clean.data.polygons))
print("DIMS", [round(v,2) for v in messy.dimensions], [round(v,2) for v in clean.dimensions])

bpy.ops.object.light_add(type='AREA', location=(2.5,-4,4)); bpy.context.object.data.energy=1500; bpy.context.object.data.size=7
bpy.ops.object.light_add(type='AREA', location=(-4,-2.5,1)); bpy.context.object.data.energy=350; bpy.context.object.data.size=7
cd = bpy.data.cameras.new("c"); cam = bpy.data.objects.new("c", cd)
bpy.context.collection.objects.link(cam); S.camera = cam
cam.location=(0,-7.2,0.0); cam.rotation_euler=(math.radians(90),0,0); cd.lens=45

S.render.engine='CYCLES'; S.cycles.device='CPU'; S.cycles.samples=90
S.cycles.use_denoising=False
S.render.resolution_x, S.render.resolution_y = 1100, 520
S.render.film_transparent = True

def mat(ob, rgba, emit=False):
    m = bpy.data.materials.new("m"); m.use_nodes=True
    nt=m.node_tree; bsdf=nt.nodes["Principled BSDF"]
    if emit:
        out=nt.nodes["Material Output"]; nt.nodes.remove(bsdf)
        e=nt.nodes.new("ShaderNodeEmission"); e.inputs[0].default_value=rgba; e.inputs[1].default_value=1.5
        nt.links.new(e.outputs[0], out.inputs[0])
    else:
        bsdf.inputs["Base Color"].default_value=rgba
        bsdf.inputs["Roughness"].default_value=0.42
    ob.data.materials.clear(); ob.data.materials.append(m)

mat(messy,(0.75,0.33,0.07,1)); mat(clean,(0.75,0.33,0.07,1))
S.render.filepath = OUT+"topo_shaded.png"; bpy.ops.render.render(write_still=True)

for ob in (messy, clean):
    w = ob.modifiers.new("w",'WIREFRAME'); w.thickness=0.007; w.use_replace=True
    mat(ob,(0.62,0.70,0.78,1), emit=True)
S.render.filepath = OUT+"topo_wire.png"; bpy.ops.render.render(write_still=True)
print("BOTH PASSES OK")
