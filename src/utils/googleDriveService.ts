// Google Drive API using Netlify Serverless Function with Service Account
// This keeps credentials secure on the server and works with public folders

interface UploadResult {
  fileId: string;
  webViewLink: string;
}

/**
 * Upload file to Google Drive using Netlify Function (Service Account)
 * Works with public folders (Editor permission for "anyone with the link")
 */
export async function uploadToGoogleDrive(
  blob: Blob,
  fileName: string,
  folderId: string
): Promise<UploadResult> {
  console.log('[GoogleDrive] Starting upload with Service Account (serverless)');
  console.log('[GoogleDrive] File:', fileName, 'Size:', blob.size, 'bytes');
  console.log('[GoogleDrive] Target folder:', folderId);

  try {
    // Convert blob to base64
    const base64Data = await blobToBase64(blob);
    console.log('[GoogleDrive] File converted to base64');

    // Call Netlify Function
    const functionUrl = '/.netlify/functions/upload-to-drive';
    console.log('[GoogleDrive] Calling Netlify Function:', functionUrl);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileData: base64Data,
        fileName: fileName,
        folderId: folderId,
      }),
    });

    console.log('[GoogleDrive] Function response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GoogleDrive] Function call failed:', response.status);
      console.error('[GoogleDrive] Error details:', errorText);
      throw new Error(`Function call failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      console.error('[GoogleDrive] Upload failed:', result.error);
      throw new Error(result.error || 'Upload failed');
    }

    console.log('[GoogleDrive] ✅ Upload successful!');
    console.log('[GoogleDrive] File ID:', result.fileId);
    console.log('[GoogleDrive] View link:', result.webViewLink);

    return {
      fileId: result.fileId,
      webViewLink: result.webViewLink,
    };
  } catch (error: any) {
    console.error('[GoogleDrive] ❌ Error uploading file:', error);
    throw new Error(`Error al subir archivo a Google Drive: ${error.message}`);
  }
}

/**
 * Convert Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix (data:application/pdf;base64,)
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
