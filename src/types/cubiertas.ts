/**
 * TIPOS PARA MÓDULO CONTROL DE CUBIERTAS
 * Sistema de gestión de neumáticos de la flota
 */

// ============================================
// ENUMS Y TIPOS BASE
// ============================================

export type EstadoCubierta = 'NUEVA' | 'EN_USO' | 'RECAPADA' | 'BAJA' | 'AUXILIO' | 'EN_RECAPADO' | 'EN_STOCK';
export type EstadoDesgaste = 'BUENO' | 'REGULAR' | 'CRITICO'; // >6mm, 4-6mm, <4mm (VRAC/Dist) | >6mm, 3-5mm, <3mm (Vital Aire)
export type SectorCubierta = 'vrac' | 'distribucion' | 'vital-aire';
export type TipoCubierta = 'LINEAL' | 'RECAPADA';
export type LadoCubierta = 'IZQ' | 'DER';
export type TipoPosicion = 'SIMPLE' | 'DUAL_EXT' | 'DUAL_INT';

// Tipo de cubierta según posición de uso
export type TipoUsoCubierta =
  | 'DIRECCIONAL'   // Eje delantero - canales longitudinales, anti-aquaplaning
  | 'TRACCION'      // Eje trasero motor - tacos profundos/agresivos
  | 'LIBRE'         // Acoplados/semirremolques - cargas pesadas, reforzada
  | 'MIXTA';        // Multiposición - versátil para cualquier eje

// Tipos de vehículos según configuración de cubiertas
export type TipoVehiculo =
  | 'CAMIONETA'        // 2 ejes, 6 cubiertas, 1 auxilio (del. simple, tras. doble)
  | 'CAMIONETA_4R'     // 2 ejes simples, 4 cubiertas, 1 auxilio (Vital Aire INT-52/53)
  | 'CHASIS'           // 2 ejes, 6 cubiertas, 1 auxilio
  | 'CHASIS_TRACTOR'   // 2 ejes, 6 cubiertas, 1 auxilio (con enganche)
  | 'BALANCIN'         // 3 ejes, 10 cubiertas, 1 auxilio
  | 'TRACTOR_2EJES'    // 2 ejes, 6 cubiertas, 1 auxilio
  | 'TRACTOR_3EJES'    // 3 ejes, 10 cubiertas, 1-2 auxilios
  | 'SEMIREMOLQUE_12'  // 3 ejes, 12 cubiertas, 2 auxilios
  | 'CISTERNA'         // 3 ejes, 10 cubiertas, 1 auxilio
  | 'CISTERNA_2EJES'   // 2 ejes, 6 cubiertas, 1 auxilio
  | 'CISTERNA_2AUX';   // 3 ejes, 10 cubiertas, 2 auxilios

// ============================================
// CONFIGURACIÓN DE VEHÍCULOS
// ============================================

export interface PosicionCubierta {
  id: string;              // "E1_IZQ", "E2_DER_EXT", "E2_DER_INT", etc.
  numero: number;          // 1-12 para identificación visual
  eje: number;             // 1, 2, 3
  lado: LadoCubierta;
  tipo: TipoPosicion;
  soloLineal: boolean;     // true para eje de dirección (no permite recapadas)
  esAutomatico?: boolean;  // true para ejes levantables en semiremolques
  label: string;           // "Eje 1 - Izquierdo", etc.
}

export interface ConfiguracionVehiculo {
  tipo: TipoVehiculo;
  nombre: string;          // "Camioneta", "Balancín", etc.
  ejes: number;
  cubiertas: number;
  auxilios: number;
  capacidadAuxilios: number; // Espacios disponibles (puede ser mayor a auxilios cargados)
  posiciones: PosicionCubierta[];
}

// ============================================
// CUBIERTA INDIVIDUAL
// ============================================

export interface Cubierta {
  id: string;
  codigo: string;           // "CUB-001" - código único de identificación

  // Características
  marca: string;
  modelo: string;
  medida: string;           // "295/80 R22.5"
  dot?: string;             // Código DOT (fecha fabricación)
  tipo: TipoCubierta;       // LINEAL (nueva) o RECAPADA
  tipoUso: TipoUsoCubierta; // DIRECCIONAL, TRACCION, LIBRE, MIXTA
  estado: EstadoCubierta;

  // Sector al que pertenece la unidad
  sector?: SectorCubierta;  // 'vrac' | 'distribucion' | 'vital-aire'

  // Ubicación actual (null si está en depósito)
  unidadId?: string;
  unidadNumero?: string;
  posicion?: string;        // ID de posición o "AUXILIO_1", "AUXILIO_2"

  // Métricas acumuladas
  kmTotales: number;
  recapados: number;        // Cantidad de veces recapada

  // Última medición conocida
  ultimaProfundidadMm?: number;
  ultimaMedicionFecha?: Date;
  estadoDesgaste?: EstadoDesgaste; // Guardado al registrar medición (fallback si no hay ultimaProfundidadMm)

  // Timestamps
  fechaAlta: Date;
  ultimaActualizacion: Date;
}

// ============================================
// MEDICIÓN CON CALIBRE
// ============================================

export interface MedicionCubierta {
  id: string;
  cubiertaId: string;
  cubiertaCodigo: string;

  // Ubicación al momento de medir
  unidadId: string;
  unidadNumero: string;
  posicion: string;

  // Datos de medición
  fecha: Date;
  profundidadMm: number;    // Profundidad del dibujo en mm
  presionBar?: number;      // Presión en bar (opcional)
  estadoDesgaste: EstadoDesgaste;

  // Registro
  tecnico: string;
  observaciones?: string;
  fotoUrl?: string;

  timestamp: Date;
}

// ============================================
// MOVIMIENTOS (INSTALACIÓN/RETIRO/ROTACIÓN)
// ============================================

export type TipoMovimiento = 'INSTALACION' | 'RETIRO' | 'ROTACION';

// Motivos de retiro de cubierta
export type MotivoRetiro =
  | 'CAMBIO'        // Cambio normal por desgaste
  | 'EXPLOTO'       // Explotó en ruta
  | 'AGRIETADA'     // Se agrietó
  | 'RESECA'        // Está reseca
  | 'SOPLADA'       // Soplada/pinchada
  | 'RECAPADO'      // Enviada a recapado
  | 'ROTACION';     // Rotación entre posiciones

// Destino después del retiro
export type DestinoRetiro =
  | 'STOCK'         // Vuelve al stock (aún útil)
  | 'BAJA'          // Eliminación definitiva
  | 'RECAPADO';     // Enviada a recapar

export interface MovimientoCubierta {
  id: string;
  cubiertaId: string;
  cubiertaCodigo: string;
  tipo: TipoMovimiento;

  // Ubicación
  unidadId: string;
  unidadNumero: string;
  posicion: string;
  posicionDestino?: string; // Solo para rotación

  // Datos
  fecha: Date;
  kmUnidad: number;         // Kilometraje de la unidad al momento

  // Solo para retiro
  motivoRetiro?: MotivoRetiro;
  destinoRetiro?: DestinoRetiro; // STOCK, BAJA, RECAPADO
  kmRecorridos?: number;    // Km recorridos en esta instalación

  // Registro
  tecnico: string;
  observaciones?: string;

  timestamp: Date;
}

// ============================================
// RECAPADO
// ============================================

export type EstadoRecapado = 'EN_PROCESO' | 'COMPLETADO' | 'RECHAZADO';

export interface RecapadoCubierta {
  id: string;
  cubiertaId: string;
  cubiertaCodigo: string;

  // Proceso
  fechaEnvio: Date;
  fechaRetorno?: Date;
  proveedor: string;
  tipoBanda: string;
  costo: number;

  estado: EstadoRecapado;
  motivoRechazo?: string;
  observaciones?: string;

  timestamp: Date;
}

// ============================================
// ESTADO DE CUBIERTAS POR UNIDAD
// ============================================

export interface CubiertaEnPosicion {
  posicion: PosicionCubierta;
  cubierta: Cubierta | null;
  ultimaMedicion?: MedicionCubierta;
  estadoDesgaste: EstadoDesgaste | 'SIN_CUBIERTA';
}

export interface AuxilioSlot {
  slot: number;             // 1 o 2
  cubierta: Cubierta | null;
}

export interface EstadoCubiertasUnidad {
  unidadId: string;
  unidadNumero: string;
  unidadPatente?: string;
  tipoVehiculo: TipoVehiculo;
  configuracion: ConfiguracionVehiculo;

  // Cubiertas en posiciones
  cubiertas: CubiertaEnPosicion[];

  // Auxilios
  auxilios: AuxilioSlot[];

  // Resumen
  totalCubiertas: number;
  cubiertasInstaladas: number;
  alertasCriticas: number;  // Cantidad en estado CRITICO
  alertasRegulares: number; // Cantidad en estado REGULAR

  ultimaActualizacion: Date;
}

// ============================================
// ALERTAS Y RESUMEN DE FLOTA
// ============================================

export interface AlertaCubierta {
  id: string;
  cubiertaId: string;
  cubiertaCodigo: string;

  unidadId: string;
  unidadNumero: string;
  posicion: string;

  tipo: 'DESGASTE_CRITICO' | 'DESGASTE_REGULAR' | 'SIN_MEDICION' | 'RECAPADO_PENDIENTE';
  mensaje: string;

  profundidadMm?: number;
  diasSinMedicion?: number;

  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  timestamp: Date;
}

export interface ResumenFlotaCubiertas {
  totalUnidades: number;
  totalCubiertas: number;
  cubiertasEnUso: number;
  cubiertasEnDeposito: number;
  cubiertasEnRecapado: number;
  cubiertasBuenas: number;      // Cubiertas en buen estado (>6mm)

  alertasCriticas: number;
  alertasRegulares: number;

  unidadesConAlertas: number;

  // Alias para compatibilidad con UI
  enRecapado?: number;

  ultimaActualizacion: Date;
}

// ============================================
// CONFIGURACIONES PREDEFINIDAS POR UNIDAD
// ============================================

export interface UnidadConfiguracion {
  numero: string;
  patente: string;
  tipoVehiculo: TipoVehiculo;
  sector: 'distribucion' | 'vrac' | 'vital-aire';
  enganchaCon?: string;     // Para tractores que enganchan con semis específicos
}

// ============================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================

export const CONFIG_CUBIERTAS = {
  // Umbrales de desgaste para VRAC y DISTRIBUCIÓN (en mm)
  UMBRAL_BUENO: 6,      // >= 6mm = BUENO (verde)
  UMBRAL_CRITICO: 4,    // < 4mm = CRITICO (rojo) | 4-6mm = REGULAR (amarillo)

  // Colores para UI
  COLORES: {
    BUENO: '#22c55e',        // green-500
    REGULAR: '#f59e0b',      // amber-500
    CRITICO: '#ef4444',      // red-500
    SIN_CUBIERTA: '#9ca3af', // gray-400
    AUXILIO: '#3b82f6',      // blue-500
  },

  // Días sin medición para alerta
  DIAS_SIN_MEDICION_ALERTA: 30,
};

// Umbrales específicos para camionetas VITAL AIRE
// Óptimo: 9.5mm | 0–3mm CRÍTICO | 3–6mm REGULAR | >= 6mm BUENO
export const CONFIG_CUBIERTAS_VITAL_AIRE = {
  UMBRAL_BUENO: 6,      // >= 6mm = BUENO (verde)
  UMBRAL_CRITICO: 3,    // < 3mm = CRITICO (rojo) | 3-6mm = REGULAR (amarillo)
  PROFUNDIDAD_OPTIMA: 9.5,
};

// Función helper para calcular estado de desgaste según sector
export function calcularEstadoDesgaste(
  profundidadMm: number,
  sector?: SectorCubierta
): EstadoDesgaste {
  const config = sector === 'vital-aire' ? CONFIG_CUBIERTAS_VITAL_AIRE : CONFIG_CUBIERTAS;
  if (profundidadMm >= config.UMBRAL_BUENO) return 'BUENO';
  if (profundidadMm >= config.UMBRAL_CRITICO) return 'REGULAR';
  return 'CRITICO';
}

// Función helper para obtener color según estado
export function obtenerColorEstado(estado: EstadoDesgaste | 'SIN_CUBIERTA'): string {
  return CONFIG_CUBIERTAS.COLORES[estado] || CONFIG_CUBIERTAS.COLORES.SIN_CUBIERTA;
}
