import { create } from 'zustand';
import type { ViajeMarketplace, OfertaMarketplace, FleteroScore } from '../utils/marketplaceApi';
import {
  suscribirseAViajes,
  crearViaje as crearViajeFirestore,
  eliminarViaje as eliminarViajeFirestore
} from '../utils/marketplaceApiFirestore';

interface MarketplaceState {
  // Viajes
  viajes: ViajeMarketplace[];
  viajeActual: ViajeMarketplace | null;

  // Ofertas del viaje actual
  ofertas: OfertaMarketplace[];
  scoresCalculados: FleteroScore[];

  // Estado
  loading: boolean;
  error: string | null;

  // Actions
  cargarViajes: (estado?: string) => () => void; // Ahora retorna función unsubscribe
  cargarOfertasDeViaje: (HDR_viaje: string) => Promise<void>;
  calcularRecomendacion: () => Promise<void>;
  setViajeActual: (viaje: ViajeMarketplace | null) => void;
  crearViaje: (viaje: Partial<ViajeMarketplace>, estado?: 'BORRADOR' | 'PUBLICADO' | 'ASIGNADO' | 'CONFIRMADO', fleteroAsignado?: string) => Promise<string>;
  eliminarViaje: (HDR_viaje: string) => Promise<void>;
  limpiar: () => void;
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  // Initial state
  viajes: [],
  viajeActual: null,
  ofertas: [],
  scoresCalculados: [],
  loading: false,
  error: null,

  // Actions
  cargarViajes: (estado?: string) => {
    set({ loading: true, error: null });

    // Suscribirse a cambios en tiempo real
    const unsubscribe = suscribirseAViajes(
      (viajes) => {
        // Este callback se ejecuta automáticamente cada vez que hay cambios en Firestore

        // Filtrar viajes según ventana de visibilidad: desde publicación hasta 4 AM del día siguiente
        const viajesVisibles = viajes.filter(viaje => {
          if (!viaje.fecha_publicacion) return true; // Mantener viajes sin fecha de publicación

          const fechaPublicacion = new Date(viaje.fecha_publicacion);
          const ahora = new Date();

          // Calcular 4 AM del día siguiente a la publicación
          const limiteVisibilidad = new Date(fechaPublicacion);
          limiteVisibilidad.setDate(limiteVisibilidad.getDate() + 1); // Día siguiente
          limiteVisibilidad.setHours(4, 0, 0, 0); // 4:00 AM

          // El viaje es visible si aún no ha pasado el límite de visibilidad
          const esVisible = ahora < limiteVisibilidad;

          if (!esVisible) {
            console.log(`[MarketplaceStore] Viaje ${viaje.HDR_viaje} oculto - publicado ${fechaPublicacion.toLocaleString()}, límite ${limiteVisibilidad.toLocaleString()}`);
          }

          return esVisible;
        });

        set({ viajes: viajesVisibles, loading: false });
        console.log('[MarketplaceStore] ✨ Viajes actualizados en TIEMPO REAL:', viajesVisibles.length);
        console.log('[MarketplaceStore] Viajes ocultos por ventana de visibilidad:', viajes.length - viajesVisibles.length);
      },
      estado
    );

    // Retornar función unsubscribe para cleanup
    return unsubscribe;
  },

  cargarOfertasDeViaje: async (HDR_viaje: string) => {
    set({ loading: true, error: null });
    try {
      const { obtenerOfertasDeViaje } = await import('../utils/marketplaceApi');
      const ofertas = await obtenerOfertasDeViaje(HDR_viaje);
      set({ ofertas, loading: false });
      console.log('[MarketplaceStore] Ofertas cargadas:', ofertas.length);

      // Auto-calcular scores
      if (ofertas.length > 0) {
        await get().calcularRecomendacion();
      }
    } catch (error: any) {
      console.error('[MarketplaceStore] Error al cargar ofertas:', error);
      set({ error: error.message || 'Error al cargar ofertas', loading: false });
    }
  },

  calcularRecomendacion: async () => {
    const { ofertas } = get();
    if (ofertas.length === 0) {
      set({ scoresCalculados: [] });
      return;
    }

    try {
      const { calcularScoreOfertas } = await import('../utils/marketplaceApi');
      const scores = await calcularScoreOfertas(ofertas);
      set({ scoresCalculados: scores });
      console.log('[MarketplaceStore] Scores calculados:', scores);
    } catch (error) {
      console.error('[MarketplaceStore] Error al calcular scores:', error);
    }
  },

  crearViaje: async (viaje: Partial<ViajeMarketplace>, estado: 'BORRADOR' | 'PUBLICADO' | 'ASIGNADO' | 'CONFIRMADO' = 'BORRADOR', fleteroAsignado?: string) => {
    set({ loading: true, error: null });
    try {
      const HDR_viaje = await crearViajeFirestore(viaje, estado, fleteroAsignado);
      console.log('[MarketplaceStore] ✨ Viaje creado en Firestore:', HDR_viaje, 'Estado:', estado, 'Fletero:', fleteroAsignado);

      // NO necesitamos recargar - onSnapshot lo actualiza automáticamente
      set({ loading: false });
      return HDR_viaje;
    } catch (error: any) {
      console.error('[MarketplaceStore] Error al crear viaje:', error);
      set({ error: error.message || 'Error al crear viaje', loading: false });
      throw error;
    }
  },

  eliminarViaje: async (HDR_viaje: string) => {
    set({ loading: true, error: null });
    try {
      await eliminarViajeFirestore(HDR_viaje);
      console.log('[MarketplaceStore] ✨ Viaje eliminado de Firestore:', HDR_viaje);

      // NO necesitamos recargar - onSnapshot lo actualiza automáticamente
      set({ loading: false });
    } catch (error: any) {
      console.error('[MarketplaceStore] Error al eliminar viaje:', error);
      set({ error: error.message || 'Error al eliminar viaje', loading: false });
      throw error;
    }
  },

  setViajeActual: (viaje) => {
    console.log('[MarketplaceStore] Viaje actual:', viaje?.HDR_viaje);
    set({ viajeActual: viaje });
  },

  limpiar: () => {
    console.log('[MarketplaceStore] Limpiando store');
    set({
      viajeActual: null,
      ofertas: [],
      scoresCalculados: [],
      error: null,
    });
  },
}));
