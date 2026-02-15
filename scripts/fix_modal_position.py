#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\mantenimiento\DashboardTaller.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# El problema es que el modal fue insertado en la línea 1746, DESPUÉS del cierre del return statement
# Necesito:
# 1. Eliminar las líneas 1745-1758 (el modal mal colocado)
# 2. Encontrar el cierre correcto del return statement del DashboardTaller
# 3. Insertar el modal ANTES de ese cierre

# Paso 1: Eliminar el modal mal ubicado (líneas 1745-1758, que en índice 0-based son 1744-1757)
# Línea 1745 es índice 1744, línea 1758 es índice 1757
# Total: 14 líneas a eliminar desde índice 1744

# First, let's check what's on those lines
print("Lines to remove (1745-1758):")
for i in range(1744, min(1758, len(lines))):
    print(f"  {i+1}: {lines[i].rstrip()}")

# Remove the incorrectly placed modal
del lines[1744:1758]

print("\nRemoved 14 lines")

# Now find where to insert the modal
# We need to find the closing of the main return statement of DashboardTaller
# Looking for the pattern where we have nested </div> closures

# The main component should end with something like:
#     </div>
#   );
# }

# Let's search backwards from line 1744 (now shorter) to find the right place
insert_pos = None
for i in range(min(1100, len(lines)), -1, -1):
    line = lines[i].strip()
    # Looking for lines that have just spaces and </div>
    if line == '</div>':
        # Check if the next few lines close the component
        if i+1 < len(lines) and lines[i+1].strip() in ['</div>', ''):
            if i+2 < len(lines) and lines[i+2].strip() in ['</div>', ''):
                # This might be the closing section
                # Check if there's a );  after the divs
                for j in range(i, min(i+10, len(lines))):
                    if ');' in lines[j]:
                        insert_pos = i
                        break
                if insert_pos:
                    break

if insert_pos is None:
    # Fallback: look for specific pattern around line 1100-1200
    # Search for the dashboard view content closing
    for i in range(900, min(1300, len(lines))):
        if 'animate-fade-in' in lines[i] and '</div>' in lines[i]:
            # Found potential closing div of main dashboard
            insert_pos = i + 1
            break

if insert_pos is None:
    print("ERROR: Could not find insertion position")
    exit(1)

print(f"\nInserting modal at line {insert_pos + 1}")

# Insert the modal code at the correct position
modal_lines = [
    '\n',
    '      {/* Modal Crear Orden de Trabajo */}\n',
    '      {mostrarModalCrearOT && (\n',
    '        <ModalCrearOrden\n',
    '          onClose={() => setMostrarModalCrearOT(false)}\n',
    '          onCreated={() => {\n',
    '            setMostrarModalCrearOT(false);\n',
    '            // Recargar datos si estamos en la vista de activas\n',
    '            if (vista === \'activas\') {\n',
    '              setLoading(true);\n',
    '            }\n',
    '          }}\n',
    '        />\n',
    '      )}\n'
]

# Insert at the found position
for j, modal_line in enumerate(modal_lines):
    lines.insert(insert_pos + j, modal_line)

print("Modal inserted successfully")

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("File updated successfully")
