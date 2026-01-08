import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import type { OrdenTrabajo } from '../../types/checklist';

interface KanbanBoardProps {
  ordenes: OrdenTrabajo[];
  onOrdenClick: (orden: OrdenTrabajo) => void;
  onEstadoChange: (ordenId: string, nuevoEstado: OrdenTrabajo['estado']) => Promise<void>;
  onEliminar?: (ordenId: string) => void;
}

const ESTADOS: OrdenTrabajo['estado'][] = [
  'PENDIENTE',
  'EN_PROCESO',
  'ESPERANDO_REPUESTOS',
  'CERRADO',
];

export function KanbanBoard({ ordenes, onOrdenClick, onEstadoChange, onEliminar }: KanbanBoardProps) {
  const [activeOrden, setActiveOrden] = useState<OrdenTrabajo | null>(null);

  // Configurar sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requiere arrastrar 8px antes de activar (evita clicks accidentales)
      },
    })
  );

  // Manejar inicio de drag
  const handleDragStart = (event: DragStartEvent) => {
    const orden = ordenes.find((o) => o.id === event.active.id);
    if (orden) {
      setActiveOrden(orden);
    }
  };

  // Manejar fin de drag
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveOrden(null);

    if (!over) return;

    const ordenId = active.id as string;
    const nuevoEstado = over.id as OrdenTrabajo['estado'];

    // Verificar si el estado cambió
    const orden = ordenes.find((o) => o.id === ordenId);
    if (!orden || orden.estado === nuevoEstado) return;

    // Actualizar estado
    try {
      await onEstadoChange(ordenId, nuevoEstado);
    } catch (error) {
      console.error('[KanbanBoard] Error al cambiar estado:', error);
    }
  };

  // Agrupar órdenes por estado
  const ordenesPorEstado = ESTADOS.reduce(
    (acc, estado) => {
      acc[estado] = ordenes.filter((orden) => orden.estado === estado);
      return acc;
    },
    {} as Record<OrdenTrabajo['estado'], OrdenTrabajo[]>
  );

  return (
    <div className="h-full">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Grid de columnas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ESTADOS.map((estado) => (
            <KanbanColumn
              key={estado}
              estado={estado}
              ordenes={ordenesPorEstado[estado]}
              onOrdenClick={onOrdenClick}
              onEliminar={onEliminar}
            />
          ))}
        </div>

        {/* Overlay para mostrar la card mientras se arrastra */}
        <DragOverlay>
          {activeOrden ? (
            <div className="rotate-3 scale-105">
              <KanbanCard orden={activeOrden} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
