/**
 * CHECKLIST TREN RODANTE 40K - INSPECCIÓN LIGERA
 * Basado en NG-PR-TRN-021-CK-005 Air Liquide
 * Secciones: Enganche, Varios, Frenos, Suspensión, Neumáticos
 */

import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import type { ResultadoInspeccion, RegistroInspeccionLigera } from '../../types/trenRodante';
import { showSuccess, showError } from '../../utils/toast';
import { TODAS_LAS_UNIDADES } from '../CarouselSector';

interface ChecklistTrenRodante40KProps {
  unidadNumero?: string;
  onComplete: () => void;
  onBack: () => void;
}

type Paso = 'datos' | 'enganche' | 'varios' | 'frenos' | 'suspension' | 'neumaticos' | 'resumen';

const PASOS: Paso[] = ['datos', 'enganche', 'varios', 'frenos', 'suspension', 'neumaticos', 'resumen'];

const OPCIONES_ESTADO: { value: ResultadoInspeccion; label: string; color: string }[] = [
  { value: 'BUENO', label: 'Bueno', color: 'bg-green-500' },
  { value: 'REGULAR', label: 'Regular', color: 'bg-amber-500' },
  { value: 'MALO', label: 'Malo', color: 'bg-red-500' },
  { value: 'N/A', label: 'N/A', color: 'bg-gray-400' },
];

const ChecklistTrenRodante40K: React.FC<ChecklistTrenRodante40KProps> = ({
  unidadNumero: unidadNumeroInicial,
  onComplete,
  onBack,
}) => {
  const [pasoActual, setPasoActual] = useState<Paso>('datos');
  const [loading, setLoading] = useState(false);

  // Datos generales
  const [unidadNumero, setUnidadNumero] = useState(unidadNumeroInicial || '');
  const [unidadPatente, setUnidadPatente] = useState('');
  const [kilometraje, setKilometraje] = useState('');
  const [inspector, setInspector] = useState('');

  // Sistema de enganche
  const [enganche, setEnganche] = useState({
    medidaPernoA: '',
    medidaPernoE: '',
    estadoGeneral: 'BUENO' as ResultadoInspeccion,
    observaciones: '',
  });

  // Varios
  const [varios, setVarios] = useState({
    ruedaAuxilio: 'BUENO' as ResultadoInspeccion,
    paragolpes: 'BUENO' as ResultadoInspeccion,
    guardabarros: 'BUENO' as ResultadoInspeccion,
    luces: 'BUENO' as ResultadoInspeccion,
    observaciones: '',
  });

  // Frenos
  const [frenos, setFrenos] = useState({
    inspeccionVisual: 'BUENO' as ResultadoInspeccion,
    espesorCinta: '',
    observaciones: '',
  });

  // Suspensión
  const [suspension, setSuspension] = useState({
    fugasNeumatica: false,
    estadoElasticos: 'BUENO' as ResultadoInspeccion,
    observaciones: '',
  });

  // Neumáticos (6 posiciones)
  const [neumaticos, setNeumaticos] = useState<{
    posicion: string;
    marca: string;
    medida: string;
    profundidadDibujo: string;
    presion: string;
    estado: ResultadoInspeccion;
  }[]>([
    { posicion: 'Eje 1 - Izquierdo', marca: '', medida: '', profundidadDibujo: '', presion: '', estado: 'BUENO' },
    { posicion: 'Eje 1 - Derecho', marca: '', medida: '', profundidadDibujo: '', presion: '', estado: 'BUENO' },
    { posicion: 'Eje 2 - Izquierdo', marca: '', medida: '', profundidadDibujo: '', presion: '', estado: 'BUENO' },
    { posicion: 'Eje 2 - Derecho', marca: '', medida: '', profundidadDibujo: '', presion: '', estado: 'BUENO' },
    { posicion: 'Eje 3 - Izquierdo', marca: '', medida: '', profundidadDibujo: '', presion: '', estado: 'BUENO' },
    { posicion: 'Eje 3 - Derecho', marca: '', medida: '', profundidadDibujo: '', presion: '', estado: 'BUENO' },
  ]);

  const [observacionesGenerales, setObservacionesGenerales] = useState('');
  const [fotosEvidencia, setFotosEvidencia] = useState<File[]>([]);

  // Búsqueda de unidad
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const unidadesFiltradas = TODAS_LAS_UNIDADES.filter(u =>
    u.numero.toLowerCase().includes(unidadNumero.toLowerCase()) ||
    u.patente.toLowerCase().includes(unidadNumero.toLowerCase())
  ).slice(0, 6);

  const seleccionarUnidad = (unidad: typeof TODAS_LAS_UNIDADES[0]) => {
    setUnidadNumero(unidad.numero);
    setUnidadPatente(unidad.patente);
    setMostrarSugerencias(false);
  };

  const indicePasoActual = PASOS.indexOf(pasoActual);
  const progreso = ((indicePasoActual + 1) / PASOS.length) * 100;

  const irSiguiente = () => {
    const siguienteIndice = indicePasoActual + 1;
    if (siguienteIndice < PASOS.length) {
      setPasoActual(PASOS[siguienteIndice]);
    }
  };

  const irAnterior = () => {
    const anteriorIndice = indicePasoActual - 1;
    if (anteriorIndice >= 0) {
      setPasoActual(PASOS[anteriorIndice]);
    }
  };

  const calcularResultado = (): 'APTO' | 'NO_APTO' => {
    const todosEstados = [
      enganche.estadoGeneral,
      varios.ruedaAuxilio,
      varios.paragolpes,
      varios.guardabarros,
      varios.luces,
      frenos.inspeccionVisual,
      suspension.estadoElasticos,
      ...neumaticos.map(n => n.estado),
    ];

    const hayMalos = todosEstados.some(e => e === 'MALO');
    const hayFugas = suspension.fugasNeumatica;

    return hayMalos || hayFugas ? 'NO_APTO' : 'APTO';
  };

  const guardarChecklist = async () => {
    setLoading(true);

    try {
      // Subir fotos de evidencia
      const urlsFotos: string[] = [];
      for (const foto of fotosEvidencia) {
        const timestamp = Date.now();
        const nombreArchivo = `trenRodante/40K/${unidadNumero}_${timestamp}_${foto.name}`;
        const storageRef = ref(storage, nombreArchivo);
        await uploadBytes(storageRef, foto);
        const url = await getDownloadURL(storageRef);
        urlsFotos.push(url);
      }

      const resultado = calcularResultado();

      const registro: Omit<RegistroInspeccionLigera, 'id' | 'createdAt' | 'updatedAt'> = {
        unidadId: unidadNumero,
        unidadNumero,
        unidadPatente,
        fecha: new Date(),
        kilometraje: parseInt(kilometraje) || 0,
        inspector,
        enganche: {
          medidaPernoA: parseFloat(enganche.medidaPernoA) || 0,
          medidaPernoE: parseFloat(enganche.medidaPernoE) || 0,
          estadoGeneral: enganche.estadoGeneral,
          observaciones: enganche.observaciones,
        },
        varios: {
          ruedaAuxilio: varios.ruedaAuxilio,
          paragolpes: varios.paragolpes,
          guardabarros: varios.guardabarros,
          luces: varios.luces,
          observaciones: varios.observaciones,
        },
        frenos: {
          inspeccionVisual: frenos.inspeccionVisual,
          espesorCinta: parseFloat(frenos.espesorCinta) || 0,
          observaciones: frenos.observaciones,
        },
        suspension: {
          fugasNeumatica: suspension.fugasNeumatica,
          estadoElasticos: suspension.estadoElasticos,
          observaciones: suspension.observaciones,
        },
        neumaticos: neumaticos.map(n => ({
          posicion: n.posicion,
          marca: n.marca,
          medida: n.medida,
          profundidadDibujo: parseFloat(n.profundidadDibujo) || 0,
          presion: parseFloat(n.presion) || 0,
          estado: n.estado,
        })),
        resultado,
        fotosEvidencia: urlsFotos,
        observacionesGenerales,
        syncedToFirestore: true,
      };

      await addDoc(collection(db, 'trenRodante_40K'), {
        ...registro,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      showSuccess(`Inspección ligera guardada - Resultado: ${resultado}`);
      onComplete();
    } catch (error) {
      console.error('[ChecklistTR40K] Error:', error);
      showError('Error al guardar la inspección');
    } finally {
      setLoading(false);
    }
  };

  const renderOpcionesEstado = (
    valor: ResultadoInspeccion,
    onChange: (v: ResultadoInspeccion) => void
  ) => (
    <div className="flex gap-2 flex-wrap">
      {OPCIONES_ESTADO.map(opcion => (
        <button
          key={opcion.value}
          type="button"
          onClick={() => onChange(opcion.value)}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
            valor === opcion.value
              ? `${opcion.color} text-white shadow-md`
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {opcion.label}
        </button>
      ))}
    </div>
  );

  const renderPasoDatos = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">Datos Generales</h3>

      {/* Unidad */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Unidad *
        </label>
        <input
          type="text"
          value={unidadNumero}
          onChange={e => {
            setUnidadNumero(e.target.value);
            setMostrarSugerencias(true);
          }}
          onFocus={() => setMostrarSugerencias(true)}
          placeholder="Número o patente..."
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        {mostrarSugerencias && unidadesFiltradas.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {unidadesFiltradas.map(u => (
              <button
                key={u.numero}
                type="button"
                onClick={() => seleccionarUnidad(u)}
                className="w-full px-4 py-2 text-left hover:bg-blue-50 flex justify-between"
              >
                <span className="font-medium">{u.numero}</span>
                <span className="text-gray-500">{u.patente}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {unidadPatente && (
        <div className="p-3 bg-blue-50 rounded-lg text-blue-800">
          Patente: <strong>{unidadPatente}</strong>
        </div>
      )}

      {/* Kilometraje */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Kilometraje *
        </label>
        <input
          type="number"
          value={kilometraje}
          onChange={e => setKilometraje(e.target.value)}
          placeholder="Ej: 45000"
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Inspector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Inspector *
        </label>
        <input
          type="text"
          value={inspector}
          onChange={e => setInspector(e.target.value)}
          placeholder="Nombre del inspector..."
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );

  const renderPasoEnganche = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">Sistema de Enganche</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Medida Perno A (mm)
          </label>
          <input
            type="number"
            step="0.1"
            value={enganche.medidaPernoA}
            onChange={e => setEnganche({ ...enganche, medidaPernoA: e.target.value })}
            placeholder="Ej: 50.5"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Medida Perno E (mm)
          </label>
          <input
            type="number"
            step="0.1"
            value={enganche.medidaPernoE}
            onChange={e => setEnganche({ ...enganche, medidaPernoE: e.target.value })}
            placeholder="Ej: 48.2"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Estado General
        </label>
        {renderOpcionesEstado(enganche.estadoGeneral, v =>
          setEnganche({ ...enganche, estadoGeneral: v })
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observaciones
        </label>
        <textarea
          value={enganche.observaciones}
          onChange={e => setEnganche({ ...enganche, observaciones: e.target.value })}
          rows={2}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Observaciones del sistema de enganche..."
        />
      </div>
    </div>
  );

  const renderPasoVarios = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">Varios</h3>

      {[
        { key: 'ruedaAuxilio', label: 'Rueda de Auxilio' },
        { key: 'paragolpes', label: 'Paragolpes' },
        { key: 'guardabarros', label: 'Guardabarros' },
        { key: 'luces', label: 'Sistema de Luces' },
      ].map(item => (
        <div key={item.key} className="p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {item.label}
          </label>
          {renderOpcionesEstado(varios[item.key as keyof typeof varios] as ResultadoInspeccion, v =>
            setVarios({ ...varios, [item.key]: v })
          )}
        </div>
      ))}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observaciones
        </label>
        <textarea
          value={varios.observaciones}
          onChange={e => setVarios({ ...varios, observaciones: e.target.value })}
          rows={2}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Observaciones generales..."
        />
      </div>
    </div>
  );

  const renderPasoFrenos = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">Sistema de Frenos</h3>

      <div className="p-4 bg-gray-50 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Inspección Visual
        </label>
        {renderOpcionesEstado(frenos.inspeccionVisual, v =>
          setFrenos({ ...frenos, inspeccionVisual: v })
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Espesor de Cinta (mm)
        </label>
        <input
          type="number"
          step="0.1"
          value={frenos.espesorCinta}
          onChange={e => setFrenos({ ...frenos, espesorCinta: e.target.value })}
          placeholder="Ej: 12.5"
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Mínimo recomendado: 5mm
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observaciones
        </label>
        <textarea
          value={frenos.observaciones}
          onChange={e => setFrenos({ ...frenos, observaciones: e.target.value })}
          rows={2}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Observaciones del sistema de frenos..."
        />
      </div>
    </div>
  );

  const renderPasoSuspension = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">Suspensión</h3>

      <div className="p-4 bg-gray-50 rounded-lg">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={suspension.fugasNeumatica}
            onChange={e => setSuspension({ ...suspension, fugasNeumatica: e.target.checked })}
            className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <span className="font-medium text-gray-700">
            Presenta fugas neumáticas
          </span>
        </label>
        {suspension.fugasNeumatica && (
          <p className="text-red-600 text-sm mt-2">
            ⚠️ Unidad NO APTA si presenta fugas
          </p>
        )}
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Estado de Elásticos
        </label>
        {renderOpcionesEstado(suspension.estadoElasticos, v =>
          setSuspension({ ...suspension, estadoElasticos: v })
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observaciones
        </label>
        <textarea
          value={suspension.observaciones}
          onChange={e => setSuspension({ ...suspension, observaciones: e.target.value })}
          rows={2}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Observaciones de la suspensión..."
        />
      </div>
    </div>
  );

  const renderPasoNeumaticos = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">Registro de Neumáticos</h3>

      {neumaticos.map((neum, index) => (
        <div key={neum.posicion} className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-3">{neum.posicion}</h4>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              value={neum.marca}
              onChange={e => {
                const nuevo = [...neumaticos];
                nuevo[index].marca = e.target.value;
                setNeumaticos(nuevo);
              }}
              placeholder="Marca"
              className="p-2 border rounded-lg text-sm"
            />
            <input
              type="text"
              value={neum.medida}
              onChange={e => {
                const nuevo = [...neumaticos];
                nuevo[index].medida = e.target.value;
                setNeumaticos(nuevo);
              }}
              placeholder="Medida"
              className="p-2 border rounded-lg text-sm"
            />
            <input
              type="number"
              step="0.1"
              value={neum.profundidadDibujo}
              onChange={e => {
                const nuevo = [...neumaticos];
                nuevo[index].profundidadDibujo = e.target.value;
                setNeumaticos(nuevo);
              }}
              placeholder="Prof. dibujo (mm)"
              className="p-2 border rounded-lg text-sm"
            />
            <input
              type="number"
              step="0.1"
              value={neum.presion}
              onChange={e => {
                const nuevo = [...neumaticos];
                nuevo[index].presion = e.target.value;
                setNeumaticos(nuevo);
              }}
              placeholder="Presión (bar)"
              className="p-2 border rounded-lg text-sm"
            />
          </div>

          {renderOpcionesEstado(neum.estado, v => {
            const nuevo = [...neumaticos];
            nuevo[index].estado = v;
            setNeumaticos(nuevo);
          })}
        </div>
      ))}
    </div>
  );

  const renderPasoResumen = () => {
    const resultado = calcularResultado();
    const esApto = resultado === 'APTO';

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-800">Resumen de Inspección</h3>

        {/* Resultado */}
        <div
          className={`p-6 rounded-xl text-center ${
            esApto
              ? 'bg-green-100 border-2 border-green-500'
              : 'bg-red-100 border-2 border-red-500'
          }`}
        >
          <span className="text-4xl">{esApto ? '✅' : '❌'}</span>
          <h4 className={`text-2xl font-bold mt-2 ${esApto ? 'text-green-700' : 'text-red-700'}`}>
            {resultado}
          </h4>
          <p className={`text-sm mt-1 ${esApto ? 'text-green-600' : 'text-red-600'}`}>
            {esApto
              ? 'La unidad cumple con los requisitos de inspección'
              : 'La unidad requiere atención antes de operar'}
          </p>
        </div>

        {/* Datos */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Unidad:</strong> {unidadNumero}</div>
            <div><strong>Patente:</strong> {unidadPatente}</div>
            <div><strong>Kilometraje:</strong> {parseInt(kilometraje).toLocaleString()} km</div>
            <div><strong>Inspector:</strong> {inspector}</div>
          </div>
        </div>

        {/* Observaciones generales */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observaciones Generales
          </label>
          <textarea
            value={observacionesGenerales}
            onChange={e => setObservacionesGenerales(e.target.value)}
            rows={3}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Observaciones adicionales de la inspección..."
          />
        </div>

        {/* Fotos de evidencia */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fotos de Evidencia
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={e => setFotosEvidencia(Array.from(e.target.files || []))}
            className="w-full p-2 border rounded-lg"
          />
          {fotosEvidencia.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {fotosEvidencia.length} foto(s) seleccionada(s)
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderPasoActual = () => {
    switch (pasoActual) {
      case 'datos':
        return renderPasoDatos();
      case 'enganche':
        return renderPasoEnganche();
      case 'varios':
        return renderPasoVarios();
      case 'frenos':
        return renderPasoFrenos();
      case 'suspension':
        return renderPasoSuspension();
      case 'neumaticos':
        return renderPasoNeumaticos();
      case 'resumen':
        return renderPasoResumen();
    }
  };

  const puedeAvanzar = () => {
    switch (pasoActual) {
      case 'datos':
        return unidadNumero && kilometraje && inspector;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            ← Volver
          </button>
          <h1 className="font-bold">Inspección Ligera 40K</h1>
          <div className="w-10" />
        </div>

        {/* Barra de progreso */}
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span>Paso {indicePasoActual + 1} de {PASOS.length}</span>
            <span>{Math.round(progreso)}%</span>
          </div>
          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4">
        <div className="bg-white rounded-xl shadow-lg p-6">
          {renderPasoActual()}
        </div>
      </div>

      {/* Botones de navegación */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
        <div className="flex gap-3 max-w-lg mx-auto">
          {indicePasoActual > 0 && (
            <button
              onClick={irAnterior}
              className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
            >
              ← Anterior
            </button>
          )}

          {pasoActual === 'resumen' ? (
            <button
              onClick={guardarChecklist}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : '✓ Guardar Inspección'}
            </button>
          ) : (
            <button
              onClick={irSiguiente}
              disabled={!puedeAvanzar()}
              className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Siguiente →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChecklistTrenRodante40K;
