# Somali Cat Animated ver 1.2 (DreamNoms, CC BY 4.0, https://sketchfab.com/3d-models/e185c3fd92b64c32b4515a32b29252fc)
# .blend → assets/models/somalicat.glb: yalnız kedi + iskelet, 5 animasyon (Walk, Idle, SitDown, SittingIdle, StandUp)
# Kullanım: blender -b <SomaliCatNewMirror3.blend> -P tools/studio3d/export_cat.py -- <SomaliCat2.png> <çıktı.glb>
import bpy, sys
argv = sys.argv[sys.argv.index('--') + 1:]
tex, out = argv[0], argv[1]
for n in ('Camera', 'Light', 'Cube'):
    o = bpy.data.objects.get(n)
    if o: bpy.data.objects.remove(o, do_unlink=True)
for im in bpy.data.images:
    if im.name.startswith('SomaliCat'): im.filepath = tex; im.reload()
KEEP = ('Walk', 'Idle', 'SitDown', 'SittingIdle', 'StandUp')
arm = bpy.data.objects['SomaliCatArmature']
arm.animation_data.action = None
for t in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(t)
for a in list(bpy.data.actions):
    if a.name not in KEEP: bpy.data.actions.remove(a)
    else: a.use_fake_user = True
for o in bpy.data.objects:
    if o.type == 'MESH':
        print('MESH', o.name, len(o.data.polygons), [m.name for m in o.data.materials])
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=True, export_animation_mode='ACTIONS',
                          export_image_format='JPEG', export_jpeg_quality=85, export_cameras=False, export_lights=False,
                          export_def_bones=False, export_optimize_animation_size=True)
print('EXPORTED', out)
