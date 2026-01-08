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
  chofer,
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

  // Estados de carga
  const [loading, setLoading] = useState(false);
  const [loadingKm, setLoadingKm] = useState(true);
  const [ultimaCarga, setUltimaCarga] = useState<CargaCombustible | null>(null);
  const [consumoCalculado, setConsumoCalculado] = useState<number | null>(null);

  // Cargar último kilometraje registrado (del último checklist o carga)
  useEffect(() => {
    const cargarUltimoKilometraje = async () => {
      try {
        setLoadingKm(true);
        console.log('[FormularioCombustible] Buscando último kilometraje para unidad:', unidad.numero);

        // Primero buscar en checklists
        const checklistsRef = collection(db, 'checklists');
        const qChecklists = query(
          checklistsRef,
          where('unidad.numero', '==', unidad.numero),
          orderBy('timestamp', 'desc'),
          limit(1)
        );

        const checklistSnapshot = await getDocs(qChecklists);
        let ultimoKm = 0;

        if (!checklistSnapshot.empty) {
          const ultimoChecklist = checklistSnapshot.docs[0].data();
          ultimoKm = ultimoChecklist.odometroInicial?.valor || 0;
          console.log('[FormularioCombustible] Último km del checklist:', ultimoKm);
        }

        // Buscar última carga de combustible
        const cargasRef = collection(db, 'cargas_combustible');
        const qCargas = query(
          cargasRef,
          where('unidad.numero', '==', unidad.numero),
          orderBy('timestamp', 'desc'),
          limit(1)
        );

        const cargasSnapshot = await getDocs(qCargas);

        if (!cargasSnapshot.empty) {
          const ultimaCargaData = cargasSnapshot.docs[0].data() as CargaCombustible;
          setUltimaCarga(ultimaCargaData);

          // Si la carga tiene km más reciente, usar ese
          if (ultimaCargaData.kilometrajeActual > ultimoKm) {
            ultimoKm = ultimaCargaData.kilometrajeActual;
            console.log('[FormularioCombustible] Último km de carga anterior:', ultimoKm);
          }
        }

        // Auto-completar con el último km
        if (ultimoKm > 0) {
          setKilometrajeActual(ultimoKm.toString());
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
    if (!kilometrajeActual || parseFloat(kilometrajeActual) <= 0) {
      alert('Por favor ingresa el kilometraje actual');
      return;
    }

    if (!litrosCargados || parseFloat(litrosCargados) <= 0) {
      alert('Por favor ingresa los litros cargados');
      return;
    }

    if (!costoTotal || parseFloat(costoTotal) <= 0) {
      alert('Por favor ingresa el costo total');
      return;
    }

    // Validar que el kilometraje sea mayor al anterior
    if (ultimaCarga && parseFloat(kilometrajeActual) <= ultimaCarga.kilometrajeActual) {
      alert(`El kilometraje debe ser mayor a la última carga (${ultimaCarga.kilometrajeActual} km)`);
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
        operador: chofer
      };

      console.log('[FormularioCombustible] Datos de la carga:', carga);

      // Guardar en Firebase
      const cargaId = await saveCargaCombustible(carga);
      console.log('[FormularioCombustible] ✅ Carga guardada con ID:', cargaId);

      alert('✅ Carga de combustible registrada exitosamente');
      onComplete();

    } catch (error) {
      console.error('[FormularioCombustible] Error al guardar:', error);
      alert('❌ Error al guardar la carga de combustible');
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
              <p className="text-sm text-gray-600 mt-1">Operador: {chofer}</p>
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
            <p className="text-sm text-blue-700 mt-1">Operador: {chofer}</p>
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
                {ultimaCarga && (
                  <p className="text-xs text-gray-500 mt-1">
                    Última carga: {ultimaCarga.kilometrajeActual.toLocaleString()} km
                  </p>
                )}
              </div>

              {/* Litros cargados */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Litros Cargados *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={litrosCargados}
                  onChange={(e) => setLitrosCargados(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-lg font-semibold"
                  placeholder="Ej: 45.50"
                  min="0"
                />
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
