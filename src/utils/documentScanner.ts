// Document Scanner with OpenCV.js
// Intelligent edge detection and auto-cropping for document scanning

import cv from '@techstark/opencv-js';

export interface ScanResult {
  success: boolean;
  processedBlob?: Blob;
  originalBlob?: Blob;
  error?: string;
  corners?: { x: number; y: number }[];
}

export interface ScanOptions {
  autoEnhance?: boolean;
  quality?: number;
}

// Global flag to track if OpenCV is ready
let opencvReady = false;
let opencvLoadPromise: Promise<void> | null = null;

/**
 * Wait for OpenCV to be ready
 */
async function waitForOpenCV(): Promise<void> {
  if (opencvReady) return;

  if (opencvLoadPromise) {
    return opencvLoadPromise;
  }

  opencvLoadPromise = new Promise((resolve, reject) => {
    // Check if cv is already loaded
    if (cv && typeof cv.matFromImageData === 'function') {
      console.log('[DocumentScanner] OpenCV already loaded');
      opencvReady = true;
      resolve();
      return;
    }

    // Wait for onRuntimeInitialized callback
    const timeout = setTimeout(() => {
      reject(new Error('OpenCV loading timeout'));
    }, 30000);

    cv['onRuntimeInitialized'] = () => {
      clearTimeout(timeout);
      console.log('[DocumentScanner] OpenCV runtime initialized');
      opencvReady = true;
      resolve();
    };
  });

  return opencvLoadPromise;
}

/**
 * Scan and process document image with automatic edge detection and cropping
 */
export async function scanDocument(
  imageBlob: Blob,
  options: ScanOptions = {}
): Promise<ScanResult> {
  const { autoEnhance = true, quality = 95 } = options; // High quality (increased from 90)

  try {
    console.log('[DocumentScanner] Starting document scan...');

    // Wait for OpenCV to be ready
    await waitForOpenCV();

    // Load image into OpenCV
    const imageBitmap = await createImageBitmap(imageBlob);
    const canvas = document.createElement('canvas');
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(imageBitmap, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const src = cv.matFromImageData(imageData);

    console.log(`[DocumentScanner] Image loaded: ${src.cols}x${src.rows}`);

    // Find document contour
    const documentContour = findDocumentContour(src);

    if (!documentContour || documentContour.length !== 4) {
      console.warn('[DocumentScanner] Could not find document edges, returning original');
      src.delete();
      return {
        success: false,
        originalBlob: imageBlob,
        error: 'No se pudo detectar el documento. Usa la imagen original.',
      };
    }

    console.log('[DocumentScanner] Document corners found:', documentContour);

    // Apply perspective transform to crop document
    const croppedMat = applyPerspectiveTransform(src, documentContour);

    // Enhance image if requested
    if (autoEnhance) {
      enhanceDocument(croppedMat);
    }

    // Convert back to blob
    const processedBlob = await matToBlob(croppedMat, quality);

    // Cleanup
    src.delete();
    croppedMat.delete();

    console.log('[DocumentScanner] ✓ Document scanned successfully');

    return {
      success: true,
      processedBlob,
      originalBlob: imageBlob,
      corners: documentContour,
    };
  } catch (error) {
    console.error('[DocumentScanner] Error:', error);
    return {
      success: false,
      originalBlob: imageBlob,
      error: error instanceof Error ? error.message : 'Error al procesar documento',
    };
  }
}

/**
 * Find the contour of the document in the image
 */
function findDocumentContour(src: any): { x: number; y: number }[] | null {
  // Convert to grayscale
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  // Apply Gaussian blur to reduce noise
  const blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

  // Edge detection with Canny
  const edges = new cv.Mat();
  cv.Canny(blurred, edges, 50, 150);

  // Dilate edges to close gaps
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
  const dilated = new cv.Mat();
  cv.dilate(edges, dilated, kernel);

  // Find contours
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  console.log(`[DocumentScanner] Found ${contours.size()} contours`);

  // Find the largest contour that forms a quadrilateral
  let maxArea = 0;
  let bestContour: any = null;

  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i);
    const area = cv.contourArea(contour);

    // Only consider large contours (at least 10% of image area)
    const minArea = (src.cols * src.rows) * 0.1;
    if (area < minArea) continue;

    // Approximate contour to polygon
    const peri = cv.arcLength(contour, true);
    const approx = new cv.Mat();
    cv.approxPolyDP(contour, approx, 0.02 * peri, true);

    // Check if it's a quadrilateral
    if (approx.rows === 4 && area > maxArea) {
      maxArea = area;
      if (bestContour) bestContour.delete();
      bestContour = approx.clone();
    }

    approx.delete();
  }

  // Cleanup
  gray.delete();
  blurred.delete();
  edges.delete();
  kernel.delete();
  dilated.delete();
  contours.delete();
  hierarchy.delete();

  if (!bestContour) {
    console.warn('[DocumentScanner] No quadrilateral found');
    return null;
  }

  // Extract corner points
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 4; i++) {
    corners.push({
      x: bestContour.data32S[i * 2],
      y: bestContour.data32S[i * 2 + 1],
    });
  }

  bestContour.delete();

  // Order corners: top-left, top-right, bottom-right, bottom-left
  return orderPoints(corners);
}

/**
 * Order points in clockwise order starting from top-left
 */
function orderPoints(points: { x: number; y: number }[]): { x: number; y: number }[] {
  // Sort by sum (top-left has smallest sum, bottom-right has largest)
  const sorted = points.slice().sort((a, b) => (a.x + a.y) - (b.x + b.y));

  const topLeft = sorted[0];
  const bottomRight = sorted[3];

  // Sort remaining two points by difference
  const remaining = [sorted[1], sorted[2]].sort((a, b) => (a.x - a.y) - (b.x - b.y));

  const topRight = remaining[1];
  const bottomLeft = remaining[0];

  return [topLeft, topRight, bottomRight, bottomLeft];
}

/**
 * Apply perspective transform to extract document
 */
function applyPerspectiveTransform(
  src: any,
  corners: { x: number; y: number }[]
): any {
  // Calculate destination width and height
  const [tl, tr, br, bl] = corners;

  const widthTop = Math.sqrt(Math.pow(tr.x - tl.x, 2) + Math.pow(tr.y - tl.y, 2));
  const widthBottom = Math.sqrt(Math.pow(br.x - bl.x, 2) + Math.pow(br.y - bl.y, 2));
  const maxWidth = Math.max(widthTop, widthBottom);

  const heightLeft = Math.sqrt(Math.pow(bl.x - tl.x, 2) + Math.pow(bl.y - tl.y, 2));
  const heightRight = Math.sqrt(Math.pow(br.x - tr.x, 2) + Math.pow(br.y - tr.y, 2));
  const maxHeight = Math.max(heightLeft, heightRight);

  // Source points
  const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    tl.x, tl.y,
    tr.x, tr.y,
    br.x, br.y,
    bl.x, bl.y,
  ]);

  // Destination points (rectangle)
  const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    maxWidth, 0,
    maxWidth, maxHeight,
    0, maxHeight,
  ]);

  // Get perspective transform matrix
  const M = cv.getPerspectiveTransform(srcPoints, dstPoints);

  // Apply warp
  const dst = new cv.Mat();
  cv.warpPerspective(
    src,
    dst,
    M,
    new cv.Size(maxWidth, maxHeight),
    cv.INTER_LINEAR,
    cv.BORDER_CONSTANT,
    new cv.Scalar(255, 255, 255, 255)
  );

  // Cleanup
  srcPoints.delete();
  dstPoints.delete();
  M.delete();

  return dst;
}

/**
 * Enhance document image (contrast, brightness, sharpness)
 */
function enhanceDocument(mat: any): void {
  // Convert to grayscale for better text visibility
  if (mat.channels() > 1) {
    cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);
  }

  // Apply adaptive threshold for better text contrast
  cv.adaptiveThreshold(
    mat,
    mat,
    255,
    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv.THRESH_BINARY,
    11,
    2
  );

  console.log('[DocumentScanner] Image enhanced');
}

/**
 * Convert OpenCV Mat to Blob
 */
async function matToBlob(mat: any, quality: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  cv.imshow(canvas, mat);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      'image/jpeg',
      quality / 100
    );
  });
}

/**
 * Simple edge detection without cropping (for preview)
 */
export async function detectEdges(imageBlob: Blob): Promise<Blob> {
  try {
    // Wait for OpenCV to be ready
    await waitForOpenCV();

    const imageBitmap = await createImageBitmap(imageBlob);
    const canvas = document.createElement('canvas');
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(imageBitmap, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const src = cv.matFromImageData(imageData);

    // Convert to grayscale
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // Apply Gaussian blur
    const blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    // Canny edge detection
    const edges = new cv.Mat();
    cv.Canny(blurred, edges, 50, 150);

    // Convert back to RGBA for display
    const rgba = new cv.Mat();
    cv.cvtColor(edges, rgba, cv.COLOR_GRAY2RGBA);

    // Show on canvas
    cv.imshow(canvas, rgba);

    // Cleanup
    src.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    rgba.delete();

    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create blob'))),
        'image/jpeg',
        0.98 // High quality (increased from 0.9)
      );
    });
  } catch (error) {
    console.error('[DocumentScanner] Edge detection error:', error);
    return imageBlob;
  }
}
