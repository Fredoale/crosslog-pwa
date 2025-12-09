// Mapeo de IDs cortos de clientes a nombres completos
export const CLIENT_NAMES: Record<string, string> = {
  'ECO': 'ECOLAB',
  'TOY': 'TOYOTA',
  'ACO': 'ACOMCAGUA',
  'INQ': 'INQUIMEX',
  'HALL': 'HALLIBURTON',
  'HAL': 'HALLIBURTON',
  'APN': 'APN',
};

/**
 * Obtiene el nombre completo del cliente basado en el ID corto
 * Si no está en el mapeo, retorna el ID original en mayúsculas
 */
export function getClientFullName(clientId: string): string {
  if (!clientId) return '';

  const normalized = clientId.trim().toUpperCase();
  return CLIENT_NAMES[normalized] || normalized;
}
