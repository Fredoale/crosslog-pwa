#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\mantenimiento\DashboardTaller.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import for ModalCrearOrden
import_line = "import { getAllCargasCombustible } from '../../services/combustibleService';"
new_import = "import { getAllCargasCombustible } from '../../services/combustibleService';\nimport { ModalCrearOrden } from '../modals/ModalCrearOrden';"

if import_line in content and "import { ModalCrearOrden }" not in content:
    content = content.replace(import_line, new_import)
    print("Step 1: Added ModalCrearOrden import")
else:
    print("WARNING: Could not add import or already exists")

# 2. Add state for modal after other modal states
# Find the line with mostrarModalHistorial
state_marker = "const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);"
new_state = "const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);\n  const [mostrarModalCrearOT, setMostrarModalCrearOT] = useState(false);"

if state_marker in content and "mostrarModalCrearOT" not in content:
    content = content.replace(state_marker, new_state)
    print("Step 2: Added modal state")
else:
    print("WARNING: Could not add state or already exists")

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Completed: Added import and state for ModalCrearOrden")
