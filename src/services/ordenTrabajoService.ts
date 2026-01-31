import { doc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Genera el siguiente número de Orden de Trabajo de forma secuencial y atómica
 * Formato: OT-0001, OT-0002, etc.
 *
 * @returns Número de OT formateado (ej: "OT-0001")
 */
export async function generarNumeroOT(): Promise<string> {
  const counterRef = doc(db, 'counters', 'ordenTrabajo');

  try {
    const numeroOT = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      let nuevoNumero = 1;

      if (counterDoc.exists()) {
        const currentCount = counterDoc.data().count || 0;
        nuevoNumero = currentCount + 1;
      }

      // Actualizar contador
      transaction.set(counterRef, {
        count: nuevoNumero,
        lastUpdated: new Date()
      });

      return nuevoNumero;
    });

    // Formatear número con padding de 4 dígitos
    const numeroFormateado = `OT-${String(numeroOT).padStart(4, '0')}`;

    console.log('[OrdenTrabajoService] Nuevo número OT generado:', numeroFormateado);

    return numeroFormateado;
  } catch (error) {
    console.error('[OrdenTrabajoService] Error generando número OT:', error);
    // Fallback: usar timestamp si falla la transacción
    const fallbackNumero = Date.now() % 10000;
    return `OT-${String(fallbackNumero).padStart(4, '0')}`;
  }
}

/**
 * Obtiene el contador actual sin incrementarlo
 * Útil para verificaciones y debugging
 *
 * @returns Contador actual o 0 si no existe
 */
export async function obtenerContadorActual(): Promise<number> {
  const counterRef = doc(db, 'counters', 'ordenTrabajo');

  try {
    const counterDoc = await getDoc(counterRef);

    if (counterDoc.exists()) {
      return counterDoc.data().count || 0;
    }

    return 0;
  } catch (error) {
    console.error('[OrdenTrabajoService] Error obteniendo contador:', error);
    return 0;
  }
}

/**
 * Formatea un número de OT legacy (timestamp) al nuevo formato
 * Solo para migración de datos existentes
 *
 * @param numeroLegacy - Número legacy (timestamp)
 * @returns Número formateado o el original si ya está formateado
 */
export function formatearNumeroOT(numeroLegacy: number | string): string {
  // Si ya está formateado, devolverlo
  if (typeof numeroLegacy === 'string' && numeroLegacy.startsWith('OT-')) {
    return numeroLegacy;
  }

  // Si es número legacy, usar últimos 4 dígitos
  if (typeof numeroLegacy === 'number') {
    const ultimosDigitos = numeroLegacy % 10000;
    return `OT-${String(ultimosDigitos).padStart(4, '0')}`;
  }

  // Si es string numérico
  if (typeof numeroLegacy === 'string' && !isNaN(Number(numeroLegacy))) {
    const numero = Number(numeroLegacy);
    const ultimosDigitos = numero % 10000;
    return `OT-${String(ultimosDigitos).padStart(4, '0')}`;
  }

  return String(numeroLegacy);
}
