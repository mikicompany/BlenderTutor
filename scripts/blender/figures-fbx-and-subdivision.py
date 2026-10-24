import bpy, math
OUT = "/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/bl/"

def solo(ob):
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
    bpy.context.view_layer.objects.active=ob

def reset(res=(760,620)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S=bpy.context.scene
    S.render.engine='CYCLES'; S.cycles.device='CPU'; S.cycles.use_denoising=False; S.cycles.samples=140
    S.render.resolution_x,S.render.resolution_y=res
    S.render.film_transparent=True
    S.world=bpy.data.worlds.new("w"); S.world.use_nodes=True
    bg=S.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value=(0.05,0.05,0.055,1); bg.inputs[1].default_value=0.35
    return S

def lights():
    for loc,en,sz in (((3.4,-3.4,3.6),750,1.4),((-3.6,-2.4,0.8),150,2.8),((-1.6,3.4,2.4),650,1.6)):
        bpy.ops.object.light_add(type='AREA',location=loc)
        bpy.context.object.data.energy=en; bpy.context.object.data.size=sz

def cam(S,loc,lens,rx=80):
    cd=bpy.data.cameras.new("c"); c=bpy.data.objects.new("c",cd)
    bpy.context.collection.objects.link(c); S.camera=c
    c.location=loc; c.rotation_euler=(math.radians(rx),0,0); cd.lens=lens

def mat(ob,rgba,rough=0.42):
    m=bpy.data.materials.new("m"); m.use_nodes=True
    b=m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value=rgba; b.inputs["Roughness"].default_value=rough
    ob.data.materials.clear(); ob.data.materials.append(m)

def shoot(S,n):
    S.render.filepath=OUT+n; bpy.ops.render.render(write_still=True); print("WROTE",n)

# ── FBX: the same asset upright, and arriving on its side ──
for tag, on_side in (("wrong",True), ("right",False)):
    S=reset()
    bpy.ops.mesh.primitive_monkey_add(size=1.8, location=(0.9,0,0.9))
    ob=bpy.context.object
    s=ob.modifiers.new("s",'SUBSURF'); s.levels=2; s.render_levels=2
    solo(ob); bpy.ops.object.modifier_apply(modifier=s.name)
    bpy.ops.object.shade_smooth()
    # Z-up authored, read as Y-up: the asset lands face-down
    ob.rotation_euler=(math.radians(-90),0,math.radians(18)) if on_side else (0,0,math.radians(18))
    mat(ob,(0.72,0.33,0.09,1))
    # a 1m reference cube, the test the article actually recommends
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-1.5,0,0.5))
    ref=bpy.context.object; mat(ref,(0.30,0.46,0.62,1),rough=0.5)
    bpy.ops.mesh.primitive_plane_add(size=14, location=(0,0,0))
    mat(bpy.context.object,(0.09,0.09,0.10,1),rough=0.85)
    lights(); cam(S,(0,-7.6,2.0),52,rx=76)
    shoot(S,f"fig_fbx_{tag}.png")

# ── VIEWPORT: subdivision viewport level 1 vs 3, shaded and wireframed ──
def built(level):
    bpy.ops.mesh.primitive_monkey_add(size=2.2)
    ob=bpy.context.object
    s=ob.modifiers.new("s",'SUBSURF'); s.levels=level; s.render_levels=level
    solo(ob); bpy.ops.object.modifier_apply(modifier=s.name)
    bpy.ops.object.shade_smooth()
    ob.rotation_euler=(math.radians(10),0,math.radians(24))
    return ob

for level,tag in ((1,"low"),(3,"high")):
    S=reset(); ob=built(level); mat(ob,(0.72,0.33,0.09,1))
    print("FACES", tag, len(ob.data.polygons))
    lights(); cam(S,(0,-6.2,0.4),62,rx=86)
    shoot(S,f"fig_subd_{tag}_shaded.png")
    w=ob.modifiers.new("w",'WIREFRAME'); w.thickness=0.004 if level==3 else 0.010; w.use_replace=True
    m=bpy.data.materials.new("e"); m.use_nodes=True
    nt=m.node_tree; out=nt.nodes["Material Output"]; nt.nodes.remove(nt.nodes["Principled BSDF"])
    e=nt.nodes.new("ShaderNodeEmission"); e.inputs[0].default_value=(0.62,0.70,0.78,1); e.inputs[1].default_value=1.5
    nt.links.new(e.outputs[0],out.inputs[0])
    ob.data.materials.clear(); ob.data.materials.append(m)
    shoot(S,f"fig_subd_{tag}_wire.png")
print("FIGURES6 OK")
