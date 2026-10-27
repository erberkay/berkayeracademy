# Hazır modelleri web için hazırlar (gerçek ölçüye ölçekle, hafiflet, dokuları 1024 JPEG yap, GLB yaz).
# Kullanım:
#   blender -b "<PS5 set>.blend" -P tools/studio3d/import_assets.py -- ps5 <çıktı klasörü>
#   blender -b -P tools/studio3d/import_assets.py -- grogu <grogu.glb> <çıktı klasörü>
#   blender -b -P tools/studio3d/import_assets.py -- macbook <macbook.usdz> <çıktı klasörü>
# Lisanslar (CC BY 4.0, sayfada kaynak gösterilir):
#   "PlayStation 5 Set" — Taohid Animation, https://sketchfab.com/3d-models/playstation-5-set-8e602d71ddc94bf09731db9151fc7cd3
#   "MacBook Pro M3 Space Black 16\" Free" — EV_car2013, https://sketchfab.com/3d-models/macbook-pro-m3-space-black-16-free-6b46aa09dc4d4e90a79ea06f1d0aa719
#   "Logitech MX Keys" — ArkinRS, https://sketchfab.com/3d-models/logitech-mx-keys-67901d82781f48349f1f61ce78a6b6e0
#   "Logitech MX Master 3S - Revopoint Mini 3D Scan" — Sircher, https://sketchfab.com/3d-models/logitech-mx-master-3s-revopoint-mini-3d-scan-9a82df69ffee4c6faa28f75e65ba192c
#   "Pioneer DJ console" — TwoPixels Studio, https://sketchfab.com/3d-models/pioneer-dj-console-0ba527fa6b164c34aa050dcecbaa2ffb
#   "Star Wars - Grogu" — ஜCIHIRISஜ, https://sketchfab.com/3d-models/star-wars-grogu-4a57954690eb4377b62a6290b2dee070
import bpy, sys, os, math
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:]
mode = argv[0]

def descendants(name):
    root = bpy.data.objects.get(name)
    out = []
    def walk(o):
        for c in o.children:
            if c.type == 'MESH': out.append(c)
            walk(c)
    if root: walk(root)
    return out

def join(objs, name):
    for o in objs:
        o.hide_set(False); o.hide_viewport = False
    with bpy.context.temp_override(active_object=objs[0], selected_editable_objects=objs, selected_objects=objs):
        bpy.ops.object.join()
    o = objs[0]
    o.name = name
    # dünya dönüşümünü geometriye uygula, ebeveynden ayır
    mw = o.matrix_world.copy()
    o.parent = None
    o.matrix_world = mw
    o.data.transform(o.matrix_world)
    o.matrix_world = Matrix()
    return o

def normalize(o, axis, target):
    """tabanı z=0'a, merkezi x/y=0'a al; verilen eksendeki boyutu target metreye ölçekle"""
    vs = [v.co for v in o.data.vertices]
    mn = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    mx = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    size = mx - mn
    s = target / size[axis]
    c = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    o.data.transform(Matrix.Scale(s, 4) @ Matrix.Translation(-c))
    print('NORMALIZED', o.name, tuple(round(x * s, 3) for x in size))

def decimate(o, max_tris):
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if tris <= max_tris: return
    m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = max_tris / tris
    with bpy.context.temp_override(active_object=o, object=o, selected_editable_objects=[o]):
        bpy.ops.object.modifier_apply(modifier=m.name)
    print('DECIMATED', o.name, tris, '->', sum(len(p.vertices) - 2 for p in o.data.polygons))

def shrink_images(maxs=1024):
    for im in bpy.data.images:
        if im.size[0] > maxs or im.size[1] > maxs:
            r = maxs / max(im.size[0], im.size[1])
            im.scale(max(1, int(im.size[0] * r)), max(1, int(im.size[1] * r)))

def export(objs, path):
    for o in bpy.context.scene.objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                              export_yup=True, export_image_format='JPEG', export_jpeg_quality=82,
                              export_cameras=False, export_lights=False,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
    print('EXPORTED', path, os.path.getsize(path))


def apply_tex(mats, base, normal=None, rough=None):
    """dokuları bulamayan FBX/OBJ malzemelerine doku bağlar"""
    for m in mats:
        m.use_nodes = True
        nt = m.node_tree; b = nt.nodes.get('Principled BSDF') or nt.nodes.new('ShaderNodeBsdfPrincipled')
        out = [n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL']
        if out and not b.outputs['BSDF'].links: nt.links.new(b.outputs['BSDF'], out[0].inputs['Surface'])
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(base, check_existing=True)
        nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
        if normal:
            tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = bpy.data.images.load(normal, check_existing=True); tn.image.colorspace_settings.name = 'Non-Color'
            nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tn.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
        if rough:
            tr = nt.nodes.new('ShaderNodeTexImage'); tr.image = bpy.data.images.load(rough, check_existing=True); tr.image.colorspace_settings.name = 'Non-Color'
            nt.links.new(tr.outputs['Color'], b.inputs['Roughness'])

if mode == 'ps5':
    out = argv[1]
    box = set(descendants('Sketchfab Model'))
    console = descendants('Sketchfab Model.002')
    others = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o not in box and o not in console]
    for o in box: bpy.data.objects.remove(o, do_unlink=True)
    shrink_images()
    c = join(console, 'ps5_console'); normalize(c, 2, 0.39); decimate(c, 12000)
    d = join(others, 'dualsense'); normalize(d, 0, 0.16); decimate(d, 20000)
    export([c], os.path.join(out, 'ps5.glb'))
    export([d], os.path.join(out, 'dualsense.glb'))
elif mode == 'grogu':
    src, out = argv[1], argv[2]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    g = join(meshes, 'grogu'); normalize(g, 2, 0.25); decimate(g, 30000)
    shrink_images()
    export([g], os.path.join(out, 'grogu.glb'))
elif mode == 'macbook':
    src, out = argv[1], argv[2]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.wm.usd_import(filepath=src)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    m = join(meshes, 'macbook'); normalize(m, 0, 0.3557)
    shrink_images()
    export([m], os.path.join(out, 'macbook.glb'))
elif mode == 'mxkeys':
    src, out = argv[1], argv[2]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=src)
    for o in list(bpy.context.scene.objects):
        if o.type == 'MESH' and o.name.startswith('Dimensions'): bpy.data.objects.remove(o, do_unlink=True)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    k = join(meshes, 'mx_keys'); normalize(k, 0, 0.4302)
    shrink_images()
    export([k], os.path.join(out, 'mxkeys.glb'))
elif mode == 'mouse':
    src, out = argv[1], argv[2]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.wm.ply_import(filepath=src)
    m = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
    m.name = 'mx_master'
    decimate(m, 16000)
    for p in m.data.polygons: p.use_smooth = True
    mt = bpy.data.materials.new('mx_master_graphite'); mt.use_nodes = True
    b = mt.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.035, 0.036, 0.04, 1); b.inputs['Roughness'].default_value = 0.55
    m.data.materials.clear(); m.data.materials.append(mt)
    normalize(m, 0, 0.1249)
    export([m], os.path.join(out, 'mxmaster.glb'))
elif mode == 'dj':
    src, out = argv[1], argv[2]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    d = join(meshes, 'dj_console'); normalize(d, 0, 0.795); decimate(d, 40000)
    shrink_images()
    export([d], os.path.join(out, 'djconsole.glb'))
elif mode == 'generic':
    # generic <src> <out_name> <axis 0|1|2> <size_m> <max_tris>
    src, name, axis, size, maxt, out = argv[1], argv[2], int(argv[3]), float(argv[4]), int(argv[5]), argv[6]
    tex = [None if x == '-' else x for x in argv[7:10]] if len(argv) > 7 else None
    bpy.ops.wm.read_factory_settings(use_empty=True)
    e = os.path.splitext(src)[1].lower()
    if e == '.fbx': bpy.ops.import_scene.fbx(filepath=src)
    elif e in ('.glb', '.gltf'): bpy.ops.import_scene.gltf(filepath=src)
    elif e == '.obj': bpy.ops.wm.obj_import(filepath=src)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if tex: apply_tex([m for m in bpy.data.materials], tex[0], tex[1], tex[2])
    g = join(meshes, name); normalize(g, axis, size); decimate(g, maxt)
    shrink_images()
    export([g], os.path.join(out, name + '.glb'))
elif mode == 'paintings':
    # Paintings and Posters Collection: gevşek parçalara ayır, seçilen tabloları ayrı düğüm olarak (merkez/arka yüz orijinde) yaz
    src, out, scale = argv[1], argv[2], float(argv[3])
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=src)
    o = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
    want = {'art_a': (8.19, 5.84), 'art_b': (0.74, 6.79), 'art_c': (2.31, 6.79), 'art_d': (-11.08, 8.74), 'art_e': (4.26, 2.73), 'art_f': (6.61, 2.73)}
    keep = []
    for nm, (cx, cz) in want.items():
        best = None
        for m in [x for x in bpy.context.scene.objects if x.type == 'MESH' and not x.name.startswith('art_')]:
            b = [m.matrix_world @ Vector(c) for c in m.bound_box]
            mx = sum(v.x for v in b) / 8; mz = sum(v.z for v in b) / 8
            area = (max(v.x for v in b) - min(v.x for v in b)) * (max(v.z for v in b) - min(v.z for v in b))
            dd = (mx - cx) ** 2 + (mz - cz) ** 2
            if dd < 0.05 and (best is None or area > best[1]): best = (m, area)
        if not best: print('MISSING', nm); continue
        m = best[0]; m.name = nm
        mw = m.matrix_world.copy(); m.parent = None; m.matrix_world = mw
        m.data.transform(m.matrix_world); m.matrix_world = Matrix()
        vs = [v.co for v in m.data.vertices]
        c = Vector(((min(v.x for v in vs) + max(v.x for v in vs)) / 2, max(v.y for v in vs), (min(v.z for v in vs) + max(v.z for v in vs)) / 2))
        m.data.transform(Matrix.Scale(scale, 4) @ Matrix.Translation(-c))
        keep.append(m)
    for x in list(bpy.context.scene.objects):
        if x.type == 'MESH' and x not in keep: bpy.data.objects.remove(x, do_unlink=True)
    td = argv[4]
    for m in bpy.data.materials:
        if m.name == '1': apply_tex([m], os.path.join(td, 'T_Asset_01_C.tga.png'), os.path.join(td, 'T_Asset_01_N.tga.png'), os.path.join(td, 'T_Asset_01_R.png'))
        elif m.name == '2': apply_tex([m], os.path.join(td, 'T_Asset_02_C.tga.png'), os.path.join(td, 'T_Asset_02_N.tga.png'), os.path.join(td, 'T_Asset_02_R.png'))
    shrink_images(2048)
    export(keep, os.path.join(out, 'art.glb'))
elif mode == 'scan':
    # scan <src.fbx> <out_name> <size_m> <max_tris> <out> <base> [normal]
    # Fotogrametri taraması: üstünde durduğu zemini (kenar halkasına oturtulan düzlem) ve kenar şeridini kes, en büyük parçayı tut
    import bmesh, random
    src, name, size, maxt, out = argv[1], argv[2], float(argv[3]), int(argv[4]), argv[5]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=src)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    apply_tex([m for m in bpy.data.materials], argv[6], argv[7] if len(argv) > 7 else None)
    o = join(meshes, name)
    vs = [v.co.copy() for v in o.data.vertices]
    mn = Vector([min(v[i] for v in vs) for i in range(3)]); mx = Vector([max(v[i] for v in vs) for i in range(3)]); sz = mx - mn
    up = min(range(3), key=lambda i: sz[i]); ax = [i for i in range(3) if i != up]
    def edge(v): return min(min((v[a] - mn[a]) / sz[a], (mx[a] - v[a]) / sz[a]) for a in ax)
    ring = [v for v in vs if edge(v) < 0.12]
    random.seed(1); best = None
    for _ in range(300):
        p = random.sample(ring, 3); n = (p[1] - p[0]).cross(p[2] - p[0])
        if n.length < 1e-12: continue
        n.normalize()
        if n[up] < 0: n = -n
        d = -n.dot(p[0]); c = sum(1 for v in ring[::7] if abs(n.dot(v) + d) < sz[up] * 0.03)
        if not best or c > best[0]: best = (c, n, d)
    _, n, d = best
    H = max(n.dot(v) + d for v in vs)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if n.dot(v.co) + d < H * 0.06 or edge(v.co) < 0.05], context='VERTS')
    bm.verts.ensure_lookup_table(); seen = set(); comps = []
    for v in bm.verts:
        if v.index in seen: continue
        st = [v]; comp = []; seen.add(v.index)
        while st:
            x = st.pop(); comp.append(x)
            for e in x.link_edges:
                y = e.other_vert(x)
                if y.index not in seen: seen.add(y.index); st.append(y)
        comps.append(comp)
    comps.sort(key=len, reverse=True)
    keep = set(); [keep.update(c) for c in comps if len(c) > len(comps[0]) * 0.15]
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v not in keep], context='VERTS')
    bm.to_mesh(o.data); bm.free()
    o.data.transform(n.to_track_quat('Z', 'Y').to_matrix().to_4x4().inverted())
    vs = [v.co for v in o.data.vertices]
    ext = [max(v[i] for v in vs) - min(v[i] for v in vs) for i in range(2)]
    normalize(o, 0 if ext[0] >= ext[1] else 1, size); decimate(o, maxt)
    shrink_images()
    export([o], os.path.join(out, name + '.glb'))
