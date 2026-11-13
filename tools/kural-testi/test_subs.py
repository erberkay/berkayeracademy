# project_submissions kurallarının emülatör testi (sahte kullanıcılarla).
import json, base64, time, urllib.request, urllib.error
P = "demo-test"; H = "http://127.0.0.1:8095"; DB = f"projects/{P}/databases/(default)/documents"
def b64(d): return base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b"=").decode()
def tok(uid, email, verified=True):
    now = int(time.time())
    return b64({"alg": "none", "typ": "JWT"}) + "." + b64({"sub": uid, "user_id": uid, "email": email, "email_verified": verified, "iat": now, "exp": now + 3600,
        "aud": P, "iss": f"https://securetoken.google.com/{P}", "firebase": {"sign_in_provider": "password"}}) + "."
A = tok("ali", "ali@test.dev"); B = tok("veli", "veli@test.dev"); ADM = tok("adm", "berkayer032@gmail.com")
def req(method, path, body, t):
    r = urllib.request.Request(H + "/v1/" + path, data=json.dumps(body).encode() if body is not None else None, method=method,
                               headers={"Authorization": "Bearer " + t, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r) as x: return x.status
    except urllib.error.HTTPError as e: return e.code
def commit(writes, t): return req("POST", f"{DB}:commit", {"writes": writes}, t)
def S(v): return {"stringValue": v}
def I(v): return {"integerValue": str(v)}
def D(v): return {"doubleValue": v}
def create(id, t, fields, uid="ali"):
    f = {"uid": S(uid), "title": S("Parça"), "note": S(""), "status": S("uploading"), "chunks": I(1), "bytes": I(1000), "seconds": D(60.0), "mime": S("audio/mp4"), "platform": S("mac")}
    f.update(fields)
    return commit([{"update": {"name": f"{DB}/project_submissions/{id}", "fields": f}, "updateTransforms": [{"fieldPath": "created_at", "setToServerValue": "REQUEST_TIME"}], "currentDocument": {"exists": False}}], t)
def update(id, fields, t, sub=""):
    return commit([{"update": {"name": f"{DB}/project_submissions/{id}{sub}", "fields": fields}, "updateMask": {"fieldPaths": list(fields)}}], t)
def chunk(id, n, t, size=1000):
    return commit([{"update": {"name": f"{DB}/project_submissions/{id}/chunks/{n:03d}", "fields": {"n": I(n), "data": {"bytesValue": base64.b64encode(b"x" * size).decode()}}}, "currentDocument": {"exists": False}}], t)
ok = lambda c: c == 200
res = []
def check(name, cond): res.append((name, cond)); print(("✔" if cond else "✘"), name)
check("öğrenci gönderi açar", ok(create("s1", A, {})))
check("başkasının adına açamaz", not ok(create("s2", A, {}, uid="veli")))
check("'new' olarak açamaz", not ok(create("s3", A, {"status": S("new")})))
check("fazla alan yazamaz", not ok(create("s4", A, {"feedback": S("kendime övgü")})))
check("çok büyük ses bildiremez", not ok(create("s5", A, {"bytes": I(9_000_000)})))
check("kendi parçasını yükler", ok(chunk("s1", 0, A)))
check("başkası parça yükleyemez", not ok(chunk("s1", 1, B)))
check("750 KB üstü parça yazılamaz", not ok(chunk("s1", 2, A, size=800_000)))
check("başkası okuyamaz", not ok(req("GET", f"{DB}/project_submissions/s1", None, B)))
check("sahibi okur", ok(req("GET", f"{DB}/project_submissions/s1", None, A)))
check("sahibi 'new' yapar", ok(update("s1", {"status": S("new")}, A)))
check("'new' sonrası parça eklenemez", not ok(chunk("s1", 3, A)))
check("öğrenci yorum yazamaz", not ok(update("s1", {"feedback": S("süper"), "status": S("reviewed")}, A)))
check("öğrenci 'new'i geri alamaz", not ok(update("s1", {"status": S("uploading")}, A)))
check("admin okur", ok(req("GET", f"{DB}/project_submissions/s1", None, ADM)))
check("admin parçaları okur", ok(req("GET", f"{DB}/project_submissions/s1/chunks/000", None, ADM)))
check("admin yorum yazar", ok(update("s1", {"feedback": S("Bas çok iyi"), "status": S("reviewed")}, ADM)))
check("öğrenci silemez", req("DELETE", f"{DB}/project_submissions/s1", None, A) != 200)
print("SONUÇ", sum(1 for _, c in res if c), "/", len(res))
