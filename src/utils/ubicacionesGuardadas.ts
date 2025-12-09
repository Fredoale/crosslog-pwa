// ============================================
// GESTIÓN DE UBICACIONES GUARDADAS
// ============================================

export interface UbicacionGuardada {
  nombre: string;
  enlace_google_maps: string;
  tipo: 'CARGA' | 'DESTINO' | 'AMBOS';
  horario?: string; // Horario de presentación (para CARGA) o recepción (para DESTINO)
  fecha_guardado: string;
}

const STORAGE_KEY = 'crosslog_ubicaciones_guardadas';

/**
 * Obtener todas las ubicaciones guardadas
 */
export function obtenerUbicacionesGuardadas(): UbicacionGuardada[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error al obtener ubicaciones guardadas:', error);
    return [];
  }
}

/**
 * Guardar una nueva ubicación
 */
export function guardarUbicacion(ubicacion: Omit<UbicacionGuardada, 'fecha_guardado'>): void {
  try {
    const ubicaciones = obtenerUbicacionesGuardadas();

    // Verificar si ya existe
    const existe = ubicaciones.some(u => u.nombre.toLowerCase() === ubicacion.nombre.toLowerCase());
    if (existe) {
      throw new Error('Ya existe una ubicación con ese nombre');
    }

    const nuevaUbicacion: UbicacionGuardada = {
      ...ubicacion,
      fecha_guardado: new Date().toISOString()
    };

    ubicaciones.push(nuevaUbicacion);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ubicaciones));
  } catch (error) {
    console.error('Error al guardar ubicación:', error);
    throw error;
  }
}

/**
 * Buscar ubicación por nombre
 */
export function buscarUbicacion(nombre: string): UbicacionGuardada | null {
  const ubicaciones = obtenerUbicacionesGuardadas();
  return ubicaciones.find(u => u.nombre.toLowerCase() === nombre.toLowerCase()) || null;
}

/**
 * Eliminar ubicación
 */
export function eliminarUbicacion(nombre: string): void {
  try {
    const ubicaciones = obtenerUbicacionesGuardadas();
    const filtered = ubicaciones.filter(u => u.nombre.toLowerCase() !== nombre.toLowerCase());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error al eliminar ubicación:', error);
    throw error;
  }
}

/**
 * Obtener ubicaciones por tipo
 */
export function obtenerUbicacionesPorTipo(tipo: 'CARGA' | 'DESTINO'): UbicacionGuardada[] {
  const ubicaciones = obtenerUbicacionesGuardadas();
  return ubicaciones.filter(u => u.tipo === tipo || u.tipo === 'AMBOS');
}

/**
 * Limpiar todas las ubicaciones guardadas (útil para desarrollo)
 */
export function limpiarTodasLasUbicaciones(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('✅ Todas las ubicaciones han sido eliminadas');
  } catch (error) {
    console.error('Error al limpiar ubicaciones:', error);
  }
}
