export interface GoogleDriveConfig {
  folderId?: string;
  getAccessToken: () => Promise<string>;
}

export interface UploadResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  webContentLink?: string;
  error?: string;
}

export class GoogleDriveUploader {
  private config: GoogleDriveConfig;
  private baseUrl = 'https://www.googleapis.com/upload/drive/v3/files';

  constructor(config: GoogleDriveConfig) {
    this.config = config;
  }

  /**
   * Upload PDF to Google Drive
   * Using simple upload (for files < 5MB)
   * @param pdfBlob - PDF file as Blob
   * @param filename - Name of the file
   * @param customFolderId - Optional folder ID to override default folder
   */
  async uploadPDF(
    pdfBlob: Blob,
    filename: string,
    customFolderId?: string
  ): Promise<UploadResult> {
    try {
      // Step 1: Get access token
      const accessToken = await this.config.getAccessToken();

      // Step 2: Convert blob to base64
      const base64 = await this.blobToBase64(pdfBlob);

      // Step 3: Create metadata
      // Use customFolderId if provided, otherwise use config folderId
      const folderId = customFolderId || this.config.folderId;
      const metadata = {
        name: filename,
        mimeType: 'application/pdf',
        ...(folderId && { parents: [folderId] }),
      };

      console.log('[GoogleDrive] Uploading to folder:', folderId || 'root');

      // Step 4: Create multipart body
      const boundary = '-------314159265358979323846';
      const delimiter = '\r\n--' + boundary + '\r\n';
      const closeDelimiter = '\r\n--' + boundary + '--';

      const multipartBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/pdf\r\n' +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        base64.split(',')[1] +
        closeDelimiter;

      // Step 5: Upload to Google Drive with OAuth token
      const url = `${this.baseUrl}?uploadType=multipart&fields=id,webViewLink,webContentLink`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Authorization': `Bearer ${accessToken}`,
        },
        body: multipartBody,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const data = await response.json();

      console.log('[GoogleDrive] File uploaded:', data.id);

      return {
        success: true,
        fileId: data.id,
        webViewLink: data.webViewLink,
        webContentLink: data.webContentLink,
      };
    } catch (error) {
      console.error('[GoogleDrive] Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Upload with retry logic
   * @param pdfBlob - PDF file as Blob
   * @param filename - Name of the file
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @param customFolderId - Optional folder ID to override default folder
   */
  async uploadWithRetry(
    pdfBlob: Blob,
    filename: string,
    maxRetries: number = 3,
    customFolderId?: string
  ): Promise<UploadResult> {
    let lastError: string = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[GoogleDrive] Upload attempt ${attempt}/${maxRetries} for ${filename}`);

      const result = await this.uploadPDF(pdfBlob, filename, customFolderId);

      if (result.success) {
        return result;
      }

      lastError = result.error || 'Unknown error';

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} attempts: ${lastError}`,
    };
  }

  /**
   * Upload multiple PDFs
   */
  async uploadMultiplePDFs(
    pdfs: { blob: Blob; filename: string }[]
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const { blob, filename } of pdfs) {
      const result = await this.uploadWithRetry(blob, filename);
      results.push(result);
    }

    return results;
  }

  /**
   * Make file public (optional)
   */
  async makeFilePublic(fileId: string): Promise<boolean> {
    try {
      const accessToken = await this.config.getAccessToken();
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('[GoogleDrive] Error making file public:', error);
      return false;
    }
  }

  /**
   * Helper: Convert Blob to Base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

// Import googleAuth
import { googleAuth } from './googleAuth';

// Create default instance with OAuth
export const googleDriveUploader = new GoogleDriveUploader({
  folderId: import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID || undefined,
  getAccessToken: () => googleAuth.getAccessToken(),
});
