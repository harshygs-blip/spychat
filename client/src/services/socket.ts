import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth';

class SocketService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<Function>>();

  public connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const token = AuthService.getAccessToken();
    const serverUrl = AuthService.getApiBase();

    this.socket = io(serverUrl, {
      auth: { token },
      query: { token: token || '' },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
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
    const s = this.getSocket();
    if (s) {
      s.on(event, callback);
    }
  }

  public off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }
}

export const socketService = new SocketService();
