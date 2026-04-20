/**
 * SERVICIO DE ALERTAS DE MANTENIMIENTO
 * Calcula el estado de mantenimiento preventivo por unidad
 * basándose en KM del checklist y KM del último service (OT cerrada)
 */

import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

// ============================================================================
// CONFIGURACIÓN DE UNIDADES
// ============================================================================

export type EstadoAlerta = 'ok' | 'atencion' | 'urgente' | 'vencido';
export type SectorAlerta = 'VRAC' | 'DIST' | 'VA';

export interface ConfigUnidad {
  numero: string;
  marca: string;
  tipo: string;
  intervaloKm: number;
  sector: SectorAlerta;
}

export interface AlertaMantenimiento {
  unidad: ConfigUnidad;
  kmActual: number | null;
  kmUltimoService: number | null;
  fechaUltimoService: Date | null;
  kmProximoService: number | null;
  kmFaltantes: number | null;
  porcentaje: number | null;
  estado: EstadoAlerta;
  otId?: string;
}

// Umbrales de alerta (km antes del vencimiento)
export const UMBRAL_ATENCION = 3000;
export const UMBRAL_URGENTE = 500;

// Configuración de unidades con su intervalo de service
export const UNIDADES_MANTENIMIENTO: ConfigUnidad[] = [
  // IVECO — 20.000 km — VRAC
  { numero: '810', marca: 'IVECO', tipo: 'Tractor', intervaloKm: 20000, sector: 'VRAC' },
  { numero: '812', marca: 'IVECO', tipo: 'Tractor', intervaloKm: 20000, sector: 'VRAC' },
  { numero: '40',  marca: 'IVECO', tipo: 'Tractor', intervaloKm: 20000, sector: 'VRAC' },
  { numero: '48',  marca: 'IVECO', tipo: 'Tractor', intervaloKm: 20000, sector: 'VRAC' },
  // VOLVO — 50.000 km — VRAC
  { numero: '50',  marca: 'VOLVO', tipo: 'Tractor', intervaloKm: 50000, sector: 'VRAC' },
  { numero: '802', marca: 'VOLVO', tipo: 'Tractor', intervaloKm: 50000, sector: 'VRAC' },
  { numero: '805', marca: 'VOLVO', tipo: 'Tractor', intervaloKm: 50000, sector: 'VRAC' },
  { numero: '806', marca: 'VOLVO', tipo: 'Tractor', intervaloKm: 50000, sector: 'VRAC' },
  { numero: '814', marca: 'VOLVO', tipo: 'Tractor', intervaloKm: 50000, sector: 'VRAC' },
  // SCANIA — 40.000 km — VRAC
  { numero: '815', marca: 'SCANIA', tipo: 'Tractor', intervaloKm: 40000, sector: 'VRAC' },
  // IVECO — 20.000 km — DISTRIBUCIÓN
  { numero: '41',  marca: 'IVECO', tipo: 'Tractor', intervaloKm: 20000, sector: 'DIST' },
  { numero: '45',  marca: 'IVECO', tipo: 'Tractor', intervaloKm: 20000, sector: 'DIST' },
  { numero: '46',  marca: 'IVECO', tipo: 'Tractor', intervaloKm: 20000, sector: 'DIST' },
  { numero: '64',  marca: 'IVECO', tipo: 'Tractor', intervaloKm: 20000, sector: 'DIST' },
  // MERCEDES — 20.000 km — DISTRIBUCIÓN
  { numero: '813', marca: 'MERCEDES', tipo: 'Tractor', intervaloKm: 20000, sector: 'DIST' },
  // CAMIONETAS IVECO — 15.000 km — DISTRIBUCIÓN
  { numero: '54',  marca: 'IVECO', tipo: 'Camioneta', intervaloKm: 15000, sector: 'DIST' },
  // CAMIONETAS IVECO — 15.000 km — VITAL AIRE
  { numero: '52',  marca: 'IVECO', tipo: 'Camioneta', intervaloKm: 15000, sector: 'VA' },
  { numero: '53',  marca: 'IVECO', tipo: 'Camioneta', intervaloKm: 15000, sector: 'VA' },
  { numero: '55',  marca: 'IVECO', tipo: 'Camioneta', intervaloKm: 15000, sector: 'VA' },
  { numero: '56',  marca: 'IVECO', tipo: 'Camioneta', intervaloKm: 15000, sector: 'VA' },
  { numero: '59',  marca: 'IVECO', tipo: 'Camioneta', intervaloKm: 15000, sector: 'VA' },
  { numero: '801', marca: 'IVECO', tipo: 'Camioneta', intervaloKm: 15000, sector: 'VA' },
  { numero: '808', marca: 'IVECO', tipo: 'Camioneta', intervaloKm: 15000, sector: 'VA' },
  { numero: '811', marca: 'IVECO', tipo: 'Camioneta', intervaloKm: 15000, sector: 'VA' },
  { numero: '816', marca: 'IVECO', tipo: 'Camioneta', intervaloKm: 15000, sector: 'VA' },
  { numero: '817', marca: 'IVECO', tipo: 'Camioneta', intervaloKm: 15000, sector: 'VA' },
];

// ============================================================================
// FUNCIONES DEL SERVICIO
// ============================================================================

/**
 * Obtiene el KM actual de una unidad desde la fuente más actualizada disponible:
 *  - Último checklist (campo odometroFinal/Inicial)
 *  - Última carga de combustible (campo kilometrajeActual)
 * Devuelve el KM MÁS ALTO (los odómetros no bajan) con su fecha.
 */
async function getKmActualUnidad(numeroUnidad: string): Promise<{ km: number | null; fecha: Date | null }> {
  const candidatos: { km: number; fecha: Date | null }[] = [];

  // 1) Último checklist
  try {
    const q = query(
      collection(db, 'checklists'),
      where('unidad.numero', '==', numeroUnidad),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0].data();
      const km = Number(d.odometroFinal?.valor ?? d.odometroInicial?.valor ?? d.kilometraje ?? d.km ?? NaN);
      if (!isNaN(km) && km > 0) {
        candidatos.push({ km, fecha: d.timestamp?.toDate?.() ?? null });
      }
    }
  } catch (e) { console.warn('[km] checklist fail', e); }

  // 2) Última carga de combustible (sin orderBy para evitar índice compuesto; ordenamos en JS)
  try {
    const q = query(
      collection(db, 'cargas_combustible'),
      where('unidad.numero', '==', numeroUnidad)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      // Ordenar por fecha desc y tomar el primero
      const docs = snap.docs
        .map((d) => ({ data: d.data(), fecha: d.data().fecha?.toDate?.() ?? new Date(0) }))
        .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      const d = docs[0].data;
      const km = Number(d.kilometrajeActual ?? d.kilometraje ?? NaN);
      if (!isNaN(km) && km > 0) {
        candidatos.push({ km, fecha: docs[0].fecha });
      }
    }
  } catch (e) { console.warn('[km] combustible fail', e); }

  if (candidatos.length === 0) return { km: null, fecha: null };

  // Odómetro no baja → elegimos el MÁS ALTO (el más reciente en la práctica)
  candidatos.sort((a, b) => b.km - a.km);
  return candidatos[0];
}

/**
 * Obtiene el KM del último service (OT PREVENTIVO cerrada) de una unidad
 */
async function getUltimoServiceUnidad(numeroUnidad: string): Promise<{
  km: number | null;
  fecha: Date | null;
  otId?: string;
}> {
  try {
    // Sin orderBy para evitar índice compuesto; ordenamos en JS por fechaFin desc
    const q = query(
      collection(db, 'ordenes_trabajo'),
      where('unidad.numero', '==', numeroUnidad),
      where('tipo', '==', 'PREVENTIVO'),
      where('estado', 'in', ['CERRADO', 'COMPLETADA'])
    );
    const snap = await getDocs(q);
    if (snap.empty) return { km: null, fecha: null };

    // Ordenar por fechaFin desc y tomar el más reciente
    const docs = snap.docs
      .map((d) => ({ id: d.id, data: d.data(), fechaFin: d.data().fechaFin?.toDate?.() ?? new Date(0) }))
      .sort((a, b) => b.fechaFin.getTime() - a.fechaFin.getTime());

    const { id, data, fechaFin } = docs[0];
    return {
      km: data.kmService ?? null,
      fecha: fechaFin.getTime() > 0 ? fechaFin : (data.fechaCompletado?.toDate?.() ?? null),
      otId: id,
    };
  } catch (e) {
    console.error('[getUltimoServiceUnidad]', e);
    return { km: null, fecha: null };
  }
}

/**
 * Calcula el estado de alerta según los KM faltantes
 */
function calcularEstado(kmFaltantes: number | null): EstadoAlerta {
  if (kmFaltantes === null) return 'ok';
  if (kmFaltantes < 0) return 'vencido';
  if (kmFaltantes <= UMBRAL_URGENTE) return 'urgente';
  if (kmFaltantes <= UMBRAL_ATENCION) return 'atencion';
  return 'ok';
}

/**
 * Obtiene las alertas de mantenimiento de toda la flota
 */
export async function getAlertasMantenimiento(): Promise<AlertaMantenimiento[]> {
  const resultados = await Promise.all(
    UNIDADES_MANTENIMIENTO.map(async (unidad) => {
      const [kmData, serviceData] = await Promise.all([
        getKmActualUnidad(unidad.numero),
        getUltimoServiceUnidad(unidad.numero),
      ]);

      // KM actual: checklist/combustible primero; fallback al km del último service
      // (el odómetro no baja, así que el km del service es el mínimo conocido)
      const kmActual = kmData.km ?? serviceData.km;
      const kmUltimoService = serviceData.km;
      const kmProximoService =
        kmUltimoService !== null ? kmUltimoService + unidad.intervaloKm : null;
      const kmFaltantes =
        kmActual !== null && kmProximoService !== null
          ? kmProximoService - kmActual
          : null;
      const porcentaje =
        kmActual !== null && kmUltimoService !== null && kmProximoService !== null
          ? Math.min(100, Math.round(((kmActual - kmUltimoService) / unidad.intervaloKm) * 100))
          : null;

      return {
        unidad,
        kmActual,
        kmUltimoService,
        fechaUltimoService: serviceData.fecha,
        kmProximoService,
        kmFaltantes,
        porcentaje,
        estado: calcularEstado(kmFaltantes),
        otId: serviceData.otId,
      } as AlertaMantenimiento;
    })
  );

  // Ordenar: vencido → urgente → atencion → ok
  const orden: EstadoAlerta[] = ['vencido', 'urgente', 'atencion', 'ok'];
  return resultados.sort((a, b) => orden.indexOf(a.estado) - orden.indexOf(b.estado));
}

/**
 * Cuenta las alertas activas (no ok) para el badge del tab
 */
export function contarAlertasActivas(alertas: AlertaMantenimiento[]): number {
  return alertas.filter((a) => a.estado !== 'ok').length;
}
