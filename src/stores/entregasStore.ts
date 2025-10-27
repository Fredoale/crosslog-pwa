import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Entrega, CapturaData, AppConfig } from '../types';

export interface ClientInfo {
  id: string;              // ID del cliente (ej: 'ECO', 'TOY')
  nombre: string;          // Nombre completo (ej: 'ECOLAB', 'TOYOTA')
  direccion?: string;      // Dirección del cliente
  telefono?: string;       // Teléfono de contacto
  tipoCarga?: string;      // Tipo de carga (ej: 'Peligrosa')
  folderId?: string;       // ID de la carpeta de Google Drive
}

interface EntregasState {
  // Authentication
  currentHDR: string | null;
  chofer: string | null;
  tipoTransporte: string | null; // "Propio" o nombre del fletero

  // Client info
  clientInfo: ClientInfo | null;

  // Entregas data
  entregas: Entrega[];
  currentEntrega: Entrega | null;

  // Capture data
  capturaInProgress: CapturaData | null;

  // Sync state
  isSyncing: boolean;
  lastSync: Date | null;
  syncError: string | null;

  // Network state
  isOnline: boolean;

  // App config
  config: AppConfig | null;

  // Actions
  setHDR: (hdr: string, chofer: string, tipoTransporte?: string) => void;
  setClientInfo: (clientInfo: ClientInfo | null) => void;
  setEntregas: (entregas: Entrega[]) => void;
  setCurrentEntrega: (entrega: Entrega | null) => void;
  updateEntregaEstado: (id: string, estado: Entrega['estado'], numeroRemito?: string, nombreReceptor?: string, pdfUrls?: string[]) => void;

  // Capture actions
  startCaptura: (entregaId: string) => void;
  updateCaptura: (data: Partial<CapturaData>) => void;
  clearCaptura: () => void;

  // Sync actions
  setSyncing: (syncing: boolean) => void;
  setLastSync: (date: Date) => void;
  setSyncError: (error: string | null) => void;

  // Network actions
  setOnline: (online: boolean) => void;

  // Config actions
  setConfig: (config: AppConfig) => void;

  // Reset
  logout: () => void;
}

export const useEntregasStore = create<EntregasState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentHDR: null,
      chofer: null,
      tipoTransporte: null,
      clientInfo: null,
      entregas: [],
      currentEntrega: null,
      capturaInProgress: null,
      isSyncing: false,
      lastSync: null,
      syncError: null,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      config: null,

      // Authentication
      setHDR: (hdr, chofer, tipoTransporte = 'Propio') => set({ currentHDR: hdr, chofer, tipoTransporte }),

      // Client
      setClientInfo: (clientInfo) => set({ clientInfo }),

      // Entregas
      setEntregas: (entregas) => set({ entregas }),

      setCurrentEntrega: (entrega) => set({ currentEntrega: entrega }),

      updateEntregaEstado: (id, estado, numeroRemito, nombreReceptor, pdfUrls) => set((state) => ({
        entregas: state.entregas.map((e) =>
          e.id === id ? {
            ...e,
            estado,
            fechaActualizacion: new Date().toISOString(),
            synced: false,
            ...(numeroRemito && { numeroRemito }),
            ...(nombreReceptor && { nombreReceptor }),
            ...(pdfUrls && pdfUrls.length > 0 && { pdfUrls }),
          } : e
        ),
      })),

      // Capture
      startCaptura: (entregaId) => {
        const entrega = get().entregas.find((e) => e.id === entregaId);
        if (!entrega) return;

        set({
          capturaInProgress: {
            entregaId,
            numeroRemito: '',
            cliente: entrega.cliente,
            estado: 'EN_REPARTO',
            fotos: [],
            timestamp: new Date().toISOString(),
            chofer: get().chofer || 'Unknown',
          },
        });
      },

      updateCaptura: (data) => set((state) => ({
        capturaInProgress: state.capturaInProgress
          ? { ...state.capturaInProgress, ...data }
          : null,
      })),

      clearCaptura: () => set({ capturaInProgress: null }),

      // Sync
      setSyncing: (syncing) => set({ isSyncing: syncing }),

      setLastSync: (date) => set({ lastSync: date }),

      setSyncError: (error) => set({ syncError: error }),

      // Network
      setOnline: (online) => set({ isOnline: online }),

      // Config
      setConfig: (config) => set({ config }),

      // Reset - NOTE: We keep HDR, chofer, clientInfo and entregas to allow reopening
      // Only clear the current capture session
      logout: () => set({
        currentEntrega: null,
        capturaInProgress: null,
        syncError: null,
      }),
    }),
    {
      name: 'crosslog-storage',
      version: 2, // Increment version due to clientInfo addition
      partialize: (state) => ({
        currentHDR: state.currentHDR,
        chofer: state.chofer,
        clientInfo: state.clientInfo,
        entregas: state.entregas,
        currentEntrega: state.currentEntrega,
        lastSync: state.lastSync,
        config: state.config,
      }),
    }
  )
);

// Setup network listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useEntregasStore.getState().setOnline(true);
  });

  window.addEventListener('offline', () => {
    useEntregasStore.getState().setOnline(false);
  });
}
