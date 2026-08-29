import { Message } from '../types';

const VAULT_PREFIX = 'spychat_vault_conv_';

export class LocalVaultService {
  /**
   * Loads all locally saved messages for a conversation
   */
  public static getMessages(conversationId: string): Message[] {
    try {
      const raw = localStorage.getItem(`${VAULT_PREFIX}${conversationId}`);
      if (!raw) return [];
      return JSON.parse(raw) as Message[];
    } catch (e) {
      console.error('Failed to load local vault messages:', e);
      return [];
    }
  }

  /**
   * Saves or merges messages into the local device vault
   */
  public static saveMessages(conversationId: string, messages: Message[]): void {
    try {
      localStorage.setItem(`${VAULT_PREFIX}${conversationId}`, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save to local vault:', e);
    }
  }

  /**
   * Appends or updates a single message in the local vault
   */
  public static upsertMessage(conversationId: string, message: Message): Message[] {
    const existing = this.getMessages(conversationId);
    const idx = existing.findIndex(m => m.id === message.id);
    let updated: Message[];
    if (idx !== -1) {
      updated = existing.map(m => m.id === message.id ? { ...m, ...message } : m);
    } else {
      updated = [...existing, message];
    }
    this.saveMessages(conversationId, updated);
    return updated;
  }

  /**
   * Deletes a message from the local device vault
   */
  public static deleteMessage(conversationId: string, messageId: string, deletedForEveryone = false): Message[] {
    const existing = this.getMessages(conversationId);
    let updated: Message[];
    if (deletedForEveryone) {
      updated = existing.map(m => m.id === messageId ? { ...m, deleted_for_everyone: true, decrypted_text: undefined, media_url: undefined } : m);
    } else {
      updated = existing.filter(m => m.id !== messageId);
    }
    this.saveMessages(conversationId, updated);
    return updated;
  }

  /**
   * Clears all messages for a conversation on this device
   */
  public static clearConversation(conversationId: string): void {
    localStorage.removeItem(`${VAULT_PREFIX}${conversationId}`);
  }
}
