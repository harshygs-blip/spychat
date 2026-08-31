// SPYCHAT Native Android & Web Notification Pipeline
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export class NotificationService {
  private static swRegistration: ServiceWorkerRegistration | null = null;
  private static channelCreated = false;

  // Initialize Native Android Notification Channel & Web Service Worker
  public static async initServiceWorker(): Promise<void> {
    // 1. Android Native High-Priority Notification Channel
    if (Capacitor.isNativePlatform()) {
      try {
        if (!this.channelCreated) {
          await LocalNotifications.createChannel({
            id: 'spychat_messages_high',
            name: 'SPYCHAT Encrypted Messages',
            description: 'High priority notifications for encrypted messages and incoming calls',
            importance: 5, // IMPORTANCE_HIGH (Heads-up popup banner on screen)
            visibility: 1, // VISIBILITY_PUBLIC (Visible on lock screen)
            vibration: true,
            sound: 'res://raw/notification_sound'
          });
          this.channelCreated = true;
          console.log('[NotificationService] Android Notification Channel created');
        }
      } catch (err) {
        console.warn('[NotificationService] Failed to create Android notification channel:', err);
      }
    }

    // 2. Web Service Worker for Browser
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('[NotificationService] Web ServiceWorker registered');
      } catch (err) {
        console.warn('[NotificationService] SW registration failed:', err);
      }
    }
  }

  public static hasNotificationPermission(): boolean {
    if (typeof window === 'undefined') return false;
    if (Capacitor.isNativePlatform()) {
      return true; // Handled via LocalNotifications.checkPermissions()
    }
    return 'Notification' in window && Notification.permission === 'granted';
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

    // 1. Android Native & Web Notification Permissions
    try {
      if (Capacitor.isNativePlatform()) {
        const permStatus = await LocalNotifications.requestPermissions();
        results.notifications = permStatus.display === 'granted';
      } else if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        results.notifications = permission === 'granted';
      }
    } catch (e) {
      console.warn('[NotificationService] Notification permission request error:', e);
    }

    // 2. Camera & Microphone Permissions
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        results.microphone = true;
        results.camera = true;
        stream.getTracks().forEach(t => t.stop());
      } catch (err) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          results.microphone = true;
          audioStream.getTracks().forEach(t => t.stop());
        } catch {}
      }
    }

    localStorage.setItem('spychat_permissions_prompted', 'true');
    return results;
  }

  // Trigger System Native Notification (Appears in Android Notification Shade, Heads-up popup, & Lock Screen)
  public static async sendSystemNotification(title: string, body: string, conversationId?: string): Promise<void> {
    try {
      // 1. Android Native Push / Local Notification via Capacitor Bridge
      if (Capacitor.isNativePlatform()) {
        const id = Math.floor(Math.random() * 1000000) + 1;
        await LocalNotifications.schedule({
          notifications: [
            {
              id,
              title,
              body,
              channelId: 'spychat_messages_high',
              smallIcon: 'ic_launcher',
              extra: {
                conversationId: conversationId || ''
              }
            }
          ]
        });
        return;
      }

      // 2. Web Browser Fallback (Service Worker or Web Notification API)
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
          data: { url: '/' }
        } as any);
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/logo.png',
          tag: conversationId || 'spychat-message'
        });
      }
    } catch (err) {
      console.warn('[NotificationService] Failed to dispatch system notification:', err);
    }
  }
}
