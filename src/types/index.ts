// Core types for CROSSLOG PWA

export interface Entrega {
  id: string;
  hdr: string;
  numeroEntrega: string;
  numeroRemito?: string;
  cliente: string; // ID corto (ej: ECO)
  clienteNombreCompleto?: string; // Nombre completo (ej: ECOLAB)
  detalleEntregas?: string; // Detalle de puntos de carga/descarga
  estado: 'PENDIENTE' | 'EN_REPARTO' | 'COMPLETADO';
  fechaCreacion: string;
  fechaActualizacion: string;
  synced: boolean;
  fechaViaje?: string; // Fecha del viaje (columna C)
  nombreReceptor?: string; // Receptor que firmó
  pdfUrls?: string[]; // URLs de los PDFs en Google Drive
}

export interface CapturaData {
  entregaId: string;
  numeroRemito: string;
  cliente: string;
  estado: 'EN_REPARTO' | 'COMPLETADO';
  fotos: FotoCapturada[];
  firma?: FirmaData;
  geolocalizacion?: GeoData;
  timestamp: string;
  chofer: string;
}

export interface FotoCapturada {
  id: string;
  blob: Blob;
  processed: boolean;
  thumbnail?: string;
  timestamp: string;
  numeroRemito?: string; // Detected remito number from OCR
  ocrDetecting?: boolean; // OCR in progress
  scanned?: boolean; // Document scanned with OpenCV
  originalBlob?: Blob; // Original before scanning
  scanCorners?: { x: number; y: number }[]; // Detected document corners
}

export interface FirmaData {
  blob: Blob;
  nombreReceptor: string;
  timestamp: string;
}

export interface GeoData {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
}

export interface PDFGenerado {
  id: string;
  entregaId: string;
  blob: Blob;
  uploaded: boolean;
  cloudinaryUrl?: string;
  timestamp: string;
}

export interface SyncQueueItem {
  id: string;
  type: 'entrega' | 'pdf';
  data: any;
  retries: number;
  lastAttempt?: string;
  error?: string;
}

export interface HDRValidationResponse {
  valid: boolean;
  entregas?: Entrega[];
  totalEntregas?: number;
  chofer?: string;
  fechaViaje?: string;
  tipoTransporte?: string; // "Propio" o nombre del fletero (BARCO, FALZONE, etc.)
}

export interface GoogleSheetsConfig {
  apiKey: string;
  spreadsheetId: string; // BASE sheet (para que el chofer comience)
  spreadsheetEntregasId: string; // Sistema_Entregas sheet (para registro)
  viajesCrosslogSheet: string;
  formResponsesSheet: string;
}

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
  apiKey: string;
}

export interface AppConfig {
  version: string;
  environment: 'development' | 'production';
  googleSheets: GoogleSheetsConfig;
  cloudinary: CloudinaryConfig;
  n8nWebhookUrl: string;
}

// Types for consultation module
export type PerfilConsulta = 'cliente' | 'fletero' | 'interno';

export type FleteroEmpresa =
  | 'BARCO'
  | 'PRODAN'
  | 'LOGZO'
  | 'DON PEDRO'
  | 'CALLTRUCK'
  | 'FALZONE'
  | 'ANDROSIUK'
  | 'VIMAAB'
  | 'CROSSLOG';

export interface HDRConsulta {
  hdr: string;
  fechaViaje: string;
  chofer: string;
  fletero?: string; // Columna H (INT) de BASE
  totalEntregas: number;
  entregasCompletadas: number;
  entregas: Entrega[];
}

export interface BusquedaConsultaParams {
  hdr?: string;
  numeroRemito?: string;
  fletero?: FleteroEmpresa;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface ConsultaResult {
  found: boolean;
  hdrs?: HDRConsulta[];
  message?: string;
}

// Authentication types for consultation module
export interface AuthResult {
  authenticated: boolean;
  userId: string; // ID_Cliente, Nombre_Fletero, or username
  userName?: string; // Full name
  userType: 'cliente' | 'fletero' | 'interno';
  message?: string;
}

export interface AuthAttempt {
  timestamp: number;
  success: boolean;
}

export interface ClienteAcceso {
  idCliente: string;
  codigoAcceso: string;
  nombreCliente: string;
  activo: boolean;
  fechaCreacion: string;
}

export interface FleteroAcceso {
  nombreFletero: string;
  codigoAcceso: string;
  activo: boolean;
  fechaCreacion: string;
}
