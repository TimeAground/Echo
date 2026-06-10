import re
with open('src-tauri/src/managers/model.rs', encoding='utf-8') as f:
    content = f.read()

# Find exact is_recommended values
matches = re.findall(r'is_recommended: (true|false)', content)
true_count = matches.count('true')
false_count = matches.count('false')
print(f"Total is_recommended fields found: {len(matches)}")
print(f"  true:  {true_count}")
print(f"  false: {false_count}")
print(f"  SenseVoice is the ONLY recommended: {true_count == 1}")
