/**
 * DASHBOARD TALLER - Vista Operativa para Personal de Mantenimiento
 * Permite a mecánicos/herreros/ayudantes gestionar sus órdenes de trabajo
 */

import React, { useState, useEffect } from 'react';
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
  onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useTallerStore, type PersonalMantenimiento } from '../../stores/tallerStore';
import type { OrdenTrabajo, ConsumoCombustible } from '../../types/checklist';
import { getAllCargasCombustible } from '../../services/combustibleService';
import { ModalCrearOrden } from '../modals/ModalCrearOrden';

interface DashboardTallerProps {
  onLogout: () => void;
}

type VistaType = 'dashboard' | 'activas' | 'asignadas' | 'historial';

interface Filtros {
  prioridad: '' | 'ALTA' | 'MEDIA' | 'BAJA';
  unidad: string;
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

  // Estado de selección de técnico
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState<PersonalMantenimiento | null>(null);
  const [mostrarSeleccionTecnico, setMostrarSeleccionTecnico] = useState(true);

  // Estado principal
  const [vista, setVista] = useState<VistaType>('dashboard');
  const [ordenesActivas, setOrdenesActivas] = useState<OrdenTrabajo[]>([]);
  const [ordenesAsignadas, setOrdenesAsignadas] = useState<OrdenTrabajo[]>([]);
  const [todasOrdenes, setTodasOrdenes] = useState<OrdenTrabajo[]>([]);
  const [historialUnidad, setHistorialUnidad] = useState<OrdenTrabajo[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [filtros, setFiltros] = useState<Filtros>({
    prioridad: '',
    unidad: ''
  });

  // Modales
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenTrabajo | null>(null);
  const [mostrarModalRegistro, setMostrarModalRegistro] = useState(false);
  const [mostrarModalCierre, setMostrarModalCierre] = useState(false);
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
  const [mostrarModalCrearOT, setMostrarModalCrearOT] = useState(false);

  // Cargar datos con listeners en tiempo real
  useEffect(() => {
    if (!tecnicoSeleccionado) {
      console.log('[DashboardTaller] ⚠️ No hay técnico seleccionado, saltando carga de datos');
      return;
    }

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
        where('asignadoA', '==', tecnicoSeleccionado.nombre),
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
    }

    // Cleanup: Desuscribirse cuando cambie la vista o el componente se desmonte
    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log('[DashboardTaller] Listener desuscrito');
      }
    };
  }, [tecnicoSeleccionado, vista]);

  const cargarOrdenes = () => {
    // Función vacía - los datos se cargan automáticamente con onSnapshot
    console.log('[DashboardTaller] Datos en tiempo real - no necesita recarga manual');
  };

  const handleTomarOT = async (orden: OrdenTrabajo) => {
    if (!tecnicoSeleccionado || !orden.id) return;

    try {
      const ordenRef = doc(db, 'ordenes_trabajo', orden.id);
      await updateDoc(ordenRef, {
        estado: 'EN_PROCESO',
        asignadoA: tecnicoSeleccionado.nombre,
        fechaInicio: serverTimestamp()
      });

      console.log('[DashboardTaller] OT tomada:', orden.numeroOT);
      alert(`✅ Orden ${orden.numeroOT} asignada correctamente`);
      // No necesita cargarOrdenes() - onSnapshot actualiza automáticamente
    } catch (error) {
      console.error('[DashboardTaller] Error tomando OT:', error);
      alert('Error al tomar la orden. Intenta nuevamente.');
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
      alert(`⏳ Orden ${orden.numeroOT} marcada como "Esperando Repuestos"`);
      // No necesita cargarOrdenes() - onSnapshot actualiza automáticamente
    } catch (error) {
      console.error('[DashboardTaller] Error marcando espera:', error);
      alert('Error al marcar como esperando repuestos.');
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
      alert(`Error al cargar historial de la unidad ${numeroUnidad}.\n\nDetalle: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Renderizar selección de técnico
  if (mostrarSeleccionTecnico && !tecnicoSeleccionado) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)'
      }}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">👷</div>
            <h2 className="text-2xl font-bold text-gray-900">Selecciona tu perfil</h2>
            <p className="text-gray-600 text-sm mt-2">Elige tu nombre para continuar</p>
          </div>

          <div className="space-y-3">
            {personal.filter(p => p.activo).map((tecnico) => (
              <button
                key={tecnico.id}
                onClick={() => {
                  setTecnicoSeleccionado(tecnico);
                  setMostrarSeleccionTecnico(false);
                }}
                className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">
                    {tecnico.rol === 'Encargado' && '🚛'}
                    {tecnico.rol === 'Mecánico' && '🔧'}
                    {tecnico.rol === 'Herrero' && '⚙️'}
                    {tecnico.rol === 'Ayudante' && '🛠️'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{tecnico.nombre}</p>
                    <p className="text-sm text-gray-600">{tecnico.rol}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={onLogout}
            className="w-full mt-6 py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
          >
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  // Renderizar dashboard principal
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1a2332] text-white p-4 md:p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-3xl md:text-4xl">
              {tecnicoSeleccionado?.rol === 'Encargado' && '🚛'}
              {tecnicoSeleccionado?.rol === 'Mecánico' && '🔧'}
              {tecnicoSeleccionado?.rol === 'Herrero' && '⚙️'}
              {tecnicoSeleccionado?.rol === 'Ayudante' && '🛠️'}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{tecnicoSeleccionado?.nombre}</h1>
              <p className="text-white/90 text-xs md:text-sm">{tecnicoSeleccionado?.rol}</p>
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
              onClick={() => {
                setTecnicoSeleccionado(null);
                setMostrarSeleccionTecnico(true);
              }}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs md:text-sm font-semibold transition-all backdrop-blur-sm"
            >
              Cambiar Perfil
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

      {/* Tabs */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setVista('dashboard')}
              className={`px-3 md:px-6 py-2.5 md:py-4 text-sm md:text-base font-semibold border-b-2 transition-all whitespace-nowrap ${
                vista === 'dashboard'
                  ? 'border-[#56ab2f] text-[#56ab2f] bg-[#f0f9e8]'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setVista('activas')}
              className={`px-3 md:px-6 py-2.5 md:py-4 text-sm md:text-base font-semibold border-b-2 transition-all whitespace-nowrap ${
                vista === 'activas'
                  ? 'border-[#56ab2f] text-[#56ab2f] bg-[#f0f9e8]'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              🆕 Órdenes Disponibles
            </button>
            <button
              onClick={() => setVista('asignadas')}
              className={`px-3 md:px-6 py-2.5 md:py-4 text-sm md:text-base font-semibold border-b-2 transition-all whitespace-nowrap ${
                vista === 'asignadas'
                  ? 'border-[#56ab2f] text-[#56ab2f] bg-[#f0f9e8]'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              🔧 Mis Órdenes
            </button>
          </div>
        </div>
      </div>

      {/* Filtros - Solo mostrar si no es dashboard */}
      {vista !== 'dashboard' && (
        <div className="bg-white border-b p-4">
          <div className="max-w-7xl mx-auto flex gap-4">
            <select
              value={filtros.prioridad}
              onChange={(e) => setFiltros({ ...filtros, prioridad: e.target.value as any })}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">Todas las prioridades</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Media</option>
              <option value="BAJA">Baja</option>
            </select>

            <input
              type="text"
              placeholder="Filtrar por unidad..."
              value={filtros.unidad}
              onChange={(e) => setFiltros({ ...filtros, unidad: e.target.value })}
              className="px-4 py-2 border rounded-lg"
            />

            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-green-700">Actualizando en tiempo real</span>
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
                ordenes={ordenesActivas.filter(o =>
                  (!filtros.prioridad || o.prioridad === filtros.prioridad) &&
                  (!filtros.unidad || o.unidad.numero.includes(filtros.unidad))
                )}
                onTomarOT={handleTomarOT}
                onVerHistorial={handleVerHistorialUnidad}
                tecnicoActual={tecnicoSeleccionado?.nombre || ''}
              />
            )}

            {vista === 'asignadas' && (
              <ListaOrdenesAsignadas
                ordenes={ordenesAsignadas.filter(o =>
                  (!filtros.prioridad || o.prioridad === filtros.prioridad) &&
                  (!filtros.unidad || o.unidad.numero.includes(filtros.unidad))
                )}
                onRegistrarTrabajo={handleAbrirRegistroTrabajo}
                onMarcarEsperando={handleMarcarEsperandoRepuestos}
                onCerrarOT={handleAbrirCierreOT}
                onVerHistorial={handleVerHistorialUnidad}
              />
            )}
          </div>
        )}
      </div>

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
          tecnico={tecnicoSeleccionado?.nombre || ''}
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
          onClose={() => setMostrarModalCrearOT(false)}
          onCreated={() => {
            setMostrarModalCrearOT(false);
          }}
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

  // Calcular métricas
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const ordenesDelMes = ordenes.filter(o => {
    const fecha = new Date(o.timestamp);
    return fecha >= primerDiaMes;
  });

  const totalOTs = ordenesDelMes.length;
  const otsCompletadas = ordenes.filter(o => o.estado === 'CERRADO').length;
  const otsPendientes = ordenes.filter(o => ['PENDIENTE', 'EN_PROCESO', 'ESPERANDO_REPUESTOS'].includes(o.estado)).length;
  const porcentajeCompletadas = totalOTs > 0 ? Math.round((otsCompletadas / ordenes.length) * 100) : 0;

  // Mecánicos con más trabajo (Top 5)
  const trabajoPorMecanico = ordenes
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
  const unidadesConHistorial = ordenes.reduce((acc, o) => {
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
    acc[key].costoTotal += o.costo || 0;
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

    const count = ordenes.filter(o => {
      const fecha = new Date(o.timestamp);
      return fecha >= inicioSemana && fecha < semanaAtras;
    }).length;

    return { semana: `Sem -${i + 1}`, count };
  }).reverse();

  const maxTrabajosSemana = Math.max(...trabajosPorSemana.map(s => s.count), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-[#1a2332] rounded-2xl shadow-xl p-6 sm:p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Dashboard Taller</h2>
            <p className="text-white/90 text-sm sm:text-base">Vista general de métricas y rendimiento del taller</p>
          </div>
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
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 10)
                    .map((ot) => (
                      <div key={ot.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-gray-900">OT-{String(ot.numeroOT).slice(-5)}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            ot.estado === 'CERRADO' ? 'bg-green-100 text-green-700' :
                            ot.estado === 'EN_PROCESO' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {ot.estado}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 mb-1">{ot.descripcion}</p>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>{new Date(ot.timestamp).toLocaleDateString()}</span>
                          {ot.costo && <span className="font-semibold text-[#56ab2f]">${ot.costo.toLocaleString()}</span>}
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
  tecnicoActual: string;
}

function ListaOrdenesActivas({ ordenes, onTomarOT, onVerHistorial, tecnicoActual }: ListaOrdenesActivasProps) {
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
    <div className="overflow-y-auto space-y-4" style={{ maxHeight: '500px' }}>
      {ordenes.map((orden) => {
        const yaAsignada = orden.asignadoA && orden.asignadoA !== '';
        const asignadoAMi = orden.asignadoA === tecnicoActual;

        // Calcular días desde creación
        const diasDesdeCreacion = Math.floor(
          (Date.now() - new Date(orden.timestamp).getTime()) / (1000 * 60 * 60 * 24)
        );

        return (
          <div key={orden.id} className="bg-white rounded-xl p-4 md:p-6 shadow-md border-2 border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
                  <span className="text-xl md:text-2xl font-bold text-gray-900">
                    OT #{orden.numeroOT}
                  </span>
                  <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-bold ${
                    orden.prioridad === 'ALTA' ? 'bg-red-100 text-red-800' :
                    orden.prioridad === 'MEDIA' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {orden.prioridad === 'ALTA' && '🔴'}
                    {orden.prioridad === 'MEDIA' && '🟡'}
                    {orden.prioridad === 'BAJA' && '🟢'}
                    {orden.prioridad}
                  </span>
                  <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-bold ${
                    orden.tipo === 'URGENTE' ? 'bg-red-100 text-red-800' :
                    orden.tipo === 'CORRECTIVO' ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {orden.tipo}
                  </span>
                </div>

                <div className="space-y-1 mb-3">
                  <p className="text-sm md:text-base text-gray-700">
                    <span className="font-semibold">Unidad:</span> {orden.unidad.numero} ({orden.unidad.patente})
                  </p>
                  <p className="text-sm md:text-base text-gray-700 line-clamp-2">
                    <span className="font-semibold">Descripción:</span> {orden.descripcion}
                  </p>
                  {yaAsignada && (
                    <p className="text-sm md:text-base text-gray-700">
                      <span className="font-semibold">Asignado a:</span> {orden.asignadoA}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    📅 Hace {diasDesdeCreacion} {diasDesdeCreacion === 1 ? 'día' : 'días'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {!yaAsignada && (
                <button
                  onClick={() => onTomarOT(orden)}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all"
                >
                  ✋ Tomar esta OT
                </button>
              )}
              {asignadoAMi && (
                <div className="px-6 py-2 bg-blue-100 text-blue-800 font-semibold rounded-lg">
                  ✓ Ya asignada a ti
                </div>
              )}
              <button
                onClick={() => onVerHistorial(orden.unidad.numero)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all"
              >
                📋 Historial
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
}

function ListaOrdenesAsignadas({
  ordenes,
  onRegistrarTrabajo,
  onMarcarEsperando,
  onCerrarOT,
  onVerHistorial
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
    <div className="overflow-y-auto space-y-4" style={{ maxHeight: '500px' }}>
      {ordenes.map((orden) => {
        // Calcular días desde creación
        const diasDesdeCreacion = Math.floor(
          (Date.now() - new Date(orden.timestamp).getTime()) / (1000 * 60 * 60 * 24)
        );

        return (
          <div key={orden.id} className="bg-white rounded-xl p-4 md:p-6 shadow-md border-2 border-blue-200 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
                  <span className="text-xl md:text-2xl font-bold text-gray-900">
                    OT #{orden.numeroOT}
                  </span>
                  <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-bold ${
                    orden.prioridad === 'ALTA' ? 'bg-red-100 text-red-800' :
                    orden.prioridad === 'MEDIA' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {orden.prioridad === 'ALTA' && '🔴'}
                    {orden.prioridad === 'MEDIA' && '🟡'}
                    {orden.prioridad === 'BAJA' && '🟢'}
                    {orden.prioridad}
                  </span>
                  <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-bold ${
                    orden.estado === 'EN_PROCESO' ? 'bg-blue-100 text-blue-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {orden.estado === 'EN_PROCESO' ? '🔧 EN PROCESO' : '⏳ ESPERANDO REPUESTOS'}
                  </span>
                </div>

                <div className="space-y-1 mb-3">
                  <p className="text-sm md:text-base text-gray-700">
                    <span className="font-semibold">Unidad:</span> {orden.unidad.numero} ({orden.unidad.patente})
                  </p>
                  <p className="text-sm md:text-base text-gray-700 line-clamp-2">
                    <span className="font-semibold">Descripción:</span> {orden.descripcion}
                  </p>
                  {orden.horasTrabajo && (
                    <p className="text-sm md:text-base text-gray-700">
                      <span className="font-semibold">Horas trabajadas:</span> {orden.horasTrabajo}h
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    📅 Hace {diasDesdeCreacion} {diasDesdeCreacion === 1 ? 'día' : 'días'}
                  </p>
                  {orden.repuestos && orden.repuestos.length > 0 && (
                    <p className="text-sm md:text-base text-gray-700">
                      <span className="font-semibold">Repuestos:</span> {orden.repuestos.length} registrados
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => onRegistrarTrabajo(orden)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all"
              >
                ✏️ Registrar Trabajo
              </button>

              {orden.estado === 'EN_PROCESO' && (
                <button
                  onClick={() => onMarcarEsperando(orden)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-all"
                >
                  ⏳ Esperando Repuestos
                </button>
              )}

              <button
                onClick={() => onCerrarOT(orden)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all"
              >
                ✓ Cerrar OT
              </button>

              <button
                onClick={() => onVerHistorial(orden.unidad.numero)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all"
              >
                📋 Historial
              </button>
            </div>
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

function ModalRegistroTrabajo({ orden, onClose, onGuardado }: ModalRegistroTrabajoProps) {
  const [loading, setLoading] = useState(false);
  const [descripcion, setDescripcion] = useState(orden.descripcionTrabajo || '');
  const [horasTrabajo, setHorasTrabajo] = useState(orden.horasTrabajo || 0);
  const [repuestos, setRepuestos] = useState<{ nombre: string; cantidad: number; costo: number }[]>(
    orden.repuestos || []
  );
  const [fotosAntes, setFotosAntes] = useState<File[]>([]);
  const [fotosDespues, setFotosDespues] = useState<File[]>([]);

  const handleAgregarRepuesto = () => {
    setRepuestos([...repuestos, { nombre: '', cantidad: 1, costo: 0 }]);
  };

  const handleEliminarRepuesto = (index: number) => {
    setRepuestos(repuestos.filter((_, i) => i !== index));
  };

  const handleGuardar = async () => {
    if (!orden.id) return;

    setLoading(true);
    try {
      // Subir fotos antes
      const urlsFotosAntes: string[] = [];
      for (const foto of fotosAntes) {
        const timestamp = Date.now();
        const nombreArchivo = `ot/${orden.numeroOT}/antes_${timestamp}_${foto.name}`;
        const storageRef = ref(storage, nombreArchivo);
        await uploadBytes(storageRef, foto);
        const url = await getDownloadURL(storageRef);
        urlsFotosAntes.push(url);
      }

      // Subir fotos después
      const urlsFotosDespues: string[] = [];
      for (const foto of fotosDespues) {
        const timestamp = Date.now();
        const nombreArchivo = `ot/${orden.numeroOT}/despues_${timestamp}_${foto.name}`;
        const storageRef = ref(storage, nombreArchivo);
        await uploadBytes(storageRef, foto);
        const url = await getDownloadURL(storageRef);
        urlsFotosDespues.push(url);
      }

      // Actualizar orden
      const ordenRef = doc(db, 'ordenes_trabajo', orden.id);
      const costoTotal = repuestos.reduce((sum, r) => sum + (r.cantidad * r.costo), 0);

      await updateDoc(ordenRef, {
        descripcionTrabajo: descripcion,
        horasTrabajo: horasTrabajo,
        repuestos: repuestos,
        costo: costoTotal,
        fotosEvidencia: [
          ...(orden.fotosEvidencia || []),
          ...urlsFotosAntes,
          ...urlsFotosDespues
        ],
        ultimaActualizacion: serverTimestamp()
      });

      alert('✅ Trabajo registrado correctamente');
      onGuardado();
    } catch (error) {
      console.error('[ModalRegistroTrabajo] Error guardando:', error);
      alert('Error al guardar. Intenta nuevamente.');
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
          {/* Descripción del trabajo */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2">
              Descripción del trabajo realizado
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border rounded-lg"
              placeholder="Describe el trabajo realizado..."
            />
          </div>

          {/* Horas trabajadas */}
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

          {/* Costo total */}
          {repuestos.length > 0 && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="font-bold text-gray-900">
                Costo total de repuestos: ${repuestos.reduce((sum, r) => sum + (r.cantidad * r.costo), 0).toFixed(2)}
              </p>
            </div>
          )}

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
      alert('Por favor ingresa tu nombre para confirmar');
      return;
    }

    // Normalizar nombres para comparación (remover espacios extra, lowercase)
    const firmaNormalizada = firma.trim().toLowerCase().replace(/\s+/g, ' ');
    const tecnicoNormalizado = tecnico.trim().toLowerCase().replace(/\s+/g, ' ');

    if (firmaNormalizada !== tecnicoNormalizado) {
      alert(`El nombre ingresado no coincide.\n\nTú eres: ${tecnico}\nIngresaste: ${firma.trim()}`);
      return;
    }

    if (!orden.id) return;

    setLoading(true);
    try {
      const ordenRef = doc(db, 'ordenes_trabajo', orden.id);
      await updateDoc(ordenRef, {
        estado: 'COMPLETADA',
        fechaCompletado: serverTimestamp(),
        firmaTecnico: firma,
        observacionesCierre: observaciones,
        cerradoPor: tecnico
      });

      alert('✅ Orden de trabajo cerrada exitosamente');
      onCerrado();
    } catch (error) {
      console.error('[ModalCierreOT] Error cerrando OT:', error);
      alert('Error al cerrar la OT. Intenta nuevamente.');
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
                      orden.estado === 'COMPLETADA' ? 'bg-green-100 text-green-800' :
                      orden.estado === 'EN_PROCESO' ? 'bg-blue-100 text-blue-800' :
                      orden.estado === 'ESPERANDO_REPUESTOS' ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {orden.estado}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {orden.fecha ? new Date(orden.fecha).toLocaleDateString() : 'Sin fecha'}
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

                {orden.costo && (
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Costo:</span> ${orden.costo.toFixed(2)}
                  </p>
                )}

                {orden.fechaCompletado && (
                  <p className="text-xs text-green-700 mt-2">
                    ✓ Completada el {new Date(orden.fechaCompletado.seconds * 1000).toLocaleDateString()}
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
