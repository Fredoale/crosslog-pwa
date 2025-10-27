/**
 * ============================================================================
 * CROSSLOG - FLUJO COMPLETO N8N
 * ============================================================================
 *
 * Este archivo contiene TODOS los nodos necesarios para el flujo de N8N.
 *
 * FLUJO COMPLETO:
 * Webhook → Nodo 1 (Procesar) → Google Sheets → IF →
 * ├─ HDR Completo → Lookup → Nodo 2 (Email Completo) → Gmail + WhatsApp
 * └─ Entrega Individual → Nodo 3 (Email Individual) → Gmail + WhatsApp
 */

// ============================================================================
// NODO 1: PROCESAR DATOS DEL WEBHOOK
// ============================================================================
/**
 * Recibe datos del webhook y los prepara para Google Sheets
 * CONECTAR DESPUÉS DE: Webhook
 */

const webhookData = $input.first().json.body;

console.log('[N8N Nodo 1] Datos recibidos:', JSON.stringify(webhookData, null, 2));

// Extraer datos del webhook
const hdr = webhookData.hdr || webhookData.Numero_HDR;
const numeroEntrega = webhookData.numero_entrega;
const chofer = webhookData.chofer;
const fechaViaje = webhookData.fecha_viaje;

// Cliente y detalles
const clienteId = webhookData.cliente || webhookData.Dador_carga;
const detalleEntrega = webhookData.detalle_entregas || webhookData.Detalle_entrega;

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

// Formato: "CARGA: ECOLAB / DESCARGA: DESTINO1 / DESTINO2 / DESTINO3"
let cargaDescarga = '';
if (clienteId && todosLosDestinos.length > 0) {
  const descargaTexto = todosLosDestinos.join(' / ');
  cargaDescarga = `CARGA: ${clienteId} / DESCARGA: ${descargaTexto}`;
} else if (clienteId && detalleEntrega) {
  // Fallback si no hay lista de destinos
  cargaDescarga = `CARGA: ${clienteId} / DESCARGA: ${detalleEntrega}`;
} else {
  cargaDescarga = '';
}

console.log('[N8N Nodo 1] Formato CARGA/DESCARGA:', cargaDescarga);

// Firma receptor - verificar que no sea URL
let firmaReceptor = webhookData.firma_receptor || webhookData.nombre_receptor || '';
if (firmaReceptor.startsWith('http')) {
  console.warn('[N8N Nodo 1] ⚠️ firma_receptor contiene URL, limpiando...');
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

console.log('[N8N Nodo 1] PDF URLs:', pdfUrls);
console.log('[N8N Nodo 1] Firma receptor:', firmaReceptor);

// Preparar fila para Google Sheets
const filaGoogleSheets = {
  fecha_viaje: fechaViaje,                    // A
  Numero_HDR: hdr,                            // B
  numero_entrega: numeroEntrega,              // C
  numero_remitos: numerosRemito,              // D
  Dador_carga: clienteId,                     // E
  Detalle_entrega: detalleEntrega,            // F
  Estado: estado,                             // G
  Chofer: chofer,                             // H
  Cant_remito: cantRemito,                    // I
  entregas_completadas: entregasCompletadas,  // J
  entregas_pendientes: entregasPendientes,    // K
  Carga_Descarga: cargaDescarga,              // L (NUEVO: formato "CARGA: X / DESCARGA: Y / Z")
  firma_receptor: firmaReceptor,              // M
  pdf_urls: pdfUrls,                          // N
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

    // Flags
    hdrCompletado: estado === 'COMPLETADO' && entregasPendientes === 0,
    entregasCompletadas: entregasCompletadas,
    entregasPendientes: entregasPendientes,
    progresoPorcentaje: progresoPorcentaje,
  }
};


// ============================================================================
// NODO 2: GENERAR EMAIL PARA HDR COMPLETADO
// ============================================================================
/**
 * Genera HTML con todas las entregas del HDR completado
 * CONECTAR DESPUÉS DE: Google Sheets Lookup en hoja Sistema_entregas
 *
 * IMPORTANTE: El Google Sheets Lookup debe buscar en Sistema_entregas (NO Estado_progreso)
 * - Sheet: Sistema_entregas
 * - Lookup Column: B (Numero_HDR)
 * - Return All Matches: YES
 */

// Obtener TODAS las entregas del Google Sheets Lookup
const inputData = $input.all().map(item => item.json);

console.log('[N8N Nodo 2] Total items recibidos:', inputData.length);
console.log('[N8N Nodo 2] Primer item:', JSON.stringify(inputData[0], null, 2));

if (inputData.length === 0) {
  throw new Error('No se encontraron entregas para este HDR');
}

// Detectar si viene de Estado_progreso (datos agrupados) o Sistema_entregas (filas individuales)
const primeraFila = inputData[0];
const vieneDeEstadoProgreso = primeraFila.Cliente && Array.isArray(JSON.parse(primeraFila.Cliente || '[]'));

let todasLasEntregas = [];
let hdr, chofer, fechaViaje;

if (vieneDeEstadoProgreso) {
  // CASO 1: Viene de Estado_progreso (datos agrupados) - NECESITA DESAGRUPAR
  console.log('[N8N Nodo 2] ⚠️ Detectado input de Estado_progreso - desagrupando...');

  hdr = primeraFila.Numero_HDR;
  chofer = primeraFila.Chofer;
  fechaViaje = primeraFila.fecha_viaje || primeraFila.Fecha_Viaje || '';

  // Parsear arrays agrupados
  let clientes = [];
  let remitos = [];
  let pdfUrls = [];

  try {
    clientes = JSON.parse(primeraFila.Cliente || '[]');
  } catch (e) {
    clientes = [primeraFila.Cliente || ''];
  }

  try {
    remitos = JSON.parse(primeraFila.numero_remitos || '[]');
  } catch (e) {
    remitos = [primeraFila.numero_remitos || ''];
  }

  try {
    pdfUrls = JSON.parse(primeraFila.pdf_urls || '[]');
  } catch (e) {
    pdfUrls = [primeraFila.pdf_urls || ''];
  }

  const firmaReceptor = primeraFila.firma_receptor || '';

  // Crear una entrega por cada cliente
  todasLasEntregas = clientes.map((cliente, index) => ({
    numero_entrega: (index + 1).toString(),
    Detalle_entrega: cliente, // Ya viene parseado, no es JSON string
    numero_remitos: JSON.stringify([remitos[index] || '']), // Array con 1 remito
    pdf_urls: JSON.stringify([pdfUrls[index] || '']), // Array con 1 PDF
    firma_receptor: firmaReceptor,
  }));

  console.log('[N8N Nodo 2] Entregas desagrupadas:', todasLasEntregas.length);

} else {
  // CASO 2: Viene de Sistema_entregas (filas individuales) - CORRECTO
  console.log('[N8N Nodo 2] ✓ Detectado input de Sistema_entregas');

  todasLasEntregas = inputData;
  hdr = primeraFila.Numero_HDR;
  chofer = primeraFila.Chofer;
  fechaViaje = primeraFila.fecha_viaje;
}

console.log('[N8N Nodo 2] Total entregas procesadas:', todasLasEntregas.length);

// Generar HTML para cada entrega
let htmlEntregas = '';
let totalRemitos = 0;

todasLasEntregas.forEach((entrega, index) => {
  const numeroEntrega = parseInt(entrega.numero_entrega) || (index + 1);

  console.log(`[N8N Nodo 2] Procesando entrega ${index + 1}:`, {
    numero_entrega: entrega.numero_entrega,
    Detalle_entrega: entrega.Detalle_entrega,
    numero_remitos: entrega.numero_remitos,
    pdf_urls: entrega.pdf_urls
  });

  // Parsear Detalle_entrega si es JSON array
  // IMPORTANTE: Usar el número de entrega como índice (numero_entrega - 1)
  let detalleEntrega = entrega.Detalle_entrega || '';
  if (detalleEntrega.startsWith('[') && detalleEntrega.endsWith(']')) {
    try {
      const parsed = JSON.parse(detalleEntrega);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Usar el índice basado en numero_entrega (entrega 1 = index 0, entrega 2 = index 1)
        const entregaIndex = numeroEntrega - 1;
        detalleEntrega = parsed[entregaIndex] || parsed[parsed.length - 1];
        console.log(`[N8N Nodo 2] Array detectado, usando índice ${entregaIndex}: "${detalleEntrega}"`);
      }
    } catch (e) {
      console.warn('[N8N Nodo 2] Error parseando Detalle_entrega:', e);
    }
  }

  console.log(`[N8N Nodo 2] Destino parseado: "${detalleEntrega}"`);

  const firmaReceptor = entrega.firma_receptor || '';

  // Parsear remitos
  let remitos = [];
  try {
    remitos = JSON.parse(entrega.numero_remitos || '[]');
    if (!Array.isArray(remitos)) remitos = [String(remitos)];
  } catch (e) {
    remitos = String(entrega.numero_remitos || '').split(',').map(r => r.trim()).filter(r => r);
  }

  // Parsear PDFs
  let pdfUrls = [];
  try {
    pdfUrls = JSON.parse(entrega.pdf_urls || '[]');
    if (!Array.isArray(pdfUrls)) pdfUrls = [String(pdfUrls)];
  } catch (e) {
    pdfUrls = String(entrega.pdf_urls || '').split(',').map(url => url.trim()).filter(url => url);
  }

  totalRemitos += remitos.length;

  // HTML para esta entrega (estilo PWA con "Completado")
  htmlEntregas += `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #a8e063; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <tr>
        <td style="padding: 20px;">
          <!-- Header con número y badge -->
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="width: 60%;">
                <h3 style="color: #1a2332; margin: 0; font-size: 18px; font-weight: bold;">Entrega N° ${numeroEntrega}</h3>
              </td>
              <td align="right" style="width: 40%;">
                <span style="background-color: #a8e063; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; display: inline-block;">Completado</span>
              </td>
            </tr>
          </table>

          ${detalleEntrega ? `
          <!-- Destino -->
          <div style="margin-top: 15px; margin-bottom: 12px;">
            <p style="margin: 0 0 5px 0; color: #666; font-size: 12px; text-transform: uppercase; font-weight: bold;">DESTINO</p>
            <p style="margin: 0; color: #1a2332; font-size: 16px; font-weight: 500; line-height: 1.4;">${detalleEntrega}</p>
          </div>
          ` : ''}

          <!-- Remitos -->
          <div style="margin-top: 15px;">
            <p style="margin: 0 0 8px 0; color: #666; font-size: 12px; text-transform: uppercase; font-weight: bold;">REMITOS (${remitos.length})</p>
  `;

  remitos.forEach((remito, idx) => {
    const pdfUrl = pdfUrls[idx] || '';
    htmlEntregas += `
            <!-- Remito ${remito} -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: white; border-radius: 6px; margin-bottom: 8px; border: 1px solid #e0e0e0;">
              <tr>
                <td style="padding: 12px; width: 60%;">
                  <span style="color: #1a2332; font-weight: 500; font-size: 14px;">Remito ${remito}</span>
                </td>
                <td align="right" style="padding: 12px; width: 40%;">
                  ${pdfUrl ? `<a href="${pdfUrl}" style="color: #a8e063; text-decoration: none; font-weight: bold; padding: 8px 16px; background-color: #f0f9e8; border-radius: 6px; font-size: 13px; display: inline-block;" target="_blank">📄 Ver PDF</a>` : ''}
                </td>
              </tr>
            </table>
    `;
  });

  htmlEntregas += `
          </div>

          ${firmaReceptor && !firmaReceptor.startsWith('http') ? `
          <!-- Firma receptor -->
          <div style="margin-top: 15px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0; color: #666; font-size: 13px;">Recibido por: <strong style="color: #1a2332; font-size: 14px;">${firmaReceptor}</strong></p>
          </div>
          ` : ''}
        </td>
      </tr>
    </table>
  `;
});

console.log('[N8N Nodo 2] HTML generado, entregas:', todasLasEntregas.length, 'remitos:', totalRemitos);

// Generar HTML de barra de progreso
const htmlProgressBar = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 30px;">
  <tr>
    <td>
      <p style="margin: 0 0 12px 0; color: #1a2332; font-size: 13px; font-weight: 600; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">
        Progreso Completado
      </p>
      <!-- Progress Bar Container -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #e8f5e9; border-radius: 12px; overflow: hidden;">
        <tr>
          <td style="padding: 0;">
            <!-- Progress Bar Fill (100%) -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, #66bb6a 0%, #4caf50 100%); height: 28px;">
              <tr>
                <td align="center" valign="middle">
                  <span style="color: white; font-size: 14px; font-weight: 700; text-shadow: 0 1px 3px rgba(0,0,0,0.15); letter-spacing: 0.3px;">
                    ✓ 100%
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin: 10px 0 0 0; color: #66bb6a; font-size: 12px; text-align: center; font-weight: 500;">
        Todas las entregas del HDR han sido completadas
      </p>
    </td>
  </tr>
</table>
`;

// Retornar datos para Gmail
return {
  json: {
    email: {
      subject: `✅ HDR ${hdr} COMPLETADO - ${chofer}`,
      toEmail: 'logistica@crosslog.com.ar',
      hdr: hdr,
      chofer: chofer,
      fechaViaje: fechaViaje,
      totalEntregas: todasLasEntregas.length,
      totalRemitos: totalRemitos,
      htmlProgressBar: htmlProgressBar,
      htmlEntregas: htmlEntregas,
      fechaCompletado: new Date().toLocaleDateString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    },
    whatsapp: {
      numero: '5491154096639', // Número de WhatsApp
      mensaje: `*HDR ${hdr} - COMPLETADO* ✅

━━━━━━━━━━━━━━━━━━━━━
👤 *Chofer:* ${chofer}
📅 *Fecha:* ${fechaViaje}
━━━━━━━━━━━━━━━━━━━━━

📊 *Resumen General*
✓ ${todasLasEntregas.length} entregas completadas
✓ ${totalRemitos} remitos entregados

📦 *Detalle de Entregas*
${todasLasEntregas.map((entrega, index) => {
  const numeroEntrega = parseInt(entrega.numero_entrega) || (index + 1);
  let detalleEntrega = entrega.Detalle_entrega || '';

  // Parsear destino si es array
  if (detalleEntrega.startsWith('[') && detalleEntrega.endsWith(']')) {
    try {
      const parsed = JSON.parse(detalleEntrega);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const entregaIndex = numeroEntrega - 1;
        detalleEntrega = parsed[entregaIndex] || parsed[parsed.length - 1];
      }
    } catch (e) {}
  }

  const firmaReceptor = entrega.firma_receptor || '';

  // Parsear remitos
  let remitos = [];
  try {
    remitos = JSON.parse(entrega.numero_remitos || '[]');
    if (!Array.isArray(remitos)) remitos = [String(remitos)];
  } catch (e) {
    remitos = String(entrega.numero_remitos || '').split(',').map(r => r.trim()).filter(r => r);
  }

  // Parsear PDFs
  let pdfUrls = [];
  try {
    pdfUrls = JSON.parse(entrega.pdf_urls || '[]');
    if (!Array.isArray(pdfUrls)) pdfUrls = [String(pdfUrls)];
  } catch (e) {
    pdfUrls = String(entrega.pdf_urls || '').split(',').map(url => url.trim()).filter(url => url);
  }

  // Generar texto de remitos con links
  const remitosTexto = remitos.map((remito, idx) => {
    const pdfUrl = pdfUrls[idx] || '';
    if (pdfUrl) {
      // Limpiar URL - quitar parámetros
      const cleanUrl = pdfUrl.split('?')[0];
      return `${remito} → ${cleanUrl}`;
    }
    return remito;
  }).join('\n   ');

  return `
*Entrega N° ${numeroEntrega}*
🎯 ${detalleEntrega}
Remito${remitos.length > 1 ? 's' : ''} (${remitos.length}):
   ${remitosTexto}${firmaReceptor ? `\n✍️ Recibió: ${firmaReceptor}` : ''}`;
}).join('\n')}

━━━━━━━━━━━━━━━━━━━━━

*Resumen enviado por email*

*CROSSLOG*
_Servicios Logísticos | Warehousing_`,
    },
  }
};

// ============================================================================
// [Nodo 5: GENERAR EMAIL PARA ENTREGA INDIVIDUAL
// ============================================================================
const datos = $input.first().json;

console.log('[N8N Nodo 3] Datos recibidos:', JSON.stringify(datos, null, 2));

// Extraer valores con fallbacks defensivos
const hdr = datos.hdr || datos.Numero_HDR || 'N/A';
const chofer = datos.chofer || datos.Chofer || 'N/A';
const fechaViaje = datos.fechaViaje || datos.fecha_viaje || 'N/A';
const numeroEntrega = datos.numeroEntrega || datos.numero_entrega || '1';
const detalleEntrega = datos.detalleEntrega || datos.Detalle_entrega || 'N/A';
const firmaReceptor = datos.firmaReceptor || datos.firma_receptor || '';

// Progreso
const entregasCompletadas = datos.entregasCompletadas || datos.entregas_completadas || 0;
const entregasPendientes = datos.entregasPendientes || datos.entregas_pendientes || 0;
const totalEntregas = entregasCompletadas + entregasPendientes;
// Calcular porcentaje si no viene o es 0
let progresoPorcentaje = datos.progresoPorcentaje || datos.progreso_porcentaje || 0;
if (progresoPorcentaje === 0 && totalEntregas > 0) {
  progresoPorcentaje = Math.round((entregasCompletadas / totalEntregas) * 100);
}

// Parsear remitos
let remitos = [];
const numerosRemitoRaw = datos.numerosRemito || datos.numero_remitos || datos.numeros_remito;
try {
  if (typeof numerosRemitoRaw === 'string' && numerosRemitoRaw.startsWith('[')) {
    remitos = JSON.parse(numerosRemitoRaw);
  } else if (Array.isArray(numerosRemitoRaw)) {
    remitos = numerosRemitoRaw;
  } else if (numerosRemitoRaw) {
    remitos = String(numerosRemitoRaw).split(',').map(r => r.trim()).filter(r => r);
  }
  if (!Array.isArray(remitos)) remitos = [String(remitos)];
} catch (e) {
  console.error('[N8N Nodo 3] Error parseando remitos:', e);
  remitos = [];
}

// Parsear PDFs
let pdfUrls = [];
const pdfUrlsRaw = datos.pdfUrls || datos.pdf_urls;
try {
  if (typeof pdfUrlsRaw === 'string' && pdfUrlsRaw.startsWith('[')) {
    pdfUrls = JSON.parse(pdfUrlsRaw);
  } else if (Array.isArray(pdfUrlsRaw)) {
    pdfUrls = pdfUrlsRaw;
  } else if (pdfUrlsRaw) {
    pdfUrls = String(pdfUrlsRaw).split(',').map(url => url.trim()).filter(url => url);
  }
  if (!Array.isArray(pdfUrls)) pdfUrls = [String(pdfUrls)];
} catch (e) {
  console.error('[N8N Nodo 3] Error parseando PDFs:', e);
  pdfUrls = [];
}

console.log('[N8N Nodo 3] Remitos parseados:', remitos);
console.log('[N8N Nodo 3] PDFs parseados:', pdfUrls);

// HTML para remitos
let htmlRemitos = '';
remitos.forEach((remito, idx) => {
  const pdfUrl = pdfUrls[idx] || '';
  htmlRemitos += `
    <li style="margin: 8px 0; padding: 10px; background-color: white; border: 1px solid #e0e0e0; border-radius: 6px; display: block;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #1a2332; font-weight: 500;">Remito ${remito}</span>
        ${pdfUrl ? `<a href="${pdfUrl}" style="color: #a8e063; text-decoration: none; font-weight: bold; padding: 6px 14px; background-color: #f0f9e8; border-radius: 4px; font-size: 13px; display: inline-block;" target="_blank">📄 Ver PDF</a>` : ''}
      </div>
    </li>
  `;
});

// Retornar datos para Gmail
return {
  json: {
    email: {
      subject: `📦 Entrega Registrada - HDR ${hdr} - Entrega ${numeroEntrega}`,
      toEmail: 'logistica@crosslog.com.ar',
      hdr: hdr,
      chofer: chofer,
      fechaViaje: fechaViaje,
      numeroEntrega: numeroEntrega,
      detalleEntrega: detalleEntrega,
      firmaReceptor: firmaReceptor,
      cantidadRemitos: remitos.length,
      htmlRemitos: htmlRemitos,
      progreso: `${entregasCompletadas} de ${totalEntregas}`,
      progresoPorcentaje: progresoPorcentaje,
      fechaRegistro: new Date().toLocaleDateString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    },
    whatsapp: {
      numero: '5491154096639', // Número de WhatsApp
      mensaje: `📦 *ENTREGA REGISTRADA*

━━━━━━━━━━━━━━━━━━━━━
🆔 *HDR:* ${hdr}
📍 *Entrega N°:* ${numeroEntrega}
👤 *Chofer:* ${chofer}
📅 *Fecha:* ${fechaViaje}
━━━━━━━━━━━━━━━━━━━━━

🎯 *Destino*
${detalleEntrega}
${firmaReceptor ? `✍️ *Recibió:* ${firmaReceptor}` : ''}

*Remitos (${remitos.length})*
${remitos.map((r, idx) => {
  const pdfUrl = pdfUrls[idx] || '';
  if (pdfUrl) {
    // Limpiar URL - quitar parámetros
    const cleanUrl = pdfUrl.split('?')[0];
    return `• Remito ${r}\n  📄 ${cleanUrl}`;
  }
  return `• Remito ${r}`;
}).join('\n')}

📊 *Progreso del HDR*
✓ ${entregasCompletadas} de ${totalEntregas} entregas completadas
⏳ ${entregasPendientes} pendiente${entregasPendientes !== 1 ? 's' : ''}
📈 ${totalEntregas > 0 ? Math.round((entregasCompletadas / totalEntregas) * 100) : 0}% completado

━━━━━━━━━━━━━━━━━━━━━

*Resumen enviado por email*

*CROSSLOG*
_Servicios Logísticos | Warehousing_`,
    },
  }
};

// ============================================================================
// PLANTILLA HTML - EMAIL HDR COMPLETADO
// ============================================================================
/**
 * Usar en nodo Gmail después del Nodo 2
 *
 * Configuración Gmail:
 * - To: {{ $json.email.toEmail }}
 * - Subject: {{ $json.email.subject }}
 * - Email Type: HTML
 * - Message: copiar el HTML de abajo
 */

/*
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HDR Completado</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .header { padding: 20px !important; }
      .stats-table td { display: block !important; width: 100% !important; padding: 0 !important; margin-bottom: 10px; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5;">

  <!-- Outer Table (Full Width Container) -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">

        <!-- Inner Table (Main Content - Max 600px) -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="max-width: 600px; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 0 auto;">

          <!-- Header with Gradient -->
          <tr>
            <td class="header" align="center" style="background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%); padding: 30px; border-radius: 10px 10px 0 0;">

              <!-- Checkmark Circle (Properly Centered) -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" valign="middle" width="80" height="80" style="background-color: #a8e063; border-radius: 50%; font-size: 48px; color: white; line-height: 80px;">
                          ✓
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <h1 style="color: white; margin: 20px 0 10px 0; font-size: 32px; text-align: center;">
                HDR {{ $json.email.hdr }}
              </h1>

              <p style="color: #a8e063; margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                COMPLETADO
              </p>

              <p style="color: #ffffff; margin: 15px 0 0 0; font-size: 14px; text-align: center;">
                {{ $json.email.fechaCompletado }}
              </p>
            </td>
          </tr>

          <!-- Logo CROSSLOG -->
          <tr>
            <td align="center" style="padding: 20px 30px; border-bottom: 2px solid #a8e063;">
              <h2 style="color: #1a2332; margin: 0; font-size: 28px; letter-spacing: 2px;">
                CROSSLOG
              </h2>
              <p style="color: #a8e063; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px;">
                Servicios Logísticos | Warehousing
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 25px 30px;">

              <!-- Chofer Info -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #e3f2fd; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #1976d2; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                      CHOFER
                    </p>
                    <p style="margin: 5px 0 0 0; color: #1a2332; font-size: 18px; font-weight: bold;">
                      {{ $json.email.chofer }}
                    </p>
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
                      Fecha: {{ $json.email.fechaViaje }}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Stats Table -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" class="stats-table" style="margin-bottom: 25px;">
                <tr>
                  <td width="50%" style="padding-right: 10px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 2px solid #a8e063; border-radius: 8px;">
                      <tr>
                        <td align="center" style="padding: 20px;">
                          <p style="margin: 0; font-size: 36px; font-weight: bold; color: #a8e063;">
                            {{ $json.email.totalEntregas }}
                          </p>
                          <p style="margin: 5px 0 0 0; font-size: 14px; color: #2d3e50; font-weight: bold;">
                            Entregas
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" style="padding-left: 10px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 2px solid #a8e063; border-radius: 8px;">
                      <tr>
                        <td align="center" style="padding: 20px;">
                          <p style="margin: 0; font-size: 36px; font-weight: bold; color: #a8e063;">
                            {{ $json.email.totalRemitos }}
                          </p>
                          <p style="margin: 5px 0 0 0; font-size: 14px; color: #2d3e50; font-weight: bold;">
                            Remitos
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Progress Bar 100% (Generated by Node 2) -->
              {{ $json.email.htmlProgressBar }}

              <!-- Section Title -->
              <h3 style="color: #1a2332; margin: 30px 0 20px 0; font-size: 20px; border-bottom: 2px solid #a8e063; padding-bottom: 10px;">
                Detalle de Entregas
              </h3>

              <!-- Dynamic Entregas (Generated by Node 2) -->
              <div>
                {{ $json.email.htmlEntregas }}
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f8f9fa; padding: 20px 30px; border-radius: 0 0 10px 10px; border-top: 2px solid #a8e063;">
              <p style="margin: 0 0 10px 0; color: #2d3e50; font-size: 12px; font-weight: bold;">
                Generado automáticamente por CROSSLOG PWA
              </p>
              <p style="margin: 0; color: #999; font-size: 11px;">
                Datos sincronizados desde la app del chofer
              </p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: #666; font-size: 11px;">
                      CROSSLOG - Servicios Logísticos<br>
                      📧 logistica@crosslog.com.ar
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
*/


// ============================================================================
// PLANTILLA HTML - EMAIL ENTREGA INDIVIDUAL
// ============================================================================
/**
 * Usar en nodo Gmail después del Nodo 3
 */

/*
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Entrega Registrada</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .header { padding: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5;">

  <!-- Outer Table (Full Width Container) -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">

        <!-- Inner Table (Main Content - Max 600px) -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="max-width: 600px; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 0 auto;">

          <!-- Header with Gradient -->
          <tr>
            <td class="header" align="center" style="background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%); padding: 30px; border-radius: 10px 10px 0 0;">

              <!-- Package Icon Circle (Properly Centered) -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" valign="middle" width="80" height="80" style="background-color: #2196f3; border-radius: 50%; font-size: 40px; color: white; line-height: 80px;">
                          📦
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <h1 style="color: white; margin: 20px 0 10px 0; font-size: 28px; text-align: center;">
                Entrega Registrada
              </h1>

              <p style="color: #a8e063; margin: 0; font-size: 18px; font-weight: bold; text-align: center;">
                HDR {{ $json.email.hdr }} - Entrega {{ $json.email.numeroEntrega }}
              </p>

              <p style="color: #ffffff; margin: 15px 0 0 0; font-size: 14px; text-align: center;">
                {{ $json.email.fechaRegistro }}
              </p>
            </td>
          </tr>

          <!-- Logo CROSSLOG -->
          <tr>
            <td align="center" style="padding: 20px 30px; border-bottom: 2px solid #a8e063;">
              <h2 style="color: #1a2332; margin: 0; font-size: 28px; letter-spacing: 2px;">
                CROSSLOG
              </h2>
              <p style="color: #a8e063; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px;">
                Servicios Logísticos | Warehousing
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 25px 30px;">

              <!-- Chofer Info -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #e3f2fd; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #1976d2; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                      CHOFER
                    </p>
                    <p style="margin: 5px 0 0 0; color: #1a2332; font-size: 18px; font-weight: bold;">
                      {{ $json.email.chofer }}
                    </p>
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
                      Fecha: {{ $json.email.fechaViaje }}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Progreso Info -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fff3cd; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #856404; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                      PROGRESO DEL HDR
                    </p>
                    <p style="margin: 5px 0 0 0; color: #1a2332; font-size: 18px; font-weight: bold;">
                      {{ $json.email.progreso }} / Entregas al ({{ $json.email.progresoPorcentaje }}%)
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Destino Info -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #a8e063;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #666; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                      📍 Destino
                    </p>
                    <p style="margin: 5px 0 0 0; color: #1a2332; font-size: 16px; font-weight: 500;">
                      {{ $json.email.detalleEntrega }}
                    </p>
                    {{ $json.email.firmaReceptor ? '<p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">✍️ Recibió: <strong>' + $json.email.firmaReceptor + '</strong></p>' : '' }}
                  </td>
                </tr>
              </table>

              <!-- Remitos -->
              <h3 style="color: #1a2332; margin: 20px 0 15px 0; font-size: 18px; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">
                Remitos ({{ $json.email.cantidadRemitos }})
              </h3>
              <ul style="margin: 0; padding-left: 20px; list-style: none;">
                {{ $json.email.htmlRemitos }}
              </ul>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f8f9fa; padding: 20px 30px; border-radius: 0 0 10px 10px; border-top: 2px solid #a8e063;">
              <p style="margin: 0 0 10px 0; color: #2d3e50; font-size: 12px; font-weight: bold;">
                Generado automáticamente por CROSSLOG PWA
              </p>
              <p style="margin: 0; color: #999; font-size: 11px;">
                Datos sincronizados desde la app del chofer
              </p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: #666; font-size: 11px;">
                      CROSSLOG - Servicios Logísticos<br>
                      📧 logistica@crosslog.com.ar
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
*/
