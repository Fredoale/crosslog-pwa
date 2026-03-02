import { useState, useEffect } from 'react';

interface BienvenidaViajeModalProps {
  chofer: string;
  unidad: string;
  patente: string;
  sector: 'vrac' | 'distribucion' | 'vital_aire';
  hdr?: string;
  onDismiss: () => void;
}

const SECTOR_CONFIG = {
  vrac: {
    gradient: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)',
    label: 'VRAC',
  },
  distribucion: {
    gradient: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)',
    label: 'DISTRIBUCIÓN',
  },
  vital_aire: {
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    label: 'VITAL AIRE',
  },
};

const COUNTDOWN_SECONDS = 8;

export function BienvenidaViajeModal({
  chofer,
  unidad,
  patente,
  sector,
  hdr,
  onDismiss,
}: BienvenidaViajeModalProps) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const config = SECTOR_CONFIG[sector];
  const primerNombre = chofer.split(' ')[0];

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = ((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #1a2e35 0%, #0f1e24 100%)'
    }}>
      <div className="max-w-md w-full">
        {/* Card principal */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header con gradiente del sector */}
          <div className="p-8 text-center" style={{ background: config.gradient }}>
            <div className="text-7xl mb-3">🚀</div>
            <h1 className="text-2xl font-bold text-white">
              ¡Buen viaje, {primerNombre}!
            </h1>
            <p className="text-white/80 text-sm mt-1 font-medium">
              {config.label} · INT-{unidad} · {patente}
            </p>
            {hdr && (
              <div className="mt-2 inline-block bg-white/20 rounded-full px-3 py-1">
                <p className="text-white text-xs font-bold">HDR: {hdr}</p>
              </div>
            )}
          </div>

          {/* Cuerpo */}
          <div className="p-6 space-y-4">
            {/* GPS activo */}
            <div className="flex items-center gap-3 bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              <div>
                <p className="text-green-800 font-bold text-sm">GPS activado</p>
                <p className="text-green-700 text-xs">Tu ubicación se comparte con supervisión</p>
              </div>
            </div>

            {/* Recordatorio vial */}
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <p className="text-amber-800 font-bold text-sm mb-2">⚠️ Recordatorio de seguridad vial</p>
              <ul className="space-y-1">
                <li className="text-amber-700 text-xs flex items-center gap-2">
                  <span>🚗</span> Respetá los límites de velocidad
                </li>
                <li className="text-amber-700 text-xs flex items-center gap-2">
                  <span>🪑</span> Usá el cinturón de seguridad
                </li>
                <li className="text-amber-700 text-xs flex items-center gap-2">
                  <span>📵</span> Evitá el celular al conducir
                </li>
              </ul>
            </div>

            {/* Barra de progreso countdown */}
            <div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${progress}%`,
                    background: config.gradient,
                  }}
                />
              </div>
              <p className="text-center text-gray-400 text-xs mt-1">
                Cerrando en {countdown}s...
              </p>
            </div>

            {/* Botón */}
            <button
              onClick={onDismiss}
              className="w-full py-4 px-6 text-white text-lg font-bold rounded-xl shadow-lg transition-all active:scale-95"
              style={{ background: config.gradient }}
            >
              Comenzar ruta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
