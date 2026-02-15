#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\CarouselSector.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace UNIDADES_DISTRIBUCION with updated patentes
old_unidades = """export const UNIDADES_DISTRIBUCION = [
  { numero: '41', patente: 'AB152AZ' },
  { numero: '45', patente: 'N/A' },
  { numero: '46', patente: 'N/A' },
  { numero: '54', patente: 'N/A' },
  { numero: '63', patente: 'N/A' },
  { numero: '64', patente: 'N/A' },
  { numero: '813', patente: 'N/A' },
  { numero: '816', patente: 'AH506IC' },
];"""

new_unidades = """export const UNIDADES_DISTRIBUCION = [
  { numero: '41', patente: 'AB152AZ' },
  { numero: '45', patente: 'LYG959' },
  { numero: '46', patente: 'NBJ986' },
  { numero: '54', patente: 'HPD893' },
  { numero: '64', patente: 'MGY394' },
  { numero: '187', patente: 'AH506ID' },
  { numero: '813', patente: 'AE906WF' },
  { numero: '816', patente: 'AH506IC' },
];"""

if old_unidades in content:
    content = content.replace(old_unidades, new_unidades)
    print("[OK] Updated UNIDADES_DISTRIBUCION with correct patentes")
    print("     - Updated patentes for units 45, 46, 54, 64, 813")
    print("     - Removed unit 63")
    print("     - Added unit 187")
else:
    print("[ERROR] Could not find UNIDADES_DISTRIBUCION to update")
    exit(1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n[SUCCESS] Patentes updated successfully!")
