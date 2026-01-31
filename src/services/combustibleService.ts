/**
 * COMBUSTIBLE SERVICE - Firebase Firestore
 * Maneja todas las operaciones de cargas de combustible en Firebase
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
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  CargaCombustible,
  ConsumoCombustible,
  AlertaCombustible
} from '../types/checklist';

// ============================================================================
// COLECCIONES
// ============================================================================

const CARGAS_COMBUSTIBLE_COLLECTION = 'cargas_combustible';
const CONSUMOS_CALCULADOS_COLLECTION = 'consumos_calculados';
const ALERTAS_COMBUSTIBLE_COLLECTION = 'alertas_combustible';

// ============================================================================
// FUNCIONES DE CARGAS DE COMBUSTIBLE
// ============================================================================

/**
 * Guardar una carga de combustible en Firestore
 */
export async function saveCargaCombustible(carga: Omit<CargaCombustible, 'id' | 'timestamp'>): Promise<string> {
  try {
    console.log('[CombustibleService] 🔄 Iniciando guardado de carga de combustible');
    console.log('[CombustibleService] 📊 Datos de la carga:', JSON.stringify(carga, null, 2));

    // Generar ID único
    const cargaId = `carga_${Date.now()}_${carga.unidad.numero}`;
    const timestamp = new Date();

    // Preparar datos para Firestore
    const cargaData = {
      id: cargaId,
      fecha: Timestamp.fromDate(carga.fecha),
      unidad: carga.unidad,
      kilometrajeActual: carga.kilometrajeActual,
      litrosCargados: carga.litrosCargados,
      tipoCombustible: carga.tipoCombustible,
      costoTotal: carga.costoTotal,
      estacionServicio: carga.estacionServicio || null,
      observaciones: carga.observaciones || null,
      operador: carga.operador,
      timestamp: Timestamp.fromDate(timestamp)
    };

    console.log('[CombustibleService] 🧹 Datos preparados para Firestore:', JSON.stringify(cargaData, null, 2));

    // Guardar en Firestore
    const cargaRef = doc(db, CARGAS_COMBUSTIBLE_COLLECTION, cargaId);
    await setDoc(cargaRef, cargaData);

    console.log('[CombustibleService] ✅ Carga de combustible guardada exitosamente:', cargaId);

    // Calcular consumo y actualizar estadísticas
    await calcularYActualizarConsumo(carga.unidad.numero);

    // Verificar si se debe generar alerta
    await verificarYGenerarAlerta(carga.unidad.numero);

    return cargaId;
  } catch (error: any) {
    console.error('[CombustibleService] ❌ ERROR guardando carga de combustible:', error);
    console.error('[CombustibleService] ❌ Error code:', error?.code);
    console.error('[CombustibleService] ❌ Error message:', error?.message);

    // Si es un error de permisos, dar mensaje específico
    if (error?.code === 'permission-denied') {
      showError('ERROR DE PERMISOS: Firebase Firestore está bloqueando el guardado. Actualiza las reglas de seguridad en Firebase Console para permitir escritura en cargas_combustible.');
    }

    throw error;
  }
}

/**
 * Obtener cargas de combustible por unidad
 */
export async function getCargasCombustibleByUnidad(
  numeroUnidad: string,
  limitCount: number = 10
): Promise<CargaCombustible[]> {
  try {
    const cargasRef = collection(db, CARGAS_COMBUSTIBLE_COLLECTION);
    const q = query(
      cargasRef,
      where('unidad.numero', '==', numeroUnidad),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const cargas: CargaCombustible[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      cargas.push({
        ...data,
        fecha: data.fecha.toDate(),
        timestamp: data.timestamp.toDate()
      } as CargaCombustible);
    });

    console.log(`[CombustibleService] ${cargas.length} cargas encontradas para unidad ${numeroUnidad}`);
    return cargas;
  } catch (error) {
    console.error('[CombustibleService] Error obteniendo cargas por unidad:', error);
    throw error;
  }
}

/**
 * Obtener todas las cargas de combustible (para admin)
 */
export async function getAllCargasCombustible(limitCount: number = 50): Promise<CargaCombustible[]> {
  try {
    const cargasRef = collection(db, CARGAS_COMBUSTIBLE_COLLECTION);
    const q = query(
      cargasRef,
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const cargas: CargaCombustible[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      cargas.push({
        ...data,
        fecha: data.fecha.toDate(),
        timestamp: data.timestamp.toDate()
      } as CargaCombustible);
    });

    console.log(`[CombustibleService] ${cargas.length} cargas encontradas en total`);
    return cargas;
  } catch (error) {
    console.error('[CombustibleService] Error obteniendo todas las cargas:', error);
    throw error;
  }
}

/**
 * Obtener última carga de una unidad
 */
export async function getUltimaCargaCombustible(numeroUnidad: string): Promise<CargaCombustible | null> {
  try {
    const cargasRef = collection(db, CARGAS_COMBUSTIBLE_COLLECTION);
    const q = query(
      cargasRef,
      where('unidad.numero', '==', numeroUnidad),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`[CombustibleService] No hay cargas previas para unidad ${numeroUnidad}`);
      return null;
    }

    const data = querySnapshot.docs[0].data();
    return {
      ...data,
      fecha: data.fecha.toDate(),
      timestamp: data.timestamp.toDate()
    } as CargaCombustible;
  } catch (error) {
    console.error('[CombustibleService] Error obteniendo última carga:', error);
    throw error;
  }
}

/**
 * Eliminar una carga de combustible
 */
export async function deleteCargaCombustible(cargaId: string): Promise<void> {
  try {
    console.log('[CombustibleService] 🗑️ Eliminando carga de combustible:', cargaId);

    const cargaRef = doc(db, CARGAS_COMBUSTIBLE_COLLECTION, cargaId);
    await deleteDoc(cargaRef);

    console.log('[CombustibleService] ✅ Carga eliminada exitosamente:', cargaId);
  } catch (error: any) {
    console.error('[CombustibleService] ❌ ERROR eliminando carga de combustible:', error);
    console.error('[CombustibleService] ❌ Error code:', error?.code);
    console.error('[CombustibleService] ❌ Error message:', error?.message);

    // Si es un error de permisos, dar mensaje específico
    if (error?.code === 'permission-denied') {
      showError('ERROR DE PERMISOS: Firebase Firestore está bloqueando la eliminación. Actualiza las reglas de seguridad en Firebase Console.');
    }

    throw error;
  }
}

// ============================================================================
// FUNCIONES DE CÁLCULO DE CONSUMO
// ============================================================================

/**
 * Calcular y actualizar consumo de combustible de una unidad
 */
async function calcularYActualizarConsumo(numeroUnidad: string): Promise<void> {
  try {
    console.log('[CombustibleService] 🧮 Calculando consumo para unidad:', numeroUnidad);

    // Obtener todas las cargas del mes actual
    const fechaActual = new Date();
    const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
    const ultimoDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0, 23, 59, 59);

    const cargasRef = collection(db, CARGAS_COMBUSTIBLE_COLLECTION);
    const q = query(
      cargasRef,
      where('unidad.numero', '==', numeroUnidad),
      where('timestamp', '>=', Timestamp.fromDate(primerDiaMes)),
      where('timestamp', '<=', Timestamp.fromDate(ultimoDiaMes)),
      orderBy('timestamp', 'asc')
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.size < 2) {
      console.log('[CombustibleService] No hay suficientes cargas para calcular consumo (se necesitan al menos 2)');
      return;
    }

    // Convertir a array y ordenar
    const cargas: CargaCombustible[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      cargas.push({
        ...data,
        fecha: data.fecha.toDate(),
        timestamp: data.timestamp.toDate()
      } as CargaCombustible);
    });

    // Calcular métricas
    const primeraKm = cargas[0].kilometrajeActual;
    const ultimaKm = cargas[cargas.length - 1].kilometrajeActual;
    const totalKilometros = ultimaKm - primeraKm;
    const totalLitros = cargas.reduce((sum, carga) => sum + carga.litrosCargados, 0);
    const totalCosto = cargas.reduce((sum, carga) => sum + carga.costoTotal, 0);
    const cantidadCargas = cargas.length;

    // Consumo promedio: (Total Litros / Total Kilómetros) × 100
    const consumoPromedio = totalKilometros > 0 ? (totalLitros / totalKilometros) * 100 : 0;
    const costoPorKm = totalKilometros > 0 ? totalCosto / totalKilometros : 0;

    // Calcular tendencia vs mes anterior
    const mesAnterior = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1);
    const ultimoDiaMesAnterior = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 0, 23, 59, 59);

    const consumoAnterior = await getConsumoMesAnterior(numeroUnidad, mesAnterior, ultimoDiaMesAnterior);
    const tendencia = consumoAnterior > 0
      ? ((consumoPromedio - consumoAnterior) / consumoAnterior) * 100
      : 0;

    // Calcular desviación vs promedio de flota
    const promedioFlota = await getConsumoPromedioFlota();
    const desviacionPromedio = promedioFlota > 0
      ? ((consumoPromedio - promedioFlota) / promedioFlota) * 100
      : 0;

    // Crear objeto de consumo
    const mesString = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;
    const consumoId = `consumo_${numeroUnidad}_${mesString}`;

    const consumo: Omit<ConsumoCombustible, 'timestamp' | 'ultimaActualizacion'> = {
      id: consumoId,
      unidad: cargas[0].unidad,
      mes: mesString,
      consumoPromedio,
      totalLitros,
      totalKilometros,
      totalCosto,
      cantidadCargas,
      costoPorKm,
      tendencia,
      desviacionPromedio
    };

    const consumoData = {
      ...consumo,
      timestamp: Timestamp.fromDate(new Date()),
      ultimaActualizacion: Timestamp.fromDate(new Date())
    };

    const consumoRef = doc(db, CONSUMOS_CALCULADOS_COLLECTION, consumoId);
    await setDoc(consumoRef, consumoData);

    console.log('[CombustibleService] ✅ Consumo calculado y guardado:', consumoId);
    console.log('[CombustibleService] 📊 Consumo promedio:', consumoPromedio.toFixed(2), 'L/100km');
  } catch (error) {
    console.error('[CombustibleService] Error calculando consumo:', error);
  }
}

/**
 * Obtener consumo del mes anterior
 */
async function getConsumoMesAnterior(
  numeroUnidad: string,
  primerDia: Date,
  ultimoDia: Date
): Promise<number> {
  try {
    const mesString = `${primerDia.getFullYear()}-${String(primerDia.getMonth() + 1).padStart(2, '0')}`;
    const consumoId = `consumo_${numeroUnidad}_${mesString}`;

    const consumoRef = doc(db, CONSUMOS_CALCULADOS_COLLECTION, consumoId);
    const consumoSnap = await getDoc(consumoRef);

    if (!consumoSnap.exists()) {
      return 0;
    }

    return consumoSnap.data().consumoPromedio || 0;
  } catch (error) {
    console.error('[CombustibleService] Error obteniendo consumo mes anterior:', error);
    return 0;
  }
}

/**
 * Obtener consumo promedio de toda la flota
 */
async function getConsumoPromedioFlota(): Promise<number> {
  try {
    const fechaActual = new Date();
    const mesString = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;

    const consumosRef = collection(db, CONSUMOS_CALCULADOS_COLLECTION);
    const q = query(
      consumosRef,
      where('mes', '==', mesString)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return 0;
    }

    let totalConsumo = 0;
    let count = 0;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      totalConsumo += data.consumoPromedio || 0;
      count++;
    });

    return count > 0 ? totalConsumo / count : 0;
  } catch (error) {
    console.error('[CombustibleService] Error obteniendo promedio de flota:', error);
    return 0;
  }
}

/**
 * Obtener consumo calculado de una unidad
 */
export async function getConsumoUnidad(numeroUnidad: string, mes?: string): Promise<ConsumoCombustible | null> {
  try {
    const fechaActual = new Date();
    const mesString = mes || `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;
    const consumoId = `consumo_${numeroUnidad}_${mesString}`;

    const consumoRef = doc(db, CONSUMOS_CALCULADOS_COLLECTION, consumoId);
    const consumoSnap = await getDoc(consumoRef);

    if (!consumoSnap.exists()) {
      return null;
    }

    const data = consumoSnap.data();
    return {
      ...data,
      timestamp: data.timestamp.toDate(),
      ultimaActualizacion: data.ultimaActualizacion.toDate()
    } as ConsumoCombustible;
  } catch (error) {
    console.error('[CombustibleService] Error obteniendo consumo de unidad:', error);
    return null;
  }
}

// ============================================================================
// FUNCIONES DE ALERTAS
// ============================================================================

/**
 * Verificar y generar alerta si el consumo es anormal
 */
async function verificarYGenerarAlerta(numeroUnidad: string): Promise<void> {
  try {
    console.log('[CombustibleService] 🔍 Verificando si se debe generar alerta para:', numeroUnidad);

    // Obtener consumo actual
    const consumoActual = await getConsumoUnidad(numeroUnidad);

    if (!consumoActual) {
      console.log('[CombustibleService] No hay consumo calculado aún');
      return;
    }

    // Obtener promedio de flota
    const promedioFlota = await getConsumoPromedioFlota();

    if (promedioFlota === 0) {
      console.log('[CombustibleService] No hay promedio de flota calculado aún');
      return;
    }

    const diferenciaPorcentual = ((consumoActual.consumoPromedio - promedioFlota) / promedioFlota) * 100;
    const UMBRAL_ALTO = 15; // +15% sobre promedio
    const UMBRAL_BAJO = -15; // -15% bajo promedio (mejora)

    let tipoAlerta: AlertaCombustible['tipo'] | null = null;
    let severidad: AlertaCombustible['severidad'] = 'BAJA';
    let mensaje = '';

    // Detectar consumo alto (ALERTA)
    if (diferenciaPorcentual > UMBRAL_ALTO) {
      tipoAlerta = 'CONSUMO_ALTO';
      severidad = diferenciaPorcentual > 25 ? 'ALTA' : 'MEDIA';
      mensaje = `La unidad ${numeroUnidad} tiene un consumo ${diferenciaPorcentual.toFixed(1)}% superior al promedio de la flota. Revisar posibles causas.`;
    }
    // Detectar mejora significativa (INFORMATIVO)
    else if (diferenciaPorcentual < UMBRAL_BAJO) {
      tipoAlerta = 'MEJORA_SIGNIFICATIVA';
      severidad = 'BAJA';
      mensaje = `La unidad ${numeroUnidad} tiene un consumo ${Math.abs(diferenciaPorcentual).toFixed(1)}% inferior al promedio de la flota. ¡Excelente rendimiento!`;
    }

    // Solo generar alerta si detectamos algo
    if (tipoAlerta) {
      const alertaId = `alerta_${Date.now()}_${numeroUnidad}`;

      const alerta: Omit<AlertaCombustible, 'timestamp'> = {
        id: alertaId,
        unidad: consumoActual.unidad,
        tipo: tipoAlerta,
        severidad,
        mensaje,
        consumoActual: consumoActual.consumoPromedio,
        consumoEsperado: promedioFlota,
        diferenciaPorcentual,
        fechaDeteccion: new Date(),
        estado: 'ACTIVA'
      };

      const alertaData = {
        ...alerta,
        fechaDeteccion: Timestamp.fromDate(alerta.fechaDeteccion),
        timestamp: Timestamp.fromDate(new Date())
      };

      const alertaRef = doc(db, ALERTAS_COMBUSTIBLE_COLLECTION, alertaId);
      await setDoc(alertaRef, alertaData);

      console.log('[CombustibleService] ✅ Alerta generada:', alertaId);
      console.log('[CombustibleService] ⚠️ Tipo:', tipoAlerta, '- Severidad:', severidad);
    } else {
      console.log('[CombustibleService] ✅ Consumo dentro del rango normal');
    }
  } catch (error) {
    console.error('[CombustibleService] Error verificando alertas:', error);
  }
}

/**
 * Obtener alertas activas
 */
export async function getAlertasActivas(limitCount: number = 20): Promise<AlertaCombustible[]> {
  try {
    const alertasRef = collection(db, ALERTAS_COMBUSTIBLE_COLLECTION);
    const q = query(
      alertasRef,
      where('estado', '==', 'ACTIVA'),
      orderBy('severidad', 'desc'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const alertas: AlertaCombustible[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      alertas.push({
        ...data,
        fechaDeteccion: data.fechaDeteccion.toDate(),
        timestamp: data.timestamp.toDate()
      } as AlertaCombustible);
    });

    console.log(`[CombustibleService] ${alertas.length} alertas activas encontradas`);
    return alertas;
  } catch (error) {
    console.error('[CombustibleService] Error obteniendo alertas activas:', error);
    throw error;
  }
}

/**
 * Obtener alertas por unidad
 */
export async function getAlertasByUnidad(numeroUnidad: string): Promise<AlertaCombustible[]> {
  try {
    const alertasRef = collection(db, ALERTAS_COMBUSTIBLE_COLLECTION);
    const q = query(
      alertasRef,
      where('unidad.numero', '==', numeroUnidad),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const querySnapshot = await getDocs(q);
    const alertas: AlertaCombustible[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      alertas.push({
        ...data,
        fechaDeteccion: data.fechaDeteccion.toDate(),
        timestamp: data.timestamp.toDate()
      } as AlertaCombustible);
    });

    return alertas;
  } catch (error) {
    console.error('[CombustibleService] Error obteniendo alertas por unidad:', error);
    throw error;
  }
}
