/**
 * Custom Image Filter
 * Aplica ajustes personalizados a la imagen
 */

export interface CustomFilterOptions {
  brillantez?: number;    // 0-100% (default 30)
  ligereza?: number;      // 0-100% (default 40)
  contraste?: number;     // 0-100% (default 80)
  claridad?: number;      // 0-100% (default 30)
  nitidez?: number;       // 0-100% (default 10)
  textura?: number;       // 0-100% (default 60)
  resaltar?: number;      // -100 to 100% (default -5)
  sombra?: number;        // 0-100% (default 13)
}

/**
 * Apply custom filter to image
 */
export async function applyCustomFilter(
  imageBlob: Blob,
  options: CustomFilterOptions = {}
): Promise<Blob> {
  const {
    brillantez = 30,
    ligereza = 40,
    contraste = 80,
    claridad = 30,
    nitidez = 10,
    textura = 60,
    resaltar = -5,
    sombra = 13
  } = options;

  try {
    console.log('[CustomFilter] Applying custom filter with options:', options);

    // Load image
    const imageBitmap = await createImageBitmap(imageBlob);
    const canvas = document.createElement('canvas');
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(imageBitmap, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    console.log('[CustomFilter] Image size:', canvas.width, 'x', canvas.height);

    // Apply filters in order
    applyBrightness(imageData, brillantez);
    applyLightness(imageData, ligereza);
    applyContrast(imageData, contraste);
    applyShadow(imageData, sombra);
    applyHighlights(imageData, resaltar);
    applyClarity(imageData, claridad);
    applyTexture(imageData, textura);
    applySharpness(imageData, nitidez);

    // Apply enhanced image data
    ctx.putImageData(imageData, 0, 0);

    // Convert to blob
    const enhancedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        },
        'image/jpeg',
        0.98
      );
    });

    console.log('[CustomFilter] ✓ Filter applied successfully');
    return enhancedBlob;
  } catch (error) {
    console.error('[CustomFilter] Error:', error);
    return imageBlob; // Return original on error
  }
}

/**
 * Apply brightness adjustment (Brillantez)
 * 0-100%, where 50% is neutral
 */
function applyBrightness(imageData: ImageData, percent: number): void {
  const { data } = imageData;
  // Convert percent to adjustment (-127 to +127)
  const adjustment = ((percent - 50) / 50) * 127;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, data[i] + adjustment));     // R
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + adjustment)); // G
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + adjustment)); // B
  }
}

/**
 * Apply lightness adjustment (Ligereza)
 * 0-100%, where 50% is neutral
 */
function applyLightness(imageData: ImageData, percent: number): void {
  const { data } = imageData;
  // Convert percent to factor (0.5 to 1.5)
  const factor = 0.5 + (percent / 100);

  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

    // Adjust towards/away from luminance
    data[i] = Math.min(255, Math.max(0, lum + (data[i] - lum) * factor));
    data[i + 1] = Math.min(255, Math.max(0, lum + (data[i + 1] - lum) * factor));
    data[i + 2] = Math.min(255, Math.max(0, lum + (data[i + 2] - lum) * factor));
  }
}

/**
 * Apply contrast adjustment (Contraste)
 * 0-100%, where 50% is neutral
 */
function applyContrast(imageData: ImageData, percent: number): void {
  const { data } = imageData;
  // Convert percent to factor (0 to 2)
  const factor = (percent / 50);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, ((data[i] - 128) * factor) + 128));
    data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - 128) * factor) + 128));
    data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - 128) * factor) + 128));
  }
}

/**
 * Apply shadow adjustment (Sombra)
 * 0-100%, brightens dark areas
 */
function applyShadow(imageData: ImageData, percent: number): void {
  const { data } = imageData;
  const strength = percent / 100;

  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

    // Only affect darker pixels (luminance < 128)
    if (lum < 128) {
      const boost = (128 - lum) * strength * 0.5;
      data[i] = Math.min(255, data[i] + boost);
      data[i + 1] = Math.min(255, data[i + 1] + boost);
      data[i + 2] = Math.min(255, data[i + 2] + boost);
    }
  }
}

/**
 * Apply highlights adjustment (Resaltar)
 * -100 to 100%, darkens/brightens bright areas
 */
function applyHighlights(imageData: ImageData, percent: number): void {
  const { data } = imageData;
  const strength = percent / 100;

  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

    // Only affect brighter pixels (luminance > 128)
    if (lum > 128) {
      const adjustment = (lum - 128) * strength * 0.5;
      data[i] = Math.min(255, Math.max(0, data[i] + adjustment));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + adjustment));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + adjustment));
    }
  }
}

/**
 * Apply clarity adjustment (Claridad)
 * 0-100%, enhances local contrast
 */
function applyClarity(imageData: ImageData, percent: number): void {
  const { data, width, height } = imageData;
  const strength = percent / 100;
  const tempData = new Uint8ClampedArray(data);

  // Simple local contrast enhancement
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;

      // Calculate local average (3x3 neighborhood)
      let sumR = 0, sumG = 0, sumB = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ni = ((y + dy) * width + (x + dx)) * 4;
          sumR += tempData[ni];
          sumG += tempData[ni + 1];
          sumB += tempData[ni + 2];
        }
      }
      const avgR = sumR / 9;
      const avgG = sumG / 9;
      const avgB = sumB / 9;

      // Enhance difference from local average
      data[i] = Math.min(255, Math.max(0, tempData[i] + (tempData[i] - avgR) * strength));
      data[i + 1] = Math.min(255, Math.max(0, tempData[i + 1] + (tempData[i + 1] - avgG) * strength));
      data[i + 2] = Math.min(255, Math.max(0, tempData[i + 2] + (tempData[i + 2] - avgB) * strength));
    }
  }
}

/**
 * Apply texture enhancement (Textura)
 * 0-100%, enhances fine details
 */
function applyTexture(imageData: ImageData, percent: number): void {
  const { data, width, height } = imageData;
  const strength = percent / 100;
  const tempData = new Uint8ClampedArray(data);

  // High-pass filter for texture
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;

      // 3x3 high-pass filter
      const centerR = tempData[i];
      const centerG = tempData[i + 1];
      const centerB = tempData[i + 2];

      let sumR = 0, sumG = 0, sumB = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const ni = ((y + dy) * width + (x + dx)) * 4;
          sumR += tempData[ni];
          sumG += tempData[ni + 1];
          sumB += tempData[ni + 2];
        }
      }
      const avgR = sumR / 8;
      const avgG = sumG / 8;
      const avgB = sumB / 8;

      // Add high-frequency component
      const detailR = (centerR - avgR) * strength;
      const detailG = (centerG - avgG) * strength;
      const detailB = (centerB - avgB) * strength;

      data[i] = Math.min(255, Math.max(0, centerR + detailR));
      data[i + 1] = Math.min(255, Math.max(0, centerG + detailG));
      data[i + 2] = Math.min(255, Math.max(0, centerB + detailB));
    }
  }
}

/**
 * Apply sharpness (Nitidez)
 * 0-100%, sharpens edges
 */
function applySharpness(imageData: ImageData, percent: number): void {
  const { data, width, height } = imageData;
  const strength = percent / 100;
  const tempData = new Uint8ClampedArray(data);

  // Unsharp mask
  const amount = strength * 0.5;
  const kernel = [
    [-amount, -amount, -amount],
    [-amount, 1 + 8 * amount, -amount],
    [-amount, -amount, -amount]
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const i = ((y + ky) * width + (x + kx)) * 4;
          const weight = kernel[ky + 1][kx + 1];

          r += tempData[i] * weight;
          g += tempData[i + 1] * weight;
          b += tempData[i + 2] * weight;
        }
      }

      const i = (y * width + x) * 4;
      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }
  }
}
