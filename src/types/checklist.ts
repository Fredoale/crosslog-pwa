/**
 * TIPOS TYPESCRIPT - SISTEMA DE CHECKLIST Y MANTENIMIENTO
 * Basado en PDF "Reporte del Checklist nro. 6314"
 * Fecha: 10 de Diciembre, 2025
 */

// ============================================================================
// ENUMS Y CONSTANTES
// ============================================================================

export type EstadoItem = 'CONFORME' | 'NO_CONFORME' | 'NO_APLICA';
export type ResultadoChecklist = 'APTO' | 'NO_APTO' | 'PENDIENTE';
export type SectorChecklist = 'vrac' | 'vital-aire' | 'distribucion';

// Categorías de ítems del checklist
export const CategoriaItem = {
  REQUISITOS_OBLIGATORIOS: 'REQUISITOS_OBLIGATORIOS',
  DOCUMENTACION: 'DOCUMENTACION',
  SEGURIDAD_PERSONAL: 'SEGURIDAD_PERSONAL'
} as const;
export type CategoriaItem = typeof CategoriaItem[keyof typeof CategoriaItem];

// ============================================================================
// INTERFACES - CHECKLIST
// ============================================================================

/**
 * Ítem individual del checklist
 */
export interface ItemChecklist {
  id: string;                    // Identificador único (ej: "item_01")
  numero: number;                // Número de ítem (1-16)
  categoria: CategoriaItem;      // Categoría del ítem
  descripcion: string;           // Descripción del ítem
  detalle?: string;             // Detalle/instrucción del ítem
  esCritico: boolean;           // Si es NO-GO (crítico)
  estado: EstadoItem;           // Estado actual
  comentario?: string;          // Comentario si NO_CONFORME
  fotoUrl?: string;             // URL de foto si es necesaria
  fotoRequerida: boolean;       // Si requiere foto obligatoria
  fotosEvidencia?: string[];    // Array de fotos de evidencia
  timestamp?: Date;             // Momento de la inspección
}

/**
 * Odómetro registrado
 */
export interface Odometro {
  valor: number;                // Valor del odómetro
  fecha_hora: Date;             // Momento del registro
  fotoUrl?: string;             // Foto opcional del tablero
  geolocalizacion?: {
    lat: number;
    lng: number;
  };
}

/**
 * Registro completo de un checklist
 */
export interface ChecklistRegistro {
  id: string;                   // ID único del checklist
  sector: SectorChecklist;      // vrac o vital-aire
  fecha: Date;                  // Fecha del checklist

  // Información de la unidad
  unidad: {
    numero: string;             // Número de unidad (ej: "810")
    patente: string;            // Patente de la unidad
  };

  // Solo para VRAC
  cisterna?: {
    numero: string;             // Número de cisterna (ej: "552")
    patente: string;            // Patente de la cisterna
  };

  // Información del chofer
  chofer: {
    nombre: string;             // Nombre completo del chofer
    hdr?: string;               // HDR si aplica
  };

  // Odómetro
  odometroInicial: Odometro;    // Odómetro al inicio
  odometroFinal?: Odometro;     // Odómetro al final (opcional)

  // Items del checklist
  items: ItemChecklist[];       // 16 ítems del checklist

  // Resultado
  resultado: ResultadoChecklist;
  itemsRechazados: number;      // Cantidad de ítems NO_CONFORME críticos
  itemsConformes: number;       // Cantidad de ítems CONFORME

  // Firma digital
  firmaChofer?: string;         // Firma digital del chofer

  // Geolocalización
  geolocalizacion?: {
    lat: number;
    lng: number;
  };

  // Metadata
  completado: boolean;          // Si el checklist está completo
  timestamp: Date;              // Momento de creación
  timestampCompletado?: Date;   // Momento de completado
}

/**
 * Novedad generada por un ítem NO_CONFORME
 */
export interface Novedad {
  id: string;                   // ID único de la novedad
  checklistId: string;          // ID del checklist origen
  itemId: string;               // ID del ítem que generó la novedad

  fecha: Date;                  // Fecha de la novedad
  unidad: {
    numero: string;
    patente: string;
  };

  descripcion: string;          // Descripción del problema
  comentarioChofer: string;     // Comentario del chofer
  fotoUrl?: string;             // Foto del problema
  fotosEvidencia?: string[];    // Array de fotos de evidencia

  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';  // Prioridad de la novedad
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'RESUELTA' | 'RECHAZADA';

  // Orden de trabajo generada
  ordenTrabajoId?: string;

  // Metadata
  timestamp: Date;
  timestampResuelta?: Date;
}

/**
 * Orden de Trabajo de Mantenimiento
 */
export interface OrdenTrabajo {
  id: string;                   // ID único de la OT
  numeroOT: number;             // Número secuencial de OT

  novedadId?: string;           // ID de la novedad origen (legacy, retrocompatibilidad)
  novedadesIds?: string[];      // IDs de novedades asociadas (múltiples)
  checklistId?: string;         // ID del checklist origen (si aplica)

  fecha: Date;                  // Fecha de creación
  unidad: {
    numero: string;
    patente: string;
  };

  tipo: 'PREVENTIVO' | 'CORRECTIVO' | 'URGENTE';
  descripcion: string;

  // Asignación
  asignadoA?: string;           // Mecánico/Taller asignado
  fechaAsignacion?: Date;

  // Estado
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'ESPERANDO_REPUESTOS' | 'CERRADO' | 'COMPLETADA';
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';

  // Evidencia fotográfica (array de URLs)
  fotosEvidencia?: string[];

  // Detalles del trabajo
  repuestos?: {
    nombre: string;
    cantidad: number;
    costo: number;
    precioUnitario?: number;
    precioTotal?: number;
  }[];
  horasTrabajo?: number;        // Horas de trabajo
  costo?: number;               // Costo total
  costoManoObra?: number;       // Costo de mano de obra
  costoRepuestos?: number;      // Costo total de repuestos
  costoReparacion?: number;     // Costo total de reparación (acumulativo)

  // Registros de trabajo (historial acumulativo)
  registrosTrabajo?: {
    id: string;
    fecha: any;
    descripcion: string;
    horasTrabajo: number;
    costoTotal: number;
    repuestos: { nombre: string; cantidad: number; costo: number }[];
    fotosAntes: string[];
    fotosDespues: string[];
    tecnico?: string;
  }[];

  // Mecánico y fechas reales
  mecanico?: string;            // Nombre del mecánico asignado
  fechaInicio?: Date;           // Fecha/hora real de inicio del trabajo
  fechaFin?: Date;              // Fecha/hora real de finalización

  // Tipo de mantenimiento
  tipoMantenimiento?: 'PREVENTIVO' | 'CORRECTIVO' | 'URGENTE';

  // Comentarios
  comentarioInicio?: string;
  comentarioFin?: string;

  // Evidencia
  fotoAntes?: string;
  fotoDespues?: string;

  // Firmas digitales
  firmaMecanico?: string;       // Firma digital del mecánico
  firmaSupervisor?: string;     // Firma digital del supervisor

  // Metadata
  timestamp: Date;
  timestampCompletada?: Date;
  fechaCreacion?: Date;          // Fecha de creación de la OT
  fechaCompletado?: Date;        // Fecha de completado
  descripcionTrabajo?: string;   // Descripción del trabajo realizado
}

// ============================================================================
// INTERFACES - ESTADÍSTICAS Y REPORTES
// ============================================================================

/**
 * Estadísticas de una unidad
 */
export interface EstadisticasUnidad {
  unidad: {
    numero: string;
    patente: string;
  };

  // Estadísticas de checklists
  totalChecklists: number;
  checklistsAptos: number;
  checklistsNoAptos: number;

  // Novedades
  totalNovedades: number;
  novedadesPendientes: number;
  novedadesResueltas: number;

  // Ordenes de trabajo
  totalOTs: number;
  otsPendientes: number;
  otsCompletadas: number;

  // Odómetro
  kilometrajeTotal: number;
  ultimoOdometro?: Odometro;

  // Última inspección
  ultimoChecklist?: Date;
  diasSinInspeccion: number;
}

/**
 * Resumen de mantenimiento
 */
export interface ResumenMantenimiento {
  fecha: Date;

  // Totales por sector
  vrac: {
    unidadesActivas: number;
    checklistsHoy: number;
    novedadesPendientes: number;
  };

  vitalAire: {
    unidadesActivas: number;
    checklistsHoy: number;
    novedadesPendientes: number;
  };

  // Alertas
  alertas: {
    unidadesSinChecklist: string[];  // Números de unidades sin checklist hoy
    novedadesUrgentes: number;       // Novedades de alta prioridad
    otsAtrasadas: number;            // OTs pendientes > 7 días
  };
}

// ============================================================================
// CONSTANTES - ITEMS DEL CHECKLIST
// ============================================================================

/**
 * Definición de los 16 ítems del checklist
 * Basado en PDF "Reporte del Checklist nro. 6314"
 */
export const ITEMS_CHECKLIST: Omit<ItemChecklist, 'estado' | 'timestamp'>[] = [
  // 1 - Estado General Neumáticos (NO-GO)
  {
    id: 'item_01',
    numero: 1,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'Estado General Neumáticos, Vigías Y Auxilios',
    detalle: 'Sin globos, deformaciones y grietas, sin indicadores visibles de turcas sueltas',
    esCritico: true,
    fotoRequerida: false,
  },
  // 2 - Aceite y Agua (NO-GO)
  {
    id: 'item_02',
    numero: 2,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'Aceite y Agua',
    detalle: 'Sin fugas visibles',
    esCritico: true,
    fotoRequerida: false,
  },
  // 3 - Sistema de Aire (NO-GO)
  {
    id: 'item_03',
    numero: 3,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'Sistema de Aire',
    detalle: 'Sin perdidas de aire (Suspensión y frenos)',
    esCritico: true,
    fotoRequerida: false,
  },
  // 4 - Estado de Espejos (NO-GO)
  {
    id: 'item_04',
    numero: 4,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'Estado de Espejos',
    detalle: 'Estado y limpieza',
    esCritico: true,
    fotoRequerida: false,
  },
  // 5 - Parabrisas (NO-GO)
  {
    id: 'item_05',
    numero: 5,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'Parabrisas',
    detalle: 'Sin marcas, ni fisuras y funcionamiento del limpia parabrisas y sapito',
    esCritico: true,
    fotoRequerida: false,
  },
  // 6 - Estado de Luces (NO-GO)
  {
    id: 'item_06',
    numero: 6,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'Estado de Luces',
    detalle: 'Todas las luces operativas y funcionales',
    esCritico: true,
    fotoRequerida: false,
  },
  // 7 - Funcionamiento de Frenos (NO-GO)
  {
    id: 'item_07',
    numero: 7,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'Funcionamiento de Frenos',
    detalle: 'Verificado por conductor',
    esCritico: true,
    fotoRequerida: false,
  },
  // 8 - Alarma de Retroceso (NO-GO)
  {
    id: 'item_08',
    numero: 8,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'Alarma de Retroceso',
    detalle: 'Verificar funcionamiento',
    esCritico: true,
    fotoRequerida: false,
  },
  // 9 - Tacógrafo (NO-GO)
  {
    id: 'item_09',
    numero: 9,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'Tacógrafo',
    detalle: 'Se colocó disco/rollo de tacógrafo? Funciona correctamente?',
    esCritico: true,
    fotoRequerida: false,
  },
  // 10 - Estado Cabina Interior (NO-GO)
  {
    id: 'item_10',
    numero: 10,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'Estado Cabina Interior',
    detalle: 'No hay objetos pesados sueltos, velocímetro operativo, bocina operativa, cinturón de seguridad operativo, estados de los asientos, sin luces de alarma, etc',
    esCritico: true,
    fotoRequerida: false,
  },
  // 11 - Matafuegos (NO-GO)
  {
    id: 'item_11',
    numero: 11,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'Matafuegos',
    detalle: 'En buen estado, cargado y vencimiento vigente',
    esCritico: true,
    fotoRequerida: false,
  },
  // 12 - Estado Cabina Exterior y Chasis (NO crítico)
  {
    id: 'item_12',
    numero: 12,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'Estado De La Cabina Exterior y Chasis',
    detalle: 'Estado general chapa, pintura y limpieza',
    esCritico: false,
    fotoRequerida: false,
  },
  // 13 - Documentación (NO-GO)
  {
    id: 'item_13',
    numero: 13,
    categoria: CategoriaItem.DOCUMENTACION,
    descripcion: 'Documentación (RTO, Seguro, Linti, etc)',
    detalle: 'Verificar vigencia de toda la documentación',
    esCritico: true,
    fotoRequerida: false,
  },
  // 14 - Dispositivo Alto Mobile (NO crítico)
  {
    id: 'item_14',
    numero: 14,
    categoria: CategoriaItem.DOCUMENTACION,
    descripcion: 'Dispositivo Alto Mobile',
    detalle: 'Cuenta con el celular provisto por Air Liquide? La pantalla se encuentra buen estado? Tiene el cable USB para cargarlo?',
    esCritico: false,
    fotoRequerida: false,
  },
  // 15 - Equipos de protección personal (NO-GO)
  {
    id: 'item_15',
    numero: 15,
    categoria: CategoriaItem.SEGURIDAD_PERSONAL,
    descripcion: 'Equipos de Protección Personal',
    detalle: 'Casco, Guantes criogénicos, Mameluco ignifugo, Zapatos de seguridad',
    esCritico: true,
    fotoRequerida: false,
  },
  // 16 - Condiciones para Manejar (NO-GO)
  {
    id: 'item_16',
    numero: 16,
    categoria: CategoriaItem.SEGURIDAD_PERSONAL,
    descripcion: 'El Chofer Se Encuentra En Condiciones De Manejar?',
    detalle: 'No tiene síntomas de fatiga, ni esta bajo el efecto de estupefacientes y no ha tomado bebidas alcohólicas',
    esCritico: true,
    fotoRequerida: false,
  },
];

// ============================================================================
// INTERFACES - SISTEMA DE COMBUSTIBLE
// ============================================================================

/**
 * Tipo de combustible
 */
export type TipoCombustible = 'COMÚN' | 'INFINIA' | 'UREA';

/**
 * Registro de carga de combustible
 */
export interface CargaCombustible {
  id: string;                   // ID único de la carga
  fecha: Date;                  // Fecha de la carga

  // Información de la unidad
  unidad: {
    numero: string;             // Número de unidad (ej: "810")
    patente: string;            // Patente de la unidad
  };

  // Datos de la carga
  kilometrajeActual: number;    // Kilometraje al momento de la carga
  litrosCargados: number;       // Litros cargados
  tipoCombustible: TipoCombustible; // Tipo de combustible
  costoTotal: number;           // Costo total del ticket

  // Información adicional
  estacionServicio?: string;    // Estación de servicio
  fotoTicket?: string;          // URL de la foto del ticket
  observaciones?: string;       // Observaciones adicionales

  // Quién registra
  operador: string;             // Chofer que registra (del login)

  // Metadata
  timestamp: Date;              // Momento del registro
}

/**
 * Consumo calculado de combustible
 */
export interface ConsumoCombustible {
  id: string;                   // ID único del cálculo
  unidad: {
    numero: string;
    patente: string;
  };

  // Período
  mes: string;                  // Formato "YYYY-MM"

  // Métricas calculadas
  consumoPromedio: number;      // L/100km promedio del período
  totalLitros: number;          // Total de litros cargados
  totalKilometros: number;      // Total de km recorridos
  totalCosto: number;           // Costo total del período
  cantidadCargas: number;       // Cantidad de cargas en el período

  // Análisis
  costoPorKm: number;           // Costo por kilómetro
  tendencia: number;            // Porcentaje vs mes anterior (+/-)
  desviacionPromedio: number;   // % diferencia vs promedio de flota

  // Metadata
  timestamp: Date;
  ultimaActualizacion: Date;
}

/**
 * Alerta de consumo anormal
 */
export interface AlertaCombustible {
  id: string;
  unidad: {
    numero: string;
    patente: string;
  };

  tipo: 'CONSUMO_ALTO' | 'CONSUMO_BAJO' | 'SIN_CARGAS' | 'MEJORA_SIGNIFICATIVA';
  severidad: 'ALTA' | 'MEDIA' | 'BAJA';

  mensaje: string;
  consumoActual: number;        // L/100km actual
  consumoEsperado: number;      // L/100km esperado
  diferenciaPorcentual: number; // % de diferencia

  fechaDeteccion: Date;
  estado: 'ACTIVA' | 'REVISADA' | 'RESUELTA';

  timestamp: Date;
}
