/**
 * PANEL DE CUBIERTAS - TALLER
 * Permite gestionar cubiertas: medir, cambiar, rotar, stock
 */

import { useState, useEffect } from 'react';
import { DiagramaVehiculo } from './DiagramaVehiculo';
import type {
  EstadoCubiertasUnidad,
  CubiertaEnPosicion,
  AuxilioSlot,
  Cubierta,
  TipoUsoCubierta,
  MotivoRetiro,
  DestinoRetiro,
} from '../../types/cubiertas';
import {
  calcularEstadoDesgaste,
  CONFIG_CUBIERTAS,
} from '../../types/cubiertas';
import {
  obtenerEstadoCubiertasUnidad,
  obtenerDatosUnidad,
  UNIDADES_CONFIG,
  registrarMedicion,
  obtenerCubiertasDisponibles,
  crearCubierta,
  instalarCubierta,
  retirarCubierta,
  eliminarCubierta,
} from '../../services/cubiertasService';
import { showSuccess, showError } from '../../utils/toast';

interface PanelCubiertasProps {
  unidadInicial?: string;
  onGenerarOT?: (datos: { unidadNumero: string; descripcion: string }) => void;
}

type TabActiva = 'unidad' | 'stock';

export function PanelCubiertas({ unidadInicial, onGenerarOT }: PanelCubiertasProps) {
  // Estados principales
  const [tabActiva, setTabActiva] = useState<TabActiva>('unidad');
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<string>(unidadInicial || '');
  const [estadoCubiertas, setEstadoCubiertas] = useState<EstadoCubiertasUnidad | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtroUnidad, setFiltroUnidad] = useState('');

  // Stock de cubiertas
  const [cubiertasStock, setCubiertasStock] = useState<Cubierta[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [filtroStock, setFiltroStock] = useState('');

  // Estados para modal de medición/instalación
  const [showModalMedicion, setShowModalMedicion] = useState(false);
  const [posicionSeleccionada, setPosicionSeleccionada] = useState<CubiertaEnPosicion | null>(null);
  const [modoModal, setModoModal] = useState<'medir' | 'instalar'>('medir');

  // Estados del formulario de medición
  const [profundidadMm, setProfundidadMm] = useState<string>('');
  const [presionBar, setPresionBar] = useState<string>('');
  const [observaciones, setObservaciones] = useState('');
  const [tecnico, setTecnico] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Estados para instalación
  const [cubiertaSeleccionadaInstalar, setCubiertaSeleccionadaInstalar] = useState<Cubierta | null>(null);
  const [kmUnidad, setKmUnidad] = useState('');

  // Estados para crear cubierta
  const [showModalCrearCubierta, setShowModalCrearCubierta] = useState(false);
  const [nuevaCubierta, setNuevaCubierta] = useState({
    codigo: '',
    marca: '',
    modelo: '',
    medida: '295/80 R22.5',
    dot: '',
    tipo: 'LINEAL' as 'LINEAL' | 'RECAPADA',
    tipoUso: 'MIXTA' as TipoUsoCubierta,
    profundidadInicial: '12',
  });

  // Estados para retirar cubierta
  const [showModalRetirar, setShowModalRetirar] = useState(false);
  const [cubiertaARetirar, setCubiertaARetirar] = useState<CubiertaEnPosicion | null>(null);
  const [motivoRetiro, setMotivoRetiro] = useState<MotivoRetiro>('CAMBIO');
  const [destinoRetiro, setDestinoRetiro] = useState<DestinoRetiro>('STOCK');
  const [kmRecorridos, setKmRecorridos] = useState('');

  // Cargar estado de cubiertas cuando cambia la unidad
  useEffect(() => {
    if (unidadSeleccionada) {
      cargarEstadoCubiertas();
    } else {
      setEstadoCubiertas(null);
    }
  }, [unidadSeleccionada]);

  // Cargar stock cuando cambia a tab stock
  useEffect(() => {
    if (tabActiva === 'stock') {
      cargarStock();
    }
  }, [tabActiva]);

  const cargarEstadoCubiertas = async () => {
    if (!unidadSeleccionada) return;

    setLoading(true);
    try {
      const estado = await obtenerEstadoCubiertasUnidad(unidadSeleccionada);
      setEstadoCubiertas(estado);
    } catch (error) {
      console.error('Error cargando estado cubiertas:', error);
      showError('Error al cargar estado de cubiertas');
    } finally {
      setLoading(false);
    }
  };

  const cargarStock = async () => {
    setLoadingStock(true);
    try {
      const disponibles = await obtenerCubiertasDisponibles();
      setCubiertasStock(disponibles);
    } catch (error) {
      console.error('Error cargando stock:', error);
      showError('Error al cargar stock de cubiertas');
    } finally {
      setLoadingStock(false);
    }
  };

  // Filtrar unidades para el selector
  const unidadesFiltradas = UNIDADES_CONFIG.filter(u =>
    u.numero.toLowerCase().includes(filtroUnidad.toLowerCase()) ||
    u.patente.toLowerCase().includes(filtroUnidad.toLowerCase())
  );

  // Filtrar stock
  const stockFiltrado = cubiertasStock.filter(c =>
    c.codigo.toLowerCase().includes(filtroStock.toLowerCase()) ||
    c.marca.toLowerCase().includes(filtroStock.toLowerCase()) ||
    c.medida.toLowerCase().includes(filtroStock.toLowerCase())
  );

  // Manejar click en posición de cubierta
  const handlePosicionClick = (posicionId: string, cubierta: CubiertaEnPosicion | null) => {
    if (!cubierta) return;
    setPosicionSeleccionada(cubierta);

    if (cubierta.cubierta) {
      // Si hay cubierta, modo medición
      setModoModal('medir');
      setProfundidadMm(cubierta.cubierta.ultimaProfundidadMm?.toString() || '');
    } else {
      // Si no hay cubierta, modo instalación
      setModoModal('instalar');
      cargarStock(); // Cargar stock para seleccionar
    }

    setPresionBar('');
    setObservaciones('');
    setShowModalMedicion(true);
  };

  // Manejar click en auxilio
  const handleAuxilioClick = (slot: number, auxilio: AuxilioSlot) => {
    console.log('Auxilio click:', slot, auxilio);
  };

  // Guardar medición
  const handleGuardarMedicion = async () => {
    if (!posicionSeleccionada || !profundidadMm || !tecnico || !estadoCubiertas) {
      showError('Complete todos los campos requeridos');
      return;
    }

    const profundidad = parseFloat(profundidadMm);
    if (isNaN(profundidad) || profundidad < 0 || profundidad > 20) {
      showError('Profundidad inválida (debe ser entre 0 y 20 mm)');
      return;
    }

    setGuardando(true);
    try {
      if (posicionSeleccionada.cubierta) {
        console.log('[PanelCubiertas] Guardando medición:', {
          cubiertaId: posicionSeleccionada.cubierta.id,
          profundidadMm: profundidad,
        });

        const resultado = await registrarMedicion({
          cubiertaId: posicionSeleccionada.cubierta.id,
          cubiertaCodigo: posicionSeleccionada.cubierta.codigo,
          unidadId: estadoCubiertas.unidadId,
          unidadNumero: estadoCubiertas.unidadNumero,
          posicion: posicionSeleccionada.posicion.id,
          fecha: new Date(),
          profundidadMm: profundidad,
          presionBar: presionBar ? parseFloat(presionBar) : null,
          estadoDesgaste: calcularEstadoDesgaste(profundidad),
          tecnico,
          observaciones: observaciones || '',
        });

        if (!resultado) {
          console.error('[PanelCubiertas] registrarMedicion retornó null');
          showError('Error al guardar en la base de datos');
          return;
        }

        console.log('[PanelCubiertas] ✅ Medición guardada:', resultado);
        showSuccess('Medición registrada correctamente');
        await cargarEstadoCubiertas();
      }

      setShowModalMedicion(false);
      resetFormulario();
    } catch (error) {
      console.error('[PanelCubiertas] Error guardando medición:', error);
      showError('Error al guardar medición');
    } finally {
      setGuardando(false);
    }
  };

  // Instalar cubierta
  const handleInstalarCubierta = async () => {
    if (!cubiertaSeleccionadaInstalar || !posicionSeleccionada || !estadoCubiertas || !tecnico) {
      showError('Seleccione una cubierta y complete los campos requeridos');
      return;
    }

    setGuardando(true);
    try {
      await instalarCubierta({
        cubiertaId: cubiertaSeleccionadaInstalar.id,
        cubiertaCodigo: cubiertaSeleccionadaInstalar.codigo,
        unidadId: estadoCubiertas.unidadId,
        unidadNumero: estadoCubiertas.unidadNumero,
        posicion: posicionSeleccionada.posicion.id,
        fecha: new Date(),
        kmUnidad: kmUnidad ? parseInt(kmUnidad) : 0,
        tecnico,
        observaciones: observaciones || undefined,
      });

      showSuccess(`Cubierta ${cubiertaSeleccionadaInstalar.codigo} instalada correctamente`);
      await cargarEstadoCubiertas();
      await cargarStock();

      setShowModalMedicion(false);
      resetFormulario();
    } catch (error) {
      console.error('Error instalando cubierta:', error);
      showError('Error al instalar cubierta');
    } finally {
      setGuardando(false);
    }
  };

  // Crear nueva cubierta
  const handleCrearCubierta = async () => {
    if (!nuevaCubierta.codigo || !nuevaCubierta.marca || !nuevaCubierta.medida) {
      showError('Complete los campos requeridos');
      return;
    }

    setGuardando(true);
    try {
      console.log('[PanelCubiertas] Creando cubierta:', nuevaCubierta.codigo);

      const resultado = await crearCubierta({
        codigo: nuevaCubierta.codigo.toUpperCase(),
        marca: nuevaCubierta.marca,
        modelo: nuevaCubierta.modelo || '',
        medida: nuevaCubierta.medida,
        dot: nuevaCubierta.dot || '', // Firestore no acepta undefined
        tipo: nuevaCubierta.tipo,
        tipoUso: nuevaCubierta.tipoUso,
        estado: nuevaCubierta.tipo === 'RECAPADA' ? 'RECAPADA' : 'NUEVA',
        kmTotales: 0,
        recapados: nuevaCubierta.tipo === 'RECAPADA' ? 1 : 0,
        ultimaProfundidadMm: parseFloat(nuevaCubierta.profundidadInicial) || 12,
        fechaAlta: new Date(),
        ultimaActualizacion: new Date(),
      });

      if (!resultado) {
        console.error('[PanelCubiertas] crearCubierta retornó null');
        showError('Error al guardar en la base de datos. Verifique las reglas de Firestore.');
        return;
      }

      console.log('[PanelCubiertas] Cubierta creada con ID:', resultado);
      showSuccess(`Cubierta ${nuevaCubierta.codigo} creada correctamente`);
      await cargarStock();
      setShowModalCrearCubierta(false);
      setNuevaCubierta({
        codigo: '',
        marca: '',
        modelo: '',
        medida: '295/80 R22.5',
        dot: '',
        tipo: 'LINEAL',
        tipoUso: 'MIXTA',
        profundidadInicial: '12',
      });
    } catch (error) {
      console.error('[PanelCubiertas] Error creando cubierta:', error);
      showError('Error al crear cubierta: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setGuardando(false);
    }
  };

  const resetFormulario = () => {
    setProfundidadMm('');
    setPresionBar('');
    setObservaciones('');
    setKmUnidad('');
    setPosicionSeleccionada(null);
    setCubiertaSeleccionadaInstalar(null);
  };

  // Abrir modal de retiro
  const abrirModalRetirar = (cubierta: CubiertaEnPosicion) => {
    setCubiertaARetirar(cubierta);
    setMotivoRetiro('CAMBIO');
    setDestinoRetiro('STOCK');
    setKmRecorridos('');
    setObservaciones('');
    setShowModalRetirar(true);
  };

  // Retirar cubierta
  const handleRetirarCubierta = async () => {
    if (!cubiertaARetirar || !cubiertaARetirar.cubierta || !estadoCubiertas || !tecnico) {
      showError('Complete todos los campos requeridos');
      return;
    }

    setGuardando(true);
    try {
      console.log('[PanelCubiertas] Retirando cubierta:', cubiertaARetirar.cubierta.codigo);

      const resultado = await retirarCubierta({
        cubiertaId: cubiertaARetirar.cubierta.id,
        cubiertaCodigo: cubiertaARetirar.cubierta.codigo,
        unidadId: estadoCubiertas.unidadId,
        unidadNumero: estadoCubiertas.unidadNumero,
        posicion: cubiertaARetirar.posicion.id,
        fecha: new Date(),
        kmUnidad: kmUnidad ? parseInt(kmUnidad) : 0,
        kmRecorridos: kmRecorridos ? parseInt(kmRecorridos) : 0,
        motivoRetiro,
        destinoRetiro,
        tecnico,
        observaciones: observaciones || '',
      });

      if (!resultado) {
        showError('Error al retirar cubierta');
        return;
      }

      const destinoTexto = destinoRetiro === 'STOCK' ? 'devuelta al stock' :
                          destinoRetiro === 'BAJA' ? 'dada de baja' : 'enviada a recapado';
      showSuccess(`Cubierta ${cubiertaARetirar.cubierta.codigo} retirada y ${destinoTexto}`);

      await cargarEstadoCubiertas();
      await cargarStock();
      setShowModalRetirar(false);
      setCubiertaARetirar(null);
    } catch (error) {
      console.error('[PanelCubiertas] Error retirando cubierta:', error);
      showError('Error al retirar cubierta');
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar cubierta del stock
  const handleEliminarCubierta = async (cubierta: Cubierta) => {
    if (!confirm(`¿Está seguro de eliminar la cubierta ${cubierta.codigo}? Esta acción la marcará como BAJA.`)) {
      return;
    }

    try {
      const resultado = await eliminarCubierta(cubierta.id);
      if (resultado) {
        showSuccess(`Cubierta ${cubierta.codigo} eliminada (dada de baja)`);
        await cargarStock();
      } else {
        showError('Error al eliminar cubierta');
      }
    } catch (error) {
      console.error('[PanelCubiertas] Error eliminando cubierta:', error);
      showError('Error al eliminar cubierta');
    }
  };

  // Calcular estado visual de la profundidad
  const getEstadoVisual = (mm: number) => {
    if (mm >= CONFIG_CUBIERTAS.UMBRAL_BUENO) return { color: 'text-green-600', bg: 'bg-green-100', label: 'BUENO' };
    if (mm >= CONFIG_CUBIERTAS.UMBRAL_CRITICO) return { color: 'text-amber-600', bg: 'bg-amber-100', label: 'REGULAR' };
    return { color: 'text-red-600', bg: 'bg-red-100', label: 'CRÍTICO' };
  };

  const datosUnidad = unidadSeleccionada ? obtenerDatosUnidad(unidadSeleccionada) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a2332] to-[#2d3748] rounded-xl p-4 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
                <circle cx="12" cy="12" r="3" strokeWidth={2} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold">Control de Cubiertas</h2>
              <p className="text-sm text-gray-300">Gestión y medición de neumáticos</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setTabActiva('unidad')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tabActiva === 'unidad'
                  ? 'bg-white text-gray-800'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Por Unidad
            </button>
            <button
              onClick={() => setTabActiva('stock')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tabActiva === 'stock'
                  ? 'bg-white text-gray-800'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Stock Cubiertas
            </button>
          </div>
        </div>
      </div>

      {/* TAB: Por Unidad */}
      {tabActiva === 'unidad' && (
        <>
          {/* Selector de Unidad */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Seleccionar Unidad
            </label>
            <div className="relative">
              <input
                type="text"
                value={filtroUnidad}
                onChange={(e) => setFiltroUnidad(e.target.value)}
                placeholder="Buscar por número o patente..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {filtroUnidad && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {unidadesFiltradas.length > 0 ? (
                    unidadesFiltradas.map(unidad => (
                      <button
                        key={unidad.numero}
                        onClick={() => {
                          setUnidadSeleccionada(unidad.numero);
                          setFiltroUnidad('');
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center justify-between ${
                          unidadSeleccionada === unidad.numero ? 'bg-blue-100' : ''
                        }`}
                      >
                        <span className="font-semibold">INT-{unidad.numero}</span>
                        <span className="text-gray-500 text-sm">{unidad.patente}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-500">No se encontraron unidades</div>
                  )}
                </div>
              )}
            </div>

            {/* Unidad seleccionada */}
            {unidadSeleccionada && datosUnidad && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-blue-800">INT-{unidadSeleccionada}</span>
                  <span className="text-blue-600 ml-2">{datosUnidad.patente}</span>
                  <span className="text-blue-500 ml-2 text-sm">({datosUnidad.sector.toUpperCase()})</span>
                </div>
                <button
                  onClick={() => setUnidadSeleccionada('')}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-gray-600">Cargando estado de cubiertas...</p>
            </div>
          )}

          {/* Diagrama y estado */}
          {!loading && estadoCubiertas && (
            <>
              {/* Resumen de alertas */}
              {(estadoCubiertas.alertasCriticas > 0 || estadoCubiertas.alertasRegulares > 0) && (
                <div className={`rounded-xl p-4 ${
                  estadoCubiertas.alertasCriticas > 0 ? 'bg-red-50 border-2 border-red-200' : 'bg-amber-50 border-2 border-amber-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      estadoCubiertas.alertasCriticas > 0 ? 'bg-red-500' : 'bg-amber-500'
                    }`}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className={`font-bold ${estadoCubiertas.alertasCriticas > 0 ? 'text-red-800' : 'text-amber-800'}`}>
                        {estadoCubiertas.alertasCriticas > 0
                          ? `${estadoCubiertas.alertasCriticas} cubierta(s) en estado CRÍTICO`
                          : `${estadoCubiertas.alertasRegulares} cubierta(s) con desgaste regular`
                        }
                      </p>
                      <p className={`text-sm ${estadoCubiertas.alertasCriticas > 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {estadoCubiertas.alertasCriticas > 0 ? 'Requieren cambio inmediato' : 'Programar revisión pronto'}
                      </p>
                    </div>
                    {onGenerarOT && estadoCubiertas.alertasCriticas > 0 && (
                      <button
                        onClick={() => onGenerarOT({
                          unidadNumero: estadoCubiertas.unidadNumero,
                          descripcion: `Cambio de ${estadoCubiertas.alertasCriticas} cubierta(s) en estado crítico`
                        })}
                        className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm"
                      >
                        Generar OT
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Diagrama del vehículo */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  Diagrama de Cubiertas
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Toca una posición para medir o instalar cubierta
                </p>
                <DiagramaVehiculo
                  configuracion={estadoCubiertas.configuracion}
                  cubiertas={estadoCubiertas.cubiertas}
                  auxilios={estadoCubiertas.auxilios}
                  onPosicionClick={handlePosicionClick}
                  onAuxilioClick={handleAuxilioClick}
                  mostrarNumeros={true}
                />
              </div>

              {/* Lista de cubiertas */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Detalle de Cubiertas ({estadoCubiertas.cubiertasInstaladas}/{estadoCubiertas.totalCubiertas})
                </h3>
                <div className="space-y-2">
                  {estadoCubiertas.cubiertas.map((cp) => (
                    <div
                      key={cp.posicion.id}
                      className={`p-3 rounded-lg border transition-all hover:shadow-md ${
                        cp.estadoDesgaste === 'CRITICO' ? 'border-red-300 bg-red-50' :
                        cp.estadoDesgaste === 'REGULAR' ? 'border-amber-300 bg-amber-50' :
                        cp.estadoDesgaste === 'BUENO' ? 'border-green-300 bg-green-50' :
                        'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                          onClick={() => handlePosicionClick(cp.posicion.id, cp)}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            cp.estadoDesgaste === 'CRITICO' ? 'bg-red-500' :
                            cp.estadoDesgaste === 'REGULAR' ? 'bg-amber-500' :
                            cp.estadoDesgaste === 'BUENO' ? 'bg-green-500' :
                            'bg-gray-400'
                          }`}>
                            {cp.posicion.numero}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{cp.posicion.label}</p>
                            {cp.cubierta ? (
                              <p className="text-xs text-gray-500">
                                {cp.cubierta.codigo} - {cp.cubierta.marca} {cp.cubierta.medida}
                              </p>
                            ) : (
                              <p className="text-xs text-orange-500 font-medium">+ Toca para instalar</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {cp.cubierta?.ultimaProfundidadMm !== undefined && (
                            <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                              getEstadoVisual(cp.cubierta.ultimaProfundidadMm).bg
                            } ${getEstadoVisual(cp.cubierta.ultimaProfundidadMm).color}`}>
                              {cp.cubierta.ultimaProfundidadMm} mm
                            </div>
                          )}
                          {cp.cubierta && (
                            <button
                              onClick={(e) => { e.stopPropagation(); abrirModalRetirar(cp); }}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Retirar cubierta"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Estado vacío */}
          {!loading && !estadoCubiertas && !unidadSeleccionada && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth={2} />
                  <circle cx="12" cy="12" r="3" strokeWidth={2} />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">Selecciona una unidad</p>
              <p className="text-gray-400 text-sm mt-1">para ver el estado de sus cubiertas</p>
            </div>
          )}
        </>
      )}

      {/* TAB: Stock de Cubiertas */}
      {tabActiva === 'stock' && (
        <div className="space-y-4">
          {/* Resumen de stock */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-2xl font-bold text-gray-800">{cubiertasStock.length}</p>
              <p className="text-xs text-gray-500">Disponibles</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-green-200 p-4">
              <p className="text-2xl font-bold text-green-600">
                {cubiertasStock.filter(c => c.tipo === 'LINEAL').length}
              </p>
              <p className="text-xs text-gray-500">Lineales</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4">
              <p className="text-2xl font-bold text-blue-600">
                {cubiertasStock.filter(c => c.tipo === 'RECAPADA').length}
              </p>
              <p className="text-xs text-gray-500">Recapadas</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-4">
              <p className="text-2xl font-bold text-purple-600">
                {cubiertasStock.filter(c => c.estado === 'EN_RECAPADO').length}
              </p>
              <p className="text-xs text-gray-500">En Recapado</p>
            </div>
          </div>

          {/* Acciones y búsqueda */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <input
                type="text"
                value={filtroStock}
                onChange={(e) => setFiltroStock(e.target.value)}
                placeholder="Buscar cubierta..."
                className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => setShowModalCrearCubierta(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva Cubierta
              </button>
              <button
                onClick={cargarStock}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Lista de cubiertas en stock */}
          {loadingStock ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-gray-600">Cargando stock...</p>
            </div>
          ) : stockFiltrado.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">No hay cubiertas en stock</p>
              <p className="text-gray-400 text-sm mt-1">Crea una nueva cubierta para comenzar</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {stockFiltrado.map((cubierta) => (
                  <div key={cubierta.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          cubierta.tipo === 'LINEAL' ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          <svg className={`w-6 h-6 ${cubierta.tipo === 'LINEAL' ? 'text-green-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="9" strokeWidth={2} />
                            <circle cx="12" cy="12" r="3" strokeWidth={2} />
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{cubierta.codigo}</p>
                          <p className="text-sm text-gray-500">{cubierta.marca} - {cubierta.medida}</p>
                          <div className="flex gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              cubierta.tipo === 'LINEAL' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {cubierta.tipo}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              cubierta.estado === 'NUEVA' ? 'bg-emerald-100 text-emerald-700' :
                              cubierta.estado === 'RECAPADA' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {cubierta.estado}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {cubierta.ultimaProfundidadMm !== undefined && (
                            <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                              getEstadoVisual(cubierta.ultimaProfundidadMm).bg
                            } ${getEstadoVisual(cubierta.ultimaProfundidadMm).color}`}>
                              {cubierta.ultimaProfundidadMm} mm
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-1">{cubierta.kmTotales.toLocaleString()} km</p>
                        </div>
                        <button
                          onClick={() => handleEliminarCubierta(cubierta)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Eliminar cubierta"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Medición/Instalación */}
      {showModalMedicion && posicionSeleccionada && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4"
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className={`${modoModal === 'instalar' ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'} text-white p-4 rounded-t-2xl`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="font-bold">{posicionSeleccionada.posicion.numero}</span>
                  </div>
                  <div>
                    <h3 className="font-bold">
                      {modoModal === 'instalar' ? 'Instalar Cubierta' : 'Registrar Medición'}
                    </h3>
                    <p className="text-sm opacity-80">{posicionSeleccionada.posicion.label}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModalMedicion(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-4 space-y-4">
              {/* MODO INSTALAR */}
              {modoModal === 'instalar' && (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-amber-700 font-medium">Posición vacía</p>
                    <p className="text-amber-600 text-sm">Selecciona una cubierta del stock para instalar</p>
                  </div>

                  {/* Selector de cubierta */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Seleccionar Cubierta del Stock *
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                      {loadingStock ? (
                        <div className="p-4 text-center text-gray-500">Cargando...</div>
                      ) : cubiertasStock.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No hay cubiertas disponibles.
                          <button
                            onClick={() => {
                              setShowModalMedicion(false);
                              setShowModalCrearCubierta(true);
                            }}
                            className="block mt-2 text-blue-600 hover:underline"
                          >
                            Crear nueva cubierta
                          </button>
                        </div>
                      ) : (
                        cubiertasStock
                          .filter(c => {
                            // Si es eje de dirección, solo permitir lineales
                            if (posicionSeleccionada.posicion.soloLineal && c.tipo === 'RECAPADA') {
                              return false;
                            }
                            return true;
                          })
                          .map((cubierta) => (
                            <button
                              key={cubierta.id}
                              onClick={() => setCubiertaSeleccionadaInstalar(cubierta)}
                              className={`w-full p-3 text-left hover:bg-blue-50 transition-colors ${
                                cubiertaSeleccionadaInstalar?.id === cubierta.id ? 'bg-blue-100' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-gray-800">{cubierta.codigo}</p>
                                  <p className="text-xs text-gray-500">{cubierta.marca} - {cubierta.medida}</p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  cubierta.tipo === 'LINEAL' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {cubierta.tipo}
                                </span>
                              </div>
                            </button>
                          ))
                      )}
                    </div>
                    {posicionSeleccionada.posicion.soloLineal && (
                      <p className="text-xs text-orange-600 mt-1">
                        * Eje de dirección: Solo cubiertas lineales
                      </p>
                    )}
                  </div>

                  {/* Km de la unidad */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Kilometraje actual de la unidad
                    </label>
                    <input
                      type="number"
                      value={kmUnidad}
                      onChange={(e) => setKmUnidad(e.target.value)}
                      placeholder="Ej: 150000"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  {/* Técnico */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Técnico *
                    </label>
                    <input
                      type="text"
                      value={tecnico}
                      onChange={(e) => setTecnico(e.target.value)}
                      placeholder="Nombre del técnico"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Observaciones
                    </label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Notas adicionales..."
                      rows={2}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                    />
                  </div>
                </>
              )}

              {/* MODO MEDIR */}
              {modoModal === 'medir' && posicionSeleccionada.cubierta && (
                <>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">Cubierta actual</p>
                    <p className="font-semibold text-gray-800">
                      {posicionSeleccionada.cubierta.codigo} - {posicionSeleccionada.cubierta.marca}
                    </p>
                    <p className="text-sm text-gray-600">{posicionSeleccionada.cubierta.medida}</p>
                  </div>

                  {/* Profundidad */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Profundidad del dibujo (mm) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="20"
                      value={profundidadMm}
                      onChange={(e) => setProfundidadMm(e.target.value)}
                      placeholder="Ej: 7.5"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    />
                    {profundidadMm && (
                      <div className={`mt-2 p-2 rounded-lg ${getEstadoVisual(parseFloat(profundidadMm)).bg}`}>
                        <span className={`font-semibold ${getEstadoVisual(parseFloat(profundidadMm)).color}`}>
                          Estado: {getEstadoVisual(parseFloat(profundidadMm)).label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Presión */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Presión (bar) - Opcional
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="15"
                      value={presionBar}
                      onChange={(e) => setPresionBar(e.target.value)}
                      placeholder="Ej: 8.5"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Técnico */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Técnico *
                    </label>
                    <input
                      type="text"
                      value={tecnico}
                      onChange={(e) => setTecnico(e.target.value)}
                      placeholder="Nombre del técnico"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Observaciones
                    </label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Notas adicionales..."
                      rows={2}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowModalMedicion(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              {modoModal === 'instalar' ? (
                <button
                  onClick={handleInstalarCubierta}
                  disabled={guardando || !cubiertaSeleccionadaInstalar || !tecnico}
                  className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {guardando ? 'Instalando...' : 'Instalar'}
                </button>
              ) : (
                <button
                  onClick={handleGuardarMedicion}
                  disabled={guardando || !profundidadMm || !tecnico}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {guardando ? 'Guardando...' : 'Guardar Medición'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Cubierta */}
      {showModalCrearCubierta && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4"
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold">Nueva Cubierta</h3>
                    <p className="text-sm text-green-100">Agregar al inventario</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModalCrearCubierta(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-4 space-y-4">
              {/* Código */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Código de Cubierta *
                </label>
                <input
                  type="text"
                  value={nuevaCubierta.codigo}
                  onChange={(e) => setNuevaCubierta({...nuevaCubierta, codigo: e.target.value})}
                  placeholder="Ej: CUB-001"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 uppercase"
                />
              </div>

              {/* Marca */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Marca *
                </label>
                <input
                  type="text"
                  value={nuevaCubierta.marca}
                  onChange={(e) => setNuevaCubierta({...nuevaCubierta, marca: e.target.value})}
                  placeholder="Ej: Firestone, Michelin, Pirelli"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Modelo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Modelo
                </label>
                <input
                  type="text"
                  value={nuevaCubierta.modelo}
                  onChange={(e) => setNuevaCubierta({...nuevaCubierta, modelo: e.target.value})}
                  placeholder="Ej: FD663"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Medida */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Medida *
                </label>
                <select
                  value={nuevaCubierta.medida}
                  onChange={(e) => setNuevaCubierta({...nuevaCubierta, medida: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="295/80 R22.5">295/80 R22.5</option>
                  <option value="275/80 R22.5">275/80 R22.5</option>
                  <option value="315/80 R22.5">315/80 R22.5</option>
                  <option value="11R22.5">11R22.5</option>
                  <option value="12R22.5">12R22.5</option>
                </select>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Estado *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNuevaCubierta({...nuevaCubierta, tipo: 'LINEAL'})}
                    className={`p-3 rounded-lg border-2 font-semibold transition-colors ${
                      nuevaCubierta.tipo === 'LINEAL'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Nueva (Lineal)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNuevaCubierta({...nuevaCubierta, tipo: 'RECAPADA'})}
                    className={`p-3 rounded-lg border-2 font-semibold transition-colors ${
                      nuevaCubierta.tipo === 'RECAPADA'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Recapada
                  </button>
                </div>
              </div>

              {/* Tipo de Uso */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de Uso (Posición) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNuevaCubierta({...nuevaCubierta, tipoUso: 'DIRECCIONAL'})}
                    className={`p-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      nuevaCubierta.tipoUso === 'DIRECCIONAL'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Direccional
                  </button>
                  <button
                    type="button"
                    onClick={() => setNuevaCubierta({...nuevaCubierta, tipoUso: 'TRACCION'})}
                    className={`p-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      nuevaCubierta.tipoUso === 'TRACCION'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Tracción
                  </button>
                  <button
                    type="button"
                    onClick={() => setNuevaCubierta({...nuevaCubierta, tipoUso: 'LIBRE'})}
                    className={`p-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      nuevaCubierta.tipoUso === 'LIBRE'
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Libre/Remolque
                  </button>
                  <button
                    type="button"
                    onClick={() => setNuevaCubierta({...nuevaCubierta, tipoUso: 'MIXTA'})}
                    className={`p-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      nuevaCubierta.tipoUso === 'MIXTA'
                        ? 'border-gray-500 bg-gray-100 text-gray-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Mixta
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {nuevaCubierta.tipoUso === 'DIRECCIONAL' && 'Eje delantero - canales longitudinales'}
                  {nuevaCubierta.tipoUso === 'TRACCION' && 'Eje trasero motor - tacos profundos'}
                  {nuevaCubierta.tipoUso === 'LIBRE' && 'Acoplados/semis - cargas pesadas'}
                  {nuevaCubierta.tipoUso === 'MIXTA' && 'Multiposición - versátil'}
                </p>
              </div>

              {/* DOT */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Código DOT (opcional)
                </label>
                <input
                  type="text"
                  value={nuevaCubierta.dot}
                  onChange={(e) => setNuevaCubierta({...nuevaCubierta, dot: e.target.value})}
                  placeholder="Ej: 2523 (semana 25, año 2023)"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Profundidad inicial */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Profundidad inicial (mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={nuevaCubierta.profundidadInicial}
                  onChange={(e) => setNuevaCubierta({...nuevaCubierta, profundidadInicial: e.target.value})}
                  placeholder="12"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowModalCrearCubierta(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearCubierta}
                disabled={guardando || !nuevaCubierta.codigo || !nuevaCubierta.marca}
                className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {guardando ? 'Creando...' : 'Crear Cubierta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Retirar Cubierta */}
      {showModalRetirar && cubiertaARetirar && cubiertaARetirar.cubierta && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold">Retirar Cubierta</h3>
                    <p className="text-sm text-red-100">{cubiertaARetirar.cubierta.codigo}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModalRetirar(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-4 space-y-4">
              {/* Info de la cubierta */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-500">Cubierta a retirar</p>
                <p className="font-bold text-gray-800">
                  {cubiertaARetirar.cubierta.codigo} - {cubiertaARetirar.cubierta.marca}
                </p>
                <p className="text-sm text-gray-600">
                  Posición: {cubiertaARetirar.posicion.label}
                </p>
              </div>

              {/* Motivo de retiro */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Motivo del retiro *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'CAMBIO', label: 'Cambio (desgaste)', color: 'amber' },
                    { value: 'EXPLOTO', label: 'Explotó', color: 'red' },
                    { value: 'AGRIETADA', label: 'Agrietada', color: 'orange' },
                    { value: 'RESECA', label: 'Reseca', color: 'yellow' },
                    { value: 'SOPLADA', label: 'Soplada/Pinchada', color: 'pink' },
                    { value: 'RECAPADO', label: 'A recapar', color: 'blue' },
                  ].map((motivo) => (
                    <button
                      key={motivo.value}
                      type="button"
                      onClick={() => setMotivoRetiro(motivo.value as MotivoRetiro)}
                      className={`p-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                        motivoRetiro === motivo.value
                          ? `border-${motivo.color}-500 bg-${motivo.color}-50 text-${motivo.color}-700`
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {motivo.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destino */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Destino de la cubierta *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDestinoRetiro('STOCK')}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      destinoRetiro === 'STOCK'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestinoRetiro('RECAPADO')}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      destinoRetiro === 'RECAPADO'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Recapado
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestinoRetiro('BAJA')}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      destinoRetiro === 'BAJA'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Baja
                  </button>
                </div>
              </div>

              {/* Km recorridos */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Km recorridos en esta instalación
                </label>
                <input
                  type="number"
                  value={kmRecorridos}
                  onChange={(e) => setKmRecorridos(e.target.value)}
                  placeholder="Ej: 50000"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* Km unidad actual */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Km actual de la unidad
                </label>
                <input
                  type="number"
                  value={kmUnidad}
                  onChange={(e) => setKmUnidad(e.target.value)}
                  placeholder="Ej: 150000"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* Técnico */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Técnico *
                </label>
                <input
                  type="text"
                  value={tecnico}
                  onChange={(e) => setTecnico(e.target.value)}
                  placeholder="Nombre del técnico"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Notas adicionales..."
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowModalRetirar(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRetirarCubierta}
                disabled={guardando || !tecnico}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {guardando ? 'Retirando...' : 'Retirar Cubierta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PanelCubiertas;
