# Hazır modelleri web için hazırlar (gerçek ölçüye ölçekle, hafiflet, dokuları 1024 JPEG yap, GLB yaz).
# Kullanım:
#   blender -b "<PS5 set>.blend" -P tools/studio3d/import_assets.py -- ps5 <çıktı klasörü>
#   blender -b -P tools/studio3d/import_assets.py -- grogu <grogu.glb> <çıktı klasörü>
#   blender -b -P tools/studio3d/import_assets.py -- macbook <macbook.usdz> <çıktı klasörü>
# Lisanslar (CC BY 4.0, sayfada kaynak gösterilir):
#   "PlayStation 5 Set" — Taohid Animation, https://sketchfab.com/3d-models/playstation-5-set-8e602d71ddc94bf09731db9151fc7cd3
#   "MacBook Pro M3 Space Black 16\" Free" — EV_car2013, https://sketchfab.com/3d-models/macbook-pro-m3-space-black-16-free-6b46aa09dc4d4e90a79ea06f1d0aa719
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
