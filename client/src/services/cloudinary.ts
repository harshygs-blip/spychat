// Cloudinary CDN Upload Service for SPYCHAT
// Cloud Name: vtojdohd
// Upload Preset: ml_default
// API Key: 331796772766926

export const CLOUDINARY_CONFIG = {
  cloudName: 'vtojdohd',
  apiKey: '331796772766926',
  uploadPreset: 'ml_default',
  uploadUrl: 'https://api.cloudinary.com/v1_1/vtojdohd/auto/upload'
};

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  resource_type: 'image' | 'video' | 'raw';
  format?: string;
  bytes: number;
  duration?: number;
}

export class CloudinaryService {
  /**
   * Upload a File, Blob, or base64 data string directly to Cloudinary CDN
   */
  public static async uploadMedia(
    file: File | Blob | string,
    onProgress?: (percent: number) => void
  ): Promise<CloudinaryUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', CLOUDINARY_CONFIG.uploadUrl);

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({
              secure_url: data.secure_url || data.url,
              public_id: data.public_id,
              resource_type: data.resource_type || 'image',
              format: data.format,
              bytes: data.bytes || 0,
              duration: data.duration
            });
          } catch (e) {
            reject(new Error('Failed to parse Cloudinary response'));
          }
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            reject(new Error(errData.error?.message || 'Cloudinary upload failed'));
          } catch {
            reject(new Error(`Cloudinary upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error connecting to Cloudinary CDN'));
      };

      xhr.send(formData);
    });
  }

  /**
   * Helper that attempts Cloudinary upload first, falling back to local FileReader base64 if offline or preset error
   */
  public static async uploadWithFallback(
    file: File | Blob
  ): Promise<{ url: string; isCloudinary: boolean }> {
    try {
      const result = await this.uploadMedia(file);
      if (result.secure_url) {
        return { url: result.secure_url, isCloudinary: true };
      }
    } catch (err) {
      console.warn('Cloudinary upload warning, falling back to local data:', err);
    }

    // Fallback: Read as local data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({ url: reader.result as string, isCloudinary: false });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
