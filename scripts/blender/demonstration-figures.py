import bpy, math
OUT = "/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/bl/"

def solo(ob):
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
    bpy.context.view_layer.objects.active = ob

def reset(res=(760,620)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = bpy.context.scene
    S.render.engine='CYCLES'; S.cycles.device='CPU'; S.cycles.use_denoising=False
    S.cycles.samples=200
    S.render.resolution_x, S.render.resolution_y = res
    S.render.film_transparent=True
    S.world=bpy.data.worlds.new("w"); S.world.use_nodes=True
    bg=S.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value=(0.05,0.05,0.055,1); bg.inputs[1].default_value=0.35
    return S

def suzanne():
    bpy.ops.mesh.primitive_monkey_add(size=2.2, location=(0,0,0))
    ob=bpy.context.object
    s=ob.modifiers.new("s",'SUBSURF'); s.levels=2; s.render_levels=2
    solo(ob); bpy.ops.object.modifier_apply(modifier=s.name)
    bpy.ops.object.shade_smooth()
    ob.rotation_euler=(math.radians(12),0,math.radians(26))
    return ob

def cam(S, loc=(0,-6.0,0.4), lens=62):
    cd=bpy.data.cameras.new("c"); c=bpy.data.objects.new("c",cd)
    bpy.context.collection.objects.link(c); S.camera=c
    c.location=loc; c.rotation_euler=(math.radians(86),0,0); cd.lens=lens
    return c

def area(loc, energy, size, aim_at_subject=False):
    bpy.ops.object.light_add(type='AREA', location=loc)
    L=bpy.context.object; L.data.energy=energy; L.data.size=size
    if aim_at_subject:
        # Area lights emit along -Z and default to pointing straight down, so a
        # light placed level with the subject lights the floor unless rotated.
        L.rotation_euler=(math.radians(90),0,0)
    return L

def clay(ob, rough=0.45, varied=False):
    m=bpy.data.materials.new("m"); m.use_nodes=True
    nt=m.node_tree; bsdf=nt.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value=(0.62,0.30,0.10,1)
    if varied:
        n=nt.nodes.new("ShaderNodeTexNoise")
        n.inputs["Scale"].default_value=26.0; n.inputs["Detail"].default_value=8.0
        r=nt.nodes.new("ShaderNodeMapRange")
        r.inputs["From Min"].default_value=0.35; r.inputs["From Max"].default_value=0.65
        r.inputs["To Min"].default_value=0.08;  r.inputs["To Max"].default_value=0.92
        nt.links.new(n.outputs["Fac"], r.inputs["Value"])
        nt.links.new(r.outputs["Result"], bsdf.inputs["Roughness"])
        bump=nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value=0.18
        nt.links.new(n.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    else:
        bsdf.inputs["Roughness"].default_value=rough
    ob.data.materials.clear(); ob.data.materials.append(m)

def shoot(S,n):
    S.render.filepath=OUT+n; bpy.ops.render.render(write_still=True); print("WROTE",n)

# 2. LIGHTING — one frontal source actually aimed at the subject
S=reset(); ob=suzanne(); clay(ob); cam(S)
area((0,-5.0,0.6), 900, 9.0, aim_at_subject=True)
shoot(S,"fig_light_flat.png")

S=reset(); ob=suzanne(); clay(ob); cam(S)
area((3.4,-3.0,3.0), 700, 1.4)
area((-3.6,-2.0,0.2), 110, 3.0)
area((-1.6, 3.4, 2.4), 900, 1.6)
shoot(S,"fig_light_3pt.png")

# 3. ROUGHNESS — one flat value against strong, detailed variation
for tag,var in (("flat",False),("varied",True)):
    S=reset(); ob=suzanne(); clay(ob, rough=0.5, varied=var); cam(S)
    area((3.2,-3.2,3.2),700,1.3); area((-3.4,-2.0,0.4),130,2.6); area((-1.4,3.2,2.2),700,1.5)
    shoot(S,f"fig_rough_{tag}.png")

# 4. SMOOTH SHADING — a cylinder, where the flat cap smearing into the curved
#    side is the textbook symptom. A bevelled cube hides it.
for tag,sharp in (("melted",False),("angle",True)):
    S=reset()
    bpy.ops.mesh.primitive_cylinder_add(radius=1.1, depth=1.7, vertices=28, location=(0,0,0))
    ob=bpy.context.object
    bpy.ops.object.shade_smooth()
    if sharp:
        ob.data.use_auto_smooth=True; ob.data.auto_smooth_angle=math.radians(30)
    ob.rotation_euler=(math.radians(66),0,math.radians(20))
    clay(ob, rough=0.36)
    area((3.2,-3.2,3.4),700,1.2); area((-3.4,-2.2,0.6),140,2.6); area((-1.4,3.2,2.2),650,1.5)
    cam(S, loc=(0,-6.2,0.3), lens=66)
    shoot(S,f"fig_smooth_{tag}.png")
print("FIGURES2 OK")
