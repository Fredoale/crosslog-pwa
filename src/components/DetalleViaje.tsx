import React, { useState } from 'react';
import type { HDRConsulta } from '../types';

interface DetalleViajeProps {
  hdrData: HDRConsulta;
  onBack: () => void;
}

const DetalleViaje: React.FC<DetalleViajeProps> = ({ hdrData, onBack }) => {
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  const handleDownloadPdf = async (url: string, entregaNumero: string) => {
    setDownloadingPdf(entregaNumero);

    try {
      // Open PDF in new tab
      window.open(url, '_blank');

      // Optional: If you want to download directly instead of opening
      // const response = await fetch(url);
      // const blob = await response.blob();
      // const downloadUrl = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = downloadUrl;
      // a.download = `remito_${hdrData.hdr}_${entregaNumero}.pdf`;
      // a.click();
      // window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('[DetalleViaje] Error downloading PDF:', error);
      alert('Error al abrir el PDF');
    } finally {
      setTimeout(() => setDownloadingPdf(null), 1000);
    }
  };

  const entregasCompletadas = hdrData.entregas.filter(e => e.estado === 'COMPLETADO');
  const entregasPendientes = hdrData.entregas.filter(e => e.estado === 'PENDIENTE');
  const progresoPorcentaje = (hdrData.entregasCompletadas / hdrData.totalEntregas) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-[#1a2332] text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                <span className="text-[#a8e063]">HDR:</span> {hdrData.hdr}
              </h1>
              <div className="space-y-1 text-gray-300">
                <p className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {hdrData.fechaViaje}
                </p>
                <p className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Chofer: {hdrData.chofer}
                </p>
                {hdrData.fletero && (
                  <p className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Transporte: {hdrData.fletero}
                  </p>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white bg-opacity-10 rounded-2xl">
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#a8e063]">{hdrData.entregasCompletadas}</div>
                  <div className="text-sm text-gray-300">Completadas</div>
                </div>
                <div className="text-3xl text-gray-400">/</div>
                <div className="text-center">
                  <div className="text-4xl font-bold">{hdrData.totalEntregas}</div>
                  <div className="text-sm text-gray-300">Total</div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-300">Progreso del viaje</span>
              <span className="text-sm font-bold text-[#a8e063]">{progresoPorcentaje.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700 bg-opacity-50 rounded-full h-4">
              <div
                className="bg-[#a8e063] h-4 rounded-full transition-all duration-500"
                style={{ width: `${progresoPorcentaje}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Resumen Ejecutivo */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Resumen del Viaje
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Entregas */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-blue-900">{hdrData.totalEntregas}</div>
              <div className="text-sm text-blue-700 font-medium mt-1">Total Entregas</div>
            </div>

            {/* Completadas */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border-2 border-green-200">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-green-900">{hdrData.entregasCompletadas}</div>
              <div className="text-sm text-green-700 font-medium mt-1">Completadas</div>
            </div>

            {/* Pendientes */}
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-5 border-2 border-yellow-200">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-yellow-900">{hdrData.totalEntregas - hdrData.entregasCompletadas}</div>
              <div className="text-sm text-yellow-700 font-medium mt-1">Pendientes</div>
            </div>

            {/* Progreso */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-purple-900">{progresoPorcentaje.toFixed(0)}%</div>
              <div className="text-sm text-purple-700 font-medium mt-1">Progreso</div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mt-6 flex items-center justify-center">
            {hdrData.entregasCompletadas === hdrData.totalEntregas ? (
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-100 text-green-800 rounded-full font-bold text-lg border-2 border-green-300">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                ✅ Viaje Completado
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-100 text-yellow-800 rounded-full font-bold text-lg border-2 border-yellow-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                🚛 En Curso
              </div>
            )}
          </div>
        </div>

        {/* Entregas Completadas */}
        {entregasCompletadas.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-7 h-7 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Entregas Completadas ({entregasCompletadas.length})
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {entregasCompletadas.map((entrega) => (
                <div
                  key={entrega.id}
                  className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        Entrega #{entrega.numeroEntrega}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Cliente: {entrega.clienteNombreCompleto || entrega.cliente}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                      Completado
                    </span>
                  </div>

                  {entrega.detalleEntregas && (
                    <p className="text-sm text-gray-700 mb-3 flex items-start gap-2">
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {entrega.detalleEntregas}
                    </p>
                  )}

                  {entrega.numeroRemito && (
                    <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Remito: <span className="font-semibold">{entrega.numeroRemito}</span>
                    </p>
                  )}

                  {entrega.nombreReceptor && (
                    <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Receptor: <span className="font-semibold">{entrega.nombreReceptor}</span>
                    </p>
                  )}

                  {entrega.pdfUrls && entrega.pdfUrls.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        Remitos digitales ({entrega.pdfUrls.length})
                      </p>
                      <div className="space-y-2">
                        {entrega.pdfUrls.map((url, index) => (
                          <button
                            key={index}
                            onClick={() => handleDownloadPdf(url, entrega.numeroEntrega)}
                            disabled={downloadingPdf === entrega.numeroEntrega}
                            className="w-full flex items-center justify-between px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="flex items-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <span className="font-medium">Remito {index + 1}.pdf</span>
                            </span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entregas Pendientes */}
        {entregasPendientes.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Entregas Pendientes ({entregasPendientes.length})
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {entregasPendientes.map((entrega) => (
                <div
                  key={entrega.id}
                  className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        Entrega #{entrega.numeroEntrega}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Cliente: {entrega.clienteNombreCompleto || entrega.cliente}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                      Pendiente
                    </span>
                  </div>

                  {entrega.detalleEntregas && (
                    <p className="text-sm text-gray-700 flex items-start gap-2">
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {entrega.detalleEntregas}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetalleViaje;
