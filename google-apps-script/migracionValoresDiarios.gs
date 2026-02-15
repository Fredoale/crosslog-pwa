/**
 * =====================================================
 * CROSSLOG - Script de Migración de Valores Diarios
 * =====================================================
 *
 * Este script convierte los datos de la hoja "Milanesa" (formato horizontal)
 * a la hoja "Valores_Diarios_Distribucion" (formato vertical normalizado)
 *
 * Estructura de Origen (Milanesa):
 * - Columna A: Choferes
 * - Columna B: INTERNO
 * - Columna C: PORTE
 * - Columnas D-AH: Días 1-31
 * - Filas 3-10: Unidades CROSSLOG
 * - Filas 12-15: FLETEROS
 *
 * Valores especiales en las celdas:
 * - "M" (rojo): Unidad en mantenimiento → valor = 0
 * - "V" (negro): Unidad en viaje en curso → valor = 0
 * - Número: Valor generado normal
 * - 0 o vacío: Sin servicio → valor = 0
 *
 * Estructura de Destino (Valores_Diarios_Distribucion):
 * - Columnas: fecha | anio | mes | dia | tipo_transporte | chofer | interno | porte | valor_generado
 *
 * @author CROSSLOG Team
 * @version 1.1
 * @date 2025-12-22
 */

// ==================== CONFIGURACIÓN ====================

const CONFIG = {
  SPREADSHEET_ID: '1ZIpJxakO8xdQ5V2yoO6kiHvNndA7h6jhhOhBekWaGlI',
  HOJA_ORIGEN: 'Milanesa',
  HOJA_DESTINO: 'Valores_Diarios_Distribucion',

  // Estructura de la hoja origen
  FILA_HEADER: 1,
  FILA_DIAS: 2,
  PRIMERA_COLUMNA_DIA: 4, // Columna D (índice 4, base 1)
  ULTIMA_COLUMNA_DIA: 34, // Columna AH (31 días)

  // Filas de datos
  FILAS_CROSSLOG: { inicio: 3, fin: 10 },
  FILAS_FLETEROS: { inicio: 12, fin: 15 },

  // Columnas
  COL_CHOFER: 1,    // A
  COL_INTERNO: 2,   // B
  COL_PORTE: 3,     // C
};

// ==================== MAPEO DE MESES ====================

const MESES_MAP = {
  'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4,
  'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8,
  'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
};

// ==================== FUNCIÓN PRINCIPAL ====================

/**
 * Ejecuta la migración completa de datos
 */
function migrarValoresDiarios() {
  try {
    Logger.log('========================================');
    Logger.log('INICIANDO MIGRACIÓN DE VALORES DIARIOS');
    Logger.log('========================================');

    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

    // 1. Obtener hojas
    const sheetOrigen = ss.getSheetByName(CONFIG.HOJA_ORIGEN);
    if (!sheetOrigen) {
      throw new Error(`No se encontró la hoja "${CONFIG.HOJA_ORIGEN}"`);
    }

    // 2. Crear hoja destino si no existe
    let sheetDestino = ss.getSheetByName(CONFIG.HOJA_DESTINO);
    if (!sheetDestino) {
      Logger.log(`Creando hoja "${CONFIG.HOJA_DESTINO}"...`);
      sheetDestino = ss.insertSheet(CONFIG.HOJA_DESTINO);
      inicializarHojaDestino(sheetDestino);
    }

    // 3. Extraer mes y año
    const headerCell = sheetOrigen.getRange(CONFIG.FILA_HEADER, 1).getValue().toString();
    const { mes, anio } = extraerMesAnio(headerCell);

    Logger.log(`Procesando: ${headerCell} (Mes: ${mes}, Año: ${anio})`);

    // 4. Limpiar datos existentes del mes actual (evitar duplicados)
    limpiarDatosMesExistente(sheetDestino, anio, mes);

    // 5. Migrar unidades CROSSLOG
    const datosCrosslog = migrarUnidadesCrosslog(sheetOrigen, anio, mes);
    Logger.log(`✅ Migradas ${datosCrosslog.length} filas de CROSSLOG`);

    // 6. Migrar FLETEROS
    const datosFleteros = migrarFleteros(sheetOrigen, anio, mes);
    Logger.log(`✅ Migrados ${datosFleteros.length} filas de FLETEROS`);

    // 7. Escribir todos los datos
    const todosLosDatos = [...datosCrosslog, ...datosFleteros];

    if (todosLosDatos.length > 0) {
      const ultimaFila = sheetDestino.getLastRow();
      sheetDestino.getRange(
        ultimaFila + 1,
        1,
        todosLosDatos.length,
        10 // 10 columnas (agregamos estado)
      ).setValues(todosLosDatos);

      Logger.log(`✅ Escritas ${todosLosDatos.length} filas totales en "${CONFIG.HOJA_DESTINO}"`);
    }

    // 8. Formatear hoja
    formatearHojaDestino(sheetDestino);

    Logger.log('========================================');
    Logger.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    Logger.log('========================================');

    // Mostrar mensaje al usuario
    SpreadsheetApp.getUi().alert(
      '✅ Migración Completada',
      `Se migraron ${todosLosDatos.length} registros de ${headerCell} exitosamente.\n\n` +
      `- CROSSLOG: ${datosCrosslog.length} registros\n` +
      `- FLETEROS: ${datosFleteros.length} registros\n\n` +
      `Revisa la hoja "${CONFIG.HOJA_DESTINO}"`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  } catch (error) {
    Logger.log('❌ ERROR EN MIGRACIÓN: ' + error.message);
    Logger.log(error.stack);

    SpreadsheetApp.getUi().alert(
      '❌ Error en Migración',
      'Ocurrió un error durante la migración:\n\n' + error.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Inicializa la hoja destino con encabezados en fila 2
 */
function inicializarHojaDestino(sheet) {
  const headers = [
    'fecha',
    'anio',
    'mes',
    'dia',
    'tipo_transporte',
    'chofer',
    'interno',
    'porte',
    'valor_generado',
    'estado'
  ];

  // Headers en fila 2
  sheet.getRange(2, 1, 1, headers.length).setValues([headers]);

  // Formato del header
  const headerRange = sheet.getRange(2, 1, 1, headers.length);
  headerRange.setBackground('#4A5568');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');

  // Congelar primeras 2 filas
  sheet.setFrozenRows(2);

  Logger.log('Hoja destino inicializada con headers en fila 2');
}

/**
 * Extrae mes y año del header
 */
function extraerMesAnio(headerText) {
  // Formato esperado: "diciembre 2025" o "DICIEMBRE 2025"
  const texto = headerText.toString().toUpperCase().trim();

  // Buscar el mes
  let mes = 12; // Default: Diciembre
  for (const [mesNombre, mesNumero] of Object.entries(MESES_MAP)) {
    if (texto.includes(mesNombre)) {
      mes = mesNumero;
      break;
    }
  }

  // Buscar el año (4 dígitos)
  const anioMatch = texto.match(/\d{4}/);
  const anio = anioMatch ? parseInt(anioMatch[0]) : new Date().getFullYear();

  return { mes, anio };
}

/**
 * Limpia datos existentes del mes para evitar duplicados
 * Headers están en fila 2, datos empiezan en fila 3
 */
function limpiarDatosMesExistente(sheet, anio, mes) {
  const ultimaFila = sheet.getLastRow();
  if (ultimaFila <= 2) return; // Solo headers (fila 1 vacía, fila 2 headers)

  const datos = sheet.getRange(3, 1, ultimaFila - 2, 3).getValues();
  const filasAEliminar = [];

  for (let i = 0; i < datos.length; i++) {
    const anioFila = datos[i][1];
    const mesFila = datos[i][2];

    if (anioFila === anio && mesFila === mes) {
      filasAEliminar.push(i + 3); // +3 porque empezamos en fila 3
    }
  }

  // Eliminar de abajo hacia arriba para no afectar índices
  for (let i = filasAEliminar.length - 1; i >= 0; i--) {
    sheet.deleteRow(filasAEliminar[i]);
  }

  if (filasAEliminar.length > 0) {
    Logger.log(`🗑️ Eliminadas ${filasAEliminar.length} filas existentes de ${mes}/${anio}`);
  }
}

/**
 * Migra unidades CROSSLOG
 */
function migrarUnidadesCrosslog(sheetOrigen, anio, mes) {
  const datos = [];
  const { inicio, fin } = CONFIG.FILAS_CROSSLOG;

  for (let fila = inicio; fila <= fin; fila++) {
    const chofer = sheetOrigen.getRange(fila, CONFIG.COL_CHOFER).getValue().toString().trim() || 'Sin asignar';
    const interno = sheetOrigen.getRange(fila, CONFIG.COL_INTERNO).getValue().toString().trim();
    const porte = sheetOrigen.getRange(fila, CONFIG.COL_PORTE).getValue().toString().trim();

    // Si no hay interno, saltar
    if (!interno || interno === '') continue;

    // Procesar cada día
    for (let dia = 1; dia <= 31; dia++) {
      const colDia = CONFIG.PRIMERA_COLUMNA_DIA + (dia - 1);
      const celdaValor = sheetOrigen.getRange(fila, colDia).getValue();

      // Detectar estado y valor
      let valor = 0;
      let estado = 'SIN_SERVICIO';

      if (celdaValor === 'M') {
        valor = 0;
        estado = 'MANTENIMIENTO';
      } else if (celdaValor === 'V') {
        valor = 0;
        estado = 'VIAJE';
      } else if (celdaValor === '' || celdaValor === null || celdaValor === 0) {
        valor = 0;
        estado = 'SIN_SERVICIO';
      } else {
        valor = parseFloat(celdaValor) || 0;
        estado = valor > 0 ? 'ACTIVO' : 'SIN_SERVICIO';
      }

      // Crear fecha
      const fecha = new Date(anio, mes - 1, dia);
      const fechaStr = Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd');

      datos.push([
        fechaStr,           // fecha
        anio,               // anio
        mes,                // mes
        dia,                // dia
        'CROSSLOG',         // tipo_transporte
        chofer,             // chofer
        interno,            // interno
        porte,              // porte
        valor,              // valor_generado
        estado              // estado
      ]);
    }
  }

  return datos;
}

/**
 * Migra FLETEROS
 */
function migrarFleteros(sheetOrigen, anio, mes) {
  const datos = [];
  const { inicio, fin } = CONFIG.FILAS_FLETEROS;

  for (let fila = inicio; fila <= fin; fila++) {
    const nombreFletero = sheetOrigen.getRange(fila, CONFIG.COL_INTERNO).getValue().toString().trim();

    // Si no hay nombre de fletero, saltar
    if (!nombreFletero || nombreFletero === '' || nombreFletero.toLowerCase() === 'fleteros') continue;

    // Procesar cada día
    for (let dia = 1; dia <= 31; dia++) {
      const colDia = CONFIG.PRIMERA_COLUMNA_DIA + (dia - 1);
      const celdaValor = sheetOrigen.getRange(fila, colDia).getValue();

      // Detectar estado y valor
      let valor = 0;
      let estado = 'SIN_SERVICIO';

      if (celdaValor === 'M') {
        valor = 0;
        estado = 'MANTENIMIENTO';
      } else if (celdaValor === 'V') {
        valor = 0;
        estado = 'VIAJE';
      } else if (celdaValor === '' || celdaValor === null || celdaValor === 0) {
        valor = 0;
        estado = 'SIN_SERVICIO';
      } else {
        valor = parseFloat(celdaValor) || 0;
        estado = valor > 0 ? 'ACTIVO' : 'SIN_SERVICIO';
      }

      // Crear fecha
      const fecha = new Date(anio, mes - 1, dia);
      const fechaStr = Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd');

      datos.push([
        fechaStr,           // fecha
        anio,               // anio
        mes,                // mes
        dia,                // dia
        'FLETEROS',         // tipo_transporte
        nombreFletero,      // chofer (nombre del fletero)
        '-',                // interno (vacío para fleteros)
        '-',                // porte (vacío para fleteros)
        valor,              // valor_generado
        estado              // estado
      ]);
    }
  }

  return datos;
}

/**
 * Formatea la hoja destino (headers en fila 2, datos desde fila 3)
 */
function formatearHojaDestino(sheet) {
  const ultimaFila = sheet.getLastRow();
  if (ultimaFila <= 2) return; // Solo headers

  // Ajustar anchos de columna
  sheet.setColumnWidth(1, 120); // fecha
  sheet.setColumnWidth(2, 60);  // anio
  sheet.setColumnWidth(3, 50);  // mes
  sheet.setColumnWidth(4, 50);  // dia
  sheet.setColumnWidth(5, 150); // tipo_transporte
  sheet.setColumnWidth(6, 180); // chofer
  sheet.setColumnWidth(7, 100); // interno
  sheet.setColumnWidth(8, 80);  // porte
  sheet.setColumnWidth(9, 120); // valor_generado
  sheet.setColumnWidth(10, 150); // estado

  // Formato de datos (desde fila 3)
  const dataRange = sheet.getRange(3, 1, ultimaFila - 2, 10);

  // Alternar colores de filas
  dataRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);

  // Alinear columnas numéricas a la derecha
  sheet.getRange(3, 2, ultimaFila - 2, 1).setHorizontalAlignment('right'); // anio
  sheet.getRange(3, 3, ultimaFila - 2, 1).setHorizontalAlignment('right'); // mes
  sheet.getRange(3, 4, ultimaFila - 2, 1).setHorizontalAlignment('right'); // dia
  sheet.getRange(3, 9, ultimaFila - 2, 1).setHorizontalAlignment('right'); // valor_generado

  // Formato de moneda para valor_generado
  sheet.getRange(3, 9, ultimaFila - 2, 1).setNumberFormat('#,##0');

  Logger.log('Hoja destino formateada');
}

// ==================== MENÚ PERSONALIZADO ====================

/**
 * Crea un menú personalizado al abrir el documento
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚚 CROSSLOG')
    .addItem('📊 Migrar Valores Diarios', 'migrarValoresDiarios')
    .addSeparator()
    .addItem('ℹ️ Ayuda', 'mostrarAyuda')
    .addToUi();
}

/**
 * Muestra ayuda al usuario
 */
function mostrarAyuda() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    '📖 Ayuda - Migración de Valores Diarios',
    'Este script convierte los datos de la hoja "Milanesa" (formato horizontal) ' +
    'a la hoja "Valores_Diarios_Distribucion" (formato vertical).\n\n' +
    'Pasos:\n' +
    '1. Completa los datos en la hoja "Milanesa"\n' +
    '2. Haz clic en "CROSSLOG" > "Migrar Valores Diarios"\n' +
    '3. Espera la confirmación\n' +
    '4. Revisa la hoja "Valores_Diarios_Distribucion"\n\n' +
    'Nota: Los datos del mismo mes serán reemplazados automáticamente.',
    ui.ButtonSet.OK
  );
}
