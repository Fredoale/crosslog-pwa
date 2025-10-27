import { useState, useEffect } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useEntregasStore } from '../stores/entregasStore';
import { useGeolocation } from '../hooks/useGeolocation';
import type { Entrega, FotoCapturada } from '../types';

interface CapturaFormProps {
  entrega: Entrega;
  onBack: () => void;
  onComplete: () => void;
}

const MAX_FOTOS = 7;

export function CapturaForm({ entrega, onBack, onComplete }: CapturaFormProps) {
  const [numeroRemito, setNumeroRemito] = useState('');
  const [cliente, setCliente] = useState(entrega.cliente);
  const [estado, setEstado] = useState<'EN_REPARTO' | 'COMPLETADO'>('EN_REPARTO');
  const [fotos, setFotos] = useState<FotoCapturada[]>([]);
  const [capturando, setCapturando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { updateCaptura } = useEntregasStore();
  const { getCurrentLocation, location: geoLocation } = useGeolocation();

  // Get geolocation on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const handleTomarFoto = async () => {
    if (fotos.length >= MAX_FOTOS) {
      setError(`Máximo ${MAX_FOTOS} fotos por remito`);
      return;
    }

    setCapturando(true);
    setError(null);

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        saveToGallery: false,
        correctOrientation: true,
        width: 1920,
        height: 1080,
      });

      if (!image.base64String) {
        throw new Error('No image data received');
      }

      // Convert base64 to Blob
      const byteCharacters = atob(image.base64String);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: `image/${image.format}` });

      const nuevaFoto: FotoCapturada = {
        id: `foto-${Date.now()}`,
        blob,
        processed: false,
        thumbnail: `data:image/${image.format};base64,${image.base64String}`,
        timestamp: new Date().toISOString(),
      };

      setFotos((prev) => [...prev, nuevaFoto]);

      // Update store
      updateCaptura({ fotos: [...fotos, nuevaFoto] });
    } catch (err) {
      console.error('[CapturaForm] Camera error:', err);
      setError('Error al capturar foto. Intenta de nuevo.');
    } finally {
      setCapturando(false);
    }
  };

  const handleEliminarFoto = (fotoId: string) => {
    const nuevasFotos = fotos.filter((f) => f.id !== fotoId);
    setFotos(nuevasFotos);
    updateCaptura({ fotos: nuevasFotos });
  };

  const handleGuardar = async () => {
    setError(null);

    // Validations
    if (!numeroRemito.trim()) {
      setError('Ingresa el número de remito');
      return;
    }

    if (fotos.length === 0) {
      setError('Captura al menos una foto');
      return;
    }

    // Update store with final data
    updateCaptura({
      numeroRemito: numeroRemito.trim(),
      cliente,
      estado,
      fotos,
      geolocalizacion: geoLocation || undefined,
      timestamp: new Date().toISOString(),
    });

    // TODO: Save to IndexedDB and trigger sync
    console.log('[CapturaForm] Guardando captura:', {
      numeroRemito,
      cliente,
      estado,
      fotos: fotos.length,
      geo: geoLocation,
    });

    onComplete();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg active:bg-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Captura de Remito</h1>
            <p className="text-sm text-gray-600">Entrega N° {entrega.numeroEntrega}</p>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="p-4 space-y-4 pb-24">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Cliente */}
        <div className="card p-4 space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Cliente/Descarga
          </label>
          <input
            type="text"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            className="field-input w-full"
            placeholder="Nombre del cliente"
          />
        </div>

        {/* Número de Remito */}
        <div className="card p-4 space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Número de Remito *
          </label>
          <input
            type="tel"
            value={numeroRemito}
            onChange={(e) => setNumeroRemito(e.target.value.replace(/\D/g, ''))}
            className="field-input w-full"
            placeholder="Ej: 38269"
            inputMode="numeric"
          />
        </div>

        {/* Estado */}
        <div className="card p-4 space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Estado de la Entrega
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 active:bg-gray-100">
              <input
                type="radio"
                name="estado"
                value="EN_REPARTO"
                checked={estado === 'EN_REPARTO'}
                onChange={(e) => setEstado(e.target.value as any)}
                className="w-5 h-5 text-primary-600"
              />
              <span className="font-medium text-gray-900">En Reparto</span>
            </label>
            <label className="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 active:bg-gray-100">
              <input
                type="radio"
                name="estado"
                value="COMPLETADO"
                checked={estado === 'COMPLETADO'}
                onChange={(e) => setEstado(e.target.value as any)}
                className="w-5 h-5 text-primary-600"
              />
              <span className="font-medium text-gray-900">Completado</span>
            </label>
          </div>
        </div>

        {/* Fotos */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-700">
              Fotos del Remito *
            </label>
            <span className="text-xs text-gray-500">
              {fotos.length} / {MAX_FOTOS}
            </span>
          </div>

          {/* Photo Grid */}
          {fotos.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {fotos.map((foto) => (
                <div key={foto.id} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                  <img
                    src={foto.thumbnail}
                    alt="Foto remito"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleEliminarFoto(foto.id)}
                    className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 active:bg-red-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Camera Button */}
          <button
            onClick={handleTomarFoto}
            disabled={capturando || fotos.length >= MAX_FOTOS}
            className="btn-primary w-full"
          >
            {capturando ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Capturando...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Tomar Foto {fotos.length > 0 && `(${fotos.length})`}
              </span>
            )}
          </button>
        </div>

        {/* Geolocation Info */}
        {geoLocation && (
          <div className="card p-3 bg-green-50 border-green-200">
            <div className="flex items-center gap-2 text-green-800">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">
                Ubicación capturada (±{geoLocation.accuracy.toFixed(0)}m)
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 p-4 shadow-lg">
        <button
          onClick={handleGuardar}
          disabled={!numeroRemito || fotos.length === 0}
          className="btn-primary w-full"
        >
          Guardar y Continuar
        </button>
      </div>
    </div>
  );
}
