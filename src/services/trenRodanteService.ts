/**
 * SERVICIO TREN RODANTE VRAC
 * Lee datos de Google Sheets (solapa MANT) y calcula alertas de mantenimiento
 */

import type {
  AlertaTrenRodante,
  AlertaInspeccionLigera,
  AlertaMantenimientoTR,
  EstadoAlertaTR,
  DatosSheetMant,
  CONFIG_TREN_RODANTE
} from '../types/trenRodante';

// Configuración
const CONFIG = {
  INTERVALO_40K: 40000,
  INTERVALO_80K: 80000,
  INTERVALO_160K: 160000,
  UMBRAL_ALERTA_KM: 5000,
  UMBRAL_ALERTA_DIAS: 30,
};

// ID del spreadsheet VRAC
const SPREADSHEET_ID = '1kusLSPjfI4kVvyjEBWLE32GTGHRjqSKS-ZOFc0Zzviw';
const SHEET_GID = '1737316449'; // Solapa MANT

/**
 * Parsea fecha en formato DD/MM/YY o DD/MM/YYYY
 */
function parseFecha(fechaStr: string): Date | null {
  if (!fechaStr) return null;

  const partes = fechaStr.trim().split('/');
  if (partes.length !== 3) return null;

  const dia = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1; // Meses 0-indexados
  let anio = parseInt(partes[2], 10);

  // Convertir año de 2 dígitos a 4 dígitos
  if (anio < 100) {
    anio = anio > 50 ? 1900 + anio : 2000 + anio;
  }

  return new Date(anio, mes, dia);
}

/**
 * Parsea kilometraje (puede tener comas como separador de miles)
 */
function parseKilometraje(kmStr: string): number {
  if (!kmStr) return 0;
  // Remover comas y puntos como separadores de miles
  const cleaned = kmStr.replace(/[,\.]/g, '').trim();
  return parseInt(cleaned, 10) || 0;
}

/**
 * Calcula el estado de alerta basado en km restantes
 */
function calcularEstado(kmRestantes: number): EstadoAlertaTR {
  if (kmRestantes <= 0) return 'VENCIDO';
  if (kmRestantes <= CONFIG.UMBRAL_ALERTA_KM) return 'PROXIMO';
  return 'OK';
}

/**
 * Extrae el número de unidad del identificador
 * "Insp Lig721" -> "721"
 * "Tren Rod548" -> "548"
 */
function extraerNumeroUnidad(identificador: string): string {
  const match = identificador.match(/(\d+)$/);
  return match ? match[1] : identificador;
}

/**
 * Determina cuál es el próximo ciclo de mantenimiento (80K o 160K)
 * basado en el kilometraje actual
 */
function calcularProximoCiclo(kmActual: number): '80K' | '160K' {
  // El ciclo es: 80K -> 160K -> 80K -> 160K...
  // Dividimos por 80K para saber en qué múltiplo estamos
  const multiplos = Math.floor(kmActual / CONFIG.INTERVALO_80K);
  // Si es par (0, 2, 4...), el próximo es 80K
  // Si es impar (1, 3, 5...), el próximo es 160K
  return multiplos % 2 === 0 ? '80K' : '160K';
}

/**
 * Calcula el próximo kilometraje de mantenimiento
 */
function calcularProximoKm(kmActual: number, tipo: '40K' | '80K' | '160K'): number {
  const intervalo = tipo === '40K' ? CONFIG.INTERVALO_40K : CONFIG.INTERVALO_80K;
  const multiplo = Math.ceil(kmActual / intervalo);
  return multiplo * intervalo;
}

/**
 * Obtiene datos de la solapa MANT de Google Sheets
 */
export async function obtenerDatosMant(): Promise<DatosSheetMant> {
  const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;

  if (!apiKey) {
    console.error('[TrenRodanteService] API Key no configurada');
    throw new Error('Google Sheets API Key no configurada');
  }

  try {
    // Fetch de la solapa MANT
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/MANT!A:I?key=${apiKey}`;

    console.log('[TrenRodanteService] Fetching MANT sheet...');
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TrenRodanteService] Error response:', errorText);
      throw new Error(`Error fetching Google Sheets: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    console.log('[TrenRodanteService] Rows fetched:', rows.length);

    // Parsear datos
    // Estructura esperada:
    // Columnas A-C: T/MantCisterna (Inspección Ligera)
    // Columnas E-G: T/Mant (Tren Rodante)

    const inspeccionesLigeras: DatosSheetMant['inspeccionesLigeras'] = [];
    const mantenimientosTR: DatosSheetMant['mantenimientosTR'] = [];

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      // Columnas A-C: Inspección Ligera
      const idInspLig = row[0]?.trim();
      const fechaInspLig = row[1]?.trim();
      const kmInspLig = row[2]?.trim();

      if (idInspLig && idInspLig.includes('Insp Lig')) {
        const fecha = parseFecha(fechaInspLig);
        if (fecha) {
          inspeccionesLigeras.push({
            identificador: idInspLig,
            fechaUltimo: fecha,
            kilometraje: parseKilometraje(kmInspLig),
          });
        }
      }

      // Columnas E-G (índices 4-6): Tren Rodante
      const idTrenRod = row[4]?.trim();
      const fechaTrenRod = row[5]?.trim();
      const kmTrenRod = row[6]?.trim();

      if (idTrenRod && idTrenRod.includes('Tren Rod')) {
        const fecha = parseFecha(fechaTrenRod);
        if (fecha) {
          mantenimientosTR.push({
            identificador: idTrenRod,
            fechaUltimo: fecha,
            kilometraje: parseKilometraje(kmTrenRod),
          });
        }
      }
    }

    console.log('[TrenRodanteService] Parsed:', {
      inspeccionesLigeras: inspeccionesLigeras.length,
      mantenimientosTR: mantenimientosTR.length
    });

    return { inspeccionesLigeras, mantenimientosTR };
  } catch (error) {
    console.error('[TrenRodanteService] Error:', error);
    throw error;
  }
}

/**
 * Genera alertas de inspección ligera (40K)
 */
export function generarAlertasInspeccionLigera(
  datos: DatosSheetMant['inspeccionesLigeras']
): AlertaInspeccionLigera[] {
  return datos.map((item, index) => {
    const numeroUnidad = extraerNumeroUnidad(item.identificador);
    const proximoKm = calcularProximoKm(item.kilometraje, '40K');
    const kmRestantes = proximoKm - item.kilometraje;
    const estado = calcularEstado(kmRestantes);

    return {
      id: `insp-lig-${index}`,
      tipo: '40K' as const,
      unidadId: numeroUnidad,
      unidadNumero: numeroUnidad,
      fechaUltimoMant: item.fechaUltimo,
      kilometrajeActual: item.kilometraje,
      kilometrajeProximoMant: proximoKm,
      estado,
      kmRestantes,
    };
  });
}

/**
 * Genera alertas de mantenimiento tren rodante (80K/160K)
 */
export function generarAlertasMantenimientoTR(
  datos: DatosSheetMant['mantenimientosTR']
): AlertaMantenimientoTR[] {
  return datos.map((item, index) => {
    const numeroUnidad = extraerNumeroUnidad(item.identificador);
    const cicloActual = calcularProximoCiclo(item.kilometraje);
    const proximoKm = calcularProximoKm(item.kilometraje, cicloActual);
    const kmRestantes = proximoKm - item.kilometraje;
    const estado = calcularEstado(kmRestantes);

    return {
      id: `tren-rod-${index}`,
      tipo: cicloActual,
      unidadId: numeroUnidad,
      unidadNumero: numeroUnidad,
      fechaUltimoMant: item.fechaUltimo,
      kilometrajeActual: item.kilometraje,
      kilometrajeProximoMant: proximoKm,
      estado,
      kmRestantes,
      cicloActual,
    };
  });
}

/**
 * Obtiene todas las alertas de tren rodante
 */
export async function obtenerAlertasTrenRodante(): Promise<{
  inspeccionLigera: AlertaInspeccionLigera[];
  mantenimiento: AlertaMantenimientoTR[];
  resumen: {
    totalUnidades: number;
    vencidos: number;
    proximos: number;
    ok: number;
  };
}> {
  const datos = await obtenerDatosMant();

  const alertasInspLig = generarAlertasInspeccionLigera(datos.inspeccionesLigeras);
  const alertasMant = generarAlertasMantenimientoTR(datos.mantenimientosTR);

  // Calcular resumen combinado
  const todasAlertas: AlertaTrenRodante[] = [...alertasInspLig, ...alertasMant];
  const vencidos = todasAlertas.filter(a => a.estado === 'VENCIDO').length;
  const proximos = todasAlertas.filter(a => a.estado === 'PROXIMO').length;
  const ok = todasAlertas.filter(a => a.estado === 'OK').length;

  return {
    inspeccionLigera: alertasInspLig,
    mantenimiento: alertasMant,
    resumen: {
      totalUnidades: new Set(todasAlertas.map(a => a.unidadNumero)).size,
      vencidos,
      proximos,
      ok,
    },
  };
}

/**
 * Formatea km para mostrar
 */
export function formatearKm(km: number): string {
  return km.toLocaleString('es-AR') + ' km';
}

/**
 * Formatea fecha para mostrar
 */
export function formatearFecha(fecha: Date): string {
  return fecha.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
