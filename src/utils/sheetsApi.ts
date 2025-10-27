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
      const range = 'MAESTRA_CLIENTES!A:B';
      const url = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}?key=${this.config.apiKey}`;

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
      const range = 'MAESTRA_CLIENTES!A:E';
      const url = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}?key=${this.config.apiKey}`;

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
      const url = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}?key=${this.config.apiKey}`;

      console.log('[SheetsAPI] Checking if HDR', hdr, 'is completed in Sistema_entregas');

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

      // Skip header row and filter by HDR
      // IMPORTANT: Compare as strings, removing any extra spaces/formatting
      const matchingRows = rows.slice(1).filter((row: string[]) => {
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

        console.log(`[SheetsAPI] HDR ${hdr} has ${numeroEntregaTotal} entregas, ${detallesSeparados.length} destinos found`);

        // Create one Entrega per destino
        // If numeroEntrega > detalles, create extra with same last detail
        const numEntregas = Math.max(numeroEntregaTotal, detallesSeparados.length);

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
      const url = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}?key=${this.config.apiKey}`;

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

        const updateUrl = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}?valueInputOption=RAW&key=${this.config.apiKey}`;
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

      const url = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&key=${this.config.apiKey}`;

      console.log('[SheetsAPI] Submitting to Sistema_entregas:', values[0]);

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
        const urlSistema = `${this.baseUrl}/${this.config.spreadsheetId}/values/${rangeSistema}?key=${this.config.apiKey}`;

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
      const urlSistema = `${this.baseUrl}/${this.config.spreadsheetId}/values/${rangeSistema}?key=${this.config.apiKey}`;

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

      // Filter rows by fletero (from column Q: Tipo_Transporte)
      rowsSistema.slice(1).forEach((row: string[]) => {
        const rowFleteroRaw = row[tipoTransporteIndex]?.trim().toUpperCase();
        const rowHDR = row[hdrIndex]?.trim();
        const rowFecha = row[fechaIndex]?.trim();
        const rowChofer = row[choferIndex]?.trim();

        if (!rowHDR) return;

        // Si columna Q está vacía, es PROPIO
        const rowFletero = rowFleteroRaw || 'PROPIO';

        // Match fletero (exact or contains)
        if (rowFletero === normalizedFletero || rowFletero.includes(normalizedFletero)) {
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

      if (matchingHDRs.size === 0) {
        return { found: false, message: `No se encontraron viajes completados o en curso para ${fletero}` };
      }

      // Build HDR data from Sistema_entregas rows (already filtered)
      const hdrsData = [];

      for (const [hdr, _baseData] of matchingHDRs) { // baseData reserved for future use
        // Get all rows for this HDR from Sistema_entregas
        const hdrRows = rowsSistema.slice(1).filter((row: string[]) => {
          const rowHDR = row[hdrIndex]?.trim();
          const rowFleteroRaw = row[tipoTransporteIndex]?.trim().toUpperCase();
          const rowFletero = rowFleteroRaw || 'PROPIO'; // Si está vacío, es PROPIO
          return rowHDR === hdr && (rowFletero === normalizedFletero || rowFletero.includes(normalizedFletero));
        });

        if (hdrRows.length > 0) {
          const hdrData = this.buildHDRDataFromSistema(hdrRows);
          if (hdrData) {
            hdrsData.push(hdrData);
          }
        }
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
      const urlSistema = `${this.baseUrl}/${this.config.spreadsheetId}/values/${rangeSistema}?key=${this.config.apiKey}`;

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

      rowsSistema.slice(1).forEach((row: string[]) => {
        const rowHDR = row[hdrIndex]?.trim();
        if (!rowHDR) return;

        // Apply cliente filter if provided
        if (filterBy?.clienteId) {
          const rowCliente = row[clienteIndex]?.trim().toUpperCase();
          const filterCliente = filterBy.clienteId.trim().toUpperCase();
          if (rowCliente !== filterCliente) return;
        }

        if (!hdrsMap.has(rowHDR)) {
          hdrsMap.set(rowHDR, []);
        }
        hdrsMap.get(rowHDR)!.push(row);
      });

      // Build HDR data for each unique HDR
      const hdrsData = [];
      for (const [_hdr, rows] of hdrsMap) { // hdr key not directly used
        const hdrData = this.buildHDRDataFromSistema(rows);
        if (hdrData) {
          hdrsData.push(hdrData);
        }
      }

      // Sort by fecha_viaje descending (most recent first)
      hdrsData.sort((a, b) => {
        const dateA = this.parseDate(a.fechaViaje);
        const dateB = this.parseDate(b.fechaViaje);
        return dateB.getTime() - dateA.getTime();
      });

      console.log(`[SheetsAPI] Loaded ${hdrsData.length} unique HDRs`);

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

      const range = 'ACCESOS_CLIENTES!A:E';
      const url = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}?key=${this.config.apiKey}`;

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

      const range = 'ACCESOS_FLETEROS!A:D';
      const url = `${this.baseUrl}/${this.config.spreadsheetId}/values/${range}?key=${this.config.apiKey}`;

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
      const urlSistema = `${this.baseUrl}/${this.config.spreadsheetId}/values/${rangeSistema}?key=${this.config.apiKey}`;

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
      const urlSistema = `${this.baseUrl}/${this.config.spreadsheetId}/values/${rangeSistema}?key=${this.config.apiKey}`;

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

    const firstRow = rows[0];
    const fechaViaje = firstRow[0]?.trim() || '';
    const hdr = firstRow[1]?.trim() || '';
    const chofer = firstRow[7]?.trim() || ''; // H (Chofer)

    // Q (Tipo_Transporte) - Si está vacío, es PROPIO
    const tipoTransporteRaw = firstRow[16]?.trim() || '';
    const fletero = tipoTransporteRaw || 'PROPIO';

    const entregas = rows.map((row, idx) => {
      const numeroEntrega = row[2]?.trim() || `${idx + 1}`;  // C

      // D (numero_remitos) - Parse JSON array ["38269"]
      let numeroRemito = '';
      const rawRemitoValue = row[3]?.trim() || '';
      if (rawRemitoValue.startsWith('[') && rawRemitoValue.endsWith(']')) {
        try {
          const parsed = JSON.parse(rawRemitoValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            numeroRemito = String(parsed[0]).trim();
          }
        } catch {
          numeroRemito = rawRemitoValue.replace(/[\[\]"]/g, '').trim();
        }
      } else {
        numeroRemito = rawRemitoValue;
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

    const entregasCompletadas = entregas.filter(e => e.estado === 'COMPLETADO').length;

    return {
      hdr,
      fechaViaje,
      chofer,
      fletero,
      totalEntregas: entregas.length,
      entregasCompletadas,
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
}

// Create default instance (will be configured on app init)
export const sheetsApi = new GoogleSheetsAPI({
  apiKey: import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || '',
  spreadsheetId: import.meta.env.VITE_GOOGLE_SPREADSHEET_ID || '',
  viajesCrosslogSheet: 'BASE',
  formResponsesSheet: 'Form_Responses',
});
