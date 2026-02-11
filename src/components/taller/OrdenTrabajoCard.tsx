import type { OrdenTrabajo } from '../../types/checklist';
import { formatearNumeroOT } from '../../services/ordenTrabajoService';

interface OrdenTrabajoCardProps {
  orden: OrdenTrabajo;
  onVerDetalle: () => void;
  onCambiarEstado: (nuevoEstado: OrdenTrabajo['estado']) => void;
}

export function OrdenTrabajoCard({ orden, onVerDetalle, onCambiarEstado }: OrdenTrabajoCardProps) {
  // Función para determinar el color de prioridad
  const getColorPrioridad = (prioridad: OrdenTrabajo['prioridad']) => {
    switch (prioridad) {
      case 'ALTA': return 'bg-red-100 text-red-700 border-red-300';
      case 'MEDIA': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'BAJA': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  // Función para determinar el ícono de tipo
  const getIconoTipo = (tipo: OrdenTrabajo['tipo']) => {
    switch (tipo) {
      case 'URGENTE': return '🚨';
      case 'CORRECTIVO': return '🔧';
      case 'PREVENTIVO': return '🛡️';
      default: return '⚙️';
    }
  };

  // Función para formatear fecha
  const formatearFecha = (fecha: Date) => {
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const hora = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    return `${dia}/${mes} ${hora}:${minutos}`;
  };

  // Determinar opciones de cambio de estado según el estado actual
  const opcionesEstado = () => {
    switch (orden.estado) {
      case 'PENDIENTE':
        return [
          { label: '🔧 Iniciar Trabajo', valor: 'EN_PROCESO' as const },
        ];
      case 'EN_PROCESO':
        return [
          { label: '📦 Esperando Repuestos', valor: 'ESPERANDO_REPUESTOS' as const },
          { label: '✅ Completar', valor: 'CERRADO' as const },
        ];
      case 'ESPERANDO_REPUESTOS':
        return [
          { label: '🔧 Reanudar Trabajo', valor: 'EN_PROCESO' as const },
          { label: '✅ Completar', valor: 'CERRADO' as const },
        ];
      case 'CERRADO':
      case 'COMPLETADA':
        return [];
      default:
        return [];
    }
  };

  const opciones = opcionesEstado();

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all p-3">
      {/* Header de la tarjeta */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getIconoTipo(orden.tipo)}</span>
          <div>
            <p className="font-bold text-gray-800 text-sm">OT # {formatearNumeroOT(orden.numeroOT)}</p>
            <p className="text-xs text-gray-500">Unidad {orden.unidad.numero}</p>
          </div>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getColorPrioridad(orden.prioridad)}`}>
          {orden.prioridad}
        </span>
      </div>

      {/* Descripción */}
      <p className="text-sm text-gray-700 mb-3 line-clamp-2">
        {orden.descripcion}
      </p>

      {/* Información adicional */}
      <div className="space-y-1 mb-3">
        {orden.asignadoA && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{orden.asignadoA}</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{formatearFecha(orden.fecha)}</span>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onVerDetalle}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold py-2 px-3 rounded-md transition-colors"
        >
          👁️ Ver Detalle
        </button>

        {/* Botones de cambio de estado */}
        {opciones.map((opcion) => (
          <button
            key={opcion.valor}
            onClick={() => onCambiarEstado(opcion.valor)}
            className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-xs font-semibold py-2 px-3 rounded-md transition-all shadow-sm hover:shadow-md"
          >
            {opcion.label}
          </button>
        ))}
      </div>
    </div>
  );
}
