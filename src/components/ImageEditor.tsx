import { useState, useRef, useEffect } from 'react';
import { applyCustomFilter } from '../utils/customFilter';

interface ImageEditorProps {
  imageBlob: Blob;
  onSave: (editedBlob: Blob) => void;
  onCancel: () => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

type HandleType =
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  | 'top' | 'bottom' | 'left' | 'right'
  | null;

export function ImageEditor({ imageBlob, onSave, onCancel }: ImageEditorProps) {
  const [rotation, setRotation] = useState(0);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [baseImageUrl, setBaseImageUrl] = useState<string>(''); // Original or cropped base
  const [processing, setProcessing] = useState(false);
  const [applyingFilter, setApplyingFilter] = useState(false);
  const [cropMode, setCropMode] = useState(true); // Start with crop mode ENABLED by default
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragHandle, setDragHandle] = useState<HandleType>(null);
  const [initialCropArea, setInitialCropArea] = useState<CropArea | null>(null);
  // Reserved for future use: canvasRef
  // const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load image
  useEffect(() => {
    const url = URL.createObjectURL(imageBlob);
    setImageUrl(url);
    setBaseImageUrl(url); // Set as base for filters

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageBlob]);

  // Update preview whenever settings change
  useEffect(() => {
    if (baseImageUrl) {
      updatePreview();
    }
  }, [baseImageUrl, rotation]);

  const updatePreview = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Calculate dimensions based on rotation
      const isRotated = rotation % 180 !== 0;
      const width = isRotated ? img.height : img.width;
      const height = isRotated ? img.width : img.height;

      canvas.width = width;
      canvas.height = height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Apply rotation
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-img.width / 2, -img.height / 2);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    };
    img.src = baseImageUrl; // Use base image (original or cropped)
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleToggleCrop = () => {
    setCropMode(!cropMode);
    setCropArea(null);
  };

  // Detect which handle (if any) the user clicked on
  const getHandleAtPosition = (x: number, y: number, area: CropArea): HandleType => {
    const handleSize = 40; // Increased for easier touch interaction
    const edgeThreshold = 25; // Increased pixels from edge to detect edge drag

    // Check corners first (higher priority)
    if (Math.abs(x - area.x) < handleSize && Math.abs(y - area.y) < handleSize) {
      return 'top-left';
    }
    if (Math.abs(x - (area.x + area.width)) < handleSize && Math.abs(y - area.y) < handleSize) {
      return 'top-right';
    }
    if (Math.abs(x - area.x) < handleSize && Math.abs(y - (area.y + area.height)) < handleSize) {
      return 'bottom-left';
    }
    if (Math.abs(x - (area.x + area.width)) < handleSize && Math.abs(y - (area.y + area.height)) < handleSize) {
      return 'bottom-right';
    }

    // Check edges
    // Top edge
    if (Math.abs(y - area.y) < edgeThreshold && x > area.x && x < area.x + area.width) {
      return 'top';
    }
    // Bottom edge
    if (Math.abs(y - (area.y + area.height)) < edgeThreshold && x > area.x && x < area.x + area.width) {
      return 'bottom';
    }
    // Left edge
    if (Math.abs(x - area.x) < edgeThreshold && y > area.y && y < area.y + area.height) {
      return 'left';
    }
    // Right edge
    if (Math.abs(x - (area.x + area.width)) < edgeThreshold && y > area.y && y < area.y + area.height) {
      return 'right';
    }

    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropMode) return;

    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;

    const rect = previewCanvas.getBoundingClientRect();

    // Calculate position relative to preview canvas visual bounds
    const visualX = e.clientX - rect.left;
    const visualY = e.clientY - rect.top;

    // Convert visual coordinates to internal canvas coordinates
    const scaleX = previewCanvas.width / rect.width;
    const scaleY = previewCanvas.height / rect.height;

    const x = visualX * scaleX;
    const y = visualY * scaleY;

    console.log('[ImageEditor] Mouse down:', { visualX, visualY, x, y, scaleX, scaleY });

    // Check if clicking on existing crop area handle
    if (cropArea && cropArea.width > 0 && cropArea.height > 0) {
      const handle = getHandleAtPosition(x, y, cropArea);
      if (handle) {
        console.log('[ImageEditor] Dragging handle:', handle);
        setDragHandle(handle);
        setIsDragging(true);
        setDragStart({ x, y });
        setInitialCropArea({ ...cropArea });
        return;
      }
    }

    // Start new crop area
    setIsDragging(true);
    setDragStart({ x, y });
    setDragHandle(null);
    setInitialCropArea(null);
    setCropArea({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropMode || !isDragging || !dragStart) return;

    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;

    const rect = previewCanvas.getBoundingClientRect();

    // Calculate position relative to preview canvas visual bounds
    const visualX = e.clientX - rect.left;
    const visualY = e.clientY - rect.top;

    // Convert visual coordinates to internal canvas coordinates
    const scaleX = previewCanvas.width / rect.width;
    const scaleY = previewCanvas.height / rect.height;

    const currentX = visualX * scaleX;
    const currentY = visualY * scaleY;

    // If adjusting existing crop area via handle
    if (dragHandle && initialCropArea) {
      const deltaX = currentX - dragStart.x;
      const deltaY = currentY - dragStart.y;

      let newArea = { ...initialCropArea };

      // Adjust based on which handle is being dragged
      switch (dragHandle) {
        case 'top-left':
          newArea.x = initialCropArea.x + deltaX;
          newArea.y = initialCropArea.y + deltaY;
          newArea.width = initialCropArea.width - deltaX;
          newArea.height = initialCropArea.height - deltaY;
          break;
        case 'top-right':
          newArea.y = initialCropArea.y + deltaY;
          newArea.width = initialCropArea.width + deltaX;
          newArea.height = initialCropArea.height - deltaY;
          break;
        case 'bottom-left':
          newArea.x = initialCropArea.x + deltaX;
          newArea.width = initialCropArea.width - deltaX;
          newArea.height = initialCropArea.height + deltaY;
          break;
        case 'bottom-right':
          newArea.width = initialCropArea.width + deltaX;
          newArea.height = initialCropArea.height + deltaY;
          break;
        case 'top':
          newArea.y = initialCropArea.y + deltaY;
          newArea.height = initialCropArea.height - deltaY;
          break;
        case 'bottom':
          newArea.height = initialCropArea.height + deltaY;
          break;
        case 'left':
          newArea.x = initialCropArea.x + deltaX;
          newArea.width = initialCropArea.width - deltaX;
          break;
        case 'right':
          newArea.width = initialCropArea.width + deltaX;
          break;
      }

      // Ensure minimum size
      if (newArea.width < 10) {
        newArea.width = 10;
        newArea.x = initialCropArea.x;
      }
      if (newArea.height < 10) {
        newArea.height = 10;
        newArea.y = initialCropArea.y;
      }

      setCropArea(newArea);
    } else {
      // Creating new crop area
      const width = currentX - dragStart.x;
      const height = currentY - dragStart.y;

      setCropArea({
        x: width < 0 ? currentX : dragStart.x,
        y: height < 0 ? currentY : dragStart.y,
        width: Math.abs(width),
        height: Math.abs(height),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
    setDragHandle(null);
    setInitialCropArea(null);
  };

  const handleApplyCrop = async () => {
    if (!cropArea || cropArea.width < 10 || cropArea.height < 10) {
      alert('Selecciona un área más grande para recortar');
      return;
    }

    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log('[ImageEditor] Applying crop:', cropArea);
    console.log('[ImageEditor] Canvas dimensions:', { width: canvas.width, height: canvas.height });

    // Ensure coordinates are within bounds
    const x = Math.max(0, Math.min(cropArea.x, canvas.width));
    const y = Math.max(0, Math.min(cropArea.y, canvas.height));
    const width = Math.min(cropArea.width, canvas.width - x);
    const height = Math.min(cropArea.height, canvas.height - y);

    console.log('[ImageEditor] Adjusted crop:', { x, y, width, height });

    try {
      // Get the cropped image data
      const croppedData = ctx.getImageData(
        Math.floor(x),
        Math.floor(y),
        Math.floor(width),
        Math.floor(height)
      );

      console.log('[ImageEditor] Cropped data size:', { width: croppedData.width, height: croppedData.height });

      // Create new canvas for cropped image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = croppedData.width;
      tempCanvas.height = croppedData.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // Draw cropped image
      tempCtx.putImageData(croppedData, 0, 0);

      // Convert to blob with high quality
      const blob = await new Promise<Blob>((resolve, reject) => {
        tempCanvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to create blob'));
          },
          'image/jpeg',
          0.98 // High quality
        );
      });

      // Revoke old base URL if it's not the original
      if (baseImageUrl && baseImageUrl !== imageUrl) {
        URL.revokeObjectURL(baseImageUrl);
      }

      // Create new URL for cropped image and set as base
      const newUrl = URL.createObjectURL(blob);
      setBaseImageUrl(newUrl);

      console.log('[ImageEditor] Crop applied successfully, new base image set');

      // Reset rotation after crop
      setRotation(0);

      // Exit crop mode
      setCropMode(false);
      setCropArea(null);
    } catch (error) {
      console.error('[ImageEditor] Error applying crop:', error);
      alert('Error al aplicar el recorte. Intenta con un área más grande.');
    }
  };

  const handleApplyCustomFilter = async () => {
    if (!baseImageUrl) return;

    setApplyingFilter(true);

    try {
      console.log('[ImageEditor] Applying custom filter...');

      // Get current preview as blob
      const canvas = previewCanvasRef.current;
      if (!canvas) {
        throw new Error('Canvas not found');
      }

      const currentBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to create blob'));
          },
          'image/jpeg',
          0.98
        );
      });

      // Apply custom filter with specified parameters
      const enhancedBlob = await applyCustomFilter(currentBlob, {
        brillantez: 30,
        ligereza: 40,
        contraste: 80,
        claridad: 30,
        nitidez: 10,
        textura: 60,
        resaltar: -5,
        sombra: 13
      });

      // Revoke old base URL if it's not the original
      if (baseImageUrl && baseImageUrl !== imageUrl) {
        URL.revokeObjectURL(baseImageUrl);
      }

      // Set enhanced image as new base
      const newUrl = URL.createObjectURL(enhancedBlob);
      setBaseImageUrl(newUrl);

      console.log('[ImageEditor] ✓ Custom filter applied successfully');
    } catch (error) {
      console.error('[ImageEditor] Error applying custom filter:', error);
      alert('Error al aplicar el filtro. Intenta de nuevo.');
    } finally {
      setApplyingFilter(false);
    }
  };

  // Draw crop overlay
  useEffect(() => {
    if (!cropMode || !cropArea) return;

    const canvas = cropCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear the crop area
    ctx.clearRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    // Draw border around crop area with thicker, more visible line
    ctx.strokeStyle = '#a8e063';
    ctx.lineWidth = 16; // Increased to 16 for better visibility
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    // Draw handles - larger and more visible for easier touch interaction
    const cornerThickness = 8; // Thickness for L-shaped corners
    const cornerLength = 35; // Length of each arm of the L
    const edgeHandleLength = 60; // Increased from 40 to 60
    const edgeHandleThickness = 10; // Increased from 6 to 10
    ctx.fillStyle = '#a8e063';

    // Corner handles - L-shaped for better visibility and grip
    // Top-left corner (L shape)
    ctx.fillRect(cropArea.x - cornerThickness / 2, cropArea.y - cornerThickness / 2, cornerLength, cornerThickness); // Horizontal
    ctx.fillRect(cropArea.x - cornerThickness / 2, cropArea.y - cornerThickness / 2, cornerThickness, cornerLength); // Vertical

    // Top-right corner (L shape)
    ctx.fillRect(cropArea.x + cropArea.width - cornerLength + cornerThickness / 2, cropArea.y - cornerThickness / 2, cornerLength, cornerThickness); // Horizontal
    ctx.fillRect(cropArea.x + cropArea.width - cornerThickness / 2, cropArea.y - cornerThickness / 2, cornerThickness, cornerLength); // Vertical

    // Bottom-left corner (L shape)
    ctx.fillRect(cropArea.x - cornerThickness / 2, cropArea.y + cropArea.height - cornerThickness / 2, cornerLength, cornerThickness); // Horizontal
    ctx.fillRect(cropArea.x - cornerThickness / 2, cropArea.y + cropArea.height - cornerLength + cornerThickness / 2, cornerThickness, cornerLength); // Vertical

    // Bottom-right corner (L shape)
    ctx.fillRect(cropArea.x + cropArea.width - cornerLength + cornerThickness / 2, cropArea.y + cropArea.height - cornerThickness / 2, cornerLength, cornerThickness); // Horizontal
    ctx.fillRect(cropArea.x + cropArea.width - cornerThickness / 2, cropArea.y + cropArea.height - cornerLength + cornerThickness / 2, cornerThickness, cornerLength); // Vertical

    // Edge handles (linear adjustment indicators) - bars with circular grips
    const circleRadius = 12; // Circle in the middle for better grip visualization

    // Top edge handle (centered)
    ctx.fillRect(
      cropArea.x + cropArea.width / 2 - edgeHandleLength / 2,
      cropArea.y - edgeHandleThickness / 2,
      edgeHandleLength,
      edgeHandleThickness
    );
    ctx.beginPath();
    ctx.arc(cropArea.x + cropArea.width / 2, cropArea.y, circleRadius, 0, 2 * Math.PI);
    ctx.fill();

    // Bottom edge handle (centered)
    ctx.fillRect(
      cropArea.x + cropArea.width / 2 - edgeHandleLength / 2,
      cropArea.y + cropArea.height - edgeHandleThickness / 2,
      edgeHandleLength,
      edgeHandleThickness
    );
    ctx.beginPath();
    ctx.arc(cropArea.x + cropArea.width / 2, cropArea.y + cropArea.height, circleRadius, 0, 2 * Math.PI);
    ctx.fill();

    // Left edge handle (centered)
    ctx.fillRect(
      cropArea.x - edgeHandleThickness / 2,
      cropArea.y + cropArea.height / 2 - edgeHandleLength / 2,
      edgeHandleThickness,
      edgeHandleLength
    );
    ctx.beginPath();
    ctx.arc(cropArea.x, cropArea.y + cropArea.height / 2, circleRadius, 0, 2 * Math.PI);
    ctx.fill();

    // Right edge handle (centered)
    ctx.fillRect(
      cropArea.x + cropArea.width - edgeHandleThickness / 2,
      cropArea.y + cropArea.height / 2 - edgeHandleLength / 2,
      edgeHandleThickness,
      edgeHandleLength
    );
    ctx.beginPath();
    ctx.arc(cropArea.x + cropArea.width, cropArea.y + cropArea.height / 2, circleRadius, 0, 2 * Math.PI);
    ctx.fill();
  }, [cropMode, cropArea]);

  // Sync crop canvas with preview canvas
  useEffect(() => {
    if (!cropMode) return;

    const previewCanvas = previewCanvasRef.current;
    const cropCanvas = cropCanvasRef.current;

    if (!previewCanvas || !cropCanvas) return;

    // Wait for next frame to ensure preview canvas is rendered
    requestAnimationFrame(() => {
      const rect = previewCanvas.getBoundingClientRect();

      // Set crop canvas internal dimensions to match preview canvas
      cropCanvas.width = previewCanvas.width;
      cropCanvas.height = previewCanvas.height;

      // Position crop canvas exactly over preview canvas
      const previewParent = previewCanvas.parentElement;
      if (previewParent) {
        const parentRect = previewParent.getBoundingClientRect();
        const offsetX = rect.left - parentRect.left;
        const offsetY = rect.top - parentRect.top;

        cropCanvas.style.left = `${offsetX}px`;
        cropCanvas.style.top = `${offsetY}px`;
        cropCanvas.style.width = `${rect.width}px`;
        cropCanvas.style.height = `${rect.height}px`;
      }

      console.log('[ImageEditor] Crop canvas synced:', {
        internal: { width: cropCanvas.width, height: cropCanvas.height },
        visual: { width: rect.width, height: rect.height },
        position: { left: cropCanvas.style.left, top: cropCanvas.style.top }
      });
    });
  }, [cropMode, baseImageUrl, rotation]); // Changed from imageUrl to baseImageUrl

  const handleUndoCrop = () => {
    // Revoke old base URL if it's not the original
    if (baseImageUrl && baseImageUrl !== imageUrl) {
      URL.revokeObjectURL(baseImageUrl);
    }

    // Reset to original image
    setBaseImageUrl(imageUrl);
    setRotation(0);
    setCropMode(false);
    setCropArea(null);
    console.log('[ImageEditor] Crop undone, image reset to original');
  };

  const handleSave = async () => {
    setProcessing(true);

    try {
      // If in crop mode with a pending crop, apply it first
      if (cropMode && cropArea && cropArea.width >= 10 && cropArea.height >= 10) {
        console.log('[ImageEditor] Auto-applying pending crop before save...');
        await handleApplyCrop();

        // Wait a bit for the crop to be applied
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const canvas = previewCanvasRef.current;
      if (!canvas) throw new Error('Canvas not found');

      // Convert canvas to blob with high quality
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to create blob'));
          },
          'image/jpeg',
          0.98 // High quality (increased from 0.92)
        );
      });

      console.log('[ImageEditor] Saved with high quality (0.98)');
      onSave(blob);
    } catch (error) {
      console.error('[ImageEditor] Error saving:', error);
      alert('Error al guardar la imagen editada');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#1a2332' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <button
          onClick={onCancel}
          disabled={processing}
          className="text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/10 disabled:opacity-50"
        >
          Cancelar
        </button>
        <h2 className="text-white text-lg font-bold">Editar Imagen</h2>
        <button
          onClick={handleSave}
          disabled={processing}
          className="text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-50"
          style={{ backgroundColor: '#a8e063', color: '#1a2332' }}
        >
          {processing ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-hidden p-4 flex items-center justify-center" style={{ position: 'relative', minHeight: 0 }}>
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0
        }}>
          <canvas
            ref={previewCanvasRef}
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain'
            }}
          />
          {/* Crop Overlay Canvas */}
          {cropMode && (
            <canvas
              ref={cropCanvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={(e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const previewCanvas = previewCanvasRef.current;
                if (!previewCanvas) return;

                const rect = previewCanvas.getBoundingClientRect();
                const visualX = touch.clientX - rect.left;
                const visualY = touch.clientY - rect.top;

                const scaleX = previewCanvas.width / rect.width;
                const scaleY = previewCanvas.height / rect.height;

                const x = visualX * scaleX;
                const y = visualY * scaleY;

                // Check if touching existing crop area handle
                if (cropArea && cropArea.width > 0 && cropArea.height > 0) {
                  const handle = getHandleAtPosition(x, y, cropArea);
                  if (handle) {
                    console.log('[ImageEditor] Touching handle:', handle);
                    setDragHandle(handle);
                    setIsDragging(true);
                    setDragStart({ x, y });
                    setInitialCropArea({ ...cropArea });
                    return;
                  }
                }

                // Start new crop area
                setIsDragging(true);
                setDragStart({ x, y });
                setDragHandle(null);
                setInitialCropArea(null);
                setCropArea({ x, y, width: 0, height: 0 });
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                if (!isDragging || !dragStart) return;

                const touch = e.touches[0];
                const previewCanvas = previewCanvasRef.current;
                if (!previewCanvas) return;

                const rect = previewCanvas.getBoundingClientRect();
                const visualX = touch.clientX - rect.left;
                const visualY = touch.clientY - rect.top;

                const scaleX = previewCanvas.width / rect.width;
                const scaleY = previewCanvas.height / rect.height;

                const currentX = visualX * scaleX;
                const currentY = visualY * scaleY;

                // If adjusting existing crop area via handle
                if (dragHandle && initialCropArea) {
                  const deltaX = currentX - dragStart.x;
                  const deltaY = currentY - dragStart.y;

                  let newArea = { ...initialCropArea };

                  // Adjust based on which handle is being dragged
                  switch (dragHandle) {
                    case 'top-left':
                      newArea.x = initialCropArea.x + deltaX;
                      newArea.y = initialCropArea.y + deltaY;
                      newArea.width = initialCropArea.width - deltaX;
                      newArea.height = initialCropArea.height - deltaY;
                      break;
                    case 'top-right':
                      newArea.y = initialCropArea.y + deltaY;
                      newArea.width = initialCropArea.width + deltaX;
                      newArea.height = initialCropArea.height - deltaY;
                      break;
                    case 'bottom-left':
                      newArea.x = initialCropArea.x + deltaX;
                      newArea.width = initialCropArea.width - deltaX;
                      newArea.height = initialCropArea.height + deltaY;
                      break;
                    case 'bottom-right':
                      newArea.width = initialCropArea.width + deltaX;
                      newArea.height = initialCropArea.height + deltaY;
                      break;
                    case 'top':
                      newArea.y = initialCropArea.y + deltaY;
                      newArea.height = initialCropArea.height - deltaY;
                      break;
                    case 'bottom':
                      newArea.height = initialCropArea.height + deltaY;
                      break;
                    case 'left':
                      newArea.x = initialCropArea.x + deltaX;
                      newArea.width = initialCropArea.width - deltaX;
                      break;
                    case 'right':
                      newArea.width = initialCropArea.width + deltaX;
                      break;
                  }

                  // Ensure minimum size
                  if (newArea.width < 10) {
                    newArea.width = 10;
                    newArea.x = initialCropArea.x;
                  }
                  if (newArea.height < 10) {
                    newArea.height = 10;
                    newArea.y = initialCropArea.y;
                  }

                  setCropArea(newArea);
                } else {
                  // Creating new crop area
                  const width = currentX - dragStart.x;
                  const height = currentY - dragStart.y;

                  setCropArea({
                    x: width < 0 ? currentX : dragStart.x,
                    y: height < 0 ? currentY : dragStart.y,
                    width: Math.abs(width),
                    height: Math.abs(height),
                  });
                }
              }}
              onTouchEnd={handleMouseUp}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                cursor: 'crosshair',
                touchAction: 'none'
              }}
            />
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-white/10 space-y-4 bg-gradient-to-t from-black/30">
        {/* Crop Mode */}
        {cropMode ? (
          <div className="space-y-3">
            <div className="text-center text-white text-sm font-medium mb-2 bg-white/10 p-3 rounded-lg">
              ✂️ Arrastra para seleccionar • Ajusta por las esquinas o bordes
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setCropMode(false);
                  setCropArea(null);
                }}
                className="px-4 py-3 rounded-lg text-white font-semibold border-2 border-white/30"
                style={{ backgroundColor: '#2d3e50' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyCrop}
                disabled={!cropArea || cropArea.width < 10}
                className="px-4 py-3 rounded-lg text-white font-bold disabled:opacity-50"
                style={{ backgroundColor: '#a8e063', color: '#1a2332' }}
              >
                Aplicar Recorte
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleRotate}
                disabled={applyingFilter}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50"
                style={{ backgroundColor: '#2d3e50' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Rotar 90°
              </button>
              <button
                onClick={handleToggleCrop}
                disabled={applyingFilter}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50"
                style={{ backgroundColor: '#2d3e50' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                </svg>
                Recortar
              </button>
            </div>

            {/* Custom Filter Button */}
            <button
              onClick={handleApplyCustomFilter}
              disabled={applyingFilter}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-bold shadow-lg disabled:opacity-50 transition-all"
              style={{
                background: applyingFilter
                  ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                  : 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)'
              }}
            >
              {applyingFilter ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Aplicando filtro...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Mejorar Documento
                </>
              )}
            </button>
          </>
        )}

        {/* Undo Crop Button - Only show if image has been modified */}
        {baseImageUrl !== imageUrl && (
          <button
            onClick={handleUndoCrop}
            disabled={applyingFilter || cropMode}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-white text-sm font-semibold border border-red-400/50 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Deshacer Cambios (Restaurar Original)
          </button>
        )}
      </div>
    </div>
  );
}
