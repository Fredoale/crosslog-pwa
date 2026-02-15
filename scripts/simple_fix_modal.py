#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\mantenimiento\DashboardTaller.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Simply remove the incorrectly placed modal code
# It's between line 1745 and before the closing );
incorrect_modal = '''
      {/* Modal Crear Orden de Trabajo */}
      {mostrarModalCrearOT && (
        <ModalCrearOrden
          onClose={() => setMostrarModalCrearOT(false)}
          onCreated={() => {
            setMostrarModalCrearOT(false);
            // Recargar datos si estamos en la vista de activas
            if (vista === 'activas') {
              setLoading(true);
            }
          }}
        />
      )}'''

if incorrect_modal in content:
    content = content.replace(incorrect_modal, '')
    print("Removed incorrectly placed modal")
else:
    print("WARNING: Could not find modal to remove")

# Now find the right place to insert - look for the closing of the main return
# Search for "</div>\n    </div>\n  );" pattern which is the end of the dashboard view
# We want to insert BEFORE the last </div> but AFTER the content

# Find the pattern:  space-y-6 animate-fade-in which is the main container
# Then find its closing </div>
import re

# Find the main dashboard container
main_container_match = re.search(r'<div className="space-y-6 animate-fade-in">', content)
if not main_container_match:
    print("ERROR: Could not find main container")
    exit(1)

start_pos = main_container_match.start()
print(f"Found main container at position {start_pos}")

# Now we need to find the matching closing </div>
# Count div opens and closes from start_pos
div_count = 0
pos = start_pos
while pos < len(content):
    if content[pos:pos+4] == '<div':
        div_count += 1
    elif content[pos:pos+6] == '</div>':
        div_count -= 1
        if div_count == 0:
            # Found the closing div
            closing_div_pos = pos
            print(f"Found closing div at position {closing_div_pos}")
            break
    pos += 1

if div_count != 0:
    print("ERROR: Could not find matching closing div")
    exit(1)

# Insert the modal BEFORE this closing </div>
modal_code = '''
      {/* Modal Crear Orden de Trabajo */}
      {mostrarModalCrearOT && (
        <ModalCrearOrden
          onClose={() => setMostrarModalCrearOT(false)}
          onCreated={() => {
            setMostrarModalCrearOT(false);
            // Recargar datos si estamos en la vista de activas
            if (vista === 'activas') {
              setLoading(true);
            }
          }}
        />
      )}

'''

content = content[:closing_div_pos] + modal_code + content[closing_div_pos:]

print("Modal inserted at correct position")

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("File fixed successfully!")
