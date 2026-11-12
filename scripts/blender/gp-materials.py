"""Render 4 real Grease Pencil shapes showing stroke/fill materials:
stroke-only, fill-only, stroke+fill, gradient fill. Alpha output."""
import bpy, math, os
OUT="/tmp/claude-0/-home-user/aab23651-fe26-56ac-b366-8c83420e446d/scratchpad/gpr/"
os.makedirs(OUT, exist_ok=True)
INK=(0.12,0.10,0.09); ORANGE=(0.88,0.38,0.22); YEL=(0.95,0.76,0.30)

def shape():
    pts=[]
    for i in range(28):
        t=2*math.pi*i/28
        x=1.15*math.sin(t); z=1.3*math.cos(t)
        x*=(1.0-0.12*(z/1.3))
        pts.append((x,0,z))
    return pts

def render(name, stroke, fill, gradient=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S=bpy.context.scene
    m=bpy.data.materials.new("m"); bpy.data.materials.create_gpencil_data(m)
    g=m.grease_pencil
    g.show_stroke=stroke is not None
    if stroke: g.color=(*stroke,1)
    g.show_fill=fill is not None
    if fill:
        g.fill_color=(*fill,1)
        if gradient:
            try:
                g.fill_style='GRADIENT'; g.gradient_type='LINEAR'
                g.mix_color=(*YEL,1); g.mix_factor=0.0
            except Exception as e: print("grad attrs:",[a for a in dir(g) if 'mix' in a or 'grad' in a], e)
    gp=bpy.data.grease_pencils.new("g"); gp.materials.append(m)
    ob=bpy.data.objects.new("o",gp); S.collection.objects.link(ob)
    L=gp.layers.new("L",set_active=True); L.use_lights=False; fr=L.frames.new(0)
    s=fr.strokes.new(); s.display_mode='3DSPACE'; s.material_index=0
    s.line_width=34; s.use_cyclic=True
    p=shape(); s.points.add(len(p))
    for i,q in enumerate(p): s.points[i].co=q; s.points[i].pressure=1; s.points[i].strength=1
    cd=bpy.data.cameras.new("c"); cd.type='ORTHO'; cd.ortho_scale=3.2
    c=bpy.data.objects.new("c",cd); S.collection.objects.link(c); S.camera=c
    c.location=(0,-8,0); c.rotation_euler=(math.radians(90),0,0)
    S.view_settings.view_transform='Standard'
    S.render.engine='BLENDER_EEVEE'; S.render.film_transparent=True
    S.render.resolution_x=360; S.render.resolution_y=360
    S.render.filepath=OUT+name
    bpy.ops.render.render(write_still=True)

render("mat_stroke.png", INK, None)
render("mat_fill.png",   None, ORANGE)
render("mat_both.png",   INK, ORANGE)
render("mat_grad.png",   INK, ORANGE, gradient=True)
print("DONE")
