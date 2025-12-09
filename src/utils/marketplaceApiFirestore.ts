// ============================================
// MARKETPLACE API - FIRESTORE (Tiempo Real)
// ============================================

import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ViajeMarketplace } from './marketplaceApi';

// ============================================
// 1. VIAJES - SUSCRIPCIÓN EN TIEMPO REAL
// ============================================

/**
 * Suscribirse a cambios de viajes en tiempo real
 * @param callback - Función que se ejecuta cuando hay cambios
 * @param estado - Filtrar por estado (opcional)
 * @returns Función para desuscribirse
 */
export function suscribirseAViajes(
  callback: (viajes: ViajeMarketplace[]) => void,
  estado?: string
): () => void {
  console.log('[FirestoreAPI] Suscribiéndose a viajes...', estado ? `Estado: ${estado}` : 'Todos');

  const viajesRef = collection(db, 'viajes_marketplace');

  // Crear query con o sin filtro de estado
  const q = estado
    ? query(viajesRef, where('estado', '==', estado), orderBy('fecha_publicacion', 'desc'))
    : query(viajesRef, orderBy('fecha_publicacion', 'desc'));

  // onSnapshot escucha cambios en tiempo real
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      console.log('[FirestoreAPI] Cambio detectado en viajes, documentos:', snapshot.docs.length);

      const viajes: ViajeMarketplace[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          HDR_viaje: data.HDR_viaje || doc.id,
          cliente_id: data.cliente_id || '',
          cliente_nombre: data.cliente_nombre || '',
          fecha_viaje: data.fecha_viaje || '',
          fecha_publicacion: data.fecha_publicacion || '',
          estado: data.estado || 'BORRADOR',
          precio_base: Number(data.precio_base) || 0,
          tipo_unidad_requerida: data.tipo_unidad_requerida || '',
          peso_kg: Number(data.peso_kg) || 0,
          tipo_carga: data.tipo_carga || '',
          detalles_ruta: data.detalles_ruta || [],
          tiempo_limite_oferta: data.tiempo_limite_oferta || '',
          total_ofertas: Number(data.total_ofertas) || 0,
          fletero_asignado: data.fletero_asignado || undefined,
          precio_final: data.precio_final ? Number(data.precio_final) : undefined,
          hdr_generado: data.hdr_generado || undefined,
          fecha_asignacion: data.fecha_asignacion || undefined,
          fecha_completado: data.fecha_completado || undefined,
          rating_viaje: data.rating_viaje ? Number(data.rating_viaje) : undefined,
          notas_internas: data.notas_internas || undefined,
          fleteros_rechazaron: data.fleteros_rechazaron || undefined,
        };
      });

      console.log(`[FirestoreAPI] ${viajes.length} viajes actualizados`);
      callback(viajes);
    },
    (error) => {
      console.error('[FirestoreAPI] Error al escuchar viajes:', error);
    }
  );

  return unsubscribe;
}

// ============================================
// 2. VIAJES - CREAR
// ============================================

/**
 * Crear un nuevo viaje en Firestore
 * @param viaje - Datos del viaje
 * @param estado - Estado inicial
 * @param fleteroAsignado - Fletero asignado (opcional)
 * @returns HDR del viaje creado
 */
export async function crearViaje(
  viaje: Partial<ViajeMarketplace>,
  estado: 'BORRADOR' | 'PUBLICADO' | 'ASIGNADO' | 'CONFIRMADO' = 'BORRADOR',
  fleteroAsignado?: string
): Promise<string> {
  console.log('[FirestoreAPI] Creando viaje...', viaje, 'Estado:', estado);

  // Generar HDR único
  const HDR_viaje = `VJ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  const viajeData = {
    HDR_viaje: HDR_viaje,
    cliente_id: viaje.cliente_id || '',
    cliente_nombre: viaje.cliente_nombre || '',
    fecha_viaje: viaje.fecha_viaje || '',
    fecha_publicacion: new Date().toISOString(),
    estado: estado,
    precio_base: viaje.precio_base || 0,
    tipo_unidad_requerida: viaje.tipo_unidad_requerida || '',
    peso_kg: viaje.peso_kg || 0,
    tipo_carga: viaje.tipo_carga || '',
    detalles_ruta: viaje.detalles_ruta || [],
    tiempo_limite_oferta: viaje.tiempo_limite_oferta || '',
    total_ofertas: 0,
    fletero_asignado: fleteroAsignado || '',
    precio_final: estado === 'ASIGNADO' || estado === 'CONFIRMADO' ? viaje.precio_base || 0 : 0,
    hdr_generado: viaje.hdr_generado || '',
    fecha_asignacion: estado === 'ASIGNADO' || estado === 'CONFIRMADO' ? new Date().toISOString() : '',
    fecha_completado: '',
    rating_viaje: 0,
    notas_internas: viaje.notas_internas || '',
    fleteros_rechazaron: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  try {
    const docRef = await addDoc(collection(db, 'viajes_marketplace'), viajeData);
    console.log('[FirestoreAPI] ✅ Viaje creado:', HDR_viaje, 'DocID:', docRef.id);
    return HDR_viaje;
  } catch (error) {
    console.error('[FirestoreAPI] ❌ Error al crear viaje:', error);
    throw error;
  }
}

// ============================================
// 3. VIAJES - ELIMINAR
// ============================================

/**
 * Eliminar un viaje de Firestore
 * @param HDR_viaje - HDR del viaje a eliminar
 */
export async function eliminarViaje(HDR_viaje: string): Promise<void> {
  console.log('[FirestoreAPI] Eliminando viaje:', HDR_viaje);

  try {
    // Buscar el documento por HDR_viaje
    const viajesRef = collection(db, 'viajes_marketplace');
    const q = query(viajesRef, where('HDR_viaje', '==', HDR_viaje));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await deleteDoc(doc(db, 'viajes_marketplace', docId));
        console.log('[FirestoreAPI] ✅ Viaje eliminado:', HDR_viaje);
      } else {
        console.warn('[FirestoreAPI] Viaje no encontrado:', HDR_viaje);
      }
      unsubscribe();
    });
  } catch (error) {
    console.error('[FirestoreAPI] ❌ Error al eliminar viaje:', error);
    throw error;
  }
}

// ============================================
// 4. VIAJES - ACEPTAR (Fletero acepta un viaje PUBLICADO)
// ============================================

/**
 * Aceptar un viaje del marketplace (para fleteros)
 * @param HDR_viaje - HDR del viaje
 * @param fletero_nombre - Nombre del fletero
 * @param fletero_id - ID del fletero
 */
export async function aceptarViajeMarketplace(
  HDR_viaje: string,
  fletero_nombre: string,
  fletero_id: string
): Promise<void> {
  console.log(`[FirestoreAPI] Fletero ${fletero_nombre} aceptando viaje ${HDR_viaje}`);

  try {
    const viajesRef = collection(db, 'viajes_marketplace');
    const q = query(viajesRef, where('HDR_viaje', '==', HDR_viaje));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        const docRef = doc(db, 'viajes_marketplace', docId);

        await updateDoc(docRef, {
          estado: 'CONFIRMADO',
          fletero_asignado: fletero_id,
          fecha_asignacion: new Date().toISOString(),
          notas_internas: `Aceptado por ${fletero_nombre} el ${new Date().toLocaleString()}`,
          updatedAt: Timestamp.now(),
        });

        console.log('[FirestoreAPI] ✅ Viaje aceptado:', HDR_viaje);
      } else {
        console.warn('[FirestoreAPI] Viaje no encontrado:', HDR_viaje);
        throw new Error(`Viaje no encontrado: ${HDR_viaje}`);
      }
      unsubscribe();
    });
  } catch (error) {
    console.error('[FirestoreAPI] ❌ Error al aceptar viaje:', error);
    throw error;
  }
}

// ============================================
// 5. VIAJES - RECHAZAR (Fletero rechaza un viaje)
// ============================================

/**
 * Rechazar un viaje del marketplace (para fleteros)
 * @param HDR_viaje - HDR del viaje
 * @param fletero_nombre - Nombre del fletero
 */
export async function rechazarViajeMarketplace(
  HDR_viaje: string,
  fletero_nombre: string
): Promise<void> {
  console.log(`[FirestoreAPI] Fletero ${fletero_nombre} rechazando viaje ${HDR_viaje}`);

  try {
    const viajesRef = collection(db, 'viajes_marketplace');
    const q = query(viajesRef, where('HDR_viaje', '==', HDR_viaje));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        const docRef = doc(db, 'viajes_marketplace', docId);
        const data = snapshot.docs[0].data();
        const notasActuales = data.notas_internas || '';
        const fleteros_rechazaron = data.fleteros_rechazaron || [];

        // Agregar fletero a la lista de rechazos si no está ya
        if (!fleteros_rechazaron.includes(fletero_nombre)) {
          fleteros_rechazaron.push(fletero_nombre);
        }

        await updateDoc(docRef, {
          fleteros_rechazaron: fleteros_rechazaron,
          notas_internas: notasActuales + `\n⚠️ Rechazado por ${fletero_nombre} el ${new Date().toLocaleString()}`,
          updatedAt: Timestamp.now(),
        });

        console.log('[FirestoreAPI] ✅ Viaje rechazado por', fletero_nombre, ':', HDR_viaje);
      } else {
        console.warn('[FirestoreAPI] Viaje no encontrado:', HDR_viaje);
        throw new Error(`Viaje no encontrado: ${HDR_viaje}`);
      }
      unsubscribe();
    });
  } catch (error) {
    console.error('[FirestoreAPI] ❌ Error al rechazar viaje:', error);
    throw error;
  }
}

// ============================================
// 6. VIAJES - ACTUALIZAR ESTADO
// ============================================

/**
 * Actualizar el estado de un viaje (para confirmaciones, asignaciones, etc.)
 * @param HDR_viaje - HDR del viaje
 * @param nuevoEstado - Nuevo estado
 * @param fleteroAsignado - Fletero asignado (opcional)
 * @param precioFinal - Precio final (opcional)
 * @param notasInternas - Notas internas adicionales (opcional)
 */
export async function actualizarEstadoViaje(
  HDR_viaje: string,
  nuevoEstado: 'BORRADOR' | 'PUBLICADO' | 'CONFIRMADO' | 'ASIGNADO' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO',
  fleteroAsignado?: string,
  precioFinal?: number,
  notasInternas?: string
): Promise<void> {
  console.log('[FirestoreAPI] Actualizando estado de viaje:', HDR_viaje, '→', nuevoEstado);

  try {
    // Buscar el documento por HDR_viaje
    const viajesRef = collection(db, 'viajes_marketplace');
    const q = query(viajesRef, where('HDR_viaje', '==', HDR_viaje));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        const docRef = doc(db, 'viajes_marketplace', docId);

        const updateData: any = {
          estado: nuevoEstado,
          updatedAt: Timestamp.now(),
        };

        if (fleteroAsignado) {
          updateData.fletero_asignado = fleteroAsignado;
        }

        if (precioFinal !== undefined) {
          updateData.precio_final = precioFinal;
        }

        if (nuevoEstado === 'CONFIRMADO' || nuevoEstado === 'ASIGNADO') {
          updateData.fecha_asignacion = new Date().toISOString();
        }

        if (nuevoEstado === 'COMPLETADO') {
          updateData.fecha_completado = new Date().toISOString();
        }

        if (notasInternas) {
          const notasActuales = snapshot.docs[0].data().notas_internas || '';
          updateData.notas_internas = notasActuales + '\n' + notasInternas;
        }

        await updateDoc(docRef, updateData);
        console.log('[FirestoreAPI] ✅ Estado actualizado:', HDR_viaje, '→', nuevoEstado);
      } else {
        console.warn('[FirestoreAPI] Viaje no encontrado:', HDR_viaje);
        throw new Error(`Viaje no encontrado: ${HDR_viaje}`);
      }
      unsubscribe();
    });
  } catch (error) {
    console.error('[FirestoreAPI] ❌ Error al actualizar estado:', error);
    throw error;
  }
}
