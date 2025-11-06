import { useState, useEffect } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useEntregasStore } from '../stores/entregasStore';
import { useGeolocation } from '../hooks/useGeolocation';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { SignatureCanvas } from './SignatureCanvas';
import { ImageEditor } from './ImageEditor';
import { generateIndividualPDF, type SignatureData } from '../utils/pdfGenerator';
import { googleDriveUploader } from '../utils/googleDriveUpload';
import { ocrScanner } from '../utils/ocrScanner';
import { scanDocument } from '../utils/documentScanner';
import { rotateToVertical } from '../utils/imageRotation';
import type { Entrega, FotoCapturada } from '../types';

interface CapturaFormProps {
  entrega: Entrega;
  onBack: () => void;
  onComplete: () => void;
}

const MAX_FOTOS = 7;

export function CapturaForm({ entrega, onBack, onComplete }: CapturaFormProps) {
  const [cliente, setCliente] = useState(entrega.detalleEntregas || entrega.clienteNombreCompleto || entrega.cliente);
  const [fotos, setFotos] = useState<FotoCapturada[]>([]);
  const [capturando, setCapturando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Firma
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signature, setSignature] = useState<SignatureData | null>(null);

  // Editor de imágenes
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingFotoId, setEditingFotoId] = useState<string | null>(null);

  // Procesamiento
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Document scanning
  const [autoScan] = useState(false); // setAutoScan reserved for future use // Auto-scan disabled by default (OpenCV issues)

  const { updateCaptura, updateEntregaEstado, chofer, tipoTransporte, entregas: allEntregas, clientInfo } = useEntregasStore();
  const { getCurrentLocation, location: geoLocation } = useGeolocation();
  const { savePending, syncAll } = useOfflineSync();

  // Calculate progress
  const totalEntregas = allEntregas.length;
  const entregasCompletadas = allEntregas.filter(e => e.estado === 'COMPLETADO').length;
  const entregasPendientes = totalEntregas - entregasCompletadas;
  const isUltimaEntrega = entregasPendientes === 1; // Esta es la última

  // Get geolocation on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const handleTomarFoto = async () => {
    if (fotos.length >= MAX_FOTOS) {
      setError(`Máximo ${MAX_FOTOS} remitos por entrega`);
      return;
    }

    setCapturando(true);
    setError(null);
    setWarning(null);

    try {
      const image = await Camera.getPhoto({
        quality: 95, // High quality (increased from 85)
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt, // Allow user to choose Camera or Gallery
        saveToGallery: false,
        correctOrientation: true,
      });

      if (!image.base64String) {
        throw new Error('No image data received');
      }

      // Convert base64 to Blob
      const byteCharacters = atob(image.base64String);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      let blob = new Blob([byteArray], { type: `image/${image.format}` });

      // Auto-rotate to vertical (90 degrees) for all photos
      console.log('[CapturaForm] Rotating image to vertical...');
      const rotationResult = await rotateToVertical(blob);
      blob = rotationResult.blob;

      if (rotationResult.rotated) {
        console.log('[CapturaForm] ✓ Image rotated 90° to vertical');
      }

      // Create new thumbnail from rotated image
      const reader = new FileReader();
      const thumbnailPromise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const thumbnail = await thumbnailPromise;
      const fotoId = `foto-${Date.now()}`;

      const nuevaFoto: FotoCapturada = {
        id: fotoId,
        blob,
        processed: false,
        thumbnail,
        timestamp: new Date().toISOString(),
        numeroRemito: '', // Start empty for manual input
        ocrDetecting: false,
      };

      setFotos((prev) => [...prev, nuevaFoto]);

      // Auto-scan if enabled
      if (autoScan) {
        console.log('[CapturaForm] Auto-scanning document...');
        setTimeout(() => handleScanDocument(fotoId), 100);
      }
    } catch (err) {
      console.error('[CapturaForm] Camera error:', err);
      setError('Error al capturar foto. Intenta de nuevo.');
    } finally {
      setCapturando(false);
    }
  };

  const handleEliminarFoto = (fotoId: string) => {
    setFotos((prev) => prev.filter((f) => f.id !== fotoId));
    setWarning(null);
  };

  const handleUpdateNumeroRemito = (fotoId: string, numeroRemito: string) => {
    setFotos((prev) =>
      prev.map((f) =>
        f.id === fotoId ? { ...f, numeroRemito: numeroRemito.trim() } : f
      )
    );
  };

  const handleScanearOCR = async (fotoId: string) => {
    const foto = fotos.find((f) => f.id === fotoId);
    if (!foto) return;

    // Mark as detecting
    setFotos((prev) =>
      prev.map((f) => (f.id === fotoId ? { ...f, ocrDetecting: true } : f))
    );

    try {
      console.log('[CapturaForm] Scanning OCR for foto:', fotoId);
      const ocrResult = await ocrScanner.scanRemito(foto.blob);

      if (ocrResult.numeroRemito) {
        const detectedNumber = ocrResult.numeroRemito.trim();
        console.log('[CapturaForm] OCR detected:', detectedNumber);

        setFotos((prev) =>
          prev.map((f) =>
            f.id === fotoId
              ? { ...f, numeroRemito: detectedNumber, ocrDetecting: false }
              : f
          )
        );
        setWarning(null);
      } else {
        console.warn('[CapturaForm] No remito detected');
        setFotos((prev) =>
          prev.map((f) => (f.id === fotoId ? { ...f, ocrDetecting: false } : f))
        );
        setWarning('No se pudo detectar el número de remito. Ingrésalo manualmente.');
      }
    } catch (ocrError) {
      console.error('[CapturaForm] OCR error:', ocrError);
      setFotos((prev) =>
        prev.map((f) => (f.id === fotoId ? { ...f, ocrDetecting: false } : f))
      );
      setError('Error al escanear. Intenta de nuevo o ingrésalo manualmente.');
    }
  };

  const handleScanDocument = async (fotoId: string) => {
    const foto = fotos.find((f) => f.id === fotoId);
    if (!foto) return;

    // Mark as processing
    setFotos((prev) =>
      prev.map((f) => (f.id === fotoId ? { ...f, processed: true } : f))
    );

    try {
      console.log('[CapturaForm] Scanning document for foto:', fotoId);
      const scanResult = await scanDocument(foto.blob, { autoEnhance: true, quality: 95 }); // High quality (increased from 90)

      if (scanResult.success && scanResult.processedBlob) {
        console.log('[CapturaForm] Document scanned successfully');

        // Update thumbnail
        const reader = new FileReader();
        reader.onloadend = () => {
          setFotos((prev) =>
            prev.map((f) =>
              f.id === fotoId
                ? {
                    ...f,
                    blob: scanResult.processedBlob!,
                    originalBlob: foto.originalBlob || foto.blob,
                    scanned: true,
                    scanCorners: scanResult.corners,
                    thumbnail: reader.result as string,
                    processed: false,
                  }
                : f
            )
          );
        };
        reader.readAsDataURL(scanResult.processedBlob);
      } else {
        console.warn('[CapturaForm] Document scan failed:', scanResult.error);
        setFotos((prev) =>
          prev.map((f) => (f.id === fotoId ? { ...f, processed: false } : f))
        );
        setWarning(scanResult.error || 'No se pudo escanear el documento. Usa la imagen original.');
      }
    } catch (scanError) {
      console.error('[CapturaForm] Document scan error:', scanError);
      setFotos((prev) =>
        prev.map((f) => (f.id === fotoId ? { ...f, processed: false } : f))
      );
      setError('Error al escanear documento. Intenta de nuevo.');
    }
  };

  // Reserved for future use: handleUseOriginal
  // const handleUseOriginal = (fotoId: string) => {
  //   const foto = fotos.find((f) => f.id === fotoId);
  //   if (!foto || !foto.originalBlob) return;
  //   const reader = new FileReader();
  //   reader.onloadend = () => {
  //     setFotos((prev) =>
  //       prev.map((f) =>
  //         f.id === fotoId
  //           ? { ...f, blob: foto.originalBlob!, scanned: false, scanCorners: undefined, thumbnail: reader.result as string }
  //           : f
  //       )
  //     );
  //   };
  //   reader.readAsDataURL(foto.originalBlob);
  // };

  const handleSaveSignature = (sig: SignatureData) => {
    setSignature(sig);
    setShowSignatureModal(false);
  };

  const handleOpenEditor = (fotoId: string) => {
    setEditingFotoId(fotoId);
    setShowImageEditor(true);
  };

  const handleSaveEdit = async (editedBlob: Blob) => {
    if (!editingFotoId) return;

    // Update thumbnail
    const reader = new FileReader();
    reader.onloadend = () => {
      setFotos((prev) =>
        prev.map((f) =>
          f.id === editingFotoId
            ? {
                ...f,
                blob: editedBlob,
                thumbnail: reader.result as string,
              }
            : f
        )
      );
    };
    reader.readAsDataURL(editedBlob);

    setShowImageEditor(false);
    setEditingFotoId(null);
  };

  const handleCancelEdit = () => {
    setShowImageEditor(false);
    setEditingFotoId(null);
  };


  const handleFinalizar = async () => {
    setError(null);
    setWarning(null);

    // Validations
    if (fotos.length === 0) {
      setError('Captura al menos una foto de remito');
      return;
    }

    // Check all photos have remito number
    const fotosIncompletas = fotos.filter(f => !f.numeroRemito || f.numeroRemito.trim() === '');
    if (fotosIncompletas.length > 0) {
      setError(`${fotosIncompletas.length} foto(s) sin número de remito. Ingresa el número manualmente o escanea con OCR.`);
      return;
    }

    // Check if OCR is still processing
    const fotosEnProceso = fotos.filter(f => f.ocrDetecting);
    if (fotosEnProceso.length > 0) {
      setError('Espera a que terminen los escaneos OCR en proceso...');
      return;
    }

    if (!signature) {
      setError('Falta la firma del receptor');
      setShowSignatureModal(true);
      return;
    }

    // Once a delivery is finalized with photos and signature, it's COMPLETED
    const { entregas: allEntregas } = useEntregasStore.getState();
    const estado = 'COMPLETADO'; // Always COMPLETED when finalized

    setProcessing(true);
    setUploadProgress('Generando PDFs...');

    try {
      // Step 1: Generate PDFs (one per foto/remito)
      console.log('[CapturaForm] ===== STARTING PDF GENERATION =====');
      console.log('[CapturaForm] Number of fotos:', fotos.length);
      console.log('[CapturaForm] Remito numbers:', fotos.map(f => f.numeroRemito));

      const pdfPromises = fotos.map(async (foto, index) => {
        console.log(`[CapturaForm] Generating PDF ${index + 1}/${fotos.length} for remito:`, foto.numeroRemito);

        const pdf = await generateIndividualPDF({
          photoBlob: foto.blob,
          signature,
          numeroRemito: foto.numeroRemito || 'SIN_NUMERO',
          cliente,
          geolocalizacion: geoLocation || undefined,
        });

        console.log(`[CapturaForm] ✓ PDF ${index + 1} generated successfully`);

        return {
          pdf,
          numeroRemito: foto.numeroRemito || 'SIN_NUMERO',
        };
      });

      console.log('[CapturaForm] Waiting for all PDFs to generate...');
      const pdfResults = await Promise.all(pdfPromises);
      console.log(`[CapturaForm] ✓ All ${pdfResults.length} PDFs generated successfully`);

      // Step 2: Upload to Google Drive
      console.log('[CapturaForm] ===== STARTING GOOGLE DRIVE UPLOAD =====');
      setUploadProgress(`Subiendo ${pdfResults.length} PDFs a Google Drive...`);

      const uploadPromises = pdfResults.map(({ pdf, numeroRemito }, index) => {
        const filename = `${numeroRemito}.pdf`;
        console.log(`[CapturaForm] Uploading PDF ${index + 1}/${pdfResults.length}: ${filename}`);
        console.log(`[CapturaForm] Using folder ID: ${clientInfo?.folderId || 'default'}`);

        return googleDriveUploader.uploadWithRetry(pdf, filename, 3, clientInfo?.folderId).then(result => {
          console.log(`[CapturaForm] ✓ Upload ${index + 1} completed:`, result.success ? 'SUCCESS' : 'FAILED');
          return {
            filename,
            numeroRemito,
            result,
            pdfBlob: pdf,
          };
        });
      });

      console.log('[CapturaForm] Waiting for all uploads to complete...');
      const uploadResults = await Promise.all(uploadPromises);
      console.log('[CapturaForm] ✓ All uploads completed');

      // Check for upload failures
      const failed = uploadResults.filter(r => !r.result.success);
      const succeeded = uploadResults.filter(r => r.result.success);

      console.log(`[CapturaForm] Upload summary: ${succeeded.length} succeeded, ${failed.length} failed`);

      if (failed.length > 0) {
        // Log detailed error information
        failed.forEach((failedUpload, idx) => {
          console.error(`[CapturaForm] ❌ Failed PDF ${idx + 1}:`, failedUpload.filename);
          console.error(`[CapturaForm] Error:`, failedUpload.result.error);
          console.error(`[CapturaForm] Full result:`, failedUpload.result);
        });

        // Save failed uploads to sync queue
        console.log(`[CapturaForm] Saving ${failed.length} failed uploads to sync queue...`);

        for (const { pdfBlob, filename } of failed) {
          await savePending('pdf', { pdfBlob, filename });
        }
      }

      // CRITICAL: Ensure at least one PDF was uploaded successfully
      if (succeeded.length === 0) {
        console.error('[CapturaForm] ❌ NO PDFs uploaded successfully! Cannot proceed.');
        throw new Error(`No se pudo subir ningún PDF a Google Drive. Por favor, verifica tu conexión e intenta de nuevo. (${failed.length} PDFs fallaron)`);
      }

      console.log('[CapturaForm] ✓ At least', succeeded.length, 'PDF(s) uploaded successfully, proceeding...');

      // Step 3: Send webhook to N8N
      setUploadProgress('Enviando datos a N8N...');

      const numerosRemito = fotos.map(f => f.numeroRemito).filter(Boolean);
      const pdfUrls = succeeded.map(r => r.result.webViewLink).filter(Boolean) as string[];

      console.log('[CapturaForm] 📄 PDF URLs to send in webhook:', pdfUrls);

      // Calculate progress information
      const totalEntregas = allEntregas.length;
      const entregasCompletadas = allEntregas.filter(e => e.estado === 'COMPLETADO').length + (estado === 'COMPLETADO' ? 1 : 0);
      const progresoPorcentaje = totalEntregas > 0 ? Math.round((entregasCompletadas / totalEntregas) * 100) : 0;

      // Prepare detailed lists - ONLY send unique data not duplicated elsewhere
      // Only send the 'detalle' field which is unique per entrega
      const entregasCompletadasDetalle = allEntregas
        .filter(e => e.estado === 'COMPLETADO' || e.id === entrega.id)
        .map(e => e.detalleEntregas || e.clienteNombreCompleto || e.cliente);

      const entregasPendientesDetalle = allEntregas
        .filter(e => e.estado !== 'COMPLETADO' && e.id !== entrega.id)
        .map(e => e.detalleEntregas || e.clienteNombreCompleto || e.cliente);

      const webhookData = {
        hdr: entrega.hdr,
        numero_entrega: entrega.numeroEntrega,
        numeros_remito: numerosRemito,
        cliente: cliente,
        cliente_nombre_completo: entrega.clienteNombreCompleto,
        detalle_entregas: entrega.detalleEntregas,
        estado: estado,
        chofer: chofer || 'Unknown',
        tipo_transporte: tipoTransporte || 'Propio', // Columna Q en Sistema_entregas
        timestamp: new Date().toISOString(),
        fecha_viaje: entrega.fechaViaje || new Date().toISOString().split('T')[0],
        geolocalizacion: geoLocation ? {
          lat: geoLocation.lat,
          lng: geoLocation.lng,
          accuracy: geoLocation.accuracy,
        } : undefined,
        pdf_urls: pdfUrls,
        firma_receptor: signature.nombreReceptor,
        numero_remitos: fotos.length,
        version_app: '1.0.0',
        // Progress summary
        total_entregas: totalEntregas,
        entregas_completadas: entregasCompletadas,
        entregas_pendientes: totalEntregas - entregasCompletadas,
        progreso_porcentaje: progresoPorcentaje,
        // Detailed lists
        entregas_completadas_detalle: entregasCompletadasDetalle,
        entregas_pendientes_detalle: entregasPendientesDetalle,
      };

      await savePending('entrega', webhookData);

      // Force immediate sync to send to N8N
      console.log('[CapturaForm] Forcing immediate sync to N8N...');
      await syncAll();

      // NOTE: Google Sheets writes are now handled by N8N webhook
      // The webhook receives the data and writes to both Sistema_entregas and Estado_progreso
      // This simplifies the app and avoids OAuth issues with Sheets API
      console.log('[CapturaForm] ✓ Data sent to N8N for Sheets processing');

      // Step 4: Update store
      updateCaptura({
        numeroRemito: numerosRemito[0] || '',
        cliente,
        estado,
        fotos,
        firma: {
          blob: new Blob([signature.dataUrl]),
          nombreReceptor: signature.nombreReceptor,
          timestamp: new Date().toISOString(),
        },
        geolocalizacion: geoLocation || undefined,
        timestamp: new Date().toISOString(),
      });

      // Step 5: Update entrega estado with additional info and PDF URLs
      updateEntregaEstado(entrega.id, estado, numerosRemito.join(', '), signature.nombreReceptor, pdfUrls);

      console.log('[CapturaForm] Process completed successfully');

      setUploadProgress('¡Completado!');

      // Wait a bit before closing
      setTimeout(() => {
        onComplete();
      }, 1000);

    } catch (error) {
      console.error('[CapturaForm] Error finalizing:', error);
      setError(error instanceof Error ? error.message : 'Error al procesar');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 shadow-lg" style={{
        background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)'
      }}>
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            disabled={processing}
            className="p-2 hover:bg-white/10 rounded-lg active:bg-white/20 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Captura de Remito</h1>
            <p className="text-sm" style={{ color: '#a8e063' }}>
              {entrega.clienteNombreCompleto || entrega.cliente} - Entrega N° {entrega.numeroEntrega}
            </p>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="p-4 space-y-4 pb-24">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Warning Message */}
        {warning && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
            <p className="text-yellow-900 text-sm font-medium">{warning}</p>
            <button
              onClick={() => setWarning(null)}
              className="mt-2 text-xs text-yellow-700 underline"
            >
              Cerrar advertencia
            </button>
          </div>
        )}

        {/* Cliente/Destino */}
        <div className="card p-4 space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Destino de Entrega
          </label>
          <input
            type="text"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            className="field-input w-full"
            placeholder="Ej: BUNGE CAMPANA / TRANSCLOR PILAR"
            disabled={processing}
          />
          <p className="text-xs text-gray-500 mt-1">
            Información del destino de entrega
          </p>
        </div>

        {/* Fotos */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-700">
              Fotos del Remito *
            </label>
            <span className="text-xs text-gray-500">
              {fotos.length} / {MAX_FOTOS}
            </span>
          </div>

          {/* Photos List */}
          {fotos.length > 0 && (
            <div className="space-y-4">
              {fotos.map((foto, index) => (
                <div key={foto.id} className="card p-4 border-2 border-blue-200 bg-blue-50">
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-300">
                      <img
                        src={foto.thumbnail}
                        alt={`Remito ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                        #{index + 1}
                      </div>
                    </div>

                    {/* Input and Actions */}
                    <div className="flex-1 space-y-2">
                      <label className="block text-xs font-semibold text-gray-700">
                        Número de Remito #{index + 1} *
                      </label>

                      {/* Input Field */}
                      <input
                        type="tel"
                        value={foto.numeroRemito || ''}
                        onChange={(e) => handleUpdateNumeroRemito(foto.id, e.target.value.replace(/\D/g, ''))}
                        className="field-input w-full text-sm"
                        placeholder="Ej: 38269"
                        inputMode="numeric"
                        disabled={processing || foto.ocrDetecting}
                      />

                      {/* Buttons Row */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEditor(foto.id)}
                          disabled={processing}
                          className="py-2 px-3 text-white text-sm font-semibold rounded-lg shadow-sm hover:opacity-90 active:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                          style={{ backgroundColor: '#2d3e50' }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </button>

                        {/* OCR Scan Button */}
                        <button
                          onClick={() => handleScanearOCR(foto.id)}
                          disabled={processing || foto.ocrDetecting}
                          className="py-2 px-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:from-blue-600 hover:to-blue-700 active:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                          {foto.ocrDetecting ? (
                            <>
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Escaneando...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                              </svg>
                              OCR
                            </>
                          )}
                        </button>
                      </div>

                      {/* Status indicator */}
                      {foto.numeroRemito && (
                        <div className="text-xs text-green-700 font-semibold flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Remito: {foto.numeroRemito}
                        </div>
                      )}
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleEliminarFoto(foto.id)}
                      disabled={processing}
                      className="self-start p-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 active:bg-red-700 disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Camera Button */}
          <button
            onClick={handleTomarFoto}
            disabled={capturando || fotos.length >= MAX_FOTOS || processing}
            className="btn-primary w-full"
          >
            {capturando ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Capturando...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Agregar Foto {fotos.length > 0 && `(${fotos.length})`}
              </span>
            )}
          </button>

          {/* Hint text */}
          <p className="text-xs text-gray-500 text-center mt-2">
            📷 Toma una foto o 🖼️ carga desde la galería
          </p>
        </div>

        {/* Progress Summary - Show when there are photos */}
        {fotos.length > 0 && (
          <div className="card p-4 space-y-3 border-2" style={{
            background: 'linear-gradient(to bottom right, #f5f5f5, #ffffff)',
            borderColor: '#a8e063'
          }}>
            <h3 className="text-sm font-bold" style={{ color: '#1a2332' }}>📊 Progreso del HDR</h3>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-lg p-3 text-center border-2" style={{ borderColor: '#2d3e50' }}>
                <p className="text-2xl font-bold" style={{ color: '#2d3e50' }}>{totalEntregas}</p>
                <p className="text-xs font-medium" style={{ color: '#2d3e50' }}>Total</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center border-2" style={{ borderColor: '#a8e063' }}>
                <p className="text-2xl font-bold" style={{ color: '#a8e063' }}>{entregasCompletadas}</p>
                <p className="text-xs font-medium" style={{ color: '#2d3e50' }}>Completadas</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center border-2 border-orange-300">
                <p className="text-2xl font-bold text-orange-600">{entregasPendientes}</p>
                <p className="text-xs font-medium" style={{ color: '#2d3e50' }}>Pendientes</p>
              </div>
            </div>

            {isUltimaEntrega ? (
              <div className="rounded-lg p-3 border-2" style={{
                backgroundColor: '#a8e063',
                borderColor: '#a8e063'
              }}>
                <p className="text-sm font-bold text-white text-center">
                  🎉 ¡Esta es la última entrega del HDR!
                </p>
                <p className="text-xs text-white text-center mt-1">
                  Al finalizar esta entrega, el HDR estará completado
                </p>
              </div>
            ) : (
              <div className="rounded-lg p-3 border-2" style={{
                background: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)',
                borderColor: '#2d3e50'
              }}>
                <p className="text-sm font-bold text-white text-center">
                  🚚 Quedan {entregasPendientes - 1} entregas pendientes
                </p>
                <p className="text-xs text-center mt-1" style={{ color: '#a8e063' }}>
                  Estado: En Reparto
                </p>
              </div>
            )}

            {/* List of completed deliveries */}
            {entregasCompletadas > 0 && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs font-bold mb-2" style={{ color: '#a8e063' }}>
                  ✓ Entregas Completadas:
                </p>
                <div className="space-y-1">
                  {allEntregas
                    .filter(e => e.estado === 'COMPLETADO')
                    .map(e => (
                      <p key={e.id} className="text-xs" style={{ color: '#2d3e50' }}>
                        • {e.detalleEntregas || e.clienteNombreCompleto || e.cliente}
                      </p>
                    ))}
                </div>
              </div>
            )}

            {/* List of pending deliveries */}
            {entregasPendientes > 1 && (
              <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs font-bold mb-2 text-orange-600">
                  ⏳ Entregas Pendientes:
                </p>
                <div className="space-y-1">
                  {allEntregas
                    .filter(e => e.estado !== 'COMPLETADO' && e.id !== entrega.id)
                    .map(e => (
                      <p key={e.id} className="text-xs" style={{ color: '#2d3e50' }}>
                        • {e.detalleEntregas || e.clienteNombreCompleto || e.cliente}
                      </p>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Firma */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-700">
              Firma del Receptor *
            </label>
            {signature && (
              <span className="text-xs text-green-600 font-medium">✓ Firmado</span>
            )}
          </div>

          {signature ? (
            <div className="border-2 border-green-300 rounded-lg p-3 bg-green-50">
              <p className="text-sm text-green-800">
                <strong>Receptor:</strong> {signature.nombreReceptor}
              </p>
              <button
                onClick={() => setShowSignatureModal(true)}
                disabled={processing}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium mt-2"
              >
                Cambiar firma
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSignatureModal(true)}
              disabled={processing}
              className="btn-secondary w-full"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Agregar Firma
              </span>
            </button>
          )}
        </div>

        {/* Geolocation Info */}
        {geoLocation && (
          <div className="card p-3 bg-green-50 border-green-200">
            <div className="flex items-center gap-2 text-green-800">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">
                Ubicación capturada (±{geoLocation.accuracy.toFixed(0)}m)
              </span>
            </div>
          </div>
        )}

        {/* Processing Progress */}
        {processing && uploadProgress && (
          <div className="card p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 shadow-lg">
            <div className="flex flex-col items-center gap-4">
              <svg className="animate-spin h-12 w-12 text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <div className="text-center">
                <p className="text-lg text-blue-900 font-bold mb-1">Procesando...</p>
                <p className="text-base text-blue-800 font-medium">{uploadProgress}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg" style={{ borderTop: '3px solid #a8e063' }}>
        <button
          onClick={handleFinalizar}
          disabled={fotos.length === 0 || !signature || processing}
          className="w-full py-4 px-6 text-white text-lg font-bold rounded-lg shadow-md hover:opacity-90 active:opacity-75 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#a8e063' }}
        >
          {processing ? 'Procesando...' : 'Finalizar y Enviar'}
        </button>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <SignatureCanvas
          onSave={handleSaveSignature}
          onCancel={() => setShowSignatureModal(false)}
        />
      )}

      {/* Image Editor Modal */}
      {showImageEditor && editingFotoId && (
        <ImageEditor
          imageBlob={fotos.find(f => f.id === editingFotoId)!.blob}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  );
}
