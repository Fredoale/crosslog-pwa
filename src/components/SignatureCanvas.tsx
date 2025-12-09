import { useRef, useState, useEffect } from 'react';

interface SignatureCanvasProps {
  onSave: (signature: { dataUrl: string; nombreReceptor: string; timestamp: number }) => void;
  onCancel: () => void;
}

export function SignatureCanvas({ onSave, onCancel }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [nombreReceptor, setNombreReceptor] = useState('');
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Setup drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setIsEmpty(false);

    const point = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const point = getPoint(e);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (isEmpty) {
      alert('Por favor, agregue su firma');
      return;
    }

    if (!nombreReceptor.trim()) {
      alert('Por favor, ingrese el nombre del receptor');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    onSave({ dataUrl, nombreReceptor: nombreReceptor.trim(), timestamp: Date.now() });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b-2 border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">✍️ Firma del Receptor</h2>
          <p className="text-sm text-gray-600 mt-1">
            Firme en el recuadro usando su dedo o stylus
          </p>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Nombre del Receptor */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre del Receptor *
            </label>
            <input
              type="text"
              value={nombreReceptor}
              onChange={(e) => setNombreReceptor(e.target.value)}
              className="field-input w-full"
              placeholder="Ej: Juan Pérez"
              autoComplete="name"
            />
          </div>

          {/* Canvas Area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Firma *
              </label>
              <button
                onClick={clearCanvas}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                🗑️ Limpiar
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 relative">
              <canvas
                ref={canvasRef}
                className="w-full h-64 cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {isEmpty && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-gray-400 text-center">
                    Toque y arrastre para firmar
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              ℹ️ Esta firma será agregada como última página en cada PDF generado
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-gray-200 flex gap-3">
          <button
            onClick={onCancel}
            className="btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isEmpty || !nombreReceptor.trim()}
            className="btn-primary flex-1"
          >
            Guardar Firma
          </button>
        </div>
      </div>
    </div>
  );
}
