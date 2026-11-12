"""Render the onion character as REAL Grease Pencil strokes+fills in Blender,
with three onion-skinned layers (warm 'before', ink 'current', cool 'after').
Headless EEVEE via software EGL. Output has alpha; paper bg added in post.

Run: EGL_PLATFORM=surfaceless LIBGL_ALWAYS_SOFTWARE=1 GALLIUM_DRIVER=llvmpipe \
     blender -b -P scripts/blender/gp-onion.py
"""
import bpy, math
OUT = "/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/gpr/"
import os; os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene

def mat(name, stroke=None, fill=None):
    m = bpy.data.materials.new(name)
    bpy.data.materials.create_gpencil_data(m)
    g = m.grease_pencil
    g.show_stroke = stroke is not None
    if stroke: g.color = (*stroke, 1)
    g.show_fill = fill is not None
    if fill: g.fill_color = (*fill, 1)
    return m

INK=(0.12,0.10,0.09); CREAM=(0.95,0.90,0.80); GREEN=(0.55,0.75,0.33)
M_body = mat("body", stroke=INK, fill=CREAM)
M_line = mat("line", stroke=INK)
M_sprout = mat("sprout", stroke=INK, fill=GREEN)
M_dark = mat("dark", fill=INK)

gp = bpy.data.grease_pencils.new("onion")
for m in (M_body, M_line, M_sprout, M_dark): gp.materials.append(m)
MI = {"body":0,"line":1,"sprout":2,"dark":3}
ob = bpy.data.objects.new("onion", gp)
S.collection.objects.link(ob)

def egg(n=56):
    pts=[]
    for i in range(n):
        t=2*math.pi*i/n
        x=1.18*math.sin(t); z=1.95*math.cos(t)
        x*= (1.0-0.16*(z/1.95))          # narrower toward top
        z-=0.12                            # drop slightly
        pts.append((x,0,z))
    return pts

def add(layer, pts, mi, width=120, cyclic=False, frame=None):
    fr = layer.frames[0] if layer.frames else layer.frames.new(0)
    s=fr.strokes.new(); s.display_mode='3DSPACE'; s.material_index=mi
    s.line_width=width; s.use_cyclic=cyclic
    s.points.add(len(pts))
    for i,p in enumerate(pts):
        s.points[i].co=p; s.points[i].pressure=1.0; s.points[i].strength=1.0
    return s

def build(layer, ox=0.0):
    # body
    add(layer, [(x+ox,y,z) for (x,y,z) in egg()], MI["body"], width=34, cyclic=True)
    # striations
    for sx in (-0.62,-0.3,0.0,0.32,0.64):
        pts=[]
        for k in range(9):
            tt=k/8.0; z=1.5-3.0*tt
            x=sx*(1.0-0.25*abs(z)/1.6)
            pts.append((x+ox,0,z))
        add(layer, pts, MI["line"], width=12)
    # sprout leaves
    leaves=[[(-0.15,0,1.75),(-0.5,0,2.55),(-0.18,0,2.0)],
            [(0.0,0,1.8),(0.05,0,2.85),(0.22,0,1.9)],
            [(0.15,0,1.75),(0.55,0,2.5),(0.2,0,2.0)],
            [(-0.05,0,1.8),(-0.28,0,2.75),(0.02,0,1.95)]]
    for lf in leaves:
        add(layer, [(x+ox,y,z) for (x,y,z) in lf], MI["sprout"], width=20, cyclic=True)
    # eyes
    for ex in (-0.5,0.5):
        eye=[(ex+0.16*math.sin(a),0,0.25+0.2*math.cos(a)) for a in [i*math.pi/6 for i in range(12)]]
        add(layer, [(x+ox,y,z) for (x,y,z) in eye], MI["dark"], width=8, cyclic=True)
    # brows
    add(layer, [(-0.72+ox,0,0.6),(-0.5+ox,0,0.72)], MI["line"], width=12)
    add(layer, [(0.5+ox,0,0.72),(0.72+ox,0,0.6)], MI["line"], width=12)
    # open smile (filled dark)
    mouth=[(-0.34,0,-0.25),(-0.14,0,-0.62),(0.2,0,-0.62),(0.4,0,-0.28),(0.16,0,-0.42),(-0.14,0,-0.42)]
    add(layer, [(x+ox,y,z) for (x,y,z) in mouth], MI["dark"], width=8, cyclic=True)
    # arms
    add(layer, [(-1.12+ox,0,-0.3),(-1.5+ox,0,-0.7),(-1.62+ox,0,-1.05)], MI["line"], width=20)
    add(layer, [(1.12+ox,0,-0.3),(1.5+ox,0,-0.7),(1.62+ox,0,-1.05)], MI["line"], width=20)
    # legs
    add(layer, [(-0.32+ox,0,-1.8),(-0.34+ox,0,-2.55)], MI["line"], width=20)
    add(layer, [(0.34+ox,0,-1.8),(0.4+ox,0,-2.55)], MI["line"], width=20)

# three onion-skin layers, back to front: after (cool), before (warm), current (ink)
Laf = gp.layers.new("after", set_active=True);  Laf.frames.new(0)
build(Laf, ox=2.65);  Laf.use_lights=False; Laf.opacity=0.42; Laf.tint_color=(0.14,0.52,0.49); Laf.tint_factor=1.0
Lbf = gp.layers.new("before", set_active=True); Lbf.frames.new(0)
build(Lbf, ox=-2.65); Lbf.use_lights=False; Lbf.opacity=0.42; Lbf.tint_color=(0.80,0.33,0.12); Lbf.tint_factor=1.0
Lcur = gp.layers.new("current", set_active=True); Lcur.frames.new(0)
build(Lcur, ox=0.0); Lcur.use_lights=False; Lcur.opacity=1.0

# camera (ortho, front)
cam_d=bpy.data.cameras.new("c"); cam_d.type='ORTHO'; cam_d.ortho_scale=12.5
cam=bpy.data.objects.new("c",cam_d); S.collection.objects.link(cam); S.camera=cam
cam.location=(0,-10,-0.1); cam.rotation_euler=(math.radians(90),0,0)

S.view_settings.view_transform='Standard'
S.render.engine='BLENDER_EEVEE'
S.render.film_transparent=True
S.render.resolution_x=1300; S.render.resolution_y=820
S.render.filepath=OUT+"onion_hero.png"
bpy.ops.render.render(write_still=True)
print("DONE")
