import { create } from 'zustand';

export interface PersonalMantenimiento {
  id: string;
  nombre: string;
  rol: 'Encargado' | 'Mecánico' | 'Herrero' | 'Ayudante';
  activo: boolean;
  fechaIngreso?: string;
}

interface TallerState {
  isAuthenticated: boolean;
  personal: PersonalMantenimiento[];

  // Funciones
  login: (codigo: string) => boolean;
  logout: () => void;
  cargarPersonal: () => void;
  agregarPersonal: (personal: Omit<PersonalMantenimiento, 'id'>) => void;
  actualizarPersonal: (id: string, datos: Partial<PersonalMantenimiento>) => void;
  eliminarPersonal: (id: string) => void;
}

// Personal inicial por defecto
const PERSONAL_INICIAL: PersonalMantenimiento[] = [
  {
    id: 'per001',
    nombre: 'Encargado de Mantenimiento',
    rol: 'Encargado',
    activo: true,
    fechaIngreso: '2024-01-01'
  },
  {
    id: 'per002',
    nombre: 'Mecánico',
    rol: 'Mecánico',
    activo: true,
    fechaIngreso: '2024-01-01'
  },
  {
    id: 'per003',
    nombre: 'Herrero',
    rol: 'Herrero',
    activo: true,
    fechaIngreso: '2024-01-01'
  },
  {
    id: 'per004',
    nombre: 'Ayudante Mecánico',
    rol: 'Ayudante',
    activo: true,
    fechaIngreso: '2024-01-01'
  }
];

// Código de acceso único para el taller
const CODIGO_TALLER = 'TALLER2026';

export const useTallerStore = create<TallerState>((set, get) => ({
  isAuthenticated: false,
  personal: PERSONAL_INICIAL,

  login: (codigo: string) => {
    if (codigo.toUpperCase() === CODIGO_TALLER) {
      set({ isAuthenticated: true });
      console.log('[TallerStore] Login exitoso - Acceso al panel de taller');
      return true;
    }
    console.log('[TallerStore] Código incorrecto');
    return false;
  },

  logout: () => {
    set({ isAuthenticated: false });
    console.log('[TallerStore] Logout del panel de taller');
  },

  cargarPersonal: () => {
    // Cargar desde localStorage si existe
    const personalGuardado = localStorage.getItem('crosslog_personal_taller');
    if (personalGuardado) {
      try {
        const personal = JSON.parse(personalGuardado);
        set({ personal });
        console.log('[TallerStore] Personal cargado desde localStorage:', personal.length, 'técnicos');
      } catch (error) {
        console.error('[TallerStore] Error al cargar personal:', error);
        set({ personal: PERSONAL_INICIAL });
      }
    } else {
      // Guardar personal inicial en localStorage
      localStorage.setItem('crosslog_personal_taller', JSON.stringify(PERSONAL_INICIAL));
      set({ personal: PERSONAL_INICIAL });
    }
  },

  agregarPersonal: (nuevoPersonal) => {
    const id = `per${Date.now()}`;
    const personal = [...get().personal, { ...nuevoPersonal, id }];
    set({ personal });
    localStorage.setItem('crosslog_personal_taller', JSON.stringify(personal));
    console.log('[TallerStore] Personal agregado:', nuevoPersonal.nombre);
  },

  actualizarPersonal: (id, datos) => {
    const personal = get().personal.map(p =>
      p.id === id ? { ...p, ...datos } : p
    );
    set({ personal });
    localStorage.setItem('crosslog_personal_taller', JSON.stringify(personal));
    console.log('[TallerStore] Personal actualizado:', id);
  },

  eliminarPersonal: (id) => {
    const personal = get().personal.filter(p => p.id !== id);
    set({ personal });
    localStorage.setItem('crosslog_personal_taller', JSON.stringify(personal));
    console.log('[TallerStore] Personal eliminado:', id);
  }
}));
