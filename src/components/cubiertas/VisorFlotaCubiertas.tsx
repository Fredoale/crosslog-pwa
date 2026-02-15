/**
 * VISOR DE FLOTA DE CUBIERTAS - ADMINISTRACIÓN
 * Vista general del estado de cubiertas de toda la flota
 */

import { useState, useEffect } from 'react';
import { DiagramaVehiculo } from './DiagramaVehiculo';
import type {
  EstadoCubiertasUnidad,
  AlertaCubierta,
  ResumenFlotaCubiertas,
  CubiertaEnPosicion,
} from '../../types/cubiertas';
import { CONFIG_CUBIERTAS } from '../../types/cubiertas';
import {
  obtenerEstadoCubiertasUnidad,
  obtenerAlertasFlota,
  obtenerResumenFlota,
  UNIDADES_CONFIG,
} from '../../services/cubiertasService';

interface VisorFlotaCubiertasProps {
  onVerDetalle?: (unidadNumero: string) => void;
  onGenerarOT?: (datos: { unidadNumero: string; descripcion: string }) => void;
}

type FiltroSector = 'todos' | 'distribucion' | 'vrac';
type FiltroEstado = 'todos' | 'critico' | 'regular' | 'ok';

export function VisorFlotaCubiertas({ onGenerarOT }: VisorFlotaCubiertasProps) {
  // Estados
  const [resumen, setResumen] = useState<ResumenFlotaCubiertas | null>(null);
  const [alertas, setAlertas] = useState<AlertaCubierta[]>([]);
  const [unidadesEstado, setUnidadesEstado] = useState<Map<string, EstadoCubiertasUnidad>>(new Map());
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroSector, setFiltroSector] = useState<FiltroSector>('todos');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [busqueda, setBusqueda] = useState('');

  // Vista
  const [vistaActiva, setVistaActiva] = useState<'grid' | 'alertas'>('grid');

  // Modal de detalle
  const [modalUnidad, setModalUnidad] = useState<EstadoCubiertasUnidad | null>(null);
  const [cubiertaSeleccionada, setCubiertaSeleccionada] = useState<CubiertaEnPosicion | null>(null);
  const [loadingModal, setLoadingModal] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resumenData, alertasData] = await Promise.all([
        obtenerResumenFlota(),
        obtenerAlertasFlota(),
      ]);

      setResumen(resumenData);
      setAlertas(alertasData);

      const unidadesConAlertas = [...new Set(alertasData.map(a => a.unidadNumero))];
      const estadosMap = new Map<string, EstadoCubiertasUnidad>();

      const unidadesACargar = unidadesConAlertas.slice(0, 10);
      if (unidadesACargar.length < 10) {
        const otrasUnidades = UNIDADES_CONFIG
          .filter(u => !unidadesACargar.includes(u.numero))
          .slice(0, 10 - unidadesACargar.length)
          .map(u => u.numero);
        unidadesACargar.push(...otrasUnidades);
      }

      for (const numero of unidadesACargar) {
        const estado = await obtenerEstadoCubiertasUnidad(numero);
        if (estado) {
          estadosMap.set(numero, estado);
        }
      }

      setUnidadesEstado(estadosMap);
    } catch (error) {
      console.error('Error cargando datos flota:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar unidades
  const unidadesFiltradas = UNIDADES_CONFIG.filter(unidad => {
    if (busqueda && !unidad.numero.includes(busqueda) && !unidad.patente.toLowerCase().includes(busqueda.toLowerCase())) {
      return false;
    }
    if (filtroSector !== 'todos' && unidad.sector !== filtroSector) {
      return false;
    }
    if (filtroEstado !== 'todos') {
      const estado = unidadesEstado.get(unidad.numero);
      if (!estado) return filtroEstado === 'ok';
      if (filtroEstado === 'critico' && estado.alertasCriticas === 0) return false;
      if (filtroEstado === 'regular' && estado.alertasRegulares === 0 && estado.alertasCriticas > 0) return false;
      if (filtroEstado === 'ok' && (estado.alertasCriticas > 0 || estado.alertasRegulares > 0)) return false;
    }
    return true;
  });

  const getEstadoUnidad = (numero: string) => unidadesEstado.get(numero) || null;

  const cargarEstadoUnidad = async (numero: string) => {
    if (unidadesEstado.has(numero)) return;
    const estado = await obtenerEstadoCubiertasUnidad(numero);
    if (estado) {
      setUnidadesEstado(prev => new Map(prev).set(numero, estado));
    }
  };

  // Abrir modal de detalle de unidad
  const abrirModalDetalle = async (numero: string) => {
    setLoadingModal(true);
    setCubiertaSeleccionada(null);

    let estado: EstadoCubiertasUnidad | null = unidadesEstado.get(numero) || null;
    if (!estado) {
      estado = await obtenerEstadoCubiertasUnidad(numero);
      if (estado) {
        setUnidadesEstado(prev => new Map(prev).set(numero, estado as EstadoCubiertasUnidad));
      }
    }

    if (estado) {
      setModalUnidad(estado);
    }
    setLoadingModal(false);
  };

  // Seleccionar cubierta en el modal
  const handleSeleccionarCubierta = (posicionId: string, cubierta: CubiertaEnPosicion | null) => {
    if (cubierta) {
      setCubiertaSeleccionada(cubierta);
    }
  };

  // Obtener color de desgaste
  const getColorDesgaste = (mm: number | undefined) => {
    if (mm === undefined) return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Sin datos' };
    if (mm >= CONFIG_CUBIERTAS.UMBRAL_BUENO) return { bg: 'bg-green-100', text: 'text-green-600', label: 'BUENO' };
    if (mm >= CONFIG_CUBIERTAS.UMBRAL_CRITICO) return { bg: 'bg-amber-100', text: 'text-amber-600', label: 'REGULAR' };
    return { bg: 'bg-red-100', text: 'text-red-600', label: 'CRÍTICO' };
  };

  // Calcular porcentaje de desgaste (asumiendo 12mm como nuevo)
  const calcularPorcentajeDesgaste = (mm: number | undefined) => {
    if (mm === undefined) return 0;
    const PROFUNDIDAD_NUEVA = 12;
    const porcentaje = (mm / PROFUNDIDAD_NUEVA) * 100;
    return Math.min(100, Math.max(0, porcentaje));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a2332] to-[#2d3748] rounded-xl p-4 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
                <circle cx="12" cy="12" r="3" strokeWidth={2} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold">Control de Cubiertas - Flota</h2>
              <p className="text-sm text-gray-300">Estado general de neumáticos</p>
            </div>
          </div>

          {resumen && (
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{resumen.totalCubiertas}</p>
                <p className="text-xs text-gray-300">Cubiertas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{resumen.alertasCriticas}</p>
                <p className="text-xs text-gray-300">Críticas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">{resumen.alertasRegulares}</p>
                <p className="text-xs text-gray-300">Regulares</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Panel de Estadísticas */}
      {resumen && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{resumen.totalUnidades}</p>
                <p className="text-xs text-gray-500">Unidades</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" strokeWidth={2} />
                  <circle cx="12" cy="12" r="3" strokeWidth={2} />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{resumen.totalCubiertas}</p>
                <p className="text-xs text-gray-500">Cubiertas Total</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{resumen.cubiertasBuenas || 0}</p>
                <p className="text-xs text-gray-500">Buen Estado</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{resumen.alertasRegulares}</p>
                <p className="text-xs text-gray-500">Desgaste Regular</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{resumen.alertasCriticas}</p>
                <p className="text-xs text-gray-500">Estado Crítico</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{resumen.enRecapado || 0}</p>
                <p className="text-xs text-gray-500">En Recapado</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros y vistas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar unidad..."
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-40"
            />
            <select
              value={filtroSector}
              onChange={(e) => setFiltroSector(e.target.value as FiltroSector)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los sectores</option>
              <option value="distribucion">Distribución</option>
              <option value="vrac">VRAC</option>
            </select>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="critico">Con alertas críticas</option>
              <option value="regular">Con alertas regulares</option>
              <option value="ok">Sin alertas</option>
            </select>
          </div>

          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setVistaActiva('grid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                vistaActiva === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setVistaActiva('alertas')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                vistaActiva === 'alertas' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Alertas ({alertas.length})
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-600">Cargando estado de la flota...</p>
        </div>
      )}

      {/* Vista Grid */}
      {!loading && vistaActiva === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {unidadesFiltradas.map(unidad => {
            const estado = getEstadoUnidad(unidad.numero);

            return (
              <div
                key={unidad.numero}
                className={`bg-white rounded-xl shadow-sm border-2 transition-all hover:shadow-md cursor-pointer ${
                  estado?.alertasCriticas ? 'border-red-300' :
                  estado?.alertasRegulares ? 'border-amber-300' :
                  'border-gray-200'
                }`}
                onClick={() => abrirModalDetalle(unidad.numero)}
                onMouseEnter={() => cargarEstadoUnidad(unidad.numero)}
              >
                <div className={`px-4 py-3 border-b ${
                  estado?.alertasCriticas ? 'bg-red-50 border-red-200' :
                  estado?.alertasRegulares ? 'bg-amber-50 border-amber-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800">INT-{unidad.numero}</h3>
                      <p className="text-xs text-gray-500">{unidad.patente}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      unidad.sector === 'distribucion' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {unidad.sector.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  {estado ? (
                    <>
                      <div className="mb-3">
                        <DiagramaVehiculo
                          configuracion={estado.configuracion}
                          cubiertas={estado.cubiertas}
                          auxilios={estado.auxilios}
                          compacto={true}
                          mostrarNumeros={false}
                        />
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {estado.cubiertasInstaladas}/{estado.totalCubiertas} cubiertas
                        </span>
                        {estado.alertasCriticas > 0 && (
                          <span className="text-red-600 font-semibold">{estado.alertasCriticas} críticas</span>
                        )}
                        {estado.alertasCriticas === 0 && estado.alertasRegulares > 0 && (
                          <span className="text-amber-600 font-semibold">{estado.alertasRegulares} regulares</span>
                        )}
                        {estado.alertasCriticas === 0 && estado.alertasRegulares === 0 && (
                          <span className="text-green-600 font-semibold">OK</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="h-24 flex items-center justify-center">
                      <p className="text-gray-400 text-sm">Hover para cargar</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vista Alertas */}
      {!loading && vistaActiva === 'alertas' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {alertas.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">Sin alertas activas</p>
              <p className="text-gray-400 text-sm mt-1">Todas las cubiertas están en buen estado</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              <div className="px-4 py-3 bg-gray-50 grid grid-cols-12 gap-4 text-sm font-semibold text-gray-600">
                <div className="col-span-2">Unidad</div>
                <div className="col-span-2">Posición</div>
                <div className="col-span-2">Cubierta</div>
                <div className="col-span-3">Alerta</div>
                <div className="col-span-2">Prioridad</div>
                <div className="col-span-1"></div>
              </div>

              {alertas.map(alerta => (
                <div
                  key={alerta.id}
                  className={`px-4 py-3 grid grid-cols-12 gap-4 items-center text-sm hover:bg-gray-50 cursor-pointer ${
                    alerta.prioridad === 'ALTA' ? 'bg-red-50' :
                    alerta.prioridad === 'MEDIA' ? 'bg-amber-50' : ''
                  }`}
                  onClick={() => abrirModalDetalle(alerta.unidadNumero)}
                >
                  <div className="col-span-2">
                    <span className="font-semibold">INT-{alerta.unidadNumero}</span>
                  </div>
                  <div className="col-span-2 text-gray-600">{alerta.posicion}</div>
                  <div className="col-span-2 font-mono text-gray-700">{alerta.cubiertaCodigo}</div>
                  <div className="col-span-3">
                    <p className="text-gray-800">{alerta.mensaje}</p>
                    {alerta.profundidadMm !== undefined && (
                      <span className={`text-xs font-semibold ${
                        alerta.profundidadMm < CONFIG_CUBIERTAS.UMBRAL_CRITICO ? 'text-red-600' : 'text-amber-600'
                      }`}>
                        {alerta.profundidadMm} mm
                      </span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      alerta.prioridad === 'ALTA' ? 'bg-red-100 text-red-700' :
                      alerta.prioridad === 'MEDIA' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {alerta.prioridad}
                    </span>
                  </div>
                  <div className="col-span-1 flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); abrirModalDetalle(alerta.unidadNumero); }}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Ver detalle"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mensaje si no hay unidades filtradas */}
      {!loading && vistaActiva === 'grid' && unidadesFiltradas.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-600">No se encontraron unidades con los filtros seleccionados</p>
        </div>
      )}

      {/* MODAL DE DETALLE DE UNIDAD */}
      {(modalUnidad || loadingModal) && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-1 sm:p-4"
        >
          <div
            className="bg-white rounded-2xl w-full max-w-5xl max-h-[98vh] sm:max-h-[95vh] overflow-hidden flex flex-col"
          >
            {loadingModal ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-gray-600">Cargando detalle...</p>
              </div>
            ) : modalUnidad && (
              <>
                {/* Header del modal */}
                <div className="bg-gradient-to-r from-[#1a2332] to-[#2d3748] text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" strokeWidth={2} />
                        <circle cx="12" cy="12" r="3" strokeWidth={2} />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">INT-{modalUnidad.unidadNumero}</h3>
                      <p className="text-sm text-gray-300">
                        {modalUnidad.configuracion.nombre} - {modalUnidad.cubiertasInstaladas}/{modalUnidad.totalCubiertas} cubiertas
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setModalUnidad(null); setCubiertaSeleccionada(null); }}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Contenido del modal */}
                <div className="flex-1 overflow-y-auto p-2 sm:p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Diagrama grande */}
                    <div className="bg-gray-50 rounded-xl p-2 sm:p-4">
                      <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                        </svg>
                        Diagrama del Vehículo
                      </h4>
                      <p className="text-sm text-gray-500 mb-4">Selecciona una cubierta para ver su detalle</p>
                      <DiagramaVehiculo
                        configuracion={modalUnidad.configuracion}
                        cubiertas={modalUnidad.cubiertas}
                        auxilios={modalUnidad.auxilios}
                        onPosicionClick={handleSeleccionarCubierta}
                        mostrarNumeros={true}
                      />
                    </div>

                    {/* Panel de detalle de cubierta */}
                    <div className="space-y-4">
                      {cubiertaSeleccionada ? (
                        <>
                          {/* Diagrama de cubierta individual */}
                          <div className={`rounded-xl p-3 sm:p-6 ${
                            cubiertaSeleccionada.estadoDesgaste === 'CRITICO' ? 'bg-red-50 border-2 border-red-200' :
                            cubiertaSeleccionada.estadoDesgaste === 'REGULAR' ? 'bg-amber-50 border-2 border-amber-200' :
                            cubiertaSeleccionada.estadoDesgaste === 'BUENO' ? 'bg-green-50 border-2 border-green-200' :
                            'bg-gray-50 border-2 border-gray-200'
                          }`}>
                            <div className="flex items-start gap-3 sm:gap-6">
                              {/* SVG de cubierta individual */}
                              <div className="flex-shrink-0">
                                <svg className="w-20 h-20 sm:w-[120px] sm:h-[120px]" viewBox="0 0 120 120">
                                  {/* Cubierta exterior */}
                                  <circle
                                    cx="60"
                                    cy="60"
                                    r="55"
                                    fill={
                                      cubiertaSeleccionada.estadoDesgaste === 'CRITICO' ? '#FEE2E2' :
                                      cubiertaSeleccionada.estadoDesgaste === 'REGULAR' ? '#FEF3C7' :
                                      cubiertaSeleccionada.estadoDesgaste === 'BUENO' ? '#D1FAE5' :
                                      '#F3F4F6'
                                    }
                                    stroke={
                                      cubiertaSeleccionada.estadoDesgaste === 'CRITICO' ? '#EF4444' :
                                      cubiertaSeleccionada.estadoDesgaste === 'REGULAR' ? '#F59E0B' :
                                      cubiertaSeleccionada.estadoDesgaste === 'BUENO' ? '#10B981' :
                                      '#9CA3AF'
                                    }
                                    strokeWidth="4"
                                  />
                                  {/* Banda de rodamiento */}
                                  <circle
                                    cx="60"
                                    cy="60"
                                    r="45"
                                    fill="none"
                                    stroke={
                                      cubiertaSeleccionada.estadoDesgaste === 'CRITICO' ? '#DC2626' :
                                      cubiertaSeleccionada.estadoDesgaste === 'REGULAR' ? '#D97706' :
                                      cubiertaSeleccionada.estadoDesgaste === 'BUENO' ? '#059669' :
                                      '#6B7280'
                                    }
                                    strokeWidth="8"
                                    strokeDasharray="10 3"
                                  />
                                  {/* Rin */}
                                  <circle cx="60" cy="60" r="25" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="2" />
                                  <circle cx="60" cy="60" r="15" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="1" />
                                  {/* Centro con número */}
                                  <circle cx="60" cy="60" r="18" fill="#374151" />
                                  <text
                                    x="60"
                                    y="65"
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize="16"
                                    fontWeight="bold"
                                  >
                                    {cubiertaSeleccionada.posicion.numero}
                                  </text>
                                </svg>
                              </div>

                              {/* Info de la cubierta */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                    cubiertaSeleccionada.estadoDesgaste === 'CRITICO' ? 'bg-red-500 text-white' :
                                    cubiertaSeleccionada.estadoDesgaste === 'REGULAR' ? 'bg-amber-500 text-white' :
                                    cubiertaSeleccionada.estadoDesgaste === 'BUENO' ? 'bg-green-500 text-white' :
                                    'bg-gray-500 text-white'
                                  }`}>
                                    {cubiertaSeleccionada.estadoDesgaste || 'SIN CUBIERTA'}
                                  </span>
                                  <span className="text-gray-500 text-sm">
                                    Posición {cubiertaSeleccionada.posicion.numero}
                                  </span>
                                </div>

                                <h4 className="text-lg font-bold text-gray-800 mb-1">
                                  {cubiertaSeleccionada.posicion.label}
                                </h4>

                                {cubiertaSeleccionada.cubierta ? (
                                  <p className="text-gray-600">
                                    {cubiertaSeleccionada.cubierta.codigo} - {cubiertaSeleccionada.cubierta.marca}
                                  </p>
                                ) : (
                                  <p className="text-gray-400 italic">Sin cubierta instalada</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Detalles de la cubierta */}
                          {cubiertaSeleccionada.cubierta && (
                            <div className="bg-white rounded-xl border border-gray-200 p-2 sm:p-4 space-y-3 sm:space-y-4">
                              {/* Barra de desgaste */}
                              <div>
                                <div className="flex justify-between text-sm mb-2">
                                  <span className="text-gray-600">Desgaste de banda</span>
                                  <span className={`font-bold ${getColorDesgaste(cubiertaSeleccionada.cubierta.ultimaProfundidadMm).text}`}>
                                    {cubiertaSeleccionada.cubierta.ultimaProfundidadMm ?? '?'} mm
                                  </span>
                                </div>
                                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${
                                      (cubiertaSeleccionada.cubierta.ultimaProfundidadMm ?? 0) >= CONFIG_CUBIERTAS.UMBRAL_BUENO ? 'bg-green-500' :
                                      (cubiertaSeleccionada.cubierta.ultimaProfundidadMm ?? 0) >= CONFIG_CUBIERTAS.UMBRAL_CRITICO ? 'bg-amber-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${calcularPorcentajeDesgaste(cubiertaSeleccionada.cubierta.ultimaProfundidadMm)}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                  <span>0 mm (Crítico)</span>
                                  <span>12 mm (Nuevo)</span>
                                </div>
                              </div>

                              {/* Grid de información */}
                              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                  <p className="text-xs text-gray-500 mb-1">Código</p>
                                  <p className="font-bold text-gray-800 text-sm sm:text-base">{cubiertaSeleccionada.cubierta.codigo}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                  <p className="text-xs text-gray-500 mb-1">Tipo</p>
                                  <p className={`font-bold text-sm sm:text-base ${
                                    cubiertaSeleccionada.cubierta.tipo === 'LINEAL' ? 'text-green-600' : 'text-blue-600'
                                  }`}>
                                    {cubiertaSeleccionada.cubierta.tipo === 'LINEAL' ? 'NUEVA' : 'RECAPADA'}
                                  </p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                  <p className="text-xs text-gray-500 mb-1">Marca</p>
                                  <p className="font-bold text-gray-800 text-sm sm:text-base">{cubiertaSeleccionada.cubierta.marca}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                  <p className="text-xs text-gray-500 mb-1">Medida</p>
                                  <p className="font-bold text-gray-800 text-sm sm:text-base">{cubiertaSeleccionada.cubierta.medida}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                  <p className="text-xs text-gray-500 mb-1">Km Totales</p>
                                  <p className="font-bold text-gray-800 text-sm sm:text-base">{cubiertaSeleccionada.cubierta.kmTotales.toLocaleString()} km</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                  <p className="text-xs text-gray-500 mb-1">Recapados</p>
                                  <p className="font-bold text-gray-800 text-sm sm:text-base">{cubiertaSeleccionada.cubierta.recapados} veces</p>
                                </div>
                              </div>

                              {/* DOT si existe */}
                              {cubiertaSeleccionada.cubierta.dot && (
                                <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                  <p className="text-xs text-gray-500 mb-1">Código DOT</p>
                                  <p className="font-bold text-gray-800 text-sm sm:text-base">{cubiertaSeleccionada.cubierta.dot}</p>
                                </div>
                              )}

                              {/* Botón generar OT si es crítico */}
                              {onGenerarOT && cubiertaSeleccionada.estadoDesgaste === 'CRITICO' && (
                                <button
                                  onClick={() => onGenerarOT({
                                    unidadNumero: modalUnidad.unidadNumero,
                                    descripcion: `Cambio cubierta ${cubiertaSeleccionada.cubierta!.codigo} - Posición ${cubiertaSeleccionada.posicion.numero} - Estado crítico`
                                  })}
                                  className="w-full px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  Generar OT de Cambio
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        /* Estado sin cubierta seleccionada */
                        <div className="bg-gray-50 rounded-xl p-8 text-center h-full flex flex-col items-center justify-center">
                          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" strokeWidth={2} />
                              <circle cx="12" cy="12" r="3" strokeWidth={2} />
                            </svg>
                          </div>
                          <p className="text-gray-600 font-medium mb-2">Selecciona una cubierta</p>
                          <p className="text-gray-400 text-sm">Haz clic en cualquier posición del diagrama para ver su detalle</p>
                        </div>
                      )}

                      {/* Lista rápida de cubiertas */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h4 className="font-bold text-gray-800 mb-3">Todas las posiciones</h4>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                          {modalUnidad.cubiertas.map(cp => (
                            <button
                              key={cp.posicion.id}
                              onClick={() => setCubiertaSeleccionada(cp)}
                              className={`p-2 rounded-lg text-left text-sm transition-colors ${
                                cubiertaSeleccionada?.posicion.id === cp.posicion.id
                                  ? 'bg-blue-100 border-2 border-blue-400'
                                  : cp.estadoDesgaste === 'CRITICO' ? 'bg-red-50 border border-red-200 hover:bg-red-100' :
                                    cp.estadoDesgaste === 'REGULAR' ? 'bg-amber-50 border border-amber-200 hover:bg-amber-100' :
                                    cp.estadoDesgaste === 'BUENO' ? 'bg-green-50 border border-green-200 hover:bg-green-100' :
                                    'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                  cp.estadoDesgaste === 'CRITICO' ? 'bg-red-500' :
                                  cp.estadoDesgaste === 'REGULAR' ? 'bg-amber-500' :
                                  cp.estadoDesgaste === 'BUENO' ? 'bg-green-500' :
                                  'bg-gray-400'
                                }`}>
                                  {cp.posicion.numero}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-800 truncate text-xs">
                                    {cp.cubierta?.codigo || 'Vacío'}
                                  </p>
                                  {cp.cubierta?.ultimaProfundidadMm !== undefined && (
                                    <p className={`text-xs ${getColorDesgaste(cp.cubierta.ultimaProfundidadMm).text}`}>
                                      {cp.cubierta.ultimaProfundidadMm} mm
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default VisorFlotaCubiertas;
