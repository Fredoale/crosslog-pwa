// Google Drive API using OAuth 2.0
// Simple and direct implementation

import { googleAuth } from './googleAuth';

interface UploadResult {
  fileId: string;
  webViewLink: string;
}

/**
 * Upload file to Google Drive using OAuth
 */
export async function uploadToGoogleDrive(
  blob: Blob,
  fileName: string,
  folderId: string
): Promise<UploadResult> {
  console.log('[GoogleDrive] Starting upload with OAuth');
  console.log('[GoogleDrive] File:', fileName, 'Size:', blob.size, 'bytes');

  try {
    // Get access token (prompts user if needed)
    const accessToken = await googleAuth.getAccessToken();
    console.log('[GoogleDrive] Access token obtained');

    // Upload file to Google Drive
    const metadata = {
      name: fileName,
      parents: [folderId],
    };

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
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[GoogleDrive] Upload failed:', uploadResponse.status, errorText);
      console.error('[GoogleDrive] Folder ID used:', folderId);
      console.error('[GoogleDrive] File name:', fileName);
      throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const result = await uploadResponse.json();
    console.log('[GoogleDrive] Upload successful:', result.id);

    return {
      fileId: result.id,
      webViewLink: result.webViewLink,
    };
  } catch (error: any) {
    console.error('[GoogleDrive] Error uploading file:', error);
    throw new Error(`Error al subir archivo a Google Drive: ${error.message}`);
  }
}
