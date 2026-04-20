/**
 * TAB OTs — Todas las órdenes de trabajo de la unidad
 */

import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type { OrdenTrabajo } from '../../../types/checklist';

interface Props {
  unidadNumero: string;
}

const TIPO_COLOR: Record<string, string> = {
  PREVENTIVO: 'bg-blue-100 text-blue-700 border-blue-200',
  CORRECTIVO: 'bg-orange-100 text-orange-700 border-orange-200',
  URGENTE:    'bg-red-100 text-red-700 border-red-200',
};

const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE:            'bg-gray-100 text-gray-600 border-gray-200',
  EN_PROCESO:           'bg-blue-100 text-blue-700 border-blue-200',
  ESPERANDO_REPUESTOS:  'bg-amber-100 text-amber-700 border-amber-200',
  CERRADO:              'bg-[#f0f9e8] text-[#56ab2f] border-[#a8e063]',
  COMPLETADA:           'bg-[#f0f9e8] text-[#56ab2f] border-[#a8e063]',
};

const PRIORIDAD_DOT: Record<string, string> = {
  ALTA:  'bg-red-500',
  MEDIA: 'bg-amber-400',
  BAJA:  'bg-gray-400',
};

function formatFecha(fecha: Date | null) {
  if (!fecha) return '—';
  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function TabOTs({ unidadNumero }: Props) {
  const [ots, setOts] = useState<OrdenTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'ordenes_trabajo'),
      where('unidad.numero', '==', unidadNumero),
      orderBy('fecha', 'desc')
    );
    getDocs(q).then((snap) => {
      const data = snap.docs.map((d) => {
        const raw = d.data();
        return {
          ...raw,
          id: d.id,
          fecha: raw.fecha?.toDate?.() ?? new Date(),
          fechaInicio: raw.fechaInicio?.toDate?.() ?? null,
          fechaFin: raw.fechaFin?.toDate?.() ?? null,
        } as OrdenTrabajo;
      });
      setOts(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [unidadNumero]);

  const otsFiltradas = filtroEstado === 'todos'
    ? ots
    : ots.filter((o) => o.estado === filtroEstado || o.tipo === filtroEstado);

  const counts = {
    abiertas: ots.filter((o) => !['CERRADO', 'COMPLETADA'].includes(o.estado)).length,
    cerradas: ots.filter((o) => ['CERRADO', 'COMPLETADA'].includes(o.estado)).length,
    urgentes: ots.filter((o) => o.tipo === 'URGENTE').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-[#56ab2f] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-gray-900">{ots.length}</div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Total OTs</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-blue-600">{counts.abiertas}</div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Abiertas</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center">
          <div className="text-xl font-bold text-red-600">{counts.urgentes}</div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Urgentes</div>
        </div>
      </div>

      {/* Filtro estado */}
      <div className="flex flex-wrap gap-1.5">
        {(['todos', 'EN_PROCESO', 'ESPERANDO_REPUESTOS', 'URGENTE', 'CERRADO'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltroEstado(f)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
              filtroEstado === f
                ? 'bg-[#1a2332] border-[#1a2332] text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            {f === 'todos' ? `Todas (${ots.length})`
              : f === 'EN_PROCESO' ? 'En proceso'
              : f === 'ESPERANDO_REPUESTOS' ? 'Esperando repuestos'
              : f === 'URGENTE' ? '🔴 Urgentes'
              : 'Cerradas'}
          </button>
        ))}
      </div>

      {/* Lista */}
      {otsFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-3xl mb-2">📋</div>
          <div className="font-semibold text-sm">Sin OTs con ese filtro</div>
        </div>
      ) : (
        <div className="space-y-2">
          {otsFiltradas.map((ot) => (
            <div key={ot.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-gray-900">OT #{ot.numeroOT}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TIPO_COLOR[ot.tipo] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {ot.tipo}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${ESTADO_COLOR[ot.estado] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${PRIORIDAD_DOT[ot.prioridad] ?? 'bg-gray-400'}`} />
                    {ot.estado.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{formatFecha(ot.fecha)}</span>
              </div>

              <div className="text-sm text-gray-700 line-clamp-2">{ot.descripcion}</div>

              {(ot.mecanico || ot.kmService) && (
                <div className="flex gap-4 mt-2">
                  {ot.mecanico && (
                    <span className="text-xs text-gray-500">👨‍🔧 {ot.mecanico}</span>
                  )}
                  {ot.kmService && (
                    <span className="text-xs text-gray-500">🛣️ {ot.kmService.toLocaleString('es-AR')} km</span>
                  )}
                  {ot.fechaFin && (
                    <span className="text-xs text-gray-500">✅ {formatFecha(ot.fechaFin)}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
