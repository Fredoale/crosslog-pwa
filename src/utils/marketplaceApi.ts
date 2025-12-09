// ============================================
// MARKETPLACE API - Gestión de Viajes y Ofertas
// ============================================

const MARKETPLACE_SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_MARKETPLACE_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;

// ============================================
// TIPOS
// ============================================

export interface ViajeMarketplace {
  HDR_viaje: string;
  cliente_id: string;
  cliente_nombre: string;
  fecha_viaje: string;
  fecha_publicacion: string;
  estado: 'BORRADOR' | 'PUBLICADO' | 'CONFIRMADO' | 'ASIGNADO' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO';
  precio_base: number;
  tipo_unidad_requerida: string;
  peso_kg: number;
  tipo_carga: string;
  detalles_ruta: EntregaRuta[];
  tiempo_limite_oferta: string;
  total_ofertas: number;
  fletero_asignado?: string;
  precio_final?: number;
  hdr_generado?: string;
  fecha_asignacion?: string;
  fecha_completado?: string;
  rating_viaje?: number;
  notas_internas?: string;
  fleteros_rechazaron?: string[]; // Lista de fleteros que rechazaron el viaje
}

export interface EntregaRuta {
  numero: string;
  tipo: 'CARGA' | 'DESCARGA';
  direccion: string;
  horario_desde: string;
  horario_hasta: string;
  link_maps?: string;
}

export interface OfertaMarketplace {
  id_oferta: string;
  HDR_viaje: string;
  fletero_nombre: string;
  fletero_id: string;
  precio_ofertado: number;
  unidad_ofrecida: string;
  patente_unidad: string;
  chofer_asignado: string;
  telefono_chofer: string;
  tiempo_estimado_horas: number;
  mensaje_adicional: string;
  fecha_oferta: string;
  estado: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';
  score_algoritmo?: number;
  fecha_respuesta?: string;
  motivo_rechazo?: string;
}

export interface FleteroPerfilMarketplace {
  id_fletero: string;
  nombre_fletero: string;
  razon_social: string;
  cuit: string;
  contacto_principal: string;
  telefono: string;
  email: string;
  rating_promedio: number;
  total_viajes_completados: number;
  total_viajes_cancelados: number;
  unidades_disponibles: number;
  tipos_unidades: string;
  radio_operativo_km: number;
  zonas_operativas: string;
  activo: boolean;
  fecha_registro: string;
  codigo_acceso_marketplace: string;
  observaciones?: string;
}

export interface RatingMarketplace {
  id_rating: string;
  HDR_viaje: string;
  hdr: string;
  fletero_nombre: string;
  rating_puntualidad: number;
  rating_calidad: number;
  rating_documentacion: number;
  rating_comunicacion: number;
  rating_promedio: number;
  comentarios: string;
  fecha_calificacion: string;
  calificado_por: string;
  viaje_completado_a_tiempo: 'SI' | 'NO';
  incidencias: string;
}

export interface FleteroScore {
  fletero_id: string;
  fletero_nombre: string;
  precio_ofertado: number;
  rating_historico: number;
  viajes_completados: number;
  score_total: number;
  recomendado: boolean;
  detalles_score: {
    score_precio: number;
    score_rating: number;
    score_experiencia: number;
    score_tiempo: number;
  };
}

export interface FleterosPerfil {
  id_fletero: string;
  nombre_fletero: string;
  razon_social: string;
  cuit: string;
  contacto_principal: string;
  telefono: string;
  email: string;
  rating_promedio: number;
  total_viajes_completados: number;
  total_viajes_cancelados: number;
  unidades_disponibles: UnidadFletero[];
  tipos_unidades: string[];
  radio_operativo_km: number;
  zonas_operativas: string[];
  activo: boolean;
  fecha_registro: string;
  codigo_acceso_marketplace?: string;
  observaciones?: string;
}

export interface UnidadFletero {
  tipo: string;
  patente: string;
  chofer: string;
}

// ============================================
// 1. VIAJES - CRUD
// ============================================

/**
 * Crear un nuevo viaje en el marketplace
 * @param viaje - Datos del viaje
 * @param estado - Estado inicial (por defecto: 'BORRADOR')
 * @param fleteroAsignado - Fletero asignado (solo para asignación directa)
 */
export async function crearViajeMarketplace(
  viaje: Partial<ViajeMarketplace>,
  estado: 'BORRADOR' | 'PUBLICADO' | 'ASIGNADO' = 'BORRADOR',
  fleteroAsignado?: string
): Promise<string> {
  console.log('[MarketplaceAPI] Creando viaje...', viaje, 'Estado:', estado, 'Fletero:', fleteroAsignado);

  const SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

  if (!SCRIPT_URL) {
    throw new Error('VITE_GOOGLE_APPS_SCRIPT_URL no está configurado en .env');
  }

  console.log('[MarketplaceAPI] Script URL:', SCRIPT_URL);

  // Generar HDR único
  const HDR_viaje = `VJ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  const payload = {
    action: 'CREATE_MARKETPLACE_VIAJE',
    data: {
      HDR_viaje: HDR_viaje,
      cliente_id: viaje.cliente_id || '',
      cliente_nombre: viaje.cliente_nombre || '',
      fecha_viaje: viaje.fecha_viaje || '',
      fecha_publicacion: new Date().toISOString(),
      estado: estado,
      precio_base: viaje.precio_base || 0,
      tipo_unidad_requerida: viaje.tipo_unidad_requerida || '',
      peso_kg: viaje.peso_kg || 0,
      tipo_carga: viaje.tipo_carga || '',
      detalles_ruta: JSON.stringify(viaje.detalles_ruta || []),
      tiempo_limite_oferta: viaje.tiempo_limite_oferta || '',
      total_ofertas: 0,
      fletero_asignado: fleteroAsignado || '',
      precio_final: estado === 'ASIGNADO' ? viaje.precio_base || 0 : '',
      hdr_generado: viaje.hdr_generado || '', // HDR del usuario
      fecha_asignacion: estado === 'ASIGNADO' ? new Date().toISOString() : '',
      fecha_completado: '',
      rating_viaje: '',
      notas_internas: viaje.notas_internas || '',
    }
  };

  console.log('[MarketplaceAPI] Payload completo:', JSON.stringify(payload, null, 2));

  try {
    console.log('[MarketplaceAPI] Enviando request a Google Apps Script...');
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    console.log('[MarketplaceAPI] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MarketplaceAPI] Error response:', errorText);
      throw new Error(`Error al crear viaje: ${response.statusText} - ${errorText}`);
    }

    const result = await response.text();
    console.log('[MarketplaceAPI] Response body:', result);
    console.log('[MarketplaceAPI] ✅ Viaje creado exitosamente:', HDR_viaje);
    return HDR_viaje;
  } catch (error) {
    console.error('[MarketplaceAPI] ❌ Error al crear viaje:', error);
    throw error;
  }
}

/**
 * Eliminar un viaje del marketplace
 */
export async function eliminarViajeMarketplace(HDR_viaje: string): Promise<void> {
  console.log('[MarketplaceAPI] Eliminando viaje:', HDR_viaje);

  const SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

  if (!SCRIPT_URL) {
    throw new Error('VITE_GOOGLE_APPS_SCRIPT_URL no está configurado en .env');
  }

  const payload = {
    action: 'DELETE_MARKETPLACE_VIAJE',
    data: {
      HDR_viaje: HDR_viaje
    }
  };

  console.log('[MarketplaceAPI] Payload:', JSON.stringify(payload, null, 2));

  try {
    console.log('[MarketplaceAPI] Enviando request a Google Apps Script...');
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    console.log('[MarketplaceAPI] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MarketplaceAPI] Error response:', errorText);
      throw new Error(`Error al eliminar viaje: ${response.statusText} - ${errorText}`);
    }

    const result = await response.text();
    console.log('[MarketplaceAPI] Response body:', result);
    console.log('[MarketplaceAPI] ✅ Viaje eliminado exitosamente:', HDR_viaje);
  } catch (error) {
    console.error('[MarketplaceAPI] ❌ Error al eliminar viaje:', error);
    throw error;
  }
}

/**
 * Obtener todos los viajes del marketplace (opcionalmente filtrados por estado)
 */
export async function obtenerViajesMarketplace(estado?: string): Promise<ViajeMarketplace[]> {
  console.log('[MarketplaceAPI] Obteniendo viajes...', estado ? `Estado: ${estado}` : 'Todos');

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${MARKETPLACE_SPREADSHEET_ID}/values/Marketplace_Viajes!A2:T?key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.values || data.values.length === 0) {
      console.log('[MarketplaceAPI] No hay viajes en el marketplace');
      return [];
    }

    const viajes: ViajeMarketplace[] = data.values.map((row: any[]) => ({
      HDR_viaje: row[0] || '',
      cliente_id: row[1] || '',
      cliente_nombre: row[2] || '',
      fecha_viaje: row[3] || '',
      fecha_publicacion: row[4] || '',
      estado: row[5] || 'BORRADOR',
      precio_base: Number(row[6]) || 0,
      tipo_unidad_requerida: row[7] || '',
      peso_kg: Number(row[8]) || 0,
      tipo_carga: row[9] || '',
      detalles_ruta: row[10] ? JSON.parse(row[10]) : [],
      tiempo_limite_oferta: row[11] || '',
      total_ofertas: Number(row[12]) || 0,
      fletero_asignado: row[13] || undefined,
      precio_final: row[14] ? Number(row[14]) : undefined,
      hdr_generado: row[15] || undefined,
      fecha_asignacion: row[16] || undefined,
      fecha_completado: row[17] || undefined,
      rating_viaje: row[18] ? Number(row[18]) : undefined,
      notas_internas: row[19] || undefined,
    }));

    const viajesFiltrados = estado
      ? viajes.filter(v => v.estado === estado)
      : viajes;

    console.log(`[MarketplaceAPI] ${viajesFiltrados.length} viajes obtenidos`);
    return viajesFiltrados;
  } catch (error) {
    console.error('[MarketplaceAPI] Error al obtener viajes:', error);
    throw error;
  }
}

/**
 * Obtener un viaje específico por su HDR
 */
export async function obtenerViajeByHDR(HDR_viaje: string): Promise<ViajeMarketplace | null> {
  const viajes = await obtenerViajesMarketplace();
  const viaje = viajes.find(v => v.HDR_viaje === HDR_viaje);
  return viaje || null;
}

// ============================================
// 2. OFERTAS - CRUD
// ============================================

/**
 * Crear una nueva oferta para un viaje
 */
export async function crearOferta(oferta: Partial<OfertaMarketplace>): Promise<string> {
  console.log('[MarketplaceAPI] Creando oferta...', oferta);

  const id_oferta = `OF-${Date.now()}`;

  const row = [
    id_oferta,                                    // A: id_oferta
    oferta.HDR_viaje || '',                       // B: HDR_viaje
    oferta.fletero_nombre || '',                  // C: fletero_nombre
    oferta.fletero_id || '',                      // D: fletero_id
    oferta.precio_ofertado || 0,                  // E: precio_ofertado
    oferta.unidad_ofrecida || '',                 // F: unidad_ofrecida
    oferta.patente_unidad || '',                  // G: patente_unidad
    oferta.chofer_asignado || '',                 // H: chofer_asignado
    oferta.telefono_chofer || '',                 // I: telefono_chofer
    oferta.tiempo_estimado_horas || 0,            // J: tiempo_estimado_horas
    oferta.mensaje_adicional || '',               // K: mensaje_adicional
    new Date().toISOString(),                     // L: fecha_oferta
    'PENDIENTE',                                  // M: estado
    '',                                           // N: score_algoritmo (se calcula después)
    '',                                           // O: fecha_respuesta
    '',                                           // P: motivo_rechazo
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${MARKETPLACE_SPREADSHEET_ID}/values/Marketplace_Ofertas!A:P:append?valueInputOption=RAW&key=${API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] }),
    });

    if (!response.ok) {
      throw new Error(`Error al crear oferta: ${response.statusText}`);
    }

    console.log('[MarketplaceAPI] Oferta creada:', id_oferta);

    // Incrementar contador de ofertas en el viaje
    // TODO: Implementar actualización de total_ofertas

    return id_oferta;
  } catch (error) {
    console.error('[MarketplaceAPI] Error al crear oferta:', error);
    throw error;
  }
}

/**
 * Obtener todas las ofertas de un viaje específico
 */
export async function obtenerOfertasDeViaje(HDR_viaje: string): Promise<OfertaMarketplace[]> {
  console.log('[MarketplaceAPI] Obteniendo ofertas del viaje:', HDR_viaje);

  const SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

  if (!SCRIPT_URL) {
    throw new Error('VITE_GOOGLE_APPS_SCRIPT_URL no está configurado en .env');
  }

  const payload = {
    action: 'GET_OFERTAS_VIAJE',
    HDR_viaje: HDR_viaje
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MarketplaceAPI] Error response:', errorText);
      throw new Error(`Error al obtener ofertas: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Error al obtener ofertas');
    }

    const ofertas: OfertaMarketplace[] = result.data || [];

    console.log(`[MarketplaceAPI] ${ofertas.length} ofertas obtenidas`);
    return ofertas;
  } catch (error) {
    console.error('[MarketplaceAPI] Error al obtener ofertas:', error);
    throw error;
  }
}

// ============================================
// 3. ALGORITMO DE RECOMENDACIÓN
// ============================================

/**
 * Calcular score de todas las ofertas y determinar el ganador recomendado
 */
export async function calcularScoreOfertas(ofertas: OfertaMarketplace[]): Promise<FleteroScore[]> {
  console.log('[MarketplaceAPI] Calculando scores de', ofertas.length, 'ofertas...');

  if (ofertas.length === 0) return [];

  // Pesos del algoritmo (suman 1.0)
  const PESO_PRECIO = 0.40;        // 40% - Precio más bajo es mejor
  const PESO_RATING = 0.30;        // 30% - Rating histórico
  const PESO_EXPERIENCIA = 0.20;   // 20% - Cantidad de viajes completados
  const PESO_TIEMPO = 0.10;        // 10% - Tiempo de respuesta

  const scores: FleteroScore[] = await Promise.all(
    ofertas.map(async (oferta) => {
      // 1. SCORE PRECIO (normalizado 0-10, menor precio = mayor score)
      const precioMin = Math.min(...ofertas.map(o => o.precio_ofertado));
      const precioMax = Math.max(...ofertas.map(o => o.precio_ofertado));
      const scorePrecio = precioMax > precioMin
        ? 10 - ((oferta.precio_ofertado - precioMin) / (precioMax - precioMin)) * 10
        : 10;

      // 2. SCORE RATING (obtener de BD o usar placeholder)
      // TODO: Obtener rating real desde Marketplace_Ratings o Fleteros_Perfil
      const scoreRating = 8.0; // Placeholder (escala 0-10)

      // 3. SCORE EXPERIENCIA (obtener de BD o usar placeholder)
      // TODO: Obtener total de viajes completados
      const scoreExperiencia = 7.5; // Placeholder (escala 0-10)

      // 4. SCORE TIEMPO (más rápido en responder = mejor)
      // TODO: Calcular según diferencia entre fecha_publicacion y fecha_oferta
      const scoreTiempo = 8.5; // Placeholder (escala 0-10)

      // SCORE TOTAL (promedio ponderado)
      const score_total =
        scorePrecio * PESO_PRECIO +
        scoreRating * PESO_RATING +
        scoreExperiencia * PESO_EXPERIENCIA +
        scoreTiempo * PESO_TIEMPO;

      return {
        fletero_id: oferta.fletero_id,
        fletero_nombre: oferta.fletero_nombre,
        precio_ofertado: oferta.precio_ofertado,
        rating_historico: scoreRating,
        viajes_completados: 0, // TODO: Obtener real
        score_total: Math.round(score_total * 10) / 10,
        recomendado: false, // Se marca después
        detalles_score: {
          score_precio: Math.round(scorePrecio * 10) / 10,
          score_rating: scoreRating,
          score_experiencia: scoreExperiencia,
          score_tiempo: scoreTiempo,
        },
      };
    })
  );

  // Marcar el mejor score como RECOMENDADO
  const maxScore = Math.max(...scores.map(s => s.score_total));
  scores.forEach(s => {
    if (s.score_total === maxScore) {
      s.recomendado = true;
    }
  });

  // Ordenar por score descendente (mejor primero)
  const scoresOrdenados = scores.sort((a, b) => b.score_total - a.score_total);

  console.log('[MarketplaceAPI] Score calculado. Recomendado:', scoresOrdenados[0]?.fletero_nombre);

  return scoresOrdenados;
}

// ============================================
// 4. ASIGNACIÓN (REQUIERE AUTORIZACIÓN MANUAL)
// ============================================

/**
 * Asignar viaje a un fletero específico (requiere autorización de CROSSLOG)
 * @param HDR_viaje - HDR del viaje a asignar
 * @param fletero_id - ID del fletero ganador
 * @param precio_final - Precio final acordado
 * @param autorizado_por - Usuario que autoriza (ej: "crosslog_admin")
 */
export async function asignarViajeAFletero(
  HDR_viaje: string,
  fletero_id: string,
  precio_final: number,
  autorizado_por: string
): Promise<void> {
  console.log(`[MarketplaceAPI] Asignando viaje ${HDR_viaje} a fletero ${fletero_id} - Autorizado por: ${autorizado_por}`);

  const SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

  try {
    // 1. Obtener el viaje actual
    const viaje = await obtenerViajeByHDR(HDR_viaje);
    if (!viaje) {
      throw new Error('Viaje no encontrado');
    }

    // 2. Obtener todas las ofertas del viaje
    const ofertas = await obtenerOfertasDeViaje(HDR_viaje);
    const ofertaGanadora = ofertas.find(o => o.fletero_id === fletero_id);

    if (!ofertaGanadora) {
      throw new Error('Oferta del fletero no encontrada');
    }

    // 3. Actualizar el viaje a ASIGNADO
    const updateViajePayload = {
      action: 'UPDATE_MARKETPLACE_VIAJE',
      HDR_viaje: HDR_viaje,
      updates: {
        estado: 'ASIGNADO',
        fletero_asignado: fletero_id,
        precio_final: precio_final,
        fecha_asignacion: new Date().toISOString(),
      }
    };

    const viajeResponse = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(updateViajePayload),
    });

    if (!viajeResponse.ok) {
      throw new Error('Error al actualizar viaje');
    }

    console.log('[MarketplaceAPI] Viaje actualizado a ASIGNADO');

    // 4. Actualizar la oferta ganadora a ACEPTADA
    const updateOfertaGanadoraPayload = {
      action: 'UPDATE_MARKETPLACE_OFERTA',
      id_oferta: ofertaGanadora.id_oferta,
      updates: {
        estado: 'ACEPTADA',
        fecha_respuesta: new Date().toISOString(),
      }
    };

    await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(updateOfertaGanadoraPayload),
    });

    console.log('[MarketplaceAPI] Oferta ganadora marcada como ACEPTADA');

    // 5. Rechazar las demás ofertas
    const ofertasRechazadas = ofertas.filter(o => o.fletero_id !== fletero_id);

    for (const oferta of ofertasRechazadas) {
      const updateOfertaRechazadaPayload = {
        action: 'UPDATE_MARKETPLACE_OFERTA',
        id_oferta: oferta.id_oferta,
        updates: {
          estado: 'RECHAZADA',
          fecha_respuesta: new Date().toISOString(),
          motivo_rechazo: 'Se asignó a otro fletero',
        }
      };

      await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(updateOfertaRechazadaPayload),
      });
    }

    console.log(`[MarketplaceAPI] ${ofertasRechazadas.length} ofertas rechazadas`);

    // 6. TODO: Generar HDR en BASE si aplica
    // 7. TODO: Enviar notificaciones push a fleteros

    console.log(`[MarketplaceAPI] ✅ Viaje ${HDR_viaje} asignado exitosamente a ${fletero_id}`);
  } catch (error) {
    console.error('[MarketplaceAPI] Error al asignar viaje:', error);
    throw error;
  }
}

// ============================================
// 5. FLETEROS - PERFIL
// ============================================

/**
 * Obtener perfil de un fletero
 */
export async function obtenerPerfilFletero(fletero_id: string): Promise<FleteroPerfilMarketplace | null> {
  console.log('[MarketplaceAPI] Obteniendo perfil del fletero:', fletero_id);

  const SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

  if (!SCRIPT_URL) {
    throw new Error('VITE_GOOGLE_APPS_SCRIPT_URL no está configurado en .env');
  }

  const payload = {
    action: 'GET_FLETERO_PERFIL',
    fletero_id: fletero_id
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MarketplaceAPI] Error response:', errorText);
      throw new Error(`Error al obtener perfil: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      console.log('[MarketplaceAPI] Fletero no encontrado:', fletero_id);
      return null;
    }

    console.log('[MarketplaceAPI] Perfil de fletero obtenido:', result.data.nombre_fletero);
    return result.data;
  } catch (error) {
    console.error('[MarketplaceAPI] Error al obtener perfil de fletero:', error);
    throw error;
  }
}

/**
 * Obtener todos los fleteros activos
 */
export async function obtenerFleterosActivos(): Promise<FleterosPerfil[]> {
  console.log('[MarketplaceAPI] Obteniendo fleteros activos...');

  // TODO: Implementar lectura de Fleteros_Perfil

  return [];
}

// ============================================
// 6. CONFIRMACIÓN DE FLETERO
// ============================================

/**
 * Confirmar que el fletero acepta el viaje asignado
 * @param HDR_viaje - HDR del viaje
 * @param fletero_nombre - Nombre del fletero que confirma
 */
export async function confirmarViajeFlotero(
  HDR_viaje: string,
  fletero_nombre: string
): Promise<void> {
  console.log(`[MarketplaceAPI] Fletero ${fletero_nombre} confirmando viaje ${HDR_viaje}`);

  const SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

  if (!SCRIPT_URL) {
    throw new Error('VITE_GOOGLE_APPS_SCRIPT_URL no está configurado en .env');
  }

  const payload = {
    action: 'CONFIRMAR_VIAJE_FLETERO',
    data: {
      HDR_viaje: HDR_viaje,
      fletero_nombre: fletero_nombre,
      fecha_confirmacion: new Date().toISOString(),
    }
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MarketplaceAPI] Error response:', errorText);
      throw new Error(`Error al confirmar viaje: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Error al confirmar viaje');
    }

    console.log('[MarketplaceAPI] ✅ Viaje confirmado exitosamente');
  } catch (error) {
    console.error('[MarketplaceAPI] Error al confirmar viaje:', error);
    throw error;
  }
}

/**
 * Aceptar viaje del marketplace (para viajes PUBLICADO)
 * @param HDR_viaje - HDR del viaje
 * @param fletero_nombre - Nombre del fletero que acepta
 * @param fletero_id - ID del fletero
 */
export async function aceptarViajeMarketplace(
  HDR_viaje: string,
  fletero_nombre: string,
  fletero_id: string
): Promise<void> {
  console.log(`[MarketplaceAPI] Fletero ${fletero_nombre} aceptando viaje ${HDR_viaje}`);

  const SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

  if (!SCRIPT_URL) {
    throw new Error('VITE_GOOGLE_APPS_SCRIPT_URL no está configurado en .env');
  }

  const payload = {
    action: 'ACEPTAR_VIAJE_MKT',
    data: {
      HDR_viaje: HDR_viaje,
      fletero_nombre: fletero_nombre,
      fletero_id: fletero_id,
      fecha_aceptacion: new Date().toISOString(),
    }
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MarketplaceAPI] Error response:', errorText);
      throw new Error(`Error al aceptar viaje: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Error al aceptar viaje');
    }

    console.log('[MarketplaceAPI] ✅ Viaje aceptado exitosamente');
  } catch (error) {
    console.error('[MarketplaceAPI] Error al aceptar viaje:', error);
    throw error;
  }
}

/**
 * Rechaza un viaje del marketplace (oculta para el fletero)
 */
export async function rechazarViajeMarketplace(
  HDR_viaje: string,
  fletero_nombre: string
): Promise<void> {
  console.log(`[MarketplaceAPI] Fletero ${fletero_nombre} rechazando viaje ${HDR_viaje}`);

  const SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

  if (!SCRIPT_URL) {
    throw new Error('VITE_GOOGLE_APPS_SCRIPT_URL no está configurado en .env');
  }

  const payload = {
    action: 'RECHAZAR_VIAJE_MKT',
    data: {
      HDR_viaje: HDR_viaje,
      fletero_nombre: fletero_nombre,
      fecha_rechazo: new Date().toISOString(),
    }
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MarketplaceAPI] Error response:', errorText);
      throw new Error(`Error al rechazar viaje: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Error al rechazar viaje');
    }

    console.log('[MarketplaceAPI] ✅ Viaje rechazado exitosamente');
  } catch (error) {
    console.error('[MarketplaceAPI] Error al rechazar viaje:', error);
    throw error;
  }
}
