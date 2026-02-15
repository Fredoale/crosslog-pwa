#!/usr/bin/env python3
import re

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\services\checklistService.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace both occurrences - fix for collection name and use template literal
# First, replace the incomplete changes back
content = content.replace(
    "doc(db, 'checklists', )",
    "doc(db, 'checklists_distribucion', hdr)"
)

# Now do the correct replacement
content = content.replace(
    "doc(db, 'checklists_distribucion', hdr)",
    "doc(db, 'checklists', `dist_${hdr}`)"
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacements completed successfully")
print("Changed: doc(db, 'checklists_distribucion', hdr)")
print("To: doc(db, 'checklists', `dist_${hdr}`)")
