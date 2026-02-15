#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\mantenimiento\DashboardTaller.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove the modal from lines 1041-1053 (indices 1040-1052)
# First check they're there
print("Removing incorrectly placed modal from lines 1041-1053:")
for i in range(1040, min(1054, len(lines))):
    print(f"  {i+1}: {lines[i].rstrip()}")

# Remove those lines
del lines[1040:1054]
print("\nRemoved modal")

# Now insert it in the correct place
# We want it right after line 1039 (now 1039 since we haven't deleted yet)
# which is: })()}
# But BEFORE the closing </div> on line 1055

# Find the })()) line
insert_pos = None
for i in range(1030, min(1045, len(lines))):
    if '})()}' in lines[i]:
        # Insert after this line
        insert_pos = i + 1
        print(f"\nFound }})()}} at line {i+1}, will insert modal after it")
        break

if insert_pos is None:
    print("ERROR: Could not find insertion point")
    exit(1)

# Insert modal at correct position
modal_lines = [
    '\n',
    '      {/* Modal Crear Orden de Trabajo */}\n',
    '      {mostrarModalCrearOT && (\n',
    '        <ModalCrearOrden\n',
    '          onClose={() => setMostrarModalCrearOT(false)}\n',
    '          onCreated={() => {\n',
    '            setMostrarModalCrearOT(false);\n',
    '          }}\n',
    '        />\n',
    '      )}\n',
    '\n'
]

for j, line in enumerate(modal_lines):
    lines.insert(insert_pos + j, line)

print(f"Inserted modal at line {insert_pos + 1}")

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("File fixed successfully!")
