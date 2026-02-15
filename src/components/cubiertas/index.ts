/**
 * MÓDULO CONTROL DE CUBIERTAS
 * Exports principales
 */

// Componentes
export { DiagramaVehiculo } from './DiagramaVehiculo';
export { PanelCubiertas } from './PanelCubiertas';
export { VisorFlotaCubiertas } from './VisorFlotaCubiertas';

// Re-export tipos
export type {
  EstadoCubierta,
  EstadoDesgaste,
  TipoCubierta,
  TipoUsoCubierta,
  TipoVehiculo,
  ConfiguracionVehiculo,
  PosicionCubierta,
  Cubierta,
  MedicionCubierta,
  MovimientoCubierta,
  MotivoRetiro,
  DestinoRetiro,
  RecapadoCubierta,
  EstadoCubiertasUnidad,
  CubiertaEnPosicion,
  AuxilioSlot,
  AlertaCubierta,
  ResumenFlotaCubiertas,
  UnidadConfiguracion,
} from '../../types/cubiertas';

// Re-export funciones del servicio
export {
  obtenerConfiguracionVehiculo,
  obtenerDatosUnidad,
  obtenerUnidadesPorSector,
  obtenerCubierta,
  obtenerCubiertasUnidad,
  guardarCubierta,
  registrarMedicion,
  obtenerHistorialMediciones,
  registrarMovimiento,
  obtenerEstadoCubiertasUnidad,
  obtenerAlertasFlota,
  obtenerResumenFlota,
  retirarCubierta,
  eliminarCubierta,
  devolverAStock,
  CONFIGURACIONES_VEHICULOS,
  UNIDADES_CONFIG,
} from '../../services/cubiertasService';

// Re-export constantes y helpers
export {
  CONFIG_CUBIERTAS,
  calcularEstadoDesgaste,
  obtenerColorEstado,
} from '../../types/cubiertas';
