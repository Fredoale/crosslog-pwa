#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\mantenimiento\DashboardTaller.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line with the closing );
# Looking for line 1745 approximately
insert_index = None
for i in range(len(lines) - 1, -1, -1):
    line = lines[i]
    # Find the last "  );" which is the closing of the main return
    if line.strip() == ');' and i > 1700:  # Should be around line 1745
        # Check if the previous line is closing </div>
        if '</div>' in lines[i-1]:
            insert_index = i
            break

if insert_index is not None:
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

    lines.insert(insert_index, modal_code)
    print(f"Step 1: Inserted modal render at line {insert_index}")

    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)

    print("Completed: Added modal render to DashboardTaller")
else:
    print("ERROR: Could not find insertion point for modal")
