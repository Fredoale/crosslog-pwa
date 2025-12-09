import { useState, useEffect } from 'react';
import { useMarketplaceStore } from '../../stores/marketplaceStore';
import type { ViajeMarketplace, OfertaMarketplace, FleteroScore } from '../../utils/marketplaceApi';

interface OfertasDetailProps {
  viaje: ViajeMarketplace;
  onClose: () => void;
}

export function OfertasDetail({ viaje, onClose }: OfertasDetailProps) {
  const { ofertas, scoresCalculados, loading, cargarOfertasDeViaje } = useMarketplaceStore();
  const [fleteroSeleccionado, setFleteroSeleccionado] = useState<string | null>(null);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  useEffect(() => {
    // Cargar ofertas al montar
    cargarOfertasDeViaje(viaje.HDR_viaje);
  }, [viaje.HDR_viaje, cargarOfertasDeViaje]);

  // Extraer nombre de tarifa de las notas internas
  const extraerTarifa = () => {
    if (viaje.notas_internas) {
      const match = viaje.notas_internas.match(/Tarifario:\s*([^\|]+)/);
      return match ? match[1].trim() : 'N/A';
    }
    return 'N/A';
  };

  // Obtener el fletero recomendado (mayor score)
  const fleteroRecomendado = scoresCalculados.length > 0
    ? scoresCalculados.reduce((prev, current) =>
        (prev.score_total > current.score_total) ? prev : current
      )
    : null;

  const handleAsignar = () => {
    if (!fleteroSeleccionado) return;
    setMostrarConfirmacion(true);
  };

  const confirmarAsignacion = async () => {
    if (!fleteroSeleccionado) return;

    try {
      // Obtener la oferta del fletero seleccionado
      const ofertaSeleccionada = ofertas.find(o => o.fletero_id === fleteroSeleccionado);
      if (!ofertaSeleccionada) {
        throw new Error('Oferta no encontrada');
      }

      // Llamar a la API para asignar el viaje
      const { asignarViajeAFletero } = await import('../../utils/marketplaceApi');

      await asignarViajeAFletero(
        viaje.HDR_viaje,
        fleteroSeleccionado,
        ofertaSeleccionada.precio_ofertado,
        'crosslog_admin' // Usuario que autoriza (hardcoded por ahora)
      );

      alert(`✅ Viaje ${viaje.HDR_viaje} asignado exitosamente a ${fleteroSeleccionado}`);

      setMostrarConfirmacion(false);
      onClose();
    } catch (error) {
      console.error('Error al asignar viaje:', error);
      alert(`❌ Error al asignar viaje: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col animate-slide-up border-2 border-gray-200">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-gray-700 to-gray-800 text-white p-3 sm:p-4 rounded-t-2xl shadow-lg">
          <div className="flex justify-between items-center gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold truncate">📋 HDR: {viaje.hdr_generado || viaje.HDR_viaje}</h2>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-200 mt-1">
                <span>{viaje.cliente_nombre}</span>
                <span>•</span>
                <span>{viaje.fecha_viaje}</span>
                <span>•</span>
                <span className="font-semibold text-white uppercase">Tarifa: {extraerTarifa()}</span>
                <span>•</span>
                <span className="text-white">{viaje.tipo_carga}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 text-white rounded-lg p-2 transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center bg-white">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700"></div>
            <p className="mt-4 text-gray-600">Cargando ofertas...</p>
          </div>
        )}

        {/* No Ofertas */}
        {!loading && ofertas.length === 0 && (
          <div className="p-12 text-center bg-white">
            <p className="text-gray-600 text-lg">📭 No hay ofertas para este viaje</p>
            <p className="text-gray-500 text-sm mt-2">Los fleteros aún no han enviado propuestas</p>
          </div>
        )}

        {/* Ofertas List */}
        {!loading && ofertas.length > 0 && (
          <div className="p-3 sm:p-4 overflow-y-auto flex-1 bg-white">
            {/* Recomendación */}
            {fleteroRecomendado && (
              <div className="mb-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 rounded-xl p-3 animate-scale-in shadow-lg">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-green-500 text-white rounded-full p-1.5">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-green-700 text-sm">🏆 Recomendado</h3>
                      <p className="text-gray-700 text-xs">{fleteroRecomendado.fletero_nombre}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFleteroSeleccionado(
                      fleteroSeleccionado === fleteroRecomendado.fletero_id ? null : fleteroRecomendado.fletero_id
                    )}
                    className={`px-4 py-2 text-sm rounded-lg font-semibold transition-all ${
                      fleteroSeleccionado === fleteroRecomendado.fletero_id
                        ? 'bg-gray-700 text-white shadow-md hover:bg-gray-800'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-700'
                    }`}
                  >
                    {fleteroSeleccionado === fleteroRecomendado.fletero_id ? '✓ Seleccionado' : 'Seleccionar'}
                  </button>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-5 gap-2 bg-white rounded-lg p-2 border border-green-300">
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Score</p>
                    <p className="font-bold text-green-600 text-sm">{fleteroRecomendado.score_total.toFixed(0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Precio</p>
                    <p className="font-bold text-sm text-gray-800">{fleteroRecomendado.detalles_score.score_precio.toFixed(0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Rating</p>
                    <p className="font-bold text-sm text-gray-800">{fleteroRecomendado.detalles_score.score_rating.toFixed(0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Exp.</p>
                    <p className="font-bold text-sm text-gray-800">{fleteroRecomendado.detalles_score.score_experiencia.toFixed(0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Tiempo</p>
                    <p className="font-bold text-sm text-gray-800">{fleteroRecomendado.detalles_score.score_tiempo.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Todas las Ofertas */}
            <h3 className="font-bold text-base sm:text-lg text-gray-800 mb-2">📊 Todas las Ofertas ({ofertas.length})</h3>

            <div className="space-y-2">
              {scoresCalculados.map((score) => {
                const oferta = ofertas.find(o => o.fletero_id === score.fletero_id);
                if (!oferta) return null;

                const esRecomendado = score.fletero_id === fleteroRecomendado?.fletero_id;
                const esSeleccionado = score.fletero_id === fleteroSeleccionado;

                return (
                  <div
                    key={oferta.id_oferta}
                    className={`border-2 rounded-lg p-3 transition-all animate-fade-in ${
                      esSeleccionado
                        ? 'border-gray-700 bg-gray-50 shadow-md'
                        : esRecomendado
                        ? 'border-green-300 bg-green-50/50'
                        : 'border-gray-200 bg-white hover:shadow hover:border-gray-300'
                    }`}
                  >
                    <div className="flex gap-2">
                      {/* Info Fletero */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-sm text-gray-800 truncate">{oferta.fletero_nombre}</h4>
                          {esRecomendado && !esSeleccionado && (
                            <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                              ⭐
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                            oferta.estado === 'PENDIENTE' ? 'bg-yellow-200 text-yellow-800' :
                            oferta.estado === 'ACEPTADA' ? 'bg-green-200 text-green-800' :
                            'bg-red-200 text-red-800'
                          }`}>
                            {oferta.estado}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                          <div>
                            <p className="text-gray-500">Precio</p>
                            <p className="font-bold text-sm text-green-600">${oferta.precio_ofertado.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Score</p>
                            <p className="font-bold text-sm text-gray-700">{score.score_total.toFixed(0)}/100</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Unidad</p>
                            <p className="font-semibold text-sm text-gray-800 truncate">{oferta.unidad_ofrecida}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Patente</p>
                            <p className="font-semibold text-sm text-gray-800">{oferta.patente_unidad}</p>
                          </div>
                        </div>

                        {/* Mensaje */}
                        {oferta.mensaje_adicional && (
                          <div className="bg-gray-50 rounded p-2 mt-2 border border-gray-200">
                            <p className="text-xs text-gray-700 line-clamp-2">{oferta.mensaje_adicional}</p>
                          </div>
                        )}
                      </div>

                      {/* Botón Seleccionar */}
                      <div className="flex items-start">
                        <button
                          onClick={() => setFleteroSeleccionado(
                            esSeleccionado ? null : oferta.fletero_id
                          )}
                          className={`px-4 py-2 text-sm rounded-lg font-semibold transition-all ${
                            esSeleccionado
                              ? 'bg-gray-700 text-white shadow-md hover:bg-gray-800'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-700'
                          }`}
                        >
                          {esSeleccionado ? '✓ Seleccionado' : 'Seleccionar'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botón de Asignación */}
            {fleteroSeleccionado && (
              <div className="sticky bottom-0 mt-3 bg-white border-t-2 border-gray-200 pt-3 shadow-lg">
                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAsignar}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-bold hover:from-green-600 hover:to-green-700 transition-all shadow-md animate-scale-in"
                  >
                    ✅ Asignar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal de Confirmación */}
        {mostrarConfirmacion && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-2xl p-8 max-w-md shadow-2xl">
              <div className="text-center mb-6">
                <div className="bg-yellow-100 text-yellow-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">⚠️ Confirmar Asignación</h3>
                <p className="text-gray-600">
                  ¿Estás seguro de asignar el viaje <span className="font-bold">{viaje.HDR_viaje}</span> al fletero <span className="font-bold">{fleteroSeleccionado}</span>?
                </p>
                <p className="text-sm text-gray-500 mt-3">
                  Esta acción no se puede deshacer. El fletero será notificado de inmediato.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setMostrarConfirmacion(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarAsignacion}
                  className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors"
                >
                  ✅ Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
