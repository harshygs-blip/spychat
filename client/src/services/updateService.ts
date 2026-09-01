// SPYCHAT WhatsApp-Style Auto Update Engine
import { AuthService } from './auth';
import { APP_VERSION } from '../config/version';

export interface AppUpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  downloadUrl: string;
  changelog: string;
  forceUpdate: boolean;
  releaseDate?: string;
}

export class UpdateService {
  private static parseVersion(versionStr: string): number[] {
    const clean = versionStr.replace(/[^0-9.]/g, '');
    return clean.split('.').map(n => parseInt(n, 10) || 0);
  }

  // Compare version strings e.g. "1.0.5" > "1.0.4"
  public static isNewerVersion(latestVersion: string, currentVersion: string = APP_VERSION): boolean {
    const latestParts = this.parseVersion(latestVersion);
    const currentParts = this.parseVersion(currentVersion);

    const maxLength = Math.max(latestParts.length, currentParts.length);
    for (let i = 0; i < maxLength; i++) {
      const v1 = latestParts[i] || 0;
      const v2 = currentParts[i] || 0;
      if (v1 > v2) return true;
      if (v1 < v2) return false;
    }
    return false;
  }

  // Check remote server for new build releases
  public static async checkForUpdates(): Promise<AppUpdateInfo> {
    try {
      const apiBase = AuthService.getApiBase();
      const res = await fetch(`${apiBase}/app-version`, {
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (res.ok) {
        const data = await res.json();
        const latestVersion = data.version || '1.0.5';
        const hasUpdate = this.isNewerVersion(latestVersion, APP_VERSION);

        return {
          hasUpdate,
          latestVersion,
          downloadUrl: data.downloadUrl || `${apiBase}/download/app.apk`,
          changelog: data.changelog || '⚡ Performance optimizations and stability improvements.',
          forceUpdate: !!data.forceUpdate,
          releaseDate: data.releaseDate
        };
      }
    } catch (err) {
      console.warn('[UpdateService] Failed to check for app updates:', err);
    }

    return {
      hasUpdate: false,
      latestVersion: APP_VERSION,
      downloadUrl: `${AuthService.getApiBase()}/download/app.apk`,
      changelog: '',
      forceUpdate: false
    };
  }

  // Open direct download link or trigger Android intent to update APK
  public static downloadAndInstallUpdate(downloadUrl?: string): void {
    const url = downloadUrl || `${AuthService.getApiBase()}/download/app.apk`;
    window.open(url, '_blank');
  }
}
