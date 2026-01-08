import { useState } from 'react';
import {
  ITEMS_CHECKLIST,
  type EstadoItem,
  type ChecklistRegistro,
  type ItemChecklist,
  type Novedad
} from '../types/checklist';
import { saveChecklist } from '../services/checklistService';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

interface ChecklistVRACProps {
  unidad: {
    numero: string;
    patente: string;
  };
  cisterna: {
    numero: string;
    patente: string;
  };
  chofer: string;
  onComplete: (checklist: ChecklistRegistro) => void;
  onCancel: () => void;
}

export function ChecklistVRAC({ unidad, cisterna, chofer, onComplete, onCancel }: ChecklistVRACProps) {
  const [currentStep, setCurrentStep] = useState<'odometro' | 'items' | 'resumen'>('odometro');
  const [odometro, setOdometro] = useState('');
  const [items, setItems] = useState<ItemChecklist[]>(
    ITEMS_CHECKLIST.map(item => ({
      ...item,
      estado: 'CONFORME' as EstadoItem,
      comentario: '',
      fotoUrl: undefined,
      timestamp: new Date()
    }))
  );
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showComentario, setShowComentario] = useState(false);
  const [comentarioTemp, setComentarioTemp] = useState('');
  const [showNovedadModal, setShowNovedadModal] = useState(false);
  const [novedades, setNovedades] = useState<Array<{descripcion: string; fotoUrl?: string}>>([]);
  const [novedadTemp, setNovedadTemp] = useState('');
  const [fotoNovedadTemp, setFotoNovedadTemp] = useState<string | null>(null);
  const [capturandoFotoNovedadModal, setCapturandoFotoNovedadModal] = useState(false);
  const [showConfirmacionSinEvidencia, setShowConfirmacionSinEvidencia] = useState(false);
  const [capturandoFoto, setCapturandoFoto] = useState(false);

  const currentItem = items[currentItemIndex];
  const totalItems = items.length;
  const progress = ((currentItemIndex + 1) / totalItems) * 100;

  // Handlers
  const handleOdometroSubmit = () => {
    if (!odometro || parseInt(odometro) <= 0) {
      alert('Por favor ingresa un odómetro válido');
      return;
    }
    setCurrentStep('items');
  };

  const handleEstadoChange = (estado: EstadoItem) => {
    const updatedItems = [...items];
    updatedItems[currentItemIndex] = {
      ...updatedItems[currentItemIndex],
      estado,
      comentario: estado === 'NO_CONFORME' ? comentarioTemp : '',
      timestamp: new Date()
    };
    setItems(updatedItems);

    if (estado === 'NO_CONFORME') {
      setShowComentario(true);
    } else {
      setShowComentario(false);
      setComentarioTemp('');
      // Avanzar automáticamente si es CONFORME o NO_APLICA
      if (currentItemIndex < totalItems - 1) {
        setTimeout(() => {
          setCurrentItemIndex(currentItemIndex + 1);
        }, 300);
      } else {
        setCurrentStep('resumen');
      }
    }
  };

  const handleComentarioSubmit = () => {
    if (!comentarioTemp.trim()) {
      alert('Por favor describe el problema detectado');
      return;
    }

    // Verificar si es ítem crítico sin foto
    const itemActual = items[currentItemIndex];
    if (itemActual.esCritico && !itemActual.fotoUrl) {
      // Mostrar modal de confirmación
      setShowConfirmacionSinEvidencia(true);
      return;
    }

    // Si no es crítico o ya tiene foto, proceder normalmente
    procederSinEvidencia();
  };

  const procederSinEvidencia = () => {
    const updatedItems = [...items];
    updatedItems[currentItemIndex] = {
      ...updatedItems[currentItemIndex],
      comentario: comentarioTemp,
    };
    setItems(updatedItems);
    setShowComentario(false);
    setComentarioTemp('');
    setShowConfirmacionSinEvidencia(false);

    // Avanzar al siguiente ítem
    if (currentItemIndex < totalItems - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else {
      setCurrentStep('resumen');
    }
  };

  const handlePrevious = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
      setShowComentario(false);
      setComentarioTemp('');
    }
  };

  const handleCapturarFoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      setCapturandoFoto(true);
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const updatedItems = [...items];
          updatedItems[currentItemIndex] = {
            ...updatedItems[currentItemIndex],
            fotoUrl: base64String
          };
          setItems(updatedItems);
          setCapturandoFoto(false);
          alert('✅ Foto capturada y guardada');
        };
        reader.onerror = () => {
          setCapturandoFoto(false);
          alert('❌ Error al procesar la imagen');
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('[ChecklistVRAC] Error capturando foto:', error);
        setCapturandoFoto(false);
        alert('❌ Error al capturar la foto');
      }
    };

    input.click();
  };

  const handleCapturarFotoNovedad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      setCapturandoFotoNovedadModal(true);
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFotoNovedadTemp(reader.result as string);
          setCapturandoFotoNovedadModal(false);
          alert('✅ Foto capturada');
        };
        reader.onerror = () => {
          setCapturandoFotoNovedadModal(false);
          alert('❌ Error al procesar la imagen');
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('[ChecklistVRAC] Error capturando foto novedad:', error);
        setCapturandoFotoNovedadModal(false);
        alert('❌ Error al capturar la foto');
      }
    };

    input.click();
  };

  const handleAgregarNovedad = () => {
    if (!novedadTemp.trim()) {
      alert('Por favor describe la novedad encontrada');
      return;
    }

    setNovedades([...novedades, { descripcion: novedadTemp, fotoUrl: fotoNovedadTemp || undefined }]);
    setNovedadTemp('');
    setFotoNovedadTemp(null);
    setShowNovedadModal(false);
    alert(`✅ Novedad registrada\n\n"${novedadTemp}"\n\nPuedes continuar con el checklist.`);
  };

  const handleFinalizar = async () => {
    // Calcular resultado
    const itemsRechazados = items.filter(i => i.estado === 'NO_CONFORME' && i.esCritico).length;
    const itemsConformes = items.filter(i => i.estado === 'CONFORME').length;
    // Si hay novedades extras, también es NO_APTO
    const resultado = (itemsRechazados > 0 || novedades.length > 0) ? 'NO_APTO' : 'APTO';

    const checklistData: ChecklistRegistro = {
      id: `checklist_${Date.now()}`,
      sector: 'vrac',
      fecha: new Date(),
      unidad: {
        numero: unidad.numero,
        patente: unidad.patente
      },
      cisterna: {
        numero: cisterna.numero,
        patente: cisterna.patente
      },
      chofer: {
        nombre: chofer
      },
      odometroInicial: {
        valor: parseInt(odometro),
        fecha_hora: new Date()
      },
      items,
      resultado: resultado as 'APTO' | 'NO_APTO',
      itemsRechazados,
      itemsConformes,
      completado: true,
      timestamp: new Date(),
      timestampCompletado: new Date()
    };

    try {
      // Guardar en Firebase Firestore
      console.log('[ChecklistVRAC] Guardando checklist en Firebase...');
      await saveChecklist(checklistData);
      console.log('[ChecklistVRAC] Checklist guardado exitosamente');

      // Guardar novedades del botón flotante 🚨 (si existen)
      if (novedades.length > 0) {
        console.log('[ChecklistVRAC] Guardando novedades del botón flotante:', novedades.length);

        for (const novedadObj of novedades) {
          const novedadId = `novedad_flotante_vrac_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          const novedad: Novedad = {
            id: novedadId,
            checklistId: checklistData.id,
            itemId: '',
            fecha: new Date(),
            unidad: checklistData.unidad,
            descripcion: `VRAC ${unidad.numero} - NOVEDAD CRÍTICA: ${novedadObj.descripcion}`,
            comentarioChofer: novedadObj.descripcion,
            fotoUrl: novedadObj.fotoUrl,
            prioridad: 'ALTA',
            estado: 'PENDIENTE',
            timestamp: new Date()
          };

          const novedadData = {
            ...novedad,
            fecha: Timestamp.fromDate(novedad.fecha),
            timestamp: Timestamp.fromDate(novedad.timestamp),
            fotoUrl: novedadObj.fotoUrl || null,
            fotosEvidencia: [],
            ordenTrabajoId: null
          };

          const novedadRef = doc(db, 'novedades', novedadId);
          await setDoc(novedadRef, novedadData);
          console.log('[ChecklistVRAC] ✅ Novedad flotante guardada:', novedadId);
        }
      }

      // Notificar éxito
      alert('✅ Checklist guardado exitosamente en Firebase');

      onComplete(checklistData);
    } catch (error) {
      console.error('[ChecklistVRAC] Error guardando checklist:', error);
      alert('❌ Error al guardar checklist. Intenta nuevamente.');
    }
  };

  // Modal de Novedad Encontrada
  const NovedadModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="text-center mb-4">
          <div className="text-5xl mb-3">🚨</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Novedad Encontrada</h2>
          <p className="text-sm text-gray-600">
            Describe la novedad crítica que requiere atención inmediata
          </p>
        </div>

        <textarea
          value={novedadTemp}
          onChange={(e) => setNovedadTemp(e.target.value)}
          placeholder="Ejemplo: Pérdida de líquido en la cisterna, requiere revisión urgente"
          dir="ltr"
          className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:outline-none min-h-32"
          style={{
            borderColor: '#e5e7eb'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#f59e0b';
            e.currentTarget.style.boxShadow = '0 0 0 4px rgba(245, 158, 11, 0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.boxShadow = 'none';
          }}
          autoFocus
        />

        {/* Botón de captura de foto */}
        <button
          onClick={handleCapturarFotoNovedad}
          disabled={capturandoFotoNovedadModal}
          className="w-full mt-3 py-3 px-6 text-gray-700 text-sm font-bold rounded-xl border-2 border-gray-300 hover:bg-gray-100 active:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {capturandoFotoNovedadModal ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Procesando...</span>
            </>
          ) : fotoNovedadTemp ? (
            <>
              <span className="text-xl">✅</span>
              <span>Foto Guardada - Tomar Otra</span>
            </>
          ) : (
            <>
              <span className="text-xl">📸</span>
              <span>Agregar Foto (Opcional)</span>
            </>
          )}
        </button>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => {
              setShowNovedadModal(false);
              setNovedadTemp('');
              setFotoNovedadTemp(null);
            }}
            className="flex-1 py-4 px-6 text-gray-700 text-base font-bold rounded-xl border-2 border-gray-300 hover:bg-gray-100 active:bg-gray-200 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleAgregarNovedad}
            disabled={!novedadTemp.trim()}
            className="flex-1 py-4 px-6 text-white text-base font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
            }}
          >
            Registrar
          </button>
        </div>
      </div>
    </div>
  );

  // Botón flotante de Novedad (solo en paso items)
  const FloatingNovedadButton = () => (
    <button
      onClick={() => setShowNovedadModal(true)}
      className="fixed bottom-6 right-6 p-4 text-white text-sm font-bold rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 z-40"
      style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">🚨</span>
        <span>NOVEDAD</span>
      </div>
    </button>
  );

  // Render: Paso de Odómetro
  if (currentStep === 'odometro') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">📊</div>
              <h1 className="text-2xl font-bold text-gray-800">Checklist Diario</h1>
              <p className="text-sm text-gray-600 mt-1">VRAC - Air Liquide</p>
            </div>

            {/* Info de la unidad */}
            <div className="space-y-2 rounded-xl p-4 border-2" style={{
              backgroundColor: '#f0f9e8',
              borderColor: '#a8e063'
            }}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold" style={{ color: '#56ab2f' }}>🚛 UNIDAD INT:</span>
                <span className="text-sm font-bold text-gray-800">{unidad.numero} - {unidad.patente}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold" style={{ color: '#56ab2f' }}>🛢️ CISTERNA:</span>
                <span className="text-sm font-bold text-gray-800">{cisterna.numero} - {cisterna.patente}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold" style={{ color: '#56ab2f' }}>👤 CHOFER:</span>
                <span className="text-sm font-bold text-gray-800">{chofer}</span>
              </div>
            </div>
          </div>

          {/* Odómetro Input */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <label className="block text-base font-bold text-gray-800 mb-3">
              📏 Odómetro Inicial
            </label>
            <input
              type="number"
              value={odometro}
              onChange={(e) => setOdometro(e.target.value)}
              placeholder="Ingrese kilometraje actual"
              className="w-full px-4 py-4 text-2xl font-bold text-center border-2 rounded-xl focus:outline-none transition-all"
              style={{
                fontSize: '24px',
                borderColor: '#e5e7eb'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#a8e063';
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(168, 224, 99, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
              inputMode="numeric"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-2 text-center">
              Ejemplo: 486383
            </p>

            {/* Botones */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={onCancel}
                className="flex-1 py-4 px-6 text-gray-700 text-base font-bold rounded-xl border-2 border-gray-300 hover:bg-gray-100 active:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleOdometroSubmit}
                disabled={!odometro || parseInt(odometro) <= 0}
                className="flex-1 py-4 px-6 text-white text-base font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)'
                }}
              >
                Continuar →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render: Items del Checklist
  if (currentStep === 'items') {
    // Si está mostrando el modal de comentario
    if (showComentario) {
      // Modal de Confirmación Sin Evidencia
      const ConfirmacionSinEvidenciaModal = () => (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">📸</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">¿Continuar sin evidencia?</h2>
              <p className="text-sm text-gray-600">
                Este ítem es crítico y no has agregado evidencia fotográfica.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfirmacionSinEvidencia(false)}
                className="flex-1 py-4 px-6 text-gray-700 text-base font-bold rounded-xl border-2 border-gray-300 hover:bg-gray-100 active:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={procederSinEvidencia}
                className="flex-1 py-4 px-6 text-white text-base font-bold rounded-xl shadow-lg transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
                }}
              >
                Continuar sin foto
              </button>
            </div>
          </div>
        </div>
      );

      return (
        <>
          {showNovedadModal && <NovedadModal />}
          {showConfirmacionSinEvidencia && <ConfirmacionSinEvidenciaModal />}
          <FloatingNovedadButton />

          <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4">
            <div className="max-w-md mx-auto">
              {/* Progress bar */}
              <div className="mb-4">
                <div className="bg-white rounded-full h-3 overflow-hidden shadow-inner">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)'
                    }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1 text-center font-semibold">
                  Ítem {currentItemIndex + 1} de {totalItems}
                </p>
              </div>

              {/* Comentario Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="text-center mb-4">
                  <div className="text-5xl mb-3">⚠️</div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">Describe el Problema</h2>
                  <p className="text-sm text-gray-600">
                    {currentItem.descripcion}
                  </p>
                </div>

                <textarea
                  value={comentarioTemp}
                  onChange={(e) => setComentarioTemp(e.target.value)}
                  placeholder="Ejemplo: Neumático delantero derecho con baja presión"
                  className="w-full px-4 py-3 text-base border-2 rounded-xl focus:outline-none min-h-32"
                  style={{
                    borderColor: '#e5e7eb'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#f59e0b';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(245, 158, 11, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  autoFocus
                />

                {/* Botón de foto */}
                {currentItem.esCritico && (
                  <button
                    onClick={handleCapturarFoto}
                    disabled={capturandoFoto}
                    className="w-full mt-3 py-3 px-6 text-gray-700 text-sm font-bold rounded-xl border-2 border-gray-300 hover:bg-gray-100 active:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {capturandoFoto ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Procesando...</span>
                      </>
                    ) : currentItem.fotoUrl ? (
                      <>
                        <span className="text-xl">✅</span>
                        <span>Foto Guardada - Tomar Otra</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">📸</span>
                        <span>Agregar Evidencia Fotográfica</span>
                      </>
                    )}
                  </button>
                )}

                {/* Botones */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      setShowComentario(false);
                      setComentarioTemp('');
                      // Volver a estado conforme
                      const updatedItems = [...items];
                      updatedItems[currentItemIndex] = {
                        ...updatedItems[currentItemIndex],
                        estado: 'CONFORME',
                        comentario: ''
                      };
                      setItems(updatedItems);
                    }}
                    className="flex-1 py-4 px-6 text-gray-700 text-base font-bold rounded-xl border-2 border-gray-300 hover:bg-gray-100 active:bg-gray-200 transition-all"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleComentarioSubmit}
                    disabled={!comentarioTemp.trim()}
                    className="flex-1 py-4 px-6 text-white text-base font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
                    }}
                  >
                    Guardar →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }

    // Vista normal de ítems
    return (
      <>
        {showNovedadModal && <NovedadModal />}
        <FloatingNovedadButton />

        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4">
          <div className="max-w-md mx-auto">
            {/* Progress bar */}
            <div className="mb-4">
              <div className="bg-white rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)'
                  }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1 text-center font-semibold">
                Ítem {currentItemIndex + 1} de {totalItems}
              </p>
            </div>

            {/* Item Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3" style={{
                  backgroundColor: '#f0f9e8'
                }}>
                  <span className="text-3xl font-bold" style={{ color: '#56ab2f' }}>{currentItem.numero}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  {currentItem.descripcion}
                </h2>
                {currentItem.esCritico && (
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">
                    🚨 CRÍTICO
                  </div>
                )}
              </div>

              {/* Botones de Estado */}
              <div className="space-y-3">
                <button
                  onClick={() => handleEstadoChange('CONFORME')}
                  className={`w-full py-5 px-6 text-lg font-bold rounded-xl transition-all border-2 ${
                    currentItem.estado === 'CONFORME'
                      ? 'text-white border-green-500 shadow-lg scale-105'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-green-500 hover:bg-green-50 active:bg-green-100'
                  }`}
                  style={currentItem.estado === 'CONFORME' ? {
                    background: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)'
                  } : {}}
                >
                  ✅ CONFORME
                </button>

                <button
                  onClick={() => handleEstadoChange('NO_CONFORME')}
                  className={`w-full py-5 px-6 text-lg font-bold rounded-xl transition-all border-2 ${
                    currentItem.estado === 'NO_CONFORME'
                      ? 'bg-red-500 text-white border-red-500 shadow-lg scale-105'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-red-500 hover:bg-red-50 active:bg-red-100'
                  }`}
                >
                  ❌ NO CONFORME
                </button>

                {!currentItem.esCritico && (
                  <button
                    onClick={() => handleEstadoChange('NO_APLICA')}
                    className={`w-full py-5 px-6 text-lg font-bold rounded-xl transition-all border-2 ${
                      currentItem.estado === 'NO_APLICA'
                        ? 'bg-gray-500 text-white border-gray-500 shadow-lg scale-105'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                  >
                    ⚪ NO APLICA
                  </button>
                )}
              </div>
            </div>

            {/* Navegación */}
            <div className="flex gap-3">
              <button
                onClick={handlePrevious}
                disabled={currentItemIndex === 0}
                className="flex-1 py-4 px-6 text-gray-700 text-base font-bold rounded-xl border-2 border-gray-300 hover:bg-gray-100 active:bg-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <button
                onClick={() => {
                  if (currentItemIndex < totalItems - 1) {
                    setCurrentItemIndex(currentItemIndex + 1);
                  } else {
                    setCurrentStep('resumen');
                  }
                }}
                className="flex-1 py-4 px-6 text-white text-base font-bold rounded-xl shadow-lg transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)'
                }}
              >
                {currentItemIndex < totalItems - 1 ? 'Siguiente →' : 'Ver Resumen →'}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Render: Resumen Final
  if (currentStep === 'resumen') {
    const itemsConformes = items.filter(i => i.estado === 'CONFORME').length;
    const itemsNoConformes = items.filter(i => i.estado === 'NO_CONFORME').length;
    const itemsNoAplica = items.filter(i => i.estado === 'NO_APLICA').length;
    const itemsRechazadosCriticos = items.filter(i => i.estado === 'NO_CONFORME' && i.esCritico).length;
    const resultado = (itemsRechazadosCriticos > 0 || novedades.length > 0) ? 'NO_APTO' : 'APTO';

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 pb-20">
        <div className="max-w-2xl mx-auto">
          {/* Header tipo Manual de Mantenimiento */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
            <div className="flex items-center gap-4 mb-4">
              {/* Imagen de camión */}
              <div className="w-24 h-24 rounded-full flex items-center justify-center text-6xl" style={{
                backgroundColor: '#f0f9e8'
              }}>
                🚛
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-800">Manual de Mantenimiento</h1>
                <p className="text-sm text-gray-600 mt-1">Checklist Diario Preventivo - VRAC</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Info detallada */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 border-2" style={{
                backgroundColor: '#f0f9e8',
                borderColor: '#a8e063'
              }}>
                <p className="text-xs font-bold" style={{ color: '#56ab2f' }}>UNIDAD INT</p>
                <p className="text-lg font-bold text-gray-800">{unidad.numero}</p>
                <p className="text-xs text-gray-600">{unidad.patente}</p>
              </div>
              <div className="rounded-xl p-3 border-2" style={{
                backgroundColor: '#f0f9e8',
                borderColor: '#a8e063'
              }}>
                <p className="text-xs font-bold" style={{ color: '#56ab2f' }}>CISTERNA</p>
                <p className="text-lg font-bold text-gray-800">{cisterna.numero}</p>
                <p className="text-xs text-gray-600">{cisterna.patente}</p>
              </div>
              <div className="rounded-xl p-3 border-2" style={{
                backgroundColor: '#f0f9e8',
                borderColor: '#a8e063'
              }}>
                <p className="text-xs font-bold" style={{ color: '#56ab2f' }}>CHOFER</p>
                <p className="text-sm font-bold text-gray-800">{chofer}</p>
              </div>
              <div className="rounded-xl p-3 border-2" style={{
                backgroundColor: '#f0f9e8',
                borderColor: '#a8e063'
              }}>
                <p className="text-xs font-bold" style={{ color: '#56ab2f' }}>ODÓMETRO</p>
                <p className="text-lg font-bold text-gray-800">{parseInt(odometro).toLocaleString()} km</p>
              </div>
            </div>
          </div>

          {/* Resultado Card */}
          <div className={`rounded-2xl shadow-lg p-6 mb-4 ${
            resultado === 'APTO'
              ? 'bg-gradient-to-r from-green-500 to-green-600'
              : 'bg-gradient-to-r from-red-500 to-red-600'
          }`}>
            <div className="text-center text-white">
              <div className="text-6xl mb-3">
                {resultado === 'APTO' ? '✅' : '❌'}
              </div>
              <h1 className="text-3xl font-bold mb-2">
                {resultado === 'APTO' ? 'APTO PARA TRANSITAR' : 'NO APTO'}
              </h1>
              <p className="text-lg opacity-90">
                {resultado === 'APTO'
                  ? 'Todas las verificaciones críticas OK'
                  : `${itemsRechazadosCriticos + novedades.length} problema${itemsRechazadosCriticos + novedades.length > 1 ? 's' : ''} crítico${itemsRechazadosCriticos + novedades.length > 1 ? 's' : ''} detectado${itemsRechazadosCriticos + novedades.length > 1 ? 's' : ''}`
                }
              </p>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>📊</span>
              <span>Resumen de Inspección</span>
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 rounded-xl" style={{
                backgroundColor: '#f0f9e8'
              }}>
                <span className="text-sm font-bold text-gray-700">✅ Conformes:</span>
                <span className="text-2xl font-bold" style={{ color: '#56ab2f' }}>{itemsConformes}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl">
                <span className="text-sm font-bold text-gray-700">❌ No Conformes:</span>
                <span className="text-2xl font-bold text-red-600">{itemsNoConformes}</span>
              </div>
              {itemsNoAplica > 0 && (
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                  <span className="text-sm font-bold text-gray-700">⚪ No Aplica:</span>
                  <span className="text-2xl font-bold text-gray-600">{itemsNoAplica}</span>
                </div>
              )}
              {novedades.length > 0 && (
                <div className="flex justify-between items-center p-4 bg-orange-50 rounded-xl">
                  <span className="text-sm font-bold text-gray-700">🚨 Novedades Críticas:</span>
                  <span className="text-2xl font-bold text-orange-600">{novedades.length}</span>
                </div>
              )}
            </div>
          </div>

          {/* Lista de problemas */}
          {(itemsNoConformes > 0 || novedades.length > 0) && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
              <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>⚠️</span>
                <span>Problemas Detectados</span>
              </h4>
              <div className="space-y-3">
                {items
                  .filter(i => i.estado === 'NO_CONFORME')
                  .map((item, idx) => (
                    <div key={idx} className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">❌</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-red-800">{item.descripcion}</p>
                          {item.comentario && (
                            <p className="text-xs text-red-700 mt-1">{item.comentario}</p>
                          )}
                          {item.esCritico && (
                            <span className="inline-block mt-2 px-2 py-1 bg-red-200 text-red-800 rounded text-xs font-bold">
                              CRÍTICO
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                {novedades.map((novedad, idx) => (
                  <div key={`nov-${idx}`} className="p-4 bg-orange-50 border-l-4 border-orange-500 rounded">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🚨</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-orange-800">Novedad Crítica Encontrada</p>
                        <p className="text-xs text-orange-700 mt-1">{novedad.descripcion}</p>
                        {novedad.fotoUrl && (
                          <p className="text-xs text-green-600 mt-1">📸 Con foto adjunta</p>
                        )}
                        <span className="inline-block mt-2 px-2 py-1 bg-orange-200 text-orange-800 rounded text-xs font-bold">
                          ATENCIÓN INMEDIATA
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nota informativa */}
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-4 mb-4">
            <p className="text-sm text-blue-800">
              ℹ️ <strong>Información:</strong> Este checklist se guardará en Firebase Firestore y se generarán automáticamente las órdenes de trabajo necesarias para los problemas detectados.
            </p>
          </div>

          {/* Botones Finales */}
          <div className="space-y-3">
            <button
              onClick={handleFinalizar}
              className="w-full py-5 px-6 text-white text-lg font-bold rounded-xl shadow-lg transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)'
              }}
            >
              Finalizar y Guardar Checklist
            </button>
            <button
              onClick={() => {
                setCurrentStep('items');
                // NO resetear currentItemIndex, mantener el último ítem visitado
              }}
              className="w-full py-4 px-6 text-gray-700 text-base font-bold rounded-xl border-2 border-gray-300 hover:bg-gray-100 active:bg-gray-200 transition-all"
            >
              ← Revisar Ítems
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
