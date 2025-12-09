/**
 * Feature Flags Configuration
 *
 * Controla qué funcionalidades están habilitadas en producción.
 * Las variables de entorno se configuran en Netlify (Site settings → Environment variables)
 *
 * @example
 * // En Netlify:
 * VITE_FEATURE_MARKETPLACE_FIRESTORE=false
 * VITE_FEATURE_GESTION_DOCUMENTOS=true
 * VITE_FEATURE_DASHBOARD_DOCS=true
 */

export const FEATURES = {
  /**
   * Marketplace con Firebase Firestore (tiempo real)
   * @default false
   *
   * Cuando está en false:
   * - Módulo aparece como "En desarrollo"
   * - Muestra mensaje profesional explicando mejoras
   * - No se puede acceder a funcionalidad
   *
   * Cuando está en true:
   * - Marketplace funcional con Firebase
   * - Actualizaciones en tiempo real
   * - 99% reducción en API calls
   */
  MARKETPLACE_FIRESTORE: import.meta.env.VITE_FEATURE_MARKETPLACE_FIRESTORE === 'true',

  /**
   * Módulo de Gestión de Documentación
   * @default true
   *
   * Incluye:
   * - Gestión de documentos de choferes
   * - Gestión de documentos de unidades
   * - Gestión de cuadernillos Crosslog
   * - Sistema de edición click-to-edit
   */
  GESTION_DOCUMENTOS: import.meta.env.VITE_FEATURE_GESTION_DOCUMENTOS === 'true',

  /**
   * Dashboard de Documentación con alertas
   * @default true
   *
   * Incluye:
   * - Consolidación de alertas de 3 fuentes
   * - Sistema de criticidad (Crítico, Alto, Medio)
   * - Filtros interactivos
   * - Diseño responsive
   */
  DASHBOARD_DOCS: import.meta.env.VITE_FEATURE_DASHBOARD_DOCS === 'true',
} as const;

/**
 * Helper function para verificar si una feature está habilitada
 *
 * @param feature - Nombre de la feature a verificar
 * @returns true si la feature está habilitada, false en caso contrario
 *
 * @example
 * if (isFeatureEnabled('MARKETPLACE_FIRESTORE')) {
 *   // Renderizar marketplace
 * } else {
 *   // Mostrar mensaje "En desarrollo"
 * }
 */
export const isFeatureEnabled = (feature: keyof typeof FEATURES): boolean => {
  return FEATURES[feature] || false;
};

/**
 * Log de features habilitadas (solo en desarrollo)
 */
if (import.meta.env.DEV) {
  console.log('[Features] Estado de feature flags:', FEATURES);
}
