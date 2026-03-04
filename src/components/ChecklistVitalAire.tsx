import { useState, useEffect } from 'react';
import {
  type EstadoItem,
  type ChecklistRegistro,
  type ItemChecklist,
  type Novedad,
  CategoriaItem
} from '../types/checklist';
import { saveChecklist } from '../services/checklistService';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { showSuccess, showError, showWarning, showInfo } from '../utils/toast';
import { useGPSTracking } from '../hooks/useGPSTracking';
import { BienvenidaViajeModal } from './BienvenidaViajeModal';
import { compressAndUploadImage } from '../utils/compressAndUploadImage';

// ============================================================================
// ITEMS ESPECÍFICOS DE VITAL AIRE (17 items)
// ============================================================================
const ITEMS_VITAL_AIRE: Omit<ItemChecklist, 'estado' | 'timestamp'>[] = [
  // SEGURIDAD PERSONAL
  {
    id: 'va_item_01',
    numero: 1,
    categoria: CategoriaItem.SEGURIDAD_PERSONAL,
    descripcion: 'Elementos de protección personal (EPP): Guantes, Casco, Botines de Seguridad, Ropa Ignifuga',
    esCritico: true,
    fotoRequerida: false,
  },
  // DOCUMENTACIÓN
  {
    id: 'va_item_02',
    numero: 2,
    categoria: CategoriaItem.DOCUMENTACION,
    descripcion: 'El chofer declara tener la sig. documentación: (DNI, LICENCIA NACIONAL, VTV, SEGURO AUTOMOTOR, CEDULA AUTOMOTOR)',
    esCritico: true,
    fotoRequerida: false,
  },
  // CHEQUEO DE UNIDAD (REQUISITOS_OBLIGATORIOS)
  {
    id: 'va_item_03',
    numero: 3,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'CHEQUEO DE LA UNIDAD [Control de (Aceite, Refrigerante, Hidráulico, Frenos)]',
    esCritico: true,
    fotoRequerida: false,
  },
  {
    id: 'va_item_04',
    numero: 4,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'CHEQUEO DE LA UNIDAD [Estado de LUCES (Verificar funcionamiento e intensidad adecuada / Alta, baja, reglamentaria, STOP y direccional)]',
    esCritico: true,
    fotoRequerida: false,
  },
  {
    id: 'va_item_05',
    numero: 5,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'CHEQUEO DE LA UNIDAD [Estado EXTERIOR (Estado general chapa, pintura y limpieza)]',
    esCritico: false,
    fotoRequerida: false,
  },
  {
    id: 'va_item_06',
    numero: 6,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'CHEQUEO DE LA UNIDAD [Plataforma hidráulica]',
    esCritico: true,
    fotoRequerida: false,
  },
  {
    id: 'va_item_07',
    numero: 7,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'CHEQUEO DE LA UNIDAD [Estado de MATAFUEGOS, Compartimiento GOX, LOX y habitaculo]',
    esCritico: true,
    fotoRequerida: false,
  },
  {
    id: 'va_item_08',
    numero: 8,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'CHEQUEO DE LA UNIDAD [Cuñas Plásticas, Cintas de sujeción]',
    esCritico: false,
    fotoRequerida: false,
  },
  {
    id: 'va_item_09',
    numero: 9,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'CHEQUEO DE LA UNIDAD [Estado de la cabina INTERIOR (Limpieza, No hay objetos pesados sueltos)]',
    esCritico: false,
    fotoRequerida: false,
  },
  {
    id: 'va_item_10',
    numero: 10,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'CHEQUEO DE LA UNIDAD [Estado de la cabina GOX (Limpieza, No hay Objetos sueltos)]',
    esCritico: true,
    fotoRequerida: false,
  },
  {
    id: 'va_item_11',
    numero: 11,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'CHEQUEO DE LA UNIDAD [Estado de la cabina LOX (Limpieza, No hay objetos sueltos)]',
    esCritico: true,
    fotoRequerida: false,
  },
  {
    id: 'va_item_12',
    numero: 12,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'CHEQUEO DE LA UNIDAD [ESTADO DE NEUMÁTICOS DELANTEROS, TRASEROS, AUXILIO y VERIFICACION DE CHECKPOINTS]',
    esCritico: true,
    fotoRequerida: false,
  },
  {
    id: 'va_item_13',
    numero: 13,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'CHEQUEO DE LA UNIDAD [Estado PARABRISAS (Sin marcas ni fisuras y funcionamiento del limpia parabrisas y sapito)]',
    esCritico: true,
    fotoRequerida: false,
  },
  {
    id: 'va_item_14',
    numero: 14,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'CHEQUEO DE LA UNIDAD [Estado de ESPEJOS, estándar y puntos ciegos]',
    esCritico: true,
    fotoRequerida: false,
  },
  {
    id: 'va_item_15',
    numero: 15,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'CHEQUEO DE LA UNIDAD [Alarma de retroceso (Verificar funcionamiento), Bocina]',
    esCritico: true,
    fotoRequerida: false,
  },
  {
    id: 'va_item_16',
    numero: 16,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'CHEQUEO DE LA UNIDAD [Funcionamiento de Velocimetro, Tacografo]',
    esCritico: true,
    fotoRequerida: false,
  },
  {
    id: 'va_item_17',
    numero: 17,
    categoria: CategoriaItem.REQUISITOS_OBLIGATORIOS,
    descripcion: 'CHEQUEO DE LA UNIDAD [Funcionamiento de los FRENOS DE SERVICIO Y DE MANO (Verificado por conductor)]',
    esCritico: true,
    fotoRequerida: false,
  },
];

// ============================================================================
// CHOFERES DE VITAL AIRE (21 choferes)
// ============================================================================
export const CHOFERES_VITAL_AIRE = [
  'ACUÑA, FRANCISCO',
  'ANTUNEZ, MARCOS',
  'BERGOLO, JUAN',
  'CAMARGO, MARIO',
  'GOMEZ, OSCAR',
  'GONZALEZ, DARIO',
  'GONZALEZ, MARIANO',
  'GRAMAJO, EZEQUIEL',
  'MANCUSO, CESAR',
  'MORALES, JONATHAN',
  'MURAS, JUAN MANUEL',
  'NAVARRO, DANIEL',
  'ORTIZ, GERARDO',
  'PAEZ, ALBERTO',
  'PRINGLES, MATIAS',
  'QUESADA, RUBEN',
  'REYES, HERNAN',
  'RIQUELME, GASTON',
  'ROMERO, MARTIN',
  'SALVATIERRA, DARIO',
  'ZAPATA, LUIS',
];

// ============================================================================
// UNIDADES DE VITAL AIRE (8 unidades)
// ============================================================================
export const UNIDADES_VITAL_AIRE = [
  { numero: '52', patente: 'AA279FE' },
  { numero: '811', patente: 'AG705RB' },
  { numero: '55', patente: 'MYN849' },
  { numero: '808', patente: 'AF313QP' },
  { numero: '801', patente: 'AE052TW' },
  { numero: '53', patente: 'AC823TK' },
  { numero: '56', patente: 'AC823XZ' },
  { numero: '59', patente: 'KSZ061' },
];

interface ChecklistVitalAireProps {
  unidad: {
    numero: string;
    patente: string;
  };
  onComplete: (checklist: ChecklistRegistro) => void;
  onCancel: () => void;
}

export function ChecklistVitalAire({ unidad, onComplete, onCancel }: ChecklistVitalAireProps) {
  // Pasos del checklist: selección chofer → odómetro → items → resumen
  const [currentStep, setCurrentStep] = useState<'seleccion-chofer' | 'odometro' | 'items' | 'resumen'>('seleccion-chofer');

  // Estado para chofer seleccionado
  const [choferSeleccionado, setChoferSeleccionado] = useState<string>('');

  // Filtro de búsqueda
  const [filtroChofer, setFiltroChofer] = useState('');

  const [odometro, setOdometro] = useState('');
  const [ultimoOdometro, setUltimoOdometro] = useState<number | null>(null);
  const [items, setItems] = useState<ItemChecklist[]>(
    ITEMS_VITAL_AIRE.map(item => ({
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
  const [capturandoFoto, setCapturandoFoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Protección contra doble-click

  // GPS Tracking
  const gpsTracking = useGPSTracking();
  const [gpsHabilitadoConfig, setGpsHabilitadoConfig] = useState(false);
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false);
  const [checklistGuardado, setChecklistGuardado] = useState<ChecklistRegistro | null>(null);

  // Cargar configuración de GPS al montar
  useEffect(() => {
    const cargarConfigGPS = async () => {
      try {
        const configDoc = await getDoc(doc(db, 'configuracion', 'gps_tracking'));
        if (configDoc.exists()) {
          setGpsHabilitadoConfig(configDoc.data().habilitado || false);
        }
      } catch (error) {
        console.error('[ChecklistVitalAire] Error cargando config GPS:', error);
      }
    };
    cargarConfigGPS();
  }, []);

  // Pre-cargar último odómetro al entrar al paso
  useEffect(() => {
    if (currentStep !== 'odometro' || !unidad.numero) return;
    const cargarUltimoOdometro = async () => {
      try {
        const ubicDoc = await getDoc(doc(db, 'ubicaciones', `INT-${unidad.numero}`));
        if (!ubicDoc.exists()) return;
        const valor = ubicDoc.data()?.ultimoOdometro;
        if (valor && !odometro) {
          setUltimoOdometro(Math.round(valor));
          setOdometro(String(Math.round(valor)));
        }
      } catch (e) {
        console.warn('[ChecklistVitalAire] No se pudo cargar último odómetro:', e);
      }
    };
    cargarUltimoOdometro();
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtrar choferes según búsqueda
  const choferesFiltrados = CHOFERES_VITAL_AIRE.filter(c =>
    c.toLowerCase().includes(filtroChofer.toLowerCase())
  );

  // Chofer seleccionado
  const chofer = choferSeleccionado;

  const currentItem = items[currentItemIndex];
  const totalItems = items.length;
  const progress = ((currentItemIndex + 1) / totalItems) * 100;

  // Handlers
  const handleOdometroSubmit = () => {
    if (!odometro || parseInt(odometro) <= 0) {
      showWarning('Por favor ingresa un odómetro válido');
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
      showWarning('Por favor describe el problema detectado');
      return;
    }

    // Verificar si es ítem crítico sin foto
    const itemActual = items[currentItemIndex];
    if (itemActual.esCritico && !itemActual.fotoUrl) {
      showWarning('Ítem crítico sin evidencia fotográfica. Se registrará sin foto.');
    }

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
        const path = `fotos/checklists/vitalaire_${Date.now()}_item${currentItemIndex}.jpg`;
        const url = await compressAndUploadImage(file, path);
        const updatedItems = [...items];
        updatedItems[currentItemIndex] = {
          ...updatedItems[currentItemIndex],
          fotoUrl: url
        };
        setItems(updatedItems);
        setCapturandoFoto(false);
        showSuccess('Foto capturada y guardada');
      } catch (error) {
        console.error('[ChecklistVitalAire] Error capturando foto:', error);
        setCapturandoFoto(false);
        showError('Error al capturar la foto');
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
        const path = `fotos/checklists/vitalaire_novedad_${Date.now()}.jpg`;
        const url = await compressAndUploadImage(file, path);
        setFotoNovedadTemp(url);
        setCapturandoFotoNovedadModal(false);
        showSuccess('Foto capturada');
      } catch (error) {
        console.error('[ChecklistVitalAire] Error capturando foto novedad:', error);
        setCapturandoFotoNovedadModal(false);
        showError('Error al capturar la foto');
      }
    };

    input.click();
  };

  const handleAgregarNovedad = () => {
    if (!novedadTemp.trim()) {
      showWarning('Por favor describe la novedad encontrada');
      return;
    }

    setNovedades([...novedades, { descripcion: novedadTemp, fotoUrl: fotoNovedadTemp || undefined }]);
    setNovedadTemp('');
    setFotoNovedadTemp(null);
    setShowNovedadModal(false);
    showSuccess(`Novedad registrada: "${novedadTemp}". Puedes continuar con el checklist.`);
  };

  const handleFinalizar = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Calcular resultado
    const itemsRechazados = items.filter(i => i.estado === 'NO_CONFORME' && i.esCritico).length;
    const itemsConformes = items.filter(i => i.estado === 'CONFORME').length;
    // Solo items críticos NO_CONFORME determinan el resultado. Las novedades del botón son informativas.
    const resultado = itemsRechazados > 0 ? 'NO_APTO' : 'APTO';

    const checklistData: ChecklistRegistro = {
      id: `checklist_${Date.now()}`,
      sector: 'vital-aire',
      fecha: new Date(),
      unidad: {
        numero: unidad.numero,
        patente: unidad.patente
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
      console.log('[ChecklistVitalAire] Guardando checklist en Firebase...');
      await saveChecklist(checklistData);
      console.log('[ChecklistVitalAire] Checklist guardado exitosamente');

      // Guardar novedades del botón flotante 🚨 (si existen)
      if (novedades.length > 0) {
        console.log('[ChecklistVitalAire] Guardando novedades del botón flotante:', novedades.length);

        for (const novedadObj of novedades) {
          const novedadId = `novedad_flotante_vital_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          const novedad: Novedad = {
            id: novedadId,
            checklistId: checklistData.id,
            itemId: '',
            fecha: new Date(),
            unidad: checklistData.unidad,
            descripcion: `VITAL-AIRE ${unidad.numero} - NOVEDAD CRÍTICA: ${novedadObj.descripcion}`,
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
          console.log('[ChecklistVitalAire] ✅ Novedad flotante guardada:', novedadId);
        }
      }

      // Notificar éxito
      showSuccess('Checklist guardado exitosamente');

      onComplete(checklistData);
    } catch (error) {
      console.error('[ChecklistVitalAire] Error guardando checklist:', error);
      showError('Error al guardar checklist. Intenta nuevamente.');
      setIsSubmitting(false);
    }
  };


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

  // ============================================================================
  // Render: Paso 1 - Selección de Chofer (Autocomplete)
  // ============================================================================
  if (currentStep === 'seleccion-chofer') {
    const mostrarSugerenciasChofer = filtroChofer.length > 0 && choferesFiltrados.length > 0;

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
            {/* Unidad (viene del carrusel) */}
            <div className="rounded-xl p-3 border-2 mb-4" style={{ backgroundColor: '#fff7ed', borderColor: '#f59e0b' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold" style={{ color: '#f97316' }}>UNIDAD</p>
                  <p className="text-base font-bold text-gray-800">INT-{unidad.numero} • {unidad.patente}</p>
                </div>
                <span className="text-2xl">🚐</span>
              </div>
            </div>

            <div className="text-center mb-4">
              <div className="text-5xl mb-3">👤</div>
              <h1 className="text-2xl font-bold text-gray-800">Selecciona el Chofer</h1>
              <p className="text-sm text-gray-600 mt-1">Ingresa el nombre del chofer</p>
            </div>

            {/* Campo de búsqueda con dropdown */}
            <div className="relative">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">👤</span>
                <input
                  type="text"
                  value={filtroChofer}
                  onChange={(e) => setFiltroChofer(e.target.value)}
                  placeholder="Ej: GOMEZ, NAVARRO..."
                  className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition-colors"
                  autoFocus
                />
                {filtroChofer && (
                  <button
                    onClick={() => setFiltroChofer('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Dropdown de sugerencias */}
              {mostrarSugerenciasChofer && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border-2 border-orange-200 z-50 max-h-60 overflow-y-auto">
                  {choferesFiltrados.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setChoferSeleccionado(c);
                        setCurrentStep('odometro');
                        setFiltroChofer('');
                      }}
                      className="w-full p-4 text-left hover:bg-orange-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-center justify-between"
                    >
                      <p className="text-base font-bold text-gray-800">{c}</p>
                      <span className="text-2xl">→</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Sin resultados */}
              {filtroChofer.length > 0 && choferesFiltrados.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border-2 border-gray-200 z-50 p-4 text-center">
                  <p className="text-gray-500 text-sm">No se encontró el chofer "{filtroChofer}"</p>
                </div>
              )}
            </div>

            {/* Hint */}
            <p className="text-xs text-gray-400 mt-3 text-center">
              Escribe para buscar entre los 21 choferes de Vital Aire
            </p>
          </div>

          {/* Botón cancelar */}
          <button
            onClick={onCancel}
            className="w-full py-4 px-6 text-gray-700 text-base font-bold rounded-xl border-2 border-gray-300 hover:bg-gray-100 active:bg-gray-200 transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render: Paso 2 - Odómetro
  // ============================================================================
  if (currentStep === 'odometro') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">📊</div>
              <h1 className="text-2xl font-bold text-gray-800">Checklist Vital Aire</h1>
              <p className="text-sm text-gray-600 mt-1">Paso 3: Ingresa el odómetro</p>
            </div>

            {/* Barra de progreso */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full w-3/4 rounded-full" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)' }} />
              </div>
              <span className="text-xs text-gray-500 font-semibold">3/4</span>
            </div>

            {/* Info de la unidad y chofer */}
            <div className="space-y-2 rounded-xl p-4 border-2" style={{
              backgroundColor: '#fff7ed',
              borderColor: '#f59e0b'
            }}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold" style={{ color: '#f97316' }}>🚐 UNIDAD:</span>
                <span className="text-sm font-bold text-gray-800">INT-{unidad.numero} • {unidad.patente}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold" style={{ color: '#f97316' }}>👤 CHOFER:</span>
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
                e.currentTarget.style.borderColor = '#f59e0b';
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(245, 158, 11, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
              inputMode="numeric"
              autoFocus
            />
            {ultimoOdometro !== null ? (
              <p className="text-xs text-green-600 mt-2 text-center font-medium">
                ↑ Último viaje registrado: {ultimoOdometro.toLocaleString('es-AR')} km · Editable
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Ejemplo: 125450
              </p>
            )}

            {/* Botones */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCurrentStep('seleccion-chofer')}
                className="flex-1 py-4 px-6 text-gray-700 text-base font-bold rounded-xl border-2 border-gray-300 hover:bg-gray-100 active:bg-gray-200 transition-all"
              >
                ← Volver
              </button>
              <button
                onClick={handleOdometroSubmit}
                disabled={!odometro || parseInt(odometro) <= 0}
                className="flex-1 py-4 px-6 text-white text-base font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
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
      return (
        <>
          {/* Modal de Novedad Encontrada */}
          {showNovedadModal && (
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="text-center mb-4">
                  <div className="text-5xl mb-3">🚨</div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">Novedad Encontrada</h2>
                  <p className="text-sm text-gray-600">
                    Buen trabajo <span className="font-bold text-gray-800">{chofer}</span> has encontrado una Novedad del{' '}
                    <span className="font-bold text-orange-600">INT-{unidad.numero} • {unidad.patente}</span>{' '}
                    que requiere ser informada
                  </p>
                </div>

                <textarea
                  value={novedadTemp}
                  onChange={(e) => setNovedadTemp(e.target.value)}
                  placeholder="Ejemplo: Fuga de aceite en motor, requiere revisión urgente"
                  className="w-full px-4 py-3 text-base border-2 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 min-h-32 resize-none"
                  style={{ borderColor: '#e5e7eb' }}
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
          )}
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
                      background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
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
                  dir="ltr"
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
        {/* Modal de Novedad Encontrada */}
          {showNovedadModal && (
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="text-center mb-4">
                  <div className="text-5xl mb-3">🚨</div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">Novedad Encontrada</h2>
                  <p className="text-sm text-gray-600">
                    Buen trabajo <span className="font-bold text-gray-800">{chofer}</span> has encontrado una Novedad del{' '}
                    <span className="font-bold text-orange-600">INT-{unidad.numero} • {unidad.patente}</span>{' '}
                    que requiere ser informada
                  </p>
                </div>

                <textarea
                  value={novedadTemp}
                  onChange={(e) => setNovedadTemp(e.target.value)}
                  placeholder="Ejemplo: Fuga de aceite en motor, requiere revisión urgente"
                  className="w-full px-4 py-3 text-base border-2 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 min-h-32 resize-none"
                  style={{ borderColor: '#e5e7eb' }}
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
          )}
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
                    background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
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
                  backgroundColor: '#fff7ed'
                }}>
                  <span className="text-3xl font-bold" style={{ color: '#f97316' }}>{currentItem.numero}</span>
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
                  background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
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
    // Solo items críticos NO_CONFORME determinan el resultado. Las novedades del botón son informativas.
    const resultado = itemsRechazadosCriticos > 0 ? 'NO_APTO' : 'APTO';

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 pb-20">
        <div className="max-w-2xl mx-auto">
          {/* Header tipo Manual de Mantenimiento */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
            <div className="flex items-center gap-4 mb-4">
              {/* Imagen de camioneta */}
              <div className="w-24 h-24 rounded-full flex items-center justify-center text-6xl" style={{
                backgroundColor: '#fff7ed'
              }}>
                🚐
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-800">Manual de Mantenimiento</h1>
                <p className="text-sm text-gray-600 mt-1">Checklist Diario Preventivo - VITAL AIRE</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Info detallada */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 border-2" style={{
                backgroundColor: '#fff7ed',
                borderColor: '#f59e0b'
              }}>
                <p className="text-xs font-bold" style={{ color: '#f97316' }}>UNIDAD</p>
                <p className="text-lg font-bold text-gray-800">{unidad.numero}</p>
                <p className="text-xs text-gray-600">{unidad.patente}</p>
              </div>
              <div className="rounded-xl p-3 border-2" style={{
                backgroundColor: '#fff7ed',
                borderColor: '#f59e0b'
              }}>
                <p className="text-xs font-bold" style={{ color: '#f97316' }}>CHOFER</p>
                <p className="text-sm font-bold text-gray-800">{chofer}</p>
              </div>
              <div className="rounded-xl p-3 border-2 col-span-2" style={{
                backgroundColor: '#fff7ed',
                borderColor: '#f59e0b'
              }}>
                <p className="text-xs font-bold" style={{ color: '#f97316' }}>ODÓMETRO</p>
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
                  : `${itemsRechazadosCriticos} problema${itemsRechazadosCriticos > 1 ? 's' : ''} crítico${itemsRechazadosCriticos > 1 ? 's' : ''} detectado${itemsRechazadosCriticos > 1 ? 's' : ''}`
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
                backgroundColor: '#fff7ed'
              }}>
                <span className="text-sm font-bold text-gray-700">✅ Conformes:</span>
                <span className="text-2xl font-bold" style={{ color: '#f97316' }}>{itemsConformes}</span>
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
                  <span className="text-sm font-bold text-gray-700">📋 Novedades (informativas):</span>
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
                        <p className="text-sm font-bold text-orange-800">Novedad Informativa</p>
                        <p className="text-xs text-orange-700 mt-1">{novedad.descripcion}</p>
                        {novedad.fotoUrl && (
                          <p className="text-xs text-green-600 mt-1">📸 Con foto adjunta</p>
                        )}
                        <span className="inline-block mt-2 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                          INFORMATIVA
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
              disabled={isSubmitting}
              className={`w-full py-5 px-6 text-white text-lg font-bold rounded-xl shadow-lg transition-all ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'}`}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
              }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Guardando...
                </span>
              ) : 'Finalizar y Guardar Checklist'}
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
