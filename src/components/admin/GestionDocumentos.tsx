import React, { useState, useEffect } from 'react';
import { sheetsApi } from '../../utils/sheetsApi';
import { calcularEstadoDocumento, formatearFecha } from '../../utils/vencimientosUtils';

interface GestionDocumentosProps {
  onClose: () => void;
}

type TipoDocumentoChofer = 'registro' | 'lintin' | 'dni';
type TipoDocumentoUnidad = 'seguro' | 'vtv' | 'cedula';

export function GestionDocumentos({ onClose }: GestionDocumentosProps) {
  const [seccionActiva, setSeccionActiva] = useState<'chofer' | 'unidad' | 'cuadernillo'>('chofer');
  const [vistaActiva, setVistaActiva] = useState<'lista' | 'agregar'>('lista');
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  // Estados para listas
  const [listaChoferes, setListaChoferes] = useState<any[]>([]);
  const [listaUnidades, setListaUnidades] = useState<any[]>([]);
  const [listaCuadernillos, setListaCuadernillos] = useState<any[]>([]);
  const [choferesDisponibles, setChoferesDisponibles] = useState<string[]>([]);

  // Estado para documentos de chofer
  const [formChofer, setFormChofer] = useState({
    nombreChofer: '',
    unidad: '',
    tipoDoc: 'registro' as TipoDocumentoChofer,
    nombreDocumento: '',
    fechaVencimiento: '',
    urlArchivo: '',
    esPropio: true
  });

  // Estado para documentos de unidad
  const [formUnidad, setFormUnidad] = useState({
    numeroUnidad: '',
    tipoDoc: 'seguro' as TipoDocumentoUnidad,
    nombreDocumento: '',
    fechaVencimiento: '',
    urlArchivo: ''
  });

  // Estado para cuadernillo
  const [formCuadernillo, setFormCuadernillo] = useState({
    nombreChofer: '',
    mes: '',
    fechaEmision: '',
    fechaVencimiento: '',
    urlCuadernillo: ''
  });

  // Cargar datos al montar
  useEffect(() => {
    cargarDatos();
  }, [seccionActiva]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      if (seccionActiva === 'chofer') {
        // Cargar lista de todos los documentos de choferes
        // Por ahora cargamos de Juan Perez como ejemplo
        const docs = await sheetsApi.fetchChoferDocumentos('Juan Perez');
        setListaChoferes(docs);
      } else if (seccionActiva === 'unidad') {
        // Cargar documentos de unidad ejemplo
        const docs = await sheetsApi.fetchUnidadDocumentos('62');
        setListaUnidades(docs);
      } else if (seccionActiva === 'cuadernillo') {
        // Cargar cuadernillo ejemplo
        const cuad = await sheetsApi.fetchCuadernillo('Juan Perez');
        setListaCuadernillos(cuad ? [cuad] : []);
      }
    } catch (error) {
      console.error('[GestionDocumentos] Error cargando datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarChofer = async () => {
    try {
      setGuardando(true);
      setMensaje(null);

      if (!formChofer.nombreChofer || !formChofer.unidad || !formChofer.nombreDocumento || !formChofer.urlArchivo) {
        setMensaje({ tipo: 'error', texto: 'Por favor completa todos los campos obligatorios' });
        return;
      }

      // TODO: Implementar guardado en Sheets
      console.log('[GestionDocumentos] Guardando documento de chofer:', formChofer);
      await new Promise(resolve => setTimeout(resolve, 1000));

      setMensaje({ tipo: 'success', texto: '✅ Documento guardado exitosamente' });

      // Limpiar formulario y volver a lista
      setFormChofer({
        nombreChofer: '',
        unidad: '',
        tipoDoc: 'registro',
        nombreDocumento: '',
        fechaVencimiento: '',
        urlArchivo: '',
        esPropio: true
      });

      setTimeout(() => {
        setVistaActiva('lista');
        cargarDatos();
      }, 1500);

    } catch (error) {
      console.error('[GestionDocumentos] Error:', error);
      setMensaje({ tipo: 'error', texto: '❌ Error al guardar documento' });
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarUnidad = async () => {
    try {
      setGuardando(true);
      setMensaje(null);

      if (!formUnidad.numeroUnidad || !formUnidad.nombreDocumento || !formUnidad.fechaVencimiento || !formUnidad.urlArchivo) {
        setMensaje({ tipo: 'error', texto: 'Por favor completa todos los campos' });
        return;
      }

      console.log('[GestionDocumentos] Guardando documento de unidad:', formUnidad);
      await new Promise(resolve => setTimeout(resolve, 1000));

      setMensaje({ tipo: 'success', texto: '✅ Documento guardado exitosamente' });

      setFormUnidad({
        numeroUnidad: '',
        tipoDoc: 'seguro',
        nombreDocumento: '',
        fechaVencimiento: '',
        urlArchivo: ''
      });

      setTimeout(() => {
        setVistaActiva('lista');
        cargarDatos();
      }, 1500);

    } catch (error) {
      console.error('[GestionDocumentos] Error:', error);
      setMensaje({ tipo: 'error', texto: '❌ Error al guardar documento' });
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarCuadernillo = async () => {
    try {
      setGuardando(true);
      setMensaje(null);

      if (!formCuadernillo.nombreChofer || !formCuadernillo.mes || !formCuadernillo.urlCuadernillo) {
        setMensaje({ tipo: 'error', texto: 'Por favor completa todos los campos' });
        return;
      }

      console.log('[GestionDocumentos] Guardando cuadernillo:', formCuadernillo);
      await new Promise(resolve => setTimeout(resolve, 1000));

      setMensaje({ tipo: 'success', texto: '✅ Cuadernillo guardado exitosamente' });

      setFormCuadernillo({
        nombreChofer: '',
        mes: '',
        fechaEmision: '',
        fechaVencimiento: '',
        urlCuadernillo: ''
      });

      setTimeout(() => {
        setVistaActiva('lista');
        cargarDatos();
      }, 1500);

    } catch (error) {
      console.error('[GestionDocumentos] Error:', error);
      setMensaje({ tipo: 'error', texto: '❌ Error al guardar cuadernillo' });
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="text-white p-6" style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">📁 Gestión de Documentos</h2>
              <p className="text-sm" style={{ color: '#a8e063' }}>Panel Administrativo - Crosslog</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs de sección */}
          <div className="flex gap-2">
            <button
              onClick={() => { setSeccionActiva('chofer'); setVistaActiva('lista'); }}
              className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                seccionActiva === 'chofer'
                  ? 'text-gray-900'
                  : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
              }`}
              style={seccionActiva === 'chofer' ? { backgroundColor: '#a8e063' } : {}}
            >
              👤 Choferes
            </button>
            <button
              onClick={() => { setSeccionActiva('unidad'); setVistaActiva('lista'); }}
              className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                seccionActiva === 'unidad'
                  ? 'text-gray-900'
                  : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
              }`}
              style={seccionActiva === 'unidad' ? { backgroundColor: '#a8e063' } : {}}
            >
              🚛 Unidades
            </button>
            <button
              onClick={() => { setSeccionActiva('cuadernillo'); setVistaActiva('lista'); }}
              className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                seccionActiva === 'cuadernillo'
                  ? 'text-gray-900'
                  : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
              }`}
              style={seccionActiva === 'cuadernillo' ? { backgroundColor: '#a8e063' } : {}}
            >
              📦 Cuadernillos
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setVistaActiva('lista')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                vistaActiva === 'lista'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900'
              }`}
            >
              📋 Ver Lista
            </button>
            <button
              onClick={() => setVistaActiva('agregar')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                vistaActiva === 'agregar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900'
              }`}
            >
              ➕ Agregar Nuevo
            </button>
          </div>

          {vistaActiva === 'lista' && (
            <button
              onClick={cargarDatos}
              disabled={cargando}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
            >
              {cargando ? '🔄 Cargando...' : '🔄 Actualizar'}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {/* Mensaje de feedback */}
          {mensaje && (
            <div className={`mb-4 p-4 rounded-lg border-2 ${
              mensaje.tipo === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {mensaje.texto}
            </div>
          )}

          {vistaActiva === 'lista' ? (
            /* Vista de Lista */
            <div>
              {cargando ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                  <p className="mt-4 text-gray-600">Cargando documentos...</p>
                </div>
              ) : (
                <>
                  {seccionActiva === 'chofer' && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Documentos de Choferes</h3>
                      {listaChoferes.length === 0 ? (
                        <div className="bg-white rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-gray-600 font-medium">No hay documentos registrados</p>
                          <p className="text-gray-500 text-sm mt-1">Haz clic en "Agregar Nuevo" para comenzar</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          {listaChoferes.map((doc, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="font-semibold text-gray-900">{doc.nombreDocumento}</h4>
                                    {getEstadoBadge(doc.fechaVencimiento)}
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                    <p><span className="font-medium">Chofer:</span> {doc.nombreChofer}</p>
                                    <p><span className="font-medium">Unidad:</span> {doc.unidad}</p>
                                    <p><span className="font-medium">Tipo:</span> {doc.tipo.toUpperCase()}</p>
                                    {doc.fechaVencimiento && (
                                      <p><span className="font-medium">Vence:</span> {formatearFecha(doc.fechaVencimiento)}</p>
                                    )}
                                  </div>
                                </div>
                                <a
                                  href={doc.urlArchivo}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-4 px-3 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity"
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
                  )}

                  {seccionActiva === 'unidad' && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Documentos de Unidades</h3>
                      {listaUnidades.length === 0 ? (
                        <div className="bg-white rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-gray-600 font-medium">No hay documentos registrados</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          {listaUnidades.map((doc, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="font-semibold text-gray-900">{doc.nombreDocumento}</h4>
                                    {getEstadoBadge(doc.fechaVencimiento)}
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                    <p><span className="font-medium">Unidad:</span> {doc.numeroUnidad}</p>
                                    <p><span className="font-medium">Tipo:</span> {doc.tipo.toUpperCase()}</p>
                                    <p><span className="font-medium">Vence:</span> {formatearFecha(doc.fechaVencimiento)}</p>
                                  </div>
                                </div>
                                <a
                                  href={doc.urlArchivo}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-4 px-3 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity"
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
                  )}

                  {seccionActiva === 'cuadernillo' && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Cuadernillos Mensuales</h3>
                      {listaCuadernillos.length === 0 ? (
                        <div className="bg-white rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-gray-600 font-medium">No hay cuadernillos registrados</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          {listaCuadernillos.map((cuad, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="font-semibold text-gray-900">Cuadernillo {cuad.mes}</h4>
                                    {getEstadoBadge(cuad.fechaVencimiento)}
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                    <p><span className="font-medium">Chofer:</span> {cuad.nombreChofer}</p>
                                    <p><span className="font-medium">Emisión:</span> {formatearFecha(cuad.fechaEmision)}</p>
                                    <p><span className="font-medium">Vence:</span> {formatearFecha(cuad.fechaVencimiento)}</p>
                                  </div>
                                </div>
                                <a
                                  href={cuad.urlCuadernillo}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-4 px-3 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity"
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
                  )}
                </>
              )}
            </div>
          ) : (
            /* Vista de Agregar */
            <div className="bg-white rounded-lg p-6 shadow-sm">
              {seccionActiva === 'chofer' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Agregar Documento de Chofer</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Chofer *</label>
                      <input
                        type="text"
                        value={formChofer.nombreChofer}
                        onChange={(e) => setFormChofer({...formChofer, nombreChofer: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: Juan Perez"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Número de Unidad *</label>
                      <input
                        type="text"
                        value={formChofer.unidad}
                        onChange={(e) => setFormChofer({...formChofer, unidad: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: 62"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Documento *</label>
                      <select
                        value={formChofer.tipoDoc}
                        onChange={(e) => setFormChofer({...formChofer, tipoDoc: e.target.value as TipoDocumentoChofer})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="registro">Registro de Conducir</option>
                        <option value="lintin">Lintín</option>
                        <option value="dni">DNI</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Documento *</label>
                      <input
                        type="text"
                        value={formChofer.nombreDocumento}
                        onChange={(e) => setFormChofer({...formChofer, nombreDocumento: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: Registro de Conducir"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Vencimiento</label>
                      <input
                        type="date"
                        value={formChofer.fechaVencimiento}
                        onChange={(e) => setFormChofer({...formChofer, fechaVencimiento: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">URL del Archivo *</label>
                      <input
                        type="url"
                        value={formChofer.urlArchivo}
                        onChange={(e) => setFormChofer({...formChofer, urlArchivo: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://drive.google.com/file/d/..."
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="esPropio"
                        checked={formChofer.esPropio}
                        onChange={(e) => setFormChofer({...formChofer, esPropio: e.target.checked})}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="esPropio" className="ml-2 text-sm font-medium text-gray-700">
                        Es chofer propio
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setVistaActiva('lista')}
                      className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleGuardarChofer}
                      disabled={guardando}
                      className="flex-1 px-4 py-3 text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}
                    >
                      {guardando ? 'Guardando...' : 'Guardar Documento'}
                    </button>
                  </div>
                </div>
              )}

              {seccionActiva === 'unidad' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Agregar Documento de Unidad</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Número de Unidad *</label>
                      <input
                        type="text"
                        value={formUnidad.numeroUnidad}
                        onChange={(e) => setFormUnidad({...formUnidad, numeroUnidad: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: 62"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Documento *</label>
                      <select
                        value={formUnidad.tipoDoc}
                        onChange={(e) => setFormUnidad({...formUnidad, tipoDoc: e.target.value as TipoDocumentoUnidad})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="seguro">Seguro</option>
                        <option value="vtv">VTV</option>
                        <option value="cedula">Cédula Verde</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Documento *</label>
                      <input
                        type="text"
                        value={formUnidad.nombreDocumento}
                        onChange={(e) => setFormUnidad({...formUnidad, nombreDocumento: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: Seguro Unidad 62"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Vencimiento *</label>
                      <input
                        type="date"
                        value={formUnidad.fechaVencimiento}
                        onChange={(e) => setFormUnidad({...formUnidad, fechaVencimiento: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">URL del Archivo *</label>
                      <input
                        type="url"
                        value={formUnidad.urlArchivo}
                        onChange={(e) => setFormUnidad({...formUnidad, urlArchivo: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://drive.google.com/file/d/..."
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setVistaActiva('lista')}
                      className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleGuardarUnidad}
                      disabled={guardando}
                      className="flex-1 px-4 py-3 text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}
                    >
                      {guardando ? 'Guardando...' : 'Guardar Documento'}
                    </button>
                  </div>
                </div>
              )}

              {seccionActiva === 'cuadernillo' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Agregar Cuadernillo</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Chofer *</label>
                      <input
                        type="text"
                        value={formCuadernillo.nombreChofer}
                        onChange={(e) => setFormCuadernillo({...formCuadernillo, nombreChofer: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: Juan Perez"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mes (YYYY-MM) *</label>
                      <input
                        type="month"
                        value={formCuadernillo.mes}
                        onChange={(e) => setFormCuadernillo({...formCuadernillo, mes: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Emisión</label>
                      <input
                        type="date"
                        value={formCuadernillo.fechaEmision}
                        onChange={(e) => setFormCuadernillo({...formCuadernillo, fechaEmision: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Vencimiento</label>
                      <input
                        type="date"
                        value={formCuadernillo.fechaVencimiento}
                        onChange={(e) => setFormCuadernillo({...formCuadernillo, fechaVencimiento: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">URL del Cuadernillo *</label>
                      <input
                        type="url"
                        value={formCuadernillo.urlCuadernillo}
                        onChange={(e) => setFormCuadernillo({...formCuadernillo, urlCuadernillo: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://drive.google.com/file/d/..."
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setVistaActiva('lista')}
                      className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleGuardarCuadernillo}
                      disabled={guardando}
                      className="flex-1 px-4 py-3 text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}
                    >
                      {guardando ? 'Guardando...' : 'Guardar Cuadernillo'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
