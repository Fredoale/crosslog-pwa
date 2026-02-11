import { doc, runTransaction, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Genera el siguiente número de Orden de Trabajo de forma secuencial y atómica
 * Devuelve un número entero que luego puede ser formateado para visualización
 *
 * @returns Número de OT como entero (ej: 1, 2, 3...)
 */
export async function generarNumeroOT(): Promise<number> {
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

    console.log('[OrdenTrabajoService] Nuevo número OT generado:', numeroOT);

    return numeroOT;
  } catch (error) {
    console.error('[OrdenTrabajoService] Error generando número OT:', error);
    // Fallback: usar timestamp modulo para tener un número manejable
    return Date.now() % 1000000;
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
 * Inicializa o resetea el contador de OT a un valor específico
 * IMPORTANTE: Usar con cuidado, solo para inicialización o correcciones
 *
 * @param valorInicial - Valor desde el cual empezar (default: 0, siguiente será 1)
 */
export async function inicializarContadorOT(valorInicial: number = 0): Promise<void> {
  const counterRef = doc(db, 'counters', 'ordenTrabajo');

  try {
    await setDoc(counterRef, {
      count: valorInicial,
      lastUpdated: new Date(),
      inicializado: true
    });
    console.log('[OrdenTrabajoService] ✅ Contador inicializado a:', valorInicial);
  } catch (error) {
    console.error('[OrdenTrabajoService] ❌ Error inicializando contador:', error);
    throw error;
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
  // Si ya está formateado con 6 dígitos, devolverlo
  if (typeof numeroLegacy === 'string' && /^\d{6}$/.test(numeroLegacy)) {
    return numeroLegacy;
  }

  // Si es número pequeño (nuevo sistema), formatear con 6 dígitos
  if (typeof numeroLegacy === 'number' && numeroLegacy < 1000000) {
    return String(numeroLegacy).padStart(6, '0');
  }

  // Si es número legacy grande (timestamp), usar últimos 6 dígitos
  if (typeof numeroLegacy === 'number') {
    const ultimosDigitos = numeroLegacy % 1000000;
    return String(ultimosDigitos).padStart(6, '0');
  }

  // Si es string numérico pequeño
  if (typeof numeroLegacy === 'string' && !isNaN(Number(numeroLegacy))) {
    const numero = Number(numeroLegacy);
    if (numero < 1000000) {
      return String(numero).padStart(6, '0');
    }
    // Si es grande (legacy), usar últimos 6 dígitos
    const ultimosDigitos = numero % 1000000;
    return String(ultimosDigitos).padStart(6, '0');
  }

  return String(numeroLegacy);
}
