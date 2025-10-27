/**
 * Image Rotation Utility
 * Rotates images to portrait (vertical) orientation
 */

export interface RotationResult {
  blob: Blob;
  rotated: boolean;
  angle: number;
}

/**
 * Rotate image 90 degrees clockwise to ensure vertical/portrait orientation
 */
export async function rotateToVertical(blob: Blob): Promise<RotationResult> {
  try {
    // Load image
    const imageBitmap = await createImageBitmap(blob);
    const { width, height } = imageBitmap;

    console.log(`[ImageRotation] Original size: ${width}x${height}`);

    // Check if image is landscape (needs rotation)
    const isLandscape = width > height;

    if (!isLandscape) {
      console.log('[ImageRotation] Image already vertical, no rotation needed');
      return {
        blob,
        rotated: false,
        angle: 0,
      };
    }

    // Rotate 90 degrees clockwise
    console.log('[ImageRotation] Rotating image 90° to vertical...');

    const canvas = document.createElement('canvas');
    // Swap dimensions for 90° rotation
    canvas.width = height;
    canvas.height = width;

    const ctx = canvas.getContext('2d')!;

    // Rotate 90 degrees clockwise
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(90 * Math.PI / 180);
    ctx.drawImage(imageBitmap, -width / 2, -height / 2, width, height);

    // Convert to blob
    const rotatedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/jpeg',
        0.98 // High quality (increased from 0.92)
      );
    });

    console.log(`[ImageRotation] ✓ Image rotated to ${canvas.width}x${canvas.height}`);

    return {
      blob: rotatedBlob,
      rotated: true,
      angle: 90,
    };
  } catch (error) {
    console.error('[ImageRotation] Error rotating image:', error);
    // Return original on error
    return {
      blob,
      rotated: false,
      angle: 0,
    };
  }
}

/**
 * Rotate image by specific angle (in degrees)
 */
export async function rotateImage(blob: Blob, degrees: number): Promise<Blob> {
  const imageBitmap = await createImageBitmap(blob);
  const { width, height } = imageBitmap;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // For 90 or 270 degrees, swap dimensions
  if (degrees === 90 || degrees === 270) {
    canvas.width = height;
    canvas.height = width;
  } else {
    canvas.width = width;
    canvas.height = height;
  }

  // Rotate
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(degrees * Math.PI / 180);
  ctx.drawImage(imageBitmap, -width / 2, -height / 2, width, height);

  // Convert to blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create blob'))),
      'image/jpeg',
      0.98 // High quality (increased from 0.92)
    );
  });
}
