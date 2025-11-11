import { useState, useEffect, useRef } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { useEntregasStore } from '../stores/entregasStore';
import { useGeolocation } from '../hooks/useGeolocation';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { SignatureCanvas } from './SignatureCanvas';
import { ImageEditor } from './ImageEditor';
import { generateIndividualPDF, type SignatureData } from '../utils/pdfGenerator';
import { uploadToGoogleDrive } from '../utils/googleDriveService';
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
  // Detectar si es modo edición (entrega ya completada)
  const isEditMode = entrega.estado === 'COMPLETADO';

  const [cliente, setCliente] = useState(entrega.detalleEntregas || entrega.clienteNombreCompleto || entrega.cliente);
  const [fotos, setFotos] = useState<FotoCapturada[]>([]);
  const [capturando, setCapturando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Load existing signature if in edit mode
  useEffect(() => {
    if (isEditMode && entrega.nombreReceptor) {
      // Create a dummy signature with the existing receptor name
      setSignature({
        dataUrl: '', // No image needed for edit mode
        nombreReceptor: entrega.nombreReceptor,
      });
      console.log('[CapturaForm] Loaded existing signature:', entrega.nombreReceptor);
    }
  }, [isEditMode, entrega.nombreReceptor]);

  // Service Account authentication is automatic - no user interaction needed

  const handleCapturarFoto = async (source: CameraSource) => {
    if (fotos.length >= MAX_FOTOS) {
      setError(`Máximo ${MAX_FOTOS} remitos por entrega`);
      return;
    }

    // Check if running on web (not native)
    const isWeb = Capacitor.getPlatform() === 'web';

    if (isWeb) {
      // Use file input for web browsers
      console.log('[CapturaForm] Running on web, using file input');
      fileInputRef.current?.click();
      return;
    }

    setCapturando(true);
    setError(null);
    setWarning(null);

    try {
      // Request permissions explicitly based on source
      console.log('[CapturaForm] Checking permissions for source:', source === CameraSource.Camera ? 'CAMERA' : 'PHOTOS');
      const permissionStatus = await Camera.checkPermissions();
      console.log('[CapturaForm] Permission status:', permissionStatus);

      // Request specific permission based on source
      if (source === CameraSource.Camera && permissionStatus.camera !== 'granted') {
        console.log('[CapturaForm] Requesting camera permission...');
        const requestResult = await Camera.requestPermissions({ permissions: ['camera'] });
        console.log('[CapturaForm] Camera permission result:', requestResult);

        if (requestResult.camera === 'denied') {
          setError('Permiso de cámara denegado. Ve a Configuración de la aplicación y habilita el permiso de Cámara.');
          setCapturando(false);
          return;
        }
      } else if (source === CameraSource.Photos && permissionStatus.photos !== 'granted') {
        console.log('[CapturaForm] Requesting photos permission...');
        const requestResult = await Camera.requestPermissions({ permissions: ['photos'] });
        console.log('[CapturaForm] Photos permission result:', requestResult);

        if (requestResult.photos === 'denied') {
          setError('Permiso de galería denegado. Ve a Configuración de la aplicación y habilita el permiso de Fotos/Galería.');
          setCapturando(false);
          return;
        }
      }

      console.log('[CapturaForm] ✓ Permissions granted, capturing photo...');

      const image = await Camera.getPhoto({
        quality: 95, // High quality (increased from 85)
        allowEditing: false,
        resultType: CameraResultType.DataUrl, // Use DataUrl instead of Base64 for better compatibility
        source: source, // Use specific source (Camera or Photos)
        saveToGallery: false,
        correctOrientation: true,
      });

      if (!image.dataUrl) {
        throw new Error('No image data received');
      }

      console.log('[CapturaForm] Image received, converting to Blob...');

      // Convert dataUrl to Blob (more reliable than base64 in PWAs)
      const response = await fetch(image.dataUrl);
      let blob = await response.blob();

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
    } catch (err: any) {
      console.error('[CapturaForm] Camera error:', err);

      // Provide specific error messages
      if (err?.message?.includes('User cancelled')) {
        console.log('[CapturaForm] User cancelled photo selection');
        // Don't show error for user cancellation
      } else if (err?.message?.includes('permission') || err?.message?.includes('denied')) {
        setError('Permisos denegados. Ve a Configuración > Apps > Navegador > Permisos y habilita Cámara y Almacenamiento.');
      } else if (err?.message?.includes('could not be read') || err?.message?.includes('Failed to fetch')) {
        setError('No se pudo leer el archivo. Intenta con otra foto o toma una nueva con la cámara.');
      } else {
        setError('Error al capturar foto. Intenta de nuevo o usa otra foto.');
      }
    } finally {
      setCapturando(false);
    }
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCapturando(true);
    setError(null);
    setWarning(null);

    try {
      console.log('[CapturaForm] Processing file from input:', file.name);

      // Convert File to Blob
      let blob = file as Blob;

      // Auto-rotate to vertical (90 degrees) for all photos
      console.log('[CapturaForm] Rotating image to vertical...');
      const rotationResult = await rotateToVertical(blob);
      blob = rotationResult.blob;

      if (rotationResult.rotated) {
        console.log('[CapturaForm] ✓ Image rotated 90° to vertical');
      }

      // Create thumbnail
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

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('[CapturaForm] File input error:', err);
      setError('Error al cargar foto. Intenta de nuevo.');
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
    setUploadProgress('Obteniendo ubicación...');

    try {
      // Step 0: Get fresh geolocation before sending
      console.log('[CapturaForm] ===== CAPTURING GEOLOCATION =====');
      console.log('[CapturaForm] Current geoLocation:', geoLocation);

      let finalGeoLocation = geoLocation;

      // Try to get fresh location if current one is null or old
      if (!geoLocation || !geoLocation.timestamp) {
        console.log('[CapturaForm] No geolocation available, capturing now...');
        try {
          finalGeoLocation = await getCurrentLocation();
          console.log('[CapturaForm] ✓ Fresh geolocation captured:', finalGeoLocation);
        } catch (geoError) {
          console.warn('[CapturaForm] ⚠️ Failed to get fresh location:', geoError);
          // Continue without location
        }
      } else {
        console.log('[CapturaForm] ✓ Using cached geolocation');
      }

      if (!finalGeoLocation) {
        console.warn('[CapturaForm] ⚠️ NO GEOLOCATION AVAILABLE - continuing without it');
      }

      setUploadProgress('Generando PDFs...');

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
          geolocalizacion: finalGeoLocation || undefined,
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

      const uploadPromises = pdfResults.map(async ({ pdf, numeroRemito }, index) => {
        const filename = `${numeroRemito}.pdf`;
        console.log(`[CapturaForm] Uploading PDF ${index + 1}/${pdfResults.length}: ${filename}`);

        const folderId = clientInfo?.folderId || import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID || '';
        console.log(`[CapturaForm] Using folder ID: ${folderId}`);

        try {
          const result = await uploadToGoogleDrive(pdf, filename, folderId);
          console.log(`[CapturaForm] ✓ Upload ${index + 1} completed: SUCCESS`);
          return {
            filename,
            numeroRemito,
            result: { success: true as const, fileId: result.fileId, webViewLink: result.webViewLink },
            pdfBlob: pdf,
          };
        } catch (error: any) {
          console.error(`[CapturaForm] ❌ Upload ${index + 1} failed:`, error);
          return {
            filename,
            numeroRemito,
            result: { success: false as const, error: error.message },
            pdfBlob: pdf,
          };
        }
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
      setUploadProgress('Enviando datos al Sistema de Entregas...');

      // Scroll to bottom to show progress
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);

      // Get new remitos from photos
      const nuevosRemitos = fotos.map(f => f.numeroRemito).filter(Boolean);
      const nuevosPdfUrls = succeeded
        .filter(r => r.result.success)
        .map(r => r.result.webViewLink)
        .filter(Boolean) as string[];

      // If edit mode, combine with existing remitos
      let numerosRemito = nuevosRemitos;
      let pdfUrls = nuevosPdfUrls;

      if (isEditMode && entrega.numeroRemito) {
        const remitosExistentes = entrega.numeroRemito.split(',').map(r => r.trim());
        const pdfUrlsExistentes = entrega.pdfUrls || [];

        numerosRemito = [...remitosExistentes, ...nuevosRemitos];
        pdfUrls = [...pdfUrlsExistentes, ...nuevosPdfUrls];

        console.log('[CapturaForm] 📝 EDIT MODE: Combining remitos');
        console.log('[CapturaForm] Existing remitos:', remitosExistentes);
        console.log('[CapturaForm] New remitos:', nuevosRemitos);
        console.log('[CapturaForm] Combined remitos:', numerosRemito);
      }

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

      // Log geolocation status before sending
      console.log('[CapturaForm] ===== GEOLOCATION STATUS =====');
      console.log('[CapturaForm] finalGeoLocation:', finalGeoLocation);
      if (finalGeoLocation) {
        console.log('[CapturaForm] ✓ Geolocation AVAILABLE:', {
          lat: finalGeoLocation.lat,
          lng: finalGeoLocation.lng,
          accuracy: finalGeoLocation.accuracy,
        });
      } else {
        console.warn('[CapturaForm] ⚠️ Geolocation NOT AVAILABLE - will send undefined');
      }

      const webhookData = {
        hdr: entrega.hdr,
        numero_entrega: entrega.numeroEntrega,
        numeros_remito: numerosRemito,
        cliente: cliente,
        cliente_nombre_completo: entrega.clienteNombreCompleto,
        detalle_entregas: entrega.detalleEntregas,
        estado: estado,
        chofer: chofer || 'Unknown',
        tipo_transporte: tipoTransporte || 'Propio',
        timestamp: new Date().toISOString(),
        fecha_viaje: entrega.fechaViaje || new Date().toISOString().split('T')[0],
        geolocalizacion: finalGeoLocation ? {
          lat: finalGeoLocation.lat,
          lng: finalGeoLocation.lng,
          accuracy: finalGeoLocation.accuracy,
        } : undefined,
        pdf_urls: pdfUrls,
        firma_receptor: signature.nombreReceptor,
        numero_remitos: numerosRemito.length, // Total de remitos (existentes + nuevos)
        version_app: '1.0.0',
        // Edit mode indicator
        is_edit: isEditMode, // Indica si es una actualización
        remitos_agregados: isEditMode ? nuevosRemitos.length : undefined,
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
        geolocalizacion: finalGeoLocation || undefined,
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
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                {isEditMode ? 'Agregar Más Remitos' : 'Captura de Remito'}
              </h1>
              {isEditMode && (
                <span className="px-2 py-1 text-xs font-bold rounded-full" style={{ backgroundColor: '#a8e063', color: '#1a2332' }}>
                  EDICIÓN
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: '#a8e063' }}>
              {entrega.clienteNombreCompleto || entrega.cliente} - Entrega N° {entrega.numeroEntrega}
            </p>
            {isEditMode && entrega.numeroRemito && (
              <p className="text-xs text-gray-300 mt-1">
                Remitos actuales: {entrega.numeroRemito}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="p-4 space-y-4 pb-24">
        {/* Service Account handles authentication automatically - no user action needed */}

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

          {/* Hidden file input for web browsers */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Camera and Gallery Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* Camera Button */}
            <button
              onClick={() => handleCapturarFoto(CameraSource.Camera)}
              disabled={capturando || fotos.length >= MAX_FOTOS || processing}
              className="btn-primary py-4"
            >
              {capturando ? (
                <span className="flex flex-col items-center justify-center gap-2">
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm">Capturando...</span>
                </span>
              ) : (
                <span className="flex flex-col items-center justify-center gap-2">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-base font-bold">📷 CÁMARA</span>
                </span>
              )}
            </button>

            {/* Gallery Button */}
            <button
              onClick={() => handleCapturarFoto(CameraSource.Photos)}
              disabled={capturando || fotos.length >= MAX_FOTOS || processing}
              className="btn-secondary py-4"
            >
              {capturando ? (
                <span className="flex flex-col items-center justify-center gap-2">
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm">Cargando...</span>
                </span>
              ) : (
                <span className="flex flex-col items-center justify-center gap-2">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-base font-bold">🖼️ GALERÍA</span>
                </span>
              )}
            </button>
          </div>

          {/* Photo count hint */}
          {fotos.length > 0 && (
            <p className="text-xs text-gray-600 text-center font-semibold">
              {fotos.length} foto{fotos.length > 1 ? 's' : ''} agregada{fotos.length > 1 ? 's' : ''} de {MAX_FOTOS} máximo
            </p>
          )}
        </div>

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

        {/* Progress Summary - Shows after photos are taken */}
        {fotos.length > 0 && (
          <div className="card p-4 space-y-3 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-800">Progreso de Viaje</h3>
                <p className="text-xs text-gray-600">HDR {entrega.hdr}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-700">
                  {entregasCompletadas} de {totalEntregas} entregas
                </span>
                <span className="text-xs font-bold text-blue-700">
                  {Math.round((entregasCompletadas / totalEntregas) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="h-full rounded-full transition-all duration-500 shadow-sm"
                  style={{
                    width: `${(entregasCompletadas / totalEntregas) * 100}%`,
                    background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)'
                  }}
                />
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* Completadas */}
              <div className="bg-green-100 rounded-lg p-3 border border-green-300">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-bold text-green-800">Completadas</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{entregasCompletadas}</p>
              </div>

              {/* Pendientes */}
              <div className="bg-orange-100 rounded-lg p-3 border border-orange-300">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-bold text-orange-800">Pendientes</span>
                </div>
                <p className="text-2xl font-bold text-orange-700">{entregasPendientes}</p>
              </div>
            </div>

            {/* Last Delivery Indicator */}
            {isUltimaEntrega && (
              <div className="mt-2 bg-yellow-100 border-2 border-yellow-400 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-bold text-yellow-800">
                    ¡Última entrega del viaje!
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

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
