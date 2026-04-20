/**
 * ANÁLISIS DE COMBUSTIBLE POR UNIDAD
 * Última carga, consumo promedio 30 días, rendimiento km/L, detección de anomalías
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { CargaCombustible } from '../types/checklist';

export type TipoAnomaliaCombustible = 'consumo_alto' | 'km_retrocedido' | 'sin_cargas' | null;

export interface AnomaliaCombustible {
  tipo: TipoAnomaliaCombustible;
  mensaje: string;
  severidad: 'alta' | 'media';
  desviacionPct?: number;
}

export interface AnalisisCombustible {
  ultimaCarga: CargaCombustible | null;
  cargas30d: CargaCombustible[];
  // L/100km (promedio histórico 30 días)
  consumoPromedio: number | null;
  // km/L (rendimiento promedio 30 días)
  rendimientoPromedio: number | null;
  // Última medición puntual
  consumoUltimo: number | null;
  rendimientoUltimo: number | null;
  // Totales 30 días
  costoTotal30d: number;
  litrosTotal30d: number;
  kmTotal30d: number;
  cargasCount30d: number;
  // Anomalía detectada (null si está todo bien)
  anomalia: AnomaliaCombustible | null;
}

const UMBRAL_CONSUMO_ANOMALO_PCT = 20; // +20% sobre promedio → anomalía
const DIAS_SIN_CARGAS_ALERTA = 45;     // sin carga en >45 días → alerta

/**
 * Calcula consumo (L/100km) y rendimiento (km/L) entre dos cargas consecutivas
 */
function calcularConsumoEntreCargas(
  anterior: CargaCombustible,
  actual: CargaCombustible
): { consumo: number; rendimiento: number; kmRecorridos: number } | null {
  const km = actual.kilometrajeActual - anterior.kilometrajeActual;
  if (km <= 0 || actual.litrosCargados <= 0) return null;
  return {
    consumo: (actual.litrosCargados / km) * 100,
    rendimiento: km / actual.litrosCargados,
    kmRecorridos: km,
  };
}

/**
 * Obtiene análisis completo de combustible para una unidad
 */
export async function obtenerAnalisisCombustible(
  numeroUnidad: string
): Promise<AnalisisCombustible> {
  const vacio: AnalisisCombustible = {
    ultimaCarga: null,
    cargas30d: [],
    consumoPromedio: null,
    rendimientoPromedio: null,
    consumoUltimo: null,
    rendimientoUltimo: null,
    costoTotal30d: 0,
    litrosTotal30d: 0,
    kmTotal30d: 0,
    cargasCount30d: 0,
    anomalia: null,
  };

  try {
    // Sin orderBy para evitar índice compuesto; ordenamos y limitamos en JS
    const q = query(
      collection(db, 'cargas_combustible'),
      where('unidad.numero', '==', numeroUnidad)
    );
    const snap = await getDocs(q);
    if (snap.empty) return vacio;

    const cargas: CargaCombustible[] = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          ...(data as CargaCombustible),
          id: d.id,
          fecha: data.fecha?.toDate?.() ?? new Date(),
        };
      })
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
      .slice(0, 15); // Las 15 más recientes

    const ultimaCarga = cargas[0];
    const hace30d = new Date();
    hace30d.setDate(hace30d.getDate() - 30);
    const cargas30d = cargas.filter((c) => c.fecha >= hace30d);

    // Orden ascendente para calcular consumos entre pares consecutivos
    const ordenadas = [...cargas].reverse();
    const mediciones: { fecha: Date; consumo: number; rendimiento: number; km: number }[] = [];
    for (let i = 1; i < ordenadas.length; i++) {
      const m = calcularConsumoEntreCargas(ordenadas[i - 1], ordenadas[i]);
      if (m) mediciones.push({ fecha: ordenadas[i].fecha, consumo: m.consumo, rendimiento: m.rendimiento, km: m.kmRecorridos });
    }

    const medicionesUlt30d = mediciones.filter((m) => m.fecha >= hace30d);
    const consumoPromedio = medicionesUlt30d.length > 0
      ? medicionesUlt30d.reduce((acc, m) => acc + m.consumo, 0) / medicionesUlt30d.length
      : null;
    const rendimientoPromedio = medicionesUlt30d.length > 0
      ? medicionesUlt30d.reduce((acc, m) => acc + m.rendimiento, 0) / medicionesUlt30d.length
      : null;

    const ultimaMedicion = mediciones[mediciones.length - 1] ?? null;
    const consumoUltimo = ultimaMedicion?.consumo ?? null;
    const rendimientoUltimo = ultimaMedicion?.rendimiento ?? null;

    const costoTotal30d  = cargas30d.reduce((acc, c) => acc + (c.costoTotal ?? 0), 0);
    const litrosTotal30d = cargas30d.reduce((acc, c) => acc + (c.litrosCargados ?? 0), 0);
    const kmTotal30d     = medicionesUlt30d.reduce((acc, m) => acc + m.km, 0);

    // Detección de anomalía
    let anomalia: AnomaliaCombustible | null = null;

    // 1) KM retrocedido (última carga tiene menos km que la anterior)
    if (cargas.length >= 2 && cargas[0].kilometrajeActual < cargas[1].kilometrajeActual) {
      anomalia = {
        tipo: 'km_retrocedido',
        mensaje: 'Kilometraje retrocedido en última carga — revisar',
        severidad: 'alta',
      };
    }
    // 2) Consumo anómalo (última carga >20% sobre promedio 30d)
    else if (consumoUltimo != null && consumoPromedio != null && consumoPromedio > 0) {
      const desvio = ((consumoUltimo - consumoPromedio) / consumoPromedio) * 100;
      if (desvio >= UMBRAL_CONSUMO_ANOMALO_PCT) {
        anomalia = {
          tipo: 'consumo_alto',
          mensaje: `Consumo +${Math.round(desvio)}% sobre promedio`,
          severidad: desvio >= 35 ? 'alta' : 'media',
          desviacionPct: Math.round(desvio),
        };
      }
    }
    // 3) Sin cargas recientes
    else {
      const diasDesdeUltima = Math.floor((Date.now() - ultimaCarga.fecha.getTime()) / (1000 * 60 * 60 * 24));
      if (diasDesdeUltima > DIAS_SIN_CARGAS_ALERTA) {
        anomalia = {
          tipo: 'sin_cargas',
          mensaje: `Sin cargas hace ${diasDesdeUltima} días`,
          severidad: 'media',
        };
      }
    }

    return {
      ultimaCarga,
      cargas30d,
      consumoPromedio,
      rendimientoPromedio,
      consumoUltimo,
      rendimientoUltimo,
      costoTotal30d,
      litrosTotal30d,
      kmTotal30d,
      cargasCount30d: cargas30d.length,
      anomalia,
    };
  } catch (err) {
    console.error('[combustibleAnalisis]', err);
    return vacio;
  }
}
