import { useNotificacionesStore } from '../stores/notificacionesStore';

export function NotificacionesToast() {
  const { notificaciones, eliminarNotificacion, marcarComoLeida } = useNotificacionesStore();

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'exito':
        return (
          <svg className="w-6 h-6 text-[#56ab2f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'advertencia':
        return (
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getColorClasses = (tipo: string) => {
    switch (tipo) {
      case 'exito':
        return 'bg-gradient-to-r from-green-50 to-emerald-50 border-[#56ab2f] backdrop-blur-sm';
      case 'error':
        return 'bg-red-50 border-red-500 backdrop-blur-sm';
      case 'advertencia':
        return 'bg-yellow-50 border-yellow-500 backdrop-blur-sm';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-400 backdrop-blur-sm';
    }
  };

  if (notificaciones.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notificaciones.map((notif) => (
        <div
          key={notif.id}
          className={`${getColorClasses(notif.tipo)} border-l-4 rounded-lg shadow-2xl p-4 animate-slide-in-right`}
          style={{ animation: 'slideInRight 0.3s ease-out' }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {getIconoTipo(notif.tipo)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold mb-1 text-gray-900">{notif.titulo}</p>
              <p className="text-xs leading-relaxed text-gray-700">{notif.mensaje}</p>
              <p className="text-xs opacity-60 mt-2 text-gray-600">
                {notif.timestamp.toLocaleTimeString('es-AR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <button
              onClick={() => eliminarNotificacion(notif.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
