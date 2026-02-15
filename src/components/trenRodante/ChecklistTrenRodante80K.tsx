/**
 * CHECKLIST TREN RODANTE 80K - MANTENIMIENTO CORTO PLAZO
 * Basado en NG-PR-TRN-017-FR-01 Air Liquide
 * Secciones: Accesorios, Anti Arrastre, Ejes, Frenos, Suspensión
 */

import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import type { ResultadoInspeccion } from '../../types/trenRodante';
import { showSuccess, showError } from '../../utils/toast';
import { TODAS_LAS_UNIDADES } from '../CarouselSector';

interface ChecklistTrenRodante80KProps {
  unidadNumero?: string;
  onComplete: () => void;
  onBack: () => void;
}

type Paso = 'datos' | 'accesorios' | 'antiArrastre' | 'ejes' | 'frenos' | 'suspension' | 'resumen';
const PASOS: Paso[] = ['datos', 'accesorios', 'antiArrastre', 'ejes', 'frenos', 'suspension', 'resumen'];

// Items de Accesorios según el PDF
const ITEMS_ACCESORIOS = [
  'Placa patente trasera',
  'Luces de gálibo',
  'Luces de freno',
  'Luces de giro',
  'Luces marcha atrás',
  'Paragolpes trasero',
  'Guardabarros',
  'Caja de herramientas',
  'Rueda de auxilio',
  'Calzas',
  'Triángulos reflectivos',
  'Extintores',
  'Botiquín',
  'Conos de señalización',
  'Documentación en regla',
];

// Items Anti Arrastre
const ITEMS_ANTI_ARRASTRE = [
  'Sensor de velocidad',
  'Válvula moduladora',
  'Cableado y conectores',
  'Lámpara indicadora',
  'Funcionamiento general',
  'Ajuste del sistema',
  'Sin códigos de error',
];

// Items por Eje
const ITEMS_EJE = [
  'Bocina de rueda',
  'Rodamientos',
  'Retén de grasa',
  'Tambor/Disco',
  'Perno maestro',
  'Buje de mangueta',
  'Chaveta de seguridad',
  'Tuerca de ajuste',
  'Arandela de seguridad',
  'Tapa de bocina',
  'Estado general del eje',
];

// Items Freno Campana
const ITEMS_FRENO_CAMPANA = [
  'Tambor de freno',
  'Cintas de freno',
  'Resortes de retorno',
  'Levas de freno',
  'Rodillos de leva',
  'Pulmón de freno',
  'Varillaje de freno',
  'Regulador automático',
  'Mangueras de aire',
  'Conexiones neumáticas',
  'Protectores de polvo',
  'Anclajes de cinta',
  'Plato de freno',
  'Juego axial de campana',
];

const OPCIONES_ESTADO: { value: ResultadoInspeccion; label: string; color: string }[] = [
  { value: 'BUENO', label: 'OK', color: 'bg-green-500' },
  { value: 'REGULAR', label: 'REG', color: 'bg-amber-500' },
  { value: 'MALO', label: 'MAL', color: 'bg-red-500' },
  { value: 'N/A', label: 'N/A', color: 'bg-gray-400' },
];

interface ItemCheck {
  nombre: string;
  estado: ResultadoInspeccion;
  observacion: string;
  requiereAccion: boolean;
}

const ChecklistTrenRodante80K: React.FC<ChecklistTrenRodante80KProps> = ({
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
  const [tecnico, setTecnico] = useState('');
  const [tipoFreno, setTipoFreno] = useState<'campana' | 'disco'>('campana');
  const [tipoSuspension, setTipoSuspension] = useState<'mecanica' | 'neumatica'>('neumatica');

  // Secciones
  const [accesorios, setAccesorios] = useState<ItemCheck[]>(
    ITEMS_ACCESORIOS.map(nombre => ({ nombre, estado: 'BUENO', observacion: '', requiereAccion: false }))
  );

  const [antiArrastre, setAntiArrastre] = useState<ItemCheck[]>(
    ITEMS_ANTI_ARRASTRE.map(nombre => ({ nombre, estado: 'BUENO', observacion: '', requiereAccion: false }))
  );

  // Ejes (3 ejes x 2 lados)
  const [ejes, setEjes] = useState<{
    eje: number;
    lado: 'IZQ' | 'DER';
    items: ItemCheck[];
  }[]>([
    { eje: 1, lado: 'IZQ', items: ITEMS_EJE.map(nombre => ({ nombre, estado: 'BUENO', observacion: '', requiereAccion: false })) },
    { eje: 1, lado: 'DER', items: ITEMS_EJE.map(nombre => ({ nombre, estado: 'BUENO', observacion: '', requiereAccion: false })) },
    { eje: 2, lado: 'IZQ', items: ITEMS_EJE.map(nombre => ({ nombre, estado: 'BUENO', observacion: '', requiereAccion: false })) },
    { eje: 2, lado: 'DER', items: ITEMS_EJE.map(nombre => ({ nombre, estado: 'BUENO', observacion: '', requiereAccion: false })) },
    { eje: 3, lado: 'IZQ', items: ITEMS_EJE.map(nombre => ({ nombre, estado: 'BUENO', observacion: '', requiereAccion: false })) },
    { eje: 3, lado: 'DER', items: ITEMS_EJE.map(nombre => ({ nombre, estado: 'BUENO', observacion: '', requiereAccion: false })) },
  ]);

  // Frenos (3 ejes)
  const [frenos, setFrenos] = useState<{
    eje: number;
    items: ItemCheck[];
  }[]>([
    { eje: 1, items: ITEMS_FRENO_CAMPANA.map(nombre => ({ nombre, estado: 'BUENO', observacion: '', requiereAccion: false })) },
    { eje: 2, items: ITEMS_FRENO_CAMPANA.map(nombre => ({ nombre, estado: 'BUENO', observacion: '', requiereAccion: false })) },
    { eje: 3, items: ITEMS_FRENO_CAMPANA.map(nombre => ({ nombre, estado: 'BUENO', observacion: '', requiereAccion: false })) },
  ]);

  // Suspensión
  const [suspension, setSuspension] = useState<ItemCheck[]>([
    { nombre: 'Hojas de elástico / Bolsas de aire', estado: 'BUENO', observacion: '', requiereAccion: false },
    { nombre: 'Grilletes y bujes', estado: 'BUENO', observacion: '', requiereAccion: false },
    { nombre: 'Amortiguadores', estado: 'BUENO', observacion: '', requiereAccion: false },
    { nombre: 'Barras estabilizadoras', estado: 'BUENO', observacion: '', requiereAccion: false },
    { nombre: 'Soportes y anclajes', estado: 'BUENO', observacion: '', requiereAccion: false },
    { nombre: 'Válvula niveladora', estado: 'BUENO', observacion: '', requiereAccion: false },
    { nombre: 'Altura de trabajo', estado: 'BUENO', observacion: '', requiereAccion: false },
  ]);

  const [observacionesGenerales, setObservacionesGenerales] = useState('');
  const [fotosEvidencia, setFotosEvidencia] = useState<File[]>([]);

  // Estado para sub-secciones en ejes y frenos
  const [ejeActivo, setEjeActivo] = useState(0);
  const [frenoActivo, setFrenoActivo] = useState(0);

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

  const contarNoConformes = () => {
    let count = 0;
    accesorios.forEach(i => { if (i.estado === 'MALO') count++; });
    antiArrastre.forEach(i => { if (i.estado === 'MALO') count++; });
    ejes.forEach(e => e.items.forEach(i => { if (i.estado === 'MALO') count++; }));
    frenos.forEach(f => f.items.forEach(i => { if (i.estado === 'MALO') count++; }));
    suspension.forEach(i => { if (i.estado === 'MALO') count++; });
    return count;
  };

  const calcularResultado = (): 'APTO' | 'NO_APTO' | 'APTO_CON_OBSERVACIONES' => {
    const noConformes = contarNoConformes();
    const hayRegulares = [
      ...accesorios,
      ...antiArrastre,
      ...ejes.flatMap(e => e.items),
      ...frenos.flatMap(f => f.items),
      ...suspension,
    ].some(i => i.estado === 'REGULAR');

    if (noConformes > 0) return 'NO_APTO';
    if (hayRegulares) return 'APTO_CON_OBSERVACIONES';
    return 'APTO';
  };

  const guardarChecklist = async () => {
    setLoading(true);

    try {
      const urlsFotos: string[] = [];
      for (const foto of fotosEvidencia) {
        const timestamp = Date.now();
        const nombreArchivo = `trenRodante/80K/${unidadNumero}_${timestamp}_${foto.name}`;
        const storageRef = ref(storage, nombreArchivo);
        await uploadBytes(storageRef, foto);
        const url = await getDownloadURL(storageRef);
        urlsFotos.push(url);
      }

      const resultado = calcularResultado();
      const itemsNoConformes = [
        ...accesorios.filter(i => i.estado === 'MALO').map(i => `Accesorios: ${i.nombre}`),
        ...antiArrastre.filter(i => i.estado === 'MALO').map(i => `Anti Arrastre: ${i.nombre}`),
        ...ejes.flatMap(e => e.items.filter(i => i.estado === 'MALO').map(i => `Eje ${e.eje} ${e.lado}: ${i.nombre}`)),
        ...frenos.flatMap(f => f.items.filter(i => i.estado === 'MALO').map(i => `Freno Eje ${f.eje}: ${i.nombre}`)),
        ...suspension.filter(i => i.estado === 'MALO').map(i => `Suspensión: ${i.nombre}`),
      ];

      const registro = {
        unidadId: unidadNumero,
        unidadNumero,
        unidadPatente,
        fecha: new Date(),
        kilometraje: parseInt(kilometraje) || 0,
        tecnico,
        tipoFreno,
        tipoSuspension,
        accesorios,
        antiArrastre,
        ejes,
        frenos,
        suspension,
        resultado,
        itemsNoConformes,
        observacionesGenerales,
        fotosEvidencia: urlsFotos,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        syncedToFirestore: true,
      };

      await addDoc(collection(db, 'trenRodante_80K'), registro);

      showSuccess(`Mantenimiento 80K guardado - Resultado: ${resultado}`);
      onComplete();
    } catch (error) {
      console.error('[ChecklistTR80K] Error:', error);
      showError('Error al guardar el mantenimiento');
    } finally {
      setLoading(false);
    }
  };

  const renderItemCheck = (
    item: ItemCheck,
    index: number,
    lista: ItemCheck[],
    setLista: (items: ItemCheck[]) => void
  ) => (
    <div key={item.nombre} className="p-3 bg-gray-50 rounded-lg mb-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 flex-1">{item.nombre}</span>
        <div className="flex gap-1">
          {OPCIONES_ESTADO.map(opcion => (
            <button
              key={opcion.value}
              type="button"
              onClick={() => {
                const nuevo = [...lista];
                nuevo[index].estado = opcion.value;
                setLista(nuevo);
              }}
              className={`w-10 h-8 rounded text-xs font-bold transition-all ${
                item.estado === opcion.value
                  ? `${opcion.color} text-white`
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {opcion.label}
            </button>
          ))}
        </div>
      </div>
      {item.estado !== 'BUENO' && item.estado !== 'N/A' && (
        <input
          type="text"
          value={item.observacion}
          onChange={e => {
            const nuevo = [...lista];
            nuevo[index].observacion = e.target.value;
            setLista(nuevo);
          }}
          placeholder="Observación..."
          className="w-full p-2 text-sm border rounded mt-1"
        />
      )}
    </div>
  );

  const renderPasoDatos = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">Datos del Mantenimiento</h3>

      {/* Unidad */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">Unidad *</label>
        <input
          type="text"
          value={unidadNumero}
          onChange={e => { setUnidadNumero(e.target.value); setMostrarSugerencias(true); }}
          onFocus={() => setMostrarSugerencias(true)}
          placeholder="Número o patente..."
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        {mostrarSugerencias && unidadesFiltradas.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {unidadesFiltradas.map(u => (
              <button key={u.numero} type="button" onClick={() => seleccionarUnidad(u)}
                className="w-full px-4 py-2 text-left hover:bg-blue-50 flex justify-between">
                <span className="font-medium">{u.numero}</span>
                <span className="text-gray-500">{u.patente}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {unidadPatente && (
        <div className="p-3 bg-blue-50 rounded-lg text-blue-800">Patente: <strong>{unidadPatente}</strong></div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Kilometraje *</label>
        <input type="number" value={kilometraje} onChange={e => setKilometraje(e.target.value)}
          placeholder="Ej: 80000" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Técnico Responsable *</label>
        <input type="text" value={tecnico} onChange={e => setTecnico(e.target.value)}
          placeholder="Nombre del técnico..." className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Freno</label>
          <select value={tipoFreno} onChange={e => setTipoFreno(e.target.value as 'campana' | 'disco')}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="campana">Campana</option>
            <option value="disco">Disco</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Suspensión</label>
          <select value={tipoSuspension} onChange={e => setTipoSuspension(e.target.value as 'mecanica' | 'neumatica')}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="neumatica">Neumática</option>
            <option value="mecanica">Mecánica</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderPasoAccesorios = () => (
    <div className="space-y-2">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Accesorios ({accesorios.length} items)</h3>
      {accesorios.map((item, index) => renderItemCheck(item, index, accesorios, setAccesorios))}
    </div>
  );

  const renderPasoAntiArrastre = () => (
    <div className="space-y-2">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Sistema Anti Arrastre (ABS)</h3>
      {antiArrastre.map((item, index) => renderItemCheck(item, index, antiArrastre, setAntiArrastre))}
    </div>
  );

  const renderPasoEjes = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">Inspección de Ejes</h3>

      {/* Tabs de ejes */}
      <div className="flex flex-wrap gap-2 mb-4">
        {ejes.map((eje, index) => (
          <button key={index} onClick={() => setEjeActivo(index)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              ejeActivo === index ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}>
            Eje {eje.eje} {eje.lado}
          </button>
        ))}
      </div>

      {/* Items del eje activo */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-700 mb-3">
          Eje {ejes[ejeActivo].eje} - Lado {ejes[ejeActivo].lado}
        </h4>
        {ejes[ejeActivo].items.map((item, index) => (
          <div key={item.nombre} className="p-3 bg-gray-50 rounded-lg mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 flex-1">{item.nombre}</span>
              <div className="flex gap-1">
                {OPCIONES_ESTADO.map(opcion => (
                  <button key={opcion.value} type="button"
                    onClick={() => {
                      const nuevosEjes = [...ejes];
                      nuevosEjes[ejeActivo].items[index].estado = opcion.value;
                      setEjes(nuevosEjes);
                    }}
                    className={`w-10 h-8 rounded text-xs font-bold transition-all ${
                      item.estado === opcion.value ? `${opcion.color} text-white` : 'bg-gray-200 text-gray-600'
                    }`}>
                    {opcion.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPasoFrenos = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">Sistema de Frenos ({tipoFreno === 'campana' ? 'Campana' : 'Disco'})</h3>

      {/* Tabs de frenos */}
      <div className="flex gap-2 mb-4">
        {frenos.map((freno, index) => (
          <button key={index} onClick={() => setFrenoActivo(index)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              frenoActivo === index ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
            Eje {freno.eje}
          </button>
        ))}
      </div>

      {/* Items del freno activo */}
      <div className="border-t pt-4">
        {frenos[frenoActivo].items.map((item, index) => (
          <div key={item.nombre} className="p-3 bg-gray-50 rounded-lg mb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 flex-1">{item.nombre}</span>
              <div className="flex gap-1">
                {OPCIONES_ESTADO.map(opcion => (
                  <button key={opcion.value} type="button"
                    onClick={() => {
                      const nuevosFreno = [...frenos];
                      nuevosFreno[frenoActivo].items[index].estado = opcion.value;
                      setFrenos(nuevosFreno);
                    }}
                    className={`w-10 h-8 rounded text-xs font-bold transition-all ${
                      item.estado === opcion.value ? `${opcion.color} text-white` : 'bg-gray-200 text-gray-600'
                    }`}>
                    {opcion.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPasoSuspension = () => (
    <div className="space-y-2">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        Suspensión {tipoSuspension === 'neumatica' ? 'Neumática' : 'Mecánica'}
      </h3>
      {suspension.map((item, index) => renderItemCheck(item, index, suspension, setSuspension))}
    </div>
  );

  const renderPasoResumen = () => {
    const resultado = calcularResultado();
    const noConformes = contarNoConformes();

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-800">Resumen del Mantenimiento 80K</h3>

        <div className={`p-6 rounded-xl text-center ${
          resultado === 'APTO' ? 'bg-green-100 border-2 border-green-500' :
          resultado === 'APTO_CON_OBSERVACIONES' ? 'bg-amber-100 border-2 border-amber-500' :
          'bg-red-100 border-2 border-red-500'
        }`}>
          <span className="text-4xl">{resultado === 'APTO' ? '✅' : resultado === 'APTO_CON_OBSERVACIONES' ? '⚠️' : '❌'}</span>
          <h4 className={`text-2xl font-bold mt-2 ${
            resultado === 'APTO' ? 'text-green-700' : resultado === 'APTO_CON_OBSERVACIONES' ? 'text-amber-700' : 'text-red-700'
          }`}>
            {resultado.replace('_', ' ')}
          </h4>
          {noConformes > 0 && (
            <p className="text-sm mt-1 text-red-600">{noConformes} item(s) no conforme(s)</p>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Unidad:</strong> {unidadNumero}</div>
            <div><strong>Patente:</strong> {unidadPatente}</div>
            <div><strong>Kilometraje:</strong> {parseInt(kilometraje).toLocaleString()} km</div>
            <div><strong>Técnico:</strong> {tecnico}</div>
            <div><strong>Tipo Freno:</strong> {tipoFreno}</div>
            <div><strong>Tipo Suspensión:</strong> {tipoSuspension}</div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones Generales</label>
          <textarea value={observacionesGenerales} onChange={e => setObservacionesGenerales(e.target.value)}
            rows={3} className="w-full p-3 border rounded-lg" placeholder="Observaciones adicionales..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fotos de Evidencia</label>
          <input type="file" accept="image/*" multiple onChange={e => setFotosEvidencia(Array.from(e.target.files || []))}
            className="w-full p-2 border rounded-lg" />
          {fotosEvidencia.length > 0 && <p className="text-sm text-gray-500 mt-1">{fotosEvidencia.length} foto(s)</p>}
        </div>
      </div>
    );
  };

  const renderPasoActual = () => {
    switch (pasoActual) {
      case 'datos': return renderPasoDatos();
      case 'accesorios': return renderPasoAccesorios();
      case 'antiArrastre': return renderPasoAntiArrastre();
      case 'ejes': return renderPasoEjes();
      case 'frenos': return renderPasoFrenos();
      case 'suspension': return renderPasoSuspension();
      case 'resumen': return renderPasoResumen();
    }
  };

  const puedeAvanzar = () => {
    if (pasoActual === 'datos') return unidadNumero && kilometraje && tecnico;
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-lg">← Volver</button>
          <h1 className="font-bold">Mantenimiento 80K</h1>
          <div className="w-10" />
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span>Paso {indicePasoActual + 1} de {PASOS.length}</span>
            <span>{Math.round(progreso)}%</span>
          </div>
          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progreso}%` }} />
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-h-[calc(100vh-220px)] overflow-y-auto">
          {renderPasoActual()}
        </div>
      </div>

      {/* Navegación */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
        <div className="flex gap-3 max-w-lg mx-auto">
          {indicePasoActual > 0 && (
            <button onClick={irAnterior} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium">
              ← Anterior
            </button>
          )}
          {pasoActual === 'resumen' ? (
            <button onClick={guardarChecklist} disabled={loading}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium disabled:opacity-50">
              {loading ? 'Guardando...' : '✓ Guardar Mantenimiento'}
            </button>
          ) : (
            <button onClick={irSiguiente} disabled={!puedeAvanzar()}
              className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-medium disabled:opacity-50">
              Siguiente →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChecklistTrenRodante80K;
