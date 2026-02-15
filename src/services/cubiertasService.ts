/**
 * SERVICIO CONTROL DE CUBIERTAS
 * Lógica de negocio y operaciones Firestore para gestión de neumáticos
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  TipoVehiculo,
  ConfiguracionVehiculo,
  PosicionCubierta,
  Cubierta,
  MedicionCubierta,
  MovimientoCubierta,
  RecapadoCubierta,
  EstadoCubiertasUnidad,
  CubiertaEnPosicion,
  AuxilioSlot,
  AlertaCubierta,
  ResumenFlotaCubiertas,
  UnidadConfiguracion,
  MotivoRetiro,
  DestinoRetiro,
} from '../types/cubiertas';
import {
  calcularEstadoDesgaste,
  CONFIG_CUBIERTAS,
} from '../types/cubiertas';

// ============================================
// COLECCIONES FIRESTORE
// ============================================

const COLECCIONES = {
  CUBIERTAS: 'cubiertas',
  MEDICIONES: 'mediciones_cubiertas',
  MOVIMIENTOS: 'movimientos_cubiertas',
  RECAPADOS: 'recapados_cubiertas',
  ESTADO_UNIDADES: 'estado_cubiertas_unidades',
};

// ============================================
// CONFIGURACIONES DE VEHÍCULOS
// ============================================

// Genera posiciones para vehículo de 2 ejes (6 cubiertas)
function generarPosiciones2Ejes(): PosicionCubierta[] {
  return [
    // Eje 1 - Dirección (simple, solo lineal)
    { id: 'E1_IZQ', numero: 1, eje: 1, lado: 'IZQ', tipo: 'SIMPLE', soloLineal: true, label: 'Eje 1 - Izquierdo' },
    { id: 'E1_DER', numero: 2, eje: 1, lado: 'DER', tipo: 'SIMPLE', soloLineal: true, label: 'Eje 1 - Derecho' },
    // Eje 2 - Tracción (dual)
    { id: 'E2_IZQ_EXT', numero: 3, eje: 2, lado: 'IZQ', tipo: 'DUAL_EXT', soloLineal: false, label: 'Eje 2 - Izq Exterior' },
    { id: 'E2_IZQ_INT', numero: 4, eje: 2, lado: 'IZQ', tipo: 'DUAL_INT', soloLineal: false, label: 'Eje 2 - Izq Interior' },
    { id: 'E2_DER_INT', numero: 5, eje: 2, lado: 'DER', tipo: 'DUAL_INT', soloLineal: false, label: 'Eje 2 - Der Interior' },
    { id: 'E2_DER_EXT', numero: 6, eje: 2, lado: 'DER', tipo: 'DUAL_EXT', soloLineal: false, label: 'Eje 2 - Der Exterior' },
  ];
}

// Genera posiciones para vehículo de 3 ejes (10 cubiertas - balancín/tractor/cisterna)
function generarPosiciones3Ejes10Cubiertas(): PosicionCubierta[] {
  return [
    // Eje 1 - Dirección (simple, solo lineal)
    { id: 'E1_IZQ', numero: 1, eje: 1, lado: 'IZQ', tipo: 'SIMPLE', soloLineal: true, label: 'Eje 1 - Izquierdo' },
    { id: 'E1_DER', numero: 2, eje: 1, lado: 'DER', tipo: 'SIMPLE', soloLineal: true, label: 'Eje 1 - Derecho' },
    // Eje 2 - Tracción (dual)
    { id: 'E2_IZQ_EXT', numero: 3, eje: 2, lado: 'IZQ', tipo: 'DUAL_EXT', soloLineal: false, label: 'Eje 2 - Izq Exterior' },
    { id: 'E2_IZQ_INT', numero: 4, eje: 2, lado: 'IZQ', tipo: 'DUAL_INT', soloLineal: false, label: 'Eje 2 - Izq Interior' },
    { id: 'E2_DER_INT', numero: 5, eje: 2, lado: 'DER', tipo: 'DUAL_INT', soloLineal: false, label: 'Eje 2 - Der Interior' },
    { id: 'E2_DER_EXT', numero: 6, eje: 2, lado: 'DER', tipo: 'DUAL_EXT', soloLineal: false, label: 'Eje 2 - Der Exterior' },
    // Eje 3 - Tracción (dual)
    { id: 'E3_IZQ_EXT', numero: 7, eje: 3, lado: 'IZQ', tipo: 'DUAL_EXT', soloLineal: false, label: 'Eje 3 - Izq Exterior' },
    { id: 'E3_IZQ_INT', numero: 8, eje: 3, lado: 'IZQ', tipo: 'DUAL_INT', soloLineal: false, label: 'Eje 3 - Izq Interior' },
    { id: 'E3_DER_INT', numero: 9, eje: 3, lado: 'DER', tipo: 'DUAL_INT', soloLineal: false, label: 'Eje 3 - Der Interior' },
    { id: 'E3_DER_EXT', numero: 10, eje: 3, lado: 'DER', tipo: 'DUAL_EXT', soloLineal: false, label: 'Eje 3 - Der Exterior' },
  ];
}

// Genera posiciones para semiremolque de 3 ejes (12 cubiertas)
function generarPosicionesSemiremolque(): PosicionCubierta[] {
  return [
    // Eje 1 - Neumático automático (dual)
    { id: 'E1_IZQ_EXT', numero: 1, eje: 1, lado: 'IZQ', tipo: 'DUAL_EXT', soloLineal: false, esAutomatico: true, label: 'Eje 1 - Izq Exterior (Auto)' },
    { id: 'E1_IZQ_INT', numero: 2, eje: 1, lado: 'IZQ', tipo: 'DUAL_INT', soloLineal: false, esAutomatico: true, label: 'Eje 1 - Izq Interior (Auto)' },
    { id: 'E1_DER_INT', numero: 3, eje: 1, lado: 'DER', tipo: 'DUAL_INT', soloLineal: false, esAutomatico: true, label: 'Eje 1 - Der Interior (Auto)' },
    { id: 'E1_DER_EXT', numero: 4, eje: 1, lado: 'DER', tipo: 'DUAL_EXT', soloLineal: false, esAutomatico: true, label: 'Eje 1 - Der Exterior (Auto)' },
    // Eje 2 (dual)
    { id: 'E2_IZQ_EXT', numero: 5, eje: 2, lado: 'IZQ', tipo: 'DUAL_EXT', soloLineal: false, label: 'Eje 2 - Izq Exterior' },
    { id: 'E2_IZQ_INT', numero: 6, eje: 2, lado: 'IZQ', tipo: 'DUAL_INT', soloLineal: false, label: 'Eje 2 - Izq Interior' },
    { id: 'E2_DER_INT', numero: 7, eje: 2, lado: 'DER', tipo: 'DUAL_INT', soloLineal: false, label: 'Eje 2 - Der Interior' },
    { id: 'E2_DER_EXT', numero: 8, eje: 2, lado: 'DER', tipo: 'DUAL_EXT', soloLineal: false, label: 'Eje 2 - Der Exterior' },
    // Eje 3 (dual)
    { id: 'E3_IZQ_EXT', numero: 9, eje: 3, lado: 'IZQ', tipo: 'DUAL_EXT', soloLineal: false, label: 'Eje 3 - Izq Exterior' },
    { id: 'E3_IZQ_INT', numero: 10, eje: 3, lado: 'IZQ', tipo: 'DUAL_INT', soloLineal: false, label: 'Eje 3 - Izq Interior' },
    { id: 'E3_DER_INT', numero: 11, eje: 3, lado: 'DER', tipo: 'DUAL_INT', soloLineal: false, label: 'Eje 3 - Der Interior' },
    { id: 'E3_DER_EXT', numero: 12, eje: 3, lado: 'DER', tipo: 'DUAL_EXT', soloLineal: false, label: 'Eje 3 - Der Exterior' },
  ];
}

// Configuraciones de vehículos
export const CONFIGURACIONES_VEHICULOS: Record<TipoVehiculo, ConfiguracionVehiculo> = {
  CAMIONETA: {
    tipo: 'CAMIONETA',
    nombre: 'Camioneta',
    ejes: 2,
    cubiertas: 6,
    auxilios: 1,
    capacidadAuxilios: 1,
    posiciones: generarPosiciones2Ejes(),
  },
  CHASIS: {
    tipo: 'CHASIS',
    nombre: 'Chasis',
    ejes: 2,
    cubiertas: 6,
    auxilios: 1,
    capacidadAuxilios: 1,
    posiciones: generarPosiciones2Ejes(),
  },
  CHASIS_TRACTOR: {
    tipo: 'CHASIS_TRACTOR',
    nombre: 'Chasis-Tractor',
    ejes: 2,
    cubiertas: 6,
    auxilios: 1,
    capacidadAuxilios: 1,
    posiciones: generarPosiciones2Ejes(),
  },
  TRACTOR_2EJES: {
    tipo: 'TRACTOR_2EJES',
    nombre: 'Tractor 2 Ejes',
    ejes: 2,
    cubiertas: 6,
    auxilios: 0,
    capacidadAuxilios: 0,
    posiciones: generarPosiciones2Ejes(),
  },
  BALANCIN: {
    tipo: 'BALANCIN',
    nombre: 'Balancín',
    ejes: 3,
    cubiertas: 10,
    auxilios: 1,
    capacidadAuxilios: 1,
    posiciones: generarPosiciones3Ejes10Cubiertas(),
  },
  TRACTOR_3EJES: {
    tipo: 'TRACTOR_3EJES',
    nombre: 'Tractor 3 Ejes',
    ejes: 3,
    cubiertas: 10,
    auxilios: 0,
    capacidadAuxilios: 0,
    posiciones: generarPosiciones3Ejes10Cubiertas(),
  },
  CISTERNA: {
    tipo: 'CISTERNA',
    nombre: 'Cisterna',
    ejes: 3,
    cubiertas: 10,
    auxilios: 1,
    capacidadAuxilios: 1,
    posiciones: generarPosiciones3Ejes10Cubiertas(),
  },
  SEMIREMOLQUE_12: {
    tipo: 'SEMIREMOLQUE_12',
    nombre: 'Semiremolque',
    ejes: 3,
    cubiertas: 12,
    auxilios: 1,
    capacidadAuxilios: 2,
    posiciones: generarPosicionesSemiremolque(),
  },
};

// ============================================
// MAPEO DE UNIDADES A TIPOS DE VEHÍCULO
// ============================================

export const UNIDADES_CONFIG: UnidadConfiguracion[] = [
  // DISTRIBUCIÓN - Camionetas
  { numero: '817', patente: 'AH506ID', tipoVehiculo: 'CAMIONETA', sector: 'distribucion' },
  { numero: '54', patente: 'HPD893', tipoVehiculo: 'CAMIONETA', sector: 'distribucion' },
  { numero: '816', patente: 'AH506IC', tipoVehiculo: 'CAMIONETA', sector: 'distribucion' },

  // DISTRIBUCIÓN - Chasis
  { numero: '64', patente: 'MGY394', tipoVehiculo: 'CHASIS', sector: 'distribucion' },

  // DISTRIBUCIÓN - Chasis-Tractor (con enganche)
  { numero: '46', patente: 'NBJ986', tipoVehiculo: 'CHASIS_TRACTOR', sector: 'distribucion', enganchaCon: '61' },

  // DISTRIBUCIÓN - Balancín
  { numero: '813', patente: 'AE906WF', tipoVehiculo: 'BALANCIN', sector: 'distribucion' },

  // DISTRIBUCIÓN - Tractores
  { numero: '45', patente: 'LYG959', tipoVehiculo: 'TRACTOR_3EJES', sector: 'distribucion' },
  { numero: '41', patente: 'AB152AZ', tipoVehiculo: 'TRACTOR_3EJES', sector: 'distribucion' },

  // DISTRIBUCIÓN - Semiremolques
  { numero: '803', patente: 'SEMI-803', tipoVehiculo: 'SEMIREMOLQUE_12', sector: 'distribucion' },
  { numero: '818', patente: 'SEMI-818', tipoVehiculo: 'SEMIREMOLQUE_12', sector: 'distribucion' },

  // VRAC - Tractores (todos 3 ejes)
  { numero: '40', patente: 'AB934JF', tipoVehiculo: 'TRACTOR_3EJES', sector: 'vrac' },
  { numero: '48', patente: 'AC531CX', tipoVehiculo: 'TRACTOR_3EJES', sector: 'vrac' },
  { numero: '50', patente: 'AD611OK', tipoVehiculo: 'TRACTOR_3EJES', sector: 'vrac' },
  { numero: '802', patente: 'AE069SN', tipoVehiculo: 'TRACTOR_3EJES', sector: 'vrac' },
  { numero: '805', patente: 'AE936JF', tipoVehiculo: 'TRACTOR_3EJES', sector: 'vrac' },
  { numero: '806', patente: 'AF254MJ', tipoVehiculo: 'TRACTOR_3EJES', sector: 'vrac' },
  { numero: '810', patente: 'AF894TS', tipoVehiculo: 'TRACTOR_3EJES', sector: 'vrac' },
  { numero: '812', patente: 'AG835OX', tipoVehiculo: 'TRACTOR_3EJES', sector: 'vrac' },
  { numero: '814', patente: 'AG994AW', tipoVehiculo: 'TRACTOR_3EJES', sector: 'vrac' },
  { numero: '815', patente: 'AH676AV', tipoVehiculo: 'TRACTOR_3EJES', sector: 'vrac' },

  // VRAC - Cisternas (todas 3 ejes, 10 cubiertas)
  { numero: '532', patente: 'STF788', tipoVehiculo: 'CISTERNA', sector: 'vrac' },
  { numero: '535', patente: 'STF787', tipoVehiculo: 'CISTERNA', sector: 'vrac' },
  { numero: '537', patente: 'SMZ040', tipoVehiculo: 'CISTERNA', sector: 'vrac' },
  { numero: '548', patente: 'SJU171', tipoVehiculo: 'CISTERNA', sector: 'vrac' },
  { numero: '552', patente: 'BML932', tipoVehiculo: 'CISTERNA', sector: 'vrac' },
  { numero: '603', patente: 'FQQ503', tipoVehiculo: 'CISTERNA', sector: 'vrac' },
  { numero: '703', patente: 'CLD321', tipoVehiculo: 'CISTERNA', sector: 'vrac' },
  { numero: '711', patente: 'PKY856', tipoVehiculo: 'CISTERNA', sector: 'vrac' },
  { numero: '712', patente: 'PKY880', tipoVehiculo: 'CISTERNA', sector: 'vrac' },
  { numero: '715', patente: 'AD179PC', tipoVehiculo: 'CISTERNA', sector: 'vrac' },
  { numero: '721', patente: 'AG831SJ', tipoVehiculo: 'CISTERNA', sector: 'vrac' },
];

// ============================================
// FUNCIONES DE CONFIGURACIÓN
// ============================================

/**
 * Obtiene la configuración de vehículo según el número de unidad
 */
export function obtenerConfiguracionVehiculo(unidadNumero: string): ConfiguracionVehiculo | null {
  const unidad = UNIDADES_CONFIG.find(u => u.numero === unidadNumero);
  if (!unidad) {
    console.warn(`[CubiertasService] Unidad ${unidadNumero} no encontrada en configuración`);
    return null;
  }
  return CONFIGURACIONES_VEHICULOS[unidad.tipoVehiculo];
}

/**
 * Obtiene los datos de una unidad
 */
export function obtenerDatosUnidad(unidadNumero: string): UnidadConfiguracion | null {
  return UNIDADES_CONFIG.find(u => u.numero === unidadNumero) || null;
}

/**
 * Obtiene todas las unidades de un sector
 */
export function obtenerUnidadesPorSector(sector: 'distribucion' | 'vrac' | 'vital-aire'): UnidadConfiguracion[] {
  return UNIDADES_CONFIG.filter(u => u.sector === sector);
}

// ============================================
// FUNCIONES FIRESTORE - CUBIERTAS
// ============================================

/**
 * Obtiene una cubierta por ID
 */
export async function obtenerCubierta(cubiertaId: string): Promise<Cubierta | null> {
  try {
    const docRef = doc(db, COLECCIONES.CUBIERTAS, cubiertaId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      fechaAlta: data.fechaAlta?.toDate?.() || new Date(),
      ultimaActualizacion: data.ultimaActualizacion?.toDate?.() || new Date(),
      ultimaMedicionFecha: data.ultimaMedicionFecha?.toDate?.() || undefined,
    } as Cubierta;
  } catch (error) {
    console.error('[CubiertasService] Error obteniendo cubierta:', error);
    return null;
  }
}

/**
 * Obtiene todas las cubiertas de una unidad
 */
export async function obtenerCubiertasUnidad(unidadNumero: string): Promise<Cubierta[]> {
  try {
    const q = query(
      collection(db, COLECCIONES.CUBIERTAS),
      where('unidadNumero', '==', unidadNumero),
      where('estado', 'in', ['EN_USO', 'AUXILIO'])
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        fechaAlta: data.fechaAlta?.toDate?.() || new Date(),
        ultimaActualizacion: data.ultimaActualizacion?.toDate?.() || new Date(),
        ultimaMedicionFecha: data.ultimaMedicionFecha?.toDate?.() || undefined,
      } as Cubierta;
    });
  } catch (error) {
    console.error('[CubiertasService] Error obteniendo cubiertas de unidad:', error);
    return [];
  }
}

/**
 * Guarda o actualiza una cubierta
 */
export async function guardarCubierta(cubierta: Partial<Cubierta> & { id: string }): Promise<boolean> {
  try {
    const docRef = doc(db, COLECCIONES.CUBIERTAS, cubierta.id);
    await setDoc(docRef, {
      ...cubierta,
      fechaAlta: cubierta.fechaAlta ? Timestamp.fromDate(cubierta.fechaAlta) : serverTimestamp(),
      ultimaActualizacion: serverTimestamp(),
      ultimaMedicionFecha: cubierta.ultimaMedicionFecha
        ? Timestamp.fromDate(cubierta.ultimaMedicionFecha)
        : null,
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('[CubiertasService] Error guardando cubierta:', error);
    return false;
  }
}

/**
 * Obtiene cubiertas disponibles en depósito (no instaladas en vehículos)
 */
export async function obtenerCubiertasDisponibles(): Promise<Cubierta[]> {
  try {
    // Cubiertas que no están asignadas a ninguna unidad y están disponibles
    const q = query(
      collection(db, COLECCIONES.CUBIERTAS),
      where('estado', 'in', ['NUEVA', 'RECAPADA'])
    );
    const snapshot = await getDocs(q);

    const cubiertas = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          fechaAlta: data.fechaAlta?.toDate?.() || new Date(),
          ultimaActualizacion: data.ultimaActualizacion?.toDate?.() || new Date(),
          ultimaMedicionFecha: data.ultimaMedicionFecha?.toDate?.() || undefined,
        } as Cubierta;
      })
      // Filtrar las que no tienen unidadId (están en depósito)
      .filter(c => !c.unidadId);

    console.log('[CubiertasService] Cubiertas disponibles:', cubiertas.length);
    return cubiertas;
  } catch (error) {
    console.error('[CubiertasService] Error obteniendo cubiertas disponibles:', error);
    return [];
  }
}

/**
 * Crea una nueva cubierta en el inventario
 */
export async function crearCubierta(cubierta: Omit<Cubierta, 'id'>): Promise<string | null> {
  try {
    const cubiertaId = `cub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('[CubiertasService] Intentando crear cubierta:', cubiertaId, cubierta.codigo);

    const docRef = doc(db, COLECCIONES.CUBIERTAS, cubiertaId);

    // Firestore no acepta undefined, usar null o no incluir el campo
    const datosAGuardar: Record<string, unknown> = {
      id: cubiertaId,
      codigo: cubierta.codigo,
      marca: cubierta.marca,
      modelo: cubierta.modelo || '',
      medida: cubierta.medida,
      tipo: cubierta.tipo,
      tipoUso: cubierta.tipoUso || 'MIXTA', // DIRECCIONAL, TRACCION, LIBRE, MIXTA
      estado: cubierta.estado,
      kmTotales: cubierta.kmTotales || 0,
      recapados: cubierta.recapados || 0,
      fechaAlta: Timestamp.fromDate(cubierta.fechaAlta || new Date()),
      ultimaActualizacion: serverTimestamp(),
    };

    // Solo agregar campos opcionales si tienen valor
    if (cubierta.dot) {
      datosAGuardar.dot = cubierta.dot;
    }
    if (cubierta.ultimaProfundidadMm !== undefined) {
      datosAGuardar.ultimaProfundidadMm = cubierta.ultimaProfundidadMm;
    }
    if (cubierta.ultimaMedicionFecha) {
      datosAGuardar.ultimaMedicionFecha = Timestamp.fromDate(cubierta.ultimaMedicionFecha);
    }

    console.log('[CubiertasService] Datos a guardar:', datosAGuardar);

    await setDoc(docRef, datosAGuardar);

    console.log('[CubiertasService] ✅ Cubierta creada exitosamente:', cubiertaId, cubierta.codigo);
    return cubiertaId;
  } catch (error: unknown) {
    console.error('[CubiertasService] ❌ Error creando cubierta:', error);
    if (error instanceof Error) {
      console.error('[CubiertasService] Mensaje:', error.message);
    }
    return null;
  }
}

/**
 * Instala una cubierta del stock en una posición de un vehículo
 */
export async function instalarCubierta(datos: {
  cubiertaId: string;
  cubiertaCodigo: string;
  unidadId: string;
  unidadNumero: string;
  posicion: string;
  fecha: Date;
  kmUnidad: number;
  tecnico: string;
  observaciones?: string;
}): Promise<string | null> {
  try {
    // 1. Registrar el movimiento de instalación
    const movimientoId = `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const movimientoRef = doc(db, COLECCIONES.MOVIMIENTOS, movimientoId);

    await setDoc(movimientoRef, {
      id: movimientoId,
      cubiertaId: datos.cubiertaId,
      cubiertaCodigo: datos.cubiertaCodigo,
      tipo: 'INSTALACION',
      unidadId: datos.unidadId,
      unidadNumero: datos.unidadNumero,
      posicion: datos.posicion,
      fecha: Timestamp.fromDate(datos.fecha),
      kmUnidad: datos.kmUnidad,
      tecnico: datos.tecnico,
      observaciones: datos.observaciones || null,
      timestamp: serverTimestamp(),
    });

    // 2. Actualizar la cubierta con su nueva ubicación
    const cubiertaRef = doc(db, COLECCIONES.CUBIERTAS, datos.cubiertaId);
    await updateDoc(cubiertaRef, {
      unidadId: datos.unidadId,
      unidadNumero: datos.unidadNumero,
      posicion: datos.posicion,
      estado: datos.posicion.startsWith('AUXILIO') ? 'AUXILIO' : 'EN_USO',
      kmInstalacion: datos.kmUnidad,
      fechaInstalacion: Timestamp.fromDate(datos.fecha),
      ultimaActualizacion: serverTimestamp(),
    });

    console.log('[CubiertasService] Cubierta instalada:', datos.cubiertaCodigo, 'en', datos.unidadNumero, datos.posicion);
    return movimientoId;
  } catch (error) {
    console.error('[CubiertasService] Error instalando cubierta:', error);
    return null;
  }
}

// ============================================
// FUNCIONES FIRESTORE - MEDICIONES
// ============================================

/**
 * Registra una nueva medición de cubierta
 */
export async function registrarMedicion(medicion: Omit<MedicionCubierta, 'id' | 'timestamp'>): Promise<string | null> {
  try {
    const medicionId = `med_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('[CubiertasService] Registrando medición:', medicionId, 'profundidad:', medicion.profundidadMm);

    const docRef = doc(db, COLECCIONES.MEDICIONES, medicionId);

    const estadoDesgaste = calcularEstadoDesgaste(medicion.profundidadMm);

    // Construir objeto sin undefined (Firestore no los acepta)
    const datosAGuardar: Record<string, unknown> = {
      id: medicionId,
      cubiertaId: medicion.cubiertaId,
      cubiertaCodigo: medicion.cubiertaCodigo,
      unidadId: medicion.unidadId,
      unidadNumero: medicion.unidadNumero,
      posicion: medicion.posicion,
      fecha: Timestamp.fromDate(medicion.fecha),
      profundidadMm: medicion.profundidadMm,
      estadoDesgaste,
      tecnico: medicion.tecnico,
      observaciones: medicion.observaciones || '',
      timestamp: serverTimestamp(),
    };

    // Solo agregar presión si tiene valor
    if (medicion.presionBar !== null && medicion.presionBar !== undefined) {
      datosAGuardar.presionBar = medicion.presionBar;
    }

    await setDoc(docRef, datosAGuardar);

    // Actualizar última medición en la cubierta
    await updateDoc(doc(db, COLECCIONES.CUBIERTAS, medicion.cubiertaId), {
      ultimaProfundidadMm: medicion.profundidadMm,
      ultimaMedicionFecha: Timestamp.fromDate(medicion.fecha),
      ultimaActualizacion: serverTimestamp(),
    });

    console.log('[CubiertasService] ✅ Medición registrada:', medicionId, '- Nueva profundidad:', medicion.profundidadMm);
    return medicionId;
  } catch (error: unknown) {
    console.error('[CubiertasService] ❌ Error registrando medición:', error);
    if (error instanceof Error) {
      console.error('[CubiertasService] Mensaje:', error.message);
    }
    return null;
  }
}

/**
 * Obtiene el historial de mediciones de una cubierta
 */
export async function obtenerHistorialMediciones(cubiertaId: string, limite: number = 10): Promise<MedicionCubierta[]> {
  try {
    const q = query(
      collection(db, COLECCIONES.MEDICIONES),
      where('cubiertaId', '==', cubiertaId),
      orderBy('fecha', 'desc'),
      limit(limite)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        fecha: data.fecha?.toDate?.() || new Date(),
        timestamp: data.timestamp?.toDate?.() || new Date(),
      } as MedicionCubierta;
    });
  } catch (error) {
    console.error('[CubiertasService] Error obteniendo historial mediciones:', error);
    return [];
  }
}

// ============================================
// FUNCIONES FIRESTORE - MOVIMIENTOS
// ============================================

/**
 * Registra un movimiento de cubierta (instalación, retiro, rotación)
 */
export async function registrarMovimiento(movimiento: Omit<MovimientoCubierta, 'id' | 'timestamp'>): Promise<string | null> {
  try {
    const movimientoId = `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const docRef = doc(db, COLECCIONES.MOVIMIENTOS, movimientoId);

    await setDoc(docRef, {
      ...movimiento,
      id: movimientoId,
      fecha: Timestamp.fromDate(movimiento.fecha),
      timestamp: serverTimestamp(),
    });

    // Actualizar ubicación de la cubierta
    const cubiertaUpdate: Partial<Cubierta> = {
      ultimaActualizacion: new Date(),
    };

    if (movimiento.tipo === 'INSTALACION') {
      cubiertaUpdate.unidadId = movimiento.unidadId;
      cubiertaUpdate.unidadNumero = movimiento.unidadNumero;
      cubiertaUpdate.posicion = movimiento.posicion;
      cubiertaUpdate.estado = movimiento.posicion.startsWith('AUXILIO') ? 'AUXILIO' : 'EN_USO';
    } else if (movimiento.tipo === 'RETIRO') {
      cubiertaUpdate.unidadId = undefined;
      cubiertaUpdate.unidadNumero = undefined;
      cubiertaUpdate.posicion = undefined;
      if (movimiento.destinoRetiro === 'RECAPADO') {
        cubiertaUpdate.estado = 'EN_RECAPADO';
      } else if (movimiento.destinoRetiro === 'BAJA') {
        cubiertaUpdate.estado = 'BAJA';
      } else {
        cubiertaUpdate.estado = 'EN_STOCK';
      }
      // Sumar km recorridos
      if (movimiento.kmRecorridos) {
        const cubierta = await obtenerCubierta(movimiento.cubiertaId);
        if (cubierta) {
          cubiertaUpdate.kmTotales = (cubierta.kmTotales || 0) + movimiento.kmRecorridos;
        }
      }
    } else if (movimiento.tipo === 'ROTACION' && movimiento.posicionDestino) {
      cubiertaUpdate.posicion = movimiento.posicionDestino;
    }

    await updateDoc(doc(db, COLECCIONES.CUBIERTAS, movimiento.cubiertaId), {
      ...cubiertaUpdate,
      ultimaActualizacion: serverTimestamp(),
    });

    console.log('[CubiertasService] Movimiento registrado:', movimientoId);
    return movimientoId;
  } catch (error) {
    console.error('[CubiertasService] Error registrando movimiento:', error);
    return null;
  }
}

// ============================================
// FUNCIONES DE ESTADO
// ============================================

/**
 * Obtiene el estado completo de cubiertas de una unidad
 */
export async function obtenerEstadoCubiertasUnidad(unidadNumero: string): Promise<EstadoCubiertasUnidad | null> {
  try {
    const config = obtenerConfiguracionVehiculo(unidadNumero);
    const datosUnidad = obtenerDatosUnidad(unidadNumero);

    if (!config || !datosUnidad) {
      console.warn(`[CubiertasService] Config no encontrada para unidad ${unidadNumero}`);
      return null;
    }

    // Obtener cubiertas de la unidad
    const cubiertas = await obtenerCubiertasUnidad(unidadNumero);

    // Mapear cubiertas a posiciones
    const cubiertasEnPosicion: CubiertaEnPosicion[] = config.posiciones.map(posicion => {
      const cubierta = cubiertas.find(c => c.posicion === posicion.id) || null;
      let estadoDesgaste: CubiertaEnPosicion['estadoDesgaste'] = 'SIN_CUBIERTA';

      if (cubierta && cubierta.ultimaProfundidadMm !== undefined) {
        estadoDesgaste = calcularEstadoDesgaste(cubierta.ultimaProfundidadMm);
      }

      return {
        posicion,
        cubierta,
        estadoDesgaste,
      };
    });

    // Mapear auxilios
    const auxilios: AuxilioSlot[] = [];
    for (let i = 1; i <= config.capacidadAuxilios; i++) {
      const cubierta = cubiertas.find(c => c.posicion === `AUXILIO_${i}`) || null;
      auxilios.push({ slot: i, cubierta });
    }

    // Calcular alertas
    const alertasCriticas = cubiertasEnPosicion.filter(c => c.estadoDesgaste === 'CRITICO').length;
    const alertasRegulares = cubiertasEnPosicion.filter(c => c.estadoDesgaste === 'REGULAR').length;

    return {
      unidadId: `unidad_${unidadNumero}`,
      unidadNumero,
      unidadPatente: datosUnidad.patente,
      tipoVehiculo: datosUnidad.tipoVehiculo,
      configuracion: config,
      cubiertas: cubiertasEnPosicion,
      auxilios,
      totalCubiertas: config.cubiertas,
      cubiertasInstaladas: cubiertasEnPosicion.filter(c => c.cubierta !== null).length,
      alertasCriticas,
      alertasRegulares,
      ultimaActualizacion: new Date(),
    };
  } catch (error) {
    console.error('[CubiertasService] Error obteniendo estado cubiertas:', error);
    return null;
  }
}

/**
 * Obtiene las alertas de toda la flota
 */
export async function obtenerAlertasFlota(): Promise<AlertaCubierta[]> {
  try {
    const alertas: AlertaCubierta[] = [];

    // Obtener todas las cubiertas en uso con mediciones críticas
    const q = query(
      collection(db, COLECCIONES.CUBIERTAS),
      where('estado', '==', 'EN_USO')
    );
    const snapshot = await getDocs(q);

    const ahora = new Date();

    snapshot.docs.forEach(doc => {
      const cubierta = doc.data() as Cubierta;

      // Alerta por desgaste crítico
      if (cubierta.ultimaProfundidadMm !== undefined && cubierta.ultimaProfundidadMm < CONFIG_CUBIERTAS.UMBRAL_CRITICO) {
        alertas.push({
          id: `alerta_critico_${cubierta.id}`,
          cubiertaId: cubierta.id,
          cubiertaCodigo: cubierta.codigo,
          unidadId: cubierta.unidadId || '',
          unidadNumero: cubierta.unidadNumero || '',
          posicion: cubierta.posicion || '',
          tipo: 'DESGASTE_CRITICO',
          mensaje: `Cubierta ${cubierta.codigo} en estado crítico (${cubierta.ultimaProfundidadMm}mm)`,
          profundidadMm: cubierta.ultimaProfundidadMm,
          prioridad: 'ALTA',
          timestamp: ahora,
        });
      }
      // Alerta por desgaste regular
      else if (cubierta.ultimaProfundidadMm !== undefined &&
        cubierta.ultimaProfundidadMm < CONFIG_CUBIERTAS.UMBRAL_BUENO) {
        alertas.push({
          id: `alerta_regular_${cubierta.id}`,
          cubiertaId: cubierta.id,
          cubiertaCodigo: cubierta.codigo,
          unidadId: cubierta.unidadId || '',
          unidadNumero: cubierta.unidadNumero || '',
          posicion: cubierta.posicion || '',
          tipo: 'DESGASTE_REGULAR',
          mensaje: `Cubierta ${cubierta.codigo} con desgaste regular (${cubierta.ultimaProfundidadMm}mm)`,
          profundidadMm: cubierta.ultimaProfundidadMm,
          prioridad: 'MEDIA',
          timestamp: ahora,
        });
      }

      // Alerta por sin medición reciente
      if (cubierta.ultimaMedicionFecha) {
        const diasSinMedicion = Math.floor(
          (ahora.getTime() - new Date(cubierta.ultimaMedicionFecha).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diasSinMedicion > CONFIG_CUBIERTAS.DIAS_SIN_MEDICION_ALERTA) {
          alertas.push({
            id: `alerta_sinmed_${cubierta.id}`,
            cubiertaId: cubierta.id,
            cubiertaCodigo: cubierta.codigo,
            unidadId: cubierta.unidadId || '',
            unidadNumero: cubierta.unidadNumero || '',
            posicion: cubierta.posicion || '',
            tipo: 'SIN_MEDICION',
            mensaje: `Cubierta ${cubierta.codigo} sin medición hace ${diasSinMedicion} días`,
            diasSinMedicion,
            prioridad: 'BAJA',
            timestamp: ahora,
          });
        }
      }
    });

    // Ordenar por prioridad
    const ordenPrioridad = { ALTA: 0, MEDIA: 1, BAJA: 2 };
    alertas.sort((a, b) => ordenPrioridad[a.prioridad] - ordenPrioridad[b.prioridad]);

    return alertas;
  } catch (error) {
    console.error('[CubiertasService] Error obteniendo alertas flota:', error);
    return [];
  }
}

/**
 * Obtiene resumen de la flota
 */
export async function obtenerResumenFlota(): Promise<ResumenFlotaCubiertas> {
  try {
    const snapshotCubiertas = await getDocs(collection(db, COLECCIONES.CUBIERTAS));

    let cubiertasEnUso = 0;
    let cubiertasEnDeposito = 0;
    let cubiertasEnRecapado = 0;
    let cubiertasBuenas = 0;
    let alertasCriticas = 0;
    let alertasRegulares = 0;
    const unidadesConAlertas = new Set<string>();

    snapshotCubiertas.docs.forEach(doc => {
      const cubierta = doc.data() as Cubierta;

      switch (cubierta.estado) {
        case 'EN_USO':
        case 'AUXILIO':
          cubiertasEnUso++;
          break;
        case 'NUEVA':
        case 'RECAPADA':
          if (!cubierta.unidadId) cubiertasEnDeposito++;
          else cubiertasEnUso++;
          break;
        case 'EN_RECAPADO':
          cubiertasEnRecapado++;
          break;
      }

      // Calcular estado por profundidad
      if (cubierta.ultimaProfundidadMm !== undefined) {
        if (cubierta.ultimaProfundidadMm < CONFIG_CUBIERTAS.UMBRAL_CRITICO) {
          alertasCriticas++;
          if (cubierta.unidadNumero) unidadesConAlertas.add(cubierta.unidadNumero);
        } else if (cubierta.ultimaProfundidadMm < CONFIG_CUBIERTAS.UMBRAL_BUENO) {
          alertasRegulares++;
          if (cubierta.unidadNumero) unidadesConAlertas.add(cubierta.unidadNumero);
        } else {
          cubiertasBuenas++;
        }
      }
    });

    return {
      totalUnidades: UNIDADES_CONFIG.length,
      totalCubiertas: snapshotCubiertas.size,
      cubiertasEnUso,
      cubiertasEnDeposito,
      cubiertasEnRecapado,
      cubiertasBuenas,
      alertasCriticas,
      alertasRegulares,
      unidadesConAlertas: unidadesConAlertas.size,
      enRecapado: cubiertasEnRecapado, // Alias para UI
      ultimaActualizacion: new Date(),
    };
  } catch (error) {
    console.error('[CubiertasService] Error obteniendo resumen flota:', error);
    return {
      totalUnidades: UNIDADES_CONFIG.length,
      totalCubiertas: 0,
      cubiertasEnUso: 0,
      cubiertasEnDeposito: 0,
      cubiertasEnRecapado: 0,
      cubiertasBuenas: 0,
      alertasCriticas: 0,
      alertasRegulares: 0,
      unidadesConAlertas: 0,
      enRecapado: 0,
      ultimaActualizacion: new Date(),
    };
  }
}

// ============================================
// FUNCIONES DE RETIRO Y ELIMINACIÓN
// ============================================

/**
 * Retira una cubierta de un vehículo
 */
export async function retirarCubierta(datos: {
  cubiertaId: string;
  cubiertaCodigo: string;
  unidadId: string;
  unidadNumero: string;
  posicion: string;
  fecha: Date;
  kmUnidad: number;
  kmRecorridos?: number;
  motivoRetiro: MotivoRetiro;
  destinoRetiro: DestinoRetiro;
  tecnico: string;
  observaciones?: string;
}): Promise<string | null> {
  try {
    console.log('[CubiertasService] Retirando cubierta:', datos.cubiertaCodigo, 'motivo:', datos.motivoRetiro);

    // 1. Registrar el movimiento de retiro
    const movimientoId = `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const movimientoRef = doc(db, COLECCIONES.MOVIMIENTOS, movimientoId);

    await setDoc(movimientoRef, {
      id: movimientoId,
      cubiertaId: datos.cubiertaId,
      cubiertaCodigo: datos.cubiertaCodigo,
      tipo: 'RETIRO',
      unidadId: datos.unidadId,
      unidadNumero: datos.unidadNumero,
      posicion: datos.posicion,
      fecha: Timestamp.fromDate(datos.fecha),
      kmUnidad: datos.kmUnidad,
      kmRecorridos: datos.kmRecorridos || 0,
      motivoRetiro: datos.motivoRetiro,
      destinoRetiro: datos.destinoRetiro,
      tecnico: datos.tecnico,
      observaciones: datos.observaciones || '',
      timestamp: serverTimestamp(),
    });

    // 2. Obtener la cubierta actual para actualizar km totales
    const cubiertaActual = await obtenerCubierta(datos.cubiertaId);
    const kmTotalesActualizados = (cubiertaActual?.kmTotales || 0) + (datos.kmRecorridos || 0);

    // 3. Determinar el nuevo estado según el destino
    let nuevoEstado: string;
    switch (datos.destinoRetiro) {
      case 'STOCK':
        nuevoEstado = cubiertaActual?.tipo === 'RECAPADA' ? 'RECAPADA' : 'NUEVA';
        break;
      case 'BAJA':
        nuevoEstado = 'BAJA';
        break;
      case 'RECAPADO':
        nuevoEstado = 'EN_RECAPADO';
        break;
      default:
        nuevoEstado = 'NUEVA';
    }

    // 4. Actualizar la cubierta
    const cubiertaRef = doc(db, COLECCIONES.CUBIERTAS, datos.cubiertaId);
    await updateDoc(cubiertaRef, {
      unidadId: null,
      unidadNumero: null,
      posicion: null,
      estado: nuevoEstado,
      kmTotales: kmTotalesActualizados,
      ultimaActualizacion: serverTimestamp(),
    });

    console.log('[CubiertasService] ✅ Cubierta retirada:', datos.cubiertaCodigo, '- Destino:', datos.destinoRetiro);
    return movimientoId;
  } catch (error: unknown) {
    console.error('[CubiertasService] ❌ Error retirando cubierta:', error);
    if (error instanceof Error) {
      console.error('[CubiertasService] Mensaje:', error.message);
    }
    return null;
  }
}

/**
 * Elimina una cubierta (baja definitiva)
 */
export async function eliminarCubierta(cubiertaId: string): Promise<boolean> {
  try {
    console.log('[CubiertasService] Eliminando cubierta:', cubiertaId);

    // Marcar como BAJA en lugar de eliminar físicamente para mantener historial
    const cubiertaRef = doc(db, COLECCIONES.CUBIERTAS, cubiertaId);
    await updateDoc(cubiertaRef, {
      estado: 'BAJA',
      unidadId: null,
      unidadNumero: null,
      posicion: null,
      ultimaActualizacion: serverTimestamp(),
    });

    console.log('[CubiertasService] ✅ Cubierta marcada como BAJA:', cubiertaId);
    return true;
  } catch (error: unknown) {
    console.error('[CubiertasService] ❌ Error eliminando cubierta:', error);
    return false;
  }
}

/**
 * Devuelve una cubierta al stock (desde estado BAJA o después de recapado)
 */
export async function devolverAStock(cubiertaId: string, esRecapada: boolean = false): Promise<boolean> {
  try {
    console.log('[CubiertasService] Devolviendo cubierta a stock:', cubiertaId);

    const cubiertaRef = doc(db, COLECCIONES.CUBIERTAS, cubiertaId);
    await updateDoc(cubiertaRef, {
      estado: esRecapada ? 'RECAPADA' : 'NUEVA',
      tipo: esRecapada ? 'RECAPADA' : 'LINEAL',
      unidadId: null,
      unidadNumero: null,
      posicion: null,
      ultimaActualizacion: serverTimestamp(),
    });

    console.log('[CubiertasService] ✅ Cubierta devuelta a stock:', cubiertaId);
    return true;
  } catch (error: unknown) {
    console.error('[CubiertasService] ❌ Error devolviendo a stock:', error);
    return false;
  }
}

// ============================================
// EXPORTS
// ============================================

export {
  COLECCIONES as COLECCIONES_CUBIERTAS,
};
