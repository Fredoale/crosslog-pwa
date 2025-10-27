import { createWorker, type Worker } from 'tesseract.js';
import { optimizeForRemitoOCR } from './imagePreprocessing';

export interface OCRResult {
  text: string;
  confidence: number;
  numeroRemito?: string;
}

export class OCRScanner {
  private worker: Worker | null = null;
  private initialized = false;

  /**
   * Initialize Tesseract worker
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('[OCR] Initializing Tesseract worker...');

      this.worker = await createWorker('spa', 1, {
        logger: (m) => {
          if (m.status === 'loading tesseract core' || m.status === 'initializing tesseract') {
            console.log('[OCR]', m.status, Math.round(m.progress * 100) + '%');
          }
        },
      });

      this.initialized = true;
      console.log('[OCR] Worker initialized successfully');
    } catch (error) {
      console.error('[OCR] Failed to initialize worker:', error);
      throw error;
    }
  }

  /**
   * Extract text from image
   */
  async extractText(imageBlob: Blob, usePreprocessing = false): Promise<OCRResult> {
    if (!this.worker) {
      await this.init();
    }

    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      console.log('[OCR] Processing image...');

      // Preprocess image for better OCR results (disabled by default)
      let processedBlob = imageBlob;
      if (usePreprocessing) {
        console.log('[OCR] Preprocessing image for better OCR...');
        processedBlob = await optimizeForRemitoOCR(imageBlob);
      } else {
        console.log('[OCR] Using original image without preprocessing');
      }

      const { data } = await this.worker.recognize(processedBlob);

      const text = data.text.trim();
      const confidence = data.confidence;

      console.log('[OCR] Extracted text:', text);
      console.log('[OCR] Confidence:', confidence);

      // Try to extract numero remito (looking for patterns like numbers)
      const numeroRemito = this.extractNumeroRemito(text);

      return {
        text,
        confidence,
        numeroRemito,
      };
    } catch (error) {
      console.error('[OCR] Error extracting text:', error);
      throw error;
    }
  }

  /**
   * Scan remito - alias for extractText for backward compatibility
   */
  async scanRemito(imageBlob: Blob): Promise<OCRResult> {
    return this.extractText(imageBlob);
  }

  /**
   * Extract numero remito from text
   * Detecta automáticamente el formato según el cliente y extrae el número correcto
   * Estrategia: Busca en la parte superior del documento (primeros 500 caracteres) donde suele estar el número de remito
   */
  private extractNumeroRemito(text: string): string | undefined {
    const normalizedText = text.toUpperCase().replace(/\s+/g, ' ');

    // ESTRATEGIA: Buscar en la parte superior del documento (como ECOLAB)
    // La mayoría de remitos tienen el número en las primeras líneas
    const topSection = normalizedText.substring(0, 500);

    console.log('[OCR] Full normalized text:', normalizedText);
    console.log('[OCR] Top section (first 500 chars):', topSection);

    // Patrones por cliente (ordenados por especificidad)
    const patterns = [
      // TOYOTA - Formato especial: "N* 001 7-00001 284" donde el número es "1284"
      // Estrategia: buscar patrón con 3 grupos de números separados por espacios y guion
      // Ejemplo: "N* 001 7-00001 284" -> captura "7" y "284" -> resultado "1284"
      {
        name: 'TOYOTA',
        regex: /N[°O*\s]+0*\d+\s+(\d)\s*[-–—]\s*0*\d+\s+(\d{3,4})/i,
        extract: (match: RegExpMatchArray) => {
          // Combina el primer dígito (antes del guion) con los últimos 3-4 dígitos
          const result = match[1] + match[2];
          console.log(`[OCR] TOYOTA extraction: digit="${match[1]}" + last="${match[2]}" = "${result}"`);
          return result;
        },
        detect: (text: string) => text.includes('TOYOTA') || text.includes('TSUSHO')
      },

      // APN - Formato: "N°0001-03007034" -> extraer "7034" (últimos 4 dígitos)
      // Buscar en top section para evitar confusión con fechas
      {
        name: 'APN',
        regex: /N[°O"*\s]*0*(\d{4})\s*[-–—]\s*0*(\d{8})/i,
        extract: (match: RegExpMatchArray) => {
          // Extrae los últimos 4 dígitos del segundo grupo
          const result = match[2].slice(-4);
          console.log(`[OCR] APN extraction: full="${match[2]}" -> last4="${result}"`);
          return result;
        },
        detect: (text: string) => text.includes('APN') || text.includes('ITALPOLLINA') || text.includes('HELLO NATURE')
      },

      // ECOLAB - Formato: "REMITO N°0000800038568" -> extraer "38568" (últimos 5 dígitos)
      {
        name: 'ECOLAB',
        regex: /REMITO\s*N[°O]?\s*0*(\d{5,15})/i,
        extract: (match: RegExpMatchArray) => {
          const result = match[1].slice(-5);
          console.log(`[OCR] ECOLAB extraction: full="${match[1]}" -> last5="${result}"`);
          return result;
        },
        detect: (text: string) => text.includes('ECOLAB')
      },

      // HALLIBURTON - Formato: "N°0047-00001004" -> extraer "1004" (últimos 4 dígitos)
      {
        name: 'HALLIBURTON',
        regex: /N[°O\s]*0*(\d{1,4})\s*[-–—]\s*0*(\d{4,8})/i,
        extract: (match: RegExpMatchArray) => {
          const result = match[2].slice(-4);
          console.log(`[OCR] HALLIBURTON extraction: full="${match[2]}" -> last4="${result}"`);
          return result;
        },
        detect: (text: string) => text.includes('HALLIBURTON') || text.includes('REMITO/MT')
      },

      // ACOMCAGUA - Formato: "N°0007-00000620" -> extraer "620" (sin ceros a la izquierda)
      // Buscar en top section
      {
        name: 'ACOMCAGUA',
        regex: /N[°O*\s]*0*(\d{4})\s*[-–—]\s*0*(\d{5,8})/i,
        extract: (match: RegExpMatchArray) => {
          // Extrae el segundo grupo y elimina ceros a la izquierda
          const result = match[2].replace(/^0+/, '') || match[2];
          console.log(`[OCR] ACOMCAGUA extraction: full="${match[2]}" -> trimmed="${result}"`);
          return result;
        },
        detect: (text: string) => text.includes('ACONCAGUA') || text.includes('ACOMCAGUA')
      },

      // INQUIMEX - Formato: "N0003-00006711" -> extraer "6711" (últimos 4 dígitos)
      {
        name: 'INQUIMEX',
        regex: /N[°O\s]*0*(\d{1,4})\s*[-–—]\s*0*(\d{4,8})/i,
        extract: (match: RegExpMatchArray) => {
          const result = match[2].slice(-4);
          console.log(`[OCR] INQUIMEX extraction: full="${match[2]}" -> last4="${result}"`);
          return result;
        },
        detect: (text: string) => text.includes('INQUIMEX')
      },

      // GENÉRICO - Formato: "N°XXXX-YYYYYY" o "REMITO N°YYYYYY"
      // Fallback para cualquier formato con guion
      {
        name: 'GENERIC_DASH',
        regex: /(?:REMITO\s*)?N[°O\s]*0*(\d{1,4})\s*[-–—]\s*0*(\d{3,8})/i,
        extract: (match: RegExpMatchArray) => match[2].replace(/^0+/, ''),
        detect: () => true
      },

      // GENÉRICO - Solo número después de "REMITO N°"
      {
        name: 'GENERIC_SIMPLE',
        regex: /REMITO\s*N[°O]?\s*0*(\d{4,8})/i,
        extract: (match: RegExpMatchArray) => match[1].replace(/^0+/, ''),
        detect: () => true
      }
    ];

    // PASO 1: Intentar encontrar el patrón en la sección superior (top 500 chars)
    console.log('[OCR] === PASO 1: Buscando en sección superior ===');
    for (const pattern of patterns) {
      if (pattern.detect(topSection)) {
        console.log(`[OCR] 🔍 Trying ${pattern.name} pattern in TOP section...`);
        const match = topSection.match(pattern.regex);
        if (match) {
          console.log(`[OCR] ✓ Match found in TOP:`, match);
          const extracted = pattern.extract(match);
          console.log(`[OCR] Extracted value:`, extracted);

          // Validación: no debe ser un año (2000-2030) ni muy pequeño
          const numValue = parseInt(extracted);
          if ((numValue >= 2000 && numValue <= 2030) || numValue < 100) {
            console.log(`[OCR] ⚠️ Skipping ${extracted} - invalid number (year or too small)`);
            continue;
          }

          console.log(`[OCR] ✓✓ Detected ${pattern.name} format in TOP, extracted:`, extracted);
          return extracted;
        } else {
          console.log(`[OCR] No match for ${pattern.name} in TOP section`);
        }
      }
    }

    // PASO 2: Si no encuentra en top section, buscar en texto completo
    console.log('[OCR] === PASO 2: Buscando en texto completo ===');
    for (const pattern of patterns) {
      if (pattern.detect(normalizedText)) {
        console.log(`[OCR] 🔍 Trying ${pattern.name} pattern in FULL text...`);
        const match = normalizedText.match(pattern.regex);
        if (match) {
          console.log(`[OCR] Match found in FULL:`, match);
          const extracted = pattern.extract(match);
          console.log(`[OCR] Extracted value:`, extracted);

          // Validación: no debe ser un año (2000-2030) ni muy pequeño
          const numValue = parseInt(extracted);
          if ((numValue >= 2000 && numValue <= 2030) || numValue < 100) {
            console.log(`[OCR] ⚠️ Skipping ${extracted} - invalid number (year or too small)`);
            continue;
          }

          console.log(`[OCR] ✓ Detected ${pattern.name} format in FULL, extracted:`, extracted);
          return extracted;
        } else {
          console.log(`[OCR] No match for ${pattern.name} in FULL text`);
        }
      }
    }

    // Si no encuentra con patrones específicos, buscar números significativos
    console.log('[OCR] === PASO 3: Usando fallback extraction ===');
    return this.extractNumeroRemitoFallback(topSection);
  }

  /**
   * Fallback extraction method (lógica original con filtros mejorados)
   */
  private extractNumeroRemitoFallback(text: string): string | undefined {
    // Find all sequences of digits in the text
    const allNumbers = text.match(/\d+/g) || [];

    console.log('[OCR] All numbers found:', allNumbers);

    // Process each number: remove leading zeros and check if it's 3-6 digits
    const candidates: { original: string; cleaned: string; length: number }[] = [];

    for (const num of allNumbers) {
      // Remove leading zeros
      const cleaned = num.replace(/^0+/, '') || '0';
      const length = cleaned.length;
      const numValue = parseInt(cleaned);

      // Filtros:
      // 1. Debe estar entre 3-6 dígitos
      // 2. NO debe ser un año (2000-2030)
      // 3. NO debe ser menor a 100
      if (length >= 3 && length <= 6) {
        if ((numValue >= 2000 && numValue <= 2030) || numValue < 100) {
          console.log(`[OCR] ⚠️ Skipping ${cleaned} - invalid (year or too small)`);
          continue;
        }
        candidates.push({ original: num, cleaned, length });
      }
    }

    console.log('[OCR] Valid candidate numbers:', candidates);

    if (candidates.length === 0) {
      console.log('[OCR] ❌ No valid candidates found');
      return undefined;
    }

    // Priority 1: Look for exactly 4 digits (without leading zeros)
    const fourDigit = candidates.find(c => c.length === 4);
    if (fourDigit) {
      console.log('[OCR] ✓ Found 4-digit numero remito:', fourDigit.cleaned);
      return fourDigit.cleaned;
    }

    // Priority 2: Look for 3 digits
    const threeDigit = candidates.find(c => c.length === 3);
    if (threeDigit) {
      console.log('[OCR] ✓ Found 3-digit numero remito:', threeDigit.cleaned);
      return threeDigit.cleaned;
    }

    // Priority 3: Take the first valid number found
    const first = candidates[0];
    console.log('[OCR] ✓ Taking first valid numero remito:', first.cleaned);
    return first.cleaned;
  }

  /**
   * Terminate worker
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.initialized = false;
      console.log('[OCR] Worker terminated');
    }
  }
}

// Create singleton instance
export const ocrScanner = new OCRScanner();
