import { create } from 'zustand';
import type { InfoChoferCompleta, DocumentoChofer, DocumentoUnidad, Cuadernillo, Alerta } from '../types/documentos';
import { calcularEstadoDocumento, diasHastaVencimiento, generarMensajeAlerta } from '../utils/vencimientosUtils';
import { sheetsApi } from '../utils/sheetsApi';

// DATOS MOCK - Reemplazar con API después
const DATOS_MOCK: Record<string, InfoChoferCompleta> = {
  'Oscar Gomez': {
    nombre: 'Oscar Gomez',
    unidad: '45',
    esPropio: true,
    documentos: [
      {
        id: 'reg-oscar',
        tipo: 'registro',
        nombre: 'Registro de Conducir',
        choferNombre: 'Oscar Gomez',
        urlArchivo: '/CROSSLOG - Manual Choferes.pdf', // Temporal - usa el manual como ejemplo
        fechaVencimiento: '2025-06-30',
        estado: 'VIGENTE'
      },
      {
        id: 'lint-oscar',
        tipo: 'lintin',
        nombre: 'Lintín',
        choferNombre: 'Oscar Gomez',
        urlArchivo: '/CROSSLOG - Manual Choferes.pdf',
        fechaVencimiento: '2025-03-15',
        estado: 'VIGENTE'
      },
      {
        id: 'dni-oscar',
        tipo: 'dni',
        nombre: 'DNI',
        choferNombre: 'Oscar Gomez',
        urlArchivo: '/CROSSLOG - Manual Choferes.pdf',
        estado: 'VIGENTE'
      }
    ],
    documentosUnidad: [
      {
        id: 'seg-45',
        tipo: 'seguro',
        nombre: 'Seguro Unidad 45',
        numeroUnidad: '45',
        urlArchivo: '/CROSSLOG - Manual Choferes.pdf',
        fechaVencimiento: '2025-04-30',
        estado: 'VIGENTE'
      },
      {
        id: 'vtv-45',
        tipo: 'vtv',
        nombre: 'VTV Unidad 45',
        numeroUnidad: '45',
        urlArchivo: '/CROSSLOG - Manual Choferes.pdf',
        fechaVencimiento: '2024-12-10',
        estado: 'POR_VENCER'
      },
      {
        id: 'ced-45',
        tipo: 'cedula',
        nombre: 'Cédula Verde',
        numeroUnidad: '45',
        urlArchivo: '/CROSSLOG - Manual Choferes.pdf',
        fechaVencimiento: '2026-01-15',
        estado: 'VIGENTE'
      }
    ],
    cuadernillos: [{
      mes: '2024-11',
      cuadernilloCompleto: '/CROSSLOG - Manual Choferes.pdf',
      fechaEmision: '2024-11-01',
      fechaVencimiento: '2024-11-30',
      estado: 'VIGENTE'
    }],
    alertas: []
  },
  'Jonathan Esteban': {
    nombre: 'Jonathan Esteban',
    unidad: '62',
    esPropio: true,
    documentos: [
      {
        id: 'reg-jonathan',
        tipo: 'registro',
        nombre: 'Registro de Conducir',
        choferNombre: 'Jonathan Esteban',
        urlArchivo: '/CROSSLOG - Manual Choferes.pdf',
        fechaVencimiento: '2024-12-15',
        estado: 'POR_VENCER'
      },
      {
        id: 'lint-jonathan',
        tipo: 'lintin',
        nombre: 'Lintín',
        choferNombre: 'Jonathan Esteban',
        urlArchivo: '/CROSSLOG - Manual Choferes.pdf',
        fechaVencimiento: '2025-08-20',
        estado: 'VIGENTE'
      }
    ],
    documentosUnidad: [
      {
        id: 'seg-62',
        tipo: 'seguro',
        nombre: 'Seguro Unidad 62',
        numeroUnidad: '62',
        urlArchivo: '/CROSSLOG - Manual Choferes.pdf',
        fechaVencimiento: '2025-02-28',
        estado: 'VIGENTE'
      },
      {
        id: 'vtv-62',
        tipo: 'vtv',
        nombre: 'VTV Unidad 62',
        numeroUnidad: '62',
        urlArchivo: '/CROSSLOG - Manual Choferes.pdf',
        fechaVencimiento: '2024-12-01',
        estado: 'POR_VENCER'
      }
    ],
    cuadernillos: [{
      mes: '2024-11',
      cuadernilloCompleto: '/CROSSLOG - Manual Choferes.pdf',
      fechaEmision: '2024-11-01',
      fechaVencimiento: '2024-11-30',
      estado: 'VIGENTE'
    }],
    alertas: []
  },
  'Martin Romero': {
    nombre: 'Martin Romero',
    unidad: '46',
    esPropio: true,
    documentos: [
      {
        id: 'reg-martin',
        tipo: 'registro',
        nombre: 'Registro de Conducir',
        choferNombre: 'Martin Romero',
        urlArchivo: '/CROSSLOG - Manual Choferes.pdf',
        fechaVencimiento: '2025-05-20',
        estado: 'VIGENTE'
      }
    ],
    documentosUnidad: [
      {
        id: 'seg-46',
        tipo: 'seguro',
        nombre: 'Seguro Unidad 46',
        numeroUnidad: '46',
        urlArchivo: '/CROSSLOG - Manual Choferes.pdf',
        fechaVencimiento: '2025-03-15',
        estado: 'VIGENTE'
      }
    ],
    cuadernillos: [{
      mes: '2024-11',
      cuadernilloCompleto: '/CROSSLOG - Manual Choferes.pdf',
      fechaEmision: '2024-11-01',
      fechaVencimiento: '2024-11-30',
      estado: 'VIGENTE'
    }],
    alertas: []
  },
  'Jonatan Esteban': {
    nombre: 'Jonatan Esteban',
    unidad: '62',
    esPropio: true,
    documentos: [
      {
        id: 'reg-jonatan',
        tipo: 'registro',
        nombre: 'Registro de Conducir',
        choferNombre: 'Jonatan Esteban',
        urlArchivo: '/CROSSLOG - Manual Choferes.pdf',
        fechaVencimiento: '2024-12-15',
        estado: 'POR_VENCER'
      },
      {
        id: 'lint-jonatan',
        tipo: 'lintin',
        nombre: 'Lintín',
        choferNombre: 'Jonatan Esteban',
        urlArchivo: '/CROSSLOG - Manual Choferes.pdf',
        fechaVencimiento: '2025-08-20',
        estado: 'VIGENTE'
      }
    ],
    documentosUnidad: [
      {
        id: 'seg-62',
        tipo: 'seguro',
        nombre: 'Seguro Unidad 62',
        numeroUnidad: '62',
        urlArchivo: '/CROSSLOG - Manual Choferes.pdf',
        fechaVencimiento: '2025-02-28',
        estado: 'VIGENTE'
      },
      {
        id: 'vtv-62',
        tipo: 'vtv',
        nombre: 'VTV Unidad 62',
        numeroUnidad: '62',
        urlArchivo: '/CROSSLOG - Manual Choferes.pdf',
        fechaVencimiento: '2024-12-01',
        estado: 'POR_VENCER'
      }
    ],
    cuadernillos: [{
      mes: '2024-11',
      cuadernilloCompleto: '/CROSSLOG - Manual Choferes.pdf',
      fechaEmision: '2024-11-01',
      fechaVencimiento: '2024-11-30',
      estado: 'VIGENTE'
    }],
    alertas: []
  }
};

interface DocumentosState {
  infoChofer: InfoChoferCompleta | null;
  loading: boolean;
  error: string | null;

  cargarDocumentosChofer: (nombreChofer: string) => void;
  limpiar: () => void;
}

export const useDocumentosStore = create<DocumentosState>((set) => ({
  infoChofer: null,
  loading: false,
  error: null,

  cargarDocumentosChofer: async (nombreChofer: string) => {
    set({ loading: true, error: null });

    console.log('[DocumentosStore] Cargando documentos para:', nombreChofer);

    try {
      // Fetch data from Google Sheets
      const [choferDocsRaw, cuadernillosRaw] = await Promise.all([
        sheetsApi.fetchChoferDocumentos(nombreChofer),
        sheetsApi.fetchCuadernillos() // Get ALL cuadernillos, not filtered by chofer
      ]);

      if (choferDocsRaw.length === 0 && cuadernillosRaw.length === 0) {
        console.log('[DocumentosStore] ❌ No se encontraron documentos para:', nombreChofer);
        set({
          loading: false,
          error: 'No se encontraron documentos',
          infoChofer: null
        });
        return;
      }

      // Get first chofer doc to extract unidad and esPropio
      const firstDoc = choferDocsRaw[0];
      const unidad = firstDoc?.unidad || '';
      const esPropio = firstDoc?.esPropio || false;

      // Fetch unit documents if we have unidad
      const unidadDocsRaw = unidad ? await sheetsApi.fetchUnidadDocumentos(unidad) : [];

      // Transform chofer documents
      const documentos: DocumentoChofer[] = choferDocsRaw.map((doc: any) => ({
        id: `${doc.tipo}-${nombreChofer}`.toLowerCase().replace(/\s+/g, '-'),
        tipo: doc.tipo as any,
        nombre: doc.nombreDocumento,
        choferNombre: doc.nombreChofer,
        urlArchivo: doc.urlArchivo,
        fechaVencimiento: doc.fechaVencimiento || undefined,
        estado: doc.fechaVencimiento ? calcularEstadoDocumento(doc.fechaVencimiento) : 'VIGENTE'
      }));

      // Transform unit documents
      const documentosUnidad: DocumentoUnidad[] = unidadDocsRaw.map((doc: any) => ({
        id: `${doc.tipo}-${doc.numeroUnidad}`.toLowerCase().replace(/\s+/g, '-'),
        tipo: doc.tipo as any,
        nombre: doc.nombreDocumento,
        numeroUnidad: doc.numeroUnidad,
        urlArchivo: doc.urlArchivo,
        fechaVencimiento: doc.fechaVencimiento,
        estado: calcularEstadoDocumento(doc.fechaVencimiento)
      }));

      // Transform cuadernillos (ALL, not just for this chofer)
      const cuadernillos: Cuadernillo[] = cuadernillosRaw.map((cuad: any) => ({
        mes: cuad.mes,
        cuadernilloCompleto: cuad.urlCuadernillo,
        fechaEmision: cuad.fechaEmision,
        fechaVencimiento: cuad.fechaVencimiento,
        estado: calcularEstadoDocumento(cuad.fechaVencimiento),
        nombreChofer: cuad.nombreChofer // Keep track of which chofer if any
      }));

      // Generate alerts
      const alertas: Alerta[] = [];

      // Alerts from chofer documents
      documentos.forEach(doc => {
        if (doc.fechaVencimiento) {
          const estado = calcularEstadoDocumento(doc.fechaVencimiento);
          if (estado !== 'VIGENTE') {
            const dias = diasHastaVencimiento(doc.fechaVencimiento);
            alertas.push({
              id: `alerta-${doc.id}`,
              tipo: 'documento',
              mensaje: generarMensajeAlerta(doc.nombre, dias),
              criticidad: estado === 'VENCIDO' ? 'alta' : dias <= 7 ? 'alta' : 'media',
              diasRestantes: dias,
              documentoRelacionado: doc.id
            });
          }
        }
      });

      // Alerts from unit documents
      documentosUnidad.forEach(doc => {
        const estado = calcularEstadoDocumento(doc.fechaVencimiento);
        if (estado !== 'VIGENTE') {
          const dias = diasHastaVencimiento(doc.fechaVencimiento);
          alertas.push({
            id: `alerta-${doc.id}`,
            tipo: 'documento',
            mensaje: generarMensajeAlerta(doc.nombre, dias),
            criticidad: estado === 'VENCIDO' ? 'alta' : dias <= 7 ? 'alta' : 'media',
            diasRestantes: dias,
            documentoRelacionado: doc.id
          });
        }
      });

      // Alerts from cuadernillos
      cuadernillos.forEach((cuad, index) => {
        const estado = calcularEstadoDocumento(cuad.fechaVencimiento);
        if (estado !== 'VIGENTE') {
          const dias = diasHastaVencimiento(cuad.fechaVencimiento);
          alertas.push({
            id: `alerta-cuadernillo-${index}`,
            tipo: 'cuadernillo',
            mensaje: generarMensajeAlerta(`Cuadernillo ${cuad.mes}`, dias),
            criticidad: 'alta',
            diasRestantes: dias
          });
        }
      });

      console.log('[DocumentosStore] ✅ Documentos cargados desde Sheets. Alertas:', alertas.length);

      set({
        loading: false,
        infoChofer: {
          nombre: nombreChofer,
          unidad,
          esPropio,
          documentos,
          documentosUnidad,
          cuadernillos,
          alertas: alertas.sort((a, b) => a.diasRestantes - b.diasRestantes)
        }
      });
    } catch (error) {
      console.error('[DocumentosStore] ❌ Error cargando documentos:', error);
      set({
        loading: false,
        error: 'Error al cargar documentos',
        infoChofer: null
      });
    }
  },

  limpiar: () => {
    console.log('[DocumentosStore] Limpiando store');
    set({ infoChofer: null, loading: false, error: null });
  }
}));
