import { useState, useEffect, useRef } from 'react';
import { useEntregasStore } from '../stores/entregasStore';
import { useOfflineSync } from '../hooks/useOfflineSync';
import type { Entrega } from '../types';

interface EntregasListProps {
  onSelectEntrega: (entrega: Entrega) => void;
  onLogout: () => void;
}

export function EntregasList({ onSelectEntrega, onLogout }: EntregasListProps) {
  const { entregas, currentHDR, chofer, setHDR, setEntregas } = useEntregasStore();
  const { savePending, syncAll } = useOfflineSync();
  const [completionSent, setCompletionSent] = useState(false);
  const previousCompletionRef = useRef(false);

  console.log('[EntregasList] Total entregas:', entregas.length);
  console.log('[EntregasList] Entregas data:', entregas);

  // Sort: Pendientes first, then En Reparto, then Completadas
  const sortedEntregas = [...entregas].sort((a, b) => {
    const order = { 'PENDIENTE': 0, 'EN_REPARTO': 1, 'COMPLETADO': 2 };
    return order[a.estado] - order[b.estado];
  });

  const completadas = entregas.filter((e) => e.estado === 'COMPLETADO').length;
  const total = entregas.length;
  const progreso = total > 0 ? Math.round((completadas / total) * 100) : 0;
  const todasCompletadas = total > 0 && completadas === total;

  // Calculate total remitos
  const totalRemitos = entregas.reduce((sum, e) => {
    if (e.numeroRemito) {
      const remitos = e.numeroRemito.split(',').length;
      return sum + remitos;
    }
    return sum;
  }, 0);

  // Send HDR completion notification to N8N when all deliveries are done
  useEffect(() => {
    const sendCompletionNotification = async () => {
      // Only send if:
      // 1. All deliveries are completed
      // 2. We haven't sent notification yet
      // 3. Previous state was not completed (avoid duplicate sends)
      if (todasCompletadas && !completionSent && !previousCompletionRef.current && currentHDR) {
        console.log('[EntregasList] HDR completed! Sending summary to N8N...');

        try {
          // Send EACH entrega individually (one row per entrega in Google Sheets)
          for (const entrega of entregas) {
            const remitosArray = entrega.numeroRemito
              ? entrega.numeroRemito.split(',').map(r => r.trim())
              : [];

            const entregaData = {
              type: 'entrega_individual',
              hdr: currentHDR,
              numero_entrega: entrega.numeroEntrega,
              numeros_remito: remitosArray, // Array format for N8N
              cliente: entrega.clienteNombreCompleto || entrega.cliente,
              detalle_entregas: entrega.detalleEntregas || '',
              estado: entrega.estado,
              chofer: chofer,
              nombre_receptor: entrega.nombreReceptor || '',
              fecha_viaje: entrega.fechaViaje || '',
              fecha_actualizacion: entrega.fechaActualizacion,
              pdf_urls: entrega.pdfUrls || [], // Array format for N8N
              numero_remitos: remitosArray.length,
            };

            console.log('[EntregasList] Sending entrega', entrega.numeroEntrega, 'to N8N');
            await savePending('entrega', entregaData);
          }

          console.log('[EntregasList] Forcing immediate sync for all entregas...');
          await syncAll();

          setCompletionSent(true);
          console.log('[EntregasList] ✓ HDR completion notification sent to N8N');
        } catch (error) {
          console.error('[EntregasList] Error sending HDR completion:', error);
        }
      }

      // Update ref for next check
      previousCompletionRef.current = todasCompletadas;
    };

    sendCompletionNotification();
  }, [todasCompletadas, completionSent, currentHDR, chofer, total, totalRemitos, entregas, savePending, syncAll]);

  const getEstadoBadge = (estado: Entrega['estado']) => {
    switch (estado) {
      case 'COMPLETADO':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'EN_REPARTO':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'PENDIENTE':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getEstadoText = (estado: Entrega['estado']) => {
    switch (estado) {
      case 'COMPLETADO':
        return 'Completado';
      case 'EN_REPARTO':
        return 'En Reparto';
      case 'PENDIENTE':
      default:
        return 'Pendiente';
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 shadow-lg" style={{
        background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)'
      }}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">HDR {currentHDR}</h1>
              <p className="text-sm font-medium" style={{ color: '#a8e063' }}>Chofer: {chofer}</p>
              {entregas.length > 0 && entregas[0].fechaViaje && (
                <p className="text-xs text-gray-300">
                  Fecha: {entregas[0].fechaViaje}
                </p>
              )}
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-transparent border-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
              style={{ borderColor: '#a8e063' }}
            >
              Cerrar Sesión
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Completadas: {completadas} de {total}
              </span>
              <span className="text-sm font-bold" style={{ color: '#a8e063' }}>
                {progreso}%
              </span>
            </div>
            {total - completadas > 0 && (
              <p className="text-xs text-gray-300">
                Restan: {total - completadas} entregas pendientes
              </p>
            )}
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{ width: `${progreso}%`, backgroundColor: '#a8e063' }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Completion Banner */}
      {todasCompletadas && (
        <div className="mx-4 mt-4 p-6 rounded-lg shadow-xl" style={{
          background: 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)',
          border: '3px solid #a8e063'
        }}>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: '#a8e063' }}>
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a2332' }}>
              ¡HDR COMPLETADA! 🎉
            </h2>
            <p className="mb-4" style={{ color: '#2d3e50' }}>
              Todas las entregas del HDR {currentHDR} han sido completadas con éxito
            </p>

            {/* Lista de entregas con PDFs */}
            <div className="space-y-3 mb-6">
              {entregas.map((entrega) => {
                const remitos = entrega.numeroRemito ? entrega.numeroRemito.split(',').map(r => r.trim()) : [];
                const pdfUrls = entrega.pdfUrls || [];

                return (
                  <div key={entrega.id} className="bg-white rounded-lg p-4 border-2 border-green-300 text-left">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Entrega N° {entrega.numeroEntrega}
                    </h3>
                    <p className="text-sm text-gray-700 mb-2">
                      {entrega.detalleEntregas || entrega.clienteNombreCompleto || entrega.cliente}
                    </p>
                    {entrega.nombreReceptor && !entrega.nombreReceptor.startsWith('http') && (
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-semibold">Recibió:</span> {entrega.nombreReceptor}
                      </p>
                    )}
                    {remitos.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {remitos.map((remito, idx) => {
                          const pdfUrl = pdfUrls[idx];
                          console.log('[EntregasList] PDF URL for remito', remito, ':', pdfUrl);

                          // Ensure pdfUrl is a valid URL starting with http
                          const isValidUrl = pdfUrl && (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://'));

                          return (
                            <div key={idx} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                              <span className="text-sm font-semibold text-gray-900">Remito: {remito}</span>
                              {isValidUrl ? (
                                <a
                                  href={pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-3 py-1 text-white text-xs font-semibold rounded-lg hover:opacity-90 active:opacity-75 transition-opacity"
                                  style={{ backgroundColor: '#a8e063' }}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
                  </div>
                );
              })}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: '#a8e063' }}>
                <p className="text-2xl font-bold" style={{ color: '#a8e063' }}>{total}</p>
                <p className="text-sm" style={{ color: '#2d3e50' }}>Entregas Completadas</p>
              </div>
              <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: '#a8e063' }}>
                <p className="text-2xl font-bold" style={{ color: '#a8e063' }}>{totalRemitos}</p>
                <p className="text-sm" style={{ color: '#2d3e50' }}>Remitos Totales</p>
              </div>
            </div>

            {/* New HDR Button */}
            <button
              onClick={() => {
                // Clear HDR data and return to login
                setHDR('', '');
                setEntregas([]);
                onLogout();
              }}
              className="w-full py-3 px-6 text-white font-semibold rounded-lg shadow-md hover:opacity-90 active:opacity-75 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}
            >
              Iniciar Nuevo HDR
            </button>
            <p className="text-xs mt-2" style={{ color: '#2d3e50' }}>
              Los datos de este HDR están guardados y ya fueron enviados a N8N
            </p>
          </div>
        </div>
      )}

      {/* Entregas List - Only show if not all completed */}
      {!todasCompletadas && (
        <main className="p-4 space-y-3">
          {entregas.length === 0 ? (
          <div className="card p-8 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-600">No hay entregas para este HDR</p>
          </div>
        ) : (
          sortedEntregas.map((entrega) => (
            <div
              key={entrega.id}
              className={`card p-4 transition-transform ${
                entrega.estado !== 'COMPLETADO'
                  ? 'cursor-pointer active:scale-[0.98]'
                  : 'cursor-default opacity-90'
              }`}
              onClick={() => {
                // Only allow clicking on non-completed entregas
                if (entrega.estado !== 'COMPLETADO') {
                  onSelectEntrega(entrega);
                }
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">
                        Entrega N° {entrega.numeroEntrega}
                      </h3>
                      {/* Estado Badge inline */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getEstadoBadge(
                          entrega.estado
                        )}`}
                      >
                        {getEstadoText(entrega.estado)}
                      </span>
                    </div>
                    {entrega.estado === 'COMPLETADO' && (
                      <p className="text-sm font-medium text-green-700">
                        {entrega.detalleEntregas || entrega.clienteNombreCompleto || entrega.cliente}
                      </p>
                    )}
                  </div>

                  {/* Destino/Cliente */}
                  {entrega.detalleEntregas ? (
                    <div className="mb-2 p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <p className="text-xs font-semibold text-blue-700 mb-1">📍 DESTINO:</p>
                      <p className="text-sm font-medium text-blue-900 leading-relaxed">
                        {entrega.detalleEntregas}
                      </p>
                    </div>
                  ) : (
                    <div className="mb-2 p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                      <p className="text-xs font-semibold text-gray-700 mb-1">📦 CLIENTE:</p>
                      <p className="text-sm font-medium text-gray-900">
                        {entrega.clienteNombreCompleto || entrega.cliente}
                      </p>
                    </div>
                  )}

                  {entrega.clienteNombreCompleto && entrega.clienteNombreCompleto !== entrega.cliente && (
                    <p className="text-xs text-gray-500 mb-1">
                      ID Cliente: {entrega.cliente}
                    </p>
                  )}
                  {entrega.numeroRemito && (
                    <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-green-800">
                        <span className="font-semibold">✓ Remito:</span> {entrega.numeroRemito}
                      </p>
                      {entrega.nombreReceptor && (
                        <p className="text-xs text-green-800">
                          <span className="font-semibold">Recibió:</span> {entrega.nombreReceptor}
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Action Button - Only show if not completed */}
              {entrega.estado !== 'COMPLETADO' && (
                <button
                  className="w-full py-3 rounded-lg font-semibold transition-opacity text-white hover:opacity-90 active:opacity-75"
                  style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEntrega(entrega);
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Iniciar Entrega
                  </span>
                </button>
              )}
            </div>
          ))
        )}
        </main>
      )}
    </div>
  );
}
