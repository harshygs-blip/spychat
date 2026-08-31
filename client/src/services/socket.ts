import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth';

class SocketService {
  private socket: Socket | null = null;
  private eventHandlers = new Map<string, Set<Function>>();

  public connect(): Socket {
    const token = AuthService.getAccessToken();
    const serverUrl = AuthService.getApiBase();

    if (this.socket) {
      if (this.socket.connected && (this.socket.auth as any)?.token === token) {
        return this.socket;
      }
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
    }

    this.socket = io(serverUrl, {
      auth: { token },
      query: { token: token || '' },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 50,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('[Socket Connected] ID:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket Disconnected] Reason:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Socket Connect Error]:', err.message);
    });

    // Re-attach all registered event listeners to the new socket connection
    this.eventHandlers.forEach((callbacks, event) => {
      callbacks.forEach(cb => {
        this.socket?.on(event, cb as any);
      });
    });

    return this.socket;
  }

  public getSocket(): Socket | null {
    if (!this.socket || !this.socket.connected) {
      return this.connect();
    }
    return this.socket;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
    }
  }

  public emit(event: string, data?: any, callback?: Function) {
    const s = this.getSocket();
    if (s) {
      s.emit(event, data, callback);
    }
  }

  public on(event: string, callback: (...args: any[]) => void) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  public off(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      this.eventHandlers.get(event)?.delete(callback);
      if (this.socket) {
        this.socket.off(event, callback);
      }
    } else {
      this.eventHandlers.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }
}

export const socketService = new SocketService();
