/**
 * Configuración de carpetas de Google Drive por cliente
 *
 * Cada cliente tiene su carpeta específica en Google Drive donde se suben los PDFs de remitos
 */

export interface ClientFolderConfig {
  id: string;              // ID del cliente (de Maestra_Clientes)
  nombre: string;          // Nombre completo del cliente
  folderId: string;        // ID de la carpeta en Google Drive
  folderName: string;      // Nombre de la carpeta (para referencia)
  telefono?: string;       // Teléfono de contacto (opcional)
  tipoCarga?: string;      // Tipo de carga (opcional)
}

/**
 * Mapping de clientes a carpetas de Google Drive
 *
 * IMPORTANTE: Los IDs deben coincidir EXACTAMENTE con la columna F (Dador_carga) de la hoja BASE
 */
export const CLIENT_FOLDERS: Record<string, ClientFolderConfig> = {
  'ECO': {
    id: 'ECO',
    nombre: 'ECOLAB',
    folderId: '1MDmsMNaHYeWWvxjk4wF7_xTpYr-Ut3hJ', // ID de la carpeta "REMITOS ECOLAB"
    folderName: 'REMITOS ECOLAB',
    telefono: '5491154096639',
    tipoCarga: 'Peligrosa',
  },
  'TOY': {
    id: 'TOY',
    nombre: 'TOYOTA',
    folderId: '1XE_cz8tyktyINm8o0ZwW4zcGEmR5zuxT', // ID de la carpeta "REMITOS TOYOTA"
    folderName: 'REMITOS TOYOTA',
  },
  'ACO': {
    id: 'ACO',
    nombre: 'ACOMCAGUA',
    folderId: '1G2z0CWsQ-utWq70ETuYIP8WtzK-h01PB', // ID de la carpeta "REMITOS ACOMCAGUA"
    folderName: 'REMITOS ACOMCAGUA',
  },
  'INQ': {
    id: 'INQ',
    nombre: 'INQUIMEX',
    folderId: '1NhcBSDrmZI6f8COxVcZwBXpv7O1DZkm5', // ID de la carpeta "REMITOS INQUIMEX"
    folderName: 'REMITOS INQUIMEX',
  },
  'HAL': {
    id: 'HAL',
    nombre: 'HALLIBURTON',
    folderId: '1b8w1oEf9DdRpUbb-8tiX7FNB8Skr10xI', // ID de la carpeta "REMITOS HALLIBURTON"
    folderName: 'REMITOS HALLIBURTON',
  },
  'APN': {
    id: 'APN',
    nombre: 'APN',
    folderId: '1L_ib8P1MV2hP5SZyn44VuFJ6u57mTfqC', // ID de la carpeta "REMITOS APN"
    folderName: 'REMITOS APN',
  },
};

/**
 * Carpeta por defecto (fallback) cuando no se encuentra el cliente
 * IMPORTANTE: Esta carpeta debe estar compartida con la cuenta de Google que usa la PWA
 */
export const DEFAULT_FOLDER_ID = '1MDmsMNaHYeWWvxjk4wF7_xTpYr-Ut3hJ'; // REMITOS ECOLAB (fallback)

/**
 * Obtiene la configuración de carpeta para un cliente
 * @param clientId - ID del cliente (ej: 'ECO', 'TOY')
 * @returns Configuración de la carpeta o null si no existe
 */
export function getClientFolderConfig(clientId: string): ClientFolderConfig | null {
  const normalizedId = clientId?.trim().toUpperCase();
  return CLIENT_FOLDERS[normalizedId] || null;
}

/**
 * Obtiene el ID de carpeta de Google Drive para un cliente
 * @param clientId - ID del cliente
 * @returns Folder ID o el ID por defecto si no se encuentra
 */
export function getClientFolderId(clientId: string): string {
  const config = getClientFolderConfig(clientId);
  return config?.folderId || DEFAULT_FOLDER_ID;
}

/**
 * Obtiene el nombre completo del cliente
 * @param clientId - ID del cliente
 * @returns Nombre del cliente o el ID si no se encuentra
 */
export function getClientName(clientId: string): string {
  const config = getClientFolderConfig(clientId);
  return config?.nombre || clientId;
}

/**
 * Verifica si existe configuración para un cliente
 * @param clientId - ID del cliente
 * @returns true si existe configuración
 */
export function hasClientConfig(clientId: string): boolean {
  const normalizedId = clientId?.trim().toUpperCase();
  return normalizedId in CLIENT_FOLDERS;
}

/**
 * Obtiene todos los clientes configurados
 * @returns Array de IDs de clientes
 */
export function getAllClientIds(): string[] {
  return Object.keys(CLIENT_FOLDERS);
}
