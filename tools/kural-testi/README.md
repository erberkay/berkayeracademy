# Firestore kural testi (emülatör)

`project_submissions` kurallarını sahte kullanıcılarla dener. Canlı veriye dokunmaz.

```bash
cp ../../firestore.rules . && firebase emulators:exec --only firestore --project demo-test "python3 test_subs.py"
```
