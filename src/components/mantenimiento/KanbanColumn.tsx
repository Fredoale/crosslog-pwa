import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import type { OrdenTrabajo } from '../../types/checklist';

interface KanbanColumnProps {
  estado: OrdenTrabajo['estado'];
  ordenes: OrdenTrabajo[];
  onOrdenClick: (orden: OrdenTrabajo) => void;
  onEliminar?: (ordenId: string) => void;
}

const COLUMN_CONFIG = {
  PENDIENTE: {
    title: 'Pendiente',
    emoji: '🆕',
    colors: 'bg-gray-50 border-gray-300',
    headerColors: 'bg-gray-100 text-gray-800',
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
    colors: 'bg-amber-50 border-amber-300',
    headerColors: 'bg-amber-100 text-amber-800',
  },
  CERRADO: {
    title: 'Cerrado',
    emoji: '✅',
    colors: 'bg-green-50 border-green-300',
    headerColors: 'bg-green-100 text-green-800',
  },
};

export function KanbanColumn({ estado, ordenes, onOrdenClick, onEliminar }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: estado,
  });

  const config = COLUMN_CONFIG[estado];
  const ordenIds = ordenes.map((orden) => orden.id);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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
          {ordenes.length}
        </span>
      </div>

      {/* Drop Zone + Cards */}
      <div
        ref={setNodeRef}
        className={`
          ${config.colors} border-2 rounded-b-lg overflow-y-auto p-3
          transition-all duration-200
          ${isOver ? 'ring-4 ring-purple-300 ring-opacity-50' : ''}
        `}
        style={{ height: '400px', maxHeight: '400px' }}
      >
        {ordenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="text-4xl mb-2">{config.emoji}</div>
            <p className="text-sm text-center">No hay órdenes en {config.title.toLowerCase()}</p>
          </div>
        ) : (
          <SortableContext items={ordenIds} strategy={verticalListSortingStrategy}>
            {ordenes.map((orden) => (
              <KanbanCard
                key={orden.id}
                orden={orden}
                onClick={() => onOrdenClick(orden)}
                onEliminar={onEliminar}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
