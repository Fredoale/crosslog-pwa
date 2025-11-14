import { useState, useRef, useEffect } from 'react';

interface OCRRegionSelectorProps {
  imageBlob: Blob;
  onRegionSelected: (x: number, y: number, width: number, height: number) => void;
  onCancel: () => void;
}

interface RegionArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function OCRRegionSelector({ imageBlob, onRegionSelected, onCancel }: OCRRegionSelectorProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [region, setRegion] = useState<RegionArea | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load image
  useEffect(() => {
    const url = URL.createObjectURL(imageBlob);
    setImageUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageBlob]);

  // Draw image on canvas
  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw overlay with region
  useEffect(() => {
    if (!region) return;

    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear the selected region
    ctx.clearRect(region.x, region.y, region.width, region.height);

    // Draw border around region with thick green line
    ctx.strokeStyle = '#a8e063';
    ctx.lineWidth = 8;
    ctx.strokeRect(region.x, region.y, region.width, region.height);

    // Draw corner handles
    const handleSize = 20;
    ctx.fillStyle = '#a8e063';

    // Top-left
    ctx.fillRect(region.x - handleSize / 2, region.y - handleSize / 2, handleSize, handleSize);
    // Top-right
    ctx.fillRect(region.x + region.width - handleSize / 2, region.y - handleSize / 2, handleSize, handleSize);
    // Bottom-left
    ctx.fillRect(region.x - handleSize / 2, region.y + region.height - handleSize / 2, handleSize, handleSize);
    // Bottom-right
    ctx.fillRect(region.x + region.width - handleSize / 2, region.y + region.height - handleSize / 2, handleSize, handleSize);
  }, [region]);

  // Sync overlay canvas with main canvas
  useEffect(() => {
    const mainCanvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    if (!mainCanvas || !overlayCanvas) return;

    // Use double requestAnimationFrame for better reliability
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const rect = mainCanvas.getBoundingClientRect();

        // Set overlay canvas dimensions to match main canvas
        overlayCanvas.width = mainCanvas.width;
        overlayCanvas.height = mainCanvas.height;

        // Position overlay canvas exactly over main canvas
        const parent = mainCanvas.parentElement;
        if (parent) {
          const parentRect = parent.getBoundingClientRect();
          const offsetX = rect.left - parentRect.left;
          const offsetY = rect.top - parentRect.top;

          overlayCanvas.style.left = `${offsetX}px`;
          overlayCanvas.style.top = `${offsetY}px`;
          overlayCanvas.style.width = `${rect.width}px`;
          overlayCanvas.style.height = `${rect.height}px`;

          console.log('[OCRRegionSelector] Overlay canvas synced:', {
            internal: { width: overlayCanvas.width, height: overlayCanvas.height },
            visual: { width: rect.width, height: rect.height },
            position: { left: overlayCanvas.style.left, top: overlayCanvas.style.top }
          });
        }
      });
    });
  }, [imageUrl]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDragging(true);
    setDragStart({ x, y });
    setRegion({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    const width = currentX - dragStart.x;
    const height = currentY - dragStart.y;

    setRegion({
      x: width < 0 ? currentX : dragStart.x,
      y: height < 0 ? currentY : dragStart.y,
      width: Math.abs(width),
      height: Math.abs(height),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleConfirm = () => {
    if (!region || region.width < 10 || region.height < 10) {
      alert('Selecciona un área más grande sobre el número del remito');
      return;
    }

    onRegionSelected(region.x, region.y, region.width, region.height);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#1a2332' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <button
          onClick={onCancel}
          className="text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/10"
        >
          Cancelar
        </button>
        <h2 className="text-white text-lg font-bold">Detectar Número</h2>
        <button
          onClick={handleConfirm}
          disabled={!region || region.width < 10}
          className="text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-50"
          style={{ backgroundColor: '#a8e063', color: '#1a2332' }}
        >
          Detectar
        </button>
      </div>

      {/* Instructions */}
      <div className="px-4 py-3 bg-blue-600 text-white">
        <p className="text-sm font-semibold text-center">
          📍 Dibuja un rectángulo sobre el número del remito
        </p>
      </div>

      {/* Image Preview */}
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
            ref={canvasRef}
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain'
            }}
          />
          {/* Overlay Canvas */}
          <canvas
            ref={overlayCanvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              const canvas = canvasRef.current;
              if (!canvas) return;

              const rect = canvas.getBoundingClientRect();
              const scaleX = canvas.width / rect.width;
              const scaleY = canvas.height / rect.height;

              const x = (touch.clientX - rect.left) * scaleX;
              const y = (touch.clientY - rect.top) * scaleY;

              console.log('[OCRRegionSelector] Touch start:', { x, y, scaleX, scaleY });

              setIsDragging(true);
              setDragStart({ x, y });
              setRegion({ x, y, width: 0, height: 0 });
            }}
            onTouchMove={(e) => {
              if (!isDragging || !dragStart) return;

              const touch = e.touches[0];
              const canvas = canvasRef.current;
              if (!canvas) return;

              const rect = canvas.getBoundingClientRect();
              const scaleX = canvas.width / rect.width;
              const scaleY = canvas.height / rect.height;

              const currentX = (touch.clientX - rect.left) * scaleX;
              const currentY = (touch.clientY - rect.top) * scaleY;

              const width = currentX - dragStart.x;
              const height = currentY - dragStart.y;

              setRegion({
                x: width < 0 ? currentX : dragStart.x,
                y: height < 0 ? currentY : dragStart.y,
                width: Math.abs(width),
                height: Math.abs(height),
              });
            }}
            onTouchEnd={handleMouseUp}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              cursor: 'crosshair',
              touchAction: 'none',
              zIndex: 10
            }}
          />
        </div>
      </div>

      {/* Help Text */}
      <div className="p-4 border-t border-white/10 bg-gradient-to-t from-black/30">
        <p className="text-white text-sm text-center">
          💡 Selecciona solo el área donde está el número para una detección más rápida y precisa
        </p>
      </div>
    </div>
  );
}
