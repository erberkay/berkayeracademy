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

def knob2(r, h, x, y, z, cap, body=None, line=None, knurl=True, name='k'):
    """tırtıklı gövde + pahlı kapak + gösterge çizgisi (MicroFreak/AudioFuse için)"""
    body = body or M['knobBlack']
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=40, radius1=r, radius2=r * 0.96, depth=h * 0.62)
    if knurl:
        for v in bm.verts:
            if abs(v.co.x) + abs(v.co.y) < 1e-6: continue
            k = round(math.atan2(v.co.y, v.co.x) / (2 * math.pi / 40))
            if k % 2: v.co.x *= 0.93; v.co.y *= 0.93
    for v in bm.verts: v.co += Vector((x, y, z + h * 0.31))
    out = [obj_from_bm(bm, name, body, 25)]
    out.append(cyl(r * 0.84, h * 0.38, cap, x, y, z + h * 0.62, segs=36, r2=r * 0.8, bevel=r * 0.14, name=name))
    if line is not None:
        out.append(rbox(r * 0.13, r * 0.62, 0.0012, 0, line, x, y + r * 0.42, z + h, name=name))
    return out

def pill(w, d, h, m, x, y, z, name='btn'):
    return rbox(w, d, h, min(w, d) * 0.28, m, x, y, z, segs=2, name=name)

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
    pts = [(-1.2, -3.2), (1.2, -3.2), (1.2, -2.3), (0.7, -2.3), (0.45, -2.55), (-0.45, -2.55), (-0.7, -2.3), (-1.2, -2.3)]
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
    for sx in (-1.14, 1.14):
        o.append(rbox(0.05, 0.05, DY - 0.07, 0.004, fr, sx, 2.75, 0.04))
        o.append(rbox(0.06, 0.8, 0.04, 0.004, fr, sx, 2.75, 0.0))
        o.append(rbox(0.04, 0.8, 0.04, 0.004, fr, sx, 2.75, DY - 0.065))
    o.append(rbox(2.24, 0.04, 0.05, 0.004, fr, 0, 3.12, DY - 0.075))
    o.append(rbox(2.24, 0.03, 0.03, 0.004, fr, 0, 3.0, 0.2))
    # alt kablo bölmesi ve ön tablet yuvası
    o.append(rbox(0.9, 0.16, 0.06, 0.004, fr, 0, 3.08, DY - 0.09))
    o.append(rbox(0.4, 0.012, 0.004, 0.001, mat('slot', 0x050505, 0.8), 0, 2.59, DY - 0.0005))
    # kulaklık askısı (sol) ve bardak tutucu (sağ)
    o.append(rbox(0.012, 0.012, 0.06, 0.002, fr, -1.206, 2.5, DY - 0.09))
    o.append(rbox(0.06, 0.012, 0.012, 0.002, fr, -1.23, 2.5, DY - 0.09))
    o.append(cyl(0.045, 0.006, fr, 1.25, 2.5, DY - 0.1, segs=24))
    o.append(rbox(0.012, 0.03, 0.012, 0.002, fr, 1.206, 2.5, DY - 0.1))
    parts['desk'] = join(o, 'desk')
    # RGB: yan köşelerde ince şerit (sayfada LED rengine göre boyanır)
    rgb = mat('RGB_strip', 0xff2418, 0.4, 0.0, emit=0xff2418, es=1.0)
    s1 = rbox(0.004, 0.3, 0.006, 0, rgb, -1.202, 2.45, DY - 0.018)
    s2 = rbox(0.004, 0.3, 0.006, 0, rgb, 1.202, 2.45, DY - 0.018)
    s3 = rbox(0.5, 0.004, 0.006, 0, rgb, -0.95, 2.298, DY - 0.018)
    s4 = rbox(0.5, 0.004, 0.006, 0, rgb, 0.95, 2.298, DY - 0.018)
    s5 = rbox(0.9, 0.004, 0.006, 0, rgb, 0, 2.6, 0.12)
    parts['desk_rgb'] = join([s1, s2, s3, s4, s5], 'desk_rgb')
    # iki parça yükseltilmiş raf (masa ile gelir) — hoparlörlerin altında, arka köşelerde
    for nm, sx in (('shelf_left', -1.05), ('shelf_right', 1.05)):
        q = [rbox(0.34, 0.26, 0.018, 0.004, M['riser'], 0, 0, 0.1)]
        for lx in (-0.15, 0.15): q.append(rbox(0.03, 0.22, 0.1, 0.003, M['riser'], lx, 0, 0))
        parts[nm] = place(join(q, nm), sx, DY, -3.05)
build_desk()

# ---------------- ADAM T8V (+ kısa siyah stand)
def adam(name, x, z, ry, base=None):
    W, D, H = 0.25, 0.335, 0.40
    z0 = 0.0
    cab = M['blackBody']
    o = [rbox(W - 0.03, D, H, 0.01, cab, 0, 0.012, z0)]
    # ön yüz: ortası düz, iki yanda içe kıvrılan pahlar (T8V'nin trapez görünümü)
    fy = -D / 2 + 0.012
    o.append(rbox(W - 0.07, 0.03, H - 0.012, 0.006, mat('t8v_front', 0x101012, 0.6, 0.15), 0, fy - 0.003, z0 + 0.006))
    for s_ in (-1, 1):
        ch = prism([(-0.02, 0), (0.02, 0), (0.02, H - 0.012), (-0.02, H - 0.012)], 0.03, mat('t8v_chamfer', 0x1c1c1f, 0.45, 0.25), 0)
        ch.location = (s_ * (W / 2 - 0.022), fy + 0.005, z0 + 0.006)
        ch.rotation_euler = (0, 0, s_ * 0.55)
        o.append(ch)
    face = fy - 0.018
    # woofer: koni profili (tornalama), lastik kenar, toz kapağı
    wz = z0 + 0.155
    prof = [(0.033, 0.0), (0.05, -0.006), (0.07, -0.013), (0.086, -0.018), (0.089, -0.0185)]
    bm = bmesh.new(); rings = []
    for (rr, dz) in prof:
        ring = [bm.verts.new((rr * math.cos(t * 2 * math.pi / 48), 0, rr * math.sin(t * 2 * math.pi / 48))) for t in range(48)]
        for v in ring: v.co.y = -dz
        rings.append(ring)
    for i in range(len(rings) - 1):
        for t in range(48):
            a1, a2 = rings[i][t], rings[i][(t + 1) % 48]; b1, b2 = rings[i + 1][(t + 1) % 48], rings[i + 1][t]
            bm.faces.new((a1, a2, b1, b2))
    for v in bm.verts: v.co += Vector((0, face - 0.004 + 2 * v.co.y, wz))
    o.append(obj_from_bm(bm, 'cone', mat('t8v_cone', 0x232327, 0.6, 0.15), 60))
    bmT = bmesh.new(); R_, rr_, n1, n2 = 0.0985, 0.009, 48, 10; grid = []
    for i in range(n1):
        a_ = 2 * math.pi * i / n1; row = []
        for j in range(n2):
            b_ = 2 * math.pi * j / n2
            row.append(bmT.verts.new(((R_ + rr_ * math.cos(b_)) * math.cos(a_), -rr_ * math.sin(b_) * 0.8, (R_ + rr_ * math.cos(b_)) * math.sin(a_))))
        grid.append(row)
    for i in range(n1):
        for j in range(n2):
            bmT.faces.new((grid[i][j], grid[(i + 1) % n1][j], grid[(i + 1) % n1][(j + 1) % n2], grid[i][(j + 1) % n2]))
    for v in bmT.verts: v.co += Vector((0, face - 0.024, wz))
    o.append(obj_from_bm(bmT, 'surround', M['rubber'], 60))
    o.append(cyl(0.108, 0.003, mat('t8v_ring', 0x0d0d0f, 0.5, 0.2), 0, face - 0.003, wz, segs=48, axis='Y'))
    o.append(sphere(0.034, mat('t8v_cap', 0x18181b, 0.35, 0.3), 0, face - 0.004, wz, sy=0.42, segs=28))
    # U-ART tweeter: yuvarlatılmış dikdörtgen dalga kılavuzu + altın katlı şerit
    tz = z0 + 0.315
    rim = mat('t8v_wg_rim', 0x1d1d20, 0.4, 0.3)
    o.append(rbox(0.118, 0.004, 0.008, 0.003, rim, 0, face - 0.006, tz + 0.032))
    o.append(rbox(0.118, 0.004, 0.008, 0.003, rim, 0, face - 0.006, tz - 0.04))
    for s_ in (-1, 1): o.append(rbox(0.008, 0.004, 0.08, 0.003, rim, s_ * 0.055, face - 0.006, tz - 0.04))
    o.append(rbox(0.102, 0.004, 0.064, 0.026, mat('t8v_wg', 0x050506, 0.7, 0.1), 0, face - 0.004, tz - 0.032))
    o.append(rbox(0.046, 0.002, 0.044, 0.004, mat('t8v_tw_frame', 0x0a0a0b, 0.5, 0.2), 0, face - 0.0065, tz - 0.022))
    for i in range(6):
        o.append(rbox(0.04, 0.002, 0.0045, 0.0008, M['gold'], 0, face - 0.0078, tz - 0.019 + i * 0.0068))
    logo = plane(0.07, 0.0175, TEX('TEX_adam', 0x111111), 0, 0, 0, name='lg')
    logo.rotation_euler = (math.pi / 2, 0, 0); logo.location = (0, face - 0.0012, z0 + 0.034)
    o.append(logo)
    o.append(cyl(0.0025, 0.002, M['meter'], 0.075, face - 0.001, z0 + 0.034, segs=10, axis='Y'))
    # arka: bas refleks portu
    o.append(cyl(0.024, 0.006, M['rubber'], 0, D / 2 + 0.012, z0 + 0.3, segs=28, axis='Y'))
    parts[name] = place(join(o, name), x, SHELF if base is None else base, z, ry)
SHELF = DY + 0.118
adam('adam_left', -1.05, -3.04, 0.25)
adam('adam_right', 1.05, -3.04, -0.25)
TOP_SPK = SHELF + 0.40

# beyaz silindir (sol hoparlör üstü) ve Lego figürü (sağ hoparlör üstü)
# (sol hoparlör üstündeki beyaz silindir kullanıcı isteğiyle kaldırıldı)
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
    parts['lego'] = place(join(o, 'lego'), 1.05, TOP_SPK, -3.04, -0.25)
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
    X = lambda sx: (sx - 1200) / 2000 * W
    Y = lambda sy: (1002.83 - sy) / 1671.66 * D
    R = lambda r: r / 2000 * W
    o = [rbox(W, D, H, 0.008, mat('push_body', 0x141416, 0.5, 0.3))]
    o.append(plane(W - 0.002, D - 0.002, TEX('TEX_push', 0x141416, 0.55), 0, 0, H + 0.0003))
    # SVG'deki 11 döner kontrol (8 enkoder, sol iki düğme, sağ üst büyük teker)
    for sx, sy, r in ((646.8, 273.2, 33.5), (801.0, 273.2, 33.0), (956.3, 273.2, 33.0), (1113.2, 273.2, 33.0), (1265.8, 273.2, 33.0),
                      (1423.2, 273.2, 33.0), (1579.0, 273.2, 33.0), (1731.1, 273.2, 33.5), (297.0, 586.0, 61.0), (296.1, 905.4, 40.3)):
        o += knob2(R(r), 0.014 if r < 50 else 0.018, X(sx), Y(sy), H, mat('push_knob', 0x26252b, 0.45, 0.4), M['knobBlack'], None)
    o += knob2(R(104.3), 0.012, X(2071.6), Y(585.2), H, mat('push_jog', 0x2b2a30, 0.35, 0.55), M['knobBlack'], None)
    # ön kenar: ince parlak şerit (gövde birleşimi)
    o.append(rbox(W - 0.02, 0.002, 0.004, 0.001, mat('push_trim', 0x3a3a40, 0.3, 0.7), 0, -D / 2 - 0.0005, H * 0.55))
    return join(o, 'push3')
y = alu_stand('stand_push', -0.78, -2.53, 0.18, 0.42, 0.33, math.radians(20))
parts['push3'] = place(push3(), -0.78, y, -2.53, 0.18, math.radians(20))

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
y = alu_stand('stand_drum', -0.34, -2.85, 0.08, 0.34, 0.3, math.radians(12), 0.05, M['riser'])
parts['drumbrute'] = place(drumbrute(), -0.34, y, -2.85, 0.08, math.radians(12))

# ---------------- Arturia AudioFuse Studio (265x160x72)
def audiofuse():
    # referans görsel pikselleri → metre (üst görünüm 707..1329 x 293..680 px)
    W, D, H = 0.265, 0.16, 0.066
    X = lambda px: (px - 1018) / 621 * W
    Y = lambda py: (486.5 - py) / 387 * D
    R = lambda r: r / 621 * W
    body = mat('fuse_body', 0x17181b, 0.42, 0.75)
    o = [rbox(W, D, H - 0.004, 0.014, body, 0, 0, 0.004)]
    # alt turuncu çizgi + ayaklar
    o.append(rbox(W - 0.004, D - 0.004, 0.004, 0.012, M['orange'], 0, 0, 0.0))
    o.append(plane(W - 0.012, D - 0.012, TEX('TEX_fuse', 0x1c1d21, 0.45), 0, 0, H + 0.0003))
    btn = mat('fuse_btn', 0x34363c, 0.55, 0.2)
    silver = mat('fuse_knob', 0xc7cad0, 0.25, 0.95)
    # giriş kanalları: 4 düğme sütunu (48V, INST, RANGE, PHASE)
    for cx in (758, 847, 936, 1024):
        for py in (430, 455, 479, 503):
            o.append(pill(R(28), R(14), 0.0022, btn, X(cx), Y(py), H))
    # sağ sütun + DIM/MUTE/MONO + LISTEN + alt düğmeler
    for py in (431, 455, 479, 503): o.append(pill(R(30), R(14), 0.0022, btn, X(1279), Y(py), H))
    for px in (1142, 1182, 1222): o.append(pill(R(26), R(13), 0.0022, btn, X(px), Y(520), H))
    for px in (769, 858, 948, 1037): o.append(pill(R(22), R(11), 0.0022, btn, X(px), Y(632), H))
    for px in (1117, 1155, 1212, 1250): o.append(pill(R(24), R(12), 0.0022, btn, X(px), Y(632), H))
    o.append(pill(R(18), R(20), 0.0022, btn, X(1285), Y(578), H))
    o.append(cyl(R(9), 0.0018, btn, X(1240), Y(334), H, segs=20))
    # düğmeler: 4 GAIN, 2 PHONES, büyük OUTPUT LEVEL
    for px in (768, 858, 948, 1037): o += knob2(R(25), 0.016, X(px), Y(575), H, silver, silver, M['knobBlack'], knurl=False)
    for px in (1139, 1228): o += knob2(R(25), 0.016, X(px), Y(575), H, silver, silver, M['knobBlack'], knurl=False)
    o += knob2(R(47), 0.018, X(1182), Y(441), H, silver, silver, None, knurl=False)
    o.append(cyl(R(3), 0.001, mat('fuse_dot', 0x9fd8ff, 0.4, 0, emit=0x9fd8ff, es=1.2), X(1207), Y(497), H, segs=10))
    # ön yüz: 4 kombo giriş + 2 kulaklık
    fy = -D / 2 - 0.0005
    for i in range(4):
        x = -0.096 + i * 0.038
        o.append(cyl(0.0115, 0.004, M['darkAlu'], x, fy, H * 0.48, segs=28, axis='Y'))
        o.append(cyl(0.0068, 0.005, M['knobBlack'], x, fy - 0.001, H * 0.48, segs=20, axis='Y'))
        for k in range(3):
            a = math.radians(90 + k * 120)
            o.append(cyl(0.0012, 0.006, M['knobSilver'], x + math.cos(a) * 0.0048, fy - 0.001, H * 0.48 + math.sin(a) * 0.0048, segs=8, axis='Y'))
    for x in (0.068, 0.1):
        o.append(cyl(0.0058, 0.004, M['knobSilver'], x, fy, H * 0.45, segs=20, axis='Y'))
        o.append(cyl(0.0035, 0.005, M['knobBlack'], x, fy - 0.001, H * 0.45, segs=16, axis='Y'))
    # arka yüz (referans arka görsel 706..1329 px): baskı + jaklar
    by = D / 2 + 0.0004
    rear = plane(W - 0.012, H - 0.01, TEX('TEX_fuse_rear', 0x16171a, 0.5), 0, 0, 0, name='rear')
    rear.rotation_euler = (math.pi / 2, 0, math.pi); rear.location = (0, by, H / 2 + 0.002)
    o.append(rear)
    XR = lambda px: -(px - 1017.5) / 623 * W   # arkadan bakınca sağ-sol ters
    ZR = lambda py: (568 - py) / 156 * H
    for px, py in ((917, 494), (959, 494), (917, 533), (959, 533), (1014, 494), (1014, 533), (1069, 494), (1111, 494), (1069, 533), (1111, 533), (1165, 494), (1207, 494), (1165, 533), (1207, 533)):
        o.append(cyl(0.0062, 0.003, M['darkAlu'], XR(px), by, ZR(py), segs=20, axis='Y'))
        o.append(cyl(0.0034, 0.004, M['knobBlack'], XR(px), by + 0.0005, ZR(py), segs=16, axis='Y'))
    for px, py in ((1252, 499), (1252, 533), (961, 449), (1014, 449)):
        o.append(cyl(0.0048, 0.006, M['knobSilver'], XR(px), by, ZR(py), segs=18, axis='Y'))
    for px in (838, 859, 881):
        o.append(rbox(0.004, 0.003, 0.012, 0.0008, M['knobSilver'], XR(px), by, ZR(497) - 0.006))
    for i in range(4): o.append(rbox(0.008, 0.002, 0.007, 0.001, M['knobBlack'], XR(1140 + i * 37), by, ZR(452) - 0.0035))
    return join(o, 'audiofuse')
y = alu_stand('stand_fuse', -0.02, -2.9, 0.0, 0.28, 0.18, math.radians(14), 0.06, M['riser'])
RB = y
parts['audiofuse'] = place(audiofuse(), -0.02, y, -2.9, 0.0, math.radians(14))

# ---------------- Acid 303 / Behringer TD-3 (305x165x56)
def td3():
    W, D, H = 0.305, 0.165, 0.046
    o = [rbox(W, D, H, 0.004, mat('td3_body', 0x1c1d20, 0.45, 0.45), 0, 0, 0.006)]
    for sx in (-0.13, 0.13):
        for sy in (-0.06, 0.06): o.append(cyl(0.008, 0.006, M['rubber'], sx, sy, 0, segs=12))
    top = H + 0.006
    o.append(plane(W - 0.004, D - 0.004, TEX('TEX_td3', 0x1c1d20, 0.5), 0, 0, top + 0.0003))
    kn = mat('td3_knob', 0x0e0e10, 0.45, 0.2); kc = mat('td3_cap', 0xb7bac0, 0.3, 0.85)
    # üst sıra: TUNING, CUT OFF FREQ, RESONANCE, ENV MOD, DECAY, ACCENT + sağda 3 (VOLUME vb.)
    for i in range(6): o += knob2(0.0068, 0.012, -0.124 + i * 0.026, 0.062, top, kc, kn, None)
    for i in range(3): o += knob2(0.0068, 0.012, 0.072 + i * 0.026, 0.062, top, kc, kn, None)
    # ikinci sıra: TEMPO (büyük, sol), iki döner seçici (orta), VOLUME (büyük, sağ)
    o += knob2(0.011, 0.014, -0.122, 0.027, top, kc, kn, None)
    o += knob2(0.0105, 0.014, -0.045, 0.027, top, kc, kn, None)
    o += knob2(0.0105, 0.014, 0.0, 0.027, top, kc, kn, None)
    o += knob2(0.011, 0.014, 0.125, 0.027, top, kc, kn, None)
    for x in (-0.085, 0.085): o.append(rbox(0.012, 0.006, 0.004, 0.0015, M['knobSilver'], x, 0.027, top))
    # klavye bölümü: 8 beyaz + 5 siyah adım tuşu, sol fonksiyon tuşları, sağ DOWN/UP/ACCENT/SLIDE
    wk = mat('td3_white', 0xe8e8e4, 0.45, 0.0)
    for i in range(8): o.append(rbox(0.0145, 0.022, 0.005, 0.0015, wk, -0.06 + i * 0.0185, -0.046, top))
    for i in (0, 1, 3, 4, 5):
        o.append(rbox(0.011, 0.015, 0.006, 0.0015, M['keyBlack'], -0.051 + i * 0.0185, -0.021, top))
        o.append(cyl(0.0012, 0.0008, M['redLed'], -0.051 + i * 0.0185, -0.016, top + 0.006, segs=8))
    for i in range(4): o.append(rbox(0.0145, 0.022, 0.005, 0.0015, wk, 0.095 + (i % 2) * 0.019, -0.033 - (i // 2) * 0.026 + 0.013, top))
    o.append(rbox(0.026, 0.026, 0.006, 0.002, wk, -0.124, -0.045, top))
    for i in range(3): o.append(rbox(0.0145, 0.012, 0.004, 0.0015, M['keyBlack'], -0.095 + 0.0, -0.018 - i * 0.017, top))
    # arka: jaklar
    by = D / 2 + 0.0005
    for i in range(6): o.append(cyl(0.0042, 0.004, M['knobSilver'], -0.1 + i * 0.035, by, 0.026, segs=16, axis='Y'))
    return join(o, 'td3')
parts['td3'] = place(td3(), 0.27, DY + 0.006, -2.86, -0.06)

# ---------------- Arturia MicroFreak (311x233x55)
def microfreak():
    # referans görsel pikselleri → metre (üst görünüm 551..1453 x 270..945 px)
    W, D, H = 0.311, 0.233, 0.04
    X = lambda px: (px - 1002) / 902 * W
    Y = lambda py: (607.5 - py) / 675 * D
    R = lambda r: r / 902 * W
    o = [rbox(W, D, H, 0.006, mat('mf_body', 0x1e1f23, 0.45, 0.35))]
    o.append(plane(W - 0.006, D - 0.006, TEX('TEX_mf', 0x1e1f23, 0.5), 0, 0, H + 0.0003))
    # ekran bölmesi + OLED
    o.append(rbox(R(290), R(88), 0.0012, 0.002, mat('mf_screenpanel', 0x101114, 0.3, 0.3), X(1210), Y(344), H))
    o.append(rbox(R(64), R(40), 0.0008, 0.001, mat('mf_oled', 0x050608, 0.2, 0.0, emit=0x9fd8ff, es=0.35), X(1108), Y(342), H + 0.0012))
    blk, wht, org = M['knobBlack'], M['knobWhite'], M['knobOrange']
    gray = mat('mf_btn', 0x55575d, 0.5, 0.2)
    big = [(863, 342, wht), (1183, 343, wht), (1398, 342, blk),
           (606, 445, blk), (1021, 445, blk), (1086, 445, blk), (1216, 445, blk), (1280, 445, blk), (1345, 445, blk), (1410, 445, blk),
           (884, 548, wht), (1087, 548, wht), (1217, 548, blk), (1282, 548, blk), (1347, 548, blk), (1411, 548, blk)]
    for px, py, cap in big:
        o += knob2(R(23), 0.017, X(px), Y(py), H, cap, M['knobBlack'], M['line'] if cap is blk else M['knobBlack'])
    for px in (697, 760, 822, 884):
        o += knob2(R(21), 0.016, X(px), Y(445), H, org, org, M['knobWhite'])
    for px, py, r in ((945, 343, 16), (1021, 343, 12), (1255, 345, 15), (1320, 345, 15), (945, 445, 12), (1142, 445, 12),
                      (590, 548, 18), (638, 548, 18), (761, 548, 13), (808, 548, 13), (959, 548, 13), (1157, 548, 13)):
        o.append(cyl(R(r), 0.004, gray, X(px), Y(py), H, segs=28, bevel=R(r) * 0.25))
    o.append(cyl(R(18), 0.0035, mat('mf_shift', 0x4fc3e8, 0.4, 0.0, emit=0x4fc3e8, es=0.9), X(699), Y(548), H, segs=28))
    o.append(cyl(R(14), 0.0045, M['knobBlack'], X(699), Y(548), H, segs=28, bevel=0.0008))
    # matris LED'leri
    for px, py in ((647, 348), (706, 358), (765, 381), (760, 300), (790, 300), (818, 300)):
        o.append(cyl(R(4), 0.0008, mat('mf_led', 0x7fdcff, 0.4, 0, emit=0x7fdcff, es=1.0), X(px), Y(py), H, segs=10))
    return join(o, 'microfreak')
y = alu_stand('stand_mf', 0.62, -2.8, -0.22, 0.32, 0.23, math.radians(22))
parts['microfreak'] = place(microfreak(), 0.62, y, -2.8, -0.22, math.radians(22))  # 40 mm kasa + düğmeler ≈ 55 mm

# ---------------- Logitech Craft + MX Master 3 + DualSense
def craft():
    import json
    W, Dp = 0.43, 0.149
    p = 0.0182; cap = 0.0162
    x0 = -W / 2 + 0.008; y0 = Dp / 2 - 0.014
    rows = [
        [('', 2.0, 'crown'), ('esc', 1)] + [(None, 0.25)] + [('F%d' % i, 0.95) for i in range(1, 5)] + [(None, 0.2)] + [('F%d' % i, 0.95) for i in range(5, 9)] + [(None, 0.2)] + [('F%d' % i, 0.95) for i in range(9, 13)],
        [('`', 1)] + [(c, 1) for c in '1234567890-='] + [('\u232b', 2)],
        [('tab', 1.5)] + [(c, 1) for c in 'QWERTYUIOP[]'] + [('\\', 1.5)],
        [('caps', 1.75)] + [(c, 1) for c in "ASDFGHJKL;'"] + [('enter', 2.25)],
        [('shift', 2.25)] + [(c, 1) for c in 'ZXCVBNM,./'] + [('shift', 2.75)],
        [('ctrl', 1.25), ('start', 1.25), ('alt', 1.25), ('', 6.25), ('alt', 1.25), ('fn', 1.25), ('menu', 1.25), ('ctrl', 1.25)],
    ]
    vrow = [0, 1.45, 2.45, 3.45, 4.45, 5.45]
    nav = {0: [('prt', 1), ('scr', 1), ('pause', 1)], 1: [('ins', 1), ('home', 1), ('pgup', 1)], 2: [('del', 1), ('end', 1), ('pgdn', 1)],
           4: [(None, 1), ('\u2191', 1), (None, 1)], 5: [('\u2190', 1), ('\u2193', 1), ('\u2192', 1)]}
    num = {1: [('num', 1), ('/', 1), ('*', 1), ('-', 1)], 2: [('7', 1), ('8', 1), ('9', 1), ('+', 1, 'tall')], 3: [('4', 1), ('5', 1), ('6', 1)],
           4: [('1', 1), ('2', 1), ('3', 1), ('enter', 1, 'tall')], 5: [('0', 2), ('.', 1)]}
    keys = []
    def put(row, u0, items):
        u = u0
        for it in items:
            lab, w = it[0], it[1]; tag = it[2] if len(it) > 2 else ''
            if tag == 'crown':
                keys.append(('#crown', x0 + (u + w / 2) * p, y0 - 0.5 * p, 0, 0))
            elif lab is not None:
                h = 2 if tag == 'tall' else 1
                keys.append((lab, x0 + (u + w / 2) * p, y0 - (vrow[row] + h / 2) * p, w * p - (p - cap), h * p - (p - cap)))
            u += w
    for r, items in enumerate(rows): put(r, 0, items)
    for r, items in nav.items(): put(r, 15.4, items)
    for r, items in num.items(): put(r, 18.8, items)
    base = mat('craft_base', 0x1a1a1d, 0.5, 0.3)
    keycap = mat('craft_key', 0x202024, 0.6, 0.05)
    o = [rbox(W, Dp, 0.012, 0.006, base, 0, 0, 0)]
    for lab, cx, cy, w, h in keys:
        if lab == '#crown':
            o.append(cyl(0.017, 0.012, mat('craft_crown', 0x2c2d31, 0.3, 0.75), cx, cy, 0.012, segs=48, bevel=0.0015))
            o.append(cyl(0.0125, 0.0125, M['knobBlack'], cx, cy, 0.012, segs=40))
            continue
        o.append(rbox(w, h, 0.0055, 0.0022, keycap, cx, cy, 0.012))
    o.append(plane(W, Dp, TEX('TEX_craft', 0x000000, 0.6), 0, 0, 0.0177))
    leg = [{'t': k[0], 'x': round((k[1] + W / 2) / W, 5), 'y': round((Dp / 2 - k[2]) / Dp, 5), 'w': round(k[3] / W, 5)} for k in keys if k[0] != '#crown']
    with open(os.path.join(os.path.dirname(OUT), 'craft-legends.json'), 'w') as f: json.dump(leg, f, ensure_ascii=False)
    ob = join(o, 'craft')
    ob.rotation_euler = (math.radians(3), 0, 0)
    return ob
parts['craft'] = place(craft(), -0.07, DY + 0.002, -2.61)  # Logitech Craft (kullanıcının klavyesi)

def mx_master():
    o = [sphere(0.05, mat('mx', 0x2c2d31, 0.5, 0.1), 0, 0, 0.0, sx=0.85, sy=1.26, sz=0.5)]
    o.append(cyl(0.009, 0.006, M['knobSilver'], 0.0, 0.03, 0.022, segs=20, axis='Y'))
    o.append(rbox(0.02, 0.05, 0.006, 0.002, mat('mx_thumb', 0x1d1e21, 0.5), -0.042, -0.0, 0.0))
    return join(o, 'mx_master')
# Mouse → hazır model (3D tarama): assets/models/mxmaster.glb

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
y = alu_stand('stand_mb', 1.0, -2.61, -0.15, 0.32, 0.28, math.radians(14))
# MacBook → hazır model: assets/models/macbook.glb (standın üstü: y)

# ---------------- Tascam DR-05X (61x141x26), masada yatık
def dr05x():
    W, L, T = 0.061, 0.124, 0.026
    X = lambda px: (px - 524) / 124 * W
    Y = lambda py: (438.5 - py) / 277 * L
    body = mat('dr_body', 0x2b2c30, 0.5, 0.35)
    o = [rbox(W, L, T, 0.009, body, 0, 0, 0)]
    o.append(plane(W - 0.004, L - 0.004, TEX('TEX_dr', 0x2b2c30, 0.5), 0, 0, T + 0.0003))
    o.append(rbox(X(576) - X(472), (Y(342) - Y(398)), 0.0012, 0.002, mat('dr_lcdframe', 0x0b0b0d, 0.3, 0.2), X(524), Y(370), T))
    o.append(plane(X(572) - X(476), Y(346) - Y(394), TEX('TEX_drlcd', 0x9fc3ff, 0.3), X(524), Y(370), T + 0.0013))
    o.append(cyl(0.0042, 0.003, M['knobBlack'], X(497), Y(438), T, segs=24, bevel=0.0008))
    o.append(cyl(0.0042, 0.003, M['knobBlack'], X(552), Y(438), T, segs=24, bevel=0.0008))
    o.append(cyl(0.0022, 0.0035, mat('dr_rec', 0xe0302a, 0.4, 0, emit=0xe0302a, es=0.3), X(552), Y(438), T, segs=18))
    cx, cy = X(525), Y(501)
    o.append(cyl(0.0165, 0.0015, mat('dr_ring', 0x3a3b40, 0.45, 0.4), cx, cy, T, segs=40))
    for dx, dy in ((0, 1), (0, -1), (-1, 0), (1, 0)):
        o.append(cyl(0.0042, 0.003, M['knobBlack'], cx + dx * 0.0095, cy + dy * 0.0095, T, segs=20, bevel=0.0008))
    o.append(cyl(0.005, 0.0035, M['knobBlack'], cx, cy, T, segs=24, bevel=0.001))
    for s_ in (-1, 1):
        g = []
        g.append(cyl(0.0082, 0.02, mat('dr_mesh', 0x9ea2a8, 0.55, 0.85), 0, 0, 0, segs=24))
        g.append(cyl(0.0086, 0.0025, mat('dr_redring', 0xc0282a, 0.4, 0.2), 0, 0, 0.004, segs=24))
        g.append(cyl(0.0084, 0.003, M['knobBlack'], 0, 0, 0.0, segs=24))
        capo = join(g, 'mic')
        capo.rotation_euler = (math.radians(-90), 0, s_ * math.radians(-45))
        capo.location = (s_ * 0.016, L / 2 + 0.002, T * 0.55)
        o.append(capo)
    o.append(rbox(0.036, 0.012, 0.01, 0.003, M['knobBlack'], 0, L / 2 + 0.004, T * 0.55 - 0.005))
    return join(o, 'dr05x')
parts['dr05x'] = place(dr05x(), 0.62, DY, -2.42, 1.5)

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
parts['candles'] = place(candles(), 0.62, DY, -3.05)

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

# ---------------- DJ köşesi: sol duvarın önünde siyah DJ masası (90 cm), ön kenarda LED; konsol sayfada yüklenir (djconsole.glb)
def dj_table():
    o = []
    top = mat('dj_top', 0x101012, 0.4, 0.2)
    leg = mat('dj_leg', 0x1a1a1d, 0.4, 0.7)
    o.append(rbox(0.65, 1.25, 0.03, 0.006, top, 0, 0, 0.87))
    for sx in (-0.29, 0.29):
        for sy in (-0.57, 0.57): o.append(rbox(0.04, 0.04, 0.87, 0.004, leg, sx, sy, 0))
    o.append(rbox(0.04, 1.1, 0.04, 0.004, leg, -0.29, 0, 0.3))
    o.append(rbox(0.6, 0.02, 0.18, 0.004, top, 0, -0.6, 0.66))
    o.append(rbox(0.004, 1.2, 0.008, 0, mat('RGB_strip', 0xff2418, 0.4, 0.0, emit=0xff2418, es=1.0), 0.327, 0, 0.875))
    parts['dj_table'] = place(join(o, 'dj_table'), -2.25, 0.0, -1.45, 0.0)
dj_table()

def speaker_stand(name, x, z, h=1.02):
    st = mat('spk_stand', 0x141416, 0.4, 0.7)
    o = [cyl(0.018, h - 0.02, st, 0, 0, 0.02, segs=16), rbox(0.22, 0.26, 0.012, 0.003, st, 0, 0, h - 0.012)]
    for k in range(3):
        a = k * 2 * math.pi / 3
        lg = rbox(0.34, 0.025, 0.02, 0.004, st, 0.17, 0, 0.0)
        lg.rotation_euler = (0, -0.18, a)
        o.append(lg)
    parts[name] = place(join(o, name), x, 0.0, z)
    return h
for nm, sz, ang in (('dj', -2.4, 0.81), ('dj2', -0.5, 2.33)):
    hh = speaker_stand('stand_' + nm, -2.45, sz)
    adam('adam_' + nm, -2.45, sz, ang, base=hh)

# ---------------- dışa aktar
for o in bpy.context.scene.objects:
    if o.type == 'MESH': o.data.update()
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True,
                          export_cameras=False, export_lights=False, export_materials='EXPORT',
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
print('EXPORTED', OUT, os.path.getsize(OUT), 'bytes')
for k, o in parts.items(): print('PART', k, o.name)
