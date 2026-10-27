# Berkeal Studio Room 3D — masa düzeni (Blender betiği)
# Kullanım:  blender -b -P tools/studio3d/build_desk.py
# Çıktı:     assets/models/studio-desk.glb
#
# Kullanıcının masa fotoğrafındaki düzen; cihaz ölçüleri üreticilerin/satıcıların resmî değerleri (m):
#   Push 3 .380x.318x.0445 · DrumBrute Impact .320x.290x.090 · AudioFuse Studio .265x.160x.072
#   TD-3 .305x.165x.056 · MicroFreak .311x.233x.055 · ADAM T8V .250x.335x.400 · DR-05X .061x.141x.026
# Koordinat: sahne (Three.js) x sağ, y yukarı, z kullanıcıya doğru. Blender'da (x, -z, y); glTF dışa aktarımı geri çevirir.
# Cihazların önü Blender'da -Y. Baskılı yüzeyler TEX_*/SCREEN_* malzemeleri: sayfa bunlara canvas dokusu bağlar.
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'models', 'studio-desk.glb')
DY = 0.76          # masa üst yüzeyi
bpy.ops.wm.read_factory_settings(use_empty=True)
COL = bpy.context.scene.collection

def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

MATS = {}
def mat(name, hexcol, rough=0.5, metal=0.0, emit=None, es=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    r, g, bl = (hexcol >> 16) & 255, (hexcol >> 8) & 255, hexcol & 255
    b.inputs['Base Color'].default_value = (lin(r), lin(g), lin(bl), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit is not None:
        er, eg, eb = (emit >> 16) & 255, (emit >> 8) & 255, emit & 255
        b.inputs['Emission Color'].default_value = (lin(er), lin(eg), lin(eb), 1)
        b.inputs['Emission Strength'].default_value = es
    MATS[name] = m
    return m

def obj_from_bm(bm, name, m, smooth_angle=35):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    me.set_sharp_from_angle(angle=math.radians(smooth_angle))
    o = bpy.data.objects.new(name, me); COL.objects.link(o)
    o.data.materials.append(m)
    return o

def rbox(w, d, h, r, m, x=0, y=0, z=0, segs=2, name='b'):
    """genişlik w (X), derinlik d (Y), yükseklik h (Z); taban z'de."""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co = Vector((v.co.x * w + x, v.co.y * d + y, (v.co.z + 0.5) * h + z))
    if r > 0: bmesh.ops.bevel(bm, geom=bm.edges[:], offset=min(r, w / 2.1, d / 2.1, h / 2.1), segments=segs, affect='EDGES', profile=0.5, clamp_overlap=True)
    return obj_from_bm(bm, name, m)

def cyl(r, h, m, x=0, y=0, z=0, segs=24, r2=None, bevel=0.0, name='c', axis='Z'):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=h)
    if bevel > 0:
        top = [e for e in bm.edges if all(v.co.z > h / 2 - 1e-5 for v in e.verts)]
        bmesh.ops.bevel(bm, geom=top, offset=bevel, segments=2, affect='EDGES', profile=0.5, clamp_overlap=True)
    for v in bm.verts:
        v.co.z += h / 2
        if axis == 'Y': v.co = Vector((v.co.x, -v.co.z, v.co.y))
        v.co += Vector((x, y, z))
    return obj_from_bm(bm, name, m, 50)

def plane(w, d, m, x=0, y=0, z=0, name='p'):
    bm = bmesh.new(); bm.loops.layers.uv.new('UVMap')
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5, calc_uvs=True)
    for v in bm.verts: v.co = Vector((v.co.x * w + x, v.co.y * d + y, z))
    return obj_from_bm(bm, name, m)

def sphere(r, m, x=0, y=0, z=0, sx=1, sy=1, sz=1, segs=20, name='s'):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=segs // 2 + 2, radius=r)
    for v in bm.verts: v.co = Vector((v.co.x * sx + x, v.co.y * sy + y, v.co.z * sz + z))
    return obj_from_bm(bm, name, m, 60)

def prism(pts_yz, thick, m, x=0, name='w'):
    """YZ düzleminde çokgen, X boyunca kalınlık."""
    bm = bmesh.new()
    a = [bm.verts.new((x - thick / 2, py, pz)) for py, pz in pts_yz]
    b = [bm.verts.new((x + thick / 2, py, pz)) for py, pz in pts_yz]
    bm.faces.new(a[::-1]); bm.faces.new(b)
    n = len(pts_yz)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return obj_from_bm(bm, name, m, 30)

def knob(r, h, x, y, z, body, cap=None, line=None, name='k'):
    out = [cyl(r, h * 0.55, body, x, y, z, segs=28, r2=r * 0.97, name=name)]
    out.append(cyl(r * 0.86, h * 0.45, cap or body, x, y, z + h * 0.55, segs=28, r2=r * 0.8, bevel=r * 0.12, name=name))
    if line is not None:
        out.append(rbox(r * 0.16, r * 0.7, 0.0012, 0, line, x, y + r * 0.35, z + h, name=name))
    return out

def join(objs, name):
    objs = [o for o in objs if o is not None]
    with bpy.context.temp_override(active_object=objs[0], selected_editable_objects=objs, selected_objects=objs):
        bpy.ops.object.join()
    o = objs[0]; o.name = name; o.data.name = name
    return o

def place(o, x, y, z, ry=0.0, tilt=0.0):
    """Sahne koordinatında yerleştir; ry dikey eksende (Three rotation.y), tilt arka kenarı kaldırır."""
    o.rotation_mode = 'XYZ'
    o.rotation_euler = (tilt, 0.0, ry)
    o.location = Vector((x, -z, y))
    return o

# ---------------- malzemeler
M = dict(
    blackBody=mat('black_body', 0x121214, 0.55, 0.15),
    alu=mat('aluminium', 0xb8bbc1, 0.32, 0.9),
    darkAlu=mat('dark_alu', 0x2c2d31, 0.38, 0.75),
    knobBlack=mat('knob_black', 0x0c0c0d, 0.45, 0.1),
    knobGray=mat('knob_gray', 0x8b8c90, 0.45, 0.2),
    knobSilver=mat('knob_silver', 0xc9ccd2, 0.28, 0.9),
    knobOrange=mat('knob_orange', 0xf07f1f, 0.45, 0.0),
    knobWhite=mat('knob_white', 0xeeeeea, 0.45, 0.0),
    line=mat('knob_line', 0xf2f2f2, 0.5, 0.0),
    rubber=mat('rubber', 0x070707, 0.9, 0.0),
    deskWhite=mat('desk_white', 0xd8d6d2, 0.55, 0.0),
    riser=mat('riser_black', 0x0e0e10, 0.5, 0.6),
    pad=mat('push_pad', 0xe9dfc8, 0.6, 0.0, emit=0xffe3b8, es=0.25),
    padRim=mat('pad_rim', 0x1a1a1c, 0.6, 0.0),
    btnDark=mat('btn_dark', 0x2a2a2e, 0.6, 0.0),
    btnGray=mat('btn_gray', 0x6b6c70, 0.55, 0.0),
    btnWhite=mat('btn_white', 0xe2e2de, 0.5, 0.0),
    dbWhite=mat('drum_white', 0xe7e4dc, 0.5, 0.0),
    orange=mat('orange', 0xe8561e, 0.5, 0.0),
    cyan=mat('cyan_btn', 0x36b6d8, 0.4, 0.0, emit=0x36b6d8, es=0.6),
    glossBlack=mat('gloss_black', 0x050506, 0.15, 0.3),
    gold=mat('ribbon_gold', 0xb98a3a, 0.35, 0.9),
    plasticWhite=mat('plastic_white', 0xe6e6e2, 0.38, 0.0),
    ps5Core=mat('ps5_core', 0x0f0f12, 0.4, 0.3),
    mbGray=mat('macbook', 0x2f3033, 0.35, 0.9),
    lego=mat('lego_yellow', 0xf2c230, 0.4, 0.0),
    legoBrown=mat('lego_brown', 0x6b4a2a, 0.6, 0.0),
    legoOrange=mat('lego_orange', 0xe0861e, 0.5, 0.0),
    grogSkin=mat('grogu_skin', 0x8aa862, 0.75, 0.0),
    grogRobe=mat('grogu_robe', 0xb39a78, 0.95, 0.0),
    eye=mat('eye', 0x0a0806, 0.15, 0.0),
    flame=mat('candle_flame', 0xffb050, 0.5, 0.0, emit=0xffa040, es=2.5),
    candle=mat('candle_body', 0xf0e6d2, 0.7, 0.0),
    cable=mat('cable_black', 0x050505, 0.8, 0.0),
    cableRed=mat('cable_red', 0x9a1a14, 0.7, 0.0),
    keyBlack=mat('key_black', 0x18181b, 0.55, 0.0),
    keyDark=mat('key_dark', 0x111113, 0.5, 0.0),
    meter=mat('meter_led', 0x3fdc7a, 0.4, 0.0, emit=0x3fdc7a, es=0.8),
    stepLed=mat('step_led', 0xb36bff, 0.4, 0.0, emit=0xb36bff, es=0.9),
    redLed=mat('red_led', 0xff3020, 0.4, 0.0, emit=0xff3020, es=1.2),
)
TEX = lambda n, c=0x222222, r=0.55: mat(n, c, r)

parts = {}

# ---------------- masa: düz ön kenar + sağda 45° pah, sağ bölüm daha derin
def build_desk():
    # Adore Gaming Commander (160 x 75 cm, H 75 / raflarla 95). Ön orta kısım sığ, iki yan kanat öne çıkar (45° pah).
    # sahne (x,z): arka z=-3.2; orta ön z=-2.6; kanat önü z=-2.45
    pts = [(-1.0, -3.2), (1.0, -3.2), (1.0, -2.3), (0.7, -2.3), (0.45, -2.55), (-0.45, -2.55), (-0.7, -2.3), (-1.0, -2.3)]
    bm = bmesh.new()
    vs = [bm.verts.new((x, -z, DY - 0.025)) for x, z in pts]
    f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]: v.co.z += 0.025
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bmesh.ops.bevel(bm, geom=[e for e in bm.edges if e.calc_face_angle(0) > 0.5], offset=0.003, segments=2, affect='EDGES', clamp_overlap=True)
    top = obj_from_bm(bm, 'desk_top', M['deskWhite'], 30)
    fr = mat('desk_frame', 0x111113, 0.45, 0.6)
    o = [top]
    # metal çerçeve: iki yan ayak + arka bağlantılar
    for sx in (-0.94, 0.94):
        o.append(rbox(0.05, 0.05, DY - 0.07, 0.004, fr, sx, 2.75, 0.04))
        o.append(rbox(0.06, 0.8, 0.04, 0.004, fr, sx, 2.75, 0.0))
        o.append(rbox(0.04, 0.8, 0.04, 0.004, fr, sx, 2.75, DY - 0.065))
    o.append(rbox(1.84, 0.04, 0.05, 0.004, fr, 0, 3.12, DY - 0.075))
    o.append(rbox(1.84, 0.03, 0.03, 0.004, fr, 0, 3.0, 0.2))
    # alt kablo bölmesi ve ön tablet yuvası
    o.append(rbox(0.9, 0.16, 0.06, 0.004, fr, 0, 3.08, DY - 0.09))
    o.append(rbox(0.4, 0.012, 0.004, 0.001, mat('slot', 0x050505, 0.8), 0, 2.59, DY - 0.0005))
    # kulaklık askısı (sol) ve bardak tutucu (sağ)
    o.append(rbox(0.012, 0.012, 0.06, 0.002, fr, -1.006, 2.5, DY - 0.09))
    o.append(rbox(0.06, 0.012, 0.012, 0.002, fr, -1.03, 2.5, DY - 0.09))
    o.append(cyl(0.045, 0.006, fr, 1.05, 2.5, DY - 0.1, segs=24))
    o.append(rbox(0.012, 0.03, 0.012, 0.002, fr, 1.006, 2.5, DY - 0.1))
    parts['desk'] = join(o, 'desk')
    # RGB: yan köşelerde ince şerit (sayfada LED rengine göre boyanır)
    rgb = mat('RGB_strip', 0xff2418, 0.4, 0.0, emit=0xff2418, es=1.0)
    s1 = rbox(0.004, 0.3, 0.006, 0, rgb, -1.002, 2.45, DY - 0.018)
    s2 = rbox(0.004, 0.3, 0.006, 0, rgb, 1.002, 2.45, DY - 0.018)
    s3 = rbox(0.3, 0.004, 0.006, 0, rgb, -0.85, 2.298, DY - 0.018)
    s4 = rbox(0.3, 0.004, 0.006, 0, rgb, 0.85, 2.298, DY - 0.018)
    s5 = rbox(0.9, 0.004, 0.006, 0, rgb, 0, 2.6, 0.12)
    parts['desk_rgb'] = join([s1, s2, s3, s4, s5], 'desk_rgb')
    # iki parça yükseltilmiş raf (masa ile gelir) — hoparlörlerin altında, arka köşelerde
    for nm, sx in (('shelf_left', -0.85), ('shelf_right', 0.85)):
        q = [rbox(0.34, 0.26, 0.018, 0.004, M['riser'], 0, 0, 0.1)]
        for lx in (-0.15, 0.15): q.append(rbox(0.03, 0.22, 0.1, 0.003, M['riser'], lx, 0, 0))
        parts[nm] = place(join(q, nm), sx, DY, -3.05)
build_desk()

# ---------------- ADAM T8V (+ kısa siyah stand)
def adam(name, x, z, ry):
    W, D, H = 0.25, 0.335, 0.40
    z0 = 0.0
    o = [rbox(W, D, H, 0.012, M['blackBody'], 0, 0, z0)]
    fy = -D / 2 - 0.0005
    baffle = plane(W - 0.02, H - 0.02, mat('baffle', 0x111113, 0.6, 0.15), 0, 0, 0, name='bf')
    baffle.rotation_euler = (math.pi / 2, 0, 0); baffle.location = (0, fy, z0 + H / 2)
    o.append(baffle)
    wz = z0 + 0.15
    cone = cyl(0.092, 0.03, mat('woofer', 0x1c1c1f, 0.45, 0.35), 0, fy + 0.03, wz, segs=36, r2=0.035, axis='Y')
    o.append(cone)
    bmT = bmesh.new()
    R, rr, n1, n2 = 0.099, 0.008, 40, 10
    grid = []
    for i in range(n1):
        a = 2 * math.pi * i / n1; row = []
        for j in range(n2):
            b = 2 * math.pi * j / n2
            row.append(bmT.verts.new(((R + rr * math.cos(b)) * math.cos(a), -rr * math.sin(b), (R + rr * math.cos(b)) * math.sin(a))))
        grid.append(row)
    for i in range(n1):
        for j in range(n2):
            bmT.faces.new((grid[i][j], grid[(i + 1) % n1][j], grid[(i + 1) % n1][(j + 1) % n2], grid[i][(j + 1) % n2]))
    for v in bmT.verts: v.co += Vector((0, fy - 0.002, wz))
    o.append(obj_from_bm(bmT, 'surround', M['rubber'], 60))
    o.append(sphere(0.032, mat('dustcap', 0x202024, 0.35, 0.5), 0, fy - 0.004, wz, sy=0.45))
    # U-ART tweeter: dalga kılavuzu + altın şerit
    tz = z0 + 0.325
    o.append(rbox(0.105, 0.016, 0.072, 0.005, M['blackBody'], 0, fy - 0.006, tz - 0.036))
    o.append(rbox(0.078, 0.004, 0.05, 0.002, mat('wg_in', 0x050505, 0.8), 0, fy - 0.0145, tz - 0.025))
    for i in range(6):
        o.append(rbox(0.064, 0.002, 0.004, 0, M['gold'], 0, fy - 0.0168, tz - 0.021 + i * 0.0078))
    logo = plane(0.07, 0.0175, TEX('TEX_adam', 0x111111), 0, 0, 0, name='lg')
    logo.rotation_euler = (math.pi / 2, 0, 0); logo.location = (0, fy - 0.001, z0 + 0.03)
    o.append(logo)
    o.append(cyl(0.003, 0.002, M['meter'], 0.1, fy - 0.001, z0 + 0.03, segs=10, axis='Y'))
    parts[name] = place(join(o, name), x, SHELF, z, ry)
SHELF = DY + 0.118
adam('adam_left', -0.85, -3.04, 0.25)
adam('adam_right', 0.85, -3.04, -0.25)
TOP_SPK = SHELF + 0.40

# beyaz silindir (sol hoparlör üstü) ve Lego figürü (sağ hoparlör üstü)
parts['router'] = place(join([cyl(0.058, 0.215, M['plasticWhite'], segs=36, bevel=0.01)], 'router'), -0.85, TOP_SPK, -3.04)
def lego():
    o = [rbox(0.09, 0.06, 0.012, 0.002, M['legoBrown'])]
    o.append(rbox(0.05, 0.03, 0.05, 0.004, M['lego'], 0, 0, 0.012))
    o.append(cyl(0.021, 0.035, M['lego'], 0, 0, 0.062, segs=20, bevel=0.003))
    o.append(cyl(0.006, 0.005, M['lego'], 0, 0, 0.097, segs=12))
    for s in (-1, 1):
        o.append(rbox(0.012, 0.012, 0.04, 0.002, M['lego'], s * 0.032, 0, 0.02))
        w = rbox(0.055, 0.012, 0.008, 0.002, M['legoOrange'], s * 0.05, 0.0, 0.058); w.rotation_euler = (0, s * -0.4, 0)
        o.append(w)
        o.append(sphere(0.004, M['eye'], s * 0.008, -0.019, 0.082))
    parts['lego'] = place(join(o, 'lego'), 0.85, TOP_SPK, -3.04, -0.25)
lego()

# ---------------- PS5 (dikey, beyaz paneller + siyah gövde)
def ps5():
    o = [rbox(0.12, 0.22, 0.012, 0.003, M['ps5Core'])]
    o.append(rbox(0.07, 0.2, 0.35, 0.01, M['ps5Core'], 0, 0, 0.014))
    for s in (-1, 1):
        o.append(rbox(0.012, 0.215, 0.358, 0.006, M['plasticWhite'], s * 0.0425, 0, 0.012))
    parts['ps5'] = place(join(o, 'ps5'), -0.56, DY, -3.06, 0.12)
# ps5()  → hazır model: assets/models/ps5.glb

# ---------------- kavisli monitör (1500R, ~32")
def monitor():
    o = []
    st = M['darkAlu']
    o.append(rbox(0.32, 0.2, 0.012, 0.004, st, 0, 0.02, 0))
    o.append(rbox(0.05, 0.025, 0.26, 0.006, st, 0, 0.05, 0.01))
    R, W, H, zc = 1.5, 0.71, 0.4, 0.37
    ang = W / R; n = 40
    # ekran (iç yüzey, UV 0..1), kabuk (arka)
    def arc(radius, height, mname, uv):
        bm = bmesh.new(); uvl = bm.loops.layers.uv.new() if uv else None
        cols = []
        for i in range(n + 1):
            a = -ang / 2 + ang * i / n
            x = radius * math.sin(a); y = radius * math.cos(a) - R
            cols.append((bm.verts.new((x, y, zc - height / 2)), bm.verts.new((x, y, zc + height / 2)), i / n))
        for i in range(n):
            a0, a1 = cols[i], cols[i + 1]
            f = bm.faces.new((a0[0], a1[0], a1[1], a0[1]))
            if uv:
                for l in f.loops:
                    v = l.vert
                    u = a0[2] if v in (a0[0], a0[1]) else a1[2]
                    l[uvl].uv = (u, 0.0 if v in (a0[0], a1[0]) else 1.0)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        return obj_from_bm(bm, mname, MATS.get(mname) or TEX(mname), 89)
    scr = arc(R, H, 'SCREEN_main', True)
    # ön yüze bakacak şekilde (normaller -Y)
    if scr.data.polygons[n // 2].normal.y > 0:
        scr.data.flip_normals()
    o.append(scr)
    shell = arc(R + 0.006, H + 0.014, 'monitor_shell', False)
    shell.data.materials.clear(); shell.data.materials.append(M['blackBody'])
    for v in shell.data.vertices: v.co.y += 0.004
    o.append(shell)
    o.append(rbox(0.42, 0.03, 0.26, 0.01, M['blackBody'], 0, 0.035, zc - 0.13))
    parts['monitor'] = place(join(o, 'monitor'), -0.05, DY, -3.08)
monitor()

# ---------------- siyah yükselticiler (DrumBrute ve AudioFuse altında, ~9 cm)
def riser(name, x, z, w, d, h=0.09):
    o = [rbox(w, d, 0.012, 0.003, M['riser'], 0, 0, h - 0.012)]
    for sx in (-w / 2 + 0.02, w / 2 - 0.02):
        o.append(rbox(0.018, d - 0.02, h - 0.012, 0.003, M['riser'], sx, 0, 0))
    parts[name] = place(join(o, name), x, DY, z)
    return DY + h

# ---------------- gümüş laptop standı (yan kamalar + ön tırnak)
def alu_stand(name, x, z, ry, w, d, tilt, h0=0.02, m=None):
    t = math.tan(tilt); hb = h0 + d * t
    o = []
    for sx in (-w / 2 + 0.03, w / 2 - 0.03):
        o.append(prism([(-d / 2, 0), (d / 2, 0), (d / 2, hb), (-d / 2 + 0.03, h0 + 0.03 * t), (-d / 2, h0)], 0.014, m or M['alu'], sx))
        lip = rbox(0.03, 0.012, 0.02, 0.003, m or M['alu'], sx, -d / 2 + 0.006, h0)
        o.append(lip)
    parts[name] = place(join(o, name), x, DY, z, ry)
    return DY + h0 + (d / 2) * t

def on_stand(o, x, y, z, ry, tilt):
    return place(o, x, y, z, ry, tilt)

# ---------------- Ableton Push 3 (380x318x44.5)
def push3():
    W, D, H = 0.38, 0.318, 0.0445
    o = [rbox(W, D, H, 0.008, M['blackBody'])]
    top = H
    o.append(plane(W - 0.012, D - 0.012, TEX('TEX_push', 0x141416, 0.6), 0, 0, top + 0.0003))
    ps, pg = 0.0225, 0.0035
    gx0, gy0 = -0.03 - 3.5 * (ps + pg), -0.035 - 3.5 * (ps + pg)
    for r in range(8):
        for c in range(8):
            o.append(rbox(ps, ps, 0.004, 0.0015, M['pad'], gx0 + c * (ps + pg), gy0 + r * (ps + pg), top))
    # sol dokunmatik şerit ve düğmeler
    o.append(rbox(0.018, 0.2, 0.002, 0.002, M['btnDark'], -0.168, -0.035, top))
    for i in range(8): o.append(rbox(0.022, 0.012, 0.004, 0.0015, M['btnGray'], -0.145, -0.12 + i * 0.026, top))
    # sağ sütun: sahne düğmeleri + jog + oklar
    for i in range(8): o.append(rbox(0.016, 0.016, 0.004, 0.0015, M['btnDark'], 0.115, gy0 + i * (ps + pg), top))
    o += knob(0.017, 0.012, 0.155, 0.02, top, M['knobBlack'], M['darkAlu'], M['line'])
    for dx, dy in ((0.155, -0.05), (0.155, -0.09), (0.135, -0.07), (0.175, -0.07)):
        o.append(rbox(0.014, 0.014, 0.004, 0.0015, M['btnDark'], dx, dy, top))
    # ekran + enkoder sırası (arka)
    o.append(rbox(0.25, 0.034, 0.0015, 0.001, mat('push_display', 0x05070a, 0.15, 0.2, emit=0x1a2230, es=0.6), -0.03, 0.118, top))
    for i in range(8): o += knob(0.0085, 0.01, -0.135 + i * 0.03, 0.143, top, M['knobBlack'], M['darkAlu'], M['line'])
    for i in range(8): o.append(rbox(0.022, 0.009, 0.003, 0.001, M['btnDark'], -0.135 + i * 0.03, 0.093, top))
    return join(o, 'push3')
y = alu_stand('stand_push', -0.74, -2.56, 0.18, 0.42, 0.33, math.radians(20))
parts['push3'] = place(push3(), -0.74, y, -2.56, 0.18, math.radians(20))

# ---------------- Arturia DrumBrute Impact 1984 (beyaz, 320x290x90 kama)
def drumbrute():
    W, D, Hf, Hb = 0.32, 0.29, 0.045, 0.09
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        y = v.co.y * D; hz = Hb if v.co.y > 0 else Hf
        v.co = Vector((v.co.x * W, y, (v.co.z + 0.5) * hz))
    bmesh.ops.bevel(bm, geom=bm.edges[:], offset=0.006, segments=2, affect='EDGES', clamp_overlap=True)
    o = [obj_from_bm(bm, 'db_body', M['dbWhite'], 30)]
    # ön turuncu şerit
    o.append(rbox(W - 0.004, 0.002, 0.012, 0, M['orange'], 0, -D / 2 - 0.0005, 0.012))
    slope = math.atan((Hb - Hf) / D)
    comp = []
    tp = plane(W - 0.01, D / math.cos(slope) - 0.01, TEX('TEX_drum', 0xe7e4dc, 0.5), 0, 0, 0.0003, name='dbtop')
    comp.append(tp)
    # fotoğraftaki 1984 paneli: sol üst siyah şerit (ekran + 4 beyaz düğme), üst ortada 2x8 adım düğmesi,
    # sağ üstte turuncu halkalı + gri büyük düğme, solda düğme sütunu + camgöbeği shift, 8 enstrüman sütunu, önde turuncu şerit
    capG = mat('drum_knob', 0xd2d0ca, 0.45, 0.05)
    comp.append(rbox(0.13, 0.034, 0.0012, 0, M['btnDark'], -0.085, 0.118, 0.0005))
    comp.append(rbox(0.026, 0.014, 0.0015, 0.0005, mat('db_disp', 0x200606, 0.3, 0, emit=0xff3020, es=0.6), -0.13, 0.118, 0.0016))
    for i in range(4): comp.append(rbox(0.016, 0.011, 0.004, 0.0015, M['btnWhite'], -0.104 + i * 0.022, 0.118, 0.0016))
    comp += knob(0.006, 0.014, -0.012, 0.112, 0.0005, M['knobBlack'], M['knobBlack'], M['line'])
    ring = cyl(0.0125, 0.002, M['orange'], 0.068, 0.122, 0.0005, segs=28)
    comp.append(ring)
    comp += knob(0.0095, 0.018, 0.068, 0.122, 0.0025, capG, capG, M['line'])
    comp += knob(0.0095, 0.018, 0.108, 0.122, 0.0005, capG, capG, M['line'])
    for r in range(2):
        for i in range(8):
            lit = (r == 0 and i in (0, 2, 4, 5, 7))
            comp.append(rbox(0.012, 0.01, 0.0035, 0.0015, M['stepLed'] if lit else M['btnWhite'], -0.088 + i * 0.019, 0.085 - r * 0.017, 0.0005))
    comp += knob(0.0075, 0.014, -0.138, 0.075, 0.0005, M['knobBlack'], M['knobBlack'], M['line'])
    for i in range(4): comp.append(rbox(0.016, 0.009, 0.003, 0.0012, M['btnWhite'], -0.138, 0.04 - i * 0.02, 0.0005))
    comp.append(cyl(0.0068, 0.005, M['cyan'], -0.138, -0.09, 0.0005, segs=20, bevel=0.0015))
    comp.append(cyl(0.0045, 0.0055, M['knobBlack'], -0.138, -0.09, 0.0005, segs=16))
    for c in range(8):
        x = -0.1 + c * 0.0335
        for r, yy in enumerate((0.038, 0.005, -0.03)):
            comp += knob(0.0072, 0.016, x + (0.006 if r == 1 else 0), yy, 0.0005, capG, capG, M['line'])
        comp.append(rbox(0.022, 0.019, 0.006, 0.002, M['padRim'], x, -0.082, 0.0005))
    comp.append(rbox(W - 0.012, 0.009, 0.0008, 0, M['orange'], 0, -0.112, 0.0005))
    tj = join(comp, 'db_top')
    tj.rotation_euler = (slope, 0, 0); tj.location = (0, 0, (Hf + Hb) / 2)
    o.append(tj)
    return join(o, 'drumbrute')
y = alu_stand('stand_drum', -0.4, -2.82, 0.08, 0.34, 0.3, math.radians(12), 0.05, M['riser'])
parts['drumbrute'] = place(drumbrute(), -0.4, y, -2.82, 0.08, math.radians(12))

# ---------------- Arturia AudioFuse Studio (265x160x72)
def audiofuse():
    W, D, H = 0.265, 0.16, 0.072
    o = [rbox(W, D, H, 0.008, mat('fuse_body', 0x141416, 0.4, 0.7))]
    o.append(plane(W - 0.01, D - 0.01, TEX('TEX_fuse', 0x1b1b1f, 0.45), 0, 0, H + 0.0003))
    for x in (-0.093, -0.057, -0.022, 0.014):
        o += knob(0.0105, 0.013, x, -0.037, H, M['knobSilver'], M['knobSilver'], M['knobBlack'])
    for x in (0.051, 0.088):
        o += knob(0.0105, 0.013, x, -0.036, H, M['knobSilver'], M['knobSilver'], M['knobBlack'])
    o += knob(0.019, 0.016, 0.066, 0.026, H, M['knobSilver'], M['knobSilver'], M['knobBlack'])
    # ön panel: 4 kombo giriş + kulaklık çıkışları
    fy = -D / 2 - 0.001
    for i in range(4):
        x = -0.095 + i * 0.038
        o.append(cyl(0.012, 0.004, M['darkAlu'], x, fy, H / 2, segs=24, axis='Y'))
        o.append(cyl(0.0055, 0.006, M['knobBlack'], x, fy - 0.001, H / 2, segs=16, axis='Y'))
    for x in (0.075, 0.105):
        o.append(cyl(0.005, 0.004, M['knobSilver'], x, fy, H / 2 - 0.01, segs=16, axis='Y'))
    return join(o, 'audiofuse')
y = alu_stand('stand_fuse', -0.02, -2.9, 0.0, 0.28, 0.18, math.radians(14), 0.06, M['riser'])
RB = y
parts['audiofuse'] = place(audiofuse(), -0.02, y, -2.9, 0.0, math.radians(14))

# ---------------- Acid 303 / Behringer TD-3 (305x165x56)
def td3():
    W, D, H = 0.305, 0.165, 0.056
    o = [rbox(W, D, H, 0.006, mat('td3_body', 0x1b1c1f, 0.45, 0.4))]
    for sx in (-0.13, 0.13):
        for sy in (-0.06, 0.06): o.append(cyl(0.008, 0.006, M['rubber'], sx, sy, -0.006, segs=10))
    o.append(plane(W - 0.01, D - 0.01, TEX('TEX_td3', 0x1b1c1f, 0.5), 0, 0, H + 0.0003))
    for i in range(7): o += knob(0.0085, 0.012, -0.12 + i * 0.033, 0.05, H, M['knobBlack'], M['knobSilver'], M['line'])
    for x in (-0.03, 0.03): o += knob(0.013, 0.014, x, 0.012, H, M['knobBlack'], M['knobSilver'], M['line'])
    o += knob(0.0085, 0.012, -0.12, 0.012, H, M['knobBlack'], M['knobSilver'], M['line'])
    # piyano düzeninde adım düğmeleri
    for i in range(8): o.append(rbox(0.016, 0.026, 0.005, 0.0015, M['btnWhite'], -0.035 + i * 0.019, -0.045, H))
    for i in (0, 1, 3, 4, 5): o.append(rbox(0.011, 0.016, 0.007, 0.0015, M['keyBlack'], -0.026 + i * 0.019, -0.03, H))
    for i in range(6): o.append(rbox(0.014, 0.012, 0.005, 0.0015, M['btnDark'], -0.135 + (i % 3) * 0.022, -0.035 - (i // 3) * 0.02, H))
    return join(o, 'td3')
parts['td3'] = place(td3(), 0.33, DY + 0.006, -2.86, -0.06)

# ---------------- Arturia MicroFreak (311x233x55)
def microfreak():
    W, D, H = 0.311, 0.233, 0.055
    o = [rbox(W, D, H, 0.008, mat('mf_body', 0x1c1d21, 0.45, 0.35))]
    kd = 0.088
    o.append(plane(W - 0.01, D - kd - 0.012, TEX('TEX_mf', 0x1c1d21, 0.5), 0, kd / 2, H + 0.0003))
    o.append(plane(W - 0.012, kd, TEX('TEX_mfkeys', 0xdedede, 0.55), 0, -D / 2 + kd / 2 + 0.004, H + 0.0004))
    o.append(rbox(0.024, 0.014, 0.0012, 0, mat('mf_oled', 0x020203, 0.2, 0.0, emit=0x9fd8ff, es=0.4), -0.1505 + 0.605 * 0.301, 0.1105 - 0.2 * 0.133, H))
    # panel bölgesi y: -0.0225..0.1105 (arka); x: -0.1505..0.1505
    X = lambda f: -0.1505 + f * 0.301
    Y = lambda f: 0.1105 - f * 0.133
    K = [  # (x oranı, y oranı, yarıçap, kapak)
        (0.34, 0.2, 0.0075, 'w'), (0.69, 0.2, 0.0075, 'b'), (0.75, 0.2, 0.0065, 'b'), (0.81, 0.2, 0.0065, 'b'), (0.9, 0.2, 0.0075, 'b'),
        (0.05, 0.47, 0.0065, 'b'), (0.16, 0.47, 0.0075, 'o'), (0.23, 0.47, 0.0075, 'o'), (0.3, 0.47, 0.0075, 'o'), (0.37, 0.47, 0.0075, 'o'),
        (0.46, 0.47, 0.0065, 'b'), (0.53, 0.47, 0.0085, 'b'), (0.6, 0.47, 0.0075, 'b'), (0.72, 0.47, 0.0065, 'b'),
        (0.79, 0.47, 0.0075, 'b'), (0.86, 0.47, 0.0075, 'b'), (0.93, 0.47, 0.0075, 'b'),
        (0.04, 0.73, 0.0065, 'b'), (0.1, 0.73, 0.0065, 'b'), (0.18, 0.73, 0.006, 'b'), (0.25, 0.73, 0.006, 'b'),
        (0.33, 0.73, 0.0075, 'w'), (0.45, 0.73, 0.0065, 'b'), (0.56, 0.73, 0.0075, 'b'), (0.63, 0.73, 0.0075, 'w'),
        (0.72, 0.73, 0.0065, 'b'), (0.79, 0.73, 0.0065, 'b'), (0.86, 0.73, 0.0065, 'b'), (0.93, 0.73, 0.0065, 'b'),
    ]
    caps = {'o': M['knobOrange'], 'w': M['knobWhite'], 'b': M['knobBlack']}
    for fx, fy, r, c in K:
        o += knob(r, 0.012, X(fx), Y(fy), H, M['knobBlack'], caps[c], M['line'])
    return join(o, 'microfreak')
y = alu_stand('stand_mf', 0.6, -2.62, -0.22, 0.32, 0.23, math.radians(22))
parts['microfreak'] = place(microfreak(), 0.6, y, -2.62, -0.22, math.radians(22))

# ---------------- Logitech Craft + MX Master 3 + DualSense
def craft():
    W, D = 0.43, 0.149
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co = Vector((v.co.x * W, v.co.y * D, (v.co.z + 0.5) * (0.032 if v.co.y > 0 else 0.016)))
    bmesh.ops.bevel(bm, geom=bm.edges[:], offset=0.005, segments=2, affect='EDGES', clamp_overlap=True)
    o = [obj_from_bm(bm, 'kb', M['keyDark'], 30)]
    slope = math.atan(0.016 / D)
    keys = []
    rows = [(15, 0.0), (14, 0.0), (14, 0.0), (13, 0.0), (11, 0.0)]
    kw = 0.0175
    for r, (n, off) in enumerate(rows):
        for i in range(n):
            w = kw * (1.6 if (r == 4 and i == 5) else 1.0)
            keys.append(rbox(kw - 0.003, kw - 0.003, 0.004, 0.0015, M['keyBlack'], -0.175 + i * 0.0182, 0.035 - r * 0.0185, 0.0))
    for r in range(5):
        for c in range(4):
            if r == 0 and c == 3: continue
            keys.append(rbox(kw - 0.003, kw - 0.003, 0.004, 0.0015, M['keyBlack'], 0.125 + c * 0.0182, 0.035 - r * 0.0185, 0.0))
    for c in range(3): keys.append(rbox(kw - 0.003, kw - 0.003, 0.004, 0.0015, M['keyBlack'], 0.1 - 0.0182 + c * 0.0182 - 0.0, -0.039, 0.0))
    keys.append(plane(0.33, 0.1, TEX('TEX_craft', 0x000000, 0.6), 0.0, -0.0, 0.0042))
    kj = join(keys, 'kb_keys')
    kj.rotation_euler = (slope, 0, 0); kj.location = (-0.012, -0.012, 0.024)
    o.append(kj)
    o.append(cyl(0.02, 0.012, mat('crown', 0x26272b, 0.35, 0.6), -0.185, 0.05, 0.024, segs=32, bevel=0.002))
    return join(o, 'craft')
parts['craft'] = place(craft(), -0.06, DY + 0.002, -2.66)

def mx_master():
    o = [sphere(0.05, mat('mx', 0x2c2d31, 0.5, 0.1), 0, 0, 0.0, sx=0.85, sy=1.26, sz=0.5)]
    o.append(cyl(0.009, 0.006, M['knobSilver'], 0.0, 0.03, 0.022, segs=20, axis='Y'))
    o.append(rbox(0.02, 0.05, 0.006, 0.002, mat('mx_thumb', 0x1d1e21, 0.5), -0.042, -0.0, 0.0))
    return join(o, 'mx_master')
parts['mx'] = place(mx_master(), 0.28, DY + 0.004, -2.64, 0.15)

def dualsense():
    o = [rbox(0.1, 0.07, 0.03, 0.012, M['ps5Core'], 0, 0.01, 0.012)]
    for s in (-1, 1):
        g = sphere(0.03, M['plasticWhite'], s * 0.055, -0.01, 0.022, sx=0.95, sy=1.6, sz=0.7)
        g.rotation_euler = (0, 0, s * 0.35)
        o.append(g)
        o.append(cyl(0.009, 0.012, M['knobBlack'], s * 0.022, -0.01, 0.035, segs=18, bevel=0.002))
    o.append(rbox(0.05, 0.03, 0.004, 0.002, M['ps5Core'], 0, 0.025, 0.04))
    return join(o, 'dualsense')
# DualSense → hazır model: assets/models/dualsense.glb

# ---------------- MacBook Pro 14 (standda)
def macbook():
    o = [rbox(0.3557, 0.2481, 0.0168, 0.005, M['mbGray'])]
    o.append(plane(0.3, 0.105, TEX('TEX_mbkeys', 0x0d0d0f, 0.5), 0, 0.04, 0.0171))
    o.append(rbox(0.16, 0.09, 0.0003, 0, mat('trackpad', 0x26272a, 0.4, 0.7), 0, -0.07, 0.0168))
    # kapak kapalıyken hem menteşeden öne (-Y) uzanır; ekran alt yüzde (-Z)
    lid = [rbox(0.3557, 0.24, 0.007, 0.004, M['mbGray'], 0, -0.12, 0)]
    scr = plane(0.343, 0.222, TEX('SCREEN_laptop', 0x111111, 0.3), 0, -0.121, -0.0004)
    scr.data.flip_normals()
    lid.append(scr)
    lj = join(lid, 'mb_lid')
    lj.rotation_euler = (math.radians(-110), 0, 0)
    lj.location = (0, 0.118, 0.0168)
    o.append(lj)
    return join(o, 'macbook')
y = alu_stand('stand_mb', 0.82, -2.47, -0.6, 0.32, 0.28, math.radians(14))
# MacBook → hazır model: assets/models/macbook.glb (standın üstü: y)

# ---------------- Tascam DR-05X (61x141x26), masada yatık
def dr05x():
    o = [rbox(0.061, 0.141, 0.026, 0.006, mat('dr_body', 0x1c1c1e, 0.55, 0.2))]
    o.append(rbox(0.034, 0.03, 0.0008, 0, mat('dr_lcd', 0x0a120c, 0.2, 0, emit=0x6cff9a, es=0.25), 0, 0.01, 0.026))
    for i in range(3): o.append(cyl(0.004, 0.003, M['btnGray'], -0.012 + i * 0.012, -0.03, 0.026, segs=12))
    for s in (-1, 1):
        m = cyl(0.009, 0.022, M['knobSilver'], s * 0.012, 0.07, 0.013, segs=18, axis='Y')
        m.rotation_euler = (0, 0, s * 0.5)
        o.append(m)
    return join(o, 'dr05x')
parts['dr05x'] = place(dr05x(), 0.62, DY, -2.36, 0.62)

# ---------------- mat (masa önü boyunca)
parts['mat'] = place(join([plane(0.95, 0.42, TEX('TEX_mat', 0xe8601c, 0.9), 0, 0, 0.0015)], 'mat'), -0.02, DY, -2.77)

# ---------------- Grogu + LED mumlar (monitörün sağı)
def grogu():
    o = [cyl(0.03, 0.075, M['grogRobe'], 0, 0, 0, segs=20, r2=0.045)]
    o.append(sphere(0.05, M['grogRobe'], 0, 0, 0.02, sx=1.2, sy=1.0, sz=0.6))
    o.append(sphere(0.045, M['grogSkin'], 0, 0, 0.115, sx=1.08, sy=0.95, sz=0.9))
    for s in (-1, 1):
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.024, radius2=0.002, depth=0.11)
        for v in bm.verts: v.co = Vector((s * (v.co.z + 0.055), v.co.y * 0.4, v.co.x * 0.9))
        e = obj_from_bm(bm, 'ear', M['grogSkin'], 60)
        e.location = (s * 0.04, 0, 0.125)
        e.rotation_euler = (0, -s * 0.3, 0)
        o.append(e)
        o.append(sphere(0.0105, M['eye'], s * 0.017, -0.038, 0.118))
        o.append(sphere(0.012, M['grogSkin'], s * 0.035, -0.03, 0.04, sz=1.6))
    return join(o, 'grogu')
# Grogu → hazır model: assets/models/grogu.glb
def candles():
    o = []
    for i, (x, y, h) in enumerate(((0, 0, 0.06), (0.03, 0.015, 0.045), (-0.025, 0.02, 0.05))):
        o.append(cyl(0.013, h, M['candle'], x, y, 0, segs=18))
        o.append(sphere(0.006, M['flame'], x, y, h + 0.008, sz=1.7, segs=10))
    return join(o, 'candles')
parts['candles'] = place(candles(), 0.27, DY, -2.98)

# ---------------- kablolar (arayüzden matın üstüne; siyah ve kırmızı)
def cable(name, pts, m, r=0.0035):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    sp = cu.splines.new('NURBS'); sp.points.add(len(pts) - 1)
    for p, (x, y, z) in zip(sp.points, pts): p.co = (x, -z, y, 1)
    sp.use_endpoint_u = True; sp.order_u = 3
    cu.bevel_depth = r; cu.bevel_resolution = 2; cu.resolution_u = 10
    ob = bpy.data.objects.new(name + '_c', cu); COL.objects.link(ob); ob.data.materials.append(m)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob)
    mo = bpy.data.objects.new(name, me); COL.objects.link(mo)
    if not me.materials: me.materials.append(m)
    return mo
cbl = []
for i, (x0, dx, m) in enumerate(((-0.075, -0.12, M['cable']), (-0.037, -0.05, M['cable']), (0.0, 0.04, M['cableRed']), (0.038, 0.1, M['cable']))):
    cbl.append(cable('cab%d' % i, [(x0 - 0.02, RB + 0.03, -2.98), (x0 - 0.02 + dx * 0.2, RB - 0.02, -2.8), (x0 + dx * 0.6, DY + 0.006, -2.74), (x0 + dx, DY + 0.004, -2.66), (x0 + dx * 1.3, DY + 0.004, -2.6)], m))
parts['cables'] = join(cbl, 'cables')

# ---------------- dışa aktar
for o in bpy.context.scene.objects:
    if o.type == 'MESH': o.data.update()
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True,
                          export_cameras=False, export_lights=False, export_materials='EXPORT',
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
print('EXPORTED', OUT, os.path.getsize(OUT), 'bytes')
for k, o in parts.items(): print('PART', k, o.name)
