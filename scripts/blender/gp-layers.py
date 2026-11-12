"""Render real GP layer passes for the layers figure: full, line-only, fill-only."""
import bpy, math, os
OUT="/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/gpr/"
os.makedirs(OUT, exist_ok=True)
INK=(0.12,0.10,0.09); CREAM=(0.95,0.90,0.80); GREEN=(0.55,0.75,0.33)
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S=bpy.context.scene
    def gpmat(n,st=None,fl=None):
        m=bpy.data.materials.new(n); bpy.data.materials.create_gpencil_data(m)
        g=m.grease_pencil; g.show_stroke=st is not None
        if st:g.color=(*st,1)
        g.show_fill=fl is not None
        if fl:g.fill_color=(*fl,1)
        return m
    mats=[gpmat("body",INK,CREAM),gpmat("line",INK),gpmat("sprout",INK,GREEN),gpmat("dark",None,INK)]
    gp=bpy.data.grease_pencils.new("o")
    for m in mats: gp.materials.append(m)
    MI={"body":0,"line":1,"sprout":2,"dark":3}
    ob=bpy.data.objects.new("o",gp); S.collection.objects.link(ob)
    Lr=gp.layers.new("L",set_active=True); Lr.use_lights=False; Lr.frames.new(0)
    def add(pts,mi,w=34,cyc=False):
        fr=Lr.frames[0]; s=fr.strokes.new(); s.display_mode='3DSPACE'; s.material_index=mi
        s.line_width=w; s.use_cyclic=cyc; s.points.add(len(pts))
        for i,p in enumerate(pts): s.points[i].co=p; s.points[i].pressure=1; s.points[i].strength=1
    def egg(n=56):
        o=[]
        for i in range(n):
            t=2*math.pi*i/n; x=1.18*math.sin(t); z=1.95*math.cos(t); x*=(1-0.16*(z/1.95)); z-=0.12
            o.append((x,0,z))
        return o
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
    cd=bpy.data.cameras.new("c"); cd.type='ORTHO'; cd.ortho_scale=6.6
    c=bpy.data.objects.new("c",cd); S.collection.objects.link(c); S.camera=c
    c.location=(0,-10,0.1); c.rotation_euler=(math.radians(90),0,0)
    S.view_settings.view_transform='Standard'
    S.render.engine='BLENDER_EEVEE'; S.render.film_transparent=True
    S.render.resolution_x=520; S.render.resolution_y=620
    return S,mats

def render(path): bpy.context.scene.render.filepath=path; bpy.ops.render.render(write_still=True)

S,mats=build(); render(OUT+"ly_full.png")
for m in mats: m.grease_pencil.show_fill=False      # line-only
render(OUT+"ly_line.png")
S,mats=build()
for m in mats: m.grease_pencil.show_stroke=False    # fill-only
render(OUT+"ly_fill.png")
print("DONE")
