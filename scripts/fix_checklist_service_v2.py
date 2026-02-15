#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\services\checklistService.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# First, fix the broken replacements
content = content.replace(
    "doc(db, 'checklists', )",
    "doc(db, 'checklists_distribucion', hdr)"
)

# Now do the correct replacement with proper template literal
# Using backtick ` character (ASCII 96)
replacement = "doc(db, 'checklists', " + chr(96) + "dist_${hdr}" + chr(96) + ")"
content = content.replace(
    "doc(db, 'checklists_distribucion', hdr)",
    replacement
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacements completed successfully")
print("Changed: doc(db, 'checklists_distribucion', hdr)")
print("To: doc(db, 'checklists', `dist_${hdr}`)")
