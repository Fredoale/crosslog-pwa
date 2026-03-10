/**
 * FORMULARIO DE CARGA DE COMBUSTIBLE
 * Permite registrar cargas de combustible para las unidades de la flota
 * Calcula automáticamente el consumo L/100km
 */

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { CargaCombustible, TipoCombustible } from '../../types/checklist';
import { saveCargaCombustible } from '../../services/combustibleService';
import { showSuccess, showError, showWarning } from '../../utils/toast';

// Configuración de capacidad máxima de tanque por tipo de unidad
const CAPACIDAD_MAXIMA_LITROS: Record<string, number> = {
  // Tractores VRAC: 700L
  '806': 700, '805': 700, '40': 700, '48': 700, '50': 700,
  '802': 700, '810': 700, '812': 700, '814': 700, '815': 700,
  '45': 700, '41': 700, '46': 700, '813': 700,
  // Camionetas/Chasis: 100L
  '64': 100, '63': 100, '62': 100, '817': 100, '54': 100, '816': 100,
};
const CAPACIDAD_DEFAULT = 700; // Por defecto para unidades no configuradas

function obtenerCapacidadMaxima(unidadNumero: string): number {
  return CAPACIDAD_MAXIMA_LITROS[unidadNumero] || CAPACIDAD_DEFAULT;
}

interface FormularioCargaCombustibleProps {
  unidad: {
    numero: string;
    patente: string;
  };
  chofer: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function FormularioCargaCombustible({
  unidad,
  chofer: choferInicial,
  onComplete,
  onCancel
}: FormularioCargaCombustibleProps) {
  const [currentStep, setCurrentStep] = useState<'datos' | 'resumen'>('datos');

  // Datos del formulario
  const [kilometrajeActual, setKilometrajeActual] = useState('');
  const [litrosCargados, setLitrosCargados] = useState('');
  const [costoTotal, setCostoTotal] = useState('');
  const [tipoCombustible, setTipoCombustible] = useState<TipoCombustible>('COMÚN');
  const [estacionServicio, setEstacionServicio] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [nombreChofer, setNombreChofer] = useState(choferInicial);

  // Capacidad máxima del tanque para esta unidad
  const capacidadMaxima = obtenerCapacidadMaxima(unidad.numero);

  // Estados de carga
  const [loading, setLoading] = useState(false);
  const [loadingKm, setLoadingKm] = useState(true);
  const [ultimaCarga, setUltimaCarga] = useState<CargaCombustible | null>(null);
  const [consumoCalculado, setConsumoCalculado] = useState<number | null>(null);
  const [kmFuenteChecklist, setKmFuenteChecklist] = useState(false);

  // Autocomplete chofer
  const [sugerenciasChofer, setSugerenciasChofer] = useState<string[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [choferesCargados, setChoferesCargados] = useState<string[]>([]);

  // Cargar lista de choferes únicos de checklists recientes
  useEffect(() => {
    const cargarChoferes = async () => {
      try {
        const q = query(
          collection(db, 'checklists'),
          orderBy('timestamp', 'desc'),
          limit(200)
        );
        const snap = await getDocs(q);
        const nombres = new Set<string>();
        snap.docs.forEach(doc => {
          const nombre = doc.data().chofer?.nombre;
          if (nombre && nombre.trim()) nombres.add(nombre.trim());
        });
        setChoferesCargados(Array.from(nombres).sort());
      } catch { /* silencioso */ }
    };
    cargarChoferes();
  }, []);

  // Filtrar sugerencias al escribir
  useEffect(() => {
    if (!nombreChofer.trim()) {
      setSugerenciasChofer(choferesCargados.slice(0, 8));
    } else {
      const filtradas = choferesCargados.filter(c =>
        c.toLowerCase().includes(nombreChofer.toLowerCase())
      );
      setSugerenciasChofer(filtradas.slice(0, 8));
    }
  }, [nombreChofer, choferesCargados]);

  // Cargar último kilometraje registrado (del último checklist o carga)
  useEffect(() => {
    const cargarUltimoKilometraje = async () => {
      try {
        setLoadingKm(true);

        // Buscar en checklists — odometroFinal primero, luego odometroInicial
        const qChecklists = query(
          collection(db, 'checklists'),
          where('unidad.numero', '==', unidad.numero),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const checklistSnapshot = await getDocs(qChecklists);
        let ultimoKm = 0;
        let kmDeChecklist = false;

        if (!checklistSnapshot.empty) {
          const data = checklistSnapshot.docs[0].data();
          ultimoKm = data.odometroFinal?.valor ?? data.odometroInicial?.valor ?? 0;
          if (ultimoKm > 0) kmDeChecklist = true;
        }

        // Buscar última carga de combustible
        const qCargas = query(
          collection(db, 'cargas_combustible'),
          where('unidad.numero', '==', unidad.numero),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const cargasSnapshot = await getDocs(qCargas);

        if (!cargasSnapshot.empty) {
          const ultimaCargaData = cargasSnapshot.docs[0].data() as CargaCombustible;
          setUltimaCarga(ultimaCargaData);
          if (ultimaCargaData.kilometrajeActual > ultimoKm) {
            ultimoKm = ultimaCargaData.kilometrajeActual;
            kmDeChecklist = false;
          }
        }

        if (ultimoKm > 0) {
          setKilometrajeActual(ultimoKm.toString());
          setKmFuenteChecklist(kmDeChecklist);
        }

      } catch (error) {
        console.error('[FormularioCombustible] Error al cargar último kilometraje:', error);
      } finally {
        setLoadingKm(false);
      }
    };

    cargarUltimoKilometraje();
  }, [unidad.numero]);

  // Calcular consumo en tiempo real
  useEffect(() => {
    if (ultimaCarga && kilometrajeActual && litrosCargados) {
      const kmActual = parseFloat(kilometrajeActual);
      const litros = parseFloat(litrosCargados);
      const kmAnterior = ultimaCarga.kilometrajeActual;

      if (kmActual > kmAnterior && litros > 0) {
        const kmRecorridos = kmActual - kmAnterior;
        const consumo = (litros / kmRecorridos) * 100; // L/100km
        setConsumoCalculado(consumo);
      } else {
        setConsumoCalculado(null);
      }
    } else {
      setConsumoCalculado(null);
    }
  }, [kilometrajeActual, litrosCargados, ultimaCarga]);

  const handleContinuar = () => {
    // Validaciones
    if (!nombreChofer.trim()) {
      showWarning('Por favor ingresa el nombre del chofer');
      return;
    }

    if (!kilometrajeActual || parseFloat(kilometrajeActual) <= 0) {
      showWarning('Por favor ingresa el kilometraje actual');
      return;
    }

    if (!litrosCargados || parseFloat(litrosCargados) <= 0) {
      showWarning('Por favor ingresa los litros cargados');
      return;
    }

    // Validar capacidad máxima del tanque
    const litros = parseFloat(litrosCargados);
    if (litros > capacidadMaxima) {
      showError(`La cantidad de litros (${litros}L) excede la capacidad máxima del tanque (${capacidadMaxima}L)`);
      return;
    }

    if (!costoTotal || parseFloat(costoTotal) <= 0) {
      showWarning('Por favor ingresa el costo total');
      return;
    }

    // Validar que el kilometraje sea mayor al anterior
    if (ultimaCarga && parseFloat(kilometrajeActual) <= ultimaCarga.kilometrajeActual) {
      showWarning(`El kilometraje debe ser mayor a la última carga (${ultimaCarga.kilometrajeActual} km)`);
      return;
    }

    setCurrentStep('resumen');
  };

  const handleGuardar = async () => {
    setLoading(true);

    try {
      // TODO: Guardar en Firebase
      console.log('[FormularioCombustible] Guardando carga de combustible...');

      const carga: Omit<CargaCombustible, 'id' | 'timestamp'> = {
        fecha: new Date(),
        unidad: {
          numero: unidad.numero,
          patente: unidad.patente
        },
        kilometrajeActual: parseFloat(kilometrajeActual),
        litrosCargados: parseFloat(litrosCargados),
        tipoCombustible,
        costoTotal: parseFloat(costoTotal),
        estacionServicio: estacionServicio || undefined,
        observaciones: observaciones || undefined,
        operador: nombreChofer.trim()
      };

      console.log('[FormularioCombustible] Datos de la carga:', carga);

      // Guardar en Firebase
      const cargaId = await saveCargaCombustible(carga);
      console.log('[FormularioCombustible] ✅ Carga guardada con ID:', cargaId);

      showSuccess('Carga de combustible registrada exitosamente');
      onComplete();

    } catch (error) {
      console.error('[FormularioCombustible] Error al guardar:', error);
      showError('Error al guardar la carga de combustible');
    } finally {
      setLoading(false);
    }
  };

  if (currentStep === 'resumen') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 p-4">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#0033A0] text-white p-6">
            <div className="flex items-center gap-3">
              <div className="text-4xl">⛽</div>
              <div>
                <h2 className="text-2xl font-bold">Resumen de Carga</h2>
                <p className="text-blue-100 text-sm">YPF EN RUTA</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Unidad */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-2">Unidad</h3>
              <p className="text-lg font-bold text-gray-800">INT-{unidad.numero} - {unidad.patente}</p>
              <p className="text-sm text-gray-600 mt-1">Chofer: {nombreChofer}</p>
            </div>

            {/* Datos de la carga */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Datos de la Carga</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Kilometraje actual:</span>
                  <span className="font-bold text-gray-800">{parseFloat(kilometrajeActual).toLocaleString()} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Litros cargados:</span>
                  <span className="font-bold text-gray-800">{parseFloat(litrosCargados).toFixed(2)} L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo de combustible:</span>
                  <span className="font-bold text-gray-800">{tipoCombustible}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Costo total:</span>
                  <span className="font-bold text-green-600">${parseFloat(costoTotal).toLocaleString('es-AR')}</span>
                </div>
                {estacionServicio && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estación:</span>
                    <span className="font-bold text-gray-800">{estacionServicio}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Consumo calculado */}
            {consumoCalculado !== null && (
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  📊 Consumo Calculado
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Km recorridos:</span>
                    <span className="font-bold text-blue-900">
                      {(parseFloat(kilometrajeActual) - (ultimaCarga?.kilometrajeActual || 0)).toLocaleString()} km
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">Rendimiento:</span>
                    <span className="text-2xl font-bold text-blue-900">
                      {consumoCalculado.toFixed(2)} <span className="text-base">L/100km</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Costo por km:</span>
                    <span className="font-bold text-blue-900">
                      ${(parseFloat(costoTotal) / (parseFloat(kilometrajeActual) - (ultimaCarga?.kilometrajeActual || 0))).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {observaciones && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-2">Observaciones</h3>
                <p className="text-gray-800">{observaciones}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-6 bg-gray-50">
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('datos')}
                disabled={loading}
                className="flex-1 px-4 py-2.5 md:px-6 md:py-3 text-sm md:text-base bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Volver
              </button>
              <button
                onClick={handleGuardar}
                disabled={loading}
                className="flex-1 px-4 py-2.5 md:px-6 md:py-3 text-sm md:text-base bg-[#0033A0] text-white font-semibold rounded-lg hover:bg-[#0047CC] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    💾 Confirmar y Guardar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#0033A0] text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">⛽</div>
              <div>
                <h2 className="text-2xl font-bold">Registro de Carga</h2>
                <p className="text-blue-100 text-sm">YPF EN RUTA</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info de la unidad */}
          <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">Unidad Seleccionada</h3>
            <p className="text-lg font-bold text-blue-900">INT-{unidad.numero} - {unidad.patente}</p>
            <p className="text-xs text-blue-600 mt-1">Capacidad máxima: {capacidadMaxima} litros</p>
          </div>

          {/* Nombre del Chofer — autocomplete */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre del Chofer *
            </label>
            <input
              type="text"
              value={nombreChofer}
              onChange={(e) => { setNombreChofer(e.target.value); setMostrarSugerencias(true); }}
              onFocus={() => setMostrarSugerencias(true)}
              onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 transition-all ${
                !nombreChofer.trim() ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
              }`}
              placeholder="Escribí para buscar o ingresá el nombre..."
              autoComplete="off"
            />
            {!nombreChofer.trim() && (
              <p className="text-xs text-red-500 mt-1">Campo obligatorio</p>
            )}
            {mostrarSugerencias && sugerenciasChofer.length > 0 && (
              <div className="absolute z-50 w-full bg-white border-2 border-blue-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto">
                {sugerenciasChofer.map((chofer) => (
                  <button
                    key={chofer}
                    type="button"
                    onMouseDown={() => { setNombreChofer(chofer); setMostrarSugerencias(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-800 transition-colors border-b border-gray-100 last:border-0 font-medium"
                  >
                    👤 {chofer}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loadingKm && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Cargando datos...</p>
            </div>
          )}

          {!loadingKm && (
            <>
              {/* Kilometraje */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Kilometraje Actual (km) *
                </label>
                <input
                  type="number"
                  value={kilometrajeActual}
                  onChange={(e) => setKilometrajeActual(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-lg font-semibold"
                  placeholder="Ej: 145678"
                  min="0"
                />
                {kmFuenteChecklist && (
                  <p className="text-xs text-[#56ab2f] mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Autocompletado desde último checklist — podés editarlo
                  </p>
                )}
                {ultimaCarga && (
                  <p className="text-xs text-gray-500 mt-1">
                    Última carga registrada: {ultimaCarga.kilometrajeActual.toLocaleString()} km
                  </p>
                )}
              </div>

              {/* Litros cargados */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Litros Cargados * <span className="text-xs font-normal text-gray-500">(máx: {capacidadMaxima}L)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={litrosCargados}
                  onChange={(e) => setLitrosCargados(e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 transition-all text-lg font-semibold ${
                    litrosCargados && parseFloat(litrosCargados) > capacidadMaxima
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200 bg-red-50'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                  placeholder="Ej: 45.50"
                  min="0"
                  max={capacidadMaxima}
                />
                {litrosCargados && parseFloat(litrosCargados) > capacidadMaxima && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Excede la capacidad máxima del tanque ({capacidadMaxima}L)
                  </p>
                )}
              </div>

              {/* Tipo de combustible */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de Combustible *
                </label>
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {(['COMÚN', 'INFINIA', 'UREA'] as TipoCombustible[]).map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setTipoCombustible(tipo)}
                      className={`px-2 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-lg font-semibold transition-all border-2 ${
                        tipoCombustible === tipo
                          ? 'bg-[#0033A0] text-white border-[#0033A0]'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Costo total */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Costo Total ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={costoTotal}
                  onChange={(e) => setCostoTotal(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-lg font-semibold"
                  placeholder="Ej: 38250.00"
                  min="0"
                />
                {litrosCargados && costoTotal && (
                  <p className="text-xs text-gray-500 mt-1">
                    Precio por litro: ${(parseFloat(costoTotal) / parseFloat(litrosCargados)).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Estación de servicio */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Estación de Servicio (opcional)
                </label>
                <input
                  type="text"
                  value={estacionServicio}
                  onChange={(e) => setEstacionServicio(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="Ej: YPF Ruta 5 Km 120"
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                  rows={3}
                  placeholder="Ingrese cualquier observación relevante..."
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loadingKm && (
          <div className="border-t p-6 bg-gray-50">
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 md:px-6 md:py-3 text-sm md:text-base bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleContinuar}
                className="flex-1 px-4 py-2.5 md:px-6 md:py-3 text-sm md:text-base bg-[#0033A0] text-white font-semibold rounded-lg hover:bg-[#0047CC] transition-colors"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
