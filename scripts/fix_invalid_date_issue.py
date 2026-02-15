#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\mantenimiento\DashboardMantenimiento.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the timestampCompletado conversion that creates Invalid Date
old_code = """        timestampCompletado: docData.timestampCompletado instanceof Timestamp ? docData.timestampCompletado.toDate() : new Date(docData.timestampCompletado),"""

new_code = """        timestampCompletado: docData.timestampCompletado
          ? (docData.timestampCompletado instanceof Timestamp ? docData.timestampCompletado.toDate() : new Date(docData.timestampCompletado))
          : new Date(),"""

if old_code in content:
    content = content.replace(old_code, new_code)
    print("[OK] Fixed timestampCompletado conversion (added null check)")
else:
    print("[ERROR] Could not find timestampCompletado line to fix")
    exit(1)

# Also fix odometroInicial.fecha_hora which might have the same issue
old_odometro = """          fecha_hora: docData.odometroInicial.fecha_hora instanceof Timestamp ? docData.odometroInicial.fecha_hora.toDate() : new Date(docData.odometroInicial.fecha_hora)"""

new_odometro = """          fecha_hora: docData.odometroInicial.fecha_hora
            ? (docData.odometroInicial.fecha_hora instanceof Timestamp ? docData.odometroInicial.fecha_hora.toDate() : new Date(docData.odometroInicial.fecha_hora))
            : new Date()"""

if old_odometro in content:
    content = content.replace(old_odometro, new_odometro)
    print("[OK] Fixed odometroInicial.fecha_hora conversion (added null check)")
else:
    print("[WARNING] Could not find odometroInicial.fecha_hora to fix (might already be fixed)")

# Fix items timestamp
old_items = """          timestamp: item.timestamp instanceof Timestamp ? item.timestamp.toDate() : new Date(item.timestamp)"""

new_items = """          timestamp: item.timestamp
            ? (item.timestamp instanceof Timestamp ? item.timestamp.toDate() : new Date(item.timestamp))
            : new Date()"""

if old_items in content:
    content = content.replace(old_items, new_items)
    print("[OK] Fixed items timestamp conversion (added null check)")
else:
    print("[WARNING] Could not find items timestamp to fix (might already be fixed)")

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n[SUCCESS] All Invalid Date issues fixed!")
print("Now all Date conversions check for null/undefined before converting")
print("This prevents 'new Date(null)' which creates Invalid Date")
