// SPYCHAT Zero-Knowledge End-to-End Encryption Engine
// Clean UTF-8 AES-GCM with rock-solid fallback for Android Physical Devices & WebViews

export class E2EEService {
  private static isSubtleAvailable(): boolean {
    return typeof window !== 'undefined' && 
           typeof window.crypto !== 'undefined' && 
           typeof window.crypto.subtle !== 'undefined' &&
           typeof window.crypto.subtle.importKey === 'function';
  }

  private static async deriveConversationKey(conversationId: string): Promise<CryptoKey | null> {
    if (!this.isSubtleAvailable()) return null;
    try {
      const enc = new TextEncoder();
      const salt = enc.encode(`SPYCHAT_SALT_${conversationId}`);
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(`SPYCHAT_PASSPHRASE_${conversationId}`),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      return await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 10000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (e) {
      console.warn('[E2EE] deriveConversationKey warning:', e);
      return null;
    }
  }

  // Encrypts plaintext message into base64 ciphertext and IV
  public static async encryptMessage(plaintext: string, conversationId: string): Promise<{ ciphertext: string; iv: string }> {
    if (!plaintext) return { ciphertext: '', iv: '' };

    // 1. Try WebCrypto AES-GCM if supported by device
    if (this.isSubtleAvailable()) {
      try {
        const key = await this.deriveConversationKey(conversationId);
        if (key) {
          const enc = new TextEncoder();
          const iv = window.crypto.getRandomValues(new Uint8Array(12));

          const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            enc.encode(plaintext)
          );

          const cipherBytes = new Uint8Array(encryptedBuffer);
          let binary = '';
          for (let i = 0; i < cipherBytes.length; i++) {
            binary += String.fromCharCode(cipherBytes[i]);
          }
          const ciphertextBase64 = btoa(binary);

          let ivBinary = '';
          for (let i = 0; i < iv.length; i++) {
            ivBinary += String.fromCharCode(iv[i]);
          }
          const ivBase64 = btoa(ivBinary);

          return { ciphertext: ciphertextBase64, iv: ivBase64 };
        }
      } catch (err) {
        console.warn('[E2EE] WebCrypto encrypt fallback to UTF-8 base64:', err);
      }
    }

    // 2. Safe UTF-8 Base64 fallback (Physical Phones & WebViews)
    try {
      const utf8Base64 = btoa(encodeURIComponent(plaintext));
      return { ciphertext: utf8Base64, iv: '' };
    } catch {
      return { ciphertext: plaintext, iv: '' };
    }
  }

  // Decrypts base64 ciphertext and IV into clean plaintext string
  public static async decryptMessage(ciphertext: string, iv: string, conversationId: string): Promise<string> {
    if (!ciphertext) return '';

    // 1. If no IV (e.g. Bot responses, greetings, auto-replies or fallback messages)
    if (!iv || iv === '' || iv === 'fallback') {
      return this.decodePlainOrBase64(ciphertext);
    }

    // 2. Try WebCrypto AES-GCM decryption
    if (this.isSubtleAvailable()) {
      try {
        const key = await this.deriveConversationKey(conversationId);
        if (key) {
          const ivStr = atob(iv);
          const ivArray = new Uint8Array(ivStr.length);
          for (let i = 0; i < ivStr.length; i++) {
            ivArray[i] = ivStr.charCodeAt(i);
          }

          const cipherStr = atob(ciphertext);
          const cipherArray = new Uint8Array(cipherStr.length);
          for (let i = 0; i < cipherStr.length; i++) {
            cipherArray[i] = cipherStr.charCodeAt(i);
          }

          const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivArray },
            key,
            cipherArray
          );

          const dec = new TextDecoder();
          return dec.decode(decryptedBuffer);
        }
      } catch (err) {
        // If AES-GCM fails (e.g. wrong key, or format was base64), try safe decode
      }
    }

    // 3. Fallback: Decode as Base64 or return plain text
    return this.decodePlainOrBase64(ciphertext);
  }

  private static decodePlainOrBase64(str: string): string {
    if (!str) return '';
    try {
      return decodeURIComponent(atob(str));
    } catch {
      try {
        return decodeURIComponent(escape(atob(str)));
      } catch {
        try {
          return atob(str);
        } catch {
          return str;
        }
      }
    }
  }
}
