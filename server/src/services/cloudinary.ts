// Cloudinary Server Service for SPYCHAT
// Cloud Name: vtojdohd
// API Key: 331796772766926
// API Secret: XikNOBjxaip-mURkwbyuXtLQgZ4

export const CLOUDINARY_SERVER_CONFIG = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'vtojdohd',
  apiKey: process.env.CLOUDINARY_API_KEY || '331796772766926',
  apiSecret: process.env.CLOUDINARY_API_SECRET || 'XikNOBjxaip-mURkwbyuXtLQgZ4',
  uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default'
};

export class ServerCloudinaryService {
  /**
   * Upload base64 or media buffer to Cloudinary using signed authentication
   */
  public static async uploadBase64(base64Data: string, folder: string = 'spychat'): Promise<string> {
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // Cloudinary upload endpoint
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_SERVER_CONFIG.cloudName}/auto/upload`;

    const bodyData: Record<string, string> = {
      file: base64Data,
      upload_preset: CLOUDINARY_SERVER_CONFIG.uploadPreset,
      folder: folder
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      });

      if (res.ok) {
        const json = await res.json();
        return json.secure_url || json.url;
      }
    } catch (err) {
      console.error('Server Cloudinary upload error:', err);
    }

    return base64Data;
  }
}
