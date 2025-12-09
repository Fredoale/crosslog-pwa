import Anthropic from '@anthropic-ai/sdk';

// Types for our analysis data
export interface MonthData {
  month: string;
  totalViajes: number;
  crosslog: number;
  fleteros: number;
  topClientes: Array<{ nombre: string; viajes: number }>;
}

export interface AnalysisData {
  // Current period
  totalViajes: number;
  crosslogCount: number;
  fleterosCount: number;
  locCount: number;
  intCount: number;
  topClientes: Array<{ nombre: string; viajes: number }>;

  // Historical data (last 3 months for backward compatibility)
  historicalData: {
    month1: MonthData;
    month2: MonthData;
    month3: MonthData;
  };

  // Extended data for different period reports
  allMonths?: MonthData[];
  periodType?: '2months' | '3months' | '6months' | 'annual';
}

export interface AIAnalysisResult {
  resumenEjecutivo: string;
  analisisClientesEstrella: string;
  analisisFlota: string;
  alertas: string[];
  recomendaciones: string[];
  fullAnalysis: string;
}

/**
 * Generate intelligent analysis using Claude API
 */
export async function generateClaudeAnalysis(data: AnalysisData, apiKey: string): Promise<AIAnalysisResult> {
  try {
    const anthropic = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Only for development - move to backend in production
    });

    const prompt = buildAnalysisPrompt(data);

    console.log('[Claude] Sending analysis request...');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const analysisText = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log('[Claude] Analysis received:', analysisText.substring(0, 200) + '...');

    return parseAnalysisResponse(analysisText);
  } catch (error) {
    console.error('[Claude] Error generating analysis:', error);
    throw new Error('Error al generar análisis con IA: ' + (error as Error).message);
  }
}

/**
 * Build the analysis prompt for Claude
 */
function buildAnalysisPrompt(data: AnalysisData): string {
  // Use the last month from the analysis data instead of system date
  const currentMonth = data.allMonths && data.allMonths.length > 0
    ? data.allMonths[data.allMonths.length - 1].month
    : data.historicalData.month3.month;

  // Calculate current day of month for partial month analysis
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - currentDay;

  return `Eres un analista experto de logística y transporte para la empresa CROSSLOG. Analiza los siguientes datos y genera un reporte ejecutivo profesional en español.

CONTEXTO IMPORTANTE:
- CROSSLOG: Viajes realizados con flota propia de la empresa (unidades: 41, 45, 46, 62, 63, 64, 813, 816, 817)
- FLETEROS: Viajes tercerizados (BARCO, DON PEDRO, VIMAAB, LOGZO, PRODAN, CALLTRUCK, MODESTRUCK, ANDROSIUK)
- LOC: Viajes locales (columna M) - dentro de la ciudad/zona
- INT: Viajes al interior (columna M) - fuera de la ciudad/zona
- Choferes propios: Oscar Gomez, Martin Romero, Gonzalo Ramirez, Camilo Suarez, Noval Ezequiel, Gayoso Luis, Lucas Zurita, Jonatan Esteban, Ariel Tognetti

FLOTA CROSSLOG (Capacidad instalada):
- 1 Semi: Unidades 45-809, 46-61
- 2 Balancines: Unidad 813, Unidad 46-61 (multiuso: balancín y semi)
- 3 Chasis: Unidades 63, 62, 54
- Unidad 46 (multiuso): Se usa como chasis, balancín y semi con acoplado 61
- 1 F100: Unidad 816
NOTA: La capacidad de CROSSLOG depende del tipo de unidad que solicitan los clientes. Analiza si hay desbalance entre demanda de tipos de unidad y capacidad disponible.

CÓDIGOS DE CLIENTES (Usar nombres completos en el análisis):
- ECO = Ecolab
- TOY = Toyota
- OXY = Oxynet (contrato finalizado en Octubre, no habrá más registros)
- ACO = Aconcagua

FECHA ACTUAL: Hoy es día ${currentDay} del mes, faltan ${daysRemaining} días para finalizar el mes en curso. Al comparar con meses anteriores completos, considera que el mes actual aún está en progreso.

DATOS DEL PERÍODO ACTUAL (${currentMonth}):
- Total de viajes: ${data.totalViajes}
- CROSSLOG (flota propia): ${data.crosslogCount} viajes (${((data.crosslogCount / data.totalViajes) * 100).toFixed(1)}%)
- FLETEROS (tercerizados): ${data.fleterosCount} viajes (${((data.fleterosCount / data.totalViajes) * 100).toFixed(1)}%)
- Viajes LOC (locales): ${data.locCount} viajes (${data.locCount > 0 ? ((data.locCount / (data.locCount + data.intCount)) * 100).toFixed(1) : '0'}%)
- Viajes INT (interior): ${data.intCount} viajes (${data.intCount > 0 ? ((data.intCount / (data.locCount + data.intCount)) * 100).toFixed(1) : '0'}%)

TOP 3 CLIENTES ACTUALES:
${data.topClientes.slice(0, 3).map((c, i) => `${i + 1}. ${c.nombre}: ${c.viajes} viajes (${((c.viajes / data.totalViajes) * 100).toFixed(1)}%)`).join('\n')}

DATOS HISTÓRICOS${data.allMonths ? ` (${data.allMonths.length} MESES)` : ' (ÚLTIMOS 3 MESES)'}:

${data.allMonths
  ? data.allMonths.map(month => `${month.month}:
- Total: ${month.totalViajes} viajes
- CROSSLOG: ${month.crosslog} | FLETEROS: ${month.fleteros}
- Top 3: ${month.topClientes.slice(0, 3).map(c => `${c.nombre} (${c.viajes})`).join(', ')}`).join('\n\n')
  : `${data.historicalData.month1.month}:
- Total: ${data.historicalData.month1.totalViajes} viajes
- CROSSLOG: ${data.historicalData.month1.crosslog} | FLETEROS: ${data.historicalData.month1.fleteros}
- Top 3: ${data.historicalData.month1.topClientes.slice(0, 3).map(c => `${c.nombre} (${c.viajes})`).join(', ')}

${data.historicalData.month2.month}:
- Total: ${data.historicalData.month2.totalViajes} viajes
- CROSSLOG: ${data.historicalData.month2.crosslog} | FLETEROS: ${data.historicalData.month2.fleteros}
- Top 3: ${data.historicalData.month2.topClientes.slice(0, 3).map(c => `${c.nombre} (${c.viajes})`).join(', ')}

${data.historicalData.month3.month}:
- Total: ${data.historicalData.month3.totalViajes} viajes
- CROSSLOG: ${data.historicalData.month3.crosslog} | FLETEROS: ${data.historicalData.month3.fleteros}
- Top 3: ${data.historicalData.month3.topClientes.slice(0, 3).map(c => `${c.nombre} (${c.viajes})`).join(', ')}`}

CONTEXTO CRÍTICO:
Si los datos muestran cero viajes, NO asumas automáticamente una "crisis operacional" o "quiebra inminente".
Los meses futuros (posteriores a hoy) obviamente tendrán cero datos. Verifica las fechas antes de concluir crisis.
Si los datos son de meses pasados con cero viajes, sí menciona la falta de actividad, pero sin dramatizar.

GENERA UN ANÁLISIS ESTRUCTURADO CON LAS SIGUIENTES SECCIONES.

IMPORTANTE: Usa EXACTAMENTE estos encabezados sin agregar formato markdown adicional (sin #, sin **, sin >).
Responde ÚNICAMENTE con el formato especificado a continuación, sin introducción ni conclusión adicional:

[RESUMEN_EJECUTIVO]
Un párrafo ejecutivo que resuma el estado actual del negocio. IMPORTANTE: Si estamos analizando el mes en curso parcial (día ${currentDay} de ${daysInMonth}), menciona que faltan ${daysRemaining} días y que las comparaciones son con meses completos. Analiza tendencias y balance flota propia vs tercerización.

[ANALISIS_CLIENTES_ESTRELLA]
Análisis detallado de los 3 principales clientes. FORMATO IMPORTANTE:
- Usa nombres completos (Ecolab, Toyota, Oxynet, Aconcagua) no códigos
- Separa cada cliente en un párrafo independiente con punto y aparte
- Para cada cliente: comportamiento actual, tendencias (crecimiento/estabilidad/decrecimiento), y comparación con período anterior
- Si Oxynet aparece en períodos anteriores pero no en el actual, menciona que el contrato finalizó en Octubre

[ANALISIS_FLOTA]
Análisis operativo profundo considerando:
1. Distribución CROSSLOG vs FLETEROS y evolución de esta proporción
2. Eficiencia operativa: uso de choferes propios vs tercerizados
3. Impacto de clientes que requieren documentación de plataforma (deben cubrirse con flota propia)
4. Si hay cambios significativos en la proporción, analiza las posibles causas (optimización de costos, limitaciones de capacidad, finalización de contratos como Oxynet)
5. Evalúa si la proporción actual es óptima para el tipo de operación

[ALERTAS]
Lista de 3-5 alertas importantes basadas en los datos reales (una por línea, comenzando con "- ").
Enfócate en tendencias observables, riesgos operativos concretos, y oportunidades de mejora. Sé específico y evita alertas genéricas.

[RECOMENDACIONES]
Lista de 4-6 recomendaciones estratégicas concretas y accionables (una por línea, comenzando con "- ").
Basadas en los datos del período, sugiere acciones específicas para optimizar operaciones, mejorar rentabilidad o mitigar riesgos identificados.

Sé específico, profesional y objetivo. Usa números y porcentajes cuando sea relevante. Evita el alarmismo innecesario.`;
}

/**
 * Parse Claude's response into structured sections
 */
function parseAnalysisResponse(analysisText: string): AIAnalysisResult {
  const sections = {
    resumenEjecutivo: '',
    analisisClientesEstrella: '',
    analisisFlota: '',
    alertas: [] as string[],
    recomendaciones: [] as string[],
    fullAnalysis: analysisText
  };

  // Helper to clean markdown formatting aggressively
  const cleanText = (text: string) => {
    return text
      .replace(/^#+\s*/gm, '') // Remove markdown headers (#, ##, ###)
      .replace(/\*\*([^\*]+)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*([^\*]+)\*/g, '$1') // Remove italic markdown
      .replace(/^>\s*/gm, '') // Remove blockquote markdown
      .replace(/^[-\*]\s*/gm, '') // Remove list markers at start of line
      .replace(/^---+$/gm, '') // Remove horizontal rules
      .replace(/⚠️|📊|📈|✓|•/g, '') // Remove emojis and bullets
      .replace(/^\s*ALERTAS PRINCIPALES\s*$/gmi, '') // Remove standalone headers
      .replace(/^\s*RECOMENDACIONES ESTRATÉGICAS\s*$/gmi, '')
      .replace(/^\s*CONCLUSIÓN:.*$/gmi, '') // Remove conclusion lines
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')
      .trim();
  };

  // Extract sections using markers - more flexible regex to handle markdown
  const resumenMatch = analysisText.match(/(?:##?\s*)?\[RESUMEN_EJECUTIVO\]\s*([\s\S]*?)(?=(?:##?\s*)?\[|CLIENTES ESTRELLA|ANÁLISIS DE FLOTA|ALERTAS|RECOMENDACIONES|$)/i);
  if (resumenMatch) sections.resumenEjecutivo = cleanText(resumenMatch[1]);

  const clientesMatch = analysisText.match(/(?:(?:##?\s*)?\[ANALISIS_CLIENTES_ESTRELLA\]|CLIENTES ESTRELLA)\s*([\s\S]*?)(?=(?:##?\s*)?\[|ANÁLISIS DE FLOTA|ALERTAS|RECOMENDACIONES|$)/i);
  if (clientesMatch) sections.analisisClientesEstrella = cleanText(clientesMatch[1]);

  const flotaMatch = analysisText.match(/(?:(?:##?\s*)?\[ANALISIS_FLOTA\]|ANÁLISIS DE FLOTA)\s*([\s\S]*?)(?=(?:##?\s*)?\[|ALERTAS|RECOMENDACIONES|$)/i);
  if (flotaMatch) sections.analisisFlota = cleanText(flotaMatch[1]);

  // Parse ALERTAS - more flexible to handle different formats
  const alertasMatch = analysisText.match(/(?:(?:##?\s*)?\[ALERTAS\]|ALERTAS PRINCIPALES?)\s*([\s\S]*?)(?=(?:##?\s*)?\[|RECOMENDACIONES|$)/i);
  if (alertasMatch) {
    const alertasText = alertasMatch[1].trim();
    sections.alertas = alertasText
      .split('\n')
      .map(line => line.trim())
      .filter(line =>
        line.length > 10 &&
        (line.startsWith('-') || line.startsWith('•') || line.startsWith('⚠️') || /^\d+\./.test(line))
      )
      .map(line => line.replace(/^[-•⚠️\d\.]+\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  // Parse RECOMENDACIONES - more flexible to handle different formats
  const recomendacionesMatch = analysisText.match(/(?:(?:##?\s*)?\[RECOMENDACIONES\]|RECOMENDACIONES ESTRATÉGICAS?)\s*([\s\S]*?)(?=(?:##?\s*)?\[|CONCLUSIÓN|$)/i);
  if (recomendacionesMatch) {
    const recText = recomendacionesMatch[1].trim();
    sections.recomendaciones = recText
      .split('\n')
      .map(line => line.trim())
      .filter(line =>
        line.length > 10 &&
        (line.startsWith('-') || line.startsWith('•') || line.startsWith('✓') || /^\d+\./.test(line))
      )
      .map(line => line.replace(/^[-•✓\d\.]+\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  return sections;
}

/**
 * Validate API key format
 */
export function validateClaudeApiKey(apiKey: string): boolean {
  return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
}
