import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from 'recharts';

interface ValoresDiariosData {
  unidades: Array<{
    interno: string;
    porte: string;
    tipoTransporte: 'CROSSLOG' | 'FLETEROS';
    chofer: string;
    valoresDiarios: Array<{
      dia: number;
      valor: number;
      fecha: string;
    }>;
    totalMes: number;
    promedioDiario: number;
    diasActivos: number;
  }>;
  totalesPorDia: Array<{
    dia: number;
    total: number;
    fecha: string;
  }>;
  resumen: {
    totalMesCrosslog: number;
    totalMesFleteros: number;
    totalMesGeneral: number;
    mejorDia: { dia: number; valor: number; fecha: string };
    peorDia: { dia: number; valor: number; fecha: string };
    promedioGeneral: number;
    diasMantenimiento: number;
    diasSinServicio: number;
    diasViaje: number;
    diasConMantenimiento?: Array<{ dia: number; internos: string[] }>;
  };
}

interface Props {
  data: ValoresDiariosData | null;
  filtroTipoTransporte: string;
  mostrarSoloActivos: boolean;
  onChangeFiltroTipoTransporte: (value: string) => void;
  onChangeMostrarSoloActivos: (value: boolean) => void;
  onLoadMes?: (mes: string) => Promise<ValoresDiariosData | null>; // Callback para cargar datos de un mes
}

const ValoresDiariosChart: React.FC<Props> = ({
  data,
  filtroTipoTransporte,
  mostrarSoloActivos,
  onChangeFiltroTipoTransporte,
  onChangeMostrarSoloActivos,
  onLoadMes
}) => {
  const [diaSeleccionado, setDiaSeleccionado] = React.useState<number | null>(null);

  // Estado interno del calendario (independiente de filtros)
  const [calendarioMes, setCalendarioMes] = React.useState<string>(() => {
    // Inicializar con el mes de los datos actuales
    if (data && data.totalesPorDia.length > 0) {
      const primeraFecha = new Date(data.totalesPorDia[0].fecha);
      const anio = primeraFecha.getFullYear();
      const mes = String(primeraFecha.getMonth() + 1).padStart(2, '0');
      return `${anio}-${mes}`;
    }
    // Si no hay datos, usar mes actual
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  });

  const [datosCalendario, setDatosCalendario] = React.useState<ValoresDiariosData | null>(data);
  const [cargandoMes, setCargandoMes] = React.useState(false);

  // Estados para swipe/drag
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Actualizar datos del calendario cuando cambian los datos iniciales
  React.useEffect(() => {
    if (data) {
      setDatosCalendario(data);
      // Actualizar mes del calendario
      if (data.totalesPorDia.length > 0) {
        const primeraFecha = new Date(data.totalesPorDia[0].fecha);
        const anio = primeraFecha.getFullYear();
        const mes = String(primeraFecha.getMonth() + 1).padStart(2, '0');
        setCalendarioMes(`${anio}-${mes}`);
      }
    }
  }, [data]);

  if (!datosCalendario) return null;

  // Función para cargar mes anterior
  const getMesAnterior = async () => {
    const [anio, mes] = calendarioMes.split('-').map(Number);
    let nuevoMes = mes - 1;
    let nuevoAnio = anio;

    if (nuevoMes < 1) {
      nuevoMes = 12;
      nuevoAnio--;
    }

    const mesStr = String(nuevoMes).padStart(2, '0');
    const nuevoMesStr = `${nuevoAnio}-${mesStr}`;

    setCalendarioMes(nuevoMesStr);

    if (onLoadMes) {
      setCargandoMes(true);
      const nuevosDatos = await onLoadMes(nuevoMesStr);
      setDatosCalendario(nuevosDatos);
      setCargandoMes(false);
    }
  };

  // Función para cargar mes siguiente
  const getMesSiguiente = async () => {
    const [anio, mes] = calendarioMes.split('-').map(Number);
    let nuevoMes = mes + 1;
    let nuevoAnio = anio;

    if (nuevoMes > 12) {
      nuevoMes = 1;
      nuevoAnio++;
    }

    const mesStr = String(nuevoMes).padStart(2, '0');
    const nuevoMesStr = `${nuevoAnio}-${mesStr}`;

    setCalendarioMes(nuevoMesStr);

    if (onLoadMes) {
      setCargandoMes(true);
      const nuevosDatos = await onLoadMes(nuevoMesStr);
      setDatosCalendario(nuevosDatos);
      setCargandoMes(false);
    }
  };

  // Obtener nombre del mes del calendario
  const getNombreMes = () => {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const [anio, mes] = calendarioMes.split('-');
    const mesNum = parseInt(mes, 10);

    return `${monthNames[mesNum - 1]} ${anio}`;
  };

  // Detectar swipe/drag con mejor lógica
  React.useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const minSwipeDistance = 50;
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      setTouchStart(e.touches[0].clientX);
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStart) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = Math.abs(currentX - startX);
      const diffY = Math.abs(currentY - startY);

      // Si se mueve más horizontal que vertical, es un swipe
      if (diffX > diffY && diffX > 10) {
        setIsDragging(true);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart) return;

      const endX = e.changedTouches[0].clientX;
      const distance = touchStart - endX;

      if (Math.abs(distance) > minSwipeDistance) {
        if (distance > 0) {
          getMesSiguiente(); // Swipe left -> next month
        } else {
          getMesAnterior(); // Swipe right -> previous month
        }
      }

      setTouchStart(null);
      setTimeout(() => setIsDragging(false), 100);
    };

    const handleMouseDown = (e: MouseEvent) => {
      startX = e.clientX;
      setTouchStart(e.clientX);
      setIsDragging(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!touchStart) return;

      const diffX = Math.abs(e.clientX - startX);
      if (diffX > 10) {
        setIsDragging(true);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!touchStart) return;

      const distance = touchStart - e.clientX;

      if (Math.abs(distance) > minSwipeDistance) {
        if (distance > 0) {
          getMesSiguiente();
        } else {
          getMesAnterior();
        }
      }

      setTouchStart(null);
      setTimeout(() => setIsDragging(false), 100);
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
    };
  }, [touchStart, calendarioMes, onLoadMes]);

  // Filtrar totales por día seleccionado
  const totalesPorDiaFiltrados = diaSeleccionado !== null
    ? datosCalendario.totalesPorDia.filter((d: any) => d.dia === diaSeleccionado)
    : datosCalendario.totalesPorDia;

  // Filtrar unidades según filtros
  const unidadesFiltradas = datosCalendario.unidades.filter((unidad: any) => {
    // Filtro por tipo de transporte o interno específico
    if (filtroTipoTransporte !== 'todos') {
      // Cambio: CROSSLOG ahora se llama PROPIOS
      if (filtroTipoTransporte === 'PROPIOS') {
        if (unidad.tipoTransporte !== 'CROSSLOG') return false;
      } else if (filtroTipoTransporte === 'FLETEROS') {
        if (unidad.tipoTransporte !== 'FLETEROS') return false;
      } else {
        // Filtro por interno específico (54, 817, 62, 64, 813, 46/61, 45/803, 41/818)
        if (unidad.interno !== filtroTipoTransporte) return false;
      }
    }

    // Filtro solo activos
    if (mostrarSoloActivos && unidad.totalMes === 0) return false;

    return true;
  });

  return (
    <div id="chart-valores-diarios" className="bg-white rounded-xl shadow-lg p-4 md:p-6 mt-6 border-2 border-gray-300">
      <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="text-2xl">💰</span>
        Valores Generados por Día por Unidad
      </h3>

      {/* ========== DASHBOARD KPIs PROFESIONAL ========== */}

      <div className="bg-white border-2 border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Total General - Destacado */}
          <div className="md:col-span-1 bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-xl p-4 shadow-lg">
            <div className="text-xs uppercase tracking-wide opacity-75 mb-2">Total General</div>
            <div className="text-3xl font-bold mb-1">
              ${datosCalendario.resumen.totalMesGeneral.toLocaleString('es-AR', { maximumFractionDigits: 0 })}K
            </div>
            <div className="text-xs opacity-60">Promedio: ${datosCalendario.resumen.promedioGeneral.toLocaleString('es-AR', { maximumFractionDigits: 0 })}K/día</div>
          </div>

          {/* Total PROPIOS */}
          <div className="bg-gradient-to-br from-green-50 to-white border-2 border-green-500 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wide text-green-700 mb-2">Propios</div>
            <div className="text-2xl font-bold text-green-900">
              ${datosCalendario.resumen.totalMesCrosslog.toLocaleString('es-AR', { maximumFractionDigits: 0 })}K
            </div>
          </div>

          {/* Total FLETEROS */}
          <div className="bg-white border-2 border-gray-300 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wide text-gray-600 mb-2">Fleteros</div>
            <div className="text-2xl font-bold text-gray-900">
              ${datosCalendario.resumen.totalMesFleteros.toLocaleString('es-AR', { maximumFractionDigits: 0 })}K
            </div>
          </div>
        </div>

        {/* Indicadores secundarios */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t-2 border-gray-100">
          {/* Mejor Día */}
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-xs text-green-700 font-medium mb-1">Mejor Día</div>
            <div className="text-xl font-bold text-green-900">{datosCalendario.resumen.mejorDia.dia}</div>
            <div className="text-xs text-green-600">${datosCalendario.resumen.mejorDia.valor.toLocaleString('es-AR', { maximumFractionDigits: 0 })}K</div>
          </div>

          {/* Mantenimiento */}
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-300">
            <div className="text-xs text-red-700 font-medium mb-1">Mantenimiento</div>
            <div className="text-xl font-bold text-red-900">{datosCalendario.resumen.diasMantenimiento}</div>
            <div className="text-xs text-red-600">días</div>
          </div>

          {/* Sin Servicio */}
          <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-300">
            <div className="text-xs text-gray-600 font-medium mb-1">Sin Servicio</div>
            <div className="text-xl font-bold text-gray-900">{datosCalendario.resumen.diasSinServicio}</div>
            <div className="text-xs text-gray-600">días</div>
          </div>

          {/* En Viaje */}
          <div className="text-center p-3 bg-gray-900 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-300 font-medium mb-1">En Viaje</div>
            <div className="text-xl font-bold text-white">{datosCalendario.resumen.diasViaje}</div>
            <div className="text-xs text-gray-400">días</div>
          </div>
        </div>

        {/* Detalle de Días de Mantenimiento */}
        {datosCalendario.resumen.diasConMantenimiento && datosCalendario.resumen.diasConMantenimiento.length > 0 && (
          <div className="mt-4 pt-4 border-t-2 border-gray-100">
            <h5 className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">
              🔧 Detalle de Mantenimiento
            </h5>
            <div className="flex flex-wrap gap-2">
              {datosCalendario.resumen.diasConMantenimiento.map((dm) => (
                <div
                  key={dm.dia}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm"
                >
                  <span className="font-bold text-red-900">Día {dm.dia}:</span>
                  <span className="text-red-700">
                    {dm.internos.map((interno, idx) => (
                      <span key={idx}>
                        <span className="underline decoration-2 decoration-red-500">{interno}</span>
                        {idx < dm.internos.length - 1 && ', '}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Calendario Heatmap Interactivo */}
      <div
        ref={containerRef}
        className="mb-6 bg-gradient-to-br from-green-50 via-white to-green-50 rounded-xl p-4 md:p-6 border-2 border-green-300 shadow-md select-none"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-md font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">📅</span>
              {getNombreMes()}
              {cargandoMes && (
                <span className="text-xs text-blue-600 animate-pulse">Cargando...</span>
              )}
            </h4>
            <span className="text-xs text-gray-500 italic">
              ← Arrastra para cambiar →
            </span>
          </div>
          {diaSeleccionado && (
            <button
              onClick={() => setDiaSeleccionado(null)}
              className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-full hover:bg-red-600 transition-colors flex items-center gap-1"
            >
              <span>✕</span> Limpiar filtro
            </button>
          )}
        </div>

        {/* Mensaje si no hay datos para el mes */}
        {datosCalendario.totalesPorDia.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📭</div>
            <div className="text-lg font-bold text-gray-700 mb-2">No hay datos disponibles</div>
            <div className="text-sm text-gray-600">
              La hoja "Milanesa" solo contiene datos de <strong>Diciembre 2025</strong>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Arrastra para volver a Diciembre 2025 →
            </div>
          </div>
        ) : (
          <>
            {/* Grid del Calendario */}
            <div className="grid grid-cols-7 gap-2 mb-4 max-w-md mx-auto md:max-w-lg">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((dia, idx) => (
                <div key={idx} className="text-center text-xs font-bold text-green-700 pb-1">
                  {dia}
                </div>
              ))}

          {(() => {
            const maxValor = Math.max(...datosCalendario.totalesPorDia.map((d: any) => d.total));

            // Parsear fecha correctamente evitando problemas de zona horaria
            const primeraFecha = datosCalendario.totalesPorDia[0]?.fecha || '';
            const [anio, mes, dia] = primeraFecha.split('-').map(Number);
            const primerDia = new Date(anio, mes - 1, dia); // mes - 1 porque JavaScript cuenta meses desde 0
            const diaSemanaInicio = primerDia.getDay();

            const getColorIntensidad = (valor: number) => {
              if (valor === 0) return 'bg-gray-100 border-gray-300 text-gray-500';
              const porcentaje = (valor / maxValor) * 100;
              if (porcentaje < 25) return 'bg-green-200 border-green-300 text-green-900';
              if (porcentaje < 50) return 'bg-green-400 border-green-500 text-white';
              if (porcentaje < 75) return 'bg-green-600 border-green-700 text-white';
              return 'bg-green-800 border-green-900 text-white';
            };

            const celdas = [];

            // Celdas vacías antes del primer día
            for (let i = 0; i < diaSemanaInicio; i++) {
              celdas.push(
                <div key={`empty-${i}`} className="aspect-square"></div>
              );
            }

            // Días del mes
            datosCalendario.totalesPorDia.forEach((diaData: any) => {
              const esSeleccionado = diaSeleccionado === diaData.dia;
              const colorClasses = getColorIntensidad(diaData.total);

              // Formatear valor con separador de miles estilo argentino
              const formatearValor = (valor: number) => {
                if (valor === 0) return '$0';

                // Los valores ya vienen en miles desde la API
                // Ejemplo: 1283 → "1.283" → "$1.283k"
                // Ejemplo: 2111 → "2.111" → "$2.111k"
                const valorRedondeado = Math.floor(valor);
                const formateado = valorRedondeado.toLocaleString('es-AR');
                return `$${formateado}k`;
              };

              celdas.push(
                <div
                  key={diaData.dia}
                  className={`
                    aspect-square rounded-lg border-2 transition-all duration-200
                    flex flex-col items-center justify-center
                    ${colorClasses}
                  `}
                  title={`Día ${diaData.dia}: $${diaData.total.toLocaleString('es-AR')}`}
                >
                  <div className="text-[10px] md:text-xs font-bold">{diaData.dia}</div>
                  <div className="text-[7px] md:text-[9px] font-semibold">
                    {formatearValor(diaData.total)}
                  </div>
                </div>
              );
            });

            return celdas;
          })()}
            </div>

            {/* Leyenda */}
            <div className="flex items-center justify-center gap-4 text-xs text-gray-600 pt-3 border-t border-green-200">
              <span className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                Sin actividad
              </span>
              <span className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-200 border border-green-300 rounded"></div>
                Bajo
              </span>
              <span className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-400 border border-green-500 rounded"></div>
                Medio
              </span>
              <span className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-600 border border-green-700 rounded"></div>
                Alto
              </span>
              <span className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-800 border border-green-900 rounded"></div>
                Muy Alto
              </span>
            </div>
          </>
        )}
      </div>

      {/* Gráfico de Líneas: Evolución Diaria */}
      <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="text-md font-bold text-gray-800 mb-4">
          📊 Evolución de Valores por Día del Mes
          {diaSeleccionado && (
            <span className="ml-3 text-sm bg-amber-500 text-white px-3 py-1 rounded-full">
              Día {diaSeleccionado} seleccionado
            </span>
          )}
        </h4>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={totalesPorDiaFiltrados}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="dia"
              label={{ value: 'Día del Mes', position: 'insideBottom', offset: -5 }}
              style={{ fontSize: '12px' }}
            />
            <YAxis
              label={{ value: 'Valor ($)', angle: -90, position: 'insideLeft' }}
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '2px solid #a855f7', borderRadius: '8px' }}
              formatter={(value: any) => [`$${value.toLocaleString('es-AR')}`, 'Total']}
              labelFormatter={(label) => `Día ${label}`}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ fill: '#8b5cf6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Filtros */}
      <div className="mb-6 bg-white rounded-xl p-4 border-2 border-gray-300 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm font-semibold text-gray-800">Filtros:</span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={mostrarSoloActivos}
              onChange={(e) => onChangeMostrarSoloActivos(e.target.checked)}
              className="w-4 h-4 rounded border-gray-400 text-green-600 focus:ring-2 focus:ring-green-300"
            />
            <span className="text-sm font-medium text-gray-700">Solo unidades activas</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo / Interno</label>
            <select
              value={filtroTipoTransporte}
              onChange={(e) => onChangeFiltroTipoTransporte(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 bg-white text-gray-900 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all font-medium text-sm"
            >
              <option value="todos">Todos</option>
              <option value="PROPIOS">PROPIOS</option>
              <option value="FLETEROS">FLETEROS</option>
              <option value="54">54</option>
              <option value="817">817</option>
              <option value="62">62</option>
              <option value="64">64</option>
              <option value="813">813</option>
              <option value="46/61">46/61</option>
              <option value="45/803">45/803</option>
              <option value="41/818">41/818</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla Detallada por Unidad */}
      <div className="bg-white rounded-lg p-4 border-2 border-gray-300 shadow-sm">
        <h4 className="text-md font-bold text-gray-800 mb-4">
          📋 Detalle por Unidad
          {diaSeleccionado && (
            <span className="ml-3 text-sm bg-red-600 text-white px-3 py-1 rounded-full">
              Día {diaSeleccionado} seleccionado
            </span>
          )}
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-800 border-b-2 border-gray-600">
                <th className="px-4 py-3 text-left font-bold text-white">Chofer</th>
                <th className="px-4 py-3 text-left font-bold text-white">Unidad</th>
                <th className="px-4 py-3 text-left font-bold text-white">Tipo</th>
                <th className="px-4 py-3 text-right font-bold text-white">
                  {diaSeleccionado !== null ? `Valor Día ${diaSeleccionado}` : 'Total Mes'}
                </th>
                <th className="px-4 py-3 text-right font-bold text-white">
                  {diaSeleccionado !== null ? 'Valor' : 'Promedio Diario'}
                </th>
                <th className="px-4 py-3 text-right font-bold text-white">
                  {diaSeleccionado !== null ? 'Activo' : 'Días Activos'}
                </th>
                <th className="px-4 py-3 text-center font-bold text-white">Tendencia</th>
              </tr>
            </thead>
            <tbody>
              {unidadesFiltradas
                .sort((a: any, b: any) => {
                  // Si hay día seleccionado, ordenar por valor de ese día
                  if (diaSeleccionado !== null) {
                    const valorA = a.valoresDiarios.find((v: any) => v.dia === diaSeleccionado)?.valor || 0;
                    const valorB = b.valoresDiarios.find((v: any) => v.dia === diaSeleccionado)?.valor || 0;
                    return valorB - valorA;
                  }
                  // Si no, ordenar por total del mes
                  return b.totalMes - a.totalMes;
                })
                .map((unidad: any, idx: number) => {
                  const nombre = unidad.tipoTransporte === 'CROSSLOG'
                    ? `${unidad.interno} (${unidad.porte})`
                    : unidad.chofer;

                  // Calcular valores según filtro de día
                  const valorMostrar = diaSeleccionado !== null
                    ? unidad.valoresDiarios.find((v: any) => v.dia === diaSeleccionado)?.valor || 0
                    : unidad.totalMes;

                  const promedioDiarioMostrar = diaSeleccionado !== null
                    ? valorMostrar // Si es un día específico, mostrar el valor de ese día
                    : unidad.promedioDiario;

                  const diasActivosMostrar = diaSeleccionado !== null
                    ? (valorMostrar > 0 ? 1 : 0) // Si es un día específico, 1 si tuvo actividad, 0 si no
                    : unidad.diasActivos;

                  // Calcular tendencia (últimos 7 días vs primeros 7 días)
                  const valoresIniciales = unidad.valoresDiarios.slice(0, 7).reduce((s: number, d: any) => s + d.valor, 0);
                  const valoresFinales = unidad.valoresDiarios.slice(-7).reduce((s: number, d: any) => s + d.valor, 0);
                  const tendencia = valoresFinales > valoresIniciales ? 'up' : valoresFinales < valoresIniciales ? 'down' : 'stable';

                  return (
                    <tr
                      key={idx}
                      className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                        unidad.tipoTransporte === 'CROSSLOG' ? 'bg-green-50' : 'bg-white'
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{unidad.chofer}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{nombre}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          unidad.tipoTransporte === 'CROSSLOG'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-800'
                        }`}>
                          {unidad.tipoTransporte === 'CROSSLOG' ? 'PROPIOS' : 'FLETEROS'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        ${valorMostrar.toLocaleString('es-AR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        ${promedioDiarioMostrar.toLocaleString('es-AR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{diasActivosMostrar}</td>
                      <td className="px-4 py-3 text-center">
                        {tendencia === 'up' && <span className="text-green-600 text-lg" title="Tendencia al alza">↑</span>}
                        {tendencia === 'down' && <span className="text-red-600 text-lg" title="Tendencia a la baja">↓</span>}
                        {tendencia === 'stable' && <span className="text-gray-400 text-lg" title="Tendencia estable">→</span>}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {unidadesFiltradas.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay unidades que coincidan con los filtros seleccionados
          </div>
        )}
      </div>
    </div>
  );
};

export default ValoresDiariosChart;
