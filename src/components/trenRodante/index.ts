/**
 * MÓDULO TREN RODANTE VRAC
 * Exportaciones de componentes y servicios
 */

export { default as AlertasTrenRodante } from './AlertasTrenRodante';
export { default as ChecklistTrenRodante40K } from './ChecklistTrenRodante40K';
export { default as ChecklistTrenRodante80K } from './ChecklistTrenRodante80K';
export { default as ChecklistTrenRodante160K } from './ChecklistTrenRodante160K';

// Re-export types
export type {
  TipoMantenimientoTR,
  EstadoAlertaTR,
  ResultadoInspeccion,
  AlertaTrenRodante,
  AlertaInspeccionLigera,
  AlertaMantenimientoTR,
  RegistroInspeccionLigera,
  RegistroMantenimiento80K,
  RegistroMantenimiento160K,
} from '../../types/trenRodante';

// Re-export service functions
export {
  obtenerAlertasTrenRodante,
  obtenerDatosMant,
  formatearKm,
  formatearFecha,
} from '../../services/trenRodanteService';
