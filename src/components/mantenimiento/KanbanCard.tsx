import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { OrdenTrabajo } from '../../types/checklist';
import { convertirTimestampFirebase } from '../../utils/dateUtils';
import { TODAS_LAS_UNIDADES } from '../CarouselSector';

// Función para obtener patente de una unidad
const obtenerPatente = (numeroUnidad: string): string => {
  const unidad = TODAS_LAS_UNIDADES.find(u => u.numero === numeroUnidad);
  return unidad?.patente || 'N/A';
};

interface KanbanCardProps {
  orden: OrdenTrabajo;
  onClick: () => void;
  onEliminar?: (ordenId: string) => void;
}

export function KanbanCard({ orden, onClick, onEliminar }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: orden.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Calcular días desde creación
  const diasDesdeCreacion = Math.floor(
    (Date.now() - convertirTimestampFirebase(orden.timestamp).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Colores por prioridad
  const prioridadColors = {
    ALTA: 'bg-red-100 text-red-800 border-red-300',
    MEDIA: 'bg-amber-100 text-amber-800 border-amber-300',
    BAJA: 'bg-green-100 text-green-800 border-green-300',
  };

  // Colores por tipo
  const tipoColors = {
    PREVENTIVO: 'bg-blue-100 text-blue-700',
    CORRECTIVO: 'bg-orange-100 text-orange-700',
    URGENTE: 'bg-red-100 text-red-700',
  };

  // Generar número corto de OT (últimos 4-5 dígitos)
  const numeroCorto = String(orden.numeroOT).slice(-5);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        bg-white rounded-lg border-2 border-gray-200 shadow-sm p-3 mb-2 cursor-grab active:cursor-grabbing
        hover:shadow-lg hover:border-[#a8e063] transition-all
        ${isDragging ? 'shadow-2xl border-[#56ab2f]' : ''}
      `}
    >
      {/* Header: OT# + Prioridad + Eliminar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#56ab2f] bg-[#f0f9e8] px-2 py-1 rounded">
            OT-{numeroCorto}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
              prioridadColors[orden.prioridad]
            }`}
          >
            {orden.prioridad === 'ALTA' && '🔴'}
            {orden.prioridad === 'MEDIA' && '🟡'}
            {orden.prioridad === 'BAJA' && '🟢'}
          </span>
        </div>
        {onEliminar && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('¿Eliminar esta orden de trabajo?')) {
                onEliminar(orden.id);
              }
            }}
            className="text-red-500 hover:text-red-700 transition-colors p-1"
            title="Eliminar OT"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Unidad */}
      <div className="text-sm font-semibold text-gray-700 mb-1">
        Unidad {orden.unidad.numero} - {obtenerPatente(orden.unidad.numero) || orden.unidad.patente || 'N/A'}
      </div>

      {/* Tipo */}
      <span
        className={`inline-block text-xs px-2 py-0.5 rounded font-medium mb-2 ${
          tipoColors[orden.tipo]
        }`}
      >
        {orden.tipo}
      </span>

      {/* Descripción truncada */}
      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{orden.descripcion}</p>

      {/* Asignado a (si existe) */}
      {orden.asignadoA && (
        <div className="text-xs text-gray-500 mb-2">
          👤 <span className="font-medium">{orden.asignadoA}</span>
        </div>
      )}

      {/* Días desde creación */}
      <div className="text-xs text-gray-400 mb-2">
        📅 Hace {diasDesdeCreacion} {diasDesdeCreacion === 1 ? 'día' : 'días'}
      </div>

      {/* Botón Ver Detalle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="w-full py-1.5 px-3 text-xs font-semibold text-white bg-gradient-to-r from-[#56ab2f] to-[#a8e063] rounded hover:from-[#4a9428] hover:to-[#96d055] transition-all shadow-sm"
      >
        Ver Detalle
      </button>
    </div>
  );
}
