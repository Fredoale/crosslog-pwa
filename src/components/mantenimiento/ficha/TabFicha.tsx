/**
 * TAB FICHA — Datos técnicos editables + batería + cubiertas (desplegable)
 */

import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import {
  getBateriaActiva,
  instalarBateria,
  calcularMesesUso,
  tieneAlerteElectrica,
  bateriaDefectuosa,
  type RegistroBateria,
} from '../../../services/bateriasService';
import { obtenerCubiertasUnidad } from '../../../services/cubiertasService';
import { type Cubierta } from '../../../types/cubiertas';
import {
  obtenerAnalisisCombustible,
  type AnalisisCombustible,
} from '../../../services/combustibleAnalisisService';
import { TODAS_LAS_UNIDADES } from '../../CarouselSector';
import { type ConfigUnidad, type AlertaMantenimiento, type EstadoAlerta } from '../../../services/alertasMantenimientoService';
import { registrarServiceRapido } from '../../../services/ordenTrabajoService';

// ============================================================================
// DATOS TÉCNICOS — guardados en Firestore colección "unidades"
// ============================================================================

interface DatosTecnicos {
  modelo: string;
  año: string;
  motor: string;
  chassis: string;
  patente: string;
}

const DEFAULTS_TECNICOS: DatosTecnicos = {
  modelo: '', año: '', motor: '', chassis: '', patente: '',
};

async function getDatosTecnicos(numero: string): Promise<DatosTecnicos> {
  try {
    const snap = await getDoc(doc(db, 'unidades', numero));
    if (!snap.exists()) return DEFAULTS_TECNICOS;
    const d = snap.data();
    return {
      modelo:  d.modelo  ?? '',
      año:     d.año     ?? '',
      motor:   d.motor   ?? '',
      chassis: d.chassis ?? '',
      patente: d.patente ?? '',
    };
  } catch {
    return DEFAULTS_TECNICOS;
  }
}

async function saveDatosTecnicos(numero: string, datos: DatosTecnicos): Promise<void> {
  await setDoc(doc(db, 'unidades', numero), datos, { merge: true });
}

// ============================================================================
// BATERÍA
// ============================================================================

function estadoBateriaConfig(bateria: RegistroBateria) {
  if (bateriaDefectuosa(bateria))     return { color: 'text-red-600',    bg: 'bg-red-50 border-red-200',       label: 'Posible defecto' };
  if (tieneAlerteElectrica(bateria))  return { color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', label: 'Revisar eléctrico' };
  if (bateria.estado === 'reemplazar')return { color: 'text-red-600',    bg: 'bg-red-50 border-red-200',       label: 'Reemplazar' };
  if (bateria.estado === 'baja_carga')return { color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200',   label: 'Baja carga' };
  return { color: 'text-[#56ab2f]', bg: 'bg-[#f0f9e8] border-[#a8e063]', label: 'OK' };
}

function FormNuevaBateria({
  unidadNumero, kmActual, onGuardado, onCancelar,
}: { unidadNumero: string; kmActual: number | null; onGuardado: () => void; onCancelar: () => void; }) {
  const [form, setForm] = useState({
    marca: '', modelo: '',
    fechaInstalacion: new Date().toISOString().split('T')[0],
    kmInstalacion: kmActual?.toString() ?? '',
    observaciones: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.marca || !form.fechaInstalacion) { setError('Marca y fecha son obligatorias.'); return; }
    setGuardando(true);
    try {
      await instalarBateria(unidadNumero, {
        marca: form.marca, modelo: form.modelo,
        fechaInstalacion: new Date(form.fechaInstalacion + 'T12:00:00'),
        kmInstalacion: Number(form.kmInstalacion) || 0,
        observaciones: form.observaciones,
        registradoPor: 'sistema',
      });
      onGuardado();
    } catch { setError('Error al guardar. Intenta de nuevo.'); }
    finally { setGuardando(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Marca *</label>
          <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#56ab2f]"
            placeholder="Ej: Bosch" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Modelo</label>
          <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#56ab2f]"
            placeholder="Ej: S5 180AH" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha instalación *</label>
          <input type="date" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#56ab2f]"
            value={form.fechaInstalacion} onChange={(e) => setForm({ ...form, fechaInstalacion: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">KM al instalar</label>
          <input type="number" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#56ab2f]"
            placeholder="KM actual" value={form.kmInstalacion} onChange={(e) => setForm({ ...form, kmInstalacion: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Observaciones</label>
        <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#56ab2f]"
          placeholder="Ej: Cambio preventivo, anterior duró 18 meses"
          value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={guardando}
          className="flex-1 bg-gradient-to-r from-[#56ab2f] to-[#a8e063] text-white text-sm font-semibold py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
          {guardando ? 'Guardando...' : 'Guardar batería'}
        </button>
        <button type="button" onClick={onCancelar}
          className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// FORM QUICK SERVICE — inline, compacto (patrón FormNuevaBateria)
// ============================================================================

function FormQuickService({
  unidadNumero, unidadPatente, kmSugerido, prevDescripcion, prevCosto, onGuardado, onCancelar,
}: {
  unidadNumero: string;
  unidadPatente: string;
  kmSugerido: number | null;
  prevDescripcion?: string;
  prevCosto?: number;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    km: kmSugerido?.toString() ?? '',
    mecanico: '',
    descripcion: prevDescripcion ?? '',
    costo: prevCosto != null ? prevCosto.toString() : '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Si kmSugerido llega después (async), rellenar km si el campo está vacío
  const kmInitialized = useRef(false);
  useEffect(() => {
    if (!kmInitialized.current && kmSugerido != null) {
      setForm((prev) => ({ ...prev, km: prev.km || kmSugerido.toString() }));
      kmInitialized.current = true;
    }
  }, [kmSugerido]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.km || !form.mecanico.trim() || !form.descripcion.trim()) {
      setError('KM, mecánico y descripción son obligatorios.');
      return;
    }
    const kmNum = Number(form.km);
    if (isNaN(kmNum) || kmNum <= 0) { setError('KM inválido.'); return; }

    setGuardando(true);
    try {
      const nOT = await registrarServiceRapido({
        unidadNumero,
        unidadPatente,
        fecha: new Date(form.fecha + 'T12:00:00'),
        km: kmNum,
        mecanico: form.mecanico.trim(),
        descripcion: form.descripcion.trim(),
        costo: form.costo ? Number(form.costo) : undefined,
      });
      console.log('[FormQuickService] ✅ Service registrado OT#', nOT);
      onGuardado();
    } catch (err) {
      console.error('[FormQuickService] ❌ Error al guardar:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Intentá de nuevo.'}`);
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha *</label>
          <input type="date" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#56ab2f]"
            value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">KM *</label>
          <input type="number" inputMode="numeric" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#56ab2f]"
            placeholder={kmSugerido != null ? `Actual: ${kmSugerido.toLocaleString('es-AR')}` : 'KM'} value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mecánico / Taller *</label>
        <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#56ab2f]"
          placeholder="Ej: Taller propio · Juan P." value={form.mecanico} onChange={(e) => setForm({ ...form, mecanico: e.target.value })} />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción *</label>
        <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#56ab2f]"
          placeholder="Ej: Cambio aceite + filtros" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Costo (opcional)</label>
        <div className="mt-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input type="number" inputMode="numeric" className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-[#56ab2f]"
            placeholder="0" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={guardando}
          className="flex-1 bg-gradient-to-r from-[#56ab2f] to-[#a8e063] text-white text-sm font-semibold py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
          {guardando ? 'Guardando...' : 'Guardar service'}
        </button>
        <button type="button" onClick={onCancelar}
          className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// ESTADO DESGASTE CUBIERTAS
// ============================================================================

const ESTADO_DESGASTE: Record<string, { label: string; color: string }> = {
  BUENO:   { label: 'Bueno',   color: 'text-[#56ab2f]' },
  REGULAR: { label: 'Regular', color: 'text-amber-600' },
  CRITICO: { label: 'Crítico', color: 'text-red-600'   },
  RECAPAR: { label: 'Recapar', color: 'text-orange-600'},
  RETIRAR: { label: 'Retirar', color: 'text-red-700'   },
};

function estadoDesdeMm(mm: number | undefined): { label: string; color: string } | null {
  if (mm == null) return null;
  if (mm > 6) return { label: 'Bueno',    color: 'text-[#56ab2f]' };
  if (mm >= 4) return { label: 'Regular',  color: 'text-amber-600' };
  if (mm >= 3) return { label: 'Desgaste', color: 'text-orange-600' };
  return { label: 'Crítico', color: 'text-red-600' };
}

// ============================================================================
// CAMPO EDITABLE INLINE
// ============================================================================

function CampoEditable({
  label, value, onChange, placeholder = '—',
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; }) {
  return (
    <div className="px-4 py-3">
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <input
        className="w-full text-sm font-semibold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#56ab2f] focus:outline-none transition-colors py-0.5"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

// ============================================================================
// SECCIÓN SERVICE — helpers de color/estado
// ============================================================================

const SERVICE_ESTADO: Record<EstadoAlerta, { barColor: string; badgeBg: string; badgeText: string; label: string; icon: string }> = {
  vencido:  { barColor: 'bg-red-500',    badgeBg: 'bg-red-50 border-red-200',       badgeText: 'text-red-700',    label: 'Vencido',  icon: '🔴' },
  urgente:  { barColor: 'bg-orange-500', badgeBg: 'bg-orange-50 border-orange-200', badgeText: 'text-orange-700', label: 'Urgente',  icon: '🟠' },
  atencion: { barColor: 'bg-amber-400',  badgeBg: 'bg-amber-50 border-amber-100',   badgeText: 'text-amber-700',  label: 'Atención', icon: '🟡' },
  ok:       { barColor: 'bg-[#56ab2f]',  badgeBg: 'bg-[#f0f9e8] border-[#a8e063]', badgeText: 'text-[#3a7a1e]',  label: 'Al día',   icon: '🟢' },
};

// ============================================================================
// PROPS
// ============================================================================

interface Props {
  unidad: ConfigUnidad;
  kmActual: number | null;
  fechaKm: Date | null;
  alerta?: AlertaMantenimiento | null;
  onReload?: () => void;
}

export default function TabFicha({ unidad, kmActual, fechaKm, alerta, onReload }: Props) {
  // Modal quick-service
  const [mostrarQuickService, setMostrarQuickService] = useState(false);
  // Batería
  const [bateria, setBateria]           = useState<RegistroBateria | null>(null);
  const [loadingBateria, setLoadingBateria] = useState(true);
  const [mostrarForm, setMostrarForm]   = useState(false);

  // Cubiertas
  const [cubiertas, setCubiertas]             = useState<Cubierta[]>([]);
  const [loadingCubiertas, setLoadingCubiertas] = useState(true);
  const [cubiertasAbiertas, setCubiertasAbiertas] = useState(false);

  // Combustible
  const [combustible, setCombustible]             = useState<AnalisisCombustible | null>(null);
  const [loadingCombustible, setLoadingCombustible] = useState(true);

  // Último service (para pre-rellenar el form)
  const [prevService, setPrevService] = useState<{ descripcion?: string; costo?: number } | null>(null);

  // Datos técnicos editables
  const [datos, setDatos]         = useState<DatosTecnicos>(DEFAULTS_TECNICOS);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [datosSucios, setDatosSucios]   = useState(false);

  const patenteStatic = TODAS_LAS_UNIDADES.find((u) => u.numero === unidad.numero)?.patente ?? '';

  useEffect(() => {
    // Cargar datos técnicos
    getDatosTecnicos(unidad.numero).then((d) => {
      setDatos({ ...d, patente: d.patente || patenteStatic });
      setLoadingDatos(false);
    });
    // Cargar batería
    getBateriaActiva(unidad.numero).then((b) => {
      setBateria(b);
      setLoadingBateria(false);
    }).catch(() => setLoadingBateria(false));
    // Cargar cubiertas
    obtenerCubiertasUnidad(unidad.numero).then((c) => {
      setCubiertas(c);
      setLoadingCubiertas(false);
    }).catch(() => setLoadingCubiertas(false));
    // Cargar análisis de combustible
    obtenerAnalisisCombustible(unidad.numero).then((a) => {
      setCombustible(a);
      setLoadingCombustible(false);
    }).catch(() => setLoadingCombustible(false));
  }, [unidad.numero]);

  useEffect(() => {
    if (!alerta?.otId) { setPrevService(null); return; }
    getDoc(doc(db, 'ordenes_trabajo', alerta.otId)).then((snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      setPrevService({
        descripcion: d.descripcion ?? d.trabajoRealizado ?? '',
        costo: d.costo ?? d.costoTotal ?? undefined,
      });
    }).catch(() => {/* silencioso */});
  }, [alerta?.otId]);

  function updateDato(campo: keyof DatosTecnicos, valor: string) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    setDatosSucios(true);
  }

  async function guardarDatos() {
    setGuardandoDatos(true);
    await saveDatosTecnicos(unidad.numero, datos);
    setDatosSucios(false);
    setGuardandoDatos(false);
  }

  function recargarBateria() {
    setMostrarForm(false);
    setLoadingBateria(true);
    getBateriaActiva(unidad.numero).then((b) => {
      setBateria(b);
      setLoadingBateria(false);
    });
  }

  // Datos service derivados
  const estadoKey: EstadoAlerta = alerta?.estado ?? 'ok';
  const svcCfg = SERVICE_ESTADO[estadoKey];
  const porcentaje = alerta?.porcentaje ?? null;
  const porcentajeClamp = porcentaje !== null ? Math.min(100, Math.max(0, porcentaje)) : null;

  return (
    <div className="space-y-4">

      {/* ── SERVICE (sección principal) ───────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">🔧 Service</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${svcCfg.badgeBg} ${svcCfg.badgeText}`}>
              {svcCfg.icon} {svcCfg.label}
            </span>
          </div>
          {!mostrarQuickService && (
            <button
              onClick={() => setMostrarQuickService(true)}
              className="text-xs font-semibold text-[#56ab2f] hover:underline shrink-0"
            >
              + Registrar service
            </button>
          )}
        </div>

        {mostrarQuickService ? (
          <div className="p-4">
            <FormQuickService
              unidadNumero={unidad.numero}
              unidadPatente={datos.patente || patenteStatic || 'N/A'}
              kmSugerido={kmActual ?? alerta?.kmUltimoService ?? null}
              prevDescripcion={prevService?.descripcion}
              prevCosto={prevService?.costo}
              onGuardado={() => {
                setMostrarQuickService(false);
                onReload?.();
              }}
              onCancelar={() => setMostrarQuickService(false)}
            />
          </div>
        ) : (
        <>
        {/* Grilla último service + km actual */}
        <div className="grid grid-cols-2 gap-0 divide-x divide-gray-100">
          <div className="px-4 py-3">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Último service</div>
            {alerta?.fechaUltimoService ? (
              <>
                <div className="text-sm font-bold text-gray-900">
                  {alerta.fechaUltimoService.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
                {alerta.kmUltimoService != null && (
                  <div className="text-xs text-gray-400 mt-0.5">@ {alerta.kmUltimoService.toLocaleString('es-AR')} km</div>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-400">Sin registro</div>
            )}
          </div>
          <div className="px-4 py-3">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">KM actual</div>
            <div className="text-sm font-bold text-gray-900">
              {kmActual !== null ? kmActual.toLocaleString('es-AR') + ' km' : '—'}
            </div>
            {alerta?.kmUltimoService != null && kmActual != null && (
              <div className="text-xs text-gray-400 mt-0.5">
                {(kmActual - alerta.kmUltimoService).toLocaleString('es-AR')} km recorridos
              </div>
            )}
          </div>
        </div>

        {/* Barra de progreso */}
        {porcentajeClamp !== null && (
          <div className="px-4 pb-1 pt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Progreso hacia próximo service</span>
              <span className={`text-xs font-bold ${svcCfg.badgeText}`}>{Math.round(porcentajeClamp)}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${svcCfg.barColor}`}
                style={{ width: `${porcentajeClamp}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>{alerta?.kmUltimoService?.toLocaleString('es-AR') ?? '—'} km</span>
              <span>{alerta?.kmProximoService?.toLocaleString('es-AR') ?? '—'} km</span>
            </div>
          </div>
        )}

        {/* KM faltantes */}
        <div className="px-4 pt-2 pb-4">
          {alerta?.kmFaltantes != null ? (
            alerta.kmFaltantes <= 0 ? (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="text-sm">🚨</span>
                <span className="text-sm font-bold text-red-700">
                  Service vencido por {Math.abs(alerta.kmFaltantes).toLocaleString('es-AR')} km
                </span>
              </div>
            ) : (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${svcCfg.badgeBg}`}>
                <span className="text-sm">📍</span>
                <span className={`text-sm font-bold ${svcCfg.badgeText}`}>
                  Faltan {alerta.kmFaltantes.toLocaleString('es-AR')} km · próximo a {alerta.kmProximoService?.toLocaleString('es-AR')} km
                </span>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <span className="text-sm">ℹ️</span>
              <span className="text-sm text-gray-500">
                Intervalo: cada {unidad.intervaloKm.toLocaleString('es-AR')} km
              </span>
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {/* ── DATOS GENERALES (editables) ─────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Datos generales</span>
          {datosSucios && (
            <button
              onClick={guardarDatos}
              disabled={guardandoDatos}
              className="text-xs font-semibold text-white bg-[#56ab2f] hover:bg-[#4a9428] px-3 py-1 rounded-lg disabled:opacity-60 transition-colors"
            >
              {guardandoDatos ? 'Guardando...' : '💾 Guardar'}
            </button>
          )}
        </div>

        {loadingDatos ? (
          <div className="flex items-center gap-2 p-4 text-sm text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-[#56ab2f] rounded-full animate-spin" />
            Cargando...
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 divide-x divide-y divide-gray-100">
            {/* Campo estático — no editable */}
            <div className="px-4 py-3">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Unidad</div>
              <div className="text-sm font-semibold text-gray-800">INT-{unidad.numero}</div>
            </div>
            <CampoEditable label="Patente"           value={datos.patente}  onChange={(v) => updateDato('patente', v)}  placeholder="Ej: AB152AZ" />
            <div className="px-4 py-3">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Marca</div>
              <div className="text-sm font-semibold text-gray-800">{unidad.marca}</div>
            </div>
            <CampoEditable label="Modelo"            value={datos.modelo}   onChange={(v) => updateDato('modelo', v)}   placeholder="Ej: Trakker AD410T42H" />
            <CampoEditable label="Año"               value={datos.año}      onChange={(v) => updateDato('año', v)}      placeholder="Ej: 2019" />
            <div className="px-4 py-3">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Sector</div>
              <div className="text-sm font-semibold text-gray-800">{unidad.sector}</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Tipo</div>
              <div className="text-sm font-semibold text-gray-800">{unidad.tipo}</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Intervalo service</div>
              <div className="text-sm font-semibold text-gray-800">c/{unidad.intervaloKm.toLocaleString('es-AR')} km</div>
            </div>
            <CampoEditable label="Motor"             value={datos.motor}    onChange={(v) => updateDato('motor', v)}    placeholder="Ej: F3HFE601D" />
            <CampoEditable label="N° Chassis"        value={datos.chassis}  onChange={(v) => updateDato('chassis', v)}  placeholder="Ej: WJMM8TLA3KN..." />
          </div>
        )}
        {datosSucios && (
          <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
            ✏️ Hay cambios sin guardar
          </div>
        )}
      </div>

      {/* ── BATERÍA ──────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">🔋 Batería</span>
          {!mostrarForm && (
            <button onClick={() => setMostrarForm(true)} className="text-xs font-semibold text-[#56ab2f] hover:underline">
              {bateria ? '+ Cambiar batería' : '+ Registrar batería'}
            </button>
          )}
        </div>
        <div className="p-4">
          {loadingBateria ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-200 border-t-[#56ab2f] rounded-full animate-spin" />
              Cargando...
            </div>
          ) : mostrarForm ? (
            <FormNuevaBateria unidadNumero={unidad.numero} kmActual={kmActual} onGuardado={recargarBateria} onCancelar={() => setMostrarForm(false)} />
          ) : bateria ? (
            <div className="space-y-3">
              {(tieneAlerteElectrica(bateria) || bateriaDefectuosa(bateria)) && (
                <div className={`rounded-lg border px-3 py-2 text-sm font-semibold ${tieneAlerteElectrica(bateria) ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {tieneAlerteElectrica(bateria) ? '⚡ Revisar sistema eléctrico — fallas eléctricas registradas' : '⚠️ Batería posiblemente defectuosa — múltiples fallas recientes'}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Marca / Modelo', value: `${bateria.marca} ${bateria.modelo}`.trim() || '—' },
                  { label: 'Instalada',      value: bateria.fechaInstalacion.toLocaleDateString('es-AR') },
                  { label: 'Tiempo en uso',  value: `${calcularMesesUso(bateria.fechaInstalacion)} meses` },
                  { label: 'KM al instalar', value: bateria.kmInstalacion ? bateria.kmInstalacion.toLocaleString('es-AR') + ' km' : '—' },
                  { label: 'KM recorridos',  value: kmActual && bateria.kmInstalacion ? (kmActual - bateria.kmInstalacion).toLocaleString('es-AR') + ' km' : '—' },
                  { label: 'Fallas',         value: bateria.fallas.length.toString() },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
                    <div className="text-sm font-semibold text-gray-800">{value}</div>
                  </div>
                ))}
              </div>
              {(() => {
                const cfg = estadoBateriaConfig(bateria);
                return (
                  <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {cfg.label}
                  </div>
                );
              })()}
              {bateria.observaciones && (
                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{bateria.observaciones}</div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-400 text-center py-4">No hay batería registrada para esta unidad.</div>
          )}
        </div>
      </div>

      {/* ── COMBUSTIBLE ──────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">⛽ Combustible</span>
          {combustible?.cargasCount30d != null && combustible.cargasCount30d > 0 && (
            <span className="text-[10px] font-semibold text-gray-400">
              {combustible.cargasCount30d} carga{combustible.cargasCount30d !== 1 ? 's' : ''} últimos 30 días
            </span>
          )}
        </div>
        <div className="p-4">
          {loadingCombustible ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-200 border-t-[#56ab2f] rounded-full animate-spin" />
              Cargando...
            </div>
          ) : !combustible?.ultimaCarga ? (
            <div className="text-sm text-gray-400 text-center py-3">Sin cargas de combustible registradas.</div>
          ) : (
            <div className="space-y-3">

              {/* Alerta anomalía */}
              {combustible.anomalia && (
                <div className={`rounded-lg border px-3 py-2 text-sm font-semibold flex items-start gap-2 ${
                  combustible.anomalia.severidad === 'alta'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-orange-50 border-orange-200 text-orange-700'
                }`}>
                  <span>{combustible.anomalia.tipo === 'km_retrocedido' ? '⚠️' : combustible.anomalia.tipo === 'sin_cargas' ? '📭' : '🚨'}</span>
                  <span>{combustible.anomalia.mensaje}</span>
                </div>
              )}

              {/* Última carga */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Última carga</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-gray-900">
                      {combustible.ultimaCarga.fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      @ {combustible.ultimaCarga.kilometrajeActual.toLocaleString('es-AR')} km
                      {combustible.ultimaCarga.estacionServicio && ` · ${combustible.ultimaCarga.estacionServicio}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-blue-600">{combustible.ultimaCarga.litrosCargados.toFixed(0)} L</div>
                    <div className="text-xs text-[#56ab2f] font-semibold">
                      ${combustible.ultimaCarga.costoTotal.toLocaleString('es-AR')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Métricas 30d */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Rendimiento</div>
                  <div className="text-sm font-bold text-gray-900 mt-0.5">
                    {combustible.rendimientoPromedio != null
                      ? `${combustible.rendimientoPromedio.toFixed(2)} km/L`
                      : '—'}
                  </div>
                  <div className="text-[10px] text-gray-400">promedio 30d</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Consumo</div>
                  <div className="text-sm font-bold text-gray-900 mt-0.5">
                    {combustible.consumoPromedio != null
                      ? `${combustible.consumoPromedio.toFixed(1)} L/100`
                      : '—'}
                  </div>
                  <div className="text-[10px] text-gray-400">promedio 30d</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Gasto</div>
                  <div className="text-sm font-bold text-[#56ab2f] mt-0.5">
                    ${combustible.costoTotal30d.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[10px] text-gray-400">últimos 30d</div>
                </div>
              </div>

              {/* Métrica extra: última medición vs promedio */}
              {combustible.rendimientoUltimo != null && combustible.rendimientoPromedio != null && (
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span>Última medición:</span>
                  <span className="font-semibold text-gray-800">{combustible.rendimientoUltimo.toFixed(2)} km/L</span>
                  {(() => {
                    const diff = combustible.rendimientoUltimo - combustible.rendimientoPromedio;
                    const pct = (diff / combustible.rendimientoPromedio) * 100;
                    const color = pct >= 0 ? 'text-[#56ab2f]' : pct <= -15 ? 'text-red-600' : 'text-amber-600';
                    return (
                      <span className={`font-bold ${color}`}>
                        {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(0)}% vs promedio
                      </span>
                    );
                  })()}
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {/* ── CUBIERTAS (desplegable) ───────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setCubiertasAbiertas((v) => !v)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">🔵 Cubiertas instaladas</span>
            {!loadingCubiertas && (
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                {cubiertas.length}
              </span>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${cubiertasAbiertas ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {cubiertasAbiertas && (
          <div className="border-t border-gray-100 p-4">
            {loadingCubiertas ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-200 border-t-[#56ab2f] rounded-full animate-spin" />
                Cargando cubiertas...
              </div>
            ) : cubiertas.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-3">Sin cubiertas registradas.</div>
            ) : (
              <div className="space-y-2">
                {cubiertas.map((c) => {
                  const cfg = (c.estadoDesgaste && ESTADO_DESGASTE[c.estadoDesgaste])
                    ?? estadoDesdeMm(c.ultimaProfundidadMm)
                    ?? { label: '—', color: 'text-gray-400' };
                  return (
                    <div key={c.id} className="py-2.5 border-b border-gray-100 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-gray-900">{c.marca}</span>
                            {c.modelo && <span className="text-sm font-semibold text-gray-700">{c.modelo}</span>}
                            <span className="text-xs text-gray-400">{c.medida}</span>
                            {c.tipo === 'RECAPADA' && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">RECAP</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                            <span className="text-xs text-gray-500 font-medium">{c.posicion ?? 'Sin posición'}</span>
                            <span className="text-xs text-gray-400">{c.kmTotales.toLocaleString('es-AR')} km</span>
                            {c.recapados > 0 && <span className="text-xs text-gray-400">{c.recapados}× recapada</span>}
                            {c.dot && <span className="text-xs text-gray-400">DOT {c.dot}</span>}
                          </div>
                          <div className="text-[10px] text-gray-300 mt-0.5">{c.codigo}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</div>
                          {c.ultimaProfundidadMm != null && (
                            <div className="text-[11px] font-semibold text-gray-500">{c.ultimaProfundidadMm} mm</div>
                          )}
                          {c.ultimaMedicionFecha && (
                            <div className="text-[9px] text-gray-300">
                              {c.ultimaMedicionFecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
