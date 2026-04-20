/**
 * FICHA TÉCNICA DE UNIDAD
 * Página de detalle con tabs: Ficha / Historial / OTs / Alertas
 * Navegación: se abre desde las cards de AlertasMantenimiento
 */

import React, { useState, useEffect } from 'react';
import { type ConfigUnidad } from '../../services/alertasMantenimientoService';
import { type AlertaMantenimiento } from '../../services/alertasMantenimientoService';
import { getAlertasMantenimiento } from '../../services/alertasMantenimientoService';
import { TODAS_LAS_UNIDADES } from '../CarouselSector';

import TabFicha     from './ficha/TabFicha';
import TabHistorial from './ficha/TabHistorial';

// ============================================================================
// TIPOS
// ============================================================================

type TabId = 'ficha' | 'historial';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'ficha',     label: 'Ficha',     icon: '📋' },
  { id: 'historial', label: 'Historial', icon: '🔧' },
];

// ============================================================================
// PROPS
// ============================================================================

interface FichaUnidadProps {
  unidad: ConfigUnidad;
  tabInicial?: TabId;
  onClose: () => void;
}


// ============================================================================
// HELPERS
// ============================================================================

function sectorColor(sector: string) {
  switch (sector) {
    case 'VRAC': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'DIST': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'VA':   return 'bg-teal-100 text-teal-700 border-teal-200';
    default:     return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

function estadoBadge(estado: string) {
  switch (estado) {
    case 'vencido':  return 'bg-red-100 text-red-700 border-red-200';
    case 'urgente':  return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'atencion': return 'bg-amber-100 text-amber-700 border-amber-200';
    default:         return 'bg-[#f0f9e8] text-[#56ab2f] border-[#a8e063]';
  }
}

function estadoLabel(estado: string) {
  switch (estado) {
    case 'vencido':  return '🔴 Vencido';
    case 'urgente':  return '🟠 Urgente';
    case 'atencion': return '🟡 Atención';
    default:         return '🟢 Al día';
  }
}

// ============================================================================
// COMPONENTE
// ============================================================================

export default function FichaUnidad({ unidad, tabInicial = 'ficha', onClose }: FichaUnidadProps) {
  const [activeTab, setActiveTab] = useState<TabId>(tabInicial);
  const [alerta, setAlerta] = useState<AlertaMantenimiento | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  const patente = TODAS_LAS_UNIDADES.find((u) => u.numero === unidad.numero)?.patente ?? 'N/A';

  useEffect(() => {
    setLoading(true);
    getAlertasMantenimiento().then((alertas) => {
      const found = alertas.find((a) => a.unidad.numero === unidad.numero) ?? null;
      setAlerta(found);
      setLoading(false);
    });
  }, [unidad.numero, reloadTick]);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <div className="bg-[#1a2332] text-white sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Botón back */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Volver"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Ícono unidad */}
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
            {unidad.tipo === 'Camioneta' ? '🚐' : '🚛'}
          </div>

          {/* Info principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold">INT-{unidad.numero}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sectorColor(unidad.sector)}`}>
                {unidad.sector}
              </span>
              {alerta && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${estadoBadge(alerta.estado)}`}>
                  {estadoLabel(alerta.estado)}
                </span>
              )}
            </div>
            <div className="text-xs text-white/60 mt-0.5">
              {unidad.marca} · {patente} · c/{unidad.intervaloKm.toLocaleString('es-AR')} km
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-t border-white/10">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs font-semibold transition-colors relative ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#56ab2f] rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="px-4 py-4 max-w-3xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-gray-200 border-t-[#56ab2f] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'ficha' && (
              <TabFicha
                unidad={unidad}
                kmActual={alerta?.kmActual ?? null}
                fechaKm={null}
                alerta={alerta}
                onReload={() => setReloadTick((t) => t + 1)}
              />
            )}
            {activeTab === 'historial' && (
              <TabHistorial unidadNumero={unidad.numero} />
            )}
          </>
        )}
      </div>

    </div>
  );
}
