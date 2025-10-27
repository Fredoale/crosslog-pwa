import type { CloudinaryConfig } from '../types';

export interface UploadResult {
  success: boolean;
  url?: string;
  secureUrl?: string;
  publicId?: string;
  error?: string;
}

export class CloudinaryUploader {
  private config: CloudinaryConfig;

  constructor(config: CloudinaryConfig) {
    this.config = config;
  }

  /**
   * Upload PDF to Cloudinary
   */
  async uploadPDF(
    pdfBlob: Blob,
    filename: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult> {
    try {
      const formData = new FormData();
      formData.append('file', pdfBlob, `${filename}.pdf`);
      formData.append('upload_preset', this.config.uploadPreset);
      formData.append('resource_type', 'raw');
      formData.append('folder', 'crosslog/remitos');

      if (metadata) {
        formData.append('context', Object.entries(metadata)
          .map(([key, value]) => `${key}=${value}`)
          .join('|')
        );
      }

      const url = `https://api.cloudinary.com/v1_1/${this.config.cloudName}/raw/upload`;

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const data = await response.json();

      return {
        success: true,
        url: data.url,
        secureUrl: data.secure_url,
        publicId: data.public_id,
      };
    } catch (error) {
      console.error('[Cloudinary] Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Upload with retry logic
   */
  async uploadWithRetry(
    pdfBlob: Blob,
    filename: string,
    metadata?: Record<string, string>,
    maxRetries: number = 3
  ): Promise<UploadResult> {
    let lastError: string = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[Cloudinary] Upload attempt ${attempt}/${maxRetries}`);

      const result = await this.uploadPDF(pdfBlob, filename, metadata);

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
}

// Create default instance
export const cloudinaryUploader = new CloudinaryUploader({
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
  apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY || '',
});
