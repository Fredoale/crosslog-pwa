/**
 * Google Apps Script para CROSSLOG
 *
 * Funcionalidades:
 * 1. Sistema de Documentos (Choferes, Unidades, Cuadernillos)
 * 2. Sistema de Marketplace (Viajes, Ofertas)
 *
 * INSTRUCCIONES DE IMPLEMENTACIÓN:
 * 1. Abre tu Google Spreadsheet de Sistema_Entregas
 * 2. Ve a Extensiones > Apps Script
 * 3. Copia este código en Code.gs
 * 4. Guarda y despliega como Web App
 * 5. Configura: "Ejecutar como: Yo" y "Quién tiene acceso: Cualquier persona"
 * 6. Copia la URL del Web App y agrégala como variable de entorno VITE_GOOGLE_APPS_SCRIPT_URL
 */

// ID del spreadsheet (se obtiene automáticamente)
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

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
    const nuevaNota = `[RECHAZADO por ${fletero_nombre} el ${fecha_rechazo}]`;
    const notasActualizadas = notasActuales ? `${notasActuales}\n${nuevaNota}` : nuevaNota;

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
    const nuevaNota = `[CONFIRMADO por ${fletero_nombre} el ${fecha_confirmacion}]`;
    const notasActualizadas = notasActuales ? `${notasActuales}\n${nuevaNota}` : nuevaNota;

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
