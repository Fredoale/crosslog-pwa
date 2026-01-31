/**
 * TALLER KANBAN - Panel Operativo para Mecánicos
 * FASE 2.4 - Panel Kanban Mantenimiento
 * Fecha: 13 de Diciembre, 2025
 */

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, updateDoc, doc, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { OrdenTrabajo } from '../../types/checklist';
import { OrdenTrabajoCard } from './OrdenTrabajoCard';
import { ModalDetalleOT } from './ModalDetalleOT';
import { showError } from '../../utils/toast';

export function TallerKanban() {
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenTrabajo | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);

  // Estados Kanban
  const [ordenesPendientes, setOrdenesPendientes] = useState<OrdenTrabajo[]>([]);
  const [ordenesEnProceso, setOrdenesEnProceso] = useState<OrdenTrabajo[]>([]);
  const [ordenesEsperandoRepuestos, setOrdenesEsperandoRepuestos] = useState<OrdenTrabajo[]>([]);
  const [ordenesCompletadas, setOrdenesCompletadas] = useState<OrdenTrabajo[]>([]);

  useEffect(() => {
    console.log('[TallerKanban] Suscribiéndose a órdenes de trabajo...');

    const ordenesRef = collection(db, 'ordenes_trabajo');
    const q = query(ordenesRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ordenesData: OrdenTrabajo[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            numeroOT: data.numeroOT || 0,
            novedadId: data.novedadId,
            checklistId: data.checklistId,
            fecha: data.fecha?.toDate ? data.fecha.toDate() : new Date(data.fecha),
            unidad: data.unidad,
            tipo: data.tipo || 'CORRECTIVO',
            descripcion: data.descripcion || '',
            asignadoA: data.asignadoA,
            fechaAsignacion: data.fechaAsignacion?.toDate ? data.fechaAsignacion.toDate() : undefined,
            estado: data.estado || 'PENDIENTE',
            prioridad: data.prioridad || 'MEDIA',
            repuestos: data.repuestos || [],
            horasTrabajo: data.horasTrabajo,
            costo: data.costo,
            comentarioInicio: data.comentarioInicio,
            comentarioFin: data.comentarioFin,
            fotoAntes: data.fotoAntes,
            fotoDespues: data.fotoDespues,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
            timestampCompletada: data.timestampCompletada?.toDate ? data.timestampCompletada.toDate() : undefined,
            fotosEvidencia: data.fotosEvidencia || []
          } as OrdenTrabajo;
        });

        setOrdenes(ordenesData);
        console.log('[TallerKanban] Órdenes cargadas:', ordenesData.length);

        // Separar por estado
        setOrdenesPendientes(ordenesData.filter(o => o.estado === 'PENDIENTE'));
        setOrdenesEnProceso(ordenesData.filter(o => o.estado === 'EN_PROCESO'));
        setOrdenesEsperandoRepuestos(ordenesData.filter(o => o.estado === 'ESPERANDO_REPUESTOS'));
        setOrdenesCompletadas(ordenesData.filter(o => o.estado === 'COMPLETADA'));

        setLoading(false);
      },
      (error) => {
        console.error('[TallerKanban] Error al cargar órdenes:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleVerDetalle = (orden: OrdenTrabajo) => {
    setOrdenSeleccionada(orden);
    setMostrarModal(true);
  };

  const handleCambiarEstado = async (ordenId: string, nuevoEstado: OrdenTrabajo['estado']) => {
    try {
      const ordenRef = doc(db, 'ordenes_trabajo', ordenId);
      await updateDoc(ordenRef, {
        estado: nuevoEstado,
        ...(nuevoEstado === 'COMPLETADA' && { timestampCompletada: new Date() })
      });

      console.log(`[TallerKanban] Orden ${ordenId} cambió a ${nuevoEstado}`);
    } catch (error) {
      console.error('[TallerKanban] Error al cambiar estado:', error);
      showError('Error al cambiar el estado de la orden');
    }
  };

  // Función para determinar el ícono de prioridad
  const getIconoPrioridad = (prioridad: OrdenTrabajo['prioridad']) => {
    switch (prioridad) {
      case 'ALTA': return '🔴';
      case 'MEDIA': return '🟠';
      case 'BAJA': return '🟢';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
          <p className="mt-4 text-gray-600 font-semibold">Cargando órdenes de trabajo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Panel de Taller</h1>
            <p className="text-gray-600">Gestión de órdenes de trabajo - Sistema Kanban</p>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-semibold uppercase">Pendientes</p>
            <p className="text-2xl font-bold text-amber-600">{ordenesPendientes.length}</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-semibold uppercase">En Proceso</p>
            <p className="text-2xl font-bold text-blue-600">{ordenesEnProceso.length}</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-semibold uppercase">Esperando</p>
            <p className="text-2xl font-bold text-purple-600">{ordenesEsperandoRepuestos.length}</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-semibold uppercase">Completadas</p>
            <p className="text-2xl font-bold text-green-600">{ordenesCompletadas.length}</p>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Columna 1: PENDIENTE */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3">
            <h3 className="text-white font-bold text-sm uppercase tracking-wide">
              📋 Pendiente ({ordenesPendientes.length})
            </h3>
          </div>
          <div className="p-3 space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto">
            {ordenesPendientes.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No hay órdenes pendientes</p>
            ) : (
              ordenesPendientes.map(orden => (
                <OrdenTrabajoCard
                  key={orden.id}
                  orden={orden}
                  onVerDetalle={() => handleVerDetalle(orden)}
                  onCambiarEstado={(nuevoEstado) => handleCambiarEstado(orden.id, nuevoEstado)}
                />
              ))
            )}
          </div>
        </div>

        {/* Columna 2: EN PROCESO */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
            <h3 className="text-white font-bold text-sm uppercase tracking-wide">
              🔧 En Proceso ({ordenesEnProceso.length})
            </h3>
          </div>
          <div className="p-3 space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto">
            {ordenesEnProceso.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No hay órdenes en proceso</p>
            ) : (
              ordenesEnProceso.map(orden => (
                <OrdenTrabajoCard
                  key={orden.id}
                  orden={orden}
                  onVerDetalle={() => handleVerDetalle(orden)}
                  onCambiarEstado={(nuevoEstado) => handleCambiarEstado(orden.id, nuevoEstado)}
                />
              ))
            )}
          </div>
        </div>

        {/* Columna 3: ESPERANDO REPUESTOS */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3">
            <h3 className="text-white font-bold text-sm uppercase tracking-wide">
              📦 Esperando Repuestos ({ordenesEsperandoRepuestos.length})
            </h3>
          </div>
          <div className="p-3 space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto">
            {ordenesEsperandoRepuestos.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No hay órdenes esperando</p>
            ) : (
              ordenesEsperandoRepuestos.map(orden => (
                <OrdenTrabajoCard
                  key={orden.id}
                  orden={orden}
                  onVerDetalle={() => handleVerDetalle(orden)}
                  onCambiarEstado={(nuevoEstado) => handleCambiarEstado(orden.id, nuevoEstado)}
                />
              ))
            )}
          </div>
        </div>

        {/* Columna 4: COMPLETADA */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3">
            <h3 className="text-white font-bold text-sm uppercase tracking-wide">
              ✅ Completada ({ordenesCompletadas.length})
            </h3>
          </div>
          <div className="p-3 space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto">
            {ordenesCompletadas.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No hay órdenes completadas</p>
            ) : (
              ordenesCompletadas.map(orden => (
                <OrdenTrabajoCard
                  key={orden.id}
                  orden={orden}
                  onVerDetalle={() => handleVerDetalle(orden)}
                  onCambiarEstado={(nuevoEstado) => handleCambiarEstado(orden.id, nuevoEstado)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de detalle */}
      {mostrarModal && ordenSeleccionada && (
        <ModalDetalleOT
          orden={ordenSeleccionada}
          onClose={() => {
            setMostrarModal(false);
            setOrdenSeleccionada(null);
          }}
        />
      )}
    </div>
  );
}
