import React, { useState, useEffect } from 'react';
import { sheetsApi } from '../../utils/sheetsApi';
import { calcularEstadoDocumento, formatearFecha, diasHastaVencimiento, generarMensajeAlerta } from '../../utils/vencimientosUtils';
import { showError } from '../../utils/toast';

interface DetalleUnidadDocumentosProps {
  numeroUnidad: string;
  onBack: () => void;
  onAgregarNuevo: (datosPreCargados?: { tipoUnidad?: string }) => void;
}

export function DetalleUnidadDocumentos({ numeroUnidad, onBack, onAgregarNuevo }: DetalleUnidadDocumentosProps) {
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tipoUnidad, setTipoUnidad] = useState('');
  const [documentoEditar, setDocumentoEditar] = useState<any | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarDocumentos();
  }, [numeroUnidad]);

  const cargarDocumentos = async () => {
    setCargando(true);
    try {
      const docs = await sheetsApi.fetchUnidadDocumentos(numeroUnidad);
      setDocumentos(docs);
      if (docs.length > 0) {
        setTipoUnidad(docs[0].tipoUnidad || '');
      }
    } catch (error) {
      console.error('[DetalleUnidad] Error:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarEdicion = async () => {
    if (!documentoEditar) return;

    setGuardando(true);
    try {
      await sheetsApi.updateUnidadDocumento(documentoEditar);
      await cargarDocumentos();
      setDocumentoEditar(null);
    } catch (error) {
      console.error('[DetalleUnidad] Error al guardar:', error);
      showError('Error al guardar el documento');
    } finally {
      setGuardando(false);
    }
  };

  const getEstadoBadge = (fechaVenc?: string) => {
    if (!fechaVenc) return null;
    const estado = calcularEstadoDocumento(fechaVenc);

    const colores = {
      VIGENTE: 'bg-green-100 text-green-800 border-green-300',
      POR_VENCER: 'bg-amber-100 text-amber-800 border-amber-300',
      VENCIDO: 'bg-red-100 text-red-800 border-red-300'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${colores[estado]}`}>
        {estado.replace('_', ' ')}
      </span>
    );
  };

  // Calcular alertas
  const alertas = documentos
    .filter(doc => doc.fechaVencimiento)
    .map(doc => {
      const estado = calcularEstadoDocumento(doc.fechaVencimiento);
      if (estado !== 'VIGENTE') {
        const dias = diasHastaVencimiento(doc.fechaVencimiento);
        return {
          documento: doc.nombreDocumento,
          dias,
          estado,
          criticidad: estado === 'VENCIDO' ? 'alta' : dias <= 7 ? 'alta' : 'media'
        };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.dias - b.dias);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="text-white p-6" style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver
            </button>
            <button
              onClick={() => { cargarDocumentos(); }}
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">🚛 Unidad {numeroUnidad}</h1>
              <p className="text-sm" style={{ color: '#a8e063' }}>Documentación de la Unidad</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-300">Total Documentos</p>
              <p className="text-3xl font-bold">{documentos.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Alertas */}
        {alertas.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
            <h3 className="text-lg font-bold text-gray-900 mb-3">⚠️ Alertas de Vencimiento</h3>
            <div className="space-y-2">
              {alertas.map((alerta: any, idx) => (
                <div key={idx} className={`p-3 rounded-lg ${
                  alerta.criticidad === 'alta' ? 'bg-red-50' : 'bg-amber-50'
                }`}>
                  <p className={`text-sm font-medium ${
                    alerta.criticidad === 'alta' ? 'text-red-800' : 'text-amber-800'
                  }`}>
                    {alerta.documento}: {generarMensajeAlerta(alerta.documento, alerta.dias)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Documentos de la Unidad</h2>
          <button
            onClick={() => onAgregarNuevo({ tipoUnidad })}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            style={{ backgroundColor: '#a8e063', color: '#1a2332' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar Nuevo
          </button>
        </div>

        {/* Lista de Documentos */}
        {cargando ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Cargando documentos...</p>
          </div>
        ) : documentos.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
            <svg className="w-20 h-20 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 font-medium text-lg">No hay documentos registrados</p>
            <p className="text-gray-500 text-sm mt-2">Haz clic en "Agregar Nuevo" para comenzar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {documentos.map((doc, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
                onClick={() => setDocumentoEditar({...doc})}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{doc.nombreDocumento}</h3>
                      {getEstadoBadge(doc.fechaVencimiento)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium text-gray-900">Tipo:</span>
                        <p className="uppercase">{doc.tipo}</p>
                      </div>
                      {doc.fechaVencimiento && (
                        <>
                          <div>
                            <span className="font-medium text-gray-900">Vence:</span>
                            <p>{formatearFecha(doc.fechaVencimiento)}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">Días restantes:</span>
                            <p className={diasHastaVencimiento(doc.fechaVencimiento) < 0 ? 'text-red-600 font-bold' : ''}>
                              {diasHastaVencimiento(doc.fechaVencimiento)} días
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <a
                    href={doc.urlArchivo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-6 px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity"
                    style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}
                  >
                    Ver PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Edición */}
      {documentoEditar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Editar Documento</h2>
                <button
                  onClick={() => setDocumentoEditar(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Documento</label>
                  <input
                    type="text"
                    value={documentoEditar.nombreDocumento || ''}
                    onChange={(e) => setDocumentoEditar({...documentoEditar, nombreDocumento: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={documentoEditar.fechaVencimiento || ''}
                    onChange={(e) => setDocumentoEditar({...documentoEditar, fechaVencimiento: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL del Archivo</label>
                  <input
                    type="url"
                    value={documentoEditar.urlArchivo || ''}
                    onChange={(e) => setDocumentoEditar({...documentoEditar, urlArchivo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleGuardarEdicion}
                    disabled={guardando}
                    className="flex-1 py-3 px-6 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)' }}
                  >
                    {guardando ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button
                    onClick={() => setDocumentoEditar(null)}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
