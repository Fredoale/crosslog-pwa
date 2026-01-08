/**
 * SCRIPT DE PRUEBA - Guardar Checklist en Firebase
 * Ejecutar desde consola del navegador o como función de testing
 */

import { saveChecklist, getChecklistById, getChecklistsByUnidad } from '../services/checklistService';
import type { ChecklistRegistro, ItemChecklist } from '../types/checklist';
import { ITEMS_CHECKLIST } from '../types/checklist';

/**
 * Crear un checklist de prueba VRAC - APTO
 */
export async function crearChecklistPruebaVRACAPTO() {
  console.log('🧪 [TEST] Creando checklist de prueba VRAC APTO...');

  const items: ItemChecklist[] = ITEMS_CHECKLIST.map(item => ({
    ...item,
    estado: 'CONFORME' as const,
    comentario: '',
    timestamp: new Date()
  }));

  const checklistPrueba: ChecklistRegistro = {
    id: `checklist_test_${Date.now()}`,
    sector: 'vrac',
    fecha: new Date(),
    unidad: {
      numero: '810',
      patente: 'AF894TS'
    },
    cisterna: {
      numero: '552',
      patente: 'BML932'
    },
    chofer: {
      nombre: 'Chofer de Prueba'
    },
    odometroInicial: {
      valor: 486383,
      fecha_hora: new Date()
    },
    items,
    resultado: 'APTO',
    itemsRechazados: 0,
    itemsConformes: 16,
    completado: true,
    timestamp: new Date(),
    timestampCompletado: new Date()
  };

  try {
    const checklistId = await saveChecklist(checklistPrueba);
    console.log('✅ [TEST] Checklist APTO guardado exitosamente:', checklistId);
    return checklistId;
  } catch (error) {
    console.error('❌ [TEST] Error guardando checklist APTO:', error);
    throw error;
  }
}

/**
 * Crear un checklist de prueba VRAC - NO APTO (con problemas)
 */
export async function crearChecklistPruebaVRACNOAPTO() {
  console.log('🧪 [TEST] Creando checklist de prueba VRAC NO APTO...');

  const items: ItemChecklist[] = ITEMS_CHECKLIST.map((item, index) => {
    // Marcar ítems 1, 7 y 12 como NO_CONFORME (críticos)
    if (index === 0 || index === 6 || index === 11) {
      return {
        ...item,
        estado: 'NO_CONFORME' as const,
        comentario: index === 0 ? 'Nivel de aceite bajo' :
                   index === 6 ? 'Frenos con bajo rendimiento' :
                   'Neumático trasero con desgaste irregular',
        timestamp: new Date()
      };
    }
    return {
      ...item,
      estado: 'CONFORME' as const,
      comentario: '',
      timestamp: new Date()
    };
  });

  const checklistPrueba: ChecklistRegistro = {
    id: `checklist_test_${Date.now()}`,
    sector: 'vrac',
    fecha: new Date(),
    unidad: {
      numero: '815',
      patente: 'AH676AV'
    },
    cisterna: {
      numero: '715',
      patente: 'AD179Pc'
    },
    chofer: {
      nombre: 'Chofer de Prueba 2'
    },
    odometroInicial: {
      valor: 512450,
      fecha_hora: new Date()
    },
    items,
    resultado: 'NO_APTO',
    itemsRechazados: 3,
    itemsConformes: 13,
    completado: true,
    timestamp: new Date(),
    timestampCompletado: new Date()
  };

  try {
    const checklistId = await saveChecklist(checklistPrueba);
    console.log('✅ [TEST] Checklist NO APTO guardado exitosamente:', checklistId);
    console.log('⚠️  [TEST] Se deberían haber creado 3 Órdenes de Trabajo automáticamente');
    return checklistId;
  } catch (error) {
    console.error('❌ [TEST] Error guardando checklist NO APTO:', error);
    throw error;
  }
}

/**
 * Crear un checklist de prueba VITAL AIRE - APTO
 */
export async function crearChecklistPruebaVitalAireAPTO() {
  console.log('🧪 [TEST] Creando checklist de prueba VITAL AIRE APTO...');

  const items: ItemChecklist[] = ITEMS_CHECKLIST.map(item => ({
    ...item,
    estado: 'CONFORME' as const,
    comentario: '',
    timestamp: new Date()
  }));

  const checklistPrueba: ChecklistRegistro = {
    id: `checklist_test_${Date.now()}`,
    sector: 'vital-aire',
    fecha: new Date(),
    unidad: {
      numero: '52',
      patente: 'AA279FE'
    },
    chofer: {
      nombre: 'Chofer Vital Aire de Prueba'
    },
    odometroInicial: {
      valor: 125450,
      fecha_hora: new Date()
    },
    items,
    resultado: 'APTO',
    itemsRechazados: 0,
    itemsConformes: 16,
    completado: true,
    timestamp: new Date(),
    timestampCompletado: new Date()
  };

  try {
    const checklistId = await saveChecklist(checklistPrueba);
    console.log('✅ [TEST] Checklist VITAL AIRE APTO guardado exitosamente:', checklistId);
    return checklistId;
  } catch (error) {
    console.error('❌ [TEST] Error guardando checklist VITAL AIRE:', error);
    throw error;
  }
}

/**
 * Leer un checklist por ID
 */
export async function leerChecklistPorId(checklistId: string) {
  console.log('🔍 [TEST] Leyendo checklist por ID:', checklistId);

  try {
    const checklist = await getChecklistById(checklistId);
    if (checklist) {
      console.log('✅ [TEST] Checklist encontrado:', checklist);
      console.log('   - Sector:', checklist.sector);
      console.log('   - Unidad:', checklist.unidad.numero, checklist.unidad.patente);
      console.log('   - Resultado:', checklist.resultado);
      console.log('   - Items Conformes:', checklist.itemsConformes);
      console.log('   - Items Rechazados:', checklist.itemsRechazados);
      return checklist;
    } else {
      console.log('❌ [TEST] Checklist no encontrado');
      return null;
    }
  } catch (error) {
    console.error('❌ [TEST] Error leyendo checklist:', error);
    throw error;
  }
}

/**
 * Leer todos los checklists de una unidad
 */
export async function leerChecklistsPorUnidad(numeroUnidad: string) {
  console.log('🔍 [TEST] Leyendo checklists de unidad:', numeroUnidad);

  try {
    const checklists = await getChecklistsByUnidad(numeroUnidad, 5);
    console.log(`✅ [TEST] ${checklists.length} checklists encontrados para unidad ${numeroUnidad}`);
    checklists.forEach((checklist, index) => {
      console.log(`   ${index + 1}. [${checklist.resultado}] ${checklist.fecha.toLocaleDateString()} - ${checklist.sector.toUpperCase()}`);
    });
    return checklists;
  } catch (error) {
    console.error('❌ [TEST] Error leyendo checklists por unidad:', error);
    throw error;
  }
}

/**
 * Ejecutar todas las pruebas
 */
export async function ejecutarTodasLasPruebas() {
  console.log('\n🚀 [TEST] ========================================');
  console.log('🚀 [TEST] INICIANDO PRUEBAS DE FIREBASE');
  console.log('🚀 [TEST] ========================================\n');

  try {
    // Prueba 1: Checklist VRAC APTO
    const id1 = await crearChecklistPruebaVRACAPTO();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo

    // Prueba 2: Checklist VRAC NO APTO
    const id2 = await crearChecklistPruebaVRACNOAPTO();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Prueba 3: Checklist VITAL AIRE APTO
    const id3 = await crearChecklistPruebaVitalAireAPTO();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar a que se guarde

    // Prueba 4: Leer el primer checklist
    console.log('\n');
    await leerChecklistPorId(id1);

    // Prueba 5: Leer todos los checklists de unidad 810
    console.log('\n');
    await leerChecklistsPorUnidad('810');

    console.log('\n✅ [TEST] ========================================');
    console.log('✅ [TEST] TODAS LAS PRUEBAS COMPLETADAS');
    console.log('✅ [TEST] ========================================\n');

    console.log('📊 [TEST] Resumen:');
    console.log('   - 3 checklists creados');
    console.log('   - 3 órdenes de trabajo generadas (del checklist NO APTO)');
    console.log('   - 3 estadísticas de unidades actualizadas');
    console.log('\n🔍 [TEST] Verifica en Firebase Console:');
    console.log('   https://console.firebase.google.com/');
    console.log('   → Firestore Database → Data → checklists');

    return {
      checklistIds: [id1, id2, id3],
      success: true
    };
  } catch (error) {
    console.error('\n❌ [TEST] ========================================');
    console.error('❌ [TEST] ERROR EN LAS PRUEBAS');
    console.error('❌ [TEST] ========================================');
    console.error(error);
    return {
      checklistIds: [],
      success: false,
      error
    };
  }
}

// Exportar función para usar en consola del navegador
(window as any).testFirebase = {
  crearVRACAPTO: crearChecklistPruebaVRACAPTO,
  crearVRACNOAPTO: crearChecklistPruebaVRACNOAPTO,
  crearVitalAireAPTO: crearChecklistPruebaVitalAireAPTO,
  leerPorId: leerChecklistPorId,
  leerPorUnidad: leerChecklistsPorUnidad,
  ejecutarTodas: ejecutarTodasLasPruebas
};

console.log('✅ [TEST] Script de prueba cargado. Usa: window.testFirebase.ejecutarTodas()');
