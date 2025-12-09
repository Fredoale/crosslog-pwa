# Configuración de Google Apps Script para Documentos y Marketplace

## Código completo para Google Apps Script

Copia y pega el siguiente código en tu Google Apps Script (Extensiones > Apps Script):

```javascript
/**
 * Maneja las solicitudes POST
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    // Log para debugging
    console.log('Action:', action);
    console.log('Data:', data);

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Switch para manejar todas las acciones
    switch (action) {
      // ========================================
      // SISTEMA DE DOCUMENTOS (original)
      // ========================================
      case 'addChoferDocumento':
        return addChoferDocumento(ss, data);

      case 'addUnidadDocumento':
        return addUnidadDocumento(ss, data);

      case 'addCuadernillo':
        return addCuadernillo(ss, data);

      case 'updateChoferDocumento':
        return updateChoferDocumento(ss, data);

      case 'updateUnidadDocumento':
        return updateUnidadDocumento(ss, data);

      // ========================================
      // SISTEMA DE MARKETPLACE (nuevo)
      // ========================================
      case 'CREATE_MARKETPLACE_VIAJE':
        return createMarketplaceViaje(ss, data);

      case 'UPDATE_MARKETPLACE_VIAJE':
        return updateMarketplaceViaje(ss, data);

      case 'UPDATE_MARKETPLACE_OFERTA':
        return updateMarketplaceOferta(ss, data);

      case 'DELETE_MARKETPLACE_VIAJE':
        return deleteMarketplaceViaje(ss, data);

      case 'CREATE_MARKETPLACE_OFERTA':
        return createMarketplaceOferta(ss, data);

      case 'GET_OFERTAS_VIAJE':
        return getOfertasViaje(ss, data);

      case 'GET_FLETERO_PERFIL':
        return getFleteroPerfilMarketplace(ss, data);

      case 'ACEPTAR_VIAJE_MKT':
        return aceptarViajeMarketplace(ss, data);

      case 'RECHAZAR_VIAJE_MKT':
        return rechazarViajeMarketplace(ss, data);

      case 'CONFIRMAR_VIAJE_FLETERO':
        return confirmarViajeFlotero(ss, data);

      default:
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: 'Acción no reconocida: ' + action
        })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    console.error('Error en doPost:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// SISTEMA DE DOCUMENTOS (FUNCIONES ORIGINALES)
// ============================================
/**
 * Agregar documento de chofer
 */
function addChoferDocumento(ss, data) {
  const sheet = ss.getSheetByName('Choferes_Documentos');

  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Hoja Choferes_Documentos no encontrada'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Columnas: Nombre_Chofer | DNI | Unidad | Tipo_Unidad | Habilidad | Tipo_Doc | Nombre_Documento | Fecha_Vencimiento | URL_Archivo | Es_Propio
  sheet.appendRow([
    data.nombreChofer,
    data.dni,
    data.unidad,
    data.tipoUnidad,
    data.habilidad,
    data.tipoDoc,
    data.nombreDocumento,
    data.fechaVencimiento || '',
    data.urlArchivo,
    data.esPropio ? 'TRUE' : 'FALSE'
  ]);

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Documento de chofer agregado correctamente'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Agregar documento de unidad
 */
function addUnidadDocumento(ss, data) {
  const sheet = ss.getSheetByName('Unidades_Documentos');

  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Hoja Unidades_Documentos no encontrada'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Columnas: Numero_Unidad | Tipo_Unidad | Tipo_Doc | Nombre_Documento | Fecha_Vencimiento | URL_Documento
  sheet.appendRow([
    data.numeroUnidad,
    data.tipoUnidad,
    data.tipoDoc,
    data.nombreDocumento,
    data.fechaVencimiento,
    data.urlDocumento
  ]);

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Documento de unidad agregado correctamente'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Agregar cuadernillo
 */
function addCuadernillo(ss, data) {
  const sheet = ss.getSheetByName('Cuadernillos');

  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Hoja Cuadernillos no encontrada'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Columnas: Nombre_Documento | Mes | Fecha_Emision | Fecha_Vencimiento | URL_Documento
  sheet.appendRow([
    data.nombreDocumento,
    data.mes,
    data.fechaEmision || '',
    data.fechaVencimiento || '',
    data.urlDocumento
  ]);

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Documentación Crosslog agregada correctamente'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Actualizar documento de chofer
 */
function updateChoferDocumento(ss, data) {
  const sheet = ss.getSheetByName('Choferes_Documentos');

  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Hoja Choferes_Documentos no encontrada'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Buscar el documento por nombre del chofer + tipo de documento + nombre del documento
  const allData = sheet.getDataRange().getValues();
  let rowIndex = -1;

  // Columnas: Nombre_Chofer(0) | DNI(1) | Unidad(2) | Tipo_Unidad(3) | Habilidad(4) | Tipo_Doc(5) | Nombre_Documento(6) | Fecha_Vencimiento(7) | URL_Archivo(8) | Es_Propio(9)
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === data.nombreChofer &&
        allData[i][6] === data.nombreDocumento &&
        allData[i][5] === data.tipo) {
      rowIndex = i + 1; // +1 porque las filas empiezan en 1
      break;
    }
  }

  if (rowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Documento no encontrado'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Actualizar los campos editables (nombre documento, fecha vencimiento, URL)
  if (data.nombreDocumento !== undefined) {
    sheet.getRange(rowIndex, 7).setValue(data.nombreDocumento);
  }
  if (data.fechaVencimiento !== undefined) {
    sheet.getRange(rowIndex, 8).setValue(data.fechaVencimiento);
  }
  if (data.urlArchivo !== undefined) {
    sheet.getRange(rowIndex, 9).setValue(data.urlArchivo);
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Documento de chofer actualizado correctamente'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Actualizar documento de unidad
 */
function updateUnidadDocumento(ss, data) {
  const sheet = ss.getSheetByName('Unidades_Documentos');

  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Hoja Unidades_Documentos no encontrada'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Buscar el documento por número de unidad + tipo de documento + nombre del documento
  const allData = sheet.getDataRange().getValues();
  let rowIndex = -1;

  // Columnas: Numero_Unidad(0) | Tipo_Unidad(1) | Tipo_Doc(2) | Nombre_Documento(3) | Fecha_Vencimiento(4) | URL_Documento(5)
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === data.numeroUnidad &&
        allData[i][3] === data.nombreDocumento &&
        allData[i][2] === data.tipo) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Documento no encontrado'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Actualizar los campos editables (nombre documento, fecha vencimiento, URL)
  if (data.nombreDocumento !== undefined) {
    sheet.getRange(rowIndex, 4).setValue(data.nombreDocumento);
  }
  if (data.fechaVencimiento !== undefined) {
    sheet.getRange(rowIndex, 5).setValue(data.fechaVencimiento);
  }
  if (data.urlArchivo !== undefined) {
    sheet.getRange(rowIndex, 6).setValue(data.urlArchivo);
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Documento de unidad actualizado correctamente'
  })).setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// SISTEMA DE MARKETPLACE (NUEVAS FUNCIONES)
// ============================================

/**
 * Crear viaje en Marketplace
 */
function createMarketplaceViaje(ss, requestData) {
  try {
    const sheet = ss.getSheetByName('Marketplace_Viajes');

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Hoja Marketplace_Viajes no encontrada'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = requestData.data;

    // Preparar la fila de datos según las columnas A-T
    const rowData = [
      data.HDR_viaje || '',                    // A: HDR_viaje
      data.cliente_id || '',                   // B: cliente_id
      data.cliente_nombre || '',               // C: cliente_nombre
      data.fecha_viaje || '',                  // D: fecha_viaje
      data.fecha_publicacion || '',            // E: fecha_publicacion
      data.estado || 'BORRADOR',               // F: estado
      data.precio_base || 0,                   // G: precio_base
      data.tipo_unidad_requerida || '',        // H: tipo_unidad_requerida
      data.peso_kg || 0,                       // I: peso_kg
      data.tipo_carga || '',                   // J: tipo_carga
      data.detalles_ruta || '',                // K: detalles_ruta (JSON string)
      data.tiempo_limite_oferta || '',         // L: tiempo_limite_oferta
      data.total_ofertas || 0,                 // M: total_ofertas
      data.fletero_asignado || '',             // N: fletero_asignado
      data.precio_final || '',                 // O: precio_final
      data.hdr_generado || '',                 // P: hdr_generado
      data.fecha_asignacion || '',             // Q: fecha_asignacion
      data.fecha_completado || '',             // R: fecha_completado
      data.rating_viaje || '',                 // S: rating_viaje
      data.notas_internas || ''                // T: notas_internas
    ];

    // Agregar al final
    sheet.appendRow(rowData);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Viaje creado exitosamente en marketplace',
      data: {
        HDR_viaje: data.HDR_viaje,
        row: sheet.getLastRow()
      }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error en createMarketplaceViaje:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error al crear viaje: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Actualizar viaje en Marketplace
 */
function updateMarketplaceViaje(ss, requestData) {
  try {
    const sheet = ss.getSheetByName('Marketplace_Viajes');

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Hoja Marketplace_Viajes no encontrada'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const HDR_viaje = requestData.HDR_viaje;
    const updates = requestData.updates;

    // Buscar la fila por HDR_viaje (columna A)
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === HDR_viaje) {
        rowIndex = i + 1; // +1 porque getValues() es 0-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Viaje no encontrado: ' + HDR_viaje
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Mapeo de campos a columnas (basado en 1-indexed)
    const columnMap = {
      estado: 6,                    // F
      fletero_asignado: 14,         // N
      precio_final: 15,             // O
      hdr_generado: 16,             // P
      fecha_asignacion: 17,         // Q
      fecha_completado: 18,         // R
      rating_viaje: 19              // S
    };

    // Actualizar cada campo
    for (const [field, value] of Object.entries(updates)) {
      if (columnMap[field]) {
        sheet.getRange(rowIndex, columnMap[field]).setValue(value);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Viaje actualizado exitosamente',
      data: {
        HDR_viaje: HDR_viaje,
        row: rowIndex
      }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error en updateMarketplaceViaje:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error al actualizar viaje: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Actualizar oferta en Marketplace
 */
function updateMarketplaceOferta(ss, requestData) {
  try {
    const sheet = ss.getSheetByName('Marketplace_Ofertas');

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Hoja Marketplace_Ofertas no encontrada'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const id_oferta = requestData.id_oferta;
    const updates = requestData.updates;

    // Buscar la fila por id_oferta (columna A)
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id_oferta) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Oferta no encontrada: ' + id_oferta
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Mapeo de campos a columnas
    const columnMap = {
      estado: 13,              // M
      fecha_respuesta: 15,     // O
      motivo_rechazo: 16       // P
    };

    // Actualizar cada campo
    for (const [field, value] of Object.entries(updates)) {
      if (columnMap[field]) {
        sheet.getRange(rowIndex, columnMap[field]).setValue(value);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Oferta actualizada exitosamente',
      data: {
        id_oferta: id_oferta,
        row: rowIndex
      }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error en updateMarketplaceOferta:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error al actualizar oferta: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Eliminar viaje del Marketplace
 */
function deleteMarketplaceViaje(ss, requestData) {
  try {
    const sheet = ss.getSheetByName('Marketplace_Viajes');

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Hoja Marketplace_Viajes no encontrada'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const HDR_viaje = requestData.data.HDR_viaje;

    // Buscar la fila por HDR_viaje (columna A)
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === HDR_viaje) {
        rowIndex = i + 1; // +1 porque getValues() es 0-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Viaje no encontrado: ' + HDR_viaje
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Eliminar la fila
    sheet.deleteRow(rowIndex);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Viaje eliminado exitosamente',
      data: {
        HDR_viaje: HDR_viaje,
        row: rowIndex
      }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error en deleteMarketplaceViaje:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error al eliminar viaje: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Obtener todas las ofertas de un viaje
 */
function getOfertasViaje(ss, requestData) {
  try {
    const sheet = ss.getSheetByName('Marketplace_Ofertas');

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Hoja Marketplace_Ofertas no encontrada'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const HDR_viaje = requestData.HDR_viaje;

    // Obtener todos los datos
    const data = sheet.getDataRange().getValues();
    const headerRow = data[0];

    // Mapear columnas
    const columnMap = {
      id_oferta: 0,           // A
      HDR_viaje: 1,           // B
      fletero_nombre: 2,      // C
      fletero_id: 3,          // D
      precio_ofertado: 4,     // E
      unidad_ofrecida: 5,     // F
      patente_unidad: 6,      // G
      chofer_asignado: 7,     // H
      telefono_chofer: 8,     // I
      tiempo_estimado_horas: 9, // J
      mensaje_adicional: 10,  // K
      fecha_oferta: 11,       // L
      estado: 12,             // M
      score_algoritmo: 13,    // N
      fecha_respuesta: 14,    // O
      motivo_rechazo: 15      // P
    };

    // Filtrar ofertas del viaje
    const ofertas = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][columnMap.HDR_viaje] === HDR_viaje) {
        ofertas.push({
          id_oferta: data[i][columnMap.id_oferta],
          HDR_viaje: data[i][columnMap.HDR_viaje],
          fletero_nombre: data[i][columnMap.fletero_nombre],
          fletero_id: data[i][columnMap.fletero_id],
          precio_ofertado: data[i][columnMap.precio_ofertado],
          unidad_ofrecida: data[i][columnMap.unidad_ofrecida],
          patente_unidad: data[i][columnMap.patente_unidad],
          chofer_asignado: data[i][columnMap.chofer_asignado],
          telefono_chofer: data[i][columnMap.telefono_chofer],
          tiempo_estimado_horas: data[i][columnMap.tiempo_estimado_horas],
          mensaje_adicional: data[i][columnMap.mensaje_adicional],
          fecha_oferta: data[i][columnMap.fecha_oferta],
          estado: data[i][columnMap.estado],
          score_algoritmo: data[i][columnMap.score_algoritmo],
          fecha_respuesta: data[i][columnMap.fecha_respuesta],
          motivo_rechazo: data[i][columnMap.motivo_rechazo]
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: ofertas,
      total: ofertas.length
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error en getOfertasViaje:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error al obtener ofertas: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Obtener perfil de un fletero
 */
function getFleteroPerfilMarketplace(ss, requestData) {
  try {
    const sheet = ss.getSheetByName('Fleteros_Perfil');

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Hoja Fleteros_Perfil no encontrada'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const fletero_id = requestData.fletero_id;

    // Obtener todos los datos
    const data = sheet.getDataRange().getValues();
    const headerRow = data[0];

    // Mapear columnas (según tu estructura de 18 columnas)
    const columnMap = {
      id_fletero: 0,                      // A
      nombre_fletero: 1,                  // B
      razon_social: 2,                    // C
      cuit: 3,                            // D
      contacto_principal: 4,              // E
      telefono: 5,                        // F
      email: 6,                           // G
      rating_promedio: 7,                 // H
      total_viajes_completados: 8,        // I
      total_viajes_cancelados: 9,         // J
      unidades_disponibles: 10,           // K
      tipos_unidades: 11,                 // L
      radio_operativo_km: 12,             // M
      zonas_operativas: 13,               // N
      activo: 14,                         // O
      fecha_registro: 15,                 // P
      codigo_acceso_marketplace: 16,      // Q
      observaciones: 17                   // R
    };

    // Buscar el fletero
    for (let i = 1; i < data.length; i++) {
      if (data[i][columnMap.id_fletero] === fletero_id) {
        const perfil = {
          id_fletero: data[i][columnMap.id_fletero],
          nombre_fletero: data[i][columnMap.nombre_fletero],
          razon_social: data[i][columnMap.razon_social],
          cuit: data[i][columnMap.cuit],
          contacto_principal: data[i][columnMap.contacto_principal],
          telefono: data[i][columnMap.telefono],
          email: data[i][columnMap.email],
          rating_promedio: data[i][columnMap.rating_promedio] || 0,
          total_viajes_completados: data[i][columnMap.total_viajes_completados] || 0,
          total_viajes_cancelados: data[i][columnMap.total_viajes_cancelados] || 0,
          unidades_disponibles: data[i][columnMap.unidades_disponibles] || 0,
          tipos_unidades: data[i][columnMap.tipos_unidades],
          radio_operativo_km: data[i][columnMap.radio_operativo_km] || 0,
          zonas_operativas: data[i][columnMap.zonas_operativas],
          activo: data[i][columnMap.activo],
          fecha_registro: data[i][columnMap.fecha_registro],
          codigo_acceso_marketplace: data[i][columnMap.codigo_acceso_marketplace],
          observaciones: data[i][columnMap.observaciones] || ''
        };

        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          data: perfil
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Si no se encontró
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Fletero no encontrado'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error en getFleteroPerfilMarketplace:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error al obtener perfil de fletero: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Crear oferta en Marketplace
 */
function createMarketplaceOferta(ss, requestData) {
  try {
    const sheetOfertas = ss.getSheetByName('Marketplace_Ofertas');
    const sheetViajes = ss.getSheetByName('Marketplace_Viajes');

    if (!sheetOfertas) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Hoja Marketplace_Ofertas no encontrada'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (!sheetViajes) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Hoja Marketplace_Viajes no encontrada'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = requestData.data;

    // 1. Generar ID único para la oferta
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    const id_oferta = 'OFT-' + timestamp + '-' + random;

    // 2. Validar que el viaje existe y está PUBLICADO
    const viajesData = sheetViajes.getDataRange().getValues();
    const headerRow = viajesData[0];
    let viajeIndex = -1;

    for (let i = 1; i < viajesData.length; i++) {
      if (viajesData[i][0] === data.HDR_viaje) {
        viajeIndex = i;
        break;
      }
    }

    if (viajeIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Viaje no encontrado'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const estadoIndex = headerRow.indexOf('estado');
    const estadoViaje = viajesData[viajeIndex][estadoIndex];

    if (estadoViaje !== 'PUBLICADO') {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'El viaje no está disponible para ofertas'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Verificar que el fletero no haya ofertado antes en este viaje
    const ofertasData = sheetOfertas.getDataRange().getValues();
    let yaOferto = false;

    for (let i = 1; i < ofertasData.length; i++) {
      if (ofertasData[i][1] === data.HDR_viaje && ofertasData[i][3] === data.fletero_id) {
        yaOferto = true;
        break;
      }
    }

    if (yaOferto) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Ya has ofertado en este viaje'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. Crear fecha actual
    const now = new Date();
    const fecha_oferta = Utilities.formatDate(now, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd HH:mm:ss');

    // 5. Preparar nueva fila para Marketplace_Ofertas
    // A: id_oferta, B: HDR_viaje, C: fletero_nombre, D: fletero_id,
    // E: precio_ofertado, F: unidad_ofrecida, G: patente_unidad,
    // H: chofer_asignado, I: telefono_chofer, J: tiempo_estimado_horas,
    // K: mensaje_adicional, L: fecha_oferta, M: estado,
    // N: score_algoritmo, O: fecha_respuesta, P: motivo_rechazo

    const nuevaOferta = [
      id_oferta,                           // A: id_oferta
      data.HDR_viaje,                      // B: HDR_viaje
      data.fletero_nombre,                 // C: fletero_nombre
      data.fletero_id,                     // D: fletero_id
      data.precio_ofertado,                // E: precio_ofertado
      data.unidad_ofrecida,                // F: unidad_ofrecida
      data.patente_unidad,                 // G: patente_unidad
      data.chofer_asignado,                // H: chofer_asignado
      data.telefono_chofer,                // I: telefono_chofer
      data.tiempo_estimado_horas,          // J: tiempo_estimado_horas
      data.mensaje_adicional || '',        // K: mensaje_adicional
      fecha_oferta,                        // L: fecha_oferta
      'PENDIENTE',                         // M: estado
      '',                                  // N: score_algoritmo (se calcula después)
      '',                                  // O: fecha_respuesta
      ''                                   // P: motivo_rechazo
    ];

    // 6. Insertar nueva oferta
    sheetOfertas.appendRow(nuevaOferta);

    // 7. Incrementar contador total_ofertas en el viaje
    const totalOfertasIndex = headerRow.indexOf('total_ofertas');
    const currentTotal = viajesData[viajeIndex][totalOfertasIndex] || 0;
    sheetViajes.getRange(viajeIndex + 1, totalOfertasIndex + 1).setValue(currentTotal + 1);

    // 8. Retornar éxito
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Oferta creada exitosamente',
      data: {
        id_oferta: id_oferta,
        row: sheetOfertas.getLastRow()
      }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error en createMarketplaceOferta:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error al crear oferta: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// FUNCIONES DE TEST
// ============================================

/**
 * Función de test para documentos
 * Ejecuta esta función desde el editor para probar que funciona
 */
function testDocumentos() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const testData = {
      nombreChofer: 'Test Chofer',
      dni: '12345678',
      unidad: '99',
      tipoUnidad: 'Semi',
      habilidad: 'E',
      tipoDoc: 'registro',
      nombreDocumento: 'Test Registro',
      fechaVencimiento: '2025-12-31',
      urlArchivo: 'https://example.com/test.pdf',
      esPropio: true
    };

    const result = addChoferDocumento(ss, testData);
    console.log('✅ Test Documentos:', result.getContent());
    Logger.log('✅ Test Documentos completado correctamente');
    Logger.log(result.getContent());
  } catch (error) {
    console.error('❌ Error en test:', error);
    Logger.log('❌ Error: ' + error.toString());
  }
}

/**
 * Función de test para marketplace
 * Ejecuta esta función desde el editor para probar que funciona
 */
function testMarketplace() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const testData = {
      data: {
        HDR_viaje: 'TEST-' + Date.now(),
        cliente_id: 'CLI001',
        cliente_nombre: 'Cliente Test',
        fecha_viaje: '2025-12-01',
        fecha_publicacion: new Date().toISOString(),
        estado: 'BORRADOR',
        precio_base: 50000,
        tipo_unidad_requerida: 'Semi',
        peso_kg: 20000,
        tipo_carga: 'GENERALES',
        detalles_ruta: JSON.stringify([
          { numero: 'C1', tipo: 'CARGA', direccion: 'Test Carga', horario_desde: '08:00', horario_hasta: '10:00' },
          { numero: 'D1', tipo: 'DESCARGA', direccion: 'Test Descarga', horario_desde: '14:00', horario_hasta: '16:00' }
        ]),
        tiempo_limite_oferta: new Date(Date.now() + 24*60*60*1000).toISOString(),
        total_ofertas: 0,
        notas_internas: 'Test de marketplace'
      }
    };

    const result = createMarketplaceViaje(ss, testData);
    console.log('✅ Test Marketplace:', result.getContent());
    Logger.log('✅ Test Marketplace completado correctamente');
    Logger.log(result.getContent());
  } catch (error) {
    console.error('❌ Error en test:', error);
    Logger.log('❌ Error: ' + error.toString());
  }
}

/**
 * Función de test completa que prueba el flujo doPost
 * Esta simula una petición HTTP POST real
 */
function testDoPost() {
  try {
    const testData = {
      action: 'CREATE_MARKETPLACE_VIAJE',
      data: {
        HDR_viaje: 'TEST-DOPOST-' + Date.now(),
        cliente_id: 'CLI001',
        cliente_nombre: 'Cliente Test DoPost',
        fecha_viaje: '2025-12-01',
        fecha_publicacion: new Date().toISOString(),
        estado: 'BORRADOR',
        precio_base: 50000,
        tipo_unidad_requerida: 'Semi',
        peso_kg: 20000,
        tipo_carga: 'GENERALES',
        detalles_ruta: JSON.stringify([
          { numero: 'C1', tipo: 'CARGA', direccion: 'Test Carga', horario_desde: '08:00', horario_hasta: '10:00' },
          { numero: 'D1', tipo: 'DESCARGA', direccion: 'Test Descarga', horario_desde: '14:00', horario_hasta: '16:00' }
        ]),
        tiempo_limite_oferta: new Date(Date.now() + 24*60*60*1000).toISOString(),
        total_ofertas: 0,
        notas_internas: 'Test de marketplace via doPost'
      }
    };

    const mockEvent = {
      postData: {
        contents: JSON.stringify(testData)
      }
    };

    const result = doPost(mockEvent);
    console.log('✅ Test DoPost:', result.getContent());
    Logger.log('✅ Test DoPost completado correctamente');
    Logger.log(result.getContent());
  } catch (error) {
    console.error('❌ Error en test:', error);
    Logger.log('❌ Error: ' + error.toString());
  }
}

/**
 * Test para crear oferta
 * IMPORTANTE: Antes de ejecutar, reemplaza el HDR_viaje con uno real que esté en estado PUBLICADO
 */
function testCreateOferta() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Primero, vamos a buscar un viaje en estado PUBLICADO
    const sheetViajes = ss.getSheetByName('Marketplace_Viajes');
    const viajesData = sheetViajes.getDataRange().getValues();
    const headerRow = viajesData[0];
    const estadoIndex = headerRow.indexOf('estado');

    let HDR_viaje_publicado = null;
    for (let i = 1; i < viajesData.length; i++) {
      if (viajesData[i][estadoIndex] === 'PUBLICADO') {
        HDR_viaje_publicado = viajesData[i][0];
        break;
      }
    }

    if (!HDR_viaje_publicado) {
      Logger.log('❌ No hay viajes en estado PUBLICADO. Primero crea uno o cambia el estado de un viaje a PUBLICADO.');
      return;
    }

    Logger.log('✅ Viaje encontrado: ' + HDR_viaje_publicado);

    // 2. Crear la oferta de test
    const testData = {
      data: {
        HDR_viaje: HDR_viaje_publicado,
        fletero_nombre: 'Transportes Test',
        fletero_id: 'FLET-TEST-001',
        precio_ofertado: 45000,
        unidad_ofrecida: 'Camión 3 ejes',
        patente_unidad: 'ABC123',
        chofer_asignado: 'Juan Pérez',
        telefono_chofer: '1156789012',
        tiempo_estimado_horas: 6,
        mensaje_adicional: 'Disponible inmediatamente'
      }
    };

    const result = createMarketplaceOferta(ss, testData);
    console.log('✅ Test Crear Oferta:', result.getContent());
    Logger.log('✅ Test Crear Oferta completado correctamente');
    Logger.log(result.getContent());
  } catch (error) {
    console.error('❌ Error en test:', error);
    Logger.log('❌ Error: ' + error.toString());
  }
}

/**
 * Test para actualizar oferta
 * IMPORTANTE: Antes de ejecutar, verifica que exista una oferta en la hoja
 */
function testUpdateOferta() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Buscar una oferta en estado PENDIENTE
    const sheetOfertas = ss.getSheetByName('Marketplace_Ofertas');
    const ofertasData = sheetOfertas.getDataRange().getValues();

    if (ofertasData.length < 2) {
      Logger.log('❌ No hay ofertas. Primero ejecuta testCreateOferta()');
      return;
    }

    const id_oferta = ofertasData[1][0]; // Primera oferta
    Logger.log('✅ Oferta encontrada: ' + id_oferta);

    // 2. Actualizar la oferta
    const testData = {
      id_oferta: id_oferta,
      updates: {
        estado: 'ACEPTADA',
        fecha_respuesta: new Date().toISOString()
      }
    };

    const result = updateMarketplaceOferta(ss, testData);
    console.log('✅ Test Update Oferta:', result.getContent());
    Logger.log('✅ Test Update Oferta completado');
    Logger.log(result.getContent());
  } catch (error) {
    console.error('❌ Error:', error);
    Logger.log('❌ Error: ' + error.toString());
  }
}

/**
 * Test para obtener ofertas de un viaje
 */
function testGetOfertasViaje() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Buscar un viaje que tenga ofertas
    const sheetOfertas = ss.getSheetByName('Marketplace_Ofertas');
    const ofertasData = sheetOfertas.getDataRange().getValues();

    if (ofertasData.length < 2) {
      Logger.log('❌ No hay ofertas. Primero ejecuta testCreateOferta()');
      return;
    }

    const HDR_viaje = ofertasData[1][1]; // HDR del primer viaje con ofertas
    Logger.log('✅ Buscando ofertas para viaje: ' + HDR_viaje);

    // 2. Obtener ofertas
    const testData = {
      HDR_viaje: HDR_viaje
    };

    const result = getOfertasViaje(ss, testData);
    const response = JSON.parse(result.getContent());

    Logger.log('✅ Test Get Ofertas completado');
    Logger.log('Total de ofertas encontradas: ' + response.total);
    Logger.log(result.getContent());
  } catch (error) {
    console.error('❌ Error:', error);
    Logger.log('❌ Error: ' + error.toString());
  }
}

/**
 * Test para obtener perfil de fletero
 */
function testGetFleteroPerfilMarketplace() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Buscar un fletero en la hoja
    const sheetFleteros = ss.getSheetByName('Fleteros_Perfil');
    const fleterosData = sheetFleteros.getDataRange().getValues();

    if (fleterosData.length < 2) {
      Logger.log('❌ No hay fleteros registrados. Primero crea un fletero en la hoja Fleteros_Perfil');
      return;
    }

    const fletero_id = fleterosData[1][0]; // Primer fletero
    Logger.log('✅ Buscando perfil de fletero: ' + fletero_id);

    // 2. Obtener perfil
    const testData = {
      fletero_id: fletero_id
    };

    const result = getFleteroPerfilMarketplace(ss, testData);
    Logger.log('✅ Test Get Perfil Fletero completado');
    Logger.log(result.getContent());
  } catch (error) {
    console.error('❌ Error:', error);
    Logger.log('❌ Error: ' + error.toString());
  }
}

// ============================================
// ACCIONES DE FLETEROS EN MARKETPLACE
// ============================================

/**
 * Aceptar viaje del marketplace (fletero acepta un viaje PUBLICADO)
 */
function aceptarViajeMarketplace(ss, requestData) {
  try {
    const sheet = ss.getSheetByName('Marketplace_Viajes');

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Hoja Marketplace_Viajes no encontrada'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = requestData.data;
    const HDR_viaje = data.HDR_viaje;
    const fletero_nombre = data.fletero_nombre;
    const fletero_id = data.fletero_id;
    const fecha_aceptacion = data.fecha_aceptacion;

    // Buscar la fila por HDR_viaje (columna A)
    const sheetData = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][0] === HDR_viaje) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Viaje no encontrado: ' + HDR_viaje
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Actualizar el viaje
    // F: estado → CONFIRMADO (El fletero ha confirmado el viaje)
    // N: fletero_asignado → nombre del fletero
    // Q: fecha_asignacion → fecha de aceptación
    sheet.getRange(rowIndex, 6).setValue('CONFIRMADO');
    sheet.getRange(rowIndex, 14).setValue(fletero_nombre);
    sheet.getRange(rowIndex, 17).setValue(fecha_aceptacion);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: fletero_nombre + ' ha confirmado el viaje',
      data: {
        HDR_viaje: HDR_viaje,
        fletero: fletero_nombre,
        estado: 'CONFIRMADO'
      }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error en aceptarViajeMarketplace:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error al aceptar viaje: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Rechazar viaje del marketplace (fletero indica que no le interesa)
 */
function rechazarViajeMarketplace(ss, requestData) {
  try {
    const sheet = ss.getSheetByName('Marketplace_Viajes');

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Hoja Marketplace_Viajes no encontrada'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = requestData.data;
    const HDR_viaje = data.HDR_viaje;
    const fletero_nombre = data.fletero_nombre;
    const fecha_rechazo = data.fecha_rechazo;

    // Buscar la fila por HDR_viaje (columna A)
    const sheetData = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][0] === HDR_viaje) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Viaje no encontrado: ' + HDR_viaje
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Agregar el rechazo a las notas internas (columna T)
    const notasActuales = sheet.getRange(rowIndex, 20).getValue() || '';
    const nuevaNota = '[RECHAZADO por ' + fletero_nombre + ' el ' + fecha_rechazo + ']';
    const notasActualizadas = notasActuales ? notasActuales + '\n' + nuevaNota : nuevaNota;

    sheet.getRange(rowIndex, 20).setValue(notasActualizadas);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Viaje rechazado exitosamente',
      data: {
        HDR_viaje: HDR_viaje,
        fletero: fletero_nombre
      }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error en rechazarViajeMarketplace:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error al rechazar viaje: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Confirmar viaje asignado (fletero confirma que acepta un viaje ASIGNADO)
 */
function confirmarViajeFlotero(ss, requestData) {
  try {
    const sheet = ss.getSheetByName('Marketplace_Viajes');

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Hoja Marketplace_Viajes no encontrada'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = requestData.data;
    const HDR_viaje = data.HDR_viaje;
    const fletero_nombre = data.fletero_nombre;
    const fecha_confirmacion = data.fecha_confirmacion;

    // Buscar la fila por HDR_viaje (columna A)
    const sheetData = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][0] === HDR_viaje) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Viaje no encontrado: ' + HDR_viaje
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Actualizar el estado a CONFIRMADO
    // F: estado → CONFIRMADO
    sheet.getRange(rowIndex, 6).setValue('CONFIRMADO');

    // Agregar confirmación a las notas internas
    const notasActuales = sheet.getRange(rowIndex, 20).getValue() || '';
    const nuevaNota = '[CONFIRMADO por ' + fletero_nombre + ' el ' + fecha_confirmacion + ']';
    const notasActualizadas = notasActuales ? notasActuales + '\n' + nuevaNota : nuevaNota;

    sheet.getRange(rowIndex, 20).setValue(notasActualizadas);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Viaje confirmado exitosamente',
      data: {
        HDR_viaje: HDR_viaje,
        fletero: fletero_nombre,
        estado: 'CONFIRMADO'
      }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error en confirmarViajeFlotero:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Error al confirmar viaje: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

## Despliegue

1. Abre tu Google Sheet
2. Ve a **Extensiones > Apps Script**
3. Pega todo el código de arriba
4. **Guarda** el proyecto
5. Ve a **Implementar > Administrar implementaciones**
6. Haz clic en el **lápiz (editar)** de tu implementación activa
7. Selecciona **Nueva versión**
8. Haz clic en **Implementar**

La URL sigue siendo la misma, no necesitas cambiar nada en tu `.env`.

## Funciones disponibles

### Sistema de Documentos (Original)
- `addChoferDocumento` - Agregar nuevo documento de chofer
- `addUnidadDocumento` - Agregar nuevo documento de unidad
- `addCuadernillo` - Agregar nuevo cuadernillo
- `updateChoferDocumento` - Actualizar documento de chofer existente
- `updateUnidadDocumento` - Actualizar documento de unidad existente

### Sistema de Marketplace
- `CREATE_MARKETPLACE_VIAJE` - Crear viaje
- `UPDATE_MARKETPLACE_VIAJE` - Actualizar viaje
- `DELETE_MARKETPLACE_VIAJE` - Eliminar viaje
- `CREATE_MARKETPLACE_OFERTA` - Crear oferta
- `UPDATE_MARKETPLACE_OFERTA` - Actualizar oferta
- `GET_OFERTAS_VIAJE` - Obtener ofertas de un viaje
- `GET_FLETERO_PERFIL` - Obtener perfil de fletero

### Acciones de Fleteros en Marketplace
- **`ACEPTAR_VIAJE_MKT`** - Fletero acepta un viaje PUBLICADO (cambia estado a CONFIRMADO)
- **`RECHAZAR_VIAJE_MKT`** - Fletero rechaza un viaje PUBLICADO (agrega nota de rechazo)
- **`CONFIRMAR_VIAJE_FLETERO`** - Fletero confirma un viaje ASIGNADO (cambia estado a CONFIRMADO)

## Test de la nueva función

Ejecuta `testCreateOferta()` desde el editor para probar la función.

**IMPORTANTE**: Antes de ejecutar el test, reemplaza el HDR_viaje con uno real que exista en tu hoja y esté en estado `PUBLICADO`.
