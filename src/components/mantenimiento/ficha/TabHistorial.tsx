/**
 * TAB HISTORIAL — Timeline unificado con edición y eliminación
 */

import React, { useState, useEffect } from 'react';
import {
  collection, query, where, getDocs,
  doc, deleteDoc, updateDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type { OrdenTrabajo } from '../../../types/checklist';

interface Props {
  unidadNumero: string;
}

type TipoEvento = 'service' | 'ot_correctiva' | 'cubierta';

interface EventoHistorial {
  id: string;
  tipo: TipoEvento;
  coleccion: 'ordenes_trabajo' | 'movimientos_cubiertas';
  fecha: Date;
  titulo: string;
  subtitulo?: string;
  detalle?: string;
  km?: number;
  costo?: number;
  icono: string;
  colorBorde: string;
  // Para edición de OTs
  mecanico?: string;
  descripcion?: string;
}

interface EditForm {
  fecha: string;
  km: string;
  mecanico: string;
  descripcion: string;
  costo: string;
}

function formatFecha(fecha: Date) {
  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatKm(km: number | undefined | null) {
  if (km == null) return null;
  return km.toLocaleString('es-AR') + ' km';
}

// ============================================================================
// ÍCONOS SVG compactos
// ============================================================================

function IconEdit() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

// ============================================================================
// COMPONENTE
// ============================================================================

export default function TabHistorial({ unidadNumero }: Props) {
  const [eventos, setEventos]       = useState<EventoHistorial[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filtro, setFiltro]         = useState<TipoEvento | 'todos'>('todos');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editForm, setEditForm]     = useState<EditForm | null>(null);
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);

  function cargar() {
    setLoading(true);
    Promise.all([
      getDocs(query(
        collection(db, 'ordenes_trabajo'),
        where('unidad.numero', '==', unidadNumero),
        where('estado', 'in', ['CERRADO', 'COMPLETADA'])
      )),
      getDocs(query(
        collection(db, 'movimientos_cubiertas'),
        where('unidadNumero', '==', unidadNumero)
      )),
    ]).then(([snapOTs, snapCubiertas]) => {
      const lista: EventoHistorial[] = [];

      snapOTs.docs.forEach((d) => {
        const raw = d.data();
        const ot = raw as OrdenTrabajo;
        const fechaFin: Date = raw.fechaFin?.toDate?.() ?? raw.fecha?.toDate?.() ?? new Date();
        const esPreventivo = ot.tipo === 'PREVENTIVO';
        lista.push({
          id: d.id,
          tipo: esPreventivo ? 'service' : 'ot_correctiva',
          coleccion: 'ordenes_trabajo',
          fecha: fechaFin,
          titulo: esPreventivo
            ? `Service Preventivo #${ot.numeroOT}`
            : `OT Correctiva #${ot.numeroOT}`,
          subtitulo: ot.mecanico ? `Mecánico: ${ot.mecanico}` : undefined,
          detalle: ot.descripcion,
          km: ot.kmService ?? undefined,
          costo: ot.costo ?? undefined,
          mecanico: ot.mecanico ?? '',
          descripcion: ot.descripcion ?? '',
          icono: esPreventivo ? '🔧' : '🛠️',
          colorBorde: esPreventivo ? 'border-l-[#56ab2f]' : 'border-l-orange-400',
        });
      });

      snapCubiertas.docs.forEach((d) => {
        const raw = d.data();
        const fecha: Date = raw.fecha?.toDate?.() ?? new Date();
        const tipoLabel: Record<string, string> = {
          INSTALACION: 'Instalación de cubierta',
          RETIRO:      'Retiro de cubierta',
          ROTACION:    'Rotación de cubiertas',
          RECAPADO:    'Cubierta enviada a recapar',
        };
        lista.push({
          id: d.id,
          tipo: 'cubierta',
          coleccion: 'movimientos_cubiertas',
          fecha,
          titulo: tipoLabel[raw.tipo ?? ''] ?? `Movimiento: ${raw.tipo}`,
          subtitulo: raw.posicion ? `Posición: ${raw.posicion}` : undefined,
          detalle: raw.observaciones ?? raw.motivo ?? undefined,
          icono: '🔵',
          colorBorde: 'border-l-blue-400',
        });
      });

      lista.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      setEventos(lista);
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  useEffect(() => { cargar(); }, [unidadNumero]);

  // ── EDIT ──────────────────────────────────────────────────────────────────

  function abrirEdit(evento: EventoHistorial) {
    setDeleteId(null);
    setEditandoId(evento.id);
    setEditForm({
      fecha: evento.fecha.toISOString().split('T')[0],
      km: evento.km?.toString() ?? '',
      mecanico: evento.mecanico ?? '',
      descripcion: evento.descripcion ?? '',
      costo: evento.costo?.toString() ?? '',
    });
  }

  async function guardarEdit(evento: EventoHistorial) {
    if (!editForm) return;
    setGuardandoEdit(true);
    try {
      const kmNum = editForm.km ? Number(editForm.km) : null;
      const costoNum = editForm.costo ? Number(editForm.costo) : null;
      const fechaObj = new Date(editForm.fecha + 'T12:00:00');
      await updateDoc(doc(db, evento.coleccion, evento.id), {
        fechaFin:    Timestamp.fromDate(fechaObj),
        kmService:   kmNum,
        mecanico:    editForm.mecanico.trim(),
        descripcion: editForm.descripcion.trim(),
        costo:       costoNum,
      });
      setEditandoId(null);
      setEditForm(null);
      cargar();
    } catch (err) {
      console.error('[TabHistorial] edit fail', err);
    } finally {
      setGuardandoEdit(false);
    }
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────

  async function confirmarDelete(evento: EventoHistorial) {
    setEliminando(true);
    try {
      await deleteDoc(doc(db, evento.coleccion, evento.id));
      setDeleteId(null);
      cargar();
    } catch (err) {
      console.error('[TabHistorial] delete fail', err);
    } finally {
      setEliminando(false);
    }
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  const eventosFiltrados = filtro === 'todos'
    ? eventos
    : eventos.filter((e) => e.tipo === filtro);

  const counts = {
    todos:         eventos.length,
    service:       eventos.filter((e) => e.tipo === 'service').length,
    ot_correctiva: eventos.filter((e) => e.tipo === 'ot_correctiva').length,
    cubierta:      eventos.filter((e) => e.tipo === 'cubierta').length,
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

      {/* FILTROS */}
      <div className="flex flex-wrap gap-1.5">
        {([
          { key: 'todos',         label: `Todos (${counts.todos})` },
          { key: 'service',       label: `🔧 Services (${counts.service})` },
          { key: 'ot_correctiva', label: `🛠️ Correctivas (${counts.ot_correctiva})` },
          { key: 'cubierta',      label: `🔵 Cubiertas (${counts.cubierta})` },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
              filtro === key
                ? 'bg-[#1a2332] border-[#1a2332] text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TIMELINE */}
      {eventosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-2">📋</div>
          <div className="font-semibold text-sm">Sin registros con ese filtro</div>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />

          <div className="space-y-3">
            {eventosFiltrados.map((evento) => {
              const esOT = evento.coleccion === 'ordenes_trabajo';
              const editando = editandoId === evento.id;
              const confirmDelete = deleteId === evento.id;

              return (
                <div key={evento.id} className="relative flex gap-4">
                  {/* Ícono */}
                  <div className="relative z-10 w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-base shrink-0">
                    {evento.icono}
                  </div>

                  {/* Card */}
                  <div className={`flex-1 bg-white rounded-xl border border-gray-200 border-l-4 ${evento.colorBorde} shadow-sm mb-1 overflow-hidden`}>

                    {/* Cabecera siempre visible */}
                    <div className="flex items-start justify-between gap-2 p-3 pb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-900">{evento.titulo}</div>
                        {!editando && evento.subtitulo && (
                          <div className="text-xs text-gray-500 mt-0.5">{evento.subtitulo}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-gray-400">{formatFecha(evento.fecha)}</span>
                        {/* Botón editar (solo OTs) */}
                        {esOT && !confirmDelete && (
                          <button
                            onClick={() => editando ? (setEditandoId(null), setEditForm(null)) : abrirEdit(evento)}
                            title={editando ? 'Cancelar edición' : 'Editar'}
                            className={`p-1 rounded hover:bg-gray-100 transition-colors ${editando ? 'text-[#56ab2f]' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            <IconEdit />
                          </button>
                        )}
                        {/* Botón eliminar */}
                        {!editando && (
                          <button
                            onClick={() => setDeleteId(confirmDelete ? null : evento.id)}
                            title={confirmDelete ? 'Cancelar' : 'Eliminar'}
                            className={`p-1 rounded hover:bg-red-50 transition-colors ${confirmDelete ? 'text-red-600' : 'text-gray-400 hover:text-red-500'}`}
                          >
                            <IconTrash />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Confirm delete */}
                    {confirmDelete && (
                      <div className="px-3 pb-3 flex items-center gap-2">
                        <span className="text-xs text-red-600 font-semibold flex-1">¿Eliminar este registro?</span>
                        <button
                          onClick={() => confirmarDelete(evento)}
                          disabled={eliminando}
                          className="text-xs font-bold px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50"
                        >
                          {eliminando ? '...' : 'Eliminar'}
                        </button>
                        <button
                          onClick={() => setDeleteId(null)}
                          className="text-xs font-semibold px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}

                    {/* Detalle normal */}
                    {!editando && !confirmDelete && (
                      <div className="px-3 pb-3">
                        {evento.detalle && (
                          <div className="text-xs text-gray-600 line-clamp-2">{evento.detalle}</div>
                        )}
                        {(evento.km || evento.costo) && (
                          <div className="flex gap-3 mt-1.5">
                            {evento.km && <span className="text-xs text-gray-500">🛣️ {formatKm(evento.km)}</span>}
                            {evento.costo != null && evento.costo > 0 && (
                              <span className="text-xs text-gray-500">💰 ${evento.costo.toLocaleString('es-AR')}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Form edición (solo OTs) */}
                    {editando && editForm && (
                      <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Fecha</label>
                            <input type="date"
                              className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#56ab2f]"
                              value={editForm.fecha}
                              onChange={(e) => setEditForm({ ...editForm, fecha: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">KM</label>
                            <input type="number"
                              className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#56ab2f]"
                              value={editForm.km}
                              onChange={(e) => setEditForm({ ...editForm, km: e.target.value })} />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Mecánico</label>
                          <input
                            className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#56ab2f]"
                            value={editForm.mecanico}
                            onChange={(e) => setEditForm({ ...editForm, mecanico: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Descripción</label>
                          <input
                            className="mt-0.5 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#56ab2f]"
                            value={editForm.descripcion}
                            onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Costo</label>
                          <div className="relative mt-0.5">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                            <input type="number"
                              className="w-full border border-gray-200 rounded-lg pl-5 pr-2 py-1.5 text-xs focus:outline-none focus:border-[#56ab2f]"
                              value={editForm.costo}
                              onChange={(e) => setEditForm({ ...editForm, costo: e.target.value })} />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => guardarEdit(evento)}
                            disabled={guardandoEdit}
                            className="flex-1 bg-gradient-to-r from-[#56ab2f] to-[#a8e063] text-white text-xs font-bold py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50"
                          >
                            {guardandoEdit ? 'Guardando...' : '💾 Guardar'}
                          </button>
                          <button
                            onClick={() => { setEditandoId(null); setEditForm(null); }}
                            className="px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
