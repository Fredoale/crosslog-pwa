/**
 * Magic Pro Filter - Professional color document scanner
 * Optimized for color documents with text and images
 */

export interface MagicProOptions {
  autoContrast?: boolean;
  sharpen?: boolean;
  denoise?: boolean;
}

/**
 * Apply Magic Pro filter - Professional color document enhancement
 * Based on professional scanner algorithms
 */
export async function applyMagicProFilter(
  imageBlob: Blob,
  options: MagicProOptions = {}
): Promise<Blob> {
  const { autoContrast: _autoContrast = true, sharpen = true, denoise: _denoise = false } = options; // Reserved for future use

  try {
    console.log('[MagicPro] Starting professional color document enhancement...');

    // Load image
    const imageBitmap = await createImageBitmap(imageBlob);
    const canvas = document.createElement('canvas');
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(imageBitmap, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    console.log('[MagicPro] Image size:', canvas.width, 'x', canvas.height);

    // Step 1: Normalize brightness (smooth out lighting)
    console.log('[MagicPro] Normalizing brightness...');
    normalizeBrightness(imageData);

    // Step 2: Make background pure white
    console.log('[MagicPro] Whitening paper background...');
    whitenPaperBackground(imageData);

    // Step 3: Enhance text contrast
    console.log('[MagicPro] Enhancing text contrast...');
    enhanceTextContrast(imageData);

    // Step 4: Boost color saturation for logos/images
    console.log('[MagicPro] Boosting colors...');
    boostColorSaturation(imageData);

    // Step 5: Light sharpening for text clarity
    if (sharpen) {
      console.log('[MagicPro] Sharpening text...');
      sharpenText(imageData);
    }

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
        0.98 // High quality
      );
    });

    console.log('[MagicPro] ✓ Enhancement complete');
    return enhancedBlob;
  } catch (error) {
    console.error('[MagicPro] Error:', error);
    return imageBlob; // Return original on error
  }
}

/**
 * Normalize brightness - smooth out uneven lighting like a scanner
 */
function normalizeBrightness(imageData: ImageData): void {
  const { data, width, height } = imageData;

  // Use moderate blocks
  const blockSize = 60;
  const blocksX = Math.ceil(width / blockSize);
  const blocksY = Math.ceil(height / blockSize);

  // Calculate average brightness per block
  const blockBrightness: number[][] = [];
  let totalBrightness = 0;

  for (let by = 0; by < blocksY; by++) {
    blockBrightness[by] = [];
    for (let bx = 0; bx < blocksX; bx++) {
      let sum = 0;
      let count = 0;

      for (let y = by * blockSize; y < Math.min((by + 1) * blockSize, height); y++) {
        for (let x = bx * blockSize; x < Math.min((bx + 1) * blockSize, width); x++) {
          const i = (y * width + x) * 4;
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          sum += lum;
          count++;
        }
      }

      const avgBrightness = sum / count;
      blockBrightness[by][bx] = avgBrightness;
      totalBrightness += avgBrightness;
    }
  }

  // Calculate target brightness (average)
  const targetBrightness = totalBrightness / (blocksX * blocksY);

  // Apply gentle correction
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const bx = Math.min(Math.floor(x / blockSize), blocksX - 1);
      const by = Math.min(Math.floor(y / blockSize), blocksY - 1);

      const localBrightness = blockBrightness[by][bx];
      const i = (y * width + x) * 4;

      // Gentle correction (max 1.5x)
      const correction = Math.min(1.5, targetBrightness / (localBrightness || 1));

      // Apply preserving color
      data[i] = Math.min(255, data[i] * correction);
      data[i + 1] = Math.min(255, data[i + 1] * correction);
      data[i + 2] = Math.min(255, data[i + 2] * correction);
    }
  }
}

/**
 * Whiten paper background - make paper pure white while preserving colored content
 * Uses intelligent detection to only whiten gray/white areas (paper)
 */
function whitenPaperBackground(imageData: ImageData): void {
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Calculate saturation (how colorful vs gray)
    const maxChannel = Math.max(r, g, b);
    const minChannel = Math.min(r, g, b);
    const saturation = maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;

    // Only whiten pixels that are:
    // 1. Bright enough (lum > 120) - likely paper, not text
    // 2. Low saturation (< 0.15) - grayish/white, not colored logos
    if (lum > 120 && saturation < 0.15) {
      // Calculate whitening strength based on brightness
      // Brighter pixels get pushed harder toward white
      const whitenStrength = Math.pow((lum - 120) / 135, 0.8);
      const boost = whitenStrength * 100; // Up to 100 point boost

      data[i] = Math.min(255, r + boost);
      data[i + 1] = Math.min(255, g + boost);
      data[i + 2] = Math.min(255, b + boost);
    }
  }
}

/**
 * Enhance text contrast - make text darker and crisper
 * Uses intelligent detection to only darken text, not the whole image
 */
function enhanceTextContrast(imageData: ImageData): void {
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Calculate saturation
    const maxChannel = Math.max(r, g, b);
    const minChannel = Math.min(r, g, b);
    const saturation = maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;

    // Only enhance contrast for:
    // 1. Dark pixels (lum < 150) - likely text or dark elements
    // 2. Low saturation (< 0.3) - grayish, not colored logos
    if (lum < 150 && saturation < 0.3) {
      // Apply S-curve to make dark pixels darker
      for (let c = 0; c < 3; c++) {
        const channel = data[i + c];
        const normalized = channel / 255;

        // S-curve for text darkening
        let enhanced;
        if (normalized < 0.5) {
          enhanced = 0.5 * Math.pow(2 * normalized, 1.5); // Darker darks
        } else {
          enhanced = 1 - 0.5 * Math.pow(2 * (1 - normalized), 1.5);
        }

        data[i + c] = Math.min(255, Math.max(0, enhanced * 255));
      }
    }
  }
}

/**
 * Boost color saturation - make logos and colored elements more vivid
 * Only boosts colored areas, leaves grayscale alone
 */
function boostColorSaturation(imageData: ImageData): void {
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate saturation
    const maxChannel = Math.max(r, g, b);
    const minChannel = Math.min(r, g, b);
    const saturation = maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;

    // Only boost pixels that are already colorful (saturation > 0.15)
    // This preserves text and paper while enhancing logos
    if (saturation > 0.15) {
      // Calculate luminance
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Boost saturation by 40%
      const boostFactor = 1.4;

      // Increase distance from gray (luminance)
      data[i] = Math.min(255, Math.max(0, lum + (r - lum) * boostFactor));
      data[i + 1] = Math.min(255, Math.max(0, lum + (g - lum) * boostFactor));
      data[i + 2] = Math.min(255, Math.max(0, lum + (b - lum) * boostFactor));
    }
  }
}

/**
 * Sharpen text for clarity
 * Light unsharp mask for crisp text
 */
function sharpenText(imageData: ImageData): void {
  const { width, height, data } = imageData;
  const tempData = new Uint8ClampedArray(data);

  // Moderate sharpening kernel
  const amount = 0.6;
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
