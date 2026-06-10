import json

with open('src/i18n/locales/zh/translation.json', encoding='utf-8') as f:
    zh = json.load(f)
with open('src/i18n/locales/en/translation.json', encoding='utf-8') as f:
    en = json.load(f)

print("=== zh top-level keys ===")
for k in list(zh.keys())[:20]:
    v = zh[k]
    if isinstance(v, dict):
        print(f"  {k}: ({len(v)} subkeys)")
    else:
        print(f"  {k}: {str(v)[:60]}")

print()
print("=== en top-level keys ===")
for k in list(en.keys())[:20]:
    v = en[k]
    if isinstance(v, dict):
        print(f"  {k}: ({len(v)} subkeys)")
    else:
        print(f"  {k}: {str(v)[:60]}")

print()
print("=== zh 'common' subkeys ===")
if 'common' in zh:
    for k, v in zh['common'].items():
        print(f"  {k}: {v}")
else:
    print("  NOT FOUND")

print()
print("=== zh sample translations ===")
# Try flat access on known keys
for key in ['save', 'settings', 'copy', 'model', 'language', 'microphone']:
    if key in zh:
        print(f"  {key}: {zh[key]}")
    elif 'common' in zh and key in zh.get('common', {}):
        print(f"  common.{key}: {zh['common'][key]}")
    else:
        print(f"  {key}: NOT FOUND")
