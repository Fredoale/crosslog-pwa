import { useState, useEffect, useRef } from 'react';
import { useEntregasStore } from '../stores/entregasStore';
import { useOfflineSync } from '../hooks/useOfflineSync';
import type { Entrega } from '../types';
import { useDocumentosStore } from '../stores/documentosStore';
import { DocumentosModal } from './documentos/DocumentosModal';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import type { Novedad } from '../types/checklist';
import { showSuccess, showError, showWarning } from '../utils/toast';

interface EntregasListProps {
  onSelectEntrega: (entrega: Entrega) => void;
  onLogout: () => void;
}

export function EntregasList({ onSelectEntrega, onLogout }: EntregasListProps) {
  const { entregas, currentHDR, chofer, unidad, setHDR, setEntregas } = useEntregasStore();
  const { savePending, syncAll } = useOfflineSync();
  const [completionSent, setCompletionSent] = useState(false);
  const previousCompletionRef = useRef(false);

  // Documentos store
  const [mostrarDocumentos, setMostrarDocumentos] = useState(false);
  const { infoChofer, cargarDocumentosChofer, limpiar } = useDocumentosStore();

  // Novedad state
  const [mostrarModalNovedad, setMostrarModalNovedad] = useState(false);
  const [descripcionNovedad, setDescripcionNovedad] = useState('');
  const [guardandoNovedad, setGuardandoNovedad] = useState(false);
  const [fotoNovedad, setFotoNovedad] = useState<string | null>(null);
  const [capturandoFotoNovedad, setCapturandoFotoNovedad] = useState(false);

  console.log('[EntregasList] Total entregas:', entregas.length);
  console.log('[EntregasList] Entregas data:', entregas);

  // Sort: Pendientes first, then En Reparto, then Completadas
  const sortedEntregas = [...entregas].sort((a, b) => {
    const order = { 'PENDIENTE': 0, 'EN_REPARTO': 1, 'COMPLETADO': 2 };
    return order[a.estado] - order[b.estado];
  });

  const completadas = entregas.filter((e) => e.estado === 'COMPLETADO').length;
  const total = entregas.length;
  const progreso = total > 0 ? Math.round((completadas / total) * 100) : 0;
  const todasCompletadas = total > 0 && completadas === total;

  // Calculate total remitos
  const totalRemitos = entregas.reduce((sum, e) => {
    if (e.numeroRemito) {
      const remitos = e.numeroRemito.split(',').length;
      return sum + remitos;
    }
    return sum;
  }, 0);

  // Cargar documentos del chofer
  useEffect(() => {
    if (chofer) {
      console.log('[EntregasList] Cargando documentos. Chofer:', chofer, 'Unidad:', unidad || 'N/A');
      cargarDocumentosChofer(chofer, unidad || undefined);
    }

    return () => {
      limpiar();
    };
  }, [chofer, unidad, cargarDocumentosChofer, limpiar]);

  // Send HDR completion notification to N8N when all deliveries are done
  useEffect(() => {
    const sendCompletionNotification = async () => {
      // Only send if:
      // 1. All deliveries are completed
      // 2. We haven't sent notification yet
      // 3. Previous state was not completed (avoid duplicate sends)
      if (todasCompletadas && !completionSent && !previousCompletionRef.current && currentHDR) {
        console.log('[EntregasList] HDR completed! Sending summary to N8N...');

        try {
          // Send EACH entrega individually (one row per entrega in Google Sheets)
          for (const entrega of entregas) {
            const remitosArray = entrega.numeroRemito
              ? entrega.numeroRemito.split(',').map(r => r.trim())
              : [];

            const entregaData = {
              type: 'entrega_individual',
              hdr: currentHDR,
              numero_entrega: entrega.numeroEntrega,
              numeros_remito: remitosArray, // Array format for N8N
              cliente: entrega.clienteNombreCompleto || entrega.cliente,
              detalle_entregas: entrega.detalleEntregas || '',
              estado: entrega.estado,
              chofer: chofer,
              nombre_receptor: entrega.nombreReceptor || '',
              fecha_viaje: entrega.fechaViaje || '',
              fecha_actualizacion: entrega.fechaActualizacion,
              pdf_urls: entrega.pdfUrls || [], // Array format for N8N
              numero_remitos: remitosArray.length,
            };

            console.log('[EntregasList] Sending entrega', entrega.numeroEntrega, 'to N8N');
            await savePending('entrega', entregaData);
          }

          console.log('[EntregasList] Forcing immediate sync for all entregas...');
          await syncAll();

          setCompletionSent(true);
          console.log('[EntregasList] ✓ HDR completion notification sent to N8N');
        } catch (error) {
          console.error('[EntregasList] Error sending HDR completion:', error);
        }
      }

      // Update ref for next check
      previousCompletionRef.current = todasCompletadas;
    };

    sendCompletionNotification();
  }, [todasCompletadas, completionSent, currentHDR, chofer, total, totalRemitos, entregas, savePending, syncAll]);

  const getEstadoBadge = (estado: Entrega['estado']) => {
    switch (estado) {
      case 'COMPLETADO':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'EN_REPARTO':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'PENDIENTE':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getEstadoText = (estado: Entrega['estado']) => {
    switch (estado) {
      case 'COMPLETADO':
        return 'Completado';
      case 'EN_REPARTO':
        return 'En Reparto';
      case 'PENDIENTE':
      default:
        return 'Pendiente';
    }
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

      setCapturandoFotoNovedad(true);
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFotoNovedad(reader.result as string);
          setCapturandoFotoNovedad(false);
          showSuccess('Foto capturada');
        };
        reader.onerror = () => {
          setCapturandoFotoNovedad(false);
          showError('Error al procesar la imagen');
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('[EntregasList] Error capturando foto:', error);
        setCapturandoFotoNovedad(false);
        showError('Error al capturar la foto');
      }
    };

    input.click();
  };

  const handleGuardarNovedad = async () => {
    if (!descripcionNovedad.trim()) {
      showWarning('Por favor describe la novedad');
      return;
    }

    setGuardandoNovedad(true);
    try {
      const novedadId = `novedad_remitos_${currentHDR}_${Date.now()}`;
      let fotoUrl: string | null = null;

      // Si hay foto, subirla a Firebase Storage primero
      if (fotoNovedad) {
        console.log('[EntregasList] Subiendo foto a Storage...');
        const fotoRef = ref(storage, `novedades/${novedadId}.jpg`);
        await uploadString(fotoRef, fotoNovedad, 'data_url');
        fotoUrl = await getDownloadURL(fotoRef);
        console.log('[EntregasList] ✅ Foto subida:', fotoUrl);
      }

      const novedad: Novedad = {
        id: novedadId,
        checklistId: '', // No está asociada a un checklist específico
        itemId: '', // No está asociada a un item específico
        fecha: new Date(),
        unidad: {
          numero: unidad || 'N/A',
          patente: 'N/A'
        },
        descripcion: `HDR ${currentHDR} - ${descripcionNovedad.trim()}`,
        comentarioChofer: descripcionNovedad.trim(),
        fotoUrl: fotoUrl ?? undefined,
        prioridad: 'ALTA', // Novedades de remitos son ALTA prioridad
        estado: 'PENDIENTE',
        timestamp: new Date()
      };

      const novedadData = {
        ...novedad,
        hdr: currentHDR,
        chofer: chofer,
        fecha: Timestamp.fromDate(novedad.fecha),
        timestamp: Timestamp.fromDate(novedad.timestamp),
        fotoUrl: fotoUrl,
        fotosEvidencia: [],
        ordenTrabajoId: null
      };

      console.log('[EntregasList] Guardando novedad en Firebase...');
      const novedadRef = doc(db, 'novedades', novedadId);
      await setDoc(novedadRef, novedadData);
      console.log('[EntregasList] ✅ Novedad guardada en Firebase:', novedadId);

      showSuccess('Novedad registrada exitosamente');
      setDescripcionNovedad('');
      setFotoNovedad(null);
      setMostrarModalNovedad(false);
    } catch (error) {
      console.error('[EntregasList] Error guardando novedad:', error);
      showError('Error al guardar novedad. Intenta nuevamente.');
    } finally {
      setGuardandoNovedad(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 shadow-lg" style={{
        background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)'
      }}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">HDR {currentHDR}</h1>
              <p className="text-sm font-medium" style={{ color: '#a8e063' }}>Chofer: {chofer}</p>
              {entregas.length > 0 && entregas[0].fechaViaje && (
                <p className="text-xs text-gray-300">
                  Fecha: {entregas[0].fechaViaje}
                </p>
              )}
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-transparent border-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
              style={{ borderColor: '#a8e063' }}
            >
              Cerrar Sesión
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Completadas: {completadas} de {total}
              </span>
              <span className="text-sm font-bold" style={{ color: '#a8e063' }}>
                {progreso}%
              </span>
            </div>
            {total - completadas > 0 && (
              <p className="text-xs text-gray-300">
                Restan: {total - completadas} entregas pendientes
              </p>
            )}
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{ width: `${progreso}%`, backgroundColor: '#a8e063' }}
              />
            </div>

            {/* Botón Ver Documentación - Solo para choferes propios */}
            {infoChofer?.esPropio && (
              <button
                onClick={() => setMostrarDocumentos(true)}
                className="relative w-full px-3 py-1 text-gray-900 font-medium rounded-md shadow-sm hover:shadow-md active:shadow transition-all flex items-center justify-center gap-2 text-xs mt-2"
                style={{ backgroundColor: '#a8e063' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Ver Mi Documentación
                {infoChofer.alertas.length > 0 && (
                  <span className="absolute -top-1 -right-1 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse shadow-lg" style={{ backgroundColor: '#ff4444' }}>
                    {infoChofer.alertas.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Completion Banner */}
      {todasCompletadas && (
        <div className="mx-4 mt-4 p-6 rounded-lg shadow-xl" style={{
          background: 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)',
          border: '3px solid #a8e063'
        }}>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: '#a8e063' }}>
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a2332' }}>
              ¡HDR COMPLETADA! 🎉
            </h2>
            <p className="mb-4" style={{ color: '#2d3e50' }}>
              Todas las entregas del HDR {currentHDR} han sido completadas con éxito
            </p>

            {/* Lista de entregas con PDFs */}
            <div className="space-y-3 mb-6">
              {entregas.map((entrega) => {
                const remitos = entrega.numeroRemito ? entrega.numeroRemito.split(',').map(r => r.trim()) : [];
                const pdfUrls = entrega.pdfUrls || [];

                return (
                  <div key={entrega.id} className="bg-white rounded-lg p-4 border-2 border-green-300 text-left">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Entrega N° {entrega.numeroEntrega}
                    </h3>
                    <p className="text-sm text-gray-700 mb-2">
                      {entrega.detalleEntregas || entrega.clienteNombreCompleto || entrega.cliente}
                    </p>
                    {entrega.nombreReceptor && !entrega.nombreReceptor.startsWith('http') && (
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-semibold">Recibió:</span> {entrega.nombreReceptor}
                      </p>
                    )}
                    {remitos.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {remitos.map((remito, idx) => {
                          const pdfUrl = pdfUrls[idx];
                          console.log('[EntregasList] PDF URL for remito', remito, ':', pdfUrl);

                          // Ensure pdfUrl is a valid URL starting with http
                          const isValidUrl = pdfUrl && (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://'));

                          return (
                            <div key={idx} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                              <span className="text-sm font-semibold text-gray-900">Remito: {remito}</span>
                              {isValidUrl ? (
                                <a
                                  href={pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-3 py-1 text-white text-xs font-semibold rounded-lg hover:opacity-90 active:opacity-75 transition-opacity"
                                  style={{ backgroundColor: '#a8e063' }}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Ver PDF
                                </a>
                              ) : (
                                <span className="text-xs text-red-600">URL inválida</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: '#a8e063' }}>
                <p className="text-2xl font-bold" style={{ color: '#a8e063' }}>{total}</p>
                <p className="text-sm" style={{ color: '#2d3e50' }}>Entregas Completadas</p>
              </div>
              <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: '#a8e063' }}>
                <p className="text-2xl font-bold" style={{ color: '#a8e063' }}>{totalRemitos}</p>
                <p className="text-sm" style={{ color: '#2d3e50' }}>Remitos Totales</p>
              </div>
            </div>

            {/* New HDR Button */}
            <button
              onClick={() => {
                // Clear HDR data and return to login
                setHDR('', '');
                setEntregas([]);
                onLogout();
              }}
              className="w-full py-3 px-6 text-white font-semibold rounded-lg shadow-md hover:opacity-90 active:opacity-75 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}
            >
              Iniciar Nuevo HDR
            </button>
            <p className="text-xs mt-2" style={{ color: '#2d3e50' }}>
              Los datos de este HDR están guardados y ya fueron enviados a N8N
            </p>
          </div>
        </div>
      )}

      {/* Entregas List - Only show if not all completed */}
      {!todasCompletadas && (
        <main className="p-4 space-y-3">
          {entregas.length === 0 ? (
          <div className="card p-8 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-600">No hay entregas para este HDR</p>
          </div>
        ) : (
          sortedEntregas.map((entrega) => (
            <div
              key={entrega.id}
              className="card p-4 transition-transform cursor-pointer active:scale-[0.98]"
              onClick={() => {
                // Allow clicking on ALL entregas (including completed ones for editing)
                onSelectEntrega(entrega);
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">
                        Entrega N° {entrega.numeroEntrega}
                      </h3>
                      {/* Estado Badge inline */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getEstadoBadge(
                          entrega.estado
                        )}`}
                      >
                        {getEstadoText(entrega.estado)}
                      </span>
                    </div>
                    {entrega.estado === 'COMPLETADO' && (
                      <p className="text-sm font-medium text-green-700">
                        {entrega.detalleEntregas || entrega.clienteNombreCompleto || entrega.cliente}
                      </p>
                    )}
                  </div>

                  {/* Destino/Cliente */}
                  {entrega.detalleEntregas ? (
                    <div className="mb-2 p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <p className="text-xs font-semibold text-blue-700 mb-1">📍 DESTINO:</p>
                      <p className="text-sm font-medium text-blue-900 leading-relaxed">
                        {entrega.detalleEntregas}
                      </p>
                    </div>
                  ) : (
                    <div className="mb-2 p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                      <p className="text-xs font-semibold text-gray-700 mb-1">📦 CLIENTE:</p>
                      <p className="text-sm font-medium text-gray-900">
                        {entrega.clienteNombreCompleto || entrega.cliente}
                      </p>
                    </div>
                  )}

                  {entrega.clienteNombreCompleto && entrega.clienteNombreCompleto !== entrega.cliente && (
                    <p className="text-xs text-gray-500 mb-1">
                      ID Cliente: {entrega.cliente}
                    </p>
                  )}
                  {entrega.numeroRemito && (
                    <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-green-800">
                        <span className="font-semibold">✓ Remito:</span> {entrega.numeroRemito}
                      </p>
                      {entrega.nombreReceptor && (
                        <p className="text-xs text-green-800">
                          <span className="font-semibold">Recibió:</span> {entrega.nombreReceptor}
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Action Button */}
              {entrega.estado !== 'COMPLETADO' ? (
                <button
                  className="w-full py-3 rounded-lg font-semibold transition-opacity text-white hover:opacity-90 active:opacity-75"
                  style={{ background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEntrega(entrega);
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Iniciar Entrega
                  </span>
                </button>
              ) : (
                <button
                  className="w-full py-3 rounded-lg font-semibold transition-opacity text-white hover:opacity-90 active:opacity-75"
                  style={{ background: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEntrega(entrega);
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Agregar Más Remitos
                  </span>
                </button>
              )}
            </div>
          ))
        )}
        </main>
      )}

      {/* Modal de Documentación */}
      {mostrarDocumentos && infoChofer && (
      

        <DocumentosModal
          info={infoChofer}
          onClose={() => setMostrarDocumentos(false)}
        />
      )}

      {mostrarModalNovedad && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="p-6 pb-4 border-b-2 border-orange-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">Registrar Novedad</h3>
                  <p className="text-sm text-gray-600">HDR {currentHDR}</p>
                </div>
                <button
                  onClick={() => {
                    setMostrarModalNovedad(false);
                    setDescripcionNovedad('');
                    setFotoNovedad(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={guardandoNovedad}
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descripción de la Novedad
              </label>
              <textarea
                value={descripcionNovedad}
                onChange={(e) => setDescripcionNovedad(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all resize-none"
                rows={5}
                placeholder="Describe aquí cualquier novedad, incidente o situación relevante durante las entregas..."
                disabled={guardandoNovedad}
                dir="ltr"
              />
              <p className="text-xs text-gray-500 mt-2">
                Ejemplos: demora en entrega, problema con mercadería, acceso difícil al destino, etc.
              </p>

              {/* Botón Capturar Foto */}
              <button
                onClick={handleCapturarFotoNovedad}
                disabled={capturandoFotoNovedad || guardandoNovedad}
                className="w-full mt-3 py-3 px-6 text-gray-700 text-sm font-bold rounded-xl border-2 border-gray-300 hover:bg-gray-100 active:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {capturandoFotoNovedad ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Procesando...</span>
                  </>
                ) : fotoNovedad ? (
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
            </div>

            {/* Footer */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => {
                  setMostrarModalNovedad(false);
                  setDescripcionNovedad('');
                  setFotoNovedad(null);
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                disabled={guardandoNovedad}
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarNovedad}
                className="flex-1 px-4 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={guardandoNovedad}
              >
                {guardandoNovedad ? 'Guardando...' : 'Guardar Novedad'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botón Flotante de Novedad */}
      <button
        onClick={() => setMostrarModalNovedad(true)}
        className="fixed bottom-6 right-6 p-4 text-white text-sm font-bold rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 z-40 flex items-center gap-2"
        style={{ backgroundColor: '#ff9800' }}
      >
        <span className="text-2xl">🚨</span>
        <span>NOVEDAD</span>
      </button>
    </div>
  );
}
