import bpy, math
OUT = "/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/bl/"

def solo(ob):
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
    bpy.context.view_layer.objects.active = ob

def reset(res=(760,620), engine='CYCLES'):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = bpy.context.scene
    S.render.engine = engine
    if engine == 'CYCLES':
        S.cycles.device='CPU'; S.cycles.use_denoising=False; S.cycles.samples=160
    else:
        S.eevee.taa_render_samples = 64
        S.eevee.use_ssr = True; S.eevee.use_ssr_refraction = True
    S.render.resolution_x, S.render.resolution_y = res
    S.render.film_transparent = True
    S.world = bpy.data.worlds.new("w"); S.world.use_nodes=True
    bg = S.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value=(0.05,0.05,0.055,1); bg.inputs[1].default_value=0.35
    return S

def cam(S, loc=(0,-6.0,0.4), lens=62, rx=86):
    cd=bpy.data.cameras.new("c"); c=bpy.data.objects.new("c",cd)
    bpy.context.collection.objects.link(c); S.camera=c
    c.location=loc; c.rotation_euler=(math.radians(rx),0,0); cd.lens=lens
    return c

def lights(three=True):
    bpy.ops.object.light_add(type='AREA', location=(3.2,-3.2,3.4))
    bpy.context.object.data.energy=700; bpy.context.object.data.size=1.3
    if three:
        bpy.ops.object.light_add(type='AREA', location=(-3.4,-2.2,0.6))
        bpy.context.object.data.energy=140; bpy.context.object.data.size=2.6
        bpy.ops.object.light_add(type='AREA', location=(-1.4,3.2,2.2))
        bpy.context.object.data.energy=650; bpy.context.object.data.size=1.5

def clay(ob, rgba=(0.62,0.30,0.10,1), rough=0.42):
    m=bpy.data.materials.new("m"); m.use_nodes=True
    b=m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value=rgba; b.inputs["Roughness"].default_value=rough
    ob.data.materials.clear(); ob.data.materials.append(m)

def shoot(S,n):
    S.render.filepath=OUT+n; bpy.ops.render.render(write_still=True); print("WROTE",n)

# ───── 1. UV: the same mesh, two unwraps, one checker texture ─────
def checker(ob):
    # built per scene: read_factory_settings wipes datablocks made before it
    grid = bpy.data.images.new("grid", 1024, 1024)
    grid.generated_type = 'COLOR_GRID'
    m=bpy.data.materials.new("uv"); m.use_nodes=True
    nt=m.node_tree; b=nt.nodes["Principled BSDF"]
    t=nt.nodes.new("ShaderNodeTexImage"); t.image=grid
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value=0.5
    ob.data.materials.clear(); ob.data.materials.append(m)

for tag, method in (("bad","cube"), ("good","smart")):
    S=reset()
    bpy.ops.mesh.primitive_cylinder_add(radius=1.0, depth=2.4, vertices=48, location=(0,0,0))
    ob=bpy.context.object
    solo(ob); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    if method=="cube":
        bpy.ops.uv.cube_project(cube_size=2.0)      # planar projection on a curved surface
    else:
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.shade_smooth()
    ob.rotation_euler=(math.radians(68),0,math.radians(22))
    checker(ob); lights(); cam(S, loc=(0,-6.6,0.2), lens=60)
    shoot(S, f"fig_uv_{tag}.png")

# ───── 2. QUADS vs TRIANGLES under Catmull-Clark, hard surface ─────
for tag, tri in (("tris",True), ("quads",False)):
    S=reset()
    bpy.ops.mesh.primitive_cube_add(size=2.0)
    ob=bpy.context.object
    bv=ob.modifiers.new("b",'BEVEL'); bv.width=0.12; bv.segments=2
    solo(ob); bpy.ops.object.modifier_apply(modifier=bv.name)
    if tri:
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.quads_convert_to_tris(quad_method='BEAUTY')
        bpy.ops.object.mode_set(mode='OBJECT')
    s=ob.modifiers.new("s",'SUBSURF'); s.levels=2; s.render_levels=2
    bpy.ops.object.shade_smooth()
    ob.rotation_euler=(math.radians(16),0,math.radians(34))
    clay(ob, rough=0.34); lights(); cam(S, loc=(0,-6.6,0.3), lens=66)
    shoot(S, f"fig_topo_{tag}.png")

# ───── 3. MIRROR: half a shape, and the same half mirrored ─────
def half_shape():
    bpy.ops.mesh.primitive_monkey_add(size=2.2)
    ob=bpy.context.object
    s=ob.modifiers.new("s",'SUBSURF'); s.levels=2; s.render_levels=2
    solo(ob); bpy.ops.object.modifier_apply(modifier=s.name)
    # cut away everything on +X so there is a genuine half to mirror
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.mode_set(mode='OBJECT')
    for v in ob.data.vertices:
        if v.co.x > 0.002: v.select = True
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.delete(type='VERT')
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.shade_smooth()
    ob.rotation_euler=(math.radians(10),0,math.radians(18))
    return ob

for tag, mirror in (("half",False), ("mirrored",True)):
    S=reset(); ob=half_shape()
    if mirror:
        mm=ob.modifiers.new("m",'MIRROR'); mm.use_axis[0]=True; mm.use_clip=True
    clay(ob); lights(); cam(S, loc=(0,-6.2,0.3), lens=60)
    shoot(S, f"fig_mirror_{tag}.png")

# ───── 4. CYCLES vs EEVEE: a reflection of something off-screen ─────
def refl_scene(S):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.25, location=(0,0,0), segments=64, ring_count=32)
    ball=bpy.context.object; bpy.ops.object.shade_smooth()
    m=bpy.data.materials.new("chrome"); m.use_nodes=True
    b=m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value=(0.85,0.85,0.88,1)
    b.inputs["Metallic"].default_value=1.0; b.inputs["Roughness"].default_value=0.08
    ball.data.materials.append(m)
    # a bright panel well outside the camera frame, to the left and behind
    bpy.ops.mesh.primitive_plane_add(size=5.0, location=(-5.5,1.5,0.5), rotation=(math.radians(90),0,math.radians(90)))
    panel=bpy.context.object
    pm=bpy.data.materials.new("panel"); pm.use_nodes=True
    nt=pm.node_tree; out=nt.nodes["Material Output"]; nt.nodes.remove(nt.nodes["Principled BSDF"])
    e=nt.nodes.new("ShaderNodeEmission"); e.inputs[0].default_value=(1.0,0.35,0.08,1); e.inputs[1].default_value=18.0
    nt.links.new(e.outputs[0], out.inputs[0]); panel.data.materials.append(pm)
    lights(); cam(S, loc=(0,-6.4,0.0), lens=62)

S=reset(engine='CYCLES'); refl_scene(S); shoot(S,"fig_engine_cycles.png")
S=reset(engine='BLENDER_EEVEE'); refl_scene(S); shoot(S,"fig_engine_eevee.png")

# ───── 5. LOOPS AT THE JOINT: same bend, different geometry to bend with ─────
for tag, cuts in (("sparse",2), ("loops",18)):
    S=reset()
    bpy.ops.mesh.primitive_cylinder_add(radius=0.42, depth=4.4, vertices=28, location=(0,0,0))
    ob=bpy.context.object
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.subdivide(number_cuts=cuts)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.shade_smooth()
    d=ob.modifiers.new("b",'SIMPLE_DEFORM'); d.deform_method='BEND'
    d.angle=math.radians(125); d.deform_axis='X'
    ob.rotation_euler=(0,0,math.radians(8))
    clay(ob, rough=0.40); lights(); cam(S, loc=(0,-7.4,0.0), lens=58)
    shoot(S, f"fig_joint_{tag}.png")

print("FIGURES3 OK")
