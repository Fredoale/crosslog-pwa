// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { useMarketplaceStore } from '../../stores/marketplaceStore';
import type { ViajeMarketplace } from '../../utils/marketplaceApi';
import { buscarRequisitosCliente, getIconoRequisito, getColorNivel } from '../../utils/clientesRequisitos';
import { guardarUbicacion, obtenerUbicacionesPorTipo, obtenerUbicacionesGuardadas, type UbicacionGuardada } from '../../utils/ubicacionesGuardadas';
import { OfertasDetail } from './OfertasDetail';
import { TestOfertasForm } from './TestOfertasForm';
import { NotificacionesToast } from '../NotificacionesToast';
import { useNotificacionesStore } from '../../stores/notificacionesStore';

export function MarketplaceSection() {
  const { viajes, loading, error, cargarViajes, eliminarViaje } = useMarketplaceStore();
  const { agregarNotificacion } = useNotificacionesStore();
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [viajeSeleccionado, setViajeSeleccionado] = useState<ViajeMarketplace | null>(null);
  const [viajeParaOfertar, setViajeParaOfertar] = useState<ViajeMarketplace | null>(null);

  // Referencia para trackear viajes anteriores y detectar cambios
  const viajesAnterioresRef = useRef<ViajeMarketplace[]>([]);

  const handleEliminarViaje = async (HDR_viaje: string, cliente: string) => {
    if (confirm(`¿Estás seguro de eliminar el viaje ${HDR_viaje} de ${cliente}?`)) {
      try {
        await eliminarViaje(HDR_viaje);
        agregarNotificacion({
          tipo: 'exito',
          titulo: 'Viaje Eliminado',
          mensaje: `El viaje ${HDR_viaje} de ${cliente} fue eliminado exitosamente`
        });
      } catch (error) {
        agregarNotificacion({
          tipo: 'error',
          titulo: 'Error al Eliminar Viaje',
          mensaje: (error as Error).message || 'Error desconocido al eliminar viaje'
        });
      }
    }
  };

  useEffect(() => {
    // Suscribirse a viajes en TIEMPO REAL con Firestore
    const unsubscribe = cargarViajes();

    console.log('[MarketplaceSection] ✨ Suscrito a viajes en tiempo real');

    // Limpiar suscripción al desmontar
    return () => {
      console.log('[MarketplaceSection] Desuscribiendo de viajes');
      unsubscribe();
    };
  }, [cargarViajes]);

  // Detectar cambios en viajes (confirmaciones y eliminaciones)
  useEffect(() => {
    const viajesAnteriores = viajesAnterioresRef.current;

    // Solo procesar si ya teníamos viajes anteriores (evitar notificaciones en carga inicial)
    if (viajesAnteriores.length > 0 && viajes.length > 0) {

      // 1. DETECTAR CONFIRMACIONES: viajes que cambiaron a CONFIRMADO
      viajes.forEach(viajeActual => {
        const viajeAnterior = viajesAnteriores.find(v => v.HDR_viaje === viajeActual.HDR_viaje);

        if (viajeAnterior && viajeAnterior.estado !== 'CONFIRMADO' && viajeActual.estado === 'CONFIRMADO') {
          // Viaje fue confirmado - Extraer nombre del fletero
          const fletero = viajeActual.fletero_asignado || 'Un fletero';

          agregarNotificacion({
            tipo: 'exito',
            titulo: 'Viaje Confirmado',
            mensaje: `${fletero} confirmó el viaje ${viajeActual.hdr_generado || viajeActual.HDR_viaje}`
          });
        }
      });

      // 2. DETECTAR RECHAZOS: fleteros que rechazaron un viaje
      viajes.forEach(viajeActual => {
        const viajeAnterior = viajesAnteriores.find(v => v.HDR_viaje === viajeActual.HDR_viaje);

        if (viajeAnterior) {
          const rechazosAnteriores = viajeAnterior.fleteros_rechazaron || [];
          const rechazosActuales = viajeActual.fleteros_rechazaron || [];

          // Detectar nuevos rechazos
          const nuevosRechazos = rechazosActuales.filter(f => !rechazosAnteriores.includes(f));

          nuevosRechazos.forEach(fletero => {
            agregarNotificacion({
              tipo: 'advertencia',
              titulo: 'Viaje Rechazado',
              mensaje: `${fletero} rechazó el viaje ${viajeActual.hdr_generado || viajeActual.HDR_viaje}`
            });
          });
        }
      });

      // 3. DETECTAR ELIMINACIONES: viajes que ya no están en la lista
      viajesAnteriores.forEach(viajeAnterior => {
        const existe = viajes.find(v => v.HDR_viaje === viajeAnterior.HDR_viaje);

        if (!existe) {
          // Viaje fue eliminado
          agregarNotificacion({
            tipo: 'info',
            titulo: 'Viaje Eliminado',
            mensaje: `El viaje ${viajeAnterior.hdr_generado || viajeAnterior.HDR_viaje} ha sido eliminado`
          });
        }
      });
    }

    // Actualizar referencia con viajes actuales
    viajesAnterioresRef.current = viajes;
  }, [viajes, agregarNotificacion]);

  const viajesFiltrados = viajes.filter(v =>
    filtroEstado === 'TODOS' || v.estado === filtroEstado
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Sistema de Notificaciones */}
      <NotificacionesToast />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">🚛 Marketplace de Viajes</h2>
          <p className="text-gray-600 mt-1">Gestiona viajes y ofertas de fleteros</p>
        </div>
        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl font-semibold"
        >
          {mostrarFormulario ? '❌ Cancelar' : '➕ Publicar Viaje'}
        </button>
      </div>

      {/* Formulario de creación */}
      {mostrarFormulario && (
        <FormularioCrearViaje
          onClose={() => setMostrarFormulario(false)}
          onCreado={() => {
            setMostrarFormulario(false);
            cargarViajes();
          }}
        />
      )}

      {/* Filtros */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {['TODOS', 'BORRADOR', 'PUBLICADO', 'CONFIRMADO', 'ASIGNADO', 'EN_CURSO', 'COMPLETADO'].map(estado => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              filtroEstado === estado
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {estado}
          </button>
        ))}
      </div>

      {/* Estado de carga */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Cargando viajes...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <p className="font-semibold">❌ Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Lista de viajes */}
      {!loading && !error && (
        <div className="grid gap-4">
          {viajesFiltrados.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500 text-lg">📦 No hay viajes {filtroEstado !== 'TODOS' ? `en estado ${filtroEstado}` : 'en el marketplace'}</p>
              <p className="text-gray-400 text-sm mt-2">Crea un nuevo viaje para comenzar</p>
            </div>
          ) : (
            viajesFiltrados.map(viaje => (
              <ViajeCard
                key={viaje.HDR_viaje}
                viaje={viaje}
                onVerOfertas={() => setViajeSeleccionado(viaje)}
                onEliminar={() => handleEliminarViaje(viaje.HDR_viaje || viaje.hdr_generado || '', viaje.cliente_nombre)}
                onCrearOferta={() => setViajeParaOfertar(viaje)}
              />
            ))
          )}
        </div>
      )}

      {/* Modal de ofertas */}
      {viajeSeleccionado && (
        <OfertasDetail
          viaje={viajeSeleccionado}
          onClose={() => setViajeSeleccionado(null)}
        />
      )}

      {/* Modal para crear ofertas de prueba */}
      {viajeParaOfertar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-2xl shadow-lg">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">🧪 Testing - Crear Ofertas</h2>
                <button
                  onClick={() => setViajeParaOfertar(null)}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-lg p-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4">
              <TestOfertasForm
                viaje={viajeParaOfertar}
                onOfertaCreada={() => {
                  cargarViajes();
                  setViajeParaOfertar(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE: Card de Viaje
// ============================================

function ViajeCard({ viaje, onVerOfertas, onEliminar, onCrearOferta }: { viaje: ViajeMarketplace; onVerOfertas: () => void; onEliminar: () => void; onCrearOferta?: () => void }) {
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'BORRADOR': return 'bg-gray-200 text-gray-700';
      case 'PUBLICADO': return 'bg-green-200 text-green-800';
      case 'CONFIRMADO': return 'bg-yellow-200 text-yellow-800';
      case 'ASIGNADO': return 'bg-blue-200 text-blue-800';
      case 'EN_CURSO': return 'bg-purple-200 text-purple-800';
      case 'COMPLETADO': return 'bg-emerald-200 text-emerald-800';
      case 'CANCELADO': return 'bg-red-200 text-red-800';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  // Extraer tarifa de las notas internas (sin info de confirmación)
  const extraerTarifa = () => {
    if (viaje.notas_internas) {
      // Buscar el tarifario y excluir cualquier cosa entre corchetes
      const match = viaje.notas_internas.match(/Tarifario:\s*([^\[\|\n]+)/);
      return match ? match[1].trim() : 'N/A';
    }
    return 'N/A';
  };

  // Extraer información de confirmación
  const extraerConfirmacion = () => {
    if (viaje.estado === 'CONFIRMADO' && viaje.fletero_asignado) {
      return {
        fletero: viaje.fletero_asignado,
        fecha: viaje.fecha_asignacion ? new Date(viaje.fecha_asignacion).toLocaleString('es-AR') : 'N/A'
      };
    }
    return null;
  };

  const confirmacion = extraerConfirmacion();

  // Separar rutas en cargas y descargas
  const cargas = viaje.detalles_ruta?.filter(r => r.tipo === 'CARGA') || [];
  const descargas = viaje.detalles_ruta?.filter(r => r.tipo === 'DESCARGA') || [];

  // Buscar requisitos/alertas del cliente y destinos
  const buscarAlertasViaje = () => {
    const alertas = [];

    // Alerta del cliente
    const reqCliente = buscarRequisitosCliente(viaje.cliente_nombre);
    if (reqCliente) {
      alertas.push(reqCliente);
    }

    // Alertas de destinos
    descargas.forEach(descarga => {
      const req = buscarRequisitosCliente(descarga.direccion);
      if (req) {
        alertas.push(req);
      }
    });

    return alertas;
  };

  const alertasViaje = buscarAlertasViaje();

  return (
    <div
      className={`bg-white rounded-2xl shadow-xl p-4 border-2 border-gray-200 hover:border-[#a8e063] transition-all hover:shadow-2xl animate-slide-up relative overflow-hidden mb-3 ${
        viaje.estado === 'PUBLICADO' ? 'animate-pulse-subtle' : ''
      }`}
    >
      {/* Borde animado superior */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-700 via-[#a8e063] to-gray-700"></div>

      {/* Banner de confirmación */}
      {confirmacion && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-[#a8e063] p-3 mt-1 mb-3 rounded-r-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[#a8e063]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-bold text-green-800">{confirmacion.fletero} confirmó este viaje</p>
            </div>
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="relative z-10">
      {/* Header - Responsive */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-800">
            HDR: {viaje.hdr_generado || viaje.HDR_viaje}
          </h3>
          <p className="text-gray-600 text-xs mt-1">{viaje.cliente_nombre}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${getEstadoColor(viaje.estado)}`}>
          {viaje.estado === 'CONFIRMADO' && confirmacion
            ? `CONFIRMADO POR ${confirmacion.fletero.toUpperCase()}`
            : viaje.estado}
        </span>
      </div>

      {/* Información del viaje */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-500">Fecha de Viaje</p>
          <p className="font-semibold text-gray-800 text-xs">{viaje.fecha_viaje}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Tipo de Carga</p>
          <p className="font-semibold text-gray-800 text-xs">{viaje.tipo_carga}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Unidad Requerida</p>
          <p className="font-semibold text-gray-800 text-xs">{viaje.tipo_unidad_requerida}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Tarifa</p>
          <p className="font-bold text-[#a8e063] text-sm uppercase">
            {extraerTarifa()}
          </p>
        </div>
      </div>

      {/* Ruta */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Ruta</p>
        <div className="space-y-2">
          {cargas.map((carga, idx) => (
            <div key={`carga-${idx}`} className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg border-l-4 border-gray-700 hover:shadow-md transition-all animate-fade-in">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-700 uppercase whitespace-nowrap">Punto de Carga:</span>
                  </div>
                  <span className="text-xs text-gray-800 font-semibold block">{carga.direccion}</span>
                  <p className="text-xs text-gray-600 mt-1">⏰ Horario: {carga.horario_desde}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => window.open(carga.link_maps || `https://www.google.com/maps/search/${encodeURIComponent(carga.direccion)}`, '_blank')}
                    className="px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors flex items-center gap-1"
                    title="Ver en Google Maps"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Maps
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(carga.link_maps || carga.direccion);
                      agregarNotificacion({
                        tipo: 'exito',
                        titulo: 'Link Copiado',
                        mensaje: 'El enlace ha sido copiado al portapapeles'
                      });
                    }}
                    className="px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors flex items-center gap-1"
                    title="Copiar link"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copiar
                  </button>
                </div>
              </div>
            </div>
          ))}
          {descargas.map((descarga, idx) => (
            <div key={`descarga-${idx}`} className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border-l-4 border-[#a8e063] hover:shadow-md transition-all animate-fade-in">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-green-700 uppercase whitespace-nowrap">Punto de Descarga:</span>
                  </div>
                  <span className="text-xs text-gray-800 font-semibold block">{descarga.direccion}</span>
                  <p className="text-xs text-gray-600 mt-1">⏰ Reciben hasta: {descarga.horario_hasta}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => window.open(descarga.link_maps || `https://www.google.com/maps/search/${encodeURIComponent(descarga.direccion)}`, '_blank')}
                    className="px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors flex items-center gap-1"
                    title="Ver en Google Maps"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Maps
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(descarga.link_maps || descarga.direccion);
                      agregarNotificacion({
                        tipo: 'exito',
                        titulo: 'Link Copiado',
                        mensaje: 'El enlace ha sido copiado al portapapeles'
                      });
                    }}
                    className="px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors flex items-center gap-1"
                    title="Copiar link"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copiar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Requisitos/Alertas */}
      {alertasViaje.length > 0 && (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-700 rounded-lg p-3 mb-3 animate-scale-in">
          <p className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Requerimientos
          </p>
          <div className="space-y-1">
            {alertasViaje.map((alerta, index) => (
              <div key={index} className="bg-white rounded p-2 border border-gray-200">
                <p className="text-xs font-semibold text-gray-900">{alerta.nombre}</p>
                <p className="text-xs text-gray-700 mt-1">{alerta.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Información de Asignación */}
      {viaje.estado === 'ASIGNADO' && viaje.fletero_asignado && (
        <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-blue-500 text-white rounded-full p-1.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900">✅ Viaje Asignado</p>
              <p className="text-xs text-blue-700">Fletero: <span className="font-semibold">{viaje.fletero_asignado}</span></p>
              {viaje.precio_final && (
                <p className="text-xs text-blue-700">Precio acordado: <span className="font-semibold">${viaje.precio_final.toLocaleString()}</span></p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ofertas y acciones */}
      <div className="flex flex-col sm:flex-row gap-2">
        {viaje.total_ofertas > 0 && viaje.estado !== 'ASIGNADO' && (
          <button
            onClick={onVerOfertas}
            className="flex-1 bg-blue-600 text-white py-3 sm:py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors min-h-touch"
          >
            Ver {viaje.total_ofertas} {viaje.total_ofertas === 1 ? 'oferta' : 'ofertas'}
          </button>
        )}

        {viaje.estado === 'ASIGNADO' && viaje.total_ofertas > 0 && (
          <button
            onClick={onVerOfertas}
            className="flex-1 bg-gray-600 text-white py-3 sm:py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors min-h-touch"
          >
            📋 Ver Ofertas ({viaje.total_ofertas})
          </button>
        )}

        {viaje.estado === 'PUBLICADO' && (
          <button
            onClick={onCrearOferta}
            className="flex-1 bg-green-600 text-white py-3 sm:py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors min-h-touch"
          >
            🧪 Crear Oferta Test
          </button>
        )}

        {/* Botón eliminar - Solo para borradores o sin ofertas */}
        {(viaje.estado === 'BORRADOR' || viaje.total_ofertas === 0) && (
          <button
            onClick={onEliminar}
            className="px-4 py-3 sm:py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors flex items-center justify-center gap-1 min-h-touch"
            title="Eliminar viaje"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar
          </button>
        )}
      </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE: Formulario Crear Viaje
// ============================================

function FormularioCrearViaje({ onClose, onCreado }: { onClose: () => void; onCreado: () => void }) {
  const { viajes, crearViaje, loading } = useMarketplaceStore();

  // Calcular fecha del día siguiente
  const obtenerFechaSiguiente = () => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    return manana.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    numero_hdr: '',
    cliente: '',
    fecha_viaje: obtenerFechaSiguiente(),
    tarifario: '',
    tipo_unidad_requerida: '',
    peso_kg: '',
    tipo_carga: 'GENERALES',
    tiempo_limite_oferta: '',
    notas_internas: '',
    puntos_carga: [] as Array<{ nombre: string; link_maps: string; horario_desde: string }>,
    destinos: [] as Array<{ nombre: string; link_maps: string; horario_desde: string }>,
    // Nuevos campos para asignación
    modo_asignacion: 'marketplace' as 'marketplace' | 'directa',
    fletero_asignado: '',
  });

  // Estado para el modal de éxito
  const [mostrarModalExito, setMostrarModalExito] = useState(false);
  const [datosViajeCreado, setDatosViajeCreado] = useState<{
    hdr: string;
    cliente: string;
    fecha: string;
    tarifa: string;
    unidad: string;
    peso: string;
    tipo_carga: string;
    puntos_carga: Array<{ nombre: string; link_maps: string; horario_desde: string }>;
    destinos: Array<{ nombre: string; link_maps: string; horario_desde: string }>;
    alertas: Array<any>;
    estado?: string;
    fletero_asignado?: string;
  } | null>(null);

  // Estado temporal para el nuevo punto de carga
  const [nuevoPuntoCarga, setNuevoPuntoCarga] = useState({
    nombre: '',
    link_maps: '',
    horario_desde: ''
  });

  const [nuevoDestino, setNuevoDestino] = useState({
    nombre: '',
    link_maps: '',
    horario_desde: ''
  });

  const [alertasDestinos, setAlertasDestinos] = useState<Array<any>>([]);

  // Mapeo de clientes conocidos
  const clientesMap: Record<string, { id: string; nombre: string }> = {
    'TOYOTA': { id: 'TOY', nombre: 'TOYOTA' },
    'TOY': { id: 'TOY', nombre: 'TOYOTA' },
    'ECOLAB': { id: 'ECO', nombre: 'ECOLAB' },
    'ECO': { id: 'ECO', nombre: 'ECOLAB' },
    'ACONCAGUA': { id: 'ACO', nombre: 'ACONCAGUA' },
    'ACO': { id: 'ACO', nombre: 'ACONCAGUA' },
    'APN': { id: 'APN', nombre: 'APN' },
    'INQUIMEX': { id: 'INQ', nombre: 'INQUIMEX' },
    'INQ': { id: 'INQ', nombre: 'INQUIMEX' },
  };

  // Estados para ubicaciones guardadas
  const [ubicacionesCarga, setUbicacionesCarga] = useState<UbicacionGuardada[]>([]);
  const [ubicacionesDestino, setUbicacionesDestino] = useState<UbicacionGuardada[]>([]);
  const [mostrarGuardarUbicacion, setMostrarGuardarUbicacion] = useState<'carga' | 'destino' | null>(null);
  const [enlaceCargaGuardado, setEnlaceCargaGuardado] = useState<string>('');
  const [enlaceDestinoGuardado, setEnlaceDestinoGuardado] = useState<string>('');

  // Cargar ubicaciones guardadas
  const cargarUbicaciones = () => {
    const todas = obtenerUbicacionesGuardadas();
    setUbicacionesCarga(todas.filter(u => u.tipo === 'CARGA' || u.tipo === 'AMBOS'));
    setUbicacionesDestino(todas.filter(u => u.tipo === 'DESTINO' || u.tipo === 'AMBOS'));
  };

  useEffect(() => {
    cargarUbicaciones();
  }, []);

  // Auto-cerrar modal de éxito después de 40 segundos
  useEffect(() => {
    if (mostrarModalExito) {
      const timer = setTimeout(() => {
        setMostrarModalExito(false);
        setDatosViajeCreado(null);
      }, 40000); // 40 segundos

      // Limpiar timeout si el componente se desmonta o el modal se cierra antes
      return () => clearTimeout(timer);
    }
  }, [mostrarModalExito]);

  // Abrir Google Maps para seleccionar ubicación
  const abrirGoogleMaps = () => {
    window.open('https://www.google.com/maps/@-34.6037,-58.3816,12z?authuser=logisticacrosslog@gmail.com', '_blank');
  };

  // Guardar nueva ubicación
  const guardarNuevaUbicacion = (nombre: string, enlace: string, tipo: 'CARGA' | 'DESTINO' | 'AMBOS', horario?: string) => {
    try {
      guardarUbicacion({ nombre, enlace_google_maps: enlace, tipo, horario });
      // Recargar ubicaciones
      cargarUbicaciones();
    } catch (error) {
      // Si ya existe, solo mostramos en consola pero no alertamos al usuario
      console.log('Ubicación ya existe:', error);
      throw error; // Re-lanzamos para que el try-catch superior lo maneje
    }
  };

  // Buscar y cargar enlace guardado para punto de carga
  const buscarEnlaceCarga = (nombre: string) => {
    const todasUbicaciones = obtenerUbicacionesGuardadas();
    const encontrada = todasUbicaciones.find(u =>
      u.nombre.toLowerCase() === nombre.toLowerCase() &&
      (u.tipo === 'CARGA' || u.tipo === 'AMBOS')
    );
    if (encontrada) {
      setNuevoPuntoCarga(prev => ({
        ...prev,
        link_maps: encontrada.enlace_google_maps,
        horario_desde: encontrada.horario || ''
      }));
      setEnlaceCargaGuardado(encontrada.enlace_google_maps);
    } else {
      setEnlaceCargaGuardado('');
    }
  };

  // Buscar y cargar enlace guardado para destino
  const buscarEnlaceDestino = (nombre: string) => {
    const todasUbicaciones = obtenerUbicacionesGuardadas();
    const encontrada = todasUbicaciones.find(u =>
      u.nombre.toLowerCase() === nombre.toLowerCase() &&
      (u.tipo === 'DESTINO' || u.tipo === 'AMBOS')
    );
    if (encontrada) {
      setNuevoDestino(prev => ({
        ...prev,
        link_maps: encontrada.enlace_google_maps,
        horario_desde: encontrada.horario || ''
      }));
      setEnlaceDestinoGuardado(encontrada.enlace_google_maps);
    } else {
      setEnlaceDestinoGuardado('');
    }
  };

  // Agregar punto de carga a la lista
  const agregarPuntoCarga = () => {
    if (!nuevoPuntoCarga.nombre.trim()) {
      agregarNotificacion({
        tipo: 'advertencia',
        titulo: 'Campo Requerido',
        mensaje: 'Por favor ingresa el nombre del punto de carga'
      });
      return;
    }

    if (!nuevoPuntoCarga.link_maps) {
      agregarNotificacion({
        tipo: 'advertencia',
        titulo: 'Campo Requerido',
        mensaje: 'Por favor ingresa el link de Google Maps'
      });
      return;
    }

    if (!nuevoPuntoCarga.horario_desde) {
      agregarNotificacion({
        tipo: 'advertencia',
        titulo: 'Campo Requerido',
        mensaje: 'Por favor ingresa el horario de presentación'
      });
      return;
    }

    // Guardar ubicación si no existe (intentar, pero no bloquear si falla)
    if (!enlaceCargaGuardado) {
      try {
        guardarNuevaUbicacion(nuevoPuntoCarga.nombre, nuevoPuntoCarga.link_maps, 'AMBOS', nuevoPuntoCarga.horario_desde);
        console.log('✅ Ubicación guardada:', nuevoPuntoCarga.nombre);
      } catch (error) {
        // Si ya existe, no pasa nada, solo continuamos
        console.log('ℹ️ Ubicación ya existe en la base de datos o error al guardar:', error);
      }
    }

    // Agregar a la lista - SIEMPRE se debe ejecutar
    setFormData(prev => ({
      ...prev,
      puntos_carga: [...prev.puntos_carga, { ...nuevoPuntoCarga }]
    }));

    console.log('✅ Punto de carga agregado a la lista:', nuevoPuntoCarga);

    // Limpiar form
    setNuevoPuntoCarga({
      nombre: '',
      link_maps: '',
      horario_desde: ''
    });
    setEnlaceCargaGuardado('');
  };

  // Eliminar punto de carga
  const eliminarPuntoCarga = (index: number) => {
    const nuevosPuntos = formData.puntos_carga.filter((_, i) => i !== index);
    setFormData({ ...formData, puntos_carga: nuevosPuntos });
  };

  // Agregar destino a la lista
  const agregarDestino = () => {
    if (!nuevoDestino.nombre.trim() || !nuevoDestino.link_maps || !nuevoDestino.horario_desde) {
      agregarNotificacion({
        tipo: 'advertencia',
        titulo: 'Campos Requeridos',
        mensaje: 'Por favor completa todos los campos del destino'
      });
      return;
    }

    // Limitar a 7 destinos
    if (formData.destinos.length >= 7) {
      agregarNotificacion({
        tipo: 'advertencia',
        titulo: 'Límite Alcanzado',
        mensaje: 'Máximo 7 destinos permitidos'
      });
      return;
    }

    // Guardar ubicación si no existe (con horario)
    if (!enlaceDestinoGuardado) {
      try {
        guardarNuevaUbicacion(nuevoDestino.nombre, nuevoDestino.link_maps, 'DESTINO', nuevoDestino.horario_desde);
      } catch (error) {
        // Si ya existe, no pasa nada, solo continuamos
        console.log('Ubicación ya existe en la base de datos');
      }
    }

    // Verificar si el destino tiene requisitos especiales
    const requisito = buscarRequisitosCliente(nuevoDestino.nombre);
    if (requisito) {
      setAlertasDestinos(prev => [...prev, requisito]);
    }

    setFormData({
      ...formData,
      destinos: [...formData.destinos, nuevoDestino]
    });

    // Limpiar form de nuevo destino
    setNuevoDestino({
      nombre: '',
      link_maps: '',
      horario_desde: ''
    });
    setEnlaceDestinoGuardado('');
  };

  // Eliminar destino
  const eliminarDestino = (index: number) => {
    const nuevosDestinos = formData.destinos.filter((_, i) => i !== index);
    setFormData({ ...formData, destinos: nuevosDestinos });

    // Recalcular alertas
    const nuevasAlertas = nuevosDestinos
      .map(d => buscarRequisitosCliente(d.nombre))
      .filter(r => r !== null);
    setAlertasDestinos(nuevasAlertas);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validar HDR duplicado
      if (formData.numero_hdr.trim()) {
        const hdrDuplicado = viajes.some(v =>
          v.hdr_generado?.toLowerCase() === formData.numero_hdr.trim().toLowerCase()
        );
        if (hdrDuplicado) {
          agregarNotificacion({
            tipo: 'error',
            titulo: 'HDR Duplicado',
            mensaje: `Ya existe un viaje con el HDR "${formData.numero_hdr}". Por favor usa un HDR diferente.`
          });
          return;
        }
      }

      // Validar que haya al menos un punto de carga y un destino
      if (formData.puntos_carga.length === 0) {
        agregarNotificacion({
          tipo: 'advertencia',
          titulo: 'Falta Punto de Carga',
          mensaje: 'Debes agregar al menos un punto de carga'
        });
        return;
      }
      if (formData.destinos.length === 0) {
        agregarNotificacion({
          tipo: 'advertencia',
          titulo: 'Falta Destino',
          mensaje: 'Debes agregar al menos un destino'
        });
        return;
      }

      // Obtener info del cliente
      const clienteUpper = formData.cliente.toUpperCase().trim();
      const clienteInfo = clientesMap[clienteUpper];

      const cliente_id = clienteInfo?.id || clienteUpper.substring(0, 3).toUpperCase();
      const cliente_nombre = clienteInfo?.nombre || clienteUpper;

      // Construir detalles de ruta
      const detalles_ruta = [
        // Primero todos los puntos de carga
        ...formData.puntos_carga.map((punto, index) => ({
          numero: `C${index + 1}`,
          tipo: 'CARGA' as const,
          direccion: punto.nombre,
          horario_desde: punto.horario_desde,
          horario_hasta: punto.horario_desde, // Mismo horario ya que solo tenemos "desde"
          link_maps: punto.link_maps,
        })),
        // Luego todos los destinos
        ...formData.destinos.map((destino, index) => ({
          numero: `D${index + 1}`,
          tipo: 'DESCARGA' as const,
          direccion: destino.nombre,
          horario_desde: '00:00',
          horario_hasta: destino.horario_desde, // "Reciben hasta"
          link_maps: destino.link_maps,
        }))
      ];

      // Calcular tiempo límite de oferta en base a las horas ingresadas
      const horasLimite = Number(formData.tiempo_limite_oferta) || 24;
      const fechaLimite = new Date();
      fechaLimite.setHours(fechaLimite.getHours() + horasLimite);
      const tiempo_limite_iso = fechaLimite.toISOString();

      // Construir notas internas de forma limpia
      const partesNotas = [
        formData.numero_hdr ? `HDR: ${formData.numero_hdr}` : null,
        formData.tarifario ? `Tarifario: ${formData.tarifario}` : null,
        formData.notas_internas ? formData.notas_internas : null
      ].filter(Boolean); // Elimina valores null/undefined/vacíos

      const notasFinales = partesNotas.join(' | ');

      // Determinar estado y fletero según modo de asignación
      const estadoInicial = formData.modo_asignacion === 'directa' ? 'ASIGNADO' : 'PUBLICADO';
      const fleteroAsignado = formData.modo_asignacion === 'directa' ? formData.fletero_asignado : undefined;

      const HDR_viaje = await crearViaje(
        {
          cliente_id,
          cliente_nombre,
          fecha_viaje: formData.fecha_viaje,
          precio_base: 0, // Se calculará según tarifario
          tipo_unidad_requerida: formData.tipo_unidad_requerida,
          peso_kg: Number(formData.peso_kg) || 0,
          tipo_carga: formData.tipo_carga,
          tiempo_limite_oferta: tiempo_limite_iso,
          hdr_generado: formData.numero_hdr || '', // HDR del usuario
          notas_internas: notasFinales,
          detalles_ruta,
        },
        estadoInicial,
        fleteroAsignado
      );

      // Construir detalles de ruta para el mensaje
      let detalleRuta = '\n\n📍 RUTA:\n';

      // Puntos de carga
      formData.puntos_carga.forEach((punto, idx) => {
        detalleRuta += `\n🔵 CARGA ${idx + 1}: ${punto.nombre}\n`;
        detalleRuta += `   ⏰ Horario: ${punto.horario_desde}\n`;
        detalleRuta += `   📍 Maps: ${punto.link_maps}\n`;
      });

      // Destinos
      formData.destinos.forEach((destino, idx) => {
        detalleRuta += `\n🔴 DESCARGA ${idx + 1}: ${destino.nombre}\n`;
        detalleRuta += `   ⏰ Reciben hasta: ${destino.horario_desde}\n`;
        detalleRuta += `   📍 Maps: ${destino.link_maps}\n`;
      });

      // Recolectar TODAS las alertas (de destinos + cliente)
      const todasLasAlertas = [];

      // Alertas de destinos
      formData.destinos.forEach(destino => {
        const req = buscarRequisitosCliente(destino.nombre);
        if (req) {
          todasLasAlertas.push(req);
        }
      });

      // Alerta del cliente
      const reqCliente = buscarRequisitosCliente(cliente_nombre);
      if (reqCliente) {
        todasLasAlertas.push(reqCliente);
      }

      // Guardar datos para el modal de éxito
      const datosModal = {
        hdr: formData.numero_hdr || HDR_viaje,
        cliente: cliente_nombre,
        fecha: formData.fecha_viaje,
        tarifa: formData.tarifario,
        unidad: formData.tipo_unidad_requerida,
        peso: formData.peso_kg,
        tipo_carga: formData.tipo_carga,
        puntos_carga: formData.puntos_carga,
        destinos: formData.destinos,
        alertas: todasLasAlertas,
        estado: estadoInicial,
        fletero_asignado: fleteroAsignado
      };

      console.log('🎉 MODAL DATOS:', datosModal);
      console.log('🎉 ALERTAS ENCONTRADAS:', todasLasAlertas);
      setDatosViajeCreado(datosModal);

      // Mostrar modal de éxito
      console.log('🎉 MOSTRANDO MODAL DE ÉXITO');
      setMostrarModalExito(true);
    } catch (error) {
      console.error('Error al crear viaje:', error);
      agregarNotificacion({
        tipo: 'error',
        titulo: 'Error al Crear Viaje',
        mensaje: (error as Error).message || 'Error desconocido al crear viaje'
      });
    }
  };

  return (
    <div className="mb-6 bg-white border-2 border-green-200 rounded-xl p-6 shadow-lg">
      {/* Header con branding */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-lg p-4 mb-6">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-3xl">🚛</span>
          Crosslog - Nuevo Viaje
        </h3>
        <p className="text-sm text-green-100 mt-1">Complete los datos del viaje para publicar en el marketplace</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        {/* Numero HDR */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Número HDR</label>
          <input
            type="text"
            value={formData.numero_hdr}
            onChange={(e) => setFormData({ ...formData, numero_hdr: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="HDR del viaje (ej: TOY-001)"
          />
          <p className="text-xs text-gray-500 mt-1">ID único del viaje</p>
        </div>

        {/* Cliente */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente</label>
          <input
            type="text"
            value={formData.cliente}
            onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="TOYOTA, ECOLAB, ACONCAGUA..."
            required
            list="clientes-list"
          />
          <datalist id="clientes-list">
            <option value="TOYOTA" />
            <option value="ECOLAB" />
            <option value="ACONCAGUA" />
            <option value="APN" />
            <option value="INQUIMEX" />
          </datalist>
        </div>

        {/* Fecha */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha de viaje</label>
          <input
            type="date"
            value={formData.fecha_viaje}
            onChange={(e) => setFormData({ ...formData, fecha_viaje: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Tarifario */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Tarifario (Km)</label>
          <select
            value={formData.tarifario}
            onChange={(e) => setFormData({ ...formData, tarifario: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Seleccionar tarifario...</option>
            <option value="reparto">reparto (179 km)</option>
            <option value="ypf">ypf (250 km)</option>
            <option value="bahia blanca">bahia blanca (1365 km)</option>
            <option value="baradero">baradero (203 km)</option>
            <option value="bernal">bernal (170 km)</option>
            <option value="carga nocturna">carga nocturna</option>
            <option value="cañuelas">cañuelas (189 km)</option>
            <option value="chacabuco">chacabuco (339 km)</option>
            <option value="chascomus">chascomus (384 km)</option>
            <option value="cordoba extendido">cordoba extendido (1300 km)</option>
            <option value="coronel suarez">coronel suarez (1096 km)</option>
            <option value="junin">junin (448 km)</option>
            <option value="magdalena">magdalena (337 km)</option>
            <option value="pgsm">pgsm (562 km)</option>
            <option value="rio negro">rio negro</option>
            <option value="rosario">rosario (500 km)</option>
            <option value="san andres de giles">san andres de giles (125 km)</option>
            <option value="san nicolas">san nicolas (378 km)</option>
            <option value="santa fe extendido">santa fe extendido (800 km)</option>
            <option value="santa fe">santa fe (800 km)</option>
            <option value="salta">salta</option>
            <option value="zarate">zarate (82 km)</option>
            <option value="zarate generales">zarate generales (82 km)</option>
            <option value="pergamino">pergamino (339 km)</option>
            <option value="interplanta bonificado">interplanta bonificado</option>
            <option value="esteban echeverria">esteban echeverria (182 km)</option>
            <option value="la plata">la plata (247 km)</option>
            <option value="la plata generales">la plata generales (247 km)</option>
            <option value="reparto generales">reparto generales (179 km)</option>
            <option value="Lezama">Lezama (455 km)</option>
            <option value="Puerto">Puerto</option>
            <option value="Tandil">Tandil (840 km)</option>
            <option value="MER/COP/YPF">MER/COP/YPF (475 km)</option>
            <option value="DON/YPF">DON/YPF (337 km)</option>
            <option value="DON/MER">DON/MER (250 km)</option>
            <option value="San Luis">San Luis (1373 km)</option>
            <option value="Mendoza">Mendoza (2058 km)</option>
            <option value="COP/YPF/COP">COP/YPF/COP (375 km)</option>
            <option value="neuquen">neuquen</option>
            <option value="DON/COP/YPF/COP">DON/COP/YPF/COP</option>
            <option value="TIMBUES">TIMBUES</option>
            <option value="Hasta 60 km">Hasta 60 km</option>
            <option value="Hasta 90 km">Hasta 90 km</option>
            <option value="Hasta 120 km">Hasta 120 km</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Define precio según km</p>
        </div>

        {/* Tipo Unidad */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de unidad</label>
          <select
            value={formData.tipo_unidad_requerida}
            onChange={(e) => setFormData({ ...formData, tipo_unidad_requerida: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Seleccionar...</option>
            <option value="Semi">Semi</option>
            <option value="Balancín">Balancín</option>
            <option value="Chasis">Chasis</option>
            <option value="F100">F100</option>
          </select>
        </div>

        {/* Peso */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Peso (kg)</label>
          <input
            type="number"
            min="1"
            max="30000"
            value={formData.peso_kg}
            onChange={(e) => setFormData({ ...formData, peso_kg: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="25000"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Máximo: 30,000 kg</p>
        </div>

        {/* Tipo Carga */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de carga</label>
          <select
            value={formData.tipo_carga}
            onChange={(e) => setFormData({ ...formData, tipo_carga: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="GENERALES">Generales</option>
            <option value="PELIGROSA">Peligrosa</option>
          </select>
        </div>


        {/* SECCIÓN: LUGAR DE CARGA */}
        <div className="col-span-2 mt-4 border-t-2 border-gray-200 pt-4">
          <h4 className="text-lg font-bold text-gray-800 mb-3">📦 Lugar de Carga</h4>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del lugar</label>
              <input
                type="text"
                value={nuevoPuntoCarga.nombre}
                onChange={(e) => {
                  const valor = e.target.value;

                  // Buscar automáticamente mientras escribe
                  if (valor.trim()) {
                    setNuevoPuntoCarga(prev => ({ ...prev, nombre: valor }));
                    buscarEnlaceCarga(valor);
                  } else {
                    // Limpiar todo si borra el nombre
                    setNuevoPuntoCarga({ nombre: '', link_maps: '', horario_desde: '' });
                    setEnlaceCargaGuardado('');
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Escribe para buscar..."
                list="ubicaciones-carga-list"
              />
              <datalist id="ubicaciones-carga-list">
                {ubicacionesCarga
                  .filter(ub =>
                    nuevoPuntoCarga.nombre === '' ||
                    ub.nombre.toLowerCase().includes(nuevoPuntoCarga.nombre.toLowerCase())
                  )
                  .map((ub, idx) => (
                    <option key={idx} value={ub.nombre} />
                  ))
                }
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Link Google Maps</label>
              <input
                type="url"
                value={nuevoPuntoCarga.link_maps}
                onChange={(e) => setNuevoPuntoCarga({ ...nuevoPuntoCarga, link_maps: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="https://maps.google.com/..."
              />
              {enlaceCargaGuardado && (
                <p className="text-xs text-green-600 mt-1">✓ Ubicación ya guardada</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Horario de Presentación</label>
              <input
                type="time"
                value={nuevoPuntoCarga.horario_desde}
                onChange={(e) => setNuevoPuntoCarga({ ...nuevoPuntoCarga, horario_desde: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={abrirGoogleMaps}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              📍 Ver Maps
            </button>
            <button
              type="button"
              onClick={agregarPuntoCarga}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-bold shadow-lg text-sm"
            >
              ➕ AGREGAR PUNTO DE CARGA
            </button>
          </div>

          {/* Alertas de requisitos para punto de carga */}
          {nuevoPuntoCarga.nombre && buscarRequisitosCliente(nuevoPuntoCarga.nombre) && (
            <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className="text-xl">⚠️</span>
                <div className="flex-1">
                  <p className="font-semibold text-yellow-900 text-sm">
                    {getIconoRequisito(buscarRequisitosCliente(nuevoPuntoCarga.nombre)!.tipo)} {buscarRequisitosCliente(nuevoPuntoCarga.nombre)!.nombre}
                  </p>
                  <p className="text-xs text-yellow-800 mt-1">
                    {buscarRequisitosCliente(nuevoPuntoCarga.nombre)!.descripcion}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PUNTO DE CARGA - Lista de cargas agregadas */}
          {formData.puntos_carga.length > 0 && (
            <div className="mt-4">
              <h5 className="text-md font-bold text-gray-800 mb-2">📍 PUNTOS DE CARGA</h5>
              <div className="space-y-2">
                {formData.puntos_carga.map((punto, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-500">{index + 1}.</span>
                      <span className="font-semibold text-gray-800">{punto.nombre}</span>
                      <span className="text-sm text-gray-600">- {punto.horario_desde}</span>
                      <div className="ml-auto flex gap-2">
                        <a
                          href={punto.link_maps}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors flex items-center gap-1"
                          title="Ver en Google Maps"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Maps
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(punto.link_maps);
                            agregarNotificacion({
                              tipo: 'exito',
                              titulo: 'Link Copiado',
                              mensaje: 'El enlace ha sido copiado al portapapeles'
                            });
                          }}
                          className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors flex items-center gap-1"
                          title="Copiar link"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          Copiar
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarPuntoCarga(index)}
                          className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors flex items-center gap-1"
                          title="Eliminar"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SECCIÓN: DESTINOS/ENTREGAS */}
        <div className="col-span-2 mt-4">
          <h4 className="text-lg font-bold text-gray-800 mb-3">🚚 Destinos de Entrega</h4>

          {/* Agregar Nuevo Destino */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre Planta</label>
                <input
                  type="text"
                  value={nuevoDestino.nombre}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setNuevoDestino(prev => ({ ...prev, nombre: valor }));

                    // Buscar automáticamente mientras escribe
                    if (valor.trim()) {
                      buscarEnlaceDestino(valor);
                    } else {
                      // Limpiar todo si borra el nombre
                      setNuevoDestino({ nombre: '', link_maps: '', horario_desde: '' });
                      setEnlaceDestinoGuardado('');
                    }
                  }}
                  onBlur={(e) => {
                    // IMPORTANTE: cuando pierde foco (después de seleccionar del datalist), buscar nuevamente
                    const valor = e.target.value.trim();
                    if (valor) {
                      buscarEnlaceDestino(valor);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Escribe para buscar..."
                  list="ubicaciones-destino-list"
                />
                <datalist id="ubicaciones-destino-list">
                  {ubicacionesDestino
                    .filter(ub =>
                      nuevoDestino.nombre === '' ||
                      ub.nombre.toLowerCase().includes(nuevoDestino.nombre.toLowerCase())
                    )
                    .map((ub, idx) => (
                      <option key={idx} value={ub.nombre} />
                    ))
                  }
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Link Google Maps</label>
                <input
                  type="url"
                  value={nuevoDestino.link_maps}
                  onChange={(e) => setNuevoDestino({ ...nuevoDestino, link_maps: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://maps.google.com/..."
                />
                {enlaceDestinoGuardado && (
                  <p className="text-xs text-green-600 mt-1">✓ Ubicación ya guardada</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Reciben hasta</label>
                <input
                  type="time"
                  value={nuevoDestino.horario_desde}
                  onChange={(e) => setNuevoDestino({ ...nuevoDestino, horario_desde: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={abrirGoogleMaps}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                📍 Ver Maps
              </button>
              <button
                type="button"
                onClick={agregarDestino}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-bold shadow-lg text-lg"
                disabled={formData.destinos.length >= 7}
              >
                💾 Guardar y Agregar Destino a Lista
              </button>
            </div>
            {formData.destinos.length >= 7 && (
              <p className="text-xs text-red-600 mt-2 text-center">Máximo 7 destinos alcanzado</p>
            )}
          </div>

          {/* Lista de Destinos */}
          {formData.destinos.length > 0 && (
            <div className="space-y-2 mb-4">
              {formData.destinos.map((destino, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">{destino.nombre}</span>
                    <span className="text-sm text-gray-600">- Horario de recepción hasta ⏰ {destino.horario_desde}</span>
                    <div className="ml-auto flex gap-2">
                      {destino.link_maps && (
                        <>
                          <a
                            href={destino.link_maps}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors flex items-center gap-1"
                            title="Ver en Google Maps"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Maps
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(destino.link_maps);
                              agregarNotificacion({
                                tipo: 'exito',
                                titulo: 'Link Copiado',
                                mensaje: 'El enlace ha sido copiado al portapapeles'
                              });
                            }}
                            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors flex items-center gap-1"
                            title="Copiar link"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            Copiar
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => eliminarDestino(index)}
                        className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors flex items-center gap-1"
                        title="Eliminar"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Avisos y Recordatorios */}
          {alertasDestinos.length > 0 && (
            <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-xl">💡</span>
                <div>
                  <h5 className="font-bold text-blue-900 text-sm">Recordatorios para este viaje</h5>
                  <p className="text-xs text-blue-700 mt-1">
                    Verifica estos requisitos antes de asignar fleteros (habilitaciones, documentación en plataformas, restricciones horarias)
                  </p>
                </div>
              </div>

              <div className="space-y-2 mt-3">
                {alertasDestinos.map((alerta, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-3 ${getColorNivel(alerta.nivel)}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{getIconoRequisito(alerta.tipo)}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{alerta.nombre}</p>
                        <p className="text-xs mt-1 leading-relaxed">{alerta.descripcion}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tiempo Límite Oferta */}
        <div className="col-span-2 mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Tiempo límite para ofertas (horas)</label>
          <input
            type="number"
            min="1"
            max="72"
            step="1"
            value={formData.tiempo_limite_oferta}
            onChange={(e) => setFormData({ ...formData, tiempo_limite_oferta: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ej: 24 (horas)"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Ingrese la cantidad de horas antes del viaje para recibir ofertas</p>
        </div>

        {/* Notas */}
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Notas internas (opcional)</label>
          <textarea
            value={formData.notas_internas}
            onChange={(e) => setFormData({ ...formData, notas_internas: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Información adicional..."
          />
        </div>

        {/* SECCIÓN: MODO DE ASIGNACIÓN */}
        <div className="col-span-2 mt-6">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-300">
            <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Modo de Asignación
            </h4>

            <div className="space-y-4">
              {/* Opción: Marketplace */}
              <label className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                formData.modo_asignacion === 'marketplace'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="modo_asignacion"
                  value="marketplace"
                  checked={formData.modo_asignacion === 'marketplace'}
                  onChange={(e) => setFormData({ ...formData, modo_asignacion: 'marketplace', fletero_asignado: '' })}
                  className="mt-1 w-5 h-5 text-green-600 focus:ring-green-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">Publicar en Marketplace</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">Opcional</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Los fleteros pueden ver el viaje y aceptarlo. Tú eliges de los que aceptaron.
                  </p>
                </div>
              </label>

              {/* Opción: Asignación Directa */}
              <label className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                formData.modo_asignacion === 'directa'
                  ? 'border-gray-700 bg-gray-50'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="modo_asignacion"
                  value="directa"
                  checked={formData.modo_asignacion === 'directa'}
                  onChange={(e) => setFormData({ ...formData, modo_asignacion: 'directa' })}
                  className="mt-1 w-5 h-5 text-gray-700 focus:ring-gray-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">Asignación Directa</span>
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-semibold">Obligatorio</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Asignar el viaje directamente a un fletero específico. No pasa por marketplace.
                  </p>

                  {/* Selector de Fletero - Solo visible si se selecciona directa */}
                  {formData.modo_asignacion === 'directa' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Fletero Asignado *</label>
                      <select
                        value={formData.fletero_asignado}
                        onChange={(e) => setFormData({ ...formData, fletero_asignado: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white"
                        required={formData.modo_asignacion === 'directa'}
                      >
                        <option value="">Seleccionar fletero...</option>
                        <option value="BARCO">BARCO</option>
                        <option value="PRODAN">PRODAN</option>
                        <option value="LOGZO">LOGZO</option>
                        <option value="DON PEDRO">DON PEDRO</option>
                        <option value="CALLTRUCK">CALLTRUCK</option>
                        <option value="FALZONE">FALZONE</option>
                        <option value="ANDROSIUK">ANDROSIUK</option>
                        <option value="VIMAAB">VIMAAB</option>
                      </select>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="col-span-2 flex gap-3 justify-end mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Creando...' : '✅ Crear Viaje'}
          </button>
        </div>
      </form>

      {/* Modal de Éxito Profesional - Estilo Card */}
      {mostrarModalExito && datosViajeCreado && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-gray-200 animate-scale-in">
            {/* Header - Similar a las cards */}
            <div className="bg-gradient-to-r from-[#374151] to-[#1f2937] text-white p-5 rounded-t-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-2xl font-bold">✅ Viaje Creado</h3>
                <button
                  onClick={() => {
                    setMostrarModalExito(false);
                    onCreado();
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Mensaje de estado */}
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-sm font-semibold">
                  {datosViajeCreado.estado === 'ASIGNADO'
                    ? `🚛 Viaje asignado a ${datosViajeCreado.fletero_asignado?.toUpperCase() || 'FLETERO'}`
                    : '📢 Viaje publicado en Marketplace'}
                </p>
              </div>
            </div>

            {/* Contenido - Estilo card marketplace */}
            <div className="p-5 space-y-4">
              {/* HDR, Cliente y Tarifa */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-3">
                  <p className="text-xs text-gray-600 font-bold mb-1">HDR</p>
                  <p className="text-base font-bold text-gray-900">{datosViajeCreado.hdr}</p>
                </div>
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
                  <p className="text-xs text-blue-700 font-bold mb-1">CLIENTE</p>
                  <p className="text-base font-bold text-blue-900">{datosViajeCreado.cliente}</p>
                </div>
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
                  <p className="text-xs text-green-700 font-bold mb-1">TARIFA</p>
                  <p className="text-base font-bold text-green-900 uppercase">{datosViajeCreado.tarifa}</p>
                </div>
              </div>

              {/* Info del viaje */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-semibold text-gray-700">Fecha:</span> {datosViajeCreado.fecha}
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <span className="font-semibold text-gray-700">Unidad:</span> {datosViajeCreado.unidad}
                  <span className="mx-2">•</span>
                  <span className="font-semibold text-gray-700">Peso:</span> {Math.round(Number(datosViajeCreado.peso) / 1000)} TON
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className="font-semibold text-gray-700">Tipo:</span> {datosViajeCreado.tipo_carga}
                </div>
              </div>

              {/* Ruta - Similar a las cards */}
              <div className="border-2 border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Puntos de Carga
                </h4>
                <div className="space-y-2">
                  {datosViajeCreado.puntos_carga.map((punto, idx) => (
                    <div key={idx} className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-2">
                      <p className="text-sm font-bold text-blue-900">{punto.nombre}</p>
                      <p className="text-xs text-blue-700">⏰ {punto.horario_desde}</p>
                    </div>
                  ))}
                </div>

                <h4 className="font-bold text-gray-800 mt-4 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Puntos de Descarga
                </h4>
                <div className="space-y-2">
                  {datosViajeCreado.destinos.map((destino, idx) => (
                    <div key={idx} className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-2">
                      <p className="text-sm font-bold text-red-900">{destino.nombre}</p>
                      <p className="text-xs text-red-700">⏰ Hasta {destino.horario_desde}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Requerimientos */}
              {datosViajeCreado.alertas && datosViajeCreado.alertas.length > 0 && (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-700 rounded-r-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Requerimientos
                  </h4>
                  <div className="space-y-1">
                    {datosViajeCreado.alertas.map((alerta, index) => (
                      <p key={index} className="text-sm text-gray-700">
                        • <span className="font-semibold">{alerta.nombre}:</span> {alerta.descripcion}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Botón de Cerrar */}
              <button
                onClick={() => {
                  setMostrarModalExito(false);
                  onCreado();
                }}
                className="w-full bg-gradient-to-r from-[#a8e063] to-[#56ab2f] text-white py-3 rounded-lg font-bold hover:from-[#56ab2f] hover:to-[#a8e063] transition-all shadow-lg hover:shadow-xl"
              >
                ✓ Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
