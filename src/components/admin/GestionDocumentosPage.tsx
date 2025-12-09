import React, { useState, useEffect } from 'react';
import { sheetsApi } from '../../utils/sheetsApi';
import { calcularEstadoDocumento, formatearFecha, diasHastaVencimiento } from '../../utils/vencimientosUtils';
import { DetalleChoferDocumentos } from './DetalleChoferDocumentos';
import { DetalleUnidadDocumentos } from './DetalleUnidadDocumentos';
import { DashboardDocumentos } from './DashboardDocumentos';

interface GestionDocumentosPageProps {
  onBack: () => void;
}

type TipoDocumentoChofer = 'registro' | 'lintin' | 'dni' | 'svo';
type TipoDocumentoUnidad = 'seguro' | 'vtv' | 'cedula';

// Modal para agregar documentos
function ModalAgregar({
  seccion,
  choferSeleccionado,
  unidadSeleccionada,
  datosPreCargados,
  onClose,
  onSuccess
}: {
  seccion: 'chofer' | 'unidad' | 'cuadernillo';
  choferSeleccionado?: string;
  unidadSeleccionada?: string;
  datosPreCargados?: {
    unidad?: string;
    tipoUnidad?: string;
    habilidad?: string;
    dni?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  const [formChofer, setFormChofer] = useState({
    nombreChofer: choferSeleccionado || '',
    dni: datosPreCargados?.dni || '',
    unidad: datosPreCargados?.unidad || '',
    tipoUnidad: (datosPreCargados?.tipoUnidad || 'F100') as 'F100' | '710' | 'chasis' | 'balancin' | 'semi' | 'tractor' | 'acoplado',
    habilidad: (datosPreCargados?.habilidad || 'chasista') as 'chasista' | 'semista' | 'semi_con_acoplado',
    tipoDoc: 'registro' as TipoDocumentoChofer,
    fechaVencimiento: '',
    urlArchivo: '',
    esPropio: true
  });

  const [formUnidad, setFormUnidad] = useState({
    numeroUnidad: unidadSeleccionada || '',
    tipoUnidad: (datosPreCargados?.tipoUnidad || 'F100') as 'F100' | '710' | 'chasis' | 'balancin' | 'semi' | 'tractor' | 'acoplado',
    tipoDoc: 'seguro' as TipoDocumentoUnidad,
    fechaVencimiento: '',
    urlArchivo: ''
  });

  const [formCuadernillo, setFormCuadernillo] = useState({
    nombreChofer: '',
    mes: '',
    fechaEmision: '',
    fechaVencimiento: '',
    urlCuadernillo: ''
  });

  const handleGuardar = async () => {
    try {
      setGuardando(true);
      setMensaje(null);

      let result;

      // Validaciones y guardado según sección
      if (seccion === 'chofer') {
        if (!formChofer.nombreChofer || !formChofer.dni || !formChofer.unidad || !formChofer.tipoUnidad || !formChofer.habilidad || !formChofer.urlArchivo) {
          setMensaje({ tipo: 'error', texto: 'Completa todos los campos obligatorios' });
          setGuardando(false);
          return;
        }

        // Generar nombre del documento automáticamente
        const nombreDoc = formChofer.tipoDoc === 'registro' ? 'Registro de Conducir' :
                         formChofer.tipoDoc === 'lintin' ? 'Lintín' :
                         formChofer.tipoDoc === 'svo' ? 'Seguro de Vida Obligatorio' : 'DNI';

        result = await sheetsApi.addChoferDocumento({
          nombreChofer: formChofer.nombreChofer,
          dni: formChofer.dni,
          unidad: formChofer.unidad,
          tipoUnidad: formChofer.tipoUnidad,
          habilidad: formChofer.habilidad,
          tipoDoc: formChofer.tipoDoc,
          nombreDocumento: nombreDoc,
          fechaVencimiento: formChofer.fechaVencimiento,
          urlArchivo: formChofer.urlArchivo,
          esPropio: formChofer.esPropio
        });

      } else if (seccion === 'unidad') {
        if (!formUnidad.numeroUnidad || !formUnidad.tipoUnidad || !formUnidad.fechaVencimiento || !formUnidad.urlArchivo) {
          setMensaje({ tipo: 'error', texto: 'Completa todos los campos obligatorios' });
          setGuardando(false);
          return;
        }

        // Generar nombre del documento automáticamente
        const nombreDoc = formUnidad.tipoDoc === 'seguro' ? `Seguro Unidad ${formUnidad.numeroUnidad}` :
                         formUnidad.tipoDoc === 'vtv' ? `VTV Unidad ${formUnidad.numeroUnidad}` :
                         `Cédula Verde Unidad ${formUnidad.numeroUnidad}`;

        result = await sheetsApi.addUnidadDocumento({
          numeroUnidad: formUnidad.numeroUnidad,
          tipoUnidad: formUnidad.tipoUnidad,
          tipoDoc: formUnidad.tipoDoc,
          nombreDocumento: nombreDoc,
          fechaVencimiento: formUnidad.fechaVencimiento,
          urlDocumento: formUnidad.urlArchivo
        });

      } else {
        if (!formCuadernillo.nombreChofer || !formCuadernillo.mes || !formCuadernillo.urlCuadernillo) {
          setMensaje({ tipo: 'error', texto: 'Completa todos los campos obligatorios' });
          setGuardando(false);
          return;
        }

        result = await sheetsApi.addCuadernillo({
          nombreDocumento: formCuadernillo.nombreChofer,
          mes: formCuadernillo.mes,
          fechaEmision: formCuadernillo.fechaEmision,
          fechaVencimiento: formCuadernillo.fechaVencimiento,
          urlDocumento: formCuadernillo.urlCuadernillo
        });
      }

      if (result.success) {
        setMensaje({ tipo: 'success', texto: '✅ ' + result.message });

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setMensaje({ tipo: 'error', texto: '❌ ' + result.message });
      }

    } catch (error) {
      console.error('[Modal] Error al guardar:', error);
      setMensaje({ tipo: 'error', texto: '❌ Error inesperado al guardar' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">
              {seccion === 'chofer' ? '👤 Nuevo Documento de Chofer' :
               seccion === 'unidad' ? '🚛 Nuevo Documento de Unidad' :
               '📦 Nueva Documentación Crosslog'}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white bg-opacity-20 hover:bg-opacity-30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {mensaje && (
            <div className={`mb-4 p-3 rounded-lg border-2 ${
              mensaje.tipo === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {mensaje.texto}
            </div>
          )}

          {seccion === 'chofer' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Chofer *</label>
                <input
                  type="text"
                  value={formChofer.nombreChofer}
                  onChange={(e) => setFormChofer({...formChofer, nombreChofer: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Juan Perez"
                  disabled={!!choferSeleccionado}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">DNI *</label>
                <input
                  type="text"
                  value={formChofer.dni}
                  onChange={(e) => setFormChofer({...formChofer, dni: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 12345678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unidad Asignada *</label>
                <input
                  type="text"
                  value={formChofer.unidad}
                  onChange={(e) => setFormChofer({...formChofer, unidad: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 62"
                  disabled={!!datosPreCargados?.unidad}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Unidad *</label>
                <select
                  value={formChofer.tipoUnidad}
                  onChange={(e) => setFormChofer({...formChofer, tipoUnidad: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!!datosPreCargados?.tipoUnidad}
                >
                  <option value="F100">F100</option>
                  <option value="710">710</option>
                  <option value="chasis">Chasis</option>
                  <option value="balancin">Balancín</option>
                  <option value="semi">Semi</option>
                  <option value="tractor">Tractor</option>
                  <option value="acoplado">Acoplado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Habilidad *</label>
                <select
                  value={formChofer.habilidad}
                  onChange={(e) => setFormChofer({...formChofer, habilidad: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!!datosPreCargados?.habilidad}
                >
                  <option value="chasista">Chasista</option>
                  <option value="semista">Semista</option>
                  <option value="semi_con_acoplado">Semi con Acoplado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Documento *</label>
                <select
                  value={formChofer.tipoDoc}
                  onChange={(e) => setFormChofer({...formChofer, tipoDoc: e.target.value as TipoDocumentoChofer})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="registro">Registro de Conducir</option>
                  <option value="lintin">Lintín</option>
                  <option value="dni">DNI</option>
                  <option value="svo">Seguro de Vida Obligatorio</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Vencimiento</label>
                <input
                  type="date"
                  value={formChofer.fechaVencimiento}
                  onChange={(e) => setFormChofer({...formChofer, fechaVencimiento: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">URL del Archivo *</label>
                <input
                  type="url"
                  value={formChofer.urlArchivo}
                  onChange={(e) => setFormChofer({...formChofer, urlArchivo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://drive.google.com/file/d/..."
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="esPropio"
                  checked={formChofer.esPropio}
                  onChange={(e) => setFormChofer({...formChofer, esPropio: e.target.checked})}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="esPropio" className="ml-2 text-sm font-medium text-gray-700">
                  Es chofer propio
                </label>
              </div>
            </div>
          )}

          {seccion === 'unidad' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Número de Unidad *</label>
                <input
                  type="text"
                  value={formUnidad.numeroUnidad}
                  onChange={(e) => setFormUnidad({...formUnidad, numeroUnidad: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 62"
                  disabled={!!unidadSeleccionada}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Unidad *</label>
                <select
                  value={formUnidad.tipoUnidad}
                  onChange={(e) => setFormUnidad({...formUnidad, tipoUnidad: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!!datosPreCargados?.tipoUnidad}
                >
                  <option value="F100">F100</option>
                  <option value="710">710</option>
                  <option value="chasis">Chasis</option>
                  <option value="balancin">Balancín</option>
                  <option value="semi">Semi</option>
                  <option value="tractor">Tractor</option>
                  <option value="acoplado">Acoplado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Documento *</label>
                <select
                  value={formUnidad.tipoDoc}
                  onChange={(e) => setFormUnidad({...formUnidad, tipoDoc: e.target.value as TipoDocumentoUnidad})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="seguro">Seguro</option>
                  <option value="vtv">VTV</option>
                  <option value="cedula">Cédula Verde</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Vencimiento *</label>
                <input
                  type="date"
                  value={formUnidad.fechaVencimiento}
                  onChange={(e) => setFormUnidad({...formUnidad, fechaVencimiento: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">URL del Archivo *</label>
                <input
                  type="url"
                  value={formUnidad.urlArchivo}
                  onChange={(e) => setFormUnidad({...formUnidad, urlArchivo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://drive.google.com/file/d/..."
                />
              </div>
            </div>
          )}

          {seccion === 'cuadernillo' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Documento *</label>
                <input
                  type="text"
                  value={formCuadernillo.nombreChofer}
                  onChange={(e) => setFormCuadernillo({...formCuadernillo, nombreChofer: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Cuadernillo Enero 2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mes (YYYY-MM) *</label>
                <input
                  type="month"
                  value={formCuadernillo.mes}
                  onChange={(e) => setFormCuadernillo({...formCuadernillo, mes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Emisión</label>
                <input
                  type="date"
                  value={formCuadernillo.fechaEmision}
                  onChange={(e) => setFormCuadernillo({...formCuadernillo, fechaEmision: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Vencimiento</label>
                <input
                  type="date"
                  value={formCuadernillo.fechaVencimiento}
                  onChange={(e) => setFormCuadernillo({...formCuadernillo, fechaVencimiento: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">URL del Cuadernillo *</label>
                <input
                  type="url"
                  value={formCuadernillo.urlCuadernillo}
                  onChange={(e) => setFormCuadernillo({...formCuadernillo, urlCuadernillo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://drive.google.com/file/d/..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex-1 px-4 py-3 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function GestionDocumentosPage({ onBack }: GestionDocumentosPageProps) {
  const [seccionActiva, setSeccionActiva] = useState<'dashboard' | 'chofer' | 'unidad' | 'cuadernillo'>('dashboard');
  const [cargando, setCargando] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Estados para navegación a detalle
  const [choferSeleccionado, setChoferSeleccionado] = useState<string | null>(null);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<string | null>(null);
  const [datosPreCargadosModal, setDatosPreCargadosModal] = useState<{ unidad?: string; tipoUnidad?: string; habilidad?: string } | undefined>();

  // Estados para listas de resumen
  const [listaChoferes, setListaChoferes] = useState<any[]>([]);
  const [listaUnidades, setListaUnidades] = useState<any[]>([]);
  const [listaCuadernillos, setListaCuadernillos] = useState<any[]>([]);

  useEffect(() => {
    cargarDatos();
  }, [seccionActiva]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      if (seccionActiva === 'chofer') {
        const docs = await sheetsApi.fetchChoferDocumentos();
        // Agrupar por chofer
        const chofersMap = docs.reduce((acc: any, doc: any) => {
          if (!acc[doc.nombreChofer]) {
            acc[doc.nombreChofer] = {
              nombre: doc.nombreChofer,
              unidad: doc.unidad,
              documentos: [],
              alertas: 0
            };
          }
          acc[doc.nombreChofer].documentos.push(doc);

          // Contar alertas
          if (doc.fechaVencimiento) {
            const estado = calcularEstadoDocumento(doc.fechaVencimiento);
            if (estado !== 'VIGENTE') {
              acc[doc.nombreChofer].alertas++;
            }
          }
          return acc;
        }, {});
        setListaChoferes(Object.values(chofersMap));
      } else if (seccionActiva === 'unidad') {
        const docs = await sheetsApi.fetchUnidadDocumentos();
        // Agrupar por unidad
        const unidadesMap = docs.reduce((acc: any, doc: any) => {
          if (!acc[doc.numeroUnidad]) {
            acc[doc.numeroUnidad] = {
              numero: doc.numeroUnidad,
              documentos: [],
              alertas: 0
            };
          }
          acc[doc.numeroUnidad].documentos.push(doc);

          // Contar alertas
          if (doc.fechaVencimiento) {
            const estado = calcularEstadoDocumento(doc.fechaVencimiento);
            if (estado !== 'VIGENTE') {
              acc[doc.numeroUnidad].alertas++;
            }
          }
          return acc;
        }, {});
        setListaUnidades(Object.values(unidadesMap));
      } else if (seccionActiva === 'cuadernillo') {
        const cuads = await sheetsApi.fetchCuadernillo();
        setListaCuadernillos(Array.isArray(cuads) ? cuads : []);
      }
    } catch (error) {
      console.error('[GestionDocumentos] Error:', error);
    } finally {
      setCargando(false);
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

  // Si hay un chofer seleccionado, mostrar su detalle
  if (choferSeleccionado) {
    return (
      <>
        <DetalleChoferDocumentos
          nombreChofer={choferSeleccionado}
          onBack={() => setChoferSeleccionado(null)}
          onAgregarNuevo={(datos) => {
            setDatosPreCargadosModal(datos);
            setShowModal(true);
          }}
        />
        {showModal && (
          <ModalAgregar
            seccion="chofer"
            choferSeleccionado={choferSeleccionado}
            datosPreCargados={datosPreCargadosModal}
            onClose={() => {
              setShowModal(false);
              setDatosPreCargadosModal(undefined);
            }}
            onSuccess={() => {
              setShowModal(false);
              setDatosPreCargadosModal(undefined);
              // La página de detalle se actualiza automáticamente
            }}
          />
        )}
      </>
    );
  }

  // Si hay una unidad seleccionada, mostrar su detalle
  if (unidadSeleccionada) {
    return (
      <>
        <DetalleUnidadDocumentos
          numeroUnidad={unidadSeleccionada}
          onBack={() => setUnidadSeleccionada(null)}
          onAgregarNuevo={(datos) => {
            setDatosPreCargadosModal(datos);
            setShowModal(true);
          }}
        />
        {showModal && (
          <ModalAgregar
            seccion="unidad"
            unidadSeleccionada={unidadSeleccionada}
            datosPreCargados={datosPreCargadosModal}
            onClose={() => {
              setShowModal(false);
              setDatosPreCargadosModal(undefined);
            }}
            onSuccess={() => {
              setShowModal(false);
              setDatosPreCargadosModal(undefined);
              // La página de detalle se actualiza automáticamente
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="text-white p-6" style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">📁 Gestión de Documentos</h1>
              <p className="text-sm" style={{ color: '#a8e063' }}>Panel Administrativo - Crosslog</p>
            </div>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver
            </button>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setSeccionActiva('dashboard')}
              className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all ${
                seccionActiva === 'dashboard' ? 'text-gray-900' : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
              }`}
              style={seccionActiva === 'dashboard' ? { backgroundColor: '#a8e063' } : {}}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setSeccionActiva('chofer')}
              className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all ${
                seccionActiva === 'chofer' ? 'text-gray-900' : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
              }`}
              style={seccionActiva === 'chofer' ? { backgroundColor: '#a8e063' } : {}}
            >
              👤 Choferes
            </button>
            <button
              onClick={() => setSeccionActiva('unidad')}
              className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all ${
                seccionActiva === 'unidad' ? 'text-gray-900' : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
              }`}
              style={seccionActiva === 'unidad' ? { backgroundColor: '#a8e063' } : {}}
            >
              🚛 Unidades
            </button>
            <button
              onClick={() => setSeccionActiva('cuadernillo')}
              className={`px-6 py-3 text-sm font-semibold rounded-lg transition-all ${
                seccionActiva === 'cuadernillo' ? 'text-gray-900' : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
              }`}
              style={seccionActiva === 'cuadernillo' ? { backgroundColor: '#a8e063' } : {}}
            >
              📦 Crosslog
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {seccionActiva === 'dashboard' ? (
        <DashboardDocumentos />
      ) : (
      <div className="max-w-7xl mx-auto p-6">
        {/* Toolbar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {seccionActiva === 'chofer' ? 'Lista de Choferes' :
             seccionActiva === 'unidad' ? 'Lista de Unidades' :
             'Documentación Crosslog'}
          </h2>
          <div className="flex gap-3">
            <button
              onClick={cargarDatos}
              disabled={cargando}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
            >
              {cargando ? '🔄 Cargando...' : '🔄 Actualizar'}
            </button>
            {(seccionActiva === 'chofer' || seccionActiva === 'unidad' || seccionActiva === 'cuadernillo') && (
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                style={{ backgroundColor: '#a8e063', color: '#1a2332' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {seccionActiva === 'chofer' ? 'Agregar Chofer' :
                 seccionActiva === 'unidad' ? 'Agregar Unidad' :
                 'Agregar Nuevo'}
              </button>
            )}
          </div>
        </div>

        {/* Lista */}
        {cargando ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Cargando documentos...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {/* Lista de Choferes */}
            {seccionActiva === 'chofer' && listaChoferes.length === 0 && (
              <div className="bg-white rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
                <svg className="w-20 h-20 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-gray-600 font-medium text-lg">No hay choferes registrados</p>
              </div>
            )}

            {seccionActiva === 'chofer' && listaChoferes.map((chofer, idx) => (
              <div key={idx} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer"
                   onClick={() => setChoferSeleccionado(chofer.nombre)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">👤 {chofer.nombre}</h3>
                      {chofer.alertas > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                          {chofer.alertas} alerta{chofer.alertas > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Unidad:</span> {chofer.unidad}
                      </div>
                      <div>
                        <span className="font-medium">Documentos:</span> {chofer.documentos.length}
                      </div>
                    </div>
                  </div>
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}

            {/* Lista de Unidades */}
            {seccionActiva === 'unidad' && listaUnidades.length === 0 && (
              <div className="bg-white rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
                <svg className="w-20 h-20 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="text-gray-600 font-medium text-lg">No hay unidades registradas</p>
              </div>
            )}

            {seccionActiva === 'unidad' && listaUnidades.map((unidad, idx) => (
              <div key={idx} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer"
                   onClick={() => setUnidadSeleccionada(unidad.numero)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">🚛 Unidad {unidad.numero}</h3>
                      {unidad.alertas > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                          {unidad.alertas} alerta{unidad.alertas > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Documentos:</span> {unidad.documentos.length}
                    </div>
                  </div>
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}

            {/* Lista de Cuadernillos */}
            {seccionActiva === 'cuadernillo' && listaCuadernillos.length === 0 && (
              <div className="bg-white rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
                <svg className="w-20 h-20 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600 font-medium text-lg">No hay documentación registrada</p>
                <p className="text-gray-500 text-sm mt-2">Haz clic en "Agregar Nuevo" para comenzar</p>
              </div>
            )}

            {seccionActiva === 'cuadernillo' && listaCuadernillos.map((cuad, idx) => (
              <div key={idx} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">Documentación {cuad.mes}</h3>
                      {getEstadoBadge(cuad.fechaVencimiento)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium text-gray-900">Tipo de Documentación:</span>
                        <p>Cuadernillo Mensual</p>
                      </div>
                      {cuad.fechaEmision && (
                        <div>
                          <span className="font-medium text-gray-900">Emisión:</span>
                          <p>{formatearFecha(cuad.fechaEmision)}</p>
                        </div>
                      )}
                      {cuad.fechaVencimiento && (
                        <div>
                          <span className="font-medium text-gray-900">Vence:</span>
                          <p>{formatearFecha(cuad.fechaVencimiento)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <a
                    href={cuad.urlCuadernillo}
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

        {/* Modal Agregar en vista principal */}
        {showModal && (
          <ModalAgregar
            seccion={seccionActiva as 'chofer' | 'unidad' | 'cuadernillo'}
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              setShowModal(false);
              cargarDatos();
            }}
          />
        )}
      </div>
      )}
    </div>
  );
}
