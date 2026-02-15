#!/usr/bin/env python3

# Fix 1: Add 'distribucion' to SectorChecklist type
file1 = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\types\checklist.ts'

with open(file1, 'r', encoding='utf-8') as f:
    content1 = f.read()

old_type = "export type SectorChecklist = 'vrac' | 'vital-aire';"
new_type = "export type SectorChecklist = 'vrac' | 'vital-aire' | 'distribucion';"

if old_type in content1:
    content1 = content1.replace(old_type, new_type)
    with open(file1, 'w', encoding='utf-8') as f:
        f.write(content1)
    print("Step 1: Added 'distribucion' to SectorChecklist type")
else:
    print("WARNING: Could not find SectorChecklist type to update")

# Fix 2: Change sector from 'vrac' to 'distribucion' in ChecklistDistribucion
file2 = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\ChecklistDistribucion.tsx'

with open(file2, 'r', encoding='utf-8') as f:
    content2 = f.read()

old_sector = "      sector: 'vrac', // Using vrac as base type"
new_sector = "      sector: 'distribucion',"

if old_sector in content2:
    content2 = content2.replace(old_sector, new_sector)
    with open(file2, 'w', encoding='utf-8') as f:
        f.write(content2)
    print("Step 2: Changed sector to 'distribucion' in ChecklistDistribucion")
else:
    print("WARNING: Could not find sector line to update")

print("Completed: Fixed sector type and usage")
