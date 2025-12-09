import React from 'react';
import type { Documento } from '../../types/documentos';
import { calcularEstadoDocumento, diasHastaVencimiento, formatearFecha, getColorEstado } from '../../utils/vencimientosUtils';

interface DocumentCardProps {
  documento: Documento;
  onDescargar?: () => void;
  onVisualizar?: () => void;
}

export function DocumentCard({ documento, onDescargar, onVisualizar }: DocumentCardProps) {
  const estado = documento.fechaVencimiento
    ? calcularEstadoDocumento(documento.fechaVencimiento)
    : 'VIGENTE';

  const dias = documento.fechaVencimiento
    ? diasHastaVencimiento(documento.fechaVencimiento)
    : null;

  const colores = getColorEstado(estado);

  return (
    <div className={`${colores.bg} border-2 ${colores.border} rounded-lg p-4 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800 text-sm mb-1">{documento.nombre}</h4>
          {documento.fechaVencimiento && (
            <p className="text-xs text-gray-600">
              Vence: {formatearFecha(documento.fechaVencimiento)}
            </p>
          )}
        </div>
        <span className={`${colores.badge} text-white text-xs font-bold px-2 py-1 rounded-full`}>
          {estado}
        </span>
      </div>

      {dias !== null && dias <= 30 && (
        <div className={`text-xs ${colores.text} font-medium mb-3`}>
          {dias < 0 ? `⚠️ Vencido hace ${Math.abs(dias)} días` :
           dias === 0 ? '⚠️ Vence HOY' :
           `⏰ Vence en ${dias} días`}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onVisualizar}
          className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 bg-white border text-sm font-medium rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
          style={{ borderColor: '#1a2332', color: '#1a2332' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="text-xs sm:text-sm">Ver</span>
        </button>
        <button
          onClick={onDescargar}
          className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 active:opacity-80 transition-all"
          style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-xs sm:text-sm">Descargar</span>
        </button>
      </div>
    </div>
  );
}
