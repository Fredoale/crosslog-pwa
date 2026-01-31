/**
 * Convierte un timestamp de Firebase o cualquier valor de fecha a un objeto Date
 * Maneja:
 * - Timestamps de Firebase (objetos con .seconds y .nanoseconds)
 * - Objetos Date
 * - Números (milliseconds desde epoch)
 * - Strings de fecha
 * - null/undefined (retorna fecha actual)
 */
export function convertirTimestampFirebase(valor: any): Date {
  if (!valor) {
    return new Date();
  }

  // Si es un Timestamp de Firebase (tiene .seconds)
  if (valor && typeof valor === 'object' && 'seconds' in valor) {
    return new Date(valor.seconds * 1000);
  }

  // Si ya es un Date
  if (valor instanceof Date) {
    return valor;
  }

  // Si tiene método toDate() (Timestamp de Firebase)
  if (valor && typeof valor.toDate === 'function') {
    return valor.toDate();
  }

  // Si es un número (milliseconds)
  if (typeof valor === 'number') {
    return new Date(valor);
  }

  // Si es un string
  if (typeof valor === 'string') {
    const parsed = new Date(valor);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // Si es objeto con _seconds (formato serializado de Firestore)
  if (valor && typeof valor === 'object' && '_seconds' in valor) {
    return new Date(valor._seconds * 1000);
  }

  // Fallback
  return new Date();
}

/**
 * Formatea una fecha para mostrar en la UI
 */
export function formatearFechaUI(valor: any, opciones?: Intl.DateTimeFormatOptions): string {
  const fecha = convertirTimestampFirebase(valor);
  return fecha.toLocaleDateString('es-AR', opciones || {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
