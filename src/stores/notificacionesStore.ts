import { create } from 'zustand';

export interface Notificacion {
  id: string;
  tipo: 'exito' | 'error' | 'info' | 'advertencia';
  titulo: string;
  mensaje: string;
  timestamp: Date;
  leida: boolean;
}

interface NotificacionesState {
  notificaciones: Notificacion[];
  agregarNotificacion: (notif: Omit<Notificacion, 'id' | 'timestamp' | 'leida'>) => void;
  marcarComoLeida: (id: string) => void;
  eliminarNotificacion: (id: string) => void;
  limpiarTodas: () => void;
  obtenerNoLeidas: () => Notificacion[];
}

export const useNotificacionesStore = create<NotificacionesState>((set, get) => ({
  notificaciones: [],

  agregarNotificacion: (notif) => {
    const nuevaNotificacion: Notificacion = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      leida: false
    };

    set((state) => ({
      notificaciones: [nuevaNotificacion, ...state.notificaciones]
    }));

    console.log('[NotificacionesStore] Nueva notificación:', nuevaNotificacion);

    // Auto-eliminar después de 10 segundos
    setTimeout(() => {
      get().eliminarNotificacion(nuevaNotificacion.id);
    }, 10000);
  },

  marcarComoLeida: (id) => {
    set((state) => ({
      notificaciones: state.notificaciones.map(n =>
        n.id === id ? { ...n, leida: true } : n
      )
    }));
  },

  eliminarNotificacion: (id) => {
    set((state) => ({
      notificaciones: state.notificaciones.filter(n => n.id !== id)
    }));
  },

  limpiarTodas: () => {
    set({ notificaciones: [] });
  },

  obtenerNoLeidas: () => {
    return get().notificaciones.filter(n => !n.leida);
  }
}));
