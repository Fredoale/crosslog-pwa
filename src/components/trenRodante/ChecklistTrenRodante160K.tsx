/**
 * CHECKLIST TREN RODANTE 160K - MANTENIMIENTO MEDIANO PLAZO
 * Basado en NG-PR-TRN-017-FR-03 Air Liquide
 * Incluye: Todo 80K + Ensayos ND + Rectificaciones + Alineación
 */

import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import type { ResultadoInspeccion } from '../../types/trenRodante';
import { showSuccess, showError } from '../../utils/toast';
import { TODAS_LAS_UNIDADES } from '../CarouselSector';

interface ChecklistTrenRodante160KProps {
  unidadNumero?: string;
  onComplete: () => void;
  onBack: () => void;
}

type Paso = 'datos' | 'engancheND' | 'rectificacion' | 'puntasEje' | 'alineacion' | 'resumen80K' | 'resumenFinal';
const PASOS: Paso[] = ['datos', 'engancheND', 'rectificacion', 'puntasEje', 'alineacion', 'resumen80K', 'resumenFinal'];

type ResultadoEnsayo = 'APROBADO' | 'RECHAZADO' | 'PENDIENTE';

const ChecklistTrenRodante160K: React.FC<ChecklistTrenRodante160KProps> = ({
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
  const [responsableCalidad, setResponsableCalidad] = useState('');

  // Sistema de Enganche con Ensayo ND
  const [engancheND, setEngancheND] = useState({
    inspeccionVisual: 'BUENO' as ResultadoInspeccion,
    ensayoRealizado: false,
    resultadoEnsayo: 'PENDIENTE' as ResultadoEnsayo,
    certificadoNumero: '',
    fechaEnsayo: '',
    empresaEnsayo: '',
    observaciones: '',
  });

  // Rectificación de Campanas/Discos
  const [rectificacion, setRectificacion] = useState({
    campanasRectificadas: false,
    discosRectificados: false,
    medidas: [
      { componente: 'Campana Eje 1', medidaInicial: '', medidaFinal: '', dentroTolerancias: true },
      { componente: 'Campana Eje 2', medidaInicial: '', medidaFinal: '', dentroTolerancias: true },
      { componente: 'Campana Eje 3', medidaInicial: '', medidaFinal: '', dentroTolerancias: true },
    ],
    observaciones: '',
  });

  // Ensayo ND Puntas de Eje
  const [puntasEje, setPuntasEje] = useState({
    eje1: { realizado: false, resultado: 'PENDIENTE' as ResultadoEnsayo, certificado: '' },
    eje2: { realizado: false, resultado: 'PENDIENTE' as ResultadoEnsayo, certificado: '' },
    eje3: { realizado: false, resultado: 'PENDIENTE' as ResultadoEnsayo, certificado: '' },
    empresaEnsayo: '',
    fechaEnsayo: '',
    observaciones: '',
  });

  // Alineación de Ejes
  const [alineacion, setAlineacion] = useState({
    realizada: false,
    medicionInicial: { eje1: '', eje2: '', eje3: '' },
    medicionFinal: { eje1: '', eje2: '', eje3: '' },
    dentroTolerancias: true,
    certificadoNumero: '',
    empresaAlineacion: '',
    observaciones: '',
  });

  // Confirmación de 80K completado
  const [mantenimiento80KCompletado, setMantenimiento80KCompletado] = useState(false);
  const [observaciones80K, setObservaciones80K] = useState('');

  const [observacionesGenerales, setObservacionesGenerales] = useState('');
  const [fotosEvidencia, setFotosEvidencia] = useState<File[]>([]);
  const [certificadosAdjuntos, setCertificadosAdjuntos] = useState<File[]>([]);

  // Búsqueda unidad
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
    if (siguienteIndice < PASOS.length) setPasoActual(PASOS[siguienteIndice]);
  };

  const irAnterior = () => {
    const anteriorIndice = indicePasoActual - 1;
    if (anteriorIndice >= 0) setPasoActual(PASOS[anteriorIndice]);
  };

  const todosEnsayosAprobados = () => {
    const engancheOK = !engancheND.ensayoRealizado || engancheND.resultadoEnsayo === 'APROBADO';
    const puntasOK =
      (!puntasEje.eje1.realizado || puntasEje.eje1.resultado === 'APROBADO') &&
      (!puntasEje.eje2.realizado || puntasEje.eje2.resultado === 'APROBADO') &&
      (!puntasEje.eje3.realizado || puntasEje.eje3.resultado === 'APROBADO');
    return engancheOK && puntasOK;
  };

  const calcularResultado = (): 'APTO' | 'NO_APTO' | 'APTO_CON_OBSERVACIONES' => {
    if (!mantenimiento80KCompletado) return 'NO_APTO';
    if (!todosEnsayosAprobados()) return 'NO_APTO';
    if (!alineacion.dentroTolerancias && alineacion.realizada) return 'APTO_CON_OBSERVACIONES';
    if (engancheND.inspeccionVisual !== 'BUENO') return 'APTO_CON_OBSERVACIONES';
    return 'APTO';
  };

  const guardarChecklist = async () => {
    setLoading(true);

    try {
      // Subir fotos
      const urlsFotos: string[] = [];
      for (const foto of fotosEvidencia) {
        const timestamp = Date.now();
        const nombreArchivo = `trenRodante/160K/${unidadNumero}_${timestamp}_${foto.name}`;
        const storageRef = ref(storage, nombreArchivo);
        await uploadBytes(storageRef, foto);
        const url = await getDownloadURL(storageRef);
        urlsFotos.push(url);
      }

      // Subir certificados
      const urlsCertificados: string[] = [];
      for (const cert of certificadosAdjuntos) {
        const timestamp = Date.now();
        const nombreArchivo = `trenRodante/160K/certificados/${unidadNumero}_${timestamp}_${cert.name}`;
        const storageRef = ref(storage, nombreArchivo);
        await uploadBytes(storageRef, cert);
        const url = await getDownloadURL(storageRef);
        urlsCertificados.push(url);
      }

      const resultado = calcularResultado();

      const registro = {
        unidadId: unidadNumero,
        unidadNumero,
        unidadPatente,
        fecha: new Date(),
        kilometraje: parseInt(kilometraje) || 0,
        tecnico,
        responsableCalidad,
        engancheND: {
          ...engancheND,
          fechaEnsayo: engancheND.fechaEnsayo ? new Date(engancheND.fechaEnsayo) : null,
        },
        rectificacion: {
          ...rectificacion,
          medidas: rectificacion.medidas.map(m => ({
            ...m,
            medidaInicial: parseFloat(m.medidaInicial) || 0,
            medidaFinal: parseFloat(m.medidaFinal) || 0,
          })),
        },
        puntasEje: {
          ...puntasEje,
          fechaEnsayo: puntasEje.fechaEnsayo ? new Date(puntasEje.fechaEnsayo) : null,
        },
        alineacion: {
          ...alineacion,
          medicionInicial: {
            eje1: parseFloat(alineacion.medicionInicial.eje1) || 0,
            eje2: parseFloat(alineacion.medicionInicial.eje2) || 0,
            eje3: parseFloat(alineacion.medicionInicial.eje3) || 0,
          },
          medicionFinal: {
            eje1: parseFloat(alineacion.medicionFinal.eje1) || 0,
            eje2: parseFloat(alineacion.medicionFinal.eje2) || 0,
            eje3: parseFloat(alineacion.medicionFinal.eje3) || 0,
          },
        },
        mantenimiento80KCompletado,
        observaciones80K,
        resultado,
        ensayosNDAprobados: todosEnsayosAprobados(),
        observacionesGenerales,
        fotosEvidencia: urlsFotos,
        certificadosAdjuntos: urlsCertificados,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        syncedToFirestore: true,
      };

      await addDoc(collection(db, 'trenRodante_160K'), registro);

      showSuccess(`Mantenimiento 160K guardado - Resultado: ${resultado}`);
      onComplete();
    } catch (error) {
      console.error('[ChecklistTR160K] Error:', error);
      showError('Error al guardar el mantenimiento');
    } finally {
      setLoading(false);
    }
  };

  const renderResultadoEnsayo = (
    valor: ResultadoEnsayo,
    onChange: (v: ResultadoEnsayo) => void
  ) => (
    <div className="flex gap-2">
      {(['APROBADO', 'RECHAZADO', 'PENDIENTE'] as ResultadoEnsayo[]).map(opcion => (
        <button key={opcion} type="button" onClick={() => onChange(opcion)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            valor === opcion
              ? opcion === 'APROBADO' ? 'bg-green-500 text-white'
                : opcion === 'RECHAZADO' ? 'bg-red-500 text-white'
                : 'bg-amber-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}>
          {opcion}
        </button>
      ))}
    </div>
  );

  const renderPasoDatos = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">Datos del Mantenimiento 160K</h3>

      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">Unidad *</label>
        <input type="text" value={unidadNumero}
          onChange={e => { setUnidadNumero(e.target.value); setMostrarSugerencias(true); }}
          onFocus={() => setMostrarSugerencias(true)}
          placeholder="Número o patente..." className="w-full p-3 border rounded-lg" />
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

      {unidadPatente && <div className="p-3 bg-indigo-50 rounded-lg text-indigo-800">Patente: <strong>{unidadPatente}</strong></div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Kilometraje *</label>
        <input type="number" value={kilometraje} onChange={e => setKilometraje(e.target.value)}
          placeholder="Ej: 160000" className="w-full p-3 border rounded-lg" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Técnico Responsable *</label>
        <input type="text" value={tecnico} onChange={e => setTecnico(e.target.value)}
          placeholder="Nombre del técnico..." className="w-full p-3 border rounded-lg" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Responsable de Calidad</label>
        <input type="text" value={responsableCalidad} onChange={e => setResponsableCalidad(e.target.value)}
          placeholder="Nombre del responsable de calidad..." className="w-full p-3 border rounded-lg" />
      </div>
    </div>
  );

  const renderPasoEngancheND = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">Sistema de Enganche - Ensayo ND</h3>
      <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
        ⚠️ El ensayo no destructivo del sistema de enganche es OBLIGATORIO para el mantenimiento 160K
      </p>

      <div className="p-4 bg-gray-50 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">Inspección Visual</label>
        <div className="flex gap-2">
          {(['BUENO', 'REGULAR', 'MALO'] as ResultadoInspeccion[]).map(opcion => (
            <button key={opcion} type="button"
              onClick={() => setEngancheND({ ...engancheND, inspeccionVisual: opcion })}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                engancheND.inspeccionVisual === opcion
                  ? opcion === 'BUENO' ? 'bg-green-500 text-white'
                    : opcion === 'REGULAR' ? 'bg-amber-500 text-white'
                    : 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}>
              {opcion}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-2 border-indigo-200 rounded-lg bg-indigo-50">
        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <input type="checkbox" checked={engancheND.ensayoRealizado}
            onChange={e => setEngancheND({ ...engancheND, ensayoRealizado: e.target.checked })}
            className="w-5 h-5 rounded border-gray-300 text-indigo-600" />
          <span className="font-medium text-gray-700">Ensayo ND Realizado</span>
        </label>

        {engancheND.ensayoRealizado && (
          <div className="space-y-3 mt-4 pt-4 border-t border-indigo-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resultado del Ensayo</label>
              {renderResultadoEnsayo(engancheND.resultadoEnsayo, v => setEngancheND({ ...engancheND, resultadoEnsayo: v }))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N° Certificado</label>
                <input type="text" value={engancheND.certificadoNumero}
                  onChange={e => setEngancheND({ ...engancheND, certificadoNumero: e.target.value })}
                  className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Ensayo</label>
                <input type="date" value={engancheND.fechaEnsayo}
                  onChange={e => setEngancheND({ ...engancheND, fechaEnsayo: e.target.value })}
                  className="w-full p-2 border rounded-lg" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa que realizó el ensayo</label>
              <input type="text" value={engancheND.empresaEnsayo}
                onChange={e => setEngancheND({ ...engancheND, empresaEnsayo: e.target.value })}
                className="w-full p-2 border rounded-lg" />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
        <textarea value={engancheND.observaciones}
          onChange={e => setEngancheND({ ...engancheND, observaciones: e.target.value })}
          rows={2} className="w-full p-3 border rounded-lg" />
      </div>
    </div>
  );

  const renderPasoRectificacion = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">Rectificación de Campanas/Discos</h3>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg flex-1 cursor-pointer">
          <input type="checkbox" checked={rectificacion.campanasRectificadas}
            onChange={e => setRectificacion({ ...rectificacion, campanasRectificadas: e.target.checked })}
            className="w-5 h-5 rounded" />
          <span>Campanas Rectificadas</span>
        </label>
        <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg flex-1 cursor-pointer">
          <input type="checkbox" checked={rectificacion.discosRectificados}
            onChange={e => setRectificacion({ ...rectificacion, discosRectificados: e.target.checked })}
            className="w-5 h-5 rounded" />
          <span>Discos Rectificados</span>
        </label>
      </div>

      {(rectificacion.campanasRectificadas || rectificacion.discosRectificados) && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Medidas de Rectificación</h4>
          {rectificacion.medidas.map((medida, index) => (
            <div key={medida.componente} className="p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-sm">{medida.componente}</span>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div>
                  <label className="text-xs text-gray-500">Inicial (mm)</label>
                  <input type="number" step="0.1" value={medida.medidaInicial}
                    onChange={e => {
                      const nuevo = [...rectificacion.medidas];
                      nuevo[index].medidaInicial = e.target.value;
                      setRectificacion({ ...rectificacion, medidas: nuevo });
                    }}
                    className="w-full p-2 border rounded text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Final (mm)</label>
                  <input type="number" step="0.1" value={medida.medidaFinal}
                    onChange={e => {
                      const nuevo = [...rectificacion.medidas];
                      nuevo[index].medidaFinal = e.target.value;
                      setRectificacion({ ...rectificacion, medidas: nuevo });
                    }}
                    className="w-full p-2 border rounded text-sm" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 p-2 cursor-pointer">
                    <input type="checkbox" checked={medida.dentroTolerancias}
                      onChange={e => {
                        const nuevo = [...rectificacion.medidas];
                        nuevo[index].dentroTolerancias = e.target.checked;
                        setRectificacion({ ...rectificacion, medidas: nuevo });
                      }}
                      className="w-4 h-4 rounded" />
                    <span className="text-xs">OK</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
        <textarea value={rectificacion.observaciones}
          onChange={e => setRectificacion({ ...rectificacion, observaciones: e.target.value })}
          rows={2} className="w-full p-3 border rounded-lg" />
      </div>
    </div>
  );

  const renderPasoPuntasEje = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">Ensayo ND - Puntas de Eje</h3>
      <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
        ⚠️ El ensayo no destructivo de puntas de eje es OBLIGATORIO para detectar fisuras
      </p>

      {[1, 2, 3].map(eje => {
        const key = `eje${eje}` as 'eje1' | 'eje2' | 'eje3';
        return (
          <div key={eje} className="p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">Eje {eje}</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={puntasEje[key].realizado}
                  onChange={e => setPuntasEje({
                    ...puntasEje,
                    [key]: { ...puntasEje[key], realizado: e.target.checked }
                  })}
                  className="w-5 h-5 rounded" />
                <span className="text-sm">Ensayo realizado</span>
              </label>
            </div>

            {puntasEje[key].realizado && (
              <div className="space-y-3 pt-3 border-t">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Resultado</label>
                  {renderResultadoEnsayo(puntasEje[key].resultado, v => setPuntasEje({
                    ...puntasEje,
                    [key]: { ...puntasEje[key], resultado: v }
                  }))}
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">N° Certificado</label>
                  <input type="text" value={puntasEje[key].certificado}
                    onChange={e => setPuntasEje({
                      ...puntasEje,
                      [key]: { ...puntasEje[key], certificado: e.target.value }
                    })}
                    className="w-full p-2 border rounded" />
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
          <input type="text" value={puntasEje.empresaEnsayo}
            onChange={e => setPuntasEje({ ...puntasEje, empresaEnsayo: e.target.value })}
            className="w-full p-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
          <input type="date" value={puntasEje.fechaEnsayo}
            onChange={e => setPuntasEje({ ...puntasEje, fechaEnsayo: e.target.value })}
            className="w-full p-2 border rounded-lg" />
        </div>
      </div>
    </div>
  );

  const renderPasoAlineacion = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">Alineación de Ejes</h3>

      <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer">
        <input type="checkbox" checked={alineacion.realizada}
          onChange={e => setAlineacion({ ...alineacion, realizada: e.target.checked })}
          className="w-5 h-5 rounded" />
        <span className="font-medium">Alineación Realizada</span>
      </label>

      {alineacion.realizada && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm mb-3">Medición Inicial (mm)</h4>
              {[1, 2, 3].map(eje => (
                <div key={eje} className="flex items-center gap-2 mb-2">
                  <span className="text-sm w-12">Eje {eje}:</span>
                  <input type="number" step="0.1"
                    value={alineacion.medicionInicial[`eje${eje}` as keyof typeof alineacion.medicionInicial]}
                    onChange={e => setAlineacion({
                      ...alineacion,
                      medicionInicial: { ...alineacion.medicionInicial, [`eje${eje}`]: e.target.value }
                    })}
                    className="flex-1 p-2 border rounded text-sm" />
                </div>
              ))}
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm mb-3">Medición Final (mm)</h4>
              {[1, 2, 3].map(eje => (
                <div key={eje} className="flex items-center gap-2 mb-2">
                  <span className="text-sm w-12">Eje {eje}:</span>
                  <input type="number" step="0.1"
                    value={alineacion.medicionFinal[`eje${eje}` as keyof typeof alineacion.medicionFinal]}
                    onChange={e => setAlineacion({
                      ...alineacion,
                      medicionFinal: { ...alineacion.medicionFinal, [`eje${eje}`]: e.target.value }
                    })}
                    className="flex-1 p-2 border rounded text-sm" />
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 p-3 bg-green-50 rounded-lg cursor-pointer">
            <input type="checkbox" checked={alineacion.dentroTolerancias}
              onChange={e => setAlineacion({ ...alineacion, dentroTolerancias: e.target.checked })}
              className="w-5 h-5 rounded text-green-600" />
            <span className="text-green-700">Dentro de tolerancias permitidas</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° Certificado</label>
              <input type="text" value={alineacion.certificadoNumero}
                onChange={e => setAlineacion({ ...alineacion, certificadoNumero: e.target.value })}
                className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
              <input type="text" value={alineacion.empresaAlineacion}
                onChange={e => setAlineacion({ ...alineacion, empresaAlineacion: e.target.value })}
                className="w-full p-2 border rounded-lg" />
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderPasoResumen80K = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">Confirmación Mantenimiento 80K</h3>
      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
        El mantenimiento 160K incluye todos los ítems del 80K. Confirme que se completó el checklist 80K.
      </p>

      <label className="flex items-center gap-3 p-4 border-2 border-purple-200 bg-purple-50 rounded-lg cursor-pointer">
        <input type="checkbox" checked={mantenimiento80KCompletado}
          onChange={e => setMantenimiento80KCompletado(e.target.checked)}
          className="w-6 h-6 rounded text-purple-600" />
        <div>
          <span className="font-bold text-purple-800">Mantenimiento 80K Completado</span>
          <p className="text-sm text-purple-600">Accesorios, Anti Arrastre, Ejes, Frenos, Suspensión</p>
        </div>
      </label>

      {!mantenimiento80KCompletado && (
        <p className="text-red-600 text-sm">⚠️ Debe completar el mantenimiento 80K antes de finalizar el 160K</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones del 80K</label>
        <textarea value={observaciones80K} onChange={e => setObservaciones80K(e.target.value)}
          rows={3} className="w-full p-3 border rounded-lg"
          placeholder="Items no conformes, acciones realizadas, repuestos cambiados..." />
      </div>
    </div>
  );

  const renderPasoResumenFinal = () => {
    const resultado = calcularResultado();
    const ensayosOK = todosEnsayosAprobados();

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-800">Resumen Final - Mantenimiento 160K</h3>

        <div className={`p-6 rounded-xl text-center ${
          resultado === 'APTO' ? 'bg-green-100 border-2 border-green-500' :
          resultado === 'APTO_CON_OBSERVACIONES' ? 'bg-amber-100 border-2 border-amber-500' :
          'bg-red-100 border-2 border-red-500'
        }`}>
          <span className="text-4xl">{resultado === 'APTO' ? '✅' : resultado === 'APTO_CON_OBSERVACIONES' ? '⚠️' : '❌'}</span>
          <h4 className={`text-2xl font-bold mt-2 ${
            resultado === 'APTO' ? 'text-green-700' : resultado === 'APTO_CON_OBSERVACIONES' ? 'text-amber-700' : 'text-red-700'
          }`}>{resultado.replace(/_/g, ' ')}</h4>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className={`p-3 rounded-lg text-center ${ensayosOK ? 'bg-green-50' : 'bg-red-50'}`}>
            <span className="text-2xl">{ensayosOK ? '✓' : '✗'}</span>
            <p className={`text-sm font-medium ${ensayosOK ? 'text-green-700' : 'text-red-700'}`}>Ensayos ND</p>
          </div>
          <div className={`p-3 rounded-lg text-center ${mantenimiento80KCompletado ? 'bg-green-50' : 'bg-red-50'}`}>
            <span className="text-2xl">{mantenimiento80KCompletado ? '✓' : '✗'}</span>
            <p className={`text-sm font-medium ${mantenimiento80KCompletado ? 'text-green-700' : 'text-red-700'}`}>Mant. 80K</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Unidad:</strong> {unidadNumero}</div>
            <div><strong>Patente:</strong> {unidadPatente}</div>
            <div><strong>Kilometraje:</strong> {parseInt(kilometraje).toLocaleString()} km</div>
            <div><strong>Técnico:</strong> {tecnico}</div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones Generales</label>
          <textarea value={observacionesGenerales} onChange={e => setObservacionesGenerales(e.target.value)}
            rows={3} className="w-full p-3 border rounded-lg" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fotos de Evidencia</label>
          <input type="file" accept="image/*" multiple onChange={e => setFotosEvidencia(Array.from(e.target.files || []))}
            className="w-full p-2 border rounded-lg" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Certificados Adjuntos (PDF)</label>
          <input type="file" accept=".pdf" multiple onChange={e => setCertificadosAdjuntos(Array.from(e.target.files || []))}
            className="w-full p-2 border rounded-lg" />
        </div>
      </div>
    );
  };

  const renderPasoActual = () => {
    switch (pasoActual) {
      case 'datos': return renderPasoDatos();
      case 'engancheND': return renderPasoEngancheND();
      case 'rectificacion': return renderPasoRectificacion();
      case 'puntasEje': return renderPasoPuntasEje();
      case 'alineacion': return renderPasoAlineacion();
      case 'resumen80K': return renderPasoResumen80K();
      case 'resumenFinal': return renderPasoResumenFinal();
    }
  };

  const puedeAvanzar = () => {
    if (pasoActual === 'datos') return unidadNumero && kilometraje && tecnico;
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-lg">← Volver</button>
          <h1 className="font-bold">Mantenimiento 160K</h1>
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
          {pasoActual === 'resumenFinal' ? (
            <button onClick={guardarChecklist} disabled={loading || !mantenimiento80KCompletado}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium disabled:opacity-50">
              {loading ? 'Guardando...' : '✓ Guardar Mantenimiento 160K'}
            </button>
          ) : (
            <button onClick={irSiguiente} disabled={!puedeAvanzar()}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50">
              Siguiente →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChecklistTrenRodante160K;
