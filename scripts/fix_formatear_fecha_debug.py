#!/usr/bin/env python3

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\mantenimiento\DashboardMantenimiento.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add more detailed logging to formatearFecha function
old_function = """const formatearFecha = (fecha: Date | null | undefined): string => {
  if (!fecha) return 'Fecha no disponible';

  try {
    const dateObj = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(dateObj.getTime())) {
      return 'Fecha no disponible';
    }

    return dateObj.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('[formatearFecha] Error formateando fecha:', error);
    return 'Fecha no disponible';
  }
};"""

new_function = """const formatearFecha = (fecha: Date | null | undefined): string => {
  if (!fecha) {
    console.warn('[formatearFecha] ⚠️ Fecha es null/undefined');
    return 'Fecha no disponible';
  }

  try {
    const dateObj = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(dateObj.getTime())) {
      console.error('[formatearFecha] ❌ Fecha inválida:', {
        tipoRecibido: typeof fecha,
        valorRecibido: fecha,
        esDate: fecha instanceof Date
      });
      return 'Fecha no disponible';
    }

    return dateObj.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('[formatearFecha] ❌ Error formateando fecha:', error, 'Valor:', fecha);
    return 'Fecha no disponible';
  }
};"""

if old_function in content:
    content = content.replace(old_function, new_function)
    print("[OK] Added detailed logging to formatearFecha function")
else:
    print("[ERROR] Could not find formatearFecha function to update")
    exit(1)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n[SUCCESS] Debug logging added to formatearFecha!")
print("Now the console will show:")
print("  - When fecha is null/undefined")
print("  - When fecha is invalid (type, value, isDate)")
print("  - Exact error messages with the problematic value")
