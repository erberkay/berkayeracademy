# Kontrol render'ı: blender -b -P tools/studio3d/render_check.py -- <çıktı.png>
import bpy, sys, os, math
from mathutils import Vector
out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '/tmp/desk.png'
bpy.ops.wm.read_factory_settings(use_empty=True)
glb = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'models', 'studio-desk.glb')
bpy.ops.import_scene.gltf(filepath=glb)
sc = bpy.context.scene
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam)
cam.data.lens = 18
cam.location = Vector((0.02, 1.95, 1.22))   # sahne (0.02, 1.22, -1.95)
d = Vector((0.0, 2.95, 0.98)) - cam.location
cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
sc.camera = cam
def light(kind, loc, energy, color, size=0.5):
    l = bpy.data.lights.new(kind, kind); l.energy = energy; l.color = color
    if kind == 'AREA': l.size = size
    o = bpy.data.objects.new(kind, l); o.location = loc; sc.collection.objects.link(o)
    return o
a = light('AREA', Vector((0, 2.3, 2.4)), 160, (1, 0.9, 0.8), 1.6); a.rotation_euler = (math.radians(35), 0, 0)
light('POINT', Vector((0, 3.05, 1.1)), 60, (1, 0.25, 0.3))
light('POINT', Vector((0.3, 2.8, 0.9)), 8, (1, 0.6, 0.3))
w = bpy.data.worlds.new('w'); w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.02, 0.02, 0.025, 1); sc.world = w
sc.render.engine = 'BLENDER_EEVEE'
sc.render.resolution_x, sc.render.resolution_y = 1600, 900
sc.render.filepath = out
sc.view_settings.view_transform = 'AgX'
bpy.ops.render.render(write_still=True)
print('RENDERED', out)
