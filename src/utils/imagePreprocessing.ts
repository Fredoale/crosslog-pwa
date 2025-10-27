/**
 * Image Preprocessing Utilities for OCR
 * Mejora la calidad de las imágenes antes del OCR
 */

export interface PreprocessOptions {
  /** Aumentar contraste (0.5 - 2.0, default: 1.5) */
  contrast?: number;
  /** Brillo (-100 a 100, default: 10) */
  brightness?: number;
  /** Convertir a escala de grises */
  grayscale?: boolean;
  /** Aplicar threshold binario (0-255, default: 128) */
  threshold?: number;
  /** Sharpen (nitidez) */
  sharpen?: boolean;
  /** Calidad de salida JPEG (0-1, default: 0.95) */
  quality?: number;
}

/**
 * Preprocesa imagen para mejorar OCR
 */
export async function preprocessImageForOCR(
  blob: Blob,
  options: PreprocessOptions = {}
): Promise<Blob> {
  const {
    contrast = 1.5,
    brightness = 10,
    grayscale = true,
    threshold = 128,
    sharpen = true,
    quality = 0.95,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Apply preprocessing
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // Convert to grayscale
          if (grayscale) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = g = b = gray;
          }

          // Apply brightness
          r = Math.min(255, Math.max(0, r + brightness));
          g = Math.min(255, Math.max(0, g + brightness));
          b = Math.min(255, Math.max(0, b + brightness));

          // Apply contrast
          r = Math.min(255, Math.max(0, (r - 128) * contrast + 128));
          g = Math.min(255, Math.max(0, (g - 128) * contrast + 128));
          b = Math.min(255, Math.max(0, (b - 128) * contrast + 128));

          // Apply threshold (binarization)
          if (threshold > 0) {
            const avg = (r + g + b) / 3;
            const value = avg >= threshold ? 255 : 0;
            r = g = b = value;
          }

          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }

        // Apply sharpening if enabled
        if (sharpen) {
          const sharpened = applySharpen(imageData);
          ctx.putImageData(sharpened, 0, 0);
        } else {
          ctx.putImageData(imageData, 0, 0);
        }

        // Convert to blob
        canvas.toBlob(
          (processedBlob) => {
            URL.revokeObjectURL(url);
            if (processedBlob) {
              resolve(processedBlob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Aplica filtro de sharpening (nitidez)
 */
function applySharpen(imageData: ImageData): ImageData {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return imageData;
  }

  canvas.width = imageData.width;
  canvas.height = imageData.height;

  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = ctx.createImageData(width, height);

  // Sharpen kernel
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0,
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const k = kernel[(ky + 1) * 3 + (kx + 1)];

          r += data[idx] * k;
          g += data[idx + 1] * k;
          b += data[idx + 2] * k;
        }
      }

      const idx = (y * width + x) * 4;
      output.data[idx] = Math.min(255, Math.max(0, r));
      output.data[idx + 1] = Math.min(255, Math.max(0, g));
      output.data[idx + 2] = Math.min(255, Math.max(0, b));
      output.data[idx + 3] = 255;
    }
  }

  return output;
}

/**
 * Detecta y recorta región de interés (ROI) donde probablemente está el número de remito
 */
export async function detectRemitoROI(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        // El número de remito suele estar en el centro superior o centro de la imagen
        // Recortamos a 60% del ancho y 40% de altura centrados
        const cropWidth = Math.floor(img.width * 0.6);
        const cropHeight = Math.floor(img.height * 0.4);
        const cropX = Math.floor((img.width - cropWidth) / 2);
        const cropY = Math.floor(img.height * 0.15); // 15% desde arriba

        canvas.width = cropWidth;
        canvas.height = cropHeight;

        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        );

        canvas.toBlob(
          (croppedBlob) => {
            URL.revokeObjectURL(url);
            if (croppedBlob) {
              resolve(croppedBlob);
            } else {
              reject(new Error('Failed to create cropped blob'));
            }
          },
          'image/jpeg',
          0.95
        );
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Aplica preprocesamiento optimizado para OCR de remitos
 */
export async function optimizeForRemitoOCR(blob: Blob): Promise<Blob> {
  console.log('[ImagePreprocess] Starting optimization for remito OCR...');

  try {
    // Step 1: Detectar y recortar ROI
    console.log('[ImagePreprocess] Step 1: Detecting ROI...');
    const roiBlob = await detectRemitoROI(blob);

    // Step 2: Preprocesar imagen
    console.log('[ImagePreprocess] Step 2: Preprocessing...');
    const preprocessed = await preprocessImageForOCR(roiBlob, {
      contrast: 1.8,
      brightness: 15,
      grayscale: true,
      threshold: 140,
      sharpen: true,
      quality: 0.95,
    });

    console.log('[ImagePreprocess] ✓ Optimization complete');
    return preprocessed;
  } catch (error) {
    console.error('[ImagePreprocess] Error:', error);
    // Return original if preprocessing fails
    return blob;
  }
}
