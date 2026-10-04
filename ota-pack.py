#!/usr/bin/env python3
"""生成 OTA 清单：version.json（带全量文件哈希）+ APK 基线 manifest"""
import hashlib, json, os, sys

WEB = os.path.join(os.path.dirname(__file__), 'web')
OTA = os.path.join(os.path.dirname(__file__), 'ota')

def sha16(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()[:16]

files = {}
for root, dirs, fs in os.walk(WEB):
    for f in fs:
        p = os.path.join(root, f)
        rel = os.path.relpath(p, WEB)
        if rel == 'ota-manifest.json':
            continue
        files[rel] = sha16(p)

# APK 出厂基线（首更即增量）
with open(os.path.join(WEB, 'ota-manifest.json'), 'w') as f:
    json.dump(files, f)

# OTA 服务器端 version.json：保留 code/name/notes，追加 files 哈希
vpath = os.path.join(OTA, 'version.json')
ver = {'code': 1, 'name': '1.0.0', 'notes': []}
if os.path.exists(vpath):
    ver = json.load(open(vpath))
    ver.pop('zip', None)   # 差量模式不再需要整包
ver['files'] = files
json.dump(ver, open(vpath, 'w'), ensure_ascii=False, indent=2)
print(f"✓ 清单生成：{len(files)} 个文件已哈希")
