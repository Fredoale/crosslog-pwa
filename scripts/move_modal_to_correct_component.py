#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\mantenimiento\DashboardTaller.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Remove the incorrectly placed modal from VistaDashboard (around lines 1041-1049)
incorrect_modal = '''
      {/* Modal Crear Orden de Trabajo */}
      {mostrarModalCrearOT && (
        <ModalCrearOrden
          onClose={() => setMostrarModalCrearOT(false)}
          onCreated={() => {
            setMostrarModalCrearOT(false);
          }}
        />
      )}
'''

if incorrect_modal in content:
    content = content.replace(incorrect_modal, '')
    print("[OK] Removed modal from VistaDashboard component")
else:
    print("[ERROR] Could not find modal to remove")

# Step 2: Add modal to DashboardTaller component (after ModalHistorialUnidad)
# Find the ModalHistorialUnidad closing and add our modal after it

marker = '''      {mostrarModalHistorial && (
        <ModalHistorialUnidad
          ordenes={historialUnidad}
          onClose={() => {
            setMostrarModalHistorial(false);
            setHistorialUnidad([]);
          }}
        />
      )}
    </div>
  );
}'''

replacement = '''      {mostrarModalHistorial && (
        <ModalHistorialUnidad
          ordenes={historialUnidad}
          onClose={() => {
            setMostrarModalHistorial(false);
            setHistorialUnidad([]);
          }}
        />
      )}

      {/* Modal Crear Orden de Trabajo */}
      {mostrarModalCrearOT && (
        <ModalCrearOrden
          onClose={() => setMostrarModalCrearOT(false)}
          onCreated={() => {
            setMostrarModalCrearOT(false);
          }}
        />
      )}
    </div>
  );
}'''

if marker in content:
    content = content.replace(marker, replacement)
    print("[OK] Added modal to DashboardTaller component")
else:
    print("[ERROR] Could not find insertion point")
    exit(1)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n[SUCCESS] Modal successfully moved to correct component!")
