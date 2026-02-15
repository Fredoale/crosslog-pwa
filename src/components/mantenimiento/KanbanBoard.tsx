import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { OrdenTrabajo, Novedad } from '../../types/checklist';
import { TODAS_LAS_UNIDADES } from '../CarouselSector';
import { formatearNumeroOT } from '../../services/ordenTrabajoService';
import { convertirTimestampFirebase } from '../../utils/dateUtils';

interface KanbanBoardProps {
  ordenes: OrdenTrabajo[];
  novedades: Novedad[];
  onOrdenClick: (orden: OrdenTrabajo) => void;
  onNovedadClick: (novedad: Novedad) => void;
  onCrearOTDesdeNovedad: (novedad: Novedad) => void;
  onCrearOTDesdeUnidad?: (unidadNumero: string, novedadesUnidad: Novedad[]) => void;
  onEstadoChange: (ordenId: string, nuevoEstado: OrdenTrabajo['estado']) => Promise<void>;
  onEliminar?: (ordenId: string) => void;
}

// Tipos de filtro/etapa
type EtapaType = 'NOVEDADES' | 'EN_PROCESO' | 'ESPERANDO_REPUESTOS' | 'CERRADO';

// Configuración de etapas
const ETAPAS: { id: EtapaType; titulo: string; icono: string }[] = [
  { id: 'NOVEDADES', titulo: 'Novedades', icono: '⚠️' },
  { id: 'EN_PROCESO', titulo: 'Órdenes de Trabajo', icono: '🔧' },
  { id: 'ESPERANDO_REPUESTOS', titulo: 'Esperando Repuestos', icono: '⏳' },
  { id: 'CERRADO', titulo: 'Historial', icono: '✅' },
];

// Función para obtener patente
const obtenerPatente = (numeroUnidad: string): string => {
  const unidad = TODAS_LAS_UNIDADES.find(u => u.numero === numeroUnidad);
  return unidad?.patente || 'N/A';
};

// Componente para card de unidad draggable
function DraggableUnidadCard({
  unidadNum,
  novedadesUnidad,
  estaExpandida,
  onToggleExpand,
  onNovedadClick,
  onCrearOTDesdeNovedad,
}: {
  unidadNum: string;
  novedadesUnidad: Novedad[];
  estaExpandida: boolean;
  onToggleExpand: () => void;
  onNovedadClick: (novedad: Novedad) => void;
  onCrearOTDesdeNovedad: (novedad: Novedad) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `unidad-${unidadNum}`,
    data: { type: 'unidad', unidadNum, novedades: novedadesUnidad },
  });

  const pendientes = novedadesUnidad.filter(n => n.estado === 'PENDIENTE').length;

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-gray-200 rounded-lg overflow-hidden ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
    >
      {/* Header de unidad - Draggable */}
      <div
        {...attributes}
        {...listeners}
        className="px-4 py-3 bg-gray-50 hover:bg-gray-100 cursor-grab active:cursor-grabbing flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#56ab2f] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">{unidadNum}</span>
          </div>
          <div>
            <p className="font-bold text-gray-800">INT-{unidadNum}</p>
            <p className="text-xs text-gray-500">{obtenerPatente(unidadNum)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-700">
              {novedadesUnidad.length} novedad{novedadesUnidad.length !== 1 ? 'es' : ''}
            </p>
            {pendientes > 0 && (
              <p className="text-xs text-amber-600">
                {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${estaExpandida ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Lista de novedades expandida */}
      {estaExpandida && (
        <div className="border-t border-gray-200 divide-y divide-gray-100">
          {novedadesUnidad.map((novedad, idx) => (
            <div
              key={novedad.id || idx}
              className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between gap-4"
            >
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onNovedadClick(novedad)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`
                    px-2 py-0.5 rounded text-xs font-semibold
                    ${novedad.estado === 'PENDIENTE'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                    }
                  `}>
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
                className="flex-shrink-0 px-3 py-1.5 bg-[#56ab2f] hover:bg-[#4a9628] text-white text-xs font-bold rounded transition-colors"
              >
                + OT
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Componente para etapa droppable
function DroppableEtapa({
  etapa,
  isActive,
  count,
  onClick,
  isDropTarget,
}: {
  etapa: { id: EtapaType; titulo: string; icono: string };
  isActive: boolean;
  count: number;
  onClick: () => void;
  isDropTarget: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: etapa.id,
    data: { type: 'etapa', etapaId: etapa.id },
  });

  // Solo EN_PROCESO puede recibir drops
  const canReceiveDrop = etapa.id === 'EN_PROCESO';

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={`
        w-full text-left px-3 py-3 rounded-lg transition-all
        flex items-center justify-between gap-2
        ${isActive
          ? 'bg-[#56ab2f] text-white shadow-md'
          : 'hover:bg-gray-100 text-gray-700'
        }
        ${isOver && canReceiveDrop ? 'ring-2 ring-[#56ab2f] ring-offset-2 bg-green-50' : ''}
        ${isDropTarget && canReceiveDrop && !isOver ? 'ring-1 ring-dashed ring-gray-400' : ''}
      `}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{etapa.icono}</span>
        <span className="font-medium text-sm">{etapa.titulo}</span>
      </div>
      <span className={`
        text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center
        ${isActive
          ? 'bg-white/30 text-white'
          : count > 0
            ? 'bg-gray-200 text-gray-700'
            : 'bg-gray-100 text-gray-400'
        }
      `}>
        {count}
      </span>
    </button>
  );
}

export function KanbanBoard({
  ordenes,
  novedades,
  onOrdenClick,
  onNovedadClick,
  onCrearOTDesdeNovedad,
  onCrearOTDesdeUnidad,
}: KanbanBoardProps) {
  const [etapaActiva, setEtapaActiva] = useState<EtapaType>('NOVEDADES');
  const [unidadExpandida, setUnidadExpandida] = useState<string | null>(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedUnidad, setDraggedUnidad] = useState<string | null>(null);
  const itemsPerPage = 20;

  // Sensores para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Handlers de drag & drop
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'unidad') {
      setIsDragging(true);
      setDraggedUnidad(active.data.current.unidadNum);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);
    setDraggedUnidad(null);

    if (!over) return;

    // Si se suelta en "EN_PROCESO"
    if (over.id === 'EN_PROCESO' && active.data.current?.type === 'unidad') {
      const unidadNum = active.data.current.unidadNum;
      const novedadesUnidad = active.data.current.novedades as Novedad[];

      if (onCrearOTDesdeUnidad) {
        onCrearOTDesdeUnidad(unidadNum, novedadesUnidad);
      }
    }
  };

  // Filtrar novedades pendientes
  const novedadesPendientes = useMemo(() =>
    novedades.filter(n => n.estado === 'PENDIENTE' || n.estado === 'EN_PROCESO'),
    [novedades]
  );

  // Agrupar novedades por unidad
  const novedadesPorUnidad = useMemo(() => {
    return novedadesPendientes.reduce((acc, novedad) => {
      const unidadNum = novedad.unidad?.numero || 'SIN_UNIDAD';
      if (!acc[unidadNum]) {
        acc[unidadNum] = [];
      }
      acc[unidadNum].push(novedad);
      return acc;
    }, {} as Record<string, Novedad[]>);
  }, [novedadesPendientes]);

  // Ordenar unidades
  const unidadesOrdenadas = useMemo(() =>
    Object.keys(novedadesPorUnidad).sort((a, b) => Number(a) - Number(b)),
    [novedadesPorUnidad]
  );

  // Agrupar OTs por estado
  // Agrupar OTs por estado
  // EN_PROCESO ahora es "Órdenes de Trabajo" y muestra PENDIENTE + EN_PROCESO
  const ordenesPorEstado = useMemo(() => ({
    EN_PROCESO: ordenes.filter(o => o.estado === 'PENDIENTE' || o.estado === 'EN_PROCESO'),
    ESPERANDO_REPUESTOS: ordenes.filter(o => o.estado === 'ESPERANDO_REPUESTOS'),
    CERRADO: ordenes.filter(o => o.estado === 'CERRADO' || o.estado === 'COMPLETADA'),
  }), [ordenes]);

  // Conteos por etapa
  const conteos = {
    NOVEDADES: novedadesPendientes.length,
    EN_PROCESO: ordenesPorEstado.EN_PROCESO.length,
    ESPERANDO_REPUESTOS: ordenesPorEstado.ESPERANDO_REPUESTOS.length,
    CERRADO: ordenesPorEstado.CERRADO.length,
  };

  // Obtener órdenes de la etapa actual
  const ordenesActuales = etapaActiva !== 'NOVEDADES'
    ? ordenesPorEstado[etapaActiva] || []
    : [];

  // Paginación para órdenes
  const totalPaginas = Math.ceil(ordenesActuales.length / itemsPerPage);
  const ordenesPaginadas = ordenesActuales.slice(
    (paginaActual - 1) * itemsPerPage,
    paginaActual * itemsPerPage
  );

  // Reset página al cambiar etapa
  const cambiarEtapa = (etapa: EtapaType) => {
    setEtapaActiva(etapa);
    setPaginaActual(1);
    setUnidadExpandida(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-[calc(100vh-200px)] min-h-[500px] gap-4">
        {/* ========== PANEL IZQUIERDO - FILTROS ========== */}
        <div className="w-56 flex-shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-gray-700 text-sm">Flujo de Trabajo</h3>
            {isDragging && (
              <p className="text-xs text-[#56ab2f] mt-1 font-medium">
                Arrastra a "En Proceso" →
              </p>
            )}
          </div>

          {/* Lista de etapas */}
          <div className="flex-1 p-2 space-y-1">
            {ETAPAS.map((etapa) => (
              <DroppableEtapa
                key={etapa.id}
                etapa={etapa}
                isActive={etapaActiva === etapa.id}
                count={conteos[etapa.id]}
                onClick={() => cambiarEtapa(etapa.id)}
                isDropTarget={isDragging}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              <span className="font-semibold text-gray-700">{ordenes.length + novedadesPendientes.length}</span> items totales
            </p>
          </div>
        </div>

      {/* ========== PANEL DERECHO - CONTENIDO ========== */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{ETAPAS.find(e => e.id === etapaActiva)?.icono}</span>
            <h3 className="font-bold text-gray-700">
              {ETAPAS.find(e => e.id === etapaActiva)?.titulo}
            </h3>
            <span className="text-sm text-gray-500">({conteos[etapaActiva]} registros)</span>
          </div>

          {/* Paginación */}
          {etapaActiva !== 'NOVEDADES' && totalPaginas > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm text-gray-600 font-medium">
                {paginaActual} / {totalPaginas}
              </span>
              <button
                onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4">
          {etapaActiva === 'NOVEDADES' ? (
            // ========== NOVEDADES AGRUPADAS POR UNIDAD (DRAGGABLE) ==========
            unidadesOrdenadas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <span className="text-5xl mb-3">⚠️</span>
                <p className="text-lg font-medium">No hay novedades pendientes</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-3 px-1">
                  💡 Arrastra una unidad a "En Proceso" para crear OT
                </p>
                {unidadesOrdenadas.map((unidadNum) => (
                  <DraggableUnidadCard
                    key={unidadNum}
                    unidadNum={unidadNum}
                    novedadesUnidad={novedadesPorUnidad[unidadNum]}
                    estaExpandida={unidadExpandida === unidadNum}
                    onToggleExpand={() => setUnidadExpandida(unidadExpandida === unidadNum ? null : unidadNum)}
                    onNovedadClick={onNovedadClick}
                    onCrearOTDesdeNovedad={onCrearOTDesdeNovedad}
                  />
                ))}
              </div>
            )
          ) : (
            // ========== ÓRDENES DE TRABAJO ==========
            ordenesActuales.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <span className="text-5xl mb-3">{ETAPAS.find(e => e.id === etapaActiva)?.icono}</span>
                <p className="text-lg font-medium">No hay órdenes en esta etapa</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ordenesPaginadas.map((orden) => {
                  const diasDesdeCreacion = Math.floor(
                    (Date.now() - convertirTimestampFirebase(orden.timestamp).getTime()) / (1000 * 60 * 60 * 24)
                  );

                  return (
                    <div
                      key={orden.id}
                      onClick={() => onOrdenClick(orden)}
                      className="border border-gray-200 rounded-lg px-4 py-3 hover:border-[#56ab2f] hover:shadow-sm cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-4">
                        {/* OT Badge */}
                        <div className="w-12 h-12 bg-[#56ab2f] rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-white text-[10px] font-medium">OT</span>
                          <span className="text-white text-xs font-bold">{formatearNumeroOT(orden.numeroOT).slice(-4)}</span>
                        </div>

                        {/* Info Grid */}
                        <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-1">
                          <div>
                            <p className="text-xs text-gray-500">Unidad</p>
                            <p className="font-semibold text-gray-800">INT-{orden.unidad.numero}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-xs text-gray-500">Descripción</p>
                            <p className="text-sm text-gray-700 line-clamp-1">{orden.descripcion}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Técnico</p>
                            <p className="text-sm text-gray-700">
                              {orden.asignadoA || orden.mecanico || <span className="text-gray-400 italic">Sin asignar</span>}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Antigüedad</p>
                            <p className={`text-sm font-semibold ${
                              diasDesdeCreacion > 7 ? 'text-red-600' :
                              diasDesdeCreacion > 3 ? 'text-amber-600' : 'text-gray-700'
                            }`}>
                              {diasDesdeCreacion} día{diasDesdeCreacion !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <span className={`
                            px-2 py-0.5 rounded text-xs font-semibold text-center
                            ${orden.prioridad === 'ALTA' ? 'bg-red-100 text-red-700' :
                              orden.prioridad === 'MEDIA' ? 'bg-amber-100 text-amber-700' :
                              'bg-green-100 text-green-700'}
                          `}>
                            {orden.prioridad}
                          </span>
                          <span className={`
                            px-2 py-0.5 rounded text-xs font-semibold text-center
                            ${orden.tipo === 'URGENTE' ? 'bg-red-100 text-red-700' :
                              orden.tipo === 'CORRECTIVO' ? 'bg-gray-200 text-gray-700' :
                              'bg-blue-100 text-blue-700'}
                          `}>
                            {orden.tipo}
                          </span>
                        </div>

                        {/* Arrow */}
                        <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
      </div>

      {/* DragOverlay para feedback visual durante arrastre */}
      <DragOverlay>
        {draggedUnidad ? (
          <div className="bg-white border-2 border-[#56ab2f] rounded-lg shadow-2xl px-4 py-3 opacity-90">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#56ab2f] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">{draggedUnidad}</span>
              </div>
              <div>
                <p className="font-bold text-gray-800">INT-{draggedUnidad}</p>
                <p className="text-xs text-[#56ab2f]">
                  {novedadesPorUnidad[draggedUnidad]?.length || 0} novedad(es)
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
