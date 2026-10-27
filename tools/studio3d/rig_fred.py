# Fred – The Cat (oturur pozda, iskeletsiz tarama) → yürüyebilen Fred: Somali Cat Animated'in (DreamNoms, CC BY) iskeleti ve
# animasyonları Fred'in gövdesine aktarılır.
#  1. Somali iskeleti SittingIdle pozuna alınır; bu poz yeni iskeletin (B) dinlenme pozu olur.
#  2. Fred, oturan Somali gövdesine benzerlik dönüşümlü ICP ile oturtulur (yüz +Y, patiler zeminde).
#  3. Ağırlıklar oturan Somali gövde+kuyruğundan en yakın yüzey ile Fred'e aktarılır, 4 kemiğe sınırlanır.
#  4. B, orijinal iskeleti (A) dünya uzayında kopyalar; 5 animasyon görsel anahtarlarla B'ye pişirilir.
# Kullanım: blender -b <SomaliCatNewMirror3.blend> -P tools/studio3d/rig_fred.py -- <Fred - The Cat.glb> <çıktı.glb> [max_tris]
import bpy, sys, math, random
import numpy as np
from mathutils import Vector, Matrix
from mathutils.kdtree import KDTree
argv = sys.argv[sys.argv.index('--') + 1:]
fred_src, out = argv[0], argv[1]
max_tris = int(argv[2]) if len(argv) > 2 else 40000
THX, THZ, THY = [float(x) for x in (argv[4].split(',') if len(argv) > 4 else ('0.22', '0.95', '0.05'))]
TZ, TY, TD, TR = [float(x) for x in (argv[5].split(',') if len(argv) > 5 else ('0.35', '0.25', '0.16', '0.075'))]
KEEP = {'Walk': (0, 32), 'Idle': (0, 48), 'SitDown': (0, 36), 'SittingIdle': (0, 48), 'StandUp': (0, 36)}
sc = bpy.context.scene
for n in ('Camera', 'Light', 'Cube'):
    o = bpy.data.objects.get(n)
    if o: bpy.data.objects.remove(o, do_unlink=True)
A = bpy.data.objects['SomaliCatArmature']
for t in A.animation_data.nla_tracks: t.mute = True
A.animation_data.action = bpy.data.actions['SittingIdle']; sc.frame_set(0)

def select_only(objs, active):
    bpy.ops.object.mode_set(mode='OBJECT') if bpy.context.object and bpy.context.object.mode != 'OBJECT' else None
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = active

# --- 1. B: dinlenme pozu = oturuş
B = A.copy(); B.data = A.data.copy(); B.name = 'FredArmature'; B.animation_data_clear(); sc.collection.objects.link(B)
for pb in B.pose.bones:
    for c in list(pb.constraints): pb.constraints.remove(c)
    c = pb.constraints.new('COPY_TRANSFORMS'); c.target = A; c.subtarget = pb.name
sc.frame_set(0)
select_only([B], B); bpy.ops.object.mode_set(mode='POSE'); bpy.ops.pose.select_all(action='SELECT')
bpy.ops.pose.visual_transform_apply()
for pb in B.pose.bones:
    for c in list(pb.constraints): pb.constraints.remove(c)
bpy.ops.pose.armature_apply(selected=False)
bpy.ops.object.mode_set(mode='OBJECT')

# --- oturan Somali gövde+kuyruk kopyası (ağırlık kaynağı ve ICP hedefi)
dg = bpy.context.evaluated_depsgraph_get()
def baked_copy(name):
    o = bpy.data.objects[name]; e = o.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(e, preserve_all_data_layers=True, depsgraph=dg)
    c = bpy.data.objects.new(name + '_sit', me); c.matrix_world = o.matrix_world.copy(); sc.collection.objects.link(c)
    for g in o.vertex_groups:
        if g.name not in c.vertex_groups: c.vertex_groups.new(name=g.name)
    return c
body = baked_copy('SomaliCat'); tail = baked_copy('Tail')
print('SRC groups', len(body.vertex_groups), len(tail.vertex_groups))

# --- 2. Fred
bpy.ops.import_scene.gltf(filepath=fred_src, merge_vertices=True)
F = [o for o in bpy.context.selected_objects if o.type == 'MESH'][0]
mw = F.matrix_world.copy(); F.parent = None; F.data.transform(mw); F.matrix_world = Matrix()
for o in list(bpy.context.scene.objects):
    if o.type == 'EMPTY': bpy.data.objects.remove(o, do_unlink=True)
F.name = 'Fred'
# tarama üçgen çorbası: çakışan köşeleri birleştir (yoksa her üçgen ayrı ağırlık alır ve yürürken yırtılır)
select_only([F], F); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.0005); bpy.ops.object.mode_set(mode='OBJECT')
print('MERGED verts', len(F.data.vertices))
tris = sum(len(p.vertices) - 2 for p in F.data.polygons)
if tris > max_tris:
    m = F.modifiers.new('dec', 'DECIMATE'); m.ratio = max_tris / tris
    select_only([F], F); bpy.ops.object.modifier_apply(modifier=m.name)
F.data.transform(Matrix.Rotation(math.pi, 4, 'Z'))  # yüz +Y'ye
P = np.array([v.co[:] for v in F.data.vertices])
T = np.array([(body.matrix_world @ v.co)[:] for v in body.data.vertices])
# başlangıç: yükseklik oranı, taban ve merkez hizası
s0 = (T[:, 2].max() - T[:, 2].min()) / (P[:, 2].max() - P[:, 2].min())
R = np.eye(3); s = s0
t = np.array([(T[:, 0].max() + T[:, 0].min()) / 2, (T[:, 1].max() + T[:, 1].min()) / 2, T[:, 2].min()]) - s * np.array([(P[:, 0].max() + P[:, 0].min()) / 2, (P[:, 1].max() + P[:, 1].min()) / 2, P[:, 2].min()])
kd = KDTree(len(T))
for i, p in enumerate(T): kd.insert(p, i)
kd.balance()
rnd = np.random.default_rng(1); idx = rnd.choice(len(P), min(4000, len(P)), replace=False); Ps = P[idx]
for it in range(40):
    X = (s * (R @ Ps.T)).T + t
    Y = np.array([kd.find(x)[0][:] for x in X]); d = np.linalg.norm(X - Y, axis=1)
    keep = d <= np.quantile(d, 0.8); Xs, Ys = Ps[keep], Y[keep]
    mx, my = Xs.mean(0), Ys.mean(0); Xc, Yc = Xs - mx, Ys - my
    U, S, Vt = np.linalg.svd(Yc.T @ Xc / len(Xs)); D = np.eye(3); D[2, 2] = np.sign(np.linalg.det(U @ Vt))
    R = U @ D @ Vt; s = np.trace(np.diag(S) @ D) / (Xc ** 2).sum(1).mean(); t = my - s * (R @ mx)
print('ICP scale', round(s, 3), 'mean dist', round(float(d.mean()), 3))
M = Matrix.Identity(4)
for i in range(3):
    for j in range(3): M[i][j] = s * R[i, j]
    M[i][3] = t[i]
F.data.transform(M)
fz = min(v.co.z for v in F.data.vertices); bz = T[:, 2].min()
F.data.transform(Matrix.Translation((0, 0, bz - fz)))

# --- 3. ağırlıklar: oturan Somali gövde+kuyruktan en yakın yüzey
select_only([body, tail], body); bpy.ops.object.join()
src = body
for g in src.vertex_groups:
    if g.name not in F.vertex_groups: F.vertex_groups.new(name=g.name)
mode = argv[3] if len(argv) > 3 else 'auto'
if mode == 'auto':
    # Fred'in kendi geometrisiyle kemik ısısı ağırlıkları; tutmayan köşeler aşağıda aktarımla dolar
    for g in list(F.vertex_groups): F.vertex_groups.remove(g)
    for b_ in B.data.bones: b_.use_deform = b_.name not in ('Root', 'Eye.L', 'Eye.R')
    # kemik ısısı delikli taramada tutmaz: kapalı voksel vekil üzerinde hesapla, Fred'e en yakın yüzeyle aktar
    PX = F.copy(); PX.data = F.data.copy(); PX.name = 'FredProxy'; sc.collection.objects.link(PX)
    rm = PX.modifiers.new('rm', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = 0.035
    select_only([PX], PX); bpy.ops.object.modifier_apply(modifier=rm.name)
    select_only([PX, B], B); bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    PX.modifiers.clear(); PX.parent = None
    print('PROXY verts', len(PX.data.vertices), 'unweighted', sum(1 for v in PX.data.vertices if not v.groups))
    for g in PX.vertex_groups: F.vertex_groups.new(name=g.name)
    pt = F.modifiers.new('px', 'DATA_TRANSFER'); pt.object = PX
    pt.use_vert_data = True; pt.data_types_verts = {'VGROUP_WEIGHTS'}; pt.vert_mapping = 'POLYINTERP_NEAREST'
    pt.layers_vgroup_select_src = 'ALL'; pt.layers_vgroup_select_dst = 'NAME'
    select_only([F], F); bpy.ops.object.modifier_apply(modifier=pt.name)
    bpy.data.objects.remove(PX, do_unlink=True)
    miss = [v.index for v in F.data.vertices if not v.groups or max(g.weight for g in v.groups) < 1e-4]
    print('AUTO unweighted', len(miss))
    for g in src.vertex_groups:
        if g.name not in F.vertex_groups: F.vertex_groups.new(name=g.name)
    if miss:
        mg = F.vertex_groups.new(name='_miss'); mg.add(miss, 1.0, 'REPLACE')
dt = F.modifiers.new('wt', 'DATA_TRANSFER'); dt.object = src
if mode == 'auto':
    dt.vertex_group = '_miss' if '_miss' in F.vertex_groups else ''
    if '_miss' not in F.vertex_groups: dt.show_viewport = False
dt.use_vert_data = True; dt.data_types_verts = {'VGROUP_WEIGHTS'}; dt.vert_mapping = 'POLYINTERP_NEAREST'
dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
select_only([F], F)
if dt.show_viewport: bpy.ops.object.modifier_apply(modifier=dt.name)
else: F.modifiers.remove(dt)
if '_miss' in F.vertex_groups: F.vertex_groups.remove(F.vertex_groups['_miss'])
bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
bpy.ops.object.vertex_group_smooth(group_select_mode='ALL', factor=0.5, repeat=3)
bpy.ops.object.mode_set(mode='OBJECT')
# oturuşta uyluk eti böğre yapışık; kemik ısısı onu kalçaya (Hip/Butt) bağlar ve kedi ayağa kalkınca et yerde kalır.
# Yan ve alçak bölgedeki kalça ağırlığını o tarafın uyluğuna (Thigh) aktar.
z0 = min(v.co.z for v in F.data.vertices)
G = {g.name: g for g in F.vertex_groups}
HAUNCH = ('Hip', 'Butt', 'LowerSpine')
for v in F.data.vertices:
    x, y, z = v.co
    if abs(x) < THX or z - z0 > THZ or y > THY: continue
    side = '.L' if x < 0 else '.R'
    k = min(1.0, (abs(x) - THX) / 0.15) * min(1.0, (THZ - (z - z0)) / 0.25)
    moved = 0.0
    for g in v.groups:
        n = F.vertex_groups[g.group].name
        if n.split('.')[0] in HAUNCH:
            d = g.weight * k * 0.9; g.weight -= d; moved += d
    if moved: G['Thigh' + side].add([v.index], moved, 'ADD')
# kuyruk: oturuşta gövdenin yanından yere sarılı; kemik ısısı onu bacaklara bağlar, kedi yürürken yerde sürüklenir.
# Yerde, arkada ve hiçbir bacak kemiğine yakın olmayan köşeler kuyruktur: sil, yerine kuyruk zincirine bağlı yeni kuyruk koy.
import bmesh
from mathutils.geometry import intersect_point_line
LEGS = [n + sd for n in ('Thigh', 'Heel', 'Foot', 'Paw', 'Arm', 'UpperArm') for sd in ('.L', '.R')]
segs = [(B.data.bones[n].head_local.copy(), B.data.bones[n].tail_local.copy()) for n in LEGS if n in B.data.bones]
def segdist(p, a, b):
    q, t = intersect_point_line(p, a, b); t = min(1.0, max(0.0, t)); return (p - (a + (b - a) * t)).length
tailv = [v.index for v in F.data.vertices if v.co.z - z0 < TZ and v.co.y < TY and min(segdist(v.co, a, b) for a, b in segs) > TD]
print('TAIL verts', len(tailv))
bm = bmesh.new(); bm.from_mesh(F.data); bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[bm.verts[i] for i in tailv], context='VERTS')
# silmeden kalan küçük kırıntılar
bm.verts.ensure_lookup_table(); seen = set(); small = []
for v in bm.verts:
    if v.index in seen: continue
    st = [v]; comp = []; seen.add(v.index)
    while st:
        x = st.pop(); comp.append(x)
        for e in x.link_edges:
            y = e.other_vert(x)
            if y.index not in seen: seen.add(y.index); st.append(y)
    if len(comp) < 300: small += comp
bmesh.ops.delete(bm, geom=small, context='VERTS'); print('CRUMBS', len(small))
bm.to_mesh(F.data); bm.free()
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
F.parent = B; am = F.modifiers.new('Armature', 'ARMATURE'); am.object = B
unweighted = sum(1 for v in F.data.vertices if not v.groups)
print('VERTS', len(F.data.vertices), 'unweighted', unweighted)

# --- 4. animasyonları B'ye pişir
# yeni kuyruk: dinlenme pozundaki kuyruk zinciri boyunca incelen tüp, her halka en yakın kuyruk kemiğine bağlı
chain = ['TailBase', 'TailBaseMiddle', 'TailTipMiddle', 'TailTip']
pts = [B.data.bones[chain[0]].head_local.copy()] + [B.data.bones[n].tail_local.copy() for n in chain]
# Somali'nin kuyruk kökü Fred'in kalçasından geride: kalçanın içinden köke uzanan köprü (Butt'a bağlı, pelvisle hareket eder)
fz = [v.co for v in F.data.vertices if abs(v.co.z - pts[0].z) < 0.3 and abs(v.co.x - pts[0].x) < 0.35]
ry = min(c.y for c in fz); near = [c for c in fz if c.y < ry + 0.06]
rear = sum(near, Vector()) / len(near)
start = rear + Vector((0, 0.12, 0)); print('TAIL gap', round((pts[0] - rear).length, 2))
pts = [start] + pts
# Catmull-Rom: eklemlerde köşe yapmadan akan kuyruk
def cr(p0, p1, p2, p3, t):
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
ext = [pts[0] * 2 - pts[1]] + pts + [pts[-1] * 2 - pts[-2]]
fine = []
for i in range(len(pts) - 1):
    for k in range(10): fine.append((cr(ext[i], ext[i + 1], ext[i + 2], ext[i + 3], k / 10), i))
fine.append((pts[-1], len(pts) - 2))
L = sum((fine[i + 1][0] - fine[i][0]).length for i in range(len(fine) - 1))
tm = bpy.data.meshes.new('FredTail'); bmt = bmesh.new(); rings = []; acc = 0.0; NR = 14
for i, (p, seg) in enumerate(fine):
    if i: acc += (p - fine[i - 1][0]).length
    d = (fine[min(i + 1, len(fine) - 1)][0] - fine[max(i - 1, 0)][0]).normalized()
    u = d.orthogonal().normalized(); w = d.cross(u)
    r = TR * (1 - 0.55 * (acc / L) ** 1.5)
    rings.append([bmt.verts.new(p + (u * math.cos(a) + w * math.sin(a)) * r) for a in [k / NR * math.tau for k in range(NR)]])
for i in range(len(rings) - 1):
    for k in range(NR): bmt.faces.new((rings[i][k], rings[i][(k + 1) % NR], rings[i + 1][(k + 1) % NR], rings[i + 1][k]))
tipc = bmt.verts.new(fine[-1][0] + (fine[-1][0] - fine[-2][0]).normalized() * TR * 0.4)
for k in range(NR): bmt.faces.new((rings[-1][k], rings[-1][(k + 1) % NR], tipc))
bmt.verts.index_update(); ringi = [[v.index for v in r_] for r_ in rings]; tipi = tipc.index
bmt.to_mesh(tm); bmt.free()
TO = bpy.data.objects.new('FredTail', tm); sc.collection.objects.link(TO)
for n in ('Butt',) + tuple(chain): TO.vertex_groups.new(name=n)
for i, (p, seg) in enumerate(fine):
    bone = 'Butt' if seg == 0 else chain[seg - 1]
    TO.vertex_groups[bone].add(ringi[i], 1.0, 'REPLACE')
TO.vertex_groups[chain[-1]].add([tipi], 1.0, 'REPLACE')
tmat = bpy.data.materials.new('FredTail'); tmat.use_nodes = True
tb = tmat.node_tree.nodes['Principled BSDF']; tb.inputs['Base Color'].default_value = (0.045, 0.03, 0.022, 1); tb.inputs['Roughness'].default_value = 0.85
tm.materials.append(tmat)
for poly in tm.polygons: poly.use_smooth = True
TO.parent = B; tam = TO.modifiers.new('Armature', 'ARMATURE'); tam.object = B
select_only([TO], TO); bpy.ops.object.mode_set(mode='WEIGHT_PAINT'); bpy.ops.object.vertex_group_smooth(group_select_mode='ALL', factor=0.5, repeat=4); bpy.ops.object.mode_set(mode='OBJECT')

for pb in B.pose.bones:
    c = pb.constraints.new('COPY_TRANSFORMS'); c.target = A; c.subtarget = pb.name
baked = {}
for name, (f0, f1) in KEEP.items():
    A.animation_data.action = bpy.data.actions[name]
    select_only([B], B); bpy.ops.object.mode_set(mode='POSE'); bpy.ops.pose.select_all(action='SELECT')
    if B.animation_data: B.animation_data.action = None
    bpy.ops.nla.bake(frame_start=f0, frame_end=f1, only_selected=False, visual_keying=True, clear_constraints=False, use_current_action=False, bake_types={'POSE'})
    act = B.animation_data.action; baked[name] = act
    bpy.ops.object.mode_set(mode='OBJECT')
    print('BAKED', name, act.name, f0, f1)
for pb in B.pose.bones:
    for c in list(pb.constraints): pb.constraints.remove(c)
B.animation_data.action = None
# Somali parçalarını ve orijinal aksiyonları sil
for o in list(bpy.context.scene.objects):
    if o not in (B, F, TO): bpy.data.objects.remove(o, do_unlink=True)
for a in list(bpy.data.actions):
    if a not in baked.values(): bpy.data.actions.remove(a)
for name, act in baked.items(): act.name = name; act.use_fake_user = True
for im in bpy.data.images:
    if im.size[0] > 1024 or im.size[1] > 1024:
        r = 1024 / max(im.size); im.scale(int(im.size[0] * r), int(im.size[1] * r))
select_only([B, F, TO], B)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='ACTIONS',
                          export_image_format='JPEG', export_jpeg_quality=82, export_cameras=False, export_lights=False,
                          export_def_bones=True, export_optimize_animation_size=True)
print('EXPORTED', out)
