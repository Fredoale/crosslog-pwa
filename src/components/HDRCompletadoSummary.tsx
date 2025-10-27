import type { Entrega } from '../types';

interface HDRCompletadoSummaryProps {
  hdr: string;
  chofer: string;
  fechaViaje?: string;
  entregas: Entrega[];
  onNuevoHDR: () => void;
  onContinuarHDR?: () => void;
  hayPendientes?: boolean;
}

export function HDRCompletadoSummary({
  hdr,
  chofer,
  fechaViaje,
  entregas,
  onNuevoHDR,
  onContinuarHDR,
  hayPendientes = false,
}: HDRCompletadoSummaryProps) {
  // Calculate totals
  const totalEntregas = entregas.length;
  const totalRemitos = entregas.reduce((sum, e) => {
    if (e.numeroRemito) {
      return sum + e.numeroRemito.split(',').length;
    }
    return sum;
  }, 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header className="shadow-lg" style={{
        background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)'
      }}>
        <div className="px-4 py-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4" style={{ backgroundColor: '#a8e063' }}>
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">HDR {hdr}</h1>
            <p className="text-lg font-semibold mb-1" style={{ color: '#a8e063' }}>
              {hayPendientes ? 'HDR Iniciada - En Progreso' : 'HDR COMPLETADA'}
            </p>

            {fechaViaje && (
              <p className="text-sm text-gray-300">Fecha: {fechaViaje}</p>
            )}
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Summary Stats Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Resumen del HDR</h2>

          <div className="space-y-3">
            {/* Chofer */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <div>
                <p className="text-xs text-gray-600 font-semibold">Chofer</p>
                <p className="text-sm font-bold text-gray-900">{chofer}</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-white rounded-lg border-2" style={{ borderColor: '#a8e063' }}>
                <p className="text-3xl font-bold" style={{ color: '#a8e063' }}>{totalEntregas}</p>
                <p className="text-xs font-semibold" style={{ color: '#2d3e50' }}>Entregas</p>
              </div>
              <div className="p-4 bg-white rounded-lg border-2" style={{ borderColor: '#a8e063' }}>
                <p className="text-3xl font-bold" style={{ color: '#a8e063' }}>{totalRemitos}</p>
                <p className="text-xs font-semibold" style={{ color: '#2d3e50' }}>Remitos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Entregas Detail Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Detalle de Entregas</h2>

          <div className="space-y-4">
            {entregas.map((entrega) => {
              const remitos = entrega.numeroRemito ? entrega.numeroRemito.split(',').map(r => r.trim()) : [];
              const pdfUrls = entrega.pdfUrls || [];

              console.log('[HDRCompletadoSummary] Entrega completa:', {
                id: entrega.id,
                numeroRemito: entrega.numeroRemito,
                pdfUrls: entrega.pdfUrls,
                remitos
              });

              return (
                <div
                  key={entrega.id}
                  className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border-2 border-gray-300"
                >
                  {/* Entrega Header */}
                  <div className="mb-3">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      Entrega N° {entrega.numeroEntrega}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm font-semibold text-green-700">Completado</span>
                    </div>
                  </div>

                  {/* Cliente/Destino */}
                  {entrega.detalleEntregas ? (
                    <div className="mb-3 p-3 bg-blue-100 rounded-lg border-2 border-blue-300">
                      <p className="text-xs font-bold text-blue-700 mb-1">📍 DESTINO:</p>
                      <p className="text-sm font-medium text-blue-900 leading-relaxed">
                        {entrega.detalleEntregas}
                      </p>
                    </div>
                  ) : (
                    <div className="mb-3 p-3 bg-gray-100 rounded-lg border-2 border-gray-300">
                      <p className="text-xs font-bold text-gray-700 mb-1">📦 CLIENTE:</p>
                      <p className="text-sm font-medium text-gray-900">
                        {entrega.clienteNombreCompleto || entrega.cliente}
                      </p>
                    </div>
                  )}

                  {/* Remitos y PDFs */}
                  {remitos.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-700">
                        Remitos ({remitos.length}):
                      </p>
                      {remitos.map((remito, idx) => {
                        const pdfUrl = pdfUrls[idx];
                        console.log('[HDRCompletadoSummary] PDF URL for remito', remito, ':', pdfUrl);

                        // Ensure pdfUrl is a valid URL starting with http
                        const isValidUrl = pdfUrl && (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://'));

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border-2 border-green-300"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-bold text-gray-900">Remito: {remito}</p>
                            </div>
                            {isValidUrl ? (
                              <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg hover:opacity-90 active:opacity-75 transition-opacity"
                                style={{ backgroundColor: '#a8e063' }}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                                Ver PDF
                              </a>
                            ) : (
                              <span className="text-xs text-red-600">URL inválida</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Receptor - Only show if it's not a URL */}
                  {entrega.nombreReceptor && !entrega.nombreReceptor.startsWith('http') && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded-lg border border-yellow-300">
                      <p className="text-xs text-yellow-900">
                        <span className="font-semibold">✍️ Recibió:</span> {entrega.nombreReceptor}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2" style={{ borderColor: '#a8e063' }}>
          {hayPendientes ? (
            <div className="space-y-3">
              <button
                onClick={onContinuarHDR}
                className="w-full py-4 px-6 text-white text-lg font-bold rounded-lg shadow-md hover:opacity-90 active:opacity-75 transition-opacity"
                style={{ backgroundColor: '#a8e063' }}
              >
                Continuar con HDR
              </button>
              <button
                onClick={onNuevoHDR}
                className="w-full py-4 px-6 text-white text-lg font-bold rounded-lg shadow-md hover:opacity-90 active:opacity-75 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}
              >
                Iniciar Nuevo HDR
              </button>
              <p className="text-xs text-center" style={{ color: '#2d3e50' }}>
                Hay entregas pendientes. Puedes continuar o iniciar un nuevo HDR.
              </p>
            </div>
          ) : (
            <>
              <button
                onClick={onNuevoHDR}
                className="w-full py-4 px-6 text-white text-lg font-bold rounded-lg shadow-md hover:opacity-90 active:opacity-75 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}
              >
                Iniciar Nuevo HDR
              </button>
              <p className="text-xs text-center mt-3" style={{ color: '#2d3e50' }}>
                Los datos de este HDR están guardados y sincronizados
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
