import React, { useState } from 'react';
import type { InfoChoferCompleta } from '../../types/documentos';
import { DocumentCard } from './DocumentCard';

interface DocumentosModalProps {
  info: InfoChoferCompleta;
  onClose: () => void;
}

export function DocumentosModal({ info, onClose }: DocumentosModalProps) {
  const [tabActiva, setTabActiva] = useState<'cuadernillo' | 'chofer' | 'unidad'>('cuadernillo');

  const handleDescargar = (url: string, nombre: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = nombre;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleVisualizar = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="text-white p-4 sm:p-6" style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-1">📋 Mi Documentación</h2>
              <p className="text-sm" style={{ color: '#a8e063' }}>{info.nombre} - Unidad {info.unidad}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all active:bg-opacity-40"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Alertas */}
          {info.alertas.length > 0 && (
            <div className="mt-4 bg-amber-500 bg-opacity-20 border border-amber-300 rounded-lg p-3">
              <p className="text-sm font-semibold mb-1">⚠️ {info.alertas.length} Alerta(s)</p>
              <ul className="text-xs space-y-1">
                {info.alertas.slice(0, 2).map((alerta, idx) => (
                  <li key={idx}>• {alerta.mensaje}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setTabActiva('cuadernillo')}
            className={`flex-1 px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold transition-colors ${
              tabActiva === 'cuadernillo'
                ? 'bg-white border-b-2'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            style={tabActiva === 'cuadernillo' ? { color: '#1a2332', borderColor: '#a8e063' } : {}}
          >
            📦 Cuadernillo
          </button>
          <button
            onClick={() => setTabActiva('chofer')}
            className={`flex-1 px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold transition-colors ${
              tabActiva === 'chofer'
                ? 'bg-white border-b-2'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            style={tabActiva === 'chofer' ? { color: '#1a2332', borderColor: '#a8e063' } : {}}
          >
            👤 Tu Documentación
          </button>
          <button
            onClick={() => setTabActiva('unidad')}
            className={`flex-1 px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold transition-colors ${
              tabActiva === 'unidad'
                ? 'bg-white border-b-2'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            style={tabActiva === 'unidad' ? { color: '#1a2332', borderColor: '#a8e063' } : {}}
          >
            🚛 Unidad {info.unidad}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {tabActiva === 'cuadernillo' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Cuadernillo Mensual</h3>
              {info.cuadernillo ? (
                <DocumentCard
                  documento={{
                    id: 'cuadernillo',
                    nombre: `Cuadernillo ${info.cuadernillo.mes}`,
                    urlArchivo: info.cuadernillo.cuadernilloCompleto,
                    fechaVencimiento: info.cuadernillo.fechaVencimiento,
                    estado: info.cuadernillo.estado
                  }}
                  onDescargar={() => handleDescargar(info.cuadernillo!.cuadernilloCompleto, `Cuadernillo-${info.cuadernillo!.mes}.pdf`)}
                  onVisualizar={() => handleVisualizar(info.cuadernillo!.cuadernilloCompleto)}
                />
              ) : (
                <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 font-medium">No hay cuadernillo disponible</p>
                </div>
              )}
            </div>
          )}

          {tabActiva === 'chofer' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Tus Documentos</h3>
              {info.documentos.length > 0 ? (
                info.documentos.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    documento={doc}
                    onDescargar={() => handleDescargar(doc.urlArchivo, `${doc.nombre}.pdf`)}
                    onVisualizar={() => handleVisualizar(doc.urlArchivo)}
                  />
                ))
              ) : (
                <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 font-medium">No hay documentos disponibles</p>
                </div>
              )}
            </div>
          )}

          {tabActiva === 'unidad' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Documentos de Unidad {info.unidad}</h3>
              {info.documentosUnidad.length > 0 ? (
                info.documentosUnidad.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    documento={doc}
                    onDescargar={() => handleDescargar(doc.urlArchivo, `${doc.nombre}.pdf`)}
                    onVisualizar={() => handleVisualizar(doc.urlArchivo)}
                  />
                ))
              ) : (
                <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 font-medium">No hay documentos disponibles</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 safe-area-bottom">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 text-white font-semibold rounded-lg hover:opacity-90 active:opacity-80 transition-all"
            style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
