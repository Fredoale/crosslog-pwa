import { useState, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import type { OrdenTrabajo, Novedad } from '../../types/checklist';

type ColumnType = 'NOVEDADES_PENDIENTES' | 'EN_PROCESO' | 'ESPERANDO_REPUESTOS' | 'CERRADO';

interface KanbanColumnProps {
  columna: ColumnType;
  ordenes: OrdenTrabajo[];
  novedadesPorUnidad: Record<string, Novedad[]>;
  onOrdenClick: (orden: OrdenTrabajo) => void;
  onNovedadClick: (novedad: Novedad) => void;
  onCrearOTDesdeNovedad: (novedad: Novedad) => void;
  onEliminar?: (ordenId: string) => void;
  // Props para fullscreen y paginación
  isFullscreen?: boolean;
  itemsPerPage?: number;
}

const COLUMN_CONFIG: Record<ColumnType, { title: string; emoji: string; colors: string; headerColors: string }> = {
  NOVEDADES_PENDIENTES: {
    title: 'Novedades',
    emoji: '⚠️',
    colors: 'bg-amber-50 border-amber-300',
    headerColors: 'bg-amber-100 text-amber-800',
  },
  EN_PROCESO: {
    title: 'En Proceso',
    emoji: '🔧',
    colors: 'bg-blue-50 border-blue-300',
    headerColors: 'bg-blue-100 text-blue-800',
  },
  ESPERANDO_REPUESTOS: {
    title: 'Esperando Repuestos',
    emoji: '⏳',
    colors: 'bg-orange-50 border-orange-300',
    headerColors: 'bg-orange-100 text-orange-800',
  },
  CERRADO: {
    title: 'Historial',
    emoji: '✅',
    colors: 'bg-green-50 border-green-300',
    headerColors: 'bg-green-100 text-green-800',
  },
};

export function KanbanColumn({
  columna,
  ordenes,
  novedadesPorUnidad,
  onOrdenClick,
  onNovedadClick,
  onCrearOTDesdeNovedad,
  onEliminar,
  isFullscreen = false,
  itemsPerPage = 20
}: KanbanColumnProps) {
  const [unidadExpandida, setUnidadExpandida] = useState<string | null>(null);
  const [paginaActual, setPaginaActual] = useState(1);

  const { setNodeRef, isOver } = useDroppable({
    id: columna,
  });

  const config = COLUMN_CONFIG[columna];
  const esColumnaNovedades = columna === 'NOVEDADES_PENDIENTES';
  const unidades = Object.keys(novedadesPorUnidad).sort((a, b) => Number(a) - Number(b));
  const totalNovedades = Object.values(novedadesPorUnidad).reduce((sum, arr) => sum + arr.length, 0);

  // Determinar cantidad a mostrar
  const cantidadItems = esColumnaNovedades ? totalNovedades : ordenes.length;

  // Paginación para órdenes (cuando hay muchas)
  const ordenesPaginadas = useMemo(() => {
    if (esColumnaNovedades) return [];
    const inicio = (paginaActual - 1) * itemsPerPage;
    const fin = inicio + itemsPerPage;
    return ordenes.slice(inicio, fin);
  }, [ordenes, paginaActual, itemsPerPage, esColumnaNovedades]);

  const totalPaginas = Math.ceil(ordenes.length / itemsPerPage);
  const ordenIds = ordenesPaginadas.map((orden) => orden.id);

  // Paginación para unidades (novedades agrupadas)
  const unidadesPaginadas = useMemo(() => {
    if (!esColumnaNovedades) return [];
    const inicio = (paginaActual - 1) * itemsPerPage;
    const fin = inicio + itemsPerPage;
    return unidades.slice(inicio, fin);
  }, [unidades, paginaActual, itemsPerPage, esColumnaNovedades]);

  const totalPaginasUnidades = Math.ceil(unidades.length / itemsPerPage);

  // Componente de paginación
  const Paginacion = ({ total, actual, onChange }: { total: number; actual: number; onChange: (p: number) => void }) => {
    if (total <= 1) return null;

    return (
      <div className={`flex items-center justify-center gap-2 py-2 ${isFullscreen ? 'bg-gray-800' : 'bg-white/80'} rounded-lg mt-2`}>
        <button
          onClick={() => onChange(Math.max(1, actual - 1))}
          disabled={actual === 1}
          className={`px-2 py-1 rounded ${actual === 1 ? 'opacity-50' : 'hover:bg-gray-200'} ${isFullscreen ? 'text-white hover:bg-gray-700' : ''}`}
        >
          ←
        </button>
        <span className={`text-sm font-semibold ${isFullscreen ? 'text-white' : 'text-gray-700'}`}>
          {actual} / {total}
        </span>
        <button
          onClick={() => onChange(Math.min(total, actual + 1))}
          disabled={actual === total}
          className={`px-2 py-1 rounded ${actual === total ? 'opacity-50' : 'hover:bg-gray-200'} ${isFullscreen ? 'text-white hover:bg-gray-700' : ''}`}
        >
          →
        </button>
        {total > 5 && (
          <select
            value={actual}
            onChange={(e) => onChange(Number(e.target.value))}
            className={`ml-2 text-sm border rounded px-1 ${isFullscreen ? 'bg-gray-700 text-white border-gray-600' : 'bg-white'}`}
          >
            {Array.from({ length: total }, (_, i) => i + 1).map(p => (
              <option key={p} value={p}>Pág {p}</option>
            ))}
          </select>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col ${isFullscreen ? 'h-full' : 'h-full'}`}>
      {/* Header - Oculto en fullscreen (ya tiene header propio) */}
      {!isFullscreen && (
        <div
          className={`
            ${config.headerColors} rounded-t-lg px-4 py-3 border-2 border-b-0 ${config.colors.split(' ')[1]}
            flex items-center justify-between
          `}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{config.emoji}</span>
            <h3 className="font-bold text-sm">{config.title}</h3>
          </div>
          <span className="text-xs font-semibold px-2 py-1 bg-white/50 rounded-full">
            {cantidadItems}
          </span>
        </div>
      )}

      {/* Drop Zone + Cards */}
      <div
        ref={setNodeRef}
        className={`
          ${isFullscreen ? 'bg-gray-800' : config.colors}
          ${isFullscreen ? '' : 'border-2 rounded-b-lg'}
          overflow-y-auto p-3
          transition-all duration-200
          ${isOver && !esColumnaNovedades ? 'ring-4 ring-purple-300 ring-opacity-50' : ''}
          ${isFullscreen ? 'flex-1' : ''}
        `}
        style={isFullscreen ? { minHeight: '100%' } : { height: '400px', maxHeight: '400px' }}
      >
        {esColumnaNovedades ? (
          // Columna de Novedades agrupadas por unidad
          unidades.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-full ${isFullscreen ? 'text-gray-400' : 'text-gray-400'}`}>
              <div className={`${isFullscreen ? 'text-6xl' : 'text-4xl'} mb-2`}>{config.emoji}</div>
              <p className={`${isFullscreen ? 'text-lg' : 'text-sm'} text-center`}>No hay novedades pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Info de paginación en fullscreen */}
              {isFullscreen && unidades.length > itemsPerPage && (
                <div className="text-center text-gray-400 text-sm mb-2">
                  Mostrando {unidadesPaginadas.length} de {unidades.length} unidades
                </div>
              )}
              {unidadesPaginadas.map(unidadNum => {
                const novedadesUnidad = novedadesPorUnidad[unidadNum];
                const estaExpandida = unidadExpandida === unidadNum;
                const pendientes = novedadesUnidad.filter(n => n.estado === 'PENDIENTE').length;

                return (
                  <div
                    key={unidadNum}
                    className="bg-white rounded-lg shadow-sm border border-amber-200 overflow-hidden"
                  >
                    {/* Header de unidad */}
                    <div
                      className={`p-3 cursor-pointer hover:bg-amber-50 transition-colors flex items-center justify-between ${isFullscreen ? 'p-4' : ''}`}
                      onClick={() => setUnidadExpandida(estaExpandida ? null : unidadNum)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`${isFullscreen ? 'w-14 h-14' : 'w-10 h-10'} bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center`}>
                          <span className={`text-white font-bold ${isFullscreen ? 'text-lg' : 'text-sm'}`}>{unidadNum}</span>
                        </div>
                        <div>
                          <p className={`font-bold text-gray-800 ${isFullscreen ? 'text-lg' : 'text-sm'}`}>INT-{unidadNum}</p>
                          <p className={`${isFullscreen ? 'text-sm' : 'text-xs'} text-amber-600`}>
                            {novedadesUnidad.length} novedad{novedadesUnidad.length !== 1 ? 'es' : ''}
                            {pendientes > 0 && <span className="ml-1 text-yellow-600">({pendientes} pendiente{pendientes !== 1 ? 's' : ''})</span>}
                          </p>
                        </div>
                      </div>
                      <svg
                        className={`${isFullscreen ? 'w-6 h-6' : 'w-5 h-5'} text-amber-600 transition-transform duration-200 ${estaExpandida ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Lista expandida */}
                    {estaExpandida && (
                      <div className="border-t border-amber-200">
                        {novedadesUnidad.map((novedad, idx) => (
                          <div
                            key={novedad.id || idx}
                            className="p-3 border-b border-amber-100 last:border-b-0 hover:bg-amber-50"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => onNovedadClick(novedad)}
                              >
                                <div className="flex items-center gap-1 mb-1">
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                                    novedad.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' :
                                    novedad.estado === 'EN_PROCESO' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {novedad.estado}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 line-clamp-2">{novedad.descripcion}</p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCrearOTDesdeNovedad(novedad);
                                }}
                                className="flex-shrink-0 px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded hover:bg-purple-700 transition-colors"
                                title="Crear OT"
                              >
                                + OT
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          // Columnas de OTs
          ordenes.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-full ${isFullscreen ? 'text-gray-400' : 'text-gray-400'}`}>
              <div className={`${isFullscreen ? 'text-6xl' : 'text-4xl'} mb-2`}>{config.emoji}</div>
              <p className={`${isFullscreen ? 'text-lg' : 'text-sm'} text-center`}>No hay órdenes en {config.title.toLowerCase()}</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Info de paginación en fullscreen */}
              {isFullscreen && ordenes.length > itemsPerPage && (
                <div className="text-center text-gray-400 text-sm mb-2">
                  Mostrando {ordenesPaginadas.length} de {ordenes.length} órdenes
                </div>
              )}

              <div className={`${isFullscreen ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-2'} flex-1`}>
                <SortableContext items={ordenIds} strategy={verticalListSortingStrategy}>
                  {ordenesPaginadas.map((orden) => (
                    <KanbanCard
                      key={orden.id}
                      orden={orden}
                      onClick={() => onOrdenClick(orden)}
                      onEliminar={onEliminar}
                      isFullscreen={isFullscreen}
                    />
                  ))}
                </SortableContext>
              </div>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <Paginacion total={totalPaginas} actual={paginaActual} onChange={setPaginaActual} />
              )}
            </div>
          )
        )}

        {/* Paginación para novedades */}
        {esColumnaNovedades && totalPaginasUnidades > 1 && (
          <Paginacion total={totalPaginasUnidades} actual={paginaActual} onChange={setPaginaActual} />
        )}
      </div>
    </div>
  );
}
