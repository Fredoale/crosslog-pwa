#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\CarouselSector.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add UNIDADES_DISTRIBUCION after UNIDADES_VITAL_AIRE
new_const = """
export const UNIDADES_DISTRIBUCION = [
  { numero: '41', patente: 'AB152AZ' },
  { numero: '45', patente: 'N/A' },
  { numero: '46', patente: 'N/A' },
  { numero: '54', patente: 'N/A' },
  { numero: '63', patente: 'N/A' },
  { numero: '64', patente: 'N/A' },
  { numero: '813', patente: 'N/A' },
  { numero: '816', patente: 'AH506IC' },
];
"""

# Find the position after UNIDADES_VITAL_AIRE and insert
insert_marker = "];\n\nexport function CarouselSector({"
if insert_marker in content:
    content = content.replace(insert_marker, "];" + new_const + "\nexport function CarouselSector({")
    print("Step 1: Added UNIDADES_DISTRIBUCION constant")
else:
    print("WARNING: Could not find insert marker for UNIDADES_DISTRIBUCION")

# 2. Update the combustible section to use UNIDADES_DISTRIBUCION
old_units_line = "              {[...UNIDADES_VRAC, ...UNIDADES_VITAL_AIRE].sort((a, b) => a.numero.localeCompare(b.numero)).map((unidad) => ("
new_units_line = "              {UNIDADES_DISTRIBUCION.sort((a, b) => a.numero.localeCompare(b.numero)).map((unidad) => ("

if old_units_line in content:
    content = content.replace(old_units_line, new_units_line)
    print("Step 2: Updated combustible section to use UNIDADES_DISTRIBUCION")
else:
    print("WARNING: Could not find combustible units line to replace")

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Completed successfully!")
print("Added UNIDADES_DISTRIBUCION and updated combustible selector")
