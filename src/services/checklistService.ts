/**
 * CHECKLIST SERVICE - Firebase Firestore
 * Maneja todas las operaciones de checklists en Firebase
 */

import { showError } from '../utils/toast';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  addDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ChecklistRegistro, Novedad, OrdenTrabajo } from '../types/checklist';

// ============================================================================
// COLECCIONES
// ============================================================================

const CHECKLISTS_COLLECTION = 'checklists';
const NOVEDADES_COLLECTION = 'novedades';
const ORDENES_TRABAJO_COLLECTION = 'ordenes_trabajo';
const ESTADISTICAS_UNIDADES_COLLECTION = 'estadisticas_unidades';

// ============================================================================
// FUNCIONES DE CHECKLISTS
// ============================================================================

/**
 * Guardar un checklist completo en Firestore
 */
export async function saveChecklist(checklist: ChecklistRegistro): Promise<string> {
  try {
    console.log('[ChecklistService] 🔄 Iniciando guardado de checklist:', checklist.id);
    console.log('[ChecklistService] 📊 Datos del checklist:', JSON.stringify(checklist, null, 2));

    // Función helper para reemplazar undefined por null
    const replaceUndefinedWithNull = (obj: any): any => {
      if (obj === null || obj === undefined) return null;
      if (obj instanceof Date) return obj;
      if (Array.isArray(obj)) return obj.map(replaceUndefinedWithNull);
      if (typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
          result[key] = replaceUndefinedWithNull(obj[key]);
        }
        return result;
      }
      return obj;
    };

    // Convertir Dates a Timestamps de Firestore
    const checklistData = {
      ...checklist,
      fecha: Timestamp.fromDate(checklist.fecha),
      timestamp: Timestamp.fromDate(checklist.timestamp),
      timestampCompletado: checklist.timestampCompletado
        ? Timestamp.fromDate(checklist.timestampCompletado)
        : null,
      odometroInicial: {
        ...checklist.odometroInicial,
        fecha_hora: Timestamp.fromDate(checklist.odometroInicial.fecha_hora),
        geolocalizacion: checklist.odometroInicial.geolocalizacion || null
      },
      odometroFinal: checklist.odometroFinal
        ? {
            ...checklist.odometroFinal,
            fecha_hora: Timestamp.fromDate(checklist.odometroFinal.fecha_hora),
            geolocalizacion: checklist.odometroFinal.geolocalizacion || null
          }
        : null,
      items: checklist.items.map(item => ({
        id: item.id,
        numero: item.numero,
        categoria: item.categoria,
        descripcion: item.descripcion,
        esCritico: item.esCritico,
        fotoRequerida: item.fotoRequerida || false,
        estado: item.estado,
        comentario: item.comentario || null,
        fotoUrl: item.fotoUrl || null,
        fotosEvidencia: item.fotosEvidencia || [],
        timestamp: item.timestamp ? Timestamp.fromDate(item.timestamp) : null
      })),
      cisterna: checklist.cisterna || null,
      firmaChofer: checklist.firmaChofer || null,
      geolocalizacion: checklist.geolocalizacion || null
    };

    // Limpiar todos los undefined que puedan quedar
    const cleanedData = replaceUndefinedWithNull(checklistData);

    console.log('[ChecklistService] 🧹 Datos limpios (sin undefined):', JSON.stringify(cleanedData, null, 2));

    // Guardar en Firestore
    const checklistRef = doc(db, CHECKLISTS_COLLECTION, checklist.id);
    await setDoc(checklistRef, cleanedData);

    console.log('[ChecklistService] ✅ Checklist guardado exitosamente:', checklist.id);

    // Si hay ítems NO_CONFORME críticos, generar Órdenes de Trabajo
    if (checklist.itemsRechazados > 0) {
      await generarOrdenesTrabajoAutomaticas(checklist);
    }

    // Actualizar estadísticas de la unidad
    await actualizarEstadisticasUnidad(checklist);

    return checklist.id;
  } catch (error: any) {
    console.error('[ChecklistService] ❌ ERROR guardando checklist:', error);
    console.error('[ChecklistService] ❌ Error code:', error?.code);
    console.error('[ChecklistService] ❌ Error message:', error?.message);
    console.error('[ChecklistService] ❌ Error details:', JSON.stringify(error, null, 2));

    // Si es un error de permisos, dar mensaje específico
    if (error?.code === 'permission-denied') {
      showError('ERROR DE PERMISOS: Firebase Firestore está bloqueando el guardado. Actualiza las reglas de seguridad en Firebase Console.');
    }

    throw error;
  }
}

/**
 * Obtener un checklist por ID
 */
export async function getChecklistById(checklistId: string): Promise<ChecklistRegistro | null> {
  try {
    const checklistRef = doc(db, CHECKLISTS_COLLECTION, checklistId);
    const checklistSnap = await getDoc(checklistRef);

    if (!checklistSnap.exists()) {
      console.log('[ChecklistService] Checklist no encontrado:', checklistId);
      return null;
    }

    const data = checklistSnap.data();

    // Convertir Timestamps a Dates
    return {
      ...data,
      fecha: data.fecha.toDate(),
      timestamp: data.timestamp.toDate(),
      timestampCompletado: data.timestampCompletado ? data.timestampCompletado.toDate() : undefined,
      odometroInicial: {
        ...data.odometroInicial,
        fecha_hora: data.odometroInicial.fecha_hora.toDate()
      },
      odometroFinal: data.odometroFinal
        ? {
            ...data.odometroFinal,
            fecha_hora: data.odometroFinal.fecha_hora.toDate()
          }
        : undefined,
      items: data.items.map((item: any) => ({
        ...item,
        timestamp: item.timestamp ? item.timestamp.toDate() : undefined
      }))
    } as ChecklistRegistro;
  } catch (error) {
    console.error('[ChecklistService] Error obteniendo checklist:', error);
    throw error;
  }
}

/**
 * Obtener checklists por unidad
 */
export async function getChecklistsByUnidad(
  numeroUnidad: string,
  limitCount: number = 10
): Promise<ChecklistRegistro[]> {
  try {
    const checklistsRef = collection(db, CHECKLISTS_COLLECTION);
    const q = query(
      checklistsRef,
      where('unidad.numero', '==', numeroUnidad),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const checklists: ChecklistRegistro[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      checklists.push({
        ...data,
        fecha: data.fecha.toDate(),
        timestamp: data.timestamp.toDate(),
        timestampCompletado: data.timestampCompletado ? data.timestampCompletado.toDate() : undefined,
        odometroInicial: {
          ...data.odometroInicial,
          fecha_hora: data.odometroInicial.fecha_hora.toDate()
        },
        odometroFinal: data.odometroFinal
          ? {
              ...data.odometroFinal,
              fecha_hora: data.odometroFinal.fecha_hora.toDate()
            }
          : undefined,
        items: data.items.map((item: any) => ({
          ...item,
          timestamp: item.timestamp ? item.timestamp.toDate() : undefined
        }))
      } as ChecklistRegistro);
    });

    console.log(`[ChecklistService] ${checklists.length} checklists encontrados para unidad ${numeroUnidad}`);
    return checklists;
  } catch (error) {
    console.error('[ChecklistService] Error obteniendo checklists por unidad:', error);
    throw error;
  }
}

/**
 * Obtener checklists por sector
 */
export async function getChecklistsBySector(
  sector: 'vrac' | 'vital-aire',
  limitCount: number = 20
): Promise<ChecklistRegistro[]> {
  try {
    const checklistsRef = collection(db, CHECKLISTS_COLLECTION);
    const q = query(
      checklistsRef,
      where('sector', '==', sector),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const checklists: ChecklistRegistro[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      checklists.push({
        ...data,
        fecha: data.fecha.toDate(),
        timestamp: data.timestamp.toDate(),
        timestampCompletado: data.timestampCompletado ? data.timestampCompletado.toDate() : undefined,
        odometroInicial: {
          ...data.odometroInicial,
          fecha_hora: data.odometroInicial.fecha_hora.toDate()
        },
        items: data.items.map((item: any) => ({
          ...item,
          timestamp: item.timestamp ? item.timestamp.toDate() : undefined
        }))
      } as ChecklistRegistro);
    });

    console.log(`[ChecklistService] ${checklists.length} checklists encontrados para sector ${sector}`);
    return checklists;
  } catch (error) {
    console.error('[ChecklistService] Error obteniendo checklists por sector:', error);
    throw error;
  }
}

/**
 * Obtener checklists por fecha
 */
export async function getChecklistsByFecha(fecha: Date): Promise<ChecklistRegistro[]> {
  try {
    const startOfDay = new Date(fecha);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(fecha);
    endOfDay.setHours(23, 59, 59, 999);

    const checklistsRef = collection(db, CHECKLISTS_COLLECTION);
    const q = query(
      checklistsRef,
      where('fecha', '>=', Timestamp.fromDate(startOfDay)),
      where('fecha', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('fecha', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const checklists: ChecklistRegistro[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      checklists.push({
        ...data,
        fecha: data.fecha.toDate(),
        timestamp: data.timestamp.toDate(),
        timestampCompletado: data.timestampCompletado ? data.timestampCompletado.toDate() : undefined,
        odometroInicial: {
          ...data.odometroInicial,
          fecha_hora: data.odometroInicial.fecha_hora.toDate()
        },
        items: data.items.map((item: any) => ({
          ...item,
          timestamp: item.timestamp ? item.timestamp.toDate() : undefined
        }))
      } as ChecklistRegistro);
    });

    console.log(`[ChecklistService] ${checklists.length} checklists encontrados para fecha ${fecha.toLocaleDateString()}`);
    return checklists;
  } catch (error) {
    console.error('[ChecklistService] Error obteniendo checklists por fecha:', error);
    throw error;
  }
}

// ============================================================================
// FUNCIONES DE NOVEDADES
// ============================================================================

/**
 * Guardar una novedad
 */
export async function saveNovedad(novedad: Novedad): Promise<string> {
  try {
    const novedadData = {
      ...novedad,
      fecha: Timestamp.fromDate(novedad.fecha),
      timestamp: Timestamp.fromDate(novedad.timestamp),
      timestampResuelta: novedad.timestampResuelta
        ? Timestamp.fromDate(novedad.timestampResuelta)
        : null
    };

    const novedadRef = doc(db, NOVEDADES_COLLECTION, novedad.id);
    await setDoc(novedadRef, novedadData);

    console.log('[ChecklistService] Novedad guardada:', novedad.id);
    return novedad.id;
  } catch (error) {
    console.error('[ChecklistService] Error guardando novedad:', error);
    throw error;
  }
}

// ============================================================================
// FUNCIONES DE ÓRDENES DE TRABAJO
// ============================================================================

/**
 * Generar novedades desde checklist
 * NOTA: Creación automática de OTs desactivada - las OTs deben crearse manualmente desde Panel de Mantenimiento
 */
async function generarOrdenesTrabajoAutomaticas(checklist: ChecklistRegistro): Promise<void> {
  try {
    console.log('[ChecklistService] 🔍 Generando novedades desde checklist:', checklist.id);

    // 1. CREAR NOVEDADES para TODOS los ítems NO_CONFORME
    const itemsNoConformes = checklist.items.filter(item => item.estado === 'NO_CONFORME');
    console.log('[ChecklistService] 📋 Items NO_CONFORME encontrados:', itemsNoConformes.length);

    for (const item of itemsNoConformes) {
      const novedadId = `novedad_${Date.now()}_${item.id}`;

      const novedad: Novedad = {
        id: novedadId,
        checklistId: checklist.id,
        itemId: item.id,
        fecha: checklist.fecha,
        unidad: checklist.unidad,
        descripcion: item.descripcion,
        comentarioChofer: item.comentario || 'Sin comentarios adicionales',
        fotoUrl: item.fotoUrl,
        prioridad: item.esCritico ? 'ALTA' : 'MEDIA',
        estado: 'PENDIENTE',
        timestamp: new Date()
      };

      const novedadData = {
        ...novedad,
        fecha: Timestamp.fromDate(novedad.fecha),
        timestamp: Timestamp.fromDate(novedad.timestamp),
        fotoUrl: novedad.fotoUrl || null,
        ordenTrabajoId: null
      };

      const novedadRef = doc(db, NOVEDADES_COLLECTION, novedadId);
      await setDoc(novedadRef, novedadData);

      console.log('[ChecklistService] ✅ Novedad creada:', novedadId);

      // 2. Si el ítem es CRÍTICO, crear OT automáticamente
      // DESACTIVADO: Las OTs deben crearse manualmente desde Panel de Mantenimiento
      /*
      if (item.esCritico) {
        const ordenTrabajoId = `ot_${Date.now()}_${item.id}`;

        const ordenTrabajo: OrdenTrabajo = {
          id: ordenTrabajoId,
          numeroOT: Date.now(), // TODO: Implementar secuencia incremental
          novedadId: novedadId,
          checklistId: checklist.id,
          fecha: new Date(),
          fechaCreacion: new Date(),
          unidad: checklist.unidad,
          tipo: 'CORRECTIVO',
          descripcion: `${item.descripcion} - ${item.comentario || 'Sin detalles adicionales'}`,
          estado: 'PENDIENTE',
          prioridad: 'ALTA', // Todos los críticos son ALTA prioridad
          tipoMantenimiento: 'CORRECTIVO',
          timestamp: new Date()
        };

        const ordenTrabajoData = {
          ...ordenTrabajo,
          fecha: Timestamp.fromDate(ordenTrabajo.fecha),
          fechaCreacion: Timestamp.fromDate(ordenTrabajo.fechaCreacion),
          timestamp: Timestamp.fromDate(ordenTrabajo.timestamp)
        };

        const otRef = doc(db, ORDENES_TRABAJO_COLLECTION, ordenTrabajoId);
        await setDoc(otRef, ordenTrabajoData);

        console.log('[ChecklistService] ✅ OT automática creada:', ordenTrabajoId);

        // Actualizar novedad con el ID de la OT
        await updateDoc(novedadRef, {
          ordenTrabajoId: ordenTrabajoId,
          estado: 'EN_PROCESO'
        });

        console.log('[ChecklistService] ✅ Novedad vinculada a OT');
      }
      */
    }

    console.log('[ChecklistService] ✅ Proceso completado: Novedades generadas (OTs desactivadas - crear manualmente)');
  } catch (error) {
    console.error('[ChecklistService] ❌ Error generando novedades y órdenes de trabajo:', error);
  }
}

/**
 * Obtener órdenes de trabajo pendientes
 */
export async function getOrdenesTrabajoPendientes(limitCount: number = 20): Promise<OrdenTrabajo[]> {
  try {
    const otRef = collection(db, ORDENES_TRABAJO_COLLECTION);
    const q = query(
      otRef,
      where('estado', '==', 'PENDIENTE'),
      orderBy('prioridad', 'desc'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const ordenes: OrdenTrabajo[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      ordenes.push({
        ...data,
        fecha: data.fecha.toDate(),
        timestamp: data.timestamp.toDate(),
        fechaAsignacion: data.fechaAsignacion ? data.fechaAsignacion.toDate() : undefined,
        timestampCompletada: data.timestampCompletada ? data.timestampCompletada.toDate() : undefined
      } as OrdenTrabajo);
    });

    console.log(`[ChecklistService] ${ordenes.length} órdenes de trabajo pendientes`);
    return ordenes;
  } catch (error) {
    console.error('[ChecklistService] Error obteniendo órdenes de trabajo:', error);
    throw error;
  }
}

// ============================================================================
// FUNCIONES DE ESTADÍSTICAS
// ============================================================================

/**
 * Actualizar estadísticas de una unidad
 */
async function actualizarEstadisticasUnidad(checklist: ChecklistRegistro): Promise<void> {
  try {
    const estadisticasRef = doc(db, ESTADISTICAS_UNIDADES_COLLECTION, checklist.unidad.numero);
    const estadisticasSnap = await getDoc(estadisticasRef);

    let estadisticas: any;

    if (estadisticasSnap.exists()) {
      estadisticas = estadisticasSnap.data();
      estadisticas.totalChecklists += 1;
      if (checklist.resultado === 'APTO') {
        estadisticas.checklistsAptos += 1;
      } else {
        estadisticas.checklistsNoAptos += 1;
      }
      estadisticas.ultimoChecklist = Timestamp.fromDate(checklist.fecha);
      estadisticas.ultimoOdometro = {
        valor: checklist.odometroInicial.valor,
        fecha_hora: Timestamp.fromDate(checklist.odometroInicial.fecha_hora)
      };
    } else {
      // Primera vez
      estadisticas = {
        unidad: checklist.unidad,
        totalChecklists: 1,
        checklistsAptos: checklist.resultado === 'APTO' ? 1 : 0,
        checklistsNoAptos: checklist.resultado === 'NO_APTO' ? 1 : 0,
        totalNovedades: 0,
        novedadesPendientes: 0,
        novedadesResueltas: 0,
        totalOTs: 0,
        otsPendientes: 0,
        otsCompletadas: 0,
        kilometrajeTotal: checklist.odometroInicial.valor,
        ultimoOdometro: {
          valor: checklist.odometroInicial.valor,
          fecha_hora: Timestamp.fromDate(checklist.odometroInicial.fecha_hora)
        },
        ultimoChecklist: Timestamp.fromDate(checklist.fecha),
        diasSinInspeccion: 0
      };
    }

    await setDoc(estadisticasRef, estadisticas);
    console.log('[ChecklistService] Estadísticas actualizadas para unidad:', checklist.unidad.numero);
  } catch (error) {
    console.error('[ChecklistService] Error actualizando estadísticas:', error);
  }
}

/**
 * Obtener estadísticas de una unidad
 */
export async function getEstadisticasUnidad(numeroUnidad: string): Promise<any> {
  try {
    const estadisticasRef = doc(db, ESTADISTICAS_UNIDADES_COLLECTION, numeroUnidad);
    const estadisticasSnap = await getDoc(estadisticasRef);

    if (!estadisticasSnap.exists()) {
      return null;
    }

    const data = estadisticasSnap.data();
    return {
      ...data,
      ultimoChecklist: data.ultimoChecklist ? data.ultimoChecklist.toDate() : null,
      ultimoOdometro: data.ultimoOdometro
        ? {
            ...data.ultimoOdometro,
            fecha_hora: data.ultimoOdometro.fecha_hora.toDate()
          }
        : null
    };
  } catch (error) {
    console.error('[ChecklistService] Error obteniendo estadísticas:', error);
    throw error;
  }
}

// ============================================================================
// FUNCIONES DE CHECKLIST DISTRIBUCIÓN
// ============================================================================

/**
 * Verificar si ya existe un checklist para un HDR específico
 */
export async function checkChecklistExists(hdr: string): Promise<boolean> {
  try {
    const checklistRef = doc(db, 'checklists', `dist_${hdr}`);
    const checklistSnap = await getDoc(checklistRef);

    const exists = checklistSnap.exists();
    console.log('[ChecklistService] Checklist existe para HDR', hdr, ':', exists);

    return exists;
  } catch (error) {
    console.error('[ChecklistService] Error verificando checklist:', error);
    return false; // En caso de error, permitir continuar
  }
}

/**
 * Guardar checklist de distribución con HDR como clave
 */
export async function saveChecklistDistribucion(hdr: string, checklist: ChecklistRegistro): Promise<string> {
  try {
    console.log('[ChecklistService] 🔄 Guardando checklist distribución para HDR:', hdr);

    // Función helper para reemplazar undefined por null
    const replaceUndefinedWithNull = (obj: any): any => {
      if (obj === null || obj === undefined) return null;
      if (obj instanceof Date) return obj;
      if (Array.isArray(obj)) return obj.map(replaceUndefinedWithNull);
      if (typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
          result[key] = replaceUndefinedWithNull(obj[key]);
        }
        return result;
      }
      return obj;
    };

    // Convertir Dates a Timestamps de Firestore
    const checklistData = {
      ...checklist,
      hdr: hdr, // Añadir HDR al documento
      fecha: Timestamp.fromDate(checklist.fecha),
      timestamp: Timestamp.fromDate(checklist.timestamp),
      timestampCompletado: checklist.timestampCompletado
        ? Timestamp.fromDate(checklist.timestampCompletado)
        : null,
      odometroInicial: {
        ...checklist.odometroInicial,
        fecha_hora: Timestamp.fromDate(checklist.odometroInicial.fecha_hora),
        geolocalizacion: checklist.odometroInicial.geolocalizacion || null
      },
      odometroFinal: checklist.odometroFinal
        ? {
            ...checklist.odometroFinal,
            fecha_hora: Timestamp.fromDate(checklist.odometroFinal.fecha_hora),
            geolocalizacion: checklist.odometroFinal.geolocalizacion || null
          }
        : null,
      items: checklist.items.map(item => ({
        id: item.id,
        numero: item.numero,
        categoria: item.categoria,
        descripcion: item.descripcion,
        esCritico: item.esCritico,
        fotoRequerida: item.fotoRequerida || false,
        estado: item.estado,
        comentario: item.comentario || null,
        fotoUrl: item.fotoUrl || null,
        fotosEvidencia: item.fotosEvidencia || [],
        timestamp: item.timestamp ? Timestamp.fromDate(item.timestamp) : null
      })),
      cisterna: checklist.cisterna || null,
      firmaChofer: checklist.firmaChofer || null,
      geolocalizacion: checklist.geolocalizacion || null
    };

    // Limpiar todos los undefined que puedan quedar
    const cleanedData = replaceUndefinedWithNull(checklistData);

    // Guardar en Firestore usando HDR como document ID
    const checklistRef = doc(db, 'checklists', `dist_${hdr}`);
    await setDoc(checklistRef, cleanedData);

    console.log('[ChecklistService] ✅ Checklist distribución guardado para HDR:', hdr);

    // Si hay ítems NO_CONFORME críticos, generar novedades
    if (checklist.itemsRechazados > 0) {
      console.log('[ChecklistService] ⚠️ Checklist con items rechazados, generando novedades...');
      await generarNovedadesDistribucion(hdr, checklist);
    }

    return hdr;
  } catch (error: any) {
    console.error('[ChecklistService] ❌ ERROR guardando checklist distribución:', error);
    console.error('[ChecklistService] ❌ Error code:', error?.code);
    console.error('[ChecklistService] ❌ Error message:', error?.message);

    if (error?.code === 'permission-denied') {
      showError('ERROR DE PERMISOS: Firebase Firestore está bloqueando el guardado. Actualiza las reglas de seguridad en Firebase Console.');
    }

    throw error;
  }
}

/**
 * Generar novedades desde checklist de distribución
 */
async function generarNovedadesDistribucion(hdr: string, checklist: ChecklistRegistro): Promise<void> {
  try {
    console.log('[ChecklistService] 🔍 Generando novedades desde checklist distribución HDR:', hdr);

    const itemsNoConformes = checklist.items.filter(item => item.estado === 'NO_CONFORME');
    console.log('[ChecklistService] 📋 Items NO_CONFORME encontrados:', itemsNoConformes.length);

    for (const item of itemsNoConformes) {
      const novedadId = `novedad_dist_${Date.now()}_${item.id}`;

      const novedad: Novedad = {
        id: novedadId,
        checklistId: checklist.id,
        itemId: item.id,
        fecha: checklist.fecha,
        unidad: checklist.unidad,
        descripcion: `HDR ${hdr} - ${item.descripcion}`,
        comentarioChofer: item.comentario || 'Sin comentarios adicionales',
        fotoUrl: item.fotoUrl,
        prioridad: item.esCritico ? 'ALTA' : 'MEDIA',
        estado: 'PENDIENTE',
        timestamp: new Date()
      };

      const novedadData = {
        ...novedad,
        hdr: hdr, // Añadir HDR
        fecha: Timestamp.fromDate(novedad.fecha),
        timestamp: Timestamp.fromDate(novedad.timestamp),
        fotoUrl: novedad.fotoUrl || null,
        ordenTrabajoId: null
      };

      const novedadRef = doc(db, NOVEDADES_COLLECTION, novedadId);
      await setDoc(novedadRef, novedadData);

      console.log('[ChecklistService] ✅ Novedad distribución creada:', novedadId);
    }

    console.log('[ChecklistService] ✅ Novedades distribución generadas');
  } catch (error) {
    console.error('[ChecklistService] ❌ Error generando novedades distribución:', error);
  }
}
