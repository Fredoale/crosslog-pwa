import type { Entrega, HDRValidationResponse, GoogleSheetsConfig } from '../types';

// Helper function to clean values that might be JSON arrays
function cleanJsonArrayValue(value: string): string {
  if (!value) return '';
  // Remove if it looks like a JSON array: starts with [ and ends with ]
  if (value.trim().startsWith('[') && value.trim().endsWith(']')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        // Return the first element or empty string
        return parsed.length > 0 ? String(parsed[0]) : '';
      }
    } catch {
      // If parsing fails, return as is
      return value;
    }
  }
  return value;
}

// Google Sheets API v4 wrapper for CROSSLOG
export class GoogleSheetsAPI {
  private config: GoogleSheetsConfig;
  private baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
  }

  /**
   * Fetch client names from MAESTRA_CLIENTES sheet
   */
  private async fetchClientesMap(): Promise<Map<string, string>> {
    try {
      const range = 'Clientes!A:B';
      // IMPORTANTE: Usar spreadsheetEntregasId para leer Clientes
      const url = `${this.baseUrl}/${this.config.spreadsheetEntregasId}/values/${range}?key=${this.config.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.warn('[SheetsAPI] Could not fetch MAESTRA_CLIENTES');
        return new Map();
      }

      const data = await response.json();
      const rows = data.values || [];

      const clientesMap = new Map<string, string>();

      // Skip header row
      rows.slice(1).forEach((row: string[]) => {
        const idCliente = row[0]?.trim();
        const nombreCliente = row[1]?.trim();
        if (idCliente && nombreCliente) {
          clientesMap.set(idCliente, nombreCliente);
        }
      });

      console.log('[SheetsAPI] Loaded', clientesMap.size, 'client names');
      return clientesMap;
    } catch (error) {
      console.error('[SheetsAPI] Error fetching client names:', error);
      return new Map();
    }
  }

  /**
   * Fetch complete client information from MAESTRA_CLIENTES sheet
   * Columns: A=ID_Cliente, B=Nombre_Cliente, C=Dirección, D=Telefono, E=Tipo_Carga
   */
  async fetchClientInfo(clientId: string): Promise<{
    id: string;
    nombre: string;
    direccion?: string;
    telefono?: string;
    tipoCarga?: string;
    folderId?: string;
  } | null> {
    try {
      const range = 'Clientes!A:E';
      // IMPORTANTE: Usar spreadsheetEntregasId para leer Clientes
      const url = `${this.baseUrl}/${this.config.spreadsheetEntregasId}/values/${range}?key=${this.config.apiKey}`;

      console.log('[SheetsAPI] Fetching client info for:', clientId);

      const response = await fetch(url);
      if (!response.ok) {
        console.warn('[SheetsAPI] Could not fetch MAESTRA_CLIENTES');
        return null;
      }

      const data = await response.json();
      const rows = data.values || [];

      // Find matching client (skip header row)
      const normalizedClientId = clientId?.trim().toUpperCase();
      const clientRow = rows.slice(1).find((row: string[]) => {
        const rowId = row[0]?.trim().toUpperCase();
        return rowId === normalizedClientId;
      });

      if (!clientRow) {
        console.warn('[SheetsAPI] Client not found:', clientId);
        return null;
      }

      const clientInfo = {
        id: clientRow[0]?.trim() || clientId,
        nombre: clientRow[1]?.trim() || clientId,
        direccion: clientRow[2]?.trim() || undefined,
        telefono: clientRow[3]?.trim() || undefined,
        tipoCarga: clientRow[4]?.trim() || undefined,
      };

      console.log('[SheetsAPI] Client info loaded:', clientInfo);
      return clientInfo;
    } catch (error) {
      console.error('[SheetsAPI] Error fetching client info:', error);
      return null;
    }
  }

  /**
   * Check if HDR is already completed in Sistema_entregas sheet
   */
  private async getCompletedEntregas(hdr: string): Promise<Entrega[] | null> {
    try {
      const range = 'Sistema_entregas!A:N';
      // IMPORTANTE: Usar spreadsheetEntregasId para Sistema_entregas, NO spreadsheetId
      const url = `${this.baseUrl}/${this.config.spreadsheetEntregasId}/values/${range}?key=${this.config.apiKey}`;

      console.log('[SheetsAPI] Checking if HDR', hdr, 'is completed in Sistema_entregas');
      console.log('[SheetsAPI] Using spreadsheetEntregasId:', this.config.spreadsheetEntregasId);

      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const rows = data.values || [];

      if (rows.length === 0) {
        return null;
      }

      // ESTRUCTURA REAL EN GOOGLE SHEETS:
      // A=fecha_viaje, B=Numero_HDR, C=numero_entrega, D=numero_remitos, E=Dador_carga,
      // F=Detalle_entrega, G=Estado, H=Chofer, I=Cant_remito, J=entregas_completadas,
      // K=entregas_pendientes, L=progreso_porcentaje, M=firma_receptor, N=pdf_urls

      // Filter rows by HDR (column B, index 1)
      const matchingRows = rows.slice(1).filter((row: string[]) => {
        const rowHDR = row[1];
        if (!rowHDR) return false;
        return String(rowHDR).trim() === String(hdr).trim();
      });

      console.log('[SheetsAPI] Found', matchingRows.length, 'completed entregas for HDR', hdr);

      if (matchingRows.length === 0) {
        return null;
      }

      // Map to Entrega objects with completed data
      const entregas: Entrega[] = matchingRows.map((row: string[], idx: number) => {
        const fechaViaje = row[0]?.trim() || '';              // A: fecha_viaje
        const numeroEntrega = row[2]?.trim() || `${idx + 1}`;  // C: numero_entrega
        let numeroRemito = row[3]?.trim() || '';               // D: numero_remitos
        const clienteId = cleanJsonArrayValue(row[4]?.trim() || '');  // E: Dador_carga (cliente)
        const clienteNombre = clienteId; // Use same value for now
        let detalleEntregas = cleanJsonArrayValue(row[5]?.trim() || '');  // F: Detalle_entrega
        const timestamp = fechaViaje; // Use fecha_viaje as timestamp

        // Clean numeroRemito if it's a JSON array
        numeroRemito = cleanJsonArrayValue(numeroRemito);

        // Fix malformed Google Drive URLs (fbs/d -> file/d) and filter invalid URLs
        // IMPORTANTE: Los PDFs están en columna N (índice 13), NO en columna L
        console.log(`[SheetsAPI] 🔍 PDF DEBUG - Row ${idx}:`);
        console.log(`[SheetsAPI] 📄 Column N (index 13) RAW value: "${row[13]}"`);

        let pdfUrlsRaw: string[] = [];
        const rawPdfValue = row[13]?.trim() || '';

        // Check if it's a JSON array (like ["url1", "url2"])
        if (rawPdfValue.startsWith('[') && rawPdfValue.endsWith(']')) {
          try {
            const parsed = JSON.parse(rawPdfValue);
            if (Array.isArray(parsed)) {
              pdfUrlsRaw = parsed.map(url => String(url).trim());
              console.log(`[SheetsAPI] 📋 Parsed as JSON array: [${pdfUrlsRaw.map(u => `"${u}"`).join(', ')}]`);
            }
          } catch (error) {
            console.log(`[SheetsAPI] ⚠️ Failed to parse as JSON, falling back to comma split`);
            pdfUrlsRaw = rawPdfValue.split(',').map((url: string) => url.trim());
          }
        } else if (rawPdfValue) {
          // Regular comma-separated string
          pdfUrlsRaw = rawPdfValue.split(',').map((url: string) => url.trim());
          console.log(`[SheetsAPI] 📋 Parsed as comma-separated: [${pdfUrlsRaw.map(u => `"${u}"`).join(', ')}]`);
        } else {
          console.log(`[SheetsAPI] 📋 No PDF URLs found`);
        }

        const pdfUrlsFixed = pdfUrlsRaw.map(url => url.replace('/fbs/d/', '/file/d/'));
        console.log(`[SheetsAPI] 🔧 After fixing /fbs/d/: [${pdfUrlsFixed.map(u => `"${u}"`).join(', ')}]`);

        const pdfUrls = pdfUrlsFixed.filter(url => {
          const isValid = url && url.length > 5 && (url.startsWith('http://') || url.startsWith('https://'));
          if (!isValid) {
            console.log(`[SheetsAPI] ❌ FILTERED OUT: "${url}" (length: ${url?.length}, starts with http: ${url?.startsWith('http')})`);
          } else {
            console.log(`[SheetsAPI] ✅ ACCEPTED: "${url}"`);
          }
          return isValid;
        });

        const nombreReceptor = cleanJsonArrayValue(row[12]?.trim() || '');  // M: firma_receptor

        console.log(`[SheetsAPI] 📊 FINAL PDFs array: [${pdfUrls.map(u => `"${u}"`).join(', ')}]`);
        console.log(`[SheetsAPI] Entrega from Sistema_entregas: Numero=${numeroEntrega}, Cliente=${clienteNombre}, Detalle=${detalleEntregas}, PDFs count=${pdfUrls.length}`);

        // If numeroEntrega looks like a date, use index instead
        const finalNumeroEntrega = /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(numeroEntrega)
          ? `${idx + 1}`
          : numeroEntrega;

        return {
          id: `${hdr}-${finalNumeroEntrega}`,
          hdr,
          numeroEntrega: finalNumeroEntrega,
          numeroRemito,
          cliente: clienteId,
          clienteNombreCompleto: clienteNombre,
          detalleEntregas: detalleEntregas || clienteNombre,
          estado: 'COMPLETADO' as const,
          fechaCreacion: timestamp,
          fechaActualizacion: timestamp,
          fechaViaje: fechaViaje, // Include fecha_viaje
          synced: true,
          nombreReceptor,
          pdfUrls: pdfUrls.filter(Boolean),
        };
      });

      return entregas;
    } catch (error) {
      console.error('[SheetsAPI] Error checking completed entregas:', error);
      return null;
    }
  }

  /**
   * Validate HDR and fetch entregas from "BASE" sheet, merging with completed ones from "Sistema_entregas"
   * Columnas: A=Numero_Entrega, F=CLIENTE, K=HR (HDR), L=DETALLE
   */
  async validateHDR(hdr: string): Promise<HDRValidationResponse> {
    try {
      // STEP 1: ALWAYS fetch from BASE to get total entregas for this HDR
      console.log('[SheetsAPI] Fetching HDR from BASE:', hdr);

      const range = `${this.config.viajesCrosslogSheet}!A:M`;
      const url = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}?key=${this.config.apiKey}`;

      console.log('[SheetsAPI] Fetching HDR:', hdr, 'from', range);

      // Fetch entregas data
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const rows = data.values || [];

      console.log('[SheetsAPI] Total rows fetched:', rows.length);
      if (rows.length > 0) {
        console.log('[SheetsAPI] First row (headers):', rows[0]);
      }
      if (rows.length > 1) {
        console.log('[SheetsAPI] Sample data row:', rows[1]);
      }

      if (rows.length === 0) {
        return { valid: false };
      }

      // Fetch client names map
      const clientesMap = await this.fetchClientesMap();

      // Column indices (0-based)
      // A = 0: Numero_Entrega
      // C = 2: FECHA
      // F = 5: CLIENTE (ID)
      // H = 7: INT (Tipo de transporte / Fletero)
      // I = 8: CHOFER
      // K = 10: HR (HDR)
      // L = 11: DETALLE
      const numeroEntregaIndex = 0;
      const fechaIndex = 2;
      const clienteIndex = 5;
      const tipoTransporteIndex = 7; // Columna H
      const choferIndex = 8;
      const hdrIndex = 10;
      const detalleIndex = 11;

      // Check if first row is header (contains non-numeric text in HDR column)
      const firstRowHDR = rows[0]?.[hdrIndex];
      const hasHeaderRow = firstRowHDR && isNaN(Number(firstRowHDR));

      console.log('[SheetsAPI] First row HDR value:', firstRowHDR, '- Is header?', hasHeaderRow);

      // Skip header row if exists, otherwise start from first row
      const dataRows = hasHeaderRow ? rows.slice(1) : rows;

      // Filter by HDR
      // IMPORTANT: Compare as strings, removing any extra spaces/formatting
      const matchingRows = dataRows.filter((row: string[]) => {
        const rowHDR = row[hdrIndex];
        if (!rowHDR) return false;

        const normalizedRowHDR = String(rowHDR).trim().replace(/\s+/g, '');
        const normalizedInputHDR = String(hdr).trim().replace(/\s+/g, '');
        const matches = normalizedRowHDR === normalizedInputHDR;

        if (matches) {
          console.log('[SheetsAPI] Matching row:', row);
        }
        return matches;
      });

      console.log('[SheetsAPI] Found', matchingRows.length, 'matching rows for HDR', hdr);

      if (matchingRows.length > 0) {
        console.log('[SheetsAPI] First matching row data:', {
          numeroEntrega: matchingRows[0][numeroEntregaIndex],
          fecha: matchingRows[0][fechaIndex],
          cliente: matchingRows[0][clienteIndex],
          chofer: matchingRows[0][choferIndex],
          hdr: matchingRows[0][hdrIndex],
          detalle: matchingRows[0][detalleIndex],
        });
      }

      if (matchingRows.length === 0) {
        return { valid: false };
      }

      // Extract chofer, fecha and tipo_transporte from first matching row (all rows for same HDR should have same values)
      const chofer = matchingRows[0][choferIndex]?.trim() || '';
      const fechaViaje = matchingRows[0][fechaIndex]?.trim() || '';
      const tipoTransporteRaw = matchingRows[0][tipoTransporteIndex]?.trim() || '';

      // Determine tipo_transporte: if column H is numeric or empty, it's "Propio", otherwise it's the fletero name
      const FLETEROS = ['BARCO', 'PRODAN', 'LOGZO', 'DON PEDRO', 'CALLTRUCK', 'FALZONE', 'ANDROSIUK', 'ADROSLUK'];
      let tipoTransporte = 'Propio';

      if (tipoTransporteRaw) {
        const upperTransporte = tipoTransporteRaw.toUpperCase();
        // Check if it matches any known fletero (exact or partial match)
        const matchedFletero = FLETEROS.find(f => upperTransporte.includes(f) || f.includes(upperTransporte));
        if (matchedFletero) {
          tipoTransporte = matchedFletero;
        } else if (isNaN(Number(tipoTransporteRaw))) {
          // If not numeric and not in list, use the raw value (might be a new fletero)
          tipoTransporte = tipoTransporteRaw;
        }
        // If it's numeric, keep as "Propio"
      }

      console.log('[SheetsAPI] Tipo de transporte detectado:', tipoTransporte, '(columna H:', tipoTransporteRaw, ')');

      // Map to Entrega objects
      // IMPORTANT: One row can have multiple entregas
      const entregas: Entrega[] = [];

      matchingRows.forEach((row: string[]) => {
        const clienteId = row[clienteIndex]?.trim() || 'Sin cliente';
        const clienteNombreCompleto = clientesMap.get(clienteId) || clienteId;
        const detalleEntregasRaw = row[detalleIndex]?.trim() || '';
        const numeroEntregaTotal = parseInt(row[numeroEntregaIndex]) || 1;

        // Parse formato "CARGA: X / DESCARGA: Y / Z" o "CARGA: X / DESCARGA : Y / Z" (con o sin espacio)
        // Separar solo los destinos de DESCARGA, no incluir CARGA
        let detallesSeparados: string[] = [];

        // Buscar "DESCARGA:" o "DESCARGA :" (soportar ambos formatos)
        const descargaMatch = detalleEntregasRaw.match(/DESCARGA\s*:/i);

        if (descargaMatch) {
          // Encontramos DESCARGA: o DESCARGA :
          // Extraer todo después de "DESCARGA:" o "DESCARGA :"
          const descargaIndex = detalleEntregasRaw.indexOf(descargaMatch[0]) + descargaMatch[0].length;
          const descargaPart = detalleEntregasRaw.substring(descargaIndex).trim();

          detallesSeparados = descargaPart
            .split('/')
            .map(d => d.trim())
            .filter(d => d.length > 0 && !d.toUpperCase().startsWith('CARGA'));

          console.log(`[SheetsAPI] Parsed DESCARGA format: found ${detallesSeparados.length} destinos:`, detallesSeparados);
        } else {
          // Formato antiguo: split por "/"
          detallesSeparados = detalleEntregasRaw
            .split('/')
            .map(d => d.trim())
            .filter(d => d.length > 0 && !d.toUpperCase().startsWith('CARGA'));
        }

        console.log(`[SheetsAPI] HDR ${hdr} - Column A value: ${numeroEntregaTotal}, Destinos found: ${detallesSeparados.length}`);

        // Create one Entrega per destino found in DETALLE column
        // Use detallesSeparados.length as the source of truth (real number of destinations)
        // Ignore numeroEntregaTotal from column A (often incorrect or refers to something else)
        const numEntregas = detallesSeparados.length || 1; // At least 1 entrega

        console.log(`[SheetsAPI] Creating ${numEntregas} entrega(s) based on DETALLE destinations`);

        // Safety check: warn if seems too many
        if (numEntregas > 20) {
          console.warn(`[SheetsAPI] ⚠️ High number of destinations (${numEntregas}) - verify DETALLE format is correct`);
        }

        for (let i = 0; i < numEntregas; i++) {
          const detalleEntrega = detallesSeparados[i] || detallesSeparados[detallesSeparados.length - 1] || clienteNombreCompleto;

          entregas.push({
            id: `${hdr}-${i + 1}`,
            hdr,
            numeroEntrega: `${i + 1}`,
            cliente: clienteId,
            clienteNombreCompleto,
            detalleEntregas: detalleEntrega,
            estado: 'PENDIENTE' as const,
            fechaCreacion: new Date().toISOString(),
            fechaActualizacion: new Date().toISOString(),
            synced: false,
            fechaViaje: fechaViaje,
          });
        }
      });

      console.log(`[SheetsAPI] Created ${entregas.length} PENDIENTE entregas from BASE`);

      // STEP 2: Check Sistema_entregas for completed ones and merge
      const completedEntregas = await this.getCompletedEntregas(hdr);

      if (completedEntregas && completedEntregas.length > 0) {
        console.log(`[SheetsAPI] Found ${completedEntregas.length} completed entregas in Sistema_entregas, merging...`);

        // Create a map of completed entregas by numeroEntrega
        const completedMap = new Map<string, Entrega>();
        completedEntregas.forEach(completed => {
          completedMap.set(completed.numeroEntrega, completed);
        });

        // Merge: replace PENDIENTE with COMPLETADO where applicable
        for (let i = 0; i < entregas.length; i++) {
          const numeroEntrega = entregas[i].numeroEntrega;
          const completed = completedMap.get(numeroEntrega);

          if (completed) {
            console.log(`[SheetsAPI] ✅ Merging completed data for entrega #${numeroEntrega}`);
            // Replace with completed data, keeping the same structure
            entregas[i] = {
              ...entregas[i], // Keep BASE data as fallback
              ...completed,   // Override with completed data
              fechaViaje,     // Ensure fechaViaje from BASE is preserved
            };
          } else {
            console.log(`[SheetsAPI] ⏳ Entrega #${numeroEntrega} still PENDIENTE`);
          }
        }

        console.log(`[SheetsAPI] Final merged entregas: ${entregas.filter(e => e.estado === 'COMPLETADO').length} completed, ${entregas.filter(e => e.estado === 'PENDIENTE').length} pending`);
      } else {
        console.log(`[SheetsAPI] No completed entregas found in Sistema_entregas, all remain PENDIENTE`);
      }

      return {
        valid: true,
        entregas,
        totalEntregas: entregas.length,
        chofer,
        fechaViaje,
        tipoTransporte,
      };
    } catch (error) {
      console.error('[SheetsAPI] Error validating HDR:', error);
      throw error;
    }
  }

  /**
   * Initialize Sistema_entregas sheet with headers if empty
   */
  private async initSistemaEntregasHeaders(): Promise<void> {
    try {
      const range = 'Sistema_entregas!A1:N1';
      // IMPORTANTE: Usar spreadsheetEntregasId para Sistema_entregas
      const url = `${this.baseUrl}/${this.config.spreadsheetEntregasId}/values/${range}?key=${this.config.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      // If empty, add headers
      if (!data.values || data.values.length === 0) {
        const headers = [[
          'Numero_Entrega',
          'HDR',
          'Numero_Remito',
          'Cliente_ID',
          'Cliente_Nombre',
          'Detalle_Entregas',
          'Estado',
          'Chofer',
          'Timestamp',
          'Latitud',
          'Longitud',
          'PDF_URLs',
          'Receptor',
          'Num_Fotos'
        ]];

        const updateUrl = `${this.baseUrl}/${this.config.spreadsheetEntregasId}/values/${range}?valueInputOption=RAW&key=${this.config.apiKey}`;
        await fetch(updateUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: headers }),
        });

        console.log('[SheetsAPI] Initialized Sistema_entregas headers');
      }
    } catch (error) {
      console.warn('[SheetsAPI] Could not initialize headers:', error);
    }
  }

  /**
   * Initialize Estado_progreso sheet with headers if empty
   */
  private async initEstadoProgresoHeaders(): Promise<void> {
    try {
      const range = 'Estado_progreso!A1:L1';
      const url = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}?key=${this.config.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      // If empty, add headers
      if (!data.values || data.values.length === 0) {
        const headers = [[
          'Marca temporal',
          'Número_HDR',
          'Numero_Entrega',
          'Nombre_De_Chofer',
          'CARGA',
          'DESCARGA',
          'Numero_Remito',
          'Estado_Entrega',
          'Progreso',
          'PorcentajeCompletado',
          'Remito_Verificado',
          'Numero_Detectado_OCR'
        ]];

        const updateUrl = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}?valueInputOption=RAW&key=${this.config.apiKey}`;
        await fetch(updateUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: headers }),
        });

        console.log('[SheetsAPI] Initialized Estado_progreso headers');
      }
    } catch (error) {
      console.warn('[SheetsAPI] Could not initialize Estado_progreso headers:', error);
    }
  }

  /**
   * Submit entrega data to "Sistema_entregas" sheet
   */
  async submitEntrega(data: {
    hdr: string;
    numeroEntrega: string;
    numeroRemito: string;
    cliente: string;
    clienteNombreCompleto?: string;
    detalleEntregas?: string;
    estado: string;
    chofer: string;
    timestamp: string;
    geolocalizacion?: { lat: number; lng: number };
    pdfUrls?: string[];
    firmaReceptor?: string;
    numeroFotos: number;
    tipoTransporte?: string; // "Propio" o nombre del fletero
  }): Promise<boolean> {
    try {
      // Initialize headers if needed
      await this.initSistemaEntregasHeaders();

      const range = 'Sistema_entregas!A:Q';
      const values = [[
        data.numeroEntrega,           // A: Numero_Entrega
        data.hdr,                      // B: HDR
        data.numeroRemito,             // C: Numero_Remito
        data.cliente,                  // D: Cliente_ID
        data.clienteNombreCompleto || data.cliente,  // E: Cliente_Nombre
        data.detalleEntregas || '',    // F: Detalle_Entregas
        data.estado,                   // G: Estado
        data.chofer,                   // H: Chofer
        data.timestamp,                // I: Timestamp
        data.geolocalizacion ? data.geolocalizacion.lat : '', // J: Latitud
        data.geolocalizacion ? data.geolocalizacion.lng : '', // K: Longitud
        data.pdfUrls ? data.pdfUrls.join(', ') : '', // L: PDF_URLs
        data.firmaReceptor || '',      // M: Receptor
        data.numeroFotos.toString(),   // N: Num_Fotos
        '',                            // O: (vacío - reservado)
        '',                            // P: (vacío - reservado)
        data.tipoTransporte || 'Propio', // Q: Tipo_Transporte
      ]];

      // IMPORTANTE: Usar spreadsheetEntregasId para Sistema_entregas
      const url = `${this.baseUrl}/${this.config.spreadsheetEntregasId}/values/${range}:append?valueInputOption=USER_ENTERED&key=${this.config.apiKey}`;

      console.log('[SheetsAPI] Submitting to Sistema_entregas:', values[0]);
      console.log('[SheetsAPI] Using spreadsheetEntregasId:', this.config.spreadsheetEntregasId);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SheetsAPI] Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('[SheetsAPI] Successfully submitted to Sistema_entregas');
      return true;
    } catch (error) {
      console.error('[SheetsAPI] Error submitting entrega:', error);
      throw error;
    }
  }

  /**
   * Update or create progress in "Estado_progreso" sheet
   */
  async updateEstadoProgreso(data: {
    hdr: string;
    numeroEntrega: string;
    nombreChofer: string;
    carga: string[];
    descargaActual: string;
    numeroRemitoActual: string;
    totalEntregasHDR: number;
  }): Promise<boolean> {
    try {
      console.log('[SheetsAPI] Updating Estado_progreso for HDR:', data.hdr);

      // Initialize headers if needed
      await this.initEstadoProgresoHeaders();

      // 1. Get all rows from Estado_progreso
      const range = 'Estado_progreso!A:L';
      const url = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}?key=${this.config.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      const rows = responseData.values || [];

      // 2. Find if HDR already exists
      let existingRowIndex = -1;
      let existingData: any = null;

      for (let i = 1; i < rows.length; i++) { // Skip header
        if (rows[i][1] && String(rows[i][1]).trim() === String(data.hdr).trim()) {
          existingRowIndex = i;
          existingData = {
            descarga: rows[i][5] ? JSON.parse(rows[i][5]) : [],
            numeroRemito: rows[i][6] ? JSON.parse(rows[i][6]) : [],
            numeroEntregaCompletadas: parseInt(rows[i][2]) || 0,
          };
          break;
        }
      }

      // 3. Prepare updated data
      let descargaArray = existingData ? [...existingData.descarga] : [];
      let remitoArray = existingData ? [...existingData.numeroRemito] : [];
      let entregasCompletadas = existingData ? existingData.numeroEntregaCompletadas + 1 : 1;

      // Add new descarga if not already in array
      if (!descargaArray.includes(data.descargaActual)) {
        descargaArray.push(data.descargaActual);
      }

      // Add new remito
      if (!remitoArray.includes(data.numeroRemitoActual)) {
        remitoArray.push(data.numeroRemitoActual);
      }

      const progreso = `${entregasCompletadas} / ${data.totalEntregasHDR}`;
      const porcentaje = Math.round((entregasCompletadas / data.totalEntregasHDR) * 100);
      const estadoEntrega = entregasCompletadas >= data.totalEntregasHDR
        ? '✅ Entregado (HDR finalizada)'
        : 'En reparto';

      const rowData = [
        new Date().toISOString(),              // A: Marca temporal
        data.hdr,                               // B: Número_HDR
        entregasCompletadas.toString(),        // C: Numero_Entrega (contador)
        data.nombreChofer,                      // D: Nombre_De_Chofer
        JSON.stringify(data.carga),             // E: CARGA
        JSON.stringify(descargaArray),          // F: DESCARGA (acumulativo)
        JSON.stringify(remitoArray),            // G: Numero_Remito (acumulativo)
        estadoEntrega,                          // H: Estado_Entrega
        progreso,                               // I: Progreso
        porcentaje,                             // J: PorcentajeCompletado
        '',                                     // K: Remito_Verificado
        '',                                     // L: Numero_Detectado_OCR
      ];

      let updateUrl: string;

      // 4. Update or append
      if (existingRowIndex !== -1) {
        // Update existing row
        const updateRange = `Estado_progreso!A${existingRowIndex + 1}:L${existingRowIndex + 1}`;
        updateUrl = `${this.baseUrl}/${this.config.spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED&key=${this.config.apiKey}`;

        console.log('[SheetsAPI] Updating existing row', existingRowIndex + 1);

        const updateResponse = await fetch(updateUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [rowData] }),
        });

        if (!updateResponse.ok) {
          throw new Error(`Update failed: ${updateResponse.status}`);
        }
      } else {
        // Append new row
        updateUrl = `${this.baseUrl}/${this.config.spreadsheetId}/values/Estado_progreso!A:L:append?valueInputOption=USER_ENTERED&key=${this.config.apiKey}`;

        console.log('[SheetsAPI] Creating new row for HDR', data.hdr);

        const appendResponse = await fetch(updateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [rowData] }),
        });

        if (!appendResponse.ok) {
          throw new Error(`Append failed: ${appendResponse.status}`);
        }
      }

      console.log('[SheetsAPI] Successfully updated Estado_progreso');
      return true;
    } catch (error) {
      console.error('[SheetsAPI] Error updating Estado_progreso:', error);
      throw error;
    }
  }

  /**
   * Get total entregas for a specific HDR from BASE sheet
   */
  async getTotalEntregasForHDR(hdr: string): Promise<number> {
    try {
      const range = `${this.config.viajesCrosslogSheet}!K:K`; // Column K = HDR
      const url = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}?key=${this.config.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      const rows = data.values || [];

      // Count matching HDR rows (skip header)
      let count = 0;
      for (let i = 1; i < rows.length; i++) {
        const rowHDR = rows[i][0];
        if (rowHDR && String(rowHDR).trim() === String(hdr).trim()) {
          count++;
        }
      }

      return count;
    } catch (error) {
      console.error('[SheetsAPI] Error getting total entregas:', error);
      return 0;
    }
  }

  /**
   * Search HDR by HDR number or remito number
   * For consultation module (clients and internal)
   */
  async searchHDR(params: { hdr?: string; numeroRemito?: string }): Promise<any> {
    try {
      console.log('[SheetsAPI] Searching with params:', params);

      // STEP 1: Search in BASE sheet
      const rangeBase = `${this.config.viajesCrosslogSheet}!A:M`;
      const urlBase = `${this.baseUrl}/${this.config.spreadsheetId}/values/${rangeBase}?key=${this.config.apiKey}`;

      const responseBase = await fetch(urlBase);
      if (!responseBase.ok) {
        throw new Error(`HTTP error! status: ${responseBase.status}`);
      }

      const dataBase = await responseBase.json();
      const rowsBase = dataBase.values || [];

      if (rowsBase.length === 0) {
        return { found: false, message: 'No data found' };
      }

      // Column indices (0-based)
      // A=0: Numero_Entrega, C=2: Fecha, F=5: CLIENTE, H=7: INT (Fletero),
      // I=8: CHOFER, K=10: HR (HDR), L=11: DETALLE
      const fechaIndex = 2;
      const fleteroIndex = 7;
      const choferIndex = 8;
      const hdrIndex = 10;

      let matchingHDRs = new Set<string>();

      // Search by HDR
      if (params.hdr) {
        const normalizedInputHDR = String(params.hdr).trim().replace(/\s+/g, '');

        rowsBase.slice(1).forEach((row: string[]) => {
          const rowHDR = row[hdrIndex];
          if (rowHDR) {
            const normalizedRowHDR = String(rowHDR).trim().replace(/\s+/g, '');
            if (normalizedRowHDR === normalizedInputHDR) {
              matchingHDRs.add(String(rowHDR).trim());
            }
          }
        });
      }

      // STEP 2: If searching by remito, check Sistema_entregas sheet
      if (params.numeroRemito) {
        const rangeSistema = 'Sistema_entregas!A:N';
        // IMPORTANTE: Usar spreadsheetEntregasId para Sistema_entregas
        const urlSistema = `${this.baseUrl}/${this.config.spreadsheetEntregasId}/values/${rangeSistema}?key=${this.config.apiKey}`;

        const responseSistema = await fetch(urlSistema);
        if (responseSistema.ok) {
          const dataSistema = await responseSistema.json();
          const rowsSistema = dataSistema.values || [];

          const normalizedRemito = String(params.numeroRemito).trim().toLowerCase();

          rowsSistema.slice(1).forEach((row: string[]) => {
            const rowRemito = row[2]; // Column C: Numero_Remito
            const rowHDR = row[1];    // Column B: HDR

            if (rowRemito && rowHDR) {
              const normalizedRowRemito = String(rowRemito).trim().toLowerCase();
              if (normalizedRowRemito.includes(normalizedRemito) || normalizedRemito.includes(normalizedRowRemito)) {
                matchingHDRs.add(String(rowHDR).trim());
              }
            }
          });
        }
      }

      if (matchingHDRs.size === 0) {
        return { found: false, message: 'No se encontraron resultados' };
      }

      // STEP 3: For each matching HDR, get full details
      const hdrsData = [];

      for (const hdr of Array.from(matchingHDRs)) {
        // Get data from BASE
        const hdrRowsBase = rowsBase.slice(1).filter((row: string[]) => {
          const rowHDR = row[hdrIndex];
          return rowHDR && String(rowHDR).trim() === hdr;
        });

        if (hdrRowsBase.length === 0) continue;

        const firstRow = hdrRowsBase[0];
        const fechaViaje = firstRow[fechaIndex]?.trim() || '';
        const chofer = firstRow[choferIndex]?.trim() || '';
        const fletero = firstRow[fleteroIndex]?.trim() || '';

        // Get all entregas via validateHDR
        const validationResult = await this.validateHDR(hdr);

        if (validationResult.valid && validationResult.entregas) {
          const totalEntregas = validationResult.entregas.length;
          const entregasCompletadas = validationResult.entregas.filter(e => e.estado === 'COMPLETADO').length;

          hdrsData.push({
            hdr,
            fechaViaje,
            chofer,
            fletero,
            totalEntregas,
            entregasCompletadas,
            entregas: validationResult.entregas,
          });
        }
      }

      return {
        found: hdrsData.length > 0,
        hdrs: hdrsData,
        message: hdrsData.length > 0 ? `Se encontraron ${hdrsData.length} HDR(s)` : 'No se encontraron resultados',
      };
    } catch (error) {
      console.error('[SheetsAPI] Error searching HDR:', error);
      return { found: false, message: 'Error al buscar' };
    }
  }

  /**
   * Search HDRs by fletero (carrier company)
   * For consultation module (fleteros)
   */
  async searchByFletero(fletero: string, fechaDesde?: string, fechaHasta?: string): Promise<any> {
    try {
      console.log('[SheetsAPI] Searching HDRs for fletero in Sistema_entregas:', fletero);

      // Search ONLY in Sistema_entregas (completed/in-progress trips)
      const rangeSistema = 'Sistema_entregas!A:Q';
      // IMPORTANTE: Usar spreadsheetEntregasId para Sistema_entregas
      const urlSistema = `${this.baseUrl}/${this.config.spreadsheetEntregasId}/values/${rangeSistema}?key=${this.config.apiKey}`;
      console.log('[SheetsAPI] Using spreadsheetEntregasId for fletero search:', this.config.spreadsheetEntregasId);

      const responseSistema = await fetch(urlSistema);
      if (!responseSistema.ok) {
        return { found: false, message: 'Error al buscar en el sistema' };
      }

      const dataSistema = await responseSistema.json();
      const rowsSistema = dataSistema.values || [];

      if (rowsSistema.length === 0) {
        return { found: false, message: 'No hay datos disponibles' };
      }

      // Column indices for Sistema_entregas (CORRECTED)
      // A=0: Fecha_Viaje, B=1: HDR, H=7: Chofer, Q=16: Tipo_Transporte
      const fechaIndex = 0;
      const hdrIndex = 1;
      const choferIndex = 7;
      const tipoTransporteIndex = 16;

      const normalizedFletero = fletero.trim().toUpperCase();
      const matchingHDRs = new Map<string, any>();

      console.log('[SheetsAPI] Searching for fletero:', normalizedFletero);
      let debuggedFirstRow = false;
      let debuggedCrosslogRow = false;
      let matchedCount = 0;
      let totalRows = 0;
      let emptyColumnQCount = 0;
      let crosslogCount = 0;

      // Lista de fleteros conocidos
      const KNOWN_FLETEROS = ['VIMAAB', 'BARCO', 'PRODAN', 'LOGZO', 'DON PEDRO', 'CALLTRUCK', 'ANDROSIUK', 'FALZONE'];

      // Filter rows by fletero (from column Q: Tipo_Transporte)
      rowsSistema.slice(1).forEach((row: string[]) => {
        totalRows++;
        // Clean JSON array format before processing (e.g., ["BARCO"] -> BARCO)
        const rowFleteroRawDirty = row[tipoTransporteIndex] || '';
        const rowFleteroRawClean = cleanJsonArrayValue(rowFleteroRawDirty);
        const rowFleteroRaw = rowFleteroRawClean.trim().toUpperCase();
        const rowHDR = row[hdrIndex]?.trim();
        const rowFecha = row[fechaIndex]?.trim();
        const rowChofer = row[choferIndex]?.trim();

        if (!rowHDR) return;

        // Track empty column Q
        if (!rowFleteroRaw) {
          emptyColumnQCount++;
        }

        // Determinar el tipo de transporte:
        // - Si columna Q está vacía O tiene un nombre de chofer (no está en lista de fleteros) → CROSSLOG
        // - Si columna Q tiene un nombre de fletero conocido → usar ese fletero
        let rowFletero: string;
        if (!rowFleteroRaw) {
          rowFletero = 'CROSSLOG';
          crosslogCount++;
        } else {
          // Verificar si es un fletero conocido (buscar coincidencia parcial)
          const matchedFletero = KNOWN_FLETEROS.find(f => rowFleteroRaw.includes(f));
          if (matchedFletero) {
            // Normalizar al nombre estándar del fletero
            rowFletero = matchedFletero;
          } else {
            // Es un nombre de chofer, entonces es CROSSLOG
            rowFletero = 'CROSSLOG';
            crosslogCount++;
          }
        }

        // Debug first row
        if (!debuggedFirstRow) {
          console.log('[SheetsAPI] First row analysis:');
          console.log('  - HDR:', rowHDR);
          console.log('  - Column Q (raw):', rowFleteroRaw);
          console.log('  - Is known fletero?', KNOWN_FLETEROS.some(f => rowFleteroRaw?.includes(f)));
          console.log('  - Determined as:', rowFletero);
          console.log('  - Looking for:', normalizedFletero);
          debuggedFirstRow = true;
        }

        // Debug first CROSSLOG row if searching for CROSSLOG
        if (normalizedFletero === 'CROSSLOG' && !debuggedCrosslogRow && rowFletero === 'CROSSLOG') {
          console.log('[SheetsAPI] First CROSSLOG row:');
          console.log('  - HDR:', rowHDR);
          console.log('  - Column Q raw value:', rowFleteroRaw);
          console.log('  - Identified as CROSSLOG (chofer name or empty)');
          debuggedCrosslogRow = true;
        }

        // Match fletero (exact or contains)
        if (rowFletero === normalizedFletero || rowFletero.includes(normalizedFletero)) {
          matchedCount++;

          // Optional date filtering
          if (fechaDesde || fechaHasta) {
            // Basic date filtering (you may want to improve this)
            const rowDate = this.parseDate(rowFecha);
            if (fechaDesde && rowDate < new Date(fechaDesde)) return;
            if (fechaHasta && rowDate > new Date(fechaHasta)) return;
          }

          if (!matchingHDRs.has(rowHDR)) {
            matchingHDRs.set(rowHDR, {
              hdr: rowHDR,
              fechaViaje: rowFecha,
              chofer: rowChofer,
              fletero: rowFletero,
            });
          }
        }
      });

      console.log(`[SheetsAPI] Fletero filter results:`);
      console.log(`  - Total rows: ${totalRows}`);
      console.log(`  - Rows with empty column Q: ${emptyColumnQCount}`);
      console.log(`  - Rows identified as CROSSLOG (chofer names): ${crosslogCount}`);
      console.log(`  - Matched rows: ${matchedCount}`);
      if (normalizedFletero === 'CROSSLOG') {
        console.log(`  - Expected to match ${crosslogCount} CROSSLOG rows`);
      }

      // Build HDR data from Sistema_entregas rows (already filtered)
      const hdrsData = [];

      for (const [hdr, _baseData] of matchingHDRs) { // baseData reserved for future use
        // Get all rows for this HDR from Sistema_entregas
        const hdrRows = rowsSistema.slice(1).filter((row: string[]) => {
          const rowHDR = row[hdrIndex]?.trim();
          const rowFleteroRaw = row[tipoTransporteIndex]?.trim().toUpperCase();

          // Aplicar la misma lógica de determinación de fletero
          let rowFletero: string;
          if (!rowFleteroRaw) {
            rowFletero = 'CROSSLOG';
          } else {
            const isKnownFletero = KNOWN_FLETEROS.some(f => rowFleteroRaw.includes(f));
            rowFletero = isKnownFletero ? rowFleteroRaw : 'CROSSLOG';
          }

          return rowHDR === hdr && (rowFletero === normalizedFletero || rowFletero.includes(normalizedFletero));
        });

        if (hdrRows.length > 0) {
          const hdrData = this.buildHDRDataFromSistema(hdrRows);
          if (hdrData) {
            hdrsData.push(hdrData);
          }
        }
      }

      if (hdrsData.length === 0) {
        return { found: false, message: `No se encontraron viajes completados o en curso para ${fletero}` };
      }

      return {
        found: hdrsData.length > 0,
        hdrs: hdrsData,
        message: `Se encontraron ${hdrsData.length} HDR(s) para ${fletero}`,
      };
    } catch (error) {
      console.error('[SheetsAPI] Error searching by fletero:', error);
      return { found: false, message: 'Error al buscar' };
    }
  }

  /**
   * Get all HDRs from Sistema_entregas (for initial list display)
   * Optionally filter by cliente for client view
   */
  async getAllHDRs(filterBy?: { clienteId?: string }): Promise<any> {
    try {
      console.log('[SheetsAPI] Fetching all HDRs from Sistema_entregas', filterBy ? 'with filter' : '');

      const rangeSistema = 'Sistema_entregas!A:Q';
      // IMPORTANTE: Usar spreadsheetEntregasId para consultas
      const urlSistema = `${this.baseUrl}/${this.config.spreadsheetEntregasId}/values/${rangeSistema}?key=${this.config.apiKey}`;
      console.log('[SheetsAPI] Using spreadsheetEntregasId for getAllHDRs:', this.config.spreadsheetEntregasId);

      const responseSistema = await fetch(urlSistema);
      if (!responseSistema.ok) {
        return { found: false, message: 'Error al cargar datos', hdrs: [] };
      }

      const dataSistema = await responseSistema.json();
      const rowsSistema = dataSistema.values || [];

      if (rowsSistema.length === 0) {
        return { found: false, message: 'No hay datos disponibles', hdrs: [] };
      }

      // Column indices: B=1: HDR, E=4: Dador_carga (cliente)
      const hdrIndex = 1;
      const clienteIndex = 4;

      // Group by HDR
      const hdrsMap = new Map<string, string[][]>();

      let matchedRows = 0;
      let totalRows = 0;
      rowsSistema.slice(1).forEach((row: string[]) => {
        totalRows++;
        const rowHDR = row[hdrIndex]?.trim();
        if (!rowHDR) return;

        // Apply cliente filter if provided
        if (filterBy?.clienteId) {
          // Clean JSON array format before comparing (e.g., ["TOY"] -> TOY)
          const rowClienteRaw = row[clienteIndex] || '';
          const rowClienteCleaned = cleanJsonArrayValue(rowClienteRaw);
          const rowCliente = rowClienteCleaned.trim().toUpperCase();
          const filterCliente = filterBy.clienteId.trim().toUpperCase();

          // Debug first row
          if (matchedRows === 0) {
            console.log('[SheetsAPI] Filter comparison example:');
            console.log('  - Row cliente raw (Dador_carga):', rowClienteRaw);
            console.log('  - Row cliente cleaned:', rowClienteCleaned);
            console.log('  - Row cliente (uppercase):', rowCliente);
            console.log('  - Filter cliente (uppercase):', filterCliente);
            console.log('  - Match?', rowCliente === filterCliente);
          }

          if (rowCliente !== filterCliente) return;
          matchedRows++;
        }

        if (!hdrsMap.has(rowHDR)) {
          hdrsMap.set(rowHDR, []);
        }
        hdrsMap.get(rowHDR)!.push(row);
      });

      if (filterBy?.clienteId) {
        console.log(`[SheetsAPI] Filter results: ${matchedRows} matched rows out of ${totalRows} total rows`);
        console.log(`[SheetsAPI] Unique HDRs found: ${hdrsMap.size}`);
        console.log(`[SheetsAPI] HDRs list:`, Array.from(hdrsMap.keys()));
      }

      // Build HDR data for each unique HDR
      const hdrsData = [];
      for (const [hdr, rows] of hdrsMap) {
        const hdrData = this.buildHDRDataFromSistema(rows);
        if (hdrData) {
          hdrsData.push(hdrData);
        } else {
          console.warn(`[SheetsAPI] Failed to build data for HDR: ${hdr} (${rows.length} rows)`);
        }
      }

      // Sort by fecha_viaje descending (most recent first)
      hdrsData.sort((a, b) => {
        const dateA = this.parseDate(a.fechaViaje);
        const dateB = this.parseDate(b.fechaViaje);
        return dateB.getTime() - dateA.getTime();
      });

      console.log(`[SheetsAPI] Successfully loaded ${hdrsData.length} unique HDRs (from ${hdrsMap.size} in map)`);

      return {
        found: hdrsData.length > 0,
        hdrs: hdrsData,
        message: `${hdrsData.length} HDR(s) encontrada(s)`,
      };
    } catch (error) {
      console.error('[SheetsAPI] Error fetching all HDRs:', error);
      return { found: false, message: 'Error al cargar datos', hdrs: [] };
    }
  }

  /**
   * Helper function to parse date string (DD-MM-YYYY or similar formats)
   */
  private parseDate(dateStr: string): Date {
    if (!dateStr) return new Date(0);

    // Try DD-MM-YYYY format
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }

    return new Date(dateStr);
  }

  /**
   * Authenticate Cliente with access code
   */
  async authenticateCliente(codigo: string): Promise<{ authenticated: boolean; clienteId?: string; nombreCliente?: string; message?: string }> {
    try {
      console.log('[SheetsAPI] Authenticating cliente with code:', codigo);

      const range = 'Accesos_clientes!A:E';
      // IMPORTANTE: Usar spreadsheetEntregasId para accesos
      const url = `${this.baseUrl}/${this.config.spreadsheetEntregasId}/values/${range}?key=${this.config.apiKey}`;
      console.log('[SheetsAPI] Using spreadsheetEntregasId for Accesos_clientes:', this.config.spreadsheetEntregasId);

      const response = await fetch(url);
      if (!response.ok) {
        return { authenticated: false, message: 'Error al validar acceso. Verifique su conexión.' };
      }

      const data = await response.json();
      const rows = data.values || [];

      if (rows.length === 0) {
        return { authenticated: false, message: 'Sistema de autenticación no configurado.' };
      }

      // Find matching code (skip header)
      const normalizedCodigo = codigo.trim().toUpperCase();

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const idCliente = row[0]?.trim();
        const codigoAcceso = row[1]?.trim().toUpperCase();
        const nombreCliente = row[2]?.trim();
        const activo = row[3]?.trim().toUpperCase();

        if (codigoAcceso === normalizedCodigo) {
          if (activo !== 'SI') {
            return { authenticated: false, message: 'Código de acceso desactivado. Contacte a Crosslog.' };
          }

          console.log('[SheetsAPI] ✅ Cliente authenticated:', nombreCliente);
          return {
            authenticated: true,
            clienteId: idCliente,
            nombreCliente: nombreCliente,
          };
        }
      }

      return { authenticated: false, message: 'Código de acceso inválido.' };
    } catch (error) {
      console.error('[SheetsAPI] Error authenticating cliente:', error);
      return { authenticated: false, message: 'Error al validar acceso.' };
    }
  }

  /**
   * Authenticate Fletero with access code
   */
  async authenticateFletero(codigo: string): Promise<{ authenticated: boolean; fleteroName?: string; message?: string }> {
    try {
      console.log('[SheetsAPI] Authenticating fletero with code:', codigo);

      const range = 'Accesos_fleteros!A:E';
      // IMPORTANTE: Usar spreadsheetEntregasId para accesos
      const url = `${this.baseUrl}/${this.config.spreadsheetEntregasId}/values/${range}?key=${this.config.apiKey}`;
      console.log('[SheetsAPI] Using spreadsheetEntregasId for Accesos_fleteros:', this.config.spreadsheetEntregasId);

      const response = await fetch(url);
      if (!response.ok) {
        return { authenticated: false, message: 'Error al validar acceso. Verifique su conexión.' };
      }

      const data = await response.json();
      const rows = data.values || [];

      if (rows.length === 0) {
        return { authenticated: false, message: 'Sistema de autenticación no configurado.' };
      }

      // Find matching code (skip header)
      const normalizedCodigo = codigo.trim().toUpperCase();

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const nombreFletero = row[0]?.trim();
        const codigoAcceso = row[1]?.trim().toUpperCase();
        const activo = row[2]?.trim().toUpperCase();

        if (codigoAcceso === normalizedCodigo) {
          if (activo !== 'SI') {
            return { authenticated: false, message: 'Código de acceso desactivado. Contacte a Crosslog.' };
          }

          console.log('[SheetsAPI] ✅ Fletero authenticated:', nombreFletero);
          return {
            authenticated: true,
            fleteroName: nombreFletero,
          };
        }
      }

      return { authenticated: false, message: 'Código de acceso inválido.' };
    } catch (error) {
      console.error('[SheetsAPI] Error authenticating fletero:', error);
      return { authenticated: false, message: 'Error al validar acceso.' };
    }
  }

  /**
   * Search HDR by HDR number - ONLY in Sistema_entregas (for authenticated users)
   */
  async searchHDRByNumber(hdr: string, filterBy?: { clienteId?: string; fletero?: string }): Promise<any> {
    try {
      console.log('[SheetsAPI] Searching HDR in Sistema_entregas:', hdr, 'Filter:', filterBy);

      const rangeSistema = 'Sistema_entregas!A:Q';
      // IMPORTANTE: Usar spreadsheetEntregasId para consultas
      const urlSistema = `${this.baseUrl}/${this.config.spreadsheetEntregasId}/values/${rangeSistema}?key=${this.config.apiKey}`;
      console.log('[SheetsAPI] Using spreadsheetEntregasId for search:', this.config.spreadsheetEntregasId);

      const responseSistema = await fetch(urlSistema);
      if (!responseSistema.ok) {
        return { found: false, message: 'Error al buscar en el sistema' };
      }

      const dataSistema = await responseSistema.json();
      const rowsSistema = dataSistema.values || [];

      if (rowsSistema.length === 0) {
        return { found: false, message: 'No hay datos disponibles' };
      }

      // Column indices for Sistema_entregas (CORRECTED)
      // B=1: HDR, E=4: Dador_carga (CLIENTE), Q=16: Tipo_Transporte
      const hdrIndex = 1;
      const clienteIndex = 4; // E (Dador_carga) - CORREGIDO!
      const tipoTransporteIndex = 16;

      const normalizedHDR = hdr.trim();

      const matchingRows = rowsSistema.slice(1).filter((row: string[]) => {
        const rowHDR = row[hdrIndex]?.trim();
        if (rowHDR !== normalizedHDR) return false;

        // Apply filters if provided
        if (filterBy?.clienteId) {
          const rowCliente = row[clienteIndex]?.trim().toUpperCase();
          const filterCliente = filterBy.clienteId.trim().toUpperCase();
          if (rowCliente !== filterCliente) return false;
        }

        if (filterBy?.fletero) {
          const rowFletero = row[tipoTransporteIndex]?.trim().toUpperCase();
          const filterFletero = filterBy.fletero.toUpperCase();
          // Si columna Q está vacía, es PROPIO
          const fleteroActual = rowFletero || 'PROPIO';
          if (fleteroActual !== filterFletero) return false;
        }

        return true;
      });

      console.log(`[SheetsAPI] Found ${matchingRows.length} rows for HDR ${normalizedHDR}`);

      if (matchingRows.length === 0) {
        return { found: false, message: 'No se encontraron resultados para esta HDR' };
      }

      // Group by HDR and build response
      const hdrData = this.buildHDRDataFromSistema(matchingRows);
      console.log(`[SheetsAPI] Built HDR data with ${hdrData?.entregas?.length || 0} entregas`);

      return {
        found: true,
        hdrs: [hdrData],
        message: `HDR encontrada con ${hdrData.entregas.length} entrega(s)`,
      };
    } catch (error) {
      console.error('[SheetsAPI] Error searching HDR:', error);
      return { found: false, message: 'Error al buscar' };
    }
  }

  /**
   * Search by Remito - ONLY in Sistema_entregas (for authenticated users)
   */
  async searchByRemito(numeroRemito: string, filterBy?: { clienteId?: string; fletero?: string }): Promise<any> {
    try {
      console.log('[SheetsAPI] Searching Remito in Sistema_entregas:', numeroRemito, 'Filter:', filterBy);

      const rangeSistema = 'Sistema_entregas!A:Q';
      // IMPORTANTE: Usar spreadsheetEntregasId para consultas
      const urlSistema = `${this.baseUrl}/${this.config.spreadsheetEntregasId}/values/${rangeSistema}?key=${this.config.apiKey}`;
      console.log('[SheetsAPI] Using spreadsheetEntregasId for remito search:', this.config.spreadsheetEntregasId);

      const responseSistema = await fetch(urlSistema);
      if (!responseSistema.ok) {
        return { found: false, message: 'Error al buscar en el sistema' };
      }

      const dataSistema = await responseSistema.json();
      const rowsSistema = dataSistema.values || [];

      if (rowsSistema.length === 0) {
        return { found: false, message: 'No hay datos disponibles' };
      }

      // Column indices (CORRECTED): B=1: HDR, D=3: numero_remitos (JSON array), E=4: Dador_carga (CLIENTE), Q=16: Tipo_Transporte
      const hdrIndex = 1;
      const remitoIndex = 3; // D (numero_remitos) - formato JSON ["38269"]
      const clienteIndex = 4; // E (Dador_carga) - CORREGIDO!
      const tipoTransporteIndex = 16;

      const normalizedRemito = numeroRemito.trim().toLowerCase();
      const hdrsFound = new Set<string>();

      rowsSistema.slice(1).forEach((row: string[]) => {
        // Parse remito from column D (JSON array format)
        const rawRemitoValue = row[remitoIndex]?.trim() || '';
        let remitoValues: string[] = [];

        // Try to parse JSON array ["38269"]
        if (rawRemitoValue.startsWith('[') && rawRemitoValue.endsWith(']')) {
          try {
            const parsed = JSON.parse(rawRemitoValue);
            if (Array.isArray(parsed)) {
              remitoValues = parsed.map(v => String(v).trim().toLowerCase());
            }
          } catch {
            // If parsing fails, try to extract numbers manually
            remitoValues = [rawRemitoValue.replace(/[\[\]"]/g, '').trim().toLowerCase()];
          }
        } else if (rawRemitoValue) {
          remitoValues = [rawRemitoValue.toLowerCase()];
        }

        // Check if any remito value matches
        const remitoMatch = remitoValues.some(remito =>
          remito.includes(normalizedRemito) || normalizedRemito.includes(remito)
        );

        if (remitoMatch) {
          // Apply filters
          if (filterBy?.clienteId) {
            const rowCliente = row[clienteIndex]?.trim().toUpperCase();
            const filterCliente = filterBy.clienteId.trim().toUpperCase();
            if (rowCliente !== filterCliente) return;
          }

          if (filterBy?.fletero) {
            const rowFletero = row[tipoTransporteIndex]?.trim().toUpperCase();
            const filterFletero = filterBy.fletero.toUpperCase();
            // Si columna Q está vacía, es PROPIO
            const fleteroActual = rowFletero || 'PROPIO';
            if (fleteroActual !== filterFletero) return;
          }

          const rowHDR = row[hdrIndex]?.trim();
          if (rowHDR) hdrsFound.add(rowHDR);
        }
      });

      if (hdrsFound.size === 0) {
        return { found: false, message: 'No se encontraron resultados para este remito' };
      }

      // Get details for each HDR found
      const hdrsData = [];
      for (const hdr of Array.from(hdrsFound)) {
        const result = await this.searchHDRByNumber(hdr, filterBy);
        if (result.found && result.hdrs) {
          hdrsData.push(...result.hdrs);
        }
      }

      return {
        found: hdrsData.length > 0,
        hdrs: hdrsData,
        message: `Se encontraron ${hdrsData.length} HDR(s)`,
      };
    } catch (error) {
      console.error('[SheetsAPI] Error searching by remito:', error);
      return { found: false, message: 'Error al buscar' };
    }
  }

  /**
   * Build HDR data from Sistema_entregas rows
   */
  private buildHDRDataFromSistema(rows: string[][]): any {
    if (rows.length === 0) return null;

    // ESTRUCTURA CORRECTA de Sistema_entregas:
    // A=0: Fecha_Viaje (ej: 25-09-2025)
    // B=1: Numero_HDR (ej: 7366289)
    // C=2: numero_entrega (ej: 1)
    // D=3: numero_remitos (ej: ["38269"]) - JSON array!
    // E=4: Dador_carga (ej: ECOLAB) - ESTE ES EL CLIENTE!
    // F=5: Detalle_entrega (ej: SCC POWER - SAN PEDRO)
    // G=6: Estado (ej: 1/2) - formato completadas/total!
    // H=7: Chofer (ej: Martin Romero)
    // I=8: Cant_remito (ej: 1)
    // J=9: entregas_completadas (ej: 1)
    // K=10: entregas_pendientes (ej: 1)
    // L=11: progreso_porcentaje (ej: 50)
    // M=12: firma_receptor (ej: JUAN PEREZ)
    // N=13: pdf_urls (ej: ["https://drive.google.com/file/d/..."])
    // Q=16: tipo_transporte (ej: FALZONE, BARCO, o vacío=PROPIO)

    // IMPORTANTE: Usar la ÚLTIMA fila porque contiene el progreso total acumulado
    // Cada entrega se registra como una fila separada, la última tiene el estado final
    const lastRow = rows[rows.length - 1];
    const fechaViajeRaw = lastRow[0]?.trim() || '';

    // Convertir fecha de YYYY/MM/DD a DD/MM/YYYY
    let fechaViaje = fechaViajeRaw;
    if (fechaViajeRaw) {
      const parts = fechaViajeRaw.split(/[-/]/);
      if (parts.length === 3) {
        // Si el primer elemento tiene 4 dígitos, es YYYY-MM-DD o YYYY/MM/DD
        if (parts[0].length === 4) {
          const [year, month, day] = parts;
          fechaViaje = `${day}/${month}/${year}`;
        }
        // Si ya está en formato DD-MM-YYYY o DD/MM/YYYY, convertir a DD/MM/YYYY
        else if (parts[0].length <= 2 && parts[2].length === 4) {
          fechaViaje = parts.join('/');
        }
      }
    }

    const hdr = lastRow[1]?.trim() || '';
    const chofer = lastRow[7]?.trim() || ''; // H (Chofer)

    // Q (Tipo_Transporte) - Determinar tipo de transporte
    const tipoTransporteRaw = lastRow[16]?.trim().toUpperCase() || '';
    const KNOWN_FLETEROS = ['VIMAAB', 'BARCO', 'PRODAN', 'LOGZO', 'DON PEDRO', 'CALLTRUCK', 'ANDROSIUK', 'FALZONE'];

    let fletero: string;
    if (!tipoTransporteRaw) {
      // Si está vacío, es CROSSLOG
      fletero = 'CROSSLOG';
    } else {
      // Si es un fletero conocido, usar ese nombre
      const isKnownFletero = KNOWN_FLETEROS.some(f => tipoTransporteRaw.includes(f));
      fletero = isKnownFletero ? tipoTransporteRaw : 'CROSSLOG';
    }

    // LEER VALORES REALES de las columnas J, K, L de la ÚLTIMA fila
    // La última fila contiene el progreso TOTAL acumulado del viaje completo
    const entregasCompletadasReal = parseInt(lastRow[9]?.trim() || '0', 10);  // J (entregas_completadas)
    const entregasPendientesReal = parseInt(lastRow[10]?.trim() || '0', 10);  // K (entregas_pendientes)
    const progresoReal = parseInt(lastRow[11]?.trim() || '0', 10);            // L (progreso_porcentaje)

    const entregas = rows.map((row, idx) => {
      const numeroEntrega = row[2]?.trim() || `${idx + 1}`;  // C

      // D (numero_remitos) - Parse JSON array ["38269", "38270"]
      let numeroRemito = '';
      let numerosRemito: string[] = [];
      const rawRemitoValue = row[3]?.trim() || '';

      if (rawRemitoValue.startsWith('[') && rawRemitoValue.endsWith(']')) {
        try {
          const parsed = JSON.parse(rawRemitoValue);
          if (Array.isArray(parsed)) {
            // Guardar TODOS los remitos en el array
            numerosRemito = parsed.map(r => String(r).trim()).filter(Boolean);
            // Mantener el primero para compatibilidad
            numeroRemito = numerosRemito[0] || '';
          }
        } catch {
          const single = rawRemitoValue.replace(/[\[\]"]/g, '').trim();
          numeroRemito = single;
          numerosRemito = [single];
        }
      } else if (rawRemitoValue) {
        numeroRemito = rawRemitoValue;
        numerosRemito = [rawRemitoValue];
      }

      const clienteId = row[4]?.trim() || '';                 // E (Dador_carga)
      const clienteNombre = clienteId;                        // Use Dador_carga as name
      const detalleEntregas = row[5]?.trim() || '';           // F (Detalle_entrega)
      const nombreReceptor = row[12]?.trim() || '';           // M (firma_receptor)

      // Parse PDF URLs from column N (index 13)
      let pdfUrls: string[] = [];
      const rawPdfValue = row[13]?.trim() || '';
      if (rawPdfValue.startsWith('[') && rawPdfValue.endsWith(']')) {
        try {
          const parsed = JSON.parse(rawPdfValue);
          if (Array.isArray(parsed)) {
            pdfUrls = parsed.map(url => String(url).trim()).filter(url => url.startsWith('http'));
          }
        } catch {
          pdfUrls = rawPdfValue.split(',').map(url => url.trim()).filter(url => url.startsWith('http'));
        }
      } else if (rawPdfValue) {
        pdfUrls = rawPdfValue.split(',').map(url => url.trim()).filter(url => url.startsWith('http'));
      }

      // Determine estado based on presence of PDF or signature (more reliable than column G)
      // Column G has global progress "1/2" which is not individual delivery status
      let estado: 'COMPLETADO' | 'PENDIENTE' | 'EN_REPARTO' = 'PENDIENTE';
      if (pdfUrls.length > 0 || nombreReceptor) {
        // If has PDF or signature, it's completed
        estado = 'COMPLETADO';
      } else {
        estado = 'PENDIENTE';
      }

      return {
        id: `${hdr}-${numeroEntrega}`,
        hdr,
        numeroEntrega,
        numeroRemito,
        numerosRemito, // Array completo de números de remito
        cliente: clienteId,
        clienteNombreCompleto: clienteNombre,
        detalleEntregas,
        estado,
        fechaCreacion: fechaViaje,
        fechaActualizacion: fechaViaje,
        fechaViaje,
        synced: true,
        nombreReceptor,
        pdfUrls: pdfUrls.filter(Boolean),
      };
    });

    // Calcular total de entregas: completadas + pendientes
    const totalEntregasReal = entregasCompletadasReal + entregasPendientesReal;

    console.log(`[SheetsAPI] HDR ${hdr} - Real values from DB:`, {
      entregasCompletadas: entregasCompletadasReal,
      entregasPendientes: entregasPendientesReal,
      total: totalEntregasReal,
      progreso: progresoReal
    });

    return {
      hdr,
      fechaViaje,
      chofer,
      fletero,
      totalEntregas: totalEntregasReal,
      entregasCompletadas: entregasCompletadasReal,
      entregasPendientes: entregasPendientesReal,
      progresoReal,
      entregas,
    };
  }

  /**
   * Fetch the specific unidad (column H) for a given HDR from BASE sheet
   * Returns the numeric unidad value for "Propio" transport
   */
  async fetchUnidadForHDR(hdr: string): Promise<string | null> {
    try {
      console.log('[SheetsAPI] Fetching unidad for HDR:', hdr, 'from BASE sheet...');

      const range = 'BASE!H:K'; // H=INT/Unidad, K=HDR
      const url = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}?key=${this.config.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.warn('[SheetsAPI] Could not fetch unidad from BASE');
        return null;
      }

      const data = await response.json();
      const rows = data.values || [];

      const normalizedHDR = hdr.trim();

      // Find the row with matching HDR (column K, index 3)
      for (let i = 1; i < rows.length; i++) {
        const rowHDR = rows[i][3]?.trim(); // Column K (HDR)
        const rowUnidad = rows[i][0]?.trim(); // Column H (INT/Unidad)

        if (rowHDR === normalizedHDR && rowUnidad && !isNaN(Number(rowUnidad))) {
          console.log('[SheetsAPI] ✅ Found unidad for HDR', hdr, ':', rowUnidad);
          return rowUnidad;
        }
      }

      console.warn('[SheetsAPI] No unidad found for HDR:', hdr);
      return null;
    } catch (error) {
      console.error('[SheetsAPI] Error fetching unidad for HDR:', error);
      return null;
    }
  }

  /**
   * Fetch available unidades (numeric values from column H of BASE sheet)
   * For "Propio" transport validation
   */
  async fetchUnidadesDisponibles(): Promise<string[]> {
    try {
      console.log('[SheetsAPI] Fetching available unidades from BASE sheet column H...');

      const range = 'BASE!H:H'; // Column H (INT/Transport type)
      const url = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}?key=${this.config.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.warn('[SheetsAPI] Could not fetch unidades from BASE');
        return ['63', '64', '46', '813', '54', '816', '45', '41']; // Default fallback
      }

      const data = await response.json();
      const rows = data.values || [];

      const unidades = new Set<string>();

      // Skip header row, extract numeric values
      for (let i = 1; i < rows.length; i++) {
        const value = rows[i][0]?.trim();
        if (value && !isNaN(Number(value))) {
          unidades.add(value);
        }
      }

      const unidadesArray = Array.from(unidades);

      if (unidadesArray.length === 0) {
        console.warn('[SheetsAPI] No unidades found, using defaults');
        return ['63', '64', '46', '813', '54', '816', '45', '41'];
      }

      console.log('[SheetsAPI] ✅ Found', unidadesArray.length, 'unidades');
      return unidadesArray;
    } catch (error) {
      console.error('[SheetsAPI] Error fetching unidades:', error);
      return ['63', '64', '46', '813', '54', '816', '45', '41']; // Default fallback
    }
  }

  /**
   * Get statistical indicators from BASE sheet
   * Columns: A=Fecha, G=Tipo Unidad, H=INT(Internos/Fleteros), I=CHOFER, K=HR(HDR), M=LOC/INT, F=CLIENTE
   * @param mesAnio - Optional filter in format "YYYY-MM" (e.g., "2025-01")
   */
  async getIndicadores(mesAnio?: string): Promise<any> {
    try {
      console.log('[SheetsAPI] Fetching indicadores from BASE sheet...', mesAnio ? `Filtered by: ${mesAnio}` : 'All data');

      const range = 'BASE!A8637:R'; // Leer desde fila 8637 hasta columna R (incluye año)
      const url = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}?key=${this.config.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        return { error: 'Error al obtener datos de BASE' };
      }

      const data = await response.json();
      const rows = data.values || [];

      console.log('[SheetsAPI] Rows received for indicators:', rows.length);
      if (rows.length > 0) {
        console.log('[SheetsAPI] First 3 data rows:', rows.slice(0, 3));
      }

      if (rows.length === 0) {
        console.warn('[SheetsAPI] No rows found in range BASE!A8637:Q');
        return { error: 'No hay datos disponibles' };
      }

      // No need to skip header since we start from row 8637
      let dataRows = rows;

      // Filter by month/year if specified
      if (mesAnio) {
        const COL_MES = 4;  // E (mes como número 1-12)
        const COL_ANIO = 17; // R (año como texto)
        const isYearOnly = mesAnio.length === 4; // Check if filtering by year only (e.g., "2024")
        const isMonthOnly = mesAnio.startsWith('M'); // Check if filtering by month only (e.g., "M1", "M12")

        let matchCount = 0;
        dataRows = dataRows.filter((row: string[], index: number) => {
          const anioValue = row[COL_ANIO]?.trim() || '';
          const mesValue = row[COL_MES]?.trim() || '';

          // Debug first 3 rows
          if (index < 3) {
            console.log(`[SheetsAPI] Row ${index} - Año: "${anioValue}", Mes: "${mesValue}"`);
          }

          let matches = false;

          if (isYearOnly) {
            // Filter by year only (column R)
            matches = anioValue === mesAnio;
          } else if (isMonthOnly) {
            // Filter by month only (all years)
            const monthNum = mesAnio.substring(1); // Remove "M" prefix
            matches = mesValue === monthNum;
          } else {
            // Filter by specific month (YYYY-MM format)
            // mesAnio viene en formato "2024-01", necesitamos extraer año y mes
            const [filterYear, filterMonth] = mesAnio.split('-');
            const filterMonthNum = parseInt(filterMonth, 10); // "01" -> 1

            if (index < 3) {
              console.log(`[SheetsAPI] Filtering - Looking for Year: "${filterYear}", Month: "${filterMonthNum}"`);
              console.log(`[SheetsAPI] Row has - Year: "${anioValue}", Month: "${mesValue}"`);
            }

            // Column R = año, Column E = mes (1-12)
            matches = anioValue === filterYear && mesValue === String(filterMonthNum);
          }

          if (matches) matchCount++;
          return matches;
        });

        console.log(`[SheetsAPI] Filter applied: "${mesAnio}" - Matched ${matchCount} rows out of ${rows.length} total`);
      }

      console.log('[SheetsAPI] Processing rows to count valid trips (only with valid Interno/Fletero in column H)...');

      if (dataRows.length === 0) {
        return { error: 'No hay datos para el mes seleccionado' };
      }

      // Indices de columnas (0-indexed)
      const COL_TIPO_UNIDAD = 6; // G
      const COL_INT = 7;         // H (Internos/Fleteros)
      const COL_CHOFER = 8;      // I
      const COL_HDR = 10;        // K
      const COL_LOC_INT = 12;    // M
      const COL_CLIENTE = 5;     // F

      // IMPORTANT: Lista de valores válidos en columna H
      // CROSSLOG (flota propia): números
      const CROSSLOG_IDS = ['41', '45', '46', '62', '63', '64', '813', '816', '817'];
      // FLETEROS (tercerizados): nombres
      const FLETEROS_CONOCIDOS = ['BARCO', 'DON PEDRO', 'VIMAAB', 'LOGZO', 'PRODAN', 'CALLTRUCK', 'MODESTRUCK', 'ANDROSIUK'];

      // Contadores y agrupadores
      const choferes = new Map<string, number>();
      const clientes = new Map<string, number>();
      const internos = new Map<string, number>();
      const tiposUnidad = new Map<string, number>();
      const locInt = new Map<string, number>();
      const fleteros = new Map<string, number>();
      let crosslogCount = 0;
      let fleterosCount = 0;
      let totalViajes = 0; // Will count only valid trips

      // Procesar cada fila
      dataRows.forEach((row: string[]) => {
        const chofer = row[COL_CHOFER]?.trim() || '';
        const cliente = row[COL_CLIENTE]?.trim() || '';
        const interno = row[COL_INT]?.trim() || '';
        const tipoUnidad = row[COL_TIPO_UNIDAD]?.trim() || '';
        const locIntValue = row[COL_LOC_INT]?.trim() || '';

        // CRITICAL: Solo contar como viaje válido si columna H tiene valor válido
        // Determinar si esta fila es un viaje válido
        let isValidTrip = false;
        let isCrosslog = false;
        let isFletero = false;

        if (interno) {
          const internoUpper = interno.toUpperCase();
          const internoTrimmed = interno.trim();

          // Verificar si es un ID de CROSSLOG específico
          if (CROSSLOG_IDS.includes(internoTrimmed)) {
            isValidTrip = true;
            isCrosslog = true;
            crosslogCount++;
            internos.set(interno, (internos.get(interno) || 0) + 1);
          }
          // Verificar si es cualquier otro número (CROSSLOG genérico)
          else if (/^\d+$/.test(internoTrimmed)) {
            isValidTrip = true;
            isCrosslog = true;
            crosslogCount++;
            internos.set(interno, (internos.get(interno) || 0) + 1);
          }
          // Verificar si es un fletero conocido
          else if (FLETEROS_CONOCIDOS.some(f => internoUpper.includes(f))) {
            isValidTrip = true;
            isFletero = true;
            fleterosCount++;
            fleteros.set(interno, (fleteros.get(interno) || 0) + 1);
          }
        }

        // Solo continuar procesando si es un viaje válido
        if (!isValidTrip) {
          return; // Skip this row
        }

        // Increment total valid trips
        totalViajes++;

        // Contar choferes (solo viajes válidos)
        if (chofer) {
          choferes.set(chofer, (choferes.get(chofer) || 0) + 1);
        }

        // Contar clientes (solo viajes válidos, excluir códigos especiales)
        const CLIENTES_EXCLUIDOS = ['OT', 'PEON', 'AIR', 'AUS', 'VAC', 'MANT', 'VRAC'];
        if (cliente && !CLIENTES_EXCLUIDOS.includes(cliente.toUpperCase())) {
          clientes.set(cliente, (clientes.get(cliente) || 0) + 1);
        }

        // Contar tipos de unidad (Columna G)
        if (tipoUnidad) {
          tiposUnidad.set(tipoUnidad, (tiposUnidad.get(tipoUnidad) || 0) + 1);
        }

        // Contar LOC/INT (Columna M)
        if (locIntValue) {
          locInt.set(locIntValue, (locInt.get(locIntValue) || 0) + 1);
        }
      });

      // Ordenar y obtener tops
      const topChoferes = Array.from(choferes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([nombre, viajes]) => ({ nombre, viajes }));

      const topClientes = Array.from(clientes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([nombre, viajes]) => ({ nombre, viajes, porcentaje: ((viajes / totalViajes) * 100).toFixed(1) }));

      const topInternos = Array.from(internos.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([nombre, viajes]) => ({ nombre, viajes, porcentaje: ((viajes / totalViajes) * 100).toFixed(1) }));

      const topTiposUnidad = Array.from(tiposUnidad.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([tipo, cantidad]) => ({ tipo, cantidad, porcentaje: ((cantidad / totalViajes) * 100).toFixed(1) }));

      // Calculate LOC/INT percentages based on LOC+INT total only
      const locIntTotal = Array.from(locInt.values()).reduce((sum, count) => sum + count, 0);
      const distribLocInt = Array.from(locInt.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([tipo, cantidad]) => ({ tipo, cantidad, porcentaje: locIntTotal > 0 ? ((cantidad / locIntTotal) * 100).toFixed(1) : '0.0' }));

      const topFleteros = Array.from(fleteros.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([nombre, viajes]) => ({ nombre, viajes, porcentaje: ((viajes / totalViajes) * 100).toFixed(1) }));

      console.log('[SheetsAPI] ✅ Indicadores calculated:', {
        totalViajes,
        crosslogCount,
        fleterosCount,
        sum: crosslogCount + fleterosCount,
        note: 'totalViajes ahora solo cuenta filas con Interno/Fletero válido en columna H',
        topChoferes: topChoferes.length,
        topClientes: topClientes.length,
        topInternos: topInternos.length
      });

      // Calculate percentages based on CROSSLOG + FLETEROS total (not all trips)
      const crosslogFleterosTotal = crosslogCount + fleterosCount;

      return {
        totalViajes,
        crosslogVsFleteros: [
          { tipo: 'CROSSLOG', cantidad: crosslogCount, porcentaje: crosslogFleterosTotal > 0 ? ((crosslogCount / crosslogFleterosTotal) * 100).toFixed(1) : '0.0' },
          { tipo: 'FLETEROS', cantidad: fleterosCount, porcentaje: crosslogFleterosTotal > 0 ? ((fleterosCount / crosslogFleterosTotal) * 100).toFixed(1) : '0.0' }
        ],
        topChoferes,
        topClientes,
        topInternos,
        topTiposUnidad,
        distribLocInt,
        topFleteros
      };

    } catch (error) {
      console.error('[SheetsAPI] Error fetching indicadores:', error);
      return { error: 'Error al calcular indicadores' };
    }
  }

  /**
   * Get available months from BASE sheet for filtering
   * Returns array of {value: "YYYY-MM", label: "Mes YYYY"} objects
   */
  async getMesesDisponibles(): Promise<{ value: string; label: string }[]> {
    try {
      console.log('[SheetsAPI] Fetching available months from BASE sheet...');

      const range = 'BASE!E8637:R'; // Columna E (mes) y columna R (año) desde fila 8637
      const url = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}?key=${this.config.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const rows = data.values || [];

      console.log('[SheetsAPI] Rows received for months:', rows.length);
      if (rows.length > 0) {
        console.log('[SheetsAPI] First 5 month/year rows:', rows.slice(0, 5));
      }

      if (rows.length === 0) {
        console.warn('[SheetsAPI] No rows found in range BASE!E8637:R');
        return [];
      }

      // Extract unique months (no need to skip header since we start from row 8637)
      const mesesSet = new Set<string>();
      const dataRows = rows;

      dataRows.forEach((row: string[], index: number) => {
        // Column E is index 0 (mes 1-12), Column R is index 13 (año)
        const mesValue = row[0]?.trim() || '';
        const anioValue = row[13]?.trim() || '';

        if (!mesValue || !anioValue) {
          if (index < 10) console.log(`[SheetsAPI] Empty month or year at row ${index}:`, { mes: mesValue, anio: anioValue });
          return;
        }

        // Create YYYY-MM format (mes needs to be padded to 2 digits)
        const mesPadded = mesValue.padStart(2, '0');
        const mesAnio = `${anioValue}-${mesPadded}`;
        mesesSet.add(mesAnio);
      });

      // Convert to array and sort (newest first)
      const meses = Array.from(mesesSet)
        .sort((a, b) => b.localeCompare(a))
        .map(mesAnio => {
          const [year, month] = mesAnio.split('-');
          const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
          const monthName = monthNames[parseInt(month, 10) - 1];
          return {
            value: mesAnio,
            label: `${monthName} ${year}`
          };
        });

      console.log('[SheetsAPI] ✅ Found months:', meses.length);
      return meses;

    } catch (error) {
      console.error('[SheetsAPI] Error fetching available months:', error);
      return [];
    }
  }

  /**
   * Get monthly trip data with filters
   */
  async getViajePorMes(filters: {
    anio?: string;
    tipoTransporte?: string;
    cliente?: string;
    tipoUnidad?: string;
  } = {}) {
    try {
      console.log('[SheetsAPI] Fetching monthly trip data with filters:', filters);

      const range = 'BASE!A8637:R';
      const url = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}?key=${this.config.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.error('[SheetsAPI] Error fetching monthly data:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      const rows = data.values || [];
      if (rows.length === 0) {
        return [];
      }

      const COL_MES = 4;       // E (mes como número 1-12)
      const COL_CLIENTE = 5;   // F (cliente)
      const COL_TIPO_UNIDAD = 6; // G (tipo de unidad)
      const COL_INT = 7;       // H (interno/fletero)
      const COL_ANIO = 17;     // R (año)

      const FLETEROS_CONOCIDOS = ['BARCO', 'PRODAN', 'VIMAAB', 'LOGZO', 'DON PEDRO', 'CALLTRUCK', 'ANDROSIUK', 'FALZONE'];

      // Agrupar por mes
      const mesesMap = new Map<string, number>();

      rows.forEach((row: string[]) => {
        const mesValue = row[COL_MES]?.trim() || '';
        const anioValue = row[COL_ANIO]?.trim() || '';
        const clienteValue = row[COL_CLIENTE]?.trim() || '';
        const tipoUnidadValue = row[COL_TIPO_UNIDAD]?.trim() || '';
        const internoValue = row[COL_INT]?.trim() || '';

        if (!mesValue || !anioValue) return;

        // Aplicar filtros
        if (filters.anio && filters.anio !== 'todos' && anioValue !== filters.anio) return;

        if (filters.tipoTransporte && filters.tipoTransporte !== 'todos') {
          const isNumeric = /^\d+$/.test(internoValue);
          const isFletero = FLETEROS_CONOCIDOS.some(f => internoValue.toUpperCase().includes(f));

          if (filters.tipoTransporte === 'CROSSLOG' && !isNumeric) return;
          if (filters.tipoTransporte === 'FLETEROS' && !isFletero) return;
        }

        if (filters.cliente && filters.cliente !== 'todos' && clienteValue !== filters.cliente) return;
        if (filters.tipoUnidad && filters.tipoUnidad !== 'todos' && tipoUnidadValue !== filters.tipoUnidad) return;

        // Crear key mes-año
        const mesNum = parseInt(mesValue, 10);
        const key = `${anioValue}-${mesValue.padStart(2, '0')}`;

        mesesMap.set(key, (mesesMap.get(key) || 0) + 1);
      });

      // Convertir a array y ordenar
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const result = Array.from(mesesMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, viajes]) => {
          const [year, month] = key.split('-');
          const monthNum = parseInt(month, 10);
          return {
            mes: `${monthNames[monthNum - 1]} ${year}`,
            viajes,
            key
          };
        });

      console.log('[SheetsAPI] ✅ Monthly data calculated:', result.length, 'months');
      return result;

    } catch (error) {
      console.error('[SheetsAPI] Error fetching monthly trip data:', error);
      return [];
    }
  }

  /**
   * Fetch chofer documents from Choferes_Documentos sheet
   * Returns: { nombre, unidad, tipo, nombreDoc, fechaVenc, url, esPropio }
   */
  async fetchChoferDocumentos(nombreChofer?: string): Promise<any[]> {
    try {
      console.log('[SheetsAPI] Fetching chofer documents for:', nombreChofer || 'ALL');
      const range = 'Choferes_Documentos!A:J';
      const url = `${this.baseUrl}/${this.config.spreadsheetEntregasId}/values/${range}?key=${this.config.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.error('[SheetsAPI] Failed to fetch chofer documents');
        return [];
      }

      const data = await response.json();
      const rows = data.values || [];

      // Skip header row and optionally filter by chofer name
      // Columnas: Nombre_Chofer | DNI | Unidad | Tipo_Unidad | Habilidad | Tipo_Doc | Nombre_Documento | Fecha_Vencimiento | URL_Archivo | Es_Propio
      let documents = rows.slice(1)
        .map((row: string[]) => ({
          nombreChofer: row[0]?.trim() || '',
          dni: row[1]?.trim() || '',
          unidad: row[2]?.trim() || '',
          tipoUnidad: row[3]?.trim() || '',
          habilidad: row[4]?.trim() || '',
          tipo: row[5]?.trim() || '',
          nombreDocumento: row[6]?.trim() || '',
          fechaVencimiento: row[7]?.trim() || null,
          urlArchivo: row[8]?.trim() || '',
          esPropio: row[9]?.trim().toUpperCase() === 'TRUE'
        }));

      // Filter by chofer name if provided
      if (nombreChofer) {
        documents = documents.filter((doc: any) => doc.nombreChofer === nombreChofer);
      }

      console.log('[SheetsAPI] Found', documents.length, 'chofer documents');
      return documents;
    } catch (error) {
      console.error('[SheetsAPI] Error fetching chofer documents:', error);
      return [];
    }
  }

  /**
   * Helper: Normaliza número de unidad para comparación
   * Ejemplos: "INT-46" → "46", "803" → "803", " 62 " → "62"
   */
  private normalizeUnitNumber(unitNumber: string): string {
    if (!unitNumber) return '';
    // Eliminar espacios, convertir a mayúsculas, y extraer solo números
    return unitNumber.trim().toUpperCase().replace(/[^0-9]/g, '');
  }

  /**
   * Helper: Verifica si una unidad está en una lista (soporta "46-61", "46", etc.)
   * Ejemplos: containsUnit("46-61", "46") → true, containsUnit("46", "46") → true
   */
  private containsUnit(unidadField: string, searchUnit: string): boolean {
    if (!unidadField || !searchUnit) return false;

    // Normalizar la unidad buscada
    const normalizedSearch = this.normalizeUnitNumber(searchUnit);

    // Si el campo contiene guiones, separar y normalizar cada parte
    const parts = unidadField.split(/[-,\/]/).map(p => this.normalizeUnitNumber(p.trim()));

    // Verificar si alguna parte coincide
    return parts.includes(normalizedSearch);
  }

  /**
   * Fetch chofer documents by unit number
   * Useful when you don't know the chofer name but have the unit
   * Supports multiple units per chofer (e.g., "46-61")
   */
  async fetchChoferByUnidad(numeroUnidad: string): Promise<any[]> {
    try {
      console.log('[SheetsAPI] Fetching chofer by unit:', numeroUnidad);
      const range = 'Choferes_Documentos!A:J';
      const url = `${this.baseUrl}/${this.config.spreadsheetEntregasId}/values/${range}?key=${this.config.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.error('[SheetsAPI] Failed to fetch chofer documents');
        return [];
      }

      const data = await response.json();
      const rows = data.values || [];

      // Skip header row and filter by unit
      const documents = rows.slice(1)
        .map((row: string[]) => ({
          nombreChofer: row[0]?.trim() || '',
          dni: row[1]?.trim() || '',
          unidad: row[2]?.trim() || '',
          tipoUnidad: row[3]?.trim() || '',
          habilidad: row[4]?.trim() || '',
          tipo: row[5]?.trim() || '',
          nombreDocumento: row[6]?.trim() || '',
          fechaVencimiento: row[7]?.trim() || null,
          urlArchivo: row[8]?.trim() || '',
          esPropio: row[9]?.trim().toUpperCase() === 'TRUE'
        }))
        .filter((doc: any) => this.containsUnit(doc.unidad, numeroUnidad));

      console.log('[SheetsAPI] Found', documents.length, 'chofer documents for unit', numeroUnidad);
      return documents;
    } catch (error) {
      console.error('[SheetsAPI] Error fetching chofer by unit:', error);
      return [];
    }
  }

  /**
   * Fetch unit documents from Unidades_Documentos sheet
   * Returns: { numeroUnidad, tipo, nombreDoc, fechaVenc, url }
   */
  async fetchUnidadDocumentos(numeroUnidad?: string): Promise<any[]> {
    try {
      console.log('[SheetsAPI] Fetching unit documents for:', numeroUnidad || 'ALL');
      const range = 'Unidades_Documentos!A:F';
      const url = `${this.baseUrl}/${this.config.spreadsheetEntregasId}/values/${range}?key=${this.config.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.error('[SheetsAPI] Failed to fetch unit documents');
        return [];
      }

      const data = await response.json();
      const rows = data.values || [];

      // Skip header row and optionally filter by unit number
      // Columnas: Numero_Unidad | Tipo_Unidad | Tipo_Doc | Nombre_Documento | Fecha_Vencimiento | URL_Documento
      let documents = rows.slice(1)
        .map((row: string[]) => ({
          numeroUnidad: row[0]?.trim() || '',
          tipoUnidad: row[1]?.trim() || '',
          tipo: row[2]?.trim() || '',
          nombreDocumento: row[3]?.trim() || '',
          fechaVencimiento: row[4]?.trim() || '',
          urlArchivo: row[5]?.trim() || ''
        }));

      // Filter by unit number if provided (con normalización para comparar)
      if (numeroUnidad) {
        const normalizedSearch = this.normalizeUnitNumber(numeroUnidad);
        documents = documents.filter((doc: any) => {
          const normalizedDoc = this.normalizeUnitNumber(doc.numeroUnidad);
          return normalizedDoc === normalizedSearch;
        });
        console.log('[SheetsAPI] Filtered to unit:', numeroUnidad, '→ normalized:', normalizedSearch);
      }

      console.log('[SheetsAPI] Found', documents.length, 'unit documents');
      return documents;
    } catch (error) {
      console.error('[SheetsAPI] Error fetching unit documents:', error);
      return [];
    }
  }

  /**
   * Fetch cuadernillo from Cuadernillos sheet
   * Returns: { nombreChofer, mes, fechaEmision, fechaVenc, url }
   */
  async fetchCuadernillo(nombreChofer?: string, mes?: string): Promise<any | any[]> {
    try {
      console.log('[SheetsAPI] Fetching cuadernillo for:', nombreChofer || 'ALL', mes || 'latest');
      const range = 'Cuadernillos!A:E';
      const url = `${this.baseUrl}/${this.config.spreadsheetEntregasId}/values/${range}?key=${this.config.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.error('[SheetsAPI] Failed to fetch cuadernillo');
        return nombreChofer ? null : [];
      }

      const data = await response.json();
      const rows = data.values || [];

      // Skip header row and map all cuadernillos
      let cuadernillos = rows.slice(1)
        .map((row: string[]) => ({
          nombreChofer: row[0]?.trim() || '',
          mes: row[1]?.trim() || '',
          fechaEmision: row[2]?.trim() || '',
          fechaVencimiento: row[3]?.trim() || '',
          urlCuadernillo: row[4]?.trim() || ''
        }));

      // If nombreChofer provided, filter by it
      if (nombreChofer) {
        cuadernillos = cuadernillos.filter((c: any) => c.nombreChofer === nombreChofer);
      }

      // If mes specified, filter by it
      if (mes) {
        cuadernillos = cuadernillos.filter((c: any) => c.mes === mes);
      }

      // Sort by mes descending
      cuadernillos.sort((a: any, b: any) => b.mes.localeCompare(a.mes));

      // If nombreChofer was provided, return single cuadernillo (for chofer view)
      if (nombreChofer) {
        const cuadernillo = cuadernillos[0] || null;
        console.log('[SheetsAPI] Found cuadernillo:', cuadernillo ? 'Yes' : 'No');
        return cuadernillo;
      }

      // Otherwise return all (for admin view)
      console.log('[SheetsAPI] Found', cuadernillos.length, 'cuadernillos');
      return cuadernillos;
    } catch (error) {
      console.error('[SheetsAPI] Error fetching cuadernillo:', error);
      return nombreChofer ? null : [];
    }
  }

  /**
   * Fetch all cuadernillos (alias for fetchCuadernillo without parameters)
   */
  async fetchCuadernillos(): Promise<any[]> {
    const result = await this.fetchCuadernillo();
    return Array.isArray(result) ? result : [];
  }

  /**
   * WRITE OPERATIONS - Require Google Apps Script Web App
   * These functions call the deployed Google Apps Script to write data
   */

  private async callAppsScript(action: string, data: any): Promise<{ success: boolean; message: string; data?: any }> {
    const appsScriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

    if (!appsScriptUrl) {
      console.error('[SheetsAPI] VITE_GOOGLE_APPS_SCRIPT_URL not configured');
      return {
        success: false,
        message: 'Google Apps Script URL no configurada. Contacte al administrador.'
      };
    }

    try {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        mode: 'no-cors', // Apps Script requires no-cors
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          ...data
        })
      });

      // Note: no-cors means we can't read the response
      // We assume success if no error was thrown
      console.log('[SheetsAPI] Apps Script call completed for action:', action);
      return {
        success: true,
        message: 'Datos guardados exitosamente'
      };
    } catch (error) {
      console.error('[SheetsAPI] Error calling Apps Script:', error);
      return {
        success: false,
        message: 'Error al guardar datos: ' + (error as Error).message
      };
    }
  }

  /**
   * Add chofer document
   */
  async addChoferDocumento(data: {
    nombreChofer: string;
    dni: string;
    unidad: string;
    tipoUnidad: string;
    habilidad: string;
    tipoDoc: string;
    nombreDocumento: string;
    fechaVencimiento?: string;
    urlArchivo: string;
    esPropio: boolean;
  }): Promise<{ success: boolean; message: string }> {
    console.log('[SheetsAPI] Adding chofer documento:', data);
    return this.callAppsScript('addChoferDocumento', data);
  }

  /**
   * Add unidad document
   */
  async addUnidadDocumento(data: {
    numeroUnidad: string;
    tipoUnidad: string;
    tipoDoc: string;
    nombreDocumento: string;
    fechaVencimiento: string;
    urlDocumento: string;
  }): Promise<{ success: boolean; message: string }> {
    console.log('[SheetsAPI] Adding unidad documento:', data);
    return this.callAppsScript('addUnidadDocumento', data);
  }

  /**
   * Add cuadernillo
   */
  async addCuadernillo(data: {
    nombreDocumento: string;
    mes: string;
    fechaEmision?: string;
    fechaVencimiento?: string;
    urlDocumento: string;
  }): Promise<{ success: boolean; message: string }> {
    console.log('[SheetsAPI] Adding cuadernillo:', data);
    return this.callAppsScript('addCuadernillo', data);
  }

  /**
   * Update chofer document
   */
  async updateChoferDocumento(data: any): Promise<{ success: boolean; message: string }> {
    console.log('[SheetsAPI] Updating chofer documento:', data);
    return this.callAppsScript('updateChoferDocumento', data);
  }

  /**
   * Update unidad document
   */
  async updateUnidadDocumento(data: any): Promise<{ success: boolean; message: string }> {
    console.log('[SheetsAPI] Updating unidad documento:', data);
    return this.callAppsScript('updateUnidadDocumento', data);
  }

  /**
   * ==================== VALORES DIARIOS DE DISTRIBUCIÓN ====================
   * Fetch valores generados por día por unidad desde la planilla de distribución
   * Lee desde la hoja "Valores_Diarios_Distribucion" (formato vertical)
   * @param mesAnio - Formato "YYYY-MM" (ej: "2025-12") o "YYYY" para todo el año
   * @returns Datos de valores generados por unidad por día
   */
  async getValoresDiariosDistribucion(mesAnio?: string): Promise<{
    unidades: Array<{
      interno: string;
      porte: string;
      tipoTransporte: 'CROSSLOG' | 'FLETEROS';
      chofer: string;
      valoresDiarios: Array<{
        dia: number;
        valor: number;
        fecha: string;
      }>;
      totalMes: number;
      promedioDiario: number;
      diasActivos: number;
    }>;
    totalesPorDia: Array<{
      dia: number;
      total: number;
      fecha: string;
    }>;
    resumen: {
      totalMesCrosslog: number;
      totalMesFleteros: number;
      totalMesGeneral: number;
      mejorDia: { dia: number; valor: number; fecha: string };
      peorDia: { dia: number; valor: number; fecha: string };
      promedioGeneral: number;
      diasMantenimiento: number;
      diasSinServicio: number;
      diasViaje: number;
    };
  }> {
    try {
      console.log('[SheetsAPI] ✨ MODO LECTURA DIRECTA - Leyendo desde hoja Milanesa');

      const spreadsheetId = '1ZIpJxakO8xdQ5V2yoO6kiHvNndA7h6jhhOhBekWaGlI';

      // OPCIÓN A: Leer DIRECTAMENTE de la hoja "Milanesa" (formato horizontal)
      return await this.getValoresDariosDesdeMilanesa(spreadsheetId, mesAnio);

      // NOTA: La función antigua que leía de "Valores_Diarios_Distribucion" se mantiene abajo por si se necesita

    } catch (error) {
      console.error('[SheetsAPI] Error fetching valores diarios:', error);
      return this.getEmptyValoresDiariosResponse();
    }
  }

  /**
   * OPCIÓN A: Lee valores directamente de la hoja "Milanesa" (formato horizontal)
   * Procesa en tiempo real sin necesidad de ejecutar script de migración
   */
  private async getValoresDariosDesdeMilanesa(spreadsheetId: string, mesAnio?: string) {
    console.log('[SheetsAPI] 📊 Leyendo valores directamente de Milanesa...');

    // Leer header para obtener mes/año (fila 1)
    const headerRange = 'Milanesa!A1:A1';
    const headerUrl = `${this.baseUrl}/${spreadsheetId}/values/${headerRange}?key=${this.config.apiKey}`;
    const headerResponse = await fetch(headerUrl);
    const headerData = await headerResponse.json();
    const headerText = headerData.values?.[0]?.[0] || 'DICIEMBRE 2025';

    // Extraer mes y año del header de la hoja
    const { mes, anio } = this.extraerMesAnio(headerText);
    console.log(`[SheetsAPI] Mes disponible en Milanesa: ${mes}/${anio}`);

    // Verificar si el mes solicitado coincide con el mes de la hoja
    if (mesAnio) {
      const [anioSolicitado, mesSolicitado] = mesAnio.split('-').map(Number);
      console.log(`[SheetsAPI] Mes solicitado: ${mesSolicitado}/${anioSolicitado}`);

      if (anioSolicitado !== anio || mesSolicitado !== mes) {
        console.warn(`[SheetsAPI] ⚠️ El mes solicitado (${mesSolicitado}/${anioSolicitado}) no coincide con el mes disponible (${mes}/${anio})`);
        return this.getEmptyValoresDiariosResponse();
      }
    }

    console.log(`[SheetsAPI] ✅ Procesando mes: ${mes}/${anio}`);

    // Leer datos de CROSSLOG (filas 3-10) y FLETEROS (filas 12-15)
    // Columnas: A=Chofer, B=Interno, C=Porte, D-AH=Días 1-31
    const rangeCrosslog = 'Milanesa!A3:AH10';
    const rangeFleteros = 'Milanesa!A12:AH15';
    const rangeTotales = 'Milanesa!A16:C18'; // Leer totales calculados en Google Sheets

    const [crosslogResponse, fleterosResponse, totalesResponse] = await Promise.all([
      fetch(`${this.baseUrl}/${spreadsheetId}/values/${rangeCrosslog}?key=${this.config.apiKey}`),
      fetch(`${this.baseUrl}/${spreadsheetId}/values/${rangeFleteros}?key=${this.config.apiKey}`),
      fetch(`${this.baseUrl}/${spreadsheetId}/values/${rangeTotales}?key=${this.config.apiKey}`)
    ]);

    const crosslogData = await crosslogResponse.json();
    const fleterosData = await fleterosResponse.json();
    const totalesData = await totalesResponse.json();

    const unidades: any[] = [];
    const totalesPorDia: any[] = [];
    const mantenimientoPorDia: Map<number, string[]> = new Map(); // dia -> [internos]

    let diasMantenimiento = 0;
    let diasSinServicio = 0;
    let diasViaje = 0;

    // Calcular días reales del mes
    const diasDelMes = new Date(anio, mes, 0).getDate(); // Obtiene el último día del mes
    console.log(`[SheetsAPI] El mes ${mes}/${anio} tiene ${diasDelMes} días`);

    // Inicializar totales por día (solo días válidos del mes)
    for (let dia = 1; dia <= diasDelMes; dia++) {
      totalesPorDia.push({ dia, total: 0, fecha: this.formatearFecha(anio, mes, dia) });
    }

    // Procesar CROSSLOG (filas 3-10)
    const crosslogRows = crosslogData.values || [];
    console.log(`[SheetsAPI] 🚛 CROSSLOG tiene ${crosslogRows.length} filas`);

    for (const row of crosslogRows) {
      const chofer = row[0]?.toString().trim() || 'Sin asignar';
      const interno = row[1]?.toString().trim();
      const porte = row[2]?.toString().trim();

      if (!interno) {
        console.log(`[SheetsAPI] ⏭️ Saltando fila sin interno: ${chofer}`);
        continue; // Saltar si no hay interno
      }

      console.log(`[SheetsAPI] 📝 Procesando: ${chofer} - ${interno} - ${porte}`);

      const valoresDiarios: any[] = [];
      let totalMes = 0;
      let diasActivos = 0;

      // Procesar solo los días válidos del mes (columnas D-AH = índices 3-33)
      for (let dia = 1; dia <= diasDelMes; dia++) {
        const colIndex = 3 + (dia - 1); // Columna D=3, E=4, ..., AH=33
        const celdaValor = row[colIndex];

        // Detectar estado y valor
        let valor = 0;
        let estado = 'SIN_SERVICIO';

        if (celdaValor === 'M') {
          estado = 'MANTENIMIENTO';
          diasMantenimiento++;
          // Registrar unidad en mantenimiento para este día
          if (!mantenimientoPorDia.has(dia)) {
            mantenimientoPorDia.set(dia, []);
          }
          mantenimientoPorDia.get(dia)!.push(interno);
        } else if (celdaValor === 'V') {
          estado = 'VIAJE';
          diasViaje++;
        } else if (celdaValor === '' || celdaValor === null || celdaValor === undefined || celdaValor === 0) {
          estado = 'SIN_SERVICIO';
          diasSinServicio++;
        } else {
          const parsedValor = parseFloat(celdaValor);
          if (!isNaN(parsedValor)) {
            valor = parsedValor;
            estado = 'ACTIVO';
            totalMes += valor;
            diasActivos++;

            // Sumar a total del día
            totalesPorDia[dia - 1].total += valor;

            // Debug: Log valores significativos (> 500)
            if (dia >= 17 && dia <= 20 && valor > 500) {
              console.log(`[SheetsAPI] 💰 Día ${dia} (${interno}): ${valor}`);
            }
          } else {
            estado = 'SIN_SERVICIO';
            diasSinServicio++;
          }
        }

        valoresDiarios.push({
          dia,
          valor,
          fecha: this.formatearFecha(anio, mes, dia)
        });
      }

      unidades.push({
        interno,
        porte,
        tipoTransporte: 'CROSSLOG' as const,
        chofer,
        valoresDiarios,
        totalMes,
        promedioDiario: diasActivos > 0 ? totalMes / diasActivos : 0,
        diasActivos
      });
    }

    // Procesar FLETEROS (filas 12-15)
    const fleterosRows = fleterosData.values || [];
    for (const row of fleterosRows) {
      const nombreFletero = row[1]?.toString().trim(); // Columna B = nombre

      if (!nombreFletero || nombreFletero.toLowerCase() === 'fleteros') continue;

      const valoresDiarios: any[] = [];
      let totalMes = 0;
      let diasActivos = 0;

      // Procesar solo los días válidos del mes
      for (let dia = 1; dia <= diasDelMes; dia++) {
        const colIndex = 3 + (dia - 1);
        const celdaValor = row[colIndex];

        let valor = 0;
        let estado = 'SIN_SERVICIO';

        if (celdaValor === 'M') {
          estado = 'MANTENIMIENTO';
          diasMantenimiento++;
          // Registrar unidad en mantenimiento para este día
          if (!mantenimientoPorDia.has(dia)) {
            mantenimientoPorDia.set(dia, []);
          }
          mantenimientoPorDia.get(dia)!.push(interno);
        } else if (celdaValor === 'V') {
          estado = 'VIAJE';
          diasViaje++;
        } else if (celdaValor === '' || celdaValor === null || celdaValor === undefined || celdaValor === 0) {
          estado = 'SIN_SERVICIO';
          diasSinServicio++;
        } else {
          const parsedValor = parseFloat(celdaValor);
          if (!isNaN(parsedValor)) {
            valor = parsedValor;
            estado = 'ACTIVO';
            totalMes += valor;
            diasActivos++;
            totalesPorDia[dia - 1].total += valor;
          } else {
            estado = 'SIN_SERVICIO';
            diasSinServicio++;
          }
        }

        valoresDiarios.push({
          dia,
          valor,
          fecha: this.formatearFecha(anio, mes, dia)
        });
      }

      unidades.push({
        interno: nombreFletero,
        porte: '-',
        tipoTransporte: 'FLETEROS' as const,
        chofer: nombreFletero,
        valoresDiarios,
        totalMes,
        promedioDiario: diasActivos > 0 ? totalMes / diasActivos : 0,
        diasActivos
      });
    }

    // Leer totales desde celdas A16:C18 (calculados por Google Sheets)
    const totalesRows = totalesData.values || [];
    let totalMesFleteros = 0;
    let totalMesCrosslog = 0;
    let totalMesGeneral = 0;

    // Parsear totales de las celdas
    if (totalesRows.length >= 3) {
      // Fila 16 (índice 0): Total Fleteros
      const totalFleterosStr = totalesRows[0]?.[2]?.toString().trim() || '0';
      totalMesFleteros = parseFloat(totalFleterosStr.replace(/[^0-9.-]/g, '')) || 0;

      // Fila 17 (índice 1): Total Propios
      const totalPropiosStr = totalesRows[1]?.[2]?.toString().trim() || '0';
      totalMesCrosslog = parseFloat(totalPropiosStr.replace(/[^0-9.-]/g, '')) || 0;

      // Fila 18 (índice 2): Total General
      const totalGeneralStr = totalesRows[2]?.[2]?.toString().trim() || '0';
      totalMesGeneral = parseFloat(totalGeneralStr.replace(/[^0-9.-]/g, '')) || 0;

      console.log('[SheetsAPI] 📋 Totales leídos desde A16:C18:');
      console.log(`  A16 (Total Fleteros): ${totalMesFleteros}`);
      console.log(`  A17 (Total Propios): ${totalMesCrosslog}`);
      console.log(`  A18 (Total General): ${totalMesGeneral}`);
    } else {
      // Fallback: calcular manualmente si no se pueden leer las celdas
      console.warn('[SheetsAPI] ⚠️ No se pudieron leer totales de A16:C18, calculando manualmente...');
      totalMesCrosslog = unidades
        .filter(u => u.tipoTransporte === 'CROSSLOG')
        .reduce((sum, u) => sum + u.totalMes, 0);

      totalMesFleteros = unidades
        .filter(u => u.tipoTransporte === 'FLETEROS')
        .reduce((sum, u) => sum + u.totalMes, 0);

      totalMesGeneral = totalMesCrosslog + totalMesFleteros;
    }

    const mejorDia = totalesPorDia
      .filter(d => d.total > 0)
      .reduce((max, d) => d.total > max.total ? d : max, totalesPorDia[0]);

    const peorDia = totalesPorDia
      .filter(d => d.total > 0)
      .reduce((min, d) => d.total < min.total ? d : min, mejorDia);

    const promedioGeneral = totalesPorDia.length > 0
      ? totalMesGeneral / totalesPorDia.filter(d => d.total > 0).length
      : 0;

    console.log(`[SheetsAPI] ✅ KPIs calculados - Mantenimiento: ${diasMantenimiento}, Sin Servicio: ${diasSinServicio}, Viaje: ${diasViaje}`);

    // Debug: Mostrar totales leídos de Google Sheets
    console.log('[SheetsAPI] 📊 TOTALES DESDE GOOGLE SHEETS (A16:C18):');
    console.log(`  Total PROPIOS (A17): $${totalMesCrosslog.toLocaleString('es-AR')}`);
    console.log(`  Total FLETEROS (A16): $${totalMesFleteros.toLocaleString('es-AR')}`);
    console.log(`  Total GENERAL (A18): $${totalMesGeneral.toLocaleString('es-AR')}`);
    console.log(`  Promedio Diario: $${promedioGeneral.toFixed(2)}`);
    console.log('[SheetsAPI] 📊 Muestra de días 17-20:');
    for (let i = 16; i < 20 && i < totalesPorDia.length; i++) {
      console.log(`  Día ${totalesPorDia[i].dia}: $${totalesPorDia[i].total.toLocaleString('es-AR')}`);
    }

    // Convertir mapa de mantenimiento a array
    const diasConMantenimiento = Array.from(mantenimientoPorDia.entries())
      .map(([dia, internos]) => ({ dia, internos }))
      .sort((a, b) => a.dia - b.dia);

    console.log(`[SheetsAPI] 🔧 Días con mantenimiento: ${diasConMantenimiento.length}`);
    diasConMantenimiento.forEach(dm => {
      console.log(`  Día ${dm.dia}: ${dm.internos.join(', ')}`);
    });

    return {
      unidades,
      totalesPorDia,
      resumen: {
        totalMesCrosslog,
        totalMesFleteros,
        totalMesGeneral,
        mejorDia: { dia: mejorDia.dia, valor: mejorDia.total, fecha: mejorDia.fecha },
        peorDia: { dia: peorDia.dia, valor: peorDia.total, fecha: peorDia.fecha },
        promedioGeneral,
        diasMantenimiento,
        diasSinServicio,
        diasViaje,
        diasConMantenimiento // Agregamos el detalle de mantenimiento por día
      }
    };
  }

  /**
   * Extrae mes y año de un texto como "DICIEMBRE 2025"
   */
  private extraerMesAnio(texto: string): { mes: number; anio: number } {
    const MESES_MAP: Record<string, number> = {
      'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4,
      'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8,
      'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
    };

    const textoUpper = texto.toUpperCase().trim();
    let mes = 12; // Default: Diciembre

    for (const [mesNombre, mesNumero] of Object.entries(MESES_MAP)) {
      if (textoUpper.includes(mesNombre)) {
        mes = mesNumero;
        break;
      }
    }

    const anioMatch = textoUpper.match(/\d{4}/);
    const anio = anioMatch ? parseInt(anioMatch[0]) : new Date().getFullYear();

    return { mes, anio };
  }

  /**
   * Formatea una fecha en formato YYYY-MM-DD
   */
  private formatearFecha(anio: number, mes: number, dia: number): string {
    return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  /**
   * FUNCIÓN ANTIGUA: Lee de "Valores_Diarios_Distribucion" (formato vertical)
   * Mantenida por si se necesita en el futuro
   */
  private async getValoresDiariosDesdeDistribucion_OLD(spreadsheetId: string, mesAnio?: string) {
    const range = 'Valores_Diarios_Distribucion!A3:J'; // Leer desde fila 3 (headers en fila 2, ahora con estado)

    try {
      const url = `${this.baseUrl}/${spreadsheetId}/values/${range}?key=${this.config.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.warn('[SheetsAPI] Hoja de valores diarios no encontrada o vacía');
        return this.getEmptyValoresDiariosResponse();
      }

      const data = await response.json();
      const rows = data.values || [];

      if (rows.length === 0) {
        console.warn('[SheetsAPI] No hay datos en la hoja de valores diarios');
        return this.getEmptyValoresDiariosResponse();
      }

      return this.processValoresDiariosVertical(rows, mesAnio);

    } catch (error) {
      console.error('[SheetsAPI] Error fetching valores diarios:', error);
      return this.getEmptyValoresDiariosResponse();
    }
  }

  /**
   * Procesa datos en formato VERTICAL (normalizado)
   * Estructura: fecha | anio | mes | dia | tipo_transporte | chofer | interno | porte | valor_generado
   */
  private processValoresDiariosVertical(rows: string[][], mesAnio?: string): any {
    const unidadesMap = new Map();
    const totalesPorDiaMap = new Map();

    // Contadores de estados
    const estadosSet = new Set<string>();

    // Filtrar por mes/año si se especifica
    let filteredRows = rows;
    if (mesAnio) {
      const [year, month] = mesAnio.split('-');
      filteredRows = rows.filter(row => {
        const anio = row[1]?.toString(); // Columna B (anio)
        const mes = row[2]?.toString().padStart(2, '0');  // Columna C (mes)

        if (month) {
          return anio === year && mes === month.padStart(2, '0');
        } else {
          return anio === year;
        }
      });
    }

    console.log(`[SheetsAPI] Procesando ${filteredRows.length} filas de valores diarios`);

    // Procesar cada fila
    filteredRows.forEach(row => {
      const fecha = row[0]; // A
      const anio = parseInt(row[1]); // B
      const mes = parseInt(row[2]); // C
      const dia = parseInt(row[3]); // D
      const tipoTransporte = row[4]; // E
      const chofer = row[5] || 'Sin asignar'; // F
      const interno = row[6] || '-'; // G
      const porte = row[7] || '-'; // H
      const valorGenerado = parseFloat(row[8]) || 0; // I
      const estado = row[9] || 'SIN_SERVICIO'; // J

      // Trackear estados
      estadosSet.add(estado);

      // Crear clave única por unidad
      const key = tipoTransporte === 'CROSSLOG'
        ? `CROSSLOG_${interno}_${chofer}`
        : `FLETEROS_${chofer}`;

      // Inicializar unidad si no existe
      if (!unidadesMap.has(key)) {
        unidadesMap.set(key, {
          interno: interno || '',
          porte: porte || '',
          tipoTransporte,
          chofer: chofer || 'Sin asignar',
          valoresDiarios: [],
          totalMes: 0,
          diasActivos: 0
        });
      }

      const unidad = unidadesMap.get(key);

      // Agregar valor diario
      unidad.valoresDiarios.push({
        dia,
        valor: valorGenerado,
        fecha
      });

      unidad.totalMes += valorGenerado;
      if (valorGenerado > 0) unidad.diasActivos++;

      // Acumular totales por día
      if (!totalesPorDiaMap.has(dia)) {
        totalesPorDiaMap.set(dia, { dia, total: 0, fecha });
      }
      totalesPorDiaMap.get(dia).total += valorGenerado;
    });

    // Calcular promedios
    const unidades = Array.from(unidadesMap.values()).map(unidad => ({
      ...unidad,
      promedioDiario: unidad.diasActivos > 0 ? unidad.totalMes / unidad.diasActivos : 0,
      valoresDiarios: unidad.valoresDiarios.sort((a, b) => a.dia - b.dia)
    }));

    const totalesPorDia = Array.from(totalesPorDiaMap.values()).sort((a, b) => a.dia - b.dia);

    // Calcular resumen
    const totalMesCrosslog = unidades
      .filter(u => u.tipoTransporte === 'CROSSLOG')
      .reduce((sum, u) => sum + u.totalMes, 0);

    const totalMesFleteros = unidades
      .filter(u => u.tipoTransporte === 'FLETEROS')
      .reduce((sum, u) => sum + u.totalMes, 0);

    const totalMesGeneral = totalMesCrosslog + totalMesFleteros;

    const mejorDia = totalesPorDia.reduce(
      (max, d) => d.total > max.total ? d : max,
      totalesPorDia[0] || { dia: 0, total: 0, fecha: '' }
    );

    const diasConValor = totalesPorDia.filter(d => d.total > 0);
    const peorDia = diasConValor.length > 0
      ? diasConValor.reduce((min, d) => d.total < min.total ? d : min, diasConValor[0])
      : { dia: 0, total: 0, fecha: '' };

    const promedioGeneral = totalesPorDia.length > 0
      ? totalMesGeneral / totalesPorDia.length
      : 0;

    // Calcular KPIs de estados
    const diasMantenimiento = filteredRows.filter(row => row[9] === 'MANTENIMIENTO').length;
    const diasSinServicio = filteredRows.filter(row => row[9] === 'SIN_SERVICIO').length;
    const diasViaje = filteredRows.filter(row => row[9] === 'VIAJE').length;

    console.log(`[SheetsAPI] KPIs Estados - Mantenimiento: ${diasMantenimiento}, Sin Servicio: ${diasSinServicio}, Viaje: ${diasViaje}`);

    return {
      unidades,
      totalesPorDia,
      resumen: {
        totalMesCrosslog,
        totalMesFleteros,
        totalMesGeneral,
        mejorDia: { dia: mejorDia.dia, valor: mejorDia.total, fecha: mejorDia.fecha },
        peorDia: { dia: peorDia.dia, valor: peorDia.total, fecha: peorDia.fecha },
        promedioGeneral,
        diasMantenimiento,
        diasSinServicio,
        diasViaje
      }
    };
  }

  /**
   * Retorna respuesta vacía para valores diarios
   */
  private getEmptyValoresDiariosResponse() {
    return {
      unidades: [],
      totalesPorDia: [],
      resumen: {
        totalMesCrosslog: 0,
        totalMesFleteros: 0,
        totalMesGeneral: 0,
        mejorDia: { dia: 0, valor: 0, fecha: '' },
        peorDia: { dia: 0, valor: 0, fecha: '' },
        promedioGeneral: 0,
        diasMantenimiento: 0,
        diasSinServicio: 0,
        diasViaje: 0
      }
    };
  }

}

// Create default instance (will be configured on app init)
export const sheetsApi = new GoogleSheetsAPI({
  apiKey: import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || '',
  spreadsheetId: import.meta.env.VITE_GOOGLE_SPREADSHEET_ID || '', // BASE sheet
  spreadsheetEntregasId: import.meta.env.VITE_GOOGLE_SPREADSHEET_ENTREGAS_ID || '', // Sistema_Entregas sheet
  viajesCrosslogSheet: 'BASE',
  formResponsesSheet: 'Form_Responses',
});
