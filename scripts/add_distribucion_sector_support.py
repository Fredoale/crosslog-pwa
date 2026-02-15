#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\mantenimiento\DashboardMantenimiento.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: Add support for 'distribucion' sector in the checklist list display
old_sector_display = """                                  <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-semibold ${
                                    checklist.sector === 'vrac'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-orange-100 text-orange-700'
                                  }`}>
                                    {checklist.sector === 'vrac' ? 'VRAC' : 'V.AIRE'}
                                  </span>"""

new_sector_display = """                                  <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-semibold ${
                                    checklist.sector === 'vrac'
                                      ? 'bg-blue-100 text-blue-700'
                                      : checklist.sector === 'distribucion'
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-orange-100 text-orange-700'
                                  }`}>
                                    {checklist.sector === 'vrac' ? 'VRAC' : checklist.sector === 'distribucion' ? 'DISTRIBUCIÓN' : 'V.AIRE'}
                                  </span>"""

if old_sector_display in content:
    content = content.replace(old_sector_display, new_sector_display)
    print("[OK] Added 'distribucion' sector support to checklist list display")
else:
    print("[WARNING] Could not find sector display code to update")

# Save the file
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n[SUCCESS] Distribucion sector support added!")
