import { useState, useRef, useEffect } from 'react';

interface Mensaje {
  rol: 'usuario' | 'asistente';
  texto: string;
}

interface Props {
  dataMensual: any[];
  dataIndicadores: any;
  dataValoresDiarios: any;
}

const PREGUNTAS_FIJAS = [
  '¿Qué unidad o fletero recomendás incorporar según la demanda actual?',
  '¿Cuál es la tendencia de viajes en los últimos 6 meses?',
  '¿Qué cliente tuvo mayor crecimiento interanual?',
  '¿Cuáles son los meses de mayor y menor actividad histórica?',
  '¿Qué unidades propias tuvieron menor rendimiento este año?',
];

function construirContexto(dataMensual: any[], dataIndicadores: any, dataValoresDiarios: any): string {
  const partes: string[] = [];

  // Viajes mensuales históricos
  if (dataMensual?.length > 0) {
    const resumen = dataMensual
      .map((d: any) => `${d.mes}: ${d.viajes} viajes`)
      .join(', ');
    partes.push(`VIAJES POR MES (histórico completo):\n${resumen}`);
  }

  // Indicadores generales
  if (dataIndicadores) {
    const { totalViajes, topFleteros, topClientes, topInternos, tiposUnidad } = dataIndicadores;

    if (totalViajes !== undefined) {
      partes.push(`TOTAL VIAJES EN PERÍODO SELECCIONADO: ${totalViajes}`);
    }

    if (topFleteros?.length > 0) {
      const lista = topFleteros.slice(0, 10).map((f: any) => `${f.nombre}: ${f.viajes} viajes`).join(', ');
      partes.push(`TOP FLETEROS:\n${lista}`);
    }

    if (topClientes?.length > 0) {
      const lista = topClientes.slice(0, 10).map((c: any) => `${c.nombre}: ${c.viajes} viajes`).join(', ');
      partes.push(`TOP CLIENTES:\n${lista}`);
    }

    if (topInternos?.length > 0) {
      const lista = topInternos.slice(0, 10).map((i: any) => `${i.interno}: ${i.viajes} viajes`).join(', ');
      partes.push(`TOP UNIDADES PROPIAS (internos):\n${lista}`);
    }

    if (tiposUnidad?.length > 0) {
      const lista = tiposUnidad.map((t: any) => `${t.tipo}: ${t.viajes} viajes`).join(', ');
      partes.push(`VIAJES POR TIPO DE UNIDAD:\n${lista}`);
    }
  }

  // Valores diarios de distribución (resumen)
  if (dataValoresDiarios?.unidades?.length > 0) {
    const top = dataValoresDiarios.unidades
      .sort((a: any, b: any) => b.totalMes - a.totalMes)
      .slice(0, 8)
      .map((u: any) => `${u.interno || u.chofer} (${u.tipoTransporte}): $${u.totalMes.toFixed(0)}k total mes, ${u.diasActivos} días activos`)
      .join('\n');
    partes.push(`DISTRIBUCIÓN DEL MES (valores por unidad):\n${top}`);
  }

  return partes.join('\n\n') || 'No hay datos cargados aún.';
}

function generarSugerenciasDinamicas(dataMensual: any[], dataIndicadores: any): string[] {
  const sugerencias: string[] = [];

  if (dataMensual?.length >= 2) {
    // Detectar mes con mayor caída
    const recientes = dataMensual.slice(-6);
    let mayorCaida = { mes: '', delta: 0 };
    for (let i = 1; i < recientes.length; i++) {
      const delta = recientes[i - 1].viajes - recientes[i].viajes;
      if (delta > mayorCaida.delta) {
        mayorCaida = { mes: recientes[i].mes, delta };
      }
    }
    if (mayorCaida.delta > 20) {
      sugerencias.push(`${mayorCaida.mes} tuvo una caída de ${mayorCaida.delta} viajes — ¿qué causó esa baja?`);
    }

    // Comparar año actual vs anterior
    const anioActual = new Date().getFullYear();
    const mesActual = new Date().getMonth() + 1;
    const viajesActual = dataMensual
      .filter((d: any) => {
        const partes = d.mes?.split(' ');
        return partes && parseInt(partes[partes.length - 1]) === anioActual && parseMesNum(partes[0]) <= mesActual;
      })
      .reduce((s: number, d: any) => s + (d.viajes || 0), 0);

    const viajesAnterior = dataMensual
      .filter((d: any) => {
        const partes = d.mes?.split(' ');
        return partes && parseInt(partes[partes.length - 1]) === anioActual - 1 && parseMesNum(partes[0]) <= mesActual;
      })
      .reduce((s: number, d: any) => s + (d.viajes || 0), 0);

    if (viajesActual > 0 && viajesAnterior > 0) {
      const diff = Math.round(((viajesActual - viajesAnterior) / viajesAnterior) * 100);
      const signo = diff >= 0 ? '+' : '';
      sugerencias.push(`Viajes ${anioActual} vs ${anioActual - 1} (mismo período): ${signo}${diff}% — ¿analizamos la evolución?`);
    }
  }

  if (dataIndicadores?.topFleteros?.length > 0) {
    const top = dataIndicadores.topFleteros[0];
    sugerencias.push(`${top.nombre} lidera con ${top.viajes} viajes — ¿comparamos con el año anterior?`);
  }

  return sugerencias.slice(0, 3);
}

function parseMesNum(mes: string): number {
  const meses: Record<string, number> = {
    ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
    jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12,
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  };
  return meses[mes?.toLowerCase().slice(0, 3)] || 0;
}

export default function ChatAsistente({ dataMensual, dataIndicadores, dataValoresDiarios }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sugerenciasDinamicas = generarSugerenciasDinamicas(dataMensual, dataIndicadores);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  async function enviar(pregunta: string) {
    if (!pregunta.trim() || cargando) return;
    setInput('');
    setMensajes(prev => [...prev, { rol: 'usuario', texto: pregunta }]);
    setCargando(true);

    try {
      const contexto = construirContexto(dataMensual, dataIndicadores, dataValoresDiarios);
      const res = await fetch('/.netlify/functions/chat-indicadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta, contexto }),
      });
      const json = await res.json();
      setMensajes(prev => [...prev, { rol: 'asistente', texto: json.respuesta || json.error || 'Sin respuesta' }]);
    } catch {
      setMensajes(prev => [...prev, { rol: 'asistente', texto: 'Error al conectar con el asistente. Verificá tu conexión.' }]);
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setAbierto(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-3 rounded-full shadow-xl transition-all text-sm font-semibold"
      >
        <span className="text-lg">🤖</span>
        <span>Consultar Asistente</span>
      </button>

      {/* Panel de chat */}
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md h-[85vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-700 text-white">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <div>
                  <div className="font-bold text-sm">Asistente Crosslog</div>
                  <div className="text-xs text-slate-300">Análisis operativo con IA</div>
                </div>
              </div>
              <button
                onClick={() => setAbierto(false)}
                className="text-slate-300 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">

              {mensajes.length === 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 text-center pt-2">
                    Hacé una pregunta o elegí una sugerencia
                  </p>

                  {/* Sugerencias dinámicas */}
                  {sugerenciasDinamicas.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        <span>✨</span> Basado en tus datos
                      </p>
                      {sugerenciasDinamicas.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => enviar(s)}
                          className="w-full text-left text-xs bg-slate-50 border border-slate-200 hover:border-slate-400 hover:bg-slate-100 rounded-xl px-3 py-2 text-slate-700 transition-all"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Preguntas fijas */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <span>💡</span> Preguntas frecuentes
                    </p>
                    {PREGUNTAS_FIJAS.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => enviar(p)}
                        className="w-full text-left text-xs bg-white border border-gray-200 hover:border-gray-400 hover:bg-gray-50 rounded-xl px-3 py-2 text-gray-700 transition-all"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mensajes.map((m, i) => (
                <div key={i} className={`flex ${m.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.rol === 'usuario'
                      ? 'bg-slate-700 text-white rounded-br-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                  }`}>
                    {m.texto}
                  </div>
                </div>
              ))}

              {cargando && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2">
                    <div className="flex gap-1 items-center">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-gray-200 bg-white flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar(input)}
                placeholder="Escribí tu pregunta..."
                disabled={cargando}
                className="flex-1 text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-500 disabled:bg-gray-50"
              />
              <button
                onClick={() => enviar(input)}
                disabled={cargando || !input.trim()}
                className="bg-slate-700 hover:bg-slate-800 disabled:bg-gray-300 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-all"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
