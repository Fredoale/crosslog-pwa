// Tipos base para documentos
export type EstadoDocumento = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO';
export type TipoDocumentoChofer = 'registro' | 'lintin' | 'dni';
export type TipoDocumentoUnidad = 'seguro' | 'vtv' | 'cedula';

// Documento genérico
export interface Documento {
  id: string;
  nombre: string;
  urlArchivo: string; // Por ahora URL directo, luego Drive ID
  fechaVencimiento?: string; // Formato YYYY-MM-DD
  estado: EstadoDocumento;
}

// Documentos específicos
export interface DocumentoChofer extends Documento {
  tipo: TipoDocumentoChofer;
  choferNombre: string;
}

export interface DocumentoUnidad extends Documento {
  tipo: TipoDocumentoUnidad;
  numeroUnidad: string;
}

// Cuadernillo mensual
export interface Cuadernillo {
  mes: string; // Formato YYYY-MM
  cuadernilloCompleto: string; // URL del PDF completo
  doc931?: string;
  docART?: string;
  clausulaNoRepeticion?: string;
  fechaEmision: string;
  fechaVencimiento: string;
  estado: EstadoDocumento;
}

// Alertas
export type CriticidadAlerta = 'alta' | 'media' | 'baja';

export interface Alerta {
  id: string;
  tipo: 'documento' | 'cuadernillo';
  mensaje: string;
  criticidad: CriticidadAlerta;
  diasRestantes: number;
  documentoRelacionado?: string;
}

// Info del chofer con documentación completa
export interface InfoChoferCompleta {
  nombre: string;
  unidad: string;
  esPropio: boolean;
  documentos: DocumentoChofer[];
  documentosUnidad: DocumentoUnidad[];
  cuadernillo: Cuadernillo | null;
  alertas: Alerta[];
}
