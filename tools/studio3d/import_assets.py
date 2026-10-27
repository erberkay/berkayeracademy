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
