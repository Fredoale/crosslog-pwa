/**
 * ============================================================================
 * NODO 2: PROCESAR DATOS DEL WEBHOOK - VERSIÓN CORREGIDA
 * ============================================================================
 *
 * CAMBIOS:
 * 1. ✅ Usa cliente_nombre_completo para Dador_carga (NO cliente)
 * 2. ✅ Procesa y pasa la geolocalización a Google Sheets
 * 3. ✅ Agrega tipo_transporte al output
 */

const webhookData = $input.first().json.body;

console.log('[N8N Nodo 2] Datos recibidos:', JSON.stringify(webhookData, null, 2));

// Extraer datos del webhook
const hdr = webhookData.hdr || webhookData.Numero_HDR;
const numeroEntrega = webhookData.numero_entrega;
const chofer = webhookData.chofer;
const fechaViaje = webhookData.fecha_viaje;

// Cliente y detalles
const clienteId = webhookData.cliente || webhookData.Dador_carga;
// ✅ CORRECCIÓN: Usar cliente_nombre_completo para el Dador de carga
const clienteNombreCompleto = webhookData.cliente_nombre_completo || clienteId;
const detalleEntrega = webhookData.detalle_entregas || webhookData.Detalle_entrega;

// ✅ NUEVO: Extraer tipo de transporte
const tipoTransporte = webhookData.tipo_transporte || '';

// ✅ NUEVO: Extraer geolocalización
let geolocalizacion = '';
if (webhookData.geolocalizacion) {
  const geo = webhookData.geolocalizacion;
  // Formato: "lat,lng" para Google Sheets
  geolocalizacion = `${geo.lat},${geo.lng}`;
  console.log('[N8N Nodo 2] Geolocalización:', geolocalizacion);
}

// Remitos - convertir a JSON string
let numerosRemito = webhookData.numeros_remito || webhookData.numero_remitos;
if (Array.isArray(numerosRemito)) {
  numerosRemito = JSON.stringify(numerosRemito);
} else if (typeof numerosRemito === 'string') {
  // Ya es string, mantener
} else {
  numerosRemito = '[]';
}

// Estado
const estado = webhookData.estado || 'COMPLETADO';

// Cantidad de remitos
const cantRemito = webhookData.numero_remitos || (Array.isArray(webhookData.numeros_remito) ? webhookData.numeros_remito.length : 1);

// Progreso
const progreso = webhookData.progreso || {};
const entregasCompletadas = progreso.entregas_completadas || webhookData.entregas_completadas || 0;
const entregasPendientes = progreso.entregas_pendientes || webhookData.entregas_pendientes || 0;
const progresoPorcentaje = progreso.progreso_porcentaje || webhookData.progreso_porcentaje || 0;

// Construir formato CARGA / DESCARGA para columna L
const entregasCompletadasDetalle = webhookData.entregas_completadas_detalle || [];
const entregasPendientesDetalle = webhookData.entregas_pendientes_detalle || [];

// Combinar todos los destinos (completados + pendientes)
const todosLosDestinos = [...entregasCompletadasDetalle, ...entregasPendientesDetalle];

// ✅ CORRECCIÓN: Usar clienteNombreCompleto (TOYOTA) en lugar de clienteId
let cargaDescarga = '';
if (clienteNombreCompleto && todosLosDestinos.length > 0) {
  const descargaTexto = todosLosDestinos.join(' / ');
  cargaDescarga = `CARGA: ${clienteNombreCompleto} / DESCARGA: ${descargaTexto}`;
} else if (clienteNombreCompleto && detalleEntrega) {
  // Fallback si no hay lista de destinos
  cargaDescarga = `CARGA: ${clienteNombreCompleto} / DESCARGA: ${detalleEntrega}`;
} else {
  cargaDescarga = '';
}

console.log('[N8N Nodo 2] Formato CARGA/DESCARGA:', cargaDescarga);

// Firma receptor - verificar que no sea URL
let firmaReceptor = webhookData.firma_receptor || webhookData.nombre_receptor || '';
if (firmaReceptor.startsWith('http')) {
  console.warn('[N8N Nodo 2] ⚠️ firma_receptor contiene URL, limpiando...');
  firmaReceptor = '';
}

// PDFs - convertir a JSON string
let pdfUrls = webhookData.pdf_urls;
if (Array.isArray(pdfUrls)) {
  pdfUrls = JSON.stringify(pdfUrls);
} else if (typeof pdfUrls === 'string') {
  if (!pdfUrls.startsWith('[')) {
    pdfUrls = JSON.stringify([pdfUrls]);
  }
} else {
  pdfUrls = '[]';
}

// Corregir URLs malformados
pdfUrls = pdfUrls.replace(/\/fbs\/d\//g, '/file/d/');

console.log('[N8N Nodo 2] PDF URLs:', pdfUrls);
console.log('[N8N Nodo 2] Firma receptor:', firmaReceptor);
console.log('[N8N Nodo 2] Geolocalización:', geolocalizacion || 'NO DISPONIBLE');

// Preparar fila para Google Sheets
const filaGoogleSheets = {
  fecha_viaje: fechaViaje,                    // A
  Numero_HDR: hdr,                            // B
  numero_entrega: numeroEntrega,              // C
  numero_remitos: numerosRemito,              // D
  Dador_carga: clienteNombreCompleto,         // E ✅ CORREGIDO: usa cliente_nombre_completo
  Detalle_entrega: detalleEntrega,            // F
  Estado: estado,                             // G
  Chofer: chofer,                             // H
  Cant_remito: cantRemito,                    // I
  entregas_completadas: entregasCompletadas,  // J
  entregas_pendientes: entregasPendientes,    // K
  Carga_Descarga: cargaDescarga,              // L
  firma_receptor: firmaReceptor,              // M
  pdf_urls: pdfUrls,                          // N
  geolocalizacion: geolocalizacion,           // O ✅ NUEVO: columna de geolocalización
  tipo_transporte: tipoTransporte,            // P ✅ NUEVO: tipo de transporte
};

// Retornar datos
return {
  json: {
    // Para Google Sheets
    googleSheets: filaGoogleSheets,

    // Para siguiente nodo
    hdr: hdr,
    chofer: chofer,
    fechaViaje: fechaViaje,
    numeroEntrega: numeroEntrega,
    detalleEntrega: detalleEntrega,
    firmaReceptor: firmaReceptor,
    pdfUrls: pdfUrls,
    numerosRemito: numerosRemito,
    tipo_transporte: tipoTransporte,          // ✅ NUEVO: para usar en nodos siguientes
    geolocalizacion: geolocalizacion,         // ✅ NUEVO: para usar en nodos siguientes

    // Flags
    hdrCompletado: estado === 'COMPLETADO' && entregasPendientes === 0,
    entregasCompletadas: entregasCompletadas,
    entregasPendientes: entregasPendientes,
    progresoPorcentaje: progresoPorcentaje,
  }
};
