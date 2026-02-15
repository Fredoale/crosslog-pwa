/**
 * TIPOS PARA MÓDULO TREN RODANTE VRAC
 * Mantenimiento de semirremolques según procedimientos Air Liquide
 * - 40K: Inspección Ligera (ciclo independiente)
 * - 80K: Mantenimiento Corto Plazo
 * - 160K: Mantenimiento Mediano Plazo (ciclo 80K→160K)
 */

// ============================================================================
// TIPOS BASE
// ============================================================================

export type TipoMantenimientoTR = '40K' | '80K' | '160K';
export type EstadoAlertaTR = 'OK' | 'PROXIMO' | 'VENCIDO';
export type ResultadoInspeccion = 'BUENO' | 'REGULAR' | 'MALO' | 'N/A';

export interface UnidadTrenRodante {
  id: string;
  numero: string;           // Ej: "548", "721"
  patente: string;
  sector: 'vrac' | 'vital-aire';
  activo: boolean;
}

// ============================================================================
// ALERTAS DE GOOGLE SHEETS (LECTURA SOLAPA MANT)
// ============================================================================

export interface AlertaInspeccionLigera {
  id: string;
  tipo: '40K';
  unidadId: string;
  unidadNumero: string;
  fechaUltimoMant: Date;
  kilometrajeActual: number;
  kilometrajeProximoMant: number;  // +40,000 km
  estado: EstadoAlertaTR;
  diasRestantes?: number;
  kmRestantes?: number;
}

export interface AlertaMantenimientoTR {
  id: string;
  tipo: '80K' | '160K';
  unidadId: string;
  unidadNumero: string;
  fechaUltimoMant: Date;
  kilometrajeActual: number;
  kilometrajeProximoMant: number;  // +80K o +160K según ciclo
  estado: EstadoAlertaTR;
  diasRestantes?: number;
  kmRestantes?: number;
  cicloActual: '80K' | '160K';  // Indica cuál sigue en el ciclo
}

export type AlertaTrenRodante = AlertaInspeccionLigera | AlertaMantenimientoTR;

// ============================================================================
// CHECKLIST 40K - INSPECCIÓN LIGERA
// ============================================================================

export interface ItemInspeccionLigera {
  id: string;
  categoria: 'enganche' | 'varios' | 'frenos' | 'suspension' | 'neumaticos';
  descripcion: string;
  tipoValor: 'medida' | 'estado' | 'si_no';
  unidadMedida?: 'mm' | 'bar' | '%';
  valorMinimo?: number;
  valorMaximo?: number;
  requiereFoto?: boolean;
}

export interface RegistroInspeccionLigera {
  id: string;
  unidadId: string;
  unidadNumero: string;
  unidadPatente: string;
  fecha: Date;
  kilometraje: number;
  inspector: string;

  // Sistema de enganche
  enganche: {
    medidaPernoA: number;  // mm
    medidaPernoE: number;  // mm
    estadoGeneral: ResultadoInspeccion;
    observaciones?: string;
  };

  // Varios
  varios: {
    ruedaAuxilio: ResultadoInspeccion;
    paragolpes: ResultadoInspeccion;
    guardabarros: ResultadoInspeccion;
    luces: ResultadoInspeccion;
    observaciones?: string;
  };

  // Frenos
  frenos: {
    inspeccionVisual: ResultadoInspeccion;
    espesorCinta: number;  // mm
    observaciones?: string;
  };

  // Suspensión
  suspension: {
    fugasNeumatica: boolean;
    estadoElasticos: ResultadoInspeccion;
    observaciones?: string;
  };

  // Neumáticos (6 posiciones típicas)
  neumaticos: {
    posicion: string;
    marca: string;
    medida: string;
    profundidadDibujo: number;  // mm
    presion: number;  // bar
    estado: ResultadoInspeccion;
  }[];

  // Resultado final
  resultado: 'APTO' | 'NO_APTO';
  firmaInspector?: string;
  fotosEvidencia?: string[];
  observacionesGenerales?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  syncedToFirestore: boolean;
}

// ============================================================================
// CHECKLIST 80K - MANTENIMIENTO CORTO PLAZO
// ============================================================================

export interface ItemMantenimiento80K {
  id: string;
  seccion: 'accesorios' | 'antiArrastre' | 'ejes' | 'frenoCampana' | 'frenoDisco' | 'suspensionMecanica' | 'suspensionNeumatica';
  numeroItem: number;
  descripcion: string;
  ejeNumero?: 1 | 2 | 3;
  lado?: 'IZQ' | 'DER';
  tipoValor: 'medida' | 'estado' | 'si_no' | 'texto';
  unidadMedida?: 'mm' | 'bar' | 'Nm';
  valorReferencia?: string;
  requiereReemplazo?: boolean;
}

export interface RegistroMantenimiento80K {
  id: string;
  unidadId: string;
  unidadNumero: string;
  unidadPatente: string;
  fecha: Date;
  kilometraje: number;
  tecnico: string;

  // Accesorios (15 items)
  accesorios: {
    itemId: string;
    descripcion: string;
    valor: string | number | boolean;
    estado: ResultadoInspeccion;
    requiereAccion?: boolean;
    observaciones?: string;
  }[];

  // Sistema Anti Arrastre (7 items)
  antiArrastre: {
    itemId: string;
    descripcion: string;
    valor: string | number | boolean;
    estado: ResultadoInspeccion;
    requiereAccion?: boolean;
    observaciones?: string;
  }[];

  // Ejes (3 ejes x IZQ/DER x 11 items = 66 items)
  ejes: {
    ejeNumero: 1 | 2 | 3;
    lado: 'IZQ' | 'DER';
    items: {
      itemId: string;
      descripcion: string;
      valor: string | number | boolean;
      estado: ResultadoInspeccion;
      medida?: number;
      requiereAccion?: boolean;
      observaciones?: string;
    }[];
  }[];

  // Freno Campana (14 items por eje)
  frenoCampana: {
    ejeNumero: 1 | 2 | 3;
    items: {
      itemId: string;
      descripcion: string;
      valor: string | number | boolean;
      estado: ResultadoInspeccion;
      medida?: number;
      requiereAccion?: boolean;
    }[];
  }[];

  // Freno Disco (7 items por eje) - Opcional según tipo de freno
  frenoDisco?: {
    ejeNumero: 1 | 2 | 3;
    items: {
      itemId: string;
      descripcion: string;
      valor: string | number | boolean;
      estado: ResultadoInspeccion;
      medida?: number;
      requiereAccion?: boolean;
    }[];
  }[];

  // Suspensión
  suspensionMecanica?: {
    itemId: string;
    descripcion: string;
    estado: ResultadoInspeccion;
    observaciones?: string;
  }[];

  suspensionNeumatica?: {
    itemId: string;
    descripcion: string;
    estado: ResultadoInspeccion;
    observaciones?: string;
  }[];

  // Resultado
  resultado: 'APTO' | 'NO_APTO' | 'APTO_CON_OBSERVACIONES';
  itemsNoConformes: string[];
  accionesRequeridas: string[];
  firmaTecnico?: string;
  firmaResponsable?: string;
  fotosEvidencia?: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  syncedToFirestore: boolean;
}

// ============================================================================
// CHECKLIST 160K - MANTENIMIENTO MEDIANO PLAZO
// ============================================================================

export interface RegistroMantenimiento160K {
  id: string;
  unidadId: string;
  unidadNumero: string;
  unidadPatente: string;
  fecha: Date;
  kilometraje: number;
  tecnico: string;

  // Sistema de enganche con ensayo ND
  enganche: {
    inspeccionVisual: ResultadoInspeccion;
    ensayoND: {
      realizado: boolean;
      resultado: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE';
      certificadoNumero?: string;
      fechaEnsayo?: Date;
      observaciones?: string;
    };
  };

  // Rectificación de campanas/discos
  rectificacion: {
    campanasRectificadas: boolean;
    discosRectificados: boolean;
    medidasFinales: {
      componente: string;
      medidaInicial: number;
      medidaFinal: number;
      dentroTolerancias: boolean;
    }[];
    observaciones?: string;
  };

  // Ensayo ND en puntas de eje
  ensayoNDPuntasEje: {
    eje1: {
      realizado: boolean;
      resultado: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE';
      certificadoNumero?: string;
    };
    eje2: {
      realizado: boolean;
      resultado: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE';
      certificadoNumero?: string;
    };
    eje3: {
      realizado: boolean;
      resultado: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE';
      certificadoNumero?: string;
    };
  };

  // Alineación de ejes
  alineacion: {
    realizada: boolean;
    medicionInicial: {
      eje1: number;
      eje2: number;
      eje3: number;
    };
    medicionFinal: {
      eje1: number;
      eje2: number;
      eje3: number;
    };
    dentroTolerancias: boolean;
    certificadoNumero?: string;
    observaciones?: string;
  };

  // Incluye todo lo del 80K
  mantenimiento80K: RegistroMantenimiento80K;

  // Resultado
  resultado: 'APTO' | 'NO_APTO' | 'APTO_CON_OBSERVACIONES';
  ensayosNDAprobados: boolean;
  firmaTecnico?: string;
  firmaResponsable?: string;
  firmaCalidad?: string;
  fotosEvidencia?: string[];
  certificadosAdjuntos?: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  syncedToFirestore: boolean;
}

// ============================================================================
// DATOS GOOGLE SHEETS (SOLAPA MANT)
// ============================================================================

export interface DatosSheetMant {
  // Inspección Ligera (T/MantCisterna)
  inspeccionesLigeras: {
    identificador: string;  // "Insp Lig###"
    fechaUltimo: Date;
    kilometraje: number;
  }[];

  // Tren Rodante (T/Mant)
  mantenimientosTR: {
    identificador: string;  // "Tren Rod###"
    fechaUltimo: Date;
    kilometraje: number;
  }[];
}

// ============================================================================
// CONSTANTES DE CONFIGURACIÓN
// ============================================================================

export const CONFIG_TREN_RODANTE = {
  // Intervalos de mantenimiento en km
  INTERVALO_40K: 40000,
  INTERVALO_80K: 80000,
  INTERVALO_160K: 160000,

  // Umbral de alerta (km antes del mantenimiento)
  UMBRAL_ALERTA_KM: 5000,

  // Umbral de alerta (días antes del mantenimiento)
  UMBRAL_ALERTA_DIAS: 30,

  // Colores de estado
  COLORES: {
    OK: '#22c55e',        // green-500
    PROXIMO: '#f59e0b',   // amber-500
    VENCIDO: '#ef4444',   // red-500
  }
};
