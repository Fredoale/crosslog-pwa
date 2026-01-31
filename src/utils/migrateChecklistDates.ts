/**
 * Script de migración para corregir fechas corruptas en checklists
 * Usa el timestamp del ID como fuente de verdad
 */

import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

interface MigrationStats {
  total: number;
  corruptos: number;
  corregidos: number;
  errores: number;
  ids: string[];
}

/**
 * Migración principal: corrige todos los checklists con fechas corruptas
 * @param dryRun - Si es true, solo simula sin modificar datos
 */
export async function migrateChecklistDates(dryRun: boolean = true): Promise<MigrationStats> {
  console.log(`[Migration] 🚀 Iniciando migración de fechas (${dryRun ? 'DRY-RUN' : 'REAL'})...`);

  const stats: MigrationStats = {
    total: 0,
    corruptos: 0,
    corregidos: 0,
    errores: 0,
    ids: []
  };

  try {
    // Obtener todos los checklists
    const checklistsRef = collection(db, 'checklists');
    const snapshot = await getDocs(checklistsRef);
    stats.total = snapshot.size;

    console.log(`[Migration] 📊 Total de checklists: ${stats.total}`);

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const checklistId = docSnapshot.id;

      // Extraer timestamp del ID
      const match = checklistId.match(/_(\d+)$/);
      if (!match) {
        console.warn(`[Migration] ⚠️ ${checklistId}: No tiene timestamp en el ID`);
        continue;
      }

      const timestampFromId = parseInt(match[1]);
      const fechaCorrecta = new Date(timestampFromId);

      // Verificar si la fecha actual es corrupta
      let esCorrupta = false;
      let motivoCorrupcion = '';

      if (!data.fecha) {
        esCorrupta = true;
        motivoCorrupcion = 'fecha es null/undefined';
      } else if (data.fecha instanceof Timestamp) {
        const fechaActual = data.fecha.toDate();
        if (isNaN(fechaActual.getTime())) {
          esCorrupta = true;
          motivoCorrupcion = 'fecha es Invalid Date';
        } else if (fechaActual.getTime() === 0) {
          esCorrupta = true;
          motivoCorrupcion = 'fecha es epoch 0 (31/12/1969)';
        } else if (Math.abs(fechaActual.getTime() - timestampFromId) > 1000) {
          // Diferencia mayor a 1 segundo
          esCorrupta = true;
          motivoCorrupcion = `diferencia de ${Math.abs(fechaActual.getTime() - timestampFromId)}ms con el ID`;
        }
      }

      if (esCorrupta) {
        stats.corruptos++;
        console.log(`[Migration] 🔴 ${checklistId}: ${motivoCorrupcion}`);
        console.log(`[Migration]    → Fecha actual: ${data.fecha ? data.fecha.toDate?.().toLocaleString() : 'null'}`);
        console.log(`[Migration]    → Fecha correcta: ${fechaCorrecta.toLocaleString()}`);

        if (!dryRun) {
          try {
            const docRef = doc(db, 'checklists', checklistId);
            await updateDoc(docRef, {
              fecha: Timestamp.fromDate(fechaCorrecta),
              timestamp: Timestamp.fromDate(fechaCorrecta)
            });
            stats.corregidos++;
            stats.ids.push(checklistId);
            console.log(`[Migration] ✅ ${checklistId}: CORREGIDO`);
          } catch (error) {
            stats.errores++;
            console.error(`[Migration] ❌ ${checklistId}: Error al corregir:`, error);
          }
        } else {
          console.log(`[Migration] 📝 ${checklistId}: Se corregiría (dry-run)`);
        }
      }
    }

    // Resumen final
    console.log('\n[Migration] 📊 RESUMEN:');
    console.log(`   Total de checklists: ${stats.total}`);
    console.log(`   Checklists corruptos encontrados: ${stats.corruptos}`);
    if (!dryRun) {
      console.log(`   Checklists corregidos exitosamente: ${stats.corregidos}`);
      console.log(`   Errores durante la corrección: ${stats.errores}`);
      if (stats.ids.length > 0) {
        console.log(`   IDs corregidos:`, stats.ids);
      }
    } else {
      console.log(`   ⚠️ Modo DRY-RUN: No se modificaron datos`);
    }

    return stats;
  } catch (error) {
    console.error('[Migration] ❌ Error fatal en migración:', error);
    throw error;
  }
}

/**
 * Función auxiliar para corregir un checklist individual
 * Útil para testing o corrección manual
 */
export async function fixChecklistDate(checklistId: string): Promise<boolean> {
  try {
    const match = checklistId.match(/_(\d+)$/);
    if (!match) {
      console.error(`[Migration] ${checklistId}: ID inválido`);
      return false;
    }

    const timestampFromId = parseInt(match[1]);
    const fechaCorrecta = new Date(timestampFromId);

    const docRef = doc(db, 'checklists', checklistId);
    await updateDoc(docRef, {
      fecha: Timestamp.fromDate(fechaCorrecta),
      timestamp: Timestamp.fromDate(fechaCorrecta)
    });

    console.log(`[Migration] ✅ ${checklistId}: Fecha corregida a ${fechaCorrecta.toLocaleString()}`);
    return true;
  } catch (error) {
    console.error(`[Migration] ❌ ${checklistId}: Error:`, error);
    return false;
  }
}
