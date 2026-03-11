/**
 * DASHBOARD TALLER - Vista Operativa para Personal de Mantenimiento
 * Permite a mecánicos/herreros/ayudantes gestionar sus órdenes de trabajo
 */

import React, { useState, useEffect } from 'react';
import { showSuccess, showError, showWarning, showInfo } from '../../utils/toast';
import { generateOrdenTrabajoPDF, type PDFResult } from '../../utils/pdfGenerator';
import { ModalPrevisualizacionPDF } from './ModalPrevisualizacionPDF';
import { convertirTimestampFirebase } from '../../utils/dateUtils';
import {
  collection,
  query,
  getDocs,
  where,
  orderBy,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useTallerStore, type PersonalMantenimiento } from '../../stores/tallerStore';
import type { OrdenTrabajo, ConsumoCombustible, ChecklistRegistro } from '../../types/checklist';
import { getAllCargasCombustible } from '../../services/combustibleService';
import { ModalCrearOrden } from '../modals/ModalCrearOrden';
import { TODAS_LAS_UNIDADES, UNIDADES_VRAC, UNIDADES_VITAL_AIRE, UNIDADES_DISTRIBUCION } from '../CarouselSector';
import AlertasTrenRodante, { type DatosOTTrenRodante } from '../trenRodante/AlertasTrenRodante';
import ChecklistTrenRodante40K from '../trenRodante/ChecklistTrenRodante40K';
import ChecklistTrenRodante80K from '../trenRodante/ChecklistTrenRodante80K';
import ChecklistTrenRodante160K from '../trenRodante/ChecklistTrenRodante160K';
import { PanelCubiertas } from '../cubiertas';
import { obtenerAlertasFlota, UNIDADES_CONFIG } from '../../services/cubiertasService';
import AlertasMantenimiento from './AlertasMantenimiento';
import { getAlertasMantenimiento, contarAlertasActivas } from '../../services/alertasMantenimientoService';

// Función para obtener patente de una unidad (usa TODAS_LAS_UNIDADES de CarouselSector)
const obtenerPatente = (numeroUnidad: string): string => {
  const unidad = TODAS_LAS_UNIDADES.find(u => u.numero === numeroUnidad);
  return unidad?.patente || 'N/A';
};

interface DashboardTallerProps {
  onLogout: () => void;
}

type VistaType = 'dashboard' | 'activas' | 'asignadas' | 'checklists' | 'historial' | 'trenRodante' | 'cubiertas' | 'alertas';

interface Filtros {
  prioridad: '' | 'ALTA' | 'MEDIA' | 'BAJA';
  estado: '' | 'EN_PROCESO' | 'ESPERANDO_REPUESTOS';
  unidad: string;
  fechaDesde: string;
  fechaHasta: string;
  // Filtros para Checklists
  sector: '' | 'vrac' | 'vital-aire' | 'distribucion';
  resultado: '' | 'APTO' | 'NO_APTO' | 'PENDIENTE';
}

interface RegistroTrabajo {
  descripcion: string;
  repuestos: { nombre: string; cantidad: number; costo: number }[];
  horasTrabajo: number;
  fotosAntes: File[];
  fotosDespues: File[];
}

export function DashboardTaller({ onLogout }: DashboardTallerProps) {
  const { personal } = useTallerStore();

  // Selección de técnico al tomar OT
  const [mostrarModalTecnico, setMostrarModalTecnico] = useState(false);
  const [ordenParaTomar, setOrdenParaTomar] = useState<OrdenTrabajo | null>(null);

  // Estado principal
  const [vista, setVista] = useState<VistaType>('dashboard');
  const [badgeAlertas, setBadgeAlertas] = useState(0);
  const [badgeCub, setBadgeCub] = useState(0);
  const [ordenesActivas, setOrdenesActivas] = useState<OrdenTrabajo[]>([]);
  const [ordenesAsignadas, setOrdenesAsignadas] = useState<OrdenTrabajo[]>([]);
  const [todasOrdenes, setTodasOrdenes] = useState<OrdenTrabajo[]>([]);
  const [historialUnidad, setHistorialUnidad] = useState<OrdenTrabajo[]>([]);
  const [checklists, setChecklists] = useState<ChecklistRegistro[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [filtros, setFiltros] = useState<Filtros>({
    prioridad: '',
    estado: '',
    unidad: '',
    fechaDesde: '',
    fechaHasta: '',
    sector: '',
    resultado: ''
  });

  // Estados adicionales para historial
  const [ordenesCerradas, setOrdenesCerradas] = useState<OrdenTrabajo[]>([]);
  const [unidadBusquedaHist, setUnidadBusquedaHist] = useState('');

  // Estado para búsqueda de unidad en checklists
  const [unidadBusquedaCheck, setUnidadBusquedaCheck] = useState('');

  // Modales
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenTrabajo | null>(null);
  const [mostrarModalRegistro, setMostrarModalRegistro] = useState(false);
  const [mostrarModalCierre, setMostrarModalCierre] = useState(false);
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
  const [mostrarModalCrearOT, setMostrarModalCrearOT] = useState(false);
  const [checklistSeleccionado, setChecklistSeleccionado] = useState<ChecklistRegistro | null>(null);
  const [mostrarDetalleChecklist, setMostrarDetalleChecklist] = useState(false);
  const [mostrarModalDetalleOT, setMostrarModalDetalleOT] = useState(false);

  // Estados para previsualización de PDF
  const [mostrarPrevisualizacionPDF, setMostrarPrevisualizacionPDF] = useState(false);
  const [pdfData, setPdfData] = useState<PDFResult | null>(null);

  // Estados para Tren Rodante VRAC
  const [showChecklistTR, setShowChecklistTR] = useState<'40K' | '80K' | '160K' | null>(null);
  const [unidadTRSeleccionada, setUnidadTRSeleccionada] = useState<string | null>(null);
  const [datosOTTR, setDatosOTTR] = useState<DatosOTTrenRodante | null>(null);

  // Cargar datos con listeners en tiempo real
  useEffect(() => {

    console.log('[DashboardTaller] 🔄 Iniciando carga de datos para vista:', vista);
    setLoading(true);
    const ordenesRef = collection(db, 'ordenes_trabajo');
    let unsubscribe: (() => void) | undefined;

    if (vista === 'dashboard') {
      // Dashboard: Cargar TODAS las órdenes para análisis y métricas
      console.log('[DashboardTaller] 📊 Cargando todas las órdenes para dashboard');
      unsubscribe = onSnapshot(ordenesRef, (snapshot) => {
        const ordenes = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            fecha: data.fecha instanceof Timestamp ? data.fecha.toDate() : data.fecha,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : data.timestamp,
            fechaCompletado: data.fechaCompletado instanceof Timestamp ? data.fechaCompletado.toDate() : data.fechaCompletado,
            fechaInicio: data.fechaInicio instanceof Timestamp ? data.fechaInicio.toDate() : data.fechaInicio,
            fechaFin: data.fechaFin instanceof Timestamp ? data.fechaFin.toDate() : data.fechaFin,
          };
        }) as OrdenTrabajo[];

        setTodasOrdenes(ordenes);
        setLoading(false);
        console.log('[DashboardTaller] ✨ Dashboard cargado:', ordenes.length, 'órdenes');
      }, (error) => {
        console.error('[DashboardTaller] ❌ Error cargando dashboard:', error);
        setLoading(false);
      });

    } else if (vista === 'activas') {
      // Órdenes pendientes/activas - EN TIEMPO REAL
      // Query simplificada SIN orderBy para evitar necesidad de índices compuestos
      console.log('[DashboardTaller] 📋 Query para órdenes activas: estado in [PENDIENTE, EN_PROCESO, ESPERANDO_REPUESTOS]');
      const q = query(
        ordenesRef,
        where('estado', 'in', ['PENDIENTE', 'EN_PROCESO', 'ESPERANDO_REPUESTOS'])
        // SIN orderBy - se ordena en cliente
      );

      console.log('[DashboardTaller] 🎯 Conectando listener onSnapshot...');
      unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('[DashboardTaller] 📦 Snapshot recibido, docs:', snapshot.docs.length);

        // Mostrar datos crudos para diagnóstico
        snapshot.docs.forEach((doc, idx) => {
          const data = doc.data();
          console.log(`[DashboardTaller] 📄 Orden ${idx + 1}: ID=${doc.id}, estado=${data.estado}, unidad=${data.unidad?.numero || 'N/A'}`);
        });

        const ordenes = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Convertir Timestamps de Firestore a Date
            fecha: data.fecha instanceof Timestamp ? data.fecha.toDate() : data.fecha,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : data.timestamp,
            fechaCompletado: data.fechaCompletado instanceof Timestamp ? data.fechaCompletado.toDate() : data.fechaCompletado,
          };
        }) as OrdenTrabajo[];

        // Ordenar en el cliente (primero por prioridad, luego por timestamp)
        const prioridadOrden = { 'ALTA': 3, 'MEDIA': 2, 'BAJA': 1 };
        ordenes.sort((a, b) => {
          const prioA = prioridadOrden[a.prioridad] || 0;
          const prioB = prioridadOrden[b.prioridad] || 0;
          if (prioA !== prioB) {
            return prioB - prioA; // Por prioridad descendente
          }
          // Si misma prioridad, ordenar por timestamp descendente (más recientes primero)
          return b.timestamp.getTime() - a.timestamp.getTime();
        });

        setOrdenesActivas(ordenes);
        setLoading(false);
        console.log('[DashboardTaller] ✨ Órdenes activas actualizadas en tiempo real:', ordenes.length);
        console.log('[DashboardTaller] 📊 Estado final ordenesActivas:', ordenes);
      }, (error) => {
        console.error('[DashboardTaller] ❌ Error en listener de órdenes activas:', error);
        console.error(error);
        setLoading(false);
      });

    } else if (vista === 'asignadas') {
      // Órdenes asignadas a este técnico - EN TIEMPO REAL
      // Query simplificada SIN orderBy para evitar necesidad de índices compuestos
      const q = query(
        ordenesRef,
        where('estado', 'in', ['EN_PROCESO', 'ESPERANDO_REPUESTOS'])
        // SIN orderBy - se ordena en cliente
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        const ordenes = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Convertir Timestamps de Firestore a Date
            fecha: data.fecha instanceof Timestamp ? data.fecha.toDate() : data.fecha,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : data.timestamp,
            fechaCompletado: data.fechaCompletado instanceof Timestamp ? data.fechaCompletado.toDate() : data.fechaCompletado,
          };
        }) as OrdenTrabajo[];

        // Ordenar en el cliente (primero por prioridad, luego por timestamp)
        const prioridadOrden = { 'ALTA': 3, 'MEDIA': 2, 'BAJA': 1 };
        ordenes.sort((a, b) => {
          const prioA = prioridadOrden[a.prioridad] || 0;
          const prioB = prioridadOrden[b.prioridad] || 0;
          if (prioA !== prioB) {
            return prioB - prioA; // Por prioridad descendente
          }
          // Si misma prioridad, ordenar por timestamp descendente
          return b.timestamp.getTime() - a.timestamp.getTime();
        });

        setOrdenesAsignadas(ordenes);
        setLoading(false);
        console.log('[DashboardTaller] ✨ Mis órdenes actualizadas en tiempo real:', ordenes.length);
      }, (error) => {
        console.error('[DashboardTaller] ❌ Error en listener de mis órdenes:', error);
        console.error(error);
        setLoading(false);
      });

    } else if (vista === 'checklists') {
      // Cargar checklists de los choferes
      console.log('[DashboardTaller] 📋 Cargando checklists...');
      const checklistsRef = collection(db, 'checklists');
      const q = query(checklistsRef, orderBy('timestamp', 'desc'), limit(1000));

      unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            ...docData,
            fecha: convertirTimestampFirebase(docData.fecha),
            timestamp: convertirTimestampFirebase(docData.timestamp),
            timestampCompletado: docData.timestampCompletado
              ? convertirTimestampFirebase(docData.timestampCompletado)
              : null,
            odometroInicial: docData.odometroInicial ? {
              ...docData.odometroInicial,
              fecha_hora: convertirTimestampFirebase(docData.odometroInicial.fecha_hora)
            } : { valor: 0, fecha_hora: new Date() },
            odometroFinal: docData.odometroFinal
              ? {
                  ...docData.odometroFinal,
                  fecha_hora: convertirTimestampFirebase(docData.odometroFinal.fecha_hora)
                }
              : null,
            items: (docData.items || []).map((item: any) => ({
              ...item,
              timestamp: item.timestamp ? convertirTimestampFirebase(item.timestamp) : null
            }))
          } as ChecklistRegistro;
        });

        // Ordenar por timestamp descendente (más reciente primero)
        data.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        setChecklists(data);
        setLoading(false);
        console.log('[DashboardTaller] ✨ Checklists cargados:', data.length);
      }, (error) => {
        console.error('[DashboardTaller] ❌ Error cargando checklists:', error);
        setLoading(false);
      });

    } else if (vista === 'historial') {
      // Cargar órdenes cerradas para el historial (incluye CERRADO y COMPLETADA legacy)
      console.log('[DashboardTaller] 📋 Cargando historial de órdenes cerradas...');
      const q = query(
        ordenesRef,
        where('estado', 'in', ['CERRADO', 'COMPLETADA'])
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        const ordenes = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            fecha: data.fecha instanceof Timestamp ? data.fecha.toDate() : data.fecha,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : data.timestamp,
            fechaCompletado: data.fechaCompletado instanceof Timestamp ? data.fechaCompletado.toDate() : data.fechaCompletado,
            timestampCompletada: data.timestampCompletada instanceof Timestamp ? data.timestampCompletada.toDate() : data.timestampCompletada,
          };
        }) as OrdenTrabajo[];

        // Ordenar por fecha de cierre descendente (más reciente primero)
        ordenes.sort((a, b) => {
          const fechaA = a.timestampCompletada || a.fechaCompletado || a.timestamp;
          const fechaB = b.timestampCompletada || b.fechaCompletado || b.timestamp;
          return new Date(fechaB).getTime() - new Date(fechaA).getTime();
        });

        setOrdenesCerradas(ordenes);
        setLoading(false);
        console.log('[DashboardTaller] ✨ Historial cargado:', ordenes.length, 'órdenes cerradas');
      }, (error) => {
        console.error('[DashboardTaller] ❌ Error cargando historial:', error);
        setLoading(false);
      });
    } else if (vista === 'trenRodante') {
      // Tren Rodante: El componente AlertasTrenRodante maneja su propio loading
      console.log('[DashboardTaller] 🚛 Vista Tren Rodante - loading manejado por componente');
      setLoading(false);
    } else if (vista === 'cubiertas') {
      // Cubiertas: El componente PanelCubiertas maneja su propio loading
      console.log('[DashboardTaller] 🛞 Vista Cubiertas - loading manejado por componente');
      setLoading(false);
    } else if (vista === 'alertas') {
      // Alertas: El componente AlertasMantenimiento maneja su propio loading
      console.log('[DashboardTaller] 🔔 Vista Alertas - loading manejado por componente');
      setLoading(false);
    }

    // Cleanup: Desuscribirse cuando cambie la vista o el componente se desmonte
    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log('[DashboardTaller] Listener desuscrito');
      }
    };
  }, [vista]);

  // Cargar badges al montar
  useEffect(() => {
    getAlertasMantenimiento().then(alertas => {
      setBadgeAlertas(contarAlertasActivas(alertas));
    }).catch(() => {});
    obtenerAlertasFlota().then(alertas => {
      setBadgeCub(alertas.length);
    }).catch(() => {});
  }, []);

  const cargarOrdenes = () => {
    // Función vacía - los datos se cargan automáticamente con onSnapshot
    console.log('[DashboardTaller] Datos en tiempo real - no necesita recarga manual');
  };

  const handleTomarOT = (orden: OrdenTrabajo) => {
    setOrdenParaTomar(orden);
    setMostrarModalTecnico(true);
  };

  const confirmarTomarOT = async (tecnico: PersonalMantenimiento) => {
    if (!ordenParaTomar?.id) return;
    setMostrarModalTecnico(false);
    try {
      const ordenRef = doc(db, 'ordenes_trabajo', ordenParaTomar.id);
      await updateDoc(ordenRef, {
        estado: 'EN_PROCESO',
        asignadoA: tecnico.nombre,
        fechaInicio: serverTimestamp()
      });
      showSuccess(`OT asignada a ${tecnico.nombre}`);
    } catch (error) {
      console.error('[DashboardTaller] Error tomando OT:', error);
      showError('Error al tomar la orden. Intenta nuevamente.');
    } finally {
      setOrdenParaTomar(null);
    }
  };

  const handleMarcarEsperandoRepuestos = async (orden: OrdenTrabajo) => {
    if (!orden.id) return;

    const motivo = prompt('¿Qué repuestos faltan?');
    if (!motivo) return;

    try {
      const ordenRef = doc(db, 'ordenes_trabajo', orden.id);
      await updateDoc(ordenRef, {
        estado: 'ESPERANDO_REPUESTOS',
        motivoEspera: motivo,
        fechaEspera: serverTimestamp()
      });

      console.log('[DashboardTaller] OT marcada esperando repuestos:', orden.numeroOT);
      showWarning(`Orden ${orden.numeroOT} marcada como "Esperando Repuestos"`);
      // No necesita cargarOrdenes() - onSnapshot actualiza automáticamente
    } catch (error) {
      console.error('[DashboardTaller] Error marcando espera:', error);
      showError('Error al marcar como esperando repuestos.');
    }
  };

  const handleAbrirRegistroTrabajo = (orden: OrdenTrabajo) => {
    setOrdenSeleccionada(orden);
    setMostrarModalRegistro(true);
  };

  const handleAbrirCierreOT = (orden: OrdenTrabajo) => {
    setOrdenSeleccionada(orden);
    setMostrarModalCierre(true);
  };

  const handleVerHistorialUnidad = async (numeroUnidad: string) => {
    setLoading(true);
    try {
      const ordenesRef = collection(db, 'ordenes_trabajo');
      // Query simplificada SIN orderBy para evitar necesidad de índices compuestos
      const q = query(
        ordenesRef,
        where('unidad.numero', '==', numeroUnidad)
      );

      const snapshot = await getDocs(q);
      const ordenes = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convertir Timestamps de Firestore a Date
          fecha: data.fecha instanceof Timestamp ? data.fecha.toDate() : data.fecha,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : data.timestamp,
          fechaCompletado: data.fechaCompletado instanceof Timestamp ? data.fechaCompletado.toDate() : data.fechaCompletado,
        };
      }) as OrdenTrabajo[];

      // Ordenar en el cliente por timestamp descendente (más recientes primero)
      ordenes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      console.log('[DashboardTaller] Historial cargado:', ordenes.length, 'órdenes');
      setHistorialUnidad(ordenes);
      setMostrarModalHistorial(true);
    } catch (error) {
      console.error('[DashboardTaller] Error cargando historial:', error);
      showError(`Error al cargar historial de la unidad ${numeroUnidad}. Detalle: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Renderizar dashboard principal
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1a2332] text-white p-4 md:p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-3xl md:text-4xl">🔧</div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Panel Taller</h1>
              <p className="text-white/90 text-xs md:text-sm">Crosslog Mantenimiento</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarModalCrearOT(true)}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-lg text-xs md:text-sm font-semibold transition-all shadow-lg"
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Crear OT</span>
              </span>
            </button>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs md:text-sm font-semibold transition-all backdrop-blur-sm"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Tabs — mismo patrón que DashboardMantenimiento */}
      <div className="w-full px-1 sm:px-2 md:px-2">
        <div className="bg-white rounded-t-2xl shadow-lg">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex border-b border-gray-200 min-w-max sm:min-w-0">

              {/* Dash */}
              <button onClick={() => setVista('dashboard')} className={`flex-1 min-w-[38px] sm:min-w-0 px-1 sm:px-2 md:px-3 py-1.5 sm:py-2 md:py-2.5 font-semibold transition-colors ${vista === 'dashboard' ? 'text-[#56ab2f] border-b-2 border-[#56ab2f] bg-[#f0f9e8]' : 'text-gray-500 hover:text-[#56ab2f] hover:bg-gray-50'}`}>
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  <span className="text-[10px] sm:text-xs whitespace-nowrap">Dash</span>
                </div>
              </button>

              {/* Disponibles */}
              <button onClick={() => setVista('activas')} className={`flex-1 min-w-[38px] sm:min-w-0 px-1 sm:px-2 md:px-3 py-1.5 sm:py-2 md:py-2.5 font-semibold transition-colors ${vista === 'activas' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'}`}>
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <div className="relative">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    <span className={`absolute -top-1.5 -right-2 text-[8px] min-w-[16px] h-4 flex items-center justify-center px-1 rounded-full font-bold ${vista === 'activas' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'}`}>{ordenesActivas.length}</span>
                  </div>
                  <span className="text-[10px] sm:text-xs whitespace-nowrap">Disp</span>
                </div>
              </button>

              {/* Asignadas */}
              <button onClick={() => setVista('asignadas')} className={`flex-1 min-w-[38px] sm:min-w-0 px-1 sm:px-2 md:px-3 py-1.5 sm:py-2 md:py-2.5 font-semibold transition-colors ${vista === 'asignadas' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50' : 'text-gray-500 hover:text-purple-600 hover:bg-gray-50'}`}>
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <div className="relative">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    <span className={`absolute -top-1.5 -right-2 text-[8px] min-w-[16px] h-4 flex items-center justify-center px-1 rounded-full font-bold ${vista === 'asignadas' ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-700'}`}>{ordenesAsignadas.length}</span>
                  </div>
                  <span className="text-[10px] sm:text-xs whitespace-nowrap">Asign</span>
                </div>
              </button>

              {/* Checklists */}
              <button onClick={() => setVista('checklists')} className={`flex-1 min-w-[38px] sm:min-w-0 px-1 sm:px-2 md:px-3 py-1.5 sm:py-2 md:py-2.5 font-semibold transition-colors ${vista === 'checklists' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50' : 'text-gray-500 hover:text-emerald-600 hover:bg-gray-50'}`}>
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <div className="relative">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    <span className={`absolute -top-1.5 -right-2 text-[8px] min-w-[16px] h-4 flex items-center justify-center px-1 rounded-full font-bold ${vista === 'checklists' ? 'bg-emerald-600 text-white' : 'bg-gray-300 text-gray-700'}`}>{checklists.length}</span>
                  </div>
                  <span className="text-[10px] sm:text-xs whitespace-nowrap">Check</span>
                </div>
              </button>

              {/* Historial */}
              <button onClick={() => setVista('historial')} className={`flex-1 min-w-[38px] sm:min-w-0 px-1 sm:px-2 md:px-3 py-1.5 sm:py-2 md:py-2.5 font-semibold transition-colors ${vista === 'historial' ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50' : 'text-gray-500 hover:text-amber-600 hover:bg-gray-50'}`}>
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <div className="relative">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className={`absolute -top-1.5 -right-2 text-[8px] min-w-[16px] h-4 flex items-center justify-center px-1 rounded-full font-bold ${vista === 'historial' ? 'bg-amber-600 text-white' : 'bg-gray-300 text-gray-700'}`}>{ordenesCerradas.length}</span>
                  </div>
                  <span className="text-[10px] sm:text-xs whitespace-nowrap">Hist</span>
                </div>
              </button>

              {/* Tren Rodante */}
              <button onClick={() => setVista('trenRodante')} className={`flex-1 min-w-[38px] sm:min-w-0 px-1 sm:px-2 md:px-3 py-1.5 sm:py-2 md:py-2.5 font-semibold transition-colors ${vista === 'trenRodante' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'}`}>
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3m0 0h2l3 3v4h-2m-3-7v7M7 17a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4z" /></svg>
                  <span className="text-[10px] sm:text-xs whitespace-nowrap">T.Rod</span>
                </div>
              </button>

              {/* Cubiertas */}
              <button onClick={() => setVista('cubiertas')} className={`flex-1 min-w-[38px] sm:min-w-0 px-1 sm:px-2 md:px-3 py-1.5 sm:py-2 md:py-2.5 font-semibold transition-colors ${vista === 'cubiertas' ? 'text-gray-800 border-b-2 border-gray-800 bg-gray-100' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <div className="relative">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2} /><circle cx="12" cy="12" r="3" strokeWidth={2} /></svg>
                    {badgeCub > 0 && (
                      <span className={`absolute -top-1.5 -right-2 text-[8px] min-w-[16px] h-4 flex items-center justify-center px-1 rounded-full font-bold ${vista === 'cubiertas' ? 'bg-gray-800 text-white' : 'bg-gray-300 text-gray-700'}`}>{badgeCub}</span>
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs whitespace-nowrap">Cub</span>
                </div>
              </button>

              {/* Alertas */}
              <button onClick={() => setVista('alertas')} className={`flex-1 min-w-[38px] sm:min-w-0 px-1 sm:px-2 md:px-3 py-1.5 sm:py-2 md:py-2.5 font-semibold transition-colors ${vista === 'alertas' ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50' : 'text-gray-500 hover:text-amber-600 hover:bg-gray-50'}`}>
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <div className="relative">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    {badgeAlertas > 0 && (
                      <span className={`absolute -top-1.5 -right-2 text-[8px] min-w-[16px] h-4 flex items-center justify-center px-1 rounded-full font-bold ${vista === 'alertas' ? 'bg-amber-600 text-white' : 'bg-gray-300 text-gray-700'}`}>{badgeAlertas}</span>
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs whitespace-nowrap">Aler</span>
                </div>
              </button>

            </div>
          </div>
        </div>
      </div>

      {/* Filtros - Solo mostrar si no es dashboard, checklists, historial, trenRodante, cubiertas o alertas */}
      {vista !== 'dashboard' && vista !== 'checklists' && vista !== 'historial' && vista !== 'trenRodante' && vista !== 'cubiertas' && vista !== 'alertas' && (
        <div className="bg-gradient-to-br from-green-50 to-gray-50 border-b border-green-200 p-3 md:p-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4">
              {/* Filtro Módulo */}
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">Módulo</label>
                <select
                  value={filtros.sector}
                  onChange={(e) => setFiltros({ ...filtros, sector: e.target.value as any })}
                  className="w-full px-3 py-2.5 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56ab2f] focus:border-[#56ab2f] bg-white"
                  style={{ fontSize: '16px' }}
                >
                  <option value="">Todos los módulos</option>
                  <option value="vrac">🛢️ VRAC</option>
                  <option value="distribucion">📦 Distribución</option>
                  <option value="vital-aire">🚐 Vital Aire</option>
                </select>
              </div>

              {/* Filtro Estado */}
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">Estado</label>
                <select
                  value={filtros.estado}
                  onChange={(e) => setFiltros({ ...filtros, estado: e.target.value as any })}
                  className="w-full px-3 py-2.5 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56ab2f] focus:border-[#56ab2f] bg-white"
                  style={{ fontSize: '16px' }}
                >
                  <option value="">Todos los estados</option>
                  <option value="EN_PROCESO">🔧 Órdenes de Trabajo</option>
                  <option value="ESPERANDO_REPUESTOS">📦 Esperando Repuestos</option>
                </select>
              </div>

              {/* Filtro Prioridad */}
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">Prioridad</label>
                <select
                  value={filtros.prioridad}
                  onChange={(e) => setFiltros({ ...filtros, prioridad: e.target.value as any })}
                  className="w-full px-3 py-2.5 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56ab2f] focus:border-[#56ab2f] bg-white"
                  style={{ fontSize: '16px' }}
                >
                  <option value="">Todas las prioridades</option>
                  <option value="ALTA">🔴 ALTA</option>
                  <option value="MEDIA">🟡 MEDIA</option>
                  <option value="BAJA">🟢 BAJA</option>
                </select>
              </div>

              {/* Filtro Unidad */}
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">Unidad</label>
                <input
                  type="text"
                  placeholder="Buscar unidad..."
                  value={filtros.unidad}
                  onChange={(e) => setFiltros({ ...filtros, unidad: e.target.value })}
                  className="w-full px-3 py-2.5 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#56ab2f] focus:border-[#56ab2f] bg-white"
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* Botón Limpiar + Indicador */}
              <div className="flex flex-col justify-end gap-2">
                <button
                  onClick={() => setFiltros({ prioridad: '', estado: '', unidad: '', fechaDesde: '', fechaHasta: '', sector: '', resultado: '' })}
                  className="w-full px-3 py-2.5 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 font-semibold rounded-lg hover:from-gray-300 hover:to-gray-400 active:scale-95 transition-all shadow-sm text-sm"
                >
                  Limpiar Filtros
                </button>
                <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-green-100 border border-green-300 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-semibold text-green-700">Tiempo real</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Cargando órdenes...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {vista === 'dashboard' && (
              <VistaDashboard ordenes={todasOrdenes} />
            )}

            {vista === 'activas' && (
              <ListaOrdenesActivas
                ordenes={ordenesActivas.filter(o => {
                  const unidadesSector: Record<string, string[]> = {
                    'vrac': UNIDADES_VRAC.map(u => u.numero),
                    'distribucion': UNIDADES_DISTRIBUCION.map(u => u.numero),
                    'vital-aire': UNIDADES_VITAL_AIRE.map(u => u.numero),
                  };
                  return (
                    (!filtros.prioridad || o.prioridad === filtros.prioridad) &&
                    (!filtros.estado || o.estado === filtros.estado) &&
                    (!filtros.unidad || o.unidad.numero.includes(filtros.unidad)) &&
                    (!filtros.sector || (unidadesSector[filtros.sector] || []).includes(o.unidad?.numero))
                  );
                })}
                onTomarOT={handleTomarOT}
                onVerHistorial={handleVerHistorialUnidad}
                onVerDetalle={(orden) => {
                  setOrdenSeleccionada(orden);
                  setMostrarModalDetalleOT(true);
                }}
                tecnicoActual={''}
              />
            )}

            {vista === 'asignadas' && (
              <ListaOrdenesAsignadas
                ordenes={ordenesAsignadas.filter(o => {
                  const unidadesSector: Record<string, string[]> = {
                    'vrac': UNIDADES_VRAC.map(u => u.numero),
                    'distribucion': UNIDADES_DISTRIBUCION.map(u => u.numero),
                    'vital-aire': UNIDADES_VITAL_AIRE.map(u => u.numero),
                  };
                  return (
                    (!filtros.prioridad || o.prioridad === filtros.prioridad) &&
                    (!filtros.estado || o.estado === filtros.estado) &&
                    (!filtros.unidad || o.unidad.numero.includes(filtros.unidad)) &&
                    (!filtros.sector || (unidadesSector[filtros.sector] || []).includes(o.unidad?.numero))
                  );
                })}
                onRegistrarTrabajo={handleAbrirRegistroTrabajo}
                onMarcarEsperando={handleMarcarEsperandoRepuestos}
                onCerrarOT={handleAbrirCierreOT}
                onVerHistorial={handleVerHistorialUnidad}
                onVerDetalle={(orden) => {
                  setOrdenSeleccionada(orden);
                  setMostrarModalDetalleOT(true);
                }}
              />
            )}

            {vista === 'checklists' && (
              <div>
                {/* Filtros para Checklists */}
                <div className="bg-gradient-to-br from-emerald-50 to-gray-50 rounded-xl p-3 md:p-4 mb-4 md:mb-6 border border-emerald-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
                    <div>
                      <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">Sector</label>
                      <select
                        value={filtros.sector}
                        onChange={(e) => setFiltros({ ...filtros, sector: e.target.value as any })}
                        className="w-full px-3 md:px-4 py-2.5 md:py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white touch-target-48"
                        style={{ fontSize: '16px' }}
                      >
                        <option value="">Todos los sectores</option>
                        <option value="vrac">VRAC Cisternas</option>
                        <option value="vital-aire">Vital Aire</option>
                        <option value="distribucion">Distribución</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">Resultado</label>
                      <select
                        value={filtros.resultado}
                        onChange={(e) => setFiltros({ ...filtros, resultado: e.target.value as any })}
                        className="w-full px-3 md:px-4 py-2.5 md:py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white touch-target-48"
                        style={{ fontSize: '16px' }}
                      >
                        <option value="">Todos</option>
                        <option value="APTO">APTO</option>
                        <option value="NO_APTO">NO APTO</option>
                        <option value="PENDIENTE">PENDIENTE</option>
                      </select>
                    </div>

                    <div className="relative">
                      <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">Unidad</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={unidadBusquedaCheck}
                          onChange={(e) => setUnidadBusquedaCheck(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setFiltros({ ...filtros, unidad: unidadBusquedaCheck });
                              setUnidadBusquedaCheck('');
                            }
                          }}
                          placeholder={filtros.unidad ? `Filtrado: INT-${filtros.unidad}` : "Buscar INT..."}
                          className="flex-1 px-3 md:px-4 py-2.5 md:py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white touch-target-48"
                          style={{ fontSize: '16px' }}
                        />
                        {filtros.unidad && (
                          <button
                            type="button"
                            onClick={() => {
                              setFiltros({ ...filtros, unidad: '' });
                              setUnidadBusquedaCheck('');
                            }}
                            className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-semibold text-sm"
                            title="Quitar filtro"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      {/* Dropdown de sugerencias */}
                      {unidadBusquedaCheck && (
                        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-emerald-500 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {TODAS_LAS_UNIDADES
                            .filter(u => u.numero.includes(unidadBusquedaCheck) || u.patente.toLowerCase().includes(unidadBusquedaCheck.toLowerCase()))
                            .slice(0, 8)
                            .map(u => (
                              <button
                                key={u.numero}
                                type="button"
                                onClick={() => {
                                  setFiltros({ ...filtros, unidad: u.numero });
                                  setUnidadBusquedaCheck('');
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-emerald-50 transition-colors flex justify-between items-center"
                              >
                                <span className="font-semibold text-gray-800">INT-{u.numero}</span>
                                <span className="text-sm text-gray-500">{u.patente}</span>
                              </button>
                            ))}
                          {TODAS_LAS_UNIDADES.filter(u => u.numero.includes(unidadBusquedaCheck) || u.patente.toLowerCase().includes(unidadBusquedaCheck.toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-gray-500 text-sm">No se encontraron unidades</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          setFiltros({ ...filtros, sector: '', resultado: '', unidad: '' });
                          setUnidadBusquedaCheck('');
                        }}
                        className="w-full px-3 md:px-4 py-2.5 md:py-2 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 font-semibold rounded-lg hover:from-gray-300 hover:to-gray-400 active:scale-95 transition-all shadow-sm touch-target-48 text-sm md:text-base"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista de Checklists con filtros aplicados */}
                <ListaChecklists
                  checklists={checklists.filter(checklist => {
                    // Filtro por sector
                    if (filtros.sector && checklist.sector !== filtros.sector) return false;
                    // Filtro por resultado
                    if (filtros.resultado && checklist.resultado !== filtros.resultado) return false;
                    // Filtro por unidad
                    if (filtros.unidad && !checklist.unidad.numero.includes(filtros.unidad)) return false;
                    return true;
                  })}
                  onChecklistClick={(checklist) => {
                    setChecklistSeleccionado(checklist);
                    setMostrarDetalleChecklist(true);
                  }}
                />
              </div>
            )}

            {/* Tab Historial - Órdenes Completadas */}
            {vista === 'historial' && (
              <div>
                {/* Filtros para Historial */}
                <div className="bg-gradient-to-br from-amber-50 to-gray-50 rounded-xl p-3 md:p-4 mb-4 md:mb-6 border border-amber-200">
                  <h3 className="text-lg md:text-xl font-bold text-amber-700 mb-3 md:mb-4">
                    Historial de Trabajos Completados
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="relative">
                      <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">Unidad</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder={filtros.unidad ? `Filtrado: INT-${filtros.unidad}` : "Buscar INT..."}
                          value={unidadBusquedaHist}
                          onChange={(e) => setUnidadBusquedaHist(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setFiltros({ ...filtros, unidad: unidadBusquedaHist });
                              setUnidadBusquedaHist('');
                            }
                          }}
                          className="flex-1 px-3 md:px-4 py-2.5 md:py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white touch-target-48"
                          style={{ fontSize: '16px' }}
                        />
                        {filtros.unidad && (
                          <button
                            type="button"
                            onClick={() => {
                              setFiltros({ ...filtros, unidad: '' });
                              setUnidadBusquedaHist('');
                            }}
                            className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-semibold text-sm"
                            title="Quitar filtro"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      {/* Dropdown de sugerencias */}
                      {unidadBusquedaHist && (
                        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-amber-500 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {TODAS_LAS_UNIDADES
                            .filter(u => u.numero.includes(unidadBusquedaHist) || u.patente.toLowerCase().includes(unidadBusquedaHist.toLowerCase()))
                            .slice(0, 8)
                            .map(u => (
                              <button
                                key={u.numero}
                                type="button"
                                onClick={() => {
                                  setFiltros({ ...filtros, unidad: u.numero });
                                  setUnidadBusquedaHist('');
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-amber-50 transition-colors flex justify-between items-center"
                              >
                                <span className="font-semibold text-gray-800">INT-{u.numero}</span>
                                <span className="text-sm text-gray-500">{u.patente}</span>
                              </button>
                            ))}
                          {TODAS_LAS_UNIDADES.filter(u => u.numero.includes(unidadBusquedaHist) || u.patente.toLowerCase().includes(unidadBusquedaHist.toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-gray-500 text-sm">No se encontraron unidades</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">Fecha Desde</label>
                      <input
                        type="date"
                        value={filtros.fechaDesde}
                        onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
                        className="w-full px-3 md:px-4 py-2.5 md:py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white touch-target-48"
                        style={{ fontSize: '16px' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">Fecha Hasta</label>
                      <input
                        type="date"
                        value={filtros.fechaHasta}
                        onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
                        className="w-full px-3 md:px-4 py-2.5 md:py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white touch-target-48"
                        style={{ fontSize: '16px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Lista de Órdenes Completadas */}
                <div className="space-y-3 md:space-y-4">
                  {ordenesCerradas
                    .filter(orden => {
                      // Filtro por unidad
                      if (filtros.unidad && !orden.unidad.numero.includes(filtros.unidad)) return false;

                      // Filtros por fecha
                      const fechaOrden = orden.timestampCompletada || orden.fechaCompletado || orden.timestamp;
                      if (filtros.fechaDesde) {
                        const fechaDesde = new Date(filtros.fechaDesde);
                        if (new Date(fechaOrden) < fechaDesde) return false;
                      }
                      if (filtros.fechaHasta) {
                        const fechaHasta = new Date(filtros.fechaHasta);
                        fechaHasta.setHours(23, 59, 59);
                        if (new Date(fechaOrden) > fechaHasta) return false;
                      }

                      return true;
                    })
                    .map(orden => (
                      <div
                        key={orden.id}
                        onClick={() => {
                          setOrdenSeleccionada(orden);
                          setMostrarModalDetalleOT(true);
                        }}
                        className="bg-white rounded-xl p-4 md:p-5 border-2 border-amber-200 hover:border-amber-400 hover:shadow-lg transition-all cursor-pointer"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                              <span className="text-white font-bold text-lg md:text-xl">
                                {orden.unidad.numero}
                              </span>
                            </div>
                            <div>
                              <div className="font-bold text-base md:text-lg text-gray-800">
                                OT #{orden.numeroOT || orden.id?.slice(-6)}
                              </div>
                              <div className="text-sm md:text-base text-gray-600">
                                Unidad {orden.unidad.numero} - {obtenerPatente(orden.unidad.numero) || orden.unidad.patente || 'N/A'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs md:text-sm font-semibold">
                              COMPLETADO
                            </span>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const result = await generateOrdenTrabajoPDF(orden);
                                  setPdfData(result);
                                  setMostrarPrevisualizacionPDF(true);
                                } catch (error) {
                                  showError('Error al generar PDF');
                                }
                              }}
                              className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                              title="Ver PDF"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="text-sm md:text-base text-gray-700 mb-3 line-clamp-2">
                          {orden.descripcion}
                        </div>

                        {/* Mostrar resumen de registros de trabajo */}
                        {orden.registrosTrabajo && orden.registrosTrabajo.length > 0 && (
                          <div className="bg-amber-50 rounded-lg p-3 mb-3 border border-amber-200">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-semibold text-amber-700">
                                {orden.registrosTrabajo.length} registro(s) de trabajo
                              </span>
                              <div className="flex gap-4 text-gray-600">
                                <span>Hrs: {orden.horasTrabajo || 0}</span>
                                <span>Costo: ${orden.costoReparacion?.toLocaleString() || 0}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 text-xs md:text-sm">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{(() => {
                              const fecha = orden.timestampCompletada || orden.fechaCompletado || orden.timestamp;
                              return fecha ? new Date(fecha).toLocaleDateString('es-AR') : 'Sin fecha';
                            })()}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>{orden.mecanico || orden.asignadoA || 'Sin asignar'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <span className={`font-semibold ${
                              orden.prioridad === 'ALTA' ? 'text-red-600' :
                              orden.prioridad === 'MEDIA' ? 'text-amber-600' :
                              'text-green-600'
                            }`}>
                              {orden.prioridad}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{orden.tipo || 'Correctivo'}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                  {ordenesCerradas.length === 0 && (
                    <div className="text-center py-12 md:py-16">
                      <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-amber-100 rounded-full mb-4">
                        <svg className="w-8 h-8 md:w-10 md:h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-base md:text-lg text-gray-600 font-medium">
                        No hay órdenes de trabajo completadas
                      </p>
                      <p className="text-sm md:text-base text-gray-500 mt-2">
                        Las órdenes cerradas aparecerán aquí automáticamente
                      </p>
                    </div>
                  )}

                  {ordenesCerradas.length > 0 && ordenesCerradas.filter(o => {
                    if (filtros.unidad && !o.unidad.numero.includes(filtros.unidad)) return false;
                    const fechaOrden = o.timestampCompletada || o.fechaCompletado || o.timestamp;
                    if (filtros.fechaDesde && new Date(fechaOrden) < new Date(filtros.fechaDesde)) return false;
                    if (filtros.fechaHasta) {
                      const fechaHasta = new Date(filtros.fechaHasta);
                      fechaHasta.setHours(23, 59, 59);
                      if (new Date(fechaOrden) > fechaHasta) return false;
                    }
                    return true;
                  }).length === 0 && (
                    <div className="text-center py-12 md:py-16">
                      <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-full mb-4">
                        <svg className="w-8 h-8 md:w-10 md:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <p className="text-base md:text-lg text-gray-600 font-medium">
                        No se encontraron resultados
                      </p>
                      <p className="text-sm md:text-base text-gray-500 mt-2">
                        Prueba con otros filtros de búsqueda
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab Tren Rodante VRAC */}
            {vista === 'trenRodante' && (
              <AlertasTrenRodante
                onSeleccionarUnidad={(unidad, tipo) => {
                  setUnidadTRSeleccionada(unidad);
                  console.log('[DashboardTaller] Unidad seleccionada:', unidad, tipo);
                }}
                onGenerarOT={(datos) => {
                  console.log('[DashboardTaller] Generando OT Tren Rodante:', datos);
                  setDatosOTTR(datos);
                  setMostrarModalCrearOT(true);
                }}
              />
            )}

            {/* Tab Control de Cubiertas */}
            {vista === 'cubiertas' && (
              <PanelCubiertas
                onGenerarOT={(datos) => {
                  console.log('[DashboardTaller] Generando OT Cubiertas:', datos);
                  // TODO: Implementar creación de OT desde cubiertas
                }}
              />
            )}

            {/* Tab Alertas de Mantenimiento */}
            {vista === 'alertas' && (
              <AlertasMantenimiento
                modo="taller"
                onGenerarOT={(alerta) => {
                  console.log('[DashboardTaller] Generar OT desde alerta:', alerta);
                  // TODO: Abrir modal de nueva OT PREVENTIVO pre-completada
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Modal selección de técnico al tomar OT */}
      {mostrarModalTecnico && ordenParaTomar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">👷</div>
              <h3 className="text-lg font-bold text-gray-900">¿Quién toma esta OT?</h3>
              <p className="text-sm text-gray-500 mt-1">
                {ordenParaTomar.numeroOT} · INT-{ordenParaTomar.unidad?.numero}
              </p>
            </div>
            <div className="space-y-2">
              {personal.filter(p => p.activo).map((tecnico) => (
                <button
                  key={tecnico.id}
                  onClick={() => confirmarTomarOT(tecnico)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-[#56ab2f] hover:bg-[#f0f9e8] transition-all text-left"
                >
                  <span className="text-2xl">
                    {tecnico.rol === 'Encargado' ? '🔑'
                     : tecnico.rol === 'Mecánico' ? '🔧'
                     : tecnico.rol === 'Herrero'  ? '⚙️'
                     : tecnico.rol === 'Ayudante' ? '🛠️'
                     : '👷'}
                  </span>
                  <div>
                    <p className="font-bold text-gray-900">{tecnico.nombre}</p>
                    <p className="text-xs text-gray-500">{tecnico.rol}</p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => { setMostrarModalTecnico(false); setOrdenParaTomar(null); }}
              className="w-full mt-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modales Tren Rodante */}
      {showChecklistTR === '40K' && (
        <div className="fixed inset-0 z-50">
          <ChecklistTrenRodante40K
            unidadNumero={unidadTRSeleccionada || undefined}
            onComplete={() => {
              setShowChecklistTR(null);
              setUnidadTRSeleccionada(null);
              showSuccess('Inspección 40K completada');
            }}
            onBack={() => {
              setShowChecklistTR(null);
              setUnidadTRSeleccionada(null);
            }}
          />
        </div>
      )}

      {showChecklistTR === '80K' && (
        <div className="fixed inset-0 z-50">
          <ChecklistTrenRodante80K
            unidadNumero={unidadTRSeleccionada || undefined}
            onComplete={() => {
              setShowChecklistTR(null);
              setUnidadTRSeleccionada(null);
              showSuccess('Mantenimiento 80K completado');
            }}
            onBack={() => {
              setShowChecklistTR(null);
              setUnidadTRSeleccionada(null);
            }}
          />
        </div>
      )}

      {showChecklistTR === '160K' && (
        <div className="fixed inset-0 z-50">
          <ChecklistTrenRodante160K
            unidadNumero={unidadTRSeleccionada || undefined}
            onComplete={() => {
              setShowChecklistTR(null);
              setUnidadTRSeleccionada(null);
              showSuccess('Mantenimiento 160K completado');
            }}
            onBack={() => {
              setShowChecklistTR(null);
              setUnidadTRSeleccionada(null);
            }}
          />
        </div>
      )}

      {/* Modales */}
      {mostrarModalRegistro && ordenSeleccionada && (
        <ModalRegistroTrabajo
          orden={ordenSeleccionada}
          onClose={() => {
            setMostrarModalRegistro(false);
            setOrdenSeleccionada(null);
          }}
          onGuardado={() => {
            setMostrarModalRegistro(false);
            setOrdenSeleccionada(null);
            // No necesita cargarOrdenes() - onSnapshot actualiza automáticamente
          }}
        />
      )}

      {mostrarModalCierre && ordenSeleccionada && (
        <ModalCierreOT
          orden={ordenSeleccionada}
          tecnico={''}
          onClose={() => {
            setMostrarModalCierre(false);
            setOrdenSeleccionada(null);
          }}
          onCerrado={() => {
            setMostrarModalCierre(false);
            setOrdenSeleccionada(null);
            // No necesita cargarOrdenes() - onSnapshot actualiza automáticamente
          }}
        />
      )}

      {mostrarModalHistorial && (
        <ModalHistorialUnidad
          ordenes={historialUnidad}
          onClose={() => {
            setMostrarModalHistorial(false);
            setHistorialUnidad([]);
          }}
        />
      )}

      {/* Modal Crear Orden de Trabajo */}
      {mostrarModalCrearOT && (
        <ModalCrearOrden
          onClose={() => {
            setMostrarModalCrearOT(false);
            setDatosOTTR(null);
          }}
          onCreated={() => {
            setMostrarModalCrearOT(false);
            setDatosOTTR(null);
          }}
          datosIniciales={datosOTTR ? {
            unidadNumero: datosOTTR.unidadNumero,
            unidadPatente: obtenerPatente(datosOTTR.unidadNumero),
            tipo: 'PREVENTIVO',
            prioridad: datosOTTR.estado === 'VENCIDO' ? 'ALTA' : datosOTTR.estado === 'PROXIMO' ? 'MEDIA' : 'BAJA',
            tipoMantenimientoTR: datosOTTR.tipo,
            kilometrajeActual: datosOTTR.kilometrajeActual,
          } : undefined}
        />
      )}

      {/* Modal Previsualización PDF */}
      <ModalPrevisualizacionPDF
        isOpen={mostrarPrevisualizacionPDF}
        onClose={() => {
          setMostrarPrevisualizacionPDF(false);
          setPdfData(null);
        }}
        pdfUrl={pdfData?.url || ''}
        pdfBlob={pdfData?.blob || null}
        fileName={pdfData?.fileName || ''}
        titulo="Previsualización - Orden de Trabajo"
      />

      {/* Modal Detalle Checklist */}
      {mostrarDetalleChecklist && checklistSeleccionado && (
        <ModalDetalleChecklist
          checklist={checklistSeleccionado}
          onClose={() => {
            setMostrarDetalleChecklist(false);
            setChecklistSeleccionado(null);
          }}
        />
      )}

      {/* Modal Detalle OT */}
      {mostrarModalDetalleOT && ordenSeleccionada && (
        <ModalDetalleOT
          orden={ordenSeleccionada}
          onClose={() => {
            setMostrarModalDetalleOT(false);
            setOrdenSeleccionada(null);
          }}
          onTomarOT={() => {
            setMostrarModalDetalleOT(false);
            handleTomarOT(ordenSeleccionada);
          }}
          tecnicoActual={''}
        />
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE: Vista Dashboard
// ============================================================================

interface VistaDashboardProps {
  ordenes: OrdenTrabajo[];
}

function VistaDashboard({ ordenes }: VistaDashboardProps) {
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<string | null>(null);
  const [mostrarModalFlota, setMostrarModalFlota] = useState(false);
  const [cargasCombustible, setCargasCombustible] = useState<any[]>([]);
  const [loadingCombustible, setLoadingCombustible] = useState(true);
  const [moduloSeleccionado, setModuloSeleccionado] = useState<'vrac' | 'distribucion' | 'vital-aire'>('vrac');
  const [metricasPanel, setMetricasPanel] = useState({
    vrac:         { checklistsHoy: 0, checklistsTotal: 0, otsActivas: 0, neumaticosCriticos: 0, neumaticosRegulares: 0 },
    distribucion: { checklistsHoy: 0, checklistsTotal: 0, otsActivas: 0, neumaticosCriticos: 0, neumaticosRegulares: 0 },
    'vital-aire': { checklistsHoy: 0, checklistsTotal: 0, otsActivas: 0, neumaticosCriticos: 0, neumaticosRegulares: 0 },
  });
  const [loadingMetricas, setLoadingMetricas] = useState(false);

  // Cargar métricas por sector (espejo de ConsultaInterna)
  useEffect(() => {
    const cargarMetricas = async () => {
      setLoadingMetricas(true);
      try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const unidadesVRAC = UNIDADES_CONFIG.filter(u => u.sector === 'vrac').map(u => u.numero);
        const unidadesVitalAire = UNIDADES_CONFIG.filter(u => u.sector === 'vital-aire').map(u => u.numero);
        const unidadesDistribucion = UNIDADES_CONFIG.filter(u => u.sector === 'distribucion').map(u => u.numero);

        const checklistsSnap = await getDocs(collection(db, 'checklists'));
        const checklists = checklistsSnap.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp)
          };
        }) as ChecklistRegistro[];

        const otsSnap = await getDocs(query(
          collection(db, 'ordenes_trabajo'),
          where('estado', 'in', ['PENDIENTE', 'EN_PROCESO', 'ESPERANDO_REPUESTOS'])
        ));
        const ots = otsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as OrdenTrabajo[];

        // Cargar alertas reales de cubiertas desde Firestore
        const alertasCubiertas = await obtenerAlertasFlota();

        const contarCubiertas = (unidades: string[], tipo: 'DESGASTE_CRITICO' | 'DESGASTE_REGULAR') =>
          alertasCubiertas.filter(a => unidades.includes(a.unidadNumero) && a.tipo === tipo).length;

        const calcularMetricasSector = (unidades: string[], sector: string) => {
          const checklistsSector = checklists.filter(c =>
            c.sector === sector || unidades.includes(c.unidad.numero)
          );
          const checklistsHoy = checklistsSector.filter(c => {
            const fecha = new Date(c.timestamp);
            fecha.setHours(0, 0, 0, 0);
            return fecha.getTime() === hoy.getTime();
          }).length;
          const otsSector = ots.filter(ot => unidades.includes(ot.unidad.numero));
          return {
            checklistsHoy,
            checklistsTotal: checklistsSector.length,
            otsActivas: otsSector.length,
            neumaticosCriticos: contarCubiertas(unidades, 'DESGASTE_CRITICO'),
            neumaticosRegulares: contarCubiertas(unidades, 'DESGASTE_REGULAR'),
          };
        };

        setMetricasPanel({
          vrac:         calcularMetricasSector(unidadesVRAC, 'vrac'),
          distribucion: calcularMetricasSector(unidadesDistribucion, 'distribucion'),
          'vital-aire': calcularMetricasSector(unidadesVitalAire, 'vital-aire'),
        });
      } catch (error) {
        console.error('[VistaDashboard] Error cargando métricas:', error);
      } finally {
        setLoadingMetricas(false);
      }
    };
    cargarMetricas();
  }, []);

  // Cargar datos de combustible
  useEffect(() => {
    const cargarCombustible = async () => {
      try {
        setLoadingCombustible(true);
        const cargas = await getAllCargasCombustible(50);
        setCargasCombustible(cargas);
      } catch (error) {
        console.error('[DashboardTaller] Error cargando combustible:', error);
      } finally {
        setLoadingCombustible(false);
      }
    };
    cargarCombustible();
  }, []);

  // Filtrar órdenes por módulo de negocio seleccionado
  const unidadesPorModulo: Record<string, string[]> = {
    'vrac': UNIDADES_VRAC.map(u => u.numero),
    'distribucion': UNIDADES_DISTRIBUCION.map(u => u.numero),
    'vital-aire': UNIDADES_VITAL_AIRE.map(u => u.numero),
  };
  const unidadesModulo = unidadesPorModulo[moduloSeleccionado] || [];
  const ordenesFiltradas = ordenes.filter(o => unidadesModulo.includes(o.unidad?.numero));

  // Calcular métricas
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const ordenesDelMes = ordenesFiltradas.filter(o => {
    const fecha = convertirTimestampFirebase(o.timestamp);
    return fecha >= primerDiaMes;
  });

  const totalOTs = ordenesDelMes.length;
  const otsCompletadas = ordenesFiltradas.filter(o => o.estado === 'CERRADO').length;
  const otsPendientes = ordenesFiltradas.filter(o => ['PENDIENTE', 'EN_PROCESO', 'ESPERANDO_REPUESTOS'].includes(o.estado)).length;
  const porcentajeCompletadas = totalOTs > 0 ? Math.round((otsCompletadas / ordenesFiltradas.length) * 100) : 0;

  // Mecánicos con más trabajo (Top 5)
  const trabajoPorMecanico = ordenesFiltradas
    .filter(o => o.mecanico && o.estado === 'CERRADO')
    .reduce((acc, o) => {
      const nombre = o.mecanico!;
      if (!acc[nombre]) {
        acc[nombre] = { nombre, ots: 0, horas: 0 };
      }
      acc[nombre].ots++;
      acc[nombre].horas += o.horasTrabajo || 0;
      return acc;
    }, {} as Record<string, { nombre: string; ots: number; horas: number }>);

  const topMecanicos = Object.values(trabajoPorMecanico)
    .sort((a, b) => b.ots - a.ots)
    .slice(0, 5);

  const maxOTs = Math.max(...topMecanicos.map(m => m.ots), 1);

  // Unidades de la flota con historial
  const unidadesConHistorial = ordenesFiltradas.reduce((acc, o) => {
    const key = `${o.unidad.numero}-${o.unidad.patente}`;
    if (!acc[key]) {
      acc[key] = {
        numero: o.unidad.numero,
        patente: o.unidad.patente,
        ots: [],
        totalOTs: 0,
        costoTotal: 0,
      };
    }
    acc[key].ots.push(o);
    acc[key].totalOTs++;
    acc[key].costoTotal += o.costoReparacion || o.costo || 0;
    return acc;
  }, {} as Record<string, { numero: string; patente: string; ots: OrdenTrabajo[]; totalOTs: number; costoTotal: number }>);

  const flotaOrdenada = Object.values(unidadesConHistorial)
    .sort((a, b) => b.totalOTs - a.totalOTs);

  // Trabajos por semana (últimas 4 semanas)
  const trabajosPorSemana = Array.from({ length: 4 }, (_, i) => {
    const semanaAtras = new Date(hoy);
    semanaAtras.setDate(hoy.getDate() - (i * 7));
    const inicioSemana = new Date(semanaAtras);
    inicioSemana.setDate(semanaAtras.getDate() - 7);

    const count = ordenesFiltradas.filter(o => {
      const fecha = convertirTimestampFirebase(o.timestamp);
      return fecha >= inicioSemana && fecha < semanaAtras;
    }).length;

    return { semana: `Sem -${i + 1}`, count };
  }).reverse();

  const maxTrabajosSemana = Math.max(...trabajosPorSemana.map(s => s.count), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Panel de Módulos de Negocio */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden">
        {/* Tabs de módulos */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setModuloSeleccionado('vrac')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-semibold transition-all ${
              moduloSeleccionado === 'vrac'
                ? 'bg-cyan-50 text-cyan-700 border-b-2 border-cyan-500'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="text-lg">🛢️</span>
            <span className="hidden sm:inline">VRAC</span>
          </button>
          <button
            onClick={() => setModuloSeleccionado('distribucion')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-semibold transition-all ${
              moduloSeleccionado === 'distribucion'
                ? 'bg-green-50 text-green-700 border-b-2 border-green-500'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="text-lg">📦</span>
            <span className="hidden sm:inline">DISTRIBUCIÓN</span>
          </button>
          <button
            onClick={() => setModuloSeleccionado('vital-aire')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-semibold transition-all ${
              moduloSeleccionado === 'vital-aire'
                ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-500'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="text-lg">🚐</span>
            <span className="hidden sm:inline">VITAL AIRE</span>
          </button>
        </div>

        {/* Métricas del módulo seleccionado */}
        <div className="p-4">
          {loadingMetricas ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#56ab2f]"></div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {/* Checklists */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 sm:p-4 border border-green-100 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] text-center">
                <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Checklists</p>
                <div className="text-xl sm:text-2xl font-bold text-green-700">
                  {metricasPanel[moduloSeleccionado].checklistsHoy}
                  <span className="text-xs sm:text-sm font-normal text-gray-500"> / {metricasPanel[moduloSeleccionado].checklistsTotal}</span>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">hoy / total</p>
              </div>

              {/* OTs Activas */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 sm:p-4 border border-purple-100 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] text-center">
                <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">OTs Activas</p>
                <div className="text-xl sm:text-2xl font-bold text-purple-700">
                  {metricasPanel[moduloSeleccionado].otsActivas}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">pendientes</p>
              </div>

              {/* Neumáticos */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 sm:p-4 border border-amber-100 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] text-center">
                <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Neumáticos</p>
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs sm:text-sm font-bold bg-red-100 text-red-700">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    {metricasPanel[moduloSeleccionado].neumaticosCriticos}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs sm:text-sm font-bold bg-yellow-100 text-yellow-700">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    {metricasPanel[moduloSeleccionado].neumaticosRegulares}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">críticos / regulares</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total OTs del Mes */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-transparent hover:border-[#a8e063] hover:shadow-xl transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#56ab2f] to-[#a8e063] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-3xl font-bold text-gray-900">{totalOTs}</div>
              <p className="text-sm text-gray-600">OTs Este Mes</p>
            </div>
          </div>
        </div>

        {/* OTs Completadas */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-transparent hover:border-[#a8e063] hover:shadow-xl transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#56ab2f] to-[#a8e063] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-3xl font-bold text-[#56ab2f]">{otsCompletadas}</div>
              <p className="text-sm text-gray-600">Completadas</p>
            </div>
          </div>
        </div>

        {/* OTs Pendientes */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-transparent hover:border-[#a8e063] hover:shadow-xl transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-3xl font-bold text-amber-600">{otsPendientes}</div>
              <p className="text-sm text-gray-600">Pendientes</p>
            </div>
          </div>
        </div>

        {/* Tasa de Completitud */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-transparent hover:border-[#a8e063] hover:shadow-xl transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-3xl font-bold text-blue-600">{porcentajeCompletadas}%</div>
              <p className="text-sm text-gray-600">Completitud</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rendimiento por Mecánico */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-[#56ab2f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Top 5 Mecánicos por OTs Completadas
        </h3>
        <div className="space-y-3">
          {topMecanicos.length > 0 ? topMecanicos.map((mecanico) => (
            <div key={mecanico.nombre} className="flex items-center gap-3">
              <div className="w-32 font-medium text-gray-700 truncate">{mecanico.nombre}</div>
              <div className="flex-1 bg-[#f0f9e8] rounded-full h-10 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#56ab2f] to-[#a8e063] h-full flex items-center justify-between px-4 text-white font-bold transition-all duration-500"
                  style={{ width: `${(mecanico.ots / maxOTs) * 100}%` }}
                >
                  <span className="text-sm">{mecanico.ots} OTs</span>
                  <span className="text-xs opacity-90">{mecanico.horas.toFixed(1)}h</span>
                </div>
              </div>
            </div>
          )) : (
            <p className="text-gray-500 text-center py-4">No hay trabajos completados registrados</p>
          )}
        </div>
      </div>

      {/* Historial de Flota */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-[#56ab2f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Historial de Flota
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
          {flotaOrdenada.slice(0, 12).map((unidad) => (
            <button
              key={`${unidad.numero}-${unidad.patente}`}
              onClick={() => {
                setUnidadSeleccionada(`${unidad.numero}-${unidad.patente}`);
                setMostrarModalFlota(true);
              }}
              className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-4 border-2 border-gray-200 hover:border-[#a8e063] hover:shadow-lg transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#56ab2f] to-[#a8e063] rounded-full flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">
                    {unidad.numero}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">INT-{unidad.numero}</div>
                    <div className="text-xs text-gray-600">{unidad.patente}</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-[#56ab2f] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{unidad.totalOTs} mantenimientos</span>
                <span className="text-[#56ab2f] font-semibold">${unidad.costoTotal.toLocaleString()}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Trabajos por Semana */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-[#56ab2f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          Trabajos por Semana (Últimas 4 semanas)
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {trabajosPorSemana.map((sem, idx) => (
            <div key={idx} className="text-center">
              <div className="mb-2 flex flex-col items-center">
                <div className="w-full bg-[#f0f9e8] rounded-t-lg overflow-hidden" style={{ height: '120px' }}>
                  <div
                    className="bg-gradient-to-t from-[#56ab2f] to-[#a8e063] w-full transition-all duration-500 flex items-end justify-center pb-2"
                    style={{ height: `${(sem.count / maxTrabajosSemana) * 100}%` }}
                  >
                    <span className="text-white font-bold text-sm">{sem.count}</span>
                  </div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-700">{sem.semana}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Widget de Eficiencia de Combustible */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-[#0033A0]">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">⛽</span>
          <div>
            <h3 className="text-xl font-bold text-[#0033A0]">Eficiencia de Combustible</h3>
            <p className="text-sm text-gray-600">YPF EN RUTA - Consumo por unidad</p>
          </div>
        </div>

        {loadingCombustible ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0033A0]"></div>
          </div>
        ) : cargasCombustible.length > 0 ? (
          <>
            {/* Estadísticas generales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Total Cargas</p>
                <p className="text-2xl font-bold text-[#0033A0]">{cargasCombustible.length}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Total Litros</p>
                <p className="text-2xl font-bold text-[#0033A0]">
                  {cargasCombustible.reduce((sum, c) => sum + c.litrosCargados, 0).toFixed(0)} L
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Costo Total</p>
                <p className="text-2xl font-bold text-[#0033A0]">
                  ${cargasCombustible.reduce((sum, c) => sum + c.costoTotal, 0).toLocaleString('es-AR')}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Promedio/Carga</p>
                <p className="text-2xl font-bold text-[#0033A0]">
                  {(cargasCombustible.reduce((sum, c) => sum + c.litrosCargados, 0) / cargasCombustible.length).toFixed(1)} L
                </p>
              </div>
            </div>

            {/* Ranking de unidades por consumo */}
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#0033A0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Top 5 Unidades - Más Cargas Registradas
            </h4>
            <div className="space-y-2">
              {(() => {
                // Agrupar cargas por unidad
                type UnidadConsumo = {
                  numero: string;
                  patente: string;
                  cantidadCargas: number;
                  totalLitros: number;
                  totalCosto: number;
                };

                const cargasPorUnidad = cargasCombustible.reduce((acc, carga) => {
                  const key = carga.unidad.numero;
                  if (!acc[key]) {
                    acc[key] = {
                      numero: carga.unidad.numero,
                      patente: carga.unidad.patente,
                      cantidadCargas: 0,
                      totalLitros: 0,
                      totalCosto: 0
                    };
                  }
                  acc[key].cantidadCargas++;
                  acc[key].totalLitros += carga.litrosCargados;
                  acc[key].totalCosto += carga.costoTotal;
                  return acc;
                }, {} as Record<string, UnidadConsumo>);

                const top5Unidades = (Object.values(cargasPorUnidad) as UnidadConsumo[])
                  .sort((a, b) => b.cantidadCargas - a.cantidadCargas)
                  .slice(0, 5);

                const maxCargas = Math.max(...top5Unidades.map((u: UnidadConsumo) => u.cantidadCargas), 1);

                return top5Unidades.map((unidad: UnidadConsumo) => (
                  <div key={unidad.numero} className="flex items-center gap-3">
                    <div className="w-24 text-sm font-semibold text-[#0033A0]">INT-{unidad.numero}</div>
                    <div className="flex-1 bg-blue-50 rounded-full h-8 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#0033A0] to-[#0047CC] h-full flex items-center justify-between px-3 text-white font-semibold transition-all duration-500"
                        style={{ width: `${(unidad.cantidadCargas / maxCargas) * 100}%` }}
                      >
                        <span className="text-xs">{unidad.cantidadCargas} cargas</span>
                        <span className="text-xs opacity-90">{unidad.totalLitros.toFixed(0)} L</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 w-20 text-right">
                      ${unidad.totalCosto.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Link al panel completo */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                💡 Para ver consumos calculados (L/100km) y alertas, ve al <span className="font-semibold text-[#0033A0]">Panel Administrativo → Tab Combustible</span>
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-3">
              <span className="text-3xl">⛽</span>
            </div>
            <p className="text-gray-600 font-medium">No hay cargas de combustible registradas</p>
            <p className="text-sm text-gray-500 mt-1">Los choferes deben registrar cargas desde el sector COMBUSTIBLE</p>
          </div>
        )}
      </div>

      {/* Modal Detalle Flota */}
      {mostrarModalFlota && unidadSeleccionada && (() => {
        const unidad = unidadesConHistorial[unidadSeleccionada];
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setMostrarModalFlota(false)}>
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="bg-[#1a2332] text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Historial Unidad {unidad.numero}</h2>
                    <p className="text-white/90 text-sm">Patente: {unidad.patente}</p>
                  </div>
                  <button
                    onClick={() => setMostrarModalFlota(false)}
                    className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-[#f0f9e8] rounded-lg p-4 border border-[#a8e063]">
                    <div className="text-2xl font-bold text-[#56ab2f]">{unidad.totalOTs}</div>
                    <div className="text-sm text-gray-600">Total Mantenimientos</div>
                  </div>
                  <div className="bg-[#f0f9e8] rounded-lg p-4 border border-[#a8e063]">
                    <div className="text-2xl font-bold text-[#56ab2f]">${unidad.costoTotal.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Costo Total</div>
                  </div>
                  <div className="bg-[#f0f9e8] rounded-lg p-4 border border-[#a8e063]">
                    <div className="text-2xl font-bold text-[#56ab2f]">
                      {unidad.ots.filter(o => o.estado === 'CERRADO').length}
                    </div>
                    <div className="text-sm text-gray-600">Completadas</div>
                  </div>
                </div>

                <h3 className="font-bold text-gray-800 mb-3">Últimos 10 Trabajos</h3>
                <div className="space-y-2">
                  {unidad.ots
                    .sort((a, b) => convertirTimestampFirebase(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 10)
                    .map((ot) => (
                      <div key={ot.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-gray-900">OT-{String(ot.numeroOT).slice(-5)}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            ot.estado === 'CERRADO' || ot.estado === 'COMPLETADA' ? 'bg-green-100 text-green-700' :
                            ot.estado === 'EN_PROCESO' || ot.estado === 'PENDIENTE' ? 'bg-blue-100 text-blue-700' :
                            ot.estado === 'ESPERANDO_REPUESTOS' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {ot.estado === 'EN_PROCESO' || ot.estado === 'PENDIENTE' ? 'OT Activa' :
                             ot.estado === 'ESPERANDO_REPUESTOS' ? 'Esperando' :
                             ot.estado === 'CERRADO' || ot.estado === 'COMPLETADA' ? 'Completada' : ot.estado}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 mb-1">{ot.descripcion}</p>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>{convertirTimestampFirebase(ot.timestamp).toLocaleDateString()}</span>
                          {(ot.costoReparacion || ot.costo) && <span className="font-semibold text-[#56ab2f]">${(ot.costoReparacion || ot.costo || 0).toLocaleString()}</span>}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="border-t p-4 bg-gray-50">
                <button
                  onClick={() => setMostrarModalFlota(false)}
                  className="w-full py-3 bg-[#1a2332] text-white font-semibold rounded-lg hover:bg-[#252f42] transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    
</div>
  );
}

// ============================================================================
// COMPONENTE: Lista de Órdenes Activas
// ============================================================================

interface ListaOrdenesActivasProps {
  ordenes: OrdenTrabajo[];
  onTomarOT: (orden: OrdenTrabajo) => void;
  onVerHistorial: (unidad: string) => void;
  onVerDetalle: (orden: OrdenTrabajo) => void;
  tecnicoActual: string;
}

function ListaOrdenesActivas({ ordenes, onTomarOT, onVerHistorial, onVerDetalle, tecnicoActual }: ListaOrdenesActivasProps) {
  if (ordenes.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">✓</div>
        <p className="text-gray-900 font-bold text-xl">No hay órdenes disponibles</p>
        <p className="text-gray-600 mt-2">Todas las órdenes están asignadas o completadas</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto space-y-2" style={{ maxHeight: '600px' }}>
      {ordenes.map((orden) => {
        const yaAsignada = orden.asignadoA && orden.asignadoA !== '';
        const asignadoAMi = orden.asignadoA === tecnicoActual;

        // Calcular días desde creación
        const diasDesdeCreacion = Math.floor(
          (Date.now() - convertirTimestampFirebase(orden.timestamp).getTime()) / (1000 * 60 * 60 * 24)
        );

        return (
          <div
            key={orden.id}
            className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md hover:border-green-300 transition-all cursor-pointer"
            onClick={() => onVerDetalle(orden)}
          >
            {/* Header compacto */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-gray-900">
                  OT #{String(orden.numeroOT).slice(-5)}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  orden.prioridad === 'ALTA' ? 'bg-red-100 text-red-800' :
                  orden.prioridad === 'MEDIA' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {orden.prioridad === 'ALTA' ? '🔴' : orden.prioridad === 'MEDIA' ? '🟡' : '🟢'} {orden.prioridad}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  orden.tipo === 'URGENTE' ? 'bg-red-100 text-red-800' :
                  orden.tipo === 'CORRECTIVO' ? 'bg-orange-100 text-orange-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {orden.tipo}
                </span>
                {orden.fotosEvidencia && orden.fotosEvidencia.length > 0 && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                    📷 {orden.fotosEvidencia.length}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                📅 {diasDesdeCreacion}d
              </span>
            </div>

            {/* Info en una línea */}
            <div className="flex items-center gap-3 text-sm text-gray-700 mb-1">
              <span><strong>🚛 {orden.unidad.numero}</strong> ({obtenerPatente(orden.unidad.numero)})</span>
              {yaAsignada && <span className="text-blue-600">👤 {orden.asignadoA}</span>}
            </div>

            {/* Descripción compacta */}
            <p className="text-sm text-gray-600 line-clamp-1 mb-2">
              {orden.descripcion}
            </p>

            {/* Botones compactos */}
            <div className="flex gap-2 flex-wrap">
              {!yaAsignada && (
                <button
                  onClick={(e) => { e.stopPropagation(); onTomarOT(orden); }}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-all"
                >
                  ✋ Tomar OT
                </button>
              )}
              {asignadoAMi && (
                <span className="px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-semibold rounded-lg">
                  ✓ Asignada
                </span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onVerHistorial(orden.unidad.numero); }}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-all"
              >
                📋 Hist
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onVerDetalle(orden); }}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-all"
              >
                Ver Detalle
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// COMPONENTE: Lista de Órdenes Asignadas
// ============================================================================

interface ListaOrdenesAsignadasProps {
  ordenes: OrdenTrabajo[];
  onRegistrarTrabajo: (orden: OrdenTrabajo) => void;
  onMarcarEsperando: (orden: OrdenTrabajo) => void;
  onCerrarOT: (orden: OrdenTrabajo) => void;
  onVerHistorial: (unidad: string) => void;
  onVerDetalle: (orden: OrdenTrabajo) => void;
}

function ListaOrdenesAsignadas({
  ordenes,
  onRegistrarTrabajo,
  onMarcarEsperando,
  onCerrarOT,
  onVerHistorial,
  onVerDetalle
}: ListaOrdenesAsignadasProps) {
  if (ordenes.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">💼</div>
        <p className="text-gray-900 font-bold text-xl">No tienes órdenes asignadas</p>
        <p className="text-gray-600 mt-2">Ve a "Órdenes Disponibles" para tomar una OT</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto space-y-2" style={{ maxHeight: '600px' }}>
      {ordenes.map((orden) => {
        // Calcular días desde creación
        const diasDesdeCreacion = Math.floor(
          (Date.now() - convertirTimestampFirebase(orden.timestamp).getTime()) / (1000 * 60 * 60 * 24)
        );

        return (
          <div
            key={orden.id}
            className="bg-white rounded-lg p-3 shadow-sm border border-blue-200 hover:shadow-md hover:border-blue-400 transition-all cursor-pointer"
            onClick={() => onVerDetalle(orden)}
          >
            {/* Header compacto */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-gray-900">
                  OT #{String(orden.numeroOT).slice(-5)}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  orden.prioridad === 'ALTA' ? 'bg-red-100 text-red-800' :
                  orden.prioridad === 'MEDIA' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {orden.prioridad === 'ALTA' ? '🔴' : orden.prioridad === 'MEDIA' ? '🟡' : '🟢'} {orden.prioridad}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  orden.estado === 'EN_PROCESO' || orden.estado === 'PENDIENTE' ? 'bg-blue-100 text-blue-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {orden.estado === 'EN_PROCESO' || orden.estado === 'PENDIENTE' ? '🔧 OT' : '⏳ ESPERANDO'}
                </span>
                {orden.fotosEvidencia && orden.fotosEvidencia.length > 0 && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                    📷 {orden.fotosEvidencia.length}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                📅 {diasDesdeCreacion}d
              </span>
            </div>

            {/* Info en una línea */}
            <div className="flex items-center gap-3 text-sm text-gray-700 mb-1">
              <span><strong>🚛 {orden.unidad.numero}</strong> ({obtenerPatente(orden.unidad.numero)})</span>
              {orden.horasTrabajo && <span>⏱️ {orden.horasTrabajo}h</span>}
              {orden.repuestos && orden.repuestos.length > 0 && <span>🔧 {orden.repuestos.length} rep</span>}
            </div>

            {/* Descripción compacta */}
            <p className="text-sm text-gray-600 line-clamp-1 mb-2">
              {orden.descripcion}
            </p>

            {/* Botones — 4 iguales en una fila */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); onVerDetalle(orden); }}
                  className="py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-all text-center"
                >
                  Ver Det.
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onRegistrarTrabajo(orden); }}
                  className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-all text-center"
                >
                  ✏️ Regist.
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onCerrarOT(orden); }}
                  className="py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-all text-center"
                >
                  ✓ Cerrar
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onVerHistorial(orden.unidad.numero); }}
                  className="py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-all text-center"
                >
                  📋 Hist
                </button>
              </div>
              {(orden.estado === 'EN_PROCESO' || orden.estado === 'PENDIENTE') && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMarcarEsperando(orden); }}
                  className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-all"
                >
                  ⏳ Marcar esperando repuestos
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// MODAL DETALLE CHECKLIST
// ============================================================================

interface ModalDetalleChecklistProps {
  checklist: ChecklistRegistro;
  onClose: () => void;
}

const formatearFechaChecklist = (fecha: any): string => {
  if (!fecha) return 'Fecha no disponible';
  try {
    const dateObj = convertirTimestampFirebase(fecha);
    return dateObj.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('[formatearFechaChecklist] Error:', error, fecha);
    return 'Fecha no disponible';
  }
};

const ModalDetalleChecklist: React.FC<ModalDetalleChecklistProps> = ({ checklist, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleEliminar = async () => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'checklists', checklist.id));
      console.log('[ModalDetalleChecklist] Checklist eliminado:', checklist.id);
      showSuccess('Checklist eliminado exitosamente');
      onClose();
    } catch (error) {
      console.error('[ModalDetalleChecklist] Error al eliminar:', error);
      showError('Error al eliminar el checklist: ' + (error as Error).message);
    } finally {
      setLoading(false);
      setShowConfirmDelete(false);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'CONFORME': return 'bg-white border-gray-300 text-gray-700';
      case 'NO_CONFORME': return 'bg-white border-gray-300 text-gray-700';
      case 'NO_APLICA': return 'bg-white border-gray-300 text-gray-500';
      default: return 'bg-white border-gray-300 text-gray-700';
    }
  };

  const getEstadoIcono = (estado: string) => {
    switch (estado) {
      case 'CONFORME': return '✓';
      case 'NO_CONFORME': return '✗';
      case 'NO_APLICA': return '−';
      default: return '•';
    }
  };

  const getResultadoColor = (resultado: string) => {
    switch (resultado) {
      case 'APTO': return 'bg-[#56ab2f]';
      case 'NO_APTO': return 'bg-red-500';
      case 'PENDIENTE': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl md:rounded-2xl max-w-5xl w-full my-4 md:my-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-[#1a2332] text-white p-3 md:p-4 rounded-t-xl md:rounded-t-2xl sticky top-0 z-10 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <div>
                <h2 className="text-lg md:text-xl font-bold">Detalle de Checklist</h2>
                <p className="text-white/90 text-xs md:text-sm">Unidad {checklist.unidad.numero} - {formatearFechaChecklist(checklist.fecha)}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1.5 md:p-2 hover:bg-white/10 rounded-lg">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 md:p-4 space-y-3 md:space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Información General */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Unidad */}
            <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2 text-xs md:text-sm uppercase tracking-wide">Información de la Unidad</h3>
              <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Unidad:</span>
                  <span className="font-semibold text-gray-900">INT-{checklist.unidad.numero}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Patente:</span>
                  <span className="font-semibold text-gray-900">{(checklist.unidad.patente && checklist.unidad.patente !== 'N/A') ? checklist.unidad.patente : obtenerPatente(checklist.unidad.numero)}</span>
                </div>
                {checklist.cisterna && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cisterna:</span>
                      <span className="font-semibold text-gray-900">{checklist.cisterna.numero}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pat. Cisterna:</span>
                      <span className="font-semibold text-gray-900">{checklist.cisterna.patente}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Sector:</span>
                  <span className="font-semibold text-gray-900 uppercase">{checklist.sector}</span>
                </div>
              </div>
            </div>

            {/* Chofer y Fecha */}
            <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2 text-xs md:text-sm uppercase tracking-wide">Información del Checklist</h3>
              <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Chofer:</span>
                  <span className="font-semibold text-gray-900">{checklist.chofer?.nombre || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha:</span>
                  <span className="font-semibold text-gray-900">
                    {formatearFechaChecklist(checklist.fecha)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Odómetro:</span>
                  <span className="font-semibold text-gray-900">
                    {checklist.odometroInicial?.valor?.toLocaleString() || 0} km
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Resultado */}
          <div className={`${getResultadoColor(checklist.resultado)} rounded-lg p-3 md:p-4 text-white shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base md:text-lg font-semibold">Resultado: {checklist.resultado}</h3>
                <p className="text-white/95 text-xs md:text-sm mt-0.5">
                  {checklist.itemsConformes} conformes • {checklist.itemsRechazados} rechazados
                </p>
              </div>
              <div className="text-2xl md:text-3xl">
                {checklist.resultado === 'APTO' ? '✓' : checklist.resultado === 'NO_APTO' ? '✗' : '−'}
              </div>
            </div>
          </div>

          {/* Ítems del Checklist */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-4 uppercase tracking-wide">
              Ítems Inspeccionados ({checklist.items?.length || 0})
            </h3>

            <div className="space-y-2">
              {checklist.items?.map((item, index) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 ${
                    item.estado === 'NO_CONFORME' && item.esCritico
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Número */}
                    <div className="flex-shrink-0 w-7 h-7 bg-gray-100 text-gray-700 rounded-full flex items-center justify-center font-semibold text-xs border border-gray-300">
                      {item.numero}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-medium text-gray-900 flex-1">{item.descripcion}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap border ${getEstadoColor(item.estado)}`}>
                          {getEstadoIcono(item.estado)} {item.estado.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Badges de info */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-gray-50 text-gray-600 text-xs rounded border border-gray-200">
                          {item.categoria.replace('_', ' ')}
                        </span>
                        {item.esCritico && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded border border-red-200 font-semibold">
                            CRÍTICO
                          </span>
                        )}
                      </div>

                      {/* Comentario si existe */}
                      {item.comentario && (
                        <div className="mt-2 p-3 bg-gray-50 border-l-2 border-gray-300 rounded text-sm text-gray-700">
                          {item.comentario}
                        </div>
                      )}

                      {/* Foto si existe */}
                      {item.fotoUrl && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">📎 Evidencia fotográfica adjunta</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-2xl">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-[#1a2332] text-white font-semibold rounded-lg hover:bg-[#252f42] transition-colors disabled:opacity-50"
            >
              Cerrar
            </button>
            <button
              onClick={() => setShowConfirmDelete(true)}
              disabled={loading}
              className="px-6 py-3 bg-white text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-red-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmación para eliminar */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={() => setShowConfirmDelete(false)}>
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl transform transition-all animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header con icono de advertencia */}
            <div className="p-6 text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Eliminar Checklist</h3>
              <p className="text-gray-600 mb-2">
                ¿Estás seguro de que deseas eliminar este checklist?
              </p>
              <div className="bg-gray-100 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-gray-800">
                  INT-{checklist.unidad.numero} • {checklist.unidad.patente}
                </p>
                <p className="text-xs text-gray-500">
                  {formatearFechaChecklist(checklist.fecha)}
                </p>
              </div>
              <p className="text-sm text-red-600 font-medium">
                Esta acción no se puede deshacer.
              </p>
            </div>

            {/* Botones */}
            <div className="border-t border-gray-200 p-4 flex gap-3">
              <button
                onClick={() => setShowConfirmDelete(false)}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// LISTA DE CHECKLISTS
// ============================================================================

interface ListaChecklistsProps {
  checklists: ChecklistRegistro[];
  onChecklistClick: (checklist: ChecklistRegistro) => void;
}

function ListaChecklists({ checklists, onChecklistClick }: ListaChecklistsProps) {
  if (checklists.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-xl font-semibold text-gray-600">No hay checklists</h3>
        <p className="text-gray-500 mt-2">Los checklists de los choferes aparecerán aquí</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Checklists Realizados</h2>
        <span className="text-sm text-gray-500">{checklists.length} registros</span>
      </div>

      {checklists.map((checklist) => {
        const fechaFormateada = checklist.timestamp.toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        return (
          <div
            key={checklist.id}
            className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:border-[#56ab2f] transition-all cursor-pointer"
            onClick={() => onChecklistClick(checklist)}
          >
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h3 className="text-lg font-bold text-gray-800">
                INT-{checklist.unidad.numero}
              </h3>
              <span className="text-sm text-gray-600 font-mono">
                {(checklist.unidad.patente && checklist.unidad.patente !== 'N/A') ? checklist.unidad.patente : obtenerPatente(checklist.unidad.numero)}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                checklist.sector === 'vrac'
                  ? 'bg-blue-100 text-blue-700'
                  : checklist.sector === 'distribucion'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-orange-100 text-orange-700'
              }`}>
                {checklist.sector === 'vrac' ? 'VRAC' : checklist.sector === 'distribucion' ? 'DISTRIBUCIÓN' : 'V.AIRE'}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                checklist.resultado === 'APTO'
                  ? 'bg-green-100 text-green-700'
                  : checklist.resultado === 'NO_APTO'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {checklist.resultado === 'APTO' ? '✅ APTO' : checklist.resultado === 'NO_APTO' ? '❌ NO APTO' : '⚠️ PENDIENTE'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Chofer:</span>
                <p className="font-semibold text-gray-800">{checklist.chofer?.nombre || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Fecha:</span>
                <p className="font-semibold text-gray-800">{fechaFormateada}</p>
              </div>
              <div>
                <span className="text-gray-500">Odómetro:</span>
                <p className="font-semibold text-gray-800">{checklist.odometroInicial?.valor?.toLocaleString() || 0} km</p>
              </div>
              <div>
                <span className="text-gray-500">Items:</span>
                <p className="font-semibold text-gray-800">
                  <span className="text-green-600">{checklist.itemsConformes || 0} OK</span>
                  {' • '}
                  <span className="text-red-600">{checklist.itemsRechazados || 0} Fallos</span>
                </p>
              </div>
            </div>

            {checklist.cisterna && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-sm text-blue-600 font-semibold">
                  🚛 Cisterna: {checklist.cisterna.numero} - {checklist.cisterna.patente}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// MODAL: Registrar Trabajo
// ============================================================================

interface ModalRegistroTrabajoProps {
  orden: OrdenTrabajo;
  onClose: () => void;
  onGuardado: () => void;
}

// Tipo para registro de trabajo individual
interface RegistroTrabajoItem {
  id: string;
  fecha: any;
  descripcion: string;
  horasTrabajo: number;
  costoTotal: number;
  repuestos: { nombre: string; cantidad: number; costo: number }[];
  fotosAntes: string[];
  fotosDespues: string[];
  tecnico?: string;
}

function ModalRegistroTrabajo({ orden, onClose, onGuardado }: ModalRegistroTrabajoProps) {
  const [loading, setLoading] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [horasTrabajo, setHorasTrabajo] = useState(0);
  const [costoManoObra, setCostoManoObra] = useState(0);
  const [repuestos, setRepuestos] = useState<{ nombre: string; cantidad: number; costo: number }[]>([]);
  const [fotosAntes, setFotosAntes] = useState<File[]>([]);
  const [fotosDespues, setFotosDespues] = useState<File[]>([]);

  // Historial de registros anteriores
  const registrosAnteriores: RegistroTrabajoItem[] = orden.registrosTrabajo || [];

  // Calcular costo de este registro
  const costoRepuestos = repuestos.reduce((sum, r) => sum + (r.cantidad * r.costo), 0);
  const costoEsteRegistro = costoRepuestos + costoManoObra;

  // Calcular totales acumulados (anteriores + este)
  const totalHorasAcumuladas = registrosAnteriores.reduce((sum, r) => sum + (r.horasTrabajo || 0), 0) + horasTrabajo;
  const totalCostoAcumulado = registrosAnteriores.reduce((sum, r) => sum + (r.costoTotal || 0), 0) + costoEsteRegistro;

  const handleAgregarRepuesto = () => {
    setRepuestos([...repuestos, { nombre: '', cantidad: 1, costo: 0 }]);
  };

  const handleEliminarRepuesto = (index: number) => {
    setRepuestos(repuestos.filter((_, i) => i !== index));
  };

  const handleGuardar = async () => {
    if (!orden.id) return;

    if (!descripcion.trim()) {
      showWarning('Por favor ingresa una descripción del trabajo');
      return;
    }

    setLoading(true);
    try {
      // Subir fotos antes
      const urlsFotosAntes: string[] = [];
      for (const foto of fotosAntes) {
        const timestamp = Date.now();
        const nombreArchivo = `ordenes_trabajo/${orden.unidad.numero}_antes_${timestamp}_${foto.name}`;
        const storageRef = ref(storage, nombreArchivo);
        await uploadBytes(storageRef, foto);
        const url = await getDownloadURL(storageRef);
        urlsFotosAntes.push(url);
      }

      // Subir fotos después
      const urlsFotosDespues: string[] = [];
      for (const foto of fotosDespues) {
        const timestamp = Date.now();
        const nombreArchivo = `ordenes_trabajo/${orden.unidad.numero}_despues_${timestamp}_${foto.name}`;
        const storageRef = ref(storage, nombreArchivo);
        await uploadBytes(storageRef, foto);
        const url = await getDownloadURL(storageRef);
        urlsFotosDespues.push(url);
      }

      // Crear nuevo registro de trabajo
      const nuevoRegistro: RegistroTrabajoItem = {
        id: `reg_${Date.now()}`,
        fecha: new Date().toISOString(),
        descripcion: descripcion,
        horasTrabajo: horasTrabajo,
        costoTotal: costoEsteRegistro,
        repuestos: repuestos.filter(r => r.nombre.trim() !== ''),
        fotosAntes: urlsFotosAntes,
        fotosDespues: urlsFotosDespues
      };

      // Agregar al array de registros (acumulativo)
      const nuevosRegistros = [...registrosAnteriores, nuevoRegistro];

      // Actualizar orden con totales acumulados
      const ordenRef = doc(db, 'ordenes_trabajo', orden.id);
      await updateDoc(ordenRef, {
        registrosTrabajo: nuevosRegistros,
        horasTrabajo: totalHorasAcumuladas,
        costoReparacion: totalCostoAcumulado,
        fotosEvidencia: [
          ...(orden.fotosEvidencia || []),
          ...urlsFotosAntes,
          ...urlsFotosDespues
        ],
        ultimaActualizacion: serverTimestamp()
      });

      showSuccess('Registro de trabajo guardado correctamente');
      onGuardado();
    } catch (error) {
      console.error('[ModalRegistroTrabajo] Error guardando:', error);
      showError('Error al guardar. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold">✏️ Registrar Trabajo - OT #{orden.numeroOT}</h2>
          <p className="text-blue-100 text-sm mt-1">
            Unidad {orden.unidad.numero} ({orden.unidad.patente})
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Historial de Registros Anteriores */}
          {registrosAnteriores.length > 0 && (
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>📋</span> Historial de Registros ({registrosAnteriores.length})
              </h4>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {registrosAnteriores.map((registro, index) => (
                  <div key={registro.id || index} className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        Registro #{index + 1}
                      </span>
                      <span className="text-xs text-gray-500">
                        {registro.fecha ? new Date(registro.fecha).toLocaleDateString('es-AR', {
                          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : 'Sin fecha'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{registro.descripcion}</p>
                    <div className="flex gap-4 text-xs text-gray-600">
                      <span><strong>Horas:</strong> {registro.horasTrabajo}h</span>
                      <span><strong>Costo:</strong> ${(registro.costoTotal || 0).toLocaleString('es-AR')}</span>
                      {registro.repuestos && registro.repuestos.length > 0 && (
                        <span><strong>Repuestos:</strong> {registro.repuestos.length}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Totales acumulados hasta ahora */}
              <div className="mt-3 pt-3 border-t border-gray-300 flex justify-between text-sm">
                <span className="text-gray-600">Acumulado hasta ahora:</span>
                <span className="font-bold text-gray-800">
                  {registrosAnteriores.reduce((sum, r) => sum + (r.horasTrabajo || 0), 0)}h |
                  ${registrosAnteriores.reduce((sum, r) => sum + (r.costoTotal || 0), 0).toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          )}

          {/* Nuevo Registro de Trabajo */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
              <span>➕</span> Nuevo Registro de Trabajo
            </h4>

            {/* Descripción del trabajo */}
            <div className="mb-4">
              <label className="block font-semibold text-gray-700 mb-2">
                Descripción del trabajo realizado *
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border rounded-lg"
                placeholder="Describe el trabajo realizado en este registro..."
              />
            </div>
          </div>

          {/* Horas trabajadas y Costo Mano de Obra */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-2">
                Horas trabajadas
              </label>
              <input
                type="number"
                step="0.5"
                value={horasTrabajo}
                onChange={(e) => setHorasTrabajo(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 border rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-2">
                COSTO TOTAL ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={costoManoObra}
                onChange={(e) => setCostoManoObra(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 border rounded-lg"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Repuestos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block font-semibold text-gray-700">Repuestos utilizados</label>
              <button
                onClick={handleAgregarRepuesto}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm"
              >
                + Agregar
              </button>
            </div>
            <div className="space-y-2">
              {repuestos.map((repuesto, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nombre del repuesto"
                    value={repuesto.nombre}
                    onChange={(e) => {
                      const nuevos = [...repuestos];
                      nuevos[index].nombre = e.target.value;
                      setRepuestos(nuevos);
                    }}
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="Cant."
                    value={repuesto.cantidad}
                    onChange={(e) => {
                      const nuevos = [...repuestos];
                      nuevos[index].cantidad = parseInt(e.target.value) || 1;
                      setRepuestos(nuevos);
                    }}
                    className="w-20 px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="Costo"
                    value={repuesto.costo}
                    onChange={(e) => {
                      const nuevos = [...repuestos];
                      nuevos[index].costo = parseFloat(e.target.value) || 0;
                      setRepuestos(nuevos);
                    }}
                    className="w-28 px-3 py-2 border rounded-lg"
                  />
                  <button
                    onClick={() => handleEliminarRepuesto(index)}
                    className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Fotos antes */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2">
              Fotos ANTES del trabajo
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFotosAntes(Array.from(e.target.files || []))}
              className="w-full px-4 py-3 border rounded-lg"
            />
            {fotosAntes.length > 0 && (
              <p className="text-sm text-gray-600 mt-1">{fotosAntes.length} foto(s) seleccionada(s)</p>
            )}
          </div>

          {/* Fotos después */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2">
              Fotos DESPUÉS del trabajo
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFotosDespues(Array.from(e.target.files || []))}
              className="w-full px-4 py-3 border rounded-lg"
            />
            {fotosDespues.length > 0 && (
              <p className="text-sm text-gray-600 mt-1">{fotosDespues.length} foto(s) seleccionada(s)</p>
            )}
          </div>

          {/* Resumen de Costos */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 p-4 rounded-lg">
            <h4 className="font-bold text-green-800 mb-3">💰 Resumen de Costos</h4>
            <div className="space-y-2 text-sm">
              {/* Este registro */}
              <div className="pb-2 border-b border-green-200">
                <p className="text-xs text-gray-500 mb-1 font-semibold">Este registro:</p>
                <div className="flex justify-between">
                  <span className="text-gray-600">Repuestos:</span>
                  <span className="font-semibold">${costoRepuestos.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Costo Total:</span>
                  <span className="font-semibold">${costoManoObra.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Horas:</span>
                  <span className="font-semibold">{horasTrabajo}h</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="font-semibold text-green-700">Subtotal este registro:</span>
                  <span className="font-bold text-green-700">${costoEsteRegistro.toLocaleString('es-AR')}</span>
                </div>
              </div>

              {/* Totales acumulados */}
              <div className="pt-2">
                <p className="text-xs text-gray-500 mb-1 font-semibold">TOTALES ACUMULADOS (incluye anteriores):</p>
                <div className="flex justify-between">
                  <span className="font-bold text-green-800">Total Horas:</span>
                  <span className="font-bold text-green-800">{totalHorasAcumuladas}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-green-800 text-lg">COSTO TOTAL OT:</span>
                  <span className="font-bold text-green-800 text-lg">${totalCostoAcumulado.toLocaleString('es-AR')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={loading}
              className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? 'Guardando...' : '💾 Guardar Registro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL: Cierre de OT con Firma
// ============================================================================

interface ModalCierreOTProps {
  orden: OrdenTrabajo;
  tecnico: string;
  onClose: () => void;
  onCerrado: () => void;
}

function ModalCierreOT({ orden, tecnico, onClose, onCerrado }: ModalCierreOTProps) {
  const [loading, setLoading] = useState(false);
  const [firma, setFirma] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const handleCerrar = async () => {
    if (!firma.trim()) {
      showWarning('Por favor ingresa tu nombre para confirmar');
      return;
    }

    // Normalizar nombres para comparación (remover espacios extra, lowercase)
    const firmaNormalizada = firma.trim().toLowerCase().replace(/\s+/g, ' ');
    const tecnicoNormalizado = tecnico.trim().toLowerCase().replace(/\s+/g, ' ');

    if (firmaNormalizada !== tecnicoNormalizado) {
      showError(`El nombre ingresado no coincide. Tu eres: ${tecnico}. Ingresaste: ${firma.trim()}`);
      return;
    }

    if (!orden.id) return;

    setLoading(true);
    try {
      const ordenRef = doc(db, 'ordenes_trabajo', orden.id);
      await updateDoc(ordenRef, {
        estado: 'CERRADO',
        fechaCompletado: serverTimestamp(),
        timestampCompletada: serverTimestamp(),
        firmaTecnico: firma,
        observacionesCierre: observaciones,
        cerradoPor: tecnico,
        mecanico: tecnico
      });

      showSuccess('Orden de trabajo cerrada exitosamente');
      onCerrado();
    } catch (error) {
      console.error('[ModalCierreOT] Error cerrando OT:', error);
      showError('Error al cerrar la OT. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold">✓ Cerrar Orden de Trabajo</h2>
          <p className="text-green-100 text-sm mt-1">OT #{orden.numeroOT}</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-blue-800 text-sm">
              Al cerrar esta orden, se marcará como completada y quedará registrada en el historial.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-2">
              Observaciones finales (opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border rounded-lg"
              placeholder="Comentarios adicionales..."
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-2">
              Confirma tu nombre para cerrar la OT
            </label>
            <input
              type="text"
              value={firma}
              onChange={(e) => setFirma(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg"
              placeholder={`Escribe: ${tecnico}`}
            />
            <p className="text-xs text-gray-600 mt-1">
              Ingresa tu nombre exactamente como aparece arriba
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleCerrar}
              disabled={loading || !firma.trim()}
              className="flex-1 py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? 'Cerrando...' : '✓ Cerrar OT'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL: Historial de Unidad
// ============================================================================

interface ModalHistorialUnidadProps {
  ordenes: OrdenTrabajo[];
  onClose: () => void;
}

function ModalHistorialUnidad({ ordenes, onClose }: ModalHistorialUnidadProps) {
  if (ordenes.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
          <div className="bg-gradient-to-r from-gray-600 to-gray-700 text-white p-6 rounded-t-2xl">
            <h2 className="text-2xl font-bold">📋 Historial de Unidad</h2>
          </div>
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-900 font-bold text-xl">No hay historial</p>
            <p className="text-gray-600 mt-2">Esta unidad no tiene órdenes registradas</p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const unidad = ordenes[0].unidad;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-gray-600 to-gray-700 text-white p-6">
          <h2 className="text-2xl font-bold">📋 Historial de Unidad {unidad.numero}</h2>
          <p className="text-gray-100 text-sm mt-1">
            Patente: {unidad.patente} | {ordenes.length} orden(es) registrada(s)
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {ordenes.map((orden) => (
              <div key={orden.id} className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">OT #{orden.numeroOT}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      orden.estado === 'COMPLETADA' || orden.estado === 'CERRADO' ? 'bg-green-100 text-green-800' :
                      orden.estado === 'EN_PROCESO' || orden.estado === 'PENDIENTE' ? 'bg-blue-100 text-blue-800' :
                      orden.estado === 'ESPERANDO_REPUESTOS' ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {orden.estado === 'EN_PROCESO' || orden.estado === 'PENDIENTE' ? 'OT Activa' :
                       orden.estado === 'ESPERANDO_REPUESTOS' ? 'Esperando' :
                       orden.estado === 'COMPLETADA' || orden.estado === 'CERRADO' ? 'Completada' : orden.estado}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {orden.fecha ? convertirTimestampFirebase(orden.fecha).toLocaleDateString() : 'Sin fecha'}
                  </span>
                </div>

                <p className="text-gray-700 text-sm mb-2">{orden.descripcion}</p>

                {orden.asignadoA && (
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Técnico:</span> {orden.asignadoA}
                  </p>
                )}

                {orden.horasTrabajo && (
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Horas:</span> {orden.horasTrabajo}h
                  </p>
                )}

                {(orden.costoReparacion || orden.costo) && (
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Costo:</span> ${(orden.costoReparacion || orden.costo || 0).toLocaleString('es-AR')}
                  </p>
                )}

                {orden.fechaCompletado && (
                  <p className="text-xs text-green-700 mt-2">
                    ✓ Completada el {convertirTimestampFirebase(orden.fechaCompletado).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t">
          <button
            onClick={onClose}
            className="w-full py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>

  );
}

// ============================================================================
// MODAL DETALLE OT - Vista completa con imágenes
// ============================================================================

interface ModalDetalleOTProps {
  orden: OrdenTrabajo;
  onClose: () => void;
  onTomarOT: () => void;
  tecnicoActual: string;
}

function ModalDetalleOT({ orden, onClose, onTomarOT, tecnicoActual }: ModalDetalleOTProps) {
  const [imagenAmpliada, setImagenAmpliada] = useState<string | null>(null);

  const yaAsignada = orden.asignadoA && orden.asignadoA !== '';
  const asignadoAMi = orden.asignadoA === tecnicoActual;

  // Calcular días desde creación
  const diasDesdeCreacion = Math.floor(
    (Date.now() - convertirTimestampFirebase(orden.timestamp).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">OT #{String(orden.numeroOT).slice(-5)}</h2>
              <p className="text-blue-100 mt-1">Unidad {orden.unidad.numero} - {obtenerPatente(orden.unidad.numero)}</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              orden.prioridad === 'ALTA' ? 'bg-red-100 text-red-800' :
              orden.prioridad === 'MEDIA' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {orden.prioridad === 'ALTA' && '🔴 '}
              {orden.prioridad === 'MEDIA' && '🟡 '}
              {orden.prioridad === 'BAJA' && '🟢 '}
              {orden.prioridad}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              orden.tipo === 'URGENTE' ? 'bg-red-100 text-red-800' :
              orden.tipo === 'CORRECTIVO' ? 'bg-orange-100 text-orange-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {orden.tipo}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              orden.estado === 'EN_PROCESO' || orden.estado === 'PENDIENTE' ? 'bg-blue-100 text-blue-800' :
              orden.estado === 'ESPERANDO_REPUESTOS' ? 'bg-amber-100 text-amber-800' :
              orden.estado === 'COMPLETADA' || orden.estado === 'CERRADO' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {orden.estado === 'EN_PROCESO' || orden.estado === 'PENDIENTE' ? 'OT Activa' :
               orden.estado === 'ESPERANDO_REPUESTOS' ? 'Esperando Repuestos' :
               orden.estado === 'COMPLETADA' || orden.estado === 'CERRADO' ? 'Completada' : orden.estado}
            </span>
          </div>

          {/* Descripción */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-700 mb-2">Descripción del Problema</h4>
            <p className="text-gray-800">{orden.descripcion}</p>
          </div>

          {/* Info adicional */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 font-semibold">Creada</p>
              <p className="text-blue-800 font-bold">Hace {diasDesdeCreacion} {diasDesdeCreacion === 1 ? 'día' : 'días'}</p>
            </div>
            {yaAsignada && (
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-600 font-semibold">Asignado a</p>
                <p className="text-green-800 font-bold">{orden.asignadoA}</p>
              </div>
            )}
          </div>

          {/* Imágenes de Evidencia */}
          {orden.fotosEvidencia && orden.fotosEvidencia.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-xl">📷</span>
                Imágenes de Evidencia ({orden.fotosEvidencia.length})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {orden.fotosEvidencia.map((url, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-gray-200 hover:border-blue-400"
                    onClick={() => setImagenAmpliada(url)}
                  >
                    <img
                      src={url}
                      alt={`Evidencia ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                      Foto {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sin imágenes */}
          {(!orden.fotosEvidencia || orden.fotosEvidencia.length === 0) && (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <span className="text-4xl">📷</span>
              <p className="text-gray-500 mt-2">No hay imágenes de evidencia</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-2xl space-y-3">
          {!yaAsignada && (
            <button
              onClick={onTomarOT}
              className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              ✋ Tomar esta OT
            </button>
          )}
          {asignadoAMi && (
            <div className="w-full py-3 px-6 bg-blue-100 text-blue-800 font-bold rounded-xl text-center">
              ✓ Esta OT ya está asignada a ti
            </div>
          )}
          <button
            onClick={onClose}
            className="w-full py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Visor de imagen ampliada */}
      {imagenAmpliada && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100]"
          onClick={() => setImagenAmpliada(null)}
        >
          <div className="relative max-w-5xl max-h-[95vh] w-full h-full flex items-center justify-center p-4">
            <button
              onClick={() => setImagenAmpliada(null)}
              className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-3 transition-colors z-10"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={imagenAmpliada}
              alt="Imagen ampliada"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
