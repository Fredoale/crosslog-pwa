#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\mantenimiento\DashboardMantenimiento.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# El problema es que safeDate() retorna un Date inválido si ya recibe un Date inválido
# Necesitamos VALIDAR incluso los Date objects

old_safeDate = """  // Helper to safely convert Timestamp or Date
  const safeDate = (value: any): Date => {
    if (!value) return new Date();
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    try {
      const d = new Date(value);
      return isNaN(d.getTime()) ? new Date() : d;
    } catch {
      return new Date();
    }
  };"""

new_safeDate = """  // Helper to safely convert Timestamp or Date - ALWAYS validates even Date objects
  const safeDate = (value: any): Date => {
    if (!value) return new Date();

    // If it's a Timestamp, convert it
    if (value instanceof Timestamp) {
      try {
        const converted = value.toDate();
        return isNaN(converted.getTime()) ? new Date() : converted;
      } catch {
        return new Date();
      }
    }

    // If it's a Date, VALIDATE IT (don't trust it blindly)
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? new Date() : value;
    }

    // Try to create a Date from the value
    try {
      const d = new Date(value);
      return isNaN(d.getTime()) ? new Date() : d;
    } catch {
      return new Date();
    }
  };"""

if old_safeDate in content:
    content = content.replace(old_safeDate, new_safeDate)
    print("[OK] ✅ Actualizado safeDate() para VALIDAR todos los Date objects")
else:
    print("[ERROR] ❌ No se encontró la función safeDate() a reemplazar")
    exit(1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n[SUCCESS] ✅ FIX DEFINITIVO APLICADO!")
print("Ahora safeDate() VALIDA todos los Date objects, incluso si ya son Date")
print("Si un Date es inválido, retorna new Date() en lugar del Date inválido")
