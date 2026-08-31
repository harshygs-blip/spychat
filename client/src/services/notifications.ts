// SPYCHAT Native Notification & Permissions Manager

export class NotificationService {
  private static swRegistration: ServiceWorkerRegistration | null = null;

  public static async initServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('[NotificationService] ServiceWorker registered successfully');
      } catch (err) {
        console.warn('[NotificationService] SW registration failed:', err);
      }
    }
  }

  public static hasNotificationPermission(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  }

  public static async requestAllPermissions(): Promise<{
    notifications: boolean;
    camera: boolean;
    microphone: boolean;
  }> {
    const results = {
      notifications: false,
      camera: false,
      microphone: false
    };

    // 1. Request Notification Permission
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        results.notifications = permission === 'granted';
      } catch (e) {
        console.warn('Notification permission error:', e);
      }
    }

    // 2. Request Camera & Microphone Permissions
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        results.microphone = true;
        results.camera = true;
        // Stop the test stream immediately after permission is granted
        stream.getTracks().forEach(t => t.stop());
      } catch (err: any) {
        console.warn('Camera/Mic permission warning:', err);
        // Try audio-only if camera failed
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          results.microphone = true;
          audioStream.getTracks().forEach(t => t.stop());
        } catch {}
      }
    }

    // Store in localStorage that user has been prompted
    localStorage.setItem('spychat_permissions_prompted', 'true');

    return results;
  }

  // Trigger System Native Notification (Works when app is in background or phone locked)
  public static async sendSystemNotification(title: string, body: string, conversationId?: string): Promise<void> {
    if (!this.hasNotificationPermission()) return;

    try {
      // Vibrate phone if supported
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      if (this.swRegistration && 'showNotification' in this.swRegistration) {
        await this.swRegistration.showNotification(title, {
          body,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: conversationId || 'spychat-message',
          renotify: true,
          data: {
            url: '/'
          }
        } as any);
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/logo.png',
          tag: conversationId || 'spychat-message'
        });
      }
    } catch (err) {
      console.warn('[NotificationService] Failed to show system notification:', err);
    }
  }
}
