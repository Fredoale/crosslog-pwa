import React, { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { ChecklistRegistro } from '../../types/checklist';
import { showSuccess, showError, showConfirm } from '../../utils/toast';

// Mapeo de patentes de unidades VRAC (Tractores y Cisternas) + VITAL AIRE
const PATENTES_UNIDADES: Record<string, string> = {
  // Tractores VRAC
  '40': 'AB934JF',
  '41': 'AB152AZ',
  '45': 'LYG959',
  '46': 'NBJ986',
  '48': 'AC531CX',
  '50': 'AD611OK',
  '54': 'HPD893',
  '58': 'KTJ385',
  '61': 'KYQ147',
  '62': 'MAL538',
  '64': 'MGY394',
  '802': 'AE069SN',
  '803': 'AE116AE',
  '805': 'AE936FJ',
  '806': 'AF254MJ',
  '810': 'AF894TS',
  '812': 'AG835OX',
  '813': 'AE906WF',
  '814': 'AG994AW',
  '815': 'AH676AV',
  '817': 'AH506ID',
  '818': 'AH912GI',
  // Cisternas VRAC
  '532': 'STF788',
  '535': 'STF787',
  '537': 'SMZ040',
  '548': 'SJU171',
  '552': 'BML932',
  '603': 'FQQ503',
  '703': 'CLD321',
  '711': 'PKY856',
  '712': 'PKY880',
  '715': 'AD179Pc',
  '721': 'AG831SJ',
  // Unidades VITAL AIRE
  '52': 'AA279FE',
  '53': 'AC823TK',
  '55': 'MYN849',
  '56': 'AC823XZ',
  '59': 'KSZ061',
  '801': 'AE052TW',
  '808': 'AF313QP',
  '811': 'AG705RB',
  '816': 'AH506IC'
};

const obtenerPatente = (numeroUnidad: string): string => {
  return PATENTES_UNIDADES[numeroUnidad] || 'N/A';
};

const formatearFecha = (fecha: Date | null | undefined): string => {
  if (!fecha) {
    console.warn('[formatearFecha] ⚠️ Fecha es null/undefined');
    return 'Fecha no disponible';
  }

  try {
    const dateObj = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(dateObj.getTime())) {
      console.error('[formatearFecha] ❌ Fecha inválida:', {
        tipoRecibido: typeof fecha,
        valorRecibido: fecha,
        esDate: fecha instanceof Date
      });
      return 'Fecha no disponible';
    }

    return dateObj.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('[formatearFecha] ❌ Error formateando fecha:', error, 'Valor:', fecha);
    return 'Fecha no disponible';
  }
};

interface ModalDetalleChecklistProps {
  checklist: ChecklistRegistro;
  onClose: () => void;
  onUpdated: () => void;
}

export const ModalDetalleChecklist: React.FC<ModalDetalleChecklistProps> = ({ checklist, onClose, onUpdated }) => {
  const [loading, setLoading] = useState(false);

  const handleEliminar = async () => {
    const confirmed = await showConfirm(
      '¿Estás seguro de que deseas eliminar este checklist? Esta acción no se puede deshacer.',
      'Eliminar',
      'Cancelar'
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'checklists', checklist.id));
      console.log('[ModalDetalleChecklist] Checklist eliminado:', checklist.id);
      showSuccess('Checklist eliminado exitosamente');
      onClose();
      onUpdated();
    } catch (error) {
      console.error('[ModalDetalleChecklist] Error al eliminar:', error);
      showError('Error al eliminar el checklist: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'CONFORME': return 'bg-white border-gray-300 text-gray-700';
      case 'NO_CONFORME': return 'bg-white border-gray-300 text-gray-700';
      case 'NO_APLICA': return 'bg-white border-gray-300 text-gray-500';
      default: return 'bg-white border-gray-300 text-gray-700';
    }
  };

  const getEstadoIcono = (estado: string) => {
    switch (estado) {
      case 'CONFORME': return '✓';
      case 'NO_CONFORME': return '✗';
      case 'NO_APLICA': return '−';
      default: return '•';
    }
  };

  const getResultadoColor = (resultado: string) => {
    switch (resultado) {
      case 'APTO': return 'bg-[#56ab2f]';
      case 'NO_APTO': return 'bg-red-500';
      case 'PENDIENTE': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl md:rounded-2xl max-w-5xl w-full my-4 md:my-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-[#1a2332] text-white p-3 md:p-4 rounded-t-xl md:rounded-t-2xl sticky top-0 z-10 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <div>
                <h2 className="text-lg md:text-xl font-bold">Detalle de Checklist</h2>
                <p className="text-white/90 text-xs md:text-sm">Unidad {checklist.unidad.numero} - {formatearFecha(checklist.fecha)}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1.5 md:p-2 hover:bg-white/10 rounded-lg">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 md:p-4 space-y-3 md:space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Información General */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Unidad */}
            <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2 text-xs md:text-sm uppercase tracking-wide">Información de la Unidad</h3>
              <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Unidad:</span>
                  <span className="font-semibold text-gray-900">INT-{checklist.unidad.numero}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Patente:</span>
                  <span className="font-semibold text-gray-900">{obtenerPatente(checklist.unidad.numero)}</span>
                </div>
                {checklist.cisterna && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cisterna:</span>
                      <span className="font-semibold text-gray-900">{checklist.cisterna.numero}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pat. Cisterna:</span>
                      <span className="font-semibold text-gray-900">{checklist.cisterna.patente}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Sector:</span>
                  <span className="font-semibold text-gray-900 uppercase">{checklist.sector}</span>
                </div>
              </div>
            </div>

            {/* Chofer y Fecha */}
            <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2 text-xs md:text-sm uppercase tracking-wide">Información del Checklist</h3>
              <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Chofer:</span>
                  <span className="font-semibold text-gray-900">{checklist.chofer.nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha:</span>
                  <span className="font-semibold text-gray-900">
                    {formatearFecha(checklist.fecha)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Odómetro:</span>
                  <span className="font-semibold text-gray-900">
                    {checklist.odometroInicial.valor.toLocaleString()} km
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Resultado */}
          <div className={`${getResultadoColor(checklist.resultado)} rounded-lg p-3 md:p-4 text-white shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base md:text-lg font-semibold">Resultado: {checklist.resultado}</h3>
                <p className="text-white/95 text-xs md:text-sm mt-0.5">
                  {checklist.itemsConformes} conformes • {checklist.itemsRechazados} rechazados
                </p>
              </div>
              <div className="text-2xl md:text-3xl">
                {checklist.resultado === 'APTO' ? '✓' : checklist.resultado === 'NO_APTO' ? '✗' : '−'}
              </div>
            </div>
          </div>

          {/* Ítems del Checklist */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-4 uppercase tracking-wide">
              Ítems Inspeccionados ({checklist.items.length})
            </h3>

            <div className="space-y-2">
              {checklist.items.map((item, index) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 ${
                    item.estado === 'NO_CONFORME' && item.esCritico
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Número */}
                    <div className="flex-shrink-0 w-7 h-7 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center font-semibold text-xs border border-gray-300">
                      {item.numero}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-medium text-gray-900 flex-1">{item.descripcion}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap border ${getEstadoColor(item.estado)}`}>
                          {getEstadoIcono(item.estado)} {item.estado.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Badges de info */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-gray-50 text-gray-600 text-xs rounded border border-gray-200">
                          {item.categoria.replace('_', ' ')}
                        </span>
                        {item.esCritico && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded border border-red-200 font-semibold">
                            CRÍTICO
                          </span>
                        )}
                      </div>

                      {/* Comentario si existe */}
                      {item.comentario && (
                        <div className="mt-2 p-3 bg-gray-50 border-l-2 border-gray-300 rounded text-sm text-gray-700">
                          {item.comentario}
                        </div>
                      )}

                      {/* Foto si existe */}
                      {item.fotoUrl && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">📎 Evidencia fotográfica adjunta</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-2xl">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-[#1a2332] text-white font-semibold rounded-lg hover:bg-[#252f42] transition-colors disabled:opacity-50"
            >
              Cerrar
            </button>
            <button
              onClick={handleEliminar}
              disabled={loading}
              className="px-6 py-3 bg-white text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-red-200"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                  Eliminando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
