#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\mantenimiento\DashboardMantenimiento.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: Add 'distribucion' option to sector filter
old_filter = """                            <option value="">Todos los sectores</option>
                            <option value="vrac">VRAC Cisternas</option>
                            <option value="vital-aire">Vital Aire</option>"""

new_filter = """                            <option value="">Todos los sectores</option>
                            <option value="vrac">VRAC Cisternas</option>
                            <option value="vital-aire">Vital Aire</option>
                            <option value="distribucion">Distribución</option>"""

if old_filter in content:
    content = content.replace(old_filter, new_filter)
    print("[OK] Added 'Distribución' option to sector filter")
else:
    print("[WARNING] Could not find sector filter to update")

# Save the file
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n[SUCCESS] Distribucion filter option added!")
