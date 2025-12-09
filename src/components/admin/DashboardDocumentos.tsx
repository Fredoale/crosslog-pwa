import React, { useState, useEffect } from 'react';
import { sheetsApi } from '../../utils/sheetsApi';
import { calcularEstadoDocumento, diasHastaVencimiento, formatearFecha } from '../../utils/vencimientosUtils';

interface AlertaDocumento {
  id: string;
  tipo: 'CHOFER' | 'UNIDAD' | 'CUADERNILLO';
  identificador: string;
  nombreDocumento: string;
  fechaVencimiento: string;
  diasRestantes: number;
  criticidad: 'CRITICO' | 'ALTO' | 'MEDIO';
  urlArchivo?: string;
}

interface Stats {
  totalDocumentos: number;
  criticos: number;
  altos: number;
  medios: number;
  vigentes: number;
}

export function DashboardDocumentos() {
  const [alertas, setAlertas] = useState<AlertaDocumento[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalDocumentos: 0,
    criticos: 0,
    altos: 0,
    medios: 0,
    vigentes: 0
  });
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<'TODOS' | 'CRITICO' | 'ALTO' | 'MEDIO'>('TODOS');

  useEffect(() => {
    cargarAlertasDocumentos();
  }, []);

  const cargarAlertasDocumentos = async () => {
    setCargando(true);
    try {
      // Cargar documentos de choferes, unidades y cuadernillos en paralelo
      const [choferes, unidades, cuadernillos] = await Promise.all([
        sheetsApi.fetchChoferDocumentos(),
        sheetsApi.fetchUnidadDocumentos(),
        sheetsApi.fetchCuadernillos()
      ]);

      const todasLasAlertas: AlertaDocumento[] = [];
      const statsTemp = {
        totalDocumentos: 0,
        criticos: 0,
        altos: 0,
        medios: 0,
        vigentes: 0
      };

      // Procesar documentos de choferes
      choferes.forEach((doc: any) => {
        if (doc.fechaVencimiento) {
          const dias = diasHastaVencimiento(doc.fechaVencimiento);
          statsTemp.totalDocumentos++;

          let criticidad: 'CRITICO' | 'ALTO' | 'MEDIO' | null = null;

          if (dias < 0) {
            criticidad = 'CRITICO';
            statsTemp.criticos++;
          } else if (dias <= 15) {
            criticidad = 'ALTO';
            statsTemp.altos++;
          } else if (dias <= 30) {
            criticidad = 'MEDIO';
            statsTemp.medios++;
          } else {
            statsTemp.vigentes++;
          }

          // Agregar a alertas si hay criticidad
          if (criticidad) {
            todasLasAlertas.push({
              id: `chofer-${doc.nombreChofer}-${doc.tipo}`,
              tipo: 'CHOFER',
              identificador: doc.nombreChofer,
              nombreDocumento: doc.nombreDocumento,
              fechaVencimiento: doc.fechaVencimiento,
              diasRestantes: dias,
              criticidad,
              urlArchivo: doc.urlArchivo
            });
          }
        }
      });

      // Procesar documentos de unidades
      unidades.forEach((doc: any) => {
        if (doc.fechaVencimiento) {
          const dias = diasHastaVencimiento(doc.fechaVencimiento);
          statsTemp.totalDocumentos++;

          let criticidad: 'CRITICO' | 'ALTO' | 'MEDIO' | null = null;

          if (dias < 0) {
            criticidad = 'CRITICO';
            statsTemp.criticos++;
          } else if (dias <= 15) {
            criticidad = 'ALTO';
            statsTemp.altos++;
          } else if (dias <= 30) {
            criticidad = 'MEDIO';
            statsTemp.medios++;
          } else {
            statsTemp.vigentes++;
          }

          if (criticidad) {
            todasLasAlertas.push({
              id: `unidad-${doc.numeroUnidad}-${doc.tipo}`,
              tipo: 'UNIDAD',
              identificador: `Unidad ${doc.numeroUnidad}`,
              nombreDocumento: doc.nombreDocumento,
              fechaVencimiento: doc.fechaVencimiento,
              diasRestantes: dias,
              criticidad,
              urlArchivo: doc.urlArchivo
            });
          }
        }
      });

      // Procesar cuadernillos
      cuadernillos.forEach((doc: any) => {
        if (doc.fechaVencimiento) {
          const dias = diasHastaVencimiento(doc.fechaVencimiento);
          statsTemp.totalDocumentos++;

          let criticidad: 'CRITICO' | 'ALTO' | 'MEDIO' | null = null;

          if (dias < 0) {
            criticidad = 'CRITICO';
            statsTemp.criticos++;
          } else if (dias <= 15) {
            criticidad = 'ALTO';
            statsTemp.altos++;
          } else if (dias <= 30) {
            criticidad = 'MEDIO';
            statsTemp.medios++;
          } else {
            statsTemp.vigentes++;
          }

          if (criticidad) {
            todasLasAlertas.push({
              id: `cuadernillo-${doc.mes}`,
              tipo: 'CUADERNILLO',
              identificador: `Crosslog ${doc.mes}`,
              nombreDocumento: doc.nombreDocumento || `Cuadernillo ${doc.mes}`,
              fechaVencimiento: doc.fechaVencimiento,
              diasRestantes: dias,
              criticidad,
              urlArchivo: doc.urlCuadernillo || doc.urlArchivo
            });
          }
        }
      });

      // Ordenar por criticidad y luego por días restantes
      todasLasAlertas.sort((a, b) => {
        const criticidadOrder = { CRITICO: 0, ALTO: 1, MEDIO: 2 };
        if (criticidadOrder[a.criticidad] !== criticidadOrder[b.criticidad]) {
          return criticidadOrder[a.criticidad] - criticidadOrder[b.criticidad];
        }
        return a.diasRestantes - b.diasRestantes;
      });

      setAlertas(todasLasAlertas);
      setStats(statsTemp);
    } catch (error) {
      console.error('[Dashboard] Error al cargar alertas:', error);
    } finally {
      setCargando(false);
    }
  };

  const alertasFiltradas = filtro === 'TODOS'
    ? alertas
    : alertas.filter(a => a.criticidad === filtro);

  const getCriticidadColor = (criticidad: string) => {
    switch (criticidad) {
      case 'CRITICO':
        return {
          bg: 'bg-red-50',
          border: 'border-red-500',
          text: 'text-red-800',
          badge: 'bg-red-500'
        };
      case 'ALTO':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-500',
          text: 'text-orange-800',
          badge: 'bg-orange-500'
        };
      case 'MEDIO':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-500',
          text: 'text-yellow-800',
          badge: 'bg-yellow-500'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-300',
          text: 'text-gray-800',
          badge: 'bg-gray-500'
        };
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'CHOFER':
        return '👤';
      case 'UNIDAD':
        return '🚛';
      case 'CUADERNILLO':
        return '📋';
      default:
        return '📄';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="text-white p-4 md:p-6 mb-4 md:mb-6" style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Dashboard de Documentación</h1>
          <p className="text-xs md:text-sm" style={{ color: '#a8e063' }}>Monitoreo de vencimientos y alertas</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 md:px-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 mb-4 md:mb-8">
          {/* Total */}
          <div className="bg-white rounded-lg p-3 md:p-6 shadow-sm border-2 border-gray-200 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600 font-medium">Total Documentos</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1 md:mt-2">{stats.totalDocumentos}</p>
              </div>
              <div className="text-3xl md:text-4xl">📊</div>
            </div>
          </div>

          {/* Críticos */}
          <div className="bg-white rounded-lg p-3 md:p-6 shadow-sm border-2 border-red-500 cursor-pointer hover:shadow-md transition-shadow col-span-2 md:col-span-1"
               onClick={() => setFiltro('CRITICO')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-red-600 font-medium">Vencidos</p>
                <p className="text-2xl md:text-3xl font-bold text-red-700 mt-1 md:mt-2">{stats.criticos}</p>
              </div>
              <div className="text-3xl md:text-4xl">🚨</div>
            </div>
            {stats.criticos > 0 && (
              <div className="mt-2 md:mt-3 flex items-center gap-1 text-xs text-red-700 font-semibold">
                <svg className="w-3 h-3 md:w-4 md:h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                URGENTE
              </div>
            )}
          </div>

          {/* Altos */}
          <div className="bg-white rounded-lg p-3 md:p-6 shadow-sm border-2 border-orange-400 cursor-pointer hover:shadow-md transition-shadow"
               onClick={() => setFiltro('ALTO')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-orange-600 font-medium">Por Vencer</p>
                <p className="text-2xl md:text-3xl font-bold text-orange-700 mt-1 md:mt-2">{stats.altos}</p>
              </div>
              <div className="text-3xl md:text-4xl">⚠️</div>
            </div>
            <p className="text-xs text-orange-600 mt-2 md:mt-3 font-medium">≤ 15 días</p>
          </div>

          {/* Medios */}
          <div className="bg-white rounded-lg p-3 md:p-6 shadow-sm border-2 border-yellow-400 cursor-pointer hover:shadow-md transition-shadow"
               onClick={() => setFiltro('MEDIO')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-yellow-700 font-medium">Próximos</p>
                <p className="text-2xl md:text-3xl font-bold text-yellow-800 mt-1 md:mt-2">{stats.medios}</p>
              </div>
              <div className="text-3xl md:text-4xl">📌</div>
            </div>
            <p className="text-xs text-yellow-700 mt-2 md:mt-3 font-medium">16-30 días</p>
          </div>

          {/* Vigentes */}
          <div className="bg-white rounded-lg p-3 md:p-6 shadow-sm border-2" style={{ borderColor: '#a8e063' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600 font-medium">Vigentes</p>
                <p className="text-2xl md:text-3xl font-bold mt-1 md:mt-2" style={{ color: '#56ab2f' }}>{stats.vigentes}</p>
              </div>
              <div className="text-3xl md:text-4xl">✅</div>
            </div>
            <p className="text-xs text-gray-600 mt-2 md:mt-3 font-medium">&gt; 30 días</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-0">Alertas Activas</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltro('TODOS')}
              className={`px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filtro === 'TODOS'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={filtro === 'TODOS' ? { background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' } : {}}
            >
              Todas ({alertas.length})
            </button>
            <button
              onClick={() => setFiltro('CRITICO')}
              className={`px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filtro === 'CRITICO'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              🚨 {stats.criticos}
            </button>
            <button
              onClick={() => setFiltro('ALTO')}
              className={`px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filtro === 'ALTO'
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
              }`}
            >
              ⚠️ {stats.altos}
            </button>
            <button
              onClick={() => setFiltro('MEDIO')}
              className={`px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filtro === 'MEDIO'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
              }`}
            >
              📌 {stats.medios}
            </button>
            <button
              onClick={cargarAlertasDocumentos}
              className="px-3 md:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden md:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* Lista de Alertas */}
        {cargando ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Cargando alertas...</p>
          </div>
        ) : alertasFiltradas.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
            <div className="text-6xl mb-4">✓</div>
            <p className="text-gray-900 font-bold text-xl mb-2">
              {filtro === 'TODOS' ? 'Sin alertas pendientes' : `No hay alertas de nivel ${filtro}`}
            </p>
            <p className="text-gray-600">Todos los documentos están en orden</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {alertasFiltradas.map((alerta) => {
              const colors = getCriticidadColor(alerta.criticidad);

              return (
                <div
                  key={alerta.id}
                  className={`${colors.bg} rounded-lg p-6 border-l-4 ${colors.border} shadow-sm hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{getTipoIcon(alerta.tipo)}</span>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-gray-900">{alerta.identificador}</h3>
                            <span className={`px-2 py-1 ${colors.badge} text-white text-xs font-bold rounded-full`}>
                              {alerta.criticidad}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 font-medium">{alerta.nombreDocumento}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-semibold text-gray-900">Tipo:</span>
                          <p className={colors.text}>{alerta.tipo}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900">Vencimiento:</span>
                          <p className={colors.text}>{formatearFecha(alerta.fechaVencimiento)}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900">
                            {alerta.diasRestantes < 0 ? 'Vencido hace:' : 'Días restantes:'}
                          </span>
                          <p className={`font-bold ${colors.text}`}>
                            {Math.abs(alerta.diasRestantes)} días
                          </p>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900">Acción:</span>
                          <p className={`font-bold ${colors.text}`}>
                            {alerta.criticidad === 'CRITICO' ? 'URGENTE' : 'Renovar pronto'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {alerta.urlArchivo && (
                      <a
                        href={alerta.urlArchivo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-6 px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ver PDF
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
