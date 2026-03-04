// Google Drive API using OAuth 2.0 (web) o n8n webhook (APK nativo)
// En web: OAuth popup → token en localStorage
// En APK: ruta por n8n para evitar bloqueo de popups en WebView

import { Capacitor } from '@capacitor/core';
import { googleAuth } from './googleAuth';

const N8N_DRIVE_UPLOAD_URL = 'https://fredoale.app.n8n.cloud/webhook/crosslog-drive-upload';

interface UploadResult {
  fileId: string;
  webViewLink: string;
}

/**
 * Convierte un Blob a string base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Sube el PDF a Drive vía n8n (para APK Android)
 * Evita el bloqueo de popups OAuth en WebViews
 */
async function uploadViaN8n(
  blob: Blob,
  fileName: string,
  folderId: string
): Promise<UploadResult> {
  console.log('[GoogleDrive] APK detectado → usando n8n para subir a Drive');
  console.log('[GoogleDrive] File:', fileName, 'FolderId:', folderId);

  const pdfBase64 = await blobToBase64(blob);

  const response = await fetch(N8N_DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfBase64, fileName, folderId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`n8n Drive upload failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(`n8n Drive upload error: ${data.error || 'Error desconocido'}`);
  }

  console.log('[GoogleDrive] ✅ Upload via n8n exitoso:', data.fileId);

  return {
    fileId: data.fileId,
    webViewLink: data.webViewLink,
  };
}

/**
 * Sube el PDF directamente a Drive vía OAuth (para web)
 */
async function uploadViaOAuth(
  blob: Blob,
  fileName: string,
  folderId: string
): Promise<UploadResult> {
  console.log('[GoogleDrive] Web detectado → usando OAuth directo');
  console.log('[GoogleDrive] File:', fileName, 'Size:', blob.size, 'bytes');

  const accessToken = await googleAuth.getAccessToken();
  console.log('[GoogleDrive] Access token obtained');

  const metadata = { name: fileName, parents: [folderId] };

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  formData.append('file', blob);

  console.log('[GoogleDrive] Uploading to folder:', folderId);

  const uploadResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('[GoogleDrive] Upload failed:', uploadResponse.status, errorText);
    throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
  }

  const result = await uploadResponse.json();
  console.log('[GoogleDrive] ✅ Upload OAuth exitoso:', result.id);

  return {
    fileId: result.id,
    webViewLink: result.webViewLink,
  };
}

/**
 * Upload file to Google Drive.
 * En APK nativo usa n8n para evitar el bloqueo de OAuth en WebViews.
 * En web usa OAuth directamente.
 */
export async function uploadToGoogleDrive(
  blob: Blob,
  fileName: string,
  folderId: string
): Promise<UploadResult> {
  try {
    if (Capacitor.isNativePlatform()) {
      return await uploadViaN8n(blob, fileName, folderId);
    } else {
      return await uploadViaOAuth(blob, fileName, folderId);
    }
  } catch (error: any) {
    console.error('[GoogleDrive] ❌ Error uploading file:', error);
    throw new Error(`Error al subir archivo a Google Drive: ${error.message}`);
  }
}
