/**
 * SCRIPT PARA LIMPIAR DATOS DE PRUEBA
 * Borra todos los documentos de prueba de Firebase
 */

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Borrar todos los checklists de prueba
 */
export async function borrarChecklistsDePrueba() {
  console.log('🗑️ [CLEANUP] Borrando checklists de prueba...');

  try {
    const checklistsRef = collection(db, 'checklists');
    const q = query(checklistsRef, where('__name__', '>=', 'checklist_test_'));
    const snapshot = await getDocs(q);

    let borrados = 0;
    for (const docSnap of snapshot.docs) {
      if (docSnap.id.startsWith('checklist_test_')) {
        await deleteDoc(doc(db, 'checklists', docSnap.id));
        console.log(`   ✅ Borrado: ${docSnap.id}`);
        borrados++;
      }
    }

    console.log(`✅ [CLEANUP] ${borrados} checklists de prueba borrados`);
    return borrados;
  } catch (error) {
    console.error('❌ [CLEANUP] Error borrando checklists:', error);
    throw error;
  }
}

/**
 * Borrar todas las órdenes de trabajo de prueba
 */
export async function borrarOrdenesDeTrabajoDeprueba() {
  console.log('🗑️ [CLEANUP] Borrando órdenes de trabajo de prueba...');

  try {
    const otRef = collection(db, 'ordenes_trabajo');
    const snapshot = await getDocs(otRef);

    let borrados = 0;
    for (const docSnap of snapshot.docs) {
      if (docSnap.id.startsWith('ot_')) {
        await deleteDoc(doc(db, 'ordenes_trabajo', docSnap.id));
        console.log(`   ✅ Borrado: ${docSnap.id}`);
        borrados++;
      }
    }

    console.log(`✅ [CLEANUP] ${borrados} órdenes de trabajo borradas`);
    return borrados;
  } catch (error) {
    console.error('❌ [CLEANUP] Error borrando órdenes de trabajo:', error);
    throw error;
  }
}

/**
 * Borrar estadísticas de unidades de prueba
 */
export async function borrarEstadisticasDePrueba() {
  console.log('🗑️ [CLEANUP] Borrando estadísticas de prueba...');

  try {
    const unidadesPrueba = ['810', '815', '52']; // Unidades usadas en las pruebas
    let borrados = 0;

    for (const unidadId of unidadesPrueba) {
      try {
        await deleteDoc(doc(db, 'estadisticas_unidades', unidadId));
        console.log(`   ✅ Borrado: estadisticas_unidades/${unidadId}`);
        borrados++;
      } catch (error: any) {
        if (error.code === 'not-found') {
          console.log(`   ⚠️  No existe: estadisticas_unidades/${unidadId}`);
        } else {
          throw error;
        }
      }
    }

    console.log(`✅ [CLEANUP] ${borrados} estadísticas borradas`);
    return borrados;
  } catch (error) {
    console.error('❌ [CLEANUP] Error borrando estadísticas:', error);
    throw error;
  }
}

/**
 * Borrar TODAS las colecciones de prueba
 */
export async function limpiarTodasLasPruebas() {
  console.log('\n🗑️ [CLEANUP] ========================================');
  console.log('🗑️ [CLEANUP] LIMPIANDO DATOS DE PRUEBA');
  console.log('🗑️ [CLEANUP] ========================================\n');

  try {
    const checklistsBorrados = await borrarChecklistsDePrueba();
    console.log('');

    const otBorradas = await borrarOrdenesDeTrabajoDeprueba();
    console.log('');

    const estadisticasBorradas = await borrarEstadisticasDePrueba();

    console.log('\n✅ [CLEANUP] ========================================');
    console.log('✅ [CLEANUP] LIMPIEZA COMPLETADA');
    console.log('✅ [CLEANUP] ========================================');
    console.log(`📊 [CLEANUP] Resumen:`);
    console.log(`   - ${checklistsBorrados} checklists borrados`);
    console.log(`   - ${otBorradas} órdenes de trabajo borradas`);
    console.log(`   - ${estadisticasBorradas} estadísticas borradas`);
    console.log('');

    return {
      success: true,
      checklistsBorrados,
      otBorradas,
      estadisticasBorradas
    };
  } catch (error) {
    console.error('\n❌ [CLEANUP] ========================================');
    console.error('❌ [CLEANUP] ERROR EN LA LIMPIEZA');
    console.error('❌ [CLEANUP] ========================================');
    console.error(error);

    return {
      success: false,
      error
    };
  }
}

// Exportar para usar en consola del navegador
(window as any).cleanupFirebase = {
  borrarChecklists: borrarChecklistsDePrueba,
  borrarOrdenes: borrarOrdenesDeTrabajoDeprueba,
  borrarEstadisticas: borrarEstadisticasDePrueba,
  limpiarTodo: limpiarTodasLasPruebas
};

console.log('✅ [CLEANUP] Script de limpieza cargado. Usa: window.cleanupFirebase.limpiarTodo()');
