"""A real Grease Pencil character standing in a real 3D scene: GP strokes +
actual 3D meshes (cube, sphere, floor) lit by a sun, perspective camera."""
import bpy, math, os
OUT="/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/gpr/"
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
S=bpy.context.scene
INK=(0.12,0.10,0.09); CREAM=(0.95,0.90,0.80); GREEN=(0.55,0.75,0.33)

def gpmat(name,stroke=None,fill=None):
    m=bpy.data.materials.new(name); bpy.data.materials.create_gpencil_data(m)
    g=m.grease_pencil; g.show_stroke=stroke is not None
    if stroke:g.color=(*stroke,1)
    g.show_fill=fill is not None
    if fill:g.fill_color=(*fill,1)
    return m
Mb=gpmat("body",INK,CREAM); Ml=gpmat("line",INK); Ms=gpmat("sprout",INK,GREEN); Md=gpmat("dark",None,INK)
gp=bpy.data.grease_pencils.new("onion")
for m in (Mb,Ml,Ms,Md): gp.materials.append(m)
MI={"body":0,"line":1,"sprout":2,"dark":3}
ob=bpy.data.objects.new("onion",gp); S.collection.objects.link(ob)
L=gp.layers.new("L",set_active=True); L.use_lights=False; L.frames.new(0)
def add(pts,mi,w=34,cyc=False):
    fr=L.frames[0]; s=fr.strokes.new(); s.display_mode='3DSPACE'; s.material_index=mi
    s.line_width=w; s.use_cyclic=cyc; s.points.add(len(pts))
    for i,p in enumerate(pts): s.points[i].co=p; s.points[i].pressure=1; s.points[i].strength=1
def egg(n=56):
    out=[]
    for i in range(n):
        t=2*math.pi*i/n; x=1.18*math.sin(t); z=1.95*math.cos(t); x*=(1-0.16*(z/1.95)); z-=0.12
        out.append((x,0,z))
    return out
add(egg(),MI["body"],34,True)
for sx in (-0.62,-0.3,0,0.32,0.64):
    add([(sx*(1-0.25*abs(1.5-3*k/8)/1.6),0,1.5-3*k/8) for k in range(9)],MI["line"],12)
for lf in ([(-0.15,0,1.75),(-0.5,0,2.55),(-0.18,0,2.0)],[(0,0,1.8),(0.05,0,2.85),(0.22,0,1.9)],
           [(0.15,0,1.75),(0.55,0,2.5),(0.2,0,2.0)],[(-0.05,0,1.8),(-0.28,0,2.75),(0.02,0,1.95)]):
    add(lf,MI["sprout"],20,True)
for ex in (-0.5,0.5):
    add([(ex+0.16*math.sin(a),0,0.25+0.2*math.cos(a)) for a in [i*math.pi/6 for i in range(12)]],MI["dark"],8,True)
add([(-0.72,0,0.6),(-0.5,0,0.72)],MI["line"],12); add([(0.5,0,0.72),(0.72,0,0.6)],MI["line"],12)
add([(-0.34,0,-0.25),(-0.14,0,-0.62),(0.2,0,-0.62),(0.4,0,-0.28),(0.16,0,-0.42),(-0.14,0,-0.42)],MI["dark"],8,True)
add([(-1.12,0,-0.3),(-1.5,0,-0.7),(-1.62,0,-1.05)],MI["line"],20)
add([(1.12,0,-0.3),(1.5,0,-0.7),(1.62,0,-1.05)],MI["line"],20)
add([(-0.32,0,-1.8),(-0.34,0,-2.55)],MI["line"],20); add([(0.34,0,-1.8),(0.4,0,-2.55)],MI["line"],20)

def meshmat(name,rgb,rough=0.5):
    m=bpy.data.materials.new(name); m.use_nodes=True
    b=m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value=(*rgb,1)
    b.inputs["Roughness"].default_value=rough
    return m
# floor
bpy.ops.mesh.primitive_plane_add(size=40, location=(0,3,-2.6)); floor=bpy.context.object
floor.data.materials.append(meshmat("floor",(0.80,0.80,0.83),0.9))
# cube + sphere (real 3D) behind the character
bpy.ops.mesh.primitive_cube_add(size=1.8, location=(2.6,2.6,-1.7),rotation=(0,0,math.radians(18)))
bpy.context.object.data.materials.append(meshmat("cube",(0.90,0.55,0.25),0.5))
bpy.ops.object.shade_flat()
bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, location=(-2.7,2.3,-1.6),segments=48,ring_count=24)
bpy.context.object.data.materials.append(meshmat("sph",(0.35,0.55,0.75),0.35))
bpy.ops.object.shade_smooth()
# sun
bpy.ops.object.light_add(type='SUN', location=(4,-2,8)); S_=bpy.context.object.data
S_.energy=3.0; bpy.context.object.rotation_euler=(math.radians(50),math.radians(14),math.radians(30))
# world soft blue
S.world=bpy.data.worlds.new("w"); S.world.use_nodes=True
S.world.node_tree.nodes["Background"].inputs[0].default_value=(0.74,0.81,0.88,1)
S.world.node_tree.nodes["Background"].inputs[1].default_value=0.9
# camera — mild 3/4, slightly above
cd=bpy.data.cameras.new("c"); cd.lens=52
cam=bpy.data.objects.new("c",cd); S.collection.objects.link(cam); S.camera=cam
cam.location=(2.2,-18.5,2.3)
import mathutils
d=mathutils.Vector((0,0.5,0.2))-cam.location
cam.rotation_euler=d.to_track_quat('-Z','Y').to_euler()
S.view_settings.view_transform='Standard'
S.render.engine='BLENDER_EEVEE'; S.render.film_transparent=False
S.render.resolution_x=1400; S.render.resolution_y=680
S.render.filepath=OUT+"scene3d.png"
bpy.ops.render.render(write_still=True); print("DONE")
